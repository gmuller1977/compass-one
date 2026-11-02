import type { Categoria, Conta } from '../../context/AppContext'
import { saldoBancosEDinheiro, type Deps } from '../../utils/saldoConta'
import { juntarNaMae, somaNaMae } from '../../utils/categoriaMae'
import {
  mergeCats, calcSaldos,
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

/*
 * A fatura do cartão não tem conta própria no Planejamento (02/11/2026,
 * revisão técnica). Antes, uma categoria com o nome de um cartão (ou
 * "Cartão de crédito") virava "a fatura": o valor dela era trocado pelas
 * compras do mês anterior, lidas com o sinal INVERTIDO (na fatura a compra é
 * `entrada`), e todas as categorias de cartão saíam dos totais. O resultado
 * era o Planejamento sem os gastos no cartão. Hoje toda categoria soma pelo
 * próprio plano, como no motor da previsão (`faltaVariavelDoMes`), e o total
 * é a soma das linhas que a tela lista. `prova109`.
 */

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
  const jan = saldoInicialJanDoAno(ano, ctx)
  const prev = dadosPrevistoDoAno(ctx.planos[ano] as AnoData | undefined, dadosBaseDoPlano(ctx.categorias, jan), jan, ctx.categorias)
  // te/ts não entram no saldo (Receitas e Despesas são sempre o plano).
  const ancora: AncoraReal = { ateMes: mesDaAncora(ano, ctx.anoCorrente, ctx.mesAtual), te: [], ts: [], fim: fimRealDoAno(ano, ctx.depsSaldo) }
  return calcSaldos(prev, ancora)
}
