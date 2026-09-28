// Indicadores das telas, montados a partir do banco local + motor. Funções puras.
import type {
  CodigoCanal, CodigoTamanho, CustoFixo, Lote, Movimento, Parceiro, Venda, VendaItem, VisitaPonto,
} from '@/lib/db/tipos'
import { resumoVenda, type TaxasCanal } from '@/lib/motor/lucro'
import { metasSemana, pecasDoItem, type CanalPlacar } from '@/lib/motor/placar'
import { diaSemanaIso, diasEntre, diasNoMes, somarDias } from '@/lib/motor/dia'
import { DIAS_ALERTA_VALIDADE, chaveSaborTamanho, diasParaVencer, estaVencido, saldoPorLote, saldoPorSaborTamanho } from '@/lib/motor/estoque'
import { DIAS_SEM_VISITA, estaParado, trocaPct, vendidoNoPonto } from '@/lib/motor/rede'
import { projetarMes, resultadoMes, somarFixos } from '@/lib/motor/resultado'
import type { Cadastros } from './cadastros'
import type { VendasPeriodo } from './consultas'

export interface Totais { vendas: number; pecas: number; bruto: number; lucro: number }
export interface ResumoVenda extends Omit<Totais, 'vendas'> { venda: Venda; itens: VendaItem[] }

const zero = (): Totais => ({ vendas: 0, pecas: 0, bruto: 0, lucro: 0 })

function acumular(t: Totais, r: ResumoVenda) {
  t.vendas += 1
  t.pecas += r.pecas
  t.bruto += r.bruto
  t.lucro += r.lucro
}

export function resumirVendas(p: VendasPeriodo, cad: Pick<Cadastros, 'taxas' | 'produtoPorId'>): ResumoVenda[] {
  const itensPorVenda = new Map<string, VendaItem[]>()
  for (const i of p.itens) itensPorVenda.set(i.vendaId, [...(itensPorVenda.get(i.vendaId) ?? []), i])
  return p.vendas
    .map((venda) => {
      const itens = itensPorVenda.get(venda.id) ?? []
      const r = resumoVenda(itens, venda.canal, venda.pagamento, cad.taxas as TaxasCanal)
      const pecas = itens.reduce((s, i) => s + pecasDoItem(i, i.produtoId ? cad.produtoPorId.get(i.produtoId) : undefined), 0)
      return { venda, itens, bruto: r.bruto, lucro: r.lucro, pecas }
    })
    .sort((a, b) => b.venda.data.localeCompare(a.venda.data))
}

export function somar(resumos: ResumoVenda[]): Totais {
  const t = zero()
  resumos.forEach((r) => acumular(t, r))
  return t
}

export function porCanal(resumos: ResumoVenda[]): Partial<Record<CodigoCanal, Totais>> {
  const mapa: Partial<Record<CodigoCanal, Totais>> = {}
  for (const r of resumos) acumular((mapa[r.venda.canal] ??= zero()), r)
  return mapa
}

export function porParceiro(resumos: ResumoVenda[]): Map<string, Totais> {
  const mapa = new Map<string, Totais>()
  for (const r of resumos) {
    if (!r.venda.parceiroId) continue
    if (!mapa.has(r.venda.parceiroId)) mapa.set(r.venda.parceiroId, zero())
    acumular(mapa.get(r.venda.parceiroId)!, r)
  }
  return mapa
}

// —— Placar (B5.7) ——
export const CANAIS_PLACAR: CanalPlacar[] = ['loja', 'vendedor', 'motorista', 'ponto']
export const CANAIS_SEM_META: CodigoCanal[] = ['rota', 'feira', 'evento', 'ifood']

export function contarAtivos(parceiros: Parceiro[]) {
  const ativos = { vendedor: 0, motorista: 0, ponto: 0 }
  for (const p of parceiros) if (p.status === 'ativo') ativos[p.tipo] += 1
  return ativos
}

