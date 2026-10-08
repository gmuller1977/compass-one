import type { Categoria, PlanoAnoData } from '../context/AppContext'
import type { Deps } from './saldoConta'
import type { LancadoAcima } from './lancadoAcimaDoPlano'
import { mediaSemParcelas, type JaLancado } from './historicoDaCategoria'
import { valorMesAMes, somaDeParcelas } from './ajustePlano'
import { mudarLinhaDoPlano } from './linhaDoPlano'
import { comItens, comValor, novoIdItem, type ItemPlano } from './itensPlano'
import { norm } from '../components/acompanhamento/evolucaoCalcs'

/**
 * A revisão do plano: as categorias cujo JÁ LANÇADO passa do plano de um mês
 * que ainda não começou (utils/lancadoAcimaDoPlano), numa tabela com o plano
 * atual e o valor sugerido, para confirmar de uma vez. Pedido do Guilherme em
 * 08/10/2026: "algumas categorias precisam de revisão de planejamento", com
 * "Revisar agora" — no Planejamento, na Início e no Radar.
 *
 * Nenhuma conta nova. O que passou do plano sai de lancadoAcimaDoPlano; a
 * média, de mediaSemParcelas; e a sugestão é a MESMA do "mês a mês" do ajuste
 * pelo Radar (valorMesAMes). O mês corrente não entra: lancadoAcimaDoPlano
 * começa no mês seguinte a hoje, pela regra do ajuste.
 *
 * A sugestão nunca fica abaixo do já lançado — aceitar todas faz o aviso sumir.
 */
export type LinhaRevisao = {
  nome: string
  descricao: string
  grupo: string
  ano: number
  mes: number
  plano: number
  jaLancado: number
  itens: JaLancado[]
  /** O gasto normal (média sem parcelas dos meses fechados), ou null sem histórico. */
  base: number | null
  sugerido: number
  /**
   * Por que o plano NÃO resolve esta linha — null quando resolve. O dinheiro
   * está numa categoria sem cadastro ativo EXATO (nome + variante): variante
   * desativada ou excluída, ou lançamento sem a variante numa categoria que
   * tem várias. O Radar não lê plano para essas linhas (buildAllCats), então
   * gravar não faria o aviso sumir — e gravar no nome sem a variante trocava
   * o plano de OUTRA categoria. Aconteceu em 08/10/2026: "Alimentação · Gui"
   * gravou 41,00 no plano de novembro de "Alimentação".
   */
  motivo: string | null
}

/**
 * O cadastro onde o plano desta linha pode ser gravado: o mesmo nome e a
 * mesma variante, de despesa e ATIVO — a regra com que o Radar decide se uma
 * linha do plano aparece (buildAllCats). Sem cair para o nome sozinho.
 */
export function cadastroPlanejavel(nome: string, descricao: string, categorias: Categoria[]): Categoria | undefined {
  const c = categorias.find(c => c.tipo === 'saida' && norm(c.nome) === norm(nome) && norm(c.descricao) === norm(descricao))
  return c?.ativa ? c : undefined
}

function motivoDe(nome: string, descricao: string, itens: JaLancado[], categorias: Categoria[]): string | null {
  if (cadastroPlanejavel(nome, descricao, categorias)) return null
  const doNome = categorias.filter(c => c.tipo === 'saida' && norm(c.nome) === norm(nome))
  const variantesAtivas = doNome.filter(c => c.ativa && norm(c.descricao)).map(c => norm(c.descricao))
  const parcela = itens.some(i => i.parcela)
  if (!norm(descricao) && variantesAtivas.length > 1) {
    return `Lançado sem variante (${variantesAtivas.join(' ou ')}). ${parcela
      ? 'Abra a parcela 1 da compra no cartão e salve de novo: as outras parcelas recebem a variante dela.'
      : 'Abra o lançamento e escolha a variante.'}`
  }
  const existe = doNome.find(c => norm(c.descricao) === norm(descricao))
  const nomeCat = norm(descricao) ? `${nome} · ${descricao}` : nome
  return existe
    ? `${nomeCat} está desativada, e o plano dela não conta. Reative em Configurações → Categorias, ou mude a categoria do lançamento.`
    : `${nomeCat} não existe no cadastro. Crie a categoria em Configurações → Categorias, ou mude a categoria do lançamento.`
}

/** O valor sugerido de um mês — valorMesAMes, com as parcelas separadas. */
export function sugestaoDoMes(base: number | null, planoAtual: number, itens: JaLancado[], jaLancado: number): number {
  return valorMesAMes(base, planoAtual, jaLancado, somaDeParcelas(itens))
}

/**
 * Como o valor sugerido é gravado: em ITENS quando há parcela no mês — "Gasto
 * normal" e cada parcela ("Bicicleta · 4 de 6"), para o Planejamento mostrar
 * de onde veio o número —, e só o valor (null) quando não há. Sem média e com
 * o plano já acima do lançado, também só o valor: os itens não somariam ele.
 */
