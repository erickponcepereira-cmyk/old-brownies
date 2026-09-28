// Contexto num módulo próprio: o recarregamento do Vite não recria o objeto e as telas continuam achando o provider.
import { createContext } from 'react'
import type { Cadastros } from './cadastros'

export const ContextoCadastros = createContext<Cadastros | null>(null)
