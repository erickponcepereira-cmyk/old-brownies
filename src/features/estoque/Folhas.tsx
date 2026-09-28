import { useState } from 'react'
import type { CodigoTamanho } from '@/lib/db/tipos'
import { useCadastros } from '@/lib/dados/cadastros'
import { chaveSaborTamanho, ajustesDeContagem } from '@/lib/motor/estoque'
import { carregarEstoque, registrarAmostra, registrarContagem, registrarPerda } from '@/lib/operacoes/estoque'
import { Botao, Campo, Escolha } from '@/components/ui/basicos'
import { Folha } from '@/components/ui/Folha'
import { Stepper } from '@/components/ui/Stepper'
import { mostrarErro, mostrarToast } from '@/components/ui/Toast'

const TAMANHOS: Array<{ valor: CodigoTamanho; rotulo: string }> = [{ valor: 'pequeno', rotulo: 'Pequeno' }, { valor: 'grande', rotulo: 'Grande' }]

function EscolhaItem({ saborId, tamanho, aoMudar }: {
  saborId: string
  tamanho: CodigoTamanho
  aoMudar: (saborId: string, tamanho: CodigoTamanho) => void
}) {
  const cad = useCadastros()
  return (
    <>
      <label className="block space-y-1">
        <span className="rotulo">Sabor</span>
        <select className="campo" value={saborId} onChange={(e) => aoMudar(e.target.value, tamanho)}>
          {cad.sabores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
      </label>
      <Escolha rotulo="Tamanho" valor={tamanho} aoMudar={(t) => aoMudar(saborId, t)} opcoes={TAMANHOS} />
    </>
  )
}

export function FolhaContagem({ aberta, aoFechar, estoque }: { aberta: boolean; aoFechar: () => void; estoque: Map<string, number> }) {
  const cad = useCadastros()
  const itens = cad.sabores.flatMap((s) => TAMANHOS.map((t) => ({ saborId: s.id, tamanho: t.valor, nome: `${s.nome} ${t.valor}` })))
  const sistema = (saborId: string, tamanho: CodigoTamanho) => estoque.get(chaveSaborTamanho(saborId, tamanho)) ?? 0
  const [contado, setContado] = useState<Record<string, number>>({})
  const valor = (saborId: string, tamanho: CodigoTamanho) => contado[chaveSaborTamanho(saborId, tamanho)] ?? Math.max(0, sistema(saborId, tamanho))

  async function registrar() {
    try {
      const diferenca = await registrarContagem(
        itens.map((i) => ({ saborId: i.saborId, tamanho: i.tamanho, contado: valor(i.saborId, i.tamanho) }))
          .filter((i) => i.contado !== sistema(i.saborId, i.tamanho)),
        { horaViradaDia: cad.config.horaViradaDia },
      )
      mostrarToast(diferenca < 0 ? `Sumiço de ${-diferenca} peças registrado` : diferenca > 0 ? `${diferenca} peças a mais que o sistema` : 'Contagem bate com o sistema',
        { tom: diferenca < 0 ? 'alerta' : 'ok' })
      setContado({})
      aoFechar()
    } catch (e) {
      mostrarErro(e)
    }
  }

  return (
    <Folha aberta={aberta} aoFechar={aoFechar} titulo="Contagem física">
      <p className="mb-3 text-[14px] text-cinza">Conte o que tem na loja. Começa no número do sistema; ajuste o que for diferente.</p>
      <ul className="mb-4 divide-y divide-fio border-y border-fio">
        {itens.filter((i) => sistema(i.saborId, i.tamanho) !== 0 || contado[chaveSaborTamanho(i.saborId, i.tamanho)] !== undefined || i.tamanho === 'pequeno').map((i) => {
          const s = sistema(i.saborId, i.tamanho)
          const c = valor(i.saborId, i.tamanho)
          return (
            <li key={i.nome} className="flex items-center justify-between gap-2 py-2">
              <span className="min-w-0">
                <span className="block font-bold">{i.nome}</span>
                <span className={`block text-[13px] ${c < s ? 'text-vermelho' : 'text-cinza'}`}>sistema {s}{c !== s && ` · diferença ${c - s}`}</span>
              </span>
              <Stepper compacto rotulo={i.nome} valor={c} aoMudar={(v) => setContado({ ...contado, [chaveSaborTamanho(i.saborId, i.tamanho)]: v })} />
            </li>
          )
        })}
      </ul>
      <Botao bloco onClick={registrar}>Registrar contagem</Botao>
    </Folha>
  )
}

export function FolhaPerda({ aberta, aoFechar }: { aberta: boolean; aoFechar: () => void }) {
  const cad = useCadastros()
  const [saborId, setSaborId] = useState(cad.sabores[0]?.id ?? '')
  const [tamanho, setTamanho] = useState<CodigoTamanho>('pequeno')
  const [qtd, setQtd] = useState(1)
  const [motivo, setMotivo] = useState<'validade' | 'quebra' | 'outro'>('quebra')

  async function registrar() {
    try {
      const estoque = await carregarEstoque()
      // A perda sai do lote mais velho; se não houver lote, sai sem lote.
      for (const a of ajustesDeContagem(estoque.lotes, estoque.saldoLote, saborId, tamanho, -qtd)) {
        await registrarPerda({ loteId: a.loteId, saborId, tamanho, qtd: -a.qtd, motivo }, { horaViradaDia: cad.config.horaViradaDia })
      }
      mostrarToast(`Perda de ${qtd} registrada (${motivo})`)
      setQtd(1)
      aoFechar()
    } catch (e) {
      mostrarErro(e)
    }
  }

  return (
    <Folha aberta={aberta} aoFechar={aoFechar} titulo="Registrar perda">
      <div className="space-y-4">
        <EscolhaItem saborId={saborId} tamanho={tamanho} aoMudar={(s, t) => { setSaborId(s); setTamanho(t) }} />
        <div className="flex items-center justify-between"><span className="rotulo">Quantas peças</span><Stepper rotulo="peças" valor={qtd} min={1} aoMudar={setQtd} /></div>
        <Escolha rotulo="Motivo" valor={motivo} aoMudar={setMotivo}
          opcoes={[{ valor: 'validade', rotulo: 'Validade' }, { valor: 'quebra', rotulo: 'Quebra' }, { valor: 'outro', rotulo: 'Outro' }]} />
        <Botao bloco variante="perigo" onClick={registrar}>Registrar perda</Botao>
      </div>
    </Folha>
  )
}

export function FolhaAmostra({ aberta, aoFechar, hoje }: { aberta: boolean; aoFechar: () => void; hoje: string }) {
  const cad = useCadastros()
  const [local, setLocal] = useState('')
  const [qtd, setQtd] = useState(1)
  const [deRecorte, setDeRecorte] = useState(true)
  const [saborId, setSaborId] = useState(cad.sabores[0]?.id ?? '')
  const [tamanho, setTamanho] = useState<CodigoTamanho>('pequeno')

  async function registrar() {
    try {
      await registrarAmostra({ local, qtd, deRecorte, saborId: deRecorte ? undefined : saborId, tamanho: deRecorte ? undefined : tamanho },
        { horaViradaDia: cad.config.horaViradaDia, hoje })
      mostrarToast(deRecorte ? 'Amostra de recorte registrada (não baixa estoque)' : `Amostra de ${qtd} peças baixada do estoque`)
      setLocal('')
      setQtd(1)
      aoFechar()
    } catch (e) {
      mostrarErro(e)
    }
  }

  return (
    <Folha aberta={aberta} aoFechar={aoFechar} titulo="Amostra grátis">
      <div className="space-y-4">
        <Campo rotulo="Onde" value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Salão La Provence" />
        <Escolha rotulo="Tipo" valor={deRecorte ? 'recorte' : 'inteira'} aoMudar={(v) => setDeRecorte(v === 'recorte')}
          opcoes={[{ valor: 'recorte', rotulo: 'Recorte' }, { valor: 'inteira', rotulo: 'Peça inteira' }]} />
        {!deRecorte && <EscolhaItem saborId={saborId} tamanho={tamanho} aoMudar={(s, t) => { setSaborId(s); setTamanho(t) }} />}
        <div className="flex items-center justify-between"><span className="rotulo">{deRecorte ? 'Porções' : 'Peças'}</span><Stepper rotulo="quantidade" valor={qtd} min={1} aoMudar={setQtd} /></div>
        <Botao bloco onClick={registrar}>Registrar amostra</Botao>
      </div>
    </Folha>
  )
}
