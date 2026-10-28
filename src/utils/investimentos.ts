import type { Conta, DadosMes } from '../context/AppContext'
import { saldoInformado } from './saldoInformado'

/**
 * A tela de Investimentos (28/10/2026, pedido do Guilherme, opção B).
 *
 * Investimento é a conta do tipo `poupanca` ("Investimento" desde 21/10/2026),
 * que fica fora do disponível. Nada aqui é gravado de um jeito novo:
 *
 * - **Aplicar** e **resgatar** são a transferência de Lançamentos: uma linha
 *   'Transferência' no banco e o espelho no investimento. No investimento,
 *   `entrada` é aplicação e `saida` é resgate.
 * - **Atualizar saldo** grava o saldo do app do banco no MESMO campo da caixa
 *   de saldo de Lançamentos (`saldoBanco` + `saldoBancoData` +
 *   `saldoBancoInformado`), no mês de hoje. A diferença entre o que a pessoa
 *   digitou e o que o Compass calculava naquele dia é o RENDIMENTO (ou a
 *   perda). Nenhum rendimento é estimado: só existe o que a pessoa informou.
 *
 * Por que uma passagem própria e não `saldoFinalConta`: lá o informado vale
 * para o mês inteiro (a regra dos bancos no Radar), e aqui uma aplicação feita
 * DEPOIS da atualização, no mesmo mês, tem de somar. O informado vale no dia
 * em que foi digitado; o que vem depois soma por cima.
 */

export type TipoMovimento = 'aplicacao' | 'resgate' | 'rendimento'

export type MovimentoInvestimento = {
  contaId: string
  ano: number
  mes: number
  dia: number
  tipo: TipoMovimento
  /** Aplicação e rendimento positivos; resgate e perda negativos. */
  valor: number
  /** O banco do outro lado ("Sicredi"), ou o texto digitado na transferência. */
  contraparte?: string
  /** Para qual objetivo foi a aplicação ou o resgate ('' = sem objetivo). */
  objetivoId?: string
}

export type FimDoMes = { saldo: number; rendido: number }

/**
 * Um objetivo (a "caixinha"), cadastro da tabela `objetivos_investimento`
 * (migração 022). Fica SEPARADO da conta: a mesma poupança guarda a reserva
 * e a viagem (28/10/2026, escolha do Guilherme). A aplicação e o resgate
 * levam o `objetivoId` no lançamento do investimento; o rendimento se divide
 * pelo saldo de cada objetivo naquele dia.
 */
export type Objetivo = {
  id: string
  contaId: string
  nome: string
  /** Quanto quer juntar; sem valor, o objetivo só separa o dinheiro. */
  valorAlvo?: number
  /** "AAAA-MM", opcional. */
  ate?: string
  /** Quanto do saldo que já estava na conta passou a ser dele, no dia em que foi criado. */
  saldoInicial: number
  /** "AAAA-MM-DD". */
  criadoEm: string
}

/** A parte da conta que é de um objetivo ('' = sem objetivo). */
export type ParteDoObjetivo = {
  objetivoId: string
  saldo: number
  rendido: number
  /** Aplicado − resgatado em cada mês (AAAA*12+mes), para o ritmo. */
  liquidoPorMes: Map<number, number>
}

export type HistoricoInvestimento = {
  conta: Conta
  saldo: number
  /** "AAAA-MM-DD" da última atualização de saldo, se houver. */
  atualizadoEm?: string
  movimentos: MovimentoInvestimento[]
  /** Saldo e rendimento acumulado no fim de cada mês com registro, chave AAAA*12+mes. */
  fimDoMes: Map<number, FimDoMes>
  /** Primeiro mês com registro (AAAA*12+mes). */
  primeiroMes: number
  /** Cada objetivo da conta, e a parte sem objetivo (id ''). */
  partes: ParteDoObjetivo[]
}

export const ehInvestimento = (c: Pick<Conta, 'tipo'>) => c.tipo === 'poupanca'

