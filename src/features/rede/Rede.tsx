import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronRight, MessageCircle, Plus } from 'lucide-react'
import type { TipoParceiro } from '@/lib/db/tipos'
import { useSessao } from '@/lib/sessao'
import { useCadastros } from '@/lib/dados/cadastros'
import { useHoje } from '@/lib/dados/consultas'
import { useRede } from '@/lib/dados/hooks'
import type { ResumoParceiro } from '@/lib/dados/indicadores'
import { conflitosDeZona } from '@/lib/motor/rede'
import { dataCurta, DIAS_SEMANA, linkWhatsapp, naDia, pct, reais } from '@/lib/formato'
import { Abas } from '@/components/ui/Abas'
import { Aviso, Selo, Vazio } from '@/components/ui/basicos'
import { Folha } from '@/components/ui/Folha'
import { Tela } from '@/components/ui/Tela'
import { FormParceiro } from './FormParceiro'
import { textoDaMensagem, TITULO_MOMENTO, type Momento } from './mensagens'

const ABAS: Array<{ valor: TipoParceiro; rotulo: string }> = [
  { valor: 'vendedor', rotulo: 'Vendedores' }, { valor: 'motorista', rotulo: 'Motoristas' }, { valor: 'ponto', rotulo: 'Pontos' },
]

const TOM_STATUS = { ativo: 'ok', teste: 'aviso', treino: 'aviso', candidato: 'neutro', pausado: 'neutro', saiu: 'neutro' } as const

function Cartao({ r, mensagem, remetente, gestao }: { r: ResumoParceiro; mensagem: Momento | null; remetente: string; gestao: boolean }) {
  const p = r.parceiro
  const local = p.tipo === 'vendedor' ? p.zona : p.tipo === 'ponto' ? (p.polo ? `polo ${p.polo}` : undefined) : undefined
  return (
    <li className="flex items-stretch rounded-deco border border-fio bg-carvao">
      <Link to={`/rede/${p.id}`} className="min-w-0 flex-1 p-3 active:bg-grafite">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold">{p.nome}</span>
          <Selo tom={TOM_STATUS[p.status]}>{p.status}</Selo>
          {local && <Selo>{local}</Selo>}
          {r.parado && <Selo tom="alerta">parado</Selo>}
          {r.ponto?.semVisita && <Selo tom="aviso">sem visita</Selo>}
        </div>
        <p className="mt-1 text-[14px] text-cinza">
          {r.ultimaCompra ? `última compra ${dataCurta(r.ultimaCompra)} · ${r.diasSemCompra} dias` : 'ainda não comprou'}
          {p.tipo === 'vendedor' && p.noites?.length ? ` · ${p.noites.map((n) => DIAS_SEMANA[n].slice(0, 3).toLowerCase()).join(', ')}` : ''}
        </p>
        <p className="text-[14px]">
          Mês: <strong>{r.mes.pecas}</strong> peças
          {gestao && <> · deixou <strong className="text-verde">{reais(r.mes.lucro)}</strong></>}
          {r.ponto && <> · troca {pct(r.ponto.trocaPct4)}</>}
        </p>
      </Link>
      {p.whatsapp && (
        <a href={linkWhatsapp(p.whatsapp, mensagem ? textoDaMensagem(mensagem, p, remetente) : undefined)} target="_blank" rel="noreferrer"
          aria-label={`WhatsApp de ${p.nome}`} className="flex w-14 items-center justify-center border-l border-fio active:bg-grafite">
          <MessageCircle className={mensagem ? 'size-6 text-verde' : 'size-6 text-cinza'} />
        </a>
      )}
      {!p.whatsapp && <span className="flex w-10 items-center justify-center text-cinza"><ChevronRight className="size-5" aria-hidden /></span>}
    </li>
  )
}

export function Rede() {
  const sessao = useSessao()
  const cad = useCadastros()
  const hoje = useHoje(cad.config.horaViradaDia)
  const rede = useRede(hoje)
  const [params, setParams] = useSearchParams()
  const aba = (params.get('aba') as TipoParceiro) || 'vendedor'
  const mensagem = params.get('mensagem') as Momento | null
  const [novo, setNovo] = useState(false)
  const dono = sessao.papel === 'dono'

  const todos = rede?.parceiros ?? []
  const daAba = todos.filter((p) => p.tipo === aba).map((p) => rede!.resumos.get(p.id)!)
    .sort((a, b) => Number(a.parceiro.status === 'saiu') - Number(b.parceiro.status === 'saiu') || b.mes.pecas - a.mes.pecas)
  const conflitos = aba === 'vendedor' ? conflitosDeZona(todos.filter((p) => p.tipo === 'vendedor')) : []

  return (
    <Tela titulo="Rede" subtitulo="Vendedores, motoristas e pontos de revenda"
      acao={dono ? (
        <button type="button" onClick={() => setNovo(true)} aria-label="Novo parceiro" className="flex size-12 items-center justify-center rounded-deco border border-osso">
          <Plus className="size-6" />
        </button>
      ) : undefined}>
      <Abas abas={ABAS.map((a) => ({ ...a, contagem: todos.filter((p) => p.tipo === a.valor && p.status !== 'saiu').length }))}
        ativa={aba} aoMudar={(v) => setParams(mensagem ? { aba: v, mensagem } : { aba: v }, { replace: true })} />

      {mensagem && (
        <Aviso tom="ok" acao={<button type="button" className="min-h-11 px-2 text-[13px] underline" onClick={() => setParams({ aba }, { replace: true })}>fechar</button>}>
          <strong>{TITULO_MOMENTO[mensagem]}.</strong> Toque no ícone verde de cada um: o WhatsApp abre com o texto pronto.
        </Aviso>
      )}
      {conflitos.map((c) => (
        <Aviso key={`${c.zona}${c.noite}`} tom="alerta">
          {c.nomes.join(' e ')} na zona {c.zona} {naDia(c.noite)}: cada zona tem um vendedor dono.
        </Aviso>
      ))}

      {daAba.length ? (
        <ul className="space-y-2">
          {daAba.map((r) => <Cartao key={r.parceiro.id} r={r} mensagem={mensagem} remetente={dono ? sessao.nome : 'Gabriel'} gestao />)}
        </ul>
      ) : (
        <Vazio>Nenhum {ABAS.find((a) => a.valor === aba)?.rotulo.toLowerCase().slice(0, -1)} cadastrado ainda.</Vazio>
      )}

      <Folha aberta={novo} aoFechar={() => setNovo(false)} titulo="Novo parceiro">
        {novo && <FormParceiro tipoInicial={aba} hoje={hoje} aoSalvar={() => setNovo(false)} />}
      </Folha>
    </Tela>
  )
}
