import { aplicarRespostas, resumoDasRespostas, fixasDoPrimeiroAcesso, estimativasDosPlanos, vaiParaPrimeiroAcesso, type Respostas } from '../src/utils/primeiroAcesso'
import { propostaDoMes, planoDaProposta, primeiroMesCompleto } from '../src/utils/primeiroPlano'
let ok = 0, falha = 0
const t = (n: string, c: boolean) => { if (c) ok++; else { falha++; console.log('FALHOU:', n) } }
const hoje = new Date(2026, 9, 17)
const r: Respostas = {
  banco: 'Caixa', saldo: 850, renda: 5800, diaRenda: 5, decimo: true, usaCartao: true, cartao: 'Nubank', vencimento: 10,
  outrosBancos: [{ banco: 'Inter', saldo: 200 }], outrosCartoes: [{ cartao: 'Itaú', vencimento: 25 }],
  contas: { casa: { valor: 1650, dia: 5, forma: 'automatico' }, luz: { valor: 180, dia: 12, forma: 'manual' }, streaming: { valor: 55, dia: 3, forma: 'cartao' }, carro: { valor: 1180, dia: 15, forma: 'dinheiro', faltam: 24 } },
  outrasContas: [{ nome: 'Condomínio', valor: 400, dia: 8, forma: 'boleto' }, { nome: '  ', valor: 10, dia: 1, forma: 'manual' }],
  diaADia: { mercado: 700, farmacia: 0 }, outrosGastos: [{ nome: 'pet', valor: 120 }],
  parcelas: [{ nome: 'TV', valor: 199, faltam: 9 }], meta: 300,
}
const res = aplicarRespostas({ r, nomeTitular: 'Rafael Souza', contas: [], categorias: [], planoDoAno: undefined, hoje })
const banco = res.contas.find(c => c.banco === 'Caixa')!
t('banco preferido com saldo', banco.preferida === true && banco.saldoInicial === 850 && banco.tipo === 'corrente')
t('outro banco', res.contas.some(c => c.banco === 'Inter' && c.saldoInicial === 200 && !c.preferida))
const cartoes = res.contas.filter(c => c.tipo === 'cartao')
t('dois cartões', cartoes.length === 2)
t('fechamento 7 dias antes', cartoes.find(c => c.banco === 'Nubank')!.diaFechamento === 3 && cartoes.find(c => c.banco === 'Itaú')!.diaFechamento === 18)
t('cartão pago pelo banco', cartoes.every(c => c.contaPagamentoId === banco.id))
const cat = (n: string) => res.categorias.find(c => c.nome === n)!
t('sugeridas ligadas', res.categorias.filter(c => !c.ativa).length === 0 && res.categorias.length >= 20)
t('nenhuma fixa ainda', res.categorias.every(c => !c.fixa))
t('aluguel automático no banco', cat('Aluguel / Financiamento').formaPagamento === 'automatico' && cat('Aluguel / Financiamento').contaDebitoId === banco.id)
t('luz pix', cat('Energia Elétrica').formaPagamento === 'pix' && cat('Energia Elétrica').tipoMovimento === 'banco')
t('streaming cartão', cat('Streaming / Assinaturas').tipoMovimento === 'cartao')
t('carro criado em dinheiro', cat('Financiamento do carro').tipoMovimento === 'dinheiro' && cat('Financiamento do carro').grupo === 'Transporte')
t('condomínio criado', !!cat('Condomínio') && cat('Condomínio').tipo === 'saida')
t('condomínio no boleto, no banco', cat('Condomínio').formaPagamento === 'boleto' && cat('Condomínio').tipoMovimento === 'banco')
t('pet casou com Pet', res.categorias.filter(c => c.nome.toLowerCase() === 'pet').length === 1)
t('salário no banco', cat('Salário').contaDebitoId === banco.id)
const est = res.plano.estimativas!
t('estimativa aluguel', est.porCategoria[cat('Aluguel / Financiamento').id].valor === 1650 && est.porCategoria[cat('Aluguel / Financiamento').id].dia === 5)
t('estimativa salário fixa', est.porCategoria[cat('Salário').id].fixa === true)
t('pet estimado', est.porCategoria[cat('Pet').id].valor === 120)
t('farmácia zero não entra', !est.porCategoria[cat('Farmácia').id])
t('meta out-dez', JSON.stringify(res.plano.objetivos) === JSON.stringify([0,0,0,0,0,0,0,0,0,300,300,300]))
t('parcelas guardadas', est.parcelas?.[1].desde === '2026-10' && est.parcelas?.[1].nome === 'TV')
// Resumo
const s = resumoDasRespostas(r)
t('resumo', s.contas === 1650 + 180 + 55 + 1180 + 400 && s.diaADia === 820 && s.parcelas === 199)
t('financiamento entra no fim, sem somar de novo', s.mesesDeParcela === 24 && s.liberado === 199 + 1180 && s.sobra === 5800 - 3465 - 820 - 199)
t('financiamento guardado como conta do mês', est.parcelas?.[0].contaDoMes === true && est.parcelas?.[0].faltam === 24 && est.parcelas?.length === 2)
const semFaltam = resumoDasRespostas({ ...r, contas: { ...r.contas, carro: { ...r.contas.carro, faltam: 0 } } })
t('controle: sem faltam o carro não conta no fim', semFaltam.mesesDeParcela === 9 && semFaltam.liberado === 199)
// Proposta usa estimativa onde não há lançamento, e real onde há
const mercado = cat('Mercado / Supermercado')
const extratoData = { [`${banco.id}-2026-10`]: { saldoBanco: '', lancamentos: { 3: [{ id: 'x', tipo: 'saida', descricao: 'm', categoria: mercado.nome, valor: 512, formaPagamento: 'debito', tipoLanc: 'variavel' }] } } } as never
const planos = { 2026: res.plano }
const p = propostaDoMes({ ano: 2026, mes: 9, extratoData, faturaData: {}, contas: res.contas, categorias: res.categorias, estimativas: estimativasDosPlanos(planos) })
const linha = (n: string) => [...p.saidas, ...p.entradas].find(l => l.nome === n)
t('real vence estimativa', linha('Mercado / Supermercado')?.valor === 512 && !linha('Mercado / Supermercado')?.estimado)
t('sem lançamento usa estimativa', linha('Aluguel / Financiamento')?.valor === 1650 && linha('Aluguel / Financiamento')?.estimado === true && linha('Aluguel / Financiamento')?.fixa === true)
t('salário estimado', linha('Salário')?.valor === 5800)
const semEst = propostaDoMes({ ano: 2026, mes: 9, extratoData, faturaData: {}, contas: res.contas, categorias: res.categorias })
t('controle: sem estimativas só o real', semEst.saidas.length === 1 && semEst.entradas.length === 0)
// Fixas ao criar o plano
const f = fixasDoPrimeiroAcesso(res.categorias, est)
t('aluguel vira fixa dia 5', f.find(c => c.id === cat('Aluguel / Financiamento').id)!.fixa && f.find(c => c.id === cat('Aluguel / Financiamento').id)!.diaVencimento === 5)
t('mercado segue variável', !f.find(c => c.id === mercado.id)!.fixa)
t('roteamento', vaiParaPrimeiroAcesso({ onboardingCompleto: false, temConta: false, membro: false, visto: false })
  && !vaiParaPrimeiroAcesso({ onboardingCompleto: false, temConta: true, membro: false, visto: false })
  && !vaiParaPrimeiroAcesso({ onboardingCompleto: false, temConta: false, membro: true, visto: false })
  && !vaiParaPrimeiroAcesso({ onboardingCompleto: false, temConta: false, membro: false, visto: true }))
