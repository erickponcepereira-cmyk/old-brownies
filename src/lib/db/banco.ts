// Banco local (IndexedDB via Dexie): a fonte de leitura de todas as telas.
import Dexie, { type Table } from 'dexie'
import type * as T from './tipos'

export interface Registros {
  empresas: T.Empresa
  membros: T.Membro
  convites: T.Convite
  configs: T.Config
  insumos: T.Insumo
  compras: T.Compra
  sabores: T.Sabor
  receitaItens: T.ReceitaItem
  tamanhos: T.Tamanho
  produtos: T.Produto
  producoes: T.Producao
  producaoItens: T.ProducaoItem
  lotes: T.Lote
  movimentos: T.Movimento
  canais: T.Canal
  vendas: T.Venda
  vendaItens: T.VendaItem
  parceiros: T.Parceiro
  visitasPonto: T.VisitaPonto
  perdas: T.Perda
  amostras: T.Amostra
  contagens: T.Contagem
  custosFixos: T.CustoFixo
  rotinaTarefas: T.RotinaTarefa
  tarefasAvulsas: T.TarefaAvulsa
  checklistItens: T.ChecklistItem
  recadosMentor: T.RecadoMentor
  notasMentor: T.NotaMentor
  configsMentor: T.ConfigMentor
  promocoes: T.Promocao
  zonas: T.Zona
}

export type NomeTabela = keyof Registros

export interface ItemOutbox {
  seq?: number
  tabela: NomeTabela
  registroId: string
  criadoEm: string
}

export interface Meta {
  chave: string
  valor: unknown
}

const COMUM = 'id, empresaId, updatedAt'

const INDICES: Record<NomeTabela, string> = {
  empresas: COMUM,
  membros: `${COMUM}, userId`,
  convites: `${COMUM}, codigo`,
  configs: COMUM,
  insumos: COMUM,
  compras: `${COMUM}, insumoId`,
  sabores: COMUM,
  receitaItens: `${COMUM}, saborId`,
  tamanhos: COMUM,
  produtos: COMUM,
  producoes: `${COMUM}, data`,
  producaoItens: `${COMUM}, producaoId`,
  lotes: `${COMUM}, saborId`,
  movimentos: `${COMUM}, loteId, diaComercial, refId`,
  canais: COMUM,
  vendas: `${COMUM}, diaComercial, parceiroId`,
  vendaItens: `${COMUM}, vendaId`,
  parceiros: `${COMUM}, tipo`,
  visitasPonto: `${COMUM}, parceiroId`,
  perdas: COMUM,
  amostras: COMUM,
  contagens: COMUM,
  custosFixos: COMUM,
  rotinaTarefas: COMUM,
  tarefasAvulsas: COMUM,
  checklistItens: `${COMUM}, data`,
  recadosMentor: COMUM,
  notasMentor: COMUM,
  configsMentor: COMUM,
  promocoes: COMUM,
  zonas: COMUM,
}

export const TABELAS = Object.keys(INDICES) as NomeTabela[]

type Tabelas = { [K in NomeTabela]: Table<Registros[K], string> }

// Declaração mesclada: cada tabela vira propriedade tipada (db.vendas, db.lotes…).
interface Banco extends Tabelas {}

class Banco extends Dexie {
  outbox!: Table<ItemOutbox, number>
  meta!: Table<Meta, string>

  constructor() {
    super('old-brownies')
    this.version(1).stores({ ...INDICES, outbox: '++seq, tabela', meta: 'chave' })
  }

  tabela<K extends NomeTabela>(nome: K): Table<Registros[K], string> {
    return this.table(nome) as Tabelas[K]
  }
}

export const db = new Banco()
