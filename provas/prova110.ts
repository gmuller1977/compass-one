// prova110 (02/11/2026): o card do grupo no Radar mostra FIXAS e VARIÁVEIS
// separadas (pedido do Guilherme: "usou: as duas estão somadas"). Mesma régua
// de destaqueDoGrupo, só dividida pelo cadastro.
import { partesDoGrupo, destaqueDoGrupo } from '../src/components/acompanhamento/radarCores'
let ok = 0, falha = 0
const t = (n: string, c: boolean) => { c ? ok++ : (falha++, console.log('FALHA', n)) }
const linhas = [
  { prev: 629, real: 629, fixa: true },
  { prev: 2000, real: 1700, fixa: false },
  { prev: 800, real: 550, fixa: false },
  { prev: 0, real: 80, fixa: false },
]
const p = partesDoGrupo(linhas, false)
t('fixas e variáveis, nessa ordem', p.map(x => x.rotulo).join() === 'Fixas,Variáveis')
t('fixa paga é pago', p[0].estado === 'pago')
t('variáveis somam só o planejado', p[1].prev === 2800 && p[1].real === 2250)
t('sem plano vai ao lado', p[1].fora === 80)
const g = destaqueDoGrupo(linhas, false)
t('as partes somam o grupo', Math.abs(p[0].prev + p[1].prev - g.prev) < 1e-9 && Math.abs(p[0].real + p[1].real - g.real) < 1e-9 && p[1].fora === g.fora)
t('passou na variável', partesDoGrupo([{ prev: 300, real: 480, fixa: false }], false)[0].estado === 'passou')
t('100% arredondado não passou', partesDoGrupo([{ prev: 1000, real: 1004, fixa: false }], false)[0].estado === 'ok')
t('fixa a pagar não é paga', partesDoGrupo([{ prev: 650, real: 0, fixa: true }], false)[0].estado === 'ok')
t('fixa paga acima passou', partesDoGrupo([{ prev: 973, real: 1123, fixa: true }], false)[0].estado === 'passou')
t('sem plano: neutro', partesDoGrupo([{ prev: 0, real: 50, fixa: false }], false)[0].estado === 'neutro')
t('receita não fica vermelha', partesDoGrupo([{ prev: 100, real: 300, fixa: false }], true)[0].estado === 'ok')
t('só fixas: uma parte', partesDoGrupo([{ prev: 105, real: 105, fixa: true }], false).length === 1)
console.log(`prova110: ${ok} ok, ${falha} falhas`)
if (falha) process.exit(1)
