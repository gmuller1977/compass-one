import type { Conta } from '../context/AppContext'

/**
 * O nome que a pessoa reconhece numa lista de contas: o BANCO. O `nome` da
 * conta bancária costuma ser o titular ("Guilherme"), e sozinho num seletor
 * não diz de onde o dinheiro sai. Cartão usa o apelido ("Nubank Gold"), se
 * houver. Quando dois itens dariam o mesmo rótulo (duas contas no Sicredi), o
 * titular ou o apelido vai ao lado para desempatar.
 */
export function nomeDaConta(c: Conta, contas: Conta[] = []): string {
  const base = (x: Conta) => (x.tipo === 'cartao' ? x.apelido || x.banco || x.nome : x.banco || x.nome)
  const rotulo = base(c)
  const repete = contas.some(x => x.id !== c.id && base(x) === rotulo)
  if (!repete) return rotulo
  const extra = c.tipo === 'cartao' ? c.nome : c.apelido || c.nome
  return extra && extra !== rotulo ? `${rotulo} · ${extra}` : rotulo
}
