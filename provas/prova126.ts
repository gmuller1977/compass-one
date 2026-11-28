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
// Desde 28/11/2026 (escolha do Guilherme no card) a despesa diz "saldo do plano".
t(`Educação: saldo do plano R$ 657,00 (veio ${d.principal})`, d.principal.startsWith('saldo do plano') && tem(d.principal, '657,00'))
t('anel não fica em 100%', Math.round(d.real / d.prev * 100) === 39)
t('100% é pago', destaqueDoGrupo([{ prev: 300, real: 300, fixa: false }], false).principal === '✓ pago')
const p = destaqueDoGrupo([{ prev: 300, real: 480, fixa: false }, { prev: 500, real: 0, fixa: true }], false)
// Desde 28/11/2026 (Guilherme, Renda "a receber 903,99" com 955,42 por cair):
// o que falta e o que passou aparecem cada um com o seu valor, sem compensar.
t(`falta e passou separados (veio ${p.principal} · ${p.extra})`, tem(p.principal, 'saldo do plano') && tem(p.principal, '500,00') && tem(p.extra ?? '', 'passou') && tem(p.extra ?? '', '180,00'))
const q = destaqueDoGrupo([{ prev: 300, real: 480, fixa: false }], false)
t('passou R$ 180,00', q.principal.startsWith('passou') && tem(q.principal, '180,00'))
t('receita: a receber', destaqueDoGrupo([{ prev: 5000, real: 2000, fixa: true }], true).principal.startsWith('a receber'))
t('receita 100%: recebido', destaqueDoGrupo([{ prev: 5000, real: 5000, fixa: true }], true).principal === '✓ recebido')
t('só fixas pagas: ✓ pago', destaqueDoGrupo([{ prev: 199, real: 190, fixa: true }], false).principal === '✓ pago')
t('fixa que não ocorre sai das colunas', perto(destaqueDoGrupo([{ prev: 140, real: 0, fixa: true, naoOcorre: true }, { prev: 100, real: 50, fixa: false }], false).prev, 100))
t('R$ 999.999,99', tem(destaqueDoGrupo([{ prev: 999999.99, real: 0, fixa: true }], false).principal, '999.999,99'))

// Gasto sem plano entra no Realizado do grupo, em todos os grupos (28/11/2026, Finanças)
const fin = destaqueDoGrupo([{ prev: 25, real: 25, fixa: true }, { prev: 35, real: 35, fixa: true }, { prev: 0, real: 40.31, fixa: false }], false)
t('Finanças: passou R$ 40,31', tem(fin.principal, 'passou') && tem(fin.principal, '40,31'))
t('Finanças: realizado 100,31', perto(fin.real, 100.31))
const sobra = destaqueDoGrupo([{ prev: 800, real: 300, fixa: false }, { prev: 0, real: 100, fixa: false }], false)
t('variável com sem plano: saldo do plano 500 e passou 100', tem(sobra.principal, 'saldo do plano') && tem(sobra.principal, '500,00') && tem(sobra.extra ?? '', '100,00'))
// A Renda de novembro: 13º do Guilherme por cair, Apae e 13º da Pricila a mais.
const renda = destaqueDoGrupo([{ prev: 955.42, real: 0, fixa: true }, { prev: 1189.70, real: 1189.70, fixa: true },
  { prev: 12000, real: 12051, fixa: true }, { prev: 12051.57, real: 12052, fixa: true }], true)
t(`Renda: a receber 955,42 (veio ${renda.principal})`, tem(renda.principal, 'a receber') && tem(renda.principal, '955,42'))
// "A mais não preciso mostrar" (28/11/2026): nada embaixo na receita.
t(`Renda: nada a mais embaixo (veio ${renda.extra})`, renda.extra === undefined)
t('receita toda recebida e a mais: ✓ recebido', destaqueDoGrupo([{ prev: 100, real: 150, fixa: false }], true).principal === '✓ recebido')
// O lado do número grande segue o grupo inteiro: passou no total, "passou" em cima.
const sobe = destaqueDoGrupo([{ prev: 100, real: 400, fixa: false }, { prev: 200, real: 100, fixa: false }], false)
t(`grupo que passou no total: passou 300 em cima, saldo do plano 100 embaixo (veio ${sobe.principal} · ${sobe.extra})`, tem(sobe.principal, 'passou') && tem(sobe.principal, '300,00') && tem(sobe.extra ?? '', 'saldo do plano') && tem(sobe.extra ?? '', '100,00'))
t('fixa paga abaixo + sem plano que não passa: ✓ pago', destaqueDoGrupo([{ prev: 60, real: 50, fixa: true }, { prev: 0, real: 5, fixa: false }], false).principal === '✓ pago')

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
