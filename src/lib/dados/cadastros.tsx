// Cadastros da empresa + tabela de custos de hoje, calculados uma vez e compartilhados por todas as telas.
import { useContext, useMemo, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/banco'
import type * as T from '@/lib/db/tipos'
import { useSessao } from '@/lib/sessao'
import { calcularCustos, FORMAS_SEM_HISTORICO, type TabelaCustos } from '@/lib/motor/custo'
import { lucroPorPeca, precoMedioLoja, taxaDoCanal, type TaxasCanal } from '@/lib/motor/lucro'
import { dataLocal, diasEntre, somarDias } from '@/lib/motor/dia'
import { lerDaEmpresa } from './consultas'
import { ContextoCadastros } from './contexto'

export interface Cadastros {
  empresa: T.Empresa
  inicioUso: string // primeiro dia acompanhado: antes disso, nada conta como pulado
  config: T.Config
  sabores: T.Sabor[]
  saborPorId: Map<string, T.Sabor>
  pecasPorForma: Record<T.CodigoTamanho, number>
  insumos: T.Insumo[]
  compras: T.Compra[]
  receitas: T.ReceitaItem[]
  produtos: T.Produto[]
  produtoPorId: Map<string, T.Produto>
  canais: T.Canal[]
  canal: (codigo: T.CodigoCanal) => T.Canal
  custosFixos: T.CustoFixo[]
  promocoes: T.Promocao[]
  zonas: T.Zona[]
  tabela: TabelaCustos
  taxas: TaxasCanal
  precoMedioLoja: number
  lucroLoja: number
  lucroPecaCanal: (codigo: T.CodigoCanal, preco?: number) => number
}

async function lerTudo(empresaId: string) {
  const [empresa, configs, sabores, tamanhos, insumos, compras, receitas, produtos, canais, custosFixos, promocoes, zonas, producoes, producaoItens] =
    await Promise.all([
      db.empresas.get(empresaId),
      lerDaEmpresa('configs', empresaId),
      lerDaEmpresa('sabores', empresaId),
      lerDaEmpresa('tamanhos', empresaId),
      lerDaEmpresa('insumos', empresaId),
      lerDaEmpresa('compras', empresaId),
      lerDaEmpresa('receitaItens', empresaId),
      lerDaEmpresa('produtos', empresaId),
      lerDaEmpresa('canais', empresaId),
      lerDaEmpresa('custosFixos', empresaId),
      lerDaEmpresa('promocoes', empresaId),
      lerDaEmpresa('zonas', empresaId),
      lerDaEmpresa('producoes', empresaId),
      lerDaEmpresa('producaoItens', empresaId),
    ])
  return { empresa, config: configs[0], sabores, tamanhos, insumos, compras, receitas, produtos, canais, custosFixos, promocoes, zonas, producoes, producaoItens }
}

type Brutos = Awaited<ReturnType<typeof lerTudo>>

// B5.3: formasSemana = média das últimas 4 semanas de produção lançada; sem histórico, 8.
function formasPorSemana(producoes: T.Producao[], itens: T.ProducaoItem[], hoje: string): number {
  if (!producoes.length) return FORMAS_SEM_HISTORICO
  const primeira = producoes.reduce((m, p) => (p.data < m ? p.data : m), hoje)
  const semanas = Math.min(4, Math.max(1, Math.ceil((diasEntre(primeira, hoje) + 1) / 7)))
  const desde = somarDias(hoje, -27)
  const recentes = new Set(producoes.filter((p) => p.data >= desde).map((p) => p.id))
  const formas = itens.filter((i) => recentes.has(i.producaoId)).reduce((s, i) => s + i.formas, 0)
  return formas / semanas
}

const ORDEM_CANAIS: T.CodigoCanal[] = ['loja', 'rota', 'feira', 'evento', 'ifood', 'vendedor', 'motorista', 'ponto']

const ordemSabor = (a: T.Sabor, b: T.Sabor) => b.pesoMix - a.pesoMix || a.nome.localeCompare(b.nome, 'pt-BR')

function montar(b: Brutos, papel: T.Papel): Cadastros | null {
  if (!b.empresa || !b.config) return null
  // Custos com visibilidade "mentor" (DAS, contador) só existem na visão do mentor.
  const custosFixos = b.custosFixos.filter((c) => c.visibilidade === 'todos' || papel === 'mentor')
  const config = b.config
  const pecasPorForma = { pequeno: 35, grande: 24 }
  for (const t of b.tamanhos) pecasPorForma[t.codigo] = t.pecasPorForma
  const sabores = [...b.sabores].sort(ordemSabor)
  const produtos = [...b.produtos].sort((x, y) => (x.ordem ?? 999) - (y.ordem ?? 999) || x.nome.localeCompare(y.nome, 'pt-BR'))
  const canais = [...b.canais].sort((x, y) => ORDEM_CANAIS.indexOf(x.codigo) - ORDEM_CANAIS.indexOf(y.codigo))
  const custosOrdenados = custosFixos.sort((x, y) => y.valorMensal - x.valorMensal)
  const tabela = calcularCustos({
    insumos: b.insumos, compras: b.compras, sabores: sabores.filter((s) => s.ativo), receitas: b.receitas,
    pecasPorForma, config, formasSemana: formasPorSemana(b.producoes, b.producaoItens, dataLocal(new Date())),
  })
  const taxas = { taxaMaquininha: config.taxaMaquininha, comissaoIfood: config.comissaoIfood }
  const canalPorCodigo = new Map(canais.map((c) => [c.codigo, c]))
  const canal = (codigo: T.CodigoCanal) => canalPorCodigo.get(codigo)!
  const medio = precoMedioLoja(produtos, sabores)
  const lucroPecaCanal = (codigo: T.CodigoCanal, preco?: number) => {
    const c = canal(codigo)
    const p = preco ?? c?.precoPadrao ?? medio
    return lucroPorPeca(p, taxaDoCanal(codigo, taxas), tabela.variavelMix[c?.tamanhoPadrao ?? 'pequeno'])
  }
  return {
    empresa: b.empresa, inicioUso: dataLocal(new Date(b.empresa.createdAt)), config, sabores, saborPorId: new Map(sabores.map((s) => [s.id, s])), pecasPorForma,
    insumos: b.insumos, compras: b.compras, receitas: b.receitas,
    produtos, produtoPorId: new Map(produtos.map((p) => [p.id, p])),
    canais, canal, custosFixos: custosOrdenados, promocoes: b.promocoes, zonas: b.zonas,
    tabela, taxas, precoMedioLoja: medio, lucroLoja: lucroPecaCanal('loja', medio), lucroPecaCanal,
  }
}

export function CadastrosProvider({ children, carregando }: { children: ReactNode; carregando: ReactNode }) {
  const { empresaId, papel } = useSessao()
  const brutos = useLiveQuery(() => lerTudo(empresaId), [empresaId])
  const valor = useMemo(() => (brutos ? montar(brutos, papel) : null), [brutos, papel])
  if (!valor) return carregando
  return <ContextoCadastros.Provider value={valor}>{children}</ContextoCadastros.Provider>
}

export function useCadastros(): Cadastros {
  const valor = useContext(ContextoCadastros)
  if (!valor) throw new Error('useCadastros fora do CadastrosProvider')
  return valor
}
