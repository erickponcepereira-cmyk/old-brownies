import type { placar } from '@/lib/dados/indicadores'
import { META_REDE_COMPLETA } from '@/lib/db/sementes'
import { numero } from '@/lib/formato'
import { Barra } from '@/components/ui/basicos'

export const NOME_CANAL: Record<string, string> = {
  loja: 'Loja', vendedor: 'Vendedores', motorista: 'Motoristas', ponto: 'Pontos',
  rota: 'Rota', feira: 'Feira', evento: 'Evento', ifood: 'iFood',
}

export function PlacarBarras({ dados, anterior }: { dados: ReturnType<typeof placar>; anterior?: ReturnType<typeof placar> }) {
  return (
    <div className="space-y-4">
      {dados.linhas.map((l) => {
        const antes = anterior?.linhas.find((a) => a.canal === l.canal)?.realizado
        return (
          <div key={l.canal}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="font-bold">{NOME_CANAL[l.canal]}</span>
              <span className="text-[15px]">
                <strong className="text-lg">{numero(l.realizado)}</strong>
                <span className="text-cinza"> / {l.meta ? numero(l.meta) : 'sem meta'}</span>
                {antes !== undefined && <span className="ml-2 text-[13px] text-cinza">antes {numero(antes)}</span>}
              </span>
            </div>
            <Barra valor={l.realizado} meta={l.meta} />
          </div>
        )
      })}
      <div className="flex items-baseline justify-between border-t border-fio pt-3">
        <span className="rotulo">Total da semana</span>
        <span><strong className="text-xl">{numero(dados.realizado)}</strong><span className="text-cinza"> / {numero(dados.metaTotal)}</span></span>
      </div>
      <p className="text-[13px] text-cinza">
        Referência da rede completa: {META_REDE_COMPLETA} por semana.
        {dados.outros.some((o) => o.realizado) && ` Sem meta: ${dados.outros.filter((o) => o.realizado).map((o) => `${NOME_CANAL[o.canal]} ${o.realizado}`).join(' · ')}.`}
      </p>
    </div>
  )
}
