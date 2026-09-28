import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { RotinaTarefa, TipoTarefa } from '@/lib/db/tipos'
import { useCadastros } from '@/lib/dados/cadastros'
import { useHoje } from '@/lib/dados/consultas'
import { useChecklist } from '@/lib/dados/hooks'
import { rotinaDoDia } from '@/lib/motor/checklist'
import { inicioSemana, somarDias } from '@/lib/motor/dia'
import { dataCurta, DIAS_SEMANA } from '@/lib/formato'
import { desativarRotina, salvarRotina, type CamposRotina } from '@/lib/operacoes/checklist'
import { Aviso, Botao, Campo, Escolha, Selo } from '@/components/ui/basicos'
import { Folha } from '@/components/ui/Folha'
import { Secao, Tela } from '@/components/ui/Tela'
import { mostrarErro, mostrarToast } from '@/components/ui/Toast'
import { NOME_TIPO } from './ChecklistSemana'
import { ATALHOS } from './tarefas'

const VAZIA = (diaSemana: number): CamposRotina => ({
  diaSemana, inicio: '09:00', fim: '10:00', titulo: '', detalhe: '', tipo: 'operacao', obrigatoria: true, atalho: undefined, papel: 'dono',
})

const camposDe = (t: RotinaTarefa): CamposRotina => ({
  diaSemana: t.diaSemana, inicio: t.inicio, fim: t.fim, titulo: t.titulo, detalhe: t.detalhe,
  tipo: t.tipo, obrigatoria: t.obrigatoria, atalho: t.atalho, papel: t.papel,
})

function FormTarefa({ inicial, aoSalvar, aoDesativar }: {
  inicial: CamposRotina
  aoSalvar: (c: CamposRotina) => void
  aoDesativar?: () => void
}) {
  const [c, setC] = useState(inicial)
  const mudar = <K extends keyof CamposRotina>(k: K, v: CamposRotina[K]) => setC({ ...c, [k]: v })
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); aoSalvar(c) }}>
      <Campo rotulo="Tarefa" required value={c.titulo} onChange={(e) => mudar('titulo', e.target.value)} />
      <Campo rotulo="Detalhe" value={c.detalhe} onChange={(e) => mudar('detalhe', e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Início" type="time" required value={c.inicio} onChange={(e) => mudar('inicio', e.target.value)} />
        <Campo rotulo="Fim" type="time" required value={c.fim} onChange={(e) => mudar('fim', e.target.value)} />
      </div>
      <label className="block space-y-1">
        <span className="rotulo">Dia</span>
        <select className="campo" value={c.diaSemana} onChange={(e) => mudar('diaSemana', Number(e.target.value))}>
          {DIAS_SEMANA.slice(1).map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="rotulo">Tipo</span>
        <select className="campo" value={c.tipo} onChange={(e) => mudar('tipo', e.target.value as TipoTarefa)}>
          {Object.entries(NOME_TIPO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="rotulo">Atalho no app</span>
        <select className="campo" value={c.atalho ?? ''} onChange={(e) => mudar('atalho', e.target.value || undefined)}>
          <option value="">Nenhum</option>
          {Object.entries(ATALHOS).map(([v, a]) => <option key={v} value={v}>{a.rotulo}</option>)}
        </select>
      </label>
      <Escolha rotulo="De quem" valor={c.papel} aoMudar={(v) => mudar('papel', v)}
        opcoes={[{ valor: 'dono', rotulo: 'Dono' }, { valor: 'equipe', rotulo: 'Equipe' }]} />
      <Escolha rotulo="Obrigatória" valor={c.obrigatoria ? 'sim' : 'nao'} aoMudar={(v) => mudar('obrigatoria', v === 'sim')}
        opcoes={[{ valor: 'sim', rotulo: 'Sim' }, { valor: 'nao', rotulo: 'Não' }]} />
      <Botao type="submit" bloco>Salvar</Botao>
      {aoDesativar && <Botao variante="fantasma" bloco onClick={aoDesativar}>Tirar da rotina</Botao>}
    </form>
  )
}

export function EditarRotina() {
  const cad = useCadastros()
  const hoje = useHoje(cad.config.horaViradaDia)
  const proxima = somarDias(inicioSemana(hoje), 7)
  const dados = useChecklist(hoje, hoje)
  const [editando, setEditando] = useState<{ tarefa: RotinaTarefa | null; campos: CamposRotina } | null>(null)

  async function salvar(campos: CamposRotina) {
    try {
      await salvarRotina(editando?.tarefa ?? null, campos, hoje)
      mostrarToast(`Salvo. Vale a partir de ${dataCurta(proxima)}.`)
      setEditando(null)
    } catch (e) {
      mostrarErro(e)
    }
  }

  return (
    <Tela titulo="Editar a rotina" voltar subtitulo={`Alterações valem da semana que começa em ${dataCurta(proxima)}.`}>
      <Aviso tom="neutro">O que já foi marcado nas semanas anteriores não muda.</Aviso>
      {dados && Array.from({ length: 7 }, (_, i) => {
        const data = somarDias(proxima, i)
        const tarefas = rotinaDoDia(dados.rotina, data)
        return (
          <Secao key={data} titulo={DIAS_SEMANA[i + 1]} direita={
            <button type="button" aria-label={`Nova tarefa na ${DIAS_SEMANA[i + 1]}`} className="flex size-11 items-center justify-center"
              onClick={() => setEditando({ tarefa: null, campos: VAZIA(i + 1) })}>
              <Plus className="size-5" />
            </button>
          }>
            <ul className="border-t border-fio">
              {tarefas.map((t) => (
                <li key={t.id} className="border-b border-fio">
                  <button type="button" className="flex min-h-14 w-full items-center gap-3 px-1 py-2 text-left active:bg-grafite"
                    onClick={() => setEditando({ tarefa: t, campos: camposDe(t) })}>
                    <span className="w-24 shrink-0 text-[13px] text-cinza">{t.inicio}–{t.fim}</span>
                    <span className="flex-1 font-bold">{t.titulo}</span>
                    {t.papel === 'equipe' && <Selo>equipe</Selo>}
                    {t.validaDe && t.validaDe > hoje && <Selo tom="aviso">nova</Selo>}
                    {!t.obrigatoria && <Selo>opcional</Selo>}
                  </button>
                </li>
              ))}
              {!tarefas.length && <li className="py-3 text-cinza">Folga.</li>}
            </ul>
          </Secao>
        )
      })}
      <Folha aberta={!!editando} aoFechar={() => setEditando(null)} titulo={editando?.tarefa ? 'Editar tarefa' : 'Nova tarefa'}>
        {editando && (
          <FormTarefa
            key={editando.tarefa?.id ?? 'nova'}
            inicial={editando.campos}
            aoSalvar={salvar}
            aoDesativar={editando.tarefa ? () => {
              desativarRotina(editando.tarefa!, hoje).then(() => setEditando(null)).catch(mostrarErro)
            } : undefined}
          />
        )}
      </Folha>
    </Tela>
  )
}
