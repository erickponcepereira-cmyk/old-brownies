import { cx } from '@/lib/cx'

export function Abas<T extends string>({ abas, ativa, aoMudar }: {
  abas: Array<{ valor: T; rotulo: string; contagem?: number }>
  ativa: T
  aoMudar: (v: T) => void
}) {
  return (
    <div role="tablist" className="flex border-b border-fio">
      {abas.map((a) => (
        <button
          key={a.valor}
          type="button"
          role="tab"
          aria-selected={ativa === a.valor}
          onClick={() => aoMudar(a.valor)}
          className={cx(
            '-mb-px min-h-12 flex-1 border-b-2 px-2 text-[15px] font-bold',
            ativa === a.valor ? 'border-osso text-osso' : 'border-transparent text-cinza',
          )}
        >
          {a.rotulo}
          {a.contagem !== undefined && <span className="ml-1 text-cinza">{a.contagem}</span>}
        </button>
      ))}
    </div>
  )
}
