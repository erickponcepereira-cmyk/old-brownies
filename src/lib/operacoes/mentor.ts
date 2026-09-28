// Mentor: recados e tarefas que aparecem no Hoje do dono, e a área privada.
import type { ConfigMentor, CustoFixo } from '@/lib/db/tipos'
import { atualizar, excluir, gravar, op, type NovoRegistro } from '@/lib/sync/gravar'

export const enviarRecado = (texto: string) =>
  gravar(op('recadosMentor', { texto, criadoEm: new Date().toISOString() }))

export const marcarRecadoLido = (id: string) =>
  atualizar('recadosMentor', id, { lidoEm: new Date().toISOString() })

export const criarTarefaMentor = (t: { titulo: string; detalhe: string; data: string }) =>
  gravar(op('tarefasAvulsas', { ...t, origem: 'mentor', papel: 'dono' }))

export const excluirTarefaMentor = (id: string) => excluir('tarefasAvulsas', id)

export async function salvarNota(texto: string, id?: string) {
  if (id) await atualizar('notasMentor', id, { texto })
  else await gravar(op('notasMentor', { texto }))
}

export const excluirNota = (id: string) => excluir('notasMentor', id)

export async function salvarLimites(config: ConfigMentor | undefined, limites: ConfigMentor['limitesFaturamento']) {
  if (config) await atualizar('configsMentor', config.id, { limitesFaturamento: limites })
  else await gravar(op('configsMentor', { limitesFaturamento: limites }))
}

export async function salvarCustoFixo(dados: NovoRegistro<CustoFixo>, id?: string) {
  if (id) await atualizar('custosFixos', id, dados)
  else await gravar(op('custosFixos', dados))
}
