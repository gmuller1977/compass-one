import { useEffect } from 'react'

type Props = {
  mensagem: string
  detalhe?: string
  onConfirmar: () => void
  onCancelar: () => void
  labelConfirmar?: string
}

export default function FcConfirmModal({ mensagem, detalhe, onConfirmar, onCancelar, labelConfirmar = 'Excluir' }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancelar()
      if (e.key === 'Enter') onConfirmar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onConfirmar, onCancelar])

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:2000,
        display:'flex', alignItems:'center', justifyContent:'center', padding: '0 16px' }}
      onClick={onCancelar}
    >
      <div
        style={{ background:'#fff', borderRadius:16, padding:'28px 28px 24px',
          minWidth:300, maxWidth:380, width:'100%',
          boxShadow:'0 24px 64px rgba(0,0,0,0.28)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom: detalhe ? 8 : 20 }}>
          <div style={{ width:40, height:40, borderRadius:12, background:'#fef2f2',
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:20 }}>
            🗑️
          </div>
          <p style={{ margin:0, fontSize:15, fontWeight:700, color:'#0f172a', lineHeight:1.35 }}>
            {mensagem}
          </p>
        </div>
        {detalhe && (
          <p style={{ margin:'0 0 20px 52px', fontSize:13, color:'#64748b', lineHeight:1.5 }}>
            {detalhe}
          </p>
        )}
        <div style={{ display:'flex', gap:10, marginTop: detalhe ? 0 : 4 }}>
          <button
            onClick={onCancelar}
            style={{ flex:1, padding:'10px', borderRadius:10, border:'1.5px solid #e2e8f0',
              background:'#f8fafc', color:'#475569', fontSize:14, fontWeight:600,
              cursor:'pointer', fontFamily:'inherit' }}
          >
            Cancelar
          </button>
          <button
            autoFocus
            onClick={onConfirmar}
            style={{ flex:1, padding:'10px', borderRadius:10, border:'none',
              background:'#ef4444', color:'#fff', fontSize:14, fontWeight:700,
              cursor:'pointer', fontFamily:'inherit' }}
          >
            {labelConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
