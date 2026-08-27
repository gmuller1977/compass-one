import type { Categoria } from '../../context/AppContext'
import type { CatReal } from './AcShared'

/** Linha do plano. O plano já carrega descricao (variante) e grupo vindos do cadastro. */
export type PlanCat = { nome: string; v: number[]; descricao?: string; grupo?: string }
export type CatComDesc = { nome: string; v: number[]; descricao: string }

const SEM_GRUPO = '__sem_grupo__'

/**
 * Normaliza nome/variante antes de virar chave. Espaco sobrando no cadastro
 * ("Civic " vs "Civic") renderiza identico na tela mas gerava duas chaves
 * distintas — e a categoria aparecia duplicada no radar.
 */
export function norm(s?: string) { return (s ?? '').trim() }

/** Chave composta (nome + variante) usada nas chaves do realMap. */
export function catKey(nome: string, descricao?: string) {
  const d = norm(descricao)
  return d ? `${norm(nome)}||${d}` : norm(nome)
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
  realMap: Record<string, unknown>,
  nome: string,
  descricao?: string,
): string | undefined {
  const exata = catKey(nome, descricao)
  if (exata in realMap) return exata
  if (norm(descricao)) return undefined
  const doNome = Object.keys(realMap).filter(k => norm(splitCatKey(k).nome) === norm(nome))
  return doNome.length === 1 ? doNome[0] : undefined
}

/**
 * Variante de um lancamento. O lancamento novo ja grava subCategoria; o antigo
 * nao tem, e ai so da para inferir quando a categoria tem UMA variante ativa —
 * com duas, chutar somaria no lugar errado.
 *
 * Existem copias locais desta funcao em RadarFinanceiro e ResumoMensal. Ficaram
 * la de proposito: as duas telas funcionam e nao vale mexer agora.
 */
export function resolverSub(
  categorias: Categoria[],
  nome: string,
  tipo: 'entrada' | 'saida',
  sub?: string,
): string | undefined {
  if (norm(sub)) return norm(sub)
  const variantes = categorias.filter(
    c => norm(c.nome) === norm(nome) && c.tipo === tipo && c.ativa && norm(c.descricao),
  )
  return variantes.length === 1 ? norm(variantes[0].descricao) : undefined
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
  const mesmoNome = (c: Categoria, nome: string) => norm(c.nome) === norm(nome)

  // 1ª passada — linhas que já trazem a variante
  const claimed = new Set<string>()
  const exatas = planCats.map(cat => {
    const descricao = norm(cat.descricao)
    if (!descricao) return null
    const reg = doTipo.find(c => mesmoNome(c, cat.nome) && norm(c.descricao) === descricao)
    claimed.add(catKey(cat.nome, descricao))
    return {
      nome: cat.nome,
      v: cat.v,
      descricao,
      grupo: cat.grupo ?? reg?.grupo ?? SEM_GRUPO,
    }
  })

  // 2ª passada — fallback legado sobre as variantes ainda não reivindicadas.
  // Se não sobrar variante livre, a linha fica SEM variante: reaproveitar uma
  // já reivindicada criaria linha duplicada e contaria o realizado duas vezes.
  return planCats.map((cat, i) => {
    const exata = exatas[i]
    if (exata) return exata
    // claimed cresce a cada atribuição, então a próxima livre é sempre a [0]
    const reg = ativas.find(c => mesmoNome(c, cat.nome) && !claimed.has(catKey(c.nome, c.descricao)))
    if (reg) claimed.add(catKey(reg.nome, reg.descricao))
    return {
      nome: cat.nome,
      v: cat.v,
      descricao: norm(reg?.descricao),
      grupo: cat.grupo ?? reg?.grupo ?? ativas.find(c => mesmoNome(c, cat.nome))?.grupo ?? SEM_GRUPO,
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

  /**
   * Cadastro correspondente a (nome + variante). Uma variante excluida NAO cai
   * no registro de uma irma: senao a categoria deletada continuava aparecendo,
   * emprestando o "ativa" da variante que sobrou.
   */
  const acharReg = (nome: string, descricao: string, herdarDeIrma = false) => {
    const doNome = categorias.filter(c => c.tipo === tipo && norm(c.nome) === norm(nome))
    const exato = descricao
      ? doNome.find(c => norm(c.descricao) === descricao)
      : doNome.find(c => !norm(c.descricao))
    // So a chave crua (lancamento sem variante marcada) herda grupo/ativa de
    // qualquer registro do nome — e dinheiro real, precisa aparecer em algum
    // lugar. Linha de plano exige registro exato, senao ressuscita excluida.
    return exato ?? (herdarDeIrma && !descricao ? doNome[0] : undefined)
  }
  const visivel = (nome: string, descricao: string, herdarDeIrma = false) => {
    const reg = acharReg(nome, descricao, herdarDeIrma)
    return !!reg && !!reg.ativa && !cartaoNomes.has(norm(reg.nome).toLowerCase())
  }

  // Linha do plano so aparece se a categoria ainda existir e estiver ativa.
  // O plano persistido nao e limpo ao excluir uma categoria, entao sem isso
  // a linha orfa continuava no radar depois da exclusao.
  const vivas = resolvidas.filter(c => visivel(c.nome, c.descricao))

  // Chaves do realMap já consumidas por alguma linha do plano (de qualquer grupo)
  const cobertas = new Set<string>()
  for (const c of vivas) {
    const k = resolverRealKey(realMap, c.nome, c.descricao)
    if (k) cobertas.add(k)
  }

  const doGrupo: CatComDesc[] = vivas
    .filter(c => c.grupo === grupo)
    .map(({ nome, v, descricao }) => ({ nome, v, descricao }))

  // Categorias com lançamento mas sem plano — deduplicadas pela chave COMPLETA,
  // para não esconder uma variante quando outra do mesmo nome está planejada
  const extraCats: CatComDesc[] = Object.keys(realMap)
    .filter(k => !cobertas.has(k))
    .flatMap(k => {
      const { nome, descricao } = splitCatKey(k)
      if (!visivel(nome, descricao, true)) return []
      const reg = acharReg(nome, descricao, true)!
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
