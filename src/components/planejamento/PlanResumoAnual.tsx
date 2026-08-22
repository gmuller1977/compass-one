import { fmt } from './types'

interface Props {
  saldoInicial: number
  totalReceitas: number
  totalDespesas: number
  resultado: number
  anoAtual: number
  onChangeAno: (delta: 1 | -1) => void
}

export default function PlanResumoAnual({
  saldoInicial, totalReceitas, totalDespesas, resultado, anoAtual, onChangeAno,
}: Props) {
  const anoCorrente = new Date().getFullYear()
  const tiles = [
    { label: `Saldo inicial ${anoAtual}`, valor: saldoInicial, cor: 'rgba(255,255,255,.9)' },
    { label: 'Receitas', valor: totalReceitas, cor: '#86efac' },
    { label: 'Despesas', valor: totalDespesas, cor: '#fca5a5' },
    { label: `Saldo final Dez/${anoAtual}`, valor: resultado, cor: resultado >= 0 ? '#86efac' : '#fca5a5' },
  ]

  const btnStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 6,
    color: '#fff', cursor: 'pointer', padding: '4px 9px', fontSize: 13, lineHeight: 1,
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'auto repeat(4, 1fr)',
      borderRadius: 14, overflow: 'hidden', marginBottom: 16,
      background: 'linear-gradient(135deg,#0f2878,#2563eb)',
      gap: 1,
    }}>
      {/* Seletor de ano */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '14px 20px', gap: 6,
        borderRight: '1px solid rgba(255,255,255,.1)',
      }}>
        <div style={{
          fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '.4px', color: 'rgba(255,255,255,.6)', marginBottom: 2,
        }}>Ano</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={btnStyle} onClick={() => onChangeAno(-1)}>◄</button>
          <span style={{
            fontSize: 16, fontWeight: 800, minWidth: 44, textAlign: 'center',
            color: anoAtual === anoCorrente ? '#fbbf24' : '#fff',
          }}>
            {anoAtual}
          </span>
          <button style={btnStyle} onClick={() => onChangeAno(1)}>►</button>
        </div>
      </div>

      {/* 4 cards de totais */}
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
