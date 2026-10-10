/**
 * Os meses que mudaram desde a última leitura ou gravação — ver "Gravação por
 * mês" no AppContext.
 *
 * A comparação é por IDENTIDADE, não por conteúdo: toda tela atualiza um mês
 * por spread (`{ ...prev, [key]: novo }`), então o mês alterado ganha objeto
 * novo e os outros continuam sendo os mesmos objetos. Comparar conteúdo
 * custaria serializar o histórico inteiro a cada lançamento.
 *
 * Mês que sumiu de `atual` não entra: apagar mês nunca foi feito por aqui (a
 * gravação antiga também só fazia upsert).
 */
export function mesesAlterados(
  atual: Record<string, unknown>,
  noBanco: Record<string, unknown>,
): string[] {
  return Object.keys(atual).filter(k => atual[k] !== noBanco[k])
}

type MesComLancamentos = { lancamentos?: Record<string, { id?: string }[] | undefined> } | undefined

const idsDoMes = (m: MesComLancamentos) =>
  new Set(Object.values(m?.lancamentos ?? {}).flatMap(itens => (itens ?? []).map(l => l.id)).filter(Boolean))

/**
 * Quantos lançamentos NOVOS uma gravação leva ao banco: ids que estão no mês
 * a gravar e não estavam no mês como o banco tinha. Editar ou apagar não
 * conta. É a medição de uso do plano mobile (tabela uso_lancamentos).
 */
export function lancamentosNovos(
  meses: string[],
  aGravar: Record<string, unknown>,
  noBanco: Record<string, unknown>,
): number {
  let n = 0
  for (const k of meses) {
    const antes = idsDoMes(noBanco[k] as MesComLancamentos)
    for (const id of idsDoMes(aGravar[k] as MesComLancamentos)) if (!antes.has(id)) n++
  }
  return n
}
