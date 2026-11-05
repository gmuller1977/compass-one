import { useEffect, useMemo } from 'react'
import { useApp, type DadosMes } from '../context/AppContext'
import type { Deps } from '../utils/saldoConta'
import { marcasForaDoLugar, porMarca, tirarMarca, automaticasPagasNoFuturo, tirarPagamento } from '../utils/debitoAutomatico'

/**
 * Arruma as marcas dos automáticos (utils/debitoAutomatico.ts): devolve à
 * conta certa a marca gravada num investimento e tira a marca de dia que não
 * chegou. Desde 05/11/2026 NÃO marca mais nada sozinho (pedido do Guilherme:
 * vem desmarcado em Lançamentos e na Início, e conferir num marca o outro).
 * Montado no AppShell, em qualquer tela. Nada com a cópia do aparelho (os
 * números podem ser velhos) nem durante o load.
 */
export default function ConfirmarDebitoAutomatico() {
  const { user, carregando, dadosDoAparelho, contas, categorias, extratoData, faturaData, planos,
    saldoInicialDinheiro, updateExtratoMes } = useApp()
  const pendentes = useMemo(() => {
    const deps: Deps = {
      extratoData: extratoData as Record<string, DadosMes>, faturaData: faturaData as Deps['faturaData'],
      contas, categorias, planos, saldoInicialDinheiro,
    }
    return { fora: marcasForaDoLugar(deps), futuro: automaticasPagasNoFuturo(deps) }
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
    for (const f of pendentes.futuro) updateExtratoMes(f.chave, prev => tirarPagamento(prev, f.id))
  }, [user, carregando, dadosDoAparelho, pendentes, extratoData, updateExtratoMes])
  return null
}
