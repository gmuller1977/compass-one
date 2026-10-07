/**
 * Recorrência da conta FIXA — decidida com o Guilherme em 06–07/10/2026.
 *
 * Uma fixa nem sempre é fixa o ano inteiro. No cadastro ela é:
 *   - ANUAL: repete todo mês. `recorrenciaFim` (AAAA-MM), opcional, diz
 *     quando ela acaba — o financiamento até março/2029. Vazio = sem fim.
 *   - TEMPORÁRIA: um período curto (IPVA, IPTU, seguro). O período é
 *     perguntado ao planejar: "Parcelas fixas até qual mês?".
 *
 * O PLANO continua sendo a verdade: Lançamentos, contas a vencer, previsão e
 * Radar seguem o valor de cada mês, e mês sem valor é conta que não aparece.
 * Estas regras só decidem ONDE o valor digitado é repetido.
 */
export type MesRef = { ano: number; mes: number }

const ym = (m: MesRef) => m.ano * 12 + m.mes
const deYm = (n: number): MesRef => ({ ano: Math.floor(n / 12), mes: n % 12 })

/** "2029-03" → { ano: 2029, mes: 2 }. Inválido ou vazio → null. */
export function lerFim(fim?: string | null): MesRef | null {
  const m = fim ? /^(\d{4})-(\d{2})$/.exec(fim) : null
  if (!m) return null
  const mes = Number(m[2]) - 1
  return mes >= 0 && mes <= 11 ? { ano: Number(m[1]), mes } : null
}

/**
 * Para onde a fixa ANUAL repete o valor digitado em (ano, mes): os meses
 * seguintes até dezembro. Com fim, para no fim — e, se o fim cai num ano
 * seguinte, continua nos anos que JÁ têm plano (o app não cria plano de ano
 * sozinho). Sem fim, para em dezembro do próprio ano.
 */
export function mesesParaRepetir(ano: number, mes: number, fim: string | undefined, anosComPlano: number[]): MesRef[] {
  const f = lerFim(fim)
  const inicio = ano * 12 + mes + 1
  const limite = f ? ym(f) : ano * 12 + 11
  const out: MesRef[] = []
  for (let n = inicio; n <= limite; n++) {
    const m = deYm(n)
    if (m.ano !== ano && !anosComPlano.includes(m.ano)) continue
    out.push(m)
  }
  return out
}

/**
 * Os meses de destino com um valor DIFERENTE do que o mês digitado tinha antes
 * — o reajuste de julho, um mês maior. A pergunta mostra cada um e não os
 * altera sem que se marque: "Em julho o valor planejado é R$ 520, diferente
 * dos outros meses. Alterar também?".
 *
 * Mês vazio não é divergente (é o caso comum de planejar pela primeira vez);
 * mês que já está no valor novo também não.
 */
export function divergentes(
  valores: { m: MesRef; v: number }[], anterior: number, novo: number,
): { m: MesRef; v: number }[] {
  const igual = (a: number, b: number) => Math.abs(a - b) < 0.005
  return valores.filter(({ v }) => v > 0.005 && !igual(v, anterior) && !igual(v, novo))
}

/** O fim cai antes do mês? Para cortar a cópia do ano e o assistente. */
export function depoisDoFim(ano: number, mes: number, fim?: string | null): boolean {
  const f = lerFim(fim)
  return !!f && ano * 12 + mes > ym(f)
}

/** Os 12 valores de um ano, zerados depois do fim da fixa anual. */
export function cortarNoFim(v: number[], ano: number, fim?: string | null): number[] {
  return v.map((x, mes) => (depoisDoFim(ano, mes, fim) ? 0 : x))
}

/** Rótulo da parcela da temporária: "IPVA · 2 de 3". */
export const rotuloParcela = (nome: string, k: number, n: number) => `${nome} · ${k} de ${n}`
