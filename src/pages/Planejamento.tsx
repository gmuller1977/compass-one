import { useApp } from '../context/AppContext'
import type { PlanoAnoData } from '../context/AppContext'
import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { iconeCategoria } from '../utils/categoriaIcone'
import AppHeader from '../components/AppHeader'

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

type Cat     = { id?: string; nome: string; t?: string; v: number[] }
type AnoData = { saldoInicialJan: number; entradas: Cat[]; saidas: Cat[] }
type Editando = { tipo: 'e'|'s'; row: number; col: number } | null
type HoverCat = { tipo: 'e'|'s'; ri: number } | null


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
function calcSaldos(data: AnoData, exclCartao = false) {
  const totalE = Array.from({ length: 12 }, (_, i) =>
    data.entradas.reduce((s, c) => s + c.v[i], 0))
  const totalS = Array.from({ length: 12 }, (_, i) =>
    (exclCartao ? data.saidas.filter(c => c.t !== 'cartao') : data.saidas)
      .reduce((s, c) => s + c.v[i], 0))
  const si: number[] = [], sf: number[] = []
  for (let i = 0; i < 12; i++) {
    const s = i === 0 ? data.saldoInicialJan : sf[i - 1]
    si.push(s); sf.push(s + totalE[i] - totalS[i])
  }
  return { totalEntradas: totalE, totalSaidas: totalS, saldoInicial: si, saldoFinal: sf }
}

