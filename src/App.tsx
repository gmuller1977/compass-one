import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { ToastProvider } from './components/Toast'
import Sidebar, { SIDEBAR_W } from './components/Sidebar'
import Login          from './pages/Login'
import Cadastro       from './pages/Cadastro'
import Dashboard      from './pages/Dashboard'
import QuickLaunch    from './pages/QuickLaunch'
import Bussola        from './pages/Bussola'
import Norte from './pages/Norte'
import NovoLancamento from './pages/NovoLancamento'
import Planejamento    from './pages/Planejamento'
import RadarFinanceiro from './pages/RadarFinanceiro'
import Configuracoes       from './pages/Configuracoes'
import WizardPlanejamento  from './pages/WizardPlanejamento'
import Simulacao           from './pages/Simulacao'
import RevisaoMensal       from './pages/RevisaoMensal'
import RedefinirSenha      from './pages/RedefinirSenha'
import TermosDeUso         from './pages/TermosDeUso'
import PoliticaPrivacidade from './pages/PoliticaPrivacidade'
import LandingPage         from './pages/LandingPage'
import Indicar             from './pages/Indicar'
import PrimeiroAcesso      from './pages/PrimeiroAcesso'
import { CHAVE_PRIMEIRO_ACESSO, vaiParaPrimeiroAcesso } from './utils/primeiroAcesso'
import { jaViu } from './utils/vistoNaConta'
import { guardarCodigoRecebido, registrarIndicacaoPendente } from './utils/indicacao'
import AvisoInatividade from './components/AvisoInatividade'
import IndicadorGravacao from './components/IndicadorGravacao'
import { SincronizarLembrete } from './components/LembreteDiario'
import { NORTE_ATIVO } from './utils/norteAtivo'
import AvisoNovaVersao from './components/AvisoNovaVersao'
import ConviteCompartilhamento from './components/compartilhar/ConviteCompartilhamento'
import AvisoPermissao from './components/compartilhar/AvisoPermissao'

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

  // Quem chegou por um link de indicação fica registrado no 1º acesso.
  useEffect(() => {
    if (!user?.id) return
    registrarIndicacaoPendente(user.id, user.user_metadata?.indicado_por)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isMobile) return <>{children}<AvisoInatividade /><IndicadorGravacao /><SincronizarLembrete /><AvisoNovaVersao /><ConviteCompartilhamento /><AvisoPermissao /></>
  return (
    <>
      <Sidebar />
      <AvisoInatividade />
      <div style={{ marginLeft: SIDEBAR_W }}>
        {children}
      </div>
      <IndicadorGravacao />
      <SincronizarLembrete />
      <AvisoNovaVersao />
      <ConviteCompartilhamento />
      <AvisoPermissao />
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

/** /i/<código>: guarda quem indicou e segue para a página inicial. */
function ReceberIndicacao() {
  const { codigo } = useParams()
  if (codigo) guardarCodigoRecebido(codigo)
  return <Navigate to="/" replace />
}

/** Onde fica quem ainda não terminou o começo: o primeiro acesso ou Configurações. */
function useInicioDoNovo() {
  const { user, contas, compartilhamento } = useApp()
  return vaiParaPrimeiroAcesso({
    onboardingCompleto: false, temConta: contas.length > 0,
    membro: compartilhamento.papel === 'membro', visto: jaViu(user, CHAVE_PRIMEIRO_ACESSO),
  }) ? '/primeiro-acesso' : '/configuracoes'
}

function HomeRoute() {
  const { user, carregando, onboardingCompleto } = useApp()
  const isMobile = useIsMobile()
  const inicioDoNovo = useInicioDoNovo()
  if (carregando) return <LoadingSpinner />
  if (!user) return <LandingPage />
  if (!onboardingCompleto) return <Navigate to={inicioDoNovo} replace />
  if (!isMobile) return <Navigate to="/dashboard" replace />
  return <AppShell><Bussola /></AppShell>
}

/**
 * Telas só do celular. No computador cada uma tem a sua equivalente completa:
 * o lançamento rápido é Lançamentos, e o "Posso comprar?" é o Simulador.
 */
function SoNoCelular({ children, senao }: { children: ReactNode; senao: string }) {
  const isMobile = useIsMobile()
  if (!isMobile) return <Navigate to={senao} replace />
  return <Protegido>{children}</Protegido>
}

/**
 * Telas só do computador. A Início do computador (Dashboard) no celular é a
 * Bússola, na "/": link antigo para /dashboard não abre a versão web ali.
 */
function SoNoComputador({ children, senao }: { children: ReactNode; senao: string }) {
  const isMobile = useIsMobile()
  if (isMobile) return <Navigate to={senao} replace />
  return <Protegido>{children}</Protegido>
}

/** Sem AppShell: o primeiro acesso ocupa a tela inteira. Quem já terminou volta para a "/". */
function RotaPrimeiroAcesso() {
  const { user, carregando, onboardingCompleto } = useApp()
  if (carregando) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" replace />
  if (onboardingCompleto) return <Navigate to="/" replace />
  return <PrimeiroAcesso />
}

function Protegido({ children }: { children: ReactNode }) {
  const { user, carregando, onboardingCompleto } = useApp()
  const location = useLocation()
  const inicioDoNovo = useInicioDoNovo()
  if (carregando) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" replace />
  // Conta nova começa pelo primeiro acesso (17/10/2026). Quem escolheu
  // configurar sozinho, ou já tinha cadastrado uma conta, fica em
  // Configurações até ter conta e categoria ativa (PrimeirosPassos).
  const bypass = ['/configuracoes', '/wizard-planejamento']
  if (!onboardingCompleto && !bypass.some(p => location.pathname.startsWith(p))) {
    return <Navigate to={inicioDoNovo} replace />
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
          <Route path="/lancar"          element={<SoNoCelular senao="/novo-lancamento"><QuickLaunch /></SoNoCelular>} />
          <Route path="/norte"           element={NORTE_ATIVO ? <Protegido><Norte /></Protegido> : <Navigate to="/" replace />} />
          <Route path="/posso-comprar"   element={<Navigate to="/simulacao" replace />} />
          <Route path="/dashboard"       element={<SoNoComputador senao="/"><Dashboard /></SoNoComputador>} />
          <Route path="/analises"        element={<Navigate to="/revisaomensal" replace />} />
          <Route path="/planejamento"    element={<Protegido><Planejamento /></Protegido>} />
          <Route path="/radar"           element={<Protegido><RadarFinanceiro /></Protegido>} />
          <Route path="/painel"          element={<Navigate to="/radar" replace />} />
          <Route path="/evolucao"       element={<Navigate to="/radar" replace />} />
          <Route path="/acompanhamento" element={<Navigate to="/radar" replace />} />
          <Route path="/novo-lancamento"    element={<Protegido><NovoLancamento /></Protegido>} />
          <Route path="/configuracoes"      element={<Protegido><Configuracoes /></Protegido>} />
          <Route path="/onboarding"         element={<Navigate to="/" replace />} />
          <Route path="/primeiro-acesso"    element={<RotaPrimeiroAcesso />} />
          <Route path="/wizard-planejamento" element={<Protegido><WizardPlanejamento /></Protegido>} />
          <Route path="/simulacao"          element={<Protegido><Simulacao /></Protegido>} />
          <Route path="/resumo-mensal"      element={<Navigate to="/revisaomensal" replace />} />
          <Route path="/revisaomensal"      element={<Protegido><RevisaoMensal /></Protegido>} />
          <Route path="/indicar"           element={<Protegido><Indicar /></Protegido>} />
          <Route path="/aurix"             element={<Navigate to="/indicar" replace />} />
          <Route path="/i/:codigo"         element={<ReceberIndicacao />} />
          <Route path="*"                   element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
    </AppProvider>
  )
}
