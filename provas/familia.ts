// Família de teste fixa das provas do motor (130 e seguintes). Hoje é
// 15/11/2026: 2 bancos (Sicredi preferida, Caixa), 1 investimento, 2 cartões
// (XP fecha 3 / vence 10, paga pelo Sicredi; Nubank fecha 25 / vence 5, pela
// Caixa) e a carteira com 200. Outubro fechado (Caixa conciliada em 480),
// novembro corrente. Detalhes no comentário de cada bloco.
import type { Deps } from '../src/utils/saldoConta'

export const hoje = new Date(2026, 10, 15) // 15/11/2026: novembro é o mês corrente

// ---------- Cadastro ----------
const conta = (o: object) => ({ cor: '', icone: '', ...o }) as any
export const contas = [
  conta({ id: 'sic', nome: 'Sicredi', banco: 'Sicredi', tipo: 'corrente', saldoInicial: 2000, preferida: true }),
  conta({ id: 'cx', nome: 'Caixa', banco: 'Caixa', tipo: 'corrente', saldoInicial: 500 }),
  conta({ id: 'inv', nome: 'Poupança', banco: 'Caixa', tipo: 'poupanca', saldoInicial: 1000 }),
  conta({ id: 'xp', nome: 'XP', tipo: 'cartao', diaFechamento: 3, diaVencimento: 10, contaPagamentoId: 'sic', formaPagamentoFatura: 'boleto' }),
  conta({ id: 'nub', nome: 'Nubank', tipo: 'cartao', diaFechamento: 25, diaVencimento: 5, contaPagamentoId: 'cx', formaPagamentoFatura: 'boleto' }),
]
const cat = (o: object) => ({ cor: '', icone: '', ativa: true, fixa: false, tipoMovimento: 'banco', formaPagamento: 'pix', ...o }) as any
export const categoriasBase = [
  cat({ id: 'sal', nome: 'Salário', tipo: 'entrada', fixa: true, contaDebitoId: 'sic', diaVencimento: 5, grupo: 'Renda' }),
  cat({ id: 'cli', nome: 'Clientes', tipo: 'entrada', contaDebitoId: 'sic', grupo: 'Renda' }),
  cat({ id: 'fit', nome: 'Fitway', tipo: 'entrada', fixa: true, tipoMovimento: 'dinheiro', formaPagamento: 'dinheiro', diaVencimento: 8, grupo: 'Renda', ativa: false }),
  cat({ id: 'alu', nome: 'Aluguel', tipo: 'saida', fixa: true, contaDebitoId: 'sic', diaVencimento: 10, grupo: 'Casa' }),
  cat({ id: 'luz', nome: 'Luz', tipo: 'saida', fixa: true, contaDebitoId: 'cx', diaVencimento: 20, formaPagamento: 'boleto', grupo: 'Casa' }),
  cat({ id: 'str', nome: 'Streaming', tipo: 'saida', fixa: true, tipoMovimento: 'cartao', formaPagamento: 'cartao', contaDebitoId: 'xp', grupo: 'Lazer' }),
  cat({ id: 'mer', nome: 'Mercado', tipo: 'saida', contaDebitoId: 'sic', grupo: 'Alimentação' }),
  cat({ id: 'laz', nome: 'Lazer', tipo: 'saida', tipoMovimento: 'dinheiro', formaPagamento: 'dinheiro', grupo: 'Lazer' }),
  cat({ id: 'ves', nome: 'Vestuário', tipo: 'saida', tipoMovimento: 'cartao', formaPagamento: 'cartao', grupo: 'Compras' }),
  cat({ id: 'aca', nome: 'Academia', tipo: 'saida', contaDebitoId: 'cx', grupo: 'Saúde', ativa: false }),
]

// ---------- Plano (2026 e 2027, para atravessar o ano) ----------
const linha = (id: string, nome: string, grupo: string, t: string, v: number) => ({ id, nome, grupo, t, v: Array(12).fill(v) })
const planoAno = () => ({
  saldoInicialJan: 0,
  entradas: [linha('sal', 'Salário', 'Renda', 'banco', 5000), linha('cli', 'Clientes', 'Renda', 'banco', 800), linha('fit', 'Fitway', 'Renda', 'dinheiro', 663)],
  saidas: [
    linha('alu', 'Aluguel', 'Casa', 'banco', 1500), linha('luz', 'Luz', 'Casa', 'banco', 200),
    linha('str', 'Streaming', 'Lazer', 'cartao', 55), linha('mer', 'Mercado', 'Alimentação', 'banco', 1000),
    linha('laz', 'Lazer', 'Lazer', 'dinheiro', 300), linha('ves', 'Vestuário', 'Compras', 'cartao', 200),
  ],
})
export const planos: any = { 2026: planoAno(), 2027: planoAno() }

// ---------- Movimento ----------
let seq = 0
const l = (tipo: 'entrada' | 'saida', valor: number, categoria: string, formaPagamento = 'pix') =>
  ({ id: `l${++seq}`, tipo, valor, categoria, descricao: categoria, formaPagamento, tipoLanc: 'variavel' })
export const extratoData: any = {
  // Outubro (fechado): salário e aluguel pagos, fatura do XP paga, mercado; o
  // saldo da Caixa foi conciliado com o banco (conciliação vence no fechado).
  'sic-2026-10': { saldoBanco: '', lancamentos: { 12: [l('saida', 700, 'Mercado')] },
    fixasConsolidadas: { sal: true, alu: true, 'cartao-xp': true } },
  'cx-2026-10': { saldoBanco: '480,00', saldoBancoInformado: true, saldoBancoData: '2026-10-31', lancamentos: { 20: [l('saida', 30, 'Luz', 'boleto')] } },
  // Novembro (corrente): salário e aluguel pagos; luz (dia 20) ainda não;
  // mercado no débito; clientes recebeu parte; academia desativada com gasto.
  'sic-2026-11': { saldoBanco: '', lancamentos: { 6: [l('saida', 300, 'Mercado')], 9: [l('entrada', 300, 'Clientes')] },
    fixasConsolidadas: { sal: true, alu: true } },
  'cx-2026-11': { saldoBanco: '', lancamentos: { 7: [l('saida', 100, 'Academia')] } },
  // Carteira: Fitway recebida em espécie (e desativada depois); lazer estourou.
  'dinheiro-2026-11': { saldoBanco: '', lancamentos: { 11: [l('saida', 450, 'Lazer', 'dinheiro')] },
    fixasConsolidadas: { fit: true } },
}
const compra = (valor: number, categoria: string) => ({ id: `f${++seq}`, tipo: 'entrada', valor, categoria, descricao: categoria })
export const faturaData: any = {
  'xp-2026-10': { lancamentos: { 1: [compra(250, 'Mercado')] } },
  'xp-2026-11': { lancamentos: { 1: [compra(500, 'Mercado'), compra(55, 'Streaming')] } },
  'nub-2026-11': { lancamentos: { 18: [compra(120, 'Vestuário')] } },
}

export const CENARIOS = ['pessimista', 'moderado', 'otimista'] as const
export const depsDe = (cenarioPrevisao: string, categorias = categoriasBase): Deps => ({
  extratoData, faturaData, contas, categorias, planos, saldoInicialDinheiro: 200, cenarioPrevisao,
} as any)
