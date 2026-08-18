import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { DespesaItem } from '../../pages/ResumoMensal'

const CORES_GRUPOS: Record<string, string> = {
  'Moradia': '#dc2626',
  'Alimentação': '#16a34a',
  'Transporte': '#1a56db',
  'Lazer': '#7c3aed',
  'Saúde': '#0891b2',
  'Educação': '#d97706',
  'Tecnologia': '#4f46e5',
  'Pet': '#be185d',
  'Vestuário': '#ea580c',
  'Outros': '#94a3b8',
}

const CORES_FALLBACK = ['#dc2626','#16a34a','#1a56db','#7c3aed','#0891b2','#d97706','#4f46e5','#be185d','#ea580c','#94a3b8']

function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
}

type Props = {
  despesas: DespesaItem[]
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

export default function RmDistribuicao({ despesas, fmt }: Props) {
  const isMobile = useIsMobile()

  const porGrupo: Record<string, number> = {}
  despesas.forEach(d => {
    if (d.realizado <= 0) return
    porGrupo[d.grupo] = (porGrupo[d.grupo] ?? 0) + d.realizado
  })

  const dados = Object.entries(porGrupo)
    .sort((a, b) => b[1] - a[1])
    .map(([nome, valor], i) => ({
      nome, valor,
      cor: CORES_GRUPOS[nome] ?? CORES_FALLBACK[i % CORES_FALLBACK.length],
    }))

  const total = dados.reduce((s, d) => s + d.valor, 0)
  const size  = isMobile ? 180 : 220
  const inner = isMobile ? 55 : 65
  const outer = isMobile ? 83 : 95

  return (
    <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
      <SecaoHeader titulo="💸 Para onde foi seu dinheiro" />
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderTop: 0, borderRadius: '0 0 12px 12px', padding: 20 }}>

        {dados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 13 }}>
            Nenhuma despesa registrada para este mês.
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'center',
            gap: 24,
            justifyContent: 'center',
          }}>
            {/* Donut */}
            <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
              <ResponsiveContainer width={size} height={size}>
                <PieChart>
                  <Pie
                    data={dados}
                    cx={size / 2 - 2}
                    cy={size / 2 - 2}
                    innerRadius={inner}
                    outerRadius={outer}
                    paddingAngle={2}
                    dataKey="valor"
                    animationDuration={800}
                    stroke="none"
                  >
                    {dados.map((entry, i) => <Cell key={i} fill={entry.cor} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%,-50%)',
                textAlign: 'center', pointerEvents: 'none',
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{fmt(total)}</div>
                <div style={{ fontSize: 8, color: '#94a3b8' }}>total gasto</div>
              </div>
            </div>

            {/* Legenda */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {dados.map(d => (
                <div key={d.nome} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.cor, flexShrink: 0 }} />
                  <b style={{ color: '#1e293b', minWidth: 80 }}>{d.nome}</b>
                  <span style={{ color: '#475569' }}>{fmt(d.valor)}</span>
                  <span style={{ color: '#94a3b8' }}>({total > 0 ? Math.round((d.valor / total) * 100) : 0}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
