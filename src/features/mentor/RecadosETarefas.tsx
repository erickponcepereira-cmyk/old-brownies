import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useSessao } from '@/lib/sessao'
import { lerDaEmpresa } from '@/lib/dados/consultas'
import { useRecados } from '@/lib/dados/hooks'
import { dataCurta, dataHora } from '@/lib/formato'
import { criarTarefaMentor, enviarRecado, excluirTarefaMentor } from '@/lib/operacoes/mentor'
import { Abas } from '@/components/ui/Abas'
import { Botao, Campo, Selo, Vazio } from '@/components/ui/basicos'
import { Secao } from '@/components/ui/Tela'
import { mostrarErro, mostrarToast } from '@/components/ui/Toast'

export function RecadosETarefas({ hoje }: { hoje: string }) {
  const { empresaId } = useSessao()
  const recados = useRecados()
  const tarefas = useLiveQuery(async () => (await lerDaEmpresa('tarefasAvulsas', empresaId))
    .filter((t) => t.origem === 'mentor').sort((a, b) => b.data.localeCompare(a.data)), [empresaId])
  const [aba, setAba] = useState<'recado' | 'tarefa'>('recado')
  const [texto, setTexto] = useState('')
  const [titulo, setTitulo] = useState('')
  const [detalhe, setDetalhe] = useState('')
  const [data, setData] = useState(hoje)

  async function enviar() {
    try {
      if (aba === 'recado') {
        await enviarRecado(texto.trim())
        setTexto('')
        mostrarToast('Recado enviado: aparece no Hoje do dono até ser lido')
      } else {
        await criarTarefaMentor({ titulo: titulo.trim(), detalhe: detalhe.trim(), data })
        setTitulo('')
        setDetalhe('')
        mostrarToast(`Tarefa criada para ${dataCurta(data)}`)
      }
    } catch (e) {
      mostrarErro(e)
    }
  }

  return (
    <Secao titulo="Recados e tarefas">
      <Abas abas={[{ valor: 'recado', rotulo: 'Recado' }, { valor: 'tarefa', rotulo: 'Tarefa com data' }]} ativa={aba} aoMudar={setAba} />
      <form className="mt-3 space-y-3" onSubmit={(e) => { e.preventDefault(); void enviar() }}>
        {aba === 'recado' ? (
          <label className="block space-y-1">
            <span className="rotulo">Recado para o Hoje do dono</span>
            <textarea className="campo min-h-24 py-2" required value={texto} onChange={(e) => setTexto(e.target.value)} />
          </label>
        ) : (
          <>
            <Campo rotulo="Tarefa" required value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            <Campo rotulo="Detalhe" value={detalhe} onChange={(e) => setDetalhe(e.target.value)} />
            <Campo rotulo="A partir de" type="date" required value={data} onChange={(e) => setData(e.target.value)} />
          </>
        )}
        <Botao type="submit" bloco>{aba === 'recado' ? 'Enviar recado' : 'Criar tarefa'}</Botao>
      </form>

      <div className="mt-5 space-y-2">
        {aba === 'recado' && (recados?.length ? recados.map((r) => (
          <div key={r.id} className="rounded-deco border border-fio bg-carvao p-3">
            <p className="whitespace-pre-line">{r.texto}</p>
            <p className="mt-1 text-[13px] text-cinza">
              enviado {dataHora(r.criadoEm)} · {r.lidoEm ? <span className="text-verde">lido {dataHora(r.lidoEm)}</span> : 'ainda não lido'}
            </p>
          </div>
        )) : <Vazio>Nenhum recado ainda.</Vazio>)}

        {aba === 'tarefa' && (tarefas?.length ? tarefas.map((t) => (
          <div key={t.id} className="flex items-start gap-3 rounded-deco border border-fio bg-carvao p-3">
            <div className="flex-1">
              <p className="font-bold">{t.titulo}</p>
              {t.detalhe && <p className="text-[14px] text-cinza">{t.detalhe}</p>}
              <p className="mt-1 text-[13px] text-cinza">
                desde {dataCurta(t.data)} · {t.feitaEm ? <span className="text-verde">feita {dataHora(t.feitaEm)}</span> : 'pendente'}
              </p>
            </div>
            {t.feitaEm ? <Selo tom="ok">feita</Selo> : (
              <button type="button" className="min-h-11 px-2 text-[13px] text-cinza underline" onClick={() => excluirTarefaMentor(t.id).catch(mostrarErro)}>
                retirar
              </button>
            )}
          </div>
        )) : <Vazio>Nenhuma tarefa do mentor.</Vazio>)}
      </div>
    </Secao>
  )
}
