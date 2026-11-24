// prova131 — Itens do plano, linha do plano, repetição e categoria mãe
// (24/11/2026, revisão de 24/11, A4). Refaz o que as provas 45, 51, 53 e 57
// trancavam antes de se perderem.
//
//   - v[mes] é a verdade e os itens são o detalhe: itens que não somam v são
//     ignorados; gravar só o valor tira os itens daquele mês e só dele.
//   - Copiar mês / ano não leva item do Simulador nem parcela de compra; o
//     reajuste não toca item do Simulador.
//   - A linha do plano para gravar: id, par exato, nome único; duas linhas
//     "Financiamento" sem variante são 'ambigua' (nunca chutar).
//   - Mensal repete até dezembro; mês com outro valor ou com itens vai para a
//     pergunta, mês vazio ou no valor antigo recebe na hora.
//   - Categoria mãe: variante variável soma na mãe, com detalhe; fixa fica
//     fora; sem mãe nada muda; gravar numa filha grava na mãe.
import {
  itensDoMes, comItens, comValor, somaItens, escalarItens, paraCopiar, paraCopiarAno, reajustarItens,
  type ItemPlano,
} from '../src/utils/itensPlano'
import { acharLinhaDoPlano, mudarLinhaDoPlano } from '../src/utils/linhaDoPlano'
import { mesesParaRepetir, divergentes, separarDestinos, ehParcelada, rotuloParcela, nomeDoMes } from '../src/utils/recorrencia'
import { maeDe, somaNaMae, juntarNaMae } from '../src/utils/categoriaMae'

let ok = 0, falhas = 0
const t = (nome: string, cond: boolean, extra?: unknown) => {
  if (cond) ok++
  else { falhas++; console.log('FALHOU:', nome, extra !== undefined ? JSON.stringify(extra) : '') }
}
const doze = (x: number) => Array(12).fill(x)
const it = (descricao: string, valor: number, simulacaoId?: string): ItemPlano => ({ id: descricao, descricao, valor, simulacaoId })

// ---------- itensPlano ----------
{
  const mercado = { nome: 'Mercado', v: doze(1000) }
  const com = comItens(mercado, [3, 4], [it('Supermercado', 800), it('Feira', 300)])
  t('comItens: v vira a soma nos meses dados', com.v[3] === 1100 && com.v[4] === 1100 && com.v[5] === 1000, com.v)
  t('comItens: itens lidos de volta', itensDoMes(com, 3)?.length === 2 && itensDoMes(com, 5) === null)
  t('comItens: não muda o objeto de entrada', mercado.v[3] === 1000 && !('itens' in mercado))

  // Caminho antigo que grava só v (ajuste em Lançamentos, Configurações).
  const mexido = { ...com, v: com.v.map((x, i) => (i === 3 ? 1200 : x)) }
  t('itensDoMes: soma diferente de v → ignora o detalhe', itensDoMes(mexido, 3) === null && itensDoMes(mexido, 4)?.length === 2)
  t('itensDoMes: meio centavo de diferença ainda vale', itensDoMes({ v: [10.004], itens: { 0: [it('a', 10)] } }, 0) !== null)

  const soValor = comValor(com, 3, 900)
  t('comValor: grava só o valor e tira os itens daquele mês', soValor.v[3] === 900 && itensDoMes(soValor, 3) === null)
  t('comValor: os outros meses mantêm os itens', itensDoMes(soValor, 4)?.length === 2)
  const tudoFora = comValor(comValor(com, 3, 1), 4, 1)
  t('comValor: sem item nenhum, o campo itens some', !('itens' in tudoFora))

  const semDetalhe = comItens(com, [3], null)
  t('comItens(null): tira o detalhe e mantém o total', semDetalhe.v[3] === 1100 && itensDoMes(semDetalhe, 3) === null)

  t('somaItens arredonda ao centavo', somaItens([it('a', 0.1), it('b', 0.2)]) === 0.3)
  t('escalarItens 10%', escalarItens([it('a', 100), it('b', 33.33)], 1.1).map(i => i.valor).join() === '110,36.66')

  const comSim = comItens({ nome: 'Lazer', v: doze(0) }, [5], [it('Lazer', 300), it('Bicicleta · 1 de 6', 200, 'sim1')])
  const copia = paraCopiar(comSim, 5)
  t('paraCopiar: sem item do Simulador', copia.valor === 300 && copia.itens?.length === 1)
  t('paraCopiar: sem itens, o valor do mês', paraCopiar({ v: doze(70) }, 2).valor === 70 && paraCopiar({ v: doze(70) }, 2).itens === null)

  const ipva = comItens({ nome: 'IPVA', v: doze(0) }, [0], [it('IPVA · 1 de 3', 500), it('Celular · 2 de 10', 150)])
  const ano = paraCopiarAno(ipva, 0)
  t('paraCopiarAno: parcela da própria temporária fica, a da compra sai', ano.valor === 500 && ano.itens?.[0].descricao === 'IPVA · 1 de 3', ano)

  const reaj = reajustarItens([it('Lazer', 100), it('Bicicleta', 200, 'sim1')], 1.5)
  t('reajustarItens: não toca item do Simulador', reaj[0].valor === 150 && reaj[1].valor === 200)
}

