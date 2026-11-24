// prova127 (23/11/2026): lançar pelo WhatsApp (API oficial da Meta + n8n; a Z-API segue lida). A frase vira
// uma PROPOSTA, e só o SIM grava, pelo MESMO caminho do Lançar do celular
// (lancarNoExtrato / lancarNaFatura, valor = total, dividirParcelas), com o
// fechamento do mês, a trava da data do saldo e o autor carimbado.
import {
  classificar, normalizarTelefone, lerLancamento, aplicarLancamento, mesesDaAcao, chaveDoMes, hojeEmSaoPaulo,
  textoDoCodigo, telefoneMascarado, type ContaWa, type CategoriaWa,
  lerEntrada,
} from '../src/utils/whatsapp'
import { lancarNaFatura, lancarNoExtrato, dividirParcelas } from '../src/utils/lancamentoRapido'
let ok = 0, falha = 0
const t = (n: string, c: boolean) => { c ? ok++ : (falha++, console.log('FALHA', n)) }

// Comandos
t('código do link', (() => { const c = classificar(textoDoCodigo('048213')); return c.tipo === 'codigo' && c.codigo === '048213' })())
t('código em minúscula', classificar('compass 123456').tipo === 'codigo')
t('valor de 6 dígitos não é código', classificar('123456 mercado').tipo === 'texto')
t('sim', classificar('Sim!').tipo === 'sim' && classificar('ok').tipo === 'sim')
t('não com acento', classificar('Não').tipo === 'nao')
t('sair', classificar('SAIR').tipo === 'sair')
t('oi é ajuda', classificar('Olá').tipo === 'ajuda')
t('frase é texto', classificar('47 mercado').tipo === 'texto')

t('telefone só dígitos', normalizarTelefone('+55 (47) 98823-1323') === '5547988231323')
t('máscara do número', telefoneMascarado('5547988231323') === '+55 47 9****-1323')
t('grupo não', normalizarTelefone('120363019502650977-group') === null)
t('vazio não', normalizarTelefone('') === null && normalizarTelefone(undefined) === null)
t('hoje em SP na virada UTC', (() => { const h = hojeEmSaoPaulo(new Date('2026-12-01T02:30:00Z')); return h.ano === 2026 && h.mes === 10 && h.dia === 30 })())

const contas: ContaWa[] = [
  { id: 'sic', nome: 'Guilherme', banco: 'Sicredi', tipo: 'corrente', preferida: true },
  { id: 'cx', nome: 'Guilherme', banco: 'Caixa', tipo: 'corrente' },
  { id: 'nu', nome: 'Nubank', banco: 'Nubank', tipo: 'cartao', diaFechamento: 20 },
  { id: 'inv', nome: 'Reserva', banco: 'XP Investimentos', tipo: 'poupanca' },
]
const cat = (id: string, nome: string, extra: Partial<CategoriaWa> = {}): CategoriaWa =>
  ({ id, nome, tipo: 'saida', ativa: true, tipoMovimento: 'banco', ...extra })
const categorias: CategoriaWa[] = [
  cat('m', 'Mercado'), cat('f', 'Farmácia', { contaDebitoId: 'cx', formaPagamento: 'pix' }),
  cat('l', 'Lazer', { tipoMovimento: 'cartao' }), cat('s', 'Salário', { tipo: 'entrada' }),
  cat('fe', 'Feira', { tipoMovimento: 'dinheiro' }), cat('v', 'Viagem', { ativa: false, pinQuick: true }),
]
const hoje = { ano: 2026, mes: 10, dia: 23 }
const ler = (s: string, c = contas) => lerLancamento(s, { contas: c, categorias, hoje })

