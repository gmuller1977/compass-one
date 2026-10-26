import { aplicarRespostas, fixasDoPrimeiroAcesso, type Respostas } from '../src/utils/primeiroAcesso'
import { planoDoPrimeiroAcesso as planosDoPrimeiroAcesso } from '../src/utils/primeiroPlano'
// Desde 18/10/2026 o plano inicial são 12 meses, um plano por ano: a prova
// olha o primeiro ano, no formato antigo ({ ano, mes, plano }).
const planoDoPrimeiroAcesso = (...a: Parameters<typeof planosDoPrimeiroAcesso>) => {
  const r = planosDoPrimeiroAcesso(...a)
  return r.length ? { ano: r[0].ano, mes: r[0].mesInicio, plano: r[0].plano } : null
}
let ok = 0, falha = 0
const t = (n: string, c: boolean) => { if (c) ok++; else { falha++; console.log('FALHOU:', n) } }
const hoje = new Date(2026, 9, 18)
const r: Respostas = {
  banco: 'Caixa', saldo: 850, renda: 5800, diaRenda: 5, decimo: true, usaCartao: true, cartao: 'Nubank', vencimento: 10,
  outrosBancos: [], outrosCartoes: [],
  contas: { casa: { valor: 1650, dia: 5, forma: 'automatico' }, streaming: { valor: 55, dia: 3, forma: 'cartao' }, carro: { valor: 1180, dia: 15, forma: 'manual', faltam: 2 } },
  outrasContas: [], diaADia: { mercado: 700 }, outrosGastos: [],
  parcelas: [{ nome: 'TV', valor: 199, faltam: 9, forma: 'manual', dia: 20 }, { nome: 'Celular', valor: 150, faltam: 3, total: 10, forma: 'cartao', cartao: 'Nubank' }], meta: 300,
}
const res = aplicarRespostas({ r, nomeTitular: 'Ana', contas: [], categorias: [], planoDoAno: undefined, hoje })
const r0 = planoDoPrimeiroAcesso(res.categorias, res.plano.estimativas, hoje)!
t('dia 18: plano começa em novembro', r0.ano === 2026 && r0.mes === 10)
const p = r0.plano
const cat = (n: string) => res.categorias.find(c => c.nome === n)!
const lin = (n: string) => [...p.entradas, ...p.saidas].find(l => l.nome === n)!
const z10 = (v: number[]) => v.slice(0, 10).every(x => x === 0)
// Mês da chegada (18/10/2026, prova78): só as fixas que ainda vencem depois de
// hoje entram em outubro — a TV do dia 20; o dia a dia e o salário do dia 5, não.
t('outubro (chegada): só a fixa que vence depois de hoje', JSON.stringify([...p.entradas, ...p.saidas].filter(l => l.v[9]).map(l => [l.nome, l.v[9]])) === JSON.stringify([['TV', 199]]))
t('aluguel nov-dez', z10(lin('Aluguel / Financiamento').v) && lin('Aluguel / Financiamento').v.slice(10).every(x => x === 1650))
t('salário nov-dez', lin('Salário').v.slice(10).every(x => x === 5800))
t('13º só nov e dez', JSON.stringify(lin('13º salário').v.slice(10)) === JSON.stringify([2900, 2900]))
t('mercado repetido', lin('Mercado / Supermercado').v.slice(10).every(x => x === 700))
t('streaming marcado cartão', lin('Streaming / Assinaturas').t === 'cartao')
t('carro (faltam 2, out e nov) só em novembro', JSON.stringify(lin('Financiamento do carro').v.slice(9)) === JSON.stringify([0, 1180, 0]))
t('TV até dez', lin('TV').v.slice(10).every(x => x === 199))
t('parcela do cartão a partir do mês da fatura', JSON.stringify(lin('Compras parceladas').v.slice(9)) === JSON.stringify([0, 150, 150]))
const cats = fixasDoPrimeiroAcesso(res.categorias, res.plano.estimativas)
t('aluguel vira fixa dia 5', cats.find(c => c.id === cat('Aluguel / Financiamento').id)!.fixa === true && cats.find(c => c.id === cat('Aluguel / Financiamento').id)!.diaVencimento === 5)
t('mercado segue variável', !cats.find(c => c.id === cat('Mercado / Supermercado').id)!.fixa)
// Até o dia 5 o mês corrente é inteiro
const r3 = planoDoPrimeiroAcesso(res.categorias, res.plano.estimativas, new Date(2026, 9, 5))!
t('dia 5: começa no próprio mês', r3.mes === 9 && r3.plano.saidas.find(l => l.nome === 'Mercado / Supermercado')!.v[9] === 700)
// Dezembro pela metade: o plano é de janeiro do ano seguinte
const rDez = aplicarRespostas({ r: { ...r, parcelas: [] }, nomeTitular: '', contas: [], categorias: [], planoDoAno: undefined, hoje: new Date(2026, 11, 20) })
const pDez = planoDoPrimeiroAcesso(rDez.categorias, rDez.plano.estimativas, new Date(2026, 11, 20))!
t('dezembro pela metade: janeiro do ano seguinte', pDez.ano === 2027 && pDez.mes === 0 && pDez.plano.saidas.find(l => l.nome === 'Mercado / Supermercado')!.v.every(x => x === 700))
// controle: nada informado, nada de plano
const vazio: Respostas = { ...r, renda: 0, decimo: false, contas: {}, diaADia: {}, parcelas: [] }
const rv = aplicarRespostas({ r: vazio, nomeTitular: '', contas: [], categorias: [], planoDoAno: undefined, hoje })
t('controle: sem valores, sem plano', planoDoPrimeiroAcesso(rv.categorias, rv.plano.estimativas, hoje) === null)
console.log(`prova75: ${ok} ok, ${falha} falhas`)
