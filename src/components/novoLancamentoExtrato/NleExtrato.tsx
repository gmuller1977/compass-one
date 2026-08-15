import React from 'react'
import type { Conta, Categoria } from '../../context/AppContext'
import { iconeCategoria, ehCartaoCategoria } from '../../utils/categoriaIcone'
import {
  COR, fmt, NOMES_MESES, FORMAS_SAI, FORMAS_ENT,
  diaSemana, diaEfetivoFixa, BadgePag,
  formaPagCategoria, formaRecebCategoria,
  type CatFixa, type Lancamento, type DadosMes, type TipoLanc, type FormaPag,
} from './NleShared'

type Props = {
  // Layout
  isMobile: boolean
  mobileView: 'extrato' | 'form'
  isDinheiro: boolean

  // Time
  mes: number
  ano: number
  totalDias: number
  eMesAtual: boolean
  diaHoje: number
  anoHoje: number
  mesHoje: number

  // Data
  fixas: CatFixa[]
  categorias: Categoria[]
  mesDados: DadosMes
  saldosDia: Record<number, number>
  saldoBase: number
  saldoMes: number
  totalEntradas: number
  totalSaidas: number
  contas: Conta[]

  // Selection state
  diaSel: number
  diasAbertos: Set<number>
  highlightDia: number | null
  editandoId: string | null
  editandoFixaId: string | null
  mobileDiaForm: number | null

  // Form state
  fTipo: TipoLanc
  fCat: string
  fSubDesc: string
  fDesc: string
  fValor: string
  fPag: FormaPag
  categoriasSelect: Categoria[]
  subDescsDisponiveis: string[]

  // Refs
  valorInputRef: React.RefObject<HTMLInputElement | null>
  categoriaSelectRef: React.RefObject<HTMLSelectElement | null>
  hojeRef: React.RefObject<HTMLDivElement | null>

  // Handlers
  toggleDia: (dia: number) => void
  resetarParaNovo: (dia: number) => void
  setDiaSel: React.Dispatch<React.SetStateAction<number>>
  editarFixa: (dia: number, f: CatFixa) => void
  editarLancamento: (dia: number, l: Lancamento) => void
  excluir: (dia: number, id: string) => void
  lancar: () => void
  desconsolidarFixa: (fixaId: string) => void
  consolidarFixa: (fixaId: string) => void
  setMobileDiaForm: (dia: number | null) => void
  setFTipo: (t: TipoLanc) => void
  setFCat: (v: string) => void
  setFSubDesc: (v: string) => void
  setFDesc: (v: string) => void
  setFValor: (v: string) => void
  setFPag: (v: FormaPag) => void
  setEditandoId: (v: string | null) => void
  setEditandoFixaId: (v: string | null) => void
  ehAutomatico: (f: CatFixa) => boolean
}

