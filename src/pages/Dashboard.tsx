import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { saldoBancosEDinheiro, memoriaDoRadar } from '../utils/saldoConta'
import { serieBaseDoPlano, piorMesDaSerie, fimDoPlanejamento } from '../utils/simulacaoCompra'
import { evolucaoDoSaldo } from '../utils/evolucaoSaldo'
import { contasAVencer, contasDoMes } from '../utils/contasAVencer'
import { previsaoDoMes } from '../utils/previsaoDoMes'
import { ritmoDoMes } from '../utils/ritmoDoMes'
import { avisosDoMes } from '../utils/avisosDoMes'
import HeroSaldo, { type StatusHero } from '../components/inicio/HeroSaldo'
import AvisosCard from '../components/inicio/AvisosCard'
import { useMesDaInicio } from '../components/inicio/useMesDaInicio'
import ContasAVencerCard from '../components/ContasAVencerCard'
import EvolucaoSaldoGrafico from '../components/EvolucaoSaldoGrafico'
import { MemoriaSaldo } from '../components/novoLancamentoExtrato/NleExtrato'
import AppHeader from '../components/AppHeader'
import PageHeader, { PH_BTN_SOLID } from '../components/PageHeader'
import SeletorMesAno from '../components/SeletorMesAno'
import TutorialCard from '../components/TutorialCard'
import { COR } from '../utils/cores'
import { creditarAurix } from '../utils/aurix'
import { dispararToastAurix } from '../components/aurix/AurixToast'

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

type CompassStatus = 'verde' | 'amarelo' | 'vermelho' | 'sem-plano' | 'sem-dados'

/**
 * A linha de status do hero. É a bússola de antes com outro desenho: o MESMO
 * compassStatus, com as mesmas faixas — só a cor do ponto e a frase mudam.
 * Pontos sobre o azul do hero (elemento gráfico, 3:1): #86efac, #fde047 e
 * #f87171 passam no extremo mais claro, #1e40af.
 *
 * No mês corrente a frase fala com a pessoa ("Você está dentro do plano"),
 * porque o número logo abaixo já diz o mês. Não é "no azul": o status mede as
 * despesas contra o plano, não o saldo — com o saldo previsto negativo, "no
 * azul" contradiria o número vermelho embaixo.
 */
const STATUS_HERO: Record<CompassStatus, { cor: string; frase: (mes: string, fechou: boolean) => string }> = {
  verde:       { cor: '#86efac', frase: (m, f) => (f ? `${m} fechou dentro do plano` : 'Você está dentro do plano') },
  amarelo:     { cor: '#fde047', frase: (m, f) => (f ? `${m} fechou no limite do plano` : 'Você está chegando no limite do plano') },
  vermelho:    { cor: '#f87171', frase: (m, f) => (f ? `${m} fechou acima do plano` : 'Você passou do plano este mês') },
  'sem-plano': { cor: 'rgba(255,255,255,.5)', frase: m => `Sem plano para ${m.toLowerCase()}` },
  'sem-dados': { cor: 'rgba(255,255,255,.5)', frase: m => `Sem movimentação em ${m.toLowerCase()}` },
}

/**
 * A Início enxuta (06/10/2026): a resposta, o que pede atenção, um gráfico e
 * a porta para Análises. "O início está uma tela cheia de número, e falando
 * de forma comercial isso não vende" — o detalhe foi para /analises, com os
 * mesmos quadros e os mesmos números. Ver CLAUDE.md, "A Início enxuta".
 */
