import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import type { Parceiro, TipoParceiro } from '@/lib/db/tipos'
import { useSessao } from '@/lib/sessao'
import { cx } from '@/lib/cx'
import { useCadastros } from '@/lib/dados/cadastros'
import { useHoje, useRegistros } from '@/lib/dados/consultas'
import { useEstoque } from '@/lib/dados/hooks'
import { reais } from '@/lib/formato'
import { desfazerVenda, registrarVenda } from '@/lib/operacoes/vendas'
import { Abas } from '@/components/ui/Abas'
import { Aviso, Botao, Vazio } from '@/components/ui/basicos'
import { Stepper } from '@/components/ui/Stepper'
import { Secao, Tela } from '@/components/ui/Tela'
import { mostrarErro, mostrarToast } from '@/components/ui/Toast'
import { MixSabores, mixSortido } from './MixSabores'

const ABAS: Array<{ valor: TipoParceiro; rotulo: string }> = [
  { valor: 'vendedor', rotulo: 'Vendedor' }, { valor: 'motorista', rotulo: 'Motorista' }, { valor: 'ponto', rotulo: 'Ponto' },
]
const ORDEM_STATUS: Record<string, number> = { ativo: 0, teste: 1, treino: 2, pausado: 3, candidato: 4, saiu: 5 }
const DIAS_MINIMOS_PONTO = 7

export function Repasse() {
  const sessao = useSessao()
  const cad = useCadastros()
  const hoje = useHoje(cad.config.horaViradaDia)
  const [params, setParams] = useSearchParams()
  const tipo = (params.get('tipo') as TipoParceiro) || 'vendedor'
  const parceiros = useRegistros('parceiros')
  const estoque = useEstoque(hoje)
  const [parceiroId, setParceiroId] = useState<string | null>(params.get('parceiro'))
  const [unidades, setUnidades] = useState(1)
  const [enviando, setEnviando] = useState(false)

  const canal = cad.canal(tipo)
  const tamanho = canal.tamanhoPadrao
  const pecasPorUnidade = tipo === 'ponto' ? 24 : cad.pecasPorForma.pequeno
  const total = unidades * pecasPorUnidade
  const [mix, setMix] = useState(() => mixSortido(total, cad.sabores))
  useEffect(() => setMix(mixSortido(total, cad.sabores)), [total, cad.sabores])

  const lista = useMemo(() => (parceiros ?? [])
    .filter((p) => p.tipo === tipo && p.status !== 'saiu')
    .sort((a, b) => ORDEM_STATUS[a.status] - ORDEM_STATUS[b.status] || a.nome.localeCompare(b.nome, 'pt-BR')), [parceiros, tipo])

  const preco = canal.precoPadrao ?? 0
  const somaMix = Object.values(mix).reduce((s, v) => s + v, 0)
  const lucro = Object.entries(mix).reduce((s, [saborId, qtd]) => s + qtd * (preco - (cad.tabela.variavel[saborId]?.[tamanho] ?? 0)), 0)
  const precoInvalido = preco >= cad.config.precoFinalRevenda
  const unidade = tipo === 'ponto' ? 'caixa' : 'forma'

  async function registrar(parceiro: Parceiro) {
    setEnviando(true)
    try {
      const itens = Object.entries(mix).filter(([, q]) => q > 0).map(([saborId, qtd]) => ({
        saborId, tamanho, qtd, precoUnitario: preco, custoUnitario: cad.tabela.variavel[saborId]?.[tamanho] ?? 0,
      }))
      const vendaId = await registrarVenda({ canal: tipo, pagamento: 'pix', parceiroId: parceiro.id, itens }, {
        horaViradaDia: cad.config.horaViradaDia, produtoPorId: cad.produtoPorId, diasMinimos: tipo === 'ponto' ? DIAS_MINIMOS_PONTO : 0,
      })
      mostrarToast(`Repasse a ${parceiro.nome}: ${somaMix} peças · ${reais(somaMix * preco)}`, {
        acao: { rotulo: 'Desfazer', fazer: () => void desfazerVenda(vendaId, cad.config.horaViradaDia) },
      })
      setParceiroId(null)
      setUnidades(1)
    } catch (e) {
      mostrarErro(e)
    } finally {
      setEnviando(false)
    }
  }

  const escolhido = lista.find((p) => p.id === parceiroId)

  return (
    <Tela titulo="Repasse a parceiro" voltar subtitulo="Parceiro → formas → Pix recebido">
      <Abas abas={ABAS} ativa={tipo} aoMudar={(t) => { setParams({ tipo: t }, { replace: true }); setParceiroId(null); setUnidades(1) }} />

      <Secao titulo="Quem">
        {lista.length ? (
          <ul className="space-y-2" role="radiogroup" aria-label="Parceiro">
            {lista.map((p) => (
              <li key={p.id}>
                <button type="button" role="radio" aria-checked={p.id === parceiroId} onClick={() => setParceiroId(p.id)}
                  className={cx('flex min-h-14 w-full items-center gap-3 rounded-deco border px-4 text-left active:scale-[0.99]',
                    p.id === parceiroId ? 'border-osso bg-grafite' : 'border-fio bg-carvao')}>
                  <span className="flex-1 font-bold">{p.nome}</span>
                  {p.status !== 'ativo' && <span className="text-[13px] uppercase tracking-[0.08em] text-cinza">{p.status}</span>}
                  {p.id === parceiroId && <Check className="size-5" aria-hidden />}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <Vazio>
            Nenhum {ABAS.find((a) => a.valor === tipo)?.rotulo.toLowerCase()} cadastrado.
            {sessao.papel === 'dono' && <> <Link to={`/rede?aba=${tipo}`} className="underline">Cadastrar na Rede</Link>.</>}
          </Vazio>
        )}
      </Secao>

      {escolhido && (
        <>
          <Secao titulo={tipo === 'ponto' ? 'Caixas de 24' : `Formas de ${pecasPorUnidade}`}>
            <div className="flex items-center justify-between">
              <span className="text-cinza">{total} peças {tamanho === 'grande' ? 'grandes' : 'pequenas'}</span>
              <Stepper rotulo={unidade} valor={unidades} min={1} max={20} aoMudar={setUnidades} />
            </div>
          </Secao>
          <MixSabores total={total} mix={mix} aoMudar={setMix} sabores={cad.sabores} tamanho={tamanho} estoque={estoque?.saldoItem} />

          {precoInvalido && <Aviso tom="alerta">Repasse igual ou acima do preço final ({reais(cad.config.precoFinalRevenda)}): o parceiro não tem margem.</Aviso>}
          <div className="moldura bg-carvao p-4">
            <p className="text-3xl font-bold">{reais(somaMix * preco)}</p>
            <p className="text-cinza">{somaMix} × {reais(preco)} · à vista, no Pix</p>
            {sessao.papel === 'dono' && (
              <p className="mt-2 text-[15px]">
                {unidades === 1 ? `Esta ${unidade} deixa` : `Estas ${unidades} ${unidade}s deixam`}{' '}
                <strong className="text-verde">{reais(lucro)}</strong> para a Old Brownies.
              </p>
            )}
          </div>
          <Botao bloco variante="ok" disabled={enviando || somaMix !== total || precoInvalido} onClick={() => registrar(escolhido)}>
            <Check className="size-5" aria-hidden /> Pix recebido — registrar
          </Botao>
        </>
      )}
    </Tela>
  )
}
