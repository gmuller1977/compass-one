import { useState, useEffect } from 'react'

function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

type Props = {
  catNome: string
  previsto: number
  totalGasto: number
  valorAtual: number
  descricao: string
  mesLabel: string
  onRevisar: () => void
  onAjustarMes: (novoValor: number) => void
  onIgnorar: () => void
}

export default function AlertaOrcamento({ catNome, previsto, totalGasto, valorAtual, descricao, mesLabel, onRevisar, onAjustarMes, onIgnorar }: Props) {
  const isMobile = useIsMobile()
  const [ajustando, setAjustando] = useState(false)
  const [novoValor, setNovoValor] = useState(totalGasto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))

  const pct = previsto > 0 ? Math.round((totalGasto / previsto) * 100) : 0
  const ultrapassou = totalGasto - previsto

  const barColor = pct <= 80 ? '#16a34a' : pct <= 100 ? '#d97706' : '#dc2626'
  const barWidth = Math.min(pct, 140)

  const progresso = (
    <div style={{ background: '#f8faff', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: 14, marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 3 }}>Planejado</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#1a56db', letterSpacing: '-.3px' }}>{fmt(previsto)}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 3 }}>Gasto até agora</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#dc2626', letterSpacing: '-.3px' }}>{fmt(totalGasto)}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 3 }}>Ultrapassou</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#dc2626', letterSpacing: '-.3px' }}>+{fmt(ultrapassou)}</div>
        </div>
      </div>
      <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
        <div style={{ height: '100%', width: `${Math.min(barWidth, 100)}%`, background: `linear-gradient(90deg, #16a34a, ${barColor})`, borderRadius: 4 }} />
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, textAlign: 'right', color: barColor }}>{pct}% do planejado {pct > 100 ? '⚠' : ''}</div>
    </div>
  )

  const lancAtual = (
    <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 12, padding: '12px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 20 }}>💸</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>Lançamento atual</div>
        <div style={{ fontSize: 11, color: '#b45309', marginTop: 2 }}>{descricao} · {mesLabel}</div>
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#dc2626' }}>-{fmt(valorAtual)}</div>
    </div>
  )

  const ajusteField = ajustando && (
    <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600, marginBottom: 8 }}>Novo valor planejado para {catNome} em {mesLabel}:</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={novoValor}
          onChange={e => setNovoValor(e.target.value)}
          style={{ flex: 1, padding: '8px 12px', border: '1.5px solid #d97706', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', textAlign: 'right', background: '#fff' }}
          autoFocus
        />
        <button
          onClick={() => {
            const val = parseFloat(novoValor.replace(/[R$\s.]/g, '').replace(',', '.')) || 0
            onAjustarMes(val)
          }}
          style={{ padding: '8px 16px', border: 'none', borderRadius: 8, background: '#d97706', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          Salvar
        </button>
        <button
          onClick={() => setAjustando(false)}
          style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#64748b', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,.5)', zIndex: 1000, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '20px 20px 32px' }}>
          <div style={{ width: 36, height: 4, background: '#e2e8f0', borderRadius: 2, margin: '0 auto 16px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: '#fff7ed', border: '2px solid #fed7aa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>⚠️</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>Categoria no limite!</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{catNome} · {mesLabel}</div>
            </div>
          </div>
          {progresso}
          {lancAtual}
          {ajusteField}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={onRevisar} style={{ padding: 13, border: 'none', borderRadius: 12, background: 'linear-gradient(135deg,#1a56db,#2563eb)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(26,86,219,.3)' }}>
              Revisar planejamento →
            </button>
            {!ajustando && (
              <button onClick={() => setAjustando(true)} style={{ padding: 11, border: '1.5px solid #fde68a', borderRadius: 12, background: '#fffbeb', color: '#92400e', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Ajustar só este mês
              </button>
            )}
            <button onClick={onIgnorar} style={{ padding: 11, border: '1.5px solid #e2e8f0', borderRadius: 12, background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Ignorar
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Web: modal centralizado
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 20, width: 480, maxWidth: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.2)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: '#fff7ed', border: '2px solid #fed7aa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>⚠️</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Categoria no limite!</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{catNome} · {mesLabel}</div>
          </div>
          <button onClick={onIgnorar} style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 14, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
        <div style={{ padding: '20px 24px' }}>
          {progresso}
          {lancAtual}
          {ajusteField}
        </div>
        <div style={{ padding: '16px 24px', background: '#f8faff', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10 }}>
          <button onClick={onRevisar} style={{ flex: 2, padding: 12, border: 'none', borderRadius: 10, background: 'linear-gradient(135deg,#1a56db,#2563eb)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Revisar planejamento
          </button>
          {!ajustando && (
            <button onClick={() => setAjustando(true)} style={{ flex: 1, padding: 12, border: '1.5px solid #fde68a', borderRadius: 10, background: '#fffbeb', color: '#92400e', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Ajustar mês
            </button>
          )}
          <button onClick={onIgnorar} style={{ flex: 1, padding: 12, border: '1.5px solid #e2e8f0', borderRadius: 10, background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Ignorar
          </button>
        </div>
      </div>
    </div>
  )
}
