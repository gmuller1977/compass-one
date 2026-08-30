import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import type React from 'react'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { fmt, MESES, MOTIVO_PLANO_LOCKADO, type AnoData, type Cat } from './types'
import { useToast } from '../Toast'
import PlanCelulaNav from './PlanCelulaNav'
import PlanBarraFerramentas from './PlanBarraFerramentas'
import PlanAncoraBadge from './PlanAncoraBadge'
import { type BulkOp } from './PlanFerramentas'
import type { Categoria } from '../../context/AppContext'

interface Props {
  anoAtual: number
  mesAtual: number
  dadosAtivos: AnoData
  previsto: { totalEntradas: number[]; totalSaidas: number[]; saldoInicial: number[]; saldoFinal: number[] }
  categorias: Categoria[]
  setAnoAtual: React.Dispatch<React.SetStateAction<number>>
  onSave: (tipo: 'e' | 's', ri: number, mi: number, valor: number) => void
  onBulkSave: (ops: BulkOp[]) => void
  dadosAnoAnterior: AnoData | null
  ancoraMes: number
}

type CellPos = { tipo: 'e' | 's'; ri: number; mi: number }
type Tema = 'com' | 'sem'

const HH = 40  // header
const HG = 30  // secao (RECEITAS / DESPESAS)
const HGR = 26 // cabecalho de grupo
const HC = 36  // category
const HT = 40  // resultado

const SEM_GRUPO = '__sem_grupo__'

/**
 * Modelo de linhas compartilhado pela coluna de categorias e pelas 12 colunas
 * de meses. As duas percorrem ESTA lista, entao o alinhamento vertical e
 * garantido por construcao — nao por acerto manual de alturas.
 */
type Linha =
  | { k: 'secao'; tipo: 'e' | 's' }
  | { k: 'grupo'; tipo: 'e' | 's'; grupo: string; ris: number[] }
  | { k: 'cat';   tipo: 'e' | 's'; ri: number; cat: Cat; vi: number }
  | { k: 'total' }

const ALTURA: Record<Linha['k'], number> = { secao: HG, grupo: HGR, cat: HC, total: HT }

/** ri e sempre o indice na lista ORIGINAL — e por ele que onSave grava. */
function agrupar(cats: Cat[], tipo: 'e' | 's', viInicial: number): Linha[] {
  const porGrupo = new Map<string, { ri: number; cat: Cat }[]>()
  cats.forEach((cat, ri) => {
    const g = cat.grupo ?? SEM_GRUPO
    if (!porGrupo.has(g)) porGrupo.set(g, [])
    porGrupo.get(g)!.push({ ri, cat })
  })
  const ordenados = [...porGrupo.entries()].sort(([a], [b]) =>
    a === SEM_GRUPO ? 1 : b === SEM_GRUPO ? -1 : a.localeCompare(b, 'pt-BR'))
  const temGrupoReal = ordenados.some(([g]) => g !== SEM_GRUPO)

  const out: Linha[] = []
  let vi = viInicial
  for (const [grupo, items] of ordenados) {
    if (temGrupoReal) out.push({ k: 'grupo', tipo, grupo, ris: items.map(i => i.ri) })
    for (const { ri, cat } of items) out.push({ k: 'cat', tipo, ri, cat, vi: vi++ })
  }
  return out
}

// Summary panel
const SH = 34  // summary header row
const SR = 26  // summary value row

const W_CATS = 200
const W_MES  = 130

