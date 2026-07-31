import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function mesKey(conta: string, ano: number, mes: number) {
  return `${conta}-${ano}-${String(mes + 1).padStart(2, '0')}`
}

type Status = 'verde' | 'amarelo' | 'vermelho' | 'sem-plano' | 'sem-dados'

export default function CompassCard({ style }: { style?: React.CSSProperties }) {
  const navigate = useNavigate()
  const { contas, extratoData, planos } = useApp()
  const hoje = new Date()
  const ano  = hoje.getFullYear()
  const mes  = hoje.getMonth()

  const { status, sobrou, excedeu } = useMemo<{
    status: Status; sobrou: number; excedeu: number
  }>(() => {
    let realE = 0, realS = 0
    contas.forEach(conta => {
      const dados = extratoData[mesKey(conta.id, ano, mes)]
      if (!dados) return
      Object.values(dados.lancamentos).flat().forEach(l => {
        if (l.tipo === 'entrada') realE += l.valor
        else realS += l.valor
      })
    })

    if (realE === 0 && realS === 0) {
      return { status: 'sem-dados', sobrou: 0, excedeu: 0 }
    }

    const planoAno = planos[ano]
    const planS = planoAno
      ? (planoAno.saidas ?? []).reduce((s, cat) => s + (cat.v[mes] ?? 0), 0)
      : 0

    if (!planoAno || planS === 0) {
      return { status: 'sem-plano', sobrou: 0, excedeu: 0 }
    }

    const perc = realS / planS
    if (realS > planS) {
      return { status: 'vermelho', sobrou: 0, excedeu: realS - planS }
    } else if (perc >= 0.9) {
      return { status: 'amarelo', sobrou: 0, excedeu: 0 }
    } else {
      return { status: 'verde', sobrou: realE - realS, excedeu: 0 }
    }
  }, [contas, extratoData, planos, ano, mes])

  type Config = { bg: string; border: string; icon: string; iconBg: string; iconBorder: string; title: string; msg: string; cor: string }
  const configs: Record<Status, Config> = {
    verde: {
      bg: '#f0fdf4', border: '#86efac', icon: '🧭',
      iconBg: '#dcfce7', iconBorder: '#bbf7d0',
      title: 'Você está no caminho certo!',
      msg: `Sobrou ${fmt(sobrou)} este mês.`,
      cor: '#16a34a',
    },
    amarelo: {
      bg: '#fffbeb', border: '#fde68a', icon: '⚠️',
      iconBg: '#fef3c7', iconBorder: '#fde68a',
      title: 'Atenção!',
      msg: 'Seus gastos estão perto do limite planejado.',
      cor: '#d97706',
    },
    vermelho: {
      bg: '#fff1f2', border: '#fecdd3', icon: '🔴',
      iconBg: '#fee2e2', iconBorder: '#fecdd3',
      title: 'Fora do rumo.',
      msg: `Você gastou ${fmt(excedeu)} a mais do que o planejado.`,
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
      borderRadius: 16,
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
