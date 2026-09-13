import { useState } from 'react'
import PlanResumoAnual from './PlanResumoAnual'
import PlanCardMes from './PlanCardMes'
import PlanModalMes from './PlanModalMes'
import PlanBarraFerramentas from './PlanBarraFerramentas'
import { type BulkOp } from './PlanFerramentas'
import { type AnoData, MOTIVO_PLANO_LOCKADO, type Saldos, janelaQueFecha, MESES_FULL } from './types'
import type { Categoria } from '../../context/AppContext'
import type { Descoberta } from '../../utils/descoberta'

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
  objetivos: number[]
  sobraPrevista: number[]
  onMetaSave: (objetivos: number[]) => void
  /** A fase de observação, quando ela está valendo. Ver utils/descoberta. */
  descoberta?: Descoberta
}

export default function PlanGrade(props: Props) {
  const [modalMes, setModalMes] = useState<number | null>(null)

  const {
    anoAtual, mesAtual, dadosPrevisto, dadosAnoAnterior,
    previsto, objetivos, sobraPrevista, onMetaSave,
  } = props

  const planTotais = previsto

  // A faixa cobre a janela que fecha, nao o ano inteiro: somar de janeiro por
  // cima de meses ancorados dava quatro numeros que nao batiam entre si.
  const janela = janelaQueFecha(planTotais)

  const anoCorrente = new Date().getFullYear()

  /**
   * O que o cartão cinza diz. Só o mês OBSERVADO muda de texto: ele é o que
   * está sendo medido e o que vira o primeiro plano ao fechar. Os outros onze
   * seguem sem plano de verdade, e dizer isso neles continua sendo o certo —
   * trocar os doze de uma vez só daria a impressão de que o ano inteiro está
   * em observação.
   */
  const { descoberta: desc } = props
  const textoSemPlano = (mi: number) => {
    if (!desc?.ativa) return undefined
    if (anoAtual !== desc.mesObservado.ano || mi !== desc.mesObservado.mes) return undefined
    const faltam = desc.diasAteFechar
    return {
      titulo: 'Descobrindo',
      sub: faltam <= 0
        ? `${MESES_FULL[mi]} fecha hoje`
        : `faltam ${faltam} ${faltam === 1 ? 'dia' : 'dias'}`,
    }
  }

  const dadosAtivos = dadosPrevisto
  const bloqueado = false

  return (
    <div style={{ padding: '16px 20px' }}>
      {/* Na descoberta a faixa anual sai. Ela é a SAÍDA de um plano — sem
          plano são quatro R$ 0,00 em destaque logo abaixo de um texto que
          acabou de explicar que ainda estamos medindo. Para quem não entende
          de finanças, quatro zeros grandes não leem como "ainda não tem", leem
          como "está quebrado". A barra de ferramentas abaixo fica: ela é
          ENTRADA, e é a porta de quem já sabe os próprios números. */}
      {!desc?.ativa && (
        <PlanResumoAnual
          saldoInicial={janela.saldoInicial}
          totalReceitas={janela.receitas}
          totalDespesas={janela.despesas}
          resultado={janela.saldoFinal}
          anoAtual={anoAtual}
          mesInicio={janela.inicio}
        />
      )}

      <PlanBarraFerramentas
        mesAtual={mesAtual}
        anoAtual={anoAtual}
        dadosAtivos={dadosAtivos}
        dadosAnoAnterior={dadosAnoAnterior}
        categorias={props.categorias}
        onBulkSave={props.onBulkSave}
        objetivos={objetivos}
        sobraPrevista={sobraPrevista}
        onMetaSave={onMetaSave}
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
              semPlanoTexto={textoSemPlano(mi)}
              key={mi}
              mes={mi}
              receitas={planTotais.totalEntradas[mi]}
              despesas={planTotais.totalSaidas[mi]}
              saldoInicial={planTotais.saldoInicial[mi]}
              saldoFinal={planTotais.saldoFinal[mi]}
              isAtual={isAtual}
              isFuturo={isFuturo}
              meta={objetivos[mi]}
              saldoInicialReal={planTotais.inicialReal[mi]}
              saldoFinalReal={planTotais.finalReal[mi]}
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
          previsto={planTotais}
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