const TC = {
  com: {
    header: 'linear-gradient(135deg, #1e3a8a, #0f2878)', body: '#0f2878', text: '#fff',
    rec: '#86efac', desp: '#fde047', saldo: '#fff',
    grp: 'rgba(255,255,255,0.06)', tot: 'rgba(255,255,255,0.09)',
    border: 'rgba(255,255,255,0.08)', divider: 'rgba(255,255,255,0.06)',
    hover: 'rgba(255,255,255,0.1)', stripe: 'rgba(255,255,255,0.04)',
  },
  sem: {
    header: 'linear-gradient(135deg, #475569, #334155)', body: '#334155', text: '#fff',
    rec: 'rgba(255,255,255,0.75)', desp: 'rgba(255,255,255,0.75)', saldo: 'rgba(255,255,255,0.75)',
    grp: 'rgba(255,255,255,0.04)', tot: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.06)', divider: 'rgba(255,255,255,0.05)',
    hover: 'rgba(255,255,255,0.08)', stripe: 'rgba(255,255,255,0.03)',
  },
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
  anoAtual, mesAtual, dadosAtivos, previsto,
  categorias, setAnoAtual, onSave, onBulkSave, dadosAnoAnterior, ancoraMes,
}: Props) {
  const scrollResRef = useRef<HTMLDivElement>(null)
  const scrollCatRef = useRef<HTMLDivElement>(null)
  const syncLock     = useRef(false)

  const [activeCell, setActiveCell] = useState<CellPos | null>(null)
  const [editingCell, setEditingCell] = useState<CellPos | null>(null)
  const [initChar, setInitChar] = useState<string | undefined>(undefined)
  const { toast } = useToast()
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  const bloqueado = false
  const anoCorrente = new Date().getFullYear()

  const linhas = useMemo<Linha[]>(() => {
    const e = agrupar(dadosAtivos.entradas, 'e', 0)
    const s = agrupar(dadosAtivos.saidas, 's', 0)
    return [{ k: 'secao', tipo: 'e' }, ...e, { k: 'secao', tipo: 's' }, ...s, { k: 'total' }]
  }, [dadosAtivos])

  const idxDaCelula = useCallback(
    (pos: CellPos) => linhas.findIndex(l => l.k === 'cat' && l.tipo === pos.tipo && l.ri === pos.ri),
    [linhas],
  )

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

    // Vertical: soma as alturas das linhas anteriores (grupos tem altura propria)
    const idx = idxDaCelula(activeCell)
    if (idx === -1) return
    let rowTop = HH
    for (let i = 0; i < idx; i++) rowTop += ALTURA[linhas[i].k]
    const rowBottom = rowTop + HC
    const visTop    = container.scrollTop + HH
    const visBottom = container.scrollTop + container.clientHeight
    if (rowTop < visTop) {
      container.scrollTop = rowTop - HH - 4
    } else if (rowBottom > visBottom) {
      container.scrollTop = rowBottom - container.clientHeight + 4
    }
  }, [activeCell, linhas, idxDaCelula])

  /** Cima/baixo seguem a ordem VISUAL: o agrupamento reordena as categorias. */
  function navCell(pos: CellPos, dir: 'up' | 'down' | 'left' | 'right'): CellPos | null {
    if (dir === 'left')  return pos.mi > 0  ? { ...pos, mi: pos.mi - 1 } : null
    if (dir === 'right') return pos.mi < 11 ? { ...pos, mi: pos.mi + 1 } : null
    const idx = idxDaCelula(pos)
    if (idx === -1) return null
    const passo = dir === 'up' ? -1 : 1
    for (let i = idx + passo; i >= 0 && i < linhas.length; i += passo) {
      const l = linhas[i]
      if (l.k === 'cat') return { tipo: l.tipo, ri: l.ri, mi: pos.mi }
    }
    return null
  }

  const activate = useCallback((pos: CellPos | null) => {
    setEditingCell(null); setInitChar(undefined); setActiveCell(pos)
  }, [])

  const startEdit = useCallback((pos: CellPos, char?: string) => {
    // tambem cobre teclado (Enter ou digitar um numero), nao so o clique
    if (bloqueado) { toast(MOTIVO_PLANO_LOCKADO, 'info'); return }
    setInitChar(char); setActiveCell(pos); setEditingCell(pos)
  }, [bloqueado, toast])

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
    else if (e.key === 'Tab')        { e.preventDefault(); setActiveCell(navCell(activeCell, e.shiftKey ? 'left' : 'right') ?? activeCell) }
    else if (e.key === 'Enter')      { e.preventDefault(); startEdit(activeCell) }
    else if (e.key === 'Escape')     { setActiveCell(null) }
    else if (e.key === 'Home')       { setActiveCell({ ...activeCell, mi: 0 }) }
    else if (e.key === 'End')        { setActiveCell({ ...activeCell, mi: 11 }) }
    // preventDefault: sem isso o navegador ainda insere o digito no input que
    // acabou de ganhar foco, e ele apareceria duas vezes
    else if (/^\d$/.test(e.key))     { e.preventDefault(); startEdit(activeCell, e.key) }
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
        initChar={editando ? initChar : undefined}
        motivoBloqueio={bloqueado ? MOTIVO_PLANO_LOCKADO : undefined}
        onChange={v => handleChange(tipo, ri, mi, v)}
        onNavigate={dir => {
          // Excel-like: a seta salva e ja abre a proxima celula em edicao.
          // Sem proxima (borda da planilha), fecha e mantem a atual ativa.
          const prox = navCell(pos, dir)
          setInitChar(undefined)
          if (!prox) { setEditingCell(null); setActiveCell(pos); return }
          setActiveCell(prox); setEditingCell(prox)
        }}
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
      <PlanAncoraBadge
        ancoraMes={ancoraMes}
        anoAtual={anoAtual}
        saldoAncora={ancoraMes >= 0 ? previsto.saldoFinal[ancoraMes] : previsto.saldoInicial[0]}
      />

      <PlanBarraFerramentas
        mesAtual={mesAtual}
        anoAtual={anoAtual}
        dadosAtivos={dadosAtivos}
        dadosAnoAnterior={dadosAnoAnterior}
        categorias={categorias}
        onBulkSave={onBulkSave}
        bloqueado={bloqueado}
        motivoBloqueio={MOTIVO_PLANO_LOCKADO}
      />

      {/* ─── PAINEL DE RESUMO ─────────────────────────────────────────────── */}
      <div style={{
        background: '#f8faff',
        borderRadius: 10, marginBottom: 4,
        display: 'flex', flexDirection: 'row', overflow: 'hidden',
      }}>
        {/* Coluna fixa de labels */}
        <div style={{ minWidth: W_CATS, maxWidth: W_CATS, flexShrink: 0, background: 'linear-gradient(135deg,#0f2878,#1e40af)' }}>
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
              <span style={{ fontSize: 13, fontWeight: 800, color: anoAtual === anoCorrente ? '#fde047' : '#fff', minWidth: 34, textAlign: 'center' }}>
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
          <div style={{ display: 'flex', minWidth: 'max-content', gap: 6 }}>
            {Array.from({ length: 12 }, (_, mi) => {
              const si   = previsto.saldoInicial[mi]
              const te   = previsto.totalEntradas[mi]
              const ts   = previsto.totalSaidas[mi]
              const sf   = previsto.saldoFinal[mi]
              const res  = te - ts
              const comPlano = te > 0 || ts > 0
              const tc   = TC[comPlano ? 'com' : 'sem']
              const isAtual = mi === mesAtual && anoAtual === anoCorrente
              const fmtRes = (v: number) => v === 0 ? '—' : `${v > 0 ? '+' : ''}${fmt(v, true)}`
              return (
                <div key={mi} style={{ minWidth: W_MES, maxWidth: W_MES, flexShrink: 0, borderRadius: 8, overflow: 'hidden', boxShadow: isAtual ? '0 0 0 2px rgba(255,255,255,0.4), 0 4px 16px rgba(26,86,219,0.5)' : undefined }}>
                  {/* Month header */}
                  <div style={{
                    height: SH, background: tc.header, color: tc.text,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 4, fontSize: 12, fontWeight: 700,
                    borderBottom: `1px solid ${tc.divider}`,
                  }}>
                    {MESES[mi]}
                    {isAtual && (
                      <span style={{ fontSize: 7, fontWeight: 700, background: 'rgba(255,255,255,0.25)', color: '#fff', padding: '1px 4px', borderRadius: 4 }}>ATUAL</span>
                    )}
                  </div>
                  {/* Value rows — same heights as label rows */}
                  <div style={{ background: tc.header, overflow: 'hidden' }}>
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
                        borderBottom: idx < arr.length - 1 ? `1px solid ${tc.divider}` : 'none',
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
            background: '#f8faff', display: 'flex', flexDirection: 'column',
          }}>
            {/* Header with month scroll buttons */}
            <div style={{
              height: HH, position: 'sticky', top: 0, zIndex: 26,
              background: '#f8faff',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 8px 0 12px',
              fontSize: 12, fontWeight: 700, color: '#0f172a',
            }}>
              <span>Categorias</span>
              <div style={{ display: 'flex', gap: 2 }}>
                <button style={CAT_BTN} onClick={() => scrollMes(-1)}>◄</button>
                <button style={CAT_BTN} onClick={() => scrollMes(1)}>►</button>
              </div>
            </div>

            {/* Rows */}
            <div style={{ background: '#fff', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', flex: 1 }}>
              {linhas.map((l, li) => {
                if (l.k === 'secao') return (
                  <div key={li} style={{ height: HG, display: 'flex', alignItems: 'center', padding: '0 12px', background: '#f8fafc', fontSize: 11, fontWeight: 700, color: '#0f172a' }}>
                    {l.tipo === 'e' ? '↑ RECEITAS' : '↓ DESPESAS'}
                  </div>
                )
                if (l.k === 'grupo') return (
                  <div key={li} style={{ height: HGR, display: 'flex', alignItems: 'center', padding: '0 12px 0 14px', background: '#f1f5f9', fontSize: 9, fontWeight: 800, letterSpacing: '.5px', textTransform: 'uppercase', color: '#64748b', borderBottom: '1px solid #e2e8f0', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {l.grupo === SEM_GRUPO ? 'Outros' : l.grupo}
                  </div>
                )
                if (l.k === 'total') return (
                  <div key={li} style={{ height: HT, display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 12, fontWeight: 700, color: '#0f172a' }}>= Resultado</div>
                )
                const { icone } = iconeCategoria(categorias, l.cat.nome)
                const rowKey = `${l.tipo}-${l.ri}`
                const isHovered = hoveredRow === rowKey
                const isOdd = l.vi % 2 === 1
                return (
                  <div key={li}
                    style={{ height: HC, display: 'flex', alignItems: 'center', padding: '0 12px 0 22px', fontSize: 12, color: '#64748b', borderBottom: '1px solid #f8fafc', gap: 4, overflow: 'hidden', background: isHovered ? 'rgba(26,86,219,0.06)' : isOdd ? 'rgba(0,0,0,0.02)' : undefined, transition: 'background .1s' }}
                    onMouseEnter={() => setHoveredRow(rowKey)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <span style={{ flexShrink: 0 }}>{icone}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{catLabel(l.cat)}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── MONTH COLUMNS ─────────────────────────────────────────────── */}
          {Array.from({ length: 12 }, (_, mi) => {
            const totalE = previsto.totalEntradas[mi]
            const totalS = previsto.totalSaidas[mi]
            const res    = totalE - totalS
            const comPlano = totalE > 0 || totalS > 0
            const tc = TC[comPlano ? 'com' : 'sem']
            const isAtual = mi === mesAtual && anoAtual === anoCorrente

            const subtotal = (l: Extract<Linha, { k: 'grupo' }>) => {
              const lista = l.tipo === 'e' ? dadosAtivos.entradas : dadosAtivos.saidas
              return l.ris.reduce((s, ri) => s + (lista[ri]?.v[mi] ?? 0), 0)
            }

            return (
              <div key={mi} style={{ minWidth: W_MES, maxWidth: W_MES, flexShrink: 0, marginLeft: mi > 0 ? 6 : 0, display: 'flex', flexDirection: 'column', boxShadow: isAtual ? '0 0 0 2px rgba(255,255,255,0.4), 0 4px 16px rgba(26,86,219,0.5)' : undefined, borderRadius: 8 }}>
                {/* Month header — sticky */}
                <div style={{
                  height: HH, position: 'sticky', top: 0, zIndex: 5,
                  background: tc.header, color: tc.text,
                  borderRadius: '8px 8px 0 0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, gap: 4, flexShrink: 0,
                }}>
                  {MESES[mi]}
                  {isAtual && (
                    <span style={{ fontSize: 7, background: 'rgba(255,255,255,0.25)', padding: '2px 5px', borderRadius: 6, fontWeight: 600 }}>ATUAL</span>
                  )}
                </div>

                {/* Categories body — percorre a MESMA lista da coluna de categorias */}
                <div style={{ background: tc.header, color: tc.text, flex: 1 }}>
                  {linhas.map((l, li) => {
                    if (l.k === 'secao') {
                      const v = l.tipo === 'e' ? totalE : totalS
                      return (
                        <div key={li} style={{ height: HG, background: tc.grp, color: l.tipo === 'e' ? tc.rec : tc.desp, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 10px', fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums', borderTop: l.tipo === 's' ? `1px solid ${tc.border}` : undefined, borderBottom: `1px solid ${tc.border}` }}>
                          {fmt(v)}
                        </div>
                      )
                    }
                    if (l.k === 'grupo') return (
                      <div key={li} style={{ height: HGR, background: tc.stripe, color: l.tipo === 'e' ? tc.rec : tc.desp, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 10px', fontSize: 10, fontWeight: 700, fontVariantNumeric: 'tabular-nums', opacity: 0.85, borderBottom: `1px solid ${tc.border}` }}>
                        {fmt(subtotal(l))}
                      </div>
                    )
                    if (l.k === 'total') return (
                      <div key={li} style={{ height: HT, background: tc.tot, color: res >= 0 ? tc.rec : tc.desp, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 10px', fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums', borderTop: `1px solid ${tc.border}` }}>
                        {res === 0 ? '—' : `${res > 0 ? '+' : ''}${res.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                      </div>
                    )
                    const rowKey = `${l.tipo}-${l.ri}`
                    const isHovered = hoveredRow === rowKey
                    const bg = isHovered ? tc.hover : l.vi % 2 === 1 ? tc.stripe : undefined
                    return (
                      <div key={li}
                        style={{ height: HC, borderBottom: `1px solid ${tc.border}`, background: bg, transition: 'background .1s' }}
                        onMouseEnter={() => setHoveredRow(rowKey)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                        {catCell(l.tipo, l.ri, mi, comPlano ? 'com' : 'sem')}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
