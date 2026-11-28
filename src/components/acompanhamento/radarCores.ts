import { moedaNaTela } from '../../utils/valoresOcultos'
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

/**
 * Teste do LARANJA no lugar do vermelho, só no Radar (23/10/2026, pedido do
 * Guilherme: "se ficar bom mudamos nas outras telas"). As constantes acima
 * seguem com o vermelho porque Lançamentos, Planejamento e o KpiCard as leem.
 *
 * A BARRA é a mesma em todo o Radar: preenchimento claro sobre trilho
 * azul-escuro — no cartão azul o trilho translúcido de sempre, no branco
 * `RADAR_TRILHO_ESCURO`, como no topo e no Resumo do mês da Início. Contra o
 * trilho #1e3a8a: #4ade80 7,0 · #bbf7d0 9,2 · #fdba74 6,9.
 * O NÚMERO no branco não pode ser o laranja claro (1,7:1): usa `#c2410c` (5,2).
 * No azul, `#fdba74` dá 5,2 no #1e40af.
 */
// Desde 24/10/2026 o laranja é UM SÓ, #c2410c, no branco e no azul
// (Guilherme: "quero usar para tudo o #c2410c"). EXCEÇÃO À REGRA DE
// CONTRASTE decidida por ele, vendo a prévia: no azul dá 1,7:1. Os números
// de contraste acima citando #fdba74 são histórico.
export const RADAR_LARANJA = '#c2410c'
// NÚMERO no azul é sempre BRANCO (24/10/2026, Guilherme: "número branco nos
// card azul, e onde for branco usamos o verde e laranja"). No azul a cor do
// status mora só na barra; no branco, número e barra levam verde e laranja.
export const NUMERO_NO_AZUL = '#ffffff'
// "Passou" no Radar é AMARELO (24/10/2026, Guilherme: "esse amarelo, use nos
// números que estão em vermelho no radar, no gráfico que passa de 100%, onde
// está despesas"). No azul, #fde047 nas barras (passou e Despesas): 7,6 no
// #1b35c8. No branco o #fde047 dá 1,2 e some, então número, barra e borda
// usam o amarelo escuro #a16207 (4,9 no branco, 3,9 no trilho #e2e8f0).
export const RADAR_AMARELO = '#fde047'
export const RADAR_AMARELO_CLARO = '#a16207'
//
// UM verde só (24/10/2026, escolha do Guilherme no card: "verdes e laranjas
// diferentes"): o "no limite" deixou de ter tom próprio, o "resta R$ X"
// escrito já diz. Dentro do plano é verde, passou é laranja. No branco o
// número usa o tom mais vivo que passa: #15803d (5,0) e #c2410c (5,2).
export const RADAR_BARRA = { bom: '#4ade80', atencao: '#4ade80', ruim: RADAR_AMARELO } as const
export const RADAR_TEXTO_AZUL = { bom: NUMERO_NO_AZUL, atencao: NUMERO_NO_AZUL, ruim: NUMERO_NO_AZUL } as const
// "Passou" no BRANCO é o VERMELHO do grupo, #b91c1c (28/10/2026, Guilherme:
// a categoria aberta mostrava "passou" em amarelo escuro e o grupo em
// vermelho; "deve ser o mesmo vermelho do grupo"). 6,5 no branco, 5,0 no
// trilho #e2e8f0. O amarelo escuro acima segue onde não é o Radar.
export const RADAR_VERMELHO_CLARO = '#b91c1c'
export const RADAR_TEXTO_CLARO = { bom: '#15803d', atencao: '#15803d', ruim: RADAR_VERMELHO_CLARO } as const
export const RADAR_TRILHO_ESCURO = '#1e3a8a'
// A barra no BRANCO é da cor do número (24/10/2026, Guilherme: "a barra
// laranja pode ser o mesmo laranja do número"). O #c2410c no trilho
// azul-escuro daria 2,0 e reprovaria (gráfico pede 3:1), então no branco o
// trilho é claro: #15803d 4,1 e #c2410c 4,2 no #e2e8f0, com borda #64748b
// (4,8 no branco) desenhando os 100%. Barra e número, a mesma cor. No azul
// segue RADAR_BARRA, que já é a cor do número lá.
export const RADAR_BARRA_CLARO = RADAR_TEXTO_CLARO
export const RADAR_BORDA_CLARO = '#64748b'
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

/** Linha sem plano no mês: o Radar não julga (cor neutra, sem barra). */
export const semPlano = (prev: number) => prev <= 0.005

/** A cor neutra de quem não é julgado, no branco: #334155, 10,4. */
export const RADAR_COR_NEUTRA = '#334155'

/**
 * Os totais que o Radar JULGA: só as linhas com plano. O realizado das linhas
 * sem plano vem à parte, em `fora` — conta no dinheiro, não no julgamento.
 */
