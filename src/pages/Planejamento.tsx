import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import BottomNav from '../components/BottomNav'
import PageHeader from '../components/PageHeader'
import { SeletorAno } from '../components/SeletorMesAno'
import { usePlanejamento } from '../components/planejamento/usePlanejamento'
import { type ViewMode, COR } from '../components/planejamento/types'
import PlanGrade from '../components/planejamento/PlanGrade'
import PlanPlanilha from '../components/planejamento/PlanPlanilha'
import PlanLista from '../components/planejamento/PlanLista'

function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
}

export default function Planejamento() {
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useIsMobile()

  const anoCorrente = new Date().getFullYear()
  const [anoAtual, setAnoAtual] = useState(anoCorrente)

  const plan = usePlanejamento(anoAtual)

  const modoParam = new URLSearchParams(location.search).get('modo')
  const viewMode: ViewMode =
    modoParam === 'planilha' ? 'planilha'
    : modoParam === 'lista' ? 'lista'
    : 'grade'

  // Plano unico: nao ha mais aba nem escolha de qual plano editar
  const dadosAtivos = plan.dadosPrevistoFinal
  const totaisAtivos = plan.previsto

  function handleSave(tipo: 'e' | 's', ri: number, mi: number, valor: number) {
    plan.editarValor(tipo, ri, mi, valor)
  }

  const BTN_ANO_MOB: React.CSSProperties = {
    border: 'none', background: '#f1f5f9', borderRadius: 6, cursor: 'pointer',
    padding: '5px 8px', color: COR.textoSuave, fontSize: 11, lineHeight: 1,
  }


  function handleBulkSave(ops: { tipo: 'e' | 's'; ri: number; mi: number; valor: number }[]) {
    plan.editarMultiplosValores(ops)
  }

  const viewModeLabels: Record<ViewMode, string> = {
    grade: 'Grade', planilha: 'Planilha', lista: 'Lista',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: COR.fundo,
      fontFamily: "-apple-system, 'Inter', sans-serif",
      display: 'flex',
      flexDirection: 'column',
    }}>
      {isMobile && <AppHeader currentPath={location.pathname} />}

      {/* PageHeader — desktop only */}
      {!isMobile && (
        <div style={{ padding: '12px 16px 0', flexShrink: 0 }}>
          <PageHeader
            icon="ti-target"
            breadcrumb="TODO ANO"
            title="Planejamento"
            mb={12}
            rightContent={<SeletorAno ano={anoAtual} onChange={setAnoAtual} />}
          />
        </div>
      )}

      {/* Mobile: seletor de visão */}
      {isMobile && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '8px 12px', background: COR.branco, borderBottom: `1px solid ${COR.borda}`,
        }}>
          {(['grade', 'planilha', 'lista'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => navigate(`?modo=${v === 'grade' ? '' : v}`, { replace: true })}
              style={{
                border: 'none', borderRadius: 8, padding: '6px 14px',
                fontSize: 13, fontWeight: viewMode === v ? 700 : 500, cursor: 'pointer',
                background: viewMode === v ? '#eff6ff' : '#f1f5f9',
                color: viewMode === v ? COR.azul : COR.textoSuave,
              }}
            >{viewModeLabels[v]}</button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
            <button onClick={() => setAnoAtual(a => a - 1)} aria-label="Ano anterior" style={BTN_ANO_MOB}>◄</button>
            <span style={{ fontSize: 13, fontWeight: 800, color: COR.texto, minWidth: 38,
              textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{anoAtual}</span>
            <button onClick={() => setAnoAtual(a => a + 1)} aria-label="Próximo ano" style={BTN_ANO_MOB}>►</button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto' }}>
        {viewMode === 'grade' ? (
          <PlanGrade
            anoAtual={anoAtual}
            mesAtual={plan.mesAtual}
            dadosPrevisto={plan.dadosPrevistoFinal}
            dadosAnoAnterior={plan.planoAnoAnterior}
            previsto={plan.previsto}
            planoRef={plan.planoRef}
            categorias={plan.categorias}
            hasFaturaCat={plan.hasFaturaCat}
            somaCartaoMes={plan.somaCartaoMes}
            onSave={handleSave}
            onBulkSave={handleBulkSave}
            ancoraMes={plan.ancoraMes}
          />
        ) : viewMode === 'planilha' ? (
          <PlanPlanilha
            anoAtual={anoAtual}
            mesAtual={plan.mesAtual}
            dadosAtivos={dadosAtivos}
            previsto={totaisAtivos}
            categorias={plan.categorias}
            onSave={handleSave}
            onBulkSave={handleBulkSave}
            dadosAnoAnterior={plan.planoAnoAnterior}
            ancoraMes={plan.ancoraMes}
          />
        ) : (
          <PlanLista
            anoAtual={anoAtual}
            mesAtual={plan.mesAtual}
            dadosAtivos={dadosAtivos}
            previsto={totaisAtivos}
            categorias={plan.categorias}
            onSave={handleSave}
            onBulkSave={handleBulkSave}
            dadosAnoAnterior={plan.planoAnoAnterior}
            ancoraMes={plan.ancoraMes}
            totaisReais={plan.totaisReais}
          />
        )}
      </div>

      {isMobile && <BottomNav />}
    </div>
  )
}
