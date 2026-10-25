import { debitosParaConfirmar, confirmarDebito } from '../src/utils/debitoAutomatico'
import { saldoFinalConta, type Deps } from '../src/utils/saldoConta'
import { contasAVencer } from '../src/utils/contasAVencer'
import { construirRealizadoMes } from '../src/utils/realizadoMes'
let ok = 0, falha = 0
const t = (n: string, c: boolean) => { c ? ok++ : (falha++, console.log('FALHOU', n)) }
const hoje = new Date(2026, 9, 18) // domingo
const contas = [{ id: 'a', nome: 'Sicredi', banco: 'Sicredi', tipo: 'corrente', saldoInicial: 5000, cor: '', icone: '', preferida: true }] as any
const cat = (id: string, nome: string, dia: number, forma: string, extra: any = {}) =>
  ({ id, nome, tipo: 'saida', fixa: true, tipoMovimento: 'banco', formaPagamento: forma, cor: '', icone: '', ativa: true, diaVencimento: dia, contaDebitoId: 'a', ...extra })
const categorias = [
  cat('luz', 'Energia', 10, 'automatico'),
  cat('net', 'Internet', 25, 'automatico'),
  cat('alug', 'Aluguel', 5, 'boleto'),
  cat('agua', 'Água', 12, 'automatico'),
] as any
const v = (x: number) => Array.from({ length: 12 }, () => x)
const planos = { 2026: { saldoInicialJan: 0, entradas: [], saidas: [
  { id: 'luz', nome: 'Energia', v: v(250) }, { id: 'net', nome: 'Internet', v: v(120) },
  { id: 'alug', nome: 'Aluguel', v: v(1500) }, { id: 'agua', nome: 'Água', v: v(90) },
] } } as any
const mk = (ext: any): Deps => ({ extratoData: ext, faturaData: {}, contas, categorias, planos, saldoInicialDinheiro: 0 })
const K = 'a-2026-10'

let d = mk({})
let p = debitosParaConfirmar(d, hoje)
t('energia e agua (venceram, automaticas); aluguel (boleto) e internet (dia 25) fora',
  p.map(x => x.id).sort().join() === 'agua,luz')
t('na conta de debito', p.every(x => x.chave === K))
const antes = saldoFinalConta(contas[0], 2026, 9, d)
let ext: any = {}
for (const x of p) ext[x.chave] = confirmarDebito(ext[x.chave], x)
d = mk(ext)
t('saldo do Radar cai 340', Math.abs(antes - saldoFinalConta(contas[0], 2026, 9, d) - 340) < 1e-9)
t('sai das contas a vencer', contasAVencer(d, hoje, 7).every(c => c.id !== 'luz' && c.id !== 'agua'))
const r = construirRealizadoMes ? true : true
t('lista vazia depois (sem laço)', debitosParaConfirmar(d, hoje).length === 0)
// desmarcada pela pessoa nao volta
ext = { [K]: { lancamentos: {}, saldoBanco: '', fixasConsolidadas: { luz: false } } }
t('desmarcada nao volta', debitosParaConfirmar(mk(ext), hoje).map(x => x.id).join() === 'agua')
// confirmarDebito nao sobrescreve
t('nao sobrescreve marcada a mao', confirmarDebito({ lancamentos: {}, saldoBanco: '', fixasConsolidadas: { luz: false } } as any, p[0]).fixasConsolidadas!.luz === false)
// valor digitado (override) é o confirmado
ext = { [K]: { lancamentos: {}, saldoBanco: '', fixasValorOverride: { luz: 271.3 } } }
{ const dd = mk(ext); const a0 = saldoFinalConta(contas[0], 2026, 9, dd); const e2: any = { ...ext }
  for (const x of debitosParaConfirmar(dd, hoje)) e2[x.chave] = confirmarDebito(e2[x.chave], x)
  t('valor digitado vale na confirmação', Math.abs(a0 - saldoFinalConta(contas[0], 2026, 9, mk(e2)) - (271.3 + 90)) < 1e-9) }
// mes fechado nao se mexe: em 1/11 so novembro
t('virada do mes: so o mes corrente', debitosParaConfirmar(mk({}), new Date(2026, 10, 1)).every(x => x.chave.endsWith('2026-11')))
// sem plano nao confirma
const d2 = { ...mk({}), planos: { 2026: { saldoInicialJan: 0, entradas: [], saidas: [] } } } as any
t('controle: sem plano, nada', debitosParaConfirmar(d2, hoje).length === 0)
void r
console.log(`prova77: ${ok} ok, ${falha} falhas`)
