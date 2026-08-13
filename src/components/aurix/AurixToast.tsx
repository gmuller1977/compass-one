import { useState, useEffect } from 'react'

export type AurixToastPayload = {
  tipo: 'acao' | 'conquista' | 'nivel'
  titulo: string
  descricao?: string
  pontos: number
  icone?: string
}

export function dispararToastAurix(payload: AurixToastPayload) {
  document.dispatchEvent(new CustomEvent('aurix:toast', { detail: payload }))
}

type ToastItem = AurixToastPayload & { id: number }

let nextId = 0

export default function AurixToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    const handler = (e: Event) => {
      const payload = (e as CustomEvent<AurixToastPayload>).detail
      const id = nextId++
      setToasts(prev => [...prev, { ...payload, id }])
      const duracao = payload.tipo === 'nivel' ? 6000 : payload.tipo === 'conquista' ? 5000 : 3000
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, duracao)
    }
    document.addEventListener('aurix:toast', handler)
    return () => document.removeEventListener('aurix:toast', handler)
  }, [])

  return (
    <>
      <style>{`
        @keyframes aurix-slide-in {
          from { opacity: 0; transform: translateX(30px) }
          to   { opacity: 1; transform: translateX(0) }
        }
        @keyframes aurix-scale-in {
          from { opacity: 0; transform: translateX(-50%) scale(0.85) }
          to   { opacity: 1; transform: translateX(-50%) scale(1) }
        }
        @keyframes aurix-celebra {
          from { opacity: 0; transform: translateX(-50%) scale(0.7) }
          50%  { transform: translateX(-50%) scale(1.05) }
          to   { opacity: 1; transform: translateX(-50%) scale(1) }
        }
      `}</style>

      {/* Toasts de ação: canto inferior direito */}
      <div style={{
        position: 'fixed', bottom: 90, right: 20, zIndex: 10000,
        display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end',
        pointerEvents: 'none',
      }}>
        {toasts.filter(t => t.tipo === 'acao').map(t => (
          <div key={t.id} style={{
            background: '#1a1a2e',
            color: '#fff',
            borderRadius: 10,
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            animation: 'aurix-slide-in 0.25s ease-out',
            border: '1px solid rgba(255,255,255,0.1)',
            maxWidth: 280,
          }}>
            <span style={{ fontSize: 16 }}>✨</span>
            <span>+{t.pontos} Aurix — {t.titulo}</span>
          </div>
        ))}
      </div>

      {/* Toasts de conquista: topo centralizado */}
      {toasts.filter(t => t.tipo === 'conquista').map(t => (
        <div key={t.id} style={{
          position: 'fixed', top: 24, left: '50%', zIndex: 10001,
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #0f2878, #1a56db)',
          color: '#fff',
          borderRadius: 14,
          padding: '16px 24px',
          fontSize: 14,
          boxShadow: '0 8px 32px rgba(26,86,219,0.45)',
          animation: 'aurix-scale-in 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          minWidth: 280, textAlign: 'center',
          border: '1px solid rgba(255,255,255,0.15)',
          pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 22, marginBottom: 4 }}>{t.icone ?? '🏆'}</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>Conquista desbloqueada!</div>
          {t.descricao && <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginBottom: 6 }}>{t.descricao}</div>}
          <div style={{ fontSize: 16, fontWeight: 700 }}>✨ +{t.pontos} Aurix</div>
        </div>
      ))}

      {/* Toasts de nível: topo centralizado, maior */}
      {toasts.filter(t => t.tipo === 'nivel').map(t => (
        <div key={t.id} style={{
          position: 'fixed', top: 24, left: '50%', zIndex: 10002,
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
          color: '#fff',
          borderRadius: 16,
          padding: '20px 32px',
          fontSize: 14,
          boxShadow: '0 8px 40px rgba(124,58,237,0.5)',
          animation: 'aurix-celebra 0.4s cubic-bezier(0.34,1.56,0.64,1)',
          minWidth: 300, textAlign: 'center',
          border: '1px solid rgba(255,255,255,0.2)',
          pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🎉</div>
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>{t.titulo}</div>
          {t.descricao && <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{t.descricao}</div>}
        </div>
      ))}
    </>
  )
}
