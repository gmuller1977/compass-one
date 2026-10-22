import type { Categoria, PlanoAnoData } from '../context/AppContext'
import { acharLinhaDoPlano } from './linhaDoPlano'
import { comItens, comValor, itensDoMes, novoIdItem } from './itensPlano'
import { ehParcelada } from './recorrencia'
import type { Mes, PontoFluxo, SerieDoPlano } from './simulacaoCompra'

/**
 * "Tenho o valor para quitar o financiamento à vista: quando dá?"
 *
 * Pedido do Guilherme em 22/10/2026: as 16 parcelas do Civic já estão no
 * Planejamento, o banco deu o valor da quitação, e hoje não há saldo. O
 * Simulador sugere o PRIMEIRO mês em que pagar à vista não deixa o saldo
 * negativo, e mostra os meses seguintes sem a parcela.
 *
 * A conta é a da aba Compra (`simulacaoCompra`): a série do saldo previsto
 * sem mudança nenhuma é calculada uma vez, e a quitação é aritmética por
 * cima dela. No mês escolhido sai o valor à vista e, dali em diante, as
 * parcelas do plano VOLTAM para o saldo, porque deixam de sair. Nenhuma
 * projeção nova.
 *
 * Só olha o que o plano cobre, como o resto do Simulador.
 *
 * O valor de quitação digitado é o de HOJE, e ele baixa a cada parcela paga.
 * Usar o mesmo valor mais adiante dizia "custa a mais" para quitar a dívida
 * que fica mais barata. O juro do contrato sai do próprio valor informado
 * (`taxaImplicita`: a taxa que faz as parcelas restantes valerem o valor de
 * hoje, a conta da tabela Price) e o valor de cada mês é o das parcelas que
 * faltam descontadas por ela (`valorParaQuitar`). O banco confirma o exato.
 */

type Planos = Record<number, PlanoAnoData | undefined>
export type ParcelaDaDivida = { ano: number; mes: number; valor: number }

export type DividaNoPlano = {
  cat: Categoria
  /** As parcelas do plano do mês corrente em diante, em ordem. */
  parcelas: ParcelaDaDivida[]
  /** A parcela que mais se repete — a "de R$ 1.149,72". */
  valorMensal: number
  total: number
  ultima: ParcelaDaDivida
  /** Vai até o fim do plano: parece conta de todo mês, não dívida que acaba. */
  vaiAteOFim: boolean
}

const MEIO_CENTAVO = 0.005
const ym = (ano: number, mes: number) => ano * 100 + mes
const ymDe = (m: Mes) => ym(m.ano, m.mes)
const r2 = (v: number) => Math.round(v * 100) / 100

function somaMes(m: Mes, n: number): Mes {
  const t = m.mes + n
  return { ano: m.ano + Math.floor(t / 12), mes: ((t % 12) + 12) % 12 }
}

/** O valor da categoria num mês, lido da linha crua do plano (a que se grava). */
function valorNoPlano(planos: Planos, cat: Categoria, ano: number, mes: number): number {
  const plano = planos[ano]
  if (!plano) return 0
  const i = acharLinhaDoPlano(plano.saidas ?? [], cat)
  if (typeof i !== 'number') return 0
  return plano.saidas[i].v?.[mes] ?? 0
}

export const ROTULO_QUITACAO = 'Quitação à vista'

function quitadaEm(planos: Planos, cat: Categoria, m: Mes): boolean {
  const plano = planos[m.ano]
  const i = plano ? acharLinhaDoPlano(plano.saidas ?? [], cat) : null
  if (!plano || typeof i !== 'number') return false
  return (itensDoMes(plano.saidas[i], m.mes) ?? []).some(it => it.descricao === ROTULO_QUITACAO)
}

/**
 * As dívidas que o plano já carrega: despesa FIXA ou PARCELADA, ativa, com
 * valor do mês corrente em diante. As que acabam antes do fim do plano
 * (financiamento, empréstimo) vêm primeiro; as que vão até o fim (aluguel,
 * escola) ficam depois, porque também podem ser um contrato a quitar.
 */
