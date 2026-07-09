import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AppHeader from '../components/AppHeader'
import type { Conta, Categoria, TipoCategoria, TipoMovimento, FormaPagamentoCategoria } from '../context/AppContext'
import { getLayoutPref, setLayoutPref } from '../utils/prefs'
import type { LayoutLancamentos } from '../utils/prefs'

const COR = {
  azul: '#1a56db', azulEscuro: '#0f2878', azulMedio: '#2563eb',
  fundo: '#f0f4ff', branco: '#ffffff', texto: '#0f172a',
  textoSuave: '#64748b', borda: '#e2e8f0',
  verde: '#16a34a', vermelho: '#dc2626',
}

type Aba = 'bancos' | 'cartoes' | 'categorias' | 'perfil' | 'preferencias'

const CORES_PRESET = [
  '#1a56db','#16a34a','#dc2626','#d97706','#7c3aed',
  '#0891b2','#db2777','#65a30d','#ea580c','#6b7280',
  '#0f172a','#be123c',
]
const ICONES_CONTA = ['🏦','💳','🏧','💰','🏠','🚗','💎','📊','🏢','💵']
const ICONES_CAT   = [
  '🛒','⛽','💊','📱','💡','💧','🎓','✈️','🎭','👕',
  '🍽️','🎁','🏋️','🐾','📺','🎮','🏥','📌','🔧','☕',
  '🎵','📚','🏖️','💐','🧴','💈','🐶','🎯',
]
const BANCOS = ['Banco do Brasil','Bradesco','C6 Bank','Caixa','Inter','Itaú','Nubank','Santander','Sicredi','Outro']

const TIPOS_MOVIMENTO: { id: TipoMovimento; label: string }[] = [
  { id:'banco',    label:'Banco' },
  { id:'cartao',   label:'Cartão de Crédito' },
  { id:'dinheiro', label:'Dinheiro' },
]
const FORMAS_PAG_BANCO: { id: FormaPagamentoCategoria; label: string }[] = [
  { id:'automatico',    label:'Débito Automático' },
  { id:'pix',           label:'Pix' },
  { id:'boleto',        label:'Boleto' },
  { id:'transferencia', label:'Transferência' },
]
const FORMAS_PAG_CARTAO: { id: FormaPagamentoCategoria; label: string }[] = [
  { id:'avista',    label:'À Vista' },
  { id:'parcelado', label:'Parcelado' },
]
const CORES_FORMA_PAG: Record<string,{bg:string;cor:string}> = {
  automatico:    { bg:'#e0f2fe', cor:'#0369a1' },
  pix:           { bg:'#d1fae5', cor:'#065f46' },
  boleto:        { bg:'#fef9c3', cor:'#92400e' },
  transferencia: { bg:'#eff6ff', cor:'#1a56db' },
  avista:        { bg:'#f3e8ff', cor:'#7c3aed' },
  parcelado:     { bg:'#fce7f3', cor:'#be185d' },
  dinheiro:      { bg:'#f1f5f9', cor:'#475569' },
}
function labelCobranca(c: Categoria): { label: string; bg: string; cor: string } {
  if (c.tipoMovimento === 'dinheiro') return { label:'Dinheiro', ...CORES_FORMA_PAG.dinheiro }
  const lista = c.tipoMovimento === 'cartao' ? FORMAS_PAG_CARTAO : FORMAS_PAG_BANCO
  const f = lista.find(x => x.id === c.formaPagamento)
  const cores = CORES_FORMA_PAG[c.formaPagamento ?? ''] ?? { bg:'#f1f5f9', cor:'#64748b' }
  return { label: f?.label ?? (c.tipoMovimento==='cartao' ? 'Cartão' : 'Banco'), ...cores }
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style:'currency', currency:'BRL' })
}
function gerarId() { return `id-${Date.now()}-${Math.random().toString(36).slice(2,6)}` }

function EmBreve() {
  return (
    <span style={{ fontSize:9, padding:'2px 7px', borderRadius:4,
      background:'#fef9c3', color:'#92400e', fontWeight:700,
      textTransform:'uppercase', letterSpacing:.5, flexShrink:0 }}>
      Em breve
    </span>
  )
}


// ── Picker de cor ────────────────────────────────────────────────────
function ColorPicker({ valor, onChange }: { valor:string; onChange:(c:string)=>void }) {
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
      {CORES_PRESET.map(c => (
        <div key={c} onClick={() => onChange(c)} style={{
          width:26, height:26, borderRadius:'50%', background:c, cursor:'pointer',
          border:`3px solid ${valor===c ? '#0f172a' : 'transparent'}`,
          boxShadow: valor===c ? '0 0 0 2px #fff, 0 0 0 4px #0f172a' : 'none',
          transition:'all .15s',
        }} />
      ))}
    </div>
  )
}

// ── Picker de ícone ──────────────────────────────────────────────────
function IconPicker({ icones, valor, onChange }: { icones:string[]; valor:string; onChange:(i:string)=>void }) {
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
      {icones.map(ic => (
        <button key={ic} onClick={() => onChange(ic)} style={{
          width:34, height:34, border:`2px solid ${valor===ic ? COR.azul : COR.borda}`,
          borderRadius:8, background: valor===ic ? '#eff6ff' : COR.branco,
          cursor:'pointer', fontSize:16, display:'flex',
          alignItems:'center', justifyContent:'center',
        }}>{ic}</button>
      ))}
    </div>
  )
}

