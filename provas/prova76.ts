import { saldosDosBancos, saldosAConferir, marcarConferido, informarSaldo, chaveDoMes } from '../src/utils/conferirSaldos'
import { saldoFinalConta, saldoFinalDinheiro, type Deps } from '../src/utils/saldoConta'
let ok = 0, falha = 0
const t = (n: string, c: boolean) => { c ? ok++ : (falha++, console.log('FALHOU', n)) }
const hoje = new Date(2026, 9, 18)
const conta = (id: string, tipo: any = 'corrente') => ({ id, nome: id, banco: id, tipo, saldoInicial: 1000, cor: '', icone: '' })
const base = (ext: any): Deps => ({ extratoData: ext, faturaData: {}, contas: [conta('a'), conta('b'), conta('c', 'cartao')] as any, categorias: [], planos: {}, saldoInicialDinheiro: 0 })
const lanc = { lancamentos: { 3: [{ id: '1', tipo: 'saida', descricao: 'x', categoria: 'x', valor: 200, formaPagamento: 'pix', tipoLanc: 'variavel' }] }, saldoBanco: '' }
let d = base({ [chaveDoMes('a', 2026, 9)]: lanc })
let p = saldosAConferir(d, hoje)
t('cartao fora, duas contas', p.length === 2 && p.every(s => s.conta.tipo !== 'cartao'))
t('saldo no app = saldoFinalConta', p[0].calculado === saldoFinalConta(d.contas[0], 2026, 9, d) && p[0].calculado === 800)
// confere: so a data, numero igual
const ka = chaveDoMes('a', 2026, 9)
d = base({ [ka]: marcarConferido(lanc as any, hoje) })
t('confere tira da lista', saldosAConferir(d, hoje).map(s => s.conta.id).join() === 'b')
t('confere nao muda saldo', saldoFinalConta(d.contas[0], 2026, 9, d) === 800)
t('mesmo dia, conferida', saldosAConferir(d, hoje).every(s => s.conta.id !== 'a'))
// Desde 19/10/2026 (prova88) só pede de novo depois de um dia de movimento
// automático; aqui não há fixa automática nem fatura, então não pede.
t('no dia seguinte, sem movimento, não pede de novo', !saldosAConferir(d, new Date(2026, 9, 19)).some(s => s.conta.id === 'a'))
// conferida no mes anterior conta
d = base({ [chaveDoMes('a', 2026, 8)]: { lancamentos: {}, saldoBanco: '', saldoBancoData: '2026-10-18' } as any })
t('conferencia gravada em outro mes vale', saldosAConferir(d, hoje).every(s => s.conta.id !== 'a'))
// outro valor
d = base({ [ka]: informarSaldo(lanc as any, 'R$ 750,00', hoje) })
t('informado vira saldo do Radar', saldoFinalConta(d.contas[0], 2026, 9, d) === 750)
t('informado tira da lista', saldosAConferir(d, hoje).every(s => s.conta.id !== 'a'))
{ const a = saldosDosBancos(d, hoje).find(s => s.conta.id === 'a')!
  t('conferida segue na tela com a diferença', !a.pendente && a.informado === 750 && a.calculado === 800 && a.diferenca === -50) }
{ const d3 = base({ [ka]: marcarConferido(lanc as any, hoje) }); const a = saldosDosBancos(d3, hoje).find(s => s.conta.id === 'a')!
  t('confere: diferença zero', !a.pendente && a.informado === null && a.diferenca === 0) }
t('cartão nunca aparece', saldosDosBancos(base({}), hoje).every(s => s.conta.tipo !== 'cartao'))
// controle: sem conferencia nenhuma, todas
t('controle: sem data, todas pedem', saldosAConferir(base({}), hoje).length === 2)
// carteira (18/10/2026): so quando a pessoa usa dinheiro
t('sem dinheiro, sem carteira', saldosDosBancos(base({}), hoje).every(s => s.conta.id !== 'dinheiro'))
{ const dd = base({ 'dinheiro-2026-10': { lancamentos: { 2: [{ id: 'd1', tipo: 'saida', descricao: 'x', categoria: 'x', valor: 30, formaPagamento: 'dinheiro', tipoLanc: 'variavel' }] }, saldoBanco: '' } }); dd.saldoInicialDinheiro = 100
  const c = saldosDosBancos(dd, hoje).find(s => s.conta.id === 'dinheiro')
  t('carteira aparece com lancamento', !!c && c.pendente)
  t('carteira = saldoFinalDinheiro', !!c && c.calculado === saldoFinalDinheiro(2026, 9, dd) && c.calculado === 70)
  const dd2 = { ...dd, extratoData: { 'dinheiro-2026-10': informarSaldo(dd.extratoData['dinheiro-2026-10'] as any, 'R$ 60,00', hoje) } }
  const c2 = saldosDosBancos(dd2, hoje).find(s => s.conta.id === 'dinheiro')!
  t('carteira informada: diferenca -10 e saldo do app nao muda', !c2.pendente && Math.abs(c2.diferenca + 10) < 1e-9 && saldoFinalDinheiro(2026, 9, dd2) === 70) }
console.log(`prova76: ${ok} ok, ${falha} falhas`)
