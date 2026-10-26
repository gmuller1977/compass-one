import type { Conta } from '../context/AppContext'
import { mesDaFaturaDaCompra } from './lancamentoRapido'
import { ehTransferencia } from '../components/acompanhamento/evolucaoCalcs'
import { ehContaDisponivel } from './saldoConta'

/**
 * O Lançar do celular começa pela CATEGORIA e depois pergunta DÉBITO ou
 * CRÉDITO (26/10/2026, pedido do Guilherme). Antes eram dois quadros de mês,
 * este e o próximo, e o cartão que já fechou contava em dezembro: o mês
 * escolhido não era o mês em que a compra caía.
 *
 *   - Débito: banco ou dinheiro, o gasto é de hoje e conta neste mês.
 *   - Crédito: todos os cartões, cada um com o mês da fatura em que a compra
 *     de hoje cai — o mês em que a fatura VENCE, a mesma regra de
 *     `construirRealizadoMes` (mês da fatura, mais um quando o vencimento cai
 *     no mês seguinte ao fechamento).
 *   - Receita não vai para cartão.
 */
export type MesRef = { ano: number; mes: number }

export const proximoMes = ({ ano, mes }: MesRef): MesRef => (mes === 11 ? { ano: ano + 1, mes: 0 } : { ano, mes: mes + 1 })
const indice = (m: MesRef) => m.ano * 12 + m.mes

/** Em que mês do plano a compra no cartão feita neste dia é contada. */
export function mesDoGastoNoCartao(
  cartao: Pick<Conta, 'diaFechamento' | 'diaVencimento'>, ano: number, mes: number, dia: number,
): MesRef {
  const fatura = mesDaFaturaDaCompra(cartao, ano, mes, dia)
  const venceNoMesSeguinte = (cartao.diaVencimento ?? 1) < (cartao.diaFechamento ?? 1)
  return venceNoMesSeguinte ? proximoMes(fatura) : fatura
}

/** Débito: os bancos do disponível (investimento fica fora) e a carteira. */
export const bancosDoDebito = (contas: Conta[]): Conta[] => contas.filter(ehContaDisponivel)

export type CartaoNoCredito = { cartao: Conta; mes: MesRef }

/** Crédito: cada cartão com o mês da fatura que recebe a compra de hoje. */
export function cartoesDoCredito(contas: Conta[], hoje: Date, tipo: 'saida' | 'entrada'): CartaoNoCredito[] {
  if (tipo === 'entrada') return []
  return contas.filter(c => c.tipo === 'cartao').map(c => ({
    cartao: c, mes: mesDoGastoNoCartao(c, hoje.getFullYear(), hoje.getMonth(), hoje.getDate()),
  }))
}

const chave = (conta: string, { ano, mes }: MesRef) => `${conta}-${ano}-${String(mes + 1).padStart(2, '0')}`

type Lanc = {
  tipo: string; valor: number; id?: string; categoria?: string
  parcelaAtual?: number; diaCompra?: number; mesCompra?: number; anoCompra?: number
}
type MesComLanc = { lancamentos?: Record<string | number, Lanc[]> }

/**
 * Quanto saiu HOJE: as despesas lançadas hoje no banco e no dinheiro, e as
 * compras feitas hoje no cartão (só a 1ª parcela — a compra entra uma vez).
 *
 * Fica de fora o que não é gasto novo: transferência entre contas próprias e
 * o pagamento da fatura no banco (a compra já contou no dia em que foi feita).
 * Antes contava os dois, e no cartão somava as parcelas de compras ANTIGAS
 * que caíam na fatura do mês sob o mesmo número de dia (14/10/2026).
 */
export function gastoDeHoje(
  contas: Conta[], extratoData: Record<string, unknown>, faturaData: Record<string, unknown>, hoje: Date,
): number {
  const atual = { ano: hoje.getFullYear(), mes: hoje.getMonth() }
  const dia = hoje.getDate()
  const cartaoNomes = new Set(contas.filter(c => c.tipo === 'cartao').map(c => c.nome.toLowerCase()))
  let total = 0
  const ext = extratoData as Record<string, MesComLanc>
  for (const id of [...contas.filter(c => c.tipo !== 'cartao').map(c => c.id), 'dinheiro']) {
    for (const l of ext[chave(id, atual)]?.lancamentos?.[dia] ?? []) {
      if (l.tipo !== 'saida') continue
      if (l.id?.startsWith('fatura-') || ehTransferencia(l.categoria ?? '')) continue
      if (cartaoNomes.has((l.categoria ?? '').toLowerCase())) continue
      total += l.valor
    }
  }
  // A compra pode estar na fatura deste mês ou na seguinte (depois do
  // fechamento); olha as duas e decide pela data da COMPRA.
  const fat = faturaData as Record<string, MesComLanc>
  for (const c of contas.filter(c => c.tipo === 'cartao')) {
    const daCompra = mesDaFaturaDaCompra(c, atual.ano, atual.mes, dia)
    for (const m of [atual, proximoMes(atual)]) {
      for (const itens of Object.entries(fat[chave(c.id, m)]?.lancamentos ?? {})) {
        const [diaChave, ls] = itens
        for (const l of ls) {
          if ((l.parcelaAtual ?? 1) > 1) continue
          const ehHoje = l.anoCompra != null && l.mesCompra != null && l.diaCompra != null
            ? l.anoCompra === atual.ano && l.mesCompra === atual.mes && l.diaCompra === dia
            // Sem data de compra gravada: a regra antiga, dia da chave no mês da fatura de hoje.
            : Number(diaChave) === dia && indice(m) === indice(daCompra)
          if (ehHoje) total += l.tipo === 'entrada' ? l.valor : -l.valor
        }
      }
    }
  }
  return total
}
