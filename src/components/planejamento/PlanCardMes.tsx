import { fmt, MESES_FULL } from './types'

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
  const semPlano = receitas === 0 && despesas === 0

  const bgCard = isAtual
    ? 'linear-gradient(145deg, #0f2878, #1a56db)'
    : 'linear-gradient(145deg, #0f172a, #1e293b)'

  const saldoFinalBg = isAtual
    ? 'rgba(255,255,255,0.15)'
    : negativo
      ? 'rgba(248,113,113,0.15)'
      : 'rgba(255,255,255,0.08)'

  const barFill = percDespesas > 85
    ? '#f87171'
    : percDespesas > 65
      ? '#fbbf24'
      : '#4ade80'

  return (
    <div
      onClick={onClick}
      title={semPlano ? 'Clique para definir valores deste mês' : undefined}
      style={{
        borderRadius: 14,
        border: isAtual ? '2px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.06)',
        background: bgCard,
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'transform .15s, box-shadow .15s, opacity .15s',
        opacity: isFuturo ? 0.7 : 1,
        boxShadow: isAtual
          ? '0 4px 16px rgba(26,86,219,0.4)'
          : '0 1px 4px rgba(0,0,0,0.3)',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = 'translateY(-2px)'
        el.style.boxShadow = isAtual
          ? '0 8px 28px rgba(26,86,219,0.5)'
          : '0 8px 24px rgba(0,0,0,0.3)'
        el.style.opacity = '1'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = ''
        el.style.boxShadow = isAtual
          ? '0 4px 16px rgba(26,86,219,0.4)'
          : '0 1px 4px rgba(0,0,0,0.3)'
        el.style.opacity = isFuturo ? '0.7' : '1'
      }}
    >
      <div style={{ padding: '12px 12px 10px' }}>

        {/* 1. Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{MESES_FULL[mes]}</span>
          {isAtual && (
            <span style={{
              fontSize: 9, fontWeight: 700, background: '#fff', color: '#1a56db',
              padding: '2px 7px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '.5px',
            }}>ATUAL</span>
          )}
        </div>

        {/* 2. Saldo inicial */}
        <div style={{
          background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '5px 8px',
          marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
            Saldo inicial
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
            {fmt(saldoInicial, true)}
          </span>
        </div>

        {/* 3. Receitas / Despesas ou "Sem plano" */}
        {semPlano ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: 48, marginBottom: 7,
            color: 'rgba(255,255,255,0.3)', fontSize: 11, fontStyle: 'italic',
          }}>
            Sem plano
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6, marginBottom: 7 }}>
            <div style={{ flex: 1, background: 'rgba(74,222,128,0.15)', borderRadius: 8, padding: '6px 8px' }}>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 3 }}>
                Receitas
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#4ade80', fontVariantNumeric: 'tabular-nums' }}>
                {fmt(receitas, true)}
              </div>
            </div>
            <div style={{ flex: 1, background: 'rgba(248,113,113,0.15)', borderRadius: 8, padding: '6px 8px' }}>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 3 }}>
                Despesas
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f87171', fontVariantNumeric: 'tabular-nums' }}>
                {fmt(despesas, true)}
              </div>
            </div>
          </div>
        )}

        {/* 4. Resultado */}
        {!semPlano && (
          <>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: 12, marginBottom: 7,
              borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 6,
            }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>= Resultado</span>
              <span style={{ fontWeight: 700, color: negativo ? '#f87171' : '#4ade80', fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>
                {resultado >= 0 ? '+' : ''}{fmt(resultado, true)}
              </span>
            </div>

            {/* 5. Barra de progresso */}
            <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 6, overflow: 'hidden', marginBottom: 3 }}>
              <div style={{
                height: '100%', width: `${percDespesas}%`,
                background: barFill,
                borderRadius: 6, transition: 'width .3s',
              }} />
            </div>
            <div style={{ textAlign: 'right', fontSize: 9, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
              {Math.round(percDespesas)}% utilizado
            </div>
          </>
        )}

        {/* 6. Saldo final */}
        <div style={{
          background: saldoFinalBg,
          borderRadius: 8, padding: '6px 10px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: semPlano ? 4 : 0,
        }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Saldo final</span>
          <span style={{
            fontSize: 13, fontWeight: 700, color: '#fff',
            fontVariantNumeric: 'tabular-nums',
          }}>{fmt(saldoFinal, true)}</span>
        </div>

      </div>
    </div>
  )
}
