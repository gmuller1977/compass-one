import { useState, useMemo, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { DadosMes } from '../context/AppContext'
import AppHeader from '../components/AppHeader'
import PageHeader from '../components/PageHeader'
import SeletorMesAno from '../components/SeletorMesAno'
import { construirRealizadoMes } from '../utils/realizadoMes'
import { saldoBancosEDinheiro, detalharMes, memoriaDoRadar } from '../utils/saldoConta'
import { MemoriaSaldo, ChipCenario } from '../components/novoLancamentoExtrato/NleExtrato'
import EmptyState from '../components/EmptyState'
import TutorialCard from '../components/TutorialCard'
import { COR, fmt, MESES_FULL, diasNoMes } from '../components/acompanhamento/AcShared'
import { RADAR_COR_AZUL, faixaRadar } from '../components/acompanhamento/radarCores'
import { nomesDeCartao, gruposDoRadar, totaisDoMes } from '../components/acompanhamento/evolucaoCalcs'
import { creditarAurix } from '../utils/aurix'
import { dispararToastAurix } from '../components/aurix/AurixToast'
import AcMobileView from '../components/acompanhamento/AcMobileView'
import EvolucaoGrupo from '../components/acompanhamento/EvolucaoGrupo'
import KpiCard, { KpiBarra } from '../components/KpiCard'
import RadarDetalheContas from '../components/acompanhamento/RadarDetalheContas'
import ResumoRadarFaixa from '../components/acompanhamento/ResumoRadarFaixa'
import { resumoDoMes } from '../utils/resumoRadar'
import { AjustePlanoContexto } from '../components/acompanhamento/ajustePlanoContexto'
import AjustePlanoRadar, { type AjusteAberto } from '../components/acompanhamento/AjustePlanoRadar'

function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
}

