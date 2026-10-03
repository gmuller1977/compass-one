import type { DadosMes } from '../context/AppContext'
import type { Deps } from './saldoConta'
import { construirRealizadoMes } from './realizadoMes'
import { nomesDeCartao, totaisDoMes, type LinhaDoMes } from '../components/acompanhamento/evolucaoCalcs'
import { primeiroMesComRegistro, ymRegistro } from './evolucaoSaldo'

/**
 * Receitas e despesas, realizado contra previsto, mês a mês — o comparativo
 * da tela Início. Briefing "Hierarquia e comparativo na tela Início", onda 3.
 *
 * Nenhuma soma própria: por mês, as MESMAS duas chamadas que a Início já faz
 * para o mês exibido — construirRealizadoMes + totaisDoMes —, que são as do
 * Radar. O mês corrente sai idêntico (===) aos cartões de cima; a prova38
 * exige isso.
 *
 * Três cuidados:
 *   1. o plano é resolvido POR MÊS: a janela atravessa a virada do ano, e
 *      planos[2025] não é planos[2026];
 *   2. a janela começa no primeiro mês com registro (primeiroMesComRegistro,
 *      a mesma do gráfico de saldo): antes dele seriam barras zeradas, que
 *      leem "não ganhei nada" quando a verdade é "não havia app";
 *   3. são N chamadas de construirRealizadoMes — quem chama usa useMemo.
 */
export type MesComparado = {
  ano: number; mes: number
  /** Realizado. */
  receitas: number; despesas: number
  prevReceitas: number; prevDespesas: number
  /** É o mês corrente, ainda em curso. */
  parcial: boolean
  /**
   * As linhas por categoria, da MESMA passagem que somou os totais — é delas
   * que a Precisão do plano (utils/precisaoDoPlano) agrega o erro por
   * categoria, sem refazer o laço. O detalhe sai de onde sai o total, como em
   * detalharProjecaoDaConta: não há segunda função para discordar.
   */
  linhasSaida: LinhaDoMes[]
  linhasEntrada: LinhaDoMes[]
}

export function comparativoMensal(
  deps: Deps,
  planos: Deps['planos'],
  hoje: Date = new Date(),
  opts: { meses?: number } = {},
): MesComparado[] {
  const meses = opts.meses ?? 6
  const primeiro = primeiroMesComRegistro(deps.extratoData)
  if (primeiro === null) return []
  const cartaoNomes = nomesDeCartao(deps.contas)
  const out: MesComparado[] = []
  for (let i = meses - 1; i >= 0; i--) {
    const t = hoje.getMonth() - i
    const ano = hoje.getFullYear() + Math.floor(t / 12)
    const mes = ((t % 12) + 12) % 12
    if (ymRegistro(ano, mes) < primeiro) continue
    const planoAno = planos[ano]
    const { saidasMap, entradasMap } = construirRealizadoMes({
      ano, mes, extratoData: deps.extratoData as Record<string, DadosMes>,
      faturaData: deps.faturaData, contas: deps.contas, categorias: deps.categorias, planoAno,
    })
    const tt = totaisDoMes({ mes, planoAno, categorias: deps.categorias, cartaoNomes, entradasMap, saidasMap })
    out.push({
      ano, mes,
      receitas: tt.entrada.real, despesas: tt.saida.real,
      prevReceitas: tt.entrada.prev, prevDespesas: tt.saida.prev,
      parcial: i === 0,
      linhasSaida: tt.saida.linhas, linhasEntrada: tt.entrada.linhas,
    })
  }
  return out
}
