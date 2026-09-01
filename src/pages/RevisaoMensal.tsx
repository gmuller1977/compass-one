import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import BottomNav from '../components/BottomNav'
import { usePlanejamento } from '../components/planejamento/usePlanejamento'
import PlanRevisao from '../components/planejamento/PlanRevisao'
import { useApp } from '../context/AppContext'

function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
}

export default function RevisaoMensal() {
  const location = useLocation()
  const isMobile = useIsMobile()
  const { desvioMinPerc } = useApp()

  const anoAtual = new Date().getFullYear()
  const plan     = usePlanejamento(anoAtual)

  function handleAjustar(tipo: 'e' | 's', ri: number, mesInicio: number, valor: number) {
    for (let mi = mesInicio; mi <= 11; mi++) {
      plan.editarValor(tipo, ri, mi, valor)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8faff',
      fontFamily: "-apple-system,'Inter',sans-serif",
      display: 'flex',
      flexDirection: 'column',
    }}>
      {isMobile && <AppHeader currentPath={location.pathname} />}

      <div style={{ flex: 1, overflow: 'auto' }}>
        <PlanRevisao
          anoAtual={anoAtual}
          mesAtual={plan.mesAtual}
          dadosPrevisto={plan.dadosPrevistoFinal}
          categorias={plan.categorias}
          onAjustar={handleAjustar}
          desvioMinPerc={desvioMinPerc}
        />
      </div>

      {isMobile && <BottomNav />}
    </div>
  )
}
