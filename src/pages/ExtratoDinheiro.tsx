import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import type { Lancamento } from '../context/AppContext'
import { iconeCategoria } from '../utils/categoriaIcone'
import ModalConfirmacao from '../components/ModalConfirmacao'

const COR = {
  azul: '#1a56db', fundo: '#f0f4ff', branco: '#ffffff',
  texto: '#0f172a', textoSuave: '#64748b', borda: '#e2e8f0',
  verde: '#16a34a', vermelho: '#dc2626',
}
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS_SEM = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

function fmt(v: number) { return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) }
function parseBRL(s: string) { return parseFloat(s.replace(/\./g,'').replace(',','.')) || 0 }
function diasNoMes(m: number, a: number) { return new Date(a, m+1, 0).getDate() }
function diaSemana(d: number, m: number, a: number) { return DIAS_SEM[new Date(a, m, d).getDay()] }
function mesKey(ano: number, mes: number) { return `dinheiro-${ano}-${String(mes+1).padStart(2,'0')}` }

type TipoLanc = 'entrada' | 'saida'

export default function ExtratoDinheiro() {
  const { categorias, extratoData, updateExtratoMes } = useApp()
  const hoje = new Date()
  const [mes,  setMes]  = useState(hoje.getMonth())
  const [ano,  setAno]  = useState(hoje.getFullYear())
  const [fTipo,    setFTipo]    = useState<TipoLanc>('saida')
  const [fCat,     setFCat]     = useState('')
  const [fSubDesc, setFSubDesc] = useState('')
  const [fValor,   setFValor]   = useState('')
  const [fDesc,    setFDesc]    = useState('')
  const [fDia,     setFDia]     = useState(hoje.getDate())
  const [editId,   setEditId]   = useState<string|null>(null)
  const [confirm,  setConfirm]  = useState<{ dia: number; id: string; desc: string } | null>(null)

  const key = mesKey(ano, mes)
  const mesDados = extratoData[key] ?? { lancamentos: {}, saldoBanco: '' }
  const totalDias = diasNoMes(mes, ano)

  const catsDinheiro = useMemo(() =>
    categorias.filter(c => c.tipoMovimento === 'dinheiro' && c.ativa)
      .sort((a,b) => a.nome.localeCompare(b.nome,'pt-BR'))
  , [categorias])

  const catsFiltradas = catsDinheiro.filter(c => c.tipo === fTipo)
  const catsSelect = catsFiltradas.filter((c, idx, arr) => arr.findIndex(x => x.nome === c.nome) === idx)
  const subDescsDisponiveis = fCat
    ? catsFiltradas.filter(c => c.nome === fCat && c.descricao).map(c => c.descricao!)
    : []

  const { totalEnt, totalSai } = useMemo(() => {
    let totalEnt = 0, totalSai = 0
    for (let d = 1; d <= totalDias; d++) {
      ;(mesDados.lancamentos[d] ?? []).forEach((l: Lancamento) => {
        if (l.tipo === 'entrada') totalEnt += l.valor
        else totalSai += l.valor
      })
    }
    return { totalEnt, totalSai }
  }, [mesDados, totalDias])

  function salvar() {
    if (!fCat || !fValor) return
    const valor = parseBRL(fValor)
    if (!valor) return
    if (editId) {
      updateExtratoMes(key, prev => {
        const lancs = { ...prev.lancamentos }
        for (const d of Object.keys(lancs)) {
          lancs[+d] = (lancs[+d] as Lancamento[]).map(l =>
            l.id === editId ? { ...l, tipo:fTipo, categoria:fCat, subCategoria:fSubDesc||undefined, valor, descricao:fDesc } : l
          )
        }
        return { ...prev, lancamentos: lancs }
      })
      setEditId(null)
    } else {
      const id = `din-${Date.now()}-${Math.random().toString(36).slice(2,7)}`
      updateExtratoMes(key, prev => ({
        ...prev,
        lancamentos: {
          ...prev.lancamentos,
          [fDia]: [...(prev.lancamentos[fDia] ?? []), { id, tipo:fTipo, categoria:fCat, subCategoria:fSubDesc||undefined, valor, descricao:fDesc, formaPagamento:'dinheiro', tipoLanc:'variavel' }],
        },
      }))
    }
    setFValor(''); setFDesc(''); setFCat(''); setFSubDesc('');
  }

  function excluirConfirmado(dia: number, id: string) {
    updateExtratoMes(key, prev => ({
      ...prev,
      lancamentos: {
        ...prev.lancamentos,
        [dia]: (prev.lancamentos[dia] ?? []).filter((l: Lancamento) => l.id !== id),
      },
    }))
    if (editId === id) { setEditId(null); setFValor(''); setFDesc(''); setFCat('') }
    setConfirm(null)
  }

  function excluir(dia: number, id: string) {
    const lanc = (mesDados.lancamentos[dia] ?? []).find((l: Lancamento) => l.id === id)
    setConfirm({ dia, id, desc: lanc?.descricao || lanc?.categoria || 'lançamento' })
  }

  function editar(dia: number, l: Lancamento) {
    setFDia(dia); setFTipo(l.tipo); setFCat(l.categoria); setFSubDesc(l.subCategoria ?? '')
    setFValor(l.valor.toFixed(2).replace('.',',')); setFDesc(l.descricao)
    setEditId(l.id)
  }

  function mudarMes(delta: number) {
    let nm = mes + delta, na = ano
    if (nm < 0) { nm = 11; na-- } else if (nm > 11) { nm = 0; na++ }
    setMes(nm); setAno(na)
    setEditId(null); setFValor(''); setFDesc(''); setFCat('')
  }

  const saldo = totalEnt - totalSai

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:COR.fundo }}>

      {/* Navegação mês */}
      <div style={{ background:COR.branco, borderBottom:`1px solid ${COR.borda}`,
        padding:'10px 16px', flexShrink:0, display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={() => mudarMes(-1)} style={{ border:`1px solid ${COR.borda}`, background:COR.branco,
          borderRadius:8, padding:'5px 12px', cursor:'pointer', fontSize:16, color:COR.textoSuave }}>‹</button>
        <span style={{ fontSize:15, fontWeight:700, color:COR.texto, minWidth:140, textAlign:'center' }}>
          {MESES_FULL[mes]} {ano}
        </span>
        <button onClick={() => mudarMes(1)} style={{ border:`1px solid ${COR.borda}`, background:COR.branco,
          borderRadius:8, padding:'5px 12px', cursor:'pointer', fontSize:16, color:COR.textoSuave }}>›</button>
        <div style={{ flex:1 }}/>
        <div style={{ display:'flex', gap:8 }}>
          <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'5px 12px', textAlign:'center' }}>
            <div style={{ fontSize:9, color:COR.verde, fontWeight:700, textTransform:'uppercase', letterSpacing:.4 }}>Entradas</div>
            <div style={{ fontSize:13, fontWeight:700, color:COR.verde }}>{fmt(totalEnt)}</div>
          </div>
          <div style={{ background:'#fff5f5', border:'1px solid #fecaca', borderRadius:8, padding:'5px 12px', textAlign:'center' }}>
            <div style={{ fontSize:9, color:COR.vermelho, fontWeight:700, textTransform:'uppercase', letterSpacing:.4 }}>Saídas</div>
            <div style={{ fontSize:13, fontWeight:700, color:COR.vermelho }}>{fmt(totalSai)}</div>
          </div>
          <div style={{ background: saldo>=0?'#f0fdf4':'#fff5f5', border:`1px solid ${saldo>=0?'#bbf7d0':'#fecaca'}`,
            borderRadius:8, padding:'5px 12px', textAlign:'center' }}>
            <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:.4,
              color:saldo>=0?COR.verde:COR.vermelho }}>Saldo</div>
            <div style={{ fontSize:13, fontWeight:700, color:saldo>=0?COR.verde:COR.vermelho }}>{fmt(saldo)}</div>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <div style={{ background:COR.branco, borderBottom:`1px solid ${COR.borda}`,
        padding:'12px 16px', flexShrink:0 }}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'flex-end' }}>

          {/* Tipo */}
          <div>
            <div style={{ fontSize:10, color:COR.textoSuave, fontWeight:600, marginBottom:4 }}>Tipo</div>
            <div style={{ display:'flex', gap:4 }}>
              {(['saida','entrada'] as const).map(t => (
                <button key={t} onClick={() => { setFTipo(t); setFCat('') }} style={{
                  padding:'6px 12px', borderRadius:8, border:`1.5px solid ${fTipo===t?(t==='entrada'?COR.verde:COR.vermelho):COR.borda}`,
                  background:fTipo===t?(t==='entrada'?'#f0fdf4':'#fff5f5'):COR.branco,
                  color:fTipo===t?(t==='entrada'?COR.verde:COR.vermelho):COR.textoSuave,
                  cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'inherit' }}>
                  {t==='entrada'?'↑ Entrada':'↓ Saída'}
                </button>
              ))}
            </div>
          </div>

          {/* Dia */}
          <div>
            <div style={{ fontSize:10, color:COR.textoSuave, fontWeight:600, marginBottom:4 }}>Dia</div>
            <select value={fDia} onChange={e => setFDia(+e.target.value)} style={{
              padding:'7px 10px', borderRadius:8, border:`1px solid ${COR.borda}`,
              fontSize:12, fontFamily:'inherit', color:COR.texto, background:COR.branco }}>
              {Array.from({length:totalDias},(_,i)=>i+1).map(d => (
                <option key={d} value={d}>{d} ({diaSemana(d,mes,ano)})</option>
              ))}
            </select>
          </div>

          {/* Categoria */}
          <div style={{ flex:1, minWidth:160 }}>
            <div style={{ fontSize:10, color:COR.textoSuave, fontWeight:600, marginBottom:4 }}>Categoria</div>
            <select value={fCat} onChange={e => { setFCat(e.target.value); setFSubDesc('') }} style={{
              width:'100%', padding:'7px 10px', borderRadius:8, border:`1px solid ${COR.borda}`,
              fontSize:12, fontFamily:'inherit', color:fCat?COR.texto:COR.textoSuave, background:COR.branco }}>
              <option value=''>Selecione...</option>
              {catsSelect.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
            </select>
            {subDescsDisponiveis.length > 1 && (
              <div style={{marginTop:6}}>
                <div style={{fontSize:9,color:COR.textoSuave,fontWeight:600,
                  textTransform:'uppercase',letterSpacing:.4,marginBottom:4}}>Qual variante?</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                  {subDescsDisponiveis.map(desc => (
                    <button key={desc} type="button"
                      onClick={() => setFSubDesc(desc === fSubDesc ? '' : desc)}
                      style={{padding:'4px 10px',borderRadius:20,fontSize:11,fontWeight:600,
                        border:`1.5px solid ${fSubDesc===desc?COR.azul:COR.borda}`,
                        background:fSubDesc===desc?COR.azul:'#eff6ff',
                        color:fSubDesc===desc?'#fff':COR.azul,
                        cursor:'pointer',fontFamily:'inherit'}}>
                      {desc}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Valor */}
          <div style={{ width:130 }}>
            <div style={{ fontSize:10, color:COR.textoSuave, fontWeight:600, marginBottom:4 }}>Valor</div>
            <input value={fValor} onChange={e => setFValor(e.target.value)}
              onFocus={e => e.target.select()}
              placeholder='0,00' style={{
              width:'100%', boxSizing:'border-box', padding:'7px 10px', borderRadius:8,
              border:`1px solid ${COR.borda}`, fontSize:12, fontFamily:'inherit', color:COR.texto }} />
          </div>

          {/* Descrição */}
          <div style={{ flex:1, minWidth:160 }}>
            <div style={{ fontSize:10, color:COR.textoSuave, fontWeight:600, marginBottom:4 }}>Descrição</div>
            <input value={fDesc} onChange={e => setFDesc(e.target.value)}
              placeholder='opcional' style={{
              width:'100%', boxSizing:'border-box', padding:'7px 10px', borderRadius:8,
              border:`1px solid ${COR.borda}`, fontSize:12, fontFamily:'inherit', color:COR.texto }} />
          </div>

          {/* Botões */}
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={salvar} style={{
              padding:'7px 16px', borderRadius:8, border:'none', cursor:'pointer',
              background:COR.azul, color:'#fff', fontSize:12, fontWeight:700, fontFamily:'inherit' }}>
              {editId ? 'Salvar' : '+ Adicionar'}
            </button>
            {editId && (
              <button onClick={() => { setEditId(null); setFValor(''); setFDesc(''); setFCat('') }} style={{
                padding:'7px 12px', borderRadius:8, border:`1px solid ${COR.borda}`, cursor:'pointer',
                background:COR.branco, color:COR.textoSuave, fontSize:12, fontFamily:'inherit' }}>
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lista por dia */}
      <div style={{ flex:1, overflowY:'auto', padding:'12px 16px', display:'flex', flexDirection:'column', gap:8 }}>
        {Array.from({length:totalDias},(_,i)=>i+1).map(dia => {
          const ls: Lancamento[] = mesDados.lancamentos[dia] ?? []
          if (!ls.length) return null
          const entDia = ls.filter(l=>l.tipo==='entrada').reduce((s,l)=>s+l.valor,0)
          const saiDia = ls.filter(l=>l.tipo==='saida').reduce((s,l)=>s+l.valor,0)
          return (
            <div key={dia} style={{ background:COR.branco, borderRadius:12, border:`1px solid ${COR.borda}`, overflow:'hidden' }}>
              {/* Cabeçalho dia */}
              <div style={{ padding:'8px 14px', background:'#f8fafc', borderBottom:`1px solid ${COR.borda}`,
                display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:13, fontWeight:700, color:COR.texto }}>{dia}</span>
                <span style={{ fontSize:11, color:COR.textoSuave }}>{diaSemana(dia,mes,ano)}</span>
                <span style={{ fontSize:10, color:COR.textoSuave }}>{MESES[mes]}</span>
                <div style={{ flex:1 }}/>
                {entDia > 0 && <span style={{ fontSize:11, fontWeight:600, color:COR.verde }}>+{fmt(entDia)}</span>}
                {saiDia > 0 && <span style={{ fontSize:11, fontWeight:600, color:COR.vermelho }}>-{fmt(saiDia)}</span>}
              </div>
              {/* Lançamentos */}
              {ls.map(l => {
                const cv = iconeCategoria(categorias, l.categoria)
                const corVal = l.tipo==='entrada' ? COR.verde : COR.vermelho
                const emEdicao = editId === l.id
                return (
                  <div key={l.id}
                    onClick={() => editar(dia, l)}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
                      borderBottom:`1px solid #f1f5f9`, cursor:'pointer',
                      background:emEdicao?'#eff6ff':'transparent' }}
                    onMouseEnter={e=>{ if(!emEdicao) e.currentTarget.style.background='#fafbff' }}
                    onMouseLeave={e=>{ if(!emEdicao) e.currentTarget.style.background='transparent' }}>
                    <div style={{ width:32, height:32, borderRadius:8, flexShrink:0,
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:15,
                      background:cv.cor }}>
                      {cv.icone}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:COR.texto }}>{l.categoria}</div>
                      {l.descricao && <div style={{ fontSize:11, color:'#64748b', marginTop:1 }}>{l.descricao}</div>}
                    </div>
                    <div style={{ fontSize:13, fontWeight:600, color:corVal }}>
                      {l.tipo==='entrada'?'+':'-'}{fmt(l.valor)}
                    </div>
                    <button onClick={e => { e.stopPropagation(); excluir(dia, l.id) }}
                      style={{ border:'none', background:'transparent', cursor:'pointer',
                        color:'#cbd5e1', fontSize:14, padding:'2px 5px', borderRadius:6 }}
                      onMouseEnter={e=>(e.currentTarget.style.color=COR.vermelho)}
                      onMouseLeave={e=>(e.currentTarget.style.color='#cbd5e1')}>✕</button>
                  </div>
                )
              })}
            </div>
          )
        })}

        {totalEnt === 0 && totalSai === 0 && (
          <div style={{ textAlign:'center', color:COR.textoSuave, fontSize:13, marginTop:40 }}>
            Nenhum lançamento em dinheiro em {MESES_FULL[mes]}.
          </div>
        )}
      </div>

      <ModalConfirmacao
        open={!!confirm}
        titulo="Excluir lançamento?"
        mensagem="Esta ação não pode ser desfeita."
        detalhe={confirm?.desc}
        onConfirmar={() => confirm && excluirConfirmado(confirm.dia, confirm.id)}
        onCancelar={() => setConfirm(null)}
      />
    </div>
  )
}
