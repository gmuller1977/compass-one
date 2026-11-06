// prova117 (06/11/2026): Investimentos, pedido do Guilherme. (1) Rendimento
// por aplicação: a linha 'Rendimento' no investimento, com o objetivo, soma
// no saldo e no rendido DAQUELE objetivo, não é aplicado, não entra no
// aplicado da meta nem no realizado. (2) Excluir movimento: aplicação e
// resgate levam junto a linha do banco (o par mais perto pelo id), o
// rendimento novo sai sozinho, e o antigo limpa o saldo informado do mês.
import type { Conta, DadosMes } from '../src/context/AppContext'
import { aplicadoNoMes, exclusaoDoMovimento, historicoDoInvestimento, type Objetivo } from '../src/utils/investimentos'
import { construirRealizadoMes } from '../src/utils/realizadoMes'
let ok = 0, falha = 0
const t = (n: string, c: boolean) => { c ? ok++ : (falha++, console.log('FALHA', n)) }
const perto = (a: number, b: number) => Math.abs(a - b) < 0.005

const conta = (id: string, tipo: Conta['tipo'], saldoInicial = 0): Conta =>
  ({ id, nome: id, banco: id, tipo, saldoInicial, cor: '', icone: '' })
const poup = conta('poup', 'poupanca', 0)
const sic = conta('sic', 'corrente', 5000)
const L = (id: string, tipo: 'entrada' | 'saida', valor: number, extra: Record<string, unknown> = {}) =>
  ({ id, tipo, valor, descricao: '', categoria: 'Transferência', formaPagamento: 'transferencia',
    tipoLanc: 'variavel', consolidado: true, ...extra }) as DadosMes['lancamentos'][number][number]
const R = (id: string, tipo: 'entrada' | 'saida', valor: number, objetivoId?: string) =>
  L(id, tipo, valor, { categoria: 'Rendimento', formaPagamento: 'debito', rendimento: true, ...(objetivoId ? { objetivoId } : {}) })
const mes = (l: DadosMes['lancamentos'], extra: Partial<DadosMes> = {}): DadosMes => ({ lancamentos: l, saldoBanco: '', ...extra })

const objetivos: Objetivo[] = [
  { id: 'res', contaId: 'poup', nome: 'Reserva', saldoInicial: 0, criadoEm: '2026-10-01' },
  { id: 'out', contaId: 'poup', nome: 'Outros', saldoInicial: 0, criadoEm: '2026-10-01' },
]
const extrato: Record<string, DadosMes> = {
  'poup-2026-11': mes({
    2: [L('v-1001', 'entrada', 1000, { objetivoId: 'res' }), L('v-2001', 'entrada', 500, { objetivoId: 'out' })],
    6: [R('r-1', 'entrada', 30, 'res'), R('r-2', 'saida', 5, 'out')],
  }),
  'sic-2026-11': mes({
    2: [L('v-1000', 'saida', 1000), L('v-2000', 'saida', 500), L('v-9000', 'saida', 1000)],
  }),
}
const hoje = '2026-11-06'
const h = historicoDoInvestimento(poup, extrato, hoje, objetivos)
const res = h.partes.find(p => p.objetivoId === 'res')!
const out = h.partes.find(p => p.objetivoId === 'out')!
t('saldo da conta = aplicado + rendimentos', perto(h.saldo, 1525))
t('rendimento fica no objetivo dele (reserva)', perto(res.saldo, 1030) && perto(res.rendido, 30) && perto(res.aplicado, 1000))
t('perda fica no objetivo dela (outros)', perto(out.saldo, 495) && perto(out.rendido, -5) && perto(out.aplicado, 500))
t('rendimento não é aplicado nem resgate', h.movimentos.filter(m => m.tipo === 'rendimento').length === 2
  && h.movimentos.filter(m => m.tipo === 'aplicacao').length === 2)
t('atualizado hoje pelo rendimento', h.atualizadoEm === '2026-11-06')
t('aplicado da meta ignora o rendimento', perto(aplicadoNoMes([poup, sic], extrato, 2026, 10, hoje), 1500))
const real = construirRealizadoMes({ ano: 2026, mes: 10, extratoData: extrato, faturaData: {}, contas: [poup, sic], categorias: [], planoAno: undefined })
t('rendimento fora do realizado', !Object.keys(real.entradasMap).length && !Object.keys(real.saidasMap).length)

// Excluir a aplicação de 1000 na reserva: sai o v-1000 do Sicredi (id vizinho), não o v-9000.
const apl = h.movimentos.find(m => m.lancamentoId === 'v-1001')!
const ex = exclusaoDoMovimento(apl, extrato)
t('aplicação leva o par do banco', ex.linhas.length === 2 && ex.linhas[1].id === 'v-1000' && ex.linhas[1].chave === 'sic-2026-11')
t('contraparte é o Sicredi', ex.contraparteId === 'sic')
const ex2 = exclusaoDoMovimento(h.movimentos.find(m => m.lancamentoId === 'v-2001')!, extrato)
t('valor diferente não casa', ex2.linhas[1]?.id === 'v-2000')
const exR = exclusaoDoMovimento(h.movimentos.find(m => m.lancamentoId === 'r-1')!, extrato)
t('rendimento novo sai sozinho', exR.linhas.length === 1 && exR.linhas[0].id === 'r-1' && !exR.limparInformado)

// Aplicada sem par no banco: sai só ela.
const sozinha: Record<string, DadosMes> = { 'poup-2026-11': mes({ 3: [L('v-5', 'entrada', 70)] }) }
const hs = historicoDoInvestimento(poup, sozinha, hoje)
const exS = exclusaoDoMovimento(hs.movimentos[0], sozinha)
t('sem par: só a do investimento', exS.linhas.length === 1 && !exS.contraparteId)

// Rendimento antigo (saldo informado): excluir limpa o informado do mês.
const antigo: Record<string, DadosMes> = {
  'poup-2026-11': mes({ 2: [L('v-7', 'entrada', 300)] }, { saldoBanco: 'R$ 250,00', saldoBancoData: '2026-11-06', saldoBancoInformado: true }),
}
const ha = historicoDoInvestimento(poup, antigo, hoje)
const rendAntigo = ha.movimentos.find(m => m.tipo === 'rendimento')!
t('antigo ainda é lido', perto(rendAntigo.valor, -50) && perto(ha.saldo, 250))
const exA = exclusaoDoMovimento(rendAntigo, antigo)
t('antigo: limpa o informado', exA.limparInformado === 'poup-2026-11' && exA.linhas.length === 0)
const limpo = { 'poup-2026-11': { ...antigo['poup-2026-11'], saldoBanco: '', saldoBancoInformado: undefined, saldoBancoData: undefined } }
t('depois de excluir, volta ao calculado', perto(historicoDoInvestimento(poup, limpo, hoje).saldo, 300))

console.log(`prova117: ${ok} ok, ${falha} falhas`)
