// prova100 (27/10/2026): vírgula automática no valor do Lançar do celular.
// Pedido do Guilherme: os dígitos entram pelos centavos, como no app do banco.
import { mascaraCentavos, parseValor, trocarSinal, valorNaMascara } from '../src/utils/moeda'
let ok = 0, falha = 0
const t = (n: string, c: boolean) => { c ? ok++ : (falha++, console.log('FALHA', n, )) }
t('7399 → 73,99', mascaraCentavos('7399') === '73,99')
t('5 → 0,05', mascaraCentavos('5') === '0,05')
t('vazio', mascaraCentavos('') === '' && mascaraCentavos('0') === '')
t('apagar um dígito: 73,9 → 7,39', mascaraCentavos('73,9') === '7,39')
t('digitar mais um: 73,991 → 739,91', mascaraCentavos('73,991') === '739,91')
t('milhar', mascaraCentavos('99999999') === '999.999,99')
t('colar "R$ 1.234,56"', mascaraCentavos('R$ 1.234,56') === '1.234,56')
t('parseValor lê o mascarado', parseValor(mascaraCentavos('99999999')) === 999999.99 && parseValor(mascaraCentavos('7399')) === 73.99)
// Saldo do banco (mesmo dia): aceita negativo, e o sinal se troca por botão.
t('sem permissão, o "-" some', mascaraCentavos('-7399') === '73,99')
t('com permissão, o "-" fica', mascaraCentavos('-7399', true) === '-73,99' && parseValor('-73,99') === -73.99)
t('digitar depois do sinal', mascaraCentavos('-73,991', true) === '-739,91')
t('trocar sinal', trocarSinal('73,99') === '-73,99' && trocarSinal('-73,99') === '73,99' && trocarSinal('') === '')
t('valor gravado na máscara', valorNaMascara(1033.49) === '1.033,49' && valorNaMascara(-999999.99) === '-999.999,99' && valorNaMascara(0) === '')
console.log(`prova100: ${ok} ok, ${falha} falhas`)
if (falha) process.exit(1)
