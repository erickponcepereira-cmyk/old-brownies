// B5.1 a B5.4 — preço do insumo, custo direto, custo de produção e custo variável (o piso do preço).
import type { CodigoTamanho, ItemComposicao } from '@/lib/db/tipos'

export interface CustoPorTamanho { pequeno: number; grande: number }

export interface ParametrosProducao {
  diariaProducao: number
  capacidadeJornada: number
  semanasPorMes: number
  gasMesReferencia: number
  formasReferencia: number
}

export interface EntradaCustos {
  insumos: Array<{ id: string; codigo: string; precoManual: number }>
  compras: Array<{ insumoId: string; data: string; quantidade: number; valorTotal: number }>
  sabores: Array<{ id: string; pesoMix: number }>
  receitas: Array<{ saborId: string; insumoId: string; quantidade: number }>
  pecasPorForma: Record<CodigoTamanho, number>
  config: ParametrosProducao
  formasSemana: number
}

export interface TabelaCustos {
  precos: Record<string, number>
  etiqueta: number
  embalagem: number
  massa: Record<string, number>
  direto: Record<string, CustoPorTamanho>
  variavel: Record<string, CustoPorTamanho>
  formasSemana: number
  jornadasPorSemana: number
  producaoPorForma: number
  producao: CustoPorTamanho
  diretoMix: CustoPorTamanho
  variavelMix: CustoPorTamanho
  pecasPorForma: Record<CodigoTamanho, number>
}

const ULTIMAS_COMPRAS = 5
export const FORMAS_SEM_HISTORICO = 8

export function precoUsado(precoManual: number, compras: EntradaCustos['compras']): number {
  const ultimas = [...compras].sort((a, b) => b.data.localeCompare(a.data)).slice(0, ULTIMAS_COMPRAS)
  const quantidade = ultimas.reduce((s, c) => s + c.quantidade, 0)
  if (!ultimas.length || quantidade <= 0) return precoManual
  return ultimas.reduce((s, c) => s + c.valorTotal, 0) / quantidade
}

export function custoMassa(receita: EntradaCustos['receitas'], precos: Record<string, number>): number {
  return receita.reduce((s, item) => s + item.quantidade * (precos[item.insumoId] ?? 0), 0)
}

// Etiqueta e embalagem são por peça — dividir o custo delas pelo rendimento foi o erro de origem.
export function custoDireto(massa: number, pecasPorForma: number, etiqueta: number, embalagem: number): number {
  return massa / pecasPorForma + etiqueta + embalagem
}

export function producaoPorForma(formasSemana: number, p: ParametrosProducao) {
  const formas = formasSemana > 0 ? formasSemana : FORMAS_SEM_HISTORICO
  const jornadasPorSemana = Math.ceil(formas / p.capacidadeJornada)
  const diariaMes = p.diariaProducao * jornadasPorSemana * p.semanasPorMes
  const gasMes = (p.gasMesReferencia * formas) / p.formasReferencia
  return { formas, jornadasPorSemana, valor: (diariaMes + gasMes) / (formas * p.semanasPorMes) }
}

function porTamanho(fn: (t: CodigoTamanho) => number): CustoPorTamanho {
  return { pequeno: fn('pequeno'), grande: fn('grande') }
}

function mediaPonderada(sabores: EntradaCustos['sabores'], valor: (saborId: string) => number): number {
  const noMix = sabores.filter((s) => s.pesoMix > 0)
  const pesoTotal = noMix.reduce((s, x) => s + x.pesoMix, 0)
  if (!pesoTotal) return 0
  return noMix.reduce((s, x) => s + valor(x.id) * x.pesoMix, 0) / pesoTotal
}

export function calcularCustos(e: EntradaCustos): TabelaCustos {
  const precos: Record<string, number> = {}
  for (const insumo of e.insumos) {
    precos[insumo.id] = precoUsado(insumo.precoManual, e.compras.filter((c) => c.insumoId === insumo.id))
  }
  const precoDoCodigo = (codigo: string) => precos[e.insumos.find((i) => i.codigo === codigo)?.id ?? ''] ?? 0
  const etiqueta = precoDoCodigo('etiqueta')
  const embalagem = precoDoCodigo('embalagem')

  const producao = producaoPorForma(e.formasSemana, e.config)
  const custoProducao = porTamanho((t) => producao.valor / e.pecasPorForma[t])

  const massa: Record<string, number> = {}
  const direto: Record<string, CustoPorTamanho> = {}
  const variavel: Record<string, CustoPorTamanho> = {}
  for (const sabor of e.sabores) {
    massa[sabor.id] = custoMassa(e.receitas.filter((r) => r.saborId === sabor.id), precos)
    direto[sabor.id] = porTamanho((t) => custoDireto(massa[sabor.id], e.pecasPorForma[t], etiqueta, embalagem))
    variavel[sabor.id] = porTamanho((t) => direto[sabor.id][t] + custoProducao[t])
  }

  return {
    precos, etiqueta, embalagem, massa, direto, variavel,
    formasSemana: producao.formas,
    jornadasPorSemana: producao.jornadasPorSemana,
    producaoPorForma: producao.valor,
    producao: custoProducao,
    diretoMix: porTamanho((t) => mediaPonderada(e.sabores, (id) => direto[id][t])),
    variavelMix: porTamanho((t) => mediaPonderada(e.sabores, (id) => variavel[id][t])),
    pecasPorForma: e.pecasPorForma,
  }
}

// Custo de hoje de um produto do cardápio: brownie pelo motor, combo pela composição, bebida pelo custo manual.
export function custoProduto(
  p: { tipo: string; saborId?: string; tamanho?: CodigoTamanho; custoManual?: number | null; composicao?: ItemComposicao[] },
  tabela: TabelaCustos,
): number | null {
  if (p.tipo === 'brownie' && p.saborId && p.tamanho) return tabela.variavel[p.saborId]?.[p.tamanho] ?? null
  if (p.composicao?.length) {
    return p.composicao.reduce((s, c) => s + ('saborId' in c ? c.qtd * (tabela.variavel[c.saborId]?.[c.tamanho] ?? 0) : c.valor), 0)
  }
  return p.custoManual ?? null
}
