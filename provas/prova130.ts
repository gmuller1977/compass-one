// prova130 — As telas dão o mesmo número (24/11/2026, revisão de 24/11, A4).
//
// As provas que trancavam o motor (28, 35, 40, 57) se perderam antes de as
// provas morarem no repositório. Esta refaz os invariantes centrais numa
// família fixa: 2 bancos, 1 investimento, 2 cartões e carteira; fixas pagas e
// não pagas; fixa de cartão; receita variável; categoria que estoura, que
// sobra, e gasto em categoria desativada; conciliação num mês fechado; e a
// Fitway (receita fixa em dinheiro, desativada depois de recebida, R$ 663,00).
//
// O que se confere, nos três cenários:
//   1. Radar = soma das contas (realizado) e cada linha do mês fecha.
//   2. A memória de cálculo soma exatamente o saldo final previsto.
//   3. O mês fechado abre o seguinte; a série do Simulador/gráfico é igual,
//      bit a bit, ao saldo previsto de cada mês, atravessando o ano.
//   4. A projeção por conta soma a projeção do mês (Lançamentos × Radar).
//   5. Regras que já custaram caro: fixa recebida e desativada continua
//      contando; o otimista reserva o mesmo que a "sobra" do Ritmo; e os
//      cenários divergem (controle: sem isso a parte 2 não testaria o rateio).
import {
  saldoBancosEDinheiro, saldoRealizadoConta, saldoTotalNoFim, saldosPrevistosEmSerie,
  saldoContaNoFim, detalharMes, detalharPrevisto, memoriaDoRadar, saldoFinalDinheiro,
  ehContaDisponivel,
} from '../src/utils/saldoConta'
import { construirRealizadoMes } from '../src/utils/realizadoMes'
import { totaisDoMes, nomesDeCartao } from '../src/components/acompanhamento/evolucaoCalcs'
import { ritmoDoMes } from '../src/utils/ritmoDoMes'

let ok = 0, falhas = 0
const t = (nome: string, cond: boolean, extra?: unknown) => {
  if (cond) ok++
  else { falhas++; console.log('FALHOU:', nome, extra !== undefined ? JSON.stringify(extra) : '') }
}
const perto = (a: number, b: number) => Math.abs(a - b) < 1e-6

import { hoje, contas, categoriasBase, planos, extratoData, faturaData, CENARIOS, depsDe } from './familia'

const alvos = [...contas.filter(c => c.tipo !== 'cartao' && ehContaDisponivel(c)).map(c => c.id), 'dinheiro']
const MESES = [[2026, 10], [2026, 11], [2027, 0], [2027, 1]] as const // nov, dez, jan, fev

