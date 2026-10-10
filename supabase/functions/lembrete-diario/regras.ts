// Regras do lembrete diário, sem nada de Deno nem de banco — a prova62 roda
// estas funções direto. Ver index.ts.

/** Uma conta dos próximos dias, como o app a grava em push_inscricoes. */
export type ContaProxima = { data: string; nome: string; valor: number }
export type Mensagem = { titulo: string; corpo: string; url: string }
type LinhaMes = { ano: number; mes: number; dados: { lancamentos?: Record<string, unknown[]> } | null }
type LancFatura = { diaCompra?: number; mesCompra?: number; anoCompra?: number }

/** Hoje e amanhã no fuso de São Paulo, qualquer que seja o fuso do servidor. */
export function diaEmSaoPaulo(agora: Date): { ano: number; mes: number; dia: number; hojeIso: string; amanhaIso: string } {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(agora).split('-').map(Number)
  const [ano, mes1, dia] = partes
  const amanha = new Date(Date.UTC(ano, mes1 - 1, dia + 1))
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { ano, mes: mes1 - 1, dia, hojeIso: iso(new Date(Date.UTC(ano, mes1 - 1, dia))), amanhaIso: iso(amanha) }
}

/**
 * Lançou alguma coisa hoje? No extrato (banco e dinheiro) o dia é a chave do
 * mês corrente. Na fatura a compra pode ter ido para o mês seguinte (depois do
 * fechamento), então vale a data da COMPRA gravada no lançamento.
 * `mes` das linhas é 1–12, como no banco.
 */
export function lancouNoDia(
  extrato: LinhaMes[], fatura: LinhaMes[], hoje: { ano: number; mes: number; dia: number },
): boolean {
  const doMes = (l: LinhaMes) => l.ano === hoje.ano && l.mes === hoje.mes + 1
  if (extrato.some(l => doMes(l) && (l.dados?.lancamentos?.[String(hoje.dia)]?.length ?? 0) > 0)) return true
  return fatura.some(l => Object.values(l.dados?.lancamentos ?? {}).some(itens =>
    (itens as LancFatura[]).some(x => x.diaCompra === hoje.dia && x.mesCompra === hoje.mes && x.anoCompra === hoje.ano)))
}

const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * Uma notificação por aparelho por dia, no máximo. Conta vencendo amanhã vem
 * primeiro — é a que custa juros. Sem conta e já com lançamento hoje, nada:
 * lembrete que não pede nada vira ruído e a pessoa desliga.
 */
export function mensagemDoDia(p: { lancouHoje: boolean; contas: ContaProxima[]; amanhaIso: string }): Mensagem | null {
  const amanha = p.contas.filter(c => c.data === p.amanhaIso)
  if (amanha.length > 0) {
    const total = amanha.reduce((t, c) => t + c.valor, 0)
    const titulo = amanha.length === 1 ? `Amanhã vence: ${amanha[0].nome}` : `Amanhã vencem ${amanha.length} contas`
    const corpo = (amanha.length === 1 ? reais(total) : `${amanha.map(c => c.nome).join(', ')} · ${reais(total)}`)
      + (p.lancouHoje ? '' : ' · e os gastos de hoje ainda não foram lançados')
    return { titulo, corpo, url: '/' }
  }
  if (!p.lancouHoje) return { titulo: 'Lançou seus gastos de hoje?', corpo: 'Leva 5 segundos: toque e lance.', url: '/lancar' }
  return null
}
