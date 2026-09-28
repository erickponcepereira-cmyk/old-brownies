import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { CodigoTamanho } from '@/lib/db/tipos'
import { useSessao, veCustos } from '@/lib/sessao'
import { cx } from '@/lib/cx'
import { useCadastros } from '@/lib/dados/cadastros'
import { useHoje, useRegistros } from '@/lib/dados/consultas'
import { useEstoque, useNomeItem, useResumoVendas } from '@/lib/dados/hooks'
import { contarAtivos } from '@/lib/dados/indicadores'
import { diaSemanaIso, inicioSemana, somarDias } from '@/lib/motor/dia'
import { chaveSaborTamanho, estaVencido } from '@/lib/motor/estoque'
import { metasSemana } from '@/lib/motor/placar'
import { previsaoSextaSabado, reforco } from '@/lib/motor/previsao'
import { dataCurta, numero, reais } from '@/lib/formato'
import { baixarLoteVencido } from '@/lib/operacoes/estoque'
import { Aviso, Botao, Numero, Selo, Vazio } from '@/components/ui/basicos'
import { Secao, Tela } from '@/components/ui/Tela'
import { mostrarErro, mostrarToast } from '@/components/ui/Toast'
import { FolhaAmostra, FolhaContagem, FolhaPerda } from './Folhas'

const TAMANHOS: CodigoTamanho[] = ['pequeno', 'grande']

function Previsao({ hoje, estoque }: { hoje: string; estoque: Map<string, number> }) {
  const cad = useCadastros()
  const parceiros = useRegistros('parceiros')
  const vendas = useResumoVendas(somarDias(inicioSemana(hoje), -28), hoje)
  if (!vendas || !parceiros) return null
  const metas = metasSemana({ metaLojaDia: cad.config.metaLojaDia, semanasPorMes: cad.config.semanasPorMes, ativos: contarAtivos(parceiros) })
  const metaPorTamanho = { pequeno: metas.loja + metas.vendedor + metas.motorista, grande: metas.ponto }
  const segunda = inicioSemana(hoje)

  const linhas = TAMANHOS.map((tamanho) => {
    const semanas = [1, 2, 3, 4].map((n) => {
      const dias = [somarDias(segunda, -7 * n + 4), somarDias(segunda, -7 * n + 5)]
      return vendas.filter((v) => dias.includes(v.venda.diaComercial))
        .flatMap((v) => v.itens).filter((i) => i.saborId && i.tamanho === tamanho).reduce((s, i) => s + i.qtd, 0)
    })
    const historico = semanas.some((s) => s > 0) ? semanas : []
    const previsao = previsaoSextaSabado(historico, metaPorTamanho[tamanho])
    const disponivel = cad.sabores.reduce((s, sabor) => s + Math.max(0, estoque.get(chaveSaborTamanho(sabor.id, tamanho)) ?? 0), 0)
    return { tamanho, previsao, disponivel, semHistorico: !historico.length, ...reforco(previsao, disponivel, cad.pecasPorForma[tamanho]) }
  })

  return (
    <div className="space-y-3">
      {linhas.map((l) => (
        <div key={l.tamanho} className="rounded-deco border border-fio bg-carvao p-3">
          <div className="flex items-baseline justify-between">
            <span className="font-bold capitalize">{l.tamanho}</span>
            <span className={cx('text-lg font-bold', l.formas ? 'text-ambar' : 'text-verde')}>
              {l.formas ? `reforço: ${l.formas} ${l.formas === 1 ? 'forma' : 'formas'}` : 'estoque cobre'}
            </span>
          </div>
          <p className="text-[14px] text-cinza">
            Previsão sex + sáb: {numero(l.previsao)} · em estoque: {l.disponivel}
            {l.semHistorico && ' · sem histórico: 47% da meta da semana'}
          </p>
        </div>
      ))}
    </div>
  )
}

