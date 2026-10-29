/**
 * Quando a janela "Qual é o valor atual da fatura?" abre sozinha
 * (29/10/2026, pedido do Guilherme: "para não ficar pedindo sempre").
 *
 * Antes abria uma vez por dia em toda fatura em aberto. Hoje só abre num dia
 * em que há compra NOVA desde a última vez que perguntou: o total lançado no
 * Compass mudou desde então. Respondida ou pulada, a janela guarda esse total
 * (`faturaAtualTotal`). Sem total guardado (fatura de antes desta regra ou
 * nunca perguntada) pergunta uma vez. Igual ao informado, não pergunta: já
 * confere. A fatura em aberto e o "uma vez por dia" seguem como antes.
 */
export function pedeValorDaFatura(p: {
  perguntouHoje: boolean
  totalAgora: number
  totalNaUltimaVez?: number
  informado: number
}): boolean {
  if (p.perguntouHoje) return false
  if (p.informado > 0 && Math.abs(p.informado - p.totalAgora) < 0.005) return false
  if (p.totalNaUltimaVez === undefined) return true
  return Math.abs(p.totalAgora - p.totalNaUltimaVez) >= 0.005
}
