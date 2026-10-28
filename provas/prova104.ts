// prova104 (28/10/2026): tela de Investimentos. Saldo por aplicações e
// resgates (a transferência de Lançamentos), rendimento pela atualização de
// saldo (a diferença no dia), aplicação DEPOIS da atualização somando por
// cima, objetivos separados da conta (a mesma poupança com a reserva e a
// viagem), o rendimento dividido pelo saldo de cada objetivo, e o caminho até
// o objetivo sem rendimento estimado.
import type { Conta, DadosMes } from '../src/context/AppContext'
import { caminhoDoObjetivo, historicoDoInvestimento, movimentosDoMes, resumoDosInvestimentos, type Objetivo } from '../src/utils/investimentos'
import { ehContaDisponivel } from '../src/utils/saldoConta'
let ok = 0, falha = 0
const t = (n: string, c: boolean) => { c ? ok++ : (falha++, console.log('FALHA', n)) }
const perto = (a: number, b: number) => Math.abs(a - b) < 0.005

const conta = (id: string, tipo: Conta['tipo'], saldoInicial = 0): Conta =>
  ({ id, nome: id, banco: id, tipo, saldoInicial, cor: '', icone: '' })
const poup = conta('poup', 'poupanca', 1000)
const sic = conta('sic', 'corrente', 5000)
const lanc = (tipo: 'entrada' | 'saida', valor: number, objetivoId?: string, descricao = '← Sicredi') =>
  ({ id: `v-${Math.random()}`, tipo, valor, descricao, categoria: 'Transferência', formaPagamento: 'transferencia',
    tipoLanc: 'variavel', consolidado: true, ...(objetivoId ? { objetivoId } : {}) }) as DadosMes['lancamentos'][number][number]
const mes = (lancs: Record<number, ReturnType<typeof lanc>[]>, extra: Partial<DadosMes> = {}): DadosMes =>
  ({ lancamentos: lancs, saldoBanco: '', ...extra })

// Agosto: aplica 500 (reserva) e 300 (viagem). Setembro: atualiza no dia 10
// para 1.818 (rendeu 18) e aplica 200 na viagem no dia 20. Outubro: resgata
// 100 da reserva no dia 5; aplicação agendada no dia 30 não conta (hoje é 28).
const objetivos: Objetivo[] = [
  { id: 'res', contaId: 'poup', nome: 'Reserva', valorAlvo: 3000, saldoInicial: 1000, criadoEm: '2026-08-01' },
  { id: 'via', contaId: 'poup', nome: 'Viagem', valorAlvo: 2000, ate: '2027-07', saldoInicial: 0, criadoEm: '2026-08-01' },
]
const extrato: Record<string, DadosMes> = {
  'poup-2026-08': mes({ 3: [lanc('entrada', 500, 'res')], 4: [lanc('entrada', 300, 'via')] }),
  'poup-2026-09': mes({ 20: [lanc('entrada', 200, 'via')] },
    { saldoBanco: 'R$ 1.818,00', saldoBancoData: '2026-09-10', saldoBancoInformado: true }),
  'poup-2026-10': mes({ 5: [lanc('saida', 100, 'res', '→ Sicredi')], 30: [lanc('entrada', 999)] }),
  'sic-2026-08': mes({ 3: [lanc('saida', 500, undefined, '→ poup')] }),
}
const hoje = '2026-10-28'
const h = historicoDoInvestimento(poup, extrato, hoje, objetivos)

t('saldo = 1000 + 500 + 300 + 18 + 200 − 100', perto(h.saldo, 1918))
t('agendado depois de hoje não conta', !h.movimentos.some(m => m.valor === 999))
t('aplicação depois da atualização soma por cima', perto(h.fimDoMes.get(2026 * 12 + 8)!.saldo, 2018))
const rend = h.movimentos.filter(m => m.tipo === 'rendimento')
t('um rendimento, de 18, no dia 10/09', rend.length === 1 && perto(rend[0].valor, 18) && rend[0].dia === 10 && rend[0].mes === 8)
t('contraparte sem a seta', h.movimentos.find(m => m.tipo === 'resgate')?.contraparte === 'Sicredi')

