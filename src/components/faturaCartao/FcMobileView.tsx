import React from 'react'
import type { Conta, Categoria } from '../../context/AppContext'
import { iconeCategoria, buscarCategoria } from '../../utils/categoriaIcone'
import {
  COR, NOMES_MESES, fmt, parseBRL, parseDateFatura, diaSemana,
  compararNaFatura,
  type TipoLanc, type Lancamento, type DadosMes,
  parseValor,
  REALCE_ERRO,
} from './FcShared'
import { lancLabelComGrupo } from './fcRotulo'
import { IconeRedondo } from '../mobile/ui'
import { M } from '../mobile/estilo'
import { IconeCat } from '../IconeCat'

const rotuloForm: React.CSSProperties = { fontSize:13, fontWeight:600, color:COR.textoSuave, marginBottom:6, display:'block' }

type Props = {
  // Card list
  contasCartao: Conta[]
  contaId: string
  setContaId: (id: string) => void

  // Month navigation
  mes: number
  setMes: React.Dispatch<React.SetStateAction<number>>
  ano: number
  setAno: React.Dispatch<React.SetStateAction<number>>
  anoHoje: number
  diaHoje: number

  // View toggle
  mobileView: 'extrato' | 'form'
  setMobileView: React.Dispatch<React.SetStateAction<'extrato' | 'form'>>

  // Fechamento/Vencimento inline editors
  editandoFechamento: boolean
  setEditandoFechamento: React.Dispatch<React.SetStateAction<boolean>>
  editandoVencimento: boolean
  setEditandoVencimento: React.Dispatch<React.SetStateAction<boolean>>
  editFechVal: number
  setEditFechVal: React.Dispatch<React.SetStateAction<number>>
  editVencVal: number
  setEditVencVal: React.Dispatch<React.SetStateAction<number>>

  // Form fields
  fTipo: TipoLanc
  setFTipo: React.Dispatch<React.SetStateAction<TipoLanc>>
  fCat: string
  setFCat: React.Dispatch<React.SetStateAction<string>>
  fDesc: string
  setFDesc: React.Dispatch<React.SetStateAction<string>>
  fVariante: string
  setFVariante: React.Dispatch<React.SetStateAction<string>>
  fValor: string
  setFValor: React.Dispatch<React.SetStateAction<string>>
  fParcelas: string
  setFParcelas: React.Dispatch<React.SetStateAction<string>>
  fDataCompra: string
  setFDataCompra: React.Dispatch<React.SetStateAction<string>>
  editandoId: string | null
  avisoParcelas?: string
  editandoDiaOriginal: number | null
  diaSel: number
  setDiaSel: React.Dispatch<React.SetStateAction<number>>

  // Computed card/month data
  diaFechamento: number
  diaVencimento: number
  diaFechamentoBase: number
  diaVencimentoBase: number
  mesDados: DadosMes
  totalDias: number
  purchaseMes: number
  purchaseAno: number
  faturaStatus: 'paga' | 'fechada' | 'aberta'
  totalPrevisto: number
  grandTotalFaturas: number
  totalFatura: number
  mesVenc: number
  anoVenc: number

  // Categories
  categorias: Categoria[]
  categoriasCartao: Categoria[]

  // Refs
  dataCompraRef: React.RefObject<HTMLInputElement | null>
  categoriaSelectRef: React.RefObject<HTMLSelectElement | null>
  onNovaCategoria: () => void
  valorInputRef: React.RefObject<HTMLInputElement | null>
  parcelasBtnRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>

  // Handlers
  resetarParaNovo: (dia: number) => void
  editarLancamento: (dia: number, l: Lancamento) => void
  excluir: (dia: number, id: string) => void
  updateMes: (fn: (prev: DadosMes) => DadosMes) => void
  lancar: () => void
  diaDefaultPara: (mes: number, ano: number) => number
}

