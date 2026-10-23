import type { Categoria } from '../context/AppContext'
import { cadastroDaLinha, type LinhaDoMes } from '../components/acompanhamento/evolucaoCalcs'
import { ehFixaPaga, semPlano } from '../components/acompanhamento/radarCores'

/**
 * O balanço do plano de despesas do mês, por GRUPO — o quadro "Plano do mês"
 * da Início (pedido do Guilherme em 23/10/2026: "valor total de passou do
 * plano × valor total que falta alcançar, e a diferença; um acordeão com os
 * grupos que passaram e os que economizaram; o detalhe é no Radar").
 *
 * Nenhuma conta nova: as linhas são as de `totaisDoMes`, as do Radar, e o
 * grupo é julgado como o cabeçalho dele (`destaqueDoGrupo`):
 *
 * - só linhas COM plano (sem plano não há julgamento, C2 de 19/10/2026);
 * - fixa paga até o previsto entra pelo valor pago: os centavos que sobram
 *   dela não são economia;
 * - fixa ainda não paga não "sobra", VENCE: ela não entra no que falta.
 *   Paga acima do previsto, o excesso entra como qualquer estouro.
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
}

const MEIO_CENTAVO = 0.005

export function balancoDoPlano(linhas: LinhaDoMes[], categorias: Categoria[]): BalancoDoPlano | null {
  const porGrupo = new Map<string, { saldo: number; primeira: string }>()
  for (const l of linhas) {
    if (semPlano(l.prev)) continue
    const fixa = !!cadastroDaLinha(l, categorias)?.fixa
    const saldo = !fixa ? l.real - l.prev
      : ehFixaPaga(l.prev, l.real, false, true) ? 0
      : Math.max(0, l.real - l.prev)
    const g = porGrupo.get(l.grupo) ?? { saldo: 0, primeira: l.nome }
    g.saldo += saldo
    porGrupo.set(l.grupo, g)
  }
  if (porGrupo.size === 0) return null
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
  return { passaram, abaixo, passou, falta, diferenca: falta - passou }
}
