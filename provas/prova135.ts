// prova135 — Renomear categoria e compra (24/11/2026, revisão de 24/11, A4).
// Refaz o que a prova 72 trancava: renomear leva junto o que está gravado
// (extrato, dinheiro, fatura, plano de todos os anos, itens de parcela), só
// texto, nenhum valor; meses não tocados mantêm a identidade; a variante de
// outra categoria com o mesmo nome não é levada junto.
import {
  mudouIdentidade, renomearNoExtrato, renomearNaFaturaDaCategoria, renomearNosPlanos,
} from '../src/utils/renomearCategoria'
import {
  lerRotuloParcela, rotuloParcela, compraDoItem, renomearNaFatura, renomearNosPlanos as renomearCompraNosPlanos,
} from '../src/utils/renomearCompra'

let ok = 0, falhas = 0
const t = (nome: string, cond: boolean, extra?: unknown) => {
  if (cond) ok++
  else { falhas++; console.log('FALHOU:', nome, extra !== undefined ? JSON.stringify(extra) : '') }
}
const cat = (o: object) => ({ cor: '', icone: '', ativa: true, fixa: false, tipo: 'saida', tipoMovimento: 'banco', ...o }) as any
const somaValores = (meses: Record<string, any>) => Object.values(meses).reduce((s: number, dm: any) =>
  s + Object.values(dm?.lancamentos ?? {}).flat().reduce((x: number, l: any) => x + (l.valor ?? 0), 0), 0)

const academia = cat({ id: 'aca', nome: 'Academia' })
const martin = cat({ id: 'acm', nome: 'Academia', descricao: 'Martin' })
const seguroCivic = cat({ id: 'sc', nome: 'Seguro', descricao: 'Civic' })
const seguroMarch = cat({ id: 'sm', nome: 'Seguro', descricao: 'March' })
const categorias = [academia, martin, seguroCivic, seguroMarch]

t('mudouIdentidade: nome ou variante', mudouIdentidade({ nome: 'A' }, { nome: 'B' }) && mudouIdentidade({ nome: 'A', descricao: 'x' }, { nome: 'A' }) && !mudouIdentidade({ nome: 'A ' }, { nome: 'A' }))

// ---------- Renomear "Seguro · Civic" para "Seguro auto · Civic" ----------
const extrato: Record<string, any> = {
  'sic-2026-10': { lancamentos: { 5: [
    { id: '1', tipo: 'saida', categoria: 'Seguro', subCategoria: 'Civic', descricao: 'Seguro', valor: 300 },
    { id: '2', tipo: 'saida', categoria: 'Seguro', subCategoria: 'March', descricao: 'Porto', valor: 200 },
    { id: '3', tipo: 'saida', categoria: 'Mercado', descricao: 'Mercado', valor: 50 },
  ] } },
  'sic-2026-09': { lancamentos: { 5: [{ id: '4', tipo: 'saida', categoria: 'Mercado', descricao: 'x', valor: 10 }] } },
}
{
  const antes = { nome: 'Seguro', descricao: 'Civic' }, depois = { nome: 'Seguro auto', descricao: 'Civic' }
  const r = renomearNoExtrato(extrato, seguroCivic, antes, depois, categorias)
  const ls = r['sic-2026-10'].lancamentos[5]
  t('extrato: a do Civic muda de nome', ls[0].categoria === 'Seguro auto' && ls[0].subCategoria === 'Civic')
  t('extrato: descrição que era só o nome acompanha', ls[0].descricao === 'Seguro auto')
  t('extrato: a do March (outra variante) fica', ls[1].categoria === 'Seguro' && ls[1].subCategoria === 'March')
  t('extrato: outras categorias ficam', ls[2].categoria === 'Mercado')
  t('extrato: mês não tocado mantém a identidade', r['sic-2026-09'] === extrato['sic-2026-09'])
  t('extrato: nenhum valor muda', somaValores(r) === somaValores(extrato))
  t('extrato: o original não é alterado', extrato['sic-2026-10'].lancamentos[5][0].categoria === 'Seguro')
  t('extrato: nada a renomear devolve o MESMO mapa', renomearNoExtrato(extrato, cat({ id: 'z', nome: 'Viagem' }), { nome: 'Viagem' }, { nome: 'Férias' }, categorias) === extrato)
}