export default function FcMobileView({
  contasCartao, contaId, setContaId,
  mes, ano, anoHoje, diaHoje,
  mobileView, setMobileView,
  editandoFechamento, setEditandoFechamento,
  editandoVencimento, setEditandoVencimento,
  editFechVal, setEditFechVal,
  editVencVal, setEditVencVal,
  fTipo, setFTipo, fCat, setFCat, fDesc, setFDesc, fVariante, setFVariante,
  fValor, setFValor, fParcelas, setFParcelas,
  fDataCompra, setFDataCompra,
  editandoId, editandoDiaOriginal, avisoParcelas,
  diaSel, setDiaSel,
  diaFechamento, diaVencimento, diaFechamentoBase, diaVencimentoBase,
  mesDados, totalDias, purchaseMes, purchaseAno,
  faturaStatus, totalPrevisto, grandTotalFaturas, totalFatura,
  mesVenc, anoVenc,
  categorias, categoriasCartao,
  dataCompraRef, categoriaSelectRef, valorInputRef, parcelasBtnRefs, onNovaCategoria,
  resetarParaNovo, editarLancamento, excluir, updateMes, lancar, diaDefaultPara,
}: Props) {
  // Texto que nao e um valor: parseValor devolve null. O salvamento ja
  // bloqueava (valor <= 0), mas em silencio — o botao simplesmente nao fazia
  // nada. O realce diz ao usuario por que.
  const valorRuim = parseValor(fValor) === null

  const statusLbl = faturaStatus==='paga' ? 'Paga' : faturaStatus==='fechada' ? 'Fechada' : 'Aberta'
  const disponivel = totalPrevisto - grandTotalFaturas

  // Sobre o azul do topo (#0f2878 → #1e40af, medido no extremo claro):
  // branco 8,72 · rótulo a 75% 5,1 · #86efac 6,21 · #fde047 6,62.
  const statusNoAzul = faturaStatus==='paga' ? '#86efac' : faturaStatus==='fechada' ? '#fff' : '#fde047'
  const chipAzul = (ativo: boolean) => ({ display:'flex', alignItems:'center', gap:6, minHeight:38, padding:'0 14px',
    borderRadius:999, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:14, fontWeight:700,
    whiteSpace:'nowrap' as const, flexShrink:0,
    background: ativo ? '#fff' : 'rgba(255,255,255,.14)', color: ativo ? '#1e3a8a' : '#fff' })

  return (
    <div style={{flex:'none',display:'flex',flexDirection:'column',background:M.fundo}}>

      {/* TOPO AZUL — continua o cabeçalho de Lançamentos: cartões em
          pílulas, o mês da fatura e o total dela em destaque. */}
      <div style={{background:'linear-gradient(180deg,#132f8f,#1e40af)',borderRadius:'0 0 28px 28px',
        padding:'12px 16px 20px',flexShrink:0}}>
        {contasCartao.length > 1 && (
          <div style={{display:'flex',gap:8,overflowX:'auto',scrollbarWidth:'none' as const,marginBottom:12}}>
            {contasCartao.map(c => (
              <button key={c.id} onClick={() => { setContaId(c.id); resetarParaNovo(diaDefaultPara(mes,ano)) }}
                style={chipAzul(c.id === contaId)}>
                <IconeCat icone={c.icone} />{c.banco}{c.apelido ? ` ${c.apelido}` : ''}
              </button>
            ))}
          </div>
        )}
        {/* O mês da fatura anda pelas setas ao lado do título "Lançamentos". */}
        <div style={{fontSize:15,color:'rgba(255,255,255,.75)'}}>
          Fatura de {NOMES_MESES[mes]}{ano !== anoHoje ? ` ${ano}` : ''} · <b style={{color:statusNoAzul}}>{statusLbl}</b>
        </div>
        <div>
          <div style={{fontSize:34,fontWeight:800,letterSpacing:'-.02em',lineHeight:1.15,color:'#fff',
            fontVariantNumeric:'tabular-nums'}}>{fmt(totalFatura)}</div>
          <div style={{fontSize:13,color:'rgba(255,255,255,.75)',marginTop:2}}>
            vence {diaVencimento} de {NOMES_MESES[mesVenc]}{anoVenc !== anoHoje ? ` ${anoVenc}` : ''}
          </div>
        </div>

        {/* Fechamento e vencimento do mês — tocar abre o ajuste, como antes. */}
        <div style={{display:'flex',gap:8,marginTop:14}}>
          <button onClick={() => {
              if (editandoFechamento) { setEditandoFechamento(false); return }
              setEditFechVal(diaFechamento)
              setEditandoFechamento(true); setEditandoVencimento(false)
            }} style={chipAzul(editandoFechamento)}>
            <i className="ti ti-scissors" aria-hidden style={{fontSize:16}} />Fecha dia {diaFechamento}{mesDados.fechamentoOverride ? ' *' : ''}
          </button>
          <button onClick={() => {
              if (editandoVencimento) { setEditandoVencimento(false); return }
              setEditVencVal(diaVencimento)
              setEditandoVencimento(true); setEditandoFechamento(false)
            }} style={chipAzul(editandoVencimento)}>
            <i className="ti ti-calendar-due" aria-hidden style={{fontSize:16}} />Vence dia {diaVencimento}{mesDados.vencimentoOverride ? ' *' : ''}
          </button>
        </div>
      </div>

      {(editandoFechamento || editandoVencimento) && (
      <div style={{margin:'12px 16px 0',borderRadius:M.raio,overflow:'hidden',boxShadow:M.sombra,background:COR.branco}}>
        {/* Painel expandido — Fechamento */}
        {editandoFechamento && (
          <div style={{padding:'12px 14px 14px',borderTop:`1px solid ${COR.azul}22`,
            background:'#f0f7ff'}}>
            <div style={{fontSize:13,color:'#64748b',marginBottom:10,
              display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontWeight:700,color:COR.azul}}>Dia de fechamento — {NOMES_MESES[purchaseMes]}</span>
              <span style={{fontSize:12,color:COR.textoSuave}}>padrão: dia {diaFechamentoBase}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <button onClick={() => setEditFechVal(v => Math.max(1,v-1))}
                style={{width:44,height:44,borderRadius:12,border:`1.5px solid ${COR.azul}55`,
                  background:'#fff',fontSize:22,fontWeight:700,color:COR.azul,
                  cursor:'pointer',fontFamily:'inherit',display:'flex',
                  alignItems:'center',justifyContent:'center'}}>−</button>
              <input inputMode="numeric" type="number" min={1} max={31} value={editFechVal}
                onChange={e => setEditFechVal(Math.min(31,Math.max(1,parseInt(e.target.value)||1)))}
                style={{flex:1,textAlign:'center' as const,fontSize:28,fontWeight:800,
                  color:COR.azul,border:`2px solid ${COR.azul}`,borderRadius:12,
                  padding:'8px 0',background:'#fff',outline:'none',fontFamily:'inherit'}}/>
              <button onClick={() => setEditFechVal(v => Math.min(31,v+1))}
                style={{width:44,height:44,borderRadius:12,border:`1.5px solid ${COR.azul}55`,
                  background:'#fff',fontSize:22,fontWeight:700,color:COR.azul,
                  cursor:'pointer',fontFamily:'inherit',display:'flex',
                  alignItems:'center',justifyContent:'center'}}>+</button>
            </div>
            <div style={{display:'flex',gap:8,marginTop:10}}>
              <button onClick={() => setEditandoFechamento(false)}
                style={{flex:1,padding:'10px',border:`1.5px solid ${COR.borda}`,
                  borderRadius:10,background:COR.branco,color:COR.textoSuave,
                  fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                Cancelar
              </button>
              <button onClick={() => {
                  const v = Math.min(Math.max(editFechVal,1),31)
                  if (v !== diaFechamentoBase) updateMes(prev=>({...prev,fechamentoOverride:v}))
                  else updateMes(prev=>({...prev,fechamentoOverride:undefined}))
                  setEditandoFechamento(false)
                }}
                style={{flex:2,padding:'10px',border:'none',borderRadius:10,
                  background:`linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,
                  color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                ✓ Confirmar dia {editFechVal}
              </button>
            </div>
          </div>
        )}

        {/* Painel expandido — Vencimento */}
        {editandoVencimento && (
          <div style={{padding:'12px 14px 14px',borderTop:`1px solid ${COR.vermelho}22`,
            background:'#fff5f5'}}>
            <div style={{fontSize:13,color:'#64748b',marginBottom:10,
              display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontWeight:700,color:COR.vermelho}}>Dia de vencimento — {NOMES_MESES[mesVenc]}{anoVenc !== anoHoje ? ` ${anoVenc}` : ''}</span>
              <span style={{fontSize:12,color:COR.textoSuave}}>padrão: dia {diaVencimentoBase}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <button onClick={() => setEditVencVal(v => Math.max(1,v-1))}
                style={{width:44,height:44,borderRadius:12,border:`1.5px solid ${COR.vermelho}55`,
                  background:'#fff',fontSize:22,fontWeight:700,color:COR.vermelho,
                  cursor:'pointer',fontFamily:'inherit',display:'flex',
                  alignItems:'center',justifyContent:'center'}}>−</button>
              <input inputMode="numeric" type="number" min={1} max={31} value={editVencVal}
                onChange={e => setEditVencVal(Math.min(31,Math.max(1,parseInt(e.target.value)||1)))}
                style={{flex:1,textAlign:'center' as const,fontSize:28,fontWeight:800,
                  color:COR.vermelho,border:`2px solid ${COR.vermelho}`,borderRadius:12,
                  padding:'8px 0',background:'#fff',outline:'none',fontFamily:'inherit'}}/>
              <button onClick={() => setEditVencVal(v => Math.min(31,v+1))}
                style={{width:44,height:44,borderRadius:12,border:`1.5px solid ${COR.vermelho}55`,
                  background:'#fff',fontSize:22,fontWeight:700,color:COR.vermelho,
                  cursor:'pointer',fontFamily:'inherit',display:'flex',
                  alignItems:'center',justifyContent:'center'}}>+</button>
            </div>
            <div style={{display:'flex',gap:8,marginTop:10}}>
              <button onClick={() => setEditandoVencimento(false)}
                style={{flex:1,padding:'10px',border:`1.5px solid ${COR.borda}`,
                  borderRadius:10,background:COR.branco,color:COR.textoSuave,
                  fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                Cancelar
              </button>
              <button onClick={() => {
                  const v = Math.min(Math.max(editVencVal,1),31)
                  if (v !== diaVencimentoBase) updateMes(prev=>({...prev,vencimentoOverride:v}))
                  else updateMes(prev=>({...prev,vencimentoOverride:undefined}))
                  setEditandoVencimento(false)
                }}
                style={{flex:2,padding:'10px',border:'none',borderRadius:10,
                  background:`linear-gradient(135deg,#dc2626,#ef4444)`,
                  color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                ✓ Confirmar dia {editVencVal}
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* RESUMO — o que o plano reservou para o cartão, o que as faturas
          já somam e o que sobra. Um cartão branco, três números. */}
      {mobileView === 'extrato' && (
      <div style={{margin:'12px 16px 0',padding:'14px 8px',background:COR.branco,borderRadius:M.raio,
        boxShadow:M.sombra,display:'flex'}}>
        {([
          ['Planejado', totalPrevisto, COR.texto],
          ['Faturas', grandTotalFaturas, '#b91c1c'],
          ['Disponível', disponivel, disponivel >= 0 ? '#15803d' : '#b91c1c'],
        ] as [string, number, string][]).map(([rot, v, cor], i) => (
          <div key={rot} style={{flex:1,textAlign:'center',borderLeft:i?`1px solid ${COR.borda}`:'none',padding:'0 4px'}}>
            <div style={{fontSize:13,color:COR.textoSuave}}>{rot}</div>
            <div style={{fontSize:15,fontWeight:800,color:cor,fontVariantNumeric:'tabular-nums',marginTop:2,
              whiteSpace:'nowrap'}}>{fmt(v)}</div>
          </div>
        ))}
      </div>
      )}

      {/* FORM VIEW */}
      {mobileView === 'form' && (
        <div style={{paddingBottom:120}}>
          {/* Back bar */}
          <div style={{background:COR.branco,margin:'12px 16px 0',padding:'8px 12px',borderRadius:M.raio,boxShadow:M.sombra,
            display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
            <button onClick={() => { resetarParaNovo(diaSel); setMobileView('extrato') }}
              style={{border:'none',background:'#eff6ff',color:COR.azul,minHeight:40,borderRadius:999,
                fontSize:15,fontWeight:700,cursor:'pointer',fontFamily:'inherit',padding:'0 14px'}}>
              ‹ Voltar
            </button>
            <span style={{fontSize:17,fontWeight:800,color:COR.texto}}>
              {editandoId ? 'Editar compra' : 'Nova compra'}
            </span>
          </div>

          <div style={{margin:'12px 16px 0',padding:'18px 16px',background:COR.branco,borderRadius:M.raio,boxShadow:M.sombra,display:'flex',flexDirection:'column'}}>

            {/* Toggle Compra / Estorno */}
            <div style={{display:'flex',background:'#f1f5f9',borderRadius:999,
              padding:4,gap:4,marginBottom:16}}>
              {(['entrada','saida'] as const).map(t => {
                const ativo = fTipo === t
                const isCompra = t === 'entrada'
                return (
                  <button key={t} onClick={() => setFTipo(t)} style={{
                    flex:1,padding:10,minHeight:44,border:'none',borderRadius:999,cursor:'pointer',
                    fontSize:15,fontWeight:700,fontFamily:'inherit',
                    display:'flex',alignItems:'center',justifyContent:'center',gap:5,
                    background: ativo ? '#fff' : 'transparent',
                    color: ativo ? (isCompra ? '#b91c1c' : '#15803d') : '#475569',
                    boxShadow: ativo ? (isCompra ? '0 2px 8px rgba(220,38,38,.12)' : '0 2px 8px rgba(22,163,74,.12)') : 'none',
                  }}>
                    {isCompra ? '↓ Compra' : '↑ Estorno'}
                  </button>
                )
              })}
            </div>

            {/* Data da compra */}
            {(() => {
              const parsed = parseDateFatura(fDataCompra, purchaseMes, purchaseAno)
              const dispDia = parsed?.dia ?? diaSel
              const dispMes = parsed?.mes ?? purchaseMes
              const dispAno = parsed?.ano ?? purchaseAno
              const label = `${dispDia} de ${NOMES_MESES[dispMes]}${dispAno !== purchaseAno ? ' '+dispAno : ''} · ${diaSemana(dispDia,dispMes,dispAno)}`
              return (
                <div style={{marginBottom:14}}>
                  <label style={rotuloForm}>
                    Data da compra
                  </label>
                  <input ref={dataCompraRef} type="text" value={fDataCompra}
                    onChange={e => setFDataCompra(e.target.value)}
                    onBlur={() => {
                      const p = parseDateFatura(fDataCompra, purchaseMes, purchaseAno)
                      if (p) {
                        setDiaSel(p.dia)
                        const acStr = p.ano !== purchaseAno ? `/${p.ano}` : ''
                        setFDataCompra(`${String(p.dia).padStart(2,'0')}/${String(p.mes+1).padStart(2,'0')}${acStr}`)
                      }
                    }}
                    placeholder={`${String(diaSel).padStart(2,'0')}/${String(purchaseMes+1).padStart(2,'0')}`}
                    style={{width:'100%',border:`1.5px solid ${COR.borda}`,borderRadius:12,
                      padding:'12px 14px',fontSize:16,minHeight:48,outline:'none',background:'#fff',
                      fontFamily:'inherit',color:COR.texto,boxSizing:'border-box' as const}}
                    onKeyDown={e => { if (e.key==='Enter') (e.target as HTMLInputElement).blur() }}/>
                  <div style={{fontSize:13,color:COR.azul,fontWeight:600,marginTop:6}}><i className="ti ti-calendar" aria-hidden style={{verticalAlign:-2}} /> {label}</div>
                </div>
              )
            })()}

            {/* Categoria */}
            <div style={{marginBottom:14}}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ ...rotuloForm, marginBottom: 0 }}>Categoria</label>
                <button type="button" onClick={onNovaCategoria} style={{
                  border: 'none', background: '#eff6ff', borderRadius: 999, padding: '6px 12px', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: COR.azul,
                }}>+ Nova</button>
              </div>
              <select ref={categoriaSelectRef} value={fCat} onChange={e => { setFCat(e.target.value); setFVariante('') }}
                style={{width:'100%',border:`1.5px solid ${COR.borda}`,borderRadius:12,
                  padding:'12px 14px',fontSize:16,minHeight:48,outline:'none',background:'#fff',
                  fontFamily:'inherit',color:COR.texto,
                  appearance:'none' as const,cursor:'pointer',
                  backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E\")",
                  backgroundRepeat:'no-repeat',backgroundPosition:'calc(100% - 14px) center'}}>
                <option value="">Selecione...</option>
                {(() => {
                  // Uma linha por nome, agrupada, como no computador e no banco:
                  // a variante se escolhe no campo de baixo.
                  const vistos = new Set<string>()
                  const grupos = new Map<string, typeof categoriasCartao>()
                  for (const c of categoriasCartao) {
                    const k = c.nome.trim().toLowerCase()
                    if (vistos.has(k)) continue
                    vistos.add(k)
                    const g = c.grupo ?? ''
                    if (!grupos.has(g)) grupos.set(g, [])
                    grupos.get(g)!.push(c)
                  }
                  return Array.from(grupos.entries())
                    .sort(([a], [b]) => a === '' ? 1 : b === '' ? -1 : a.localeCompare(b, 'pt-BR'))
                    .map(([grupo, cats]) => grupo
                      ? <optgroup key={grupo} label={grupo}>{cats.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}</optgroup>
                      : cats.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>))
                })()}
              </select>
            </div>

            {/* Variante */}
            {(() => {
              const norm = fCat.trim().toLowerCase()
              const subDescs = fCat ? categoriasCartao.filter(c => c.nome.trim().toLowerCase() === norm && c.descricao?.trim()).map(c => c.descricao!.trim()) : []
              return subDescs.length > 0 ? (
                <div style={{marginBottom:14}}>
                  <label style={rotuloForm}>Variante</label>
                  <select value={fVariante} onChange={e => setFVariante(e.target.value)}
                    style={{width:'100%',border:`1.5px solid ${COR.borda}`,borderRadius:12,
                      padding:'12px 14px',fontSize:16,minHeight:48,outline:'none',background:'#fff',
                      fontFamily:'inherit',color:COR.texto,
                      appearance:'none' as const,cursor:'pointer',
                      backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E\")",
                      backgroundRepeat:'no-repeat',backgroundPosition:'calc(100% - 14px) center'}}>
                    <option value="">Selecione a variante...</option>
                    {subDescs.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              ) : null
            })()}

            {/* Valor da parcela */}
            <div style={{marginBottom:14}}>
              <label style={rotuloForm}>Valor da parcela</label>
              <input inputMode="decimal" ref={valorInputRef} value={fValor}
                onChange={e => setFValor(e.target.value)}
                placeholder="R$ 0,00"
                style={{width:'100%',border:`2px solid ${COR.azul}`,borderRadius:12,
                  padding:'12px 14px',fontSize:22,fontWeight:800,color:COR.azul,
                  background:'#eff6ff',outline:'none',fontFamily:'inherit',
                  textAlign:'center' as const,letterSpacing:-.4,
                  boxSizing:'border-box' as const,...(valorRuim?REALCE_ERRO:{})}}
                onKeyDown={e => e.key==='Enter' && lancar()}/>
              {avisoParcelas && (
            <div style={{fontSize:13,color:'#475569',marginTop:6}}>{avisoParcelas}</div>
          )}
            </div>

            {/* Parcelas */}
            <div style={{marginBottom:14}}>
              <label style={rotuloForm}>Parcelas</label>
              <div style={{display:'flex',flexWrap:'wrap' as const,gap:7}}>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map((n, i) => {
                  const parcelasAtual = Math.max(1, parseInt(fParcelas) || 1)
                  const ativo = parcelasAtual === n
                  return (
                    <button key={n} ref={el => { parcelasBtnRefs.current[i] = el }}
                      tabIndex={ativo ? 0 : -1} onClick={() => setFParcelas(String(n))}
                      onKeyDown={e => {
                        if (e.key==='ArrowRight'||e.key==='ArrowDown') { e.preventDefault(); if (n<12) { setFParcelas(String(n+1)); parcelasBtnRefs.current[i+1]?.focus() } }
                        else if (e.key==='ArrowLeft'||e.key==='ArrowUp') { e.preventDefault(); if (n>1) { setFParcelas(String(n-1)); parcelasBtnRefs.current[i-1]?.focus() } }
                        else if (e.key==='Enter') { e.preventDefault(); lancar() }
                      }}
                      style={{width:52,height:44,borderRadius:12,
                        border:`1.5px solid ${ativo ? COR.azul : COR.borda}`,
                        background: ativo ? '#eff6ff' : '#fff',
                        fontSize:14,fontWeight:700,
                        color: ativo ? COR.azul : COR.textoSuave,
                        cursor:'pointer',fontFamily:'inherit',
                        display:'flex',alignItems:'center',justifyContent:'center',
                        boxShadow: ativo ? '0 0 0 2px rgba(26,86,219,.15)' : 'none'}}>
                      {n}x
                    </button>
                  )
                })}
              </div>
              {parseInt(fParcelas) > 1 && parseBRL(fValor) > 0 && (
                <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',
                  borderRadius:10,padding:'10px 14px',marginTop:8,
                  display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:13,color:COR.textoSuave}}>Total da compra</span>
                  <span style={{fontSize:14,fontWeight:800,color:'#16a34a'}}>
                    {fmt(parseBRL(fValor) * Math.max(1, parseInt(fParcelas)||1))} · {fParcelas||'1'}x
                  </span>
                </div>
              )}
            </div>

            {/* Descrição */}
            <div style={{marginBottom:14}}>
              <label style={rotuloForm}>
                Descrição{' '}
                <span style={{fontWeight:400}}>
                  (opcional)
                </span>
              </label>
              <input value={fDesc} onChange={e => setFDesc(e.target.value)}
                placeholder="Ex: Mercado Extra, Farmácia..."
                style={{width:'100%',border:`1.5px solid ${COR.borda}`,borderRadius:12,
                  padding:'12px 14px',fontSize:16,minHeight:48,outline:'none',background:'#fff',
                  fontFamily:'inherit',color:COR.texto,boxSizing:'border-box' as const}}
                onKeyDown={e => e.key==='Enter' && lancar()}/>
            </div>

            {/* Botões */}
            <div style={{display:'flex',gap:8,marginTop:4}}>
              {editandoId && (
                <button onClick={() => {
                  if (!editandoId) return
                  const diaAlvo = editandoDiaOriginal ?? diaSel
                  excluir(diaAlvo, editandoId)
                }} style={{
                  flex:1,padding:'13px 0',border:`1.5px solid ${COR.borda}`,
                  borderRadius:999,cursor:'pointer',fontSize:15,fontWeight:700,
                  background:COR.branco,color:COR.vermelho,fontFamily:'inherit'}}>
                  Excluir
                </button>
              )}
              <button onClick={() => {
                const valid = !!fCat && parseBRL(fValor) > 0
                lancar()
                if (valid) setMobileView('extrato')
              }} style={{
                flex:2,padding:15,border:'none',borderRadius:999,
                background:`linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,
                color:'#fff',fontSize:16,fontWeight:800,cursor:'pointer',fontFamily:'inherit',
                boxShadow:'0 4px 16px rgba(26,86,219,.3)'}}>
                {editandoId ? '✓ Salvar alterações' : '✓ Salvar lançamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXTRATO VIEW: lista única, a compra mais recente no topo */}
      {mobileView === 'extrato' && (
        <div style={{padding:'16px 16px 140px',display:'flex',flexDirection:'column',gap:16}}>
          <button onClick={() => { resetarParaNovo(diaHoje); setMobileView('form') }} style={{
            display:'flex',alignItems:'center',justifyContent:'center',gap:8,minHeight:52,
            border:'none',borderRadius:999,cursor:'pointer',fontFamily:'inherit',
            background:`linear-gradient(135deg,${COR.azul},#2563eb)`,color:'#fff',
            fontSize:16,fontWeight:700,boxShadow:'0 6px 18px rgba(26,86,219,.28)'}}>
            <span aria-hidden style={{fontSize:20,lineHeight:1}}>＋</span> Nova compra
          </button>
          {(() => {
            const allItems: Array<{dia:number;dc:number;mc:number;ac:number;l:Lancamento}> = []
            for (let d = 1; d <= totalDias; d++) {
              for (const l of (mesDados.lancamentos[d] ?? [])) {
                const dc = l.diaCompra ?? d
                const mc = l.mesCompra ?? purchaseMes
                const ac = l.anoCompra ?? purchaseAno
                allItems.push({dia:d, dc, mc, ac, l})
              }
            }
            if (allItems.length === 0) {
              return (
                <div style={{background:COR.branco,borderRadius:M.raio,boxShadow:M.sombra,padding:'22px 18px',
                  textAlign:'center' as const,color:COR.textoSuave,fontSize:M.corpo}}>
                  Nenhuma compra nesta fatura.
                </div>
              )
            }
            allItems.sort(compararNaFatura)
            return (
              <div style={{background:COR.branco,borderRadius:M.raio,boxShadow:M.sombra,padding:'4px 16px'}}>
                {allItems.map(({dia, dc, mc, ac, l}, idx) => {
                  const catVisual = iconeCategoria(categorias, l.categoria)
                  const hasDesc = !!(l.descricao && l.descricao !== l.categoria)
                  // Título é a categoria ("Grupo · Nome · Variante"), como no
                  // computador e no banco; a descrição vai na linha de baixo.
                  const nomePrimario = lancLabelComGrupo(l, categorias)
                  // Data primeiro: é por ela que se confere contra a fatura do banco.
                  const legenda = [
                    `${String(dc).padStart(2,'0')}/${String(mc+1).padStart(2,'0')}${ac !== purchaseAno ? `/${ac}` : ''}`,
                    l.parcelas && l.parcelas > 1 ? `${l.parcelaAtual} de ${l.parcelas}` : undefined,
                    hasDesc ? l.descricao : undefined,
                    buscarCategoria(categorias, l.categoria)?.ativa === false ? 'inativa' : undefined,
                  ].filter(Boolean).join(' · ')
                  return (
                    <div key={l.id}
                      onClick={() => { editarLancamento(dia, l); setMobileView('form') }}
                      style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',minHeight:56,cursor:'pointer',
                        borderTop: idx === 0 ? 'none' : '1px solid #eef2f8'}}>
                      <IconeRedondo icone={catVisual.icone} cor={catVisual.cor} tamanho={40} />
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:M.corpo,fontWeight:600,color:COR.texto,
                          whiteSpace:'nowrap' as const,overflow:'hidden',textOverflow:'ellipsis'}}>
                          {nomePrimario}
                        </div>
                        <div style={{fontSize:M.legenda,color:COR.textoSuave,marginTop:2,
                          whiteSpace:'nowrap' as const,overflow:'hidden',textOverflow:'ellipsis'}}>
                          {legenda}
                        </div>
                      </div>
                      {/* Na fatura, 'entrada' é COMPRA (dívida) e 'saida' é estorno. */}
                      <div style={{fontSize:M.corpo,fontWeight:700,whiteSpace:'nowrap' as const,flexShrink:0,
                        fontVariantNumeric:'tabular-nums',color:l.tipo==='entrada'?'#b91c1c':'#15803d'}}>
                        {l.tipo==='entrada'?'−':'+'}{fmt(l.valor)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      )}

    </div>
  )
}
