// prova112 (05/11/2026): o automático NÃO se marca sozinho (pedido do
// Guilherme: "deve vir desmarcado no Início e Lançamento; ao conferir no
// Início, marcar os dois; se foi feito no Lançamento, faz a conferência no
// Início"). Vencido e sem marca: "A conferir", fora das contas da semana.
import { debitosDoMes, debitoConfere, debitoDesconferir, debitoNaoSaiu } from '../src/utils/debitoAutomatico'
import { contasAVencer, contasParaPagar } from '../src/utils/contasAVencer'
import { confirmarPagamento } from '../src/utils/pagarConta'
import { saldoBancosEDinheiro } from '../src/utils/saldoConta'
let ok = 0, falha = 0
const t = (n: string, c: boolean) => { c ? ok++ : (falha++, console.log('FALHA', n)) }

const hoje = new Date(2026, 10, 10)
const sic = { id: 'sic', nome: 'Sicredi', banco: 'Sicredi', tipo: 'corrente', saldoInicial: 1000, preferida: true, cor: '', icone: '' } as any
const luz = { id: 'luz', nome: 'Luz', tipo: 'saida', fixa: true, ativa: true, tipoMovimento: 'banco', formaPagamento: 'automatico', contaDebitoId: 'sic', diaVencimento: 5, grupo: 'Casa', cor: '', icone: '' } as any
const linha = (id: string, nome: string, v: number) => ({ id, nome, grupo: 'x', t: 'banco', v: Array(12).fill(v) })
const planos: any = { 2026: { saldoInicialJan: 0, entradas: [], saidas: [linha('luz', 'Luz', 80)] } }
const deps = (extratoData: any) => ({ extratoData, faturaData: {}, contas: [sic], categorias: [luz], planos, saldoInicialDinheiro: 0 } as any)
const vazio = { lancamentos: {}, saldoBanco: '' } as any

let d = debitosDoMes(deps({}), hoje)
t('vencido sem marca aparece a conferir', d.length === 1 && !d[0].agendado && !d[0].conferido && !d[0].naoSaiu)
t('não entra nas contas da semana', contasParaPagar(contasAVencer(deps({}), hoje), [luz], [sic], {}).length === 0)

const conf = { 'sic-2026-11': debitoConfere(vazio, d[0]) }
t('confere na Início marca a bolinha de Lançamentos', conf['sic-2026-11'].fixasConsolidadas?.luz === true)
t('e fica conferido', debitosDoMes(deps(conf), hoje)[0].conferido)
t('sai 80 do saldo', Math.abs(saldoBancosEDinheiro(2026, 10, deps({})) - saldoBancosEDinheiro(2026, 10, deps(conf)) - 80) < 1e-9)

const desf = { 'sic-2026-11': debitoDesconferir(conf['sic-2026-11'], d[0]) }
t('desfazer tira a marca dos dois', desf['sic-2026-11'].fixasConsolidadas?.luz === undefined && !debitosDoMes(deps(desf), hoje)[0].conferido)

const lanc = { 'sic-2026-11': confirmarPagamento(vazio, 'luz', 80, 80) }
t('marcado em Lançamentos já aparece conferido', debitosDoMes(deps(lanc), hoje)[0].conferido)

const nao = { 'sic-2026-11': debitoNaoSaiu(vazio, d[0]) }
t('não saiu: volta às contas da semana', contasParaPagar(contasAVencer(deps(nao), hoje), [luz], [sic], nao).length === 1)

d = debitosDoMes(deps({}), new Date(2026, 10, 3))
t('antes do dia: agendado', d.length === 1 && d[0].agendado)

console.log(`prova112: ${ok} ok, ${falha} falhas`)
if (falha) process.exit(1)