export function totaisJulgados(linhas: { prev: number; real: number }[]): { prev: number; real: number; fora: number } {
  let prev = 0, real = 0, fora = 0
  for (const l of linhas) {
    if (semPlano(l.prev)) fora += l.real
    else { prev += l.prev; real += l.real }
  }
  return { prev, real, fora }
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
export const SEM_MOVIMENTO = ['Sem planejamento']

export function destaqueRadar(prev: number, real: number, isEntrada: boolean,
  opts: { fixa?: boolean; fixaPaga?: boolean; naoOcorre?: boolean } = {}):
  { principal: string; contexto: string } {
  const fmt = (v: number) => moedaNaTela(v)
  // Fixa marcada "Não vai ocorrer neste mês" em Lançamentos (05/11/2026,
  // pedido do Guilherme): o plano fica à vista e a linha diz que não gastou.
  if (opts.naoOcorre && prev > 0.005 && Math.abs(real) <= 0.005)
    return { principal: 'não vai ocorrer', contexto: `plano ${fmt(prev)} neste mês` }
  // Sem plano e sem movimento: diz isso em palavras, em vez de um travessão
  // (pedido do Guilherme, 24/10/2026). Mesma cor neutra, sem barra.
  if (prev <= 0.005 && Math.abs(real) <= 0.005)
    return { principal: 'Sem planejamento', contexto: 'sem plano neste mês' }
  // Sem plano não há o que julgar: mostra só o realizado, sem "passou" nem
  // vermelho. Decisão do Guilherme em 19/10/2026 (análise da chegada v3, C2):
  // "ele não deve julgar porque não tem plano, somente mostrar o total
  // realizado". No fim do mês, o "fechou" da Início (mesQueFechou) oferece
  // esse total como plano do mês seguinte.
  // Despesa sem plano e com gasto diz "Passou do plano" (05/11/2026, pedido
  // do Guilherme), com o gasto embaixo; sem planejamento nenhum, "Sem
  // planejamento" (era "Sem lançamentos"). A cor segue neutra.
  if (semPlano(prev)) return isEntrada
    ? { principal: `recebeu ${fmt(real)}`, contexto: 'sem plano neste mês' }
    : { principal: 'Passou do plano', contexto: `gastou ${fmt(real)} · sem plano neste mês` }
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
  // "disponível" e "no limite do plano", e não "resta" / "usou tudo"
  // (21/11/2026: a palavra das outras telas, regra de 06/11/2026).
  if (prev - real > 0.005) return { principal: `disponível ${fmt(prev - real)}`, contexto }
  return { principal: 'no limite do plano', contexto }
}

/**
 * Conta FIXA de despesa paga até o previsto — "✓ pago", decidido pelo
 * Guilherme em 26/09/2026. "Até o previsto" é o percentual ARREDONDADO, o que
 * está escrito: 460,94 de 460 aparece "100%" e conta como paga. Uma regra só,
 * para a linha da categoria e para o cabeçalho do grupo.
 */
/** Fixa marcada "não ocorre neste mês" e sem nada lançado. */
function foraDoMes(l: { real: number; naoOcorre?: boolean }): boolean {
  return !!l.naoOcorre && Math.abs(l.real) <= 0.005
}

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
 * de Y" e a barra são das linhas COM plano; o gasto sem plano vai ao lado
 * ("· R$ Z sem plano") e não pesa no julgamento (C2, 19/10/2026). Os totais
 * devolvidos são os da barra.
 */
/**
 * A régua do "Gastou" nos cards, no Total e na frase do topo (21/11/2026,
 * decisão do Guilherme: "a fixa conta como gasta desde o dia 1"). Despesa
 * FIXA com plano e ainda não paga conta pelo valor planejado; paga, pelo
 * real; variável, pelo real. Fixa marcada "não vai ocorrer" sai das duas
 * colunas (plano e gasto zero). Assim Planejado − Gastou = disponível ou
 * passou, uma conta que se refaz com os números da tela.
 */
export function comGastoDaFixa<T extends { prev: number; real: number; fixa: boolean; naoOcorre?: boolean }>(
  l: T, isEntrada: boolean,
): T {
  if (isEntrada || !l.fixa || semPlano(l.prev)) return l
  if (foraDoMes(l)) return { ...l, prev: 0, real: 0 }
  if (Math.abs(l.real) <= 0.005) return { ...l, real: l.prev }
  return l
}

export function destaqueDoGrupo(
  linhas: { prev: number; real: number; fixa: boolean; naoOcorre?: boolean }[], isEntrada: boolean,
): { principal: string; contexto: string; julgado: boolean; prev: number; real: number; fora: number; pago: number; extra?: string } {
  const fmt = (v: number) => moedaNaTela(v)
  // 28/11/2026, Guilherme: "no card do grupo, usar somente o total do
  // planejamento e realizado e mostrar a diferença como a receber ou
  // disponível. Se for 100%, pago; se passou, passou R$". O realizado é só o
  // que saiu: a fixa ainda não paga não conta (antes contava pelo plano desde
  // 21/11, e "parece que já está pago"). Fixa que não ocorre no mês sai das
  // duas colunas. Grupo só de fixas pagas (ou que não ocorrem) é "✓ pago".
  const resolvida = linhas.map(l => ehFixaPaga(l.prev, l.real, isEntrada, l.fixa) || foraDoMes(l))
  const tinhaPlano = linhas.some(l => !semPlano(l.prev))
  const soResolvidas = tinhaPlano && linhas.every((l, i) => semPlano(l.prev) || resolvida[i])
  const t = totaisJulgados(linhas.map(l => foraDoMes(l) ? { prev: 0, real: 0 } : l))
  if (semPlano(t.prev) && !soResolvidas) return { ...destaqueRadar(0, t.fora, isEntrada), julgado: false, ...t, pago: t.real }
  // O gasto sem plano entra no Realizado do grupo (28/11/2026, Guilherme:
  // Finanças com 60 de 60 pagos e 40,31 sem plano dizia "✓ pago"; "passou").
  const real = t.real + t.fora
  const pago = real
  const base = `${isEntrada ? 'recebeu' : 'gastou'} ${fmt(real)} de ${fmt(t.prev)}`
  const contexto = Math.abs(t.fora) > 0.005 ? `${base} · ${fmt(t.fora)} sem plano` : base
  const r = { contexto, julgado: true, ...t, real, pago }
  // Despesa: uma conta só, no total do grupo (28/11/2026, Guilherme: "Só
  // 'Saldo do plano R$ X' = realizado menor que o planejado; 'Passou do plano
  // R$ X' = realizado maior"). Nada embaixo, sem separar linha a linha.
  if (!isEntrada) {
    if (real - t.prev > 0.005) return { principal: `Passou do plano ${fmt(real - t.prev)}`, ...r }
    if (t.prev - real > 0.005) return { principal: `Saldo do plano ${fmt(t.prev - real)}`, ...r }
    return { principal: '✓ pago', ...r }
  }
  if (soResolvidas) {
    if (!isEntrada && real - t.prev > 0.005) return { principal: `passou ${fmt(real - t.prev)}`, ...r }
    return { principal: isEntrada ? '✓ recebido' : '✓ pago', ...r }
  }
  // O que falta e o que passou, linha a linha, sem um compensar o outro
  // (28/11/2026, Guilherme: a Renda dizia "a receber R$ 903,99" com R$ 955,42
  // do 13º ainda por cair e R$ 51,43 recebidos a mais em outras linhas).
  // Fixa paga abaixo do plano não deixa "a pagar" (os centavos não são devidos);
  // o gasto sem plano soma no que passou.
  let falta = 0, passou = t.fora
  linhas.forEach((l, i) => {
    if (foraDoMes(l) || semPlano(l.prev)) return
    if (l.real - l.prev > 0.005) passou += l.real - l.prev
    else if (!resolvida[i] && l.prev - l.real > 0.005) falta += l.prev - l.real
  })
  // O número grande segue o lado do grupo inteiro (o anel e a borda dizem o
  // mesmo); embaixo, o outro lado com o valor dele. Na despesa o que falta é
  // o "saldo do plano", um termo para fixas e variáveis; na receita o que
  // entrou a mais não aparece (28/11/2026, Guilherme: "a mais não preciso
  // mostrar"; escolheu "Saldo do plano" no card).
  const aFaltar = `${isEntrada ? 'a receber' : 'saldo do plano'} ${fmt(falta)}`
  const temFalta = falta > 0.005, temPassou = !isEntrada && passou > 0.005
  if (!temFalta && !temPassou) return { principal: isEntrada ? '✓ recebido' : '✓ pago', ...r }
  if (!temPassou) return { principal: aFaltar, ...r }
  const aPassou = `passou ${fmt(passou)}`
  if (!temFalta) return { principal: aPassou, ...r }
  return real - t.prev > 0.005 ? { principal: aPassou, ...r, extra: aFaltar } : { principal: aFaltar, ...r, extra: aPassou }
}

/**
 * A terceira coluna da linha da categoria no Radar (28/11/2026, Guilherme:
 * "em cada uma delas, planejado, realizado e a pagar (fixa) ou disponível
 * (variável)"). O rótulo diz o que o número é; estado escolhe a cor.
 */
export function terceiraColuna(prev: number, real: number, isEntrada: boolean,
  opts: { fixa?: boolean; fixaPaga?: boolean; naoOcorre?: boolean } = {}):
  { rotulo: string; valor: string; estado: 'bom' | 'ruim' | 'neutro' } {
  const fmt = (v: number) => moedaNaTela(v)
  if (opts.naoOcorre && prev > 0.005 && Math.abs(real) <= 0.005) return { rotulo: 'Neste mês', valor: 'não vai ocorrer', estado: 'neutro' }
  if (semPlano(prev)) return { rotulo: 'Situação', valor: 'sem plano', estado: 'neutro' }
  if (isEntrada) {
    if (real - prev > 0.005) return { rotulo: 'A mais', valor: fmt(real - prev), estado: 'bom' }
    if (prev - real > 0.005) return { rotulo: 'A receber', valor: fmt(prev - real), estado: 'neutro' }
    return { rotulo: 'A receber', valor: '✓ recebido', estado: 'bom' }
  }
  if (opts.fixaPaga) return { rotulo: 'A pagar', valor: '✓ pago', estado: 'bom' }
  if (real - prev > 0.005) return { rotulo: 'Passou', valor: fmt(real - prev), estado: 'ruim' }
  if (opts.fixa) return { rotulo: 'A pagar', valor: fmt(prev - real), estado: 'neutro' }
  return { rotulo: 'Disponível', valor: fmt(Math.max(0, prev - real)), estado: 'bom' }
}

/**
 * O "gastou X de Y" do grupo em DUAS partes, fixas e variáveis (02/11/2026,
 * pedido do Guilherme: "usou: as duas estão somadas"). Mesmas linhas e mesma
 * régua de destaqueDoGrupo, só separadas pelo cadastro: julga só o que tem
 * plano, e o gasto sem plano vai ao lado. Parte sem linha nenhuma não vem.
 * Estado: 'pago' (todas as fixas planejadas pagas até o previsto), 'passou'
 * (despesa acima do plano), 'neutro' (sem plano na parte) ou 'ok'.
 */
/*
 * 28/11/2026 (Guilherme: "as fixas não realizadas já estão entrando como
 * gastou, parece que já está pago"): o Gastou da tabela é só o que saiu; a
 * fixa com plano e ainda não paga vai em aPagar, mostrada embaixo. Planejado
 * − Gastou − a pagar = disponível. O estado segue a régua de 21/11.
 */
export type ParteDoGrupo = {
  rotulo: 'Fixas' | 'Variáveis'; prev: number; real: number; fora: number; aPagar: number
  estado: 'ok' | 'passou' | 'pago' | 'neutro'
}
export function partesDoGrupo(
  linhas: { prev: number; real: number; fixa: boolean; naoOcorre?: boolean }[], isEntrada: boolean,
): ParteDoGrupo[] {
  return (['Fixas', 'Variáveis'] as const).flatMap(rotulo => {
    const doLadoCru = linhas.filter(l => l.fixa === (rotulo === 'Fixas'))
    const doLado = doLadoCru.map(l => comGastoDaFixa(l, isEntrada))
    if (doLado.length === 0) return []
    const t = totaisJulgados(doLado)
    const planejadas = doLadoCru.filter(l => !semPlano(l.prev))
    const estado: ParteDoGrupo['estado'] =
      !isEntrada && rotulo === 'Fixas' && planejadas.length > 0 && planejadas.every(l => ehFixaPaga(l.prev, l.real, isEntrada, true) || foraDoMes(l)) ? 'pago'
      : semPlano(t.prev) ? 'neutro'
      : !isEntrada && Math.round(t.real / t.prev * 100) / 100 > 1 ? 'passou'
      : 'ok'
    const aPagar = doLado.reduce((s, l, i) => s + (semPlano(l.prev) ? 0 : l.real - doLadoCru[i].real), 0)
    return [{ rotulo, ...t, real: t.real - aPagar, aPagar, estado }]
  })
}

/** Uma coluna da TabelaPlano (rótulo em cima, número embaixo). */
export type ColunaPlano = { rotulo: string; valor: string; cor?: string }

/** Planejado e realizado, com o rótulo de cada número (28/11/2026). */
export const colunasBase = (prev: number, real: number, isEntrada: boolean, semPlanoNoMes = false): ColunaPlano[] => [
  { rotulo: 'Planejado', valor: semPlanoNoMes ? 'sem plano' : moedaNaTela(prev) },
  { rotulo: isEntrada ? 'Recebido' : 'Realizado', valor: moedaNaTela(real) },
]

/**
 * O número grande do card do grupo em duas linhas: a frase em cima e o valor
 * embaixo (28/11/2026, Guilherme: "Passou do plano R$ 231,79" passava por
 * baixo do anel no celular; "coloque o valor embaixo"). Sem valor, só a frase.
 */
export function partesDoDestaque(principal: string): { frase: string; valor: string | null } {
  const i = principal.indexOf('R$')
  return i > 0 ? { frase: principal.slice(0, i).trim(), valor: principal.slice(i) } : { frase: principal, valor: null }
}
