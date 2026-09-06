import type { Conta, Categoria, DadosMes, PlanoAnoData } from '../context/AppContext'
import { parseBRL } from './moeda'
import { valorFixaNoMes } from './valorFixa'
import { resolverFixaDoMes, dadosBancariosDoMes } from './fixasDoMes'

type Deps = {
  extratoData: Record<string, DadosMes>
  faturaData: Record<string, { lancamentos?: Record<number, { tipo: string; valor: number }[]> }>
  contas: Conta[]
  categorias: Categoria[]
  planos: Record<number, PlanoAnoData | undefined>
  saldoInicialDinheiro: number
}

const ym = (ano: number, mes: number) => ano * 100 + (mes + 1)

/**
 * Saldo de uma conta ao FIM de um mês.
 *
 * Três coisas movimentam uma conta de banco, e todas contam aqui:
 *   - os lançamentos do extrato
 *   - as categorias fixas confirmadas naquela conta
 *   - o pagamento da fatura do cartão, gravado como a fixa `cartao-<id>`
 *
 * O saldo informado na conciliação, quando existe, **vence**: ele veio do
 * extrato do banco e é a verdade. Meses sem informado partem do último
 * informado anterior — ou do saldo de cadastro, se nunca houve nenhum.
 *
 * A fixa é lida da PRÓPRIA conta, não do mês inteiro: aqui a pergunta é
 * "quanto tem nesta conta", e uma fixa confirmada na conta A não tirou
 * dinheiro da conta B. (Difere de `resolverFixaDoMes`, que responde "esta
 * fixa do mês foi paga?" e por isso olha todas as contas.)
 */
export function saldoFinalConta(
  conta: Conta,
  ano: number,
  mes: number,
  deps: Deps,
): number {
  const { extratoData } = deps
  const prefixo = conta.id + '-'
  const alvo = ym(ano, mes)

  const informadoDe = (dm?: DadosMes) => {
    const v = parseBRL(dm?.saldoBanco ?? '')
    return v > 0 ? v : null
  }

  const chave = `${conta.id}-${ano}-${String(mes + 1).padStart(2, '0')}`
  const jaInformado = informadoDe(extratoData[chave])
  if (jaInformado !== null) return jaInformado

  // Último mês anterior com saldo informado vira a base.
  let baseYM = 0
  let base = conta.saldoInicial ?? 0
  for (const [k, dm] of Object.entries(extratoData)) {
    if (!k.startsWith(prefixo)) continue
    const v = informadoDe(dm)
    if (v === null) continue
    const kym = parseInt(k.slice(-7, -3)) * 100 + parseInt(k.slice(-2))
    if (kym < alvo && kym > baseYM) { baseYM = kym; base = v }
  }

  let acc = base
  for (const [k, dm] of Object.entries(extratoData)) {
    if (!k.startsWith(prefixo)) continue
    const kAno = parseInt(k.slice(-7, -3))
    const kMes = parseInt(k.slice(-2)) - 1
    if (!Number.isFinite(kAno) || !Number.isFinite(kMes)) continue
    const kym = ym(kAno, kMes)
    if (kym <= baseYM || kym > alvo) continue
    acc += movimentoDoMes(dm, kAno, kMes, deps)
  }
  return acc
}

/** Entradas menos saídas de um mês, numa conta: lançamentos + fixas + fatura. */
function movimentoDoMes(dm: DadosMes, ano: number, mes: number, deps: Deps): number {
  const { categorias, planos, contas, faturaData } = deps
  let acc = 0

  for (const itens of Object.values(dm.lancamentos ?? {}))
    for (const l of itens)
      acc += l.tipo === 'entrada' ? l.valor : -l.valor

  for (const [catId, confirmada] of Object.entries(dm.fixasConsolidadas ?? {})) {
    if (!confirmada) continue
    const override = dm.fixasValorOverride?.[catId]

    if (catId.startsWith('cartao-')) {
      acc -= override !== undefined && override > 0
        ? override
        : totalFatura(catId.slice(7), ano, mes, contas, faturaData)
      continue
    }

    const cat = categorias.find(c => c.id === catId)
    if (!cat) continue
    const valor = valorFixaNoMes(cat, planos[ano], mes, categorias, override)
    if (valor <= 0) continue
    acc += cat.tipo === 'entrada' ? valor : -valor
  }
  return acc
}

