import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Coffee, Minus, Plus, Truck } from 'lucide-react'
import type { CodigoCanal, CodigoTamanho, Pagamento, Produto } from '@/lib/db/tipos'
import { useSessao } from '@/lib/sessao'
import { cx } from '@/lib/cx'
import { useCadastros, type Cadastros } from '@/lib/dados/cadastros'
import { numero, reais } from '@/lib/formato'
import { desfazerVenda, registrarVenda } from '@/lib/operacoes/vendas'
import { Aviso, Botao, Selo } from '@/components/ui/basicos'
import { Secao, Tela } from '@/components/ui/Tela'
import { mostrarErro, mostrarToast } from '@/components/ui/Toast'
import { itemDeProduto, itemDeSabor, PAGAMENTOS, useCarrinho, type ItemCarrinho } from './carrinho'

const CANAIS_VENDA: Array<{ valor: CodigoCanal; rotulo: string }> = [
  { valor: 'loja', rotulo: 'Loja' }, { valor: 'rota', rotulo: 'Rota' }, { valor: 'feira', rotulo: 'Feira' },
  { valor: 'evento', rotulo: 'Evento' }, { valor: 'ifood', rotulo: 'iFood' },
]

const outroTamanho = (t: CodigoTamanho): CodigoTamanho => (t === 'pequeno' ? 'grande' : 'pequeno')

function Ladrilho({ nome, preco, qtd, selo, aoTocar }: { nome: string; preco: number; qtd: number; selo?: string; aoTocar: () => void }) {
  return (
    <button type="button" onClick={aoTocar} aria-label={`${nome}, ${reais(preco)}${qtd ? `, ${qtd} na venda` : ''}`}
      className={cx('relative flex min-h-20 flex-col justify-between rounded-deco border p-3 text-left active:scale-[0.98]',
        qtd ? 'border-osso bg-grafite' : 'border-fio bg-carvao')}>
      <span className="pr-8 font-bold leading-tight">{nome}</span>
      <span className="flex items-center gap-2 text-[15px] text-cinza">{reais(preco)}{selo && <Selo>{selo}</Selo>}</span>
      {qtd > 0 && (
        <span className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-deco bg-osso text-lg font-bold text-tinta">{qtd}</span>
      )}
    </button>
  )
}