export default function RadarFinanceiro() {
  const hoje    = new Date()
  const mesHoje = hoje.getMonth()
  const anoHoje = hoje.getFullYear()

  const isMobile = useIsMobile()
  const [mes, setMes]               = useState(mesHoje)
  const [ano, setAno]               = useState(anoHoje)
  const [abertos, setAbertos] = useState<Set<string>>(new Set())
  const [detalheContas, setDetalheContas] = useState(false)
  const [memoriaAberta, setMemoriaAberta] = useState(false)

  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { contas, categorias, planos, setPlanos, extratoData, faturaData, user, saldoInicialDinheiro, cenarioPrevisao, setCenarioPrevisao } = useApp()

  // Ajustar o plano de uma categoria sem sair do Radar (pedido do Guilherme,
  // 06/10/2026). Só GRAVA no plano, pelas funções do Planejamento; o Radar
  // relê o plano e a linha se redesenha. Ver AjustePlanoDialog.
  const [ajuste, setAjuste] = useState<AjusteAberto | null>(null)

  useEffect(() => {
    if (!user) return
    creditarAurix(user.id, 'acao', 'Viu o Radar financeiro', 2, 'acao_evolucao').then(r => {
      if (r) dispararToastAurix({ tipo: 'acao', titulo: 'Viu o Radar financeiro', pontos: 2 })
    })
  }, [user?.id])


  const totalDias = diasNoMes(mes, ano)
  const dadosAno  = planos[ano]

  // ── Realizados ────────────────────────────────────────────────────────
  const { saidasMap, entradasMap } = useMemo(
    () => construirRealizadoMes({ ano, mes, extratoData: extratoData as Record<string, DadosMes>,
      faturaData, contas, categorias, planoAno: dadosAno }),
    [ano, mes, extratoData, faturaData, contas, categorias, dadosAno],
  )

  // ── Grupos ────────────────────────────────────────────────────────────
  const cartaoNomes = useMemo(() => nomesDeCartao(contas), [contas])

  const gruposSaida   = useMemo(() => gruposDoRadar('saida',   categorias, cartaoNomes), [categorias, cartaoNomes])
  const gruposEntrada = useMemo(() => gruposDoRadar('entrada', categorias, cartaoNomes), [categorias, cartaoNomes])

  // Os totais saem de totaisDoMes, a mesma função que a tela Início usa.
  const { totalPrevS, totalRealS, totalPrevE, totalRealE, linhasSaida } = useMemo(() => {
    const t = totaisDoMes({ mes, planoAno: dadosAno, categorias, cartaoNomes, entradasMap, saidasMap })
    return { totalPrevE: t.entrada.prev, totalRealE: t.entrada.real, totalPrevS: t.saida.prev, totalRealS: t.saida.real,
      linhasSaida: t.saida.linhas }
  }, [dadosAno, mes, entradasMap, saidasMap, categorias, cartaoNomes])

  // A resposta prática do mês, antes dos números: quanto ainda dá para gastar
  // na variável, por dia, e quais grupos passaram. Mesmo número do "Ritmo do
  // mês" da Início — ver resumoRadar.
  const resumo = useMemo(
    () => (dadosAno ? resumoDoMes(linhasSaida, categorias, ano, mes) : null),
    [dadosAno, linhasSaida, categorias, ano, mes],
  )

  // O Radar nao calcula saldo proprio: soma os saldos das contas de banco e
  // do dinheiro, os mesmos que Lancamentos mostra. Assim o saldo inicial de
  // um mes e, por construcao, o saldo final do anterior.
  //
  // Cartao fica de fora: nao tem saldo, tem fatura.
  const depsSaldo = useMemo(() => ({
    extratoData: extratoData as Record<string, DadosMes>,
    faturaData: faturaData as Record<string, { lancamentos?: Record<number, { tipo: string; valor: number }[]> }>,
    contas, categorias, planos, saldoInicialDinheiro, cenarioPrevisao,
  }), [extratoData, faturaData, contas, categorias, planos, saldoInicialDinheiro, cenarioPrevisao])

  // So realizado, em qualquer mes. O Radar e acompanhamento em tempo real: o
  // saldo atual e o que esta no banco hoje, e o mes seguinte abre com ele.
  // Projecao existe, mas e assunto do Planejamento — ver saldoContaNoFim.
  const saldoInicial = useMemo(() => {
    const mAnt = mes === 0 ? 11 : mes - 1
    const aAnt = mes === 0 ? ano - 1 : ano
    return saldoBancosEDinheiro(aAnt, mAnt, depsSaldo)
  }, [ano, mes, depsSaldo])

  const saldoAtual = useMemo(
    () => saldoBancosEDinheiro(ano, mes, depsSaldo),
    [ano, mes, depsSaldo],
  )

  // Com quanto o mes FECHA, e de onde isso vem: a memoria de calculo de
  // Lancamentos, consolidada em todas as contas. `fechamento` e o mesmo numero
  // que saldoTotalNoFim devolve, e as linhas fecham nele por construcao.
  //
  // Isto nao reabre a regra de que o Radar so mostra realizado: os cartoes do
  // topo seguem sendo o que aconteceu. O previsto mora na barra do pe, como em
  // Lancamentos, e so se abre quando pedido.
  const memoria = useMemo(
    () => memoriaDoRadar(ano, mes, depsSaldo),
    [ano, mes, depsSaldo],
  )
  const saldoPrevisto = memoria.fechamento

  const perc = (real: number, prev: number) => (prev > 0 ? real / prev : null)
  const percE = perc(totalRealE, totalPrevE)
  const percS = perc(totalRealS, totalPrevS)
  const comPlano = (p: number | null) => (p === null ? '' : ` · ${Math.round(p * 100)}%`)
  // As barrinhas dos cartões seguem a MESMA regra e as MESMAS cores das barras
  // de grupo: o cartão tem o mesmo fundo azul, e três tons de vermelho na mesma
  // tela (cartão, grupo, categoria) foram o motivo desta troca. Categoria fica
  // com o tom escuro porque o fundo dela é branco — ver radarCores.
  // Saldo: verde positivo, vermelho negativo — os mesmos tons das receitas e
  // despesas (RADAR_COR_AZUL). Vale para os dois cartões de saldo e para o
  // número do rodapé; no rodapé negativo, sobre #991b1b, o vermelho dá 5,74.
  const corSaldo = (v: number) => (v >= 0 ? RADAR_COR_AZUL.bom : RADAR_COR_AZUL.ruim)
  const corBarra = (p: number, isEntrada: boolean) => RADAR_COR_AZUL[faixaRadar(Math.round(p * 100) / 100, isEntrada)]

  // O detalhe sai da mesma funcao dos dois cartoes de saldo, entao a linha
  // Total bate com eles por construcao.
  const linhasContas = useMemo(
    () => detalharMes(ano, mes, depsSaldo),
    [ano, mes, depsSaldo],
  )


  const alternarDetalhe = () => setDetalheContas(v => !v)

  function toggleAberto(uid: string) {
    setAbertos(prev => { const n = new Set(prev); n.has(uid)?n.delete(uid):n.add(uid); return n })
  }

  // ── Mobile: early return ───────────────────────────────────────────────
  if (isMobile) {
    return (
      <AcMobileView
        mes={mes}
        ano={ano}
        setMes={setMes}
        setAno={setAno}
        totalDias={totalDias}
        dadosAno={dadosAno}
        gruposEntrada={gruposEntrada}
        gruposSaida={gruposSaida}
        entradasMap={entradasMap}
        saidasMap={saidasMap}
        totalPrevE={totalPrevE}
        totalPrevS={totalPrevS}
        totalRealE={totalRealE}
        totalRealS={totalRealS}
        categorias={categorias}
        cartaoNomes={cartaoNomes}
        user={user}
        abertos={abertos}
        toggleAberto={toggleAberto}
        navigate={navigate}
      />
    )
  }

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',overflow:'hidden',background:COR.fundo,
      fontFamily:"-apple-system,'Inter',sans-serif"}}>
      <AppHeader currentPath={pathname} />

      <div style={{ padding: '12px 16px 0', flexShrink: 0 }}>
        <PageHeader
          icon="ti-chart-bar"
          breadcrumb="TODO DIA"
          title="Radar financeiro"
          subtitle="Previsto × Realizado"
          mb={0}
          rightContent={
            <SeletorMesAno
              mes={mes} ano={ano}
              onSelect={(m, a) => { setMes(m); setAno(a) }}
            />
          }
        />
      </div>

      {/* KPIs CONSOLIDADOS — clicar em qualquer um abre o detalhe por conta.
          Os saldos seguem o padrão verde/vermelho das receitas e despesas:
          verde positivo, vermelho negativo. Antes ficavam em branco. */}
      <div style={{ padding: '8px 16px', flexShrink: 0, display: 'flex', gap: 8 }}>
        <KpiCard icon="🔒" label="Saldo inicial" value={fmt(saldoInicial)}
          valueColor={corSaldo(saldoInicial)}
          sublabel={`${MESES_FULL[mes]} ${ano}`} style={{ flex: 1 }}
          onClick={alternarDetalhe} expandido={detalheContas} />
        <KpiCard icon="↑" label="Receitas" value={fmt(totalRealE)}
          valueColor={RADAR_COR_AZUL.bom} sublabel={`de ${fmt(totalPrevE)}${comPlano(percE)}`} style={{ flex: 1 }}
          onClick={alternarDetalhe} expandido={detalheContas}>
          {percE !== null && <KpiBarra perc={percE} cor={corBarra(percE, true)} />}
        </KpiCard>
        <KpiCard icon="↓" label="Despesas" value={fmt(totalRealS)}
          valueColor={RADAR_COR_AZUL.ruim} sublabel={`de ${fmt(totalPrevS)}${comPlano(percS)}`} style={{ flex: 1 }}
          onClick={alternarDetalhe} expandido={detalheContas}>
          {percS !== null && <KpiBarra perc={percS} cor={corBarra(percS, false)} />}
        </KpiCard>
        <KpiCard icon="=" label="Saldo atual" value={fmt(saldoAtual)}
          valueColor={corSaldo(saldoAtual)}
          sublabel={saldoAtual >= 0 ? '↑ positivo' : '↓ negativo'}
          style={{ flex: 1 }}
          onClick={alternarDetalhe} expandido={detalheContas} />
      </div>

      {detalheContas && (
        <div style={{ padding: '0 16px 8px', flexShrink: 0 }}>
          <RadarDetalheContas linhas={linhasContas} />
        </div>
      )}

      {/* CONTEÚDO */}
      <div style={{flex:1,overflowY:'auto',padding:'12px 16px 80px',
        display:'flex',flexDirection:'column',gap:12}}>
        <TutorialCard
          tela="radar"
          icon="📈"
          title="Veja como você está indo"
          description="Aqui o app compara o que você planejou com o que realmente gastou. É assim que você descobre onde pode melhorar."
          tips={[
            { icon: '🟢', text: 'Verde = dentro do plano' },
            { icon: '🟢', text: 'Verde-claro = no limite, mas ainda dentro' },
            { icon: '🔴', text: 'Vermelho = passou do planejado' },
          ]}
          buttonLabel="Ver meu radar →"
        />
        {!dadosAno ? (
          <EmptyState
            icon="📈"
            title="Veja se está no caminho certo"
            description={`Aqui você compara o que planejou com o que gastou em ${ano}. Para começar, monte seu plano.`}
            actionLabel="Criar plano →"
            onAction={() => navigate('/planejamento?modo=wizard')}
          />
        ) : (
          <AjustePlanoContexto.Provider value={setAjuste}>
            {resumo && <ResumoRadarFaixa resumo={resumo} />}
            {/* ENTRADAS — um card por grupo */}
            {(dadosAno.entradas ?? []).length > 0 && gruposEntrada.map(grupo => (
              <EvolucaoGrupo
                key={`entrada-${grupo}`}
                tipo="entrada"
                grupo={grupo}
                planCats={dadosAno.entradas ?? []}
                realMap={entradasMap}
                categorias={categorias}
                cartaoNomes={cartaoNomes}
                mes={mes}
              />
            ))}

            {/* SAÍDAS — um card por grupo */}
            {(dadosAno.saidas ?? []).length > 0 && gruposSaida.map(grupo => (
              <EvolucaoGrupo
                key={`saida-${grupo}`}
                tipo="saida"
                grupo={grupo}
                planCats={dadosAno.saidas ?? []}
                realMap={saidasMap}
                categorias={categorias}
                cartaoNomes={cartaoNomes}
                mes={mes}
              />
            ))}
          </AjustePlanoContexto.Provider>
        )}
      </div>

      {ajuste && (
        <AjustePlanoRadar ajuste={ajuste} setAjuste={setAjuste} planos={planos} setPlanos={setPlanos}
          ano={ano} mes={mes} categorias={categorias} deps={depsSaldo} />
      )}

      {/* Saldo final previsto — a mesma barra de Lancamentos, no pe da tela.
          Saiu do cartao do saldo atual: la ele era um numero sem explicacao;
          aqui ele abre a memoria de calculo. */}
      {(() => {
        const positivo = saldoPrevisto >= 0
        return (
          <div style={{ padding: '8px 16px', flexShrink: 0, borderTop: '1px solid #e2e8f0', background: '#f8faff' }}>
            <div style={{ borderRadius: 12,
              background: positivo ? 'linear-gradient(135deg,#0f2878,#1e40af)' : 'linear-gradient(135deg,#7f1d1d,#991b1b)' }}>
              <div role="button" tabIndex={0} aria-expanded={memoriaAberta}
                onClick={() => setMemoriaAberta(v => !v)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMemoriaAberta(v => !v) } }}
                style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', cursor: 'pointer' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                    Saldo final previsto
                    <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                      background: 'rgba(255,255,255,.15)', color: 'rgba(255,255,255,.9)' }}>
                      {memoriaAberta ? 'ocultar cálculo' : 'ver cálculo'}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.75)', marginTop: 3,
                    display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span>{MESES_FULL[mes]} {ano} · todas as contas</span>
                    <ChipCenario cenario={cenarioPrevisao} />
                  </div>
                  {/* No otimista o plano de variaveis e um envelope so. Vazio, ele nao
                      reserva mais nada, e todo gasto variavel novo sai inteiro do
                      saldo final — a previsao perdeu a folga, e isso precisa aparecer
                      sem abrir o calculo. #fde047 no extremo mais claro de cada
                      gradiente da barra: 6,62 no azul, 6,30 no vermelho. */}
                  {cenarioPrevisao === 'otimista' && memoria.excessoVariavel > 0.005 && (
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: '#fde047', marginTop: 5, lineHeight: 1.35 }}>
                      {/* "Gastos variaveis", e nao so "Realizado": na mesma tela o cartao
                          Receitas tambem mostra realizado acima do previsto, e ali e boa
                          noticia, nao motivo para trocar de cenario. */}
                      ⚠ Gastos variáveis maiores que o previsto — recomendamos usar outro cenário
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.6px', fontVariantNumeric: 'tabular-nums',
                  // Negativo, a barra do rodapé é VERMELHA: #f87171 ali dá 3,00 e
                  // some no fundo. Fica o vermelho-claro #fecaca (5,74) — o único
                  // ponto fora do azul, e o número que mais precisa ser lido.
                  color: positivo ? RADAR_COR_AZUL.bom : '#fecaca' }}>
                  {fmt(saldoPrevisto)}
                </span>
              </div>
              {/* A barra é fixa no pé da tela (flexShrink 0). Aberta, a memória passava da
                  altura livre: espremia o conteúdo até zero e o fim dela sumia abaixo da
                  borda. Limitada a 35% da tela, rola por dentro. Corrigido em 05/10/2026. */}
              {memoriaAberta && (
                <div style={{ maxHeight: '35vh', overflowY: 'auto', borderRadius: '0 0 12px 12px' }}>
                  <MemoriaSaldo m={memoria} positivo={positivo}
                    cenario={cenarioPrevisao} onCenario={setCenarioPrevisao} />
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
