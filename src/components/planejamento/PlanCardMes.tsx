import { fmt, MESES_FULL, PREVISTO } from './types'
import { COR } from '../../utils/cores'

interface Props {
  mes: number
  receitas: number
  despesas: number
  saldoInicial: number
  saldoFinal: number
  isAtual: boolean
  isFuturo?: boolean
  /** Meta de sobra do mês. Zero ou ausente = sem meta. */
  meta?: number
  /**
   * Cada ponta tem a sua natureza: no primeiro mês aberto o saldo inicial já
   * aconteceu e o final ainda é projeção.
   */
  saldoInicialReal?: boolean
  saldoFinalReal?: boolean
  /**
   * O que o cartão cinza diz quando não há plano. Na fase de DESCOBERTA o
   * cinza deixa de significar "você não fez" e passa a significar "estamos
   * medindo" — ver [`utils/descoberta`](../../utils/descoberta.ts).
   *
   * Ausente vale "Sem Planejamento", que é o certo para um mês que
   * simplesmente não tem plano e não está sendo observado.
   */
  semPlanoTexto?: { titulo: string; sub?: string }
  onClick: () => void
}

const TH = {
  com: {
    bg:           'linear-gradient(145deg, #1e3a8a, #0f2878)',
    text:         '#fff',
    label:        'rgba(255,255,255,0.75)',
    border:       '1px solid rgba(255,255,255,0.12)',
    shadow:       '0 1px 4px rgba(15,40,120,0.25)',
    shadowHover:  '0 8px 24px rgba(15,40,120,0.5)',
    recBg:        'rgba(255,255,255,0.12)',
    recText:      '#86efac',
    despBg:       'rgba(255,255,255,0.12)',
    despText:     '#fde047',
    saldoFinalBg: 'rgba(255,255,255,0.1)',
    barTrack:     'rgba(255,255,255,0.15)',
    progLabel:    'rgba(255,255,255,0.75)',
    divider:      'rgba(255,255,255,0.1)',
    semPlano:     'rgba(255,255,255,0.35)',
    resultLabel:  'rgba(255,255,255,0.75)',
    badgeBg:      'rgba(255,255,255,0.25)',
    badgeText:    '#fff',
  },
  sem: {
    bg:           'linear-gradient(145deg, #475569, #334155)',
    text:         '#fff',
    label:        'rgba(255,255,255,0.75)',
    border:       '1px solid rgba(255,255,255,0.08)',
    shadow:       '0 1px 4px rgba(0,0,0,0.1)',
    shadowHover:  '0 8px 20px rgba(0,0,0,0.2)',
    recBg:        'rgba(255,255,255,0.08)',
    recText:      'rgba(255,255,255,0.35)',
    despBg:       'rgba(255,255,255,0.08)',
    despText:     'rgba(255,255,255,0.35)',
    saldoFinalBg: 'rgba(255,255,255,0.06)',
    barTrack:     'rgba(255,255,255,0.1)',
    progLabel:    'rgba(255,255,255,0.75)',
    divider:      'rgba(255,255,255,0.08)',
    semPlano:     'rgba(255,255,255,0.35)',
    resultLabel:  'rgba(255,255,255,0.75)',
    badgeBg:      'rgba(255,255,255,0.2)',
    badgeText:    'rgba(255,255,255,0.8)',
  },
}

