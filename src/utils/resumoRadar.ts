import type { Categoria } from '../context/AppContext'
import type { LinhaDoMes } from '../components/acompanhamento/evolucaoCalcs'
import { cadastroDaLinha } from '../components/acompanhamento/evolucaoCalcs'
import { ritmoDoMes } from './ritmoDoMes'

/**
 * A frase do topo do Radar: a resposta prática do mês, antes dos números.
 * Pedido do Guilherme em 06/10/2026 — "parece um monte de número, não me traz
 * algo prático".
 *
 * Nenhuma conta nova. O "ainda dá para gastar" é o `sobra` do ritmoDoMes, o
 * MESMO número do quadro "Ritmo do mês" da Início: planejado − gasto da
 * despesa variável inteira (envelope único). Os grupos que passaram do plano
 * saem das linhas de totaisDoMes somadas por grupo — os mesmos totais que os
 * cabeçalhos de grupo do Radar desenham logo abaixo.
 *
 * Mês corrente: quanto ainda dá e por dia. Mês fechado: como fechou. Mês
 * futuro: nada — ainda não há o que dizer sobre ele aqui.
 */
export type ResumoRadar = { tom: 'ok' | 'passou'; titulo: string; detalhe: string }

const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
const reais = (v: number) => `R$ ${Math.round(Math.abs(v)).toLocaleString('pt-BR')}`

/**
 * Os grupos cujo realizado passou do previsto, do maior excesso para o menor —
 * o mesmo total que o cabeçalho do grupo no Radar desenha. Também é a fonte
 * do aviso "passou do plano" da Início (utils/avisosDoMes). `grupo` é a chave
 * do Radar; `nome` já troca "__sem_grupo__" por "Outras".
 */
export function gruposQuePassaram(linhas: LinhaDoMes[]): { grupo: string; nome: string; excesso: number }[] {
  const porGrupo = new Map<string, number>()
  for (const l of linhas) porGrupo.set(l.grupo, (porGrupo.get(l.grupo) ?? 0) + l.real - l.prev)
  return [...porGrupo.entries()]
    .filter(([, excesso]) => excesso > 0.005)
    .sort((a, b) => b[1] - a[1])
    .map(([grupo, excesso]) => ({ grupo, nome: grupo === '__sem_grupo__' ? 'Outras' : grupo, excesso }))
}

/**
 * As categorias VARIÁVEIS que passaram do plano, do maior excesso para o menor,
 * e as que ainda têm plano para gastar. Mesmas linhas e mesmo filtro de fixa do
 * ritmoDoMes, então somam o mesmo gasto − planejado do envelope.
 */
function variaveisDoMes(linhas: LinhaDoMes[], categorias: Categoria[]) {
  const rotulo = (l: LinhaDoMes) => (l.descricao ? `${l.nome} · ${l.descricao}` : l.nome)
  const variaveis = linhas.filter(l => !cadastroDaLinha(l, categorias)?.fixa)
  const passaram = variaveis.filter(l => l.real - l.prev > 0.005)
    .sort((a, b) => (b.real - b.prev) - (a.real - a.prev))
    .map(l => ({ nome: rotulo(l), excesso: l.real - l.prev }))
  const comSobra = variaveis.filter(l => l.prev - l.real > 0.005)
    .sort((a, b) => (b.prev - b.real) - (a.prev - a.real))
    .map(l => ({ nome: rotulo(l), sobra: l.prev - l.real }))
  return { passaram, comSobra }
}

function listaNomes(nomes: string[]): string {
  if (nomes.length <= 1) return nomes[0] ?? ''
  if (nomes.length === 2) return `${nomes[0]} e ${nomes[1]}`
  return `${nomes[0]}, ${nomes[1]} e mais ${nomes.length - 2}`
}

function fraseGrupos(nomes: string[], ja: boolean): string {
  if (!nomes.length) return ''
  const verbo = nomes.length === 1 ? `${ja ? 'já ' : ''}passou do plano` : `${ja ? 'já ' : ''}passaram do plano`
  if (nomes.length === 1) return `${nomes[0]} ${verbo}`
  if (nomes.length <= 3) return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]} ${verbo}`
  return `${nomes.slice(0, 2).join(', ')} e mais ${nomes.length - 2} grupos ${verbo}`
}

export function resumoDoMes(
  linhasSaida: LinhaDoMes[], categorias: Categoria[], ano: number, mes: number, hoje: Date = new Date(),
): ResumoRadar | null {
  const ymAlvo = ano * 12 + mes, ymHoje = hoje.getFullYear() * 12 + hoje.getMonth()
  if (ymAlvo > ymHoje) return null
  const corrente = ymAlvo === ymHoje
  const r = ritmoDoMes(linhasSaida, categorias, corrente ? hoje : new Date(ano, mes + 1, 0))
  if (!r) return null
  const grupos = fraseGrupos(gruposQuePassaram(linhasSaida).map(g => g.nome), corrente)
  const juntar = (...partes: string[]) => partes.filter(Boolean).join(' · ')
  const excesso = r.gasto - r.planejado

  if (corrente) {
    // Passou: dizer ONDE, que é onde se corta. Antes era só "as despesas
    // variáveis passaram do plano em R$ X" — um fato sem decisão, recusado
    // pelo Guilherme em 12/10/2026. O total vai para o detalhe, junto do que
    // ainda está planejado em outras categorias (o que dá para segurar).
    if (r.estado === 'passou') {
      const { passaram, comSobra } = variaveisDoMes(linhasSaida, categorias)
      const topo = passaram.slice(0, 3).map(p => `${p.nome} +${reais(p.excesso)}`)
      const resto = passaram.length > 3 ? ` e mais ${passaram.length - 3}` : ''
      const sobraOutras = comSobra.reduce((s, c) => s + c.sobra, 0)
      return {
        tom: 'passou',
        titulo: topo.length ? `Passou do plano em ${topo.join(' · ')}${resto}` : `As despesas variáveis passaram do plano em ${reais(excesso)}`,
        detalhe: juntar(
          `Variáveis ${reais(excesso)} acima no total`,
          sobraOutras > 0.005
            ? `ainda há ${reais(sobraOutras)} planejados em ${listaNomes(comSobra.map(c => c.nome))}: gastar menos ali compensa`
            : 'cada gasto variável até o dia ' + r.totalDias + ' sai do saldo final',
        ),
      }
    }
    return {
      tom: 'ok',
      titulo: `Ainda dá para gastar ${reais(r.sobra)} nas despesas variáveis até o dia ${r.totalDias}`,
      detalhe: juntar(r.diasRestantes === 1 ? 'hoje é o último dia' : `${reais(r.porDia)} por dia nos ${r.diasRestantes} dias que faltam`, grupos),
    }
  }
  const nomeMes = MESES[mes].replace(/^./, c => c.toUpperCase())
  if (excesso > 0.005) return { tom: 'passou', titulo: `Em ${MESES[mes]} as despesas variáveis passaram do plano em ${reais(excesso)}`, detalhe: grupos }
  if (r.sobra > 0.005) return { tom: 'ok', titulo: `${nomeMes} fechou com ${reais(r.sobra)} de sobra nas despesas variáveis`, detalhe: grupos }
  return { tom: 'ok', titulo: `${nomeMes} fechou com as despesas variáveis exatamente no plano`, detalhe: grupos }
}
