import { useState } from 'react'
import type { Canal, Produto } from '@/lib/db/tipos'
import { useSessao, veCustos } from '@/lib/sessao'
import { useCadastros } from '@/lib/dados/cadastros'
import { custoProduto } from '@/lib/motor/custo'
import { numero, pct, reais } from '@/lib/formato'
import { atualizar } from '@/lib/sync/gravar'
import { cx } from '@/lib/cx'
import { Aviso, Botao, Campo, Selo } from '@/components/ui/basicos'
import { Folha } from '@/components/ui/Folha'
import { Secao, Tela } from '@/components/ui/Tela'
import { mostrarErro } from '@/components/ui/Toast'

const GRUPOS: Array<{ titulo: string; filtro: (p: Produto) => boolean }> = [
  { titulo: 'Brownies pequenos', filtro: (p) => p.tipo === 'brownie' && p.tamanho === 'pequeno' },
  { titulo: 'Grande e combos', filtro: (p) => p.tipo === 'combo' || (p.tipo === 'brownie' && p.tamanho === 'grande') },
  { titulo: 'Bebidas e salgados', filtro: (p) => p.tipo === 'bebida' || p.tipo === 'salgado' },
]

const paraNumero = (s: string) => Number(s.replace(/\./g, '').replace(',', '.'))

type Editando = { tipo: 'produto'; item: Produto } | { tipo: 'canal'; item: Canal }

export function Produtos() {
  const sessao = useSessao()
  const cad = useCadastros()
  const gestao = veCustos(sessao.papel)
  const dono = sessao.papel === 'dono'
  const [editando, setEditando] = useState<Editando | null>(null)
  const [preco, setPreco] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const lucroVendedor = cad.lucroPecaCanal('vendedor')
  const repasse = cad.canal('vendedor').precoPadrao ?? 8

  function abrir(e: Editando) {
    setEditando(e)
    setErro(null)
    setPreco(String(e.tipo === 'produto' ? e.item.precoLoja : e.item.precoPadrao ?? '').replace('.', ','))
  }

  // B6.2 — grande na loja abaixo do preço final atropela o ponto; repasse ≥ preço final tira a margem do parceiro.
  function validar(e: Editando, valor: number): string | null {
    const final = cad.config.precoFinalRevenda
    if (!Number.isFinite(valor) || valor <= 0) return 'Preço inválido.'
    if (e.tipo === 'produto' && e.item.tipo === 'brownie' && e.item.tamanho === 'grande' && valor < final) {
      return `Grande abaixo de ${reais(final)} na loja atropela o ponto de revenda.`
    }
    if (e.tipo === 'canal' && e.item.tipo === 'parceiro' && valor >= final) return `Repasse igual ou acima de ${reais(final)}: o parceiro fica sem margem.`
    if (e.tipo === 'canal' && e.item.codigo === 'rota' && valor < final) return `A rota vende grande: abaixo de ${reais(final)} atropela o ponto.`
    return null
  }

  async function salvar() {
    if (!editando) return
    const valor = paraNumero(preco)
    const problema = validar(editando, valor)
    if (problema) return setErro(problema)
    try {
      if (editando.tipo === 'produto') await atualizar('produtos', editando.item.id, { precoLoja: valor })
      else await atualizar('canais', editando.item.id, { precoPadrao: valor })
      setEditando(null)
    } catch (e) {
      mostrarErro(e)
    }
  }

  return (
    <Tela titulo="Tabela da casa" voltar subtitulo={gestao ? 'Preço, custo de hoje e margem' : 'Preços de venda'}>
      {GRUPOS.map((g) => (
        <Secao key={g.titulo} titulo={g.titulo}>
          <ul className="divide-y divide-fio border-y border-fio">
            {cad.produtos.filter(g.filtro).map((p) => {
              const custo = custoProduto(p, cad.tabela)
              return (
                <li key={p.id}>
                  <button type="button" disabled={!dono} onClick={() => abrir({ tipo: 'produto', item: p })}
                    className="flex min-h-12 w-full items-baseline justify-between gap-2 py-2 text-left disabled:cursor-default">
                    <span className="min-w-0">
                      <span className="block font-bold">{p.nome}</span>
                      {p.observacao && <span className="block text-[12px] text-cinza">{p.observacao}</span>}
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-lg font-bold">{reais(p.precoLoja)}</span>
                      {gestao && (custo === null
                        ? <Selo tom="aviso">sem custo</Selo>
                        : <span className="block text-[12px] text-cinza">custo {reais(custo)} · margem {pct((p.precoLoja - custo) / p.precoLoja)}</span>)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Secao>
      ))}

      {gestao && (
        <>
          <Secao titulo="Preço por canal">
            <ul className="divide-y divide-fio border-y border-fio">
              {cad.canais.filter((c) => c.precoPadrao !== null).map((c) => (
                <li key={c.id}>
                  <button type="button" disabled={!dono} onClick={() => abrir({ tipo: 'canal', item: c })}
                    className="flex min-h-12 w-full items-baseline justify-between py-2 text-left disabled:cursor-default">
                    <span><span className="font-bold">{c.nome}</span> <span className="text-[13px] text-cinza">· {c.tamanhoPadrao}{c.tipo === 'parceiro' ? ' · repasse' : ''}</span></span>
                    <strong className="text-lg">{reais(c.precoPadrao!)}</strong>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[13px] text-cinza">
              Ao cliente final: {reais(cad.config.precoFinalRevenda)} em qualquer canal de revenda. O pequeno a R$ 12 no balcão e R$ 18 na rua é intencional.
            </p>
          </Secao>

          <Secao titulo="Promoções do vendedor e do motorista">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[26rem] text-[14px]">
                <thead className="text-left text-[11px] uppercase tracking-[0.08em] text-cinza">
                  <tr><th className="py-1">Oferta</th><th className="text-right">Cliente</th><th className="text-right">Parceiro ganha</th><th className="text-right">Old Brownies</th></tr>
                </thead>
                <tbody className="divide-y divide-fio border-y border-fio">
                  {[...cad.promocoes].sort((a, b) => a.brownies - b.brownies || a.clientePaga - b.clientePaga).map((p) => {
                    const lucroParceiro = p.clientePaga - p.brownies * repasse
                    return (
                      <tr key={p.id}>
                        <td className="py-2 pr-2 font-bold">{p.oferta}</td>
                        <td className="text-right">{reais(p.clientePaga)}</td>
                        <td className="text-right">{reais(lucroParceiro)}<span className="block text-[11px] text-cinza">{reais(lucroParceiro / p.brownies)} cada</span></td>
                        <td className={cx('text-right font-bold text-verde')}>{reais(p.brownies * lucroVendedor)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[13px] text-cinza">O repasse é sempre {reais(repasse)} por brownie: em nenhuma oferta a Old Brownies ganha menos ({numero(lucroVendedor, 2)} por peça).</p>
          </Secao>
        </>
      )}

      <Folha aberta={!!editando} aoFechar={() => setEditando(null)} titulo={editando ? `Preço · ${editando.item.nome}` : ''}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void salvar() }}>
          <Campo rotulo="Preço (R$)" inputMode="decimal" autoFocus value={preco} onChange={(e) => { setPreco(e.target.value); setErro(null) }} />
          {erro && <Aviso tom="alerta">{erro}</Aviso>}
          <Botao type="submit" bloco>Salvar preço</Botao>
        </form>
      </Folha>
    </Tela>
  )
}
