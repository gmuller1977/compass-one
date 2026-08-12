import React from 'react'
import type { Conta, Categoria } from '../../context/AppContext'
import { iconeCategoria } from '../../utils/categoriaIcone'
import {
  COR, NOMES_MESES, fmt, diaSemana,
  type Lancamento, type DadosMes,
} from './FcShared'

type Props = {
  // Card tabs
  contasCartao: Conta[]
  contaId: string
  setContaId: (id: string) => void

  // Month navigation
  mes: number
  setMes: React.Dispatch<React.SetStateAction<number>>
  ano: number
  setAno: React.Dispatch<React.SetStateAction<number>>

  // Totals
  totalFatura: number
  totalPrevisto: number
  grandTotalFaturas: number
  diferenca: number | null
  conciliado: boolean
  faturaStatus: 'paga' | 'fechada' | 'aberta'

  // Current card/month data
  diaFechamento: number
  diaVencimento: number
  mesDados: DadosMes
  totalDias: number
  purchaseMes: number
  purchaseAno: number
  mesVenc: number
  anoVenc: number

  // Transaction list
  editandoId: string | null
  diasFechados: Set<string>
  categorias: Categoria[]

  // Calendar popover
  mostrarCalendario: boolean
  setMostrarCalendario: React.Dispatch<React.SetStateAction<boolean>>
  anoCalendario: number
  setAnoCalendario: React.Dispatch<React.SetStateAction<number>>
  calPos: { top: number; left: number }
  setCalPos: React.Dispatch<React.SetStateAction<{ top: number; left: number }>>
  calBtnRef: React.RefObject<HTMLButtonElement | null>

  // Handlers
  resetarParaNovo: (dia: number) => void
  diaDefaultPara: (mes: number, ano: number) => number
  editarLancamento: (dia: number, l: Lancamento) => void
  excluir: (dia: number, id: string) => void
  toggleDia: (dateKey: string) => void
  setDiaSel: React.Dispatch<React.SetStateAction<number>>
}

