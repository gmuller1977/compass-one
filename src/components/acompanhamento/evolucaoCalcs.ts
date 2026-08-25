import type { Categoria } from '../../context/AppContext'
import type { CatReal } from './AcShared'

/** Linha do plano. O plano já carrega descricao (variante) e grupo vindos do cadastro. */
export type PlanCat = { nome: string; v: number[]; descricao?: string; grupo?: string }
export type CatComDesc = { nome: string; v: number[]; descricao: string }

const SEM_GRUPO = '__sem_grupo__'

/** Chave composta (nome + variante) usada nas chaves do realMap. */
export function catKey(nome: string, descricao?: string) {
  return descricao ? `${nome}||${descricao}` : nome
}

export function splitCatKey(key: string): { nome: string; descricao: string } {
  const i = key.indexOf('||')
  return i === -1
    ? { nome: key, descricao: '' }
    : { nome: key.slice(0, i), descricao: key.slice(i + 2) }
}

/**
 * Chave do realMap que corresponde a uma categoria (nome + variante).
 * - Variante explícita casa só com a chave exata — nunca cai no nome puro,
 *   senão somaria o realizado de outra variante.
 * - Sem variante, aceita a chave única do nome: espelha a inferência de
 *   variante única feita ao montar o realMap (resolverSub).
 */
export function resolverRealKey(
  realMap: Record<string, CatReal>,
  nome: string,
  descricao?: string,
): string | undefined {
  const exata = catKey(nome, descricao)
  if (realMap[exata]) return exata
  if (descricao) return undefined
  const doNome = Object.keys(realMap).filter(k => splitCatKey(k).nome === nome)
  return doNome.length === 1 ? doNome[0] : undefined
}

export function pickReal(
  realMap: Record<string, CatReal>,
  nome: string,
  descricao?: string,
): CatReal | undefined {
  const k = resolverRealKey(realMap, nome, descricao)
  return k ? realMap[k] : undefined
}

/**
 * Resolve a variante e o grupo de cada linha do plano.
 * O plano é a fonte de verdade quando traz descricao; o casamento posicional
 * fica apenas como fallback para planos antigos, salvos antes das variantes.
 */
export function resolverPlanCats(
  tipo: 'saida' | 'entrada',
  planCats: PlanCat[],
  categorias: Categoria[],
): (CatComDesc & { grupo: string })[] {
  const doTipo = categorias.filter(c => c.tipo === tipo)
  const ativas = doTipo.filter(c => c.ativa)

  // 1ª passada — linhas que já trazem a variante
  const claimed = new Set<string>()
  const exatas = planCats.map(cat => {
    if (!cat.descricao) return null
    const reg = doTipo.find(c => c.nome === cat.nome && c.descricao === cat.descricao)
    claimed.add(catKey(cat.nome, cat.descricao))
    return {
      nome: cat.nome,
      v: cat.v,
      descricao: cat.descricao,
      grupo: cat.grupo ?? reg?.grupo ?? SEM_GRUPO,
    }
  })

  // 2ª passada — fallback legado sobre as variantes ainda não reivindicadas
  const ocorrencia = new Map<string, number>()
  return planCats.map((cat, i) => {
    const exata = exatas[i]
    if (exata) return exata
    const livres = ativas.filter(c => c.nome === cat.nome && !claimed.has(catKey(c.nome, c.descricao)))
    const k = ocorrencia.get(cat.nome) ?? 0
    ocorrencia.set(cat.nome, k + 1)
    const reg = livres[k] ?? livres[0] ?? ativas.find(c => c.nome === cat.nome)
    return {
      nome: cat.nome,
      v: cat.v,
      descricao: reg?.descricao ?? '',
      grupo: cat.grupo ?? reg?.grupo ?? SEM_GRUPO,
    }
  })
}

export function buildAllCats(
  tipo: 'saida' | 'entrada',
  grupo: string,
  planCats: PlanCat[],
  realMap: Record<string, CatReal>,
  categorias: Categoria[],
  cartaoNomes: Set<string>,
): CatComDesc[] {
  const resolvidas = resolverPlanCats(tipo, planCats, categorias)

  // Chaves do realMap já consumidas por alguma linha do plano (de qualquer grupo)
  const cobertas = new Set<string>()
  for (const c of resolvidas) {
    const k = resolverRealKey(realMap, c.nome, c.descricao)
    if (k) cobertas.add(k)
  }

  const doGrupo: CatComDesc[] = resolvidas
    .filter(c => c.grupo === grupo)
    .map(({ nome, v, descricao }) => ({ nome, v, descricao }))

  // Categorias com lançamento mas sem plano — deduplicadas pela chave COMPLETA,
  // para não esconder uma variante quando outra do mesmo nome está planejada
  const extraCats: CatComDesc[] = Object.keys(realMap)
    .filter(k => !cobertas.has(k))
    .flatMap(k => {
      const { nome, descricao } = splitCatKey(k)
      const reg =
        (descricao ? categorias.find(c => c.nome === nome && c.tipo === tipo && c.descricao === descricao) : undefined)
        ?? categorias.find(c => c.nome === nome && c.tipo === tipo)
      if (!reg || !reg.ativa || cartaoNomes.has(reg.nome.toLowerCase())) return []
      if ((reg.grupo ?? SEM_GRUPO) !== grupo) return []
      return [{ nome, v: Array(12).fill(0) as number[], descricao }]
    })

  return [...doGrupo, ...extraCats]
}

export function calcGrupoReal(allCats: CatComDesc[], realMap: Record<string, CatReal>): number {
  return allCats.reduce((s, cat) => s + (pickReal(realMap, cat.nome, cat.descricao)?.total ?? 0), 0)
}

export function calcGrupoPrev(allCats: CatComDesc[], mes: number): number {
  return allCats.reduce((s, cat) => s + (cat.v[mes] ?? 0), 0)
}