export function placar(resumos: ResumoVenda[], parceiros: Parceiro[], cad: Pick<Cadastros, 'config'>) {
  const metas = metasSemana({ metaLojaDia: cad.config.metaLojaDia, semanasPorMes: cad.config.semanasPorMes, ativos: contarAtivos(parceiros) })
  const canais = porCanal(resumos)
  const linhas = CANAIS_PLACAR.map((canal) => ({ canal, meta: metas[canal], realizado: canais[canal]?.pecas ?? 0 }))
  const outros = CANAIS_SEM_META.map((canal) => ({ canal, realizado: canais[canal]?.pecas ?? 0 }))
  const metaTotal = linhas.reduce((s, l) => s + l.meta, 0)
  const realizado = somar(resumos).pecas
  return { linhas, outros, metaTotal, realizado }
}

// —— Estoque (B5.6) ——
export interface ItemEstoque {
  saborId: string
  tamanho: CodigoTamanho
  saldo: number
  lotes: Array<{ lote: Lote; saldo: number; dias: number }>
}

export function resumirEstoque(lotes: Lote[], movimentos: Movimento[], hoje: string) {
  const saldoLote = saldoPorLote(movimentos)
  const saldoItem = saldoPorSaborTamanho(movimentos)
  const itens = new Map<string, ItemEstoque>()
  for (const [chave, saldo] of saldoItem) {
    const [saborId, tamanho] = chave.split('|') as [string, CodigoTamanho]
    itens.set(chave, { saborId, tamanho, saldo, lotes: [] })
  }
  for (const lote of lotes) {
    const saldo = saldoLote.get(lote.id) ?? 0
    if (saldo <= 0) continue
    const chave = chaveSaborTamanho(lote.saborId, lote.tamanho)
    if (!itens.has(chave)) itens.set(chave, { saborId: lote.saborId, tamanho: lote.tamanho, saldo: 0, lotes: [] })
    itens.get(chave)!.lotes.push({ lote, saldo, dias: diasParaVencer(lote.validadeAte, hoje) })
  }
  const lista = [...itens.values()]
  lista.forEach((i) => i.lotes.sort((a, b) => a.lote.validadeAte.localeCompare(b.lote.validadeAte)))
  const comLote = lista.flatMap((i) => i.lotes)
  return {
    itens: lista,
    saldoLote,
    saldoItem,
    total: lista.reduce((s, i) => s + Math.max(0, i.saldo), 0),
    vencendo: comLote.filter((l) => !estaVencido(l.lote.validadeAte, hoje) && l.dias <= DIAS_ALERTA_VALIDADE),
    vencidos: comLote.filter((l) => estaVencido(l.lote.validadeAte, hoje)),
    negativos: lista.filter((i) => i.saldo < 0),
  }
}

// O número que ninguém via: contagem física menor que o estoque do sistema.
export function sumicoDesde(movimentos: Movimento[], desde: string): number {
  const ajuste = movimentos
    .filter((m) => m.tipo === 'ajuste_contagem' && m.diaComercial >= desde)
    .reduce((s, m) => s + m.qtd, 0)
  return Math.max(0, -ajuste)
}

// —— Rede (B5.9) ——
export interface ResumoPonto {
  estoqueEstimado: number
  ultimaVisita: VisitaPonto | null
  diasSemVisita: number | null
  semVisita: boolean
  vendidoUltima: number | null
  trocaPct4: number | null
  proximaVisita: string | null
  diasFimTeste: number | null
  visitas: Array<{ visita: VisitaPonto; vendido: number }>
}

export interface ResumoParceiro {
  parceiro: Parceiro
  ultimaCompra: string | null
  diasSemCompra: number | null
  parado: boolean
  mes: Totais
  compras: ResumoVenda[]
  ponto?: ResumoPonto
}

const naRede = (p: Parceiro) => p.status === 'ativo' || p.status === 'teste' || p.status === 'treino'

function proximoDiaDaSemana(hoje: string, dia: number) {
  return somarDias(hoje, (dia - diaSemanaIso(hoje) + 7) % 7)
}