function Grade({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>
}

function precoNoCanal(canal: CodigoCanal, saborId: string, tamanho: CodigoTamanho, cad: Cadastros) {
  const precoCanal = cad.canal(canal)?.precoPadrao
  if (precoCanal && tamanho === cad.canal(canal).tamanhoPadrao) return precoCanal
  const produto = cad.produtos.find((p) => p.tipo === 'brownie' && p.saborId === saborId && p.tamanho === tamanho)
  return produto?.precoLoja ?? cad.config.precoFinalRevenda
}

function LinhaCarrinho({ item, podeEditarPreco, aoMudarQtd, aoMudarPreco }: {
  item: ItemCarrinho
  podeEditarPreco: boolean
  aoMudarQtd: (q: number) => void
  aoMudarPreco: (p: number) => void
}) {
  return (
    <li className="flex items-center gap-2 py-1.5">
      <button type="button" aria-label={`Menos ${item.nome}`} className="flex size-11 items-center justify-center rounded-deco border border-fio" onClick={() => aoMudarQtd(item.qtd - 1)}>
        <Minus className="size-4" />
      </button>
      <span className="w-7 text-center text-lg font-bold">{item.qtd}</span>
      <button type="button" aria-label={`Mais ${item.nome}`} className="flex size-11 items-center justify-center rounded-deco border border-fio" onClick={() => aoMudarQtd(item.qtd + 1)}>
        <Plus className="size-4" />
      </button>
      <span className={cx('min-w-0 flex-1 truncate', item.preco < item.custo && 'text-vermelho')}>{item.nome}</span>
      {podeEditarPreco ? (
        <input aria-label={`Preço de ${item.nome}`} inputMode="decimal" className="campo w-20 min-h-11 px-2 text-right"
          defaultValue={item.preco.toFixed(2).replace('.', ',')}
          onBlur={(e) => {
            const valor = Number(e.target.value.replace(/\./g, '').replace(',', '.'))
            if (Number.isFinite(valor) && valor >= 0) aoMudarPreco(valor)
          }} />
      ) : <span className="text-[15px] text-cinza">{reais(item.preco)}</span>}
    </li>
  )
}

export function Vender() {
  const sessao = useSessao()
  const cad = useCadastros()
  const [params, setParams] = useSearchParams()
  const equipe = sessao.papel === 'equipe'
  const canal = (equipe ? 'loja' : (params.get('canal') as CodigoCanal)) || 'loja'
  const [tamanho, setTamanho] = useState<CodigoTamanho | null>(null)
  const [trocandoTamanho, setTrocandoTamanho] = useState(false)
  const [confirmarAbaixo, setConfirmarAbaixo] = useState<Pagamento | null>(null)
  const [enviando, setEnviando] = useState(false)
  const carrinho = useCarrinho(canal, cad)
  const { resumo } = carrinho

  const tamanhoCanal = tamanho ?? cad.canal(canal)?.tamanhoPadrao ?? 'pequeno'
  const qtdDe = (chave: string) => carrinho.itens.find((i) => i.chave === chave)?.qtd ?? 0
  const bloqueado = resumo.atropelaPonto.length > 0

  function mudarCanal(c: CodigoCanal) {
    setParams({ canal: c }, { replace: true })
    setTamanho(null)
    setConfirmarAbaixo(null)
    carrinho.limpar()
  }

  async function pagar(pagamento: Pagamento) {
    if (resumo.abaixoDoCusto.length && confirmarAbaixo !== pagamento) {
      setConfirmarAbaixo(pagamento)
      return
    }
    setEnviando(true)
    try {
      const vendaId = await registrarVenda({
        canal, pagamento,
        itens: carrinho.itens.map((i) => ({
          produtoId: i.produtoId, saborId: i.saborId, tamanho: i.tamanho, qtd: i.qtd, precoUnitario: i.preco, custoUnitario: i.custo,
        })),
      }, { horaViradaDia: cad.config.horaViradaDia, produtoPorId: cad.produtoPorId })
      const r = resumo.porPagamento[pagamento]
      mostrarToast(`Venda registrada · ${reais(r.bruto)}${equipe ? '' : ` · lucro ${reais(r.lucro)}`}`, {
        acao: { rotulo: 'Desfazer', fazer: () => void desfazerVenda(vendaId, cad.config.horaViradaDia).then(() => mostrarToast('Venda desfeita.')) },
      })
      carrinho.limpar()
      setConfirmarAbaixo(null)
    } catch (e) {
      mostrarErro(e)
    } finally {
      setEnviando(false)
    }
  }

  const produtosDe = (filtro: (p: Produto) => boolean) => cad.produtos.filter(filtro)
  const ladrilhoProduto = (p: Produto) => (
    <Ladrilho key={p.id} nome={p.nome} preco={p.precoLoja} qtd={qtdDe(`p:${p.id}`)}
      selo={p.saborId && cad.saborPorId.get(p.saborId)?.soEncomenda ? 'encomenda' : undefined}
      aoTocar={() => carrinho.adicionar(itemDeProduto(p, cad))} />
  )
  const cardapio = canal === 'loja' || canal === 'ifood'
  const noCardapio = (p: Produto) => canal === 'loja' || !!p.ifood
  const temBebida = carrinho.itens.some((i) => i.produtoId && cad.produtoPorId.get(i.produtoId)?.tipo === 'bebida')
  const sugestoes = cad.produtos.filter((p) => ['Café', 'Capuccino', 'Old Capuccino'].includes(p.nome))

  return (
    <>
      <Tela titulo="Vender" subtitulo={equipe ? 'Balcão da loja' : 'Canal → produto → pagamento'}
        acao={<Link to="/repasse" className="flex min-h-12 items-center gap-2 rounded-deco border border-fio px-3 text-[14px] font-bold"><Truck className="size-5" aria-hidden />Repasse</Link>}>
        {!equipe && (
          <div role="radiogroup" aria-label="Canal" className="grid grid-cols-5 gap-1">
            {CANAIS_VENDA.map((c) => (
              <button key={c.valor} type="button" role="radio" aria-checked={canal === c.valor} onClick={() => mudarCanal(c.valor)}
                className={cx('min-h-toque rounded-deco border text-[15px] font-bold active:scale-[0.97]',
                  canal === c.valor ? 'border-osso bg-osso text-tinta' : 'border-fio')}>
                {c.rotulo}
              </button>
            ))}
          </div>
        )}

        {canal === 'ifood' && cad.config.comissaoIfood === null && (
          <Aviso>Comissão do iFood ainda não preenchida (Mais → Configurações): o lucro está sem a comissão.</Aviso>
        )}

        {cardapio ? (
          <>
            <Secao titulo="Brownies">
              <Grade>{produtosDe((p) => p.tipo === 'brownie' && p.tamanho === 'pequeno' && noCardapio(p)).map(ladrilhoProduto)}</Grade>
            </Secao>
            <Secao titulo="Grande e combos">
              <Grade>{produtosDe((p) => (p.tipo === 'combo' || (p.tipo === 'brownie' && p.tamanho === 'grande')) && noCardapio(p)).map(ladrilhoProduto)}</Grade>
            </Secao>
            {canal === 'loja' && (
              <Secao titulo="Bebidas e salgados">
                <Grade>{produtosDe((p) => p.tipo === 'bebida' || p.tipo === 'salgado').map(ladrilhoProduto)}</Grade>
              </Secao>
            )}
          </>
        ) : (
          <Secao titulo={`Brownie ${tamanhoCanal}`} direita={
            <button type="button" className="min-h-11 text-[13px] font-bold uppercase tracking-[0.08em] text-cinza" onClick={() => setTrocandoTamanho(true)}>
              trocar
            </button>
          }>
            {trocandoTamanho && (
              <div className="mb-3">
                <Aviso acao={<Botao pequeno variante="secundario" onClick={() => { setTamanho(outroTamanho(tamanhoCanal)); setTrocandoTamanho(false) }}>Trocar</Botao>}>
                  Este canal vende {cad.canal(canal)?.tamanhoPadrao}. Trocar para {outroTamanho(tamanhoCanal)}?
                </Aviso>
              </div>
            )}
            <Grade>
              {cad.sabores.filter((s) => s.ativo && !s.soEncomenda).map((s) => {
                const preco = precoNoCanal(canal, s.id, tamanhoCanal, cad)
                return (
                  <Ladrilho key={s.id} nome={s.nome} preco={preco} qtd={qtdDe(`s:${s.id}:${tamanhoCanal}`)}
                    aoTocar={() => carrinho.adicionar(itemDeSabor(s.id, tamanhoCanal, preco, cad))} />
                )
              })}
            </Grade>
          </Secao>
        )}
        {carrinho.itens.length > 0 && <div className="h-72" aria-hidden />}
      </Tela>

      {carrinho.itens.length > 0 && (
        <aside aria-label="Venda em andamento" className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t-2 border-osso bg-carvao">
          <div className="mx-auto max-w-[30rem] px-4 pb-3 pt-2">
            <ul className="max-h-40 overflow-y-auto">
              {carrinho.itens.map((i) => (
                <LinhaCarrinho key={i.chave} item={i} podeEditarPreco={!equipe}
                  aoMudarQtd={(q) => carrinho.mudarQtd(i.chave, q)} aoMudarPreco={(p) => carrinho.mudarPreco(i.chave, p)} />
              ))}
            </ul>

            {canal === 'loja' && !temBebida && (
              <div className="mt-1 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                <Coffee className="size-4 shrink-0 text-cinza" aria-hidden />
                {sugestoes.map((p) => (
                  <button key={p.id} type="button" onClick={() => carrinho.adicionar(itemDeProduto(p, cad))}
                    className="min-h-10 shrink-0 rounded-deco border border-fio px-3 text-[14px]">
                    + {p.nome} {reais(p.precoLoja)}
                  </button>
                ))}
              </div>
            )}

            {bloqueado && (
              <div className="mt-2"><Aviso tom="alerta">Grande abaixo de {reais(cad.config.precoFinalRevenda)} atropela o ponto de revenda. Ajuste o preço.</Aviso></div>
            )}
            {!equipe && resumo.abaixoDoCusto.length > 0 && (
              <div className="mt-2"><Aviso tom="alerta">Abaixo do custo variável: {resumo.abaixoDoCusto.map((i) => `${i.nome} (custo ${reais(i.custo)})`).join(', ')}.</Aviso></div>
            )}

            <div className="my-2 flex items-baseline justify-between">
              <span className="text-cinza">{numero(resumo.pecas)} itens</span>
              <span className="text-2xl font-bold">{reais(resumo.total)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {PAGAMENTOS.map((p) => {
                const lucro = resumo.porPagamento[p.valor].lucro
                const confirmando = confirmarAbaixo === p.valor
                return (
                  <button key={p.valor} type="button" disabled={bloqueado || enviando} onClick={() => pagar(p.valor)}
                    className={cx('flex min-h-16 flex-col items-center justify-center rounded-deco border px-1 font-bold active:scale-[0.97] disabled:opacity-40',
                      confirmando ? 'border-vermelho bg-vermelho text-tinta' : 'border-osso bg-osso text-tinta')}>
                    <span className="text-[16px]">{confirmando ? 'Confirmar' : p.rotulo}</span>
                    {!equipe && <span className="text-[12px] font-bold opacity-80">{confirmando ? 'abaixo do custo' : `lucro ${reais(lucro)}`}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </aside>
      )}
    </>
  )
}
