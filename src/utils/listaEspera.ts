import { supabase } from '../lib/supabase'

/**
 * Lista de espera do "Fale com o Educador" (18/11/2026, migração 027). Quem
 * se inscreve pode não ter login: grava pela função entrar_lista_espera, e
 * só o suporte lê a tabela (para avisar quando o grupo abrir).
 */
export type Inscricao = { nome: string; email: string; whatsapp: string }

export function validarInscricao(i: Inscricao): string | null {
  if (!i.nome.trim()) return 'Escreva o seu nome.'
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(i.email.trim())) return 'Confira o e-mail.'
  const digitos = i.whatsapp.replace(/\D/g, '')
  if (i.whatsapp.trim() && (digitos.length < 10 || digitos.length > 13)) return 'Confira o WhatsApp, com DDD.'
  return null
}

export async function entrarNaListaDeEspera(oferta: 'grupo', i: Inscricao): Promise<'ok' | 'falhou'> {
  const { error } = await supabase.rpc('entrar_lista_espera', {
    p_oferta: oferta, p_nome: i.nome.trim(), p_email: i.email.trim(), p_whatsapp: i.whatsapp.trim(),
  })
  if (error) { console.error('lista de espera:', error.message); return 'falhou' }
  return 'ok'
}