export function resumirPonto(parceiro: Parceiro, visitas: VisitaPonto[], compras: ResumoVenda[], hoje: string): ResumoPonto {
  const ordenadas = [...visitas].sort((a, b) => a.data.localeCompare(b.data))
  const pecasDaVenda = (id?: string) => compras.find((c) => c.venda.id === id)?.pecas ?? 0
  let estoqueDepois = 0
  let marco = ''
  const historico = ordenadas.map((visita) => {
    const entregue = compras
      .filter((c) => c.venda.data > marco && c.venda.data <= visita.data && c.venda.id !== visita.vendaId)
      .reduce((s, c) => s + c.pecas, 0)
    const vendido = vendidoNoPonto(estoqueDepois, entregue, visita.contadoNoBalcao)
    estoqueDepois = visita.contadoNoBalcao - visita.trocado + visita.repostoSemCusto + pecasDaVenda(visita.vendaId)
    marco = visita.data
    return { visita, vendido }
  })
  const depoisDaUltima = compras.filter((c) => c.venda.data > marco).reduce((s, c) => s + c.pecas, 0)
  const ultima = ordenadas.at(-1) ?? null
  const ultimaData = ultima ? ultima.data.slice(0, 10) : parceiro.dataEntrada
  const diasSemVisita = ultimaData ? diasEntre(ultimaData, hoje) : null
  const desde = somarDias(hoje, -27)
  const recentes = historico.filter((h) => h.visita.data.slice(0, 10) >= desde)
  const trocado = recentes.reduce((s, h) => s + h.visita.trocado, 0)
  const vendido = recentes.reduce((s, h) => s + h.vendido, 0)
  return {
    estoqueEstimado: estoqueDepois + depoisDaUltima,
    ultimaVisita: ultima,
    diasSemVisita,
    semVisita: naRede(parceiro) && diasSemVisita !== null && diasSemVisita > DIAS_SEM_VISITA,
    vendidoUltima: historico.at(-1)?.vendido ?? null,
    trocaPct4: recentes.length ? trocaPct(trocado, vendido) : null,
    proximaVisita: parceiro.diaVisita ? proximoDiaDaSemana(hoje, parceiro.diaVisita)
      : ultima ? somarDias(ultima.data.slice(0, 10), DIAS_SEM_VISITA) : null,
    diasFimTeste: parceiro.fimTeste ? diasEntre(hoje, parceiro.fimTeste) : null,
    visitas: historico.reverse(),
  }
}

export function resumirRede(
  parceiros: Parceiro[], compras: ResumoVenda[], visitas: VisitaPonto[], hoje: string, inicioDoMes: string,
): Map<string, ResumoParceiro> {
  const mapa = new Map<string, ResumoParceiro>()
  for (const parceiro of parceiros) {
    const doParceiro = compras.filter((c) => c.venda.parceiroId === parceiro.id)
    const ultimaCompra = doParceiro[0]?.venda.diaComercial ?? null
    const diasSemCompra = ultimaCompra ? diasEntre(ultimaCompra, hoje) : parceiro.dataEntrada ? diasEntre(parceiro.dataEntrada, hoje) : null
    mapa.set(parceiro.id, {
      parceiro,
      ultimaCompra,
      diasSemCompra,
      parado: naRede(parceiro) && estaParado(parceiro.tipo, diasSemCompra),
      mes: somar(doParceiro.filter((c) => c.venda.diaComercial >= inicioDoMes)),
      compras: doParceiro,
      ponto: parceiro.tipo === 'ponto'
        ? resumirPonto(parceiro, visitas.filter((v) => v.parceiroId === parceiro.id), doParceiro, hoje)
        : undefined,
    })
  }
  return mapa
}

// —— Resultado do mês (B5.8) ——
export function fixosDoMes(custos: CustoFixo[], mes: string) {
  const fimDoMes = `${mes.slice(0, 7)}-${diasNoMes(mes)}`
  return somarFixos(custos.filter((c) => !c.inicio || c.inicio <= fimDoMes), true)
}

