import type { Categoria, Conta, DadosMes, PlanoAnoData } from '../context/AppContext'
import { construirRealizadoMes } from './realizadoMes'
import { resolverRealKey } from '../components/acompanhamento/evolucaoCalcs'

/**
 * O primeiro plano, montado a partir de um mês que já aconteceu.
 *
 * É a resposta à única pergunta que o wizard não consegue fazer para quem
 * está começando: "quanto você gasta em mercado por mês?". Depois de um mês
 * registrado, ninguém precisa responder — o extrato responde.
 *
 * A proposta é **o realizado do mês-base, categoria por categoria**. Não é
 * média de três meses (não há três), nem mediana, nem projeção: é o que
 * aconteceu. Qualquer sofisticação aqui inventaria precisão que o dado não
 * tem, e o usuário ainda vai ajustar linha a linha antes de aceitar.
 *
 * O realizado sai de `construirRealizadoMes` — a MESMA função que alimenta o
 * Radar. Uma segunda contagem "para a proposta" acabaria discordando da tela
 * que mostra o mês, e o usuário veria 300 no Radar e 280 na proposta do
 * mesmo mercado.
 */

export type LinhaProposta = {
  id?: string
  nome: string
  descricao?: string
  grupo?: string
  tipo: 'entrada' | 'saida'
  /** O realizado do mês-base. Vira o valor planejado de cada mês à frente. */
  valor: number
  /** Do cadastro. Quem é fixa entra no plano igual, mas a tela pode dizer. */
  fixa: boolean
  /** Categoria de cartão: o plano guarda isso em `t`. */
  ehCartao: boolean
}

export type Proposta = {
  ano: number
  mes: number
  entradas: LinhaProposta[]
  saidas: LinhaProposta[]
  totalEntradas: number
  totalSaidas: number
}

type Params = {
  ano: number
  mes: number
  extratoData: Record<string, DadosMes>
  faturaData: Record<string, unknown>
  contas: Conta[]
  categorias: Categoria[]
}

export function propostaDoMes({
  ano, mes, extratoData, faturaData, contas, categorias,
}: Params): Proposta {
  // Sem plano nenhum — é essa a situação em que esta função existe —, então
  // planoAno vai indefinido de propósito.
  const { saidasMap, entradasMap } = construirRealizadoMes({
    ano, mes, extratoData, faturaData, contas, categorias, planoAno: undefined,
  })

  const linhas = (tipo: 'entrada' | 'saida'): LinhaProposta[] => {
    const mapa = tipo === 'entrada' ? entradasMap : saidasMap
    return categorias
      .filter(c => c.ativa && c.tipo === tipo)
      .map(c => {
        // resolverRealKey é o mesmo casamento (nome, variante) que o Radar
        // usa; escrever outro aqui reabriria a divergência de sempre.
        const k = resolverRealKey(mapa, c.nome, c.descricao)
        return {
          id: c.id, nome: c.nome, descricao: c.descricao, grupo: c.grupo, tipo,
          valor: k ? mapa[k].total : 0,
          fixa: c.fixa,
          ehCartao: c.tipoMovimento === 'cartao',
        }
      })
      // Categoria sem movimento no mês não entra: propor zero é ruído, e o
      // usuário adiciona depois na Grade se quiser planejar algo novo.
      .filter(l => l.valor > 0)
      .sort((a, b) => b.valor - a.valor)
  }

  const entradas = linhas('entrada')
  const saidas = linhas('saida')

  return {
    ano, mes, entradas, saidas,
    totalEntradas: entradas.reduce((s, l) => s + l.valor, 0),
    totalSaidas: saidas.reduce((s, l) => s + l.valor, 0),
  }
}

/**
 * A proposta virando plano do ano.
 *
 * O valor se repete de `mesInicio` até dezembro e fica ZERO nos meses
 * anteriores. Preencher janeiro a agosto com o gasto de setembro inventaria
 * um passado que não houve — e o Planejamento compara mês a mês, então esse
 * passado apareceria como se tivesse sido planejado.
 *
 * `saldoInicialJan` fica em zero: janeiro já passou, e o saldo que importa é
 * o do mês corrente, que o Planejamento ancora no fechamento real do mês
 * anterior. É a regra de 09/09/2026 — a realidade entra num ponto só.
 */
export function planoDaProposta(
  p: Proposta,
  mesInicio: number,
  valores?: Record<string, number>,
): PlanoAnoData {
  const chave = (l: LinhaProposta) => `${l.tipo}|${l.nome}|${l.descricao ?? ''}`
  const v = (l: LinhaProposta) => {
    const val = valores?.[chave(l)] ?? l.valor
    return Array(12).fill(0).map((_, i) => (i >= mesInicio ? val : 0))
  }
  const linha = (l: LinhaProposta) => ({
    id: l.id, nome: l.nome, descricao: l.descricao, grupo: l.grupo,
    t: l.ehCartao ? 'cartao' : undefined,
    v: v(l),
  })

  return {
    saldoInicialJan: 0,
    entradas: p.entradas.filter(l => (valores?.[chave(l)] ?? l.valor) > 0).map(linha),
    saidas: p.saidas.filter(l => (valores?.[chave(l)] ?? l.valor) > 0).map(linha),
  }
}

/** A chave que a tela usa para guardar o valor editado de uma linha. */
export function chaveDaLinha(l: LinhaProposta) {
  return `${l.tipo}|${l.nome}|${l.descricao ?? ''}`
}
