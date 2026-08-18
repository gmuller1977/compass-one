import type { TotaisMes } from '../../pages/ResumoMensal'
import { NOMES_MESES_RM, MESES_CURTOS_RM } from '../../pages/ResumoMensal'

type Props = {
  atual: TotaisMes
  anterior: TotaisMes | null
  mesAtual: number
  mesAnterior: number
  fmt: (v: number) => string
}

function SecaoHeader({ titulo }: { titulo: string }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg,#0f2878,#1a56db)',
      borderRadius: '12px 12px 0 0',
      padding: '11px 16px',
      color: '#fff',
    }}>
      <span style={{ fontSize: 12, fontWeight: 700 }}>{titulo}</span>
    </div>
  )
}

function variacao(atual: number, anterior: number) {
  if (anterior === 0) return null
  return ((atual - anterior) / anterior) * 100
}

function pillCor(tipo: string, v: number) {
  if (tipo === 'despesas') return v <= 0 ? { bg: '#f0fdf4', color: '#16a34a' } : { bg: '#fef2f2', color: '#dc2626' }
  return v >= 0 ? { bg: '#f0fdf4', color: '#16a34a' } : { bg: '#fef2f2', color: '#dc2626' }
}

type Grupo = { label: string; tipo: string; atual: number; anterior: number }

export default function RmComparativo({ atual, anterior, mesAtual, mesAnterior, fmt }: Props) {
  const titulo = `📈 ${NOMES_MESES_RM[mesAtual]} vs ${NOMES_MESES_RM[mesAnterior]}`

  const grupos: Grupo[] = [
    { label: 'Receitas', tipo: 'receitas', atual: atual.receitas, anterior: anterior?.receitas ?? 0 },
    { label: 'Despesas', tipo: 'despesas', atual: atual.despesas, anterior: anterior?.despesas ?? 0 },
    { label: 'Resultado', tipo: 'resultado', atual: atual.resultado, anterior: anterior?.resultado ?? 0 },
  ]

  const maxValor = Math.max(...grupos.map(g => Math.max(g.atual, g.anterior))) || 1

  return (
    <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
      <SecaoHeader titulo={titulo} />
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderTop: 0, borderRadius: '0 0 12px 12px', padding: 14 }}>

        {!anterior ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>
            Comparativo disponível a partir do segundo mês de uso.
          </div>
        ) : (
          <>
            {grupos.map(g => {
              const v = variacao(g.atual, g.anterior)
              const wAtual = Math.round((g.atual / maxValor) * 100)
              const wAnt   = Math.round((g.anterior / maxValor) * 100)

              const corAtual = g.tipo === 'despesas' ? '#dc2626' : g.tipo === 'resultado' ? '#16a34a' : '#1a56db'
              const corAnt   = '#cbd5e1'

              return (
                <div key={g.tipo} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3, fontWeight: 600 }}>{g.label}</div>
                  {/* Barra atual */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <div style={{ fontSize: 8, width: 24, color: '#94a3b8', flexShrink: 0 }}>{MESES_CURTOS_RM[mesAtual]}</div>
                    <div style={{ flex: 1, height: 16, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        width: `${wAtual}%`, height: '100%', background: corAtual,
                        borderRadius: 3, display: 'flex', alignItems: 'center', paddingLeft: 6,
                        fontSize: 9, fontWeight: 600, color: '#fff',
                        minWidth: g.atual > 0 ? 40 : 0,
                      }}>
                        {g.atual > 0 ? fmt(g.atual) : ''}
                      </div>
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 600, minWidth: 80, textAlign: 'right', color: corAtual }}>
                      {fmt(g.atual)}
                    </div>
                  </div>
                  {/* Barra anterior */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontSize: 8, width: 24, color: '#94a3b8', flexShrink: 0 }}>{MESES_CURTOS_RM[mesAnterior]}</div>
                    <div style={{ flex: 1, height: 16, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        width: `${wAnt}%`, height: '100%', background: corAnt,
                        borderRadius: 3, display: 'flex', alignItems: 'center', paddingLeft: 6,
                        fontSize: 9, fontWeight: 600, color: '#64748b',
                        minWidth: g.anterior > 0 ? 40 : 0,
                      }}>
                        {g.anterior > 0 ? fmt(g.anterior) : ''}
                      </div>
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 600, minWidth: 80, textAlign: 'right', color: '#94a3b8' }}>
                      {fmt(g.anterior)}
                    </div>
                  </div>

                  {v !== null && (
                    <div style={{ marginTop: 3 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 2,
                        fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 8,
                        background: pillCor(g.tipo, v).bg,
                        color: pillCor(g.tipo, v).color,
                      }}>
                        {v >= 0 ? `+${v.toFixed(1)}%` : `${v.toFixed(1)}%`} {v >= 0 ? '↑' : '↓'}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
