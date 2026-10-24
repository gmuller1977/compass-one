import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { COR } from '../utils/cores'
import { useApp } from '../context/AppContext'
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
 * junto com o Simulador e a tela completa de Lançamentos.
 * Em 18/10/2026 a barra foi Início · Lançamentos · + · Radar · Plano, com o
 * resto abrindo ao arrastar a barra para cima. Em 23/10/2026, pedido do
 * Guilherme ("o menu arrasta no mobile não ficou legal"), o arrastar saiu: o
 * "Mais" volta no lugar do Plano, e o Planejamento vai para dentro dele.
 */
const NAV = [
  { icon: 'ti-home', label: 'Início',   path: '/' },
  { icon: 'ti-list-details', label: 'Lançamentos', path: '/novo-lancamento' },
  null, // botão + flutuante
  { icon: 'ti-radar-2', label: 'Radar',    path: '/radar' },
]

const MAIS: { icon: string; label: string; path: string; emBreve?: boolean }[] = [
  { icon: 'ti-calendar-stats', label: 'Planejamento', path: '/planejamento' },
  ...(NORTE_ATIVO ? [{ icon: 'ti-compass', label: 'Norte', path: '/norte' }] : []),
  { icon: 'ti-calculator', label: 'Simulador',             path: '/simulacao' },
  // Menu dos investimentos, ainda sem tela (21/10/2026, como no computador).
  { icon: 'ti-pig-money', label: 'Investimentos', path: '/investimentos', emBreve: true },
  { icon: 'ti-settings', label: 'Configurações',         path: '/configuracoes' },
  { icon: 'ti-gift', label: 'Indicar amigos',        path: '/indicar' },
]

export default function BottomNav() {
  const isMobile = useIsMobile()
  const navigate  = useNavigate()
  const { pathname } = useLocation()
  const [mais, setMais] = useState(false)
  // A folha aberta é uma entrada no histórico: a seta voltar do Android fecha
  // a folha, em vez de sair da tela (24/10/2026, relatado pelo Guilherme).
  const abrirMais = () => {
    window.history.pushState({ ...window.history.state, maisAberto: true }, '')
    setMais(true)
  }
  const fecharMais = () => {
    if (window.history.state?.maisAberto) window.history.back()
    else setMais(false)
  }
  useEffect(() => {
    if (!mais) return
    const aoVoltar = () => setMais(false)
    window.addEventListener('popstate', aoVoltar)
    return () => window.removeEventListener('popstate', aoVoltar)
  }, [mais])
  const { sairDaConta } = useApp()
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
        <div role="dialog" aria-modal="true" aria-label="Mais opções" onClick={fecharMais}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 150, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', width: '100%', borderRadius: '20px 20px 0 0',
            // O Sair é o último: a folha rola e respeita a barra de gestos do aparelho para ele nunca ficar escondido.
            padding: '10px 0 calc(28px + env(safe-area-inset-bottom))', maxHeight: '88vh', overflowY: 'auto',
            animation: 'slideUp .2s ease',
            fontFamily: "-apple-system,'Inter',sans-serif",
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: COR.borda, margin: '0 auto 8px' }} />
            {MAIS.map(m => (
              <button key={m.path} disabled={m.emBreve} onClick={() => { setMais(false); navigate(m.path, { replace: !!window.history.state?.maisAberto }) }} style={{
                display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '13px 22px',
                border: 'none', background: isActive(m.path) ? '#eff6ff' : 'transparent', cursor: m.emBreve ? 'default' : 'pointer',
                fontFamily: 'inherit', fontSize: 16, fontWeight: 600, color: COR.texto, textAlign: 'left', minHeight: 56,
              }}>
                <span aria-hidden style={{ width: 40, height: 40, borderRadius: '50%', background: BOLINHA_AZUL, flexShrink: 0,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={`ti ${m.icon}`} style={{ color: '#fff', fontSize: 21 }} /></span>{m.label}
                {m.emBreve && (
                  <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 8,
                    background: '#eef2f8', color: '#475569', textTransform: 'uppercase', letterSpacing: '.4px' }}>Em breve</span>
                )}
              </button>
            ))}
            {/* Sair (24/10/2026, pedido do Guilherme): antes só pelo "G" do topo de Configurações. */}
            <button onClick={() => { setMais(false); void sairDaConta() }} style={{
              display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '13px 22px',
              border: 'none', borderTop: `1px solid ${COR.borda}`, background: 'transparent', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 16, fontWeight: 600, color: '#b91c1c', textAlign: 'left', minHeight: 56, marginTop: 4,
            }}>
              <span aria-hidden style={{ width: 40, height: 40, borderRadius: '50%', background: '#fef2f2', flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-logout" style={{ color: '#b91c1c', fontSize: 21 }} /></span>Sair
            </button>
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
                    background: BOLINHA_AZUL,
                    border: '3px solid #fff',
                    boxShadow: '0 4px 16px rgba(26,86,219,.4)',
                    marginTop: -30,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 30,
                    cursor: 'pointer', flexShrink: 0,
                  }}
                ><i aria-hidden className="ti ti-plus" /></button>
              </div>
            )
          }
          return item(n.path, n.icon, n.label, isActive(n.path), () => navigate(n.path))
        })}
        {item('mais', 'ti-menu-2', 'Mais', maisAtivo, abrirMais, selo)}
      </div>
    </>
  )
}
