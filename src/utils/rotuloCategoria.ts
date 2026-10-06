import type { Categoria } from '../context/AppContext'
import { cadastroDaLinha } from '../components/acompanhamento/evolucaoCalcs'

/**
 * O grupo de uma categoria, para as listas de lançamento dizerem "Casa ·
 * Mercado" ou "Carro · Seguro · Civic" — pedido do Guilherme em 06/10/2026,
 * primeiro no cartão, depois no banco e no dinheiro.
 *
 * O cadastro é achado pelo par (nome, variante), como o Radar acha
 * (cadastroDaLinha): o nome sozinho só vale quando é único, senão Seguro ·
 * Civic e Seguro · March se confundiriam. Sem cadastro ou sem grupo, undefined
 * — e a lista fica como sempre foi.
 */
export function grupoDaCategoria(nome: string, variante: string | undefined, categorias: Categoria[]): string | undefined {
  return cadastroDaLinha({ nome, descricao: variante?.trim() }, categorias)?.grupo?.trim() || undefined
}
