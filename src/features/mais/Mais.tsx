import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { Papel } from '@/lib/db/tipos'
import { useSessao } from '@/lib/sessao'
import { useCadastros } from '@/lib/dados/cadastros'
import { sair } from '@/lib/operacoes/acesso'
import { Botao } from '@/components/ui/basicos'
import { Secao, Tela } from '@/components/ui/Tela'

interface Item { para: string; rotulo: string; detalhe?: string; papeis: Papel[] }

const GRUPOS: Array<{ titulo: string; itens: Item[] }> = [
  {
    titulo: 'Operação',
    itens: [
      { para: '/hoje', rotulo: 'Hoje do dono', detalhe: 'leitura', papeis: ['mentor'] },
      { para: '/checklist', rotulo: 'Checklist da semana', papeis: ['dono', 'equipe'] },
      { para: '/placar', rotulo: 'Placar da semana', papeis: ['dono'] },
      { para: '/producao', rotulo: 'Produção', papeis: ['dono', 'mentor'] },
      { para: '/estoque', rotulo: 'Estoque', papeis: ['mentor'] },
      { para: '/visita', rotulo: 'Visita ao ponto', papeis: ['dono'] },
      { para: '/repasse', rotulo: 'Repasse a parceiro', papeis: ['dono', 'equipe'] },
    ],
  },
  {
    titulo: 'Números',
    itens: [
      { para: '/mais/custos', rotulo: 'Custos', detalhe: 'custo do brownie e lucro por canal', papeis: ['dono', 'mentor'] },
      { para: '/mais/produtos', rotulo: 'Tabela da casa', detalhe: 'produtos, preços e promoções', papeis: ['dono', 'mentor', 'equipe'] },
      { para: '/mais/fixos', rotulo: 'Custos fixos', papeis: ['dono', 'mentor'] },
    ],
  },
  {
    titulo: 'Empresa',
    itens: [
      { para: '/mais/configuracoes', rotulo: 'Empresa e configurações', papeis: ['dono', 'mentor'] },
      { para: '/mais/convites', rotulo: 'Convites', papeis: ['dono', 'mentor'] },
      { para: '/mais/dados', rotulo: 'Sincronização e dados', detalhe: 'exportar tudo', papeis: ['dono', 'mentor', 'equipe'] },
    ],
  },
]

export function Mais() {
  const sessao = useSessao()
  const cad = useCadastros()
  const navegar = useNavigate()
  return (
    <Tela titulo="Mais" subtitulo={`${sessao.nome} · ${sessao.papel} · ${cad.empresa.nome}`}>
      {GRUPOS.map((g) => {
        const itens = g.itens.filter((i) => i.papeis.includes(sessao.papel))
        if (!itens.length) return null
        return (
          <Secao key={g.titulo} titulo={g.titulo}>
            <ul className="border-t border-fio">
              {itens.map((i) => (
                <li key={i.para}>
                  <Link to={i.para} className="flex min-h-14 items-center gap-3 border-b border-fio px-1 active:bg-grafite">
                    <span className="flex-1">
                      <span className="block font-bold">{i.rotulo}</span>
                      {i.detalhe && <span className="block text-[13px] text-cinza">{i.detalhe}</span>}
                    </span>
                    <ChevronRight className="size-5 text-cinza" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </Secao>
        )
      })}
      <Botao variante="fantasma" bloco onClick={() => { sair(); navegar('/entrar', { replace: true }) }}>Trocar de perfil</Botao>
    </Tela>
  )
}
