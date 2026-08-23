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
const HS = 40  // saldo
const HG = 32  // group
const HC = 32  // category
const HT = 36  // total / resultado

const W_CATS = 180
const W_MES  = 110

const TC = {
  past: {
    header: '#0f172a', body: '#1e293b', text: '#e2e8f0',
    rec: '#4ade80', desp: '#f87171', saldo: '#e2e8f0',
    grp: 'rgba(255,255,255,0.04)', tot: 'rgba(255,255,255,0.06)',
    saldoBg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.06)',
  },
  current: {
    header: '#1a56db', body: '#0f2878', text: '#fff',
    rec: '#4ade80', desp: '#f87171', saldo: '#93c5fd',
    grp: 'rgba(255,255,255,0.06)', tot: 'rgba(255,255,255,0.08)',
    saldoBg: 'rgba(255,255,255,0.12)', border: 'rgba(255,255,255,0.08)',
  },
  future: {
    header: '#94a3b8', body: '#e2e8f0', text: '#475569',
    rec: '#16a34a', desp: '#dc2626', saldo: '#1a56db',
    grp: 'rgba(0,0,0,0.03)', tot: 'rgba(0,0,0,0.05)',
    saldoBg: 'rgba(0,0,0,0.06)', border: 'rgba(0,0,0,0.04)',
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

export default function PlanPlanilha({
  aba, anoAtual, mesAtual, dadosAtivos, previsto,
  planejamentoLockado, categorias, setAnoAtual, onSave,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeCell, setActiveCell] = useState<CellPos | null>(null)
  const [editingCell, setEditingCell] = useState<CellPos | null>(null)

  const bloqueado = planejamentoLockado && aba === 'meu-plano'
  const nE = dadosAtivos.entradas.length
  const nS = dadosAtivos.saidas.length

  // Flat navigation index: 0..nE-1 = receitas, nE..nE+nS-1 = saidas
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

  function scrollMes(delta: number) {
    scrollRef.current?.scrollBy({ left: delta * (W_MES + 4), behavior: 'smooth' })
  }

  const receitasAnuais = previsto.totalEntradas.reduce((a, b) => a + b, 0)
  const despesasAnuais = previsto.totalSaidas.reduce((a, b) => a + b, 0)

  // Renders a single editable category value cell (no wrapper div)
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
        style={{ fontSize: 10, fontWeight: 600 }}
      />
    )
  }

  // ─── Shared row style helpers ─────────────────────────────────────────────
  const catBtnStyle: React.CSSProperties = {
    border: '1px solid #e2e8f0', borderRadius: 6, width: 24, height: 24,
    background: '#fff', cursor: 'pointer', fontSize: 9,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#475569', padding: 0,
  }

  return (
    <div
      style={{ padding: '16px 20px' }}
      tabIndex={0}
      onKeyDown={handleContainerKey}
      onMouseDown={e => { if ((e.target as HTMLElement).dataset.noFocus) return }}
    >
      <PlanResumoAnual
        saldoInicial={previsto.saldoInicial[0]}
        totalReceitas={receitasAnuais}
        totalDespesas={despesasAnuais}
        resultado={previsto.saldoFinal[11]}
        anoAtual={anoAtual}
        onChangeAno={delta => setAnoAtual(a => a + delta)}
      />

      {/* ─── Planilha ──────────────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 290px)', outline: 'none', borderRadius: 10 }}
        onMouseDown={() => {}} // capture focus
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
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 8px 0 12px',
              fontSize: 12, fontWeight: 700, color: '#1e293b',
            }}>
              <span>Categorias</span>
              <div style={{ display: 'flex', gap: 2 }}>
                <button style={catBtnStyle} onClick={() => scrollMes(-1)}>◄</button>
                <button style={catBtnStyle} onClick={() => scrollMes(1)}>►</button>
              </div>
            </div>

            {/* Saldo inicial (fixo top) */}
            <div style={{
              height: HS, position: 'sticky', top: HH, zIndex: 25,
              background: '#fff',
              border: '1px solid #e2e8f0', borderRadius: '10px 0 0 0',
              display: 'flex', alignItems: 'center', padding: '0 12px',
              fontSize: 11, fontWeight: 800, color: '#1e293b',
            }}>Saldo inicial</div>

            {/* Middle rows */}
            <div style={{ background: '#fff', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', flex: 1 }}>
              {/* RECEITAS group */}
              <div style={{ height: HG, display: 'flex', alignItems: 'center', padding: '0 12px', background: '#f8fafc', fontSize: 10, fontWeight: 700, color: '#1e293b', gap: 4 }}>
                ↑ RECEITAS
              </div>
              {dadosAtivos.entradas.map((cat, ri) => {
                const { icone } = iconeCategoria(categorias, cat.nome)
                return (
                  <div key={ri} style={{ height: HC, display: 'flex', alignItems: 'center', padding: '0 12px 0 20px', fontSize: 10, color: '#64748b', borderBottom: '1px solid #f8fafc', gap: 4, overflow: 'hidden' }}>
                    <span style={{ flexShrink: 0 }}>{icone}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{catLabel(cat)}</span>
                  </div>
                )
              })}
              <div style={{ height: HT, display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 10, fontWeight: 700, color: '#16a34a' }}>Total receitas</div>

              {/* DESPESAS group */}
              <div style={{ height: HG, display: 'flex', alignItems: 'center', padding: '0 12px', background: '#f8fafc', fontSize: 10, fontWeight: 700, color: '#1e293b', gap: 4 }}>
                ↓ DESPESAS
              </div>
              {dadosAtivos.saidas.map((cat, ri) => {
                const { icone } = iconeCategoria(categorias, cat.nome)
                return (
                  <div key={ri} style={{ height: HC, display: 'flex', alignItems: 'center', padding: '0 12px 0 20px', fontSize: 10, color: '#64748b', borderBottom: '1px solid #f8fafc', gap: 4, overflow: 'hidden' }}>
                    <span style={{ flexShrink: 0 }}>{icone}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{catLabel(cat)}</span>
                  </div>
                )
              })}
              <div style={{ height: HT, display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 10, fontWeight: 700, color: '#dc2626' }}>Total despesas</div>
              <div style={{ height: HT, display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 10, fontWeight: 700, color: '#1e293b' }}>= Resultado</div>
            </div>

            {/* Saldo final (fixo bottom) */}
            <div style={{
              height: HS, position: 'sticky', bottom: 0, zIndex: 25,
              background: '#fff',
              border: '1px solid #e2e8f0', borderRadius: '0 0 0 10px',
              display: 'flex', alignItems: 'center', padding: '0 12px',
              fontSize: 11, fontWeight: 800, color: '#1e293b',
            }}>Saldo final</div>
          </div>

          {/* ── MONTH COLUMNS ──────────────────────────────────────────────── */}
          {Array.from({ length: 12 }, (_, mi) => {
            const tema = temaMes(mi, mesAtual, anoAtual)
            const tc = TC[tema]
            const si     = previsto.saldoInicial[mi]
            const sf     = previsto.saldoFinal[mi]
            const totalE = previsto.totalEntradas[mi]
            const totalS = previsto.totalSaidas[mi]
            const res    = totalE - totalS
            const sfColor = sf < 0 ? '#dc2626' : tc.saldo

            const cell = (tipo: 'e' | 's', ri: number) => (
              <div key={ri} style={{ height: HC, borderBottom: `1px solid ${tc.border}` }}>
                {catCell(tipo, ri, mi, tema)}
              </div>
            )

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
                  fontSize: 12, fontWeight: 700, gap: 4, flexShrink: 0,
                }}>
                  {MESES[mi]}
                  {tema === 'current' && (
                    <span style={{ fontSize: 7, background: 'rgba(255,255,255,0.25)', padding: '2px 5px', borderRadius: 6, fontWeight: 600 }}>ATUAL</span>
                  )}
                </div>

                {/* Saldo inicial */}
                <div style={{
                  height: HS, position: 'sticky', top: HH, zIndex: 4,
                  background: tc.saldoBg, color: tc.saldo,
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  padding: '0 8px', fontSize: 12, fontWeight: 800,
                  fontVariantNumeric: 'tabular-nums',
                  borderBottom: `1px solid ${tc.border}`,
                  flexShrink: 0,
                }}>
                  {fmt(si)}
                </div>

                {/* Middle: categories */}
                <div style={{ background: tc.body, color: tc.text, flex: 1 }}>
                  {/* Receitas group header */}
                  <div style={{ height: HG, background: tc.grp, color: tc.rec, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 8px', fontSize: 10, fontWeight: 700, fontVariantNumeric: 'tabular-nums', borderBottom: `1px solid ${tc.border}` }}>
                    {fmt(totalE)}
                  </div>
                  {dadosAtivos.entradas.map((_, ri) => cell('e', ri))}
                  {/* Total receitas */}
                  <div style={{ height: HT, background: tc.tot, color: tc.rec, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 8px', fontSize: 11, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(totalE)}
                  </div>
                  {/* Despesas group header */}
                  <div style={{ height: HG, background: tc.grp, color: tc.desp, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 8px', fontSize: 10, fontWeight: 700, fontVariantNumeric: 'tabular-nums', borderTop: `1px solid ${tc.border}`, borderBottom: `1px solid ${tc.border}` }}>
                    {fmt(totalS)}
                  </div>
                  {dadosAtivos.saidas.map((_, ri) => cell('s', ri))}
                  {/* Total despesas */}
                  <div style={{ height: HT, background: tc.tot, color: tc.desp, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 8px', fontSize: 11, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(totalS)}
                  </div>
                  {/* Resultado */}
                  <div style={{ height: HT, background: tc.tot, color: res >= 0 ? tc.rec : tc.desp, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 8px', fontSize: 11, fontWeight: 800, fontVariantNumeric: 'tabular-nums', borderTop: `1px solid ${tc.border}` }}>
                    {res === 0 ? '—' : `${res > 0 ? '+' : ''}${res.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                  </div>
                </div>

                {/* Saldo final */}
                <div style={{
                  height: HS, position: 'sticky', bottom: 0, zIndex: 4,
                  background: tc.saldoBg, color: sfColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  padding: '0 8px', fontSize: 12, fontWeight: 800,
                  fontVariantNumeric: 'tabular-nums',
                  borderTop: `1px solid ${tc.border}`,
                  borderRadius: '0 0 8px 8px',
                  flexShrink: 0,
                }}>
                  {fmt(sf)}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
        /* Hover sutil em células editáveis */
        .plan-cat-cell:hover { background: rgba(26,86,219,0.06); }
      `}</style>
    </div>
  )
}
