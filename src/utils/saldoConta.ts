import type { Conta, Categoria, DadosMes, PlanoAnoData } from '../context/AppContext'
import { parseBRL } from './moeda'
import { valorFixaNoMes } from './valorFixa'
import { resolverFixaDoMes, dadosBancariosDoMes } from './fixasDoMes'
import { construirRealizadoMes } from './realizadoMes'
import { resolverRealKey } from '../components/acompanhamento/evolucaoCalcs'

export type Deps = {
  extratoData: Record<string, DadosMes>
  faturaData: Record<string, { lancamentos?: Record<number, { tipo: string; valor: number }[]> }>
  contas: Conta[]
  categorias: Categoria[]
  planos: Record<number, PlanoAnoData | undefined>
  saldoInicialDinheiro: number
}

const ym = (ano: number, mes: number) => ano * 100 + (mes + 1)

/**
 * Saldo de uma conta ao FIM de um mês.
 *
 * Três coisas movimentam uma conta de banco, e todas contam aqui:
 *   - os lançamentos do extrato
 *   - as categorias fixas confirmadas naquela conta
 *   - o pagamento da fatura do cartão, gravado como a fixa `cartao-<id>`
 *
 * O saldo informado na conciliação, quando existe, **vence**: ele veio do
 * extrato do banco e é a verdade. Meses sem informado partem do último
 * informado anterior — ou do saldo de cadastro, se nunca houve nenhum.
 *
 * A fixa é lida da PRÓPRIA conta, não do mês inteiro: aqui a pergunta é
 * "quanto tem nesta conta", e uma fixa confirmada na conta A não tirou
 * dinheiro da conta B. (Difere de `resolverFixaDoMes`, que responde "esta
 * fixa do mês foi paga?" e por isso olha todas as contas.)
 */
export function saldoFinalConta(
  conta: Conta,
  ano: number,
  mes: number,
  deps: Deps,
): number {
  const { extratoData } = deps
  const prefixo = conta.id + '-'
  const alvo = ym(ano, mes)

  const informadoDe = (dm?: DadosMes) => {
    const v = parseBRL(dm?.saldoBanco ?? '')
    return v > 0 ? v : null
  }

  const chave = `${conta.id}-${ano}-${String(mes + 1).padStart(2, '0')}`
  const jaInformado = informadoDe(extratoData[chave])
  if (jaInformado !== null) return jaInformado

  // Último mês anterior com saldo informado vira a base.
  let baseYM = 0
  let base = conta.saldoInicial ?? 0
  for (const [k, dm] of Object.entries(extratoData)) {
    if (!k.startsWith(prefixo)) continue
    const v = informadoDe(dm)
    if (v === null) continue
    const kym = parseInt(k.slice(-7, -3)) * 100 + parseInt(k.slice(-2))
    if (kym < alvo && kym > baseYM) { baseYM = kym; base = v }
  }

  let acc = base
  for (const [k, dm] of Object.entries(extratoData)) {
    if (!k.startsWith(prefixo)) continue
    const kAno = parseInt(k.slice(-7, -3))
    const kMes = parseInt(k.slice(-2)) - 1
    if (!Number.isFinite(kAno) || !Number.isFinite(kMes)) continue
    const kym = ym(kAno, kMes)
    if (kym <= baseYM || kym > alvo) continue
    const mov = movimentoDoMes(dm, kAno, kMes, deps)
    acc += mov.entradas - mov.saidas
  }
  return acc
}

/** Entradas e saídas de um mês, numa conta: lançamentos + fixas + fatura. */
function movimentoDoMes(
  dm: DadosMes, ano: number, mes: number, deps: Deps,
): { entradas: number; saidas: number } {
  const { categorias, planos, contas, faturaData } = deps
  let entradas = 0
  let saidas = 0
  const acumular = (v: number) => { if (v >= 0) entradas += v; else saidas -= v }

  for (const itens of Object.values(dm.lancamentos ?? {}))
    for (const l of itens)
      acumular(l.tipo === 'entrada' ? l.valor : -l.valor)

  for (const [catId, confirmada] of Object.entries(dm.fixasConsolidadas ?? {})) {
    if (!confirmada) continue
    const override = dm.fixasValorOverride?.[catId]

    if (catId.startsWith('cartao-')) {
      acumular(-(override !== undefined && override > 0
        ? override
        : totalFatura(catId.slice(7), ano, mes, contas, faturaData)))
      continue
    }

    const cat = categorias.find(c => c.id === catId)
    if (!cat) continue
    const valor = valorFixaNoMes(cat, planos[ano], mes, categorias, override)
    if (valor <= 0) continue
    acumular(cat.tipo === 'entrada' ? valor : -valor)
  }
  return { entradas, saidas }
}

