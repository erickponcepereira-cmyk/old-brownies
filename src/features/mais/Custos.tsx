import type { CodigoCanal, CodigoTamanho } from '@/lib/db/tipos'
import { useCadastros } from '@/lib/dados/cadastros'
import { fixosDoMes } from '@/lib/dados/indicadores'
import { useHoje } from '@/lib/dados/consultas'
import { equilibrioEmPecas } from '@/lib/motor/resultado'
import { lucroPorPeca, taxaDoCanal } from '@/lib/motor/lucro'
import { numero, pct, reais } from '@/lib/formato'
import { cx } from '@/lib/cx'
import { Aviso } from '@/components/ui/basicos'
import { Secao, Tela } from '@/components/ui/Tela'

const TAMANHOS: CodigoTamanho[] = ['pequeno', 'grande']
const precoPeca = (v: number) => `R$ ${numero(v, 2)}`

function Celula({ variavel, direto, producao }: { variavel: number; direto: number; producao: number }) {
  return (
    <td className="px-1 py-2 text-right align-top">
      <span className="block text-lg font-bold">{precoPeca(variavel)}</span>
      <span className="block text-[12px] text-cinza">{numero(direto, 2)} + {numero(producao, 2)}</span>
    </td>
  )
}

export function Custos() {
  const cad = useCadastros()
  const hoje = useHoje(cad.config.horaViradaDia)
  const t = cad.tabela
  const fixos = fixosDoMes(cad.custosFixos.filter((c) => c.visibilidade === 'todos'), hoje)

  const canais: Array<{ codigo: CodigoCanal; preco: number; tamanho: CodigoTamanho; nota?: string }> = [
    { codigo: 'loja', preco: cad.precoMedioLoja, tamanho: 'pequeno', nota: 'preço médio do mix, com maquininha' },
    { codigo: 'rota', preco: cad.canal('rota').precoPadrao ?? 18, tamanho: 'grande', nota: 'com maquininha' },
    { codigo: 'feira', preco: cad.canal('feira').precoPadrao ?? 15, tamanho: 'pequeno', nota: 'com maquininha' },
    { codigo: 'evento', preco: cad.canal('evento').precoPadrao ?? 18, tamanho: 'pequeno', nota: 'com maquininha' },
    { codigo: 'vendedor', preco: cad.canal('vendedor').precoPadrao ?? 8, tamanho: 'pequeno', nota: 'Pix, sem taxa' },
    { codigo: 'motorista', preco: cad.canal('motorista').precoPadrao ?? 8, tamanho: 'pequeno', nota: 'Pix, sem taxa' },
    { codigo: 'ponto', preco: cad.canal('ponto').precoPadrao ?? 10, tamanho: 'grande', nota: 'Pix, sem taxa · caixa de 24' },
  ]
  const partes = [
    { nome: 'Ponto (loja)', valor: fixos.ponto }, { nome: 'Empresa', valor: fixos.empresa },
    { nome: 'Vida do Gabriel', valor: fixos.pessoal }, { nome: 'Dívida', valor: fixos.divida },
  ]
  const totalFixos = partes.reduce((s, p) => s + p.valor, 0)

  return (
    <Tela titulo="Custos" voltar subtitulo={`Com o preço de insumo de hoje · ${numero(t.formasSemana, 1)} formas por semana`}>
      <section className="moldura grid grid-cols-2 gap-4 bg-carvao p-4">
        {TAMANHOS.map((tam) => (
          <div key={tam}>
            <p className="rotulo">{tam} no mix</p>
            <p className="text-3xl font-bold">{precoPeca(t.variavelMix[tam])}</p>
            <p className="text-[13px] text-cinza">direto {numero(t.diretoMix[tam], 2)} + produção {numero(t.producao[tam], 2)}</p>
          </div>
        ))}
      </section>
      {t.etiqueta > 0.5 && <Aviso>Etiqueta a {reais(t.etiqueta)} por peça: conferir com a gráfica (R$ 0,80 ou R$ 0,20).</Aviso>}

      <Secao titulo="Custo variável por sabor">
        <table className="w-full text-[15px]">
          <thead>
            <tr className="text-left text-[12px] uppercase tracking-[0.08em] text-cinza">
              <th className="py-1 font-bold">Sabor</th><th className="px-1 text-right font-bold">Pequeno</th><th className="px-1 text-right font-bold">Grande</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-fio border-y border-fio">
            {cad.sabores.filter((s) => s.ativo).map((s) => (
              <tr key={s.id}>
                <th scope="row" className="py-2 text-left align-top font-bold">
                  {s.nome}
                  <span className="block text-[12px] font-semibold text-cinza">massa {reais(t.massa[s.id])} · mix {s.pesoMix}</span>
                </th>
                {TAMANHOS.map((tam) => <Celula key={tam} variavel={t.variavel[s.id][tam]} direto={t.direto[s.id][tam]} producao={t.producao[tam]} />)}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[13px] text-cinza">
          Variável = direto (massa ÷ peças + etiqueta {reais(t.etiqueta)} + embalagem {reais(t.embalagem)}) + produção
          (diária e gás: {reais(t.producaoPorForma)} por forma, {t.jornadasPorSemana} jornada por semana).
        </p>
      </Secao>

      <Secao titulo="Lucro por canal">
        <ul className="divide-y divide-fio border-y border-fio">
          {canais.map((c) => {
            const lucro = lucroPorPeca(c.preco, taxaDoCanal(c.codigo, cad.taxas), t.variavelMix[c.tamanho])
            const porForma = lucro * cad.pecasPorForma[c.tamanho]
            return (
              <li key={c.codigo} className="flex items-baseline justify-between gap-2 py-2">
                <span className="min-w-0">
                  <span className="block font-bold">{cad.canal(c.codigo).nome} · {c.tamanho} a {reais(c.preco)}</span>
                  <span className="block text-[12px] text-cinza">{c.nota}</span>
                </span>
                <span className="text-right">
                  <span className={cx('block text-lg font-bold', lucro < 0 && 'text-vermelho')}>{reais(lucro)}</span>
                  <span className="block text-[12px] text-cinza">{reais(porForma)} por {c.codigo === 'ponto' ? 'caixa' : 'forma'}</span>
                </span>
              </li>
            )
          })}
        </ul>
        {cad.config.comissaoIfood === null && <p className="mt-2 text-[13px] text-cinza">iFood: preencher a comissão na reativação.</p>}
      </Secao>

      <Secao titulo="Equilíbrio em pequenos da loja">
        <p className="mb-2 text-[14px] text-cinza">Quantos pequenos a {reais(cad.precoMedioLoja)} (lucro {reais(cad.lucroLoja)}) pagam cada parte por mês.</p>
        <ul className="divide-y divide-fio border-y border-fio">
          {[...partes, { nome: 'Total', valor: totalFixos }].map((p) => (
            <li key={p.nome} className={cx('flex justify-between py-2', p.nome === 'Total' && 'font-bold')}>
              <span>{p.nome} · {reais(p.valor)}</span>
              <span>{numero(Math.ceil(equilibrioEmPecas(p.valor, cad.lucroLoja)))} peças</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[13px] text-cinza">Imposto: provisão de {pct(cad.config.provisaoImposto)} do faturamento, fora destes números.</p>
      </Secao>
    </Tela>
  )
}
