// Entrar, criar empresa, convites e registro de último acesso.
import { db } from '@/lib/db/banco'
import type { Membro, Papel } from '@/lib/db/tipos'
import { criarEmpresa } from '@/lib/db/semear'
import { definirSessao, exigirSessao, sessaoAtual } from '@/lib/sessao'
import { atualizar, gravar, gravarSemSessao, novoId, op } from '@/lib/sync/gravar'
import { nuvem } from '@/lib/sync/nuvem'
import { puxarTudoDeNovo } from '@/lib/sync/sincronizar'

const VALIDADE_CONVITE_DIAS = 7
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sem 0/O, 1/I
const ACESSO_MINIMO_MS = 30 * 60_000

export function entrarComo(membro: Membro, email?: string) {
  definirSessao({
    userId: membro.userId, membroId: membro.id, nome: membro.nome, papel: membro.papel, empresaId: membro.empresaId, email,
  })
}

export async function criarEmpresaEEntrar(p: { nomeEmpresa: string; nome: string; papel: 'dono' | 'mentor'; userId?: string; email?: string }) {
  const userId = p.userId ?? novoId()
  const { membroId } = await criarEmpresa({ nomeEmpresa: p.nomeEmpresa, criador: { userId, nome: p.nome, papel: p.papel } })
  entrarComo((await db.membros.get(membroId))!, p.email)
}

function gerarCodigo(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return [...bytes].map((b) => ALFABETO[b % ALFABETO.length]).join('')
}

// A empresa tem um único dono.
async function jaTemDono(empresaId: string) {
  return (await db.membros.where('empresaId').equals(empresaId).toArray()).some((m) => !m.deletedAt && m.papel === 'dono')
}

export async function gerarConvite(papel: Papel) {
  const sessao = exigirSessao()
  if (papel === 'dono' && await jaTemDono(sessao.empresaId)) throw new Error('A empresa já tem dono.')
  const codigo = gerarCodigo()
  const expiraEm = new Date(Date.now() + VALIDADE_CONVITE_DIAS * 86_400_000).toISOString()
  await gravar(op('convites', { codigo, papel, criadoPor: sessao.nome, expiraEm }))
  return codigo
}

// Sem nuvem, o convite vale neste aparelho (útil para testar os três perfis).
async function aceitarConviteLocal(codigo: string, nome: string) {
  const convite = (await db.convites.where('codigo').equals(codigo).toArray())
    .find((c) => !c.deletedAt && !c.usadoPor && c.expiraEm > new Date().toISOString())
  if (!convite) throw new Error('Código inválido, já usado ou vencido.')
  if (convite.papel === 'dono' && await jaTemDono(convite.empresaId)) throw new Error('A empresa já tem dono.')
  const userId = novoId()
  const membroId = novoId()
  const autor = { empresaId: convite.empresaId, userId }
  await gravarSemSessao(autor, [
    op('membros', { id: membroId, userId, papel: convite.papel, nome }),
    op('convites', { ...convite, usadoPor: nome }),
  ])
  entrarComo((await db.membros.get(membroId))!)
}

// Com nuvem: a função aceitar_convite (no backend) valida o código e cria o membro.
async function aceitarConviteNuvem(codigo: string, nome: string, email?: string) {
  const { data, error } = await nuvem!.rpc('aceitar_convite', { p_codigo: codigo, p_nome: nome })
  if (error) throw new Error(error.message)
  const { empresa_id: empresaId, membro_id: membroId, papel, user_id: userId } = data as Record<string, string>
  definirSessao({ userId, membroId, nome, papel: papel as Papel, empresaId, email })
  await puxarTudoDeNovo(empresaId)
}

export function aceitarConvite(codigo: string, nome: string, email?: string) {
  const limpo = codigo.trim().toUpperCase()
  return nuvem ? aceitarConviteNuvem(limpo, nome, email) : aceitarConviteLocal(limpo, nome)
}

export async function registrarAcesso() {
  const sessao = sessaoAtual()
  if (!sessao || sessao.papel === 'mentor') return
  const membro = await db.membros.get(sessao.membroId)
  if (!membro) return
  const ultimo = membro.ultimoAcesso ? Date.parse(membro.ultimoAcesso) : 0
  if (Date.now() - ultimo < ACESSO_MINIMO_MS) return
  await atualizar('membros', membro.id, { ultimoAcesso: new Date().toISOString(), pendentesSync: await db.outbox.count() })
}

export function sair() {
  definirSessao(null)
}
