// prova97 (26/10/2026): débito automático com conta de débito num INVESTIMENTO
// (ou numa conta excluída) se confirma no banco preferido, aparece em
// Lançamentos > Banco e sai do saldo disponível. Relato do Guilherme: "Cotas
// Sicredi" com ✓ na Início e sem linha no extrato do banco.
import { debitosParaConfirmar, confirmarDebito, marcasForaDoLugar, porMarca, tirarMarca, debitosDoMes } from '../src/utils/debitoAutomatico'
import { contaDoPagamento } from '../src/utils/pagarConta'
import { saldoBancosEDinheiro } from '../src/utils/saldoConta'
let ok = 0, falha = 0
const t = (n: string, c: boolean) => { c ? ok++ : (falha++, console.log('FALHA', n)) }

const hoje = new Date(2026, 9, 26)
const sicredi = { id: 'sic', nome: 'Sicredi', banco: 'Sicredi', tipo: 'corrente', saldoInicial: 1000, preferida: true, cor: '', icone: '' } as any
const caixa = { id: 'cx', nome: 'Caixa', banco: 'Caixa', tipo: 'corrente', saldoInicial: 0, cor: '', icone: '' } as any
const invest = { id: 'inv', nome: 'Cotas', banco: 'Sicredi', tipo: 'poupanca', saldoInicial: 5000, cor: '', icone: '' } as any
const cotas = { id: 'cotas', nome: 'Cotas', descricao: 'Sicredi', tipo: 'saida', fixa: true, ativa: true, tipoMovimento: 'banco', formaPagamento: 'automatico', contaDebitoId: 'inv', diaVencimento: 26, grupo: 'Finanças', cor: '', icone: '' } as any
const linha = (id: string, nome: string, desc: string | undefined, v: number) => ({ id, nome, descricao: desc, grupo: 'x', t: 'banco', v: Array(12).fill(v) })
const planos: any = { 2026: { saldoInicialJan: 0, entradas: [], saidas: [linha('cotas', 'Cotas', 'Sicredi', 50)] } }
const contas = [sicredi, caixa, invest]
const deps = (extratoData: any) => ({ extratoData, faturaData: {}, contas, categorias: [cotas], planos, saldoInicialDinheiro: 0 } as any)

t('conta do pagamento: investimento cai na preferida', contaDoPagamento('cotas', 2026, 9, contas, [cotas], {}) === 'sic')
t('conta de débito em banco continua valendo', contaDoPagamento('cotas', 2026, 9, contas, [{ ...cotas, contaDebitoId: 'cx' }], {}) === 'cx')
t('conta excluída cai na preferida', contaDoPagamento('cotas', 2026, 9, contas, [{ ...cotas, contaDebitoId: 'sumiu' }], {}) === 'sic')

const p = debitosParaConfirmar(deps({}), hoje)
t('confirma hoje, no Sicredi', p.length === 1 && p[0].chave === 'sic-2026-10')
const ext: any = { 'sic-2026-10': confirmarDebito(undefined, p[0]) }
const antes = saldoBancosEDinheiro(2026, 9, deps({}))
const depois = saldoBancosEDinheiro(2026, 9, deps(ext))
t('sai 50 do disponível', Math.abs(antes - depois - 50) < 1e-9)
t('Início mostra pago na mesma conta', debitosDoMes(deps(ext), hoje).some(d => d.id === 'cotas' && d.contaId === 'sic' && !d.naoSaiu && !d.agendado))

// Reparo: marca antiga gravada no investimento volta para o Sicredi.
const velho: any = { 'inv-2026-10': { lancamentos: {}, saldoBanco: '', fixasConsolidadas: { cotas: true }, debitosConferidos: { cotas: true } } }
const fora = marcasForaDoLugar(deps(velho), hoje)
t('acha a marca fora do lugar', fora.length === 1 && fora[0].de === 'inv-2026-10' && fora[0].para === 'sic-2026-10')
const novo: any = { 'sic-2026-10': porMarca(undefined, velho['inv-2026-10'], 'cotas'), 'inv-2026-10': tirarMarca(velho['inv-2026-10'], 'cotas') }
t('marca e conferido no Sicredi', novo['sic-2026-10'].fixasConsolidadas.cotas === true && novo['sic-2026-10'].debitosConferidos.cotas === true)
t('investimento limpo', novo['inv-2026-10'].fixasConsolidadas?.cotas === undefined)
t('nada mais fora do lugar', marcasForaDoLugar(deps(novo), hoje).length === 0)
t('não confirma de novo', debitosParaConfirmar(deps(novo), hoje).length === 0)
t('saldo disponível igual ao confirmado no lugar certo', Math.abs(saldoBancosEDinheiro(2026, 9, deps(novo)) - depois) < 1e-9)
t('porMarca não passa por cima', porMarca({ lancamentos: {}, saldoBanco: '', fixasConsolidadas: { cotas: false } }, velho['inv-2026-10'], 'cotas').fixasConsolidadas!.cotas === false)
// Controle: mês fechado não se mexe.
t('controle: setembro fica onde está', marcasForaDoLugar(deps({ 'inv-2026-09': { lancamentos: {}, saldoBanco: '', fixasConsolidadas: { cotas: true } } }), hoje).length === 0)

console.log(`prova97: ${ok} ok, ${falha} falhas`)
