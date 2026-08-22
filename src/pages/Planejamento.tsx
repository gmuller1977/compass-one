import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import BottomNav from '../components/BottomNav'
import PageHeader, { PH_BTN_WHITE, PH_BTN_WHITE_ACTIVE } from '../components/PageHeader'
import { usePlanejamento } from '../components/planejamento/usePlanejamento'
import { type Aba, type ViewMode, COR } from '../components/planejamento/types'
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

export default function Planejamento({
  defaultAba = 'meu-plano',
  hideTabs = false,
}: {
  defaultAba?: Aba
  hideTabs?: boolean
} = {}) {
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useIsMobile()

  const anoCorrente = new Date().getFullYear()
  const [anoAtual, setAnoAtual] = useState(anoCorrente)

  const plan = usePlanejamento(anoAtual)

  const [aba, setAba] = useState<Aba>(() => {
    const fromState = (location.state as any)?.aba
    if (fromState === 'meu-plano' || fromState === 'realizado' || fromState === 'revisao') return fromState
    if (defaultAba !== 'meu-plano') return defaultAba
    return (plan.planejamentoLockado && plan.realExiste) ? 'realizado' : 'meu-plano'
  })

  const modoParam = new URLSearchParams(location.search).get('modo')
  const viewMode: ViewMode =
    modoParam === 'planilha' ? 'planilha'
    : modoParam === 'lista' ? 'lista'
    : 'grade'

  const dadosAtivos = aba === 'realizado' ? plan.dadosRealizadoFinal : plan.dadosPrevistoFinal
  const totaisAtivos = aba === 'realizado' ? plan.realizadoPlan : plan.previsto

  function handleSave(tipo: 'e' | 's', ri: number, mi: number, valor: number) {
    plan.editarValor(tipo, ri, mi, valor, aba)
  }

  function handleAtivar() {
    plan.ativarPlano()
    setAba('realizado')
  }

  function handleAtualizar() {
    plan.atualizarPlano()
    setAba('realizado')
  }

  function renderAvisoPlanoBloqueado() {
    if (!plan.planejamentoLockado || aba !== 'meu-plano') return null
    return (
      <div style={{
        margin: '12px 20px 0', padding: '10px 16px',
        background: '#eff6ff', border: '1px solid #bfdbfe',
        borderRadius: 10, fontSize: 12, color: COR.azulEscuro,
      }}>
        Este plano esta ativo. Para editar valores, use a aba <strong>Realizado</strong> ou clique em "Aplicar mudancas" apos editar aqui.
      </div>
    )
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
            subtitle={`Visão ${viewModeLabels[viewMode] ?? 'Grade'}`}
            mb={12}
            rightContent={
              <>
                {/* Aba toggle */}
                {!hideTabs && (
                  <>
                    {(['meu-plano', 'realizado'] as Aba[])
                      .filter(a => a !== 'realizado' || plan.realExiste)
                      .map(a => (
                        <button key={a} onClick={() => setAba(a)} style={aba === a ? PH_BTN_WHITE_ACTIVE : PH_BTN_WHITE}>
                          {a === 'meu-plano' ? `Meu plano${plan.planejamentoLockado ? ' 🔒' : ''}` : 'Atualizado'}
                        </button>
                      ))}
                  </>
                )}
                {/* Ativar / Aplicar */}
                {aba === 'meu-plano' && !plan.planejamentoLockado && (
                  <button onClick={handleAtivar} style={{ ...PH_BTN_WHITE_ACTIVE, background: COR.verde }}>
                    Ativar plano
                  </button>
                )}
                {aba === 'meu-plano' && plan.planejamentoLockado && plan.realExiste && (
                  <button onClick={handleAtualizar} style={PH_BTN_WHITE_ACTIVE}>
                    Aplicar mudanças
                  </button>
                )}
                {/* View mode */}
                {(['grade', 'planilha', 'lista'] as ViewMode[]).map(v => (
                  <button
                    key={v}
                    onClick={() => navigate(`?modo=${v === 'grade' ? '' : v}`, { replace: true })}
                    style={viewMode === v ? PH_BTN_WHITE_ACTIVE : PH_BTN_WHITE}
                  >
                    {viewModeLabels[v]}
                  </button>
                ))}
              </>
            }
          />
        </div>
      )}

      {/* Mobile: aba toggle */}
      {isMobile && !hideTabs && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', background: COR.branco, borderBottom: `1px solid ${COR.borda}`,
          gap: 8, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 10, padding: 3 }}>
            {(['meu-plano', 'realizado'] as Aba[])
              .filter(a => a !== 'realizado' || plan.realExiste)
              .map(a => (
                <button
                  key={a}
                  onClick={() => setAba(a)}
                  style={{
                    border: 'none', borderRadius: 8, padding: '6px 14px',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: aba === a ? COR.branco : 'transparent',
                    color: aba === a ? COR.azul : COR.textoSuave,
                    boxShadow: aba === a ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
                  }}
                >
                  {a === 'meu-plano' ? `Meu plano${plan.planejamentoLockado ? ' 🔒' : ''}` : 'Atualizado'}
                </button>
              ))}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['grade', 'lista'] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => navigate(`?modo=${v === 'grade' ? '' : v}`, { replace: true })}
                style={{
                  border: 'none', borderRadius: 6, padding: '5px 10px',
                  fontSize: 12, cursor: 'pointer', background: '#f1f5f9',
                  color: viewMode === v ? COR.azul : COR.textoSuave,
                  fontWeight: viewMode === v ? 700 : 500,
                }}
              >{viewModeLabels[v]}</button>
            ))}
          </div>
        </div>
      )}

      {renderAvisoPlanoBloqueado()}

      <div style={{ flex: 1, overflow: 'auto' }}>
        {viewMode === 'grade' ? (
          <PlanGrade
            aba={aba as 'meu-plano' | 'realizado'}
            anoAtual={anoAtual}
            mesAtual={plan.mesAtual}
            dadosPrevisto={plan.dadosPrevistoFinal}
            dadosRealizado={plan.realExiste ? plan.dadosRealizadoFinal : null}
            previsto={plan.previsto}
            realizadoPlan={plan.realizadoPlan}
            lancadoPorCatMes={plan.lancadoPorCatMes}
            planoRef={plan.planoRef as any}
            categorias={plan.categorias}
            hasFaturaCat={plan.hasFaturaCat}
            somaCartaoMes={plan.somaCartaoMes}
            planejamentoLockado={plan.planejamentoLockado}
            setAnoAtual={setAnoAtual}
            onSave={handleSave}
          />
        ) : viewMode === 'planilha' ? (
          <PlanPlanilha
            aba={aba as 'meu-plano' | 'realizado'}
            anoAtual={anoAtual}
            mesAtual={plan.mesAtual}
            dadosAtivos={dadosAtivos}
            previsto={totaisAtivos}
            planejamentoLockado={plan.planejamentoLockado}
            categorias={plan.categorias}
            setAnoAtual={setAnoAtual}
            onSave={handleSave}
            lancadoPorCatMes={aba === 'realizado' ? plan.lancadoPorCatMes : undefined}
          />
        ) : (
          <PlanLista
            aba={aba as 'meu-plano' | 'realizado'}
            anoAtual={anoAtual}
            mesAtual={plan.mesAtual}
            dadosAtivos={dadosAtivos}
            previsto={totaisAtivos}
            planejamentoLockado={plan.planejamentoLockado}
            categorias={plan.categorias}
            onSave={handleSave}
            lancadoPorCatMes={aba === 'realizado' ? plan.lancadoPorCatMes : undefined}
            totaisReais={plan.totaisReais}
          />
        )}
      </div>

      {isMobile && <BottomNav />}
    </div>
  )
}