// ── Card de categoria ────────────────────────────────────────────────
function CatCard({ c, editCatId, toggleAtiva, editarCategoria }: {
  c: Categoria
  editCatId: string|null
  toggleAtiva: (id:string) => void
  editarCategoria: (c:Categoria) => void
}) {
  return (
    <div onClick={() => editarCategoria(c)} style={{
      background:COR.branco, border:`1px solid ${COR.borda}`,
      borderRadius:10, padding:'11px 14px', cursor:'pointer',
      display:'flex', alignItems:'center', gap:12,
      borderLeft:`4px solid ${c.cor}`,
      opacity: c.ativa ? 1 : 0.5,
      boxShadow: editCatId===c.id ? `0 0 0 2px ${COR.azul}` : 'none',
    }}>
      {/* Ícone */}
      <div style={{ width:36, height:36, borderRadius:9, background:c.cor,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:17, flexShrink:0 }}>
        {c.icone}
      </div>
      {/* Info */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:500, color:COR.texto }}>{c.nome}</div>
        {c.descricao && (
          <div style={{ fontSize:11, color:COR.textoSuave, marginTop:2,
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
            maxWidth:300 }}>
            {c.descricao}
          </div>
        )}
        <div style={{ display:'flex', gap:5, marginTop:5, flexWrap:'wrap', alignItems:'center' }}>
          {/* Tipo de movimento */}
          {(() => {
            const cfg: Record<string,{bg:string;cor:string;label:string}> = {
              banco:    { bg:'#f1f5f9', cor:'#334155', label:'Banco' },
              cartao:   { bg:'#f3e8ff', cor:'#7c3aed', label:'Cartão' },
              dinheiro: { bg:'#f0fdf4', cor:'#16a34a', label:'Dinheiro' },
            }
            const s = cfg[c.tipoMovimento] ?? cfg.banco
            return (
              <span style={{ fontSize:11, padding:'2px 8px', borderRadius:4, fontWeight:600,
                background:s.bg, color:s.cor }}>
                {s.label}
              </span>
            )
          })()}
          {/* Forma de pagamento — omite para dinheiro (já representa a forma) */}
          {c.tipoMovimento !== 'dinheiro' && (() => {
            const tc = labelCobranca(c)
            return (
              <span style={{ fontSize:11, padding:'2px 8px', borderRadius:4, fontWeight:600,
                background:tc.bg, color:tc.cor }}>
                {tc.label}
              </span>
            )
          })()}
          {/* Vencimento */}
          {c.diaVencimento && (
            <span style={{ fontSize:11, padding:'2px 8px', borderRadius:4, fontWeight:600,
              background:'#e0f2fe', color:'#0369a1' }}>
              Vence dia {c.diaVencimento}
            </span>
          )}
        </div>
      </div>
      {/* Toggle ativo */}
      <button onClick={e => { e.stopPropagation(); toggleAtiva(c.id) }} style={{
        border:`1px solid ${c.ativa ? COR.verde : COR.borda}`,
        borderRadius:6, padding:'3px 9px', cursor:'pointer', fontSize:11,
        background: c.ativa ? '#f0fdf4' : COR.branco,
        color: c.ativa ? COR.verde : COR.textoSuave,
        fontFamily:'inherit', fontWeight:500 }}>
        {c.ativa ? '✓ Ativa' : 'Inativa'}
      </button>
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────
export default function Configuracoes() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [aba,    setAba]    = useState<Aba>('bancos')
  const { user, contas, categorias, setContas, setCategorias,
          planejamentoLockado, setPlanejamentoLockado, sairDaConta } = useApp()
  const [abaCat, setAbaCat] = useState<TipoCategoria>('saida')

  useEffect(() => {
    const st = location.state as { aba?: string; catNome?: string } | null
    if (!st) return
    if (st.aba === 'categorias') {
      setAba('categorias')
      if (st.catNome) {
        const cat = categorias.find(c => c.nome === st.catNome)
        if (cat) {
          setAbaCat(cat.tipo)
          editarCategoria(cat)
        } else {
          novaCategoria()
        }
      }
    } else if (st.aba === 'perfil') {
      setAba('perfil')
    } else if (st.aba === 'preferencias') {
      setAba('preferencias')
    }
  }, [location.key]) // eslint-disable-line react-hooks/exhaustive-deps
  const [layout, setLayout] = useState<LayoutLancamentos>(getLayoutPref)

  function escolherLayout(l: LayoutLancamentos) {
    setLayoutPref(l)
    setLayout(l)
  }

  const contaVazia: Omit<Conta,'id'> = {
    nome:'', banco:'', tipo:'corrente', saldoInicial:0,
    cor:CORES_PRESET[0], icone:ICONES_CONTA[0],
  }
  const [formConta,   setFormConta]   = useState<Omit<Conta,'id'>>(contaVazia)
  const [editContaId, setEditContaId] = useState<string|null>(null)
  const [erroConta,   setErroConta]   = useState('')
  const [saldoStr,    setSaldoStr]    = useState('')
  const [limiteStr,   setLimiteStr]   = useState('')
  const nomeContaRef = useRef<HTMLInputElement>(null)

  const catVazia: Omit<Categoria,'id'> = {
    nome:'', tipo:'saida', fixa:false, tipoMovimento:'banco', formaPagamento:'boleto',
    cor:CORES_PRESET[0], icone:ICONES_CAT[0], ativa:true,
  }
  const [formCat,   setFormCat]   = useState<Omit<Categoria,'id'>>(catVazia)
  const [editCatId, setEditCatId] = useState<string|null>(null)
  const [erroCat,   setErroCat]   = useState('')
  const nomeCatRef = useRef<HTMLInputElement>(null)

  // ── Ações Conta ──
  function novaConta(tipoAba: Aba = aba) {
    setFormConta({...contaVazia, tipo: tipoAba==='cartoes' ? 'cartao' : 'corrente'})
    setEditContaId(null)
    setErroConta('')
    setSaldoStr(''); setLimiteStr('')
    setTimeout(() => nomeContaRef.current?.focus(), 0)
  }
  function editarConta(c: Conta) {
    const { id, ...rest } = c
    setFormConta(rest); setEditContaId(id)
    setErroConta('')
    setSaldoStr(c.saldoInicial ? String(c.saldoInicial).replace('.', ',') : '')
    setLimiteStr(c.limiteCartao ? String(c.limiteCartao).replace('.', ',') : '')
  }
  function salvarConta() {
    if (!formConta.nome.trim()) return setErroConta('Informe o nome da conta')
    if (!formConta.banco)       return setErroConta('Selecione o banco')
    setErroConta('')
    if (editContaId) {
      setContas(prev => prev.map(c => c.id===editContaId ? {id:editContaId,...formConta} : c))
    } else {
      setContas(prev => [...prev, {id:gerarId(),...formConta}])
    }
    novaConta()
  }
  function excluirConta(id: string) {
    if (!window.confirm('Excluir esta conta?')) return
    setContas(prev => prev.filter(c => c.id!==id))
    if (editContaId===id) novaConta()
  }

  // ── Ações Categoria ──
  function novaCategoria() {
    setFormCat({...catVazia, tipo:abaCat}); setEditCatId(null)
    setErroCat('')
    setTimeout(() => nomeCatRef.current?.focus(), 0)
  }
  function editarCategoria(c: Categoria) {
    const { id, ...rest } = c
    setFormCat(rest); setEditCatId(id)
    setErroCat('')
  }
  function salvarCategoria() {
    if (!formCat.nome.trim()) return setErroCat('Informe o nome da categoria')
    setErroCat('')
    if (editCatId) {
      setCategorias(prev => prev.map(c => c.id===editCatId ? {id:editCatId,...formCat} : c))
    } else {
      setCategorias(prev => [...prev, {id:gerarId(),...formCat}])
    }
    novaCategoria()
  }
  function excluirCategoria(id: string) {
    if (!window.confirm('Excluir esta categoria?')) return
    setCategorias(prev => prev.filter(c => c.id!==id))
    if (editCatId===id) { setEditCatId(null); setFormCat({...catVazia, tipo:abaCat}) }
  }
  function toggleAtiva(id: string) {
    setCategorias(prev => prev.map(c => c.id===id ? {...c, ativa:!c.ativa} : c))
  }

  const inputSt: React.CSSProperties = {
    border:`1.5px solid ${COR.borda}`, borderRadius:8,
    padding:'8px 11px', fontSize:13, outline:'none',
    background:'#f8fafc', fontFamily:'inherit',
    color:COR.texto, width:'100%',
  }
  const labelSt: React.CSSProperties = {
    display:'block', fontSize:11, fontWeight:600,
    color:COR.textoSuave, marginBottom:5,
  }

  const catsFiltradas = categorias
    .filter(c => c.tipo===abaCat)
    .sort((a,b) => a.nome.localeCompare(b.nome,'pt-BR'))

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column',
      background:COR.fundo, fontFamily:"-apple-system,'Inter',sans-serif", overflow:'hidden' }}>
      <style>{`
        .campo-cfg:focus {
          border-color: #1a56db !important;
          background: #ffffff !important;
          box-shadow: 0 0 0 3px rgba(26,86,219,0.12);
          outline: none;
        }
      `}</style>

      <AppHeader currentPath="/configuracoes" />

      {/* ABAS PRINCIPAIS */}
      <div style={{ background:COR.branco, borderBottom:`1px solid ${COR.borda}`,
        padding:'0 24px', display:'flex', gap:4, flexShrink:0 }}>
        {([['bancos','🏦 Cadastro de Bancos'],['cartoes','💳 Cadastro de Cartões'],['categorias','🏷 Cadastro de Categorias']] as const).map(([v,l]) => (
          <button key={v} onClick={() => { setAba(v); if (v==='bancos'||v==='cartoes') novaConta(v) }} style={{
            padding:'12px 16px', border:'none',
            borderBottom:`2px solid ${aba===v ? COR.azul : 'transparent'}`,
            background:'transparent', cursor:'pointer', fontSize:13, fontWeight:500,
            color: aba===v ? COR.azul : COR.textoSuave,
            fontFamily:'inherit', transition:'all .15s' }}>
            {l}
          </button>
        ))}
      </div>

      {/* CONTEÚDO */}
      <div style={{ flex:1, overflowY:'auto', display:'flex', padding:20, gap:16 }}>

        {/* ══ ABA BANCOS / CARTÕES ══ */}
        {(aba==='bancos' || aba==='cartoes') && (
          <>
            <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between',
                alignItems:'center', marginBottom:14 }}>
                <div>
                  <h2 style={{ fontSize:16, fontWeight:700, color:COR.texto, margin:0 }}>
                    {aba==='bancos' ? 'Cadastro de Bancos' : 'Cadastro de Cartões'}
                  </h2>
                  <p style={{ fontSize:12, color:COR.textoSuave, margin:'3px 0 0' }}>
                    {(() => {
                      const n = contas.filter(c => aba==='bancos' ? c.tipo!=='cartao' : c.tipo==='cartao').length
                      return aba==='bancos'
                        ? `${n} conta${n!==1?'s':''} cadastrada${n!==1?'s':''}`
                        : `${n} cartão${n!==1?'ões':''} cadastrado${n!==1?'s':''}`
                    })()}
                  </p>
                </div>
              </div>

              <div style={{ overflowY:'auto', flex:1 }}>
                {(aba==='bancos' ? (['corrente','poupanca'] as const) : (['cartao'] as const)).map(tipo => {
                  const grupo = contas.filter(c => c.tipo===tipo)
                  if (!grupo.length) return null
                  const titulo = tipo==='corrente' ? '🏦 Contas Correntes'
                    : tipo==='poupanca' ? '🏧 Poupanças' : '💳 Cartões de Crédito'
                  return (
                    <div key={tipo} style={{ marginBottom:20 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:COR.textoSuave,
                        textTransform:'uppercase', letterSpacing:.6, marginBottom:8 }}>
                        {titulo}
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        {grupo.map(c => (
                          <div key={c.id} onClick={() => editarConta(c)} style={{
                            background:COR.branco, border:`1px solid ${COR.borda}`,
                            borderRadius:12, padding:'14px 16px', cursor:'pointer',
                            display:'flex', alignItems:'center', gap:14,
                            borderLeft:`4px solid ${c.cor}`,
                            boxShadow: editContaId===c.id ? `0 0 0 2px ${COR.azul}` : 'none' }}>
                            <div style={{ width:42, height:42, borderRadius:12, background:c.cor,
                              display:'flex', alignItems:'center', justifyContent:'center',
                              fontSize:20, flexShrink:0 }}>
                              {c.icone}
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:14, fontWeight:600, color:COR.texto }}>{c.nome}</div>
                              <div style={{ fontSize:12, color:COR.textoSuave, marginTop:1 }}>
                                {c.banco}
                                {c.agencia && ` · Ag ${c.agencia}`}
                                {c.numeroConta && ` · CC ${c.numeroConta}`}
                              </div>
                            </div>
                            <div style={{ textAlign:'right', flexShrink:0 }}>
                              {c.tipo==='cartao' ? (
                                <>
                                  <div style={{ fontSize:13, fontWeight:600, color:COR.texto }}>
                                    Limite: {fmt(c.limiteCartao??0)}
                                  </div>
                                  <div style={{ fontSize:11, color:COR.textoSuave, marginTop:2 }}>
                                    Fecha dia {c.diaFechamento} · Vence dia {c.diaVencimento}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div style={{ fontSize:13, fontWeight:600, color:COR.verde }}>
                                    {fmt(c.saldoInicial)}
                                  </div>
                                  <div style={{ fontSize:11, color:COR.textoSuave, marginTop:2 }}>
                                    Saldo inicial
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Formulário conta */}
            <div onKeyDown={e => { if (e.key==='Enter' && (e.target as HTMLElement).tagName==='INPUT') salvarConta() }}
              style={{ width:340, flexShrink:0, background:COR.branco,
                border:`1px solid ${COR.borda}`, borderRadius:12,
                padding:20, overflowY:'auto' }}>
                <div style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'center', marginBottom:18 }}>
                  <h3 style={{ fontSize:14, fontWeight:700, color:COR.texto, margin:0 }}>
                    {editContaId ? 'Editar conta' : 'Nova conta'}
                  </h3>
                  {editContaId && (
                    <button onClick={() => novaConta()} title="Cancelar edição" style={{
                      border:'none', background:'transparent',
                      cursor:'pointer', fontSize:18, color:COR.textoSuave }}>✕</button>
                  )}
                </div>

                {/* Preview */}
                <div style={{ display:'flex', justifyContent:'center', marginBottom:18 }}>
                  <div style={{ width:56, height:56, borderRadius:16, background:formConta.cor,
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>
                    {formConta.icone}
                  </div>
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <div>
                    <label style={labelSt}>Nome da conta</label>
                    <input ref={nomeContaRef} value={formConta.nome}
                      onChange={e => setFormConta(p=>({...p, nome:e.target.value}))}
                      placeholder="Ex: Conta Sicredi, Nubank..." className="campo-cfg" style={inputSt} />
                  </div>
                  <div>
                    <label style={labelSt}>Banco</label>
                    <select value={formConta.banco}
                      onChange={e => setFormConta(p=>({...p, banco:e.target.value}))}
                      className="campo-cfg" style={inputSt}>
                      <option value="">Selecione...</option>
                      {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  {aba==='bancos' && (
                    <>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                        <div>
                          <label style={labelSt}>Agência</label>
                          <input
                            value={formConta.agencia||''}
                            onChange={e => setFormConta(p=>({...p, agencia:e.target.value}))}
                            placeholder="Ex: 0001" className="campo-cfg" style={inputSt} />
                        </div>
                        <div>
                          <label style={labelSt}>Conta</label>
                          <input
                            value={formConta.numeroConta||''}
                            onChange={e => setFormConta(p=>({...p, numeroConta:e.target.value}))}
                            placeholder="Ex: 12345-6" className="campo-cfg" style={inputSt} />
                        </div>
                      </div>
                      <div style={{ fontSize:10, color:'#94a3b8', marginTop:-8 }}>
                        Agência e conta são apenas informativas, não são obrigatórias.
                      </div>
                      <div>
                        <label style={labelSt}>Tipo</label>
                        <div style={{ display:'flex', gap:6 }}>
                          {([['corrente','Corrente'],['poupanca','Poupança']] as const).map(([v,l]) => (
                            <button key={v} onClick={() => setFormConta(p=>({...p,tipo:v}))} style={{
                              flex:1, padding:'7px 0', fontFamily:'inherit',
                              border:`1.5px solid ${formConta.tipo===v ? COR.azul : COR.borda}`,
                              borderRadius:7, cursor:'pointer', fontSize:12, fontWeight:500,
                              background: formConta.tipo===v ? '#eff6ff' : COR.branco,
                              color: formConta.tipo===v ? COR.azul : COR.textoSuave }}>
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  {formConta.tipo!=='cartao' && (
                    <div>
                      <label style={labelSt}>Saldo inicial</label>
                      <input
                        value={saldoStr}
                        onChange={e => {
                          const raw = e.target.value.replace(/[^0-9.,]/g, '')
                          setSaldoStr(raw)
                          setFormConta(p=>({...p, saldoInicial:parseFloat(raw.replace(',','.'))||0}))
                        }}
                        placeholder="R$ 0,00" className="campo-cfg" style={inputSt} />
                    </div>
                  )}
                  {formConta.tipo==='cartao' && (
                    <>
                      <div>
                        <label style={labelSt}>Limite do cartão</label>
                        <input
                          value={limiteStr}
                          onChange={e => {
                            const raw = e.target.value.replace(/[^0-9.,]/g, '')
                            setLimiteStr(raw)
                            setFormConta(p=>({...p, limiteCartao:parseFloat(raw.replace(',','.'))||0}))
                          }}
                          placeholder="R$ 0,00" className="campo-cfg" style={inputSt} />
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                        <div>
                          <label style={labelSt}>Dia fechamento</label>
                          <input type="number" min="1" max="31"
                            value={formConta.diaFechamento||''}
                            onChange={e => setFormConta(p=>({...p, diaFechamento:parseInt(e.target.value)||undefined}))}
                            placeholder="Dia" className="campo-cfg" style={inputSt} />
                        </div>
                        <div>
                          <label style={labelSt}>Dia vencimento</label>
                          <input type="number" min="1" max="31"
                            value={formConta.diaVencimento||''}
                            onChange={e => setFormConta(p=>({...p, diaVencimento:parseInt(e.target.value)||undefined}))}
                            placeholder="Dia" className="campo-cfg" style={inputSt} />
                        </div>
                      </div>
                    </>
                  )}
                  <div>
                    <label style={labelSt}>Ícone</label>
                    <IconPicker icones={ICONES_CONTA} valor={formConta.icone}
                      onChange={i => setFormConta(p=>({...p, icone:i}))} />
                  </div>
                  <div>
                    <label style={labelSt}>Cor</label>
                    <ColorPicker valor={formConta.cor}
                      onChange={c => setFormConta(p=>({...p, cor:c}))} />
                  </div>
                  {erroConta && (
                    <div style={{ background:'#fee2e2', color:COR.vermelho,
                      borderRadius:7, padding:'7px 12px', fontSize:12 }}>
                      ⚠ {erroConta}
                    </div>
                  )}
                  <div style={{ display:'flex', gap:8, marginTop:4 }}>
                    {editContaId && (
                      <button onClick={() => excluirConta(editContaId)} style={{
                        flex:1, padding:'10px 0', border:`1.5px solid ${COR.borda}`,
                        borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500,
                        background:COR.branco, color:COR.vermelho, fontFamily:'inherit' }}>
                        Excluir
                      </button>
                    )}
                    <button onClick={salvarConta} style={{
                      flex:2, padding:'10px 0', border:'none', borderRadius:8,
                      background:`linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,
                      color:'#fff', fontSize:13, fontWeight:600,
                      cursor:'pointer', fontFamily:'inherit' }}>
                      {editContaId ? 'Salvar alterações' : 'Adicionar conta'}
                    </button>
                  </div>
                </div>
              </div>
          </>
        )}

        {/* ══ ABA CATEGORIAS ══ */}
        {aba==='categorias' && (
          <>
            <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between',
                alignItems:'center', marginBottom:14 }}>
                <div>
                  <h2 style={{ fontSize:16, fontWeight:700, color:COR.texto, margin:0 }}>Cadastro de Categorias</h2>
                  <p style={{ fontSize:12, color:COR.textoSuave, margin:'3px 0 0' }}>
                    {categorias.filter(c=>c.ativa).length} ativas de {categorias.length}
                  </p>
                </div>
              </div>

              {/* Sub-abas — só aparece quando há pelo menos uma categoria */}
              {categorias.length > 0 && (
                <div style={{ display:'flex', background:'#f1f5f9', borderRadius:8,
                  padding:3, marginBottom:14, alignSelf:'flex-start' }}>
                  {([['entrada','↑ Entradas'],['saida','↓ Saídas']] as const).map(([v,l]) => (
                    <button key={v} onClick={() => setAbaCat(v)} style={{
                      padding:'6px 20px', border:'none', borderRadius:6,
                      cursor:'pointer', fontSize:13, fontWeight:500,
                      fontFamily:'inherit', transition:'all .15s',
                      background: abaCat===v ? COR.branco : 'transparent',
                      color: abaCat===v ? (v==='entrada' ? COR.verde : COR.vermelho) : COR.textoSuave,
                      boxShadow: abaCat===v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                      {l}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ overflowY:'auto', flex:1 }}>
                {catsFiltradas.some(c=>c.fixa) && (
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:COR.textoSuave,
                      textTransform:'uppercase', letterSpacing:.6, marginBottom:8 }}>
                      📌 Fixas mensais
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {catsFiltradas.filter(c=>c.fixa).map(c => (
                        <CatCard key={c.id} c={c} editCatId={editCatId}
                          toggleAtiva={toggleAtiva} editarCategoria={editarCategoria} />
                      ))}
                    </div>
                  </div>
                )}
                {catsFiltradas.some(c=>!c.fixa) && (
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:COR.textoSuave,
                      textTransform:'uppercase', letterSpacing:.6, marginBottom:8 }}>
                      📊 Variáveis
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {catsFiltradas.filter(c=>!c.fixa).map(c => (
                        <CatCard key={c.id} c={c} editCatId={editCatId}
                          toggleAtiva={toggleAtiva} editarCategoria={editarCategoria} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Formulário categoria */}
            <div onKeyDown={e => { if (e.key==='Enter' && (e.target as HTMLElement).tagName==='INPUT') salvarCategoria() }}
              style={{ width:340, flexShrink:0, background:COR.branco,
                border:`1px solid ${COR.borda}`, borderRadius:12,
                padding:20, overflowY:'auto' }}>
                <div style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'center', marginBottom:18 }}>
                  <h3 style={{ fontSize:14, fontWeight:700, color:COR.texto, margin:0 }}>
                    {editCatId ? 'Editar categoria' : 'Nova categoria'}
                  </h3>
                  {editCatId && (
                    <button onClick={novaCategoria} title="Cancelar edição" style={{
                      border:'none', background:'transparent',
                      cursor:'pointer', fontSize:18, color:COR.textoSuave }}>✕</button>
                  )}
                </div>

                {/* Preview */}
                <div style={{ display:'flex', justifyContent:'center', marginBottom:18 }}>
                  <div style={{ width:56, height:56, borderRadius:16, background:formCat.cor,
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>
                    {formCat.icone}
                  </div>
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <div>
                    <label style={labelSt}>Nome da categoria</label>
                    <input ref={nomeCatRef} value={formCat.nome}
                      onChange={e => setFormCat(p=>({...p, nome:e.target.value}))}
                      placeholder="Ex: Supermercado, Lazer..." className="campo-cfg" style={inputSt} />
                  </div>
                  <div>
                    <label style={labelSt}>Tipo</label>
                    <div style={{ display:'flex', gap:6 }}>
                      {([['entrada','↑ Entrada'],['saida','↓ Saída']] as const).map(([v,l]) => (
                        <button key={v} onClick={() => setFormCat(p=>({...p,tipo:v}))} style={{
                          flex:1, padding:'7px 0', fontFamily:'inherit',
                          border:`1.5px solid ${formCat.tipo===v ? (v==='entrada' ? COR.verde : COR.vermelho) : COR.borda}`,
                          borderRadius:7, cursor:'pointer', fontSize:12, fontWeight:500,
                          background: formCat.tipo===v ? (v==='entrada' ? '#f0fdf4' : '#fff1f2') : COR.branco,
                          color: formCat.tipo===v ? (v==='entrada' ? COR.verde : COR.vermelho) : COR.textoSuave }}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={labelSt}>Frequência</label>
                    <div style={{ display:'flex', gap:6 }}>
                      {([[false,'Variável'],[true,'Fixa']] as const).map(([v,l]) => (
                        <button key={String(v)} onClick={() => setFormCat(p=>({...p,fixa:v as boolean}))} style={{
                          flex:1, padding:'7px 0', fontFamily:'inherit',
                          border:`1.5px solid ${formCat.fixa===v ? COR.azul : COR.borda}`,
                          borderRadius:7, cursor:'pointer', fontSize:12, fontWeight:500,
                          background: formCat.fixa===v ? '#eff6ff' : COR.branco,
                          color: formCat.fixa===v ? COR.azul : COR.textoSuave }}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dia vencimento — só fixa */}
                  {formCat.fixa && (
                    <div>
                      <label style={labelSt}>Dia de vencimento</label>
                      <input type="number" min="1" max="31"
                        value={formCat.diaVencimento||''}
                        onChange={e => setFormCat(p=>({...p, diaVencimento:parseInt(e.target.value)||undefined}))}
                        placeholder="Ex: 10" className="campo-cfg" style={inputSt} />
                    </div>
                  )}

                  {/* Tipo de movimento — todas as categorias */}
                  <div>
                    <label style={labelSt}>Tipo de movimento</label>
                    <div style={{ display:'flex', gap:6 }}>
                      {TIPOS_MOVIMENTO.map(t => (
                        <button key={t.id} onClick={() => setFormCat(p=>({
                          ...p, tipoMovimento:t.id,
                          formaPagamento: t.id==='dinheiro' ? undefined
                            : t.id==='cartao' ? 'avista' : 'automatico',
                        }))} style={{
                          flex:1, padding:'7px 0', fontFamily:'inherit',
                          border:`1.5px solid ${formCat.tipoMovimento===t.id ? COR.azul : COR.borda}`,
                          borderRadius:7, cursor:'pointer', fontSize:11, fontWeight:500,
                          background: formCat.tipoMovimento===t.id ? '#eff6ff' : COR.branco,
                          color: formCat.tipoMovimento===t.id ? COR.azul : COR.textoSuave }}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Forma de pagamento — depende do tipo de movimento */}
                  {formCat.tipoMovimento!=='dinheiro' && (
                    <div>
                      <label style={labelSt}>Forma de pagamento</label>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        {(formCat.tipoMovimento==='cartao' ? FORMAS_PAG_CARTAO : FORMAS_PAG_BANCO).map(f => (
                          <button key={f.id} onClick={() => setFormCat(p=>({...p,formaPagamento:f.id}))} style={{
                            padding:'7px 10px', fontFamily:'inherit',
                            border:`1.5px solid ${formCat.formaPagamento===f.id ? COR.azul : COR.borda}`,
                            borderRadius:7, cursor:'pointer', fontSize:11, fontWeight:500,
                            background: formCat.formaPagamento===f.id ? '#eff6ff' : COR.branco,
                            color: formCat.formaPagamento===f.id ? COR.azul : COR.textoSuave }}>
                            {f.label}
                          </button>
                        ))}
                      </div>
                      {formCat.fixa && formCat.tipoMovimento==='banco' && (
                        <div style={{ fontSize:10, color:'#94a3b8', marginTop:4 }}>
                          {formCat.formaPagamento==='automatico'
                            ? 'Se vencer em dia não útil, o sistema desloca sozinho para o próximo dia útil.'
                            : 'Ao consolidar o lançamento, você informa o dia em que foi realizado.'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Número de parcelas — só cartão parcelado */}
                  {formCat.tipoMovimento==='cartao' && formCat.formaPagamento==='parcelado' && (
                    <div>
                      <label style={labelSt}>Número de parcelas</label>
                      <input type="number" min="2" max="48"
                        value={formCat.numeroParcelas||''}
                        onChange={e => setFormCat(p=>({...p, numeroParcelas:parseInt(e.target.value)||undefined}))}
                        placeholder="Ex: 12" className="campo-cfg" style={inputSt} />
                    </div>
                  )}

                  {/* Descrição — só saída fixa */}
                  {formCat.fixa && formCat.tipo==='saida' && (
                    <div>
                      <label style={labelSt}>Descrição</label>
                      <textarea
                        value={(formCat as any).descricao||''}
                        onChange={e => setFormCat(p=>({...p, descricao:e.target.value}))}
                        placeholder="Ex: Parcela do financiamento, vence todo dia 10..."
                        rows={3}
                        className="campo-cfg" style={{ ...inputSt, resize:'vertical', lineHeight:1.5 }}
                      />
                      <div style={{ fontSize:10, color:'#94a3b8', marginTop:4 }}>
                        Aparece como observação no lançamento automático desta conta fixa.
                      </div>
                    </div>
                  )}

                  <div>
                    <label style={labelSt}>Ícone</label>
                    <IconPicker icones={ICONES_CAT} valor={formCat.icone}
                      onChange={i => setFormCat(p=>({...p,icone:i}))} />
                  </div>
                  <div>
                    <label style={labelSt}>Cor</label>
                    <ColorPicker valor={formCat.cor}
                      onChange={c => setFormCat(p=>({...p,cor:c}))} />
                  </div>
                  {erroCat && (
                    <div style={{ background:'#fee2e2', color:COR.vermelho,
                      borderRadius:7, padding:'7px 12px', fontSize:12 }}>
                      ⚠ {erroCat}
                    </div>
                  )}
                  <div style={{ display:'flex', gap:8, marginTop:4 }}>
                    {editCatId && (
                      <button onClick={() => excluirCategoria(editCatId)} style={{
                        flex:1, padding:'10px 0', border:`1.5px solid ${COR.borda}`,
                        borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500,
                        background:COR.branco, color:COR.vermelho, fontFamily:'inherit' }}>
                        Excluir
                      </button>
                    )}
                    <button onClick={salvarCategoria} style={{
                      flex:2, padding:'10px 0', border:'none', borderRadius:8,
                      background:`linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,
                      color:'#fff', fontSize:13, fontWeight:600,
                      cursor:'pointer', fontFamily:'inherit' }}>
                      {editCatId ? 'Salvar alterações' : 'Adicionar categoria'}
                    </button>
                  </div>
                </div>
              </div>
          </>
        )}

        {/* ══ ABA PERFIL ══ */}
        {aba==='perfil' && (
          <div style={{ flex:1, overflowY:'auto' }}>
          <div style={{ display:'flex', justifyContent:'center', padding:'20px 0 28px' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:14, width:'100%', maxWidth:500 }}>

            {/* Dados pessoais */}
            <div style={{ background:COR.branco, border:`1px solid ${COR.borda}`, borderRadius:14, padding:28 }}>
              <h2 style={{ fontSize:15, fontWeight:700, color:COR.texto, margin:'0 0 20px' }}>Perfil</h2>

              {/* Avatar */}
              <div style={{ display:'flex', justifyContent:'center', marginBottom:20 }}>
                <div style={{ position:'relative' }}>
                  <div style={{ width:80, height:80, borderRadius:'50%',
                    background:`linear-gradient(135deg,${COR.azulEscuro},${COR.azulMedio})`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:30, color:'#fff', fontWeight:700 }}>G</div>
                  <div title="Em breve" style={{ position:'absolute', bottom:0, right:0,
                    width:24, height:24, borderRadius:'50%', background:'#e2e8f0',
                    border:`2px solid ${COR.branco}`, display:'flex', alignItems:'center',
                    justifyContent:'center', fontSize:11, cursor:'not-allowed' }}>✏</div>
                </div>
              </div>

              {/* Mini-stats */}
              <div style={{ display:'flex', marginBottom:22, border:`1px solid ${COR.borda}`, borderRadius:10, overflow:'hidden' }}>
                {[
                  { label:'Contas',       valor: String(contas.length) },
                  { label:'Categorias',   valor: String(categorias.length) },
                  { label:'Membro desde', valor: '2025' },
                ].map((s, i) => (
                  <div key={s.label} style={{ flex:1, padding:'10px 0', textAlign:'center',
                    borderLeft: i > 0 ? `1px solid ${COR.borda}` : 'none' }}>
                    <div style={{ fontSize:17, fontWeight:700, color:COR.azul }}>{s.valor}</div>
                    <div style={{ fontSize:10, color:COR.textoSuave, marginTop:2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div>
                  <label style={labelSt}>Nome completo</label>
                  <input defaultValue="Guilherme Müller" placeholder="Seu nome" className="campo-cfg" style={inputSt} />
                </div>
                <div style={{ opacity:.6 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
                    <span style={labelSt}>E-mail</span>
                    <EmBreve />
                  </div>
                  <input disabled value={user?.email ?? 'seu@email.com'}
                    style={{ ...inputSt, cursor:'not-allowed', background:'#f8fafc' }} />
                  <div style={{ fontSize:10, color:'#94a3b8', marginTop:4 }}>
                    Vinculado à sua conta de login. Não editável aqui.
                  </div>
                </div>
                <button style={{ padding:'10px 0', border:'none', borderRadius:8,
                  background:`linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,
                  color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer',
                  fontFamily:'inherit', marginTop:2 }}>
                  Salvar perfil
                </button>
              </div>
            </div>

            {/* Segurança */}
            <div style={{ background:COR.branco, border:`1px solid ${COR.borda}`, borderRadius:14, padding:24, opacity:.6 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                <h3 style={{ fontSize:14, fontWeight:700, color:COR.texto, margin:0 }}>Segurança</h3>
                <EmBreve />
              </div>
              <button disabled style={{ width:'100%', padding:'10px 0',
                border:`1.5px solid ${COR.borda}`, borderRadius:8,
                background:COR.branco, color:COR.textoSuave, fontSize:13, fontWeight:600,
                cursor:'not-allowed', fontFamily:'inherit' }}>
                🔑 Trocar senha
              </button>
              <div style={{ fontSize:10, color:'#94a3b8', marginTop:6, textAlign:'center' }}>
                Um e-mail de redefinição será enviado para o endereço cadastrado.
              </div>
            </div>

            {/* Versão */}
            <div style={{ padding:14, background:'#f8faff', borderRadius:10,
              border:`1px solid ${COR.borda}`, textAlign:'center' }}>
              <div style={{ fontSize:12, color:COR.textoSuave, marginBottom:4 }}>Versão do app</div>
              <div style={{ fontSize:14, fontWeight:600, color:COR.texto }}>Compass One v0.1.0</div>
              <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>MVP — em desenvolvimento</div>
            </div>

          </div>
          </div>
          </div>
        )}

        {/* ══ ABA PREFERÊNCIAS ══ */}
        {aba==='preferencias' && (
          <div style={{ flex:1, overflowY:'auto' }}>
          <div style={{ display:'flex', justifyContent:'center', padding:'20px 0 28px' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:14, width:'100%', maxWidth:500 }}>

            {/* Card: Exibição */}
            <div style={{ background:COR.branco, border:`1px solid ${COR.borda}`, borderRadius:14, padding:24 }}>
              <h3 style={{ fontSize:14, fontWeight:700, color:COR.texto, margin:'0 0 16px' }}>Exibição</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

                {/* Layout — funcional */}
                <div>
                  <label style={{ display:'block', fontSize:11, fontWeight:600,
                    color:COR.textoSuave, marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>
                    Layout de lançamentos
                  </label>
                  <div style={{ display:'flex', gap:6 }}>
                    {([['classico','📋 Clássico'],['extrato','🏦 Extrato']] as const).map(([v,l]) => (
                      <button key={v} onClick={() => escolherLayout(v)} style={{
                        flex:1, padding:'8px 0', fontFamily:'inherit',
                        border:`1.5px solid ${layout===v ? COR.azul : COR.borda}`,
                        borderRadius:7, cursor:'pointer', fontSize:12, fontWeight:500,
                        background: layout===v ? '#eff6ff' : COR.branco,
                        color: layout===v ? COR.azul : COR.textoSuave }}>
                        {l}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize:10, color:'#94a3b8', marginTop:5 }}>
                    Define como a tela de Lançamentos é exibida.
                  </div>
                </div>

                {/* Moeda — desabilitado */}
                <div style={{ opacity:.6 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                    <label style={{ fontSize:11, fontWeight:600, color:COR.textoSuave,
                      textTransform:'uppercase', letterSpacing:.5 }}>Moeda padrão</label>
                    <EmBreve />
                  </div>
                  <select disabled defaultValue="BRL" style={{ ...inputSt, cursor:'not-allowed', background:'#f8fafc' }}>
                    <option value="BRL">🇧🇷 Real Brasileiro (R$)</option>
                    <option value="USD">🇺🇸 Dólar Americano ($)</option>
                    <option value="EUR">🇪🇺 Euro (€)</option>
                  </select>
                </div>

                {/* Casas decimais — desabilitado */}
                <div style={{ opacity:.6 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                    <label style={{ fontSize:11, fontWeight:600, color:COR.textoSuave,
                      textTransform:'uppercase', letterSpacing:.5 }}>Casas decimais</label>
                    <EmBreve />
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    {([['2','R$ 1.500,00'],['0','R$ 1.500']] as const).map(([v,l]) => (
                      <button disabled key={v} style={{ flex:1, padding:'7px 0', fontFamily:'inherit',
                        border:`1.5px solid ${v==='2' ? COR.azul : COR.borda}`, borderRadius:7,
                        cursor:'not-allowed', fontSize:12, fontWeight:500,
                        background: v==='2' ? '#eff6ff' : COR.branco,
                        color: v==='2' ? COR.azul : COR.textoSuave }}>{l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Card: Ciclo financeiro — desabilitado */}
            <div style={{ background:COR.branco, border:`1px solid ${COR.borda}`, borderRadius:14, padding:24, opacity:.6 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                <h3 style={{ fontSize:14, fontWeight:700, color:COR.texto, margin:0 }}>Ciclo financeiro</h3>
                <EmBreve />
              </div>
              <label style={{ display:'block', fontSize:11, fontWeight:600,
                color:COR.textoSuave, marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>
                Dia de início do mês
              </label>
              <select disabled defaultValue="1" style={{ ...inputSt, cursor:'not-allowed', background:'#f8fafc' }}>
                {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>Dia {d}</option>
                ))}
              </select>
              <div style={{ fontSize:10, color:'#94a3b8', marginTop:5 }}>
                Define quando começa o ciclo mensal para relatórios e dashboards.
              </div>
            </div>

            {/* Card: Alertas de saldo — desabilitado */}
            <div style={{ background:COR.branco, border:`1px solid ${COR.borda}`, borderRadius:14, padding:24, opacity:.6 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                <h3 style={{ fontSize:14, fontWeight:700, color:COR.texto, margin:0 }}>Alertas de saldo</h3>
                <EmBreve />
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'10px 14px', borderRadius:9, background:'#f8fafc', border:`1px solid ${COR.borda}` }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500, color:COR.texto }}>Alertar quando saldo abaixo de</div>
                    <div style={{ fontSize:11, color:COR.textoSuave, marginTop:2 }}>Destaca em vermelho no dashboard</div>
                  </div>
                  <div style={{ width:36, height:20, borderRadius:10, background:'#cbd5e1',
                    position:'relative', cursor:'not-allowed', flexShrink:0 }}>
                    <div style={{ width:16, height:16, borderRadius:'50%', background:'#fff',
                      position:'absolute', top:2, left:2, boxShadow:'0 1px 3px rgba(0,0,0,.2)' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:11, fontWeight:600,
                    color:COR.textoSuave, marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>
                    Valor mínimo
                  </label>
                  <input disabled type="text" defaultValue="R$ 1.000,00"
                    style={{ ...inputSt, cursor:'not-allowed', background:'#f8fafc' }} />
                </div>
              </div>
            </div>

            {/* Card: Planejamento — funcional */}
            <div style={{ background:COR.branco, border:`1px solid ${COR.borda}`, borderRadius:14, padding:24 }}>
              <h3 style={{ fontSize:14, fontWeight:700, color:COR.texto, margin:'0 0 12px' }}>Planejamento</h3>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'12px 14px', borderRadius:9,
                background: planejamentoLockado ? '#fff7ed' : '#f0fdf4',
                border:`1px solid ${planejamentoLockado ? '#fed7aa' : '#bbf7d0'}` }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:COR.texto }}>
                    {planejamentoLockado ? '🔒 Planejamento bloqueado' : '🔓 Planejamento desbloqueado'}
                  </div>
                  <div style={{ fontSize:11, color:COR.textoSuave, marginTop:2 }}>
                    {planejamentoLockado
                      ? 'Desbloqueie para editar o previsto, o real ou refinalizar.'
                      : 'Edição livre. Finalize o planejamento para bloqueá-lo novamente.'}
                  </div>
                </div>
                <button onClick={() => setPlanejamentoLockado(!planejamentoLockado)} style={{
                  padding:'7px 14px', border:'none', borderRadius:7, cursor:'pointer',
                  fontFamily:'inherit', fontSize:12, fontWeight:600, flexShrink:0,
                  background: planejamentoLockado ? '#ea580c' : '#16a34a', color:'#fff' }}>
                  {planejamentoLockado ? 'Desbloquear' : 'Bloquear'}
                </button>
              </div>
            </div>

          </div>
          </div>
          </div>
        )}

      </div>
    </div>
  )
}