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
 * A regra aqui olha o mês inteiro de uma vez: consolidada só quando alguma
 * conta marcou `true`. Nada de assumir.
 *
 * Assumir era o comportamento antigo — fixa automática em mês passado contava
 * sozinha. Foi removido em 31/08/2026: o Radar assumia e a conciliação exigia
 * a marcação, então os dois discordavam sobre o mesmo mês. Uma "Cotas Sicredi"
 * de R$ 25,00 que nunca foi confirmada aparecia como paga no Radar e fazia o
 * saldo divergir do extrato.
 *
 * A conciliação venceu, por decisão do Guilherme: débito automático pode
 * falhar, mudar de valor ou ser cancelado. Assumir esconde isso. Agora ele
 * fica pendente até alguém confirmar — que é o que ele é.
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
  dadosDoMes: DadosMesFixas[],
): FixaResolvida {
  for (const dm of dadosDoMes) {
    if (dm.fixasConsolidadas?.[fixaId] === true) {
      return { consolidada: true, override: dm.fixasValorOverride?.[fixaId] }
    }
  }
  return { consolidada: false }
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
