/**
 * As cores das barras e números do Radar, e a regra que escolhe entre elas.
 * Um lugar só para o cabeçalho de grupo e a linha de categoria: os dois pintam
 * a mesma faixa, e duas cópias acabariam divergindo.
 *
 * Em cada lugar, a barra tem EXATAMENTE a cor do número — pedido do Guilherme.
 * Mas os dois lugares têm fundos diferentes, e cada fundo pede o seu tom:
 *
 * AZUL ESCURO: os cartões do topo (#0f2878 → #1e40af) e o rodapé. Medido no
 * extremo claro, #1e40af: #86efac 6,21 · #fde047 6,62; barra contra o
 * trilho escuro 8,58 / 9,14 / 8,33 (o vermelho, abaixo). No rodapé negativo
 * o fundo é vermelho (#991b1b) e o número usa #fecaca, 5,74.
 *
 *   EXCEÇÃO À REGRA, decidida pelo Guilherme em 26/09/2026: o vermelho é o
 *   #f87171, o mesmo da caixa Saídas de Lançamentos, e ele REPROVA como texto
 *   — 3,15 no azul escuro dos cartões (18px, abaixo dos 18,7px de texto
 *   grande). Ele escolheu isso sabendo, entre três caminhos: o #fecaca, que
 *   passa (4,63), lia como rosa. Não "consertar" sem falar com ele. Como
 *   barra passa: 4,36 contra o trilho escuro do cartão.
 *   Ganho: o #f87171 se separa do verde e do amarelo pelo brilho (1,97 e 2,10),
 *   o que os tons pálidos não faziam (1,03).
 *
 * CLARO: o cabeçalho de grupo, em CINZA-CLARO (#f1f5f9 → #e2e8f0), e as
 * categorias abertas, no BRANCO. Uma paleta só para os dois, com texto
 * escuro. Pedido do Guilherme: empilhados, os cabeçalhos escuros pesavam
 * demais. Passou pelo azul médio e pelo azul-claro no mesmo dia; o cinza
 * ficou porque é neutro — não puxa o tom do vermelho e do verde, e deixa
 * espaço para o tom claro de cada um se distinguir do escuro.
 * No cinza o pior caso é #e2e8f0:
 *   texto #14532d 7,39 · #18773d 4,55 · #b91c1c 5,25 · #7f1d1d 8,13 ·
 *   nome #1e3a8a 8,40 · rótulo rgba(15,23,42,.75) 7,08
 *   barra contra trilho branco 9,11 / 5,61 / 6,47 / 10,02 · borda #1e3a8a 8,40
 * No branco (categorias), sobre #f8fafc no hover: 8,71 / 5,36 / 6,18 / 9,58;
 * barra contra #e2e8f0 7,39 / 4,55 / 5,25 / 8,13; borda #64748b 4,76.
 * O cinza se separa pouco do branco das categorias (1,23), por isso o
 * cabeçalho tem borda #cbd5e1.
 */
export const RADAR_COR_AZUL = { bom: '#86efac', atencao: '#fde047', ruim: '#f87171' } as const
export const RADAR_COR_CLARO = { bom: '#14532d', atencao: '#b91c1c', ruim: '#7f1d1d' } as const
/**
 * No fundo claro, "atenção" não é amarelo: é o TOM CLARO da cor do tipo —
 * vermelho-claro para despesa chegando no limite, verde-claro para receita
 * chegando perto. Pedido do Guilherme: o amarelo-escuro que passava no fundo
 * claro era marrom, e não dizia se era despesa ou receita. Medido no cinza
 * #e2e8f0 do cabeçalho: #b91c1c 5,25 e #18773d 4,55; separados do tom escuro
 * por 1,55 e 1,62. Ver corRadarClaro.
 */
export const RADAR_ATENCAO_RECEITA_CLARO = '#18773d'

/** A cor de uma faixa no fundo claro, considerando o tipo. */
export function corRadarClaro(faixa: FaixaRadar, isEntrada: boolean): string {
  return faixa === 'atencao' && isEntrada ? RADAR_ATENCAO_RECEITA_CLARO : RADAR_COR_CLARO[faixa]
}
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
