import { useEffect, useState } from 'react'
import { fmt, MESES_FULL, type Saldos } from './types'
import { mesesDoAno } from './anoDoPlano'
import GraficoAnoPlano from './GraficoAnoPlano'
import MetaNoCartao from './MetaNoCartao'

interface Props {
  previsto: Saldos
  anoAtual: number
  mesAtual: number
  /** Fechamento real de cada mês (bancos e dinheiro). Só vale nos meses fechados. */
  fechamentoReal?: number[]
  /** Saldo real com que cada mês abriu. */
  inicioReal?: number[]
  objetivos: number[]
  /** O texto do mês sem plano — na descoberta, "Descobrindo" no mês observado. */
  semPlanoTexto: (mi: number) => { titulo: string; sub?: string } | undefined
  onAbrir: (mi: number) => void
}

/**
 * O ano do Planejamento no modelo do Radar (pedido do Guilherme em
 * 12/10/2026: ele gostou dos dois modelos, "ano inteiro" e "gráfico", e
 * ficaram juntos). Em cima, os três gráficos do ano (GraficoAnoPlano);
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
const COR_ATUAL = '#1e3a8a'
const COR_NEG = '#b91c1c'
const VERDE = '#14532d'
const SUAVE = '#475569'

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

export default function PlanAnoVisao({ previsto, anoAtual, mesAtual, fechamentoReal, inicioReal, objetivos, semPlanoTexto, onAbrir }: Props) {
  const colunas = useColunas()
  const meses = mesesDoAno({ previsto, anoAtual, mesAtual, fechamentoReal, inicioReal, objetivos })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 14px rgba(15,40,120,.07)', padding: '18px 20px 14px' }}>
        <GraficoAnoPlano meses={meses} altura={170} onEscolher={onAbrir} />
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
                border: m.atual ? '2px solid #3b82f6' : '1.5px solid #c3ccd8',
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
              {!sem && <MetaNoCartao m={m} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
