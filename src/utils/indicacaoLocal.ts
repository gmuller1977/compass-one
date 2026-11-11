/**
 * O código de indicação guardado neste aparelho (ver indicacao.ts). À parte,
 * sem o Supabase, para a página de apresentação pronta no HTML poder lê-lo.
 */
export const CHAVE_INDICACAO = 'compass-indicacao'
const CHAVE = CHAVE_INDICACAO
const VALIDADE_MS = 30 * 86400000

export function normalizarCodigo(s: string): string {
  return s.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
}

export function guardarCodigoRecebido(codigo: string) {
  const c = normalizarCodigo(codigo)
  if (!c) return
  try { localStorage.setItem(CHAVE, JSON.stringify({ c, em: Date.now() })) } catch { /* sem storage */ }
}

export function codigoRecebido(agora = Date.now()): string | null {
  try {
    const raw = localStorage.getItem(CHAVE)
    if (!raw) return null
    const { c, em } = JSON.parse(raw) as { c?: string; em?: number }
    if (!c || !em || agora - em > VALIDADE_MS) return null
    return c
  } catch { return null }
}

export function esquecerCodigoRecebido() {
  try { localStorage.removeItem(CHAVE) } catch { /* sem storage */ }
}
