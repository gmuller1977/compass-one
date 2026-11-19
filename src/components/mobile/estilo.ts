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
// Toda abertura do app começa com os valores ESCONDIDOS (19/11/2026,
// Guilherme: "tem que aparecer o saldo oculto; para visualizar, clicar no
// olhinho"). Tocar no olho mostra até o app ser fechado ou a tela travar
// (`ocultarValores`, chamado ao destravar). Fica na memória, não no
// localStorage: guardar a escolha faria o app abrir com o saldo à vista.
const EVENTO = 'compass-ocultar'
let ocultoAgora = true

/** Esconde de novo os valores (tela destravada, app reaberto). */
export function ocultarValores() {
  ocultoAgora = true
  window.dispatchEvent(new Event(EVENTO))
}

export function useValoresOcultos(): [boolean, () => void] {
  const [oculto, setOculto] = useState(ocultoAgora)
  useEffect(() => {
    const h = () => setOculto(ocultoAgora)
    window.addEventListener(EVENTO, h)
    return () => window.removeEventListener(EVENTO, h)
  }, [])
  const alternar = () => {
    ocultoAgora = !ocultoAgora
    setOculto(ocultoAgora)
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
export const TOPO_AZUL = 'var(--cx-azul)'

/** Rótulo sobre o topo azul: 75% de branco dá 5,1 no #1e40af. */
export const ROTULO_TOPO = 'rgba(255,255,255,.75)'

/** Fundo das bolinhas de atalho: branco sobre ele 10,4:1 no pior ponto. */
export const BOLINHA_AZUL = 'var(--cx-azul)'

/**
 * O estilo da página do Educador (19/11/2026, Guilherme: "o site parece mais
 * bonito que o app"). Letra Barlow, títulos em Barlow Condensed, rótulo
 * pequeno em âmbar e ícone em quadrado escuro. Começou pela Início.
 * Medido no branco: tinta #0b2545 15,6 · tinta2 #3d5170 8,4 · âmbar-escuro
 * #9a5b00 5,6. Âmbar claro (#f5b942) só no escuro: 10,5 no #070c18.
 */
export const FONTE_SITE = "'Barlow App', 'Barlow', -apple-system, 'Segoe UI', Roboto, sans-serif"
export const FONTE_TITULO = "'Barlow Condensed', 'Barlow', sans-serif"
export const NOITE = '#070c18'
export const TINTA = '#0b2545'
export const TINTA2 = '#3d5170'
export const AMBAR = '#f5b942'
export const AMBAR_ESCURO = '#9a5b00'
export const BORDA_CLARA = '#c9dcf2'
