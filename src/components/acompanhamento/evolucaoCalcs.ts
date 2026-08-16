import type { Categoria } from '../../context/AppContext'
import type { CatReal } from './AcShared'

export type CatComDesc = { nome: string; v: number[]; descricao: string }

export function buildAllCats(
  tipo: 'saida' | 'entrada',
  grupo: string,
  planCats: { nome: string; v: number[] }[],
  realMap: Record<string, CatReal>,
  categorias: Categoria[],
  cartaoNomes: Set<string>,
): CatComDesc[] {
  const catsPlan = planCats.filter(cat => {
    const g = categorias.find(c => c.nome === cat.nome && c.tipo === tipo)?.grupo ?? '__sem_grupo__'
    return g === grupo
  })

  const nomeOcorrencia = new Map<string, number>()
  const catsComDesc: CatComDesc[] = catsPlan.map(cat => {
    const ocorrencia = nomeOcorrencia.get(cat.nome) ?? 0
    nomeOcorrencia.set(cat.nome, ocorrencia + 1)
    const matching = categorias.filter(c => c.nome === cat.nome && c.tipo === tipo)
    return { ...cat, descricao: matching[ocorrencia]?.descricao ?? '' }
  })

  const plannedNames = new Set(catsPlan.map(c => c.nome))
  const extraCats: CatComDesc[] = Object.keys(realMap)
    .map(k => k.includes('||') ? k.split('||')[0] : k)
    .filter((n, i, a) => a.indexOf(n) === i && !plannedNames.has(n))
    .flatMap(nome => {
      const cat = categorias.find(c => c.nome === nome && c.tipo === tipo)
      if (!cat || !cat.ativa || cartaoNomes.has(cat.nome.toLowerCase())) return []
      if ((cat.grupo ?? '__sem_grupo__') !== grupo) return []
      return [{ nome, v: Array(12).fill(0) as number[], descricao: cat.descricao ?? '' }]
    })

  return [...catsComDesc, ...extraCats]
}

export function calcGrupoReal(allCats: CatComDesc[], realMap: Record<string, CatReal>): number {
  return allCats.reduce((s, cat) => {
    const realKey = cat.descricao ? `${cat.nome}||${cat.descricao}` : cat.nome
    return s + (realMap[realKey]?.total ?? 0)
  }, 0)
}

export function calcGrupoPrev(allCats: CatComDesc[], mes: number): number {
  return allCats.reduce((s, cat) => s + (cat.v[mes] ?? 0), 0)
}
