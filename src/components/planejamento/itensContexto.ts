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

/**
 * Quanto já está lançado numa célula de mês FUTURO (parcelas da fatura, conta
 * agendada). Com algo lançado a célula não se digita: abre o editor, que
 * mostra o lançado e pede só o que ainda vai ser gasto — o plano do mês é a
 * soma e nunca fica abaixo do lançado (Guilherme, 11/10/2026). Mês corrente e
 * passado devolvem 0: lá o plano não sobe para cobrir o gasto.
 */
export type LancadoNoMes = (tipo: 'e' | 's', ri: number, mi: number) => number

export const LancadoNoMesContexto = createContext<LancadoNoMes | null>(null)

export const useLancadoNoMes = () => useContext(LancadoNoMesContexto)