function nomeFaturaCartao(nome: string, cartaoNomes: Set<string>): boolean {
  if (cartaoNomes.has(nome.toLowerCase())) return true
  // eslint-disable-next-line no-misleading-character-class
  const n = nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  return n.includes('cart') && (n.includes('cred') || n.includes('fatura'))
}
function criarAnoZerado(template: AnoData, saldoIni: number): AnoData {
  return {
    saldoInicialJan: saldoIni,
    entradas: template.entradas.map(c => ({ ...c, v: new Array(12).fill(0) })),
    saidas:   template.saidas.map(c =>   ({ ...c, v: new Array(12).fill(0) })),
  }
}



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
  const scrollBodyRef = useRef<HTMLDivElement>(null)
  const scrollFootRef = useRef<HTMLDivElement>(null)
  const [saldoAberto,   setSaldoAberto]   = useState(false)
  const [showBannerCopiar, setShowBannerCopiar] = useState(false)
  const [reajustePerc,  setReajustePerc]  = useState('0')

  const dadosBase: AnoData = useMemo(() => ({
    saldoInicialJan: SALDO_INICIAL_FIXO,
    entradas: categorias
      .filter(c => c.tipo === 'entrada' && c.ativa)
      .map(c => ({ id: c.id, nome: c.nome, t: c.tipoMovimento, v: new Array(12).fill(0) }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    saidas: categorias
      .filter(c => c.tipo === 'saida' && c.ativa)
      .map(c => ({ id: c.id, nome: c.nome, t: c.tipoMovimento, v: new Array(12).fill(0) }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
  }), [SALDO_INICIAL_FIXO, categorias])

  const cartaoNomes = useMemo(() =>
    new Set(contas.filter(c => c.tipo === 'cartao').map(c => c.nome.toLowerCase())),
    [contas])

  const temValoresPadrao = useMemo(() =>
    categorias.some(c => (c.valorPadrao ?? 0) > 0 && c.ativa), [categorias])

  const realExiste = !!planosReal[anoAtual]
  const dadosAno: AnoData = useMemo(() => {
    if (aba === 'real') {
      return (planosReal[anoAtual] as AnoData | undefined)
        ?? { saldoInicialJan: SALDO_INICIAL_FIXO, entradas: [], saidas: [] }
    }
    const salvo = planos[anoAtual] as AnoData | undefined
    if (!salvo) return dadosBase
    const merge = (base: Cat[], saved: Cat[]) =>
      base.map(cat => {
        const found = saved.find(c => (cat.id && c.id === cat.id) || c.nome === cat.nome)
        return found ? { ...cat, v: found.v } : cat
      })
    return {
      ...salvo,
      entradas: merge(dadosBase.entradas, salvo.entradas),
      saidas:   merge(dadosBase.saidas,   salvo.saidas),
    }
  }, [aba, anoAtual, dadosBase, planos, planosReal, SALDO_INICIAL_FIXO])

  // Soma mensal de todas as categorias cartão (para auto-calcular "Cartão de Crédito")
  // Fatura do cartão cai no mês seguinte (compras de Jan são pagas em Fev).
  // Exclui a própria categoria fatura para evitar dupla contagem caso ela tenha t='cartao'.
  const somaCartaoMes = useMemo(() =>
    MESES.map((_, i) => i === 0 ? 0 : dadosAno.saidas
      .filter(c => c.t === 'cartao' && !nomeFaturaCartao(c.nome, cartaoNomes))
      .reduce((s, c) => s + c.v[i - 1], 0)),
    [dadosAno, cartaoNomes])

  // dadosAno com a categoria "Cartão de Crédito" substituída pela soma das categorias cartão
  const dadosAnoFinal: AnoData = useMemo(() => ({
    ...dadosAno,
    saidas: dadosAno.saidas.map(cat =>
      nomeFaturaCartao(cat.nome, cartaoNomes) ? { ...cat, v: somaCartaoMes } : cat
    ),
  }), [dadosAno, somaCartaoMes, cartaoNomes])

  // Saldos excluem categorias cartão individualmente (evita dupla contagem com a fatura)
  const { totalEntradas, totalSaidas, saldoInicial, saldoFinal } =
    useMemo(() => calcSaldos(dadosAnoFinal, true), [dadosAnoFinal])

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
    if (planejamentoLockado && aba === 'previsto') return
    if (aba === 'previsto') {
      // usa dadosAno (merged) como base — garante que categorias novas existam e índices batam
      setPlanos(prev => ({ ...prev, [anoAtual]: fn(dadosAno) as PlanoAnoData }))
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

  // ── Atalhos de planejamento ──
  function preencherValoresPadrao() {
    updateAno(d => ({
      ...d,
      entradas: d.entradas.map(cat => {
        const vp = categorias.find(c => c.nome === cat.nome)?.valorPadrao ?? 0
        return vp > 0 ? { ...cat, v: new Array(12).fill(vp) } : cat
      }),
      saidas: d.saidas.map(cat => {
        const vp = categorias.find(c => c.nome === cat.nome)?.valorPadrao ?? 0
        return vp > 0 ? { ...cat, v: new Array(12).fill(vp) } : cat
      }),
    }))
  }
  function replicarJaneiroParaAno() {
    updateAno(d => ({
      ...d,
      entradas: d.entradas.map(cat => ({ ...cat, v: new Array(12).fill(cat.v[0]) })),
      saidas:   d.saidas.map(cat =>   ({ ...cat, v: new Array(12).fill(cat.v[0]) })),
    }))
  }
  function replicarLinha(tipo: 'e'|'s', ri: number) {
    if (tipo === 'e') {
      setEntradas(prev => prev.map((c, i) =>
        i === ri ? { ...c, v: new Array(12).fill(c.v[0]) } : c))
    } else {
      setSaidas(prev => prev.map((c, i) =>
        i === ri ? { ...c, v: new Array(12).fill(c.v[0]) } : c))
    }
  }
  function copiarAnoAnteriorComReajuste(anoBase: number, anoNovo: number, percReaj: number) {
    const base = planos[anoBase] as AnoData | undefined
    if (!base) return
    const fator = 1 + percReaj / 100
    const round = (v: number) => Math.round(v * fator * 100) / 100
    setPlanos(prev => ({
      ...prev,
      [anoNovo]: {
        saldoInicialJan: base.saldoInicialJan,
        entradas: base.entradas.map(c => ({ ...c, v: c.v.map(round) })),
        saidas:   base.saidas.map(c =>   ({ ...c, v: c.v.map(round) })),
      } as PlanoAnoData,
    }))
  }

  // ── Navegação de ano ──
  function navegarAno(delta: number) {
    const novoAno = anoAtual + delta
    if (!planos[novoAno]) {
      let saldoIni = 0
      const ant = planos[novoAno - 1] as AnoData | undefined
      if (ant) { const { saldoFinal: sf } = calcSaldos(ant); saldoIni = sf[11] }
      setPlanos(prev => ({ ...prev, [novoAno]: criarAnoZerado(dadosAno, saldoIni) as PlanoAnoData }))
      setShowBannerCopiar(!!planos[novoAno - 1])
      setReajustePerc('0')
    } else {
      setShowBannerCopiar(false)
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
    const { tipo, row, col } = editando
    if (tipo === 'e') {
      setEntradas(prev => prev.map((c, ri) =>
        ri === row ? { ...c, v: c.v.map((v, ci) => ci === col ? novo : v) } : c))
    } else {
      setSaidas(prev => prev.map((c, ri) =>
        ri === row ? { ...c, v: c.v.map((v, ci) => ci === col ? novo : v) } : c))
    }
    // Avança para a próxima linha editável da mesma coluna
    const lista = tipo === 'e' ? dadosAno.entradas : dadosAnoFinal.saidas
    let next = row + 1
    while (next < lista.length && tipo === 's' && nomeFaturaCartao(lista[next].nome, cartaoNomes)) next++
    if (next < lista.length) {
      const v = lista[next].v[col]
      setEditando({ tipo, row: next, col })
      setValorTemp(v === 0 ? '' : v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
    } else {
      setEditando(null)
    }
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
    // Bloqueia edição no previsto quando planejamento está travado
    const bloqueado = planejamentoLockado && aba === 'previsto'
    return (
      <td key={col} style={{ padding:0, background:bgNormal(ri, col),
        borderBottom:`1px solid ${COR.borda}`,
        width:COL_MES, minWidth:COL_MES, cursor: bloqueado ? 'default' : 'pointer' }}>
        {ativo && !bloqueado ? (
          <input autoFocus value={valorTemp}
            onChange={e => setValorTemp(e.target.value)}
            onFocus={e => e.target.select()}
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
          <div onClick={bloqueado ? undefined : () => iniciarValor(tipo, row, col, valor)}
            style={{ padding:'7px 12px', textAlign:'right', fontSize:12,
              color: valor === 0 ? '#c0cce0' : corTexto,
              fontWeight:400, whiteSpace:'nowrap', userSelect:'none' }}>
            {fmt(valor)}
          </div>
        )}
      </td>
    )
  }

  // ── Célula read-only para categoria de fatura cartão ──
  function renderCelulaFatura(valor: number, ri: number, ci: number) {
    return (
      <td key={ci} style={{ padding:0,
        background: ci === mesAtual ? '#ede9fe' : (ri % 2 === 0 ? '#faf5ff' : '#f5f3ff'),
        borderBottom:`1px solid ${COR.borda}`,
        width:COL_MES, minWidth:COL_MES }}>
        <div style={{ padding:'7px 12px', textAlign:'right', fontSize:12,
          color: valor === 0 ? '#c4b5fd' : '#7c3aed',
          fontWeight:500, whiteSpace:'nowrap', userSelect:'none' }}>
          {fmt(valor)}
        </div>
      </td>
    )
  }

  // ── Célula de nome — clique navega para Configurações (Cadastro de Categorias) ──
  function renderNome(
    tipo: 'e'|'s', ri: number, nome: string,
    bgBase: string, badge?: React.ReactNode, ehReadOnly = false
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
          height:40, verticalAlign:'middle', whiteSpace:'nowrap',
          padding:'0 12px 0 24px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:20, height:20, borderRadius:5, background:corIcone,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:11, flexShrink:0 }}>{icone}</div>
          {badge}
          <span style={{ fontSize:12, color:COR.texto, flex:1 }}>{nome}</span>
          {hover && aba === 'previsto' && !planejamentoLockado && !ehReadOnly && (
            <button
              onClick={e => { e.stopPropagation(); replicarLinha(tipo, ri) }}
              title="Replicar valor de Janeiro para todos os meses"
              style={{ border:'none', background:'#dbeafe', cursor:'pointer',
                borderRadius:4, padding:'2px 6px', fontSize:9, color:COR.azul,
                fontWeight:700, fontFamily:'inherit', flexShrink:0, lineHeight:1.4 }}>
              Jan→
            </button>
          )}
        </div>
      </td>
    )
  }

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column',
      background:COR.fundo, fontFamily:"-apple-system,'Inter',sans-serif", overflow:'hidden' }}>

      <AppHeader currentPath="/planejamento" />

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

      {/* ATALHOS DE PLANEJAMENTO */}
      {aba === 'previsto' && !planejamentoLockado && (
        <div style={{ margin:'0 24px 8px', flexShrink:0,
          background:'#e8edf8', border:`1px solid #c7d2f5`, borderRadius:10,
          padding:'8px 14px', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <span style={{ fontSize:11, color:COR.azulEscuro, fontWeight:700,
            textTransform:'uppercase', letterSpacing:.5, marginRight:4 }}>
            Atalhos
          </span>
          {temValoresPadrao && (
            <button onClick={preencherValoresPadrao} style={{
              border:`1px solid ${COR.azul}`, background:COR.branco, borderRadius:7,
              padding:'5px 12px', cursor:'pointer', fontSize:12,
              color:COR.azul, fontFamily:'inherit', fontWeight:600 }}>
              ✦ Preencher valores padrão
            </button>
          )}
          <button onClick={replicarJaneiroParaAno} style={{
            border:`1px solid ${COR.azul}`, background:COR.branco, borderRadius:7,
            padding:'5px 12px', cursor:'pointer', fontSize:12,
            color:COR.azul, fontFamily:'inherit', fontWeight:600 }}>
            ↦ Replicar Jan → ano todo
          </button>
          {!!planos[anoAtual - 1] && (
            <button onClick={() => { setShowBannerCopiar(true); setReajustePerc('0') }} style={{
              border:`1px solid ${COR.azul}`, background:COR.branco, borderRadius:7,
              padding:'5px 12px', cursor:'pointer', fontSize:12,
              color:COR.azul, fontFamily:'inherit', fontWeight:600 }}>
              ↺ Copiar {anoAtual - 1}
            </button>
          )}
        </div>
      )}

      {/* BANNER COPIAR ANO ANTERIOR */}
      {showBannerCopiar && aba === 'previsto' && !planejamentoLockado && (
        <div style={{ margin:'0 24px 8px', flexShrink:0,
          background:'#fffbeb', border:'1px solid #fcd34d',
          borderRadius:10, padding:'10px 16px',
          display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <span style={{ fontSize:12, color:'#92400e', fontWeight:600, flex:1, minWidth:200 }}>
            Copiar planejamento de <strong>{anoAtual - 1}</strong> para {anoAtual}?
          </span>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:12, color:'#92400e' }}>Reajuste:</span>
            <input value={reajustePerc}
              onChange={e => setReajustePerc(e.target.value)}
              style={{ width:56, padding:'4px 8px', border:'1px solid #fcd34d',
                borderRadius:6, fontSize:12, textAlign:'right',
                fontFamily:'inherit', background:'#fff', color:'#92400e' }} />
            <span style={{ fontSize:12, color:'#92400e' }}>%</span>
            <button onClick={() => {
              copiarAnoAnteriorComReajuste(anoAtual - 1, anoAtual, parseFloat(reajustePerc) || 0)
              setShowBannerCopiar(false)
            }} style={{ padding:'5px 14px', border:'none', borderRadius:7, cursor:'pointer',
              fontFamily:'inherit', fontSize:12, fontWeight:600, color:'#fff',
              background:'#d97706' }}>
              Aplicar
            </button>
            <button onClick={() => setShowBannerCopiar(false)} style={{
              padding:'5px 12px', border:'1px solid #fcd34d', borderRadius:7, cursor:'pointer',
              fontFamily:'inherit', fontSize:12, fontWeight:500, color:'#92400e',
              background:'transparent' }}>
              Manter em branco
            </button>
          </div>
        </div>
      )}

      {/* SUMÁRIO ANUAL */}
      {(aba === 'previsto' || realExiste) && (() => {
        const totalE    = totalEntradas.reduce((a, b) => a + b, 0)
        const totalS    = totalSaidas.reduce((a, b) => a + b, 0)
        const resultado = totalE - totalS
        const itens = [
          { label: 'Entrada anual',  valor: totalE,         cor: '#16a34a',    bg: '#f0fdf4', borda: '#bbf7d0', icon: '↑' },
          { label: 'Saída anual',    valor: totalS,         cor: COR.vermelho, bg: '#fff5f5', borda: '#fecaca', icon: '↓' },
          { label: 'Resultado',      valor: resultado,
            cor:   resultado >= 0 ? '#16a34a' : COR.vermelho,
            bg:    resultado >= 0 ? '#f0fdf4' : '#fff5f5',
            borda: resultado >= 0 ? '#bbf7d0' : '#fecaca', icon: resultado >= 0 ? '↗' : '↘' },
          { label: 'Saldo dezembro', valor: saldoFinal[11],
            cor:   corSaldo(saldoFinal[11]),
            bg:    saldoFinal[11] >= 0 ? '#eff6ff' : '#fff5f5',
            borda: saldoFinal[11] >= 0 ? '#bfdbfe' : '#fecaca', icon: '◎' },
        ]
        return (
          <div style={{ margin:'0 24px 10px', flexShrink:0, display:'flex', gap:8 }}>
            {itens.map(m => (
              <div key={m.label} style={{ flex:1, background:m.bg,
                border:`1.5px solid ${m.borda}`, borderRadius:12, padding:'10px 14px',
                boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize:10, color:COR.textoSuave, fontWeight:600,
                  textTransform:'uppercase', letterSpacing:.5, marginBottom:4,
                  display:'flex', alignItems:'center', gap:4 }}>
                  <span style={{ fontSize:13, color:m.cor }}>{m.icon}</span> {m.label}
                </div>
                <div style={{ fontSize:16, fontWeight:700, color:m.cor }}>
                  {m.valor.toLocaleString('pt-BR', { style:'currency', currency:'BRL' })}
                </div>
              </div>
            ))}
          </div>
        )
      })()}

      {/* TABELA */}
      <div style={{ flex:1, padding:'0 24px', minHeight:0, display:'flex', flexDirection:'column' }}>

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
        <div ref={scrollBodyRef} style={{ flex:1, overflow:'auto', paddingBottom:12 }}
          onScroll={e => { if (scrollFootRef.current) scrollFootRef.current.scrollLeft = e.currentTarget.scrollLeft }}>
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
                      {dadosAnoFinal.saidas.map((cat, ri) => {
                        const tm = categorias.find(c => c.nome === cat.nome)?.tipoMovimento
                          ?? (cat.t === 'D' ? 'banco' : cat.t === 'C' ? 'cartao' : undefined)
                        const bm = tm ? BADGE_MOV[tm] : null
                        const ehFatura = nomeFaturaCartao(cat.nome, cartaoNomes)
                        return (
                          <tr key={`s-${ri}`}>
                            {renderNome('s', ri, cat.nome, ri % 2 === 0 ? '#fff8f8' : '#fff1f2',
                              bm && <span style={{ display:'inline-flex', alignItems:'center',
                                justifyContent:'center', width:16, height:16, borderRadius:3,
                                fontSize:9, fontWeight:700, flexShrink:0,
                                background:bm.bg, color:bm.cor }}>{bm.label}</span>,
                              ehFatura
                            )}
                            {cat.v.map((v, ci) => ehFatura
                              ? renderCelulaFatura(v, ri, ci)
                              : renderCelula('s', ri, ci, v, COR.texto, ri)
                            )}
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

            </div>

          </div>
        </div>
        )}

        {/* SALDO FINAL — fora do scroll, sempre visível */}
        {(aba === 'previsto' || realExiste) && (
          <div ref={scrollFootRef} style={{ flexShrink:0, overflow:'hidden',
            borderTop:`2px solid #0f2878` }}>
            <table style={{ borderCollapse:'collapse', tableLayout:'fixed',
              minWidth: COL_CAT + COL_MES * 12 + 2 }}>
              <colgroup>
                <col style={{ width:COL_CAT, minWidth:COL_CAT }} />
                {MESES.map((_,i) => <col key={i} style={{ width:COL_MES, minWidth:COL_MES }} />)}
              </colgroup>
              <tbody>
                <tr>
                  <td style={{ position:'sticky', left:0, zIndex:2,
                    background:COR.azul, padding:'11px 16px',
                    fontWeight:700, fontSize:12, color:'#fff',
                    borderLeft:`3px solid #0f2878`, whiteSpace:'nowrap' }}>
                    Saldo Final
                  </td>
                  {saldoFinal.map((v, i) => (
                    <td key={i} style={{ padding:'11px 12px', textAlign:'right',
                      fontSize:12, fontWeight:700, whiteSpace:'nowrap',
                      color: v < 0 ? '#fca5a5' : '#fff',
                      background: i === mesAtual ? '#1244a8' : COR.azul }}>
                      {fmt(v, true)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
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