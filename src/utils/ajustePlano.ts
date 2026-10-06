/**
 * Regras do ajuste do plano feito pelo Radar. Decidido com o Guilherme em
 * 06/10/2026: **o mês corrente não se mexe.** O Radar existe para mostrar
 * que o mês saiu do plano; trazer o plano do mês até o gasto apagaria
 * exatamente isso — e, virando hábito, o "Previsto × realizado" e a
 * "Precisão do plano" deixariam de mostrar onde o plano erra. O que se
 * corrige é o plano DAQUI PARA A FRENTE, com os números na mão.
 */

/**
 * O primeiro mês que o ajuste pode mudar. Olhando um mês futuro, é ele mesmo;
 * olhando o corrente ou um passado, é o mês seguinte a HOJE — nunca o
 * corrente, nunca o passado.
 */
export function mesAlvoDoAjuste(ano: number, mes: number, hoje: Date = new Date()): { ano: number; mes: number } {
  const ymVisto = ano * 12 + mes
  const ymHoje = hoje.getFullYear() * 12 + hoje.getMonth()
  const alvo = ymVisto > ymHoje ? ymVisto : ymHoje + 1
  return { ano: Math.floor(alvo / 12), mes: alvo % 12 }
}

