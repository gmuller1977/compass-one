import { COR, fmt } from './AcShared'

interface AcResumoBoxesProps {
  isMobile: boolean
  totalPrevE: number
  totalPrevS: number
  totalRealE: number
  totalRealS: number
}

export default function AcResumoBoxes({
  isMobile, totalPrevE, totalPrevS, totalRealE, totalRealS,
}: AcResumoBoxesProps) {
  const saldoReal = totalRealE - totalRealS
  const saldoPrev = totalPrevE - totalPrevS
  const semDados  = totalRealE === 0 && totalRealS === 0 && totalPrevE === 0 && totalPrevS === 0
  const corSaldoR = semDados ? '#94a3b8' : saldoReal >= 0 ? COR.verde : COR.vermelho
  const corSaldoP = semDados ? '#94a3b8' : saldoPrev >= 0 ? COR.verde : COR.vermelho
  const percE = totalPrevE > 0 ? Math.min(totalRealE / totalPrevE, 1) : (totalRealE > 0 ? 1 : 0)
  const percS = totalPrevS > 0 ? Math.min(totalRealS / totalPrevS, 1) : (totalRealS > 0 ? 1 : 0)
  const barCorE = percE >= 1 ? COR.azul : COR.verde
  const barCorS = percS >= 1 ? COR.vermelho : percS >= 0.8 ? '#f59e0b' : COR.azul

  if (isMobile) {
    return (
      /* Mobile: linhas com barra de progresso */
      <div style={{background:COR.branco,borderBottom:`2px solid ${COR.borda}`,
        padding:'10px 14px 12px',flexShrink:0,display:'flex',flexDirection:'column',gap:8}}>
        {/* Linha Entradas */}
        <div>
          <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:4}}>
            <span style={{fontSize:11,fontWeight:700,color:COR.verde}}>Receitas</span>
            <div style={{display:'flex',alignItems:'baseline',gap:4}}>
              <span style={{fontSize:14,fontWeight:800,color:COR.verde,
                fontVariantNumeric:'tabular-nums'}}>
                {totalRealE > 0 ? fmt(totalRealE) : '—'}
              </span>
              {totalPrevE > 0 && (
                <span style={{fontSize:10,color:COR.textoSuave,fontVariantNumeric:'tabular-nums'}}>
                  de {fmt(totalPrevE)}
                </span>
              )}
              <span style={{fontSize:10,fontWeight:600,color:barCorE,minWidth:32,textAlign:'right'}}>
                {totalPrevE > 0 ? `${Math.round(percE*100)}%` : ''}
              </span>
            </div>
          </div>
          <div style={{background:'#e9edf2',borderRadius:99,height:4,overflow:'hidden'}}>
            <div style={{width:`${percE*100}%`,height:4,borderRadius:99,background:barCorE,transition:'width .3s'}}/>
          </div>
        </div>
        {/* Linha Saídas */}
        <div>
          <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:4}}>
            <span style={{fontSize:11,fontWeight:700,color:COR.vermelho}}>Despesas</span>
            <div style={{display:'flex',alignItems:'baseline',gap:4}}>
              <span style={{fontSize:14,fontWeight:800,color:COR.vermelho,
                fontVariantNumeric:'tabular-nums'}}>
                {totalRealS > 0 ? fmt(totalRealS) : '—'}
              </span>
              {totalPrevS > 0 && (
                <span style={{fontSize:10,color:COR.textoSuave,fontVariantNumeric:'tabular-nums'}}>
                  de {fmt(totalPrevS)}
                </span>
              )}
              <span style={{fontSize:10,fontWeight:600,color:barCorS,minWidth:32,textAlign:'right'}}>
                {totalPrevS > 0 ? `${Math.round(percS*100)}%` : ''}
              </span>
            </div>
          </div>
          <div style={{background:'#e9edf2',borderRadius:99,height:4,overflow:'hidden'}}>
            <div style={{width:`${percS*100}%`,height:4,borderRadius:99,background:barCorS,transition:'width .3s'}}/>
          </div>
        </div>
        {/* Saldo */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
          paddingTop:8,borderTop:`1px solid ${COR.borda}`}}>
          <span style={{fontSize:11,fontWeight:600,color:COR.textoSuave}}>Resultado do mês</span>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{fontSize:14,fontWeight:800,color:corSaldoR,fontVariantNumeric:'tabular-nums'}}>
              {semDados ? '—' : fmt(saldoReal)}
            </span>
            {!semDados && (
              <>
                <span style={{fontSize:12,color:COR.textoSuave}}>→</span>
                <span style={{fontSize:13,fontWeight:700,color:corSaldoP,fontVariantNumeric:'tabular-nums'}}>
                  {fmt(saldoPrev)}
                </span>
                <span style={{fontSize:9,color:COR.textoSuave,fontWeight:500}}>prev.</span>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    /* Desktop: layout original com caixas separadas */
    <div style={{background:COR.branco,borderBottom:`2px solid ${COR.borda}`,
      padding:'10px 16px',flexShrink:0,display:'flex',gap:6,overflowX:'auto',
      alignItems:'stretch',flexWrap:'nowrap'}}>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',
        padding:'5px 10px',borderRadius:8,flex:'1 0 auto',
        background:'#f8faff',border:`1px solid ${COR.borda}`}}>
        <span style={{fontSize:10,fontWeight:600,textTransform:'uppercase',
          letterSpacing:.4,marginBottom:1,color:'#94a3b8'}}>Receitas previstas</span>
        <span style={{fontSize:13,fontWeight:700,color:COR.textoSuave,fontVariantNumeric:'tabular-nums'}}>
          {totalPrevE > 0 ? fmt(totalPrevE) : '—'}
        </span>
      </div>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',
        padding:'5px 10px',borderRadius:8,flex:'1 0 auto',
        background:totalRealE > 0 ? '#eff6ff' : '#f8faff',
        border:`1px solid ${totalRealE > 0 ? '#bfdbfe' : COR.borda}`}}>
        <span style={{fontSize:10,fontWeight:600,textTransform:'uppercase',
          letterSpacing:.4,marginBottom:1,color:totalRealE > 0 ? COR.azul : '#94a3b8'}}>
          Receitas realizadas
        </span>
        <span style={{fontSize:13,fontWeight:700,fontVariantNumeric:'tabular-nums',
          color:totalRealE > 0 ? COR.azul : '#94a3b8'}}>
          {totalRealE > 0 ? fmt(totalRealE) : '—'}
        </span>
      </div>
      <div style={{width:1,background:COR.borda,flexShrink:0,margin:'4px 0'}}/>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',
        padding:'5px 10px',borderRadius:8,flex:'1 0 auto',
        background:'#f8faff',border:`1px solid ${COR.borda}`}}>
        <span style={{fontSize:10,fontWeight:600,textTransform:'uppercase',
          letterSpacing:.4,marginBottom:1,color:'#94a3b8'}}>Despesas previstas</span>
        <span style={{fontSize:13,fontWeight:700,color:COR.textoSuave,fontVariantNumeric:'tabular-nums'}}>
          {totalPrevS > 0 ? fmt(totalPrevS) : '—'}
        </span>
      </div>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',
        padding:'5px 10px',borderRadius:8,flex:'1 0 auto',
        background:totalRealS > 0 ? (totalRealS > totalPrevS ? '#fff1f2' : '#f0f9ff') : '#f8faff',
        border:`1px solid ${totalRealS > 0 ? (totalRealS > totalPrevS ? '#fecdd3' : '#bae6fd') : COR.borda}`}}>
        <span style={{fontSize:10,fontWeight:600,textTransform:'uppercase',
          letterSpacing:.4,marginBottom:1,
          color:totalRealS > 0 ? (totalRealS > totalPrevS ? COR.vermelho : '#0284c7') : '#94a3b8'}}>
          Despesas realizadas
        </span>
        <span style={{fontSize:13,fontWeight:700,fontVariantNumeric:'tabular-nums',
          color:totalRealS > 0 ? (totalRealS > totalPrevS ? COR.vermelho : '#0284c7') : '#94a3b8'}}>
          {totalRealS > 0 ? fmt(totalRealS) : '—'}
        </span>
      </div>
      <div style={{width:1,background:COR.borda,flexShrink:0,margin:'4px 0'}}/>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',
        padding:'5px 10px',borderRadius:8,flex:'1 0 auto',
        background:saldoReal>=0?'#f0fdf4':'#fff1f2',
        border:`1px solid ${saldoReal>=0?'#bbf7d0':'#fecdd3'}`}}>
        <span style={{fontSize:10,fontWeight:600,textTransform:'uppercase',
          letterSpacing:.4,marginBottom:1,color:corSaldoR}}>Saldo</span>
        <span style={{fontSize:13,fontWeight:700,color:corSaldoR,fontVariantNumeric:'tabular-nums'}}>
          {semDados ? '—' : fmt(saldoReal)}
        </span>
      </div>
    </div>
  )
}
