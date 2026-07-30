import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const COR = {
  azul: '#1a56db', azulEscuro: '#0f2878', azulMedio: '#2563eb',
  fundo: '#f0f4ff', branco: '#ffffff', texto: '#0f172a',
  textoSuave: '#64748b', borda: '#e2e8f0',
}

type Step = 1 | 2 | 3

const STEPS = [
  {
    step: 1 as Step,
    emoji: '🏦',
    titulo: 'Cadastre suas contas',
    descricao: 'Adicione sua conta corrente, poupança ou carteira para acompanhar seu saldo em tempo real.',
    acaoLabel: '+ Cadastrar banco',
    acaoUrl: '/configuracoes?aba=bancos&acao=novo',
    pularLabel: 'Pular por agora →',
  },
  {
    step: 2 as Step,
    emoji: '💳',
    titulo: 'Tem cartão de crédito?',
    descricao: 'Cadastre seus cartões para controlar as faturas e não ser surpreendido no final do mês.',
    acaoLabel: '+ Cadastrar cartão',
    acaoUrl: '/configuracoes?aba=cartoes&acao=novo',
    pularLabel: 'Pular por agora →',
  },
  {
    step: 3 as Step,
    emoji: '📊',
    titulo: 'Monte seu planejamento',
    descricao: 'Defina quanto você quer gastar em cada categoria. Seu orçamento, do seu jeito.',
    acaoLabel: '▶ Comece aqui',
    acaoUrl: '/wizard-planejamento',
    pularLabel: 'Fazer depois →',
  },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { setOnboardingCompleto } = useApp()
  const [step, setStep] = useState<Step>(1)

  const current = STEPS[step - 1]

  function concluir(url?: string) {
    setOnboardingCompleto(true)
    navigate(url ?? '/', { replace: true })
  }

  function handleAcao() {
    concluir(current.acaoUrl)
  }

  function handlePular() {
    if (step < 3) {
      setStep((step + 1) as Step)
    } else {
      concluir()
    }
  }

  return (
    <div style={{
      minHeight: '100dvh', background: COR.fundo,
      display: 'flex', flexDirection: 'column',
      fontFamily: "-apple-system,'Inter',sans-serif",
    }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${COR.azulEscuro} 0%, ${COR.azulMedio} 100%)`,
        padding: '28px 24px 36px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.6)',
          letterSpacing: 1.5, textTransform: 'uppercase' }}>
          Compass One
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>
          Vamos configurar sua conta
        </div>
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {STEPS.map(s => (
            <div key={s.step} style={{
              width: step === s.step ? 24 : 8,
              height: 8, borderRadius: 4,
              background: step === s.step ? '#fff' : 'rgba(255,255,255,.35)',
              transition: 'all .3s',
            }} />
          ))}
        </div>
      </div>

      {/* Card */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px',
      }}>
        <div style={{
          background: COR.branco, borderRadius: 20,
          padding: '36px 28px', maxWidth: 400, width: '100%',
          boxShadow: '0 4px 24px rgba(0,0,0,.08)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 0, textAlign: 'center',
        }}>
          <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 20 }}>
            {current.emoji}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: COR.texto, marginBottom: 12 }}>
            {current.titulo}
          </div>
          <div style={{ fontSize: 14, color: COR.textoSuave, lineHeight: 1.6, marginBottom: 32 }}>
            {current.descricao}
          </div>

          {/* Action button */}
          <button onClick={handleAcao} style={{
            width: '100%', padding: '14px 20px', border: 'none', borderRadius: 12,
            background: `linear-gradient(135deg, ${COR.azul} 0%, ${COR.azulMedio} 100%)`,
            color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', marginBottom: 12,
            boxShadow: '0 4px 12px rgba(26,86,219,.3)',
          }}>
            {current.acaoLabel}
          </button>

          {/* Skip button */}
          <button onClick={handlePular} style={{
            width: '100%', padding: '12px 20px', border: 'none', borderRadius: 12,
            background: 'transparent', color: COR.textoSuave,
            fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {current.pularLabel}
          </button>
        </div>

        {/* Step label */}
        <div style={{ marginTop: 20, fontSize: 12, color: COR.textoSuave }}>
          Etapa {step} de 3
        </div>
      </div>
    </div>
  )
}
