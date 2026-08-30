import { useState, useEffect } from 'react'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { supabase } from '../../lib/supabase'
import { fmt, COR, MESES, MESES_FULL, type AnoData } from './types'
import PageHeader from '../PageHeader'
import AcResumoBoxes from '../acompanhamento/AcResumoBoxes'
import { resolverRealKey } from '../acompanhamento/evolucaoCalcs'
import { ehZero } from '../../utils/moeda'
import SeletorMesAno from '../SeletorMesAno'
import type { Categoria } from '../../context/AppContext'

/**
 * Valor lancado de uma categoria. As chaves do mapa sao (nome + variante),
 * entao Seguro·Civic e Seguro·March nao se somam. Ler so por cat.nome, como
 * antes, juntava as duas — e a revisao sugeria ajustar uma delas com o total.
 */
function lancadoDaCat(map: Record<string, number>, cat: { nome: string; descricao?: string }) {
  const k = resolverRealKey(map, cat.nome, cat.descricao)
  return k ? (map[k] ?? 0) : 0
}

function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
}

interface Props {
  anoAtual: number
  mesAtual: number
  dadosPrevisto: AnoData
  lancadoPorCatMes: Record<number, { entrada: Record<string, number>; saida: Record<string, number> }>
  categorias: Categoria[]
  onAjustar: (tipo: 'e' | 's', ri: number, mesInicio: number, valor: number) => void
  desvioMinPerc: number
}

type JustState = {
  justificativa: string
  tipoEvento: 'pontual' | 'anual' | 'sazonal' | ''
  mesesRecorrencia: number[]
  tags: string[]
  tagInput: string
  acao: 'aceito' | 'mantido' | 'ajustado' | ''
  valorAjustado: string
}

type CatRow = {
  tipo: 'e' | 's'
  cat: { nome: string; descricao?: string; v: number[] }
  ri: number
  planejado: number
  real: number
  desvioPercent: number
  temDesvio: boolean
}

function emptyJust(): JustState {
  return { justificativa: '', tipoEvento: '', mesesRecorrencia: [], tags: [], tagInput: '', acao: '', valorAjustado: '' }
}

function rowMeta(tipo: 'e' | 's', planejado: number, real: number) {
  const pct = planejado > 0 ? Math.round(real / planejado * 100) : (real > 0 ? 100 : 0)
  const barPct = Math.min(100, pct)
  let barCor = '#e2e8f0', statusLabel = '', statusCor = COR.textoMuted
  if (tipo === 'e') {
    if (real >= planejado && (planejado > 0 || real > 0)) { barCor = '#4ade80'; statusLabel = '✓ Recebido'; statusCor = COR.verde }
    else if (real > 0)                                    { barCor = '#fbbf24'; statusLabel = '○ A receber'; statusCor = COR.amarelo }
    else                                                   { statusLabel = '○ Não recebido' }
  } else {
    if (real === 0 && planejado > 0)   { statusLabel = '○ Pendente'; statusCor = COR.amarelo }
    else if (real > planejado)          { barCor = '#f87171'; statusLabel = '⚠ Acima do previsto'; statusCor = COR.vermelho }
    else if (real >= planejado * 0.99)  { barCor = '#4ade80'; statusLabel = '✓ Pago'; statusCor = COR.verde }
    else if (real > 0)                  { barCor = '#4ade80'; statusLabel = 'Dentro do previsto'; statusCor = COR.verde }
    else                                { statusLabel = '○ Pendente'; statusCor = COR.amarelo }
  }
  return { pct, barPct, barCor, statusLabel, statusCor }
}

function diffMeta(tipo: 'e' | 's', planejado: number, real: number) {
  const diff = real - planejado
  if (tipo === 'e') {
    if (diff > 0.5)  return { label: 'Acima',    val: `+${fmt(diff)}`,  cor: COR.verde }
    if (diff < -0.5) return { label: 'A receber', val: fmt(-diff),       cor: COR.amarelo }
  } else {
    if (diff > 0.5)  return { label: 'Estourou',  val: fmt(diff),        cor: COR.vermelho }
    if (diff < -0.5) return { label: 'Disponível', val: fmt(-diff),      cor: COR.azul }
  }
  return { label: 'Diferença', val: '—', cor: COR.textoMuted }
}

