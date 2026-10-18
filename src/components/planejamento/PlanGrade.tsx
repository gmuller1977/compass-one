import { useState } from 'react'
import PlanAnoVisao from './PlanAnoVisao'
import PlanModalMeses from './PlanModalMeses'
import PlanBarraFerramentas from './PlanBarraFerramentas'
import { type BulkOp } from './PlanFerramentas'
import { type AnoData, MOTIVO_PLANO_LOCKADO, type Saldos } from './types'
import type { Categoria } from '../../context/AppContext'

interface Props {
  anoAtual: number
  mesAtual: number
  dadosPrevisto: AnoData
  dadosAnoAnterior: AnoData | null
  previsto: Saldos
  planoRef?: AnoData
  categorias: Categoria[]
  hasFaturaCat: boolean
  somaCartaoMes: number[]
  onSave: (tipo: 'e' | 's', ri: number, mi: number, valor: number) => void
  onBulkSave: (ops: BulkOp[]) => void
  onRevisarAno?: () => void
  objetivos: number[]
  sobraPrevista: number[]
  onMetaSave: (objetivos: number[]) => void
  /** Fechamento real de cada mês (bancos e dinheiro) — o "Fechou em" dos cartões fechados. */
  fechamentoReal?: number[]
  /** Saldo real com que cada mês abriu — para o que o mês guardou de verdade. */
  inicioReal?: number[]
}

export default function PlanGrade(props: Props) {
  const [modalMes, setModalMes] = useState<number | null>(null)

  const {
    anoAtual, mesAtual, dadosPrevisto, dadosAnoAnterior,
    previsto, objetivos, onMetaSave,
  } = props

  const planTotais = previsto


  const dadosAtivos = dadosPrevisto
  const bloqueado = false

  return (
    <div style={{ padding: '16px 20px' }}>
      {/* A faixa anual virou a resposta do ano no topo azul — ver
          PlanResumoAnual, montado no PageHeader de Planejamento.tsx. */}
      <PlanBarraFerramentas
        mesAtual={mesAtual}
        anoAtual={anoAtual}
        dadosAtivos={dadosAtivos}
        dadosAnoAnterior={dadosAnoAnterior}
        categorias={props.categorias}
        onBulkSave={props.onBulkSave} onRevisarAno={props.onRevisarAno}
        bloqueado={bloqueado}
        motivoBloqueio={MOTIVO_PLANO_LOCKADO}
      />

      {/* O gráfico do ano e os doze meses em cartões — ver PlanAnoVisao.
          Substituiu a faixa de quatro meses com setas (12/10/2026). */}
      <PlanAnoVisao
        previsto={planTotais}
        anoAtual={anoAtual}
        mesAtual={mesAtual}
        fechamentoReal={props.fechamentoReal}
        inicioReal={props.inicioReal}
        objetivos={objetivos}
        onAbrir={setModalMes}
      />

      {/* O mês clicado abre as categorias em 3 meses a partir dele, com "Ano
          inteiro" — ver PlanModalMeses. */}
      {modalMes !== null && (
        <PlanModalMeses
          mesInicial={modalMes}
          anoAtual={anoAtual}
          mesAtual={mesAtual}
          dadosAtivos={dadosPrevisto}
          previsto={planTotais}
          hasFaturaCat={props.hasFaturaCat}
          categorias={props.categorias}
          onSave={props.onSave}
          onClose={() => setModalMes(null)}
          objetivos={objetivos}
          onMetaSave={onMetaSave}
        />
      )}
    </div>
  )
}
