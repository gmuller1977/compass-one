import type { Categoria, Conta, PlanoAnoData } from '../context/AppContext'
import { mesDaFaturaDaCompra } from './lancamentoRapido'
import { mesDoGastoNoCartao, type MesRef } from './lancarPorMes'
import { valorFixaNoMes } from './valorFixa'
import { diaNoMes } from './diasDaFatura'
import { lancamentoAntesDoSaldo } from './saldoDesde'

/**
 * Conta FIXA paga no cartão já aparece lançada na fatura (05/11/2026, pedido
 * do Guilherme: "muito parecido com o débito automático do banco"; antes só
 * as parcelas apareciam antes de acontecer).
 *
 * - O cartão é o do cadastro (`contaDebitoId` da categoria guarda o cartão
 *   quando ela é de cartão; Configurações o exige). Cadastro antigo sem ele e
 *   com um cartão só usa esse cartão; com vários, não lança.
 * - Entra na fatura EM ABERTO (a que recebe a compra de hoje), como as
 *   parcelas: aparece no começo do ciclo, no dia cadastrado
 *   (`diaVencimento`); sem dia, no dia seguinte ao fechamento — o primeiro
 *   dia da fatura.
 * - O valor é o do plano no mês em que a compra conta (`mesDoGastoNoCartao`,
 *   a regra do realizado). Sem plano, não lança.
 * - Lança UMA vez por categoria e fatura (`fixasLancadas`): apagada pela
 *   pessoa, não volta. Já lançada à mão (mesma categoria e variante na
 *   fatura), só marca.
 * - Fatura passada não se mexe; nem compra antes do valor de fatura
 *   informado no primeiro acesso (`lancamentoAntesDoSaldo`).
 *
 * Nenhum número muda: a previsão já contava a fixa de cartão como
 * `plano − o que está nas faturas do mês` (rateioDoMes em saldoConta); com
 * ela lançada, a falta vira zero e o valor passa a estar na fatura.
 */

type LancFatura = { id: string; tipo: string; categoria?: string; subCategoria?: string; fixaId?: string }
type MesFatura = { lancamentos?: Record<number, LancFatura[] | undefined>; fixasLancadas?: Record<string, boolean>; faturaAtual?: string }

const chaveFatura = (cartaoId: string, m: MesRef) => `${cartaoId}-${m.ano}-${String(m.mes + 1).padStart(2, '0')}`
const anterior = ({ ano, mes }: MesRef): MesRef => (mes === 0 ? { ano: ano - 1, mes: 11 } : { ano, mes: mes - 1 })
const igual = (a: MesRef, b: MesRef) => a.ano === b.ano && a.mes === b.mes

export const ehFixaDeCartaoCadastro = (c: Categoria) =>
  c.fixa && c.tipo === 'saida' && c.tipoMovimento === 'cartao'

/** O cartão em que a fixa é paga, ou undefined se não dá para saber. */
export function cartaoDaFixa(cat: Categoria, contas: Conta[]): Conta | undefined {
  const cartoes = contas.filter(c => c.tipo === 'cartao')
  return cartoes.find(c => c.id === cat.contaDebitoId) ?? (cartoes.length === 1 ? cartoes[0] : undefined)
}

/** O dia da compra dentro do ciclo da fatura `fatura` (mês da chave). */
export function dataNaFatura(
  cat: Pick<Categoria, 'diaVencimento'>, cartao: Pick<Conta, 'diaFechamento'>, fatura: MesRef,
): { ano: number; mes: number; dia: number } {
  const prev = anterior(fatura)
  if (cat.diaVencimento) {
    for (const c of [prev, fatura]) {
      const dia = diaNoMes(cat.diaVencimento, c.ano, c.mes)
      if (igual(mesDaFaturaDaCompra(cartao, c.ano, c.mes, dia), fatura)) return { ...c, dia }
    }
  }
  // Sem dia: o dia seguinte ao fechamento, o primeiro da fatura.
  if (cartao.diaFechamento == null) return { ...fatura, dia: 1 }
  const fecha = Math.min(cartao.diaFechamento, diaNoMes(31, prev.ano, prev.mes))
  const d = new Date(prev.ano, prev.mes, fecha + 1)
  return { ano: d.getFullYear(), mes: d.getMonth(), dia: d.getDate() }
}

export type FixaParaLancar = {
  chave: string
  cat: Categoria
  cartaoId: string
  ano: number; mes: number; dia: number
  valor: number
  /** Já está na fatura (lançada à mão): só grava a marca. */
  soMarcar: boolean
  futura: boolean
}

