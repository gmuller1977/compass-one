import type { Categoria, PlanoAnoData } from '../context/AppContext'
import { acharPlanCat, resolverPlanCats } from '../components/acompanhamento/evolucaoCalcs'

/**
 * Quanto vale uma categoria fixa num mês.
 *
 * Existia em duas versões que discordavam, e o sintoma era o saldo final de um
 * mês não bater com o saldo inicial do seguinte:
 *
 *   mês corrente (valorPrevistoCat)
 *     lista.find(c => c.id === catId) ?? lista.find(c => c.nome === catNome)
 *
 *   meses passados (saldoBase)
 *     lista.find(c => c.id === catId || c.nome === cat.nome)
 *
 * O segundo devolve a PRIMEIRA linha que satisfaça qualquer uma das condições.
 * Se uma linha de mesmo nome vier antes da que tem o id certo, ele pega a
 * errada — e com duas linhas "Financiamento" isso acontece.
 *
 * Aqui a ordem é sempre: override informado, depois id, depois o par
 * (nome, variante) contra o plano RESOLVIDO. O resolvido importa porque plano
 * antigo guarda a linha só com o nome; ver CLAUDE.md.
 */
export function valorFixaNoMes(
  cat: Categoria,
  planoAno: PlanoAnoData | undefined,
  mes: number,
  categorias: Categoria[],
  override?: number,
): number {
  if (override !== undefined) return override
  if (!planoAno) return 0

  const cru = cat.tipo === 'entrada' ? planoAno.entradas : planoAno.saidas
  if (!cru?.length) return 0

  // Por id é o casamento mais forte: não depende de nome nem de variante.
  const porId = cat.id ? cru.find(c => c.id === cat.id) : undefined
  if (porId) return porId.v[mes] ?? 0

  const resolvidas = resolverPlanCats(cat.tipo, cru, categorias)
  return acharPlanCat(resolvidas, cat.nome, cat.descricao)?.v[mes] ?? 0
}
