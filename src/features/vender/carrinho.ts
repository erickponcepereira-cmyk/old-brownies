// Carrinho da venda: itens, validação das regras B6.1–B6.3 e lucro por forma de pagamento.
import { useMemo, useState } from 'react'
import type { CodigoCanal, CodigoTamanho, Pagamento, Produto } from '@/lib/db/tipos'
import type { Cadastros } from '@/lib/dados/cadastros'
import { custoProduto } from '@/lib/motor/custo'
import { resumoVenda } from '@/lib/motor/lucro'

export interface ItemCarrinho {
  chave: string
  nome: string
  produtoId?: string
  saborId?: string
  tamanho?: CodigoTamanho
  qtd: number
  preco: number
  custo: number
  semCusto?: boolean
}

export const PAGAMENTOS: Array<{ valor: Pagamento; rotulo: string }> = [
  { valor: 'dinheiro', rotulo: 'Dinheiro' },
  { valor: 'pix', rotulo: 'Pix' },
  { valor: 'maquininha', rotulo: 'Maquininha' },
]

export function itemDeProduto(p: Produto, cad: Cadastros): Omit<ItemCarrinho, 'qtd'> {
  const custo = custoProduto(p, cad.tabela)
  return {
    chave: `p:${p.id}`, nome: p.nome, produtoId: p.id, saborId: p.tipo === 'brownie' ? p.saborId : undefined,
    tamanho: p.tipo === 'brownie' ? p.tamanho : undefined, preco: p.precoLoja, custo: custo ?? 0, semCusto: custo === null,
  }
}

export function itemDeSabor(saborId: string, tamanho: CodigoTamanho, preco: number, cad: Cadastros): Omit<ItemCarrinho, 'qtd'> {
  return {
    chave: `s:${saborId}:${tamanho}`, nome: `${cad.saborPorId.get(saborId)?.nome ?? 'Sabor'} ${tamanho}`,
    saborId, tamanho, preco, custo: cad.tabela.variavel[saborId]?.[tamanho] ?? cad.tabela.variavelMix[tamanho],
  }
}

function ehGrande(i: ItemCarrinho, cad: Cadastros) {
  if (i.tamanho === 'grande') return true
  const produto = i.produtoId ? cad.produtoPorId.get(i.produtoId) : undefined
  return produto?.tipo === 'brownie' && produto.tamanho === 'grande'
}

export function validar(itens: ItemCarrinho[], canal: CodigoCanal, cad: Cadastros) {
  const abaixoDoCusto = itens.filter((i) => i.preco < i.custo)
  // B6.2 — grande na loja ou na rota abaixo do preço final dos pontos atropela o lojista.
  const atropelaPonto = (canal === 'loja' || canal === 'rota')
    ? itens.filter((i) => ehGrande(i, cad) && i.preco < cad.config.precoFinalRevenda)
    : []
  return { abaixoDoCusto, atropelaPonto }
}

export function useCarrinho(canal: CodigoCanal, cad: Cadastros) {
  const [itens, setItens] = useState<ItemCarrinho[]>([])

  const adicionar = (base: Omit<ItemCarrinho, 'qtd'>, qtd = 1) => setItens((atual) => {
    const existente = atual.find((i) => i.chave === base.chave)
    if (existente) return atual.map((i) => (i.chave === base.chave ? { ...i, qtd: i.qtd + qtd } : i))
    return [...atual, { ...base, qtd }]
  })
  const mudarQtd = (chave: string, qtd: number) =>
    setItens((atual) => (qtd <= 0 ? atual.filter((i) => i.chave !== chave) : atual.map((i) => (i.chave === chave ? { ...i, qtd } : i))))
  const mudarPreco = (chave: string, preco: number) =>
    setItens((atual) => atual.map((i) => (i.chave === chave ? { ...i, preco } : i)))
  const limpar = () => setItens([])

  const resumo = useMemo(() => {
    const paraLucro = itens.map((i) => ({ qtd: i.qtd, precoUnitario: i.preco, custoUnitario: i.custo }))
    const porPagamento = Object.fromEntries(PAGAMENTOS.map((p) => [p.valor, resumoVenda(paraLucro, canal, p.valor, cad.taxas)])) as
      Record<Pagamento, ReturnType<typeof resumoVenda>>
    return {
      total: porPagamento.pix.bruto,
      pecas: itens.reduce((s, i) => s + i.qtd, 0),
      porPagamento,
      ...validar(itens, canal, cad),
    }
  }, [itens, canal, cad])

  return { itens, adicionar, mudarQtd, mudarPreco, limpar, resumo }
}