// Sem cartão: "no cartão" vira pago pela pessoa
const r2 = { ...r, usaCartao: false }
const res2 = aplicarRespostas({ r: r2, nomeTitular: '', contas: [], categorias: [], planoDoAno: { saldoInicialJan: 0, entradas: [], saidas: [], objetivos: [9,9,9,9,9,9,9,9,9,9,9,9] }, hoje })
t('sem cartão, streaming no banco', res2.categorias.find(c => c.nome === 'Streaming / Assinaturas')!.tipoMovimento === 'banco' && !res2.contas.some(c => c.tipo === 'cartao'))
t('meta antiga preservada antes de outubro', res2.plano.objetivos![0] === 9 && res2.plano.objetivos![9] === 300)
t('titular vazio usa banco', res2.contas[0].nome === 'Caixa')
const dec = res.categorias.find(c => c.nome === '13º salário')!
t('13º criado como receita de Renda', !!dec && dec.tipo === 'entrada' && dec.grupo === 'Renda' && dec.contaDebitoId === banco.id)
t('13º estimado pelo salário', est.decimo?.valor === 5800 && est.decimo.categoriaId === dec.id)
// lançamento real do 13º no mês-base não vira linha mensal
const ext2 = { ...(extratoData as object), [`${banco.id}-2026-10`]: { saldoBanco: '', lancamentos: { 3: [{ id: 'x', tipo: 'saida', descricao: 'm', categoria: mercado.nome, valor: 512, formaPagamento: 'debito', tipoLanc: 'variavel' }], 20: [{ id: 'y', tipo: 'entrada', descricao: '13', categoria: '13º salário', valor: 2900, formaPagamento: 'pix', tipoLanc: 'variavel' }] } } } as never
const p2 = propostaDoMes({ ano: 2026, mes: 9, extratoData: ext2, faturaData: {}, contas: res.contas, categorias: res.categorias, estimativas: est })
t('13º fora das linhas do mês', !p2.entradas.some(l => l.nome === '13º salário') && p2.decimo?.valor === 5800)
const pl = planoDaProposta(p2, 10)
const l13 = pl.entradas.find(l => l.nome === '13º salário')!
t('13º só em nov e dez', l13.v[10] === 2900 && l13.v[11] === 2900 && l13.v.slice(0, 10).every(v => v === 0))
const pl12 = planoDaProposta(p2, 11)
t('começando em dezembro, só dezembro', pl12.entradas.find(l => l.nome === '13º salário')!.v[10] === 0 && pl12.entradas.find(l => l.nome === '13º salário')!.v[11] === 2900)
const res3 = aplicarRespostas({ r: { ...r, decimo: false }, nomeTitular: '', contas: [], categorias: [], planoDoAno: undefined, hoje })
t('controle: sem 13º, sem categoria nem estimativa', !res3.categorias.some(c => c.nome === '13º salário') && !res3.plano.estimativas!.decimo)
t('primeiroMesCompleto', primeiroMesCompleto(new Date(2026, 9, 5)).mes === 9 && primeiroMesCompleto(new Date(2026, 9, 6)).mes === 10 && primeiroMesCompleto(new Date(2026, 11, 20)).ano === 2027)

