/**
 * Fixa paga em outra conta naquele mês (28/11/2026, pedido do Guilherme: a
 * fixa "Cuidados Pessoais · Unha" sai por Pix no Sicredi, mas neste mês foi
 * paga em dinheiro). Na edição da fixa, "Dinheiro" troca a conta do mês para
 * a carteira (`fixasContaOverride[id] = 'dinheiro'`, no DadosMes da conta de
 * ORIGEM, como a troca entre bancos), e o que a pessoa já gravou para a fixa
 * naquele mês (paga, valor digitado, dia, descrição, forma, "não vai ocorrer",
 * conferido na Início) vai junto para o DadosMes da conta nova: é ali que
 * Lançamentos, o motor (`movimentoDoMes`) e a Início (`contaDoPagamento`) leem.
 *
 * Nenhum número muda: a fixa continua sendo despesa (ou receita) da mesma
 * categoria e do mesmo plano; só muda de qual conta sai.
 */

/** Campos do DadosMes que são da fixa, por id. */
export const CAMPOS_DA_FIXA = [
  'fixasConsolidadas', 'debitosConferidos', 'fixasValorOverride', 'fixasValorBase',
  'fixasMovidas', 'fixasDescOverride', 'fixasPagOverride', 'fixasNaoOcorre',
] as const

type Mapa = Record<string, unknown>
type ComCampos = { [K in (typeof CAMPOS_DA_FIXA)[number]]?: Mapa }

/**
 * Leva os campos da fixa `id` de `origem` para `destino`. Devolve os dois
 * DadosMes novos; o que a origem não tem não apaga o que o destino já tem.
 */
export function moverFixaDeConta<A extends object, B extends object>(origem: A, destino: B, id: string): [A, B] {
  const o = { ...origem } as A & ComCampos
  const d = { ...destino } as B & ComCampos
  for (const campo of CAMPOS_DA_FIXA) {
    const mapaO = o[campo]
    if (!mapaO || !(id in mapaO)) continue
    const { [id]: valor, ...resto } = mapaO
    o[campo] = resto
    d[campo] = { ...(d[campo] ?? {}), [id]: valor }
  }
  return [o, d]
}

/**
 * As formas na EDIÇÃO de uma fixa já prevista: Saque e Depósito são só do
 * lançamento novo (o "+"). Na fixa de banco o lugar deles é "Dinheiro": paga
 * (ou recebida) em espécie naquele mês, ela sai do Banco e vai para o
 * Dinheiro. Fixa da carteira não troca a forma: lista vazia. A ordem é a das
 * formas do banco (FORMAS_SAI / FORMAS_ENT em NleShared).
 */
export function formasDaEdicaoDaFixa(
  tipo: 'saida' | 'entrada', deBanco: boolean,
): { id: 'debito' | 'pix' | 'transferencia' | 'dinheiro'; label: string }[] {
  if (!deBanco) return []
  return tipo === 'entrada'
    ? [{ id: 'pix', label: 'Pix' }, { id: 'transferencia', label: 'Transferência' }, { id: 'dinheiro', label: 'Dinheiro' }]
    : [{ id: 'debito', label: 'Débito' }, { id: 'pix', label: 'Pix' }, { id: 'transferencia', label: 'Transferência' }, { id: 'dinheiro', label: 'Dinheiro' }]
}
