import { useState } from 'react'
import PlanResumoAnual from './PlanResumoAnual'
import PlanCardMes from './PlanCardMes'
import PlanModalMes from './PlanModalMes'
import { type AnoData } from './types'

interface Props {
  aba: 'meu-plano' | 'realizado'
  anoAtual: number
  mesAtual: number
  dadosPrevisto: AnoData
  dadosRealizado: AnoData | null
  previsto: { totalEntradas: number[]; totalSaidas: number[]; saldoInicial: number[]; saldoFinal: number[] }
  realizadoPlan: { totalEntradas: number[]; totalSaidas: number[]; saldoInicial: number[]; saldoFinal: number[] }
  totaisReais: { te: number[]; ts: number[] }
  saldoFinalReal: number[]
  mesTemDadosReais: boolean[]
  lancadoPorCatMes: Record<number, { entrada: Record<string, number>; saida: Record<string, number> }>
  planoRef?: AnoData
  categorias: any[]
  somaCartaoMes: number[]
  planejamentoLockado: boolean
  onSave: (tipo: 'e' | 's', ri: number, mi: number, valor: number) => void
}

export default function PlanGrade(props: Props) {
  const [modalMes, setModalMes] = useState<number | null>(null)

  const {
    aba, anoAtual, mesAtual, dadosPrevisto, dadosRealizado,
    previsto, realizadoPlan, totaisReais, saldoFinalReal, mesTemDadosReais,
  } = props

  // Usa os totais do plano correto para a aba ativa
  const planTotais = aba === 'realizado' ? realizadoPlan : previsto

  const receitasAnuais = planTotais.totalEntradas.reduce((a, b) => a + b, 0)
  const despesasAnuais = planTotais.totalSaidas.reduce((a, b) => a + b, 0)
  const resultadoDez = planTotais.saldoFinal[11]
  const saldoIni = planTotais.saldoInicial[0]

  return (
    <div style={{ padding: '16px 20px' }}>
      <PlanResumoAnual
        saldoInicial={saldoIni}
        totalReceitas={receitasAnuais}
        totalDespesas={despesasAnuais}
        resultado={resultadoDez}
      />

      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}
        className="plan-grade-grid"
      >
        {Array.from({ length: 12 }, (_, mi) => (
          <PlanCardMes
            key={mi}
            mes={mi}
            receitas={planTotais.totalEntradas[mi]}
            despesas={planTotais.totalSaidas[mi]}
            saldoPrevisto={planTotais.saldoFinal[mi]}
            isAtual={mi === mesAtual && anoAtual === new Date().getFullYear()}
            onClick={() => setModalMes(mi)}
            aba={aba}
            receitasReais={totaisReais.te[mi]}
            despesasReais={totaisReais.ts[mi]}
            saldoReal={saldoFinalReal[mi]}
            temDadosReais={mesTemDadosReais[mi]}
          />
        ))}
      </div>

      <style>{`
        @media (max-width: 1023px) { .plan-grade-grid { grid-template-columns: repeat(3, 1fr) !important; } }
        @media (max-width: 639px)  { .plan-grade-grid { grid-template-columns: repeat(2, 1fr) !important; } }
      `}</style>

      {modalMes !== null && (
        <PlanModalMes
          mes={modalMes}
          dadosPrevisto={dadosPrevisto}
          dadosRealizado={dadosRealizado}
          aba={aba}
          planejamentoLockado={props.planejamentoLockado}
          lancadoPorCatMes={props.lancadoPorCatMes}
          planoRef={props.planoRef as any}
          categorias={props.categorias}
          onSave={(tipo, ri, valor) => props.onSave(tipo, ri, modalMes, valor)}
          onClose={() => setModalMes(null)}
          somaCartaoMes={props.somaCartaoMes}
        />
      )}
    </div>
  )
}
