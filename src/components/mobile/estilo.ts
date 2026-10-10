import { useEffect, useState } from 'react'

/** Medidas do celular — ver o comentário em ./ui.tsx. */
export const M = {
  fundo: '#f2f5fc',
  raio: 20,
  sombra: '0 2px 14px rgba(15,40,120,.07)',
  corpo: 15,
  titulo: 17,
  legenda: 13,
} as const

export const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// ── Esconder valores (o "olho" dos apps de banco) ─────────────────────
// Preferência do aparelho, não da conta: quem mostra o celular a alguém
// esconde ali. localStorage protegido — sem ele, os valores aparecem.
const CHAVE_OCULTAR = 'compass-ocultar-valores'
const EVENTO = 'compass-ocultar'

function lerOcultar(): boolean {
  try { return localStorage.getItem(CHAVE_OCULTAR) === '1' } catch { return false }
}

export function useValoresOcultos(): [boolean, () => void] {
  const [oculto, setOculto] = useState(lerOcultar)
  useEffect(() => {
    const h = () => setOculto(lerOcultar())
    window.addEventListener(EVENTO, h)
    return () => window.removeEventListener(EVENTO, h)
  }, [])
  const alternar = () => {
    try { localStorage.setItem(CHAVE_OCULTAR, oculto ? '0' : '1') } catch { /* só nesta tela */ }
    setOculto(!oculto)
    window.dispatchEvent(new Event(EVENTO))
  }
  return [oculto, alternar]
}

/** O valor, ou "R$ ••••" com os valores escondidos. */
export const mostrar = (v: number, oculto: boolean) => (oculto ? 'R$ ••••' : fmt(v))
