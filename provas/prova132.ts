// prova132 — Datas e saldos (24/11/2026, revisão de 24/11, A4): transferência,
// saldo desde, saldo informado, dia da fixa, dias da fatura, fatura da compra
// e melhor dia do cartão. Cada regra tem um caso que já deu problema.
process.env.TZ = 'America/Sao_Paulo'
import { CARTEIRA_ID, destinosDaTransferencia, descricoesDaTransferencia } from '../src/utils/transferencia'
import { dataDoSaldo, diaDoSaldo, lancamentoAntesDoSaldo, isoDoDia } from '../src/utils/saldoDesde'
import { saldoInformado, saldoInformadoDaCarteira } from '../src/utils/saldoInformado'
import { diaUtilOuProximo, diaEfetivoFixa, faturaEhAutomatica, ehFimDeSemana } from '../src/utils/diaDaFixa'
import { diasNoMesDe, diaNoMes, ajustarDiasDoMes, ajustarDiasDasFaturas } from '../src/utils/diasDaFatura'
import { faturaDaCompra, diasParaPagar, melhorDiaDeCompra } from '../src/utils/melhorDiaCartao'
import { mesDaFaturaDaCompra } from '../src/utils/lancamentoRapido'

let ok = 0, falhas = 0
const t = (nome: string, cond: boolean, extra?: unknown) => {
  if (cond) ok++
  else { falhas++; console.log('FALHOU:', nome, extra !== undefined ? JSON.stringify(extra) : '') }
}
const iso = (d: Date) => isoDoDia(d)

// ---------- Transferência ----------
{
  const bancos = [{ id: 'sic', nome: 'Sicredi' }, { id: 'cx', nome: 'Conta', banco: 'Caixa' }, { id: 'inv', nome: 'Poupança', tipo: 'poupanca' }]
  const d = destinosDaTransferencia(bancos, 'sic')
  t('destinos do banco: os outros bancos + a carteira, sem ele mesmo', d.map(x => x.id).join() === 'cx,inv,dinheiro', d)
  t('destinos: nome com banco e marca de investimento', d[0].nome === 'Conta — Caixa' && d[1].nome.endsWith('· Investimento'))
  t('destinos da carteira: só bancos', destinosDaTransferencia(bancos, CARTEIRA_ID).every(x => x.id !== CARTEIRA_ID))

  const saque = descricoesDaTransferencia({ origemId: 'sic', destinoId: CARTEIRA_ID, tipo: 'saida', nomeOrigem: 'Sicredi', nomeDestino: 'Dinheiro' })
  t('banco → carteira é Saque, e na carteira vai o banco', saque.primaria === 'Saque' && saque.espelho === 'Saque · Sicredi', saque)
  const dep = descricoesDaTransferencia({ origemId: CARTEIRA_ID, destinoId: 'sic', tipo: 'saida', nomeOrigem: 'Dinheiro', nomeDestino: 'Sicredi' })
  t('carteira → banco é Depósito', dep.primaria === 'Depósito · Sicredi' && dep.espelho === 'Depósito', dep)
  const entreBancos = descricoesDaTransferencia({ origemId: 'sic', destinoId: 'cx', tipo: 'saida', nomeOrigem: 'Sicredi', nomeDestino: 'Caixa' })
  t('banco → banco: setas', entreBancos.primaria === '→ Caixa' && entreBancos.espelho === '← Sicredi')
  const texto = descricoesDaTransferencia({ origemId: 'sic', destinoId: 'cx', tipo: 'entrada', nomeOrigem: 'S', nomeDestino: 'C', texto: '  Reserva ' })
  t('texto digitado vale nas duas pontas', texto.primaria === 'Reserva' && texto.espelho === 'Reserva')
}

