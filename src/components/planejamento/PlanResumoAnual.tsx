import KpiCard from '../KpiCard'
import { fmt } from './types'

interface Props {
  saldoInicial: number
  totalReceitas: number
  totalDespesas: number
  resultado: number
  anoAtual: number
}


export default function PlanResumoAnual({
  saldoInicial, totalReceitas, totalDespesas, resultado, anoAtual,
}: Props) {

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>

      {/* 4 KPI tiles */}
      <KpiCard label={`Saldo inicial ${anoAtual}`} value={fmt(saldoInicial, true)} style={{ flex: 1 }} />
      <KpiCard icon="↑" label="Receitas" value={fmt(totalReceitas, true)} valueColor="#86efac" style={{ flex: 1 }} />
      <KpiCard icon="↓" label="Despesas" value={fmt(totalDespesas, true)} valueColor="#f87171" style={{ flex: 1 }} />
      <KpiCard label={`Saldo final Dez/${anoAtual}`} value={fmt(resultado, true)}
        valueColor={resultado >= 0 ? '#86efac' : '#fecaca'} style={{ flex: 1 }} />

    </div>
  )
}
