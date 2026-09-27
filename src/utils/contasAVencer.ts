import { detalharPrevisto, type Deps } from './saldoConta'

/**
 * Contas dos próximos dias — a lista da tela Início. Pedido do Guilherme em
 * 26/09/2026 (item 7 do estudo de indicadores).
 *
 * Não é uma contagem própria: são as linhas "Despesas fixas a pagar" e
 * "Fatura do cartão" da memória de cálculo, as mesmas que o saldo final
 * previsto já desconta, filtradas pelo dia de vencimento. Uma segunda lista
 * acabaria discordando da memória — e é a memória que explica o previsto.
 * Por isso também valem as regras de lá, sem repetir nenhuma:
 *
 *   - confirmada (✓ em Lançamentos) não entra;
 *   - fixa sem valor no plano não entra, nem categoria inativa;
 *   - a fatura só entra com valor lançado e sem pagamento confirmado.
 *
 * O dia é o de utils/diaDaFixa, o mesmo que desenha a fixa em Lançamentos.
 *
 * A janela pode atravessar o mês — de 28/09 a 04/10 —, e por isso o detalhe é
 * pedido até o mês do ÚLTIMO dia: detalharPrevisto já acumula do mês corrente
 * até lá.
 *
 * Vencida no mês corrente e não paga é ATRASADA, e aparece primeiro. Mês
 * fechado não entra: lá o app não presume nada, como na projeção.
 */
export type ContaAVencer = {
  id: string
  nome: string
  descricao?: string
  valor: number
  ano: number
  mes: number
  dia: number
  fatura: boolean
  atrasada: boolean
}

export function contasAVencer(deps: Deps, hoje: Date = new Date(), dias = 7): ContaAVencer[] {
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const fim = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + dias - 1)
  return listar(deps, hoje, inicio, fim, true)
}

/**
 * Todas as contas de um mês FUTURO, dia a dia — o calendário da tela Início
 * quando um mês à frente é escolhido. Mesma passagem, janela do mês inteiro.
 * Não traz atrasadas: o que vence antes do mês é assunto do mês corrente.
 */
export function contasDoMes(ano: number, mes: number, deps: Deps, hoje: Date = new Date()): ContaAVencer[] {
  return listar(deps, hoje, new Date(ano, mes, 1), new Date(ano, mes + 1, 0), false)
}

function listar(deps: Deps, hoje: Date, inicio: Date, fim: Date, comAtrasadas: boolean): ContaAVencer[] {
  const p = detalharPrevisto(fim.getFullYear(), fim.getMonth(), deps, { comoAbertura: true, hoje })
  const itens = [
    ...p.fixasSaida.map(i => ({ ...i, fatura: false })),
    ...p.faturas.map(i => ({ ...i, fatura: true })),
  ]
  const out: ContaAVencer[] = []
  for (const i of itens) {
    if (i.dia === undefined || !i.id) continue
    const data = new Date(i.ano, i.mes, i.dia)
    if (data > fim) continue
    const atrasada = data < inicio
    if (atrasada && !comAtrasadas) continue
    out.push({
      id: i.id, nome: i.nome, descricao: i.descricao, valor: i.valor,
      ano: i.ano, mes: i.mes, dia: i.dia, fatura: i.fatura, atrasada,
    })
  }
  const quando = (c: ContaAVencer) => c.ano * 10000 + c.mes * 100 + c.dia
  return out.sort((a, b) => quando(a) - quando(b) || b.valor - a.valor)
}
