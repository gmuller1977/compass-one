import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

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

type Cat     = { nome: string; t?: string; v: number[] }
type AnoData = { saldoInicialJan: number; entradas: Cat[]; saidas: Cat[] }
type Editando     = { tipo: 'e'|'s'; row: number; col: number } | null
type EditandoNome = { tipo: 'e'|'s'; ri: number } | null
type HoverCat     = { tipo: 'e'|'s'; ri: number } | null

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
function primeiraMaiuscula(s: string) {
  const t = s.trim() || 'Sem nome'
  return t.charAt(0).toUpperCase() + t.slice(1)
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
function ordenarCats(cats: Cat[]) {
  return [...cats].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

const NAV_ITEMS = [
  { label:'⚙ Config', path:'/configuracoes' },
  { label:'Dashboard',    path:'/dashboard' },
  { label:'Planejamento', path:'/planejamento' },
  { label:'Lançamentos',  path:'/novo-lancamento' },
]

export default function Planejamento() {
  const navigate    = useNavigate()
  const anoCorrente = new Date().getFullYear()
  const mesAtual    = new Date().getMonth()

  const [anos,          setAnos]          = useState<Record<number, AnoData>>({
    2026: { saldoInicialJan: 28183.77, entradas: ENTRADAS_BASE, saidas: SAIDAS_BASE },
  })
  const [anoAtual,      setAnoAtual]      = useState(2026)
  const [editando,      setEditando]      = useState<Editando>(null)
  const [valorTemp,     setValorTemp]     = useState('')
  const [editandoNome,  setEditandoNome]  = useState<EditandoNome>(null)
  const [nomeTemp,      setNomeTemp]      = useState('')
  const [hoverCat,      setHoverCat]      = useState<HoverCat>(null)
  const [entradaAberta, setEntradaAberta] = useState(false)
  const [saidaAberta,   setSaidaAberta]   = useState(false)

  const dadosAno = anos[anoAtual]
  const { totalEntradas, totalSaidas, saldoInicial, saldoFinal } =
    useMemo(() => calcSaldos(dadosAno), [dadosAno])

  // ── Helpers de update ──
  function updateAno(fn: (d: AnoData) => AnoData) {
    setAnos(prev => ({ ...prev, [anoAtual]: fn(prev[anoAtual]) }))
  }
  function setEntradas(fn: (prev: Cat[]) => Cat[]) {
    updateAno(d => ({ ...d, entradas: fn(d.entradas) }))
  }
  function setSaidas(fn: (prev: Cat[]) => Cat[]) {
    updateAno(d => ({ ...d, saidas: fn(d.saidas) }))
  }

  // ── Navegação de ano ──
  function navegarAno(delta: number) {
    const novoAno = anoAtual + delta
    if (!anos[novoAno]) {
      let saldoIni = 0
      const ant = anos[novoAno - 1]
      if (ant) { const { saldoFinal: sf } = calcSaldos(ant); saldoIni = sf[11] }
      setAnos(prev => ({ ...prev, [novoAno]: criarAnoZerado(dadosAno, saldoIni) }))
    }
    setAnoAtual(novoAno)
    setEditando(null)
    setEditandoNome(null)
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

  // ── Edição de nomes ──
  function iniciarNome(tipo: 'e'|'s', ri: number, nome: string) {
    setEditandoNome({ tipo, ri })
    setNomeTemp(nome)
  }
  function confirmarNome() {
    if (!editandoNome) return
    const nome = primeiraMaiuscula(nomeTemp)
    if (editandoNome.tipo === 'e') {
      setEntradas(prev => ordenarCats(prev.map((c, ri) =>
        ri === editandoNome.ri ? { ...c, nome } : c)))
    } else {
      setSaidas(prev => ordenarCats(prev.map((c, ri) =>
        ri === editandoNome.ri ? { ...c, nome } : c)))
    }
    setEditandoNome(null)
  }
  function cancelarNome() { setEditandoNome(null) }

  // ── Excluir categoria ──
  function excluir(tipo: 'e'|'s', ri: number, nome: string) {
    if (!window.confirm(`Excluir a categoria "${nome}"?\nEsta ação não pode ser desfeita.`)) return
    if (tipo === 'e') setEntradas(prev => prev.filter((_, i) => i !== ri))
    else              setSaidas(prev   => prev.filter((_, i) => i !== ri))
    setEditandoNome(null)
  }

  // ── Adicionar categoria ──
  function adicionarCategoria(tipo: 'e'|'s') {
    const lista = tipo === 'e' ? dadosAno.entradas : dadosAno.saidas
    const novaRi = lista.length
    const nova: Cat = { nome: 'Nova categoria', v: new Array(12).fill(0), ...(tipo === 's' ? { t: 'C' } : {}) }
    if (tipo === 'e') setEntradas(prev => [...prev, nova])
    else              setSaidas(prev   => [...prev, nova])
    setTimeout(() => { setEditandoNome({ tipo, ri: novaRi }); setNomeTemp('Nova categoria') }, 50)
  }

  const isEditVal  = (tipo: 'e'|'s', r: number, c: number) =>
    editando?.tipo === tipo && editando.row === r && editando.col === c
  const isEditNome = (tipo: 'e'|'s', ri: number) =>
    editandoNome?.tipo === tipo && editandoNome.ri === ri
  const isHover    = (tipo: 'e'|'s', ri: number) =>
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

  // ── Célula de nome (inline, sem sub-componente) ──
  function renderNome(
    tipo: 'e'|'s', ri: number, nome: string,
    bgBase: string, badge?: React.ReactNode
  ) {
    const editandoEste = isEditNome(tipo, ri)
    const hover        = isHover(tipo, ri)

    return (
      <td key="nome"
        onMouseEnter={() => setHoverCat({ tipo, ri })}
        onMouseLeave={() => setHoverCat(null)}
        style={{ position:'sticky', left:0, zIndex:2,
          background: bgBase,
          borderBottom:`1px solid ${COR.borda}`,
          borderLeft:`3px solid ${tipo === 'e' ? '#86efac' : '#fca5a5'}`,
          height:36, verticalAlign:'middle', whiteSpace:'nowrap',
          padding:'0 12px 0 24px' }}>

        {editandoEste ? (
          // Modo edição — input + lixeira
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <input
              autoFocus
              value={nomeTemp}
              onChange={e => setNomeTemp(e.target.value)}
              onBlur={confirmarNome}
              onKeyDown={e => {
                if (e.key === 'Enter') confirmarNome()
                if (e.key === 'Escape') cancelarNome()
              }}
              style={{ flex:1, fontSize:12, border:`1.5px solid ${COR.azul}`,
                borderRadius:5, padding:'3px 8px', outline:'none',
                fontFamily:'inherit', background:'#eff6ff', color:COR.azulEscuro }}
            />
            <button
              onMouseDown={e => e.preventDefault()}
              onClick={() => excluir(tipo, ri, nome)}
              title="Excluir categoria"
              style={{ border:'none', background:'#fef2f2', cursor:'pointer',
                padding:'4px 7px', borderRadius:5, fontSize:13,
                color:'#ef4444', lineHeight:1, flexShrink:0 }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fef2f2')}
            >🗑</button>
          </div>
        ) : (
          // Modo normal — nome + lápis ao hover
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            {badge}
            <span style={{ fontSize:12, color:COR.texto, flex:1 }}>{nome}</span>
            {hover && (
              <button
                onClick={() => iniciarNome(tipo, ri, nome)}
                title="Renomear"
                style={{ border:'none', background:'transparent', cursor:'pointer',
                  padding:'2px 5px', borderRadius:4, fontSize:13,
                  color:COR.textoSuave, lineHeight:1, flexShrink:0 }}>
                ✏
              </button>
            )}
          </div>
        )}
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
      <div style={{ padding:'14px 24px 10px', flexShrink:0,
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

      {/* TABELA */}
      <div style={{ flex:1, padding:'0 24px 12px', minHeight:0 }}>
        <div style={{ height:'100%', overflow:'auto',
          border:`1px solid ${COR.borda}`, borderRadius:12, background:COR.branco }}>
          <table style={{ borderCollapse:'collapse',
            minWidth: COL_CAT + COL_MES * 12, width:'100%' }}>

            {/* CABEÇALHO */}
            <thead>
              <tr>
                <th style={{ position:'sticky', top:0, left:0, zIndex:30,
                  width:COL_CAT, minWidth:COL_CAT, padding:'10px 16px', textAlign:'left',
                  fontSize:11, fontWeight:600, color:COR.textoSuave,
                  textTransform:'uppercase', letterSpacing:.5,
                  background:'#e2e8f6', borderBottom:`2px solid ${COR.borda}`,
                  whiteSpace:'nowrap' }}>Categoria</th>
                {MESES.map((m, i) => (
                  <th key={m} style={{ position:'sticky', top:0, zIndex:20,
                    width:COL_MES, minWidth:COL_MES, padding:'10px 12px', textAlign:'right',
                    fontSize:12, fontWeight:600,
                    color:      i === mesAtual ? COR.azul : COR.textoSuave,
                    background: i === mesAtual ? '#c7d9f8' : '#e2e8f6',
                    borderBottom:`2px solid ${i === mesAtual ? COR.azul : COR.borda}`,
                    whiteSpace:'nowrap' }}>{m}</th>
                ))}
              </tr>
            </thead>

            <tbody>

              {/* SALDO INICIAL */}
              <tr>
                <td style={{ position:'sticky', left:0, zIndex:2, background:'#e8f0fe',
                  padding:'10px 16px', fontWeight:700, fontSize:12, color:COR.azul,
                  borderBottom:`1px solid ${COR.borda}`, whiteSpace:'nowrap' }}>
                  Saldo Inicial
                </td>
                {saldoInicial.map((v, i) => (
                  <td key={i} style={{ width:COL_MES, padding:'10px 12px', textAlign:'right',
                    fontSize:12, fontWeight:700, whiteSpace:'nowrap', color:COR.azul,
                    background: i === mesAtual ? '#c7d9f8' : '#e8f0fe',
                    borderBottom:`1px solid ${COR.borda}` }}>
                    {fmt(v, true)}
                  </td>
                ))}
              </tr>

              {/* ENTRADAS — linha clicável */}
              <tr onClick={() => setEntradaAberta(a => !a)} style={{ cursor:'pointer' }}>
                <td style={{ position:'sticky', left:0, zIndex:2, background:'#e6f4ea',
                  padding:'10px 16px', fontWeight:700, fontSize:12, color:COR.verde,
                  borderBottom:`1px solid ${COR.borda}`,
                  borderTop: entradaAberta ? `2px solid ${COR.verde}` : undefined,
                  whiteSpace:'nowrap' }}>
                  <span style={{ fontSize:9, marginRight:6, display:'inline-block',
                    transition:'transform .2s',
                    transform: entradaAberta ? 'rotate(180deg)' : 'none' }}>▼</span>
                  (+) Entradas
                </td>
                {totalEntradas.map((v, i) => (
                  <td key={i} style={{ width:COL_MES, padding:'10px 12px', textAlign:'right',
                    fontSize:12, fontWeight:700, whiteSpace:'nowrap', color:COR.verde,
                    background: i === mesAtual ? '#c7d9f8' : '#e6f4ea',
                    borderBottom:`1px solid ${COR.borda}`,
                    borderTop: entradaAberta ? `2px solid ${COR.verde}` : undefined }}>
                    {fmt(v, true)}
                  </td>
                ))}
              </tr>

              {/* PAINEL ENTRADAS */}
              {entradaAberta && <>
                <tr>
                  <td colSpan={13} style={{ padding:'5px 16px 5px 28px',
                    background:'#f0fdf4', fontSize:10, fontWeight:600, color:'#15803d',
                    textTransform:'uppercase', letterSpacing:.6,
                    borderBottom:`1px solid #bbf7d0` }}>
                    Categorias de entrada
                  </td>
                </tr>
                {dadosAno.entradas.map((cat, ri) => (
                  <tr key={`e-${ri}`}>
                    {renderNome('e', ri, cat.nome, ri % 2 === 0 ? '#f0fdf4' : '#e6f9ee')}
                    {cat.v.map((v, ci) => renderCelula('e', ri, ci, v, COR.verde, ri))}
                  </tr>
                ))}
                <tr>
                  <td colSpan={13} style={{ padding:'6px 16px 6px 28px',
                    background:'#f0fdf4', borderBottom:`1px solid #bbf7d0` }}>
                    <button onClick={() => adicionarCategoria('e')} style={{
                      border:`1px dashed #86efac`, background:'transparent',
                      borderRadius:6, padding:'4px 12px', cursor:'pointer',
                      fontSize:11, color:'#15803d', fontFamily:'inherit' }}>
                      + Adicionar categoria de entrada
                    </button>
                  </td>
                </tr>
                <tr>
                  <td style={{ position:'sticky', left:0, zIndex:2, background:'#e6f4ea',
                    padding:'9px 16px 9px 28px', fontWeight:700, fontSize:12, color:COR.verde,
                    borderBottom:`2px solid ${COR.verde}`, borderTop:`1px solid #bbf7d0`,
                    borderLeft:`3px solid ${COR.verde}`, whiteSpace:'nowrap' }}>
                    Total Entradas
                  </td>
                  {totalEntradas.map((v, i) => (
                    <td key={i} style={{ width:COL_MES, padding:'9px 12px', textAlign:'right',
                      fontSize:12, fontWeight:700, color:COR.verde, whiteSpace:'nowrap',
                      background: i === mesAtual ? '#dbeafe' : '#e6f4ea',
                      borderBottom:`2px solid ${COR.verde}`, borderTop:`1px solid #bbf7d0` }}>
                      {fmt(v, true)}
                    </td>
                  ))}
                </tr>
              </>}

              {/* SAÍDAS — linha clicável */}
              <tr onClick={() => setSaidaAberta(a => !a)} style={{ cursor:'pointer' }}>
                <td style={{ position:'sticky', left:0, zIndex:2, background:'#fce8e6',
                  padding:'10px 16px', fontWeight:700, fontSize:12, color:COR.vermelho,
                  borderBottom:`1px solid ${COR.borda}`,
                  borderTop: saidaAberta ? `2px solid ${COR.vermelho}` : undefined,
                  whiteSpace:'nowrap' }}>
                  <span style={{ fontSize:9, marginRight:6, display:'inline-block',
                    transition:'transform .2s',
                    transform: saidaAberta ? 'rotate(180deg)' : 'none' }}>▼</span>
                  (-) Saídas
                </td>
                {totalSaidas.map((v, i) => (
                  <td key={i} style={{ width:COL_MES, padding:'10px 12px', textAlign:'right',
                    fontSize:12, fontWeight:700, whiteSpace:'nowrap', color:COR.vermelho,
                    background: i === mesAtual ? '#c7d9f8' : '#fce8e6',
                    borderBottom:`1px solid ${COR.borda}`,
                    borderTop: saidaAberta ? `2px solid ${COR.vermelho}` : undefined }}>
                    {fmt(v, true)}
                  </td>
                ))}
              </tr>

              {/* PAINEL SAÍDAS */}
              {saidaAberta && <>
                <tr>
                  <td colSpan={13} style={{ padding:'5px 16px 5px 28px',
                    background:'#fff1f2', fontSize:10, fontWeight:600, color:'#be123c',
                    textTransform:'uppercase', letterSpacing:.6,
                    borderBottom:`1px solid #fecdd3` }}>
                    Categorias de saída
                  </td>
                </tr>
                {dadosAno.saidas.map((cat, ri) => (
                  <tr key={`s-${ri}`}>
                    {renderNome('s', ri, cat.nome, ri % 2 === 0 ? '#fff8f8' : '#fff1f2',
                      <span style={{ display:'inline-flex', alignItems:'center',
                        justifyContent:'center', width:16, height:16, borderRadius:3,
                        fontSize:9, fontWeight:700, flexShrink:0,
                        background: cat.t === 'D' ? '#fef9c3' : '#eff6ff',
                        color:       cat.t === 'D' ? '#92400e' : COR.azul }}>
                        {cat.t ?? 'C'}
                      </span>
                    )}
                    {cat.v.map((v, ci) => renderCelula('s', ri, ci, v, COR.texto, ri))}
                  </tr>
                ))}
                <tr>
                  <td colSpan={13} style={{ padding:'6px 16px 6px 28px',
                    background:'#fff1f2', borderBottom:`1px solid #fecdd3` }}>
                    <button onClick={() => adicionarCategoria('s')} style={{
                      border:`1px dashed #fca5a5`, background:'transparent',
                      borderRadius:6, padding:'4px 12px', cursor:'pointer',
                      fontSize:11, color:'#be123c', fontFamily:'inherit' }}>
                      + Adicionar categoria de saída
                    </button>
                  </td>
                </tr>
                <tr>
                  <td style={{ position:'sticky', left:0, zIndex:2, background:'#fce8e6',
                    padding:'9px 16px 9px 28px', fontWeight:700, fontSize:12, color:COR.vermelho,
                    borderBottom:`2px solid ${COR.vermelho}`, borderTop:`1px solid #fecdd3`,
                    borderLeft:`3px solid ${COR.vermelho}`, whiteSpace:'nowrap' }}>
                    Total Saídas
                  </td>
                  {totalSaidas.map((v, i) => (
                    <td key={i} style={{ width:COL_MES, padding:'9px 12px', textAlign:'right',
                      fontSize:12, fontWeight:700, color:COR.vermelho, whiteSpace:'nowrap',
                      background: i === mesAtual ? '#dbeafe' : '#fce8e6',
                      borderBottom:`2px solid ${COR.vermelho}`, borderTop:`1px solid #fecdd3` }}>
                      {fmt(v, true)}
                    </td>
                  ))}
                </tr>
              </>}

              {/* SALDO DISPONÍVEL — sticky bottom */}
              <tr>
                <td style={{ position:'sticky', bottom:0, left:0, zIndex:15,
                  background:'#e8eaf6', padding:'10px 16px', fontWeight:700,
                  fontSize:12, color:COR.texto,
                  borderTop:`2px solid ${COR.borda}`,
                  boxShadow:'0 -3px 8px rgba(0,0,0,0.08)', whiteSpace:'nowrap' }}>
                  Saldo Disponível
                </td>
                {saldoFinal.map((v, i) => (
                  <td key={i} style={{ position:'sticky', bottom:0, zIndex:10,
                    width:COL_MES, minWidth:COL_MES, padding:'10px 12px', textAlign:'right',
                    fontSize:12, fontWeight:700, whiteSpace:'nowrap', color:corSaldo(v),
                    background: i === mesAtual ? '#c7d9f8' : '#e8eaf6',
                    borderTop:`2px solid ${COR.borda}`,
                    boxShadow:'0 -3px 8px rgba(0,0,0,0.08)' }}>
                    {fmt(v, true)}
                  </td>
                ))}
              </tr>

            </tbody>
          </table>
        </div>
      </div>

      {/* LEGENDA */}
      <div style={{ display:'flex', gap:20, padding:'6px 24px 12px',
        fontSize:11, color:COR.textoSuave, flexWrap:'wrap',
        flexShrink:0, alignItems:'center' }}>
        <span style={{ display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ background:'#fef9c3', color:'#92400e',
            padding:'1px 6px', borderRadius:3, fontWeight:700, fontSize:10 }}>D</span>
          Débito direto
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ background:'#eff6ff', color:COR.azul,
            padding:'1px 6px', borderRadius:3, fontWeight:700, fontSize:10 }}>C</span>
          Cartão de crédito
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