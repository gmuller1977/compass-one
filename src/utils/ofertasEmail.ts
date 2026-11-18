import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { aceiteDeOfertas, respondeuOfertas } from './mensagensRegras'
export { aceiteDeOfertas, respondeuOfertas, aceitouOfertas } from './mensagensRegras'

/**
 * Aceite de novidades e ofertas por e-mail (18/11/2026, Guilherme: "sim,
 * mantemos o aceite para mandar ofertas"). LGPD: a caixa nasce DESMARCADA,
 * e o app guarda a resposta e a data no user_metadata do login:
 *   ofertas_email     true | false
 *   ofertas_email_em  ISO da resposta
 * A função mensagem-email só manda comunicado por e-mail para quem tem
 * `ofertas_email === true`. A pessoa muda quando quiser no Perfil.
 *
 * Cadastro por e-mail grava no signUp. Pelo Google não há como mandar
 * metadado: a escolha fica no aparelho (CHAVE_PENDENTE) e é gravada assim
 * que o login volta. Quem nunca respondeu vê a pergunta no primeiro acesso.
 */
export const CHAVE_PENDENTE = 'compass-ofertas-email-pendente'

export async function gravarAceiteOfertas(aceitou: boolean): Promise<boolean> {
  const { error } = await supabase.auth.updateUser({ data: aceiteDeOfertas(aceitou) })
  if (error) console.error('ofertas_email', error)
  return !error
}

export function guardarEscolhaPendente(aceitou: boolean) {
  try { localStorage.setItem(CHAVE_PENDENTE, aceitou ? '1' : '0') } catch { /* sem armazenamento */ }
}

/** Depois do login pelo Google: grava a escolha feita no cadastro, uma vez. */
export async function aplicarEscolhaPendente(user: Pick<User, 'user_metadata'> | null) {
  let v: string | null = null
  try { v = localStorage.getItem(CHAVE_PENDENTE) } catch { return }
  if (v === null || !user) return
  try { localStorage.removeItem(CHAVE_PENDENTE) } catch { /* ok */ }
  if (respondeuOfertas(user)) return
  await gravarAceiteOfertas(v === '1')
}