export default function FcDesktopLeft({
  contasCartao, contaId, setContaId,
  mes, setMes, ano, setAno,
  totalFatura, totalPrevisto, grandTotalFaturas,
  diferenca, conciliado, faturaStatus,
  diaFechamento, diaVencimento,
  mesDados, totalDias, purchaseMes, purchaseAno, mesVenc, anoVenc,
  editandoId, diasFechados, categorias,
  mostrarCalendario, setMostrarCalendario,
  anoCalendario, setAnoCalendario,
  calPos, setCalPos, calBtnRef,
  resetarParaNovo, diaDefaultPara, editarLancamento, excluir, toggleDia, setDiaSel,
}: Props) {
  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>

      {/* ABAS DE CARTÃO */}
      <div style={{background:COR.branco,borderBottom:`1px solid ${COR.borda}`,
        padding:'10px 16px 0',flexShrink:0,display:'flex',gap:3,overflowX:'auto'}}>
        {contasCartao.map(c => {
          const ativa = c.id===contaId
          return (
            <button key={c.id} onClick={() => { setContaId(c.id); resetarParaNovo(diaDefaultPara(mes,ano)) }} style={{
              display:'flex',alignItems:'center',gap:6,
              padding:'7px 14px',borderRadius:'8px 8px 0 0',
              border:`1px solid ${ativa?COR.azul:COR.borda}`,
              cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',
              background:ativa?COR.azul:'#f8faff',color:ativa?'#fff':COR.textoSuave,
              position:'relative',zIndex:ativa?1:0,textAlign:'left'}}>
              <div style={{width:7,height:7,borderRadius:'50%',flexShrink:0,background:ativa?'#fff':c.cor}}/>
              <div>
                <div style={{fontSize:12,fontWeight:ativa?700:600}}>{c.banco}</div>
                {c.apelido && (
                  <div style={{fontSize:10,fontWeight:400,color:ativa?'rgba(255,255,255,0.75)':'#94a3b8',marginTop:1}}>
                    {c.apelido}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Barra Total da fatura com seletor de mês */}
      <div style={{borderRadius:0,padding:'10px 16px',flexShrink:0,position:'relative',
        background:totalFatura<0?'linear-gradient(135deg,#7f1d1d,#dc2626)':`linear-gradient(135deg,${COR.azulEscuro},${COR.azulMedio})`,
        display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:4}}>
          <button onClick={() => { const prevMesNav = () => { if (mes===0){setMes(11);setAno(y=>y-1)}else setMes(m=>m-1) }; prevMesNav() }}
            style={{border:'none',background:'rgba(255,255,255,.15)',color:'#fff',
              borderRadius:6,padding:'3px 10px',fontSize:16,cursor:'pointer',fontFamily:'inherit',lineHeight:1}}>‹</button>
          <button ref={calBtnRef} onClick={(e) => {
              e.stopPropagation()
              const rect = calBtnRef.current?.getBoundingClientRect()
              if (rect) setCalPos({top: rect.bottom + 8, left: rect.left})
              setAnoCalendario(ano)
              setMostrarCalendario(v=>!v)
            }}
            style={{border:'none',background:'transparent',color:'rgba(255,255,255,.9)',
              fontWeight:600,fontSize:13,cursor:'pointer',fontFamily:'inherit',
              padding:'4px 8px',borderRadius:6,transition:'background .15s'}}
            onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,.12)')}
            onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
            Total da fatura — {NOMES_MESES[mes]} {ano}
          </button>
          <button onClick={() => { const nextMesNav = () => { if (mes===11){setMes(0);setAno(y=>y+1)}else setMes(m=>m+1) }; nextMesNav() }}
            style={{border:'none',background:'rgba(255,255,255,.15)',color:'#fff',
              borderRadius:6,padding:'3px 10px',fontSize:16,cursor:'pointer',fontFamily:'inherit',lineHeight:1}}>›</button>
        </div>
        <span style={{fontSize:18,fontWeight:700,color:'#fff',fontVariantNumeric:'tabular-nums'}}>
          {fmt(totalFatura)}
        </span>
        {mostrarCalendario && (
          <div style={{position:'fixed',top:calPos.top,left:calPos.left,zIndex:200,
            background:'#fff',borderRadius:14,boxShadow:'0 8px 32px rgba(0,0,0,.18)',
            padding:16,minWidth:272}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
              <button onClick={()=>setAnoCalendario(a=>a-1)}
                style={{border:'none',background:'#eff6ff',color:COR.azul,borderRadius:6,
                  padding:'4px 12px',fontSize:16,cursor:'pointer',fontFamily:'inherit'}}>‹</button>
              <span style={{fontWeight:700,fontSize:15,color:COR.texto}}>{anoCalendario}</span>
              <button onClick={()=>setAnoCalendario(a=>a+1)}
                style={{border:'none',background:'#eff6ff',color:COR.azul,borderRadius:6,
                  padding:'4px 12px',fontSize:16,cursor:'pointer',fontFamily:'inherit'}}>›</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
              {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((abrev,i) => {
                const ativo = i===mes && anoCalendario===ano
                return (
                  <button key={i} onClick={() => {
                    setMes(i); setAno(anoCalendario)
                    resetarParaNovo(diaDefaultPara(i, anoCalendario))
                    setMostrarCalendario(false)
                  }} style={{
                    padding:'8px 4px',border:'none',borderRadius:8,cursor:'pointer',
                    fontFamily:'inherit',fontSize:12,fontWeight:ativo?700:500,
                    background:ativo?COR.azul:'#f1f5f9',
                    color:ativo?'#fff':COR.texto}}>
                    {abrev}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* RESUMO ORÇAMENTO CARTÃO */}
      {(() => {
        const disponivel = totalPrevisto - grandTotalFaturas
        return (
          <div style={{background:'#f8faff',borderBottom:`1px solid ${COR.borda}`,
            padding:'6px 16px',flexShrink:0,display:'flex',alignItems:'center',gap:0,overflowX:'auto'}}>
            <div style={{display:'flex',alignItems:'center',gap:6,
              padding:'3px 16px',borderRight:`1px solid ${COR.borda}`,flexShrink:0}}>
              <span style={{fontSize:11,color:COR.textoSuave,whiteSpace:'nowrap'}}>Limite Planejado</span>
              <span style={{fontSize:13,fontWeight:700,color:COR.texto,whiteSpace:'nowrap'}}>
                {fmt(totalPrevisto)}
              </span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6,
              padding:'3px 16px',borderRight:`1px solid ${COR.borda}`,flexShrink:0}}>
              <span style={{fontSize:11,color:COR.textoSuave,whiteSpace:'nowrap'}}>Total Utilizado</span>
              <span style={{fontSize:13,fontWeight:700,
                color:grandTotalFaturas>0?COR.vermelho:grandTotalFaturas<0?COR.verde:COR.textoSuave,
                whiteSpace:'nowrap'}}>
                {fmt(grandTotalFaturas)}
              </span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6,
              padding:'3px 16px',flexShrink:0}}>
              <span style={{fontSize:11,color:COR.textoSuave,whiteSpace:'nowrap'}}>Valor Disponível</span>
              <span style={{fontSize:13,fontWeight:700,
                color:disponivel>=0?COR.verde:COR.vermelho,
                whiteSpace:'nowrap'}}>
                {fmt(disponivel)}
              </span>
            </div>
          </div>
        )
      })()}

      {/* BARRA DE RESUMO */}
      <div style={{background:COR.branco,borderBottom:`2px solid ${COR.borda}`,
        padding:'10px 16px',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>

          {/* Pill: Diferença */}
          {(() => {
            const cor = diferenca===null ? '#64748b' : conciliado ? '#16a34a' : Math.abs(diferenca)<50 ? '#d97706' : '#dc2626'
            const lbl = diferenca===null ? '—' : conciliado ? '✓ Conciliado' : `${diferenca>0?'+':'-'} ${fmt(Math.abs(diferenca))}`
            return (
              <div style={{display:'inline-flex',alignItems:'center',gap:6,
                padding:'4px 12px',borderRadius:20,whiteSpace:'nowrap',
                background:cor+'18',border:`1.5px solid ${cor}44`}}>
                <span style={{fontSize:11,fontWeight:600,color:cor}}>Diferença</span>
                <span style={{fontSize:14,fontWeight:800,color:cor}}>{lbl}</span>
              </div>
            )
          })()}

          <span style={{color:COR.borda}}>|</span>

          {/* Pill: Status */}
          {(() => {
            const cor = faturaStatus==='paga' ? '#16a34a' : faturaStatus==='fechada' ? '#0369a1' : '#d97706'
            const simbolo = faturaStatus==='paga' ? '✓' : faturaStatus==='fechada' ? '■' : '●'
            const lbl = faturaStatus==='paga' ? 'Paga' : faturaStatus==='fechada' ? 'Fechada' : 'Aberta'
            return (
              <div style={{display:'inline-flex',alignItems:'center',gap:6,
                padding:'4px 12px',borderRadius:20,whiteSpace:'nowrap',
                background:cor+'18',border:`1.5px solid ${cor}44`}}>
                <span style={{fontSize:13,color:cor}}>{simbolo}</span>
                <span style={{fontSize:14,fontWeight:800,color:cor}}>{lbl}</span>
              </div>
            )
          })()}

        </div>
      </div>

      {/* LISTA DE LANÇAMENTOS agrupados por dia */}
      <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:8,padding:'10px 16px'}}>

        {(() => {
          type DiaGroup = { dateKey:string; dc:number; mc:number; ac:number; items:Array<{dia:number;l:Lancamento}> }
          const groupMap = new Map<string, DiaGroup>()
          for (let d = 1; d <= totalDias; d++) {
            for (const l of (mesDados.lancamentos[d] ?? [])) {
              const dc = l.diaCompra ?? d
              const mc = l.mesCompra ?? purchaseMes
              const ac = l.anoCompra ?? purchaseAno
              const dateKey = `${ac}-${String(mc+1).padStart(2,'0')}-${String(dc).padStart(2,'0')}`
              if (!groupMap.has(dateKey)) groupMap.set(dateKey, {dateKey, dc, mc, ac, items:[]})
              groupMap.get(dateKey)!.items.push({dia:d, l})
            }
          }

          if (groupMap.size === 0) {
            return (
              <div style={{textAlign:'center',color:COR.textoSuave,padding:40,fontSize:13}}>
                Nenhum lançamento nesta fatura.
              </div>
            )
          }

          // Decrescente: mais recente primeiro
          const grupos = [...groupMap.values()].sort((a,b) => b.dateKey.localeCompare(a.dateKey))

          const isAfterClosing = (g: DiaGroup) => {
            if (g.ac > purchaseAno) return true
            if (g.ac < purchaseAno) return false
            if (g.mc > purchaseMes) return true
            if (g.mc < purchaseMes) return false
            return g.dc > diaFechamento
          }

          return grupos.map((grupo, gIdx) => {
            const {dateKey, dc, mc, ac, items} = grupo
            const aberto = !diasFechados.has(dateKey)
            const semana = diaSemana(dc, mc, ac)
            const mesAno = (mc !== purchaseMes || ac !== purchaseAno)
              ? `${NOMES_MESES[mc]}${ac !== purchaseAno ? ' '+ac : ''}`
              : NOMES_MESES[mc]
            const prevGrupo = gIdx > 0 ? grupos[gIdx-1] : null
            // divider aparece quando saímos da zona "após fechamento" para a zona normal
            const showFechDiv = prevGrupo !== null && isAfterClosing(prevGrupo) && !isAfterClosing(grupo)

            return [
              showFechDiv ? (
                <div key={`div-${dateKey}`}
                  style={{display:'flex',alignItems:'center',gap:8,padding:'4px 0'}}>
                  <div style={{flex:1,height:1,background:COR.borda}}/>
                  <span style={{fontSize:10,color:COR.textoSuave,fontWeight:600,letterSpacing:.3}}>
                    Período da fatura
                  </span>
                  <div style={{flex:1,height:1,background:COR.borda}}/>
                </div>
              ) : null,

              <div key={dateKey}
                style={{borderRadius:12,overflow:'hidden',flexShrink:0,
                  border:`1.5px solid ${COR.borda}`,background:COR.branco}}>

                {/* Cabeçalho do dia */}
                <div
                  onClick={() => toggleDia(dateKey)}
                  style={{display:'flex',alignItems:'center',gap:12,padding:'10px 16px',
                    cursor:'pointer',userSelect:'none',background:'#fafbff',
                    borderBottom:aberto?`1px solid ${COR.borda}`:'none'}}>

                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',
                    minWidth:32,flexShrink:0}}>
                    <span style={{fontSize:18,fontWeight:700,lineHeight:1,color:COR.texto}}>
                      {String(dc).padStart(2,'0')}
                    </span>
                    <span style={{fontSize:10,color:'#94a3b8',fontWeight:500,
                      textTransform:'uppercase',letterSpacing:.3,marginTop:1}}>
                      {semana}
                    </span>
                  </div>

                  <span style={{fontSize:12,color:COR.textoSuave,flex:1}}>{mesAno}</span>

                  <span style={{fontSize:16,color:'#94a3b8',display:'inline-block',
                    transition:'transform .2s',
                    transform:aberto?'rotate(180deg)':'rotate(0deg)'}}>⌄</span>
                </div>

                {/* Lançamentos do dia */}
                {aberto && items.map(({dia, l}) => {
                  const catVisual = iconeCategoria(categorias, l.categoria)
                  const emEdicao  = editandoId === l.id
                  return (
                    <div key={l.id}
                      onClick={() => { editarLancamento(dia, l); setDiaSel(dia) }}
                      style={{display:'flex',alignItems:'center',gap:12,cursor:'pointer',
                        padding:'12px 14px',flexShrink:0,
                        background: emEdicao ? '#eff6ff' : COR.branco,
                        borderBottom:`1px solid ${COR.borda}`,
                        borderLeft: emEdicao ? `3px solid ${COR.azul}` : '3px solid transparent'}}
                      onMouseEnter={e=>{ if(!emEdicao) e.currentTarget.style.background='#fafbff' }}
                      onMouseLeave={e=>{ if(!emEdicao) e.currentTarget.style.background=COR.branco }}>
                      <div style={{width:38,height:38,borderRadius:10,flexShrink:0,
                        display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,
                        background:catVisual.cor}}>
                        {catVisual.icone}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600,color:COR.texto,
                          whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                          {l.categoria}
                        </div>
                        {l.descricao && l.descricao !== l.categoria && (
                          <div style={{fontSize:11,color:COR.textoSuave,marginTop:1,
                            whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                            {l.descricao}
                          </div>
                        )}
                      </div>
                      {l.parcelas && l.parcelas > 1 && (
                        <span style={{fontSize:11,padding:'3px 8px',borderRadius:6,fontWeight:700,
                          flexShrink:0,background:'#ede9fe',color:'#7c3aed'}}>
                          {l.parcelaAtual}&nbsp;de&nbsp;{l.parcelas}
                        </span>
                      )}
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <div style={{fontSize:14,fontWeight:700,
                          color:l.tipo==='entrada'?COR.azul:COR.vermelho}}>
                          {l.tipo==='entrada'?'+':'-'}{fmt(l.valor)}
                        </div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); excluir(dia, l.id) }}
                        style={{border:'none',background:'transparent',cursor:'pointer',
                          color:'#cbd5e1',fontSize:14,padding:'2px 5px',borderRadius:6,flexShrink:0}}
                        onMouseEnter={e=>(e.currentTarget.style.color=COR.vermelho)}
                        onMouseLeave={e=>(e.currentTarget.style.color='#cbd5e1')}>✕</button>
                    </div>
                  )
                })}
              </div>
            ]
          })
        })()}

      </div>

      {/* FOOTER: total da fatura */}
      <div style={{flexShrink:0,
        background:totalFatura<0?'linear-gradient(135deg,#7f1d1d,#dc2626)':`linear-gradient(135deg,${COR.azulEscuro},${COR.azulMedio})`,
        padding:'10px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:10,fontWeight:600,color:'rgba(255,255,255,.6)'}}>
            Total da fatura — {NOMES_MESES[mes]} {ano}
          </div>
          <div style={{fontSize:9,color:'rgba(255,255,255,.4)',marginTop:1}}>
            Vence dia {diaVencimento} de {NOMES_MESES[mesVenc]} {anoVenc}
          </div>
        </div>
        <span style={{fontSize:18,fontWeight:800,color:'#fff',fontVariantNumeric:'tabular-nums' as const}}>
          {fmt(totalFatura)}
        </span>
      </div>

    </div>
  )
}
