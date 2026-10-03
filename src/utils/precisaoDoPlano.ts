import { catKey } from '../components/acompanhamento/evolucaoCalcs'
import type { MesComparado } from './comparativoMensal'

/**
 * Precisão do plano: dá para confiar no próprio plano? O quanto o previsto
 * tem acertado o realizado nos meses que já fecharam. Briefing "Onda 4",
 * 29/09/2026.
 *
 * Não calcula realizado nem previsto: agrega o que comparativoMensal já montou
 * — os totais e as linhas por categoria de cada mês, da mesma passagem. Não
 * existe caminho paralelo para discordar da Início ou do Radar.
 *
 * As regras, e o porquê:
 *   - só meses FECHADOS: o corrente tem meia despesa e puxaria a média;
 *   - mínimo de 3 meses fechados: com um ou dois não há erro sistemático, só
 *     ruído apresentado como padrão — abaixo disso, null;
 *   - titular = (Σ real − Σ prev) / Σ prev — "quanto dinheiro a mais saiu";
 *   - categoria = média(real) − média(prev), ORDENADA EM REAIS, como as
 *     Estouradas: 200% numa categoria de R$ 20 não importa, 15% numa de
 *     R$ 2.000 importa;
 *   - sistemático é CONTAGEM ("estourou em 5 de 6"), não desvio-padrão;
 *   - categoria conta só nos meses em que tem plano: categoria nova não é
 *     erro de plano, e sem plano (prev 0) não há precisão a medir — ela já
 *     aparece em "Categorias estouradas" como "fora do plano";
 *   - receitas só no titular: a lista é de despesas, o lado acionável.
 */
export type ErroDeCategoria = {
  nome: string; descricao: string
  /** Média do previsto nos meses contados. */
  mediaPrev: number
  mediaReal: number
  /** mediaReal − mediaPrev: positivo = gastou mais. */
  desvioReais: number
  /** desvioReais / mediaPrev. */
  desvioPerc: number
  /** Em quantos meses passou do previsto. */
  mesesAcima: number
  mesesAbaixo: number
  /** Em quantos meses a categoria teve plano. */
  meses: number
}

export type PrecisaoDoPlano = {
  /** Meses FECHADOS contados. */
  meses: number
  /** (Σ real − Σ prev) / Σ prev das despesas. */
  despesasPerc: number
  /** Idem das receitas; null quando não há receita planejada na janela. */
  receitasPerc: number | null
  /** Despesas, as que mais erram em reais, já ordenadas e cortadas em `top`. */
  categorias: ErroDeCategoria[]
  /** Metade mais velha da janela contra a mais nova, pelo tamanho do erro. */
  tendencia: 'melhorando' | 'piorando' | 'estavel' | null
  percAntigo: number | null
  percRecente: number | null
}

const MEIO_CENTAVO = 0.005
/** Abaixo de 1 ponto percentual de diferença, o erro "não mudou". */
const LIMIAR_TENDENCIA = 0.01

const erro = (ms: MesComparado[]) => {
  const prev = ms.reduce((s, m) => s + m.prevDespesas, 0)
  const real = ms.reduce((s, m) => s + m.despesas, 0)
  return prev > MEIO_CENTAVO ? (real - prev) / prev : null
}

export function precisaoDoPlano(
  meses: MesComparado[],
  opts: { minimoMeses?: number; top?: number } = {},
): PrecisaoDoPlano | null {
  const minimo = opts.minimoMeses ?? 3
  const top = opts.top ?? 3
  const fechados = meses.filter(m => !m.parcial)
  if (fechados.length < minimo) return null

  const despesasPerc = erro(fechados)
  // Sem plano de despesa em nenhum mês fechado: não há o que medir.
  if (despesasPerc === null) return null

  const prevR = fechados.reduce((s, m) => s + m.prevReceitas, 0)
  const realR = fechados.reduce((s, m) => s + m.receitas, 0)
  const receitasPerc = prevR > MEIO_CENTAVO ? (realR - prevR) / prevR : null

  // Por categoria (nome, variante), só nos meses em que ela tem plano.
  const acc = new Map<string, { nome: string; descricao: string; prev: number; real: number; acima: number; abaixo: number; meses: number }>()
  for (const m of fechados) {
    for (const l of m.linhasSaida) {
      if (l.prev <= MEIO_CENTAVO) continue
      const k = catKey(l.nome, l.descricao)
      const a = acc.get(k) ?? { nome: l.nome, descricao: l.descricao, prev: 0, real: 0, acima: 0, abaixo: 0, meses: 0 }
      a.prev += l.prev
      a.real += l.real
      a.meses += 1
      if (l.real - l.prev > MEIO_CENTAVO) a.acima += 1
      else if (l.prev - l.real > MEIO_CENTAVO) a.abaixo += 1
      acc.set(k, a)
    }
  }
  const categorias: ErroDeCategoria[] = [...acc.values()]
    .map(a => {
      const mediaPrev = a.prev / a.meses
      const mediaReal = a.real / a.meses
      const desvioReais = mediaReal - mediaPrev
      return {
        nome: a.nome, descricao: a.descricao, mediaPrev, mediaReal, desvioReais,
        desvioPerc: desvioReais / mediaPrev,
        mesesAcima: a.acima, mesesAbaixo: a.abaixo, meses: a.meses,
      }
    })
    .filter(c => Math.abs(c.desvioReais) > MEIO_CENTAVO)
    .sort((a, b) => Math.abs(b.desvioReais) - Math.abs(a.desvioReais))
    .slice(0, top)

  // Tendência: com 4 meses ou mais, a metade mais velha contra a mais nova —
  // com número ímpar, o mês do meio fica fora das duas. Compara o TAMANHO do
  // erro: sair de −12% para −7% também é o plano ficando mais preciso.
  let tendencia: PrecisaoDoPlano['tendencia'] = null
  let percAntigo: number | null = null
  let percRecente: number | null = null
  if (fechados.length >= 4) {
    const metade = Math.floor(fechados.length / 2)
    percAntigo = erro(fechados.slice(0, metade))
    percRecente = erro(fechados.slice(fechados.length - metade))
    if (percAntigo !== null && percRecente !== null) {
      const d = Math.abs(percRecente) - Math.abs(percAntigo)
      tendencia = d < -LIMIAR_TENDENCIA ? 'melhorando' : d > LIMIAR_TENDENCIA ? 'piorando' : 'estavel'
    }
  }

  return { meses: fechados.length, despesasPerc, receitasPerc, categorias, tendencia, percAntigo, percRecente }
}
