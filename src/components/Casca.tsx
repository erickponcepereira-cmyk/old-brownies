import { useEffect, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  BookOpenCheck, Boxes, CalendarCheck, CircleDollarSign, Gauge, Menu, Plus, Trophy, Users, Wheat,
  type LucideIcon,
} from 'lucide-react'
import type { Papel } from '@/lib/db/tipos'
import { useSessao } from '@/lib/sessao'
import { cx } from '@/lib/cx'
import { iniciarSincronizacao } from '@/lib/sync/sincronizar'
import { registrarAcesso } from '@/lib/operacoes/acesso'
import { IndicadorSync } from './IndicadorSync'
import { Toasts } from './ui/Toast'

interface ItemNav { para: string; rotulo: string; icone: LucideIcon }

const NAV: Record<Papel, ItemNav[]> = {
  dono: [
    { para: '/hoje', rotulo: 'Hoje', icone: CalendarCheck },
    { para: '/vender', rotulo: 'Vender', icone: CircleDollarSign },
    { para: '/rede', rotulo: 'Rede', icone: Users },
    { para: '/estoque', rotulo: 'Estoque', icone: Boxes },
    { para: '/mais', rotulo: 'Mais', icone: Menu },
  ],
  equipe: [
    { para: '/hoje', rotulo: 'Hoje', icone: CalendarCheck },
    { para: '/vender', rotulo: 'Vender', icone: CircleDollarSign },
    { para: '/producao', rotulo: 'Produção', icone: Wheat },
    { para: '/estoque', rotulo: 'Estoque', icone: Boxes },
    { para: '/mais', rotulo: 'Mais', icone: Menu },
  ],
  mentor: [
    { para: '/painel', rotulo: 'Painel', icone: Gauge },
    { para: '/placar', rotulo: 'Placar', icone: Trophy },
    { para: '/rede', rotulo: 'Rede', icone: Users },
    { para: '/checklist', rotulo: 'Rotina', icone: BookOpenCheck },
    { para: '/mais', rotulo: 'Mais', icone: Menu },
  ],
  parceiro: [],
}

const SEM_BOTAO_VENDA = ['/vender', '/repasse', '/visita', '/producao', '/checklist/editar']

export function Casca({ children }: { children: ReactNode }) {
  const sessao = useSessao()
  const { pathname } = useLocation()

  useEffect(() => iniciarSincronizacao(), [])
  useEffect(() => { void registrarAcesso() }, [sessao.membroId])

  const mostrarVenda = sessao.papel === 'dono' && !SEM_BOTAO_VENDA.some((p) => pathname.startsWith(p))

  return (
    <div className="min-h-dvh">
      <div className="sticky top-0 z-30 border-b border-fio bg-tinta/95 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-11 max-w-[30rem] items-center justify-between px-4">
          <span className="font-titulo text-[13px] font-bold tracking-[0.32em]">OLD BROWNIES</span>
          <IndicadorSync />
        </div>
      </div>

      {children}

      {mostrarVenda && (
        <Link
          to="/vender"
          className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-[max(1rem,calc(50vw-14rem))] z-30 flex min-h-toque items-center gap-2 rounded-deco border border-tinta bg-osso px-5 text-lg font-bold text-tinta outline outline-1 outline-offset-2 outline-osso active:scale-[0.98]"
        >
          <Plus className="size-5" aria-hidden /> Venda
        </Link>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-fio bg-carvao pb-[env(safe-area-inset-bottom)]" aria-label="Navegação">
        <ul className="mx-auto flex max-w-[30rem]">
          {NAV[sessao.papel].map(({ para, rotulo, icone: Icone }) => (
            <li key={para} className="flex-1">
              <NavLink
                to={para}
                className={({ isActive }) => cx(
                  'flex min-h-16 flex-col items-center justify-center gap-1 border-t-2 text-[12px] font-bold uppercase tracking-[0.08em]',
                  isActive ? 'border-osso text-osso' : 'border-transparent text-cinza',
                )}
              >
                <Icone className="size-6" aria-hidden />
                {rotulo}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Toasts />
    </div>
  )
}
