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
 *
 * NADA aqui extrapola. A simulação para onde o planejamento para, e quem chama
 * descobre esse limite por `fimDoPlanejamento`.
 *
 * Houve uma tentativa de estender o plano repetindo o último ano. Ela furava no
 * caso comum: quem começou a planejar em setembro tem janeiro a agosto zerados,
 * e a cópia levava os zeros junto — oito meses congelados, rotulados como
 * estimativa. Congelar ao menos era honesto; o "≈" afirmava um fundamento que
 * não existia. O erro de raiz era tratar o plano como ANO quando ele é um
 * conjunto de MESES.
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
}

export type Mes = { ano: number; mes: number }

const ym = (ano: number, mes: number) => ano * 100 + (mes + 1)
const ymDe = (m: Mes) => ym(m.ano, m.mes)

function somaMes(ano: number, mes: number, n: number): Mes {
  const total = mes + n
  return { ano: ano + Math.floor(total / 12), mes: ((total % 12) + 12) % 12 }
}

/** Quantos meses de `a` até `b`, contando as duas pontas. Zero se b vier antes. */
function mesesAte(a: Mes, b: Mes) {
  return Math.max(0, (b.ano - a.ano) * 12 + (b.mes - a.mes) + 1)
}

/**
 * O último mês com algum valor planejado — em receita ou em despesa.
 *
 * É o horizonte de tudo nesta tela. Medido no MÊS, e não no ano: um plano que
 * cobre só setembro a dezembro tem horizonte em dezembro, mesmo existindo a
 * entrada `planos[2026]` inteira, com onze meses vazios.
 *
 * `null` quando não há nada planejado em lugar nenhum.
 */
export function fimDoPlanejamento(planos: Deps['planos']): Mes | null {
  let melhor: Mes | null = null
  for (const [anoStr, plano] of Object.entries(planos)) {
    if (!plano) continue
    const ano = Number(anoStr)
    for (const linha of [...(plano.entradas ?? []), ...(plano.saidas ?? [])]) {
      for (let mes = 11; mes >= 0; mes--) {
        if ((linha.v?.[mes] ?? 0) <= 0) continue
        if (!melhor || ym(ano, mes) > ymDe(melhor)) melhor = { ano, mes }
        break
      }
    }
  }
  return melhor
}

function deslocamentoDoCartao(cartaoId: string | undefined, contas: Conta[]) {
  const cartao = cartaoId ? contas.find(c => c.id === cartaoId) : undefined
  return cartao && (cartao.diaVencimento ?? 1) < (cartao.diaFechamento ?? 1) ? 1 : 0
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
  const desloc = deslocamentoDoCartao(p.cartaoId, contas)
  const valor = p.parcelas > 0 ? p.valorTotal / p.parcelas : 0

  return Array.from({ length: Math.max(0, p.parcelas) }, (_, k) => ({
    ...somaMes(p.ano, p.mes, k + desloc),
    valor,
  }))
}

/**
 * Quantas parcelas o planejamento cobre, comprando numa data.
 *
 * Zero significa que nem a primeira parcela cabe — o plano acabou antes dela.
 * No cartão que vence antes de fechar a primeira parcela já nasce um mês à
 * frente, e isso come um mês do teto.
 */
export function parcelasQueOPlanoCobre(
  planos: Deps['planos'],
  compra: { ano: number; mes: number; cartaoId?: string },
  contas: Conta[],
): number {
  const fim = fimDoPlanejamento(planos)
  if (!fim) return 0
  const primeira = somaMes(compra.ano, compra.mes, deslocamentoDoCartao(compra.cartaoId, contas))
  return mesesAte(primeira, fim)
}

