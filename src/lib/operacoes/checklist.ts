// Checklist: marcar feito/pulado (um toque / segurar) e editar a rotina valendo da semana seguinte.
import type { ChecklistItem, RotinaTarefa } from '@/lib/db/tipos'
import { exigirSessao } from '@/lib/sessao'
import { atualizar, excluir, gravar, op, type NovoRegistro } from '@/lib/sync/gravar'
import { inicioSemana, somarDias } from '@/lib/motor/dia'

export interface Marcacao {
  data: string
  rotinaTarefaId?: string
  tarefaAvulsaId?: string
  status: 'feito' | 'pulado'
  nota?: string
}

async function registrarFeitaAvulsa(tarefaAvulsaId: string | undefined, feita: boolean) {
  if (!tarefaAvulsaId || exigirSessao().papel !== 'dono') return
  await atualizar('tarefasAvulsas', tarefaAvulsaId, { feitaEm: feita ? new Date().toISOString() : undefined })
}

// Mesmo status de novo = desmarcar.
export async function marcar(m: Marcacao, existente?: ChecklistItem) {
  const sessao = exigirSessao()
  if (existente && existente.status === m.status && m.nota === undefined) {
    await excluir('checklistItens', existente.id)
    await registrarFeitaAvulsa(m.tarefaAvulsaId, false)
    return
  }
  const campos = { status: m.status, nota: m.nota, marcadoEm: new Date().toISOString(), marcadoPor: sessao.nome }
  if (existente) await atualizar('checklistItens', existente.id, campos)
  else await gravar(op('checklistItens', { data: m.data, rotinaTarefaId: m.rotinaTarefaId, tarefaAvulsaId: m.tarefaAvulsaId, ...campos }))
  await registrarFeitaAvulsa(m.tarefaAvulsaId, m.status === 'feito')
}

export type CamposRotina = Pick<RotinaTarefa, 'diaSemana' | 'inicio' | 'fim' | 'titulo' | 'detalhe' | 'tipo' | 'obrigatoria' | 'atalho' | 'papel'>

const proximaSegunda = (hoje: string) => somarDias(inicioSemana(hoje), 7)
const aindaNaoVale = (t: RotinaTarefa, hoje: string) => !!t.validaDe && t.validaDe > hoje

// Alterações valem da semana seguinte: a versão atual fecha no domingo e nasce uma nova na segunda.
export async function salvarRotina(tarefa: RotinaTarefa | null, campos: CamposRotina, hoje: string) {
  const segunda = proximaSegunda(hoje)
  if (tarefa && aindaNaoVale(tarefa, hoje)) {
    await atualizar('rotinaTarefas', tarefa.id, campos)
    return
  }
  if (tarefa) await atualizar('rotinaTarefas', tarefa.id, { validaAte: somarDias(segunda, -1) })
  const nova: NovoRegistro<RotinaTarefa> = { ...campos, ordem: tarefa?.ordem ?? 999, ativa: true, validaDe: segunda }
  await gravar(op('rotinaTarefas', nova))
}

export async function desativarRotina(tarefa: RotinaTarefa, hoje: string) {
  if (aindaNaoVale(tarefa, hoje)) await excluir('rotinaTarefas', tarefa.id)
  else await atualizar('rotinaTarefas', tarefa.id, { validaAte: somarDias(proximaSegunda(hoje), -1) })
}
