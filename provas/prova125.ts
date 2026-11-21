// prova125 — a frase "No total, você está gastando R$ X a mais" e o Total das
// despesas do Radar do celular contam a MESMA história (21/11/2026, relatado
// pelo Guilherme: frase "R$ 388,60 a mais" e "Disponível R$ 456"). O Total
// antigo era planejado − gasto, que conta como sobra o que as fixas ainda vão
// levar. Hoje a terceira coluna é a `diferenca` do balancoDoPlano, e
// `fixasAVencer` explica a distância entre as duas contas.
import { balancoDoPlano } from '../src/utils/balancoDoPlano'
import type { Categoria } from '../src/context/AppContext'

let ok = 0, falhas = 0
const conf = (cond: boolean, msg: string) => { if (cond) ok++; else { falhas++; console.error('FALHA:', msg) } }
const perto = (a: number, b: number) => Math.abs(a - b) < 1e-6

const cat = (nome: string, fixa: boolean) => ({ id: nome, nome, descricao: '', fixa, ativa: true, tipo: 'saida' } as unknown as Categoria)
const categorias = [cat('Aluguel', true), cat('Luz', true), cat('Mercado', false), cat('Lazer', false)]

// Mercado passou 500, Lazer sobrou 111,40; Aluguel (1.200) ainda não pago; Luz paga no valor.
const linhas = [
  { nome: 'Aluguel', descricao: '', grupo: 'Casa', prev: 1200, real: 0 },
  { nome: 'Luz', descricao: '', grupo: 'Casa', prev: 200, real: 200 },
  { nome: 'Mercado', descricao: '', grupo: 'Alimentação', prev: 1000, real: 1500 },
  { nome: 'Lazer', descricao: '', grupo: 'Lazer', prev: 300, real: 188.6 },
]
const b = balancoDoPlano(linhas, categorias)!
const prevTotal = linhas.reduce((s, l) => s + l.prev, 0)
const realTotal = linhas.reduce((s, l) => s + l.real, 0)

// Controle: a conta antiga dava "disponível" positivo.
conf(prevTotal - realTotal > 0, 'controle: planejado − gasto é positivo (a contradição)')
conf(perto(b.diferenca, -388.6), `frase: gastou 388,60 a mais (veio ${b.diferenca})`)
conf(perto(b.fixasAVencer, 1200), `fixas a vencer = 1.200 (veio ${b.fixasAVencer})`)
conf(perto(prevTotal - realTotal, b.diferenca + b.fixasAVencer), 'planejado − gasto = diferença + fixas a vencer')

// A conta da tela (Total das despesas, 21/11/2026): variáveis planejado −
// gastou, menos o que as fixas passaram, é o número da frase.
conf(perto(b.varPrev - b.varReal - b.fixasPassou, b.diferenca), 'variáveis − fixas que passaram = frase')
conf(perto(b.varPrev, 1300) && perto(b.varReal, 1688.6), 'variáveis: 1.300 planejado, 1.688,60 gastou')
const b4 = balancoDoPlano(linhas.map(l => l.nome === 'Luz' ? { ...l, real: 260 } : l), categorias)!
conf(perto(b4.fixasPassou, 60) && perto(b4.varPrev - b4.varReal - b4.fixasPassou, b4.diferenca), 'fixa paga acima: entra pelo que passou')
const b5 = balancoDoPlano([...linhas, { nome: 'Presente', descricao: '', grupo: 'Outras', prev: 0, real: 80 }], categorias)!
conf(perto(b5.semPlano, 80) && perto(b5.diferenca, b.diferenca), 'sem plano fica fora da frase')

// Fixa paga: nada a vencer.
const b2 = balancoDoPlano(linhas.map(l => l.nome === 'Aluguel' ? { ...l, real: 1200 } : l), categorias)!
conf(perto(b2.fixasAVencer, 0), 'fixa paga não fica a vencer')
conf(perto(b2.diferenca, -388.6), 'pagar a fixa no valor não muda a frase')

console.log(`prova125: ${ok} ok, ${falhas} falhas`)
if (falhas) process.exit(1)
