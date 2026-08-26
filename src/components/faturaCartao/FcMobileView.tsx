import React from 'react'
import type { Conta, Categoria } from '../../context/AppContext'
import { iconeCategoria } from '../../utils/categoriaIcone'
import {
  COR, NOMES_MESES, fmt, parseBRL, parseDateFatura, diaSemana,
  catOptValue, catOptLabel, parseCatOpt, lancLabel,
  type TipoLanc, type Lancamento, type DadosMes,
} from './FcShared'

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
  mes, setMes, ano, setAno, anoHoje, diaHoje,
  mobileView, setMobileView,
  editandoFechamento, setEditandoFechamento,
  editandoVencimento, setEditandoVencimento,
  editFechVal, setEditFechVal,
  editVencVal, setEditVencVal,
  fTipo, setFTipo, fCat, setFCat, fDesc, setFDesc, fVariante, setFVariante,
  fValor, setFValor, fParcelas, setFParcelas,
  fDataCompra, setFDataCompra,
  editandoId, editandoDiaOriginal,
  diaSel, setDiaSel,
  diaFechamento, diaVencimento, diaFechamentoBase, diaVencimentoBase,
  mesDados, totalDias, purchaseMes, purchaseAno,
  faturaStatus, totalPrevisto, grandTotalFaturas, totalFatura,
  mesVenc, anoVenc,
  categorias, categoriasCartao,
  dataCompraRef, categoriaSelectRef, valorInputRef, parcelasBtnRefs,
  resetarParaNovo, editarLancamento, excluir, updateMes, lancar, diaDefaultPara,
}: Props) {
  const prevMesNav = () => { if (mes === 0) { setMes(11); setAno(y => y-1) } else setMes(m => m-1) }
  const nextMesNav = () => { if (mes === 11) { setMes(0); setAno(y => y+1) } else setMes(m => m+1) }
  const statusCor = faturaStatus==='paga' ? '#16a34a' : faturaStatus==='fechada' ? '#0369a1' : '#d97706'
  const statusLbl = faturaStatus==='paga' ? 'Paga' : faturaStatus==='fechada' ? 'Fechada' : 'Aberta'
  const disponivel = totalPrevisto - grandTotalFaturas

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:COR.fundo}}>

      {/* SUB-HEADER */}
      <div style={{flexShrink:0,background:COR.branco,boxShadow:'0 2px 6px rgba(0,0,0,0.06)'}}>
        {/* Cartão pills */}
        <div style={{display:'flex',gap:6,padding:'10px 14px 4px',overflowX:'auto',
          scrollbarWidth:'none' as const}}>
          {contasCartao.map(c => {
            const ativa = c.id === contaId
            return (
              <button key={c.id}
                onClick={() => { setContaId(c.id); resetarParaNovo(diaDefaultPara(mes,ano)) }}
                style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',
                  borderRadius:20,border:`1.5px solid ${ativa ? COR.azul : COR.borda}`,
                  background:ativa ? '#eff6ff' : '#f8faff',flexShrink:0,
                  cursor:'pointer',whiteSpace:'nowrap' as const,
                  fontFamily:'inherit',fontSize:12,fontWeight:600,
                  color:ativa ? COR.azul : COR.textoSuave}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:c.cor,flexShrink:0}}/>
                <span style={{fontSize:14,lineHeight:1}}>{c.icone}</span>
                {c.banco}{c.apelido ? ` ${c.apelido}` : ''}
              </button>
            )
          })}
        </div>
        {/* Mês nav + status badge */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'8px 14px 10px'}}>
          <button onClick={prevMesNav} style={{width:30,height:30,borderRadius:10,border:'none',
            background:'#f0f4ff',display:'flex',alignItems:'center',justifyContent:'center',
            cursor:'pointer',fontSize:16,color:COR.azul,fontFamily:'inherit'}}>‹</button>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:15,fontWeight:700,color:COR.texto}}>
              {NOMES_MESES[mes]}{ano !== anoHoje ? ` ${ano}` : ''}
            </span>
            <span style={{fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:20,
              background:statusCor+'18',color:statusCor,border:`1px solid ${statusCor}44`}}>
              {statusLbl}
            </span>
          </div>
          <button onClick={nextMesNav} style={{width:30,height:30,borderRadius:10,border:'none',
            background:'#f0f4ff',display:'flex',alignItems:'center',justifyContent:'center',
            cursor:'pointer',fontSize:16,color:COR.azul,fontFamily:'inherit'}}>›</button>
        </div>
      </div>

      {/* INFO BAR: fecha · vence — chips + painel expandido */}
      <div style={{flexShrink:0,background:COR.branco,borderBottom:`1px solid ${COR.borda}`}}>
        {/* Chips row */}
        <div style={{padding:'7px 12px',display:'flex',alignItems:'center',gap:8}}>
          {/* Chip fechamento */}
          <div onClick={() => {
              if (editandoFechamento) { setEditandoFechamento(false); return }
              setEditFechVal(diaFechamento)
              setEditandoFechamento(true); setEditandoVencimento(false)
            }}
            style={{display:'flex',alignItems:'center',gap:5,cursor:'pointer',
              background: editandoFechamento ? '#eff6ff' : '#f8faff',
              border:`1.5px solid ${editandoFechamento ? COR.azul : COR.azul+'44'}`,
              borderRadius:20,padding:'5px 12px',flexShrink:0}}>
            <span style={{fontSize:11,fontWeight:600,color:COR.azul}}>
              ✂ Fecha dia {diaFechamento}
            </span>
            {mesDados.fechamentoOverride && <span style={{fontSize:9,color:'#94a3b8'}}>*</span>}
          </div>

          <span style={{color:'#e2e8f0',fontSize:11,flexShrink:0}}>·</span>

          {/* Chip vencimento */}
          <div onClick={() => {
              if (editandoVencimento) { setEditandoVencimento(false); return }
              setEditVencVal(diaVencimento)
              setEditandoVencimento(true); setEditandoFechamento(false)
            }}
            style={{display:'flex',alignItems:'center',gap:5,cursor:'pointer',
              background: editandoVencimento ? '#fff5f5' : '#fff8f8',
              border:`1.5px solid ${editandoVencimento ? COR.vermelho : COR.vermelho+'44'}`,
              borderRadius:20,padding:'5px 12px',flexShrink:0}}>
            <span style={{fontSize:11,fontWeight:600,color:COR.vermelho}}>
              📅 Vence dia {diaVencimento}
            </span>
            {mesDados.vencimentoOverride && <span style={{fontSize:9,color:'#94a3b8'}}>*</span>}
          </div>
        </div>

        {/* Painel expandido — Fechamento */}
        {editandoFechamento && (
          <div style={{padding:'12px 14px 14px',borderTop:`1px solid ${COR.azul}22`,
            background:'#f0f7ff'}}>
            <div style={{fontSize:11,color:'#64748b',marginBottom:10,
              display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontWeight:700,color:COR.azul}}>Dia de fechamento — {NOMES_MESES[purchaseMes]}</span>
              <span style={{fontSize:10,color:'#94a3b8'}}>padrão: dia {diaFechamentoBase}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <button onClick={() => setEditFechVal(v => Math.max(1,v-1))}
                style={{width:44,height:44,borderRadius:12,border:`1.5px solid ${COR.azul}55`,
                  background:'#fff',fontSize:22,fontWeight:700,color:COR.azul,
                  cursor:'pointer',fontFamily:'inherit',display:'flex',
                  alignItems:'center',justifyContent:'center'}}>−</button>
              <input type="number" min={1} max={31} value={editFechVal}
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
            <div style={{fontSize:11,color:'#64748b',marginBottom:10,
              display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontWeight:700,color:COR.vermelho}}>Dia de vencimento — {NOMES_MESES[mesVenc]}{anoVenc !== anoHoje ? ` ${anoVenc}` : ''}</span>
              <span style={{fontSize:10,color:'#94a3b8'}}>padrão: dia {diaVencimentoBase}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <button onClick={() => setEditVencVal(v => Math.max(1,v-1))}
                style={{width:44,height:44,borderRadius:12,border:`1.5px solid ${COR.vermelho}55`,
                  background:'#fff',fontSize:22,fontWeight:700,color:COR.vermelho,
                  cursor:'pointer',fontFamily:'inherit',display:'flex',
                  alignItems:'center',justifyContent:'center'}}>−</button>
              <input type="number" min={1} max={31} value={editVencVal}
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

      {/* RESUMO STRIP */}
      <div style={{flexShrink:0,background:COR.branco,borderBottom:`2px solid ${COR.borda}`,
        padding:'10px 14px',display:'flex',gap:0}}>
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2,
          paddingRight:6,borderRight:`1px solid ${COR.borda}`}}>
          <span style={{fontSize:9,color:'#94a3b8',fontWeight:600,
            textTransform:'uppercase' as const,letterSpacing:.3,textAlign:'center' as const}}>
            Limite planejado
          </span>
          <span style={{fontSize:13,fontWeight:800,color:COR.azul,letterSpacing:-.3}}>
            {fmt(totalPrevisto)}
          </span>
        </div>
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2,
          padding:'0 6px',borderRight:`1px solid ${COR.borda}`}}>
          <span style={{fontSize:9,color:'#94a3b8',fontWeight:600,
            textTransform:'uppercase' as const,letterSpacing:.3,textAlign:'center' as const}}>
            Fatura total
          </span>
          <span style={{fontSize:13,fontWeight:800,color:COR.vermelho,letterSpacing:-.3}}>
            {fmt(grandTotalFaturas)}
          </span>
        </div>
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2,paddingLeft:6}}>
          <span style={{fontSize:9,color:'#94a3b8',fontWeight:600,
            textTransform:'uppercase' as const,letterSpacing:.3,textAlign:'center' as const}}>
            Disponível
          </span>
          <span style={{fontSize:13,fontWeight:800,
            color:disponivel>=0?COR.verde:COR.vermelho,letterSpacing:-.3}}>
            {fmt(disponivel)}
          </span>
        </div>
      </div>

      {/* FORM VIEW */}
      {mobileView === 'form' && (
        <div style={{flex:1,overflowY:'auto',scrollbarWidth:'none' as const}}>
          {/* Back bar */}
          <div style={{background:COR.branco,padding:'10px 16px',
            borderBottom:`1px solid ${COR.borda}`,
            display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
            <button onClick={() => { resetarParaNovo(diaSel); setMobileView('extrato') }}
              style={{border:'none',background:'transparent',color:COR.azul,
                fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',padding:0}}>
              ‹ Voltar
            </button>
            <span style={{fontSize:14,fontWeight:700,color:COR.texto}}>
              {editandoId ? 'Editar lançamento' : 'Novo lançamento'}
            </span>
          </div>

          <div style={{padding:'14px',display:'flex',flexDirection:'column'}}>

            {/* Toggle Compra / Estorno */}
            <div style={{display:'flex',background:'#f1f5f9',borderRadius:12,
              padding:3,gap:3,marginBottom:16}}>
              {(['entrada','saida'] as const).map(t => {
                const ativo = fTipo === t
                const isCompra = t === 'entrada'
                return (
                  <button key={t} onClick={() => setFTipo(t)} style={{
                    flex:1,padding:10,border:'none',borderRadius:10,cursor:'pointer',
                    fontSize:13,fontWeight:700,fontFamily:'inherit',
                    display:'flex',alignItems:'center',justifyContent:'center',gap:5,
                    background: ativo ? (isCompra ? '#fff1f2' : '#f0fdf4') : 'transparent',
                    color: ativo ? (isCompra ? '#dc2626' : '#16a34a') : '#94a3b8',
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
              const label = `📅 ${dispDia} de ${NOMES_MESES[dispMes]}${dispAno !== purchaseAno ? ' '+dispAno : ''} · ${diaSemana(dispDia,dispMes,dispAno)}`
              return (
                <div style={{marginBottom:14}}>
                  <label style={{fontSize:10,fontWeight:700,color:COR.azul,
                    textTransform:'uppercase' as const,letterSpacing:.5,
                    marginBottom:5,display:'block'}}>
                    📅 Data da compra
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
                      padding:'11px 14px',fontSize:14,outline:'none',background:'#fff',
                      fontFamily:'inherit',color:COR.texto,boxSizing:'border-box' as const}}
                    onKeyDown={e => { if (e.key==='Enter') (e.target as HTMLInputElement).blur() }}/>
                  <div style={{fontSize:11,color:COR.azul,fontWeight:600,marginTop:4}}>{label}</div>
                </div>
              )
            })()}

            {/* Categoria */}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:10,fontWeight:700,color:COR.azul,
                textTransform:'uppercase' as const,letterSpacing:.5,
                marginBottom:5,display:'block'}}>🏷 Categoria</label>
              <select ref={categoriaSelectRef}
                value={fVariante ? `${fCat}||${fVariante}` : fCat}
                onChange={e => { const { nome, variante } = parseCatOpt(e.target.value); setFCat(nome); setFVariante(variante) }}
                style={{width:'100%',border:`1.5px solid ${COR.borda}`,borderRadius:12,
                  padding:'11px 14px',fontSize:14,outline:'none',background:'#fff',
                  fontFamily:'inherit',color:COR.texto,
                  appearance:'none' as const,cursor:'pointer',
                  backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E\")",
                  backgroundRepeat:'no-repeat',backgroundPosition:'calc(100% - 14px) center'}}>
                <option value="">Selecione...</option>
                {categoriasCartao.map(c => (
                  <option key={c.id} value={catOptValue(c)}>{catOptLabel(c)}</option>
                ))}
              </select>
            </div>

            {/* Variante */}
            {(() => {
              const norm = fCat.trim().toLowerCase()
              const subDescs = fCat ? categoriasCartao.filter(c => c.nome.trim().toLowerCase() === norm && c.descricao?.trim()).map(c => c.descricao!.trim()) : []
              return subDescs.length > 0 ? (
                <div style={{marginBottom:14}}>
                  <label style={{fontSize:10,fontWeight:700,color:COR.azul,
                    textTransform:'uppercase' as const,letterSpacing:.5,
                    marginBottom:5,display:'block'}}>🔖 Variante</label>
                  <select value={fVariante} onChange={e => setFVariante(e.target.value)}
                    style={{width:'100%',border:`1.5px solid ${COR.borda}`,borderRadius:12,
                      padding:'11px 14px',fontSize:14,outline:'none',background:'#fff',
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
              <label style={{fontSize:10,fontWeight:700,color:COR.azul,
                textTransform:'uppercase' as const,letterSpacing:.5,
                marginBottom:5,display:'block'}}>💰 Valor da parcela</label>
              <input ref={valorInputRef} value={fValor}
                onChange={e => setFValor(e.target.value)}
                placeholder="R$ 0,00"
                style={{width:'100%',border:`2px solid ${COR.azul}`,borderRadius:12,
                  padding:'12px 14px',fontSize:22,fontWeight:800,color:COR.azul,
                  background:'#eff6ff',outline:'none',fontFamily:'inherit',
                  textAlign:'center' as const,letterSpacing:-.4,
                  boxSizing:'border-box' as const}}
                onKeyDown={e => e.key==='Enter' && lancar()}/>
            </div>

            {/* Parcelas */}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:10,fontWeight:700,color:COR.azul,
                textTransform:'uppercase' as const,letterSpacing:.5,
                marginBottom:5,display:'block'}}>🔢 Parcelas</label>
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
                      style={{width:46,height:36,borderRadius:10,
                        border:`1.5px solid ${ativo ? COR.azul : COR.borda}`,
                        background: ativo ? '#eff6ff' : '#fff',
                        fontSize:12,fontWeight:700,
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
                  <span style={{fontSize:11,color:COR.textoSuave}}>Total da compra</span>
                  <span style={{fontSize:14,fontWeight:800,color:'#16a34a'}}>
                    {fmt(parseBRL(fValor) * Math.max(1, parseInt(fParcelas)||1))} · {fParcelas||'1'}x
                  </span>
                </div>
              )}
            </div>

            {/* Descrição */}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:10,fontWeight:700,color:COR.azul,
                textTransform:'uppercase' as const,letterSpacing:.5,
                marginBottom:5,display:'block'}}>
                📝 Descrição{' '}
                <span style={{fontWeight:400,color:'#94a3b8',
                  textTransform:'none' as const,fontSize:9,letterSpacing:0}}>
                  (opcional)
                </span>
              </label>
              <input value={fDesc} onChange={e => setFDesc(e.target.value)}
                placeholder="Ex: Mercado Extra, Farmácia..."
                style={{width:'100%',border:`1.5px solid ${COR.borda}`,borderRadius:12,
                  padding:'11px 14px',fontSize:14,outline:'none',background:'#fff',
                  fontFamily:'inherit',color:COR.texto,boxSizing:'border-box' as const}}
                onKeyDown={e => e.key==='Enter' && lancar()}/>
            </div>

            {/* Botões */}
            <div style={{display:'flex',gap:8,marginTop:4,paddingBottom:20}}>
              {editandoId && (
                <button onClick={() => {
                  if (!editandoId) return
                  const diaAlvo = editandoDiaOriginal ?? diaSel
                  excluir(diaAlvo, editandoId)
                }} style={{
                  flex:1,padding:'13px 0',border:`1.5px solid ${COR.borda}`,
                  borderRadius:12,cursor:'pointer',fontSize:14,fontWeight:600,
                  background:COR.branco,color:COR.vermelho,fontFamily:'inherit'}}>
                  Excluir
                </button>
              )}
              <button onClick={() => {
                const valid = !!fCat && parseBRL(fValor) > 0
                lancar()
                if (valid) setMobileView('extrato')
              }} style={{
                flex:2,padding:15,border:'none',borderRadius:14,
                background:`linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,
                color:'#fff',fontSize:16,fontWeight:800,cursor:'pointer',fontFamily:'inherit',
                boxShadow:'0 4px 16px rgba(26,86,219,.3)'}}>
                {editandoId ? '✓ Salvar alterações' : '✓ Salvar lançamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXTRATO VIEW: flat list in one card */}
      {mobileView === 'extrato' && (
        <div style={{flex:1,overflowY:'auto',padding:'10px 14px 160px'}}>
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
                <div style={{textAlign:'center' as const,color:COR.textoSuave,padding:40,fontSize:13}}>
                  Nenhum lançamento nesta fatura.
                </div>
              )
            }
            allItems.sort((a, b) => {
              const ka = `${a.ac}-${String(a.mc+1).padStart(2,'0')}-${String(a.dc).padStart(2,'0')}`
              const kb = `${b.ac}-${String(b.mc+1).padStart(2,'0')}-${String(b.dc).padStart(2,'0')}`
              return kb.localeCompare(ka)
            })
            return (
              <div style={{background:COR.branco,borderRadius:14,
                border:`1.5px solid ${COR.borda}`,overflow:'hidden',
                boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
                {allItems.map(({dia, dc, mc, ac, l}, idx) => {
                  const catVisual = iconeCategoria(categorias, l.categoria)
                  const hasDesc = !!(l.descricao && l.descricao !== l.categoria)
                  const nomePrimario = hasDesc ? l.descricao : lancLabel(l)
                  const mesCompraLabel = (mc !== purchaseMes || ac !== purchaseAno)
                    ? ` de ${NOMES_MESES[mc].slice(0,3)}`
                    : ''
                  return (
                    <div key={l.id}
                      onClick={() => { editarLancamento(dia, l); setMobileView('form') }}
                      style={{display:'flex',alignItems:'center',gap:10,
                        padding:'11px 14px',cursor:'pointer',
                        borderBottom: idx < allItems.length-1 ? `1px solid ${COR.borda}` : 'none',
                        background:COR.branco}}>
                      <div style={{width:38,height:38,borderRadius:10,flexShrink:0,
                        display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,
                        background:catVisual.cor}}>
                        {catVisual.icone}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600,color:COR.texto,
                          whiteSpace:'nowrap' as const,overflow:'hidden',textOverflow:'ellipsis'}}>
                          {nomePrimario}
                        </div>
                        <div style={{fontSize:10,color:'#94a3b8',marginTop:2,
                          display:'flex',alignItems:'center',gap:5}}>
                          <span>
                            {hasDesc ? `${lancLabel(l)} · ` : ''}dia {dc}{mesCompraLabel}
                          </span>
                          {l.parcelas && l.parcelas > 1 && (
                            <span style={{fontSize:8,padding:'1px 6px',borderRadius:6,fontWeight:700,
                              background:'#f5f3ff',color:'#7c3aed'}}>
                              {l.parcelaAtual}/{l.parcelas}x
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{fontSize:14,fontWeight:700,whiteSpace:'nowrap' as const,
                        letterSpacing:-.3,color:l.tipo==='entrada'?COR.azul:COR.vermelho,flexShrink:0}}>
                        {l.tipo==='entrada'?'+':'-'}{fmt(l.valor)}
                      </div>
                      <button onClick={e => { e.stopPropagation(); excluir(dia, l.id) }}
                        style={{border:'none',background:'transparent',cursor:'pointer',
                          color:'#e2e8f0',fontSize:14,padding:3,borderRadius:6,flexShrink:0}}>✕</button>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      )}

      {/* TOTAL FOOTER */}
      {mobileView === 'extrato' && (
        <div style={{position:'fixed',left:0,right:0,bottom:70,zIndex:39,
          background:`linear-gradient(135deg,${COR.azulEscuro},${COR.azulMedio})`,
          padding:'10px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',
          boxShadow:'0 -2px 8px rgba(0,0,0,0.2)'}}>
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
      )}

      {/* ADD BAR */}
      {mobileView === 'extrato' && (
        <button onClick={() => { resetarParaNovo(diaHoje); setMobileView('form') }}
          style={{position:'fixed',left:0,right:0,bottom:114,zIndex:40,
            border:'none',background:COR.branco,
            borderTop:`1px solid ${COR.borda}`,borderBottom:`1px solid ${COR.borda}`,
            padding:'11px 20px',display:'flex',alignItems:'center',justifyContent:'center',
            gap:6,cursor:'pointer',fontFamily:'inherit'}}>
          <span style={{fontSize:16,color:COR.azul,fontWeight:700,lineHeight:1}}>+</span>
          <span style={{fontSize:13,fontWeight:600,color:COR.azul}}>Adicionar lançamento</span>
        </button>
      )}

    </div>
  )
}
