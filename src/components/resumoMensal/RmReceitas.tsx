import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { ReceitaItem } from '../../pages/ResumoMensal'
import { NOMES_MESES_RM } from '../../pages/ResumoMensal'

const CORES_GRAFICO = ['#1a56db','#16a34a','#b45309','#7c3aed','#0891b2','#dc2626','#be185d','#ea580c','#4f46e5','#64748b']

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
      padding: '13px 20px',
      color: '#fff',
    }}>
      <span style={{ fontSize: 14, fontWeight: 700 }}>{titulo}</span>
    </div>
  )
}

export default function RmReceitas({ receitas, totalPrevisto, totalRecebido, mes, fmt }: Props) {
  const pct = totalPrevisto > 0 ? Math.min(100, Math.round((totalRecebido / totalPrevisto) * 100)) : 0

  const pieData = receitas
    .filter(r => r.realizado > 0)
    .map((r, i) => ({
      name: r.variante ? `${r.nome} · ${r.variante}` : r.nome,
      value: r.realizado,
      color: CORES_GRAFICO[i % CORES_GRAFICO.length],
    }))

  return (
    <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
      <SecaoHeader titulo={`💰 Receitas de ${NOMES_MESES_RM[mes]}`} />
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderTop: 0, borderRadius: '0 0 12px 12px', padding: 20 }}>

        {receitas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 14 }}>
            Nenhuma receita registrada para este mês.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>

            {/* Lista */}
            <div style={{ flex: 1, minWidth: 240 }}>
              {receitas.map(r => (
                <div key={r.catId} style={{
                  padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
                  borderBottom: '1px solid #f1f5f9',
                  borderLeft: `3px solid ${r.recebido ? '#4ade80' : '#fbbf24'}`,
                  borderRadius: 4, marginBottom: 4,
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    {r.icone || '💰'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#0f172a' }}>
                      {r.nome}{r.variante ? <span style={{ color: '#64748b', fontWeight: 400 }}> · {r.variante}</span> : null}
                    </div>
                    <div style={{ fontSize: 10, color: r.recebido ? '#16a34a' : '#b45309', marginTop: 1 }}>
                      {r.recebido ? 'Recebido' : 'A receber'}
                    </div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: r.recebido ? '#16a34a' : '#94a3b8', textAlign: 'right', minWidth: 90 }}>
                    {fmt(r.recebido ? r.realizado : r.previsto)}
                  </div>
                </div>
              ))}

              {/* Subtotal com barra */}
              <div style={{ padding: '10px 16px', background: '#f1f5f9', borderRadius: 8, marginTop: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Total</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#16a34a' }}>{fmt(totalRecebido)}</span>
                </div>
                {totalPrevisto > 0 && (
                  <>
                    <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#1a56db', borderRadius: 3 }} />
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>{pct}% recebido do previsto ({fmt(totalPrevisto)})</div>
                  </>
                )}
              </div>
            </div>

            {/* Donut */}
            {pieData.length > 0 && (
              <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'relative', width: 240, height: 240 }}>
                  <ResponsiveContainer width={240} height={240}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx={118} cy={118}
                        innerRadius={72} outerRadius={108}
                        paddingAngle={2}
                        dataKey="value"
                        animationDuration={800}
                        stroke="none"
                      >
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => fmt(Number(v))} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%,-50%)',
                    textAlign: 'center', pointerEvents: 'none',
                  }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{fmt(totalRecebido)}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>recebido</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8, justifyContent: 'center' }}>
                  {pieData.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
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