const a1 = ler('47 mercado')
t('banco preferido quando a categoria não diz', a1.ok && a1.acao.destino === 'extrato' && a1.acao.contaId === 'sic' && a1.acao.total === 47)
t('proposta pede SIM', a1.ok && /\*R\$\s?47,00\*/.test(a1.resposta) && /SIM/.test(a1.resposta) && /hoje/.test(a1.resposta))
const a2 = ler('32,90 farmácia ontem')
t('conta de débito e pix da categoria, ontem', a2.ok && a2.acao.contaId === 'cx' && a2.acao.formaPagamento === 'pix' && a2.acao.dia === 22 && /ontem/.test(a2.resposta))
const a3 = ler('350 em 3x lazer nubank')
t('parcelado no cartão dito', a3.ok && a3.acao.destino === 'fatura' && a3.acao.parcelas === 3 && a3.acao.total === 350 && a3.acao.diaFechamento === 20)
t('proposta mostra as parcelas', a3.ok && /1ª de R\$\s?116,68 e 2x de R\$\s?116,66/.test(a3.resposta))
const a4 = ler('80 lazer')
t('categoria de cartão com um cartão só', a4.ok && a4.acao.contaId === 'nu' && a4.acao.formaPagamento === 'credito')
const doisCartoes = [...contas, { id: 'xp', nome: 'XP', banco: 'XP', tipo: 'cartao', diaFechamento: 5 } as ContaWa]
const a5 = ler('80 lazer', doisCartoes)
t('com dois cartões pergunta qual', !a5.ok && /Em qual cartão/.test(a5.resposta) && /Nubank/.test(a5.resposta))
t('parcelado no banco recusa', (() => { const r = ler('300 em 3x mercado sicredi'); return !r.ok && /Parcelado só no cartão/.test(r.resposta) })())
t('recebimento no cartão recusa', (() => { const r = ler('5000 salário nubank'); return !r.ok && /não entra no cartão/.test(r.resposta) })())
t('investimento recusa', (() => { const r = ler('100 mercado xp investimentos'); return !r.ok && /investimento/.test(r.resposta) })())
t('sem valor pergunta', (() => { const r = ler('mercado'); return !r.ok && /valor/.test(r.resposta) })())
t('categoria inativa não casa e lista as ativas', (() => { const r = ler('100 viagem'); return !r.ok && /Mercado/.test(r.resposta) && !/Viagem/.test(r.resposta) })())
const a6 = ler('25 feira')
t('categoria em dinheiro vai para a carteira', a6.ok && a6.acao.contaId === 'dinheiro' && a6.acao.formaPagamento === 'dinheiro')
const a7 = ler('25 mercado em dinheiro')
t('"dinheiro" na frase vai para a carteira e sai da descrição', a7.ok && a7.acao.contaId === 'dinheiro' && a7.acao.descricao === 'Mercado')
const a8 = ler('5000 salário')
t('recebimento no banco', a8.ok && a8.acao.tipoCategoria === 'entrada' && /recebimento/.test(a8.resposta))
const comData = contas.map(c => c.id === 'sic' ? { ...c, saldoInicialDesde: '2026-11-23' } : c)
t('antes da data do saldo recusa', (() => { const r = ler('47 mercado ontem', comData); return !r.ok && /saldo desta conta/.test(r.resposta) })())
t('no dia do saldo aceita', ler('47 mercado', comData).ok)
const a9 = ler('47 mercado pão e leite')
t('o resto vira descrição', a9.ok && a9.acao.descricao === 'pão e leite' && /\(pão e leite\)/.test(a9.resposta))

