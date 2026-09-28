// B5.10 — checklist: tarefas do dia e cumprimento.
import { diaSemanaIso } from './dia'

export interface TarefaRotina {
  diaSemana: number
  ativa: boolean
  papel: 'dono' | 'equipe'
  inicio: string
  validaDe?: string
  validaAte?: string
}

export function rotinaDoDia<T extends TarefaRotina>(tarefas: T[], data: string, papel?: 'dono' | 'equipe'): T[] {
  const dia = diaSemanaIso(data)
  return tarefas
    .filter((t) => t.ativa && t.diaSemana === dia)
    .filter((t) => (!t.validaDe || t.validaDe <= data) && (!t.validaAte || t.validaAte >= data))
    .filter((t) => !papel || t.papel === papel)
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
}

export function cumprimento(tarefas: Array<{ obrigatoria: boolean; feita: boolean }>) {
  const obrigatorias = tarefas.filter((t) => t.obrigatoria)
  const feitas = obrigatorias.filter((t) => t.feita).length
  return { feitas, obrigatorias: obrigatorias.length, pct: obrigatorias.length ? feitas / obrigatorias.length : null }
}
