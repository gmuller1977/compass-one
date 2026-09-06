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
 * mais as fixas planejadas ainda não confirmadas, do mês corrente até o mês
 * pedido. A projeção encadeia, então novembro já carrega o previsto de
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
 * A fixa planejada e contada UMA VEZ POR MES, via resolverFixaDoMes, nao uma
 * vez por conta. Fixa sem contaDebitoId aparece em todas as contas ate ser
 * confirmada em alguma — projetar por conta e somar contaria a mesma varias
 * vezes.
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
    projecao += fixasPlanejadasEmAberto(a, m, deps)
    m++
    if (m > 11) { m = 0; a++ }
  }
  return { valor: realizado + projecao, previsto: true }
}

/** Fixas do mês ainda não confirmadas, com sinal. Uma vez cada. */
function fixasPlanejadasEmAberto(ano: number, mes: number, deps: Deps): number {
  const { extratoData, contas, categorias, planos } = deps
  const sufixo = `-${ano}-${String(mes + 1).padStart(2, '0')}`
  const dms = dadosBancariosDoMes(
    extratoData,
    sufixo,
    k => contas.some(c => c.tipo === 'cartao' && k.startsWith(c.id)),
  )
  return categorias
    .filter(c => c.fixa && c.ativa && c.tipoMovimento !== 'cartao')
    .reduce((acc, cat) => {
      if (resolverFixaDoMes(cat.id, dms).consolidada) return acc
      const valor = valorFixaNoMes(cat, planos[ano], mes, categorias)
      if (valor <= 0) return acc
      return acc + (cat.tipo === 'entrada' ? valor : -valor)
    }, 0)
}
