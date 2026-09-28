// Monta as tarefas de um dia (B5.10): rotina vigente + avulsas + tarefas do mentor ainda não feitas.
import type { ChecklistItem, RotinaTarefa, TarefaAvulsa, TipoTarefa } from '@/lib/db/tipos'
import { rotinaDoDia } from '@/lib/motor/checklist'
import { dataLocal } from '@/lib/motor/dia'

export interface LinhaTarefa {
  chave: string
  titulo: string
  detalhe: string
  inicio?: string
  fim?: string
  tipo?: TipoTarefa
  obrigatoria: boolean
  atalho?: string
  origem?: TarefaAvulsa['origem']
  rotinaTarefaId?: string
  tarefaAvulsaId?: string
  item?: ChecklistItem
  status: 'feito' | 'pulado' | 'pendente'
}

export interface DadosChecklist { rotina: RotinaTarefa[]; avulsas: TarefaAvulsa[]; itens: ChecklistItem[] }

export const ATALHOS: Record<string, { rotulo: string; para: string | null }> = {
  'venda:loja': { rotulo: 'Vender na loja', para: '/vender?canal=loja' },
  'venda:rota': { rotulo: 'Vender na rota', para: '/vender?canal=rota' },
  'venda:feira': { rotulo: 'Vender na feira', para: '/vender?canal=feira' },
  'venda:evento': { rotulo: 'Vender no evento', para: '/vender?canal=evento' },
  'mensagens:pontos': { rotulo: 'Mensagens aos pontos', para: '/rede?aba=ponto&mensagem=segunda' },
  'mensagens:todos': { rotulo: 'Mensagens a todos', para: '/rede?mensagem=quinta' },
  producao: { rotulo: 'Lançar produção', para: '/producao' },
  placar: { rotulo: 'Placar da semana', para: '/placar' },
  estoque: { rotulo: 'Estoque', para: '/estoque' },
  'estoque:previsao': { rotulo: 'Previsão sex + sáb', para: '/estoque?ver=previsao' },
  visita: { rotulo: 'Visita ao ponto', para: '/visita' },
  repasse: { rotulo: 'Repasse a parceiro', para: '/repasse' },
  rede: { rotulo: 'Parceiros', para: '/rede' },
  captacao: { rotulo: 'Captação chega na fase 2', para: null },
}

const statusDe = (item?: ChecklistItem, feitaEm?: string): LinhaTarefa['status'] =>
  item?.status ?? (feitaEm ? 'feito' : 'pendente')

export function montarDia(d: DadosChecklist, data: string, papel: 'dono' | 'equipe', hoje: string): LinhaTarefa[] {
  const doDia = d.itens.filter((i) => i.data === data)
  const rotina = rotinaDoDia(d.rotina, data, papel).map((t): LinhaTarefa => {
    const item = doDia.find((i) => i.rotinaTarefaId === t.id)
    return {
      chave: t.id, titulo: t.titulo, detalhe: t.detalhe, inicio: t.inicio, fim: t.fim, tipo: t.tipo,
      obrigatoria: t.obrigatoria, atalho: t.atalho, rotinaTarefaId: t.id, item, status: statusDe(item),
    }
  })
  // Avulsas ficam no Hoje até serem feitas; nos dias passados, aparecem só na própria data.
  const avulsas = d.avulsas
    .filter((t) => (t.papel ?? 'dono') === papel)
    .filter((t) => (data === hoje
      ? t.data <= hoje && (!t.feitaEm || dataLocal(new Date(t.feitaEm)) === hoje)
      : t.data === data))
    .map((t): LinhaTarefa => {
      const item = doDia.find((i) => i.tarefaAvulsaId === t.id)
      return {
        chave: t.id, titulo: t.titulo, detalhe: t.detalhe, obrigatoria: false, origem: t.origem,
        tarefaAvulsaId: t.id, item, status: statusDe(item, t.feitaEm),
      }
    })
  return [...avulsas, ...rotina]
}

export function tarefaDaHora(linhas: LinhaTarefa[], agora: string): string | undefined {
  return linhas.find((l) => l.inicio && l.fim && l.inicio <= agora && agora < (l.fim === '00:00' ? '24:00' : l.fim))?.chave
}
