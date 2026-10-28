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
  /** Aplicado nos investimentos em cada mês: guardado também (28/10/2026). */
  investidoReal?: number[]
  objetivos: number[]
}): MesDoAno[] {
  const anoCorrente = new Date().getFullYear()
  return Array.from({ length: 12 }, (_, mi) => {
    const fechado = o.anoAtual < anoCorrente || (o.anoAtual === anoCorrente && mi < o.mesAtual)
    const atual = o.anoAtual === anoCorrente && mi === o.mesAtual
    const receitas = o.previsto.totalEntradas[mi]
    const despesas = o.previsto.totalSaidas[mi]
    const real = fechado && o.fechamentoReal ? o.fechamentoReal[mi] : undefined
    const guardou = real !== undefined && o.inicioReal ? real - o.inicioReal[mi] + (o.investidoReal?.[mi] ?? 0) : undefined
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
    /** O rumo da meta: o que os meses fechados guardaram de verdade + o que o
     *  plano guarda nos outros — SÓ nos meses que têm meta (13/10/2026: meta
     *  de set–dez contra o ano inteiro contava jan–ago, que não têm meta). */
    rumo: meses.reduce((a, m) => a + (contaNaMeta(m) ? guardaDoMes(m) : 0), 0),
    jaGuardou: fechados.length ? fechados.reduce((a, m) => a + (m.guardou ?? 0), 0) : null,
    ultimoFechado: fechados.length ? fechados[fechados.length - 1].mi : -1,
  }
}

/** O mês entra na comparação com a meta só se tem meta. */
export const contaNaMeta = (m: MesDoAno) => m.meta > 0

/** A barra do gráfico: o real nos meses fechados, o plano nos outros. */
export const guardaDoMes = (m: MesDoAno) => m.guardou ?? m.sobra

/**
 * O aviso da meta no cartão do mês (pedido do Guilherme em 13/10/2026: "dentro
 * do card colocamos a meta, mas precisa ter aviso mostrando se o plano do mês
 * está dentro da meta"). Mês aberto compara o que o PLANO guarda; mês fechado,
 * o que ele guardou de verdade. Sem meta, `null`.
 */
export function situacaoDaMeta(m: MesDoAno): { ok: boolean; aviso: string } | null {
  if (m.meta <= 0) return null
  const ok = m.meta - guardaDoMes(m) <= 0.005
  return { ok, aviso: m.fechado ? (ok ? 'Guardou a meta' : 'Ficou abaixo da meta') : (ok ? 'Dentro da meta' : 'Abaixo da meta') }
}

/**
 * Os números da meta dentro do mês (modal do computador e mês aberto do
 * celular): o que o PLANO guarda e quanto falta para a meta. É ali que se
 * mexe nas categorias para alcançá-la, e os números acompanham a edição.
 */
export function metaContraPlano(meta: number, planoGuarda: number): { ok: boolean; falta: number } | null {
  if (meta <= 0) return null
  const falta = meta - planoGuarda
  return { ok: falta <= 0.005, falta: Math.max(0, falta) }
}

/** Cartão do mês no padrão do Radar (24/10/2026): atenção quando o mês fica
 *  abaixo da meta ou termina negativo; a borda segue. */
export function atencaoDoMes(m: MesDoAno) {
  const s = situacaoDaMeta(m)
  return (s !== null && !s.ok) || m.valor < 0
}

export function bordaDoCartaoMes(m: MesDoAno) {
  if (atencaoDoMes(m)) return `${m.atual ? 2 : 1.5}px solid #b91c1c`
  return m.atual ? '2px solid #1d4ed8' : '1.5px solid #93c5fd'
}
