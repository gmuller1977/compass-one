import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { ReceitaItem } from '../../pages/ResumoMensal'
import { NOMES_MESES_RM } from '../../pages/ResumoMensal'

const CORES_GRAFICO = ['#1a56db','#16a34a','#d97706','#7c3aed','#0891b2','#dc2626','#be185d','#ea580c','#4f46e5','#64748b']

type Props = {
  receitas: ReceitaItem[]
  totalPrevisto: number
  totalRecebido: number
  mes: number
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

export default function RmReceitas({ receitas, totalPrevisto, totalRecebido, mes, fmt }: Props) {
  const pct = totalPrevisto > 0 ? Math.min(100, Math.round((totalRecebido / totalPrevisto) * 100)) : 0

  const pieData = receitas
    .filter(r => r.realizado > 0)
    .map((r, i) => ({ name: r.nome, value: r.realizado, color: CORES_GRAFICO[i % CORES_GRAFICO.length] }))

  return (
    <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
      <SecaoHeader titulo={`💰 Receitas de ${NOMES_MESES_RM[mes]}`} />
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderTop: 0, borderRadius: '0 0 12px 12px', padding: 14 }}>

        {receitas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 13 }}>
            Nenhuma receita registrada para este mês.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>

            {/* Lista */}
            <div style={{ flex: 1, minWidth: 220 }}>
              {receitas.map(r => (
                <div key={r.catId} style={{
                  padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 7,
                  borderBottom: '1px solid #f1f5f9',
                  borderLeft: `3px solid ${r.recebido ? '#4ade80' : '#fbbf24'}`,
                  borderRadius: 4, marginBottom: 3,
                }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
                    {r.icone || '💰'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#1e293b' }}>{r.nome}</div>
                    <div style={{ fontSize: 8, color: r.recebido ? '#16a34a' : '#d97706', marginTop: 1 }}>
                      {r.recebido ? 'Recebido' : 'A receber'}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: r.recebido ? '#16a34a' : '#94a3b8', textAlign: 'right', minWidth: 70 }}>
                    {fmt(r.recebido ? r.realizado : r.previsto)}
                  </div>
                </div>
              ))}

              {/* Subtotal com barra */}
              <div style={{ padding: '8px 10px', background: '#f1f5f9', borderRadius: 7, marginTop: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#1e293b' }}>Total</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#16a34a' }}>{fmt(totalRecebido)}</span>
                </div>
                {totalPrevisto > 0 && (
                  <>
                    <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#1a56db', borderRadius: 3 }} />
                    </div>
                    <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 2 }}>{pct}% recebido do previsto ({fmt(totalPrevisto)})</div>
                  </>
                )}
              </div>
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
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{fmt(totalRecebido)}</div>
                    <div style={{ fontSize: 8, color: '#94a3b8' }}>recebido</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6, justifyContent: 'center' }}>
                  {pieData.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: '#64748b' }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                      {d.name} {totalRecebido > 0 ? `${Math.round((d.value / totalRecebido) * 100)}%` : ''}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
