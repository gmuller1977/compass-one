import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const COR = {
  azul: '#1a56db', azulEscuro: '#0f2878', azulMedio: '#2563eb',
  fundo: '#f0f4ff', branco: '#ffffff', texto: '#0f172a',
  textoSuave: '#64748b', borda: '#e2e8f0',
  verde: '#16a34a', vermelho: '#dc2626',
  limp: '#ffffff', listrado: '#edf1fb',
}

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const SALDO_INICIAL_FIXO = 28183.77
const COL_CAT = 210  // largura da coluna categoria
const COL_MES = 112  // largura de cada mês

type Cat = { nome: string; t?: string; v: number[] }

const ENTRADAS_INICIAL: Cat[] = [
  { nome: 'Clientes a Receber',   v: [0,0,0,918,3266,3399.11,3382.11,3671.15,3671.15,3671.15,3671.15,3671.15] },
  { nome: 'Salário Pri',          v: [7438.36,5900,10530,10530,11548,11548,11548,11548,11548,11548,11548,11548] },
  { nome: 'Salário Gui',          v: [0,0,425,0,0,0,0,0,0,0,0,0] },
  { nome: '13º Salário / Férias', v: [0,0,0,0,0,0,0,0,0,0,5774,5774] },
  { nome: 'Outros',               v: [909.41,1655.69,1651.39,1368.46,256,224.32,54.07,54.07,54.07,54.07,54.07,54.07] },
]

const SAIDAS_INICIAL: Cat[] = [
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
  if (v < 0) return '#dc2626'
  if (v < 1000) return '#d97706'
  return '#16a34a'
}

type Editando = { tipo: 'e' | 's'; row: number; col: number } | null

const NAV = [
  { label: 'Dashboard',    path: '/dashboard' },
  { label: 'Planejamento', path: '/planejamento' },
  { label: 'Lançamentos',  path: '/novo-lancamento' },
]

// Estilos das linhas do resumo
const RESUMO_DEF = [
  { label: 'Saldo Inicial',    bg: '#e8f0fe', cor: COR.azul     },
  { label: '(+) Entradas',     bg: '#e6f4ea', cor: COR.verde    },
  { label: '(-) Saídas',       bg: '#fce8e6', cor: COR.vermelho },
  { label: 'Saldo Disponível', bg: '#e8eaf6', cor: undefined     },
]

