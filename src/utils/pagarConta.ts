import type { Conta, Categoria, DadosMes } from '../context/AppContext'

const chave = (conta: string, ano: number, mes: number) => `${conta}-${ano}-${String(mes + 1).padStart(2, '0')}`

/**
 * Em que conta se confirma o pagamento de uma conta a vencer — as mesmas
 * regras de Lançamentos, que confirma no `DadosMes` da conta onde a fixa
 * aparece:
 *
 *   - fatura (`cartao-<id>`): a conta de pagamento do cartão, ou a preferida
 *   - fixa de dinheiro: a carteira
 *   - fixa de banco: a conta de débito da categoria, ou a preferida, com a
 *     troca do mês (`fixasContaOverride`) valendo por cima — `contaDaFixaNoMes`
 *
 * `undefined` quando não há conta nenhuma para receber o pagamento.
 */
export function contaDoPagamento(
  id: string, ano: number, mes: number,
  contas: Conta[], categorias: Categoria[], extratoData: Record<string, DadosMes>,
): string | undefined {
  const padrao = (contas.find(c => c.tipo !== 'cartao' && c.preferida) ?? contas.find(c => c.tipo !== 'cartao'))?.id
  if (id.startsWith('cartao-')) {
    const cartao = contas.find(c => c.id === id.slice(7))
    return cartao?.contaPagamentoId ?? padrao
  }
  const cat = categorias.find(c => c.id === id)
  if (!cat) return undefined
  if (cat.tipoMovimento === 'dinheiro') return 'dinheiro'
  const origem = cat.contaDebitoId ?? padrao
  if (!origem) return undefined
  return extratoData[chave(origem, ano, mes)]?.fixasContaOverride?.[cat.id] ?? origem
}

/**
 * Marca a conta como paga no mês. Valor diferente do previsto vira
 * `fixasValorOverride` — o mesmo campo que Lançamentos grava ao digitar o
 * valor real na linha da fixa, e que o motor lê para o saldo.
 */
export function confirmarPagamento(dm: DadosMes, id: string, valorPago: number, previsto: number): DadosMes {
  const mudou = Math.abs(valorPago - previsto) > 0.004
  return {
    ...dm,
    fixasConsolidadas: { ...dm.fixasConsolidadas, [id]: true },
    ...(mudou ? { fixasValorOverride: { ...dm.fixasValorOverride, [id]: valorPago } } : {}),
  }
}
