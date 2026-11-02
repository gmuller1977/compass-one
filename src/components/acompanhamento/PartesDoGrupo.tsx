import type { ParteDoGrupo } from './radarCores'

const fmtK = (v: number) => (v < 0 ? '−' : '') + 'R$ ' + Math.round(Math.abs(v)).toLocaleString('pt-BR')

/**
 * Fixas e variáveis do grupo, lado a lado embaixo do anel, no lugar do
 * "gastou X de Y" somado (02/11/2026, pedido do Guilherme). Computador e
 * celular usam este mesmo componente. No branco: rótulo #475569, número
 * #0f172a, passou #b91c1c (6,47), pago #15803d (5,0). Aberto (azul): branco e
 * rótulo a 75%. A letra encolhe pela largura da coluna (cqi) e cabe
 * R$ 999.999 nas duas. Uma versão com barrinha em cada coluna foi
 * mostrada e preterida (o anel já é o gráfico do grupo).
 */
export default function PartesDoGrupo({ partes, aberto }: {
  partes: ParteDoGrupo[]; aberto: boolean
}) {
  const rotulo = aberto ? 'rgba(255,255,255,0.75)' : '#475569'
  const numero = aberto ? '#ffffff' : '#0f172a'
  const linha  = aberto ? 'rgba(255,255,255,0.18)' : '#e2e8f0'
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 0,
      borderTop: `1px solid ${linha}`, paddingTop: 10 }}>
      {partes.map((p, i) => {
        const cor = aberto ? numero : p.estado === 'passou' ? '#b91c1c' : p.estado === 'pago' ? '#15803d' : numero
        const sub = p.estado === 'neutro' ? 'sem plano'
          : p.estado === 'pago' ? `pago de ${fmtK(p.prev)}`
          : p.estado === 'passou' ? `passou ${fmtK(p.real - p.prev)}`
          : `de ${fmtK(p.prev)}`
        return (
          <div key={p.rotulo} style={{ containerType: 'inline-size', minWidth: 0,
            paddingLeft: i > 0 ? 12 : 0, paddingRight: i === 0 ? 12 : 0,
            borderLeft: i > 0 ? `1px solid ${linha}` : 'none' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: rotulo, letterSpacing: '.03em', textTransform: 'uppercase' }}>
              {p.rotulo}
            </div>
            <div style={{ fontSize: 'min(16px, calc(100cqi / 8))', fontWeight: 800, color: cor, whiteSpace: 'nowrap',
              fontVariantNumeric: 'tabular-nums', lineHeight: 1.3 }}>
              {p.estado === 'pago' ? '✓ ' : ''}{fmtK(p.estado === 'neutro' ? p.fora : p.real)}
            </div>
            <div style={{ fontSize: 'min(12px, calc(100cqi / 12))', color: p.estado === 'passou' && !aberto ? '#b91c1c' : rotulo,
              whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{sub}</div>
            {p.estado !== 'neutro' && p.fora > 0.005 && (
              <div style={{ fontSize: 'min(12px, calc(100cqi / 12))', color: rotulo, whiteSpace: 'nowrap' }}>+ {fmtK(p.fora)} sem plano</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
