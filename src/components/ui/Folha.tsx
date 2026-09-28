import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

// Formulário curto que sobe de baixo, sem trocar de tela. <dialog> dá foco preso e Esc de graça.
export function Folha({ aberta, aoFechar, titulo, children }: {
  aberta: boolean
  aoFechar: () => void
  titulo: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialogo = ref.current
    if (!dialogo) return
    if (aberta && !dialogo.open) dialogo.showModal()
    if (!aberta && dialogo.open) dialogo.close()
  }, [aberta])

  return (
    <dialog
      ref={ref}
      onClose={aoFechar}
      onClick={(e) => e.target === ref.current && aoFechar()}
      className="m-0 mt-auto mx-auto w-full max-w-[30rem] max-h-[88dvh] overflow-y-auto rounded-t-deco border-t border-osso bg-carvao p-0 text-osso backdrop:bg-black/70"
    >
      {aberta && (
        <div className="px-4 pb-8 pt-3">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold tracking-[0.04em]">{titulo}</h2>
            <button type="button" onClick={aoFechar} aria-label="Fechar" className="flex size-12 items-center justify-center rounded-deco active:bg-grafite">
              <X className="size-6" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}
