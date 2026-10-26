import type { Categoria, DadosMes } from '../context/AppContext'
import { totalFatura, type Deps } from './saldoConta'
import { contasAVencer } from './contasAVencer'
import { confirmarPagamento, contaDoPagamento } from './pagarConta'
import { diaEfetivoFixa, faturaEhAutomatica } from './diaDaFixa'
import { valorFixaNoMes } from './valorFixa'

/**
 * Conta em DÉBITO AUTOMÁTICO se confirma sozinha no dia do vencimento
 * (18/10/2026, decisão do Guilherme: "débito automático pode já ser
 * confirmada, e pegamos a diferença no valor da conta na tela inicial").
 *
 * Revê a decisão de 31/08/2026 ("não presumir que o débito aconteceu"). O
 * risco que ela evitava (débito que falha, muda de valor ou é cancelado)
 * agora aparece na conferência semanal do saldo dos bancos, na Início
 * (`conferirSaldos.ts`).
 *
 * A confirmação é GRAVADA, não presumida na leitura: o app marca a bolinha
 * de pago como a pessoa marcaria, pelo mesmo `confirmarPagamento` do "Pagar"
 * e na mesma conta (`contaDoPagamento`). Nenhuma tela muda de conta; todas
 * leem `fixasConsolidadas` como sempre.
 *
 * Só o mês corrente, do dia 1 até hoje: mês fechado não se mexe. Conta
 * desmarcada pela pessoa (`fixasConsolidadas[id] === false`, o que Lançamentos
 * grava ao tirar a bolinha) não volta a ser marcada.
 *
 * A fatura do cartão pago em débito automático (`faturaEhAutomatica`, o que
 * o cadastro do cartão diz) entrou em 19/10/2026, pedido do Guilherme: "se
 * débito aparece no automático, se boleto nas contas da semana". Ela se
 * confirma no dia, no valor lançado na fatura (`totalFatura`, o mesmo que o
 * saldo desconta), e a diferença do banco se acerta em "Outro valor".
 */
export type DebitoParaConfirmar = { id: string; nome: string; chave: string; valor: number }

/**
 * A regra, nas palavras do Guilherme (18/10/2026): "tudo que é recebimento e
 * pagamento que não depende de movimentação manual, entra ou sai de forma
 * automática, e o usuário só precisa confirmar".
 *
 * - Débito automático: despesa fixa de banco com forma "Débito Automático".
 * - Recebimento automático: TODA receita fixa que cai no banco (salário,
 *   aluguel recebido, pensão). Ninguém precisa fazer nada para ela entrar, e
 *   o cadastro de receita só oferece PIX e transferência, as duas feitas por
 *   quem paga. Receita em dinheiro fica de fora: alguém entrega na mão.
 *
 * Sem isso o salário ficava "a receber" até a pessoa marcar em Lançamentos,
 * e quem conferia o saldo na Início e digitava o valor do banco tinha o
 * salário contado duas vezes no saldo previsto (análise da chegada v3, C1).
 */
export const ehDebitoAutomatico = (c: Categoria) =>
  c.fixa && c.tipo === 'saida' && c.tipoMovimento === 'banco' && c.formaPagamento === 'automatico'
export const ehRecebimentoAutomatico = (c: Categoria) =>
  c.fixa && c.tipo === 'entrada' && c.tipoMovimento !== 'dinheiro' && c.tipoMovimento !== 'cartao'
export const ehAutomatica = (c: Categoria) => ehDebitoAutomatico(c) || ehRecebimentoAutomatico(c)

const sufixo = (ano: number, mes: number) => `-${ano}-${String(mes + 1).padStart(2, '0')}`