/** Total da fatura paga num mês de vencimento. */
function totalFatura(
  cardId: string,
  anoVenc: number,
  mesVenc: number,
  contas: Conta[],
  faturaData: Deps['faturaData'],
): number {
  const card = contas.find(c => c.id === cardId)
  const offset = card && (card.diaVencimento ?? 1) < (card.diaFechamento ?? 1) ? 1 : 0
  let pMes = mesVenc - offset
  let pAno = anoVenc
  if (pMes < 0) { pMes += 12; pAno-- }

  const dm = faturaData[`${cardId}-${pAno}-${String(pMes + 1).padStart(2, '0')}`]
  if (!dm?.lancamentos) return 0

  let total = 0
  for (const itens of Object.values(dm.lancamentos))
    // entrada = compra, saida = estorno
    for (const l of itens) total += l.tipo === 'entrada' ? l.valor : -l.valor
  return total > 0 ? total : 0
}

/** Saldo do dinheiro em carteira ao fim de um mês. */
export function saldoFinalDinheiro(ano: number, mes: number, deps: Deps): number {
  const alvo = ym(ano, mes)
  let acc = deps.saldoInicialDinheiro ?? 0
  for (const [k, dm] of Object.entries(deps.extratoData)) {
    if (!k.startsWith('dinheiro-')) continue
    const kym = parseInt(k.slice(-7, -3)) * 100 + parseInt(k.slice(-2))
    if (kym > alvo) continue
    for (const itens of Object.values(dm.lancamentos ?? {}))
      for (const l of itens) acc += l.tipo === 'entrada' ? l.valor : -l.valor
  }
  return acc
}

/**
 * O que o Radar mostra como saldo: bancos mais dinheiro, ao fim do mês.
 *
 * Cartão fica de fora por decisão de produto — cartão não tem saldo, tem
 * fatura, e a fatura já aparece como despesa no mês em que é paga.
 */
export function saldoBancosEDinheiro(ano: number, mes: number, deps: Deps): number {
  const bancos = deps.contas
    .filter(c => c.tipo !== 'cartao')
    .reduce((s, c) => s + saldoFinalConta(c, ano, mes, deps), 0)
  return bancos + saldoFinalDinheiro(ano, mes, deps)
}


/**
 * Saldo do fim de um mês, dizendo se é realizado ou projetado.
 *
 * Mês passado devolve o realizado. Mês futuro devolve a projeção: o realizado
 * mais tudo que ainda vai acontecer, do mês corrente até o mês pedido — ver
 * projecaoDoMes. A projeção encadeia, então novembro já carrega o previsto de
 * setembro e outubro.
 *
 * O mês CORRENTE depende da pergunta, e por isso existe `comoAbertura`:
 *
 *   "quanto tenho hoje"        -> realizado, bate com o extrato do banco
 *   "com quanto abre outubro"  -> previsto, inclui o que ainda vai cair
 *
 * São o mesmo mês e respostas diferentes. Sem essa distinção, ou o saldo atual
 * mente, ou o mês seguinte abre ignorando as contas que faltam pagar.
 *
 * A projeção é do MÊS, não da conta: contada uma vez, via projecaoDoMes.
 * Fixa sem contaDebitoId aparece em todas as contas até ser confirmada em
 * alguma — projetar por conta e somar contaria a mesma várias vezes.
 */
export function saldoTotalNoFim(
  ano: number,
  mes: number,
  deps: Deps,
  opts: { comoAbertura?: boolean; hoje?: Date } = {},
): { valor: number; previsto: boolean } {
  const hoje = opts.hoje ?? new Date()
  const realizado = saldoBancosEDinheiro(ano, mes, deps)
  const alvo = ym(ano, mes)
  const corrente = ym(hoje.getFullYear(), hoje.getMonth())
  const projetar = opts.comoAbertura ? alvo >= corrente : alvo > corrente
  if (!projetar) return { valor: realizado, previsto: false }

  let projecao = 0
  let a = hoje.getFullYear()
  let m = hoje.getMonth()
  while (ym(a, m) <= alvo) {
    projecao += projecaoDoMes(a, m, deps, hoje)
    m++
    if (m > 11) { m = 0; a++ }
  }
  return { valor: realizado + projecao, previsto: true }
}

