import type React from 'react'

/**
 * Categoria é obrigatória: com o campo vazio, o Tab não sai dele (28/10/2026,
 * pedido do Guilherme, nos formulários de Banco, Dinheiro e Cartão do
 * computador). A borda fica vermelha por um instante, para dizer onde está o
 * que falta. Shift+Tab volta normalmente.
 */
export function segurarTabSeVazio(e: React.KeyboardEvent<HTMLSelectElement | HTMLInputElement>, valor: string) {
  if (e.key !== 'Tab' || e.shiftKey || valor.trim()) return
  e.preventDefault()
  const el = e.currentTarget
  const antes = { borda: el.style.borderColor, fundo: el.style.background }
  el.style.borderColor = '#dc2626'
  el.style.background = '#fef2f2'
  window.setTimeout(() => { el.style.borderColor = antes.borda; el.style.background = antes.fundo }, 900)
}
