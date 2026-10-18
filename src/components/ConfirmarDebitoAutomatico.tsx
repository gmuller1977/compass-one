import { useEffect, useMemo } from 'react'
import { useApp, type DadosMes } from '../context/AppContext'
import type { Deps } from '../utils/saldoConta'
import { confirmarDebito, debitosParaConfirmar } from '../utils/debitoAutomatico'

/**
 * Confirma as contas em débito automático que venceram neste mês
 * (utils/debitoAutomatico.ts). Montado no AppShell, em qualquer tela. Nada
 * com a cópia do aparelho (os números podem ser velhos) nem durante o load.
 */
export default function ConfirmarDebitoAutomatico() {
  const { user, carregando, dadosDoAparelho, contas, categorias, extratoData, faturaData, planos,
    saldoInicialDinheiro, updateExtratoMes } = useApp()
  const pendentes = useMemo(() => {
    const deps: Deps = {
      extratoData: extratoData as Record<string, DadosMes>, faturaData: faturaData as Deps['faturaData'],
      contas, categorias, planos, saldoInicialDinheiro,
    }
    return debitosParaConfirmar(deps)
  }, [contas, categorias, extratoData, faturaData, planos, saldoInicialDinheiro])

  useEffect(() => {
    if (!user || carregando || dadosDoAparelho !== null || pendentes.length === 0) return
    for (const d of pendentes) updateExtratoMes(d.chave, prev => confirmarDebito(prev, d))
  }, [user, carregando, dadosDoAparelho, pendentes, updateExtratoMes])
  return null
}
