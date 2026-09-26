import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { DadosMes } from '../context/AppContext'
import { construirRealizadoMes } from '../utils/realizadoMes'
import { saldoBancosEDinheiro, memoriaDoRadar, type Deps } from '../utils/saldoConta'
import { serieBaseDoPlano, piorMesDaSerie } from '../utils/simulacaoCompra'
import { MemoriaSaldo } from '../components/novoLancamentoExtrato/NleExtrato'
import { RADAR_COR_AZUL } from '../components/acompanhamento/radarCores'
import { nomesDeCartao, totaisDoMes, norm } from '../components/acompanhamento/evolucaoCalcs'
import { supabase } from '../lib/supabase'
import AppHeader from '../components/AppHeader'
import PageHeader, { PH_BTN_SOLID } from '../components/PageHeader'
import SeletorMesAno from '../components/SeletorMesAno'
import TutorialCard from '../components/TutorialCard'
import { COR } from '../utils/cores'
import { creditarAurix, saldoAurix, acoesHoje } from '../utils/aurix'
import { dispararToastAurix } from '../components/aurix/AurixToast'
import KpiCard from '../components/KpiCard'

const ACOES_DIARIAS_REFS = ['acao_login', 'acao_dashboard', 'acao_lancamento', 'acao_north', 'acao_evolucao']
const ACOES_DIARIAS_TOTAL = 5

type SimAtivaRow = {
  id: string
  tipo: 'divida' | 'meta'
  nome: string
  valor_total: number
  parcela: number
  resultado_meses: number
  data_conclusao: string
  integrado_planejamento: boolean
  created_at: string
}

function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
}


const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function mesKey(conta: string, ano: number, mes: number) {
  return `${conta}-${ano}-${String(mes + 1).padStart(2, '0')}`
}

type CompassStatus = 'verde' | 'amarelo' | 'vermelho' | 'sem-plano' | 'sem-dados'

const COMPASS_CFG: Record<CompassStatus, {
  bg: string; border: string; cor: string; icon: string; title: string; msg: (s: number, e: number) => string
}> = {
  verde:     { bg: '#f0fdf4', border: '#86efac', cor: '#16a34a', icon: '🧭', title: 'Você está no caminho certo!',          msg: (s) => `No caminho certo. Resultado positivo de +${fmt(s)} este mês.` },
  amarelo:   { bg: '#fffbeb', border: '#fde68a', cor: '#b45309', icon: '⚠️', title: 'Atenção!',                             msg: () => 'Atenção. Suas despesas estão perto do limite planejado para este mês.' },
  vermelho:  { bg: '#fff1f2', border: '#fecdd3', cor: '#dc2626', icon: '🔴', title: 'Fora do rumo.',                        msg: (_s, e) => `Acima do planejado. Despesas ultrapassaram o previsto em ${fmt(e)}.` },
  'sem-plano': { bg: '#f8faff', border: '#c7d7fd', cor: '#1a56db', icon: '🧭', title: 'Sem planejamento ainda',             msg: () => 'Crie seu planejamento para ativar a bússola e acompanhar seu progresso.' },
  'sem-dados': { bg: COR.fundo,  border: COR.borda,  cor: COR.textoSuave, icon: '📊', title: 'Sem movimentação',           msg: () => 'Sem movimentação este mês. Registre sua primeira despesa ou receita para ativar a bússola.' },
}