export default function PlanRevisao({
  anoAtual, mesAtual, dadosPrevisto, lancadoPorCatMes, categorias, onAjustar, desvioMinPerc,
}: Props) {
  const hoje = new Date()
  const anoHoje = hoje.getFullYear()

  const mesesPassados = MESES.map((_, i) => i).filter(i => {
    if (anoAtual < anoHoje) return true
    if (anoAtual > anoHoje) return false
    return i < mesAtual
  })

  const [mesSel, setMesSel] = useState<number>(
    mesesPassados.length > 0 ? mesesPassados[mesesPassados.length - 1] : 0
  )
  const [etapa, setEtapa]           = useState<1 | 2 | 3>(1)
  const [justs, setJusts]           = useState<Record<string, JustState>>({})
  const [salvando, setSalvando]     = useState(false)
  const [toastMsg, setToastMsg]     = useState('')
  const [toastOk, setToastOk]       = useState(true)
  const [etapa2Erro, setEtapa2Erro] = useState('')
  const [expandOkE, setExpandOkE]   = useState(false)
  const [expandOkS, setExpandOkS]   = useState(false)
  const isMobile = useIsMobile()


  const lancado = lancadoPorCatMes[mesSel] ?? { entrada: {}, saida: {} }

  const totalRecPrev = dadosPrevisto.entradas.reduce((s, c) => s + (c.v[mesSel] ?? 0), 0)
  const totalRecReal = dadosPrevisto.entradas.reduce((s, c) => s + lancadoDaCat(lancado.entrada, c), 0)
  const totalDesPrev = dadosPrevisto.saidas.reduce((s, c) => s + (c.v[mesSel] ?? 0), 0)
  const totalDesReal = dadosPrevisto.saidas.reduce((s, c) => s + lancadoDaCat(lancado.saida, c), 0)

  const allEntradas: CatRow[] = dadosPrevisto.entradas.map((cat, ri) => {
    const planejado = cat.v[mesSel] ?? 0
    const real      = lancadoDaCat(lancado.entrada, cat)
    if (ehZero(planejado) && ehZero(real)) return null
    const desvioPercent = planejado === 0 ? (real > 0 ? Infinity : 0) : Math.abs((real - planejado) / planejado * 100)
    return { tipo: 'e' as const, cat, ri, planejado, real, desvioPercent, temDesvio: desvioPercent > desvioMinPerc }
  }).filter(Boolean) as CatRow[]

  const allSaidas: CatRow[] = dadosPrevisto.saidas.map((cat, ri) => {
    const planejado = cat.v[mesSel] ?? 0
    const real      = lancadoDaCat(lancado.saida, cat)
    if (ehZero(planejado) && ehZero(real)) return null
    const desvioPercent = planejado === 0 ? (real > 0 ? Infinity : 0) : Math.abs((real - planejado) / planejado * 100)
    return { tipo: 's' as const, cat, ri, planejado, real, desvioPercent, temDesvio: desvioPercent > desvioMinPerc }
  }).filter(Boolean) as CatRow[]

  const catsDesvio = [...allEntradas, ...allSaidas].filter(c => c.temDesvio)

  // Impact for Etapa 3
  let impactE = 0, impactS = 0
  for (const { tipo, ri, planejado, real } of catsDesvio) {
    const key = `${tipo}-${ri}`
    const j = getJust(key)
    const novoValor = j.acao === 'aceito' ? real : j.acao === 'ajustado' ? (parseFloat(j.valorAjustado) || planejado) : planejado
    if (tipo === 'e') impactE += novoValor - planejado
    else              impactS += novoValor - planejado
  }

  function mudarMes(mi: number) {
    setMesSel(mi)
    setEtapa(1)
    setJusts({})
    setEtapa2Erro('')
    setExpandOkE(false)
    setExpandOkS(false)
  }

  function getJust(key: string): JustState {
    return justs[key] ?? emptyJust()
  }

  function setJust(key: string, patch: Partial<JustState>) {
    setJusts(prev => ({ ...prev, [key]: { ...(prev[key] ?? emptyJust()), ...patch } }))
  }

  function validarEtapa2(): string | null {
    for (const { tipo, cat, ri, desvioPercent } of catsDesvio) {
      const key = `${tipo}-${ri}`
      if (desvioPercent > 20 && !getJust(key).justificativa.trim()) {
        const nomeExib = cat.descricao ? `${cat.nome} · ${cat.descricao}` : cat.nome
        return `Justificativa obrigatória: ${nomeExib} (desvio ${Math.round(desvioPercent === Infinity ? 100 : desvioPercent)}%)`
      }
    }
    return null
  }

  function mostrarToast(msg: string, ok: boolean) {
    setToastOk(ok)
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), ok ? 4000 : 6000)
  }

  async function salvarRevisao() {
    setSalvando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const mesInicio = mesSel + 1
      const rows: Record<string, unknown>[] = []

      for (const { tipo, cat, ri, planejado, real, desvioPercent } of catsDesvio) {
        const key  = `${tipo}-${ri}`
        const j    = getJust(key)
        const desvio = real - planejado
        const desvioPercentSigned = planejado > 0 ? Math.round((real - planejado) / planejado * 100) : 0

        rows.push({
          user_id: user.id, ano: anoAtual, mes: mesSel,
          categoria_nome: cat.nome,
          tipo: tipo === 'e' ? 'receita' : 'despesa',
          valor_previsto: planejado, valor_realizado: real,
          desvio, desvio_percentual: desvioPercentSigned,
          justificativa: j.justificativa.trim() || `Desvio de ${Math.round(desvioPercent === Infinity ? 100 : desvioPercent)}%`,
          tipo_evento: j.tipoEvento || null,
          meses_recorrencia: j.mesesRecorrencia.length > 0 ? j.mesesRecorrencia : null,
          tags: j.tags.length > 0 ? j.tags : null,
          acao_tomada: j.acao || 'mantido',
          valor_ajustado: j.acao === 'ajustado' ? (parseFloat(j.valorAjustado) || null) : null,
        })

        if (mesInicio <= 11) {
          if (j.acao === 'aceito') {
            onAjustar(tipo, ri, mesInicio, real)
          } else if (j.acao === 'ajustado') {
            const v = parseFloat(j.valorAjustado)
            if (!isNaN(v) && v >= 0) onAjustar(tipo, ri, mesInicio, v)
          }
        }
      }

      if (rows.length > 0) {
        const { error } = await supabase.from('licoes_aprendidas').insert(rows)
        if (error) throw error
      }

      mostrarToast(`Revisão salva ✓ — ${rows.length} lição(ões) registrada(s)`, true)
      mudarMes(mesSel)
    } catch (err: unknown) {
      mostrarToast(`Erro: ${err instanceof Error ? err.message : String(err)}`, false)
    } finally {
      setSalvando(false)
    }
  }

  const mesInicio = mesSel + 1

  // ── Style helpers ────────────────────────────────────────────────────────
  const btnBase = (active: boolean, cor: string, bg: string) => ({
    border: `1.5px solid ${active ? cor : COR.borda}`,
    borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
    fontSize: 12, fontWeight: 700,
    background: active ? bg : 'transparent',
    color: active ? cor : COR.textoSuave,
    transition: 'all .15s',
    fontFamily: 'inherit',
  } as React.CSSProperties)

  const colLbl: React.CSSProperties = { fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.3px' }
  const colW = 90

  // ── Calendar nav ─────────────────────────────────────────────────────────


  const calNav = (
    <SeletorMesAno
      mes={mesSel} ano={anoAtual}
      onSelect={m => mudarMes(m)}
      habilitado={(m, a) => a === anoAtual && mesesPassados.includes(m)}
      anoFixo
    />
  )

  // ── Row renderer ─────────────────────────────────────────────────────────
  function renderCatRow(row: CatRow) {
    const { tipo, cat, ri, planejado, real, temDesvio } = row
    const { icone } = iconeCategoria(categorias, cat.nome)
    const rm = rowMeta(tipo, planejado, real)
    const dm = diffMeta(tipo, planejado, real)

    return (
      <div key={`${tipo}-${ri}`} style={{
        padding: isMobile ? '8px 12px' : '10px 14px',
        display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 8,
        borderBottom: `1px solid #f1f5f9`,
        background: temDesvio ? '#fef2f2' : '#fff',
      }}>
        <div style={{ width: 3, height: 32, borderRadius: 2, background: rm.barCor, flexShrink: 0 }} />
        <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0, background: temDesvio ? '#fee2e2' : '#f1f5f9' }}>
          {icone}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: COR.texto, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            <span>{cat.nome}{cat.descricao && <span style={{ fontWeight: 400, color: COR.textoSuave }}> · {cat.descricao}</span>}</span>
            {temDesvio && (
              <span style={{ fontSize: 9, fontWeight: 700, color: COR.vermelho, background: '#fee2e2', borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>⚠ Justificar</span>
            )}
          </div>
          <div style={{ fontSize: 9, marginTop: 2, color: rm.statusCor }}>{rm.statusLabel}</div>
        </div>

        {isMobile ? (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: real > 0 ? COR.texto : '#cbd5e1' }}>{real > 0 ? fmt(real) : '—'}</div>
            <div style={{ fontSize: 10, color: COR.textoMuted }}>/ {fmt(planejado)}</div>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'right', width: colW, padding: '0 4px', flexShrink: 0 }}>
              <div style={colLbl}>Previsto</div>
              <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2, color: '#94a3b8' }}>{fmt(planejado)}</div>
            </div>
            <div style={{ textAlign: 'right', width: colW, padding: '0 4px', flexShrink: 0 }}>
              <div style={colLbl}>Realizado</div>
              <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2, color: real > 0 ? COR.texto : '#cbd5e1' }}>{real > 0 ? fmt(real) : '—'}</div>
            </div>
            <div style={{ textAlign: 'right', width: colW, padding: '0 4px', flexShrink: 0 }}>
              <div style={colLbl}>{dm.label}</div>
              <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2, color: dm.cor }}>{dm.val}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, width: colW, justifyContent: 'flex-end', flexShrink: 0 }}>
              <div style={{ width: 50, height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${rm.barPct}%`, background: rm.barCor }} />
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, minWidth: 34, textAlign: 'right', color: rm.statusCor }}>{rm.pct}%</div>
            </div>
          </>
        )}
      </div>
    )
  }

  // ── Subtotal row ─────────────────────────────────────────────────────────
  function renderSubtotal(tipo: 'e' | 's', label: string, prevTotal: number, realTotal: number) {
    const rm  = rowMeta(tipo, prevTotal, realTotal)
    const dm  = diffMeta(tipo, prevTotal, realTotal)
    const barCor = tipo === 'e' ? COR.azul : (realTotal > prevTotal ? COR.vermelho : '#4ade80')

    return (
      <div style={{ padding: isMobile ? '8px 12px' : '10px 14px', display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 8, borderTop: '2px solid #e2e8f0', background: '#f1f5f9' }}>
        <div style={{ width: 3, height: 32, borderRadius: 2, background: barCor, flexShrink: 0 }} />
        <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0, background: '#e2e8f0', fontWeight: 700, color: '#475569' }}>Σ</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: COR.texto }}>Total {label}</div>
        </div>
        {isMobile ? (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 800 }}>{fmt(realTotal, true)}</div>
            <div style={{ fontSize: 10, color: COR.textoMuted }}>/ {fmt(prevTotal, true)}</div>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'right', width: colW, padding: '0 4px', flexShrink: 0 }}>
              <div style={colLbl}>Previsto</div>
              <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2, color: COR.textoSuave }}>{fmt(prevTotal, true)}</div>
            </div>
            <div style={{ textAlign: 'right', width: colW, padding: '0 4px', flexShrink: 0 }}>
              <div style={colLbl}>Realizado</div>
              <div style={{ fontSize: 12, fontWeight: 800, marginTop: 2 }}>{fmt(realTotal, true)}</div>
            </div>
            <div style={{ textAlign: 'right', width: colW, padding: '0 4px', flexShrink: 0 }}>
              <div style={colLbl}>{dm.label}</div>
              <div style={{ fontSize: 12, fontWeight: 800, marginTop: 2, color: dm.cor }}>{dm.val}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, width: colW, justifyContent: 'flex-end', flexShrink: 0 }}>
              <div style={{ width: 50, height: 6, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${rm.barPct}%`, background: barCor }} />
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, minWidth: 34, textAlign: 'right', color: barCor }}>{rm.pct}%</div>
            </div>
          </>
        )}
      </div>
    )
  }

  // ── Group block ──────────────────────────────────────────────────────────
  function renderGroup(
    tipo: 'e' | 's',
    rows: CatRow[],
    label: string,
    iconeGrupo: string,
    prevTotal: number,
    realTotal: number,
    expandOk: boolean,
    setExpandOk: (v: boolean) => void,
  ) {
    if (rows.length === 0) return null
    const gradBg  = tipo === 'e' ? 'linear-gradient(135deg,#0f2878,#1e40af)' : 'linear-gradient(135deg,#7f1d1d,#991b1b)'
    const desvioRows = rows.filter(r => r.temDesvio)
    const okRows     = rows.filter(r => !r.temDesvio)

    return (
      <div style={{ marginBottom: 16 }}>
        {/* Group header */}
        <div style={{ background: gradBg, borderRadius: '12px 12px 0 0', padding: '12px 16px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>{iconeGrupo}</span>
            {label}
            {desvioRows.length > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: '2px 8px' }}>
                {desvioRows.length} desvio{desvioRows.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 8, opacity: .6, textTransform: 'uppercase', letterSpacing: '.5px' }}>Total previsto</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{fmt(prevTotal, true)}</div>
          </div>
        </div>

        {/* Rows */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderTop: 0, borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
          {desvioRows.map(r => renderCatRow(r))}

          {okRows.length > 0 && (
            <>
              <button onClick={() => setExpandOk(!expandOk)}
                style={{ width: '100%', padding: '8px 14px', border: 'none', background: '#f8fafc', cursor: 'pointer', textAlign: 'left', fontSize: 11, fontWeight: 700, color: COR.verde, borderTop: desvioRows.length > 0 ? '1px dashed #e2e8f0' : 'none', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
                ✅ {okRows.length} {okRows.length === 1 ? 'categoria' : 'categorias'} dentro do planejado {expandOk ? '▾' : '▸'}
              </button>
              {expandOk && okRows.map(r => renderCatRow(r))}
            </>
          )}

          {renderSubtotal(tipo, label, prevTotal, realTotal)}
        </div>
      </div>
    )
  }

  // ── Tags helper ──────────────────────────────────────────────────────────
  function renderTagsField(key: string, j: JustState) {
    return (
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: COR.textoSuave, marginBottom: 8 }}>Tags (opcional)</div>
        {j.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {j.tags.map(tag => (
              <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#eff6ff', color: COR.azul, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
                {tag}
                <button onClick={() => setJust(key, { tags: j.tags.filter(t => t !== tag) })} style={{ border: 'none', background: 'none', cursor: 'pointer', color: COR.azul, padding: 0, fontSize: 13, lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={j.tagInput} onChange={e => setJust(key, { tagInput: e.target.value })}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                const tag = j.tagInput.trim()
                if (tag && !j.tags.includes(tag)) setJust(key, { tags: [...j.tags, tag], tagInput: '' })
                else setJust(key, { tagInput: '' })
              }
            }}
            placeholder="Digite e pressione Enter"
            style={{ flex: 1, border: `1.5px solid ${COR.borda}`, borderRadius: 8, padding: '6px 10px', fontSize: 12, fontFamily: 'inherit', color: COR.texto, outline: 'none' }}
          />
          <button onClick={() => {
            const tag = j.tagInput.trim()
            if (tag && !j.tags.includes(tag)) setJust(key, { tags: [...j.tags, tag], tagInput: '' })
            else setJust(key, { tagInput: '' })
          }} style={{ border: `1.5px solid ${COR.borda}`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: 'transparent', color: COR.textoSuave, fontFamily: 'inherit' }}>+</button>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Toast */}
      {toastMsg && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toastOk ? COR.verde : COR.vermelho, color: '#fff', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,.25)', maxWidth: 320 }}>
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '12px 16px 0', flexShrink: 0 }}>
        {mesesPassados.length === 0 ? (
          <PageHeader icon="ti-calendar-stats" breadcrumb="PLANEJAMENTO" title="Revisão Mensal" subtitle="Nenhum mês passado disponível" />
        ) : (
          <PageHeader icon="ti-calendar-stats" breadcrumb="PLANEJAMENTO" title="Revisão Mensal" rightContent={calNav} />
        )}
      </div>

      {mesesPassados.length > 0 && (
        <div style={{ padding: '16px 16px 80px' }}>
          {/* Step indicator */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
            {(['1. Visão Geral', '2. Justificar', '3. Confirmar'] as const).map((label, idx) => {
              const e = (idx + 1) as 1 | 2 | 3
              return (
                <button key={e} onClick={() => { if (etapa > e) setEtapa(e) }}
                  style={{ flex: 1, border: 'none', borderRadius: 8, padding: '7px 4px', fontSize: 11, fontWeight: 700, cursor: etapa > e ? 'pointer' : 'default', background: etapa === e ? COR.azul : 'transparent', color: etapa === e ? '#fff' : etapa > e ? COR.textoSuave : '#bdc9db', transition: 'all .15s', fontFamily: 'inherit' }}>
                  {label}
                </button>
              )
            })}
          </div>

          {/* ── ETAPA 1: Visão Geral ──────────────────────────────────────── */}
          {etapa === 1 && (
            <div>
              <AcResumoBoxes isMobile={isMobile} totalPrevE={totalRecPrev} totalPrevS={totalDesPrev} totalRealE={totalRecReal} totalRealS={totalDesReal} />

              {renderGroup('e', allEntradas, 'Receitas', '💰', totalRecPrev, totalRecReal, expandOkE, setExpandOkE)}
              {renderGroup('s', allSaidas,   'Despesas', '💸', totalDesPrev, totalDesReal, expandOkS, setExpandOkS)}

              {allEntradas.length === 0 && allSaidas.length === 0 && (
                <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '14px 16px', marginBottom: 16, border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: COR.verde }}>Nenhum lançamento registrado neste mês.</div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                <button onClick={() => setEtapa(catsDesvio.length > 0 ? 2 : 3)}
                  style={{ border: 'none', borderRadius: 10, padding: '10px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: COR.azul, color: '#fff', boxShadow: '0 2px 8px rgba(26,86,219,.25)', fontFamily: 'inherit' }}>
                  {catsDesvio.length > 0 ? `Próximo: Justificar ${catsDesvio.length} desvio${catsDesvio.length > 1 ? 's' : ''} →` : 'Confirmar revisão →'}
                </button>
              </div>
            </div>
          )}

          {/* ── ETAPA 2: Justificar Desvios ──────────────────────────────── */}
          {etapa === 2 && (
            <div>
              {catsDesvio.map(({ tipo, cat, ri, planejado, real, desvioPercent }) => {
                const key = `${tipo}-${ri}`
                const j   = getJust(key)
                const { icone } = iconeCategoria(categorias, cat.nome)
                const obrigatorio = desvioPercent > 20
                const rm  = rowMeta(tipo, planejado, real)
                const dm  = diffMeta(tipo, planejado, real)
                const gradBg = tipo === 'e'
                  ? 'linear-gradient(135deg,rgba(15,40,120,0.9),rgba(26,86,219,0.9))'
                  : 'linear-gradient(135deg,rgba(127,29,29,0.9),rgba(185,28,28,0.9))'

                return (
                  <div key={key} style={{ background: COR.branco, borderRadius: 14, boxShadow: '0 1px 6px rgba(0,0,0,.07)', marginBottom: 16, overflow: 'hidden' }}>
                    {/* Card header — gradient */}
                    <div style={{ background: gradBg, padding: '12px 16px', color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{icone}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>
                          {cat.nome}{cat.descricao && <span style={{ fontWeight: 400, opacity: .8 }}> · {cat.descricao}</span>}
                        </div>
                        <div style={{ fontSize: 11, opacity: .75, marginTop: 2 }}>
                          Desvio de {Math.round(desvioPercent === Infinity ? 100 : desvioPercent)}%
                          {obrigatorio && ' · Justificativa obrigatória'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 8, opacity: .65, textTransform: 'uppercase', letterSpacing: '.3px' }}>Previsto</div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{fmt(planejado, true)}</div>
                      </div>
                    </div>

                    {/* Summary line */}
                    <div style={{ padding: '10px 16px', background: '#f8fafc', display: 'flex' }}>
                      {[
                        { l: 'Previsto',  v: fmt(planejado, true), c: COR.textoSuave },
                        { l: 'Realizado', v: fmt(real, true),      c: rm.statusCor },
                        { l: dm.label,    v: dm.val,               c: dm.cor },
                      ].map(col => (
                        <div key={col.l} style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.3px' }}>{col.l}</div>
                          <div style={{ fontSize: isMobile ? 13 : 15, fontWeight: 800, color: col.c, marginTop: 2 }}>{col.v}</div>
                        </div>
                      ))}
                    </div>
                    {/* Progress bar */}
                    <div style={{ height: 4, background: '#e2e8f0' }}>
                      <div style={{ height: '100%', width: `${rm.barPct}%`, background: rm.barCor }} />
                    </div>

                    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {/* O que aconteceu */}
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: COR.textoSuave, display: 'block', marginBottom: 6 }}>
                          O que aconteceu?{obrigatorio && <span style={{ color: COR.vermelho }}> *</span>}
                        </label>
                        <textarea value={j.justificativa} onChange={e => setJust(key, { justificativa: e.target.value })}
                          placeholder={obrigatorio ? 'Obrigatório para desvios acima de 20%' : 'Opcional — descreva o motivo do desvio'}
                          rows={3}
                          style={{ width: '100%', boxSizing: 'border-box', border: `1.5px solid ${!j.justificativa.trim() && obrigatorio ? COR.vermelho : COR.borda}`, borderRadius: 8, padding: '8px 10px', fontSize: 13, resize: 'vertical', fontFamily: 'inherit', color: COR.texto, outline: 'none' }}
                        />
                      </div>

                      {/* Tipo de evento */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: COR.textoSuave, marginBottom: 8 }}>Isso acontece com frequência?</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {(['pontual', 'anual', 'sazonal'] as const).map(te => (
                            <button key={te} onClick={() => setJust(key, { tipoEvento: j.tipoEvento === te ? '' : te })} style={btnBase(j.tipoEvento === te, COR.azul, '#eff6ff')}>
                              {te === 'pontual' ? '🎯 Pontual' : te === 'anual' ? '📅 Todo ano' : '🔄 Sazonal'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Meses recorrência */}
                      {(j.tipoEvento === 'anual' || j.tipoEvento === 'sazonal') && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: COR.textoSuave, marginBottom: 8 }}>Em quais meses acontece?</div>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {MESES.map((m, mi) => (
                              <button key={mi} onClick={() => {
                                const arr = j.mesesRecorrencia.includes(mi) ? j.mesesRecorrencia.filter(x => x !== mi) : [...j.mesesRecorrencia, mi]
                                setJust(key, { mesesRecorrencia: arr })
                              }} style={btnBase(j.mesesRecorrencia.includes(mi), COR.azul, '#eff6ff')}>{m}</button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      {renderTagsField(key, j)}

                      {/* Ação */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: COR.textoSuave, marginBottom: 8 }}>O que fazer no planejamento?</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                          <button onClick={() => setJust(key, { acao: j.acao === 'aceito' ? '' : 'aceito' })}
                            style={{ ...btnBase(j.acao === 'aceito', COR.verde, '#dcfce7'), flex: '1 1 auto', textAlign: 'center', padding: '10px 8px' }}>
                            <div>Aceitar valor real</div>
                            <div style={{ fontSize: 11, marginTop: 2, fontWeight: 600 }}>{fmt(real)}</div>
                          </button>
                          <button onClick={() => setJust(key, { acao: j.acao === 'mantido' ? '' : 'mantido' })}
                            style={{ ...btnBase(j.acao === 'mantido', COR.azul, '#dbeafe'), flex: '1 1 auto', textAlign: 'center', padding: '10px 8px' }}>
                            <div>Manter planejado</div>
                            <div style={{ fontSize: 11, marginTop: 2, fontWeight: 600 }}>{fmt(planejado)}</div>
                          </button>
                          <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <button onClick={() => setJust(key, { acao: j.acao === 'ajustado' ? '' : 'ajustado' })}
                              style={{ ...btnBase(j.acao === 'ajustado', COR.amarelo, '#fef3c7'), color: j.acao === 'ajustado' ? '#92400e' : COR.textoSuave, width: '100%', padding: '10px 8px', textAlign: 'center' }}>
                              Ajustar para R$…
                            </button>
                            {j.acao === 'ajustado' && (
                              <input type="number" min="0" step="0.01" value={j.valorAjustado} onChange={e => setJust(key, { valorAjustado: e.target.value })} placeholder="0.00"
                                style={{ border: `1.5px solid ${COR.amarelo}`, borderRadius: 8, padding: '6px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {etapa2Erro && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: COR.vermelho, fontWeight: 600 }}>
                  ⚠️ {etapa2Erro}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <button onClick={() => { setEtapa(1); setEtapa2Erro('') }}
                  style={{ border: `1.5px solid ${COR.borda}`, borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'transparent', color: COR.textoSuave, fontFamily: 'inherit' }}>
                  ← Voltar
                </button>
                <button onClick={() => {
                  const err = validarEtapa2()
                  if (err) { setEtapa2Erro(err); return }
                  setEtapa2Erro('')
                  setEtapa(3)
                }} style={{ border: 'none', borderRadius: 10, padding: '10px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: COR.azul, color: '#fff', boxShadow: '0 2px 8px rgba(26,86,219,.25)', fontFamily: 'inherit' }}>
                  Próximo: Confirmar →
                </button>
              </div>
            </div>
          )}

          {/* ── ETAPA 3: Confirmar e Aplicar ─────────────────────────────── */}
          {etapa === 3 && (
            <div>
              <div style={{ background: COR.branco, borderRadius: 14, boxShadow: '0 1px 6px rgba(0,0,0,.07)', overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ padding: '14px 16px', borderBottom: `1px solid ${COR.borda}` }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: COR.texto }}>Resumo da revisão</div>
                  <div style={{ fontSize: 11, color: COR.textoSuave }}>{MESES_FULL[mesSel]} {anoAtual}</div>
                </div>

                {catsDesvio.length === 0 ? (
                  <div style={{ padding: 16, fontSize: 13, color: COR.textoSuave }}>
                    ✅ Nenhum desvio significativo — nada a registrar neste mês.
                  </div>
                ) : catsDesvio.map(({ tipo, cat, ri, planejado, real }) => {
                  const key = `${tipo}-${ri}`
                  const j   = getJust(key)
                  const { icone } = iconeCategoria(categorias, cat.nome)
                  const dm  = diffMeta(tipo, planejado, real)
                  const tipoLabel = j.tipoEvento === 'pontual' ? ' · 🎯 Pontual' : j.tipoEvento === 'anual' ? ' · 📅 Anual' : j.tipoEvento === 'sazonal' ? ' · 🔄 Sazonal' : ''
                  const [acaoCor, acaoLabel, acaoBg] =
                    j.acao === 'aceito'  ? [COR.verde,     `Aceitar ${fmt(real)}`,                        '#dcfce7'] :
                    j.acao === 'mantido' ? [COR.azul,      `Manter ${fmt(planejado)}`,                    '#dbeafe'] :
                    j.acao === 'ajustado'? [COR.amarelo,   `Ajustar para R$ ${j.valorAjustado || '?'}`,   '#fef3c7'] :
                                           [COR.textoMuted, '— Sem decisão',                               '#f1f5f9']

                  return (
                    <div key={key} style={{ padding: '10px 16px', borderBottom: `1px solid ${COR.borda}`, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icone}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: COR.texto }}>
                          {cat.nome}{cat.descricao && <span style={{ fontWeight: 400, color: COR.textoSuave }}> · {cat.descricao}</span>}
                          <span style={{ fontSize: 11, fontWeight: 400, color: COR.textoSuave }}>{tipoLabel}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, color: COR.textoSuave }}>
                            {fmt(planejado)} → {fmt(real)} <span style={{ color: dm.cor }}>({dm.val})</span>
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: acaoCor, background: acaoBg, borderRadius: 20, padding: '1px 8px' }}>{acaoLabel}</span>
                        </div>
                        {j.justificativa.trim() && (
                          <div style={{ fontSize: 11, color: COR.textoMuted, marginTop: 3, fontStyle: 'italic' }}>
                            "{j.justificativa.slice(0, 90)}{j.justificativa.length > 90 ? '…' : ''}"
                          </div>
                        )}
                        {j.tags.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                            {j.tags.map(tag => (
                              <span key={tag} style={{ background: '#eff6ff', color: COR.azul, borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Impact summary */}
                {(impactE !== 0 || impactS !== 0) && (
                  <div style={{ padding: '10px 16px', background: '#f8fafc', borderTop: `2px solid ${COR.borda}` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: COR.textoSuave, marginBottom: 6 }}>Impacto no planejamento futuro:</div>
                    {impactE !== 0 && (
                      <div style={{ fontSize: 12, color: impactE > 0 ? COR.verde : COR.vermelho }}>
                        Receitas: {impactE > 0 ? '+' : ''}{fmt(impactE)} / mês
                      </div>
                    )}
                    {impactS !== 0 && (
                      <div style={{ fontSize: 12, color: impactS > 0 ? COR.vermelho : COR.verde }}>
                        Despesas: {impactS > 0 ? '+' : ''}{fmt(impactS)} / mês
                      </div>
                    )}
                  </div>
                )}
              </div>

              {mesInicio > 11 && (
                <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 16, background: '#fef9c3', fontSize: 12, color: '#92400e', border: '1px solid #fde68a' }}>
                  Dezembro é o último mês — as lições serão salvas, mas não há meses futuros para aplicar ajustes.
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <button onClick={() => setEtapa(catsDesvio.length > 0 ? 2 : 1)}
                  style={{ border: `1.5px solid ${COR.borda}`, borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'transparent', color: COR.textoSuave, fontFamily: 'inherit' }}>
                  ← Voltar
                </button>
                <button onClick={salvarRevisao} disabled={salvando}
                  style={{ border: 'none', borderRadius: 10, padding: '10px 22px', fontSize: 13, fontWeight: 700, cursor: salvando ? 'wait' : 'pointer', background: salvando ? COR.textoSuave : COR.verde, color: '#fff', boxShadow: salvando ? 'none' : '0 2px 8px rgba(22,163,74,.3)', transition: 'all .15s', fontFamily: 'inherit' }}>
                  {salvando ? 'Salvando…' : 'Salvar revisão e aplicar →'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
