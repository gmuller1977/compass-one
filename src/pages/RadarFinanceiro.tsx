import { useState, useMemo, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { DadosMes, Categoria } from '../context/AppContext'
import AppHeader from '../components/AppHeader'
import PageHeader from '../components/PageHeader'
import SeletorMesAno from '../components/SeletorMesAno'
import { construirRealizadoMes } from '../utils/realizadoMes'
import { saldoBancosEDinheiro, detalharMes } from '../utils/saldoConta'
import EmptyState from '../components/EmptyState'
import TutorialCard from '../components/TutorialCard'
import { COR, fmt, MESES_FULL, diasNoMes, barCorSobreAzul, type CatReal } from '../components/acompanhamento/AcShared'
import { buildAllCats, calcGrupoReal, calcGrupoPrev } from '../components/acompanhamento/evolucaoCalcs'
import { creditarAurix } from '../utils/aurix'
import { dispararToastAurix } from '../components/aurix/AurixToast'
import AcMobileView from '../components/acompanhamento/AcMobileView'
import EvolucaoGrupo from '../components/acompanhamento/EvolucaoGrupo'
import KpiCard, { KpiBarra } from '../components/KpiCard'
import RadarDetalheContas from '../components/acompanhamento/RadarDetalheContas'

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

  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { contas, categorias, planos, extratoData, faturaData, user, saldoInicialDinheiro } = useApp()

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
  const cartaoNomes = useMemo(
    () => new Set(contas.filter(c => c.tipo === 'cartao').map(c => c.nome.toLowerCase())),
    [contas],
  )

  function buildGrupos(tipo: 'saida' | 'entrada') {
    const cats = categorias.filter((c: Categoria) =>
      c.tipo === tipo && c.ativa && !cartaoNomes.has(c.nome.toLowerCase())
    )
    const gs = Array.from(new Set(cats.map((c: Categoria) => c.grupo ?? '__sem_grupo__')))
    return gs.sort((a,b) => {
      if (a === '__sem_grupo__') return 1
      if (b === '__sem_grupo__') return -1
      return a.localeCompare(b, 'pt-BR')
    })
  }

  const gruposSaida   = useMemo(() => buildGrupos('saida'),  [categorias, cartaoNomes])
  const gruposEntrada = useMemo(() => buildGrupos('entrada'), [categorias, cartaoNomes])

  const { totalPrevS, totalRealS, totalPrevE, totalRealE } = useMemo(() => {
    const somarGrupos = (
      tipo: 'saida' | 'entrada',
      grupos: string[],
      planCats: { nome: string; v: number[] }[],
      realMap: Record<string, CatReal>,
    ) => grupos.reduce((acc, grupo) => {
      const cats = buildAllCats(tipo, grupo, planCats, realMap, categorias, cartaoNomes)
      return {
        prev: acc.prev + calcGrupoPrev(cats, mes),
        real: acc.real + calcGrupoReal(cats, realMap),
      }
    }, { prev: 0, real: 0 })

    const e = somarGrupos('entrada', gruposEntrada, dadosAno?.entradas ?? [], entradasMap)
    const s = somarGrupos('saida',   gruposSaida,   dadosAno?.saidas   ?? [], saidasMap)
    return { totalPrevE: e.prev, totalRealE: e.real, totalPrevS: s.prev, totalRealS: s.real }
  }, [dadosAno, mes, entradasMap, saidasMap, gruposEntrada, gruposSaida, categorias, cartaoNomes])

  // O Radar nao calcula saldo proprio: soma os saldos das contas de banco e
  // do dinheiro, os mesmos que Lancamentos mostra. Assim o saldo inicial de
  // um mes e, por construcao, o saldo final do anterior.
  //
  // Cartao fica de fora: nao tem saldo, tem fatura.
  const depsSaldo = useMemo(() => ({
    extratoData: extratoData as Record<string, DadosMes>,
    faturaData: faturaData as Record<string, { lancamentos?: Record<number, { tipo: string; valor: number }[]> }>,
    contas, categorias, planos, saldoInicialDinheiro,
  }), [extratoData, faturaData, contas, categorias, planos, saldoInicialDinheiro])

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

  // Onde o mes deveria fechar se o plano se cumprisse: o saldo REAL de abertura
  // mais o planejado do mes. Nao e projecao — nao olha o que ja caiu nem o que
  // falta cair, so compara o realizado com o plano, a mesma lente das
  // categorias logo abaixo.
  const saldoPrevisto = saldoInicial + totalPrevE - totalPrevS

  const perc = (real: number, prev: number) => (prev > 0 ? real / prev : null)
  const percE = perc(totalRealE, totalPrevE)
  const percS = perc(totalRealS, totalPrevS)
  const percSaldo = perc(saldoAtual, saldoPrevisto)
  const comPlano = (p: number | null) => (p === null ? '' : ` · ${Math.round(p * 100)}%`)

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

      {/* KPIs CONSOLIDADOS — clicar em qualquer um abre o detalhe por conta */}
      <div style={{ padding: '8px 16px', flexShrink: 0, display: 'flex', gap: 8 }}>
        <KpiCard icon="🔒" label="Saldo inicial" value={fmt(saldoInicial)}
          sublabel={`${MESES_FULL[mes]} ${ano}`} style={{ flex: 1 }}
          onClick={alternarDetalhe} expandido={detalheContas} />
        <KpiCard icon="↑" label="Receitas" value={fmt(totalRealE)}
          valueColor="#4ade80" sublabel={`de ${fmt(totalPrevE)}${comPlano(percE)}`} style={{ flex: 1 }}
          onClick={alternarDetalhe} expandido={detalheContas}>
          {percE !== null && <KpiBarra perc={percE} cor={barCorSobreAzul(percE, true)} />}
        </KpiCard>
        <KpiCard icon="↓" label="Despesas" value={fmt(totalRealS)}
          valueColor="#f87171" sublabel={`de ${fmt(totalPrevS)}${comPlano(percS)}`} style={{ flex: 1 }}
          onClick={alternarDetalhe} expandido={detalheContas}>
          {percS !== null && <KpiBarra perc={percS} cor={barCorSobreAzul(percS)} />}
        </KpiCard>
        <KpiCard icon="=" label="Saldo atual" value={fmt(saldoAtual)}
          valueColor={saldoAtual >= 0 ? '#fff' : '#f87171'}
          sublabel={percSaldo === null
            ? (saldoAtual >= 0 ? '↑ positivo' : '↓ negativo')
            : `de ${fmt(saldoPrevisto)}${comPlano(percSaldo)}`}
          style={{ flex: 1 }}
          onClick={alternarDetalhe} expandido={detalheContas}>
          {percSaldo !== null && <KpiBarra perc={percSaldo} cor={barCorSobreAzul(percSaldo, true)} />}
        </KpiCard>
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
            { icon: '🟡', text: 'Amarelo = chegando no limite' },
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
          <>
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
          </>
        )}
      </div>
    </div>
  )
}
