/**
 * Quais categorias fixas contam como realizadas num mês — uma vez só.
 *
 * O bug que isto existe para corrigir: a consolidação de uma fixa vive dentro
 * do `DadosMes` de cada conta (`fixasConsolidadas`), mas a fixa em si é do
 * MÊS, não da conta. Quem somava percorrendo as chaves do extrato — uma por
 * conta bancária — contava a mesma fixa uma vez por conta.
 *
 * Pior com fixa automática: o padrão era
 *
 *     consolidada = fixasConsolidadas[id] !== undefined
 *       ? fixasConsolidadas[id]
 *       : (automatica && mesPassado)
 *
 * e esse `mesPassado` é verdadeiro em TODAS as contas, mesmo nas que nunca
 * ouviram falar daquela fixa. Com duas contas o valor dobrava; com três,
 * triplicava. No Radar aparecia o mesmo "Tarifa · automático" repetido.
 *
 * A regra aqui olha o mês inteiro de uma vez:
 *   - alguma conta marcou `true`  -> consolidada, com o override daquela conta
 *   - alguma conta marcou `false` -> não consolidada (escolha explícita manda)
 *   - ninguém marcou             -> automática em mês passado conta sozinha
 */

type DadosMesFixas = {
  fixasConsolidadas?: Record<string, boolean>
  fixasValorOverride?: Record<string, number>
}

export type FixaResolvida = {
  consolidada: boolean
  /** Valor informado na conta que consolidou, quando houver. */
  override?: number
}

export function resolverFixaDoMes(
  fixaId: string,
  ehAutomatica: boolean,
  mesPassado: boolean,
  dadosDoMes: DadosMesFixas[],
): FixaResolvida {
  let viuFalse = false

  for (const dm of dadosDoMes) {
    const marca = dm.fixasConsolidadas?.[fixaId]
    if (marca === true) {
      return { consolidada: true, override: dm.fixasValorOverride?.[fixaId] }
    }
    if (marca === false) viuFalse = true
  }

  if (viuFalse) return { consolidada: false }
  return { consolidada: ehAutomatica && mesPassado }
}

/**
 * Os `DadosMes` das contas de BANCO e do dinheiro num mês. Cartão fica de
 * fora: fixa de cartão entra pela fatura, não pelo extrato.
 */
export function dadosBancariosDoMes<T extends DadosMesFixas>(
  extratoData: Record<string, T>,
  sufixo: string,
  ehChaveDeCartao: (key: string) => boolean,
): T[] {
  return Object.entries(extratoData)
    .filter(([key]) => key.endsWith(sufixo) && !ehChaveDeCartao(key))
    .map(([, dm]) => dm)
}
