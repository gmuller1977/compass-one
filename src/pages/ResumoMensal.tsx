import { useState, useMemo, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { Conta, Categoria } from '../context/AppContext'
import AppHeader from '../components/AppHeader'
import PageHeader, { PH_BTN_WHITE } from '../components/PageHeader'
import TutorialCard from '../components/TutorialCard'
import RmPatrimonio from '../components/resumoMensal/RmPatrimonio'
import RmReceitas from '../components/resumoMensal/RmReceitas'
import RmDespesas from '../components/resumoMensal/RmDespesas'
import RmFaturas from '../components/resumoMensal/RmFaturas'
import RmProjecao from '../components/resumoMensal/RmProjecao'
import RmComparativo from '../components/resumoMensal/RmComparativo'
import RmDistribuicao from '../components/resumoMensal/RmDistribuicao'
import { catKey, norm } from '../components/acompanhamento/evolucaoCalcs'
import { creditarAurix } from '../utils/aurix'
import { dispararToastAurix } from '../components/aurix/AurixToast'

export const NOMES_MESES_RM = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
export const MESES_CURTOS_RM = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function mesKey(id: string, ano: number, mes: number) {
  return `${id}-${ano}-${String(mes + 1).padStart(2, '0')}`
}

type DadosMesRm = {
  lancamentos: Record<number, { tipo: string; valor: number; categoria: string; descricao?: string }[]>
  saldoBanco?: string
  fixasConsolidadas?: Record<string, boolean>
  fixasMovidas?: Record<string, number>
  fixasValorOverride?: Record<string, number>
}

export type SaldoConta  = { conta: Conta; saldo: number }
export type FaturaCartao = { conta: Conta; fatura: number }

export type ReceitaItem = {
  catId: string; nome: string; icone: string; cor: string
  variante?: string
  previsto: number; realizado: number; recebido: boolean
}

export type DespesaItem = {
  catId: string; nome: string; icone: string; cor: string; grupo: string
  previsto: number; realizado: number; pago: boolean
}

export type TotaisMes = {
  receitas: number; despesas: number; resultado: number
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

function calcTotaisMes(
  mes: number, ano: number,
  contasExtrato: Conta[],
  contas: Conta[],
  extratoData: Record<string, DadosMesRm>,
  faturaData: Record<string, DadosMesRm>,
  fixasValorPorId: Record<string, { valor: number; tipo: string }>,
): TotaisMes {
  const mesStr = String(mes + 1).padStart(2, '0')
  const totalDiasM = new Date(ano, mes + 1, 0).getDate()
  let receitas = 0, despesas = 0

  for (const c of contasExtrato) {
    const dm = extratoData[`${c.id}-${ano}-${mesStr}`]
    if (!dm) continue
    for (let d = 1; d <= totalDiasM; d++) {
      for (const l of dm.lancamentos?.[d] ?? []) {
        l.tipo === 'entrada' ? receitas += l.valor : despesas += l.valor
      }
    }
    for (const [catId, confirmed] of Object.entries(dm.fixasConsolidadas ?? {})) {
      if (!confirmed || catId.startsWith('cartao-')) continue
      const f = fixasValorPorId[catId]
      if (!f) continue
      const override = dm.fixasValorOverride?.[catId]
      const valor = override !== undefined ? override : f.valor
      if (valor <= 0) continue
      f.tipo === 'entrada' ? receitas += valor : despesas += valor
    }
  }

  const dmDin = extratoData[`dinheiro-${ano}-${mesStr}`]
  if (dmDin) {
    for (let d = 1; d <= totalDiasM; d++) {
      for (const l of dmDin.lancamentos?.[d] ?? []) {
        l.tipo === 'entrada' ? receitas += l.valor : despesas += l.valor
      }
    }
    for (const [catId, confirmed] of Object.entries(dmDin.fixasConsolidadas ?? {})) {
      if (!confirmed || catId.startsWith('cartao-')) continue
      const f = fixasValorPorId[catId]
      if (!f) continue
      const override = dmDin.fixasValorOverride?.[catId]
      const valor = override !== undefined ? override : f.valor
      if (valor <= 0) continue
      f.tipo === 'entrada' ? receitas += valor : despesas += valor
    }
  }

  for (const c of contas.filter(ct => ct.tipo === 'cartao')) {
    const dm = faturaData[`${c.id}-${ano}-${mesStr}`]
    if (!dm?.lancamentos) continue
    for (let d = 1; d <= totalDiasM; d++) {
      for (const l of (dm.lancamentos[d] ?? [])) {
        if (l.tipo === 'entrada') despesas += l.valor
      }
    }
  }

  return { receitas, despesas, resultado: receitas - despesas }
}

export default function ResumoMensal() {
  const hoje    = new Date()
  const mesHoje = hoje.getMonth()
  const anoHoje = hoje.getFullYear()
  const isMobile = useIsMobile()
  const { pathname } = useLocation()

  const [mes, setMes] = useState(mesHoje)
  const [ano, setAno] = useState(anoHoje)
  const [activeSection, setActiveSection] = useState(0)
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([])

  const {
    contas, categorias, extratoData, faturaData,
    planos, planosReal, planejamentoLockado,
    saldoInicialDinheiro, user,
  } = useApp()

  useEffect(() => {
    if (!user) return
    creditarAurix(user.id, 'acao', 'Viu o Resumo mensal', 2, 'acao_resumo_mensal').then(r => {
      if (r) dispararToastAurix({ tipo: 'acao', titulo: 'Viu o Resumo mensal', pontos: 2 })
    })
  }, [user?.id])

  // Scroll snap no root do documento
  useEffect(() => {
    const root = document.documentElement
    root.style.scrollSnapType = 'y mandatory'
    root.style.scrollBehavior = 'smooth'
    return () => {
      root.style.scrollSnapType = ''
      root.style.scrollBehavior = ''
    }
  }, [])

  // IntersectionObserver para dot ativo
  useEffect(() => {
    const refs = sectionRefs.current.filter(Boolean) as HTMLDivElement[]
    if (refs.length === 0) return
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const idx = sectionRefs.current.findIndex(r => r === e.target)
            if (idx !== -1) setActiveSection(idx)
          }
        })
      },
      { threshold: 0.4 }
    )
    refs.forEach(r => observer.observe(r))
    return () => observer.disconnect()
  }, [mes, ano]) // recriar ao mudar mês (faturas podem aparecer/sumir)

  const contasExtrato = contas.filter(c => c.tipo === 'corrente' || c.tipo === 'poupanca')
  const dados = extratoData as Record<string, DadosMesRm>
  const fat   = faturaData  as Record<string, DadosMesRm>

  function navMes(delta: number) {
    let m = mes + delta, a = ano
    if (m < 0) { m = 11; a-- }
    if (m > 11) { m = 0; a++ }
    setMes(m); setAno(a)
  }

  // ── Planning data ────────────────────────────────────────────────────
  const dadosAno = useMemo(
    () => (planejamentoLockado && planosReal[ano]) ? planosReal[ano] : planos[ano],
    [planejamentoLockado, planosReal, planos, ano]
  )
  const dadosAnoAnterior = useMemo(() => {
    const anoAnterior = mes === 0 ? ano - 1 : ano
    return (planejamentoLockado && planosReal[anoAnterior]) ? planosReal[anoAnterior] : planos[anoAnterior]
  }, [planejamentoLockado, planosReal, planos, mes, ano])

  // ── fixasValorPorId ──────────────────────────────────────────────────
  const fixasValorPorId = useMemo(() => {
    const map: Record<string, { valor: number; tipo: string; diaVencimento: number; nome: string }> = {}
    for (const cat of categorias as Categoria[]) {
      if (!cat.fixa || !cat.ativa) continue
      const planList = cat.tipo === 'saida'
        ? (dadosAno as { saidas?: { nome: string; v: number[] }[] } | undefined)?.saidas
        : (dadosAno as { entradas?: { nome: string; v: number[] }[] } | undefined)?.entradas
      const planVal = planList?.find(c => c.nome === cat.nome)?.v[mes] ?? 0
      map[cat.id] = { valor: planVal, tipo: cat.tipo, diaVencimento: cat.diaVencimento ?? 1, nome: cat.nome }
    }
    return map
  }, [categorias, dadosAno, mes])

  const fixasValorPorIdAnterior = useMemo(() => {
    const mesAnterior = mes === 0 ? 11 : mes - 1
    const map: Record<string, { valor: number; tipo: string }> = {}
    for (const cat of categorias as Categoria[]) {
      if (!cat.fixa || !cat.ativa) continue
      const planList = cat.tipo === 'saida'
        ? (dadosAnoAnterior as { saidas?: { nome: string; v: number[] }[] } | undefined)?.saidas
        : (dadosAnoAnterior as { entradas?: { nome: string; v: number[] }[] } | undefined)?.entradas
      const planVal = planList?.find(c => c.nome === cat.nome)?.v[mesAnterior] ?? 0
      map[cat.id] = { valor: planVal, tipo: cat.tipo }
    }
    return map
  }, [categorias, dadosAnoAnterior, mes])

  // ── Saldo por conta ──────────────────────────────────────────────────
  const saldoAtualPorConta = useMemo<SaldoConta[]>(() => {
    const mesStr = String(mes + 1).padStart(2, '0')
    const totalDiasM = new Date(ano, mes + 1, 0).getDate()
    return contasExtrato.map(c => {
      const key = `${c.id}-${ano}-${mesStr}`
      const dm  = dados[key]
      let te = 0, ts = 0
      if (dm) {
        for (let d = 1; d <= totalDiasM; d++) {
          for (const l of dm.lancamentos?.[d] ?? []) {
            l.tipo === 'entrada' ? te += l.valor : ts += l.valor
          }
        }
      }
      const calculado = c.saldoInicial + te - ts
      const manual = parseFloat((dm?.saldoBanco ?? '').replace(/[R$\s.]/g, '').replace(',', '.')) || 0
      return { conta: c, saldo: manual > 0 ? manual : calculado }
    })
  }, [contasExtrato, dados, ano, mes])

  // ── Fatura por cartão ────────────────────────────────────────────────
  const faturaAtualPorCartao = useMemo<FaturaCartao[]>(() => {
    return contas.filter(c => c.tipo === 'cartao').map(c => {
      const key = mesKey(c.id, ano, mes)
      const dm  = fat[key]
      const totalDiasM = new Date(ano, mes + 1, 0).getDate()
      let total = 0
      if (dm?.lancamentos) {
        for (let d = 1; d <= totalDiasM; d++) {
          for (const l of dm.lancamentos[d] ?? []) {
            l.tipo === 'entrada' ? total += l.valor : total -= l.valor
          }
        }
      }
      return { conta: c, fatura: Math.max(0, total) }
    })
  }, [contas, fat, ano, mes])

  // ── Saldo dinheiro ───────────────────────────────────────────────────
  const saldoDinheiro = useMemo(() => {
    const mesStr = String(mes + 1).padStart(2, '0')
    const totalDiasM = new Date(ano, mes + 1, 0).getDate()
    const dm = dados[`dinheiro-${ano}-${mesStr}`]
    if (!dm) return saldoInicialDinheiro
    let te = 0, ts = 0
    for (let d = 1; d <= totalDiasM; d++) {
      for (const l of dm.lancamentos?.[d] ?? []) {
        l.tipo === 'entrada' ? te += l.valor : ts += l.valor
      }
    }
    return saldoInicialDinheiro + te - ts
  }, [dados, ano, mes, saldoInicialDinheiro])

  // ── Receitas por categoria ───────────────────────────────────────────
  const receitasInfo = useMemo<ReceitaItem[]>(() => {
    const mesStr = String(mes + 1).padStart(2, '0')
    const totalDiasM = new Date(ano, mes + 1, 0).getDate()

    // catKey normaliza nome/variante: "Senac " e "Senac" viram a mesma chave
    const rKey = catKey
    function resolverSub(nome: string, sub?: string): string | undefined {
      if (norm(sub)) return norm(sub)
      const variantes = (categorias as Categoria[]).filter(
        c => norm(c.nome) === norm(nome) && c.tipo === 'entrada' && c.ativa && norm(c.descricao)
      )
      return variantes.length === 1 ? norm(variantes[0].descricao) : undefined
    }

    const realizadoPorCat: Record<string, number> = {}
    const confirmedCats = new Set<string>()

    function processDm(dm: DadosMesRm) {
      for (let d = 1; d <= totalDiasM; d++) {
        for (const l of dm.lancamentos?.[d] ?? []) {
          if (l.tipo !== 'entrada') continue
          const sub = resolverSub(l.categoria, norm((l as { subCategoria?: string }).subCategoria))
          const k = rKey(l.categoria, sub)
          realizadoPorCat[k] = (realizadoPorCat[k] ?? 0) + l.valor
        }
      }
      for (const [catId, confirmed] of Object.entries(dm.fixasConsolidadas ?? {})) {
        if (confirmed && !catId.startsWith('cartao-')) confirmedCats.add(catId)
      }
    }

    for (const c of contasExtrato) {
      const dm = dados[`${c.id}-${ano}-${mesStr}`]
      if (dm) processDm(dm)
    }
    const dmDin = dados[`dinheiro-${ano}-${mesStr}`]
    if (dmDin) processDm(dmDin)

    const result: ReceitaItem[] = []
    const vistos = new Set<string>()

    for (const cat of categorias as Categoria[]) {
      if (cat.tipo !== 'entrada' || !cat.ativa) continue
      const chave = catKey(cat.nome, cat.descricao)
      if (vistos.has(chave)) continue
      vistos.add(chave)

      const nome = cat.nome
      const variante = norm(cat.descricao) || undefined

      // Casa por nome + variante; só cai no nome puro se o plano não tiver a
      // variante (plano legado), senão todas as variantes herdam o mesmo previsto
      const planList = (dadosAno as { entradas?: { nome: string; descricao?: string; v: number[] }[] } | undefined)?.entradas
      const doNome = planList?.filter(c => norm(c.nome) === norm(nome)) ?? []
      const planCat =
        (variante ? doNome.find(c => norm(c.descricao) === variante) : doNome.find(c => !norm(c.descricao)))
        ?? (doNome.some(c => norm(c.descricao)) ? undefined : doNome[0])
      const previsto = planCat?.v[mes] ?? 0

      let realizado = 0
      let recebido = false

      if (cat.fixa) {
        const override = (() => {
          for (const c of contasExtrato) {
            const dm = dados[`${c.id}-${ano}-${mesStr}`]
            if (dm?.fixasValorOverride?.[cat.id] !== undefined) return dm.fixasValorOverride[cat.id]
          }
          const dmDin = dados[`dinheiro-${ano}-${mesStr}`]
          if (dmDin?.fixasValorOverride?.[cat.id] !== undefined) return dmDin.fixasValorOverride[cat.id]
          return undefined
        })()
        const isConsolidada = confirmedCats.has(cat.id)
        // Fallback: fixa paga via lançamento variável (sem consolidação)
        const realizadoVar = (realizadoPorCat[rKey(nome, variante)] ?? 0) ||
          (variante ? (realizadoPorCat[rKey(nome)] ?? 0) : 0)
        recebido = isConsolidada || realizadoVar > 0
        realizado = isConsolidada
          ? (override !== undefined ? override : (fixasValorPorId[cat.id]?.valor ?? previsto))
          : realizadoVar
      } else {
        const exactVal = realizadoPorCat[rKey(nome, variante)] ?? 0
        // Fallback: lançamentos sem subCategoria ficam na chave sem variante
        realizado = exactVal > 0 ? exactVal : (variante ? (realizadoPorCat[rKey(nome)] ?? 0) : 0)
        recebido  = realizado > 0
      }

      if (previsto <= 0 && realizado <= 0) continue

      result.push({ catId: cat.id, nome, icone: cat.icone, cor: cat.cor, variante, previsto, realizado, recebido })
    }

    result.sort((a, b) => b.realizado - a.realizado || b.previsto - a.previsto)
    return result
  }, [categorias, dadosAno, dados, contasExtrato, fixasValorPorId, mes, ano])

  // ── Despesas por categoria ───────────────────────────────────────────
  const despesasInfo = useMemo<DespesaItem[]>(() => {
    const mesStr = String(mes + 1).padStart(2, '0')
    const totalDiasM = new Date(ano, mes + 1, 0).getDate()

    const realizadoPorCat: Record<string, number> = {}
    const confirmedCats = new Set<string>()

    function processDm(dm: DadosMesRm) {
      for (let d = 1; d <= totalDiasM; d++) {
        for (const l of dm.lancamentos?.[d] ?? []) {
          if (l.tipo !== 'saida') continue
          realizadoPorCat[l.categoria] = (realizadoPorCat[l.categoria] ?? 0) + l.valor
        }
      }
      for (const [catId, confirmed] of Object.entries(dm.fixasConsolidadas ?? {})) {
        if (confirmed && !catId.startsWith('cartao-')) confirmedCats.add(catId)
      }
    }

    for (const c of contasExtrato) {
      const dm = dados[`${c.id}-${ano}-${mesStr}`]
      if (dm) processDm(dm)
    }
    const dmDin = dados[`dinheiro-${ano}-${mesStr}`]
    if (dmDin) processDm(dmDin)

    for (const c of contas.filter(ct => ct.tipo === 'cartao')) {
      const dm = fat[`${c.id}-${ano}-${mesStr}`]
      if (!dm?.lancamentos) continue
      for (let d = 1; d <= totalDiasM; d++) {
        for (const l of dm.lancamentos[d] ?? []) {
          if (l.tipo === 'entrada') {
            realizadoPorCat[l.categoria] = (realizadoPorCat[l.categoria] ?? 0) + l.valor
          }
        }
      }
    }

    const result: DespesaItem[] = []
    const vistos = new Set<string>()

    for (const cat of categorias as Categoria[]) {
      if (cat.tipo !== 'saida' || !cat.ativa) continue
      const nome = cat.nome
      if (vistos.has(nome)) continue
      vistos.add(nome)

      const planList = (dadosAno as { saidas?: { nome: string; v: number[] }[] } | undefined)?.saidas
      const previsto = planList?.find(c => c.nome === nome)?.v[mes] ?? 0

      let realizado = 0
      let pago = false

      if (cat.fixa) {
        const override = (() => {
          for (const c of contasExtrato) {
            const dm = dados[`${c.id}-${ano}-${mesStr}`]
            if (dm?.fixasValorOverride?.[cat.id] !== undefined) return dm.fixasValorOverride[cat.id]
          }
          return undefined
        })()
        pago = confirmedCats.has(cat.id)
        realizado = pago ? (override !== undefined ? override : (fixasValorPorId[cat.id]?.valor ?? previsto)) : 0
      } else {
        realizado = realizadoPorCat[nome] ?? 0
        pago      = realizado > 0
      }

      const variavelExtra = cat.fixa ? 0 : 0
      realizado += variavelExtra

      if (previsto <= 0 && realizado <= 0) continue

      result.push({
        catId: cat.id, nome, icone: cat.icone, cor: cat.cor,
        grupo: cat.grupo ?? nome,
        previsto, realizado, pago,
      })
    }

    result.sort((a, b) => b.realizado - a.realizado || b.previsto - a.previsto)
    return result
  }, [categorias, dadosAno, dados, contasExtrato, contas, fat, fixasValorPorId, mes, ano])

  // ── Planejado por cartão: soma do planejamento das categorias que apareceram na fatura ──
  const cartoesPlanejado = useMemo<Record<string, number>>(() => {
    const mesStr = String(mes + 1).padStart(2, '0')
    const totalDiasM = new Date(ano, mes + 1, 0).getDate()
    const saidas = (dadosAno as { saidas?: { nome: string; v: number[] }[] } | undefined)?.saidas ?? []
    const map: Record<string, number> = {}
    for (const c of contas.filter(ct => ct.tipo === 'cartao')) {
      const dm = fat[`${c.id}-${ano}-${mesStr}`]
      if (!dm?.lancamentos) continue
      const catsUsadas = new Set<string>()
      for (let d = 1; d <= totalDiasM; d++) {
        for (const l of (dm.lancamentos[d] ?? [])) {
          if (l.tipo === 'entrada') catsUsadas.add(l.categoria)
        }
      }
      let total = 0
      for (const nome of catsUsadas) {
        total += saidas.find(s => s.nome === nome)?.v[mes] ?? 0
      }
      map[c.id] = total
    }
    return map
  }, [dadosAno, contas, fat, ano, mes])

  // ── Totais ───────────────────────────────────────────────────────────
  const totalReceitasPrevisto = receitasInfo.reduce((s, r) => s + r.previsto, 0)
  const totalReceitasRecebido = receitasInfo.reduce((s, r) => s + r.realizado, 0)
  const totalDespesasPrevisto = despesasInfo.reduce((s, d) => s + d.previsto, 0)
  const totalDespesasPago     = despesasInfo.reduce((s, d) => s + d.realizado, 0)
  const totalFaturas          = faturaAtualPorCartao.reduce((s, f) => s + f.fatura, 0)
  const saldoContas           = saldoAtualPorConta.reduce((s, c) => s + c.saldo, 0) + saldoDinheiro
  const receitasAReceber      = Math.max(0, totalReceitasPrevisto - totalReceitasRecebido)
  const despesasPendentes     = Math.max(0, totalDespesasPrevisto - totalDespesasPago)

  // ── Comparativo mês anterior ─────────────────────────────────────────
  const totaisAnterior = useMemo<TotaisMes | null>(() => {
    const mesAnt = mes === 0 ? 11 : mes - 1
    const anoAnt = mes === 0 ? ano - 1 : ano
    const strAnt = String(mesAnt + 1).padStart(2, '0')
    const hasData = contasExtrato.some(c => dados[`${c.id}-${anoAnt}-${strAnt}`])
      || contas.filter(ct => ct.tipo === 'cartao').some(c => fat[`${c.id}-${anoAnt}-${strAnt}`])
    if (!hasData) return null
    return calcTotaisMes(mesAnt, anoAnt, contasExtrato, contas, dados, fat, fixasValorPorIdAnterior)
  }, [mes, ano, contasExtrato, contas, dados, fat, fixasValorPorIdAnterior])

  const totaisAtuais: TotaisMes = {
    receitas: totalReceitasRecebido,
    despesas: totalDespesasPago,
    resultado: totalReceitasRecebido - totalDespesasPago,
  }

  const mesNome = NOMES_MESES_RM[mes]

  const navContent = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <button style={PH_BTN_WHITE} onClick={() => navMes(-1)}>◀</button>
      <button style={{ ...PH_BTN_WHITE, fontWeight: 700, padding: '6px 16px' }}>
        {mesNome} {ano}
      </button>
      <button
        style={{ ...PH_BTN_WHITE, opacity: (mes === mesHoje && ano === anoHoje) ? 0.4 : 1 }}
        onClick={() => navMes(1)}
        disabled={mes === mesHoje && ano === anoHoje}
      >▶</button>
    </div>
  )

  return (
    <>
      {isMobile && <AppHeader currentPath={pathname} />}
      <div style={{ padding: isMobile ? '12px 12px 80px' : '20px 24px', fontFamily: "-apple-system,'Inter',sans-serif" }}>

        <TutorialCard
          tela="resumo_mensal"
          icon="📊"
          title="Seu fechamento mensal"
          description="Aqui você vê a foto completa do seu mês — patrimônio, receitas, despesas, faturas e como vai fechar. Use essa tela antes da revisão mensal."
          tips={[
            { icon: '📊', text: 'Veja seus gráficos de gastos' },
            { icon: '🔮', text: 'Confira a projeção de fechamento' },
            { icon: '📈', text: 'Compare com o mês anterior' },
          ]}
          buttonLabel="Ver meu resumo →"
        />

        <PageHeader
          icon="ti-chart-dots"
          breadcrumb="TODO MÊS"
          title="Resumo mensal"
          subtitle={`${mesNome} ${ano}`}
          rightContent={navContent}
          mb={16}
        />

        {(() => {
          const hasFaturas = faturaAtualPorCartao.length > 0
          const sections: { id: string; label: string; node: React.ReactNode }[] = [
            {
              id: 'patrimonio', label: 'Patrimônio',
              node: <RmPatrimonio saldoAtualPorConta={saldoAtualPorConta} faturaAtualPorCartao={faturaAtualPorCartao} saldoDinheiro={saldoDinheiro} cartoesPlanejado={cartoesPlanejado} userId={user?.id ?? ''} fmt={fmt} />,
            },
            {
              id: 'receitas', label: 'Receitas',
              node: <RmReceitas receitas={receitasInfo} totalPrevisto={totalReceitasPrevisto} totalRecebido={totalReceitasRecebido} mes={mes} fmt={fmt} />,
            },
            {
              id: 'despesas', label: 'Despesas',
              node: <RmDespesas despesas={despesasInfo} totalPrevisto={totalDespesasPrevisto} totalPago={totalDespesasPago} mes={mes} temPlanejamento={!!dadosAno} fmt={fmt} />,
            },
            ...(hasFaturas ? [{
              id: 'faturas', label: 'Faturas',
              node: <RmFaturas faturas={faturaAtualPorCartao} hoje={hoje} fmt={fmt} />,
            }] : []),
            {
              id: 'projecao', label: 'Projeção',
              node: <RmProjecao saldoContas={saldoContas} receitasAReceber={receitasAReceber} despesasPendentes={despesasPendentes} totalFaturas={totalFaturas} mes={mes} fmt={fmt} />,
            },
            {
              id: 'comparativo', label: 'Comparativo',
              node: <RmComparativo atual={totaisAtuais} anterior={totaisAnterior} mesAtual={mes} mesAnterior={mes === 0 ? 11 : mes - 1} fmt={fmt} />,
            },
            {
              id: 'distribuicao', label: 'Distribuição',
              node: <RmDistribuicao despesas={despesasInfo} fmt={fmt} />,
            },
          ]

          return (
            <>
              {sections.map((s, i) => (
                <div
                  key={s.id}
                  ref={el => { sectionRefs.current[i] = el }}
                  style={{ scrollSnapAlign: 'start', scrollMarginTop: 16 }}
                >
                  {s.node}
                </div>
              ))}

              {/* Dots de navegação — desktop only */}
              {!isMobile && (
                <div style={{
                  position: 'fixed', right: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'flex', flexDirection: 'column', gap: 8,
                  zIndex: 200,
                }}>
                  {sections.map((s, i) => (
                    <button
                      key={s.id}
                      title={s.label}
                      onClick={() => sectionRefs.current[i]?.scrollIntoView({ behavior: 'smooth' })}
                      style={{
                        width: 8, height: 8, borderRadius: '50%', border: 'none',
                        padding: 0, cursor: 'pointer',
                        transition: 'all 0.25s',
                        background: i === activeSection ? '#1a56db' : 'rgba(255,255,255,0.6)',
                        boxShadow: i === activeSection
                          ? '0 0 0 2px #1a56db'
                          : '0 0 0 1.5px rgba(0,0,0,0.18)',
                        transform: i === activeSection ? 'scale(1.4)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          )
        })()}

      </div>
    </>
  )
}
