import type { PlanoAnoData, PlanoCat } from '../context/AppContext'
import { catKey, norm } from '../components/acompanhamento/evolucaoCalcs'

/**
 * A linha do plano CRU de uma categoria, para GRAVAR nela — o ajuste pelo
 * Radar e o Simulador. Ler é com o plano resolvido (resolverPlanCats); gravar
 * precisa do índice no cru, que é o que vai para o banco.
 *
 * A ordem é a do mergeCats do Planejamento, que é quem mostra o plano para
 * edição: o id do cadastro primeiro. Sem id, o par (nome, variante) exato; e
 * o nome sozinho só quando ele é único — com duas linhas "Financiamento" sem
 * variante (plano antigo), gravar numa delas seria um chute: devolve
 * 'ambigua', e quem chama manda ajustar pelo Planejamento.
 */
export type CategoriaDoPlano = { id?: string; nome: string; descricao?: string; grupo?: string; tipoMovimento?: string }

export function acharLinhaDoPlano(lista: PlanoCat[], cat: CategoriaDoPlano): number | 'ambigua' | null {
  if (cat.id) {
    const porId = lista.findIndex(c => c.id === cat.id)
    if (porId >= 0) return porId
  }
  const semId = lista.map((c, i) => ({ c, i })).filter(({ c }) => !c.id)
  const exato = semId.filter(({ c }) => catKey(c.nome, c.descricao) === catKey(cat.nome, cat.descricao))
  if (exato.length === 1) return exato[0].i
  const doNome = semId.filter(({ c }) => norm(c.nome) === norm(cat.nome))
  if (doNome.length === 1) return doNome[0].i
  return doNome.length > 1 ? 'ambigua' : null
}

/**
 * Muda a linha de uma categoria no plano de um ano, criando-a se o ano ainda
 * não a tem. Devolve null quando não há plano no ano ou a linha é ambígua.
 */
export function mudarLinhaDoPlano(
  plano: PlanoAnoData | undefined, tipo: 'entrada' | 'saida', cat: CategoriaDoPlano, fn: (l: PlanoCat) => PlanoCat,
): PlanoAnoData | null {
  if (!plano) return null
  const lista = [...((tipo === 'entrada' ? plano.entradas : plano.saidas) ?? [])]
  const i = acharLinhaDoPlano(lista, cat)
  if (i === 'ambigua') return null
  if (i === null) {
    lista.push(fn({ id: cat.id, nome: cat.nome, descricao: cat.descricao, grupo: cat.grupo, t: cat.tipoMovimento, v: Array(12).fill(0) }))
  } else {
    lista[i] = fn(lista[i])
  }
  return tipo === 'entrada' ? { ...plano, entradas: lista } : { ...plano, saidas: lista }
}
