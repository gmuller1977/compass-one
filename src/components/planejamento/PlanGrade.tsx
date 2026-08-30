import { useState } from 'react'
import PlanResumoAnual from './PlanResumoAnual'
import PlanCardMes from './PlanCardMes'
import PlanModalMes from './PlanModalMes'
import PlanBarraFerramentas from './PlanBarraFerramentas'
import PlanAncoraBadge from './PlanAncoraBadge'
import { type BulkOp } from './PlanFerramentas'
import { type AnoData, MOTIVO_PLANO_LOCKADO } from './types'
import type { Categoria } from '../../context/AppContext'

interface Props {
  anoAtual: number
  mesAtual: number
  dadosPrevisto: AnoData
  dadosAnoAnterior: AnoData | null
  previsto: { totalEntradas: number[]; totalSaidas: number[]; saldoInicial: number[]; saldoFinal: number[] }
  lancadoPorCatMes: Record<number, { entrada: Record<string, number>; saida: Record<string, number> }>
  planoRef?: AnoData
  categorias: Categoria[]
  hasFaturaCat: boolean
  somaCartaoMes: number[]
  onSave: (tipo: 'e' | 's', ri: number, mi: number, valor: number) => void
  onBulkSave: (ops: BulkOp[]) => void
  ancoraMes: number
}

export default function PlanGrade(props: Props) {
  const [modalMes, setModalMes] = useState<number | null>(null)

  const {
    anoAtual, mesAtual, dadosPrevisto, dadosAnoAnterior,
    previsto, ancoraMes,
  } = props

  const planTotais = previsto

  const receitasAnuais = planTotais.totalEntradas.reduce((a, b) => a + b, 0)
  const despesasAnuais = planTotais.totalSaidas.reduce((a, b) => a + b, 0)
  const resultadoDez = planTotais.saldoFinal[11]
  const saldoIni = planTotais.saldoInicial[0]

  const anoCorrente = new Date().getFullYear()

  const dadosAtivos = dadosPrevisto
  const bloqueado = false

  return (
    <div style={{ padding: '16px 20px' }}>
      <PlanResumoAnual
        saldoInicial={saldoIni}
        totalReceitas={receitasAnuais}
        totalDespesas={despesasAnuais}
        resultado={resultadoDez}
        anoAtual={anoAtual}
      />

      <PlanAncoraBadge
        ancoraMes={ancoraMes}
        anoAtual={anoAtual}
        saldoAncora={ancoraMes >= 0 ? planTotais.saldoFinal[ancoraMes] : planTotais.saldoInicial[0]}
      />

      <PlanBarraFerramentas
        mesAtual={mesAtual}
        anoAtual={anoAtual}
        dadosAtivos={dadosAtivos}
        dadosAnoAnterior={dadosAnoAnterior}
        categorias={props.categorias}
        onBulkSave={props.onBulkSave}
        bloqueado={bloqueado}
        motivoBloqueio={MOTIVO_PLANO_LOCKADO}
      />

      {/* Grade de meses */}
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
          hasFaturaCat={props.hasFaturaCat}
          planoRef={props.planoRef}
          categorias={props.categorias}
          onSave={(tipo, ri, valor) => props.onSave(tipo, ri, modalMes, valor)}
          onClose={() => setModalMes(null)}
          somaCartaoMes={props.somaCartaoMes}
        />
      )}
    </div>
  )
}