export default function PlanCardMes({
  mes, receitas, despesas, saldoInicial, saldoFinal,
  isAtual, meta = 0, saldoInicialReal = false, saldoFinalReal = false,
  semPlanoTexto, onClick,
}: Props) {
  const resultado = receitas - despesas
  const percDespesas = receitas > 0 ? Math.min(100, (despesas / receitas) * 100) : 0
  const negativo = resultado < 0
  const semPlano = receitas === 0 && despesas === 0

  const th = TH[semPlano ? 'sem' : 'com']
  const border      = isAtual ? '2px solid rgba(255,255,255,0.4)' : th.border
  const shadow      = isAtual ? '0 4px 16px rgba(26,86,219,0.5)' : th.shadow
  const shadowHover = isAtual ? '0 8px 28px rgba(26,86,219,0.65)' : th.shadowHover

  // O saldo que ACONTECEU ganha cor cheia: verde no azul, vermelho no
  // vermelho. O que ainda e projecao fica contornado, com o tracejado que marca
  // estimativa no resto do app. Antes os dois eram o mesmo cinza e so o
  // italico separava — discreto demais para uma distincao que mudam a leitura
  // inteira do mes.
  //
  // sucessoTexto e erroTexto, e nao COR.verde: sobre o verde padrao o branco da
  // 3,3:1 e reprova. Estes dao 5,0:1 e 6,5:1. Pelo mesmo motivo o rotulo aqui e
  // branco puro — a 75% cairia para 3,5:1.
  const saldoFinalBg = saldoFinalReal
    ? (saldoFinal >= 0 ? COR.sucessoTexto : COR.erroTexto)
    : negativo ? 'rgba(251,191,36,0.2)'
    : 'transparent'
  const saldoFinalBorda = saldoFinalReal
    ? '1px solid transparent'
    : `1px dashed ${th.semPlano}`
  const saldoFinalText = saldoFinalReal ? '#fff'
    : negativo ? '#fde047'
    : th.text
  const saldoFinalLabel = saldoFinalReal ? '#fff' : th.label

  // A mesma regra na outra ponta. O saldo inicial nao tem o caso do ambar: ele
  // nao e o fechamento previsto do mes, e sim de onde o mes partiu.
  const saldoIniBg = saldoInicialReal
    ? (saldoInicial >= 0 ? COR.sucessoTexto : COR.erroTexto)
    : 'transparent'
  const saldoIniBorda = saldoInicialReal
    ? '1px solid transparent'
    : `1px dashed ${th.semPlano}`
  const saldoIniText = saldoInicialReal ? '#fff' : th.text
  const saldoIniLabel = saldoInicialReal ? '#fff' : th.label

  const barFill = percDespesas > 85 ? '#f87171' : percDespesas > 65 ? '#fbbf24' : '#4ade80'

  // Havendo meta, a barra mede ela: sobrar o que se planejou diz mais do que
  // "quanto da receita foi comprometida". Sem meta, segue medindo o gasto.
  const temMeta = meta > 0
  const percMeta = temMeta ? Math.max(0, Math.min(100, (resultado / meta) * 100)) : 0
  const metaFill = percMeta >= 100 ? '#4ade80' : percMeta >= 70 ? '#fbbf24' : '#f87171'

  return (
    <div
      onClick={onClick}
      title={semPlano ? 'Clique para definir valores deste mês' : undefined}
      style={{
        borderRadius: 14,
        border,
        background: th.bg,
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'transform .15s, box-shadow .15s',
        boxShadow: shadow,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = 'translateY(-2px)'
        el.style.boxShadow = shadowHover
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = ''
        el.style.boxShadow = shadow
      }}
    >
      <div style={{ padding: '12px 12px 10px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: semPlano ? 0 : 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{MESES_FULL[mes]}</span>
          {isAtual && (
            <span style={{
              fontSize: 9, fontWeight: 700,
              background: th.badgeBg, color: '#fff',
              padding: '2px 7px', borderRadius: 6,
              textTransform: 'uppercase', letterSpacing: '.5px',
            }}>ATUAL</span>
          )}
        </div>

        {semPlano ? (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 3,
            alignItems: 'center', justifyContent: 'center', textAlign: 'center',
            height: 60, color: '#fff', fontSize: 11, fontWeight: 600,
          }}>
            <span>{semPlanoTexto?.titulo ?? 'Sem Planejamento'}</span>
            {/* 0,75 sobre #475569 — o extremo MAIS CLARO do gradiente — dá
                5,12:1. Medido antes de entrar, como manda o CLAUDE.md. */}
            {semPlanoTexto?.sub && (
              <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.75)' }}>
                {semPlanoTexto.sub}
              </span>
            )}
          </div>
        ) : (
          <>
            {/* Saldo inicial */}
            <div style={{
              background: saldoIniBg, border: saldoIniBorda,
              borderRadius: 8, padding: '5px 8px',
              marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 8, fontWeight: 700, color: saldoIniLabel, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                Saldo inicial <span style={{ fontWeight: 400 }}>{saldoInicialReal ? 'real' : 'previsto'}</span>
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: saldoIniText,
                fontVariantNumeric: 'tabular-nums',
                ...(saldoInicialReal ? {} : PREVISTO) }}>
                {fmt(saldoInicial, true)}
              </span>
            </div>

            {/* Receitas / Despesas */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 7 }}>
              <div style={{ flex: 1, background: th.recBg, borderRadius: 8, padding: '6px 8px' }}>
                <div style={{ fontSize: 8, color: th.label, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 3 }}>Receitas</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: th.recText, fontVariantNumeric: 'tabular-nums' }}>{fmt(receitas, true)}</div>
              </div>
              <div style={{ flex: 1, background: th.despBg, borderRadius: 8, padding: '6px 8px' }}>
                <div style={{ fontSize: 8, color: th.label, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 3 }}>Despesas</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: th.despText, fontVariantNumeric: 'tabular-nums' }}>{fmt(despesas, true)}</div>
              </div>
            </div>

            {/* Resultado */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: 12, marginBottom: 7,
              borderTop: `1px solid ${th.divider}`, paddingTop: 6,
            }}>
              <span style={{ color: th.resultLabel, fontSize: 11 }}>= Resultado</span>
              <span style={{ fontWeight: 700, color: negativo ? '#fde047' : th.recText, fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>
                {resultado >= 0 ? '+' : ''}{fmt(resultado, true)}
              </span>
            </div>

            {/* Barra de progresso */}
            <div style={{ height: 4, background: th.barTrack, borderRadius: 6, overflow: 'hidden', marginBottom: 3 }}>
              <div style={{ height: '100%', width: `${temMeta ? percMeta : percDespesas}%`,
                background: temMeta ? metaFill : barFill, borderRadius: 6, transition: 'width .3s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between',
              fontSize: 9, color: th.progLabel, marginBottom: 8 }}>
              {temMeta ? (
                <>
                  <span>🎯 meta {fmt(meta, true)}</span>
                  <span>{Math.round(percMeta)}%</span>
                </>
              ) : (
                <span style={{ marginLeft: 'auto' }}>{Math.round(percDespesas)}% utilizado</span>
              )}
            </div>

            {/* Saldo final */}
            <div style={{
              background: saldoFinalBg, border: saldoFinalBorda,
              borderRadius: 8, padding: '6px 10px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 11, color: saldoFinalLabel }}>
                Saldo final
                {/* Hierarquia por peso, nao por opacidade: sobre o verde e o
                    vermelho, branco esmaecido nao passa como texto. */}
                <span style={{ fontSize: 9, marginLeft: 5, fontWeight: 400 }}>
                  {saldoFinalReal ? 'real' : 'previsto'}
                </span>
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: saldoFinalText,
                fontVariantNumeric: 'tabular-nums',
                ...(saldoFinalReal ? {} : PREVISTO) }}>
                {fmt(saldoFinal, true)}
              </span>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
