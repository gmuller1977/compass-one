// prova108 (30/10/2026): as bolinhas fazem a conferência da fatura (ideia do
// Guilherme). O topo mostra o conferido e quanto falta; tudo conferido e o
// valor do banco informado, compara com o banco.
import { conferenciaDaFatura as conf, valorConferido, faturaLadoALado as lado } from '../src/utils/conferirFatura'
let ok = 0, falha = 0
const t = (n: string, c: boolean) => { c ? ok++ : (falha++, console.log('FALHA', n)) }
const perto = (a: number, b: number) => Math.abs(a - b) < 0.005

const dm = (conferidos: Record<string, boolean>) => ({
  lancamentos: {
    3: [{ id: 'a', tipo: 'entrada', valor: 600 }, { id: 'b', tipo: 'entrada', valor: 450 }],
    9: [{ id: 'c', tipo: 'saida', valor: 50 }], // estorno abate
  },
  conferidos,
})
const total = 1000

const nenhuma = conf(dm({}), 31, { totalFatura: total, informado: 0 })
t('nenhuma bolinha: falta tudo', nenhuma.estado === 'conferindo' && nenhuma.conferido === 0 && perto(nenhuma.falta, 1000))
const umaCompra = conf(dm({ a: true }), 31, { totalFatura: total, informado: 0 })
t('uma compra: falta 400', umaCompra.estado === 'conferindo' && perto(umaCompra.falta, 400))
t('estorno conferido abate', perto(valorConferido(dm({ a: true, c: true }), 31), 550))
const banco = conf(dm({ a: true }), 31, { totalFatura: total, informado: 1080 })
t('banco informado mas falta conferir: segue nas bolinhas', banco.estado === 'conferindo')
const tudo = conf(dm({ a: true, b: true, c: true }), 31, { totalFatura: total, informado: 0 })
t('tudo conferido sem banco', tudo.estado === 'tudo-conferido' && perto(tudo.conferido, 1000))
const comBanco = conf(dm({ a: true, b: true, c: true }), 31, { totalFatura: total, informado: 1080 })
t('tudo conferido + banco: falta lançar 80', comBanco.estado === 'banco' && perto(comBanco.diferenca, 80) && !comBanco.igual)
const igual = conf(dm({ a: true, b: true, c: true }), 31, { totalFatura: total, informado: 1000 })
t('tudo conferido + banco igual', igual.estado === 'banco' && igual.igual)
t('sem compras e sem banco', conf({ lancamentos: {} }, 31, { totalFatura: 0, informado: 0 }).estado === 'sem-compras')
t('marca de compra excluída não conta', conf(dm({ a: true, b: true, c: true, x: true }), 31, { totalFatura: total, informado: 0 }).estado === 'tudo-conferido')
const max = conf({ lancamentos: { 1: [{ id: 'm', tipo: 'entrada', valor: 999999.99 }] } }, 31, { totalFatura: 999999.99, informado: 0 })
t('999.999,99 sem bolinha', max.estado === 'conferindo' && perto(max.falta, 999999.99))

// 31/10/2026: os dois totais lado a lado. A diferença com o banco aparece
// mesmo com compra sem bolinha; o lado do Compass diz quanto falta conferir.
const l1 = lado(dm({ a: true }), 31, { totalFatura: total, informado: 1080 })
// 02/11/2026: o já conferido aparece junto do que falta.
t('lado: conferido 600, falta conferir 400 e banco +80', l1.compass.estado === 'falta-conferir' && perto(l1.compass.falta, 400)
  && perto(l1.compass.conferido, total - 400)
  && l1.banco.estado === 'comparado' && perto(l1.banco.diferenca, 80) && !l1.banco.igual)
const l2 = lado(dm({ a: true, b: true, c: true }), 31, { totalFatura: total, informado: null })
t('lado: tudo conferido, banco não informado', l2.compass.estado === 'tudo-conferido' && l2.banco.estado === 'nao-informada')
const l3 = lado({ lancamentos: {} }, 31, { totalFatura: 0, informado: 0 })
t('lado: sem compras, banco zero informado é igual', l3.compass.estado === 'sem-compras' && l3.banco.estado === 'comparado' && l3.banco.igual)
const l4 = lado(dm({}), 31, { totalFatura: total, informado: 900 })
t('lado: banco menor = a mais no Compass', l4.banco.estado === 'comparado' && perto(l4.banco.diferenca, -100))

console.log(`prova108: ${ok} ok, ${falha} falhas`)
if (falha) process.exit(1)