/** A projeção sem a compra, mês a mês, do mês corrente até o fim do plano. */
function serieBase(deps: Deps, hoje: Date, fim: Mes): PontoFluxo[] {
  const inicio = { ano: hoje.getFullYear(), mes: hoje.getMonth() }
  return Array.from({ length: mesesAte(inicio, fim) }, (_, i) => {
    const { ano, mes } = somaMes(inicio.ano, inicio.mes, i)
    const valor = saldoTotalNoFim(ano, mes, deps, { hoje }).valor
    return { ano, mes, semCompra: valor, comCompra: valor, parcela: 0 }
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
  /** O mês mais fundo depois da compra — onde o saldo chega ao mínimo. */
  pior: PontoFluxo
  /**
   * O PRIMEIRO mês que fura o piso. Não é o mesmo que `pior`: com o saldo
   * caindo mês a mês, o fundo do poço fica lá na frente, mas o problema começa
   * antes — e é sobre o começo que a pessoa decide.
   */
  primeiroAperto: PontoFluxo | null
  cabe: boolean
  /**
   * Quando a compra passa a caber, adiando o início. `null` quando não cabe
   * dentro do que o planejamento alcança.
   */
  adiarPara: { ano: number; mes: number; meses: number } | null
  /** Menor número de parcelas que cabe mantendo a data. `null` se nenhum cabe. */
  parcelasQueCabem: number | null
  /**
   * Alguma alternativa foi descartada por passar do fim do planejamento. A tela
   * precisa dizer isso: "não achei saída" e "não posso olhar tão longe" são
   * respostas diferentes.
   */
  limitadoPeloPlano: boolean
  /** Último mês que o planejamento alcança. */
  fimDoPlano: Mes
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
  const primeiroAperto = janela.find(pt => pt.comCompra < piso) ?? null
  return { fluxo, pior, primeiroAperto, cabe: !primeiroAperto }
}

/** `null` quando não há planejamento nenhum: aí não há o que simular. */
export function simularCompra(
  p: Parcelamento,
  deps: Deps,
  opts: { piso?: number; hoje?: Date; maxAdiamento?: number; maxParcelas?: number } = {},
): ResultadoCompra | null {
  const hoje = opts.hoje ?? new Date()
  const piso = opts.piso ?? 0
  const maxAdiamento = opts.maxAdiamento ?? 12
  const maxParcelas = opts.maxParcelas ?? 24

  const fimDoPlano = fimDoPlanejamento(deps.planos)
  if (!fimDoPlano) return null

  const base = serieBase(deps, hoje, fimDoPlano)
  if (!base.length) return null

  let limitadoPeloPlano = false
  /** Uma alternativa só vale se TODAS as parcelas couberem no planejamento. */
  const cabeNoPlano = (saidas: Mes[]) => {
    const dentro = saidas.every(s => ymDe(s) <= ymDe(fimDoPlano))
    if (!dentro) limitadoPeloPlano = true
    return dentro
  }

  const saidas = saidasDoParcelamento(p, deps.contas)
  cabeNoPlano(saidas)
  const { fluxo, pior, primeiroAperto, cabe } = avaliar(base, saidas, piso)

  // Adiar: mesma compra, mês a mês para a frente, até caber. Passou do fim do
  // plano, para: adiar mais só afasta ainda mais.
  let adiarPara: ResultadoCompra['adiarPara'] = null
  if (!cabe) {
    for (let d = 1; d <= maxAdiamento; d++) {
      const alvo = somaMes(p.ano, p.mes, d)
      const s = saidasDoParcelamento({ ...p, ...alvo }, deps.contas)
      if (!cabeNoPlano(s)) break
      if (avaliar(base, s, piso).cabe) { adiarPara = { ...alvo, meses: d }; break }
    }
  }

  // Esticar: mesma data, mais parcelas. Mesma regra — mais parcelas terminam
  // mais tarde, então uma vez fora do plano não volta.
  let parcelasQueCabem: number | null = null
  if (!cabe) {
    for (let n = p.parcelas + 1; n <= maxParcelas; n++) {
      const s = saidasDoParcelamento({ ...p, parcelas: n }, deps.contas)
      if (!cabeNoPlano(s)) break
      if (avaliar(base, s, piso).cabe) { parcelasQueCabem = n; break }
    }
  }

  return {
    fluxo, pior, primeiroAperto, cabe,
    adiarPara, parcelasQueCabem, limitadoPeloPlano, fimDoPlano,
  }
}
