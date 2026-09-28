// Toda gravação vai para o Dexie E para a fila de envio (outbox), na mesma transação.
import { db, type NomeTabela, type Registros } from '@/lib/db/banco'
import type { Base, Papel } from '@/lib/db/tipos'
import { exigirSessao, type Sessao } from '@/lib/sessao'
import { avisarMudanca } from './sincronizar'

export type NovoRegistro<T> = Omit<T, keyof Base> & Partial<Base>

export interface Op {
  tabela: NomeTabela
  dados: Record<string, unknown>
}

export const novoId = () => crypto.randomUUID()

export function op<K extends NomeTabela>(tabela: K, dados: NovoRegistro<Registros[K]>): Op {
  return { tabela, dados: dados as Record<string, unknown> }
}

// B4 no aparelho — o RLS da nuvem é quem garante; aqui evitamos o lançamento errado na origem.
const ESCRITA: Record<Papel, NomeTabela[] | 'todas'> = {
  dono: 'todas',
  equipe: [
    'vendas', 'vendaItens', 'movimentos', 'producoes', 'producaoItens', 'lotes',
    'perdas', 'amostras', 'contagens', 'checklistItens', 'membros',
  ],
  mentor: ['recadosMentor', 'tarefasAvulsas', 'notasMentor', 'configsMentor', 'custosFixos', 'convites', 'membros'],
  parceiro: [],
}
const SO_DO_MENTOR: NomeTabela[] = ['notasMentor', 'configsMentor']

function checarPermissao(papel: Papel, tabela: NomeTabela, registro: Record<string, unknown>) {
  const permitidas = ESCRITA[papel]
  const pode = permitidas === 'todas' ? !SO_DO_MENTOR.includes(tabela) : permitidas.includes(tabela)
  const custoDoOutroLado = tabela === 'custosFixos'
    && (registro.visibilidade === 'mentor') !== (papel === 'mentor')
  if (!pode || custoDoOutroLado) throw new Error(`O perfil ${papel} não pode alterar ${tabela}.`)
}

function completar(dados: Record<string, unknown>, sessao: Pick<Sessao, 'empresaId' | 'userId'>, agora: string) {
  return {
    ...dados,
    id: dados.id ?? novoId(),
    empresaId: dados.empresaId ?? sessao.empresaId,
    createdAt: dados.createdAt ?? agora,
    updatedAt: agora,
    updatedBy: sessao.userId,
    deletedAt: dados.deletedAt ?? null,
  } as Base & Record<string, unknown>
}

async function persistir(itens: Array<{ tabela: NomeTabela; registro: Base }>) {
  const tabelas = [...new Set(itens.map((i) => i.tabela))].map((t) => db.table(t))
  const agora = new Date().toISOString()
  await db.transaction('rw', [...tabelas, db.outbox], async () => {
    for (const { tabela, registro } of itens) {
      await db.table(tabela).put(registro)
      await db.outbox.add({ tabela, registroId: registro.id, criadoEm: agora })
    }
  })
  avisarMudanca()
}

export async function gravar(...ops: Op[]): Promise<string[]> {
  const sessao = exigirSessao()
  const agora = new Date().toISOString()
  const itens = ops.map(({ tabela, dados }) => {
    checarPermissao(sessao.papel, tabela, dados)
    return { tabela, registro: completar(dados, sessao, agora) }
  })
  await persistir(itens)
  return itens.map((i) => i.registro.id)
}

// Criação da empresa: ainda não há sessão nem papel para checar.
export async function gravarSemSessao(autor: Pick<Sessao, 'empresaId' | 'userId'>, ops: Op[]) {
  const agora = new Date().toISOString()
  await persistir(ops.map(({ tabela, dados }) => ({ tabela, registro: completar(dados, autor, agora) })))
}

export async function atualizar<K extends NomeTabela>(tabela: K, id: string, patch: Partial<Registros[K]>) {
  const sessao = exigirSessao()
  const atual = await db.tabela(tabela).get(id)
  if (!atual) throw new Error('Registro não encontrado.')
  const novo = { ...atual, ...patch } as unknown as Record<string, unknown>
  checarPermissao(sessao.papel, tabela, novo)
  await persistir([{ tabela, registro: completar(novo, sessao, new Date().toISOString()) }])
}

// Exclusão lógica: nada é apagado de verdade.
export function excluir(tabela: NomeTabela, id: string) {
  return atualizar(tabela, id, { deletedAt: new Date().toISOString() } as never)
}
