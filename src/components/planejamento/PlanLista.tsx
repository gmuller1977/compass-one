import { useState, useRef, useEffect, useMemo } from 'react'
import { iconeCategoria } from '../../utils/categoriaIcone'
import {
  fmt, MESES, nomeExibicao, PREVISTO, tituloValor,
  SEM_GRUPO, agrupar, somaDoGrupo,
  type AnoData, type Cat, type Saldos,
} from './types'
import { COR } from '../../utils/cores'
import PlanCelulaEditavel from './PlanCelulaEditavel'
import PlanBarraFerramentas from './PlanBarraFerramentas'
import { type BulkOp } from './PlanFerramentas'
import type { Categoria } from '../../context/AppContext'

interface Props {
  anoAtual: number
  mesAtual: number
  dadosAtivos: AnoData
  previsto: Saldos
  categorias: Categoria[]
  onSave: (tipo: 'e' | 's', ri: number, mi: number, valor: number) => void
  onBulkSave: (ops: BulkOp[]) => void
  objetivos: number[]
  sobraPrevista: number[]
  onMetaSave: (objetivos: number[]) => void
  dadosAnoAnterior: AnoData | null
  totaisReais?: { te: number[]; ts: number[] }
}

const TL = {
  com: {
    bg: 'linear-gradient(135deg, #1e3a8a, #0f2878)',
    text: '#fff', rec: '#86efac', desp: '#fde047', neg: '#fde047', saldo: '#fff',
  },
  sem: {
    bg: 'linear-gradient(135deg, #475569, #334155)',
    text: '#fff', rec: 'rgba(255,255,255,0.75)', desp: 'rgba(255,255,255,0.75)', neg: 'rgba(255,255,255,0.75)', saldo: 'rgba(255,255,255,0.75)',
  },
}

/** Os mesmos tons do Painel: a faixa do grupo se le igual nas duas telas. */
const GRUPO_FUNDO = '#c9daf8'
const GRUPO_TEXTO = '#000'

const COL_MES = 100
const COL_VAL = 110
const COL_META = 96