export default function Dashboard() {
  const navigate  = useNavigate()
  const isMobile  = useIsMobile()
  const {
    contas, categorias, planos, perfil, user, cenarioPrevisao, setCenarioPrevisao,
  } = useApp()

  const hoje = new Date()
  const [viewMes, setViewMes] = useState(hoje.getMonth())
  const [viewAno, setViewAno] = useState(hoje.getFullYear())

  const nome = perfil.apelido || perfil.nome.split(' ')[0] || user?.email?.split('@')[0] || 'Usuário'

  // ── Cálculos do mês ──────────────────────────────────────────────────
  // Nenhum número desta tela é calculado aqui: saem das MESMAS funções do
  // Radar, pela passagem que a Início divide com Análises (useMesDaInicio).
  const { totalEntradas, totalSaidas, totalPrevS, linhasSaida, deps, temPlano, usaPlanoNoMes } =
    useMesDaInicio(viewAno, viewMes)

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
  const [contasAbertas, setContasAbertas] = useState(false)

  // A série do Simulador, do mês corrente ao fim do plano — a parte cara,
  // calculada uma vez para o aviso e para o gráfico. Sem plano, não há série.
  const serie = useMemo(() => (olhaAFrente ? serieBaseDoPlano(deps) : null), [olhaAFrente, deps])

  // Pior mês à frente: o primeiro mês negativo e o pior, marcados como pontos
  // vermelhos no gráfico de evolução. O primeiro também vira aviso.
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

  // Ritmo do mês: só no mês corrente e com plano. Vira a folga do hero ("ainda
  // dá para gastar") e, acelerado, um aviso. Ver utils/ritmoDoMes.
  const ritmo = useMemo(
    () => (ehMesCorrente && usaPlanoNoMes ? ritmoDoMes(linhasSaida, categorias) : null),
    [ehMesCorrente, usaPlanoNoMes, linhasSaida, categorias],
  )

  // No máximo três avisos — ver utils/avisosDoMes. Sem plano no mês não há
  // "passou do plano" a dizer.
  const avisos = useMemo(() => avisosDoMes({
    contas: aVencer,
    linhasSaida: usaPlanoNoMes ? linhasSaida : [],
    negativo: alertaFuturo?.primeiroNegativo ?? null,
    ritmo,
  }), [aVencer, usaPlanoNoMes, linhasSaida, alertaFuturo, ritmo])

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

  useEffect(() => {
    if (!user) return
    creditarAurix(user.id, 'acao', 'Acessou o Início', 2, 'acao_dashboard').then(r => {
      if (r) dispararToastAurix({ tipo: 'acao', titulo: 'Acessou o Início', pontos: 2 })
    })
  }, [user?.id])

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
          description="Aqui você vê, de relance, como o mês termina e o que precisa da sua atenção."
          tips={[
            { icon: '🧭', text: 'No topo: com quanto o mês termina e quanto ainda dá para gastar' },
            { icon: '🔔', text: 'Os avisos aparecem só quando há algo a fazer' },
            { icon: '📊', text: 'O detalhe mês a mês e por categoria fica em Análises' },
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

        {/* ══ 1 · A resposta ══ Uma frase e um número: com quanto o mês termina.
            Mês corrente: com quanto termina, e quanto ainda dá para gastar na
            variável. Mês fechado: com quanto terminou. Mês futuro: com quanto
            deve terminar — sem a linha de status, que julga o que aconteceu.
            Ver components/inicio/HeroSaldo. */}
        {(() => {
          const mesNome = MESES_FULL[viewMes]
          const hero = ehFuturo && previsao ? {
            status: null as StatusHero | null,
            rotulo: `${mesNome} deve terminar com`,
            valor: previsao.final,
            folga: null,
            apoio: [
              { rotulo: 'abre com', valor: previsao.inicial },
              { rotulo: 'saem', valor: previsao.saidas },
              { rotulo: 'entram', valor: previsao.entradas },
            ],
          } : memoria ? {
            status: { cor: STATUS_HERO[compassStatus].cor, frase: STATUS_HERO[compassStatus].frase(mesNome, !ehMesCorrente) },
            rotulo: ehMesCorrente ? `${mesNome} termina com` : `${mesNome} terminou com`,
            valor: memoria.fechamento,
            // A folga é o "sobra" do ritmoDoMes — o mesmo número da frase do
            // topo do Radar. Passou: quanto passou, em vermelho claro.
            folga: ritmo ? (ritmo.estado === 'passou' ? {
              rotulo: 'As despesas variáveis passaram do plano em', valor: ritmo.gasto - ritmo.planejado,
              detalhe: 'cada gasto variável agora sai do saldo', passou: true,
            } : {
              rotulo: 'Ainda dá para gastar', valor: ritmo.sobra, passou: false,
              detalhe: ritmo.diasRestantes === 1 ? 'hoje, o último dia'
                : `até o dia ${ritmo.totalDias} · ${fmt(ritmo.porDia)} por dia`,
            }) : null,
            apoio: ehMesCorrente
              ? [{ rotulo: 'Hoje no banco', valor: saldoDisponivel }]
              : [{ rotulo: 'Abriu com', valor: memoria.abertura }],
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

        {/* ══ 2 · O que pede atenção ══ Só no mês corrente: no máximo três
            avisos, uma frase e um botão cada (utils/avisosDoMes). Sem nenhum,
            "Tudo em dia". As contas abrem a lista aqui mesmo; o resto leva para
            onde a ação acontece. */}
        {ehMesCorrente && (
          <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <AvisosCard avisos={avisos} isMobile={isMobile}
              emDia={usaPlanoNoMes
                ? 'Nenhuma conta vencendo nos próximos 7 dias e nenhum grupo passou do plano.'
                : 'Nenhuma conta vencendo nos próximos 7 dias.'}
              acoes={{
                contas:   { rotulo: contasAbertas ? 'Fechar a lista' : 'Ver contas', aberto: contasAbertas,
                            onClick: () => setContasAbertas(v => !v) },
                passou:   { rotulo: 'Ver no Radar', onClick: () => navigate('/radar') },
                negativo: { rotulo: 'Ver o plano', onClick: () => navigate('/planejamento') },
                ritmo:    { rotulo: 'Ver o ritmo', onClick: () => navigate('/analises#este-mes') },
              }} />
            {contasAbertas && aVencer.length > 0 && (
              <ContasAVencerCard contas={aVencer} categorias={categorias} isMobile={isMobile}
                onAbrir={() => navigate('/novo-lancamento')} />
            )}
          </div>
        )}

        {/* Mês futuro: o calendário inteiro de contas — onde elas se concentram. */}
        {ehFuturo && contasFuturo.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <ContasAVencerCard contas={contasFuturo} categorias={categorias} isMobile={isMobile}
              titulo={`Contas de ${MESES_FULL[viewMes].toLowerCase()}`}
              acao="Ver o mês em Lançamentos →"
              onAbrir={() => navigate('/novo-lancamento')} />
          </div>
        )}

        {/* ══ 3 · Um gráfico só ══ Para onde o saldo vai: o passado real, a
            previsão até o fim do plano, e o mês negativo marcado. */}
        {evolucao.length >= 2 && (
          <div style={{
            background: COR.branco, borderRadius: 14, padding: isMobile ? '14px 12px 10px' : '18px 20px 12px',
            border: `1px solid ${COR.borda}`, marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: COR.texto }}>Para onde o seu saldo está indo</div>
                <div style={{ fontSize: 12, color: COR.textoSuave, marginTop: 2 }}>
                  Bancos e dinheiro · linha cheia é o que aconteceu, tracejada é a previsão
                  {serie && fimPlano ? ` até ${MESES_FULL[fimPlano.mes].toLowerCase()} de ${fimPlano.ano}` : ''}
                </div>
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

        {/* ══ 4 · A porta para o detalhe ══ Tudo que saiu da Início está em
            Análises, com os mesmos números. Um cartão, não dez quadros. */}
        <div style={{ background: COR.branco, borderRadius: 14, padding: isMobile ? '14px' : '18px 20px',
          border: `1px solid ${COR.borda}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: COR.texto, marginBottom: 12 }}>Quer ver em detalhe?</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 10 }}>
            {([
              ['mes-a-mes', 'Mês a mês', 'Receitas e despesas contra o plano'],
              ['por-categoria', 'Por categoria', 'Cada categoria ao longo dos meses'],
              ['precisao', 'Precisão do plano', 'Onde o plano costuma errar'],
              ['movimentacoes', 'Movimentações', 'Últimos lançamentos, metas e dívidas'],
            ] as const).map(([ancora, nomeBotao, sub]) => (
              <button key={ancora} type="button" onClick={() => navigate(`/analises#${ancora}`)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, textAlign: 'left',
                padding: '12px 14px', borderRadius: 12, border: `1px solid ${COR.borda}`, background: '#f8fafc',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <b style={{ fontSize: 14, color: '#1e3a8a' }}>{nomeBotao} →</b>
                <span style={{ fontSize: 12, color: COR.textoSuave, lineHeight: 1.35 }}>{sub}</span>
              </button>
            ))}
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
