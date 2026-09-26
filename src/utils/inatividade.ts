/**
 * Sessão encerrada por inatividade: 30 minutos sem uso, com aviso no último.
 *
 * Decidido pelo Guilherme em 26/09/2026. O Supabase guarda a sessão no
 * navegador e a renova sozinho, sem prazo — quem abrisse o navegador no mesmo
 * computador dias depois entrava direto, num app de finanças. O limite por
 * inatividade no próprio Supabase é, até onde se sabe, recurso de plano pago;
 * este cobre o caso comum, o computador deixado aberto ou compartilhado. Não
 * protege contra sessão roubada — isso só o servidor faz.
 *
 * A última atividade mora no localStorage, e não em memória, por dois motivos:
 * vale ENTRE ABAS (usar o app numa mantém as outras vivas) e vale AO VOLTAR
 * (fechar o navegador e reabrir depois do prazo já abre deslogado).
 *
 * A chave é apagada sempre que não há sessão — ver onAuthStateChange no
 * AppContext. É o que impede um login novo de herdar o carimbo velho de uma
 * sessão que terminou por outro caminho, e sair na hora.
 */
export const LIMITE_INATIVIDADE_MS = 30 * 60 * 1000
export const AVISO_ANTES_MS = 60 * 1000

const CHAVE = 'compass:ultima-atividade'
const CHAVE_SAIU = 'compass:saiu-por-inatividade'

// Tudo embrulhado em try/catch: aba anônima e armazenamento bloqueado lançam.
export function lerUltimaAtividade(): number | null {
  try {
    const n = Number(localStorage.getItem(CHAVE))
    return Number.isFinite(n) && n > 0 ? n : null
  } catch { return null }
}
export function marcarAtividade(agora = Date.now()) {
  try { localStorage.setItem(CHAVE, String(agora)) } catch { /* sem armazenamento */ }
}
export function limparUltimaAtividade() {
  try { localStorage.removeItem(CHAVE) } catch { /* sem armazenamento */ }
}

/** Para a tela de login dizer por que a pessoa saiu. Por aba: sessionStorage. */
export function marcarSaidaPorInatividade() {
  try { sessionStorage.setItem(CHAVE_SAIU, '1') } catch { /* sem armazenamento */ }
}
export function saiuPorInatividade(): boolean {
  try { return sessionStorage.getItem(CHAVE_SAIU) === '1' } catch { return false }
}
export function esquecerSaidaPorInatividade() {
  try { sessionStorage.removeItem(CHAVE_SAIU) } catch { /* sem armazenamento */ }
}

/**
 * A decisão, isolada para ser testável: dado agora e a última atividade, sair
 * já, avisar com quantos ms faltam, ou nada.
 */
export function estadoInatividade(agora: number, ultima: number):
  { sair: true } | { sair: false; restanteMs: number | null } {
  const ocioso = agora - ultima
  if (ocioso >= LIMITE_INATIVIDADE_MS) return { sair: true }
  if (ocioso >= LIMITE_INATIVIDADE_MS - AVISO_ANTES_MS) {
    return { sair: false, restanteMs: LIMITE_INATIVIDADE_MS - ocioso }
  }
  return { sair: false, restanteMs: null }
}
