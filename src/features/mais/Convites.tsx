import { useState } from 'react'
import type { Papel } from '@/lib/db/tipos'
import { useRegistros } from '@/lib/dados/consultas'
import { dataHora } from '@/lib/formato'
import { gerarConvite } from '@/lib/operacoes/acesso'
import { temNuvem } from '@/lib/sync/sincronizar'
import { Aviso, Botao, Escolha, Selo } from '@/components/ui/basicos'
import { Secao, Tela } from '@/components/ui/Tela'
import { mostrarErro } from '@/components/ui/Toast'

const ROTULO: Record<Papel, string> = { dono: 'Dono', mentor: 'Mentor', equipe: 'Equipe', parceiro: 'Parceiro' }

export function Convites() {
  const membros = useRegistros('membros')
  const convites = useRegistros('convites')
  const temDono = membros?.some((m) => m.papel === 'dono')
  const opcoes: Array<{ valor: Papel; rotulo: string }> = [
    { valor: 'equipe', rotulo: 'Equipe' }, { valor: 'mentor', rotulo: 'Mentor' },
    ...(temDono ? [] : [{ valor: 'dono' as Papel, rotulo: 'Dono' }]),
  ]
  const [papel, setPapel] = useState<Papel>('equipe')
  const [codigo, setCodigo] = useState<string | null>(null)
  const agora = new Date().toISOString()

  return (
    <Tela titulo="Convites" voltar subtitulo="A empresa tem um único dono">
      {!temNuvem() && <Aviso tom="neutro">Sem nuvem, o código só funciona neste aparelho (Trocar de perfil → Tenho um código).</Aviso>}
      <Escolha rotulo="Convidar como" valor={papel} aoMudar={setPapel} opcoes={opcoes} />
      <Botao bloco onClick={() => gerarConvite(papel).then(setCodigo).catch(mostrarErro)}>Gerar código</Botao>
      {codigo && (
        <div className="moldura bg-carvao p-6 text-center">
          <p className="rotulo">Código de {ROTULO[papel].toLowerCase()} · vale 7 dias</p>
          <p className="mt-2 select-all font-titulo text-5xl font-bold tracking-[0.2em]">{codigo}</p>
        </div>
      )}

      <Secao titulo="Quem está na empresa">
        <ul className="divide-y divide-fio border-y border-fio">
          {membros?.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2">
              <span className="font-bold">{m.nome}</span><Selo>{ROTULO[m.papel]}</Selo>
            </li>
          ))}
        </ul>
      </Secao>

      <Secao titulo="Códigos gerados">
        <ul className="divide-y divide-fio border-y border-fio">
          {[...(convites ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 py-2">
              <span><span className="font-titulo font-bold tracking-[0.15em]">{c.codigo}</span> <span className="text-[13px] text-cinza">· {ROTULO[c.papel]}</span></span>
              {c.usadoPor ? <Selo tom="ok">usado · {c.usadoPor}</Selo>
                : c.expiraEm < agora ? <Selo>vencido</Selo>
                : <span className="text-[13px] text-cinza">até {dataHora(c.expiraEm)}</span>}
            </li>
          ))}
        </ul>
      </Secao>
    </Tela>
  )
}
