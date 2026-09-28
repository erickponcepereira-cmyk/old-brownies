import { describe, expect, it } from 'vitest'
import { ajustesDeContagem, distribuirPorPeso, escolherLotes, saldoPorLote } from './estoque'
import { metasSemana, pecasDoItem } from './placar'
import { conflitosDeZona, estaParado, trocaPct, vendidoNoPonto } from './rede'
import { cumprimento, rotinaDoDia } from './checklist'
import { previsaoSextaSabado, reforco } from './previsao'
import { resultadoMes } from './resultado'
import { inicioSemana } from './dia'

const lote = (id: string, validadeAte: string) => ({ id, saborId: 'trad', tamanho: 'pequeno' as const, validadeAte })

describe('estoque (B5.6)', () => {
  it('produzir 2 formas (70), vender 5 deixa 65, contar 60 mostra sumiço de 5', () => {
    const lotes = [lote('L1', '2026-10-13')]
    const movs = [{ loteId: 'L1', saborId: 'trad', tamanho: 'pequeno' as const, qtd: 70 }]
    const venda = escolherLotes(lotes, saldoPorLote(movs), 'trad', 'pequeno', 5, '2026-09-28')
    expect(venda).toEqual([{ loteId: 'L1', qtd: 5 }])
    movs.push({ loteId: 'L1', saborId: 'trad', tamanho: 'pequeno', qtd: -5 })
    expect(saldoPorLote(movs).get('L1')).toBe(65)
    const ajuste = ajustesDeContagem(lotes, saldoPorLote(movs), 'trad', 'pequeno', 60 - 65)
    expect(ajuste).toEqual([{ loteId: 'L1', qtd: -5 }])
  })

  it('sai do lote que vence primeiro e pula o vencido', () => {
    const lotes = [lote('novo', '2026-10-10'), lote('velho', '2026-10-01'), lote('vencido', '2026-09-20')]
    const saldos = new Map([['novo', 10], ['velho', 3], ['vencido', 5]])
    expect(escolherLotes(lotes, saldos, 'trad', 'pequeno', 5, '2026-09-28')).toEqual([
      { loteId: 'velho', qtd: 3 }, { loteId: 'novo', qtd: 2 },
    ])
  })

  it('sem produção lançada, a venda sai sem lote (estoque negativo)', () => {
    expect(escolherLotes([], new Map(), 'trad', 'pequeno', 4, '2026-09-28')).toEqual([{ loteId: null, qtd: 4 }])
  })

  it('forma sortida de 35 no mix 4:1:1:1:1 e caixa de 24', () => {
    const pesos = [{ id: 't', peso: 4 }, { id: 'a', peso: 1 }, { id: 'b', peso: 1 }, { id: 'c', peso: 1 }, { id: 'd', peso: 1 }]
    const forma = distribuirPorPeso(35, pesos)
    expect(Object.values(forma).reduce((s, v) => s + v, 0)).toBe(35)
    expect(forma.t).toBe(18)
    expect(distribuirPorPeso(24, pesos)).toEqual({ t: 12, a: 3, b: 3, c: 3, d: 3 })
  })
})

describe('placar (B5.7)', () => {
  it('metas da rede completa somam ~440', () => {
    const m = metasSemana({ metaLojaDia: 15, semanasPorMes: 4.333, ativos: { vendedor: 5, motorista: 5, ponto: 5 } })
    expect(m.loja).toBe(90)
    expect(m.vendedor).toBe(175)
    expect(m.motorista).toBe(120)
    expect(m.ponto).toBeCloseTo(55.39, 2)
    expect(Math.round(m.loja + m.vendedor + m.motorista + m.ponto)).toBe(440)
  })

  it('Old Box conta 4 brownies', () => {
    const box = { tipo: 'combo', composicao: [{ saborId: 'trad', tamanho: 'pequeno' as const, qtd: 4 }, { descricao: 'Caixa', valor: 2 }] }
    expect(pecasDoItem({ qtd: 2 }, box)).toBe(8)
    expect(pecasDoItem({ qtd: 3, saborId: 'trad' })).toBe(3)
  })
})

describe('rede (B5.9)', () => {
  it('parado: vendedor > 10 dias, motorista > 12', () => {
    expect(estaParado('vendedor', 11)).toBe(true)
    expect(estaParado('vendedor', 10)).toBe(false)
    expect(estaParado('motorista', 12)).toBe(false)
    expect(estaParado('ponto', 40)).toBe(false)
  })

  it('vendido no ponto e troca %', () => {
    expect(vendidoNoPonto(24, 24, 18)).toBe(30)
    expect(trocaPct(6, 30)).toBeCloseTo(0.2)
  })

  it('dois vendedores ativos na mesma zona e noite', () => {
    const c = conflitosDeZona([
      { nome: 'Ana', zona: 'Z1', noites: [5, 6], status: 'ativo' },
      { nome: 'Beto', zona: 'Z1', noites: [6], status: 'ativo' },
      { nome: 'Caio', zona: 'Z1', noites: [6], status: 'pausado' },
    ])
    expect(c).toEqual([{ zona: 'Z1', noite: 6, nomes: ['Ana', 'Beto'] }])
  })
})

describe('checklist (B5.10)', () => {
  const t = (diaSemana: number, inicio: string, extra = {}) => ({ diaSemana, inicio, ativa: true, papel: 'dono' as const, ...extra })

  it('tarefas do dia na ordem do horário, respeitando a vigência', () => {
    const tarefas = [t(1, '09:00'), t(1, '06:00'), t(2, '06:00'), t(1, '07:00', { validaDe: '2026-10-05' })]
    const segunda = rotinaDoDia(tarefas, '2026-09-28')
    expect(segunda.map((x) => x.inicio)).toEqual(['06:00', '09:00'])
    expect(rotinaDoDia(tarefas, '2026-10-05')).toHaveLength(3)
  })

  it('cumprimento = feitas ÷ obrigatórias', () => {
    const c = cumprimento([
      { obrigatoria: true, feita: true }, { obrigatoria: true, feita: false }, { obrigatoria: false, feita: true },
    ])
    expect(c.pct).toBe(0.5)
  })
})

describe('previsão de sexta e sábado (B5.12)', () => {
  it('sem histórico usa 47% da meta', () => {
    expect(previsaoSextaSabado([], 100)).toBe(47)
    expect(reforco(47, 10, 35)).toEqual({ pecas: 37, formas: 2 })
  })
})

describe('resultado (B5.8)', () => {
  it('falta para o azul', () => {
    const r = resultadoMes({ margem: 5000, faturamento: 10000, provisaoImposto: 0.05, fixos: { ponto: 3000, empresa: 1000, pessoal: 1500, divida: 500 } })
    expect(r.imposto).toBe(500)
    expect(r.lucroEmpresa).toBe(500)
    expect(r.sobra).toBe(-1500)
    expect(r.faltaParaOAzul).toBe(1500)
  })
})

describe('semana', () => {
  it('começa na segunda', () => {
    expect(inicioSemana('2026-10-04')).toBe('2026-09-28')
    expect(inicioSemana('2026-09-28')).toBe('2026-09-28')
  })
})
