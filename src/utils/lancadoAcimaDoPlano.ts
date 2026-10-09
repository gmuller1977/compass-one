import type { DadosMes } from '../context/AppContext'
import type { Deps } from './saldoConta'
import { construirRealizadoMes } from './realizadoMes'
import { nomesDeCartao, pickReal, totaisDoMes } from '../components/acompanhamento/evolucaoCalcs'
import { fimDoPlanejamento } from './simulacaoCompra'
import type { JaLancado } from './historicoDaCategoria'

/**
 * Categorias cujo JÁ LANÇADO passa do plano de um mês que ainda não começou.
 * Pedido do Guilherme em 06/10/2026: "se tenho compras futuras que ficam
 * acima do planejamento, deveria existir um mecanismo de alerta".
 *
 * O caso típico é a parcela: a fatura grava as parcelas de uma compra
 * parcelada nos meses seguintes, e a parcela 4 de 6 de novembro pode já não
 * caber no plano de novembro — o mês estoura antes de começar, e ninguém olha
 * o Radar de novembro em outubro.
 *
 * Nenhuma conta nova: por mês, as MESMAS construirRealizadoMes + totaisDoMes
 * do Radar. Uma linha "passa" quando o realizado do mês futuro (que só pode
 * ser o que já foi lançado) supera o previsto dela — o mesmo "passou" que o
 * Radar mostraria se alguém abrisse aquele mês. Do mês SEGUINTE a hoje até o
 * fim do plano; o corrente é assunto do Radar e do Ritmo. Só despesas.
 */
export type MesAcima = { ano: number; mes: number; plano: number; jaLancado: number; excesso: number; itens: JaLancado[] }
export type LancadoAcima = {
  nome: string; descricao: string; grupo: string
  meses: MesAcima[]
  excessoTotal: number
}

const MEIO_CENTAVO = 0.005

export function lancadoAcimaDoPlano(deps: Deps, hoje: Date = new Date()): LancadoAcima[] {
  const fim = fimDoPlanejamento(deps.planos)
  if (!fim) return []
  const cartaoNomes = nomesDeCartao(deps.contas)
  const ymFim = fim.ano * 12 + fim.mes
  const por = new Map<string, LancadoAcima>()
  for (let ym = hoje.getFullYear() * 12 + hoje.getMonth() + 1; ym <= ymFim; ym++) {
    const ano = Math.floor(ym / 12), mes = ym % 12
    const planoAno = deps.planos[ano]
    if (!planoAno) continue
    const { saidasMap, entradasMap } = construirRealizadoMes({
      ano, mes, extratoData: deps.extratoData as Record<string, DadosMes>,
      faturaData: deps.faturaData, contas: deps.contas, categorias: deps.categorias, planoAno,
    })
    const tt = totaisDoMes({ mes, planoAno, categorias: deps.categorias, cartaoNomes, entradasMap, saidasMap })
    for (const l of tt.saida.linhas) {
      const excesso = l.real - l.prev
      if (excesso <= MEIO_CENTAVO) continue
      const cr = pickReal(saidasMap, l.nome, l.descricao, deps.categorias)
      const itens: JaLancado[] = (cr?.lancamentos ?? [])
        .filter(x => Math.abs(x.valor) > MEIO_CENTAVO)
        .map(x => ({ descricao: x.descricao, valor: x.valor, ...(x.parcela ? { parcela: x.parcela } : {}) }))
      const k = `${l.nome}||${l.descricao}`
      const atual = por.get(k) ?? { nome: l.nome, descricao: l.descricao, grupo: l.grupo, meses: [], excessoTotal: 0 }
      atual.meses.push({ ano, mes, plano: l.prev, jaLancado: l.real, excesso: Math.round(excesso * 100) / 100, itens })
      atual.excessoTotal = Math.round((atual.excessoTotal + excesso) * 100) / 100
      por.set(k, atual)
    }
  }
  // Primeiro o que estoura antes; no mesmo mês, o maior excesso.
  return [...por.values()].sort((a, b) => {
    const ya = a.meses[0].ano * 12 + a.meses[0].mes, yb = b.meses[0].ano * 12 + b.meses[0].mes
    return ya - yb || b.excessoTotal - a.excessoTotal
  })
}
