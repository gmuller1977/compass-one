// prova123 (20/11/2026): o fechamento ajustado só num mês ("Fecha dia 20 *",
// `fechamentoOverride` na fatura) vale também no Lançar do celular. Relato do
// Guilherme: o Sicredi fechou hoje, a fatura aparecia "Fechada" e o Lançar
// seguia oferecendo a fatura de dezembro, não a de janeiro.
import { cartoesDoCredito, gastoDeHoje } from '../src/utils/lancarPorMes'
import { comFechamentoDoMes, lancarNaFatura } from '../src/utils/lancamentoRapido'
let ok = 0, falha = 0
const t = (n: string, c: boolean) => { c ? ok++ : (falha++, console.log('FALHA', n)) }

const hoje = new Date(2026, 10, 20)
// Cadastro: fecha 25, vence 5 do mês seguinte. Neste mês fechou no dia 20.
const sic = { id: 'sic', nome: 'Sicredi', banco: 'Sicredi', tipo: 'cartao', diaFechamento: 25, diaVencimento: 5, saldoInicial: 0, cor: '', icone: '' } as any
const faturas = { 'sic-2026-11': { lancamentos: {}, fechamentoOverride: 20 } }

const sem = cartoesDoCredito([sic], hoje, 'saida')
t('sem ajuste: cadastro, dezembro', sem[0].mes.ano === 2026 && sem[0].mes.mes === 11)
const com = cartoesDoCredito([sic], hoje, 'saida', faturas)
t('com ajuste: janeiro', com[0].mes.ano === 2027 && com[0].mes.mes === 0)
t('dia 19 com ajuste: dezembro', cartoesDoCredito([sic], new Date(2026, 10, 19), 'saida', faturas)[0].mes.mes === 11)
t('ajuste de outro mês não vale', cartoesDoCredito([sic], hoje, 'saida', { 'sic-2026-10': { fechamentoOverride: 20 } })[0].mes.mes === 11)
t('comFechamentoDoMes sem ajuste devolve o mesmo cartão', comFechamentoDoMes(sic, {}, 2026, 10) === sic)

// A compra vai para a fatura seguinte, como na tela da fatura.
const out = lancarNaFatura(faturas, {
  cartao: comFechamentoDoMes(sic, faturas, 2026, 10), ano: 2026, mes: 10, dia: 20,
  tipoDaCategoria: 'saida', categoria: 'Outros', descricao: 'x', valorParcela: 10, parcelas: 1, baseId: 'v-1',
} as any) as any
t('compra grava na fatura seguinte', (out['sic-2026-12']?.lancamentos?.[20] ?? []).length === 1)
t('fatura fechada não recebe', Object.keys(out['sic-2026-11'].lancamentos).length === 0)
t('gasto de hoje enxerga a compra', gastoDeHoje([sic], {}, out, hoje) === 10)

console.log(`prova123: ${ok} ok, ${falha} falhas`)
if (falha) process.exit(1)
