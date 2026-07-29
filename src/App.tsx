import type { ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { ToastProvider } from './components/Toast'
import Login          from './pages/Login'
import Cadastro       from './pages/Cadastro'
import Dashboard      from './pages/Dashboard'
import QuickLaunch    from './pages/QuickLaunch'
import NovoLancamento from './pages/NovoLancamento'
import Planejamento    from './pages/Planejamento'
import Acompanhamento  from './pages/Acompanhamento'
import Configuracoes   from './pages/Configuracoes'

function Protegido({ children }: { children: ReactNode }) {
  const { user, carregando } = useApp()
  if (carregando) return (
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
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <AppProvider>
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/"                element={<Protegido><QuickLaunch /></Protegido>} />
          <Route path="/dashboard"       element={<Protegido><Dashboard /></Protegido>} />
          <Route path="/planejamento"    element={<Protegido><Planejamento /></Protegido>} />
          <Route path="/acompanhamento" element={<Protegido><Acompanhamento /></Protegido>} />
          <Route path="/novo-lancamento" element={<Protegido><NovoLancamento /></Protegido>} />
          <Route path="/configuracoes"   element={<Protegido><Configuracoes /></Protegido>} />
          <Route path="*"               element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
    </AppProvider>
  )
}
