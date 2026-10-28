// prova101 (28/10/2026): conferir a fatura com o banco. Quantidade no dia e
// marca de conferida; nenhum número da fatura muda.
import { textoQtdCompras, alternarConferido, desmarcarTodos, resumoConferidos, estaConferido } from '../src/utils/conferirFatura'
let ok = 0, falha = 0
const t = (n: string, c: boolean) => { c ? ok++ : (falha++, console.log('FALHA', n)) }
const mes = { faturaAtual: '', lancamentos: { 3: [{ id: 'v-1', valor: 10 }, { id: 'v-2', valor: 20 }], 15: [{ id: 'v-3-2', valor: 30 }] } }
t('singular e plural', textoQtdCompras(1) === '1 compra' && textoQtdCompras(3) === '3 compras' && textoQtdCompras(0) === '0 compras')
t('nada conferido', resumoConferidos(mes, 31).conferidas === 0 && resumoConferidos(mes, 31).total === 3)
const m1 = alternarConferido(mes, 'v-2')
t('marca uma', estaConferido(m1, 'v-2') && resumoConferidos(m1, 31).conferidas === 1)
t('não mexe nos lançamentos', m1.lancamentos === mes.lancamentos && m1.faturaAtual === mes.faturaAtual)
t('não muda o original', mes.lancamentos[3].length === 2 && !('conferidos' in mes))
const m2 = alternarConferido(m1, 'v-2')
t('desmarcar tira a chave', !estaConferido(m2, 'v-2') && Object.keys(m2.conferidos ?? {}).length === 0)
const m3 = alternarConferido(alternarConferido(alternarConferido(mes, 'v-1'), 'v-2'), 'v-3-2')
t('todas', resumoConferidos(m3, 31).conferidas === 3)
const excluida = { ...m3, lancamentos: { 3: [{ id: 'v-1', valor: 10 }] } }
t('marca de compra excluída não conta', resumoConferidos(excluida, 31).conferidas === 1 && resumoConferidos(excluida, 31).total === 1)
t('desmarcar todas', resumoConferidos(desmarcarTodos(m3), 31).conferidas === 0)
console.log(`prova101: ${ok} ok, ${falha} falhas`)
if (falha) process.exit(1)