/**
 * Conta onde uma categoria APARECE. A mesma regra da cascata de Lançamentos:
 * a conta de débito quando existe, senão a preferida — nunca "todas".
 */
function contaDaCategoria(cat: Categoria, padrao: string | undefined) {
  if (cat.tipoMovimento === 'dinheiro') return 'dinheiro'
  if (cat.tipoMovimento === 'cartao') return undefined
  return cat.contaDebitoId ?? padrao
}

/**
 * O que ainda FALTA gastar do planejado variável fora do cartão, numa conta.
 *
 * `max(0, planejado − realizado)` por categoria — a mesma fórmula que a fatura
 * em aberto já usava. Antes o mês corrente não projetava variável nenhuma:
 * somar o planejado por cima dos lançamentos reais contaria o mesmo gasto duas
 * vezes, então a escolha tinha sido não somar nada. O preço era um saldo final
 * otimista, que escondia dinheiro que já se sabe que vai sair.
 *
 * Mês inteiramente futuro cai na mesma conta: sem lançamento, o realizado é 0
 * e sobra o planejado inteiro. Estourado o plano, a sobra é 0 e vale o
 * realizado, que já está no extrato.
 *
 * O realizado é do MÊS, não da conta: um gasto pago por outro banco também
 * consumiu o planejado da categoria. Só a SOBRA se atribui a uma conta — a
 * mesma de `contaDaCategoria` —, e é isso que mantém `projecaoDoMes` igual à
 * soma de `projecaoDaConta`.
 *
 * Compra no cartão fica de fora (`totalCart`): ela consome o planejado do
 * cartão, que tem o complemento próprio.
 */
export function faltaVariavelBanco(
  alvo: string, ano: number, mes: number, deps: Deps,
): number {
  const { categorias, planos, contas } = deps
  const padrao = contaPadrao(contas)
  const daConta = categorias.filter(c =>
    c.tipo === 'saida' && c.ativa && !c.fixa && contaDaCategoria(c, padrao) === alvo)
  if (!daConta.length) return 0

  const { saidasMap } = construirRealizadoMes({
    ano, mes, extratoData: deps.extratoData, faturaData: deps.faturaData,
    contas, categorias, planoAno: planos[ano],
  })

  let falta = 0
  for (const cat of daConta) {
    const plan = valorFixaNoMes(cat, planos[ano], mes, categorias)
    if (plan <= 0) continue
    const k = resolverRealKey(saidasMap, cat.nome, cat.descricao)
    const feito = k ? saidasMap[k].totalBanc + saidasMap[k].totalDinheiro : 0
    if (plan > feito) falta += plan - feito
  }
  return falta
}

function contaPadrao(contas: Conta[]) {
  return (contas.find(c => c.tipo !== 'cartao' && c.preferida)
    ?? contas.find(c => c.tipo !== 'cartao'))?.id
}

/**
 * O que ainda vai acontecer numa CONTA, num mês. Três coisas, as mesmas que a
 * cascata de Lançamentos projeta:
 *
 *   - as fixas ainda não confirmadas que apareçam nesta conta
 *   - a fatura dos cartões pagos por esta conta, ainda não paga
 *   - os gastos variáveis planejados desta conta, só em mês INTEIRAMENTE futuro
 *
 * Variável só em mês inteiramente futuro pelo mesmo motivo de lá: no mês
 * corrente os lançamentos reais já contam, e somar o planejado por cima
 * cobraria o mesmo gasto duas vezes.
 *
 * Somar isto por todas as contas dá o mês inteiro, cada coisa uma vez — é o
 * que `projecaoDoMes` faz. Por isso a atribuição acima nunca pode ser "todas
 * as contas": era assim que a mesma fixa aparecia três vezes.
 *
 * O complemento da fatura é a exceção que confirma a regra. Ele é do MÊS — o
 * plano não diz em qual cartão o gasto vai cair —, então entra uma vez só, na
 * conta que paga o cartão de vencimento mais cedo, medido contra o total já
 * lançado em TODAS as faturas em aberto. Rateá-lo por conta o contaria de
 * novo a cada conta que paga cartão.
 */
