import type { Conta, Categoria, DadosMes, PlanoAnoData } from '../context/AppContext'
import type { Memoria } from '../components/novoLancamentoExtrato/NleShared'
import { parseBRL } from './moeda'
import { valorFixaNoMes } from './valorFixa'
import { resolverFixaDoMes, dadosBancariosDoMes } from './fixasDoMes'
import { diaEfetivoFixa, faturaEhAutomatica } from './diaDaFixa'
import { ehAutomaticoCategoria } from './categoriaIcone'
import { construirRealizadoMes } from './realizadoMes'
import { somaNaMae } from './categoriaMae'
import { resolverRealKey, splitCatKey, cadastroDaLinha, norm } from '../components/acompanhamento/evolucaoCalcs'

/**
 * Como agregar o que ainda falta gastar e receber do plano.
 *
 * O que muda e o NIVEL em que a sobra de uma categoria e cortada no zero.
 * Cortar por categoria descarta os estouros, e a reserva fica maior; somar
 * antes de cortar deixa a categoria que estourou ser paga pela que sobrou.
 *
 * A diferenca entre os dois extremos e, por identidade, o estouro total do
 * mes: somar so as sobras positivas descarta os negativos.
 *
 *   pessimista  gasta tudo que sobrou e nao recebe o que ja veio adiantado
 *   moderado    compensa dentro do grupo — comeu fora demais, cozinha mais
 *   otimista    compensa no total, como uma planilha faz
 *
 * O nivel NAO e o mesmo nos dois lados: reduzir a saida e reduzir a entrada
 * empurram o saldo para lados opostos. "Pessimista" quer o pior saldo, entao
 * maximiza a saida (corta por categoria) e minimiza a entrada (corta no
 * total). "Otimista" faz o contrario. "Moderado" usa o grupo nos dois.
 */
export type CenarioPrevisao = 'pessimista' | 'moderado' | 'otimista'

export type Balde = 'banco' | 'cartao' | 'entrada'

/**
 * Em que nivel a sobra e cortada no zero, por cenario e por balde.
 *
 * Cortar por CATEGORIA descarta os estouros e maximiza o balde; somar no
 * TOTAL antes de cortar minimiza. Como saida e entrada empurram o saldo para
 * lados opostos, o cenario aplica niveis opostos aos dois — senao
 * pessimista seria pessimista na despesa e otimista na receita.
 */
function nivelDoCenario(cenario: CenarioPrevisao | undefined, balde: Balde): 'categoria' | 'grupo' | 'total' {
  if (cenario === 'moderado') return 'grupo'
  const ehSaida = balde !== 'entrada'
  const maximiza = cenario === 'otimista' ? !ehSaida : ehSaida
  return maximiza ? 'categoria' : 'total'
}

