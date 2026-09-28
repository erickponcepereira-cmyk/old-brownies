import { useState } from 'react'
import type { Config, Insumo } from '@/lib/db/tipos'
import { useSessao } from '@/lib/sessao'
import { useCadastros } from '@/lib/dados/cadastros'
import { numero, reais } from '@/lib/formato'
import { atualizar } from '@/lib/sync/gravar'
import { Botao, Campo } from '@/components/ui/basicos'
import { Folha } from '@/components/ui/Folha'
import { Secao, Tela } from '@/components/ui/Tela'
import { mostrarErro, mostrarToast } from '@/components/ui/Toast'

type CampoConfig = { chave: keyof Config; rotulo: string; pct?: boolean; dica?: string }

const CAMPOS: CampoConfig[] = [
  { chave: 'taxaMaquininha', rotulo: 'Taxa da maquininha (%)', pct: true, dica: 'conferir a taxa real' },
  { chave: 'comissaoIfood', rotulo: 'Comissão do iFood (%)', pct: true, dica: 'preencher na reativação' },
  { chave: 'provisaoImposto', rotulo: 'Provisão de imposto (%)', pct: true },
  { chave: 'precoFinalRevenda', rotulo: 'Preço final de revenda (R$)' },
  { chave: 'metaLojaDia', rotulo: 'Meta da loja por dia (peças)' },
  { chave: 'diariaProducao', rotulo: 'Diária de produção (R$)' },
  { chave: 'capacidadeJornada', rotulo: 'Formas por jornada' },
  { chave: 'gasMesReferencia', rotulo: 'Gás por mês na referência (R$)' },
  { chave: 'formasReferencia', rotulo: 'Formas por semana na referência' },
  { chave: 'semanasPorMes', rotulo: 'Semanas por mês' },
  { chave: 'diasValidade', rotulo: 'Validade padrão (dias)' },
  { chave: 'diasMaxNoPonto', rotulo: 'Dias máximos no ponto' },
  { chave: 'horaViradaDia', rotulo: 'Hora em que o dia comercial vira' },
]

const paraNumero = (s: string) => Number(s.replace(/\./g, '').replace(',', '.'))
const mostrar = (v: number | null, ehPct?: boolean) => (v === null ? '' : numero(ehPct ? v * 100 : v, ehPct ? 2 : 3).replace(/,?0+$/, ''))

export function Configuracoes() {
  const sessao = useSessao()
  const cad = useCadastros()
  const dono = sessao.papel === 'dono'
  const [valores, setValores] = useState(() => Object.fromEntries(CAMPOS.map((c) => [c.chave, mostrar(cad.config[c.chave] as number | null, c.pct)])))
  const [empresa, setEmpresa] = useState({ nome: cad.empresa.nome, razaoSocial: cad.empresa.razaoSocial, cnpj: cad.empresa.cnpj, chavePix: cad.empresa.chavePix, endereco: cad.empresa.endereco })
  const [insumo, setInsumo] = useState<Insumo | null>(null)
  const [precoInsumo, setPrecoInsumo] = useState('')

  async function salvarConfig() {
    const patch: Partial<Config> = {}
    for (const c of CAMPOS) {
      const bruto = valores[c.chave].trim()
      const n = paraNumero(bruto)
      if (c.chave === 'comissaoIfood' && !bruto) { patch.comissaoIfood = null; continue }
      if (!Number.isFinite(n)) return mostrarErro(`Valor inválido em ${c.rotulo}`)
      ;(patch as Record<string, number>)[c.chave] = c.pct ? n / 100 : n
    }
    try {
      await atualizar('configs', cad.config.id, patch)
      await atualizar('empresas', cad.empresa.id, empresa)
      mostrarToast('Configurações salvas')
    } catch (e) {
      mostrarErro(e)
    }
  }

  return (
    <Tela titulo="Empresa e configurações" voltar subtitulo={dono ? 'Só o dono altera' : 'Leitura'}>
      <fieldset disabled={!dono} className="space-y-7">
        <Secao titulo="Empresa">
          <div className="space-y-3">
            <Campo rotulo="Nome" value={empresa.nome} onChange={(e) => setEmpresa({ ...empresa, nome: e.target.value })} />
            <Campo rotulo="Razão social" value={empresa.razaoSocial} onChange={(e) => setEmpresa({ ...empresa, razaoSocial: e.target.value })} />
            <Campo rotulo="CNPJ" value={empresa.cnpj} onChange={(e) => setEmpresa({ ...empresa, cnpj: e.target.value })} />
            <Campo rotulo="Chave Pix" value={empresa.chavePix} onChange={(e) => setEmpresa({ ...empresa, chavePix: e.target.value })} />
            <Campo rotulo="Endereço" value={empresa.endereco} onChange={(e) => setEmpresa({ ...empresa, endereco: e.target.value })} />
            <p className="text-[13px] text-cinza">Fuso: {cad.empresa.fuso}</p>
          </div>
        </Secao>

        <Secao titulo="Parâmetros">
          <div className="grid grid-cols-2 gap-3">
            {CAMPOS.map((c) => (
              <Campo key={c.chave} rotulo={c.rotulo} dica={c.dica} inputMode="decimal" value={valores[c.chave]}
                onChange={(e) => setValores({ ...valores, [c.chave]: e.target.value })} />
            ))}
          </div>
        </Secao>
        {dono && <Botao bloco onClick={salvarConfig}>Salvar</Botao>}
      </fieldset>

      <Secao titulo="Insumos · preço usado">
        <p className="mb-2 text-[13px] text-cinza">Sem compra lançada, vale o preço manual. Compras e fichas técnicas chegam na fase 2.</p>
        <ul className="divide-y divide-fio border-y border-fio">
          {[...cad.insumos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map((i) => (
            <li key={i.id}>
              <button type="button" disabled={!dono} className="flex min-h-12 w-full items-baseline justify-between gap-2 py-2 text-left disabled:cursor-default"
                onClick={() => { setInsumo(i); setPrecoInsumo(String(i.precoManual).replace('.', ',')) }}>
                <span className="min-w-0">
                  <span className="block font-bold">{i.nome}</span>
                  {i.observacao && <span className="block text-[12px] text-ambar">{i.observacao}</span>}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-bold">{reais(cad.tabela.precos[i.id])}<span className="text-[12px] text-cinza"> /{i.unidade}</span></span>
                  {Math.abs(cad.tabela.precos[i.id] - i.precoManual) > 1e-9 && <span className="block text-[12px] text-cinza">manual {reais(i.precoManual)}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Secao>

      <Folha aberta={!!insumo} aoFechar={() => setInsumo(null)} titulo={insumo?.nome ?? ''}>
        <form className="space-y-3" onSubmit={(e) => {
          e.preventDefault()
          const n = paraNumero(precoInsumo)
          if (!insumo || !Number.isFinite(n) || n < 0) return
          atualizar('insumos', insumo.id, { precoManual: n, observacao: insumo.codigo === 'etiqueta' ? undefined : insumo.observacao })
            .then(() => { mostrarToast('Preço salvo: o custo do brownie já foi recalculado'); setInsumo(null) }).catch(mostrarErro)
        }}>
          <Campo rotulo={`Preço manual por ${insumo?.unidade}`} inputMode="decimal" value={precoInsumo} onChange={(e) => setPrecoInsumo(e.target.value)} />
          <Botao type="submit" bloco>Salvar</Botao>
        </form>
      </Folha>
    </Tela>
  )
}
