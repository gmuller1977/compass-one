import type { Categoria, Conta, DadosMes } from '../../context/AppContext'
import { construirRealizadoMes } from '../../utils/realizadoMes'
import { catKey, nomesDeCartao, pickReal, totaisDoMes } from '../acompanhamento/evolucaoCalcs'
import { itensDaSugestao, sugestaoDoMes } from '../../utils/revisaoDoPlano'
import type { ItemPlano } from '../../utils/itensPlano'
import { dadosBaseDoPlano, dadosPrevistoDoAno } from './previstoDoAno'
import { SEM_GRUPO, type AnoData, type Cat } from './types'

/**
 * A revisão do plano anual (pedido do Guilherme em 15/10/2026): o MESMO mês
 * de dois anos lado a lado — o realizado do ano base (janeiro de 2026) contra
 * o plano do ano que se monta (janeiro de 2027), grupo a grupo, com o que já
 * está lançado no ano novo (parcelas da fatura).
 *
 * Nenhuma conta nova: o realizado é o do Radar (`construirRealizadoMes` +
 * `pickReal`, e o total por `totaisDoMes`), o plano é a lista que a tela do
 * Planejamento edita (`dadosAtivos`, com o mesmo `ri`), e a sugestão é a do
 * "mês a mês" do ajuste e da revisão (`valorMesAMes`): o realizado sem
 * parcelas, com as parcelas já lançadas no ano novo somadas por cima.
 */

export type ParcelaLancada = { descricao: string; valor: number; atual: number; total: number }

export type LinhaRevisao = {
  tipo: 'e' | 's'
  /** Índice na lista de `dadosAtivos` — é por ele que se grava. */
  ri: number
  cat: Cat
  /** Realizado do mês no ano base (o do Radar). */
  real: number
  /** O que o plano do ano base previa para o mês. */
  planoBase: number
  /** O plano do ano novo para o mês. */
  plano: number
  /** O que já está lançado no mês do ano novo (quase sempre parcela). */
  lancado: number
  parcelas: ParcelaLancada[]
  /** O valor sugerido para o ano novo; null quando não há o que sugerir. */
  sugerido: number | null
  /** Como gravar a sugestão: em itens quando há parcela ("Gasto normal" + "Bicicleta · 4 de 6"), senão só o valor. */
  itensSugeridos: ItemPlano[] | null
}

export type GrupoRevisao = { grupo: string; linhas: LinhaRevisao[]; real: number; plano: number; lancado: number }

export type EstadoBase = 'fechado' | 'corrente' | 'futuro'

export type Revisao = {
  base: number
  alvo: number
  mes: number
  estadoBase: EstadoBase
  entradas: GrupoRevisao[]
  saidas: GrupoRevisao[]
  /** Realizado do mês base, total — o mesmo dos cartões do Radar. */
  realTotal: { e: number; s: number }
  /** O realizado que não cai em nenhuma linha do plano (categoria excluída ou desativada: "Outras" no Radar). */
  outras: { e: number; s: number }
}

const r2 = (v: number) => Math.round(v * 100) / 100

export function estadoDoMes(ano: number, mes: number, hoje: Date): EstadoBase {
  const n = ano * 12 + mes, h = hoje.getFullYear() * 12 + hoje.getMonth()
  return n < h ? 'fechado' : n === h ? 'corrente' : 'futuro'
}

