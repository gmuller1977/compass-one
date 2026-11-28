// prova137 — Fixa de banco paga em dinheiro naquele mês (28/11/2026, pedido
// do Guilherme: "Cuidados Pessoais · Unha" sai por Pix no Sicredi, mas neste
// mês foi paga em dinheiro).
//   - na edição da fixa não há Saque nem Depósito; a fixa de banco tem
//     "Dinheiro"; a da carteira, nenhuma forma;
//   - mover a fixa paga leva a marca e o valor para a carteira: o Sicredi
//     sobe e a carteira desce pelo mesmo valor, o total não muda;
//   - o realizado da categoria (Radar) não muda: continua despesa do Aluguel;
//   - a Início paga na carteira (contaDoPagamento) com a troca do mês;
//   - voltar ao banco desfaz tudo.
import { categoriasBase, extratoData, depsDe } from './familia'
import { saldoRealizadoConta } from '../src/utils/saldoConta'
import { construirRealizadoMes } from '../src/utils/realizadoMes'
import { contaDoPagamento } from '../src/utils/pagarConta'
import { moverFixaDeConta, formasDaEdicaoDaFixa } from '../src/utils/fixaEmOutraConta'

let ok = 0, falhas = 0
const t = (nome: string, cond: boolean, extra?: unknown) => {
  if (cond) ok++
  else { falhas++; console.log('FALHOU:', nome, extra !== undefined ? JSON.stringify(extra) : '') }
}
const perto = (a: number, b: number) => Math.abs(a - b) < 1e-6
const ids = (l: { id: string }[]) => l.map(p => p.id)

// 1) Formas
const sai = ids(formasDaEdicaoDaFixa('saida', true))
const ent = ids(formasDaEdicaoDaFixa('entrada', true))
t('edição da fixa (pagamento): sem Saque/Depósito', !sai.includes('saque') && !sai.includes('deposito'), sai)
t('edição da fixa (recebimento): sem Saque/Depósito', !ent.includes('saque') && !ent.includes('deposito'), ent)
t('edição da fixa de banco tem Dinheiro (pagamento e recebimento)', sai.includes('dinheiro') && ent.includes('dinheiro'))
t('Dinheiro fica no fim, no lugar do Saque', sai[sai.length - 1] === 'dinheiro' && ent[ent.length - 1] === 'dinheiro')
t('fixa da carteira: nenhuma forma', formasDaEdicaoDaFixa('saida', false).length === 0)

// 2) Mover o Aluguel (pago no Sicredi em novembro) para a carteira
const deps0 = depsDe('pessimista')
const sic0 = saldoRealizadoConta('sic', 2026, 10, deps0)
const din0 = saldoRealizadoConta('dinheiro', 2026, 10, deps0)
const sicNov = { ...extratoData['sic-2026-11'], fixasValorOverride: { alu: 2100 }, fixasMovidas: { alu: 12 } }
const [semAFixa, comAFixa] = moverFixaDeConta(sicNov, extratoData['dinheiro-2026-11'], 'alu')
const comOverride = { ...semAFixa, fixasContaOverride: { alu: 'dinheiro' } }
const ext1 = { ...extratoData, 'sic-2026-11': comOverride, 'dinheiro-2026-11': comAFixa }
const deps1 = { ...deps0, extratoData: ext1 } as typeof deps0
t('marca de paga saiu do Sicredi', comOverride.fixasConsolidadas?.alu === undefined)
t('marca de paga chegou na carteira', (comAFixa as any).fixasConsolidadas?.alu === true)
t('valor e dia foram junto', (comAFixa as any).fixasValorOverride?.alu === 2100 && (comAFixa as any).fixasMovidas?.alu === 12)
t('o que a carteira já tinha fica (Fitway)', (comAFixa as any).fixasConsolidadas?.fit === true)
t('lançamentos não se mexem', comOverride.lancamentos === sicNov.lancamentos && (comAFixa as any).lancamentos === extratoData['dinheiro-2026-11'].lancamentos)

// Saldo antes com o valor digitado (2.100) no Sicredi, para comparar igual.
const depsBase = { ...deps0, extratoData: { ...extratoData, 'sic-2026-11': sicNov } } as typeof deps0
const sicB = saldoRealizadoConta('sic', 2026, 10, depsBase)
const dinB = saldoRealizadoConta('dinheiro', 2026, 10, depsBase)
const sic1 = saldoRealizadoConta('sic', 2026, 10, deps1)
const din1 = saldoRealizadoConta('dinheiro', 2026, 10, deps1)
t('Sicredi sobe 2.100', perto(sic1 - sicB, 2100), { sicB, sic1 })
t('carteira desce 2.100', perto(dinB - din1, 2100), { dinB, din1 })
t('total igual', perto(sic1 + din1, sicB + dinB))
void sic0; void din0

const real = (ext: any) => construirRealizadoMes({ ano: 2026, mes: 10, extratoData: ext, faturaData: deps0.faturaData, contas: deps0.contas, categorias: categoriasBase, planoAno: deps0.planos[2026] } as any)
const aluguel = (r: any) => JSON.stringify(Object.entries(r).filter(([k]) => /alu|Aluguel/.test(k)))
t('realizado do Aluguel no Radar não muda', aluguel(real(depsBase.extratoData)) === aluguel(real(ext1)), [aluguel(real(depsBase.extratoData)), aluguel(real(ext1))])

t('Início paga na carteira com a troca do mês',
  contaDoPagamento('alu', 2026, 10, deps0.contas as any, categoriasBase, ext1) === 'dinheiro')

// 3) Voltar ao banco
const [semNaCarteira, deVolta] = moverFixaDeConta(comAFixa, comOverride, 'alu')
const { fixasContaOverride: _o, ...semOverride } = deVolta as any; void _o
const ext2 = { ...extratoData, 'sic-2026-11': semOverride, 'dinheiro-2026-11': semNaCarteira }
const deps2 = { ...deps0, extratoData: ext2 } as typeof deps0
t('de volta: Sicredi igual ao de antes', perto(saldoRealizadoConta('sic', 2026, 10, deps2), sicB))
t('de volta: carteira igual à de antes', perto(saldoRealizadoConta('dinheiro', 2026, 10, deps2), dinB))
t('de volta: Início paga no Sicredi', contaDoPagamento('alu', 2026, 10, deps0.contas as any, categoriasBase, ext2) === 'sic')

console.log(`prova137: ${ok} ok, ${falhas} falhas`)
if (falhas) process.exit(1)
