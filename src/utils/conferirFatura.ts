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
  lancamentos: Record<number, Array<{ id: string; tipo?: string; valor?: number }>>
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

/**
 * As bolinhas viram a conferência da fatura (30/10/2026, ideia do Guilherme:
 * "ao ir confirmando clicando na bolinha essa diferença iria reduzindo").
 * O topo da fatura mostra quanto do total lançado no Compass já foi conferido
 * com o banco, e quanto falta. Na fatura, compra é `entrada` e estorno é
 * `saida` (abate), como no total.
 *
 * O valor do banco segue opcional: é o único jeito de achar a compra que
 * nunca foi lançada, então ele aparece quando tudo está conferido.
 */
export type Conferencia =
  | { estado: 'sem-compras' }
  | { estado: 'conferindo'; conferido: number; falta: number }
  | { estado: 'tudo-conferido'; conferido: number }
  | { estado: 'banco'; diferenca: number; igual: boolean }

export function valorConferido(dm: MesComConferidos, totalDias: number): number {
  let v = 0
  for (let d = 1; d <= totalDias; d++) {
    for (const l of dm.lancamentos[d] ?? []) {
      if (!estaConferido(dm, l.id)) continue
      v += l.tipo === 'saida' ? -(l.valor ?? 0) : (l.valor ?? 0)
    }
  }
  return v
}

export function conferenciaDaFatura(dm: MesComConferidos, totalDias: number, p: {
  totalFatura: number
  /** Valor da fatura informado do banco; 0 = não informado. */
  informado: number
}): Conferencia {
  const { conferidas, total } = resumoConferidos(dm, totalDias)
  if (total === 0) {
    if (p.informado > 0) return comBanco(p.informado - p.totalFatura)
    return { estado: 'sem-compras' }
  }
  if (conferidas < total) {
    const conferido = valorConferido(dm, totalDias)
    return { estado: 'conferindo', conferido, falta: p.totalFatura - conferido }
  }
  if (p.informado > 0) return comBanco(p.informado - p.totalFatura)
  return { estado: 'tudo-conferido', conferido: p.totalFatura }
}

function comBanco(diferenca: number): Conferencia {
  return { estado: 'banco', diferenca, igual: Math.abs(diferenca) < 0.01 }
}
