import type { Conta } from '../context/AppContext'

/**
 * Regras do lançamento rápido (Quick Launch, a home do mobile) que precisam
 * concordar com a tela da fatura.
 *
 * Na fatura o sinal é o do CARTÃO, não o da categoria: `entrada` é compra e
 * `saida` é estorno — ver `totalFatura` em saldoConta e `construirRealizadoMes`.
 * O Quick Launch gravava a compra com o tipo da categoria (`saida`), e toda
 * compra lançada por ali entrava como ESTORNO: abatia a fatura e o gasto da
 * categoria em vez de somar.
 */
export function tipoNaFatura(tipoDaCategoria: 'saida' | 'entrada'): 'entrada' | 'saida' {
  return tipoDaCategoria === 'saida' ? 'entrada' : 'saida'
}

/** Compras menos estornos de um mês de fatura. */
export function totalComprasFatura(
  dm: { lancamentos?: Record<number, { tipo: string; valor: number }[]> } | undefined,
): number {
  let total = 0
  for (const itens of Object.values(dm?.lancamentos ?? {}))
    for (const l of itens) total += l.tipo === 'entrada' ? l.valor : -l.valor
  return total
}

/**
 * Em que mês de fatura cai uma compra feita hoje. Depois do dia de fechamento
 * ela vai para a fatura seguinte — a mesma regra de `routeToNext` na
 * FaturaCartao.
 */
export function mesDaFaturaDaCompra(
  cartao: Pick<Conta, 'diaFechamento'>,
  ano: number,
  mes: number,
  dia: number,
): { ano: number; mes: number } {
  if (dia <= (cartao.diaFechamento ?? 31)) return { ano, mes }
  return mes === 11 ? { ano: ano + 1, mes: 0 } : { ano, mes: mes + 1 }
}

type MesFatura = { lancamentos: Record<number, unknown[]>; faturaAtual?: string }

/**
 * A compra no cartão, com parcelas, do jeito que a FaturaCartao grava: a
 * parcela p vai para o mês de fatura da compra + (p − 1), com id
 * `<base>-<p>`, `parcelas` e `parcelaAtual`; só a 1ª nasce consolidada.
 * `valorParcela` é o valor de CADA parcela — no Brasil se informa "12× de
 * R$ 179", não o total (ver o Simulador no CLAUDE.md).
 *
 * Devolve o objeto novo de faturas; só os meses tocados mudam de identidade,
 * e é isso que a gravação por mês usa para saber o que mandar ao banco.
 */
export function lancarNaFatura(
  faturas: Record<string, unknown>,
  p: {
    cartao: Pick<Conta, 'id' | 'diaFechamento'>
    ano: number; mes: number; dia: number
    tipoDaCategoria: 'saida' | 'entrada'
    categoria: string; subCategoria?: string; descricao: string
    valorParcela: number; parcelas: number
    baseId: string
  },
): Record<string, unknown> {
  const n = Math.max(1, Math.floor(p.parcelas))
  const inicio = mesDaFaturaDaCompra(p.cartao, p.ano, p.mes, p.dia)
  const out = { ...faturas }
  for (let i = 1; i <= n; i++) {
    let m = inicio.mes + (i - 1), a = inicio.ano
    while (m > 11) { m -= 12; a++ }
    const k = `${p.cartao.id}-${a}-${String(m + 1).padStart(2, '0')}`
    const dm = (out[k] as MesFatura | undefined) ?? { lancamentos: {}, faturaAtual: '' }
    out[k] = {
      ...dm,
      lancamentos: {
        ...dm.lancamentos,
        [p.dia]: [...(dm.lancamentos[p.dia] ?? []), {
          id: `${p.baseId}-${i}`,
          tipo: tipoNaFatura(p.tipoDaCategoria),
          descricao: p.descricao, categoria: p.categoria,
          ...(p.subCategoria ? { subCategoria: p.subCategoria } : {}),
          valor: p.valorParcela,
          formaPagamento: 'credito', tipoLanc: 'variavel',
          consolidado: i === 1,
          ...(n > 1 ? { parcelas: n, parcelaAtual: i } : {}),
          diaCompra: p.dia, mesCompra: p.mes, anoCompra: p.ano,
        }],
      },
    }
  }
  return out
}

/** Hoje, ontem ou uma data escolhida ("aaaa-mm-dd"), nunca no futuro. */
export function dataDoLancamento(escolha: 'hoje' | 'ontem' | string, hoje: Date = new Date()): Date {
  const h = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  if (escolha === 'hoje') return h
  if (escolha === 'ontem') return new Date(h.getFullYear(), h.getMonth(), h.getDate() - 1)
  const [a, m, d] = escolha.split('-').map(Number)
  const dt = new Date(a, (m ?? 1) - 1, d ?? 1)
  return Number.isNaN(dt.getTime()) || dt > h ? h : dt
}

type MesExtrato = { lancamentos: Record<number, unknown[] | undefined> }

/**
 * Um lançamento no extrato de um banco ou da carteira — o mesmo objeto que o
 * Quick Launch grava (e agora o Norte, ao confirmar). Devolve o mês novo.
 */
export function lancarNoExtrato<T extends MesExtrato>(
  dm: T,
  p: {
    dia: number; tipo: 'saida' | 'entrada'
    categoria: string; subCategoria?: string; descricao: string
    valor: number; formaPagamento: 'debito' | 'pix' | 'transferencia' | 'dinheiro'
    id: string
  },
): T {
  return {
    ...dm,
    lancamentos: {
      ...dm.lancamentos,
      [p.dia]: [...(dm.lancamentos[p.dia] ?? []), {
        id: p.id, tipo: p.tipo, descricao: p.descricao, categoria: p.categoria,
        ...(p.subCategoria ? { subCategoria: p.subCategoria } : {}),
        valor: p.valor, formaPagamento: p.formaPagamento,
        tipoLanc: 'variavel' as const, consolidado: true,
      }],
    },
  }
}
