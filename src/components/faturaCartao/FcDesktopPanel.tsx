import React from 'react'
import type { Categoria } from '../../context/AppContext'
import {
  COR, NOMES_MESES, fmt, parseBRL, parseDateFatura, diaSemana,
  realcarFoco, removerRealce,
  type TipoLanc, type DadosMes,
} from './FcShared'

type Props = {
  editandoId: string | null

  // Fechamento/Vencimento inline editors
  editandoFechamento: boolean
  setEditandoFechamento: React.Dispatch<React.SetStateAction<boolean>>
  editandoVencimento: boolean
  setEditandoVencimento: React.Dispatch<React.SetStateAction<boolean>>

  // Form fields
  fTipo: TipoLanc
  setFTipo: React.Dispatch<React.SetStateAction<TipoLanc>>
  fCat: string
  setFCat: React.Dispatch<React.SetStateAction<string>>
  fDesc: string
  setFDesc: React.Dispatch<React.SetStateAction<string>>
  fValor: string
  setFValor: React.Dispatch<React.SetStateAction<string>>
  fParcelas: string
  setFParcelas: React.Dispatch<React.SetStateAction<string>>
  fDataCompra: string
  setFDataCompra: React.Dispatch<React.SetStateAction<string>>

  // Card/month data
  diaFechamento: number
  diaVencimento: number
  diaFechamentoBase: number
  diaVencimentoBase: number
  mesDados: DadosMes
  purchaseMes: number
  purchaseAno: number
  diaSel: number
  setDiaSel: React.Dispatch<React.SetStateAction<number>>
  mesVenc: number
  anoVenc: number

  // Categories
  categoriasCartao: Categoria[]

  // Refs
  dataCompraRef: React.RefObject<HTMLInputElement | null>
  categoriaSelectRef: React.RefObject<HTMLSelectElement | null>
  valorInputRef: React.RefObject<HTMLInputElement | null>
  parcelasBtnRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>

  // Handlers
  resetarParaNovo: (dia: number) => void
  excluirAtual: () => void
  lancar: () => void
  updateMes: (fn: (prev: DadosMes) => DadosMes) => void
}

