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

function traduzirErro(msg: string) {
  if (msg.includes('User already registered'))  return 'Este e-mail já está cadastrado'
  if (msg.includes('already been registered'))  return 'Este e-mail já está cadastrado'
  if (msg.includes('Password should be'))       return 'A senha deve ter pelo menos 8 caracteres'
  if (msg.includes('Unable to validate'))       return 'Erro de validação — tente novamente'
  if (msg.includes('rate limit'))               return 'Muitas tentativas. Aguarde alguns minutos.'
  return msg
}

function forcaSenha(s: string) {
  if (s.length === 0) return { nivel: -1, label: '', cor: '' }
  if (s.length < 8)   return { nivel: 0, label: 'Fraca — mínimo 8 caracteres', cor: '#dc2626' }
  const temLetra  = /[a-zA-Z]/.test(s)
  const temNumero = /[0-9]/.test(s)
  const temEspec  = /[^a-zA-Z0-9]/.test(s)
  if (temLetra && temNumero && temEspec) return { nivel: 2, label: 'Forte', cor: '#16a34a' }
  if (temLetra && temNumero)             return { nivel: 1, label: 'Média — adicione símbolos para fortalecer', cor: '#d97706' }
  return { nivel: 1, label: 'Média', cor: '#d97706' }
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
        display:'block', fontSize:10, fontWeight:700, color:'#1a56db',
        textTransform:'uppercase', letterSpacing:.5, marginBottom:5,
      }}>{label}</label>
      <div style={{ position:'relative' }}>
        {icone && (
          <span style={{
            position:'absolute', left:14, top:'50%', transform:'translateY(-50%)',
            fontSize:16, pointerEvents:'none',
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
          autoComplete={ehSenha ? 'new-password' : tipo === 'email' ? 'email' : 'name'}
          style={{
            width:'100%',
            padding:`13px ${ehSenha ? '44px' : '14px'} 13px ${icone ? '44px' : '14px'}`,
            border:`1.5px solid ${temErro ? '#dc2626' : focado ? '#1a56db' : '#e2e8f0'}`,
            borderRadius:13, fontSize:14, color:'#0f172a',
            background:'#fff', outline:'none', fontFamily:'inherit',
            transition:'all .15s',
            boxShadow: focado ? '0 0 0 3px rgba(26,86,219,.08)' : 'none',
          }}
        />
        {ehSenha && (
          <span
            onClick={() => setVerSenha(v => !v)}
            style={{
              position:'absolute', right:14, top:'50%', transform:'translateY(-50%)',
              fontSize:16, cursor:'pointer', color:'#94a3b8', padding:4,
            }}
          >{verSenha ? '🙈' : '👁️'}</span>
        )}
      </div>
      {temErro && (
        <div style={{ fontSize:11, color:'#dc2626', marginTop:4 }}>{erroMsg}</div>
      )}
    </div>
  )
}

const GoogleSVG = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

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

export default function Cadastro() {
  const navigate      = useNavigate()
  const isMobile      = useIsMobile()
  const [nome,        setNome]        = useState('')
  const [email,       setEmail]       = useState('')
  const [senha,       setSenha]       = useState('')
  const [confirmar,   setConfirmar]   = useState('')
  const [carregando,  setCarregando]  = useState(false)
  const [erro,        setErro]        = useState('')
  const [confirmacaoEnviada, setConfirmacaoEnviada] = useState(false)

  // Validação em tempo real
  const erroEmail    = email.length > 3 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'E-mail inválido' : ''
  const erroConfirmar = confirmar.length > 0 && confirmar !== senha ? 'As senhas não coincidem' : ''
  const forca = forcaSenha(senha)

  async function handleSubmit() {
    setErro('')
    if (!nome)              { setErro('Digite seu nome'); return }
    if (!email)             { setErro('Digite seu e-mail'); return }
    if (erroEmail)          { setErro('E-mail inválido'); return }
    if (senha.length < 8)   { setErro('A senha deve ter pelo menos 8 caracteres'); return }
    if (senha !== confirmar) { setErro('As senhas não coincidem'); return }

    setCarregando(true)
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: { nome },
          emailRedirectTo: window.location.origin + '/',
        },
      })
      if (error) throw error
      setConfirmacaoEnviada(true)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido'
      const traduzido = traduzirErro(msg)
      if (traduzido.includes('já está cadastrado')) {
        setErro(traduzido + ' — ')
      } else {
        setErro(traduzido)
      }
    } finally {
      setCarregando(false)
    }
  }

  async function handleGoogle() {
    setErro('')
    setCarregando(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/' },
    })
    if (error) setErro(traduzirErro(error.message))
    setCarregando(false)
  }

  async function handleReenviar() {
    setCarregando(true)
    await supabase.auth.resend({ type: 'signup', email })
    setCarregando(false)
  }

  const hero = (compact: boolean) => (
    <div style={{
      background: 'linear-gradient(135deg,#0f2878,#2563eb)',
      padding: compact ? '32px 32px 48px' : '60px 48px',
      flexShrink: 0,
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      position:'relative', overflow:'hidden',
      ...(compact ? {} : { flex: 1 }),
    }}>
      <div style={{ position:'absolute', width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,.05)', top:-60, right:-60 }}/>
      <div style={{ position:'absolute', width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,.04)', bottom:-40, left:-20 }}/>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14, position:'relative', zIndex:1 }}>
        <div style={{
          width: compact ? 72 : 88, height: compact ? 72 : 88, borderRadius:22,
          background:'rgba(255,255,255,.15)', border:'2px solid rgba(255,255,255,.25)',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 8px 24px rgba(0,0,0,.2)',
        }}>
          <LogoSVG size={compact ? 36 : 44}/>
        </div>
        <div>
          <div style={{ color:'#fff', fontSize: compact ? 26 : 30, fontWeight:800, letterSpacing:-.5, textAlign:'center' }}>
            Compass <span style={{ fontWeight:300, opacity:.7 }}>One</span>
          </div>
          <div style={{ color:'rgba(255,255,255,.55)', fontSize:12, fontWeight:500, textAlign:'center', marginTop:4 }}>
            Comece a controlar suas finanças
          </div>
        </div>
      </div>
    </div>
  )

  // Tela de confirmação enviada
  if (confirmacaoEnviada) {
    const confirmacao = (
      <div style={{ padding: isMobile ? '40px 24px 32px' : '48px 44px', textAlign:'center' }}>
        <div style={{ fontSize:56, marginBottom:16 }}>📬</div>
        <div style={{ fontSize:22, fontWeight:800, color:'#0f172a', marginBottom:8 }}>
          Verifique seu e-mail!
        </div>
        <div style={{ fontSize:14, color:'#64748b', lineHeight:1.6, marginBottom:8 }}>
          Enviamos um link de confirmação para
        </div>
        <div style={{ fontSize:15, fontWeight:700, color:'#1a56db', marginBottom:28 }}>{email}</div>
        <div style={{ fontSize:13, color:'#94a3b8', marginBottom:28, lineHeight:1.5 }}>
          Clique no link do e-mail para ativar sua conta e começar a usar o Compass One.
        </div>
        <button onClick={handleReenviar} disabled={carregando} style={{
          width:'100%', padding:'13px', border:'1.5px solid #e2e8f0', borderRadius:14,
          background:'#fff', color:'#1a56db', fontSize:14, fontWeight:700,
          cursor:'pointer', fontFamily:'inherit', marginBottom:12, transition:'all .15s',
        }}>
          {carregando ? 'Reenviando...' : 'Reenviar e-mail'}
        </button>
        <button onClick={() => navigate('/login')} style={{
          width:'100%', padding:'13px', border:'none', borderRadius:14,
          background:'linear-gradient(135deg,#1a56db,#2563eb)',
          color:'#fff', fontSize:14, fontWeight:700,
          cursor:'pointer', fontFamily:'inherit',
          boxShadow:'0 4px 20px rgba(26,86,219,.35)',
        }}>
          Voltar ao login
        </button>
      </div>
    )

    if (isMobile) {
      return (
        <div style={{ height:'100dvh', display:'flex', flexDirection:'column', background:'#f0f4ff', fontFamily:"-apple-system,'Inter',sans-serif", overflow:'hidden' }}>
          {hero(true)}
          <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'none' }}>{confirmacao}</div>
        </div>
      )
    }
    return (
      <div style={{ minHeight:'100vh', display:'flex', fontFamily:"-apple-system,'Inter',sans-serif", background:'#f0f4ff' }}>
        {hero(false)}
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px' }}>
          <div style={{ width:'100%', maxWidth:420, background:'#fff', borderRadius:20, boxShadow:'0 8px 40px rgba(0,0,0,.08)' }}>
            {confirmacao}
          </div>
        </div>
      </div>
    )
  }

  const form = (
    <div style={{ padding: isMobile ? '28px 24px 32px' : '48px 44px', fontFamily:"-apple-system,'Inter',sans-serif" }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:20, fontWeight:800, color:'#0f172a', marginBottom:4 }}>Crie sua conta</div>
        <div style={{ fontSize:13, color:'#64748b' }}>Comece agora, é grátis</div>
      </div>

      {erro && (
        <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#dc2626', marginBottom:16 }}>
          {erro}
          {erro.includes('já está cadastrado') && (
            <button onClick={() => navigate('/login')} style={{
              border:'none', background:'transparent', color:'#1a56db',
              fontWeight:700, cursor:'pointer', fontFamily:'inherit', fontSize:13,
            }}>Entrar</button>
          )}
        </div>
      )}

      <Campo label="👤 Nome completo" placeholder="Como quer ser chamado?"
        valor={nome} onChange={setNome} icone="👤" />

      <Campo label="✉️ E-mail" tipo="email" placeholder="seu@email.com"
        valor={email} onChange={setEmail} icone="✉️" erroMsg={erroEmail} />

      <Campo label="🔑 Senha" tipo="password" placeholder="Mínimo 8 caracteres"
        valor={senha} onChange={setSenha} icone="🔑" />

      {senha.length > 0 && forca.nivel >= 0 && (
        <div style={{ marginTop:-8, marginBottom:14 }}>
          <div style={{ display:'flex', gap:4, marginBottom:5 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                flex:1, height:3, borderRadius:2,
                background: i <= forca.nivel ? forca.cor : '#e2e8f0',
                transition:'background .2s',
              }}/>
            ))}
          </div>
          <span style={{ fontSize:11, color:forca.cor, fontWeight:500 }}>{forca.label}</span>
        </div>
      )}

      <Campo label="🔒 Confirmar senha" tipo="password" placeholder="Repita a senha"
        valor={confirmar} onChange={setConfirmar} icone="🔒"
        erroMsg={erroConfirmar}
        onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} />

      <button onClick={handleSubmit} disabled={carregando} style={{
        width:'100%', padding:'15px', border:'none', borderRadius:14,
        background:'linear-gradient(135deg,#1a56db,#2563eb)',
        color:'#fff', fontSize:16, fontWeight:800,
        cursor: carregando ? 'default' : 'pointer',
        opacity: carregando ? .75 : 1,
        fontFamily:'inherit',
        boxShadow:'0 4px 20px rgba(26,86,219,.35)',
        transition:'all .15s',
        display:'flex', alignItems:'center', justifyContent:'center', gap:8,
        marginBottom:16,
      }}>
        {carregando ? 'Criando conta...' : 'Criar minha conta →'}
      </button>

      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
        <div style={{ flex:1, height:1, background:'#e2e8f0' }}/>
        <span style={{ fontSize:11, color:'#94a3b8', fontWeight:600 }}>ou cadastre com</span>
        <div style={{ flex:1, height:1, background:'#e2e8f0' }}/>
      </div>

      <button onClick={handleGoogle} disabled={carregando} style={{
        width:'100%', padding:'13px', border:'1.5px solid #e2e8f0', borderRadius:14,
        background:'#fff', color:'#0f172a', fontSize:14, fontWeight:600,
        cursor:'pointer', fontFamily:'inherit',
        display:'flex', alignItems:'center', justifyContent:'center', gap:10,
        transition:'all .15s', marginBottom:24,
      }}>
        <GoogleSVG/> Cadastrar com Google
      </button>

      <div style={{ textAlign:'center' }}>
        <span style={{ fontSize:13, color:'#64748b' }}>Já tenho conta </span>
        <button onClick={() => navigate('/login')} style={{
          border:'none', background:'transparent', color:'#1a56db',
          fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
        }}>→ Entrar</button>
      </div>

      <div style={{ textAlign:'center', marginTop:20 }}>
        <span style={{ fontSize:10, color:'#94a3b8', lineHeight:1.5 }}>
          Ao criar sua conta você concorda com os{' '}
          <span style={{ color:'#1a56db', fontWeight:600, cursor:'pointer' }}>Termos de Uso</span>
          {' '}e{' '}
          <span style={{ color:'#1a56db', fontWeight:600, cursor:'pointer' }}>Privacidade</span>
        </span>
      </div>
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