export function debitosParaConfirmar(deps: Deps, hoje = new Date()): DebitoParaConfirmar[] {
  const ano = hoje.getFullYear(), mes = hoje.getMonth()
  const fim = sufixo(ano, mes)
  const doMes = Object.entries(deps.extratoData).filter(([k]) => k.endsWith(fim))
  const desmarcada = (id: string) => doMes.some(([, dm]) => dm?.fixasConsolidadas?.[id] === false)

  const out: DebitoParaConfirmar[] = []
  for (const c of contasAVencer(deps, hoje, 1)) {
    if (c.fatura || c.ano !== ano || c.mes !== mes || c.dia > hoje.getDate()) continue
    const cat = deps.categorias.find(x => x.id === c.id)
    if (!cat?.fixa || cat.tipoMovimento !== 'banco' || cat.formaPagamento !== 'automatico') continue
    if (desmarcada(c.id)) continue
    const conta = contaDoPagamento(c.id, ano, mes, deps.contas, deps.categorias, deps.extratoData)
    if (!conta) continue
    out.push({ id: c.id, nome: c.descricao ? `${c.nome} · ${c.descricao}` : c.nome, chave: `${conta}${fim}`, valor: c.valor })
  }

  // Recebimentos: as contas a vencer só listam despesas, então a receita é
  // achada pelo cadastro, com as mesmas regras (ativa, com valor no plano,
  // venceu até hoje, ninguém marcou nem desmarcou).
  const totalDias = new Date(ano, mes + 1, 0).getDate()
  for (const cat of deps.categorias) {
    if (!cat.ativa || !ehRecebimentoAutomatico(cat)) continue
    if (doMes.some(([, dm]) => dm?.fixasConsolidadas?.[cat.id] !== undefined)) continue
    const conta = contaDoPagamento(cat.id, ano, mes, deps.contas, deps.categorias, deps.extratoData)
    if (!conta) continue
    const dm = deps.extratoData[`${conta}${fim}`]
    const dia = diaEfetivoFixa({ id: cat.id, diaVencimento: cat.diaVencimento ?? 1 }, dm?.fixasMovidas, false, mes, ano, totalDias)
    if (dia > hoje.getDate()) continue
    const previsto = valorFixaNoMes(cat, deps.planos[ano], mes, deps.categorias)
    if (previsto <= 0) continue
    const override = doMes.map(([, d]) => d?.fixasValorOverride?.[cat.id]).find(v => v !== undefined)
    out.push({ id: cat.id, nome: cat.descricao ? `${cat.nome} · ${cat.descricao}` : cat.nome, chave: `${conta}${fim}`, valor: override ?? previsto })
  }
  for (const f of faturasAutomaticas(deps, hoje)) {
    if (f.marcada !== undefined || f.dia > hoje.getDate() || f.valor <= 0.005) continue
    out.push({ id: f.id, nome: f.nome, chave: f.chave, valor: f.valor })
  }
  return out
}

/**
 * As faturas pagas em débito automático no mês corrente, com o dia de
 * vencimento (dia útil), a conta que paga e o valor lançado. `marcada` é o
 * que está gravado (`fixasConsolidadas`): undefined, true ou false.
 */
function faturasAutomaticas(deps: Deps, hoje: Date) {
  const ano = hoje.getFullYear(), mes = hoje.getMonth()
  const fim = sufixo(ano, mes)
  const totalDias = new Date(ano, mes + 1, 0).getDate()
  const doMes = Object.entries(deps.extratoData).filter(([k]) => k.endsWith(fim)).map(([, dm]) => dm)
  const out: { id: string; nome: string; chave: string; dia: number; valor: number; previsto: number; marcada: boolean | undefined }[] = []
  for (const cartao of deps.contas) {
    if (cartao.tipo !== 'cartao' || !cartao.diaVencimento || !faturaEhAutomatica(cartao)) continue
    const id = `cartao-${cartao.id}`
    const conta = contaDoPagamento(id, ano, mes, deps.contas, deps.categorias, deps.extratoData)
    if (!conta) continue
    const chave = `${conta}${fim}`
    const marcas = doMes.map(dm => dm?.fixasConsolidadas?.[id])
    const marcada = marcas.includes(true) ? true : marcas.includes(false) ? false : undefined
    const dia = diaEfetivoFixa({ id, diaVencimento: cartao.diaVencimento }, deps.extratoData[chave]?.fixasMovidas, true, mes, ano, totalDias)
    const previsto = totalFatura(cartao.id, ano, mes, deps.contas, deps.faturaData)
    const override = doMes.map(dm => dm?.fixasValorOverride?.[id]).find(v => v !== undefined && v > 0)
    out.push({ id, nome: `Fatura ${cartao.banco || cartao.nome}`, chave, dia, previsto, valor: override ?? previsto, marcada })
  }
  return out
}

/**
 * Marcas de fixa de banco gravadas numa conta que não recebe fixa
 * (investimento ou conta excluída), no mês corrente. Até 26/10/2026
 * `contaDoPagamento` mandava a confirmação para a conta de débito do
 * cadastro mesmo quando ela era um investimento: a Início dizia "pago" e a
 * linha não aparecia em Lançamentos > Banco. Elas voltam para a conta certa
 * (`moverMarca`), uma vez; mês fechado não se mexe.
 */
export type MarcaForaDoLugar = { id: string; de: string; para: string }

