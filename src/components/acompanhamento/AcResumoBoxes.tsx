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
  const saldoPrev = totalPrevE - totalPrevS
  const saldoReal = totalRealE - totalRealS
  const diffE     = totalRealE - totalPrevE   // realizado vs previsto
  const diffS     = totalRealS - totalPrevS
  const diffSaldo = saldoReal - saldoPrev
  const semDados  = totalRealE === 0 && totalRealS === 0 && totalPrevE === 0 && totalPrevS === 0

  // ── Mobile compacto ─────────────────────────────────────
  if (isMobile) {
    const percE = totalPrevE > 0 ? Math.min(totalRealE / totalPrevE, 1) : (totalRealE > 0 ? 1 : 0)
    const percS = totalPrevS > 0 ? Math.min(totalRealS / totalPrevS, 1) : (totalRealS > 0 ? 1 : 0)
    return (
      <div style={{background:COR.branco,borderBottom:`2px solid ${COR.borda}`,
        padding:'10px 14px 12px',flexShrink:0,display:'flex',flexDirection:'column',gap:8}}>
        {[
          {label:'Receitas',cor:COR.verde,real:totalRealE,prev:totalPrevE,perc:percE},
          {label:'Despesas',cor:COR.vermelho,real:totalRealS,prev:totalPrevS,perc:percS},
        ].map(({label,cor,real,prev,perc}) => (
          <div key={label}>
            <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:4}}>
              <span style={{fontSize:11,fontWeight:700,color:cor}}>{label}</span>
              <div style={{display:'flex',alignItems:'baseline',gap:4}}>
                <span style={{fontSize:14,fontWeight:800,color:cor,fontVariantNumeric:'tabular-nums'}}>
                  {real > 0 ? fmt(real) : '—'}
                </span>
                {prev > 0 && <span style={{fontSize:10,color:COR.textoSuave,fontVariantNumeric:'tabular-nums'}}>de {fmt(prev)}</span>}
              </div>
            </div>
            <div style={{background:'#e9edf2',borderRadius:99,height:4,overflow:'hidden'}}>
              <div style={{width:`${perc*100}%`,height:4,borderRadius:99,background:cor,transition:'width .3s'}}/>
            </div>
          </div>
        ))}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
          paddingTop:8,borderTop:`1px solid ${COR.borda}`}}>
          <span style={{fontSize:11,fontWeight:600,color:COR.textoSuave}}>Resultado do mês</span>
          <span style={{fontSize:14,fontWeight:800,fontVariantNumeric:'tabular-nums',
            color:semDados?'#94a3b8':saldoReal>=0?COR.verde:COR.vermelho}}>
            {semDados ? '—' : fmt(saldoReal)}
          </span>
        </div>
      </div>
    )
  }

  // ── Desktop: 3 caixas no estilo NleBanner ───────────────
  const grad = 'linear-gradient(135deg,#0f2878,#1e40af)'
  const box  = { display:'flex' as const, flexDirection:'column' as const,
    background:grad, border:'1px solid rgba(255,255,255,.15)', borderRadius:14, padding:'14px 16px', flex:1 }

  const caixas = [
    {
      icon: '↑', label: 'Entradas',
      prev: totalPrevE,
      real: totalRealE,
      realCor: '#93c5fd',
      diff: diffE,
      diffPos: diffE >= 0,   // positivo = recebeu mais que o previsto
    },
    {
      icon: '↓', label: 'Saídas',
      prev: totalPrevS,
      real: totalRealS,
      realCor: '#fca5a5',
      diff: diffS,
      diffPos: diffS <= 0,   // positivo = gastou menos que o previsto
    },
    {
      icon: '=', label: 'Saldo',
      prev: saldoPrev,
      real: saldoReal,
      realCor: saldoReal >= 0 ? '#86efac' : '#fca5a5',
      diff: diffSaldo,
      diffPos: diffSaldo >= 0,
    },
  ]

  return (
    <div style={{
      background: '#f0f4ff',
      borderBottom: `2px solid ${COR.borda}`,
      padding: '12px 16px',
      flexShrink: 0,
      display: 'flex',
      gap: 10,
    }}>
      {caixas.map(c => {
        const difStr = c.diff === 0 ? null
          : `${c.diff > 0 ? '+' : ''}${fmt(c.diff)}`
        const difCor = c.diffPos ? '#86efac' : '#fca5a5'
        const difBg  = c.diffPos ? 'rgba(34,197,94,.18)' : 'rgba(239,68,68,.18)'

        return (
          <div key={c.label} style={box}>
            {/* Label */}
            <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,.65)',
              textTransform:'uppercase' as const,letterSpacing:.6,marginBottom:8}}>
              {c.icon} {c.label}
            </div>

            {/* Realizado — valor principal */}
            <div style={{fontSize:20,fontWeight:800,color:c.realCor,
              letterSpacing:'-.5px',fontVariantNumeric:'tabular-nums',marginBottom:6}}>
              {c.real > 0 || c.label === 'Saldo' ? fmt(c.real) : '—'}
            </div>

            {/* Linha inferior: previsto + diferença */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:6}}>
              <div style={{display:'flex',flexDirection:'column' as const,gap:1}}>
                <span style={{fontSize:8,fontWeight:600,color:'rgba(255,255,255,.45)',
                  textTransform:'uppercase' as const,letterSpacing:.4}}>Previsto</span>
                <span style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.6)',
                  fontVariantNumeric:'tabular-nums'}}>
                  {c.prev > 0 || c.label === 'Saldo' ? fmt(c.prev) : '—'}
                </span>
              </div>
              {difStr && (
                <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:6,
                  background:difBg,color:difCor,whiteSpace:'nowrap' as const,
                  fontVariantNumeric:'tabular-nums'}}>
                  {difStr}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
