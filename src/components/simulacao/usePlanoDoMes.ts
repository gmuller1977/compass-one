import { useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import type { PlanoAnoData } from '../../context/AppContext'
import type { Deps } from '../../utils/saldoConta'
import { previstoDoAno, type CtxPlano } from '../planejamento/previstoDoAno'

/**
 * O que o PLANO guarda num mês (receitas − despesas planejadas) e a meta de
 * economia dele, pela passagem do Planejamento — um ano por vez. É a régua do
 * cartão do mês no Planejamento, lida pela Compra e pela Quitação.
 */
export function usePlanoDoMes(deps: Deps) {
  const { planos, categorias, contas, faturaData } = useApp()
  return useMemo(() => {
    const hoje = new Date()
    const ctx: CtxPlano = {
      anoCorrente: hoje.getFullYear(), mesAtual: hoje.getMonth(), categorias, contas, faturaData,
      planos: planos as Record<number, unknown>,
      saldoInicialFixo: contas.filter(c => c.tipo === 'corrente' && c.incluirNoSaldoInicial !== false)
        .reduce((t, c) => t + c.saldoInicial, 0),
      depsSaldo: deps,
    }
    const anos = new Map<number, ReturnType<typeof previstoDoAno> | null>()
    return (ano: number, mes: number): { guarda: number; meta: number } | null => {
      const plano = (planos as Record<number, PlanoAnoData | undefined>)[ano]
      if (!plano) return null
      if (!anos.has(ano)) anos.set(ano, previstoDoAno(ano, ctx))
      const p = anos.get(ano)!
      return p ? { guarda: p.totalEntradas[mes] - p.totalSaidas[mes], meta: plano.objetivos?.[mes] ?? 0 } : null
    }
  }, [planos, categorias, contas, faturaData, deps])
}
