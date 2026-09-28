import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Trash2 } from 'lucide-react'
import type { CustoFixo, GrupoCusto } from '@/lib/db/tipos'
import { useSessao } from '@/lib/sessao'
import { useCadastros } from '@/lib/dados/cadastros'
import { lerDaEmpresa, useHoje } from '@/lib/dados/consultas'
import { useResumoVendas } from '@/lib/dados/hooks'
import { somar } from '@/lib/dados/indicadores'
import { dataHora, pct, reais } from '@/lib/formato'
import { excluirNota, salvarCustoFixo, salvarLimites, salvarNota } from '@/lib/operacoes/mentor'
import { Aviso, Barra, Botao, Campo, Vazio } from '@/components/ui/basicos'
import { Folha } from '@/components/ui/Folha'
import { Secao, Tela } from '@/components/ui/Tela'
import { mostrarErro } from '@/components/ui/Toast'

const paraNumero = (s: string) => Number(s.replace(/\./g, '').replace(',', '.')) || 0

function Faturamento({ hoje }: { hoje: string }) {
  const { empresaId } = useSessao()
  const vendas = useResumoVendas(`${hoje.slice(0, 4)}-01-01`, hoje)
  const config = useLiveQuery(async () => (await lerDaEmpresa('configsMentor', empresaId))[0], [empresaId])
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState('')
  if (!vendas) return null
  const total = somar(vendas).bruto
  const limites = config?.limitesFaturamento ?? []

  return (
    <Secao titulo={`Faturamento real em ${hoje.slice(0, 4)}`} direita={
      <button type="button" className="min-h-11 text-[13px] font-bold uppercase tracking-[0.08em] text-cinza" onClick={() => {
        setTexto(limites.map((l) => `${l.nome}: ${l.valor}`).join('\n'))
        setEditando(true)
      }}>limites</button>
    }>
      <p className="text-3xl font-bold">{reais(total)}</p>
      <p className="mb-3 text-[13px] text-cinza">Soma das vendas lançadas no app (inclui repasses).</p>
      <div className="space-y-3">
        {limites.map((l) => (
          <div key={l.nome}>
            <div className="mb-1 flex justify-between text-[15px]">
              <span>{l.nome}</span>
              <span className={total >= l.valor ? 'font-bold text-vermelho' : ''}>{reais(l.valor)} · {pct(total / l.valor)}</span>
            </div>
            <Barra valor={total} meta={l.valor} />
          </div>
        ))}
      </div>
      <p className="mt-2 text-[13px] text-cinza">Valores a conferir com o contador.</p>
      <Folha aberta={editando} aoFechar={() => setEditando(false)} titulo="Limites de alerta">
        <p className="mb-2 text-[14px] text-cinza">Um por linha, no formato “nome: valor”.</p>
        <textarea className="campo min-h-32 py-2" value={texto} onChange={(e) => setTexto(e.target.value)} />
        <Botao bloco className="mt-3" onClick={() => {
          const novos = texto.split('\n').map((linha) => linha.split(':')).filter((p) => p.length >= 2)
            .map(([nome, ...valor]) => ({ nome: nome.trim(), valor: paraNumero(valor.join(':').trim()) })).filter((l) => l.nome && l.valor > 0)
          salvarLimites(config, novos).then(() => setEditando(false)).catch(mostrarErro)
        }}>Salvar limites</Botao>
      </Folha>
    </Secao>
  )
}

function CustosDoMentor() {
  const cad = useCadastros()
  const custos = cad.custosFixos.filter((c) => c.visibilidade === 'mentor')
  const [editando, setEditando] = useState<CustoFixo | 'novo' | null>(null)
  const [nome, setNome] = useState('')
  const [valor, setValor] = useState('')

  const abrir = (c: CustoFixo | 'novo') => {
    setNome(c === 'novo' ? '' : c.nome)
    setValor(c === 'novo' ? '' : String(c.valorMensal).replace('.', ','))
    setEditando(c)
  }

  return (
    <Secao titulo="Custos só do mentor" direita={<button type="button" className="min-h-11 text-[13px] font-bold uppercase tracking-[0.08em] text-cinza" onClick={() => abrir('novo')}>novo</button>}>
      <ul className="divide-y divide-fio border-y border-fio">
        {custos.map((c) => (
          <li key={c.id}>
            <button type="button" className="flex min-h-12 w-full items-center justify-between py-2 text-left" onClick={() => abrir(c)}>
              <span>{c.nome}</span><strong>{reais(c.valorMensal)}</strong>
            </button>
          </li>
        ))}
        <li className="flex justify-between py-2 text-cinza"><span>Total por mês</span><strong className="text-osso">{reais(custos.reduce((s, c) => s + c.valorMensal, 0))}</strong></li>
      </ul>
      <p className="mt-2 text-[13px] text-cinza">Entram só no resultado da visão do mentor.</p>
      <Folha aberta={!!editando} aoFechar={() => setEditando(null)} titulo={editando === 'novo' ? 'Novo custo' : 'Editar custo'}>
        <form className="space-y-3" onSubmit={(e) => {
          e.preventDefault()
          const dados = { nome, valorMensal: paraNumero(valor), grupo: 'empresa' as GrupoCusto, visibilidade: 'mentor' as const }
          salvarCustoFixo(dados, editando === 'novo' ? undefined : editando?.id).then(() => setEditando(null)).catch(mostrarErro)
        }}>
          <Campo rotulo="Nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
          <Campo rotulo="Valor por mês (R$)" required inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
          <Botao type="submit" bloco>Salvar</Botao>
        </form>
      </Folha>
    </Secao>
  )
}

function Notas() {
  const { empresaId } = useSessao()
  const notas = useLiveQuery(async () => (await lerDaEmpresa('notasMentor', empresaId)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [empresaId])
  const [texto, setTexto] = useState('')
  return (
    <Secao titulo="Notas">
      <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); salvarNota(texto.trim()).then(() => setTexto('')).catch(mostrarErro) }}>
        <textarea className="campo min-h-20 py-2" required value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Nova nota" />
        <Botao type="submit" variante="secundario" bloco>Guardar nota</Botao>
      </form>
      <div className="mt-3 space-y-2">
        {notas?.length ? notas.map((n) => (
          <div key={n.id} className="flex gap-2 rounded-deco border border-fio bg-carvao p-3">
            <div className="flex-1">
              <p className="whitespace-pre-line">{n.texto}</p>
              <p className="mt-1 text-[13px] text-cinza">{dataHora(n.updatedAt)}</p>
            </div>
            <button type="button" aria-label="Apagar nota" className="flex size-11 items-center justify-center text-cinza" onClick={() => excluirNota(n.id).catch(mostrarErro)}>
              <Trash2 className="size-5" />
            </button>
          </div>
        )) : <Vazio>Nenhuma nota.</Vazio>}
      </div>
    </Secao>
  )
}

export function AreaPrivada() {
  const cad = useCadastros()
  const hoje = useHoje(cad.config.horaViradaDia)
  return (
    <Tela titulo="Área privada" voltar subtitulo="Só o mentor vê esta tela">
      <Aviso tom="neutro">DAS, contador, faturamento do ano e notas não aparecem para o dono nem para a equipe.</Aviso>
      <Faturamento hoje={hoje} />
      <CustosDoMentor />
      <Notas />
    </Tela>
  )
}
