// B5.5 — lucro por venda e por canal (camada 3).
import type { CodigoCanal, Pagamento } from '@/lib/db/tipos'

export interface TaxasCanal { taxaMaquininha: number; comissaoIfood: number | null }

export const CANAIS_DIRETOS: CodigoCanal[] = ['loja', 'rota', 'feira', 'evento', 'ifood']
export const CANAIS_PARCEIROS: CodigoCanal[] = ['vendedor', 'motorista', 'ponto']

export function ehCanalParceiro(canal: CodigoCanal): boolean {
  return CANAIS_PARCEIROS.includes(canal)
}

// Nas tabelas e projeções, loja, rota, feira e evento contam maquininha em 100% das vendas (conservador).
export function taxaDoCanal(canal: CodigoCanal, taxas: TaxasCanal): number {
  if (ehCanalParceiro(canal)) return 0
  if (canal === 'ifood') return taxas.comissaoIfood ?? 0
  return taxas.taxaMaquininha
}

export function lucroPorPeca(preco: number, taxa: number, custoVariavel: number): number {
  return preco * (1 - taxa) - custoVariavel
}

export function lucroPorForma(lucroPeca: number, pecasPorForma: number): number {
  return lucroPeca * pecasPorForma
}

export interface ItemParaLucro { qtd: number; precoUnitario: number; custoUnitario: number }

export function resumoVenda(itens: ItemParaLucro[], canal: CodigoCanal, pagamento: Pagamento, taxas: TaxasCanal) {
  const bruto = itens.reduce((s, i) => s + i.qtd * i.precoUnitario, 0)
  const custo = itens.reduce((s, i) => s + i.qtd * i.custoUnitario, 0)
  const taxaCartao = pagamento === 'maquininha' ? bruto * taxas.taxaMaquininha : 0
  const taxaIfood = canal === 'ifood' ? bruto * (taxas.comissaoIfood ?? 0) : 0
  const liquido = bruto - taxaCartao - taxaIfood
  return { bruto, liquido, custo, lucro: liquido - custo }
}

// Preço médio da loja no mix de sabores (pequenos): hoje R$ 14,25.
export function precoMedioLoja(
  produtos: Array<{ tipo: string; saborId?: string; tamanho?: string; precoLoja: number }>,
  sabores: Array<{ id: string; pesoMix: number }>,
): number {
  let soma = 0
  let pesos = 0
  for (const sabor of sabores.filter((s) => s.pesoMix > 0)) {
    const produto = produtos.find((p) => p.tipo === 'brownie' && p.saborId === sabor.id && p.tamanho === 'pequeno')
    if (!produto) continue
    soma += produto.precoLoja * sabor.pesoMix
    pesos += sabor.pesoMix
  }
  return pesos ? soma / pesos : 0
}
