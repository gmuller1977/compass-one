import type { ParcelaNoPlano } from './simuladorNoPlano'

/**
 * Com a compra, cada mês ainda guarda a meta de economia?
 *
 * Pedido do Guilherme em 15/10/2026. A régua é a do Planejamento — o cartão
 * do mês diz "Dentro da meta" quando o que o PLANO guarda (receitas −
 * despesas planejadas) alcança `objetivos[mês]`. Aqui é a mesma régua menos a
 * parcela, e a parcela cai onde "Vou comprar — incluir no planejamento" a
 * gravaria (do mês da compra em diante, sem o deslocamento do cartão). Assim,
 * se a pessoa incluir a compra, o Planejamento mostra exatamente o que esta
 * conta previu.
 *
 * Só meses com meta e com parcela entram. Nenhum número novo: o que o plano
 * guarda vem de quem chama (`previstoDoAno`, a passagem do Planejamento).
 */
export type MesDaMeta = { ano: number; mes: number; meta: number; guardaSem: number; guardaCom: number }

export type MetaNaSimulacao = {
  meses: MesDaMeta[]
  /** Meses que ficam abaixo da meta por causa da compra. */
  caem: MesDaMeta[]
  /** Meses que já estavam abaixo da meta mesmo sem a compra. */
  jaAbaixo: MesDaMeta[]
  /** O mês que fica mais longe da meta com a compra. */
  pior: MesDaMeta | null
}

const MEIO_CENTAVO = 0.005

export function metaNaSimulacao(
  parcelas: ParcelaNoPlano[],
  doMes: (ano: number, mes: number) => { guarda: number; meta: number } | null,
): MetaNaSimulacao | null {
  const meses: MesDaMeta[] = []
  for (const p of parcelas) {
    const m = doMes(p.ano, p.mes)
    if (!m || m.meta <= 0) continue
    meses.push({ ano: p.ano, mes: p.mes, meta: m.meta, guardaSem: m.guarda, guardaCom: m.guarda - p.valor })
  }
  if (!meses.length) return null
  const abaixo = (g: number, meta: number) => meta - g > MEIO_CENTAVO
  const jaAbaixo = meses.filter(m => abaixo(m.guardaSem, m.meta))
  const caem = meses.filter(m => !abaixo(m.guardaSem, m.meta) && abaixo(m.guardaCom, m.meta))
  const comFalta = meses.filter(m => abaixo(m.guardaCom, m.meta))
  const pior = comFalta.length
    ? comFalta.reduce((a, b) => (b.meta - b.guardaCom > a.meta - a.guardaCom ? b : a))
    : null
  return { meses, caem, jaAbaixo, pior }
}
