import type { ParteDoGrupo } from './radarCores'

const fmtK = (v: number) => (v < 0 ? '−' : '') + 'R$ ' + Math.round(Math.abs(v)).toLocaleString('pt-BR')

/**
 * Fixas e variáveis do grupo numa tabelinha com o nome de cada número:
 * Planejado · Gastou (Recebeu) · Disponível (Falta). Computador e celular usam
 * este mesmo componente.
 *
 * 21/11/2026, Guilherme: os cards "têm a informação mas precisa pensar para
 * entender". Antes eram duas colunas com o número solto ("R$ 0" e embaixo
 * "de R$ 5.000"), sem dizer qual era o gasto e qual o plano; essa versão era
 * de 02/11/2026. A régua não mudou (partesDoGrupo).
 *
 * No branco: rótulo #475569, número #0f172a, passou #b91c1c (6,47), pago
 * #15803d (5,0). Aberto (azul): branco e rótulo a 75%. A letra encolhe pela
 * largura (cqi) e cabe R$ 999.999 em cada coluna.
 */
export default function PartesDoGrupo({ partes, aberto, isEntrada = false }: {
  partes: ParteDoGrupo[]; aberto: boolean; isEntrada?: boolean
}) {
  const rotulo = aberto ? 'rgba(255,255,255,0.75)' : '#475569'
  const numero = aberto ? '#ffffff' : '#0f172a'
  const linha  = aberto ? 'rgba(255,255,255,0.18)' : '#e2e8f0'
  const cols = 'minmax(0,0.95fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.1fr)'
  const cab = { fontSize: 'min(12px, calc(100cqi / 27))', fontWeight: 700, color: rotulo, letterSpacing: '.02em',
    textTransform: 'uppercase' as const, textAlign: 'right' as const, whiteSpace: 'nowrap' as const }
  const num = { fontSize: 'min(16px, calc(100cqi / 21))', fontWeight: 700, color: numero, textAlign: 'right' as const,
    whiteSpace: 'nowrap' as const, fontVariantNumeric: 'tabular-nums' as const }
  return (
    <div style={{ containerType: 'inline-size', borderTop: `1px solid ${linha}`, paddingTop: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: cols, columnGap: 8, rowGap: 6, alignItems: 'baseline' }}>
        <span />
        <span style={cab}>Planejado</span>
        <span style={cab}>{isEntrada ? 'Recebeu' : 'Gastou'}</span>
        <span style={cab}>{isEntrada ? 'Falta' : 'Disponível'}</span>
        {partes.map(p => {
          const corEstado = aberto ? numero : p.estado === 'passou' ? '#b91c1c' : p.estado === 'pago' ? '#15803d' : numero
          const real = p.estado === 'neutro' ? p.fora : p.real
          const resto = p.prev - p.real
          const ultimo = p.estado === 'neutro' ? 'sem plano'
            : p.estado === 'pago' ? '✓ pago'
            : p.estado === 'passou' ? `passou ${fmtK(p.real - p.prev)}`
            : isEntrada ? (resto > 0.5 ? fmtK(resto) : '✓') : fmtK(Math.max(0, resto))
          return [
            <span key={p.rotulo + 'r'} style={{ fontSize: 'min(15px, calc(100cqi / 21))', fontWeight: 700, color: numero, whiteSpace: 'nowrap' }}>{p.rotulo}</span>,
            <span key={p.rotulo + 'p'} style={{ ...num, color: aberto ? numero : '#334155', fontWeight: 600 }}>{p.estado === 'neutro' ? '—' : fmtK(p.prev)}</span>,
            <span key={p.rotulo + 'g'} style={num}>{fmtK(real)}</span>,
            <span key={p.rotulo + 'd'} style={{ ...num, color: corEstado, fontWeight: 800,
              fontSize: p.estado === 'passou' ? 'min(14px, calc(100cqi / 24))' : num.fontSize }}>{ultimo}</span>,
          ]
        })}
      </div>
      {partes.some(p => p.estado !== 'neutro' && p.fora > 0.005) && (
        <div style={{ fontSize: 12, color: rotulo, marginTop: 6 }}>
          {partes.filter(p => p.estado !== 'neutro' && p.fora > 0.005).map(p => `+ ${fmtK(p.fora)} sem plano nas ${p.rotulo.toLowerCase()}`).join(' · ')}
        </div>
      )}
    </div>
  )
}
