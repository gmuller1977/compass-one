const CHAVE = 'compass_layout_lancamentos'

export type LayoutLancamentos = 'classico' | 'extrato'

export function getLayoutPref(): LayoutLancamentos {
  return (localStorage.getItem(CHAVE) as LayoutLancamentos) ?? 'classico'
}

export function setLayoutPref(l: LayoutLancamentos) {
  localStorage.setItem(CHAVE, l)
}