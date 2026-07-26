import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AppHeader from '../components/AppHeader'
import { useToast } from '../components/Toast'
import type { Conta, Categoria, TipoCategoria, TipoMovimento, FormaPagamentoCategoria, FormaPagamentoFatura } from '../context/AppContext'
import { CATEGORIAS_PADRAO, GRUPOS_PADRAO } from '../data/categoriasPadrao'

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
  { id:'debito',        label:'Débito'            },
  { id:'pix',           label:'PIX'               },
  { id:'boleto',        label:'Boleto'            },
  { id:'transferencia', label:'Transferência'     },
]
const FORMAS_PAG_CARTAO: { id: FormaPagamentoCategoria; label: string }[] = [
  { id:'avista',    label:'À Vista' },
  { id:'parcelado', label:'Parcelado' },
]
const CORES_FORMA_PAG: Record<string,{bg:string;cor:string}> = {
  automatico:    { bg:'#e0f2fe', cor:'#0369a1' },
  debito:        { bg:'#fef9c3', cor:'#92400e' },
  manual:        { bg:'#f1f5f9', cor:'#475569' },
  pix:           { bg:'#d1fae5', cor:'#065f46' },
  boleto:        { bg:'#fce7f3', cor:'#9d174d' },
  transferencia: { bg:'#eff6ff', cor:'#1a56db' },
  avista:        { bg:'#f3e8ff', cor:'#7c3aed' },
  parcelado:     { bg:'#fce7f3', cor:'#be185d' },
  dinheiro:      { bg:'#f1f5f9', cor:'#475569' },
}
function labelCobranca(c: Categoria): { label: string; bg: string; cor: string } {
  if (c.tipoMovimento === 'dinheiro') return { label:'Dinheiro', ...CORES_FORMA_PAG.dinheiro }
  if (c.tipoMovimento === 'cartao') {
    const f = FORMAS_PAG_CARTAO.find(x => x.id === c.formaPagamento)
    const cores = CORES_FORMA_PAG[c.formaPagamento ?? ''] ?? { bg:'#f1f5f9', cor:'#64748b' }
    return { label: f?.label ?? 'Cartão', ...cores }
  }
  const f = FORMAS_PAG_BANCO.find(x => x.id === c.formaPagamento)
  const cores = CORES_FORMA_PAG[c.formaPagamento ?? ''] ?? { bg:'#f1f5f9', cor:'#64748b' }
  return { label: f?.label ?? 'Débito', ...cores }
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
  const refs = useRef<(HTMLButtonElement|null)[]>([])
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
      {CORES_PRESET.map((c, i) => (
        <button key={c}
          ref={el => { refs.current[i] = el }}
          tabIndex={valor===c ? 0 : -1}
          onClick={() => onChange(c)}
          onKeyDown={e => {
            const total = CORES_PRESET.length
            if (e.key==='ArrowRight'||e.key==='ArrowDown') {
              e.preventDefault(); const n=refs.current[(i+1)%total]; n?.click(); n?.focus()
            } else if (e.key==='ArrowLeft'||e.key==='ArrowUp') {
              e.preventDefault(); const n=refs.current[(i-1+total)%total]; n?.click(); n?.focus()
            }
          }}
          style={{
            width:26, height:26, borderRadius:'50%', background:c, cursor:'pointer', padding:0,
            border:`3px solid ${valor===c ? '#0f172a' : 'transparent'}`,
            boxShadow: valor===c ? '0 0 0 2px #fff, 0 0 0 4px #0f172a' : 'none',
            outline:'none', transition:'all .15s',
          }} />
      ))}
    </div>
  )
}

// ── Picker de ícone ──────────────────────────────────────────────────
function IconPicker({ icones, valor, onChange }: { icones:string[]; valor:string; onChange:(i:string)=>void }) {
  const refs = useRef<(HTMLButtonElement|null)[]>([])
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
      {icones.map((ic, i) => (
        <button key={ic}
          ref={el => { refs.current[i] = el }}
          tabIndex={valor===ic ? 0 : -1}
          onClick={() => onChange(ic)}
          onKeyDown={e => {
            const total = icones.length
            if (e.key==='ArrowRight'||e.key==='ArrowDown') {
              e.preventDefault(); const n=refs.current[(i+1)%total]; n?.click(); n?.focus()
            } else if (e.key==='ArrowLeft'||e.key==='ArrowUp') {
              e.preventDefault(); const n=refs.current[(i-1+total)%total]; n?.click(); n?.focus()
            }
          }}
          style={{
            width:34, height:34, border:`2px solid ${valor===ic ? COR.azul : COR.borda}`,
            borderRadius:8, background: valor===ic ? '#eff6ff' : COR.branco,
            cursor:'pointer', fontSize:16, display:'flex', outline:'none',
            alignItems:'center', justifyContent:'center',
          }}>{ic}</button>
      ))}
    </div>
  )
}

