import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { DadosMes } from '../context/AppContext'
import { construirRealizadoMes } from '../utils/realizadoMes'
import { saldoBancosEDinheiro, memoriaDoRadar, type Deps } from '../utils/saldoConta'
import { serieBaseDoPlano, piorMesDaSerie, fimDoPlanejamento } from '../utils/simulacaoCompra'
import { evolucaoDoSaldo } from '../utils/evolucaoSaldo'
import { contasAVencer, contasDoMes } from '../utils/contasAVencer'
import { previsaoDoMes, entradasPrevistasDaMemoria, saidasPrevistasDaMemoria } from '../utils/previsaoDoMes'
import HeroSaldo, { type StatusHero } from '../components/inicio/HeroSaldo'
import ComparativoMensal from '../components/inicio/ComparativoMensal'
import { comparativoMensal } from '../utils/comparativoMensal'
import { categoriasEstouradas, maisPertoDoLimite } from '../utils/categoriasEstouradas'
import EstouradasCard from '../components/EstouradasCard'
import { ritmoDoMes } from '../utils/ritmoDoMes'
import RitmoCard from '../components/RitmoCard'
import ContasAVencerCard from '../components/ContasAVencerCard'
import EvolucaoSaldoGrafico from '../components/EvolucaoSaldoGrafico'
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

/**
 * A linha de status do hero. É a bússola de antes com outro desenho: o MESMO
 * compassStatus, com as mesmas faixas — só a cor do ponto e a frase mudam.
 * Pontos sobre o azul do hero (elemento gráfico, 3:1): #86efac, #fde047 e
 * #f87171 passam no extremo mais claro, #1e40af.
 */
const STATUS_HERO: Record<CompassStatus, { cor: string; frase: (mes: string, fechou: boolean) => string }> = {
  verde:       { cor: '#86efac', frase: (m, f) => `${m} ${f ? 'fechou' : 'fecha'} no azul` },
  amarelo:     { cor: '#fde047', frase: (m, f) => `${m} ${f ? 'fechou' : 'fecha'} apertado` },
  vermelho:    { cor: '#f87171', frase: (m, f) => `${m} ${f ? 'fechou' : 'fecha'} no vermelho` },
  'sem-plano': { cor: 'rgba(255,255,255,.5)', frase: m => `Sem plano para ${m.toLowerCase()}` },
  'sem-dados': { cor: 'rgba(255,255,255,.5)', frase: m => `Sem movimentação em ${m.toLowerCase()}` },
}

