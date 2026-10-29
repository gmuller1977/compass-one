import { supabase } from '../lib/supabase'

/**
 * Conta compartilhada (migração 015): convites e membros. Os dados
 * financeiros continuam com o user_id do dono; quem aceita lê e grava essas
 * linhas pelas políticas da migração. Ver AppContext, resolverDono.
 */
export type Convite = {
  id: string; dono_id: string; dono_nome: string; dono_email: string
  email: string; membro_id: string | null; status: 'pendente' | 'aceito'; criado_em: string
  /** Sem a migração 023 a coluna não existe: vale 'lancar'. */
  acesso?: 'lancar' | 'visualizar'
  /** O dono liga e desliga o acesso (migração 023). Sem a coluna: ligado. */
  ativo?: boolean
}

/** Os dois tipos de convite, com o nome que a pessoa vê. */
export const TIPOS_DE_ACESSO = {
  lancar: { nome: 'Família', explica: 'Vê tudo e lança os próprios gastos' },
  visualizar: { nome: 'Educador Financeiro', explica: 'Só vê. Não lança nem altera nada' },
} as const

/**
 * Quem entrou em várias contas (o consultor com vários clientes, migração
 * 023) escolhe qual abrir. Guardado no aparelho, por login: o id do dono, ou
 * 'proprias' para as finanças do próprio login.
 */
export function lerEscolhaDeFinancas(authId: string): string | null {
  try { return localStorage.getItem(`compass-financas-${authId}`) } catch { return null }
}
export function guardarEscolhaDeFinancas(authId: string, escolha: string) {
  try { localStorage.setItem(`compass-financas-${authId}`, escolha) } catch { /* abre a primeira */ }
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

const semColunaAcesso = (e: { code?: string; message?: string }) => e.code === '42703' || e.code === 'PGRST204' || /acesso/.test(e.message ?? '')
const FALTA_023 = 'O convite de Educador Financeiro ainda não foi ativado no banco (migração 023).'

export async function convidar(p: { donoId: string; donoNome: string; donoEmail: string; email: string; acesso: 'lancar' | 'visualizar' }) {
  const linha = { dono_id: p.donoId, dono_nome: p.donoNome, dono_email: p.donoEmail, email: p.email.trim().toLowerCase() }
  let { data, error } = await supabase.from('compartilhamentos').insert({ ...linha, acesso: p.acesso }).select('id').single()
  // Sem a 023: "pode lançar" é o convite de sempre; "só visualizar" não dá para garantir, e não grava.
  if (error && semColunaAcesso(error)) {
    if (p.acesso === 'visualizar') return { erro: FALTA_023, envio: 'falha' as EnvioConvite }
    ;({ data, error } = await supabase.from('compartilhamentos').insert(linha).select('id').single())
  }
  if (error) return { erro: motivoDoErro(error), envio: 'falha' as EnvioConvite }
  return { erro: '', envio: await enviarEmailDoConvite((data as { id: string }).id) }
}

/**
 * 'limite': a função recusou pelo limite de envios (5 por dia, o mesmo
 * convite a cada 10 minutos; migração 021).
 */
export type EnvioConvite = 'enviado' | 'limite' | 'falha'

/**
 * Manda o e-mail do convite (função convite-email, pelo Resend). O convite
 * vale com ou sem ele: a pessoa o vê ao entrar com o e-mail convidado.
 */
export async function enviarEmailDoConvite(id: string): Promise<EnvioConvite> {
  try {
    const { data, error } = await supabase.functions.invoke('convite-email', { body: { id } })
    if (error) {
      const status = (error as { context?: { status?: number } }).context?.status
      if (status === 429) return 'limite'
      console.warn('convite-email', error)
      return 'falha'
    }
    return (data as { enviado?: boolean } | null)?.enviado ? 'enviado' : 'falha'
  } catch (e) { console.warn('convite-email', e); return 'falha' }
}

/** O dono troca o acesso de um convite, pendente ou aceito; vale na hora. */
export async function trocarAcesso(id: string, acesso: 'lancar' | 'visualizar') {
  const { error } = await supabase.rpc('trocar_acesso_convite', { convite: id, novo: acesso })
  if (!error) return ''
  if (error.code === 'PGRST202' || /trocar_acesso_convite/.test(error.message ?? '')) return FALTA_023
  return motivoDoErro(error)
}

/** O dono liga ou desliga o acesso de um convite ("libera na reunião, desativa ao encerrar"). */
export async function ativarConvite(id: string, ligado: boolean) {
  const { error } = await supabase.rpc('ativar_convite', { convite: id, ligado })
  if (!error) return ''
  if (error.code === 'PGRST202' || /ativar_convite/.test(error.message ?? '')) return FALTA_023
  return motivoDoErro(error)
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

/** O membro sai da conta compartilhada de um dono: volta para as finanças próprias. */
export async function sairDoCompartilhamento(authId: string, donoId: string) {
  const { error } = await supabase.from('compartilhamentos').delete().eq('membro_id', authId).eq('dono_id', donoId)
  return error ? motivoDoErro(error) : ''
}
