import KpiCard from '../KpiCard'
import { fmt, MESES } from './types'

interface Props {
  saldoInicial: number
  totalReceitas: number
  totalDespesas: number
  resultado: number
  anoAtual: number
  /** Primeiro mes da janela que fecha. 0 = a faixa cobre o ano inteiro. */
  mesInicio: number
}

/**
 * A faixa fecha: saldo inicial + receitas − despesas = saldo final.
 *
 * Ela cobre a JANELA que se sustenta, e nao o ano inteiro — ver
 * `janelaQueFecha`. Somando de janeiro por cima de meses ancorados, os quatro
 * numeros nao batiam, e uma faixa que nao fecha convida exatamente a pergunta
 * "por que a soma nao da?". Com ancora, os rotulos dizem de onde ela parte.
 */
export default function PlanResumoAnual({
  saldoInicial, totalReceitas, totalDespesas, resultado, anoAtual, mesInicio,
}: Props) {
  const doAno = mesInicio === 0
  const desde = doAno ? `${anoAtual}` : `${MESES[mesInicio]}/${anoAtual}`
  // Janela de um mes so (ano todo fechado) nao vira "Dez–Dez".
  const periodo = doAno ? '' : mesInicio === 11 ? ' Dez' : ` ${MESES[mesInicio]}–Dez`

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>

      {/* 4 KPI tiles */}
      <KpiCard label={`Saldo inicial ${desde}`} value={fmt(saldoInicial, true)} style={{ flex: 1 }} />
      <KpiCard icon="↑" label={`Receitas${periodo}`} value={fmt(totalReceitas, true)} valueColor="#86efac" style={{ flex: 1 }} />
      <KpiCard icon="↓" label={`Despesas${periodo}`} value={fmt(totalDespesas, true)} valueColor="#f87171" style={{ flex: 1 }} />
      <KpiCard label={`Saldo final Dez/${anoAtual}`} value={fmt(resultado, true)}
        valueColor={resultado >= 0 ? '#86efac' : '#fecaca'} style={{ flex: 1 }} />

    </div>
  )
}
