import type { Conta, DadosMes } from '../context/AppContext'
import { saldoFinalConta, saldoFinalDinheiro, type Deps } from './saldoConta'
import { parseBRL } from './moeda'

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

/**
 * Todas as contas de banco no mês corrente, com o que a Início mostra
 * (18/10/2026, pedido do Guilherme: o cartão fica logo abaixo do saldo e,
 * conferido, mostra a diferença):
 *   - `calculado`: o saldo pelos lançamentos, SEM o saldo informado neste
 *     mês — o "Sistema" da caixa de Lançamentos;
 *   - `informado`: o saldo do banco digitado neste mês, ou null;
 *   - `diferenca`: informado − calculado (0 sem informado);
 *   - `pendente`: ainda não conferida hoje.
 */
export type SaldoDoBanco = {
  conta: Conta
  calculado: number
  informado: number | null
  diferenca: number
  pendente: boolean
}

/**
 * A carteira entra como mais uma linha (pedido do Guilherme, 18/10/2026:
 * "assim a pessoa já tem informação de quanto tem e onde está"), quando a
 * pessoa usa dinheiro: saldo inicial, lançamento ou categoria em espécie.
 * O saldo informado da carteira não vence o calculado (regra de sempre), então
 * a diferença fica à vista o mês inteiro.
 */
export const CARTEIRA: Conta = {
  id: 'dinheiro', nome: 'Dinheiro', banco: 'Dinheiro', tipo: 'corrente',
  saldoInicial: 0, cor: '#16a34a', icone: '💵',
}

export function usaDinheiro(deps: Deps): boolean {
  return (deps.saldoInicialDinheiro ?? 0) !== 0
    || deps.categorias.some(c => c.ativa && c.tipoMovimento === 'dinheiro')
    || Object.entries(deps.extratoData).some(([k, dm]) =>
      k.startsWith('dinheiro-') && Object.keys(dm?.lancamentos ?? {}).length > 0)
}

export function saldosDosBancos(deps: Deps, hoje = new Date()): SaldoDoBanco[] {
  const ano = hoje.getFullYear(), mes = hoje.getMonth()
  const hojeStr = dataDeHoje(hoje)
  const contas = deps.contas.filter(c => c.tipo !== 'cartao')
  if (usaDinheiro(deps)) contas.push(CARTEIRA)
  return contas
    .map(conta => {
      const k = chaveDoMes(conta.id, ano, mes)
      const dm = deps.extratoData[k]
      const v = parseBRL(dm?.saldoBanco ?? '')
      // Banco: zero ou negativo não é informado, a regra de saldoFinalConta.
      // Carteira: o informado não entra na base, então zero vale (a pessoa
      // gastou todo o dinheiro e o app ainda acha que sobra).
      const informado = conta.id === CARTEIRA.id
        ? ((dm?.saldoBanco ?? '').trim() && v >= 0 ? v : null)
        : (v > 0 ? v : null)
      const semInformado = dm ? { ...deps, extratoData: { ...deps.extratoData, [k]: { ...dm, saldoBanco: '' } } } : deps
      const calculado = conta.id === CARTEIRA.id
        ? saldoFinalDinheiro(ano, mes, deps)
        : saldoFinalConta(conta, ano, mes, semInformado)
      const ultima = ultimaConferencia(conta.id, deps.extratoData)
      return {
        conta, calculado, informado,
        diferenca: informado === null ? 0 : informado - calculado,
        pendente: !ultima || diasEntre(ultima, hojeStr) >= DIAS_ENTRE_CONFERENCIAS,
      }
    })
}

/** As contas que ainda pedem conferência hoje. */
export function saldosAConferir(deps: Deps, hoje = new Date()): SaldoDoBanco[] {
  return saldosDosBancos(deps, hoje).filter(s => s.pendente)
}

/** "Confere": só a data, nenhum número muda. */
export function marcarConferido(dm: DadosMes, hoje: Date): DadosMes {
  return { ...dm, saldoBancoData: dataDeHoje(hoje) }
}

/** Outro valor: o saldo do banco, com a data — o que a caixa de Lançamentos grava. */
export function informarSaldo(dm: DadosMes, valorFormatado: string, hoje: Date): DadosMes {
  return { ...dm, saldoBanco: valorFormatado, saldoBancoData: dataDeHoje(hoje) }
}
