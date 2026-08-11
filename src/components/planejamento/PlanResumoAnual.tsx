import { fmt } from './types'

interface Props {
  saldoInicial: number
  totalReceitas: number
  totalDespesas: number
  resultado: number
}

export default function PlanResumoAnual({ saldoInicial, totalReceitas, totalDespesas, resultado }: Props) {
  const tiles = [
    { label: 'Saldo inicial', valor: saldoInicial, cor: 'rgba(255,255,255,.9)' },
    { label: 'Receitas', valor: totalReceitas, cor: '#86efac' },
    { label: 'Despesas', valor: totalDespesas, cor: '#fca5a5' },
    { label: 'Resultado Dez', valor: resultado, cor: resultado >= 0 ? '#86efac' : '#fca5a5' },
  ]
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
      borderRadius: 14, overflow: 'hidden', marginBottom: 16,
      background: 'linear-gradient(135deg,#0f2878,#2563eb)',
      gap: 1,
    }}>
      {tiles.map(t => (
        <div key={t.label} style={{ padding: '14px 16px' }}>
          <div style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '.4px', color: 'rgba(255,255,255,.65)', marginBottom: 4,
          }}>{t.label}</div>
          <div style={{
            fontSize: 18, fontWeight: 800, color: t.cor, fontVariantNumeric: 'tabular-nums',
          }}>{fmt(t.valor, true)}</div>
        </div>
      ))}
    </div>
  )
}