export function dividasNoPlano(planos: Planos, categorias: Categoria[], de: Mes, fim: Mes | null): DividaNoPlano[] {
  if (!fim) return []
  const total = Math.max(0, (fim.ano - de.ano) * 12 + (fim.mes - de.mes) + 1)
  const out: DividaNoPlano[] = []
  for (const cat of categorias) {
    if (cat.tipo !== 'saida' || !cat.ativa || !(cat.fixa || ehParcelada(cat))) continue
    const parcelas: ParcelaDaDivida[] = []
    for (let k = 0; k < total; k++) {
      const m = somaMes(de, k)
      const v = valorNoPlano(planos, cat, m.ano, m.mes)
      if (v > MEIO_CENTAVO) parcelas.push({ ...m, valor: v })
    }
    if (!parcelas.length) continue
    // Já quitada por aqui: o mês da quitação é o último, e não há o que simular.
    if (parcelas.some(p => quitadaEm(planos, cat, p))) continue
    const contagem = new Map<number, number>()
    for (const p of parcelas) contagem.set(r2(p.valor), (contagem.get(r2(p.valor)) ?? 0) + 1)
    const valorMensal = [...contagem.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0]
    const ultima = parcelas[parcelas.length - 1]
    out.push({
      cat, parcelas, valorMensal, ultima,
      total: r2(parcelas.reduce((t, p) => t + p.valor, 0)),
      vaiAteOFim: ymDe(ultima) === ymDe(fim),
    })
  }
  const rotulo = (d: DividaNoPlano) => `${d.cat.nome} ${d.cat.descricao ?? ''}`
  return out.sort((a, b) => Number(a.vaiAteOFim) - Number(b.vaiAteOFim) || rotulo(a).localeCompare(rotulo(b), 'pt-BR'))
}

/** Meses entre dois meses (b − a). */
const distancia = (a: Mes, b: Mes) => (b.ano - a.ano) * 12 + (b.mes - a.mes)

/** As parcelas que uma quitação em `quando` tira do plano. */
function parcelasRemovidas(divida: DividaNoPlano, quando: Mes, corrente: Mes | undefined, jaPaga: boolean) {
  return divida.parcelas.filter(p => ym(p.ano, p.mes) >= ymDe(quando)
    && !(jaPaga && corrente && ym(p.ano, p.mes) === ymDe(corrente)))
}

/** Valor presente, em `em`, das parcelas, a uma taxa mensal. */
const valorPresente = (ps: ParcelaDaDivida[], em: Mes, taxa: number) =>
  ps.reduce((t, p) => t + p.valor / Math.pow(1 + taxa, distancia(em, p)), 0)

/**
 * A taxa mensal que faz as parcelas que faltam HOJE valerem o valor de
 * quitação informado. Zero quando o valor não dá desconto nenhum.
 */
export function taxaImplicita(restantes: ParcelaDaDivida[], valorHoje: number, hoje: Mes): number {
  if (!restantes.length || valorPresente(restantes, hoje, 0) <= valorHoje) return 0
  let lo = 0, hi = 1
  for (let k = 0; k < 80; k++) {
    const mid = (lo + hi) / 2
    if (valorPresente(restantes, hoje, mid) > valorHoje) lo = mid; else hi = mid
  }
  return (lo + hi) / 2
}

/** Quanto custa quitar em `quando`: as parcelas que saem, descontadas pela taxa. */
export function valorParaQuitar(removidas: ParcelaDaDivida[], quando: Mes, taxa: number): number {
  return r2(valorPresente(removidas, quando, taxa))
}

export type ResultadoQuitacao = {
  quando: Mes
  /** O valor estimado para quitar nesse mês (o digitado, no mês corrente). */
  valor: number
  /** Juro mensal do contrato, tirado do valor de hoje. */
  taxa: number
  fluxo: PontoFluxo[]
  /** As parcelas do plano que deixam de sair. */
  removidas: ParcelaDaDivida[]
  cabe: boolean
  /** O primeiro mês, do pagamento em diante, que fica negativo por causa dele. */
  primeiroAperto: PontoFluxo | null
  /** Parcelas que deixam de sair − valor à vista. Negativo: as parcelas somam menos. */
  economia: number
  /** Saldo no último mês do plano, quitando, menos o de não quitar. */
  noFimDoPlano: number
}

/**
 * Quita num mês. `jaPagaNoMesCorrente`: a parcela deste mês já foi marcada
 * paga — ela está no realizado e não volta; a quitação tira só as seguintes.
 *
 * Cabe quando nenhum mês, do pagamento em diante, fica negativo — ou, se ele
 * já seria negativo sem a quitação, quando ela não o piora. Um aperto que já
 * existia não é culpa da quitação, a mesma regra da aba Compra.
 */
