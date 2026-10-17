import { useEffect } from 'react'
import ModalTopo from '../ModalTopo'

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
        role="dialog" aria-modal="true" aria-labelledby="fc-confirma-titulo"
        style={{ background:'#fff', borderRadius:16, overflow:'hidden',
          minWidth:300, maxWidth:380, width:'100%',
          boxShadow:'0 24px 64px rgba(0,0,0,0.28)' }}
        onClick={e => e.stopPropagation()}
      >
        <ModalTopo icone="ti-trash" rotulo="Confirmar" titulo={mensagem} id="fc-confirma-titulo" onFechar={onCancelar} />
        <div style={{ padding:'18px 24px 22px' }}>
        {detalhe && (
          <p style={{ margin:'0 0 18px', fontSize:13, color:'#64748b', lineHeight:1.5 }}>
            {detalhe}
          </p>
        )}
        <div style={{ display:'flex', gap:10 }}>
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
    </div>
  )
}
