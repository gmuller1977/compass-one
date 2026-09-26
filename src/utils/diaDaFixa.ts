/**
 * Em que dia uma fixa vence num mês. Vivia em NleShared, dentro de
 * Lançamentos; mudou para cá em 26/09/2026 para o motor de previsão
 * (saldoConta) e a lista "Contas dos próximos 7 dias" da tela Início usarem a
 * MESMA regra que desenha a fixa no dia em Lançamentos. NleShared reexporta.
 *
 * A regra, na ordem:
 *   1. dia movido NESTE mês (fixasMovidas) — o banco antecipou ou atrasou;
 *   2. débito automático cai no próximo dia útil;
 *   3. o dia do cadastro.
 */
export function ehFimDeSemana(dia: number, mes: number, ano: number) {
  const dow = new Date(ano, mes, dia).getDay()
  return dow === 0 || dow === 6
}
export function diaUtilOuProximo(dia: number, mes: number, ano: number, totalDias: number) {
  let d = dia
  while (d <= totalDias && ehFimDeSemana(d, mes, ano)) d++
  return Math.min(d, totalDias)
}
export function diaEfetivoFixa(
  f: { id: string; diaVencimento: number }, overrides: Record<string, number> | undefined,
  automatico: boolean, mes: number, ano: number, totalDias: number,
) {
  const override = overrides?.[f.id]
  if (override !== undefined) return override
  if (automatico) return diaUtilOuProximo(f.diaVencimento, mes, ano, totalDias)
  return f.diaVencimento
}

/**
 * A fatura é débito automático quando o cartão diz que é — ou quando não diz
 * nada e tem conta de pagamento. É a mesma leitura de Lançamentos
 * (`ehFaturaCartao` na cascata).
 */
export function faturaEhAutomatica(c: { formaPagamentoFatura?: string; contaPagamentoId?: string }) {
  return c.formaPagamentoFatura === 'automatico' || (!c.formaPagamentoFatura && !!c.contaPagamentoId)
}