export default function Dashboard() {
  const navigate  = useNavigate()
  const isMobile  = useIsMobile()
  const {
    contas, categorias, extratoData, faturaData, planos, perfil, user,
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
  const { totalEntradas, totalSaidas, totalPrevS, totalPrevE, topCategorias, linhasSaida } = useMemo(() => {
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

    return {
      totalEntradas: t.entrada.real, totalSaidas: t.saida.real,
      totalPrevS: t.saida.prev, totalPrevE: t.entrada.prev, topCategorias, linhasSaida: t.saida.linhas,
    }
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

  // Três modos. Mês fechado: só o que aconteceu, e o saldo final é o real.
  // Mês corrente: o que aconteceu e o previsto até o dia 31. Mês FUTURO: só
  // previsão — pedido do Guilherme em 27/09/2026, para se preparar para o
  // mês que vem. O seletor vai até o fim do plano; sem plano, até hoje.
  const ehMesCorrente = viewAno === hoje.getFullYear() && viewMes === hoje.getMonth()
  const ymHoje = hoje.getFullYear() * 12 + hoje.getMonth()
  const ehFuturo = viewAno * 12 + viewMes > ymHoje
  const olhaAFrente = ehMesCorrente || ehFuturo
  const fimPlano = useMemo(() => fimDoPlanejamento(planos), [planos])

  // Mês futuro: inicial, entradas, saídas e final previstos, e a memória só
  // daquele mês. Ver utils/previsaoDoMes.
  const previsao = useMemo(
    () => (ehFuturo ? previsaoDoMes(viewAno, viewMes, deps) : null),
    [ehFuturo, viewAno, viewMes, deps],
  )
  const contasFuturo = useMemo(
    () => (ehFuturo ? contasDoMes(viewAno, viewMes, deps) : []),
    [ehFuturo, viewAno, viewMes, deps],
  )

  // Com quanto o mês termina, e de onde isso vem: a memória de cálculo do
  // Radar, o mesmo objeto. `fechamento` é o saldo final previsto da barra do
  // rodapé de lá. Em mês FECHADO ela também existe: não projeta nada, e o
  // fechamento é o saldo real — é o que o hero mostra ali.
  const memoria = useMemo(
    () => (!ehFuturo ? memoriaDoRadar(viewAno, viewMes, deps) : null),
    [ehFuturo, viewAno, viewMes, deps],
  )
  const [memoriaAberta, setMemoriaAberta] = useState(false)
  // "ainda entram" / "ainda saem": as linhas previstas da própria memória, pelas
  // duas funções de previsaoDoMes. hoje + entram − saem = fechamento.
  const faltaReceber = memoria ? entradasPrevistasDaMemoria(memoria) : 0
  const aindaSaem = memoria ? saidasPrevistasDaMemoria(memoria) : 0

  // A série do Simulador, do mês corrente ao fim do plano — a parte cara,
  // calculada uma vez para o aviso e para o gráfico. Sem plano, não há série.
  const serie = useMemo(() => (olhaAFrente ? serieBaseDoPlano(deps) : null), [olhaAFrente, deps])

  // Pior mês à frente: o primeiro mês negativo e o pior, marcados como pontos
  // vermelhos no gráfico de evolução (onda 2 do briefing da Início — antes era
  // uma faixa vermelha). Só quando algum mês fica negativo.
  const alertaFuturo = useMemo(() => {
    const a = serie ? piorMesDaSerie(serie) : null
    if (!a?.primeiroNegativo) return null
    const marco = (p: { ano: number; mes: number; semCompra: number }) => ({ ano: p.ano, mes: p.mes, valor: p.semCompra })
    return { primeiroNegativo: marco(a.primeiroNegativo), pior: marco(a.pior) }
  }, [serie])

  // Passado real + mês corrente previsto + futuro previsto, numa linha só. Vai
  // até o fim do plano — não para em 12 meses —, senão um mês negativo além
  // disso não teria onde ser marcado.
  const evolucao = useMemo(
    () => (olhaAFrente ? evolucaoDoSaldo(deps, serie, undefined, { futuros: serie?.base.length ?? 0 }) : []),
    [olhaAFrente, deps, serie],
  )

  // Contas dos próximos 7 dias: as linhas de fixa e fatura da memória de
  // cálculo, filtradas pelo vencimento. Ver utils/contasAVencer.
  const aVencer = useMemo(() => (ehMesCorrente ? contasAVencer(deps) : []), [ehMesCorrente, deps])

  // Receitas e despesas contra o plano, nos últimos seis meses até hoje — as
  // mesmas duas chamadas do bloco do mês, num laço (utils/comparativoMensal).
  // São seis construirRealizadoMes: por isso o useMemo, sobre as mesmas
  // dependências. A janela é ancorada em HOJE, então não depende do mês exibido.
  const comparativo = useMemo(() => comparativoMensal(deps, planos), [deps, planos])

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

  // Com plano no mês, "Maiores despesas" dá lugar às estouradas: as MESMAS
  // linhas do Radar, e o excesso é o "Estourou" de lá. Ver
  // utils/categoriasEstouradas.
  const usaPlanoNoMes = temPlano && totalPrevS > 0
  const estouradas = useMemo(() => categoriasEstouradas(linhasSaida), [linhasSaida])
  const pertoDoLimite = useMemo(() => maisPertoDoLimite(linhasSaida, categorias), [linhasSaida, categorias])

  // Ritmo do mês: só no mês corrente — mês fechado já tem o resultado, e o
  // futuro ainda não começou. Ver utils/ritmoDoMes.
  const ritmo = useMemo(
    () => (ehMesCorrente && usaPlanoNoMes ? ritmoDoMes(linhasSaida, categorias) : null),
    [ehMesCorrente, usaPlanoNoMes, linhasSaida, categorias],
  )

  const temBanco      = contas.some(c => c.tipo === 'corrente' || c.tipo === 'poupanca')
  const temCategorias = categorias.some(c => c.ativa)

  // ── Bússola ──────────────────────────────────────────────────────────
  const compassStatus = useMemo<CompassStatus>(() => {
    if (totalEntradas === 0 && totalSaidas === 0) return 'sem-dados'
    if (!temPlano || totalPrevS === 0) return 'sem-plano'
    const perc = totalSaidas / totalPrevS
    if (totalSaidas > totalPrevS) return 'vermelho'
    if (perc >= 0.9) return 'amarelo'
    return 'verde'
  }, [totalEntradas, totalSaidas, temPlano, totalPrevS])

  const percGastei = totalPrevS > 0 ? Math.round((totalSaidas / totalPrevS) * 100) : null

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
                  habilitado={(m, a) => a * 12 + m <= ymHoje
                    || (!!fimPlano && a * 12 + m <= fimPlano.ano * 12 + fimPlano.mes)}
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

        {/* ── Mês futuro: nada aqui aconteceu ainda ──
            infoFundo + infoTexto: par medido em cores.ts (5,5:1). */}
        {ehFuturo && (
          <div style={{
            background: COR.infoFundo, border: `1px solid ${COR.infoBorda}`, borderRadius: 12,
            padding: '12px 16px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          }}>
            <span aria-hidden style={{ fontSize: 18 }}>🔭</span>
            <div style={{ flex: 1, minWidth: 220, fontSize: 13, color: COR.infoTexto, lineHeight: 1.5 }}>
              <b>Previsão de {MESES_FULL[viewMes].toLowerCase()} de {viewAno}.</b> Nada aqui aconteceu ainda:
              são as contas do plano, as faturas já lançadas e o que o plano espera
              gastar e receber, no cenário {cenarioPrevisao}.
            </div>
            <button onClick={() => { setViewMes(hoje.getMonth()); setViewAno(hoje.getFullYear()) }} style={{
              background: COR.infoTexto, color: '#fff', border: 'none', borderRadius: 8,
              padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}>Voltar para hoje</button>
          </div>
        )}

        {/* ══ 1 · A resposta ══ O hero absorve a bússola e o cartão "Saldo final
            previsto". Mês corrente: com quanto fecha. Mês fechado: com quanto
            fechou. Mês futuro: com quanto deve fechar — sem a linha de status,
            que julga o que aconteceu. Ver components/inicio/HeroSaldo. */}
        {(() => {
          const mesNome = MESES_FULL[viewMes]
          const ultimoDia = new Date(viewAno, viewMes + 1, 0).getDate()
          const dataFim = `${ultimoDia} de ${mesNome.toLowerCase()}`
          const hero = ehFuturo && previsao ? {
            status: null as StatusHero | null,
            rotulo: `Saldo previsto em ${dataFim}`,
            valor: previsao.final,
            apoio: [
              { rotulo: 'abre com', valor: previsao.inicial },
              { rotulo: 'saem', valor: previsao.saidas },
              { rotulo: 'entram', valor: previsao.entradas },
            ],
          } : memoria ? {
            status: { cor: STATUS_HERO[compassStatus].cor, frase: STATUS_HERO[compassStatus].frase(mesNome, !ehMesCorrente) },
            rotulo: ehMesCorrente ? `Saldo previsto em ${dataFim}` : `Saldo em ${dataFim}`,
            valor: memoria.fechamento,
            apoio: ehMesCorrente ? [
              { rotulo: 'hoje', valor: saldoDisponivel },
              { rotulo: 'ainda saem', valor: aindaSaem },
              { rotulo: 'ainda entram', valor: faltaReceber },
            ] : [
              { rotulo: 'abriu com', valor: memoria.abertura },
            ],
          } : null
          if (!hero) return null
          return (
            <div style={{ marginBottom: 20 }}>
              <HeroSaldo {...hero} sparkline={evolucao} isMobile={isMobile}
                aberto={memoriaAberta} onComoCheguei={() => setMemoriaAberta(v => !v)} />
              {memoriaAberta && ehFuturo && previsao && (
                <MemoriaSaldo m={previsao.memoria} positivo={previsao.final >= 0}
                  cenario={cenarioPrevisao} onCenario={setCenarioPrevisao}
                  rotuloAbertura={['Saldo inicial previsto', 'Com quanto o mês deve abrir']} />
              )}
              {memoriaAberta && !ehFuturo && memoria && (
                <MemoriaSaldo m={memoria} positivo={memoria.fechamento >= 0}
                  cenario={cenarioPrevisao} onCenario={setCenarioPrevisao} />
              )}
            </div>
          )
        })()}

        {/* ══ 2 · Os três números ══ Sempre três colunas — o previsto está no hero.
            Saldos em verde positivo e vermelho negativo (RADAR_COR_AZUL). Mês
            futuro: receitas e despesas são o dinheiro previsto NAS CONTAS, e o
            total do plano vai ao lado para a diferença se ver. */}
        <div style={{
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: 12, marginBottom: 20,
        }}>
          {ehFuturo && previsao ? (
            <>
              <KpiCard icon="◎" label="Saldo inicial previsto" value={fmt(previsao.inicial)}
                valueColor={previsao.inicial >= 0 ? RADAR_COR_AZUL.bom : RADAR_COR_AZUL.ruim}
                sublabel="Final previsto do mês anterior" />
              <KpiCard icon="↑" label="Receitas previstas" value={fmt(previsao.entradas)}
                valueColor={RADAR_COR_AZUL.bom}
                sublabel={`nas contas · plano ${fmt(totalPrevE)}`} />
              <KpiCard icon="↓" label="Despesas previstas" value={fmt(previsao.saidas)}
                valueColor={RADAR_COR_AZUL.ruim}
                sublabel={`nas contas · plano ${fmt(totalPrevS)}`} />
            </>
          ) : (
            <>
              {ehMesCorrente ? (
                <KpiCard icon="◎" label="Saldo atual" value={fmt(saldoDisponivel)}
                  valueColor={saldoDisponivel >= 0 ? RADAR_COR_AZUL.bom : RADAR_COR_AZUL.ruim}
                  sublabel="Bancos e dinheiro, hoje" />
              ) : (
                // Mês fechado: o saldo final já é o hero; aqui fica com quanto ele abriu.
                <KpiCard icon="◎" label="Saldo inicial" value={fmt(memoria?.abertura ?? 0)}
                  valueColor={(memoria?.abertura ?? 0) >= 0 ? RADAR_COR_AZUL.bom : RADAR_COR_AZUL.ruim}
                  sublabel="Bancos e dinheiro" />
              )}
              <KpiCard icon="↑" label="Receitas do mês" value={fmt(totalEntradas)}
                valueColor={RADAR_COR_AZUL.bom}
                sublabel={faltaReceber > 0.005 ? `falta receber ${fmt(faltaReceber)}` : 'Recebidas no mês'} />
              <KpiCard icon="↓" label="Despesas do mês" value={fmt(totalSaidas)}
                valueColor={RADAR_COR_AZUL.ruim}
                sublabel={percGastei !== null ? `${percGastei}% do planejado` : 'Gastos do mês'} />
            </>
          )}
        </div>

        {/* ══ 3 · Ritmo do mês ══ Largura total: as duas barras alinhadas são o
            desenho do indicador, e em meia largura a comparação perde. */}
        {ritmo && <div style={{ marginBottom: 20 }}><RitmoCard r={ritmo} /></div>}

        {/* ══ 4 · O que pede ação ══ Contas a vencer | Passou do plano, lado a
            lado. Quando só um dos dois existe, ele ocupa a largura toda. */}
        {(() => {
          const contasCard = aVencer.length > 0 ? (
            <ContasAVencerCard contas={aVencer} categorias={categorias} isMobile={isMobile}
              onAbrir={() => navigate('/novo-lancamento')} />
          ) : contasFuturo.length > 0 ? (
            // Mês futuro: o calendário inteiro de contas — onde elas se concentram.
            <ContasAVencerCard contas={contasFuturo} categorias={categorias} isMobile={isMobile}
              titulo={`Contas de ${MESES_FULL[viewMes].toLowerCase()}`}
              acao="Ver o mês em Lançamentos →"
              onAbrir={() => navigate('/novo-lancamento')} />
          ) : null
          // Mês futuro não tem esta coluna: nada aconteceu ainda.
          const planoCol = ehFuturo ? null : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {usaPlanoNoMes ? (
                <EstouradasCard estouradas={estouradas} perto={pertoDoLimite} categorias={categorias}
                  onVerRadar={() => navigate('/radar')} />
              ) : (
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
              )}
            </div>
          )
          if (!contasCard && !planoCol) return null
          const duo = !!contasCard && !!planoCol
          return (
            <div style={{
              display: 'grid', gridTemplateColumns: duo && !isMobile ? '1fr 1fr' : '1fr',
              gap: 12, alignItems: 'start', marginBottom: 20,
            }}>
              {contasCard}
              {planoCol}
            </div>
          )
        })()}

        {/* ══ 5 · Previsto × realizado, mês a mês ══ Só a partir de dois meses
            de história — um mês sozinho não compara nada — e não em mês futuro,
            que é só previsão. */}
        {!ehFuturo && comparativo.length >= 2 && (
          <div style={{ marginBottom: 20 }}>
            <ComparativoMensal meses={comparativo} isMobile={isMobile} />
          </div>
        )}

        {/* ══ 6 · Para onde o saldo vai ══ */}
        {evolucao.length >= 2 && (
          <div style={{
            background: COR.branco, borderRadius: 12, padding: isMobile ? '14px 12px 10px' : '18px 20px 12px',
            border: `.5px solid ${COR.borda}`, marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: COR.texto }}>Evolução do saldo</div>
                <div style={{ fontSize: 12, color: COR.textoSuave, marginTop: 2 }}>
                  Bancos e dinheiro · fechamento real e previsão
                  {serie && fimPlano ? ` até ${MESES_FULL[fimPlano.mes].toLowerCase()} de ${fimPlano.ano}` : ''}
                  {serie ? ` · cenário ${cenarioPrevisao}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 14, fontSize: 12, color: COR.textoSuave }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="22" height="8" aria-hidden><line x1="0" y1="4" x2="22" y2="4" stroke={COR.azul} strokeWidth="2.5" /></svg>
                  Real
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="22" height="8" aria-hidden><line x1="0" y1="4" x2="22" y2="4" stroke={COR.azul} strokeWidth="2.5" strokeDasharray="6 5" /></svg>
                  Previsto
                </span>
              </div>
            </div>
            <EvolucaoSaldoGrafico pontos={evolucao} altura={isMobile ? 190 : 230}
              destaque={ehFuturo ? { ano: viewAno, mes: viewMes } : undefined}
              alerta={alertaFuturo} />
            {!serie && (
              <div style={{ fontSize: 12, color: COR.textoSuave, marginTop: 6 }}>
                Com um planejamento, a previsão segue pelos próximos meses.
              </div>
            )}
          </div>
        )}

        {/* ══ 7 · Contexto ══ Metas e dívidas | Últimas movimentações. Quando só
            um existe, ocupa a largura toda. Mês futuro não tem movimentações. */}
        {(() => {
          const metasCard = simAtivas.length > 0 ? (
            <div style={{ background: COR.branco, borderRadius: 12, padding: '18px 20px', border: `.5px solid ${COR.borda}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: COR.texto }}>Minhas metas e dívidas</div>
                <button onClick={() => navigate('/simulacao')} style={{
                  border: 'none', background: 'transparent', color: COR.azul,
                  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                }}>Ver todas →</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {simAtivas.slice(0, 4).map(sim => {
                  const isDivida = sim.tipo === 'divida'
                  const inicio = new Date(sim.created_at)
                  const mesesPassados = (hoje.getFullYear() - inicio.getFullYear()) * 12 + (hoje.getMonth() - inicio.getMonth())
                  const progresso = Math.max(0, Math.min(100, Math.round((mesesPassados / sim.resultado_meses) * 100)))
                  return (
                    <div key={sim.id} style={{ border: '1px solid #eef2f7', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 9 }}>
                        <span style={{ fontSize: 19 }}>{isDivida ? '💳' : '🐷'}</span>
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
          ) : null
          const ultimasCard = ehFuturo ? null : (
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
          )
          if (!metasCard && !ultimasCard) return null
          const duo = !!metasCard && !!ultimasCard
          return (
            <div style={{
              display: 'grid', gridTemplateColumns: duo && !isMobile ? '1fr 1fr' : '1fr',
              gap: 12, alignItems: 'start', marginBottom: 20,
            }}>
              {metasCard}
              {ultimasCard}
            </div>
          )
        })()}

        {/* ══ 8 · Aurix ══ Uma faixa, no fim: gamificação não pode ter o mesmo
            peso visual que "o aluguel venceu há três dias". */}
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
              background: COR.branco, borderRadius: 12, padding: '12px 18px',
              border: `.5px solid ${COR.borda}`,
              display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
                ✨ <b style={{ color: COR.texto }}>{aurixSaldo.toLocaleString('pt-BR')}</b> Aurix
              </span>
              {aurixStreak > 0 && (
                <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
                  🔥 <b style={{ color: COR.texto }}>{aurixStreak}</b> dias seguidos
                </span>
              )}
              <div role="img" aria-label={`${feitas} de ${ACOES_DIARIAS_TOTAL} ações de hoje`}
                style={{ flex: 1, minWidth: 120, height: 6, background: '#eef2f7', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${(feitas / ACOES_DIARIAS_TOTAL) * 100}%`, height: '100%', background: COR.azul, borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 12, color: COR.textoSuave, whiteSpace: 'nowrap' }}>
                {feitas} de {ACOES_DIARIAS_TOTAL} ações de hoje{aurixHoje > 0 && ` (+${aurixHoje} Aurix)`}
              </span>
              <button onClick={() => navigate('/aurix')} style={{
                border: 'none', background: 'transparent', color: COR.azul, padding: 0,
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>Ver →</button>
            </div>
          )
        })()}
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
