import type { DadosMes } from '../context/AppContext'
import type { Deps } from './saldoConta'
import { construirRealizadoMes } from './realizadoMes'
import { nomesDeCartao, pickReal, totaisDoMes, catKey } from '../components/acompanhamento/evolucaoCalcs'
import { primeiroMesComRegistro, ymRegistro } from './evolucaoSaldo'

/**
 * O que o ajuste do plano pelo Radar precisa saber de UMA categoria, para
 * sugerir o plano dos próximos meses. Pedido do Guilherme em 06/10/2026:
 * "como temos parcelamento para os próximos meses, o ajuste já deve
 * considerar e sugerir estes valores".
 *
 * Duas perguntas, e as duas saem de construirRealizadoMes — a mesma passagem
 * do Radar e do comparativo da Início, sem soma própria:
 *
 *   1. quanto se gasta NORMALMENTE: a média dos meses fechados SEM as
 *      parcelas. Com elas, a média carregaria uma compra que já acabou (ou que
 *      ainda vai ser somada à parte), e a sugestão contaria a mesma bicicleta
 *      duas vezes;
 *   2. o que JÁ ESTÁ LANÇADO nos próximos meses: as parcelas que a fatura
 *      grava adiante quando a compra é parcelada (FaturaCartao), e qualquer
 *      outro lançamento já feito para aquele mês. É dinheiro comprometido: um
 *      plano abaixo disso estoura antes de o mês começar.
 *
 * A sugestão de cada mês é a soma das duas.
 */
export type JaLancado = { descricao: string; valor: number; parcela?: { atual: number; total: number } }
export type MesComprometido = { ano: number; mes: number; total: number; itens: JaLancado[] }

type Tipo = 'entrada' | 'saida'

function realDaCategoria(deps: Deps, ano: number, mes: number, tipo: Tipo, nome: string, descricao?: string) {
  const { saidasMap, entradasMap } = construirRealizadoMes({
    ano, mes, extratoData: deps.extratoData as Record<string, DadosMes>,
    faturaData: deps.faturaData, contas: deps.contas, categorias: deps.categorias, planoAno: deps.planos[ano],
  })
  return { mapa: { saidasMap, entradasMap }, cr: pickReal(tipo === 'entrada' ? entradasMap : saidasMap, nome, descricao, deps.categorias) }
}

/**
 * Média do realizado SEM parcelas nos meses fechados — a mesma janela do
 * comparativo da Início (até 5 meses fechados, a partir do primeiro registro).
 * Conta só os meses em que a categoria existiu (plano ou gasto). null sem
 * nenhum.
 */
export function mediaSemParcelas(
  deps: Deps, tipo: Tipo, nome: string, descricao?: string, hoje: Date = new Date(), meses = 5,
): { media: number; meses: number; tinhaParcelas: boolean } | null {
  const primeiro = primeiroMesComRegistro(deps.extratoData)
  if (primeiro === null) return null
  const cartaoNomes = nomesDeCartao(deps.contas)
  const k = catKey(nome, descricao)
  let soma = 0, n = 0, tinhaParcelas = false
  for (let i = meses; i >= 1; i--) {
    const t = hoje.getMonth() - i
    const ano = hoje.getFullYear() + Math.floor(t / 12)
    const mes = ((t % 12) + 12) % 12
    if (ymRegistro(ano, mes) < primeiro) continue
    const { mapa, cr } = realDaCategoria(deps, ano, mes, tipo, nome, descricao)
    const tt = totaisDoMes({ mes, planoAno: deps.planos[ano], categorias: deps.categorias, cartaoNomes, ...mapa })
    const linha = (tipo === 'entrada' ? tt.entrada.linhas : tt.saida.linhas).find(l => catKey(l.nome, l.descricao) === k)
    if (!linha || (linha.prev <= 0.005 && Math.abs(linha.real) <= 0.005)) continue
    const deParcelas = (cr?.lancamentos ?? []).filter(l => l.parcela).reduce((s, l) => s + l.valor, 0)
    if (deParcelas > 0.005) tinhaParcelas = true
    soma += linha.real - deParcelas
    n++
  }
  return n ? { media: Math.round((soma / n) * 100) / 100, meses: n, tinhaParcelas } : null
}

/** O que já está lançado para a categoria em cada um dos meses dados. */
export function jaLancadoNosMeses(
  deps: Deps, tipo: Tipo, nome: string, descricao: string | undefined, meses: { ano: number; mes: number }[],
): MesComprometido[] {
  return meses.map(({ ano, mes }) => {
    const { cr } = realDaCategoria(deps, ano, mes, tipo, nome, descricao)
    const itens: JaLancado[] = (cr?.lancamentos ?? [])
      .filter(l => Math.abs(l.valor) > 0.005)
      .map(l => ({ descricao: l.descricao, valor: l.valor, ...(l.parcela ? { parcela: l.parcela } : {}) }))
    return { ano, mes, total: Math.round((cr?.total ?? 0) * 100) / 100, itens }
  })
}
