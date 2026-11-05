// prova114 (05/11/2026): fixas programadas ficam fora da lista e do total da
// fatura até o dia; etiqueta Fixa/Variável pelo cadastro.
import { ehFixaProgramada, separarProgramadas, fixaOuVariavel } from '../src/utils/fixaNoCartao'
import type { Categoria } from '../src/context/AppContext'

let ok = 0, falhas = 0
const t = (nome: string, c: boolean) => { if (c) ok++; else { falhas++; console.log('FALHA:', nome) } }

const hoje = new Date(2026, 10, 5)
const fixaFutura = { id: 'fixa-a-2026-12', tipo: 'entrada', categoria: 'Netflix', valor: 50, fixaId: 'a', diaCompra: 10, mesCompra: 10, anoCompra: 2026 }
const fixaHoje = { ...fixaFutura, id: 'fixa-b', fixaId: 'b', diaCompra: 5 }
const fixaPassada = { ...fixaFutura, id: 'fixa-c', fixaId: 'c', diaCompra: 1 }
const compraFutura = { id: 'x', tipo: 'entrada', categoria: 'Mercado', valor: 30, diaCompra: 20, mesCompra: 10, anoCompra: 2026 }

t('fixa depois de hoje é programada', ehFixaProgramada(fixaFutura, hoje))
t('fixa de hoje não é programada', !ehFixaProgramada(fixaHoje, hoje))
t('fixa passada não é programada', !ehFixaProgramada(fixaPassada, hoje))
t('compra comum nunca é programada', !ehFixaProgramada(compraFutura, hoje))
t('virada do ano: dezembro > novembro', ehFixaProgramada({ ...fixaFutura, diaCompra: 1, mesCompra: 0, anoCompra: 2027 }, hoje))

const dm = { faturaAtual: '', lancamentos: { 10: [fixaFutura, compraFutura], 5: [fixaHoje], 1: [fixaPassada] } as Record<number, typeof fixaFutura[]> }
const { visivel, programadas } = separarProgramadas(dm, hoje)
const total = (d: typeof dm) => Object.values(d.lancamentos).flat().reduce((a, l) => a + l.valor, 0)
t('uma programada', programadas.length === 1 && programadas[0].l.id === 'fixa-a-2026-12' && programadas[0].dia === 10)
t('total sem a programada', total(visivel) === 130)
t('compra do mesmo dia continua', visivel.lancamentos[10].length === 1 && visivel.lancamentos[10][0].id === 'x')
t('o mês original não muda', dm.lancamentos[10].length === 2)
// No dia, entra.
const noDia = separarProgramadas(dm, new Date(2026, 10, 10))
t('no dia, nenhuma programada e total cheio', noDia.programadas.length === 0 && total(noDia.visivel) === 180)
t('sem programada, mesmo objeto', noDia.visivel === dm)

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
