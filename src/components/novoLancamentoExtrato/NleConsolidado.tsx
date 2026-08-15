import React from 'react'
import type { Conta, Categoria } from '../../context/AppContext'
import {
  COR, fmt, NOMES_MESES, FORMAS_SAI, FORMAS_ENT,
  realcarFoco, removerRealce, diaSemana,
  formaPagCategoria, formaRecebCategoria,
  type TipoLanc, type FormaPag,
} from './NleShared'

type SaldoConta  = { conta: Conta; saldo: number }
type FaturaCartao = { conta: Conta; fatura: number }
type RecentLanc  = {
  dia: number; banco: string; icone: string; cor: string
  categoria: string; descricao: string; valor: number; tipo: string
}

type Props = {
  isMobile: boolean
  mobileView: 'extrato' | 'form'
  setMobileView: (v: 'extrato' | 'form') => void

  // Visão Geral data
  saldoAtualPorConta: SaldoConta[]
  faturaAtualPorCartao: FaturaCartao[]
  totalEntradasMes: number
  totalSaidasMes: number
  recentLancs: RecentLanc[]
  mes: number
  ano: number

  // Consolidado form state
  fBancoConsolidado: string
  setFBancoConsolidado: (v: string) => void
  diaSel: number
  setDiaSel: (v: number) => void
  totalDias: number
  fTipo: TipoLanc
  setFTipo: (v: TipoLanc) => void
  setFPag: (v: FormaPag) => void
  fPag: FormaPag
  contas: Conta[]
  contasExtrato: Conta[]
  fCat: string
  setFCat: (v: string) => void
  fSubDesc: string
  setFSubDesc: (v: string) => void
  fDesc: string
  setFDesc: (v: string) => void
  fValor: string
  setFValor: (v: string) => void
  categoriasSelect: Categoria[]
  subDescsDisponiveis: string[]
  categorias: Categoria[]
  valorInputRef: React.RefObject<HTMLInputElement | null>
  categoriaSelectRef: React.RefObject<HTMLSelectElement | null>
  lancarConsolidado: () => void
  resetarParaNovo: (dia: number) => void
}

