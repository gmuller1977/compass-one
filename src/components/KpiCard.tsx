import type { ReactNode } from 'react'
import { RADAR_TRILHO_AZUL } from './acompanhamento/radarCores'

export interface KpiCardProps {
  icon?: string
  label: string
  value: string
  sublabel?: string
  valueColor?: string
  children?: ReactNode
  style?: React.CSSProperties
  /** Quando existe, o cartao vira botao e ganha a seta de expandir. */
  onClick?: () => void
  expandido?: boolean
}

const KPI_BG = 'linear-gradient(135deg,#0f2878,#1e40af)'
const KPI_BORDER = '1px solid rgba(255,255,255,.15)'
const LABEL_STYLE: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.6)',
  textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 6,
}
const VALUE_STYLE: React.CSSProperties = {
  fontSize: 18, fontWeight: 800, letterSpacing: '-.4px',
  fontVariantNumeric: 'tabular-nums', textAlign: 'right',
}
const SUBLABEL_STYLE: React.CSSProperties = {
  fontSize: 10, color: 'rgba(255,255,255,.5)', marginTop: 4, textAlign: 'right',
}

/**
 * Barra de progresso dentro de um KpiCard: realizado sobre o planejado.
 *
 * O MESMO desenho da barra do grupo no Radar — trilho escuro e borda branca —,
 * numa escala menor. O trilho claro de antes deixava o vermelho em 2,02 (e o
 * vermelho do grupo em 2,95) contra ele; o escuro dá 6,35 a 9,14, e a borda
 * branca (8,72 no azul) desenha os 100%. Elemento gráfico: vale 3:1.
 */
export function KpiBarra({ perc, cor }: { perc: number; cor: string }) {
  return (
    <div style={{
      marginTop: 6, height: 8, borderRadius: 4, overflow: 'hidden',
      background: RADAR_TRILHO_AZUL, border: '1px solid #fff', boxSizing: 'border-box',
    }}>
      <div style={{
        width: `${Math.max(0, Math.min(perc, 1)) * 100}%`, height: '100%',
        borderRadius: 4, background: cor, transition: 'width .3s',
      }} />
    </div>
  )
}

export default function KpiCard({
  icon, label, value, sublabel, valueColor = '#fff', children, style,
  onClick, expandido,
}: KpiCardProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-expanded={onClick ? !!expandido : undefined}
      onKeyDown={onClick ? e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() }
      } : undefined}
      style={{
        display: 'flex', flexDirection: 'column',
        background: KPI_BG, border: KPI_BORDER,
        borderRadius: 10, padding: '12px 16px',
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}>
      <div style={{ ...LABEL_STYLE, display: 'flex', justifyContent: 'space-between', gap: 6 }}>
        <span>{icon ? `${icon} ${label}` : label}</span>
        {onClick && <span aria-hidden>{expandido ? '▾' : '▸'}</span>}
      </div>
      <div style={{ ...VALUE_STYLE, color: valueColor }}>{value}</div>
      {sublabel && <div style={SUBLABEL_STYLE}>{sublabel}</div>}
      {children}
    </div>
  )
}
