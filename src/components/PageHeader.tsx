import type { ReactNode, CSSProperties } from 'react'
import { useState, useEffect } from 'react'
import AjudaTela from './AjudaTela'
import type { TelaAjuda } from '../utils/ajudaDasTelas'

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
  /** Mostra o "?" com a ajuda da tela (utils/ajudaDasTelas). */
  ajuda?: TelaAjuda
}

export default function PageHeader({ icon, breadcrumb, title, subtitle, rightContent, mb = 20, ajuda }: Props) {
  const isMobile = useIsMobile()

  return (
    <div style={{
      // O topo azul do celular (12/10/2026: "a mesma identidade para os
      // dois"): gradiente até #1e40af, cantos de 20 e sombra azulada.
      background: 'linear-gradient(160deg, #0f2878 0%, #1e40af 100%)',
      borderRadius: 20,
      boxShadow: '0 2px 14px rgba(15,40,120,.12)',
      padding: isMobile ? '14px 16px' : '18px 22px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: mb,
    }}>
      {/* Icon + text */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
        <div style={{
          width: isMobile ? 38 : 44,
          height: isMobile ? 38 : 44,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.14)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <i className={`ti ${icon}`} style={{ color: '#fff', fontSize: isMobile ? 18 : 20 }} />
        </div>
        <div style={{ minWidth: 0 }}>
          {!isMobile && breadcrumb && (
            <div style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.75)',
              letterSpacing: '0.3px',
              textTransform: 'uppercase',
              marginBottom: 2,
              fontWeight: 500,
            }}>{breadcrumb}</div>
          )}
          <div style={{
            fontSize: isMobile ? 17 : 20,
            fontWeight: 700,
            color: '#ffffff',
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>{title}</div>
          {subtitle && (
            <div style={{
              fontSize: isMobile ? 13 : 14,
              color: 'rgba(255,255,255,0.75)',
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>{subtitle}</div>
          )}
        </div>
      </div>

      {/* Right content */}
      {(rightContent || ajuda) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {rightContent}
          {ajuda && <AjudaTela tela={ajuda} />}
        </div>
      )}
    </div>
  )
}
