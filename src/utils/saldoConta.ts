import type { Conta, Categoria, DadosMes, PlanoAnoData } from '../context/AppContext'
import { parseBRL } from './moeda'
import { valorFixaNoMes } from './valorFixa'

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
