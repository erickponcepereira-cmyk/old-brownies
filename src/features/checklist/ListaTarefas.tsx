import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Check, X } from 'lucide-react'
import { cx } from '@/lib/cx'
import { marcar } from '@/lib/operacoes/checklist'
import { Botao, Selo } from '@/components/ui/basicos'
import { Folha } from '@/components/ui/Folha'
import { mostrarErro } from '@/components/ui/Toast'
import { ATALHOS, type LinhaTarefa } from './tarefas'

const SEGURAR_MS = 550

// Um toque marca feito; segurar marca pulado (com nota opcional).
function useToqueOuSegurar(aoTocar: () => void, aoSegurar: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const segurou = useRef(false)
  const cancelar = () => clearTimeout(timer.current)
  return {
    onPointerDown: () => {
      segurou.current = false
      timer.current = setTimeout(() => { segurou.current = true; aoSegurar() }, SEGURAR_MS)
    },
    onPointerUp: cancelar,
    onPointerLeave: cancelar,
    onPointerCancel: cancelar,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onClick: () => { if (!segurou.current) aoTocar() },
  }
}

function Caixa({ status }: { status: LinhaTarefa['status'] }) {
  return (
    <span className={cx(
      'flex size-8 shrink-0 items-center justify-center rounded-deco border-2',
      status === 'feito' && 'border-verde bg-verde text-tinta',
      status === 'pulado' && 'border-vermelho text-vermelho',
      status === 'pendente' && 'border-cinza',
    )} aria-hidden>
      {status === 'feito' && <Check className="size-5" strokeWidth={3} />}
      {status === 'pulado' && <X className="size-5" strokeWidth={3} />}
    </span>
  )
}

function Linha({ linha, data, destaque, somenteLeitura, aoPular }: {
  linha: LinhaTarefa
  data: string
  destaque: boolean
  somenteLeitura: boolean
  aoPular: (l: LinhaTarefa) => void
}) {
  const alternarFeito = () => marcar({ data, rotinaTarefaId: linha.rotinaTarefaId, tarefaAvulsaId: linha.tarefaAvulsaId, status: 'feito' }, linha.item).catch(mostrarErro)
  const gestos = useToqueOuSegurar(alternarFeito, () => aoPular(linha))
  const atalho = linha.atalho ? ATALHOS[linha.atalho] : undefined
  const rotuloStatus = linha.status === 'feito' ? 'feita' : linha.status === 'pulado' ? 'pulada' : 'pendente'

  return (
    <li className={cx('flex items-stretch gap-2 border-b border-fio', destaque && 'border-l-4 border-l-osso bg-carvao')}>
      <button
        type="button"
        disabled={somenteLeitura}
        aria-label={`${linha.titulo}, ${rotuloStatus}. ${linha.status === 'pendente' ? 'Toque para marcar feita' : 'Toque para desmarcar'}; segure para pular.`}
        className="flex min-h-16 flex-1 select-none items-start gap-3 px-2 py-3 text-left active:bg-grafite disabled:active:bg-transparent"
        {...(somenteLeitura ? {} : gestos)}
      >
        <Caixa status={linha.status} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            {linha.inicio && <span className="text-[13px] text-cinza">{linha.inicio}–{linha.fim}</span>}
            {destaque && <Selo tom="ok">agora</Selo>}
            {linha.origem === 'mentor' && <Selo tom="aviso">do mentor</Selo>}
            {linha.origem === 'sistema' && <Selo>avulsa</Selo>}
            {linha.obrigatoria && <span className="sr-only">obrigatória</span>}
          </span>
          <span className={cx('block font-bold', linha.status !== 'pendente' && 'text-cinza')}>{linha.titulo}</span>
          {linha.detalhe && <span className="block text-[14px] text-cinza">{linha.detalhe}</span>}
          {linha.item?.nota && <span className="block text-[14px] text-vermelho">Nota: {linha.item.nota}</span>}
        </span>
      </button>
      {atalho?.para && (
        <Link to={atalho.para} aria-label={atalho.rotulo} title={atalho.rotulo}
          className="flex w-14 shrink-0 items-center justify-center text-cinza active:bg-grafite">
          <ArrowUpRight className="size-6" />
        </Link>
      )}
    </li>
  )
}

export function ListaTarefas({ linhas, data, destaque, somenteLeitura = false }: {
  linhas: LinhaTarefa[]
  data: string
  destaque?: string
  somenteLeitura?: boolean
}) {
  const [pulando, setPulando] = useState<LinhaTarefa | null>(null)
  const [nota, setNota] = useState('')

  async function pular() {
    if (!pulando) return
    try {
      await marcar({ data, rotinaTarefaId: pulando.rotinaTarefaId, tarefaAvulsaId: pulando.tarefaAvulsaId, status: 'pulado', nota: nota.trim() || '' }, pulando.item)
    } catch (e) {
      mostrarErro(e)
    }
    setPulando(null)
    setNota('')
  }

  return (
    <>
      <ul className="border-t border-fio">
        {linhas.map((l) => (
          <Linha key={l.chave} linha={l} data={data} destaque={destaque === l.chave} somenteLeitura={somenteLeitura} aoPular={setPulando} />
        ))}
      </ul>
      <Folha aberta={!!pulando} aoFechar={() => setPulando(null)} titulo="Pular tarefa">
        <p className="mb-3 font-bold">{pulando?.titulo}</p>
        <label className="block space-y-1">
          <span className="rotulo">Por quê? (opcional)</span>
          <textarea className="campo min-h-24 py-2" value={nota} onChange={(e) => setNota(e.target.value)} />
        </label>
        <div className="mt-4 grid gap-3">
          <Botao variante="perigo" bloco onClick={pular}>Marcar como pulada</Botao>
          {pulando?.status !== 'pendente' && (
            <Botao variante="fantasma" bloco onClick={() => {
              marcar({ data, rotinaTarefaId: pulando!.rotinaTarefaId, tarefaAvulsaId: pulando!.tarefaAvulsaId, status: pulando!.status as 'feito' | 'pulado' }, pulando!.item).catch(mostrarErro)
              setPulando(null)
            }}>Voltar para pendente</Botao>
          )}
        </div>
      </Folha>
    </>
  )
}
