// prova103 (28/10/2026): trocar de cartão em Lançamentos > Cartão. Pedido do
// Guilherme: o Sicredi já fechou (fatura de dezembro) e o XP ainda não
// (novembro); estando na fatura em aberto de um, a troca vai para a fatura em
// aberto do outro. Mês olhado de propósito, que não é a fatura em aberto, fica.
import { faturaAbertaNaTela, mesmoMes, type MesRef } from '../src/utils/lancarPorMes'
let ok = 0, falha = 0
const t = (n: string, c: boolean) => { c ? ok++ : (falha++, console.log('FALHA', n)) }

const hoje = new Date(2026, 9, 28)
const sic = { diaFechamento: 25, diaVencimento: 5 }   // fechou dia 25 → vence em dezembro
const xp  = { diaFechamento: 30, diaVencimento: 7 }   // aberto → vence em novembro
const nu  = { diaFechamento: 28, diaVencimento: 28 }  // fecha HOJE → fatura seguinte

// A mesma decisão do efeito da FaturaCartao.
function aoTrocar(de: typeof sic, para: typeof sic, naTela: MesRef): MesRef {
  return mesmoMes(faturaAbertaNaTela(de, hoje), naTela) ? faturaAbertaNaTela(para, hoje) : naTela
}

t('Sicredi fechado: aberta em dezembro', mesmoMes(faturaAbertaNaTela(sic, hoje), { ano: 2026, mes: 11 }))
t('XP aberto: aberta em novembro', mesmoMes(faturaAbertaNaTela(xp, hoje), { ano: 2026, mes: 10 }))
t('no dia do fechamento já é a seguinte', mesmoMes(faturaAbertaNaTela(nu, hoje), { ano: 2026, mes: 10 }))
t('o relato: Sicredi dez → XP nov', mesmoMes(aoTrocar(sic, xp, { ano: 2026, mes: 11 }), { ano: 2026, mes: 10 }))
t('a volta: XP nov → Sicredi dez', mesmoMes(aoTrocar(xp, sic, { ano: 2026, mes: 10 }), { ano: 2026, mes: 11 }))
t('olhando janeiro no Sicredi, fica janeiro', mesmoMes(aoTrocar(sic, xp, { ano: 2027, mes: 0 }), { ano: 2027, mes: 0 }))
t('olhando outubro (passado) no XP, fica outubro', mesmoMes(aoTrocar(xp, sic, { ano: 2026, mes: 9 }), { ano: 2026, mes: 9 }))
// Controle: dezembro no XP não é a aberta dele, então trocar para o Sicredi mantém dezembro.
t('controle: dezembro no XP fica dezembro', mesmoMes(aoTrocar(xp, sic, { ano: 2026, mes: 11 }), { ano: 2026, mes: 11 }))
const viradaDez = faturaAbertaNaTela(sic, new Date(2026, 11, 26))
t('virada do ano: fechado em dezembro vence em fevereiro', viradaDez.ano === 2027 && viradaDez.mes === 1)

console.log(`prova103: ${ok} ok, ${falha} falhas`)
if (falha) process.exit(1)
