/**
 * A bússola do Compass One, a MESMA da tela de login (`LogoSVG` em Login,
 * Cadastro, RedefinirSenha e LegalPage): traço branco, para fundo azul.
 * Fora das telas de entrada, vai dentro de `SeloCompass`.
 */
export function LogoCompass({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="1.2"/>
      <polygon points="10,2.5 11.4,9 10,8 8.6,9" fill="white"/>
      <polygon points="10,17.5 8.6,11 10,12 11.4,11" fill="white" opacity=".5"/>
      <polygon points="17.5,10 11,11.4 12,10 11,8.6" fill="white" opacity=".3"/>
      <polygon points="2.5,10 9,8.6 8,10 9,11.4" fill="white" opacity=".3"/>
      <circle cx="10" cy="10" r="1.5" fill="white"/>
    </svg>
  )
}

/** A bússola num quadrado azul, para usar sobre fundo branco. */
export default function SeloCompass({ size = 64 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28, flexShrink: 0,
      background: 'var(--cx-azul)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 8px 20px rgba(15,40,120,.25)',
    }}>
      <LogoCompass size={size * 0.5} />
    </div>
  )
}
