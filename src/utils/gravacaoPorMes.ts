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
