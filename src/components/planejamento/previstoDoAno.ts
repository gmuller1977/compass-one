import type { Categoria, Conta } from '../../context/AppContext'
import { saldoBancosEDinheiro, type Deps } from '../../utils/saldoConta'
import { juntarNaMae, somaNaMae } from '../../utils/categoriaMae'
import {
  mergeCats, calcSaldos, nomeFaturaCartao, MESES,
  type Cat, type AnoData, type AncoraReal,
} from './types'

/**
 * O plano de UM ano, da lista de categorias ao saldo de cada mês. É a passagem
 * do `usePlanejamento`, tirada do hook para poder ser chamada também para o
 * ano ANTERIOR: um ano futuro abre com o saldo final PREVISTO de dezembro do
 * ano de antes — pedido do Guilherme em 08/10/2026, ao planejar 2027 e ver
 * janeiro abrindo com o saldo real de hoje.
 *
 * Uma passagem só: o hook monta a tela com estas funções, e o dezembro que
 * abre o ano seguinte sai delas também. Duas cópias acabariam discordando.
 */
export type CtxPlano = {
  anoCorrente: number
  mesAtual: number
  categorias: Categoria[]
  contas: Conta[]
  faturaData: unknown
  planos: Record<number, unknown>
  /** Soma do saldo de cadastro das contas — o janeiro sem nada antes. */
  saldoInicialFixo: number
  depsSaldo: Deps
}

/**
 * Categorias ativas, todas com zero: a base em que o plano salvo é mesclado.
 * Variante que soma na categoria mãe não tem linha própria — o plano dela é o
 * da mãe, com o detalhe em itens (utils/categoriaMae).
 */
export function dadosBaseDoPlano(categorias: Categoria[], saldoInicialJan: number): AnoData {
  const linha = (c: Categoria): Cat => ({ id: c.id, nome: c.nome, descricao: c.descricao, grupo: c.grupo, t: c.tipoMovimento, v: new Array(12).fill(0) })
  const por = (tipo: 'entrada' | 'saida') => categorias
    .filter(c => c.tipo === tipo && c.ativa && !somaNaMae(c.nome, c.descricao, c.tipo, categorias)).map(linha)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  return { saldoInicialJan, entradas: por('entrada'), saidas: por('saida') }
}

/** O plano salvo do ano, mesclado na base. Sem plano, a base. As variantes que somam na mãe entram nela. */
export function dadosPrevistoDoAno(salvo: AnoData | undefined, base: AnoData, saldoInicialJan: number, categorias: Categoria[]): AnoData {
  if (!salvo) return { ...base, saldoInicialJan }
  return {
    ...salvo,
    saldoInicialJan,
    entradas: mergeCats(base.entradas, juntarNaMae(salvo.entradas, 'entrada', categorias) as Cat[]),
    saidas: mergeCats(base.saidas, juntarNaMae(salvo.saidas, 'saida', categorias) as Cat[]),
  }
}

/** Fatura de cartão por mês: informado → lançamentos reais do mês anterior → R$ 0. */
export function somaCartaoDoAno(dadosPrevisto: AnoData, ano: number, contas: Conta[], faturaData: unknown): number[] {
  const faturaCatsPlan = dadosPrevisto.saidas.filter(c => c.t === 'fatura_cartao')
  const cartoesContas = contas.filter(c => c.tipo === 'cartao')
  const fat = faturaData as Record<string, { lancamentos?: Record<number, { tipo: string; valor: number }[]> }>
  return MESES.map((_, i) => {
    const informado = faturaCatsPlan.reduce((s, c) => s + (c.v[i] ?? 0), 0)
    if (informado > 0) return informado
    const prevMes = i === 0 ? 11 : i - 1
    const prevAno = i === 0 ? ano - 1 : ano
    const prevMesStr = String(prevMes + 1).padStart(2, '0')
    let calculado = 0
    for (const cartao of cartoesContas) {
      const dm = fat[`${cartao.id}-${prevAno}-${prevMesStr}`]
      if (!dm?.lancamentos) continue
      const totalDiasM = new Date(prevAno, prevMes + 1, 0).getDate()
      for (let d = 1; d <= totalDiasM; d++) {
        ;(dm.lancamentos[d] ?? []).forEach(l => {
          l.tipo === 'saida' ? calculado += l.valor : calculado -= l.valor
        })
      }
    }
    return Math.max(0, calculado)
  })
}

