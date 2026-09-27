import type { Memoria } from '../components/novoLancamentoExtrato/NleShared'
import { detalharMes, detalharPrevisto, saldoTotalNoFim, type Deps, type ItemPrevistoNoMes } from './saldoConta'

/**
 * Como um mês FUTURO deve correr — a tela Início com um mês à frente
 * escolhido. Pedido do Guilherme em 27/09/2026: "e se eu quiser olhar o
 * próximo mês? já me preparar para o futuro?".
 *
 * Nenhuma conta nova. Os quatro números saem das funções do saldo previsto:
 *
 *   inicial  = saldoTotalNoFim(mês anterior, comoAbertura) — o final previsto
 *              do mês anterior, o mesmo ponto do gráfico;
 *   final    = detalharPrevisto(mês).valor — o ponto do mês no gráfico;
 *   entradas = o já lançado no mês + as linhas previstas DAQUELE mês;
 *   saidas   = idem.
 *
 * E vale a identidade, que a prova35 tranca:
 *
 *   inicial + entradas − saidas + ajuste = final
 *
 * Ela fecha porque um mês abre com o fechamento do anterior
 * (saldoRealizadoConta) e o previsto encadeia mês a mês: a diferença entre o
 * final de M e o de M−1 é exatamente o movimento lançado em M mais o líquido
 * projetado de M. `ajuste` é a conciliação de um mês futuro — na prática zero.
 *
 * As entradas e saídas NÃO são os totais do Planejamento: são o dinheiro que
 * se prevê entrando e saindo das contas. A compra no cartão sai no mês em que
 * a fatura vence, e o que já foi gasto conta.
 *
 * `memoria` é o mesmo objeto que MemoriaSaldo desenha, com as linhas SÓ do
 * mês — a do Radar, num mês futuro, acumularia tudo desde hoje.
 */
export type PrevisaoDoMes = {
  inicial: number
  entradas: number
  saidas: number
  final: number
  memoria: Memoria
  /** As linhas previstas do mês, para a lista de contas do mês. */
  fixasSaida: ItemPrevistoNoMes[]
  faturas: ItemPrevistoNoMes[]
}

export function previsaoDoMes(ano: number, mes: number, deps: Deps, hoje: Date = new Date()): PrevisaoDoMes {
  const mAnt = mes === 0 ? 11 : mes - 1
  const aAnt = mes === 0 ? ano - 1 : ano
  const inicial = saldoTotalNoFim(aAnt, mAnt, deps, { comoAbertura: true, hoje }).valor
  const p = detalharPrevisto(ano, mes, deps, { comoAbertura: true, hoje })
  const lancado = detalharMes(ano, mes, deps)

  const doMes = (xs: ItemPrevistoNoMes[]) => xs.filter(i => i.ano === ano && i.mes === mes)
  const somar = (xs: { valor: number }[]) => xs.reduce((s, x) => s + x.valor, 0)
  const fixasEntrada = doMes(p.fixasEntrada)
  const variaveisEntrada = doMes(p.variaveisEntrada)
  const fixasSaida = doMes(p.fixasSaida)
  const variaveisSaida = doMes(p.variaveisSaida)
  const faturas = doMes(p.faturas)

  const entradasReais = lancado.reduce((s, c) => s + c.entradas, 0)
  const saidasReais = lancado.reduce((s, c) => s + c.saidas, 0)
  const ajuste = lancado.reduce((s, c) => s + c.ajuste, 0)

  const memoria: Memoria = {
    abertura: inicial,
    entradasReais, saidasReais,
    ajusteConciliacao: ajuste,
    entradasPrevistas: somar(fixasEntrada),
    receitasAReceber: somar(variaveisEntrada),
    fixasPrevistas: somar(fixasSaida),
    faturaEmAberto: somar(faturas),
    faturaEstimada: somar(variaveisSaida.filter(i => i.balde === 'cartao')),
    variaveisARealizar: somar(variaveisSaida.filter(i => i.balde !== 'cartao')),
    fechamento: p.valor,
  }

  return {
    inicial,
    entradas: entradasReais + memoria.entradasPrevistas + memoria.receitasAReceber,
    saidas: saidasReais + memoria.fixasPrevistas + memoria.faturaEmAberto
      + memoria.faturaEstimada + memoria.variaveisARealizar,
    final: p.valor,
    memoria, fixasSaida, faturas,
  }
}
