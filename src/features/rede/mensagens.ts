// C16 — mensagens prontas de WhatsApp, com o nome já preenchido.
import type { Parceiro } from '@/lib/db/tipos'
import { DIAS_SEMANA } from '@/lib/formato'

export type Momento = 'segunda' | 'quinta'

const DIA_VISITA_PADRAO = 2 // terça: entrega nos pontos

export function textoDaMensagem(momento: Momento, parceiro: Parceiro, remetente: string): string {
  if (momento === 'segunda') {
    const dia = DIAS_SEMANA[parceiro.diaVisita ?? DIA_VISITA_PADRAO].toLowerCase()
    return `Bom dia, ${parceiro.nome}! Aqui é o ${remetente}, da Old Brownies. Como foi a semana aí? Me diz quantos brownies ainda estão no balcão que eu passo ${dia} para trocar e repor.`
  }
  if (parceiro.tipo === 'ponto') {
    return `Oi, ${parceiro.nome}! O fim de semana está chegando. Se o balcão estiver baixo, me avisa hoje que eu reforço antes de sexta.`
  }
  return `Fala, ${parceiro.nome}! Sexta e sábado são as noites que mais vendem. Quantos você ainda tem? Se precisar de forma nova, a retirada é na loja hoje, das 14h às 17h.`
}

export const TITULO_MOMENTO: Record<Momento, string> = {
  segunda: 'Mensagem de segunda aos pontos',
  quinta: 'Mensagem de quinta para todos',
}
