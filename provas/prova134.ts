// prova134 — Conta compartilhada no aparelho (24/11/2026, revisão de 24/11,
// A4). Refaz o que as provas 66a e 67a trancavam: a mescla de três vias do
// mês (o casal lançando no mesmo mês, cada um no seu celular), a autoria dos
// lançamentos e a gravação só dos meses alterados.
import { mesclar3, iguais } from '../src/utils/mesclarMes'
import { carimbarAutor, respeitarAutoria, podeMexer } from '../src/utils/autorDoLancamento'
import { mesesAlterados, lancamentosNovos } from '../src/utils/gravacaoPorMes'

let ok = 0, falhas = 0
const t = (nome: string, cond: boolean, extra?: unknown) => {
  if (cond) ok++
  else { falhas++; console.log('FALHOU:', nome, extra !== undefined ? JSON.stringify(extra) : '') }
}
const l = (id: string, valor: number, autor?: string) => ({ id, valor, descricao: id, ...(autor ? { autor } : {}) })
const ids = (m: any, dia: string) => (m?.lancamentos?.[dia] ?? []).map((x: any) => x.id).join()
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))

// ---------- iguais ----------
t('iguais: undefined em campo conta como ausente', iguais({ a: 1, b: undefined }, { a: 1 }))
t('iguais: ordem de lista importa', !iguais([1, 2], [2, 1]))
t('iguais: tipos diferentes', !iguais({ a: 1 }, [1]) && !iguais(null, {}))

// ---------- mesclar3 ----------
{
  const base = { lancamentos: { 10: [l('a', 100), l('b', 50)] }, saldoBanco: '1.000,00' }
  // eu: apaguei b e lancei c no dia 10; eles: lançaram d no dia 12
  const meu = { lancamentos: { 10: [l('a', 100), l('c', 30)] }, saldoBanco: '1.000,00' }
  const deles = { lancamentos: { 10: [l('a', 100), l('b', 50)], 12: [l('d', 20)] }, saldoBanco: '1.000,00' }
  const m = mesclar3(base, meu, deles) as any
  t('o que eu apaguei sai', !ids(m, '10').includes('b'))
  t('o que eu incluí fica', ids(m, '10').includes('c'))
  t('o que eles incluíram fica (outro dia)', ids(m, '12') === 'd')
  t('nada se perde além do apagado', ids(m, '10') === 'a,c', ids(m, '10'))

  // os dois no MESMO dia
  const meu2 = { lancamentos: { 10: [l('a', 100), l('b', 50), l('x', 1)] } }
  const deles2 = { lancamentos: { 10: [l('a', 100), l('b', 50), l('y', 2)] } }
  const m2 = mesclar3({ lancamentos: { 10: [l('a', 100), l('b', 50)] } }, meu2, deles2) as any
  t('mesmo dia: os dois novos ficam', ids(m2, '10').split(',').sort().join() === 'a,b,x,y', ids(m2, '10'))

  // eles editaram a, eu não mexi: vale o deles
  const deles3 = clone(base); deles3.lancamentos[10][0].valor = 120
  const m3 = mesclar3(base, clone(base), deles3) as any
  t('só eles editaram: vale o deles', m3.lancamentos[10][0].valor === 120)
  // os dois editaram o MESMO campo: vale o meu
  const meu4 = clone(base); meu4.lancamentos[10][0].valor = 110
  const m4 = mesclar3(base, meu4, deles3) as any
  t('os dois editaram o mesmo valor: vale quem grava', m4.lancamentos[10][0].valor === 110)
  // campos diferentes do mesmo lançamento: os dois valem
  const meu5 = clone(base); (meu5.lancamentos[10][0] as any).descricao = 'Mercado'
  const m5 = mesclar3(base, meu5, deles3) as any
  t('campos diferentes do mesmo lançamento: os dois valem', m5.lancamentos[10][0].valor === 120 && m5.lancamentos[10][0].descricao === 'Mercado')
  // eles apagaram, eu editei: vale quem mexeu
  const deles6 = { lancamentos: { 10: [l('b', 50)] }, saldoBanco: '1.000,00' }
  const m6 = mesclar3(base, meu4, deles6) as any
  t('eles apagaram o que eu editei: fica o editado', ids(m6, '10').split(',').sort().join() === 'a,b' && m6.lancamentos[10].find((x: any) => x.id === 'a').valor === 110)
  // saldo informado (campo simples) mudado só por eles
  const deles7 = { ...clone(base), saldoBanco: '980,00' }
  t('campo do mês mudado só por eles: vale o deles', (mesclar3(base, meu, deles7) as any).saldoBanco === '980,00')
  t('nada mudou aqui: devolve o do banco', mesclar3(base, clone(base), deles) === deles)
  t('nada mudou lá: devolve o meu', mesclar3(base, meu, clone(base)) === meu)
  t('mês novo (sem base) nos dois: une os lançamentos', ids(mesclar3(undefined, { lancamentos: { 1: [l('p', 1)] } }, { lancamentos: { 1: [l('q', 2)] } }), '1').split(',').sort().join() === 'p,q')
}

