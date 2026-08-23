import { useState, useRef, useCallback, useEffect } from 'react'
import type React from 'react'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { fmt, MESES, type AnoData } from './types'
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

const HH = 40  // header
const HG = 30  // group
const HC = 36  // category
const HT = 40  // resultado

// Summary panel
const SH = 34  // summary header row
const SR = 26  // summary value row

const W_CATS = 200
const W_MES  = 130

const TC = {
  past: {
    header: 'linear-gradient(135deg, #60a5fa, #3b82f6)', body: '#3b82f6', text: '#fff',
    rec: '#4ade80', desp: '#fbbf24', saldo: '#bfdbfe',
    grp: 'rgba(255,255,255,0.06)', tot: 'rgba(255,255,255,0.08)',
    border: 'rgba(255,255,255,0.08)',
    hover: 'rgba(255,255,255,0.1)', stripe: 'rgba(255,255,255,0.04)',
  },
  current: {
    header: 'linear-gradient(135deg, #1e3a8a, #0f2878)', body: '#0f2878', text: '#fff',
    rec: '#4ade80', desp: '#fbbf24', saldo: '#93c5fd',
    grp: 'rgba(255,255,255,0.06)', tot: 'rgba(255,255,255,0.09)',
    border: 'rgba(255,255,255,0.08)',
    hover: 'rgba(255,255,255,0.1)', stripe: 'rgba(255,255,255,0.04)',
  },
  future: {
    header: 'linear-gradient(135deg, #bfdbfe, #93c5fd)', body: '#93c5fd', text: '#1e3a8a',
    rec: '#16a34a', desp: '#dc2626', saldo: '#1e3a8a',
    grp: 'rgba(0,0,0,0.03)', tot: 'rgba(0,0,0,0.05)',
    border: 'rgba(0,0,0,0.04)',
    hover: 'rgba(0,0,0,0.05)', stripe: 'rgba(0,0,0,0.03)',
  },
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

const GHOST_BTN: React.CSSProperties = {
  border: 'none', background: 'rgba(255,255,255,0.15)', borderRadius: 5,
  color: '#fff', cursor: 'pointer', padding: '2px 7px', fontSize: 11, lineHeight: 1,
  fontFamily: 'inherit',
}
const CAT_BTN: React.CSSProperties = {
  border: '1px solid #e2e8f0', borderRadius: 5, width: 22, height: 22,
  background: '#fff', cursor: 'pointer', fontSize: 9,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#475569', padding: 0, flexShrink: 0,
}

export default function PlanPlanilha({
  aba, anoAtual, mesAtual, dadosAtivos, previsto,
  planejamentoLockado, categorias, setAnoAtual, onSave,
}: Props) {
  const scrollResRef = useRef<HTMLDivElement>(null)
  const scrollCatRef = useRef<HTMLDivElement>(null)
  const syncLock     = useRef(false)

  const [activeCell, setActiveCell] = useState<CellPos | null>(null)
  const [editingCell, setEditingCell] = useState<CellPos | null>(null)
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  const bloqueado = planejamentoLockado && aba === 'meu-plano'
  const nE = dadosAtivos.entradas.length
  const nS = dadosAtivos.saidas.length
  const anoCorrente = new Date().getFullYear()

  // Auto-scroll to keep active cell visible
  useEffect(() => {
    if (!activeCell) return
    const container = scrollCatRef.current
    if (!container) return

    const colLeft  = activeCell.mi * (W_MES + 4)
    const colRight = colLeft + W_MES
    const visLeft  = container.scrollLeft
    const visRight = container.scrollLeft + container.clientWidth - W_CATS
    if (colLeft < visLeft) {
      container.scrollLeft = colLeft - 4
      if (scrollResRef.current) scrollResRef.current.scrollLeft = container.scrollLeft
    } else if (colRight > visRight) {
      container.scrollLeft = colRight - (container.clientWidth - W_CATS) + 4
      if (scrollResRef.current) scrollResRef.current.scrollLeft = container.scrollLeft
    }

    // Vertical scroll — no HT offset for saidas since Total receitas removed
    const rowTop = activeCell.tipo === 'e'
      ? HH + HG + activeCell.ri * HC
      : HH + 2 * HG + nE * HC + activeCell.ri * HC
    const rowBottom = rowTop + HC
    const visTop    = container.scrollTop + HH
    const visBottom = container.scrollTop + container.clientHeight
    if (rowTop < visTop) {
      container.scrollTop = rowTop - HH - 4
    } else if (rowBottom > visBottom) {
      container.scrollTop = rowBottom - container.clientHeight + 4
    }
  }, [activeCell, nE])

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
    setEditingCell(null); setActiveCell(pos)
  }, [])

  const startEdit = useCallback((pos: CellPos) => {
    if (bloqueado) return
    setActiveCell(pos); setEditingCell(pos)
  }, [bloqueado])

  const handleChange = useCallback((tipo: 'e' | 's', ri: number, mi: number, v: number) => {
    onSave(tipo, ri, mi, v)
  }, [onSave])

  function handleContainerKey(e: React.KeyboardEvent) {
    if (editingCell) return
    if (!activeCell) return
    if (e.key === 'ArrowLeft')       { e.preventDefault(); setActiveCell(navCell(activeCell, 'left')  ?? activeCell) }
    else if (e.key === 'ArrowRight') { e.preventDefault(); setActiveCell(navCell(activeCell, 'right') ?? activeCell) }
    else if (e.key === 'ArrowUp')    { e.preventDefault(); setActiveCell(navCell(activeCell, 'up')    ?? activeCell) }
    else if (e.key === 'ArrowDown')  { e.preventDefault(); setActiveCell(navCell(activeCell, 'down')  ?? activeCell) }
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

  function catCell(tipo: 'e' | 's', ri: number, mi: number, tema: Tema) {
    const tc = TC[tema]
    const pos: CellPos = { tipo, ri, mi }
    const ativa    = activeCell?.tipo === tipo && activeCell.ri  === ri && activeCell.mi  === mi
    const editando = editingCell?.tipo === tipo && editingCell.ri === ri && editingCell.mi === mi
    return (
      <PlanCelulaNav
        valor={(tipo === 'e' ? dadosAtivos.entradas : dadosAtivos.saidas)[ri]?.v[mi] ?? 0}
        editavel={!bloqueado} ativa={ativa} editando={editando}
        color={tipo === 'e' ? tc.rec : tc.desp}
        onChange={v => handleChange(tipo, ri, mi, v)}
        onNavigate={dir => { setEditingCell(null); setActiveCell(navCell(pos, dir) ?? pos) }}
        onStartEdit={() => startEdit(pos)}
        onCancelEdit={() => activate(pos)}
        onClick={() => { if (ativa && !editando) startEdit(pos); else activate(pos) }}
        style={{ fontSize: 13, fontWeight: 600 }}
      />
    )
  }

  return (
    <div
      style={{ padding: '8px 16px' }}
      tabIndex={0}
      onKeyDown={handleContainerKey}
    >
      {/* ─── PAINEL DE RESUMO ─────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg,#0f2878,#1a56db)',
        borderRadius: 10, marginBottom: 4,
        display: 'flex', flexDirection: 'row', overflow: 'hidden',
      }}>
        {/* Coluna fixa de labels */}
        <div style={{ minWidth: W_CATS, maxWidth: W_CATS, flexShrink: 0, background: 'linear-gradient(135deg,#0f2878,#1a56db)' }}>
          {/* Header: RESUMO + year nav */}
          <div style={{
            height: SH, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', padding: '0 8px 0 14px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '.5px', textTransform: 'uppercase' }}>
              Resumo
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button style={GHOST_BTN} onClick={() => setAnoAtual(a => a - 1)}>◄</button>
              <span style={{ fontSize: 13, fontWeight: 800, color: anoAtual === anoCorrente ? '#fbbf24' : '#fff', minWidth: 34, textAlign: 'center' }}>
                {anoAtual}
              </span>
              <button style={GHOST_BTN} onClick={() => setAnoAtual(a => a + 1)}>►</button>
            </div>
          </div>
          {/* Labels */}
          {(['Saldo inicial', 'Receitas', 'Despesas', 'Resultado', 'Saldo final'] as const).map((lbl, i) => (
            <div key={lbl} style={{
              height: SR, display: 'flex', alignItems: 'center', padding: '0 14px',
              fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.7)',
              borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            }}>
              {lbl}
            </div>
          ))}
        </div>

        {/* Scrollable month columns */}
        <div
          ref={scrollResRef}
          onScroll={handleScrollRes}
          style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', scrollbarWidth: 'none' }}
        >
          <div style={{ display: 'flex', minWidth: 'max-content' }}>
            {Array.from({ length: 12 }, (_, mi) => {
              const tema = temaMes(mi, mesAtual, anoAtual)
              const tc   = TC[tema]
              const si   = previsto.saldoInicial[mi]
              const te   = previsto.totalEntradas[mi]
              const ts   = previsto.totalSaidas[mi]
              const sf   = previsto.saldoFinal[mi]
              const res  = te - ts
              const divider = tema === 'future' ? 'rgba(30,58,138,0.08)' : 'rgba(255,255,255,0.06)'
              const fmtRes = (v: number) => v === 0 ? '—' : `${v > 0 ? '+' : ''}${fmt(v, true)}`
              return (
                <div key={mi} style={{ minWidth: W_MES, maxWidth: W_MES, flexShrink: 0, marginLeft: 2, marginRight: 2, borderRight: mi < 11 ? '1px solid rgba(255,255,255,0.15)' : undefined }}>
                  {/* Month header */}
                  <div style={{
                    height: SH, background: tc.header, color: tc.text,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 4, fontSize: 12, fontWeight: 700,
                    borderRadius: '6px 6px 0 0',
                    borderBottom: `1px solid ${divider}`,
                  }}>
                    {MESES[mi]}
                    {tema === 'current' && (
                      <span style={{ fontSize: 7, fontWeight: 700, background: 'rgba(255,255,255,0.25)', color: '#fff', padding: '1px 4px', borderRadius: 4 }}>ATUAL</span>
                    )}
                  </div>
                  {/* Value rows — same heights as label rows */}
                  <div style={{ background: tc.body, borderRadius: '0 0 6px 6px', overflow: 'hidden' }}>
                    {[
                      { v: si,  color: tc.text,                         bold: false, fmt: (v: number) => fmt(v, true) },
                      { v: te,  color: tc.rec,                          bold: false, fmt: (v: number) => fmt(v, true) },
                      { v: ts,  color: tc.desp,                         bold: false, fmt: (v: number) => fmt(v, true) },
                      { v: res, color: res >= 0 ? tc.rec : tc.desp,     bold: true,  fmt: fmtRes },
                      { v: sf,  color: sf < 0 ? tc.desp : tc.text,      bold: false, fmt: (v: number) => fmt(v, true) },
                    ].map(({ v, color, bold, fmt: fv }, idx, arr) => (
                      <div key={idx} style={{
                        height: SR, display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                        padding: '0 10px', fontSize: 12, fontWeight: bold ? 800 : 700,
                        color, fontVariantNumeric: 'tabular-nums',
                        borderBottom: idx < arr.length - 1 ? `1px solid ${divider}` : 'none',
                      }}>
                        {fv(v)}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ─── PLANILHA DE CATEGORIAS ───────────────────────────────────────── */}
      <div
        ref={scrollCatRef}
        onScroll={handleScrollCat}
        style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 270px)', outline: 'none', borderRadius: 10 }}
      >
        <div style={{ display: 'flex', flexDirection: 'row', minWidth: 'max-content', alignItems: 'flex-start' }}>

          {/* ── CATEGORIES COLUMN ───────────────────────────────────────── */}
          <div style={{
            minWidth: W_CATS, maxWidth: W_CATS, flexShrink: 0,
            position: 'sticky', left: 0, zIndex: 20,
            background: '#f0f4ff', display: 'flex', flexDirection: 'column',
          }}>
            {/* Header with month scroll buttons */}
            <div style={{
              height: HH, position: 'sticky', top: 0, zIndex: 26,
              background: '#f0f4ff',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 8px 0 12px',
              fontSize: 12, fontWeight: 700, color: '#1e293b',
            }}>
              <span>Categorias</span>
              <div style={{ display: 'flex', gap: 2 }}>
                <button style={CAT_BTN} onClick={() => scrollMes(-1)}>◄</button>
                <button style={CAT_BTN} onClick={() => scrollMes(1)}>►</button>
              </div>
            </div>

            {/* Rows */}
            <div style={{ background: '#fff', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', flex: 1 }}>
              <div style={{ height: HG, display: 'flex', alignItems: 'center', padding: '0 12px', background: '#f8fafc', fontSize: 11, fontWeight: 700, color: '#1e293b' }}>
                ↑ RECEITAS
              </div>
              {dadosAtivos.entradas.map((cat, ri) => {
                const { icone } = iconeCategoria(categorias, cat.nome)
                const rowKey = `e-${ri}`
                const isHovered = hoveredRow === rowKey
                const isOdd = ri % 2 === 1
                return (
                  <div key={ri}
                    style={{ height: HC, display: 'flex', alignItems: 'center', padding: '0 12px 0 18px', fontSize: 12, color: '#64748b', borderBottom: '1px solid #f8fafc', gap: 4, overflow: 'hidden', background: isHovered ? 'rgba(26,86,219,0.06)' : isOdd ? 'rgba(0,0,0,0.02)' : undefined, transition: 'background .1s' }}
                    onMouseEnter={() => setHoveredRow(rowKey)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <span style={{ flexShrink: 0 }}>{icone}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{catLabel(cat)}</span>
                  </div>
                )
              })}

              <div style={{ height: HG, display: 'flex', alignItems: 'center', padding: '0 12px', background: '#f8fafc', fontSize: 11, fontWeight: 700, color: '#1e293b' }}>
                ↓ DESPESAS
              </div>
              {dadosAtivos.saidas.map((cat, ri) => {
                const { icone } = iconeCategoria(categorias, cat.nome)
                const rowKey = `s-${ri}`
                const isHovered = hoveredRow === rowKey
                const isOdd = ri % 2 === 1
                return (
                  <div key={ri}
                    style={{ height: HC, display: 'flex', alignItems: 'center', padding: '0 12px 0 18px', fontSize: 12, color: '#64748b', borderBottom: '1px solid #f8fafc', gap: 4, overflow: 'hidden', background: isHovered ? 'rgba(26,86,219,0.06)' : isOdd ? 'rgba(0,0,0,0.02)' : undefined, transition: 'background .1s' }}
                    onMouseEnter={() => setHoveredRow(rowKey)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <span style={{ flexShrink: 0 }}>{icone}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{catLabel(cat)}</span>
                  </div>
                )
              })}
              <div style={{ height: HT, display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 12, fontWeight: 700, color: '#1e293b' }}>= Resultado</div>
            </div>
          </div>

          {/* ── MONTH COLUMNS ─────────────────────────────────────────────── */}
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
              <div key={mi} style={{ minWidth: W_MES, maxWidth: W_MES, flexShrink: 0, marginLeft: 2, marginRight: 2, display: 'flex', flexDirection: 'column' }}>
                {/* Month header — sticky */}
                <div style={{
                  height: HH, position: 'sticky', top: 0, zIndex: 5,
                  background: tc.header, color: tc.text,
                  borderRadius: '8px 8px 0 0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, gap: 4, flexShrink: 0,
                }}>
                  {MESES[mi]}
                  {tema === 'current' && (
                    <span style={{ fontSize: 7, background: 'rgba(255,255,255,0.25)', padding: '2px 5px', borderRadius: 6, fontWeight: 600 }}>ATUAL</span>
                  )}
                </div>

                {/* Categories body */}
                <div style={{ background: tc.body, color: tc.text, flex: 1 }}>
                  <div style={{ height: HG, background: tc.grp, color: tc.rec, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 10px', fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums', borderBottom: `1px solid ${tc.border}` }}>
                    {fmt(totalE)}
                  </div>
                  {dadosAtivos.entradas.map((_, ri) => cell('e', ri))}

                  <div style={{ height: HG, background: tc.grp, color: tc.desp, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 10px', fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums', borderTop: `1px solid ${tc.border}`, borderBottom: `1px solid ${tc.border}` }}>
                    {fmt(totalS)}
                  </div>
                  {dadosAtivos.saidas.map((_, ri) => cell('s', ri))}

                  <div style={{ height: HT, background: tc.tot, color: res >= 0 ? tc.rec : tc.desp, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 10px', fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums', borderTop: `1px solid ${tc.border}` }}>
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
