import type { Categoria, DadosMes, Lancamento, PlanoAnoData, PlanoCat } from '../context/AppContext'
import { catKey, norm, resolverPlanCats } from '../components/acompanhamento/evolucaoCalcs'
import { rotuloDaLinha } from './motivoDoEstouro'
import { lerRotuloParcela, rotuloParcela } from './renomearCompra'

/**
 * Renomear uma categoria leva junto o que já está gravado com o nome dela.
 * Pedido do Guilherme em 12/10/2026: "quando faço a mudança de descrição de
 * uma categoria que já tem lançamento, deveria mudar a categoria dos
 * lançamentos e não pedir para arrumar os lançamentos".
 *
 * O lançamento guarda a categoria pelo TEXTO (`categoria` + `subCategoria`),
 * e o plano casa por (nome, variante) — trocar só o cadastro deixava os
 * lançamentos e o plano no nome antigo: o gasto caía em "Outras" e a linha do
 * plano virava categoria que não existe.
 *
 * Só texto, nenhum valor se move. Muda:
 *   - extrato (bancos e dinheiro) e fatura: `categoria`, `subCategoria`, e a
 *     `descricao` que era só o nome da categoria (a fatura grava compra sem
 *     descrição com o nome dela);
 *   - plano, todos os anos: a linha da categoria e os itens de parcela
 *     "<nome antigo> · k de N".
 * Meses e anos não tocados mantêm a identidade, para a gravação por mês
 * mandar ao banco só o que mudou.
 */

export type Identidade = { nome: string; descricao?: string }

/** Mudou o nome ou a variante? */
export function mudouIdentidade(antes: Identidade, depois: Identidade): boolean {
  return catKey(antes.nome, antes.descricao) !== catKey(depois.nome, depois.descricao)
}

type LancTexto = Pick<Lancamento, 'categoria' | 'descricao' | 'tipo'> & { subCategoria?: string }

/**
 * O lançamento é desta categoria? Pelo par (nome, variante), com os dois
 * casos em que o app já soma o lançamento nela sem o par exato:
 *   - categoria SEM variante (a mãe) e lançamento com uma variante que não
 *     tem cadastro: soma na mãe (utils/categoriaMae);
 *   - categoria COM variante, única com aquele nome, e lançamento sem
 *     variante: o Radar põe o lançamento nela (resolverRealKey).
 * `tipoNoExtrato`: com outra categoria do mesmo par e do outro tipo, só o
 * lançamento do tipo dela; na fatura (null), só categoria de saída.
 */
function ehDaCategoria(l: LancTexto, cat: Categoria, categorias: Categoria[], tipoNoExtrato: string | null): boolean {
  if (norm(l.categoria) !== norm(cat.nome)) return false
  const doNome = categorias.filter(c => c.id !== cat.id && norm(c.nome) === norm(cat.nome))
  const sub = norm(l.subCategoria)
  const desc = norm(cat.descricao)
  let casa: boolean
  if (sub === desc) casa = true
  else if (!desc) casa = !doNome.some(c => norm(c.descricao) === sub)
  else casa = !sub && doNome.length === 0
  if (!casa) return false
  const gemea = doNome.some(c => c.tipo !== cat.tipo && norm(c.descricao) === desc)
  if (tipoNoExtrato === null) return cat.tipo === 'saida'
  return !gemea || tipoNoExtrato === cat.tipo
}

function renomearLanc<L extends LancTexto>(l: L, antes: Identidade, depois: Identidade): L {
  const subAntes = norm(l.subCategoria)
  const novaSub = subAntes === norm(antes.descricao) ? norm(depois.descricao) : (norm(depois.descricao) || subAntes)
  const desc = norm(l.descricao)
  const descricao = desc === norm(antes.nome) ? depois.nome
    : desc === rotuloDaLinha(antes) ? rotuloDaLinha({ nome: depois.nome, descricao: norm(depois.descricao) || undefined })
    : l.descricao
  return { ...l, categoria: depois.nome, subCategoria: novaSub || undefined, descricao }
}

type MesComLancs = { lancamentos?: Record<number, LancTexto[]> }

