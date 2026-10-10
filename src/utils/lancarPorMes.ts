import type { Conta } from '../context/AppContext'
import { mesDaFaturaDaCompra, totalComprasFatura } from './lancamentoRapido'

/**
 * O Lançar do celular começa pela CATEGORIA, depois o MÊS, depois a forma de
 * pagar (pedido do Guilherme em 10/10/2026: "ficou meio confuso devido a
 * seleção de contas"). Tocar na categoria mostra o disponível deste mês e do
 * próximo; tocar no mês mostra banco, cartão e dinheiro — só os que fazem a
 * compra de HOJE contar naquele mês.
 *
 *   - Banco e dinheiro: o gasto é de hoje, então é deste mês.
 *   - Cartão: conta no mês em que a fatura que recebe a compra VENCE — a
 *     mesma regra de `construirRealizadoMes` (mês da fatura, mais um quando o
 *     vencimento cai no mês seguinte ao fechamento). Cartão que já fechou a
 *     fatura deste mês só aparece no próximo.
 *   - Receita não vai para cartão.
 */
export type MesRef = { ano: number; mes: number }
export type QualMes = 'atual' | 'proximo'

export const proximoMes = ({ ano, mes }: MesRef): MesRef => (mes === 11 ? { ano: ano + 1, mes: 0 } : { ano, mes: mes + 1 })
const indice = (m: MesRef) => m.ano * 12 + m.mes

/** Em que mês do plano a compra no cartão feita neste dia é contada. */
export function mesDoGastoNoCartao(
  cartao: Pick<Conta, 'diaFechamento' | 'diaVencimento'>, ano: number, mes: number, dia: number,
): MesRef {
  const fatura = mesDaFaturaDaCompra(cartao, ano, mes, dia)
  const venceNoMesSeguinte = (cartao.diaVencimento ?? 1) < (cartao.diaFechamento ?? 1)
  return venceNoMesSeguinte ? proximoMes(fatura) : fatura
}

export type FormasDoMes = { mes: MesRef; bancos: Conta[]; cartoes: Conta[]; dinheiro: boolean }

export function formasDoMes(contas: Conta[], hoje: Date, qual: QualMes, tipo: 'saida' | 'entrada'): FormasDoMes {
  const atual = { ano: hoje.getFullYear(), mes: hoje.getMonth() }
  const doMes = qual === 'atual'
  const cartoes = tipo === 'entrada' ? [] : contas.filter(c => c.tipo === 'cartao').filter(c => {
    const m = indice(mesDoGastoNoCartao(c, atual.ano, atual.mes, hoje.getDate()))
    // O próximo mês recebe também o caso raro de cair dois meses à frente
    // (fechou e vence no mês seguinte): sumir com o cartão seria pior.
    return doMes ? m === indice(atual) : m > indice(atual)
  })
  return {
    mes: doMes ? atual : proximoMes(atual),
    bancos: doMes ? contas.filter(c => c.tipo !== 'cartao') : [],
    cartoes,
    dinheiro: doMes,
  }
}

const chave = (conta: string, { ano, mes }: MesRef) => `${conta}-${ano}-${String(mes + 1).padStart(2, '0')}`

type Lanc = { tipo: string; valor: number }
type MesComLanc = { lancamentos?: Record<string | number, Lanc[]> }

/** Quanto saiu hoje somando bancos, dinheiro e as compras no cartão. */
export function gastoDeHoje(
  contas: Conta[], extratoData: Record<string, unknown>, faturaData: Record<string, unknown>, hoje: Date,
): number {
  const atual = { ano: hoje.getFullYear(), mes: hoje.getMonth() }
  const dia = hoje.getDate()
  let total = 0
  const ext = extratoData as Record<string, MesComLanc>
  for (const id of [...contas.filter(c => c.tipo !== 'cartao').map(c => c.id), 'dinheiro']) {
    for (const l of ext[chave(id, atual)]?.lancamentos?.[dia] ?? []) if (l.tipo === 'saida') total += l.valor
  }
  const fat = faturaData as Record<string, MesComLanc>
  for (const c of contas.filter(c => c.tipo === 'cartao')) {
    const dm = fat[chave(c.id, mesDaFaturaDaCompra(c, atual.ano, atual.mes, dia))]
    total += totalComprasFatura({ lancamentos: { [dia]: dm?.lancamentos?.[dia] ?? [] } })
  }
  return total
}
