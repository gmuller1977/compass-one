/**
 * As cores das barras e números do Radar, e a regra que escolhe entre elas.
 * Um lugar só para o cabeçalho de grupo e a linha de categoria: os dois pintam
 * a mesma faixa, e duas cópias acabariam divergindo.
 *
 * Em cada lugar, a barra tem EXATAMENTE a cor do número — pedido do Guilherme.
 * Mas os dois lugares têm fundos diferentes, e cada fundo pede o seu tom:
 *
 * AZUL, o cabeçalho do grupo (#0f2878 → #1e40af). Medido no extremo claro:
 *   texto #4ade80 5,01 · #fde047 6,62 · #fca5a5 4,60
 *   barra contra o trilho escuro 6,92 / 9,14 / 6,35 · borda branca 8,72
 *   Preço aceito: verde e vermelho com quase o mesmo brilho (1,09).
 *
 * BRANCO, as categorias com o acordeão aberto. Os tons claros ali somem — o
 * amarelo dá 1,2:1 —, então vão os escuros da mesma cor:
 *   texto no branco / no #f8fafc: #15803d 5,02/4,79 · #a16207 4,92/4,71 ·
 *   #b91c1c 6,47/6,18 — barra contra o trilho #e2e8f0: 4,07 / 3,99 / 5,25
 *   borda #64748b 4,76. O vermelho é #b91c1c e não #dc2626: o #dc2626 tem o
 *   mesmo brilho do amarelo-mostarda (1,02), o problema do daltonismo que
 *   tirou o laranja.
 */
export const RADAR_COR_AZUL = { bom: '#4ade80', atencao: '#fde047', ruim: '#fca5a5' } as const
export const RADAR_COR_BRANCO = { bom: '#15803d', atencao: '#a16207', ruim: '#b91c1c' } as const
export const RADAR_TRILHO_AZUL = 'rgba(15,23,42,.4)'
export const RADAR_TRILHO_BRANCO = '#e2e8f0'
export type FaixaRadar = keyof typeof RADAR_COR_AZUL

/**
 * Receita: chegar ao planejado é bom. Despesa: passar dele é ruim. Os cortes
 * são os que o app já usava nas barras sobre azul. Vale para o cabeçalho de
 * grupo, a linha de categoria e as barrinhas dos cartões do topo — os três
 * tons de vermelho numa tela só foram o motivo de juntar tudo aqui.
 *
 * Recebe o percentual JÁ ARREDONDADO, o que está escrito na tela — com o
 * exato, 89,53% aparecia "90%" em verde, e 90% é amarelo.
 */
export function faixaRadar(percArredondado: number, isEntrada: boolean): FaixaRadar {
  if (isEntrada) return percArredondado >= 1 ? 'bom' : percArredondado >= 0.8 ? 'atencao' : 'ruim'
  if (percArredondado > 1) return 'ruim'
  if (percArredondado >= 0.9) return 'atencao'
  return 'bom'
}
