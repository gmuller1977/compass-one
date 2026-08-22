import { useState } from 'react'
import PlanResumoAnual from './PlanResumoAnual'
import PlanCardMes from './PlanCardMes'
import PlanModalMes from './PlanModalMes'
import { type AnoData, COR } from './types'

interface Props {
  aba: 'meu-plano' | 'realizado'
  anoAtual: number
  mesAtual: number
  dadosPrevisto: AnoData
  dadosRealizado: AnoData | null
  previsto: { totalEntradas: number[]; totalSaidas: number[]; saldoInicial: number[]; saldoFinal: number[] }
  realizadoPlan: { totalEntradas: number[]; totalSaidas: number[]; saldoInicial: number[]; saldoFinal: number[] }
  lancadoPorCatMes: Record<number, { entrada: Record<string, number>; saida: Record<string, number> }>
  planoRef?: AnoData
  categorias: any[]
  hasFaturaCat: boolean
  somaCartaoMes: number[]
  planejamentoLockado: boolean
  setAnoAtual: React.Dispatch<React.SetStateAction<number>>
  onSave: (tipo: 'e' | 's', ri: number, mi: number, valor: number) => void
}

const FERRAMENTA_BTN: React.CSSProperties = {
  border: `1px solid ${COR.borda}`, borderRadius: 8, padding: '6px 14px',
  fontSize: 12, fontWeight: 600, cursor: 'pointer', background: COR.branco,
  color: COR.textoSuave, display: 'flex', alignItems: 'center', gap: 5,
}

export default function PlanGrade(props: Props) {
  const [modalMes, setModalMes] = useState<number | null>(null)

  const {
    aba, anoAtual, mesAtual, dadosPrevisto, dadosRealizado,
    previsto, realizadoPlan, setAnoAtual,
  } = props

  const planTotais = aba === 'realizado' ? realizadoPlan : previsto

  const receitasAnuais = planTotais.totalEntradas.reduce((a, b) => a + b, 0)
  const despesasAnuais = planTotais.totalSaidas.reduce((a, b) => a + b, 0)
  const resultadoDez = planTotais.saldoFinal[11]
  const saldoIni = planTotais.saldoInicial[0]

  const anoCorrente = new Date().getFullYear()

  return (
    <div style={{ padding: '16px 20px' }}>
      <PlanResumoAnual
        saldoInicial={saldoIni}
        totalReceitas={receitasAnuais}
        totalDespesas={despesasAnuais}
        resultado={resultadoDez}
        anoAtual={anoAtual}
        onChangeAno={delta => setAnoAtual(a => a + delta)}
      />

      {/* Ferramentas de lote */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button style={FERRAMENTA_BTN}>📋 Copiar mês</button>
        <button style={FERRAMENTA_BTN}>💱 Aplicar valor</button>
        <button style={FERRAMENTA_BTN}>📈 Reajuste %</button>
        <button style={FERRAMENTA_BTN}>📅 Copiar ano</button>
      </div>

      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}
        className="plan-grade-grid"
      >
        {Array.from({ length: 12 }, (_, mi) => {
          const isAtual = mi === mesAtual && anoAtual === anoCorrente
          const isFuturo = anoAtual > anoCorrente || (anoAtual === anoCorrente && mi > mesAtual)
          return (
            <PlanCardMes
              key={mi}
              mes={mi}
              receitas={planTotais.totalEntradas[mi]}
              despesas={planTotais.totalSaidas[mi]}
              saldoInicial={planTotais.saldoInicial[mi]}
              saldoFinal={planTotais.saldoFinal[mi]}
              isAtual={isAtual}
              isFuturo={isFuturo}
              onClick={() => setModalMes(mi)}
            />
          )
        })}
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
          hasFaturaCat={props.hasFaturaCat}
          planejamentoLockado={props.planejamentoLockado}
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
