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
