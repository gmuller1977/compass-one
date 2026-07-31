import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
}

function Campo({
  label, tipo = 'text', placeholder, valor, onChange, icone, onKeyDown, erroMsg,
}: {
  label: string; tipo?: string; placeholder: string; valor: string
  onChange: (v: string) => void; icone?: string
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>; erroMsg?: string
}) {
  const [focado, setFocado] = useState(false)
  const [verSenha, setVerSenha] = useState(false)
  const ehSenha = tipo === 'password'
  const tipoReal = ehSenha ? (verSenha ? 'text' : 'password') : tipo
  const temErro = !!erroMsg

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: 'block', fontSize: 10, fontWeight: 700, color: '#1a56db',
        textTransform: 'uppercase', letterSpacing: .5, marginBottom: 5,
      }}>{label}</label>
      <div style={{ position: 'relative' }}>
        {icone && (
          <span style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            fontSize: 16, pointerEvents: 'none',
          }}>{icone}</span>
        )}
        <input
          type={tipoReal}
          placeholder={placeholder}
          value={valor}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocado(true)}
          onBlur={() => setFocado(false)}
          onKeyDown={onKeyDown}
          autoComplete="new-password"
          style={{
            width: '100%',
            padding: `13px ${ehSenha ? '44px' : '14px'} 13px ${icone ? '44px' : '14px'}`,
            border: `1.5px solid ${temErro ? '#dc2626' : focado ? '#1a56db' : '#e2e8f0'}`,
            borderRadius: 13, fontSize: 14, color: '#0f172a',
            background: '#fff', outline: 'none', fontFamily: 'inherit',
            transition: 'all .15s',
            boxShadow: focado ? '0 0 0 3px rgba(26,86,219,.08)' : 'none',
          }}
        />
        {ehSenha && (
          <span
            onClick={() => setVerSenha(v => !v)}
            style={{
              position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
              fontSize: 16, cursor: 'pointer', color: '#94a3b8', padding: 4,
            }}
          >{verSenha ? '🙈' : '👁️'}</span>
        )}
      </div>
      {temErro && (
        <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>{erroMsg}</div>
      )}
    </div>
  )
}

