import { useNavigate } from 'react-router-dom'
import BottomNav from './BottomNav'
import { useLarguraMenorQue } from '../utils/larguraTela'
import { LogoCompass } from './LogoCompass'

// ── Breakpoint ────────────────────────────────────────────────────────────
function useIsMobile() {
  return useLarguraMenorQue(640)
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
              <LogoCompass size={20} />
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