export function marcasForaDoLugar(deps: Deps, hoje = new Date()): MarcaForaDoLugar[] {
  const ano = hoje.getFullYear(), mes = hoje.getMonth()
  const fim = sufixo(ano, mes)
  const recebe = (conta: string) => conta === 'dinheiro' || deps.contas.some(c => c.id === conta && c.tipo === 'corrente')
  const out: MarcaForaDoLugar[] = []
  for (const [k, dm] of Object.entries(deps.extratoData)) {
    if (!k.endsWith(fim)) continue
    const conta = k.slice(0, -fim.length)
    if (recebe(conta)) continue
    const ids = new Set([
      ...Object.keys(dm?.fixasConsolidadas ?? {}),
      ...Object.keys(dm?.fixasValorOverride ?? {}),
      ...Object.keys(dm?.debitosConferidos ?? {}),
    ])
    for (const id of ids) {
      const cat = deps.categorias.find(c => c.id === id)
      if (!cat?.fixa || cat.tipoMovimento !== 'banco') continue
      const para = contaDoPagamento(id, ano, mes, deps.contas, deps.categorias, deps.extratoData)
      if (para && para !== conta) out.push({ id, de: k, para: `${para}${fim}` })
    }
  }
  return out
}

const semId = <T,>(r: Record<string, T> | undefined, id: string) => {
  if (!r || !(id in r)) return r
  const resto = { ...r }
  delete resto[id]
  return resto
}

/** Tira a marca da conta errada. */
export function tirarMarca(dm: DadosMes, id: string): DadosMes {
  return {
    ...dm,
    fixasConsolidadas: semId(dm.fixasConsolidadas, id),
    fixasValorOverride: semId(dm.fixasValorOverride, id),
    debitosConferidos: semId(dm.debitosConferidos, id),
  }
}

/** Põe na conta certa o que estava na errada, sem passar por cima do que já está lá. */
export function porMarca(dm: DadosMes | undefined, origem: DadosMes | undefined, id: string): DadosMes {
  const base = dm ?? { lancamentos: {}, saldoBanco: '' }
  const c = origem?.fixasConsolidadas?.[id], v = origem?.fixasValorOverride?.[id], d = origem?.debitosConferidos?.[id]
  return {
    ...base,
    ...(c !== undefined && base.fixasConsolidadas?.[id] === undefined ? { fixasConsolidadas: { ...base.fixasConsolidadas, [id]: c } } : {}),
    ...(v !== undefined && base.fixasValorOverride?.[id] === undefined ? { fixasValorOverride: { ...base.fixasValorOverride, [id]: v } } : {}),
    ...(d !== undefined && base.debitosConferidos?.[id] === undefined ? { debitosConferidos: { ...base.debitosConferidos, [id]: d } } : {}),
  }
}

/** Marca como paga no valor previsto, se ninguém tocou nela ainda. */
export function confirmarDebito(dm: DadosMes | undefined, d: DebitoParaConfirmar): DadosMes {
  const base = dm ?? { lancamentos: {}, saldoBanco: '' }
  if (base.fixasConsolidadas?.[d.id] !== undefined) return base
  return confirmarPagamento(base, d.id, d.valor, d.valor)
}

/**
 * "Débitos automáticos" na Início, ao lado de "Confira seus saldos"
 * (18/10/2026, pedido do Guilherme: "dois quadros, um de saldo e outro de
 * débito automático, para ser conferido"). É a outra metade da decisão
 * acima: o app confirma sozinho, e a pessoa confere no extrato do banco se
 * saiu e no valor certo. Só o mês corrente: do dia 1 até hoje para
 * conferir, e os que ainda vão vencer como agendados (pedido dele: o quadro
 * não some, e diz quando não há débito agendado).
 *
 * As respostas gravam nos campos de sempre, na conta onde a fixa cai:
 *   - "Confere": só `debitosConferidos[id]`, nenhum número muda;
 *   - outro valor: `fixasValorOverride` (o valor real, como em Lançamentos);
 *   - "Não saiu": `fixasConsolidadas[id] = false`, a bolinha desmarcada de
 *     Lançamentos. A conta volta para as contas a pagar, como atrasada.
 */
export type DebitoDoMes = {
  id: string
  nome: string
  contaId: string
  chave: string
  dia: number
  valor: number
  previsto: number
  naoSaiu: boolean
  conferido: boolean
  /** Vence depois de hoje: aparece como agendado, sem nada a conferir. */
  agendado: boolean
  /** Recebimento (entra na conta), e não débito. */
  entrada: boolean
}

