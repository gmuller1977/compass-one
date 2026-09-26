import { saldoBancosEDinheiro, saldoTotalNoFim, type Deps } from './saldoConta'
import type { SerieDoPlano } from './simulacaoCompra'

/**
 * O saldo de bancos e dinheiro mês a mês, do passado ao fim do plano — o
 * gráfico da tela Início. Pedido do Guilherme em 26/09/2026.
 *
 * Não há conta nova aqui, só três funções que já concordam entre si:
 *
 *   | trecho        | valor                                   | igual a              |
 *   | mês passado   | saldoBancosEDinheiro — o fechamento REAL | "Saldo atual" do Radar naquele mês |
 *   | mês corrente  | saldoTotalNoFim({comoAbertura})          | o cartão "Saldo final previsto" |
 *   | mês futuro    | a série do Simulador (serieBaseDoPlano)  | o aviso de pior mês  |
 *
 * As três se emendam por construção: um mês abre com o fechamento do anterior
 * (saldoRealizadoConta), e o primeiro ponto da série do Simulador é o mesmo
 * saldoTotalNoFim do mês corrente — a prova32 exige ===.
 *
 * O passado começa no PRIMEIRO mês com registro, até `passados` meses atrás.
 * Antes do primeiro registro o saldo é só o de cadastro repetido, e uma linha
 * reta ali leria como "nada mudou" quando a verdade é "não havia app".
 */
export type PontoEvolucao = { ano: number; mes: number; valor: number; real: boolean }

const ym = (ano: number, mes: number) => ano * 100 + mes

function primeiroMesComRegistro(extratoData: Deps['extratoData']): number | null {
  let menor: number | null = null
  for (const [chave, dm] of Object.entries(extratoData)) {
    const m = /-(\d{4})-(\d{2})$/.exec(chave)
    if (!m) continue
    const temAlgo = Object.values(dm?.lancamentos ?? {}).some(ls => ls.length > 0)
      || Object.values(dm?.fixasConsolidadas ?? {}).some(Boolean)
      || !!dm?.saldoBanco
    if (!temAlgo) continue
    const v = ym(Number(m[1]), Number(m[2]) - 1)
    if (menor === null || v < menor) menor = v
  }
  return menor
}

export function evolucaoDoSaldo(
  deps: Deps,
  serie: SerieDoPlano | null,
  hoje: Date = new Date(),
  opts: { passados?: number; futuros?: number } = {},
): PontoEvolucao[] {
  const passados = opts.passados ?? 6
  const futuros = opts.futuros ?? 12
  const ano0 = hoje.getFullYear(), mes0 = hoje.getMonth()
  const primeiro = primeiroMesComRegistro(deps.extratoData)
  const pontos: PontoEvolucao[] = []

  for (let i = passados; i >= 1; i--) {
    const t = mes0 - i
    const ano = ano0 + Math.floor(t / 12), mes = ((t % 12) + 12) % 12
    if (primeiro === null || ym(ano, mes) < primeiro) continue
    pontos.push({ ano, mes, valor: saldoBancosEDinheiro(ano, mes, deps), real: true })
  }

  pontos.push({
    ano: ano0, mes: mes0, real: false,
    valor: saldoTotalNoFim(ano0, mes0, deps, { comoAbertura: true, hoje }).valor,
  })

  // O primeiro ponto da série é o mês corrente, já incluído acima.
  for (const p of (serie?.base ?? []).slice(1, 1 + futuros)) {
    pontos.push({ ano: p.ano, mes: p.mes, valor: p.semCompra, real: false })
  }
  return pontos
}
