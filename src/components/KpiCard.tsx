import type { ReactNode } from 'react'

export interface KpiCardProps {
  icon?: string
  label: string
  value: string
  sublabel?: string
  valueColor?: string
  children?: ReactNode
  style?: React.CSSProperties
}

const KPI_BG = 'linear-gradient(135deg,#0f2878,#1a56db)'
const KPI_BORDER = '1px solid rgba(255,255,255,.15)'
const LABEL_STYLE: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.6)',
  textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 6,
}
const VALUE_STYLE: React.CSSProperties = {
  fontSize: 18, fontWeight: 800, letterSpacing: '-.4px',
  fontVariantNumeric: 'tabular-nums',
}
const SUBLABEL_STYLE: React.CSSProperties = {
  fontSize: 10, color: 'rgba(255,255,255,.5)', marginTop: 4,
}

export default function KpiCard({
  icon, label, value, sublabel, valueColor = '#fff', children, style,
}: KpiCardProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      background: KPI_BG, border: KPI_BORDER,
      borderRadius: 10, padding: '12px 16px',
      ...style,
    }}>
      <div style={LABEL_STYLE}>{icon ? `${icon} ${label}` : label}</div>
      <div style={{ ...VALUE_STYLE, color: valueColor }}>{value}</div>
      {sublabel && <div style={SUBLABEL_STYLE}>{sublabel}</div>}
      {children}
    </div>
  )
}
