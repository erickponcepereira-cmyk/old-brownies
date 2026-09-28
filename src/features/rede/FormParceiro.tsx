import { useState } from 'react'
import type { Parceiro, StatusParceiro, TipoParceiro } from '@/lib/db/tipos'
import { POLOS } from '@/lib/db/sementes'
import { useCadastros } from '@/lib/dados/cadastros'
import { somarDias } from '@/lib/motor/dia'
import { DIAS_CURTOS, DIAS_SEMANA } from '@/lib/formato'
import { cx } from '@/lib/cx'
import { salvarParceiro } from '@/lib/operacoes/rede'
import { DIAS_TESTE_PONTO } from '@/lib/motor/rede'
import type { NovoRegistro } from '@/lib/sync/gravar'
import { Botao, Campo, Escolha } from '@/components/ui/basicos'
import { mostrarErro, mostrarToast } from '@/components/ui/Toast'

export const STATUS: Array<{ valor: StatusParceiro; rotulo: string }> = [
  { valor: 'candidato', rotulo: 'Candidato' }, { valor: 'treino', rotulo: 'Treino' }, { valor: 'teste', rotulo: 'Teste' },
  { valor: 'ativo', rotulo: 'Ativo' }, { valor: 'pausado', rotulo: 'Pausado' }, { valor: 'saiu', rotulo: 'Saiu' },
]

export const TIPOS: Array<{ valor: TipoParceiro; rotulo: string }> = [
  { valor: 'vendedor', rotulo: 'Vendedor' }, { valor: 'motorista', rotulo: 'Motorista' }, { valor: 'ponto', rotulo: 'Ponto' },
]

export function FormParceiro({ parceiro, tipoInicial, hoje, aoSalvar }: {
  parceiro?: Parceiro
  tipoInicial: TipoParceiro
  hoje: string
  aoSalvar: () => void
}) {
  const cad = useCadastros()
  const [p, setP] = useState<NovoRegistro<Parceiro>>(() => parceiro ?? {
    tipo: tipoInicial, nome: '', whatsapp: '', status: tipoInicial === 'ponto' ? 'teste' : 'candidato', dataEntrada: hoje,
    noites: [], diaVisita: tipoInicial === 'ponto' ? 2 : undefined,
    fimTeste: tipoInicial === 'ponto' ? somarDias(hoje, DIAS_TESTE_PONTO) : undefined,
  })
  const mudar = <K extends keyof Parceiro>(k: K, v: Parceiro[K]) => setP({ ...p, [k]: v })
  const alternarNoite = (d: number) => mudar('noites', p.noites?.includes(d) ? p.noites.filter((n) => n !== d) : [...(p.noites ?? []), d].sort())

  async function salvar() {
    try {
      await salvarParceiro(p, parceiro?.id)
      mostrarToast(`${p.nome} salvo`)
      aoSalvar()
    } catch (e) {
      mostrarErro(e)
    }
  }

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void salvar() }}>
      {!parceiro && <Escolha rotulo="Tipo" valor={p.tipo} aoMudar={(t) => mudar('tipo', t)} opcoes={TIPOS} />}
      <Campo rotulo={p.tipo === 'ponto' ? 'Nome do ponto' : 'Nome'} required value={p.nome} onChange={(e) => mudar('nome', e.target.value)} />
      <Campo rotulo="WhatsApp" type="tel" inputMode="tel" value={p.whatsapp} onChange={(e) => mudar('whatsapp', e.target.value)} placeholder="65 99999-0000" />
      <Escolha rotulo="Status" valor={p.status} aoMudar={(s) => mudar('status', s)} opcoes={STATUS} />
      <Campo rotulo="Entrou em" type="date" value={p.dataEntrada} onChange={(e) => mudar('dataEntrada', e.target.value)} />

      {p.tipo === 'vendedor' && (
        <>
          <label className="block space-y-1">
            <span className="rotulo">Zona da rota</span>
            <select className="campo" value={p.zona ?? ''} onChange={(e) => mudar('zona', e.target.value || undefined)}>
              <option value="">Sem zona</option>
              {[...cad.zonas].sort((a, b) => a.codigo.localeCompare(b.codigo)).map((z) => <option key={z.codigo} value={z.codigo}>{z.codigo} · {z.nome}</option>)}
            </select>
          </label>
          <fieldset>
            <legend className="rotulo mb-1">Noites</legend>
            <div className="grid grid-cols-7 gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <button key={d} type="button" aria-pressed={p.noites?.includes(d)} onClick={() => alternarNoite(d)}
                  className={cx('min-h-12 rounded-deco border text-[14px] font-bold', p.noites?.includes(d) ? 'border-osso bg-osso text-tinta' : 'border-fio')}>
                  {DIAS_CURTOS[d]}
                </button>
              ))}
            </div>
          </fieldset>
        </>
      )}

      {p.tipo === 'ponto' && (
        <>
          <label className="block space-y-1">
            <span className="rotulo">Polo</span>
            <select className="campo" value={p.polo ?? ''} onChange={(e) => mudar('polo', e.target.value || undefined)}>
              <option value="">Sem polo</option>
              {POLOS.map((polo) => <option key={polo.codigo} value={polo.codigo}>{polo.codigo} · {polo.nome}</option>)}
            </select>
          </label>
          <Campo rotulo="Endereço" value={p.endereco ?? ''} onChange={(e) => mudar('endereco', e.target.value)} />
          <label className="block space-y-1">
            <span className="rotulo">Dia da visita</span>
            <select className="campo" value={p.diaVisita ?? ''} onChange={(e) => mudar('diaVisita', Number(e.target.value) || undefined)}>
              <option value="">Sem dia fixo</option>
              {DIAS_SEMANA.slice(1).map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
            </select>
          </label>
          <Campo rotulo="Fim do teste de 30 dias" type="date" value={p.fimTeste ?? ''} onChange={(e) => mudar('fimTeste', e.target.value || undefined)} />
        </>
      )}

      <label className="block space-y-1">
        <span className="rotulo">Observações</span>
        <textarea className="campo min-h-20 py-2" value={p.observacoes ?? ''} onChange={(e) => mudar('observacoes', e.target.value)} />
      </label>
      <Botao type="submit" bloco>Salvar</Botao>
    </form>
  )
}
