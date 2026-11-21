import type { BalancoDoPlano } from '../../utils/balancoDoPlano'

const fmt = (v: number) => 'R$ ' + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const ZERO = 0.005

/**
 * O total das despesas do mês, com a MESMA conta da frase do topo (21/11/2026,
 * Guilherme: a frase dizia "R$ 388 a mais" e o Total "disponível R$ 456"; "se a
 * pessoa pegar o plano menos realizado não chega no 388"). Decisão dele: a
 * fixa conta como gasta desde o dia 1, pelo planejado até ser paga. Então
 * Planejado − Gastou = Disponível ou Passou, com os números da tela.
 *
 * Só linhas com plano; o gasto sem plano vai numa nota. Computador e celular,
 * o mesmo componente. No branco: passou #b91c1c (6,47), disponível #15803d
 * (5,0), rótulo #475569. A letra encolhe pela largura (cqi) e cabe
 * R$ 999.999,99 em cada coluna.
 */
export default function TotalDasDespesas({ balanco }: { balanco: BalancoDoPlano }) {
  const b = balanco
  const passou = b.diferenca < -ZERO
  const col = (rotulo: string, valor: string, cor: string) => (
    <div style={{ display: 'grid', justifyItems: 'end', minWidth: 0 }}>
      <span style={{ fontSize: 'min(12px, calc(100cqi / 30))', fontWeight: 700, color: '#475569', letterSpacing: '.02em', textTransform: 'uppercase' }}>{rotulo}</span>
      <span style={{ fontSize: 'min(16px, calc(100cqi / 28))', fontWeight: 800, color: cor, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{valor}</span>
    </div>
  )
  return (
    <div style={{ containerType: 'inline-size', background: '#fff', borderRadius: 20, padding: '14px 16px',
      border: '1px solid var(--cx-borda)', boxShadow: '0 2px 14px rgba(15,40,120,.07)', display: 'grid', gap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', columnGap: 8, alignItems: 'end' }}>
        <span style={{ fontSize: 'min(16px, calc(100cqi / 22))', fontWeight: 800, color: '#0f172a', alignSelf: 'center' }}>Total</span>
        {col('Planejado', fmt(b.prev), '#334155')}
        {col('Gastou', fmt(b.gasto), '#0f172a')}
        {passou ? col('Passou', fmt(-b.diferenca), '#b91c1c') : col('Disponível', fmt(Math.max(0, b.diferenca)), '#15803d')}
      </div>
      <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.4 }}>
        As contas fixas que ainda não foram pagas já contam no Gastou, pelo valor planejado.
        {b.semPlano > ZERO && ` Fora da conta: ${fmt(b.semPlano)} gastos sem plano.`}
      </div>
    </div>
  )
}