export function itensDaSugestao(base: number | null, valor: number, itens: JaLancado[], jaLancado: number): ItemPlano[] | null {
  const parcelas = itens.filter(i => i.parcela)
  if (parcelas.length === 0) return null
  const rotulo = (i: JaLancado) => (i.parcela ? `${i.descricao} · ${i.parcela.atual} de ${i.parcela.total}` : i.descricao)
  if (base === null) {
    if (Math.abs(valor - jaLancado) > 0.005) return null
    return itens.map(i => ({ id: novoIdItem(), descricao: rotulo(i), valor: i.valor }))
  }
  const normal = Math.round((valor - somaDeParcelas(parcelas)) * 100) / 100
  return [
    ...(normal > 0.005 ? [{ id: novoIdItem(), descricao: 'Gasto normal', valor: normal }] : []),
    ...parcelas.map(i => ({ id: novoIdItem(), descricao: rotulo(i), valor: i.valor })),
  ]
}

/** Uma linha da tabela por categoria e mês, na ordem do aviso. */
export function linhasDaRevisao(acima: LancadoAcima[], deps: Deps, hoje: Date = new Date()): LinhaRevisao[] {
  return acima.flatMap(a => {
    const m = mediaSemParcelas(deps, 'saida', a.nome, a.descricao || undefined, hoje)
    const base = m && m.media > 0.005 ? m.media : null
    return a.meses.map(ms => ({
      nome: a.nome, descricao: a.descricao, grupo: a.grupo, ano: ms.ano, mes: ms.mes,
      plano: ms.plano, jaLancado: ms.jaLancado, itens: ms.itens, base,
      sugerido: sugestaoDoMes(base, ms.plano, ms.itens, ms.jaLancado),
      motivo: motivoDe(a.nome, a.descricao, ms.itens, deps.categorias),
    }))
  })
}

/**
 * Grava as linhas confirmadas, cada mês no plano do ano dele. Valor igual ao
 * sugerido vai com os itens da sugestão; valor digitado vai só como valor.
 * Não grava — volta em `naoGravadas` — a linha sem cadastro ativo exato
 * (`motivo`) e a ambígua do plano antigo (duas "Financiamento" sem variante).
 */
export function gravarRevisao(
  planos: Record<number, PlanoAnoData>,
  escolhas: { linha: LinhaRevisao; valor: number }[],
  categorias: Categoria[],
): { planos: Record<number, PlanoAnoData>; naoGravadas: LinhaRevisao[] } {
  const novo = { ...planos }
  const naoGravadas: LinhaRevisao[] = []
  for (const { linha, valor } of escolhas) {
    const cad = cadastroPlanejavel(linha.nome, linha.descricao, categorias)
    if (!cad) { naoGravadas.push(linha); continue }
    const cat = {
      id: cad.id, nome: cad.nome, descricao: cad.descricao || undefined,
      grupo: cad.grupo, tipoMovimento: cad.tipoMovimento,
    }
    const itens = Math.abs(valor - linha.sugerido) < 0.005
      ? itensDaSugestao(linha.base, valor, linha.itens, linha.jaLancado)
      : null
    const r = mudarLinhaDoPlano(novo[linha.ano], 'saida', cat,
      l => (itens ? comItens(l, [linha.mes], itens) : comValor(l, linha.mes, valor)))
    if (r) novo[linha.ano] = r
    else naoGravadas.push(linha)
  }
  return { planos: novo, naoGravadas }
}

const MESES_LONGOS = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
const reais = (v: number) => `R$ ${Math.round(Math.abs(v)).toLocaleString('pt-BR')}`

/**
 * A frase do aviso — a mesma na Início, no Radar e no Planejamento. Pedido do
 * Guilherme em 08/10/2026: no lugar de "já lançado acima do plano dos
 * próximos meses", "algumas categorias precisam de revisão de planejamento".
 * O detalhe diz por quê.
 */
export function textoDaRevisao(acima: LancadoAcima[]): { titulo: string; detalhe: string } | null {
  if (acima.length === 0) return null
  const nomeDe = (a: LancadoAcima) => (a.descricao ? `${a.nome} · ${a.descricao}` : a.nome)
  if (acima.length === 1) {
    const a = acima[0], m0 = a.meses[0]
    const parcela = m0.itens.find(i => i.parcela)
    const outros = a.meses.length > 1 ? ` (e mais ${a.meses.length - 1} ${a.meses.length === 2 ? 'mês' : 'meses'})` : ''
    return {
      titulo: `${nomeDe(a)} precisa de revisão de planejamento`,
      detalhe: parcela?.parcela
        ? `${parcela.descricao} ${parcela.parcela.atual} de ${parcela.parcela.total} já está na fatura de ${MESES_LONGOS[m0.mes]}, e passa do plano${outros}.`
        : `${reais(m0.jaLancado)} já lançado em ${MESES_LONGOS[m0.mes]}, com plano de ${reais(m0.plano)}${outros}.`,
    }
  }
  const nomes = acima.map(nomeDe)
  return {
    titulo: 'Algumas categorias precisam de revisão de planejamento',
    detalhe: `O já lançado passa do plano dos próximos meses: ${nomes.length <= 3
      ? `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
      : `${nomes.slice(0, 2).join(', ')} e mais ${nomes.length - 2}`}.`,
  }
}
