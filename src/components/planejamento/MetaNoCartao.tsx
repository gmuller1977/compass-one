import { situacaoDaMeta, type MesDoAno } from './anoDoPlano'

/**
 * O aviso da meta no cartão do mês: só se está dentro ou abaixo, sem números
 * (pedido do Guilherme em 13/10/2026: "no card deveria vir só um aviso, e
 * dentro do plano estas informações, porque é ali que muda os dados e adequa
 * o plano"). Os números ficam no mês aberto — `MetaDoPlano`. Computador e
 * celular. Cores no branco: verde #14532d (9,2), vermelho #b91c1c (6,47).
 */
export default function MetaNoCartao({ m, grande }: { m: MesDoAno; grande?: boolean }) {
  const s = situacaoDaMeta(m)
  if (!s) return null
  return (
    <span style={{ marginTop: 4, padding: '4px 8px', borderRadius: 999, alignSelf: 'flex-start',
      fontSize: grande ? 13 : 12, fontWeight: 700, color: s.ok ? '#14532d' : '#b91c1c',
      background: s.ok ? '#f0fdf4' : '#fef2f2', border: `1px solid ${s.ok ? '#bbf7d0' : '#fecaca'}` }}>
      <i aria-hidden className="ti ti-target" style={{ fontSize: grande ? 14 : 13, verticalAlign: '-2px', marginRight: 4 }} />
      {s.aviso}
    </span>
  )
}
