// B5.7 — placar da semana (segunda a domingo).
import type { ItemComposicao } from '@/lib/db/tipos'

export type CanalPlacar = 'loja' | 'vendedor' | 'motorista' | 'ponto'

export const DIAS_LOJA_SEMANA = 6
export const PECAS_FORMA_PEQUENO = 35
export const PECAS_CAIXA_PONTO = 24
export const MOTORISTA_POR_DIA = 4
export const DIAS_MOTORISTA = 6
export const CAIXAS_PONTO_MES = 2

export interface EntradaMetas {
  metaLojaDia: number
  semanasPorMes: number
  ativos: { vendedor: number; motorista: number; ponto: number }
}

export function metasSemana(e: EntradaMetas): Record<CanalPlacar, number> {
  return {
    loja: e.metaLojaDia * DIAS_LOJA_SEMANA,
    vendedor: e.ativos.vendedor * PECAS_FORMA_PEQUENO,
    motorista: e.ativos.motorista * MOTORISTA_POR_DIA * DIAS_MOTORISTA,
    ponto: (e.ativos.ponto * CAIXAS_PONTO_MES * PECAS_CAIXA_PONTO) / e.semanasPorMes,
  }
}

// Peças de brownie num item de venda: brownie avulso conta direto; combo conta os brownies da composição.
export function pecasDoItem(
  item: { qtd: number; saborId?: string },
  produto?: { tipo: string; composicao?: ItemComposicao[] },
): number {
  if (item.saborId) return item.qtd
  if (!produto?.composicao) return 0
  const porUnidade = produto.composicao.reduce((s, c) => s + ('saborId' in c ? c.qtd : 0), 0)
  return item.qtd * porUnidade
}
