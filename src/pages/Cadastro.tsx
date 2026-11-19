import { useState } from 'react'
import { aceiteDeOfertas, guardarEscolhaPendente } from '../utils/ofertasEmail'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { urlDoApp } from '../utils/site'
import { codigoRecebido } from '../utils/indicacao'
import { useLarguraMenorQue } from '../utils/larguraTela'
import { CabecalhoCartao } from '../components/mobile/ui'
import { TINTA, TINTA2, BORDA_CLARA, FONTE_SITE } from '../components/mobile/estilo'
import { CampoEntrada, TelaEntrada, Separador } from '../components/entrada/Entrada'
import { botaoPrincipal, botaoClaro, linkEntrada } from '../components/entrada/estiloEntrada'

function useIsMobile() {
  return useLarguraMenorQue(640)
}

function traduzirErro(msg: string) {
  if (msg.includes('User already registered'))  return 'Este e-mail já está cadastrado'
  if (msg.includes('already been registered'))  return 'Este e-mail já está cadastrado'
  if (msg.includes('Password should be'))       return 'A senha deve ter pelo menos 8 caracteres'
  if (msg.includes('Unable to validate'))       return 'Erro de validação — tente novamente'
  if (msg.includes('rate limit'))               return 'Limite de e-mails atingido. Aguarde uma hora e tente de novo.'
  if (msg.includes('Error sending'))            return 'O servidor não conseguiu enviar o e-mail. Tente de novo mais tarde.'
  return msg
}

function forcaSenha(s: string) {
  if (s.length === 0) return { nivel: -1, label: '', cor: '' }
  if (s.length < 8)   return { nivel: 0, label: 'Fraca — mínimo 8 caracteres', cor: '#b91c1c' }
  const temLetra  = /[a-zA-Z]/.test(s)
  const temNumero = /[0-9]/.test(s)
  const temEspec  = /[^a-zA-Z0-9]/.test(s)
  if (temLetra && temNumero && temEspec) return { nivel: 2, label: 'Forte', cor: '#15803d' }
  if (temLetra && temNumero)             return { nivel: 1, label: 'Média — adicione símbolos para fortalecer', cor: '#b45309' }
  return { nivel: 1, label: 'Média', cor: '#b45309' }
}

const GoogleSVG = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

