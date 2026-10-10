import { iguais } from './mesclarMes'

/**
 * Quem pode mexer em qual lançamento, na conta compartilhada (10/10/2026,
 * regra do Guilherme): "os dois podem ver tudo, o adm pode editar e excluir
 * lançamentos de todos, e os outros podem fazer manutenção somente dos seus
 * lançamentos".
 *
 *   - O ADMINISTRADOR é o dono das finanças (quem convidou).
 *   - Cada lançamento guarda `autor` (o id do login de quem lançou), carimbado
 *     na gravação: nenhuma tela precisa saber disso.
 *   - Lançamento sem autor é de antes do compartilhamento: é do dono.
 *   - Membro que alterou ou apagou o lançamento de outra pessoa: a gravação
 *     devolve o original e a tela avisa. O banco confere de novo (migração
 *     016), para que nada passe por fora do app.
 */
type Item = Record<string, unknown> & { id?: unknown; autor?: string }
type Mes = Record<string, unknown> & { lancamentos?: Record<string, Item[]> }

function porId(m: Mes | undefined): Map<string, { dia: string; item: Item }> {
  const out = new Map<string, { dia: string; item: Item }>()
  for (const [dia, itens] of Object.entries(m?.lancamentos ?? {})) {
    if (!Array.isArray(itens)) continue
    for (const item of itens) if (item && item.id !== undefined) out.set(String(item.id), { dia, item })
  }
  return out
}

/** Lançamento novo ganha o autor; editado mantém o que já tinha. */
export function carimbarAutor(base: unknown, meu: unknown, eu: string): unknown {
  const m = meu as Mes | undefined
  if (!m?.lancamentos) return meu
  const b = porId(base as Mes | undefined)
  let mudou = false
  const lancamentos: Record<string, Item[]> = {}
  for (const [dia, itens] of Object.entries(m.lancamentos)) {
    if (!Array.isArray(itens)) { lancamentos[dia] = itens; continue }
    lancamentos[dia] = itens.map(item => {
      if (!item || item.autor || item.id === undefined) return item
      const antes = b.get(String(item.id))
      if (antes) {
        if (!antes.item.autor) return item
        mudou = true
        return { ...item, autor: antes.item.autor }
      }
      mudou = true
      return { ...item, autor: eu }
    })
  }
  return mudou ? { ...m, lancamentos } : meu
}

const deOutro = (item: Item, eu: string) => (item.autor ?? '') !== eu

/**
 * Para quem NÃO é o administrador: o lançamento de outra pessoa que foi
 * alterado, movido de dia ou apagado volta como estava. Devolve o mês
 * corrigido e quantos voltaram.
 */
export function respeitarAutoria(base: unknown, meu: unknown, eu: string): { mes: unknown; devolvidos: number } {
  const b = porId(base as Mes | undefined)
  const m = meu as Mes | undefined
  if (!m || b.size === 0) return { mes: meu, devolvidos: 0 }
  const agora = porId(m)
  const voltar: { dia: string; item: Item }[] = []
  for (const [id, antes] of b) {
    if (!deOutro(antes.item, eu)) continue
    const depois = agora.get(id)
    if (!depois || depois.dia !== antes.dia || !iguais(depois.item, antes.item)) voltar.push(antes)
  }
  if (!voltar.length) return { mes: meu, devolvidos: 0 }
  const ids = new Set(voltar.map(v => String(v.item.id)))
  const lancamentos: Record<string, Item[]> = {}
  for (const [dia, itens] of Object.entries(m.lancamentos ?? {})) {
    lancamentos[dia] = Array.isArray(itens) ? itens.filter(i => !ids.has(String(i?.id))) : itens
  }
  // Cada dia afetado volta na ordem em que estava: os devolvidos no lugar
  // deles, os que continuam como estão aqui, e os novos no fim.
  for (const dia of new Set(voltar.map(v => v.dia))) {
    const atuais = lancamentos[dia] ?? []
    const daBase = (base as Mes).lancamentos?.[dia] ?? []
    const ordem: Item[] = []
    for (const i of daBase) {
      if (ids.has(String(i?.id))) ordem.push(i)
      else { const a = atuais.find(x => x?.id === i?.id); if (a) ordem.push(a) }
    }
    lancamentos[dia] = [...ordem, ...atuais.filter(x => !ordem.includes(x))]
  }
  return { mes: { ...m, lancamentos }, devolvidos: voltar.length }
}

/** Para as telas: este login pode mexer neste lançamento? */
export function podeMexer(item: { autor?: string } | null | undefined, eu: string | undefined, admin: boolean): boolean {
  if (admin) return true
  return !!eu && !!item && item.autor === eu
}
