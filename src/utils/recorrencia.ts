/**
 * Recorrência da categoria — decidida com o Guilherme em 06–08/10/2026. Vale
 * para qualquer categoria, fixa ou variável. No cadastro ela é:
 *   - ANUAL: repete todo mês. Ao digitar um valor no Planejamento, ele se
 *     repete sozinho até dezembro. (Houve um "Até quando?" para o fim de um
 *     financiamento; saiu em 08/10/2026, a pedido dele.)
 *   - TEMPORÁRIA: um período curto (IPVA, IPTU, seguro). Ao planejar, o app
 *     pergunta quantas parcelas.
 *
 * O PLANO continua sendo a verdade: Lançamentos, contas a vencer, previsão e
 * Radar seguem o valor de cada mês, e mês sem valor é conta que não aparece.
 * Estas regras só decidem ONDE o valor digitado é repetido.
 */
export type MesRef = { ano: number; mes: number }

const ym = (m: MesRef) => m.ano * 12 + m.mes

/** Para onde a ANUAL repete o valor digitado em (ano, mes): os meses seguintes até dezembro. */
export function mesesParaRepetir(ano: number, mes: number): MesRef[] {
  return Array.from({ length: 11 - mes }, (_, i) => ({ ano, mes: mes + 1 + i }))
}

/**
 * Os meses de destino com um valor DIFERENTE do que o mês digitado tinha antes
 * — o reajuste de julho, um mês maior. A pergunta mostra cada um e não os
 * altera sem que se marque.
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

/** Rótulo da parcela da temporária: "IPVA · 2 de 3". */
export const rotuloParcela = (nome: string, k: number, n: number) => `${nome} · ${k} de ${n}`

/**
 * Anual: o valor é repetido SOZINHO até dezembro — pedido do Guilherme em
 * 08/10/2026, para qualquer categoria, fixa ou variável. Esta função diz onde:
 *   - `livres`: recebem o valor na hora — mês vazio ou com o valor de antes;
 *   - `diferentes`: ficam como estão e entram numa pergunta — mês com outro
 *     valor (o reajuste de julho) ou detalhado em itens (a parcela do
 *     Simulador, o "Gasto normal" do ajuste). Gravar só o valor apagaria o
 *     detalhe sem ninguém ver.
 * Mês que já está no valor novo fica de fora dos dois.
 */
export function separarDestinos(
  destinos: { m: MesRef; v: number; itens: boolean }[], anterior: number, novo: number,
): { livres: MesRef[]; diferentes: { m: MesRef; atual: number; itens: boolean }[] } {
  const igual = (a: number, b: number) => Math.abs(a - b) < 0.005
  const div = new Set(divergentes(destinos, anterior, novo).map(d => ym(d.m)))
  const livres: MesRef[] = []
  const diferentes: { m: MesRef; atual: number; itens: boolean }[] = []
  for (const d of destinos) {
    if (igual(d.v, novo)) continue
    if (d.itens || div.has(ym(d.m))) diferentes.push({ m: d.m, atual: d.v, itens: d.itens })
    else livres.push(d.m)
  }
  return { livres, diferentes }
}

const NOMES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']

/** "novembro", ou "janeiro de 2027" quando o mês é de outro ano. */
export const nomeDoMes = (m: MesRef, ano: number) => (m.ano !== ano ? `${NOMES[m.mes]} de ${m.ano}` : NOMES[m.mes])
