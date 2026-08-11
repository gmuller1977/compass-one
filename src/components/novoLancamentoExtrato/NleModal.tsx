type ModalSaldoInfo = {
  contaId: string; banco: string; icone: string; cor: string; key: string
}

type Props = {
  modalSaldo: ModalSaldoInfo | null
  setModalSaldo: (v: ModalSaldoInfo | null) => void
  modalSaldoValor: string
  setModalSaldoValor: (v: string) => void
  confirmarModalSaldo: () => void
}

export default function NleModal({
  modalSaldo, setModalSaldo,
  modalSaldoValor, setModalSaldoValor,
  confirmarModalSaldo,
}: Props) {
  if (!modalSaldo) return null

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:1000,
      display:'flex',alignItems:'center',justifyContent:'center'}}
      onClick={() => setModalSaldo(null)}>
      <div style={{background:'#fff',borderRadius:14,padding:'28px 32px',minWidth:360,
        boxShadow:'0 20px 60px rgba(0,0,0,0.25)'}}
        onClick={e => e.stopPropagation()}>
        <div style={{marginBottom:20,display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:14,fontWeight:500,padding:'4px 12px',borderRadius:6,
            display:'inline-flex',alignItems:'center',gap:6,
            background:modalSaldo.cor+'18',border:`1px solid ${modalSaldo.cor}55`}}>
            <span>{modalSaldo.icone}</span>
            <span style={{color:modalSaldo.cor,fontWeight:700}}>{modalSaldo.banco}</span>
          </span>
        </div>
        <p style={{fontSize:14,color:'#0f172a',fontWeight:600,margin:'0 0 6px'}}>
          Qual é o saldo atual no banco?
        </p>
        <p style={{fontSize:12,color:'#94a3b8',margin:'0 0 16px'}}>
          Informe o saldo real da sua conta para conferir se seus lançamentos estão batendo.
        </p>
        <input autoFocus
          value={modalSaldoValor}
          onChange={e => setModalSaldoValor(e.target.value)}
          onFocus={e => e.target.select()}
          onKeyDown={e => {
            if (e.key === 'Enter') confirmarModalSaldo()
            if (e.key === 'Escape') setModalSaldo(null)
          }}
          placeholder="R$ 0,00"
          style={{width:'100%',border:`1.5px solid ${modalSaldo.cor}`,borderRadius:8,
            padding:'10px 14px',fontSize:16,fontWeight:700,color:'#0f172a',
            outline:'none',textAlign:'right',fontFamily:'inherit',boxSizing:'border-box'}}/>
        <div style={{display:'flex',gap:10,marginTop:20}}>
          <button onClick={() => setModalSaldo(null)}
            style={{flex:1,padding:'10px',borderRadius:8,border:`1.5px solid #e2e8f0`,
              background:'#f8faff',color:'#64748b',fontSize:13,fontWeight:600,
              cursor:'pointer',fontFamily:'inherit'}}>
            Pular
          </button>
          <button onClick={confirmarModalSaldo}
            style={{flex:2,padding:'10px',borderRadius:8,border:'none',
              background:modalSaldo.cor,color:'#fff',fontSize:13,fontWeight:700,
              cursor:'pointer',fontFamily:'inherit'}}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
