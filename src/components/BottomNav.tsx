import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { COR } from '../utils/cores'
import { useSeloNorte } from './norte/useSeloNorte'
import { NORTE_ATIVO } from '../utils/norteAtivo'
import { BOLINHA_AZUL } from './mobile/estilo'

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
 * junto com a Revisão mensal, o Simulador e a tela completa de Lançamentos.
 * Em 18/10/2026, pedido do Guilherme: Início · Lançamentos · + · Radar ·
 * Plano, sem "Mais": as outras telas (Simulador, Revisão, Configurações)
 * abrem ARRASTANDO a barra para cima, como no Android (pedido dele). O
 * tracinho em cima da barra também abre, para quem toca em vez de arrastar.
 * Arrastar a folha para baixo fecha.
 */
const NAV = [
  { icon: 'ti-home', label: 'Início',   path: '/' },
  { icon: 'ti-list-details', label: 'Lançamentos', path: '/novo-lancamento' },
  null, // botão + flutuante
  { icon: 'ti-radar-2', label: 'Radar',    path: '/radar' },
  { icon: 'ti-calendar-stats', label: 'Plano', path: '/planejamento' },
]

const MAIS = [
  ...(NORTE_ATIVO ? [{ icon: 'ti-compass', label: 'Norte', path: '/norte' }] : []),
  { icon: 'ti-calculator', label: 'Simulador',             path: '/simulacao' },
  { icon: 'ti-refresh', label: 'Revisão mensal',        path: '/revisaomensal' },
  { icon: 'ti-settings', label: 'Configurações',         path: '/configuracoes' },
  { icon: 'ti-gift', label: 'Indicar amigos',        path: '/indicar' },
]

export default function BottomNav() {
  const isMobile = useIsMobile()
  const navigate  = useNavigate()
  const { pathname } = useLocation()
  const [mais, setMais] = useState(false)
  const toqueY = useRef<number | null>(null)
  const inicioToque = (e: React.TouchEvent) => { toqueY.current = e.touches[0].clientY }
  const fimToque = (abrir: boolean) => (e: React.TouchEvent) => {
    if (toqueY.current == null) return
    const dy = e.changedTouches[0].clientY - toqueY.current
    toqueY.current = null
    if (abrir && dy < -30) setMais(true)
    if (!abrir && dy > 40) setMais(false)
  }
  // Fase C do Norte: avisos importantes de hoje ainda não vistos. Na própria
  // tela do Norte o selo não aparece — ela marca tudo como visto ao abrir.
  const selo = useSeloNorte(NORTE_ATIVO && isMobile && !pathname.startsWith('/norte'))

  if (!isMobile) return null

  const isActive = (path: string) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path)
  const maisAtivo = MAIS.some(m => isActive(m.path))

  const item = (key: string, icon: string, label: string, active: boolean, onClick: () => void, badge = 0) => (
    <button key={key} onClick={onClick} aria-current={active ? 'page' : undefined}
      aria-label={badge ? `${label}, ${badge} ${badge === 1 ? 'aviso novo' : 'avisos novos'}` : undefined} style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 2, padding: '4px 0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
    }}>
      {/* Ícone desenhado (Tabler), na cor do rótulo: azul ativo, textoSuave
          inativo (4,76:1 no branco). Pedido do Guilherme em 13/10/2026. */}
      <span aria-hidden style={{ fontSize: 24, lineHeight: 1, position: 'relative', color: active ? COR.azul : COR.textoSuave }}>
        <i className={`ti ${icon}`} />
        {badge > 0 && (
          // Branco sobre #b91c1c: 6,47:1.
          <span style={{ position: 'absolute', top: -4, right: -10, minWidth: 18, height: 18, padding: '0 5px', boxSizing: 'border-box',
            borderRadius: 9, background: '#b91c1c', color: '#fff', fontSize: 12, fontWeight: 800, lineHeight: '18px',
            textAlign: 'center', border: '2px solid #fff' }}>{badge}</span>
        )}
      </span>
      {/* Inativo em textoSuave (4,76:1 no branco): o #94a3b8 de antes dava 2,6.
          12 px, não 10: "letras pequenas" foi a queixa do redesenho do celular. */}
      <span style={{ fontSize: 12, letterSpacing: -0.2, fontWeight: active ? 700 : 500, color: active ? COR.azul : COR.textoSuave, whiteSpace: 'nowrap' }}>
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
          <div onClick={e => e.stopPropagation()} onTouchStart={inicioToque} onTouchEnd={fimToque(false)} style={{
            background: '#fff', width: '100%', borderRadius: '20px 20px 0 0', padding: '10px 0 28px',
            animation: 'slideUp .2s ease',
            fontFamily: "-apple-system,'Inter',sans-serif",
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: COR.borda, margin: '0 auto 8px' }} />
            {MAIS.map(m => (
              <button key={m.path} onClick={() => { setMais(false); navigate(m.path) }} style={{
                display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '13px 22px',
                border: 'none', background: isActive(m.path) ? '#eff6ff' : 'transparent', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 16, fontWeight: 600, color: COR.texto, textAlign: 'left', minHeight: 56,
              }}>
                <span aria-hidden style={{ width: 40, height: 40, borderRadius: '50%', background: BOLINHA_AZUL, flexShrink: 0,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={`ti ${m.icon}`} style={{ color: '#fff', fontSize: 21 }} /></span>{m.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div onTouchStart={inicioToque} onTouchEnd={fimToque(true)} style={{
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
                    background: BOLINHA_AZUL,
                    border: '3px solid #fff',
                    boxShadow: '0 4px 16px rgba(26,86,219,.4)',
                    marginTop: -30,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 30,
                    cursor: 'pointer', flexShrink: 0,
                  }}
                ><i aria-hidden className="ti ti-plus" /></button>
                {/* O tracinho de arrastar, embaixo do "+": azul quando a tela aberta é uma do menu. */}
                <button onClick={() => setMais(true)} aria-label={selo ? `Mais opções, ${selo} ${selo === 1 ? 'aviso novo' : 'avisos novos'}` : 'Mais opções'}
                  aria-current={maisAtivo ? 'page' : undefined} style={{
                  width: 58, height: 18, marginTop: 4, padding: 0,
                  border: 'none', background: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center',
                }}>
                  <span aria-hidden style={{ width: 40, height: 4, borderRadius: 2, background: maisAtivo ? COR.azul : COR.textoSuave, position: 'relative' }}>
                    {selo > 0 && <span style={{ position: 'absolute', top: -3, right: -12, width: 10, height: 10, borderRadius: '50%', background: '#b91c1c' }} />}
                  </span>
                </button>
              </div>
            )
          }
          return item(n.path, n.icon, n.label, isActive(n.path), () => navigate(n.path))
        })}
      </div>
    </>
  )
}