const idx = (ano: number, mes: number) => ano * 12 + mes
const doisDig = (n: number) => String(n).padStart(2, '0')
export const isoDe = (ano: number, mes: number, dia: number) => `${ano}-${doisDig(mes + 1)}-${doisDig(dia)}`

/** Os meses gravados da conta, em ordem. A chave é `<id>-AAAA-MM`. */
function mesesDaConta(contaId: string, extratoData: Record<string, DadosMes>) {
  const prefixo = contaId + '-'
  const lista: { ano: number; mes: number; dm: DadosMes }[] = []
  for (const [k, dm] of Object.entries(extratoData)) {
    if (!k.startsWith(prefixo)) continue
    const resto = k.slice(prefixo.length)
    const m = /^(\d{4})-(\d{2})$/.exec(resto)
    if (!m) continue
    lista.push({ ano: Number(m[1]), mes: Number(m[2]) - 1, dm })
  }
  return lista.sort((a, b) => idx(a.ano, a.mes) - idx(b.ano, b.mes))
}

/** "← Sicredi" / "→ Sicredi" vira "Sicredi"; texto livre fica como está. */
function contraparteDe(descricao: string | undefined): string | undefined {
  const d = (descricao ?? '').trim()
  if (!d) return undefined
  return d.replace(/^[←→]\s*/, '').trim() || undefined
}

/**
 * Tudo de UM investimento até `hoje` ("AAAA-MM-DD"). Lançamento em dia que
 * ainda não chegou fica de fora (a transferência agendada de Lançamentos).
 */
export function historicoDoInvestimento(
  conta: Conta, extratoData: Record<string, DadosMes>, hoje: string, objetivos: Objetivo[] = [],
): HistoricoInvestimento {
  const meus = objetivos.filter(o => o.contaId === conta.id)
  const partes = new Map<string, ParteDoObjetivo>()
  const parte = (id: string) => {
    let p = partes.get(id)
    if (!p) { p = { objetivoId: id, saldo: 0, rendido: 0, liquidoPorMes: new Map() }; partes.set(id, p) }
    return p
  }
  parte('').saldo = conta.saldoInicial ?? 0
  for (const o of meus) parte(o.id)
  // O objetivo criado separa parte do saldo que estava sem objetivo, no
  // primeiro dia percorrido a partir de quando nasceu (ou no fim, se nasceu
  // depois do último registro). Objetivo apagado: o id some daqui e o
  // dinheiro dele volta para "sem objetivo".
  const separados = new Set<string>()
  const separar = (iso: string | null) => {
    for (const o of meus) {
      if (separados.has(o.id) || (iso !== null && o.criadoEm > iso) || o.criadoEm > hoje) continue
      separados.add(o.id)
      parte('').saldo -= o.saldoInicial; parte(o.id).saldo += o.saldoInicial
    }
  }
  let saldo = conta.saldoInicial ?? 0
  let rendido = 0
  let atualizadoEm: string | undefined
  const movimentos: MovimentoInvestimento[] = []
  const fimDoMes = new Map<number, FimDoMes>()
  const meses = mesesDaConta(conta.id, extratoData)
  const desde = conta.saldoInicialDesde
  let primeiroMes = desde ? idx(Number(desde.slice(0, 4)), Number(desde.slice(5, 7)) - 1) : Infinity

  for (const { ano, mes, dm } of meses) {
    const totalDias = new Date(ano, mes + 1, 0).getDate()
    const informado = saldoInformado(dm)
    // O dia do informado: o da data gravada, se for deste mês; dado antigo,
    // sem data do mês, vale no último dia (como o Radar sempre leu).
    const data = dm.saldoBancoData ?? ''
    const diaInformado = informado === null ? 0
      : data.startsWith(`${ano}-${doisDig(mes + 1)}-`) ? Number(data.slice(8, 10)) : totalDias
    let temRegistro = informado !== null

    for (let d = 1; d <= totalDias; d++) {
      const iso = isoDe(ano, mes, d)
      if (iso > hoje) break
      separar(iso)
      for (const l of dm.lancamentos?.[d] ?? []) {
        if (!(l.valor > 0)) continue
        const v = l.tipo === 'entrada' ? l.valor : -l.valor
        saldo += v
        temRegistro = true
        const oid = (l as { objetivoId?: string }).objetivoId
        const destino = oid && meus.some(o => o.id === oid) ? oid : ''
        const p = parte(destino)
        p.saldo += v
        p.liquidoPorMes.set(idx(ano, mes), (p.liquidoPorMes.get(idx(ano, mes)) ?? 0) + v)
        movimentos.push({ contaId: conta.id, ano, mes, dia: d, tipo: v > 0 ? 'aplicacao' : 'resgate',
          valor: v, contraparte: contraparteDe(l.descricao), objetivoId: destino })
      }
      if (d === diaInformado && informado !== null) {
        const dif = informado - saldo
        if (Math.abs(dif) >= 0.005) {
          movimentos.push({ contaId: conta.id, ano, mes, dia: d, tipo: 'rendimento', valor: dif })
          rendido += dif
          dividirRendimento([...partes.values()], dif)
        }
        saldo = informado
        if (!atualizadoEm || iso > atualizadoEm) atualizadoEm = data.startsWith(`${ano}-`) ? data : iso
      }
    }
    if (temRegistro) {
      primeiroMes = Math.min(primeiroMes, idx(ano, mes))
      fimDoMes.set(idx(ano, mes), { saldo, rendido })
    }
  }
  separar(null)
  return { conta, saldo, atualizadoEm, movimentos, fimDoMes, primeiroMes, partes: [...partes.values()] }
}

