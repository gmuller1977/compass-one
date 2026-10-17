import type { Categoria, Conta, DadosMes } from '../../context/AppContext'
import { construirRealizadoMes } from '../../utils/realizadoMes'
import { catKey, nomesDeCartao, pickReal, totaisDoMes } from '../acompanhamento/evolucaoCalcs'
import { itensDaSugestao, sugestaoDoMes } from '../../utils/revisaoDoPlano'
import type { ItemPlano } from '../../utils/itensPlano'
import { primeiroMesComRegistro, ymRegistro } from '../../utils/evolucaoSaldo'
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

/**
 * Com o que comparar o ano novo (pedido do Guilherme em 17/10/2026):
 * - `mes`: o mesmo mês do ano base (janeiro de 2026 para janeiro de 2027);
 * - `media`: a média dos meses FECHADOS do ano base, desde o primeiro registro;
 * - `anterior`: o mês antes do revisado (jan/2027 → dez/2026; set/2027 →
 *   ago/2027), pedido dele no mesmo dia. Sem fechar, mostra só o plano dele.
 * As três passam pela mesma conta: a média dos meses da lista (um mês só nas
 * duas primeiras), cada um pelo realizado do Radar.
 */
export type ModoBase = 'mes' | 'media' | 'anterior'
export type MesRef = { ano: number; mes: number }

export type LinhaRevisao = {
  tipo: 'e' | 's'
  /** Índice na lista de `dadosAtivos` — é por ele que se grava. */
  ri: number
  cat: Cat
  /** Realizado da base (o do Radar; na média, a média dos meses). */
  real: number
  /** O que o plano previa para os meses da base. */
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
  modo: ModoBase
  /** Os meses que formam a base; vazio quando não há mês fechado para isso. */
  mesesBase: MesRef[]
  /** Fechado quando todos os meses da base fecharam — só aí há sugestão. */
  estadoBase: EstadoBase
  entradas: GrupoRevisao[]
  saidas: GrupoRevisao[]
  /** Realizado da base, total — o mesmo dos cartões do Radar (média, na média). */
  realTotal: { e: number; s: number }
  /** O realizado que não cai em nenhuma linha do plano (categoria excluída ou desativada: "Outras" no Radar). */
  outras: { e: number; s: number }
}

const r2 = (v: number) => Math.round(v * 100) / 100

export function estadoDoMes(ano: number, mes: number, hoje: Date): EstadoBase {
  const n = ano * 12 + mes, h = hoje.getFullYear() * 12 + hoje.getMonth()
  return n < h ? 'fechado' : n === h ? 'corrente' : 'futuro'
}

/** Os meses da base de cada modo. */
export function mesesDaBase(modo: ModoBase, base: number, mes: number, hoje: Date,
  extratoData: Record<string, DadosMes>): MesRef[] {
  if (modo === 'mes') return [{ ano: base, mes }]
  const h = hoje.getFullYear() * 12 + hoje.getMonth()
  if (modo === 'anterior') {
    const a = (base + 1) * 12 + mes - 1
    return [{ ano: Math.floor(a / 12), mes: a % 12 }]
  }
  const primeiro = primeiroMesComRegistro(extratoData as Parameters<typeof primeiroMesComRegistro>[0])
  const lista: MesRef[] = []
  for (let m = 0; m < 12; m++) {
    if (base * 12 + m >= h) break
    if (primeiro === null || ymRegistro(base, m) < primeiro) continue
    lista.push({ ano: base, mes: m })
  }
  return lista
}

