import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Lock } from 'lucide-react'
import { db } from '@/lib/db/banco'
import { useSessao } from '@/lib/sessao'
import { useCadastros } from '@/lib/dados/cadastros'
import { lerDaEmpresa, useHoje } from '@/lib/dados/consultas'
import { useChecklist, useEstoque, useRede, useResumoVendas } from '@/lib/dados/hooks'
import { placar, resultadoDoMes } from '@/lib/dados/indicadores'
import { cumprimento } from '@/lib/motor/checklist'
import { inicioMes, inicioSemana, somarDias } from '@/lib/motor/dia'
import { dataHora, numero, pct, reais } from '@/lib/formato'
import { entrarComo } from '@/lib/operacoes/acesso'
import { temNuvem } from '@/lib/sync/sincronizar'
import { Aviso, Barra, Numero } from '@/components/ui/basicos'
import { Secao, Tela } from '@/components/ui/Tela'
import { montarDia } from '@/features/checklist/tarefas'
import { RecadosETarefas } from './RecadosETarefas'

function SeletorEmpresa() {
  const sessao = useSessao()
  const opcoes = useLiveQuery(async () => {
    const membros = (await db.membros.where('userId').equals(sessao.userId).toArray()).filter((m) => !m.deletedAt && m.papel === 'mentor')
    const empresas = await db.empresas.bulkGet(membros.map((m) => m.empresaId))
    return membros.map((m, i) => ({ membro: m, nome: empresas[i]?.nome ?? 'Empresa' }))
  }, [sessao.userId])
  if (!opcoes || opcoes.length < 2) return null
  return (
    <label className="block space-y-1">
      <span className="rotulo">Empresa</span>
      <select className="campo" value={sessao.membroId} onChange={(e) => {
        const escolhida = opcoes.find((o) => o.membro.id === e.target.value)
        if (escolhida) entrarComo(escolhida.membro, sessao.email)
      }}>
        {opcoes.map((o) => <option key={o.membro.id} value={o.membro.id}>{o.nome}</option>)}
      </select>
    </label>
  )
}

function Linha({ para, children }: { para: string; children: React.ReactNode }) {
  return (
    <Link to={para} className="flex min-h-12 items-center justify-between gap-2 border-b border-fio py-2 active:bg-grafite">
      <span className="flex-1">{children}</span>
      <ChevronRight className="size-5 text-cinza" aria-hidden />
    </Link>
  )
}

