// prova100 (27/10/2026): vírgula automática no valor do Lançar do celular.
// Pedido do Guilherme: os dígitos entram pelos centavos, como no app do banco.
import { mascaraCentavos, parseValor } from '../src/utils/moeda'
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
console.log(`prova100: ${ok} ok, ${falha} falhas`)
if (falha) process.exit(1)