export default function FcDesktopPanel({
  editandoId,
  editandoFechamento, setEditandoFechamento,
  editandoVencimento, setEditandoVencimento,
  fTipo, setFTipo, fCat, setFCat, fDesc, setFDesc,
  fValor, setFValor, fParcelas, setFParcelas,
  fDataCompra, setFDataCompra,
  diaFechamento, diaVencimento, diaFechamentoBase, diaVencimentoBase,
  mesDados, purchaseMes, purchaseAno, diaSel, setDiaSel, mesVenc, anoVenc,
  categoriasCartao,
  dataCompraRef, categoriaSelectRef, valorInputRef, parcelasBtnRefs,
  resetarParaNovo, excluirAtual, lancar, updateMes,
}: Props) {
  return (
    <div style={{width:340,flexShrink:0,background:COR.branco,
      borderLeft:`1px solid ${COR.borda}`,padding:20,overflowY:'auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
        <h3 style={{fontSize:14,fontWeight:700,color:COR.texto,margin:0}}>
          {editandoId ? 'Editar lançamento' : 'Novo lançamento'}
        </h3>
        {editandoId && (
          <button onClick={() => resetarParaNovo(diaSel)} title="Cancelar edição" style={{
            border:'none',background:'transparent',cursor:'pointer',fontSize:18,color:COR.textoSuave}}>✕</button>
        )}
      </div>

      {/* Datas e saldo atual */}
      <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:12}}>
        {/* Fechamento */}
        {editandoFechamento ? (
          <div style={{display:'flex',alignItems:'center',gap:6,background:'#eff6ff',
            border:`1px solid ${COR.azul}44`,borderRadius:8,padding:'6px 12px'}}>
            <span style={{fontSize:11,fontWeight:600,color:COR.azul,flex:1}}>Fecha dia</span>
            <input type="number" min={1} max={31} autoFocus
              defaultValue={diaFechamento}
              onBlur={e => {
                const v = Math.min(Math.max(parseInt(e.target.value)||diaFechamentoBase,1),31)
                if (v !== diaFechamentoBase) updateMes(prev=>({...prev,fechamentoOverride:v}))
                else updateMes(prev=>({...prev,fechamentoOverride:undefined}))
                setEditandoFechamento(false)
              }}
              onKeyDown={e => { if(e.key==='Enter'||e.key==='Escape') e.currentTarget.blur() }}
              style={{width:40,border:`1px solid ${COR.azul}66`,borderRadius:6,padding:'2px 6px',
                fontSize:13,fontWeight:700,outline:'none',fontFamily:'inherit',textAlign:'center',
                background:'transparent',color:COR.azul}}/>
            <span style={{fontSize:11,color:COR.azul}}>de {NOMES_MESES[purchaseMes]}</span>
          </div>
        ) : (
          <div onClick={() => setEditandoFechamento(true)} title="Clique para editar"
            style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',background:'#eff6ff',
              border:`1px solid ${COR.azul}44`,borderRadius:8,padding:'6px 12px'}}>
            <span style={{fontSize:11,fontWeight:600,color:COR.azul,flex:1}}>
              Fecha dia {diaFechamento} de {NOMES_MESES[purchaseMes]}
              {mesDados.fechamentoOverride && <sup style={{fontSize:9,color:'#94a3b8',marginLeft:2}}>*</sup>}
            </span>
            <span style={{fontSize:11,color:COR.azul}}>✎</span>
          </div>
        )}
        {/* Vencimento */}
        {editandoVencimento ? (
          <div style={{display:'flex',alignItems:'center',gap:6,background:'#fff5f5',
            border:`1px solid ${COR.vermelho}44`,borderRadius:8,padding:'6px 12px'}}>
            <span style={{fontSize:11,fontWeight:600,color:COR.vermelho,flex:1}}>Vence dia</span>
            <input type="number" min={1} max={31} autoFocus
              defaultValue={diaVencimento}
              onBlur={e => {
                const v = Math.min(Math.max(parseInt(e.target.value)||diaVencimentoBase,1),31)
                if (v !== diaVencimentoBase) updateMes(prev=>({...prev,vencimentoOverride:v}))
                else updateMes(prev=>({...prev,vencimentoOverride:undefined}))
                setEditandoVencimento(false)
              }}
              onKeyDown={e => { if(e.key==='Enter'||e.key==='Escape') e.currentTarget.blur() }}
              style={{width:40,border:`1px solid ${COR.vermelho}66`,borderRadius:6,padding:'2px 6px',
                fontSize:13,fontWeight:700,outline:'none',fontFamily:'inherit',textAlign:'center',
                background:'transparent',color:COR.vermelho}}/>
            <span style={{fontSize:11,color:COR.vermelho}}>de {NOMES_MESES[mesVenc]} {anoVenc}</span>
          </div>
        ) : (
          <div onClick={() => setEditandoVencimento(true)} title="Clique para editar"
            style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',background:'#fff5f5',
              border:`1px solid ${COR.vermelho}44`,borderRadius:8,padding:'6px 12px'}}>
            <span style={{fontSize:11,fontWeight:600,color:COR.vermelho,flex:1}}>
              Vence {diaVencimento} de {NOMES_MESES[mesVenc]} {anoVenc}
              {mesDados.vencimentoOverride && <sup style={{fontSize:9,color:'#94a3b8',marginLeft:2}}>*</sup>}
            </span>
            <span style={{fontSize:11,color:COR.vermelho}}>✎</span>
          </div>
        )}
      </div>

      {/* Compra / Estorno */}
      <div style={{display:'flex',background:'#e0f2fe',borderRadius:8,
        padding:3,marginBottom:12,width:'100%'}}>
        {(['entrada','saida'] as const).map(t => (
          <button key={t} tabIndex={-1} onClick={() => setFTipo(t)} style={{
            flex:1,padding:'7px 0',border:'none',borderRadius:6,
            cursor:'pointer',fontSize:12,fontWeight:600,
            fontFamily:'inherit',transition:'all .15s',
            background:fTipo===t?COR.branco:'transparent',
            color:fTipo===t?(t==='entrada'?COR.azul:COR.vermelho):'#0369a1',
            boxShadow:fTipo===t?'0 1px 2px rgba(0,0,0,.08)':'none'}}>
            {t==='saida'?'↑ Estorno':'↓ Compra'}
          </button>
        ))}
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:10}}>
        {/* Data da compra — campo livre */}
        {(() => {
          const parsed = parseDateFatura(fDataCompra, purchaseMes, purchaseAno)
          const dispDia = parsed?.dia ?? diaSel
          const dispMes = parsed?.mes ?? purchaseMes
          const dispAno = parsed?.ano ?? purchaseAno
          const label = `${String(dispDia).padStart(2,'0')} de ${NOMES_MESES[dispMes]}${dispAno !== purchaseAno ? ' '+dispAno : ''} · ${diaSemana(dispDia,dispMes,dispAno)}`
          return (
            <div>
              <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:4}}>Data da compra</div>
              <input
                ref={dataCompraRef}
                autoFocus
                type="text"
                value={fDataCompra}
                onChange={e => setFDataCompra(e.target.value)}
                onBlur={() => {
                  const p = parseDateFatura(fDataCompra, purchaseMes, purchaseAno)
                  if (p) {
                    setDiaSel(p.dia)
                    // Formata para DD/MM ou DD/MM/AAAA ao sair do campo
                    const acStr = p.ano !== purchaseAno ? `/${p.ano}` : ''
                    setFDataCompra(`${String(p.dia).padStart(2,'0')}/${String(p.mes+1).padStart(2,'0')}${acStr}`)
                  }
                }}
                onFocus={realcarFoco}
                placeholder={`${String(diaSel).padStart(2,'0')}/${String(purchaseMes+1).padStart(2,'0')}`}
                style={{border:'1.5px solid #bae6fd',borderRadius:8,padding:'7px 10px',
                  fontSize:12,outline:'none',background:'#fff',
                  fontFamily:'inherit',color:COR.texto,width:'100%'}}
                onKeyDown={e => { if (e.key==='Enter') { (e.target as HTMLInputElement).blur() } }}
              />
              <div style={{fontSize:11,color:'#94a3b8',marginTop:4}}>{label}</div>
            </div>
          )
        })()}
        <div>
          <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:4}}>Categoria</div>
          <select ref={categoriaSelectRef} value={fCat}
            onChange={e=>setFCat(e.target.value)}
            onFocus={realcarFoco} onBlur={removerRealce}
            style={{border:`1.5px solid #bae6fd`,borderRadius:8,padding:'7px 10px',
              fontSize:12,outline:'none',background:'#fff',
              fontFamily:'inherit',color:COR.texto,width:'100%'}}>
            <option value="">Selecione...</option>
            {categoriasCartao.map(c=>(
              <option key={c.id} value={c.nome}>{c.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:4}}>Valor da parcela *</div>
          <input ref={valorInputRef} value={fValor} onChange={e=>setFValor(e.target.value)}
            placeholder="R$ 0,00"
            onFocus={realcarFoco} onBlur={removerRealce}
            style={{border:`1.5px solid #bae6fd`,borderRadius:8,padding:'7px 10px',
              fontSize:12,outline:'none',background:'#fff',
              fontFamily:'inherit',color:COR.texto,width:'100%'}}
            onKeyDown={e=>e.key==='Enter'&&lancar()}/>
        </div>
        <div>
          <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:4}}>Parcelas</div>
          <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
            {[1,2,3,4,5,6,7,8,9,10,11,12].map((n, i) => {
              const parcelasAtual = Math.max(1, parseInt(fParcelas) || 1)
              const ativo = parcelasAtual === n
              return (
                <button key={n}
                  ref={el => { parcelasBtnRefs.current[i] = el }}
                  tabIndex={ativo ? 0 : -1}
                  onClick={() => setFParcelas(String(n))}
                  onKeyDown={e => {
                    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                      e.preventDefault()
                      if (n < 12) { setFParcelas(String(n+1)); parcelasBtnRefs.current[i+1]?.focus() }
                    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                      e.preventDefault()
                      if (n > 1) { setFParcelas(String(n-1)); parcelasBtnRefs.current[i-1]?.focus() }
                    } else if (e.key === 'Enter') {
                      e.preventDefault(); lancar()
                    }
                  }}
                  style={{
                    padding:'4px 8px',border:`1.5px solid ${ativo?COR.azul:'#bae6fd'}`,
                    borderRadius:6,cursor:'pointer',fontSize:11,fontWeight:500,
                    background:ativo?'#eff6ff':'#fff',
                    color:ativo?COR.azul:'#0369a1',fontFamily:'inherit'}}>
                  {n}x
                </button>
              )
            })}
            <input
              type="number" min={13} placeholder="+12x"
              tabIndex={parseInt(fParcelas) > 12 ? 0 : -1}
              value={parseInt(fParcelas)>12 ? fParcelas : ''}
              onChange={e => { if(e.target.value) setFParcelas(e.target.value) }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); lancar() } }}
              onFocus={e => { e.currentTarget.style.border=`1.5px solid ${COR.azul}`; e.currentTarget.style.boxShadow='0 0 0 3px rgba(26,86,219,0.15)' }}
              onBlur={e => { e.currentTarget.style.border='1.5px solid #bae6fd'; e.currentTarget.style.boxShadow='none'; if(!e.target.value) setFParcelas('1') }}
              style={{width:52,border:`1.5px solid ${parseInt(fParcelas)>12?COR.azul:'#bae6fd'}`,
                borderRadius:6,padding:'4px 6px',fontSize:11,outline:'none',
                background:parseInt(fParcelas)>12?'#eff6ff':'#fff',
                color:parseInt(fParcelas)>12?COR.azul:'#94a3b8',fontFamily:'inherit',textAlign:'center'}}/>
          </div>
          {parseInt(fParcelas) > 1 && parseBRL(fValor) > 0 && (
            <div style={{fontSize:11,color:COR.textoSuave,marginTop:6}}>
              Total: {fmt(parseBRL(fValor) * parseInt(fParcelas))} &nbsp;({fParcelas}x de {fmt(parseBRL(fValor))})
            </div>
          )}
        </div>
        <div>
          <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:4}}>Descrição</div>
          <input value={fDesc} onChange={e=>setFDesc(e.target.value)}
            placeholder="Ex: Mercado Extra, Farmácia..."
            onFocus={realcarFoco} onBlur={removerRealce}
            style={{border:`1.5px solid #bae6fd`,borderRadius:8,padding:'7px 10px',
              fontSize:12,outline:'none',background:'#fff',
              fontFamily:'inherit',color:COR.texto,width:'100%'}}
            onKeyDown={e=>e.key==='Enter'&&lancar()}/>
        </div>
      </div>

      <div style={{fontSize:10,color:'#94a3b8',marginBottom:14}}>
        Enter no valor ou na descrição para salvar
      </div>

      <div style={{display:'flex',gap:8}}>
        {editandoId && (
          <button onClick={excluirAtual} style={{
            flex:1,padding:'10px 0',border:`1.5px solid ${COR.borda}`,
            borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:500,
            background:COR.branco,color:COR.vermelho,fontFamily:'inherit'}}>
            Excluir
          </button>
        )}
        <button onClick={lancar} style={{
          flex:2,padding:'10px 0',border:'none',borderRadius:8,
          background:`linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,
          color:'#fff',fontSize:13,fontWeight:600,
          cursor:'pointer',fontFamily:'inherit'}}>
          {editandoId ? 'Salvar alterações' : 'Lançar'}
        </button>
      </div>
    </div>
  )
}
