import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MessageCircle, Pencil } from 'lucide-react'
import { useSessao } from '@/lib/sessao'
import { useCadastros } from '@/lib/dados/cadastros'
import { useHoje } from '@/lib/dados/consultas'
import { useRede } from '@/lib/dados/hooks'
import { dataCurta, dataHora, linkWhatsapp, naDia, pct, reais } from '@/lib/formato'
import { Botao, Numero, Selo, Vazio } from '@/components/ui/basicos'
import { Folha } from '@/components/ui/Folha'
import { Secao, Tela } from '@/components/ui/Tela'
import { FormParceiro } from './FormParceiro'

export function FichaParceiro() {
  const { id } = useParams()
  const sessao = useSessao()
  const cad = useCadastros()
  const hoje = useHoje(cad.config.horaViradaDia)
  const rede = useRede(hoje)
  const [editando, setEditando] = useState(false)
  const r = id ? rede?.resumos.get(id) : undefined
  if (!rede) return null
  if (!r) return <Tela titulo="Parceiro" voltar><Vazio>Parceiro não encontrado.</Vazio></Tela>

  const p = r.parceiro
  const dono = sessao.papel === 'dono'
  const mesmosTipo = [...rede.resumos.values()].filter((x) => x.parceiro.tipo === p.tipo && x.mes.pecas > 0)
    .sort((a, b) => b.mes.pecas - a.mes.pecas)
  const posicao = mesmosTipo.findIndex((x) => x.parceiro.id === p.id) + 1
  const zona = cad.zonas.find((z) => z.codigo === p.zona)

  return (
    <Tela titulo={p.nome} voltar
      subtitulo={<span className="flex flex-wrap gap-2"><Selo>{p.tipo}</Selo><Selo tom={p.status === 'ativo' ? 'ok' : 'neutro'}>{p.status}</Selo>
        {zona && <Selo>{zona.codigo} · {zona.nome}</Selo>}{p.polo && <Selo>polo {p.polo}</Selo>}</span>}
      acao={dono ? (
        <button type="button" onClick={() => setEditando(true)} aria-label="Editar" className="flex size-12 items-center justify-center rounded-deco border border-fio">
          <Pencil className="size-5" />
        </button>
      ) : undefined}>

      <section className="moldura grid grid-cols-3 gap-3 bg-carvao p-4">
        <Numero rotulo="Peças no mês" valor={r.mes.pecas} detalhe={posicao ? `${posicao}º do mês` : undefined} />
        <Numero rotulo="Deixou" valor={reais(r.mes.lucro)} tom="ok" />
        <Numero rotulo="Sem comprar" valor={r.diasSemCompra === null ? '—' : `${r.diasSemCompra} d`} tom={r.parado ? 'alerta' : undefined} />
      </section>

      {r.ponto && (
        <section className="grid grid-cols-3 gap-3">
          <Numero rotulo="No balcão" valor={r.ponto.estoqueEstimado} detalhe="estimado" />
          <Numero rotulo="Troca 4 sem." valor={pct(r.ponto.trocaPct4)} tom={(r.ponto.trocaPct4 ?? 0) > 0.2 ? 'aviso' : undefined} />
          <Numero rotulo="Fim do teste" valor={p.fimTeste ? dataCurta(p.fimTeste) : '—'}
            detalhe={r.ponto.diasFimTeste !== null ? (r.ponto.diasFimTeste >= 0 ? `faltam ${r.ponto.diasFimTeste} dias` : 'encerrado') : undefined} />
        </section>
      )}

      <div className="grid gap-2">
        {p.whatsapp && (
          <a href={linkWhatsapp(p.whatsapp)} target="_blank" rel="noreferrer"
            className="flex min-h-toque items-center justify-center gap-2 rounded-deco border border-osso font-bold">
            <MessageCircle className="size-5" aria-hidden /> WhatsApp {p.whatsapp}
          </a>
        )}
        {dono && (
          <div className="grid grid-cols-2 gap-2">
            <Link to={`/repasse?tipo=${p.tipo}&parceiro=${p.id}`} className="flex min-h-toque items-center justify-center rounded-deco bg-osso font-bold text-tinta">
              Repasse
            </Link>
            {p.tipo === 'ponto' && (
              <Link to={`/visita?ponto=${p.id}`} className="flex min-h-toque items-center justify-center rounded-deco border border-osso font-bold">
                Visita
              </Link>
            )}
          </div>
        )}
      </div>

      {p.endereco && <p className="text-cinza">{p.endereco}{p.diaVisita ? ` · visita ${naDia(p.diaVisita)}` : ''}</p>}
      {p.observacoes && <p className="whitespace-pre-line text-cinza">{p.observacoes}</p>}

      {r.ponto && (
        <Secao titulo="Visitas">
          {r.ponto.visitas.length ? (
            <ul className="divide-y divide-fio border-y border-fio">
              {r.ponto.visitas.map(({ visita, vendido }) => (
                <li key={visita.id} className="flex justify-between py-2 text-[15px]">
                  <span>{dataHora(visita.data)}</span>
                  <span className="text-cinza">contou {visita.contadoNoBalcao} · trocou {visita.trocado} · vendeu <strong className="text-osso">{vendido}</strong></span>
                </li>
              ))}
            </ul>
          ) : <Vazio>Nenhuma visita ainda.</Vazio>}
        </Secao>
      )}

      <Secao titulo="Compras">
        {r.compras.length ? (
          <ul className="divide-y divide-fio border-y border-fio">
            {r.compras.slice(0, 30).map((c) => (
              <li key={c.venda.id} className="flex justify-between py-2 text-[15px]">
                <span>{dataHora(c.venda.data)}</span>
                <span><strong>{c.pecas}</strong> peças · {reais(c.bruto)}</span>
              </li>
            ))}
          </ul>
        ) : <Vazio>Ainda não comprou.</Vazio>}
      </Secao>

      <Folha aberta={editando} aoFechar={() => setEditando(false)} titulo={`Editar ${p.nome}`}>
        {editando && <FormParceiro parceiro={p} tipoInicial={p.tipo} hoje={hoje} aoSalvar={() => setEditando(false)} />}
      </Folha>
      {dono && p.status !== 'saiu' && (
        <Botao variante="fantasma" bloco onClick={() => setEditando(true)}>Mudar status</Botao>
      )}
    </Tela>
  )
}
