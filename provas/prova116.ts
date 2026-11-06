// prova116 (06/11/2026): vírgula automática no valor de Lançamentos e da
// fatura no celular (Guilherme: "não está editando os centavos").
import { mascaraCentavos, paraMascara, parseBRL } from '../src/utils/moeda'
let ok = 0, falha = 0
const t = (n: string, c: boolean) => { c ? ok++ : (falha++, console.log('FALHA', n)) }
t('61000 digitado vira 610,00', mascaraCentavos('61000') === '610,00')
t('valor gravado inteiro vira 12.051,00', paraMascara('12051') === '12.051,00')
t('valor gravado com uma casa', paraMascara('12,5') === '12,50')
t('já mascarado fica', paraMascara('1.234,56') === '1.234,56')
t('vazio fica vazio', paraMascara('') === '')
t('apagar um dígito do gravado tira o centavo', mascaraCentavos(paraMascara('12051').slice(0, -1)) === '1.205,10')
t('o lido é o mesmo número', parseBRL(paraMascara('12051')) === 12051)
t('cabe 999.999,99', mascaraCentavos('99999999') === '999.999,99' && parseBRL('999.999,99') === 999999.99)
console.log(`prova116: ${ok} ok, ${falha} falhas`)
if (falha) process.exit(1)