// ---------- Saldo desde ----------
{
  const hoje = new Date(2026, 9, 18, 23, 30) // 18/10 às 23h30: não pode virar 19
  t('dataDoSaldo hoje, à noite', dataDoSaldo('hoje', hoje) === '2026-10-18')
  t('dataDoSaldo dia 1º', dataDoSaldo('dia1', hoje) === '2026-10-01')
  t('diaDoSaldo', diaDoSaldo('2026-10-01') === '1º/10' && diaDoSaldo('2026-10-18') === '18/10')
  const conta = { tipo: 'corrente', saldoInicialDesde: '2026-10-18' } as any
  t('lançar antes da data trava', !!lancamentoAntesDoSaldo(conta, 2026, 9, 17))
  t('lançar no dia da data passa', lancamentoAntesDoSaldo(conta, 2026, 9, 18) === null)
  t('mês anterior trava (comparação de texto com zero à esquerda)', !!lancamentoAntesDoSaldo(conta, 2026, 8, 30))
  t('ano seguinte passa', lancamentoAntesDoSaldo(conta, 2027, 0, 1) === null)
  t('conta sem data nunca trava', lancamentoAntesDoSaldo({ tipo: 'corrente' } as any, 2020, 0, 1) === null && lancamentoAntesDoSaldo(undefined, 2020, 0, 1) === null)
  t('cartão fala de fatura', lancamentoAntesDoSaldo({ tipo: 'cartao', saldoInicialDesde: '2026-10-18' } as any, 2026, 9, 1)!.includes('fatura'))
}

// ---------- Saldo informado ----------
{
  t('positivo vale', saldoInformado({ saldoBanco: '1.234,56' }) === 1234.56)
  t('vazio é null', saldoInformado({ saldoBanco: '  ' }) === null && saldoInformado(undefined) === null)
  t('zero antigo (sem marca) é null', saldoInformado({ saldoBanco: '0,00' }) === null)
  t('zero com marca vale', saldoInformado({ saldoBanco: '0,00', saldoBancoInformado: true }) === 0)
  t('negativo com marca vale (cheque especial)', saldoInformado({ saldoBanco: '-150,00', saldoBancoInformado: true }) === -150)
  t('negativo sem marca é null', saldoInformado({ saldoBanco: '-150,00' }) === null)
  t('carteira: zero sem marca vale', saldoInformadoDaCarteira({ saldoBanco: '0,00' }) === 0 && saldoInformadoDaCarteira({}) === null)
}

// ---------- Dia da fixa ----------
{
  // novembro/2026: dia 7 é sábado, 8 domingo, 30 segunda.
  t('fim de semana', ehFimDeSemana(7, 10, 2026) && ehFimDeSemana(8, 10, 2026) && !ehFimDeSemana(9, 10, 2026))
  t('dia útil: sábado vai para segunda', diaUtilOuProximo(7, 10, 2026, 30) === 9)
  t('dia útil: fim do mês não passa do último dia', diaUtilOuProximo(31, 9, 2026, 31) === 31) // 31/10/2026 é sábado
  const f = { id: 'alu', diaVencimento: 7 }
  t('automático cai no dia útil', diaEfetivoFixa(f, undefined, true, 10, 2026, 30) === 9)
  t('boleto fica no dia do cadastro', diaEfetivoFixa(f, undefined, false, 10, 2026, 30) === 7)
  t('dia movido no mês vence tudo', diaEfetivoFixa(f, { alu: 3 }, true, 10, 2026, 30) === 3)
  t('fatura automática: explícito ou conta de pagamento sem forma', faturaEhAutomatica({ formaPagamentoFatura: 'automatico' })
    && faturaEhAutomatica({ contaPagamentoId: 'sic' }) && !faturaEhAutomatica({ formaPagamentoFatura: 'boleto', contaPagamentoId: 'sic' }) && !faturaEhAutomatica({}))
}