// Parcelas: cartão lançado na fatura, fora dele fixa até a última; banco e cartão escolhidos
const rP: Respostas = { ...r, outrasContas: [{ nome: 'Condomínio', valor: 400, dia: 8, forma: 'automatico', banco: 'Inter' }],
  contas: { luz: { valor: 180, dia: 12, forma: 'manual', banco: 'Inter' } },
  parcelas: [
    { nome: 'Geladeira', valor: 300, faltam: 3, total: 10, forma: 'cartao', cartao: 'Itaú' },
    { nome: 'Celular', valor: 100, faltam: 2, forma: 'cartao' },
    { nome: 'Curso', valor: 250, faltam: 4, forma: 'automatico', dia: 20, banco: 'Inter' },
  ] }
const resP = aplicarRespostas({ r: rP, nomeTitular: '', contas: [], categorias: [], planoDoAno: undefined, faturaData: { x: 1 }, hoje })
const catP = (n: string) => resP.categorias.find(c => c.nome === n)!
const inter = resP.contas.find(c => c.banco === 'Inter')!
const itau = resP.contas.find(c => c.banco === 'Itaú')!
const nubank = resP.contas.find(c => c.banco === 'Nubank')!
type L = { id: string; tipo: string; valor: number; parcelas?: number; parcelaAtual?: number; consolidado?: boolean; categoria: string }
const lancs = (k: string) => (((resP.faturas[k] as { lancamentos?: Record<number, L[]> })?.lancamentos?.[1]) ?? [])
t('fatura mantém o que já havia', (resP.faturas as Record<string, unknown>).x === 1)
// Itaú vence 25, fecha 18: hoje 17/10 entra na fatura de outubro
const g = [10, 11, 12].map(m => lancs(`${itau.id}-${m === 12 ? 2026 : 2026}-${String(m).padStart(2, '0')}`).find(l => l.categoria === 'Compras parceladas'))
t('geladeira no Itaú out, nov, dez', g.every(Boolean) && g.map(l => l!.parcelaAtual).join() === '8,9,10' && g.every(l => l!.parcelas === 10))
t('só a primeira consolidada, compra = entrada', g[0]!.consolidado === true && !g[1]!.consolidado && g.every(l => l!.tipo === 'entrada' && l!.valor === 300))
t('ids <base>-<p>', g.every(l => /-\d+$/.test(l!.id)) && g[0]!.id.endsWith('-8'))
t('nada da geladeira em janeiro', lancs(`${itau.id}-2027-01`).length === 0)
// Nubank vence 10, fecha 3: 17/10 já fechou, entra na fatura de novembro
t('celular sem cartão escolhido vai no primeiro (Nubank), fatura seguinte', lancs(`${nubank.id}-2026-11`).length === 1 && lancs(`${nubank.id}-2026-12`).length === 1 && lancs(`${nubank.id}-2026-10`).length === 0)
const estP = resP.plano.estimativas!.porCategoria
// geladeira termina dez/2026 (gasto vence 25 >= 18: mesmo mês); celular: vence 10 < fecha 3? não, fecha 3 < vence 10 → fatura nov, vence nov → até dez
t('compras parceladas até dez', estP[catP('Compras parceladas').id].ate === '2026-12' && estP[catP('Compras parceladas').id].valor === 400)
t('curso: fixa no Inter, temporária, até jan', catP('Curso').contaDebitoId === inter.id && catP('Curso').formaPagamento === 'automatico'
  && catP('Curso').recorrencia === 'temporaria' && estP[catP('Curso').id].ate === '2027-01' && estP[catP('Curso').id].fixa === true && estP[catP('Curso').id].dia === 20)