/**
 * O rendimento se divide pelo saldo de cada parte naquele dia; parte com
 * saldo zero ou negativo não recebe. Sem nenhuma positiva, vai para a parte
 * sem objetivo. O último centavo fecha na maior, para a soma das partes ser
 * exatamente o saldo da conta.
 */
function dividirRendimento(partes: ParteDoObjetivo[], dif: number) {
  const positivas = partes.filter(p => p.saldo > 0)
  const soma = positivas.reduce((s, p) => s + p.saldo, 0)
  if (!positivas.length || soma <= 0) {
    const semObj = partes.find(p => p.objetivoId === '')!
    semObj.saldo += dif; semObj.rendido += dif
    return
  }
  let distribuido = 0
  const maior = positivas.reduce((a, b) => (b.saldo > a.saldo ? b : a))
  const fatias = positivas.map(p => [p, Math.round(dif * p.saldo / soma * 100) / 100] as const)
  for (const [p, f] of fatias) if (p !== maior) { p.saldo += f; p.rendido += f; distribuido += f }
  const resto = dif - distribuido
  maior.saldo += resto; maior.rendido += resto
}

/**
 * O caminho até o objetivo, só com o que a pessoa aplica: nenhum rendimento
 * entra na conta (o Compass não estima o futuro de um investimento).
 *
 * - Com data: quanto por mês falta aplicar até lá.
 * - Sem data, com ritmo: em que mês chega, no ritmo da média dos últimos 3
 *   meses fechados (aplicado − resgatado).
 */
export type CaminhoDoObjetivo =
  | { tipo: 'chegou' }
  | { tipo: 'porMes'; porMes: number; ate: string; ritmo: number }
  | { tipo: 'chegaEm'; ano: number; mes: number; ritmo: number }
  | { tipo: 'semRitmo' }

export function caminhoDoObjetivo(o: Objetivo, parte: ParteDoObjetivo | undefined, hoje: string): CaminhoDoObjetivo | null {
  if (!o.valorAlvo) return null
  const saldo = parte?.saldo ?? 0
  const falta = o.valorAlvo - saldo
  if (falta <= 0.005) return { tipo: 'chegou' }
  const agora = idx(Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7)) - 1)
  let ultimos = 0
  for (let k = agora - 3; k < agora; k++) ultimos += parte?.liquidoPorMes.get(k) ?? 0
  const ritmo = Math.round(ultimos / 3 * 100) / 100
  if (o.ate) {
    const alvo = idx(Number(o.ate.slice(0, 4)), Number(o.ate.slice(5, 7)) - 1)
    // Conta o mês de hoje: julho, em outubro, são 10 meses (out a jul).
    const meses = Math.max(1, alvo - agora + 1)
    return { tipo: 'porMes', porMes: Math.ceil(falta / meses * 100) / 100, ate: o.ate, ritmo }
  }
  if (ritmo <= 0) return { tipo: 'semRitmo' }
  const meses = Math.ceil(falta / ritmo)
  const k = agora + meses
  return { tipo: 'chegaEm', ano: Math.floor(k / 12), mes: k % 12, ritmo }
}

