import { COR, fmt, parseBRL, NOMES_MESES } from './NleShared'

type Props = {
  isMobile: boolean
  tabPrincipal: 'extrato' | 'cartao' | 'dinheiro' | 'consolidado'
  saldoBase: number
  totalEntradas: number
  totalSaidas: number
  saldoMes: number
  mes: number
  ano: number
  saldoBancoInline: string
  setSaldoBancoInline: (v: string) => void
  onSaldoBancoBlur: () => void
  onSaldoBancoEnter: () => void
  mostrarCalendario: boolean
  anoCalendario: number
  setAnoCalendario: (fn: (a: number) => number) => void
  calPos: { top: number; left: number }
  onMesSelect: (mes: number, ano: number) => void
  setMostrarCalendario: (v: boolean) => void
}

export default function NleBanner({
  isMobile, tabPrincipal,
  saldoBase, totalEntradas, totalSaidas, saldoMes,
  mes, ano,
  saldoBancoInline, setSaldoBancoInline,
  onSaldoBancoBlur, onSaldoBancoEnter,
  mostrarCalendario, anoCalendario, setAnoCalendario, calPos,
  onMesSelect, setMostrarCalendario,
}: Props) {
  if (isMobile || (tabPrincipal !== 'extrato' && tabPrincipal !== 'dinheiro')) return null

  const saldoBancoInlineNum = parseBRL(saldoBancoInline)
  const diferencaInline  = saldoBancoInlineNum > 0 ? saldoBancoInlineNum - saldoMes : null
  const conciliadoInline = diferencaInline !== null && Math.abs(diferencaInline) < 0.01

  return (
    <>
      <div style={{background:'linear-gradient(135deg,#0f2878,#1e40af)',padding:'14px 16px',display:'flex',alignItems:'center',flexShrink:0}}>
        <div style={{flex:1,display:'flex',flexDirection:'column',background:'rgba(255,255,255,.10)',border:'1px solid rgba(255,255,255,.15)',borderRadius:12,padding:'12px 14px',marginRight:8}}>
          <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,.7)',textTransform:'uppercase',letterSpacing:.5,marginBottom:6}}>💰 Saldo inicial</div>
          <div style={{fontSize:17,fontWeight:800,color:'#fff',letterSpacing:'-.4px'}}>{fmt(saldoBase)}</div>
          <div style={{fontSize:10,color:'rgba(255,255,255,.55)',marginTop:3}}>{NOMES_MESES[mes]} {ano}</div>
        </div>
        <div style={{flex:1,display:'flex',flexDirection:'column',background:'rgba(255,255,255,.10)',border:'1px solid rgba(255,255,255,.15)',borderRadius:12,padding:'12px 14px',marginRight:8}}>
          <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,.7)',textTransform:'uppercase',letterSpacing:.5,marginBottom:6}}>↑ Entradas</div>
          <div style={{fontSize:17,fontWeight:800,color:'#93c5fd',letterSpacing:'-.4px'}}>{fmt(totalEntradas)}</div>
          <div style={{fontSize:10,color:'rgba(255,255,255,.55)',marginTop:3}}>lançadas</div>
        </div>
        <div style={{flex:1,display:'flex',flexDirection:'column',background:'rgba(255,255,255,.10)',border:'1px solid rgba(255,255,255,.15)',borderRadius:12,padding:'12px 14px',marginRight:8}}>
          <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,.7)',textTransform:'uppercase',letterSpacing:.5,marginBottom:6}}>↓ Saídas</div>
          <div style={{fontSize:17,fontWeight:800,color:'#fca5a5',letterSpacing:'-.4px'}}>{fmt(totalSaidas)}</div>
          <div style={{fontSize:10,color:'rgba(255,255,255,.55)',marginTop:3}}>lançadas</div>
        </div>
        <div style={{flex:1,display:'flex',flexDirection:'column',background:'rgba(255,255,255,.10)',border:'1px solid rgba(255,255,255,.15)',borderRadius:12,padding:'12px 14px',marginRight:8}}>
          <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,.7)',textTransform:'uppercase',letterSpacing:.5,marginBottom:6}}>= Saldo atual</div>
          <div style={{fontSize:17,fontWeight:800,color:saldoMes>=0?'#86efac':'#fca5a5',letterSpacing:'-.4px'}}>{fmt(saldoMes)}</div>
          <div style={{fontSize:10,color:saldoMes>=0?'#86efac':'#fca5a5',marginTop:3}}>{saldoMes>=0?'↑ positivo':'↓ negativo'}</div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:5,background:'rgba(255,255,255,.10)',border:'1px solid rgba(255,255,255,.15)',borderRadius:12,padding:'12px 14px',flexShrink:0}}>
          <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,.7)',textTransform:'uppercase',letterSpacing:.5,marginBottom:2}}>🔄 Conciliação</div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:10,color:'rgba(255,255,255,.6)',minWidth:80}}>Saldo no banco</span>
            <input value={saldoBancoInline} onChange={e=>setSaldoBancoInline(e.target.value)}
              onBlur={onSaldoBancoBlur}
              onKeyDown={e=>{ if(e.key==='Enter'){ onSaldoBancoEnter(); (e.target as HTMLInputElement).blur() } }}
              placeholder="R$ 0,00"
              style={{background:'#fff',border:'2px solid rgba(255,255,255,.5)',borderRadius:8,padding:'6px 10px',fontSize:13,fontWeight:800,color:'#0f172a',outline:'none',width:130,fontFamily:'inherit',boxShadow:'0 2px 8px rgba(0,0,0,.15)'}}/>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:10,color:'rgba(255,255,255,.6)',minWidth:80}}>Diferença</span>
            <span style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:6,whiteSpace:'nowrap' as const,
              background:diferencaInline===null?'rgba(100,116,139,.3)':conciliadoInline?'rgba(34,197,94,.2)':'rgba(239,68,68,.2)',
              color:diferencaInline===null?'rgba(255,255,255,.4)':conciliadoInline?'#86efac':'#fca5a5'}}>
              {diferencaInline===null?'— informar':conciliadoInline?'✓ Conciliado':`${diferencaInline>0?'+':'-'}${fmt(Math.abs(diferencaInline))}`}
            </span>
          </div>
        </div>
      </div>

      {/* Calendar popup */}
      {mostrarCalendario && (
        <div style={{position:'fixed',top:calPos.top,left:calPos.left,zIndex:200,background:'#fff',borderRadius:14,boxShadow:'0 8px 32px rgba(0,0,0,.18)',padding:16,minWidth:272}}
          onClick={e=>e.stopPropagation()}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <button onClick={()=>setAnoCalendario(a=>a-1)} style={{border:'none',background:'#eff6ff',color:COR.azul,borderRadius:6,padding:'4px 12px',fontSize:16,cursor:'pointer',fontFamily:'inherit'}}>‹</button>
            <span style={{fontWeight:700,fontSize:15,color:COR.texto}}>{anoCalendario}</span>
            <button onClick={()=>setAnoCalendario(a=>a+1)} style={{border:'none',background:'#eff6ff',color:COR.azul,borderRadius:6,padding:'4px 12px',fontSize:16,cursor:'pointer',fontFamily:'inherit'}}>›</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
            {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((abrev,i) => {
              const ativo = i===mes && anoCalendario===ano
              return (
                <button key={i} onClick={() => { onMesSelect(i, anoCalendario); setMostrarCalendario(false) }}
                  style={{padding:'8px 4px',border:'none',borderRadius:8,cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:ativo?700:500,background:ativo?COR.azul:'#f1f5f9',color:ativo?'#fff':COR.texto}}>
                  {abrev}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
