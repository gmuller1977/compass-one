import type { Conta } from '../context/AppContext'
import { saldoTotalNoFim, type Deps } from './saldoConta'

/**
 * "Comprar isso agora quebra algum mês? Se quebra, quando dá?"
 *
 * A conta é sempre a mesma: pega a projeção que o Planejamento já sabe fazer
 * (saldoTotalNoFim, encadeada desde o mês corrente) e desconta as parcelas por
 * cima. As parcelas são saída pura, então não é preciso re-projetar nada — a
 * série sem a compra é calculada UMA vez e todo o resto é aritmética sobre ela.
 *
 * É isso que torna a busca por "quando dá" barata: varrer doze meses de início
 * não custa doze projeções, custa doze somas.
 */

export type Parcelamento = {
  valorTotal: number
  parcelas: number
  /** Cartão em que a compra cai. Vazio = débito ou PIX, sai direto da conta. */
  cartaoId?: string
  ano: number
  mes: number
}

export type PontoFluxo = {
  ano: number
  mes: number
  /** Projeção sem a compra: o que o Planejamento já diria. */
  semCompra: number
  comCompra: number
  /** Quanto a compra tira NESTE mês. */
  parcela: number
  /** Não há plano cadastrado para este ano — a projeção está otimista demais. */
  semPlano: boolean
}

const ym = (ano: number, mes: number) => ano * 100 + (mes + 1)

function somaMes(ano: number, mes: number, n: number) {
  const total = mes + n
  return { ano: ano + Math.floor(total / 12), mes: ((total % 12) + 12) % 12 }
}

/**
 * Em que mês cada parcela sai do bolso.
 *
 * No débito e no PIX sai no próprio mês da parcela. No cartão sai quando a
 * fatura vence, e é a mesma regra de deslocamento que o extrato já usa: quando
 * o cartão vence ANTES de fechar, a fatura daquela compra só é paga no mês
 * seguinte.
 */
export function saidasDoParcelamento(p: Parcelamento, contas: Conta[]) {
  const cartao = p.cartaoId ? contas.find(c => c.id === p.cartaoId) : undefined
  const desloc = cartao && (cartao.diaVencimento ?? 1) < (cartao.diaFechamento ?? 1) ? 1 : 0
  const valor = p.parcelas > 0 ? p.valorTotal / p.parcelas : 0

  return Array.from({ length: Math.max(0, p.parcelas) }, (_, k) => ({
    ...somaMes(p.ano, p.mes, k + desloc),
    valor,
  }))
}

/** A projeção sem a compra, mês a mês, a partir do mês corrente. */
function serieBase(deps: Deps, horizonte: number, hoje: Date): PontoFluxo[] {
  const anosComPlano = new Set(
    Object.entries(deps.planos)
      .filter(([, plano]) => !!plano)
      .map(([ano]) => Number(ano)),
  )
  return Array.from({ length: horizonte }, (_, i) => {
    const { ano, mes } = somaMes(hoje.getFullYear(), hoje.getMonth(), i)
    const valor = saldoTotalNoFim(ano, mes, deps, { hoje }).valor
    return {
      ano, mes,
      semCompra: valor, comCompra: valor, parcela: 0,
      semPlano: !anosComPlano.has(ano),
    }
  })
}

/** Aplica um parcelamento sobre a série base. Não mexe na original. */
function aplicar(base: PontoFluxo[], saidas: { ano: number; mes: number; valor: number }[]): PontoFluxo[] {
  let acumulado = 0
  return base.map(pt => {
    const parcela = saidas
      .filter(s => ym(s.ano, s.mes) === ym(pt.ano, pt.mes))
      .reduce((t, s) => t + s.valor, 0)
    acumulado += parcela
    return { ...pt, parcela, comCompra: pt.semCompra - acumulado }
  })
}

export type ResultadoCompra = {
  fluxo: PontoFluxo[]
  /** O mês mais apertado depois da compra. */
  pior: PontoFluxo
  cabe: boolean
  /**
   * Quando a compra passa a caber, adiando o início. `null` quando não cabe
   * dentro da janela procurada — aí o problema não é a data.
   */
  adiarPara: { ano: number; mes: number; meses: number } | null
  /** Menor número de parcelas que cabe mantendo a data. `null` se nenhum cabe. */
  parcelasQueCabem: number | null
  /** Anos do horizonte sem plano cadastrado: a projeção fica otimista. */
  anosSemPlano: number[]
}

/**
 * Julga um parcelamento sobre a série base.
 *
 * Só os meses a partir da PRIMEIRA saída entram no julgamento. Um mês apertado
 * antes da compra não é culpa dela — e, o que importa mais, adiar nunca o
 * consertaria: a busca por "quando dá" ficaria presa para sempre num aperto
 * que já existia.
 */
function avaliar(
  base: PontoFluxo[],
  saidas: { ano: number; mes: number; valor: number }[],
  piso: number,
) {
  const fluxo = aplicar(base, saidas)
  const inicio = saidas.length ? Math.min(...saidas.map(s => ym(s.ano, s.mes))) : 0
  const janela = fluxo.filter(pt => ym(pt.ano, pt.mes) >= inicio)
  const pior = janela.reduce((a, b) => (b.comCompra < a.comCompra ? b : a), janela[0] ?? fluxo[0])
  return { fluxo, pior, cabe: janela.every(pt => pt.comCompra >= piso) }
}

export function simularCompra(
  p: Parcelamento,
  deps: Deps,
  opts: { piso?: number; hoje?: Date; maxAdiamento?: number; maxParcelas?: number } = {},
): ResultadoCompra {
  const hoje = opts.hoje ?? new Date()
  const piso = opts.piso ?? 0
  const maxAdiamento = opts.maxAdiamento ?? 12
  const maxParcelas = opts.maxParcelas ?? 24

  // Cabe o adiamento maximo, o parcelamento maximo e uma folga para o mes
  // seguinte a ultima parcela aparecer no grafico.
  const horizonte = maxAdiamento + Math.max(p.parcelas, maxParcelas) + 2
  const base = serieBase(deps, horizonte, hoje)

  const { fluxo, pior, cabe } = avaliar(base, saidasDoParcelamento(p, deps.contas), piso)

  // Adiar: mesma compra, mês a mês para a frente, até caber.
  let adiarPara: ResultadoCompra['adiarPara'] = null
  if (!cabe) {
    for (let d = 1; d <= maxAdiamento; d++) {
      const alvo = somaMes(p.ano, p.mes, d)
      if (avaliar(base, saidasDoParcelamento({ ...p, ...alvo }, deps.contas), piso).cabe) {
        adiarPara = { ...alvo, meses: d }
        break
      }
    }
  }

  // Esticar: mesma data, mais parcelas.
  let parcelasQueCabem: number | null = null
  if (!cabe) {
    for (let n = p.parcelas + 1; n <= maxParcelas; n++) {
      if (avaliar(base, saidasDoParcelamento({ ...p, parcelas: n }, deps.contas), piso).cabe) {
        parcelasQueCabem = n
        break
      }
    }
  }

  // So os anos que a compra realmente alcanca — avisar sobre 2028 num
  // parcelamento que acaba em marco so faria ruido.
  const ultimo = fluxo.reduce((a, b) => (b.parcela > 0 ? b : a), fluxo[0])
  const anosSemPlano = [...new Set(
    fluxo
      .filter(pt => pt.semPlano && ym(pt.ano, pt.mes) <= ym(ultimo.ano, ultimo.mes))
      .map(pt => pt.ano),
  )]

  return { fluxo, pior, cabe, adiarPara, parcelasQueCabem, anosSemPlano }
}
