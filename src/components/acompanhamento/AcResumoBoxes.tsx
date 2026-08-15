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
  const diffE     = totalPrevE - totalRealE   // positivo = a receber
  const diffS     = totalPrevS - totalRealS   // positivo = economizou
  const diffSaldo = saldoPrev - saldoReal

  const semDados = totalRealE === 0 && totalRealS === 0 && totalPrevE === 0 && totalPrevS === 0

  // ── Cores ────────────────────────────────────────────────
  const corSaldoPrev = semDados ? '#94a3b8' : saldoPrev >= 0 ? COR.verde : COR.vermelho
  const corSaldoReal = semDados ? '#94a3b8' : saldoReal >= 0 ? COR.verde : COR.vermelho

  if (isMobile) {
    // Mobile: compacto, 2 linhas (prev + real) + saldo
    const percE = totalPrevE > 0 ? Math.min(totalRealE / totalPrevE, 1) : (totalRealE > 0 ? 1 : 0)
    const percS = totalPrevS > 0 ? Math.min(totalRealS / totalPrevS, 1) : (totalRealS > 0 ? 1 : 0)
    const barCorE = percE >= 1 ? COR.azul : COR.verde
    const barCorS = percS >= 1 ? COR.vermelho : percS >= 0.8 ? '#f59e0b' : COR.azul

    return (
      <div style={{background:COR.branco,borderBottom:`2px solid ${COR.borda}`,
        padding:'10px 14px 12px',flexShrink:0,display:'flex',flexDirection:'column',gap:8}}>
        <div>
          <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:4}}>
            <span style={{fontSize:11,fontWeight:700,color:COR.verde}}>Receitas</span>
            <div style={{display:'flex',alignItems:'baseline',gap:4}}>
              <span style={{fontSize:14,fontWeight:800,color:COR.verde,fontVariantNumeric:'tabular-nums'}}>
                {totalRealE > 0 ? fmt(totalRealE) : '—'}
              </span>
              {totalPrevE > 0 && (
                <span style={{fontSize:10,color:COR.textoSuave,fontVariantNumeric:'tabular-nums'}}>
                  de {fmt(totalPrevE)}
                </span>
              )}
            </div>
          </div>
          <div style={{background:'#e9edf2',borderRadius:99,height:4,overflow:'hidden'}}>
            <div style={{width:`${percE*100}%`,height:4,borderRadius:99,background:barCorE,transition:'width .3s'}}/>
          </div>
        </div>
        <div>
          <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:4}}>
            <span style={{fontSize:11,fontWeight:700,color:COR.vermelho}}>Despesas</span>
            <div style={{display:'flex',alignItems:'baseline',gap:4}}>
              <span style={{fontSize:14,fontWeight:800,color:COR.vermelho,fontVariantNumeric:'tabular-nums'}}>
                {totalRealS > 0 ? fmt(totalRealS) : '—'}
              </span>
              {totalPrevS > 0 && (
                <span style={{fontSize:10,color:COR.textoSuave,fontVariantNumeric:'tabular-nums'}}>
                  de {fmt(totalPrevS)}
                </span>
              )}
            </div>
          </div>
          <div style={{background:'#e9edf2',borderRadius:99,height:4,overflow:'hidden'}}>
            <div style={{width:`${percS*100}%`,height:4,borderRadius:99,background:barCorS,transition:'width .3s'}}/>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
          paddingTop:8,borderTop:`1px solid ${COR.borda}`}}>
          <span style={{fontSize:11,fontWeight:600,color:COR.textoSuave}}>Resultado do mês</span>
          <span style={{fontSize:14,fontWeight:800,color:corSaldoReal,fontVariantNumeric:'tabular-nums'}}>
            {semDados ? '—' : fmt(saldoReal)}
          </span>
        </div>
      </div>
    )
  }

  // ── Desktop: tabela 3 linhas × 3 colunas ─────────────────
  const COL_LABEL = 100 // largura da coluna de rótulo (px)

  const linhas = [
    {
      rotulo: 'Previsto',
      rotuloCor: '#64748b',
      e: { val: totalPrevE, cor: '#64748b', fmt: (v: number) => v > 0 ? fmt(v) : '—' },
      s: { val: totalPrevS, cor: '#64748b', fmt: (v: number) => v > 0 ? fmt(v) : '—' },
      b: { val: saldoPrev,  cor: corSaldoPrev, fmt: (v: number) => semDados ? '—' : fmt(v) },
    },
    {
      rotulo: 'Realizado',
      rotuloCor: COR.azul,
      e: { val: totalRealE, cor: totalRealE > 0 ? COR.azul : '#94a3b8', fmt: (v: number) => v > 0 ? fmt(v) : '—' },
      s: { val: totalRealS, cor: totalRealS > 0 ? (totalRealS > totalPrevS ? COR.vermelho : COR.azul) : '#94a3b8', fmt: (v: number) => v > 0 ? fmt(v) : '—' },
      b: { val: saldoReal,  cor: corSaldoReal, fmt: (v: number) => semDados ? '—' : fmt(v) },
    },
    {
      rotulo: 'Diferença',
      rotuloCor: '#94a3b8',
      e: {
        val: diffE,
        cor: diffE >= 0 ? '#64748b' : COR.vermelho,
        fmt: (v: number) => semDados ? '—' : (v === 0 ? '—' : `${v > 0 ? '+' : ''}${fmt(v)}`),
      },
      s: {
        val: diffS,
        cor: diffS >= 0 ? COR.verde : COR.vermelho,
        fmt: (v: number) => semDados ? '—' : (v === 0 ? '—' : `${v > 0 ? '+' : ''}${fmt(v)}`),
      },
      b: {
        val: diffSaldo,
        cor: diffSaldo >= 0 ? COR.verde : COR.vermelho,
        fmt: (v: number) => semDados ? '—' : (v === 0 ? '—' : `${v > 0 ? '+' : ''}${fmt(v)}`),
      },
    },
  ]

  return (
    <div style={{
      background: COR.branco,
      borderBottom: `2px solid ${COR.borda}`,
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      {/* Cabeçalho das colunas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `${COL_LABEL}px 1fr 1fr 1fr`,
        borderBottom: `1px solid ${COR.borda}`,
      }}>
        <div style={{ padding: '6px 16px' }} />
        {['Entradas', 'Saídas', 'Saldo'].map((h, i) => (
          <div key={h} style={{
            padding: '6px 16px', textAlign: 'right',
            borderLeft: `1px solid ${COR.borda}`,
            fontSize: 9, fontWeight: 700, color: '#94a3b8',
            textTransform: 'uppercase' as const, letterSpacing: .5,
          }}>
            {h === 'Entradas' ? '↑ ' : h === 'Saídas' ? '↓ ' : ''}{h}
          </div>
        ))}
      </div>

      {/* Linhas de dados */}
      {linhas.map((linha, li) => (
        <div key={linha.rotulo} style={{
          display: 'grid',
          gridTemplateColumns: `${COL_LABEL}px 1fr 1fr 1fr`,
          borderBottom: li < linhas.length - 1 ? `1px solid #f1f5f9` : 'none',
          background: li === 2 ? '#f8faff' : COR.branco,
        }}>
          {/* Rótulo da linha */}
          <div style={{
            padding: '8px 16px', display: 'flex', alignItems: 'center',
            fontSize: 10, fontWeight: 700, color: linha.rotuloCor,
            textTransform: 'uppercase' as const, letterSpacing: .4,
          }}>
            {linha.rotulo}
          </div>

          {/* Entradas */}
          <div style={{ padding: '8px 16px', textAlign: 'right', borderLeft: `1px solid ${COR.borda}` }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: linha.e.cor, fontVariantNumeric: 'tabular-nums' }}>
              {linha.e.fmt(linha.e.val)}
            </span>
          </div>

          {/* Saídas */}
          <div style={{ padding: '8px 16px', textAlign: 'right', borderLeft: `1px solid ${COR.borda}` }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: linha.s.cor, fontVariantNumeric: 'tabular-nums' }}>
              {linha.s.fmt(linha.s.val)}
            </span>
          </div>

          {/* Saldo */}
          <div style={{ padding: '8px 16px', textAlign: 'right', borderLeft: `1px solid ${COR.borda}` }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: linha.b.cor, fontVariantNumeric: 'tabular-nums' }}>
              {linha.b.fmt(linha.b.val)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
