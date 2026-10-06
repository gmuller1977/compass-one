import type { Categoria } from '../../context/AppContext'
import { cadastroDaLinha } from '../acompanhamento/evolucaoCalcs'
import { lancLabel } from './FcShared'

/**
 * O grupo da categoria do lançamento, para a lista da fatura dizer "Casa ·
 * Mercado" ou "Carro · Seguro · Civic" — pedido do Guilherme em 06/10/2026.
 * O cadastro é achado pelo par (nome, variante), como o Radar acha
 * (cadastroDaLinha); sem cadastro ou sem grupo, não há prefixo.
 */
export const grupoDoLanc = (l: { categoria: string; subCategoria?: string }, categorias: Categoria[]) =>
  cadastroDaLinha({ nome: l.categoria, descricao: l.subCategoria?.trim() }, categorias)?.grupo?.trim() || undefined

/** "Grupo · Nome · Variante", em texto corrido. */
export const lancLabelComGrupo = (l: { categoria: string; subCategoria?: string }, categorias: Categoria[]) => {
  const g = grupoDoLanc(l, categorias)
  return g ? `${g} · ${lancLabel(l)}` : lancLabel(l)
}