export function Estoque() {
  const sessao = useSessao()
  const cad = useCadastros()
  const hoje = useHoje(cad.config.horaViradaDia)
  const estoque = useEstoque(hoje)
  const nomeItem = useNomeItem()
  const [params] = useSearchParams()
  const [folha, setFolha] = useState<'contagem' | 'perda' | 'amostra' | null>(null)
  const podeLancar = sessao.papel !== 'mentor'
  const ehSegunda = diaSemanaIso(hoje) === 1

  useEffect(() => {
    if (params.get('ver') === 'previsao') document.getElementById('previsao')?.scrollIntoView()
  }, [params, estoque])

  const itens = useMemo(() => (estoque?.itens ?? [])
    .filter((i) => i.saldo !== 0 || i.lotes.length)
    .sort((a, b) => cad.sabores.findIndex((s) => s.id === a.saborId) - cad.sabores.findIndex((s) => s.id === b.saborId) || b.tamanho.localeCompare(a.tamanho)),
  [estoque, cad.sabores])

  if (!estoque) return null

  return (
    <Tela titulo="Estoque" subtitulo="A soma dos movimentos: ninguém edita o número">
      <section className="moldura grid grid-cols-3 gap-3 bg-carvao p-4">
        <Numero rotulo="Peças" valor={numero(estoque.total)} />
        <Numero rotulo="Vencendo" valor={estoque.vencendo.reduce((s, l) => s + l.saldo, 0)} tom={estoque.vencendo.length ? 'aviso' : undefined} />
        {veCustos(sessao.papel)
          ? <Numero rotulo="Sumiço no mês" valor={estoque.sumicoMes} tom={estoque.sumicoMes ? 'alerta' : 'ok'}
              detalhe={estoque.sumicoMes ? `≈ ${reais(estoque.sumicoMes * cad.precoMedioLoja)}` : undefined} />
          : <Numero rotulo="Vencidos" valor={estoque.vencidos.length} tom={estoque.vencidos.length ? 'alerta' : undefined} />}
      </section>

      {podeLancar && (
        <div className="grid grid-cols-3 gap-2">
          <Botao variante={ehSegunda ? 'primario' : 'secundario'} onClick={() => setFolha('contagem')}>Contar</Botao>
          <Botao variante="secundario" onClick={() => setFolha('perda')}>Perda</Botao>
          <Botao variante="secundario" onClick={() => setFolha('amostra')}>Amostra</Botao>
        </div>
      )}
      {ehSegunda && podeLancar && <Aviso tom="neutro">Segunda é dia de contagem: a diferença aparece como sumiço.</Aviso>}

      <Secao titulo="Por sabor e tamanho">
        {itens.length ? (
          <ul className="divide-y divide-fio border-y border-fio">
            {itens.map((i) => (
              <li key={chaveSaborTamanho(i.saborId, i.tamanho)} className="py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-bold">{nomeItem(i.saborId, i.tamanho)}</span>
                  <span className={cx('text-2xl font-bold', i.saldo < 0 && 'text-ambar')}>{i.saldo}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {i.lotes.map((l) => {
                    const vencido = estaVencido(l.lote.validadeAte, hoje)
                    return (
                      <span key={l.lote.id} className="flex items-center gap-1">
                        <Selo tom={vencido ? 'alerta' : l.dias <= 3 ? 'aviso' : 'neutro'}>
                          {l.saldo} · {vencido ? 'vencido' : `vence ${dataCurta(l.lote.validadeAte)}`}
                        </Selo>
                        {vencido && podeLancar && (
                          <button type="button" className="min-h-9 px-1 text-[13px] font-bold text-vermelho underline"
                            onClick={() => baixarLoteVencido(l.lote, l.saldo, { horaViradaDia: cad.config.horaViradaDia })
                              .then(() => mostrarToast(`${l.saldo} peças baixadas como perda por validade`)).catch(mostrarErro)}>
                            baixar perda
                          </button>
                        )}
                      </span>
                    )
                  })}
                  {i.saldo < 0 && <span className="text-[13px] text-ambar">vendido sem produção lançada</span>}
                </div>
              </li>
            ))}
          </ul>
        ) : <Vazio>Sem estoque. Lance a produção para gerar os lotes.</Vazio>}
      </Secao>

      <div id="previsao" className="scroll-mt-16">
        <Secao titulo="Previsão para sexta e sábado">
          <Previsao hoje={hoje} estoque={estoque.saldoItem} />
        </Secao>
      </div>

      <FolhaContagem aberta={folha === 'contagem'} aoFechar={() => setFolha(null)} estoque={estoque.saldoItem} />
      <FolhaPerda aberta={folha === 'perda'} aoFechar={() => setFolha(null)} />
      <FolhaAmostra aberta={folha === 'amostra'} aoFechar={() => setFolha(null)} hoje={hoje} />
    </Tela>
  )
}