export default function NleConsolidado({
  isMobile, mobileView, setMobileView,
  saldoAtualPorConta, faturaAtualPorCartao,
  totalEntradasMes, totalSaidasMes, recentLancs,
  mes, ano,
  fBancoConsolidado, setFBancoConsolidado,
  diaSel, setDiaSel, totalDias,
  fTipo, setFTipo, setFPag, fPag,
  contas, contasExtrato,
  fCat, setFCat, fSubDesc, setFSubDesc,
  fDesc, setFDesc, fValor, setFValor,
  categoriasSelect, subDescsDisponiveis, categorias,
  valorInputRef, categoriaSelectRef,
  lancarConsolidado, resetarParaNovo,
}: Props) {
  const patrimonioTotal = saldoAtualPorConta.reduce((s, x) => s + x.saldo, 0)
  const faturaTotal     = faturaAtualPorCartao.reduce((s, x) => s + x.fatura, 0)
  const resultadoMes    = totalEntradasMes - totalSaidasMes

  const metricas = [
    { icon: '💰', label: 'Patrimônio total', val: patrimonioTotal },
    { icon: '↑',  label: 'Total entradas',   val: totalEntradasMes },
    { icon: '↓',  label: 'Total saídas',     val: totalSaidasMes },
    { icon: '=',  label: 'Resultado mês',    val: resultadoMes },
    { icon: '💳', label: 'Fatura cartões',   val: faturaTotal },
  ]

  return (
    <div style={{flex:1,display:'flex',flexDirection:isMobile?'column':'row',
      gap:isMobile?0:16,padding:isMobile?0:'10px 16px',overflow:isMobile?'auto':'hidden'}}>

      {/* PAINEL ESQUERDO: Visao Geral */}
      <div style={{flex:1,display:isMobile&&mobileView==='form'?'none':'flex',
        flexDirection:'column',overflow:'hidden',position:'relative'}}>

        {/* BANNER GRADIENTE: 5 métricas */}
        <div style={{background:'linear-gradient(135deg,#0f2878,#1e40af)',padding:'10px 14px',
          flexShrink:0,display:'flex',overflowX:'auto',gap:0}}>
          {metricas.map((m, i) => (
            <div key={i} style={{flex:1,minWidth:90,
              background:'rgba(255,255,255,.10)',border:'1px solid rgba(255,255,255,.15)',
              borderRadius:12,padding:'10px 12px',marginRight:i<metricas.length-1?7:0}}>
              <div style={{fontSize:9,color:'rgba(255,255,255,.7)',fontWeight:700,
                textTransform:'uppercase',letterSpacing:.4,marginBottom:5}}>{m.icon} {m.label}</div>
              <div style={{fontSize:14,fontWeight:800,fontVariantNumeric:'tabular-nums',
                color:m.val>=0?'#86efac':'#fca5a5',letterSpacing:'-.4px'}}>{fmt(m.val)}</div>
            </div>
          ))}
        </div>

        {/* AREA ROLAVEL */}
        <div style={{flex:1,overflowY:'auto',padding:'16px 16px 84px'}}>

          {/* Contas bancárias */}
          <div style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase' as const,
            letterSpacing:.6,marginBottom:8}}>Contas bancárias</div>
          {saldoAtualPorConta.length===0
            ? <div style={{fontSize:12,color:'#94a3b8',marginBottom:16}}>Nenhuma conta cadastrada</div>
            : <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:20}}>
                {saldoAtualPorConta.map(({conta,saldo}) => (
                  <div key={conta.id} style={{background:'#fff',border:'1px solid #e2e8f0',
                    borderRadius:10,padding:'10px 14px',display:'flex',
                    alignItems:'center',justifyContent:'space-between'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:18}}>{conta.icone}</span>
                      <div>
                        <div style={{fontSize:12,fontWeight:600,color:'#0f172a'}}>{conta.nome}</div>
                        <div style={{fontSize:10,color:'#64748b'}}>{conta.banco}</div>
                      </div>
                    </div>
                    <div style={{fontSize:13,fontWeight:700,fontVariantNumeric:'tabular-nums',
                      color:saldo>=0?'#16a34a':'#dc2626'}}>{fmt(saldo)}</div>
                  </div>
                ))}
              </div>
          }

          {/* Cartões de crédito */}
          {faturaAtualPorCartao.length>0 && (
            <>
              <div style={{fontSize:10,fontWeight:700,color:'#64748b',
                textTransform:'uppercase' as const,letterSpacing:.6,marginBottom:8}}>Cartões de crédito</div>
              <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:20}}>
                {faturaAtualPorCartao.map(({conta,fatura}) => {
                  const limite   = conta.limiteCartao ?? 0
                  const pct      = limite>0 ? Math.min(fatura/limite*100,100) : 0
                  const corBarra = pct>80?'#dc2626':pct>50?'#f59e0b':'#16a34a'
                  return (
                    <div key={conta.id} style={{background:'#fff',border:'1px solid #e2e8f0',
                      borderRadius:10,padding:'10px 14px'}}>
                      <div style={{display:'flex',alignItems:'center',
                        justifyContent:'space-between',marginBottom:limite>0?8:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <span style={{fontSize:18}}>{conta.icone||'💳'}</span>
                          <div>
                            <div style={{fontSize:12,fontWeight:600,color:'#0f172a'}}>{conta.nome}</div>
                            <div style={{fontSize:10,color:'#64748b'}}>{conta.banco}</div>
                          </div>
                        </div>
                        <div style={{textAlign:'right' as const}}>
                          <div style={{fontSize:13,fontWeight:700,fontVariantNumeric:'tabular-nums',
                            color:'#dc2626'}}>{fmt(fatura)}</div>
                          {limite>0 && <div style={{fontSize:9,color:'#94a3b8'}}>de {fmt(limite)}</div>}
                        </div>
                      </div>
                      {limite>0 && (
                        <div style={{background:'#f1f5f9',borderRadius:6,height:4,overflow:'hidden'}}>
                          <div style={{width:`${pct}%`,height:'100%',background:corBarra,borderRadius:6,transition:'width .3s'}} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Últimos lançamentos */}
          <div style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase' as const,
            letterSpacing:.6,marginBottom:8}}>Últimos lançamentos</div>
          {recentLancs.length===0
            ? <div style={{fontSize:12,color:'#94a3b8'}}>Nenhum lançamento neste mês</div>
            : <div style={{display:'flex',flexDirection:'column',gap:2}}>
                {recentLancs.map((l,i) => (
                  <div key={i} style={{display:'flex',alignItems:'center',gap:10,
                    padding:'8px 10px',background:'#fff',borderRadius:8,
                    borderLeft:`3px solid ${l.cor||'#94a3b8'}`}}>
                    <div style={{fontSize:11,color:'#94a3b8',fontWeight:600,
                      minWidth:22,textAlign:'center' as const}}>{l.dia}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,color:'#0f172a',
                        whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{l.categoria}</div>
                      <div style={{fontSize:10,color:'#64748b',
                        whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                        {l.icone} {l.banco}{l.descricao?` · ${l.descricao}`:''}
                      </div>
                    </div>
                    <div style={{fontSize:12,fontWeight:700,fontVariantNumeric:'tabular-nums',
                      color:l.tipo==='entrada'?'#16a34a':'#dc2626',flexShrink:0}}>
                      {l.tipo==='entrada'?'+':'-'}{fmt(l.valor)}
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* RODAPE FIXO: Patrimônio total */}
        <div style={{position:'absolute',bottom:0,left:0,right:0,
          background:'linear-gradient(135deg,#0f2878,#1e40af)',
          padding:'10px 16px',display:'flex',alignItems:'center',
          justifyContent:'space-between',flexShrink:0}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:'#fff'}}>Patrimônio total</div>
            <div style={{fontSize:10,color:'rgba(255,255,255,.7)'}}>{NOMES_MESES[mes]} {ano}</div>
          </div>
          <div style={{fontSize:22,fontWeight:800,fontVariantNumeric:'tabular-nums',
            color:patrimonioTotal>=0?'#86efac':'#fca5a5'}}>{fmt(patrimonioTotal)}</div>
        </div>
      </div>

      {/* FORMULARIO DE LANCAMENTO (consolidado) */}
      <div style={{width:isMobile?'100%':340,flexShrink:0,background:COR.branco,
        border:isMobile?'none':`1px solid ${COR.borda}`,
        borderRadius:isMobile?0:12,padding:isMobile?'16px 12px':20,overflowY:'auto',
        display:isMobile&&mobileView==='extrato'?'none':'block'}}>
        {isMobile && (
          <button onClick={() => { setMobileView('extrato'); resetarParaNovo(diaSel) }} style={{
            border:'none',background:'transparent',cursor:'pointer',
            fontSize:13,fontWeight:600,color:COR.azul,fontFamily:'inherit',
            padding:'0 0 12px 0',display:'block'}}>← Voltar</button>
        )}
        <h3 style={{fontSize:14,fontWeight:700,color:COR.texto,margin:'0 0 14px'}}>Novo lançamento</h3>

        {/* Conta / Cartão */}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:4}}>🏦 Conta / Cartão *</div>
          <select value={fBancoConsolidado} onChange={e=>setFBancoConsolidado(e.target.value)}
            onFocus={realcarFoco} onBlur={removerRealce}
            style={{border:'1.5px solid #bae6fd',borderRadius:8,padding:'7px 10px',
              fontSize:12,outline:'none',background:'#fff',
              fontFamily:'inherit',color:COR.texto,width:'100%'}}>
            <option value="">Selecione...</option>
            {contasExtrato.length>0 && (
              <optgroup label="Contas bancárias">
                {contasExtrato.map(c=>(
                  <option key={c.id} value={c.id}>{c.icone} {c.banco} — {c.nome}</option>
                ))}
              </optgroup>
            )}
            {contas.filter(c=>c.tipo==='cartao').length>0 && (
              <optgroup label="Cartões de crédito">
                {contas.filter(c=>c.tipo==='cartao').map(c=>(
                  <option key={c.id} value={c.id}>{c.icone||'💳'} {c.nome}</option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Dia */}
        <div style={{display:'flex',alignItems:'flex-end',gap:8,marginBottom:14}}>
          <div style={{flex:'0 0 64px'}}>
            <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:4}}>📅 Dia</div>
            <input type="number" min={1} max={totalDias} value={diaSel}
              onChange={e=>setDiaSel(Math.min(Math.max(parseInt(e.target.value)||1,1),totalDias))}
              onFocus={realcarFoco} onBlur={removerRealce}
              style={{border:'1.5px solid #bae6fd',borderRadius:8,padding:'7px 10px',
                fontSize:12,outline:'none',background:'#fff',
                fontFamily:'inherit',color:COR.texto,width:'100%',textAlign:'center'}}/>
          </div>
          <div style={{fontSize:11,color:'#94a3b8',paddingBottom:8}}>
            {NOMES_MESES[mes]} · {diaSemana(diaSel, mes, ano)}
          </div>
        </div>

        {/* Despesa / Receita */}
        <div style={{display:'flex',background:'#e0f2fe',borderRadius:8,
          padding:3,marginBottom:10,width:'fit-content'}}>
          {(['saida','entrada'] as const).map(t=>(
            <button key={t} onClick={()=>{setFTipo(t);setFPag(t==='entrada'?'pix':'debito')}} style={{
              padding:'5px 14px',border:'none',borderRadius:6,cursor:'pointer',
              fontSize:12,fontWeight:500,fontFamily:'inherit',
              background:fTipo===t?COR.branco:'transparent',
              color:fTipo===t?(t==='entrada'?COR.azul:COR.vermelho):'#0369a1',
              boxShadow:fTipo===t?'0 1px 2px rgba(0,0,0,.08)':'none'}}>
              {t==='entrada'?'Recebimento':'Pagamento'}
            </button>
          ))}
        </div>

        {/* Forma de pagamento — apenas para contas bancárias */}
        {contas.find(c=>c.id===fBancoConsolidado)?.tipo!=='cartao' && (
          <div style={{marginBottom:12}}>
            <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:6}}>
              {fTipo==='entrada'?'Forma de recebimento:':'Forma de pagamento:'}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
              {(fTipo==='entrada'
                ? FORMAS_ENT.filter(p=>p.id!=='transferencia'&&p.id!=='dinheiro')
                : FORMAS_SAI.filter(p=>p.id!=='transferencia'&&p.id!=='dinheiro')
              ).map(p=>(
                <button key={p.id} onClick={()=>setFPag(p.id)} style={{
                  padding:'4px 12px',
                  border:`1.5px solid ${fPag===p.id?COR.azul:'#bae6fd'}`,
                  borderRadius:6,cursor:'pointer',fontSize:11,fontWeight:500,
                  background:fPag===p.id?'#eff6ff':'#fff',
                  color:fPag===p.id?COR.azul:'#0369a1',fontFamily:'inherit'}}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Categoria + Valor + Descrição */}
        <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:10}}>
          <div>
            <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:4}}>Categoria</div>
            <select ref={categoriaSelectRef} value={fCat}
              onChange={e=>{
                const nome = e.target.value; setFCat(nome); setFSubDesc('')
                const cat  = categorias.find(c=>c.nome===nome)
                if (cat) setFPag(fTipo==='entrada'
                  ? formaRecebCategoria(cat.formaPagamento, cat.tipoMovimento)
                  : formaPagCategoria(cat.formaPagamento, cat.tipoMovimento))
                if (nome) setTimeout(() => valorInputRef.current?.focus(), 50)
              }}
              onFocus={realcarFoco} onBlur={removerRealce}
              style={{border:'1.5px solid #bae6fd',borderRadius:8,padding:'7px 10px',
                fontSize:12,outline:'none',background:'#fff',
                fontFamily:'inherit',color:COR.texto,width:'100%'}}>
              <option value="">Selecione...</option>
              {categoriasSelect.map(c=>(
                <option key={c.id} value={c.nome}>{c.nome}</option>
              ))}
            </select>
            {subDescsDisponiveis.length>1 && (
              <div style={{marginTop:6}}>
                <div style={{fontSize:9,color:'#0369a1',fontWeight:600,
                  textTransform:'uppercase' as const,letterSpacing:.4,marginBottom:4}}>Qual variante?</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                  {subDescsDisponiveis.map(desc=>(
                    <button key={desc} type="button"
                      onClick={()=>setFSubDesc(desc===fSubDesc?'':desc)}
                      style={{padding:'4px 10px',borderRadius:20,fontSize:11,fontWeight:600,
                        border:`1.5px solid ${fSubDesc===desc?'#1a56db':'#bae6fd'}`,
                        background:fSubDesc===desc?'#1a56db':'#eff6ff',
                        color:fSubDesc===desc?'#fff':'#1a56db',
                        cursor:'pointer',fontFamily:'inherit'}}>{desc}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div>
            <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:4}}>Valor *</div>
            <input ref={valorInputRef} value={fValor} onChange={e=>setFValor(e.target.value)}
              placeholder="R$ 0,00" onFocus={realcarFoco} onBlur={removerRealce}
              style={{border:'1.5px solid #bae6fd',borderRadius:8,padding:'7px 10px',
                fontSize:12,outline:'none',background:'#fff',
                fontFamily:'inherit',color:COR.texto,width:'100%'}}
              onKeyDown={e=>e.key==='Enter'&&lancarConsolidado()}/>
          </div>
          <div>
            <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:4}}>Descrição</div>
            <input value={fDesc} onChange={e=>setFDesc(e.target.value)}
              placeholder="Ex: Mercado Extra, Farmácia..."
              onFocus={realcarFoco} onBlur={removerRealce}
              style={{border:'1.5px solid #bae6fd',borderRadius:8,padding:'7px 10px',
                fontSize:12,outline:'none',background:'#fff',
                fontFamily:'inherit',color:COR.texto,width:'100%'}}
              onKeyDown={e=>e.key==='Enter'&&lancarConsolidado()}/>
          </div>
        </div>
        <div style={{fontSize:10,color:'#94a3b8',marginBottom:14}}>Enter no valor ou na descrição para salvar</div>
        <button onClick={lancarConsolidado} style={{
          width:'100%',padding:'10px 0',border:'none',borderRadius:8,
          background:`linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,
          color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
          Lançar
        </button>
      </div>
    </div>
  )
}
