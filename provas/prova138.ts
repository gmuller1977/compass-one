// prova138 — Fatura paga em parte (24/11/2026, pedido do Guilherme: "se a
// fatura é 700, mas o usuário paga apenas parte, como fica o saldo?").
// O que faltou vai, se a pessoa quiser, para a fatura seguinte como
// `saldoAnterior`: soma no total e no que sai do banco, nunca numa categoria.
import { contas, categoriasBase, planos, depsDe, extratoData, faturaData } from './familia'
import { saldoRealizadoConta, totalFatura } from '../src/utils/saldoConta'
import { construirRealizadoMes } from '../src/utils/realizadoMes'
import { confirmarPagamento } from '../src/utils/pagarConta'
import { valorConferido } from '../src/utils/conferirFatura'
import {
  faltouPagar, levarParaProximaFatura, chavesDaFatura, saldoAnteriorDe, rotuloDoSaldoAnterior, vencimentoDaSeguinte,
} from '../src/utils/saldoDaFatura'

let ok = 0, falhas = 0
const t = (nome: string, cond: boolean, extra?: unknown) => {
  if (cond) ok++
  else { falhas++; console.log('FALHOU:', nome, extra !== undefined ? JSON.stringify(extra) : '') }
}
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))
const perto = (a: number, b: number) => Math.abs(a - b) < 1e-6
const xp = contas.find(c => c.id === 'xp')!

// Regras pequenas.
t('faltou: 700 pagando 500 = 200', faltouPagar(700, 500) === 200)
t('faltou: pagou tudo ou mais = 0', faltouPagar(700, 700) === 0 && faltouPagar(700, 720) === 0)
const ch = chavesDaFatura(xp, 2026, 9) // XP fecha 3, vence 10: a fatura de outubro vence em outubro
t('chaves: a de outubro e a seguinte', ch.paga === 'xp-2026-10' && ch.seguinte === 'xp-2026-11' && ch.de === '2026-10', ch)
const nub = contas.find(c => c.id === 'nub')!
const chN = chavesDaFatura(nub, 2026, 10) // Nubank fecha 25, vence 5: vence em novembro a fatura de outubro
t('chaves: cartão que vence no mês seguinte ao fechamento', chN.paga === 'nub-2026-10' && chN.seguinte === 'nub-2026-11', chN)
t('chaves: atravessa o ano', chavesDaFatura(xp, 2026, 11).seguinte === 'xp-2027-01')
t('rótulo e mês da pergunta', rotuloDoSaldoAnterior({ valor: 1, de: '2026-10' }) === 'Saldo da fatura de outubro'
  && vencimentoDaSeguinte(2026, 9) === 'novembro' && vencimentoDaSeguinte(2026, 11) === 'janeiro')

// A fatura do XP de outubro tem 250. A pessoa paga 150 e leva 100.
const ext = clone(extratoData)
ext['sic-2026-10'] = confirmarPagamento(ext['sic-2026-10'], 'cartao-xp', 150, 250)
const levada = levarParaProximaFatura(clone(faturaData), xp, 2026, 9, faltouPagar(250, 150))
t('leva 100 para a fatura de novembro', saldoAnteriorDe(levada['xp-2026-11']) === 100 && levada['xp-2026-11'].saldoAnterior.de === '2026-10')
t('as compras da fatura seguinte ficam', levada['xp-2026-11'].lancamentos[1].length === 2)

// Total da fatura seguinte soma o saldo.
const antesNov = totalFatura('xp', 2026, 10, contas, faturaData)
const depoisNov = totalFatura('xp', 2026, 10, contas, levada)
t('total da fatura seguinte: 555 + 100', perto(depoisNov - antesNov, 100) && perto(depoisNov, 655), { antesNov, depoisNov })

// Banco: em outubro saíram 150, não 250.
const base = { ...depsDe('pessimista'), extratoData: ext, faturaData: levada }
const sicOutAntes = saldoRealizadoConta('sic', 2026, 9, depsDe('pessimista'))
const sicOut = saldoRealizadoConta('sic', 2026, 9, base)
t('Sicredi de outubro fica 100 acima (pagou 150)', perto(sicOut - sicOutAntes, 100), { sicOutAntes, sicOut })

// Pagando a fatura de novembro inteira, os 100 saem do banco e o fim de novembro empata com quem pagou tudo.
const extNov = clone(ext)
extNov['sic-2026-11'] = confirmarPagamento(extNov['sic-2026-11'] ?? { lancamentos: {} }, 'cartao-xp', depoisNov, depoisNov)
const extNovTudo = clone(extratoData)
extNovTudo['sic-2026-11'] = confirmarPagamento(extNovTudo['sic-2026-11'] ?? { lancamentos: {} }, 'cartao-xp', antesNov, antesNov)
const fimParcial = saldoRealizadoConta('sic', 2026, 10, { ...base, extratoData: extNov })
const fimTudo = saldoRealizadoConta('sic', 2026, 10, { ...depsDe('pessimista'), extratoData: extNovTudo })
t('pagou 150 + 655 = quem pagou 250 + 555 (sem juros)', perto(fimParcial, fimTudo), { fimParcial, fimTudo })

// Não é gasto: o realizado de novembro não muda.
const real = (f: any) => construirRealizadoMes({ ano: 2026, mes: 10, extratoData: ext, faturaData: f, contas, categorias: categoriasBase, planoAno: planos[2026] })
const somaSaidas = (r: any) => Object.values(r.saidasMap).reduce((s: number, x: any) => s + x.total, 0)
t('o saldo levado não entra em categoria nenhuma', perto(somaSaidas(real(levada)), somaSaidas(real(faturaData))))

// Conferência: o saldo levado conta como conferido.
t('conferido: o saldo levado já entra', valorConferido(levada['xp-2026-11'], 30) === 100)

// Desfazer.
const tirado = levarParaProximaFatura(levada, xp, 2026, 9, 0)
t('"Não levar" / desmarcar tira o saldo', tirado['xp-2026-11'].saldoAnterior === undefined && tirado['xp-2026-11'].lancamentos[1].length === 2)
const deOutro = { ...clone(faturaData), 'xp-2026-11': { lancamentos: {}, saldoAnterior: { valor: 40, de: '2026-09' } } }
t('tirar não apaga saldo vindo de outra fatura', levarParaProximaFatura(deOutro, xp, 2026, 9, 0) === deOutro)
t('levar zero sem nada levado não muda nada', levarParaProximaFatura(faturaData, xp, 2026, 9, 0) === faturaData)
const semMes = levarParaProximaFatura({} as any, xp, 2026, 9, 80)
t('cria o mês da fatura seguinte quando ainda não existe', saldoAnteriorDe(semMes['xp-2026-11']) === 80)

console.log(`prova138: ${ok} ok, ${falhas} falhas`)
if (falhas) process.exit(1)
