import { createContext, useContext } from 'react'

/**
 * Abre o ajuste do plano a partir de uma linha de categoria do Radar. O Radar
 * fornece (ele sabe o ano e o mês); a linha só chama. Sem provedor — o mobile,
 * por exemplo —, a linha não mostra o botão.
 */
// `mes`: o mês de referência quando quem pede não é o Radar (o modal do
// Planejamento passa o primeiro mês que está mostrando).
export type PedidoAjuste = { tipo: 'entrada' | 'saida'; nome: string; descricao?: string; prev: number; real: number; mes?: number }
export type AbrirAjuste = (p: PedidoAjuste) => void

export const AjustePlanoContexto = createContext<AbrirAjuste | null>(null)

export const useAbrirAjuste = () => useContext(AjustePlanoContexto)
