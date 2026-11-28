import type { ColunaPlano } from './radarCores'

/**
 * Os números do Radar numa tabelinha com o nome de cada um (28/11/2026,
 * Guilherme): no card do grupo, Planejado · Realizado; na categoria,
 * Planejado · Realizado · A pagar (fixa) / Disponível (variável). Computador
 * e celular usam este mesmo componente. Substitui o PartesDoGrupo (fixas e
 * variáveis no card do grupo, 02 e 21/11/2026).
 *
 * No branco: rótulo #475569 (7,6), número #0f172a. No azul: branco e rótulo a
 * 75%. A letra encolhe pela largura (cqi): cabe R$ 999.999,99 por coluna.
 */
export default function TabelaPlano({ colunas, azul = false, tamanho = 16 }: {
  colunas: ColunaPlano[]; azul?: boolean; tamanho?: number
}) {
  const rotulo = azul ? 'rgba(255,255,255,0.75)' : '#475569'
  const numero = azul ? '#ffffff' : '#0f172a'
  const n = colunas.length
  return (
    <div style={{ containerType: 'inline-size' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${n}, minmax(0,1fr))`, columnGap: 10, rowGap: 2 }}>
        {colunas.map((c, i) => (
          <span key={'r' + i} style={{ fontSize: `min(11px, calc(100cqi / ${n * 9}))`, fontWeight: 700, color: rotulo,
            letterSpacing: '.03em', textTransform: 'uppercase', whiteSpace: 'nowrap', textAlign: i === 0 ? 'left' : 'right' }}>
            {c.rotulo}
          </span>
        ))}
        {colunas.map((c, i) => (
          <span key={'v' + i} style={{ fontSize: `min(${tamanho}px, calc(100cqi / ${n * 7.2}))`, fontWeight: i === n - 1 ? 800 : 600,
            color: azul ? numero : c.cor ?? numero, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
            textAlign: i === 0 ? 'left' : 'right' }}>
            {c.valor}
          </span>
        ))}
      </div>
    </div>
  )
}
