import React from 'react'
import type { Conta } from '../../context/AppContext'
import { COR, type DadosMes } from './FcShared'

type Props = {
  modalFatura: boolean
  setModalFatura: React.Dispatch<React.SetStateAction<boolean>>
  modalFaturaValor: string
  setModalFaturaValor: React.Dispatch<React.SetStateAction<string>>
  contaInfo: Conta | undefined
  hojeStr: string
  confirmarModalFatura: () => void
  updateMes: (fn: (prev: DadosMes) => DadosMes) => void
}

export default function FcModal({
  modalFatura, setModalFatura,
  modalFaturaValor, setModalFaturaValor,
  contaInfo, hojeStr,
  confirmarModalFatura, updateMes,
}: Props) {
  if (!modalFatura) return null

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:1000,
      display:'flex',alignItems:'center',justifyContent:'center'}}
      onClick={() => setModalFatura(false)}>
      <div style={{background:'#fff',borderRadius:14,padding:'28px 32px',minWidth:360,
        boxShadow:'0 20px 60px rgba(0,0,0,0.25)'}}
        onClick={e => e.stopPropagation()}>
        <div style={{marginBottom:20}}>
          {contaInfo && (
            <span style={{fontSize:14,fontWeight:500,padding:'4px 12px',borderRadius:6,
              display:'inline-flex',alignItems:'center',gap:6,
              background:contaInfo.cor+'18',border:`1px solid ${contaInfo.cor}55`}}>
              <span>{contaInfo.icone}</span>
              <span style={{color:contaInfo.cor,fontWeight:700}}>{contaInfo.banco}</span>
            </span>
          )}
        </div>
        <p style={{fontSize:14,color:'#0f172a',fontWeight:600,margin:'0 0 6px'}}>
          Qual é o valor atual da fatura?
        </p>
        <p style={{fontSize:12,color:'#94a3b8',margin:'0 0 16px'}}>
          Informe o valor do cartão para acompanhar a diferença em relação ao sistema.
        </p>
        <input autoFocus
          value={modalFaturaValor}
          onChange={e => setModalFaturaValor(e.target.value)}
          onFocus={e => e.target.select()}
          onKeyDown={e => {
            if (e.key === 'Enter') confirmarModalFatura()
            if (e.key === 'Escape') setModalFatura(false)
          }}
          placeholder="R$ 0,00"
          style={{width:'100%',border:`1.5px solid ${contaInfo?.cor ?? COR.azul}`,
            borderRadius:8,padding:'10px 14px',fontSize:16,fontWeight:700,
            color:'#0f172a',outline:'none',textAlign:'right',
            fontFamily:'inherit',boxSizing:'border-box'}}/>
        <div style={{display:'flex',gap:10,marginTop:20}}>
          <button
            onClick={() => { updateMes(prev=>({...prev,faturaAtualData:hojeStr})); setModalFatura(false) }}
            style={{flex:1,padding:'10px',borderRadius:8,border:`1.5px solid #e2e8f0`,
              background:'#f8faff',color:'#64748b',fontSize:13,fontWeight:600,
              cursor:'pointer',fontFamily:'inherit'}}>
            Pular
          </button>
          <button onClick={confirmarModalFatura}
            style={{flex:2,padding:'10px',borderRadius:8,border:'none',
              background:contaInfo?.cor ?? COR.azul,color:'#fff',fontSize:13,fontWeight:700,
              cursor:'pointer',fontFamily:'inherit'}}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
