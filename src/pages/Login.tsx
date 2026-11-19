import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { urlDoApp } from '../utils/site'
import { saiuPorInatividade, esquecerSaidaPorInatividade } from '../utils/inatividade'
import { COR } from '../utils/cores'
import {
  acabouDeSair, esquecerSaida, aparelhoTemDigital, algumaDigitalAqui, cadastrarDigital, digitalCadastradaAqui,
  entrarComDigital, recusarDigital, recusouDigital,
} from '../utils/digital'
import { useLarguraMenorQue } from '../utils/larguraTela'
import { LogoCompass, NomeCompass } from '../components/LogoCompass'
import { CabecalhoCartao, OndasTopo, RotuloTopo } from '../components/mobile/ui'
import { FONTE_SITE, FONTE_TITULO, TINTA, TINTA2, BORDA_CLARA } from '../components/mobile/estilo'

// Estilo da página do Educador (19/11/2026, pedido do Guilherme): topo
// escuro com as duas ondas, letra Barlow, cartão branco e botão em tinta.
const FUNDO = '#f3f7fd'

// Tela baixa (iPhone SE no navegador, com as barras dele): o topo e os
// espaços encolhem para o formulário inteiro caber.
// No computador, notebook de 768px com as barras do navegador (~650 úteis).
function useTelaBaixa(limite: number) {
  const [v, setV] = useState(() => window.innerHeight < limite)
  useEffect(() => {
    const h = () => setV(window.innerHeight < limite)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [limite])
  return v
}

function useIsMobile() {
  return useLarguraMenorQue(640)
}

function traduzirErro(msg: string) {
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos'
  if (msg.includes('Email not confirmed'))        return 'Confirme seu e-mail antes de entrar'
  if (msg.includes('User already registered'))    return 'Este e-mail já está cadastrado'
  if (msg.includes('Password should be'))         return 'A senha deve ter pelo menos 6 caracteres'
  if (msg.includes('Unable to validate'))         return 'Erro de validação — tente novamente'
  if (msg.includes('rate limit'))                 return 'Limite de e-mails atingido. Aguarde uma hora e tente de novo.'
  if (msg.includes('Error sending'))              return 'O servidor não conseguiu enviar o e-mail. Tente de novo mais tarde.'
  return msg
}

function Campo({
  label, tipo = 'text', placeholder, valor, onChange, icone, onKeyDown, erroMsg, compacto,
}: {
  label: string; tipo?: string; placeholder: string; valor: string
  onChange: (v: string) => void; icone?: string
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>; erroMsg?: string
  compacto?: boolean
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
          placeholder={placeholder}
          value={valor}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocado(true)}
          onBlur={() => setFocado(false)}
          onKeyDown={onKeyDown}
          autoComplete={ehSenha ? 'current-password' : tipo === 'email' ? 'email' : undefined}
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

const GoogleSVG = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

const DigitalSVG = ({ cor = 'currentColor' }: { cor?: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 11c0 3.5-1 6.5-3 9"/>
    <path d="M8.5 8.5A4.5 4.5 0 0 1 16.5 11c0 1.6-.1 3.2-.4 4.7"/>
    <path d="M5.5 10a7 7 0 0 1 13-3.5"/>
    <path d="M19.4 10.5c.1.5.1 1 .1 1.5 0 2.3-.3 4.6-.9 6.8"/>
    <path d="M12 14.5c-.2 2.2-.8 4.3-1.8 6.2"/>
    <path d="M4.6 14.5c.3-1 .4-2 .4-3"/>
    <path d="M14.8 18.5c-.3 1-.6 1.9-1 2.8"/>
  </svg>
)

export default function Login() {
  const navigate    = useNavigate()
  const { user, carregando: carregandoApp } = useApp()
  // Quem já está logado não fica no login: a seta voltar do celular trazia a
  // pessoa de volta para cá, parecendo que tinha saído (24/10/2026). `entrando`
  // segura o redirecionamento enquanto esta tela ainda tem algo a mostrar
  // (a oferta de cadastrar a digital depois da senha).
  const entrando = useRef(false)
  const isMobile    = useIsMobile()
  const baixa       = useTelaBaixa(620)
  const pcBaixo     = useTelaBaixa(780) && !isMobile
  const pcMuitoBaixo = useTelaBaixa(640) && !isMobile
  // A frase do topo só aparece no celular quando sobra altura.
  const celAlto     = !useTelaBaixa(760)
  const [email,     setEmail]     = useState('')
  const [senha,     setSenha]     = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro,      setErro]      = useState('')
  const [sucesso,   setSucesso]   = useState('')
  // Lido no inicializador e esquecido num efeito, e não os dois juntos: em modo
  // estrito o React chama o inicializador duas vezes, e consumir ali perderia
  // o aviso na segunda chamada.
  const [porInatividade] = useState(saiuPorInatividade)
  useEffect(() => { esquecerSaidaPorInatividade() }, [])

  // Entrar com digital (passkey): o botão só aparece onde o aparelho tem leitor.
  const [temDigital, setTemDigital] = useState(false)
  const [digitalEmDestaque] = useState(algumaDigitalAqui)
  // Depois de entrar com a senha, oferece cadastrar a digital uma vez.
  const [ofertaDigital, setOfertaDigital] = useState<string | null>(null)
  useEffect(() => { aparelhoTemDigital().then(setTemDigital) }, [])
  useEffect(() => {
    if (!carregandoApp && user && !entrando.current && !ofertaDigital) navigate('/', { replace: true })
  }, [carregandoApp, user, ofertaDigital, navigate])

  // Com a digital já usada neste aparelho, a leitura abre sozinha (pedido do
  // Guilherme em 11/10/2026), uma vez por abertura da tela. Não abre logo
  // depois de "Sair": quem saiu de propósito não quer o pedido na cara. Saída
  // por inatividade abre, porque a pessoa está voltando. Onde o navegador
  // exige um toque antes (Safari no iPhone), a tentativa falha calada e o
  // botão em destaque continua lá.
  // Lido no inicializador e esquecido num efeito, pelo mesmo motivo do aviso
  // de inatividade acima.
  const [saiuAgora] = useState(acabouDeSair)
  useEffect(() => { esquecerSaida() }, [])
  const tentouSozinho = useRef(false)
  useEffect(() => {
    if (!temDigital || !digitalEmDestaque || saiuAgora || tentouSozinho.current) return
    tentouSozinho.current = true
    handleDigital(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temDigital, digitalEmDestaque, saiuAgora])

  // `sozinho`: a tentativa automática ao abrir a tela não mostra erro; quem
  // tocou no botão vê.
  async function handleDigital(sozinho = false) {
    setErro(''); setSucesso('')
    setCarregando(true)
    const r = await entrarComDigital()
    setCarregando(false)
    if (r.ok) navigate('/', { replace: true })
    else if (r.erro && !sozinho) setErro(r.erro)
  }

  async function ativarDigital() {
    if (!ofertaDigital) return
    setErro('')
    setCarregando(true)
    const r = await cadastrarDigital(ofertaDigital)
    setCarregando(false)
    if (r.ok || !r.erro) { navigate('/', { replace: true }); return }
    setErro(r.erro)
  }

  function agoraNao() {
    if (ofertaDigital) recusarDigital(ofertaDigital)
    navigate('/', { replace: true })
  }

  async function handleSubmit() {
    setErro('')
    setSucesso('')
    if (!email) { setErro('Digite seu e-mail'); return }
    if (!senha)  { setErro('Digite sua senha');  return }
    entrando.current = true
    setCarregando(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (error) throw error
      const uid = data.user?.id
      if (uid && temDigital && !digitalCadastradaAqui(uid) && !recusouDigital(uid)) setOfertaDigital(uid)
      else navigate('/', { replace: true })
    } catch (e: unknown) {
      let msg = 'Erro desconhecido'
      if (e instanceof Error && e.message && e.message !== '{}') {
        msg = e.message
      } else if (typeof e === 'object' && e !== null) {
        const obj = e as Record<string, unknown>
        msg = (obj.message ?? obj.error_description ?? obj.msg ?? '') as string
        if (!msg || msg === '{}') msg = 'Erro no servidor. Tente novamente em alguns minutos.'
      }
      setErro(traduzirErro(msg))
    } finally {
      setCarregando(false)
    }
  }

  async function handleGoogle() {
    setErro('')
    setCarregando(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: urlDoApp('/') },
    })
    if (error) setErro(traduzirErro(error.message))
    setCarregando(false)
  }

  async function handleResetSenha() {
    setErro('')
    setSucesso('')
    if (!email) { setErro('Digite seu e-mail para recuperar a senha'); return }
    setCarregando(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: urlDoApp('/redefinir-senha'),
    })
    if (error) setErro(traduzirErro(error.message))
    else setSucesso('Link de recuperação enviado! Verifique sua caixa de entrada.')
    setCarregando(false)
  }

  // No celular o topo é uma faixa baixa, com a logo ao lado do nome: a tela
  // inteira cabe sem rolar, com digital, e-mail, senha e Google à vista
  // (pedido do Guilherme em 25/10/2026). Ainda rola se faltar altura (teclado
  // aberto, aviso de erro).
  // A logo em destaque (19/11/2026, pedido do Guilherme: "vamos valorizar a
  // logo"): maior, com um halo ciano atrás, sem o quadrado em volta.
  const marca = (grande: boolean) => {
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

  // No celular o topo é baixo: marca, o rótulo âmbar e (com altura) a frase do
  // site; o formulário cabe sem rolar (pedido do Guilherme em 25/10/2026). Ainda
  // rola se faltar altura (teclado aberto, aviso de erro).
  const hero = (compact: boolean) => compact ? (
    <div style={{
      background: 'var(--cx-azul)', position: 'relative', overflow: 'hidden', flexShrink: 0,
      padding: `calc(env(safe-area-inset-top, 0px) + ${baixa ? 12 : 20}px) 22px ${baixa ? 46 : celAlto ? 66 : 56}px`,
    }}>
      {marca(false)}
      <div style={{ marginTop: baixa ? 10 : 18, position: 'relative' }}>
        <RotuloTopo icone="ti-route">Planeje · preveja · decida</RotuloTopo>
      </div>
      {celAlto && (
        <h1 style={{ margin: '8px 0 0', fontFamily: FONTE_TITULO, fontSize: 34, fontWeight: 700, lineHeight: 1.02,
          color: '#fff', position: 'relative' }}>Chega de voar às cegas com o seu dinheiro.</h1>
      )}
      <OndasTopo fundo={FUNDO}/>
    </div>
  ) : (
    <div style={{
      background: 'var(--cx-azul)', flex: 1, position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      padding: pcBaixo ? '32px 56px 96px' : '48px 64px 120px',
    }}>
      {marca(true)}
      <div style={{ maxWidth: 520, position: 'relative' }}>
        <RotuloTopo icone="ti-route">Planeje · preveja · decida</RotuloTopo>
        <h1 style={{ margin: '14px 0 16px', fontFamily: FONTE_TITULO, fontSize: pcBaixo ? 50 : 60, fontWeight: 700,
          lineHeight: 1, color: '#fff' }}>Chega de voar às cegas com o seu dinheiro.</h1>
        <p style={{ margin: 0, fontSize: 18, lineHeight: 1.55, color: 'rgba(255,255,255,.85)', maxWidth: 460 }}>
          Planeje o mês, veja com quanto ele termina e saiba se cabe no bolso antes de comprar.
        </p>
      </div>
      <div/>
      <OndasTopo fundo={FUNDO}/>
    </div>
  )

  const botaoDigital = (destaque: boolean) => (
    <button onClick={() => handleDigital()} disabled={carregando} style={{
      width:'100%', padding: destaque ? (isMobile ? '13px' : '15px') : (isMobile ? '11px' : '13px'), borderRadius:14, fontFamily:'inherit',
      border: destaque ? 'none' : `1.5px solid ${BORDA_CLARA}`,
      background: destaque ? TINTA : '#fff',
      color: TINTA, fontSize: destaque ? 16 : 15, fontWeight: destaque ? 700 : 600,
      ...(destaque ? { color: '#fff' } : {}),
      cursor: carregando ? 'default' : 'pointer', opacity: carregando ? .75 : 1,
      boxShadow: destaque ? '0 6px 18px rgba(11,37,69,.25)' : 'none',
      display:'flex', alignItems:'center', justifyContent:'center', gap:10,
      marginBottom: destaque ? 12 : 0,
    }}>
      <DigitalSVG cor={destaque ? '#fff' : TINTA}/> {destaque || !isMobile ? 'Entrar com digital' : 'Digital'}
    </button>
  )

  const telaOferta = (
    <div style={{ padding: isMobile ? '24px 20px 20px' : '40px 40px', fontFamily: FONTE_SITE, textAlign:'center',
      margin: isMobile ? 'auto 0' : undefined }}>
      <div style={{ width:56, height:56, borderRadius:15, background:'#070c18', margin:'0 auto 16px',
        display:'flex', alignItems:'center', justifyContent:'center' }}>
        <DigitalSVG cor="#f5b942"/>
      </div>
      <div style={{ fontFamily: FONTE_TITULO, fontSize:28, fontWeight:700, lineHeight:1.05, color:TINTA, marginBottom:10 }}>Entrar com a digital da próxima vez?</div>
      <div style={{ fontSize:15, color:TINTA2, lineHeight:1.55, marginBottom:20 }}>
        Você entra só encostando o dedo (ou olhando para a câmera), sem digitar a senha. A digital
        não sai do aparelho: o Compass One só recebe a confirmação de que é você.
      </div>
      {erro && (
        <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#b91c1c', marginBottom:16 }}>
          {erro}
        </div>
      )}
      <button onClick={ativarDigital} disabled={carregando} style={{
        width:'100%', padding:'15px', border:'none', borderRadius:14,
        background:TINTA, color:'#fff', fontSize:16, fontWeight:700,
        cursor: carregando ? 'default' : 'pointer', opacity: carregando ? .75 : 1, fontFamily:'inherit',
        display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:12,
      }}>
        <DigitalSVG cor="#fff"/> {carregando ? 'Aguardando a digital…' : 'Ativar digital'}
      </button>
      <button onClick={agoraNao} disabled={carregando} style={{
        width:'100%', padding:'13px', border:'none', background:'transparent', color:TINTA, textDecoration:'underline',
        fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
      }}>Agora não</button>
      <div style={{ fontSize:13, color:TINTA2, marginTop:8 }}>Dá para ativar depois em Configurações → Perfil.</div>
    </div>
  )

  const form = ofertaDigital ? telaOferta : (
    <div style={{ padding: isMobile ? (baixa ? '14px 18px 12px' : '20px 20px 16px') : (pcMuitoBaixo ? '20px 36px' : pcBaixo ? '26px 38px' : '36px 40px'), fontFamily: FONTE_SITE,
      width: '100%' }}>
      {/* A sequência segue o modelo pedido pelo Guilherme em 26/10/2026:
          título, entrar com Google/digital, "ou", e-mail e senha, esqueci,
          Entrar e o convite para o cadastro. */}
      <div style={{ marginBottom: isMobile ? (baixa ? 0 : 4) : (pcBaixo ? 4 : 10) }}>
        <CabecalhoCartao icone="ti-login-2" rotulo="Bem-vindo de volta">Acesse sua conta</CabecalhoCartao>
      </div>

      {erro && (
        <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#b91c1c', marginBottom:16, textAlign:'center' }}>
          {erro}
        </div>
      )}
      {porInatividade && !erro && !sucesso && (
        <div role="status" style={{ background: COR.infoFundo, border: `1px solid ${COR.infoBorda}`, borderRadius: 10,
          padding: '10px 14px', fontSize: 13, color: COR.infoTexto, marginBottom: 16, textAlign: 'center' }}>
          Você foi desconectado depois de 30 minutos sem uso. Entre de novo para continuar.
        </div>
      )}

      {sucesso && (
        <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#15803d', marginBottom:16, textAlign:'center' }}>
          {sucesso}
        </div>
      )}

      {/* Com a digital já usada no aparelho, ela vem primeiro e em destaque; sem
          isso, Google e digital dividem a linha no celular. */}
      {temDigital && digitalEmDestaque && botaoDigital(true)}
      <div style={isMobile && temDigital && !digitalEmDestaque
        ? { display:'flex', gap:10 }
        : { display:'flex', flexDirection:'column', gap:12 }}>
        <button onClick={handleGoogle} disabled={carregando} style={{
          width:'100%', padding: isMobile ? '11px' : '13px', border:`1.5px solid ${BORDA_CLARA}`, borderRadius:14,
          background:'#fff', color:TINTA, fontSize:15, fontWeight:600,
          cursor:'pointer', fontFamily:'inherit',
          display:'flex', alignItems:'center', justifyContent:'center', gap:10,
          transition:'all .15s',
        }}>
          <GoogleSVG/> {isMobile && temDigital && !digitalEmDestaque ? 'Google' : 'Entrar com Google'}
        </button>
        {temDigital && !digitalEmDestaque && botaoDigital(false)}
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:12,
        margin: isMobile ? (baixa ? '10px 0' : '14px 0') : (pcBaixo ? '14px 0' : '18px 0') }}>
        <div style={{ flex:1, height:1, background:BORDA_CLARA }}/>
        <span style={{ fontSize:12, color:TINTA2, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase' }}>ou</span>
        <div style={{ flex:1, height:1, background:BORDA_CLARA }}/>
      </div>

      <Campo label="E-mail" tipo="email" placeholder="seu@email.com"
        valor={email} onChange={setEmail} icone="ti-mail" compacto={isMobile || pcBaixo} />

      <Campo label="Senha" tipo="password" placeholder="Sua senha"
        valor={senha} onChange={setSenha} icone="ti-lock"
        onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} compacto={isMobile || pcBaixo} />

      <div style={{ marginTop: isMobile ? -6 : -8, marginBottom: isMobile ? (baixa ? 8 : 12) : (pcBaixo ? 14 : 20) }}>
        <button onClick={handleResetSenha} style={{
          border:'none', background:'transparent', color:TINTA, padding:0, textDecoration:'underline',
          fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
        }}>Esqueci minha senha</button>
      </div>

      <button onClick={handleSubmit} disabled={carregando} style={{
        width:'100%', padding: isMobile ? '13px' : '15px', border:'none', borderRadius:14,
        background:TINTA,
        color:'#fff', fontSize:17, fontWeight:700, letterSpacing:'.02em',
        cursor: carregando ? 'default' : 'pointer',
        opacity: carregando ? .75 : 1,
        fontFamily:'inherit',
        boxShadow:'0 6px 18px rgba(11,37,69,.25)',
        transition:'all .15s',
        display:'flex', alignItems:'center', justifyContent:'center', gap:8,
        marginBottom: isMobile ? (baixa ? 10 : 14) : (pcBaixo ? 14 : 20),
      }}>
        {carregando ? 'Entrando...' : 'Entrar'}
      </button>

      <div style={{ textAlign:'center' }}>
        <span style={{ fontSize:14, color:TINTA2 }}>Ainda não possui uma conta? </span>
        <button onClick={() => navigate('/cadastro')} style={{
          border:'none', background:'transparent', color:TINTA, padding:0, textDecoration:'underline',
          fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
        }}>Faça o cadastro!</button>
      </div>

      <div style={{ textAlign:'center', marginTop: isMobile ? (baixa ? 8 : 12) : 20 }}>
        <span style={{ fontSize:11, color:TINTA2, lineHeight:1.5 }}>
          Ao entrar você concorda com os{' '}
          <a href="/termos" target="_blank" rel="noopener noreferrer"
            style={{ color:TINTA, fontWeight:700 }}>Termos de Uso</a>
          {' '}e{' '}
          <a href="/privacidade" target="_blank" rel="noopener noreferrer"
            style={{ color:TINTA, fontWeight:700 }}>Privacidade</a>
        </span>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <div style={{ height:'100dvh', display:'flex', flexDirection:'column', background:FUNDO, fontFamily:FONTE_SITE, overflow:'hidden' }}>
        {hero(true)}
        <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'none', padding: baixa ? '0 12px 10px' : '0 14px 14px', marginTop: baixa ? -28 : -40, position:'relative' }}>
          <div style={{ background:'#fff', borderRadius:20, border:'1px solid var(--cx-borda)', boxShadow:'0 10px 30px rgba(11,37,69,.10)' }}>
            {form}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', fontFamily:FONTE_SITE, background:FUNDO }}>
      {hero(false)}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding: pcMuitoBaixo ? '8px 20px' : pcBaixo ? '16px 20px' : '40px 20px' }}>
        <div style={{ width:'100%', maxWidth:440, background:'#fff', borderRadius:20, border:'1px solid var(--cx-borda)', boxShadow:'0 12px 40px rgba(11,37,69,.10)', overflow:'hidden' }}>
          {form}
        </div>
      </div>
    </div>
  )
}
