import { useState } from 'react'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { supabase } from '../../lib/supabase'
import { fmt, COR, MESES, MESES_FULL, type AnoData } from './types'

interface Props {
  anoAtual: number
  mesAtual: number
  dadosPrevisto: AnoData
  lancadoPorCatMes: Record<number, { entrada: Record<string, number>; saida: Record<string, number> }>
  categorias: any[]
  onAjustar: (tipo: 'e' | 's', ri: number, mesInicio: number, valor: number) => void
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

type CatDesvio = {
  tipo: 'e' | 's'
  cat: { nome: string; v: number[] }
  ri: number
  planejado: number
  real: number
  desvioPercent: number
}

function emptyJust(): JustState {
  return { justificativa: '', tipoEvento: '', mesesRecorrencia: [], tags: [], tagInput: '', acao: '', valorAjustado: '' }
}

function badgeInfo(tipo: 'e' | 's', planejado: number, realizado: number) {
  if (planejado === 0 && realizado === 0) return null
  const ratio = planejado > 0 ? realizado / planejado : realizado > 0 ? Infinity : 0
  if (tipo === 'e') {
    if (ratio >= 0.95) return { icon: '✅', cor: '#16a34a', label: 'OK' }
    if (ratio >= 0.7)  return { icon: '⚠️', cor: '#d97706', label: `${Math.round(ratio * 100)}%` }
    return { icon: '🔴', cor: '#dc2626', label: `${Math.round(ratio * 100)}%` }
  } else {
    if (ratio <= 1.05) return { icon: '✅', cor: '#16a34a', label: 'OK' }
    if (ratio <= 1.3)  return { icon: '⚠️', cor: '#d97706', label: `+${Math.round((ratio - 1) * 100)}%` }
    return { icon: '🔴', cor: '#dc2626', label: `+${Math.round((ratio - 1) * 100)}%` }
  }
}

// ── Helpers visuais ────────────────────────────────────────────────────────

function calcRowStyle(tipo: 'e' | 's', planejado: number, real: number) {
  const isEntrada = tipo === 'e'
  let statusTexto: string, statusCor: string, barraCor: string
  if (isEntrada) {
    if (real >= planejado && planejado > 0) { statusTexto = '✓ Recebido'; statusCor = '#16a34a'; barraCor = '#4ade80' }
    else if (real > 0) { statusTexto = '◐ Parcial'; statusCor = '#d97706'; barraCor = '#fbbf24' }
    else { statusTexto = '○ A receber'; statusCor = '#d97706'; barraCor = '#fbbf24' }
  } else {
    if (real === 0) { statusTexto = '○ Pendente'; statusCor = '#d97706'; barraCor = '#fbbf24' }
    else if (real > planejado && planejado > 0) { statusTexto = '⚠ Acima do previsto'; statusCor = '#dc2626'; barraCor = '#f87171' }
    else if (real === planejado) { statusTexto = '✓ Pago'; statusCor = '#16a34a'; barraCor = '#4ade80' }
    else { statusTexto = 'Dentro do previsto'; statusCor = '#16a34a'; barraCor = '#4ade80' }
  }
  let difLabel: string, difVal: number, difCor: string
  if (isEntrada) {
    if (real >= planejado) { difLabel = 'Diferença'; difVal = real - planejado; difCor = '#16a34a' }
    else { difLabel = 'Faltou'; difVal = planejado - real; difCor = '#d97706' }
  } else {
    if (real > planejado) { difLabel = 'Estourou'; difVal = real - planejado; difCor = '#dc2626' }
    else { difLabel = 'Disponível'; difVal = planejado - real; difCor = '#1a56db' }
  }
  const perc       = planejado > 0 ? real / planejado : (real > 0 ? 1 : 0)
  const percClamp  = Math.min(perc, 1)
  const percLabel  = planejado > 0 || real > 0 ? `${Math.round(perc * 100)}%` : '—'
  const percCor    = perc === 0 ? '#cbd5e1' : perc > 1 ? '#dc2626' : '#16a34a'
  const barFill    = perc > 1 ? '#f87171' : barraCor
  const iconeFundo = barraCor === '#4ade80' ? '#f0fdf4' : barraCor === '#f87171' ? '#fef2f2' : '#fffbeb'
  const realCor    = real === 0 ? '#cbd5e1' : isEntrada ? '#1e293b' : (real > planejado && planejado > 0 ? '#dc2626' : '#1e293b')
  return { statusTexto, statusCor, barraCor, difLabel, difVal, difCor, perc, percClamp, percLabel, percCor, barFill, iconeFundo, realCor }
}

function DesvioRow({ tipo, cat, planejado, real, categorias }: {
  tipo: 'e' | 's'; cat: { nome: string }; planejado: number; real: number; categorias: any[]
}) {
  const { icone } = iconeCategoria(categorias, cat.nome)
  const s = calcRowStyle(tipo, planejado, real)
  return (
    <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #f1f5f9', background: '#fff' }}>
      <div style={{ width: 3, height: 32, borderRadius: 2, background: s.barraCor, flexShrink: 0 }} />
      <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: s.iconeFundo, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{icone}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.nome}</div>
        <div style={{ fontSize: 9, marginTop: 2, color: s.statusCor }}>{s.statusTexto}</div>
      </div>
      <div style={{ textAlign: 'right', width: 90, padding: '0 4px', flexShrink: 0 }}>
        <div style={{ fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .3 }}>Planejado</div>
        <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2, color: '#94a3b8' }}>{planejado > 0 ? fmt(planejado) : '—'}</div>
      </div>
      <div style={{ textAlign: 'right', width: 90, padding: '0 4px', flexShrink: 0 }}>
        <div style={{ fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .3 }}>Realizado</div>
        <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2, color: s.realCor }}>{real > 0 ? fmt(real) : '—'}</div>
      </div>
      <div style={{ textAlign: 'right', width: 90, padding: '0 4px', flexShrink: 0 }}>
        <div style={{ fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .3 }}>{s.difLabel}</div>
        <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2, color: s.difCor }}>{fmt(s.difVal)}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, width: 90, justifyContent: 'flex-end', flexShrink: 0 }}>
        <div style={{ width: 50, height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 2, width: `${s.percClamp * 100}%`, background: s.barFill }} />
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, minWidth: 32, textAlign: 'right', color: s.percCor }}>{s.percLabel}</div>
      </div>
    </div>
  )
}