// ---------- linhaDoPlano ----------
const cat = (o: object) => ({ cor: '', icone: '', ativa: true, fixa: false, tipo: 'saida', tipoMovimento: 'banco', ...o }) as any
{
  const lista = [
    { id: 'c1', nome: 'Seguro', descricao: 'Civic', v: doze(100) },
    { nome: 'Seguro', descricao: 'March', v: doze(80) },
    { nome: 'Financiamento', v: doze(1150) },
    { nome: 'Financiamento', v: doze(900) },
    { nome: 'Mercado', v: doze(1000) },
  ] as any[]
  t('linha: pelo id', acharLinhaDoPlano(lista, { id: 'c1', nome: 'X' }) === 0)
  t('linha: par exato', acharLinhaDoPlano(lista, { nome: 'Seguro', descricao: 'March' }) === 1)
  t('linha: nome único sem variante (espaços ignorados; caixa conta, o cadastro grava a grafia canônica)', acharLinhaDoPlano(lista, { nome: ' Mercado ' }) === 4 && acharLinhaDoPlano(lista, { nome: 'mercado' }) === null)
  t('linha: duas "Financiamento" sem variante → ambigua', acharLinhaDoPlano(lista, { nome: 'Financiamento', descricao: 'Casa' }) === 'ambigua')
  t('linha: inexistente → null', acharLinhaDoPlano(lista, { nome: 'Viagem' }) === null)

  const plano = { saldoInicialJan: 0, entradas: [], saidas: lista } as any
  const cats = [cat({ id: 'm', nome: 'Mercado' })]
  const novo = mudarLinhaDoPlano(plano, 'saida', { nome: 'Viagem', grupo: 'Lazer' }, l => ({ ...l, v: doze(50) }), cats)
  t('mudarLinha: cria a linha que não existe', novo?.saidas.length === 6 && novo.saidas[5].v[0] === 50)
  t('mudarLinha: ambígua → null, plano intacto', mudarLinhaDoPlano(plano, 'saida', { nome: 'Financiamento' }, l => l, cats) === null)
  t('mudarLinha: sem plano no ano → null', mudarLinhaDoPlano(undefined, 'saida', { nome: 'Mercado' }, l => l, cats) === null)
  t('mudarLinha: não muda o plano recebido', plano.saidas.length === 5)
}

// ---------- recorrencia ----------
{
  t('repetir de outubro: nov e dez', mesesParaRepetir(2026, 9).map(m => m.mes).join() === '10,11')
  t('repetir de dezembro: nada', mesesParaRepetir(2026, 11).length === 0)
  const destinos = [
    { m: { ano: 2026, mes: 5 }, v: 0, itens: false },     // vazio → livre
    { m: { ano: 2026, mes: 6 }, v: 500, itens: false },   // reajuste de julho → pergunta
    { m: { ano: 2026, mes: 7 }, v: 300, itens: false },   // valor antigo → livre
    { m: { ano: 2026, mes: 8 }, v: 350, itens: false },   // já no novo → fora
    { m: { ano: 2026, mes: 9 }, v: 300, itens: true },    // com itens → pergunta
  ]
  const s = separarDestinos(destinos, 300, 350)
  t('separarDestinos: livres = vazio e valor antigo', s.livres.map(m => m.mes).join() === '5,7', s)
  t('separarDestinos: pergunta = outro valor e com itens', s.diferentes.map(d => d.m.mes).join() === '6,9', s)
  t('divergentes: vazio e novo não divergem', divergentes(destinos, 300, 350).map(d => d.m.mes).join() === '6')
  t('ehParcelada', ehParcelada({ recorrencia: 'temporaria' }) && !ehParcelada({ recorrencia: 'anual' }) && !ehParcelada({}))
  t('rotuloParcela', rotuloParcela('IPVA', 2, 3) === 'IPVA · 2 de 3')
  t('nomeDoMes atravessa o ano', nomeDoMes({ ano: 2027, mes: 0 }, 2026) === 'janeiro de 2027' && nomeDoMes({ ano: 2026, mes: 4 }, 2026) === 'maio')
}

