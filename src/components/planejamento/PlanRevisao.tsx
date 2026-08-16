import { useState, useEffect, useRef } from 'react'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { supabase } from '../../lib/supabase'
import { fmt, COR, MESES, MESES_FULL, type AnoData } from './types'
import PageHeader from '../PageHeader'

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
  cat: { nome: string; descricao?: string; v: number[] }
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
    if (ratio >= 0.7) return { icon: '⚠️', cor: '#d97706', label: `${Math.round(ratio * 100)}%` }
    return { icon: '🔴', cor: '#dc2626', label: `${Math.round(ratio * 100)}%` }
  } else {
    if (ratio <= 1.05) return { icon: '✅', cor: '#16a34a', label: 'OK' }
    if (ratio <= 1.3) return { icon: '⚠️', cor: '#d97706', label: `+${Math.round((ratio - 1) * 100)}%` }
    return { icon: '🔴', cor: '#dc2626', label: `+${Math.round((ratio - 1) * 100)}%` }
  }
}

export default function PlanRevisao({
  anoAtual, mesAtual, dadosPrevisto, lancadoPorCatMes, categorias, onAjustar,
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
  const [etapa, setEtapa] = useState<1 | 2 | 3>(1)
  const [justs, setJusts] = useState<Record<string, JustState>>({})
  const [salvando, setSalvando] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [toastOk, setToastOk] = useState(true)
  const [etapa2Erro, setEtapa2Erro] = useState('')
  const [mostrarCal, setMostrarCal] = useState(false)
  const calRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mostrarCal) return
    const handler = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node)) setMostrarCal(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [mostrarCal])

  const lancado = lancadoPorCatMes[mesSel] ?? { entrada: {}, saida: {} }

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

  function mudarMes(mi: number) {
    setMesSel(mi)
    setEtapa(1)
    setJusts({})
    setEtapa2Erro('')
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
        return `Justificativa obrigatória: ${nomeExib} (desvio ${Math.round(desvioPercent)}%)`
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
        const key = `${tipo}-${ri}`
        const j = getJust(key)
        const desvio = real - planejado
        const desvioPercentSigned = planejado > 0 ? Math.round((real - planejado) / planejado * 100) : 0

        rows.push({
          user_id: user.id,
          ano: anoAtual,
          mes: mesSel,
          categoria_nome: cat.nome,
          tipo: tipo === 'e' ? 'receita' : 'despesa',
          valor_previsto: planejado,
          valor_realizado: real,
          desvio,
          desvio_percentual: desvioPercentSigned,
          justificativa: j.justificativa.trim() || `Desvio de ${Math.round(desvioPercent)}%`,
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

  // ── Styles helpers ──────────────────────────────────────────────────────
  const btnBase = (active: boolean, cor: string, bg: string) => ({
    border: `1.5px solid ${active ? cor : COR.borda}`,
    borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
    fontSize: 12, fontWeight: 700,
    background: active ? bg : 'transparent',
    color: active ? cor : COR.textoSuave,
    transition: 'all .15s',
  } as React.CSSProperties)

  const idxSel   = mesesPassados.indexOf(mesSel)
  const prevMes  = idxSel > 0 ? () => mudarMes(mesesPassados[idxSel - 1]) : null
  const nextMes  = idxSel < mesesPassados.length - 1 ? () => mudarMes(mesesPassados[idxSel + 1]) : null

  const arrowBtn = {
    width: 28, height: 28, borderRadius: 8, border: 'none',
    background: 'rgba(255,255,255,0.15)', color: '#fff',
    cursor: 'pointer', fontSize: 16, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'inherit', opacity: 1,
  } as const

  const calNav = (
    <div style={{ position: 'relative' }} ref={calRef}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={() => prevMes?.()}
          style={{ ...arrowBtn, opacity: prevMes ? 1 : 0.3, cursor: prevMes ? 'pointer' : 'default' }}
        >‹</button>
        <button
          onClick={e => { e.stopPropagation(); setMostrarCal(v => !v) }}
          style={{
            fontSize: 20, fontWeight: 800, color: '#fff',
            border: 'none', background: 'rgba(255,255,255,0.12)',
            borderRadius: 8, padding: '4px 14px',
            cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}
        >
          {MESES_FULL[mesSel]} {anoAtual}
        </button>
        <button
          onClick={() => nextMes?.()}
          style={{ ...arrowBtn, opacity: nextMes ? 1 : 0.3, cursor: nextMes ? 'pointer' : 'default' }}
        >›</button>
      </div>

      {mostrarCal && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 300,
            background: '#fff', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,.22)',
            padding: 16, minWidth: 272,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14, color: COR.texto, textAlign: 'center', marginBottom: 12 }}>
            {anoAtual}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
            {MESES.map((abrev, i) => {
              const disponivel = mesesPassados.includes(i)
              const ativo      = i === mesSel
              return (
                <button
                  key={i}
                  disabled={!disponivel}
                  onClick={() => { mudarMes(i); setMostrarCal(false) }}
                  style={{
                    padding: '8px 4px', border: 'none', borderRadius: 8,
                    cursor: disponivel ? 'pointer' : 'default',
                    fontFamily: 'inherit', fontSize: 12,
                    fontWeight: ativo ? 700 : 500,
                    background: ativo ? COR.azul : disponivel ? '#f1f5f9' : 'transparent',
                    color: ativo ? '#fff' : disponivel ? COR.texto : '#cbd5e1',
                  }}
                >{abrev}</button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div>
      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toastOk ? COR.verde : COR.vermelho,
          color: '#fff', borderRadius: 10, padding: '10px 18px',
          fontSize: 13, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,.25)',
          maxWidth: 320,
        }}>
          {toastMsg}
        </div>
      )}

      {/* Header — largura total, igual ao Acompanhamento */}
      <div style={{ padding: '12px 16px 0', flexShrink: 0 }}>
        {mesesPassados.length === 0 ? (
          <PageHeader icon="ti-calendar-stats" breadcrumb="PLANEJAMENTO" title="Revisão Mensal"
            subtitle="Nenhum mês passado disponível para revisão" />
        ) : (
          <PageHeader icon="ti-calendar-stats" breadcrumb="PLANEJAMENTO" title="Revisão Mensal"
            rightContent={calNav} />
        )}
      </div>

      {mesesPassados.length > 0 && (
        <div style={{ padding: '16px 16px 80px' }}>
          {/* Indicador de etapas */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
            {(['1. Visão Geral', '2. Justificar', '3. Confirmar'] as const).map((label, idx) => {
              const e = (idx + 1) as 1 | 2 | 3
              return (
                <button
                  key={e}
                  onClick={() => { if (etapa > e) setEtapa(e) }}
                  style={{
                    flex: 1, border: 'none', borderRadius: 8, padding: '7px 4px',
                    fontSize: 11, fontWeight: 700,
                    cursor: etapa > e ? 'pointer' : 'default',
                    background: etapa === e ? COR.azul : 'transparent',
                    color: etapa === e ? '#fff' : etapa > e ? COR.textoSuave : '#bdc9db',
                    transition: 'all .15s',
                  }}
                >{label}</button>
              )
            })}
          </div>

          {/* ── ETAPA 1: Visão Geral ───────────────────────────────── */}
          {etapa === 1 && (
            <div>
              {/* Resumo financeiro */}
              <div style={{
                background: COR.branco, borderRadius: 14,
                boxShadow: '0 1px 6px rgba(0,0,0,.07)', overflow: 'hidden', marginBottom: 16,
              }}>
                <div style={{ padding: '14px 16px', borderBottom: `1px solid ${COR.borda}` }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: COR.texto }}>
                    {MESES_FULL[mesSel]} {anoAtual}
                  </div>
                  <div style={{ fontSize: 11, color: COR.textoSuave }}>Planejado vs realizado</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: COR.borda }}>
                  {[
                    { label: 'Receitas previstas', val: totalRecPrev, cor: COR.verde },
                    { label: 'Receitas realizadas', val: totalRecReal, cor: COR.verde },
                    { label: 'Despesas previstas', val: totalDesPrev, cor: COR.vermelho },
                    { label: 'Despesas realizadas', val: totalDesReal, cor: COR.vermelho },
                  ].map((row, i) => (
                    <div key={i} style={{ background: COR.branco, padding: '12px 16px' }}>
                      <div style={{ fontSize: 10, color: COR.textoSuave, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                        {row.label}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: row.cor, marginTop: 2 }}>
                        {fmt(row.val, true)}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#f8fafc' }}>
                  <div style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: COR.textoSuave }}>Resultado previsto</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: (totalRecPrev - totalDesPrev) >= 0 ? COR.verde : COR.vermelho }}>
                      {fmt(totalRecPrev - totalDesPrev, true)}
                    </span>
                  </div>
                  <div style={{ padding: '4px 16px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${COR.borda}` }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: COR.textoSuave }}>Resultado realizado</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: (totalRecReal - totalDesReal) >= 0 ? COR.verde : COR.vermelho }}>
                      {fmt(totalRecReal - totalDesReal, true)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Categorias com desvio */}
              {catsDesvio.length > 0 ? (
                <div style={{
                  background: COR.branco, borderRadius: 14,
                  boxShadow: '0 1px 6px rgba(0,0,0,.07)', overflow: 'hidden', marginBottom: 16,
                }}>
                  <div style={{
                    padding: '10px 16px', borderBottom: `1px solid ${COR.borda}`,
                    fontSize: 11, fontWeight: 800, color: COR.amarelo,
                    textTransform: 'uppercase', letterSpacing: '.5px',
                  }}>
                    ⚠️ Desvios significativos ({catsDesvio.length})
                  </div>
                  {catsDesvio.map(({ tipo, cat, ri, planejado, real }) => {
                    const b = badgeInfo(tipo, planejado, real)
                    const { icone } = iconeCategoria(categorias, cat.nome)
                    const diff = real - planejado
                    return (
                      <div key={`${tipo}-${ri}`} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 16px', borderBottom: `1px solid ${COR.borda}`,
                      }}>
                        <span style={{ fontSize: 16, flexShrink: 0 }}>{icone}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: COR.texto }}>
                            {cat.nome}{cat.descricao && <span style={{ fontWeight: 400, color: COR.textoSuave }}> · {cat.descricao}</span>}
                          </div>
                          <div style={{ display: 'flex', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, color: COR.textoSuave }}>
                              Plan: <b style={{ color: COR.texto }}>{fmt(planejado)}</b>
                            </span>
                            <span style={{ fontSize: 11, color: COR.textoSuave }}>
                              Real: <b style={{ color: tipo === 'e' ? COR.verde : COR.vermelho }}>{fmt(real)}</b>
                            </span>
                            {diff !== 0 && (
                              <span style={{ fontSize: 11, fontWeight: 700, color: diff > 0 ? (tipo === 'e' ? COR.verde : COR.vermelho) : (tipo === 'e' ? COR.vermelho : COR.verde) }}>
                                {diff > 0 ? '+' : ''}{fmt(diff)}
                              </span>
                            )}
                          </div>
                        </div>
                        {b && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: b.cor, flexShrink: 0 }}>
                            {b.icon} {b.label}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{
                  background: '#f0fdf4', borderRadius: 12, padding: '14px 16px', marginBottom: 16,
                  border: `1px solid #bbf7d0`,
                }}>
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
                  style={{
                    border: 'none', borderRadius: 10, padding: '10px 22px',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    background: COR.azul, color: '#fff',
                    boxShadow: '0 2px 8px rgba(26,86,219,.25)',
                  }}
                >
                  {catsDesvio.length > 0 ? 'Próximo: Justificar →' : 'Confirmar revisão →'}
                </button>
              </div>
            </div>
          )}

          {/* ── ETAPA 2: Justificar Desvios ───────────────────────── */}
          {etapa === 2 && (
            <div>
              {catsDesvio.map(({ tipo, cat, ri, planejado, real, desvioPercent }) => {
                const key = `${tipo}-${ri}`
                const j = getJust(key)
                const b = badgeInfo(tipo, planejado, real)
                const { icone } = iconeCategoria(categorias, cat.nome)
                const obrigatorio = desvioPercent > 20

                return (
                  <div key={key} style={{
                    background: COR.branco, borderRadius: 14,
                    boxShadow: '0 1px 6px rgba(0,0,0,.07)',
                    marginBottom: 16, overflow: 'hidden',
                  }}>
                    {/* Cabeçalho do card */}
                    <div style={{
                      padding: '12px 16px', borderBottom: `1px solid ${COR.borda}`,
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: '#f8fafc',
                    }}>
                      <span style={{ fontSize: 18 }}>{icone}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: COR.texto }}>
                          {cat.nome}{cat.descricao && <span style={{ fontWeight: 400, color: COR.textoSuave }}> · {cat.descricao}</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
                          <span style={{ fontSize: 11, color: COR.textoSuave }}>
                            Prev: <b>{fmt(planejado)}</b>
                          </span>
                          <span style={{ fontSize: 11, color: COR.textoSuave }}>
                            Real: <b style={{ color: tipo === 'e' ? COR.verde : COR.vermelho }}>{fmt(real)}</b>
                          </span>
                        </div>
                      </div>
                      {b && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: b.cor, flexShrink: 0 }}>
                          {b.icon} {b.label}
                        </span>
                      )}
                    </div>

                    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {/* Justificativa */}
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

                      {/* Tipo de evento */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: COR.textoSuave, marginBottom: 8 }}>
                          Isso acontece com frequência?
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {(['pontual', 'anual', 'sazonal'] as const).map(te => (
                            <button
                              key={te}
                              onClick={() => setJust(key, { tipoEvento: j.tipoEvento === te ? '' : te })}
                              style={btnBase(j.tipoEvento === te, COR.azul, '#eff6ff')}
                            >
                              {te === 'pontual' ? '🎯 Pontual' : te === 'anual' ? '📅 Todo ano' : '🔄 Sazonal'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Meses de recorrência */}
                      {(j.tipoEvento === 'anual' || j.tipoEvento === 'sazonal') && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: COR.textoSuave, marginBottom: 8 }}>
                            Em quais meses acontece?
                          </div>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {MESES.map((m, mi) => (
                              <button
                                key={mi}
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

                      {/* Tags */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: COR.textoSuave, marginBottom: 8 }}>
                          Tags (opcional)
                        </div>
                        {j.tags.length > 0 && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                            {j.tags.map(tag => (
                              <span key={tag} style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                background: '#eff6ff', color: COR.azul, borderRadius: 20,
                                padding: '3px 10px', fontSize: 11, fontWeight: 600,
                              }}>
                                {tag}
                                <button
                                  onClick={() => setJust(key, { tags: j.tags.filter(t => t !== tag) })}
                                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: COR.azul, padding: 0, fontSize: 13, lineHeight: 1 }}
                                >×</button>
                              </span>
                            ))}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            value={j.tagInput}
                            onChange={e => setJust(key, { tagInput: e.target.value })}
                            onKeyDown={e => {
                              if (e.key === 'Enter' || e.key === ',') {
                                e.preventDefault()
                                const tag = j.tagInput.trim()
                                if (tag && !j.tags.includes(tag)) {
                                  setJust(key, { tags: [...j.tags, tag], tagInput: '' })
                                } else {
                                  setJust(key, { tagInput: '' })
                                }
                              }
                            }}
                            placeholder="Digite e pressione Enter"
                            style={{
                              flex: 1, border: `1.5px solid ${COR.borda}`, borderRadius: 8,
                              padding: '6px 10px', fontSize: 12, fontFamily: 'inherit',
                              color: COR.texto, outline: 'none',
                            }}
                          />
                          <button
                            onClick={() => {
                              const tag = j.tagInput.trim()
                              if (tag && !j.tags.includes(tag)) {
                                setJust(key, { tags: [...j.tags, tag], tagInput: '' })
                              } else {
                                setJust(key, { tagInput: '' })
                              }
                            }}
                            style={{
                              border: `1.5px solid ${COR.borda}`, borderRadius: 8,
                              padding: '6px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                              background: 'transparent', color: COR.textoSuave,
                            }}
                          >+</button>
                        </div>
                      </div>

                      {/* Ação no planejamento */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: COR.textoSuave, marginBottom: 8 }}>
                          O que fazer no planejamento?
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                          <button
                            onClick={() => setJust(key, { acao: j.acao === 'aceito' ? '' : 'aceito' })}
                            style={{
                              ...btnBase(j.acao === 'aceito', COR.verde, '#dcfce7'),
                              flex: '1 1 auto', textAlign: 'center', padding: '10px 8px',
                            }}
                          >
                            <div>Aceitar</div>
                            <div style={{ fontSize: 11, marginTop: 2, fontWeight: 600 }}>{fmt(real)}</div>
                          </button>
                          <button
                            onClick={() => setJust(key, { acao: j.acao === 'mantido' ? '' : 'mantido' })}
                            style={{
                              ...btnBase(j.acao === 'mantido', COR.azul, '#dbeafe'),
                              flex: '1 1 auto', textAlign: 'center', padding: '10px 8px',
                            }}
                          >
                            <div>Manter</div>
                            <div style={{ fontSize: 11, marginTop: 2, fontWeight: 600 }}>{fmt(planejado)}</div>
                          </button>
                          <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <button
                              onClick={() => setJust(key, { acao: j.acao === 'ajustado' ? '' : 'ajustado' })}
                              style={{
                                ...btnBase(j.acao === 'ajustado', COR.amarelo, '#fef3c7'),
                                color: j.acao === 'ajustado' ? '#92400e' : COR.textoSuave,
                                width: '100%', padding: '10px 8px', textAlign: 'center',
                              }}
                            >Ajustar para…</button>
                            {j.acao === 'ajustado' && (
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={j.valorAjustado}
                                onChange={e => setJust(key, { valorAjustado: e.target.value })}
                                placeholder="0.00"
                                style={{
                                  border: `1.5px solid ${COR.amarelo}`, borderRadius: 8, padding: '6px 10px',
                                  fontSize: 13, fontFamily: 'inherit', outline: 'none',
                                  width: '100%', boxSizing: 'border-box',
                                }}
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
                <div style={{
                  background: '#fef2f2', border: `1px solid #fca5a5`, borderRadius: 10,
                  padding: '10px 14px', marginBottom: 12, fontSize: 12, color: COR.vermelho, fontWeight: 600,
                }}>
                  ⚠️ {etapa2Erro}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <button
                  onClick={() => { setEtapa(1); setEtapa2Erro('') }}
                  style={{
                    border: `1.5px solid ${COR.borda}`, borderRadius: 10, padding: '10px 20px',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'transparent', color: COR.textoSuave,
                  }}
                >← Voltar</button>
                <button
                  onClick={() => {
                    const err = validarEtapa2()
                    if (err) { setEtapa2Erro(err); return }
                    setEtapa2Erro('')
                    setEtapa(3)
                  }}
                  style={{
                    border: 'none', borderRadius: 10, padding: '10px 22px',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    background: COR.azul, color: '#fff',
                    boxShadow: '0 2px 8px rgba(26,86,219,.25)',
                  }}
                >Próximo: Confirmar →</button>
              </div>
            </div>
          )}

          {/* ── ETAPA 3: Confirmar e Aplicar ──────────────────────── */}
          {etapa === 3 && (
            <div>
              <div style={{
                background: COR.branco, borderRadius: 14,
                boxShadow: '0 1px 6px rgba(0,0,0,.07)', overflow: 'hidden', marginBottom: 16,
              }}>
                <div style={{ padding: '14px 16px', borderBottom: `1px solid ${COR.borda}` }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: COR.texto }}>Resumo da revisão</div>
                  <div style={{ fontSize: 11, color: COR.textoSuave }}>{MESES_FULL[mesSel]} {anoAtual}</div>
                </div>

                {catsDesvio.length === 0 ? (
                  <div style={{ padding: '16px', fontSize: 13, color: COR.textoSuave }}>
                    ✅ Nenhum desvio significativo — nada a registrar neste mês.
                  </div>
                ) : catsDesvio.map(({ tipo, cat, ri, planejado, real }) => {
                  const key = `${tipo}-${ri}`
                  const j = getJust(key)
                  const { icone } = iconeCategoria(categorias, cat.nome)
                  const acaoLabel =
                    j.acao === 'aceito' ? `✅ Aceitar ${fmt(real)}`
                    : j.acao === 'mantido' ? `🔵 Manter ${fmt(planejado)}`
                    : j.acao === 'ajustado' ? `🟡 Ajustar para R$ ${j.valorAjustado || '?'}`
                    : '— Sem decisão'
                  const tipoLabel =
                    j.tipoEvento === 'pontual' ? ' · 🎯 Pontual'
                    : j.tipoEvento === 'anual' ? ' · 📅 Anual'
                    : j.tipoEvento === 'sazonal' ? ' · 🔄 Sazonal'
                    : ''

                  return (
                    <div key={key} style={{
                      padding: '10px 16px', borderBottom: `1px solid ${COR.borda}`,
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                    }}>
                      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icone}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: COR.texto }}>
                          {cat.nome}{cat.descricao && <span style={{ fontWeight: 400, color: COR.textoSuave }}> · {cat.descricao}</span>}
                          <span style={{ fontSize: 11, fontWeight: 400, color: COR.textoMuted }}>{tipoLabel}</span>
                        </div>
                        <div style={{ fontSize: 12, color: COR.textoSuave, marginTop: 2 }}>{acaoLabel}</div>
                        {j.justificativa.trim() && (
                          <div style={{ fontSize: 11, color: COR.textoMuted, marginTop: 3, fontStyle: 'italic' }}>
                            "{j.justificativa.slice(0, 90)}{j.justificativa.length > 90 ? '…' : ''}"
                          </div>
                        )}
                        {j.tags.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                            {j.tags.map(tag => (
                              <span key={tag} style={{
                                background: '#eff6ff', color: COR.azul, borderRadius: 20,
                                padding: '2px 8px', fontSize: 10, fontWeight: 600,
                              }}>{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {mesInicio > 11 && (
                <div style={{
                  padding: '12px 16px', borderRadius: 10, marginBottom: 16,
                  background: '#fef9c3', fontSize: 12, color: '#92400e',
                  border: '1px solid #fde68a',
                }}>
                  Dezembro é o último mês — as lições serão salvas, mas não há meses futuros para aplicar ajustes.
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <button
                  onClick={() => setEtapa(catsDesvio.length > 0 ? 2 : 1)}
                  style={{
                    border: `1.5px solid ${COR.borda}`, borderRadius: 10, padding: '10px 20px',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'transparent', color: COR.textoSuave,
                  }}
                >← Voltar</button>
                <button
                  onClick={salvarRevisao}
                  disabled={salvando}
                  style={{
                    border: 'none', borderRadius: 10, padding: '10px 22px',
                    fontSize: 13, fontWeight: 700, cursor: salvando ? 'wait' : 'pointer',
                    background: salvando ? COR.textoSuave : COR.verde, color: '#fff',
                    boxShadow: salvando ? 'none' : '0 2px 8px rgba(22,163,74,.3)',
                    transition: 'all .15s',
                  }}
                >
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
