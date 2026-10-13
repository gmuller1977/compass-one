import { useEffect, useRef } from 'react'
import { fmt, MESES, MESES_FULL } from './types'
import { guardaDoMes, type MesDoAno } from './anoDoPlano'

/**
 * "Quanto cada mês guarda" — o gráfico do ano do Planejamento, no computador
 * (PlanAnoVisao) e no celular (PlanMobile). Pedido do Guilherme em
 * 13/10/2026: "o resultado do mês, uma linha ou divisor marcando a meta
 * daquele mês e uma linha de saldo acumulado. Isso vale para web e mobile".
 *
 * - Coluna: quanto o mês guarda — o real nos meses fechados (`guardou`), o
 *   plano nos outros (`sobra`). Abaixo do zero, o mês gasta mais do que ganha.
 * - Traço tracejado verde: a meta de economia daquele mês (`objetivos[mês]`).
 * - Linha âmbar: o saldo acumulado (o fechamento real nos fechados, o saldo
 *   final previsto nos outros), na escala DELA — o saldo é dezenas de vezes a
 *   sobra de um mês, e na mesma escala as colunas virariam traços. Por isso a
 *   linha não tem eixo: o valor está no último ponto e no título de cada mês.
 *
 * Cores no branco, elemento gráfico ≥ 3:1: fechado #64748b (4,76), previsto
 * #3b82f6 (3,68), atual #1e3a8a (10,4), negativo #b91c1c (6,47), meta
 * #15803d (5,02), saldo #b45309 (5,02).
 */
const COR_FECHADO = '#64748b'
const COR_PREVISTO = '#3b82f6'
const COR_ATUAL = '#1e3a8a'
const COR_NEG = '#b91c1c'
const COR_META = '#15803d'
const COR_SALDO = '#b45309'
const SUAVE = '#475569'

const curto = (v: number) => `${v < 0 ? '−' : ''}R$ ${Math.round(Math.abs(v)).toLocaleString('pt-BR')}`

interface Props {
  meses: MesDoAno[]
  altura: number
  /** Celular: largura fixa de cada coluna, e o gráfico rola para o lado. */
  coluna?: number
  /** Mês destacado no eixo (celular: o do cartão). */
  escolhido?: number
  onEscolher: (mi: number) => void
}

