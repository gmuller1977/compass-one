import type { Categoria } from '../../context/AppContext'
import { grupoDaCategoria } from '../../utils/rotuloCategoria'
import { lancLabel } from './FcShared'

/**
 * O grupo da categoria do lançamento, para a lista da fatura dizer "Casa ·
 * Mercado" ou "Carro · Seguro · Civic" — pedido do Guilherme em 06/10/2026.
 * A busca é a mesma do banco e do dinheiro: utils/rotuloCategoria.
 */
export const grupoDoLanc = (l: { categoria: string; subCategoria?: string }, categorias: Categoria[]) =>
  grupoDaCategoria(l.categoria, l.subCategoria, categorias)

/** "Grupo · Nome · Variante", em texto corrido. */
export const lancLabelComGrupo = (l: { categoria: string; subCategoria?: string }, categorias: Categoria[]) => {
  const g = grupoDoLanc(l, categorias)
  return g ? `${g} · ${lancLabel(l)}` : lancLabel(l)
}
