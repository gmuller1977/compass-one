import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const NAV_ITEMS = [
  { label: 'Dashboard',       path: '/dashboard' },
  { label: 'Configurações',   path: '/configuracoes' },
  { label: 'Planejamento',    path: '/planejamento' },
  { label: 'Lançamentos',     path: '/novo-lancamento' },
  { label: 'Acompanhamento',  path: '/acompanhamento' },
]

type Props = { currentPath: string }

export default function AppHeader({ currentPath }: Props) {
  const navigate  = useNavigate()
  const { sairDaConta } = useApp()
  const [dropdown, setDropdown] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dropdown) return
    function onOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setDropdown(false)
    }
    document.addEventListener('mousedown', onOutsideClick)
    return () => document.removeEventListener('mousedown', onOutsideClick)
  }, [dropdown])

  return (
    <div style={{
      background: 'linear-gradient(135deg,#0f2878,#2563eb)',
      padding: '16px 28px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexShrink: 0,
    }}>
      {/* Logo + Nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          onClick={() => navigate('/dashboard')}>
          <div style={{ width: 32, height: 32, borderRadius: 8,
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="1.5"/>
              <polygon points="10,3 11.2,9.4 10,8.5 8.8,9.4" fill="white"/>
              <polygon points="10,17 8.8,10.6 10,11.5 11.2,10.6" fill="white" opacity=".5"/>
            </svg>
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

      {/* Avatar G + dropdown */}
      <div ref={ref} style={{ position: 'relative' }}>
        <div onClick={() => setDropdown(d => !d)} style={{
          width: 34, height: 34, borderRadius: '50%', cursor: 'pointer',
          background: dropdown ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.15)',
          border: dropdown ? '1.5px solid rgba(255,255,255,0.55)' : '1.5px solid transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 14, fontWeight: 700,
          transition: 'all .15s',
        }}>
          G
        </div>

        {dropdown && (
          <div style={{
            position: 'absolute', top: 42, right: 0, zIndex: 200,
            background: '#fff', borderRadius: 12,
            boxShadow: '0 8px 32px rgba(15,40,120,0.18)',
            border: '1px solid #e2e8f0',
            minWidth: 190, paddingTop: 6, paddingBottom: 6,
          }}>
            <MenuItem
              icon="👤"
              label="Perfil"
              onClick={() => { setDropdown(false); navigate('/configuracoes', { state: { aba: 'perfil' } }) }}
            />
            <MenuItem
              icon="⚙"
              label="Preferências"
              onClick={() => { setDropdown(false); navigate('/configuracoes', { state: { aba: 'preferencias' } }) }}
            />
            <div style={{ height: 1, background: '#e2e8f0', margin: '4px 8px' }} />
            <MenuItem
              icon="⏻"
              label="Logout"
              danger
              onClick={() => { setDropdown(false); sairDaConta() }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function MenuItem({
  icon, label, onClick, danger = false,
}: { icon: string; label: string; onClick: () => void; danger?: boolean }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: '9px 16px', border: 'none', cursor: 'pointer',
        fontSize: 13, fontWeight: danger ? 600 : 500,
        color: danger ? '#dc2626' : '#0f172a',
        fontFamily: 'inherit',
        background: hover ? (danger ? '#fff1f2' : '#f0f4ff') : 'transparent',
        transition: 'background .1s',
      }}>
      <span style={{ marginRight: 8, fontSize: 14 }}>{icon}</span>
      {label}
    </button>
  )
}
