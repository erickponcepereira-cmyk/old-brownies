// B2 — envia a fila em ordem (upsert por id, reenviar não duplica) e puxa o que mudou por updated_at.
import { useSyncExternalStore } from 'react'
import { db, TABELAS, type NomeTabela } from '@/lib/db/banco'
import type { Base } from '@/lib/db/tipos'
import { sessaoAtual } from '@/lib/sessao'
import { chavesPara, nuvem, paraCamel, paraSnake } from './nuvem'

export interface EstadoSync {
  online: boolean
  sincronizando: boolean
  ultimoSync: string | null
  erro: string | null
}

const INTERVALO_MS = 30_000
const LOTE_ENVIO = 200
const LOTE_RECEBIMENTO = 1000

let estado: EstadoSync = {
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  sincronizando: false,
  ultimoSync: null,
  erro: null,
}
const ouvintes = new Set<() => void>()

function mudar(parcial: Partial<EstadoSync>) {
  estado = { ...estado, ...parcial }
  ouvintes.forEach((f) => f())
}

export function useEstadoSync(): EstadoSync {
  return useSyncExternalStore((f) => { ouvintes.add(f); return () => ouvintes.delete(f) }, () => estado)
}

export const temNuvem = () => nuvem !== null

async function enviarFila() {
  if (!nuvem) return
  for (;;) {
    const fila = await db.outbox.orderBy('seq').limit(LOTE_ENVIO).toArray()
    if (!fila.length) return
    // Agrupa itens seguidos da mesma tabela, preservando a ordem da fila.
    let i = 0
    while (i < fila.length) {
      const tabela = fila[i].tabela
      const grupo = []
      while (i < fila.length && fila[i].tabela === tabela) grupo.push(fila[i++])
      const ids = [...new Set(grupo.map((g) => g.registroId))]
      const registros = (await db.table(tabela).bulkGet(ids)).filter(Boolean) as Base[]
      const linhas = registros.map((r) => chavesPara(r as unknown as Record<string, unknown>, paraSnake))
      const { error } = await nuvem.from(paraSnake(tabela)).upsert(linhas, { onConflict: 'id' })
      if (error) throw new Error(`${tabela}: ${error.message}`)
      await db.outbox.bulkDelete(grupo.map((g) => g.seq!))
    }
  }
}

async function receberTabela(tabela: NomeTabela, empresaId: string) {
  if (!nuvem) return
  const chaveCursor = `cursor:${empresaId}:${tabela}`
  let cursor = ((await db.meta.get(chaveCursor))?.valor as string | undefined) ?? '1970-01-01T00:00:00Z'
  for (;;) {
    const { data, error } = await nuvem.from(paraSnake(tabela)).select('*')
      .eq('empresa_id', empresaId).gt('updated_at', cursor)
      .order('updated_at').limit(LOTE_RECEBIMENTO)
    if (error) throw new Error(`${tabela}: ${error.message}`)
    if (!data?.length) return
    const pendentes = new Set((await db.outbox.where('tabela').equals(tabela).toArray()).map((o) => o.registroId))
    const remotos = data.map((linha) => chavesPara(linha, paraCamel) as unknown as Base)
    const locais = await db.table(tabela).bulkGet(remotos.map((r) => r.id)) as Array<Base | undefined>
    // Cadastros: vence o updated_at mais recente; o que ainda está na fila local não é sobrescrito.
    const aceitos = remotos.filter((r, idx) => {
      const local = locais[idx]
      return !(local && pendentes.has(r.id) && local.updatedAt >= r.updatedAt)
    })
    await db.table(tabela).bulkPut(aceitos)
    cursor = remotos.at(-1)!.updatedAt
    await db.meta.put({ chave: chaveCursor, valor: cursor })
    if (data.length < LOTE_RECEBIMENTO) return
  }
}

let rodando = false

export async function sincronizar() {
  const sessao = sessaoAtual()
  if (!nuvem || !sessao || rodando || !navigator.onLine) return
  rodando = true
  mudar({ sincronizando: true })
  try {
    await enviarFila()
    for (const tabela of TABELAS) await receberTabela(tabela, sessao.empresaId)
    mudar({ ultimoSync: new Date().toISOString(), erro: null })
  } catch (e) {
    mudar({ erro: e instanceof Error ? e.message : String(e) })
  } finally {
    rodando = false
    mudar({ sincronizando: false })
  }
}

let agendado: ReturnType<typeof setTimeout> | undefined

export function avisarMudanca() {
  clearTimeout(agendado)
  agendado = setTimeout(() => void sincronizar(), 1500)
}

export function iniciarSincronizacao() {
  const aoMudarRede = () => {
    mudar({ online: navigator.onLine })
    if (navigator.onLine) void sincronizar()
  }
  window.addEventListener('online', aoMudarRede)
  window.addEventListener('offline', aoMudarRede)
  const intervalo = setInterval(() => void sincronizar(), INTERVALO_MS)
  void sincronizar()
  return () => {
    window.removeEventListener('online', aoMudarRede)
    window.removeEventListener('offline', aoMudarRede)
    clearInterval(intervalo)
  }
}

// Limpa os cursores para puxar tudo de novo (ao entrar em outro aparelho).
export async function puxarTudoDeNovo(empresaId: string) {
  await db.meta.where('chave').startsWith(`cursor:${empresaId}:`).delete()
  await sincronizar()
}
