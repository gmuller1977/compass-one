/**
 * Itens dentro do valor do plano. Pedido do Guilherme em 06/10/2026: ele
 * somava por fora para lançar o valor de uma categoria — Mercado =
 * Supermercado 800 + Feira 300 — e não queria criar categoria para isso.
 *
 * A regra que sustenta tudo: **o valor do mês (`v[mes]`) continua sendo a
 * verdade, e os itens são o detalhe dele.** Radar, Lançamentos, previsão,
 * Início e Simulador leem `v` e não sabem que os itens existem — por isso
 * nenhum número do app se move.
 *
 * Quem grava itens grava `v` junto, com a soma (comItens). Quem grava só `v`
 * tira os itens daquele mês (semItens). E quem LÊ os itens passa por
 * itensDoMes, que os ignora se a soma não bater com `v`: se algum caminho
 * antigo mudar o valor sem saber dos itens — o ajuste do alerta de desvio em
 * Lançamentos, a fatura cadastrada em Configurações —, a tela mostra o valor
 * novo, sem detalhe, em vez de um detalhe que soma outra coisa.
 */
export type ItemPlano = {
  id: string
  descricao: string
  valor: number
  /** Item que veio do Simulador: só muda ou sai por lá. (Próxima etapa.) */
  simulacaoId?: string
}

/** Os itens guardados na linha: mês (0–11) → itens. JSON guarda a chave como texto. */
export type ItensPorMes = Record<number, ItemPlano[]>

type ComItens = { v: number[]; itens?: ItensPorMes }

const MEIO_CENTAVO = 0.005

export const somaItens = (itens: ItemPlano[]) => Math.round(itens.reduce((s, i) => s + i.valor, 0) * 100) / 100

/** Os itens de um mês, só se ainda somarem o valor do mês. Sem itens, null. */
export function itensDoMes(cat: ComItens, mes: number): ItemPlano[] | null {
  const itens = cat.itens?.[mes]
  if (!itens || itens.length === 0) return null
  return Math.abs(somaItens(itens) - (cat.v[mes] ?? 0)) < MEIO_CENTAVO ? itens : null
}

/** Tira os itens dos meses dados. Devolve `undefined` quando não sobra nenhum. */
function semMeses(itens: ItensPorMes | undefined, meses: number[]): ItensPorMes | undefined {
  if (!itens) return undefined
  const resto: ItensPorMes = {}
  for (const [k, v] of Object.entries(itens)) if (!meses.includes(Number(k))) resto[Number(k)] = v
  return Object.keys(resto).length ? resto : undefined
}

/**
 * Grava os itens nos meses dados, e o valor de cada mês vira a soma deles.
 * `null` ou lista vazia tira o detalhe e MANTÉM o valor: "fica só o total".
 */
export function comItens<T extends ComItens>(cat: T, meses: number[], itens: ItemPlano[] | null): T {
  if (!itens || itens.length === 0) {
    const resto = semMeses(cat.itens, meses)
    const { itens: _fora, ...semCampo } = cat
    void _fora
    return (resto ? { ...semCampo, itens: resto } : semCampo) as T
  }
  const total = somaItens(itens)
  const novos: ItensPorMes = { ...(cat.itens ?? {}) }
  for (const m of meses) novos[m] = itens.map(i => ({ ...i }))
  return { ...cat, v: cat.v.map((x, i) => (meses.includes(i) ? total : x)), itens: novos }
}

/** Grava só o valor de um mês — e os itens daquele mês saem, para não discordarem. */
export function comValor<T extends ComItens>(cat: T, mes: number, valor: number): T {
  const v = cat.v.map((x, i) => (i === mes ? valor : x))
  const resto = semMeses(cat.itens, [mes])
  const { itens: _fora, ...semCampo } = cat
  void _fora
  return (resto ? { ...semCampo, v, itens: resto } : { ...semCampo, v }) as T
}

/** Reajuste em %: cada item é multiplicado, e o total segue a soma deles. */
export function escalarItens(itens: ItemPlano[], fator: number): ItemPlano[] {
  return itens.map(i => ({ ...i, valor: Math.round(i.valor * fator * 100) / 100 }))
}

let seq = 0
export const novoIdItem = () => `it-${Date.now().toString(36)}-${(seq++).toString(36)}`
