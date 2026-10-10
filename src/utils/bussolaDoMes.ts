import type { Categoria } from '../context/AppContext'
import type { LinhaDoMes } from '../components/acompanhamento/evolucaoCalcs'
import { memoriaDoRadar, saldoBancosEDinheiro, type Deps } from './saldoConta'
import { ritmoDoMes, type RitmoDoMes } from './ritmoDoMes'
import { contasAVencer, type ContaAVencer } from './contasAVencer'
import { categoriasEstouradas, maisPertoDoLimite, type Estouro } from './categoriasEstouradas'
import { serieBaseDoPlano, piorMesDaSerie } from './simulacaoCompra'
import { lancadoAcimaDoPlano, type LancadoAcima } from './lancadoAcimaDoPlano'
import { avisosDoMes, type Aviso } from './avisosDoMes'

/**
 * As quatro perguntas da Bússola do celular (Fase 3 do plano mobile), no mês
 * corrente:
 *
 *   1. Quanto ainda posso gastar?        → ritmo (a folga do hero)
 *   2. Vou fechar o mês no azul?          → fechamento da memória de cálculo
 *   3. O que vence e tenho saldo?         → contas (contasAVencer) e saldoHoje
 *   4. Onde estou saindo do plano?        → estouradas, ou as mais perto
 *
 * Nenhuma conta nova: cada número sai da MESMA função que a Início do
 * computador usa, com as mesmas dependências. A prova60 tranca isso.
 *
 * Avisos: só os que nenhum quadro da Bússola já responde — mês negativo à
 * frente e parcela acima do plano. Contas, "passou" e ritmo têm quadro próprio
 * aqui; repetir em aviso seria dizer a mesma coisa duas vezes na tela pequena.
 */
export type Bussola = {
  /** A memória de cálculo do Radar; `fechamento` é com quanto o mês termina. */
  memoria: ReturnType<typeof memoriaDoRadar>
  fechamento: number
  saldoHoje: number
  ritmo: RitmoDoMes | null
  contas: ContaAVencer[]
  estouradas: Estouro[]
  perto: LinhaDoMes[]
  lancadoAcima: LancadoAcima[]
  avisos: Aviso[]
}

export function bussolaDoMes(p: {
  deps: Deps
  linhasSaida: LinhaDoMes[]
  categorias: Categoria[]
  /** Há plano de despesa neste mês — sem ele não há folga nem estouro. */
  usaPlanoNoMes: boolean
  hoje?: Date
}): Bussola {
  const hoje = p.hoje ?? new Date()
  const ano = hoje.getFullYear(), mes = hoje.getMonth()
  const memoria = memoriaDoRadar(ano, mes, p.deps, { hoje })
  const ritmo = p.usaPlanoNoMes ? ritmoDoMes(p.linhasSaida, p.categorias, hoje) : null
  const estouradas = p.usaPlanoNoMes ? categoriasEstouradas(p.linhasSaida) : []
  const perto = p.usaPlanoNoMes && estouradas.length === 0 ? maisPertoDoLimite(p.linhasSaida, p.categorias) : []

  const serie = serieBaseDoPlano(p.deps, hoje)
  const negativo = serie ? piorMesDaSerie(serie).primeiroNegativo : null
  const lancadoAcima = lancadoAcimaDoPlano(p.deps, hoje)
  const avisos = avisosDoMes({
    contas: [], linhasSaida: [], ritmo: null, hoje, lancadoAcima,
    negativo: negativo ? { ano: negativo.ano, mes: negativo.mes, valor: negativo.semCompra } : null,
  })

  return {
    memoria,
    fechamento: memoria.fechamento,
    saldoHoje: saldoBancosEDinheiro(ano, mes, p.deps),
    ritmo,
    contas: contasAVencer(p.deps, hoje),
    estouradas, perto, lancadoAcima, avisos,
  }
}
