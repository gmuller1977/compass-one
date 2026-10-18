import type { DadosMes } from '../context/AppContext'
import type { Deps } from './saldoConta'
import { contasAVencer } from './contasAVencer'
import { confirmarPagamento, contaDoPagamento } from './pagarConta'

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
