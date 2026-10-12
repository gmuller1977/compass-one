import { useEffect, useState } from 'react'
import { fmt, MESES, MESES_FULL, type Saldos } from './types'

interface Props {
  previsto: Saldos
  anoAtual: number
  mesAtual: number
  /** Fechamento real de cada mês (bancos e dinheiro). Só vale nos meses fechados. */
  fechamentoReal?: number[]
  objetivos: number[]
  /** O texto do mês sem plano — na descoberta, "Descobrindo" no mês observado. */
  semPlanoTexto: (mi: number) => { titulo: string; sub?: string } | undefined
  onAbrir: (mi: number) => void
}

/**
 * O ano do Planejamento no modelo do Radar (pedido do Guilherme em
 * 12/10/2026: ele gostou dos dois modelos, "ano inteiro" e "gráfico", e
 * ficaram juntos). Em cima, uma coluna por mês com o saldo em que ele termina;
 * embaixo, os doze meses em cartões brancos, sem setas — nenhum mês escondido.
 * Clicar numa coluna ou num cartão abre o mesmo modal de sempre.
 *
 * Nenhum número novo. Mês FECHADO mostra o fechamento real (`fechamentoReal`,
 * o "Fechou em" de antes) e, embaixo, quanto ficou acima ou abaixo do saldo
 * final previsto; os outros mostram o saldo final previsto e a sobra
 * planejada do mês (receitas − despesas do plano). O real fica AO LADO do
 * previsto, como a regra do Planejamento pede: o cartão diz "fechou com", e
 * a sobra planejada não aparece ao lado de um saldo real, para não misturar.
 *
 * Cores no branco, elemento gráfico ≥ 3:1: fechado #64748b (4,76), previsto
 * #3b82f6 (3,68), atual #1e3a8a (10,4), negativo #b91c1c (6,47). Texto:
 * verde #14532d e vermelho #b91c1c.
 */
const COR_FECHADO = '#64748b'
const COR_PREVISTO = '#3b82f6'
const COR_ATUAL = '#1e3a8a'
const COR_NEG = '#b91c1c'
const VERDE = '#14532d'
const SUAVE = '#475569'
const ALTURA = 170

const curto = (v: number) => `${v < 0 ? '−' : ''}R$ ${Math.round(Math.abs(v)).toLocaleString('pt-BR')}`

