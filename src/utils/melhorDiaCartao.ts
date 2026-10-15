import type { Conta } from '../context/AppContext'
import { mesDaFaturaDaCompra } from './lancamentoRapido'

/**
 * A fatura de uma compra no cartão e o melhor dia para comprar (pedido do
 * Guilherme em 15/10/2026, no Simulador). Mesma regra de mês que
 * `mesDaFaturaDaCompra` e `mesDoGastoNoCartao`: até o dia do fechamento a
 * compra entra na fatura do mês; depois, na seguinte. Fechamento num dia que
 * o mês não tem (31 em fevereiro) cai no último dia dele.
 */
type Cartao = Pick<Conta, 'diaFechamento' | 'diaVencimento'>

const ultimoDia = (ano: number, mes: number) => new Date(ano, mes + 1, 0).getDate()
const noMes = (ano: number, mes: number, dia: number) => new Date(ano, mes, Math.min(dia, ultimoDia(ano, mes)))
const DIA_MS = 86_400_000

export interface FaturaDaCompra { fechaEm: Date; venceEm: Date }

export function faturaDaCompra(cartao: Cartao, data: Date): FaturaDaCompra {
  const f = cartao.diaFechamento ?? 31
  const v = cartao.diaVencimento ?? 1
  const m = mesDaFaturaDaCompra(cartao, data.getFullYear(), data.getMonth(), data.getDate())
  const fechaEm = noMes(m.ano, m.mes, f)
  // Vencimento antes do fechamento no calendário = vence no mês seguinte.
  const venceEm = v < f ? noMes(m.ano, m.mes + 1, v) : noMes(m.ano, m.mes, v)
  return { fechaEm, venceEm }
}

/** Dias entre a compra e o vencimento da fatura que a recebe. */
export const diasParaPagar = (data: Date, fatura: FaturaDaCompra) =>
  Math.round((fatura.venceEm.getTime() - new Date(data.getFullYear(), data.getMonth(), data.getDate()).getTime()) / DIA_MS)

/**
 * O melhor dia para comprar a partir de `desde`: o dia seguinte ao próximo
 * fechamento — a compra vai para a fatura seguinte e ganha o prazo mais longo.
 * Se o fechamento foi ontem, o melhor dia é `desde` mesmo.
 */
export function melhorDiaDeCompra(cartao: Cartao, desde: Date): { data: Date; fatura: FaturaDaCompra; dias: number } {
  const base = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate())
  const ontem = new Date(base.getTime() - DIA_MS)
  const fecha = faturaDaCompra(cartao, ontem).fechaEm
  const data = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 1)
  const fatura = faturaDaCompra(cartao, data)
  return { data, fatura, dias: diasParaPagar(data, fatura) }
}
