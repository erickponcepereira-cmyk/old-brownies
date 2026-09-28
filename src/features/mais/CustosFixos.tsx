import { useState } from 'react'
import type { CustoFixo, GrupoCusto } from '@/lib/db/tipos'
import { useSessao } from '@/lib/sessao'
import { useCadastros } from '@/lib/dados/cadastros'
import { reais } from '@/lib/formato'
import { salvarCustoFixo } from '@/lib/operacoes/mentor'
import { excluir } from '@/lib/sync/gravar'
import { Botao, Campo, Escolha, Selo } from '@/components/ui/basicos'
import { Folha } from '@/components/ui/Folha'
import { Secao, Tela } from '@/components/ui/Tela'
import { mostrarErro } from '@/components/ui/Toast'

const GRUPOS: Array<{ valor: GrupoCusto; rotulo: string }> = [
  { valor: 'ponto', rotulo: 'Ponto (loja)' }, { valor: 'empresa', rotulo: 'Empresa' },
  { valor: 'pessoal', rotulo: 'Vida do Gabriel' }, { valor: 'divida', rotulo: 'Dívida' },
]

const paraNumero = (s: string) => Number(s.replace(/\./g, '').replace(',', '.')) || 0

export function CustosFixos() {
  const sessao = useSessao()
  const cad = useCadastros()
  const [editando, setEditando] = useState<CustoFixo | 'novo' | null>(null)
  const [form, setForm] = useState({ nome: '', valor: '', grupo: 'ponto' as GrupoCusto, observacao: '' })
  const podeEditar = (c: CustoFixo) => (sessao.papel === 'dono' && c.visibilidade === 'todos') || (sessao.papel === 'mentor' && c.visibilidade === 'mentor')
  const total = cad.custosFixos.reduce((s, c) => s + c.valorMensal, 0)
  const diariaMes = cad.config.diariaProducao * cad.tabela.jornadasPorSemana * cad.config.semanasPorMes

  function abrir(c: CustoFixo | 'novo') {
    setForm(c === 'novo'
      ? { nome: '', valor: '', grupo: 'ponto', observacao: '' }
      : { nome: c.nome, valor: String(c.valorMensal).replace('.', ','), grupo: c.grupo, observacao: c.observacao ?? '' })
    setEditando(c)
  }

  async function salvar() {
    const visibilidade = sessao.papel === 'mentor' ? 'mentor' as const : 'todos' as const
    try {
      await salvarCustoFixo({ nome: form.nome, valorMensal: paraNumero(form.valor), grupo: form.grupo, observacao: form.observacao, visibilidade },
        editando === 'novo' ? undefined : editando?.id)
      setEditando(null)
    } catch (e) {
      mostrarErro(e)
    }
  }

  return (
    <Tela titulo="Custos fixos" voltar subtitulo={`${reais(total)} por mês · com a diária de produção, ${reais(total + diariaMes)}`}
      acao={sessao.papel === 'dono' ? <Botao pequeno variante="secundario" onClick={() => abrir('novo')}>Novo</Botao> : undefined}>
      {GRUPOS.map((g) => {
        const custos = cad.custosFixos.filter((c) => c.grupo === g.valor)
        return (
          <Secao key={g.valor} titulo={g.rotulo} direita={<strong>{reais(custos.reduce((s, c) => s + c.valorMensal, 0))}</strong>}>
            <ul className="divide-y divide-fio border-y border-fio">
              {custos.map((c) => (
                <li key={c.id}>
                  <button type="button" disabled={!podeEditar(c)} onClick={() => abrir(c)}
                    className="flex min-h-12 w-full items-baseline justify-between gap-2 py-2 text-left disabled:cursor-default">
                    <span className="min-w-0">
                      <span className="block font-bold">{c.nome} {c.visibilidade === 'mentor' && <Selo tom="aviso">mentor</Selo>}</span>
                      {c.observacao && <span className="block text-[12px] text-cinza">{c.observacao}</span>}
                      {c.inicio && <span className="block text-[12px] text-cinza">a partir de {c.inicio.slice(5, 7)}/{c.inicio.slice(0, 4)}</span>}
                    </span>
                    <span className="shrink-0 font-bold">{reais(c.valorMensal)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Secao>
        )
      })}
      <p className="text-[13px] text-cinza">
        A diária de produção ({reais(cad.config.diariaProducao)} por jornada) não é custo fixo: entra rateada no custo de cada brownie.
      </p>

      <Folha aberta={!!editando} aoFechar={() => setEditando(null)} titulo={editando === 'novo' ? 'Novo custo fixo' : 'Editar custo fixo'}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void salvar() }}>
          <Campo rotulo="Nome" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          <Campo rotulo="Valor por mês (R$)" required inputMode="decimal" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
          <Escolha rotulo="Grupo" valor={form.grupo} aoMudar={(v) => setForm({ ...form, grupo: v })} opcoes={GRUPOS} />
          <Campo rotulo="Observação" value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
          <Botao type="submit" bloco>Salvar</Botao>
          {editando && editando !== 'novo' && (
            <Botao variante="fantasma" bloco onClick={() => excluir('custosFixos', editando.id).then(() => setEditando(null)).catch(mostrarErro)}>
              Remover
            </Botao>
          )}
        </form>
      </Folha>
    </Tela>
  )
}