export function fixasParaLancar(
  d: { contas: Conta[]; categorias: Categoria[]; planos: Record<number, PlanoAnoData | undefined>; faturaData: Record<string, unknown> },
  hoje: Date = new Date(),
): FixaParaLancar[] {
  const out: FixaParaLancar[] = []
  const hojeNum = hoje.getFullYear() * 10000 + hoje.getMonth() * 100 + hoje.getDate()
  for (const cat of d.categorias) {
    if (!cat.ativa || !ehFixaDeCartaoCadastro(cat)) continue
    const cartao = cartaoDaFixa(cat, d.contas)
    if (!cartao) continue
    const fatura = mesDaFaturaDaCompra(cartao, hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
    const chave = chaveFatura(cartao.id, fatura)
    const dm = d.faturaData[chave] as MesFatura | undefined
    if (dm?.fixasLancadas?.[cat.id]) continue
    const data = dataNaFatura(cat, cartao, fatura)
    if (lancamentoAntesDoSaldo(cartao, data.ano, data.mes, data.dia)) continue
    const conta = mesDoGastoNoCartao(cartao, data.ano, data.mes, data.dia)
    const valor = valorFixaNoMes(cat, d.planos[conta.ano], conta.mes, d.categorias)
    if (!(valor > 0)) continue
    const variante = (cat.descricao ?? '').trim()
    const jaTem = Object.values(dm?.lancamentos ?? {}).some(lista => (lista ?? []).some(l =>
      l.fixaId === cat.id
      || (l.tipo === 'entrada' && l.categoria === cat.nome && (l.subCategoria ?? '').trim() === variante)))
    out.push({
      chave, cat, cartaoId: cartao.id, ...data, valor, soMarcar: jaTem,
      futura: data.ano * 10000 + data.mes * 100 + data.dia > hojeNum,
    })
  }
  return out
}

/** Grava um item de `fixasParaLancar` no mês de fatura. Devolve o mês novo. */
export function lancarFixaNaFatura<T extends MesFatura>(dm: T | undefined, f: FixaParaLancar): T {
  const base = (dm ?? { lancamentos: {}, faturaAtual: '' }) as T
  const marcado = { ...base, fixasLancadas: { ...base.fixasLancadas, [f.cat.id]: true } }
  if (f.soMarcar) return marcado
  const [a, m] = f.chave.slice(-7).split('-').map(Number)
  const dia = diaNoMes(f.dia, a, m - 1)
  const lanc = {
    id: `fixa-${f.cat.id}-${f.chave.slice(-7)}`,
    tipo: 'entrada',
    descricao: f.cat.nome, categoria: f.cat.nome,
    ...(f.cat.descricao?.trim() ? { subCategoria: f.cat.descricao.trim() } : {}),
    valor: f.valor, formaPagamento: 'credito', tipoLanc: 'fixa',
    consolidado: !f.futura,
    diaCompra: f.dia, mesCompra: f.mes, anoCompra: f.ano,
    fixaId: f.cat.id,
  }
  return {
    ...marcado,
    lancamentos: { ...base.lancamentos, [dia]: [...(base.lancamentos?.[dia] ?? []), lanc] },
  }
}

/** A frase do aviso ao conferir uma fixa lançada sem dia cadastrado. */
export function avisoFixaSemDia(l: { fixaId?: string }, categorias: Categoria[]): string | null {
  if (!l.fixaId) return null
  const cat = categorias.find(c => c.id === l.fixaId)
  if (!cat || cat.diaVencimento) return null
  return `${cat.nome} não tem dia cadastrado: entrou no dia seguinte ao fechamento. Se a data for outra, mude a data da compra e o dia fica gravado.`
}

/**
 * Lançamentos fixos PROGRAMADOS (05/11/2026, pedidos do Guilherme: "não devem
 * somar no lançado no Compass" e "somente devem somar quando forem
 * conferidas, porque no extrato real elas ainda não aparecem; mesmo com dia").
 * A fixa lançada sozinha (`fixaId`) e ainda SEM a bolinha de conferida fica
 * fora da lista e dos totais da fatura (lançado, conferido), num bloco à
 * parte; conferida, entra como qualquer compra. Só a TELA separa: o
 * lançamento segue gravado e a previsão não muda (ela já conta
 * `plano − o que está nas faturas`).
 */
export function ehFixaProgramada(l: { id: string; fixaId?: string }, conferidos?: Record<string, boolean>): boolean {
  return !!l.fixaId && conferidos?.[l.id] !== true
}

/** O mês da fatura sem as fixas programadas, e a lista delas (por data da compra). */
export function separarProgramadas<L extends { id: string; fixaId?: string; diaCompra?: number; mesCompra?: number; anoCompra?: number }, T extends { lancamentos: Record<number, L[] | undefined>; conferidos?: Record<string, boolean> }>(
  dm: T,
): { visivel: T; programadas: { dia: number; l: L }[] } {
  const programadas: { dia: number; l: L }[] = []
  let mudou = false
  const lancamentos: Record<number, L[]> = {}
  for (const [k, lista] of Object.entries(dm.lancamentos ?? {})) {
    const dia = Number(k)
    const fica: L[] = []
    for (const l of lista ?? []) {
      if (ehFixaProgramada(l, dm.conferidos)) { programadas.push({ dia, l }); mudou = true }
      else fica.push(l)
    }
    lancamentos[dia] = fica
  }
  const data = (x: { dia: number; l: L }) => (x.l.anoCompra ?? 0) * 10000 + (x.l.mesCompra ?? 0) * 100 + (x.l.diaCompra ?? x.dia)
  programadas.sort((a, b) => data(a) - data(b))
  return { visivel: mudou ? { ...dm, lancamentos } : dm, programadas }
}

/** "Fixa" ou "Variável", pelo cadastro da categoria (a etiqueta da compra). */
export function fixaOuVariavel(
  l: { fixaId?: string; categoria: string; subCategoria?: string },
  categorias: Categoria[],
): 'Fixa' | 'Variável' | null {
  if (l.fixaId) return 'Fixa'
  const variante = (l.subCategoria ?? '').trim()
  const mesmas = categorias.filter(c => c.nome === l.categoria)
  // Com dois cadastros de mesmo nome e variante (um de banco e um de cartão),
  // vale o de cartão: é a fatura. Se ainda assim discordam, não diz nada
  // (06/11/2026: pegar o primeiro mostrava "Fixa" numa compra variável).
  const exatas = mesmas.filter(c => (c.descricao ?? '').trim() === variante)
  const doCartao = exatas.filter(c => c.tipoMovimento === 'cartao')
  const candidatas = doCartao.length ? doCartao : exatas.length ? exatas : (mesmas.length === 1 ? mesmas : [])
  if (!candidatas.length) return null
  const fixa = candidatas[0].fixa
  if (candidatas.some(c => c.fixa !== fixa)) return null
  return fixa ? 'Fixa' : 'Variável'
}
