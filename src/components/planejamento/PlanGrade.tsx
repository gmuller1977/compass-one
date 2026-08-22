import { useState } from 'react'
import PlanResumoAnual from './PlanResumoAnual'
import PlanCardMes from './PlanCardMes'
import PlanModalMes from './PlanModalMes'
import PlanFerramentas, { type BulkOp } from './PlanFerramentas'
import { type AnoData, COR } from './types'

interface Props {
  aba: 'meu-plano' | 'realizado'
  anoAtual: number
  mesAtual: number
  dadosPrevisto: AnoData
  dadosRealizado: AnoData | null
  dadosAnoAnterior: AnoData | null
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
  onBulkSave: (ops: BulkOp[]) => void
}

const FERRAMENTAS: { id: 'copiar' | 'valor' | 'reajuste' | 'ano'; label: string; icon: string }[] = [
  { id: 'copiar',   label: 'Copiar mês',    icon: '📋' },
  { id: 'valor',    label: 'Aplicar valor', icon: '💱' },
  { id: 'reajuste', label: 'Reajuste %',    icon: '📈' },
  { id: 'ano',      label: 'Copiar ano',    icon: '📅' },
]

export default function PlanGrade(props: Props) {
  const [modalMes, setModalMes] = useState<number | null>(null)
  const [toolAberta, setToolAberta] = useState<'copiar' | 'valor' | 'reajuste' | 'ano' | null>(null)

  const {
    aba, anoAtual, mesAtual, dadosPrevisto, dadosRealizado, dadosAnoAnterior,
    previsto, realizadoPlan, setAnoAtual,
  } = props

  const planTotais = aba === 'realizado' ? realizadoPlan : previsto

  const receitasAnuais = planTotais.totalEntradas.reduce((a, b) => a + b, 0)
  const despesasAnuais = planTotais.totalSaidas.reduce((a, b) => a + b, 0)
  const resultadoDez = planTotais.saldoFinal[11]
  const saldoIni = planTotais.saldoInicial[0]

  const anoCorrente = new Date().getFullYear()

  function toggleTool(id: 'copiar' | 'valor' | 'reajuste' | 'ano') {
    setToolAberta(prev => prev === id ? null : id)
  }

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
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {FERRAMENTAS.map(f => {
          const ativa = toolAberta === f.id
          return (
            <button
              key={f.id}
              onClick={() => toggleTool(f.id)}
              style={{
                border: `1.5px solid ${ativa ? '#1a56db' : COR.borda}`,
                borderRadius: 8, padding: '6px 14px',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: ativa ? '#eff6ff' : COR.branco,
                color: ativa ? '#1a56db' : COR.textoSuave,
                display: 'flex', alignItems: 'center', gap: 5,
                transition: 'all .12s',
              }}
            >
              {f.icon} {f.label}
            </button>
          )
        })}
      </div>

      {/* Painel da ferramenta */}
      <PlanFerramentas
        toolAberta={toolAberta}
        mesAtual={mesAtual}
        anoAtual={anoAtual}
        dadosPrevisto={dadosPrevisto}
        dadosAnoAnterior={dadosAnoAnterior}
        categorias={props.categorias}
        onBulkSave={props.onBulkSave}
        onClose={() => setToolAberta(null)}
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