// ── Card de categoria ────────────────────────────────────────────────
function CatCard({ c, editCatId, toggleAtiva, editarCategoria, contas }: {
  c: Categoria
  editCatId: string|null
  toggleAtiva: (id:string) => void
  editarCategoria: (c:Categoria) => void
  contas: Conta[]
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
          {c.tipoMovimento !== 'dinheiro' && c.tipoMovimento !== 'cartao' && (() => {
            const tc = labelCobranca(c)
            return (
              <span style={{ fontSize:11, padding:'2px 8px', borderRadius:4, fontWeight:600,
                background:tc.bg, color:tc.cor }}>
                {tc.label}
              </span>
            )
          })()}
          {/* Fixa / Variável */}
          <span style={{ fontSize:11, padding:'2px 8px', borderRadius:4, fontWeight:600,
            background: c.fixa ? '#fef9c3' : '#f1f5f9', color: c.fixa ? '#92400e' : '#64748b' }}>
            {c.fixa ? 'Fixa' : 'Variável'}
          </span>
          {/* Vencimento */}
          {c.diaVencimento && (
            <span style={{ fontSize:11, padding:'2px 8px', borderRadius:4, fontWeight:600,
              background:'#e0f2fe', color:'#0369a1' }}>
              Vence dia {c.diaVencimento}
            </span>
          )}
          {/* Conta de débito vinculada */}
          {c.contaDebitoId && (() => {
            const conta = contas.find(x => x.id === c.contaDebitoId)
            return conta ? (
              <span style={{ fontSize:11, padding:'2px 8px', borderRadius:4, fontWeight:600,
                background:'#f0f4ff', color:'#1a56db' }}>
                {conta.icone} {conta.banco}
              </span>
            ) : null
          })()}
        </div>
      </div>
      {/* Toggle ativo/inativo */}
      <div onClick={e => e.stopPropagation()} style={{
        display:'flex', border:`1px solid ${COR.borda}`, borderRadius:7,
        overflow:'hidden', flexShrink:0 }}>
        <button onClick={() => { if (!c.ativa) toggleAtiva(c.id) }} style={{
          padding:'3px 10px', border:'none', cursor: c.ativa ? 'default' : 'pointer',
          fontSize:11, fontFamily:'inherit', fontWeight:600,
          background: c.ativa ? '#f0fdf4' : COR.branco,
          color: c.ativa ? COR.verde : COR.textoSuave }}>
          Ativo
        </button>
        <button onClick={() => { if (c.ativa) toggleAtiva(c.id) }} style={{
          padding:'3px 10px', border:'none', borderLeft:`1px solid ${COR.borda}`,
          cursor: c.ativa ? 'pointer' : 'default',
          fontSize:11, fontFamily:'inherit', fontWeight:600,
          background: !c.ativa ? '#fff1f2' : COR.branco,
          color: !c.ativa ? COR.vermelho : COR.textoSuave }}>
          Inativo
        </button>
      </div>
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────
export default function Configuracoes() {
  const location  = useLocation()
  const { toast } = useToast()
  const [aba,    setAba]    = useState<Aba>('bancos')
  const { user, contas, categorias, setContas, setCategorias,
          planos, planosReal,
          planejamentoLockado, setPlanejamentoLockado,
          desvioMinPerc, setDesvioMinPerc } = useApp()
  const [abaCat,      setAbaCat]      = useState<TipoCategoria>('saida')
  const [filtroAtiva, setFiltroAtiva] = useState<'ativas'|'inativas'|'todas'>('todas')
  const [subAbaCat,   setSubAbaCat]   = useState<'categorias'|'grupos'>('categorias')
  const [novoGrupoNome,  setNovoGrupoNome]  = useState('')
  const [editGrupo,      setEditGrupo]      = useState<string|null>(null)
  const [editGrupoNome,  setEditGrupoNome]  = useState('')
  const [gruposExtra,    setGruposExtra]    = useState<string[]>([])
  const [gruposOcultos,  setGruposOcultos]  = useState<string[]>([])

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
  const contaVazia: Omit<Conta,'id'> = {
    nome:'', banco:'', tipo:'corrente', saldoInicial:0,
    cor:CORES_PRESET[0], icone:ICONES_CONTA[0],
  }
  const [formConta,   setFormConta]   = useState<Omit<Conta,'id'>>(contaVazia)
  const [editContaId, setEditContaId] = useState<string|null>(null)
  const [erroConta,   setErroConta]   = useState('')
  const [saldoStr,    setSaldoStr]    = useState('')
  const [limiteStr,   setLimiteStr]   = useState('')
  const [bancoCustom, setBancoCustom] = useState('')
  const nomeContaRef = useRef<HTMLInputElement>(null)

  const catVazia: Omit<Categoria,'id'> = {
    nome:'', tipo:'saida', fixa:false, tipoMovimento:'banco', formaPagamento:'debito',
    cor:CORES_PRESET[0], icone:ICONES_CAT[0], ativa:true, grupo: undefined,
  }
  const [formCat,   setFormCat]   = useState<Omit<Categoria,'id'>>(catVazia)
  const [editCatId, setEditCatId] = useState<string|null>(null)
  const [erroCat,   setErroCat]   = useState('')
  const nomeCatRef = useRef<HTMLInputElement>(null)

  const tipoBancoRefs   = useRef<(HTMLButtonElement|null)[]>([])
  const tipoCatRefs     = useRef<(HTMLButtonElement|null)[]>([])
  const freqCatRefs     = useRef<(HTMLButtonElement|null)[]>([])
  const tipoMovRefs     = useRef<(HTMLButtonElement|null)[]>([])
  const formaPagCatRefs = useRef<(HTMLButtonElement|null)[]>([])

  // ── Ações Conta ──
  function novaConta(tipoAba: Aba = aba) {
    setFormConta({...contaVazia, tipo: tipoAba==='cartoes' ? 'cartao' : 'corrente'})
    setEditContaId(null)
    setErroConta('')
    setSaldoStr(''); setLimiteStr(''); setBancoCustom('')
    setTimeout(() => nomeContaRef.current?.focus(), 0)
  }
  function editarConta(c: Conta) {
    const { id, ...rest } = c
    const restFinal = (rest.tipo === 'cartao' && rest.contaPagamentoId && !rest.formaPagamentoFatura)
      ? { ...rest, formaPagamentoFatura: 'automatico' as FormaPagamentoFatura }
      : rest
    // Se banco não está na lista, seleciona "Outro" e guarda o valor real em bancoCustom
    const bancoNaLista = BANCOS.includes(c.banco)
    if (c.tipo === 'cartao' && !bancoNaLista && c.banco) {
      setFormConta({ ...restFinal, banco: 'Outro' })
      setBancoCustom(c.banco)
    } else {
      setFormConta(restFinal)
      setBancoCustom('')
    }
    setEditContaId(id)
    setErroConta('')
    setSaldoStr(c.saldoInicial ? String(c.saldoInicial).replace('.', ',') : '')
    setLimiteStr(c.limiteCartao ? String(c.limiteCartao).replace('.', ',') : '')
  }
  function salvarConta() {
    const ehCartao = formConta.tipo === 'cartao'
    const bancoEfetivo = (ehCartao && formConta.banco === 'Outro') ? bancoCustom.trim() : formConta.banco
    if (!ehCartao && !formConta.nome.trim()) return setErroConta('Informe o titular da conta')
    if (!bancoEfetivo) return setErroConta(ehCartao ? 'Selecione ou informe o banco' : 'Selecione o banco')
    const nomeEfetivo = ehCartao
      ? (formConta.apelido?.trim() || bancoEfetivo)
      : formConta.nome.trim()
    const contaFinal = { ...formConta, nome: nomeEfetivo, banco: bancoEfetivo }
    setErroConta('')
    if (editContaId) {
      setContas(prev => prev.map(c => {
        if (c.id === editContaId) return { id: editContaId, ...contaFinal }
        if (contaFinal.preferida && (c.tipo === 'corrente' || c.tipo === 'poupanca')) return { ...c, preferida: false }
        return c
      }))
      toast('Conta atualizada')
    } else {
      setContas(prev => [...prev, {id:gerarId(),...contaFinal}])
      toast('Conta cadastrada')
    }
    novaConta()
  }
  function excluirConta(id: string) {
    if (!window.confirm('Excluir esta conta?')) return
    setContas(prev => prev.filter(c => c.id!==id))
    if (editContaId===id) novaConta()
    toast('Conta excluída', 'info')
  }
  function moverConta(id: string, dir: 'up' | 'down') {
    setContas(prev => {
      const c = prev.find(x => x.id === id)
      if (!c) return prev
      const grupo = prev.filter(x => x.tipo === c.tipo)
      const idx = grupo.findIndex(x => x.id === id)
      if (dir === 'up' && idx === 0) return prev
      if (dir === 'down' && idx === grupo.length - 1) return prev
      const vizinho = grupo[dir === 'up' ? idx - 1 : idx + 1]
      const posC = prev.findIndex(x => x.id === id)
      const posV = prev.findIndex(x => x.id === vizinho.id)
      const next = [...prev]
      ;[next[posC], next[posV]] = [next[posV], next[posC]]
      return next
    })
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
      setCategorias(prev => prev.map(c => c.id===editCatId ? {id:editCatId,...formCat, ativa:true} : c))
      toast('Categoria atualizada')
    } else {
      setCategorias(prev => [...prev, {id:gerarId(),...formCat, ativa:true}])
      toast('Categoria criada')
    }
    novaCategoria()
  }
  function excluirCategoria(id: string) {
    if (!window.confirm('Excluir esta categoria?')) return
    setCategorias(prev => prev.filter(c => c.id!==id))
    if (editCatId===id) { setEditCatId(null); setFormCat({...catVazia, tipo:abaCat}) }
    toast('Categoria excluída', 'info')
  }
  function toggleAtiva(id: string) {
    const cat = categorias.find(c => c.id === id)
    if (!cat) return
    if (cat.ativa) {
      const anoAtual = new Date().getFullYear()
      const mesAtual = new Date().getMonth()
      const temLancFuturo = (lista: { id?: string; nome: string; v: number[] }[]) => {
        const entry = lista.find(c => (c.id && c.id === id) || c.nome === cat.nome)
        return entry ? entry.v.some((v, i) => i > mesAtual && v !== 0) : false
      }
      const anoFuturo = Object.entries(planos)
        .filter(([ano]) => Number(ano) > anoAtual)
        .some(([, pd]) => {
          const lista = cat.tipo === 'entrada' ? pd.entradas : pd.saidas
          return lista.some(c => ((c.id && c.id === id) || c.nome === cat.nome) && c.v.some(v => v !== 0))
        })
      const listaAtual = cat.tipo === 'entrada' ? (planos[anoAtual]?.entradas ?? []) : (planos[anoAtual]?.saidas ?? [])
      const listaRealAtual = cat.tipo === 'entrada' ? (planosReal[anoAtual]?.entradas ?? []) : (planosReal[anoAtual]?.saidas ?? [])
      if (temLancFuturo(listaAtual) || temLancFuturo(listaRealAtual) || anoFuturo) {
        window.alert('Não é possível inativar esta categoria pois ela possui lançamentos planejados em meses futuros. Remova os valores dos meses futuros no planejamento antes de inativar.')
        return
      }
    }
    setCategorias(prev => prev.map(c => c.id===id ? {...c, ativa:!c.ativa} : c))
  }
  function importarSugestoes() {
    const nomesExistentes = new Set(categorias.map(c => c.nome.toLowerCase()))
    const novas = CATEGORIAS_PADRAO
      .filter(c => !nomesExistentes.has(c.nome.toLowerCase()))
      .map((c, i) => ({ ...c, ativa: false, id: `id-${Date.now()}-${i}-${Math.random().toString(36).slice(2,6)}` }))
    if (novas.length === 0) return
    setCategorias(prev => [...prev, ...novas])
    setFiltroAtiva('inativas')
    setAbaCat(novas[0].tipo)
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
    .filter(c => c.tipo === abaCat)
    .filter(c => filtroAtiva === 'todas' ? true : filtroAtiva === 'ativas' ? c.ativa : !c.ativa)
    .sort((a,b) => a.nome.localeCompare(b.nome,'pt-BR'))

  const temSugestoesPendentes = CATEGORIAS_PADRAO.some(
    p => !categorias.some(c => c.nome.toLowerCase() === p.nome.toLowerCase())
  )

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
        padding:'10px 24px 0', display:'flex', gap:3, flexShrink:0 }}>
        {([['bancos','Bancos'],['cartoes','Cartões de Crédito'],['categorias','Grupos/Categorias'],['perfil','Perfil'],['preferencias','Preferências']] as const).map(([v,l]) => (
          <button key={v} onClick={() => { setAba(v); if (v==='bancos'||v==='cartoes') novaConta(v) }} style={{
            padding:'7px 16px', borderRadius:'8px 8px 0 0',
            border:`1px solid ${aba===v ? COR.azul : COR.borda}`,
            cursor:'pointer', fontSize:12, fontWeight:aba===v ? 700 : 500, fontFamily:'inherit',
            background: aba===v ? COR.azul : '#f8faff', color: aba===v ? '#fff' : COR.textoSuave,
            position:'relative', zIndex: aba===v ? 1 : 0 }}>
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
                        {grupo.map((c, grupoIdx) => (
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
                              <div style={{ fontSize:14, fontWeight:600, color:COR.texto }}>
                                {c.tipo==='cartao' ? 'Cartão de Crédito' : c.banco}
                              </div>
                              <div style={{ fontSize:12, color:COR.textoSuave, marginTop:1 }}>
                                {c.tipo==='cartao'
                                  ? `${c.banco}${c.apelido ? ` · ${c.apelido}` : ''}`
                                  : `${c.nome}${c.agencia ? ` · Ag ${c.agencia}` : ''}${c.numeroConta ? ` · CC ${c.numeroConta}` : ''}`}
                              </div>
                            </div>
                            {c.tipo !== 'cartao' && (
                              <div style={{ display:'flex', gap:2, flexShrink:0 }}
                                onClick={e => e.stopPropagation()}>
                                <button onClick={() => moverConta(c.id,'up')} disabled={grupoIdx===0}
                                  title="Mover para cima"
                                  style={{ background:'none', border:'none',
                                    cursor: grupoIdx===0 ? 'default' : 'pointer',
                                    fontSize:18, padding:'2px 6px', color: COR.textoSuave,
                                    opacity: grupoIdx===0 ? 0.2 : 0.65 }}>↑</button>
                                <button onClick={() => moverConta(c.id,'down')} disabled={grupoIdx===grupo.length-1}
                                  title="Mover para baixo"
                                  style={{ background:'none', border:'none',
                                    cursor: grupoIdx===grupo.length-1 ? 'default' : 'pointer',
                                    fontSize:18, padding:'2px 6px', color: COR.textoSuave,
                                    opacity: grupoIdx===grupo.length-1 ? 0.2 : 0.65 }}>↓</button>
                              </div>
                            )}
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
                <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:12, marginBottom:18 }}>
                  <div style={{ width:56, height:56, borderRadius:16, background:formConta.cor,
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>
                    {formConta.icone}
                  </div>
                  {editContaId && formConta.tipo !== 'cartao' && (
                    <button
                      onClick={() => setFormConta(prev => ({ ...prev, preferida: !prev.preferida }))}
                      title={formConta.preferida ? 'Remover como preferida' : 'Marcar como banco preferido'}
                      style={{ background:'none', border:'none', cursor:'pointer', padding:'4px 6px',
                        fontSize:48, lineHeight:1,
                        color: formConta.preferida ? '#f59e0b' : COR.textoSuave,
                        opacity: formConta.preferida ? 1 : 0.3 }}>
                      ★
                    </button>
                  )}
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  {/* ── BANCO (primeiro para cartão, com opção Outro) ── */}
                  {formConta.tipo === 'cartao' ? (
                    <>
                      <div>
                        <label style={labelSt}>Banco</label>
                        <select value={formConta.banco}
                          onChange={e => { setFormConta(p=>({...p, banco:e.target.value})); if (e.target.value !== 'Outro') setBancoCustom('') }}
                          className="campo-cfg" style={inputSt}>
                          <option value="">Selecione...</option>
                          {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                      {formConta.banco === 'Outro' && (
                        <div>
                          <label style={labelSt}>Qual banco?</label>
                          <input ref={nomeContaRef} value={bancoCustom}
                            onChange={e => setBancoCustom(e.target.value)}
                            placeholder="Nome do banco" className="campo-cfg" style={inputSt} />
                        </div>
                      )}
                      <div>
                        <label style={labelSt}>Limite do cartão</label>
                        <input value={limiteStr}
                          onChange={e => {
                            const raw = e.target.value.replace(/[^0-9.,]/g, '')
                            setLimiteStr(raw)
                            setFormConta(p=>({...p, limiteCartao:parseFloat(raw.replace(',','.'))||0}))
                          }}
                          placeholder="R$ 0,00" className="campo-cfg" style={inputSt} />
                      </div>
                      <div>
                        <label style={labelSt}>Dia fechamento</label>
                        <input type="number" min="1" max="31"
                          value={formConta.diaFechamento||''}
                          onChange={e => setFormConta(p=>({...p, diaFechamento:parseInt(e.target.value)||undefined}))}
                          placeholder="Dia" className="campo-cfg" style={inputSt} />
                      </div>
                      <div>
                        <label style={labelSt}>Apelido do cartão <span style={{ fontWeight:400, color:COR.textoSuave }}>(opcional)</span></label>
                        <input value={formConta.apelido||''}
                          onChange={e => setFormConta(p=>({...p, apelido:e.target.value||undefined}))}
                          placeholder="Ex: Nubank Gold, Itaú Família..."
                          className="campo-cfg" style={inputSt} />
                        <div style={{ fontSize:10, color:'#94a3b8', marginTop:3 }}>
                          Se não informado, o banco será usado como identificador do cartão.
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label style={labelSt}>Banco</label>
                        <select value={formConta.banco}
                          onChange={e => setFormConta(p=>({...p, banco:e.target.value}))}
                          className="campo-cfg" style={inputSt}>
                          <option value="">Selecione...</option>
                          {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={labelSt}>Titular da conta</label>
                        <input ref={nomeContaRef} value={formConta.nome}
                          onChange={e => setFormConta(p=>({...p, nome:e.target.value}))}
                          placeholder="Ex: João Silva, Maria Souza..."
                          className="campo-cfg" style={inputSt} />
                      </div>
                      {aba==='bancos' && (
                        <>
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                            <div>
                              <label style={labelSt}>Agência</label>
                              <input value={formConta.agencia||''}
                                onChange={e => setFormConta(p=>({...p, agencia:e.target.value}))}
                                placeholder="Ex: 0001" className="campo-cfg" style={inputSt} />
                            </div>
                            <div>
                              <label style={labelSt}>Conta</label>
                              <input value={formConta.numeroConta||''}
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
                              {([['corrente','Corrente'],['poupanca','Poupança']] as const).map(([v,l], i) => (
                                <button key={v}
                                  ref={el => { tipoBancoRefs.current[i] = el }}
                                  tabIndex={formConta.tipo===v ? 0 : -1}
                                  onClick={() => setFormConta(p=>({...p,tipo:v}))}
                                  onKeyDown={e => {
                                    if (e.key==='ArrowRight'||e.key==='ArrowDown') {
                                      e.preventDefault(); const n=tipoBancoRefs.current[(i+1)%2]; n?.click(); n?.focus()
                                    } else if (e.key==='ArrowLeft'||e.key==='ArrowUp') {
                                      e.preventDefault(); const n=tipoBancoRefs.current[(i-1+2)%2]; n?.click(); n?.focus()
                                    }
                                  }}
                                  style={{
                                  flex:1, padding:'7px 0', fontFamily:'inherit', outline:'none',
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
                      <div>
                        <label style={labelSt}>Saldo inicial</label>
                        <input value={saldoStr}
                          onChange={e => {
                            const raw = e.target.value.replace(/[^0-9.,]/g, '')
                            setSaldoStr(raw)
                            setFormConta(p=>({...p, saldoInicial:parseFloat(raw.replace(',','.'))||0}))
                          }}
                          placeholder="R$ 0,00" className="campo-cfg" style={inputSt} />
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
        {aba==='categorias' && (() => {
          const gruposCustom = Array.from(new Set([
            ...gruposExtra,
            ...categorias.map(c => c.grupo).filter((g): g is string => !!g && !GRUPOS_PADRAO.includes(g)),
          ])).sort()
          const todosGrupos = [...GRUPOS_PADRAO.filter(g => !gruposOcultos.includes(g)), ...gruposCustom].sort((a,b) => a.localeCompare(b,'pt-BR'))
          return (
          <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden' }}>
            {/* Sub-abas: Categorias / Grupos */}
            <div style={{ display:'flex', gap:0, borderBottom:`1px solid ${COR.borda}`, marginBottom:16, flexShrink:0 }}>
              {([['categorias','Categorias'],['grupos','Grupos']] as const).map(([v,l]) => (
                <button key={v} onClick={() => setSubAbaCat(v)} style={{
                  padding:'7px 18px', border:'none', borderBottom:`2px solid ${subAbaCat===v ? COR.azul : 'transparent'}`,
                  cursor:'pointer', fontSize:13, fontWeight:subAbaCat===v ? 700 : 500, fontFamily:'inherit',
                  background:'transparent', color: subAbaCat===v ? COR.azul : COR.textoSuave, transition:'all .15s' }}>
                  {l}
                </button>
              ))}
            </div>
            {subAbaCat === 'categorias' && (
            <div style={{ flex:1, display:'flex', gap:16, minWidth:0, overflow:'hidden' }}>
            <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between',
                alignItems:'center', marginBottom:14 }}>
                <div>
                  <h2 style={{ fontSize:16, fontWeight:700, color:COR.texto, margin:0 }}>Cadastro de Categorias</h2>
                  <p style={{ fontSize:12, color:COR.textoSuave, margin:'3px 0 0' }}>
                    {categorias.filter(c=>c.ativa).length} ativas de {categorias.length}
                  </p>
                </div>
                {temSugestoesPendentes && (
                  <button onClick={importarSugestoes} style={{
                    padding:'7px 14px', border:`1px solid ${COR.borda}`, borderRadius:8,
                    background:COR.branco, color:COR.textoSuave, fontSize:12, fontWeight:500,
                    cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:5 }}>
                    ✨ Importar sugestões
                  </button>
                )}
              </div>

              {/* Sub-abas + filtro ativo/inativo */}
              {categorias.length > 0 && (
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, flexWrap:'wrap' }}>
                  <div style={{ display:'flex', background:'#f1f5f9', borderRadius:8, padding:3 }}>
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
                  <div style={{ display:'flex', background:'#f1f5f9', borderRadius:8, padding:3 }}>
                    {([['ativas','Ativas'],['inativas','Inativas'],['todas','Todas']] as const).map(([v,l]) => (
                      <button key={v} onClick={() => setFiltroAtiva(v)} style={{
                        padding:'6px 14px', border:'none', borderRadius:6,
                        cursor:'pointer', fontSize:12, fontWeight:500,
                        fontFamily:'inherit', transition:'all .15s',
                        background: filtroAtiva===v ? COR.branco : 'transparent',
                        color: filtroAtiva===v ? (v==='inativas' ? COR.vermelho : COR.azul) : COR.textoSuave,
                        boxShadow: filtroAtiva===v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ overflowY:'auto', flex:1 }}>
                {(() => {
                  const gruposOrdenados = [
                    ...GRUPOS_PADRAO.filter(g => catsFiltradas.some(c => c.grupo === g)),
                    ...Array.from(new Set(catsFiltradas.map(c => c.grupo).filter(g => g && !GRUPOS_PADRAO.includes(g)))).sort() as string[],
                  ].sort((a,b) => a.localeCompare(b,'pt-BR'))
                  const semGrupo = catsFiltradas.filter(c => !c.grupo)
                  return <>
                    {gruposOrdenados.map(g => (
                      <div key={g} style={{ marginBottom:16 }}>
                        <div style={{ fontSize:11, fontWeight:700, color:COR.textoSuave,
                          textTransform:'uppercase', letterSpacing:.6, marginBottom:8 }}>
                          {g}
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                          {catsFiltradas.filter(c => c.grupo === g).map(c => (
                            <CatCard key={c.id} c={c} editCatId={editCatId}
                              toggleAtiva={toggleAtiva} editarCategoria={editarCategoria} contas={contas} />
                          ))}
                        </div>
                      </div>
                    ))}
                    {semGrupo.length > 0 && (
                      <div style={{ marginBottom:16 }}>
                        <div style={{ fontSize:11, fontWeight:700, color:COR.textoSuave,
                          textTransform:'uppercase', letterSpacing:.6, marginBottom:8 }}>
                          Sem grupo
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                          {semGrupo.map(c => (
                            <CatCard key={c.id} c={c} editCatId={editCatId}
                              toggleAtiva={toggleAtiva} editarCategoria={editarCategoria} contas={contas} />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                })()}
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
                  {/* Grupo */}
                  <div>
                    <label style={labelSt}>Grupo</label>
                    <select
                      value={formCat.grupo && !todosGrupos.includes(formCat.grupo) ? '__outro__' : (formCat.grupo ?? '')}
                      onChange={e => {
                        if (e.target.value === '__outro__') setFormCat(p=>({...p, grupo:''}))
                        else setFormCat(p=>({...p, grupo: e.target.value || undefined}))
                      }}
                      className="campo-cfg" style={{...inputSt, cursor:'pointer'}}>
                      <option value="">Selecione um grupo...</option>
                      {todosGrupos.map(g => <option key={g} value={g}>{g}</option>)}
                      <option value="__outro__">Outro...</option>
                    </select>
                    {formCat.grupo != null && !todosGrupos.includes(formCat.grupo) && (
                      <input value={formCat.grupo}
                        onChange={e => setFormCat(p=>({...p, grupo: e.target.value || undefined}))}
                        placeholder="Nome do grupo personalizado"
                        className="campo-cfg" style={{...inputSt, marginTop:6}} />
                    )}
                  </div>

                  <div>
                    <label style={labelSt}>Nome da categoria</label>
                    <input ref={nomeCatRef} value={formCat.nome}
                      onChange={e => setFormCat(p=>({...p, nome:e.target.value}))}
                      placeholder="Ex: Supermercado, Lazer..." className="campo-cfg" style={inputSt} />
                  </div>
                  <div>
                    <label style={labelSt}>Movimentação</label>
                    <div style={{ display:'flex', gap:6 }}>
                      {([['entrada','↑ Entrada'],['saida','↓ Saída']] as const).map(([v,l], i) => (
                        <button key={v}
                          ref={el => { tipoCatRefs.current[i] = el }}
                          tabIndex={formCat.tipo===v ? 0 : -1}
                          onClick={() => setFormCat(p=>({...p,tipo:v}))}
                          onKeyDown={e => {
                            if (e.key==='ArrowRight'||e.key==='ArrowDown') {
                              e.preventDefault(); const n=tipoCatRefs.current[(i+1)%2]; n?.click(); n?.focus()
                            } else if (e.key==='ArrowLeft'||e.key==='ArrowUp') {
                              e.preventDefault(); const n=tipoCatRefs.current[(i-1+2)%2]; n?.click(); n?.focus()
                            }
                          }}
                          style={{
                          flex:1, padding:'7px 0', fontFamily:'inherit', outline:'none',
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
                    <label style={labelSt}>Tipo</label>
                    <div style={{ display:'flex', gap:6 }}>
                      {([[false,'Variável'],[true,'Fixa']] as const).map(([v,l], i) => (
                        <button key={String(v)}
                          ref={el => { freqCatRefs.current[i] = el }}
                          tabIndex={formCat.fixa===v ? 0 : -1}
                          onClick={() => setFormCat(p=>({...p,fixa:v as boolean}))}
                          onKeyDown={e => {
                            if (e.key==='ArrowRight'||e.key==='ArrowDown') {
                              e.preventDefault(); const n=freqCatRefs.current[(i+1)%2]; n?.click(); n?.focus()
                            } else if (e.key==='ArrowLeft'||e.key==='ArrowUp') {
                              e.preventDefault(); const n=freqCatRefs.current[(i-1+2)%2]; n?.click(); n?.focus()
                            }
                          }}
                          style={{
                          flex:1, padding:'7px 0', fontFamily:'inherit', outline:'none',
                          border:`1.5px solid ${formCat.fixa===v ? COR.azul : COR.borda}`,
                          borderRadius:7, cursor:'pointer', fontSize:12, fontWeight:500,
                          background: formCat.fixa===v ? '#eff6ff' : COR.branco,
                          color: formCat.fixa===v ? COR.azul : COR.textoSuave }}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dia vencimento — fixa (não cartão) ou banco + débito automático */}
                  {((formCat.fixa && formCat.tipoMovimento !== 'cartao') || (formCat.tipoMovimento === 'banco' && formCat.formaPagamento === 'automatico')) && (
                    <div>
                      <label style={labelSt}>Dia de vencimento</label>
                      <input type="number" min="1" max="31"
                        value={formCat.diaVencimento||''}
                        onChange={e => setFormCat(p=>({...p, diaVencimento:parseInt(e.target.value)||undefined}))}
                        placeholder="Ex: 10" className="campo-cfg" style={inputSt} />
                    </div>
                  )}

                  {/* Lançamentos — todas as categorias */}
                  <div>
                    <label style={labelSt}>Lançamentos</label>
                    <div style={{ display:'flex', gap:6 }}>
                      {TIPOS_MOVIMENTO.map((t, i) => (
                        <button key={t.id}
                          ref={el => { tipoMovRefs.current[i] = el }}
                          tabIndex={formCat.tipoMovimento===t.id ? 0 : -1}
                          onClick={() => setFormCat(p=>({
                            ...p, tipoMovimento:t.id,
                            formaPagamento: t.id==='dinheiro' ? undefined
                              : t.id==='cartao' ? 'avista' : 'automatico',
                            contaDebitoId: undefined,
                          }))}
                          onKeyDown={e => {
                            const total = TIPOS_MOVIMENTO.length
                            if (e.key==='ArrowRight'||e.key==='ArrowDown') {
                              e.preventDefault(); const n=tipoMovRefs.current[(i+1)%total]; n?.click(); n?.focus()
                            } else if (e.key==='ArrowLeft'||e.key==='ArrowUp') {
                              e.preventDefault(); const n=tipoMovRefs.current[(i-1+total)%total]; n?.click(); n?.focus()
                            }
                          }}
                          style={{
                          flex:1, padding:'7px 0', fontFamily:'inherit', outline:'none',
                          border:`1.5px solid ${formCat.tipoMovimento===t.id ? COR.azul : COR.borda}`,
                          borderRadius:7, cursor:'pointer', fontSize:11, fontWeight:500,
                          background: formCat.tipoMovimento===t.id ? '#eff6ff' : COR.branco,
                          color: formCat.tipoMovimento===t.id ? COR.azul : COR.textoSuave }}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <p style={{ fontSize:11, color:COR.textoSuave, marginTop:6, lineHeight:1.5 }}>
                      {formCat.tipoMovimento === 'banco'    && 'Gastos debitados diretamente na conta bancária (débito, Pix, boleto).'}
                      {formCat.tipoMovimento === 'cartao'   && 'Gastos pagos com cartão de crédito — aparecem na fatura do cartão.'}
                      {formCat.tipoMovimento === 'dinheiro' && 'Gastos pagos em espécie — aparecem no extrato de dinheiro em carteira.'}
                    </p>
                  </div>

                  {/* Forma de pagamento — só para banco */}
                  {formCat.tipoMovimento==='banco' && (
                    <div>
                      <label style={labelSt}>Forma de lançamento</label>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        {FORMAS_PAG_BANCO.map((f, i) => (
                          <button key={f.id}
                            ref={el => { formaPagCatRefs.current[i] = el }}
                            tabIndex={formCat.formaPagamento===f.id ? 0 : -1}
                            onClick={() => setFormCat(p=>({
                              ...p, formaPagamento:f.id,
                              contaDebitoId: f.id === 'automatico' ? p.contaDebitoId : undefined,
                            }))}
                            onKeyDown={e => {
                              const total = FORMAS_PAG_BANCO.length
                              if (e.key==='ArrowRight'||e.key==='ArrowDown') {
                                e.preventDefault(); const n=formaPagCatRefs.current[(i+1)%total]; n?.click(); n?.focus()
                              } else if (e.key==='ArrowLeft'||e.key==='ArrowUp') {
                                e.preventDefault(); const n=formaPagCatRefs.current[(i-1+total)%total]; n?.click(); n?.focus()
                              }
                            }}
                            style={{
                              padding:'7px 10px', fontFamily:'inherit', outline:'none',
                              border:`1.5px solid ${formCat.formaPagamento===f.id ? COR.azul : COR.borda}`,
                              borderRadius:7, cursor:'pointer', fontSize:11, fontWeight:500,
                              background: formCat.formaPagamento===f.id ? '#eff6ff' : COR.branco,
                              color: formCat.formaPagamento===f.id ? COR.azul : COR.textoSuave }}>
                            {f.label}
                          </button>
                        ))}
                      </div>
                      <div style={{ fontSize:11, color:'#94a3b8', marginTop:6, lineHeight:1.5 }}>
                        {formCat.formaPagamento==='automatico'
                          ? 'A despesa é debitada automaticamente na conta vinculada no dia do vencimento.'
                          : 'Você informa a data e o meio de pagamento ao consolidar cada lançamento.'
                        }
                      </div>
                      {formCat.fixa && formCat.formaPagamento==='automatico' && (
                        <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>
                          Se vencer em dia não útil, o sistema desloca para o próximo dia útil.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Conta de débito — só quando débito automático em banco */}
                  {formCat.tipoMovimento==='banco' && formCat.formaPagamento==='automatico' && (
                    <div>
                      <label style={labelSt}>Conta de débito</label>
                      <select value={formCat.contaDebitoId ?? ''}
                        onChange={e => setFormCat(p=>({...p, contaDebitoId: e.target.value || undefined}))}
                        className="campo-cfg" style={inputSt}>
                        <option value="">Selecione a conta...</option>
                        {contas.filter(c => c.tipo !== 'cartao').map(c => (
                          <option key={c.id} value={c.id}>{c.icone} {c.nome} — {c.banco}</option>
                        ))}
                      </select>
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
            </div>)}
            {subAbaCat === 'grupos' && (
              <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:16 }}>
                <div>
                  <h2 style={{ fontSize:16, fontWeight:700, color:COR.texto, margin:'0 0 4px' }}>Grupos</h2>
                  <p style={{ fontSize:12, color:COR.textoSuave, margin:0 }}>
                    Organize suas categorias em grupos para facilitar a visualização.
                  </p>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {todosGrupos.map(g => {
                    const count = categorias.filter(c => c.grupo === g).length
                    const isPadrao = GRUPOS_PADRAO.includes(g)
                    const editando = editGrupo === g
                    return (
                      <div key={g} style={{ background:COR.branco, border:`1px solid ${COR.borda}`, borderRadius:10, padding:'10px 14px', display:'flex', alignItems:'center', gap:10 }}>
                        {editando ? (
                          <input autoFocus value={editGrupoNome} onChange={e => setEditGrupoNome(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                const nome = editGrupoNome.trim()
                                if (nome && nome !== g) {
                                  setCategorias(prev => prev.map(c => c.grupo === g ? {...c, grupo: nome} : c))
                                  setGruposExtra(prev => prev.map(x => x === g ? nome : x))
                                }
                                setEditGrupo(null)
                              } else if (e.key === 'Escape') setEditGrupo(null)
                            }}
                            className="campo-cfg" style={{ flex:1, fontSize:13, padding:'4px 8px', border:`1.5px solid ${COR.azul}`, borderRadius:6, outline:'none', fontFamily:'inherit' }} />
                        ) : (
                          <span style={{ flex:1, fontSize:13, fontWeight:600, color:COR.texto }}>{g}</span>
                        )}
                        <span style={{ fontSize:11, color:COR.textoSuave, background:'#f1f5f9', padding:'2px 8px', borderRadius:10, flexShrink:0 }}>
                          {count} {count === 1 ? 'categoria' : 'categorias'}
                        </span>
                        {!editando && (
                          <>
                            <button onClick={() => { setEditGrupo(g); setEditGrupoNome(g) }} title="Renomear" style={{
                              border:'none', background:'transparent', cursor:'pointer', fontSize:14, color:COR.textoSuave, padding:'2px 4px' }}>✏</button>
                            <button onClick={() => {
                              const msg = count > 0 ? `Remover grupo "${g}"? As ${count} categorias ficarão sem grupo.` : `Remover grupo "${g}"?`
                              if (window.confirm(msg)) {
                                setCategorias(prev => prev.map(c => c.grupo === g ? {...c, grupo: undefined} : c))
                                if (isPadrao) setGruposOcultos(prev => [...prev, g])
                                else setGruposExtra(prev => prev.filter(x => x !== g))
                              }
                            }} title="Excluir" style={{
                              border:'none', background:'transparent', cursor:'pointer', fontSize:14, color:COR.vermelho, padding:'2px 4px' }}>✕</button>
                          </>
                        )}
                        {editando && (
                          <button onClick={() => {
                            const nome = editGrupoNome.trim()
                            if (nome && nome !== g) {
                              setCategorias(prev => prev.map(c => c.grupo === g ? {...c, grupo: nome} : c))
                              if (isPadrao) {
                                setGruposOcultos(prev => [...prev, g])
                                if (!GRUPOS_PADRAO.includes(nome)) setGruposExtra(prev => [...prev, nome].sort())
                              } else {
                                setGruposExtra(prev => prev.map(x => x === g ? nome : x))
                              }
                            }
                            setEditGrupo(null)
                          }} style={{ border:'none', background:COR.azul, color:'#fff', cursor:'pointer', fontSize:11, padding:'3px 10px', borderRadius:5, fontFamily:'inherit', fontWeight:600 }}>OK</button>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div style={{ background:COR.branco, border:`1.5px dashed ${COR.borda}`, borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ fontSize:12, fontWeight:600, color:COR.textoSuave, marginBottom:8 }}>Novo grupo</div>
                  <div style={{ display:'flex', gap:8 }}>
                    <input value={novoGrupoNome} onChange={e => setNovoGrupoNome(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const nome = novoGrupoNome.trim()
                          if (nome && !todosGrupos.includes(nome)) setGruposExtra(prev => [...prev, nome].sort())
                          setNovoGrupoNome('')
                        }
                      }}
                      placeholder="Nome do novo grupo..." className="campo-cfg"
                      style={{ flex:1, fontSize:13, padding:'7px 10px', border:`1.5px solid ${COR.borda}`, borderRadius:7, outline:'none', fontFamily:'inherit', background:COR.branco, color:COR.texto }} />
                    <button onClick={() => {
                      const nome = novoGrupoNome.trim()
                      if (nome && !todosGrupos.includes(nome)) setGruposExtra(prev => [...prev, nome].sort())
                      setNovoGrupoNome('')
                    }} style={{ padding:'7px 16px', border:'none', borderRadius:7, background:COR.azul, color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                      Adicionar
                    </button>
                  </div>
                  <div style={{ fontSize:10, color:'#94a3b8', marginTop:6 }}>
                    O grupo ficará disponível ao cadastrar ou editar categorias.
                  </div>
                </div>
              </div>
            )}
          </div>
        )})()}

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
              <h3 style={{ fontSize:14, fontWeight:700, color:COR.texto, margin:'0 0 16px' }}>Planejamento</h3>

              {/* Sensibilidade da revisão por desvio */}
              <div style={{ marginBottom:16 }}>
                <label style={{ display:'block', fontSize:11, fontWeight:600, color:COR.textoSuave,
                  textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>
                  Sensibilidade — Revisão por Desvio
                </label>
                <div style={{ display:'flex', gap:6 }}>
                  {[5, 10, 15, 20].map(p => (
                    <button key={p} onClick={() => setDesvioMinPerc(p)}
                      style={{ flex:1, padding:'7px 0', fontFamily:'inherit', fontSize:12, fontWeight:500,
                        border:`1.5px solid ${desvioMinPerc === p ? '#2563eb' : COR.borda}`, borderRadius:7,
                        cursor:'pointer', background: desvioMinPerc === p ? '#eff6ff' : COR.branco,
                        color: desvioMinPerc === p ? '#2563eb' : COR.textoSuave }}>
                      {p}%
                    </button>
                  ))}
                </div>
                <div style={{ fontSize:10, color:'#94a3b8', marginTop:5 }}>
                  Categorias com desvio acima deste % entre previsto e realizado aparecem na revisão.
                </div>
              </div>

              <div style={{ height:1, background:COR.borda, margin:'0 0 16px' }} />

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