import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import BottomNav from '../components/BottomNav'
import PageHeader from '../components/PageHeader'
import { SeletorAno } from '../components/SeletorMesAno'
import { usePlanejamento } from '../components/planejamento/usePlanejamento'
import { type ViewMode, COR } from '../components/planejamento/types'
import { useApp } from '../context/AppContext'
import DescobertaBanner from '../components/DescobertaBanner'
import DescobertaModal from '../components/DescobertaModal'
import { medirDescoberta } from '../utils/descoberta'
import PlanGrade from '../components/planejamento/PlanGrade'
import PlanPainel from '../components/planejamento/PlanPainel'
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
  // ?ano= permite cair direto no ano que se quer montar — o Simulador manda
  // para ca quando a compra alcanca um ano sem planejamento.
  const [searchParams] = useSearchParams()
  const [anoAtual, setAnoAtual] = useState(
    () => Number(searchParams.get('ano')) || anoCorrente,
  )

  const plan = usePlanejamento(anoAtual)
  const { planos, extratoData, contas, onboardingCompleto, user } = useApp()

  const modoParam = new URLSearchParams(location.search).get('modo')
  const viewMode: ViewMode =
    modoParam === 'painel' ? 'painel'
    : modoParam === 'lista' ? 'lista'
    : 'grade'

  // Plano unico: nao ha mais aba nem escolha de qual plano editar
  const dadosAtivos = plan.dadosPrevistoFinal
  const totaisAtivos = plan.previsto

  // A meta e comparada com o resultado do mes: entradas menos saidas.
  const sobraPrevista = plan.previsto.totalEntradas.map(
    (e: number, i: number) => e - plan.previsto.totalSaidas[i])

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

  // A fase e DERIVADA: onboarding feito e nenhum plano em lugar nenhum. Ver
  // utils/descoberta — nao existe campo guardado que possa discordar disso.
  const descoberta = useMemo(() => medirDescoberta({
    onboardingCompleto, planos, extratoData, contas,
  }), [onboardingCompleto, planos, extratoData, contas])

  // A explicação da fase aparece UMA vez, na primeira entrada sem plano.
  // Depois só pelo "Como funciona" da faixa: um modal que volta a cada visita
  // vira obstáculo, e a tela por trás dele se explica sozinha.
  //
  // O "visto" é por usuário e vive no localStorage — conveniência de leitura
  // de um navegador só, não estado do app. Em aba anônima ou noutro aparelho
  // ele volta, e reaparecer custa um clique; uma coluna no banco custaria
  // migração e mais um estado capaz de discordar dos outros.
  const chaveIntro = `compass:descoberta-intro:${user?.id ?? 'anon'}`
  const [verIntro, setVerIntro] = useState(false)
  const introAvaliada = useRef(false)

  useEffect(() => {
    if (introAvaliada.current || !descoberta.ativa) return
    introAvaliada.current = true
    let visto = false
    try { visto = localStorage.getItem(chaveIntro) === '1' } catch { /* aba anônima */ }
    if (!visto) setVerIntro(true)
  }, [descoberta.ativa, chaveIntro])

  const fecharIntro = useCallback(() => {
    setVerIntro(false)
    try { localStorage.setItem(chaveIntro, '1') } catch { /* aba anônima */ }
  }, [chaveIntro])

  const viewModeLabels: Record<ViewMode, string> = {
    grade: 'Grade', painel: 'Painel', lista: 'Lista',
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
          {(['grade', 'painel', 'lista'] as ViewMode[]).map(v => (
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
        {/* A faixa da fase, acima de qualquer visao: e ela que troca doze
            cartoes cinzas dizendo "Sem Planejamento" por um progresso. */}
        {descoberta.ativa && (
          <div style={{ padding: isMobile ? '10px 12px 0' : '0 20px' }}>
            <DescobertaBanner d={descoberta} onComoFunciona={() => setVerIntro(true)} />
          </div>
        )}

        {verIntro && descoberta.ativa && (
          <DescobertaModal
            d={descoberta}
            onFechar={fecharIntro}
            onMontarPlano={() => { fecharIntro(); navigate('/wizard-planejamento') }}
          />
        )}

        {viewMode === 'grade' ? (
          <PlanGrade
            descoberta={descoberta}
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
            objetivos={plan.objetivos}
            sobraPrevista={sobraPrevista}
            onMetaSave={plan.editarMetas}
          />
        ) : viewMode === 'painel' ? (
          <PlanPainel
            anoAtual={anoAtual}
            mesAtual={plan.mesAtual}
            dadosAtivos={dadosAtivos}
            previsto={totaisAtivos}
            categorias={plan.categorias}
            onSave={handleSave}
            onBulkSave={handleBulkSave}
            objetivos={plan.objetivos}
            sobraPrevista={sobraPrevista}
            onMetaSave={plan.editarMetas}
            dadosAnoAnterior={plan.planoAnoAnterior}
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
            objetivos={plan.objetivos}
            sobraPrevista={sobraPrevista}
            onMetaSave={plan.editarMetas}
            dadosAnoAnterior={plan.planoAnoAnterior}
            totaisReais={plan.totaisReais}
          />
        )}
      </div>

      {isMobile && <BottomNav />}
    </div>
  )
}
