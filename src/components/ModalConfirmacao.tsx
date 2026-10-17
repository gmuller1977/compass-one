import { useEffect, useRef } from 'react'
import ModalTopo from './ModalTopo'

type Props = {
  open: boolean
  titulo: string
  mensagem?: string
  detalhe?: string
  labelConfirmar?: string
  corConfirmar?: string
  apenasFechar?: boolean
  /** Nome do ícone Tabler (ex. "ti-trash"). */
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

  const iconeEfetivo = icone ?? (apenasFechar ? 'ti-alert-triangle' : 'ti-trash')

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
        role="dialog" aria-modal="true" aria-labelledby="confirmacao-titulo"
        style={{
          background: '#fff', borderRadius: 16, overflow: 'hidden',
          maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.2)',
        }}
      >
        <ModalTopo icone={iconeEfetivo} rotulo={apenasFechar ? 'Aviso' : 'Confirmar'} titulo={titulo}
          id="confirmacao-titulo" onFechar={onCancelar} />
        <div style={{ padding: '18px 24px 22px' }}>

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

        <div style={{ display: 'flex', gap: 10, marginTop: mensagem || detalhe ? 22 : 0 }}>
          {apenasFechar ? (
            <button
              ref={btnRef}
              onClick={onCancelar}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10,
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
                  flex: 1, padding: '10px 0', borderRadius: 10,
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
                  flex: 1, padding: '10px 0', borderRadius: 10,
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
    </div>
  )
}
