import { useEffect, useMemo } from 'react'
import { useApp, type DadosMes } from '../context/AppContext'
import type { Deps } from '../utils/saldoConta'
import { confirmarDebito, debitosParaConfirmar, marcasForaDoLugar, porMarca, tirarMarca, automaticasPagasNoFuturo, tirarPagamento } from '../utils/debitoAutomatico'

/**
 * Confirma as contas em débito automático e os recebimentos que caem sozinhos
 * no banco, vencidos neste mês (utils/debitoAutomatico.ts). Montado no AppShell, em qualquer tela. Nada
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
    return { fora: marcasForaDoLugar(deps), futuro: automaticasPagasNoFuturo(deps), confirmar: debitosParaConfirmar(deps) }
  }, [contas, categorias, extratoData, faturaData, planos, saldoInicialDinheiro])

  useEffect(() => {
    if (!user || carregando || dadosDoAparelho !== null) return
    // Primeiro devolve à conta certa a marca gravada num investimento; a
    // confirmação do dia roda na passagem seguinte, já sobre o lugar certo.
    if (pendentes.fora.length > 0) {
      const dados = extratoData as Record<string, DadosMes>
      for (const m of pendentes.fora) {
        const origem = dados[m.de]
        updateExtratoMes(m.para, prev => porMarca(prev, origem, m.id))
        updateExtratoMes(m.de, prev => tirarMarca(prev, m.id))
      }
      return
    }
    if (pendentes.futuro.length > 0) {
      for (const f of pendentes.futuro) updateExtratoMes(f.chave, prev => tirarPagamento(prev, f.id))
      return
    }
    for (const d of pendentes.confirmar) updateExtratoMes(d.chave, prev => confirmarDebito(prev, d))
  }, [user, carregando, dadosDoAparelho, pendentes, extratoData, updateExtratoMes])
  return null
}
