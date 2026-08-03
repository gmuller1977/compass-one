import { useEffect, useRef } from 'react'

type Props = {
  open: boolean
  titulo: string
  mensagem?: string
  detalhe?: string
  labelConfirmar?: string
  corConfirmar?: string
  apenasFechar?: boolean
  icone?: string
  onConfirmar: () => void
  onCancelar: () => void
}

export default function ModalConfirmacao({
  open, titulo, mensagem, detalhe,
  labelConfirmar = 'Excluir',
  corConfirmar = '#dc2626',
  apenasFechar = false,
  icone,
  onConfirmar, onCancelar,
}: Props) {
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    btnRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancelar()
      if (!apenasFechar && e.key === 'Enter') { e.preventDefault(); onConfirmar() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  const iconeEfetivo = icone ?? (apenasFechar ? '⚠️' : '🗑️')
  const bgIcone = apenasFechar ? '#fef3c7' : '#fef2f2'

  return (
    <div
      onClick={onCancelar}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(15,23,42,.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, padding: '28px 28px 24px',
          maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.2)',
        }}
      >
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: bgIcone, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 22, marginBottom: 16,
        }}>
          {iconeEfetivo}
        </div>

        <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
          {titulo}
        </div>

        {mensagem && (
          <div style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, marginBottom: detalhe ? 10 : 0 }}>
            {mensagem}
          </div>
        )}

        {detalhe && (
          <div style={{
            fontSize: 13, color: '#0f172a', fontWeight: 600,
            background: '#f1f5f9', borderRadius: 8,
            padding: '8px 12px', marginTop: 4,
          }}>
            {detalhe}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          {apenasFechar ? (
            <button
              ref={btnRef}
              onClick={onCancelar}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 9,
                border: 'none', background: '#1a56db',
                color: '#fff', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Entendi
            </button>
          ) : (
            <>
              <button
                ref={btnRef}
                onClick={onCancelar}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 9,
                  border: '1.5px solid #e2e8f0', background: '#fff',
                  color: '#475569', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={onConfirmar}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 9,
                  border: 'none', background: corConfirmar,
                  color: '#fff', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {labelConfirmar}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
