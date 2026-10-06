/**
 * As cores das barras e números do Radar, e a regra que escolhe entre elas.
 * Um lugar só para os cartões do topo, o cabeçalho de grupo e a linha de
 * categoria: todos pintam a mesma faixa, e cópias acabariam divergindo.
 *
 * A REGRA, decidida pelo Guilherme em 26/09/2026: **verde = dentro do plano,
 * vermelho = problema.** O tom do verde diz se ainda há folga:
 *
 *   | faixa   | despesa                  | receita                 |
 *   | bom     | até 89% — sobrou folga   | 100% ou mais — recebeu  |
 *   | atencao | 90% a 100% — no limite   | 80% a 99% — quase lá    |
 *   | ruim    | acima de 100% — estourou | abaixo de 80% — faltou  |
 *
 * 100% numa despesa é VERDE: o plano foi cumprido à risca. Antes a faixa de
 * atenção era amarela (e depois vermelho-claro), e 100% saía como alerta. O
 * vermelho tinha dois sentidos — "é despesa" e "estourou" —, e agora tem um;
 * quem diz o tipo é a seta ↑/↓ antes do nome do grupo.
 *
 * Em cada lugar, barra e número têm EXATAMENTE a mesma cor — pedido dele. Mas
 * os fundos são diferentes, e cada fundo pede o seu tom.
 *
 * AZUL ESCURO: os cartões do topo (#0f2878 → #1e40af) e o rodapé. Medido no
 * extremo claro, #1e40af: #4ade80 5,01 como texto; barras contra o trilho
 * escuro #4ade80 6,92 · #bbf7d0 9,94 · #f87171 4,36. Separação pelo brilho:
 * folga × no limite 1,44; no limite × estourou 2,28. No rodapé negativo o
 * fundo é vermelho (#991b1b) e o número usa #fecaca, 5,74.
 *
 *   EXCEÇÃO À REGRA DE CONTRASTE, decidida pelo Guilherme: o vermelho é o
 *   #f87171, o mesmo da caixa Saídas de Lançamentos, e ele REPROVA como texto
 *   — 3,15 no cartão (18px, abaixo dos 18,7px de texto grande). Ele escolheu
 *   isso sabendo: o #fecaca, que passa, lia como rosa. Não "consertar" sem
 *   falar com ele. Como barra passa: 4,36.
 *
 * CLARO: o cabeçalho de grupo, em CINZA (#e6ebf1 → #d8dfe8), e as categorias
 * abertas, no BRANCO. Uma paleta só para os dois, com texto escuro. O cinza é
 * neutro — não puxa o tom do vermelho e do verde — e ficou um pouco mais escuro
 * que o primeiro (#e2e8f0) para se destacar do branco das categorias: 1,34
 * contra 1,23. Mais escuro que isso, os dois verdes se confundiriam.
 * No cinza o pior caso é o extremo escuro, #d8dfe8:
 *   texto #14532d 6,79 · #18713a 4,52 · #7f1d1d 7,46 · nome #1e3a8a 7,71 ·
 *   rótulo rgba(15,23,42,.75) 6,73 · barra verde-claro x trilho branco 6,07
 * Separação pelo brilho: verde-escuro × verde-claro 1,50; verde-claro ×
 * vermelho 1,65 — os estados vizinhos "no limite" e "estourou" se distinguem
 * também para daltonismo vermelho-verde. Verde-escuro × vermelho fica em 1,1,
 * mas são estados distantes, e o percentual escrito desempata.
 * No branco (categorias) tudo passa com folga; o menor é o verde-claro: 5,80
 * no #f8fafc do hover, e 4,92 como barra contra o trilho #e2e8f0.
 */
export const RADAR_COR_AZUL = { bom: '#4ade80', atencao: '#bbf7d0', ruim: '#f87171' } as const
export const RADAR_COR_CLARO = { bom: '#14532d', atencao: '#18713a', ruim: '#7f1d1d' } as const
export const RADAR_TRILHO_AZUL = 'rgba(15,23,42,.4)'
export const RADAR_TRILHO_BRANCO = '#e2e8f0'
export type FaixaRadar = keyof typeof RADAR_COR_AZUL

/**
 * A faixa de um percentual. Recebe o percentual JÁ ARREDONDADO, o que está
 * escrito na tela — com o exato, 89,53% aparecia "90%" numa cor e 90% de
 * verdade em outra. Os cortes são os que o app já usava; o que mudou em
 * 26/09/2026 foi a cor de cada faixa, não o corte.
 */
