import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

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

// ── Ícones SVG ────────────────────────────────────────────────────────────
function IcHome({ active }: { active: boolean }) {
  const c = active ? '#1a56db' : '#94a3b8'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}
function IcChart({ active }: { active: boolean }) {
  const c = active ? '#1a56db' : '#94a3b8'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6"  y1="20" x2="6"  y2="14"/>
    </svg>
  )
}
function IcPlus() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5"  y1="12" x2="19" y2="12"/>
    </svg>
  )
}
function IcCalendar({ active }: { active: boolean }) {
  const c = active ? '#1a56db' : '#94a3b8'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8"  y1="2" x2="8"  y2="6"/>
      <line x1="3"  y1="10" x2="21" y2="10"/>
    </svg>
  )
}
function IcGear({ active }: { active: boolean }) {
  const c = active ? '#1a56db' : '#94a3b8'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  )
}

// ── Itens de navegação ────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'Início',        path: '/dashboard'       },
  { label: 'Configurações', path: '/configuracoes'   },
  { label: 'Planejamento',  path: '/planejamento'    },
  { label: 'Lançamentos',   path: '/novo-lancamento' },
  { label: 'Evolução',      path: '/evolucao'        },
]

type TabDef =
  | { path: string; label: string; type: 'icon'; Icon: React.ComponentType<{ active: boolean }> }
  | { path: string; label: string; type: 'fab' }

const BOTTOM_TABS: TabDef[] = [
  { path: '/dashboard',       label: 'Início',  type: 'icon', Icon: IcHome     },
  { path: '/evolucao',        label: 'Evol.',   type: 'icon', Icon: IcChart    },
  { path: '/novo-lancamento', label: 'Lançar',  type: 'fab'                    },
  { path: '/planejamento',    label: 'Plano',   type: 'icon', Icon: IcCalendar },
  { path: '/configuracoes',   label: 'Config.', type: 'icon', Icon: IcGear     },
]

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

export default function AppHeader({ currentPath, hideBottomTab }: Props) {
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

  // ── MOBILE ──────────────────────────────────────────────────────────────
  if (isMobile) {
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
            onClick={() => navigate('/dashboard')}>
            <div style={{ width: 28, height: 28, borderRadius: 7,
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

        {/* Bottom tab bar */}
        {!hideBottomTab && <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
          background: '#fff',
          borderTop: '1px solid #e2e8f0',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.07)',
          display: 'flex',
          height: 60,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}>
          {BOTTOM_TABS.map(tab => {
            const active = currentPath === tab.path
            if (tab.type === 'fab') {
              return (
                <button key={tab.path}
                  onClick={() => navigate(tab.path)}
                  style={{
                    flex: 1, border: 'none', background: 'transparent',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', padding: 0,
                  }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: '50%',
                    background: active
                      ? 'linear-gradient(135deg,#1a40b8,#2563eb)'
                      : 'linear-gradient(135deg,#1a56db,#3b82f6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 3px 10px rgba(26,86,219,0.45)',
                    marginBottom: 2,
                  }}>
                    <IcPlus />
                  </div>
                </button>
              )
            }
            return (
              <button key={tab.path}
                onClick={() => navigate(tab.path)}
                style={{
                  flex: 1, border: 'none', background: 'transparent',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 3, padding: '8px 0 4px',
                  cursor: 'pointer', fontFamily: 'inherit',
                  position: 'relative',
                }}>
                {active && (
                  <div style={{
                    position: 'absolute', top: 0, left: '25%', right: '25%',
                    height: 2, borderRadius: 2, background: '#1a56db',
                  }} />
                )}
                <tab.Icon active={active} />
                <span style={{
                  fontSize: 10, lineHeight: 1,
                  fontWeight: active ? 600 : 400,
                  color: active ? '#1a56db' : '#94a3b8',
                }}>{tab.label}</span>
              </button>
            )
          })}
        </div>}
      </>
    )
  }

  // ── DESKTOP ──────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: 'linear-gradient(135deg,#0f2878,#2563eb)',
      padding: '16px 28px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          onClick={() => navigate('/dashboard')}>
          <div style={{ width: 32, height: 32, borderRadius: 8,
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CompassSvg size={16} />
          </div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>
            Compass <span style={{ fontWeight: 300, opacity: .75 }}>One</span>
          </span>
        </div>
        <nav style={{ display: 'flex', gap: 2 }}>
          {NAV_ITEMS.map(n => (
            <button key={n.path} onClick={() => navigate(n.path)} style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
              background: currentPath === n.path ? 'rgba(255,255,255,0.2)' : 'transparent',
              color:      currentPath === n.path ? '#fff' : 'rgba(255,255,255,0.6)',
            }}>
              {n.label}
            </button>
          ))}
        </nav>
      </div>
      {avatarEl}
    </div>
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
        background: hover ? (danger ? '#fff1f2' : '#f0f4ff') : 'transparent',
        transition: 'background .1s',
      }}>
      <span style={{ marginRight: 8, fontSize: 14 }}>{icon}</span>
      {label}
    </button>
  )
}