const LogoSVG = ({ size = 36 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="1.2"/>
    <polygon points="10,2.5 11.4,9 10,8 8.6,9" fill="white"/>
    <polygon points="10,17.5 8.6,11 10,12 11.4,11" fill="white" opacity=".5"/>
    <polygon points="17.5,10 11,11.4 12,10 11,8.6" fill="white" opacity=".3"/>
    <polygon points="2.5,10 9,8.6 8,10 9,11.4" fill="white" opacity=".3"/>
    <circle cx="10" cy="10" r="1.5" fill="white"/>
  </svg>
)

export default function RedefinirSenha() {
  const navigate    = useNavigate()
  const isMobile    = useIsMobile()
  const [novaSenha,      setNovaSenha]      = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [carregando,     setCarregando]     = useState(false)
  const [erro,           setErro]           = useState('')
  const [sucesso,        setSucesso]        = useState(false)
  const [linkValido,     setLinkValido]     = useState<boolean | null>(null)

  useEffect(() => {
    // Supabase v2 processa o hash #access_token automaticamente.
    // O evento PASSWORD_RECOVERY confirma que a sessão de redefinição está ativa.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setLinkValido(true)
    })

    // Verifica sessão já estabelecida (caso o evento já tenha disparado)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setLinkValido(true)
    })

    // Após 3s sem sessão, considera link inválido/expirado
    const timer = setTimeout(() => {
      setLinkValido(prev => prev === null ? false : prev)
    }, 3000)

    return () => { subscription.unsubscribe(); clearTimeout(timer) }
  }, [])

  useEffect(() => {
    if (!sucesso) return
    const timer = setTimeout(() => navigate('/login'), 3000)
    return () => clearTimeout(timer)
  }, [sucesso, navigate])

  async function handleSubmit() {
    setErro('')
    if (!novaSenha)                    { setErro('Digite a nova senha'); return }
    if (novaSenha.length < 6)          { setErro('A senha deve ter pelo menos 6 caracteres'); return }
    if (novaSenha !== confirmarSenha)  { setErro('As senhas não coincidem'); return }
    setCarregando(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: novaSenha })
      if (error) throw error
      setSucesso(true)
    } catch (e: unknown) {
      let msg = 'Erro desconhecido'
      if (e instanceof Error && e.message && e.message !== '{}') {
        msg = e.message
      } else if (typeof e === 'object' && e !== null) {
        const obj = e as Record<string, unknown>
        msg = (obj.message ?? obj.error_description ?? obj.msg ?? '') as string
        if (!msg || msg === '{}') msg = 'Erro no servidor. Tente novamente em alguns minutos.'
      }
      setErro(msg)
    } finally {
      setCarregando(false)
    }
  }

  const hero = (compact: boolean) => (
    <div style={{
      background: 'linear-gradient(135deg,#0f2878,#2563eb)',
      padding: compact ? '32px 32px 48px' : '60px 48px',
      flexShrink: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
      ...(compact ? {} : { flex: 1 }),
    }}>
      <div style={{ position:'absolute', width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,.05)', top:-60, right:-60 }}/>
      <div style={{ position:'absolute', width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,.04)', bottom:-40, left:-20 }}/>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14, position:'relative', zIndex:1 }}>
        <div style={{
          width: compact ? 72 : 88, height: compact ? 72 : 88, borderRadius: 22,
          background: 'rgba(255,255,255,.15)', border: '2px solid rgba(255,255,255,.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,.2)',
        }}>
          <LogoSVG size={compact ? 36 : 44}/>
        </div>
        <div>
          <div style={{ color:'#fff', fontSize: compact ? 26 : 30, fontWeight:800, letterSpacing:-.5, textAlign:'center' }}>
            Compass <span style={{ fontWeight:300, opacity:.7 }}>One</span>
          </div>
          <div style={{ color:'rgba(255,255,255,.55)', fontSize:12, fontWeight:500, textAlign:'center', marginTop:4 }}>
            Sua bússola financeira
          </div>
        </div>
      </div>
    </div>
  )

  const form = (
    <div style={{ padding: isMobile ? '28px 24px 24px' : '48px 44px', fontFamily:"-apple-system,'Inter',sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize:20, fontWeight:800, color:'#0f172a', marginBottom:4 }}>Nova senha</div>
        <div style={{ fontSize:13, color:'#64748b' }}>
          {sucesso
            ? 'Senha atualizada com sucesso!'
            : linkValido === false
              ? 'Link inválido ou expirado.'
              : 'Escolha uma senha segura para sua conta.'}
        </div>
      </div>

      {sucesso ? (
        <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:12,
          padding:'20px 16px', textAlign:'center' }}>
          <div style={{ fontSize:32, marginBottom:10 }}>✅</div>
          <div style={{ fontSize:14, fontWeight:700, color:'#15803d', marginBottom:6 }}>Senha redefinida!</div>
          <div style={{ fontSize:13, color:'#166534' }}>
            Você será redirecionado para o login em instantes...
          </div>
        </div>
      ) : linkValido === false ? (
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:32, marginBottom:12 }}>🔗</div>
          <div style={{ fontSize:13, color:'#64748b', marginBottom:20, lineHeight:1.6 }}>
            Este link de redefinição é inválido ou já expirou.<br/>
            Solicite um novo link na tela de login.
          </div>
          <button onClick={() => navigate('/login')} style={{
            padding:'12px 24px', border:'none', borderRadius:12,
            background:'linear-gradient(135deg,#1a56db,#2563eb)',
            color:'#fff', fontSize:14, fontWeight:700,
            cursor:'pointer', fontFamily:'inherit',
          }}>
            Voltar ao login
          </button>
        </div>
      ) : (
        <>
          {erro && (
            <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10,
              padding:'10px 14px', fontSize:13, color:'#dc2626', marginBottom:16, textAlign:'center' }}>
              {erro}
            </div>
          )}

          <Campo label="🔒 Nova senha" tipo="password" placeholder="Mínimo 6 caracteres"
            valor={novaSenha} onChange={setNovaSenha} icone="🔑" />

          <Campo label="🔒 Confirmar senha" tipo="password" placeholder="Repita a nova senha"
            valor={confirmarSenha} onChange={setConfirmarSenha} icone="🔑"
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} />

          <button onClick={handleSubmit} disabled={carregando || linkValido === null} style={{
            width:'100%', padding:'15px', border:'none', borderRadius:14,
            background:'linear-gradient(135deg,#1a56db,#2563eb)',
            color:'#fff', fontSize:16, fontWeight:800,
            cursor: carregando ? 'default' : 'pointer',
            opacity: (carregando || linkValido === null) ? .75 : 1,
            fontFamily:'inherit',
            boxShadow:'0 4px 20px rgba(26,86,219,.35)',
            transition:'all .15s',
            marginTop:4, marginBottom:16,
          }}>
            {carregando ? 'Salvando...' : linkValido === null ? 'Verificando link...' : 'Redefinir senha →'}
          </button>

          <div style={{ textAlign:'center' }}>
            <button onClick={() => navigate('/login')} style={{
              border:'none', background:'transparent', color:'#94a3b8',
              fontSize:12, cursor:'pointer', fontFamily:'inherit',
            }}>
              Voltar ao login
            </button>
          </div>
        </>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <div style={{ height:'100dvh', display:'flex', flexDirection:'column', background:'#f0f4ff', fontFamily:"-apple-system,'Inter',sans-serif", overflow:'hidden' }}>
        {hero(true)}
        <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'none' }}>
          {form}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', fontFamily:"-apple-system,'Inter',sans-serif", background:'#f0f4ff' }}>
      {hero(false)}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px' }}>
        <div style={{ width:'100%', maxWidth:420, background:'#fff', borderRadius:20, boxShadow:'0 8px 40px rgba(0,0,0,.08)', overflow:'hidden' }}>
          {form}
        </div>
      </div>
    </div>
  )
}