// Gravação = o caminho do Lançar do celular, com o autor.
if (a1.ok) {
  const k = chaveDoMes('sic', 2026, 10)
  const antes = { [k]: { lancamentos: { 23: [{ id: 'x', valor: 1 }] }, saldoBanco: '10' } }
  const out = aplicarLancamento(a1.acao, antes, { baseId: 'w-1', autor: 'membro' })
  const esperado = lancarNoExtrato(antes[k] as never, { dia: 23, tipo: 'saida', categoria: 'Mercado', descricao: 'Mercado', valor: 47, formaPagamento: 'debito', id: 'w-1' }) as { lancamentos: Record<number, { id: string; autor?: string }[]> }
  const dia = (out[k] as typeof esperado).lancamentos[23]
  t('extrato: só o mês tocado', Object.keys(out).length === 1)
  t('extrato: o que já havia fica', dia.length === 2 && dia[0].id === 'x' && dia[0].autor === undefined)
  t('extrato: igual ao Lançar + autor', JSON.stringify({ ...dia[1], autor: undefined }) === JSON.stringify(esperado.lancamentos[23][1]) && dia[1].autor === 'membro')
  t('extrato: mantém saldoBanco', (out[k] as { saldoBanco: string }).saldoBanco === '10')
  const vazio = aplicarLancamento(a1.acao, {}, { baseId: 'w-2', autor: 'eu' })
  t('extrato: mês novo nasce', (vazio[k] as typeof esperado).lancamentos[23].length === 1)
}
if (a3.ok) {
  // Compra no dia 23 com fechamento 20: vai para a fatura seguinte (dez, jan, fev).
  const refs = mesesDaAcao(a3.acao)
  t('meses lidos: da compra até a última parcela', refs.length === 4 && refs[0].mes === 10 && refs[3].ano === 2027 && refs[3].mes === 1)
  const out = aplicarLancamento(a3.acao, {}, { baseId: 'w-3', autor: 'eu' })
  const esperado = lancarNaFatura({}, { cartao: { id: 'nu', diaFechamento: 20 }, ano: 2026, mes: 10, dia: 23, tipoDaCategoria: 'saida', categoria: 'Lazer', descricao: 'Lazer', valorParcela: 116.66, valores: dividirParcelas(350, 3), parcelas: 3, baseId: 'w-3' })
  t('fatura: mesmos meses do Lançar', JSON.stringify(Object.keys(out).sort()) === JSON.stringify(Object.keys(esperado).sort()))
  t('fatura: dez/26 a fev/27', Object.keys(out).sort().join() === ['nu-2026-12', 'nu-2027-01', 'nu-2027-02'].join())
  const p1 = (out['nu-2026-12'] as { lancamentos: Record<number, Record<string, unknown>[]> }).lancamentos[23][0]
  t('fatura: compra é entrada, total dividido, autor', p1.tipo === 'entrada' && p1.valor === 116.68 && p1.parcelas === 3 && p1.autor === 'eu' && p1.consolidado === true)
  // Fechamento do mês adiado para o dia 25 (fechamentoOverride): a compra do dia 23 fica em novembro.
  const comOverride = aplicarLancamento(a3.acao, { 'nu-2026-11': { lancamentos: {}, fechamentoOverride: 25 } }, { baseId: 'w-4', autor: 'eu' })
  t('fatura: respeita o fechamento do mês', 'nu-2026-11' in comOverride && !('nu-2027-02' in comOverride))
}

// Entrada: API oficial da Meta (escolhida no mesmo dia) e Z-API.
{
  const meta = (m: unknown) => ({ object: 'whatsapp_business_account', entry: [{ id: '1', changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', metadata: { phone_number_id: '9' }, contacts: [{ wa_id: '554788231323' }], ...(m ? { messages: [m] } : { statuses: [{ id: 'wamid.s', status: 'delivered' }] }) } }] }] })
  const e1 = lerEntrada(meta({ from: '554788231323', id: 'wamid.A', type: 'text', text: { body: '47 mercado' } }))
  t('meta: texto, número e id', e1.telefone === '554788231323' && e1.messageId === 'wamid.A' && e1.texto === '47 mercado' && !e1.ignorar && !e1.midia)
  t('meta: status de entrega é ignorado', lerEntrada(meta(null)).ignorar)
  const e2 = lerEntrada(meta({ from: '554788231323', id: 'wamid.B', type: 'audio', audio: { id: 'x' } }))
  t('meta: áudio é mídia, sem texto', e2.midia && e2.texto === '' && !e2.ignorar)
  t('meta: embrulhado pelo n8n em body', lerEntrada({ headers: {}, body: meta({ from: '5547988231323', id: 'wamid.C', type: 'text', text: { body: 'SIM' } }) }).texto === 'SIM')
  const z = lerEntrada({ type: 'ReceivedCallback', phone: '5547988231323', messageId: 'Z1', text: { message: 'oi' } })
  t('z-api: continua lida', z.telefone === '5547988231323' && z.texto === 'oi' && z.messageId === 'Z1' && !z.ignorar)
  t('z-api: enviada por mim é ignorada', lerEntrada({ type: 'ReceivedCallback', phone: '5547988231323', fromMe: true, text: { message: 'x' } }).ignorar)
  t('z-api: grupo é ignorado', lerEntrada({ type: 'ReceivedCallback', phone: '1203-group', isGroup: true, text: { message: 'x' } }).ignorar)
  t('lixo é ignorado', lerEntrada('x').ignorar && lerEntrada(null).ignorar)
}

console.log(`prova127: ${ok} ok, ${falha} falhas`)
if (falha) process.exit(1)
