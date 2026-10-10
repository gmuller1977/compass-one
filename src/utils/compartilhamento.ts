import { supabase } from '../lib/supabase'

/**
 * Conta compartilhada (migração 015): convites e membros. Os dados
 * financeiros continuam com o user_id do dono; quem aceita lê e grava essas
 * linhas pelas políticas da migração. Ver AppContext, resolverDono.
 */
export type Convite = {
  id: string; dono_id: string; dono_nome: string; dono_email: string
  email: string; membro_id: string | null; status: 'pendente' | 'aceito'; criado_em: string
}

/** Erro amigável. Sem a tabela, a migração 015 ainda não foi rodada. */
export function motivoDoErro(e: { code?: string; message?: string } | null | undefined): string {
  if (!e) return ''
  if (e.code === '42P01' || e.code === 'PGRST205' || (/compartilhamentos/.test(e.message ?? '') && /exist|schema cache/.test(e.message ?? ''))) {
    return 'O compartilhamento ainda não foi ativado no banco (migração 015).'
  }
  if (e.code === '23505') return 'Esse e-mail já foi convidado.'
  const m = e.message ?? ''
  if (/confirme o seu e-mail/.test(m)) return 'Confirme o seu e-mail (link enviado no cadastro) antes de aceitar.'
  if (/já participa/.test(m)) return 'Você já participa de outra conta compartilhada. Saia dela antes.'
  if (/convite não encontrado/.test(m)) return 'Esse convite não existe mais.'
  if (/row-level security/.test(m)) return 'Não dá para convidar o próprio e-mail.'
  return 'Não deu certo agora. Tente de novo.'
}

export const emailValido = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())

export async function listarMembros(donoId: string) {
  const { data, error } = await supabase.from('compartilhamentos').select('*').eq('dono_id', donoId).order('criado_em')
  return { membros: (data ?? []) as Convite[], erro: error ? motivoDoErro(error) : '' }
}

export async function convidar(p: { donoId: string; donoNome: string; donoEmail: string; email: string }) {
  const { error } = await supabase.from('compartilhamentos').insert({
    dono_id: p.donoId, dono_nome: p.donoNome, dono_email: p.donoEmail, email: p.email.trim().toLowerCase(),
  })
  return error ? motivoDoErro(error) : ''
}

export async function removerConvite(id: string) {
  const { error } = await supabase.from('compartilhamentos').delete().eq('id', id)
  return error ? motivoDoErro(error) : ''
}

/** Convites pendentes para o e-mail de quem está logado. */
export async function convitesParaMim(authId: string): Promise<Convite[]> {
  const { data, error } = await supabase.from('compartilhamentos').select('*')
    .eq('status', 'pendente').neq('dono_id', authId)
  if (error) return []
  return (data ?? []) as Convite[]
}

export async function aceitarConvite(id: string) {
  const { error } = await supabase.rpc('aceitar_convite', { convite: id })
  return error ? motivoDoErro(error) : ''
}

/** O membro sai da conta compartilhada: volta para as finanças próprias. */
export async function sairDoCompartilhamento(authId: string) {
  const { error } = await supabase.from('compartilhamentos').delete().eq('membro_id', authId)
  return error ? motivoDoErro(error) : ''
}
