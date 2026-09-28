// Movimentos só de inclusão: produção, perda, amostra, contagem. O estoque é a soma deles.
import { db } from '@/lib/db/banco'
import type { CodigoTamanho, Lote, Movimento, Sabor, TipoMovimento } from '@/lib/db/tipos'
import { exigirSessao } from '@/lib/sessao'
import { gravar, novoId, op, type Op } from '@/lib/sync/gravar'
import { lerDaEmpresa } from '@/lib/dados/consultas'
import { diaComercial, somarDias } from '@/lib/motor/dia'
import {
  ajustesDeContagem, chaveSaborTamanho, escolherLotes, saldoPorLote, saldoPorSaborTamanho, type Retirada,
} from '@/lib/motor/estoque'

export interface Estoque {
  lotes: Lote[]
  movimentos: Movimento[]
  saldoLote: Map<string, number>
  saldoItem: Map<string, number>
}

export async function carregarEstoque(empresaId = exigirSessao().empresaId): Promise<Estoque> {
  const [lotes, movimentos] = await Promise.all([lerDaEmpresa('lotes', empresaId), lerDaEmpresa('movimentos', empresaId)])
  return { lotes, movimentos, saldoLote: saldoPorLote(movimentos), saldoItem: saldoPorSaborTamanho(movimentos) }
}

interface Contexto { horaViradaDia: number; momento?: Date }

export function movimento(
  ctx: Contexto, tipo: TipoMovimento, refId: string,
  item: { saborId: string; tamanho: CodigoTamanho; loteId: string | null; qtd: number },
): Op {
  const momento = ctx.momento ?? new Date()
  return op('movimentos', {
    data: momento.toISOString(), diaComercial: diaComercial(momento, ctx.horaViradaDia), tipo, refId, ...item,
  })
}

// Baixa FIFO que já desconta o que foi reservado para itens anteriores do mesmo lançamento.
export function baixar(
  estoque: Estoque, saborId: string, tamanho: CodigoTamanho, qtd: number, hoje: string, diasMinimos = 0,
): Retirada[] {
  const retiradas = escolherLotes(estoque.lotes, estoque.saldoLote, saborId, tamanho, qtd, hoje, diasMinimos)
  for (const r of retiradas) {
    if (r.loteId) estoque.saldoLote.set(r.loteId, (estoque.saldoLote.get(r.loteId) ?? 0) - r.qtd)
  }
  const chave = chaveSaborTamanho(saborId, tamanho)
  estoque.saldoItem.set(chave, (estoque.saldoItem.get(chave) ?? 0) - qtd)
  return retiradas
}

export interface NovaProducao {
  data: string
  responsavel: string
  diariaPaga: number
  itens: Array<{ saborId: string; tamanho: CodigoTamanho; formas: number }>
}

export async function registrarProducao(p: NovaProducao, ctx: Contexto & { sabores: Map<string, Sabor>; pecasPorForma: Record<CodigoTamanho, number> }) {
  const producaoId = novoId()
  const ops: Op[] = [op('producoes', { id: producaoId, data: p.data, responsavel: p.responsavel, diariaPaga: p.diariaPaga })]
  for (const item of p.itens.filter((i) => i.formas > 0)) {
    const producaoItemId = novoId()
    const loteId = novoId()
    const qtd = item.formas * ctx.pecasPorForma[item.tamanho]
    const validade = ctx.sabores.get(item.saborId)?.validadeDias ?? 15
    ops.push(
      op('producaoItens', { id: producaoItemId, producaoId, ...item }),
      op('lotes', { id: loteId, producaoItemId, saborId: item.saborId, tamanho: item.tamanho, qtdInicial: qtd, validadeAte: somarDias(p.data, validade) }),
      movimento(ctx, 'producao', producaoId, { saborId: item.saborId, tamanho: item.tamanho, loteId, qtd }),
    )
  }
  await gravar(...ops)
  return producaoId
}

export async function registrarPerda(
  p: { loteId: string | null; saborId: string; tamanho: CodigoTamanho; qtd: number; motivo: 'validade' | 'quebra' | 'outro' },
  ctx: Contexto,
) {
  const perdaId = novoId()
  await gravar(
    op('perdas', { id: perdaId, data: new Date().toISOString(), ...p }),
    movimento(ctx, 'perda', perdaId, { saborId: p.saborId, tamanho: p.tamanho, loteId: p.loteId, qtd: -p.qtd }),
  )
}

// B6.10 — amostra de recorte não baixa estoque; amostra de peça inteira baixa, com motivo "amostra".
export async function registrarAmostra(
  a: { local: string; qtd: number; deRecorte: boolean; saborId?: string; tamanho?: CodigoTamanho },
  ctx: Contexto & { hoje: string },
) {
  const amostraId = novoId()
  const ops: Op[] = [op('amostras', { id: amostraId, data: new Date().toISOString(), ...a })]
  if (!a.deRecorte && a.saborId && a.tamanho) {
    const estoque = await carregarEstoque()
    for (const r of baixar(estoque, a.saborId, a.tamanho, a.qtd, ctx.hoje)) {
      ops.push(movimento(ctx, 'amostra', amostraId, { saborId: a.saborId, tamanho: a.tamanho, loteId: r.loteId, qtd: -r.qtd }))
    }
  }
  await gravar(...ops)
}

// Contagem da segunda-feira: a diferença vira ajuste — e aparece como sumiço.
export async function registrarContagem(
  itens: Array<{ saborId: string; tamanho: CodigoTamanho; contado: number }>,
  ctx: Contexto,
) {
  const estoque = await carregarEstoque()
  const contagemId = novoId()
  const registro = itens.map((i) => ({
    ...i, loteId: null, sistema: estoque.saldoItem.get(chaveSaborTamanho(i.saborId, i.tamanho)) ?? 0,
  }))
  const ajustes = registro.flatMap((i) =>
    ajustesDeContagem(estoque.lotes, estoque.saldoLote, i.saborId, i.tamanho, i.contado - i.sistema)
      .map((a) => movimento(ctx, 'ajuste_contagem', contagemId, { saborId: i.saborId, tamanho: i.tamanho, loteId: a.loteId, qtd: a.qtd })))
  await gravar(op('contagens', { id: contagemId, data: new Date().toISOString(), itens: registro }), ...ajustes)
  return registro.reduce((s, i) => s + (i.contado - i.sistema), 0)
}

export async function baixarLoteVencido(lote: Lote, saldo: number, ctx: Contexto) {
  await registrarPerda({ loteId: lote.id, saborId: lote.saborId, tamanho: lote.tamanho, qtd: saldo, motivo: 'validade' }, ctx)
}

export async function movimentosDaReferencia(refIds: string[]) {
  return (await db.movimentos.where('refId').anyOf(refIds).toArray()).filter((m) => !m.deletedAt)
}
