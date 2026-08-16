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

  function renderTopBar() {
    const bloqueado = plan.planejamentoLockado
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? '8px 12px' : '10px 24px',
        background: COR.branco, borderBottom: `1px solid ${COR.borda}`,
        gap: 12, flexWrap: 'wrap',
      }}>
        {/* Abas */}
        {!hideTabs && (
          <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 10, padding: 3 }}>
            {([['meu-plano', 'Meu plano'], ['realizado', 'Atualizado']] as [Aba, string][])
              .filter(([a]) => a !== 'realizado' || plan.realExiste)
              .map(([a, label]) => (
                <button
                  key={a}
                  onClick={() => setAba(a)}
                  style={{
                    border: 'none', borderRadius: 8, padding: '6px 16px',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: aba === a ? COR.branco : 'transparent',
                    color: aba === a ? COR.azul : COR.textoSuave,
                    boxShadow: aba === a ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
                    transition: 'all .15s',
                  }}
                >
                  {label}
                  {a === 'meu-plano' && bloqueado ? ' 🔒' : ''}
                </button>
              ))}
          </div>
        )}

        {/* Controles a direita */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
          {/* Seletor de view — apenas no mobile */}
          {isMobile && (
            <div style={{ display: 'flex', gap: 2, background: '#f1f5f9', borderRadius: 8, padding: 2 }}>
              {([
                ['grade', 'Grade'],
                ['lista', 'Lista'],
              ] as [ViewMode, string][]).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => navigate(`?modo=${v === 'grade' ? '' : v}`, { replace: true })}
                  style={{
                    border: 'none', borderRadius: 6, padding: '5px 10px',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: viewMode === v ? COR.branco : 'transparent',
                    color: viewMode === v ? COR.azul : COR.textoSuave,
                    boxShadow: viewMode === v ? '0 1px 3px rgba(0,0,0,.06)' : 'none',
                  }}
                >{label}</button>
              ))}
            </div>
          )}

          {/* Navegacao de ano */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setAnoAtual(a => a - 1)}
              style={{ border: 'none', background: '#f1f5f9', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 14 }}
            >◄</button>
            <span style={{ fontSize: 14, fontWeight: 700, color: COR.texto, minWidth: 40, textAlign: 'center' }}>{anoAtual}</span>
            <button
              onClick={() => setAnoAtual(a => a + 1)}
              style={{ border: 'none', background: '#f1f5f9', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 14 }}
            >►</button>
          </div>

          {/* Botao Ativar plano */}
          {aba === 'meu-plano' && !plan.planejamentoLockado && (
            <button
              onClick={handleAtivar}
              style={{
                border: 'none', borderRadius: 10, padding: '8px 18px',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                background: COR.verde, color: '#fff',
                boxShadow: '0 2px 8px rgba(22,163,74,.3)',
              }}
              title="Ao ativar, o plano vira sua referencia. Voce podera acompanhar o realizado vs planejado."
            >
              Ativar plano
            </button>
          )}

          {/* Botao Aplicar mudancas */}
          {aba === 'meu-plano' && plan.planejamentoLockado && plan.realExiste && (
            <button
              onClick={handleAtualizar}
              style={{
                border: 'none', borderRadius: 10, padding: '8px 18px',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                background: COR.azul, color: '#fff',
              }}
            >
              Aplicar mudancas
            </button>
          )}
        </div>
      </div>
    )
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
            breadcrumb="MEU PLANO"
            title="Planejamento"
            subtitle={`${anoAtual} · Visão ${viewModeLabels[viewMode] ?? 'Grade'}`}
            mb={12}
            rightContent={
              <>
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

      {renderTopBar()}
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