/** Total da fatura paga num mês de vencimento. */
function totalFatura(
  cardId: string,
  anoVenc: number,
  mesVenc: number,
  contas: Conta[],
  faturaData: Deps['faturaData'],
): number {
  const card = contas.find(c => c.id === cardId)
  const offset = card && (card.diaVencimento ?? 1) < (card.diaFechamento ?? 1) ? 1 : 0
  let pMes = mesVenc - offset
  let pAno = anoVenc
  if (pMes < 0) { pMes += 12; pAno-- }

  const dm = faturaData[`${cardId}-${pAno}-${String(pMes + 1).padStart(2, '0')}`]
  if (!dm?.lancamentos) return 0

  let total = 0
  for (const itens of Object.values(dm.lancamentos))
    // entrada = compra, saida = estorno
    for (const l of itens) total += l.tipo === 'entrada' ? l.valor : -l.valor
  return total > 0 ? total : 0
}

/** Saldo do dinheiro em carteira ao fim de um mês. */
export function saldoFinalDinheiro(ano: number, mes: number, deps: Deps): number {
  const alvo = ym(ano, mes)
  let acc = deps.saldoInicialDinheiro ?? 0
  for (const [k, dm] of Object.entries(deps.extratoData)) {
    if (!k.startsWith('dinheiro-')) continue
    const kym = parseInt(k.slice(-7, -3)) * 100 + parseInt(k.slice(-2))
    if (kym > alvo) continue
    for (const itens of Object.values(dm.lancamentos ?? {}))
      for (const l of itens) acc += l.tipo === 'entrada' ? l.valor : -l.valor
  }
  return acc
}

/**
 * O que o Radar mostra como saldo: bancos mais dinheiro, ao fim do mês.
 *
 * Cartão fica de fora por decisão de produto — cartão não tem saldo, tem
 * fatura, e a fatura já aparece como despesa no mês em que é paga.
 */
export function saldoBancosEDinheiro(ano: number, mes: number, deps: Deps): number {
  const bancos = deps.contas
    .filter(c => c.tipo !== 'cartao')
    .reduce((s, c) => s + saldoFinalConta(c, ano, mes, deps), 0)
  return bancos + saldoFinalDinheiro(ano, mes, deps)
}


/**
 * Saldo do fim de um mês, dizendo se é realizado ou projetado.
 *
 * Mês passado devolve o realizado. Mês futuro devolve a projeção: o realizado
 * mais tudo que ainda vai acontecer, do mês corrente até o mês pedido — ver
 * projecaoDoMes. A projeção encadeia, então novembro já carrega o previsto de
 * setembro e outubro.
 *
 * O mês CORRENTE depende da pergunta, e por isso existe `comoAbertura`:
 *
 *   "quanto tenho hoje"        -> realizado, bate com o extrato do banco
 *   "com quanto abre outubro"  -> previsto, inclui o que ainda vai cair
 *
 * São o mesmo mês e respostas diferentes. Sem essa distinção, ou o saldo atual
 * mente, ou o mês seguinte abre ignorando as contas que faltam pagar.
 *
 * A projeção é do MÊS, não da conta: contada uma vez, via projecaoDoMes.
 * Fixa sem contaDebitoId aparece em todas as contas até ser confirmada em
 * alguma — projetar por conta e somar contaria a mesma várias vezes.
 */
export function saldoTotalNoFim(
  ano: number,
  mes: number,
  deps: Deps,
  opts: { comoAbertura?: boolean; hoje?: Date } = {},
): { valor: number; previsto: boolean } {
  const hoje = opts.hoje ?? new Date()
  const realizado = saldoBancosEDinheiro(ano, mes, deps)
  const alvo = ym(ano, mes)
  const corrente = ym(hoje.getFullYear(), hoje.getMonth())
  const projetar = opts.comoAbertura ? alvo >= corrente : alvo > corrente
  if (!projetar) return { valor: realizado, previsto: false }

  let projecao = 0
  let a = hoje.getFullYear()
  let m = hoje.getMonth()
  while (ym(a, m) <= alvo) {
    projecao += projecaoDoMes(a, m, deps, hoje)
    m++
    if (m > 11) { m = 0; a++ }
  }
  return { valor: realizado + projecao, previsto: true }
}

