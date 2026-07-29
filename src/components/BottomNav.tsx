import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
}

const NAV = [
  { icon: '⚡', label: 'Início',   path: '/' },
  { icon: '📈', label: 'Acomp.',   path: '/acompanhamento' },
  null, // floating + button
  { icon: '📊', label: 'Plano',    path: '/planejamento' },
  { icon: '⚙️', label: 'Config',   path: '/configuracoes' },
]

export default function BottomNav() {
  const isMobile = useIsMobile()
  const navigate  = useNavigate()
  const { pathname } = useLocation()

  if (!isMobile) return null

  const isActive = (path: string) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path)

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#fff', borderTop: '1px solid #e2e8f0',
      padding: '8px 0 20px',
      display: 'flex', zIndex: 100,
    }}>
      {NAV.map((item, i) => {
        if (!item) {
          return (
            <div key="add" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <button
                onClick={() => navigate('/novo-lancamento')}
                style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#1a56db,#2563eb)',
                  border: '3px solid #fff',
                  boxShadow: '0 4px 16px rgba(26,86,219,.4)',
                  marginTop: -26,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 28, fontWeight: 300,
                  cursor: 'pointer', flexShrink: 0,
                }}
              >+</button>
            </div>
          )
        }
        const active = isActive(item.path)
        return (
          <button
            key={i}
            onClick={() => navigate(item.path)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 2, padding: '4px 0', background: 'none', border: 'none', cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{ fontSize: 9, fontWeight: active ? 700 : 500, color: active ? '#1a56db' : '#94a3b8' }}>
              {item.label}
            </span>
            {active && <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#1a56db', marginTop: 1 }} />}
          </button>
        )
      })}
    </div>
  )
}
