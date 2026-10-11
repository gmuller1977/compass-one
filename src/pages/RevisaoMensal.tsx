import { useState, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import BottomNav from '../components/BottomNav'
import { usePlanejamento } from '../components/planejamento/usePlanejamento'
import PlanRevisao from '../components/planejamento/PlanRevisao'
import { useApp } from '../context/AppContext'
import { COR } from '../utils/cores'
import { useMesDaInicio } from '../components/inicio/useMesDaInicio'
import { comparativoMensal } from '../utils/comparativoMensal'
import { precisaoDoPlano } from '../utils/precisaoDoPlano'
import ComparativoMensal from '../components/inicio/ComparativoMensal'
import PrecisaoCard from '../components/inicio/PrecisaoCard'

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
  const { desvioMinPerc, planos, categorias } = useApp()

  const anoAtual = new Date().getFullYear()
  const plan     = usePlanejamento(anoAtual)

  // O histórico que morava em Análises (removida em 11/10/2026): como os
  // meses se comportaram contra o plano. Mesmas funções, mesmos números.
  const hoje = new Date()
  const { deps } = useMesDaInicio(hoje.getFullYear(), hoje.getMonth())
  const comparativo = useMemo(() => comparativoMensal(deps, planos), [deps, planos])
  const precisao = useMemo(() => precisaoDoPlano(comparativo), [comparativo])

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

        {(comparativo.length >= 2 || precisao) && (
          <div style={{ maxWidth: 860, margin: '0 auto', padding: isMobile ? '8px 14px 90px' : '8px 28px 40px',
            display: 'flex', flexDirection: 'column', gap: 12 }}>
            {comparativo.length >= 2 && (
              <>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: COR.texto, margin: '8px 0 0' }}>Mês a mês</h2>
                <div style={{ fontSize: 13, color: COR.textoSuave, marginTop: -8 }}>
                  Receitas e despesas contra o plano, e cada categoria ao longo dos meses
                </div>
                <ComparativoMensal meses={comparativo} categorias={categorias} isMobile={isMobile} visaoInicial="total" />
              </>
            )}
            {precisao && (
              <>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: COR.texto, margin: '8px 0 0' }}>Precisão do plano</h2>
                <div style={{ fontSize: 13, color: COR.textoSuave, marginTop: -8 }}>Onde o plano costuma errar</div>
                <PrecisaoCard p={precisao} categorias={categorias} isMobile={isMobile} />
              </>
            )}
          </div>
        )}
      </div>

      {isMobile && <BottomNav />}
    </div>
  )
}
