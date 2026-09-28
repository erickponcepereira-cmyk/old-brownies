import type { CodigoTamanho, Sabor } from '@/lib/db/tipos'
import { cx } from '@/lib/cx'
import { chaveSaborTamanho, distribuirPorPeso } from '@/lib/motor/estoque'
import { Stepper } from '@/components/ui/Stepper'

// Limão fica fora da revenda: só encomenda, e no grande a R$ 10 deixa só R$ 3,84.
export const saboresDeRevenda = (sabores: Sabor[]) => sabores.filter((s) => s.ativo && !s.soEncomenda)

export function mixSortido(total: number, sabores: Sabor[]): Record<string, number> {
  return distribuirPorPeso(total, saboresDeRevenda(sabores).map((s) => ({ id: s.id, peso: s.pesoMix })))
}

export function MixSabores({ total, mix, aoMudar, sabores, tamanho, estoque }: {
  total: number
  mix: Record<string, number>
  aoMudar: (m: Record<string, number>) => void
  sabores: Sabor[]
  tamanho: CodigoTamanho
  estoque?: Map<string, number>
}) {
  const soma = Object.values(mix).reduce((s, v) => s + v, 0)
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className={cx('text-[15px] font-bold', soma === total ? 'text-verde' : 'text-ambar')}>
          Mix: {soma} de {total}
        </span>
        <button type="button" className="min-h-11 px-2 text-[13px] font-bold uppercase tracking-[0.08em] text-cinza"
          onClick={() => aoMudar(mixSortido(total, sabores))}>
          sortido
        </button>
      </div>
      <ul className="divide-y divide-fio border-y border-fio">
        {saboresDeRevenda(sabores).map((s) => {
          const disponivel = estoque ? estoque.get(chaveSaborTamanho(s.id, tamanho)) ?? 0 : undefined
          return (
            <li key={s.id} className="flex items-center justify-between gap-2 py-1.5">
              <span className="min-w-0">
                <span className="block font-bold">{s.nome}</span>
                {disponivel !== undefined && (
                  <span className={cx('block text-[13px]', disponivel < (mix[s.id] ?? 0) ? 'text-ambar' : 'text-cinza')}>
                    {disponivel} no estoque
                  </span>
                )}
              </span>
              <Stepper compacto rotulo={s.nome} valor={mix[s.id] ?? 0} aoMudar={(v) => aoMudar({ ...mix, [s.id]: v })} />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