export function simularQuitacao(
  serie: SerieDoPlano, divida: DividaNoPlano, valorHoje: number, quando: Mes, jaPagaNoMesCorrente = false,
): ResultadoQuitacao {
  const corrente = serie.base[0]
  const removidas = parcelasRemovidas(divida, quando, corrente, jaPagaNoMesCorrente)
  const taxa = corrente
    ? taxaImplicita(parcelasRemovidas(divida, corrente, corrente, jaPagaNoMesCorrente), valorHoje, corrente)
    : 0
  const valor = valorParaQuitar(removidas, quando, taxa)
  const movimento = (pt: Mes) => {
    const volta = removidas.filter(p => ym(p.ano, p.mes) === ymDe(pt)).reduce((t, p) => t + p.valor, 0)
    return (ymDe(pt) === ymDe(quando) ? valor : 0) - volta
  }
  let acumulado = 0
  const fluxo = serie.base.map(pt => {
    const parcela = movimento(pt)
    acumulado += parcela
    return { ...pt, parcela, comCompra: pt.semCompra - acumulado }
  })
  const janela = fluxo.filter(pt => ymDe(pt) >= ymDe(quando))
  const primeiroAperto = janela.find(pt => pt.comCompra < -MEIO_CENTAVO && pt.comCompra < pt.semCompra - MEIO_CENTAVO) ?? null
  const fim = fluxo[fluxo.length - 1]
  return {
    quando, valor, taxa, fluxo, removidas, cabe: !primeiroAperto, primeiroAperto,
    economia: r2(removidas.reduce((t, p) => t + p.valor, 0) - valor),
    noFimDoPlano: fim ? fim.comCompra - fim.semCompra : 0,
  }
}

export type MesCandidato = { quando: Mes; cabe: boolean }

/**
 * Os meses em que dá para quitar — do corrente até o da última parcela (depois
 * dela não há o que quitar) — e o primeiro que cabe, que é a sugestão.
 */
export function mesesParaQuitar(
  serie: SerieDoPlano, divida: DividaNoPlano, valor: number, jaPagaNoMesCorrente = false,
): { meses: MesCandidato[]; sugerido: Mes | null } {
  const meses: MesCandidato[] = []
  for (const pt of serie.base) {
    if (ymDe(pt) > ymDe(divida.ultima)) break
    const r = simularQuitacao(serie, divida, valor, pt, jaPagaNoMesCorrente)
    if (!r.removidas.length) continue
    meses.push({ quando: { ano: pt.ano, mes: pt.mes }, cabe: r.cabe })
  }
  return { meses, sugerido: meses.find(m => m.cabe)?.quando ?? null }
}

/**
 * Leva a quitação para o plano: no mês do pagamento a categoria vale o valor
 * à vista (em item, "Quitação à vista", ao lado da parcela se ela já foi
 * paga), e as parcelas seguintes saem. Só a linha daquela categoria muda.
 */
export function quitarNoPlano(planos: Planos, divida: DividaNoPlano, r: ResultadoQuitacao): Planos {
  const valor = r.valor
  const novos: Planos = { ...planos }
  const mudar = (ano: number, fn: (l: PlanoAnoData['saidas'][number]) => PlanoAnoData['saidas'][number]) => {
    const plano = novos[ano]
    if (!plano) return
    const saidas = [...(plano.saidas ?? [])]
    const i = acharLinhaDoPlano(saidas, divida.cat)
    if (typeof i !== 'number') return
    saidas[i] = fn(saidas[i])
    novos[ano] = { ...plano, saidas }
  }
  for (const p of r.removidas) {
    if (ymDe(p) === ymDe(r.quando)) continue
    mudar(p.ano, l => comValor(l, p.mes, 0))
  }
  const { ano, mes } = r.quando
  const parcelaPaga = r.removidas.some(p => ymDe(p) === ymDe(r.quando)) ? 0 : valorNoPlano(planos, divida.cat, ano, mes)
  const quitacao = { id: novoIdItem(), descricao: ROTULO_QUITACAO, valor: r2(valor) }
  mudar(ano, l => comItens(l, [mes], parcelaPaga > MEIO_CENTAVO
    ? [{ id: novoIdItem(), descricao: 'Parcela', valor: r2(parcelaPaga) }, quitacao]
    : [quitacao]))
  return novos
}
