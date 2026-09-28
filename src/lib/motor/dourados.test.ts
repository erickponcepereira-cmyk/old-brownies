// B8 — testes dourados: com as sementes da parte C, o motor tem que chegar nos números da planilha v4.
import { describe, expect, it } from 'vitest'
import {
  COMPRAS_EXEMPLO, CONFIG, CUSTOS_FIXOS, INSUMOS, PRODUTOS, RECEITAS, SABORES, TAMANHOS,
} from '@/lib/db/sementes'
import { calcularCustos, custoProduto, type EntradaCustos } from './custo'
import { lucroPorForma, lucroPorPeca, precoMedioLoja, taxaDoCanal } from './lucro'
import { equilibrioEmPecas, somarFixos } from './resultado'
import { simularRede } from './simulador'
import { diaComercial, diaSemanaIso } from './dia'

const PECA = 0.01
const MES = 1

function perto(valor: number, esperado: number, tolerancia = PECA) {
  expect(Math.abs(valor - esperado)).toBeLessThanOrEqual(tolerancia)
}

function entradaDasSementes(formasSemana = 8): EntradaCustos {
  return {
    insumos: INSUMOS.map((i) => ({ id: i.codigo, codigo: i.codigo, precoManual: i.precoManual })),
    compras: COMPRAS_EXEMPLO.map((c) => ({ insumoId: c.insumo, data: c.data, quantidade: c.quantidade, valorTotal: c.valorTotal })),
    sabores: SABORES.map((s) => ({ id: s.codigo, pesoMix: s.pesoMix })),
    receitas: Object.entries(RECEITAS).flatMap(([sabor, itens]) =>
      itens.map(([insumo, quantidade]) => ({ saborId: sabor, insumoId: insumo, quantidade }))),
    pecasPorForma: { pequeno: 35, grande: 24 },
    config: CONFIG,
    formasSemana,
  }
}

const tabela = calcularCustos(entradaDasSementes())
const taxas = { taxaMaquininha: CONFIG.taxaMaquininha, comissaoIfood: CONFIG.comissaoIfood }
const lucroCanal = (canal: Parameters<typeof taxaDoCanal>[0], preco: number, tamanho: 'pequeno' | 'grande') =>
  lucroPorPeca(preco, taxaDoCanal(canal, taxas), tabela.variavelMix[tamanho])

describe('B8 · custos', () => {
  it('massa de cada sabor (C4)', () => {
    perto(tabela.massa.tradicional, 41.946, 0.0001)
    perto(tabela.massa.maca, 64.276, 0.0001)
    perto(tabela.massa.cookie, 45.3421, 0.0001)
    perto(tabela.massa.castanha, 47.846, 0.0001)
    perto(tabela.massa.honey, 66.821, 0.0001)
    perto(tabela.massa.limao, 110.9589, 0.0001)
  })

  it('custo direto — tradicional e limão', () => {
    perto(tabela.direto.tradicional.pequeno, 2.0985)
    perto(tabela.direto.tradicional.grande, 2.6477)
    perto(tabela.direto.limao.pequeno, 4.0703)
    perto(tabela.direto.limao.grande, 5.5233)
  })

  it('custo direto no mix', () => {
    perto(tabela.diretoMix.pequeno, 2.3002)
    perto(tabela.diretoMix.grande, 2.942)
  })

  it('produção por forma a 8 formas por semana', () => {
    perto(tabela.producaoPorForma, 15.2045)
    expect(tabela.jornadasPorSemana).toBe(1)
  })

  it('custo variável no mix', () => {
    perto(tabela.variavelMix.pequeno, 2.7347)
    perto(tabela.variavelMix.grande, 3.5755)
  })

  it('custo de hoje do cardápio (C6)', () => {
    const idsSabor = (p: (typeof PRODUTOS)[number]) => ({
      ...p,
      saborId: p.sabor,
      composicao: p.composicao?.map((c) => ('sabor' in c ? { saborId: c.sabor, tamanho: c.tamanho, qtd: c.qtd } : c)),
    })
    const custo = (nome: string) => custoProduto(idsSabor(PRODUTOS.find((p) => p.nome === nome)!), tabela)!
    perto(custo('Tradicional'), 2.53, 0.005)
    perto(custo('Jack Honey'), 3.24, 0.005)
    perto(custo('Grande tradicional'), 3.28, 0.005)
    perto(custo('Grande com nutella'), 5.74, 0.005)
    perto(custo('Grande + nutella + sorvete'), 8.74, 0.005)
    perto(custo('Old Capuccino'), 4.88, 0.005)
    perto(custo('Old Box (4 pequenos)'), 13.23, 0.005)
  })
})

