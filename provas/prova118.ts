// prova118 (06/11/2026): mudar a quantidade de parcelas ao editar a 1ª
// parcela na fatura refaz a série. Bug relatado pelo Guilherme: a compra
// editada para 6× aparecia "de 6", sem "1 de 6", e não ia para os meses
// seguintes.
import { refazerSerieDeParcelas, emSerie, chaveDoMes } from '../src/utils/serieDeParcelas'
import { construirRealizadoMes } from '../src/utils/realizadoMes'
let ok = 0, falha = 0
const t = (n: string, c: boolean) => { c ? ok++ : (falha++, console.log('FALHA', n)) }

type L = { id: string; tipo: string; categoria: string; descricao: string; valor: number; formaPagamento: string; tipoLanc: string; consolidado?: boolean; parcelas?: number; parcelaAtual?: number; fixaId?: string; diaCompra?: number; mesCompra?: number; anoCompra?: number }
type M = { lancamentos: Record<number, L[]>; faturaAtual: string; conferidos?: Record<string, boolean> }
const vazio: M = { lancamentos: {}, faturaAtual: '' }
const k = (a: number, m: number) => chaveDoMes('xp', a, m)
const todos = (d: Record<string, M>, key: string) => Object.values(d[key]?.lancamentos ?? {}).flat()
const base: Omit<L, 'id'> = { tipo: 'entrada', categoria: 'Saúde', descricao: 'Remédio', valor: 51.41, formaPagamento: 'credito', tipoLanc: 'variavel', consolidado: true, diaCompra: 31, mesCompra: 9, anoCompra: 2026 }

// 1) À vista editada para 6×: o "de 6" sem número (o que a edição gravava).
{
  const antes = { ...base, id: 'v-1-1' }
  const gravada = { ...antes, parcelas: 6 }   // como a edição deixava
  const d0: Record<string, M> = { [k(2026, 10)]: { ...vazio, lancamentos: { 30: [gravada] } } }
  t('controle: o defeito não é uma série', !emSerie(gravada))
  const d = refazerSerieDeParcelas(d0, { contaId: 'xp', ano: 2026, mes: 10, idMae: 'v-1-1', antes, n: 6, novoBase: 'v-9', vazio })
  const mae = todos(d, k(2026, 10))[0]
  t('mãe vira 1 de 6', mae.id === 'v-1-1' && mae.parcelaAtual === 1 && mae.parcelas === 6)
  const meses = [[2026, 11], [2027, 0], [2027, 1], [2027, 2], [2027, 3]]
  t('2 a 6 nos meses seguintes, atravessando o ano', meses.every(([a, m], i) => {
    const l = todos(d, k(a, m)).find(x => x.id === `v-1-${i + 2}`)
    return !!l && l.parcelaAtual === i + 2 && l.parcelas === 6 && l.valor === 51.41 && l.consolidado === false
  }))
  t('fevereiro: dia 30 vira 28', !!d[k(2027, 1)].lancamentos[28])
  t('mês vazio criado com faturaAtual', d[k(2027, 0)].faturaAtual === '')
  // Aparece no realizado dos meses seguintes.
  let soma = 0
  for (let i = 0; i < 9; i++) {
    let m = 10 + i, a = 2026; while (m > 11) { m -= 12; a++ }
    const r = construirRealizadoMes({ ano: a, mes: m, extratoData: {}, faturaData: d as never, contas: [{ id: 'xp', tipo: 'cartao', nome: 'XP', diaFechamento: 22, diaVencimento: 1, ativa: true }] as never, categorias: [], planoAno: undefined })
    soma += Object.values(r.saidasMap).reduce((s, c) => s + (c as { total: number }).total, 0)
  }
  t('as 6 parcelas entram no realizado dos meses', Math.abs(soma - 6 * 51.41) < 1e-6)
  // Salvar de novo não duplica.
  const d2 = refazerSerieDeParcelas(d, { contaId: 'xp', ano: 2026, mes: 10, idMae: 'v-1-1', antes: mae, n: 6, novoBase: 'v-9', vazio })
  t('salvar de novo não duplica', todos(d2, k(2027, 3)).length === 1 && d2 === d)
}