// ---------- Autoria ----------
{
  const DONO = 'u-dono', ANA = 'u-ana'
  const base = { lancamentos: { 5: [l('velho', 10), l('doDono', 20, DONO), l('daAna', 30, ANA)] } }
  const meu = clone(base) as any
  meu.lancamentos[5].push(l('novo', 40))
  delete meu.lancamentos[5][1].autor // uma tela que reescreve o item sem o autor
  const c = carimbarAutor(base, meu, ANA) as any
  t('carimbo: lançamento novo ganha o autor de quem grava', c.lancamentos[5].find((x: any) => x.id === 'novo').autor === ANA)
  t('carimbo: editado mantém o autor que tinha', c.lancamentos[5].find((x: any) => x.id === 'doDono').autor === DONO)
  t('carimbo: sem autor antes (do dono, pré-compartilhamento) continua sem', !c.lancamentos[5].find((x: any) => x.id === 'velho').autor)
  const intacto = clone(base)
  t('carimbo: nada a carimbar devolve o mesmo objeto', carimbarAutor(base, intacto, ANA) === intacto)

  // Ana (membro) apaga o do dono, edita o antigo, move o dela e lança um novo
  const tentativa = { lancamentos: { 5: [l('velho', 99)], 6: [l('daAna', 30, ANA)], 7: [l('dela2', 5, ANA)] } }
  const r = respeitarAutoria(base, tentativa, ANA) as any
  t('membro: apagar o do dono volta', ids(r.mes, '5').includes('doDono'))
  t('membro: editar o antigo (sem autor = do dono) volta ao original', r.mes.lancamentos[5].find((x: any) => x.id === 'velho').valor === 10)
  t('membro: mexer no próprio vale (moveu o dela de dia)', ids(r.mes, '6') === 'daAna' && !ids(r.mes, '5').includes('daAna'))
  t('membro: o novo dela fica', ids(r.mes, '7') === 'dela2')
  t('membro: conta os devolvidos (2)', r.devolvidos === 2, r.devolvidos)
  t('membro: o dia devolvido volta na ordem de antes', ids(r.mes, '5') === 'velho,doDono', ids(r.mes, '5'))
  const semMexer = clone(base)
  t('membro sem mexer no dos outros: nada volta', respeitarAutoria(base, semMexer, ANA).devolvidos === 0)

  t('podeMexer: admin tudo', podeMexer({ autor: ANA }, DONO, true) && podeMexer({}, DONO, true))
  t('podeMexer: membro só o próprio', podeMexer({ autor: ANA }, ANA, false) && !podeMexer({ autor: DONO }, ANA, false) && !podeMexer({}, ANA, false))
}

// ---------- Gravação por mês ----------
{
  const out = { lancamentos: { 1: [l('a', 1)] } }, nov = { lancamentos: { 1: [l('b', 1)] } }
  const noBanco = { 'sic-2026-10': out, 'sic-2026-11': nov }
  const novoNov = { lancamentos: { 1: [l('b', 1), l('c', 2)], 2: [l('d', 3)] } }
  const atual = { ...noBanco, 'sic-2026-11': novoNov, 'cx-2026-11': { lancamentos: { 3: [l('e', 4)] } } }
  t('só os meses com objeto novo são gravados', mesesAlterados(atual, noBanco).sort().join() === 'cx-2026-11,sic-2026-11')
  t('mês igual por conteúdo mas objeto novo é gravado (identidade, de propósito)', mesesAlterados({ k: { a: 1 } }, { k: { a: 1 } }).length === 1)
  t('lançamentos novos: c, d e e (editar não conta)', lancamentosNovos(mesesAlterados(atual, noBanco), atual, noBanco) === 3)
}

console.log(`prova134: ${ok} ok, ${falhas} falhas`)
if (falhas) process.exit(1)
