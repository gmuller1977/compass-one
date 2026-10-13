import PlanCelulaEditavel from './PlanCelulaEditavel'

/**
 * O campo da meta de economia de UM mês — quanto a pessoa quer guardar
 * (ganhar menos gastar) naquele mês, `objetivos[mês]`. Fica no próprio mês, no
 * modal do computador e no mês aberto do celular; o botão "Meta de economia"
 * da barra de ferramentas saiu (pedido do Guilherme em 13/10/2026).
 *
 * A célula é a de sempre (aceita conta). Mês FECHADO não muda: a meta dele é
 * a régua com que ele foi medido no gráfico. Zero apaga a meta do mês.
 */
export default function CampoMeta({ mi, anoAtual, mesAtual, objetivos, onMetaSave, grande }: {
  mi: number
  anoAtual: number
  mesAtual: number
  objetivos: number[]
  onMetaSave: (objetivos: number[]) => void
  grande?: boolean
}) {
  const anoCorrente = new Date().getFullYear()
  const fechado = anoAtual < anoCorrente || (anoAtual === anoCorrente && mi < mesAtual)
  return (
    <PlanCelulaEditavel grande={grande}
      valor={objetivos[mi] ?? 0}
      readOnly={fechado}
      motivoBloqueio="Mês fechado: a meta fica como estava quando ele foi medido"
      onSave={v => onMetaSave(Array.from({ length: 12 }, (_, i) => (i === mi ? Math.max(0, v) : objetivos[i] ?? 0)))}
    />
  )
}
