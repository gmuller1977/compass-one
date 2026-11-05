// prova115 (05/11/2026): "Não vai ocorrer neste mês" (pedido do Guilherme:
// fixa no plano que neste mês não acontece; tirar de Lançamentos sem mexer no
// planejamento). Sai da previsão, das contas a pagar e do débito automático,
// só naquele mês; o plano fica igual; desfazer devolve.
import { fixaNaoOcorre, marcarNaoOcorre, desfazerNaoOcorre } from '../src/utils/fixasDoMes'
import { debitosDoMes } from '../src/utils/debitoAutomatico'
import { contasAVencer } from '../src/utils/contasAVencer'
import { confirmarPagamento } from '../src/utils/pagarConta'
import { saldoTotalNoFim, detalharProjecaoDaConta } from '../src/utils/saldoConta'
import { destaqueRadar, destaqueDoGrupo, partesDoGrupo } from '../src/components/acompanhamento/radarCores'
let ok = 0, falha = 0
const t = (n: string, c: boolean) => { c ? ok++ : (falha++, console.log('FALHA', n)) }

const hoje = new Date(2026, 10, 10)
const caixa = { id: 'cx', nome: 'Caixa', banco: 'Caixa', tipo: 'corrente', saldoInicial: 1000, preferida: true, cor: '', icone: '' } as any
const massagem = { id: 'mas', nome: 'Cuidados Pessoais', descricao: 'Massagem', tipo: 'saida', fixa: true, ativa: true, tipoMovimento: 'banco', formaPagamento: 'pix', contaDebitoId: 'cx', diaVencimento: 20, grupo: 'Saúde', cor: '', icone: '' } as any
const luz = { id: 'luz', nome: 'Luz', tipo: 'saida', fixa: true, ativa: true, tipoMovimento: 'banco', formaPagamento: 'automatico', contaDebitoId: 'cx', diaVencimento: 5, grupo: 'Casa', cor: '', icone: '' } as any
const linha = (id: string, nome: string, v: number, descricao?: string) => ({ id, nome, descricao, grupo: 'x', t: 'banco', v: Array(12).fill(v) })
const planos: any = { 2026: { saldoInicialJan: 0, entradas: [], saidas: [linha('mas', 'Cuidados Pessoais', 140, 'Massagem'), linha('luz', 'Luz', 80)] } }
const planoAntes = JSON.stringify(planos)
const deps = (extratoData: any) => ({ extratoData, faturaData: {}, contas: [caixa], categorias: [massagem, luz], planos, saldoInicialDinheiro: 0, cenarioPrevisao: 'pessimista' } as any)
const vazio = { lancamentos: {}, saldoBanco: '' } as any

const fimSem = saldoTotalNoFim(2026, 10, deps({}), { comoAbertura: true, hoje }).valor
const marcado = { 'cx-2026-11': marcarNaoOcorre(vazio, 'mas') }
t('marca grava fixasNaoOcorre', marcado['cx-2026-11'].fixasNaoOcorre?.mas === true)
t('fixaNaoOcorre lê a marca', fixaNaoOcorre('mas', [marcado['cx-2026-11']]))
const fimCom = saldoTotalNoFim(2026, 10, deps(marcado), { comoAbertura: true, hoje }).valor
t('saldo previsto sobe exatamente 140', Math.abs(fimCom - fimSem - 140) < 1e-9)
const det = detalharProjecaoDaConta('cx', 2026, 10, deps(marcado), hoje)
t('sai da projeção da conta', !det.fixasSaida.some(i => i.id === 'mas'))
t('sai das contas a pagar', !contasAVencer(deps(marcado), hoje, 31).some(c => c.id === 'mas'))
t('sem a marca, está nas contas a pagar (controle)', contasAVencer(deps({}), hoje, 31).some(c => c.id === 'mas'))
t('o plano não mudou', JSON.stringify(planos) === planoAntes)
const dez = saldoTotalNoFim(2026, 11, deps(marcado), { comoAbertura: true, hoje }).valor - saldoTotalNoFim(2026, 11, deps({}), { comoAbertura: true, hoje }).valor
t('dezembro desconta normalmente (só a diferença de novembro)', Math.abs(dez - 140) < 1e-9)

const desf = { 'cx-2026-11': desfazerNaoOcorre(marcado['cx-2026-11'], 'mas') }
t('desfazer devolve', !fixaNaoOcorre('mas', [desf['cx-2026-11']]) &&
  Math.abs(saldoTotalNoFim(2026, 10, deps(desf), { comoAbertura: true, hoje }).valor - fimSem) < 1e-9)

const paga = confirmarPagamento(vazio, 'mas', 140, 140)
const pagaEMarcada = marcarNaoOcorre(paga, 'mas')
t('marcar tira a marca de paga', pagaEMarcada.fixasConsolidadas?.mas === undefined)
t('paga vence a marca', !fixaNaoOcorre('mas', [{ ...pagaEMarcada, fixasConsolidadas: { mas: true } }]))

t('automático aparece a conferir (controle)', debitosDoMes(deps({}), hoje).some(x => x.id === 'luz'))
const luzFora = { 'cx-2026-11': marcarNaoOcorre(vazio, 'luz') }
t('automático marcado sai do quadro', !debitosDoMes(deps(luzFora), hoje).some(x => x.id === 'luz'))

// Radar: plano à vista e "não vai ocorrer", no lugar de "a pagar".
const dl = destaqueRadar(140, 0, false, { fixa: true, naoOcorre: true })
t('Radar linha: não vai ocorrer', dl.principal === 'não vai ocorrer' && dl.contexto.includes('140,00'))
t('Radar linha sem a marca: a pagar (controle)', destaqueRadar(140, 0, false, { fixa: true }).principal.startsWith('a pagar'))
t('com gasto lançado, a marca não esconde', destaqueRadar(140, 50, false, { fixa: true, naoOcorre: true }).principal.startsWith('resta'))
const g = destaqueDoGrupo([{ prev: 140, real: 0, fixa: true, naoOcorre: true }, { prev: 80, real: 80, fixa: true }], false)
t('grupo só com paga e não ocorre: ✓ pago', g.principal === '✓ pago')
const g2 = destaqueDoGrupo([{ prev: 140, real: 0, fixa: true, naoOcorre: true }, { prev: 300, real: 100, fixa: false }], false)
t('a que não ocorre não vira resta', g2.principal.includes('200,00'))
t('parte Fixas fica paga', partesDoGrupo([{ prev: 140, real: 0, fixa: true, naoOcorre: true }], false)[0].estado === 'pago')

t('sem plano e sem gasto: Sem planejamento', destaqueRadar(0, 0, false).principal === 'Sem planejamento')
t('sem plano com gasto: Passou do plano', destaqueRadar(0, 50, false).principal === 'Passou do plano')

console.log(`prova115: ${ok} ok, ${falha} falhas`)
if (falha) process.exit(1)
