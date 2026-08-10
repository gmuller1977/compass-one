import { fmt, COR } from './types'

interface Props {
  saldoInicial: number
  totalReceitas: number
  totalDespesas: number
  resultado: number
}

export default function PlanResumoAnual({ saldoInicial, totalReceitas, totalDespesas, resultado }: Props) {
  const tiles = [
    { label: 'Saldo inicial', valor: saldoInicial, cor: '#475569' },
    { label: 'Receitas', valor: totalReceitas, cor: COR.verde },
    { label: 'Despesas', valor: totalDespesas, cor: COR.vermelho },
    { label: 'Resultado em Dez', valor: resultado, cor: resultado >= 0 ? COR.verde : COR.vermelho },
  ]
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 1, background: COR.borda, borderRadius: 14, overflow: 'hidden',
      marginBottom: 16,
    }}>
      {tiles.map(t => (
        <div key={t.label} style={{ background: COR.branco, padding: '12px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: COR.textoSuave, marginBottom: 4 }}>{t.label}</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: t.cor, fontVariantNumeric: 'tabular-nums' }}>{fmt(t.valor, true)}</div>
        </div>
      ))}
    </div>
  )
}
