import { useRef, useEffect, useState } from 'react'
import NorteMessage from './NorteMessage'
import type { Mensagem } from './NorteAgent'

const CHIPS = [
  'Qual meu saldo?',
  'Resumo do mês',
  'Estou no caminho certo?',
  'Onde mais gastei?',
]

type Props = {
  open: boolean
  onClose: () => void
  messages: Mensagem[]
  loading: boolean
  onEnviar: (texto: string) => void
  nomeUsuario: string
}

function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
}

export default function NortePanel({ open, onClose, messages, loading, onEnviar, nomeUsuario }: Props) {
  const isMobile = useIsMobile()
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [texto, setTexto] = useState('')
  const temInteracao = messages.some(m => m.role === 'user')

  useEffect(() => {
    if (!open) return
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
      inputRef.current?.focus()
    }, 60)
  }, [open])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  function enviar() {
    const t = texto.trim()
    if (!t || loading) return
    onEnviar(t)
    setTexto('')
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviar()
    }
  }

  const welcomeText = `Olá${nomeUsuario ? ', ' + nomeUsuario : ''}! Sou o Norte, seu assistente financeiro. Posso te ajudar com:\n• Consultar saldos e faturas\n• Analisar seus gastos do mês\n• Comparar planejado vs realizado\n• Dar dicas para melhorar suas finanças\n\nComo posso te ajudar?`

  return (
    <>
      <style>{`
        @keyframes norte-dot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4 }
          40%            { transform: translateY(-5px); opacity: 1 }
        }
        .norte-panel-scrollbar::-webkit-scrollbar { width: 4px }
        .norte-panel-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px }
        .norte-chip:hover { background: #1a56db !important; color: #fff !important; border-color: #1a56db !important }
      `}</style>

      {/* Backdrop — mobile apenas */}
      {isMobile && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 9997,
            background: 'rgba(0,0,0,0.35)',
            opacity: open ? 1 : 0,
            pointerEvents: open ? 'auto' : 'none',
            transition: 'opacity 250ms',
          }}
        />
      )}

      {/* Painel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, zIndex: 9998,
        width: isMobile ? '100%' : 420,
        height: '100dvh',
        background: '#fff',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 250ms ease-out',
      }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg,#0f2878,#1a56db)',
          padding: '18px 20px',
          display: 'flex', alignItems: 'center', gap: 14,
          flexShrink: 0,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>
            🧭
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>Norte</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }}>Seu assistente financeiro</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.15)', border: 'none',
              color: '#fff', fontSize: 18, cursor: 'pointer',
              borderRadius: '50%', width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'inherit',
            }}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Mensagens */}
        <div
          ref={scrollRef}
          className="norte-panel-scrollbar"
          style={{
            flex: 1, overflowY: 'auto',
            padding: '20px 16px 8px',
            display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Mensagem de boas-vindas (antes de qualquer interação) */}
          {messages.length === 0 && (
            <NorteMessage role="assistant" content={welcomeText} ts={Date.now()} />
          )}

          {/* Chips de sugestão */}
          {!temInteracao && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16, marginTop: 4 }}>
              {CHIPS.map(chip => (
                <button
                  key={chip}
                  className="norte-chip"
                  onClick={() => onEnviar(chip)}
                  style={{
                    padding: '7px 14px', borderRadius: 20,
                    border: '1.5px solid #1a56db', background: '#fff',
                    color: '#1a56db', fontSize: 13, fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all 0.15s',
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Histórico */}
          {messages.map((m, i) => (
            <NorteMessage key={i} role={m.role} content={m.content} ts={m.ts} />
          ))}

          {/* Indicador digitando */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg,#0f2878,#1a56db)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14,
              }}>
                🧭
              </div>
              <div style={{
                background: '#f0f4ff', borderRadius: '12px 12px 12px 4px',
                padding: '12px 16px', display: 'flex', gap: 5, alignItems: 'center',
              }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%', background: '#64748b',
                    animation: 'norte-dot 1.2s ease-in-out infinite',
                    animationDelay: `${i * 0.2}s`,
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Limite de mensagens */}
          {messages.filter(m => m.role === 'user').length >= 20 && (
            <div style={{
              textAlign: 'center', fontSize: 12, color: '#94a3b8',
              padding: '8px 0', marginTop: 4,
            }}>
              Conversa ficando longa. As mensagens mais antigas foram resumidas.
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex', gap: 10, alignItems: 'flex-end',
          background: '#fff', flexShrink: 0,
        }}>
          <textarea
            ref={inputRef}
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Pergunte ao Norte..."
            disabled={loading}
            rows={1}
            style={{
              flex: 1, resize: 'none', border: '1.5px solid #e2e8f0',
              borderRadius: 12, padding: '10px 14px', fontSize: 14,
              fontFamily: 'inherit', outline: 'none', lineHeight: 1.5,
              maxHeight: 100, overflowY: 'auto',
              background: loading ? '#f8fafc' : '#fff',
              color: '#0f172a',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => { e.target.style.borderColor = '#1a56db' }}
            onBlur={e => { e.target.style.borderColor = '#e2e8f0' }}
          />
          <button
            onClick={enviar}
            disabled={!texto.trim() || loading}
            style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              border: 'none',
              background: texto.trim() && !loading ? '#1a56db' : '#e2e8f0',
              color: texto.trim() && !loading ? '#fff' : '#94a3b8',
              cursor: texto.trim() && !loading ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, transition: 'all 0.15s',
            }}
            aria-label="Enviar"
          >
            ↑
          </button>
        </div>
      </div>
    </>
  )
}
