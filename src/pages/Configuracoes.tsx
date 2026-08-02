import { useState, useEffect, useRef } from 'react'
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AppHeader from '../components/AppHeader'
import PageHeader, { PH_BTN_SOLID } from '../components/PageHeader'
import BottomNav from '../components/BottomNav'
import TutorialCard, { reativarTutoriais } from '../components/TutorialCard'
import { useToast } from '../components/Toast'
import type { Conta, Categoria, TipoCategoria, TipoMovimento, FormaPagamentoCategoria, FormaPagamentoFatura } from '../context/AppContext'
import { CATEGORIAS_PADRAO, GRUPOS_PADRAO } from '../data/categoriasPadrao'

const COR = {
  azul: '#1a56db', azulEscuro: '#0f2878', azulMedio: '#2563eb',
  fundo: '#f0f4ff', branco: '#ffffff', texto: '#0f172a',
  textoSuave: '#64748b', borda: '#e2e8f0',
  verde: '#16a34a', vermelho: '#dc2626',
}

type Aba = 'home' | 'bancos' | 'cartoes' | 'categorias' | 'perfil' | 'preferencias'

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
const ICONES_CAT_ENTRADA = [
  '💰','💵','💼','📈','🏦','💹','🤑','🧾','🏠','🚗',
  '💎','📊','🏢','🎯','⭐','🏆','🔑','📥','🪙','💳',
  '🤝','📑','🎉','🌟','💡','🏗️','🛡️','🌱',
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

function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
}

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
      {/* Toggle ativo/inativo — pill switch */}
      <div onClick={e => { e.stopPropagation(); toggleAtiva(c.id) }}
        title={c.ativa ? 'Inativar' : 'Ativar'}
        style={{ cursor:'pointer', flexShrink:0, display:'flex', alignItems:'center', gap:6 }}>
        <div style={{
          width:40, height:22, borderRadius:11,
          background: c.ativa ? COR.verde : '#cbd5e1',
          position:'relative', transition:'background .2s',
          flexShrink:0 }}>
          <div style={{
            width:16, height:16, borderRadius:'50%', background:'#fff',
            position:'absolute', top:3,
            left: c.ativa ? 20 : 3,
            boxShadow:'0 1px 4px rgba(0,0,0,.25)',
            transition:'left .2s',
          }} />
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────
export default function Configuracoes() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const [mobileView, setMobileView] = useState<'list'|'form'>('list')
  const [aba,    setAba]    = useState<Aba>(() => {
    if (window.innerWidth < 640) return 'home'
    const p = new URLSearchParams(window.location.search).get('aba')
    if (p === 'grupos') return 'categorias'
    if (p && ['bancos','cartoes','categorias','perfil','preferencias'].includes(p)) return p as Aba
    return 'bancos'
  })
  const { user, contas, categorias, setContas, setCategorias,
          planos, planosReal,
          planejamentoLockado, setPlanejamentoLockado,
          desvioMinPerc, setDesvioMinPerc,
          perfil, setPerfil, excluirConta: excluirContaUsuario,
          setOnboardingCompleto } = useApp()
  const [formPerfil, setFormPerfil] = useState({ nome: perfil.nome, apelido: perfil.apelido })
  const [modalExcluirConta, setModalExcluirConta] = useState(false)
  const [confirmInput,      setConfirmInput]      = useState('')
  const [deletando,         setDeletando]         = useState(false)
  const [abaCat,      setAbaCat]      = useState<TipoCategoria>('saida')
  const [filtroAtiva, setFiltroAtiva] = useState<'ativas'|'inativas'|'todas'>('todas')
  const [subAbaCat,   setSubAbaCat]   = useState<'categorias'|'grupos'>(() =>
    new URLSearchParams(window.location.search).get('aba') === 'grupos' ? 'grupos' : 'categorias'
  )
  const [novoGrupoNome,  setNovoGrupoNome]  = useState('')
  const [novoGrupoTipo,  setNovoGrupoTipo]  = useState<TipoCategoria>('saida')
  const [editGrupo,      setEditGrupo]      = useState<string|null>(null)
  const [editGrupoNome,  setEditGrupoNome]  = useState('')
  const [editGrupoTipo,  setEditGrupoTipo]  = useState<TipoCategoria>('saida')
  const [gruposExtra,    setGruposExtra]    = useState<string[]>([])
  const [gruposOcultos,  setGruposOcultos]  = useState<string[]>([])
  const [gruposExtraTipos, setGruposExtraTipos] = useState<Record<string, TipoCategoria>>({})

  useEffect(() => {
    if (perfil.nome || perfil.apelido) {
      setFormPerfil({ nome: perfil.nome, apelido: perfil.apelido })
    }
  }, [perfil.nome, perfil.apelido])

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

  useEffect(() => {
    const abaParam = searchParams.get('aba')
    const acaoParam = searchParams.get('acao')
    if (!abaParam) return
    if (abaParam === 'bancos') {
      setAba('bancos')
      setMobileView(acaoParam === 'novo' ? 'form' : 'list')
      if (acaoParam === 'novo') novaConta('bancos')
    } else if (abaParam === 'cartoes') {
      setAba('cartoes')
      setMobileView(acaoParam === 'novo' ? 'form' : 'list')
      if (acaoParam === 'novo') novaConta('cartoes')
    } else if (abaParam === 'categorias') {
      setAba('categorias')
      setSubAbaCat('categorias')
      setMobileView('list')
    } else if (abaParam === 'grupos') {
      setAba('categorias')
      setSubAbaCat('grupos')
      setMobileView('list')
    } else if (abaParam === 'perfil') {
      setAba('perfil')
    } else if (abaParam === 'preferencias') {
      setAba('preferencias')
    }
    // URL mantida para que o sub-item ativo na sidebar reflita a aba atual
  }, [location.search]) // eslint-disable-line react-hooks/exhaustive-deps

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
  const grupoSelectRef = useRef<HTMLSelectElement>(null)

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
    setMobileView('form')
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
    setMobileView('list')
    novaConta()
  }
  function excluirConta(id: string) {
    if (!window.confirm('Excluir esta conta?')) return
    setContas(prev => prev.filter(c => c.id!==id))
    if (editContaId===id) novaConta()
    setMobileView('list')
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
  // moverConta preservada para futura reativação do reordenamento
  void (moverConta as unknown as null)

  // ── Ações Categoria ──
  function novaCategoria() {
    setFormCat({...catVazia, tipo:abaCat}); setEditCatId(null)
    setErroCat('')
    setTimeout(() => grupoSelectRef.current?.focus(), 0)
  }
  function editarCategoria(c: Categoria) {
    setMobileView('form')
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
      setMobileView('list')
    } else {
      setCategorias(prev => [...prev, {id:gerarId(),...formCat, ativa:true}])
      toast('Categoria criada')
      setMobileView('list')
    }
    novaCategoria()
  }
  function excluirCategoria(id: string) {
    if (!window.confirm('Excluir esta categoria?')) return
    setCategorias(prev => prev.filter(c => c.id!==id))
    if (editCatId===id) { setEditCatId(null); setFormCat({...catVazia, tipo:abaCat}) }
    setMobileView('list')
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
    border:'1.5px solid #e2e8f0', borderRadius:12,
    padding:'11px 14px', fontSize:14, outline:'none',
    background:'#fff', fontFamily:'inherit',
    color:COR.texto, width:'100%',
  }
  const labelSt: React.CSSProperties = {
    display:'block', fontSize:10, fontWeight:700,
    color:COR.azul, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:5,
  }

  const catsFiltradas = categorias
    .filter(c => c.tipo === abaCat)
    .filter(c => filtroAtiva === 'todas' ? true : filtroAtiva === 'ativas' ? c.ativa : !c.ativa)
    .sort((a,b) => a.nome.localeCompare(b.nome,'pt-BR'))

  const temSugestoesPendentes = CATEGORIAS_PADRAO.some(
    p => !categorias.some(c => c.nome.toLowerCase() === p.nome.toLowerCase())
  )

  const contasFiltradas = contas.filter(c => aba === 'bancos' ? c.tipo !== 'cartao' : c.tipo === 'cartao')
  const nenhumaConta = (aba === 'bancos' || aba === 'cartoes') && !isMobile && contasFiltradas.length === 0

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

      <AppHeader currentPath="/configuracoes" hideBottomTab />
      <BottomNav />

      {/* HOME SCREEN — apenas mobile (desktop usa sidebar para navegar) */}
      {isMobile && aba === 'home' && (
        <div style={{ flex:1, overflowY:'auto', padding: isMobile ? '24px 16px' : '40px 24px',
          display:'flex', flexDirection:'column', alignItems:'center' }}>
          <TutorialCard
            tela="configuracoes"
            icon="⚙️"
            title="Ajuste tudo do seu jeito"
            description="Aqui você gerencia seus bancos, cartões e categorias. Tudo que você configurou no início pode ser ajustado quando quiser."
            tips={[
              { icon: '🏦', text: 'Adicione novos bancos e cartões' },
              { icon: '🏷️', text: 'Ative ou desative categorias de gasto' },
              { icon: '⚙️', text: 'Personalize preferências como desvio de planejamento' },
            ]}
            buttonLabel="Explorar configurações →"
          />
          <h1 style={{ fontSize:22, fontWeight:800, color:COR.texto, marginBottom:28, textAlign:'center' }}>
            Configurações
          </h1>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, width:'100%', maxWidth:420 }}>
            {[
              { icon:'🏦', label:'Bancos',       fn: () => { setAba('bancos');     setMobileView('list'); novaConta('bancos') } },
              { icon:'💳', label:'Cartões',      fn: () => { setAba('cartoes');    setMobileView('list'); novaConta('cartoes') } },
              { icon:'🏷', label:'Categorias',   fn: () => { setAba('categorias'); setSubAbaCat('categorias'); setMobileView('list') } },
              { icon:'📁', label:'Grupos',       fn: () => { setAba('categorias'); setSubAbaCat('grupos');     setMobileView('list') } },
              { icon:'👤', label:'Perfil',       fn: () => setAba('perfil') },
              { icon:'⚙️', label:'Preferências', fn: () => setAba('preferencias') },
            ].map(card => (
              <button key={card.label} onClick={card.fn} style={{
                background:COR.branco, borderRadius:18, padding:'20px 10px 16px',
                display:'flex', flexDirection:'column', alignItems:'center', gap:10,
                border:`1px solid ${COR.borda}`, boxShadow:'0 2px 10px rgba(0,0,0,.06)',
                cursor:'pointer', fontFamily:'inherit', transition:'box-shadow .15s',
              }}>
                <span style={{ fontSize:30 }}>{card.icon}</span>
                <span style={{ fontSize:12, fontWeight:700, color:COR.texto }}>{card.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* BACK BAR — apenas mobile */}
      {isMobile && aba !== 'home' && (
        <div style={{ background:COR.branco, borderBottom:`1px solid ${COR.borda}`,
          padding:'10px 16px', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <button onClick={() => { setAba('home'); setMobileView('list') }} style={{
            border:'none', background:'transparent', color:COR.azul,
            fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit', padding:0 }}>
            ‹ Voltar
          </button>
          <span style={{ fontSize:14, fontWeight:700, color:COR.texto, marginLeft:4 }}>
            {aba === 'bancos' ? '🏦 Bancos'
              : aba === 'cartoes' ? '💳 Cartões'
              : aba === 'categorias' ? (subAbaCat === 'grupos' ? '📁 Grupos' : '🏷 Categorias')
              : aba === 'perfil' ? '👤 Perfil' : '⚙️ Preferências'}
          </span>
        </div>
      )}

      {/* Tutoriais por seção */}
      {aba === 'bancos' && <TutorialCard tela="config_bancos" icon="🏦" title="Seus bancos"
        description="Cadastre e gerencie suas contas bancárias. Cada conta que você adiciona aparece nos lançamentos."
        tips={[
          { icon: '➕', text: 'Adicione contas correntes e poupanças' },
          { icon: '✏️', text: 'Edite saldo, nome e ícone a qualquer momento' },
          { icon: '🎨', text: 'Personalize com cores para identificar rápido' },
        ]} buttonLabel="Gerenciar bancos →" />}

      {aba === 'cartoes' && <TutorialCard tela="config_cartoes" icon="💳" title="Seus cartões"
        description="Cadastre seus cartões de crédito para acompanhar faturas e controlar o uso do limite."
        tips={[
          { icon: '📅', text: 'Informe dia de vencimento para organizar seus pagamentos' },
          { icon: '💰', text: 'Defina o limite para acompanhar o uso' },
          { icon: '🏷️', text: 'Dê um apelido para identificar cada cartão' },
        ]} buttonLabel="Gerenciar cartões →" />}

      {aba === 'categorias' && <TutorialCard tela="config_categorias" icon="📁" title="Tipos de gasto"
        description="Categorias são os tipos de gasto do seu dia a dia — como Mercado, Conta de Luz, Uber. Organize do seu jeito."
        tips={[
          { icon: '✅', text: 'Ative ou desative categorias conforme sua necessidade' },
          { icon: '➕', text: 'Crie categorias personalizadas' },
          { icon: '📂', text: 'Organize em grupos para facilitar a visualização' },
        ]} buttonLabel="Ver categorias →" />}

      {aba === 'perfil' && <TutorialCard tela="config_perfil" icon="👤" title="Seus dados"
        description="Atualize seu nome, como quer ser chamado e outras informações da sua conta."
        tips={[
          { icon: '✏️', text: 'O apelido aparece na saudação do Início' },
          { icon: '🔒', text: 'Seu email está vinculado ao login' },
        ]} buttonLabel="Ver perfil →" />}

      {aba === 'preferencias' && <TutorialCard tela="config_preferencias" icon="⚙️" title="Personalize o app"
        description="Ajuste o Compass One do seu jeito — moeda, formato de números, alertas e tutoriais."
        tips={[
          { icon: '💱', text: 'Escolha moeda e formato de exibição' },
          { icon: '🔔', text: 'Configure alertas de saldo baixo' },
          { icon: '📚', text: 'Reative tutoriais quando quiser rever' },
        ]} buttonLabel="Ajustar preferências →" />}

      {/* CONTEÚDO */}
      {aba !== 'home' && (
      <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection: isMobile ? 'column' : 'row', padding: isMobile ? 12 : 20, gap:16 }}>

        {/* ══ ABA BANCOS / CARTÕES ══ */}
        {(aba==='bancos' || aba==='cartoes') && (<>
            <div style={{ flex:1, display: (isMobile && mobileView==='form') || nenhumaConta ? 'none' : 'flex', flexDirection:'column', minWidth:0 }}>
              <PageHeader
                icon={aba==='bancos' ? 'ti-building-bank' : 'ti-credit-card'}
                breadcrumb="CONTA"
                title={aba==='bancos' ? 'Minhas contas' : 'Meus cartões'}
                subtitle={(() => {
                  const n = contas.filter(c => aba==='bancos' ? c.tipo!=='cartao' : c.tipo==='cartao').length
                  return aba==='bancos'
                    ? `${n} conta${n!==1?'s':''} cadastrada${n!==1?'s':''}`
                    : `${n} cartão${n!==1?'ões':''} cadastrado${n!==1?'s':''}`
                })()}
                rightContent={
                  <button onClick={() => { novaConta(); if (isMobile) setMobileView('form') }} style={PH_BTN_SOLID}>
                    {aba==='bancos' ? '+ Nova conta' : '+ Novo cartão'}
                  </button>
                }
              />

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
                        {grupo.map((c) => (
                          <div key={c.id} style={{
                            background:COR.branco, border:`1px solid ${COR.borda}`,
                            borderRadius:12, padding:'14px 16px', cursor:'pointer',
                            display:'flex', alignItems:'center', gap:14,
                            borderLeft:`4px solid ${c.cor}`,
                            boxShadow: editContaId===c.id ? `0 0 0 2px ${COR.azul}` : '0 1px 4px rgba(0,0,0,.05)' }}>
                            <div style={{ width:48, height:48, borderRadius:14, background:c.cor+'22',
                              display:'flex', alignItems:'center', justifyContent:'center',
                              fontSize:22, flexShrink:0 }}>
                              {c.icone}
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:14, fontWeight:700, color:COR.texto }}>
                                {c.tipo==='cartao' ? (c.apelido || c.banco) : c.banco}
                              </div>
                              <div style={{ fontSize:12, color:COR.textoSuave, marginTop:1 }}>
                                {c.tipo==='cartao'
                                  ? `${c.banco}${c.apelido ? ` · ${c.apelido}` : ''}`
                                  : `${c.nome}${c.agencia ? ` · Ag ${c.agencia}` : ''}${c.numeroConta ? ` · CC ${c.numeroConta}` : ''}`}
                              </div>
                              <button onClick={() => editarConta(c)} style={{
                                marginTop:6, border:`1px solid ${COR.borda}`, borderRadius:7,
                                background:COR.branco, color:COR.azul, fontSize:11, fontWeight:600,
                                cursor:'pointer', padding:'3px 10px', fontFamily:'inherit' }}>
                                ✏ Editar
                              </button>
                            </div>
                            <div style={{ textAlign:'right', flexShrink:0 }}>
                              {c.tipo==='cartao' ? (
                                <>
                                  <div style={{ fontSize:13, fontWeight:600, color:COR.texto }}>
                                    {fmt(c.limiteCartao??0)}
                                  </div>
                                  <div style={{ fontSize:11, color:COR.textoSuave, marginTop:2 }}>
                                    Limite
                                  </div>
                                  <div style={{ fontSize:11, color:COR.textoSuave, marginTop:2 }}>
                                    Fecha {c.diaFechamento} · Vence {c.diaVencimento}
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
              style={{ width: isMobile ? '100%' : nenhumaConta ? 440 : 340,
                margin: nenhumaConta ? '0 auto' : undefined,
                flexShrink:0, background:COR.branco,
                border:`1px solid ${COR.borda}`, borderRadius:12,
                padding:20, overflowY:'auto',
                display: isMobile && mobileView==='list' ? 'none' : 'block' }}>
                {isMobile && (
                  <button onClick={() => setMobileView('list')} style={{
                    display:'flex', alignItems:'center', gap:4, marginBottom:14,
                    border:'none', background:'transparent', cursor:'pointer',
                    fontSize:13, color:COR.azul, fontFamily:'inherit', fontWeight:500, padding:0 }}>
                    ← Voltar
                  </button>
                )}
                <div style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'center', marginBottom:18 }}>
                  <h3 style={{ fontSize:14, fontWeight:700, color:COR.texto, margin:0 }}>
                    {editContaId
                      ? (aba==='cartoes' ? 'Editar cartão' : 'Editar conta')
                      : (aba==='cartoes' ? 'Novo cartão' : 'Nova conta')}
                  </h3>
                  {editContaId && (
                    <button onClick={() => { novaConta(); setMobileView('list') }} title="Cancelar edição" style={{
                      border:'none', background:'transparent',
                      cursor:'pointer', fontSize:18, color:COR.textoSuave }}>✕</button>
                  )}
                </div>

                {/* Preview — cartão azul (banco) ou preview cor (cartão de crédito) */}
                {formConta.tipo !== 'cartao' ? (
                  <div style={{ borderRadius:18, padding:'18px 20px', marginBottom:18,
                    background:`linear-gradient(135deg,${COR.azulEscuro},${COR.azulMedio})`,
                    color:'#fff', display:'flex', alignItems:'center', gap:14,
                    boxShadow:'0 6px 20px rgba(26,86,219,.30)' }}>
                    <div style={{ width:52, height:52, borderRadius:14, background:'rgba(255,255,255,.15)',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0 }}>
                      {formConta.icone}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:15, fontWeight:800, opacity:.95 }}>
                        {formConta.nome || 'Titular'}
                      </div>
                      <div style={{ fontSize:12, opacity:.75, marginTop:2 }}>
                        {formConta.banco || 'Banco'}
                      </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:16, fontWeight:800 }}>
                        {fmt(formConta.saldoInicial || 0)}
                      </div>
                      <div style={{ fontSize:10, opacity:.7, marginTop:2 }}>Saldo inicial</div>
                    </div>
                    {editContaId && (
                      <button
                        onClick={() => setFormConta(prev => ({ ...prev, preferida: !prev.preferida }))}
                        title={formConta.preferida ? 'Remover como preferida' : 'Marcar como preferida'}
                        style={{ background:'none', border:'none', cursor:'pointer', padding:0,
                          fontSize:22, lineHeight:1, alignSelf:'flex-start',
                          color: formConta.preferida ? '#fbbf24' : 'rgba(255,255,255,.4)' }}>
                        ★
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ borderRadius:18, padding:'18px 20px', marginBottom:18,
                    background:`linear-gradient(135deg,${formConta.cor},${formConta.cor}cc)`,
                    color:'#fff', display:'flex', alignItems:'center', gap:14,
                    boxShadow:`0 6px 20px ${formConta.cor}55` }}>
                    <div style={{ width:52, height:52, borderRadius:14, background:'rgba(255,255,255,.15)',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0 }}>
                      {formConta.icone}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:800, opacity:.95 }}>
                        {formConta.apelido || formConta.banco || 'Cartão'}
                      </div>
                      <div style={{ fontSize:12, opacity:.75, marginTop:2 }}>
                        {formConta.banco || 'Banco'}
                        {formConta.diaFechamento ? ` · Fecha dia ${formConta.diaFechamento}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:14, fontWeight:800 }}>
                        {fmt(formConta.limiteCartao ?? 0)}
                      </div>
                      <div style={{ fontSize:10, opacity:.7, marginTop:2 }}>Limite</div>
                    </div>
                  </div>
                )}

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
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                        <div>
                          <label style={labelSt}>Dia fechamento</label>
                          <input type="number" min="1" max="31"
                            value={formConta.diaFechamento||''}
                            onChange={e => setFormConta(p=>({...p, diaFechamento:parseInt(e.target.value)||undefined}))}
                            placeholder="Ex: 10" className="campo-cfg" style={inputSt} />
                          <div style={{ fontSize:10, color:'#94a3b8', marginTop:4 }}>
                            Não sabe? Verifique no app do banco ou deixe em branco.
                          </div>
                        </div>
                        <div>
                          <label style={labelSt}>Dia vencimento</label>
                          <input type="number" min="1" max="31"
                            value={formConta.diaVencimento||''}
                            onChange={e => setFormConta(p=>({...p, diaVencimento:parseInt(e.target.value)||undefined}))}
                            placeholder="Ex: 17" className="campo-cfg" style={inputSt} />
                        </div>
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
                        <label style={labelSt}>Nome da conta</label>
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
                        <label style={labelSt}>Saldo atual</label>
                        <input value={saldoStr}
                          onChange={e => {
                            const raw = e.target.value.replace(/[^0-9.,]/g, '')
                            setSaldoStr(raw)
                            setFormConta(p=>({...p, saldoInicial:parseFloat(raw.replace(',','.'))||0}))
                          }}
                          placeholder="R$ 0,00" className="campo-cfg" style={inputSt} />
                        <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>
                          Pode ser um valor aproximado — você ajusta depois.
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
          </>)}

        {/* ══ ABA CATEGORIAS ══ */}
        {aba==='categorias' && (() => {
          const gruposCustom = Array.from(new Set([
            ...gruposExtra,
            ...categorias.map(c => c.grupo).filter((g): g is string => !!g && !GRUPOS_PADRAO.includes(g)),
          ])).sort()
          const todosGrupos = [...GRUPOS_PADRAO.filter(g => !gruposOcultos.includes(g)), ...gruposCustom].sort((a,b) => a.localeCompare(b,'pt-BR'))
          const gruposParaTipo = todosGrupos.filter(g =>
            g !== 'Cartão de Crédito' && (
              !categorias.some(c => c.grupo === g && c.ativa) ||
              categorias.some(c => c.grupo === g && c.tipo === formCat.tipo && c.ativa)
            )
          )
          return (
          <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden' }}>
            {subAbaCat === 'categorias' && (
            <div style={{ flex:1, display:'flex', flexDirection: isMobile ? 'column' : 'row', gap:16, minWidth:0, overflow: isMobile ? 'visible' : 'hidden' }}>
            <div style={{ flex:1, display: isMobile && mobileView==='form' ? 'none' : 'flex', flexDirection:'column', minWidth:0 }}>
              <PageHeader
                icon="ti-category"
                breadcrumb="CONTA"
                title="Categorias"
                subtitle={`${categorias.filter(c=>c.ativa).length} ativas de ${categorias.length}`}
                rightContent={
                  <>
                    {temSugestoesPendentes && !isMobile && (
                      <button onClick={importarSugestoes} style={{
                        background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none',
                        borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 500,
                        cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                      }}>✨ Sugestões</button>
                    )}
                    <button onClick={() => { novaCategoria(); if (isMobile) setMobileView('form') }} style={PH_BTN_SOLID}>
                      + Nova categoria
                    </button>
                  </>
                }
              />

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
              style={{ width: isMobile ? '100%' : 340, flexShrink:0, background:COR.branco,
                border:`1px solid ${COR.borda}`, borderRadius:12,
                padding:20, overflowY:'auto',
                display: isMobile && mobileView==='list' ? 'none' : 'block' }}>
                {isMobile && (
                  <button onClick={() => setMobileView('list')} style={{
                    display:'flex', alignItems:'center', gap:4, marginBottom:14,
                    border:'none', background:'transparent', cursor:'pointer',
                    fontSize:13, color:COR.azul, fontFamily:'inherit', fontWeight:500, padding:0 }}>
                    ← Voltar
                  </button>
                )}
                <div style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'center', marginBottom:18 }}>
                  <h3 style={{ fontSize:14, fontWeight:700, color:COR.texto, margin:0 }}>
                    {editCatId ? 'Editar categoria' : 'Nova categoria'}
                  </h3>
                  {editCatId && (
                    <button onClick={() => { novaCategoria(); setMobileView('list') }} title="Cancelar edição" style={{
                      border:'none', background:'transparent',
                      cursor:'pointer', fontSize:18, color:COR.textoSuave }}>✕</button>
                  )}
                </div>

                {/* Preview card */}
                <div style={{ background:'#fff', borderRadius:18, padding:16,
                  boxShadow:'0 2px 12px rgba(0,0,0,.08)', marginBottom:18,
                  display:'flex', alignItems:'center', gap:14, border:`1px solid ${COR.borda}` }}>
                  <div style={{ width:52, height:52, borderRadius:16, background:formCat.cor,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:24, flexShrink:0 }}>
                    {formCat.icone}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:COR.texto }}>
                      {formCat.nome || 'Nome da categoria'}
                    </div>
                    <div style={{ display:'flex', gap:5, marginTop:6, flexWrap:'wrap' }}>
                      <span style={{ fontSize:10, padding:'2px 8px', borderRadius:4, fontWeight:700,
                        background: formCat.tipo === 'entrada' ? '#dcfce7' : '#fee2e2',
                        color: formCat.tipo === 'entrada' ? COR.verde : COR.vermelho }}>
                        {formCat.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}
                      </span>
                      <span style={{ fontSize:10, padding:'2px 8px', borderRadius:4, fontWeight:700,
                        background: formCat.fixa ? '#fef9c3' : '#f1f5f9',
                        color: formCat.fixa ? '#92400e' : '#64748b' }}>
                        {formCat.fixa ? 'Fixa' : 'Variável'}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  {/* Movimentação — primeiro campo */}
                  <div>
                    <label style={labelSt}>Movimentação</label>
                    <div style={{ display:'flex', gap:6 }}>
                      {([['entrada','↑ Entrada'],['saida','↓ Saída']] as const).map(([v,l], i) => (
                        <button key={v}
                          ref={el => { tipoCatRefs.current[i] = el }}
                          tabIndex={formCat.tipo===v ? 0 : -1}
                          onClick={() => setFormCat(p=>({
                            ...p, tipo:v, grupo:undefined,
                            icone: v==='entrada' ? ICONES_CAT_ENTRADA[0] : ICONES_CAT[0],
                            tipoMovimento: v==='entrada' && p.tipoMovimento==='cartao' ? 'banco' : p.tipoMovimento,
                            formaPagamento: v==='entrada'
                              ? (p.tipoMovimento==='dinheiro' ? undefined : 'pix')
                              : p.formaPagamento,
                          }))}
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

                  {/* Grupo — filtrado pela movimentação selecionada */}
                  <div>
                    <label style={labelSt}>Grupo</label>
                    <select
                      ref={grupoSelectRef}
                      value={formCat.grupo && !gruposParaTipo.includes(formCat.grupo) ? '__outro__' : (formCat.grupo ?? '')}
                      onChange={e => {
                        if (e.target.value === '__outro__') setFormCat(p=>({...p, grupo:''}))
                        else setFormCat(p=>({...p, grupo: e.target.value || undefined}))
                      }}
                      className="campo-cfg" style={{...inputSt, cursor:'pointer'}}>
                      <option value="">Selecione um grupo...</option>
                      {gruposParaTipo.map(g => <option key={g} value={g}>{g}</option>)}
                      <option value="__outro__">Outro...</option>
                    </select>
                    {formCat.grupo != null && !gruposParaTipo.includes(formCat.grupo) && (
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
                    <label style={labelSt}>Variante</label>
                    <input value={(formCat as any).descricao||''}
                      onChange={e => setFormCat(p=>({...p, descricao:e.target.value||undefined}))}
                      placeholder="Ex: Banco, Prefeitura, Fitway..."
                      className="campo-cfg" style={inputSt} />
                    <div style={{ fontSize:10, color:'#94a3b8', marginTop:4 }}>
                      Diferencia categorias de mesmo nome. Aparece nos chips de seleção no lançamento.
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

                  {/* Lançamentos */}
                  {(() => {
                    const tiposVisiveis = formCat.tipo === 'entrada'
                      ? TIPOS_MOVIMENTO.filter(t => t.id !== 'cartao')
                      : TIPOS_MOVIMENTO
                    return (
                    <div>
                      <label style={labelSt}>Lançamentos</label>
                      <div style={{ display:'flex', gap:6 }}>
                        {tiposVisiveis.map((t, i) => (
                          <button key={t.id}
                            ref={el => { tipoMovRefs.current[i] = el }}
                            tabIndex={formCat.tipoMovimento===t.id ? 0 : -1}
                            onClick={() => setFormCat(p=>({
                              ...p, tipoMovimento:t.id,
                              formaPagamento: t.id==='dinheiro' ? undefined
                                : t.id==='cartao' ? 'avista'
                                : p.tipo==='entrada' ? 'pix' : 'automatico',
                              contaDebitoId: undefined,
                            }))}
                            onKeyDown={e => {
                              const total = tiposVisiveis.length
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
                        {formCat.tipoMovimento === 'banco'    && (formCat.tipo==='entrada'
                          ? 'Receitas creditadas na conta bancária (PIX, transferência).'
                          : 'Gastos debitados diretamente na conta bancária (débito, Pix, boleto).')}
                        {formCat.tipoMovimento === 'cartao'   && 'Gastos pagos com cartão de crédito — aparecem na fatura do cartão.'}
                        {formCat.tipoMovimento === 'dinheiro' && (formCat.tipo==='entrada'
                          ? 'Receitas recebidas em espécie — aparecem no extrato de dinheiro em carteira.'
                          : 'Gastos pagos em espécie — aparecem no extrato de dinheiro em carteira.')}
                      </p>
                    </div>
                    )
                  })()}

                  {/* Forma de pagamento — só para banco */}
                  {formCat.tipoMovimento==='banco' && (
                    <div>
                      <label style={labelSt}>Forma de lançamento</label>
                      {(() => {
                        const formasVisiveis = formCat.tipo==='entrada'
                          ? FORMAS_PAG_BANCO.filter(f => f.id==='pix' || f.id==='transferencia')
                          : FORMAS_PAG_BANCO
                        return (
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                          {formasVisiveis.map((f, i) => (
                            <button key={f.id}
                              ref={el => { formaPagCatRefs.current[i] = el }}
                              tabIndex={formCat.formaPagamento===f.id ? 0 : -1}
                              onClick={() => setFormCat(p=>({
                                ...p, formaPagamento:f.id,
                                contaDebitoId: f.id === 'automatico' ? p.contaDebitoId : undefined,
                              }))}
                              onKeyDown={e => {
                                const total = formasVisiveis.length
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
                        )
                      })()}
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

                  <div>
                    <label style={labelSt}>Ícone</label>
                    <IconPicker icones={formCat.tipo==='entrada' ? ICONES_CAT_ENTRADA : ICONES_CAT} valor={formCat.icone}
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
              <div style={{ flex:1, display:'flex', flexDirection: isMobile ? 'column' : 'row', gap:16, minWidth:0, overflow: isMobile ? 'visible' : 'hidden' }}>
                {/* Lista de grupos */}
                <div style={{ flex:1, overflowY:'auto', display: isMobile && mobileView==='form' ? 'none' : 'flex', flexDirection:'column', gap:6 }}>
                  <PageHeader
                    icon="ti-folders"
                    breadcrumb="CONTA"
                    title="Grupos"
                    subtitle={`${todosGrupos.filter(g => g !== 'Cartão de Crédito').length} grupos`}
                    rightContent={
                      <button onClick={() => { setEditGrupo(null); setNovoGrupoNome(''); if (isMobile) setMobileView('form') }} style={PH_BTN_SOLID}>
                        + Novo grupo
                      </button>
                    }
                  />
                  {todosGrupos.filter(g => g !== 'Cartão de Crédito').map(g => {
                    const count = categorias.filter(c => c.grupo === g).length
                    const isPadrao = GRUPOS_PADRAO.includes(g)
                    const tipoG: TipoCategoria = gruposExtraTipos[g]
                      ?? (categorias.some(c => c.grupo === g && c.tipo === 'entrada') ? 'entrada' : 'saida')
                    const selecionado = editGrupo === g
                    return (
                      <div key={g}
                        onClick={() => { setEditGrupo(g); setEditGrupoNome(g); setEditGrupoTipo(tipoG); setMobileView('form') }}
                        style={{
                          background: selecionado ? '#eff6ff' : COR.branco,
                          border: `1.5px solid ${selecionado ? COR.azul : COR.borda}`,
                          borderRadius:10, padding:'10px 14px',
                          display:'flex', alignItems:'center', gap:10, cursor:'pointer',
                        }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:COR.texto }}>{g}</div>
                          <div style={{ fontSize:10, color: tipoG==='entrada' ? COR.verde : COR.vermelho, marginTop:1, fontWeight:500 }}>
                            {tipoG === 'entrada' ? '↑ Entrada' : '↓ Saída'}
                          </div>
                        </div>
                        <span style={{ fontSize:11, color:COR.textoSuave, background:'#f1f5f9', padding:'2px 8px', borderRadius:10, flexShrink:0 }}>
                          {count} {count === 1 ? 'categoria' : 'categorias'}
                        </span>
                        {!isPadrao && (
                          <button onClick={e => {
                            e.stopPropagation()
                            const msg = count > 0
                              ? `Remover grupo "${g}"? As ${count} categorias ficarão sem grupo.`
                              : `Remover grupo "${g}"?`
                            if (window.confirm(msg)) {
                              setCategorias(prev => prev.map(c => c.grupo === g ? {...c, grupo:undefined} : c))
                              setGruposExtra(prev => prev.filter(x => x !== g))
                              setGruposExtraTipos(prev => { const n={...prev}; delete n[g]; return n })
                              if (editGrupo === g) setEditGrupo(null)
                            }
                          }} title="Excluir" style={{
                            border:'none', background:'transparent', cursor:'pointer',
                            fontSize:14, color:COR.vermelho, padding:'2px 4px', flexShrink:0 }}>✕</button>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Formulário de grupo */}
                <div style={{ width: isMobile ? '100%' : 300, flexShrink:0, background:COR.branco,
                  border:`1px solid ${COR.borda}`, borderRadius:12,
                  padding:20, overflowY:'auto',
                  display: isMobile && mobileView==='list' ? 'none' : 'block' }}>
                  {isMobile && (
                    <button onClick={() => { setEditGrupo(null); setMobileView('list') }} style={{
                      display:'flex', alignItems:'center', gap:4, marginBottom:14,
                      border:'none', background:'transparent', cursor:'pointer',
                      fontSize:13, color:COR.azul, fontFamily:'inherit', fontWeight:500, padding:0 }}>
                      ← Voltar
                    </button>
                  )}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
                    <h3 style={{ fontSize:14, fontWeight:700, color:COR.texto, margin:0 }}>
                      {editGrupo ? 'Editar grupo' : 'Novo grupo'}
                    </h3>
                    {editGrupo && (
                      <button onClick={() => { setEditGrupo(null); setMobileView('list') }} title="Cancelar" style={{
                        border:'none', background:'transparent', cursor:'pointer', fontSize:18, color:COR.textoSuave }}>✕</button>
                    )}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                    <div>
                      <label style={labelSt}>Movimentação</label>
                      <div style={{ display:'flex', gap:6 }}>
                        {([['entrada','↑ Entrada'],['saida','↓ Saída']] as const).map(([v,l]) => {
                          const cur = editGrupo ? editGrupoTipo : novoGrupoTipo
                          const set = editGrupo ? setEditGrupoTipo : setNovoGrupoTipo
                          return (
                            <button key={v} onClick={() => set(v as TipoCategoria)} style={{
                              flex:1, padding:'7px 0', fontFamily:'inherit',
                              border:`1.5px solid ${cur===v ? (v==='entrada' ? COR.verde : COR.vermelho) : COR.borda}`,
                              borderRadius:7, cursor:'pointer', fontSize:12, fontWeight:500,
                              background: cur===v ? (v==='entrada' ? '#f0fdf4' : '#fff1f2') : COR.branco,
                              color: cur===v ? (v==='entrada' ? COR.verde : COR.vermelho) : COR.textoSuave }}>
                              {l}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div>
                      <label style={labelSt}>Nome do grupo</label>
                      <input
                        value={editGrupo ? editGrupoNome : novoGrupoNome}
                        onChange={e => editGrupo ? setEditGrupoNome(e.target.value) : setNovoGrupoNome(e.target.value)}
                        placeholder="Ex: Moradia, Transporte..."
                        className="campo-cfg" style={inputSt} />
                    </div>
                    <div style={{ display:'flex', gap:8, marginTop:4 }}>
                      {editGrupo && (
                        <button onClick={() => setEditGrupo(null)} style={{
                          flex:1, padding:'10px 0', border:`1.5px solid ${COR.borda}`,
                          borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500,
                          background:COR.branco, color:COR.textoSuave, fontFamily:'inherit' }}>
                          Cancelar
                        </button>
                      )}
                      <button onClick={() => {
                        if (editGrupo) {
                          const nome = editGrupoNome.trim()
                          if (!nome) return
                          if (nome !== editGrupo) {
                            setCategorias(prev => prev.map(c => c.grupo === editGrupo ? {...c, grupo:nome} : c))
                            const isPadrao = GRUPOS_PADRAO.includes(editGrupo)
                            if (isPadrao) {
                              setGruposOcultos(prev => [...prev, editGrupo])
                              if (!GRUPOS_PADRAO.includes(nome)) setGruposExtra(prev => [...prev, nome].sort())
                            } else {
                              setGruposExtra(prev => prev.map(x => x === editGrupo ? nome : x))
                            }
                            setGruposExtraTipos(prev => { const n={...prev}; if(prev[editGrupo]) n[nome]=prev[editGrupo]; delete n[editGrupo]; return n })
                          }
                          setGruposExtraTipos(prev => ({...prev, [nome||editGrupo]: editGrupoTipo}))
                          setEditGrupo(null)
                          setMobileView('list')
                        } else {
                          const nome = novoGrupoNome.trim()
                          if (!nome || todosGrupos.includes(nome)) return
                          setGruposExtra(prev => [...prev, nome].sort())
                          setGruposExtraTipos(prev => ({...prev, [nome]: novoGrupoTipo}))
                          setNovoGrupoNome('')
                          setMobileView('list')
                        }
                      }} style={{
                        flex:2, padding:'10px 0', border:'none', borderRadius:8,
                        background:`linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,
                        color:'#fff', fontSize:13, fontWeight:600,
                        cursor:'pointer', fontFamily:'inherit' }}>
                        {editGrupo ? 'Salvar alterações' : 'Adicionar grupo'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )})()}

        {/* ══ ABA PERFIL ══ */}
        {aba==='perfil' && (
          <div style={{ flex:1, overflowY:'auto' }}>
          <div style={{ display:'flex', justifyContent:'center', padding:'0 0 28px' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:14, width:'100%', maxWidth:500 }}>

            <PageHeader
              icon="ti-user"
              breadcrumb="CONTA"
              title="Perfil"
              subtitle={user?.email ?? ''}
            />

            {/* Dados pessoais */}
            <div style={{ background:COR.branco, border:`1px solid ${COR.borda}`, borderRadius:14, padding:28 }}>

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
                  <input value={formPerfil.nome}
                    onChange={e => setFormPerfil(p => ({ ...p, nome: e.target.value }))}
                    placeholder="Seu nome completo" className="campo-cfg" style={inputSt} />
                </div>
                <div>
                  <label style={labelSt}>Como prefere ser chamado</label>
                  <input value={formPerfil.apelido}
                    onChange={e => setFormPerfil(p => ({ ...p, apelido: e.target.value }))}
                    placeholder="Ex: Gui, Guilherme, Pri..." className="campo-cfg" style={inputSt} />
                  <div style={{ fontSize:10, color:'#94a3b8', marginTop:3 }}>
                    Este nome aparece na saudação do Início.
                  </div>
                </div>
                <div style={{ opacity:.6 }}>
                  <label style={labelSt}>E-mail</label>
                  <input disabled value={user?.email ?? 'seu@email.com'}
                    style={{ ...inputSt, cursor:'not-allowed', background:'#f8fafc' }} />
                  <div style={{ fontSize:10, color:'#94a3b8', marginTop:4 }}>
                    Vinculado à sua conta de login. Não editável aqui.
                  </div>
                </div>
                <button
                  onClick={() => { setPerfil({ nome: formPerfil.nome.trim(), apelido: formPerfil.apelido.trim() }); toast('Perfil salvo!') }}
                  style={{ padding:'10px 0', border:'none', borderRadius:8,
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

            {/* Zona de perigo */}
            <div style={{ background:'#fff5f5', border:'1.5px solid #fecaca', borderRadius:14, padding:24 }}>
              <h3 style={{ fontSize:14, fontWeight:700, color:COR.vermelho, margin:'0 0 8px' }}>
                Zona de perigo
              </h3>
              <p style={{ fontSize:12, color:COR.textoSuave, margin:'0 0 16px', lineHeight:1.6 }}>
                Ao excluir a conta, todos os seus dados — contas, categorias, extratos e planejamentos — serão permanentemente removidos. Esta ação não pode ser desfeita.
              </p>
              <button
                onClick={() => { setModalExcluirConta(true); setConfirmInput('') }}
                style={{ padding:'9px 20px', border:`1.5px solid ${COR.vermelho}`, borderRadius:8,
                  background:'transparent', color:COR.vermelho, fontSize:13, fontWeight:600,
                  cursor:'pointer', fontFamily:'inherit' }}>
                Excluir minha conta
              </button>
            </div>

          </div>
          </div>
          </div>
        )}

        {/* ══ ABA PREFERÊNCIAS ══ */}
        {aba==='preferencias' && (
          <div style={{ flex:1, overflowY:'auto' }}>
          <div style={{ display:'flex', justifyContent:'center', padding:'0 0 28px' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:14, width:'100%', maxWidth:500 }}>

            <PageHeader
              icon="ti-adjustments"
              breadcrumb="CONTA"
              title="Preferências"
              subtitle="Personalize o app"
            />

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

              <div style={{ height:1, background:COR.borda, margin:'16px 0' }} />

              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'12px 14px', borderRadius:9, background:'#fff5f5',
                border:'1px solid #fecaca' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:COR.texto }}>🔄 Refazer planejamento</div>
                  <div style={{ fontSize:11, color:COR.textoSuave, marginTop:2 }}>
                    Apaga o plano de {new Date().getFullYear()} e abre o assistente do zero.
                  </div>
                </div>
                <button onClick={() => navigate('/wizard-planejamento', { state: { refazer: true } })} style={{
                  padding:'7px 14px', border:'none', borderRadius:7, cursor:'pointer',
                  fontFamily:'inherit', fontSize:12, fontWeight:600, flexShrink:0,
                  background:'#dc2626', color:'#fff' }}>
                  Refazer
                </button>
              </div>
            </div>

            {/* Card: Tutoriais */}
            <div style={{ background:COR.branco, border:`1px solid ${COR.borda}`, borderRadius:14, padding:24 }}>
              <h3 style={{ fontSize:14, fontWeight:700, color:COR.texto, margin:'0 0 16px' }}>Tutoriais</h3>

              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'12px 14px', borderRadius:9, background:'#f0f9ff',
                border:'1px solid #bae6fd', marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:COR.texto }}>💡 Reativar tutoriais das telas</div>
                  <div style={{ fontSize:11, color:COR.textoSuave, marginTop:2 }}>
                    Faz os cards de dica aparecerem novamente em cada tela.
                  </div>
                </div>
                <button onClick={() => { reativarTutoriais(); toast('Tutoriais reativados!') }} style={{
                  padding:'7px 14px', border:'none', borderRadius:7, cursor:'pointer',
                  fontFamily:'inherit', fontSize:12, fontWeight:600, flexShrink:0,
                  background:'#0284c7', color:'#fff' }}>
                  Reativar
                </button>
              </div>

              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'12px 14px', borderRadius:9, background:'#f8faff',
                border:`1px solid ${COR.borda}` }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:COR.texto }}>🧭 Rever boas-vindas</div>
                  <div style={{ fontSize:11, color:COR.textoSuave, marginTop:2 }}>
                    Volta à tela de introdução com os slides iniciais.
                  </div>
                </div>
                <button onClick={() => { setOnboardingCompleto(false); toast('Boas-vindas reativadas!') }} style={{
                  padding:'7px 14px', border:'none', borderRadius:7, cursor:'pointer',
                  fontFamily:'inherit', fontSize:12, fontWeight:600, flexShrink:0,
                  background:COR.azul, color:'#fff' }}>
                  Rever
                </button>
              </div>
            </div>

          </div>
          </div>
          </div>
        )}

      </div>
      )}

      {/* Modal confirmação de exclusão de conta */}
      {modalExcluirConta && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)',
          zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:COR.branco, borderRadius:16, padding:28,
            maxWidth:420, width:'100%', boxShadow:'0 8px 40px rgba(0,0,0,.2)' }}>
            <h3 style={{ fontSize:16, fontWeight:700, color:COR.vermelho, margin:'0 0 10px' }}>
              Excluir conta permanentemente
            </h3>
            <p style={{ fontSize:13, color:COR.textoSuave, margin:'0 0 18px', lineHeight:1.6 }}>
              Esta ação é <strong>irreversível</strong>. Todos os seus dados serão apagados e não poderão ser recuperados.<br /><br />
              Para confirmar, digite <strong style={{ color:COR.texto }}>EXCLUIR</strong> no campo abaixo:
            </p>
            <input
              autoFocus
              value={confirmInput}
              onChange={e => setConfirmInput(e.target.value)}
              placeholder="EXCLUIR"
              style={{ width:'100%', padding:'10px 12px', borderRadius:8, boxSizing:'border-box',
                border:`1.5px solid ${confirmInput === 'EXCLUIR' ? COR.vermelho : COR.borda}`,
                fontSize:14, fontFamily:'inherit', outline:'none', letterSpacing:.5 }} />
            <div style={{ display:'flex', gap:10, marginTop:18 }}>
              <button
                onClick={() => setModalExcluirConta(false)}
                disabled={deletando}
                style={{ flex:1, padding:'10px 0', border:`1px solid ${COR.borda}`, borderRadius:8,
                  background:COR.branco, color:COR.texto, fontSize:13, fontWeight:600,
                  cursor:'pointer', fontFamily:'inherit', opacity: deletando ? .5 : 1 }}>
                Cancelar
              </button>
              <button
                disabled={confirmInput !== 'EXCLUIR' || deletando}
                onClick={async () => {
                  setDeletando(true)
                  const { error } = await excluirContaUsuario()
                  if (error) {
                    toast('Erro ao excluir: ' + error)
                    setDeletando(false)
                  }
                }}
                style={{ flex:1, padding:'10px 0', border:'none', borderRadius:8,
                  background: confirmInput === 'EXCLUIR' && !deletando ? COR.vermelho : '#fca5a5',
                  color:'#fff', fontSize:13, fontWeight:600, fontFamily:'inherit',
                  cursor: confirmInput === 'EXCLUIR' && !deletando ? 'pointer' : 'not-allowed',
                  transition:'background .2s' }}>
                {deletando ? 'Excluindo...' : 'Excluir conta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}