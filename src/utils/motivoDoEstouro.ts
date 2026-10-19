import type { LinhaDoMes } from '../components/acompanhamento/evolucaoCalcs'
import { categoriasEstouradas, type Estouro } from './categoriasEstouradas'

/**
 * O motivo de ter passado do plano, anotado NA HORA, e não na virada do mês.
 * Pedido do Guilherme em 11/10/2026: "fui usar [a Revisão mensal] e esqueci o
 * motivo de ter passado do plano". A Revisão pede a justificativa do mês que
 * fechou; até lá, ninguém lembra por que a Academia passou.
 *
 * Nenhum número novo. As categorias são as `linhasSaida` de `totaisDoMes` que
 * passaram — o "Estourou" da linha do Radar (`categoriasEstouradas`) — com o
 * MESMO corte da Revisão mensal: desvio acima de `desvioMinPerc` (Preferências).
 * Assim o que se pede aqui é exatamente o que a Revisão vai pedir no fim do mês,
 * e ela abre com o texto já escrito.
 *
 * O motivo é gravado em `licoes_aprendidas` — a tabela da Revisão —, com
 * `acao_tomada` nula: "anotado, ainda não revisado". A Revisão, ao salvar,
 * ATUALIZA essa linha em vez de criar outra.
 */

export type Motivo = {
  id: string
  ano: number
  mes: number
  /** "Academia" ou "Seguro · Civic" — o rótulo da linha do Radar. */
  categoria: string
  justificativa: string
  tipoEvento: 'pontual' | 'anual' | 'sazonal' | null
  revisado: boolean
}

export const rotuloDaLinha = (l: { nome: string; descricao?: string }) =>
  l.descricao ? `${l.nome} · ${l.descricao}` : l.nome

/** Desvio em %, como a Revisão mensal calcula: sem plano é infinito. */
export function desvioPerc(prev: number, real: number): number {
  if (prev <= 0) return real > 0 ? Infinity : 0
  return (real - prev) / prev * 100
}

/** As categorias de despesa que passaram do plano com desvio acima do corte. */
export function estourosQuePedemMotivo(linhasSaida: LinhaDoMes[], desvioMinPerc: number): Estouro[] {
  return categoriasEstouradas(linhasSaida, Infinity)
    .filter(e => desvioPerc(e.prev, e.real) > desvioMinPerc)
}

export type EstouroComMotivo = Estouro & { rotulo: string; motivo: Motivo | null }

/** Cada estouro com o motivo já anotado, se houver. Sem motivo primeiro. */
export function estourosComMotivo(
  linhasSaida: LinhaDoMes[], motivos: Motivo[], desvioMinPerc: number,
): EstouroComMotivo[] {
  return estourosQuePedemMotivo(linhasSaida, desvioMinPerc)
    .map(e => {
      const rotulo = rotuloDaLinha(e)
      const motivo = motivos.find(m => m.categoria === rotulo && m.justificativa.trim() !== '') ?? null
      return { ...e, rotulo, motivo }
    })
    .sort((a, b) => Number(!!a.motivo) - Number(!!b.motivo) || b.excesso - a.excesso)
}

/** A frase do lembrete — a mesma no Radar, na Início e no celular. */
export function textoDoLembrete(pendentes: EstouroComMotivo[]): { titulo: string; detalhe: string } | null {
  const sem = pendentes.filter(p => !p.motivo)
  if (sem.length === 0) return null
  return {
    titulo: sem.length === 1
      ? `${sem[0].rotulo} passou do plano: por quê?`
      : `${sem.length} categorias passaram do plano: por quê?`,
    detalhe: 'Anote o motivo agora, enquanto lembra.',
  }
}
