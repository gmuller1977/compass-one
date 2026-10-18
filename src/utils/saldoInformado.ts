import { parseBRL } from './moeda'

/**
 * O saldo informado do banco (ou da carteira) num mês, ou `null` sem ele.
 *
 * Até 18/10/2026 só valia saldo positivo: zero e negativo contavam como "não
 * informado", e conta zerada ou no cheque especial não se conciliava. O
 * Guilherme pediu que valessem. Meses antigos podem ter "R$ 0,00" gravado com
 * o sentido de nada, então zero ou negativo só valem com a marca
 * `saldoBancoInformado`, que as gravações novas põem. Positivo vale como
 * sempre valeu.
 */
export function saldoInformado(dm?: { saldoBanco?: string; saldoBancoInformado?: boolean } | null): number | null {
  const s = (dm?.saldoBanco ?? '').trim()
  if (!s) return null
  const v = parseBRL(s)
  if (v > 0) return v
  return dm?.saldoBancoInformado ? v : null
}

/**
 * A carteira: qualquer valor gravado vale, zero inclusive, com marca ou sem.
 * O informado do dinheiro não entra na base de tela nenhuma (saldoFinalDinheiro),
 * só mostra a diferença, então um "R$ 0,00" antigo não move número nenhum.
 */
export function saldoInformadoDaCarteira(dm?: { saldoBanco?: string } | null): number | null {
  const s = (dm?.saldoBanco ?? '').trim()
  return s ? parseBRL(s) : null
}
