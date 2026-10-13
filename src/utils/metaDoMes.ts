/**
 * A frase do topo da Início: o mês contra a META DE SOBRA que a pessoa definiu
 * no Planejamento (`PlanoAnoData.objetivos`). Pedido do Guilherme em
 * 13/10/2026: "como o plano pode mudar não faz sentido a informação atual,
 * mas a meta é inegociável".
 *
 * Nenhuma conta nova. A sobra do mês é o saldo final previsto menos o saldo
 * com que o mês abriu — os dois números da memória de cálculo (mês corrente e
 * fechado) ou de `previsaoDoMes` (mês futuro). A meta é de sobra, então se
 * compara com a sobra, não com o saldo final.
 *
 * Três estados, com o corte que o Radar já usa para receita: 100% ou mais da
 * meta, dentro; de 80% a 99%, perto; abaixo de 80%, abaixo.
 */
export type EstadoMeta = 'dentro' | 'perto' | 'abaixo'

export interface MetaDoMes {
  estado: EstadoMeta
  meta: number
  sobra: number
  /** Quanto falta para a meta; zero quando já chegou. */
  falta: number
}

export const CORTE_PERTO = 0.8

export function metaDoMes(meta: number | undefined, abertura: number, fechamento: number): MetaDoMes | null {
  if (!meta || meta <= 0) return null
  const sobra = fechamento - abertura
  const falta = Math.max(0, meta - sobra)
  // Meio centavo de folga: resíduo de ponto flutuante não tira ninguém da meta.
  const estado: EstadoMeta = falta < 0.005 ? 'dentro' : sobra >= meta * CORTE_PERTO ? 'perto' : 'abaixo'
  return { estado, meta, sobra, falta: falta < 0.005 ? 0 : falta }
}

/** Mês corrente ou futuro fala no presente; mês fechado, no passado. */
export function fraseDaMeta(m: MetaDoMes, mes: string, quando: 'corrente' | 'fechado' | 'futuro', fmt: (n: number) => string): string {
  const meta = fmt(m.meta)
  const falta = fmt(m.falta)
  if (quando === 'fechado') {
    if (m.estado === 'dentro') return `Parabéns! ${mes} bateu a meta de ${meta}`
    if (m.estado === 'perto') return `${mes} ficou perto da meta de ${meta} · faltaram ${falta}`
    return `${mes} ficou abaixo da meta de ${meta} · faltaram ${falta}`
  }
  if (quando === 'futuro') {
    if (m.estado === 'dentro') return `${mes} deve bater a meta de ${meta}`
    if (m.estado === 'perto') return `${mes} deve ficar perto da meta de ${meta} · faltam ${falta}`
    return `${mes} deve ficar abaixo da meta de ${meta} · faltam ${falta}`
  }
  if (m.estado === 'dentro') return `Parabéns! Você está dentro da meta de ${meta}`
  if (m.estado === 'perto') return `Você está perto da meta de ${meta} · faltam ${falta}`
  return `Você está abaixo da meta de ${meta} · faltam ${falta}`
}

/** Ponto sobre o azul do topo (elemento gráfico, 3:1 no #1e40af). */
export const COR_META: Record<EstadoMeta, string> = {
  dentro: '#86efac',
  perto: '#fde047',
  abaixo: '#f87171',
}