export function revisaoDoMes(p: {
  alvo: number
  mes: number
  modo?: ModoBase
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
  const modo = p.modo ?? 'mes'
  const base = alvo - 1
  const hoje = p.hoje ?? new Date()
  const mesesBase = mesesDaBase(modo, base, mes, hoje, p.extratoData)
  const estados = mesesBase.map(m => estadoDoMes(m.ano, m.mes, hoje))
  const estadoBase: EstadoBase = estados.length === 0 ? 'futuro'
    : estados.includes('futuro') ? 'futuro' : estados.includes('corrente') ? 'corrente' : 'fechado'
  const n = mesesBase.length || 1
  const realizado = (ano: number, mi: number) => construirRealizadoMes({
    ano, mes: mi, extratoData: p.extratoData, faturaData: p.faturaData, contas, categorias,
    planoAno: p.planos[ano] as Parameters<typeof construirRealizadoMes>[0]['planoAno'],
  })
  const planoDoAno = new Map<number, AnoData>()
  const planoDe = (ano: number) => {
    if (!planoDoAno.has(ano)) planoDoAno.set(ano,
      dadosPrevistoDoAno(p.planos[ano] as AnoData | undefined, dadosBaseDoPlano(categorias, 0), 0, categorias))
    return planoDoAno.get(ano)!
  }
  const bases = mesesBase.map(m => {
    const rb = realizado(m.ano, m.mes)
    const tt = totaisDoMes({
      mes: m.mes, planoAno: p.planos[m.ano] as Parameters<typeof totaisDoMes>[0]['planoAno'],
      categorias, cartaoNomes: nomesDeCartao(contas), ...rb,
    })
    return { ...m, rb, tt, plano: planoDe(m.ano) }
  })
  const ra = realizado(alvo, mes)

  const lado = (tipo: 'e' | 's'): { grupos: GrupoRevisao[]; soma: number } => {
    const cats = tipo === 'e' ? dadosAlvo.entradas : dadosAlvo.saidas
    const mapaA = tipo === 'e' ? ra.entradasMap : ra.saidasMap
    const porGrupo = new Map<string, LinhaRevisao[]>()
    let soma = 0
    cats.forEach((cat, ri) => {
      // Com a fatura planejada como linha própria, as categorias de cartão não
      // entram — o mesmo filtro do modal do mês e dos totais.
      if (tipo === 's' && p.hasFaturaCat && cat.t === 'cartao') return
      let real = 0, parcelasBase = 0, planoBase = 0
      for (const b of bases) {
        const crB = pickReal(tipo === 'e' ? b.rb.entradasMap : b.rb.saidasMap, cat.nome, cat.descricao, categorias)
        real += crB?.total ?? 0
        parcelasBase += (crB?.lancamentos ?? []).filter(l => l.parcela).reduce((s, l) => s + l.valor, 0)
        const lista = tipo === 'e' ? b.plano.entradas : b.plano.saidas
        const lb = (cat.id ? lista.find(c => c.id === cat.id) : undefined)
          ?? lista.find(c => catKey(c.nome, c.descricao) === catKey(cat.nome, cat.descricao))
        planoBase += lb?.v[b.mes] ?? 0
      }
      real = r2(real / n); parcelasBase /= n; planoBase = r2(planoBase / n)
      const crA = pickReal(mapaA, cat.nome, cat.descricao, categorias)
      const lancado = r2(crA?.total ?? 0)
      const parcelas = (crA?.lancamentos ?? []).filter(l => l.parcela && Math.abs(l.valor) > 0.005)
        .map(l => ({ descricao: l.descricao, valor: l.valor, atual: l.parcela!.atual, total: l.parcela!.total }))
      const plano = cat.v[mes] ?? 0
      // Só mês FECHADO serve de base: um mês pela metade sugeriria metade.
      // Sem base, a sugestão é só cobrir o já lançado. A parcela da base sai
      // dela: a compra parcelada não se repete, e as do ano novo entram por cima.
      const baseSug = estadoBase === 'fechado' && Math.abs(real) > 0.005 ? r2(Math.max(0, real - parcelasBase)) : null
      const ja = (crA?.lancamentos ?? []).filter(l => Math.abs(l.valor) > 0.005)
        .map(l => ({ descricao: l.descricao, valor: l.valor, ...(l.parcela ? { parcela: l.parcela } : {}) }))
      const sug = sugestaoDoMes(baseSug, plano, ja, lancado)
      // Sem botão (pedido do Guilherme, 17/10/2026) quando a sugestão é zero
      // ou quando o plano do ano novo já bate com a base e cobre o já lançado.
      const bateComBase = Math.abs(plano - real) < 0.005 && plano >= lancado - 0.005
      const muda = Math.abs(sug - plano) > 0.005 && sug > 0.005 && !bateComBase
      const linha: LinhaRevisao = {
        tipo, ri, cat, real, planoBase, plano, lancado, parcelas,
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
  const realTotal = {
    e: r2(bases.reduce((t, b) => t + b.tt.entrada.real, 0) / n),
    s: r2(bases.reduce((t, b) => t + b.tt.saida.real, 0) / n),
  }
  return {
    base, alvo, mes, modo, mesesBase, estadoBase,
    entradas: e.grupos, saidas: s.grupos, realTotal,
    outras: { e: r2(realTotal.e - e.soma), s: r2(realTotal.s - s.soma) },
  }
}

/** As linhas que "Preencher os vazios" grava: sem plano no ano novo e com sugestão. */
export function linhasVazias(r: Revisao): LinhaRevisao[] {
  return [...r.entradas, ...r.saidas].flatMap(g => g.linhas)
    .filter(l => Math.abs(l.plano) < 0.005 && l.sugerido !== null && l.sugerido > 0.005)
}
