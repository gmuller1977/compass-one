import { fmt, COR, MESES_FULL } from './types'

interface Props {
  mes: number
  receitas: number
  despesas: number
  saldoPrevisto: number
  isAtual: boolean
  onClick: () => void
  aba: 'meu-plano' | 'realizado'
  receitasReais?: number
  despesasReais?: number
  saldoReal?: number
  temDadosReais?: boolean
}

export default function PlanCardMes({
  mes, receitas, despesas, saldoPrevisto,
  isAtual, onClick, aba,
  receitasReais = 0, despesasReais = 0, saldoReal = 0, temDadosReais = false,
}: Props) {
  const resultado = receitas - despesas
  const percDespesas = receitas > 0 ? Math.min(100, (despesas / receitas) * 100) : 0
  const stripColor = isAtual ? COR.azul : resultado >= 0 ? COR.verde : COR.vermelho

  const showReal = aba === 'realizado' && temDadosReais
  const dispReceitas = showReal ? receitasReais : receitas
  const dispDespesas = showReal ? despesasReais : despesas
  const dispSaldo = showReal ? saldoReal : saldoPrevisto
  const dispResultado = dispReceitas - dispDespesas

  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 14,
        border: `${isAtual ? '2' : '1.5'}px solid ${isAtual ? COR.azul : COR.borda}`,
        background: COR.branco,
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'box-shadow .15s, border-color .15s',
        position: 'relative',
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
      {/* Strip colorido no topo */}
      <div style={{ height: 4, background: stripColor }} />

      <div style={{ padding: '10px 12px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: COR.texto }}>{MESES_FULL[mes]}</span>
          {isAtual && (
            <span style={{
              fontSize: 9, fontWeight: 700, background: COR.azul, color: '#fff',
              padding: '2px 6px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '.4px',
            }}>Atual</span>
          )}
        </div>

        {/* Receitas */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
          <span style={{ color: COR.textoSuave }}>Receitas</span>
          <span style={{ fontWeight: 600, color: COR.verde, fontVariantNumeric: 'tabular-nums' }}>{fmt(dispReceitas, true)}</span>
        </div>

        {/* Despesas */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
          <span style={{ color: COR.textoSuave }}>Despesas</span>
          <span style={{ fontWeight: 600, color: COR.vermelho, fontVariantNumeric: 'tabular-nums' }}>{fmt(dispDespesas, true)}</span>
        </div>

        {/* Separador + Resultado */}
        <div style={{ borderTop: `1px solid ${COR.borda}`, paddingTop: 6, marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: COR.textoSuave }}>= Resultado</span>
            <span style={{ fontWeight: 700, color: dispResultado >= 0 ? COR.verde : COR.vermelho, fontVariantNumeric: 'tabular-nums' }}>
              {dispResultado >= 0 ? '+' : ''}{fmt(dispResultado, true)}
            </span>
          </div>
        </div>

        {/* Barra de progresso despesas/receitas */}
        <div style={{ height: 4, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{
            height: '100%', width: `${percDespesas}%`,
            background: percDespesas > 85 ? COR.vermelho : percDespesas > 65 ? '#f59e0b' : COR.verde,
            borderRadius: 4, transition: 'width .3s',
          }} />
        </div>
        <div style={{ textAlign: 'right', fontSize: 10, color: COR.textoSuave, marginBottom: 6 }}>
          {Math.round(percDespesas)}% utilizado
        </div>

        {/* Saldo previsto */}
        <div style={{
          background: dispSaldo >= 0 ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${dispSaldo >= 0 ? '#bbf7d0' : '#fecaca'}`,
          borderRadius: 8, padding: '6px 10px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 11, color: COR.textoSuave }}>Saldo</span>
          <span style={{
            fontSize: 13, fontWeight: 700,
            color: dispSaldo >= 0 ? COR.verde : COR.vermelho,
            fontVariantNumeric: 'tabular-nums',
          }}>{fmt(dispSaldo, true)}</span>
        </div>
      </div>
    </div>
  )
}
