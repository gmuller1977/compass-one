import type { ReactNode, CSSProperties } from 'react'
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

export const PH_BTN_WHITE: CSSProperties = {
  background: 'rgba(255,255,255,0.15)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '6px 14px',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
  lineHeight: 1.4,
}

export const PH_BTN_SOLID: CSSProperties = {
  background: '#fff',
  color: '#1a56db',
  border: 'none',
  borderRadius: 8,
  padding: '6px 14px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
  lineHeight: 1.4,
}

export const PH_BTN_WHITE_ACTIVE: CSSProperties = {
  ...PH_BTN_WHITE,
  background: 'rgba(255,255,255,0.28)',
  fontWeight: 600,
}

/**
 * Aba selecionada. Contraste forte de proposito: 0.15 vs 0.28 de branco sobre
 * o header azul e quase imperceptivel, e nao dava para saber em que aba se esta.
 */
export const PH_BTN_TAB_ATIVA: CSSProperties = {
  ...PH_BTN_WHITE,
  background: '#fff',
  color: '#1a56db',
  fontWeight: 700,
  boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
}

type Props = {
  icon: string
  breadcrumb?: string
  title: string
  subtitle?: string
  rightContent?: ReactNode
  mb?: number
}

export default function PageHeader({ icon, breadcrumb, title, subtitle, rightContent, mb = 20 }: Props) {
  const isMobile = useIsMobile()

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f2878, #1a56db)',
      borderRadius: 10,
      padding: isMobile ? '12px 16px' : '16px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: mb,
    }}>
      {/* Icon + text */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
        <div style={{
          width: isMobile ? 34 : 40,
          height: isMobile ? 34 : 40,
          borderRadius: 10,
          background: 'rgba(255,255,255,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <i className={`ti ${icon}`} style={{ color: '#fff', fontSize: isMobile ? 16 : 18 }} />
        </div>
        <div style={{ minWidth: 0 }}>
          {!isMobile && breadcrumb && (
            <div style={{
              fontSize: 10,
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '0.3px',
              textTransform: 'uppercase',
              marginBottom: 2,
              fontWeight: 500,
            }}>{breadcrumb}</div>
          )}
          <div style={{
            fontSize: isMobile ? 14 : 16,
            fontWeight: 500,
            color: '#ffffff',
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>{title}</div>
          {subtitle && (
            <div style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.6)',
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>{subtitle}</div>
          )}
        </div>
      </div>

      {/* Right content */}
      {rightContent && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {rightContent}
        </div>
      )}
    </div>
  )
}