function useColunas() {
  const calc = () => (window.innerWidth >= 1280 ? 6 : window.innerWidth >= 900 ? 4 : 3)
  const [n, setN] = useState(calc)
  useEffect(() => {
    const h = () => setN(calc())
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return n
}

export default function PlanAnoVisao({ previsto, anoAtual, mesAtual, fechamentoReal, objetivos, semPlanoTexto, onAbrir }: Props) {
  const colunas = useColunas()
  const anoCorrente = new Date().getFullYear()

  const meses = Array.from({ length: 12 }, (_, mi) => {
    const fechado = anoAtual < anoCorrente || (anoAtual === anoCorrente && mi < mesAtual)
    const atual = anoAtual === anoCorrente && mi === mesAtual
    const receitas = previsto.totalEntradas[mi]
    const despesas = previsto.totalSaidas[mi]
    const semPlano = receitas === 0 && despesas === 0
    const real = fechado && fechamentoReal ? fechamentoReal[mi] : undefined
    const final = previsto.saldoFinal[mi]
    return { mi, fechado, atual, semPlano, real, final, sobra: receitas - despesas,
      valor: real ?? final, meta: objetivos[mi] ?? 0 }
  })

  const max = Math.max(0, ...meses.map(m => m.valor))
  const min = Math.min(0, ...meses.map(m => m.valor))
  const faixa = max - min || 1
  const zeroY = (max / faixa) * ALTURA
  const corBarra = (m: typeof meses[number]) =>
    m.valor < 0 ? COR_NEG : m.atual ? COR_ATUAL : m.fechado ? COR_FECHADO : COR_PREVISTO

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* O gráfico: uma coluna por mês, com o valor em cima. */}
      <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 14px rgba(15,40,120,.07)', padding: '18px 20px 14px' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>
          Com quanto cada mês termina
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0,1fr))', gap: 8,
          position: 'relative', height: ALTURA + 36, paddingTop: 18 }}>
          {/* Linha do zero */}
          <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, top: 18 + zeroY, height: 1,
            background: min < 0 ? COR_NEG : '#94a3b8' }} />
          {meses.map(m => {
            const h = Math.max(2, (Math.abs(m.valor) / faixa) * ALTURA)
            const top = m.valor >= 0 ? zeroY - h : zeroY
            const cor = corBarra(m)
            const rotulo = m.fechado ? 'fechou com' : 'termina com'
            return (
              <button key={m.mi} type="button" onClick={() => onAbrir(m.mi)}
                aria-label={`${MESES_FULL[m.mi]}: ${rotulo} ${fmt(m.valor, true)}`}
                title={`${MESES_FULL[m.mi]}: ${rotulo} ${fmt(m.valor, true)}`}
                style={{ position: 'relative', height: ALTURA, border: 'none', background: 'transparent',
                  padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}>
                <span style={{ position: 'absolute', left: 0, right: 0, top: m.valor >= 0 ? top - 18 : top + h + 2,
                  fontSize: 11, fontWeight: m.atual ? 800 : 600, color: m.valor < 0 ? COR_NEG : '#0f172a',
                  fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', textAlign: 'center' }}>
                  {curto(m.valor)}
                </span>
                <span style={{ position: 'absolute', left: '12%', right: '12%', top, height: h,
                  borderRadius: m.valor >= 0 ? '6px 6px 0 0' : '0 0 6px 6px',
                  background: m.semPlano && !m.fechado ? 'transparent' : cor,
                  border: m.semPlano && !m.fechado ? `1.5px dashed ${COR_FECHADO}` : 'none',
                  boxSizing: 'border-box' }} />
              </button>
            )
          })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0,1fr))', gap: 8, marginTop: 6 }}>
          {meses.map(m => (
            <span key={m.mi} style={{ textAlign: 'center', fontSize: 12, color: m.atual ? COR_ATUAL : SUAVE,
              fontWeight: m.atual ? 800 : 500 }}>{MESES[m.mi]}</span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 10, fontSize: 12, color: SUAVE }}>
          {[['fechado (real)', COR_FECHADO], ['este mês', COR_ATUAL], ['previsto', COR_PREVISTO]].map(([t, c]) => (
            <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: c }} />{t}
            </span>
          ))}
        </div>
      </div>

      {/* Os doze meses, sem setas. */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colunas}, minmax(0,1fr))`, gap: 12 }}>
        {meses.map(m => {
          const sem = m.semPlano && !m.fechado ? (semPlanoTexto(m.mi) ?? { titulo: 'Sem planejamento', sub: 'clique para planejar' }) : null
          const dif = m.real !== undefined ? m.real - m.final : 0
          return (
            <button key={m.mi} type="button" onClick={() => onAbrir(m.mi)}
              title={m.real !== undefined ? `Previsto: ${fmt(m.final, true)} · fechou com ${fmt(m.real, true)}` : undefined}
              style={{ textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', minWidth: 0,
                background: m.fechado ? '#f8fafc' : '#fff', borderRadius: 18, padding: '12px 14px',
                boxShadow: '0 2px 14px rgba(15,40,120,.07)',
                border: `2px solid ${m.atual ? '#93c5fd' : 'transparent'}`,
                display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{MESES_FULL[m.mi]}</span>
                {m.atual && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                  background: '#dbeafe', color: COR_ATUAL }}>ATUAL</span>}
                {m.fechado && <span aria-label="Mês fechado" style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px',
                  borderRadius: 999, background: '#e2e8f0', color: '#334155' }}>✓</span>}
              </span>
              <span style={{ fontSize: 12, color: SUAVE }}>{m.fechado ? 'fechou com' : 'termina com'}</span>
              <span style={{ fontSize: 19, fontWeight: 800, color: m.valor < 0 ? COR_NEG : VERDE,
                fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {fmt(m.valor, true)}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                color: sem ? SUAVE : m.real !== undefined ? (dif < 0 ? COR_NEG : VERDE) : (m.sobra < 0 ? COR_NEG : VERDE) }}>
                {sem ? (sem.sub ? `${sem.titulo} · ${sem.sub}` : sem.titulo)
                  : m.real !== undefined
                    ? (Math.abs(dif) < 0.005 ? 'igual ao previsto'
                      : `${dif > 0 ? '▲' : '▼'} ${fmt(Math.abs(dif), true)} ${dif > 0 ? 'acima' : 'abaixo'}`)
                    : m.sobra >= 0 ? `+ ${fmt(m.sobra, true)} de sobra` : `− ${fmt(-m.sobra, true)} no mês`}
              </span>
              {m.meta > 0 && !m.fechado && (
                <span style={{ fontSize: 12, color: SUAVE }}>🎯 meta {fmt(m.meta, true)}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
