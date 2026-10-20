import type { AnoData } from './types'
import type { BulkOp } from './PlanFerramentas'

/**
 * "Zerar" do Planejamento (19/10/2026, pedido do Guilherme: o "Planejamento
 * do Zero" saiu do menu e virou "zerar o mês selecionado ou o ano" dentro do
 * Planejamento). Zera o valor planejado de toda receita e despesa nos meses
 * pedidos, com os itens junto (inclusive os do Simulador): o mês fica limpo
 * para planejar de novo. A meta de economia e os lançamentos não mudam.
 */

/** Primeiro mês que pode ser zerado: ano futuro, janeiro; ano corrente, o mês
 * de hoje (os fechados guardam o plano com que foram medidos, a regra do
 * Copiar ano); ano passado, nenhum (12). */
export function primeiroMesZeravel(ano: number, hoje = new Date()): number {
  const anoHoje = hoje.getFullYear()
  return ano > anoHoje ? 0 : ano === anoHoje ? hoje.getMonth() : 12
}

/** As gravações que zeram `meses`: só as células que têm valor ou itens. */
export function opsParaZerar(dados: AnoData, meses: number[]): BulkOp[] {
  const ops: BulkOp[] = []
  const zerar = (tipo: 'e' | 's', lista: AnoData['entradas']) =>
    lista.forEach((cat, ri) => meses.forEach(mi => {
      const temItens = (cat.itens?.[mi]?.length ?? 0) > 0
      if ((cat.v[mi] ?? 0) !== 0 || temItens) ops.push({ tipo, ri, mi, valor: 0 })
    }))
  zerar('e', dados.entradas)
  zerar('s', dados.saidas)
  return ops
}
