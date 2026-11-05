// prova113 (05/11/2026): conta FIXA paga no cartão já entra lançada na fatura
// em aberto (pedido do Guilherme: "muito parecido com o débito automático do
// banco"). No dia cadastrado; sem dia, no dia seguinte ao fechamento. Uma vez
// por fatura; apagada não volta. Nenhum número da previsão muda.
import { fixasParaLancar, lancarFixaNaFatura, dataNaFatura, avisoFixaSemDia, cartaoDaFixa } from '../src/utils/fixaNoCartao'
import { saldoTotalNoFim } from '../src/utils/saldoConta'
import { construirRealizadoMes } from '../src/utils/realizadoMes'
let ok = 0, falha = 0
const t = (n: string, c: boolean) => { c ? ok++ : (falha++, console.log('FALHA', n)) }

const hoje = new Date(2026, 10, 5) // 05/11
const sic = { id: 'sic', nome: 'Sicredi', banco: 'Sicredi', tipo: 'corrente', saldoInicial: 1000, preferida: true, cor: '', icone: '' } as any
// Fecha dia 22, vence dia 1º do mês seguinte: a fatura de nov (chave 11) fecha 22/11.
const nub = { id: 'nub', nome: 'Nubank', banco: 'Nubank', tipo: 'cartao', saldoInicial: 0, diaFechamento: 22, diaVencimento: 1, contaPagamentoId: 'sic', cor: '', icone: '' } as any
const net = { id: 'net', nome: 'Netflix', tipo: 'saida', fixa: true, ativa: true, tipoMovimento: 'cartao', contaDebitoId: 'nub', diaVencimento: 10, grupo: 'Lazer', cor: '', icone: '' } as any
const spo = { id: 'spo', nome: 'Spotify', tipo: 'saida', fixa: true, ativa: true, tipoMovimento: 'cartao', contaDebitoId: 'nub', grupo: 'Lazer', cor: '', icone: '' } as any
const linha = (id: string, nome: string, v: number) => ({ id, nome, grupo: 'Lazer', t: 'cartao', v: Array(12).fill(v) })
const planos: any = { 2026: { saldoInicialJan: 0, entradas: [], saidas: [linha('net', 'Netflix', 55.9), linha('spo', 'Spotify', 21.9)] }, 2027: { saldoInicialJan: 0, entradas: [], saidas: [linha('net', 'Netflix', 55.9), linha('spo', 'Spotify', 21.9)] } }
const contas = [sic, nub], categorias = [net, spo]

const p = fixasParaLancar({ contas, categorias, planos, faturaData: {} }, hoje)
t('duas fixas para a fatura em aberto (nov)', p.length === 2 && p.every(x => x.chave === 'nub-2026-11'))
const n = p.find(x => x.cat.id === 'net')!, s = p.find(x => x.cat.id === 'spo')!
t('Netflix no dia 10/11', n.dia === 10 && n.mes === 10 && n.valor === 55.9)
t('Spotify sem dia: 23/10, dia seguinte ao fechamento', s.dia === 23 && s.mes === 9)
t('dia depois do fechamento cai no mês anterior do ciclo', (() => { const d = dataNaFatura({ diaVencimento: 25 }, nub, { ano: 2026, mes: 10 }); return d.mes === 9 && d.dia === 25 })())

let fat: any = {}
for (const x of p) fat[x.chave] = lancarFixaNaFatura(fat[x.chave], x)
const dm = fat['nub-2026-11']
t('lançadas como compra fixa com id estável', dm.lancamentos[10][0].id === 'fixa-net-2026-11' && dm.lancamentos[10][0].tipo === 'entrada' && dm.lancamentos[10][0].fixaId === 'net')
t('e com a marca', dm.fixasLancadas.net && dm.fixasLancadas.spo)
t('não lança de novo', fixasParaLancar({ contas, categorias, planos, faturaData: fat }, hoje).length === 0)

// Apagada pela pessoa: a marca segura.
const apagada = { 'nub-2026-11': { ...dm, lancamentos: { 23: dm.lancamentos[23] } } }
t('apagada não volta', fixasParaLancar({ contas, categorias, planos, faturaData: apagada }, hoje).length === 0)

// Lançada à mão: só marca, sem duplicar.
const mao = { 'nub-2026-11': { lancamentos: { 8: [{ id: 'v-1', tipo: 'entrada', categoria: 'Netflix', valor: 55.9 }] }, faturaAtual: '' } }
const pm = fixasParaLancar({ contas, categorias, planos, faturaData: mao }, hoje).find(x => x.cat.id === 'net')!
t('lançada à mão só marca', pm.soMarcar && lancarFixaNaFatura(mao['nub-2026-11'] as any, pm).lancamentos[8].length === 1)

// O realizado de dezembro (vence 01/12) recebe as duas; o saldo previsto não muda.
const deps = (faturaData: any) => ({ extratoData: {}, faturaData, contas, categorias, planos, saldoInicialDinheiro: 0 } as any)
const real = construirRealizadoMes({ ano: 2026, mes: 11, extratoData: {}, faturaData: fat, contas, categorias, planoAno: planos[2026] })
const tot = Object.values(real.saidasMap).reduce((a, c: any) => a + c.total, 0)
t('o realizado de dezembro tem as duas', Math.abs(tot - 77.8) < 1e-9)
for (const m of [10, 11]) {
  const antes = saldoTotalNoFim(2026, m, deps({}), { comoAbertura: true, hoje }).valor
  const depois = saldoTotalNoFim(2026, m, deps(fat), { comoAbertura: true, hoje }).valor
  t(`saldo previsto igual em ${m + 1}/2026`, Math.abs(antes - depois) < 1e-6)
}

// Sem plano: não lança. Sem cartão com vários cartões: não lança.
t('sem plano não lança', fixasParaLancar({ contas, categorias, planos: {}, faturaData: {} }, hoje).length === 0)
const xp = { ...nub, id: 'xp', nome: 'XP' }
t('sem cartão e com dois: não sabe', cartaoDaFixa({ ...spo, contaDebitoId: undefined }, [sic, nub, xp]) === undefined)
t('sem cartão e com um: usa o único', cartaoDaFixa({ ...spo, contaDebitoId: undefined }, [sic, nub])?.id === 'nub')

t('aviso ao conferir só sem dia', !!avisoFixaSemDia({ fixaId: 'spo' }, categorias) && avisoFixaSemDia({ fixaId: 'net' }, categorias) === null)

console.log(`prova113: ${ok} ok, ${falha} falhas`)
if (falha) process.exit(1)