export default function NleExtrato({
  isMobile, mobileView, isDinheiro,
  mes, ano, totalDias, eMesAtual, diaHoje, anoHoje, mesHoje,
  fixas, categorias, mesDados, saldosDia, saldoBase, saldoMes,
  totalEntradas, totalSaidas,
  contas,
  diaSel, diasAbertos, highlightDia, editandoId, editandoFixaId, mobileDiaForm,
  fTipo, fCat, fDesc, fValor, fPag,
  categoriasSelect,
  valorInputRef, categoriaSelectRef, hojeRef,
  toggleDia, resetarParaNovo, setDiaSel,
  editarFixa, editarLancamento, excluir, lancar,
  desconsolidarFixa, consolidarFixa,
  setMobileDiaForm,
  setFTipo, setFCat, setFSubDesc, setFDesc, setFValor, setFPag,
  setEditandoId, setEditandoFixaId,
  ehAutomatico,
}: Props) {
  const cartaoNomesExtrato = new Set(contas.filter(c => c.tipo === 'cartao').map(c => c.nome.toLowerCase()))

  return (
    <>
      {/* EXTRATO section */}
      <div style={{flex:1,display: isMobile && mobileView==='form' ? 'none' : 'flex',flexDirection:'column',overflow: isMobile ? 'visible' : 'hidden'}}>

        {/* Aviso fixo — fica acima do scroll */}
        {totalEntradas === 0 && totalSaidas === 0 &&
         fixas.filter(f => !ehCartaoCategoria(categorias, f.categoria)).length === 0 && (
          <div style={{
            margin: isMobile ? '6px 16px 0' : '12px 20px 0 32px',
            padding:'13px 16px', flexShrink: 0,
            background:'#eff6ff',borderRadius:12,
            border:'1px solid #bfdbfe',
            display:'flex',alignItems:'flex-start',gap:12,
          }}>
            <span style={{fontSize:20,lineHeight:1,flexShrink:0}}>💡</span>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:COR.azul,marginBottom:3}}>
                Nenhum lançamento este mês
              </div>
              <div style={{fontSize:12,color:'#3b82f6',lineHeight:1.5}}>
                {isMobile
                  ? 'Toque em qualquer dia abaixo para registrar.'
                  : 'Clique em um dia e use o painel à direita para registrar.'}
              </div>
            </div>
          </div>
        )}

        <div style={{flex:1,overflowY:'auto',
          display:'flex',flexDirection:'column',gap:isMobile?6:10,
          padding:isMobile?'0 0 0 0':'20px 20px 20px 32px'}}>

          {Array.from({length:totalDias},(_,i)=>i+1).map(dia => {
            const ehHoje   = eMesAtual && dia===diaHoje
            const passado  = eMesAtual ? dia<diaHoje : ano<anoHoje||(ano===anoHoje&&mes<mesHoje)
            const semana   = diaSemana(dia, mes, ano)
            const fs       = fixas.filter(f=>diaEfetivoFixa(f,mesDados.fixasMovidas,ehAutomatico(f),mes,ano,totalDias)===dia)
            const lsRaw    = mesDados.lancamentos[dia] ?? []
            const ls       = lsRaw
            const temItens = fs.length>0 || ls.length>0
            const temFixaPend = fs.some(f => {
              const conf = mesDados.fixasConsolidadas?.[f.id] !== undefined
                ? mesDados.fixasConsolidadas[f.id]
                : (ehAutomatico(f) && !eMesAtual && passado)
              return !conf
            })
            const saldoIni  = dia===1 ? saldoBase : (saldosDia[dia-1] ?? saldoBase)
            const diaFuturo = !passado && !ehHoje

            const entradasDia = fs.filter(f=>f.tipo==='entrada')
              .reduce((s,f)=>{const conf=mesDados.fixasConsolidadas?.[f.id]!==undefined?mesDados.fixasConsolidadas[f.id]:(ehAutomatico(f)&&!eMesAtual&&passado);return s+(conf?(mesDados.fixasValorOverride?.[f.id]??f.valor):f.valor)},0)
              + ls.filter(l=>l.tipo==='entrada').reduce((s,l)=>s+l.valor,0)
            const saidasDia = fs.filter(f=>f.tipo==='saida')
              .reduce((s,f)=>{const conf=mesDados.fixasConsolidadas?.[f.id]!==undefined?mesDados.fixasConsolidadas[f.id]:(ehAutomatico(f)&&!eMesAtual&&passado);return s+(conf?(mesDados.fixasValorOverride?.[f.id]??f.valor):f.valor)},0)
              + ls.filter(l=>l.tipo==='saida').reduce((s,l)=>s+l.valor,0)

            const entradasConf =
              fs.filter(f => f.tipo==='entrada' && (
                mesDados.fixasConsolidadas?.[f.id] !== undefined
                  ? mesDados.fixasConsolidadas[f.id]
                  : (ehAutomatico(f) && !eMesAtual && passado)
              ))
              .reduce((s,f) => s + (mesDados.fixasValorOverride?.[f.id] ?? f.valor), 0)
              + ls.filter(l => l.tipo==='entrada').reduce((s,l) => s + l.valor, 0)
            const saidasConf =
              fs.filter(f => f.tipo==='saida' && (
                mesDados.fixasConsolidadas?.[f.id] !== undefined
                  ? mesDados.fixasConsolidadas[f.id]
                  : (ehAutomatico(f) && !eMesAtual && passado)
              ))
              .reduce((s,f) => s + (mesDados.fixasValorOverride?.[f.id] ?? f.valor), 0)
              + ls.filter(l => l.tipo==='saida').reduce((s,l) => s + l.valor, 0)

            const entradasBoxVal = entradasConf
            const saidasBoxVal   = saidasConf
            const saldoDia = diaFuturo
              ? saldosDia[dia] ?? saldoIni
              : saldoIni + entradasConf - saidasConf
            const selecionado = diaSel===dia
            const aberto      = diasAbertos.has(dia)
            const corSaldo    = saldoDia<0 ? COR.vermelho : COR.verde

            return (
              <div key={dia}
                ref={ehHoje ? hojeRef : undefined}
                onClick={() => { setMobileDiaForm(null); toggleDia(dia); if(!isMobile) resetarParaNovo(dia); else setDiaSel(dia) }}
                style={{borderRadius:12,overflow:'hidden',flexShrink:0,cursor:'pointer',
                  position:'relative',zIndex:selecionado?7:6,
                  border:`1.5px solid ${selecionado?COR.azul:ehHoje?'#93c5fd':temFixaPend?'#fde68a':COR.borda}`,
                  background:COR.branco,
                  boxShadow:selecionado?`0 0 0 3px rgba(26,86,219,0.12)`:
                    ehHoje?`0 0 0 2px rgba(147,197,253,0.3)`:'none',
                  animation: highlightDia===dia ? 'rowSaved 1.2s ease-out' : undefined,
                }}>

                {/* Cabeçalho */}
                <div style={{display:'flex',alignItems:'stretch',minHeight:54,
                  background:selecionado?'#eff6ff':ehHoje?'#f0f7ff':temFixaPend?'#fffbeb':'#fafbff',
                  borderBottom:aberto&&(temItens||selecionado)?`1px solid ${selecionado?'#bfdbfe':COR.borda}`:'none'}}>

                  <div style={{width:isMobile?44:62,flexShrink:0,padding:isMobile?'8px 10px':'11px 13px',
                    borderRight:'1px solid #f1f5f9',display:'flex',flexDirection:'column',justifyContent:'center'}}>
                    <div style={{fontSize:18,fontWeight:800,lineHeight:1,
                      color:selecionado||ehHoje?COR.azul:temFixaPend?'#92400e':COR.texto}}>
                      {String(dia).padStart(2,'0')}
                    </div>
                    <div style={{fontSize:9,fontWeight:600,color:'#94a3b8',
                      textTransform:'uppercase',letterSpacing:.3,marginTop:1}}>
                      {semana}
                    </div>
                    {ehHoje && (
                      <div style={{fontSize:7,fontWeight:800,padding:'1px 5px',borderRadius:3,
                        display:'inline-block',marginTop:3,letterSpacing:.3,
                        background:'#1a56db',color:'#fff'}}>HOJE</div>
                    )}
                    {temFixaPend && (
                      <div style={{fontSize:7,fontWeight:800,padding:'1px 5px',borderRadius:3,
                        display:'inline-block',marginTop:ehHoje?2:3,letterSpacing:.3,
                        background:'#fde68a',color:'#92400e'}}>FIXA</div>
                    )}
                  </div>

                  {/* Boxes: mobile → Inicial|Movimentação|Final  desktop → Entradas|Saídas|Planejado|Saldo */}
                  <div style={{flex:1,display:'flex',alignItems:'center',
                    justifyContent:'flex-end',gap:isMobile?4:6,padding:isMobile?'0 8px':0}}>
                    {isMobile ? (<>
                      {/* Inicial */}
                      <div style={{display:'flex',flexDirection:'column',alignItems:'center',
                        padding:'5px 8px',borderRadius:10,flex:1,
                        background:'#f8faff',border:`1px solid ${COR.borda}`}}>
                        <span style={{fontSize:8,fontWeight:700,textTransform:'uppercase',
                          letterSpacing:.4,marginBottom:2,color:'#94a3b8'}}>Inicial</span>
                        <span style={{fontSize:11,fontWeight:700,color:'#64748b',letterSpacing:'-.3px'}}>
                          {fmt(saldoIni)}
                        </span>
                      </div>
                      {/* Movimentação */}
                      {(() => {
                        const mov = diaFuturo ? (entradasDia - saidasDia) : (entradasConf - saidasConf)
                        const pos = mov > 0; const neg = mov < 0
                        return (
                          <div style={{display:'flex',flexDirection:'column',alignItems:'center',
                            padding:'5px 8px',borderRadius:10,flex:1,
                            background:pos?'#f0fdf4':neg?'#fff1f2':'#f8faff',
                            border:`1px solid ${pos?'#bbf7d0':neg?'#fecdd3':COR.borda}`}}>
                            <span style={{fontSize:8,fontWeight:700,textTransform:'uppercase',
                              letterSpacing:.4,marginBottom:2,
                              color:pos?COR.verde:neg?COR.vermelho:'#94a3b8'}}>Mov.</span>
                            <span style={{fontSize:11,fontWeight:700,letterSpacing:'-.3px',
                              color:pos?COR.verde:neg?COR.vermelho:'#94a3b8'}}>
                              {mov===0?'—':`${mov>0?'+':'-'}${fmt(Math.abs(mov))}`}
                            </span>
                          </div>
                        )
                      })()}
                      {/* Final */}
                      <div style={{display:'flex',flexDirection:'column',alignItems:'center',
                        padding:'5px 8px',borderRadius:10,flex:1,
                        background:diaFuturo?'#f8faff':ehHoje?'#eff6ff':saldoDia<0?'#fff1f2':'#f0fdf4',
                        border:`1px solid ${diaFuturo?COR.borda:ehHoje?'#bfdbfe':saldoDia<0?'#fecdd3':'#bbf7d0'}`}}>
                        <span style={{fontSize:8,fontWeight:700,textTransform:'uppercase',
                          letterSpacing:.4,marginBottom:2,
                          color:diaFuturo?'#94a3b8':ehHoje?COR.azul:corSaldo}}>
                          {diaFuturo?'Prev.':ehHoje?'Atual':'Final'}
                        </span>
                        <span style={{fontSize:11,fontWeight:700,letterSpacing:'-.3px',
                          color:diaFuturo?'#64748b':ehHoje?COR.azul:corSaldo}}>
                          {fmt(saldoDia)}
                        </span>
                      </div>
                    </>) : (() => {
                      const planejadoDia = fs.filter(f => f.tipo==='saida' && !(
                        mesDados.fixasConsolidadas?.[f.id] !== undefined
                          ? mesDados.fixasConsolidadas[f.id]
                          : (ehAutomatico(f) && !eMesAtual && passado)
                      )).reduce((s,f) => s + (mesDados.fixasValorOverride?.[f.id] ?? f.valor), 0)
                      return (
                        <>
                          {/* 4-col grid: Entradas | Saídas | Planejado | Saldo */}
                          <div style={{flex:1,display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr'}}>
                            {[
                              {label:'Entradas', val:entradasBoxVal, fmt:(v:number)=>v===0?'—':`+${fmt(v)}`, cor:entradasConf>0?COR.azul:'#d1d5db'},
                              {label:'Saídas',   val:saidasBoxVal,   fmt:(v:number)=>v===0?'—':`-${fmt(v)}`, cor:saidasConf>0?COR.vermelho:'#d1d5db'},
                              {label:'Previsto', val:planejadoDia,   fmt:(v:number)=>v===0?'—':`-${fmt(v)}`, cor:planejadoDia>0?'#64748b':'#d1d5db'},
                              {label:diaFuturo?'Saldo previsto':passado?'Saldo final':'Saldo atual', val:saldoDia, fmt:(v:number)=>fmt(v), cor:diaFuturo?'#64748b':corSaldo},
                            ].map(col => (
                              <div key={col.label} style={{padding:'10px 12px',textAlign:'right',borderRight:'1px solid #f8faff'}}>
                                <div style={{fontSize:9,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.4,marginBottom:3}}>{col.label}</div>
                                <div style={{fontSize:13,fontWeight:700,color:col.cor,fontVariantNumeric:'tabular-nums'}}>{col.fmt(col.val)}</div>
                              </div>
                            ))}
                          </div>
                          {/* Botão ＋ */}
                          <div onClick={e => { e.stopPropagation(); resetarParaNovo(dia); setTimeout(()=>valorInputRef.current?.focus(),80) }}
                            style={{width:48,display:'flex',alignItems:'center',justifyContent:'center',borderLeft:'1px solid #f1f5f9',flexShrink:0,cursor:'pointer',fontSize:20,color:'#e2e8f0',transition:'all .15s'}}
                            onMouseEnter={e=>(e.currentTarget.style.cssText='width:48px;display:flex;align-items:center;justify-content:center;border-left:1px solid #f1f5f9;flex-shrink:0;cursor:pointer;font-size:20px;color:#1a56db;background:#f0f7ff;transition:all .15s')}
                            onMouseLeave={e=>(e.currentTarget.style.cssText='width:48px;display:flex;align-items:center;justify-content:center;border-left:1px solid #f1f5f9;flex-shrink:0;cursor:pointer;font-size:20px;color:#e2e8f0;transition:all .15s')}>
                            ＋
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>

                {/* Fixas */}
                {aberto && fs.map(f => {
                  const ehFaturaFixa = f.id.startsWith('cartao-')
                  const catVisual    = iconeCategoria(categorias, f.categoria)
                  const automatico   = ehAutomatico(f)
                  const consolidada  = mesDados.fixasConsolidadas?.[f.id] !== undefined
                    ? mesDados.fixasConsolidadas[f.id]
                    : (automatico && !eMesAtual && passado)
                  const corValor     = consolidada ? (f.tipo==='entrada'?COR.azul:COR.vermelho) : '#94a3b8'
                  const emEdicaoFixa = editandoFixaId === f.id
                  const valorMostrado = mesDados.fixasValorOverride?.[f.id] ?? f.valor
                  return (
                    <div key={f.id} onClick={e => e.stopPropagation()}
                      style={{background:emEdicaoFixa?'#eff6ff':'transparent'}}>
                      <div onClick={() => editarFixa(dia, f)}
                        style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',
                        padding:'10px 16px',borderBottom:`1px solid #f1f5f9`}}>
                        <input type="checkbox" checked={consolidada}
                          onClick={e => e.stopPropagation()}
                          onChange={() => {
                            if (consolidada) { desconsolidarFixa(f.id) }
                            else             { consolidarFixa(f.id) }
                          }}
                          title="Marcar como paga ✓"
                          style={{cursor:'pointer',width:15,height:15,flexShrink:0}} />
                        <div style={{width:32,height:32,borderRadius:8,flexShrink:0,
                          display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,
                          background:catVisual.cor,opacity:consolidada?1:0.5}}>
                          {catVisual.icone}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:500,
                            color:consolidada?COR.texto:'#94a3b8',
                            display:'flex',alignItems:'center',gap:5}}>
                            {ehFaturaFixa ? 'Cartão de Crédito' : f.nome}
                            <span style={{fontSize:9,padding:'1px 5px',borderRadius:3,fontWeight:600,
                              background:consolidada?'#e0f2fe':'#f1f5f9',
                              color:consolidada?'#0369a1':'#94a3b8'}}>
                              {consolidada ? (automatico && !eMesAtual && passado ? 'automática ✓' : 'paga ✓') : 'previsto'}
                            </span>
                          </div>
                          <div style={{fontSize:10,color:'#94a3b8',marginTop:2,
                            display:'flex',alignItems:'center',gap:4}}>
                            {ehFaturaFixa
                              ? `${f.categoria}${f.nome !== f.categoria ? ' · ' + f.nome : ''}`
                              : (f.descricao ?? f.subtitulo ?? f.categoria)
                            } <BadgePag fp={f.formaPagamento}/>
                          </div>
                        </div>
                        <div style={{fontSize:13,fontWeight:600,color:corValor}}>
                          {f.tipo==='entrada'?'+':'-'}{fmt(valorMostrado)}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Lançamentos variáveis */}
                {aberto && ls.map(l => {
                  const catVisual   = iconeCategoria(categorias, l.categoria)
                  const corValor    = l.tipo==='entrada' ? COR.azul : COR.vermelho
                  const emEdicao    = editandoId === l.id
                  const catLower    = l.categoria.toLowerCase()
                  const ehFaturaLanc = cartaoNomesExtrato.has(catLower) ||
                    (catLower.includes('cart') && (/cr[eé]d/.test(catLower) || catLower.includes('fatura')))
                  return (
                    <div key={l.id}
                      onClick={e => { e.stopPropagation(); if(!l.id.startsWith('fatura-')) editarLancamento(dia, l) }}
                      style={{display:'flex',alignItems:'center',gap:10,cursor:l.id.startsWith('fatura-')?'default':'pointer',
                        padding:'10px 16px',borderBottom:`1px solid #f1f5f9`,
                        background:emEdicao?'#eff6ff':'transparent'}}
                      onMouseEnter={e=>{ if(!emEdicao) e.currentTarget.style.background='#fafbff' }}
                      onMouseLeave={e=>{ if(!emEdicao) e.currentTarget.style.background='transparent' }}>
                      <div style={{width:32,height:32,borderRadius:8,flexShrink:0,
                        display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,
                        background:catVisual.cor}}>
                        {catVisual.icone}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:600,color:COR.texto,
                          display:'flex',alignItems:'center',gap:5}}>
                          {ehFaturaLanc ? 'Cartão de Crédito' : l.categoria}
                          <BadgePag fp={l.formaPagamento}/>
                        </div>
                        <div style={{fontSize:11,color:'#64748b',marginTop:1}}>
                          {ehFaturaLanc ? l.categoria : (l.subCategoria || l.descricao)}
                        </div>
                      </div>
                      <div style={{fontSize:13,fontWeight:600,color:corValor}}>
                        {l.tipo==='entrada'?'+':'-'}{fmt(l.valor)}
                      </div>
                      {!l.id.startsWith('fatura-') && (
                        <button onClick={e => { e.stopPropagation(); excluir(dia, l.id) }}
                          style={{border:'none',background:'transparent',cursor:'pointer',
                            color:'#cbd5e1',fontSize:14,padding:'2px 5px',borderRadius:6}}
                          onMouseEnter={e=>(e.currentTarget.style.color=COR.vermelho)}
                          onMouseLeave={e=>(e.currentTarget.style.color='#cbd5e1')}>✕</button>
                      )}
                    </div>
                  )
                })}

                {/* INLINE FORM — mobile only, dentro do dia card */}
                {isMobile && aberto && (
                  <>
                    <button
                      onClick={e => { e.stopPropagation()
                        if (mobileDiaForm===dia) { setMobileDiaForm(null) } else {
                          setMobileDiaForm(dia); setDiaSel(dia)
                          setFTipo('saida'); setFCat(''); setFSubDesc(''); setFDesc(''); setFValor(''); setFPag('debito')
                          setEditandoId(null); setEditandoFixaId(null)
                          setTimeout(()=>categoriaSelectRef.current?.focus(),80)
                        }
                      }}
                      style={{display:'flex',alignItems:'center',justifyContent:'center',gap:5,
                        padding:9,fontSize:11,fontWeight:600,color:COR.azul,
                        cursor:'pointer',border:'none',background:'#f8faff',width:'100%',
                        borderTop:`1px dashed #bfdbfe`}}>
                      + Adicionar neste dia
                    </button>
                    {mobileDiaForm === dia && (
                      <div onClick={e=>e.stopPropagation()}
                        style={{background:'#f0f9ff',borderTop:`2px solid ${COR.azul}`,padding:'12px 14px'}}>
                        <div style={{display:'flex',background:'#e0f2fe',borderRadius:8,padding:3,marginBottom:10,width:'fit-content'}}>
                          {(['saida','entrada'] as const).map(t=>(
                            <button key={t} onClick={()=>{setFTipo(t);setFPag(t==='entrada'?'pix':'debito')}} style={{
                              padding:'5px 14px',border:'none',borderRadius:6,cursor:'pointer',
                              fontSize:11,fontWeight:600,fontFamily:'inherit',
                              background:fTipo===t?COR.branco:'transparent',
                              color:fTipo===t?(t==='entrada'?COR.verde:COR.vermelho):'#0369a1',
                              boxShadow:fTipo===t?'0 1px 3px rgba(0,0,0,.1)':'none'}}>
                              {t==='saida'?'Pagamento':'Recebimento'}
                            </button>
                          ))}
                        </div>
                        <div style={{display:'flex',gap:6,marginBottom:8,flexWrap:'wrap' as never}}>
                          <div style={{flex:'1.5 1 100px',display:'flex',flexDirection:'column',gap:3}}>
                            <div style={{fontSize:9,color:'#0369a1',fontWeight:700,textTransform:'uppercase' as never,letterSpacing:.3}}>Categoria</div>
                            <select ref={categoriaSelectRef} value={fCat}
                              onChange={e=>{const n=e.target.value;setFCat(n);setFSubDesc('');const c=categorias.find((x: Categoria)=>x.nome===n);if(c)setFPag(fTipo==='entrada'?formaRecebCategoria(c.formaPagamento,c.tipoMovimento):formaPagCategoria(c.formaPagamento,c.tipoMovimento));if(n)setTimeout(()=>valorInputRef.current?.focus(),50)}}
                              style={{border:`1.5px solid #bae6fd`,borderRadius:10,padding:'8px 10px',fontSize:13,outline:'none',background:'#fff',fontFamily:'inherit',color:COR.texto}}>
                              <option value="">Selecione...</option>
                              {(() => {
                                const grps = new Map<string, Categoria[]>()
                                for (const c of categoriasSelect) {
                                  const g = c.grupo ?? ''
                                  if (!grps.has(g)) grps.set(g, [])
                                  grps.get(g)!.push(c)
                                }
                                return Array.from(grps.entries())
                                  .sort(([a],[b]) => a===''?1:b===''?-1:a.localeCompare(b,'pt-BR'))
                                  .map(([grupo, cats]) => grupo
                                    ? <optgroup key={grupo} label={grupo}>{cats.map(c=><option key={c.id} value={c.nome}>{c.nome}</option>)}</optgroup>
                                    : cats.map(c=><option key={c.id} value={c.nome}>{c.nome}</option>))
                              })()}
                            </select>
                          </div>
                          <div style={{flex:'2 1 120px',display:'flex',flexDirection:'column',gap:3}}>
                            <div style={{fontSize:9,color:'#0369a1',fontWeight:700,textTransform:'uppercase' as never,letterSpacing:.3}}>Descrição</div>
                            <input value={fDesc} onChange={e=>setFDesc(e.target.value)}
                              placeholder="Ex: Mercado Extra..."
                              style={{border:`1.5px solid #bae6fd`,borderRadius:10,padding:'8px 10px',fontSize:13,outline:'none',background:'#fff',fontFamily:'inherit',color:COR.texto}}
                              onKeyDown={e=>e.key==='Enter'&&lancar()}/>
                          </div>
                          <div style={{flex:'0 0 90px',display:'flex',flexDirection:'column',gap:3}}>
                            <div style={{fontSize:9,color:'#0369a1',fontWeight:700,textTransform:'uppercase' as never,letterSpacing:.3}}>Valor</div>
                            <input ref={valorInputRef} value={fValor} onChange={e=>setFValor(e.target.value)}
                              placeholder="R$ 0,00" inputMode="decimal"
                              style={{border:`1.5px solid #bae6fd`,borderRadius:10,padding:'8px 10px',fontSize:13,outline:'none',background:'#fff',fontFamily:'inherit',color:COR.texto}}
                              onKeyDown={e=>e.key==='Enter'&&lancar()}/>
                          </div>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap' as never,marginBottom:8}}>
                          <span style={{fontSize:10,color:'#0369a1',fontWeight:600}}>Pgto:</span>
                          {(fTipo==='entrada'?FORMAS_ENT:FORMAS_SAI).filter(p=>isDinheiro||p.id!=='dinheiro').map(p=>(
                            <button key={p.id} onClick={()=>setFPag(p.id)} style={{
                              padding:'4px 10px',border:`1.5px solid ${fPag===p.id?COR.azul:'#bae6fd'}`,
                              borderRadius:6,cursor:'pointer',fontSize:10,fontWeight:600,
                              background:fPag===p.id?'#eff6ff':'#fff',color:fPag===p.id?COR.azul:'#0369a1',
                              fontFamily:'inherit'}}>
                              {p.label}
                            </button>
                          ))}
                        </div>
                        <div style={{display:'flex',gap:6}}>
                          <button onClick={()=>setMobileDiaForm(null)}
                            style={{flex:1,padding:'9px 0',border:`1.5px solid ${COR.borda}`,borderRadius:8,
                              background:'#fff',color:COR.textoSuave,fontSize:12,fontWeight:600,
                              cursor:'pointer',fontFamily:'inherit'}}>Cancelar</button>
                          <button onClick={lancar}
                            style={{flex:2,padding:'9px 0',border:'none',borderRadius:8,
                              background:`linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,
                              color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Lançar</button>
                        </div>
                        <div style={{fontSize:9,color:'#0369a1',marginTop:8,opacity:.7}}>↵ Enter no valor para salvar</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}

          {/* Saldo final — mobile inline */}
          {isMobile && (
            <div style={{margin:'4px 0 8px',borderRadius:14,
              background:(saldosDia[totalDias]??saldoMes)<0?'linear-gradient(135deg,#7f1d1d,#dc2626)':`linear-gradient(135deg,${COR.azulEscuro},${COR.azulMedio})`,
              padding:'14px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
              <span style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,.7)'}}>
                Saldo final — {NOMES_MESES[mes]} {ano}
              </span>
              <span style={{fontSize:17,fontWeight:800,color:'#fff',letterSpacing:'-.5px'}}>
                {fmt(saldosDia[totalDias]??saldoMes)}
              </span>
            </div>
          )}
        </div>

        {/* Saldo final previsto — barra fixa desktop */}
        {!isMobile && (() => {
          const sf = saldosDia[totalDias] ?? saldoMes
          const positivo = sf >= 0
          return (
            <div style={{padding:'8px 16px',flexShrink:0,borderTop:'1px solid #e2e8f0',background:'#f8faff'}}>
              <div style={{
                borderRadius:12,
                background: positivo
                  ? 'linear-gradient(135deg,#0f2878,#2563eb)'
                  : 'linear-gradient(135deg,#7f1d1d,#dc2626)',
                padding:'12px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',
              }}>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:'#fff'}}>Saldo final previsto</div>
                  <div style={{fontSize:10,color:'rgba(255,255,255,.75)',marginTop:2}}>{NOMES_MESES[mes]} {ano}</div>
                </div>
                <span style={{fontSize:22,fontWeight:800,letterSpacing:'-.6px',fontVariantNumeric:'tabular-nums',
                  color: positivo ? '#86efac' : '#fca5a5'}}>
                  {fmt(sf)}
                </span>
              </div>
            </div>
          )
        })()}
      </div>
    </>
  )
}
