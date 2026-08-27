import React, { useState } from 'react'
import type { Conta, Categoria } from '../../context/AppContext'
import { ehCartaoCategoria } from '../../utils/categoriaIcone'
import {
  COR, fmt, NOMES_MESES, FORMAS_SAI, FORMAS_ENT,
  realcarFoco, removerRealce, diaSemana,
  formaPagCategoria, formaRecebCategoria,
  type CatFixa, type DadosMes, type TipoLanc, type FormaPag,
  parseValor,
  REALCE_ERRO,
} from './NleShared'

type Props = {
  isMobile: boolean

  // Month/day
  mes: number
  ano: number
  diaSel: number
  totalDias: number
  setDiaSel: React.Dispatch<React.SetStateAction<number>>

  // Edit state
  editandoId: string | null
  editandoFixaId: string | null
  fixaEhAutomatica: boolean

  // Form state
  fTipo: TipoLanc
  fCat: string
  fSubDesc: string
  fDesc: string
  fValor: string
  fPag: FormaPag
  fContaDestino: string

  // Context
  isDinheiro: boolean
  contaInfo: Conta | undefined
  categoriasSelect: Categoria[]
  subDescsDisponiveis: string[]
  contasExtrato: Conta[]
  contaIdEfetivo: string
  categorias: Categoria[]
  fixas: CatFixa[]
  mesDados: DadosMes
  totalSaidas: number

  // Refs
  categoriaSelectRef: React.RefObject<HTMLSelectElement | null>
  valorInputRef: React.RefObject<HTMLInputElement | null>

  // Handlers
  resetarParaNovo: (dia: number) => void
  setFTipo: (v: TipoLanc) => void
  setFPag: (v: FormaPag) => void
  setFCat: (v: string) => void
  setFSubDesc: (v: string) => void
  setFContaDestino: (v: string) => void
  setFDesc: (v: string) => void
  setFValor: (v: string) => void
  lancar: () => void
  excluirAtual: () => void
}

