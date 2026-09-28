import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight } from 'lucide-react'
import { db } from '@/lib/db/banco'
import { useSessaoOpcional } from '@/lib/sessao'
import { nuvem } from '@/lib/sync/nuvem'
import { baixarMembrosDoUsuario, entrarComEmail, useUsuarioNuvem } from '@/lib/sync/auth'
import { aceitarConvite, criarEmpresaEEntrar, entrarComo } from '@/lib/operacoes/acesso'
import { Aviso, Botao, Campo, Escolha } from '@/components/ui/basicos'
import { Folha } from '@/components/ui/Folha'
import { mostrarErro, Toasts } from '@/components/ui/Toast'

const PAPEL_ROTULO = { dono: 'dono', mentor: 'mentor', equipe: 'equipe', parceiro: 'parceiro' }

function Marca() {
  return (
    <div className="py-10 text-center">
      <div className="filete-duplo mx-auto mb-5 w-24" aria-hidden />
      <p className="font-titulo text-4xl font-bold tracking-[0.12em]">OLD</p>
      <p className="font-titulo text-4xl font-bold tracking-[0.12em]">BROWNIES</p>
      <p className="mt-3 text-[13px] uppercase tracking-[0.32em] text-cinza">Brownies artesanais · Cuiabá</p>
      <div className="filete-duplo mx-auto mt-5 w-24" aria-hidden />
    </div>
  )
}

function LoginNuvem() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [criar, setCriar] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    try {
      await entrarComEmail(email, senha, criar)
    } catch (erro) {
      mostrarErro(erro)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <Campo rotulo="E-mail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Campo rotulo="Senha" type="password" autoComplete={criar ? 'new-password' : 'current-password'} required minLength={6}
        value={senha} onChange={(e) => setSenha(e.target.value)} />
      <Botao type="submit" bloco disabled={enviando}>{criar ? 'Criar conta' : 'Entrar'}</Botao>
      <Botao variante="fantasma" bloco onClick={() => setCriar(!criar)}>{criar ? 'Já tenho conta' : 'Primeiro acesso: criar conta'}</Botao>
    </form>
  )
}

export function Entrar() {
  const sessao = useSessaoOpcional()
  const usuario = useUsuarioNuvem()
  const [folha, setFolha] = useState<'criar' | 'convite' | null>(null)
  const [nome, setNome] = useState('')
  const [nomeEmpresa, setNomeEmpresa] = useState('Old Brownies')
  const [papel, setPapel] = useState<'dono' | 'mentor'>('dono')
  const [codigo, setCodigo] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (usuario) baixarMembrosDoUsuario(usuario.id).catch(mostrarErro)
  }, [usuario])

  const dados = useLiveQuery(async () => {
    const membros = (await db.membros.toArray()).filter((m) => !m.deletedAt && (!usuario || m.userId === usuario.id))
    const empresas = new Map((await db.empresas.toArray()).map((e) => [e.id, e.nome]))
    return membros.map((m) => ({ membro: m, empresa: empresas.get(m.empresaId) ?? 'Empresa' }))
  }, [usuario?.id])

  if (sessao) return <Navigate to="/" replace />

  async function executar(acao: () => Promise<void>) {
    setEnviando(true)
    try {
      await acao()
    } catch (e) {
      mostrarErro(e)
    } finally {
      setEnviando(false)
    }
  }

  const precisaLogin = nuvem && usuario === null

  return (
    <main className="mx-auto min-h-dvh max-w-[30rem] px-4 pb-16">
      <Marca />
      {usuario === undefined && <p className="text-center text-cinza">Verificando a conta…</p>}
      {precisaLogin && <LoginNuvem />}

      {!precisaLogin && usuario !== undefined && (
        <div className="space-y-6">
          {!nuvem && (
            <Aviso tom="neutro">
              Modo deste aparelho: sem nuvem configurada, os dados ficam só aqui. Dá para testar os três perfis
              com convites neste mesmo aparelho.
            </Aviso>
          )}

          {!!dados?.length && (
            <section className="space-y-2">
              <p className="rotulo">Quem está usando?</p>
              {dados.map(({ membro, empresa }) => (
                <button
                  key={membro.id}
                  type="button"
                  onClick={() => entrarComo(membro, usuario?.email)}
                  className="flex min-h-16 w-full items-center gap-3 rounded-deco border border-fio bg-carvao px-4 text-left active:scale-[0.99]"
                >
                  <span className="flex-1">
                    <span className="block text-lg font-bold">{membro.nome}</span>
                    <span className="block text-[13px] uppercase tracking-[0.08em] text-cinza">{PAPEL_ROTULO[membro.papel]} · {empresa}</span>
                  </span>
                  <ChevronRight className="size-5 text-cinza" aria-hidden />
                </button>
              ))}
            </section>
          )}

          <div className="space-y-3">
            <Botao bloco variante={dados?.length ? 'secundario' : 'primario'} onClick={() => setFolha('criar')}>Criar a empresa</Botao>
            <Botao bloco variante="fantasma" onClick={() => setFolha('convite')}>Tenho um código de convite</Botao>
          </div>
        </div>
      )}

      <Folha aberta={folha === 'criar'} aoFechar={() => setFolha(null)} titulo="Criar a empresa">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault()
          void executar(() => criarEmpresaEEntrar({ nomeEmpresa, nome, papel, userId: usuario?.id, email: usuario?.email }))
        }}>
          <Campo rotulo="Empresa" required value={nomeEmpresa} onChange={(e) => setNomeEmpresa(e.target.value)} />
          <Campo rotulo="Seu nome" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Gabriel" />
          <Escolha rotulo="Seu papel" valor={papel} aoMudar={setPapel}
            opcoes={[{ valor: 'dono', rotulo: 'Dono' }, { valor: 'mentor', rotulo: 'Mentor' }]} />
          <p className="text-[13px] text-cinza">
            A empresa nasce calibrada com os números da planilha v4 (custos, cardápio, canais, rotina da semana).
            Depois, convide os outros por código em Mais → Convites.
          </p>
          <Botao type="submit" bloco disabled={enviando}>Criar e entrar</Botao>
        </form>
      </Folha>

      <Folha aberta={folha === 'convite'} aoFechar={() => setFolha(null)} titulo="Entrar com convite">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault()
          void executar(() => aceitarConvite(codigo, nome, usuario?.email))
        }}>
          <Campo rotulo="Código" required value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            className="font-titulo text-2xl tracking-[0.3em]" maxLength={6} autoCapitalize="characters" />
          <Campo rotulo="Seu nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
          <Botao type="submit" bloco disabled={enviando}>Entrar</Botao>
        </form>
      </Folha>
      <Toasts />
    </main>
  )
}
