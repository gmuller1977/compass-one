/**
 * O banco em Lançamentos funciona como o cartão (19/11/2026, decisão do
 * Guilherme num card: "Igual ao cartão, com bolinha"):
 *
 *   - Saldo no Compass = o que está lançado até HOJE (fixas pagas e
 *     lançamentos; data futura entra quando o dia chega, ver
 *     `ultimoDiaRealizado` em saldoConta);
 *   - Saldo no banco = o que foi CONFERIDO: cada lançamento tem a bolinha de
 *     conferido, e a fixa paga já tem a bolinha dela.
 *
 * A marca mora no mês da conta (`conferidos[id]`), como na fatura
 * (utils/conferirFatura), e não move número nenhum: o conferido é o saldo do
 * Compass menos o que ainda não tem bolinha.
 */

type MesComConferidos = {
  lancamentos: Record<number, Array<{ id: string; tipo?: string; valor?: number }>>
  conferidos?: Record<string, boolean>
}

/**
 * O que falta conferir até o dia `ate` (inclusive): o líquido dos lançamentos
 * sem bolinha (entrada soma, saída abate) e quantos são.
 */
export function faltaConferirNoExtrato(dm: MesComConferidos | undefined, ate: number): { liquido: number; qtd: number } {
  let liquido = 0, qtd = 0
  for (const [d, itens] of Object.entries(dm?.lancamentos ?? {})) {
    if (Number(d) > ate) continue
    for (const l of itens) {
      if (dm?.conferidos?.[l.id] === true) continue
      qtd++
      liquido += l.tipo === 'entrada' ? (l.valor ?? 0) : -(l.valor ?? 0)
    }
  }
  return { liquido, qtd }
}

/** Quantos lançamentos até `ate` já têm a bolinha. */
export function qtdConferidosNoExtrato(dm: MesComConferidos | undefined, ate: number): number {
  let n = 0
  for (const [d, itens] of Object.entries(dm?.lancamentos ?? {})) {
    if (Number(d) > ate) continue
    for (const l of itens) if (dm?.conferidos?.[l.id] === true) n++
  }
  return n
}