/** Dias desde a última atualização de saldo; null se nunca foi atualizado. */
export function diasSemAtualizar(atualizadoEm: string | undefined, hoje: string): number | null {
  if (!atualizadoEm) return null
  const a = Date.UTC(+atualizadoEm.slice(0, 4), +atualizadoEm.slice(5, 7) - 1, +atualizadoEm.slice(8, 10))
  const h = Date.UTC(+hoje.slice(0, 4), +hoje.slice(5, 7) - 1, +hoje.slice(8, 10))
  return Math.round((h - a) / 86400000)
}

/** A partir de quantos dias sem atualizar a linha avisa (sem cobrar). */
export const DIAS_PARA_LEMBRAR = 30

export type PontoDaSerie = { ano: number; mes: number; saldo: number; aplicado: number; rendido: number }

export type ResumoDosInvestimentos = {
  itens: HistoricoInvestimento[]
  total: number
  /** No ano de hoje: aplicações (+), resgates (−) e rendimento (±). */
  aplicouNoAno: number
  resgatouNoAno: number
  rendeuNoAno: number
  /** Fim de cada mês, do primeiro registro (no máximo 12 meses) até o mês de hoje. */
  serie: PontoDaSerie[]
}

export function resumoDosInvestimentos(
  contas: Conta[], extratoData: Record<string, DadosMes>, hoje: string, objetivos: Objetivo[] = [],
): ResumoDosInvestimentos {
  const itens = contas.filter(ehInvestimento)
    .map(c => historicoDoInvestimento(c, extratoData, hoje, objetivos))
  const ano = Number(hoje.slice(0, 4))
  const mesHoje = Number(hoje.slice(5, 7)) - 1
  let aplicouNoAno = 0, resgatouNoAno = 0, rendeuNoAno = 0
  for (const it of itens) for (const m of it.movimentos) {
    if (m.ano !== ano) continue
    if (m.tipo === 'aplicacao') aplicouNoAno += m.valor
    else if (m.tipo === 'resgate') resgatouNoAno += m.valor
    else rendeuNoAno += m.valor
  }

  const fim = idx(ano, mesHoje)
  const primeiro = Math.min(...itens.map(i => i.primeiroMes), fim)
  const inicio = Math.max(primeiro, fim - 11)
  const serie: PontoDaSerie[] = []
  for (let k = inicio; k <= fim; k++) {
    let saldo = 0, rendido = 0
    for (const it of itens) {
      // O último mês com registro até k: sem movimento num mês, o saldo segue.
      let ponto: FimDoMes = { saldo: it.conta.saldoInicial ?? 0, rendido: 0 }
      let melhor = -Infinity
      for (const [m, p] of it.fimDoMes) if (m <= k && m > melhor) { melhor = m; ponto = p }
      saldo += ponto.saldo
      rendido += ponto.rendido
    }
    serie.push({ ano: Math.floor(k / 12), mes: k % 12, saldo, aplicado: saldo - rendido, rendido })
  }

  return {
    itens,
    total: itens.reduce((s, i) => s + i.saldo, 0),
    aplicouNoAno, resgatouNoAno, rendeuNoAno, serie,
  }
}

/** Os movimentos de um mês, de todos os investimentos, do mais recente ao mais antigo. */
export function movimentosDoMes(r: ResumoDosInvestimentos, ano: number, mes: number): MovimentoInvestimento[] {
  return r.itens.flatMap(i => i.movimentos)
    .filter(m => m.ano === ano && m.mes === mes)
    .sort((a, b) => b.dia - a.dia || (a.tipo === 'rendimento' ? -1 : 1))
}