/** O previsto com a fatura do cartão trocada pelo valor calculado. */
export function comFaturaCalculada(dadosPrevisto: AnoData, somaCartaoMes: number[], cartaoNomes: Set<string>): AnoData {
  const isFatura = (cat: Cat) => nomeFaturaCartao(cat.nome, cartaoNomes) || cat.t === 'fatura_cartao'
  return { ...dadosPrevisto, saidas: dadosPrevisto.saidas.map(cat => (isFatura(cat) ? { ...cat, t: undefined, v: somaCartaoMes } : cat)) }
}

/** Excluir t='cartao' dos totais só se existir fatura_cartao (evita dupla contagem). */
export const temFaturaCat = (dadosPrevisto: AnoData, cartaoNomes: Set<string>) =>
  dadosPrevisto.saidas.some(c => c.t === 'fatura_cartao' || nomeFaturaCartao(c.nome, cartaoNomes))

/**
 * Último mês fechado. Ano passado → 11; ano corrente → o mês anterior (-1 em
 * janeiro: só dezembro do ano anterior fechou, e janeiro abre com ele).
 *
 * Ano FUTURO → -2: nem dezembro do ano anterior fechou, então janeiro NÃO
 * abre com saldo real. Com -1 ele abria — `fechado(-1)` dava verdadeiro e
 * janeiro de 2027 abria com o saldo de hoje no banco.
 */
export function mesDaAncora(ano: number, anoCorrente: number, mesAtual: number): number {
  return ano < anoCorrente ? 11 : ano > anoCorrente ? -2 : mesAtual - 1
}

/** Saldo REAL no fim de um mês do ano — `-1` é dezembro do ano anterior. */
export const fimRealDoAno = (ano: number, deps: Deps) => (mes: number) => (
  mes < 0 ? saldoBancosEDinheiro(ano - 1, 11, deps) : saldoBancosEDinheiro(ano, mes, deps)
)

/**
 * Com quanto janeiro abre. Ano corrente ou passado: o saldo de cadastro (e o
 * `calcSaldos` ancora no real). Ano futuro: o saldo final PREVISTO de dezembro
 * do ano anterior — em cadeia, se o anterior também é futuro.
 */
export function saldoInicialJanDoAno(ano: number, ctx: CtxPlano): number {
  if (ano <= ctx.anoCorrente) return ctx.saldoInicialFixo
  return previstoDoAno(ano - 1, ctx).saldoFinal[11]
}

/** O `previsto` da tela do Planejamento para um ano qualquer. */
export function previstoDoAno(ano: number, ctx: CtxPlano) {
  const cartaoNomes = new Set(ctx.contas.filter(c => c.tipo === 'cartao').map(c => c.nome.toLowerCase()))
  const jan = saldoInicialJanDoAno(ano, ctx)
  const prev = dadosPrevistoDoAno(ctx.planos[ano] as AnoData | undefined, dadosBaseDoPlano(ctx.categorias, jan), jan, ctx.categorias)
  const final = comFaturaCalculada(prev, somaCartaoDoAno(prev, ano, ctx.contas, ctx.faturaData), cartaoNomes)
  // te/ts não entram no saldo (Receitas e Despesas são sempre o plano).
  const ancora: AncoraReal = { ateMes: mesDaAncora(ano, ctx.anoCorrente, ctx.mesAtual), te: [], ts: [], fim: fimRealDoAno(ano, ctx.depsSaldo) }
  return calcSaldos(final, temFaturaCat(prev, cartaoNomes), ancora)
}
