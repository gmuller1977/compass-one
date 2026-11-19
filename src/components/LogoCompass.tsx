/** Os traços da logo, num quadro de 64 × 64. */
function desenhoDaLogo(classeAgulha?: string) {
  return (
    <>
      <circle cx="32" cy="32" r="21" stroke="#f5b942" strokeWidth="1.6"/>
      <g className={classeAgulha} style={{ transformOrigin: '32px 32px' }}>
        {[45, 135, 225, 315].map(a => (
          <polygon key={a} points="32,14 34,32 30,32" fill="#f5b942" opacity=".8" transform={`rotate(${a} 32 32)`}/>
        ))}
        <polygon points="32,3 36,28 32,32" fill="#fde68a"/>
        <polygon points="32,3 28,28 32,32" fill="#e0a020"/>
        <polygon points="61,32 36,28 32,32" fill="#fff"/>
        <polygon points="61,32 36,36 32,32" fill="#bfdbfe"/>
        <polygon points="32,61 36,36 32,32" fill="#bfdbfe"/>
        <polygon points="32,61 28,36 32,32" fill="#fff"/>
        <polygon points="3,32 28,28 32,32" fill="#fff"/>
        <polygon points="3,32 28,36 32,32" fill="#bfdbfe"/>
        <circle cx="32" cy="32" r="3" fill="#070c18" stroke="#f5b942" strokeWidth="1.5"/>
      </g>
    </>
  )
}

/**
 * A logo do Compass One, a ROSA DOS VENTOS dourada (19/11/2026, escolha do
 * Guilherme: "1B com círculo", entre os conceitos de
 * `analises/cores-educador/estilo-site/login/`): estrela de quatro pontas com
 * o norte dourado, pontas brancas, diagonais douradas e um anel fino dourado,
 * no dourado da página do Educador. Desenho para fundo escuro. É a ÚNICA logo
 * do app; `public/icone.svg` e os PNGs são o mesmo desenho no quadrado azul.
 * Fora do azul, `SeloCompass`. O nome vai com `NomeCompass`. `classeAgulha`
 * anima só a estrela (o anel fica parado), como nas boas-vindas. Substitui o
 * "Fechado neon" de 27/10/2026.
 */
export function LogoCompass({ size = 36, classeAgulha }: { size?: number; classeAgulha?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden
      style={size >= 32 ? { filter: 'drop-shadow(0 0 4px rgba(245,185,66,.5))' } : undefined}>
      {desenhoDaLogo(classeAgulha)}
    </svg>
  )
}

/**
 * O nome "Compass One" que acompanha a logo, sobre azul: "Compass" branco com
 * um halo dourado, "One" em dourado claro. Herda o tamanho da letra.
 */
export function NomeCompass() {
  return (
    <span style={{ fontWeight: 800, color: '#fff', letterSpacing: '-.3px',
      textShadow: '0 0 .25em rgba(245,185,66,.7), 0 0 .06em rgba(245,185,66,.8)' }}>
      Compass <span style={{ fontWeight: 400, color: '#fcd34d' }}>One</span>
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
      boxShadow: 'inset 0 0 0 1px rgba(245,185,66,.55), 0 8px 20px rgba(15,40,120,.25)',
    }}>
      <LogoCompass size={size * 0.72} />
    </div>
  )
}
