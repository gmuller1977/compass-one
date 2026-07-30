import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { Conta, Categoria } from '../context/AppContext'

const COR = {
  azul: '#1a56db', azulEscuro: '#0f2878', azulMedio: '#2563eb',
  fundo: '#f0f4ff', branco: '#ffffff', texto: '#0f172a',
  textoSuave: '#64748b', borda: '#e2e8f0',
}

type StepId = 'banco' | 'cartao' | 'categorias' | 'wizard'
const STEPS_ORDER: StepId[] = ['banco', 'cartao', 'categorias', 'wizard']

function calcMinStep(contas: Conta[], categorias: Categoria[]): StepId {
  if (!contas.some(c => c.tipo !== 'cartao')) return 'banco'
  if (!contas.some(c => c.tipo === 'cartao')) return 'cartao'
  if (!categorias.some(c => c.ativa)) return 'categorias'
  return 'wizard'
}

const STEP_CONFIG: Record<StepId, {
  emoji: string; titulo: string; descricao: string
  acaoLabel: string; acaoUrl: string; pularLabel: string
}> = {
  banco: {
    emoji: '🏦',
    titulo: 'Cadastre suas contas',
    descricao: 'Adicione pelo menos uma conta bancária para começar a controlar seu dinheiro.',
    acaoLabel: '+ Cadastrar banco',
    acaoUrl: '/configuracoes?aba=bancos&acao=novo',
    pularLabel: 'Pular mesmo assim →',
  },
  cartao: {
    emoji: '💳',
    titulo: 'Tem cartão de crédito?',
    descricao: 'Cadastre seus cartões para controlar as faturas e não ser surpreendido no final do mês.',
    acaoLabel: '+ Cadastrar cartão',
    acaoUrl: '/configuracoes?aba=cartoes&acao=novo',
    pularLabel: 'Não tenho cartão →',
  },
  categorias: {
    emoji: '🏷️',
    titulo: 'Suas categorias',
    descricao: 'Revise as categorias disponíveis e ative as que fazem sentido para o seu dia a dia.',
    acaoLabel: '🏷 Ver categorias',
    acaoUrl: '/configuracoes?aba=categorias',
    pularLabel: 'Pular por agora →',
  },
  wizard: {
    emoji: '📊',
    titulo: 'Monte seu planejamento',
    descricao: 'Defina quanto você quer gastar em cada categoria. Seu orçamento, do seu jeito.',
    acaoLabel: '▶ Começar planejamento',
    acaoUrl: '/wizard-planejamento',
    pularLabel: 'Fazer depois →',
  },
}

export default function Onboarding() {
  const navigate = useNavigate()
  const { contas, categorias, setOnboardingCompleto, carregando } = useApp()
  const [step, setStep] = useState<StepId>(() => calcMinStep(contas, categorias))

  useEffect(() => {
    if (carregando) return
    const minStep = calcMinStep(contas, categorias)
    const minIdx  = STEPS_ORDER.indexOf(minStep)
    const curIdx  = STEPS_ORDER.indexOf(step)
    if (minIdx > curIdx) setStep(minStep)
  }, [contas, categorias, carregando]) // eslint-disable-line react-hooks/exhaustive-deps

  const cfg     = STEP_CONFIG[step]
  const stepIdx = STEPS_ORDER.indexOf(step)
  const isLast  = stepIdx === STEPS_ORDER.length - 1

  function handleAcao() {
    navigate(cfg.acaoUrl)
  }

  function handlePular() {
    if (!isLast) {
      setStep(STEPS_ORDER[stepIdx + 1])
    } else {
      setOnboardingCompleto(true)
      navigate('/', { replace: true })
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
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {STEPS_ORDER.map((s, i) => (
            <div key={s} style={{
              width: s === step ? 24 : 8, height: 8, borderRadius: 4,
              background: i < stepIdx
                ? 'rgba(255,255,255,.6)'
                : s === step ? '#fff' : 'rgba(255,255,255,.25)',
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
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 20 }}>{cfg.emoji}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: COR.texto, marginBottom: 12 }}>{cfg.titulo}</div>
          <div style={{ fontSize: 14, color: COR.textoSuave, lineHeight: 1.6, marginBottom: 32 }}>{cfg.descricao}</div>

          <button onClick={handleAcao} style={{
            width: '100%', padding: '14px 20px', border: 'none', borderRadius: 12,
            background: `linear-gradient(135deg, ${COR.azul} 0%, ${COR.azulMedio} 100%)`,
            color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', marginBottom: 12,
            boxShadow: '0 4px 12px rgba(26,86,219,.3)',
          }}>
            {cfg.acaoLabel}
          </button>

          <button onClick={handlePular} style={{
            width: '100%', padding: '12px 20px', border: 'none', borderRadius: 12,
            background: 'transparent', color: COR.textoSuave,
            fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {cfg.pularLabel}
          </button>
        </div>

        <div style={{ marginTop: 20, fontSize: 12, color: COR.textoSuave }}>
          Etapa {stepIdx + 1} de {STEPS_ORDER.length}
        </div>
      </div>
    </div>
  )
}
