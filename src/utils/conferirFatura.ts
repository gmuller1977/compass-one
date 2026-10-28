/**
 * Conferir a fatura com o app do banco (28/10/2026, pedido do Guilherme:
 * lançando o que ficou para trás, "o extrato no Compass fica com menos
 * lançamentos, e preciso descobrir o que falta lançar").
 *
 * Duas ajudas, nenhuma muda número:
 * - o título do dia diz quantas compras tem ("3 compras"): o dia em que a
 *   quantidade não bate com o banco é onde falta algo;
 * - cada compra pode ser marcada como CONFERIDA. A marca mora no mês da
 *   fatura (`conferidos[id]`), não no lançamento: assim a parcela de cada mês
 *   se confere à parte, e o membro da conta compartilhada também pode marcar,
 *   como marca a conta paga.
 */

type MesComConferidos = {
  lancamentos: Record<number, Array<{ id: string }>>
  conferidos?: Record<string, boolean>
}

/** "1 compra", "3 compras". */
export function textoQtdCompras(n: number): string {
  return n === 1 ? '1 compra' : `${n} compras`
}

export function estaConferido(dm: MesComConferidos, id: string): boolean {
  return dm.conferidos?.[id] === true
}

/** Marca ou desmarca. Desmarcar tira a chave, para o mês não guardar lixo. */
export function alternarConferido<T extends MesComConferidos>(dm: T, id: string): T {
  const atual = { ...(dm.conferidos ?? {}) }
  if (atual[id]) delete atual[id]
  else atual[id] = true
  return { ...dm, conferidos: atual }
}

export function desmarcarTodos<T extends MesComConferidos>(dm: T): T {
  return { ...dm, conferidos: {} }
}

/**
 * Quantas compras da fatura estão conferidas. Conta só os lançamentos que
 * existem: marca de compra excluída não entra.
 */
export function resumoConferidos(dm: MesComConferidos, totalDias: number): { conferidas: number; total: number } {
  let conferidas = 0, total = 0
  for (let d = 1; d <= totalDias; d++) {
    for (const l of dm.lancamentos[d] ?? []) {
      total++
      if (estaConferido(dm, l.id)) conferidas++
    }
  }
  return { conferidas, total }
}
