// prova126 (28/11/2026): no Radar, o card do grupo mostra só o total
// Planejado · Realizado, e a diferença: "a pagar R$ X" (despesa) / "a
// receber R$ X" (receita), "✓ pago" em 100%, "passou R$ X" acima. O
// realizado é só o que saiu: a fixa ainda não paga não conta (Guilherme:
// "as fixas não realizadas já estão entrando como gastou, parece que já está
// pago"). A categoria mostra Planejado · Realizado · A pagar (fixa) ou
// Disponível (variável).
import { destaqueDoGrupo, terceiraColuna } from '../src/components/acompanhamento/radarCores'
let ok = 0, falha = 0
const t = (n: string, c: boolean) => { c ? ok++ : (falha++, console.log('FALHA', n)) }
const perto = (a: number, b: number) => Math.abs(a - b) < 1e-6
const tem = (s: string, v: string) => s.replace(/\s/g, ' ').includes(v)

// O caso dele: Educação em dezembro.
const edu = [{ prev: 657, real: 0, fixa: true }, { prev: 199, real: 199, fixa: true }, { prev: 216.13, real: 216.13, fixa: false }]
const d = destaqueDoGrupo(edu, false)
t('Educação: realizado 415,13, sem a Escola', perto(d.real, 415.13) && perto(d.prev, 1072.13))
t(`Educação: a pagar R$ 657,00 (veio ${d.principal})`, d.principal.startsWith('a pagar') && tem(d.principal, '657,00'))
t('anel não fica em 100%', Math.round(d.real / d.prev * 100) === 39)
t('100% é pago', destaqueDoGrupo([{ prev: 300, real: 300, fixa: false }], false).principal === '✓ pago')
const p = destaqueDoGrupo([{ prev: 300, real: 480, fixa: false }, { prev: 500, real: 0, fixa: true }], false)
t(`passou só pelo realizado: a fixa não paga não empurra (veio ${p.principal})`, p.principal.startsWith('a pagar') && tem(p.principal, '320,00'))
const q = destaqueDoGrupo([{ prev: 300, real: 480, fixa: false }], false)
t('passou R$ 180,00', q.principal.startsWith('passou') && tem(q.principal, '180,00'))
t('receita: a receber', destaqueDoGrupo([{ prev: 5000, real: 2000, fixa: true }], true).principal.startsWith('a receber'))
t('receita 100%: recebido', destaqueDoGrupo([{ prev: 5000, real: 5000, fixa: true }], true).principal === '✓ recebido')
t('só fixas pagas: ✓ pago', destaqueDoGrupo([{ prev: 199, real: 190, fixa: true }], false).principal === '✓ pago')
t('fixa que não ocorre sai das colunas', perto(destaqueDoGrupo([{ prev: 140, real: 0, fixa: true, naoOcorre: true }, { prev: 100, real: 50, fixa: false }], false).prev, 100))
t('R$ 999.999,99', tem(destaqueDoGrupo([{ prev: 999999.99, real: 0, fixa: true }], false).principal, '999.999,99'))

// Categoria
t('fixa não paga: A pagar', terceiraColuna(657, 0, false, { fixa: true }).rotulo === 'A pagar')
t('fixa paga: ✓ pago', terceiraColuna(199, 199, false, { fixa: true, fixaPaga: true }).valor === '✓ pago')
t('variável: Disponível', terceiraColuna(800, 300, false).rotulo === 'Disponível' && tem(terceiraColuna(800, 300, false).valor, '500,00'))
t('variável que passou: Passou', terceiraColuna(800, 900, false).rotulo === 'Passou')
t('receita: A receber', terceiraColuna(5000, 0, true, { fixa: true }).rotulo === 'A receber')
t('sem plano', terceiraColuna(0, 50, false).valor === 'sem plano')
t('não ocorre', terceiraColuna(140, 0, false, { fixa: true, naoOcorre: true }).valor === 'não vai ocorrer')
console.log(`prova126: ${ok} ok, ${falha} falhas`)
if (falha) process.exit(1)
