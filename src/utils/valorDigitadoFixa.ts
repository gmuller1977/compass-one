import type { Deps } from './saldoConta'
import { valorFixaNoMes } from './valorFixa'

/**
 * O valor digitado numa fixa ainda NÃO confirmada acompanha o plano
 * (16/11/2026, relatado pelo Guilherme: o 13º da Pricila passou de 2 parcelas
 * para 1, o plano de novembro foi a 12.051,57, e Lançamentos seguia mostrando
 * "A receber +R$ 5.774,00"). Editar a fixa em Lançamentos (o dia, a descrição)
 * gravava o valor do campo em `fixasValorOverride` mesmo sem ele mudar, e
 * aquilo virava uma foto do plano antigo: mudar o plano não mexia mais na
 * linha, e confirmar a conta gravaria o valor velho.
 *
 * Regra: enquanto a fixa não foi confirmada, o valor digitado só vale se foi
 * digitado sobre o plano de HOJE. Por isso ele grava ao lado o plano daquele
 * momento (`fixasValorBase`); o plano mudou, o digitado sai e a linha volta a
 * seguir o plano. Valor igual ao plano não é gravado. Confirmada, vale o real
 * de sempre. Digitado antes desta regra (sem a base) e não confirmado também
 * sai: não há como saber se ainda vale.
 */

type ComValores = { fixasValorOverride?: Record<string, number>; fixasValorBase?: Record<string, number> }

const igual = (a: number, b: number) => Math.abs(a - b) < 0.005

/** Grava o valor digitado da fixa (Lançamentos), ou o tira se é o do plano. */
export function comValorDigitado<T extends ComValores>(dm: T, id: string, valor: number, valorDoPlano: number): T {
  const override = { ...dm.fixasValorOverride }
  const base = { ...dm.fixasValorBase }
  if (igual(valor, valorDoPlano)) { delete override[id]; delete base[id] }
  else { override[id] = valor; base[id] = valorDoPlano }
  return { ...dm, fixasValorOverride: override, fixasValorBase: base }
}

/** Tira o valor digitado (e a base) de uma fixa. */
export function semValorDigitado<T extends ComValores>(dm: T, id: string): T {
  const override = { ...dm.fixasValorOverride }
  const base = { ...dm.fixasValorBase }
  delete override[id]; delete base[id]
  return { ...dm, fixasValorOverride: override, fixasValorBase: base }
}

/**
 * Valores digitados que ficaram para trás: fixa não confirmada, do mês
 * corrente em diante, cujo plano mudou depois (ou sem base). Fatura
 * (`cartao-`) fica de fora: o valor dela não vem do plano.
 */
export function valoresDigitadosVencidos(deps: Deps, hoje = new Date()): { chave: string; id: string }[] {
  const agora = hoje.getFullYear() * 12 + hoje.getMonth()
  const out: { chave: string; id: string }[] = []
  for (const [chave, dm] of Object.entries(deps.extratoData)) {
    const ovr = dm?.fixasValorOverride
    if (!ovr) continue
    const m = /-(\d{4})-(\d{2})$/.exec(chave)
    if (!m) continue
    const ano = Number(m[1]), mes = Number(m[2]) - 1
    if (ano * 12 + mes < agora) continue
    for (const id of Object.keys(ovr)) {
      if (id.startsWith('cartao-')) continue
      if (dm.fixasConsolidadas?.[id] === true) continue
      const cat = deps.categorias.find(c => c.id === id)
      if (!cat) continue
      const base = dm.fixasValorBase?.[id]
      const plano = valorFixaNoMes(cat, deps.planos[ano], mes, deps.categorias)
      if (base === undefined || !igual(base, plano)) out.push({ chave, id })
    }
  }
  return out
}