t('curso não presumido pago: nada lançado no extrato', !Object.keys(resP.faturas).some(k => k.startsWith(inter.id)))
t('luz e condomínio saem do Inter', catP('Energia Elétrica').contaDebitoId === inter.id && catP('Condomínio').contaDebitoId === inter.id)
t('sem banco escolhido, o do salário', cat('Energia Elétrica').contaDebitoId === banco.id)
// Plano corta depois do ate
const pp = planoDaProposta({ ano: 2026, mes: 10, entradas: [], saidas: [
  { id: 'a', nome: 'Curso', tipo: 'saida', valor: 250, fixa: true, ehCartao: false, ate: '2026-11' },
  { id: 'b', nome: 'Velho', tipo: 'saida', valor: 50, fixa: true, ehCartao: false, ate: '2026-10' },
  { id: 'c', nome: 'Mercado', tipo: 'saida', valor: 700, fixa: false, ehCartao: false },
], totalEntradas: 0, totalSaidas: 1000 }, 10, undefined, 2026)
t('plano corta depois da última', JSON.stringify(pp.saidas.find(l => l.nome === 'Curso')!.v.slice(9)) === '[0,250,0]')
t('linha que já terminou some', !pp.saidas.some(l => l.nome === 'Velho'))
t('sem ate segue até dezembro', pp.saidas.find(l => l.nome === 'Mercado')!.v[11] === 700)
const pp27 = planoDaProposta({ ano: 2026, mes: 11, entradas: [], saidas: [
  { id: 'a', nome: 'Curso', tipo: 'saida', valor: 250, fixa: true, ehCartao: false, ate: '2027-01' }], totalEntradas: 0, totalSaidas: 250 }, 11, undefined, 2026)
t('ate no ano seguinte não corta dezembro', pp27.saidas[0].v[11] === 250)
console.log(`prova74: ${ok} ok, ${falha} falhas`)
