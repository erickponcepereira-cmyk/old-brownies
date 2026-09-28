// B5.9 — saúde da rede.
import type { TipoParceiro } from '@/lib/db/tipos'

export const DIAS_PARADO: Partial<Record<TipoParceiro, number>> = { vendedor: 10, motorista: 12 }
export const DIAS_SEM_VISITA = 7
export const TROCA_ALTA = 0.2
export const DIAS_TESTE_PONTO = 30

export function estaParado(tipo: TipoParceiro, diasSemCompra: number | null): boolean {
  const limite = DIAS_PARADO[tipo]
  return limite !== undefined && diasSemCompra !== null && diasSemCompra > limite
}

// (estoque deixado na visita anterior + entregue desde então) − contado agora
export function vendidoNoPonto(estoqueAnterior: number, entregueDesde: number, contadoAgora: number): number {
  return Math.max(0, estoqueAnterior + entregueDesde - contadoAgora)
}

export function trocaPct(trocado: number, vendido: number): number {
  if (vendido > 0) return trocado / vendido
  return trocado > 0 ? 1 : 0
}

export interface ConflitoZona { zona: string; noite: number; nomes: string[] }

// Cada zona tem um vendedor dono: dois ativos na mesma zona e noite viram aviso.
export function conflitosDeZona(
  vendedores: Array<{ nome: string; zona?: string; noites?: number[]; status: string }>,
): ConflitoZona[] {
  const mapa = new Map<string, string[]>()
  for (const v of vendedores) {
    if (v.status !== 'ativo' || !v.zona) continue
    for (const noite of v.noites ?? []) {
      const chave = `${v.zona}|${noite}`
      mapa.set(chave, [...(mapa.get(chave) ?? []), v.nome])
    }
  }
  return [...mapa.entries()]
    .filter(([, nomes]) => nomes.length > 1)
    .map(([chave, nomes]) => {
      const [zona, noite] = chave.split('|')
      return { zona, noite: Number(noite), nomes }
    })
}
