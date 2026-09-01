import { useState, useRef, useEffect } from 'react'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { fmt, MESES, nomeExibicao, type AnoData, type Cat } from './types'
import PlanCelulaEditavel from './PlanCelulaEditavel'
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
  onSave: (tipo: 'e' | 's', ri: number, mi: number, valor: number) => void
  onBulkSave: (ops: BulkOp[]) => void
  dadosAnoAnterior: AnoData | null
  ancoraMes: number
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

const COL_MES = 100
const COL_VAL = 110

export default function PlanLista({
  anoAtual, mesAtual, dadosAtivos, previsto,
  categorias, onSave, onBulkSave, dadosAnoAnterior, ancoraMes,
}: Props) {
  const [aberto, setAberto] = useState<number>(-1)
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

  const catValor = (cat: Cat, mi: number): number => cat.v[mi]

  return (
    <div style={{ padding: '8px 16px', overflowX: 'auto' }}>
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
      />

      {/* Header fixo */}
      <div className="plista-header" style={{
        display: 'flex', padding: '8px 0',
        borderBottom: '2px solid #e2e8f0', marginBottom: 4,
        position: 'sticky', top: 0, zIndex: 5, background: '#f8faff',
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
                    <div className="plista-si" style={{ width: COL_VAL, textAlign: 'right', paddingRight: 8, fontSize: 13, fontWeight: 600, color: tl.saldo, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmt(si, true)}</div>
                    <div style={{ width: COL_VAL, textAlign: 'right', paddingRight: 8, fontSize: 13, fontWeight: 600, color: tl.rec, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmt(te, true)}</div>
                    <div style={{ width: COL_VAL, textAlign: 'right', paddingRight: 8, fontSize: 13, fontWeight: 600, color: tl.desp, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmt(ts, true)}</div>
                    <div style={{ width: COL_VAL, textAlign: 'right', paddingRight: 8, fontSize: 13, fontWeight: 600, color: res >= 0 ? tl.rec : tl.neg, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmtRes(res)}</div>
                    <div className="plista-sf" style={{ width: COL_VAL, textAlign: 'right', paddingRight: 8, fontSize: 13, fontWeight: 600, color: sf < 0 ? tl.neg : tl.saldo, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmt(sf, true)}</div>
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
                  {dadosAtivos.entradas.map((cat, ri) => {
                    const { icone } = iconeCategoria(categorias, cat.nome)
                    const v = catValor(cat, mi)
                    return (
                      <div key={cat.id ?? cat.nome}
                        style={{ display: 'flex', alignItems: 'center', padding: '6px 16px', borderBottom: '1px solid #f8fafc' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f8fafc' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}
                      >
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, marginRight: 8, flexShrink: 0 }}>{icone}</div>
                        <span style={{ flex: 1, fontSize: 12, color: '#475569' }}>{nomeExibicao(cat)}</span>
                        <PlanCelulaEditavel valor={v} onSave={nv => onSave('e', ri, mi, nv)} />
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
                    const v = catValor(cat, mi)
                    return (
                      <div key={cat.id ?? cat.nome}
                        style={{ display: 'flex', alignItems: 'center', padding: '6px 16px', borderBottom: '1px solid #f8fafc' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f8fafc' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}
                      >
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, marginRight: 8, flexShrink: 0 }}>{icone}</div>
                        <span style={{ flex: 1, fontSize: 12, color: '#475569' }}>{nomeExibicao(cat)}</span>
                        <PlanCelulaEditavel valor={v} onSave={nv => onSave('s', ri, mi, nv)} />
                      </div>
                    )
                  })}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                    <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: '#dc2626' }}>Total despesas</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#dc2626', minWidth: 90, textAlign: 'right', padding: '0 8px', fontVariantNumeric: 'tabular-nums' }}>{fmt(ts, true)}</span>
                  </div>

                  {/* Resultado */}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', background: '#f1f5f9', borderTop: '2px solid #e2e8f0' }}>
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 800, color: '#0f172a' }}>= Resultado</span>
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