export default function NleDesktopPanel({
  isMobile, mes, ano, diaSel, totalDias, setDiaSel,
  editandoId, editandoFixaId, fixaEhAutomatica,
  fTipo, fCat, fSubDesc, fDesc, fValor, fPag, fContaDestino,
  isDinheiro, contaInfo,
  categoriasSelect, subDescsDisponiveis, contasExtrato, contaIdEfetivo, categorias,
  fixas, mesDados, totalSaidas,
  categoriaSelectRef, valorInputRef,
  resetarParaNovo,
  setFTipo, setFPag, setFCat, setFSubDesc, setFContaDestino, setFDesc, setFValor,
  lancar, excluirAtual,
}: Props) {
  // Texto que nao e um valor: parseValor devolve null. O salvamento ja
  // bloqueava (valor <= 0), mas em silencio — o botao simplesmente nao fazia
  // nada. O realce diz ao usuario por que.
  const valorRuim = parseValor(fValor) === null

  if (isMobile) return null

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [mostrarCalDia, setMostrarCalDia] = useState(false)

  // Resumo do mês data
  const fixasDoMes = fixas.filter(f => !ehCartaoCategoria(categorias, f.categoria))
  const fixasPend        = fixasDoMes.filter(f => mesDados.fixasConsolidadas?.[f.id] !== true)
  const numFixasPendentes = fixasPend.length
  const planejadoTotal   = fixasDoMes.filter(f => f.tipo==='saida')
    .reduce((s,f) => s+(mesDados.fixasValorOverride?.[f.id]??f.valor),0)
  const pctSaidas = planejadoTotal > 0 ? Math.min(Math.round((totalSaidas/planejadoTotal)*100),100) : 0

  return (
    <div style={{width:340,flexShrink:0,background:COR.branco,
      borderLeft:'1px solid #e2e8f0',display:'flex',
      flexDirection:'column',overflow:'hidden'}}>

      {/* Form header: month nav + title + badge */}
      <div style={{padding:'14px 18px 12px',borderBottom:'1px solid #e2e8f0',flexShrink:0}}>
        {/* Title + account badge */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:13,fontWeight:800,color:'#0f172a'}}>
              {editandoFixaId ? 'Editar fixa' : editandoId ? 'Editar lançamento' : 'Novo lançamento'}
            </span>
            {(editandoId || editandoFixaId) && (
              <button onClick={() => resetarParaNovo(diaSel)} title="Cancelar edição"
                style={{border:'none',background:'transparent',cursor:'pointer',fontSize:15,color:COR.textoSuave,lineHeight:1,padding:0}}>✕</button>
            )}
          </div>
          <span style={{fontSize:10,fontWeight:600,padding:'2px 9px',borderRadius:20,
            background:'#eff6ff',color:'#1a56db',flexShrink:0}}>
            {isDinheiro ? '💵 Dinheiro' : (contaInfo?.icone ?? '🏦') + ' ' + (contaInfo?.banco ?? 'Banco')}
          </span>
        </div>
      </div>

      {/* Scrollable body: form + resumo */}
      <div style={{flex:1,overflowY:'auto',paddingBottom:72}}>
        <div style={{padding:'16px 20px'}}>

          {/* Dia */}
          {mostrarCalDia && (
            <div style={{position:'fixed',inset:0,zIndex:399}} onClick={() => setMostrarCalDia(false)} />
          )}
          <div style={{marginBottom:14,position:'relative'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#1a56db',textTransform:'uppercase',
              letterSpacing:.5,marginBottom:5}}>📅 Dia</div>
            {editandoFixaId && fixaEhAutomatica ? (
              <div style={{border:'1.5px solid #e2e8f0',borderRadius:10,padding:'8px 12px',
                background:'#f8faff',display:'flex',alignItems:'center',gap:8}}>
                <div style={{fontSize:18,fontWeight:800,color:'#0f172a',lineHeight:1}}>{diaSel}</div>
                <div style={{fontSize:11,color:'#94a3b8'}}>{NOMES_MESES[mes]} · {diaSemana(diaSel,mes,ano)}</div>
              </div>
            ) : (
              <button onClick={() => setMostrarCalDia(v => !v)} style={{
                width:'100%',border:'1.5px solid #e2e8f0',borderRadius:10,padding:'8px 12px',
                background:'#fff',display:'flex',alignItems:'center',gap:8,
                cursor:'pointer',fontFamily:'inherit',textAlign:'left' as const,
              }}>
                <span style={{fontSize:18,fontWeight:800,color:'#0f172a',lineHeight:1,minWidth:24}}>{diaSel}</span>
                <span style={{fontSize:11,color:'#94a3b8'}}>{NOMES_MESES[mes]} · {diaSemana(diaSel,mes,ano)}</span>
                <span style={{marginLeft:'auto',fontSize:12,color:'#94a3b8'}}>▾</span>
              </button>
            )}

            {mostrarCalDia && !editandoFixaId && (() => {
              const diasComFixa = new Set(fixasDoMes.map(f => mesDados.fixasMovidas?.[f.id] ?? f.diaVencimento))
              const offset  = new Date(ano, mes, 1).getDay()
              const hojeD   = new Date()
              const diaHoje = hojeD.getFullYear()===ano && hojeD.getMonth()===mes ? hojeD.getDate() : -1
              const SEMs    = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
              return (
                <div style={{
                  position:'absolute',top:'calc(100% + 4px)',left:0,zIndex:400,
                  background:'#fff',borderRadius:14,boxShadow:'0 8px 32px rgba(0,0,0,.18)',
                  padding:12,minWidth:264,border:'1px solid #e2e8f0',
                }} onClick={e => e.stopPropagation()}>
                  <div style={{fontSize:12,fontWeight:700,color:COR.texto,textAlign:'center' as const,marginBottom:8}}>
                    {NOMES_MESES[mes]} {ano}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:4}}>
                    {SEMs.map(s => (
                      <div key={s} style={{fontSize:9,fontWeight:700,color:'#94a3b8',textAlign:'center' as const,padding:'2px 0'}}>{s}</div>
                    ))}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
                    {Array.from({length:offset}).map((_,i) => <div key={`e${i}`} />)}
                    {Array.from({length:totalDias},(_,i)=>i+1).map(d => {
                      const ativo   = d === diaSel
                      const ehHoje  = d === diaHoje
                      const temFixa = diasComFixa.has(d)
                      return (
                        <button key={d} onClick={() => { setDiaSel(d); setMostrarCalDia(false) }} style={{
                          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                          padding:'4px 2px',border:'none',borderRadius:8,cursor:'pointer',
                          fontFamily:'inherit',fontSize:12,fontWeight:ativo?700:400,
                          background: ativo ? COR.azul : ehHoje ? '#eff6ff' : 'transparent',
                          color: ativo ? '#fff' : ehHoje ? COR.azul : COR.texto,
                          outline: ehHoje && !ativo ? `1.5px solid ${COR.azul}` : 'none',
                          minHeight:32,
                        }}>
                          {d}
                          {temFixa && (
                            <span style={{
                              width:4,height:4,borderRadius:'50%',marginTop:1,
                              background: ativo ? 'rgba(255,255,255,.7)' : COR.azul,
                            }} />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Tipo toggle */}
          {!editandoFixaId && (
            <div style={{display:'flex',background:'#f1f5f9',borderRadius:10,padding:3,gap:3,marginBottom:14}}>
              {(['saida','entrada'] as const).map(t => {
                const ativo  = fTipo === t
                const corBg  = t==='entrada'?'#f0fdf4':'#fff1f2'
                const corTxt = t==='entrada'?'#16a34a':'#dc2626'
                const sombra = t==='entrada'?'rgba(22,163,74,.12)':'rgba(220,38,38,.12)'
                return (
                  <button key={t} onClick={() => {
                    setFTipo(t)
                    if (!isDinheiro && fPag !== 'transferencia') setFPag(t === 'entrada' ? 'credito' : 'debito')
                  }} style={{
                    flex:1,padding:'8px',border:'none',borderRadius:8,cursor:'pointer',
                    fontSize:12,fontWeight:700,fontFamily:'inherit',transition:'all .15s',
                    background:ativo?corBg:'transparent',
                    color:ativo?corTxt:'#94a3b8',
                    boxShadow:ativo?`0 1px 4px ${sombra}`:'none',
                  }}>
                    {t==='saida'?'↓ Pagamento':'↑ Recebimento'}
                  </button>
                )
              })}
            </div>
          )}

          {/* Forma de pagamento */}
          {!isDinheiro && (!editandoFixaId || (editandoFixaId && !fixaEhAutomatica)) && (
            <div style={{marginBottom:14}}>
              <div style={{fontSize:10,fontWeight:700,color:'#1a56db',textTransform:'uppercase',
                letterSpacing:.5,marginBottom:5}}>
                💳 {fTipo === 'entrada' ? 'Forma de recebimento' : 'Forma de pagamento'}
              </div>
              <div style={{display:'flex',alignItems:'center',gap:5,flexWrap:'wrap'}}>
                {(fTipo === 'entrada' ? FORMAS_ENT : FORMAS_SAI).filter(p => isDinheiro || p.id !== 'dinheiro').map(p => (
                  <button key={p.id} onClick={() => { setFPag(p.id); if(p.id!=='transferencia') setFContaDestino('') }} style={{
                    padding:'6px 12px',borderRadius:8,
                    border:`1.5px solid ${fPag===p.id?COR.azul:'#e2e8f0'}`,
                    background:fPag===p.id?'#eff6ff':'#fff',
                    fontSize:11,fontWeight:600,
                    color:fPag===p.id?COR.azul:'#64748b',
                    cursor:'pointer',fontFamily:'inherit',transition:'all .15s',
                  }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Categoria */}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:10,fontWeight:700,color:'#1a56db',textTransform:'uppercase',
              letterSpacing:.5,marginBottom:5}}>
              🏷 {fPag==='transferencia'?(fTipo==='saida'?'Transferir para':'Receber de'):'Categoria'}
            </div>
            {editandoFixaId ? (
              <div style={{border:'1.5px solid #e2e8f0',borderRadius:10,padding:'9px 12px',
                fontSize:13,background:'#f8faff',color:'#64748b',fontFamily:'inherit'}}>{fCat}</div>
            ) : fPag === 'transferencia' ? (
              <select ref={categoriaSelectRef} value={fContaDestino}
                onChange={e => setFContaDestino(e.target.value)}
                onFocus={realcarFoco} onBlur={removerRealce}
                style={{width:'100%',border:'1.5px solid #e2e8f0',borderRadius:10,padding:'9px 12px',
                  fontSize:13,color:'#0f172a',background:'#fff',outline:'none',fontFamily:'inherit'}}>
                <option value="">Selecione a conta...</option>
                {contasExtrato.filter(c => c.id !== contaIdEfetivo).map(c=>(
                  <option key={c.id} value={c.id}>{c.icone} {c.nome} — {c.banco}</option>
                ))}
              </select>
            ) : (
              <>
                {(() => {
                  const grupos = new Map<string, typeof categoriasSelect>()
                  for (const c of categoriasSelect) {
                    const g = c.grupo ?? ''
                    if (!grupos.has(g)) grupos.set(g, [])
                    grupos.get(g)!.push(c)
                  }
                  const gruposOrdenados = Array.from(grupos.entries())
                    .sort(([a],[b]) => {
                      if (a==='' && b!=='') return 1
                      if (a!=='' && b==='') return -1
                      return a.localeCompare(b,'pt-BR')
                    })
                  return (
                    <select ref={categoriaSelectRef} autoFocus
                      value={fCat}
                      onChange={e => {
                        const nome = e.target.value
                        setFCat(nome); setFSubDesc('')
                        const cat = categorias.find(c => c.nome === nome)
                        if (cat) setFPag(fTipo === 'entrada'
                          ? formaRecebCategoria(cat.formaPagamento, cat.tipoMovimento)
                          : formaPagCategoria(cat.formaPagamento, cat.tipoMovimento))
                      }}
                      onFocus={realcarFoco} onBlur={removerRealce}
                      style={{width:'100%',border:'1.5px solid #e2e8f0',borderRadius:10,padding:'9px 12px',
                        fontSize:13,color:'#0f172a',background:'#fff',outline:'none',fontFamily:'inherit'}}>
                      <option value="">Selecione...</option>
                      {gruposOrdenados.map(([grupo, cats]) =>
                        grupo ? (
                          <optgroup key={grupo} label={grupo}>
                            {cats.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                          </optgroup>
                        ) : cats.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)
                      )}
                    </select>
                  )
                })()}
                {subDescsDisponiveis.length > 0 && (
                  <div style={{marginTop:8}}>
                    <div style={{fontSize:10,fontWeight:700,color:'#1a56db',textTransform:'uppercase',
                      letterSpacing:.5,marginBottom:5}}>🔖 Variante</div>
                    <select value={fSubDesc} onChange={e => setFSubDesc(e.target.value)}
                      onFocus={realcarFoco} onBlur={removerRealce}
                      style={{width:'100%',border:'1.5px solid #e2e8f0',borderRadius:10,padding:'9px 12px',
                        fontSize:13,color:'#0f172a',background:'#fff',outline:'none',fontFamily:'inherit'}}>
                      <option value="">Selecione a variante...</option>
                      {subDescsDisponiveis.map(desc => (
                        <option key={desc} value={desc}>{desc}</option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Valor */}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:10,fontWeight:700,color:'#1a56db',textTransform:'uppercase',
              letterSpacing:.5,marginBottom:5}}>💰 Valor *</div>
            <input ref={valorInputRef} value={fValor} onChange={e=>setFValor(e.target.value)}
              placeholder="R$ 0,00"
              onFocus={realcarFoco} onBlur={removerRealce}
              style={{width:'100%',border:'2px solid #1a56db',borderRadius:10,padding:'10px 14px',
                fontSize:20,fontWeight:800,color:'#1a56db',background:'#eff6ff',outline:'none',
                fontFamily:'inherit',textAlign:'center',letterSpacing:'-.4px',...(valorRuim?REALCE_ERRO:{})}}
              onKeyDown={e=>e.key==='Enter'&&lancar()}/>
          </div>

          {/* Descrição */}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:10,fontWeight:700,color:'#1a56db',textTransform:'uppercase',
              letterSpacing:.5,marginBottom:5}}>
              📝 Descrição{' '}
              <span style={{fontWeight:400,color:'#94a3b8',textTransform:'none',fontSize:9}}>(opcional)</span>
            </div>
            <input value={fDesc} onChange={e=>setFDesc(e.target.value)}
              placeholder={fPag==='transferencia'?'Opcional — ex: Reserva emergência':'Ex: Mercado Extra, Farmácia...'}
              onFocus={realcarFoco} onBlur={removerRealce}
              style={{width:'100%',border:'1.5px solid #e2e8f0',borderRadius:10,padding:'9px 12px',
                fontSize:13,color:'#0f172a',background:'#fff',outline:'none',fontFamily:'inherit'}}
              onKeyDown={e=>e.key==='Enter'&&lancar()}/>
            <div style={{fontSize:10,color:'#94a3b8',marginTop:4}}>↵ Enter no valor para salvar rapidamente</div>
          </div>

          {/* Botões */}
          <div style={{display:'flex',gap:8,marginTop:4}}>
            {editandoId && !editandoId.startsWith('fatura-') && (
              <button onClick={excluirAtual} style={{
                flex:1,padding:13,border:`1.5px solid ${COR.borda}`,borderRadius:10,
                cursor:'pointer',fontSize:13,fontWeight:500,
                background:COR.branco,color:COR.vermelho,fontFamily:'inherit'}}>
                Excluir
              </button>
            )}
            <button onClick={lancar} style={{
              flex:2,padding:13,border:'none',borderRadius:10,
              background:`linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,
              color:'#fff',fontSize:14,fontWeight:800,
              cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 12px rgba(26,86,219,.3)'}}>
              {(editandoId || editandoFixaId) ? 'Salvar alterações' : '✓ Lançar'}
            </button>
          </div>
        </div>

        {/* Divisor */}
        <div style={{height:1,background:'#f1f5f9',margin:'0 20px'}} />

        {/* Resumo do mês */}
        <div style={{padding:'14px 18px'}}>
          {planejadoTotal > 0 && (
            <div style={{marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:3}}>
                <span style={{color:'#64748b',fontWeight:600}}>Saídas vs planejado</span>
                <span style={{color:pctSaidas>80?'#d97706':COR.azul,fontWeight:700}}>{pctSaidas}%</span>
              </div>
              <div style={{height:5,background:'#f1f5f9',borderRadius:3,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${pctSaidas}%`,borderRadius:3,
                  background:pctSaidas>100?COR.vermelho:pctSaidas>80?'#d97706':COR.azul}}/>
              </div>
            </div>
          )}
          {numFixasPendentes > 0 && (
            <>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                padding:'8px 0',borderBottom:'1px solid #f8faff',marginTop:4}}>
                <span style={{fontSize:11,color:'#64748b'}}>📅 Fixas pendentes</span>
                <span style={{fontSize:12,fontWeight:700,color:'#d97706'}}>{numFixasPendentes} {numFixasPendentes===1?'conta':'contas'}</span>
              </div>
              {fixasPend.slice(0,4).map(f => (
                <div key={f.id} style={{display:'flex',justifyContent:'space-between',
                  alignItems:'center',padding:'5px 0',borderBottom:'1px solid #f8faff'}}>
                  <span style={{fontSize:10,color:'#94a3b8'}}>↳ {f.nome} · dia {mesDados.fixasMovidas?.[f.id] ?? f.diaVencimento}</span>
                  <span style={{fontSize:11,fontWeight:600,color:'#d97706'}}>
                    {fmt(mesDados.fixasValorOverride?.[f.id] ?? f.valor)}
                  </span>
                </div>
              ))}
              {fixasPend.length > 4 && (
                <div style={{fontSize:10,color:'#94a3b8',padding:'4px 0'}}>
                  +{fixasPend.length - 4} outras
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
