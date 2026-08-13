import { supabase } from '../lib/supabase'

export async function creditarAurix(
  userId: string,
  tipo: 'acao' | 'conquista' | 'indicacao' | 'bonus',
  descricao: string,
  pontos: number,
  referencia?: string
): Promise<{ pontos: number } | null> {
  if (tipo === 'acao' && referencia) {
    const hoje = new Date().toISOString().split('T')[0]
    const { data: existe } = await supabase
      .from('aurix')
      .select('id')
      .eq('user_id', userId)
      .eq('referencia', referencia)
      .gte('created_at', `${hoje}T00:00:00`)
      .limit(1)
    if (existe && existe.length > 0) return null
  }

  const { data, error } = await supabase
    .from('aurix')
    .insert({ user_id: userId, tipo, descricao, pontos, referencia })
    .select()
    .single()

  return error ? null : data
}

export async function saldoAurix(userId: string): Promise<number> {
  const { data } = await supabase
    .from('aurix')
    .select('pontos')
    .eq('user_id', userId)
  return data?.reduce((soma, r) => soma + r.pontos, 0) ?? 0
}

export async function totalAcumuladoAurix(userId: string): Promise<number> {
  const { data } = await supabase
    .from('aurix')
    .select('pontos')
    .eq('user_id', userId)
    .gt('pontos', 0)
  return data?.reduce((soma, r) => soma + r.pontos, 0) ?? 0
}

export async function verificarConquista(
  userId: string,
  codigo: string,
  aurix: number,
  descricao: string
): Promise<{ pontos: number } | null> {
  const { data: existe } = await supabase
    .from('conquistas')
    .select('id')
    .eq('user_id', userId)
    .eq('codigo', codigo)
    .limit(1)

  if (existe && existe.length > 0) return null

  await supabase.from('conquistas').insert({ user_id: userId, codigo })
  return creditarAurix(userId, 'conquista', descricao, aurix, `conquista_${codigo}`)
}

export type Nivel = {
  nome: string
  icone: string
  proximo: string | null
  faltam: number
  minimo: number
  maximo: number
}

export function calcularNivel(totalAcumulado: number): Nivel {
  if (totalAcumulado >= 5000) return { nome: 'Lenda',       icone: '👑', proximo: null,         faltam: 0,                    minimo: 5000, maximo: 99999 }
  if (totalAcumulado >= 2500) return { nome: 'Mestre',      icone: '🏆', proximo: 'Lenda',      faltam: 5000 - totalAcumulado, minimo: 2500, maximo: 4999 }
  if (totalAcumulado >= 1000) return { nome: 'Disciplinado',icone: '🔥', proximo: 'Mestre',     faltam: 2500 - totalAcumulado, minimo: 1000, maximo: 2499 }
  if (totalAcumulado >= 500)  return { nome: 'Explorador',  icone: '⭐', proximo: 'Disciplinado',faltam: 1000 - totalAcumulado, minimo: 500,  maximo: 999  }
  if (totalAcumulado >= 200)  return { nome: 'Navegador',   icone: '🧭', proximo: 'Explorador', faltam: 500 - totalAcumulado,  minimo: 200,  maximo: 499  }
  return                             { nome: 'Iniciante',   icone: '🐣', proximo: 'Navegador',  faltam: 200 - totalAcumulado,  minimo: 0,    maximo: 199  }
}

export type StreakResult = { streak: number; novo: boolean }

export function calcularStreak(
  streakAtual: number,
  ultimoAcessoAtivo: string | null
): StreakResult {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  if (!ultimoAcessoAtivo) return { streak: 1, novo: true }

  const ultimo = new Date(ultimoAcessoAtivo)
  ultimo.setHours(0, 0, 0, 0)
  const diffDias = Math.floor((hoje.getTime() - ultimo.getTime()) / 86400000)

  if (diffDias === 0) return { streak: streakAtual, novo: false }
  if (diffDias === 1) return { streak: streakAtual + 1, novo: true }
  return { streak: 1, novo: true }
}

export async function atualizarStreak(
  userId: string,
  streakAtual: number,
  maiorStreak: number,
  ultimoAcessoAtivo: string | null
): Promise<{ novoStreak: number; bonusGanho: boolean }> {
  const { streak, novo } = calcularStreak(streakAtual, ultimoAcessoAtivo)
  if (!novo) return { novoStreak: streak, bonusGanho: false }

  const novoMaior = streak > maiorStreak ? streak : maiorStreak
  const hoje = new Date().toISOString().split('T')[0]

  await supabase
    .from('user_preferences')
    .update({ streak_atual: streak, maior_streak: novoMaior, ultimo_acesso_ativo: hoje })
    .eq('user_id', userId)

  let bonusGanho = false
  if (streak > 0 && streak % 7 === 0) {
    const ref = `bonus_streak_${streak}`
    const resultado = await creditarAurix(userId, 'bonus', `Streak de ${streak} dias!`, 50, ref)
    bonusGanho = resultado !== null
  }

  return { novoStreak: streak, bonusGanho }
}

export type AurixTransacao = {
  id: string
  tipo: string
  descricao: string
  pontos: number
  referencia: string | null
  created_at: string
}

export async function historicoAurix(
  userId: string,
  pagina = 0,
  filtroTipo?: string
): Promise<AurixTransacao[]> {
  let query = supabase
    .from('aurix')
    .select('id, tipo, descricao, pontos, referencia, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(pagina * 20, pagina * 20 + 19)

  if (filtroTipo && filtroTipo !== 'todos') {
    query = query.eq('tipo', filtroTipo)
  }

  const { data } = await query
  return (data ?? []) as AurixTransacao[]
}

export async function acoesHoje(userId: string): Promise<string[]> {
  const hoje = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('aurix')
    .select('referencia')
    .eq('user_id', userId)
    .eq('tipo', 'acao')
    .gte('created_at', `${hoje}T00:00:00`)
  return (data ?? []).map(r => r.referencia).filter(Boolean) as string[]
}
