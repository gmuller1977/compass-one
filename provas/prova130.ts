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
  ehContaDisponivel, type Deps,
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

const hoje = new Date(2026, 10, 15) // 15/11/2026: novembro é o mês corrente

// ---------- Cadastro ----------
const conta = (o: object) => ({ cor: '', icone: '', ...o }) as any
const contas = [
  conta({ id: 'sic', nome: 'Sicredi', banco: 'Sicredi', tipo: 'corrente', saldoInicial: 2000, preferida: true }),
  conta({ id: 'cx', nome: 'Caixa', banco: 'Caixa', tipo: 'corrente', saldoInicial: 500 }),
  conta({ id: 'inv', nome: 'Poupança', banco: 'Caixa', tipo: 'poupanca', saldoInicial: 1000 }),
  conta({ id: 'xp', nome: 'XP', tipo: 'cartao', diaFechamento: 3, diaVencimento: 10, contaPagamentoId: 'sic', formaPagamentoFatura: 'boleto' }),
  conta({ id: 'nub', nome: 'Nubank', tipo: 'cartao', diaFechamento: 25, diaVencimento: 5, contaPagamentoId: 'cx', formaPagamentoFatura: 'boleto' }),
]
const cat = (o: object) => ({ cor: '', icone: '', ativa: true, fixa: false, tipoMovimento: 'banco', formaPagamento: 'pix', ...o }) as any
const categoriasBase = [
  cat({ id: 'sal', nome: 'Salário', tipo: 'entrada', fixa: true, contaDebitoId: 'sic', diaVencimento: 5, grupo: 'Renda' }),
  cat({ id: 'cli', nome: 'Clientes', tipo: 'entrada', contaDebitoId: 'sic', grupo: 'Renda' }),
  cat({ id: 'fit', nome: 'Fitway', tipo: 'entrada', fixa: true, tipoMovimento: 'dinheiro', formaPagamento: 'dinheiro', diaVencimento: 8, grupo: 'Renda', ativa: false }),
  cat({ id: 'alu', nome: 'Aluguel', tipo: 'saida', fixa: true, contaDebitoId: 'sic', diaVencimento: 10, grupo: 'Casa' }),
  cat({ id: 'luz', nome: 'Luz', tipo: 'saida', fixa: true, contaDebitoId: 'cx', diaVencimento: 20, formaPagamento: 'boleto', grupo: 'Casa' }),
  cat({ id: 'str', nome: 'Streaming', tipo: 'saida', fixa: true, tipoMovimento: 'cartao', formaPagamento: 'cartao', contaDebitoId: 'xp', grupo: 'Lazer' }),
  cat({ id: 'mer', nome: 'Mercado', tipo: 'saida', contaDebitoId: 'sic', grupo: 'Alimentação' }),
  cat({ id: 'laz', nome: 'Lazer', tipo: 'saida', tipoMovimento: 'dinheiro', formaPagamento: 'dinheiro', grupo: 'Lazer' }),
  cat({ id: 'ves', nome: 'Vestuário', tipo: 'saida', tipoMovimento: 'cartao', formaPagamento: 'cartao', grupo: 'Compras' }),
  cat({ id: 'aca', nome: 'Academia', tipo: 'saida', contaDebitoId: 'cx', grupo: 'Saúde', ativa: false }),
]

// ---------- Plano (2026 e 2027, para atravessar o ano) ----------
const linha = (id: string, nome: string, grupo: string, t: string, v: number) => ({ id, nome, grupo, t, v: Array(12).fill(v) })
const planoAno = () => ({
  saldoInicialJan: 0,
  entradas: [linha('sal', 'Salário', 'Renda', 'banco', 5000), linha('cli', 'Clientes', 'Renda', 'banco', 800), linha('fit', 'Fitway', 'Renda', 'dinheiro', 663)],
  saidas: [
    linha('alu', 'Aluguel', 'Casa', 'banco', 1500), linha('luz', 'Luz', 'Casa', 'banco', 200),
    linha('str', 'Streaming', 'Lazer', 'cartao', 55), linha('mer', 'Mercado', 'Alimentação', 'banco', 1000),
    linha('laz', 'Lazer', 'Lazer', 'dinheiro', 300), linha('ves', 'Vestuário', 'Compras', 'cartao', 200),
  ],
})
const planos: any = { 2026: planoAno(), 2027: planoAno() }

// ---------- Movimento ----------
let seq = 0
const l = (tipo: 'entrada' | 'saida', valor: number, categoria: string, formaPagamento = 'pix') =>
  ({ id: `l${++seq}`, tipo, valor, categoria, descricao: categoria, formaPagamento, tipoLanc: 'variavel' })
const extratoData: any = {
  // Outubro (fechado): salário e aluguel pagos, fatura do XP paga, mercado; o
  // saldo da Caixa foi conciliado com o banco (conciliação vence no fechado).
  'sic-2026-10': { saldoBanco: '', lancamentos: { 12: [l('saida', 700, 'Mercado')] },
    fixasConsolidadas: { sal: true, alu: true, 'cartao-xp': true } },
  'cx-2026-10': { saldoBanco: '480,00', saldoBancoInformado: true, saldoBancoData: '2026-10-31', lancamentos: { 20: [l('saida', 30, 'Luz', 'boleto')] } },
  // Novembro (corrente): salário e aluguel pagos; luz (dia 20) ainda não;
  // mercado no débito; clientes recebeu parte; academia desativada com gasto.
  'sic-2026-11': { saldoBanco: '', lancamentos: { 6: [l('saida', 300, 'Mercado')], 9: [l('entrada', 300, 'Clientes')] },
    fixasConsolidadas: { sal: true, alu: true } },
  'cx-2026-11': { saldoBanco: '', lancamentos: { 7: [l('saida', 100, 'Academia')] } },
  // Carteira: Fitway recebida em espécie (e desativada depois); lazer estourou.
  'dinheiro-2026-11': { saldoBanco: '', lancamentos: { 11: [l('saida', 450, 'Lazer', 'dinheiro')] },
    fixasConsolidadas: { fit: true } },
}
const compra = (valor: number, categoria: string) => ({ id: `f${++seq}`, tipo: 'entrada', valor, categoria, descricao: categoria })
const faturaData: any = {
  'xp-2026-10': { lancamentos: { 1: [compra(250, 'Mercado')] } },
  'xp-2026-11': { lancamentos: { 1: [compra(500, 'Mercado'), compra(55, 'Streaming')] } },
  'nub-2026-11': { lancamentos: { 18: [compra(120, 'Vestuário')] } },
}

const CENARIOS = ['pessimista', 'moderado', 'otimista'] as const
const depsDe = (cenarioPrevisao: string, categorias = categoriasBase): Deps => ({
  extratoData, faturaData, contas, categorias, planos, saldoInicialDinheiro: 200, cenarioPrevisao,
} as any)
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
