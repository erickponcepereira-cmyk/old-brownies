// Hooks de leitura ao vivo que alimentam as telas (Hoje, Placar, Rede, Estoque, Painel do mentor).
import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/banco'
import type { CodigoTamanho } from '@/lib/db/tipos'
import { useSessao } from '@/lib/sessao'
import { inicioMes } from '@/lib/motor/dia'
import { useCadastros } from './cadastros'
import { lerDaEmpresa, useVendas } from './consultas'
import { resumirEstoque, resumirRede, resumirVendas, sumicoDesde, type ResumoVenda } from './indicadores'

export function useResumoVendas(de: string, ate: string): ResumoVenda[] | undefined {
  const cad = useCadastros()
  const periodo = useVendas(de, ate)
  return useMemo(() => (periodo ? resumirVendas(periodo, cad) : undefined), [periodo, cad])
}

export function useNomeItem() {
  const { saborPorId } = useCadastros()
  return (saborId: string, tamanho: CodigoTamanho) => `${saborPorId.get(saborId)?.nome ?? 'Sabor'} ${tamanho}`
}

export function useEstoque(hoje: string) {
  const { empresaId } = useSessao()
  const dados = useLiveQuery(async () => {
    const [lotes, movimentos] = await Promise.all([lerDaEmpresa('lotes', empresaId), lerDaEmpresa('movimentos', empresaId)])
    return { lotes, movimentos }
  }, [empresaId])
  return useMemo(() => {
    if (!dados) return undefined
    return { ...resumirEstoque(dados.lotes, dados.movimentos, hoje), sumicoMes: sumicoDesde(dados.movimentos, inicioMes(hoje)), movimentos: dados.movimentos }
  }, [dados, hoje])
}

export function useRede(hoje: string) {
  const { empresaId } = useSessao()
  const cad = useCadastros()
  const dados = useLiveQuery(async () => {
    const parceiros = await lerDaEmpresa('parceiros', empresaId)
    const vendas = (await db.vendas.where('parceiroId').anyOf(parceiros.map((p) => p.id)).toArray()).filter((v) => !v.deletedAt)
    const itens = (await db.vendaItens.where('vendaId').anyOf(vendas.map((v) => v.id)).toArray()).filter((i) => !i.deletedAt)
    const visitas = await lerDaEmpresa('visitasPonto', empresaId)
    return { parceiros, vendas, itens, visitas }
  }, [empresaId])
  return useMemo(() => {
    if (!dados) return undefined
    const compras = resumirVendas({ vendas: dados.vendas, itens: dados.itens }, cad)
    const parceiros = [...dados.parceiros].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    return { parceiros, resumos: resumirRede(parceiros, compras, dados.visitas, hoje, inicioMes(hoje)) }
  }, [dados, cad, hoje])
}

export function useChecklist(de: string, ate: string) {
  const { empresaId } = useSessao()
  return useLiveQuery(async () => {
    const [rotina, avulsas] = await Promise.all([lerDaEmpresa('rotinaTarefas', empresaId), lerDaEmpresa('tarefasAvulsas', empresaId)])
    const itens = (await db.checklistItens.where('data').between(de, ate, true, true).toArray())
      .filter((i) => i.empresaId === empresaId && !i.deletedAt)
    return { rotina, avulsas, itens }
  }, [empresaId, de, ate])
}

export function useRecados() {
  const { empresaId } = useSessao()
  return useLiveQuery(async () => (await lerDaEmpresa('recadosMentor', empresaId)).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)), [empresaId])
}
