import { useSyncExternalStore } from 'react'
import { cx } from '@/lib/cx'

interface Toast {
  id: number
  texto: string
  tom: 'ok' | 'alerta'
  acao?: { rotulo: string; fazer: () => void }
}

const DURACAO_MS = 6000
let atual: Toast | null = null
let seq = 0
const ouvintes = new Set<() => void>()
const avisar = () => ouvintes.forEach((f) => f())

export function mostrarToast(texto: string, opcoes: { tom?: Toast['tom']; acao?: Toast['acao'] } = {}) {
  const id = ++seq
  atual = { id, texto, tom: opcoes.tom ?? 'ok', acao: opcoes.acao }
  avisar()
  setTimeout(() => {
    if (atual?.id === id) {
      atual = null
      avisar()
    }
  }, DURACAO_MS)
}

export function mostrarErro(e: unknown) {
  mostrarToast(e instanceof Error ? e.message : String(e), { tom: 'alerta' })
}

export function Toasts() {
  const toast = useSyncExternalStore((f) => { ouvintes.add(f); return () => ouvintes.delete(f) }, () => atual)
  if (!toast) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4" aria-live="polite">
      <div className={cx(
        'pointer-events-auto flex w-full max-w-[30rem] items-center gap-3 rounded-deco border bg-grafite px-4 py-3',
        toast.tom === 'ok' ? 'border-verde' : 'border-vermelho',
      )}>
        <p className="flex-1 text-[15px]">{toast.texto}</p>
        {toast.acao && (
          <button
            type="button"
            className="min-h-11 shrink-0 px-2 font-bold uppercase tracking-[0.08em] underline underline-offset-4"
            onClick={() => {
              toast.acao!.fazer()
              atual = null
              avisar()
            }}
          >
            {toast.acao.rotulo}
          </button>
        )}
      </div>
    </div>
  )
}
