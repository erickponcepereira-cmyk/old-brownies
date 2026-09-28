// Leituras do banco local. Toda tela lê daqui (useLiveQuery atualiza sozinho a cada gravação).
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db, type NomeTabela, type Registros } from '@/lib/db/banco'
import type { Movimento, Venda, VendaItem } from '@/lib/db/tipos'
import { useSessao } from '@/lib/sessao'
import { diaComercial } from '@/lib/motor/dia'

export function lerDaEmpresa<K extends NomeTabela>(tabela: K, empresaId: string): Promise<Registros[K][]> {
  return db.tabela(tabela).where('empresaId').equals(empresaId)
    .filter((r) => !(r as { deletedAt: string | null }).deletedAt).toArray()
}

export function useRegistros<K extends NomeTabela>(tabela: K): Registros[K][] | undefined {
  const { empresaId } = useSessao()
  return useLiveQuery(() => lerDaEmpresa(tabela, empresaId), [tabela, empresaId])
}

export async function lerVendas(empresaId: string, de: string, ate: string) {
  const vendas = (await db.vendas.where('diaComercial').between(de, ate, true, true).toArray())
    .filter((v) => v.empresaId === empresaId && !v.deletedAt)
  const itens = await db.vendaItens.where('vendaId').anyOf(vendas.map((v) => v.id)).toArray()
  return { vendas, itens: itens.filter((i) => !i.deletedAt) }
}

export interface VendasPeriodo { vendas: Venda[]; itens: VendaItem[] }

export function useVendas(de: string, ate: string): VendasPeriodo | undefined {
  const { empresaId } = useSessao()
  return useLiveQuery(() => lerVendas(empresaId, de, ate), [empresaId, de, ate])
}

export function useMovimentos(): Movimento[] | undefined {
  return useRegistros('movimentos')
}

export function useAgora(intervaloMs = 60_000): Date {
  const [agora, setAgora] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), intervaloMs)
    return () => clearInterval(t)
  }, [intervaloMs])
  return agora
}

export function useHoje(horaViradaDia: number): string {
  return diaComercial(useAgora(), horaViradaDia)
}
