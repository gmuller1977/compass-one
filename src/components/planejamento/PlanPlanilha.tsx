import { useState, useRef, useCallback } from 'react'
import type React from 'react'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { fmt, MESES, type AnoData } from './types'
import PlanResumoAnual from './PlanResumoAnual'
import PlanCelulaNav from './PlanCelulaNav'

interface Props {
  aba: 'meu-plano' | 'realizado'
  anoAtual: number
  mesAtual: number
  dadosAtivos: AnoData
  previsto: { totalEntradas: number[]; totalSaidas: number[]; saldoInicial: number[]; saldoFinal: number[] }
  planejamentoLockado: boolean
  categorias: any[]
  setAnoAtual: React.Dispatch<React.SetStateAction<number>>
  onSave: (tipo: 'e' | 's', ri: number, mi: number, valor: number) => void
  lancadoPorCatMes?: Record<number, { entrada: Record<string, number>; saida: Record<string, number> }>
}

type CellPos = { tipo: 'e' | 's'; ri: number; mi: number }
type Tema = 'past' | 'current' | 'future'

// Row heights — must be identical in cats column and month columns
const HH = 44  // header
const HG = 32  // group
const HC = 38  // category
const HT = 42  // total / resultado

// Summary panel row heights
const SR = 36  // summary row height
const SH = 40  // summary header height

const W_CATS = 200
const W_MES  = 130

const TC = {
  past: {
    header: '#334155', body: '#475569', text: '#e2e8f0',
    rec: '#4ade80', desp: '#f87171', saldo: '#e2e8f0',
    grp: 'rgba(255,255,255,0.05)', tot: 'rgba(255,255,255,0.07)',
    border: 'rgba(255,255,255,0.07)',
    hover: 'rgba(255,255,255,0.08)', stripe: 'rgba(255,255,255,0.04)',
  },
  current: {
    header: '#1a56db', body: '#0f2878', text: '#fff',
    rec: '#4ade80', desp: '#f87171', saldo: '#93c5fd',
    grp: 'rgba(255,255,255,0.06)', tot: 'rgba(255,255,255,0.09)',
    border: 'rgba(255,255,255,0.08)',
    hover: 'rgba(255,255,255,0.1)', stripe: 'rgba(255,255,255,0.04)',
  },
  future: {
    header: '#94a3b8', body: '#e2e8f0', text: '#475569',
    rec: '#16a34a', desp: '#dc2626', saldo: '#1a56db',
    grp: 'rgba(0,0,0,0.03)', tot: 'rgba(0,0,0,0.05)',
    border: 'rgba(0,0,0,0.04)',
    hover: 'rgba(0,0,0,0.04)', stripe: 'rgba(0,0,0,0.03)',
  },
}

// Summary panel month header bg by tema
const SUM_HDR: Record<Tema, string> = {
  past:    'rgba(255,255,255,0.1)',
  current: 'rgba(255,255,255,0.2)',
  future:  'rgba(255,255,255,0.05)',
}

function temaMes(mi: number, mesAtual: number, anoAtual: number): Tema {
  const y = new Date().getFullYear()
  if (anoAtual < y) return 'past'
  if (anoAtual > y) return 'future'
  if (mi < mesAtual) return 'past'
  if (mi === mesAtual) return 'current'
  return 'future'
}

function catLabel(cat: { nome: string; descricao?: string }) {
  return cat.descricao ? `${cat.nome} · ${cat.descricao}` : cat.nome
}

