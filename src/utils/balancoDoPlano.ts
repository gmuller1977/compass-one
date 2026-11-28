import type { Categoria } from '../context/AppContext'
import { type LinhaDoMes } from '../components/acompanhamento/evolucaoCalcs'
import { semPlano } from '../components/acompanhamento/radarCores'

/**
 * O balanço do plano de despesas do mês, por GRUPO — o quadro "Plano do mês"
 * da Início (pedido do Guilherme em 23/10/2026: "valor total de passou do
 * plano × valor total que falta alcançar, e a diferença; um acordeão com os
 * grupos que passaram e os que economizaram; o detalhe é no Radar").
 *
 * Nenhuma conta nova: as linhas são as de `totaisDoMes`, as do Radar, e o
 * grupo é julgado como o cabeçalho dele (`destaqueDoGrupo`):
 *
 * - desde 28/11/2026, Realizado − Planejado de todas as linhas, a régua das
 *   barras Receitas/Despesas e do card do grupo: o gasto sem plano soma, e a
 *   fixa ainda não paga não conta (só o que saiu). A régua de 21/11 (fixa não
 *   paga pelo plano, sem plano fora) é histórico.
 *
 * Um grupo vai para um lado só, pelo saldo dele: o estouro de uma categoria
 * compensado por outra do MESMO grupo não aparece, como no cabeçalho do Radar.
 * Os totais são a soma dos grupos listados, para o acordeão fechar com eles.
 */
export type GrupoNoBalanco = { grupo: string; nome: string; primeiraCategoria: string; valor: number }
export type BalancoDoPlano = {
  passaram: GrupoNoBalanco[]
  abaixo: GrupoNoBalanco[]
  /** Soma do quanto os grupos passaram do plano. */
  passou: number
  /** Soma do quanto ainda falta para os grupos chegarem no plano. */
  falta: number
  /** falta − passou: positivo, economizando; negativo, gastou a mais. */
  diferenca: number
  /** Totais de todas as linhas, os das barras: planejado e realizado (só o
   *  que saiu). diferenca = prev − gasto. */
  prev: number
  gasto: number
  /** Parte do gasto que está em linhas sem plano (já somada em gasto). */
  semPlano: number
}

const MEIO_CENTAVO = 0.005

export function balancoDoPlano(linhas: LinhaDoMes[], _categorias?: Categoria[]): BalancoDoPlano | null {
  // 28/11/2026, Guilherme ("Sim", sobre pôr a frase na régua das barras e dos
  // cards): Realizado − Planejado de TODAS as linhas, como as barras Receitas /
  // Despesas e o card do grupo. O gasto sem plano soma no grupo dele, e a fixa
  // ainda não paga não conta (só o que saiu). Antes (21/11) a fixa não paga
  // contava pelo plano e o sem plano ficava fora: em nov/2026 a frase dizia
  // R$ 385,65 e as barras R$ 502.
  const porGrupo = new Map<string, { saldo: number; primeira: string }>()
  let prevTotal = 0, gastoTotal = 0, foraDoPlano = 0, temPlano = false
  for (const l of linhas) {
    if (semPlano(l.prev)) foraDoPlano += l.real
    else temPlano = true
    prevTotal += l.prev; gastoTotal += l.real
    const g = porGrupo.get(l.grupo) ?? { saldo: 0, primeira: l.nome }
    g.saldo += l.real - l.prev
    porGrupo.set(l.grupo, g)
  }
  if (!temPlano) return null
  const passaram: GrupoNoBalanco[] = []
  const abaixo: GrupoNoBalanco[] = []
  for (const [grupo, g] of porGrupo) {
    const item = { grupo, nome: grupo === '__sem_grupo__' ? 'Outras' : grupo, primeiraCategoria: g.primeira, valor: Math.abs(g.saldo) }
    if (g.saldo > MEIO_CENTAVO) passaram.push(item)
    else if (g.saldo < -MEIO_CENTAVO) abaixo.push(item)
  }
  passaram.sort((a, b) => b.valor - a.valor)
  abaixo.sort((a, b) => b.valor - a.valor)
  const passou = passaram.reduce((s, g) => s + g.valor, 0)
  const falta = abaixo.reduce((s, g) => s + g.valor, 0)
  return { passaram, abaixo, passou, falta, diferenca: falta - passou,
    prev: prevTotal, gasto: gastoTotal, semPlano: foraDoPlano }
}
