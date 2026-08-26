import React, { useState } from 'react'
import type { Conta, Categoria } from '../../context/AppContext'
import {
  COR, fmt, NOMES_MESES, DIAS_SEM, FORMAS_SAI, FORMAS_ENT,
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

  saldoAtualPorConta: SaldoConta[]
  faturaAtualPorCartao: FaturaCartao[]
  totalEntradasMes: number
  totalSaidasMes: number
  recentLancs: RecentLanc[]
  saldoDinheiro: number
  mes: number
  ano: number

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

// ── Gradient header ───────────────────────────────────────────────────────────
function SecaoHeader({ icone, titulo, right }: { icone: string; titulo: string; right?: React.ReactNode }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg,#0f2878,#2563eb)',
      padding: '10px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{icone} {titulo}</span>
      {right && <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.85)' }}>{right}</span>}
    </div>
  )
}

export default function NleConsolidado({
  isMobile, mobileView, setMobileView,
  saldoAtualPorConta, faturaAtualPorCartao,
  totalEntradasMes, totalSaidasMes, recentLancs,
  saldoDinheiro,
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

  const hoje = new Date()
  const diaHoje = hoje.getDate()
  const mesHoje = hoje.getMonth()
  const anoHoje = hoje.getFullYear()
  const eMesAtual = mes === mesHoje && ano === anoHoje

  const [diasAbertos, setDiasAbertos] = useState<Set<number>>(() => {
    const dias = new Set<number>()
    for (let i = 0; i <= 3; i++) { if (diaHoje - i >= 1) dias.add(diaHoje - i) }
    return dias
  })

  function toggleDia(dia: number) {
    setDiasAbertos(prev => {
      const n = new Set(prev); n.has(dia) ? n.delete(dia) : n.add(dia); return n
    })
  }

  // Group recentLancs by day
  const itensPorDia = recentLancs.reduce<Record<number, RecentLanc[]>>((acc, l) => {
    if (!acc[l.dia]) acc[l.dia] = []
    acc[l.dia].push(l)
    return acc
  }, {})

  // Days from most recent to oldest, only days with transactions
  const diasComItens = Object.keys(itensPorDia)
    .map(Number)
    .sort((a, b) => b - a)

  // Totals
  const totalContasBancarias = saldoAtualPorConta.reduce((s, x) => s + x.saldo, 0)
  const faturaTotal     = faturaAtualPorCartao.reduce((s, x) => s + x.fatura, 0)
  const limiteTotal     = faturaAtualPorCartao.reduce((s, x) => s + (x.conta.limiteCartao ?? 0), 0)
  const disponivelTotal = limiteTotal - faturaTotal
  const resultadoMes    = totalEntradasMes - totalSaidasMes

  return (
    <div style={{flex:1,display:'flex',flexDirection:isMobile?'column':'row',
      gap:isMobile?0:16,padding:isMobile?0:'10px 16px',overflow:isMobile?'auto':'hidden'}}>

      {/* ── PAINEL ESQUERDO ────────────────────────────────────────────── */}
      <div style={{flex:1,display:isMobile&&mobileView==='form'?'none':'flex',
        flexDirection:'column',overflow:'hidden',position:'relative'}}>

        {/* Resumo mês */}
        <div style={{flexShrink:0,display:'flex',gap:8,padding:isMobile?'10px 12px 0':'0 0 10px',flexWrap:'wrap'}}>
          {[
            { label:'Entradas', valor:totalEntradasMes, cor:COR.verde, bg:'#f0fdf4', bord:'#bbf7d0' },
            { label:'Saídas',   valor:totalSaidasMes,  cor:COR.vermelho, bg:'#fff1f2', bord:'#fecdd3' },
            { label:'Resultado', valor:resultadoMes, cor:resultadoMes<0?COR.vermelho:'#0f172a', bg:resultadoMes<0?'#fff1f2':'#f8faff', bord:resultadoMes<0?'#fecdd3':COR.borda },
          ].map(({label,valor,cor,bg,bord}) => (
            <div key={label} style={{flex:1,minWidth:90,padding:'7px 10px',borderRadius:8,
              background:bg,border:`1px solid ${bord}`}}>
              <div style={{fontSize:9,fontWeight:700,color:cor,textTransform:'uppercase',letterSpacing:.5,marginBottom:1}}>{label}</div>
              <div style={{fontSize:13,fontWeight:700,color:cor,fontVariantNumeric:'tabular-nums'}}>{fmt(valor)}</div>
            </div>
          ))}
        </div>

        {/* Scrollable area */}
        <div style={{flex:1,overflowY:'auto',padding:isMobile?'0 12px 80px':'0'}}>

          {/* ── SEÇÃO A: Contas bancárias ────────────────────────────── */}
          <div style={{borderRadius:10,overflow:'hidden',marginBottom:12,
            border:`1px solid ${COR.borda}`}}>
            <SecaoHeader icone="🏦" titulo="Contas bancárias" right={fmt(totalContasBancarias + saldoDinheiro)} />

            {/* Dinheiro */}
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',
              borderLeft:'4px solid #16a34a',background:COR.branco,
              borderBottom:`1px solid #f1f5f9`}}>
              <span style={{fontSize:18,flexShrink:0}}>💵</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:COR.texto}}>Dinheiro</div>
                <div style={{fontSize:10,color:'#94a3b8'}}>Em carteira</div>
              </div>
              <span style={{fontSize:13,fontWeight:700,color:saldoDinheiro<0?COR.vermelho:COR.texto,
                fontVariantNumeric:'tabular-nums'}}>{fmt(saldoDinheiro)}</span>
            </div>

            {saldoAtualPorConta.length === 0
              ? <div style={{padding:'10px 14px',fontSize:12,color:'#94a3b8'}}>Nenhuma conta cadastrada</div>
              : saldoAtualPorConta.map(({conta,saldo},idx) => (
                <div key={conta.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',
                  borderLeft:`4px solid ${conta.cor}`,background:COR.branco,
                  borderBottom:idx<saldoAtualPorConta.length-1?`1px solid #f1f5f9`:'none'}}>
                  <span style={{fontSize:18,flexShrink:0}}>{conta.icone}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600,color:COR.texto,
                      overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {conta.apelido ?? conta.nome}
                    </div>
                    <div style={{fontSize:10,color:'#94a3b8'}}>{conta.banco}</div>
                  </div>
                  <span style={{fontSize:13,fontWeight:700,color:saldo<0?COR.vermelho:COR.texto,
                    fontVariantNumeric:'tabular-nums'}}>{fmt(saldo)}</span>
                </div>
              ))
            }

          </div>

          {/* ── SEÇÃO A: Cartões de crédito ──────────────────────────── */}
          {faturaAtualPorCartao.length > 0 && (
            <div style={{borderRadius:10,overflow:'hidden',marginBottom:12,
              border:`1px solid ${COR.borda}`}}>
              <SecaoHeader icone="💳" titulo="Cartões de crédito" />

              {faturaAtualPorCartao.map(({conta,fatura},idx) => {
                const limite     = conta.limiteCartao ?? 0
                const disponivel = limite - fatura
                const pct        = limite > 0 ? Math.min(fatura / limite, 1) : 0
                const corBar     = pct > .9 ? COR.vermelho : pct > .7 ? '#f59e0b' : COR.verde
                const cor        = conta.cor || '#6366f1'
                return (
                  <div key={conta.id} style={{background:COR.branco,
                    borderLeft:`4px solid ${cor}`,
                    borderBottom:idx<faturaAtualPorCartao.length-1?`1px solid #f1f5f9`:'none',
                    padding:'10px 14px'}}>

                    <div style={{display:'grid',
                      gridTemplateColumns:`1fr ${limite>0?'80px ':' '}80px 80px`,
                      gap:8,alignItems:'center',marginBottom:limite>0?6:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0}}>
                        <span style={{fontSize:18,flexShrink:0}}>{conta.icone||'💳'}</span>
                        <div style={{minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:600,color:COR.texto,
                            overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                            {conta.apelido ?? conta.nome}
                          </div>
                          <div style={{fontSize:10,color:'#94a3b8'}}>{conta.banco}</div>
                        </div>
                      </div>
                      {limite > 0 && (
                        <div style={{textAlign:'right' as const}}>
                          <div style={{fontSize:9,color:'#94a3b8',fontWeight:600,textTransform:'uppercase' as const,letterSpacing:.4}}>Limite</div>
                          <div style={{fontSize:12,fontWeight:600,color:COR.texto,fontVariantNumeric:'tabular-nums'}}>{fmt(limite)}</div>
                        </div>
                      )}
                      <div style={{textAlign:'right' as const}}>
                        <div style={{fontSize:9,color:'#94a3b8',fontWeight:600,textTransform:'uppercase' as const,letterSpacing:.4}}>Fatura</div>
                        <div style={{fontSize:12,fontWeight:700,color:COR.vermelho,fontVariantNumeric:'tabular-nums'}}>{fmt(fatura)}</div>
                      </div>
                      <div style={{textAlign:'right' as const}}>
                        <div style={{fontSize:9,color:'#94a3b8',fontWeight:600,textTransform:'uppercase' as const,letterSpacing:.4}}>Disponível</div>
                        <div style={{fontSize:12,fontWeight:700,
                          color:disponivel<0?COR.vermelho:COR.verde,fontVariantNumeric:'tabular-nums'}}>
                          {limite > 0 ? fmt(disponivel) : '—'}
                        </div>
                      </div>
                    </div>

                    {limite > 0 && (
                      <div style={{height:5,borderRadius:3,background:'#e2e8f0',overflow:'hidden'}}>
                        <div style={{height:'100%',borderRadius:3,background:corBar,
                          width:`${pct*100}%`,transition:'width .3s'}} />
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Subtotal */}
              <div style={{padding:'8px 14px',background:'#f8faff',
                display:'flex',justifyContent:'space-between',gap:8,
                borderTop:`1px solid ${COR.borda}`}}>
                <div>
                  <div style={{fontSize:9,color:'#94a3b8',fontWeight:600,textTransform:'uppercase' as const,letterSpacing:.4}}>Total faturas</div>
                  <div style={{fontSize:12,fontWeight:700,color:COR.vermelho,fontVariantNumeric:'tabular-nums'}}>{fmt(faturaTotal)}</div>
                </div>
                {limiteTotal > 0 && (
                  <div style={{textAlign:'right' as const}}>
                    <div style={{fontSize:9,color:'#94a3b8',fontWeight:600,textTransform:'uppercase' as const,letterSpacing:.4}}>Disponível total</div>
                    <div style={{fontSize:12,fontWeight:700,color:COR.verde,fontVariantNumeric:'tabular-nums'}}>{fmt(disponivelTotal)}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SEÇÃO B: Movimentações do mês ───────────────────────── */}
          <div style={{borderRadius:10,overflow:'hidden',border:`1px solid ${COR.borda}`}}>
            <SecaoHeader icone="🗓️" titulo={`Movimentações de ${NOMES_MESES[mes]}`}
              right={diasComItens.length === 0 ? undefined : `${diasComItens.length} dias`} />

            {diasComItens.length === 0 ? (
              <div style={{padding:'16px 14px',fontSize:12,color:'#94a3b8',textAlign:'center' as const}}>
                Nenhuma movimentação registrada neste mês
              </div>
            ) : diasComItens.map((dia, diaIdx) => {
              const itens   = itensPorDia[dia]
              const ehHoje  = eMesAtual && dia === diaHoje
              const aberto  = diasAbertos.has(dia)
              const semana  = DIAS_SEM[new Date(ano, mes, dia).getDay()]
              const entsDia = itens.reduce((s, l) => l.tipo === 'entrada' ? s + l.valor : s, 0)
              const saisDia = itens.reduce((s, l) => l.tipo !== 'entrada' ? s + l.valor : s, 0)

              return (
                <div key={dia} style={{borderBottom:diaIdx<diasComItens.length-1?`1px solid #f1f5f9`:'none'}}>
                  {/* Day header */}
                  <div
                    onClick={() => toggleDia(dia)}
                    style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',
                      cursor:'pointer',background:ehHoje?'#f0f7ff':'#fafbff',
                      borderLeft:aberto?`4px solid ${ehHoje?COR.azul:'#64748b'}`:'4px solid transparent'}}>

                    <div style={{display:'flex',flexDirection:'column',alignItems:'center',
                      minWidth:30,flexShrink:0}}>
                      <span style={{fontSize:16,fontWeight:700,color:ehHoje?COR.azul:COR.texto,lineHeight:1}}>
                        {String(dia).padStart(2,'0')}
                      </span>
                      <span style={{fontSize:9,color:'#94a3b8',textTransform:'uppercase' as const,marginTop:1}}>
                        {semana}
                      </span>
                    </div>

                    {ehHoje && (
                      <span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:5,
                        background:'#dbeafe',color:COR.azul,textTransform:'uppercase' as const,letterSpacing:.5}}>
                        Hoje
                      </span>
                    )}

                    <div style={{flex:1}}/>

                    <div style={{display:'flex',gap:6,alignItems:'center'}}>
                      {entsDia > 0 && (
                        <span style={{fontSize:12,fontWeight:700,color:COR.azul,fontVariantNumeric:'tabular-nums'}}>
                          +{fmt(entsDia)}
                        </span>
                      )}
                      {entsDia > 0 && saisDia > 0 && (
                        <span style={{fontSize:10,color:'#94a3b8'}}>·</span>
                      )}
                      {saisDia > 0 && (
                        <span style={{fontSize:12,fontWeight:700,color:COR.vermelho,fontVariantNumeric:'tabular-nums'}}>
                          -{fmt(saisDia)}
                        </span>
                      )}
                      <span style={{fontSize:13,color:'#94a3b8',opacity:itens.length>0?1:0,
                        transform:aberto?'rotate(180deg)':'rotate(0deg)',
                        display:'inline-block',transition:'transform .15s',marginLeft:4}}>⌄</span>
                    </div>
                  </div>

                  {/* Items */}
                  {aberto && itens.map((l, idx) => (
                    <div key={idx} style={{display:'flex',alignItems:'center',gap:8,
                      padding:'8px 14px 8px 18px',
                      borderLeft:`4px solid ${l.cor}`,
                      background:COR.branco,
                      borderBottom:idx<itens.length-1?`1px solid #f8fafc`:'none'}}>
                      {/* Source badge */}
                      <span style={{flexShrink:0,fontSize:9,fontWeight:700,
                        padding:'2px 6px',borderRadius:4,whiteSpace:'nowrap' as const,
                        background:l.cor+'20',color:l.cor}}>
                        {l.icone} {l.banco}
                      </span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:600,color:COR.texto,
                          overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>
                          {l.categoria}
                        </div>
                        {l.descricao && l.descricao !== l.categoria && (
                          <div style={{fontSize:10,color:'#94a3b8',
                            overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>
                            {l.descricao}
                          </div>
                        )}
                      </div>
                      <span style={{fontSize:13,fontWeight:700,flexShrink:0,
                        fontVariantNumeric:'tabular-nums',
                        color:l.tipo==='entrada'?COR.azul:COR.vermelho}}>
                        {l.tipo==='entrada'?'+':'-'}{fmt(l.valor)}
                      </span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>

        </div>
      </div>

      {/* ── FORMULÁRIO DE LANÇAMENTO (direita) ──────────────────────────── */}
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

        {/* Forma de pagamento */}
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
            {subDescsDisponiveis.length>0 && (
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
