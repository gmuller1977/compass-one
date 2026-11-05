import { createContext, useContext } from 'react'

/**
 * Ids das fixas marcadas "Não vai ocorrer neste mês" em Lançamentos
 * (utils/fixasDoMes: fixaNaoOcorre), no mês que o Radar mostra. O Radar
 * fornece; a linha e o grupo leem para dizer "não gastou" com o plano à
 * vista, em vez de "a pagar" (05/11/2026, pedido do Guilherme).
 */
export const ForaDoMesContexto = createContext<Set<string>>(new Set())

export const useForaDoMes = () => useContext(ForaDoMesContexto)
