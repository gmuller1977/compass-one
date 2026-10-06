import type { LinhaDoMes } from '../components/acompanhamento/evolucaoCalcs'
import type { ContaAVencer } from './contasAVencer'
import type { RitmoDoMes } from './ritmoDoMes'
import { categoriasEstouradas } from './categoriasEstouradas'
import { gruposQuePassaram } from './resumoRadar'

/**
 * "Pede sua atenção" da Início: no máximo três avisos, cada um uma frase e um
 * botão, e só quando há algo a fazer. Pedido do Guilherme em 06/10/2026 — a
 * Início era "uma tela cheia de número". O modelo validado está descrito no
 * CLAUDE.md ("A Início enxuta").
 *
 * Nenhum número novo. Cada aviso é um quadro que já existia, resumido:
 *   contas    → contasAVencer (as linhas da memória de cálculo, 7 dias)
 *   passou    → gruposQuePassaram, o total do cabeçalho de grupo do Radar
 *   negativo  → piorMesDaSerie, o mesmo ponto vermelho do gráfico
 *   ritmo     → ritmoDoMes, só no estado "acelerado" (o "passou" o hero já diz)
 *
 * A ordem é a da urgência: pagar → corrigir → planejar → frear. Com mais de
 * três, os últimos ficam de fora; tudo continua em Análises.
 */
export type Aviso = {
  id: 'contas' | 'passou' | 'negativo' | 'ritmo'
  tom: 'vermelho' | 'ambar'
  tag: string
  titulo: string
  detalhe: string
}

const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
const DIAS_SEM = ['domingo','segunda','terça','quarta','quinta','sexta','sábado']
const reais = (v: number) => `R$ ${Math.round(Math.abs(v)).toLocaleString('pt-BR')}`
const MAX = 3

function diasAte(c: ContaAVencer, hoje: Date): number {
  const h = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  return Math.round((new Date(c.ano, c.mes, c.dia).getTime() - h.getTime()) / 86_400_000)
}

function quando(c: ContaAVencer, hoje: Date): string {
  if (c.atrasada) return `venceu dia ${c.dia}`
  const d = diasAte(c, hoje)
  if (d === 0) return 'vence hoje'
  if (d === 1) return 'vence amanhã'
  return `vence ${DIAS_SEM[new Date(c.ano, c.mes, c.dia).getDay()]}, dia ${c.dia}`
}

const nomeDaConta = (c: ContaAVencer) => (c.descricao ? `${c.nome} · ${c.descricao}` : c.nome)

export function avisosDoMes(p: {
  contas: ContaAVencer[]
  linhasSaida: LinhaDoMes[]
  negativo: { ano: number; mes: number; valor: number } | null
  ritmo: RitmoDoMes | null
  hoje?: Date
}): Aviso[] {
  const hoje = p.hoje ?? new Date()
  const out: Aviso[] = []

  // 1. Contas: a lista já vem com as atrasadas primeiro e depois por data.
  if (p.contas.length > 0) {
    const primeira = p.contas[0]
    const total = p.contas.reduce((s, c) => s + c.valor, 0)
    const atrasadas = p.contas.filter(c => c.atrasada).length
    const urgente = atrasadas > 0 || diasAte(primeira, hoje) <= 1
    const q = quando(primeira, hoje)
    out.push(p.contas.length === 1 ? {
      id: 'contas', tom: urgente ? 'vermelho' : 'ambar',
      tag: q.replace(/^./, ch => ch.toUpperCase()),
      titulo: `${nomeDaConta(primeira)} · ${reais(primeira.valor)}`,
      detalhe: atrasadas ? 'Ainda não marcada como paga.' : 'É a única conta dos próximos 7 dias.',
    } : {
      id: 'contas', tom: urgente ? 'vermelho' : 'ambar',
      tag: atrasadas ? (atrasadas === 1 ? '1 conta vencida' : `${atrasadas} contas vencidas`) : 'Próximos 7 dias',
      titulo: `${p.contas.length} contas a pagar · ${reais(total)}`,
      detalhe: `A primeira: ${nomeDaConta(primeira)}, ${q}.`,
    })
  }

  // 2. Passou do plano: por GRUPO, como o Radar e a frase do topo dele.
  const grupos = gruposQuePassaram(p.linhasSaida)
  if (grupos.length > 0) {
    const estouros = categoriasEstouradas(p.linhasSaida, 50)
    if (grupos.length === 1) {
      const g = grupos[0]
      const puxou = estouros.find(e => e.grupo === g.grupo)
      out.push({
        id: 'passou', tom: 'vermelho', tag: 'Passou do plano',
        titulo: `${g.nome} passou ${reais(g.excesso)} do planejado`,
        detalhe: !puxou ? 'Some as categorias do grupo no Radar.'
          : puxou.semPlano ? `${puxou.nome}: ${reais(puxou.real)} sem plano.`
          : `${puxou.nome} puxou: ${reais(puxou.real)} de ${reais(puxou.prev)}.`,
      })
    } else {
      const total = grupos.reduce((s, g) => s + g.excesso, 0)
      const nomes = grupos.map(g => g.nome)
      out.push({
        id: 'passou', tom: 'vermelho', tag: 'Passou do plano',
        titulo: `${grupos.length} grupos passaram do plano · ${reais(total)}`,
        detalhe: nomes.length <= 3
          ? `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}.`
          : `${nomes.slice(0, 2).join(', ')} e mais ${nomes.length - 2}.`,
      })
    }
  }

  // 3. Mês negativo À FRENTE. O mês corrente negativo o hero já mostra.
  const ymHoje = hoje.getFullYear() * 12 + hoje.getMonth()
  if (p.negativo && p.negativo.ano * 12 + p.negativo.mes > ymHoje) {
    const nome = MESES[p.negativo.mes].replace(/^./, ch => ch.toUpperCase())
    out.push({
      id: 'negativo', tom: 'ambar', tag: 'Mais à frente',
      titulo: `${nome} pode fechar no vermelho: −${reais(p.negativo.valor)}`,
      detalhe: 'É uma previsão do plano. Dá tempo de ajustar.',
    })
  }

  // 4. Ritmo acelerado — avisa ANTES de passar.
  if (p.ritmo?.estado === 'acelerado') {
    out.push({
      id: 'ritmo', tom: 'ambar', tag: 'Ritmo do mês',
      titulo: 'Você está gastando mais rápido que o mês',
      detalhe: `Já foi ${Math.round(p.ritmo.percGasto * 100)}% da variável em ${Math.round(p.ritmo.percMes * 100)}% do mês.`,
    })
  }

  return out.slice(0, MAX)
}
