import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Check, ChevronRight } from 'lucide-react'
import { useCadastros } from '@/lib/dados/cadastros'
import { useHoje } from '@/lib/dados/consultas'
import { useEstoque, useRede } from '@/lib/dados/hooks'
import type { ResumoParceiro } from '@/lib/dados/indicadores'
import { vendidoNoPonto } from '@/lib/motor/rede'
import { dataCurta, pct, reais } from '@/lib/formato'
import { registrarVisita } from '@/lib/operacoes/rede'
import { Aviso, Botao, Numero, Selo, Vazio } from '@/components/ui/basicos'
import { Stepper } from '@/components/ui/Stepper'
import { Secao, Tela } from '@/components/ui/Tela'
import { mostrarErro, mostrarToast } from '@/components/ui/Toast'
import { MixSabores, mixSortido } from '@/features/repasse/MixSabores'

function Passo({ n, titulo, detalhe, children }: { n: number; titulo: string; detalhe?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-fio py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-deco border border-osso font-titulo font-bold">{n}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{titulo}</span>
        {detalhe && <span className="block text-[13px] text-cinza">{detalhe}</span>}
      </span>
      {children}
    </div>
  )
}

function FormVisita({ resumo, aoTerminar }: { resumo: ResumoParceiro; aoTerminar: () => void }) {
  const cad = useCadastros()
  const hoje = useHoje(cad.config.horaViradaDia)
  const estoque = useEstoque(hoje)
  const ponto = resumo.ponto!
  const [contado, setContado] = useState(ponto.estoqueEstimado)
  const [trocado, setTrocado] = useState(0)
  const [caixas, setCaixas] = useState(0)
  const [mix, setMix] = useState<Record<string, number>>({})
  const [enviando, setEnviando] = useState(false)
  useEffect(() => setMix(mixSortido(caixas * 24, cad.sabores)), [caixas, cad.sabores])

  const precoPonto = cad.canal('ponto').precoPadrao ?? 10
  const vendido = vendidoNoPonto(ponto.estoqueEstimado, 0, contado)
  const somaMix = Object.values(mix).reduce((s, v) => s + v, 0)

  async function registrar() {
    setEnviando(true)
    try {
      await registrarVisita(
        { parceiroId: resumo.parceiro.id, contado, trocado, compra: caixas ? mix : {}, precoPonto, custoGrande: (id) => cad.tabela.variavel[id]?.grande ?? 0 },
        { horaViradaDia: cad.config.horaViradaDia, produtoPorId: cad.produtoPorId, diasMinimos: cad.config.diasMaxNoPonto,
          diasMaxNoPonto: cad.config.diasMaxNoPonto, saborPadrao: cad.sabores[0]?.id ?? '' },
      )
      mostrarToast(`Visita a ${resumo.parceiro.nome} registrada${caixas ? ` · ${reais(somaMix * precoPonto)} no Pix` : ''}`)
      aoTerminar()
    } catch (e) {
      mostrarErro(e)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <section className="grid grid-cols-3 gap-3">
        <Numero rotulo="No ponto" valor={ponto.estoqueEstimado} detalhe="pelo sistema" />
        <Numero rotulo="Troca 4 sem." valor={pct(ponto.trocaPct4)} tom={(ponto.trocaPct4 ?? 0) > 0.2 ? 'aviso' : undefined} />
        <Numero rotulo="Fim do teste" valor={ponto.diasFimTeste === null ? '—' : ponto.diasFimTeste < 0 ? 'passou' : `${ponto.diasFimTeste} d`} />
      </section>

      <div className="border-t border-fio">
        <Passo n={1} titulo="Contado no balcão" detalhe={`Vendeu ${vendido} desde a última visita`}>
          <Stepper rotulo="contado" valor={contado} aoMudar={(v) => { setContado(v); setTrocado(Math.min(trocado, v)) }} />
        </Passo>
        <Passo n={2} titulo="Trocar" detalhe="Voltam para a loja, mesmo lote">
          <Stepper rotulo="trocados" valor={trocado} max={contado} aoMudar={setTrocado} />
        </Passo>
        <Passo n={3} titulo="Repor sem custo" detalhe="Brownie novo no lugar dos trocados">
          <span className="min-w-14 text-center text-2xl font-bold">{trocado}</span>
        </Passo>
        <Passo n={4} titulo="Comprou mais?" detalhe="Caixa de 24, no Pix">
          <Stepper rotulo="caixas" valor={caixas} max={10} aoMudar={setCaixas} />
        </Passo>
      </div>

      {caixas > 0 && (
        <MixSabores total={caixas * 24} mix={mix} aoMudar={setMix} sabores={cad.sabores} tamanho="grande" estoque={estoque?.saldoItem} />
      )}

      <Botao bloco variante="ok" disabled={enviando || (caixas > 0 && somaMix !== caixas * 24)} onClick={registrar}>
        <Check className="size-5" aria-hidden />
        {caixas ? `Registrar visita + ${reais(somaMix * precoPonto)} no Pix` : 'Registrar visita'}
      </Botao>
    </>
  )
}

export function VisitaPonto() {
  const cad = useCadastros()
  const hoje = useHoje(cad.config.horaViradaDia)
  const rede = useRede(hoje)
  const [params, setParams] = useSearchParams()
  const pontoId = params.get('ponto')
  const pontos = [...(rede?.resumos.values() ?? [])].filter((r) => r.ponto && ['ativo', 'teste'].includes(r.parceiro.status))
  const escolhido = pontoId ? rede?.resumos.get(pontoId) : undefined

  if (escolhido?.ponto) {
    return (
      <Tela titulo={escolhido.parceiro.nome} voltar subtitulo={`Visita · próxima em ${escolhido.ponto.proximaVisita ? dataCurta(escolhido.ponto.proximaVisita) : '—'}`}>
        <FormVisita key={escolhido.parceiro.id} resumo={escolhido} aoTerminar={() => setParams({}, { replace: true })} />
      </Tela>
    )
  }

  return (
    <Tela titulo="Visita ao ponto" voltar subtitulo="Contar, trocar, repor e receber numa tela só">
      {pontos.length ? (
        <Secao titulo="Qual ponto">
          <ul className="space-y-2">
            {pontos.sort((a, b) => (b.ponto!.diasSemVisita ?? 0) - (a.ponto!.diasSemVisita ?? 0)).map((r) => (
              <li key={r.parceiro.id}>
                <button type="button" onClick={() => setParams({ ponto: r.parceiro.id })}
                  className="flex min-h-16 w-full items-center gap-3 rounded-deco border border-fio bg-carvao px-4 text-left active:scale-[0.99]">
                  <span className="flex-1">
                    <span className="block font-bold">{r.parceiro.nome}</span>
                    <span className="block text-[13px] text-cinza">
                      {r.ponto!.ultimaVisita ? `última visita há ${r.ponto!.diasSemVisita} dias` : 'nenhuma visita ainda'} · {r.ponto!.estoqueEstimado} no balcão
                    </span>
                  </span>
                  {r.ponto!.semVisita && <Selo tom="aviso">atrasada</Selo>}
                  <ChevronRight className="size-5 text-cinza" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </Secao>
      ) : (
        <Vazio>Nenhum ponto ativo ou em teste. <Link className="underline" to="/rede?aba=ponto">Cadastrar na Rede</Link>.</Vazio>
      )}
      <Aviso tom="neutro">No ponto, o estoque nunca passa de {cad.config.diasMaxNoPonto} dias: visita semanal e troca sem custo.</Aviso>
    </Tela>
  )
}
