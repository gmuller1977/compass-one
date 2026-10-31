// prova106 (31/10/2026): o Radar mostra a DATA DA COMPRA do cartão, a mesma
// da tela da fatura. Relato do Guilherme: a Netflix de 20/09, lançada em 28/10
// na fatura que vence em novembro, aparecia "28/10" no Radar (o dia em que foi
// gravada) e "20/09" na fatura. Nenhum total muda: só a data mostrada e a ordem.
import { construirRealizadoMes } from '../src/utils/realizadoMes'
let ok = 0, falha = 0
const t = (n: string, c: boolean) => { c ? ok++ : (falha++, console.log('FALHA', n)) }

const xp = { id: 'xp', nome: 'XP', banco: 'XP', tipo: 'cartao', diaFechamento: 29, diaVencimento: 6, saldoInicial: 0, cor: '', icone: '' } as any
const cat = { id: 'st', nome: 'Streaming', descricao: 'Netflix', tipo: 'saida', fixa: false, ativa: true, tipoMovimento: 'cartao', grupo: 'Lazer' } as any
const compra = (id: string, valor: number, extra: Record<string, unknown> = {}) =>
  ({ id, tipo: 'entrada', categoria: 'Streaming', subCategoria: 'Netflix', descricao: 'Streaming', valor, ...extra })
const faturaData = {
  // Fatura de outubro do sistema = chave 2026-10 (compras de 29/09 a 28/10), vence 6/11.
  'xp-2026-10': { lancamentos: {
    28: [compra('a-1', 20.9, { diaCompra: 20, mesCompra: 8, anoCompra: 2026 })], // lançada em 28/10 com data 20/09
    5:  [compra('b-1', 10, { diaCompra: 5, mesCompra: 9, anoCompra: 2026 })],
    12: [compra('c-1', 7)],                                                       // antiga, sem data gravada
    10: [compra('d-2', 30, { parcelas: 3, parcelaAtual: 2, diaCompra: 10, mesCompra: 8, anoCompra: 2026 })],
  } },
}
const rodar = () => construirRealizadoMes({ ano: 2026, mes: 10, extratoData: {}, faturaData, contas: [xp], categorias: [cat], planoAno: undefined })
const r = rodar()
const linha = Object.values(r.saidasMap)[0]
const achar = (v: number) => linha.lancamentos.find(l => l.valor === v)!
const rot = (v: number) => { const l = achar(v); return `${l.dia}/${(l.mesFatura ?? 10) + 1}` }

t('Netflix mostra a data da compra 20/09', rot(20.9) === '20/9')
t('compra com data no mês da fatura: 05/10', rot(10) === '5/10')
t('sem data gravada, vale o dia da fatura: 12/10', rot(7) === '12/10')
t('parcela mostra a data da compra, como a fatura: 10/09', rot(30) === '10/9')
t('total não muda', Math.abs(linha.total - 67.9) < 1e-9)
t('ordem por data: 10/09, 20/09, 05/10, 12/10',
  linha.lancamentos.map(l => l.valor).join(',') === '30,20.9,10,7')
// Controle: a mesma compra sem a data gravada volta ao dia em que foi gravada.
delete (faturaData['xp-2026-10'].lancamentos[28][0] as any).diaCompra
delete (faturaData['xp-2026-10'].lancamentos[28][0] as any).mesCompra
const l2 = Object.values(rodar().saidasMap)[0].lancamentos.find(l => l.valor === 20.9)!
t('controle: sem data gravada, 28/10', l2.dia === 28 && l2.mesFatura === 9)

console.log(`prova106: ${ok} ok, ${falha} falhas`)
if (falha) process.exit(1)
