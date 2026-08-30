import type { Categoria } from '../context/AppContext'
import { catKey } from '../components/acompanhamento/evolucaoCalcs'

type LinhaPlano = { nome: string; descricao?: string; t?: string; v: number[] }
type PlanoAno = { saidas?: LinhaPlano[] } | undefined

/**
 * Limite do cartão, calculado a partir do planejamento.
 *
 * O app tinha um campo "limite do cartão" no cadastro da conta. Ele foi
 * removido: o número que importa não é o teto que o banco concede, é quanto o
 * usuário planejou gastar no cartão neste mês.
 *
 * A conta é a soma do planejado das categorias marcadas como
 * `tipoMovimento: 'cartao'` — "Gastos pagos no cartão", no cadastro de
 * categoria. É o mesmo filtro que decide quais categorias aparecem na fatura.
 *
 * O limite é **agregado, nunca por cartão**: não existe no dado a informação
 * de qual categoria pertence a qual cartão, e o usuário planeja pelo total.
 * Por isso o disponível é um número só para o conjunto dos cartões.
 *
 * As categorias casam com a linha do plano pelo par (nome, variante). Casar
 * por nome puro somaria Seguro·Civic com Seguro·March.
 */
export function limiteCartaoPlanejado(
  plano: PlanoAno,
  categorias: Categoria[],
  mes: number,
): number {
  const doCartao = new Set(
    categorias
      .filter(c => c.tipoMovimento === 'cartao' && c.ativa && c.tipo === 'saida')
      .map(c => catKey(c.nome, c.descricao)),
  )
  if (doCartao.size === 0) return 0

  return (plano?.saidas ?? []).reduce((soma, linha) => {
    // A linha de "fatura do cartão", quando existe, representa o total da
    // fatura — somá-la aqui contaria o mesmo gasto duas vezes.
    if (linha.t === 'fatura_cartao') return soma
    return doCartao.has(catKey(linha.nome, linha.descricao))
      ? soma + (linha.v[mes] ?? 0)
      : soma
  }, 0)
}

/**
 * Disponível no cartão: o que foi planejado menos o que já está nas faturas.
 *
 * Pode ficar negativo, e isso é informação — significa que o gasto passou do
 * planejado. Quem exibe decide se corta em zero.
 */
export function disponivelCartao(
  plano: PlanoAno,
  categorias: Categoria[],
  mes: number,
  totalFaturas: number,
): number {
  return limiteCartaoPlanejado(plano, categorias, mes) - totalFaturas
}
