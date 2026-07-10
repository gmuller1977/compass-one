import { useApp } from '../context/AppContext'
import type { PlanoAnoData } from '../context/AppContext'
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { iconeCategoria } from '../utils/categoriaIcone'
import AppHeader from '../components/AppHeader'

const COR = {
  azul: '#1a56db', azulEscuro: '#0f2878', azulMedio: '#2563eb',
  fundo: '#f0f4ff', branco: '#ffffff', texto: '#0f172a',
  textoSuave: '#64748b', borda: '#e2e8f0',
  verde: '#16a34a', vermelho: '#dc2626',
}

const MESES      = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const BADGE_MOV: Record<string, { label: string; bg: string; cor: string }> = {
  banco:    { label: 'B', bg: '#eff6ff', cor: '#1a56db' },
  cartao:   { label: 'C', bg: '#f3e8ff', cor: '#7c3aed' },
  dinheiro: { label: 'D', bg: '#f0fdf4', cor: '#16a34a' },
}

type Cat      = { id?: string; nome: string; t?: string; v: number[] }
type AnoData  = { saldoInicialJan: number; entradas: Cat[]; saidas: Cat[] }
type Editando = { tipo: 'e'|'s'; row: number; mes: number } | null

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
function caixaCor(v: number) {
  if (v > 0) return { bg:'#eff6ff', bd:'#bfdbfe', txt:'#1a56db' }
  if (v < 0) return { bg:'#fff5f5', bd:'#fecaca', txt:'#dc2626' }
  return { bg:'#f8fafc', bd:'#e2e8f0', txt:'#94a3b8' }
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
  const n = nome.toLowerCase()
  return n.includes('cart') && (/cr[eé]d/.test(n) || n.includes('fatura'))
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

  const [anoAtual,         setAnoAtual]        = useState(2026)
  const [aba,              setAba]             = useState<'previsto' | 'real'>('previsto')
  const [editando,         setEditando]        = useState<Editando>(null)
  const [valorTemp,        setValorTemp]       = useState('')
  const [editandoObj,      setEditandoObj]     = useState<number | null>(null)
  const [objTemp,          setObjTemp]         = useState('')
  const [saldoAberto,      setSaldoAberto]     = useState(false)
  const [showBannerCopiar, setShowBannerCopiar]= useState(false)
  const [reajustePerc,     setReajustePerc]    = useState('0')
  const [mesesAbertos,     setMesesAbertos]    = useState<Set<number>>(() => new Set<number>())

  // ── Dados base (categorias ativas zeradas) ──
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
    new Set(contas.filter(c => c.tipo === 'cartao').map(c => c.nome.toLowerCase())), [contas])

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
    return { ...salvo, saldoInicialJan: SALDO_INICIAL_FIXO, entradas: merge(dadosBase.entradas, salvo.entradas), saidas: merge(dadosBase.saidas, salvo.saidas) }
  }, [aba, anoAtual, dadosBase, planos, planosReal, SALDO_INICIAL_FIXO])

  const somaCartaoMes = useMemo(() =>
    MESES.map((_, i) => i === 0 ? 0 : dadosAno.saidas
      .filter(c => c.t === 'cartao' && !nomeFaturaCartao(c.nome, cartaoNomes))
      .reduce((s, c) => s + c.v[i - 1], 0)),
    [dadosAno, cartaoNomes])

  const dadosAnoFinal: AnoData = useMemo(() => ({
    ...dadosAno,
    saidas: dadosAno.saidas.map(cat =>
      nomeFaturaCartao(cat.nome, cartaoNomes) ? { ...cat, v: somaCartaoMes } : cat
    ),
  }), [dadosAno, somaCartaoMes, cartaoNomes])

  const { totalEntradas, totalSaidas, saldoInicial, saldoFinal } =
    useMemo(() => calcSaldos(dadosAnoFinal, true), [dadosAnoFinal])

  // Total de saídas lançadas em contas cartão por mês (para fatura na aba Realizado)
  const lancadoCartaoMes = useMemo(() => {
    let faturasDados: Record<string, { lancamentos: Record<number, { tipo: string; valor: number }[]> }> = {}
    try { const r = localStorage.getItem('compass_fatura_dados'); if (r) faturasDados = JSON.parse(r) } catch { /* */ }
    const result: Record<number, number> = {}
    for (let mes = 0; mes < 12; mes++) {
      result[mes] = 0
      contas.filter(c => c.tipo === 'cartao').forEach(conta => {
        const key = `${conta.id}-${anoAtual}-${String(mes+1).padStart(2,'0')}`
        const dm = faturasDados[key]
        if (!dm) return
        const nDias = new Date(anoAtual, mes + 1, 0).getDate()
        for (let d = 1; d <= nDias; d++) {
          ;(dm.lancamentos[d] ?? []).forEach((l: { tipo: string; valor: number }) => {
            if (l.tipo === 'saida') result[mes] += l.valor
          })
        }
      })
    }
    return result
  }, [contas, anoAtual])

  // Lançamentos reais somados por categoria e mês (para a aba Realizado)
  const lancadoPorCatMes = useMemo(() => {
    const result: Record<number, Record<string, number>> = {}
    for (let mes = 0; mes < 12; mes++) {
      result[mes] = {}
      contas.forEach(conta => {
        const key = `${conta.id}-${anoAtual}-${String(mes+1).padStart(2,'0')}`
        const dados = extratoData[key]
        if (!dados) return
        Object.values(dados.lancamentos).flat().forEach(l => {
          result[mes][l.categoria] = (result[mes][l.categoria] ?? 0) + l.valor
        })
        // Fixas consolidadas também contam
        if (dados.fixasConsolidadas) {
          const fixasAtivas = categorias.filter(c => c.fixa && c.ativa && conta.tipo !== 'cartao')
          fixasAtivas.forEach(f => {
            if (dados.fixasConsolidadas?.[f.id]) {
              const val = dados.fixasValorOverride?.[f.id] ?? f.valorPadrao ?? 0
              result[mes][f.nome] = (result[mes][f.nome] ?? 0) + val
            }
          })
        }
      })
    }
    return result
  }, [contas, categorias, extratoData, anoAtual])

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

  const mesTemSaldoReal = useMemo(() => Array.from({ length: 12 }, (_, mes) => {
    if (aba !== 'real' || mes === 0) return false
    return contasSaldoIni.filter(c => c.incluirNoSaldoInicial !== false)
      .some(c => !!extratoData[`${c.id}-${anoAtual}-${String(mes).padStart(2, '0')}`]?.saldoBanco)
  }), [aba, anoAtual, extratoData, contasSaldoIni])

  // Objetivos mensais — sempre lidos do previsto
  const objetivosAno: number[] = (planos[anoAtual] as PlanoAnoData | undefined)?.objetivos ?? new Array(12).fill(0)

  // ── Helpers de update ──
  function updateAno(fn: (d: AnoData) => AnoData) {
    if (planejamentoLockado && aba === 'previsto') return
    if (aba === 'previsto') {
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
      ? { ...c, incluirNoSaldoInicial: c.incluirNoSaldoInicial === false ? true : false } : c)
    setContas(novasContas)
    const novoSaldo = novasContas
      .filter(c => (c.tipo === 'corrente' || c.tipo === 'poupanca') && c.incluirNoSaldoInicial !== false)
      .reduce((s, c) => s + c.saldoInicial, 0)
    updateAno(d => ({ ...d, saldoInicialJan: novoSaldo }))
  }
  function updateObjetivo(mes: number, valor: number) {
    if (planejamentoLockado) return
    setPlanos(prev => {
      const atual = (prev[anoAtual] ?? { saldoInicialJan: 0, entradas: [], saidas: [] }) as PlanoAnoData
      const objs = atual.objetivos ?? new Array(12).fill(0)
      return { ...prev, [anoAtual]: { ...atual, objetivos: objs.map((v, i) => i === mes ? valor : v) } }
    })
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
  function replicarLinhaMes(tipo: 'e'|'s', ri: number, mesOrigem: number) {
    const valor = tipo === 'e'
      ? dadosAno.entradas[ri]?.v[mesOrigem] ?? 0
      : dadosAnoFinal.saidas[ri]?.v[mesOrigem] ?? 0
    if (tipo === 'e') {
      setEntradas(prev => prev.map((c, i) => i === ri ? { ...c, v: new Array(12).fill(valor) } : c))
    } else {
      setSaidas(prev => prev.map((c, i) => i === ri ? { ...c, v: new Array(12).fill(valor) } : c))
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
  function navegarAno(delta: number) {
    const novoAno = anoAtual + delta
    if (!planos[novoAno]) {
      let saldoIni = 0
      const ant = planos[novoAno - 1] as AnoData | undefined
      if (ant) { const { saldoFinal: sf } = calcSaldos(ant as AnoData); saldoIni = sf[11] }
      setPlanos(prev => ({ ...prev, [novoAno]: criarAnoZerado(dadosAno, saldoIni) as PlanoAnoData }))
      setShowBannerCopiar(!!planos[novoAno - 1])
      setReajustePerc('0')
    } else {
      setShowBannerCopiar(false)
    }
    setAnoAtual(novoAno)
    setEditando(null)
  }
  function toggleMes(i: number) {
    setMesesAbertos(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i); else next.add(i)
      return next
    })
  }

  // ── Edição de valores ──
  function iniciarValor(tipo: 'e'|'s', row: number, mes: number, valor: number) {
    setEditando({ tipo, row, mes })
    setValorTemp(valor === 0 ? '' : valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
  }
  function confirmarValor() {
    if (!editando) return
    const novo = parseBRL(valorTemp)
    const { tipo, row, mes } = editando
    if (tipo === 'e') {
      setEntradas(prev => prev.map((c, ri) =>
        ri === row ? { ...c, v: c.v.map((v, ci) => ci === mes ? novo : v) } : c))
    } else {
      setSaidas(prev => prev.map((c, ri) =>
        ri === row ? { ...c, v: c.v.map((v, ci) => ci === mes ? novo : v) } : c))
    }
    // Avança para a próxima linha editável do mesmo mês
    const lista = tipo === 'e' ? dadosAno.entradas : dadosAnoFinal.saidas
    let next = row + 1
    while (next < lista.length && tipo === 's' && nomeFaturaCartao(lista[next].nome, cartaoNomes)) next++
    if (next < lista.length) {
      const v = lista[next].v[mes]
      setEditando({ tipo, row: next, mes })
      setValorTemp(v === 0 ? '' : v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
    } else {
      setEditando(null)
    }
  }

  const bloqueado = planejamentoLockado && aba === 'previsto'

  // ── Renderização de célula de valor (dentro do accordion) ──
  function renderValor(tipo: 'e'|'s', row: number, mes: number, valor: number, readOnly = false) {
    const ativo = editando?.tipo === tipo && editando.row === row && editando.mes === mes
    if (ativo && !bloqueado) {
      return (
        <input autoFocus value={valorTemp}
          onChange={e => setValorTemp(e.target.value)}
          onFocus={e => e.target.select()}
          onBlur={confirmarValor}
          onKeyDown={e => {
            if (e.key === 'Enter')  confirmarValor()
            if (e.key === 'Escape') setEditando(null)
          }}
          style={{ width:110, padding:'4px 8px', textAlign:'right', border:'none', outline:'none',
            background:'#dbeafe', color:COR.azulEscuro, fontSize:13, fontFamily:'inherit',
            fontWeight:600, borderRadius:6, boxShadow:`inset 0 -2px 0 ${COR.azul}` }} />
      )
    }
    const corVal = readOnly
      ? (valor === 0 ? '#c4b5fd' : '#7c3aed')
      : (valor === 0 ? '#c0cce0' : COR.texto)
    return (
      <div
        onClick={readOnly || bloqueado ? undefined : () => iniciarValor(tipo, row, mes, valor)}
        style={{ padding:'4px 8px', textAlign:'right', fontSize:13, color:corVal,
          fontWeight: readOnly ? 600 : 400, whiteSpace:'nowrap', userSelect:'none',
          cursor: readOnly || bloqueado ? 'default' : 'pointer',
          borderRadius:6, minWidth:110,
          background: ativo ? '#dbeafe' : 'transparent',
          transition:'background .1s' }}
        onMouseEnter={e => { if (!readOnly && !bloqueado) (e.currentTarget as HTMLElement).style.background='#f1f5fb' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='transparent' }}>
        {fmt(valor)}
      </div>
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
          <h1 style={{ fontSize:17, fontWeight:700, color:COR.texto, margin:0 }}>Planejamento</h1>
          <p style={{ fontSize:12, color:COR.textoSuave, marginTop:3 }}>
            Fluxo de caixa mensal · Abra um ou vários meses para planejar
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:0,
          background:COR.branco, border:`1px solid ${COR.borda}`,
          borderRadius:10, overflow:'hidden', flexShrink:0 }}>
          <button onClick={() => navegarAno(-1)} style={{ border:'none', background:'transparent',
            cursor:'pointer', padding:'8px 14px', fontSize:16, color:COR.textoSuave }}
            onMouseEnter={e => (e.currentTarget.style.background='#f0f4ff')}
            onMouseLeave={e => (e.currentTarget.style.background='transparent')}>←</button>
          <div style={{ padding:'8px 16px', borderLeft:`1px solid ${COR.borda}`,
            borderRight:`1px solid ${COR.borda}`, textAlign:'center', minWidth:80 }}>
            <div style={{ fontSize:15, fontWeight:700, color:COR.texto }}>{anoAtual}</div>
            {anoAtual === anoCorrente && (
              <div style={{ fontSize:9, color:COR.azul, fontWeight:600,
                textTransform:'uppercase', letterSpacing:.5 }}>Ano atual</div>
            )}
          </div>
          <button onClick={() => navegarAno(+1)} style={{ border:'none', background:'transparent',
            cursor:'pointer', padding:'8px 14px', fontSize:16, color:COR.textoSuave }}
            onMouseEnter={e => (e.currentTarget.style.background='#f0f4ff')}
            onMouseLeave={e => (e.currentTarget.style.background='transparent')}>→</button>
        </div>
      </div>

      {/* ABAS + BOTÃO FINALIZAR */}
      <div style={{ padding:'0 24px 8px', flexShrink:0,
        display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', gap:4, background:COR.branco,
          border:`1px solid ${COR.borda}`, borderRadius:9, padding:3 }}>
          {(['previsto','real'] as const).map(v => (
            <button key={v} onClick={() => { setAba(v); setEditando(null) }} style={{
              padding:'5px 18px', borderRadius:6, border:'none', cursor:'pointer',
              fontFamily:'inherit', fontSize:12, fontWeight:600,
              background: aba === v ? COR.azul : 'transparent',
              color:       aba === v ? '#fff'   : COR.textoSuave, transition:'all .15s' }}>
              {v === 'previsto' ? 'Previsto' : 'Realizado'}
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

      {/* ATALHOS */}
      {aba === 'previsto' && !planejamentoLockado && (
        <div style={{ margin:'0 24px 8px', flexShrink:0, background:'#e8edf8',
          border:`1px solid #c7d2f5`, borderRadius:10,
          padding:'8px 14px', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <span style={{ fontSize:11, color:COR.azulEscuro, fontWeight:700,
            textTransform:'uppercase', letterSpacing:.5, marginRight:4 }}>Atalhos</span>
          {temValoresPadrao && (
            <button onClick={preencherValoresPadrao} style={{ border:`1px solid ${COR.azul}`,
              background:COR.branco, borderRadius:7, padding:'5px 12px', cursor:'pointer',
              fontSize:12, color:COR.azul, fontFamily:'inherit', fontWeight:600 }}>
              ✦ Preencher valores padrão
            </button>
          )}
          <button onClick={replicarJaneiroParaAno} style={{ border:`1px solid ${COR.azul}`,
            background:COR.branco, borderRadius:7, padding:'5px 12px', cursor:'pointer',
            fontSize:12, color:COR.azul, fontFamily:'inherit', fontWeight:600 }}>
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
        <div style={{ margin:'0 24px 8px', flexShrink:0, background:'#fffbeb',
          border:'1px solid #fcd34d', borderRadius:10, padding:'10px 16px',
          display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <span style={{ fontSize:12, color:'#92400e', fontWeight:600, flex:1, minWidth:200 }}>
            Copiar planejamento de <strong>{anoAtual - 1}</strong> para {anoAtual}?
          </span>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:12, color:'#92400e' }}>Reajuste:</span>
            <input value={reajustePerc} onChange={e => setReajustePerc(e.target.value)}
              style={{ width:56, padding:'4px 8px', border:'1px solid #fcd34d',
                borderRadius:6, fontSize:12, textAlign:'right',
                fontFamily:'inherit', background:'#fff', color:'#92400e' }} />
            <span style={{ fontSize:12, color:'#92400e' }}>%</span>
            <button onClick={() => {
              copiarAnoAnteriorComReajuste(anoAtual - 1, anoAtual, parseFloat(reajustePerc) || 0)
              setShowBannerCopiar(false)
            }} style={{ padding:'5px 14px', border:'none', borderRadius:7, cursor:'pointer',
              fontFamily:'inherit', fontSize:12, fontWeight:600, color:'#fff', background:'#d97706' }}>
              Aplicar
            </button>
            <button onClick={() => setShowBannerCopiar(false)} style={{
              padding:'5px 12px', border:'1px solid #fcd34d', borderRadius:7, cursor:'pointer',
              fontFamily:'inherit', fontSize:12, fontWeight:500, color:'#92400e', background:'transparent' }}>
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
          { label:'Entrada anual',  valor:totalE,         cor:'#16a34a',    bg:'#f0fdf4', borda:'#bbf7d0', icon:'↑' },
          { label:'Saída anual',    valor:totalS,         cor:COR.vermelho, bg:'#fff5f5', borda:'#fecaca', icon:'↓' },
          { label:'Resultado',      valor:resultado,
            cor:   resultado >= 0 ? '#16a34a' : COR.vermelho,
            bg:    resultado >= 0 ? '#f0fdf4' : '#fff5f5',
            borda: resultado >= 0 ? '#bbf7d0' : '#fecaca', icon: resultado >= 0 ? '↗' : '↘' },
          { label:'Saldo dezembro', valor:saldoFinal[11],
            cor:   corSaldo(saldoFinal[11]),
            bg:    saldoFinal[11] >= 0 ? '#eff6ff' : '#fff5f5',
            borda: saldoFinal[11] >= 0 ? '#bfdbfe' : '#fecaca', icon:'◎' },
        ]
        return (
          <div style={{ margin:'0 24px 10px', flexShrink:0, display:'flex', gap:8 }}>
            {itens.map(m => (
              <div key={m.label} style={{ flex:1, background:m.bg, border:`1.5px solid ${m.borda}`,
                borderRadius:12, padding:'10px 14px', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
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

      {/* ÁREA PRINCIPAL: accordion de meses */}
      <div style={{ flex:1, overflow:'auto', padding:'0 24px 24px', minHeight:0 }}>

        {/* Placeholder: aba Real ainda não finalizada */}
        {aba === 'real' && !realExiste && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'center', height:'100%', gap:16, paddingBottom:40 }}>
            <div style={{ fontSize:40 }}>📋</div>
            <div style={{ fontSize:15, fontWeight:700, color:COR.texto }}>
              Planejamento realizado não iniciado
            </div>
            <div style={{ fontSize:13, color:COR.textoSuave, textAlign:'center', maxWidth:380 }}>
              Vá para a aba <strong>Previsto</strong>, revise os valores e clique em{' '}
              <strong>Finalizar planejamento</strong> para criar uma cópia do planejamento realizado.
            </div>
            <button onClick={() => setAba('previsto')} style={{
              padding:'8px 20px', border:`1.5px solid ${COR.azul}`, borderRadius:8,
              background:'#eff6ff', color:COR.azul, fontSize:13, fontWeight:600,
              cursor:'pointer', fontFamily:'inherit' }}>
              Ir para Previsto
            </button>
          </div>
        )}

        {(aba === 'previsto' || realExiste) && (
          <div style={{ display:'flex', flexDirection:'column', gap:6, paddingTop:4 }}>

            {/* ── SALDO INICIAL ── */}
            <div style={{ background:COR.branco, borderRadius:12,
              border:`1px solid ${COR.borda}`, overflow:'hidden' }}>
              <div onClick={() => setSaldoAberto(a => !a)}
                style={{ display:'flex', alignItems:'center',
                  padding:'10px 14px', cursor:'pointer', gap:10 }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='#f8faff'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='transparent'}>
                {/* Label — mesma largura mínima que o nome do mês */}
                <div style={{ minWidth:96, display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                  <span style={{ fontSize:8, color:COR.textoSuave, display:'inline-block',
                    transition:'transform .2s', transform: saldoAberto ? 'rotate(180deg)' : 'none' }}>▼</span>
                  <span style={{ fontSize:16, fontWeight:700, color:COR.azulEscuro, whiteSpace:'nowrap' }}>
                    Saldo a ser considerado no planejamento
                  </span>
                </div>
                <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'flex-end' }}>
                  {(() => { const c = caixaCor(SALDO_INICIAL_FIXO); return (
                    <div style={{ background:c.bg, border:`1px solid ${c.bd}`,
                      borderRadius:8, padding:'5px 14px', minWidth:110, flexShrink:0 }}>
                      <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase',
                        letterSpacing:.4, color:c.txt }}>Valor</div>
                      <div style={{ fontSize:13, fontWeight:700, color:c.txt }}>
                        {fmt(SALDO_INICIAL_FIXO, true)}
                      </div>
                    </div>
                  )})()}
                </div>
              </div>
              {saldoAberto && (
                <div style={{ padding:'10px 16px 14px 28px', background:'#eff6ff',
                  borderTop:`1px solid ${COR.borda}` }}>
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
                          border:`1px solid ${COR.borda}`, cursor:'pointer', opacity: incluida ? 1 : 0.55 }}>
                          <input type="checkbox" checked={incluida}
                            onChange={() => toggleContaNoSaldoInicial(c.id)} style={{ cursor:'pointer' }} />
                          <div style={{ width:26, height:26, borderRadius:7, background:c.cor,
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:13, flexShrink:0 }}>{c.icone}</div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12, fontWeight:500, color:COR.texto }}>{c.nome}</div>
                            <div style={{ fontSize:10, color:COR.textoSuave, marginTop:1 }}>
                              {c.banco} · {c.tipo === 'corrente' ? 'Conta corrente' : 'Poupança'}
                            </div>
                          </div>
                          <div style={{ fontSize:12, fontWeight:600, color: incluida ? COR.azul : COR.textoSuave }}>
                            {fmt(c.saldoInicial, true)}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── ACCORDION DE MESES ── */}
            {MESES_FULL.map((nomeMes, mi) => {
              const aberto  = mesesAbertos.has(mi)
              const ehAtual = mi === mesAtual && anoAtual === anoCorrente
              const te = totalEntradas[mi]
              const ts = totalSaidas[mi]
              const sf = saldoFinal[mi]
              const si = saldoInicialReal[mi]
              const obj = objetivosAno[mi]
              const dif = obj > 0 ? sf - obj : null
              const bordaHeader = ehAtual ? COR.azul : COR.borda

              return (
                <div key={mi} style={{ borderRadius:12,
                  border:`1.5px solid ${aberto ? bordaHeader : COR.borda}`,
                  transition:'border-color .15s', background:COR.branco }}>

                  {/* ── CABEÇALHO DO MÊS (sticky) ── */}
                  <div onClick={() => toggleMes(mi)}
                    style={{ position:'sticky', top:0, zIndex:10,
                      display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
                      cursor:'pointer',
                      background: ehAtual ? '#dbeafe' : COR.branco,
                      borderRadius: aberto ? '10px 10px 0 0' : 10,
                      borderBottom: aberto ? `1px solid ${COR.borda}` : 'none',
                      boxShadow:'0 2px 6px rgba(0,0,0,0.06)' }}>

                    {/* Nome do mês */}
                    <div style={{ minWidth:96, display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                      <span style={{ fontSize:8, color: aberto ? COR.azul : COR.textoSuave,
                        display:'inline-block', transition:'transform .2s',
                        transform: aberto ? 'rotate(180deg)' : 'none' }}>▼</span>
                      <span style={{ fontSize:16, fontWeight:700,
                        color: ehAtual ? COR.azul : COR.texto }}>{nomeMes}</span>
                      {ehAtual && (
                        <span style={{ fontSize:8, background:COR.azul, color:'#fff',
                          padding:'1px 5px', borderRadius:10, fontWeight:700,
                          textTransform:'uppercase', letterSpacing:.3, flexShrink:0 }}>atual</span>
                      )}
                    </div>

                    {aberto ? (
                      /* ── ABERTO: boxes completos ── */
                      <div style={{ flex:1, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>

                        {/* Entradas */}
                        <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0',
                          borderRadius:8, padding:'6px 14px', minWidth:110 }}>
                          <div style={{ fontSize:9, color:'#16a34a', fontWeight:700,
                            textTransform:'uppercase', letterSpacing:.4 }}>Entradas</div>
                          <div style={{ fontSize:13, fontWeight:700, color:'#16a34a', whiteSpace:'nowrap', marginTop:1 }}>
                            {te === 0 ? '—' : te.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                          </div>
                        </div>

                        {/* Saídas */}
                        <div style={{ background:'#fff5f5', border:'1px solid #fecaca',
                          borderRadius:8, padding:'6px 14px', minWidth:110 }}>
                          <div style={{ fontSize:9, color:COR.vermelho, fontWeight:700,
                            textTransform:'uppercase', letterSpacing:.4 }}>Saídas</div>
                          <div style={{ fontSize:13, fontWeight:700, color:COR.vermelho, whiteSpace:'nowrap', marginTop:1 }}>
                            {ts === 0 ? '—' : ts.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                          </div>
                        </div>

                        {/* Meta (sempre editável) */}
                        <div
                          onClick={e => {
                            e.stopPropagation()
                            setEditandoObj(mi)
                            setObjTemp(obj === 0 ? '' : obj.toLocaleString('pt-BR',{minimumFractionDigits:2}))
                          }}
                          style={{ background:'#faf5ff',
                            border:`1px solid ${editandoObj === mi ? '#a855f7' : '#ddd6fe'}`,
                            borderRadius:8, padding:'6px 14px', minWidth:110,
                            cursor:'pointer' }}>
                          <div style={{ fontSize:9, color:'#7c3aed', fontWeight:700,
                            textTransform:'uppercase', letterSpacing:.4 }}>Meta</div>
                          {editandoObj === mi ? (
                            <input autoFocus value={objTemp}
                              onChange={e => setObjTemp(e.target.value)}
                              onFocus={e => e.target.select()}
                              onClick={e => e.stopPropagation()}
                              onBlur={() => { updateObjetivo(mi, parseBRL(objTemp)); setEditandoObj(null) }}
                              onKeyDown={e => {
                                e.stopPropagation()
                                if (e.key === 'Enter' || e.key === 'Escape') {
                                  if (e.key === 'Enter') updateObjetivo(mi, parseBRL(objTemp))
                                  setEditandoObj(null)
                                }
                              }}
                              style={{ width:100, padding:0, border:'none', outline:'none',
                                background:'transparent', color:'#7c3aed',
                                fontSize:13, fontFamily:'inherit', fontWeight:700, marginTop:1 }} />
                          ) : (
                            <div style={{ fontSize:13, fontWeight:700, whiteSpace:'nowrap', marginTop:1,
                              color: obj === 0 ? '#c4b5fd' : '#7c3aed' }}>
                              {obj === 0 ? 'Definir…' : obj.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                            </div>
                          )}
                        </div>

                        {/* Diferença */}
                        <div style={{ background: dif===null ? '#f8fafc' : dif>=0 ? '#f0fdf4' : '#fff5f5',
                          border:`1px solid ${dif===null ? COR.borda : dif>=0 ? '#bbf7d0' : '#fecaca'}`,
                          borderRadius:8, padding:'6px 14px', minWidth:110 }}>
                          <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase',
                            letterSpacing:.4, color:dif===null ? COR.textoSuave : dif>=0?'#16a34a':COR.vermelho }}>
                            Diferença
                          </div>
                          <div style={{ fontSize:13, fontWeight:700, whiteSpace:'nowrap', marginTop:1,
                            color:dif===null ? '#cbd5e1' : dif>=0?'#16a34a':COR.vermelho }}>
                            {dif===null ? '—' : `${dif>=0?'+':''}${dif.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}`}
                          </div>
                        </div>

                        {/* Saldo Final */}
                        <div style={{ background: sf<0 ? '#fff5f5' : sf<1000 ? '#fffbeb' : '#f0fdf4',
                          border:`1px solid ${sf<0?'#fecaca':sf<1000?'#fde68a':'#bbf7d0'}`,
                          borderRadius:8, padding:'6px 14px', minWidth:110 }}>
                          <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase',
                            letterSpacing:.4, color:corSaldo(sf) }}>Saldo Final</div>
                          <div style={{ fontSize:13, fontWeight:700, whiteSpace:'nowrap', marginTop:1,
                            color:corSaldo(sf) }}>
                            {sf.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* ── FECHADO: saldo inicial · movimentação · saldo final (caixas) ── */
                      <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, justifyContent:'flex-end' }}>
                        {(() => { const c = caixaCor(si); return (
                          <div style={{ background:c.bg, border:`1px solid ${c.bd}`,
                            borderRadius:8, padding:'6px 14px', minWidth:110 }}>
                            <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase',
                              letterSpacing:.4, color:c.txt }}>Saldo Inicial</div>
                            <div style={{ fontSize:13, fontWeight:700, color:c.txt, marginTop:1 }}>
                              {si.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                            </div>
                          </div>
                        )})()}
                        {(() => { const mov = te-ts; const c = caixaCor(mov); return (
                          <div style={{ background:c.bg, border:`1px solid ${c.bd}`,
                            borderRadius:8, padding:'6px 14px', minWidth:110 }}>
                            <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase',
                              letterSpacing:.4, color:c.txt }}>Movimentação</div>
                            <div style={{ fontSize:13, fontWeight:700, color:c.txt, marginTop:1 }}>
                              {mov >= 0 ? '+' : ''}{mov.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                            </div>
                          </div>
                        )})()}
                        {(() => { const c = caixaCor(sf); return (
                          <div style={{ background:c.bg, border:`1px solid ${c.bd}`,
                            borderRadius:8, padding:'6px 14px', minWidth:110 }}>
                            <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase',
                              letterSpacing:.4, color:c.txt }}>Saldo Final</div>
                            <div style={{ fontSize:13, fontWeight:700, color:c.txt, marginTop:1 }}>
                              {sf.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                            </div>
                          </div>
                        )})()}
                      </div>
                    )}
                  </div>

                  {/* ── CORPO DO MÊS (quando aberto) ── */}
                  {aberto && (
                    <div style={{ borderTop:`1px solid ${COR.borda}` }}>

                      {/* Saldo Inicial do mês */}
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                        padding:'8px 16px', background:'#f8faff',
                        borderBottom:`1px solid ${COR.borda}` }}>
                        <span style={{ fontSize:11, color:COR.textoSuave, fontWeight:600 }}>
                          Saldo Inicial{mi === 0 ? ' de Janeiro' : ` (Saldo Final de ${MESES[mi-1]})`}
                        </span>
                        <span style={{ fontSize:12, fontWeight:700, color:corSaldo(si),
                          display:'flex', alignItems:'center', gap:6 }}>
                          {si.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                          {mesTemSaldoReal[mi] && (
                            <span style={{ fontSize:10, background:'#f0fdf4', color:'#16a34a',
                              border:'1px solid #bbf7d0', borderRadius:4, padding:'0 4px' }}>extrato</span>
                          )}
                        </span>
                      </div>

                      {/* ── ENTRADAS ── */}
                      <div style={{ borderBottom:`1px solid ${COR.borda}` }}>
                        <div style={{ fontSize:11, fontWeight:700, color:'#166534',
                          textTransform:'uppercase', letterSpacing:.6,
                          padding:'7px 16px', background:'#dcfce7',
                          borderBottom:'1px solid #bbf7d0', display:'flex',
                          alignItems:'center', justifyContent:'space-between' }}>
                          <span>↑ Entradas</span>
                          <span>{te.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</span>
                        </div>
                        <div style={{ padding:'4px 16px 0' }}>
                        {aba === 'real' && (
                          <div style={{ display:'flex', alignItems:'center', gap:8,
                            padding:'4px 0 2px', fontSize:9, fontWeight:700,
                            color:COR.textoSuave, textTransform:'uppercase', letterSpacing:.5 }}>
                            <div style={{ width:22, flexShrink:0 }}/>
                            <div style={{ width:16, flexShrink:0 }}/>
                            <div style={{ minWidth:140, flexShrink:0 }}>Categoria</div>
                            <div style={{ minWidth:90, textAlign:'right', flexShrink:0 }}>Previsto</div>
                            <div style={{ minWidth:90, textAlign:'right', flexShrink:0 }}>Realizado</div>
                            <div style={{ minWidth:80, textAlign:'right', flexShrink:0 }}>Saldo</div>
                            <div style={{ width:110, paddingLeft:8, flexShrink:0 }}>Consumo</div>
                          </div>
                        )}
                        {(aba === 'real' ? dadosBase.entradas : dadosAno.entradas).map((cat, ri) => {
                          const { icone, cor: corIcone } = iconeCategoria(categorias, cat.nome)
                          const tm = categorias.find(c => c.nome === cat.nome)?.tipoMovimento ?? cat.t
                          const bm = tm ? BADGE_MOV[tm] : null
                          const previsto = aba === 'real'
                            ? ((planos[anoAtual] as AnoData | undefined)?.entradas.find(c => c.nome === cat.nome)?.v[mi] ?? 0)
                            : 0
                          const lancado = aba === 'real' ? (lancadoPorCatMes[mi]?.[cat.nome] ?? 0) : 0
                          const pct = previsto > 0 ? Math.min(100, (lancado / previsto) * 100) : (lancado > 0 ? 100 : 0)
                          const saldo = lancado - previsto
                          return (
                            <div key={ri} style={{ display:'flex', alignItems:'center', gap:8,
                              padding:'5px 0', borderBottom:'1px solid #f8faff' }}>
                              <div style={{ width:22, height:22, borderRadius:6, background:corIcone,
                                display:'flex', alignItems:'center', justifyContent:'center',
                                fontSize:12, flexShrink:0 }}>{icone}</div>
                              {aba === 'real'
                                ? <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
                                    width:16, height:16, borderRadius:3, fontSize:9, fontWeight:700, flexShrink:0,
                                    background: bm?.bg ?? 'transparent', color: bm?.cor ?? 'transparent',
                                    visibility: bm ? 'visible' : 'hidden' }}>{bm?.label}</span>
                                : bm && <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
                                    width:16, height:16, borderRadius:3, fontSize:9, fontWeight:700, flexShrink:0,
                                    background:bm.bg, color:bm.cor }}>{bm.label}</span>}
                              <span onClick={() => navigate('/configuracoes', { state:{ aba:'categorias', catNome:cat.nome } })}
                                style={{ fontSize:13, color:COR.texto, cursor:'pointer',
                                  textDecoration:'none', minWidth:140, flexShrink:0 }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color=COR.azul}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color=COR.texto}>
                                {cat.nome}
                              </span>
                              {aba === 'real' ? (
                                <>
                                  <span style={{ minWidth:90, textAlign:'right', flexShrink:0,
                                    fontSize:12, color:COR.textoSuave }}>
                                    {previsto > 0 ? previsto.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : '—'}
                                  </span>
                                  <span style={{ minWidth:90, textAlign:'right', flexShrink:0,
                                    fontSize:12, fontWeight:700,
                                    color: lancado >= previsto && previsto > 0 ? '#16a34a' : lancado > 0 ? COR.azul : COR.textoSuave }}>
                                    {lancado > 0 ? lancado.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : '—'}
                                  </span>
                                  <span style={{ minWidth:80, textAlign:'right', flexShrink:0, fontSize:12, fontWeight:700,
                                    color: saldo > 0 ? '#16a34a' : saldo < 0 ? COR.vermelho : COR.textoSuave }}>
                                    {(previsto > 0 || lancado > 0) ? saldo.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : '—'}
                                  </span>
                                  <div style={{ width:110, display:'flex', alignItems:'center', gap:4, paddingLeft:8, flexShrink:0 }}>
                                    <div style={{ flex:1, height:8, background:'#e2e8f0', borderRadius:4, overflow:'hidden' }}>
                                      <div style={{ height:'100%', borderRadius:4, transition:'width .3s',
                                        background: pct >= 100 ? '#16a34a' : pct >= 60 ? COR.azul : '#94a3b8',
                                        width:`${pct}%` }}/>
                                    </div>
                                    <span style={{ fontSize:10, color:COR.textoSuave,
                                      minWidth:28, textAlign:'right', flexShrink:0 }}>
                                      {Math.round(pct)}%
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  {renderValor('e', ri, mi, cat.v[mi])}
                                  <div style={{ flex:1 }}/>
                                  {!bloqueado && (
                                    <button onClick={() => replicarLinhaMes('e', ri, mi)}
                                      title={`Replicar ${MESES[mi]} para todos os meses`}
                                      style={{ border:'none', background:'#dbeafe', cursor:'pointer',
                                        borderRadius:4, padding:'2px 6px', fontSize:9, color:COR.azul,
                                        fontWeight:700, fontFamily:'inherit', flexShrink:0, lineHeight:1.4,
                                        opacity: cat.v[mi] === 0 ? 0.4 : 1 }}>
                                      →12
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          )
                        })}
                        {dadosAno.entradas.length === 0 && (
                          <div style={{ fontSize:12, color:COR.textoSuave, padding:'8px 0' }}>
                            Nenhuma categoria de entrada.
                          </div>
                        )}
                        <div style={{ padding:'6px 0' }}>
                          <button onClick={() => navigate('/configuracoes', { state:{ aba:'categorias' } })}
                            style={{ border:'1px dashed #93c5fd', background:'transparent',
                              borderRadius:6, padding:'3px 10px', cursor:'pointer',
                              fontSize:11, color:COR.azul, fontFamily:'inherit' }}>
                            + Categoria de entrada
                          </button>
                        </div>
                        </div>{/* fecha padding interno */}
                      </div>

                      {/* ── SAÍDAS ── */}
                      <div>
                        <div style={{ fontSize:11, fontWeight:700, color:'#7f1d1d',
                          textTransform:'uppercase', letterSpacing:.6,
                          padding:'7px 16px', background:'#fee2e2',
                          borderBottom:'1px solid #fecaca', display:'flex',
                          alignItems:'center', justifyContent:'space-between' }}>
                          <span>↓ Saídas</span>
                          <span>{ts.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</span>
                        </div>
                        <div style={{ padding:'4px 16px 0' }}>
                        {aba === 'real' && (
                          <div style={{ display:'flex', alignItems:'center', gap:8,
                            padding:'4px 0 2px', fontSize:9, fontWeight:700,
                            color:COR.textoSuave, textTransform:'uppercase', letterSpacing:.5 }}>
                            <div style={{ width:22, flexShrink:0 }}/>
                            <div style={{ width:16, flexShrink:0 }}/>
                            <div style={{ minWidth:140, flexShrink:0 }}>Categoria</div>
                            <div style={{ minWidth:90, textAlign:'right', flexShrink:0 }}>Previsto</div>
                            <div style={{ minWidth:90, textAlign:'right', flexShrink:0 }}>Realizado</div>
                            <div style={{ minWidth:80, textAlign:'right', flexShrink:0 }}>Saldo</div>
                            <div style={{ width:110, paddingLeft:8, flexShrink:0 }}>Consumo</div>
                          </div>
                        )}
                        {(aba === 'real' ? dadosBase.saidas : dadosAnoFinal.saidas).map((cat, ri) => {
                          const { icone, cor: corIcone } = iconeCategoria(categorias, cat.nome)
                          const tm = categorias.find(c => c.nome === cat.nome)?.tipoMovimento ?? cat.t
                          const bm = tm ? BADGE_MOV[tm] : null
                          const ehFatura = nomeFaturaCartao(cat.nome, cartaoNomes)
                          const previsto = aba === 'real'
                            ? ((planos[anoAtual] as AnoData | undefined)?.saidas.find(c => c.nome === cat.nome)?.v[mi] ?? 0)
                            : 0
                          const lancado = aba === 'real'
                            ? ehFatura
                              ? (mi > 0 ? lancadoCartaoMes[mi - 1] : 0) + (lancadoPorCatMes[mi]?.[cat.nome] ?? 0)
                              : (lancadoPorCatMes[mi]?.[cat.nome] ?? 0)
                            : 0
                          const prevAbs = Math.abs(previsto)
                          const lancAbs = Math.abs(lancado)
                          const pct = prevAbs > 0 ? Math.min(100, (lancAbs / prevAbs) * 100) : (lancAbs > 0 ? 100 : 0)
                          const saldo = prevAbs - lancAbs
                          return (
                            <div key={ri} style={{ display:'flex', alignItems:'center', gap:8,
                              padding:'5px 0', borderBottom:'1px solid #fdf8f8' }}>
                              <div style={{ width:22, height:22, borderRadius:6, background:corIcone,
                                display:'flex', alignItems:'center', justifyContent:'center',
                                fontSize:12, flexShrink:0 }}>{icone}</div>
                              {aba === 'real'
                                ? <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
                                    width:16, height:16, borderRadius:3, fontSize:9, fontWeight:700, flexShrink:0,
                                    background: bm?.bg ?? 'transparent', color: bm?.cor ?? 'transparent',
                                    visibility: bm ? 'visible' : 'hidden' }}>{bm?.label}</span>
                                : bm && <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
                                    width:16, height:16, borderRadius:3, fontSize:9, fontWeight:700, flexShrink:0,
                                    background:bm.bg, color:bm.cor }}>{bm.label}</span>}
                              <span onClick={() => navigate('/configuracoes', { state:{ aba:'categorias', catNome:cat.nome } })}
                                style={{ fontSize:13, color: ehFatura ? '#7c3aed' : COR.texto,
                                  cursor:'pointer', flexShrink:0, minWidth:140 }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color=COR.azul}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = ehFatura ? '#7c3aed' : COR.texto}>
                                {cat.nome}
                                {ehFatura && <span style={{ fontSize:10, color:'#c4b5fd', marginLeft:4 }}>(auto)</span>}
                              </span>
                              {aba === 'real' ? (
                                <>
                                  <span style={{ minWidth:90, textAlign:'right', flexShrink:0,
                                    fontSize:12, color:COR.textoSuave }}>
                                    {prevAbs > 0 ? prevAbs.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : '—'}
                                  </span>
                                  <span style={{ minWidth:90, textAlign:'right', flexShrink:0,
                                    fontSize:12, fontWeight:700,
                                    color: pct >= 100 ? COR.vermelho : lancAbs > 0 ? COR.texto : COR.textoSuave }}>
                                    {lancAbs > 0 ? lancAbs.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : '—'}
                                  </span>
                                  <span style={{ minWidth:80, textAlign:'right', flexShrink:0, fontSize:12, fontWeight:700,
                                    color: saldo > 0 ? '#16a34a' : saldo < 0 ? COR.vermelho : COR.textoSuave }}>
                                    {(prevAbs > 0 || lancAbs > 0) ? saldo.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : '—'}
                                  </span>
                                  <div style={{ width:110, display:'flex', alignItems:'center', gap:4, paddingLeft:8, flexShrink:0 }}>
                                    <div style={{ flex:1, height:8, background:'#e2e8f0', borderRadius:4, overflow:'hidden' }}>
                                      <div style={{ height:'100%', borderRadius:4, transition:'width .3s',
                                        background: pct >= 100 ? COR.vermelho : pct >= 80 ? '#f59e0b' : '#94a3b8',
                                        width:`${pct}%` }}/>
                                    </div>
                                    <span style={{ fontSize:10, color:COR.textoSuave,
                                      minWidth:28, textAlign:'right', flexShrink:0 }}>
                                      {Math.round(pct)}%
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  {renderValor('s', ri, mi, cat.v[mi], ehFatura)}
                                  <div style={{ flex:1 }}/>
                                  {!bloqueado && !ehFatura && (
                                    <button onClick={() => replicarLinhaMes('s', ri, mi)}
                                      title={`Replicar ${MESES[mi]} para todos os meses`}
                                      style={{ border:'none', background:'#fee2e2', cursor:'pointer',
                                        borderRadius:4, padding:'2px 6px', fontSize:9, color:COR.vermelho,
                                        fontWeight:700, fontFamily:'inherit', flexShrink:0, lineHeight:1.4,
                                        opacity: cat.v[mi] === 0 ? 0.4 : 1 }}>
                                      →12
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          )
                        })}
                        {dadosAnoFinal.saidas.length === 0 && (
                          <div style={{ fontSize:12, color:COR.textoSuave, padding:'8px 0' }}>
                            Nenhuma categoria de saída.
                          </div>
                        )}
                        <div style={{ padding:'6px 0' }}>
                          <button onClick={() => navigate('/configuracoes', { state:{ aba:'categorias' } })}
                            style={{ border:'1px dashed #fca5a5', background:'transparent',
                              borderRadius:6, padding:'3px 10px', cursor:'pointer',
                              fontSize:11, color:'#be123c', fontFamily:'inherit' }}>
                            + Categoria de saída
                          </button>
                        </div>
                        </div>{/* fecha padding interno */}
                      </div>

                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* LEGENDA */}
      <div style={{ display:'flex', gap:20, padding:'6px 24px 12px',
        fontSize:11, color:COR.textoSuave, flexWrap:'wrap',
        flexShrink:0, alignItems:'center', borderTop:`1px solid ${COR.borda}` }}>
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
        <span>→12 Replicar valor do mês para o ano todo</span>
        <span style={{ color:'#7c3aed' }}>(auto) Fatura calculada automaticamente do mês anterior</span>
      </div>

    </div>
  )
}
