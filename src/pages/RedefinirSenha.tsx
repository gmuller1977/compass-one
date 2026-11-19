import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLarguraMenorQue } from '../utils/larguraTela'
import { CabecalhoCartao } from '../components/mobile/ui'
import { TINTA, TINTA2, FONTE_SITE } from '../components/mobile/estilo'
import { FRASE_ENTRADA, CampoEntrada, TelaEntrada } from '../components/entrada/Entrada'
import { botaoPrincipal, linkEntrada } from '../components/entrada/estiloEntrada'

function useIsMobile() {
  return useLarguraMenorQue(640)
}

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

  return (
    <TelaEntrada frase={FRASE_ENTRADA}
      apoio="Planeje o mês, veja com quanto ele termina e saiba se cabe no bolso antes de comprar.">
    <div style={{ padding: isMobile ? '20px 20px 18px' : '36px 40px', fontFamily: FONTE_SITE }}>
      <CabecalhoCartao icone="ti-key" rotulo="Recuperar acesso">Nova senha</CabecalhoCartao>
      <div style={{ fontSize:15, color:TINTA2, marginBottom:18 }}>
        {sucesso
          ? 'Senha atualizada com sucesso!'
          : linkValido === false
            ? 'Link inválido ou expirado.'
            : 'Escolha uma senha segura para sua conta.'}
      </div>

      {sucesso ? (
        <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:12,
          padding:'18px 16px', textAlign:'center' }}>
          <i aria-hidden className="ti ti-circle-check" style={{ fontSize:34, color:'#15803d' }}/>
          <div style={{ fontSize:15, fontWeight:700, color:'#15803d', margin:'6px 0' }}>Senha redefinida!</div>
          <div style={{ fontSize:14, color:'#166534' }}>
            Você será redirecionado para o login em instantes...
          </div>
        </div>
      ) : linkValido === false ? (
        <div>
          <div style={{ fontSize:14, color:TINTA2, marginBottom:20, lineHeight:1.6 }}>
            Este link de redefinição é inválido ou já expirou. Peça um novo link na tela de login, em "Esqueci minha senha".
          </div>
          <button onClick={() => navigate('/login')} style={botaoPrincipal()}>Voltar ao login</button>
        </div>
      ) : (
        <>
          {erro && (
            <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10,
              padding:'10px 14px', fontSize:13, color:'#b91c1c', marginBottom:16, textAlign:'center' }}>
              {erro}
            </div>
          )}
          <CampoEntrada label="Nova senha" tipo="password" placeholder="Mínimo 6 caracteres" autoComplete="new-password"
            valor={novaSenha} onChange={setNovaSenha} icone="ti-lock" />
          <CampoEntrada label="Confirmar senha" tipo="password" placeholder="Repita a nova senha" autoComplete="new-password"
            valor={confirmarSenha} onChange={setConfirmarSenha} icone="ti-lock-check"
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }} />
          <button onClick={handleSubmit} disabled={carregando || linkValido === null}
            style={{ ...botaoPrincipal(carregando || linkValido === null), marginTop:4, marginBottom:16 }}>
            {carregando ? 'Salvando...' : linkValido === null ? 'Verificando link...' : 'Redefinir senha'}
          </button>
          <div style={{ textAlign:'center' }}>
            <button onClick={() => navigate('/login')} style={{ ...linkEntrada, fontSize:14, color:TINTA }}>Voltar ao login</button>
          </div>
        </>
      )}
    </div>
    </TelaEntrada>
  )
}
