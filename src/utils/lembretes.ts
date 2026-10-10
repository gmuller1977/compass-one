import { supabase } from '../lib/supabase'
import type { ContaAVencer } from './contasAVencer'

/**
 * Lembrete das 21h no celular, por notificação push. O envio é a função
 * `lembrete-diario` do Supabase (supabase/functions); aqui fica o lado do
 * aparelho: pedir permissão, inscrever, e manter atualizada a lista de contas
 * dos próximos dias que o servidor lê para o "Amanhã vence".
 *
 * Sem a chave pública VAPID (VITE_VAPID_PUBLIC_KEY) nada disso aparece: o
 * recurso fica dormente até a função e a tabela existirem em produção.
 *
 * iPhone: push só funciona com o app INSTALADO na tela de início (iOS 16.4+).
 * No Safari comum o PushManager nem existe — por isso o aviso de instalar.
 */
export type ContaProxima = { data: string; nome: string; valor: number }
export type EstadoLembrete = 'ativo' | 'inativo' | 'negado' | 'instalar' | 'indisponivel'

const chavePublica = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? ''

/** A lista que vai para o servidor: data ISO, nome como a tela mostra, valor. */
export function contasParaLembrete(lista: ContaAVencer[]): ContaProxima[] {
  return lista.map(c => ({
    data: `${c.ano}-${String(c.mes + 1).padStart(2, '0')}-${String(c.dia).padStart(2, '0')}`,
    nome: c.fatura ? `Fatura ${c.nome}` : c.descricao ? `${c.nome} · ${c.descricao}` : c.nome,
    valor: Math.round(c.valor * 100) / 100,
  }))
}

function ehIphoneNoNavegador(): boolean {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent)
  const instalado = window.matchMedia?.('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
  return ios && !instalado
}

export async function estadoLembrete(): Promise<EstadoLembrete> {
  if (!chavePublica) return 'indisponivel'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return ehIphoneNoNavegador() ? 'instalar' : 'indisponivel'
  }
  if (Notification.permission === 'denied') return 'negado'
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    return sub ? 'ativo' : 'inativo'
  } catch {
    return 'indisponivel'
  }
}

function chaveEmBytes(base64: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const bin = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export async function ativarLembrete(userId: string, contas: ContaProxima[]): Promise<EstadoLembrete> {
  if (await Notification.requestPermission() !== 'granted') return 'negado'
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveEmBytes(chavePublica) })
  const j = sub.toJSON()
  const { error } = await supabase.from('push_inscricoes').upsert({
    endpoint: sub.endpoint, user_id: userId, p256dh: j.keys?.p256dh ?? '', auth: j.keys?.auth ?? '',
    contas_proximas: contas, atualizado_em: new Date().toISOString(),
  })
  if (error) { await sub.unsubscribe(); throw new Error(error.message) }
  lembrarEnviado(userId, contas)
  return 'ativo'
}

export async function desativarLembrete(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  await supabase.from('push_inscricoes').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

const chaveEnviado = (uid: string) => `compass-lembrete-contas-${uid}`
function lembrarEnviado(uid: string, contas: ContaProxima[]) {
  try { localStorage.setItem(chaveEnviado(uid), JSON.stringify(contas)) } catch { /* sem localStorage: reenvia */ }
}

/**
 * Mantém a lista do servidor igual à do app — chamada a cada mudança nos
 * dados, em qualquer aparelho. Grava em TODAS as inscrições do usuário: pagar
 * o aluguel no computador tira o aluguel do "Amanhã vence" do celular naquela
 * noite. Só escreve quando a lista mudou.
 */
export async function atualizarContasProximas(userId: string, contas: ContaProxima[]): Promise<void> {
  if (!chavePublica) return
  const json = JSON.stringify(contas)
  try {
    if (localStorage.getItem(chaveEnviado(userId)) === json) return
  } catch { /* segue */ }
  try {
    const { error } = await supabase.from('push_inscricoes')
      .update({ contas_proximas: contas, atualizado_em: new Date().toISOString() }).eq('user_id', userId)
    if (!error) lembrarEnviado(userId, contas)
  } catch {
    /* sem rede: a próxima mudança tenta de novo */
  }
}