export function revisaoDoMes(p: {
  alvo: number
  mes: number
  /** O plano do ano novo como a tela o edita (`plan.dadosPrevistoFinal`). */
  dadosAlvo: AnoData
  hasFaturaCat: boolean
  extratoData: Record<string, DadosMes>
  faturaData: Record<string, unknown>
  contas: Conta[]
  categorias: Categoria[]
  planos: Record<number, unknown>
  hoje?: Date
}): Revisao {
  const { alvo, mes, dadosAlvo, categorias, contas } = p
  const base = alvo - 1
  const hoje = p.hoje ?? new Date()
  const estadoBase = estadoDoMes(base, mes, hoje)
  const realizado = (ano: number) => construirRealizadoMes({
    ano, mes, extratoData: p.extratoData, faturaData: p.faturaData, contas, categorias,
    planoAno: p.planos[ano] as Parameters<typeof construirRealizadoMes>[0]['planoAno'],
  })
  const rb = realizado(base)
  const ra = realizado(alvo)
  const tt = totaisDoMes({
    mes, planoAno: p.planos[base] as Parameters<typeof totaisDoMes>[0]['planoAno'],
    categorias, cartaoNomes: nomesDeCartao(contas), ...rb,
  })
  const planoBase = dadosPrevistoDoAno(p.planos[base] as AnoData | undefined, dadosBaseDoPlano(categorias, 0), 0, categorias)

  const lado = (tipo: 'e' | 's'): { grupos: GrupoRevisao[]; soma: number } => {
    const cats = tipo === 'e' ? dadosAlvo.entradas : dadosAlvo.saidas
    const mapaB = tipo === 'e' ? rb.entradasMap : rb.saidasMap
    const mapaA = tipo === 'e' ? ra.entradasMap : ra.saidasMap
    const listaBase = tipo === 'e' ? planoBase.entradas : planoBase.saidas
    const porGrupo = new Map<string, LinhaRevisao[]>()
    let soma = 0
    cats.forEach((cat, ri) => {
      // Com a fatura planejada como linha própria, as categorias de cartão não
      // entram — o mesmo filtro do modal do mês e dos totais.
      if (tipo === 's' && p.hasFaturaCat && cat.t === 'cartao') return
      const crB = pickReal(mapaB, cat.nome, cat.descricao, categorias)
      const crA = pickReal(mapaA, cat.nome, cat.descricao, categorias)
      const lb = (cat.id ? listaBase.find(c => c.id === cat.id) : undefined)
        ?? listaBase.find(c => catKey(c.nome, c.descricao) === catKey(cat.nome, cat.descricao))
      const real = r2(crB?.total ?? 0)
      const lancado = r2(crA?.total ?? 0)
      const parcelas = (crA?.lancamentos ?? []).filter(l => l.parcela && Math.abs(l.valor) > 0.005)
        .map(l => ({ descricao: l.descricao, valor: l.valor, atual: l.parcela!.atual, total: l.parcela!.total }))
      const parcelasBase = (crB?.lancamentos ?? []).filter(l => l.parcela).reduce((s, l) => s + l.valor, 0)
      const plano = cat.v[mes] ?? 0
      // Só mês FECHADO serve de base: um mês pela metade sugeriria metade.
      // Sem base, a sugestão é só cobrir o já lançado.
      const baseSug = estadoBase === 'fechado' && Math.abs(real) > 0.005 ? Math.max(0, real - parcelasBase) : null
      const ja = (crA?.lancamentos ?? []).filter(l => Math.abs(l.valor) > 0.005)
        .map(l => ({ descricao: l.descricao, valor: l.valor, ...(l.parcela ? { parcela: l.parcela } : {}) }))
      const sug = sugestaoDoMes(baseSug, plano, ja, lancado)
      const muda = Math.abs(sug - plano) > 0.005
      const linha: LinhaRevisao = {
        tipo, ri, cat, real, planoBase: lb?.v[mes] ?? 0, plano, lancado, parcelas,
        sugerido: muda ? sug : null,
        itensSugeridos: muda ? itensDaSugestao(baseSug, sug, ja, lancado) : null,
      }
      soma += real
      const g = cat.grupo ?? SEM_GRUPO
      if (!porGrupo.has(g)) porGrupo.set(g, [])
      porGrupo.get(g)!.push(linha)
    })
    const grupos = [...porGrupo.entries()]
      .sort(([a], [b]) => a === SEM_GRUPO ? 1 : b === SEM_GRUPO ? -1 : a.localeCompare(b, 'pt-BR'))
      .map(([grupo, linhas]) => ({
        grupo, linhas,
        real: r2(linhas.reduce((s, l) => s + l.real, 0)),
        plano: r2(linhas.reduce((s, l) => s + l.plano, 0)),
        lancado: r2(linhas.reduce((s, l) => s + l.lancado, 0)),
      }))
    return { grupos, soma }
  }

  const e = lado('e'), s = lado('s')
  const realTotal = { e: r2(tt.entrada.real), s: r2(tt.saida.real) }
  return {
    base, alvo, mes, estadoBase,
    entradas: e.grupos, saidas: s.grupos, realTotal,
    outras: { e: r2(realTotal.e - e.soma), s: r2(realTotal.s - s.soma) },
  }
}

/** As linhas que "Preencher os vazios" grava: sem plano no ano novo e com sugestão. */
export function linhasVazias(r: Revisao): LinhaRevisao[] {
  return [...r.entradas, ...r.saidas].flatMap(g => g.linhas)
    .filter(l => Math.abs(l.plano) < 0.005 && l.sugerido !== null && l.sugerido > 0.005)
}
