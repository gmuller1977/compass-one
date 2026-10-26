import { useEffect, useState } from 'react'

// Celular × computador pela largura da TELA, não pelo `innerWidth`.
// No Android, depois de girar para a horizontal, o layout de computador
// fica mais largo que a tela; o Chrome afasta o zoom para caber e o
// `innerWidth` passa a medir o conteúdo, não o aparelho. De volta à vertical
// ele continuava ≥ 640 e o app ficava preso no layout de computador
// (26/10/2026, relatado pelo Guilherme). A media query mede a viewport do
// `width=device-width`, que segue o aparelho.
//
// Celular deitado também é celular (mesmo dia, pedido dele: o layout de
// computador numa tela de ~400px de altura não cabe). Tela de toque com
// menos de 500px de altura fica no layout do celular; tablet deitado passa.
function consulta(px: number) {
  return `(max-width: ${px - 0.02}px), (pointer: coarse) and (max-height: 500px)`
}

export function larguraMenorQue(px: number): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia) return window.matchMedia(consulta(px)).matches
  return document.documentElement.clientWidth < px
}

export function useLarguraMenorQue(px: number): boolean {
  const [v, setV] = useState(() => larguraMenorQue(px))
  useEffect(() => {
    const atualizar = () => setV(larguraMenorQue(px))
    const mql = window.matchMedia?.(consulta(px))
    // Ao girar, alguns Android só têm a medida certa um instante depois.
    let t: ReturnType<typeof setTimeout> | undefined
    const aoGirar = () => { atualizar(); clearTimeout(t); t = setTimeout(atualizar, 300) }
    mql?.addEventListener?.('change', atualizar)
    window.addEventListener('resize', atualizar)
    window.addEventListener('orientationchange', aoGirar)
    atualizar()
    return () => {
      mql?.removeEventListener?.('change', atualizar)
      window.removeEventListener('resize', atualizar)
      window.removeEventListener('orientationchange', aoGirar)
      clearTimeout(t)
    }
  }, [px])
  return v
}