export function resultadoDoMes(resumosMes: ResumoVenda[], cad: Pick<Cadastros, 'custosFixos' | 'config' | 'lucroLoja' | 'lucroPecaCanal'>, hoje: string) {
  const totais = somar(resumosMes)
  const fixos = fixosDoMes(cad.custosFixos, hoje)
  const atual = resultadoMes({ margem: totais.lucro, faturamento: totais.bruto, fixos, provisaoImposto: cad.config.provisaoImposto })
  const dia = Number(hoje.slice(8, 10))
  const dias = diasNoMes(hoje)
  const projetado = resultadoMes({
    margem: projetarMes(totais.lucro, dia, dias),
    faturamento: projetarMes(totais.bruto, dia, dias),
    fixos, provisaoImposto: cad.config.provisaoImposto,
  })
  const lucroForma = cad.lucroPecaCanal('vendedor') * 35
  return {
    totais, fixos, atual, projetado,
    faltaEmPecasLoja: cad.lucroLoja > 0 ? Math.ceil(atual.faltaParaOAzul / cad.lucroLoja) : 0,
    faltaEmFormas: lucroForma > 0 ? Math.ceil(atual.faltaParaOAzul / lucroForma) : 0,
  }
}

// —— Alertas do Hoje ——
export interface Alerta { tom: 'alerta' | 'aviso'; texto: string; link?: string }

export function montarAlertas(p: {
  estoque: ReturnType<typeof resumirEstoque>
  rede?: Map<string, ResumoParceiro>
  sumico: number
  nomeItem: (saborId: string, tamanho: CodigoTamanho) => string
  precoMedioLoja: number
}): Alerta[] {
  const alertas: Alerta[] = []
  for (const l of p.estoque.vencidos) {
    alertas.push({ tom: 'alerta', texto: `Lote vencido: ${p.nomeItem(l.lote.saborId, l.lote.tamanho)} (${l.saldo}) — não vende, vira perda`, link: '/estoque' })
  }
  for (const l of p.estoque.vencendo) {
    const quando = l.dias === 0 ? 'hoje' : l.dias === 1 ? 'amanhã' : `em ${l.dias} dias`
    alertas.push({ tom: 'aviso', texto: `Vence ${quando}: ${p.nomeItem(l.lote.saborId, l.lote.tamanho)} (${l.saldo})`, link: '/estoque' })
  }
  if (p.estoque.negativos.length) {
    const itens = p.estoque.negativos.map((i) => `${p.nomeItem(i.saborId, i.tamanho)} (${i.saldo})`).join(', ')
    alertas.push({ tom: 'aviso', texto: `Estoque sem produção lançada: ${itens}`, link: '/producao' })
  }
  if (p.sumico > 0) {
    const valor = Math.round(p.sumico * p.precoMedioLoja)
    alertas.push({ tom: 'alerta', texto: `Sumiço na contagem este mês: ${p.sumico} peças (≈ R$ ${valor.toLocaleString('pt-BR')} em venda)`, link: '/estoque' })
  }
  for (const r of p.rede?.values() ?? []) {
    const nome = r.parceiro.nome
    if (r.parado) alertas.push({ tom: 'alerta', texto: `${nome} parado há ${r.diasSemCompra} dias sem comprar`, link: `/rede/${r.parceiro.id}` })
    if (r.ponto?.semVisita) alertas.push({ tom: 'aviso', texto: `${nome} sem visita há ${r.ponto.diasSemVisita} dias`, link: `/visita?ponto=${r.parceiro.id}` })
    if ((r.ponto?.trocaPct4 ?? 0) > 0.2) {
      alertas.push({ tom: 'aviso', texto: `Troca de ${Math.round(r.ponto!.trocaPct4! * 100)}% em ${nome}: caixa menor ou outro mix`, link: `/rede/${r.parceiro.id}` })
    }
  }
  return alertas
}
