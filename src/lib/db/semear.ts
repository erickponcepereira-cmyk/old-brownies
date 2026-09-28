// Ao criar a empresa, grava as sementes da parte C (C1 a C12).
import { diaComercial, inicioSemana, somarDias } from '@/lib/motor/dia'
import { gravarSemSessao, novoId, op, type Op } from '@/lib/sync/gravar'
import type { Papel } from './tipos'
import * as S from './sementes'

export interface NovaEmpresa {
  nomeEmpresa: string
  criador: { userId: string; nome: string; papel: Extract<Papel, 'dono' | 'mentor'> }
}

function dataDaTarefa(quando: 'segunda' | 'semana' | 'outubro', hoje: string): string {
  if (quando === 'segunda') return inicioSemana(hoje) === hoje ? hoje : somarDias(inicioSemana(hoje), 7)
  if (quando === 'outubro') return hoje > '2026-10-01' ? hoje : '2026-10-01'
  return hoje
}

function sementesDeCusto(): Op[] {
  const idInsumo = new Map(S.INSUMOS.map((i) => [i.codigo, novoId()]))
  const idSabor = new Map(S.SABORES.map((s) => [s.codigo, novoId()]))
  const composicao = (itens: S.ProdutoSemente['composicao']) =>
    itens?.map((c) => ('sabor' in c ? { saborId: idSabor.get(c.sabor)!, tamanho: c.tamanho, qtd: c.qtd } : c))

  return [
    ...S.INSUMOS.map((i) => op('insumos', { ...i, id: idInsumo.get(i.codigo) })),
    ...S.COMPRAS_EXEMPLO.map((c) => op('compras', {
      data: c.data, insumoId: idInsumo.get(c.insumo)!, quantidade: c.quantidade, valorTotal: c.valorTotal, fornecedor: c.fornecedor,
    })),
    ...S.SABORES.map((s) => op('sabores', { ...s, id: idSabor.get(s.codigo), ativo: true })),
    ...Object.entries(S.RECEITAS).flatMap(([sabor, itens]) => itens.map(([insumo, quantidade]) =>
      op('receitaItens', { saborId: idSabor.get(sabor)!, insumoId: idInsumo.get(insumo)!, quantidade }))),
    ...S.TAMANHOS.map((t) => op('tamanhos', t)),
    ...S.PRODUTOS.map(({ sabor, composicao: comp, ...p }, ordem) =>
      op('produtos', { ...p, ordem, saborId: sabor ? idSabor.get(sabor) : undefined, composicao: composicao(comp) })),
  ]
}

function sementesDaOperacao(hoje: string): Op[] {
  return [
    ...S.CANAIS.map((c) => op('canais', c)),
    ...S.PROMOCOES.map((p) => op('promocoes', p)),
    ...S.CUSTOS_FIXOS.map((c) => op('custosFixos', c)),
    ...S.ROTINA.map(([diaSemana, inicio, fim, titulo, detalhe, tipo, obrigatoria, atalho], ordem) =>
      op('rotinaTarefas', { diaSemana, inicio, fim, titulo, detalhe, tipo, obrigatoria, atalho, papel: 'dono', ordem, ativa: true })),
    ...S.TAREFAS_AVULSAS.map(({ quando, ...t }) => op('tarefasAvulsas', { ...t, data: dataDaTarefa(quando, hoje), papel: 'dono' })),
    ...S.ZONAS.map((z) => op('zonas', z)),
    op('configsMentor', { limitesFaturamento: S.LIMITES_FATURAMENTO }),
  ]
}

export async function criarEmpresa({ nomeEmpresa, criador }: NovaEmpresa) {
  const empresaId = novoId()
  const membroId = novoId()
  const hoje = diaComercial(new Date(), S.CONFIG.horaViradaDia)
  await gravarSemSessao({ empresaId, userId: criador.userId }, [
    op('empresas', { ...S.EMPRESA, nome: nomeEmpresa || S.EMPRESA.nome, id: empresaId }),
    op('membros', { id: membroId, userId: criador.userId, papel: criador.papel, nome: criador.nome }),
    op('configs', S.CONFIG),
    ...sementesDeCusto(),
    ...sementesDaOperacao(hoje),
  ])
  return { empresaId, membroId }
}
