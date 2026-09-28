import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCadastros } from '@/lib/dados/cadastros'
import { useHoje } from '@/lib/dados/consultas'
import { useChecklist, useRede, useResumoVendas } from '@/lib/dados/hooks'
import { placar, porParceiro } from '@/lib/dados/indicadores'
import { cumprimento } from '@/lib/motor/checklist'
import { inicioSemana, somarDias } from '@/lib/motor/dia'
import { dataCurta, pct, reais } from '@/lib/formato'
import { Aviso, Vazio } from '@/components/ui/basicos'
import { Secao, Tela } from '@/components/ui/Tela'
import { montarDia } from '@/features/checklist/tarefas'
import { PlacarBarras } from './PlacarBarras'

export function Placar() {
  const cad = useCadastros()
  const hoje = useHoje(cad.config.horaViradaDia)
  const [segunda, setSegunda] = useState(() => inicioSemana(hoje))
  const domingo = somarDias(segunda, 6)
  const atual = useResumoVendas(segunda, domingo)
  const anterior = useResumoVendas(somarDias(segunda, -7), somarDias(segunda, -1))
  const rede = useRede(hoje)
  const checklist = useChecklist(segunda, domingo)

  const pctChecklist = useMemo(() => {
    if (!checklist) return null
    const linhas = Array.from({ length: 7 }, (_, i) => somarDias(segunda, i)).filter((d) => d >= cad.inicioUso && d <= hoje)
      .flatMap((d) => montarDia(checklist, d, 'dono', hoje).filter((l) => l.rotinaTarefaId))
    return {
      ...cumprimento(linhas.map((l) => ({ obrigatoria: l.obrigatoria, feita: l.status === 'feito' }))),
      pulados: linhas.filter((l) => l.status === 'pulado'),
    }
  }, [checklist, segunda, hoje, cad.inicioUso])

  if (!atual || !anterior || !rede) return null
  const melhores = [...porParceiro(atual).entries()].sort((a, b) => b[1].pecas - a[1].pecas).slice(0, 5)
  const parados = [...rede.resumos.values()].filter((r) => r.parado)

  return (
    <Tela titulo="Placar da semana" subtitulo={`${dataCurta(segunda)} a ${dataCurta(domingo)} · a reunião de segunda`}>
      <div className="flex items-center justify-between">
        <button type="button" className="flex min-h-12 items-center gap-1 px-2 text-cinza" onClick={() => setSegunda(somarDias(segunda, -7))}>
          <ChevronLeft className="size-5" /> Anterior
        </button>
        <button type="button" className="flex min-h-12 items-center gap-1 px-2 text-cinza disabled:opacity-30"
          disabled={segunda >= inicioSemana(hoje)} onClick={() => setSegunda(somarDias(segunda, 7))}>
          Próxima <ChevronRight className="size-5" />
        </button>
      </div>

      <Secao titulo="Meta × realizado">
        <PlacarBarras dados={placar(atual, rede.parceiros, cad)} anterior={placar(anterior, rede.parceiros, cad)} />
      </Secao>

      <Secao titulo="Melhores parceiros">
        {melhores.length ? (
          <ol className="divide-y divide-fio border-y border-fio">
            {melhores.map(([id, t], i) => {
              const p = rede.resumos.get(id)?.parceiro
              return (
                <li key={id}>
                  <Link to={`/rede/${id}`} className="flex min-h-12 items-center gap-3 py-2">
                    <span className="w-6 font-titulo font-bold">{i + 1}</span>
                    <span className="flex-1 font-bold">{p?.nome}</span>
                    <span className="text-cinza">{t.pecas} peças · {reais(t.lucro)}</span>
                  </Link>
                </li>
              )
            })}
          </ol>
        ) : <Vazio>Nenhum repasse nesta semana.</Vazio>}
      </Secao>

      <Secao titulo="Quem parou">
        {parados.length ? (
          <ul className="space-y-2">
            {parados.map((r) => (
              <li key={r.parceiro.id}><Link to={`/rede/${r.parceiro.id}`}>
                <Aviso tom="alerta">{r.parceiro.nome} ({r.parceiro.tipo}) — {r.diasSemCompra} dias sem comprar</Aviso>
              </Link></li>
            ))}
          </ul>
        ) : <Aviso tom="ok">Ninguém parado.</Aviso>}
      </Secao>

      {pctChecklist && (
        <Secao titulo="Rotina da semana" direita={<Link to="/checklist" className="text-[13px] font-bold uppercase tracking-[0.08em] text-cinza">ver</Link>}>
          <p className="text-3xl font-bold">{pct(pctChecklist.pct)}</p>
          <p className="text-cinza">{pctChecklist.feitas} de {pctChecklist.obrigatorias} obrigatórias até hoje</p>
          {pctChecklist.pulados.length > 0 && (
            <p className="mt-2 text-[15px]">Pulado: {pctChecklist.pulados.map((l) => l.titulo).join(' · ')}</p>
          )}
        </Secao>
      )}

      <p className="text-[13px] text-cinza">Captação da semana entra no placar na fase 2.</p>
    </Tela>
  )
}