export default function Planejamento() {
  const navigate  = useNavigate()
  const mesAtual  = new Date().getMonth()
  const scrollRef = useRef<HTMLDivElement>(null)

  const [entradas, setEntradas] = useState<Cat[]>(ENTRADAS_INICIAL)
  const [saidas,   setSaidas]   = useState<Cat[]>(SAIDAS_INICIAL)
  const [editando, setEditando] = useState<Editando>(null)
  const [valorTemp, setValorTemp] = useState('')
  const [scrollX, setScrollX] = useState(0)

  const totalEntradas = useMemo(() =>
    Array.from({ length: 12 }, (_, i) =>
      entradas.reduce((s, c) => s + c.v[i], 0)), [entradas])

  const totalSaidas = useMemo(() =>
    Array.from({ length: 12 }, (_, i) =>
      saidas.reduce((s, c) => s + c.v[i], 0)), [saidas])

  const { saldoInicial, saldoFinal } = useMemo(() => {
    const si: number[] = [], sf: number[] = []
    for (let i = 0; i < 12; i++) {
      const s = i === 0 ? SALDO_INICIAL_FIXO : sf[i - 1]
      si.push(s); sf.push(s + totalEntradas[i] - totalSaidas[i])
    }
    return { saldoInicial: si, saldoFinal: sf }
  }, [totalEntradas, totalSaidas])

  const resumoDados = [saldoInicial, totalEntradas, totalSaidas, saldoFinal]

  function iniciar(tipo: 'e' | 's', row: number, col: number, valor: number) {
    setEditando({ tipo, row, col })
    setValorTemp(valor === 0 ? '' : valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
  }

  function confirmar() {
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

  function cancelar() { setEditando(null) }

  const isEdit = (tipo: 'e' | 's', row: number, col: number) =>
    editando?.tipo === tipo && editando.row === row && editando.col === col

  function bgNormal(ri: number, col: number) {
    if (col === mesAtual) return '#dbeafe'
    return ri % 2 === 0 ? COR.limp : COR.listrado
  }

  // Sincroniza scroll horizontal do painel de baixo com o cabeçalho fixo
  function handleScroll() {
    setScrollX(scrollRef.current?.scrollLeft ?? 0)
  }

  // Largura total da tabela
  const tabelaW = COL_CAT + COL_MES * 12

  function CelulaInput() {
    return (
      <input
        autoFocus
        value={valorTemp}
        onChange={e => setValorTemp(e.target.value)}
        onBlur={confirmar}
        onKeyDown={e => {
          if (e.key === 'Enter') confirmar()
          if (e.key === 'Escape') cancelar()
        }}
        style={{
          width: '100%', height: '100%', minHeight: 36,
          padding: '8px 10px', textAlign: 'right',
          border: 'none', outline: 'none',
          background: '#dbeafe', color: COR.azulEscuro,
          fontSize: 12, fontFamily: 'inherit', fontWeight: 500,
          boxShadow: `inset 0 -2px 0 ${COR.azul}`,
        }}
      />
    )
  }

  function Celula({ tipo, row, col, valor, corTexto, ri }: {
    tipo: 'e' | 's'; row: number; col: number
    valor: number; corTexto: string; ri: number
  }) {
    const ativo = isEdit(tipo, row, col)
    return (
      <td style={{
        padding: 0, background: bgNormal(ri, col),
        borderBottom: `1px solid ${COR.borda}`,
        width: COL_MES, minWidth: COL_MES, cursor: 'pointer',
      }}>
        {ativo ? <CelulaInput /> : (
          <div onClick={() => iniciar(tipo, row, col, valor)} style={{
            padding: '8px 12px', textAlign: 'right', fontSize: 12,
            color: valor === 0 ? '#c0cce0' : corTexto,
            fontWeight: 400, whiteSpace: 'nowrap', userSelect: 'none',
          }}>
            {fmt(valor)}
          </div>
        )}
      </td>
    )
  }

  // ── Linha do cabeçalho (meses) — usada em ambas as tabelas ──
  function LinhaHeader() {
    return (
      <tr>
        <th style={{
          width: COL_CAT, minWidth: COL_CAT,
          padding: '10px 16px', textAlign: 'left',
          fontSize: 11, fontWeight: 600, color: COR.textoSuave,
          textTransform: 'uppercase', letterSpacing: 0.5,
          background: '#e2e8f6', borderBottom: `2px solid ${COR.borda}`,
          whiteSpace: 'nowrap',
        }}>Categoria</th>
        {MESES.map((m, i) => (
          <th key={m} style={{
            width: COL_MES, minWidth: COL_MES,
            padding: '10px 12px', textAlign: 'right',
            fontSize: 12, fontWeight: 600,
            color: i === mesAtual ? COR.azul : COR.textoSuave,
            background: i === mesAtual ? '#c7d9f8' : '#e2e8f6',
            borderBottom: `2px solid ${i === mesAtual ? COR.azul : COR.borda}`,
            whiteSpace: 'nowrap',
          }}>{m}</th>
        ))}
      </tr>
    )
  }

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: COR.fundo, fontFamily: "-apple-system,'Inter',sans-serif",
      overflow: 'hidden',
    }}>

      {/* ── HEADER ── */}
      <div style={{
        background: `linear-gradient(135deg,${COR.azulEscuro},${COR.azulMedio})`,
        padding: '18px 28px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="1.5"/>
                <polygon points="10,3 11.2,9.4 10,8.5 8.8,9.4" fill="white"/>
                <polygon points="10,17 8.8,10.6 10,11.5 11.2,10.6" fill="white" opacity=".5"/>
              </svg>
            </div>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>
              Compass <span style={{ fontWeight: 300, opacity: 0.75 }}>One</span>
            </span>
          </div>
          <nav style={{ display: 'flex', gap: 2 }}>
            {NAV.map(n => (
              <button key={n.path} onClick={() => navigate(n.path)} style={{
                padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
                background: n.path === '/planejamento' ? 'rgba(255,255,255,0.2)' : 'transparent',
                color: n.path === '/planejamento' ? '#fff' : 'rgba(255,255,255,0.6)',
              }}>{n.label}</button>
            ))}
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 6 }}>
            ✏ Clique em qualquer valor para editar
          </span>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 600 }}>G</div>
        </div>
      </div>

      {/* ── TÍTULO ── */}
      <div style={{ padding: '14px 24px 8px', flexShrink: 0 }}>
        <h1 style={{ fontSize: 17, fontWeight: 700, color: COR.texto, margin: 0 }}>Planejamento 2026</h1>
        <p style={{ fontSize: 12, color: COR.textoSuave, marginTop: 3 }}>
          Fluxo de caixa · <span style={{ color: COR.azul }}>Mês atual destacado</span> · Enter para confirmar edição
        </p>
      </div>

      {/* ── CONTAINER DA TABELA ── */}
      <div style={{ flex: 1, padding: '0 24px 12px', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          border: `1px solid ${COR.borda}`, borderRadius: 12,
          background: COR.branco, overflow: 'hidden',
        }}>

          {/* ════════════════════════════════════════
              PAINEL FIXO (não rola verticalmente)
              Contém: cabeçalho dos meses + resumo
              Rola apenas horizontalmente em sincronia
          ════════════════════════════════════════ */}
          <div style={{ overflow: 'hidden', flexShrink: 0, borderBottom: `3px solid ${COR.azul}` }}>
            {/* Container interno que traduz o scroll horizontal */}
            <div style={{ transform: `translateX(-${scrollX}px)`, width: tabelaW }}>
              <table style={{ borderCollapse: 'collapse', width: tabelaW, tableLayout: 'fixed' }}>
                <thead><LinhaHeader /></thead>
                <tbody>
                  {RESUMO_DEF.map((def, idx) => {
                    const dados  = resumoDados[idx]
                    const ultimo = idx === RESUMO_DEF.length - 1
                    return (
                      <tr key={def.label}>
                        <td style={{
                          width: COL_CAT, padding: '9px 16px',
                          fontWeight: 700, fontSize: 12,
                          color: idx === 3 ? COR.texto : (def.cor ?? COR.texto),
                          background: def.bg,
                          borderBottom: ultimo ? 'none' : `1px solid ${COR.borda}`,
                          whiteSpace: 'nowrap',
                        }}>
                          {def.label}
                        </td>
                        {dados.map((v, i) => (
                          <td key={i} style={{
                            width: COL_MES, padding: '9px 12px', textAlign: 'right',
                            fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                            background: i === mesAtual ? '#c7d9f8' : def.bg,
                            borderBottom: ultimo ? 'none' : `1px solid ${COR.borda}`,
                            color: idx === 3 ? corSaldo(v) : (def.cor ?? COR.texto),
                          }}>
                            {fmt(v, true)}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ════════════════════════════════════════
              PAINEL ROLANTE (rola horizontal e vertical)
              Contém: categorias de entradas e saídas
          ════════════════════════════════════════ */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            style={{ flex: 1, overflow: 'auto' }}
          >
            <table style={{ borderCollapse: 'collapse', width: tabelaW, tableLayout: 'fixed' }}>
              <tbody>

                {/* ── CABEÇALHO ENTRADAS ── */}
                <tr>
                  <td colSpan={13} style={{
                    padding: '6px 16px', background: '#d4edda',
                    fontWeight: 700, fontSize: 10, color: '#155724',
                    textTransform: 'uppercase', letterSpacing: 0.8,
                    borderBottom: '1px solid #a8d5b5',
                  }}>
                    ↑ Entradas
                  </td>
                </tr>

                {entradas.map((cat, ri) => (
                  <tr key={cat.nome}>
                    <td style={{
                      position: 'sticky', left: 0, zIndex: 2,
                      width: COL_CAT,
                      background: ri % 2 === 0 ? COR.limp : COR.listrado,
                      padding: '0 16px', fontSize: 12, color: COR.texto,
                      borderBottom: `1px solid ${COR.borda}`,
                      height: 36, verticalAlign: 'middle', whiteSpace: 'nowrap',
                    }}>
                      {cat.nome}
                    </td>
                    {cat.v.map((v, ci) => (
                      <Celula key={ci} tipo="e" row={ri} col={ci} valor={v} corTexto={COR.verde} ri={ri} />
                    ))}
                  </tr>
                ))}

                {/* Total Entradas */}
                <tr>
                  <td style={{
                    position: 'sticky', left: 0, zIndex: 2,
                    width: COL_CAT, background: '#e6f4ea',
                    padding: '9px 16px', fontWeight: 700, fontSize: 12, color: COR.verde,
                    borderBottom: `1px solid ${COR.borda}`, borderTop: '1px solid #a8d5b5',
                    whiteSpace: 'nowrap',
                  }}>Total Entradas</td>
                  {totalEntradas.map((v, i) => (
                    <td key={i} style={{
                      width: COL_MES, padding: '9px 12px', textAlign: 'right',
                      fontSize: 12, fontWeight: 600, color: COR.verde,
                      background: i === mesAtual ? '#dbeafe' : '#e6f4ea',
                      borderBottom: `1px solid ${COR.borda}`,
                      borderTop: '1px solid #a8d5b5', whiteSpace: 'nowrap',
                    }}>{fmt(v, true)}</td>
                  ))}
                </tr>

                {/* ── CABEÇALHO SAÍDAS ── */}
                <tr>
                  <td colSpan={13} style={{
                    padding: '6px 16px', background: '#f8d7da',
                    fontWeight: 700, fontSize: 10, color: '#721c24',
                    textTransform: 'uppercase', letterSpacing: 0.8,
                    borderTop: '2px solid #dc2626', borderBottom: '1px solid #f1aeb5',
                  }}>
                    ↓ Saídas
                  </td>
                </tr>

                {saidas.map((cat, ri) => (
                  <tr key={cat.nome}>
                    <td style={{
                      position: 'sticky', left: 0, zIndex: 2,
                      width: COL_CAT,
                      background: ri % 2 === 0 ? COR.limp : COR.listrado,
                      padding: '0 16px',
                      borderBottom: `1px solid ${COR.borda}`,
                      height: 36, verticalAlign: 'middle', whiteSpace: 'nowrap',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 17, height: 17, borderRadius: 4, fontSize: 9, fontWeight: 700, flexShrink: 0,
                          background: cat.t === 'D' ? '#fef9c3' : '#eff6ff',
                          color: cat.t === 'D' ? '#92400e' : COR.azul,
                        }}>{cat.t}</span>
                        <span style={{ fontSize: 12, color: COR.texto }}>{cat.nome}</span>
                      </div>
                    </td>
                    {cat.v.map((v, ci) => (
                      <Celula key={ci} tipo="s" row={ri} col={ci} valor={v} corTexto={COR.texto} ri={ri} />
                    ))}
                  </tr>
                ))}

                {/* Total Saídas */}
                <tr>
                  <td style={{
                    position: 'sticky', left: 0, zIndex: 2,
                    width: COL_CAT, background: '#fce8e6',
                    padding: '9px 16px', fontWeight: 700, fontSize: 12, color: COR.vermelho,
                    borderTop: '1px solid #f1aeb5', whiteSpace: 'nowrap',
                  }}>Total Saídas</td>
                  {totalSaidas.map((v, i) => (
                    <td key={i} style={{
                      width: COL_MES, padding: '9px 12px', textAlign: 'right',
                      fontSize: 12, fontWeight: 600, color: COR.vermelho,
                      background: i === mesAtual ? '#dbeafe' : '#fce8e6',
                      borderTop: '1px solid #f1aeb5', whiteSpace: 'nowrap',
                    }}>{fmt(v, true)}</td>
                  ))}
                </tr>

              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── LEGENDA ── */}
      <div style={{ display: 'flex', gap: 20, padding: '6px 24px 12px', fontSize: 11, color: COR.textoSuave, flexWrap: 'wrap', flexShrink: 0, alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ background: '#fef9c3', color: '#92400e', padding: '1px 6px', borderRadius: 3, fontWeight: 700, fontSize: 10 }}>D</span> Débito direto
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ background: '#eff6ff', color: COR.azul, padding: '1px 6px', borderRadius: 3, fontWeight: 700, fontSize: 10 }}>C</span> Cartão de crédito
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#dbeafe', border: `1px solid ${COR.azul}`, display: 'inline-block' }} /> Mês atual
        </span>
        <span>— = Sem valor previsto</span>
      </div>
    </div>
  )
}