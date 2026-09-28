import { useLiveQuery } from 'dexie-react-hooks'
import { db, TABELAS } from '@/lib/db/banco'
import { useSessao } from '@/lib/sessao'
import { lerDaEmpresa } from '@/lib/dados/consultas'
import { useCadastros } from '@/lib/dados/cadastros'
import { dataHora, numero } from '@/lib/formato'
import { puxarTudoDeNovo, sincronizar, temNuvem, useEstadoSync } from '@/lib/sync/sincronizar'
import { Aviso, Botao, Numero } from '@/components/ui/basicos'
import { Secao, Tela } from '@/components/ui/Tela'
import { mostrarToast } from '@/components/ui/Toast'

function baixar(nome: string, conteudo: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }))
  const a = Object.assign(document.createElement('a'), { href: url, download: nome })
  a.click()
  URL.revokeObjectURL(url)
}

const decimal = (n: number) => String(n).replace('.', ',')
const celula = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`

export function Dados() {
  const { empresaId, papel } = useSessao()
  const cad = useCadastros()
  const estado = useEstadoSync()
  const pendentes = useLiveQuery(() => db.outbox.count(), []) ?? 0
  const sufixo = new Date().toISOString().slice(0, 10)

  async function exportarJson() {
    const tabelas = TABELAS.filter((t) => papel === 'mentor' || !['notasMentor', 'configsMentor'].includes(t))
    const tudo: Record<string, unknown[]> = {}
    for (const t of tabelas) {
      const linhas = await lerDaEmpresa(t, empresaId)
      tudo[t] = t === 'custosFixos' && papel !== 'mentor' ? linhas.filter((c) => (c as { visibilidade: string }).visibilidade === 'todos') : linhas
    }
    baixar(`old-brownies-${sufixo}.json`, JSON.stringify(tudo, null, 2), 'application/json')
  }

  async function exportarVendasCsv() {
    const vendas = await lerDaEmpresa('vendas', empresaId)
    const itens = await lerDaEmpresa('vendaItens', empresaId)
    const parceiros = new Map((await lerDaEmpresa('parceiros', empresaId)).map((p) => [p.id, p.nome]))
    const porId = new Map(vendas.map((v) => [v.id, v]))
    const cabecalho = ['data', 'dia comercial', 'canal', 'parceiro', 'pagamento', 'item', 'tamanho', 'qtd', 'preço', 'custo']
    const linhas = itens.filter((i) => porId.has(i.vendaId)).map((i) => {
      const v = porId.get(i.vendaId)!
      const nome = i.produtoId ? cad.produtoPorId.get(i.produtoId)?.nome : cad.saborPorId.get(i.saborId ?? '')?.nome
      return [dataHora(v.data), v.diaComercial, v.canal, parceiros.get(v.parceiroId ?? '') ?? '', v.pagamento, nome, i.tamanho ?? '',
        i.qtd, decimal(i.precoUnitario), decimal(Number(i.custoUnitario.toFixed(4)))].map(celula).join(';')
    })
    baixar(`vendas-${sufixo}.csv`, '﻿' + [cabecalho.map(celula).join(';'), ...linhas].join('\n'), 'text/csv;charset=utf-8')
  }

  return (
    <Tela titulo="Sincronização e dados" voltar subtitulo="A empresa é dona dos dados">
      <section className="moldura grid grid-cols-2 gap-4 bg-carvao p-4">
        <Numero rotulo="Na fila de envio" valor={numero(pendentes)} tom={pendentes && temNuvem() ? 'aviso' : undefined} />
        <Numero rotulo="Conexão" valor={estado.online ? 'online' : 'sem sinal'} tom={estado.online ? 'ok' : 'aviso'} />
      </section>

      {temNuvem() ? (
        <Secao titulo="Nuvem">
          <p className="mb-3 text-cinza">
            {estado.ultimoSync ? `Última sincronização: ${dataHora(estado.ultimoSync)}` : 'Ainda não sincronizou nesta sessão.'}
            {' '}A cada 30 segundos quando há sinal, e sempre que o sinal volta.
          </p>
          {estado.erro && <div className="mb-3"><Aviso tom="alerta">{estado.erro}</Aviso></div>}
          <div className="grid gap-2">
            <Botao bloco disabled={!estado.online || estado.sincronizando} onClick={() => void sincronizar().then(() => mostrarToast('Sincronizado'))}>
              {estado.sincronizando ? 'Sincronizando…' : 'Sincronizar agora'}
            </Botao>
            <Botao bloco variante="fantasma" disabled={!estado.online} onClick={() => void puxarTudoDeNovo(empresaId)}>Baixar tudo de novo</Botao>
          </div>
        </Secao>
      ) : (
        <Aviso tom="neutro">
          Nuvem não configurada: tudo fica salvo neste aparelho e entra na fila. Quando a nuvem for ligada
          (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY), a fila sobe inteira, sem duplicar.
        </Aviso>
      )}

      <Secao titulo="Exportar">
        <div className="grid gap-2">
          <Botao bloco variante="secundario" onClick={exportarJson}>Tudo (JSON)</Botao>
          {papel !== 'equipe' && <Botao bloco variante="secundario" onClick={exportarVendasCsv}>Vendas (CSV para planilha)</Botao>}
        </div>
      </Secao>
    </Tela>
  )
}
