import type { Categoria } from '../context/AppContext'

function normalizar(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export function buscarCategoria(categorias: Categoria[], nome: string): Categoria | undefined {
  const alvo = normalizar(nome)
  return categorias.find(c => normalizar(c.nome) === alvo)
}

export function iconeCategoria(categorias: Categoria[], nome: string): { icone: string; cor: string } {
  const achada = buscarCategoria(categorias, nome)
  return achada ? { icone: achada.icone, cor: achada.cor } : { icone: '📁', cor: '#94a3b8' }
}

export function ehAutomaticoCategoria(categorias: Categoria[], nome: string): boolean {
  const achada = buscarCategoria(categorias, nome)
  return achada?.tipoMovimento === 'banco' && achada?.formaPagamento === 'automatico'
}

export function ehCartaoCategoria(categorias: Categoria[], nome: string): boolean {
  const achada = buscarCategoria(categorias, nome)
  return achada?.tipoMovimento === 'cartao'
}

/**
 * A fixa da lista de Lançamentos é paga no CARTÃO? Pelo ID da categoria, não
 * pelo nome.
 *
 * Pelo nome, a PRIMEIRA categoria com aquele nome decidia por todas as
 * variantes. Relatado pelo Guilherme em 24/10/2026: "Plano de Saúde · Plano de
 * Saúde" é fixa de banco (PIX no Sicredi), e as irmãs "· Consulta Médica" e
 * "· Exames" são de cartão. A fixa de banco era tratada como de cartão e saía
 * do saldo de Lançamentos: marcar ou desmarcar não mudava nada, e o Sicredi
 * ficava R$ 238,25 acima do banco, enquanto o Radar contava o pagamento.
 *
 * A fatura (`cartao-<id>`) não é categoria e segue pelo nome, como sempre.
 */
export function ehFixaDeCartao(categorias: Categoria[], f: { id: string; categoria: string }): boolean {
  if (f.id.startsWith('cartao-')) return ehCartaoCategoria(categorias, f.categoria)
  const cat = categorias.find(c => c.id === f.id)
  return cat ? cat.tipoMovimento === 'cartao' : ehCartaoCategoria(categorias, f.categoria)
}
