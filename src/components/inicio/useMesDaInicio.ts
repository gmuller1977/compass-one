import { useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import type { DadosMes } from '../../context/AppContext'
import { construirRealizadoMes } from '../../utils/realizadoMes'
import type { Deps } from '../../utils/saldoConta'
import { nomesDeCartao, totaisDoMes, norm } from '../acompanhamento/evolucaoCalcs'
import { COR } from '../../utils/cores'
import type { TopCategoria } from '../analises/MaioresDespesasCard'

/**
 * Os números de um mês que a Início e Análises leem — a mesma passagem para as
 * duas telas, desde que a Início foi enxugada (06/10/2026) e parte dela foi
 * para Análises. Antes estava inline na Dashboard; a conta não mudou.
 *
 * Nenhum número é calculado aqui: saldo, receitas, despesas e planejado saem
 * das MESMAS funções do Radar (construirRealizadoMes + totaisDoMes), e o
 * motor de saldo recebe as MESMAS dependências, com o cenário.
 */
export function useMesDaInicio(ano: number, mes: number) {
  const {
    contas, categorias, extratoData, faturaData, planos, saldoInicialDinheiro, cenarioPrevisao,
  } = useApp()

  const totais = useMemo(() => {
    const planoAno = planos[ano]
    const { saidasMap, entradasMap } = construirRealizadoMes({
      ano, mes, extratoData: extratoData as Record<string, DadosMes>,
      faturaData, contas, categorias, planoAno,
    })
    const t = totaisDoMes({ mes, planoAno, categorias, cartaoNomes: nomesDeCartao(contas), entradasMap, saidasMap })

    // Por (nome, variante), como as linhas do Radar: Seguro · Civic e
    // Seguro · March são duas despesas, não uma.
    const topCategorias: TopCategoria[] = t.saida.linhas
      .filter(l => l.real > 0)
      .sort((a, b) => b.real - a.real).slice(0, 4)
      .map(l => {
        const cat = categorias.find(c => c.tipo === 'saida' && norm(c.nome) === norm(l.nome) && norm(c.descricao) === l.descricao)
          ?? categorias.find(c => norm(c.nome) === norm(l.nome))
        return {
          chave: `${l.nome}||${l.descricao}`,
          nome: l.descricao ? `${l.nome} · ${l.descricao}` : l.nome,
          gasto: l.real, cor: cat?.cor ?? COR.azul, icone: cat?.icone ?? '📌',
        }
      })

    return {
      totalEntradas: t.entrada.real, totalSaidas: t.saida.real,
      totalPrevS: t.saida.prev, totalPrevE: t.entrada.prev, topCategorias, linhasSaida: t.saida.linhas,
    }
  }, [contas, categorias, extratoData, faturaData, planos, mes, ano])

  const deps = useMemo<Deps>(() => ({
    extratoData: extratoData as Record<string, DadosMes>,
    faturaData: faturaData as Deps['faturaData'],
    contas, categorias, planos, saldoInicialDinheiro, cenarioPrevisao,
  }), [extratoData, faturaData, contas, categorias, planos, saldoInicialDinheiro, cenarioPrevisao])

  const temPlano = useMemo(() => {
    const p = planos[ano]
    if (!p) return false
    return (p.saidas ?? []).some(c => c.v.some(v => v > 0)) ||
           (p.entradas ?? []).some(c => c.v.some(v => v > 0))
  }, [planos, ano])

  // Com plano no mês, os quadros julgam contra o plano (estouradas, ritmo);
  // sem plano, mostram só o que se gastou.
  const usaPlanoNoMes = temPlano && totais.totalPrevS > 0

  return { ...totais, deps, temPlano, usaPlanoNoMes }
}
