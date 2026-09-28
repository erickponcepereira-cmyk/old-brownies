// Rede: parceiros, repasse e visita ao ponto (contar, trocar, repor, receber).
import { db } from '@/lib/db/banco'
import type { CodigoTamanho, Parceiro } from '@/lib/db/tipos'
import { exigirSessao } from '@/lib/sessao'
import { atualizar, gravar, novoId, op, type NovoRegistro, type Op } from '@/lib/sync/gravar'
import { diaComercial } from '@/lib/motor/dia'
import { baixar, carregarEstoque, movimento } from './estoque'
import { montarVenda, type ContextoVenda } from './vendas'

export async function salvarParceiro(dados: NovoRegistro<Parceiro>, id?: string) {
  if (id) await atualizar('parceiros', id, dados)
  else await gravar(op('parceiros', dados))
}

interface PecaNoPonto { loteId: string | null; saborId: string; tamanho: CodigoTamanho; qtd: number; validadeAte: string }

// O que está no ponto: entregue (repasse e reposição) menos o que já voltou na troca, por lote.
async function pecasNoPonto(parceiroId: string): Promise<PecaNoPonto[]> {
  const vendas = (await db.vendas.where('parceiroId').equals(parceiroId).toArray()).filter((v) => !v.deletedAt)
  const visitas = (await db.visitasPonto.where('parceiroId').equals(parceiroId).toArray()).filter((v) => !v.deletedAt)
  const refs = [...vendas.map((v) => v.id), ...visitas.map((v) => v.id)]
  const movs = (await db.movimentos.where('refId').anyOf(refs).toArray()).filter((m) => !m.deletedAt)
  const lotes = new Map((await db.lotes.bulkGet([...new Set(movs.map((m) => m.loteId).filter(Boolean))] as string[]))
    .filter(Boolean).map((l) => [l!.id, l!]))
  const pecas = new Map<string, PecaNoPonto>()
  for (const m of movs) {
    // Saída da loja (−) é entrada no ponto, e a volta da troca (+ na loja) é saída do ponto.
    if (!['repasse', 'troca_saida', 'troca_volta'].includes(m.tipo)) continue
    const noPonto = -m.qtd
    const chave = `${m.loteId}|${m.saborId}|${m.tamanho}`
    const atual = pecas.get(chave) ?? {
      loteId: m.loteId, saborId: m.saborId, tamanho: m.tamanho, qtd: 0, validadeAte: lotes.get(m.loteId ?? '')?.validadeAte ?? '9999',
    }
    atual.qtd += noPonto
    pecas.set(chave, atual)
  }
  return [...pecas.values()].filter((p) => p.qtd > 0).sort((a, b) => a.validadeAte.localeCompare(b.validadeAte))
}

// Os trocados saem do que está há mais tempo no ponto.
function separarTrocados(noPonto: PecaNoPonto[], trocado: number, saborPadrao: string) {
  const voltas: Array<Omit<PecaNoPonto, 'validadeAte'>> = []
  let falta = trocado
  for (const p of noPonto) {
    if (falta <= 0) break
    const qtd = Math.min(p.qtd, falta)
    voltas.push({ loteId: p.loteId, saborId: p.saborId, tamanho: p.tamanho, qtd })
    falta -= qtd
  }
  if (falta > 0) voltas.push({ loteId: null, saborId: saborPadrao, tamanho: 'grande', qtd: falta })
  return voltas
}

export interface NovaVisita {
  parceiroId: string
  contado: number
  trocado: number
  compra: Record<string, number> // caixa nova: grandes por sabor, o ponto escolhe o mix
  precoPonto: number
  custoGrande: (saborId: string) => number
  observacao?: string
}

export async function registrarVisita(v: NovaVisita, ctx: ContextoVenda & { diasMaxNoPonto: number; saborPadrao: string }) {
  exigirSessao()
  const visitaId = novoId()
  const momento = new Date()
  const hoje = diaComercial(momento, ctx.horaViradaDia)
  const c = { horaViradaDia: ctx.horaViradaDia, momento }
  const estoque = await carregarEstoque()
  const ops: Op[] = []

  // B6.7 — a troca não é perda: volta para o estoque da loja, mesmo lote, mesma validade.
  const voltas = separarTrocados(await pecasNoPonto(v.parceiroId), v.trocado, ctx.saborPadrao)
  for (const volta of voltas) {
    ops.push(movimento(c, 'troca_volta', visitaId, volta))
    // Reposição sem custo, sabor por sabor, com brownie que dura até a próxima troca.
    for (const r of baixar(estoque, volta.saborId, volta.tamanho, volta.qtd, hoje, ctx.diasMaxNoPonto)) {
      ops.push(movimento(c, 'troca_saida', visitaId, { saborId: volta.saborId, tamanho: volta.tamanho, loteId: r.loteId, qtd: -r.qtd }))
    }
  }

  let vendaId: string | undefined
  const itens = Object.entries(v.compra).filter(([, qtd]) => qtd > 0).map(([saborId, qtd]) => ({
    saborId, tamanho: 'grande' as const, qtd, precoUnitario: v.precoPonto, custoUnitario: v.custoGrande(saborId),
  }))
  if (itens.length) {
    const venda = montarVenda({ canal: 'ponto', pagamento: 'pix', parceiroId: v.parceiroId, itens }, { ...ctx, momento }, estoque)
    vendaId = venda.vendaId
    ops.push(...venda.ops)
  }

  ops.unshift(op('visitasPonto', {
    id: visitaId, data: momento.toISOString(), parceiroId: v.parceiroId, contadoNoBalcao: v.contado,
    trocado: v.trocado, repostoSemCusto: v.trocado, vendaId, observacao: v.observacao,
  }))
  await gravar(...ops)
  return visitaId
}
