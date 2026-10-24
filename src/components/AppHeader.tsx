import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from './BottomNav'

// ── Breakpoint ────────────────────────────────────────────────────────────
function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
}

// ── Logo SVG ──────────────────────────────────────────────────────────────
function CompassSvg({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="1.5"/>
      <polygon points="10,3 11.2,9.4 10,8.5 8.8,9.4" fill="white"/>
      <polygon points="10,17 8.8,10.6 10,11.5 11.2,10.6" fill="white" opacity=".5"/>
    </svg>
  )
}

// ── Componente principal ──────────────────────────────────────────────────
type Props = { currentPath: string; hideBottomTab?: boolean }

export default function AppHeader({ hideBottomTab }: Props) {
  const navigate       = useNavigate()
  const isMobile = useIsMobile()

  // Desktop nav is handled by Sidebar — nothing to render here
  if (!isMobile) return null

  // ── MOBILE ──────────────────────────────────────────────────────────────
  return (
      <>
        {/* Top bar compacta */}
        <div style={{
          background: 'var(--cx-azul)',
          padding: '0 16px',
          height: 52,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
            onClick={() => navigate('/')}>
            <div style={{ width: 28, height: 28, borderRadius: 8,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CompassSvg size={14} />
            </div>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>
              Compass <span style={{ fontWeight: 300, opacity: .75 }}>One</span>
            </span>
          </div>
        </div>

        {/* Barra de baixo: a MESMA do resto do celular (Início · Radar · + ·
            Norte · Mais). A antiga desta tela levava a /dashboard, a Início do
            computador, e a Lançamentos completos no lugar do lançamento rápido. */}
        {!hideBottomTab && <BottomNav />}
      </>
  )
}
