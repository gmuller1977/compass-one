// prova124 (21/11/2026): a bolinha de conferida marcada ANTES de 06/11 numa
// parcela fica sozinha; ao carregar, a compra parcelada inteira passa a
// conferida. Relatado pelo Guilherme: "na conferência da parcela 1, as
// outras parcelas já deveriam ficar marcadas".
import { propagarConferidasDasCompras, chaveDoMes, alternarConferidaDaCompra } from '../src/utils/serieDeParcelas'
let ok = 0, falha = 0
const t = (n: string, c: boolean) => { c ? ok++ : (falha++, console.log('FALHA', n)) }
type L = { id: string; valor: number; parcelas?: number; parcelaAtual?: number }
type M = { lancamentos: Record<number, L[]>; conferidos?: Record<string, boolean> }
const k = (c: string, a: number, m: number) => chaveDoMes(c, a, m)
const p = (base: string, i: number, n: number): L => ({ id: `${base}-${i}`, valor: 999999.99, parcelas: n, parcelaAtual: i })

// Toldo 12×, parcela 1 conferida em out/2026; Chuteira 5× sem marca; à vista marcada.
const d0: Record<string, M> = {
  [k('sic', 2026, 9)]: { lancamentos: { 26: [p('v-1', 1, 3), p('v-2', 1, 5), { id: 'v-3-1', valor: 10 }] }, conferidos: { 'v-1-1': true, 'v-3-1': true } },
  [k('sic', 2026, 10)]: { lancamentos: { 26: [p('v-1', 2, 3), p('v-2', 2, 5)] } },
  [k('sic', 2026, 11)]: { lancamentos: { 26: [p('v-1', 3, 3), p('v-2', 3, 5)] }, conferidos: {} },
  // Outro cartão com o mesmo id: não se mistura.
  [k('xp', 2026, 10)]: { lancamentos: { 5: [p('v-1', 2, 3)] } },
}
const d = propagarConferidasDasCompras(d0)
t('parcela 2 do toldo conferida', d[k('sic', 2026, 10)].conferidos?.['v-1-2'] === true)
t('parcela 3 do toldo conferida', d[k('sic', 2026, 11)].conferidos?.['v-1-3'] === true)
t('chuteira sem marca segue sem', !d[k('sic', 2026, 10)].conferidos?.['v-2-2'] && !d[k('sic', 2026, 11)].conferidos?.['v-2-3'])
t('outro cartão não herda', !d[k('xp', 2026, 10)].conferidos?.['v-1-2'])
t('mês sem mudança é o mesmo objeto', d[k('sic', 2026, 9)] === d0[k('sic', 2026, 9)] && d[k('xp', 2026, 10)] === d0[k('xp', 2026, 10)])
t('nada a mudar devolve o mesmo mapa', propagarConferidasDasCompras(d) === d)
t('lançamentos não mudam', JSON.stringify(Object.values(d).map(m => m.lancamentos)) === JSON.stringify(Object.values(d0).map(m => m.lancamentos)))
// Marcando a parcela 2 de uma das antigas: a alternância desmarca todas, e a carga não as traz de volta.
const des = alternarConferidaDaCompra(d, { contaId: 'sic', ano: 2026, mes: 10, l: p('v-1', 2, 3), vazio: { lancamentos: {} } })
t('desmarcar tira de todas', !des[k('sic', 2026, 9)].conferidos?.['v-1-1'] && !des[k('sic', 2026, 11)].conferidos?.['v-1-3'])
t('desmarcada não volta ao carregar', propagarConferidasDasCompras(des) === des)
const mar = alternarConferidaDaCompra(des, { contaId: 'sic', ano: 2026, mes: 9, l: p('v-2', 1, 5), vazio: { lancamentos: {} } })
t('marcar a 1ª marca as seguintes', mar[k('sic', 2026, 10)].conferidos?.['v-2-2'] === true && mar[k('sic', 2026, 11)].conferidos?.['v-2-3'] === true)

console.log(`prova124: ${ok} ok, ${falha} falhas`)
if (falha) process.exit(1)
