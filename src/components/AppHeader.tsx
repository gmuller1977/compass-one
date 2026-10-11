import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
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
  const { sairDaConta } = useApp()
  const [dropdown, setDropdown] = useState(false)
  const ref     = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!dropdown) return
    function onOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setDropdown(false)
    }
    document.addEventListener('mousedown', onOut)
    return () => document.removeEventListener('mousedown', onOut)
  }, [dropdown])

  // Avatar comum nos dois layouts
  const avatarEl = (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => setDropdown(d => !d)} style={{
        width: 34, height: 34, borderRadius: '50%', cursor: 'pointer',
        background: dropdown ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.15)',
        border: `1.5px solid ${dropdown ? 'rgba(255,255,255,0.55)' : 'transparent'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 14, fontWeight: 700, transition: 'all .15s',
      }}>G</div>
      {dropdown && (
        <div style={{
          position: 'absolute', top: 42, right: 0, zIndex: 300,
          background: '#fff', borderRadius: 12,
          boxShadow: '0 8px 32px rgba(15,40,120,0.18)',
          border: '1px solid #e2e8f0',
          minWidth: 190, paddingTop: 6, paddingBottom: 6,
        }}>
          <MenuItem icon="⏻" label="Logout" danger
            onClick={() => { setDropdown(false); sairDaConta() }} />
        </div>
      )}
    </div>
  )

  // Desktop nav is handled by Sidebar — nothing to render here
  if (!isMobile) return null

  // ── MOBILE ──────────────────────────────────────────────────────────────
  return (
      <>
        {/* Top bar compacta */}
        <div style={{
          background: 'linear-gradient(135deg,#0f2878,#2563eb)',
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
          {avatarEl}
        </div>

        {/* Barra de baixo: a MESMA do resto do celular (Início · Radar · + ·
            Norte · Mais). A antiga desta tela levava a /dashboard, a Início do
            computador, e a Lançamentos completos no lugar do lançamento rápido. */}
        {!hideBottomTab && <BottomNav />}
      </>
  )
}

// ── MenuItem do dropdown ─────────────────────────────────────────────────
function MenuItem({ icon, label, onClick, danger = false }:
  { icon: string; label: string; onClick: () => void; danger?: boolean }) {
  const [hover, setHover] = useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: '9px 16px', border: 'none', cursor: 'pointer',
        fontSize: 13, fontWeight: danger ? 600 : 500,
        color: danger ? '#dc2626' : '#0f172a', fontFamily: 'inherit',
        background: hover ? (danger ? '#fff1f2' : '#f8faff') : 'transparent',
        transition: 'background .1s',
      }}>
      <span style={{ marginRight: 8, fontSize: 14 }}>{icon}</span>
      {label}
    </button>
  )
}