export function faixaRadar(percArredondado: number, isEntrada: boolean): FaixaRadar {
  if (isEntrada) return percArredondado >= 1 ? 'bom' : percArredondado >= 0.8 ? 'atencao' : 'ruim'
  if (percArredondado > 1) return 'ruim'
  if (percArredondado >= 0.9) return 'atencao'
  return 'bom'
}

/**
 * O que cada linha do Radar mostra em destaque — pedido do Guilherme em
 * 06/10/2026: "parece um monte de número, não me traz algo prático". O número
 * grande deixou de ser o realizado e passou a ser o que importa agora: quanto
 * RESTA do plano, ou quanto PASSOU. O "gastou X de Y" desce para contexto e o
 * percentual saiu — a barra já mostra a proporção.
 *
 * São os mesmos dois números que a linha de status já mostrava ("disponível" /
 * "estourou"), promovidos; nenhuma conta nova. Abaixo de meio centavo é zero.
 * Fixa paga até o previsto continua "✓ pago" (decisão de 26/09/2026); fixa
 * ainda não paga é "a pagar" (ou "a receber"), e não "resta": ela não sobra,
 * vence.
 */
export function destaqueRadar(prev: number, real: number, isEntrada: boolean,
  opts: { fixa?: boolean; fixaPaga?: boolean } = {}):
  { principal: string; contexto: string } {
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  if (prev <= 0.005 && Math.abs(real) <= 0.005) return { principal: '—', contexto: 'sem plano neste mês' }
  if (isEntrada) {
    const contexto = prev > 0.005 ? `recebeu ${fmt(real)} de ${fmt(prev)}` : `recebeu ${fmt(real)} sem plano`
    if (opts.fixa && Math.abs(real) <= 0.005 && prev > 0.005) return { principal: `a receber ${fmt(prev)}`, contexto }
    if (real - prev > 0.005) return { principal: `${fmt(real - prev)} a mais`, contexto }
    if (prev - real > 0.005) return { principal: `falta ${fmt(prev - real)}`, contexto }
    return { principal: 'recebido', contexto }
  }
  const contexto = prev > 0.005 ? `gastou ${fmt(real)} de ${fmt(prev)}` : `gastou ${fmt(real)} sem plano`
  if (opts.fixaPaga) return { principal: '✓ pago', contexto }
  if (opts.fixa && Math.abs(real) <= 0.005 && prev > 0.005) return { principal: `a pagar ${fmt(prev)}`, contexto }
  if (real - prev > 0.005) return { principal: `passou ${fmt(real - prev)}`, contexto }
  if (prev - real > 0.005) return { principal: `resta ${fmt(prev - real)}`, contexto }
  return { principal: 'usou tudo', contexto }
}

/**
 * Conta FIXA de despesa paga até o previsto — "✓ pago", decidido pelo
 * Guilherme em 26/09/2026. "Até o previsto" é o percentual ARREDONDADO, o que
 * está escrito: 460,94 de 460 aparece "100%" e conta como paga. Uma regra só,
 * para a linha da categoria e para o cabeçalho do grupo.
 */
export function ehFixaPaga(prev: number, real: number, isEntrada: boolean, fixa: boolean): boolean {
  if (isEntrada || !fixa || real <= 0) return false
  const perc = prev > 0 ? real / prev : 1
  return Math.round(perc * 100) / 100 <= 1
}

/**
 * O número principal do cabeçalho do grupo. Pedido do Guilherme em 06/10/2026:
 * o grupo dizia "usou tudo" ou "resta R$ 0,28" em cima de categorias que
 * diziam "✓ pago".
 *
 * Fixa paga entra pelo valor PAGO, não pelo previsto: a sobra de centavos
 * dela não vira "resta" (o saldo previsto já não conta nada dela), nem abate
 * o estouro de outra linha. Grupo só de fixas pagas é "✓ pago". O "gastou X
 * de Y" segue com os totais de verdade, os mesmos da barra.
 */
export function destaqueDoGrupo(
  linhas: { prev: number; real: number; fixa: boolean }[], isEntrada: boolean,
): { principal: string; contexto: string } {
  const prev = linhas.reduce((s, l) => s + l.prev, 0)
  const real = linhas.reduce((s, l) => s + l.real, 0)
  const { contexto } = destaqueRadar(prev, real, isEntrada)
  const comValor = linhas.filter(l => l.prev > 0.005 || Math.abs(l.real) > 0.005)
  const pagas = comValor.map(l => ehFixaPaga(l.prev, l.real, isEntrada, l.fixa))
  if (comValor.length > 0 && pagas.every(Boolean)) return { principal: '✓ pago', contexto }
  const prevEfetivo = comValor.reduce((s, l, i) => s + (pagas[i] ? l.real : l.prev), 0)
  return { principal: destaqueRadar(prevEfetivo, real, isEntrada).principal, contexto }
}