function projecaoDaConta(
  alvo: string,
  ano: number,
  mes: number,
  deps: Deps,
  hoje: Date,
): { entradas: number; saidas: number } {
  const { extratoData, contas, categorias, planos, faturaData } = deps
  const sufixo = `-${ano}-${String(mes + 1).padStart(2, '0')}`
  const dms = dadosBancariosDoMes(
    extratoData,
    sufixo,
    k => contas.some(c => c.tipo === 'cartao' && k.startsWith(c.id)),
  )
  const padrao = contaPadrao(contas)

  let entradas = 0
  let saidas = 0

  for (const cat of categorias) {
    if (!cat.ativa) continue
    if (contaDaCategoria(cat, padrao) !== alvo) continue

    if (cat.fixa) {
      if (resolverFixaDoMes(cat.id, dms).consolidada) continue
      const v = valorFixaNoMes(cat, planos[ano], mes, categorias)
      if (v <= 0) continue
      if (cat.tipo === 'entrada') entradas += v
      else saidas += v
      continue
    }

    // Variável de saída não entra no laço: `faltaVariavelBanco` resolve todas
    // de uma vez, abaixo, e é a MESMA função que a cascata de Lançamentos
    // chama. Entrada variável fica de fora de propósito — Lançamentos também
    // não projeta, e incluir só aqui faria as duas telas discordarem.
  }

  saidas += faltaVariavelBanco(alvo, ano, mes, deps)

  const abertas = contas
    .filter(c => c.tipo === 'cartao' && c.diaVencimento)
    .filter(c => !resolverFixaDoMes(`cartao-${c.id}`, dms).consolidada)
    .sort((x, y) => (x.diaVencimento ?? 1) - (y.diaVencimento ?? 1))

  for (const c of abertas)
    if ((c.contaPagamentoId ?? padrao) === alvo)
      saidas += totalFatura(c.id, ano, mes, contas, faturaData)

  // Fatura que ainda não fechou vale o MAIOR entre o lançado e o planejado do
  // mês da compra — só o lançado subestima uma fatura que ainda vai crescer.
  const ref = abertas[0]
  if (ref && (ref.contaPagamentoId ?? padrao) === alvo) {
    const off = (ref.diaVencimento ?? 1) < (ref.diaFechamento ?? 1) ? 1 : 0
    let pMes = mes - off, pAno = ano
    if (pMes < 0) { pMes += 12; pAno-- }
    if (new Date(pAno, pMes, ref.diaFechamento ?? 1) > hoje) {
      const lancado = abertas.reduce(
        (s, c) => s + totalFatura(c.id, ano, mes, contas, faturaData), 0)
      saidas += Math.max(0, planejadoVariavel(pAno, pMes, deps, true) - lancado)
    }
  }

  return { entradas, saidas }
}

/** As contas que têm saldo: bancos e o dinheiro. Cartão não tem saldo. */
function alvosDeSaldo(contas: Conta[]): { id: string; nome: string; icone: string }[] {
  return [
    ...contas.filter(c => c.tipo !== 'cartao')
      .map(c => ({ id: c.id, nome: c.banco || c.nome, icone: c.icone })),
    { id: 'dinheiro', nome: 'Dinheiro em carteira', icone: '💵' },
  ]
}

/**
 * O que ainda vai acontecer no mês inteiro, líquido. Uma vez cada.
 *
 * Não tem cálculo próprio: é a soma das contas. Foi assim que a projeção
 * deixou de poder discordar do detalhe por conta — não há dois caminhos para
 * discordarem.
 */
function projecaoDoMes(ano: number, mes: number, deps: Deps, hoje: Date): number {
  return alvosDeSaldo(deps.contas).reduce((acc, a) => {
    const { entradas, saidas } = projecaoDaConta(a.id, ano, mes, deps, hoje)
    return acc + entradas - saidas
  }, 0)
}

/**
 * Soma planejada das categorias variáveis de saída de um mês, no cartão ou
 * fora dele.
 */
function planejadoVariavel(ano: number, mes: number, deps: Deps, doCartao: boolean): number {
  const { categorias, planos } = deps
  return categorias
    .filter(c => c.tipo === 'saida' && c.ativa && !c.fixa
      && (c.tipoMovimento === 'cartao') === doCartao)
    .reduce((s, c) => s + valorFixaNoMes(c, planos[ano], mes, categorias), 0)
}

