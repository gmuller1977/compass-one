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

const COR = {
  azul: '#1a56db',
  azulEscuro: '#0f2878',
  azulMedio: '#2563eb',
  azulClaro: '#bfdbfe',
  fundo: '#f8faff',
  branco: '#ffffff',
  texto: '#0f172a',
  textoSuave: '#64748b',
  borda: '#e2e8f0',
  inputFundo: '#f1f5f9',
}

function Campo({ label, tipo = 'text', placeholder, valor, onChange, onKeyDown }: {
  label: string; tipo?: string; placeholder: string
  valor: string; onChange: (v: string) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}) {
  const [focado, setFocado] = useState(false)
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: COR.texto, marginBottom: 5 }}>
        {label}
      </label>
      <input
        type={tipo}
        placeholder={placeholder}
        value={valor}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => setFocado(true)}
        onBlur={() => setFocado(false)}
        style={{
          width: '100%', padding: '10px 14px', borderRadius: 9,
          border: `1.5px solid ${focado ? COR.azul : COR.borda}`,
          background: focado ? COR.branco : COR.inputFundo,
          fontSize: 14, color: COR.texto, outline: 'none',
          transition: 'all 0.15s', fontFamily: 'inherit',
          boxShadow: focado ? `0 0 0 3px rgba(26,86,219,0.08)` : 'none',
        }}
      />
    </div>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [aba, setAba] = useState<'login' | 'cadastro'>('login')
  const [form, setForm] = useState({ nome: '', email: '', senha: '', confirmar: '' })
  const [carregando, setCarregando] = useState(false)
  const [sucesso,    setSucesso]    = useState('')
  const [erro,       setErro]       = useState('')

  const set = (campo: keyof typeof form) => (valor: string) =>
    setForm(f => ({ ...f, [campo]: valor }))

  const isLogin = aba === 'login'

  function forcaSenha(s: string): { nivel: 0 | 1 | 2; label: string; cor: string } {
    if (s.length === 0) return { nivel: 0, label: '', cor: '' }
    const temLetra  = /[a-zA-Z]/.test(s)
    const temNumero = /[0-9]/.test(s)
    const temEspec  = /[^a-zA-Z0-9]/.test(s)
    if (s.length < 6)                          return { nivel: 0, label: 'Fraca — mínimo 6 caracteres', cor: '#dc2626' }
    if (s.length >= 8 && temLetra && temNumero && temEspec) return { nivel: 2, label: 'Forte',  cor: '#15803d' }
    if (temLetra && temNumero)                 return { nivel: 2, label: 'Forte',  cor: '#15803d' }
    if (s.length >= 8)                         return { nivel: 1, label: 'Média',  cor: '#d97706' }
    return { nivel: 1, label: 'Média — adicione números para fortalecer', cor: '#d97706' }
  }

  function traduzirErro(msg: string) {
    if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos'
    if (msg.includes('Email not confirmed'))        return 'Confirme seu e-mail antes de entrar'
    if (msg.includes('User already registered'))    return 'Este e-mail já está cadastrado'
    if (msg.includes('Password should be'))         return 'A senha deve ter pelo menos 6 caracteres'
    if (msg.includes('Unable to validate'))         return 'Erro de validação — tente novamente'
    if (msg.includes('coincidem'))                  return msg
    return msg
  }

  async function handleGoogle() {
    setCarregando(true)
    setErro('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/dashboard' },
    })
    if (error) setErro(traduzirErro(error.message))
    setCarregando(false)
  }

  async function handleSubmit() {
    setCarregando(true)
    setErro('')
    setSucesso('')
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.senha,
        })
        if (error) throw error
        navigate('/dashboard')
      } else {
        if (form.senha !== form.confirmar) throw new Error('As senhas não coincidem')
        if (form.senha.length < 6) throw new Error('Password should be at least 6 characters')
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.senha,
          options: { data: { nome: form.nome } },
        })
        if (error) throw error
        setSucesso('✓ Conta criada! Verifique seu e-mail para confirmar o cadastro.')
        setAba('login')
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido'
      setErro(traduzirErro(msg))
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      minHeight: '100vh',
      fontFamily: "-apple-system,'Inter',sans-serif",
      background: COR.fundo,
    }}>

      {/* ── PAINEL ESQUERDO (desktop) / HEADER COMPACTO (mobile) ── */}
      {isMobile ? (
        <div style={{
          background: `linear-gradient(145deg, ${COR.azulEscuro} 0%, ${COR.azul} 55%, ${COR.azulMedio} 100%)`,
          padding: '28px 24px 32px',
          position: 'relative', overflow: 'hidden', flexShrink: 0,
        }}>
          {/* Anéis decorativos */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', border: '30px solid rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'absolute', bottom: -50, left: -50, width: 180, height: 180, borderRadius: '50%', border: '35px solid rgba(255,255,255,0.04)' }} />
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, position: 'relative', zIndex: 1, marginBottom: 16 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="1.5" />
                <polygon points="10,3 11.2,9.4 10,8.5 8.8,9.4" fill="white" />
                <polygon points="10,17 8.8,10.6 10,11.5 11.2,10.6" fill="white" opacity=".5" />
              </svg>
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: -0.3 }}>
              Compass <span style={{ fontWeight: 300, opacity: 0.75 }}>One</span>
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', margin: 0, position: 'relative', zIndex: 1, lineHeight: 1.6 }}>
            Navegue suas finanças com clareza.
          </p>
        </div>
      ) : (
        <div style={{
          width: '42%', minWidth: 300,
          background: `linear-gradient(145deg, ${COR.azulEscuro} 0%, ${COR.azul} 55%, ${COR.azulMedio} 100%)`,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 40px', position: 'relative', overflow: 'hidden',
        }}>
          {/* Anéis decorativos */}
          <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', border: '40px solid rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'absolute', bottom: -80, left: -80, width: 280, height: 280, borderRadius: '50%', border: '50px solid rgba(255,255,255,0.04)' }} />

          {/* Rosa dos ventos */}
          <svg style={{ position: 'absolute', bottom: 90, right: 30, opacity: 0.1 }} width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="56" fill="none" stroke="white" strokeWidth="1.5" />
            <circle cx="60" cy="60" r="40" fill="none" stroke="white" strokeWidth="1" />
            <polygon points="60,10 66,58 60,52 54,58" fill="white" />
            <polygon points="60,110 54,62 60,68 66,62" fill="white" opacity=".4" />
            <polygon points="10,60 58,54 52,60 58,66" fill="white" opacity=".4" />
            <polygon points="110,60 62,66 68,60 62,54" fill="white" opacity=".4" />
            <circle cx="60" cy="60" r="4" fill="white" />
          </svg>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="1.5" />
                <polygon points="10,3 11.2,9.4 10,8.5 8.8,9.4" fill="white" />
                <polygon points="10,17 8.8,10.6 10,11.5 11.2,10.6" fill="white" opacity=".5" />
              </svg>
            </div>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: -0.3 }}>
              Compass <span style={{ fontWeight: 300, opacity: 0.75 }}>One</span>
            </span>
          </div>

          {/* Tagline */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: 26, fontWeight: 600, color: '#fff', lineHeight: 1.35, marginBottom: 14, letterSpacing: -0.3 }}>
              Navegue suas finanças com clareza.
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.75 }}>
              Controle inteligente de gastos, metas e alertas — pelo app e direto no WhatsApp.
            </p>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 8, position: 'relative', zIndex: 1 }}>
            {[
              { val: '34+',       label: 'Categorias', emBreve: false },
              { val: 'Real-time', label: 'Alertas',    emBreve: false },
              { val: 'IA',        label: 'WhatsApp',   emBreve: true  },
            ].map(({ val, label, emBreve }) => (
              <div key={label} style={{
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                position: 'relative',
              }}>
                {emBreve && (
                  <div style={{
                    position: 'absolute', top: -8, right: -4,
                    fontSize: 8, fontWeight: 700, letterSpacing: 0.4,
                    textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4,
                    background: '#d97706', color: '#fff',
                  }}>Em breve</div>
                )}
                <div style={{ fontSize: 14, fontWeight: 600, color: emBreve ? 'rgba(255,255,255,0.45)' : '#fff' }}>{val}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PAINEL DO FORMULÁRIO ── */}
      <div style={{
        flex: 1,
        display: 'flex', alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'center',
        padding: isMobile ? '28px 20px 40px' : '48px 40px',
      }}>
        <div style={{ width: '100%', maxWidth: isMobile ? undefined : 380 }}>

          {/* Abas */}
          <div style={{ display: 'flex', background: COR.inputFundo, borderRadius: 10, padding: 3, marginBottom: 30, border: `1px solid ${COR.borda}` }}>
            {(['login', 'cadastro'] as const).map(a => (
              <button key={a} onClick={() => { setAba(a); setSucesso('') }} style={{
                flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
                cursor: 'pointer', fontSize: 13, fontWeight: 500,
                transition: 'all 0.18s', fontFamily: 'inherit',
                background: aba === a ? COR.branco : 'transparent',
                color: aba === a ? COR.texto : COR.textoSuave,
                boxShadow: aba === a ? '0 1px 4px rgba(15,23,42,0.10)' : 'none',
              }}>
                {a === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            ))}
          </div>

          {/* Título */}
          <div style={{ marginBottom: 22 }}>
            <h1 style={{ fontSize: 21, fontWeight: 600, color: COR.texto, margin: 0, letterSpacing: -0.3 }}>
              {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
            </h1>
            <p style={{ fontSize: 13, color: COR.textoSuave, margin: '6px 0 0' }}>
              {isLogin ? 'Acesse seu painel financeiro' : 'Comece a organizar suas finanças hoje'}
            </p>
          </div>

          {/* Sucesso / Erro */}
          {sucesso && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: '#15803d', marginBottom: 14, textAlign: 'center' }}>
              {sucesso}
            </div>
          )}
          {erro && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 14, textAlign: 'center' }}>
              {erro}
            </div>
          )}

          {/* Campos */}
          {!isLogin && <Campo label="Nome completo" placeholder="Como quer ser chamado?" valor={form.nome} onChange={set('nome')} />}
          <Campo label="E-mail" tipo="email" placeholder="seu@email.com" valor={form.email} onChange={set('email')} />
          <Campo label="Senha" tipo="password" placeholder="••••••••" valor={form.senha} onChange={set('senha')} onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} />
          {!isLogin && form.senha.length > 0 && (() => {
            const { nivel, label, cor } = forcaSenha(form.senha)
            return (
              <div style={{ marginTop: -8, marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      flex: 1, height: 3, borderRadius: 2,
                      background: i <= nivel ? cor : COR.borda,
                      transition: 'background 0.2s',
                    }} />
                  ))}
                </div>
                <span style={{ fontSize: 11, color: cor, fontWeight: 500 }}>{label}</span>
              </div>
            )
          })()}
          {!isLogin && <Campo label="Confirmar senha" tipo="password" placeholder="••••••••" valor={form.confirmar} onChange={set('confirmar')} />}

          {isLogin && (
            <div style={{ textAlign: 'right', marginTop: -4, marginBottom: 14 }}>
              <a href="#" style={{ fontSize: 12, color: COR.azul, textDecoration: 'none' }}>Esqueci minha senha</a>
            </div>
          )}

          {/* Botão principal */}
          <button onClick={handleSubmit} disabled={carregando} style={{
            width: '100%', padding: '11px 0', borderRadius: 9, border: 'none',
            background: `linear-gradient(135deg, ${COR.azul}, ${COR.azulMedio})`,
            color: '#fff', fontSize: 14, fontWeight: 600,
            cursor: carregando ? 'default' : 'pointer',
            opacity: carregando ? 0.7 : 1,
            transition: 'all 0.18s', fontFamily: 'inherit', letterSpacing: 0.1,
          }}>
            {carregando ? 'Aguarde...' : (isLogin ? 'Entrar' : 'Criar conta')}
          </button>

          {/* Divisor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0' }}>
            <div style={{ flex: 1, height: 1, background: COR.borda }} />
            <span style={{ fontSize: 11, color: COR.textoSuave }}>ou continue com</span>
            <div style={{ flex: 1, height: 1, background: COR.borda }} />
          </div>

          {/* Google */}
          <button onClick={handleGoogle} disabled={carregando} style={{
            width: '100%', padding: '10px 0', borderRadius: 9,
            border: `1.5px solid ${COR.borda}`, background: COR.branco,
            fontSize: 13, fontWeight: 500, color: COR.texto,
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 9, fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}>
            <svg width="17" height="17" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" />
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z" />
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z" />
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z" />
            </svg>
            Entrar com Google
          </button>

          {/* Rodapé */}
          <p style={{ fontSize: 12, color: COR.textoSuave, textAlign: 'center', marginTop: 22, lineHeight: 1.6 }}>
            {isLogin
              ? <> Não tem conta?{' '}<span onClick={() => setAba('cadastro')} style={{ color: COR.azul, cursor: 'pointer', fontWeight: 500 }}>Crie agora</span></>
              : <> Já tem conta?{' '}<span onClick={() => setAba('login')} style={{ color: COR.azul, cursor: 'pointer', fontWeight: 500 }}>Entrar</span></>
            }
          </p>
        </div>
      </div>
    </div>
  )
}