function renomearNosMeses<T>(
  meses: Record<string, T>, cat: Categoria, antes: Identidade, depois: Identidade,
  categorias: Categoria[], naFatura: boolean,
): Record<string, T> {
  let out = meses
  for (const [k, v] of Object.entries(meses)) {
    const dm = v as unknown as MesComLancs
    if (!dm?.lancamentos) continue
    let mudou = false
    const lancs: Record<number, LancTexto[]> = {}
    for (const [d, lista] of Object.entries(dm.lancamentos)) {
      lancs[Number(d)] = (lista ?? []).map(l => {
        if (!ehDaCategoria(l, { ...cat, ...antes }, categorias, naFatura ? null : l.tipo)) return l
        mudou = true
        return renomearLanc(l, antes, depois)
      })
    }
    if (mudou) {
      if (out === meses) out = { ...meses }
      out[k] = { ...dm, lancamentos: lancs } as unknown as T
    }
  }
  return out
}

/** Extrato (bancos e dinheiro) com os lançamentos da categoria no nome novo. */
export function renomearNoExtrato(
  extrato: Record<string, DadosMes>, cat: Categoria, antes: Identidade, depois: Identidade, categorias: Categoria[],
): Record<string, DadosMes> {
  return renomearNosMeses(extrato, cat, antes, depois, categorias, false)
}

/** Faturas com as compras da categoria no nome novo. */
export function renomearNaFaturaDaCategoria(
  faturas: Record<string, unknown>, cat: Categoria, antes: Identidade, depois: Identidade, categorias: Categoria[],
): Record<string, unknown> {
  return renomearNosMeses(faturas, cat, antes, depois, categorias, true)
}

/** Itens de parcela "<nome antigo> · k de N" (a compra sem descrição) passam a "<novo> · k de N". */
function renomearItens(l: PlanoCat, antes: Identidade, depois: Identidade): PlanoCat {
  if (!l.itens || norm(antes.nome) === norm(depois.nome)) return l
  let mudou = false
  const itens: NonNullable<PlanoCat['itens']> = {}
  for (const [m, lista] of Object.entries(l.itens)) {
    itens[Number(m)] = (lista ?? []).map(i => {
      const r = lerRotuloParcela(i.descricao)
      if (!r || r.nome !== norm(antes.nome)) return i
      mudou = true
      return { ...i, descricao: rotuloParcela(depois.nome, r.atual, r.total) }
    })
  }
  return mudou ? { ...l, itens } : l
}

/**
 * Plano de cada ano com a linha da categoria no nome novo. A linha é achada
 * pelo id do cadastro, pelo par (nome, variante), ou — plano antigo, com a
 * variante atribuída por posição — pela leitura resolvida, a mesma do Radar.
 */
export function renomearNosPlanos(
  planos: Record<number, PlanoAnoData>, cat: Categoria, antes: Identidade, depois: Identidade, categorias: Categoria[],
): Record<number, PlanoAnoData> {
  const chaveAntes = catKey(antes.nome, antes.descricao)
  let out = planos
  for (const [ano, pd] of Object.entries(planos)) {
    const campo = cat.tipo === 'entrada' ? 'entradas' : 'saidas'
    const lista = pd?.[campo] ?? []
    const resolvidas = resolverPlanCats(cat.tipo, lista, categorias)
    const porPosicao = resolvidas.length === lista.length
    let mudou = false
    const nova = lista.map((l, i) => {
      const daCat = (l.id && l.id === cat.id)
        || (!l.id && catKey(l.nome, l.descricao) === chaveAntes)
        || (!l.id && !norm(l.descricao) && porPosicao && norm(resolvidas[i].nome) === norm(antes.nome)
            && catKey(resolvidas[i].nome, resolvidas[i].descricao) === chaveAntes)
      if (!daCat) return l
      mudou = true
      return renomearItens({ ...l, nome: depois.nome, descricao: norm(depois.descricao) || undefined }, antes, depois)
    })
    if (mudou) {
      if (out === planos) out = { ...planos }
      out[Number(ano)] = { ...pd, [campo]: nova }
    }
  }
  return out
}