/** Movimento REAL de uma conta num mês, já separado em entradas e saídas. */
function movimentoRealDoMes(
  alvo: string, ano: number, mes: number, deps: Deps,
): { entradas: number; saidas: number } {
  const dm = deps.extratoData[`${alvo}-${ano}-${String(mes + 1).padStart(2, '0')}`]
  if (!dm) return { entradas: 0, saidas: 0 }
  // O dinheiro não tem fixa nem fatura: só o que foi lançado, igual ao que
  // saldoFinalDinheiro soma.
  if (alvo === 'dinheiro') {
    let entradas = 0, saidas = 0
    for (const itens of Object.values(dm.lancamentos ?? {}))
      for (const l of itens) {
        if (l.tipo === 'entrada') entradas += l.valor
        else saidas += l.valor
      }
    return { entradas, saidas }
  }
  return movimentoDoMes(dm, ano, mes, deps)
}

/**
 * Saldo REALIZADO de uma conta ao fim de um mês: o que o extrato explica.
 * Mês futuro devolve o saldo de hoje, porque saldoFinalConta acumula até o mês
 * pedido e para.
 */
function saldoRealizadoConta(alvo: string, ano: number, mes: number, deps: Deps): number {
  if (alvo === 'dinheiro') return saldoFinalDinheiro(ano, mes, deps)
  const conta = deps.contas.find(c => c.id === alvo)
  return conta ? saldoFinalConta(conta, ano, mes, deps) : 0
}

/**
 * Saldo de UMA conta ao fim de um mês, realizado ou projetado.
 *
 * O Radar NÃO usa isto: ele é acompanhamento em tempo real e só mostra
 * realizado. Fica para a visão de previsão do Planejamento.
 */
export function saldoContaNoFim(
  alvo: string,
  ano: number,
  mes: number,
  deps: Deps,
  opts: { comoAbertura?: boolean; hoje?: Date } = {},
): { valor: number; previsto: boolean } {
  const hoje = opts.hoje ?? new Date()
  const realizado = saldoRealizadoConta(alvo, ano, mes, deps)

  const alvoYM = ym(ano, mes)
  const corrente = ym(hoje.getFullYear(), hoje.getMonth())
  const projetar = opts.comoAbertura ? alvoYM >= corrente : alvoYM > corrente
  if (!projetar) return { valor: realizado, previsto: false }

  let projecao = 0
  let a = hoje.getFullYear()
  let m = hoje.getMonth()
  while (ym(a, m) <= alvoYM) {
    const { entradas, saidas } = projecaoDaConta(alvo, a, m, deps, hoje)
    projecao += entradas - saidas
    m++
    if (m > 11) { m = 0; a++ }
  }
  return { valor: realizado + projecao, previsto: true }
}

export type LinhaMes = {
  id: string
  nome: string
  icone: string
  inicial: number
  entradas: number
  saidas: number
  /**
   * Saldo informado na conciliação menos o que a movimentação explicaria.
   * Sem ele a linha não fecha: `saldoFinalConta` deixa o informado vencer, e
   * é justamente aí que mora a diferença que a conciliação existe para achar.
   */
  ajuste: number
  final: number
}

/**
 * Como o saldo do mês se formou, conta por conta.
 *
 * `inicial` e `final` saem da MESMA função que alimenta os cartões do topo do
 * Radar, então a soma das linhas bate com eles por construção, não por
 * coincidência.
 *
 * Só realizado, como todo o Radar. O mês seguinte abre com o saldo que a conta
 * tem hoje: `saldoFinalConta` acumula até o mês pedido e para, então um mês
 * futuro devolve o saldo de agora.
 *
 * `entradas` e `saidas` são movimentação da CONTA — não são as Receitas e
 * Despesas por categoria dos outros dois cartões, que respondem outra
 * pergunta e não têm por que dar o mesmo número.
 */
export function detalharMes(ano: number, mes: number, deps: Deps): LinhaMes[] {
  const mAnt = mes === 0 ? 11 : mes - 1
  const aAnt = mes === 0 ? ano - 1 : ano

  return alvosDeSaldo(deps.contas).map(a => {
    const inicial = saldoRealizadoConta(a.id, aAnt, mAnt, deps)
    const final = saldoRealizadoConta(a.id, ano, mes, deps)
    const { entradas, saidas } = movimentoRealDoMes(a.id, ano, mes, deps)

    return {
      id: a.id, nome: a.nome, icone: a.icone,
      inicial, entradas, saidas,
      ajuste: final - (inicial + entradas - saidas),
      final,
    }
  })
}
