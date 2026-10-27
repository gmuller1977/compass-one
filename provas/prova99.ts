// prova99 (27/10/2026): no Lançar do celular, o crédito pede o valor TOTAL da
// compra e a quantidade de parcelas. Pedido do Guilherme: "se a divisão não
// fecha, a primeira será maior que as outras devido às decimais".
import { dividirParcelas, lancarNaFatura } from '../src/utils/lancamentoRapido'
let ok = 0, falha = 0
const t = (n: string, c: boolean) => { c ? ok++ : (falha++, console.log('FALHA', n)) }
const soma = (v: number[]) => Math.round(v.reduce((a, b) => a + b, 0) * 100) / 100

t('100 em 3×: 1ª 33,34', JSON.stringify(dividirParcelas(100, 3)) === '[33.34,33.33,33.33]')
t('90 em 3×: iguais', JSON.stringify(dividirParcelas(90, 3)) === '[30,30,30]')
t('à vista: o total', JSON.stringify(dividirParcelas(47.9, 1)) === '[47.9]')
t('0,05 em 4×: 1ª 0,02', JSON.stringify(dividirParcelas(0.05, 4)) === '[0.02,0.01,0.01,0.01]')
// A soma fecha sempre no total, inclusive no valor limite das telas.
let fecha = true, primeiraMaior = true
for (const total of [100, 1237.77, 999999.99, 0.1, 19.99, 3500]) {
  for (let n = 1; n <= 24; n++) {
    const v = dividirParcelas(total, n)
    if (v.length !== n || soma(v) !== total) fecha = false
    if (v.slice(1).some(x => x !== v[1]) || v[0] < v[n - 1]) primeiraMaior = false
  }
}
t('soma === total em 1..24×', fecha)
t('demais iguais e 1ª nunca menor', primeiraMaior)
const g = dividirParcelas(999999.99, 7)
t('999.999,99 em 7×', g[0] === 142857.15 && g[1] === 142857.14)

// Gravado na fatura: cada parcela com o seu valor, a 1ª no mês da fatura.
const cartao = { id: 'nu', diaFechamento: 22 } as any
const f = lancarNaFatura({}, {
  cartao, ano: 2026, mes: 9, dia: 10, tipoDaCategoria: 'saida',
  categoria: 'Lazer', descricao: 'Bicicleta', valorParcela: 33.33,
  valores: dividirParcelas(100, 3), parcelas: 3, baseId: 'v-1',
}) as any
const val = (k: string) => (Object.values(f[k].lancamentos)[0] as any[])[0]
t('1ª parcela 33,34 em outubro', val('nu-2026-10').valor === 33.34 && val('nu-2026-10').parcelaAtual === 1)
t('2ª e 3ª 33,33', val('nu-2026-11').valor === 33.33 && val('nu-2026-12').valor === 33.33)
// Controle: sem `valores` (o Norte), todas com valorParcela, como antes.
const sem = lancarNaFatura({}, {
  cartao, ano: 2026, mes: 9, dia: 10, tipoDaCategoria: 'saida',
  categoria: 'Lazer', descricao: 'X', valorParcela: 50, parcelas: 2, baseId: 'v-2',
}) as any
t('controle: sem valores, parcela fixa', (Object.values(sem['nu-2026-10'].lancamentos)[0] as any[])[0].valor === 50
  && (Object.values(sem['nu-2026-11'].lancamentos)[0] as any[])[0].valor === 50)

console.log(`prova99: ${ok} ok, ${falha} falhas`)
if (falha) process.exit(1)
