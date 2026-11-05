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
  fixasNaoOcorre?: Record<string, boolean>
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

/**
 * "Não vai ocorrer neste mês" (05/11/2026, pedido do Guilherme: a fixa está
 * no plano, mas neste mês não acontece, e ele quer tirá-la de Lançamentos sem
 * mexer no planejamento). A marca mora no `DadosMes` da conta onde a fixa
 * aparece (`fixasNaoOcorre[id] = true`), só naquele mês; o plano não muda.
 * Marcada, a fixa sai da previsão (`detalharProjecaoDaConta`), das contas a
 * pagar, do quadro de débito automático e da cascata de Lançamentos, que a
 * mostra riscada para poder desfazer. Paga vence: a marca de paga sai junto.
 */
export function fixaNaoOcorre(fixaId: string, dadosDoMes: (DadosMesFixas | undefined)[]): boolean {
  if (dadosDoMes.some(dm => dm?.fixasConsolidadas?.[fixaId] === true)) return false
  return dadosDoMes.some(dm => dm?.fixasNaoOcorre?.[fixaId] === true)
}

function semChave<V>(r: Record<string, V> | undefined, id: string): Record<string, V> | undefined {
  if (!r || !(id in r)) return r
  const { [id]: _fora, ...resto } = r
  void _fora
  return resto
}

/** Marca a fixa como "não vai ocorrer" neste mês e tira a marca de paga. */
export function marcarNaoOcorre<T extends DadosMesFixas>(dm: T, fixaId: string): T {
  return {
    ...dm,
    fixasConsolidadas: semChave(dm.fixasConsolidadas, fixaId),
    fixasNaoOcorre: { ...dm.fixasNaoOcorre, [fixaId]: true },
  }
}

/** Desfaz: a fixa volta a contar neste mês. */
export function desfazerNaoOcorre<T extends DadosMesFixas>(dm: T, fixaId: string): T {
  return { ...dm, fixasNaoOcorre: semChave(dm.fixasNaoOcorre, fixaId) }
}