export function Painel() {
  const { empresaId } = useSessao()
  const cad = useCadastros()
  const hoje = useHoje(cad.config.horaViradaDia)
  const segunda = inicioSemana(hoje)
  const semana = useResumoVendas(segunda, somarDias(segunda, 6))
  const mes = useResumoVendas(inicioMes(hoje), hoje)
  const rede = useRede(hoje)
  const estoque = useEstoque(hoje)
  const checklist = useChecklist(segunda, hoje)
  const donos = useLiveQuery(async () => (await lerDaEmpresa('membros', empresaId)).filter((m) => m.papel !== 'mentor'), [empresaId])
  const pendentesAqui = useLiveQuery(() => db.outbox.count(), []) ?? 0

  const rotina = useMemo(() => {
    if (!checklist) return null
    const linhas = Array.from({ length: 7 }, (_, i) => somarDias(segunda, i)).filter((d) => d >= cad.inicioUso && d <= hoje)
      .flatMap((d) => montarDia(checklist, d, 'dono', hoje).filter((l) => l.rotinaTarefaId))
    return { ...cumprimento(linhas.map((l) => ({ obrigatoria: l.obrigatoria, feita: l.status === 'feito' }))), pulados: linhas.filter((l) => l.status === 'pulado') }
  }, [checklist, segunda, hoje, cad.inicioUso])

  if (!semana || !mes || !rede || !estoque) return null
  const p = placar(semana, rede.parceiros, cad)
  const r = resultadoDoMes(mes, cad, hoje)
  const resumos = [...rede.resumos.values()]
  const ativos = resumos.filter((x) => x.parceiro.status === 'ativo').length
  const parados = resumos.filter((x) => x.parado).length
  const semVisita = resumos.filter((x) => x.ponto?.semVisita).length

  return (
    <Tela titulo="Painel" subtitulo={`${cad.empresa.nome} · pulso da empresa`}>
      <SeletorEmpresa />

      <section className="moldura space-y-3 bg-carvao p-4" aria-label="Vendas da semana">
        <div className="flex items-baseline justify-between">
          <p className="rotulo">Semana × meta</p>
          <p><strong className="text-3xl">{numero(p.realizado)}</strong><span className="text-cinza"> / {numero(p.metaTotal)}</span></p>
        </div>
        <Barra valor={p.realizado} meta={p.metaTotal} />
      </section>

      <Secao titulo="Mês até agora">
        <div className="grid grid-cols-2 gap-4">
          <Numero rotulo="Faturamento" valor={reais(r.totais.bruto)} />
          <Numero rotulo="Margem" valor={reais(r.totais.lucro)} />
          <Numero rotulo="Lucro da empresa" valor={reais(r.atual.lucroEmpresa)} tom={r.atual.lucroEmpresa < 0 ? 'alerta' : 'ok'} detalhe="com os fixos do mês inteiro" />
          <Numero rotulo="Sobra projetada" valor={reais(r.projetado.sobra)} tom={r.projetado.sobra < 0 ? 'alerta' : 'ok'} detalhe="no ritmo de hoje" />
        </div>
        {r.atual.faltaParaOAzul > 0 ? (
          <div className="mt-3">
            <Aviso tom="aviso">
              Falta <strong>{reais(r.atual.faltaParaOAzul)}</strong> para o azul: {numero(r.faltaEmPecasLoja)} pequenos na loja
              ou {numero(r.faltaEmFormas)} formas de vendedor.
            </Aviso>
          </div>
        ) : <div className="mt-3"><Aviso tom="ok">O mês já pagou loja, empresa, vida e dívida.</Aviso></div>}
      </Secao>

      <Secao titulo="Operação">
        <div className="border-t border-fio">
          <Linha para="/checklist">Rotina: <strong>{pct(rotina?.pct ?? null)}</strong> cumprida
            {!!rotina?.pulados.length && <span className="block text-[14px] text-vermelho">Pulado: {rotina.pulados.map((l) => l.titulo).join(' · ')}</span>}
          </Linha>
          <Linha para="/rede">Rede: <strong>{ativos}</strong> ativos · <strong className={parados ? 'text-vermelho' : ''}>{parados}</strong> parados · <strong className={semVisita ? 'text-ambar' : ''}>{semVisita}</strong> pontos sem visita</Linha>
          <Linha para="/estoque">Estoque: <strong>{numero(estoque.total)}</strong> peças · <strong className={estoque.vencendo.length ? 'text-ambar' : ''}>{estoque.vencendo.length}</strong> lotes vencendo · <strong className={estoque.vencidos.length ? 'text-vermelho' : ''}>{estoque.vencidos.length}</strong> vencidos</Linha>
          <Linha para="/estoque">Sumiço no mês: <strong className={estoque.sumicoMes ? 'text-vermelho' : 'text-verde'}>{estoque.sumicoMes} peças</strong>
            {estoque.sumicoMes > 0 && <> (≈ {reais(estoque.sumicoMes * cad.precoMedioLoja)})</>}
          </Linha>
          <Linha para="/hoje">Hoje do dono (leitura)</Linha>
          <Linha para="/mais/custos">Custos e lucro por canal</Linha>
        </div>
        <div className="mt-3 space-y-1 text-[14px] text-cinza">
          {donos?.map((m) => (
            <p key={m.id}>
              Último acesso de {m.nome}: {m.ultimoAcesso ? dataHora(m.ultimoAcesso) : 'ainda não entrou'}
              {temNuvem() && m.pendentesSync ? ` · ${m.pendentesSync} lançamentos esperando sinal no último contato` : ''}
            </p>
          ))}
          {temNuvem() && pendentesAqui > 0 && <p>Neste aparelho: {pendentesAqui} registros na fila de envio.</p>}
        </div>
      </Secao>

      <RecadosETarefas hoje={hoje} />

      <Link to="/privado" className="flex min-h-toque items-center justify-center gap-2 rounded-deco border border-osso font-bold">
        <Lock className="size-5" aria-hidden /> Área privada do mentor
      </Link>
    </Tela>
  )
}
