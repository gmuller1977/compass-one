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

/**
 * Texto digitado ou colado -> número. `null` quando o texto não é um valor.
 *
 * Campo vazio devolve 0, não null: em dezenas de lugares o app lê um campo em
 * branco esperando zero (saldo não informado, fatura não lançada). Só texto
 * realmente inválido devolve null.
 *
 * Três defeitos que este parser existe para resolver, todos vindos do
 * `parseFloat(...) || 0` que havia espalhado em 7 cópias diferentes:
 *
 *   "1234.56"      virava 123456   — colar de planilha multiplicava por 100
 *   "12o0"         virava 12       — parseFloat trunca no 1o caractere ruim
 *   "R$ 1.234,56"  virava 0        — colar o que a tela exibe apagava a célula
 *
 * Sobre o ponto: `1.234` é milhar (mil duzentos e trinta e quatro), que é a
 * leitura pt-BR e o que as 7 copias ja faziam. `1234.56` e decimal. A regra e
 * o formato do grupo: ponto seguido de exatamente 3 digitos, repetivel, e
 * milhar; qualquer outra coisa e decimal.
 *
 * Com ponto E virgula, o ultimo separador manda — cobre "1.234,56" (pt-BR) e
 * "1,234.56" (en-US) sem precisar adivinhar a origem.
 */
export function parseValor(s: string): number | null {
  const limpo = s.replace(/R\$/gi, '').replace(/\s/g, '')
  if (limpo === '') return 0
  if (/[^0-9.,-]/.test(limpo)) return null

  const neg = limpo.startsWith('-')
  const corpo = neg ? limpo.slice(1) : limpo
  if (corpo.includes('-')) return null

  const temVirgula = corpo.includes(',')
  const temPonto = corpo.includes('.')

  let n: string
  if (temVirgula && temPonto) {
    n = corpo.lastIndexOf(',') > corpo.lastIndexOf('.')
      ? corpo.replace(/\./g, '').replace(',', '.')   // 1.234,56
      : corpo.replace(/,/g, '')                      // 1,234.56
  } else if (temVirgula) {
    n = corpo.replace(',', '.')                      // virgula e sempre decimal
  } else if (temPonto) {
    n = /^\d{1,3}(\.\d{3})+$/.test(corpo)
      ? corpo.replace(/\./g, '')                     // 1.234 -> milhar
      : corpo                                        // 1234.56 -> decimal
  } else {
    n = corpo
  }

  // Pega o que sobrou de estranho: "1,2,3", ".", "1..2"
  if (!/^\d+(\.\d+)?$/.test(n)) return null

  const v = parseFloat(n)
  return isNaN(v) ? null : (neg ? -v : v)
}

/** Leitura tolerante: vazio ou inválido viram 0. Assinatura das 7 cópias antigas. */
export const parseBRL = (s: string): number => parseValor(s) ?? 0
