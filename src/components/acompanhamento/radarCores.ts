/**
 * As cores das barras e números do Radar, e a regra que escolhe entre elas.
 * Um lugar só para o cabeçalho de grupo e a linha de categoria: os dois pintam
 * a mesma faixa, e duas cópias acabariam divergindo.
 *
 * Em cada lugar, a barra tem EXATAMENTE a cor do número — pedido do Guilherme.
 * Mas os dois lugares têm fundos diferentes, e cada fundo pede o seu tom:
 *
 * AZUL: os cartões do topo (#0f2878 → #1e40af), o rodapé, e o cabeçalho de
 * grupo, que usa o azul MÉDIO dos dias passados de Lançamentos (#1d4ed8 →
 * #1e40af) — pedido do Guilherme, para a tela pesar menos. A paleta é a
 * oficial do CLAUDE.md para fundo azul, a mesma de Lançamentos e da memória
 * de cálculo. Medido no pior caso, o extremo claro #1d4ed8:
 *   texto #86efac 4,77 · #fde047 5,08 · #fecaca 4,63 · branco 85% 5,28
 *   barra contra o trilho escuro 7,41 / 7,90 / 7,20 · borda branca 6,70
 *   Os tons anteriores (#4ade80, #fca5a5) reprovavam no azul médio: 3,85 e
 *   3,53. No rodapé negativo (#991b1b), #fecaca dá 5,74; o #fca5a5 dava 4,38.
 *
 *   EXCEÇÃO À REGRA, decidida pelo Guilherme em 26/09/2026: o vermelho é o
 *   #f87171, o mesmo da caixa Saídas de Lançamentos, e ele REPROVA como texto
 *   — 3,15 no azul escuro dos cartões (18px, abaixo dos 18,7px de texto
 *   grande) e 2,42 no azul médio dos grupos. Ele escolheu isso sabendo, entre
 *   três caminhos: o #fecaca, que passa (4,63), lia como rosa, e nenhum
 *   vermelho forte passa como texto no azul médio. Não "consertar" sem falar
 *   com ele. Como barra passa: 3,76 contra o trilho no azul médio.
 *   Ganho: o #f87171 se separa do verde e do amarelo pelo brilho (1,97 e 2,10),
 *   o que os tons pálidos não faziam (1,03).
 *
 * BRANCO, as categorias com o acordeão aberto. Os tons claros ali somem — o
 * amarelo dá 1,2:1 —, então vão os escuros da mesma cor:
 *   texto no branco / no #f8fafc: #15803d 5,02/4,79 · #a16207 4,92/4,71 ·
 *   #b91c1c 6,47/6,18 — barra contra o trilho #e2e8f0: 4,07 / 3,99 / 5,25
 *   borda #64748b 4,76. O vermelho é #b91c1c e não #dc2626: o #dc2626 tem o
 *   mesmo brilho do amarelo-mostarda (1,02), o problema do daltonismo que
 *   tirou o laranja.
 */
export const RADAR_COR_AZUL = { bom: '#86efac', atencao: '#fde047', ruim: '#f87171' } as const
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
