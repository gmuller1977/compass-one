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
  lancadoPorCatMes: Record<number, { entrada: Record<string, number>; saida: Record<string, number> }>
  planoRef?: AnoData
  categorias: any[]
  hasFaturaCat: boolean
  somaCartaoMes: number[]
  planejamentoLockado: boolean
  onSave: (tipo: 'e' | 's', ri: number, mi: number, valor: number) => void
}

export default function PlanGrade(props: Props) {
  const [modalMes, setModalMes] = useState<number | null>(null)

  const {
    aba, anoAtual, mesAtual, dadosPrevisto, dadosRealizado,
    previsto, realizadoPlan,
  } = props

  const planTotais = aba === 'realizado' ? realizadoPlan : previsto
  const dadosAtivos = aba === 'realizado' && dadosRealizado ? dadosRealizado : dadosPrevisto

  const receitasAnuais = planTotais.totalEntradas.reduce((a, b) => a + b, 0)
  const despesasAnuais = planTotais.totalSaidas.reduce((a, b) => a + b, 0)
  const resultadoDez = planTotais.saldoFinal[11]
  const saldoIni = planTotais.saldoInicial[0]

  const anoCorrente = new Date().getFullYear()

  function top3Mes(mi: number): { nome: string; valor: number }[] {
    const saidas = dadosAtivos.saidas
    return saidas
      .filter(c => c.v[mi] > 0)
      .map(c => ({ nome: c.descricao ? `${c.nome} · ${c.descricao}` : c.nome, valor: c.v[mi] }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 3)
  }

  return (
    <div style={{ padding: '16px 20px' }}>
      <PlanResumoAnual
        saldoInicial={saldoIni}
        totalReceitas={receitasAnuais}
        totalDespesas={despesasAnuais}
        resultado={resultadoDez}
      />

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
              top3={top3Mes(mi)}
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
