// prova123 (19/11/2026): lançamento com data DEPOIS de hoje só entra no saldo
// quando o dia chega (regra do Guilherme: "lançamentos futuros não estão no
// saldo Compass, somente quando chegar no dia de hoje"). Até lá é previsto:
// o saldo final previsto não muda, e a memória fecha nele.
import { saldoBancosEDinheiro, saldoRealizadoConta, memoriaDoRadar, saldoTotalNoFim, detalharMes, ultimoDiaRealizado } from '../src/utils/saldoConta'
import { previsaoDoMes, entradasPrevistasDaMemoria, saidasPrevistasDaMemoria } from '../src/utils/previsaoDoMes'
let ok = 0, falha = 0
const t = (n: string, c: boolean) => { c ? ok++ : (falha++, console.log('FALHA', n)) }
const perto = (a: number, b: number) => Math.abs(a - b) < 1e-6

const hoje = new Date(2026, 10, 19)
const conta = { id: 'b1', nome: 'Sicredi', banco: 'Sicredi', tipo: 'corrente', saldoInicial: 1000, icone: '' } as any
const lanc = (id: string, tipo: string, valor: number) => ({ id, tipo, valor, descricao: '', categoria: 'Mercado', formaPagamento: 'debito' })
const extrato = (dias: Record<number, any[]>) => ({
  'b1-2026-11': { lancamentos: dias, saldoBanco: '' },
  'dinheiro-2026-11': { lancamentos: { 25: [lanc('d1', 'saida', 30)] }, saldoBanco: '' },
})
const deps = (dias: Record<number, any[]>, h: Date = hoje) => ({
  extratoData: extrato(dias) as any, faturaData: {}, contas: [conta], categorias: [], planos: {},
  saldoInicialDinheiro: 100, hoje: h,
})

const dias = { 10: [lanc('a', 'saida', 200)], 19: [lanc('b', 'entrada', 50)], 25: [lanc('c', 'saida', 300)], 28: [lanc('e', 'entrada', 80)] }
const D = deps(dias)

t('corte é hoje no mês corrente', ultimoDiaRealizado(2026, 10, hoje) === 19)
t('outro mês: inteiro', ultimoDiaRealizado(2026, 9, hoje) === Infinity)

// Saldo de hoje: 1000 − 200 + 50 (o dia 19 é hoje e conta); 25 e 28 não.
t('banco até hoje', perto(saldoRealizadoConta('b1', 2026, 10, D), 850))
t('dinheiro até hoje', perto(saldoRealizadoConta('dinheiro', 2026, 10, D), 100))
t('saldo atual', perto(saldoBancosEDinheiro(2026, 10, D), 950))

// O previsto do mês não muda: 1000 − 200 + 50 − 300 + 80 + 100 − 30.
const fim = saldoTotalNoFim(2026, 10, D, { comoAbertura: true, hoje }).valor
t('saldo final previsto inteiro', perto(fim, 700))

// Memória: os lançados para depois de hoje aparecem como previstos e fecham.
const m = memoriaDoRadar(2026, 10, D, { hoje })
t('entradas lançadas', perto(m.entradasLancadas ?? 0, 80))
t('saídas lançadas', perto(m.saidasLancadas ?? 0, 330))
t('reais só até hoje', perto(m.entradasReais, 50) && perto(m.saidasReais, 200))
const soma = m.abertura + m.entradasReais - m.saidasReais + (m.ajusteConciliacao ?? 0)
  + entradasPrevistasDaMemoria(m) - saidasPrevistasDaMemoria(m)
t('memória fecha no previsto', perto(soma, m.fechamento) && perto(m.fechamento, fim))

// A Início do mês corrente diz o mesmo que o Radar.
const p = previsaoDoMes(2026, 10, D, hoje)
t('previsaoDoMes = memória', perto(p.memoria.entradasLancadas ?? 0, 80) && perto(p.memoria.saidasLancadas ?? 0, 330) && perto(p.final, fim))

// detalharMes fecha por conta, sem ajuste fantasma.
t('linhas sem ajuste', detalharMes(2026, 10, D).every(l => Math.abs(l.ajuste) < 1e-9))

// Quando o dia chega, entra: no dia 28, tudo está no saldo e nada é previsto.
const D28 = deps(dias, new Date(2026, 10, 28))
t('no dia 28 conta tudo', perto(saldoBancosEDinheiro(2026, 10, D28), 700))
t('no dia 28 nada lançado à frente', perto(memoriaDoRadar(2026, 10, D28, { hoje: new Date(2026, 10, 28) }).saidasLancadas ?? 0, 0))

// O mês seguinte abre com o fechamento inteiro (mês passado não corta).
const Dez = deps(dias, new Date(2026, 11, 2))
t('dezembro abre com novembro inteiro', perto(saldoBancosEDinheiro(2026, 10, Dez), 700))

console.log(`prova123: ${ok} ok, ${falha} falhas`)
if (falha) process.exit(1)
