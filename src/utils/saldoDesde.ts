import type { Conta } from '../context/AppContext'

/**
 * De quando é o saldo inicial de uma conta (19/10/2026, pedido do Guilherme
 * sobre a análise da chegada v3, C4: "lançar o passado conta duas vezes").
 *
 * O saldo inicial não tinha data: o app somava em cima dele todo lançamento,
 * de qualquer dia. Quem informava o saldo de HOJE e depois lançava o que
 * gastou no começo do mês descontava esses gastos duas vezes. Agora a pessoa
 * escolhe, no primeiro acesso e no cadastro do banco:
 *
 * - **hoje**: o saldo de hoje, e lança de hoje em diante;
 * - **dia 1º**: o saldo com que o mês abriu, e lança tudo o que já passou.
 *
 * Nenhuma conta do saldo mudou: o saldo inicial continua sendo a base de
 * antes de tudo. O que a data faz é TRAVAR o lançamento novo anterior a ela
 * (`lancamentoAntesDoSaldo`), em Lançamentos, na fatura e no Lançar. No
 * cartão, a data é a do valor da fatura informado no primeiro acesso.
 */
export type OrigemDoSaldo = 'hoje' | 'dia1'

const doisDig = (n: number) => String(n).padStart(2, '0')
export const isoDoDia = (d: Date) => `${d.getFullYear()}-${doisDig(d.getMonth() + 1)}-${doisDig(d.getDate())}`

/** A data gravada na conta para cada escolha. */
export function dataDoSaldo(origem: OrigemDoSaldo, hoje = new Date()): string {
  return origem === 'dia1' ? isoDoDia(new Date(hoje.getFullYear(), hoje.getMonth(), 1)) : isoDoDia(hoje)
}

/** "18/10" — ou "1º/10" no primeiro dia. */
export function diaDoSaldo(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${d === 1 ? '1º' : doisDig(d)}/${doisDig(m)}`
}

/**
 * Se o lançamento NOVO no dia (ano, mes 0–11, dia) cai antes da data do saldo
 * da conta, a frase que explica por que não pode; senão null. Conta sem data
 * (as antigas, a carteira) nunca trava. Editar um lançamento que já existe
 * também não passa por aqui.
 */
export function lancamentoAntesDoSaldo(
  conta: Pick<Conta, 'tipo' | 'saldoInicialDesde'> | undefined, ano: number, mes: number, dia: number,
): string | null {
  const desde = conta?.saldoInicialDesde
  if (!desde) return null
  const alvo = `${ano}-${doisDig(mes + 1)}-${doisDig(dia)}`
  if (alvo >= desde) return null
  const quando = diaDoSaldo(desde)
  return conta!.tipo === 'cartao'
    ? `A fatura deste cartão foi informada em ${quando}: as compras de antes já estão nela. Lance a partir de ${quando}.`
    : `O saldo desta conta é de ${quando}: o que aconteceu antes já está nele. Lance a partir de ${quando}.`
}
