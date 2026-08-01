import { useState } from 'react'

const TELAS = ['inicio', 'lancamentos', 'planejamento', 'evolucao', 'configuracoes'] as const

export function reativarTutoriais() {
  TELAS.forEach(t => localStorage.removeItem('tutorial_visto_' + t))
}

export default function TutorialCard({
  tela, icon, title, description, tips, buttonLabel = 'Entendi, vamos lá →',
}: {
  tela: string
  icon: string
  title: string
  description: string
  tips: string[]
  buttonLabel?: string
}) {
  const [visible,    setVisible]    = useState(() => !localStorage.getItem('tutorial_visto_' + tela))
  const [naoMostrar, setNaoMostrar] = useState(false)

  if (!visible) return null

  function dismiss() {
    if (naoMostrar) localStorage.setItem('tutorial_visto_' + tela, '1')
    setVisible(false)
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) dismiss() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(15,23,42,.62)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
        animation: 'tutFadeIn .22s ease',
      }}
    >
      <style>{`
        @keyframes tutFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes tutSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        background: '#fff', borderRadius: 20,
        padding: '32px 28px 24px',
        maxWidth: 500, width: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,.22)',
        animation: 'tutSlideUp .25s ease',
        fontFamily: "-apple-system,'Inter',sans-serif",
      }}>
        {/* Ícone */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 52, lineHeight: 1 }}>{icon}</span>
        </div>

        {/* Título */}
        <h2 style={{
          fontSize: 20, fontWeight: 800, color: '#0f172a',
          margin: '0 0 10px', textAlign: 'center', lineHeight: 1.3,
        }}>
          {title}
        </h2>

        {/* Descrição */}
        <p style={{
          fontSize: 13.5, color: '#475569', lineHeight: 1.65,
          margin: '0 0 18px', textAlign: 'center',
        }}>
          {description}
        </p>

        {/* Tips */}
        <div style={{
          background: '#f0f4ff', borderRadius: 12,
          padding: '14px 16px', marginBottom: 22,
        }}>
          {tips.map((t, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              marginBottom: i < tips.length - 1 ? 10 : 0,
            }}>
              <span style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                background: '#1a56db', color: '#fff',
                fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: 1,
              }}>{i + 1}</span>
              <span style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.5 }}>{t}</span>
            </div>
          ))}
        </div>

        {/* Botão primário */}
        <button
          onClick={dismiss}
          style={{
            width: '100%', padding: '13px 20px',
            border: 'none', borderRadius: 12,
            background: 'linear-gradient(135deg,#1a56db,#2563eb)',
            color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 4px 14px rgba(26,86,219,.28)',
            marginBottom: 14,
          }}
        >
          {buttonLabel}
        </button>

        {/* Não mostrar novamente */}
        <label style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={naoMostrar}
            onChange={e => setNaoMostrar(e.target.checked)}
            style={{ cursor: 'pointer', accentColor: '#1a56db', width: 15, height: 15 }}
          />
          <span style={{ fontSize: 12, color: '#94a3b8' }}>Não mostrar novamente</span>
        </label>
      </div>
    </div>
  )
}
