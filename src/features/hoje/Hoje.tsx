import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, MessageSquareQuote } from 'lucide-react'
import { useSessao, veCustos } from '@/lib/sessao'
import { useCadastros } from '@/lib/dados/cadastros'
import { useAgora, useHoje } from '@/lib/dados/consultas'
import { useChecklist, useEstoque, useNomeItem, useRecados, useRede, useResumoVendas } from '@/lib/dados/hooks'
import { montarAlertas, placar, somar } from '@/lib/dados/indicadores'
import { diaSemanaIso, horaLocal, inicioSemana, somarDias } from '@/lib/motor/dia'
import { dataCurta, DIAS_SEMANA, dataHora, numero, reais } from '@/lib/formato'
import { marcarRecadoLido } from '@/lib/operacoes/mentor'
import { Aviso, Botao, Numero } from '@/components/ui/basicos'
import { Secao, Tela } from '@/components/ui/Tela'
import { mostrarErro } from '@/components/ui/Toast'
import { ListaTarefas } from '@/features/checklist/ListaTarefas'
import { montarDia, tarefaDaHora } from '@/features/checklist/tarefas'
import { PlacarBarras } from '@/features/placar/PlacarBarras'

const MISSAO = ['', 'Produção de manhã, reunião da semana à tarde', 'Entrega nos pontos de manhã, feira à noite',
  'Captação de dia, rota à noite', 'Mensagens, gatilho de produção e reposição da rede',
  'Rota à noite: os melhores horários da semana', 'Rota até meia-noite', 'Folga']

function Recados() {
  const recados = useRecados()?.filter((r) => !r.lidoEm)
  if (!recados?.length) return null
  return (
    <div className="space-y-3">
      {recados.map((r) => (
        <div key={r.id} className="moldura bg-carvao p-4">
          <p className="rotulo mb-2 flex items-center gap-2"><MessageSquareQuote className="size-4" aria-hidden /> Recado do mentor · {dataHora(r.criadoEm)}</p>
          <p className="mb-3 whitespace-pre-line text-lg">{r.texto}</p>
          <Botao pequeno variante="secundario" onClick={() => marcarRecadoLido(r.id).catch(mostrarErro)}>Li o recado</Botao>
        </div>
      ))}
    </div>
  )
}

export function Hoje() {
  const sessao = useSessao()
  const cad = useCadastros()
  const hoje = useHoje(cad.config.horaViradaDia)
  const agora = useAgora()
  const segunda = inicioSemana(hoje)
  const vendasHoje = useResumoVendas(hoje, hoje)
  const vendasSemana = useResumoVendas(segunda, somarDias(segunda, 6))
  const checklist = useChecklist(hoje, hoje)
  const estoque = useEstoque(hoje)
  const gestao = veCustos(sessao.papel)
  const rede = useRede(hoje)
  const nomeItem = useNomeItem()

  const papelChecklist = sessao.papel === 'equipe' ? 'equipe' : 'dono'
  const linhas = useMemo(() => (checklist ? montarDia(checklist, hoje, papelChecklist, hoje) : []), [checklist, hoje, papelChecklist])
  const totalHoje = somar(vendasHoje ?? [])
  const alertas = estoque ? montarAlertas({
    estoque, rede: gestao ? rede?.resumos : undefined, sumico: gestao ? estoque.sumicoMes : 0,
    nomeItem, precoMedioLoja: cad.precoMedioLoja,
  }) : []
  const dia = diaSemanaIso(hoje)

  return (
    <Tela titulo={`${DIAS_SEMANA[dia]}, ${dataCurta(hoje)}`} subtitulo={MISSAO[dia]}>
      {sessao.papel === 'dono' && <Recados />}

      <section className="moldura grid grid-cols-3 gap-3 bg-carvao p-4" aria-label="Vendido hoje">
        <Numero rotulo="Peças hoje" valor={numero(totalHoje.pecas)} />
        <Numero rotulo="Vendido" valor={reais(totalHoje.bruto)} />
        {gestao
          ? <Numero rotulo="Lucro" valor={reais(totalHoje.lucro)} tom={totalHoje.lucro < 0 ? 'alerta' : undefined} />
          : <Numero rotulo="Vendas" valor={numero(totalHoje.vendas)} />}
      </section>

      <Secao titulo="Checklist do dia" direita={<Link to="/checklist" className="text-[13px] font-bold uppercase tracking-[0.08em] text-cinza">Semana</Link>}>
        {linhas.length
          ? <ListaTarefas linhas={linhas} data={hoje} destaque={tarefaDaHora(linhas, horaLocal(agora))} somenteLeitura={sessao.papel === 'mentor'} />
          : <p className="text-cinza">Nenhuma tarefa para hoje.</p>}
      </Secao>

      {gestao && vendasSemana && rede && (
        <Secao titulo="Placar da semana" direita={<Link to="/placar" aria-label="Abrir o placar"><ChevronRight className="size-5 text-cinza" /></Link>}>
          <PlacarBarras dados={placar(vendasSemana, rede.parceiros, cad)} />
        </Secao>
      )}

      <Secao titulo="Alertas">
        {alertas.length ? (
          <ul className="space-y-2">
            {alertas.map((a) => (
              <li key={a.texto}>
                {a.link ? <Link to={a.link} className="block"><Aviso tom={a.tom}>{a.texto}</Aviso></Link> : <Aviso tom={a.tom}>{a.texto}</Aviso>}
              </li>
            ))}
          </ul>
        ) : <Aviso tom="ok">Nada fora do lugar.</Aviso>}
      </Secao>
    </Tela>
  )
}
