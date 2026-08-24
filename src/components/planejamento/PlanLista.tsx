import { useState, useRef, useEffect } from 'react'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { fmt, MESES, nomeExibicao, type AnoData } from './types'
import PlanCelulaEditavel from './PlanCelulaEditavel'

interface Props {
  aba: 'meu-plano' | 'realizado'
  anoAtual: number
  mesAtual: number
  dadosAtivos: AnoData
  previsto: { totalEntradas: number[]; totalSaidas: number[]; saldoInicial: number[]; saldoFinal: number[] }
  planejamentoLockado: boolean
  categorias: any[]
  onSave: (tipo: 'e' | 's', ri: number, mi: number, valor: number) => void
  lancadoPorCatMes?: Record<number, { entrada: Record<string, number>; saida: Record<string, number> }>
  totaisReais?: { te: number[]; ts: number[] }
}

type Tema = 'past' | 'current' | 'future'

const TL = {
  past: {
    bg: 'linear-gradient(135deg, #60a5fa, #3b82f6)',
    text: '#fff', rec: '#4ade80', desp: '#fbbf24', neg: '#fbbf24', saldo: '#fff',
    shadow: 'none',
  },
  current: {
    bg: 'linear-gradient(135deg, #1e3a8a, #0f2878)',
    text: '#fff', rec: '#4ade80', desp: '#fbbf24', neg: '#fbbf24', saldo: '#fff',
    shadow: '0 4px 16px rgba(15,40,120,0.4)',
  },
  future: {
    bg: 'linear-gradient(135deg, #bfdbfe, #93c5fd)',
    text: '#1e3a8a', rec: '#16a34a', desp: '#dc2626', neg: '#dc2626', saldo: '#1e3a8a',
    shadow: 'none',
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

const COL_MES = 100
const COL_VAL = 110

export default function PlanLista({
  aba, anoAtual, mesAtual, dadosAtivos, previsto,
  planejamentoLockado, categorias, onSave, lancadoPorCatMes,
}: Props) {
  const [aberto, setAberto] = useState<number>(mesAtual)
  const bloqueado = planejamentoLockado && aba === 'meu-plano'
  const anoCorrente = new Date().getFullYear()
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

  function catValor(tipo: 'e' | 's', cat: any, mi: number): number {
    if (aba === 'realizado') {
      const mapa = lancadoPorCatMes?.[mi]
      return mapa ? (tipo === 'e' ? (mapa.entrada[cat.nome] ?? 0) : (mapa.saida[cat.nome] ?? 0)) : 0
    }
    return cat.v[mi]
  }

  return (
    <div style={{ padding: '8px 16px', overflowX: 'auto' }}>
      {/* Header fixo */}
      <div className="plista-header" style={{
        display: 'flex', padding: '8px 0',
        borderBottom: '2px solid #e2e8f0', marginBottom: 4,
        position: 'sticky', top: 0, zIndex: 5, background: '#f0f4ff',
        minWidth: COL_MES + COL_VAL * 5,
      }}>
        <div style={{ width: COL_MES, fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.3px', paddingLeft: 12 }}>Mês</div>
        {['Saldo inicial', 'Receitas', 'Despesas', 'Resultado', 'Saldo final'].map((h, i) => (
          <div key={h} className={i === 0 ? 'plista-si' : i === 4 ? 'plista-sf' : ''} style={{ width: COL_VAL, fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.3px', textAlign: 'right', paddingRight: 8 }}>{h}</div>
        ))}
      </div>

      {/* 12 meses */}
      <div style={{ minWidth: COL_MES + COL_VAL * 5 }}>
        {Array.from({ length: 12 }, (_, mi) => {
          const tema = temaMes(mi, mesAtual, anoAtual)
          const tl = TL[tema]
          const isAtual = mi === mesAtual && anoAtual === anoCorrente
          const isAberto = aberto === mi
          const si = previsto.saldoInicial[mi]
          const te = previsto.totalEntradas[mi]
          const ts = previsto.totalSaidas[mi]
          const sf = previsto.saldoFinal[mi]
          const res = te - ts
          const fmtRes = (v: number) => v === 0 ? '—' : `${v > 0 ? '+' : ''}${fmt(v, true)}`

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
                  boxShadow: tl.shadow,
                  transition: 'transform .15s',
                  userSelect: 'none',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateX(2px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = '' }}
              >
                <div style={{ width: COL_MES, display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 12, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, transition: 'transform .2s', transform: isAberto ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>▸</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{MESES[mi]}</span>
                  {isAtual && (
                    <span style={{ fontSize: 7, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: 'rgba(255,255,255,0.25)', color: '#fff', flexShrink: 0 }}>ATUAL</span>
                  )}
                </div>
                <div className="plista-si" style={{ width: COL_VAL, textAlign: 'right', paddingRight: 8, fontSize: 13, fontWeight: 600, color: tl.saldo, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmt(si, true)}</div>
                <div style={{ width: COL_VAL, textAlign: 'right', paddingRight: 8, fontSize: 13, fontWeight: 600, color: tl.rec, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmt(te, true)}</div>
                <div style={{ width: COL_VAL, textAlign: 'right', paddingRight: 8, fontSize: 13, fontWeight: 600, color: tl.desp, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmt(ts, true)}</div>
                <div style={{ width: COL_VAL, textAlign: 'right', paddingRight: 8, fontSize: 13, fontWeight: 600, color: res >= 0 ? tl.rec : tl.neg, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmtRes(res)}</div>
                <div className="plista-sf" style={{ width: COL_VAL, textAlign: 'right', paddingRight: 8, fontSize: 13, fontWeight: 600, color: sf < 0 ? tl.neg : tl.saldo, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmt(sf, true)}</div>
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
                  {dadosAtivos.entradas.map((cat, ri) => {
                    const { icone } = iconeCategoria(categorias, cat.nome)
                    const v = catValor('e', cat, mi)
                    return (
                      <div key={cat.id ?? cat.nome}
                        style={{ display: 'flex', alignItems: 'center', padding: '6px 16px', borderBottom: '1px solid #f8fafc' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f8fafc' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}
                      >
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, marginRight: 8, flexShrink: 0 }}>{icone}</div>
                        <span style={{ flex: 1, fontSize: 12, color: '#475569' }}>{nomeExibicao(cat)}</span>
                        <PlanCelulaEditavel valor={v} readOnly={bloqueado || aba === 'realizado'} onSave={nv => onSave('e', ri, mi, nv)} />
                      </div>
                    )
                  })}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                    <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: '#16a34a' }}>Total receitas</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#16a34a', minWidth: 90, textAlign: 'right', padding: '0 8px', fontVariantNumeric: 'tabular-nums' }}>{fmt(te, true)}</span>
                  </div>

                  {/* Despesas */}
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: '#dc2626', padding: '10px 16px 4px' }}>↓ DESPESAS</div>
                  {dadosAtivos.saidas.map((cat, ri) => {
                    const { icone } = iconeCategoria(categorias, cat.nome)
                    const v = catValor('s', cat, mi)
                    return (
                      <div key={cat.id ?? cat.nome}
                        style={{ display: 'flex', alignItems: 'center', padding: '6px 16px', borderBottom: '1px solid #f8fafc' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f8fafc' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}
                      >
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, marginRight: 8, flexShrink: 0 }}>{icone}</div>
                        <span style={{ flex: 1, fontSize: 12, color: '#475569' }}>{nomeExibicao(cat)}</span>
                        <PlanCelulaEditavel valor={v} readOnly={bloqueado || aba === 'realizado'} onSave={nv => onSave('s', ri, mi, nv)} />
                      </div>
                    )
                  })}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                    <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: '#dc2626' }}>Total despesas</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#dc2626', minWidth: 90, textAlign: 'right', padding: '0 8px', fontVariantNumeric: 'tabular-nums' }}>{fmt(ts, true)}</span>
                  </div>

                  {/* Resultado */}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', background: '#f1f5f9', borderTop: '2px solid #e2e8f0' }}>
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 800, color: '#1e293b' }}>= Resultado</span>
                    <span style={{ fontSize: 15, fontWeight: 800, minWidth: 90, textAlign: 'right', padding: '0 8px', color: res >= 0 ? '#16a34a' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>{fmtRes(res)}</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <style>{`
        @media (max-width: 1023px) { .plista-si { display: none !important; } }
        @media (max-width: 639px)  { .plista-sf { display: none !important; } }
      `}</style>
    </div>
  )
}
