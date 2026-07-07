import { useApp } from '../context/AppContext'
import type { PlanoAnoData } from '../context/AppContext'
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { iconeCategoria } from '../utils/categoriaIcone'

const COR = {
  azul: '#1a56db', azulEscuro: '#0f2878', azulMedio: '#2563eb',
  fundo: '#f0f4ff', branco: '#ffffff', texto: '#0f172a',
  textoSuave: '#64748b', borda: '#e2e8f0',
  verde: '#16a34a', vermelho: '#dc2626',
  limp: '#ffffff', listrado: '#edf1fb',
}

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const COL_CAT = 210
const COL_MES = 112

const BADGE_MOV: Record<string, { label: string; bg: string; cor: string }> = {
  banco:    { label: 'B', bg: '#eff6ff', cor: '#1a56db' },
  cartao:   { label: 'C', bg: '#f3e8ff', cor: '#7c3aed' },
  dinheiro: { label: 'D', bg: '#f0fdf4', cor: '#16a34a' },
}

type Cat     = { nome: string; t?: string; v: number[] }
type AnoData = { saldoInicialJan: number; entradas: Cat[]; saidas: Cat[] }
type Editando = { tipo: 'e'|'s'; row: number; col: number } | null
type HoverCat = { tipo: 'e'|'s'; ri: number } | null

const ENTRADAS_BASE: Cat[] = [
  { nome:'Clientes a Receber',   v:[0,0,0,918,3266,3399.11,3382.11,3671.15,3671.15,3671.15,3671.15,3671.15] },
  { nome:'Salário Pri',          v:[7438.36,5900,10530,10530,11548,11548,11548,11548,11548,11548,11548,11548] },
  { nome:'Salário Gui',          v:[0,0,425,0,0,0,0,0,0,0,0,0] },
  { nome:'13º Salário / Férias', v:[0,0,0,0,0,0,0,0,0,0,5774,5774] },
  { nome:'Outros',               v:[909.41,1655.69,1651.39,1368.46,256,224.32,54.07,54.07,54.07,54.07,54.07,54.07] },
]

const SAIDAS_BASE: Cat[] = [
  { nome:'Cartão de Crédito', t:'D', v:[13492.58,13745.14,10681.83,9018.61,10445.43,8059.75,9500.33,9057.13,8103.68,7800.42,7682.77,7349.64] },
  { nome:'AABB',              t:'D', v:[120,120,120,120,120,120,120,120,120,120,120,120] },
  { nome:'Academia',          t:'C', v:[185.8,185.8,185.8,185.8,185.8,185.8,185.8,0,0,0,0,0] },
  { nome:'Água',              t:'D', v:[109.99,189,174.18,159.69,145.20,145.20,135,135,135,135,135,135] },
  { nome:'Alimentação Pri',   t:'C', v:[266.39,78.03,150.24,109.35,262.8,150,300,300,300,300,300,300] },
  { nome:'Aluguel',           t:'D', v:[0,0,0,0,0,140,89.08,515.47,515.47,515.47,645,645] },
  { nome:'Celular',           t:'D', v:[149.97,133.23,133.23,133.23,133.23,133.23,133.23,133.23,133.23,133.23,133.23,133.23] },
  { nome:'Combustível',       t:'C', v:[1350.53,400,1109.40,719.73,1300,1039.33,1300,1300,1300,1300,1300,1300] },
  { nome:'Consórcio',         t:'C', v:[460.94,460.94,460.94,460.94,460.94,460.94,460.94,460.94,460.94,460.94,460.94,460.94] },
  { nome:'Cotas Sicredi',     t:'D', v:[0,25,0,25,25,50,25,25,25,25,25,25] },
  { nome:'Cuidados Pessoais', t:'D', v:[308,368.45,150,70,367.97,400,250,250,250,250,250,250] },
  { nome:'Cursos',            t:'C', v:[717.09,220.09,290.09,640.14,640.14,272.14,332.14,471.14,471.14,471.14,272.14,234.89] },
  { nome:'Escolinha',         t:'D', v:[0,0,0,0,0,0,0,0,0,0,0,0] },
  { nome:'Igreja',            t:'D', v:[50,50,50,50,50,50,50,50,50,50,50,50] },
  { nome:'Imposto de Renda',  t:'D', v:[0,0,0,0,800.29,0,0,0,0,0,0,0] },
  { nome:'Internet',          t:'D', v:[99.9,99.9,99.9,100,100,100,100,100,100,100,100,100] },
  { nome:'IPTU',              t:'D', v:[0,0,891.37,0,0,0,0,0,0,0,0,0] },
  { nome:'IPVA',              t:'D', v:[0,382.93,382.93,532.31,0,0,330,330,330,0,0,0] },
  { nome:'Lazer',             t:'C', v:[448.44,948.86,370.67,75.70,145.70,75.70,591.04,300,300,300,300,300] },
  { nome:'Luz',               t:'D', v:[329.8,460.16,400.08,402.22,415,320,292.5,350,350,350,350,350] },
  { nome:'Mãe',               t:'C', v:[1554.41,1554.39,1554.39,1161.73,582.08,505.04,555.92,129.53,129.53,129.53,50.88,0] },
  { nome:'Manutenção Carro',  t:'C', v:[650,650,650,0,0,0,0,0,0,0,0,0] },
  { nome:'Manutenção Casa',   t:'C', v:[5142.06,2577.79,709.64,119.7,277.75,216.66,134.91,85,85,85,85,0] },
  { nome:'Meninos',           t:'C', v:[20,125,125,20,130,230,130,130,130,130,130,130] },
  { nome:'Outros',            t:'C', v:[305.25,55.99,590.66,424.15,580.64,235.07,107.4,100,100,100,100,100] },
  { nome:'Plano de Saúde',    t:'D', v:[219.16,743.84,219.16,579.16,359.16,304.16,324.16,219.16,219.16,219.16,219.16,219.16] },
  { nome:'Presente',          t:'C', v:[1496.18,824.40,821.28,1000,1026.38,1483.27,700.20,418.45,387.47,300,300,300] },
  { nome:'Prestação Carro',   t:'D', v:[1149.72,1149.72,1149.72,1150,1149.72,1149.72,1149.72,1149.72,1149.72,1149.72,1149.72,1149.72] },
  { nome:'Prestação Casa',    t:'D', v:[320,957,620,826,819,826,826,826,826,826,826,826] },
  { nome:'Seguro Civic',      t:'C', v:[0,193.65,193.65,193.65,193.65,193.65,193.65,193.65,193.65,193.65,193.65,193.65] },
  { nome:'Seguro March',      t:'C', v:[98.38,94.72,94.72,94.72,94.72,94.72,94.72,94.72,94.72,94.72,94.72,94.72] },
  { nome:'Supermercado',      t:'C', v:[4405.65,4987.11,3980.37,4300,4630.76,3500,3800,3500,3500,3500,3500,3500] },
  { nome:'Tarifa',            t:'D', v:[0.52,0,38.99,67.84,91.58,118.94,100,100,100,100,100,100] },
  { nome:'Vestuário',         t:'C', v:[1057.39,425.85,331.89,342,545.32,632.08,466.29,545.75,355.79,300,300,300] },
  { nome:'Viagens',           t:'C', v:[0,0,0,0,0,0,492.44,1027.95,135.44,135.44,135.44,135.44] },
]

