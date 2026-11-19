import { supabase } from '../lib/supabase'
import { comunicadosNaoLidos } from './mensagensRegras'
export { comunicadosNaoLidos, ehNovo, textoDoSelo } from './mensagensRegras'

/**
 * Caixa de mensagens (18/11/2026, pedido do Guilherme; migração 026):
 * comunicados do suporte para todos e a conversa de cada login com o
 * suporte. Por LOGIN, não pelo dono da conta compartilhada.
 *
 * Toda mensagem nova chama a função `mensagem-email`, que manda o e-mail
 * (pessoa → administradores; suporte → pessoa; comunicado → quem aceitou
 * novidades, se marcado). Falha no e-mail não desfaz a mensagem: ela já
 * está gravada e acende o selo no app.
 */

export type Comunicado = { id: number; titulo: string; texto: string; criado_em: string }
export type MensagemSuporte = { id: number; user_id: string; autor: 'pessoa' | 'suporte'; texto: string; criado_em: string; lida_em: string | null }
export type Conversa = { user_id: string; email: string; nome: string; ultima: string; ultima_em: string; ultima_autor: 'pessoa' | 'suporte'; nao_lidas: number }

export const EVENTO_MENSAGENS = 'compass-mensagens'
export const LIMITE_TEXTO = 4000

/** Avisa o selo para recontar (depois de ler ou mandar). */
export function avisarMudanca() {
  window.dispatchEvent(new Event(EVENTO_MENSAGENS))
}

const faltaMigracao = (msg: string) => /relation|does not exist|schema cache|function/i.test(msg)

export async function souSuporte(): Promise<boolean> {
  const { data, error } = await supabase.rpc('eh_suporte')
  return !error && data === true
}

export async function lerComunicados(): Promise<{ lista: Comunicado[]; lidos: Set<number>; erro: string }> {
  const [c, l] = await Promise.all([
    supabase.from('comunicados').select('id, titulo, texto, criado_em').order('criado_em', { ascending: false }).limit(200),
    supabase.from('comunicados_lidos').select('comunicado_id'),
  ])
  if (c.error) return { lista: [], lidos: new Set(), erro: faltaMigracao(c.error.message) ? 'falta-ativar' : 'Não foi possível carregar agora.' }
  return { lista: (c.data ?? []) as Comunicado[], lidos: new Set((l.data ?? []).map(x => x.comunicado_id as number)), erro: '' }
}

export async function marcarComunicadosLidos(ids: number[]) {
  if (!ids.length) return
  const { error } = await supabase.from('comunicados_lidos').upsert(ids.map(id => ({ comunicado_id: id })), { onConflict: 'user_id,comunicado_id', ignoreDuplicates: true })
  if (error) console.error('comunicados_lidos', error)
  avisarMudanca()
}

export async function lerConversa(userId: string): Promise<{ lista: MensagemSuporte[]; erro: string }> {
  const { data, error } = await supabase.from('mensagens_suporte').select('id, user_id, autor, texto, criado_em, lida_em')
    .eq('user_id', userId).order('criado_em', { ascending: true }).limit(500)
  if (error) return { lista: [], erro: faltaMigracao(error.message) ? 'falta-ativar' : 'Não foi possível carregar agora.' }
  return { lista: (data ?? []) as MensagemSuporte[], erro: '' }
}

export async function marcarConversaLida(userId: string) {
  const { error } = await supabase.rpc('marcar_conversa_lida', { p_user: userId })
  if (error) console.error('marcar_conversa_lida', error)
  avisarMudanca()
}

function avisarPorEmail(tipo: 'mensagem' | 'comunicado', id: number) {
  supabase.functions.invoke('mensagem-email', { body: { tipo, id } })
    .then(({ error }) => { if (error) console.warn('mensagem-email', error) })
    .catch(e => console.warn('mensagem-email', e))
}

export async function enviarMensagem(userId: string, autor: 'pessoa' | 'suporte', texto: string): Promise<{ msg: MensagemSuporte | null; erro: string }> {
  const t = texto.trim()
  if (!t) return { msg: null, erro: '' }
  const { data, error } = await supabase.from('mensagens_suporte').insert({ user_id: userId, autor, texto: t.slice(0, LIMITE_TEXTO) })
    .select('id, user_id, autor, texto, criado_em, lida_em').single()
  if (error || !data) return { msg: null, erro: 'Não foi possível enviar. Confira a internet e tente de novo.' }
  avisarPorEmail('mensagem', data.id as number)
  avisarMudanca()
  return { msg: data as MensagemSuporte, erro: '' }
}

export async function publicarComunicado(titulo: string, texto: string, porEmail: boolean): Promise<{ ok: boolean; erro: string }> {
  const { data, error } = await supabase.from('comunicados')
    .insert({ titulo: titulo.trim().slice(0, 120), texto: texto.trim().slice(0, LIMITE_TEXTO), avisar_por_email: porEmail })
    .select('id').single()
  if (error || !data) return { ok: false, erro: 'Não foi possível publicar. Tente de novo.' }
  if (porEmail) avisarPorEmail('comunicado', data.id as number)
  avisarMudanca()
  return { ok: true, erro: '' }
}

export async function apagarComunicado(id: number): Promise<boolean> {
  const { error } = await supabase.from('comunicados').delete().eq('id', id)
  avisarMudanca()
  return !error
}

export async function lerConversas(): Promise<Conversa[]> {
  const { data, error } = await supabase.rpc('conversas_suporte')
  if (error) { console.error('conversas_suporte', error); return [] }
  return (data ?? []) as Conversa[]
}

/** Quantas mensagens ainda não lidas este login tem (o número do selo). */
export async function contarNaoLidas(userId: string, contaCriadaEm: string | undefined, suporte: boolean): Promise<number> {
  const [c, l, m] = await Promise.all([
    supabase.from('comunicados').select('id, criado_em').order('criado_em', { ascending: false }).limit(200),
    supabase.from('comunicados_lidos').select('comunicado_id'),
    suporte
      ? supabase.from('mensagens_suporte').select('id', { count: 'exact', head: true }).eq('autor', 'pessoa').is('lida_em', null)
      : supabase.from('mensagens_suporte').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('autor', 'suporte').is('lida_em', null),
  ])
  if (c.error) return 0
  const lidos = new Set((l.data ?? []).map(x => x.comunicado_id as number))
  return comunicadosNaoLidos((c.data ?? []) as Comunicado[], lidos, contaCriadaEm) + (m.count ?? 0)
}

/**
 * Tempo real (18/11/2026, Guilherme: "o chat não pode demorar"): só com a
 * tela de Mensagens aberta, o banco avisa quando entra mensagem nova e a tela
 * relê na hora. O RLS vale também aqui: cada login só é avisado do que pode
 * ler. Sem a tabela na publicação `supabase_realtime` (migração 027), nada
 * chega e a tela segue com a busca a cada 30 s. `userId` vazio = todas as
 * conversas (o administrador, para a lista).
 */
export function ouvirMensagensNovas(userId: string, aoChegar: () => void): () => void {
  const canal = supabase.channel(`mensagens-${userId || 'todas'}-${Math.random().toString(36).slice(2, 8)}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'mensagens_suporte',
      ...(userId ? { filter: `user_id=eq.${userId}` } : {}),
    }, () => aoChegar())
    .subscribe()
  return () => { supabase.removeChannel(canal) }
}