function DesvioCard({ tipo, catsDesvio, categorias }: {
  tipo: 'e' | 's'; catsDesvio: CatDesvio[]; categorias: any[]
}) {
  const isEntrada  = tipo === 'e'
  const cats       = catsDesvio.filter(c => c.tipo === tipo)
  if (cats.length === 0) return null

  const gradient   = isEntrada ? 'linear-gradient(135deg,#0f2878,#1a56db)' : 'linear-gradient(135deg,#7f1d1d,#b91c1c)'
  const tipoLabel  = isEntrada ? 'Receitas' : 'Despesas'
  const totalPrev  = cats.reduce((s, c) => s + c.planejado, 0)
  const totalReal  = cats.reduce((s, c) => s + c.real, 0)
  const grupoIcone = cats[0] ? iconeCategoria(categorias, cats[0].cat.nome).icone : (isEntrada ? '💰' : '📋')

  const perc    = totalPrev > 0 ? totalReal / totalPrev : (totalReal > 0 ? 1 : 0)
  const barCor  = isEntrada ? (totalReal >= totalPrev ? '#4ade80' : '#fbbf24') : (totalReal > totalPrev ? '#f87171' : '#4ade80')
  const difLabel = isEntrada ? (totalReal >= totalPrev ? 'Diferença' : 'Faltou') : (totalReal > totalPrev ? 'Estourou' : 'Disponível')
  const difVal   = Math.abs(isEntrada ? totalReal - totalPrev : totalPrev - totalReal)
  const difCor   = isEntrada ? (totalReal >= totalPrev ? '#4ade80' : '#fcd34d') : (totalReal > totalPrev ? '#fca5a5' : '#93c5fd')

  return (
    <div style={{ flexShrink: 0 }}>
      <div style={{ background: gradient, borderRadius: '12px 12px 0 0', padding: '10px 14px', color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 3, flexShrink: 0 }} />
        <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{grupoIcone}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>{tipoLabel} — {cats.length} com desvio</div>
        </div>
        <div style={{ textAlign: 'right', width: 90, padding: '0 4px', flexShrink: 0 }}>
          <div style={{ fontSize: 8, opacity: .6, textTransform: 'uppercase', letterSpacing: .3 }}>Planejado</div>
          <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}>{fmt(totalPrev)}</div>
        </div>
        <div style={{ textAlign: 'right', width: 90, padding: '0 4px', flexShrink: 0 }}>
          <div style={{ fontSize: 8, opacity: .6, textTransform: 'uppercase', letterSpacing: .3 }}>Realizado</div>
          <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2 }}>{fmt(totalReal)}</div>
        </div>
        <div style={{ textAlign: 'right', width: 90, padding: '0 4px', flexShrink: 0 }}>
          <div style={{ fontSize: 8, opacity: .6, textTransform: 'uppercase', letterSpacing: .3 }}>{difLabel}</div>
          <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2, color: difCor }}>{fmt(difVal)}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, width: 90, justifyContent: 'flex-end', flexShrink: 0 }}>
          <div style={{ width: 50, height: 5, background: 'rgba(255,255,255,0.25)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 2, width: `${Math.min(perc, 1) * 100}%`, background: barCor }} />
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, minWidth: 32, textAlign: 'right', color: 'rgba(255,255,255,0.9)' }}>{Math.round(perc * 100)}%</div>
        </div>
      </div>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderTop: 0, borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
        {cats.map(({ cat, ri, planejado, real }) => (
          <DesvioRow key={`${tipo}-${ri}`} tipo={tipo} cat={cat} planejado={planejado} real={real} categorias={categorias} />
        ))}
      </div>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────

