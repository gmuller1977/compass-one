import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { DadosMes } from '../context/AppContext'
import { construirRealizadoMes } from '../utils/realizadoMes'
import { nomesDeCartao, totaisDoMes } from './acompanhamento/evolucaoCalcs'
import { ritmoDoMes } from '../utils/ritmoDoMes'
import { resumoDoMes } from '../utils/resumoRadar'

type Status = 'verde' | 'amarelo' | 'vermelho' | 'sem-plano' | 'sem-dados'

/**
 * A bússola da home do celular. Não faz conta própria: a frase é a do topo do
 * Radar (`resumoDoMes`) e o status é o estado do Ritmo do mês (`ritmoDoMes`),
 * as duas sobre as linhas de `totaisDoMes` — os mesmos números da Início e do
 * Radar no computador.
 *
 * Antes somava entradas e saídas do extrato de todas as contas: contava
 * transferência entre contas como gasto, ignorava compra no cartão e julgava
 * fixa e variável juntas, e por isso discordava do Radar sobre o mesmo mês.
 */
export default function CompassCard({ style }: { style?: React.CSSProperties }) {
  const navigate = useNavigate()
  const { contas, categorias, extratoData, faturaData, planos } = useApp()
  const hoje = new Date()
  const ano  = hoje.getFullYear()
  const mes  = hoje.getMonth()

  const { status, titulo, detalhe } = useMemo<{
    status: Status; titulo: string; detalhe: string
  }>(() => {
    const planoAno = planos[ano]
    const { saidasMap, entradasMap } = construirRealizadoMes({
      ano, mes, extratoData: extratoData as Record<string, DadosMes>,
      faturaData, contas, categorias, planoAno,
    })
    const t = totaisDoMes({ mes, planoAno, categorias, cartaoNomes: nomesDeCartao(contas), entradasMap, saidasMap })

    if (!planoAno || t.saida.prev === 0) return { status: 'sem-plano', titulo: '', detalhe: '' }
    if (t.saida.real === 0 && t.entrada.real === 0) return { status: 'sem-dados', titulo: '', detalhe: '' }

    const ritmo  = ritmoDoMes(t.saida.linhas, categorias, hoje)
    const resumo = resumoDoMes(t.saida.linhas, categorias, ano, mes, hoje)
    if (!ritmo || !resumo) return { status: 'sem-plano', titulo: '', detalhe: '' }
    const st: Status = ritmo.estado === 'passou' ? 'vermelho' : ritmo.estado === 'acelerado' ? 'amarelo' : 'verde'
    return { status: st, titulo: resumo.titulo, detalhe: resumo.detalhe }
  }, [contas, categorias, extratoData, faturaData, planos, ano, mes]) // eslint-disable-line react-hooks/exhaustive-deps

  type Config = { bg: string; border: string; icon: string; iconBg: string; iconBorder: string; title: string; msg: string; cor: string }
  const configs: Record<Status, Config> = {
    verde: {
      bg: '#f0fdf4', border: '#86efac', icon: '🧭',
      iconBg: '#dcfce7', iconBorder: '#bbf7d0',
      title: 'Você está dentro do plano',
      msg: titulo,
      cor: '#16a34a',
    },
    amarelo: {
      bg: '#fffbeb', border: '#fde68a', icon: '⚠️',
      iconBg: '#fef3c7', iconBorder: '#fde68a',
      title: 'Gastando mais rápido que o mês',
      msg: titulo,
      cor: '#b45309',
    },
    vermelho: {
      bg: '#fff1f2', border: '#fecdd3', icon: '🔴',
      iconBg: '#fee2e2', iconBorder: '#fecdd3',
      title: 'Passou do plano',
      msg: titulo,
      cor: '#dc2626',
    },
    'sem-plano': {
      bg: '#f8faff', border: '#e2e8f0', icon: '🧭',
      iconBg: '#eff6ff', iconBorder: '#bfdbfe',
      title: 'Sem planejamento',
      msg: 'Monte seu plano para eu poder te guiar.',
      cor: '#1a56db',
    },
    'sem-dados': {
      bg: '#f8faff', border: '#e2e8f0', icon: '📊',
      iconBg: '#f1f5f9', iconBorder: '#e2e8f0',
      title: 'Sem lançamentos',
      msg: 'Registre seus primeiros gastos para eu mostrar sua direção.',
      cor: '#64748b',
    },
  }

  const c = configs[status]

  return (
    <div style={{
      background: c.bg,
      border: `1.5px solid ${c.border}`,
      borderRadius: 14,
      padding: '12px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      ...style,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: c.iconBg, border: `1.5px solid ${c.iconBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, flexShrink: 0,
      }}>{c.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: c.cor, marginBottom: 1 }}>{c.title}</div>
        <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>{c.msg}</div>
        {detalhe && (status === 'verde' || status === 'amarelo' || status === 'vermelho') && (
          <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.4, marginTop: 2 }}>{detalhe}</div>
        )}
      </div>
      {status === 'sem-plano' && (
        <button
          onClick={() => navigate('/planejamento', { state: { openQuiz: true } })}
          style={{
            background: '#1a56db', color: '#fff', border: 'none', borderRadius: 10,
            padding: '7px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >Começar →</button>
      )}
    </div>
  )
}
