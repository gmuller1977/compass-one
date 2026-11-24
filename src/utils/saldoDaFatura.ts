import type { Conta } from '../context/AppContext'

/**
 * Fatura paga só em parte (24/11/2026, pedido do Guilherme: "se a fatura é
 * 700, mas o usuário paga apenas parte, como fica o saldo?").
 *
 * Antes, pagar 500 de uma fatura de 700 com "Outro valor" dava a fatura por
 * quitada: o banco descia 500, e os 200 que faltaram sumiam do app — não iam
 * para a fatura seguinte nem para o saldo previsto. No banco a dívida segue,
 * com juros do rotativo.
 *
 * Agora, com a escolha da pessoa, o que faltou vai para a fatura SEGUINTE do
 * mesmo cartão como `saldoAnterior` do mês da fatura — um campo, NÃO um
 * lançamento. Por isso entra no total da fatura e no que sai do banco
 * (`totalFatura`), mas não vira gasto em categoria nenhuma: as compras já
 * contaram no Radar e no plano quando aconteceram. Os juros o app não
 * estima: aparecem quando a fatura do banco chega maior e a pessoa informa o
 * valor dela ("falta lançar R$ X").
 */
export type SaldoAnterior = {
  valor: number
  /** O mês da fatura paga em parte (`AAAA-MM`, a chave dela). */
  de: string
}

const dd = (n: number) => String(n).padStart(2, '0')

/** O mês da fatura (chave `<cartão>-AAAA-MM`) que vence no mês dado — a regra de `totalFatura`. */
export function mesDaFaturaQueVence(cartao: Pick<Conta, 'diaVencimento' | 'diaFechamento'>, anoVenc: number, mesVenc: number) {
  const offset = (cartao.diaVencimento ?? 1) < (cartao.diaFechamento ?? 1) ? 1 : 0
  const t = anoVenc * 12 + mesVenc - offset
  return { ano: Math.floor(t / 12), mes: t % 12 }
}

/** A chave da fatura que vence no mês e a da seguinte. */
export function chavesDaFatura(cartao: Pick<Conta, 'id' | 'diaVencimento' | 'diaFechamento'>, anoVenc: number, mesVenc: number) {
  const m = mesDaFaturaQueVence(cartao, anoVenc, mesVenc)
  const t = m.ano * 12 + m.mes + 1
  return {
    paga: `${cartao.id}-${m.ano}-${dd(m.mes + 1)}`,
    seguinte: `${cartao.id}-${Math.floor(t / 12)}-${dd((t % 12) + 1)}`,
    mesSeguinte: { ano: Math.floor(t / 12), mes: t % 12 },
    de: `${m.ano}-${dd(m.mes + 1)}`,
  }
}

/** Quanto faltou pagar. Zero quando pagou tudo ou mais (juros, IOF). */
export const faltouPagar = (totalDaFatura: number, pago: number) =>
  totalDaFatura - pago > 0.004 ? Math.round((totalDaFatura - pago) * 100) / 100 : 0

type MapaFatura = Record<string, unknown>
type ComSaldo = { lancamentos?: unknown; saldoAnterior?: SaldoAnterior }

/** Leva o que faltou para a fatura seguinte. Valor zero tira o que havia sido levado. */
export function levarParaProximaFatura<T extends MapaFatura>(
  faturas: T, cartao: Pick<Conta, 'id' | 'diaVencimento' | 'diaFechamento'>, anoVenc: number, mesVenc: number, valor: number,
): T {
  const { seguinte, de } = chavesDaFatura(cartao, anoVenc, mesVenc)
  const atual = (faturas[seguinte] ?? { lancamentos: {}, faturaAtual: '' }) as ComSaldo
  if (valor <= 0.004) {
    if (!atual.saldoAnterior || atual.saldoAnterior.de !== de) return faturas
    const { saldoAnterior: _fora, ...resto } = atual
    void _fora
    return { ...faturas, [seguinte]: resto }
  }
  return { ...faturas, [seguinte]: { ...atual, saldoAnterior: { valor: Math.round(valor * 100) / 100, de } } }
}

/** O saldo trazido da fatura anterior num mês de fatura, ou zero. */
export const saldoAnteriorDe = (dm: unknown) => (dm as ComSaldo | undefined)?.saldoAnterior?.valor ?? 0

const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']

/** "Saldo da fatura de outubro". */
export function rotuloDoSaldoAnterior(s: SaldoAnterior): string {
  const [, m] = s.de.split('-').map(Number)
  return `Saldo da fatura de ${MESES[m - 1]}`
}

/** "dezembro": o mês em que a fatura seguinte vence, para a pergunta. */
export function vencimentoDaSeguinte(anoVenc: number, mesVenc: number) {
  const t = anoVenc * 12 + mesVenc + 1
  return MESES[t % 12]
}