export default function GraficoGuardaAno({ meses, altura, coluna, escolhido, onEscolher }: Props) {
  const rolagem = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = rolagem.current
    if (el && coluna && escolhido !== undefined)
      el.scrollTo({ left: Math.max(0, (escolhido - 2) * coluna), behavior: 'smooth' })
  }, [escolhido, coluna])

  const TOPO = 20 // espaço para o valor em cima da coluna mais alta
  const BASE = 18 // e embaixo da mais funda
  const H = altura
  const guarda = meses.map(guardaDoMes)
  const temMeta = meses.some(m => m.meta > 0)
  const max = Math.max(0, ...guarda, ...meses.map(m => m.meta))
  const min = Math.min(0, ...guarda)
  const faixa = max - min || 1
  const y = (v: number) => ((max - v) / faixa) * H
  const zeroY = y(0)

  // A linha do saldo, na escala dela, abaixo dos valores das colunas.
  const sMax = Math.max(...meses.map(m => m.valor))
  const sMin = Math.min(...meses.map(m => m.valor))
  const sFaixa = sMax - sMin
  const ySaldo = (v: number) => (sFaixa < 0.005 ? H / 2 : H * 0.22 + ((sMax - v) / sFaixa) * H * 0.7)
  const pontos = meses.map((m, i) => `${i + 0.5},${ySaldo(m.valor).toFixed(2)}`).join(' ')
  const ultimo = meses[11]

  const largura = coluna ? 12 * coluna : undefined
  const colunas = coluna ? `repeat(12, ${coluna}px)` : 'repeat(12, minmax(0,1fr))'

  return (
    <div>
      <div ref={rolagem} style={{ overflowX: coluna ? 'auto' : 'visible', scrollbarWidth: 'none',
        padding: coluna ? '0 8px' : 0 }}>
        <div style={{ position: 'relative', width: largura, paddingTop: TOPO, paddingBottom: BASE }}>
          {/* Linha do zero */}
          <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, top: TOPO + zeroY, height: 1,
            background: min < 0 ? COR_NEG : '#94a3b8' }} />

          <div style={{ display: 'grid', gridTemplateColumns: colunas, position: 'relative', height: H }}>
            {meses.map((m, i) => {
              const v = guarda[i]
              const h = Math.max(2, Math.abs(v) / faixa * H)
              const top = v >= 0 ? zeroY - h : zeroY
              const cor = v < 0 ? COR_NEG : m.atual ? COR_ATUAL : m.fechado ? COR_FECHADO : COR_PREVISTO
              const vazio = m.semPlano && !m.fechado
              const verbo = m.fechado ? (v >= 0 ? 'guardou' : 'gastou a mais') : (v >= 0 ? 'deve guardar' : 'deve gastar a mais')
              const titulo = `${MESES_FULL[m.mi]}: ${verbo} ${fmt(Math.abs(v), true)}`
                + (m.meta > 0 ? ` · meta ${fmt(m.meta, true)}` : '')
                + ` · saldo ${m.fechado ? 'real' : 'previsto'} ${fmt(m.valor, true)}`
              return (
                <button key={m.mi} type="button" onClick={() => onEscolher(m.mi)} aria-label={titulo} title={titulo}
                  style={{ position: 'relative', height: H, border: 'none', background: 'transparent', padding: 0,
                    cursor: 'pointer', fontFamily: 'inherit' }}>
                  <span style={{ position: 'absolute', left: 0, right: 0, top: v >= 0 ? top - 17 : top + h + 2,
                    fontSize: coluna ? 12 : 11, fontWeight: m.atual ? 800 : 600, color: v < 0 ? COR_NEG : '#0f172a',
                    fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', textAlign: 'center', letterSpacing: '-.3px' }}>
                    {curto(v)}
                  </span>
                  <span style={{ position: 'absolute', left: '18%', right: '18%', top, height: h, boxSizing: 'border-box',
                    borderRadius: v >= 0 ? '6px 6px 0 0' : '0 0 6px 6px',
                    background: vazio ? 'transparent' : cor, border: vazio ? `1.5px dashed ${COR_FECHADO}` : 'none' }} />
                  {m.meta > 0 && (
                    <span aria-hidden style={{ position: 'absolute', left: '6%', right: '6%', top: y(m.meta) - 1,
                      borderTop: `2.5px dashed ${COR_META}` }} />
                  )}
                </button>
              )
            })}
          </div>

          {/* A linha do saldo acumulado, por cima das colunas, sem pegar o clique. */}
          <svg aria-hidden viewBox={`0 0 12 ${H}`} preserveAspectRatio="none"
            style={{ position: 'absolute', left: 0, top: TOPO, width: '100%', height: H, overflow: 'visible', pointerEvents: 'none' }}>
            <polyline points={pontos} fill="none" stroke="#fff" strokeWidth={6} strokeLinejoin="round"
              vectorEffect="non-scaling-stroke" />
            <polyline points={pontos} fill="none" stroke={COR_SALDO} strokeWidth={2.5} strokeLinejoin="round"
              vectorEffect="non-scaling-stroke" />
          </svg>
          {meses.map((m, i) => (
            <span key={m.mi} aria-hidden style={{ position: 'absolute', pointerEvents: 'none',
              left: `calc(${((i + 0.5) / 12) * 100}% - 4px)`, top: TOPO + ySaldo(m.valor) - 4, width: 8, height: 8,
              borderRadius: '50%', background: m.valor < 0 ? COR_NEG : COR_SALDO, boxShadow: '0 0 0 2px #fff' }} />
          ))}
          <span style={{ position: 'absolute', right: `calc(${100 / 24}% + 9px)`, top: TOPO + ySaldo(ultimo.valor) - 9,
            fontSize: 11, fontWeight: 700, color: ultimo.valor < 0 ? COR_NEG : COR_SALDO, background: 'rgba(255,255,255,.9)',
            padding: '1px 4px', borderRadius: 4, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
            {curto(ultimo.valor)}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: colunas, width: largura }}>
          {meses.map(m => (
            <span key={m.mi} style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 12, color: m.atual ? COR_ATUAL : SUAVE, fontWeight: m.atual ? 800 : 500,
                padding: '2px 8px', borderRadius: 999, background: m.mi === escolhido ? '#dbeafe' : undefined }}>
                {MESES[m.mi]}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px 16px', flexWrap: 'wrap', marginTop: 12, padding: coluna ? '0 16px' : 0,
        fontSize: 12, color: SUAVE }}>
        {[['guardou (real)', COR_FECHADO], ['este mês', COR_ATUAL], ['previsto', COR_PREVISTO]].map(([t, c]) => (
          <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: c }} />{t}
          </span>
        ))}
        {temMeta && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 16, borderTop: `2.5px dashed ${COR_META}` }} />meta do mês
          </span>
        )}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 16, height: 2.5, background: COR_SALDO, borderRadius: 2 }} />saldo acumulado
        </span>
      </div>
    </div>
  )
}
