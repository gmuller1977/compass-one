import type { PlanoAnoData, PlanoCat } from '../context/AppContext'
import type { ItemPlano } from './itensPlano'
import type { JaLancado } from './historicoDaCategoria'

/**
 * Renomear uma compra PARCELADA a partir do plano. Pedido do Guilherme em
 * 11/10/2026: a fatura grava a compra sem descrição com o nome da categoria
 * ("Cursos / Palestras · 4 de 6"), e a revisão do plano copia esse texto para
 * os itens. "Na revisão, poderia permitir o nome de qualquer parcela, gravando
 * para todas as parcelas. O mesmo no planejamento. Mas isso somente para
 * valores parcelados."
 *
 * Grava em dois lugares, e só o TEXTO — nenhum valor se move:
 *   - na fatura, a `descricao` de todas as parcelas da compra (id `<base>-<p>`
 *     no mesmo cartão, o desenho da FaturaCartao);
 *   - no plano, os itens "<antigo> · k de N" das linhas da mesma categoria,
 *     em todos os anos, que viram "<novo> · k de N".
 */

export type CompraRef = { contaId: string; base: string; total: number }

const ROTULO = /^(.*) · (\d+) de (\d+)$/

/** "Bicicleta · 4 de 6" → { nome: 'Bicicleta', atual: 4, total: 6 }. Fora do padrão, null. */
export function lerRotuloParcela(descricao: string): { nome: string; atual: number; total: number } | null {
  const m = ROTULO.exec(descricao.trim())
  if (!m) return null
  const total = Number(m[3]), atual = Number(m[2])
  return total > 1 && atual >= 1 ? { nome: m[1].trim(), atual, total } : null
}

export const rotuloParcela = (nome: string, atual: number, total: number) => `${nome.trim()} · ${atual} de ${total}`

/**
 * A compra por trás de um item do plano: a parcela já lançada no mesmo mês com
 * o mesmo nome, número e total (e, havendo mais de uma, o mesmo valor). Item
 * que não é parcela, ou sem compra lançada que case, devolve null — e aí a
 * tela não oferece renomear.
 */
export function compraDoItem(item: Pick<ItemPlano, 'descricao' | 'valor'>, jaLancado: JaLancado[]): CompraRef | null {
  const r = lerRotuloParcela(item.descricao)
  if (!r) return null
  const casam = jaLancado.filter(j => j.parcela?.compra && j.parcela.atual === r.atual
    && j.parcela.total === r.total && j.descricao.trim() === r.nome)
  const achada = casam.length > 1 ? casam.find(j => Math.abs(j.valor - item.valor) < 0.005) ?? casam[0] : casam[0]
  const c = achada?.parcela?.compra
  return c ? { contaId: c.contaId, base: c.base, total: r.total } : null
}

type LancFatura = { id?: string; descricao?: string; parcelas?: number }
type MesFatura = { lancamentos?: Record<number, LancFatura[]> }

/** As faturas com a descrição nova em todas as parcelas da compra. Só os meses tocados mudam de identidade. */
export function renomearNaFatura(faturas: Record<string, unknown>, ref: CompraRef, novo: string): Record<string, unknown> {
  const nome = novo.trim()
  const ehDela = (id?: string) => !!id && id.startsWith(`${ref.base}-`) && /^\d+$/.test(id.slice(ref.base.length + 1))
  let out = faturas
  for (const [k, v] of Object.entries(faturas)) {
    if (k.slice(0, -8) !== ref.contaId) continue
    const dm = v as MesFatura
    if (!dm?.lancamentos) continue
    let mudou = false
    const lancs: Record<number, LancFatura[]> = {}
    for (const [d, lista] of Object.entries(dm.lancamentos)) {
      lancs[Number(d)] = lista.map(l => {
        if (!ehDela(l.id) || (l.parcelas ?? 1) !== ref.total || l.descricao === nome) return l
        mudou = true
        return { ...l, descricao: nome }
      })
    }
    if (mudou) {
      if (out === faturas) out = { ...faturas }
      out[k] = { ...dm, lancamentos: lancs }
    }
  }
  return out
}

/** Os planos com os itens "<antigo> · k de N" das linhas `nomeCategoria` trocados por "<novo> · k de N". */
export function renomearNosPlanos(
  planos: Record<number, PlanoAnoData>, nomeCategoria: string, antigo: string, total: number, novo: string,
): Record<number, PlanoAnoData> {
  const trocarLinha = (l: PlanoCat): PlanoCat => {
    if (!l.itens || l.nome.trim() !== nomeCategoria.trim()) return l
    let mudou = false
    const itens: Record<number, ItemPlano[]> = {}
    for (const [m, lista] of Object.entries(l.itens)) {
      itens[Number(m)] = lista.map(it => {
        const r = lerRotuloParcela(it.descricao)
        if (!r || r.nome !== antigo.trim() || r.total !== total) return it
        mudou = true
        return { ...it, descricao: rotuloParcela(novo, r.atual, total) }
      })
    }
    return mudou ? { ...l, itens } : l
  }
  let out = planos
  for (const [ano, p] of Object.entries(planos)) {
    const entradas = p.entradas.map(trocarLinha), saidas = p.saidas.map(trocarLinha)
    if (entradas.some((l, i) => l !== p.entradas[i]) || saidas.some((l, i) => l !== p.saidas[i])) {
      if (out === planos) out = { ...planos }
      out[Number(ano)] = { ...p, entradas, saidas }
    }
  }
  return out
}