/**
 * O que ainda vai acontecer num mês, em valor líquido. Uma vez cada.
 *
 * São as mesmas três coisas que a cascata de Lançamentos projeta:
 *
 *   - as fixas de banco ainda não confirmadas
 *   - a fatura de cada cartão ainda não paga
 *   - os gastos variáveis planejados, só em mês INTEIRAMENTE futuro
 *
 * As duas últimas faltavam, e era por isso que o Radar discordava de
 * Lançamentos: outubro fechava com o realizado mais as fixas em aberto, sem a
 * fatura do cartão nem o planejado das variáveis, e por isso alto demais.
 *
 * Variável só em mês inteiramente futuro pelo mesmo motivo de lá: no mês
 * corrente os lançamentos reais já contam, e somar o planejado por cima
 * cobraria o mesmo gasto duas vezes.
 *
 * Nada aqui olha conta. `contaDebitoId` e `contaPagamentoId` dizem em qual
 * conta cada coisa APARECE, não se ela acontece — e o Radar quer o total.
 * Percorrer contas somaria a mesma fixa uma vez por conta.
 */
function projecaoDoMes(ano: number, mes: number, deps: Deps, hoje: Date): number {
  const { extratoData, contas, categorias, planos, faturaData } = deps
  const sufixo = `-${ano}-${String(mes + 1).padStart(2, '0')}`
  const dms = dadosBancariosDoMes(
    extratoData,
    sufixo,
    k => contas.some(c => c.tipo === 'cartao' && k.startsWith(c.id)),
  )

  let acc = categorias
    .filter(c => c.fixa && c.ativa && c.tipoMovimento !== 'cartao')
    .reduce((s, cat) => {
      if (resolverFixaDoMes(cat.id, dms).consolidada) return s
      const valor = valorFixaNoMes(cat, planos[ano], mes, categorias)
      if (valor <= 0) return s
      return s + (cat.tipo === 'entrada' ? valor : -valor)
    }, 0)

  // Faturas ainda não pagas. A paga já entrou pelo saldo da própria conta.
  const abertas = contas
    .filter(c => c.tipo === 'cartao' && c.diaVencimento)
    .filter(c => !resolverFixaDoMes(`cartao-${c.id}`, dms).consolidada)
    .sort((x, y) => (x.diaVencimento ?? 1) - (y.diaVencimento ?? 1))

  const real = abertas.reduce(
    (s, c) => s + totalFatura(c.id, ano, mes, contas, faturaData), 0)
  acc -= real

  // Fatura que ainda não fechou vale o MAIOR entre o lançado e o planejado do
  // mês da compra — só o lançado subestima uma fatura que ainda vai crescer.
  // O complemento é do MÊS: o plano não diz em qual cartão o gasto cai.
  const ref = abertas[0]
  if (ref) {
    const off = (ref.diaVencimento ?? 1) < (ref.diaFechamento ?? 1) ? 1 : 0
    let pMes = mes - off, pAno = ano
    if (pMes < 0) { pMes += 12; pAno-- }
    if (new Date(pAno, pMes, ref.diaFechamento ?? 1) > hoje)
      acc -= Math.max(0, planejadoVariavel(pAno, pMes, deps, true) - real)
  }

  if (ym(ano, mes) > ym(hoje.getFullYear(), hoje.getMonth()))
    acc -= planejadoVariavel(ano, mes, deps, false)

  return acc
}

/**
 * Soma planejada das categorias variáveis de saída de um mês, no cartão ou
 * fora dele. Entrada variável fica de fora — Lançamentos também não projeta,
 * e incluir aqui faria as duas telas discordarem de novo.
 */
function planejadoVariavel(ano: number, mes: number, deps: Deps, doCartao: boolean): number {
  const { categorias, planos } = deps
  return categorias
    .filter(c => c.tipo === 'saida' && c.ativa && !c.fixa
      && (c.tipoMovimento === 'cartao') === doCartao)
    .reduce((s, c) => s + valorFixaNoMes(c, planos[ano], mes, categorias), 0)
}
