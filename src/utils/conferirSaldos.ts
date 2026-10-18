import type { Conta, DadosMes } from '../context/AppContext'
import { saldoFinalConta, type Deps } from './saldoConta'

/**
 * "Confira o saldo dos bancos", na Início (18/10/2026, pedido do Guilherme).
 *
 * O saldo do app só bate com o do banco enquanto tudo é lançado. Em vez de
 * esperar a pessoa lembrar da conciliação em Lançamentos, a Início pergunta,
 * conta por conta, se o número confere. Não há conta nova: o saldo mostrado
 * é o `saldoFinalConta` do mês corrente, o mesmo do Radar.
 *
 * A resposta grava no MESMO lugar que a caixa de saldo de Lançamentos:
 *   - "Confere" grava só a data (`saldoBancoData`), como a caixa faz quando
 *     se confirma sem digitar valor. Nenhum número muda.
 *   - Outro valor grava `saldoBanco` + data. Daí em diante vale a regra que
 *     já existe: o Radar mostra o informado e Lançamentos mostra a diferença.
 */

/** Uma conta pede conferência todo dia em que ainda não foi conferida (pedido do Guilherme, 18/10/2026). */
export const DIAS_ENTRE_CONFERENCIAS = 1

export type SaldoAConferir = {
  conta: Conta
  /** O saldo de hoje no app: `saldoFinalConta` do mês corrente. */
  saldoNoApp: number
  /** Data (AAAA-MM-DD) da última conferência, em qualquer mês, ou null. */
  ultima: string | null
}

export const chaveDoMes = (contaId: string, ano: number, mes: number) =>
  `${contaId}-${ano}-${String(mes + 1).padStart(2, '0')}`

export const dataDeHoje = (hoje: Date) =>
  `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`

/** A última data em que o saldo da conta foi conferido, em qualquer mês. */
export function ultimaConferencia(contaId: string, extratoData: Record<string, DadosMes>): string | null {
  const prefixo = contaId + '-'
  let ultima: string | null = null
  for (const [k, dm] of Object.entries(extratoData)) {
    if (!k.startsWith(prefixo)) continue
    const d = dm?.saldoBancoData
    if (d && (!ultima || d > ultima)) ultima = d
  }
  return ultima
}

function diasEntre(de: string, ate: string): number {
  const [a1, m1, d1] = de.split('-').map(Number)
  const [a2, m2, d2] = ate.split('-').map(Number)
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000)
}

/** As contas de banco que pedem conferência hoje, na ordem do cadastro. */
export function saldosAConferir(deps: Deps, hoje = new Date()): SaldoAConferir[] {
  const ano = hoje.getFullYear(), mes = hoje.getMonth()
  const hojeStr = dataDeHoje(hoje)
  return deps.contas
    .filter(c => c.tipo !== 'cartao')
    .map(conta => ({
      conta,
      saldoNoApp: saldoFinalConta(conta, ano, mes, deps),
      ultima: ultimaConferencia(conta.id, deps.extratoData),
    }))
    .filter(s => !s.ultima || diasEntre(s.ultima, hojeStr) >= DIAS_ENTRE_CONFERENCIAS)
}

/** "Confere": só a data, nenhum número muda. */
export function marcarConferido(dm: DadosMes, hoje: Date): DadosMes {
  return { ...dm, saldoBancoData: dataDeHoje(hoje) }
}

/** Outro valor: o saldo do banco, com a data — o que a caixa de Lançamentos grava. */
export function informarSaldo(dm: DadosMes, valorFormatado: string, hoje: Date): DadosMes {
  return { ...dm, saldoBanco: valorFormatado, saldoBancoData: dataDeHoje(hoje) }
}
