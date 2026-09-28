// Nuvem opcional (Supabase / Lovable Cloud). Sem as variáveis, o app roda só no aparelho.
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const nuvem = url && chave ? createClient(url, chave, { auth: { persistSession: true } }) : null

// Tabelas e colunas na nuvem em snake_case: receitaItens → receita_itens, updatedAt → updated_at.
export const paraSnake = (s: string) => s.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`)
export const paraCamel = (s: string) => s.replace(/_([a-z])/g, (_, l: string) => l.toUpperCase())

export function chavesPara(obj: Record<string, unknown>, conversor: (s: string) => string) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [conversor(k), v]))
}