export default function Dashboard() {
  const navigate  = useNavigate()
  const isMobile  = useIsMobile()
  const {
    contas, categorias, extratoData, faturaData, planos, perfil, user, objetivoUsuario,
    saldoInicialDinheiro, cenarioPrevisao, setCenarioPrevisao,
  } = useApp()

  const hoje = new Date()
  const [viewMes, setViewMes] = useState(hoje.getMonth())
  const [viewAno, setViewAno] = useState(hoje.getFullYear())

  const nome = perfil.apelido || perfil.nome.split(' ')[0] || user?.email?.split('@')[0] || 'Usuário'


  // ── Cálculos do mês ──────────────────────────────────────────────────
  // Nenhum número desta tela é calculado aqui: saldo, receitas, despesas e
  // planejado saem das MESMAS funções do Radar, e os dois concordam sobre o
  // mesmo mês por construção. Antes a Início somava só o extrato — sem fixa,
  // sem compra no cartão, sem a carteira, com transferência entre contas
  // contada como despesa — e o saldo partia do cadastro da conta, ignorando
  // todo mês anterior e toda conciliação.
  const { totalEntradas, totalSaidas, totalPrevS, topCategorias } = useMemo(() => {
    const planoAno = planos[viewAno]
    const { saidasMap, entradasMap } = construirRealizadoMes({
      ano: viewAno, mes: viewMes, extratoData: extratoData as Record<string, DadosMes>,
      faturaData, contas, categorias, planoAno,
    })
    const t = totaisDoMes({ mes: viewMes, planoAno, categorias, cartaoNomes: nomesDeCartao(contas), entradasMap, saidasMap })

    // Por (nome, variante), como as linhas do Radar: Seguro · Civic e
    // Seguro · March são duas despesas, não uma.
    const topCategorias = t.saida.linhas
      .filter(l => l.real > 0)
      .sort((a, b) => b.real - a.real).slice(0, 4)
      .map(l => {
        const cat = categorias.find(c => c.tipo === 'saida' && norm(c.nome) === norm(l.nome) && norm(c.descricao) === l.descricao)
          ?? categorias.find(c => norm(c.nome) === norm(l.nome))
        return {
          chave: `${l.nome}||${l.descricao}`,
          nome: l.descricao ? `${l.nome} · ${l.descricao}` : l.nome,
          gasto: l.real, cor: cat?.cor ?? COR.azul, icone: cat?.icone ?? '📌',
        }
      })

    return { totalEntradas: t.entrada.real, totalSaidas: t.saida.real, totalPrevS: t.saida.prev, topCategorias }
  }, [contas, categorias, extratoData, faturaData, planos, viewMes, viewAno])

  // As dependências do motor de saldo, as MESMAS do Radar — com o cenário.
  const deps = useMemo<Deps>(() => ({
    extratoData: extratoData as Record<string, DadosMes>,
    faturaData: faturaData as Deps['faturaData'],
    contas, categorias, planos, saldoInicialDinheiro, cenarioPrevisao,
  }), [extratoData, faturaData, contas, categorias, planos, saldoInicialDinheiro, cenarioPrevisao])

  // O saldo das contas de banco e do dinheiro ao fim do mês escolhido — no mês
  // corrente, o de hoje. É o "Saldo atual" do Radar.
  const saldoDisponivel = useMemo(
    () => saldoBancosEDinheiro(viewAno, viewMes, deps),
    [viewAno, viewMes, deps],
  )

  // Previsão só existe no mês corrente: mês fechado já tem o número final, e
  // é o próprio "Meu saldo".
  const ehMesCorrente = viewAno === hoje.getFullYear() && viewMes === hoje.getMonth()

  // Com quanto o mês termina, e de onde isso vem: a memória de cálculo do
  // Radar, o mesmo objeto. `fechamento` é o saldo final previsto da barra do
  // rodapé de lá, e "falta receber" são as duas linhas de receita prevista dela.
  const memoria = useMemo(
    () => (ehMesCorrente ? memoriaDoRadar(viewAno, viewMes, deps) : null),
    [ehMesCorrente, viewAno, viewMes, deps],
  )
  const [memoriaAberta, setMemoriaAberta] = useState(false)
  const faltaReceber = memoria ? memoria.entradasPrevistas + memoria.receitasAReceber : 0

  // Pior mês à frente: a série do Simulador, do mês corrente ao fim do plano.
  // Sem plano, não há série e não há aviso.
  const alertaFuturo = useMemo(() => {
    if (!ehMesCorrente) return null
    const serie = serieBaseDoPlano(deps)
    return serie ? piorMesDaSerie(serie) : null
  }, [ehMesCorrente, deps])

  // A lista de últimas movimentações não é número: segue lendo o extrato.
  const ultimosLanc = useMemo(() => {
    const todos: Array<{ descricao: string; categoria: string; valor: number; tipo: string; data: number }> = []
    contas.forEach(conta => {
      const dados = extratoData[mesKey(conta.id, viewAno, viewMes)]
      if (!dados) return
      Object.entries(dados.lancamentos).forEach(([dia, ls]) =>
        ls.forEach(l => todos.push({ ...l, data: parseInt(dia) }))
      )
    })
    return todos.sort((a, b) => b.data - a.data).slice(0, 5)
  }, [contas, extratoData, viewMes, viewAno])

  const temPlano = useMemo(() => {
    const p = planos[viewAno]
    if (!p) return false
    return (p.saidas ?? []).some(c => c.v.some(v => v > 0)) ||
           (p.entradas ?? []).some(c => c.v.some(v => v > 0))
  }, [planos, viewAno])

  const temBanco      = contas.some(c => c.tipo === 'corrente' || c.tipo === 'poupanca')
  const temCategorias = categorias.some(c => c.ativa)

  // ── Bússola ──────────────────────────────────────────────────────────
  const { compassStatus, sobrou, excedeu } = useMemo<{
    compassStatus: CompassStatus; sobrou: number; excedeu: number
  }>(() => {
    if (totalEntradas === 0 && totalSaidas === 0)
      return { compassStatus: 'sem-dados', sobrou: 0, excedeu: 0 }
    if (!temPlano || totalPrevS === 0)
      return { compassStatus: 'sem-plano', sobrou: 0, excedeu: 0 }
    const perc = totalSaidas / totalPrevS
    if (totalSaidas > totalPrevS)
      return { compassStatus: 'vermelho', sobrou: 0, excedeu: totalSaidas - totalPrevS }
    if (perc >= 0.9)
      return { compassStatus: 'amarelo', sobrou: 0, excedeu: 0 }
    return { compassStatus: 'verde', sobrou: totalEntradas - totalSaidas, excedeu: 0 }
  }, [totalEntradas, totalSaidas, temPlano, totalPrevS])

  const percGastei = totalPrevS > 0 ? Math.round((totalSaidas / totalPrevS) * 100) : null

  const dica = useMemo(() => {
    if (topCategorias.length === 0)
      return 'Registre seus primeiros gastos para ver insights personalizados.'
    const top = topCategorias[0]
    if (percGastei !== null)
      return `Você usou ${percGastei}% do orçamento este mês. Maior despesa: ${top.nome} (${fmt(top.gasto)}).`
    return `Maior gasto deste mês: ${top.nome} — ${fmt(top.gasto)}.`
  }, [topCategorias, percGastei])

  const cc = COMPASS_CFG[compassStatus]
  const maxGasto = topCategorias[0]?.gasto || 1

  // ── Simulações ativas ─────────────────────────────────────────────────
  const [simAtivas, setSimAtivas] = useState<SimAtivaRow[]>([])
  const [aurixSaldo, setAurixSaldo] = useState(0)
  const [aurixStreak, setAurixStreak] = useState(0)
  const [aurixAcoes, setAurixAcoes] = useState<string[]>([])

  useEffect(() => {
    if (!user) return
    creditarAurix(user.id, 'acao', 'Acessou o Início', 2, 'acao_dashboard').then(r => {
      if (r) dispararToastAurix({ tipo: 'acao', titulo: 'Acessou o Início', pontos: 2 })
    })
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    const uid = user.id
    Promise.all([
      saldoAurix(uid),
      acoesHoje(uid),
      supabase.from('user_preferences').select('streak_atual').eq('user_id', uid).single(),
    ]).then(([s, feitas, { data }]) => {
      setAurixSaldo(s)
      setAurixAcoes(feitas)
      if (data) setAurixStreak(data.streak_atual ?? 0)
    })
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    supabase.from('simulacoes').select('*').eq('ativo', true)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error('simulacoes (dashboard):', error.message); return }
        if (data) setSimAtivas(data as SimAtivaRow[])
      })
  }, [user])

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', background: COR.fundo,
      fontFamily: "-apple-system,'Inter',sans-serif",
    }}>
      {/* Mobile top bar */}
      <AppHeader currentPath="/dashboard" />

      {/* Header em largura cheia, como na tela de Lancamentos */}
      <div style={{ padding: isMobile ? '12px 14px 0' : '16px 28px 0' }}>
          <PageHeader
            icon="ti-layout-dashboard"
            title={`Olá, ${nome}`}
            subtitle={`${MESES_FULL[viewMes]} ${viewAno}`}
            rightContent={
              <>
                <SeletorMesAno
                  mes={viewMes} ano={viewAno}
                  onSelect={(m, a) => { setViewMes(m); setViewAno(a) }}
                  habilitado={(m, a) => a < hoje.getFullYear() || (a === hoje.getFullYear() && m <= hoje.getMonth())}
                  compacto={isMobile}
                />
                <button onClick={() => navigate('/novo-lancamento')} style={PH_BTN_SOLID}>
                  + Lançar
                </button>
              </>
            }
          />
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: isMobile ? '16px 14px 80px' : '28px 28px 40px' }}>

        {/* ── Banners de setup ── */}
        {(!temBanco || !temCategorias) && (
          <div style={{
            background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12,
            padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12,
            marginBottom: 16,
          }}>
            <span style={{ fontSize: 16 }}>🧭</span>
            <span style={{ flex: 1, fontSize: 13, color: '#1e40af', fontWeight: 500 }}>
              Configure suas contas e categorias para uma visão completa
            </span>
            <button onClick={() => navigate('/configuracoes')} style={{
              background: COR.azul, color: '#fff', border: 'none', borderRadius: 8,
              padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}>Configurar →</button>
          </div>
        )}
        {temBanco && temCategorias && !temPlano && (
          <div style={{
            background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12,
            padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12,
            marginBottom: 16,
          }}>
            <span style={{ fontSize: 16 }}>📋</span>
            <span style={{ flex: 1, fontSize: 13, color: '#92400e', fontWeight: 500 }}>
              Complete seu planejamento para ter uma visão completa
            </span>
            <button onClick={() => navigate('/planejamento', { state: { openQuiz: true } })} style={{
              background: '#b45309', color: '#fff', border: 'none', borderRadius: 8,
              padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}>Começar →</button>
          </div>
        )}

        {/* ── Tutorial primeira visita ── */}
        <TutorialCard
          tela="inicio"
          icon="🧭"
          title="Seu painel de comando"
          description="Aqui você vê o resumo da sua vida financeira. A bússola te mostra se está no caminho certo — tudo de forma simples e visual."
          tips={[
            { icon: '💳', text: 'Os cards mostram quanto você tem, ganhou e gastou' },
            { icon: '🧭', text: 'A bússola muda de cor conforme sua situação financeira' },
            { icon: '📊', text: 'Abaixo você vê seus maiores gastos e últimos lançamentos' },
          ]}
          buttonLabel="Ver meu painel →"
        />

        {/* ── Bússola hero ── */}
        <div style={{
          background: cc.bg, border: `1.5px solid ${cc.border}`, borderRadius: 14,
          padding: isMobile ? '14px 16px' : '18px 22px',
          display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20,
        }}>
          <div style={{
            width: isMobile ? 44 : 52, height: isMobile ? 44 : 52, borderRadius: 14, flexShrink: 0,
            background: cc.bg, border: `2px solid ${cc.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: isMobile ? 22 : 26,
          }}>{cc.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: isMobile ? 14 : 15, fontWeight: 700, color: cc.cor, marginBottom: 4,
            }}>{cc.title}</div>
            <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
              {cc.msg(sobrou, excedeu)}
            </div>
            {objetivoUsuario && (
              <div style={{ marginTop: 8, fontSize: 12, color: cc.cor, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span>🎯 Seu objetivo: {
                  objetivoUsuario === 'controlar' ? 'Controlar meus gastos' :
                  objetivoUsuario === 'economizar' ? 'Economizar e poupar' :
                  objetivoUsuario === 'sonho' ? 'Realizar um sonho' :
                  objetivoUsuario === 'dividas' ? 'Sair das dívidas' : objetivoUsuario
                }</span>
                {objetivoUsuario === 'dividas' && (
                  <button onClick={() => navigate('/simulacao')} style={{
                    background: 'transparent', border: `1px solid ${cc.cor}`, color: cc.cor,
                    borderRadius: 6, padding: '2px 8px', fontSize: 11, cursor: 'pointer',
                    fontFamily: 'inherit', fontWeight: 600,
                  }}>Usar simulador →</button>
                )}
              </div>
            )}
          </div>
          {compassStatus === 'sem-plano' && (
            <button
              onClick={() => navigate('/planejamento', { state: { openQuiz: true } })}
              style={{
                background: COR.azul, color: '#fff', border: 'none', borderRadius: 10,
                padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >Começar →</button>
          )}
        </div>

        {/* ── KPI cards ── */}
        {/* Saldos em verde positivo e vermelho negativo, como no Radar e em
            Lançamentos (RADAR_COR_AZUL). O previsto só existe no mês corrente,
            e abre a mesma memória de cálculo do Radar. */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : `repeat(${memoria ? 4 : 3}, 1fr)`,
          gap: 12, marginBottom: memoriaAberta && memoria ? 12 : 20,
        }}>
          <KpiCard icon="◎" label={ehMesCorrente ? 'Saldo atual' : 'Saldo final'} value={fmt(saldoDisponivel)}
            valueColor={saldoDisponivel >= 0 ? RADAR_COR_AZUL.bom : RADAR_COR_AZUL.ruim}
            sublabel={ehMesCorrente ? 'Bancos e dinheiro, hoje' : 'Bancos e dinheiro'} />
          <KpiCard icon="↑" label="Receitas do mês" value={fmt(totalEntradas)}
            valueColor={RADAR_COR_AZUL.bom}
            sublabel={faltaReceber > 0.005 ? `falta receber ${fmt(faltaReceber)}` : 'Recebidas no mês'} />
          <KpiCard icon="↓" label="Despesas do mês" value={fmt(totalSaidas)}
            valueColor={RADAR_COR_AZUL.ruim}
            sublabel={percGastei !== null ? `${percGastei}% do planejado` : 'Gastos do mês'} />
          {memoria && (
            <KpiCard icon="→" label="Saldo final previsto" value={fmt(memoria.fechamento)}
              valueColor={memoria.fechamento >= 0 ? RADAR_COR_AZUL.bom : RADAR_COR_AZUL.ruim}
              sublabel={`cenário ${cenarioPrevisao}`}
              onClick={() => setMemoriaAberta(v => !v)} expandido={memoriaAberta} />
          )}
        </div>
        {memoriaAberta && memoria && (
          <div style={{ marginBottom: 20, borderRadius: 12, overflow: 'hidden' }}>
            <MemoriaSaldo m={memoria} positivo={memoria.fechamento >= 0}
              cenario={cenarioPrevisao} onCenario={setCenarioPrevisao} />
          </div>
        )}

        {/* ── Pior mês à frente — só quando o saldo previsto fica negativo ──
            O primeiro mês negativo é onde agir; o pior é o tamanho do buraco.
            erroFundo + erroTexto: par medido em cores.ts (5,9:1). */}
        {alertaFuturo?.primeiroNegativo && (() => {
          const { pior, primeiroNegativo: neg } = alertaFuturo
          const nomeMes = (p: { ano: number; mes: number }) => `${MESES_FULL[p.mes].toLowerCase()} de ${p.ano}`
          const mesmo = pior.ano === neg.ano && pior.mes === neg.mes
          return (
            <div role="alert" style={{
              background: COR.erroFundo, border: '1px solid #fecdd3', borderRadius: 12,
              padding: '12px 16px', marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            }}>
              <span aria-hidden style={{ fontSize: 18 }}>⚠️</span>
              <div style={{ flex: 1, minWidth: 200, fontSize: 13, color: COR.erroTexto, lineHeight: 1.5 }}>
                <b>Em {nomeMes(neg)} o saldo previsto fica negativo: {fmt(neg.semCompra)}.</b>
                {!mesmo && <> O pior mês é {nomeMes(pior)}, com {fmt(pior.semCompra)}.</>}
              </div>
              <button onClick={() => navigate('/planejamento')} style={{
                background: COR.erroTexto, color: '#fff', border: 'none', borderRadius: 8,
                padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}>Ver o plano →</button>
            </div>
          )
        })()}

        {/* ── Card Aurix ── */}
        {(() => {
          const feitas = aurixAcoes.filter(r => ACOES_DIARIAS_REFS.includes(r)).length
          const aurixHoje = [
            aurixAcoes.includes('acao_login')     ? 3 : 0,
            aurixAcoes.includes('acao_dashboard') ? 2 : 0,
            aurixAcoes.includes('acao_lancamento')? 5 : 0,
            aurixAcoes.includes('acao_north')     ? 3 : 0,
            aurixAcoes.includes('acao_evolucao')  ? 2 : 0,
          ].reduce((a, b) => a + b, 0)
          return (
            <div style={{
              background: COR.branco, borderRadius: 12, padding: '16px 20px',
              marginBottom: 20, border: `.5px solid ${COR.borda}`,
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: COR.textoMuted, marginBottom: 8 }}>
                  ✨ Aurix hoje
                </div>
                <div style={{ fontSize: 13, color: COR.texto, marginBottom: 4 }}>
                  {aurixStreak > 0 && <span style={{ marginRight: 12 }}>🔥 Streak: {aurixStreak} dias</span>}
                  <span style={{ color: COR.textoSuave }}>✨ {aurixSaldo.toLocaleString('pt-BR')} Aurix</span>
                </div>
                <div style={{ fontSize: 12, color: COR.textoSuave }}>
                  Ações do dia: {feitas} de {ACOES_DIARIAS_TOTAL} completadas
                  {aurixHoje > 0 && ` (+${aurixHoje} Aurix)`}
                </div>
              </div>
              <button
                onClick={() => navigate('/aurix')}
                style={{
                  border: 'none', background: COR.fundo, borderRadius: 8,
                  padding: '8px 14px', color: COR.azul, fontSize: 13,
                  fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  flexShrink: 0,
                }}
              >
                Ver →
              </button>
            </div>
          )
        })()}

        {/* ── Minhas metas e dívidas ── */}
        {simAtivas.length > 0 && (() => {
          return (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COR.texto }}>Minhas metas e dívidas</div>
              <button onClick={() => navigate('/simulacao')} style={{
                border: 'none', background: 'transparent', color: COR.azul,
                fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
              }}>Ver todas →</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {simAtivas.slice(0, 4).map(sim => {
                const isDivida = sim.tipo === 'divida'
                const inicio = new Date(sim.created_at)
                const mesesPassados = (hoje.getFullYear() - inicio.getFullYear()) * 12 + (hoje.getMonth() - inicio.getMonth())
                const progresso = Math.max(0, Math.min(100, Math.round((mesesPassados / sim.resultado_meses) * 100)))
                return (
                  <div key={sim.id} style={{
                    background: COR.branco, border: `.5px solid ${COR.borda}`,
                    borderRadius: 12, padding: '14px 16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 20 }}>{isDivida ? '💳' : '🐷'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: COR.texto, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sim.nome}
                        </div>
                        <div style={{ fontSize: 11, color: COR.textoMuted }}>
                          {fmt(sim.valor_total)} · {fmt(sim.parcela)}/mês
                        </div>
                      </div>
                    </div>
                    <div style={{ height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                      <div style={{ height: 5, borderRadius: 3, background: isDivida ? COR.vermelho : COR.verde, width: `${progresso}%`, transition: 'width .4s' }}/>
                    </div>
                    <div style={{ fontSize: 11, color: COR.textoMuted, display: 'flex', justifyContent: 'space-between' }}>
                      <span>{progresso}% {isDivida ? 'quitado' : 'poupado'}</span>
                      <span>{isDivida ? 'Quitada' : 'Alcançada'} em {sim.data_conclusao}</span>
                    </div>
                    {sim.integrado_planejamento && (
                      <div style={{ fontSize: 10, fontWeight: 600, color: COR.azul, marginTop: 5 }}>✓ No planejamento</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          )
        })()}

        {/* ── 2-col grid ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: 14, alignItems: 'start',
        }}>

          {/* Esquerda: Onde mais gastei + Dica */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{
              background: COR.branco, borderRadius: 12,
              padding: '18px 20px', border: `.5px solid ${COR.borda}`,
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: COR.texto, marginBottom: 18 }}>
                Maiores despesas
              </div>
              {topCategorias.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
                  <div style={{ color: COR.textoMuted, fontSize: 13, marginBottom: 12 }}>
                    Nenhum gasto registrado
                  </div>
                  <button onClick={() => navigate('/novo-lancamento')} style={{
                    padding: '7px 14px', border: 'none', borderRadius: 8,
                    background: COR.azul, color: '#fff', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>Registrar gasto</button>
                </div>
              ) : topCategorias.map(cat => (
                <div key={cat.chave} style={{ marginBottom: 16 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{cat.icone}</span>
                      <span style={{ fontSize: 13, color: COR.texto, fontWeight: 500 }}>{cat.nome}</span>
                    </div>
                    <span style={{
                      fontSize: 13, color: COR.vermelho, fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                    }}>{fmt(cat.gasto)}</span>
                  </div>
                  <div style={{ height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: 4, borderRadius: 2, background: cat.cor,
                      width: `${Math.min((cat.gasto / maxGasto) * 100, 100)}%`,
                      transition: 'width .4s ease',
                    }}/>
                  </div>
                </div>
              ))}
            </div>

            {/* Dica contextual */}
            <div style={{
              background: '#fffbeb', borderRadius: 12,
              padding: '14px 16px', border: '.5px solid #fde68a',
              display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>💡</span>
              <p style={{ fontSize: 12, color: '#92400e', lineHeight: 1.7, margin: 0 }}>{dica}</p>
            </div>
          </div>

          {/* Direita: Últimos lançamentos */}
          <div style={{
            background: COR.branco, borderRadius: 12,
            padding: '18px 20px', border: `.5px solid ${COR.borda}`,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18,
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: COR.texto }}>Últimas movimentações</div>
              <button onClick={() => navigate('/novo-lancamento')} style={{
                border: 'none', background: 'transparent', color: COR.azul,
                fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
              }}>Ver tudo</button>
            </div>
            {ultimosLanc.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0 16px' }}>
                <div style={{ fontSize: 30, marginBottom: 10 }}>📋</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: COR.texto, marginBottom: 5 }}>
                  Nenhum lançamento este mês
                </div>
                <div style={{ fontSize: 12, color: COR.textoMuted, lineHeight: 1.55, marginBottom: 14 }}>
                  Registre seus gastos e receitas para ver<br/>o histórico aqui.
                </div>
                <button onClick={() => navigate('/novo-lancamento')} style={{
                  padding: '7px 18px', border: 'none', borderRadius: 8,
                  background: COR.azul, color: '#fff',
                  fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>Registrar →</button>
              </div>
            ) : ultimosLanc.map((l, i) => {
              const cat = categorias.find(c => c.nome === l.categoria)
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  paddingBottom: i < ultimosLanc.length - 1 ? 13 : 0,
                  marginBottom: i < ultimosLanc.length - 1 ? 13 : 0,
                  borderBottom: i < ultimosLanc.length - 1 ? `1px solid #f1f5f9` : 'none',
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: l.tipo === 'entrada' ? COR.verde : COR.vermelho,
                  }}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 500, color: COR.texto,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {(l.descricao && l.descricao.trim()) ? l.descricao : l.categoria}
                    </div>
                    <div style={{ fontSize: 11, color: COR.textoMuted, marginTop: 1 }}>
                      {cat?.icone ?? ''} {l.categoria} · dia {l.data}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 13, fontWeight: 600, flexShrink: 0,
                    fontVariantNumeric: 'tabular-nums',
                    color: l.tipo === 'entrada' ? COR.verde : COR.vermelho,
                  }}>
                    {l.tipo === 'entrada' ? '+' : '−'}{fmt(l.valor)}
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </div>

      {/* FAB mobile */}
      {isMobile && (
        <button
          onClick={() => navigate('/novo-lancamento')}
          style={{
            position: 'fixed', bottom: 76, right: 20,
            width: 52, height: 52, borderRadius: '50%', border: 'none',
            background: 'linear-gradient(135deg,#1a56db,#2563eb)',
            color: '#fff', fontSize: 26, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(26,86,219,.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >+</button>
      )}
    </div>
  )
}