export default function Cadastro() {
  const navigate      = useNavigate()
  const isMobile      = useIsMobile()
  const [nome,        setNome]        = useState('')
  // O e-mail do convite da conta compartilhada chega pronto (?email=).
  const [params] = useSearchParams()
  const [email,       setEmail]       = useState(() => params.get('email') ?? '')
  const [senha,       setSenha]       = useState('')
  const [confirmar,   setConfirmar]   = useState('')
  const [carregando,  setCarregando]  = useState(false)
  const [erro,        setErro]        = useState('')
  const [confirmacaoEnviada, setConfirmacaoEnviada] = useState(false)
  const [reenvio, setReenvio] = useState<{ ok: boolean; texto: string } | null>(null)
  // LGPD: nasce DESMARCADA (utils/ofertasEmail.ts).
  const [ofertas, setOfertas] = useState(false)

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
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: { nome, indicado_por: codigoRecebido() ?? undefined, ...aceiteDeOfertas(ofertas) },
          emailRedirectTo: urlDoApp('/'),
        },
      })
      if (error) throw error
      // Com "Confirm email" desligado no Supabase a conta já nasce
      // confirmada e com sessão, e nenhum e-mail é enviado: dizer
      // "verifique seu e-mail" seria esperar por algo que não vem.
      if (data.session) { navigate('/'); return }
      setConfirmacaoEnviada(true)
    } catch (e: unknown) {
      let msg = 'Erro desconhecido'
      if (e instanceof Error && e.message && e.message !== '{}') {
        msg = e.message
      } else if (typeof e === 'object' && e !== null) {
        const obj = e as Record<string, unknown>
        msg = (obj.message ?? obj.error_description ?? obj.msg ?? '') as string
        if (!msg || msg === '{}') msg = 'Erro no servidor. Tente novamente em alguns minutos.'
      }
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
    guardarEscolhaPendente(ofertas)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: urlDoApp('/') },
    })
    if (error) setErro(traduzirErro(error.message))
    setCarregando(false)
  }

  async function handleReenviar() {
    setCarregando(true)
    setReenvio(null)
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: urlDoApp('/') } })
    setReenvio(error ? { ok: false, texto: traduzirErro(error.message) } : { ok: true, texto: 'E-mail reenviado.' })
    setCarregando(false)
  }

  // O cadastro tem texto próprio (19/11/2026, Guilherme): parabeniza a
  // decisão e prepara a decolagem, em vez da frase do login.
  const FRASE = 'Parabéns! Seja muito bem\u2011vindo ao Compass\u00a0One.'
  const APOIO = 'Você deu o primeiro passo para sair da turbulência. Sua bússola financeira está pronta para mostrar o caminho.'
  const ROTULO = 'Pronto para decolar'

  // Tela de confirmação enviada
  if (confirmacaoEnviada) {
    return (
      <TelaEntrada frase="Check-in feito. Falta só confirmar o seu e-mail." apoio="Abra o e-mail que enviamos e toque no link. Depois é só entrar e decolar." rotulo="Quase decolando" icone="ti-plane-departure">
        <div style={{ padding: isMobile ? '22px 20px 20px' : '36px 40px', fontFamily: FONTE_SITE }}>
          <CabecalhoCartao icone="ti-mail-check" rotulo="Quase lá">Verifique seu e-mail</CabecalhoCartao>
          <div style={{ fontSize:15, color:TINTA2, lineHeight:1.6 }}>Enviamos um link de confirmação para</div>
          <div style={{ fontSize:16, fontWeight:700, color:TINTA, marginBottom:14, wordBreak:'break-all' }}>{email}</div>
          <div style={{ fontSize:14, color:TINTA2, marginBottom:14, lineHeight:1.55 }}>
            Clique no link do e-mail para ativar sua conta e começar a usar o Compass One.
          </div>
          <div style={{ fontSize:13, color:TINTA2, marginBottom:20, lineHeight:1.5,
            padding:'10px 14px', background:'#f3f8fe', borderRadius:12, border:`1px solid ${BORDA_CLARA}` }}>
            Não recebeu? Verifique a pasta de spam ou lixo eletrônico. O e-mail pode levar até 2 minutos.
          </div>
          <button onClick={handleReenviar} disabled={carregando} style={{ ...botaoClaro, marginBottom:12 }}>
            {carregando ? 'Reenviando...' : 'Reenviar e-mail'}
          </button>
          {reenvio && (
            <div role="status" style={{ fontSize:13, marginBottom:12, color: reenvio.ok ? '#15803d' : '#b91c1c' }}>{reenvio.texto}</div>
          )}
          <button onClick={() => navigate('/login')} style={botaoPrincipal()}>Voltar ao login</button>
        </div>
      </TelaEntrada>
    )
  }

  return (
    <TelaEntrada frase={FRASE} apoio={APOIO} rotulo={ROTULO} icone="ti-plane-departure">
    <div style={{ padding: isMobile ? '20px 20px 18px' : '32px 40px', fontFamily: FONTE_SITE }}>
      <div style={{ marginBottom: 8 }}>
        <CabecalhoCartao icone="ti-user-plus" rotulo="Grátis · sem anúncios">Crie sua conta</CabecalhoCartao>
      </div>

      {erro && (
        <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#b91c1c', marginBottom:16 }}>
          {erro}
          {erro.includes('já está cadastrado') && (
            <button onClick={() => navigate('/login')} style={{ ...linkEntrada, fontSize:13 }}>Entrar</button>
          )}
        </div>
      )}

      <button onClick={handleGoogle} disabled={carregando} style={botaoClaro}>
        <GoogleSVG/> Cadastrar com Google
      </button>

      <Separador margem="16px 0">ou com e-mail</Separador>

      <CampoEntrada label="Nome" placeholder="Como quer ser chamado?" autoComplete="name"
        valor={nome} onChange={setNome} icone="ti-user" />

      <CampoEntrada label="E-mail" tipo="email" placeholder="seu@email.com"
        valor={email} onChange={setEmail} icone="ti-mail" erroMsg={erroEmail} />

      <CampoEntrada label="Senha" tipo="password" placeholder="Mínimo 8 caracteres" autoComplete="new-password"
        valor={senha} onChange={setSenha} icone="ti-lock" />

      {senha.length > 0 && forca.nivel >= 0 && (
        <div style={{ marginTop:-6, marginBottom:14 }}>
          <div style={{ display:'flex', gap:4, marginBottom:5 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                flex:1, height:4, borderRadius:2,
                background: i <= forca.nivel ? forca.cor : BORDA_CLARA,
                transition:'background .2s',
              }}/>
            ))}
          </div>
          <span style={{ fontSize:12, color:forca.cor, fontWeight:600 }}>{forca.label}</span>
        </div>
      )}

      <CampoEntrada label="Confirmar senha" tipo="password" placeholder="Repita a senha" autoComplete="new-password"
        valor={confirmar} onChange={setConfirmar} icone="ti-lock-check"
        erroMsg={erroConfirmar}
        onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} />

      <label style={{ display:'flex', gap:10, alignItems:'flex-start', margin:'2px 0 16px', fontSize:14, color:TINTA2, lineHeight:1.45, cursor:'pointer' }}>
        <input type="checkbox" checked={ofertas} onChange={e => setOfertas(e.target.checked)}
          style={{ width:18, height:18, marginTop:1, flexShrink:0, accentColor:TINTA }} />
        <span>Quero receber novidades e ofertas do Compass One por e-mail. Você pode mudar isso quando quiser, no Perfil.</span>
      </label>

      <button onClick={handleSubmit} disabled={carregando} style={{ ...botaoPrincipal(carregando), marginBottom:16 }}>
        {carregando ? 'Criando conta...' : 'Criar minha conta'}
      </button>

      <div style={{ textAlign:'center' }}>
        <span style={{ fontSize:14, color:TINTA2 }}>Já tem conta? </span>
        <button onClick={() => navigate('/login')} style={{ ...linkEntrada, fontSize:14 }}>Entrar</button>
      </div>

      <div style={{ textAlign:'center', marginTop:14 }}>
        <span style={{ fontSize:11, color:TINTA2, lineHeight:1.5 }}>
          Ao criar sua conta você concorda com os{' '}
          <a href="/termos" target="_blank" rel="noopener noreferrer" style={{ color:TINTA, fontWeight:700 }}>Termos de Uso</a>
          {' '}e{' '}
          <a href="/privacidade" target="_blank" rel="noopener noreferrer" style={{ color:TINTA, fontWeight:700 }}>Privacidade</a>
        </span>
      </div>
    </div>
    </TelaEntrada>
  )
}
