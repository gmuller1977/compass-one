import { iconeDesenhado } from '../utils/iconeDesenhado'

/** Ícone de categoria ou conta: desenhado quando há desenho, senão o emoji gravado. */
export function IconeCat({ icone, cor, tamanho }: { icone: string | undefined | null; cor?: string; tamanho?: number }) {
  const ti = iconeDesenhado(icone)
  if (!ti) return <span aria-hidden style={tamanho ? { fontSize: tamanho } : undefined}>{icone}</span>
  return <i aria-hidden className={`ti ${ti}`} style={{ color: cor, fontSize: tamanho, lineHeight: 1 }} />
}
