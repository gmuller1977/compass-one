/**
 * A logo do Compass One, "Fechado neon" (27/10/2026, escolha do Guilherme):
 * um anel branco fechado, com uma linha ciano por fora e outra por dentro, e
 * a agulha da bússola em pé no meio (norte branco, sul ciano, cada metade com
 * luz e sombra). Desenho para fundo azul. É a ÚNICA logo do app: login, menu,
 * topo, apresentação, telas de entrada; `public/icone.svg` e os PNGs
 * (favicon, app instalado, e-mails) são o mesmo desenho dentro do quadrado
 * azul. Fora do azul, `SeloCompass`. O nome vai com `NomeCompass`.
 * `classeAgulha` anima só a agulha (o anel fica parado), como nas boas-vindas.
 */
export function LogoCompass({ size = 36, classeAgulha }: { size?: number; classeAgulha?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden
      style={size >= 32 ? { filter: 'drop-shadow(0 0 3px rgba(34,211,238,.6))' } : undefined}>
      <circle cx="32" cy="32" r="24" stroke="#fff" strokeWidth="7"/>
      <circle cx="32" cy="32" r="27.8" stroke="#22d3ee" strokeWidth="1.4"/>
      <circle cx="32" cy="32" r="20.2" stroke="#22d3ee" strokeWidth="1.4"/>
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

/**
 * O nome "Compass One" que acompanha a logo, sobre azul: "Compass" branco com
 * o halo ciano do anel, "One" em ciano claro. Herda o tamanho da letra.
 */
export function NomeCompass() {
  return (
    <span style={{ fontWeight: 800, color: '#fff', letterSpacing: '-.3px',
      textShadow: '0 0 .25em rgba(34,211,238,.85), 0 0 .06em rgba(34,211,238,.9)' }}>
      Compass <span style={{ fontWeight: 400, color: '#a5f3fc' }}>One</span>
    </span>
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
