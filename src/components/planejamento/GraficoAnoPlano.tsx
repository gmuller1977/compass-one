import { useEffect, useRef, useState } from 'react'
import { fmt, MESES, MESES_FULL } from './types'
import { contaNaMeta, guardaDoMes, type MesDoAno } from './anoDoPlano'

/**
 * Os gráficos do ano do Planejamento, no computador (PlanAnoVisao) e no
 * celular (PlanMobile). Pedido do Guilherme em 13/10/2026: "vamos fazer 3
 * gráficos, mas para acessar terá 3 botões no gráfico para selecionar" — a
 * versão de antes, colunas e linha de saldo juntas, "não ficou legal".
 *
 * 1. Saldo: com quanto cada mês termina — o fechamento real nos meses
 *    fechados, o saldo final previsto nos outros (`valor`).
 * 2. Quanto guarda: quanto cada mês guarda (real nos fechados, plano nos
 *    outros) com um traço na meta daquele mês.
 * 3. Rumo da meta: o que vai sendo guardado, ACUMULADO no ano, contra a meta
 *    acumulada. As duas linhas na mesma escala; onde a cheia passa da
 *    tracejada, o ano está à frente da meta.
 *
 * Nenhum número novo: tudo vem de `mesesDoAno`.
 *
 * Cores no branco, elemento gráfico ≥ 3:1: fechado #64748b (4,76), previsto
 * #3b82f6 (3,68), atual #1e3a8a (10,4), negativo #b91c1c (6,47), meta
 * #15803d (5,02).
 */
const COR_FECHADO = '#64748b'
const COR_PREVISTO = '#3b82f6'
const COR_ATUAL = '#1e3a8a'
const COR_NEG = '#b91c1c'
const COR_META = '#15803d'
const SUAVE = '#475569'

const curto = (v: number) => `${v < 0 ? '−' : ''}R$ ${Math.round(Math.abs(v)).toLocaleString('pt-BR')}`

type Modo = 'saldo' | 'guarda' | 'rumo'
const MODOS: { id: Modo; rotulo: string; titulo: string }[] = [
  { id: 'saldo', rotulo: 'Saldo', titulo: 'Com quanto cada mês termina' },
  { id: 'guarda', rotulo: 'Quanto guarda', titulo: 'Quanto cada mês guarda' },
  { id: 'rumo', rotulo: 'Rumo da meta', titulo: 'O que você guarda no ano, contra a meta' },
]
const CHAVE = 'compass:grafico-plano'

interface Props {
  meses: MesDoAno[]
  altura: number
  /** Celular: largura fixa de cada coluna, e o gráfico rola para o lado. */
  coluna?: number
  /** Mês destacado no eixo (celular: o do cartão). */
  escolhido?: number
  onEscolher: (mi: number) => void
}

