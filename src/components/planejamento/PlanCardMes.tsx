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

const TH = {
  past: {
    bg:           'linear-gradient(145deg, #60a5fa, #3b82f6)',
    text:         '#fff',
    label:        'rgba(255,255,255,0.6)',
    border:       '1px solid rgba(255,255,255,0.12)',
    shadow:       '0 1px 4px rgba(59,130,246,0.2)',
    shadowHover:  '0 8px 24px rgba(59,130,246,0.45)',
    recBg:        'rgba(255,255,255,0.12)',
    recText:      '#4ade80',
    despBg:       'rgba(255,255,255,0.12)',
    despText:     '#f87171',
    saldoIniBg:   'rgba(255,255,255,0.1)',
    saldoFinalBg: 'rgba(255,255,255,0.1)',
    barTrack:     'rgba(255,255,255,0.15)',
    progLabel:    'rgba(255,255,255,0.5)',
    divider:      'rgba(255,255,255,0.12)',
    semPlano:     'rgba(255,255,255,0.35)',
    resultLabel:  'rgba(255,255,255,0.6)',
    badgeBg:      'rgba(255,255,255,0.2)',
    badgeText:    '#fff',
  },
  current: {
    bg:           'linear-gradient(145deg, #1e3a8a, #0f2878)',
    text:         '#fff',
    label:        'rgba(255,255,255,0.6)',
    border:       '2px solid rgba(255,255,255,0.3)',
    shadow:       '0 4px 16px rgba(15,40,120,0.4)',
    shadowHover:  '0 8px 28px rgba(15,40,120,0.6)',
    recBg:        'rgba(255,255,255,0.15)',
    recText:      '#4ade80',
    despBg:       'rgba(255,255,255,0.15)',
    despText:     '#f87171',
    saldoIniBg:   'rgba(255,255,255,0.08)',
    saldoFinalBg: 'rgba(255,255,255,0.12)',
    barTrack:     'rgba(255,255,255,0.12)',
    progLabel:    'rgba(255,255,255,0.5)',
    divider:      'rgba(255,255,255,0.1)',
    semPlano:     'rgba(255,255,255,0.3)',
    resultLabel:  'rgba(255,255,255,0.5)',
    badgeBg:      'rgba(255,255,255,0.25)',
    badgeText:    '#fff',
  },
  future: {
    bg:           'linear-gradient(145deg, #bfdbfe, #93c5fd)',
    text:         '#1e3a8a',
    label:        'rgba(30,58,138,0.5)',
    border:       '1px solid rgba(30,58,138,0.12)',
    shadow:       '0 1px 4px rgba(30,58,138,0.1)',
    shadowHover:  '0 8px 24px rgba(30,58,138,0.3)',
    recBg:        'rgba(30,58,138,0.08)',
    recText:      '#16a34a',
    despBg:       'rgba(30,58,138,0.08)',
    despText:     '#dc2626',
    saldoIniBg:   'rgba(30,58,138,0.06)',
    saldoFinalBg: 'rgba(30,58,138,0.06)',
    barTrack:     'rgba(30,58,138,0.1)',
    progLabel:    'rgba(30,58,138,0.4)',
    divider:      'rgba(30,58,138,0.1)',
    semPlano:     'rgba(30,58,138,0.3)',
    resultLabel:  'rgba(30,58,138,0.5)',
    badgeBg:      'rgba(30,58,138,0.12)',
    badgeText:    '#1e3a8a',
  },
}

