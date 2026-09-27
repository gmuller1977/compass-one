import type { Categoria } from '../context/AppContext'
import { cadastroDaLinha, type LinhaDoMes } from '../components/acompanhamento/evolucaoCalcs'

/**
 * O ritmo do mês: quanto da despesa VARIÁVEL planejada já foi gasto, contra
 * quanto do mês já passou. "Gastou 72% da variável com 60% do mês passado"
 * avisa ANTES de estourar — "Categorias estouradas" mostra o que já passou.
 * Pedido do Guilherme em 27/09/2026 (item 4 do estudo de indicadores).
 *
 * Só a variável: conta fixa não tem ritmo — ela cai no dia dela, inteira, e
 * contá-la faria o mês parecer adiantado no dia do aluguel e atrasado no
 * resto. As linhas são as de `totaisDoMes` (as mesmas do Radar), sem as que o
 * cadastro diz fixas (cadastroDaLinha, como o Radar acha). O gasto sem plano
 * entra no gasto: é dinheiro variável que saiu.
 *
 * O que sobra para gastar é no TOTAL, e não por categoria: planejado − gasto
 * da variável inteira. É a pergunta "quanto posso gastar por dia até o fim do
 * mês" — o envelope único, o mesmo raciocínio do cenário otimista. Não é o
 * "Disponível" somado das categorias, que ignora quem estourou.
 *
 * Estado, pelo que a pessoa precisa fazer:
 *   passou    — o gasto já passou do planejado no total;
 *   acelerado — dentro do plano, mas mais de 10 pontos à frente do mês;
 *   no ritmo  — o resto.
 * Os 10 pontos são folga para a vida real: um mês não se gasta em linha reta,
 * e a feira do sábado não é um alarme.
 */
export type EstadoRitmo = 'no-ritmo' | 'acelerado' | 'passou'
export type RitmoDoMes = {
  planejado: number
  gasto: number
  percGasto: number
  percMes: number
  dia: number
  totalDias: number
  /** Contando hoje. */
  diasRestantes: number
  /** planejado − gasto, nunca abaixo de zero. */
  sobra: number
  porDia: number
  estado: EstadoRitmo
}

export const FOLGA_DO_RITMO = 0.10

export function ritmoDoMes(linhas: LinhaDoMes[], categorias: Categoria[], hoje: Date = new Date()): RitmoDoMes | null {
  const variaveis = linhas.filter(l => !cadastroDaLinha(l, categorias)?.fixa)
  const planejado = variaveis.reduce((s, l) => s + l.prev, 0)
  if (planejado <= 0.005) return null
  const gasto = variaveis.reduce((s, l) => s + l.real, 0)

  const dia = hoje.getDate()
  const totalDias = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate()
  const diasRestantes = totalDias - dia + 1
  const percGasto = gasto / planejado
  const percMes = dia / totalDias
  const sobra = Math.max(0, planejado - gasto)

  const estado: EstadoRitmo = gasto - planejado > 0.005 ? 'passou'
    : percGasto > percMes + FOLGA_DO_RITMO ? 'acelerado'
    : 'no-ritmo'

  return { planejado, gasto, percGasto, percMes, dia, totalDias, diasRestantes, sobra, porDia: sobra / diasRestantes, estado }
}