// ---------- Mãe: "Academia" → "Ginástica" leva a variante SEM cadastro, não a cadastrada ----------
{
  const faturas: Record<string, any> = { 'xp-2026-11': { lancamentos: { 2: [
    { id: 'f1', tipo: 'entrada', categoria: 'Academia', descricao: 'Academia', valor: 100 },
    { id: 'f2', tipo: 'entrada', categoria: 'Academia', subCategoria: 'Gui', descricao: 'Academia · Gui', valor: 97 },
    { id: 'f3', tipo: 'entrada', categoria: 'Academia', subCategoria: 'Martin', descricao: 'Smart', valor: 103 },
  ] } } }
  const r = renomearNaFaturaDaCategoria(faturas, academia, { nome: 'Academia' }, { nome: 'Ginástica' }, categorias) as any
  const ls = r['xp-2026-11'].lancamentos[2]
  t('fatura: a da mãe muda', ls[0].categoria === 'Ginástica' && ls[0].descricao === 'Ginástica')
  t('fatura: variante sem cadastro soma na mãe e vai junto', ls[1].categoria === 'Ginástica' && ls[1].subCategoria === 'Gui', ls[1])
  t('fatura: variante com cadastro próprio fica (renomear a mãe não leva)', ls[2].categoria === 'Academia')
  t('fatura: nenhum valor muda', somaValores(r) === somaValores(faturas))
}

// ---------- Plano de todos os anos ----------
{
  const planos: any = {
    2026: { saldoInicialJan: 0, entradas: [], saidas: [
      { id: 'sc', nome: 'Seguro', descricao: 'Civic', v: Array(12).fill(300),
        itens: { 10: [{ id: 'a', descricao: 'Seguro · 1 de 3', valor: 300 }] } },
      { id: 'sm', nome: 'Seguro', descricao: 'March', v: Array(12).fill(200) },
    ] },
    2027: { saldoInicialJan: 0, entradas: [], saidas: [{ nome: 'Seguro', descricao: 'Civic', v: Array(12).fill(310) }] },
    2025: { saldoInicialJan: 0, entradas: [], saidas: [{ nome: 'Mercado', v: Array(12).fill(1) }] },
  }
  const r = renomearNosPlanos(planos, seguroCivic, { nome: 'Seguro', descricao: 'Civic' }, { nome: 'Seguro auto', descricao: 'Civic' }, categorias)
  t('plano: pelo id', r[2026].saidas[0].nome === 'Seguro auto' && r[2026].saidas[0].descricao === 'Civic')
  t('plano: item de parcela "Seguro · 1 de 3" acompanha', r[2026].saidas[0].itens![10][0].descricao === 'Seguro auto · 1 de 3')
  t('plano: a outra variante fica', r[2026].saidas[1].nome === 'Seguro')
  t('plano: outro ano, pelo par (sem id)', r[2027].saidas[0].nome === 'Seguro auto')
  t('plano: ano não tocado mantém a identidade', r[2025] === planos[2025])
  t('plano: valores iguais', JSON.stringify(r[2026].saidas.map(l => l.v)) === JSON.stringify(planos[2026].saidas.map((l: any) => l.v)))
  // plano antigo: duas "Financiamento" sem variante, resolvidas por posição
  const fc = cat({ id: 'fc', nome: 'Financiamento', descricao: 'Casa', fixa: true })
  const fv = cat({ id: 'fv', nome: 'Financiamento', descricao: 'Civic', fixa: true })
  const antigo: any = { 2026: { saldoInicialJan: 0, entradas: [], saidas: [{ nome: 'Financiamento', v: Array(12).fill(1500) }, { nome: 'Financiamento', v: Array(12).fill(1150) }] } }
  const ra = renomearNosPlanos(antigo, fv, { nome: 'Financiamento', descricao: 'Civic' }, { nome: 'Financiamento', descricao: 'Honda' }, [fc, fv])
  const nomes = ra[2026].saidas.map(l => `${l.nome}·${l.descricao ?? ''}:${l.v[0]}`)
  t('plano antigo: só a linha do Civic (por posição) vira Honda', nomes.filter(n => n.includes('Honda')).length === 1 && nomes.some(n => n === 'Financiamento·:1500' || n.includes('Casa')), nomes)
}

