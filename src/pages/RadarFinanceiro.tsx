import { useState, useMemo, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { DadosMes, Categoria } from '../context/AppContext'
import AppHeader from '../components/AppHeader'
import PageHeader from '../components/PageHeader'
import SeletorMesAno from '../components/SeletorMesAno'
import { resolverFixaDoMes, dadosBancariosDoMes } from '../utils/fixasDoMes'
import { acharPlanCat } from '../components/acompanhamento/evolucaoCalcs'
import EmptyState from '../components/EmptyState'
import TutorialCard from '../components/TutorialCard'
import { COR, fmt, MESES_FULL, diasNoMes, mkCatReal, type CatReal } from '../components/acompanhamento/AcShared'
import { buildAllCats, calcGrupoReal, calcGrupoPrev, catKey, norm } from '../components/acompanhamento/evolucaoCalcs'
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


  const mesStr    = String(mes+1).padStart(2,'0')
  const totalDias = diasNoMes(mes, ano)
  const dadosAno  = planos[ano]
  const isPastMonth = ano < anoHoje || (ano === anoHoje && mes < mesHoje)

  // ── Realizados ────────────────────────────────────────────────────────
  const { saidasMap, entradasMap } = useMemo(() => {
    const saidas:  Record<string, CatReal> = {}
    const entradas: Record<string, CatReal> = {}
    const sufixo = `-${ano}-${mesStr}`

    // catKey normaliza nome/variante: "Civic " e "Civic" viram a mesma chave
    const rKey = catKey

    function resolverSub(nome: string, tipo: 'saida' | 'entrada', sub?: string): string | undefined {
      if (norm(sub)) return norm(sub)
      const variantes = categorias.filter(
        (c: Categoria) => norm(c.nome) === norm(nome) && c.tipo === tipo && c.ativa && norm(c.descricao)
      )
      return variantes.length === 1 ? norm(variantes[0].descricao) : undefined
    }

    const getSaida   = (k: string) => { if (!saidas[k])   saidas[k]  = mkCatReal(); return saidas[k] }
    const getEntrada = (k: string) => { if (!entradas[k]) entradas[k] = mkCatReal(); return entradas[k] }

    for (const [key, dados] of Object.entries(extratoData)) {
      if (!key.endsWith(sufixo)) continue
      const isDinheiroKey = key.startsWith('dinheiro')
      if (!isDinheiroKey && !contas.some(c => key.startsWith(c.id))) continue
      if (!isDinheiroKey && contas.some(c => c.tipo === 'cartao' && key.startsWith(c.id))) continue
      const dm = dados as DadosMes

      for (let d = 1; d <= totalDias; d++) {
        for (const l of dm.lancamentos?.[d] ?? []) {
          const fonte = isDinheiroKey ? 'dinheiro' : (l.formaPagamento === 'dinheiro' ? 'dinheiro' : 'banco')
          const sub   = resolverSub(l.categoria, l.tipo === 'saida' ? 'saida' : 'entrada',
            (l as { subCategoria?: string }).subCategoria)
          if (l.tipo === 'saida') {
            const c = getSaida(rKey(l.categoria, sub))
            c.total += l.valor
            if (fonte === 'dinheiro') c.totalDinheiro += l.valor; else c.totalBanc += l.valor
            c.lancamentos.push({ dia:d, descricao:l.descricao, valor:l.valor, sub:l.formaPagamento, fonte })
          } else {
            const c = getEntrada(rKey(l.categoria, sub))
            c.total += l.valor
            if (fonte === 'dinheiro') c.totalDinheiro += l.valor; else c.totalBanc += l.valor
            c.lancamentos.push({ dia:d, descricao:l.descricao, valor:l.valor, sub:l.formaPagamento, fonte })
          }
        }
      }

    }

    // Fixas sao do MES, nao da conta: somadas uma vez so, fora do laco.
    // Ver utils/fixasDoMes — antes cada conta bancaria somava de novo.
    const dmsBanco = dadosBancariosDoMes(
      extratoData as Record<string, DadosMes>,
      sufixo,
      key => contas.some(c => c.tipo === 'cartao' && key.startsWith(c.id)),
    )
    for (const fixaCat of categorias.filter((c: Categoria) => c.fixa && c.ativa)) {
      const { consolidada, override } = resolverFixaDoMes(
        fixaCat.id, fixaCat.formaPagamento === 'automatico', isPastMonth, dmsBanco)
      if (!consolidada) continue
      const planList = fixaCat.tipo === 'saida' ? dadosAno?.saidas : dadosAno?.entradas
      const planVal = acharPlanCat(planList, fixaCat.nome, fixaCat.descricao)?.v[mes] ?? 0
      const val = override ?? (planVal > 0 ? planVal : 0)
      if (val <= 0) continue
      const fixaSub = resolverSub(fixaCat.nome, fixaCat.tipo as 'saida' | 'entrada', fixaCat.descricao)
      const alvo = fixaCat.tipo === 'saida' ? getSaida(rKey(fixaCat.nome, fixaSub)) : getEntrada(rKey(fixaCat.nome, fixaSub))
      alvo.total += val; alvo.totalBanc += val
      alvo.lancamentos.push({ dia:1, descricao:fixaCat.nome, valor:val, sub:'automático', fonte:'banco' })
    }

    const fat = faturaData as Record<string, { lancamentos: Record<number, { tipo: string; categoria: string; subCategoria?: string; descricao?: string; valor: number }[]> }>
    for (const card of contas.filter(c => c.tipo === 'cartao')) {
      const billingOff = (card.diaVencimento ?? 1) < (card.diaFechamento ?? 1) ? 1 : 0
      let pMes = mes - billingOff, pAno = ano
      if (pMes < 0) { pMes += 12; pAno-- }
      const pMesStr = String(pMes + 1).padStart(2, '0')
      const key = `${card.id}-${pAno}-${pMesStr}`
      const dm = fat[key]
      if (!dm) continue
      const pTotalDias = new Date(pAno, pMes + 1, 0).getDate()
      for (let d = 1; d <= pTotalDias; d++) {
        for (const l of dm.lancamentos?.[d] ?? []) {
          const sub = resolverSub(l.categoria, 'saida', l.subCategoria)
          const k   = rKey(l.categoria, sub)
          if (l.tipo === 'entrada') {
            const c = getSaida(k)
            c.total += l.valor; c.totalCart += l.valor
            c.lancamentos.push({ dia:d, descricao:l.descricao??l.categoria, valor:l.valor, sub:card.apelido??card.nome, fonte:'cartao' })
          } else if (l.tipo === 'saida') {
            // Estorno: abate da categoria de saída
            const c = getSaida(k)
            c.total -= l.valor; c.totalCart -= l.valor
            c.lancamentos.push({ dia:d, descricao:l.descricao??l.categoria, valor:-l.valor, sub:card.apelido??card.nome, fonte:'cartao' })
          }
        }
      }
    }

    for (const c of Object.values(saidas))   c.lancamentos.sort((a,b) => a.dia-b.dia)
    for (const c of Object.values(entradas))  c.lancamentos.sort((a,b) => a.dia-b.dia)

    return { saidasMap: saidas, entradasMap: entradas }
  }, [ano, mes, mesStr, totalDias, isPastMonth, extratoData, faturaData, contas, categorias, dadosAno])

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
    return acc
  }, [contas, saldoInicialDinheiro, extratoData, ano, mes])

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