const parte = (id: string) => h.partes.find(p => p.objetivoId === id)!
t('as partes somam o saldo da conta', perto(h.partes.reduce((s, p) => s + p.saldo, 0), h.saldo))
// No dia 10/09: reserva 1500, viagem 300 → o rendimento de 18 divide 15 e 3.
t('rendimento dividido pelo saldo: reserva 15', perto(parte('res').rendido, 15))
t('rendimento dividido pelo saldo: viagem 3', perto(parte('via').rendido, 3))
t('reserva = 1000 + 500 + 15 − 100', perto(parte('res').saldo, 1415))
t('viagem = 300 + 3 + 200', perto(parte('via').saldo, 503))
t('saldo inicial separado: nada sem objetivo', perto(parte('').saldo, 0))

// Objetivo apagado: o id some, e o dinheiro dele volta para "sem objetivo".
const semViagem = historicoDoInvestimento(poup, extrato, hoje, objetivos.filter(o => o.id !== 'via'))
t('objetivo apagado: o dinheiro fica sem objetivo', perto(semViagem.partes.find(p => p.objetivoId === '')!.saldo, 503))
t('objetivo apagado: o saldo da conta não muda', perto(semViagem.saldo, h.saldo))

// Objetivo criado hoje, depois de todos os registros, separa o saldo hoje.
const novo: Objetivo = { id: 'car', contaId: 'poup', nome: 'Carro', saldoInicial: 200, criadoEm: hoje }
const comCarro = historicoDoInvestimento(poup, extrato, hoje, [...objetivos.filter(o => o.id !== 'res'), novo])
t('objetivo criado hoje separa do sem objetivo', perto(comCarro.partes.find(p => p.objetivoId === 'car')!.saldo, 200))
t('e a soma continua o saldo', perto(comCarro.partes.reduce((s, p) => s + p.saldo, 0), comCarro.saldo))

// Caminho: viagem até jul/2027 faltam 1.497; de out/2026 a jul/2027 são 10 meses.
const cv = caminhoDoObjetivo(objetivos[1], parte('via'), hoje)
t('com data: por mês até lá', cv?.tipo === 'porMes' && perto(cv.porMes, 149.7))
// Reserva sem data: ritmo dos 3 meses fechados (jul, ago, set) = (0 + 500 + 0)/3.
const cr = caminhoDoObjetivo(objetivos[0], parte('res'), hoje)
t('sem data: no ritmo, chega num mês', cr?.tipo === 'chegaEm' && perto(cr.ritmo, 166.67))
t('chegou quando o saldo passa do alvo', caminhoDoObjetivo({ ...objetivos[0], valorAlvo: 1000 }, parte('res'), hoje)?.tipo === 'chegou')
t('sem valor: sem caminho', caminhoDoObjetivo({ ...objetivos[0], valorAlvo: undefined }, parte('res'), hoje) === null)

// O resumo da tela.
const r = resumoDosInvestimentos([sic, poup], extrato, hoje, objetivos)
t('só investimento entra', r.itens.length === 1 && perto(r.total, 1918))
t('aplicou no ano', perto(r.aplicouNoAno, 1000))
t('resgatou no ano', perto(r.resgatouNoAno, -100))
t('rendeu no ano', perto(r.rendeuNoAno, 18))
t('série termina no saldo de hoje', perto(r.serie[r.serie.length - 1].saldo, 1918))
t('série: aplicado + rendido = saldo', r.serie.every(p => perto(p.aplicado + p.rendido, p.saldo)))
t('série começa no primeiro registro (ago)', r.serie[0].mes === 7 && r.serie.length === 3)
const out = movimentosDoMes(r, 2026, 9)
t('movimentos de outubro: só o resgate', out.length === 1 && out[0].tipo === 'resgate')
t('investimento continua fora do disponível', !ehContaDisponivel(poup))

// Controle: sem atualização de saldo, nenhum rendimento aparece.
const semInfo = { ...extrato, 'poup-2026-09': mes({ 20: [lanc('entrada', 200, 'via')] }) }
const c = historicoDoInvestimento(poup, semInfo, hoje, objetivos)
t('controle: sem saldo informado, rendimento zero', c.movimentos.every(m => m.tipo !== 'rendimento') && perto(c.saldo, 1900))

console.log(`prova104: ${ok} ok, ${falha} falhas`)
if (falha) process.exit(1)
