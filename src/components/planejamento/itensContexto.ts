import { createContext, useContext } from 'react'

/**
 * Abre o editor de itens de uma célula do plano. A tela de Planejamento
 * fornece; Lista, Painel e o modal da Grade só chamam. Sem provedor (null),
 * a célula não oferece itens — e continua funcionando como sempre.
 *
 * `partes`: as parcelas da conta digitada na célula ("800+300"), para o editor
 * já começar com elas.
 */
export type AbrirItens = (tipo: 'e' | 's', ri: number, mi: number, partes?: number[]) => void

export const ItensPlanoContexto = createContext<AbrirItens | null>(null)

export const useAbrirItens = () => useContext(ItensPlanoContexto)