export default function PlanPlanilha({
  aba, anoAtual, mesAtual, dadosAtivos, previsto,
  planejamentoLockado, categorias, setAnoAtual, onSave,
}: Props) {
  const scrollResRef = useRef<HTMLDivElement>(null)  // painel resumo
  const scrollCatRef = useRef<HTMLDivElement>(null)  // planilha categorias
  const syncLock     = useRef(false)

  const [activeCell, setActiveCell] = useState<CellPos | null>(null)
  const [editingCell, setEditingCell] = useState<CellPos | null>(null)
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  const bloqueado = planejamentoLockado && aba === 'meu-plano'
  const nE = dadosAtivos.entradas.length
  const nS = dadosAtivos.saidas.length

  function toFlat(pos: CellPos) { return pos.tipo === 'e' ? pos.ri : nE + pos.ri }
  function fromFlat(fi: number, mi: number): CellPos | null {
    if (fi < 0 || fi >= nE + nS) return null
    return fi < nE ? { tipo: 'e', ri: fi, mi } : { tipo: 's', ri: fi - nE, mi }
  }

  function navCell(pos: CellPos, dir: 'up' | 'down' | 'left' | 'right'): CellPos | null {
    if (dir === 'left')  return pos.mi > 0  ? { ...pos, mi: pos.mi - 1 } : null
    if (dir === 'right') return pos.mi < 11 ? { ...pos, mi: pos.mi + 1 } : null
    return fromFlat(toFlat(pos) + (dir === 'up' ? -1 : 1), pos.mi)
  }

  const activate = useCallback((pos: CellPos | null) => {
    setEditingCell(null)
    setActiveCell(pos)
  }, [])

  const startEdit = useCallback((pos: CellPos) => {
    if (bloqueado) return
    setActiveCell(pos)
    setEditingCell(pos)
  }, [bloqueado])

  const handleChange = useCallback((tipo: 'e' | 's', ri: number, mi: number, v: number) => {
    onSave(tipo, ri, mi, v)
  }, [onSave])

  function handleContainerKey(e: React.KeyboardEvent) {
    if (editingCell) return
    if (!activeCell) return
    if (e.key === 'ArrowLeft')  { e.preventDefault(); setActiveCell(navCell(activeCell, 'left')) }
    else if (e.key === 'ArrowRight') { e.preventDefault(); setActiveCell(navCell(activeCell, 'right')) }
    else if (e.key === 'ArrowUp')    { e.preventDefault(); setActiveCell(navCell(activeCell, 'up')) }
    else if (e.key === 'ArrowDown')  { e.preventDefault(); setActiveCell(navCell(activeCell, 'down')) }
    else if (e.key === 'Enter')      { e.preventDefault(); startEdit(activeCell) }
    else if (e.key === 'Escape')     { setActiveCell(null) }
    else if (e.key === 'Home')       { setActiveCell({ ...activeCell, mi: 0 }) }
    else if (e.key === 'End')        { setActiveCell({ ...activeCell, mi: 11 }) }
    else if (/^\d$/.test(e.key))     { startEdit(activeCell) }
  }

  function handleScrollRes() {
    if (syncLock.current) return
    syncLock.current = true
    if (scrollCatRef.current && scrollResRef.current)
      scrollCatRef.current.scrollLeft = scrollResRef.current.scrollLeft
    requestAnimationFrame(() => { syncLock.current = false })
  }

  function handleScrollCat() {
    if (syncLock.current) return
    syncLock.current = true
    if (scrollResRef.current && scrollCatRef.current)
      scrollResRef.current.scrollLeft = scrollCatRef.current.scrollLeft
    requestAnimationFrame(() => { syncLock.current = false })
  }

  function scrollMes(delta: number) {
    const dist = delta * (W_MES + 4)
    scrollResRef.current?.scrollBy({ left: dist, behavior: 'smooth' })
    scrollCatRef.current?.scrollBy({ left: dist, behavior: 'smooth' })
  }

  const receitasAnuais = previsto.totalEntradas.reduce((a, b) => a + b, 0)
  const despesasAnuais = previsto.totalSaidas.reduce((a, b) => a + b, 0)

  function catCell(tipo: 'e' | 's', ri: number, mi: number, tema: Tema) {
    const tc = TC[tema]
    const pos: CellPos = { tipo, ri, mi }
    const ativa    = activeCell?.tipo === tipo  && activeCell.ri  === ri  && activeCell.mi  === mi
    const editando = editingCell?.tipo === tipo && editingCell.ri === ri  && editingCell.mi === mi
    const cor = tipo === 'e' ? tc.rec : tc.desp

    return (
      <PlanCelulaNav
        valor={(tipo === 'e' ? dadosAtivos.entradas : dadosAtivos.saidas)[ri]?.v[mi] ?? 0}
        editavel={!bloqueado}
        ativa={ativa}
        editando={editando}
        color={cor}
        onChange={v => handleChange(tipo, ri, mi, v)}
        onNavigate={dir => { setEditingCell(null); setActiveCell(navCell(pos, dir)) }}
        onStartEdit={() => startEdit(pos)}
        onCancelEdit={() => activate(pos)}
        onClick={() => {
          if (ativa && !editando) startEdit(pos)
          else activate(pos)
        }}
        style={{ fontSize: 13, fontWeight: 600 }}
      />
    )
  }

  const catBtnStyle: React.CSSProperties = {
    border: '1px solid rgba(255,255,255,0.25)', borderRadius: 6, width: 24, height: 24,
    background: 'rgba(255,255,255,0.12)', cursor: 'pointer', fontSize: 9,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', padding: 0,
  }

  // ── Summary panel row ─────────────────────────────────────────────────────
  function SumRow({ label, style }: { label: string; style?: React.CSSProperties }) {
    return (
      <div style={{
        height: SR, display: 'flex', alignItems: 'center', padding: '0 14px',
        fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        ...style,
      }}>
        {label}
      </div>
    )
  }

  return (
    <div
      style={{ padding: '16px 20px' }}
      tabIndex={0}
      onKeyDown={handleContainerKey}
    >
      <PlanResumoAnual
        saldoInicial={previsto.saldoInicial[0]}
        totalReceitas={receitasAnuais}
        totalDespesas={despesasAnuais}
        resultado={previsto.saldoFinal[11]}
        anoAtual={anoAtual}
        onChangeAno={delta => setAnoAtual(a => a + delta)}
      />

      {/* ─── PAINEL DE RESUMO ───────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg,#0f2878,#1a56db)',
        borderRadius: 12, marginBottom: 4, overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', flexDirection: 'row', minWidth: 'max-content' }}>

          {/* Left label column */}
          <div style={{
            minWidth: W_CATS, maxWidth: W_CATS, flexShrink: 0,
            position: 'sticky', left: 0, zIndex: 10,
            background: 'linear-gradient(135deg,#0f2878,#1a56db)',
          }}>
            {/* Header */}
            <div style={{
              height: SH, display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', padding: '0 8px 0 14px',
              fontSize: 11, fontWeight: 700, color: '#fff',
              letterSpacing: '.5px', textTransform: 'uppercase',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}>
              <span>Resumo</span>
              <div style={{ display: 'flex', gap: 2 }}>
                <button style={catBtnStyle} onClick={() => scrollMes(-1)}>◄</button>
                <button style={catBtnStyle} onClick={() => scrollMes(1)}>►</button>
              </div>
            </div>
            <SumRow label="Saldo inicial" />
            <SumRow label="(+) Receitas" />
            <SumRow label="(-) Despesas" />
            <SumRow label="Saldo final" style={{ borderBottom: 'none' }} />
          </div>

          {/* Scrollable month columns for summary */}
          <div
            ref={scrollResRef}
            onScroll={handleScrollRes}
            style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', scrollbarWidth: 'none' }}
          >
            <div style={{ display: 'flex', flexDirection: 'row' }}>
              {Array.from({ length: 12 }, (_, mi) => {
                const tema = temaMes(mi, mesAtual, anoAtual)
                const si = previsto.saldoInicial[mi]
                const sf = previsto.saldoFinal[mi]
                const te = previsto.totalEntradas[mi]
                const ts = previsto.totalSaidas[mi]
                const sfColor = sf < 0 ? '#f87171' : '#fff'

                return (
                  <div key={mi} style={{
                    minWidth: W_MES, maxWidth: W_MES, flexShrink: 0,
                    marginLeft: 2, marginRight: 2,
                  }}>
                    {/* Month header */}
                    <div style={{
                      height: SH, background: SUM_HDR[tema],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: '#fff', gap: 4,
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                    }}>
                      {MESES[mi]}
                      {tema === 'current' && (
                        <span style={{ fontSize: 7, background: 'rgba(255,255,255,0.25)', padding: '2px 5px', borderRadius: 6, fontWeight: 600 }}>ATUAL</span>
                      )}
                    </div>
                    {/* Saldo inicial */}
                    <div style={{ height: SR, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 10px', fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.8)', fontVariantNumeric: 'tabular-nums', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {fmt(si)}
                    </div>
                    {/* Receitas */}
                    <div style={{ height: SR, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 10px', fontSize: 14, fontWeight: 700, color: '#4ade80', fontVariantNumeric: 'tabular-nums', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {fmt(te)}
                    </div>
                    {/* Despesas */}
                    <div style={{ height: SR, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 10px', fontSize: 14, fontWeight: 700, color: '#f87171', fontVariantNumeric: 'tabular-nums', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {fmt(ts)}
                    </div>
                    {/* Saldo final */}
                    <div style={{ height: SR, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 10px', fontSize: 14, fontWeight: 700, color: sfColor, fontVariantNumeric: 'tabular-nums' }}>
                      {fmt(sf)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── PLANILHA DE CATEGORIAS ──────────────────────────────────────────── */}
      <div
        ref={scrollCatRef}
        onScroll={handleScrollCat}
        style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 360px)', outline: 'none', borderRadius: 10 }}
      >
        <div style={{ display: 'flex', flexDirection: 'row', minWidth: 'max-content', alignItems: 'flex-start' }}>

          {/* ── CATEGORIES COLUMN ──────────────────────────────────────────── */}
          <div style={{
            minWidth: W_CATS, maxWidth: W_CATS, flexShrink: 0,
            position: 'sticky', left: 0, zIndex: 20,
            background: '#f0f4ff',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Header */}
            <div style={{
              height: HH, position: 'sticky', top: 0, zIndex: 26,
              background: '#f0f4ff',
              display: 'flex', alignItems: 'center',
              padding: '0 12px',
              fontSize: 12, fontWeight: 700, color: '#1e293b',
            }}>
              Categorias
            </div>

            {/* Middle rows */}
            <div style={{ background: '#fff', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', flex: 1 }}>
              {/* RECEITAS group */}
              <div style={{ height: HG, display: 'flex', alignItems: 'center', padding: '0 12px', background: '#f8fafc', fontSize: 12, fontWeight: 700, color: '#1e293b', gap: 4 }}>
                ↑ RECEITAS
              </div>
              {dadosAtivos.entradas.map((cat, ri) => {
                const { icone } = iconeCategoria(categorias, cat.nome)
                const rowKey = `e-${ri}`
                const isHovered = hoveredRow === rowKey
                const isOdd = ri % 2 === 1
                return (
                  <div key={ri}
                    style={{ height: HC, display: 'flex', alignItems: 'center', padding: '0 12px 0 20px', fontSize: 12, color: '#64748b', borderBottom: '1px solid #f8fafc', gap: 4, overflow: 'hidden', background: isHovered ? 'rgba(26,86,219,0.06)' : isOdd ? 'rgba(0,0,0,0.02)' : undefined, transition: 'background .1s' }}
                    onMouseEnter={() => setHoveredRow(rowKey)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <span style={{ flexShrink: 0 }}>{icone}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{catLabel(cat)}</span>
                  </div>
                )
              })}
              <div style={{ height: HT, display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 12, fontWeight: 700, color: '#16a34a' }}>Total receitas</div>

              {/* DESPESAS group */}
              <div style={{ height: HG, display: 'flex', alignItems: 'center', padding: '0 12px', background: '#f8fafc', fontSize: 12, fontWeight: 700, color: '#1e293b', gap: 4 }}>
                ↓ DESPESAS
              </div>
              {dadosAtivos.saidas.map((cat, ri) => {
                const { icone } = iconeCategoria(categorias, cat.nome)
                const rowKey = `s-${ri}`
                const isHovered = hoveredRow === rowKey
                const isOdd = ri % 2 === 1
                return (
                  <div key={ri}
                    style={{ height: HC, display: 'flex', alignItems: 'center', padding: '0 12px 0 20px', fontSize: 12, color: '#64748b', borderBottom: '1px solid #f8fafc', gap: 4, overflow: 'hidden', background: isHovered ? 'rgba(26,86,219,0.06)' : isOdd ? 'rgba(0,0,0,0.02)' : undefined, transition: 'background .1s' }}
                    onMouseEnter={() => setHoveredRow(rowKey)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <span style={{ flexShrink: 0 }}>{icone}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{catLabel(cat)}</span>
                  </div>
                )
              })}
              <div style={{ height: HT, display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 12, fontWeight: 700, color: '#dc2626' }}>Total despesas</div>
              <div style={{ height: HT, display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 12, fontWeight: 700, color: '#1e293b' }}>= Resultado</div>
            </div>
          </div>

          {/* ── MONTH COLUMNS ──────────────────────────────────────────────── */}
          {Array.from({ length: 12 }, (_, mi) => {
            const tema = temaMes(mi, mesAtual, anoAtual)
            const tc = TC[tema]
            const totalE = previsto.totalEntradas[mi]
            const totalS = previsto.totalSaidas[mi]
            const res    = totalE - totalS

            const cell = (tipo: 'e' | 's', ri: number) => {
              const rowKey = `${tipo}-${ri}`
              const isHovered = hoveredRow === rowKey
              const isOdd = ri % 2 === 1
              const bg = isHovered ? tc.hover : isOdd ? tc.stripe : undefined
              return (
                <div key={ri}
                  style={{ height: HC, borderBottom: `1px solid ${tc.border}`, background: bg, transition: 'background .1s' }}
                  onMouseEnter={() => setHoveredRow(rowKey)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  {catCell(tipo, ri, mi, tema)}
                </div>
              )
            }

            return (
              <div key={mi} style={{
                minWidth: W_MES, maxWidth: W_MES, flexShrink: 0,
                marginLeft: 2, marginRight: 2,
                display: 'flex', flexDirection: 'column',
              }}>
                {/* Month header */}
                <div style={{
                  height: HH, position: 'sticky', top: 0, zIndex: 5,
                  background: tc.header, color: '#fff',
                  borderRadius: '8px 8px 0 0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, gap: 4, flexShrink: 0,
                }}>
                  {MESES[mi]}
                  {tema === 'current' && (
                    <span style={{ fontSize: 7, background: 'rgba(255,255,255,0.25)', padding: '2px 5px', borderRadius: 6, fontWeight: 600 }}>ATUAL</span>
                  )}
                </div>

                {/* Middle: categories */}
                <div style={{ background: tc.body, color: tc.text, flex: 1 }}>
                  {/* Receitas group header */}
                  <div style={{ height: HG, background: tc.grp, color: tc.rec, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 10px', fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums', borderBottom: `1px solid ${tc.border}` }}>
                    {fmt(totalE)}
                  </div>
                  {dadosAtivos.entradas.map((_, ri) => cell('e', ri))}
                  {/* Total receitas */}
                  <div style={{ height: HT, background: tc.tot, color: tc.rec, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 10px', fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(totalE)}
                  </div>
                  {/* Despesas group header */}
                  <div style={{ height: HG, background: tc.grp, color: tc.desp, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 10px', fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums', borderTop: `1px solid ${tc.border}`, borderBottom: `1px solid ${tc.border}` }}>
                    {fmt(totalS)}
                  </div>
                  {dadosAtivos.saidas.map((_, ri) => cell('s', ri))}
                  {/* Total despesas */}
                  <div style={{ height: HT, background: tc.tot, color: tc.desp, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 10px', fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(totalS)}
                  </div>
                  {/* Resultado */}
                  <div style={{ height: HT, background: tc.tot, color: res >= 0 ? tc.rec : tc.desp, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 10px', fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums', borderTop: `1px solid ${tc.border}` }}>
                    {res === 0 ? '—' : `${res > 0 ? '+' : ''}${res.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