describe('B8 · lucro por canal', () => {
  it('preço médio da loja no mix', () => {
    const produtos = PRODUTOS.map((p) => ({ ...p, saborId: p.sabor }))
    perto(precoMedioLoja(produtos, SABORES.map((s) => ({ id: s.codigo, pesoMix: s.pesoMix }))), 14.25, 0.0001)
  })

  it('lucro por peça', () => {
    perto(lucroCanal('vendedor', 8, 'pequeno'), 5.2653)
    perto(lucroCanal('motorista', 8, 'pequeno'), 5.2653)
    perto(lucroCanal('ponto', 10, 'grande'), 6.4245)
    perto(lucroCanal('loja', 14.25, 'pequeno'), 11.1876)
    perto(lucroCanal('rota', 18, 'grande'), 14.0105)
    perto(lucroCanal('feira', 15, 'pequeno'), 11.9203)
  })

  it('lucro por forma e por caixa', () => {
    perto(lucroPorForma(lucroCanal('vendedor', 8, 'pequeno'), 35), 184.29)
    perto(lucroPorForma(lucroCanal('ponto', 10, 'grande'), 24), 154.19)
  })
})

describe('B8 · equilíbrio em peças', () => {
  const fixos = somarFixos(CUSTOS_FIXOS)
  const lucroLoja = lucroCanal('loja', 14.25, 'pequeno')

  it('totais na visão do Gabriel (C9)', () => {
    perto(fixos.ponto, 3373.83, MES)
    perto(fixos.empresa, 1693, MES)
    perto(fixos.pessoal, 2549.68, MES)
    perto(fixos.divida, 1630, MES)
    perto(somarFixos(CUSTOS_FIXOS, true).empresa - fixos.empresa, 282.05, MES)
  })

  it('ponto / empresa / vida / dívida / total', () => {
    perto(equilibrioEmPecas(fixos.ponto, lucroLoja), 301.57)
    perto(equilibrioEmPecas(fixos.empresa, lucroLoja), 151.33)
    perto(equilibrioEmPecas(fixos.pessoal, lucroLoja), 227.9)
    perto(equilibrioEmPecas(fixos.divida, lucroLoja), 145.7)
    const total = fixos.ponto + fixos.empresa + fixos.pessoal + fixos.divida
    perto(equilibrioEmPecas(total, lucroLoja), 826.5)
  })
})

describe('B8 · rede completa (simulador)', () => {
  const fixos = somarFixos(CUSTOS_FIXOS)
  const r = simularRede(
    {
      diasLoja: 6, lojaPorDia: 15, precoMedioLoja: 14.25,
      vendedores: 5, vendedorPorSemana: 35, precoVendedor: 8,
      motoristas: 5, motoristaPorDia: 4, diasMotorista: 6, precoMotorista: 8,
      pontos: 5, caixasPorMes: 2, pecasPorCaixa: 24, precoPonto: 10, trocaPct: 0.2,
      semanasPorMes: CONFIG.semanasPorMes, provisaoImposto: CONFIG.provisaoImposto,
      capacidadeJornada: CONFIG.capacidadeJornada, taxaMaquininha: CONFIG.taxaMaquininha,
      fixosLoja: fixos.ponto, fixosEmpresa: fixos.empresa, pessoal: fixos.pessoal, divida: fixos.divida,
      pecasPorForma: { pequeno: 35, grande: 24 },
    },
    (formas) => calcularCustos(entradaDasSementes(formas)).variavelMix,
  )

  it('produção', () => {
    perto(r.formasSemana, 13.77)
    expect(r.jornadas).toBe(1)
    perto(r.pecasSemana, 440, 0.5)
  })

  it('custo variável na rede completa', () => {
    perto(r.custo.pequeno, 2.585)
    perto(r.custo.grande, 3.3573)
  })

  it('faturamento, lucro dos setores, lucro da empresa e sobra', () => {
    perto(r.faturamento, 18182.95, MES)
    perto(r.lucroSetores, 9563.21, MES)
    perto(r.lucroEmpresa, 6961.07, MES)
    perto(r.sobra, 2781.39, MES)
  })

  it('% do volume para a empresa se pagar e para pagar tudo', () => {
    perto(r.pctEmpresaSePagar * 100, 42.1, 0.05)
    perto(r.pctPagarTudo * 100, 76.9, 0.05)
  })
})

describe('B8 · dia comercial', () => {
  it('venda às 0h30 de sábado conta para sexta', () => {
    // sábado, 03/10/2026, 00:30 em Cuiabá (UTC−4) = 04:30 UTC
    const dia = diaComercial(new Date('2026-10-03T04:30:00Z'), CONFIG.horaViradaDia)
    expect(dia).toBe('2026-10-02')
    expect(diaSemanaIso(dia)).toBe(5)
  })

  it('às 4h o dia vira', () => {
    expect(diaComercial(new Date('2026-10-03T08:00:00Z'), 4)).toBe('2026-10-03')
  })
})

describe('sementes', () => {
  it('tamanhos: grande 24, pequeno 35', () => {
    expect(TAMANHOS).toEqual([{ codigo: 'grande', pecasPorForma: 24 }, { codigo: 'pequeno', pecasPorForma: 35 }])
  })
})