// ---------- Renomear compra parcelada ----------
{
  t('rótulo de parcela', JSON.stringify(lerRotuloParcela('Cursos / Palestras · 4 de 6')) === '{"nome":"Cursos / Palestras","atual":4,"total":6}')
  t('rótulo: 1 de 1 e fora do padrão não são parcela', lerRotuloParcela('X · 1 de 1') === null && lerRotuloParcela('Mercado') === null)
  t('rotuloParcela', rotuloParcela(' Bike ', 2, 6) === 'Bike · 2 de 6')
  const jaLancado: any[] = [
    { descricao: 'Cursos / Palestras', valor: 150, parcela: { atual: 4, total: 6, compra: { contaId: 'xp', base: 'c9' } } },
    { descricao: 'Cursos / Palestras', valor: 80, parcela: { atual: 4, total: 6, compra: { contaId: 'nub', base: 'k2' } } },
  ]
  t('compra do item: desempata pelo valor', compraDoItem({ descricao: 'Cursos / Palestras · 4 de 6', valor: 80 }, jaLancado)?.base === 'k2')
  t('compra do item: sem parcela que case, null', compraDoItem({ descricao: 'Outra · 4 de 6', valor: 80 }, jaLancado) === null
    && compraDoItem({ descricao: 'Lazer', valor: 80 }, jaLancado) === null)

  const faturas: Record<string, any> = {
    'xp-2026-11': { lancamentos: { 9: [{ id: 'c9-4', descricao: 'Cursos / Palestras', parcelas: 6, valor: 150 }, { id: 'c99-1', descricao: 'Outra', parcelas: 6, valor: 1 }] } },
    'xp-2026-12': { lancamentos: { 9: [{ id: 'c9-5', descricao: 'Cursos / Palestras', parcelas: 6, valor: 150 }] } },
    'nub-2026-11': { lancamentos: { 9: [{ id: 'c9-4', descricao: 'Cursos / Palestras', parcelas: 6, valor: 150 }] } },
  }
  const r = renomearNaFatura(faturas, { contaId: 'xp', base: 'c9', total: 6 }, ' Inglês ') as any
  t('fatura: todas as parcelas da compra no cartão', r['xp-2026-11'].lancamentos[9][0].descricao === 'Inglês' && r['xp-2026-12'].lancamentos[9][0].descricao === 'Inglês')
  t('fatura: id parecido (c99-1) não é da compra', r['xp-2026-11'].lancamentos[9][1].descricao === 'Outra')
  t('fatura: mesmo id em outro cartão fica', r['nub-2026-11'] === faturas['nub-2026-11'])

  const planos: any = { 2027: { saldoInicialJan: 0, entradas: [], saidas: [{ nome: 'Educação', v: Array(12).fill(150),
    itens: { 0: [{ id: 'i', descricao: 'Cursos / Palestras · 6 de 6', valor: 150 }] } }] } }
  const rp = renomearCompraNosPlanos(planos, 'Educação', 'Cursos / Palestras', 6, 'Inglês')
  t('plano: item da compra renomeado atravessando o ano', rp[2027].saidas[0].itens![0][0].descricao === 'Inglês · 6 de 6')
  t('plano: outro total não é a mesma compra', renomearCompraNosPlanos(planos, 'Educação', 'Cursos / Palestras', 12, 'X') === planos)
}

console.log(`prova135: ${ok} ok, ${falhas} falhas`)
if (falhas) process.exit(1)
