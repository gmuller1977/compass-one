import { useId } from 'react'

/**
 * A logo do Compass One, "Cristal" (27/10/2026, escolha do Guilherme): um C
 * largo e facetado, aberto para a direita, com a agulha da bússola em pé no
 * meio — norte branco, sul ciano, cada metade com luz e sombra. Desenho para
 * fundo azul. É a ÚNICA logo do app: login, menu, topo, apresentação, telas
 * de entrada; `public/icone.svg` e os PNGs (favicon, app instalado, e-mails)
 * são o mesmo desenho dentro do quadrado azul. Fora do azul, `SeloCompass`.
 * `classeAgulha` anima só a agulha (o C fica parado), como nas boas-vindas.
 */
export function LogoCompass({ size = 36, classeAgulha }: { size?: number; classeAgulha?: string }) {
  // sem os ':' do useId, que quebram o url(#…) em alguns navegadores
  const id = 'cx-c' + useId().replace(/[^a-zA-Z0-9]/g, '')
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden
      style={size >= 32 ? { filter: 'drop-shadow(0 0 3px rgba(34,211,238,.6))' } : undefined}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff"/>
          <stop offset=".5" stopColor="#a5f3fc"/>
          <stop offset="1" stopColor="#22d3ee"/>
        </linearGradient>
      </defs>
      <path d="M52.35 19.28 A24 24 0 1 0 52.35 44.72" stroke={`url(#${id})`} strokeWidth="7.5"/>
      <path d="M55.07 17.59 A27.2 27.2 0 1 0 55.07 46.41" stroke="rgba(255,255,255,.9)" strokeWidth=".8"/>
      <path d="M49.64 20.98 A20.8 20.8 0 1 0 49.64 43.02" stroke="rgba(11,20,96,.55)" strokeWidth=".8"/>
      <g className={classeAgulha} style={{ transformOrigin: '32px 32px' }}>
        <polygon points="32,12 36.6,32 32,32" fill="#fff"/>
        <polygon points="32,12 27.4,32 32,32" fill="#bfdbfe"/>
        <polygon points="32,52 27.4,32 32,32" fill="#22d3ee"/>
        <polygon points="32,52 36.6,32 32,32" fill="#0e7490"/>
        <circle cx="32" cy="32" r="2.4" fill="#fff"/>
      </g>
    </svg>
  )
}

/** A logo num quadrado azul, para usar sobre fundo branco. */
export default function SeloCompass({ size = 64 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.24, flexShrink: 0,
      background: 'var(--cx-azul)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: 'inset 0 0 0 1px rgba(34,211,238,.6), 0 8px 20px rgba(15,40,120,.25), 0 0 16px rgba(34,211,238,.2)',
    }}>
      <LogoCompass size={size * 0.66} />
    </div>
  )
}