const finais: Record<string, number> = {}
for (const cen of CENARIOS) {
  const deps = depsDe(cen)

  // 1. Radar = soma das contas; cada linha do mês fecha.
  for (const [a, m] of [[2026, 9], [2026, 10]] as const) {
    const radar = saldoBancosEDinheiro(a, m, deps)
    const soma = alvos.reduce((s, id) => s + saldoRealizadoConta(id, a, m, deps), 0)
    t(`${cen} ${m + 1}/${a}: Radar = soma das contas`, perto(radar, soma), { radar, soma })
    const linhas = detalharMes(a, m, deps)
    t(`${cen} ${m + 1}/${a}: linhas do mês somam o Radar`, perto(linhas.reduce((s, x) => s + x.final, 0), radar))
    for (const x of linhas)
      t(`${cen} ${m + 1}/${a} ${x.nome}: inicial + entradas − saídas + ajuste = final`,
        perto(x.inicial + x.entradas - x.saidas + x.ajuste, x.final), x)
  }
  t(`${cen}: o investimento fica fora do disponível`, !alvos.includes('inv'))

  // 2. A memória de cálculo fecha no saldo final previsto.
  const mem = memoriaDoRadar(2026, 10, deps, { hoje })
  const somaMem = mem.abertura + mem.entradasReais - mem.saidasReais + (mem.ajusteConciliacao ?? 0)
    + mem.entradasPrevistas + mem.receitasAReceber
    - mem.fixasPrevistas - mem.faturaEmAberto - mem.faturaEstimada - mem.variaveisARealizar
  t(`${cen}: linhas da memória somam o fechamento`, perto(somaMem, mem.fechamento), { somaMem, fechamento: mem.fechamento })
  const previstoNov = saldoTotalNoFim(2026, 10, deps, { comoAbertura: true, hoje }).valor
  t(`${cen}: fechamento da memória === saldo previsto (igualdade exata)`, mem.fechamento === previstoNov)

  // 3. O mês fechado abre o seguinte; a série é o saldo previsto, bit a bit.
  const out = saldoBancosEDinheiro(2026, 9, deps)
  t(`${cen}: novembro abre com o fechamento de outubro`, perto(mem.abertura, out), { abertura: mem.abertura, out })
  t(`${cen}: outubro (fechado) não projeta`, saldoTotalNoFim(2026, 9, deps, { comoAbertura: true, hoje }).valor === out)
  const serie = saldosPrevistosEmSerie(MESES.length, deps, hoje)
  MESES.forEach(([a, m], i) => {
    const d = detalharPrevisto(a, m, deps, { comoAbertura: true, hoje })
    t(`${cen} ${m + 1}/${a}: série === saldo previsto (igualdade exata)`,
      serie[i] === saldoTotalNoFim(a, m, deps, { comoAbertura: true, hoje }).valor, { serie: serie[i], valor: d.valor })
    t(`${cen} ${m + 1}/${a}: base + entradas − saídas = previsto`, perto(d.base + d.entradas - d.saidas, d.valor))
    // 4. A projeção por conta soma a do mês.
    const porConta = alvos.reduce((s, id) => s + saldoContaNoFim(id, a, m, deps, { comoAbertura: true, hoje }).valor, 0)
    t(`${cen} ${m + 1}/${a}: soma das contas projetadas = previsto do mês`, perto(porConta, d.valor), { porConta, valor: d.valor })
  })
  finais[cen] = previstoNov

  // 5b. Otimista: a reserva da variável é a "sobra" do Ritmo do mês.
  if (cen === 'otimista') {
    const { saidasMap, entradasMap } = construirRealizadoMes({
      ano: 2026, mes: 10, extratoData, faturaData, contas, categorias: categoriasBase, planoAno: planos[2026] })
    const tot = totaisDoMes({ mes: 10, planoAno: planos[2026], categorias: categoriasBase,
      cartaoNomes: nomesDeCartao(contas), entradasMap, saidasMap })
    const ritmo = ritmoDoMes(tot.saida.linhas, categoriasBase, hoje)
    const p = detalharPrevisto(2026, 10, deps, { comoAbertura: true, hoje })
    const reserva = p.variaveisSaida.reduce((s, x) => s + x.valor, 0)
    t('otimista: reserva da variável === sobra do Ritmo', !!ritmo && perto(reserva, ritmo.sobra), { reserva, sobra: ritmo?.sobra })
    t('otimista: a Fitway (desativada) entra no realizado', (entradasMap['Fitway']?.total ?? Object.values(entradasMap).find((x: any) => x.total === 663)?.total) === 663)
  }
}

// 5c. Os cenários divergem (controle) e ficam em ordem.
t('pessimista ≤ moderado ≤ otimista', finais.pessimista <= finais.moderado + 1e-9 && finais.moderado <= finais.otimista + 1e-9, finais)
t('controle: pessimista e otimista divergem nesta família', finais.otimista - finais.pessimista > 1, finais)

// 5a. Fixa recebida e desativada depois continua contando (os R$ 663,00).
const ativa = categoriasBase.map(c => c.id === 'fit' ? { ...c, ativa: true } : c)
const dinDesat = saldoFinalDinheiro(2026, 10, depsDe('pessimista'))
const dinAtiva = saldoFinalDinheiro(2026, 10, depsDe('pessimista', ativa))
t('carteira: 200 + 663 da Fitway − 450 de lazer', perto(dinDesat, 413), dinDesat)
t('desativar a Fitway não desfaz o recebimento', perto(dinDesat, dinAtiva), { dinDesat, dinAtiva })
t('Radar com Fitway desativada = com ativa', perto(saldoBancosEDinheiro(2026, 10, depsDe('pessimista')),
  saldoBancosEDinheiro(2026, 10, depsDe('pessimista', ativa))))

// Controle negativo: sem a confirmação da Fitway, a carteira perde os 663.
const semFit = { ...extratoData, 'dinheiro-2026-11': { ...extratoData['dinheiro-2026-11'], fixasConsolidadas: {} } }
t('controle: sem confirmar, a Fitway não entra', perto(saldoFinalDinheiro(2026, 10, { ...depsDe('pessimista'), extratoData: semFit } as any), 200 - 450))

console.log(`prova130: ${ok} ok, ${falhas} falhas`)
if (falhas) process.exit(1)
