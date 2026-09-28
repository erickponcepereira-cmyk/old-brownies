import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { CodigoTamanho } from '@/lib/db/tipos'
import { useSessao, veCustos } from '@/lib/sessao'
import { useCadastros } from '@/lib/dados/cadastros'
import { lerDaEmpresa, useHoje } from '@/lib/dados/consultas'
import { dataCurta, numero, reais } from '@/lib/formato'
import { registrarProducao } from '@/lib/operacoes/estoque'
import { Botao, Campo, Numero } from '@/components/ui/basicos'
import { Stepper } from '@/components/ui/Stepper'
import { Secao, Tela } from '@/components/ui/Tela'
import { mostrarErro, mostrarToast } from '@/components/ui/Toast'

type Formas = Record<string, number> // chave: saborId|tamanho

function Historico() {
  const { empresaId } = useSessao()
  const cad = useCadastros()
  const dados = useLiveQuery(async () => {
    const [producoes, itens] = await Promise.all([lerDaEmpresa('producoes', empresaId), lerDaEmpresa('producaoItens', empresaId)])
    return producoes.sort((a, b) => b.data.localeCompare(a.data)).slice(0, 8)
      .map((p) => ({ producao: p, itens: itens.filter((i) => i.producaoId === p.id) }))
  }, [empresaId])
  if (!dados?.length) return <p className="text-cinza">Nenhuma produção lançada ainda.</p>
  return (
    <ul className="divide-y divide-fio border-y border-fio">
      {dados.map(({ producao, itens }) => (
        <li key={producao.id} className="py-3">
          <p className="font-bold">{dataCurta(producao.data)} · {producao.responsavel}</p>
          <p className="text-[14px] text-cinza">
            {itens.map((i) => `${cad.saborPorId.get(i.saborId)?.nome} ${i.tamanho} × ${i.formas}`).join(' · ')}
          </p>
        </li>
      ))}
    </ul>
  )
}

export function Producao() {
  const sessao = useSessao()
  const cad = useCadastros()
  const hoje = useHoje(cad.config.horaViradaDia)
  const [data, setData] = useState(hoje)
  const [responsavel, setResponsavel] = useState('Maria Eduarda')
  const [diaria, setDiaria] = useState(String(cad.config.diariaProducao))
  const [formas, setFormas] = useState<Formas>({})
  const [enviando, setEnviando] = useState(false)
  const podeLancar = sessao.papel !== 'mentor'

  const resumo = useMemo(() => {
    const itens = Object.entries(formas).filter(([, f]) => f > 0).map(([chave, f]) => {
      const [saborId, tamanho] = chave.split('|') as [string, CodigoTamanho]
      return { saborId, tamanho, formas: f }
    })
    const totalFormas = itens.reduce((s, i) => s + i.formas, 0)
    const pecas = itens.reduce((s, i) => s + i.formas * cad.pecasPorForma[i.tamanho], 0)
    const gasPorForma = cad.config.gasMesReferencia / (cad.config.formasReferencia * cad.config.semanasPorMes)
    const jornadas = Math.max(1, Math.ceil(totalFormas / cad.config.capacidadeJornada))
    const custo = (Number(diaria.replace(',', '.')) || 0) + gasPorForma * totalFormas
    return { itens, totalFormas, pecas, jornadas, custo }
  }, [formas, diaria, cad])

  async function lancar() {
    setEnviando(true)
    try {
      await registrarProducao(
        { data, responsavel, diariaPaga: Number(diaria.replace(',', '.')) || 0, itens: resumo.itens },
        { horaViradaDia: cad.config.horaViradaDia, sabores: cad.saborPorId, pecasPorForma: cad.pecasPorForma },
      )
      mostrarToast(`Produção lançada: ${resumo.pecas} peças em ${resumo.itens.length} ${resumo.itens.length === 1 ? 'lote' : 'lotes'}`)
      setFormas({})
    } catch (e) {
      mostrarErro(e)
    } finally {
      setEnviando(false)
    }
  }

  const passo = (saborId: string, tamanho: CodigoTamanho) => {
    const chave = `${saborId}|${tamanho}`
    return <Stepper compacto rotulo={`formas de ${cad.saborPorId.get(saborId)?.nome} ${tamanho}`} valor={formas[chave] ?? 0} max={cad.config.capacidadeJornada}
      aoMudar={(v) => setFormas({ ...formas, [chave]: v })} />
  }

  return (
    <Tela titulo="Produção" voltar={sessao.papel === 'dono'} subtitulo="Cada sabor e tamanho vira um lote com validade">
      {podeLancar && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            <Campo rotulo="Diária paga" inputMode="decimal" value={diaria} onChange={(e) => setDiaria(e.target.value)} />
          </div>
          <Campo rotulo="Quem produziu" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />

          <Secao titulo="Formas por sabor">
            <ul className="divide-y divide-fio border-y border-fio">
              {cad.sabores.filter((s) => s.ativo).map((s) => (
                <li key={s.id} className="py-3">
                  <p className="mb-2 font-bold leading-tight">
                    {s.nome} <span className="text-[13px] font-semibold text-cinza">· validade {s.validadeDias} dias</span>
                  </p>
                  <div className="flex flex-wrap justify-between gap-2">
                    <div><span className="rotulo block">Pequeno · 35</span>{passo(s.id, 'pequeno')}</div>
                    <div><span className="rotulo block">Grande · 24</span>{passo(s.id, 'grande')}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Secao>

          <section className="moldura grid grid-cols-3 gap-3 bg-carvao p-4">
            <Numero rotulo="Formas" valor={resumo.totalFormas} detalhe={`${resumo.jornadas} jornada${resumo.jornadas > 1 ? 's' : ''}`} />
            <Numero rotulo="Peças" valor={numero(resumo.pecas)} />
            {veCustos(sessao.papel)
              ? <Numero rotulo="Custo jornada" valor={reais(resumo.custo)} detalhe={resumo.pecas ? `${reais(resumo.custo / resumo.pecas)} por peça` : 'diária + gás'} />
              : <Numero rotulo="Lotes" valor={resumo.itens.length} />}
          </section>
          {resumo.totalFormas > cad.config.capacidadeJornada && (
            <p className="text-[14px] text-ambar">Acima de {cad.config.capacidadeJornada} formas: precisa de uma segunda jornada (e outra diária).</p>
          )}
          <Botao bloco disabled={!resumo.totalFormas || enviando} onClick={lancar}>Lançar produção</Botao>
        </>
      )}
      <Secao titulo="Últimas produções"><Historico /></Secao>
    </Tela>
  )
}
