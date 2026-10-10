/**
 * Mescla de três vias de um mês (extrato ou fatura) na hora de gravar.
 *
 * Antes cada aparelho gravava o mês INTEIRO como estava na memória dele: se
 * duas pessoas lançassem no mesmo mês e na mesma conta, a segunda gravação
 * apagava o lançamento da primeira. Com a conta compartilhada (10/10/2026)
 * isso deixa de ser raro — é o casal no mercado, cada um no seu celular.
 *
 *   base   o mês como este aparelho o leu do banco (ou gravou por último)
 *   meu    o mês como está aqui agora
 *   deles  o mês como está no banco agora
 *
 * O que só eu mudei vale o meu; o que só eles mudaram vale o deles. Listas de
 * itens com `id` (os lançamentos de cada dia) se mesclam item a item: o
 * lançamento que eu apaguei sai, o que eles incluíram fica. Quando os dois
 * mudaram o MESMO valor, vale o meu — é quem está gravando agora.
 */
type Obj = Record<string, unknown>

const ehObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const ehListaComId = (v: unknown): v is Obj[] =>
  Array.isArray(v) && v.every(x => ehObj(x) && (typeof x.id === 'string' || typeof x.id === 'number'))

export function iguais(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a)) {
    const bb = b as unknown[]
    return a.length === bb.length && a.every((x, i) => iguais(x, bb[i]))
  }
  const ka = Object.keys(a as Obj).filter(k => (a as Obj)[k] !== undefined)
  const kb = Object.keys(b as Obj).filter(k => (b as Obj)[k] !== undefined)
  return ka.length === kb.length && ka.every(k => iguais((a as Obj)[k], (b as Obj)[k]))
}

export function mesclar3(base: unknown, meu: unknown, deles: unknown): unknown {
  if (iguais(meu, base)) return deles
  if (iguais(deles, base) || iguais(meu, deles)) return meu

  // Lançamentos de um dia: item a item, pelo id.
  if ((meu === undefined || ehListaComId(meu)) && (deles === undefined || ehListaComId(deles)) && (base === undefined || ehListaComId(base))
      && (meu !== undefined || deles !== undefined)) {
    const porId = (l: Obj[] | undefined) => new Map((l ?? []).map(x => [String(x.id), x]))
    const b = porId(base as Obj[] | undefined), m = porId(meu as Obj[] | undefined), d = porId(deles as Obj[] | undefined)
    const ordem = [...d.keys(), ...[...m.keys()].filter(k => !d.has(k))]
    const out: Obj[] = []
    for (const id of ordem) {
      const v = mesclar3(b.get(id), m.get(id), d.get(id))
      if (v !== undefined) out.push(v as Obj)
    }
    return out
  }

  if ((meu === undefined || ehObj(meu)) && (deles === undefined || ehObj(deles))) {
    // Um apagou o objeto inteiro e o outro mexeu nele: vale quem mexeu.
    if (meu === undefined) return deles
    if (deles === undefined) return meu
    const b = ehObj(base) ? base : {}
    const out: Obj = {}
    for (const k of new Set([...Object.keys(deles), ...Object.keys(meu)])) {
      const v = mesclar3(b[k], meu[k], deles[k])
      if (v !== undefined) out[k] = v
    }
    return out
  }
  return meu
}
