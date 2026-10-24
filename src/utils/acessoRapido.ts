/**
 * Abrir o app no celular com o mínimo de toques (24/10/2026, pedido do
 * Guilherme). Quem já entrou neste aparelho, ou abriu pelo ícone da tela
 * inicial, vai direto ao login: a página de apresentação é para quem ainda
 * não conhece o app (inclusive quem chega por um link de indicação).
 */
const CHAVE = 'compass-ja-entrou-aqui'

export function marcarQueEntrouAqui() {
  try { localStorage.setItem(CHAVE, '1') } catch { /* sem armazenamento, segue com a apresentação */ }
}

export function abertoComoApp(): boolean {
  try {
    return window.matchMedia?.('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true
  } catch { return false }
}

export function pulaApresentacao(): boolean {
  if (abertoComoApp()) return true
  try { return localStorage.getItem(CHAVE) === '1' } catch { return false }
}

// "Adicionar à tela inicial". O Android avisa uma vez, cedo, que o app pode
// ser instalado; o aviso é guardado aqui para o botão usar depois. O iPhone
// não tem botão: só o caminho Compartilhar → Adicionar à Tela de Início.
type PedidoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
let pedidoInstalar: PedidoInstalar | null = null
const ouvintes = new Set<() => void>()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault()
    pedidoInstalar = e as PedidoInstalar
    ouvintes.forEach(f => f())
  })
  window.addEventListener('appinstalled', () => { pedidoInstalar = null; ouvintes.forEach(f => f()) })
}
export const podeInstalarDireto = () => pedidoInstalar !== null
export function aoMudarInstalacao(f: () => void) { ouvintes.add(f); return () => { ouvintes.delete(f) } }
export async function instalarApp(): Promise<boolean> {
  if (!pedidoInstalar) return false
  const p = pedidoInstalar
  await p.prompt()
  const { outcome } = await p.userChoice
  pedidoInstalar = null
  ouvintes.forEach(f => f())
  return outcome === 'accepted'
}

export const ehIphone = (ua = typeof navigator === 'undefined' ? '' : navigator.userAgent) => /iPhone|iPad|iPod/i.test(ua)

const CHAVE_DISPENSOU = 'compass-instalar-dispensou'
export function dispensouInstalar(): boolean {
  try { return localStorage.getItem(CHAVE_DISPENSOU) === '1' } catch { return false }
}
export function dispensarInstalar() {
  try { localStorage.setItem(CHAVE_DISPENSOU, '1') } catch { /* volta a aparecer */ }
}