export function debitosDoMes(deps: Deps, hoje = new Date()): DebitoDoMes[] {
  const ano = hoje.getFullYear(), mes = hoje.getMonth()
  const fim = sufixo(ano, mes)
  const totalDias = new Date(ano, mes + 1, 0).getDate()
  const doMes = Object.entries(deps.extratoData).filter(([k]) => k.endsWith(fim)).map(([, dm]) => dm)
  const out: DebitoDoMes[] = []
  for (const cat of deps.categorias) {
    if (!ehAutomatica(cat)) continue
    const marcas = doMes.map(dm => dm?.fixasConsolidadas?.[cat.id])
    const paga = marcas.includes(true)
    const naoSaiu = !paga && marcas.includes(false)
    const contaId = contaDoPagamento(cat.id, ano, mes, deps.contas, deps.categorias, deps.extratoData)
    if (!contaId) continue
    const chave = `${contaId}${fim}`
    const dm = deps.extratoData[chave]
    const entrada = cat.tipo === 'entrada'
    const dia = diaEfetivoFixa({ id: cat.id, diaVencimento: cat.diaVencimento ?? 1 }, dm?.fixasMovidas, !entrada, mes, ano, totalDias)
    const override = doMes.map(d => d?.fixasValorOverride?.[cat.id]).find(v => v !== undefined)
    const previsto = valorFixaNoMes(cat, deps.planos[ano], mes, deps.categorias)
    // Agendado: ativo e com valor no plano, como nas contas a vencer.
    const agendado = dia > hoje.getDate() && !paga && !naoSaiu
    if (agendado ? !cat.ativa || (override ?? previsto) <= 0 : !paga && !naoSaiu) continue
    out.push({
      id: cat.id, nome: cat.descricao ? `${cat.nome} · ${cat.descricao}` : cat.nome,
      contaId, chave, dia, previsto,
      valor: override ?? previsto,
      naoSaiu, agendado, entrada,
      conferido: dm?.debitosConferidos?.[cat.id] === true,
    })
  }
  for (const f of faturasAutomaticas(deps, hoje)) {
    const paga = f.marcada === true, naoSaiu = f.marcada === false
    const agendado = f.dia > hoje.getDate() && !paga && !naoSaiu
    if (agendado ? f.valor <= 0.005 : !paga && !naoSaiu) continue
    out.push({
      id: f.id, nome: f.nome, contaId: f.chave.slice(0, -fim.length), chave: f.chave, dia: f.dia,
      previsto: f.previsto, valor: f.valor, naoSaiu, agendado, entrada: false,
      conferido: deps.extratoData[f.chave]?.debitosConferidos?.[f.id] === true,
    })
  }
  return out.sort((a, b) => a.dia - b.dia || a.nome.localeCompare(b.nome, 'pt-BR'))
}

const comConferido = (dm: DadosMes, id: string): DadosMes =>
  ({ ...dm, debitosConferidos: { ...dm.debitosConferidos, [id]: true } })

/** "Confere": saiu no valor que o app mostra. */
export function debitoConfere(dm: DadosMes, d: DebitoDoMes): DadosMes {
  return comConferido(dm, d.id)
}

/** Saiu com outro valor: o valor real, como Lançamentos grava. */
export function debitoComOutroValor(dm: DadosMes, d: DebitoDoMes, valor: number): DadosMes {
  const pago = confirmarPagamento(dm, d.id, valor, d.previsto)
  // Voltou ao previsto: tira o valor digitado antes.
  if (Math.abs(valor - d.previsto) <= 0.004 && pago.fixasValorOverride?.[d.id] !== undefined) {
    const resto = { ...pago.fixasValorOverride }
    delete resto[d.id]
    return comConferido({ ...pago, fixasValorOverride: resto }, d.id)
  }
  return comConferido(pago, d.id)
}

/** Tirar o "confere" (a bolinha de novo vazia): nenhum número muda. */
export function debitoDesconferir(dm: DadosMes, d: DebitoDoMes): DadosMes {
  const resto = { ...dm.debitosConferidos }
  delete resto[d.id]
  return { ...dm, debitosConferidos: resto }
}

/** Depois de um "Não saiu": saiu, sim, no valor previsto. */
export function debitoSaiuSim(dm: DadosMes, d: DebitoDoMes): DadosMes {
  return comConferido(confirmarPagamento(dm, d.id, d.previsto, d.previsto), d.id)
}

/** "Não saiu": desmarca, e a conta volta a ser uma conta a pagar. */
export function debitoNaoSaiu(dm: DadosMes, d: DebitoDoMes): DadosMes {
  return comConferido({ ...dm, fixasConsolidadas: { ...dm.fixasConsolidadas, [d.id]: false } }, d.id)
}