export type Deps = {
  extratoData: Record<string, DadosMes>
  /** Ausente vale `pessimista`, que e o comportamento historico da saida. */
  cenarioPrevisao?: CenarioPrevisao
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

/**
 * Saldo do dinheiro em carteira ao fim de um mês.
 *
 * Passa pelo MESMO `movimentoDoMes` que o banco. Antes somava só
 * `dm.lancamentos`, e por isso **fixa confirmada em espécie sumia**: uma
 * receita fixa de 663,00 marcada como recebida entrava na cascata de
 * Lançamentos e não entrava aqui. O Radar mostrava a carteira 663,00 menor
 * que a própria tela de Lançamentos, e o saldo final previsto herdava o erro
 * inteiro. Medido em 11/09/2026 num mês real.
 *
 * O comentário que sobrevivia dizia que "o dinheiro não tem fixa nem fatura".
 * Tem: `cascataDoMes` monta a lista de fixas da carteira com
 * `tipoMovimento === 'dinheiro'`, e elas podem ser confirmadas como qualquer
 * outra. O que o dinheiro não tem é **conciliação que vença** — o saldo
 * informado da carteira continua fora da base, de propósito.
 */
export function saldoFinalDinheiro(ano: number, mes: number, deps: Deps): number {
  const alvo = ym(ano, mes)
  let acc = deps.saldoInicialDinheiro ?? 0
  for (const [k, dm] of Object.entries(deps.extratoData)) {
    if (!k.startsWith('dinheiro-')) continue
    const kAno = parseInt(k.slice(-7, -3))
    const kMes = parseInt(k.slice(-2)) - 1
    if (!Number.isFinite(kAno) || !Number.isFinite(kMes)) continue
    if (ym(kAno, kMes) > alvo) continue
    const mov = movimentoDoMes(dm, kAno, kMes, deps)
    acc += mov.entradas - mov.saidas
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


/** Uma linha do previsto, com o mês a que ela pertence. */
export type ItemPrevistoNoMes = ItemPrevisto & { ano: number; mes: number }

/**
 * O saldo final previsto, aberto nas partes que o formam.
 *
 * A identidade que a tela garante, e que a prova tranca:
 *
 *   base + entradas − saidas = valor = saldoTotalNoFim(...).valor
 *
 * `base` é o saldo realizado — o "Saldo atual" do Radar. As listas cobrem a
 * JANELA inteira da projeção, do mês corrente até o pedido, porque é isso que
 * o saldo final previsto de um mês futuro de fato soma: dezembro visto de
 * setembro carrega as fixas de setembro, outubro, novembro e dezembro. `meses`
 * diz qual é a janela, para a tela poder dizê-la ("Set–Dez").
 *
 * Mês fechado não projeta: `previsto` é falso, as listas vêm vazias e `valor`
 * é o próprio realizado.
 */
export type PrevistoDetalhe = {
  valor: number
  previsto: boolean
  base: number
  meses: { ano: number; mes: number }[]
  entradas: number
  saidas: number
  sobrasVariavel: number
  estourosVariavel: number
  fixasEntrada: ItemPrevistoNoMes[]
  fixasSaida: ItemPrevistoNoMes[]
  variaveisEntrada: ItemPrevistoNoMes[]
  variaveisSaida: ItemPrevistoNoMes[]
  faturas: ItemPrevistoNoMes[]
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
export function detalharPrevisto(
  ano: number,
  mes: number,
  deps: Deps,
  opts: { comoAbertura?: boolean; hoje?: Date } = {},
): PrevistoDetalhe {
  const hoje = opts.hoje ?? new Date()
  const realizado = saldoBancosEDinheiro(ano, mes, deps)
  const alvo = ym(ano, mes)
  const corrente = ym(hoje.getFullYear(), hoje.getMonth())
  const projetar = opts.comoAbertura ? alvo >= corrente : alvo > corrente

  const out: PrevistoDetalhe = {
    valor: realizado, previsto: false, base: realizado, meses: [],
    entradas: 0, saidas: 0, sobrasVariavel: 0, estourosVariavel: 0,
    fixasEntrada: [], fixasSaida: [], variaveisEntrada: [], variaveisSaida: [], faturas: [],
  }
  if (!projetar) return out

  // A soma segue a ORDEM de sempre — `projecao += liquido do mês`, e o líquido
  // de cada mês acumulado conta a conta — para `valor` sair idêntico bit a bit
  // ao que `saldoTotalNoFim` devolvia. Somar entradas e saídas em separado e
  // subtrair no fim daria o mesmo número a menos do último bit, e a prova
  // pede igualdade exata, não "perto".
  let projecao = 0
  let a = hoje.getFullYear()
  let m = hoje.getMonth()
  while (ym(a, m) <= alvo) {
    const p = projecaoDoMes(a, m, deps, hoje)
    projecao += p.liquido
    out.meses.push({ ano: a, mes: m })
    out.entradas += p.entradas
    out.saidas += p.saidas
    const noMes = (xs: ItemPrevisto[]) => xs.map(x => ({ ...x, ano: a, mes: m }))
    out.fixasEntrada.push(...noMes(p.fixasEntrada))
    out.fixasSaida.push(...noMes(p.fixasSaida))
    out.variaveisEntrada.push(...noMes(p.variaveisEntrada))
    out.variaveisSaida.push(...noMes(p.variaveisSaida))
    out.faturas.push(...noMes(p.faturas))
    out.sobrasVariavel += p.sobrasVariavel
    out.estourosVariavel += p.estourosVariavel
    m++
    if (m > 11) { m = 0; a++ }
  }
  out.valor = realizado + projecao
  out.previsto = true
  return out
}

/**
 * O saldo com que o mês fecha. É `detalharPrevisto` sem o detalhe.
 *
 * Existe um laço só sobre os meses, e é o de lá. Se esta função tivesse o
 * próprio, o bloco de previsto do Radar e o cartão logo acima dele seriam duas
 * contas para a mesma pergunta — e a primeira mudança num dos laços os faria
 * discordar em silêncio.
 */
export function saldoTotalNoFim(
  ano: number,
  mes: number,
  deps: Deps,
  opts: { comoAbertura?: boolean; hoje?: Date } = {},
): { valor: number; previsto: boolean } {
  const d = detalharPrevisto(ano, mes, deps, opts)
  return { valor: d.valor, previsto: d.previsto }
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
 * O que ainda falta ACONTECER do planejado variável, por categoria, numa conta
 * — gastar e receber.
 *
 * `max(0, plano − realizado)` dos dois lados, e o **realizado soma tudo**:
 * extrato, dinheiro e fatura. `tipoMovimento` é a intenção de onde pagar, não uma trava — mercado
 * planejado no banco e pago no cartão consumiu o mesmo plano.
 *
 * É exatamente o "Disponível" que o Radar mostra na linha da categoria, mesmo
 * mês e mesmos dois números. Antes eram três contas diferentes tentando
 * responder isso: o Radar por categoria, a projeção só pelo extrato, e a
 * estimativa da fatura pelo agregado do cartão. Plano de 1.000 com 200 no
 * débito e 500 no cartão dava 300 no Radar e reservava 800 no saldo previsto.
 *
 * O rateio não muda o total, só o endereço:
 *   - categoria de banco/dinheiro → a conta de débito dela;
 *   - categoria de cartão → a conta que paga o cartão em aberto de vencimento
 *     mais cedo, e só enquanto aquela fatura não fechou. Fechada, o que faltou
 *     já não cabe nela: cai na próxima, que é paga no mês seguinte.
 *
 * O rateio do cartão é do MÊS, não de um cartão: o plano não diz em qual cartão
 * o gasto vai cair. Por isso ele sai inteiro numa conta só — dividir entre as
 * contas que pagam cartão o contaria de novo em cada uma.
 */
export function faltaVariavelDoMes(
  alvo: string, ano: number, mes: number, deps: Deps, hoje: Date = new Date(),
): {
  saidaBanco: number; saidaCartao: number; entrada: number; diaCartao?: number
  /** As linhas que formam as somas acima, com o valor DEPOIS do rateio. */
  itens: ItemPrevisto[]
  /**
   * As despesas variaveis ANTES do corte do cenario: o que sobrou do plano e o
   * que estourou, so desta conta. E a entrada do motor, nao uma conta
   * paralela — o que o cenario compensou e `sobras − reservado`.
   */
  sobras: number
  estouros: number
} {
  const { categorias, planos, contas, extratoData } = deps
  const padrao = contaPadrao(contas)
  const variaveis = categorias.filter(c => c.ativa && !c.fixa)
  if (!variaveis.length) return { saidaBanco: 0, saidaCartao: 0, entrada: 0, itens: [], sobras: 0, estouros: 0 }

  // O cartão em aberto de vencimento mais cedo decide quem paga a sobra do
  // cartão — a mesma regra que já valia para o complemento da fatura.
  const dms = dadosBancariosDoMes(
    extratoData, `-${ano}-${String(mes + 1).padStart(2, '0')}`,
    k => contas.some(c => c.tipo === 'cartao' && k.startsWith(c.id)),
  )
  const ref = contas
    .filter(c => c.tipo === 'cartao' && c.diaVencimento)
    .filter(c => !resolverFixaDoMes(`cartao-${c.id}`, dms).consolidada)
    .sort((x, y) => (x.diaVencimento ?? 1) - (y.diaVencimento ?? 1))[0]
  const refAberta = (() => {
    if (!ref) return false
    const off = (ref.diaVencimento ?? 1) < (ref.diaFechamento ?? 1) ? 1 : 0
    let pM = mes - off, pA = ano
    if (pM < 0) { pM += 12; pA-- }
    return new Date(pA, pM, ref.diaFechamento ?? 1) > hoje
  })()
  const contaDoCartao = ref ? (ref.contaPagamentoId ?? padrao) : undefined

  const { saidasMap, entradasMap } = construirRealizadoMes({
    ano, mes, extratoData, faturaData: deps.faturaData,
    contas, categorias, planoAno: planos[ano],
  })

  /**
   * Uma linha por categoria, com a sobra AINDA COM SINAL: negativa quer dizer
   * estouro. O corte no zero acontece depois, no nivel que o cenario pedir —
   * cortar aqui jogaria fora justamente a informacao que distingue os tres.
   */
  type Parcela = {
    conta: string; balde: Balde; grupo: string; falta: number
    /** De qual categoria veio, para o detalhe poder nomeá-la. */
    nome: string; descricao?: string
  }
  const parcelas: Parcela[] = []

  for (const cat of variaveis) {
    // Variante que soma na mãe entra pela mãe — plano e gasto (utils/categoriaMae).
    if (somaNaMae(cat.nome, cat.descricao, cat.tipo, categorias)) continue
    const plano = valorFixaNoMes(cat, planos[ano], mes, categorias)
    const mapa = cat.tipo === "entrada" ? entradasMap : saidasMap
    const k = resolverRealKey(mapa, cat.nome, cat.descricao, categorias)
    const feito = k ? mapa[k].total : 0
    // Sem plano e sem gasto nao ha o que dizer. Sem plano MAS com gasto entra:
    // e gasto fora do orcamento, e no cenario que compensa ele come a sobra
    // das outras, que e o que uma planilha faz.
    if (plano <= 0 && feito <= 0) continue
    const falta = plano - feito
    const grupo = cat.grupo ?? "__sem_grupo__"

    // Receita variável entra pela MESMA fórmula. Ficava de fora por medo de
    // chutar entrada, e o resultado era um saldo torto para baixo: o mês
    // reservava o que ainda falta gastar e ignorava o que ainda falta receber.
    // Quem escreveu o plano ja disse que espera receber — nao e chute do app.
    // Cartao nao recebe: entrada cai na conta de deposito da categoria.
    if (cat.tipo === 'entrada') {
      const onde = cat.tipoMovimento === 'dinheiro' ? 'dinheiro' : (cat.contaDebitoId ?? padrao)
      if (onde) parcelas.push({ conta: onde, balde: 'entrada', grupo, falta, nome: cat.nome, descricao: cat.descricao })
      continue
    }

    if (cat.tipoMovimento === 'cartao') {
      // Com fatura em aberto, a sobra cai nela — quem paga o cartão paga.
      if (refAberta) {
        if (contaDoCartao) parcelas.push({ conta: contaDoCartao, balde: 'cartao', grupo, falta, nome: cat.nome, descricao: cat.descricao })
        continue
      }
      // Sem fatura em aberto que possa receber — fechada, já confirmada, ou
      // nenhum cartão cadastrado — a sobra NÃO some. O plano é do mês, e o
      // fechamento é um fato sobre o cartão, não sobre o plano: se aquele
      // dinheiro ainda vai sair em setembro, sai por outro meio. Vira sobra de
      // banco, no último dia, igual à de qualquer categoria de débito.
      //
      // Sobra não sobrevive ao mês. Mês que vem tem plano e limite próprios —
      // gastar menos que o planejado é economia, não saldo acumulado.
      const ondeCartao = cat.contaDebitoId ?? padrao
      if (ondeCartao) parcelas.push({ conta: ondeCartao, balde: 'banco', grupo, falta, nome: cat.nome, descricao: cat.descricao })
      continue
    }
    const onde = contaDaCategoria(cat, padrao)
    if (onde) parcelas.push({ conta: onde, balde: 'banco', grupo, falta, nome: cat.nome, descricao: cat.descricao })
  }

  /**
   * Gasto variável SEM categoria ativa — desativada ou excluída — também é
   * estouro do envelope. Corrigido em 05/10/2026, na revisão do otimista.
   *
   * O laço acima só olha categorias ativas, e esse dinheiro ficava fora: 250
   * gastos numa categoria desativada não comiam sobra nenhuma, e o otimista
   * seguia reservando 200 enquanto o Ritmo do mês da Início dizia "Passou do
   * plano" — duas telas respondendo diferente se a variável estourou. O Radar
   * mostra esse gasto em "Outras" (extraCats) e o Ritmo o conta; agora o motor
   * também.
   *
   * O que fica de fora é o que já fica de fora no Radar e no Ritmo: a
   * transferência (o realizado nem a tem), a fatura do cartão (categoria
   * homônima) e conta FIXA, ativa ou não — fixa não entra no envelope da
   * variável. Entra só como estouro (falta negativa, sem plano): no pessimista
   * a unidade é a parcela e estouro isolado reserva zero, então ele não muda;
   * o grupo é o do cadastro quando ativo, senão "Outras", como no Radar. A conta
   * é a padrão — com falta negativa ela não recebe reserva, só pesa na unidade
   * e nos estouros do aviso do otimista.
   */
  const cobertas = new Set<string>()
  for (const cat of categorias) {
    if (cat.tipo !== 'saida' || (!cat.fixa && !cat.ativa)) continue
    const k = resolverRealKey(saidasMap, cat.nome, cat.descricao, categorias)
    if (k) cobertas.add(k)
  }
  const nomesCartao = new Set(contas.filter(c => c.tipo === 'cartao').map(c => c.nome.toLowerCase()))
  for (const [k, cr] of Object.entries(saidasMap)) {
    if (cobertas.has(k) || cr.total <= 0 || !padrao) continue
    const { nome, descricao } = splitCatKey(k)
    if (nomesCartao.has(norm(nome).toLowerCase())) continue
    const reg = cadastroDaLinha({ nome, descricao }, categorias)
    if (reg?.fixa) continue
    const grupo = reg?.ativa ? (reg.grupo ?? '__sem_grupo__') : '__sem_grupo__'
    parcelas.push({ conta: padrao, balde: 'banco', grupo, falta: -cr.total, nome, descricao: descricao || undefined })
  }

  /**
   * Quanto de cada parcela sobrevive ao corte no zero.
   *
   * A unidade do corte é do MÊS, nunca da conta. "Otimista compensa no total"
   * tem de valer entre contas também — enquanto o corte acontecia dentro de
   * cada conta, um estouro no Sicredi não pagava a sobra da Caixa e otimista
   * devolvia exatamente o mesmo número que pessimista. Medido numa fixture de
   * duas contas: 400 reservados onde o líquido do mês era 0.
   *
   * Banco e cartão entram na MESMA unidade pelo mesmo motivo: o balde diz por
   * onde o dinheiro sai, não em que nível a sobra é cortada. Entrada fica
   * separada de propósito — é o outro lado do razão e leva o nível oposto.
   *
   * O que sobrou da unidade volta para as parcelas em PROPORÇÃO à sobra
   * positiva de cada uma. É o que mantém `projecaoDoMes` igual à soma das
   * contas, que é o invariante desta função: o rateio não muda o total, só o
   * endereço. No nível "categoria" a unidade tem uma parcela só e o fator é 1
   * — o pessimista continua exatamente o que era.
   */
  const alocado: number[] = parcelas.map(() => 0)
  for (const ehEntrada of [false, true]) {
    const doLado = parcelas
      .map((p, i) => [p, i] as const)
      .filter(([p]) => (p.balde === 'entrada') === ehEntrada)
    if (!doLado.length) continue

    const nivel = nivelDoCenario(deps.cenarioPrevisao, ehEntrada ? 'entrada' : 'banco')
    const unidades = new Map<string, number[]>()
    for (const [p, i] of doLado) {
      const k = nivel === 'categoria' ? `#${i}` : nivel === 'grupo' ? p.grupo : ''
      const u = unidades.get(k)
      if (u) u.push(i)
      else unidades.set(k, [i])
    }

    for (const u of unidades.values()) {
      const positivo = u.reduce((s, i) => s + Math.max(0, parcelas[i].falta), 0)
      if (positivo <= 0) continue
      const liquido = Math.max(0, u.reduce((s, i) => s + parcelas[i].falta, 0))
      const fator = liquido / positivo
      for (const i of u) alocado[i] = Math.max(0, parcelas[i].falta) * fator
    }
  }

  const somar = (balde: Balde) =>
    parcelas.reduce((s, p, i) => (p.balde === balde && p.conta === alvo ? s + alocado[i] : s), 0)

  return {
    saidaBanco: somar('banco'),
    saidaCartao: somar('cartao'),
    entrada: somar('entrada'),
    diaCartao: ref?.diaVencimento,
    // O MESMO filtro de `somar` (esta conta) e o MESMO `alocado`. Linha
    // zerada fica de fora: nao soma nada e, na tela, so faria ruido.
    itens: parcelas
      .map((p, i) => ({ p, v: alocado[i] }))
      .filter(({ p, v }) => p.conta === alvo && v > 0)
      .map(({ p, v }) => ({ balde: p.balde, grupo: p.grupo, nome: p.nome, descricao: p.descricao, valor: v })),
    // Filtradas POR CONTA, como `somar`. As parcelas cobrem todas as contas a
    // cada chamada; somar o mes inteiro aqui e depois somar nas contas
    // multiplicaria pelo numero de contas — o bug das fixas triplicadas.
    sobras: parcelas.reduce((s, q) =>
      q.conta === alvo && q.balde !== 'entrada' ? s + Math.max(0, q.falta) : s, 0),
    estouros: parcelas.reduce((s, q) =>
      q.conta === alvo && q.balde !== 'entrada' ? s + Math.max(0, -q.falta) : s, 0),
  }
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
/**
 * Uma linha do previsto, já com o valor que ENTROU no total.
 *
 * `valor` é sempre o que foi somado — para a variável, o `alocado` de depois
 * do rateio, nunca o `falta` cru. A distinção não é sutil: uma categoria com
 * 800 de sobra contribui 800 no pessimista e pode contribuir 512 no otimista,
 * e mostrar o cru faria a soma das linhas discordar do total que elas
 * explicam, de um jeito que muda conforme o cenário escolhido.
 */
export type ItemPrevisto = {
  balde: Balde
  grupo: string
  nome: string
  descricao?: string
  valor: number
  /**
   * Só nas FIXAS e FATURAS: o id da fixa (`cartao-<id>` na fatura) e o dia em
   * que ela vence no mês, pela mesma regra que a desenha em Lançamentos
   * (utils/diaDaFixa). Informativos — nenhum total lê estes campos. É deles
   * que sai a lista "Contas dos próximos 7 dias" da tela Início.
   */
  id?: string
  dia?: number
}

/**
 * O previsto de uma conta, aberto nas partes que o formam.
 *
 * São QUATRO, não duas: fixa a pagar, variável a realizar, fatura do cartão e
 * as entradas previstas. A fatura não é fixa nem variável — é o que já foi
 * comprado e ainda não foi pago.
 *
 * `entradas` e `saidas` são calculados do mesmo jeito que sempre foram; as
 * listas são coletadas ao lado. É de propósito: assim a extração não pode
 * mover número nenhum, e o que a prova verifica é que a soma das listas bate
 * com eles.
 */
export type ProjecaoDetalhe = {
  entradas: number
  saidas: number
  /** Despesas variaveis antes do corte do cenario. Ver faltaVariavelDoMes. */
  sobrasVariavel: number
  estourosVariavel: number
  fixasEntrada: ItemPrevisto[]
  fixasSaida: ItemPrevisto[]
  variaveisEntrada: ItemPrevisto[]
  variaveisSaida: ItemPrevisto[]
  faturas: ItemPrevisto[]
}

export function detalharProjecaoDaConta(
  alvo: string,
  ano: number,
  mes: number,
  deps: Deps,
  hoje: Date = new Date(),
): ProjecaoDetalhe {
  const { extratoData, contas, categorias, planos, faturaData } = deps
  const sufixo = `-${ano}-${String(mes + 1).padStart(2, '0')}`
  const dms = dadosBancariosDoMes(
    extratoData,
    sufixo,
    k => contas.some(c => c.tipo === 'cartao' && k.startsWith(c.id)),
  )
  const padrao = contaPadrao(contas)
  const totalDias = new Date(ano, mes + 1, 0).getDate()
  // O dia movido mora no DadosMes da conta de origem; procurar em todas acha
  // o mesmo registro sem precisar saber qual é a origem.
  const movidas = (id: string) => dms.find(dm => dm.fixasMovidas?.[id] !== undefined)?.fixasMovidas

  let entradas = 0
  let saidas = 0
  const fixasEntrada: ItemPrevisto[] = []
  const fixasSaida: ItemPrevisto[] = []
  const faturas: ItemPrevisto[] = []

  for (const cat of categorias) {
    if (!cat.ativa) continue
    if (contaDaCategoria(cat, padrao) !== alvo) continue

    if (cat.fixa) {
      if (resolverFixaDoMes(cat.id, dms).consolidada) continue
      const v = valorFixaNoMes(cat, planos[ano], mes, categorias)
      if (v <= 0) continue
      const item: ItemPrevisto = {
        balde: cat.tipo === 'entrada' ? 'entrada' : 'banco',
        grupo: cat.grupo ?? '__sem_grupo__',
        nome: cat.nome, descricao: cat.descricao, valor: v,
        id: cat.id,
        dia: diaEfetivoFixa({ id: cat.id, diaVencimento: cat.diaVencimento ?? 1 }, movidas(cat.id),
          ehAutomaticoCategoria(categorias, cat.nome), mes, ano, totalDias),
      }
      if (cat.tipo === 'entrada') { entradas += v; fixasEntrada.push(item) }
      else { saidas += v; fixasSaida.push(item) }
      continue
    }

    // Variável de saída não entra no laço: `faltaVariavelBanco` resolve todas
    // de uma vez, abaixo, e é a MESMA função que a cascata de Lançamentos
    // chama. Entrada variável fica de fora de propósito — Lançamentos também
    // não projeta, e incluir só aqui faria as duas telas discordarem.
  }

  const falta = faltaVariavelDoMes(alvo, ano, mes, deps, hoje)
  saidas += falta.saidaBanco + falta.saidaCartao
  entradas += falta.entrada

  const abertas = contas
    .filter(c => c.tipo === 'cartao' && c.diaVencimento)
    .filter(c => !resolverFixaDoMes(`cartao-${c.id}`, dms).consolidada)
    .sort((x, y) => (x.diaVencimento ?? 1) - (y.diaVencimento ?? 1))

  for (const c of abertas)
    if ((c.contaPagamentoId ?? padrao) === alvo) {
      const v = totalFatura(c.id, ano, mes, contas, faturaData)
      saidas += v
      if (v > 0) faturas.push({
        balde: 'cartao', grupo: '__fatura__',
        nome: c.banco || c.nome, valor: v,
        id: `cartao-${c.id}`,
        dia: diaEfetivoFixa({ id: `cartao-${c.id}`, diaVencimento: c.diaVencimento ?? 1 },
          movidas(`cartao-${c.id}`), faturaEhAutomatica(c), mes, ano, totalDias),
      })
    }

  return {
    entradas, saidas,
    sobrasVariavel: falta.sobras, estourosVariavel: falta.estouros,
    fixasEntrada, fixasSaida, faturas,
    variaveisEntrada: falta.itens.filter(i => i.balde === 'entrada'),
    variaveisSaida:   falta.itens.filter(i => i.balde !== 'entrada'),
  }
}

/**
 * O total do previsto de uma conta. É a soma do detalhe, e nada mais.
 *
 * A assinatura pública não mudou: quem só quer o número continua chamando
 * isto. A separação existe para que a tela que EXPLICA o número saia da mesma
 * passagem que o calcula — foi assim que a memória de cálculo de Lançamentos
 * deu certo, e é o contrário do que este app fez em toda tela onde dois
 * caminhos respondiam a mesma pergunta e divergiam.
 */
function projecaoDaConta(
  alvo: string,
  ano: number,
  mes: number,
  deps: Deps,
  hoje: Date,
): { entradas: number; saidas: number } {
  const d = detalharProjecaoDaConta(alvo, ano, mes, deps, hoje)
  return { entradas: d.entradas, saidas: d.saidas }
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
function projecaoDoMes(
  ano: number, mes: number, deps: Deps, hoje: Date,
): ProjecaoDetalhe & { liquido: number } {
  const d: ProjecaoDetalhe & { liquido: number } = {
    liquido: 0, entradas: 0, saidas: 0, sobrasVariavel: 0, estourosVariavel: 0,
    fixasEntrada: [], fixasSaida: [], variaveisEntrada: [], variaveisSaida: [], faturas: [],
  }
  for (const a of alvosDeSaldo(deps.contas)) {
    const c = detalharProjecaoDaConta(a.id, ano, mes, deps, hoje)
    // Mesma ordem do reduce que existia aqui: (acc + entradas) - saidas.
    d.liquido = d.liquido + c.entradas - c.saidas
    d.entradas += c.entradas
    d.saidas += c.saidas
    d.fixasEntrada.push(...c.fixasEntrada)
    d.fixasSaida.push(...c.fixasSaida)
    d.variaveisEntrada.push(...c.variaveisEntrada)
    d.variaveisSaida.push(...c.variaveisSaida)
    d.faturas.push(...c.faturas)
    d.sobrasVariavel += c.sobrasVariavel
    d.estourosVariavel += c.estourosVariavel
  }
  return d
}

/** Movimento REAL de uma conta num mês, já separado em entradas e saídas. */
function movimentoRealDoMes(
  alvo: string, ano: number, mes: number, deps: Deps,
): { entradas: number; saidas: number } {
  const dm = deps.extratoData[`${alvo}-${ano}-${String(mes + 1).padStart(2, '0')}`]
  if (!dm) return { entradas: 0, saidas: 0 }
  // O dinheiro passa pelo mesmo caminho do banco. O atalho que existia aqui
  // — "a carteira só tem lançamento" — deixava a fixa confirmada em espécie
  // fora da linha, e a linha então não fechava com o próprio final dela.
  return movimentoDoMes(dm, ano, mes, deps)
}

/**
 * Saldo REALIZADO de um alvo — conta de banco ou dinheiro — ao fim de um mês.
 *
 * É com este número que o mês seguinte ABRE, nas duas telas: o Radar chama por
 * `detalharMes` e `saldoBancosEDinheiro`, e Lançamentos chama direto. Ter as
 * duas na mesma função é o que impede a abertura de um mês de discordar do
 * fechamento do anterior.
 *
 * Para banco, o saldo informado na conciliação vence — ver `saldoFinalConta`.
 * O dinheiro não tem esse caminho: `saldoFinalDinheiro` só acumula lançamentos.
 *
 * Mês futuro devolve o saldo de hoje, porque `saldoFinalConta` acumula até o
 * mês pedido e para.
 */
export function saldoRealizadoConta(alvo: string, ano: number, mes: number, deps: Deps): number {
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

/**
 * A memoria de calculo do saldo final previsto, CONSOLIDADA: a mesma de
 * Lancamentos, somada em todas as contas com saldo — bancos e dinheiro.
 *
 * Sai de duas funcoes que ja fecham por construcao, e nao faz conta propria:
 *
 *   realizado -> detalharMes      inicial + entradas − saidas + ajuste = final
 *   previsto  -> detalharPrevisto  base + partes = saldo final previsto
 *
 * e `final` somado nas contas e `base` sao o mesmo saldoBancosEDinheiro.
 * Por isso as linhas fecham no total, e o total e o mesmo numero que o Radar
 * mostrava no cartao do saldo atual.
 *
 * O `ajusteConciliacao` so existe aqui. No Radar o saldo informado vence em
 * qualquer mes, inclusive no corrente; sem a linha, quem digitou o saldo do
 * banco veria a memoria fechar num numero diferente do total.
 *
 * A divisao da variavel entre "compras que faltam no cartao" e "gastos
 * variaveis a realizar" e a mesma de Lancamentos: o balde de cada linha.
 */
export function memoriaDoRadar(
  ano: number,
  mes: number,
  deps: Deps,
  opts: { hoje?: Date } = {},
): Memoria & {
  /**
   * Quanto o gasto variavel do MES CORRENTE ja passou do planejado, somando
   * todas as categorias — zero quando ainda nao passou. E o envelope unico do
   * otimista: acima de zero, o otimista nao reserva mais nada e todo gasto
   * variavel novo sai inteiro do saldo final. Mes fechado e mes futuro valem
   * zero: no fechado nao ha mais o que gastar, e no futuro o envelope e outro
   * e esta cheio — a sobra nao atravessa o mes.
   */
  excessoVariavel: number
} {
  const contas = detalharMes(ano, mes, deps)
  const p = detalharPrevisto(ano, mes, deps, { comoAbertura: true, hoje: opts.hoje })
  const somar = (xs: { valor: number }[]) => xs.reduce((s, x) => s + x.valor, 0)
  const noCartao = p.variaveisSaida.filter(i => i.balde === 'cartao')
  const foraDoCartao = p.variaveisSaida.filter(i => i.balde !== 'cartao')

  return {
    abertura:           contas.reduce((s, c) => s + c.inicial, 0),
    entradasReais:      contas.reduce((s, c) => s + c.entradas, 0),
    saidasReais:        contas.reduce((s, c) => s + c.saidas, 0),
    ajusteConciliacao:  contas.reduce((s, c) => s + c.ajuste, 0),
    entradasPrevistas:  somar(p.fixasEntrada),
    receitasAReceber:   somar(p.variaveisEntrada),
    fixasPrevistas:     somar(p.fixasSaida),
    faturaEmAberto:     somar(p.faturas),
    faturaEstimada:     somar(noCartao),
    variaveisARealizar: somar(foraDoCartao),
    fechamento:         p.valor,
    // Sobras e estouros sao a ENTRADA do motor, antes do corte do cenario —
    // nao uma soma paralela. Por isso o excesso e positivo exatamente quando o
    // otimista zera a variavel. So o mes corrente: janela de um mes projetado.
    excessoVariavel: p.previsto && p.meses.length === 1
      ? Math.max(0, p.estourosVariavel - p.sobrasVariavel)
      : 0,
  }
}
