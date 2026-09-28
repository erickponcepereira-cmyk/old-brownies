// Venda (canais diretos) e repasse a parceiro: a mesma entidade Venda, com canal e parceiroId.
import { db } from '@/lib/db/banco'
import type { CodigoCanal, CodigoTamanho, Pagamento, Produto } from '@/lib/db/tipos'
import { exigirSessao } from '@/lib/sessao'
import { gravar, novoId, op, type Op } from '@/lib/sync/gravar'
import { diaComercial } from '@/lib/motor/dia'
import { ehCanalParceiro } from '@/lib/motor/lucro'
import { baixar, carregarEstoque, movimento, movimentosDaReferencia, type Estoque } from './estoque'

export interface ItemVenda {
  produtoId?: string
  saborId?: string
  tamanho?: CodigoTamanho
  qtd: number
  precoUnitario: number
  custoUnitario: number // congelado na hora da venda
}

export interface NovaVenda {
  canal: CodigoCanal
  pagamento: Pagamento
  itens: ItemVenda[]
  parceiroId?: string
  feiraNome?: string
  observacao?: string
}

export interface ContextoVenda {
  horaViradaDia: number
  produtoPorId: Map<string, Produto>
  diasMinimos?: number
  momento?: Date
}

// Brownies que saem do estoque: o próprio item, ou os brownies da composição do combo.
function browniesDoItem(item: ItemVenda, produtoPorId: Map<string, Produto>) {
  if (item.saborId && item.tamanho) return [{ saborId: item.saborId, tamanho: item.tamanho, qtd: item.qtd }]
  const produto = item.produtoId ? produtoPorId.get(item.produtoId) : undefined
  return (produto?.composicao ?? []).flatMap((c) =>
    'saborId' in c ? [{ saborId: c.saborId, tamanho: c.tamanho, qtd: c.qtd * item.qtd }] : [])
}

export function montarVenda(v: NovaVenda, ctx: ContextoVenda, estoque: Estoque) {
  const sessao = exigirSessao()
  const vendaId = novoId()
  const momento = ctx.momento ?? new Date()
  const hoje = diaComercial(momento, ctx.horaViradaDia)
  const tipo = ehCanalParceiro(v.canal) ? 'repasse' : 'venda'
  const ops: Op[] = [op('vendas', {
    id: vendaId, data: momento.toISOString(), diaComercial: hoje, canal: v.canal, parceiroId: v.parceiroId,
    feiraNome: v.feiraNome, pagamento: v.pagamento, registradaPor: sessao.nome, observacao: v.observacao,
  })]
  for (const item of v.itens.filter((i) => i.qtd > 0)) {
    ops.push(op('vendaItens', { vendaId, ...item }))
    for (const b of browniesDoItem(item, ctx.produtoPorId)) {
      for (const r of baixar(estoque, b.saborId, b.tamanho, b.qtd, hoje, ctx.diasMinimos)) {
        ops.push(movimento({ horaViradaDia: ctx.horaViradaDia, momento }, tipo, vendaId, { ...b, loteId: r.loteId, qtd: -r.qtd }))
      }
    }
  }
  return { vendaId, ops }
}

export async function registrarVenda(v: NovaVenda, ctx: ContextoVenda): Promise<string> {
  const { vendaId, ops } = montarVenda(v, ctx, await carregarEstoque())
  await gravar(...ops)
  return vendaId
}

// Desfazer: a venda sai (exclusão lógica) e o estoque volta por estorno — nunca editando movimento.
export async function desfazerVenda(vendaId: string, horaViradaDia: number) {
  const venda = await db.vendas.get(vendaId)
  if (!venda || venda.deletedAt) return
  const movimentos = await movimentosDaReferencia([vendaId])
  await gravar(
    op('vendas', { ...venda, deletedAt: new Date().toISOString() }),
    ...movimentos.map((m) => movimento({ horaViradaDia }, m.tipo, vendaId, {
      saborId: m.saborId, tamanho: m.tamanho, loteId: m.loteId, qtd: -m.qtd,
    })),
  )
}
