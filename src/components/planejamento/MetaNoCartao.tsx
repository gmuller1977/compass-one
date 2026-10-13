import { fmt } from './types'
import { situacaoDaMeta, type MesDoAno } from './anoDoPlano'

/**
 * A meta dentro do cartão do mês, com o aviso de se o plano (ou, no mês
 * fechado, o que foi guardado) está dentro dela. Computador e celular.
 * Cores no branco: verde #14532d (9,2), vermelho #b91c1c (6,47).
 */
export default function MetaNoCartao({ m, grande }: { m: MesDoAno; grande?: boolean }) {
  const s = situacaoDaMeta(m)
  if (!s) return null
  const cor = s.ok ? '#14532d' : '#b91c1c'
  return (
    <span style={{ marginTop: 4, padding: '6px 8px', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 1,
      background: s.ok ? '#f0fdf4' : '#fef2f2', border: `1px solid ${s.ok ? '#bbf7d0' : '#fecaca'}` }}>
      <span style={{ fontSize: grande ? 13 : 12, color: '#334155', fontVariantNumeric: 'tabular-nums' }}>
        <i aria-hidden className="ti ti-target" style={{ fontSize: grande ? 14 : 13, verticalAlign: '-2px', marginRight: 3 }} />
        Meta: guardar {fmt(m.meta, true)}
      </span>
      <span style={{ fontSize: grande ? 13 : 12, fontWeight: 700, color: cor, fontVariantNumeric: 'tabular-nums' }}>
        {s.ok ? '✓ ' : '! '}{s.texto}
      </span>
    </span>
  )
}
