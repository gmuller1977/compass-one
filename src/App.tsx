import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { ToastProvider } from './components/Toast'
import Sidebar, { SIDEBAR_W } from './components/Sidebar'
import Login          from './pages/Login'
import Cadastro       from './pages/Cadastro'
import Dashboard      from './pages/Dashboard'
import QuickLaunch    from './pages/QuickLaunch'
import NovoLancamento from './pages/NovoLancamento'
import Planejamento    from './pages/Planejamento'
import Acompanhamento  from './pages/Acompanhamento'
import Configuracoes       from './pages/Configuracoes'
import Onboarding          from './pages/Onboarding'
import WizardPlanejamento  from './pages/WizardPlanejamento'
import Simulacao           from './pages/Simulacao'
import RevisaoMensal       from './pages/RevisaoMensal'
import RedefinirSenha      from './pages/RedefinirSenha'
import TermosDeUso         from './pages/TermosDeUso'
import PoliticaPrivacidade from './pages/PoliticaPrivacidade'
import LandingPage         from './pages/LandingPage'
import AurixPage          from './pages/Aurix'
import NorthAgent          from './components/NorthAgent'
import AurixToast          from './components/aurix/AurixToast'
import { supabase } from './lib/supabase'
import { creditarAurix, atualizarStreak } from './utils/aurix'
import { dispararToastAurix } from './components/aurix/AurixToast'

function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
}

function AppShell({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile()
  const { user } = useApp()

  useEffect(() => {
    if (!user?.id) return
    const userId = user.id

    async function iniciarSessao() {
      const r = await creditarAurix(userId, 'acao', 'Login diário', 3, 'acao_login')
      if (r) dispararToastAurix({ tipo: 'acao', titulo: 'Login diário', pontos: 3 })

      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('streak_atual, maior_streak, ultimo_acesso_ativo')
        .eq('user_id', userId)
        .single()

      if (prefs) {
        const { novoStreak, bonusGanho } = await atualizarStreak(
          userId,
          prefs.streak_atual ?? 0,
          prefs.maior_streak ?? 0,
          prefs.ultimo_acesso_ativo ?? null
        )
        if (bonusGanho) {
          dispararToastAurix({ tipo: 'acao', titulo: `Streak de ${novoStreak} dias!`, pontos: 50 })
        }
      }
    }

    iniciarSessao()
  }, [user?.id])

  if (isMobile) return <>{children}<NorthAgent /><AurixToast /></>
  return (
    <>
      <Sidebar />
      <div style={{ marginLeft: SIDEBAR_W }}>
        {children}
      </div>
      <NorthAgent />
      <AurixToast />
    </>
  )
}

function LoadingSpinner() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', fontFamily: "-apple-system,'Inter',sans-serif",
      color: '#64748b', fontSize: 14, gap: 10,
    }}>
      <svg style={{ animation: 'spin 1s linear infinite' }} width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="8" stroke="#e2e8f0" strokeWidth="2.5" />
        <path d="M10 2a8 8 0 0 1 8 8" stroke="#1a56db" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      Carregando...
    </div>
  )
}

function HomeRoute() {
  const { user, carregando, onboardingCompleto } = useApp()
  const isMobile = useIsMobile()
  if (carregando) return <LoadingSpinner />
  if (!user) return <LandingPage />
  if (!onboardingCompleto) return <Navigate to="/onboarding" replace />
  if (!isMobile) return <Navigate to="/dashboard" replace />
  return <AppShell><QuickLaunch /></AppShell>
}

function Protegido({ children }: { children: ReactNode }) {
  const { user, carregando, onboardingCompleto } = useApp()
  const location = useLocation()
  if (carregando) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" replace />
  const bypass = ['/onboarding', '/configuracoes', '/wizard-planejamento']
  if (!onboardingCompleto && !bypass.some(p => location.pathname.startsWith(p))) {
    return <Navigate to="/onboarding" replace />
  }
  return <AppShell>{children}</AppShell>
}

export default function App() {
  return (
    <AppProvider>
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"           element={<Login />} />
          <Route path="/cadastro"        element={<Cadastro />} />
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />
          <Route path="/termos"          element={<TermosDeUso />} />
          <Route path="/privacidade"     element={<PoliticaPrivacidade />} />
          <Route path="/"                element={<HomeRoute />} />
          <Route path="/dashboard"       element={<Protegido><Dashboard /></Protegido>} />
          <Route path="/planejamento"    element={<Protegido><Planejamento /></Protegido>} />
          <Route path="/evolucao"       element={<Protegido><Acompanhamento /></Protegido>} />
          <Route path="/acompanhamento" element={<Navigate to="/evolucao" replace />} />
          <Route path="/novo-lancamento"    element={<Protegido><NovoLancamento /></Protegido>} />
          <Route path="/configuracoes"      element={<Protegido><Configuracoes /></Protegido>} />
          <Route path="/onboarding"         element={<Protegido><Onboarding /></Protegido>} />
          <Route path="/wizard-planejamento" element={<Protegido><WizardPlanejamento /></Protegido>} />
          <Route path="/simulacao"          element={<Protegido><Simulacao /></Protegido>} />
          <Route path="/revisaomensal"      element={<Protegido><RevisaoMensal /></Protegido>} />
          <Route path="/aurix"             element={<Protegido><AurixPage /></Protegido>} />
          <Route path="*"                   element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
    </AppProvider>
  )
}
