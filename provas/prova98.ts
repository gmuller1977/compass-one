// prova98 (26/10/2026): o Lançar do celular pergunta DÉBITO ou CRÉDITO no
// lugar do mês. Pedido do Guilherme: com o cartão já fechado a compra ia para
// dezembro e a escolha "outubro / novembro" confundia. No crédito, cada cartão
// diz a fatura em que a compra de hoje cai (o mês em que ela VENCE).
import { bancosDoDebito, cartoesDoCredito } from '../src/utils/lancarPorMes'
let ok = 0, falha = 0
const t = (n: string, c: boolean) => { c ? ok++ : (falha++, console.log('FALHA', n)) }

const hoje = new Date(2026, 9, 26)
const sic = { id: 'sic', nome: 'Sicredi', banco: 'Sicredi', tipo: 'corrente', saldoInicial: 0, cor: '', icone: '' } as any
const inv = { id: 'inv', nome: 'Cotas', banco: 'Sicredi', tipo: 'poupanca', saldoInicial: 0, cor: '', icone: '' } as any
// Aberto: fecha 30, vence 7 do mês seguinte → fatura de outubro, vence em novembro.
const aberto = { id: 'it', nome: 'Itaú', banco: 'Itaú', tipo: 'cartao', diaFechamento: 30, diaVencimento: 7, saldoInicial: 0, cor: '', icone: '' } as any
// Fechado, vence no mesmo mês do fechamento: fatura de novembro.
const nu = { id: 'nu', nome: 'Nubank', banco: 'Nubank', tipo: 'cartao', diaFechamento: 22, diaVencimento: 29, saldoInicial: 0, cor: '', icone: '' } as any
// Fechado e vence no mês seguinte: o caso do relato, dezembro.
const xp = { id: 'xp', nome: 'XP', banco: 'XP', tipo: 'cartao', diaFechamento: 20, diaVencimento: 5, saldoInicial: 0, cor: '', icone: '' } as any
const contas = [sic, inv, aberto, nu, xp]

const b = bancosDoDebito(contas)
t('débito: banco entra', b.some(c => c.id === 'sic'))
t('débito: investimento fica fora', !b.some(c => c.id === 'inv'))
t('débito: cartão fica fora', !b.some(c => c.tipo === 'cartao'))

const cc = cartoesDoCredito(contas, hoje, 'saida')
const mes = (id: string) => cc.find(c => c.cartao.id === id)?.mes
t('crédito: todos os cartões aparecem', cc.length === 3)
t('crédito: aberto cai em novembro', mes('it')?.ano === 2026 && mes('it')?.mes === 10)
t('crédito: fechado cai em novembro', mes('nu')?.mes === 10)
t('crédito: fechado e vence no mês seguinte cai em dezembro', mes('xp')?.mes === 11)
t('crédito: receita não vai para cartão', cartoesDoCredito(contas, hoje, 'entrada').length === 0)
const dez = cartoesDoCredito(contas, new Date(2026, 11, 26), 'saida').find(c => c.cartao.id === 'xp')?.mes
t('crédito: atravessa o ano (fevereiro de 2027)', dez?.ano === 2027 && dez?.mes === 1)
// Controle: no dia antes do fechamento o XP cai um mês antes.
t('controle: antes do fechamento o XP cai em novembro', cartoesDoCredito(contas, new Date(2026, 9, 19), 'saida').find(c => c.cartao.id === 'xp')?.mes.mes === 10)

console.log(`prova98: ${ok} ok, ${falha} falhas`)

