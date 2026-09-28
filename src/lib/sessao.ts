// Sessão do aparelho: fica salva para o app abrir sem internet com o último usuário.
import { useSyncExternalStore } from 'react'
import type { Papel } from '@/lib/db/tipos'

export interface Sessao {
  userId: string
  membroId: string
  nome: string
  papel: Papel
  empresaId: string
  email?: string
}

const CHAVE = 'ob.sessao'
const ouvintes = new Set<() => void>()

function ler(): Sessao | null {
  try {
    const bruto = localStorage.getItem(CHAVE)
    return bruto ? (JSON.parse(bruto) as Sessao) : null
  } catch {
    return null
  }
}

let atual: Sessao | null = ler()

export function sessaoAtual(): Sessao | null {
  return atual
}

export function exigirSessao(): Sessao {
  if (!atual) throw new Error('Sem sessão: entre de novo.')
  return atual
}

export function definirSessao(sessao: Sessao | null) {
  atual = sessao
  try {
    if (sessao) localStorage.setItem(CHAVE, JSON.stringify(sessao))
    else localStorage.removeItem(CHAVE)
  } catch {
    // Sem armazenamento (aba privada): a sessão vale só enquanto a aba estiver aberta.
  }
  ouvintes.forEach((f) => f())
}

function assinar(f: () => void) {
  ouvintes.add(f)
  return () => ouvintes.delete(f)
}

export function useSessaoOpcional(): Sessao | null {
  return useSyncExternalStore(assinar, sessaoAtual)
}

export function useSessao(): Sessao {
  const sessao = useSessaoOpcional()
  if (!sessao) throw new Error('useSessao fora de uma rota autenticada')
  return sessao
}

export const podeLancar = (papel: Papel) => papel === 'dono' || papel === 'equipe'
export const veCustos = (papel: Papel) => papel === 'dono' || papel === 'mentor'