// ---------- categoriaMae ----------
{
  const cats = [
    cat({ id: 'aca', nome: 'Academia' }),
    cat({ id: 'acm', nome: 'Academia', descricao: 'Martin' }),
    cat({ id: 'acp', nome: 'Academia', descricao: 'Plano anual', fixa: true }),
    cat({ id: 'fic', nome: 'Financiamento', descricao: 'Casa', fixa: true }),
    cat({ id: 'fiv', nome: 'Financiamento', descricao: 'Civic', fixa: true }),
    cat({ id: 'vin', nome: 'Viagem', descricao: 'Praia' }),
  ]
  t('maeDe: a sem variante', maeDe('Academia', 'saida', cats)?.id === 'aca' && !maeDe('Viagem', 'saida', cats))
  t('somaNaMae: variável sim, fixa não', somaNaMae('Academia', 'Martin', 'saida', cats) && !somaNaMae('Academia', 'Plano anual', 'saida', cats))
  t('somaNaMae: variante sem cadastro também soma', somaNaMae('Academia', 'Gui', 'saida', cats))
  t('somaNaMae: sem mãe, não', !somaNaMae('Viagem', 'Praia', 'saida', cats))
  t('somaNaMae: com a mãe desativada, não', !somaNaMae('Academia', 'Martin', 'saida', cats.map(c => (c.id === 'aca' ? { ...c, ativa: false } : c))))

  const lista = [
    { id: 'aca', nome: 'Academia', v: doze(100) },
    { id: 'acm', nome: 'Academia', descricao: 'Martin', v: doze(103) },
    { nome: 'Academia', descricao: 'Gui', v: doze(97) },
    { id: 'acp', nome: 'Academia', descricao: 'Plano anual', v: doze(80) },
    { id: 'fic', nome: 'Financiamento', descricao: 'Casa', v: doze(1500) },
    { id: 'fiv', nome: 'Financiamento', descricao: 'Civic', v: doze(1150) },
  ] as any[]
  const total = (l: any[]) => l.reduce((s, x) => s + x.v[0], 0)
  const j = juntarNaMae(lista, 'saida', cats)
  const mae = j.find(l => l.id === 'aca')!
  t('juntar: a mãe soma as variáveis', mae.v[0] === 300 && mae.v[11] === 300, mae.v)
  t('juntar: detalhe em itens (mãe + Martin + Gui)', itensDoMes(mae, 0)?.map(i => i.descricao).join('|') === 'Academia|Martin|Gui', itensDoMes(mae, 0))
  t('juntar: fixa e as sem mãe ficam como estão', j.length === 4 && j.some(l => l.id === 'acp') && j.some(l => l.id === 'fic') && j.some(l => l.id === 'fiv'))
  t('juntar: o total do plano não muda', total(j) === total(lista), [total(j), total(lista)])
  t('juntar: aplicar duas vezes não muda nada', JSON.stringify(juntarNaMae(j, 'saida', cats)) === JSON.stringify(j))
  t('juntar: sem filhas devolve a mesma lista', juntarNaMae([lista[4]], 'saida', cats).length === 1)

  const semMae = juntarNaMae([{ id: 'acm', nome: 'Academia', descricao: 'Martin', v: doze(103) }] as any, 'saida', cats)
  t('juntar: mãe ausente no plano é criada', semMae.length === 1 && semMae[0].id === 'aca' && semMae[0].v[0] === 103)

  const plano = { saldoInicialJan: 0, entradas: [], saidas: lista } as any
  const gravado = mudarLinhaDoPlano(plano, 'saida', { id: 'acm', nome: 'Academia', descricao: 'Martin' }, l => comValor(l, 0, 400), cats)!
  const maeG = gravado.saidas.find(l => l.id === 'aca')!
  t('gravar numa filha grava na mãe', maeG.v[0] === 400 && maeG.v[1] === 300 && !gravado.saidas.some(l => l.id === 'acm'), maeG.v)
}

console.log(`prova131: ${ok} ok, ${falhas} falhas`)
if (falhas) process.exit(1)
