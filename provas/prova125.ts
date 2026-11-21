// prova125 — a frase "No total, você está gastando R$ X a mais", o Total das
// despesas e os cards do Radar usam UMA conta: Planejado − Gastou, com a fixa
// ainda não paga contando como gasta pelo planejado (21/11/2026, decisão do
// Guilherme depois de "No radar diz que gastei 388 a mais do plano, no resumo
// das despesas diz que tenho disponível 456").
import { balancoDoPlano } from '../src/utils/balancoDoPlano'
import { destaqueDoGrupo, partesDoGrupo } from '../src/components/acompanhamento/radarCores'
import type { Categoria } from '../src/context/AppContext'

let ok = 0, falhas = 0
const conf = (cond: boolean, msg: string) => { if (cond) ok++; else { falhas++; console.error('FALHA:', msg) } }
const perto = (a: number, b: number) => Math.abs(a - b) < 1e-6

const cat = (nome: string, fixa: boolean) => ({ id: nome, nome, descricao: '', fixa, ativa: true, tipo: 'saida' } as unknown as Categoria)
const categorias = [cat('Aluguel', true), cat('Luz', true), cat('Mercado', false), cat('Lazer', false)]

// O exemplo do Guilherme: plano 5.000 (fixas 2.000 + variáveis 3.000); pagou
// 1.200 de fixas (o Aluguel, no plano) e gastou 3.300 nas variáveis.
const linhas = [
  { nome: 'Aluguel', descricao: '', grupo: 'Casa', prev: 1200, real: 1200 },
  { nome: 'Luz', descricao: '', grupo: 'Casa', prev: 800, real: 0 },
  { nome: 'Mercado', descricao: '', grupo: 'Alimentação', prev: 2000, real: 2500 },
  { nome: 'Lazer', descricao: '', grupo: 'Lazer', prev: 1000, real: 800 },
]
const b = balancoDoPlano(linhas, categorias)!
conf(perto(b.prev, 5000), `planejado 5.000 (veio ${b.prev})`)
conf(perto(b.gasto, 5300), `gastou 5.300: fixa não paga pelo plano (veio ${b.gasto})`)
conf(perto(b.diferenca, -300), `passou 300 (veio ${b.diferenca})`)
conf(perto(b.prev - b.gasto, b.diferenca), 'Planejado − Gastou = frase')

// Pagar a Luz por 750 deixa 50 a menos no Gastou.
const b2 = balancoDoPlano(linhas.map(l => l.nome === 'Luz' ? { ...l, real: 750 } : l), categorias)!
conf(perto(b2.gasto, 5250) && perto(b2.diferenca, -250), 'fixa paga entra pelo valor pago')

// Sem plano fica fora.
const b3 = balancoDoPlano([...linhas, { nome: 'Presente', descricao: '', grupo: 'Outras', prev: 0, real: 80 }], categorias)!
conf(perto(b3.semPlano, 80) && perto(b3.diferenca, -300), 'sem plano fica fora da conta')

// O card do grupo usa a mesma régua.
const casa = [{ prev: 1200, real: 1200, fixa: true }, { prev: 800, real: 0, fixa: true }]
const dg = destaqueDoGrupo(casa, false)
conf(perto(dg.real, 2000) && perto(dg.prev, 2000), `card: gastou 2.000 de 2.000 (veio ${dg.real})`)
const partes = partesDoGrupo([...casa, { prev: 2000, real: 2500, fixa: false }], false)
const fixas = partes.find(p => p.rotulo === 'Fixas')!
conf(perto(fixas.real, 2000) && fixas.estado !== 'pago', 'tabela do card: Fixas gastou 2.000, sem ✓ (Luz não paga)')
const todos = [...casa, { prev: 2000, real: 2500, fixa: false }, { prev: 1000, real: 800, fixa: false }]
const tg = destaqueDoGrupo(todos, false)
conf(perto(tg.prev - tg.real, b.diferenca), 'card com todas as linhas = frase')
conf(tg.principal.startsWith('passou') && tg.principal.includes('300,00'), `card diz passou R$ 300,00 (veio ${tg.principal})`)

// Fixa paga e "não vai ocorrer": resolvidas.
conf(destaqueDoGrupo([{ prev: 1200, real: 1200, fixa: true }], false).principal === '✓ pago', 'grupo só de fixa paga: ✓ pago')
conf(destaqueDoGrupo([{ prev: 500, real: 0, fixa: true, naoOcorre: true }], false).principal === '✓ pago', 'fixa que não ocorre: resolvida')

console.log(`prova125: ${ok} ok, ${falhas} falhas`)
if (falhas) process.exit(1)
