import { useState, type ReactNode } from 'react'
import { LogoCompass, NomeCompass } from '../LogoCompass'
import { OndasTopo, RotuloTopo } from '../mobile/ui'
import { FONTE_SITE, FONTE_TITULO, TINTA, TINTA2, BORDA_CLARA } from '../mobile/estilo'
import { FUNDO_ENTRADA, useCelularEntrada, useTelaBaixa } from './estiloEntrada'

// As telas de entrada (login, cadastro, nova senha) no estilo da página do
// Educador (19/11/2026, pedido do Guilherme): topo escuro com as duas ondas, a
// logo em destaque, letra Barlow, cartão branco e botão em tinta.

export function Separador({ children = 'ou', margem = '18px 0' }: { children?: ReactNode; margem?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: margem }}>
      <div style={{ flex: 1, height: 1, background: BORDA_CLARA }}/>
      <span style={{ fontSize: 12, color: TINTA2, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: BORDA_CLARA }}/>
    </div>
  )
}

export function CampoEntrada({
  label, tipo = 'text', placeholder, valor, onChange, icone, onKeyDown, erroMsg, compacto, autoComplete,
}: {
  label: string; tipo?: string; placeholder: string; valor: string
  onChange: (v: string) => void; icone?: string
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>; erroMsg?: string
  compacto?: boolean; autoComplete?: string
}) {
  const [focado, setFocado] = useState(false)
  const [verSenha, setVerSenha] = useState(false)
  const ehSenha = tipo === 'password'
  const tipoReal = ehSenha ? (verSenha ? 'text' : 'password') : tipo
  const temErro = !!erroMsg

  return (
    <div style={{ marginBottom: compacto ? 10 : 14 }}>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 700, color: TINTA2,
        textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 5,
      }}>{label}</label>
      <div style={{ position: 'relative' }}>
        {icone && (
          <i aria-hidden className={`ti ${icone}`} style={{
            position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)',
            fontSize: 19, pointerEvents: 'none', color: TINTA2,
          }}/>
        )}
        <input
          type={tipoReal}
          aria-label={label}
          placeholder={placeholder}
          value={valor}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocado(true)}
          onBlur={() => setFocado(false)}
          onKeyDown={onKeyDown}
          autoComplete={autoComplete ?? (ehSenha ? 'current-password' : tipo === 'email' ? 'email' : undefined)}
          style={{
            width: '100%',
            padding: `${compacto ? 11 : 13}px ${ehSenha ? '44px' : '14px'} ${compacto ? 11 : 13}px ${icone ? '44px' : '14px'}`,
            border: `1.5px solid ${temErro ? '#b91c1c' : focado ? TINTA : BORDA_CLARA}`,
            borderRadius: 12, fontSize: 16, color: TINTA,
            background: '#fff', outline: 'none', fontFamily: 'inherit',
            transition: 'all .15s',
            boxShadow: focado ? '0 0 0 3px rgba(11,37,69,.10)' : 'none',
          }}
        />
        {ehSenha && (
          <button type="button" aria-label={verSenha ? 'Esconder a senha' : 'Mostrar a senha'}
            onClick={() => setVerSenha(v => !v)}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              border: 'none', background: 'transparent', cursor: 'pointer', color: TINTA2, padding: 6,
              display: 'flex',
            }}
          ><i aria-hidden className={`ti ${verSenha ? 'ti-eye-off' : 'ti-eye'}`} style={{ fontSize: 20 }}/></button>
        )}
      </div>
      {temErro && (
        <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 4 }}>{erroMsg}</div>
      )}
    </div>
  )
}

/** A frase das telas de entrada (19/11/2026, Guilherme). */
export const FRASE_ENTRADA = 'O resultado de amanhã depende das suas escolhas hoje.'

/** A logo em destaque, maior e com um halo dourado atrás, sem o quadrado
 *  ("vamos valorizar a logo", 19/11/2026). */
