import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { AlertTriangle, CircleCheck, Info, OctagonAlert } from 'lucide-react'
import { cx } from '@/lib/cx'

type Variante = 'primario' | 'secundario' | 'fantasma' | 'perigo' | 'ok'

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-osso text-tinta border border-osso',
  secundario: 'bg-transparent text-osso border border-osso',
  fantasma: 'bg-transparent text-osso border border-fio',
  perigo: 'bg-vermelho text-tinta border border-vermelho',
  ok: 'bg-verde text-tinta border border-verde',
}

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  bloco?: boolean
  pequeno?: boolean
}

export function Botao({ variante = 'primario', bloco, pequeno, className, type = 'button', ...props }: BotaoProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-deco font-bold tracking-[0.04em] select-none',
        'transition-transform duration-100 active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100',
        pequeno ? 'min-h-11 px-3 text-[15px]' : 'min-h-toque px-5 text-lg',
        VARIANTES[variante], bloco && 'w-full', className,
      )}
      {...props}
    />
  )
}

type Tom = 'ok' | 'alerta' | 'aviso' | 'neutro'

const TONS_SELO: Record<Tom, string> = {
  ok: 'text-verde border-verde/60',
  alerta: 'text-vermelho border-vermelho/60',
  aviso: 'text-ambar border-ambar/60',
  neutro: 'text-cinza border-fio',
}

export function Selo({ tom = 'neutro', children }: { tom?: Tom; children: ReactNode }) {
  return (
    <span className={cx('inline-flex items-center rounded-deco border px-1.5 py-0.5 text-[12px] font-bold uppercase tracking-[0.08em]', TONS_SELO[tom])}>
      {children}
    </span>
  )
}

const ICONES_AVISO = { ok: CircleCheck, alerta: OctagonAlert, aviso: AlertTriangle, neutro: Info }
const TONS_AVISO: Record<Tom, string> = {
  ok: 'border-verde text-verde',
  alerta: 'border-vermelho text-vermelho',
  aviso: 'border-ambar text-ambar',
  neutro: 'border-fio text-cinza',
}

export function Aviso({ tom = 'aviso', children, acao }: { tom?: Tom; children: ReactNode; acao?: ReactNode }) {
  const Icone = ICONES_AVISO[tom]
  return (
    <div role={tom === 'alerta' ? 'alert' : 'status'} className={cx('flex items-start gap-3 rounded-deco border-l-4 bg-carvao p-3', TONS_AVISO[tom])}>
      <Icone aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div className="flex-1 text-[15px] text-osso">{children}</div>
      {acao}
    </div>
  )
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="rounded-deco border border-dashed border-fio p-4 text-center text-[15px] text-cinza">{children}</p>
}

export function Numero({ rotulo, valor, detalhe, tom }: { rotulo: string; valor: ReactNode; detalhe?: ReactNode; tom?: Tom }) {
  const cor = tom === 'ok' ? 'text-verde' : tom === 'alerta' ? 'text-vermelho' : tom === 'aviso' ? 'text-ambar' : 'text-osso'
  return (
    <div className="min-w-0">
      <p className="rotulo">{rotulo}</p>
      <p className={cx('text-2xl font-bold leading-tight', cor)}>{valor}</p>
      {detalhe && <p className="text-[13px] text-cinza">{detalhe}</p>}
    </div>
  )
}

export function Barra({ valor, meta }: { valor: number; meta: number }) {
  const pct = meta > 0 ? Math.min(1, valor / meta) : 0
  return (
    <div className="h-2 w-full bg-fio" role="meter" aria-valuemin={0} aria-valuemax={meta} aria-valuenow={valor}>
      <div className={cx('h-full', valor >= meta && meta > 0 ? 'bg-verde' : 'bg-osso')} style={{ width: `${pct * 100}%` }} />
    </div>
  )
}

interface CampoProps extends InputHTMLAttributes<HTMLInputElement> {
  rotulo: string
  dica?: string
}

export function Campo({ rotulo, dica, className, ...props }: CampoProps) {
  return (
    <label className="block space-y-1">
      <span className="rotulo">{rotulo}</span>
      <input className={cx('campo', className)} {...props} />
      {dica && <span className="block text-[13px] text-cinza">{dica}</span>}
    </label>
  )
}

export function Escolha<T extends string | number>({ rotulo, opcoes, valor, aoMudar }: {
  rotulo?: string
  opcoes: Array<{ valor: T; rotulo: string }>
  valor: T
  aoMudar: (v: T) => void
}) {
  return (
    <fieldset className="space-y-1">
      {rotulo && <legend className="rotulo mb-1">{rotulo}</legend>}
      <div className="flex flex-wrap gap-2">
        {opcoes.map((o) => (
          <button
            key={String(o.valor)}
            type="button"
            aria-pressed={valor === o.valor}
            onClick={() => aoMudar(o.valor)}
            className={cx(
              'min-h-12 rounded-deco border px-4 font-bold transition-transform active:scale-[0.98]',
              valor === o.valor ? 'border-osso bg-osso text-tinta' : 'border-fio text-osso',
            )}
          >
            {o.rotulo}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
