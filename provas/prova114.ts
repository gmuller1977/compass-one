// prova114 (05/11/2026): fixa lançada sozinha fica fora da lista e do total da
// fatura até ser CONFERIDA (mesmo com o dia já passado); etiqueta Fixa/Variável.
import { ehFixaProgramada, separarProgramadas, fixaOuVariavel } from '../src/utils/fixaNoCartao'
import type { Categoria } from '../src/context/AppContext'

let ok = 0, falhas = 0
const t = (nome: string, c: boolean) => { if (c) ok++; else { falhas++; console.log('FALHA:', nome) } }

const fixaFutura = { id: 'fixa-a', tipo: 'entrada', categoria: 'Netflix', valor: 50, fixaId: 'a', diaCompra: 10, mesCompra: 10, anoCompra: 2026 }
const fixaPassada = { ...fixaFutura, id: 'fixa-c', fixaId: 'c', diaCompra: 1 }
const compra = { id: 'x', tipo: 'entrada', categoria: 'Mercado', valor: 30, diaCompra: 3, mesCompra: 10, anoCompra: 2026 }

t('fixa sem conferir é programada', ehFixaProgramada(fixaFutura, {}))
t('fixa com dia passado, sem conferir, é programada', ehFixaProgramada(fixaPassada, undefined))
t('fixa conferida não é programada', !ehFixaProgramada(fixaFutura, { 'fixa-a': true }))
t('compra comum nunca é programada', !ehFixaProgramada(compra, {}))

const dm = { faturaAtual: '', conferidos: {} as Record<string, boolean>,
  lancamentos: { 10: [fixaFutura], 3: [compra], 1: [fixaPassada] } as Record<number, typeof fixaFutura[]> }
const total = (d: typeof dm) => Object.values(d.lancamentos).flat().reduce((a, l) => a + l.valor, 0)
const s1 = separarProgramadas(dm)
t('duas programadas, ordem pela data', s1.programadas.map(p => p.l.id).join() === 'fixa-c,fixa-a')
t('total só da compra', total(s1.visivel) === 30)
t('o mês original não muda', total(dm) === 130)
t('conferidos preservados', s1.visivel.conferidos === dm.conferidos)

const s2 = separarProgramadas({ ...dm, conferidos: { 'fixa-c': true } })
t('conferida entra no total', total(s2.visivel) === 80 && s2.programadas.length === 1 && s2.programadas[0].l.id === 'fixa-a')
const s3 = separarProgramadas({ ...dm, lancamentos: { 3: [compra] } })
t('sem fixa, mesmo objeto', s3.programadas.length === 0 && s3.visivel.lancamentos[3][0] === compra)

const cats = [
  { id: 'a', nome: 'Netflix', fixa: true },
  { id: 'm', nome: 'Mercado', fixa: false },
  { id: 's1', nome: 'Seguro', descricao: 'Civic', fixa: true },
  { id: 's2', nome: 'Seguro', descricao: 'March', fixa: false },
] as unknown as Categoria[]
t('fixaId é Fixa', fixaOuVariavel({ fixaId: 'zz', categoria: 'Qualquer' }, cats) === 'Fixa')
t('cadastro variável', fixaOuVariavel({ categoria: 'Mercado' }, cats) === 'Variável')
t('variante fixa', fixaOuVariavel({ categoria: 'Seguro', subCategoria: 'Civic' }, cats) === 'Fixa')
t('variante variável', fixaOuVariavel({ categoria: 'Seguro', subCategoria: 'March' }, cats) === 'Variável')
t('ambígua sem variante: sem etiqueta', fixaOuVariavel({ categoria: 'Seguro' }, cats) === null)
t('sem cadastro: sem etiqueta', fixaOuVariavel({ categoria: 'Outra' }, cats) === null)

console.log(`prova114: ${ok} ok, ${falhas} falhas`)
if (falhas) process.exit(1)
