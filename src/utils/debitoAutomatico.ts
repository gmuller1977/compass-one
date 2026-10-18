import type { DadosMes } from '../context/AppContext'
import type { Deps } from './saldoConta'
import { contasAVencer } from './contasAVencer'
import { confirmarPagamento, contaDoPagamento } from './pagarConta'
import { diaEfetivoFixa } from './diaDaFixa'
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
 * grava ao tirar a bolinha) não volta a ser marcada. Fatura de cartão fica
 * fora: o valor dela não é o do plano.
 */
export type DebitoParaConfirmar = { id: string; nome: string; chave: string; valor: number }

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
  return out
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
 * saiu e no valor certo. Só o mês corrente, do dia 1 até hoje.
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
}

export function debitosDoMes(deps: Deps, hoje = new Date()): DebitoDoMes[] {
  const ano = hoje.getFullYear(), mes = hoje.getMonth()
  const fim = sufixo(ano, mes)
  const totalDias = new Date(ano, mes + 1, 0).getDate()
  const doMes = Object.entries(deps.extratoData).filter(([k]) => k.endsWith(fim)).map(([, dm]) => dm)
  const out: DebitoDoMes[] = []
  for (const cat of deps.categorias) {
    if (!cat.fixa || cat.tipo !== 'saida' || cat.tipoMovimento !== 'banco' || cat.formaPagamento !== 'automatico') continue
    const marcas = doMes.map(dm => dm?.fixasConsolidadas?.[cat.id])
    const paga = marcas.includes(true)
    const naoSaiu = !paga && marcas.includes(false)
    if (!paga && !naoSaiu) continue
    const contaId = contaDoPagamento(cat.id, ano, mes, deps.contas, deps.categorias, deps.extratoData)
    if (!contaId) continue
    const chave = `${contaId}${fim}`
    const dm = deps.extratoData[chave]
    const dia = diaEfetivoFixa({ id: cat.id, diaVencimento: cat.diaVencimento ?? 1 }, dm?.fixasMovidas, true, mes, ano, totalDias)
    if (dia > hoje.getDate()) continue
    const override = doMes.map(d => d?.fixasValorOverride?.[cat.id]).find(v => v !== undefined)
    const previsto = valorFixaNoMes(cat, deps.planos[ano], mes, deps.categorias)
    out.push({
      id: cat.id, nome: cat.descricao ? `${cat.nome} · ${cat.descricao}` : cat.nome,
      contaId, chave, dia, previsto,
      valor: override ?? previsto,
      naoSaiu,
      conferido: dm?.debitosConferidos?.[cat.id] === true,
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

/** "Não saiu": desmarca, e a conta volta a ser uma conta a pagar. */
export function debitoNaoSaiu(dm: DadosMes, d: DebitoDoMes): DadosMes {
  return comConferido({ ...dm, fixasConsolidadas: { ...dm.fixasConsolidadas, [d.id]: false } }, d.id)
}
