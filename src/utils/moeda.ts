/**
 * Comparação de valores monetários.
 *
 * Somar os mesmos valores em ordem diferente nem sempre dá o mesmo número em
 * ponto flutuante: 207,74 + 2.409,20 + ... fecha em 7507.41 numa ordem e em
 * 7507.409999999999 na outra. A diferença é da ordem de 1e-13 — invisível na
 * tela, mas suficiente para `=== 0` dar falso, e aí a interface exibe
 * "R$ 0,00" (às vezes "-R$ 0,00") onde deveria exibir "—".
 *
 * A deriva acumulada NÃO é problema aqui: medida na cascata de 12 meses com 53
 * categorias, ela fica em R$ 1e-10 — cerca de 43 milhões de vezes abaixo do
 * centavo. Por isso o app continua calculando em `number`, sem conversão para
 * centavos inteiros. Se um dia passar a dividir valores (rateio, parcela
 * calculada a partir do total, câmbio), essa conta muda e vale reavaliar.
 *
 * A conciliação já resolvia isso por conta própria, com `Math.abs(dif) < 0.01`.
 * Aqui a tolerância é mais apertada — meio centavo — porque a pergunta é "isso
 * é zero?", não "isso bate com o extrato?".
 */
export const ehZero = (v: number) => Math.abs(v) < 0.005
