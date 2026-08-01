import { useState } from 'react'

const TELAS = ['inicio', 'lancamentos', 'planejamento', 'evolucao', 'configuracoes'] as const

export function reativarTutoriais() {
  TELAS.forEach(t => localStorage.removeItem('tutorial_visto_' + t))
}

export type TutorialTip = { icon: string; text: string }

export default function TutorialCard({
  tela, icon, title, description, tips, buttonLabel = 'Entendi, vamos lá →',
}: {
  tela: string
  icon: string
  title: string
  description: string
  tips: TutorialTip[]
  buttonLabel?: string
}) {
  const key = 'tutorial_visto_' + tela
  const [dismissed, setDismissed] = useState(false)
  const [naoMostrar, setNaoMostrar] = useState(false)

  if (!!localStorage.getItem(key) || dismissed) return null

  function dismiss() {
    if (naoMostrar) localStorage.setItem(key, '1')
    setDismissed(true)
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) dismiss() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
        animation: 'tutFadeIn .2s ease-out',
      }}
    >
      <style>{`
        @keyframes tutFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes tutScaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div style={{
        background: 'linear-gradient(160deg, #0f2878 0%, #1a56db 100%)',
        borderRadius: 20,
        padding: '32px 28px 26px',
        maxWidth: 440, width: '90%',
        boxShadow: '0 32px 80px rgba(0,0,0,.45)',
        animation: 'tutScaleIn .2s ease-out',
        fontFamily: "-apple-system,'Inter',sans-serif",
      }}>
        {/* Ícone */}
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <span style={{
            fontSize: 54, lineHeight: 1, display: 'inline-block',
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,.35))',
          }}>{icon}</span>
        </div>

        {/* Título */}
        <h2 style={{
          fontSize: 21, fontWeight: 800, color: '#fff',
          margin: '0 0 10px', textAlign: 'center', lineHeight: 1.25,
        }}>
          {title}
        </h2>

        {/* Descrição */}
        <p style={{
          fontSize: 13.5, color: 'rgba(255,255,255,.82)', lineHeight: 1.65,
          margin: '0 0 20px', textAlign: 'center',
        }}>
          {description}
        </p>

        {/* Tips */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 26 }}>
          {tips.map((t, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'rgba(255,255,255,.12)',
              borderRadius: 10, padding: '11px 14px',
            }}>
              <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}>{t.icon}</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,.9)', lineHeight: 1.45 }}>
                {t.text}
              </span>
            </div>
          ))}
        </div>

        {/* Botão primário — branco com texto azul */}
        <button
          onClick={dismiss}
          style={{
            width: '100%', padding: '13px 20px',
            border: 'none', borderRadius: 10,
            background: '#fff', color: '#0f2878',
            fontSize: 15, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 4px 16px rgba(0,0,0,.2)',
            marginBottom: 16,
          }}
        >
          {buttonLabel}
        </button>

        {/* Não mostrar novamente */}
        <label style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, cursor: 'pointer', marginBottom: 10,
        }}>
          <input
            type="checkbox"
            checked={naoMostrar}
            onChange={e => setNaoMostrar(e.target.checked)}
            style={{ cursor: 'pointer', accentColor: '#fff', width: 14, height: 14 }}
          />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,.65)', userSelect: 'none' }}>
            Não mostrar novamente
          </span>
        </label>

        {/* Dica sobre reativar */}
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', textAlign: 'center', lineHeight: 1.4 }}>
          Você pode reativar em Configurações → Preferências
        </div>
      </div>
    </div>
  )
}