function parseBRL(s: string): number {
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
}
function fmt(v: number, sempre = false) {
  if (v === 0 && !sempre) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function corSaldo(v: number) {
  if (v < 0)    return COR.vermelho
  if (v < 1000) return '#d97706'
  return COR.verde
}
function calcSaldos(data: AnoData) {
  const totalE = Array.from({ length: 12 }, (_, i) =>
    data.entradas.reduce((s, c) => s + c.v[i], 0))
  const totalS = Array.from({ length: 12 }, (_, i) =>
    data.saidas.reduce((s, c) => s + c.v[i], 0))
  const si: number[] = [], sf: number[] = []
  for (let i = 0; i < 12; i++) {
    const s = i === 0 ? data.saldoInicialJan : sf[i - 1]
    si.push(s); sf.push(s + totalE[i] - totalS[i])
  }
  return { totalEntradas: totalE, totalSaidas: totalS, saldoInicial: si, saldoFinal: sf }
}
function criarAnoZerado(template: AnoData, saldoIni: number): AnoData {
  return {
    saldoInicialJan: saldoIni,
    entradas: template.entradas.map(c => ({ ...c, v: new Array(12).fill(0) })),
    saidas:   template.saidas.map(c =>   ({ ...c, v: new Array(12).fill(0) })),
  }
}

const NAV_ITEMS = [
  { label:'⚙ Config', path:'/configuracoes' },
  { label:'Dashboard',    path:'/dashboard' },
  { label:'Planejamento', path:'/planejamento' },
  { label:'Lançamentos',  path:'/novo-lancamento' },
]

export default function Planejamento() {
  const navigate    = useNavigate()
  const { contas, setContas, categorias, extratoData,
          planos, setPlanos,
          planosReal, planejamentoLockado,
          finalizarPlanejamento, updatePlanoReal } = useApp()
  const contasSaldoIni = contas.filter(c => c.tipo === 'corrente' || c.tipo === 'poupanca')
  const SALDO_INICIAL_FIXO = contasSaldoIni
    .filter(c => c.incluirNoSaldoInicial !== false)
    .reduce((s, c) => s + c.saldoInicial, 0)
  const anoCorrente = new Date().getFullYear()
  const mesAtual    = new Date().getMonth()

  const [anoAtual,      setAnoAtual]      = useState(2026)
  const [aba,           setAba]           = useState<'previsto' | 'real'>('previsto')
  const [editando,      setEditando]      = useState<Editando>(null)
  const [valorTemp,     setValorTemp]     = useState('')
  const [hoverCat,      setHoverCat]      = useState<HoverCat>(null)
  const [entradaAberta, setEntradaAberta] = useState(false)
  const [saidaAberta,   setSaidaAberta]   = useState(false)
  const [saldoAberto,   setSaldoAberto]   = useState(false)

  const dadosBase: AnoData = { saldoInicialJan: SALDO_INICIAL_FIXO, entradas: [], saidas: [] }
  const realExiste = !!planosReal[anoAtual]
  const dadosAno: AnoData = aba === 'previsto'
    ? ((planos[anoAtual] as AnoData | undefined) ?? dadosBase)
    : (planosReal[anoAtual] as AnoData | undefined) ?? { saldoInicialJan: SALDO_INICIAL_FIXO, entradas: [], saidas: [] }

  const { totalEntradas, totalSaidas, saldoInicial, saldoFinal } =
    useMemo(() => calcSaldos(dadosAno), [dadosAno])

  // Saldo inicial real: substitui pelos valores consolidados do extrato onde disponíveis
  const saldoInicialReal = useMemo(() => {
    if (aba !== 'real') return saldoInicial
    const result = [...saldoInicial]
    const contasBanco = contasSaldoIni.filter(c => c.incluirNoSaldoInicial !== false)
    for (let mes = 1; mes < 12; mes++) {
      let total = 0, found = false
      for (const conta of contasBanco) {
        const key = `${conta.id}-${anoAtual}-${String(mes).padStart(2, '0')}`
        const d = extratoData[key]
        if (d?.saldoBanco) {
          const n = parseFloat(d.saldoBanco.replace(/\./g, '').replace(',', '.'))
          if (!isNaN(n)) { total += n; found = true }
        }
      }
      if (found) result[mes] = total
    }
    return result
  }, [aba, anoAtual, extratoData, contasSaldoIni, saldoInicial])

  // Quais meses têm saldo real do extrato
  const mesTemSaldoReal = useMemo(() => Array.from({ length: 12 }, (_, mes) => {
    if (aba !== 'real' || mes === 0) return false
    const contasBanco = contasSaldoIni.filter(c => c.incluirNoSaldoInicial !== false)
    return contasBanco.some(c => {
      const key = `${c.id}-${anoAtual}-${String(mes).padStart(2, '0')}`
      return !!extratoData[key]?.saldoBanco
    })
  }), [aba, anoAtual, extratoData, contasSaldoIni])

  // ── Helpers de update ──
  function updateAno(fn: (d: AnoData) => AnoData) {
    if (planejamentoLockado) return
    if (aba === 'previsto') {
      setPlanos(prev => ({ ...prev, [anoAtual]: fn((prev[anoAtual] as AnoData | undefined) ?? dadosBase) as PlanoAnoData }))
    } else {
      updatePlanoReal(anoAtual, prev => fn(prev as AnoData) as PlanoAnoData)
    }
  }
  function setEntradas(fn: (prev: Cat[]) => Cat[]) {
    updateAno(d => ({ ...d, entradas: fn(d.entradas) }))
  }
  function setSaidas(fn: (prev: Cat[]) => Cat[]) {
    updateAno(d => ({ ...d, saidas: fn(d.saidas) }))
  }
  function toggleContaNoSaldoInicial(id: string) {
    const novasContas = contas.map(c => c.id === id
      ? { ...c, incluirNoSaldoInicial: c.incluirNoSaldoInicial === false ? true : false }
      : c)
    setContas(novasContas)
    const novoSaldo = novasContas
      .filter(c => (c.tipo === 'corrente' || c.tipo === 'poupanca') && c.incluirNoSaldoInicial !== false)
      .reduce((s, c) => s + c.saldoInicial, 0)
    updateAno(d => ({ ...d, saldoInicialJan: novoSaldo }))
  }

  // ── Navegação de ano ──
  function navegarAno(delta: number) {
    const novoAno = anoAtual + delta
    if (!planos[novoAno]) {
      let saldoIni = 0
      const ant = planos[novoAno - 1] as AnoData | undefined
      if (ant) { const { saldoFinal: sf } = calcSaldos(ant); saldoIni = sf[11] }
      setPlanos(prev => ({ ...prev, [novoAno]: criarAnoZerado(dadosAno, saldoIni) as PlanoAnoData }))
    }
    setAnoAtual(novoAno)
    setEditando(null)
  }

  // ── Edição de valores ──
  function iniciarValor(tipo: 'e'|'s', row: number, col: number, valor: number) {
    setEditando({ tipo, row, col })
    setValorTemp(valor === 0 ? '' : valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
  }
  function confirmarValor() {
    if (!editando) return
    const novo = parseBRL(valorTemp)
    if (editando.tipo === 'e') {
      setEntradas(prev => prev.map((c, ri) =>
        ri === editando.row ? { ...c, v: c.v.map((v, ci) => ci === editando.col ? novo : v) } : c))
    } else {
      setSaidas(prev => prev.map((c, ri) =>
        ri === editando.row ? { ...c, v: c.v.map((v, ci) => ci === editando.col ? novo : v) } : c))
    }
    setEditando(null)
  }

  const isEditVal = (tipo: 'e'|'s', r: number, c: number) =>
    editando?.tipo === tipo && editando.row === r && editando.col === c
  const isHover   = (tipo: 'e'|'s', ri: number) =>
    hoverCat?.tipo === tipo && hoverCat.ri === ri

  function bgNormal(ri: number, col: number) {
    if (col === mesAtual) return '#dbeafe'
    return ri % 2 === 0 ? COR.limp : COR.listrado
  }

  // ── Célula de valor editável ──
  function renderCelula(tipo: 'e'|'s', row: number, col: number, valor: number, corTexto: string, ri: number) {
    const ativo = isEditVal(tipo, row, col)
    return (
      <td key={col} style={{ padding:0, background:bgNormal(ri, col),
        borderBottom:`1px solid ${COR.borda}`,
        width:COL_MES, minWidth:COL_MES, cursor:'pointer' }}>
        {ativo ? (
          <input autoFocus value={valorTemp}
            onChange={e => setValorTemp(e.target.value)}
            onBlur={confirmarValor}
            onKeyDown={e => {
              if (e.key === 'Enter') confirmarValor()
              if (e.key === 'Escape') setEditando(null)
            }}
            style={{ width:'100%', minHeight:34, padding:'6px 10px', textAlign:'right',
              border:'none', outline:'none', background:'#dbeafe', color:COR.azulEscuro,
              fontSize:12, fontFamily:'inherit', fontWeight:500,
              boxShadow:`inset 0 -2px 0 ${COR.azul}` }}
          />
        ) : (
          <div onClick={() => iniciarValor(tipo, row, col, valor)}
            style={{ padding:'7px 12px', textAlign:'right', fontSize:12,
              color: valor === 0 ? '#c0cce0' : corTexto,
              fontWeight:400, whiteSpace:'nowrap', userSelect:'none' }}>
            {fmt(valor)}
          </div>
        )}
      </td>
    )
  }

  // ── Célula de nome — clique navega para Configurações (Cadastro de Categorias) ──
  function renderNome(
    tipo: 'e'|'s', ri: number, nome: string,
    bgBase: string, badge?: React.ReactNode
  ) {
    const hover = isHover(tipo, ri)
    const { icone, cor: corIcone } = iconeCategoria(categorias, nome)

    return (
      <td key="nome"
        onClick={() => navigate('/configuracoes', { state: { aba: 'categorias', catNome: nome } })}
        onMouseEnter={() => setHoverCat({ tipo, ri })}
        onMouseLeave={() => setHoverCat(null)}
        style={{ position:'sticky', left:0, zIndex:2, cursor:'pointer',
          background: hover ? '#f8faff' : bgBase,
          borderBottom:`1px solid ${COR.borda}`,
          borderLeft:`3px solid ${tipo === 'e' ? '#93c5fd' : '#fca5a5'}`,
          height:36, verticalAlign:'middle', whiteSpace:'nowrap',
          padding:'0 12px 0 24px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:20, height:20, borderRadius:5, background:corIcone,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:11, flexShrink:0 }}>{icone}</div>
          {badge}
          <span style={{ fontSize:12, color:COR.texto, flex:1 }}>{nome}</span>
        </div>
      </td>
    )
  }

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column',
      background:COR.fundo, fontFamily:"-apple-system,'Inter',sans-serif", overflow:'hidden' }}>

      {/* HEADER */}
      <div style={{ background:`linear-gradient(135deg,${COR.azulEscuro},${COR.azulMedio})`,
        padding:'18px 28px', display:'flex', alignItems:'center',
        justifyContent:'space-between', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}
            onClick={() => navigate('/dashboard')}>
            <div style={{ width:32, height:32, borderRadius:8,
              background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.2)',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="1.5"/>
                <polygon points="10,3 11.2,9.4 10,8.5 8.8,9.4" fill="white"/>
                <polygon points="10,17 8.8,10.6 10,11.5 11.2,10.6" fill="white" opacity=".5"/>
              </svg>
            </div>
            <span style={{ color:'#fff', fontWeight:700, fontSize:17 }}>
              Compass <span style={{ fontWeight:300, opacity:.75 }}>One</span>
            </span>
          </div>
          <nav style={{ display:'flex', gap:2 }}>
            {NAV_ITEMS.map(n => (
              <button key={n.path} onClick={() => navigate(n.path)} style={{
                padding:'6px 14px', borderRadius:8, border:'none', cursor:'pointer',
                fontSize:13, fontWeight:500, fontFamily:'inherit',
                background: n.path === '/planejamento' ? 'rgba(255,255,255,0.2)' : 'transparent',
                color:      n.path === '/planejamento' ? '#fff' : 'rgba(255,255,255,0.6)',
              }}>{n.label}</button>
            ))}
          </nav>
        </div>
        <div style={{ width:34, height:34, borderRadius:'50%',
          background:'rgba(255,255,255,0.15)', display:'flex',
          alignItems:'center', justifyContent:'center',
          color:'#fff', fontSize:14, fontWeight:600 }}>G</div>
      </div>

      {/* TÍTULO + NAVEGAÇÃO DE ANO */}
      <div style={{ padding:'14px 24px 6px', flexShrink:0,
        display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:17, fontWeight:700, color:COR.texto, margin:0 }}>
            Planejamento
          </h1>
          <p style={{ fontSize:12, color:COR.textoSuave, marginTop:3 }}>
            Fluxo de caixa ·{' '}
            <span style={{ color:COR.azul }}>Mês atual destacado</span>
            {' · '}Passe o mouse sobre uma categoria para renomear
          </p>
        </div>

        {/* Navegação de ano */}
        <div style={{ display:'flex', alignItems:'center', gap:0,
          background:COR.branco, border:`1px solid ${COR.borda}`,
          borderRadius:10, overflow:'hidden', flexShrink:0 }}>
          <button onClick={() => navegarAno(-1)} style={{
            border:'none', background:'transparent', cursor:'pointer',
            padding:'8px 14px', fontSize:16, color:COR.textoSuave }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f0f4ff')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>←</button>
          <div style={{ padding:'8px 16px', borderLeft:`1px solid ${COR.borda}`,
            borderRight:`1px solid ${COR.borda}`, textAlign:'center', minWidth:80 }}>
            <div style={{ fontSize:15, fontWeight:700, color:COR.texto }}>{anoAtual}</div>
            {anoAtual === anoCorrente && (
              <div style={{ fontSize:9, color:COR.azul, fontWeight:600,
                textTransform:'uppercase', letterSpacing:.5 }}>Ano atual</div>
            )}
          </div>
          <button onClick={() => navegarAno(+1)} style={{
            border:'none', background:'transparent', cursor:'pointer',
            padding:'8px 14px', fontSize:16, color:COR.textoSuave }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f0f4ff')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>→</button>
        </div>
      </div>

      {/* ABAS + BOTÃO FINALIZAR */}
      <div style={{ padding:'0 24px 8px', flexShrink:0,
        display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', gap:4,
          background:COR.branco, border:`1px solid ${COR.borda}`,
          borderRadius:9, padding:3 }}>
          {(['previsto','real'] as const).map(v => (
            <button key={v} onClick={() => { setAba(v); setEditando(null) }} style={{
              padding:'5px 18px', borderRadius:6, border:'none', cursor:'pointer',
              fontFamily:'inherit', fontSize:12, fontWeight:600,
              background: aba === v ? COR.azul : 'transparent',
              color:       aba === v ? '#fff'   : COR.textoSuave,
              transition:'all .15s' }}>
              {v === 'previsto' ? 'Previsto' : 'Real'}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {planejamentoLockado && (
            <span style={{ fontSize:11, color:COR.textoSuave, display:'flex', alignItems:'center', gap:4 }}>
              🔒 Bloqueado · desbloqueie em <strong>Configurações → Perfil</strong>
            </span>
          )}
          {!planejamentoLockado && aba === 'previsto' && (
            <button onClick={() => finalizarPlanejamento(anoAtual, dadosAno as PlanoAnoData)}
              style={{ padding:'6px 16px', border:'none', borderRadius:8, cursor:'pointer',
                fontFamily:'inherit', fontSize:12, fontWeight:600, color:'#fff',
                background:`linear-gradient(135deg,${COR.azulEscuro},${COR.azulMedio})` }}>
              {realExiste ? '↺ Refazer planejamento real' : '✓ Finalizar planejamento'}
            </button>
          )}
        </div>
      </div>

      {/* TABELA */}
      <div style={{ flex:1, padding:'0 24px', minHeight:0 }}>

        {/* Placeholder: aba Real ainda não finalizada */}
        {aba === 'real' && !realExiste && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'center', height:'100%', gap:16, paddingBottom:40 }}>
            <div style={{ fontSize:40 }}>📋</div>
            <div style={{ fontSize:15, fontWeight:700, color:COR.texto }}>
              Planejamento real não iniciado
            </div>
            <div style={{ fontSize:13, color:COR.textoSuave, textAlign:'center', maxWidth:380 }}>
              Vá para a aba <strong>Previsto</strong>, revise os valores e clique em{' '}
              <strong>Finalizar planejamento</strong> para criar uma cópia do planejamento real.
            </div>
            <button onClick={() => setAba('previsto')} style={{
              padding:'8px 20px', border:`1.5px solid ${COR.azul}`, borderRadius:8,
              background:'#eff6ff', color:COR.azul, fontSize:13, fontWeight:600,
              cursor:'pointer', fontFamily:'inherit' }}>
              Ir para Previsto
            </button>
          </div>
        )}

        {/* container único de scroll — todos os cards rolam juntos */}
        {(aba === 'previsto' || realExiste) && (
        <div style={{ flex:1, overflow:'auto', paddingBottom:12 }}>
          <div style={{ minWidth: COL_CAT + COL_MES * 12 + 2 }}>

            {/* CABEÇALHO FIXO */}
            <div style={{ position:'sticky', top:0, zIndex:30 }}>
              <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed' }}>
                <colgroup>
                  <col style={{ width:COL_CAT, minWidth:COL_CAT }} />
                  {MESES.map((_,i) => <col key={i} style={{ width:COL_MES, minWidth:COL_MES }} />)}
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ padding:'10px 16px', textAlign:'left',
                      fontSize:11, fontWeight:600, color:COR.textoSuave,
                      textTransform:'uppercase', letterSpacing:.5,
                      background:'#e2e8f6', borderBottom:`2px solid ${COR.borda}`,
                      whiteSpace:'nowrap' }}>Categoria</th>
                    {MESES.map((m, i) => (
                      <th key={m} style={{ padding:'10px 12px', textAlign:'right',
                        fontSize:12, fontWeight:600,
                        color:      i === mesAtual ? COR.azul : COR.textoSuave,
                        background: i === mesAtual ? '#c7d9f8' : '#e2e8f6',
                        borderBottom:`2px solid ${i === mesAtual ? COR.azul : COR.borda}`,
                        whiteSpace:'nowrap' }}>{m}</th>
                    ))}
                  </tr>
                </thead>
              </table>
            </div>

            {/* CARDS */}
            <div style={{ display:'flex', flexDirection:'column', gap:8, padding:'8px 0 0' }}>

              {/* ── CARD: SALDO INICIAL ── */}
              <div style={{ background:COR.branco, borderRadius:12,
                border:`1px solid ${COR.borda}`, overflow:'clip' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed' }}>
                  <colgroup>
                    <col style={{ width:COL_CAT, minWidth:COL_CAT }} />
                    {MESES.map((_,i) => <col key={i} style={{ width:COL_MES, minWidth:COL_MES }} />)}
                  </colgroup>
                  <tbody>
                    <tr onClick={() => setSaldoAberto(a => !a)} style={{ cursor:'pointer' }}>
                      <td style={{ position:'sticky', left:0, zIndex:2, background:'#e8f0fe',
                        padding:'10px 16px', fontWeight:700, fontSize:12, color:COR.azul,
                        borderBottom: saldoAberto ? `1px solid ${COR.borda}` : 'none',
                        whiteSpace:'nowrap' }}>
                        <span style={{ fontSize:9, marginRight:6, display:'inline-block',
                          transition:'transform .2s',
                          transform: saldoAberto ? 'rotate(180deg)' : 'none' }}>▼</span>
                        Saldo Inicial
                      </td>
                      {saldoInicialReal.map((v, i) => (
                        <td key={i} style={{ padding:'10px 12px', textAlign:'right',
                          fontSize:12, fontWeight:700, whiteSpace:'nowrap', color:corSaldo(v),
                          background: i === mesAtual ? '#c7d9f8' : '#e8f0fe',
                          borderBottom: saldoAberto ? `1px solid ${COR.borda}` : 'none',
                          borderTop: mesTemSaldoReal[i] ? `2px solid #16a34a` : undefined }}>
                          {fmt(v, true)}
                          {mesTemSaldoReal[i] && (
                            <div style={{ fontSize:8, color:'#16a34a', fontWeight:600, marginTop:1 }}>extrato</div>
                          )}
                        </td>
                      ))}
                    </tr>
                    {saldoAberto && (
                      <tr>
                        <td colSpan={13} style={{ padding:'10px 16px 12px 28px',
                          background:'#eff6ff' }}>
                          <div style={{ fontSize:10, fontWeight:600, color:COR.azul,
                            textTransform:'uppercase', letterSpacing:.6, marginBottom:8 }}>
                            Contas consideradas no saldo inicial
                          </div>
                          <div style={{ display:'flex', flexDirection:'column', gap:6, maxWidth:520 }}>
                            {contasSaldoIni.length === 0 && (
                              <div style={{ fontSize:12, color:COR.textoSuave }}>
                                Nenhuma conta corrente ou poupança cadastrada.
                              </div>
                            )}
                            {contasSaldoIni.map(c => {
                              const incluida = c.incluirNoSaldoInicial !== false
                              return (
                                <label key={c.id} style={{ display:'flex', alignItems:'center', gap:10,
                                  padding:'7px 12px', background:COR.branco, borderRadius:8,
                                  border:`1px solid ${COR.borda}`, cursor:'pointer',
                                  opacity: incluida ? 1 : 0.55 }}>
                                  <input type="checkbox" checked={incluida}
                                    onChange={() => toggleContaNoSaldoInicial(c.id)}
                                    style={{ cursor:'pointer' }} />
                                  <div style={{ width:26, height:26, borderRadius:7, background:c.cor,
                                    display:'flex', alignItems:'center', justifyContent:'center',
                                    fontSize:13, flexShrink:0 }}>{c.icone}</div>
                                  <div style={{ flex:1, minWidth:0 }}>
                                    <div style={{ fontSize:12, fontWeight:500, color:COR.texto }}>{c.nome}</div>
                                    <div style={{ fontSize:10, color:COR.textoSuave, marginTop:1 }}>
                                      {c.banco} · {c.tipo === 'corrente' ? 'Conta corrente' : 'Poupança'}
                                    </div>
                                  </div>
                                  <div style={{ fontSize:12, fontWeight:600,
                                    color: incluida ? COR.azul : COR.textoSuave }}>
                                    {fmt(c.saldoInicial, true)}
                                  </div>
                                </label>
                              )
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* ── CARD: ENTRADAS ── */}
              <div style={{ background:'#dbeafe', borderRadius:12,
                border:`1px solid #93c5fd`, overflow:'clip' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed' }}>
                  <colgroup>
                    <col style={{ width:COL_CAT, minWidth:COL_CAT }} />
                    {MESES.map((_,i) => <col key={i} style={{ width:COL_MES, minWidth:COL_MES }} />)}
                  </colgroup>
                  <tbody>
                    <tr onClick={() => setEntradaAberta(a => !a)} style={{ cursor:'pointer' }}>
                      <td style={{ position:'sticky', left:0, zIndex:2, background:'#dbeafe',
                        padding:'10px 16px', fontWeight:700, fontSize:12, color:COR.azul,
                        borderBottom: entradaAberta ? `1px solid #93c5fd` : 'none',
                        whiteSpace:'nowrap' }}>
                        <span style={{ fontSize:9, marginRight:6, display:'inline-block',
                          transition:'transform .2s',
                          transform: entradaAberta ? 'rotate(180deg)' : 'none' }}>▼</span>
                        (+) Entradas
                      </td>
                      {totalEntradas.map((v, i) => (
                        <td key={i} style={{ padding:'10px 12px', textAlign:'right',
                          fontSize:12, fontWeight:700, whiteSpace:'nowrap', color:COR.azul,
                          background: i === mesAtual ? '#93c5fd' : '#dbeafe',
                          borderBottom: entradaAberta ? `1px solid #93c5fd` : 'none' }}>
                          {fmt(v, true)}
                        </td>
                      ))}
                    </tr>
                    {entradaAberta && <>
                      <tr>
                        <td colSpan={13} style={{ padding:'5px 16px 5px 28px',
                          background:'#eff6ff', fontSize:10, fontWeight:600, color:COR.azul,
                          textTransform:'uppercase', letterSpacing:.6,
                          borderBottom:`1px solid #bfdbfe` }}>
                          Categorias de entrada
                        </td>
                      </tr>
                      {dadosAno.entradas.map((cat, ri) => {
                        const tm = categorias.find(c => c.nome === cat.nome)?.tipoMovimento
                          ?? (cat.t === 'D' ? 'banco' : cat.t === 'C' ? 'cartao' : undefined)
                        const bm = tm ? BADGE_MOV[tm] : null
                        return (
                          <tr key={`e-${ri}`}>
                            {renderNome('e', ri, cat.nome, ri % 2 === 0 ? '#eff6ff' : '#e8f0fe',
                              bm && <span style={{ display:'inline-flex', alignItems:'center',
                                justifyContent:'center', width:16, height:16, borderRadius:3,
                                fontSize:9, fontWeight:700, flexShrink:0,
                                background:bm.bg, color:bm.cor }}>{bm.label}</span>
                            )}
                            {cat.v.map((v, ci) => renderCelula('e', ri, ci, v, COR.texto, ri))}
                          </tr>
                        )
                      })}
                      <tr>
                        <td colSpan={13} style={{ padding:'6px 16px 6px 28px',
                          background:'#eff6ff', borderBottom:`1px solid #bfdbfe` }}>
                          <button onClick={() => navigate('/configuracoes', { state: { aba: 'categorias' } })} style={{
                            border:`1px dashed #93c5fd`, background:'transparent',
                            borderRadius:6, padding:'4px 12px', cursor:'pointer',
                            fontSize:11, color:COR.azul, fontFamily:'inherit' }}>
                            + Adicionar categoria de entrada
                          </button>
                        </td>
                      </tr>
                    </>}
                  </tbody>
                </table>
              </div>

              {/* ── CARD: SAÍDAS ── */}
              <div style={{ background:COR.branco, borderRadius:12,
                border:`1px solid ${COR.borda}`, overflow:'clip' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed' }}>
                  <colgroup>
                    <col style={{ width:COL_CAT, minWidth:COL_CAT }} />
                    {MESES.map((_,i) => <col key={i} style={{ width:COL_MES, minWidth:COL_MES }} />)}
                  </colgroup>
                  <tbody>
                    <tr onClick={() => setSaidaAberta(a => !a)} style={{ cursor:'pointer' }}>
                      <td style={{ position:'sticky', left:0, zIndex:2, background:'#fce8e6',
                        padding:'10px 16px', fontWeight:700, fontSize:12, color:COR.vermelho,
                        borderBottom: saidaAberta ? `1px solid #fecdd3` : 'none',
                        whiteSpace:'nowrap' }}>
                        <span style={{ fontSize:9, marginRight:6, display:'inline-block',
                          transition:'transform .2s',
                          transform: saidaAberta ? 'rotate(180deg)' : 'none' }}>▼</span>
                        (-) Saídas
                      </td>
                      {totalSaidas.map((v, i) => (
                        <td key={i} style={{ padding:'10px 12px', textAlign:'right',
                          fontSize:12, fontWeight:700, whiteSpace:'nowrap', color:COR.vermelho,
                          background: i === mesAtual ? '#c7d9f8' : '#fce8e6',
                          borderBottom: saidaAberta ? `1px solid #fecdd3` : 'none' }}>
                          {fmt(v, true)}
                        </td>
                      ))}
                    </tr>
                    {saidaAberta && <>
                      <tr>
                        <td colSpan={13} style={{ padding:'5px 16px 5px 28px',
                          background:'#fff1f2', fontSize:10, fontWeight:600, color:'#be123c',
                          textTransform:'uppercase', letterSpacing:.6,
                          borderBottom:`1px solid #fecdd3` }}>
                          Categorias de saída
                        </td>
                      </tr>
                      {dadosAno.saidas.map((cat, ri) => {
                        const tm = categorias.find(c => c.nome === cat.nome)?.tipoMovimento
                          ?? (cat.t === 'D' ? 'banco' : cat.t === 'C' ? 'cartao' : undefined)
                        const bm = tm ? BADGE_MOV[tm] : null
                        return (
                          <tr key={`s-${ri}`}>
                            {renderNome('s', ri, cat.nome, ri % 2 === 0 ? '#fff8f8' : '#fff1f2',
                              bm && <span style={{ display:'inline-flex', alignItems:'center',
                                justifyContent:'center', width:16, height:16, borderRadius:3,
                                fontSize:9, fontWeight:700, flexShrink:0,
                                background:bm.bg, color:bm.cor }}>{bm.label}</span>
                            )}
                            {cat.v.map((v, ci) => renderCelula('s', ri, ci, v, COR.texto, ri))}
                          </tr>
                        )
                      })}
                      <tr>
                        <td colSpan={13} style={{ padding:'6px 16px 6px 28px',
                          background:'#fff1f2', borderBottom:`1px solid #fecdd3` }}>
                          <button onClick={() => navigate('/configuracoes', { state: { aba: 'categorias' } })} style={{
                            border:`1px dashed #fca5a5`, background:'transparent',
                            borderRadius:6, padding:'4px 12px', cursor:'pointer',
                            fontSize:11, color:'#be123c', fontFamily:'inherit' }}>
                            + Adicionar categoria de saída
                          </button>
                        </td>
                      </tr>
                    </>}
                  </tbody>
                </table>
              </div>

              {/* ── CARD: SALDO DISPONÍVEL ── */}
              <div style={{ background:'#e8eaf6', borderRadius:12,
                border:`1px solid #c7d2f5`, overflow:'clip' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed' }}>
                  <colgroup>
                    <col style={{ width:COL_CAT, minWidth:COL_CAT }} />
                    {MESES.map((_,i) => <col key={i} style={{ width:COL_MES, minWidth:COL_MES }} />)}
                  </colgroup>
                  <tbody>
                    <tr>
                      <td style={{ position:'sticky', left:0, zIndex:2, background:'#e8eaf6',
                        padding:'11px 16px', fontWeight:700, fontSize:12, color:COR.texto,
                        borderLeft:`3px solid #4f46e5`, whiteSpace:'nowrap' }}>
                        Saldo Disponível
                      </td>
                      {saldoFinal.map((v, i) => (
                        <td key={i} style={{ padding:'11px 12px', textAlign:'right',
                          fontSize:12, fontWeight:700, whiteSpace:'nowrap', color:corSaldo(v),
                          background: i === mesAtual ? '#c7d9f8' : '#e8eaf6' }}>
                          {fmt(v, true)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </div>
        )}

      </div>

      {/* LEGENDA */}
      <div style={{ display:'flex', gap:20, padding:'6px 24px 12px',
        fontSize:11, color:COR.textoSuave, flexWrap:'wrap',
        flexShrink:0, alignItems:'center' }}>
        <span style={{ display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ background:'#eff6ff', color:'#1a56db',
            padding:'1px 6px', borderRadius:3, fontWeight:700, fontSize:10 }}>B</span>
          Banco
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ background:'#f3e8ff', color:'#7c3aed',
            padding:'1px 6px', borderRadius:3, fontWeight:700, fontSize:10 }}>C</span>
          Cartão
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ background:'#f0fdf4', color:'#16a34a',
            padding:'1px 6px', borderRadius:3, fontWeight:700, fontSize:10 }}>D</span>
          Dinheiro
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ width:10, height:10, borderRadius:2, background:'#dbeafe',
            border:`1px solid ${COR.azul}`, display:'inline-block' }} />
          Mês atual
        </span>
        <span>✏ Passe o mouse na categoria para renomear ou excluir</span>
      </div>

    </div>
  )
}