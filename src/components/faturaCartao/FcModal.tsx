import React from 'react'
import type { Conta } from '../../context/AppContext'
import { COR, NOMES_MESES, type DadosMes } from './FcShared'
import ModalTopo from '../ModalTopo'

type Props = {
  modalFatura: boolean
  setModalFatura: React.Dispatch<React.SetStateAction<boolean>>
  modalFaturaValor: string
  setModalFaturaValor: React.Dispatch<React.SetStateAction<string>>
  contaInfo: Conta | undefined
  hojeStr: string
  confirmarModalFatura: () => void
  updateMes: (fn: (prev: DadosMes) => DadosMes) => void
  // De qual fatura se trata (pedido do Guilherme, 22/10/2026: "para evitar
  // dúvidas"): o mês em que ela VENCE, como no seletor do topo.
  mesVenc: number
  anoVenc: number
  diaVencimento: number
  purchaseMes: number
  diaFechamento: number
}

export default function FcModal({
  modalFatura, setModalFatura,
  modalFaturaValor, setModalFaturaValor,
  contaInfo, hojeStr,
  confirmarModalFatura, updateMes,
  mesVenc, anoVenc, diaVencimento, purchaseMes, diaFechamento,
}: Props) {
  if (!modalFatura) return null
  const nomeMes = NOMES_MESES[mesVenc].toLowerCase()
  const dd = (d: number, m: number) => `${String(d).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}`

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:1000,
      display:'flex',alignItems:'center',justifyContent:'center'}}
      onClick={() => setModalFatura(false)}>
      <div role="dialog" aria-modal="true" aria-labelledby="fc-fatura-titulo"
        style={{background:'#fff',borderRadius:16,overflow:'hidden',width:400,maxWidth:'calc(100vw - 32px)',
        boxShadow:'0 20px 60px rgba(0,0,0,0.25)'}}
        onClick={e => e.stopPropagation()}>
        <ModalTopo icone="ti-credit-card" rotulo={contaInfo ? `Cartão · ${contaInfo.apelido ?? contaInfo.banco}` : 'Cartão'}
          titulo={`Qual é o valor atual da fatura de ${nomeMes}?`} id="fc-fatura-titulo" onFechar={() => setModalFatura(false)}
          subtitulo={`Fatura de ${nomeMes} de ${anoVenc} · fecha ${dd(diaFechamento, purchaseMes)} · vence ${dd(diaVencimento, mesVenc)}. Informe o valor que aparece no app do cartão para acompanhar a diferença em relação ao sistema.`} />
        <div style={{padding:'18px 24px 22px'}}>
        <input inputMode="decimal" autoFocus
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
    </div>
  )
}
