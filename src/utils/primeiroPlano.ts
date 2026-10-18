import type { Categoria, Conta, DadosMes, PlanoAnoData } from '../context/AppContext'
import { construirRealizadoMes } from './realizadoMes'
import { resolverRealKey } from '../components/acompanhamento/evolucaoCalcs'
import { NOME_DECIMO, valoresDoDecimo, type EstimativasIniciais } from './primeiroAcesso'

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
  /** Sem lançamento no mês: o valor veio do primeiro acesso. */
  estimado?: boolean
  /** Último mês ("AAAA-MM") de um financiamento ou parcela: depois dele, zero. */
  ate?: string
  /** Primeiro mês ("AAAA-MM") da parcela no cartão: antes dele, zero. */
  desde?: string
}

export type Proposta = {
  ano: number
  mes: number
  entradas: LinhaProposta[]
  saidas: LinhaProposta[]
  totalEntradas: number
  totalSaidas: number
  /** O 13º do primeiro acesso: entra só em novembro e dezembro, fora dos totais do mês. */
  decimo?: { id: string; nome: string; grupo?: string; valor: number }
}

type Params = {
  ano: number
  mes: number
  extratoData: Record<string, DadosMes>
  faturaData: Record<string, unknown>
  contas: Conta[]
  categorias: Categoria[]
  /** As respostas do primeiro acesso (utils/primeiroAcesso), se houver. */
  estimativas?: EstimativasIniciais
}

