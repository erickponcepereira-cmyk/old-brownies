import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import type { Papel } from '@/lib/db/tipos'
import { useSessaoOpcional } from '@/lib/sessao'
import { CadastrosProvider } from '@/lib/dados/cadastros'
import { Casca } from '@/components/Casca'
import { Entrar } from '@/features/entrar/Entrar'
import { Hoje } from '@/features/hoje/Hoje'
import { ChecklistSemana } from '@/features/checklist/ChecklistSemana'
import { EditarRotina } from '@/features/checklist/EditarRotina'
import { Vender } from '@/features/vender/Vender'
import { Repasse } from '@/features/repasse/Repasse'
import { VisitaPonto } from '@/features/visita/VisitaPonto'
import { Producao } from '@/features/producao/Producao'
import { Estoque } from '@/features/estoque/Estoque'
import { Rede } from '@/features/rede/Rede'
import { FichaParceiro } from '@/features/rede/FichaParceiro'
import { Placar } from '@/features/placar/Placar'
import { Painel } from '@/features/mentor/Painel'
import { AreaPrivada } from '@/features/mentor/AreaPrivada'
import { Mais } from '@/features/mais/Mais'
import { Custos } from '@/features/mais/Custos'
import { Produtos } from '@/features/mais/Produtos'
import { CustosFixos } from '@/features/mais/CustosFixos'
import { Configuracoes } from '@/features/mais/Configuracoes'
import { Convites } from '@/features/mais/Convites'
import { Dados } from '@/features/mais/Dados'

const INICIO: Record<Papel, string> = { dono: '/hoje', equipe: '/hoje', mentor: '/painel', parceiro: '/entrar' }

const TODOS: Papel[] = ['dono', 'mentor', 'equipe']
const GESTAO: Papel[] = ['dono', 'mentor']

function Carregando() {
  return <p className="p-8 text-center text-cinza">Abrindo a empresa…</p>
}

function Permitido({ papeis, children }: { papeis: Papel[]; children: ReactNode }) {
  const sessao = useSessaoOpcional()
  if (!sessao) return <Navigate to="/entrar" replace />
  if (!papeis.includes(sessao.papel)) return <Navigate to={INICIO[sessao.papel]} replace />
  return children
}

const ROTAS: Array<{ caminho: string; papeis: Papel[]; tela: ReactNode }> = [
  { caminho: '/hoje', papeis: ['dono', 'equipe', 'mentor'], tela: <Hoje /> },
  { caminho: '/checklist', papeis: TODOS, tela: <ChecklistSemana /> },
  { caminho: '/checklist/editar', papeis: ['dono'], tela: <EditarRotina /> },
  { caminho: '/vender', papeis: ['dono', 'equipe'], tela: <Vender /> },
  { caminho: '/repasse', papeis: ['dono', 'equipe'], tela: <Repasse /> },
  { caminho: '/visita', papeis: ['dono'], tela: <VisitaPonto /> },
  { caminho: '/producao', papeis: TODOS, tela: <Producao /> },
  { caminho: '/estoque', papeis: TODOS, tela: <Estoque /> },
  { caminho: '/rede', papeis: GESTAO, tela: <Rede /> },
  { caminho: '/rede/:id', papeis: GESTAO, tela: <FichaParceiro /> },
  { caminho: '/placar', papeis: GESTAO, tela: <Placar /> },
  { caminho: '/painel', papeis: ['mentor'], tela: <Painel /> },
  { caminho: '/privado', papeis: ['mentor'], tela: <AreaPrivada /> },
  { caminho: '/mais', papeis: TODOS, tela: <Mais /> },
  { caminho: '/mais/custos', papeis: GESTAO, tela: <Custos /> },
  { caminho: '/mais/produtos', papeis: TODOS, tela: <Produtos /> },
  { caminho: '/mais/fixos', papeis: GESTAO, tela: <CustosFixos /> },
  { caminho: '/mais/configuracoes', papeis: GESTAO, tela: <Configuracoes /> },
  { caminho: '/mais/convites', papeis: GESTAO, tela: <Convites /> },
  { caminho: '/mais/dados', papeis: TODOS, tela: <Dados /> },
]

function AreaLogada() {
  return (
    <CadastrosProvider carregando={<Carregando />}>
      <Casca>
        <Routes>
          {ROTAS.map((r) => (
            <Route key={r.caminho} path={r.caminho} element={<Permitido papeis={r.papeis}>{r.tela}</Permitido>} />
          ))}
          <Route path="*" element={<Inicio />} />
        </Routes>
      </Casca>
    </CadastrosProvider>
  )
}

function Inicio() {
  const sessao = useSessaoOpcional()
  return <Navigate to={sessao ? INICIO[sessao.papel] : '/entrar'} replace />
}

export function App() {
  const sessao = useSessaoOpcional()
  return (
    <Routes>
      <Route path="/entrar" element={<Entrar />} />
      <Route path="*" element={sessao ? <AreaLogada /> : <Navigate to="/entrar" replace />} />
    </Routes>
  )
}
