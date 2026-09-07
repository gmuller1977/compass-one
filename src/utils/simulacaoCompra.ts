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
  /**
   * Este mês não tem planejamento próprio: os números vieram do último ano
   * cadastrado, repetidos. Vale mostrar como estimativa, não como plano.
   */
  estimado: boolean
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

function anosComPlano(planos: Deps['planos']) {
  return new Set(
    Object.entries(planos).filter(([, p]) => !!p).map(([ano]) => Number(ano)),
  )
}

/**
 * Preenche os anos sem planejamento repetindo o último ano cadastrado.
 *
 * Sem isso a projeção CONGELA no ano sem plano: `valorFixaNoMes` devolve zero
 * e o saldo para de subir e de descer, enquanto as parcelas continuam caindo
 * por cima. Quem tem sobra todo mês via a compra parecer bem pior do que é —
 * medido, R$ 1.600 no lugar de R$ 3.800.
 *
 * Repetir o ano inteiro, e não um mês, preserva a sazonalidade: o 13º continua
 * em dezembro e o IPVA em janeiro. É a mesma operação que o Planejamento já
 * oferece com o nome "Copiar ano anterior".
 *
 * O que ele não sabe: quando uma parcela termina. Um financiamento que acaba
 * em março volta cheio o ano seguinte, porque o plano guarda doze números e
 * nenhuma data final. O erro superestima a despesa — para "posso comprar?",
 * é o lado certo de errar.
 */
function continuarPlanos(planos: Deps['planos'], anos: number[]): Deps['planos'] {
  const conhecidos = [...anosComPlano(planos)].sort((a, b) => a - b)
  const ultimo = conhecidos[conhecidos.length - 1]
  if (ultimo === undefined) return planos
  const saida = { ...planos }
  for (const ano of anos) if (!saida[ano]) saida[ano] = planos[ultimo]
  return saida
}

/** A projeção sem a compra, mês a mês, a partir do mês corrente. */
function serieBase(
  deps: Deps, horizonte: number, hoje: Date, comPlanoProprio: Set<number>,
): PontoFluxo[] {
  return Array.from({ length: horizonte }, (_, i) => {
    const { ano, mes } = somaMes(hoje.getFullYear(), hoje.getMonth(), i)
    const valor = saldoTotalNoFim(ano, mes, deps, { hoje }).valor
    return {
      ano, mes,
      semCompra: valor, comCompra: valor, parcela: 0,
      estimado: !comPlanoProprio.has(ano),
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
  /** Anos que a compra alcança sem planejamento próprio, estimados por repetição. */
  anosEstimados: number[]
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
  opts: {
    piso?: number; hoje?: Date; maxAdiamento?: number; maxParcelas?: number
    /** Repetir o último ano nos anos sem plano. Ligado por padrão. */
    repetirPlano?: boolean
  } = {},
): ResultadoCompra {
  const hoje = opts.hoje ?? new Date()
  const piso = opts.piso ?? 0
  const maxAdiamento = opts.maxAdiamento ?? 12
  const maxParcelas = opts.maxParcelas ?? 24

  // Cabe o adiamento maximo, o parcelamento maximo e uma folga para o mes
  // seguinte a ultima parcela aparecer no grafico.
  const horizonte = maxAdiamento + Math.max(p.parcelas, maxParcelas) + 2

  // O "estimado" e medido contra os planos ORIGINAIS: o calculo usa os anos
  // preenchidos, mas a tela precisa dizer quais numeros o usuario montou.
  const proprios = anosComPlano(deps.planos)
  const depsCalc = opts.repetirPlano === false ? deps : {
    ...deps,
    planos: continuarPlanos(
      deps.planos,
      Array.from({ length: horizonte }, (_, i) => somaMes(hoje.getFullYear(), hoje.getMonth(), i).ano),
    ),
  }
  const base = serieBase(depsCalc, horizonte, hoje, proprios)

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
  const anosEstimados = [...new Set(
    fluxo
      .filter(pt => pt.estimado && ym(pt.ano, pt.mes) <= ym(ultimo.ano, ultimo.mes))
      .map(pt => pt.ano),
  )]

  return { fluxo, pior, cabe, adiarPara, parcelasQueCabem, anosEstimados }
}
