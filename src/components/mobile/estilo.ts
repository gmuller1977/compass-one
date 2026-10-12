import { useEffect, useState, type CSSProperties } from 'react'

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

/** A caixa translúcida dentro do topo azul (saldo final previsto, cenários). */
export const pilulaTopo: CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, textAlign: 'left',
  background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.16)', borderRadius: 16,
  padding: '12px 14px', color: '#fff', fontFamily: 'inherit', cursor: 'pointer', minWidth: 0,
}

/** O topo azul dos apps de banco. #1e40af no extremo claro: a regra do CLAUDE.md. */
export const TOPO_AZUL = 'linear-gradient(160deg,#0f2878 0%,#1e40af 100%)'

/** Rótulo sobre o topo azul: 75% de branco dá 5,1 no #1e40af. */
export const ROTULO_TOPO = 'rgba(255,255,255,.75)'
