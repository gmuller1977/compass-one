// prova109 (02/11/2026, revisão técnica): no Planejamento, toda categoria soma
// pelo próprio plano, a de cartão também. Antes, uma categoria com o nome de
// um cartão (ou "Cartão de crédito") virava "a fatura": as categorias de
// cartão saíam dos totais e o valor dela era trocado pelas compras do mês
// anterior com o sinal invertido (dava zero), e o Planejamento ficava sem os
// gastos no cartão.
import { previstoDoAno, type CtxPlano } from '../src/components/planejamento/previstoDoAno'
import type { Categoria, Conta, PlanoAnoData } from '../src/context/AppContext'

let ok = 0, falha = 0
const t = (n: string, c: boolean) => { c ? ok++ : (falha++, console.log('FALHOU', n)) }
const doze = (v: number) => new Array(12).fill(v)

const cat = (id: string, nome: string, tipo: 'entrada' | 'saida', tipoMovimento: string): Categoria => ({
  id, nome, tipo, fixa: false, tipoMovimento: tipoMovimento as Categoria['tipoMovimento'], cor: '#000', icone: '', ativa: true,
})
const contas = [
  { id: 'b1', nome: 'Sicredi', tipo: 'corrente', saldo: 0 },
  { id: 'c1', nome: 'Nubank', tipo: 'cartao', saldo: 0, diaFechamento: 22, diaVencimento: 29, contaPagamentoId: 'b1' },
] as unknown as Conta[]

// Compra de 400 na fatura de 2027 — gravada como na tela (compra = `entrada`).
const faturaData = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [
  `c1-2027-${String(i + 1).padStart(2, '0')}`, { lancamentos: { 10: [{ tipo: 'entrada', valor: 400 }] } },
]))

function cenario(comHomonima: boolean) {
  const categorias = [
    cat('r', 'Salário', 'entrada', 'banco'),
    cat('m', 'Mercado', 'saida', 'cartao'),
    cat('a', 'Aluguel', 'saida', 'banco'),
    ...(comHomonima ? [cat('n', 'Nubank', 'saida', 'cartao')] : []),
  ]
  const plano: PlanoAnoData = {
    saldoInicialJan: 0,
    entradas: [{ id: 'r', nome: 'Salário', v: doze(3000) }],
    saidas: [
      { id: 'm', nome: 'Mercado', t: 'cartao', v: doze(500) },
      { id: 'a', nome: 'Aluguel', v: doze(1000) },
      ...(comHomonima ? [{ id: 'n', nome: 'Nubank', t: 'cartao', v: doze(300) }] : []),
    ],
  }
  const deps = { extratoData: {}, faturaData, contas, categorias, planos: { 2027: plano }, saldoInicialDinheiro: 0 }
  const ctx: CtxPlano = {
    anoCorrente: 2026, mesAtual: 10, categorias, contas, faturaData, planos: { 2027: plano },
    saldoInicialFixo: 0, depsSaldo: deps as unknown as CtxPlano['depsSaldo'],
  }
  return previstoDoAno(2027, ctx)
}

const sem = cenario(false)
const com = cenario(true)
for (let i = 0; i < 12; i++) {
  t(`sem homônima, mês ${i}: despesas = 1.500 (cartão incluído)`, sem.totalSaidas[i] === 1500)
  t(`com homônima, mês ${i}: despesas = 1.800 (cartão e Nubank pelo plano)`, com.totalSaidas[i] === 1800)
  t(`com homônima, mês ${i}: receitas = 3.000`, com.totalEntradas[i] === 3000)
  t(`mês ${i}: final = inicial + receitas − despesas`,
    com.saldoFinal[i] === com.saldoInicial[i] + com.totalEntradas[i] - com.totalSaidas[i])
}
// A categoria homônima só soma o próprio plano: a diferença é exatamente ele.
t('homônima acrescenta só os 300 dela por mês', com.saldoFinal[11] === sem.saldoFinal[11] - 300 * 12)
// Controle: o cálculo antigo (cartão fora, homônima = compras do mês anterior
// com o sinal invertido, travado em zero) dava 1.000 de despesa.
const antigo = 1000 + Math.max(0, -400)
t('controle: o antigo dava 1.000, sem o cartão', antigo === 1000 && com.totalSaidas[5] !== antigo)

console.log(`prova109: ${ok} ok, ${falha} falhas`)
if (falha) process.exit(1)
