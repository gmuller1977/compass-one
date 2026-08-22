import { fmt, COR, MESES_FULL } from './types'

interface Props {
  mes: number
  receitas: number
  despesas: number
  saldoInicial: number
  saldoFinal: number
  isAtual: boolean
  isFuturo: boolean
  onClick: () => void
}

export default function PlanCardMes({
  mes, receitas, despesas, saldoInicial, saldoFinal,
  isAtual, isFuturo, onClick,
}: Props) {
  const resultado = receitas - despesas
  const percDespesas = receitas > 0 ? Math.min(100, (despesas / receitas) * 100) : 0
  const negativo = resultado < 0
  const stripColor = isAtual ? COR.azul : negativo ? COR.vermelho : COR.verde

  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 14,
        border: `${isAtual ? '2' : '1.5'}px solid ${isAtual ? COR.azul : COR.borda}`,
        background: negativo
          ? 'linear-gradient(160deg, #fff 55%, #fff5f5 100%)'
          : COR.branco,
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'box-shadow .15s, border-color .15s',
        opacity: isFuturo ? 0.7 : 1,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.boxShadow = '0 4px 16px rgba(26,86,219,.12)'
        el.style.borderColor = COR.azul
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.boxShadow = ''
        el.style.borderColor = isAtual ? COR.azul : COR.borda
      }}
    >
      {/* Strip */}
      <div style={{ height: 4, background: stripColor }} />

      <div style={{ padding: '10px 12px' }}>

        {/* 1. Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: COR.texto }}>{MESES_FULL[mes]}</span>
          {isAtual && (
            <span style={{
              fontSize: 9, fontWeight: 700, background: COR.azul, color: '#fff',
              padding: '2px 6px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '.4px',
            }}>ATUAL</span>
          )}
        </div>

        {/* 2. Saldo inicial */}
        <div style={{
          background: '#eff6ff', borderRadius: 8, padding: '5px 8px',
          marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 8, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.5px' }}>
            Saldo inicial
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: COR.azul, fontVariantNumeric: 'tabular-nums' }}>
            {fmt(saldoInicial, true)}
          </span>
        </div>

        {/* 3. KPIs Receitas / Despesas */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 7 }}>
          <div style={{
            flex: 1, background: '#f0fdf4', borderRadius: 8, padding: '5px 7px',
            border: '1px solid #bbf7d0',
          }}>
            <div style={{ fontSize: 8, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 2 }}>
              Receitas
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: COR.verde, fontVariantNumeric: 'tabular-nums' }}>
              {fmt(receitas, true)}
            </div>
          </div>
          <div style={{
            flex: 1, background: '#fef2f2', borderRadius: 8, padding: '5px 7px',
            border: '1px solid #fecaca',
          }}>
            <div style={{ fontSize: 8, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 2 }}>
              Despesas
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: COR.vermelho, fontVariantNumeric: 'tabular-nums' }}>
              {fmt(despesas, true)}
            </div>
          </div>
        </div>

        {/* 4. Resultado */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 12, marginBottom: 7,
          borderTop: `1px solid ${COR.borda}`, paddingTop: 6,
        }}>
          <span style={{ color: COR.textoSuave }}>= Resultado</span>
          <span style={{ fontWeight: 800, color: negativo ? COR.vermelho : COR.verde, fontVariantNumeric: 'tabular-nums' }}>
            {resultado >= 0 ? '+' : ''}{fmt(resultado, true)}
          </span>
        </div>

        {/* 5. Barra de progresso */}
        <div style={{ height: 4, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden', marginBottom: 3 }}>
          <div style={{
            height: '100%', width: `${percDespesas}%`,
            background: percDespesas > 85 ? COR.vermelho : percDespesas > 65 ? '#f59e0b' : COR.verde,
            borderRadius: 6, transition: 'width .3s',
          }} />
        </div>
        <div style={{ textAlign: 'right', fontSize: 9, color: COR.textoSuave, marginBottom: 7 }}>
          {Math.round(percDespesas)}% utilizado
        </div>

        {/* 6. Saldo final */}
        <div style={{
          background: saldoFinal >= 0 ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${saldoFinal >= 0 ? '#bbf7d0' : '#fecaca'}`,
          borderRadius: 8, padding: '6px 10px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 11, color: COR.textoSuave }}>Saldo final</span>
          <span style={{
            fontSize: 13, fontWeight: 700,
            color: saldoFinal >= 0 ? COR.verde : COR.vermelho,
            fontVariantNumeric: 'tabular-nums',
          }}>{fmt(saldoFinal, true)}</span>
        </div>

      </div>
    </div>
  )
}
