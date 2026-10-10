import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { COR } from '../utils/cores'

function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
}

/**
 * Barra de baixo do celular, Fase 3 do plano mobile: o que se usa todo dia na
 * frente, e o "+" no meio, que abre o lançamento rápido (/lancar). Plano e
 * Config — tarefas de sentar e pensar, mais do computador — foram para "Mais",
 * junto com Análises, o Simulador e a tela completa de Lançamentos.
 * Em 10/10/2026 o Norte (/norte) tomou o lugar de "Posso comprar?", escolha do
 * Guilherme; "Posso comprar?" segue como atalho na Início e no "Mais".
 */
const NAV = [
  { icon: '🏠', label: 'Início',   path: '/' },
  { icon: '📈', label: 'Radar',    path: '/radar' },
  null, // botão + flutuante
  { icon: '🧭', label: 'Norte',    path: '/norte' },
] as const

const MAIS = [
  { icon: '📊', label: 'Planejamento',          path: '/planejamento' },
  { icon: '📋', label: 'Lançamentos completos', path: '/novo-lancamento' },
  { icon: '🛒', label: 'Posso comprar?',        path: '/posso-comprar' },
  { icon: '🔍', label: 'Análises',              path: '/analises' },
  { icon: '🧮', label: 'Simulador',             path: '/simulacao' },
  { icon: '⚙️', label: 'Configurações',         path: '/configuracoes' },
]

export default function BottomNav() {
  const isMobile = useIsMobile()
  const navigate  = useNavigate()
  const { pathname } = useLocation()
  const [mais, setMais] = useState(false)

  if (!isMobile) return null

  const isActive = (path: string) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path)
  const maisAtivo = MAIS.some(m => isActive(m.path))

  const item = (key: string, icon: string, label: string, active: boolean, onClick: () => void) => (
    <button key={key} onClick={onClick} aria-current={active ? 'page' : undefined} style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 2, padding: '4px 0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
    }}>
      <span aria-hidden style={{ fontSize: 22 }}>{icon}</span>
      {/* Inativo em textoSuave (4,76:1 no branco): o #94a3b8 de antes dava 2,6.
          12 px, não 10: "letras pequenas" foi a queixa do redesenho do celular. */}
      <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? COR.azul : COR.textoSuave, whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {active && <span style={{ width: 4, height: 4, borderRadius: '50%', background: COR.azul, marginTop: 1 }} />}
    </button>
  )

  return (
    <>
      {mais && (
        <div role="dialog" aria-modal="true" aria-label="Mais opções" onClick={() => setMais(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 150, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', width: '100%', borderRadius: '20px 20px 0 0', padding: '10px 0 28px',
            fontFamily: "-apple-system,'Inter',sans-serif",
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: COR.borda, margin: '0 auto 8px' }} />
            {MAIS.map(m => (
              <button key={m.path} onClick={() => { setMais(false); navigate(m.path) }} style={{
                display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '13px 22px',
                border: 'none', background: isActive(m.path) ? '#eff6ff' : 'transparent', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 16, fontWeight: 600, color: COR.texto, textAlign: 'left', minHeight: 56,
              }}>
                <span aria-hidden style={{ width: 40, height: 40, borderRadius: '50%', background: '#eef3ff',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{m.icon}</span>{m.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid #eef2f8', boxShadow: '0 -4px 20px rgba(15,40,120,.06)',
        padding: '8px 0 calc(14px + env(safe-area-inset-bottom))',
        display: 'flex', zIndex: 100,
      }}>
        {NAV.map(n => {
          if (!n) {
            return (
              <div key="add" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <button
                  onClick={() => navigate('/lancar')}
                  aria-label="Lançar"
                  style={{
                    width: 58, height: 58, borderRadius: '50%',
                    background: 'linear-gradient(135deg,#1a56db,#2563eb)',
                    border: '3px solid #fff',
                    boxShadow: '0 4px 16px rgba(26,86,219,.4)',
                    marginTop: -30,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 32, fontWeight: 300,
                    cursor: 'pointer', flexShrink: 0,
                  }}
                >+</button>
              </div>
            )
          }
          return item(n.path, n.icon, n.label, isActive(n.path), () => navigate(n.path))
        })}
        {item('mais', '☰', 'Mais', maisAtivo, () => setMais(true))}
      </div>
    </>
  )
}