export default function GraficoAnoPlano({ meses, altura, coluna, escolhido, onEscolher }: Props) {
  const [modo, setModo] = useState<Modo>(() => {
    try { const v = localStorage.getItem(CHAVE); if (v === 'saldo' || v === 'guarda' || v === 'rumo') return v } catch { /* sem armazenamento */ }
    return 'saldo'
  })
  const escolher = (m: Modo) => { setModo(m); try { localStorage.setItem(CHAVE, m) } catch { /* sem armazenamento */ } }

  const rolagem = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = rolagem.current
    if (el && coluna && escolhido !== undefined)
      el.scrollTo({ left: Math.max(0, (escolhido - 2) * coluna), behavior: 'smooth' })
  }, [escolhido, coluna, modo])

  const TOPO = 20
  const BASE = 18
  const H = altura
  const largura = coluna ? 12 * coluna : undefined
  const colunas = coluna ? `repeat(12, ${coluna}px)` : 'repeat(12, minmax(0,1fr))'
  const lado = coluna ? '0 16px' : 0
  const temMeta = meses.some(m => m.meta > 0)

  // ── Colunas (saldo e quanto guarda) ──
  const valores = modo === 'saldo' ? meses.map(m => m.valor) : meses.map(guardaDoMes)
  const metas = modo === 'guarda' ? meses.map(m => m.meta) : []

  // ── Linhas (rumo da meta): acumulados do ano ──
  const acGuarda: number[] = []
  const acMeta: number[] = []
  meses.forEach((m, i) => {
    // Com meta, só os meses que têm meta somam — a mesma régua do topo
    // (`resumoDoAno().rumo`); sem meta nenhuma, o ano inteiro.
    acGuarda.push((acGuarda[i - 1] ?? 0) + (!temMeta || contaNaMeta(m) ? guardaDoMes(m) : 0))
    acMeta.push((acMeta[i - 1] ?? 0) + m.meta)
  })

  const todos = modo === 'rumo' ? [...acGuarda, ...(temMeta ? acMeta : [])] : [...valores, ...metas]
  const max = Math.max(0, ...todos)
  const min = Math.min(0, ...todos)
  const faixa = max - min || 1
  const y = (v: number) => ((max - v) / faixa) * H
  const zeroY = y(0)

  const corColuna = (m: MesDoAno, v: number) =>
    v < 0 ? COR_NEG : m.atual ? COR_ATUAL : m.fechado ? COR_FECHADO : COR_PREVISTO

  const tituloDoMes = (m: MesDoAno, i: number) => {
    if (modo === 'saldo') return `${MESES_FULL[m.mi]}: ${m.fechado ? 'fechou com' : 'termina com'} ${fmt(m.valor, true)}`
    if (modo === 'guarda') {
      const v = valores[i]
      const verbo = m.fechado ? (v >= 0 ? 'guardou' : 'gastou a mais') : (v >= 0 ? 'deve guardar' : 'deve gastar a mais')
      return `${MESES_FULL[m.mi]}: ${verbo} ${fmt(Math.abs(v), true)}` + (m.meta > 0 ? ` · meta ${fmt(m.meta, true)}` : '')
    }
    return `Até ${MESES_FULL[m.mi].toLowerCase()}: ${fmt(acGuarda[i], true)} guardados` + (temMeta ? ` · meta ${fmt(acMeta[i], true)}` : '')
  }

  const linha = (serie: number[]) => serie.map((v, i) => `${i + 0.5},${y(v).toFixed(2)}`).join(' ')
  const fimGuarda = acGuarda[11]
  const fimMeta = acMeta[11]
  const atual = modoAtual(modo)

  return (
    <div>
      {/* Título e os três botões */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
        padding: lado, marginBottom: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{atual.titulo}</div>
        <div role="tablist" aria-label="Escolher gráfico" style={{ display: 'inline-flex', background: '#eef2f8',
          borderRadius: 999, padding: 3, gap: 2 }}>
          {MODOS.map(o => {
            const ativo = o.id === modo
            return (
              <button key={o.id} type="button" role="tab" aria-selected={ativo} onClick={() => escolher(o.id)}
                style={{ border: 'none', borderRadius: 999, padding: coluna ? '7px 11px' : '6px 14px', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: ativo ? 700 : 600,
                  background: ativo ? '#1e3a8a' : 'transparent', color: ativo ? '#fff' : '#334155' }}>
                {o.rotulo}
              </button>
            )
          })}
        </div>
      </div>

      {modo === 'rumo' && (
        <div style={{ padding: lado, marginBottom: 4, fontSize: 13, color: SUAVE, fontVariantNumeric: 'tabular-nums' }}>
          Até dezembro: <b style={{ color: fimGuarda < 0 ? COR_NEG : '#0f172a' }}>{fmt(fimGuarda, true)}</b> guardados
          {temMeta && <> · meta <b style={{ color: COR_META }}>{fmt(fimMeta, true)}</b>
            {fimGuarda >= fimMeta - 0.005
              ? <span style={{ color: COR_META, fontWeight: 700 }}> · ✓ dentro da meta</span>
              : <span style={{ color: COR_NEG, fontWeight: 700 }}> · faltam {fmt(fimMeta - fimGuarda, true)}</span>}</>}
        </div>
      )}

      <div ref={rolagem} style={{ overflowX: coluna ? 'auto' : 'visible', scrollbarWidth: 'none', padding: coluna ? '0 8px' : 0 }}>
        <div style={{ position: 'relative', width: largura, paddingTop: TOPO, paddingBottom: BASE }}>
          <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, top: TOPO + zeroY, height: 1,
            background: min < 0 ? COR_NEG : '#94a3b8' }} />

          <div style={{ display: 'grid', gridTemplateColumns: colunas, position: 'relative', height: H }}>
            {meses.map((m, i) => {
              const t = tituloDoMes(m, i)
              if (modo === 'rumo') {
                return <button key={m.mi} type="button" onClick={() => onEscolher(m.mi)} aria-label={t} title={t}
                  style={{ height: H, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }} />
              }
              const v = valores[i]
              const h = Math.max(2, (Math.abs(v) / faixa) * H)
              const top = v >= 0 ? zeroY - h : zeroY
              const vazio = m.semPlano && !m.fechado
              return (
                <button key={m.mi} type="button" onClick={() => onEscolher(m.mi)} aria-label={t} title={t}
                  style={{ position: 'relative', height: H, border: 'none', background: 'transparent', padding: 0,
                    cursor: 'pointer', fontFamily: 'inherit' }}>
                  <span style={{ position: 'absolute', left: 0, right: 0, top: v >= 0 ? top - 17 : top + h + 2,
                    fontSize: coluna ? 12 : 11, fontWeight: m.atual ? 800 : 600, color: v < 0 ? COR_NEG : '#0f172a',
                    fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', textAlign: 'center', letterSpacing: '-.3px' }}>
                    {curto(v)}
                  </span>
                  <span style={{ position: 'absolute', left: '16%', right: '16%', top, height: h, boxSizing: 'border-box',
                    borderRadius: v >= 0 ? '6px 6px 0 0' : '0 0 6px 6px',
                    background: vazio ? 'transparent' : corColuna(m, v), border: vazio ? `1.5px dashed ${COR_FECHADO}` : 'none' }} />
                  {modo === 'guarda' && m.meta > 0 && (
                    <span aria-hidden style={{ position: 'absolute', left: '4%', right: '4%', top: y(m.meta) - 1,
                      borderTop: `2.5px dashed ${COR_META}` }} />
                  )}
                </button>
              )
            })}
          </div>

          {modo === 'rumo' && (
            <>
              <svg aria-hidden viewBox={`0 0 12 ${H}`} preserveAspectRatio="none"
                style={{ position: 'absolute', left: 0, top: TOPO, width: '100%', height: H, overflow: 'visible', pointerEvents: 'none' }}>
                {temMeta && <polyline points={linha(acMeta)} fill="none" stroke={COR_META} strokeWidth={2.5}
                  strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />}
                <polyline points={linha(acGuarda)} fill="none" stroke={COR_ATUAL} strokeWidth={3}
                  strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              </svg>
              {meses.map((m, i) => (
                <span key={m.mi} aria-hidden style={{ position: 'absolute', pointerEvents: 'none',
                  left: `calc(${((i + 0.5) / 12) * 100}% - 5px)`, top: TOPO + y(acGuarda[i]) - 5, width: 10, height: 10,
                  borderRadius: '50%', boxSizing: 'border-box', boxShadow: '0 0 0 2px #fff',
                  background: m.fechado ? COR_ATUAL : '#fff', border: `2.5px solid ${acGuarda[i] < 0 ? COR_NEG : COR_ATUAL}` }} />
              ))}
            </>
          )}
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

      <div style={{ display: 'flex', gap: '6px 16px', flexWrap: 'wrap', marginTop: 12, padding: lado, fontSize: 12, color: SUAVE }}>
        {modo !== 'rumo' && [[modo === 'saldo' ? 'fechou (real)' : 'guardou (real)', COR_FECHADO], ['este mês', COR_ATUAL],
          ['previsto', COR_PREVISTO]].map(([t, c]) => (
          <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: c }} />{t}
          </span>
        ))}
        {modo === 'guarda' && temMeta && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 16, borderTop: `2.5px dashed ${COR_META}` }} />meta do mês
          </span>
        )}
        {modo === 'rumo' && <>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: COR_ATUAL }} />guardado de verdade
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', border: `2.5px solid ${COR_ATUAL}`, boxSizing: 'border-box' }} />pelo plano
          </span>
          {temMeta
            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 16, borderTop: `2.5px dashed ${COR_META}` }} />meta acumulada
              </span>
            : <span>Defina a meta de cada mês para ver o rumo.</span>}
        </>}
      </div>
    </div>
  )
}

function modoAtual(m: Modo) { return MODOS.find(o => o.id === m)! }