function Marca({ grande, baixa }: { grande: boolean; baixa: boolean }) {
  const t = grande ? 76 : (baixa ? 44 : 58)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: grande ? 18 : 14, position: 'relative' }}>
      <div style={{ position: 'relative', width: t, height: t, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div aria-hidden style={{ position: 'absolute', inset: -t * .35, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,185,66,.22) 0%, rgba(245,185,66,0) 65%)' }}/>
        <LogoCompass size={t}/>
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{ color: '#fff', fontSize: grande ? 34 : (baixa ? 23 : 27), fontWeight: 800, letterSpacing: -.5, lineHeight: 1 }}>
          <NomeCompass />
        </div>
        {!baixa && (
          <div style={{ color: 'rgba(255,255,255,.75)', fontSize: grande ? 15 : 13, fontWeight: 500, marginTop: 5 }}>
            Sua bússola financeira
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * A moldura das telas de entrada. No celular, o topo baixo (a frase só com
 * altura de sobra, para o login caber sem rolar) e o cartão por cima das
 * ondas; no computador, o painel escuro à esquerda e o cartão à direita.
 */
export function TelaEntrada({ children, frase, apoio, rotulo = 'Planeje · preveja · decida' }: {
  children: ReactNode; frase: string; apoio: string; rotulo?: string
}) {
  const isMobile = useCelularEntrada()
  const baixa = useTelaBaixa(620)
  const celAlto = !useTelaBaixa(760)
  const pcBaixo = useTelaBaixa(780) && !isMobile
  const pcMuitoBaixo = useTelaBaixa(640) && !isMobile

  if (isMobile) {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: FUNDO_ENTRADA, fontFamily: FONTE_SITE, overflow: 'hidden' }}>
        <div style={{
          background: 'var(--cx-azul)', position: 'relative', overflow: 'hidden', flexShrink: 0,
          padding: `calc(env(safe-area-inset-top, 0px) + ${baixa ? 12 : 20}px) 22px ${baixa ? 46 : celAlto ? 66 : 56}px`,
        }}>
          <Marca grande={false} baixa={baixa}/>
          <div style={{ marginTop: baixa ? 10 : 18, position: 'relative' }}>
            <RotuloTopo icone="ti-route">{rotulo}</RotuloTopo>
          </div>
          {celAlto && (
            <h1 style={{ margin: '8px 0 0', fontFamily: FONTE_TITULO, fontSize: 34, fontWeight: 700, lineHeight: 1.02,
              color: '#fff', position: 'relative' }}>{frase}</h1>
          )}
          <OndasTopo fundo={FUNDO_ENTRADA}/>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', padding: baixa ? '0 12px 10px' : '0 14px 14px', marginTop: baixa ? -28 : -40, position: 'relative' }}>
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid var(--cx-borda)', boxShadow: '0 10px 30px rgba(11,37,69,.10)' }}>
            {children}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: FONTE_SITE, background: FUNDO_ENTRADA }}>
      <div style={{
        background: 'var(--cx-azul)', flex: 1, position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: pcBaixo ? '32px 56px 96px' : '48px 64px 120px',
      }}>
        <Marca grande baixa={false}/>
        <div style={{ maxWidth: 520, position: 'relative' }}>
          <RotuloTopo icone="ti-route">{rotulo}</RotuloTopo>
          <h1 style={{ margin: '14px 0 16px', fontFamily: FONTE_TITULO, fontSize: pcBaixo ? 50 : 60, fontWeight: 700,
            lineHeight: 1, color: '#fff' }}>{frase}</h1>
          <p style={{ margin: 0, fontSize: 18, lineHeight: 1.55, color: 'rgba(255,255,255,.85)', maxWidth: 460 }}>{apoio}</p>
        </div>
        <div/>
        <OndasTopo fundo={FUNDO_ENTRADA}/>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: pcMuitoBaixo ? '8px 20px' : pcBaixo ? '16px 20px' : '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: 440, background: '#fff', borderRadius: 20, border: '1px solid var(--cx-borda)', boxShadow: '0 12px 40px rgba(11,37,69,.10)', overflow: 'hidden' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