// ---------- Dias da fatura (parcela no dia 29/30/31) ----------
{
  t('dias no mês: fevereiro bissexto e não', diasNoMesDe(2028, 1) === 29 && diasNoMesDe(2027, 1) === 28)
  t('diaNoMes corta no último', diaNoMes(31, 2026, 10) === 30 && diaNoMes(15, 2026, 10) === 15)
  const fev = { lancamentos: { 10: [{ id: 'a' }], 29: [{ id: 'b' }], 31: [{ id: 'c' }] } }
  const aj = ajustarDiasDoMes(fev, 2027, 1) as any
  t('fevereiro/2027: 29 e 31 vão para o 28, na ordem', aj.lancamentos[28].map((x: any) => x.id).join() === 'b,c' && !aj.lancamentos[29] && !aj.lancamentos[31])
  t('nenhum lançamento se perde', Object.values(aj.lancamentos).flat().length === 3)
  const certo = { lancamentos: { 30: [{ id: 'x' }] } }
  t('nada a mudar devolve o MESMO objeto (gravação por identidade)', ajustarDiasDoMes(certo, 2026, 10) === certo)
  const mapa = { 'xp-2027-02': fev, 'xp-2026-11': certo }
  const ajMapa = ajustarDiasDasFaturas(mapa)
  t('mapa: só o mês com problema muda', ajMapa !== mapa && ajMapa['xp-2026-11'] === certo && ajMapa['xp-2027-02'] !== fev)
  const semProblema = { 'xp-2026-11': certo }
  t('mapa sem problema devolve o MESMO mapa', ajustarDiasDasFaturas(semProblema) === semProblema)
}

// ---------- Fatura da compra e melhor dia ----------
{
  const xp = { diaFechamento: 22, diaVencimento: 1 }
  t('compra antes do fechamento: fatura do mês', JSON.stringify(mesDaFaturaDaCompra(xp, 2026, 9, 21)) === '{"ano":2026,"mes":9}')
  t('compra NO dia do fechamento: fatura seguinte (23/10/2026)', JSON.stringify(mesDaFaturaDaCompra(xp, 2026, 9, 22)) === '{"ano":2026,"mes":10}')
  t('dezembro vira janeiro do ano seguinte', JSON.stringify(mesDaFaturaDaCompra(xp, 2026, 11, 25)) === '{"ano":2027,"mes":0}')
  t('fechamento 31 em fevereiro vale no dia 28', JSON.stringify(mesDaFaturaDaCompra({ diaFechamento: 31 }, 2027, 1, 28)) === '{"ano":2027,"mes":2}')
  t('cartão sem fechamento: mês da compra', JSON.stringify(mesDaFaturaDaCompra({} as any, 2026, 5, 30)) === '{"ano":2026,"mes":5}')

  const f = faturaDaCompra(xp, new Date(2026, 9, 10))
  t('fatura: fecha 22/10 e vence 01/11 (vencimento antes do fechamento = mês seguinte)', iso(f.fechaEm) === '2026-10-22' && iso(f.venceEm) === '2026-11-01', [iso(f.fechaEm), iso(f.venceEm)])
  t('dias para pagar', diasParaPagar(new Date(2026, 9, 10, 18), f) === 22)
  const nub = { diaFechamento: 3, diaVencimento: 10 }
  const fn = faturaDaCompra(nub, new Date(2026, 9, 2))
  t('fatura com vencimento depois do fechamento: mesmo mês', iso(fn.fechaEm) === '2026-10-03' && iso(fn.venceEm) === '2026-10-10')

  const m = melhorDiaDeCompra(xp, new Date(2026, 9, 10))
  t('melhor dia = o próprio dia do fechamento', iso(m.data) === '2026-10-22' && iso(m.fatura.venceEm) === '2026-12-01' && m.dias === 40, [iso(m.data), iso(m.fatura.venceEm), m.dias])
  const hojeFecha = melhorDiaDeCompra(xp, new Date(2026, 9, 22))
  t('fecha hoje: o melhor dia é hoje', iso(hojeFecha.data) === '2026-10-22')
  const depois = melhorDiaDeCompra(xp, new Date(2026, 9, 23))
  t('passou do fechamento: o do mês seguinte', iso(depois.data) === '2026-11-22')
  // controle: comprar no melhor dia rende mais prazo que na véspera
  const vespera = faturaDaCompra(xp, new Date(2026, 9, 21))
  t('controle: a véspera do fechamento tem prazo menor', diasParaPagar(new Date(2026, 9, 21), vespera) < m.dias)
}

console.log(`prova132: ${ok} ok, ${falhas} falhas`)
if (falhas) process.exit(1)