// 2) A fixa lançada sozinha (id fixa-<cat>-2026-11) vira série com id novo,
//    leva a bolinha e não colide com a fixa de dezembro.
{
  const antes = { ...base, id: 'fixa-c1-2026-11', fixaId: 'c1' }
  const d0: Record<string, M> = {
    [k(2026, 10)]: { ...vazio, conferidos: { 'fixa-c1-2026-11': true }, lancamentos: { 30: [{ ...antes, parcelas: 3 }] } },
    [k(2026, 11)]: { ...vazio, lancamentos: { 30: [{ ...base, id: 'fixa-c1-2026-12', fixaId: 'c1' }] } },
  }
  const d = refazerSerieDeParcelas(d0, { contaId: 'xp', ano: 2026, mes: 10, idMae: 'fixa-c1-2026-11', antes, n: 3, novoBase: 'v-9', vazio })
  const mae = todos(d, k(2026, 10))[0]
  t('fixa: mãe com id novo v-9-1', mae.id === 'v-9-1' && mae.parcelaAtual === 1 && mae.fixaId === 'c1')
  t('fixa: bolinha vai junto', d[k(2026, 10)].conferidos?.['v-9-1'] === true && d[k(2026, 10)].conferidos?.['fixa-c1-2026-11'] === undefined)
  const dez = todos(d, k(2026, 11))
  t('fixa: dezembro tem a fixa intacta + a parcela 2 sem fixaId', dez.length === 2 && dez.some(l => l.id === 'fixa-c1-2026-12' && !l.parcelas) && dez.some(l => l.id === 'v-9-2' && !l.fixaId))
}

// 3) De 6 para 3: as 4..6 saem; de 3 para 1: volta à vista.
{
  const serie: Record<string, M> = {}
  for (let p = 1; p <= 6; p++) {
    let m = 9 + p, a = 2026; while (m > 11) { m -= 12; a++ }
    serie[k(a, m)] = { ...vazio, conferidos: { [`v-5-${p}`]: true }, lancamentos: { 10: [{ ...base, id: `v-5-${p}`, parcelas: 6, parcelaAtual: p }] } }
  }
  const antes = todos(serie, k(2026, 10))[0]
  serie[k(2026, 10)].lancamentos[10] = [{ ...antes, parcelas: 3 }]
  const d = refazerSerieDeParcelas(serie, { contaId: 'xp', ano: 2026, mes: 10, idMae: 'v-5-1', antes, n: 3, novoBase: 'v-9', vazio })
  t('6→3: as 3 primeiras dizem de 3', [k(2026, 10), k(2026, 11), k(2027, 0)].every(x => todos(d, x)[0]?.parcelas === 3))
  t('6→3: 4 a 6 saem com a bolinha', [k(2027, 1), k(2027, 2), k(2027, 3)].every(x => todos(d, x).length === 0 && Object.keys(d[x].conferidos ?? {}).length === 0))
  const mae3 = todos(d, k(2026, 10))[0]
  d[k(2026, 10)].lancamentos[10] = [{ ...mae3, parcelas: undefined }]
  const d1 = refazerSerieDeParcelas(d, { contaId: 'xp', ano: 2026, mes: 10, idMae: 'v-5-1', antes: mae3, n: 1, novoBase: 'v-9', vazio })
  const m1 = todos(d1, k(2026, 10))[0]
  t('3→1: mãe à vista', m1.parcelas === undefined && m1.parcelaAtual === undefined)
  t('3→1: as outras saem', todos(d1, k(2026, 11)).length === 0 && todos(d1, k(2027, 0)).length === 0)
  // Controle: editar a parcela 2 não refaz nada.
  const d2 = refazerSerieDeParcelas(serie, { contaId: 'xp', ano: 2026, mes: 11, idMae: 'v-5-2', antes: { parcelas: 6, parcelaAtual: 2 }, n: 2, novoBase: 'v-9', vazio })
  t('controle: a filha não refaz a série', d2 === serie)
}

console.log(`prova118: ${ok} ok, ${falha} falhas`)
if (falha) process.exit(1)
