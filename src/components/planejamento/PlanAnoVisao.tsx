import { useEffect, useState } from 'react'
import { fmt, type Saldos } from './types'
import { mesesDoAno } from './anoDoPlano'
import GraficoAnoPlano from './GraficoAnoPlano'
import ConteudoCartaoMes from './ConteudoCartaoMes'
import { bordaDoCartaoMes } from './anoDoPlano'

interface Props {
  previsto: Saldos
  anoAtual: number
  mesAtual: number
  /** Fechamento real de cada mês (bancos e dinheiro). Só vale nos meses fechados. */
  fechamentoReal?: number[]
  /** Saldo real com que cada mês abriu. */
  inicioReal?: number[]
  investidoReal?: number[]
  objetivos: number[]
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

export default function PlanAnoVisao({ previsto, anoAtual, mesAtual, fechamentoReal, inicioReal, investidoReal, objetivos, onAbrir }: Props) {
  const colunas = useColunas()
  const meses = mesesDoAno({ previsto, anoAtual, mesAtual, fechamentoReal, inicioReal, investidoReal, objetivos })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 14px rgba(15,40,120,.07)', padding: '18px 20px 14px' }}>
        <GraficoAnoPlano meses={meses} altura={170} onEscolher={onAbrir} />
      </div>

      {/* Os doze meses, sem setas. */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colunas}, minmax(0,1fr))`, gap: 12 }}>
        {meses.map(m => (
          <button key={m.mi} type="button" onClick={() => onAbrir(m.mi)}
            title={m.real !== undefined ? `Previsto: ${fmt(m.final, true)} · fechou com ${fmt(m.real, true)}` : undefined}
            style={{ textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', minWidth: 0,
              background: '#fff', borderRadius: 18, padding: '12px 14px',
              boxShadow: '0 2px 14px rgba(15,40,120,.07)', border: bordaDoCartaoMes(m),
              display: 'flex', flexDirection: 'column', gap: 4 }}>
            <ConteudoCartaoMes m={m} />
          </button>
        ))}
      </div>
    </div>
  )
}
