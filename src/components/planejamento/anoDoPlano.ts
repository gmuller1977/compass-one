import type { Saldos } from './types'

/**
 * O ano do Planejamento mês a mês, para o topo e o gráfico — computador
 * (PlanResumoAnual, PlanAnoVisao) e celular (PlanMobile) leem daqui, para os
 * dois não discordarem.
 *
 * Nenhuma conta nova. `sobra` é o que o PLANO guarda no mês (receitas −
 * despesas planejadas). `guardou` é o que o mês guardou DE VERDADE, só nos
 * meses fechados: o fechamento real menos o saldo real com que ele abriu
 * (`saldoFinalReal` e `saldoInicialReal` do usePlanejamento, bancos e
 * dinheiro). O real fica ao lado do plano, nunca no lugar das categorias.
 */
export interface MesDoAno {
  mi: number
  fechado: boolean
  atual: boolean
  semPlano: boolean
  /** Fechamento real (meses fechados). */
  real?: number
  /** Saldo final previsto. */
  final: number
  /** Quanto o plano guarda no mês. */
  sobra: number
  /** Quanto o mês guardou de verdade (meses fechados). */
  guardou?: number
  /** Saldo acumulado: o real nos fechados, o previsto nos outros. */
  valor: number
  /** Meta de economia do mês (`objetivos[mês]`). */
  meta: number
}

export function mesesDoAno(o: {
  previsto: Saldos
  anoAtual: number
  mesAtual: number
  fechamentoReal?: number[]
  inicioReal?: number[]
  objetivos: number[]
}): MesDoAno[] {
  const anoCorrente = new Date().getFullYear()
  return Array.from({ length: 12 }, (_, mi) => {
    const fechado = o.anoAtual < anoCorrente || (o.anoAtual === anoCorrente && mi < o.mesAtual)
    const atual = o.anoAtual === anoCorrente && mi === o.mesAtual
    const receitas = o.previsto.totalEntradas[mi]
    const despesas = o.previsto.totalSaidas[mi]
    const real = fechado && o.fechamentoReal ? o.fechamentoReal[mi] : undefined
    const guardou = real !== undefined && o.inicioReal ? real - o.inicioReal[mi] : undefined
    const final = o.previsto.saldoFinal[mi]
    return { mi, fechado, atual, semPlano: receitas === 0 && despesas === 0, real, final,
      sobra: receitas - despesas, guardou, valor: real ?? final, meta: o.objetivos[mi] ?? 0 }
  })
}

/**
 * As três respostas do topo: para onde vou (saldo de dezembro), estou no rumo
 * da meta (meta do ano × o que o plano guarda) e quanto já percorri (o que os
 * meses fechados guardaram de verdade).
 */
export function resumoDoAno(meses: MesDoAno[], previsto: Saldos) {
  const fechados = meses.filter(m => m.guardou !== undefined)
  return {
    saldoFinal: previsto.saldoFinal[11],
    metaAno: meses.reduce((a, m) => a + m.meta, 0),
    planoGuarda: meses.reduce((a, m) => a + m.sobra, 0),
    /** O rumo do ano: o que os meses fechados guardaram de verdade + o que o
     *  plano guarda nos outros. É a régua da meta — o plano dos meses que já
     *  passaram não guarda mais nada. */
    rumo: meses.reduce((a, m) => a + guardaDoMes(m), 0),
    jaGuardou: fechados.length ? fechados.reduce((a, m) => a + (m.guardou ?? 0), 0) : null,
    ultimoFechado: fechados.length ? fechados[fechados.length - 1].mi : -1,
  }
}

/** A barra do gráfico: o real nos meses fechados, o plano nos outros. */
export const guardaDoMes = (m: MesDoAno) => m.guardou ?? m.sobra
