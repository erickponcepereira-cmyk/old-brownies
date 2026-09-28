// B5.12 — gatilho de quinta: previsão para sexta e sábado.
export const PCT_SEM_HISTORICO = 0.47

// historico = peças de sexta + sábado em cada uma das últimas semanas (até 4).
export function previsaoSextaSabado(historico: number[], metaSemana: number): number {
  const ultimas = historico.slice(-4)
  if (!ultimas.length) return metaSemana * PCT_SEM_HISTORICO
  return ultimas.reduce((s, v) => s + v, 0) / ultimas.length
}

export function reforco(previsao: number, estoqueDisponivel: number, pecasPorForma: number) {
  const pecas = Math.max(0, previsao - estoqueDisponivel)
  return { pecas, formas: Math.ceil(pecas / pecasPorForma) }
}
