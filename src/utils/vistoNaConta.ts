import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

/**
 * "Já viu" guardado NA CONTA, e não só no navegador (11/10/2026).
 *
 * Relatado pelo Guilherme: entrando por outro computador, as telas de
 * explicação abriam todas de novo — o "visto" morava no localStorage. Hoje
 * ele vai para o `user_metadata` do login (Supabase Auth), que acompanha a
 * pessoa em qualquer aparelho e não pede migração. É por LOGIN, não pelo dono
 * das finanças: numa conta compartilhada cada pessoa vê a sua explicação uma
 * vez.
 *
 * O localStorage fica como cópia: responde na hora, e cobre a gravação que
 * falhou sem internet (a próxima marcação leva as duas).
 */

const CHAVE_LOCAL = (uid: string) => `compass:vistos:${uid}`

function vistosLocais(uid: string): string[] {
  try { return JSON.parse(localStorage.getItem(CHAVE_LOCAL(uid)) ?? '[]') as string[] } catch { return [] }
}

function vistosDaConta(user: User | null): string[] {
  const v = user?.user_metadata?.vistos
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

export function jaViu(user: User | null, chave: string): boolean {
  if (!user) return false
  return vistosDaConta(user).includes(chave) || vistosLocais(user.id).includes(chave)
}

export async function marcarVisto(user: User | null, chave: string): Promise<void> {
  if (!user) return
  const locais = vistosLocais(user.id)
  if (!locais.includes(chave)) {
    try { localStorage.setItem(CHAVE_LOCAL(user.id), JSON.stringify([...locais, chave])) } catch { /* aba anônima */ }
  }
  const todos = Array.from(new Set([...vistosDaConta(user), ...locais, chave]))
  if (todos.length === vistosDaConta(user).length) return
  const { error } = await supabase.auth.updateUser({ data: { vistos: todos } })
  if (error) console.warn('marcarVisto:', error.message)
}
