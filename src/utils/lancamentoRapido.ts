import type { Conta } from '../context/AppContext'

/**
 * Regras do lançamento rápido (Quick Launch, a home do mobile) que precisam
 * concordar com a tela da fatura.
 *
 * Na fatura o sinal é o do CARTÃO, não o da categoria: `entrada` é compra e
 * `saida` é estorno — ver `totalFatura` em saldoConta e `construirRealizadoMes`.
 * O Quick Launch gravava a compra com o tipo da categoria (`saida`), e toda
 * compra lançada por ali entrava como ESTORNO: abatia a fatura e o gasto da
 * categoria em vez de somar.
 */
export function tipoNaFatura(tipoDaCategoria: 'saida' | 'entrada'): 'entrada' | 'saida' {
  return tipoDaCategoria === 'saida' ? 'entrada' : 'saida'
}

/** Compras menos estornos de um mês de fatura. */
export function totalComprasFatura(
  dm: { lancamentos?: Record<number, { tipo: string; valor: number }[]> } | undefined,
): number {
  let total = 0
  for (const itens of Object.values(dm?.lancamentos ?? {}))
    for (const l of itens) total += l.tipo === 'entrada' ? l.valor : -l.valor
  return total
}

/**
 * Em que mês de fatura cai uma compra feita hoje. Depois do dia de fechamento
 * ela vai para a fatura seguinte — a mesma regra de `routeToNext` na
 * FaturaCartao.
 */
export function mesDaFaturaDaCompra(
  cartao: Pick<Conta, 'diaFechamento'>,
  ano: number,
  mes: number,
  dia: number,
): { ano: number; mes: number } {
  if (dia <= (cartao.diaFechamento ?? 31)) return { ano, mes }
  return mes === 11 ? { ano: ano + 1, mes: 0 } : { ano, mes: mes + 1 }
}
