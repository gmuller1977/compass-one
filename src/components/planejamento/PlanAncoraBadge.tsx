import { fmt, MESES_FULL } from './types'

interface Props {
  /** Ultimo mes fechado (0-11). -1 = nenhum: tudo projetado. */
  ancoraMes: number
  anoAtual: number
  /** Saldo com que o primeiro mes aberto comeca. */
  saldoAncora: number
}

/**
 * Diz de onde vem o numero. Sem isso, meses passados passariam a mostrar
 * realizado em vez de planejado sem nenhum aviso — e um saldo baixo por
 * lancamento atrasado pareceria erro do plano.
 */
export default function PlanAncoraBadge({ ancoraMes, anoAtual, saldoAncora }: Props) {
  const nada = ancoraMes < 0
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
      background: nada ? '#f8fafc' : '#eff6ff',
      border: `1px solid ${nada ? '#e2e8f0' : '#bfdbfe'}`,
      borderRadius: 8, padding: '6px 12px', marginBottom: 10,
      fontSize: 11, color: '#334155',
    }}>
      {nada ? (
        <span>📄 Nenhum mês fechado em {anoAtual} — todos os valores são <strong>planejados</strong>.</span>
      ) : (
        <>
          <span>
            ⚓ Realizado até <strong>{MESES_FULL[ancoraMes]}</strong> ·
            saldo de <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(saldoAncora, true)}</strong>
          </span>
          <span style={{ color: '#94a3b8' }}>
            — daí em diante, planejado
          </span>
        </>
      )}
    </div>
  )
}
