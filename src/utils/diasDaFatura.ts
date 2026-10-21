/**
 * Lançamento gravado num dia que o mês não tem.
 *
 * A fatura grava as parcelas de uma compra no DIA da compra, em cada mês
 * seguinte. Compra no dia 29, 30 ou 31 punha a parcela no "dia 29" de
 * fevereiro, ou no "dia 31" de um mês de 30 dias — e toda tela que percorre
 * o mês do dia 1 ao último não a via: sumia da lista da fatura, do total, do
 * Radar e do "já gastou" do Planejamento. Relatado pelo Guilherme em
 * 21/10/2026: Academia · Gui (compra em 29/09) sem a parcela 5 de 12 na
 * fatura de fevereiro de 2027.
 *
 * O lançamento passa para o último dia do mês: o dinheiro é o mesmo, só o
 * endereço muda. Gravar novo usa `diaNoMes`; o que já está gravado é
 * ajustado ao carregar (`ajustarDiasDoMes`) e volta ao banco na gravação.
 */

export const diasNoMesDe = (ano: number, mes: number) => new Date(ano, mes + 1, 0).getDate()

/** O dia, cortado no último dia do mês (mes de 0 a 11). */
export const diaNoMes = (dia: number, ano: number, mes: number) => Math.min(dia, diasNoMesDe(ano, mes))

type ComLancamentos = { lancamentos?: Record<string, unknown> }

/**
 * O mês com os lançamentos de dias inexistentes no último dia. Devolve o
 * MESMO objeto quando não há nada a mudar — a gravação por mês compara por
 * identidade. `mes` de 0 a 11.
 */
export function ajustarDiasDoMes<T>(dados: T, ano: number, mes: number): T {
  const lancs = (dados as ComLancamentos | null)?.lancamentos
  if (!lancs || typeof lancs !== 'object') return dados
  const ultimo = diasNoMesDe(ano, mes)
  const fora = Object.keys(lancs).filter(k => Number(k) > ultimo && Array.isArray(lancs[k]) && (lancs[k] as unknown[]).length > 0)
  if (fora.length === 0) return dados
  const novo: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(lancs)) if (!(Number(k) > ultimo)) novo[k] = v
  const noUltimo = [...((novo[ultimo] as unknown[] | undefined) ?? [])]
  for (const k of fora.sort((a, b) => Number(a) - Number(b))) noUltimo.push(...(lancs[k] as unknown[]))
  novo[ultimo] = noUltimo
  return { ...(dados as object), lancamentos: novo } as T
}

/**
 * Todos os meses de um mapa de fatura (chave `<conta>-AAAA-MM`, MM de 01 a
 * 12). Devolve o mesmo mapa quando nada muda.
 */
export function ajustarDiasDasFaturas(mapa: Record<string, unknown>): Record<string, unknown> {
  let out: Record<string, unknown> | null = null
  for (const [k, dm] of Object.entries(mapa)) {
    const ano = parseInt(k.slice(-7, -3)), mes = parseInt(k.slice(-2)) - 1
    if (!Number.isFinite(ano) || !Number.isFinite(mes)) continue
    const aj = ajustarDiasDoMes(dm, ano, mes)
    if (aj !== dm) { out ??= { ...mapa }; out[k] = aj }
  }
  return out ?? mapa
}
