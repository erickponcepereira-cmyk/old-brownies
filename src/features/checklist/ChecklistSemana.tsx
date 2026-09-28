import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Pencil } from 'lucide-react'
import type { TipoTarefa } from '@/lib/db/tipos'
import { useSessao } from '@/lib/sessao'
import { cx } from '@/lib/cx'
import { useCadastros } from '@/lib/dados/cadastros'
import { useHoje } from '@/lib/dados/consultas'
import { useChecklist } from '@/lib/dados/hooks'
import { cumprimento } from '@/lib/motor/checklist'
import { inicioSemana, somarDias } from '@/lib/motor/dia'
import { dataCurta, DIAS_CURTOS, DIAS_SEMANA, pct } from '@/lib/formato'
import { Barra } from '@/components/ui/basicos'
import { Secao, Tela } from '@/components/ui/Tela'
import { ListaTarefas } from './ListaTarefas'
import { montarDia, type DadosChecklist, type LinhaTarefa } from './tarefas'

export const NOME_TIPO: Record<TipoTarefa, string> = {
  escola: 'Escola', rota: 'Rota', captacao: 'Captação', mensagem: 'Mensagens', operacao: 'Operação', feira: 'Feira', preparo: 'Preparo',
}

function diasDaSemana(segunda: string) {
  return Array.from({ length: 7 }, (_, i) => somarDias(segunda, i))
}

function linhasAteHoje(dados: DadosChecklist, dias: string[], papel: 'dono' | 'equipe', hoje: string, desde: string) {
  return dias.filter((d) => d >= desde && d <= hoje).flatMap((d) => montarDia(dados, d, papel, hoje).filter((l) => l.rotinaTarefaId))
}

const paraCumprimento = (l: LinhaTarefa) => ({ obrigatoria: l.obrigatoria, feita: l.status === 'feito' })

function Quadradinho({ linha, futuro }: { linha: LinhaTarefa; futuro: boolean }) {
  return (
    <span title={linha.titulo} className={cx(
      'block h-3 w-full rounded-[1px] border',
      linha.status === 'feito' && 'border-verde bg-verde',
      linha.status === 'pulado' && 'border-vermelho bg-vermelho/30',
      linha.status === 'pendente' && (futuro ? 'border-fio' : 'border-cinza'),
    )} />
  )
}

export function ChecklistSemana() {
  const sessao = useSessao()
  const cad = useCadastros()
  const hoje = useHoje(cad.config.horaViradaDia)
  const [segunda, setSegunda] = useState(() => inicioSemana(hoje))
  const [aberto, setAberto] = useState<string | null>(hoje)
  const dados = useChecklist(somarDias(segunda, -21), somarDias(segunda, 6))
  const papel = sessao.papel === 'equipe' ? 'equipe' : 'dono'
  const dias = diasDaSemana(segunda)

  const resumo = useMemo(() => {
    if (!dados) return null
    const porDia = dias.map((d) => ({ data: d, linhas: montarDia(dados, d, papel, hoje) }))
    const semana = linhasAteHoje(dados, dias, papel, hoje, cad.inicioUso)
    const quatro = [0, 7, 14, 21].flatMap((n) => linhasAteHoje(dados, diasDaSemana(somarDias(segunda, -n)), papel, hoje, cad.inicioUso))
    const tipos = [...new Set(quatro.filter((l) => l.obrigatoria).map((l) => l.tipo!))]
    return {
      porDia,
      semana: cumprimento(semana.map(paraCumprimento)),
      quatro: cumprimento(quatro.map(paraCumprimento)),
      porTipo: tipos.map((t) => ({ tipo: t, ...cumprimento(quatro.filter((l) => l.tipo === t).map(paraCumprimento)) })),
    }
  }, [dados, segunda, papel, hoje, cad.inicioUso]) // dias deriva de segunda

  return (
    <Tela titulo="Checklist da semana" subtitulo={`${dataCurta(segunda)} a ${dataCurta(somarDias(segunda, 6))}`}
      voltar={sessao.papel !== 'mentor'}
      acao={sessao.papel === 'dono' ? (
        <Link to="/checklist/editar" aria-label="Editar a rotina" className="flex size-12 items-center justify-center rounded-deco border border-fio">
          <Pencil className="size-5" />
        </Link>
      ) : undefined}
    >
      <div className="flex items-center justify-between">
        <button type="button" className="flex min-h-12 items-center gap-1 px-2 text-cinza" onClick={() => setSegunda(somarDias(segunda, -7))}>
          <ChevronLeft className="size-5" /> Anterior
        </button>
        {segunda !== inicioSemana(hoje) && (
          <button type="button" className="min-h-12 px-2 font-bold" onClick={() => setSegunda(inicioSemana(hoje))}>Esta semana</button>
        )}
        <button type="button" className="flex min-h-12 items-center gap-1 px-2 text-cinza" onClick={() => setSegunda(somarDias(segunda, 7))}>
          Próxima <ChevronRight className="size-5" />
        </button>
      </div>

      {resumo && (
        <>
          <section className="moldura grid grid-cols-2 gap-4 bg-carvao p-4">
            <div>
              <p className="rotulo">Na semana (até hoje)</p>
              <p className="text-3xl font-bold">{pct(resumo.semana.pct)}</p>
              <p className="text-[13px] text-cinza">{resumo.semana.feitas} de {resumo.semana.obrigatorias} obrigatórias</p>
            </div>
            <div>
              <p className="rotulo">Últimas 4 semanas</p>
              <p className="text-3xl font-bold">{pct(resumo.quatro.pct)}</p>
              <p className="text-[13px] text-cinza">{resumo.quatro.feitas} de {resumo.quatro.obrigatorias}</p>
            </div>
          </section>

          <div className="grid grid-cols-7 gap-1.5" aria-label="Grade da semana">
            {resumo.porDia.map(({ data, linhas }) => (
              <button key={data} type="button" onClick={() => setAberto(data)}
                className={cx('flex flex-col gap-1 rounded-deco border p-1.5 text-center', aberto === data ? 'border-osso' : 'border-fio', data === hoje && 'bg-carvao')}>
                <span className="text-[12px] font-bold uppercase">{DIAS_CURTOS[dias.indexOf(data) + 1]}</span>
                {linhas.filter((l) => l.rotinaTarefaId).map((l) => <Quadradinho key={l.chave} linha={l} futuro={data > hoje || data < cad.inicioUso} />)}
              </button>
            ))}
          </div>

          {aberto && (
            <Secao titulo={`${DIAS_SEMANA[dias.indexOf(aberto) + 1] ?? ''} ${dataCurta(aberto)}`}>
              {(() => {
                const linhas = resumo.porDia.find((d) => d.data === aberto)?.linhas ?? []
                return linhas.length
                  ? <ListaTarefas linhas={linhas} data={aberto} somenteLeitura={sessao.papel === 'mentor' || aberto > hoje} />
                  : <p className="text-cinza">Folga.</p>
              })()}
            </Secao>
          )}

          <Secao titulo="Cumprimento por tipo · 4 semanas">
            <div className="space-y-3">
              {resumo.porTipo.map((t) => (
                <div key={t.tipo}>
                  <div className="mb-1 flex justify-between"><span>{NOME_TIPO[t.tipo]}</span><strong>{pct(t.pct)}</strong></div>
                  <Barra valor={t.feitas} meta={t.obrigatorias} />
                </div>
              ))}
            </div>
          </Secao>
        </>
      )}
    </Tela>
  )
}