export default function PlanLista({
  anoAtual, mesAtual, dadosAtivos, previsto,
  categorias, onSave, onBulkSave, dadosAnoAnterior,
  objetivos, sobraPrevista, onMetaSave,
}: Props) {
  const temAlgumaMeta = objetivos.some(v => v > 0)
  const [aberto, setAberto] = useState<number>(-1)
  const [mostrarPassado, setMostrarPassado] = useState(false)
  const anoCorrente = new Date().getFullYear()

  // Mesma regra do Painel: mes passado sem NADA planejado nao ajuda a planejar.
  // Olha o plano, e nao os totais — mes fechado mostra realizado, e gasto que
  // aconteceu sem ter sido planejado nao e planejamento.
  const { mesesVisiveis, escondidos } = useMemo(() => {
    const temPlano = (mi: number) =>
      dadosAtivos.entradas.some(c => (c.v[mi] ?? 0) > 0) ||
      dadosAtivos.saidas.some(c => (c.v[mi] ?? 0) > 0)
    const passado = (mi: number) =>
      anoAtual < anoCorrente || (anoAtual === anoCorrente && mi < mesAtual)
    const todos = Array.from({ length: 12 }, (_, i) => i)
    const ocultos = todos.filter(mi => passado(mi) && !temPlano(mi))
    return {
      mesesVisiveis: mostrarPassado ? todos : todos.filter(mi => !ocultos.includes(mi)),
      escondidos: ocultos.length,
    }
  }, [dadosAtivos, anoAtual, anoCorrente, mesAtual, mostrarPassado])

  const linhasE = useMemo(() => agrupar(dadosAtivos.entradas, 'e'), [dadosAtivos.entradas])
  const linhasS = useMemo(() => agrupar(dadosAtivos.saidas, 's'), [dadosAtivos.saidas])
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (aberto >= 0) {
      setTimeout(() => {
        rowRefs.current[aberto]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 50)
    }
  }, [aberto])

  function toggleMes(mi: number) {
    setAberto(prev => prev === mi ? -1 : mi)
  }

  const catValor = (cat: Cat, mi: number): number => cat.v[mi]

  return (
    <div style={{ padding: '8px 16px', overflowX: 'auto' }}>
      <PlanBarraFerramentas
        mesAtual={mesAtual}
        anoAtual={anoAtual}
        dadosAtivos={dadosAtivos}
        dadosAnoAnterior={dadosAnoAnterior}
        categorias={categorias}
        onBulkSave={onBulkSave}
        objetivos={objetivos}
        sobraPrevista={sobraPrevista}
        onMetaSave={onMetaSave}
      />

      {escondidos > 0 && (
        <label style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer',
          fontSize: 12, color: COR.textoSuave, marginBottom: 8,
        }}>
          <input type="checkbox" checked={mostrarPassado}
            onChange={e => setMostrarPassado(e.target.checked)} />
          Mostrar {escondidos === 1 ? 'o mês passado' : 'os ' + escondidos + ' meses passados'} sem planejamento
        </label>
      )}

      {/* Header fixo */}
      <div className="plista-header" style={{
        display: 'flex', padding: '8px 0',
        borderBottom: '2px solid #e2e8f0', marginBottom: 4,
        position: 'sticky', top: 0, zIndex: 5, background: '#f8faff',
        minWidth: COL_MES + COL_VAL * 5 + (temAlgumaMeta ? COL_META : 0),
      }}>
        <div style={{ width: COL_MES, fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.3px', paddingLeft: 12 }}>Mês</div>
        {/* A meta entra entre Resultado e Saldo final: ali ela e lida junto do
            numero que cobra, sem precisar abrir o mes. */}
        {(temAlgumaMeta
          ? ['Saldo inicial', 'Receitas', 'Despesas', 'Resultado', 'Meta', 'Saldo final']
          : ['Saldo inicial', 'Receitas', 'Despesas', 'Resultado', 'Saldo final']
        ).map((h, i, arr) => (
          <div key={h}
            className={i === 0 ? 'plista-si' : i === arr.length - 1 ? 'plista-sf' : h === 'Meta' ? 'plista-meta' : ''}
            style={{ width: h === 'Meta' ? COL_META : COL_VAL, fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.3px', textAlign: 'right', paddingRight: 8 }}>{h}</div>
        ))}
      </div>

      {/* 12 meses */}
      <div style={{ minWidth: COL_MES + COL_VAL * 5 + (temAlgumaMeta ? COL_META : 0) }}>
        {mesesVisiveis.map(mi => {
          const te = previsto.totalEntradas[mi]
          const ts = previsto.totalSaidas[mi]
          const si = previsto.saldoInicial[mi]
          const sf = previsto.saldoFinal[mi]
          const res = te - ts
          const comPlano = te > 0 || ts > 0
          const tl = TL[comPlano ? 'com' : 'sem']
          const isAtual = mi === mesAtual && anoAtual === anoCorrente
          const isAberto = aberto === mi
          const fmtRes = (v: number) => v === 0 ? '—' : `${v > 0 ? '+' : ''}${fmt(v, true)}`
          const mesReal = mi <= previsto.realizadoAte

          return (
            <div key={mi} ref={el => { rowRefs.current[mi] = el }}>
              {/* Linha do mês */}
              <div
                onClick={() => toggleMes(mi)}
                style={{
                  display: 'flex', alignItems: 'center',
                  padding: '10px 0',
                  borderRadius: isAberto ? '10px 10px 0 0' : 10,
                  marginBottom: isAberto ? 0 : 2,
                  cursor: 'pointer',
                  background: tl.bg,
                  color: tl.text,
                  border: isAtual ? '2px solid rgba(255,255,255,0.4)' : undefined,
                  boxShadow: isAtual ? '0 4px 16px rgba(26,86,219,0.5)' : 'none',
                  transition: 'transform .15s',
                  userSelect: 'none',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateX(2px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = '' }}
              >
                <div style={{ width: COL_MES, display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 12, flexShrink: 0, color: '#fff' }}>
                  <span style={{ fontSize: 10, transition: 'transform .2s', transform: isAberto ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>▸</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{MESES[mi]}</span>
                  {isAtual && (
                    <span style={{ fontSize: 7, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: 'rgba(255,255,255,0.25)', color: '#fff', flexShrink: 0 }}>ATUAL</span>
                  )}
                </div>
                {comPlano ? (
                  <>
                    <div className="plista-si" title={tituloValor(previsto.inicialReal[mi])} style={{ width: COL_VAL, textAlign: 'right', paddingRight: 8, fontSize: 13, fontWeight: 600, color: tl.saldo, fontVariantNumeric: 'tabular-nums', flexShrink: 0, ...(previsto.inicialReal[mi] ? {} : PREVISTO) }}>{fmt(si, true)}</div>
                    <div style={{ width: COL_VAL, textAlign: 'right', paddingRight: 8, fontSize: 13, fontWeight: 600, color: tl.rec, fontVariantNumeric: 'tabular-nums', flexShrink: 0, ...(mesReal ? {} : PREVISTO) }}>{fmt(te, true)}</div>
                    <div style={{ width: COL_VAL, textAlign: 'right', paddingRight: 8, fontSize: 13, fontWeight: 600, color: tl.desp, fontVariantNumeric: 'tabular-nums', flexShrink: 0, ...(mesReal ? {} : PREVISTO) }}>{fmt(ts, true)}</div>
                    <div style={{ width: COL_VAL, textAlign: 'right', paddingRight: 8, fontSize: 13, fontWeight: 600, color: res >= 0 ? tl.rec : tl.neg, fontVariantNumeric: 'tabular-nums', flexShrink: 0, ...(mesReal ? {} : PREVISTO) }}>{fmtRes(res)}</div>
                    {temAlgumaMeta && (() => {
                      const meta = objetivos[mi] ?? 0
                      const perc = meta > 0 ? Math.max(0, Math.min(100, (res / meta) * 100)) : 0
                      // Barra e elemento grafico: limite de 3:1. Sobre o azul
                      // valem estes tons, os mesmos do card da Grade.
                      const fill = perc >= 100 ? '#4ade80' : perc >= 70 ? '#fbbf24' : '#f87171'
                      return (
                        <div className="plista-meta" style={{ width: COL_META, paddingRight: 8, flexShrink: 0,
                          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3 }}>
                          {meta > 0 ? (
                            <>
                              <div style={{ height: 4, background: 'rgba(255,255,255,0.18)', borderRadius: 6, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${perc}%`, background: fill,
                                  borderRadius: 6, transition: 'width .3s' }} />
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between',
                                fontSize: 8, color: 'rgba(255,255,255,0.75)', fontVariantNumeric: 'tabular-nums' }}>
                                <span>{fmt(meta, true)}</span>
                                <span>{Math.round(perc)}%</span>
                              </div>
                            </>
                          ) : (
                            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', textAlign: 'right' }}>—</div>
                          )}
                        </div>
                      )
                    })()}
                    <div className="plista-sf" title={tituloValor(previsto.finalReal[mi])} style={{ width: COL_VAL, textAlign: 'right', paddingRight: 8, fontSize: 13, fontWeight: 600, color: sf < 0 ? tl.neg : tl.saldo, fontVariantNumeric: 'tabular-nums', flexShrink: 0, ...(previsto.finalReal[mi] ? {} : PREVISTO) }}>{fmt(sf, true)}</div>
                  </>
                ) : (
                  <div style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#fff' }}>
                    Sem Planejamento
                  </div>
                )}
              </div>

              {/* Painel expandido */}
              {isAberto && (
                <div style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0 0 10px 10px',
                  margin: '0 0 4px',
                  overflow: 'hidden',
                }}>
                  {/* Receitas */}
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: '#16a34a', padding: '10px 16px 4px' }}>↑ RECEITAS</div>
                  {linhasE.map((l, li) => {
                    if (l.k === 'grupo') return (
                      <div key={`g-${li}`} style={{
                        display: 'flex', alignItems: 'center', padding: '5px 16px',
                        background: GRUPO_FUNDO, color: GRUPO_TEXTO,
                      }}>
                        <span style={{ flex: 1, fontSize: 9, fontWeight: 800, letterSpacing: '.5px', textTransform: 'uppercase' }}>
                          {l.grupo === SEM_GRUPO ? 'Outros' : l.grupo}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, minWidth: 90, textAlign: 'right', padding: '0 8px', fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(somaDoGrupo(l, dadosAtivos.entradas, mi), true)}
                        </span>
                      </div>
                    )
                    const { icone } = iconeCategoria(categorias, l.cat.nome)
                    return (
                      <div key={`c-${l.ri}`}
                        style={{ display: 'flex', alignItems: 'center', padding: '6px 16px', borderBottom: '1px solid #f8fafc' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f8fafc' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}
                      >
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, marginRight: 8, flexShrink: 0 }}>{icone}</div>
                        <span style={{ flex: 1, fontSize: 12, color: '#475569', paddingLeft: 8 }}>{nomeExibicao(l.cat)}</span>
                        <PlanCelulaEditavel valor={catValor(l.cat, mi)} onSave={nv => onSave('e', l.ri, mi, nv)} />
                      </div>
                    )
                  })}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                    <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: '#16a34a' }}>Total receitas</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#16a34a', minWidth: 90, textAlign: 'right', padding: '0 8px', fontVariantNumeric: 'tabular-nums' }}>{fmt(te, true)}</span>
                  </div>

                  {/* Despesas */}
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: '#dc2626', padding: '10px 16px 4px' }}>↓ DESPESAS</div>
                  {linhasS.map((l, li) => {
                    if (l.k === 'grupo') return (
                      <div key={`g-${li}`} style={{
                        display: 'flex', alignItems: 'center', padding: '5px 16px',
                        background: GRUPO_FUNDO, color: GRUPO_TEXTO,
                      }}>
                        <span style={{ flex: 1, fontSize: 9, fontWeight: 800, letterSpacing: '.5px', textTransform: 'uppercase' }}>
                          {l.grupo === SEM_GRUPO ? 'Outros' : l.grupo}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, minWidth: 90, textAlign: 'right', padding: '0 8px', fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(somaDoGrupo(l, dadosAtivos.saidas, mi), true)}
                        </span>
                      </div>
                    )
                    const { icone } = iconeCategoria(categorias, l.cat.nome)
                    return (
                      <div key={`c-${l.ri}`}
                        style={{ display: 'flex', alignItems: 'center', padding: '6px 16px', borderBottom: '1px solid #f8fafc' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f8fafc' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}
                      >
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, marginRight: 8, flexShrink: 0 }}>{icone}</div>
                        <span style={{ flex: 1, fontSize: 12, color: '#475569', paddingLeft: 8 }}>{nomeExibicao(l.cat)}</span>
                        <PlanCelulaEditavel valor={catValor(l.cat, mi)} onSave={nv => onSave('s', l.ri, mi, nv)} />
                      </div>
                    )
                  })}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                    <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: '#dc2626' }}>Total despesas</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#dc2626', minWidth: 90, textAlign: 'right', padding: '0 8px', fontVariantNumeric: 'tabular-nums' }}>{fmt(ts, true)}</span>
                  </div>

                  {/* Resultado, e a barra da meta logo abaixo — a mesma
                      leitura do card da Grade, no idioma do card da Lista. */}
                  <div style={{ padding: '10px 16px', background: '#f1f5f9', borderTop: '2px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 800, color: '#0f172a' }}>= Resultado</span>
                      <span style={{ fontSize: 15, fontWeight: 800, minWidth: 90, textAlign: 'right', padding: '0 8px', color: res >= 0 ? '#16a34a' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>{fmtRes(res)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <style>{`
        @media (max-width: 1023px) { .plista-si { display: none !important; } }
        @media (max-width: 767px)  { .plista-meta { display: none !important; } }
        @media (max-width: 639px)  { .plista-sf { display: none !important; } }
      `}</style>
    </div>
  )
}
