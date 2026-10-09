import type { Categoria, PlanoCat } from '../context/AppContext'
import { itensDoMes, comItens, type ItemPlano } from './itensPlano'

/**
 * A categoria MÃE e as variantes que somam nela. Pedido do Guilherme em
 * 09/10/2026: "posso fazer um planejamento por categoria jogando um valor
 * total que soma as variantes [...] quando eu realizar um lançamento com
 * variante, o valor da variante será da categoria, mas posso verificar o
 * detalhamento".
 *
 * A regra é de CADASTRO, não de mês — senão a mesma compra mudaria de linha
 * conforme o que mais foi gasto:
 *
 *   - MÃE é a categoria cadastrada SEM variante, ativa ("Academia").
 *   - Uma variante VARIÁVEL de uma mãe ("Academia · Martin") soma nela: o
 *     gasto vai para a linha da mãe (o lançamento guarda a variante, para o
 *     detalhe) e o plano da variante, se houver, também. Variante desativada
 *     ou que nem existe mais também soma — com a mãe viva, o dinheiro tem casa.
 *   - Variante FIXA fica fora: tem valor, dia e conta próprios, e é o valor
 *     dela no plano que gera o lançamento previsto e a conta a vencer.
 *   - Sem mãe, nada muda: Financiamento · Casa e · Civic seguem independentes.
 */

const n = (s?: string) => (s ?? '').trim()

/** A mãe de um nome: a categoria sem variante, ativa, do mesmo tipo. */
export function maeDe(nome: string, tipo: string, categorias: Categoria[]): Categoria | undefined {
  return categorias.find(c => c.ativa && c.tipo === tipo && n(c.nome) === n(nome) && !n(c.descricao))
}

/** Esta variante soma na mãe? Variável (ou sem cadastro) de um nome que tem mãe. */
export function somaNaMae(nome: string, descricao: string | undefined, tipo: string, categorias: Categoria[]): boolean {
  if (!n(descricao) || !maeDe(nome, tipo, categorias)) return false
  const cad = categorias.find(c => c.tipo === tipo && n(c.nome) === n(nome) && n(c.descricao) === n(descricao))
  return !cad?.fixa
}

/**
 * O plano (uma lista cru, entradas ou saídas) com as linhas das variantes que
 * somam na mãe JUNTADAS na linha da mãe — o valor somado mês a mês e o
 * detalhe em itens ("Martin 103", "Gui 97"), para nada se perder. Linha da
 * mãe que não existe é criada. As outras linhas ficam como estão.
 *
 * É chamada na LEITURA (Radar, previsão, valor da categoria) e na GRAVAÇÃO
 * (mudarLinhaDoPlano): o plano antigo, com valor nas variantes, passa a ser
 * lido somado, e a primeira gravação o deixa nesse formato.
 */
export function juntarNaMae(lista: PlanoCat[], tipo: string, categorias: Categoria[]): PlanoCat[] {
  const identidade = (l: PlanoCat) => {
    const cad = l.id ? categorias.find(c => c.id === l.id) : undefined
    return { nome: cad?.nome ?? l.nome, descricao: cad ? cad.descricao : l.descricao }
  }
  const filhas = lista.filter(l => { const id = identidade(l); return somaNaMae(id.nome, id.descricao, tipo, categorias) })
  if (filhas.length === 0) return lista

  let out = lista.filter(l => !filhas.includes(l))
  for (const filha of filhas) {
    const { nome, descricao } = identidade(filha)
    const mae = maeDe(nome, tipo, categorias)!
    let i = out.findIndex(l => (l.id && l.id === mae.id) || (!l.id && n(l.nome) === n(mae.nome) && !n(l.descricao)))
    if (i < 0) {
      out = [...out, { id: mae.id, nome: mae.nome, grupo: mae.grupo, t: mae.tipoMovimento, v: Array(12).fill(0) }]
      i = out.length - 1
    }
    let linha = out[i]
    for (let m = 0; m < 12; m++) {
      const vFilha = filha.v[m] ?? 0
      if (Math.abs(vFilha) < 0.005) continue
      const proprios: ItemPlano[] = itensDoMes(linha, m)
        ?? ((linha.v[m] ?? 0) > 0.005 ? [{ id: `mae-${m}`, descricao: n(mae.nome), valor: linha.v[m] }] : [])
      const daFilha: ItemPlano[] = (itensDoMes(filha, m) ?? [{ id: `${n(descricao)}-${m}`, descricao: '', valor: vFilha }])
        .map(it => ({ ...it, descricao: it.descricao ? `${n(descricao)} · ${it.descricao}` : n(descricao) }))
      linha = comItens(linha, [m], [...proprios, ...daFilha])
    }
    out = out.map((l, j) => (j === i ? linha : l))
  }
  return out
}
