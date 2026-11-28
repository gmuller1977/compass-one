import { VALOR_OCULTO, valoresOcultos } from '../../utils/valoresOcultos'
import type { ParteDoGrupo } from './radarCores'

const fmtK = (v: number) => valoresOcultos() ? VALOR_OCULTO : (v < 0 ? '−' : '') + 'R$ ' + Math.round(Math.abs(v)).toLocaleString('pt-BR')

/**
 * Fixas e variáveis do grupo numa tabelinha com o nome de cada número:
 * Planejado · Gastou (Recebeu). O disponível é o número grande do card;
 * uma coluna Disponível na tabela o repetia e saiu no mesmo dia (pedido dele). Computador e celular usam
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
  const cols = 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)'
  const cab = { fontSize: 'min(12px, calc(100cqi / 22))', fontWeight: 700, color: rotulo, letterSpacing: '.02em',
    textTransform: 'uppercase' as const, textAlign: 'right' as const, whiteSpace: 'nowrap' as const }
  const num = { fontSize: 'min(16px, calc(100cqi / 17))', fontWeight: 700, color: numero, textAlign: 'right' as const,
    whiteSpace: 'nowrap' as const, fontVariantNumeric: 'tabular-nums' as const }
  return (
    <div style={{ containerType: 'inline-size', borderTop: `1px solid ${linha}`, paddingTop: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: cols, columnGap: 8, rowGap: 6, alignItems: 'start' }}>
        <span />
        <span style={cab}>Planejado</span>
        <span style={cab}>{isEntrada ? 'Recebeu' : 'Gastou'}</span>
        {partes.map(p => {
          const corEstado = aberto ? numero : p.estado === 'passou' ? '#b91c1c' : p.estado === 'pago' ? '#15803d' : numero
          const real = p.estado === 'neutro' ? p.fora : p.real
          return [
            <span key={p.rotulo + 'r'} style={{ fontSize: 'min(15px, calc(100cqi / 18))', fontWeight: 700, color: numero, whiteSpace: 'nowrap' }}>{p.rotulo}</span>,
            <span key={p.rotulo + 'p'} style={{ ...num, color: aberto ? numero : '#334155', fontWeight: 600 }}>{p.estado === 'neutro' ? 'sem plano' : fmtK(p.prev)}</span>,
            <span key={p.rotulo + 'g'} style={{ ...num, color: corEstado, fontWeight: 800 }}>
              {p.estado === 'pago' ? '✓ ' : ''}{fmtK(real)}
              {/* A fixa ainda não paga fica embaixo do Gastou, não dentro dele
                  (28/11/2026, Guilherme: "parece que já está pago"). */}
              {p.aPagar > 0.005 && (
                <span style={{ display: 'block', fontSize: 'min(12px, calc(100cqi / 24))', fontWeight: 600, color: rotulo, marginTop: 1, whiteSpace: 'normal' }}>
                  a pagar {fmtK(p.aPagar)}
                </span>
              )}
            </span>,
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
