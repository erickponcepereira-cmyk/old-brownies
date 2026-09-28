// B5.6 — estoque é a soma dos movimentos; saída sempre do lote que vence primeiro.
import type { CodigoTamanho } from '@/lib/db/tipos'
import { diasEntre } from './dia'

export interface MovimentoEstoque { loteId: string | null; saborId: string; tamanho: CodigoTamanho; qtd: number }
export interface LoteEstoque { id: string; saborId: string; tamanho: CodigoTamanho; validadeAte: string }
export interface Retirada { loteId: string | null; qtd: number }

export const DIAS_ALERTA_VALIDADE = 3

export function chaveSaborTamanho(saborId: string, tamanho: CodigoTamanho): string {
  return `${saborId}|${tamanho}`
}

export function saldoPorLote(movimentos: MovimentoEstoque[]): Map<string, number> {
  const saldos = new Map<string, number>()
  for (const m of movimentos) {
    if (m.loteId) saldos.set(m.loteId, (saldos.get(m.loteId) ?? 0) + m.qtd)
  }
  return saldos
}

export function saldoPorSaborTamanho(movimentos: MovimentoEstoque[]): Map<string, number> {
  const saldos = new Map<string, number>()
  for (const m of movimentos) {
    const chave = chaveSaborTamanho(m.saborId, m.tamanho)
    saldos.set(chave, (saldos.get(chave) ?? 0) + m.qtd)
  }
  return saldos
}

export function diasParaVencer(validadeAte: string, hoje: string): number {
  return diasEntre(hoje, validadeAte)
}

export function estaVencido(validadeAte: string, hoje: string): boolean {
  return validadeAte < hoje
}

function lotesDoItem(lotes: LoteEstoque[], saborId: string, tamanho: CodigoTamanho) {
  return lotes
    .filter((l) => l.saborId === saborId && l.tamanho === tamanho)
    .sort((a, b) => a.validadeAte.localeCompare(b.validadeAte))
}

// FIFO por validade, sem lote vencido. O que faltar sai sem lote: estoque negativo sem produção lançada.
// diasMinimos: para o ponto, o lote precisa durar a semana inteira até a próxima troca.
export function escolherLotes(
  lotes: LoteEstoque[], saldos: Map<string, number>,
  saborId: string, tamanho: CodigoTamanho, qtd: number, hoje: string, diasMinimos = 0,
): Retirada[] {
  const retiradas: Retirada[] = []
  let falta = qtd
  for (const lote of lotesDoItem(lotes, saborId, tamanho)) {
    if (falta <= 0) break
    if (estaVencido(lote.validadeAte, hoje) || diasParaVencer(lote.validadeAte, hoje) < diasMinimos) continue
    const disponivel = saldos.get(lote.id) ?? 0
    if (disponivel <= 0) continue
    const tirar = Math.min(disponivel, falta)
    retiradas.push({ loteId: lote.id, qtd: tirar })
    falta -= tirar
  }
  if (falta > 0) retiradas.push({ loteId: null, qtd: falta })
  return retiradas
}

// Contagem física: falta sai do lote mais velho; sobra entra no mais novo. Retorna ajustes com sinal.
export function ajustesDeContagem(
  lotes: LoteEstoque[], saldos: Map<string, number>,
  saborId: string, tamanho: CodigoTamanho, diferenca: number,
): Retirada[] {
  if (diferenca === 0) return []
  const doItem = lotesDoItem(lotes, saborId, tamanho)
  if (diferenca > 0) return [{ loteId: doItem.at(-1)?.id ?? null, qtd: diferenca }]
  const ajustes: Retirada[] = []
  let falta = -diferenca
  for (const lote of doItem) {
    if (falta <= 0) break
    const disponivel = saldos.get(lote.id) ?? 0
    if (disponivel <= 0) continue
    const tirar = Math.min(disponivel, falta)
    ajustes.push({ loteId: lote.id, qtd: -tirar })
    falta -= tirar
  }
  if (falta > 0) ajustes.push({ loteId: null, qtd: -falta })
  return ajustes
}

// Maiores restos: distribui um total inteiro na proporção dos pesos (mix de uma forma sortida).
export function distribuirPorPeso(total: number, pesos: Array<{ id: string; peso: number }>): Record<string, number> {
  const validos = pesos.filter((p) => p.peso > 0)
  const soma = validos.reduce((s, p) => s + p.peso, 0)
  const resultado: Record<string, number> = {}
  if (!soma) return resultado
  const partes = validos.map((p) => {
    const exato = (total * p.peso) / soma
    return { id: p.id, inteiro: Math.floor(exato), resto: exato - Math.floor(exato) }
  })
  let sobra = total - partes.reduce((s, p) => s + p.inteiro, 0)
  const porResto = [...partes].sort((a, b) => b.resto - a.resto)
  for (const p of porResto) {
    if (sobra <= 0) break
    p.inteiro += 1
    sobra -= 1
  }
  for (const p of partes) resultado[p.id] = p.inteiro
  return resultado
}
