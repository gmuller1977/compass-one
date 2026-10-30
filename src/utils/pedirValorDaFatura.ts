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
/**
 * Desde 30/10/2026 (ideia do Guilherme, com as bolinhas de conferida) a janela
 * só abre sozinha em DOIS momentos, uma vez cada: quando todas as compras da
 * fatura estão conferidas ("Tudo conferido. Quer comparar com o total do
 * banco?") ou quando a fatura FECHOU e ainda não venceu (o valor do banco é
 * definitivo, e é a última chance de achar a compra que faltou lançar).
 * Fora disso, as bolinhas fazem o trabalho e o valor só se informa tocando.
 */
export type MomentoDaFatura = 'tudo-conferido' | 'fechada' | null

export function momentoDePerguntar(p: {
  status: 'paga' | 'fechada' | 'aberta'
  tudoConferido: boolean
  /** Vencimento ainda não passou (hoje conta). */
  antesDoVencimento: boolean
}): MomentoDaFatura {
  if (p.status === 'paga') return null
  if (p.tudoConferido) return 'tudo-conferido'
  if (p.status === 'fechada' && p.antesDoVencimento) return 'fechada'
  return null
}

export function pedeValorDaFatura(p: {
  momento: MomentoDaFatura
  perguntouHoje: boolean
  totalAgora: number
  totalNaUltimaVez?: number
  informado: number
}): boolean {
  if (!p.momento) return false
  if (p.perguntouHoje) return false
  if (p.informado > 0 && Math.abs(p.informado - p.totalAgora) < 0.005) return false
  if (p.totalNaUltimaVez === undefined) return true
  return Math.abs(p.totalAgora - p.totalNaUltimaVez) >= 0.005
}
