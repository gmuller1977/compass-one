import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { DespesaItem } from '../../pages/ResumoMensal'
import { NOMES_MESES_RM } from '../../pages/ResumoMensal'

const CORES_GRAFICO = ['#dc2626','#16a34a','#1a56db','#7c3aed','#0891b2','#d97706','#4f46e5','#be185d','#ea580c','#94a3b8']

type Props = {
  despesas: DespesaItem[]
  totalPrevisto: number
  totalPago: number
  mes: number
  temPlanejamento: boolean
  fmt: (v: number) => string
}

function SecaoHeader({ titulo }: { titulo: string }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg,#7f1d1d,#b91c1c)',
      borderRadius: '12px 12px 0 0',
      padding: '11px 16px',
      color: '#fff',
    }}>
      <span style={{ fontSize: 12, fontWeight: 700 }}>{titulo}</span>
    </div>
  )
}

function bordaCor(previsto: number, realizado: number, temPlan: boolean) {
  if (!temPlan || previsto <= 0) return '#e2e8f0'
  return realizado > previsto ? '#f87171' : '#4ade80'
}

export default function RmDespesas({ despesas, totalPrevisto, totalPago, mes, temPlanejamento, fmt }: Props) {
  const [expandido, setExpandido] = useState(false)
  const visiveis = expandido ? despesas : despesas.slice(0, 6)
  const maxVal   = despesas[0]?.realizado || 1
  const pendente = Math.max(0, totalPrevisto - totalPago)

  // Agrupamento por grupo para donut
  const porGrupo: Record<string, number> = {}
  despesas.forEach(d => {
    if (d.realizado <= 0) return
    porGrupo[d.grupo] = (porGrupo[d.grupo] ?? 0) + d.realizado
  })
  const pieData = Object.entries(porGrupo)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({ name, value, color: CORES_GRAFICO[i % CORES_GRAFICO.length] }))

  return (
    <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
      <SecaoHeader titulo={`💸 Despesas de ${NOMES_MESES_RM[mes]}`} />
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderTop: 0, borderRadius: '0 0 12px 12px', padding: 14 }}>

        {despesas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 13 }}>
            Nenhuma despesa registrada para este mês.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {/* Lista */}
              <div style={{ flex: 1, minWidth: 220 }}>
                {visiveis.map(d => (
                  <div key={d.catId} style={{
                    padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 7,
                    borderBottom: '1px solid #f1f5f9',
                    borderLeft: `3px solid ${bordaCor(d.previsto, d.realizado, temPlanejamento)}`,
                    borderRadius: 4, marginBottom: 3,
                  }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
                      {d.icone || '💸'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nome}</div>
                      <div style={{ width: '100%', height: 4, background: '#e2e8f0', borderRadius: 2, marginTop: 3, overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(100, Math.round((d.realizado / maxVal) * 100))}%`,
                          height: '100%', background: d.cor || '#dc2626', borderRadius: 2,
                        }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', textAlign: 'right', minWidth: 70, flexShrink: 0 }}>
                      {fmt(d.realizado || d.previsto)}
                    </div>
                  </div>
                ))}

                {despesas.length > 6 && (
                  <button
                    onClick={() => setExpandido(e => !e)}
                    style={{
                      width: '100%', padding: '6px', marginTop: 4,
                      background: 'none', border: '1px solid #e2e8f0', borderRadius: 6,
                      fontSize: 11, color: '#64748b', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {expandido ? '▲ Ver menos' : `▼ Ver todas (${despesas.length})`}
                  </button>
                )}
              </div>

              {/* Donut */}
              {pieData.length > 0 && (
                <div style={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ position: 'relative', width: 180, height: 180 }}>
                    <ResponsiveContainer width={180} height={180}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx={88} cy={88}
                          innerRadius={55} outerRadius={82}
                          paddingAngle={2}
                          dataKey="value"
                          animationDuration={800}
                          stroke="none"
                        >
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => fmt(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{
                      position: 'absolute', top: '50%', left: '50%',
                      transform: 'translate(-50%,-50%)',
                      textAlign: 'center', pointerEvents: 'none',
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{fmt(totalPago)}</div>
                      <div style={{ fontSize: 8, color: '#94a3b8' }}>gasto</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6, justifyContent: 'center' }}>
                    {pieData.slice(0, 5).map((d, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: '#64748b' }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                        {d.name} {totalPago > 0 ? `${Math.round((d.value / totalPago) * 100)}%` : ''}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3 mini cards */}
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.3px' }}>Previsto</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 3, color: '#64748b' }}>
                  {temPlanejamento ? fmt(totalPrevisto) : '—'}
                </div>
                {!temPlanejamento && (
                  <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 2 }}>Crie um planejamento</div>
                )}
              </div>
              <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.3px' }}>Pago</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 3, color: '#dc2626' }}>{fmt(totalPago)}</div>
              </div>
              <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.3px' }}>Pendente</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 3, color: '#1a56db' }}>
                  {temPlanejamento ? fmt(pendente) : '—'}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
