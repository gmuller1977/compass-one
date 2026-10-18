/**
 * Transferência entre contas próprias em Lançamentos: banco ↔ banco e banco ↔
 * dinheiro (carteira). Pedido do Guilherme em 18/10/2026: do banco precisa dar
 * para mandar para o dinheiro, e do dinheiro para o banco; banco → dinheiro é
 * "Saque", dinheiro → banco é "Depósito". Não pede categoria: a linha grava a
 * categoria 'Transferência', que o realizado deixa de fora (ehTransferencia),
 * então não vira receita nem despesa em tela nenhuma — só move o saldo das
 * duas contas.
 */

/** A carteira usa a mesma chave de mês das contas: `dinheiro-AAAA-MM`. */
export const CARTEIRA_ID = 'dinheiro'

export type DestinoTransferencia = { id: string; nome: string }

type ContaBanco = { id: string; nome: string; banco?: string }

/** Para onde dá para transferir a partir da conta aberta. */
export function destinosDaTransferencia(bancos: ContaBanco[], origemId: string): DestinoTransferencia[] {
  const lista = bancos
    .filter(c => c.id !== origemId)
    .map(c => ({ id: c.id, nome: c.banco && c.banco !== c.nome ? `${c.nome} — ${c.banco}` : c.nome }))
  return origemId === CARTEIRA_ID ? lista : [...lista, { id: CARTEIRA_ID, nome: 'Dinheiro (carteira)' }]
}

/**
 * O texto das duas linhas. `tipo` é o da conta aberta: 'saida' = o dinheiro
 * sai dela para o destino; 'entrada' = chega nela vindo do destino.
 * Texto digitado pela pessoa vale nas duas.
 */
export function descricoesDaTransferencia(p: {
  origemId: string
  destinoId: string
  tipo: 'saida' | 'entrada'
  nomeOrigem: string
  nomeDestino: string
  texto?: string
}): { primaria: string; espelho: string } {
  const t = p.texto?.trim()
  if (t) return { primaria: t, espelho: t }
  const de = p.tipo === 'saida' ? p.origemId : p.destinoId
  const para = p.tipo === 'saida' ? p.destinoId : p.origemId
  if (de === CARTEIRA_ID || para === CARTEIRA_ID) {
    const rotulo = para === CARTEIRA_ID ? 'Saque' : 'Depósito'
    // Na carteira vai o nome do banco, para saber de onde veio ou para onde foi.
    const banco = p.origemId === CARTEIRA_ID ? p.nomeDestino : p.nomeOrigem
    const naCarteira = banco ? `${rotulo} · ${banco}` : rotulo
    return p.origemId === CARTEIRA_ID
      ? { primaria: naCarteira, espelho: rotulo }
      : { primaria: rotulo, espelho: naCarteira }
  }
  return p.tipo === 'saida'
    ? { primaria: `→ ${p.nomeDestino}`, espelho: `← ${p.nomeOrigem}` }
    : { primaria: `← ${p.nomeDestino}`, espelho: `→ ${p.nomeOrigem}` }
}