export default function PlanCardMes({
  mes, receitas, despesas, saldoInicial, saldoFinal,
  isAtual, isFuturo, onClick,
}: Props) {
  const resultado = receitas - despesas
  const percDespesas = receitas > 0 ? Math.min(100, (despesas / receitas) * 100) : 0
  const negativo = resultado < 0
  const semPlano = receitas === 0 && despesas === 0

  const theme = isAtual ? 'current' : isFuturo ? 'future' : 'past'
  const th = TH[theme]

  const saldoFinalBg   = negativo ? 'rgba(248,113,113,0.2)' : th.saldoFinalBg
  const saldoFinalText = negativo ? '#f87171' : th.text

  const barFill = percDespesas > 85 ? '#f87171' : percDespesas > 65 ? '#fbbf24' : th.recText

  return (
    <div
      onClick={onClick}
      title={semPlano ? 'Clique para definir valores deste mês' : undefined}
      style={{
        borderRadius: 14,
        border: th.border,
        background: th.bg,
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'transform .15s, box-shadow .15s',
        boxShadow: th.shadow,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = 'translateY(-2px)'
        el.style.boxShadow = th.shadowHover
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = ''
        el.style.boxShadow = th.shadow
      }}
    >
      <div style={{ padding: '12px 12px 10px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: th.text }}>{MESES_FULL[mes]}</span>
          {isAtual && (
            <span style={{
              fontSize: 9, fontWeight: 700,
              background: th.badgeBg, color: th.badgeText,
              padding: '2px 7px', borderRadius: 6,
              textTransform: 'uppercase', letterSpacing: '.5px',
            }}>ATUAL</span>
          )}
        </div>

        {/* Saldo inicial */}
        <div style={{
          background: th.saldoIniBg, borderRadius: 8, padding: '5px 8px',
          marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 8, fontWeight: 700, color: th.label, textTransform: 'uppercase', letterSpacing: '.5px' }}>
            Saldo inicial
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: th.text, fontVariantNumeric: 'tabular-nums' }}>
            {fmt(saldoInicial, true)}
          </span>
        </div>

        {/* Receitas / Despesas */}
        {semPlano ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: 48, marginBottom: 7,
            color: th.semPlano, fontSize: 11, fontStyle: 'italic',
          }}>
            Sem plano
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6, marginBottom: 7 }}>
            <div style={{ flex: 1, background: th.recBg, borderRadius: 8, padding: '6px 8px' }}>
              <div style={{ fontSize: 8, color: th.label, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 3 }}>
                Receitas
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: th.recText, fontVariantNumeric: 'tabular-nums' }}>
                {fmt(receitas, true)}
              </div>
            </div>
            <div style={{ flex: 1, background: th.despBg, borderRadius: 8, padding: '6px 8px' }}>
              <div style={{ fontSize: 8, color: th.label, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 3 }}>
                Despesas
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: th.despText, fontVariantNumeric: 'tabular-nums' }}>
                {fmt(despesas, true)}
              </div>
            </div>
          </div>
        )}

        {/* Resultado */}
        {!semPlano && (
          <>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: 12, marginBottom: 7,
              borderTop: `1px solid ${th.divider}`, paddingTop: 6,
            }}>
              <span style={{ color: th.resultLabel, fontSize: 11 }}>= Resultado</span>
              <span style={{ fontWeight: 700, color: negativo ? '#f87171' : th.recText, fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>
                {resultado >= 0 ? '+' : ''}{fmt(resultado, true)}
              </span>
            </div>

            {/* Barra de progresso */}
            <div style={{ height: 4, background: th.barTrack, borderRadius: 6, overflow: 'hidden', marginBottom: 3 }}>
              <div style={{ height: '100%', width: `${percDespesas}%`, background: barFill, borderRadius: 6, transition: 'width .3s' }} />
            </div>
            <div style={{ textAlign: 'right', fontSize: 9, color: th.progLabel, marginBottom: 8 }}>
              {Math.round(percDespesas)}% utilizado
            </div>
          </>
        )}

        {/* Saldo final */}
        <div style={{
          background: saldoFinalBg, borderRadius: 8, padding: '6px 10px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: semPlano ? 4 : 0,
        }}>
          <span style={{ fontSize: 11, color: th.label }}>Saldo final</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: saldoFinalText, fontVariantNumeric: 'tabular-nums' }}>
            {fmt(saldoFinal, true)}
          </span>
        </div>

      </div>
    </div>
  )
}
