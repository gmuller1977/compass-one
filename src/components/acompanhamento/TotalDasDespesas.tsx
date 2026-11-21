import type { BalancoDoPlano } from '../../utils/balancoDoPlano'

const fmt = (v: number) => (v < 0 ? '−' : '') + 'R$ ' + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const ZERO = 0.005

/**
 * O total das despesas do mês, com a MESMA conta da frase do topo ("No total,
 * você está economizando / gastando R$ X a mais do que o plano"), feita com os
 * números que estão na tela (21/11/2026, Guilherme: a frase dizia "R$ 388 a
 * mais" e o Total "Disponível R$ 456"; "se a pessoa pegar o plano menos
 * realizado não chega no 388").
 *
 * Variáveis: planejado − gastou = disponível ou passou. Fixas: planejado −
 * pago = a pagar, que NÃO é sobra (a conta vai vencer), ou o quanto passou.
 * O total é o resultado das variáveis menos o que as fixas passaram. Só linhas
 * com plano; o gasto sem plano aparece ao lado, sem julgamento.
 *
 * Computador e celular, o mesmo componente. Cores no branco: passou #b91c1c
 * (6,47), disponível e pago #15803d (5,0), rótulo #475569. A letra encolhe
 * pela largura (cqi) e cabe R$ 999.999,99 em cada coluna.
 */
export default function TotalDasDespesas({ balanco, mesFechado }: { balanco: BalancoDoPlano; mesFechado: boolean }) {
  const b = balanco
  const sobraVar = b.varPrev - b.varReal
  const aPagar = b.fixasAVencer
  const temVar = b.varPrev > ZERO || b.varReal > ZERO
  const temFixa = b.fixaPrev > ZERO || b.fixaReal > ZERO
  const cols = 'minmax(0,0.9fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.15fr)'
  const cab = { fontSize: 'min(12px, calc(100cqi / 26))', fontWeight: 700, color: '#475569', letterSpacing: '.02em',
    textTransform: 'uppercase' as const, textAlign: 'right' as const, whiteSpace: 'nowrap' as const }
  const num = { fontSize: 'min(15px, calc(100cqi / 29))', fontWeight: 600, color: '#334155', textAlign: 'right' as const,
    whiteSpace: 'nowrap' as const, fontVariantNumeric: 'tabular-nums' as const }
  const rot = { fontSize: 'min(15px, calc(100cqi / 22))', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' as const }
  const res = (texto: string, cor: string) => (
    <span style={{ ...num, color: cor, fontWeight: 800, display: 'grid', justifyItems: 'end', lineHeight: 1.15 }}>
      <span style={{ fontSize: 'min(11px, calc(100cqi / 30))', fontWeight: 700 }}>{texto.split('|')[0]}</span>
      <span>{texto.split('|')[1]}</span>
    </span>
  )
  const total = b.diferenca
  return (
    <div style={{ containerType: 'inline-size', background: '#fff', borderRadius: 20, padding: '16px 16px 14px',
      border: '1px solid var(--cx-borda)', boxShadow: '0 2px 14px rgba(15,40,120,.07)', display: 'grid', gap: 10 }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Total das despesas</div>
      <div style={{ display: 'grid', gridTemplateColumns: cols, columnGap: 8, rowGap: 10, alignItems: 'center' }}>
        <span />
        <span style={cab}>Planejado</span>
        <span style={cab}>Gastou</span>
        <span />
        {temVar && <>
          <span style={rot}>Variáveis</span>
          <span style={num}>{fmt(b.varPrev)}</span>
          <span style={{ ...num, color: '#0f172a', fontWeight: 700 }}>{fmt(b.varReal)}</span>
          {sobraVar < -ZERO ? res(`passou|${fmt(-sobraVar)}`, '#b91c1c') : res(`disponível|${fmt(Math.max(0, sobraVar))}`, '#15803d')}
        </>}
        {temFixa && <>
          <span style={rot}>Fixas</span>
          <span style={num}>{fmt(b.fixaPrev)}</span>
          <span style={{ ...num, color: '#0f172a', fontWeight: 700 }}>{fmt(b.fixaReal)}</span>
          {b.fixasPassou > ZERO ? res(`passou|${fmt(b.fixasPassou)}`, '#b91c1c')
            : aPagar > ZERO ? res(`a pagar|${fmt(aPagar)}`, '#334155')
            : res('|✓ pago', '#15803d')}
        </>}
      </div>
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10, display: 'flex', justifyContent: 'space-between',
        alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>No total</span>
        <span style={{ fontSize: 'min(17px, calc(100cqi / 18))', fontWeight: 800, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
          color: total < -ZERO ? '#b91c1c' : '#15803d' }}>
          {total < -ZERO ? `passou ${fmt(-total)} do plano` : `${mesFechado ? 'economizou' : 'economizando'} ${fmt(Math.max(0, total))}`}
        </span>
      </div>
      <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.4 }}>
        {b.fixasPassou > ZERO ? 'O que passou nas variáveis e nas fixas, menos o que sobrou nas variáveis.'
          : 'É o resultado das variáveis.'}
        {aPagar > ZERO && ' O "a pagar" das fixas não é sobra: são contas que ainda vão vencer.'}
        {b.semPlano > ZERO && ` Fora do plano: ${fmt(b.semPlano)} gastos sem plano.`}
      </div>
    </div>
  )
}