export default function PlanRevisao({
  anoAtual, mesAtual, dadosPrevisto, lancadoPorCatMes, categorias, onAjustar,
}: Props) {
  const hoje     = new Date()
  const anoHoje  = hoje.getFullYear()

  const mesesPassados = MESES.map((_, i) => i).filter(i => {
    if (anoAtual < anoHoje) return true
    if (anoAtual > anoHoje) return false
    return i < mesAtual
  })

  const [mesSel, setMesSel]     = useState<number>(mesesPassados.length > 0 ? mesesPassados[mesesPassados.length - 1] : 0)
  const [etapa, setEtapa]       = useState<1 | 2 | 3>(1)
  const [justs, setJusts]       = useState<Record<string, JustState>>({})
  const [salvando, setSalvando] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [toastOk, setToastOk]   = useState(true)
  const [etapa2Erro, setEtapa2Erro] = useState('')

  const lancado      = lancadoPorCatMes[mesSel] ?? { entrada: {}, saida: {} }
  const totalRecPrev = dadosPrevisto.entradas.reduce((s, c) => s + (c.v[mesSel] ?? 0), 0)
  const totalRecReal = dadosPrevisto.entradas.reduce((s, c) => s + (lancado.entrada[c.nome] ?? 0), 0)
  const totalDesPrev = dadosPrevisto.saidas.reduce((s, c) => s + (c.v[mesSel] ?? 0), 0)
  const totalDesReal = dadosPrevisto.saidas.reduce((s, c) => s + (lancado.saida[c.nome] ?? 0), 0)

  const catsDesvio: CatDesvio[] = []
  dadosPrevisto.entradas.forEach((cat, ri) => {
    const planejado = cat.v[mesSel] ?? 0
    const real = lancado.entrada[cat.nome] ?? 0
    if (planejado === 0 && real === 0) return
    const pct = planejado === 0 ? (real > 0 ? 100 : 0) : Math.abs((real - planejado) / planejado * 100)
    if (pct > 10) catsDesvio.push({ tipo: 'e', cat, ri, planejado, real, desvioPercent: pct })
  })
  dadosPrevisto.saidas.forEach((cat, ri) => {
    const planejado = cat.v[mesSel] ?? 0
    const real = lancado.saida[cat.nome] ?? 0
    if (planejado === 0 && real === 0) return
    const pct = planejado === 0 ? (real > 0 ? 100 : 0) : Math.abs((real - planejado) / planejado * 100)
    if (pct > 10) catsDesvio.push({ tipo: 's', cat, ri, planejado, real, desvioPercent: pct })
  })

  function mudarMes(mi: number) { setMesSel(mi); setEtapa(1); setJusts({}); setEtapa2Erro('') }
  function getJust(key: string) { return justs[key] ?? emptyJust() }
  function setJust(key: string, patch: Partial<JustState>) {
    setJusts(prev => ({ ...prev, [key]: { ...(prev[key] ?? emptyJust()), ...patch } }))
  }
  function validarEtapa2(): string | null {
    for (const { tipo, cat, ri, desvioPercent } of catsDesvio) {
      const key = `${tipo}-${ri}`
      if (desvioPercent > 20 && !getJust(key).justificativa.trim())
        return `Justificativa obrigatória: ${cat.nome} (desvio ${Math.round(desvioPercent)}%)`
    }
    return null
  }
  function mostrarToast(msg: string, ok: boolean) {
    setToastOk(ok); setToastMsg(msg)
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
          user_id: user.id, ano: anoAtual, mes: mesSel, categoria_nome: cat.nome,
          tipo: tipo === 'e' ? 'receita' : 'despesa',
          valor_previsto: planejado, valor_realizado: real, desvio, desvio_percentual: desvioPercentSigned,
          justificativa: j.justificativa.trim() || `Desvio de ${Math.round(desvioPercent)}%`,
          tipo_evento: j.tipoEvento || null,
          meses_recorrencia: j.mesesRecorrencia.length > 0 ? j.mesesRecorrencia : null,
          tags: j.tags.length > 0 ? j.tags : null,
          acao_tomada: j.acao || 'mantido',
          valor_ajustado: j.acao === 'ajustado' ? (parseFloat(j.valorAjustado) || null) : null,
        })
        if (mesInicio <= 11) {
          if (j.acao === 'aceito') onAjustar(tipo, ri, mesInicio, real)
          else if (j.acao === 'ajustado') {
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
  const btnBase = (active: boolean, cor: string, bg: string) => ({
    border: `1.5px solid ${active ? cor : COR.borda}`, borderRadius: 8, padding: '6px 12px',
    cursor: 'pointer', fontSize: 12, fontWeight: 700,
    background: active ? bg : 'transparent', color: active ? cor : COR.textoSuave, transition: 'all .15s',
  })

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '16px 20px' }}>

      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toastOk ? COR.verde : COR.vermelho, color: '#fff',
          borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,.25)', maxWidth: 320,
        }}>{toastMsg}</div>
      )}

      {/* Seletor de mês */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {mesesPassados.length === 0 ? (
          <div style={{ fontSize: 13, color: COR.textoSuave, padding: '8px 0' }}>
            Nenhum mês passado disponível para revisão.
          </div>
        ) : mesesPassados.map(mi => (
          <button key={mi} onClick={() => mudarMes(mi)} style={{
            border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', transition: 'all .15s',
            background: mesSel === mi ? COR.azul : '#f1f5f9',
            color: mesSel === mi ? '#fff' : COR.textoSuave,
          }}>{MESES[mi]}</button>
        ))}
      </div>

      {mesesPassados.length > 0 && (<>

        {/* Indicador de etapas */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
          {(['1. Visão Geral', '2. Justificar', '3. Confirmar'] as const).map((label, idx) => {
            const e = (idx + 1) as 1 | 2 | 3
            return (
              <button key={e} onClick={() => { if (etapa > e) setEtapa(e) }} style={{
                flex: 1, border: 'none', borderRadius: 8, padding: '7px 4px',
                fontSize: 11, fontWeight: 700, cursor: etapa > e ? 'pointer' : 'default',
                background: etapa === e ? COR.azul : 'transparent',
                color: etapa === e ? '#fff' : etapa > e ? COR.textoSuave : '#bdc9db',
                transition: 'all .15s',
              }}>{label}</button>
            )
          })}
        </div>

        {/* ── ETAPA 1: Visão Geral ───────────────────────────── */}
        {etapa === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Resumo — 3 caixas gradiente estilo Evolução */}
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { icon: '↑', label: 'Receitas', prev: totalRecPrev, real: totalRecReal, realCor: '#93c5fd',
                  diff: totalRecReal - totalRecPrev, diffOk: totalRecReal >= totalRecPrev },
                { icon: '↓', label: 'Despesas', prev: totalDesPrev, real: totalDesReal, realCor: '#fca5a5',
                  diff: totalDesReal - totalDesPrev, diffOk: totalDesReal <= totalDesPrev },
                { icon: '=', label: 'Resultado', prev: totalRecPrev - totalDesPrev, real: totalRecReal - totalDesReal,
                  realCor: (totalRecReal - totalDesReal) >= 0 ? '#86efac' : '#fca5a5',
                  diff: (totalRecReal - totalDesReal) - (totalRecPrev - totalDesPrev),
                  diffOk: (totalRecReal - totalDesReal) >= (totalRecPrev - totalDesPrev) },
              ].map(c => {
                const difStr = c.diff === 0 ? null : `${c.diff > 0 ? '+' : ''}${fmt(c.diff)}`
                const difCor = c.diffOk ? '#86efac' : '#fca5a5'
                const difBg  = c.diffOk ? 'rgba(34,197,94,.18)' : 'rgba(239,68,68,.18)'
                return (
                  <div key={c.label} style={{
                    flex: 1, background: 'linear-gradient(135deg,#0f2878,#1e40af)',
                    border: '1px solid rgba(255,255,255,.15)', borderRadius: 14, padding: '14px 16px',
                  }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.65)',
                      textTransform: 'uppercase', letterSpacing: .6, marginBottom: 8 }}>
                      {c.icon} {c.label}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: c.realCor,
                      letterSpacing: '-.5px', fontVariantNumeric: 'tabular-nums', marginBottom: 6 }}>
                      {fmt(c.real)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <div>
                        <span style={{ fontSize: 8, fontWeight: 600, color: 'rgba(255,255,255,.45)',
                          textTransform: 'uppercase', letterSpacing: .4, display: 'block' }}>Planejado</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.6)',
                          fontVariantNumeric: 'tabular-nums' }}>{fmt(c.prev)}</span>
                      </div>
                      {difStr && (
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: 8, fontWeight: 600, color: 'rgba(255,255,255,.45)',
                            textTransform: 'uppercase', letterSpacing: .4, display: 'block' }}>Diferença</span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                            background: difBg, color: difCor, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                            {difStr}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Cards de desvio por tipo */}
            {catsDesvio.length > 0 ? (<>
              <DesvioCard tipo="e" catsDesvio={catsDesvio} categorias={categorias} />
              <DesvioCard tipo="s" catsDesvio={catsDesvio} categorias={categorias} />
            </>) : (
              <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '14px 16px',
                border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: COR.verde }}>
                  ✅ Todas as categorias dentro do planejado!
                </div>
                <div style={{ fontSize: 12, color: COR.textoSuave, marginTop: 4 }}>
                  Não há desvios significativos neste mês.
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEtapa(catsDesvio.length > 0 ? 2 : 3)}
                style={{ border: 'none', borderRadius: 10, padding: '10px 22px', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', background: COR.azul, color: '#fff',
                  boxShadow: '0 2px 8px rgba(26,86,219,.25)' }}>
                {catsDesvio.length > 0 ? 'Próximo: Justificar →' : 'Confirmar revisão →'}
              </button>
            </div>
          </div>
        )}

        {/* ── ETAPA 2: Justificar Desvios ───────────────────── */}
        {etapa === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {catsDesvio.map(({ tipo, cat, ri, planejado, real, desvioPercent }) => {
              const key        = `${tipo}-${ri}`
              const j          = getJust(key)
              const b          = badgeInfo(tipo, planejado, real)
              const { icone }  = iconeCategoria(categorias, cat.nome)
              const obrigatorio = desvioPercent > 20
              const isEntrada  = tipo === 'e'
              const gradient   = isEntrada ? 'linear-gradient(135deg,#0f2878,#1a56db)' : 'linear-gradient(135deg,#7f1d1d,#b91c1c)'
              const s          = calcRowStyle(tipo, planejado, real)

              return (
                <div key={key} style={{ background: COR.branco, borderRadius: 14, overflow: 'hidden',
                  boxShadow: '0 1px 6px rgba(0,0,0,.07)' }}>

                  {/* Header gradiente — mesmo padrão dos grupos */}
                  <div style={{ background: gradient, padding: '10px 14px', color: '#fff',
                    display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 3, flexShrink: 0 }} />
                    <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 16 }}>{icone}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{cat.nome}</div>
                      <div style={{ fontSize: 9, marginTop: 2, opacity: .7 }}>
                        {isEntrada ? 'Receita' : 'Despesa'} · desvio de {Math.round(desvioPercent)}%
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', width: 90, padding: '0 4px', flexShrink: 0 }}>
                      <div style={{ fontSize: 8, opacity: .6, textTransform: 'uppercase', letterSpacing: .3 }}>Planejado</div>
                      <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}>{fmt(planejado)}</div>
                    </div>
                    <div style={{ textAlign: 'right', width: 90, padding: '0 4px', flexShrink: 0 }}>
                      <div style={{ fontSize: 8, opacity: .6, textTransform: 'uppercase', letterSpacing: .3 }}>Realizado</div>
                      <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2 }}>{fmt(real)}</div>
                    </div>
                    <div style={{ textAlign: 'right', width: 90, padding: '0 4px', flexShrink: 0 }}>
                      <div style={{ fontSize: 8, opacity: .6, textTransform: 'uppercase', letterSpacing: .3 }}>{s.difLabel}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2, color: s.difCor === '#1a56db' ? '#93c5fd' : s.difCor }}>{fmt(s.difVal)}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, width: 90, justifyContent: 'flex-end', flexShrink: 0 }}>
                      <div style={{ width: 50, height: 5, background: 'rgba(255,255,255,0.25)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 2, width: `${s.percClamp * 100}%`, background: s.barFill }} />
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 700, minWidth: 32, textAlign: 'right', color: 'rgba(255,255,255,0.9)' }}>{s.percLabel}</div>
                    </div>
                    {b && <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0, opacity: .9 }}>{b.icon}</span>}
                  </div>

                  {/* Formulário */}
                  <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: COR.textoSuave, display: 'block', marginBottom: 6 }}>
                        O que aconteceu?{obrigatorio && <span style={{ color: COR.vermelho }}> *</span>}
                      </label>
                      <textarea
                        value={j.justificativa}
                        onChange={e => setJust(key, { justificativa: e.target.value })}
                        placeholder={obrigatorio ? 'Obrigatório para desvios acima de 20%' : 'Opcional — descreva o motivo do desvio'}
                        rows={3}
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          border: `1.5px solid ${!j.justificativa.trim() && obrigatorio ? COR.vermelho : COR.borda}`,
                          borderRadius: 8, padding: '8px 10px', fontSize: 13,
                          resize: 'vertical', fontFamily: 'inherit', color: COR.texto, outline: 'none',
                        }}
                      />
                    </div>

                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: COR.textoSuave, marginBottom: 8 }}>
                        Isso acontece com frequência?
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {(['pontual', 'anual', 'sazonal'] as const).map(te => (
                          <button key={te} onClick={() => setJust(key, { tipoEvento: j.tipoEvento === te ? '' : te })}
                            style={btnBase(j.tipoEvento === te, COR.azul, '#eff6ff')}>
                            {te === 'pontual' ? '🎯 Pontual' : te === 'anual' ? '📅 Todo ano' : '🔄 Sazonal'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {(j.tipoEvento === 'anual' || j.tipoEvento === 'sazonal') && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: COR.textoSuave, marginBottom: 8 }}>
                          Em quais meses acontece?
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {MESES.map((m, mi) => (
                            <button key={mi}
                              onClick={() => {
                                const arr = j.mesesRecorrencia.includes(mi)
                                  ? j.mesesRecorrencia.filter(x => x !== mi)
                                  : [...j.mesesRecorrencia, mi]
                                setJust(key, { mesesRecorrencia: arr })
                              }}
                              style={btnBase(j.mesesRecorrencia.includes(mi), COR.azul, '#eff6ff')}
                            >{m}</button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: COR.textoSuave, marginBottom: 8 }}>Tags (opcional)</div>
                      {j.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                          {j.tags.map(tag => (
                            <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
                              background: '#eff6ff', color: COR.azul, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
                              {tag}
                              <button onClick={() => setJust(key, { tags: j.tags.filter(t => t !== tag) })}
                                style={{ border: 'none', background: 'none', cursor: 'pointer', color: COR.azul, padding: 0, fontSize: 13, lineHeight: 1 }}>×</button>
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
                          style={{ flex: 1, border: `1.5px solid ${COR.borda}`, borderRadius: 8,
                            padding: '6px 10px', fontSize: 12, fontFamily: 'inherit', color: COR.texto, outline: 'none' }}
                        />
                        <button onClick={() => {
                          const tag = j.tagInput.trim()
                          if (tag && !j.tags.includes(tag)) setJust(key, { tags: [...j.tags, tag], tagInput: '' })
                          else setJust(key, { tagInput: '' })
                        }} style={{ border: `1.5px solid ${COR.borda}`, borderRadius: 8,
                          padding: '6px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                          background: 'transparent', color: COR.textoSuave }}>+</button>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: COR.textoSuave, marginBottom: 8 }}>
                        O que fazer no planejamento?
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        <button onClick={() => setJust(key, { acao: j.acao === 'aceito' ? '' : 'aceito' })}
                          style={{ ...btnBase(j.acao === 'aceito', COR.verde, '#dcfce7'), flex: '1 1 auto', textAlign: 'center', padding: '10px 8px' }}>
                          <div>Aceitar</div>
                          <div style={{ fontSize: 11, marginTop: 2, fontWeight: 600 }}>{fmt(real)}</div>
                        </button>
                        <button onClick={() => setJust(key, { acao: j.acao === 'mantido' ? '' : 'mantido' })}
                          style={{ ...btnBase(j.acao === 'mantido', COR.azul, '#dbeafe'), flex: '1 1 auto', textAlign: 'center', padding: '10px 8px' }}>
                          <div>Manter</div>
                          <div style={{ fontSize: 11, marginTop: 2, fontWeight: 600 }}>{fmt(planejado)}</div>
                        </button>
                        <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <button onClick={() => setJust(key, { acao: j.acao === 'ajustado' ? '' : 'ajustado' })}
                            style={{ ...btnBase(j.acao === 'ajustado', COR.amarelo, '#fef3c7'),
                              color: j.acao === 'ajustado' ? '#92400e' : COR.textoSuave,
                              width: '100%', padding: '10px 8px', textAlign: 'center' }}>
                            Ajustar para…
                          </button>
                          {j.acao === 'ajustado' && (
                            <input type="number" min="0" step="0.01" value={j.valorAjustado}
                              onChange={e => setJust(key, { valorAjustado: e.target.value })}
                              placeholder="0.00"
                              style={{ border: `1.5px solid ${COR.amarelo}`, borderRadius: 8, padding: '6px 10px',
                                fontSize: 13, fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {etapa2Erro && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10,
                padding: '10px 14px', fontSize: 12, color: COR.vermelho, fontWeight: 600 }}>
                ⚠️ {etapa2Erro}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <button onClick={() => { setEtapa(1); setEtapa2Erro('') }}
                style={{ border: `1.5px solid ${COR.borda}`, borderRadius: 10, padding: '10px 20px',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'transparent', color: COR.textoSuave }}>
                ← Voltar
              </button>
              <button onClick={() => { const err = validarEtapa2(); if (err) { setEtapa2Erro(err); return }; setEtapa2Erro(''); setEtapa(3) }}
                style={{ border: 'none', borderRadius: 10, padding: '10px 22px', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', background: COR.azul, color: '#fff', boxShadow: '0 2px 8px rgba(26,86,219,.25)' }}>
                Próximo: Confirmar →
              </button>
            </div>
          </div>
        )}

        {/* ── ETAPA 3: Confirmar e Aplicar ────────────────────── */}
        {etapa === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,.07)' }}>
              <div style={{ background: 'linear-gradient(135deg,#0f2878,#1a56db)', padding: '12px 16px', color: '#fff' }}>
                <div style={{ fontSize: 15, fontWeight: 800 }}>Resumo da revisão</div>
                <div style={{ fontSize: 11, opacity: .7, marginTop: 2 }}>{MESES_FULL[mesSel]} {anoAtual}</div>
              </div>

              {catsDesvio.length === 0 ? (
                <div style={{ padding: 16, fontSize: 13, color: COR.textoSuave, background: COR.branco }}>
                  ✅ Nenhum desvio significativo — nada a registrar neste mês.
                </div>
              ) : catsDesvio.map(({ tipo, cat, ri, planejado, real }) => {
                const key   = `${tipo}-${ri}`
                const j     = getJust(key)
                const { icone } = iconeCategoria(categorias, cat.nome)
                const acaoLabel =
                  j.acao === 'aceito'   ? `✅ Aceitar ${fmt(real)}`
                  : j.acao === 'mantido' ? `🔵 Manter ${fmt(planejado)}`
                  : j.acao === 'ajustado' ? `🟡 Ajustar para R$ ${j.valorAjustado || '?'}`
                  : '— Sem decisão'
                const tipoLabel2 =
                  j.tipoEvento === 'pontual' ? ' · 🎯 Pontual'
                  : j.tipoEvento === 'anual' ? ' · 📅 Anual'
                  : j.tipoEvento === 'sazonal' ? ' · 🔄 Sazonal' : ''
                const s = calcRowStyle(tipo, planejado, real)

                return (
                  <div key={key} style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
                    borderBottom: '1px solid #f1f5f9', background: COR.branco }}>
                    <div style={{ width: 3, height: 32, borderRadius: 2, background: s.barraCor, flexShrink: 0 }} />
                    <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: s.iconeFundo,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{icone}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>
                        {cat.nome}<span style={{ fontSize: 10, fontWeight: 400, color: '#94a3b8' }}>{tipoLabel2}</span>
                      </div>
                      <div style={{ fontSize: 11, color: COR.textoSuave, marginTop: 1 }}>{acaoLabel}</div>
                      {j.justificativa.trim() && (
                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, fontStyle: 'italic' }}>
                          "{j.justificativa.slice(0, 80)}{j.justificativa.length > 80 ? '…' : ''}"
                        </div>
                      )}
                      {j.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                          {j.tags.map(tag => (
                            <span key={tag} style={{ background: '#eff6ff', color: COR.azul,
                              borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', width: 90, padding: '0 4px', flexShrink: 0 }}>
                      <div style={{ fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .3 }}>Planejado</div>
                      <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2, color: '#94a3b8' }}>{fmt(planejado)}</div>
                    </div>
                    <div style={{ textAlign: 'right', width: 90, padding: '0 4px', flexShrink: 0 }}>
                      <div style={{ fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .3 }}>Realizado</div>
                      <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2, color: s.realCor }}>{fmt(real)}</div>
                    </div>
                    <div style={{ textAlign: 'right', width: 90, padding: '0 4px', flexShrink: 0 }}>
                      <div style={{ fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .3 }}>{s.difLabel}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2, color: s.difCor }}>{fmt(s.difVal)}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, width: 90, justifyContent: 'flex-end', flexShrink: 0 }}>
                      <div style={{ width: 50, height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 2, width: `${s.percClamp * 100}%`, background: s.barFill }} />
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 700, minWidth: 32, textAlign: 'right', color: s.percCor }}>{s.percLabel}</div>
                    </div>
                  </div>
                )
              })}
            </div>

            {mesInicio > 11 && (
              <div style={{ padding: '12px 16px', borderRadius: 10,
                background: '#fef9c3', fontSize: 12, color: '#92400e', border: '1px solid #fde68a' }}>
                Dezembro é o último mês — as lições serão salvas, mas não há meses futuros para aplicar ajustes.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <button onClick={() => setEtapa(catsDesvio.length > 0 ? 2 : 1)}
                style={{ border: `1.5px solid ${COR.borda}`, borderRadius: 10, padding: '10px 20px',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'transparent', color: COR.textoSuave }}>
                ← Voltar
              </button>
              <button onClick={salvarRevisao} disabled={salvando}
                style={{ border: 'none', borderRadius: 10, padding: '10px 22px', fontSize: 13, fontWeight: 700,
                  cursor: salvando ? 'wait' : 'pointer', transition: 'all .15s',
                  background: salvando ? COR.textoSuave : COR.verde, color: '#fff',
                  boxShadow: salvando ? 'none' : '0 2px 8px rgba(22,163,74,.3)' }}>
                {salvando ? 'Salvando…' : 'Salvar revisão e aplicar →'}
              </button>
            </div>
          </div>
        )}

      </>)}
    </div>
  )
}
