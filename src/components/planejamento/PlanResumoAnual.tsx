import KpiCard from '../KpiCard'
import { fmt } from './types'

interface Props {
  saldoInicial: number
  totalReceitas: number
  totalDespesas: number
  resultado: number
  anoAtual: number
  onChangeAno: (delta: 1 | -1) => void
}

const NAV_BG = 'linear-gradient(135deg,#0f2878,#1e40af)'
const BTN: React.CSSProperties = {
  background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 6,
  color: '#fff', cursor: 'pointer', padding: '4px 9px', fontSize: 13, lineHeight: 1,
}

export default function PlanResumoAnual({
  saldoInicial, totalReceitas, totalDespesas, resultado, anoAtual, onChangeAno,
}: Props) {
  const anoCorrente = new Date().getFullYear()

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>

      {/* Seletor de ano */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: NAV_BG, border: '1px solid rgba(255,255,255,.15)',
        borderRadius: 10, padding: '12px 16px', gap: 6, flexShrink: 0,
      }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '.3px' }}>Ano</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={BTN} onClick={() => onChangeAno(-1)}>◄</button>
          <span style={{
            fontSize: 16, fontWeight: 800, minWidth: 44, textAlign: 'center',
            color: anoAtual === anoCorrente ? '#fde047' : '#fff',
          }}>{anoAtual}</span>
          <button style={BTN} onClick={() => onChangeAno(1)}>►</button>
        </div>
      </div>

      {/* 4 KPI tiles */}
      <KpiCard label={`Saldo inicial ${anoAtual}`} value={fmt(saldoInicial, true)} style={{ flex: 1 }} />
      <KpiCard icon="↑" label="Receitas" value={fmt(totalReceitas, true)} valueColor="#86efac" style={{ flex: 1 }} />
      <KpiCard icon="↓" label="Despesas" value={fmt(totalDespesas, true)} valueColor="#f87171" style={{ flex: 1 }} />
      <KpiCard label={`Saldo final Dez/${anoAtual}`} value={fmt(resultado, true)}
        valueColor={resultado >= 0 ? '#86efac' : '#fecaca'} style={{ flex: 1 }} />

    </div>
  )
}