export function propostaDoMes({
  ano, mes, extratoData, faturaData, contas, categorias, estimativas,
}: Params): Proposta {
  // Sem plano nenhum — é essa a situação em que esta função existe —, então
  // planoAno vai indefinido de propósito.
  const { saidasMap, entradasMap } = construirRealizadoMes({
    ano, mes, extratoData, faturaData, contas, categorias, planoAno: undefined,
  })

  const linhas = (tipo: 'entrada' | 'saida'): LinhaProposta[] => {
    const mapa = tipo === 'entrada' ? entradasMap : saidasMap
    return categorias
      // O 13º não é do mês: repetir o recebido em todos os meses inventaria
      // doze 13º. Ele entra à parte, em novembro e dezembro.
      .filter(c => c.ativa && c.tipo === tipo && c.nome !== NOME_DECIMO)
      .map(c => {
        // resolverRealKey é o mesmo casamento (nome, variante) que o Radar
        // usa; escrever outro aqui reabriria a divergência de sempre.
        const k = resolverRealKey(mapa, c.nome, c.descricao, categorias)
        const real = k ? mapa[k].total : 0
        // Onde o mês não teve lançamento, vale o que a pessoa contou no
        // primeiro acesso: o aluguel não lançado não pode sumir do plano.
        const est = estimativas?.porCategoria[c.id]
        const estimado = real <= 0 && (est?.valor ?? 0) > 0
        return {
          id: c.id, nome: c.nome, descricao: c.descricao, grupo: c.grupo, tipo,
          valor: estimado ? est!.valor : real,
          fixa: c.fixa || !!(est?.fixa && est.dia),
          ehCartao: c.tipoMovimento === 'cartao',
          ...(estimado ? { estimado: true } : {}),
          ...(est?.ate ? { ate: est.ate } : {}),
          ...(estimado && est?.desde ? { desde: est.desde } : {}),
        }
      })
      // Categoria sem movimento no mês não entra: propor zero é ruído, e o
      // usuário adiciona depois na Grade se quiser planejar algo novo.
      .filter(l => l.valor > 0)
      .sort((a, b) => b.valor - a.valor)
  }

  const entradas = linhas('entrada')
  const saidas = linhas('saida')

  const catDecimo = estimativas?.decimo && categorias.find(c => c.id === estimativas.decimo!.categoriaId && c.ativa)
  const decimo = catDecimo && estimativas!.decimo!.valor > 0
    ? { id: catDecimo.id, nome: catDecimo.nome, grupo: catDecimo.grupo, valor: estimativas!.decimo!.valor }
    : undefined

  return {
    ano, mes, entradas, saidas, ...(decimo ? { decimo } : {}),
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
  anoDoPlano = new Date().getFullYear(),
): PlanoAnoData {
  const chave = (l: LinhaProposta) => `${l.tipo}|${l.nome}|${l.descricao ?? ''}`
  // Financiamento e parcela informados no primeiro acesso terminam: depois
  // da última, o plano não inventa mais nenhuma.
  const dentro = (l: LinhaProposta, i: number) => {
    const m = `${anoDoPlano}-${String(i + 1).padStart(2, '0')}`
    return (!l.ate || m <= l.ate) && (!l.desde || m >= l.desde)
  }
  const v = (l: LinhaProposta) => {
    const val = valores?.[chave(l)] ?? l.valor
    return Array(12).fill(0).map((_, i) => (i >= mesInicio && dentro(l, i) ? val : 0))
  }
  const linha = (l: LinhaProposta) => ({
    id: l.id, nome: l.nome, descricao: l.descricao, grupo: l.grupo,
    t: l.ehCartao ? 'cartao' : undefined,
    v: v(l),
  })

  return {
    saldoInicialJan: 0,
    entradas: [
      ...p.entradas.filter(l => (valores?.[chave(l)] ?? l.valor) > 0).map(linha).filter(l => l.v.some(x => x > 0)),
      ...(p.decimo && valoresDoDecimo(p.decimo.valor, mesInicio).some(v => v > 0)
        ? [{ id: p.decimo.id, nome: p.decimo.nome, grupo: p.decimo.grupo, v: valoresDoDecimo(p.decimo.valor, mesInicio) }]
        : []),
    ],
    saidas: p.saidas.filter(l => (valores?.[chave(l)] ?? l.valor) > 0).map(linha).filter(l => l.v.some(x => x > 0)),
  }
}

/** A chave que a tela usa para guardar o valor editado de uma linha. */
export function chaveDaLinha(l: LinhaProposta) {
  return `${l.tipo}|${l.nome}|${l.descricao ?? ''}`
}

/**
 * Até que dia do mês o mês corrente ainda conta como inteiro. Depois dele,
 * o primeiro plano começa no mês seguinte (pedido do Guilherme em
 * 18/10/2026: "se o cliente entrar no meio do mês, o plano não faz sentido").
 */
export const DIA_LIMITE_DO_MES_COMPLETO = 5

/** O primeiro mês inteiro para quem começa a usar hoje: o do plano inicial. */
export function primeiroMesCompleto(hoje = new Date()): { ano: number; mes: number } {
  const ano = hoje.getFullYear(), mes = hoje.getMonth()
  if (hoje.getDate() <= DIA_LIMITE_DO_MES_COMPLETO) return { ano, mes }
  return mes === 11 ? { ano: ano + 1, mes: 0 } : { ano, mes: mes + 1 }
}

/**
 * O plano inicial, montado no fim do primeiro acesso com o que a pessoa
 * contou (18/10/2026, pedido do Guilherme: "o cliente informou um monte de
 * coisa mas não se usa para nada... poderia ser aproveitado para já montar
 * seu primeiro planejamento repetindo os valores mês a mês"). No mesmo dia o
 * Modo Descoberta saiu: com as perguntas, todo mundo já sai com um plano.
 *
 * Começa no primeiro mês INTEIRO (`primeiroMesCompleto`) e vai até dezembro
 * desse ano, o mesmo valor todo mês, com o fim de cada financiamento e
 * parcela (`ate`), a parcela no cartão a partir do mês da fatura (`desde`) e
 * o 13º em novembro e dezembro. Toda linha sai da estimativa: o realizado é
 * vazio. Sem nenhum valor informado, devolve `null`.
 */
export function planoDoPrimeiroAcesso(
  categorias: Categoria[], estimativas: EstimativasIniciais | undefined, hoje = new Date(),
): { ano: number; mes: number; plano: PlanoAnoData } | null {
  if (!estimativas) return null
  const { ano, mes } = primeiroMesCompleto(hoje)
  const p = propostaDoMes({ ano, mes, extratoData: {}, faturaData: {}, contas: [], categorias, estimativas })
  const plano = planoDaProposta(p, mes, undefined, ano)
  return plano.entradas.length || plano.saidas.length ? { ano, mes, plano } : null
}
