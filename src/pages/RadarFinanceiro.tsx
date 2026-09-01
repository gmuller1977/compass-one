import { useState, useMemo, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { DadosMes, Categoria } from '../context/AppContext'
import AppHeader from '../components/AppHeader'
import PageHeader from '../components/PageHeader'
import SeletorMesAno from '../components/SeletorMesAno'
import { construirRealizadoMes } from '../utils/realizadoMes'
import { resolverFixaDoMes } from '../utils/fixasDoMes'
import { acharPlanCat, resolverPlanCats } from '../components/acompanhamento/evolucaoCalcs'
import EmptyState from '../components/EmptyState'
import TutorialCard from '../components/TutorialCard'
import { COR, fmt, MESES_FULL, diasNoMes, type CatReal } from '../components/acompanhamento/AcShared'
import { buildAllCats, calcGrupoReal, calcGrupoPrev } from '../components/acompanhamento/evolucaoCalcs'
import { creditarAurix } from '../utils/aurix'
import { dispararToastAurix } from '../components/aurix/AurixToast'
import AcMobileView from '../components/acompanhamento/AcMobileView'
import EvolucaoGrupo from '../components/acompanhamento/EvolucaoGrupo'
import KpiCard from '../components/KpiCard'

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

  const saldoInicial = useMemo(() => {
    let acc = contas
      .filter(c => c.tipo !== 'cartao')
      .reduce((s, c) => s + (c.saldoInicial ?? 0), 0)
    acc += (saldoInicialDinheiro ?? 0)

    for (const [key, dados] of Object.entries(extratoData)) {
      const m = key.match(/-(\d{4})-(\d{2})$/)
      if (!m) continue
      const ky = parseInt(m[1])
      const km = parseInt(m[2]) - 1
      if (ky > ano || (ky === ano && km >= mes)) continue

      const isDinheiroKey = key.startsWith('dinheiro')
      if (!isDinheiroKey && !contas.some(c => c.tipo !== 'cartao' && key.startsWith(c.id))) continue

      const dm = dados as DadosMes
      const totalDiasK = new Date(ky, km + 1, 0).getDate()
      for (let d = 1; d <= totalDiasK; d++) {
        for (const l of (dm.lancamentos?.[d] ?? [])) {
          acc += l.tipo === 'entrada' ? l.valor : -l.valor
        }
      }
    }
    // As fixas consolidadas dos meses anteriores tambem movimentaram a conta.
    // Sem isto o saldo acumulado ignorava toda fixa de janeiro ate o mes
    // passado — quase sempre despesa, entao o saldo vinha alto, e o erro
    // crescia a cada mes. O laco acima so soma lancamentos.
    //
    // Agrupado por MES, nao por conta: contar por chave do extrato somaria a
    // mesma fixa uma vez por conta bancaria. Ver utils/fixasDoMes.
    const porMes = new Map<string, DadosMes[]>()
    for (const [key, dados] of Object.entries(extratoData)) {
      if (key.length < 8) continue
      const ky = parseInt(key.slice(-7, -3))
      const km = parseInt(key.slice(-2)) - 1
      if (!Number.isFinite(ky) || !Number.isFinite(km)) continue
      if (ky > ano || (ky === ano && km >= mes)) continue
      if (contas.some(c => c.tipo === 'cartao' && key.startsWith(c.id))) continue
      const id = ky + '|' + km
      if (!porMes.has(id)) porMes.set(id, [])
      porMes.get(id)!.push(dados as DadosMes)
    }
    
    const fixasAtivas = categorias.filter((c: Categoria) => c.fixa && c.ativa)
    for (const [id, dms] of porMes) {
      const [kyS, kmS] = id.split('|')
      const kAno = parseInt(kyS)
      const kMes = parseInt(kmS)
      const planoK = planos[kAno]
      const resolvidasK = {
        saida:   resolverPlanCats('saida',   planoK?.saidas   ?? [], categorias),
        entrada: resolverPlanCats('entrada', planoK?.entradas ?? [], categorias),
      }
      for (const f of fixasAtivas) {
        // Todo mes aqui e passado, por construcao do filtro acima.
        const { consolidada, override } = resolverFixaDoMes(f.id, dms)
        if (!consolidada) continue
        const lista = f.tipo === 'saida' ? resolvidasK.saida : resolvidasK.entrada
        const planVal = acharPlanCat(lista, f.nome, f.descricao)?.v[kMes] ?? 0
        const val = override ?? planVal
        if (val <= 0) continue
        acc += f.tipo === 'entrada' ? val : -val
      }
    }
    
    return acc
  }, [contas, saldoInicialDinheiro, extratoData, ano, mes, categorias, planos])

  const saldoAtual = saldoInicial + totalRealE - totalRealS

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
          mb={0}
          rightContent={
            <SeletorMesAno
              mes={mes} ano={ano}
              onSelect={(m, a) => { setMes(m); setAno(a) }}
            />
          }
        />
      </div>

      {/* KPIs CONSOLIDADOS */}
      <div style={{ padding: '8px 16px', flexShrink: 0, display: 'flex', gap: 8 }}>
        <KpiCard icon="🔒" label="Saldo inicial" value={fmt(saldoInicial)}
          sublabel={`${MESES_FULL[mes]} ${ano}`} style={{ flex: 1 }} />
        <KpiCard icon="↑" label="Receitas" value={fmt(totalRealE)}
          valueColor="#4ade80" sublabel={`de ${fmt(totalPrevE)}`} style={{ flex: 1 }} />
        <KpiCard icon="↓" label="Despesas" value={fmt(totalRealS)}
          valueColor="#f87171" sublabel={`de ${fmt(totalPrevS)}`} style={{ flex: 1 }} />
        <KpiCard icon="=" label="Saldo atual" value={fmt(saldoAtual)}
          valueColor={saldoAtual >= 0 ? '#fff' : '#f87171'}
          sublabel={saldoAtual >= 0 ? '↑ positivo' : '↓ negativo'} style={{ flex: 1 }} />
      </div>

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
