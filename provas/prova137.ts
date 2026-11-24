// prova137 — Fatura paga grava o valor pago (24/11/2026, revisão M1, aprovado
// pelo Guilherme). Antes o motor lia o pagamento do total ATUAL da fatura:
// paga com 700, apagar depois uma compra de 200 fazia o app achar que saíram
// 500 do banco, e o saldo mudava desde aquele mês, sem aviso.
import { depsDe, extratoData, faturaData } from './familia'
import { saldoRealizadoConta, saldoBancosEDinheiro } from '../src/utils/saldoConta'
import { confirmarPagamento, comValorDaFaturaPaga, ehFatura } from '../src/utils/pagarConta'
import { tirarPagamento } from '../src/utils/debitoAutomatico'

let ok = 0, falhas = 0
const t = (nome: string, cond: boolean, extra?: unknown) => {
  if (cond) ok++
  else { falhas++; console.log('FALHOU:', nome, extra !== undefined ? JSON.stringify(extra) : '') }
}
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))

// Na família, a fatura do XP de outubro (R$ 250) está paga no Sicredi, sem valor gravado.
const semCompra = (fat: any) => { const f = clone(fat); f['xp-2026-10'].lancamentos[1] = []; return f }

// Controle: como era (sem valor gravado), apagar a compra muda o saldo de outubro.
{
  const antes = saldoRealizadoConta('sic', 2026, 9, depsDe('pessimista'))
  const depois = saldoRealizadoConta('sic', 2026, 9, { ...depsDe('pessimista'), faturaData: semCompra(faturaData) })
  t('controle: sem o valor gravado, apagar a compra da fatura paga sobe o saldo em 250', Math.abs(depois - antes - 250) < 1e-6, { antes, depois })
}

// Com o valor gravado pelo caminho do "Pagar" (Início, Lançar, Norte).
{
  const ext = clone(extratoData)
  const dm = { ...ext['sic-2026-10'], fixasConsolidadas: { ...ext['sic-2026-10'].fixasConsolidadas } }
  delete dm.fixasConsolidadas['cartao-xp']
  ext['sic-2026-10'] = confirmarPagamento(dm, 'cartao-xp', 250, 250)
  t('Pagar: grava o valor mesmo igual ao previsto (fatura)', ext['sic-2026-10'].fixasValorOverride?.['cartao-xp'] === 250)
  const deps = { ...depsDe('pessimista'), extratoData: ext }
  const antes = saldoRealizadoConta('sic', 2026, 9, deps)
  const depois = saldoRealizadoConta('sic', 2026, 9, { ...deps, faturaData: semCompra(faturaData) })
  t('Pagar: apagar a compra depois não muda o saldo do banco', antes === depois, { antes, depois })
  const novembro = (f: any) => saldoBancosEDinheiro(2026, 10, { ...deps, faturaData: f })
  t('Pagar: nem o saldo dos meses seguintes', novembro(faturaData) === novembro(semCompra(faturaData)))
  const desfeito = tirarPagamento(ext['sic-2026-10'], 'cartao-xp')
  t('desfazer o pagamento tira o valor gravado junto', desfeito.fixasValorOverride?.['cartao-xp'] === undefined && desfeito.fixasConsolidadas?.['cartao-xp'] === undefined)
}

// A bolinha de Lançamentos: grava o total daquele momento.
{
  const dm: any = { lancamentos: {}, saldoBanco: '', fixasConsolidadas: { 'cartao-xp': true } }
  t('bolinha: grava o total de agora', comValorDaFaturaPaga(dm, 'cartao-xp', 700).fixasValorOverride['cartao-xp'] === 700)
  const digitado = { ...dm, fixasValorOverride: { 'cartao-xp': 720 } }
  t('bolinha: valor já digitado (juros, IOF) fica', comValorDaFaturaPaga(digitado, 'cartao-xp', 700) === digitado)
  t('bolinha: fatura vazia não grava zero', comValorDaFaturaPaga(dm, 'cartao-xp', 0) === dm)
  t('bolinha: fixa comum não é afetada', comValorDaFaturaPaga(dm, 'alu', 1500) === dm)
}

// Fixa comum segue a regra de antes: valor igual ao previsto não grava.
{
  const dm: any = { lancamentos: {}, saldoBanco: '' }
  t('fixa: valor igual ao previsto não grava (acompanha o plano)', confirmarPagamento(dm, 'alu', 1500, 1500).fixasValorOverride === undefined)
  t('fixa: valor diferente grava', confirmarPagamento(dm, 'alu', 1550, 1500).fixasValorOverride?.alu === 1550)
  t('ehFatura', ehFatura('cartao-xp') && !ehFatura('alu'))
}

console.log(`prova137: ${ok} ok, ${falhas} falhas`)
if (falhas) process.exit(1)
