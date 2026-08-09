import { useApp } from '../context/AppContext'
import type { PlanoAnoData } from '../context/AppContext'
import { useState, useMemo, useRef, useLayoutEffect, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { iconeCategoria } from '../utils/categoriaIcone'
import { GRUPOS_PADRAO } from '../data/categoriasPadrao'
import AppHeader from '../components/AppHeader'
import BottomNav from '../components/BottomNav'
import TutorialCard from '../components/TutorialCard'

const COR = {
  azul: '#1a56db', azulEscuro: '#0f2878', azulMedio: '#2563eb',
  fundo: '#f0f4ff', branco: '#ffffff', texto: '#0f172a',
  textoSuave: '#64748b', borda: '#e2e8f0',
  verde: '#16a34a', vermelho: '#dc2626',
}

const MESES      = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MESES_FULL = ['Janeiro','Fevereiro','MarÃ§o','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const BADGE_MOV: Record<string, { label: string; bg: string; cor: string }> = {
  banco:    { label: 'B', bg: '#eff6ff', cor: '#1a56db' },
  cartao:   { label: 'C', bg: '#f3e8ff', cor: '#7c3aed' },
  dinheiro: { label: 'D', bg: '#f0fdf4', cor: '#16a34a' },
}

type Cat      = { id?: string; nome: string; t?: string; v: number[] }
type AnoData  = { saldoInicialJan: number; entradas: Cat[]; saidas: Cat[] }
type Editando = { tipo: 'e'|'s'; row: number; mes: number } | null

function mergeCats(base: Cat[], saved: Cat[]): Cat[] {
  return base.map(cat => {
    const found = cat.id
      ? (saved.find(c => c.id === cat.id) ?? saved.find(c => !c.id && c.nome === cat.nome))
      : saved.find(c => c.nome === cat.nome)
    return found ? { ...cat, v: found.v } : cat
  }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
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

function parseBRL(s: string): number {
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
}
function fmt(v: number, sempre = false) {
  if (v === 0 && !sempre) return 'â€”'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function corSaldo(v: number) {
  if (v < 0)    return COR.vermelho
  if (v < 1000) return '#d97706'
  return COR.verde
}
function caixaCor(v: number) {
  if (v > 0) return { bg:'#eff6ff', bd:'#bfdbfe', txt:'#1a56db' }
  if (v < 0) return { bg:'#fff5f5', bd:'#fecaca', txt:'#dc2626' }
  return { bg:'#f8fafc', bd:'#e2e8f0', txt:'#94a3b8' }
}
function calcSaldos(data: AnoData, exclCartao = false) {
  const totalE = Array.from({ length: 12 }, (_, i) =>
    data.entradas.reduce((s, c) => s + c.v[i], 0))
  const totalS = Array.from({ length: 12 }, (_, i) =>
    (exclCartao ? data.saidas.filter(c => c.t !== 'cartao') : data.saidas)
      .reduce((s, c) => s + c.v[i], 0))
  const si: number[] = [], sf: number[] = []
  for (let i = 0; i < 12; i++) {
    const s = i === 0 ? data.saldoInicialJan : sf[i - 1]
    si.push(s); sf.push(s + totalE[i] - totalS[i])
  }
  return { totalEntradas: totalE, totalSaidas: totalS, saldoInicial: si, saldoFinal: sf }
}
function nomeFaturaCartao(nome: string, cartaoNomes: Set<string>): boolean {
  if (cartaoNomes.has(nome.toLowerCase())) return true
  const n = nome.toLowerCase()
  return n.includes('cart') && (/cr[eÃ©]d/.test(n) || n.includes('fatura'))
}

export default function Planejamento({ defaultAba = 'previsto', hideTabs = false }: { defaultAba?: 'previsto' | 'real' | 'revisao'; hideTabs?: boolean } = {}) {
  const navigate    = useNavigate()
  const location    = useLocation()
  const { pathname } = location
  const { contas, categorias, extratoData, faturaData,
          planos, setPlanos,
          planosReal, planejamentoLockado,
          finalizarPlanejamento, updatePlanoReal,
          desvioMinPerc, setDesvioMinPerc,
          percentualAlerta, metodoSugestao, setMetodoSugestao,
          carregando, user, sairDaConta } = useApp()

  const contasSaldoIni = contas.filter(c => c.tipo === 'corrente' || c.tipo === 'poupanca')
  const SALDO_INICIAL_FIXO = contasSaldoIni
    .filter(c => c.incluirNoSaldoInicial !== false)
    .reduce((s, c) => s + c.saldoInicial, 0)
  const anoCorrente = new Date().getFullYear()
  const mesAtual    = new Date().getMonth()
  const diaAtual    = new Date().getDate()

  // RevisÃ£o Mensal: disponÃ­vel a partir do dia 1 de cada mÃªs (exceto janeiro sem dados do ano anterior)
  const mesRevisao  = mesAtual === 0 ? 11 : mesAtual - 1
  const anoRevisao  = mesAtual === 0 ? anoCorrente - 1 : anoCorrente
  const revisaoDisponivel = diaAtual >= 1 && (mesAtual > 0 || anoRevisao < anoCorrente)

  const [anoAtual,         setAnoAtual]        = useState(2026)
  const [aba,              setAba]             = useState<'previsto' | 'real' | 'revisao'>(() => {
    const fromState = (location.state as any)?.aba
    if (fromState === 'previsto' || fromState === 'real' || fromState === 'revisao') return fromState
    if (new URLSearchParams(window.location.search).get('modo') === 'revisao') return 'revisao'
    if (defaultAba !== 'previsto') return defaultAba
    return (planejamentoLockado && !!planosReal[anoCorrente]) ? 'real' : 'previsto'
  })
  const [editando,         setEditando]        = useState<Editando>(null)
  const [valorTemp,        setValorTemp]       = useState('')
  const [editandoMeta,     setEditandoMeta]    = useState(false)
  const [metaTemp,         setMetaTemp]        = useState('')

  const [showBannerCopiar, setShowBannerCopiar]= useState(false)
  const [reajustePerc,     setReajustePerc]    = useState('0')
  const [mesesAbertos,     setMesesAbertos]    = useState<Set<number>>(() => new Set<number>())
  const [gruposAbertos,    setGruposAbertos]   = useState<Set<string>>(new Set())
  const stickyRef      = useRef<HTMLDivElement>(null)
  const mesRefs        = useRef<(HTMLDivElement | null)[]>([])
  const prevMesesRef   = useRef<Set<number>>(new Set())
  const mountedRef     = useRef(false)
  const skipBlurRef    = useRef(false)
  const [stickyH, setStickyH] = useState(0)
  const [quizAtivo,        setQuizAtivo]       = useState(false)
  const [quizFromWizard,   setQuizFromWizard]  = useState(false)
  const [quizConcluido,    setQuizConcluido]   = useState(false)
  const [confirmarRefazer,   setConfirmarRefazer]   = useState<'refazer' | 'bloqueado' | false>(false)
  const [confirmarAtualizar, setConfirmarAtualizar] = useState(false)
  const [quizStep,         setQuizStep]        = useState(0)
  const [quizObjetivo,     setQuizObjetivo]    = useState('')
  const [quizConsiderarSaldo, setQuizConsiderarSaldo] = useState<boolean | null>(null)
  const [quizContasExcluidas, setQuizContasExcluidas] = useState<Set<string>>(new Set())
  const [quizTodosMeses,      setQuizTodosMeses]      = useState(false)
  const [quizMetaStr,         setQuizMetaStr]         = useState('')
  const [quizEntradas,     setQuizEntradas]    = useState<Record<string, string>>({})
  const [quizSaidas,       setQuizSaidas]      = useState<Record<string, string>>({})
  const [quizSaldosContas, setQuizSaldosContas] = useState<Record<string, string>>({})
  const [modalCatReal,     setModalCatReal]    = useState<{ nome: string; mi: number } | null>(null)

  type RevisaoItem = { tipo:'entrada'|'saida'; ri:number; nome:string; icone:string; corIcone:string; prevPlanned:number; prevReal:number; novoValor:string; desvioPerc:number }
  const [modalRevisao,    setModalRevisao]    = useState(false)
  const [revisaoItens,    setRevisaoItens]    = useState<RevisaoItem[]>([])
  const [modalDesvioPerc, setModalDesvioPerc] = useState(desvioMinPerc)
  type EventoTipo = ''|'nova_renda'|'novo_gasto'|'encerramento'|'ajuste'
  const [modalEvento,   setModalEvento]   = useState<null|{ step:1|2; tipo:EventoTipo; mesInicio:number; catTipo:'entrada'|'saida'; catNome:string; novoValor:string }>(null)
  const [sugestoesEditadas, setSugestoesEditadas] = useState<Record<string,string>>({})
  const [metodoLocal, setMetodoLocal] = useState(metodoSugestao)
  const modoParam = new URLSearchParams(location.search).get('modo')
  const viewMode: 'grade' | 'horizontal' | 'vertical' =
    modoParam === 'planilha' ? 'horizontal'
    : modoParam === 'lista'  ? 'vertical'
    : 'grade'
  const [modalMes,           setModalMes]          = useState<number | null>(null)
  const [copiarMesPrompt,    setCopiarMesPrompt]    = useState<{ origem: number; destino: number } | null>(null)
  const [gruposHorizAbertos, setGruposHorizAbertos] = useState<Set<string>>(new Set())

  const isMobile = useIsMobile()
  const [mesMobile, setMesMobile] = useState(mesAtual)
  const [secEntAberto, setSecEntAberto] = useState(true)
  const [secSaiAberto, setSecSaiAberto] = useState(true)
  const [alertsDismissed, setAlertsDismissed] = useState<Set<string>>(new Set())

  const quizGruposAtivos = useMemo(() => {
    const cartNomes = new Set(contas.filter(c => c.tipo === 'cartao').map(c => c.nome.toLowerCase()))
    const saidas = categorias.filter(c => c.tipo === 'saida' && c.ativa && !nomeFaturaCartao(c.nome, cartNomes))
    const grupos: string[] = [
      ...GRUPOS_PADRAO.filter(g => saidas.some(c => c.grupo === g)),
      ...Array.from(new Set(saidas.map(c => c.grupo).filter((g): g is string => !!g && !GRUPOS_PADRAO.includes(g)))),
    ].sort((a,b) => a.localeCompare(b,'pt-BR'))
    if (saidas.some(c => !c.grupo)) grupos.push('__sem_grupo__')
    return grupos
  }, [categorias, contas])
  const QUIZ_STEP_RESUMO = 4 + quizGruposAtivos.length
  const QUIZ_TOTAL      = QUIZ_STEP_RESUMO + 1

  // â”€â”€ Dados base (categorias ativas zeradas) â”€â”€
  const dadosBase: AnoData = useMemo(() => ({
    saldoInicialJan: SALDO_INICIAL_FIXO,
    entradas: categorias
      .filter(c => c.tipo === 'entrada' && c.ativa)
      .map(c => ({ id: c.id, nome: c.nome, t: c.tipoMovimento, v: new Array(12).fill(0) }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    saidas: categorias
      .filter(c => c.tipo === 'saida' && c.ativa)
      .map(c => ({ id: c.id, nome: c.nome, t: c.tipoMovimento, v: new Array(12).fill(0) }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
  }), [SALDO_INICIAL_FIXO, categorias])

  const cartaoNomes = useMemo(() =>
    new Set(contas.filter(c => c.tipo === 'cartao').map(c => c.nome.toLowerCase())), [contas])

  const realExiste = !!planosReal[anoAtual]

  // Plano original (previsto) sempre com todas as categorias ativas â€” independente da aba
  const dadosPrevisto: AnoData = useMemo(() => {
    const salvo = planos[anoAtual] as AnoData | undefined
    if (!salvo) return dadosBase
    return { ...salvo, saldoInicialJan: SALDO_INICIAL_FIXO, entradas: mergeCats(dadosBase.entradas, salvo.entradas), saidas: mergeCats(dadosBase.saidas, salvo.saidas) }
  }, [anoAtual, dadosBase, planos, SALDO_INICIAL_FIXO])

  const dadosAno: AnoData = useMemo(() => {
    if (aba === 'real') {
      const realSalvo = planosReal[anoAtual] as AnoData | undefined
      if (!realSalvo) return { saldoInicialJan: SALDO_INICIAL_FIXO, entradas: [], saidas: [] }
      // Merge com dadosBase para incluir categorias criadas apÃ³s a finalizaÃ§Ã£o
      return { ...realSalvo, saldoInicialJan: SALDO_INICIAL_FIXO, entradas: mergeCats(dadosBase.entradas, realSalvo.entradas), saidas: mergeCats(dadosBase.saidas, realSalvo.saidas) }
    }
    return dadosPrevisto
  }, [aba, anoAtual, dadosBase, dadosPrevisto, planosReal, SALDO_INICIAL_FIXO])

  const somaCartaoMes = useMemo(() => {
    const cartCats = dadosAno.saidas.filter(c => c.t === 'cartao' && !nomeFaturaCartao(c.nome, cartaoNomes))
    const anoAnterior = planos[anoAtual - 1] as AnoData | undefined
    const cartCatsAnterior = anoAnterior?.saidas.filter(c => c.t === 'cartao' && !nomeFaturaCartao(c.nome, cartaoNomes)) ?? []
    // Fallback: soma das Ãºltimas faturas cadastradas nos cartÃµes
    const totalUltimaFatura = contas
      .filter(c => c.tipo === 'cartao')
      .reduce((s, c) => s + (c.ultimaFatura ?? 0), 0)
    return MESES.map((_, i) => {
      // Fatura do cartÃ£o paga no mÃªs i = gastos do mÃªs i-1
      const somaAnterior = i === 0
        ? cartCatsAnterior.reduce((s, c) => s + (c.v[11] ?? 0), 0)   // janeiro â†’ dezembro do ano anterior
        : cartCats.reduce((s, c) => s + c.v[i - 1], 0)
      return somaAnterior > 0 ? somaAnterior : totalUltimaFatura
    })
  }, [dadosAno, cartaoNomes, planos, anoAtual, contas])

  const dadosAnoFinal: AnoData = useMemo(() => {
    const hasFaturaCat = dadosAno.saidas.some(cat => nomeFaturaCartao(cat.nome, cartaoNomes))
    const saidas = dadosAno.saidas.map(cat =>
      nomeFaturaCartao(cat.nome, cartaoNomes) ? { ...cat, t: undefined, v: somaCartaoMes } : cat
    )
    // Se nÃ£o existe categoria de fatura mas hÃ¡ valor de cartÃ£o, injeta linha virtual
    // para que o totalSaidas inclua a fatura (somaCartaoMes) no total de despesas
    if (!hasFaturaCat && somaCartaoMes.some(v => v > 0)) {
      saidas.push({ nome: 'CartÃ£o de CrÃ©dito', t: undefined, v: somaCartaoMes })
    }
    return { ...dadosAno, saidas }
  }, [dadosAno, somaCartaoMes, cartaoNomes])

  const entradasComHistorico = useMemo(() => {
    const realSaved = (planosReal[anoAtual] as PlanoAnoData | undefined)?.entradas ?? []
    const inativas = realSaved.filter(rs =>
      !dadosBase.entradas.some(be => be.nome === rs.nome || (be.id && rs.id && be.id === rs.id))
    )
    return [...dadosBase.entradas, ...inativas]
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [dadosBase.entradas, planosReal, anoAtual])

  const saidasComHistorico = useMemo(() => {
    const realSaved = (planosReal[anoAtual] as PlanoAnoData | undefined)?.saidas ?? []
    const inativas = realSaved.filter(rs =>
      !dadosBase.saidas.some(bs => bs.nome === rs.nome || (bs.id && rs.id && bs.id === rs.id))
    )
    return [...dadosBase.saidas, ...inativas]
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [dadosBase.saidas, planosReal, anoAtual])

  // Plano de referÃªncia para comparaÃ§Ãµes: usa Atualizado sÃ³ quando bloqueado
  const planoRef = useMemo(() =>
    ((planejamentoLockado && planosReal[anoAtual] ? planosReal[anoAtual] : planos[anoAtual]) as PlanoAnoData | undefined),
  [planejamentoLockado, planosReal, planos, anoAtual])

  const { totalEntradas, totalSaidas, saldoInicial, saldoFinal } =
    useMemo(() => calcSaldos(dadosAnoFinal, true), [dadosAnoFinal])

  // Valor consolidado de cada cartÃ£o por mÃªs (fixasCartao conciliados no extrato banco)
  const lancadoFaturaConsolidadaMesCat = useMemo(() => {
    const fatDados = faturaData as Record<string, { lancamentos: Record<number, { tipo: string; valor: number }[]> }>
    const result: Record<number, Record<string, number>> = {}
    for (let mes = 0; mes < 12; mes++) {
      result[mes] = {}

      // Coleta overrides de fatura definidos em extratos banco deste mÃªs
      const cartaoOverrides: Record<string, number> = {}
      contas.filter(c => c.tipo !== 'cartao').forEach(conta => {
        const key = `${conta.id}-${anoAtual}-${String(mes+1).padStart(2,'0')}`
        const dados = extratoData[key]
        if (!dados?.fixasConsolidadas) return
        Object.entries(dados.fixasConsolidadas).forEach(([fixaId, consolidada]) => {
          if (!consolidada || !fixaId.startsWith('cartao-')) return
          const v = dados.fixasValorOverride?.[fixaId]
          if (v !== undefined) cartaoOverrides[fixaId.replace('cartao-', '')] = v
        })
      })

      // Inclui TODOS os cartÃµes (consolidados com override, ou via faturaData)
      contas.filter(c => c.tipo === 'cartao').forEach(cartao => {
        const diaFech = (cartao as any).diaFechamento ?? 1
        const diaVenc = (cartao as any).diaVencimento ?? 1
        const offset = diaVenc < diaFech ? 1 : 0
        let pMes = mes - offset
        let pAno = anoAtual
        if (pMes < 0) { pMes += 12; pAno-- }
        let val = 0
        if (cartaoOverrides[cartao.id] !== undefined) {
          val = cartaoOverrides[cartao.id]
        } else {
          const fatKey = `${cartao.id}-${pAno}-${String(pMes+1).padStart(2,'0')}`
          const dm = fatDados[fatKey]
          if (dm) {
            const nDias = new Date(pAno, pMes + 1, 0).getDate()
            for (let d = 1; d <= nDias; d++) {
              ;(dm.lancamentos[d] ?? []).forEach((l: { tipo: string; valor: number }) => {
                if (l.tipo === 'entrada') val += l.valor
                else val -= l.valor
              })
            }
          }
        }
        result[mes][cartao.nome] = (result[mes][cartao.nome] ?? 0) + val
      })
    }
    return result
  }, [contas, extratoData, faturaData, anoAtual])

  // LanÃ§amentos reais somados por categoria e mÃªs (para a aba Realizado), separados por tipo
  // Inclui banco (extratoData) + cartÃ£o de crÃ©dito (faturaData) por categoria
  const lancadoPorCatMes = useMemo(() => {
    const result: Record<number, {
      entrada: Record<string, number>; saida: Record<string, number>
      entradaCartao: Record<string, number>; saidaCartao: Record<string, number>
    }> = {}
    const fatDados = faturaData as Record<string, { lancamentos: Record<number, { tipo: string; valor: number; categoria: string }[]> }>
    const _hoje = new Date()
    const mesHojeRef = _hoje.getMonth()
    const anoHojeRef = _hoje.getFullYear()
    for (let mes = 0; mes < 12; mes++) {
      result[mes] = { entrada: {}, saida: {}, entradaCartao: {}, saidaCartao: {} }
      const mesStr = String(mes + 1).padStart(2, '0')
      const sufixo = `-${anoAtual}-${mesStr}`

      // Banco/dinheiro (extratoData)
      Object.entries(extratoData).forEach(([key, dados]) => {
        if (!key.endsWith(sufixo)) return

        Object.values(dados.lancamentos).flat().forEach(l => {
          result[mes][l.tipo][l.categoria] = (result[mes][l.tipo][l.categoria] ?? 0) + l.valor
        })

        // Fixas consolidadas â€” ignora chaves de cartÃ£o (evita duplicidade com fatura)
        {
          const ehCartaoKey = contas.some(c => c.tipo === 'cartao' && key.startsWith(c.id))
          if (!ehCartaoKey) {
            const ehMesPassado = mes < mesHojeRef || anoAtual < anoHojeRef
            categorias.filter(c => c.fixa && c.ativa).forEach(f => {
              // Considera consolidada: explicitamente marcada OU dÃ©bito automÃ¡tico em mÃªs passado
              const ehAuto = (f as unknown as { formaPagamento?: string }).formaPagamento === 'automatico'
              const estaConsolidada = dados.fixasConsolidadas?.[f.id] !== undefined
                ? dados.fixasConsolidadas[f.id]
                : (ehAuto && ehMesPassado)
              if (!estaConsolidada) return
              const planCats = f.tipo === 'entrada'
                ? planoRef?.entradas
                : planoRef?.saidas
              const planVal = planCats?.find(c => c.nome === f.nome)?.v[mes] ?? 0
              // Espelha lÃ³gica do extrato banco: override â†’ f.valor â†’ planVal
              const fValor = (f as unknown as { valor?: number }).valor ?? 0
              const val = dados.fixasValorOverride?.[f.id] ?? (planVal > 0 ? planVal : fValor)
              result[mes][f.tipo][f.nome] = (result[mes][f.tipo][f.nome] ?? 0) + val
            })
          }
        }
      })

      // CartÃ£o de crÃ©dito (faturaData) â€” distribui por categoria real de compra
      // Usa billingOffset para ler a fatura do mÃªs correto (igual ao FaturaCartao)
      contas.filter(c => c.tipo === 'cartao').forEach(cartao => {
        const diaFech = (cartao as any).diaFechamento ?? 1
        const diaVenc = (cartao as any).diaVencimento ?? 1
        const offset = diaVenc < diaFech ? 1 : 0
        let pMes = mes - offset
        let pAno = anoAtual
        if (pMes < 0) { pMes += 12; pAno-- }
        const fatKey = `${cartao.id}-${pAno}-${String(pMes + 1).padStart(2, '0')}`
        const dm = fatDados[fatKey]
        if (!dm) return
        const nDias = new Date(pAno, pMes + 1, 0).getDate()
        for (let d = 1; d <= nDias; d++) {
          ;(dm.lancamentos[d] ?? []).forEach(l => {
            if (l.tipo === 'entrada') {
              result[mes]['saida'][l.categoria] = (result[mes]['saida'][l.categoria] ?? 0) + l.valor
              result[mes]['saidaCartao'][l.categoria] = (result[mes]['saidaCartao'][l.categoria] ?? 0) + l.valor
            } else {
              result[mes]['saida'][l.categoria] = (result[mes]['saida'][l.categoria] ?? 0) - l.valor
              result[mes]['saidaCartao'][l.categoria] = (result[mes]['saidaCartao'][l.categoria] ?? 0) - l.valor
            }
          })
        }
      })
    }
    return result
  }, [contas, categorias, extratoData, faturaData, anoAtual, planos])

  const modalDados = useMemo(() => {
    if (!modalCatReal) return null
    const { nome, mi } = modalCatReal
    const mesStr = String(mi + 1).padStart(2, '0')
    const sufixo = `-${anoAtual}-${mesStr}`
    const _hoje = new Date()
    const ehMesPassado = mi < _hoje.getMonth() || anoAtual < _hoje.getFullYear()
    const bancLancs: { dia: number; descricao: string; valor: number; sub: string }[] = []

    Object.entries(extratoData).forEach(([key, dados]) => {
      if (!key.endsWith(sufixo)) return
      if (contas.some(c => c.tipo === 'cartao' && key.startsWith(c.id))) return

      // LanÃ§amentos manuais (saÃ­da = custo, entrada = estorno com valor negativo)
      Object.entries(dados.lancamentos).forEach(([dia, lances]) => {
        lances.filter(l => l.categoria === nome).forEach(l => {
          const val = l.tipo === 'saida' ? l.valor : -l.valor
          bancLancs.push({ dia: Number(dia), descricao: l.descricao, valor: val, sub: l.formaPagamento })
        })
      })

      // Fixas consolidadas automÃ¡ticas
      categorias.filter(c => c.fixa && c.ativa && c.nome === nome && c.tipo === 'saida').forEach(f => {
        const ehAuto = (f as any).formaPagamento === 'automatico'
        const estaConsolidada = dados.fixasConsolidadas?.[f.id] !== undefined
          ? dados.fixasConsolidadas[f.id]
          : (ehAuto && ehMesPassado)
        if (!estaConsolidada) return
        const planVal = planoRef?.saidas?.find(c => c.nome === f.nome)?.v[mi] ?? 0
        const fValor = (f as any).valor ?? 0
        const val = dados.fixasValorOverride?.[f.id] ?? (planVal > 0 ? planVal : fValor)
        bancLancs.push({ dia: 1, descricao: `${f.nome}`, valor: val, sub: 'automÃ¡tico' })
      })
    })

    const fatDados = faturaData as Record<string, { lancamentos: Record<number, { tipo: string; valor: number; categoria: string; descricao?: string }[]> }>
    const cartLancs: { dia: number; descricao: string; valor: number; cartao: string }[] = []
    contas.filter(c => c.tipo === 'cartao').forEach(card => {
      const diaFech = (card as any).diaFechamento ?? 1
      const diaVenc = (card as any).diaVencimento ?? 1
      const offset = diaVenc < diaFech ? 1 : 0
      let pMes = mi - offset, pAno = anoAtual
      if (pMes < 0) { pMes += 12; pAno-- }
      const key = `${card.id}-${pAno}-${String(pMes + 1).padStart(2, '0')}`
      const dm = fatDados[key]
      if (!dm) return
      const nDias = new Date(pAno, pMes + 1, 0).getDate()
      for (let d = 1; d <= nDias; d++) {
        ;(dm.lancamentos[d] ?? []).filter(l => l.categoria === nome && l.tipo === 'entrada').forEach(l => {
          cartLancs.push({ dia: d, descricao: l.descricao ?? '', valor: l.valor, cartao: card.apelido ?? card.nome })
        })
      }
    })

    const totalBanc = bancLancs.reduce((s, l) => s + l.valor, 0)
    const totalCart = cartLancs.reduce((s, l) => s + l.valor, 0)
    const lancAbs = totalBanc + totalCart
    const previsto = Math.abs(planoRef?.saidas?.find(c => c.nome === nome)?.v[mi] ?? 0)
    const dentro = lancAbs < 0 ? true : (previsto > 0 ? lancAbs <= previsto : false)
    const disponivel = previsto - lancAbs
    const allLancs = [
      ...bancLancs.map(l => ({ dia: l.dia, descricao: l.descricao, valor: l.valor, icone: 'ðŸ¦', sub: l.sub })),
      ...cartLancs.map(l => ({ dia: l.dia, descricao: l.descricao, valor: l.valor, icone: 'ðŸ’³', sub: l.cartao })),
    ].sort((a, b) => a.dia - b.dia)
    const { icone, cor: corIcone } = iconeCategoria(categorias, nome)
    return { nome, mi, previsto, lancAbs, totalBanc, totalCart, dentro, disponivel, allLancs, icone, corIcone }
  }, [modalCatReal, extratoData, faturaData, contas, categorias, anoAtual, planos])


  const mesTemSaldoReal = useMemo(() => Array.from({ length: 12 }, (_, mes) => {
    if (aba !== 'real' || mes === 0) return false
    return contasSaldoIni.filter(c => c.incluirNoSaldoInicial !== false)
      .some(c => !!extratoData[`${c.id}-${anoAtual}-${String(mes).padStart(2, '0')}`]?.saldoBanco)
  }), [aba, anoAtual, extratoData, contasSaldoIni])

  // Totais reais (entradas e saÃ­das) por mÃªs â€” lidos dos lanÃ§amentos reais do extrato
  const totaisReais = useMemo(() => {
    const fatDados = faturaData as Record<string, { lancamentos: Record<number, { tipo: string; valor: number }[]> }>
    const te = new Array(12).fill(0)
    const ts = new Array(12).fill(0)
    for (let mes = 0; mes < 12; mes++) {
      const mesStr = String(mes + 1).padStart(2, '0')
      const sufixo = `-${anoAtual}-${mesStr}`

      // Coleta overrides de fatura de cartÃ£o definidos em qualquer extrato banco deste mÃªs
      const cartaoOverrides: Record<string, number> = {}
      Object.entries(extratoData).forEach(([key, dados]) => {
        if (!key.endsWith(sufixo) || !dados.fixasConsolidadas) return
        Object.entries(dados.fixasConsolidadas).forEach(([fixaId, consolidada]) => {
          if (!consolidada || !fixaId.startsWith('cartao-')) return
          const v = dados.fixasValorOverride?.[fixaId]
          if (v !== undefined) cartaoOverrides[fixaId.replace('cartao-', '')] = v
        })
      })

      // Percorre TODOS os keys (banco + dinheiro), ignora cartÃ£o (tratado via faturaData abaixo)
      Object.entries(extratoData).forEach(([key, dados]) => {
        if (!key.endsWith(sufixo)) return
        const ehCartaoKey = contas.some(c => c.tipo === 'cartao' && key.startsWith(c.id))
        if (ehCartaoKey) return

        Object.values(dados.lancamentos).flat().forEach((l: { tipo: string; valor: number }) => {
          if (l.tipo === 'entrada') te[mes] += l.valor
          else ts[mes] += l.valor
        })

        if (dados.fixasConsolidadas) {
          categorias.filter(c => c.fixa && c.ativa).forEach(f => {
            if (!dados.fixasConsolidadas?.[f.id]) return
            const planCats = f.tipo === 'entrada'
              ? planoRef?.entradas
              : planoRef?.saidas
            const planVal = planCats?.find(c => c.nome === f.nome)?.v[mes] ?? 0
            const val = dados.fixasValorOverride?.[f.id] ?? planVal
            if (f.tipo === 'entrada') te[mes] += val
            else ts[mes] += val
          })
        }
      })

      // Inclui TODOS os gastos de cartÃ£o do faturaData (consolidados ou nÃ£o)
      // Se houver override de valor (fatura paga com valor diferente da soma), usa-o
      contas.filter(c => c.tipo === 'cartao').forEach(cartao => {
        const diaFech = (cartao as any).diaFechamento ?? 1
        const diaVenc = (cartao as any).diaVencimento ?? 1
        const offset = diaVenc < diaFech ? 1 : 0
        let pMes = mes - offset
        let pAno = anoAtual
        if (pMes < 0) { pMes += 12; pAno-- }
        if (cartaoOverrides[cartao.id] !== undefined) {
          ts[mes] += cartaoOverrides[cartao.id]
        } else {
          const fatKey = `${cartao.id}-${pAno}-${String(pMes + 1).padStart(2, '0')}`
          const dm = fatDados[fatKey]
          if (!dm) return
          const nDias = new Date(pAno, pMes + 1, 0).getDate()
          for (let d = 1; d <= nDias; d++) {
            ;(dm.lancamentos[d] ?? []).forEach((l: { tipo: string; valor: number }) => {
              if (l.tipo === 'entrada') ts[mes] += l.valor
              else ts[mes] -= l.valor
            })
          }
        }
      })
    }
    return { te, ts }
  }, [contas, categorias, extratoData, faturaData, anoAtual, planos])

  const { saldoInicialReal, saldoFinalReal } = useMemo(() => {
    if (aba !== 'real') return { saldoInicialReal: saldoInicial, saldoFinalReal: saldoFinal }
    const siArr = new Array(12).fill(0) as number[]
    const sfArr = new Array(12).fill(0) as number[]
    siArr[0] = saldoInicial[0]
    for (let mi = 0; mi < 12; mi++) {
      sfArr[mi] = siArr[mi] + totaisReais.te[mi] - totaisReais.ts[mi]
      if (mi + 1 < 12) siArr[mi + 1] = sfArr[mi]
    }
    return { saldoInicialReal: siArr, saldoFinalReal: sfArr }
  }, [aba, saldoInicial, saldoFinal, totaisReais])

  // Indica quais meses tÃªm dados reais lanÃ§ados (para fallback ao previsto em cinza)
  const mesTemDadosReais = useMemo(() => Array.from({ length: 12 }, (_, mes) => {
    if (aba !== 'real') return false
    return contas.filter(c => c.tipo !== 'cartao').some(conta => {
      const key = `${conta.id}-${anoAtual}-${String(mes+1).padStart(2,'0')}`
      const dados = extratoData[key]
      if (!dados) return false
      const temLanc = Object.values(dados.lancamentos).some(arr => (arr as unknown[]).length > 0)
      const temConsolidados = !!dados.fixasConsolidadas && Object.values(dados.fixasConsolidadas).some(v => v)
      return temLanc || temConsolidados
    })
  }), [aba, contas, extratoData, anoAtual])

  const limiteCartaoPorMes = useMemo(() =>
    Array.from({ length: 12 }, (_, mi) =>
      (planoRef?.saidas ?? [])
        .filter(pc => (pc as { t?: string }).t === 'cartao' && !nomeFaturaCartao(pc.nome, cartaoNomes))
        .reduce((s, pc) => s + (pc.v[mi] ?? 0), 0)
    )
  , [planoRef, cartaoNomes])

  // â”€â”€ Dados para RevisÃ£o Mensal â”€â”€
  const dadosRevisao = useMemo(() => {
    if (!revisaoDisponivel) return null
    const temAtualizado = !!planosReal[anoRevisao]
    const planoBase = (temAtualizado ? planosReal[anoRevisao] : planos[anoRevisao]) as AnoData | undefined
    const planoAtualMes = (planosReal[anoCorrente] ?? planos[anoCorrente]) as AnoData | undefined

    // Realizado dos Ãºltimos 3 meses para cÃ¡lculo de sugestÃ£o
    function realizadoMes(catNome: string, tipo: 'entrada'|'saida', mi: number) {
      if (mi < 0) return 0
      const r = lancadoPorCatMes[mi] ?? { entrada:{}, saida:{}, entradaCartao:{}, saidaCartao:{} }
      return tipo === 'entrada'
        ? (r.entrada[catNome] ?? 0) + (r.entradaCartao[catNome] ?? 0)
        : (r.saida[catNome] ?? 0) + (r.saidaCartao[catNome] ?? 0)
    }

    function calcSugestao(catNome: string, tipo: 'entrada'|'saida', realizado: number, metodo: string): number {
      const meses3 = [mesRevisao, mesRevisao - 1, mesRevisao - 2].filter(m => m >= 0)
      const vals = meses3.map(m => realizadoMes(catNome, tipo, m))
      if (metodo === 'media_3_meses') return Math.round(vals.reduce((s, v) => s + v, 0) / meses3.length)
      if (metodo === 'maior_valor')   return Math.max(...vals)
      // mes_mais_margem: realizado atual + 5%
      return Math.round(realizado * 1.05)
    }

    const mapCat = (cats: Cat[], tipo: 'entrada'|'saida') =>
      cats
        .filter(cat => {
          const previsto  = cat.v[mesRevisao] ?? 0
          const realizado = realizadoMes(cat.nome, tipo, mesRevisao)
          return previsto > 0 || realizado > 0
        })
        .map(cat => {
          const previsto  = cat.v[mesRevisao] ?? 0
          const realizado = realizadoMes(cat.nome, tipo, mesRevisao)
          const desvio     = realizado - previsto
          const desvioPerc = previsto !== 0 ? (desvio / previsto) * 100 : null
          const { icone, cor } = iconeCategoria(categorias, cat.nome)
          const catAtual = planoAtualMes?.[tipo === 'entrada' ? 'entradas' : 'saidas']
            ?.find((c: Cat) => c.nome === cat.nome)
          const planejadoMesAtual = catAtual?.v[mesAtual] ?? 0
          // foraDoPerfil: saÃ­da que ultrapassou percentualAlerta% do planejado
          const foraDoPerfil = tipo === 'saida' && previsto > 0 && desvioPerc !== null && desvioPerc > percentualAlerta
          return { nome: cat.nome, icone, cor, previsto, realizado, desvio, desvioPerc, planejadoMesAtual, foraDoPerfil }
        })
        .sort((a, b) => Math.abs(b.desvio) - Math.abs(a.desvio))

    const entradas = mapCat(planoBase?.entradas ?? [], 'entrada')
    const saidas   = mapCat(planoBase?.saidas   ?? [], 'saida')

    // SugestÃµes computadas para o mÃ©todo atual
    function getSugestao(item: ReturnType<typeof mapCat>[number], tipo: 'entrada'|'saida', metodo: string) {
      return calcSugestao(item.nome, tipo, item.realizado, metodo)
    }

    const totalPrevE = entradas.reduce((s, c) => s + c.previsto,  0)
    const totalRealE = entradas.reduce((s, c) => s + c.realizado, 0)
    const totalPrevS = saidas.reduce((s, c)   => s + c.previsto,  0)
    const totalRealS = saidas.reduce((s, c)   => s + c.realizado, 0)

    return { entradas, saidas, totalPrevE, totalRealE, totalPrevS, totalRealS, temAtualizado, getSugestao }
  }, [revisaoDisponivel, planos, planosReal, anoRevisao, anoCorrente, mesRevisao, mesAtual, lancadoPorCatMes, categorias, percentualAlerta])

  // â”€â”€ Helpers de update â”€â”€
  function updateAno(fn: (d: AnoData) => AnoData) {
    if (planejamentoLockado && aba === 'previsto') return
    if (aba === 'previsto') {
      setPlanos(prev => ({ ...prev, [anoAtual]: fn(dadosAno) as PlanoAnoData }))
    } else {
      updatePlanoReal(anoAtual, prev => fn(prev as AnoData) as PlanoAnoData)
    }
  }
  function updateMetaAnual(valor: number) {
    setPlanos(prev => {
      const atual = (prev[anoAtual] ?? { saldoInicialJan: 0, entradas: [], saidas: [] }) as PlanoAnoData
      return { ...prev, [anoAtual]: { ...atual, metaAnual: valor } }
    })
  }
  function setEntradas(fn: (prev: Cat[]) => Cat[]) {
    updateAno(d => ({ ...d, entradas: fn(d.entradas) }))
  }
  function setSaidas(fn: (prev: Cat[]) => Cat[]) {
    updateAno(d => ({ ...d, saidas: fn(d.saidas) }))
  }

  function replicarLinhaMes(tipo: 'e'|'s', ri: number, mesOrigem: number, mesDest: number) {
    const valor = tipo === 'e'
      ? dadosAno.entradas[ri]?.v[mesOrigem] ?? 0
      : dadosAnoFinal.saidas[ri]?.v[mesOrigem] ?? 0
    if (tipo === 'e') {
      setEntradas(prev => prev.map((c, i) => i === ri ? { ...c, v: c.v.map((v, m) => m > mesOrigem && m <= mesDest ? valor : v) } : c))
    } else {
      setSaidas(prev => prev.map((c, i) => i === ri ? { ...c, v: c.v.map((v, m) => m > mesOrigem && m <= mesDest ? valor : v) } : c))
    }
  }
  function mesSemPlano(mi: number): boolean {
    const temE = dadosAno.entradas.some(c => c.v[mi] > 0)
    const temS = dadosAno.saidas.some(c => c.v[mi] > 0)
    return !temE && !temS
  }
  function navegarModalMes(miAtual: number, destino: number) {
    setEditando(null)
    if (aba === 'previsto' && !bloqueado && mesSemPlano(destino)) {
      setCopiarMesPrompt({ origem: miAtual, destino })
    } else {
      setModalMes(destino)
    }
  }
  function confirmarCopiarMes(origem: number, destino: number) {
    updateAno(d => ({
      ...d,
      entradas: d.entradas.map(c => { const v = [...c.v]; v[destino] = c.v[origem]; return { ...c, v } }),
      saidas:   d.saidas.map(c =>   { const v = [...c.v]; v[destino] = c.v[origem]; return { ...c, v } }),
    }))
    setModalMes(destino)
    setCopiarMesPrompt(null)
  }

  function copiarAnoAnteriorComReajuste(anoBase: number, anoNovo: number, percReaj: number) {
    const base = planos[anoBase] as AnoData | undefined
    if (!base) return
    const fator = 1 + percReaj / 100
    const round = (v: number) => Math.round(v * fator * 100) / 100
    setPlanos(prev => ({
      ...prev,
      [anoNovo]: {
        saldoInicialJan: base.saldoInicialJan,
        entradas: base.entradas.map(c => ({ ...c, v: c.v.map(round) })),
        saidas:   base.saidas.map(c =>   ({ ...c, v: c.v.map(round) })),
      } as PlanoAnoData,
    }))
  }
  function computeRevisaoItens(perc: number): RevisaoItem[] {
    if (mesAtual === 0) return []
    const threshold = perc / 100
    const itens: RevisaoItem[] = []
    dadosAno.entradas.forEach((cat, ri) => {
      let tPrev = 0, tReal = 0
      for (let mi = 0; mi < mesAtual; mi++) {
        tPrev += cat.v[mi]
        tReal += lancadoPorCatMes[mi]?.entrada[cat.nome] ?? 0
      }
      const avgPrev = tPrev / mesAtual, avgReal = tReal / mesAtual
      if (avgPrev === 0 && avgReal === 0) return
      const desvio = avgPrev > 0 ? Math.abs(avgReal - avgPrev) / avgPrev : 1
      if (desvio < threshold) return
      const { icone, cor: corIcone } = iconeCategoria(categorias, cat.nome)
      itens.push({ tipo:'entrada', ri, nome:cat.nome, icone, corIcone, prevPlanned:avgPrev, prevReal:avgReal, novoValor:String(Math.round(avgReal)), desvioPerc:desvio })
    })
    dadosAno.saidas.forEach((cat, ri) => {
      let tPrev = 0, tReal = 0
      for (let mi = 0; mi < mesAtual; mi++) {
        tPrev += cat.v[mi]
        tReal += (lancadoPorCatMes[mi]?.saida[cat.nome] ?? 0) + (lancadoPorCatMes[mi]?.saidaCartao[cat.nome] ?? 0)
      }
      const avgPrev = tPrev / mesAtual, avgReal = tReal / mesAtual
      if (avgPrev === 0 && avgReal === 0) return
      const desvio = avgPrev > 0 ? Math.abs(avgReal - avgPrev) / avgPrev : 1
      if (desvio < threshold) return
      const { icone, cor: corIcone } = iconeCategoria(categorias, cat.nome)
      itens.push({ tipo:'saida', ri, nome:cat.nome, icone, corIcone, prevPlanned:avgPrev, prevReal:avgReal, novoValor:String(Math.round(avgReal)), desvioPerc:desvio })
    })
    itens.sort((a, b) => b.desvioPerc - a.desvioPerc)
    return itens
  }

  function aplicarRevisao() {
    const eItems = revisaoItens.filter(i => i.tipo === 'entrada')
    const sItems = revisaoItens.filter(i => i.tipo === 'saida')
    if (eItems.length > 0) setEntradas(prev => prev.map((c, i) => { const item = eItems.find(it => it.ri === i); if (!item) return c; const val = parseFloat(item.novoValor) || 0; return { ...c, v: c.v.map((v, mi) => mi >= mesAtual ? val : v) } }))
    if (sItems.length > 0) setSaidas(prev => prev.map((c, i) => { const item = sItems.find(it => it.ri === i); if (!item) return c; const val = parseFloat(item.novoValor) || 0; return { ...c, v: c.v.map((v, mi) => mi >= mesAtual ? val : v) } }))
    setModalRevisao(false)
  }

  function aplicarRevisaoMensal() {
    const dr = dadosRevisao
    if (!dr) return
    const baseReal = (planosReal[anoCorrente] ?? planos[anoCorrente]) as AnoData | undefined
    if (!baseReal) return
    updatePlanoReal(anoCorrente, prev => {
      const merge = (prevCats: Cat[], drCats: typeof dr.entradas, tipo: 'entrada'|'saida') => {
        const result = prevCats.length > 0 ? [...prevCats] : [...(baseReal[tipo === 'entrada' ? 'entradas' : 'saidas'] ?? [])]
        return result.map(cat => {
          const item = drCats.find(d => d.nome === cat.nome)
          if (!item) return cat
          const novoValStr = sugestoesEditadas[cat.nome]
          const novoVal = novoValStr !== undefined ? parseBRL(novoValStr) : dr.getSugestao(item, tipo, metodoLocal)
          return { ...cat, v: cat.v.map((v, mi) => mi >= mesAtual ? novoVal : v) }
        })
      }
      const base = prev ?? { ...baseReal, entradas: [...(baseReal.entradas ?? [])], saidas: [...(baseReal.saidas ?? [])] }
      return {
        ...base,
        entradas: merge(base.entradas, dr.entradas, 'entrada'),
        saidas:   merge(base.saidas,   dr.saidas,   'saida'),
      } as PlanoAnoData
    })
    setSugestoesEditadas({})
    setAba('real')
  }

  function aplicarEvento() {
    if (!modalEvento?.catNome) return
    const { tipo, mesInicio, catTipo, catNome, novoValor } = modalEvento
    if (tipo === 'encerramento') {
      if (catTipo === 'entrada') setEntradas(prev => prev.map(c => c.nome !== catNome ? c : { ...c, v: c.v.map((v, mi) => mi >= mesInicio ? 0 : v) }))
      else setSaidas(prev => prev.map(c => c.nome !== catNome ? c : { ...c, v: c.v.map((v, mi) => mi >= mesInicio ? 0 : v) }))
    } else if (tipo === 'ajuste') {
      const val = parseFloat(novoValor) || 0
      if (catTipo === 'entrada') setEntradas(prev => prev.map(c => c.nome !== catNome ? c : { ...c, v: c.v.map((v, mi) => mi >= mesInicio ? val : v) }))
      else setSaidas(prev => prev.map(c => c.nome !== catNome ? c : { ...c, v: c.v.map((v, mi) => mi >= mesInicio ? val : v) }))
    } else {
      const adicional = parseFloat(novoValor) || 0
      if (catTipo === 'entrada') setEntradas(prev => prev.map(c => c.nome !== catNome ? c : { ...c, v: c.v.map((v, mi) => mi >= mesInicio ? v + adicional : v) }))
      else setSaidas(prev => prev.map(c => c.nome !== catNome ? c : { ...c, v: c.v.map((v, mi) => mi >= mesInicio ? v + adicional : v) }))
    }
    setModalEvento(null)
  }

  function navegarAno(delta: number) {
    const novoAno = anoAtual + delta
    if (!planos[novoAno]) {
      setShowBannerCopiar(!!planos[novoAno - 1])
      setReajustePerc('0')
      setQuizAtivo(false)
    } else {
      setShowBannerCopiar(false)
      setQuizAtivo(false)
    }
    setAnoAtual(novoAno)
    setEditando(null)
  }
  function confirmarQuiz() {
    const mesAtual = new Date().getMonth() // 0 = jan
    const contasBanco = contas.filter(c => c.tipo === 'corrente' || c.tipo === 'poupanca')
    const saldoIni = quizConsiderarSaldo
      ? contasBanco
          .filter(c => !quizContasExcluidas.has(c.id))
          .reduce((s, c) => s + parseBRL(quizSaldosContas[c.id] ?? String(c.saldoInicial)), 0)
      : 0
    const entradas = categorias.filter(c => c.tipo === 'entrada' && c.ativa)
      .map(c => ({ id: c.id, nome: c.nome, t: c.tipoMovimento,
        v: Array.from({length:12}, (_,i) => (quizTodosMeses || i >= mesAtual) ? parseBRL(quizEntradas[c.id] ?? '0') : 0) }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    const saidas = categorias.filter(c => c.tipo === 'saida' && c.ativa)
      .map(c => {
        const val = parseBRL(quizSaidas[c.id] ?? '0')
        const estimaMesAnterior = !quizTodosMeses && c.tipoMovimento === 'cartao' && mesAtual > 0
        return { id: c.id, nome: c.nome, t: c.tipoMovimento,
          v: Array.from({length:12}, (_,i) => {
            if (quizTodosMeses || i >= mesAtual) return val
            if (estimaMesAnterior && i === mesAtual - 1) return val
            return 0
          }) }
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    const metaAnualQuiz = parseBRL(quizMetaStr)
    setPlanos(prev => ({ ...prev, [anoAtual]: {
      saldoInicialJan: saldoIni, entradas, saidas,
      mesInicio: quizTodosMeses ? 0 : mesAtual,
      ...(metaAnualQuiz > 0 ? { metaAnual: metaAnualQuiz } : {}),
    } as PlanoAnoData }))
    setQuizConcluido(true)
  }

  useLayoutEffect(() => {
    const h = stickyRef.current?.getBoundingClientRect().height ?? 0
    setStickyH(prev => prev !== h ? h : prev)
    if (!mountedRef.current) { mountedRef.current = true; prevMesesRef.current = new Set(mesesAbertos); window.scrollTo({ top: 0 }); return }
    const prev = prevMesesRef.current
    let newlyOpened: number | undefined
    for (const m of mesesAbertos) {
      if (!prev.has(m)) { newlyOpened = m; break }
    }
    prevMesesRef.current = new Set(mesesAbertos)
    if (newlyOpened === undefined) {
      if (mesesAbertos.size === 0 && prev.size > 0) window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const el = mesRefs.current[newlyOpened]
    const sticky = stickyRef.current
    if (!el || !sticky) return
    const top = el.getBoundingClientRect().top + window.scrollY - h - 8
    window.scrollTo({ top, behavior: 'smooth' })
  }, [mesesAbertos])

  useEffect(() => {
    if (viewMode !== 'horizontal' || !editando) return
    const handle = (e: MouseEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      const novo = parseBRL(valorTemp)
      const { tipo, row, mes } = editando
      if (tipo === 'e') setEntradas(prev => prev.map((c, ri) => ri === row ? { ...c, v: c.v.map((v, ci) => ci === mes ? novo : v) } : c))
      else              setSaidas(prev =>   prev.map((c, ri) => ri === row ? { ...c, v: c.v.map((v, ci) => ci === mes ? novo : v) } : c))
      setEditando(null)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [viewMode, editando, valorTemp])

  useEffect(() => {
    if (!(location.state as any)?.openQuiz) return
    navigate(pathname, { replace: true, state: {} })
    if (!planoCriado) {
      setQuizAtivo(true); setQuizStep(0); setQuizConcluido(false)
    } else if (planejamentoLockado) {
      setConfirmarRefazer('bloqueado')
    } else {
      setConfirmarRefazer('refazer')
    }
  }, [location.state]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sidebar â†’ ?modo=wizard|revisao
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const modo   = params.get('modo')
    if (modo === 'wizard') {
      navigate(pathname, { replace: true }) // limpa URL â€” quiz Ã© modal, nÃ£o estado persistente
      setQuizFromWizard(true)
      if (!planoCriado) {
        setQuizAtivo(true); setQuizStep(0); setQuizConcluido(false)
      } else if (planejamentoLockado) {
        setConfirmarRefazer('bloqueado')
      } else {
        setConfirmarRefazer('refazer')
      }
    } else if (modo === 'revisao') {
      setAba('revisao') // URL mantida para sub-item ativo na sidebar
    }
  }, [location.search]) // eslint-disable-line react-hooks/exhaustive-deps

  const quizKeyRef = useRef<{
    quizStep: number; quizObjetivo: string|null; quizConsiderarSaldo: boolean|null
    quizConcluido: boolean; QUIZ_STEP_RESUMO: number; confirmarQuiz: ()=>void
  }>({ quizStep, quizObjetivo, quizConsiderarSaldo, quizConcluido, QUIZ_STEP_RESUMO, confirmarQuiz })
  quizKeyRef.current = { quizStep, quizObjetivo, quizConsiderarSaldo, quizConcluido, QUIZ_STEP_RESUMO, confirmarQuiz }

  useEffect(() => {
    if (!quizAtivo) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'TEXTAREA') return
      if (tag === 'BUTTON' && (e.target as HTMLElement).hasAttribute('data-quiz-nav')) return
      const { quizStep: step, quizObjetivo: obj, quizConsiderarSaldo: saldo,
              quizConcluido: done, QUIZ_STEP_RESUMO: resumo, confirmarQuiz: confirm } = quizKeyRef.current
      if (done) return
      e.preventDefault()
      const isDisabled = (step===0 && !obj) || (step===2 && saldo===null)
      if (step < resumo && !isDisabled) setQuizStep(s=>s+1)
      else if (step === resumo) confirm()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [quizAtivo])

  // Abre o quiz apenas apÃ³s os dados carregarem (evita sobrescrever plano existente)
  const quizIniciadoRef = useRef(false)
  useEffect(() => {
    if (carregando || quizIniciadoRef.current) return
    quizIniciadoRef.current = true
    if (!planos[anoAtual]) setQuizAtivo(true)
  }, [carregando])

  function toggleMes(i: number) {
    setMesesAbertos(prev => {
      const next = new Set(prev)
      if (next.has(i)) { next.delete(i) } else { next.add(i) }
      return next
    })
  }
  function toggleGrupo(mi: number, grupo: string) {
    const key = `${mi}-${grupo}`
    setGruposAbertos(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  // â”€â”€ EdiÃ§Ã£o de valores â”€â”€
  function iniciarValor(tipo: 'e'|'s', row: number, mes: number, valor: number) {
    setEditando({ tipo, row, mes })
    setValorTemp(valor === 0 ? '' : valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
  }
  function confirmarValor() {
    if (!editando) return
    const novo = parseBRL(valorTemp)
    const { tipo, row, mes } = editando
    if (tipo === 'e') {
      setEntradas(prev => prev.map((c, ri) =>
        ri === row ? { ...c, v: c.v.map((v, ci) => ci === mes ? novo : v) } : c))
    } else {
      setSaidas(prev => prev.map((c, ri) =>
        ri === row ? { ...c, v: c.v.map((v, ci) => ci === mes ? novo : v) } : c))
    }
    // Navega pela ordem de exibiÃ§Ã£o (grupos alfabÃ©ticos), nÃ£o pela ordem bruta do array
    const lista = tipo === 'e' ? dadosAno.entradas : dadosAnoFinal.saidas
    const getGrupoNav = (cat: Cat) => {
      if (tipo === 's') {
        if (nomeFaturaCartao(cat.nome, cartaoNomes)) return 'CartÃ£o de CrÃ©dito'
        return (cat.id ? (categorias.find(c => c.id === cat.id) ?? categorias.find(c => c.nome === cat.nome)) : categorias.find(c => c.nome === cat.nome))?.grupo ?? '__sem_grupo__'
      }
      const catE = cat.id
        ? (categorias.find(c => c.id === cat.id) ?? categorias.find(c => c.nome === cat.nome && c.tipo === 'entrada'))
        : categorias.find(c => c.nome === cat.nome && c.tipo === 'entrada')
      return catE?.grupo ?? '__sem_grupo__'
    }
    const gruposUsadosNav = new Set(lista.map(getGrupoNav))
    const gruposOrdenadosNav = [
      ...Array.from(gruposUsadosNav).filter(g => g !== '__sem_grupo__').sort((a, b) => a.localeCompare(b, 'pt-BR')),
      ...(gruposUsadosNav.has('__sem_grupo__') ? ['__sem_grupo__'] : []),
    ]
    const ordemDisplay: number[] = []
    for (const grupo of gruposOrdenadosNav) {
      lista.forEach((cat, idx) => { if (getGrupoNav(cat) === grupo) ordemDisplay.push(idx) })
    }
    const posAtual = ordemDisplay.indexOf(row)
    let nextPos = posAtual + 1
    while (nextPos < ordemDisplay.length && tipo === 's' && nomeFaturaCartao(lista[ordemDisplay[nextPos]].nome, cartaoNomes)) nextPos++
    if (nextPos < ordemDisplay.length) {
      const nextRow = ordemDisplay[nextPos]
      const v = lista[nextRow].v[mes]
      setEditando({ tipo, row: nextRow, mes })
      setValorTemp(v === 0 ? '' : v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
    } else {
      setEditando(null)
    }
  }

  // VersÃ£o horizontal: Tab vai para prÃ³ximo mÃªs (mesma linha), Enter salva e fecha
  function confirmarValorH(nextMes?: number) {
    if (!editando) return
    const novo = parseBRL(valorTemp)
    const { tipo, row, mes } = editando
    if (tipo === 'e') {
      setEntradas(prev => prev.map((c, ri) =>
        ri === row ? { ...c, v: c.v.map((v, ci) => ci === mes ? novo : v) } : c))
    } else {
      setSaidas(prev => prev.map((c, ri) =>
        ri === row ? { ...c, v: c.v.map((v, ci) => ci === mes ? novo : v) } : c))
    }
    if (nextMes !== undefined && nextMes < 12) {
      const lista = tipo === 'e' ? dadosAno.entradas : dadosAnoFinal.saidas
      const v = lista[row]?.v[nextMes] ?? 0
      setEditando({ tipo, row, mes: nextMes })
      setValorTemp(v === 0 ? '' : v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
    } else {
      setEditando(null)
    }
  }

  const bloqueado = planejamentoLockado && aba === 'previsto'

  const planoCriado = useMemo(() => {
    const p = planos[anoAtual] as PlanoAnoData | undefined
    if (!p) return false
    return (p.metaAnual ?? 0) > 0 ||
      p.entradas.some(c => c.v.some(v => v > 0)) ||
      p.saidas.some(c => c.v.some(v => v > 0))
  }, [planos, anoAtual])

  // â”€â”€ RenderizaÃ§Ã£o de cÃ©lula de valor (dentro do accordion) â”€â”€
  function renderValor(tipo: 'e'|'s', row: number, mes: number, valor: number, readOnly = false) {
    const ativo = editando?.tipo === tipo && editando.row === row && editando.mes === mes
    if (ativo && !bloqueado) {
      return (
        <input autoFocus value={valorTemp}
          onChange={e => setValorTemp(e.target.value)}
          onFocus={e => e.target.select()}
          onBlur={() => { if (skipBlurRef.current) { skipBlurRef.current = false } else { confirmarValor() } }}
          onKeyDown={e => {
            if (e.key === 'Enter') { skipBlurRef.current = true; confirmarValor() }
            if (e.key === 'Tab')   { e.preventDefault(); skipBlurRef.current = true; confirmarValor() }
            if (e.key === 'Escape') setEditando(null)
          }}
          style={{ width:110, padding:'4px 8px', textAlign:'right',
            border:`1px solid ${COR.azul}`, outline:'none',
            background:'#dbeafe', color:COR.azulEscuro, fontSize:13, fontFamily:'inherit',
            fontWeight:600, borderRadius:6 }} />
      )
    }
    const corVal = readOnly
      ? (valor === 0 ? '#c4b5fd' : '#7c3aed')
      : (valor === 0 ? '#c0cce0' : COR.texto)
    return (
      <div
        onClick={readOnly || bloqueado ? undefined : () => iniciarValor(tipo, row, mes, valor)}
        style={{ padding:'4px 8px', textAlign:'right', fontSize:13, color:corVal,
          fontWeight: readOnly ? 600 : 400, whiteSpace:'nowrap', userSelect:'none',
          cursor: readOnly || bloqueado ? 'default' : 'pointer',
          borderRadius:6, minWidth:110,
          background: readOnly ? 'transparent' : '#f8fafc',
          border: readOnly ? 'none' : '1px solid #e2e8f0',
          transition:'border-color .1s, background .1s' }}
        onMouseEnter={e => { if (!readOnly && !bloqueado) {
          ;(e.currentTarget as HTMLElement).style.borderColor = '#93c5fd'
          ;(e.currentTarget as HTMLElement).style.background = '#f1f5fb'
        }}}
        onMouseLeave={e => { if (!readOnly) {
          ;(e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'
          ;(e.currentTarget as HTMLElement).style.background = '#f8fafc'
        }}}>
        {fmt(valor)}
      </div>
    )
  }

  // â”€â”€ MOBILE VIEW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (isMobile) {
    const mi = mesMobile
    const te = totalEntradas[mi]
    const ts = totalSaidas[mi]
    const si = saldoInicial[mi]
    const sf = saldoFinal[mi]

    // Grupos das saÃ­das
    const gruposMap = new Map<string, Array<{ cat: Cat; ri: number }>>()
    for (const cat of saidasComHistorico) {
      if (nomeFaturaCartao(cat.nome, cartaoNomes)) continue
      const ri = dadosAnoFinal.saidas.findIndex(c => c.id ? c.id === cat.id : c.nome === cat.nome)
      if (ri < 0) continue
      const catInfo = cat.id
        ? (categorias.find(c => c.id === cat.id) ?? categorias.find(c => c.nome === cat.nome))
        : categorias.find(c => c.nome === cat.nome)
      const grupo = catInfo?.grupo ?? '__sem_grupo__'
      if (!gruposMap.has(grupo)) gruposMap.set(grupo, [])
      gruposMap.get(grupo)!.push({ cat, ri })
    }
    const gruposOrdenados = [
      ...Array.from(gruposMap.keys()).filter(g => g !== '__sem_grupo__').sort((a, b) => a.localeCompare(b, 'pt-BR')),
      ...(gruposMap.has('__sem_grupo__') ? ['__sem_grupo__'] : []),
    ]

    const renderCatRow = (tipo: 'e'|'s', cat: Cat, ri: number) => {
      const { icone, cor: corIcone } = iconeCategoria(categorias, cat.nome)
      const catInfo = cat.id
        ? (categorias.find(c => c.id === cat.id) ?? categorias.find(c => c.nome === cat.nome))
        : categorias.find(c => c.nome === cat.nome)
      const valorAtual = tipo === 'e'
        ? (dadosAnoFinal.entradas[ri]?.v[mi] ?? 0)
        : (dadosAnoFinal.saidas[ri]?.v[mi] ?? 0)
      const ativo = editando?.tipo === tipo && editando.row === ri && editando.mes === mi

      return (
        <div key={cat.id ?? cat.nome} style={{ background:'#fff', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', borderBottom:'1px solid #f8faff' }}>
          <div style={{ width:36, height:36, borderRadius:10, background: corIcone+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
            {icone}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#0f172a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cat.nome}</div>
            <div style={{ marginTop:2 }}>
              <span style={{ fontSize:8, padding:'1px 6px', borderRadius:4, fontWeight:700,
                background: catInfo?.fixa ? '#e0f2fe' : '#f1f5f9',
                color:       catInfo?.fixa ? '#0369a1' : '#64748b' }}>
                {catInfo?.fixa ? 'Fixa' : 'VariÃ¡vel'}
              </span>
            </div>
          </div>
          <div style={{ flexShrink:0 }}>
            {ativo && !bloqueado ? (
              <input autoFocus inputMode="decimal" value={valorTemp}
                onChange={e => setValorTemp(e.target.value)}
                onBlur={() => confirmarValor()}
                onKeyDown={e => { if (e.key === 'Enter') confirmarValor() }}
                style={{ width:100, border:'1.5px solid #1a56db', borderRadius:8, padding:'6px 10px', fontSize:14, fontWeight:600, fontFamily:'inherit', textAlign:'right' as const, outline:'none', background:'#eff6ff', color:'#0f2878' }}
              />
            ) : (
              <div
                onClick={() => !bloqueado && iniciarValor(tipo, ri, mi, valorAtual)}
                style={{ fontSize:13, fontWeight:700, color: valorAtual !== 0 ? '#0f172a' : '#cbd5e1', cursor: !bloqueado ? 'pointer' : 'default', minWidth:70, textAlign:'right' as const }}>
                {valorAtual !== 0 ? fmt(valorAtual, true) : 'â€”'}
              </div>
            )}
          </div>
        </div>
      )
    }

    const navBtn: React.CSSProperties = { width:30, height:30, borderRadius:9, border:'none', background:'rgba(255,255,255,.15)', color:'#fff', fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'inherit' }

    const mobileRevisaoView = aba === 'revisao' ? buildMobileRevisao() : null

    function buildMobileRevisao() {
      const drRaw = dadosRevisao
      if (!drRaw) return (
        <div style={{ textAlign:'center' as const, padding:'60px 20px', color:'#64748b' }}>
          <div style={{ fontSize:32, marginBottom:12 }}>ðŸ“­</div>
          <div style={{ fontSize:14, fontWeight:600, color:'#0f172a', marginBottom:6 }}>RevisÃ£o indisponÃ­vel</div>
          <div style={{ fontSize:12 }}>Registre lanÃ§amentos e crie um planejamento para ver a revisÃ£o mensal.</div>
        </div>
      )

      const dr = drRaw
      const METODOS_MOB = [
        { id: 'media_3_meses', label: 'MÃ©dia 3m' },
        { id: 'maior_valor',   label: 'Maior valor' },
        { id: 'mes_mais_margem', label: 'MÃªs+5%' },
      ]

      const semDados = dr.entradas.length === 0 && dr.saidas.length === 0
      const foraDoPerfil = dr.saidas.filter(c => c.foraDoPerfil)

      function mobCard(item: typeof dr.saidas[number], tipo: 'entrada'|'saida') {
        const excesso = tipo === 'saida' ? item.desvio > 0 : item.desvio < 0
        const pct = item.previsto > 0 ? Math.round((item.realizado / item.previsto) * 100) : 0
        const sugestaoVal = dr.getSugestao(item, tipo, metodoLocal)
        const editado = sugestoesEditadas[item.nome]
        const sugeridoStr = editado !== undefined ? editado : sugestaoVal.toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 })
        const barColor = pct <= 80 ? '#16a34a' : pct <= 100 ? '#d97706' : '#dc2626'
        return (
          <div key={item.nome} style={{ background:'#fff', borderRadius:14, border:`1.5px solid ${item.foraDoPerfil ? '#fecdd3' : '#e2e8f0'}`, margin:'0 0 10px', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
            {/* Header */}
            <div style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:10, borderBottom:'1px solid #f8faff' }}>
              <div style={{ width:38, height:38, borderRadius:11, background:item.cor+'20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{item.icone}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#0f172a' }}>{item.nome}</div>
                <div style={{ fontSize:10, color:'#94a3b8', marginTop:1 }}>{dr.temAtualizado ? 'Plano Atualizado' : 'Original'}</div>
              </div>
              {item.foraDoPerfil && item.desvioPerc !== null && (
                <div style={{ fontSize:11, fontWeight:800, padding:'3px 10px', borderRadius:20, background:'#fff1f2', color:'#dc2626' }}>
                  +{item.desvioPerc.toFixed(0)}%
                </div>
              )}
            </div>
            {/* Valores */}
            <div style={{ display:'flex', borderBottom:'1px solid #f8faff' }}>
              {[
                { label:'Planejado', val:item.previsto, cor:'#1a56db' },
                { label:'Realizado', val:item.realizado, cor: excesso ? '#dc2626' : '#16a34a' },
                { label:'%', val:pct, cor:barColor, suffix:'%' },
              ].map(col => (
                <div key={col.label} style={{ flex:1, padding:'10px 12px', textAlign:'center', borderRight:'1px solid #f8faff' }}>
                  <div style={{ fontSize:9, fontWeight:700, color:'#94a3b8', textTransform:'uppercase' as const, letterSpacing:'.3px', marginBottom:3 }}>{col.label}</div>
                  <div style={{ fontSize:14, fontWeight:800, color:col.cor, letterSpacing:'-.3px', fontVariantNumeric:'tabular-nums' }}>
                    {col.suffix ? `${col.val}%` : fmt(col.val as number, true)}
                  </div>
                </div>
              ))}
            </div>
            {/* Barra */}
            {item.previsto > 0 && (
              <div style={{ padding:'10px 14px', borderBottom:'1px solid #f8faff' }}>
                <div style={{ height:6, background:'#f1f5f9', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${Math.min(pct, 100)}%`, background: `linear-gradient(90deg, #16a34a, ${barColor})`, borderRadius:3 }} />
                </div>
              </div>
            )}
            {/* SugestÃ£o */}
            <div style={{ padding:'12px 14px', background:'#f8faff', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:20, flexShrink:0 }}>ðŸ’¡</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:10, color:'#64748b', fontWeight:600, marginBottom:3 }}>SugestÃ£o ({METODOS_MOB.find(m => m.id === metodoLocal)?.label})</div>
                <div style={{ fontSize:14, fontWeight:800, color:'#1a56db', fontVariantNumeric:'tabular-nums' }}>{fmt(sugestaoVal, true)}</div>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <input
                  value={sugeridoStr}
                  onChange={e => setSugestoesEditadas(prev => ({ ...prev, [item.nome]: e.target.value }))}
                  style={{ width:90, padding:'5px 8px', border:'1.5px solid #1a56db', borderRadius:7, fontSize:12, textAlign:'right' as const, fontFamily:'inherit', background:'#eff6ff', color:'#1a56db' }}
                />
              </div>
            </div>
          </div>
        )
      }

      return (
        <div>
          {/* Banner */}
          <div style={{ background:'linear-gradient(135deg,#92400e,#d97706)', borderRadius:16, padding:'16px', marginBottom:12, display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:32, flexShrink:0 }}>ðŸ”</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:800, color:'#fff', marginBottom:3 }}>
                {semDados ? 'Sem dados para revisar' : foraDoPerfil.length > 0 ? `${foraDoPerfil.length} ${foraDoPerfil.length === 1 ? 'categoria fora' : 'categorias fora'} do controle` : 'Tudo dentro do controle âœ…'}
              </div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.75)' }}>
                {MESES_FULL[mesRevisao]} {anoRevisao} Â· TolerÃ¢ncia {percentualAlerta}%
              </div>
            </div>
            <div style={{ background:'rgba(255,255,255,.2)', borderRadius:8, padding:'4px 10px', fontSize:11, fontWeight:700, color:'#fff', whiteSpace:'nowrap' as const }}>
              {dr.temAtualizado ? 'Atualizado' : 'Original'}
            </div>
          </div>
          {/* MÃ©todo toggle */}
          <div style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:14, padding:'12px 14px', marginBottom:12 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase' as const, letterSpacing:'.4px', marginBottom:8 }}>MÃ©todo de sugestÃ£o</div>
            <div style={{ display:'flex', gap:6 }}>
              {METODOS_MOB.map(m => (
                <button key={m.id} onClick={() => { setMetodoLocal(m.id); setMetodoSugestao(m.id) }}
                  style={{ flex:1, padding:'7px 4px', borderRadius:9, border:`1.5px solid ${metodoLocal === m.id ? '#1a56db' : '#e2e8f0'}`, background: metodoLocal === m.id ? '#eff6ff' : '#f8faff', fontSize:10, fontWeight:600, color: metodoLocal === m.id ? '#1a56db' : '#64748b', cursor:'pointer', fontFamily:'inherit', textAlign:'center' as const }}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          {semDados ? (
            <div style={{ textAlign:'center' as const, padding:'40px 20px', color:'#64748b', fontSize:13 }}>Nenhum dado encontrado para este mÃªs.</div>
          ) : (
            <>
              {dr.entradas.length > 0 && (
                <>
                  <div style={{ fontSize:10, fontWeight:800, color:'#16a34a', textTransform:'uppercase' as const, letterSpacing:'.6px', padding:'14px 0 8px', display:'flex', alignItems:'center', gap:6 }}>
                    â†‘ Receitas <span style={{ background:'#f0fdf4', borderRadius:10, padding:'1px 8px', fontSize:10 }}>{dr.entradas.length}</span>
                  </div>
                  {dr.entradas.map(item => mobCard(item, 'entrada'))}
                </>
              )}
              {foraDoPerfil.length > 0 && (
                <>
                  <div style={{ fontSize:10, fontWeight:800, color:'#dc2626', textTransform:'uppercase' as const, letterSpacing:'.6px', padding:'14px 0 8px', display:'flex', alignItems:'center', gap:6 }}>
                    âš  Fora do controle <span style={{ background:'#fff1f2', borderRadius:10, padding:'1px 8px', fontSize:10 }}>{foraDoPerfil.length}</span>
                  </div>
                  {foraDoPerfil.map(item => mobCard(item, 'saida'))}
                </>
              )}
              {dr.saidas.filter(c => !c.foraDoPerfil).length > 0 && (
                <>
                  <div style={{ fontSize:10, fontWeight:800, color:'#16a34a', textTransform:'uppercase' as const, letterSpacing:'.6px', padding:'14px 0 8px', display:'flex', alignItems:'center', gap:6 }}>
                    âœ“ Dentro do controle <span style={{ background:'#f0fdf4', borderRadius:10, padding:'1px 8px', fontSize:10 }}>{dr.saidas.filter(c => !c.foraDoPerfil).length}</span>
                  </div>
                  {dr.saidas.filter(c => !c.foraDoPerfil).map(item => (
                    <div key={item.nome} style={{ background:'#fff', borderRadius:14, border:'1.5px solid #e2e8f0', padding:'12px 14px', display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                      <div style={{ width:34, height:34, borderRadius:10, background:item.cor+'20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{item.icone}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:'#0f172a' }}>{item.nome}</div>
                        <div style={{ fontSize:10, color:'#16a34a', marginTop:2, fontWeight:600 }}>
                          {fmt(item.realizado, true)} / {fmt(item.previsto, true)}
                        </div>
                      </div>
                      {item.desvioPerc !== null && (
                        <div style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:'#f0fdf4', color:'#16a34a' }}>
                          {item.desvioPerc.toFixed(0)}%
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
              {/* Aplicar tudo */}
              <button onClick={aplicarRevisaoMensal}
                style={{ margin:'4px 0 14px', width:'100%', padding:14, border:'none', borderRadius:14, background:'linear-gradient(135deg,#1a56db,#2563eb)', color:'#fff', fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 4px 16px rgba(26,86,219,.3)' }}>
                âœ“ Aplicar tudo ao Plano Atualizado
              </button>
            </>
          )}
        </div>
      )
    }

    return (
      <div style={{ height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden', background:'#f0f4ff', fontFamily:"-apple-system,'Inter',sans-serif" }}>

        {/* HEADER â€” gradient */}
        <div style={{ background:'linear-gradient(135deg,#0f2878,#2563eb)', padding:'16px 20px 0', flexShrink:0 }}>
          {/* Logo + avatar */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:28, height:28, borderRadius:8, background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="1.5"/>
                  <polygon points="10,3 11.2,9.4 10,8.5 8.8,9.4" fill="white"/>
                  <polygon points="10,17 8.8,10.6 10,11.5 11.2,10.6" fill="white" fillOpacity=".5"/>
                </svg>
              </div>
              <div style={{ color:'#fff', fontSize:16, fontWeight:700 }}>Compass <span style={{ fontWeight:300, opacity:.7 }}>One</span></div>
            </div>
            <div onClick={() => sairDaConta()} style={{ width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
              {user?.email?.[0].toUpperCase() ?? 'U'}
            </div>
          </div>

          {/* Ano + MÃªs â€” mesma linha */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <button onClick={() => navegarAno(-1)} style={navBtn}>â€¹</button>
              <span style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,.7)' }}>{anoAtual}</span>
              <button onClick={() => navegarAno(1)} style={navBtn}>â€º</button>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <button onClick={() => setMesMobile(m => Math.max(0, m - 1))} style={navBtn}>â€¹</button>
              <span style={{ fontSize:18, fontWeight:800, color:'#fff', minWidth:90, textAlign:'center' as const }}>{MESES_FULL[mi]}</span>
              <button onClick={() => setMesMobile(m => Math.min(11, m + 1))} style={navBtn}>â€º</button>
            </div>
          </div>

          {/* Toggle + Saldo inicial â€” mesma linha */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:16 }}>
            <div style={{ display:'flex', background:'rgba(0,0,0,.2)', borderRadius:10, padding:3, gap:3 }}>
              {(['previsto','real','revisao'] as const).map(v => {
                const label = v === 'previsto' ? 'Previsto' : v === 'real' ? 'Realizado' : 'RevisÃ£o'
                const active = aba === v
                const disabled = v === 'revisao' && !revisaoDisponivel
                return (
                  <button key={v} onClick={() => { if (!disabled) { setAba(v); setEditando(null) } }}
                    style={{ padding:'6px 12px', borderRadius:8, border:'none', cursor: disabled ? 'default' : 'pointer', fontSize:11, fontWeight:700, fontFamily:'inherit', background: active ? 'rgba(255,255,255,.95)' : 'transparent', color: active ? '#0f2878' : disabled ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.6)' }}>
                    {label}
                  </button>
                )
              })}
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end' }}>
              <div style={{ fontSize:9, color:'rgba(255,255,255,.6)', fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'.4px', marginBottom:2 }}>Saldo inicial</div>
              <div style={{ fontSize:15, fontWeight:800, color:'#fbbf24', letterSpacing:'-.3px' }}>{fmt(si, true)}</div>
            </div>
          </div>
        </div>

        {/* RESUMO STRIP */}
        <div style={{ background:'#fff', borderBottom:'1px solid #e2e8f0', padding:'10px 16px', display:'flex', flexShrink:0 }}>
          {([
            { label:'Receitas', val: te, color:'#16a34a' },
            { label:'Despesas', val: ts, color:'#dc2626' },
            { label:'Saldo final', val: sf, color: corSaldo(sf) },
          ] as const).map((item, i, arr) => (
            <div key={item.label} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2, borderRight: i < arr.length-1 ? '1px solid #e2e8f0' : 'none', padding:'0 4px' }}>
              <div style={{ fontSize:9, color:'#94a3b8', fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'.3px' }}>{item.label}</div>
              <div style={{ fontSize:13, fontWeight:800, letterSpacing:'-.3px', color:item.color, fontVariantNumeric:'tabular-nums' }}>{fmt(item.val, true)}</div>
            </div>
          ))}
        </div>

        {/* CONTENT */}
        <div style={{ flex:1, overflowY:'auto', padding:'12px 14px 90px', scrollbarWidth:'none' as const }}>

          {mobileRevisaoView}

          {aba !== 'revisao' && <>
          {/* ENTRADAS section card */}
          <div style={{ borderRadius:18, overflow:'hidden', marginBottom:12, boxShadow:'0 2px 12px rgba(0,0,0,.07)' }}>
            <div onClick={() => setSecEntAberto(v => !v)}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:'#f0fdf4', borderBottom: secEntAberto ? '1px solid #dcfce7' : 'none', cursor:'pointer' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:16 }}>â†‘</span>
                <span style={{ fontSize:13, fontWeight:800, textTransform:'uppercase' as const, letterSpacing:'.5px', color:'#16a34a' }}>Receitas</span>
                <span style={{ fontSize:11, color:'#94a3b8', marginLeft:4, display:'inline-block', transform: secEntAberto ? 'none' : 'rotate(-90deg)', transition:'transform .2s' }}>â–¾</span>
              </div>
              <span style={{ fontSize:15, fontWeight:800, color:'#16a34a', letterSpacing:'-.3px' }}>{fmt(te, true)}</span>
            </div>
            {secEntAberto && (aba === 'real' ? entradasComHistorico : dadosAnoFinal.entradas).map((cat, idx) => {
              const ri = aba === 'real'
                ? dadosAnoFinal.entradas.findIndex(c => c.id ? c.id === cat.id : c.nome === cat.nome)
                : idx
              if (ri < 0) return null
              return renderCatRow('e', cat, ri)
            })}
            {secEntAberto && (
              <div style={{ background:'#f0fdf4', padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:12, fontWeight:700, color:'#16a34a' }}>Total receitas</span>
                <span style={{ fontSize:15, fontWeight:800, color:'#16a34a' }}>{fmt(te, true)}</span>
              </div>
            )}
          </div>

          {/* SAÃDAS section card */}
          <div style={{ borderRadius:18, overflow:'hidden', marginBottom:12, boxShadow:'0 2px 12px rgba(0,0,0,.07)' }}>
            <div onClick={() => setSecSaiAberto(v => !v)}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:'#fff1f2', borderBottom: secSaiAberto ? '1px solid #fecdd3' : 'none', cursor:'pointer' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:16 }}>â†“</span>
                <span style={{ fontSize:13, fontWeight:800, textTransform:'uppercase' as const, letterSpacing:'.5px', color:'#dc2626' }}>Despesas</span>
                <span style={{ fontSize:11, color:'#94a3b8', marginLeft:4, display:'inline-block', transform: secSaiAberto ? 'none' : 'rotate(-90deg)', transition:'transform .2s' }}>â–¾</span>
              </div>
              <span style={{ fontSize:15, fontWeight:800, color:'#dc2626', letterSpacing:'-.3px' }}>{fmt(ts, true)}</span>
            </div>
            {secSaiAberto && gruposOrdenados.map(grupo => {
              const itens = gruposMap.get(grupo) ?? []
              return (
                <div key={grupo}>
                  {grupo !== '__sem_grupo__' && (
                    <div style={{ background:'#f8faff', padding:'6px 16px', fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase' as const, letterSpacing:'.6px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', gap:5 }}>
                      <span style={{ fontSize:13 }}>{iconeCategoria(categorias, itens[0]?.cat.nome ?? '').icone}</span>
                      <span>{grupo}</span>
                    </div>
                  )}
                  {itens.map(({ cat, ri }) => renderCatRow('s', cat, ri))}
                </div>
              )
            })}
            {secSaiAberto && (
              <div style={{ background:'#fff1f2', padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:12, fontWeight:700, color:'#dc2626' }}>Total despesas</span>
                <span style={{ fontSize:15, fontWeight:800, color:'#dc2626' }}>{fmt(ts, true)}</span>
              </div>
            )}
          </div>

          {/* SALDO FINAL card */}
          <div style={{ borderRadius:18, background:'linear-gradient(135deg,#0f2878,#2563eb)', padding:16, marginBottom:10, display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 4px 16px rgba(26,86,219,.25)' }}>
            <div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.6)', fontWeight:600, marginBottom:3 }}>Saldo final {aba === 'real' ? 'realizado' : 'previsto'}</div>
              <div style={{ fontSize:9, color:'rgba(255,255,255,.4)' }}>{MESES_FULL[mi]} {anoAtual}</div>
            </div>
            <div style={{ fontSize:22, fontWeight:800, color:'#fff', letterSpacing:'-.5px' }}>{fmt(sf, true)}</div>
          </div>

          <div style={{ height:6 }} />
          </>}
        </div>

        <BottomNav />
      </div>
    )
  }

  return (
    <div style={isMobile ? { minHeight:'100vh', background:COR.fundo,
      fontFamily:"-apple-system,'Inter',sans-serif" } : {
      height:'100vh', display:'flex', flexDirection:'column' as const,
      overflow:'hidden', background:'#f0f4ff',
      fontFamily:"-apple-system,'Inter',sans-serif" }}>

      {isMobile && <AppHeader currentPath={pathname} />}

      {/* â”€â”€ BANNER + CONTROLES â€” desktop apenas â”€â”€ */}
      {!isMobile && (() => {
        const teAnual = aba === 'real' ? totaisReais.te.reduce((a,b)=>a+b,0) : totalEntradas.reduce((a,b)=>a+b,0)
        const tsAnual = aba === 'real' ? totaisReais.ts.reduce((a,b)=>a+b,0) : totalSaidas.reduce((a,b)=>a+b,0)
        const siAnual = aba === 'real' ? saldoInicialReal[0] : saldoInicial[0]
        const sfAnual = aba === 'real' ? saldoFinalReal[11]  : saldoFinal[11]
        const fmtB = (v: number) => v.toLocaleString('pt-BR', { style:'currency', currency:'BRL', minimumFractionDigits:0, maximumFractionDigits:0 })
        return (
          <>
            {/* BANNER */}
            <div style={{ background:'linear-gradient(135deg,#0f2878,#1e40af)', padding:'14px 28px', flexShrink:0, display:'flex' }}>
              {([
                { label:'Saldo inicial',      val:siAnual, cor:'rgba(255,255,255,.85)' },
                { label:'â†‘ Receitas do ano',  val:teAnual, cor:'#86efac' },
                { label:'â†“ Despesas do ano',  val:tsAnual, cor:'#fca5a5' },
                { label:'= Resultado em Dez', val:sfAnual, cor: sfAnual >= 0 ? '#86efac' : '#fca5a5' },
              ] as {label:string;val:number;cor:string}[]).map((item, idx) => (
                <div key={idx} style={{ flex:1, padding:'0 16px', borderRight: idx < 3 ? '1px solid rgba(255,255,255,.15)' : 'none' }}>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:.6, color:'rgba(255,255,255,.6)', marginBottom:3 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize:18, fontWeight:800, fontVariantNumeric:'tabular-nums' as const, color:item.cor }}>
                    {fmtB(item.val)}
                  </div>
                </div>
              ))}
            </div>

            {/* CONTROLS BAR */}
            <div style={{ background:'#fff', borderBottom:'1px solid #e2e8f0', padding:'0 28px', height:46, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <div style={{ display:'flex', gap:2 }}>
                {!hideTabs && (['previsto','real'] as const).map(v => (
                  <button key={v}
                    onClick={() => { setAba(v); setEditando(null) }}
                    style={{ padding:'5px 14px', borderRadius:7, fontSize:12, fontWeight: aba===v ? 700 : 500,
                      border:'none', cursor:'pointer', fontFamily:'inherit',
                      background: aba===v ? '#1a56db' : 'transparent',
                      color: aba===v ? '#fff' : '#64748b' }}>
                    {v === 'previsto' ? 'Original' : 'Atualizado'}
                  </button>
                ))}
                {!hideTabs && aba === 'previsto' && !planejamentoLockado && (
                  <button
                    onClick={() => { if (realExiste) { setConfirmarAtualizar(true) } else { finalizarPlanejamento(anoAtual, dadosPrevisto as PlanoAnoData) } }}
                    style={{ padding:'5px 14px', borderRadius:7, fontSize:12, fontWeight:700,
                      border:'none', cursor:'pointer', fontFamily:'inherit',
                      background:'#22c55e', color:'#fff' }}>
                    {realExiste ? 'â†º Atualizar' : 'âœ“ Finalizar'}
                  </button>
                )}
                {!hideTabs && aba === 'previsto' && planejamentoLockado && (
                  <span style={{ fontSize:11, color:'#94a3b8', paddingLeft:8 }}>ðŸ”’ Bloqueado</span>
                )}
              </div>
              <div style={{ display:'flex', alignItems:'center', border:'1px solid #e2e8f0', borderRadius:7, overflow:'hidden' }}>
                <button onClick={() => navegarAno(-1)}
                  style={{ border:'none', background:'transparent', cursor:'pointer', padding:'4px 12px', fontSize:15, color:'#64748b', lineHeight:1 }}>â€¹</button>
                <div style={{ padding:'3px 12px', borderLeft:'1px solid #e2e8f0', borderRight:'1px solid #e2e8f0', textAlign:'center' as const, minWidth:72 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:'#0f172a' }}>{anoAtual}</div>
                  <div style={{ fontSize:8, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:.4,
                    color: anoAtual===anoCorrente ? '#1a56db' : '#94a3b8' }}>
                    {anoAtual===anoCorrente ? 'Ano atual' : anoAtual < anoCorrente ? `${anoCorrente-anoAtual}a atrÃ¡s` : `${anoAtual-anoCorrente}a frente`}
                  </div>
                </div>
                <button onClick={() => navegarAno(+1)}
                  style={{ border:'none', background:'transparent', cursor:'pointer', padding:'4px 12px', fontSize:15, color:'#64748b', lineHeight:1 }}>â€º</button>
              </div>
            </div>
          </>
        )
      })()}

      {/* â”€â”€ ALERTAS DE CONFIGURAÃ‡ÃƒO â”€â”€ */}
      {(() => {
        const semContas = contas.length === 0
        const semEntradas = !categorias.some(c => c.tipo === 'entrada' && c.ativa)
        const semSaidas   = !categorias.some(c => c.tipo === 'saida'   && c.ativa)
        const semPlano    = !planos[anoCorrente]
        type AlertId = 'contas' | 'entradas' | 'saidas' | 'plano'
        const itens: { id: AlertId; msg: string; url: string; tipo: 'warn' | 'info' }[] = []
        if (semContas)   itens.push({ id:'contas',   msg:'âš  VocÃª nÃ£o tem nenhuma conta cadastrada.',            url:'/configuracoes?aba=bancos&acao=novo', tipo:'warn' })
        if (semEntradas) itens.push({ id:'entradas', msg:'âš  VocÃª nÃ£o tem categorias de entrada cadastradas.',   url:'/configuracoes?aba=categorias',       tipo:'warn' })
        if (semSaidas)   itens.push({ id:'saidas',   msg:'âš  VocÃª nÃ£o tem categorias de saÃ­da cadastradas.',     url:'/configuracoes?aba=categorias',       tipo:'warn' })
        if (semPlano)    itens.push({ id:'plano',    msg:`ðŸ“Š VocÃª ainda nÃ£o tem um planejamento para ${anoCorrente}.`, url:'/wizard-planejamento', tipo:'info' })
        const visiveis = itens.filter(a => !alertsDismissed.has(a.id))
        if (visiveis.length === 0) return null
        return (
          <div style={{ padding:'8px 20px 0', display:'flex', flexDirection:'column', gap:6 }}>
            {visiveis.map(a => {
              const warn = a.tipo === 'warn'
              return (
                <div key={a.id} style={{
                  display:'flex', alignItems:'center', gap:10,
                  background: warn ? '#fffbeb' : '#eff6ff',
                  border:`1px solid ${warn ? '#fde68a' : '#bfdbfe'}`,
                  borderRadius:10, padding:'10px 14px',
                }}>
                  <span style={{ flex:1, fontSize:13, color: warn ? '#92400e' : '#1e40af', fontWeight:500 }}>
                    {a.msg}
                  </span>
                  <button onClick={() => navigate(a.url)} style={{
                    border:'none', borderRadius:7, padding:'5px 12px', cursor:'pointer',
                    background: warn ? '#fde68a' : '#bfdbfe',
                    color: warn ? '#92400e' : '#1e40af',
                    fontSize:12, fontWeight:700, fontFamily:'inherit', flexShrink:0,
                  }}>Configurar</button>
                  <button onClick={() => setAlertsDismissed(prev => new Set([...prev, a.id]))} style={{
                    border:'none', background:'transparent', cursor:'pointer',
                    fontSize:16, color: warn ? '#d97706' : '#93c5fd', padding:'0 2px', flexShrink:0,
                    lineHeight:1,
                  }}>âœ•</button>
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* â”€â”€ BARRA STICKY â€” mobile apenas â”€â”€ */}
      {isMobile && (
      <div ref={stickyRef} style={{ position:'sticky', top:0, zIndex:20, background:COR.branco }}>

        <div style={{ padding:'8px 24px', borderBottom:`1px solid ${COR.borda}`, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>

          {/* Abas â€” mobile only (no desktop ficam no PageHeader) */}
          {(isMobile || hideTabs) && (
            <div style={{ display:'flex', gap:3 }}>
              {!hideTabs && (['previsto','real'] as const).map(v => {
                const label = v === 'previsto' ? 'Original' : 'Atualizado'
                return (
                  <button key={v}
                    onClick={() => { setAba(v); setEditando(null) }}
                    style={{ padding:'6px 14px', borderRadius:8,
                      border:`1px solid ${aba===v ? COR.azul : COR.borda}`,
                      cursor: 'pointer',
                      fontFamily:'inherit', fontSize:12, fontWeight: aba===v ? 700 : 500,
                      background: aba===v ? COR.azul : '#f8faff',
                      color: aba===v ? '#fff' : COR.textoSuave }}>
                    {label}
                  </button>
                )
              })}
            </div>
          )}

          {/* Lado direito: Finalizar (mobile) + Ano nav */}
          <div style={{ display:'flex', alignItems:'center', gap:7, marginLeft:'auto' }}>
            {isMobile && !hideTabs && aba === 'previsto' && !planejamentoLockado && (
              <button onClick={() => {
                  if (realExiste) { setConfirmarAtualizar(true) }
                  else { finalizarPlanejamento(anoAtual, dadosPrevisto as PlanoAnoData) }
                }}
                style={{ padding:'4px 12px', border:'none', borderRadius:7, cursor:'pointer',
                  fontFamily:'inherit', fontSize:11, fontWeight:600, color:'#fff', whiteSpace:'nowrap' as const,
                  background:`linear-gradient(135deg,${COR.azulEscuro},${COR.azulMedio})` }}>
                {realExiste ? 'â†º Atualizar' : 'âœ“ Finalizar'}
              </button>
            )}
            {/* Ano nav */}
            <div style={{ display:'flex', alignItems:'center', border:`1px solid ${COR.borda}`,
              borderRadius:7, overflow:'hidden', flexShrink:0 }}>
              <button onClick={() => navegarAno(-1)}
                style={{ border:'none', background:'transparent', cursor:'pointer',
                  padding:'4px 10px', fontSize:15, color:COR.textoSuave, lineHeight:1 }}>â€¹</button>
              <div style={{ padding:'3px 10px', borderLeft:`1px solid ${COR.borda}`,
                borderRight:`1px solid ${COR.borda}`, textAlign:'center' as const, minWidth:72 }}>
                <div style={{ fontSize:14, fontWeight:700, color:COR.texto }}>{anoAtual}</div>
                <div style={{ fontSize:8, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:.4,
                  color: anoAtual===anoCorrente ? COR.azul : COR.textoSuave }}>
                  {anoAtual===anoCorrente ? 'Ano atual' : anoAtual < anoCorrente
                    ? `${anoCorrente-anoAtual}a atrÃ¡s` : `${anoAtual-anoCorrente}a frente`}
                </div>
              </div>
              <button onClick={() => navegarAno(+1)}
                style={{ border:'none', background:'transparent', cursor:'pointer',
                  padding:'4px 10px', fontSize:15, color:COR.textoSuave, lineHeight:1 }}>â€º</button>
            </div>
          </div>
        </div>


      {(false as boolean) && (() => {
        const mesFoco = null as null
        const isMes     = mesFoco !== null
        const sufixo    = isMes ? MESES[mesFoco] : 'anual'
        const totalE    = isMes
          ? (aba === 'real' ? totaisReais.te[mesFoco] : totalEntradas[mesFoco])
          : (aba === 'real' ? totaisReais.te.reduce((a,b)=>a+b,0) : totalEntradas.reduce((a,b)=>a+b,0))
        const totalS    = isMes
          ? (aba === 'real' ? totaisReais.ts[mesFoco] : totalSaidas[mesFoco])
          : (aba === 'real' ? totaisReais.ts.reduce((a,b)=>a+b,0) : totalSaidas.reduce((a,b)=>a+b,0))
        const sfRef     = isMes
          ? (aba === 'real' ? saldoFinalReal[mesFoco] : saldoFinal[mesFoco])
          : (aba === 'real' ? saldoFinalReal[11] : saldoFinal[11])
        const resultado = totalE - totalS
        const metaAnual = planoRef?.metaAnual ?? 0
        const metaPct   = metaAnual > 0 ? Math.max(0, (sfRef / metaAnual) * 100) : 0
        const metaOk    = sfRef >= metaAnual && metaAnual > 0
        const caixaValor = isMes ? sfRef : resultado
        const totalEPrev = isMes ? totalEntradas[mesFoco!] : totalEntradas.reduce((a,b)=>a+b,0)
        const totalSPrev = isMes ? totalSaidas[mesFoco!]   : totalSaidas.reduce((a,b)=>a+b,0)
        const caixaPrev  = isMes ? saldoFinal[mesFoco!]    : (totalEPrev - totalSPrev)
        const fixos = [
          { label:`â†‘ Entrada ${sufixo}`, valor:totalE, prev:totalEPrev,
            pct: totalEPrev>0 ? Math.max(0, totalE/totalEPrev*100) : (totalE>0?100:0),
            ok: totalE>=totalEPrev,
            cor:'#16a34a', bg:'#f0fdf4', borda:'#bbf7d0', icon:'â†‘' },
          { label:`â†“ SaÃ­da ${sufixo}`, valor:totalS, prev:totalSPrev,
            pct: totalSPrev>0 ? Math.max(0, totalS/totalSPrev*100) : (totalS>0?100:0),
            ok: totalSPrev===0 || totalS<=totalSPrev,
            cor:COR.vermelho, bg:'#fff5f5', borda:'#fecaca', icon:'â†“' },
          { label: isMes ? `Caixa ${sufixo}` : `Resultado ${sufixo}`, valor:caixaValor, prev:caixaPrev,
            pct: caixaPrev>0 ? Math.max(0, caixaValor/caixaPrev*100) : (caixaValor>0?100:0),
            ok: caixaValor>=caixaPrev,
            cor: caixaValor>=0 ? '#16a34a' : COR.vermelho,
            bg:  caixaValor>=0 ? '#f0fdf4' : '#fff5f5',
            borda: caixaValor>=0 ? '#bbf7d0' : '#fecaca', icon: caixaValor>=0 ? 'â†—' : 'â†˜' },
        ]
        return (
          <div style={{ margin:'0 0 10px', display:'flex', gap:8 }}>
            {fixos.map(m => (
              <div key={m.label} style={{ flex:1, background:m.bg, border:`1.5px solid ${m.borda}`,
                borderRadius:12, padding:'10px 14px', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize:10, color:COR.textoSuave, fontWeight:600,
                  textTransform:'uppercase', letterSpacing:.5, marginBottom:4,
                  display:'flex', alignItems:'center', gap:4 }}>
                  <span style={{ fontSize:13, color:m.cor }}>{m.icon}</span> {m.label}
                </div>
                <div style={{ fontSize:16, fontWeight:700, color:m.cor, marginBottom: aba==='real' && m.prev!==0 ? 5 : 0 }}>
                  {m.valor.toLocaleString('pt-BR', { style:'currency', currency:'BRL' })}
                </div>
                {aba === 'real' && m.prev !== 0 && (
                  <>
                    <div style={{ height:4, background:'rgba(0,0,0,0.08)', borderRadius:2, overflow:'hidden', marginBottom:3 }}>
                      <div style={{ height:'100%', borderRadius:2, transition:'width .4s',
                        background: m.ok ? '#16a34a' : '#f59e0b', width:`${Math.min(100, m.pct)}%` }}/>
                    </div>
                    <div style={{ fontSize:10, color:COR.textoSuave }}>
                      {m.pct.toFixed(0)}% de {m.prev.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                    </div>
                  </>
                )}
              </div>
            ))}

            {/* Card 4: mÃªs aberto â†’ Saldo final mÃªs | anual â†’ Meta ou Saldo dez */}
            {isMes ? (
              metaAnual > 0 ? (() => {
                const metaAcumulada = metaAnual / 12 * (mesFoco! + 1)
                const metaOkMes = sfRef >= metaAcumulada
                const metaPctMes = metaAcumulada > 0 ? Math.max(0, (sfRef / metaAcumulada) * 100) : 0
                return (
                  <div style={{ flex:1, background: metaOkMes ? '#f0fdf4' : '#faf5ff',
                    border:`1.5px solid ${metaOkMes ? '#bbf7d0' : '#ddd6fe'}`,
                    borderRadius:12, padding:'10px 14px', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize:10, fontWeight:600, textTransform:'uppercase',
                      letterSpacing:.5, marginBottom:4, display:'flex', alignItems:'center', gap:4,
                      color: metaOkMes ? '#16a34a' : '#7c3aed' }}>
                      <span style={{ fontSize:13 }}>{metaOkMes ? 'âœ“' : 'â—Ž'}</span> Meta {MESES[mesFoco!]}
                    </div>
                    <div style={{ fontSize:16, fontWeight:700, color: metaOkMes ? '#16a34a' : '#7c3aed', marginBottom:5 }}>
                      {sfRef.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                    </div>
                    <div style={{ height:4, background: metaOkMes ? '#bbf7d0' : '#ede9fe', borderRadius:2, overflow:'hidden', marginBottom:4 }}>
                      <div style={{ height:'100%', borderRadius:2, transition:'width .4s',
                        background: metaOkMes ? '#16a34a' : '#7c3aed', width:`${Math.min(100, metaPctMes)}%` }}/>
                    </div>
                    <div style={{ fontSize:10, color: metaOkMes ? '#16a34a' : '#7c3aed' }}>
                      {metaPctMes.toFixed(0)}% de {metaAcumulada.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                    </div>
                  </div>
                )
              })() : (
                <div style={{ flex:1, background: resultado >= 0 ? '#f0fdf4' : '#fff5f5',
                  border:`1.5px solid ${resultado >= 0 ? '#bbf7d0' : '#fecaca'}`,
                  borderRadius:12, padding:'10px 14px', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize:10, color:COR.textoSuave, fontWeight:600,
                    textTransform:'uppercase', letterSpacing:.5, marginBottom:4,
                    display:'flex', alignItems:'center', gap:4 }}>
                    <span style={{ fontSize:13, color: resultado >= 0 ? COR.verde : COR.vermelho }}>â†—</span> Resultado {MESES[mesFoco!]}
                  </div>
                  <div style={{ fontSize:16, fontWeight:700, color: resultado >= 0 ? COR.verde : COR.vermelho }}>
                    {resultado.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                  </div>
                </div>
              )
            ) : metaAnual > 0 ? (
              <div
                onClick={() => { if (!editandoMeta) { setEditandoMeta(true); setMetaTemp(metaAnual.toLocaleString('pt-BR',{minimumFractionDigits:2})) } }}
                style={{ flex:1, background: metaOk ? '#f0fdf4' : '#faf5ff',
                  border:`1.5px solid ${metaOk ? '#bbf7d0' : '#ddd6fe'}`,
                  borderRadius:12, padding:'10px 14px', boxShadow:'0 1px 4px rgba(0,0,0,0.05)',
                  cursor: editandoMeta ? 'default' : 'pointer' }}>
                <div style={{ fontSize:10, fontWeight:600, textTransform:'uppercase',
                  letterSpacing:.5, marginBottom:4, display:'flex', alignItems:'center', gap:4,
                  color: metaOk ? '#16a34a' : '#7c3aed' }}>
                  <span style={{ fontSize:13 }}>{metaOk ? 'âœ“' : 'â—Ž'}</span> Meta do ano
                </div>
                <div style={{ fontSize:16, fontWeight:700, color: metaOk ? '#16a34a' : '#7c3aed', marginBottom:5 }}>
                  {sfRef.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                </div>
                <div style={{ height:4, background: metaOk ? '#bbf7d0' : '#ede9fe', borderRadius:2, overflow:'hidden', marginBottom:4 }}>
                  <div style={{ height:'100%', borderRadius:2, transition:'width .4s',
                    background: metaOk ? '#16a34a' : '#7c3aed', width:`${Math.min(100, metaPct)}%` }}/>
                </div>
                {editandoMeta ? (
                  <input autoFocus value={metaTemp}
                    onChange={e => setMetaTemp(e.target.value)}
                    onFocus={e => e.target.select()}
                    onClick={e => e.stopPropagation()}
                    onBlur={() => { updateMetaAnual(parseBRL(metaTemp)); setEditandoMeta(false) }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === 'Escape') {
                        if (e.key === 'Enter') updateMetaAnual(parseBRL(metaTemp))
                        setEditandoMeta(false)
                      }
                    }}
                    style={{ width:'100%', padding:0, border:'none', outline:'none',
                      background:'transparent', color:'#7c3aed', fontSize:10,
                      fontFamily:'inherit', fontWeight:600, boxSizing:'border-box' }}/>
                ) : (
                  <div style={{ fontSize:10, color: metaOk ? '#16a34a' : '#7c3aed' }}>
                    {metaPct.toFixed(0)}% de {metaAnual.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                  </div>
                )}
              </div>
            ) : (
              <div
                onClick={() => { setEditandoMeta(true); setMetaTemp('') }}
                style={{ flex:1, background: sfRef >= 0 ? '#eff6ff' : '#fff5f5',
                  border:`1.5px solid ${sfRef >= 0 ? '#bfdbfe' : '#fecaca'}`,
                  borderRadius:12, padding:'10px 14px', boxShadow:'0 1px 4px rgba(0,0,0,0.05)',
                  cursor:'pointer' }}>
                <div style={{ fontSize:10, color:COR.textoSuave, fontWeight:600,
                  textTransform:'uppercase', letterSpacing:.5, marginBottom:4,
                  display:'flex', alignItems:'center', gap:4 }}>
                  <span style={{ fontSize:13, color:corSaldo(sfRef) }}>â—Ž</span> Saldo dezembro
                </div>
                {editandoMeta ? (
                  <input autoFocus value={metaTemp}
                    placeholder="0,00"
                    onChange={e => setMetaTemp(e.target.value)}
                    onFocus={e => e.target.select()}
                    onClick={e => e.stopPropagation()}
                    onBlur={() => { updateMetaAnual(parseBRL(metaTemp)); setEditandoMeta(false) }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === 'Escape') {
                        if (e.key === 'Enter') updateMetaAnual(parseBRL(metaTemp))
                        setEditandoMeta(false)
                      }
                    }}
                    style={{ width:'100%', padding:0, border:'none', outline:'none',
                      background:'transparent', color:'#7c3aed', fontSize:14,
                      fontFamily:'inherit', fontWeight:700, boxSizing:'border-box' }}/>
                ) : (
                  <>
                    <div style={{ fontSize:16, fontWeight:700, color:corSaldo(sfRef) }}>
                      {sfRef.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                    </div>
                    <div style={{ fontSize:10, color:'#94a3b8', marginTop:4 }}>
                      Clique para definir meta
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )
      })()}

      </div>
      )}
      {/* fim sticky */}

      <div style={isMobile ? { maxWidth:1200, margin:'0 auto', padding:'0 24px 40px' } : { flex:1, overflowY:'auto' as const, padding:'20px 28px 40px' }}>
      {/* ÃREA PRINCIPAL */}
      <div style={{ padding:'0 0 8px' }}>

        {/* Tutorial por modo/view */}
        {quizAtivo && quizStep === 0 && quizFromWizard && <TutorialCard tela="plan_comece" icon="ðŸš€"
          title="Crie seu planejamento"
          description="O assistente vai te guiar passo a passo para montar seu orÃ§amento mensal. NÃ£o precisa ser perfeito â€” vocÃª ajusta depois."
          tips={[
            { icon: 'ðŸŽ¯', text: 'Escolha seu objetivo financeiro' },
            { icon: 'ðŸ’°', text: 'Informe sua renda mensal' },
            { icon: 'ðŸ“‹', text: 'Defina quanto quer gastar em cada categoria' },
          ]} buttonLabel="ComeÃ§ar â†’" />}
        {viewMode === 'grade' && aba !== 'revisao' && !quizAtivo && <TutorialCard tela="plan_grade" icon="ðŸ“…"
          title="VisÃ£o em grade"
          description="VisÃ£o geral do ano em cards mensais. Toque em qualquer mÃªs para ver ou editar os detalhes."
          tips={[
            { icon: 'ðŸ“¦', text: 'Cada card Ã© um mÃªs do ano' },
            { icon: 'ðŸ–Šï¸', text: 'Clique em um mÃªs para editar os valores' },
            { icon: 'ðŸŸ¢', text: 'Verde = sobrou | ðŸ”´ Vermelho = faltou' },
          ]} buttonLabel="Ver grade â†’" />}
        {viewMode === 'horizontal' && !quizAtivo && <TutorialCard tela="plan_planilha" icon="ðŸ“‘"
          title="VisÃ£o em planilha"
          description="Todos os meses lado a lado com as categorias. Edite direto nas cÃ©lulas."
          tips={[
            { icon: 'ðŸ“Š', text: 'Linhas = categorias, Colunas = meses' },
            { icon: 'ðŸ–Šï¸', text: 'Edite valores diretamente nas cÃ©lulas' },
            { icon: 'ðŸ“ˆ', text: 'Totais calculados automaticamente' },
          ]} buttonLabel="Ver planilha â†’" />}
        {viewMode === 'vertical' && !quizAtivo && <TutorialCard tela="plan_lista" icon="ðŸ“ƒ"
          title="VisÃ£o em lista"
          description="Fluxo de caixa â€” veja mÃªs a mÃªs como seu dinheiro evolui. Toque na linha para ver categorias."
          tips={[
            { icon: 'ðŸ“‹', text: 'Clique em um mÃªs para ver entradas e saÃ­das' },
            { icon: 'ðŸ–Šï¸', text: 'Edite valores clicando na categoria' },
            { icon: 'ðŸ“Š', text: 'Total do ano no rodapÃ©' },
          ]} buttonLabel="Ver lista â†’" />}
        {aba === 'revisao' && !quizAtivo && <TutorialCard tela="plan_revisao" icon="ðŸ”„"
          title="Hora de revisar"
          description="Compare o que vocÃª planejou com o que realmente aconteceu. Use essa anÃ¡lise para ajustar o plano do prÃ³ximo mÃªs."
          tips={[
            { icon: 'ðŸ“Š', text: 'Veja planejado vs realizado por categoria' },
            { icon: 'âš¡', text: 'Identifique onde gastou mais ou menos que o previsto' },
            { icon: 'âœï¸', text: 'Atualize o plano com base na realidade' },
          ]} buttonLabel="Revisar meu mÃªs â†’" />}

        {/* BANNER COPIAR ANO ANTERIOR */}
        {showBannerCopiar && aba === 'previsto' && !planejamentoLockado && (
          <div style={{ margin:'8px 0', background:'#fffbeb',
            border:'1px solid #fcd34d', borderRadius:10, padding:'10px 16px',
            display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' as const }}>
            <span style={{ fontSize:12, color:'#92400e', fontWeight:600, flex:1, minWidth:200 }}>
              Copiar planejamento de <strong>{anoAtual - 1}</strong> para {anoAtual}?
            </span>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:12, color:'#92400e' }}>Reajuste:</span>
              <input value={reajustePerc} onChange={e => setReajustePerc(e.target.value)}
                style={{ width:56, padding:'4px 8px', border:'1px solid #fcd34d',
                  borderRadius:6, fontSize:12, textAlign:'right' as const,
                  fontFamily:'inherit', background:'#fff', color:'#92400e' }} />
              <span style={{ fontSize:12, color:'#92400e' }}>%</span>
              <button onClick={() => {
                copiarAnoAnteriorComReajuste(anoAtual - 1, anoAtual, parseFloat(reajustePerc) || 0)
                setShowBannerCopiar(false)
              }} style={{ padding:'5px 14px', border:'none', borderRadius:7, cursor:'pointer',
                fontFamily:'inherit', fontSize:12, fontWeight:600, color:'#fff', background:'#d97706' }}>
                Aplicar
              </button>
              <button onClick={() => setShowBannerCopiar(false)} style={{
                padding:'5px 12px', border:'1px solid #fcd34d', borderRadius:7, cursor:'pointer',
                fontFamily:'inherit', fontSize:12, fontWeight:500, color:'#92400e', background:'transparent' }}>
                Manter em branco
              </button>
            </div>
          </div>
        )}

        {/* â”€â”€ ABA REVISÃƒO MENSAL â”€â”€ */}
        {aba === 'revisao' && (() => {
          const mesNome = MESES_FULL[mesRevisao]
          const drRaw2 = dadosRevisao
          if (!drRaw2) return null
          const dr = drRaw2
          const semDados = dr.entradas.length === 0 && dr.saidas.length === 0

          const METODOS = [
            { id: 'media_3_meses', label: 'MÃ©dia 3 meses' },
            { id: 'maior_valor',   label: 'Maior valor'   },
            { id: 'mes_mais_margem', label: 'MÃªs + margem 5%' },
          ]

          const foraDoPerfil = dr.saidas.filter(c => c.foraDoPerfil)

          function cardCategoria(item: typeof dr.saidas[number], tipo: 'entrada'|'saida') {
            const excesso = tipo === 'saida' ? item.desvio > 0 : item.desvio < 0
            const corDesvio = item.desvio === 0 ? '#94a3b8' : excesso ? COR.vermelho : COR.verde
            const pct = item.previsto > 0 ? Math.round((item.realizado / item.previsto) * 100) : 0
            const barW = Math.min(pct, 100)
            const barOver = pct > 100 ? Math.min(pct - 100, 40) : 0
            const sugestaoVal = dr.getSugestao(item, tipo, metodoLocal)
            const editado = sugestoesEditadas[item.nome]
            const sugeridoStr = editado !== undefined ? editado : sugestaoVal.toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 })
            return (
              <div key={item.nome} style={{ background:COR.branco, border:`1.5px solid ${item.foraDoPerfil ? '#fecdd3' : COR.borda}`, borderRadius:16, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,.06)', marginBottom:12 }}>
                {/* Header */}
                <div style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:14, borderBottom:`1px solid ${COR.borda}` }}>
                  <div style={{ width:44, height:44, borderRadius:13, background: item.cor+'20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
                    {item.icone}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:15, fontWeight:800, color:COR.texto, marginBottom:2 }}>{item.nome}</div>
                    <div style={{ fontSize:11, color:'#94a3b8' }}>Base: {dr.temAtualizado ? 'Plano Atualizado' : 'Original'}</div>
                  </div>
                  {item.foraDoPerfil && item.desvioPerc !== null && (
                    <div style={{ fontSize:13, fontWeight:800, padding:'5px 14px', borderRadius:10, background:'#fff1f2', color:COR.vermelho, flexShrink:0 }}>
                      +{item.desvioPerc.toFixed(0)}% do planejado
                    </div>
                  )}
                </div>
                {/* Valores */}
                <div style={{ display:'flex', borderBottom:`1px solid ${COR.borda}` }}>
                  {[
                    { label:'Planejado', val:item.previsto, cor:'#1a56db' },
                    { label:'Realizado', val:item.realizado, cor: excesso ? COR.vermelho : COR.verde },
                    { label:'DiferenÃ§a', val:item.desvio,    cor: corDesvio },
                  ].map(col => (
                    <div key={col.label} style={{ flex:1, padding:'14px 16px', textAlign:'center', borderRight:`1px solid ${COR.borda}` }}>
                      <div style={{ fontSize:9, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.4px', marginBottom:4 }}>{col.label}</div>
                      <div style={{ fontSize:16, fontWeight:800, color:col.cor, letterSpacing:'-.4px', fontVariantNumeric:'tabular-nums' }}>
                        {col.label === 'DiferenÃ§a' && col.val > 0 ? '+' : ''}{fmt(Math.abs(col.val))}
                      </div>
                    </div>
                  ))}
                  <div style={{ flex:1, padding:'14px 16px', textAlign:'center' }}>
                    <div style={{ fontSize:9, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.4px', marginBottom:4 }}>Uso %</div>
                    <div style={{ fontSize:16, fontWeight:800, color: pct > 100 ? COR.vermelho : pct > 80 ? '#d97706' : COR.verde, letterSpacing:'-.4px' }}>{pct}%</div>
                  </div>
                </div>
                {/* Barra visual */}
                {item.previsto > 0 && (
                  <div style={{ padding:'14px 20px', borderBottom:`1px solid ${COR.borda}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:6, color:'#64748b' }}>
                      <span>0</span>
                      <span>Planejado: {fmt(item.previsto)}</span>
                    </div>
                    <div style={{ height:8, background:'#f1f5f9', borderRadius:4, overflow:'visible', position:'relative' }}>
                      <div style={{ position:'absolute', top:0, left:0, height:'100%', width:`${barW}%`, background:'#1a56db', borderRadius:'4px 0 0 4px' }} />
                      {barOver > 0 && (
                        <div style={{ position:'absolute', top:0, left:`${barW}%`, height:'100%', width:`${barOver}%`, background:COR.vermelho, borderRadius:'0 4px 4px 0' }} />
                      )}
                    </div>
                  </div>
                )}
                {/* SugestÃ£o */}
                <div style={{ padding:'14px 20px', background:'#f8faff', display:'flex', alignItems:'center', gap:14 }}>
                  <span style={{ fontSize:24, flexShrink:0 }}>ðŸ’¡</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11, color:'#64748b', fontWeight:600, marginBottom:3 }}>SugestÃ£o para prÃ³ximos meses</div>
                    <div style={{ fontSize:18, fontWeight:800, color:'#1a56db', letterSpacing:'-.4px', fontVariantNumeric:'tabular-nums' }}>{fmt(sugestaoVal)}</div>
                    <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>{METODOS.find(m => m.id === metodoLocal)?.label}</div>
                  </div>
                  <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                    <input
                      value={sugeridoStr}
                      onChange={e => setSugestoesEditadas(prev => ({ ...prev, [item.nome]: e.target.value }))}
                      style={{ width:110, padding:'6px 10px', border:`1.5px solid #1a56db`, borderRadius:8, fontSize:13, textAlign:'right', fontFamily:'inherit', fontVariantNumeric:'tabular-nums', background:'#eff6ff', color:'#1a56db' }}
                    />
                    {editado !== undefined && (
                      <button onClick={() => setSugestoesEditadas(prev => { const n = {...prev}; delete n[item.nome]; return n })}
                        style={{ padding:'6px 10px', border:`1.5px solid ${COR.borda}`, borderRadius:8, background:COR.branco, color:COR.textoSuave, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                        â†º
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          }

          const catsFora = dr.saidas.filter(c => c.foraDoPerfil)
          const catsOk   = dr.saidas.filter(c => !c.foraDoPerfil)

          return (
            <div style={{ paddingTop:4 }}>
              {/* â”€â”€ Banner â”€â”€ */}
              <div style={{ background:'linear-gradient(135deg,#92400e,#d97706)', borderRadius:16, padding:'20px 24px', display:'flex', alignItems:'center', gap:16, marginBottom:16, flexWrap:'wrap' }}>
                <span style={{ fontSize:36, flexShrink:0 }}>ðŸ”</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:16, fontWeight:800, color:'#fff', marginBottom:4 }}>
                    {semDados ? `Sem dados para ${mesNome}` : foraDoPerfil.length > 0 ? `${foraDoPerfil.length} ${foraDoPerfil.length === 1 ? 'categoria saiu' : 'categorias saÃ­ram'} do controle em ${mesNome}` : `Tudo dentro do controle em ${mesNome} âœ…`}
                  </div>
                  <div style={{ fontSize:13, color:'rgba(255,255,255,.75)' }}>
                    {semDados ? 'Registre lanÃ§amentos e crie um planejamento.' : `Ultrapassaram mais de ${percentualAlerta}% do planejado â€” revise e ajuste`}
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8, flexShrink:0 }}>
                  <div style={{ background:'rgba(255,255,255,.2)', borderRadius:8, padding:'5px 14px', fontSize:13, fontWeight:700, color:'#fff' }}>
                    TolerÃ¢ncia: {percentualAlerta}%
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    {METODOS.map(m => (
                      <button key={m.id} onClick={() => { setMetodoLocal(m.id); setMetodoSugestao(m.id) }}
                        style={{ padding:'5px 10px', borderRadius:8, border:`1.5px solid ${metodoLocal === m.id ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.3)'}`, background: metodoLocal === m.id ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.1)', fontSize:11, fontWeight:700, color: metodoLocal === m.id ? '#fff' : 'rgba(255,255,255,.7)', cursor:'pointer', fontFamily:'inherit' }}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {semDados ? (
                <div style={{ textAlign:'center', padding:'48px 24px', background:COR.branco, borderRadius:14, border:`1px solid ${COR.borda}` }}>
                  <div style={{ fontSize:36, marginBottom:12 }}>ðŸ“­</div>
                  <div style={{ fontSize:14, color:COR.textoSuave }}>
                    Registre seus lanÃ§amentos e crie um planejamento para ver a revisÃ£o.
                  </div>
                </div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:20, alignItems:'start' }}>
                  {/* â”€â”€ Coluna esquerda: categorias â”€â”€ */}
                  <div>
                    {/* Receitas */}
                    {dr.entradas.length > 0 && (
                      <>
                        <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'.6px', marginBottom:12, display:'flex', alignItems:'center', gap:8, color:'#16a34a' }}>
                          â†‘ Receitas <span style={{ fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:20, background:'#f0fdf4', color:'#16a34a' }}>{dr.entradas.length}</span>
                        </div>
                        {dr.entradas.map(item => cardCategoria(item, 'entrada'))}
                      </>
                    )}
                    {/* Fora do controle */}
                    {catsFora.length > 0 && (
                      <>
                        <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'.6px', marginBottom:12, display:'flex', alignItems:'center', gap:8, color:COR.vermelho }}>
                          âš  Fora do controle <span style={{ fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:20, background:'#fff1f2', color:COR.vermelho }}>{catsFora.length}</span>
                        </div>
                        {catsFora.map(item => cardCategoria(item, 'saida'))}
                      </>
                    )}
                    {/* OK */}
                    {catsOk.length > 0 && (
                      <>
                        <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'.6px', marginBottom:12, marginTop: catsFora.length > 0 ? 8 : 0, display:'flex', alignItems:'center', gap:8, color:'#16a34a' }}>
                          âœ“ Dentro do controle <span style={{ fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:20, background:'#f0fdf4', color:'#16a34a' }}>{catsOk.length}</span>
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                          {catsOk.map(item => (
                            <div key={item.nome} style={{ background:COR.branco, border:`1.5px solid ${COR.borda}`, borderRadius:14, padding:14, display:'flex', alignItems:'center', gap:12 }}>
                              <div style={{ width:38, height:38, borderRadius:11, background:item.cor+'20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{item.icone}</div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:13, fontWeight:600, color:COR.texto, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.nome}</div>
                                <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>{fmt(item.realizado)} / {fmt(item.previsto)}</div>
                              </div>
                              {item.desvioPerc !== null && (
                                <div style={{ fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:6, background:'#f0fdf4', color:'#16a34a', flexShrink:0 }}>
                                  {item.desvioPerc > 0 ? '+' : ''}{item.desvioPerc.toFixed(0)}%
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* â”€â”€ Coluna direita: resumo + aÃ§Ãµes â”€â”€ */}
                  <div style={{ position:'sticky', top:20 }}>
                    {/* Resumo */}
                    <div style={{ background:COR.branco, border:`1.5px solid ${COR.borda}`, borderRadius:16, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,.06)', marginBottom:16 }}>
                      <div style={{ padding:'14px 18px', borderBottom:`1px solid ${COR.borda}`, fontSize:13, fontWeight:700, color:COR.texto, display:'flex', alignItems:'center', gap:8 }}>
                        ðŸ“Š Resumo de {mesNome}
                      </div>
                      {[
                        { label:'Receitas planejadas', val:dr.totalPrevE, cor:COR.textoSuave },
                        { label:'Receitas realizadas', val:dr.totalRealE, cor:'#16a34a' },
                        { label:'Despesas planejadas', val:dr.totalPrevS, cor:COR.textoSuave },
                        { label:'Despesas realizadas', val:dr.totalRealS, cor:COR.vermelho },
                        { label:'Resultado', val: dr.totalRealE - dr.totalRealS, cor: dr.totalRealE - dr.totalRealS >= 0 ? '#16a34a' : COR.vermelho },
                      ].map(row => (
                        <div key={row.label} style={{ padding:'12px 18px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:`1px solid #f8faff` }}>
                          <span style={{ fontSize:12, color:'#64748b' }}>{row.label}</span>
                          <span style={{ fontSize:13, fontWeight:700, color:row.cor, fontVariantNumeric:'tabular-nums' }}>{fmt(row.val)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Base do plano */}
                    <div style={{ background:COR.branco, border:`1.5px solid ${COR.borda}`, borderRadius:16, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,.06)', marginBottom:16 }}>
                      <div style={{ padding:'14px 18px', borderBottom:`1px solid ${COR.borda}`, fontSize:13, fontWeight:700, color:COR.texto }}>
                        ðŸ“‹ Base da revisÃ£o
                      </div>
                      <div style={{ padding:'12px 18px', fontSize:12, color:'#64748b', lineHeight:1.6 }}>
                        Comparando com o <strong style={{ color: dr.temAtualizado ? COR.azul : COR.textoSuave }}>{dr.temAtualizado ? 'Plano Atualizado' : 'Plano Original'}</strong>.<br />
                        SugestÃµes aplicadas de <strong>{MESES_FULL[mesAtual]}</strong> a Dezembro.
                      </div>
                    </div>

                    {/* BotÃ£o Aplicar Tudo */}
                    {[...dr.entradas, ...dr.saidas].length > 0 && (
                      <>
                        <button onClick={aplicarRevisaoMensal}
                          style={{ width:'100%', padding:14, border:'none', borderRadius:12, background:'linear-gradient(135deg,#16a34a,#15803d)', color:'#fff', fontSize:14, fontWeight:800, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 4px 12px rgba(22,163,74,.3)', marginBottom:10 }}>
                          âœ“ Aplicar tudo ao Plano Atualizado
                        </button>
                        <button onClick={() => { setSugestoesEditadas({}); setAba('real') }}
                          style={{ width:'100%', padding:12, border:`1.5px solid ${COR.borda}`, borderRadius:12, background:COR.branco, color:COR.textoSuave, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                          Ver Plano Atualizado sem aplicar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* Placeholder: aba Real ainda nÃ£o finalizada */}
        {aba === 'real' && !realExiste && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'center', minHeight:300, gap:16, paddingBottom:40 }}>
            <div style={{ fontSize:40 }}>ðŸ“‹</div>
            <div style={{ fontSize:15, fontWeight:700, color:COR.texto }}>
              Planejamento realizado nÃ£o iniciado
            </div>
            <div style={{ fontSize:13, color:COR.textoSuave, textAlign:'center', maxWidth:380 }}>
              VÃ¡ para a aba <strong>Original</strong>, revise os valores e clique em{' '}
              <strong>Finalizar planejamento</strong> para criar uma cÃ³pia do planejamento realizado.
            </div>
            <button onClick={() => setAba('previsto')} style={{
              padding:'8px 20px', border:`1.5px solid ${COR.azul}`, borderRadius:8,
              background:'#eff6ff', color:COR.azul, fontSize:13, fontWeight:600,
              cursor:'pointer', fontFamily:'inherit' }}>
              Ir para Original
            </button>
          </div>
        )}

        {(aba === 'previsto' || (aba === 'real' && realExiste)) && (
          <div style={{ display:'flex', flexDirection:'column', gap:6, paddingTop:4 }}>

            {/* â”€â”€ BANNER: sem planejamento criado â”€â”€ */}
            {aba === 'previsto' && !planoCriado && !quizAtivo && (
              <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px',
                background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:10,
                flexWrap:'wrap' as const }}>
                <span style={{ fontSize:13, fontWeight:600, color:'#92400e', flex:1, minWidth:200 }}>
                  Nenhum plano cadastrado â€” Selecione um mÃªs para definir seus valores.
                </span>
                <button onClick={() => setQuizAtivo(true)}
                  style={{ padding:'6px 14px', border:'none', borderRadius:8, cursor:'pointer',
                    fontFamily:'inherit', fontSize:12, fontWeight:600, color:'#fff',
                    background:'#d97706', whiteSpace:'nowrap' as const }}>
                  Usar assistente
                </button>
              </div>
            )}



            {/* â”€â”€ ACCORDION (revisÃ£o) / CARDS ou LISTA (fluxo de caixa) â”€â”€ */}
            {((aba as string) === 'revisao' ? MESES_FULL.map((nomeMes, mi) => {
              const aberto  = mesesAbertos.has(mi)
              const ehAtual = mi === mesAtual && anoAtual === anoCorrente
              const temReal = aba === 'real' && mesTemDadosReais[mi]
              const te = temReal ? totaisReais.te[mi] : totalEntradas[mi]
              const ts = temReal ? totaisReais.ts[mi] : totalSaidas[mi]
              const sf = temReal ? saldoFinalReal[mi] : saldoFinal[mi]
              const si = saldoInicialReal[mi]
              const bordaHeader = ehAtual ? COR.azul : COR.borda

              return (
                <div key={mi} ref={el => { mesRefs.current[mi] = el }} style={{ borderRadius:12,
                  borderTop:`1.5px solid ${aberto ? bordaHeader : COR.borda}`,
                  borderRight:`1.5px solid ${aberto ? bordaHeader : COR.borda}`,
                  borderBottom:`1.5px solid ${aberto ? bordaHeader : COR.borda}`,
                  borderLeft: aberto ? `4px solid ${ehAtual ? COR.azul : '#64748b'}` : `1.5px solid ${COR.borda}`,
                  transition:'border-color .15s, border-left-width .15s', background:COR.branco }}>

                  {/* â”€â”€ CABEÃ‡ALHO DO MÃŠS (sticky) â”€â”€ */}
                  <div onClick={() => toggleMes(mi)}
                    style={{ position:'sticky', top: stickyH, zIndex:10,
                      display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
                      cursor:'pointer',
                      background: ehAtual ? '#dbeafe' : '#f8fafc',
                      borderRadius: aberto ? '10px 10px 0 0' : 10,
                      borderBottom: aberto ? `1px solid ${COR.borda}` : 'none',
                      boxShadow:'0 2px 6px rgba(0,0,0,0.06)' }}>

                    {/* Nome do mÃªs */}
                    <div style={{ minWidth:96, display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                      <span style={{ fontSize:8, color: aberto ? COR.azul : COR.textoSuave,
                        display:'inline-block', transition:'transform .2s',
                        transform: aberto ? 'rotate(180deg)' : 'none' }}>â–¼</span>
                      <span style={{ fontSize:16, fontWeight:700,
                        color: ehAtual ? COR.azul : COR.texto }}>{nomeMes}</span>
                      {ehAtual && (
                        <span style={{ fontSize:8, background:COR.azul, color:'#fff',
                          padding:'1px 5px', borderRadius:10, fontWeight:700,
                          textTransform:'uppercase', letterSpacing:.3, flexShrink:0 }}>atual</span>
                      )}
                    </div>

                    {aberto ? (
                      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'flex-end', gap:6 }}>
                        {aba === 'real' && <>
                          <div style={{ padding:'3px 8px', fontSize:11, fontWeight:600, color:COR.textoSuave,
                            borderRadius:6, border:`1px solid ${COR.borda}`, textAlign:'center', minWidth:110 }}>Previsto</div>
                          <div style={{ padding:'3px 8px', fontSize:11, fontWeight:600, color:COR.textoSuave,
                            borderRadius:6, border:`1px solid ${COR.borda}`, textAlign:'center', minWidth:110 }}>Realizado</div>
                          <div style={{ padding:'3px 8px', fontSize:11, fontWeight:600, color:COR.textoSuave,
                            borderRadius:6, border:`1px solid ${COR.borda}`, textAlign:'center', minWidth:80 }}>VariaÃ§Ã£o</div>
                        </>}
                      </div>
                    ) : (
                      /* â”€â”€ FECHADO: saldo final â”€â”€ */
                      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'flex-end', gap:8 }}>
                        <span style={{ fontSize:11, color:COR.textoSuave }}>Saldo Final</span>
                        {aba === 'real' ? (
                          <>
                            <div style={{ padding:'2px 8px', fontSize:13, fontVariantNumeric:'tabular-nums', borderRadius:6, textAlign:'right', minWidth:90,
                              color:COR.textoSuave, background:'#f8fafc', border:'1px solid #e2e8f0' }}>
                              {saldoFinal[mi].toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                            </div>
                            <div style={{ padding:'2px 8px', fontSize:13, fontVariantNumeric:'tabular-nums', borderRadius:6, textAlign:'right', minWidth:90, fontWeight:700,
                              color: sf>=saldoFinal[mi] ? '#16a34a' : COR.vermelho,
                              background: sf>=saldoFinal[mi] ? '#f0fdf4' : '#fef2f2',
                              border:`1px solid ${sf>=saldoFinal[mi] ? '#bbf7d0' : '#fecaca'}` }}>
                              {sf.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                            </div>
                            <span style={{ minWidth:80, textAlign:'right', fontSize:13, fontVariantNumeric:'tabular-nums', fontWeight:600,
                              color:(sf-saldoFinal[mi])>0?'#16a34a':(sf-saldoFinal[mi])<0?COR.vermelho:COR.textoSuave }}>
                              {sf!==saldoFinal[mi]?((sf-saldoFinal[mi])>0?'+':'')+(sf-saldoFinal[mi]).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'â€”'}
                            </span>
                          </>
                        ) : (
                          <span style={{ fontSize:14, fontWeight:700,
                            color: caixaCor(sf).txt }}>
                            {sf.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* â”€â”€ CORPO DO MÃŠS (quando aberto) â”€â”€ */}
                  {aberto && (
                    <div style={{ borderTop:`1px solid ${COR.borda}`, display:'flex', flexDirection:'column', maxHeight:`calc(100svh - ${stickyH + 43}px)` }}>

                      {/* Saldo Inicial */}
                      <div style={{ flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between',
                        padding:'8px 24px 8px 16px', background:'#eff6ff', borderBottom:`1px solid ${COR.borda}` }}>
                        <span style={{ fontSize:13, color:COR.textoSuave }}>
                          Saldo Inicial{mi === 0 ? ' de Janeiro' : ` (Saldo Final de ${MESES[mi-1]})`}
                        </span>
                        {aba === 'real' ? (
                          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                            <div style={{ padding:'4px 8px', fontSize:13, borderRadius:6, textAlign:'right', minWidth:110,
                              color:COR.textoSuave, background:'#f8fafc', border:'1px solid #e2e8f0' }}>
                              {saldoInicialReal[mi] !== 0 ? saldoInicialReal[mi].toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : 'â€”'}
                            </div>
                            <div style={{ padding:'4px 8px', fontSize:13, borderRadius:6, textAlign:'right', minWidth:110, fontWeight:600,
                              color:COR.textoSuave, background:'#f8fafc', border:'1px solid #e2e8f0' }}>
                              {si.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                            </div>
                            <span style={{ minWidth:80, textAlign:'right', fontSize:13, fontVariantNumeric:'tabular-nums', fontWeight:600, color:COR.textoSuave }}>
                              â€”
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize:13, fontWeight:600, color:corSaldo(si), display:'flex', alignItems:'center', gap:6 }}>
                            {si.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                            {mesTemSaldoReal[mi] && (
                              <span style={{ fontSize:10, background:'#f0fdf4', color:'#16a34a',
                                border:'1px solid #bbf7d0', borderRadius:4, padding:'0 4px' }}>extrato</span>
                            )}
                          </span>
                        )}
                      </div>

                      {/* â”€â”€ ENTRADAS â”€â”€ */}
                      {(() => {
                        const entradasAberto = gruposAbertos.has(`${mi}-__entradas__`)
                        const entradasPrevistas = aba === 'real' ? entradasComHistorico : dadosAno.entradas
                        const teRealizado = aba === 'real'
                          ? entradasPrevistas.reduce((s, cat) => s + (lancadoPorCatMes[mi]?.entrada[cat.nome] ?? 0), 0)
                          : totalEntradas[mi]
                        const tePrevisto = totalEntradas[mi]
                        return (
                      <div style={{ flex: entradasAberto ? 1 : '0 0 auto', minHeight:0, display:'flex', flexDirection:'column',
                        margin:'4px 8px 2px 16px', borderRadius:8, border:'1px solid #86efac', overflow:'hidden' }}>
                        <div
                          onClick={() => toggleGrupo(mi, '__entradas__')}
                          style={{ flexShrink:0, fontSize:13, fontWeight:600, color:'#166534',
                            padding:'7px 16px 7px 12px', background:'#dcfce7',
                            borderBottom: entradasAberto ? '1px solid #bbf7d0' : 'none',
                            display:'flex', alignItems:'center', justifyContent:'space-between',
                            cursor:'pointer', userSelect:'none' }}>
                          <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ fontSize:9, display:'inline-block', transition:'transform .2s',
                              transform: entradasAberto ? 'rotate(180deg)' : 'none' }}>â–¼</span>
                            Receitas
                          </span>
                          {aba === 'real' ? (
                            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                              <div style={{ padding:'4px 8px', fontSize:13, borderRadius:6, textAlign:'right', minWidth:110,
                                color:'#166534', background:'rgba(255,255,255,0.5)', border:'1px solid #86efac' }}>
                                {tePrevisto>0 ? tePrevisto.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : 'â€”'}
                              </div>
                              <div style={{ padding:'4px 8px', fontSize:13, borderRadius:6, textAlign:'right', minWidth:110, fontWeight:700,
                                color: teRealizado>=tePrevisto ? '#166534' : '#b91c1c',
                                background: teRealizado>=tePrevisto ? 'rgba(255,255,255,0.7)' : 'rgba(254,202,202,0.5)',
                                border:`1px solid ${teRealizado>=tePrevisto ? '#4ade80' : '#fca5a5'}` }}>
                                {teRealizado>0 ? teRealizado.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : 'â€”'}
                              </div>
                              <span style={{ minWidth:80, textAlign:'right', fontSize:13, fontVariantNumeric:'tabular-nums', fontWeight:600,
                                color:(teRealizado-tePrevisto)>0?'#166534':'#166534', opacity:(teRealizado-tePrevisto)>0?1:.4 }}>
                                {(teRealizado-tePrevisto)>0
                                  ? `+${(teRealizado-tePrevisto).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}`
                                  : 'â€”'}
                              </span>
                            </div>
                          ) : (
                            <span>{te.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</span>
                          )}
                        </div>
                        {entradasAberto && <div style={{ overflowY:'auto', flex:1, minHeight:0, padding:'4px 8px 0' }}>
                        {(() => {
                          const entradasData = aba === 'real' ? entradasComHistorico : dadosAno.entradas
                          const getGrupoE = (cat: Cat) => {
                            const found = cat.id
                              ? (categorias.find(c => c.id === cat.id) ?? categorias.find(c => c.nome === cat.nome && c.tipo === 'entrada'))
                              : categorias.find(c => c.nome === cat.nome && c.tipo === 'entrada')
                            return found?.grupo ?? '__sem_grupo__'
                          }
                          const gruposUsadosE = new Set(entradasData.map(getGrupoE))
                          const gruposOrdenadosE = [
                            ...Array.from(gruposUsadosE).filter(g => g !== '__sem_grupo__').sort((a, b) => a.localeCompare(b, 'pt-BR')),
                            ...(gruposUsadosE.has('__sem_grupo__') ? ['__sem_grupo__'] : []),
                          ]
                          return gruposOrdenadosE.map(grupo => {
                            const catsGrupo = entradasData.map((cat, idx) => ({ cat, ri: idx })).filter(({ cat }) => getGrupoE(cat) === grupo)
                            const totalGrupo = aba === 'real'
                              ? catsGrupo.reduce((s, { cat }) => s + (lancadoPorCatMes[mi]?.entrada[cat.nome] ?? 0), 0)
                              : catsGrupo.reduce((s, { cat }) => s + cat.v[mi], 0)
                            const prevGrupoE = aba === 'real'
                              ? catsGrupo.reduce((s, { cat }) => s + (planoRef?.entradas?.find(c => c.nome === cat.nome)?.v[mi] ?? 0), 0)
                              : 0
                            const grupoAberto = gruposAbertos.has(`${mi}-E-${grupo}`)
                            return (
                              <div key={grupo} style={{ marginBottom:4, borderRadius:8, overflow:'hidden'}}>
                                <div onClick={() => toggleGrupo(mi, `E-${grupo}`)}
                                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                                    padding:'6px 8px', background:'#f1f5f9',
                                    borderBottom: grupoAberto ? '1px solid rgba(0,0,0,0.06)' : 'none',
                                    cursor:'pointer', userSelect:'none' }}>
                                  <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                                    <span style={{ fontSize:9, display:'inline-block', transition:'transform .2s',
                                      transform: grupoAberto ? 'rotate(180deg)' : 'none' }}>â–¼</span>
                                    <span style={{ fontSize:11, fontWeight:700, color:'#166534',
                                      textTransform:'uppercase', letterSpacing:.5 }}>
                                      {grupo === '__sem_grupo__' ? 'Outras' : grupo}
                                    </span>
                                  </span>
                                  {aba === 'real' ? (
                                    <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                                      <div style={{ padding:'4px 8px', fontSize:13, borderRadius:6, textAlign:'right', minWidth:110,
                                        color:'#16a34a', background:'rgba(255,255,255,0.6)', border:'1px solid #86efac' }}>
                                        {prevGrupoE>0 ? prevGrupoE.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : 'â€”'}
                                      </div>
                                      <div style={{ padding:'4px 8px', fontSize:13, borderRadius:6, textAlign:'right', minWidth:110, fontWeight:700,
                                        color: totalGrupo>=prevGrupoE ? '#16a34a' : '#b91c1c',
                                        background: totalGrupo>=prevGrupoE ? 'rgba(255,255,255,0.8)' : 'rgba(254,202,202,0.4)',
                                        border:`1px solid ${totalGrupo>=prevGrupoE ? '#4ade80' : '#fca5a5'}` }}>
                                        {totalGrupo>0 ? totalGrupo.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : 'â€”'}
                                      </div>
                                      <span style={{ minWidth:80, textAlign:'right', fontSize:13, fontVariantNumeric:'tabular-nums', fontWeight:600,
                                        color:(totalGrupo-prevGrupoE)>0?'#16a34a':COR.textoSuave,
                                        opacity:(totalGrupo-prevGrupoE)>0?1:.4 }}>
                                        {(totalGrupo-prevGrupoE)>0?`+${(totalGrupo-prevGrupoE).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}`:'â€”'}
                                      </span>
                                    </div>
                                  ) : (
                                    <span style={{ fontSize:13, fontWeight:600, color: totalGrupo > 0 ? '#16a34a' : COR.textoSuave }}>
                                      {totalGrupo > 0 ? totalGrupo.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : 'â€”'}
                                    </span>
                                  )}
                                </div>
                                {grupoAberto && (
                                  <>
                                    {catsGrupo.map(({ cat, ri }) => {
                                      const { icone, cor: corIcone } = iconeCategoria(categorias, cat.nome)
                                      const tm = (categorias.find(c => c.nome === cat.nome && c.tipo === 'entrada') ?? categorias.find(c => c.nome === cat.nome))?.tipoMovimento ?? cat.t
                                      const bm = tm ? BADGE_MOV[tm] : null
                                      const previsto = aba === 'real'
                                        ? ((planos[anoAtual] as AnoData | undefined)?.entradas.find(c => c.nome === cat.nome)?.v[mi] ?? 0)
                                        : 0
                                      const lancado = aba === 'real' ? (lancadoPorCatMes[mi]?.entrada[cat.nome] ?? 0) : 0
                                      const isInativa = !((cat.id ? (categorias.find(c => c.id === cat.id) ?? categorias.find(c => c.nome === cat.nome)) : categorias.find(c => c.nome === cat.nome))?.ativa ?? true)
                                      if (isInativa && aba === 'real' && previsto === 0 && lancado === 0) return null
                                      if (isInativa && aba !== 'real' && cat.v[mi] === 0) return null
                                      return (
                                        <div key={ri}
                                          onClick={!bloqueado && !isInativa ? () => iniciarValor('e', ri, mi, cat.v[mi]) : undefined}
                                          style={{ display:'flex', alignItems:'center', gap:8,
                                            padding:'5px 8px', borderBottom:'1px solid rgba(0,0,0,0.05)',
                                            cursor: !bloqueado && !isInativa ? 'pointer' : 'default' }}>
                                          <div style={{ width:22, height:22, borderRadius:6, background:corIcone,
                                            display:'flex', alignItems:'center', justifyContent:'center',
                                            fontSize:12, flexShrink:0 }}>{icone}</div>
                                          {aba === 'real'
                                            ? <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
                                                width:16, height:16, borderRadius:3, fontSize:9, fontWeight:700, flexShrink:0,
                                                background: bm?.bg ?? 'transparent', color: bm?.cor ?? 'transparent',
                                                visibility: bm ? 'visible' : 'hidden' }}>{bm?.label}</span>
                                            : bm && <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
                                                width:16, height:16, borderRadius:3, fontSize:9, fontWeight:700, flexShrink:0,
                                                background:bm.bg, color:bm.cor }}>{bm.label}</span>}
                                          <span onClick={e => { e.stopPropagation(); navigate('/configuracoes', { state:{ aba:'categorias', catNome:cat.nome } }) }}
                                            style={{ fontSize:13, color:COR.texto, cursor:'pointer',
                                              textDecoration:'none', flex:1, minWidth:140 }}
                                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color=COR.azul}
                                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color=COR.texto}>
                                            {cat.nome}
                                          </span>
                                          {aba === 'real' ? (
                                            <>
                                              <div style={{ padding:'4px 8px', textAlign:'right', fontSize:13, flexShrink:0,
                                                color: previsto === 0 ? '#c0cce0' : COR.texto, whiteSpace:'nowrap',
                                                borderRadius:6, minWidth:110, background:'#f8fafc', border:'1px solid #e2e8f0' }}>
                                                {previsto > 0 ? previsto.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : 'â€”'}
                                              </div>
                                              <div style={{ padding:'4px 8px', textAlign:'right', fontSize:13, flexShrink:0,
                                                fontWeight: lancado > 0 ? 600 : 400, whiteSpace:'nowrap', borderRadius:6, minWidth:110,
                                                color: lancado === 0 ? '#c0cce0' : lancado >= previsto ? '#16a34a' : COR.vermelho,
                                                background: lancado === 0 ? '#f8fafc' : lancado >= previsto ? '#f0fdf4' : '#fef2f2',
                                                border:`1px solid ${lancado === 0 ? '#e2e8f0' : lancado >= previsto ? '#bbf7d0' : '#fecaca'}` }}>
                                                {lancado > 0 ? lancado.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : 'â€”'}
                                              </div>
                                              {(() => {
                                                const ganhos = lancado - previsto
                                                return (
                                                  <span style={{ minWidth:80, textAlign:'right', flexShrink:0, fontSize:12, fontWeight: ganhos > 0 ? 600 : 400,
                                                    color: ganhos > 0 ? '#16a34a' : COR.textoSuave }}>
                                                    {ganhos > 0 ? `+${ganhos.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}` : 'â€”'}
                                                  </span>
                                                )
                                              })()}
                                            </>
                                          ) : (
                                            <>
                                              <div style={{ flex:1 }}/>
                                              {renderValor('e', ri, mi, cat.v[mi])}
                                              {!bloqueado && mi < 11 && (
                                                <select defaultValue=""
                                                  onChange={e => { e.stopPropagation(); replicarLinhaMes('e', ri, mi, parseInt(e.target.value));(e.target as HTMLSelectElement).value='' }}
                                                  onClick={e => e.stopPropagation()}
                                                  style={{ border:'1px solid #cbd5e1', background:'#f1f5f9', cursor:'pointer',
                                                    borderRadius:4, padding:'1px 2px', fontSize:9, color:COR.textoSuave,
                                                    fontWeight:700, fontFamily:'inherit', flexShrink:0 }}>
                                                  <option value="">â†’</option>
                                                  {MESES.slice(mi + 1).map((mes, idx) => (
                                                    <option key={idx} value={String(mi + 1 + idx)}>{mes}</option>
                                                  ))}
                                                </select>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </>
                                )}
                              </div>
                            )
                          })
                        })()}
                        {dadosAno.entradas.length === 0 && (
                          <div style={{ fontSize:12, color:COR.textoSuave, padding:'8px 0' }}>
                            Nenhuma categoria de entrada.
                          </div>
                        )}
                        <div style={{ padding:'6px 0' }}>
                          <button onClick={() => navigate('/configuracoes', { state:{ aba:'categorias' } })}
                            style={{ border:'1px dashed #93c5fd', background:'transparent',
                              borderRadius:6, padding:'3px 10px', cursor:'pointer',
                              fontSize:11, color:COR.azul, fontFamily:'inherit' }}>
                            + Categoria de entrada
                          </button>
                        </div>
                        </div>}{/* fecha padding interno condicional */}
                      </div>
                        )
                      })()}

                      {/* â”€â”€ SAÃDAS â”€â”€ */}
                      {(() => {
                        const saidasAberto = gruposAbertos.has(`${mi}-__saidas__`)
                        const saidasPrevistas = aba === 'real' ? saidasComHistorico : dadosAnoFinal.saidas
                        const tsRealizado = aba === 'real'
                          ? saidasPrevistas.reduce((s, cat) => {
                              if (nomeFaturaCartao(cat.nome, cartaoNomes)) return s
                              return s + (lancadoPorCatMes[mi]?.saida[cat.nome] ?? 0)
                            }, 0)
                          : totalSaidas[mi]
                        const tsPrevisto = totalSaidas[mi]
                        return (
                      <div style={{ flex: saidasAberto ? 1 : '0 0 auto', minHeight:0, display:'flex', flexDirection:'column',
                        margin:'2px 8px 4px 16px', borderRadius:8, border:'1px solid #fca5a5', overflow:'hidden' }}>
                        <div onClick={() => toggleGrupo(mi, '__saidas__')}
                          style={{ flexShrink:0, fontSize:13, fontWeight:600, color:'#7f1d1d',
                          padding:'7px 16px 7px 12px', background:'#fee2e2',
                          borderBottom: saidasAberto ? '1px solid #fecaca' : 'none', display:'flex',
                          alignItems:'center', justifyContent:'space-between',
                          cursor:'pointer', userSelect:'none' }}>
                          <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ fontSize:9, display:'inline-block', transition:'transform .2s',
                              transform: saidasAberto ? 'rotate(180deg)' : 'none' }}>â–¼</span>
                            Despesas
                          </span>
                          {aba === 'real' ? (
                            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                              <div style={{ padding:'4px 8px', fontSize:13, borderRadius:6, textAlign:'right', minWidth:110,
                                color:'#7f1d1d', background:'rgba(255,255,255,0.5)', border:'1px solid #fca5a5' }}>
                                {totalSaidas[mi]>0 ? totalSaidas[mi].toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : 'â€”'}
                              </div>
                              <div style={{ padding:'4px 8px', fontSize:13, borderRadius:6, textAlign:'right', minWidth:110, fontWeight:700,
                                color: tsRealizado<=tsPrevisto ? '#166534' : '#7f1d1d',
                                background: tsRealizado<=tsPrevisto ? 'rgba(220,252,231,0.6)' : 'rgba(255,255,255,0.7)',
                                border:`1px solid ${tsRealizado<=tsPrevisto ? '#86efac' : '#fca5a5'}` }}>
                                {tsRealizado>0 ? tsRealizado.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : 'â€”'}
                              </div>
                              <span style={{ minWidth:80, textAlign:'right', fontSize:13, fontVariantNumeric:'tabular-nums', fontWeight:600,
                                color:(tsPrevisto-tsRealizado)>0?'#166534':(tsPrevisto-tsRealizado)<0?'#7f1d1d':'#6b7280' }}>
                                {tsPrevisto!==tsRealizado
                                  ? ((tsPrevisto-tsRealizado)>0?'+':'')+(tsPrevisto-tsRealizado).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
                                  : 'â€”'}
                              </span>
                            </div>
                          ) : (
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              {te > 0 && ts > 0 && (
                                <span style={{ fontSize:12, fontWeight:400, color:'#b91c1c' }}>
                                  {((ts / te) * 100).toFixed(0)}% da entrada
                                </span>
                              )}
                              <span>{ts.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</span>
                            </div>
                          )}
                        </div>
                        {saidasAberto && <div style={{ overflowY:'auto', flex:1, minHeight:0, padding:'4px 8px 0' }}>
                        {aba === 'previsto' ? (() => {
                          const saidasPlan = dadosAnoFinal.saidas
                          const getGrupo = (cat: Cat) =>
                            nomeFaturaCartao(cat.nome, cartaoNomes) ? 'CartÃ£o de CrÃ©dito' :
                            ((cat.id ? (categorias.find(c => c.id === cat.id) ?? categorias.find(c => c.nome === cat.nome)) : categorias.find(c => c.nome === cat.nome))?.grupo ?? '__sem_grupo__')
                          const gruposUsados = new Set(saidasPlan.map(getGrupo))
                          const gruposOrdenados = [
                            ...Array.from(gruposUsados).filter(g => g !== '__sem_grupo__').sort((a, b) => a.localeCompare(b, 'pt-BR')),
                            ...(gruposUsados.has('__sem_grupo__') ? ['__sem_grupo__'] : []),
                          ]
                          return gruposOrdenados.map(grupo => {
                            const catsGrupo = saidasPlan.map((cat, idx) => ({ cat, ri: idx })).filter(({ cat }) => getGrupo(cat) === grupo)
                            const totalGrupo = catsGrupo.reduce((s, { cat }) => s + cat.v[mi], 0)
                            const pctGrupo = te > 0 ? (totalGrupo / te) * 100 : 0
                            const grupoAberto = gruposAbertos.has(`${mi}-${grupo}`)
                            return (
                              <div key={grupo} style={{ marginBottom:4, borderRadius:8, overflow:'hidden'}}>
                                <div
                                  onClick={() => toggleGrupo(mi, grupo)}
                                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                                    padding:'6px 8px', background:'#f1f5f9',
                                    borderBottom: grupoAberto ? '1px solid rgba(0,0,0,0.06)' : 'none',
                                    cursor:'pointer', userSelect:'none' }}>
                                  <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                                    <span style={{ fontSize:9, display:'inline-block', transition:'transform .2s',
                                      transform: grupoAberto ? 'rotate(180deg)' : 'none' }}>â–¼</span>
                                    <span style={{ fontSize:11, fontWeight:700, color:COR.azulEscuro,
                                      textTransform:'uppercase', letterSpacing:.5 }}>
                                      {grupo === '__sem_grupo__' ? 'Outras' : grupo}
                                    </span>
                                  </span>
                                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                    {te > 0 && (
                                      <span style={{ fontSize:12, color:COR.textoSuave }}>
                                        {pctGrupo.toFixed(0)}% da entrada
                                      </span>
                                    )}
                                    <span style={{ fontSize:13, fontWeight:600, color: totalGrupo > 0 ? COR.vermelho : COR.textoSuave }}>
                                      {totalGrupo > 0 ? totalGrupo.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : 'â€”'}
                                    </span>
                                  </div>
                                </div>
                                {grupoAberto && catsGrupo.map(({ cat, ri }) => {
                                  const { icone, cor: corIcone } = iconeCategoria(categorias, cat.nome)
                                  const tm = (categorias.find(c => c.nome === cat.nome && c.tipo === 'saida') ?? categorias.find(c => c.nome === cat.nome))?.tipoMovimento ?? cat.t
                                  const bm = tm ? BADGE_MOV[tm] : null
                                  const ehFatura = nomeFaturaCartao(cat.nome, cartaoNomes)
                                  const isInativa = !((cat.id ? (categorias.find(c => c.id === cat.id) ?? categorias.find(c => c.nome === cat.nome)) : categorias.find(c => c.nome === cat.nome))?.ativa ?? true)
                                  if (isInativa && cat.v[mi] === 0) return null
                                  return (
                                    <div key={ri}
                                      onClick={!bloqueado && !ehFatura && !isInativa ? () => iniciarValor('s', ri, mi, cat.v[mi]) : undefined}
                                      style={{ display:'flex', alignItems:'center', gap:8,
                                        padding:'5px 8px', borderBottom:'1px solid rgba(0,0,0,0.05)',
                                        cursor: !bloqueado && !ehFatura && !isInativa ? 'pointer' : 'default' }}>
                                      <div style={{ width:22, height:22, borderRadius:6, background:corIcone,
                                        display:'flex', alignItems:'center', justifyContent:'center',
                                        fontSize:12, flexShrink:0 }}>{icone}</div>
                                      {bm && <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
                                          width:16, height:16, borderRadius:3, fontSize:9, fontWeight:700, flexShrink:0,
                                          background:bm.bg, color:bm.cor }}>{bm.label}</span>}
                                      <span onClick={e => { e.stopPropagation(); navigate('/configuracoes', { state:{ aba:'categorias', catNome:cat.nome } }) }}
                                        style={{ fontSize:13, color: ehFatura ? '#7c3aed' : COR.texto,
                                          cursor:'pointer', flexShrink:0, minWidth:140 }}
                                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color=COR.azul}
                                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = ehFatura ? '#7c3aed' : COR.texto}>
                                        {cat.nome}
                                        {ehFatura && <span style={{ fontSize:10, color:'#c4b5fd', marginLeft:4 }}>(auto)</span>}
                                      </span>
                                      <div style={{ flex:1 }}/>
                                      {renderValor('s', ri, mi, cat.v[mi], ehFatura)}
                                      {!bloqueado && !ehFatura && mi < 11 && (
                                        <select defaultValue=""
                                          onChange={e => { e.stopPropagation(); replicarLinhaMes('s', ri, mi, parseInt(e.target.value));(e.target as HTMLSelectElement).value='' }}
                                          onClick={e => e.stopPropagation()}
                                          style={{ border:'1px solid #cbd5e1', background:'#f1f5f9', cursor:'pointer',
                                            borderRadius:4, padding:'1px 2px', fontSize:9, color:COR.textoSuave,
                                            fontWeight:700, fontFamily:'inherit', flexShrink:0 }}>
                                          <option value="">â†’</option>
                                          {MESES.slice(mi + 1).map((mes, idx) => (
                                            <option key={idx} value={String(mi + 1 + idx)}>{mes}</option>
                                          ))}
                                        </select>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )
                          })
                        })() : (() => {
                          const saidasReal = saidasComHistorico
                          const getGrupoR = (cat: Cat) =>
                            nomeFaturaCartao(cat.nome, cartaoNomes) ? 'CartÃ£o de CrÃ©dito' :
                            ((cat.id ? (categorias.find(c => c.id === cat.id) ?? categorias.find(c => c.nome === cat.nome)) : categorias.find(c => c.nome === cat.nome))?.grupo ?? '__sem_grupo__')
                          const gruposUsadosR = new Set(saidasReal.map(getGrupoR))
                          const gruposOrdenadosR = [
                            ...Array.from(gruposUsadosR).filter(g => g !== '__sem_grupo__').sort((a, b) => a.localeCompare(b, 'pt-BR')),
                            ...(gruposUsadosR.has('__sem_grupo__') ? ['__sem_grupo__'] : []),
                          ]
                          return gruposOrdenadosR.map(grupo => {
                            const catsGrupoR = saidasReal.map((cat, idx) => ({ cat, ri: idx })).filter(({ cat }) => getGrupoR(cat) === grupo)
                            const totalLancGrupo = catsGrupoR.reduce((s, { cat }) => {
                              if (nomeFaturaCartao(cat.nome, cartaoNomes))
                                return s + Object.values(lancadoFaturaConsolidadaMesCat[mi] ?? {}).reduce((sv, v) => sv + v, 0)
                              return s + (lancadoPorCatMes[mi]?.saida[cat.nome] ?? 0)
                            }, 0)
                            const grupoAberto = gruposAbertos.has(`${mi}-${grupo}`)
                            const prevLancGrupo = catsGrupoR.reduce((s, { cat }) => {
                              if (nomeFaturaCartao(cat.nome, cartaoNomes)) return s + limiteCartaoPorMes[mi]
                              return s + Math.abs((planos[anoAtual] as AnoData | undefined)?.saidas.find(c => c.nome === cat.nome)?.v[mi] ?? 0)
                            }, 0)
                            return (
                              <div key={grupo} style={{ marginBottom:4, borderRadius:8, overflow:'hidden'}}>
                                <div
                                  onClick={() => toggleGrupo(mi, grupo)}
                                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                                    padding:'6px 8px', background:'#f1f5f9',
                                    borderBottom: grupoAberto ? '1px solid rgba(0,0,0,0.06)' : 'none',
                                    cursor:'pointer', userSelect:'none' }}>
                                  <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                                    <span style={{ fontSize:9, display:'inline-block', transition:'transform .2s',
                                      transform: grupoAberto ? 'rotate(180deg)' : 'none' }}>â–¼</span>
                                    <span style={{ fontSize:11, fontWeight:700, color:COR.azulEscuro,
                                      textTransform:'uppercase', letterSpacing:.5 }}>
                                      {grupo === '__sem_grupo__' ? 'Outras' : grupo}
                                    </span>
                                  </span>
                                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                                    <div style={{ padding:'4px 8px', fontSize:13, borderRadius:6, textAlign:'right', minWidth:110,
                                      color:COR.vermelho, background:'rgba(255,255,255,0.6)', border:'1px solid #fca5a5' }}>
                                      {prevLancGrupo>0 ? prevLancGrupo.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : 'â€”'}
                                    </div>
                                    <div style={{ padding:'4px 8px', fontSize:13, borderRadius:6, textAlign:'right', minWidth:110, fontWeight:700,
                                      color: totalLancGrupo<=prevLancGrupo ? '#16a34a' : COR.vermelho,
                                      background: totalLancGrupo<=prevLancGrupo ? 'rgba(220,252,231,0.5)' : 'rgba(255,255,255,0.7)',
                                      border:`1px solid ${totalLancGrupo<=prevLancGrupo ? '#86efac' : '#fca5a5'}` }}>
                                      {totalLancGrupo>0 ? totalLancGrupo.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : 'â€”'}
                                    </div>
                                    <span style={{ minWidth:80, textAlign:'right', fontSize:13, fontVariantNumeric:'tabular-nums', fontWeight:600,
                                      color:(prevLancGrupo-totalLancGrupo)>0?'#16a34a':(prevLancGrupo-totalLancGrupo)<0?COR.vermelho:COR.textoSuave }}>
                                      {prevLancGrupo!==totalLancGrupo?((prevLancGrupo-totalLancGrupo)>0?'+':'')+(prevLancGrupo-totalLancGrupo).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'â€”'}
                                    </span>
                                  </div>
                                </div>
                                {grupoAberto && (
                                  <>
                                    {catsGrupoR.map(({ cat, ri }) => {
                                      const { icone, cor: corIcone } = iconeCategoria(categorias, cat.nome)
                                      const tm = (categorias.find(c => c.nome === cat.nome && c.tipo === 'saida') ?? categorias.find(c => c.nome === cat.nome))?.tipoMovimento ?? cat.t
                                      const bm = tm ? BADGE_MOV[tm] : null
                                      const ehFatura = nomeFaturaCartao(cat.nome, cartaoNomes)
                                      const previsto = (planos[anoAtual] as AnoData | undefined)?.saidas.find(c => c.nome === cat.nome)?.v[mi] ?? 0
                                      const totalCartaoConsolidado = ehFatura
                                        ? Object.values(lancadoFaturaConsolidadaMesCat[mi] ?? {}).reduce((sv, v) => sv + v, 0)
                                        : 0
                                      const lancado = ehFatura
                                        ? (lancadoPorCatMes[mi]?.saida[cat.nome] ?? 0) + totalCartaoConsolidado
                                        : (lancadoPorCatMes[mi]?.saida[cat.nome] ?? 0)
                                      const isInativa = !((cat.id ? (categorias.find(c => c.id === cat.id) ?? categorias.find(c => c.nome === cat.nome)) : categorias.find(c => c.nome === cat.nome))?.ativa ?? true)
                                      if (isInativa && previsto === 0 && lancado === 0) return null
                                      const prevAbs = ehFatura ? limiteCartaoPorMes[mi] : Math.abs(previsto)
                                      const lancadoDisplay = ehFatura ? totalCartaoConsolidado : lancado
                                      const dentro = lancadoDisplay < 0 ? true : (prevAbs > 0 ? lancadoDisplay <= prevAbs : false)
                                      const disponivel = prevAbs - lancadoDisplay
                                      return (
                                        <div key={ri} style={{ display:'flex', alignItems:'center', gap:8,
                                          padding:'5px 8px', borderBottom:'1px solid rgba(0,0,0,0.05)' }}>
                                          <div style={{ width:22, height:22, borderRadius:6, background:corIcone,
                                            display:'flex', alignItems:'center', justifyContent:'center',
                                            fontSize:12, flexShrink:0 }}>{icone}</div>
                                          <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
                                              width:16, height:16, borderRadius:3, fontSize:9, fontWeight:700, flexShrink:0,
                                              background: bm?.bg ?? 'transparent', color: bm?.cor ?? 'transparent',
                                              visibility: bm ? 'visible' : 'hidden' }}>{bm?.label}</span>
                                          <span onClick={() => navigate('/configuracoes', { state:{ aba:'categorias', catNome:cat.nome } })}
                                            style={{ fontSize:13, color: ehFatura ? '#7c3aed' : COR.texto,
                                              cursor:'pointer', flex:1, minWidth:140 }}
                                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color=COR.azul}
                                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = ehFatura ? '#7c3aed' : COR.texto}>
                                            {cat.nome}
                                            {ehFatura && <span style={{ fontSize:10, color:'#c4b5fd', marginLeft:4 }}>(auto)</span>}
                                          </span>
                                          <div style={{ padding:'4px 8px', textAlign:'right', fontSize:13, flexShrink:0,
                                            color: prevAbs === 0 ? '#c0cce0' : COR.texto, whiteSpace:'nowrap',
                                            borderRadius:6, minWidth:110, background:'#f8fafc', border:'1px solid #e2e8f0' }}>
                                            {prevAbs > 0 ? prevAbs.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : 'â€”'}
                                          </div>
                                          <div onClick={() => !ehFatura && lancadoDisplay !== 0 && setModalCatReal({ nome: cat.nome, mi })}
                                            style={{ padding:'4px 8px', textAlign:'right', fontSize:13, flexShrink:0,
                                              fontWeight: lancadoDisplay !== 0 ? 600 : 400, whiteSpace:'nowrap', borderRadius:6, minWidth:110,
                                              cursor: !ehFatura && lancadoDisplay !== 0 ? 'pointer' : 'default',
                                              color: lancadoDisplay === 0 ? '#c0cce0' : (lancadoDisplay < 0 || dentro) ? '#16a34a' : COR.vermelho,
                                              background: lancadoDisplay === 0 ? '#f8fafc' : (lancadoDisplay < 0 || dentro) ? '#f0fdf4' : '#fef2f2',
                                              border:`1px solid ${lancadoDisplay === 0 ? '#e2e8f0' : (lancadoDisplay < 0 || dentro) ? '#bbf7d0' : '#fecaca'}` }}>
                                            {lancadoDisplay !== 0 ? lancadoDisplay.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : 'â€”'}
                                          </div>
                                          <span style={{ minWidth:80, textAlign:'right', flexShrink:0, fontSize:12, fontWeight: (prevAbs > 0 || lancadoDisplay !== 0) ? 600 : 400,
                                            color: disponivel > 0 ? '#16a34a' : disponivel < 0 ? COR.vermelho : COR.textoSuave }}>
                                            {(prevAbs > 0 || lancadoDisplay !== 0) ? disponivel.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : 'â€”'}
                                          </span>
                                        </div>
                                      )
                                    })}
                                  </>
                                )}
                              </div>
                            )
                          })
                        })()}
                        {dadosAnoFinal.saidas.length === 0 && (
                          <div style={{ fontSize:12, color:COR.textoSuave, padding:'8px 0' }}>
                            Nenhuma categoria de saÃ­da.
                          </div>
                        )}
                        <div style={{ padding:'6px 0' }}>
                          <button onClick={() => navigate('/configuracoes', { state:{ aba:'categorias' } })}
                            style={{ border:'1px dashed #fca5a5', background:'transparent',
                              borderRadius:6, padding:'3px 10px', cursor:'pointer',
                              fontSize:11, color:'#be123c', fontFamily:'inherit' }}>
                            + Categoria de saÃ­da
                          </button>
                        </div>
                        </div>}{/* fecha padding interno saidas */}
                      </div>
                        )
                      })()}

                      {/* Saldo Final */}
                      <div style={{ flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between',
                        padding:'8px 24px 8px 16px', borderTop:`1px solid ${COR.borda}`, background:'#f8faff' }}>
                        <span style={{ fontSize:13, color:COR.textoSuave }}>Saldo Final</span>
                        {aba === 'real' ? (
                          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                            <div style={{ padding:'4px 8px', fontSize:13, borderRadius:6, textAlign:'right', minWidth:110,
                              color:COR.textoSuave, background:'#f8fafc', border:'1px solid #e2e8f0' }}>
                              {saldoFinal[mi].toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                            </div>
                            <div style={{ padding:'4px 8px', fontSize:13, borderRadius:6, textAlign:'right', minWidth:110, fontWeight:600,
                              color: sf>=saldoFinal[mi] ? '#16a34a' : COR.vermelho,
                              background: sf>=saldoFinal[mi] ? '#f0fdf4' : '#fef2f2',
                              border:`1px solid ${sf>=saldoFinal[mi] ? '#bbf7d0' : '#fecaca'}` }}>
                              {sf.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                            </div>
                            <span style={{ minWidth:80, textAlign:'right', fontSize:13, fontVariantNumeric:'tabular-nums', fontWeight:600,
                              color:(sf-saldoFinal[mi])>0?'#16a34a':(sf-saldoFinal[mi])<0?COR.vermelho:COR.textoSuave }}>
                              {sf!==saldoFinal[mi]?((sf-saldoFinal[mi])>0?'+':'')+(sf-saldoFinal[mi]).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'â€”'}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize:13, fontWeight:600, color:corSaldo(sf) }}>
                            {sf.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                          </span>
                        )}
                      </div>


                    </div>
                  )}
                </div>
              )
            }) : viewMode === 'grade' ? (() => {
              const teAnual = aba === 'real' ? totaisReais.te.reduce((a,b)=>a+b,0) : totalEntradas.reduce((a,b)=>a+b,0)
              const tsAnual = aba === 'real' ? totaisReais.ts.reduce((a,b)=>a+b,0) : totalSaidas.reduce((a,b)=>a+b,0)
              const siAnual = aba === 'real' ? saldoInicialReal[0] : saldoInicial[0]
              const sfAnual = aba === 'real' ? saldoFinalReal[11]  : saldoFinal[11]
              const fmtG = (v: number) => v === 0 ? 'â€”' : v.toLocaleString('pt-BR', {minimumFractionDigits:0, maximumFractionDigits:0})
              return (
              <>
              {/* Resumo anual â€” grade 4 colunas â€” somente mobile (desktop usa banner) */}
              {isMobile && (
              <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1px',
                background:COR.borda, borderRadius:14, overflow:'hidden', marginBottom:16,
                boxShadow:'0 1px 3px rgba(0,0,0,.05)'}}>
                {([
                  {label:'ðŸ’° Saldo inicial',        val:siAnual, cor:COR.texto},
                  {label:'â†— Receitas do ano',     val:teAnual, cor:COR.verde},
                  {label:'â†™ Despesas do ano',     val:tsAnual, cor:COR.vermelho},
                  {label:'ðŸŽ¯ Resultado em Dez',   val:sfAnual, cor:sfAnual>0?COR.verde:sfAnual<0?COR.vermelho:COR.textoSuave},
                ] as {label:string;val:number;cor:string}[]).map((item,idx) => (
                  <div key={idx} style={{background:COR.branco, padding:'14px 16px'}}>
                    <div style={{fontSize:10, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:.4, color:COR.textoSuave, marginBottom:4}}>{item.label}</div>
                    <div style={{fontSize:18, fontWeight:800, fontVariantNumeric:'tabular-nums' as const, color:item.cor}}>{fmtG(item.val)}</div>
                  </div>
                ))}
              </div>
              )}

              {/* Grade de 12 meses â€” 6 colunas */}
              <div style={{display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:10}}>
                {MESES_FULL.map((nomeMes, mi) => {
                  const ehAtual = mi === mesAtual && anoAtual === anoCorrente
                  const temReal = aba === 'real' && mesTemDadosReais[mi]
                  const te      = temReal ? totaisReais.te[mi] : totalEntradas[mi]
                  const ts      = temReal ? totaisReais.ts[mi] : totalSaidas[mi]
                  const sfVal   = temReal ? saldoFinalReal[mi] : saldoFinal[mi]
                  const res     = te - ts
                  const pct     = te > 0 ? Math.min(100, Math.round(ts / te * 100)) : (ts > 0 ? 100 : 0)
                  const stripBg = ehAtual ? COR.azul : sfVal > 0 ? '#22c55e' : '#f87171'
                  const sfPos   = sfVal >= 0
                  return (
                    <div key={mi}
                      onClick={() => setModalMes(mi)}
                      style={{background:COR.branco, borderRadius:14, overflow:'hidden', cursor:'pointer',
                        border:ehAtual ? `2px solid ${COR.azul}` : `1.5px solid ${COR.borda}`,
                        display:'flex', flexDirection:'column' as const,
                        transition:'box-shadow .15s, border-color .15s'}}
                      onMouseEnter={e => { const d=e.currentTarget as HTMLDivElement; d.style.boxShadow='0 4px 16px rgba(37,99,235,.12)'; d.style.borderColor='#93c5fd' }}
                      onMouseLeave={e => { const d=e.currentTarget as HTMLDivElement; d.style.boxShadow=''; d.style.borderColor=ehAtual?COR.azul:COR.borda }}>

                      {/* Strip topo */}
                      <div style={{height:4, background:stripBg, flexShrink:0}}/>

                      <div style={{padding:'10px 12px 12px', flex:1, display:'flex', flexDirection:'column' as const, justifyContent:'space-between' as const}}>
                        <div>
                          {/* Header */}
                          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10}}>
                            <span style={{fontSize:13, fontWeight:700, color:ehAtual?COR.azul:COR.texto}}>{nomeMes}</span>
                            {ehAtual && <span style={{fontSize:7, background:COR.azul, color:'#fff', padding:'2px 5px', borderRadius:6, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:.4}}>Atual</span>}
                          </div>

                          {/* â†‘ Vai entrar */}
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:4}}>
                            <span style={{fontSize:11, fontWeight:600, color:COR.verde}}>Receitas</span>
                            <span style={{fontSize:12, fontWeight:700, color:COR.verde, fontVariantNumeric:'tabular-nums' as const}}>{fmtG(te)}</span>
                          </div>

                          {/* â†“ Vai sair */}
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
                            <span style={{fontSize:11, fontWeight:600, color:COR.vermelho}}>Despesas</span>
                            <span style={{fontSize:12, fontWeight:700, color:COR.vermelho, fontVariantNumeric:'tabular-nums' as const}}>{fmtG(ts)}</span>
                          </div>

                          {/* = Resultado */}
                          <div style={{borderTop:`1px solid ${COR.borda}`, paddingTop:6, marginTop:2,
                            display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
                            <span style={{fontSize:10, color:COR.textoSuave, fontWeight:500}}>= Resultado</span>
                            <span style={{fontSize:12, fontWeight:800, fontVariantNumeric:'tabular-nums' as const,
                              color:res>0?COR.verde:res<0?COR.vermelho:COR.textoSuave}}>
                              {res===0?'â€”':(res>0?'+':'')+fmtG(Math.abs(res))}
                            </span>
                          </div>
                        </div>

                        {/* Footer */}
                        <div style={{marginTop:8}}>
                          {/* Barra progresso */}
                          <div style={{height:4, background:'#f1f5f9', borderRadius:3, overflow:'hidden', display:'flex', marginBottom:8}}>
                            <div style={{background:'#f87171', width:`${pct}%`, transition:'width .4s'}}/>
                            {te > 0 && <div style={{flex:1, background:'#22c55e'}}/>}
                          </div>

                          {/* Quanto terÃ¡ guardado */}
                          <div style={{borderRadius:9, padding:'7px 8px', textAlign:'center' as const,
                            background:sfPos?'#f0fdf4':'#fef2f2',
                            border:`1.5px solid ${sfPos?'#bbf7d0':'#fecaca'}`}}>
                            <div style={{fontSize:8, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:.5, marginBottom:2,
                              color:sfPos?COR.verde:COR.vermelho}}>Saldo previsto</div>
                            <div style={{fontSize:14, fontWeight:800, fontVariantNumeric:'tabular-nums' as const,
                              color:sfPos?COR.verde:COR.vermelho}}>{fmtG(sfVal)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              </>
              )
            })() : viewMode === 'horizontal' ? (() => {

              /* â”€â”€ PLANILHA â€” tabela com meses em colunas, resumos no topo â”€â”€ */
              const fmtH = (v: number) => v === 0 ? 'â€”' : v.toLocaleString('pt-BR', {minimumFractionDigits:0, maximumFractionDigits:0})
              const cartNomesH = new Set(contas.filter(c => c.tipo === 'cartao').map(c => c.nome.toLowerCase()))
              const getGrupoE = (cat: Cat) =>
                (cat.id ? (categorias.find(c => c.id === cat.id) ?? categorias.find(c => c.nome === cat.nome)) : categorias.find(c => c.nome === cat.nome))?.grupo ?? 'Outros'
              const getGrupoS = (cat: Cat) =>
                nomeFaturaCartao(cat.nome, cartNomesH) ? 'CartÃ£o de CrÃ©dito'
                : ((cat.id ? (categorias.find(c => c.id === cat.id) ?? categorias.find(c => c.nome === cat.nome)) : categorias.find(c => c.nome === cat.nome))?.grupo ?? 'Outros')
              const groupByH = (cats: Cat[], fn: (c: Cat) => string): [string, Cat[]][] => {
                const m = new Map<string, Cat[]>()
                cats.forEach(c => { const g = fn(c); if (!m.has(g)) m.set(g, []); m.get(g)!.push(c) })
                return [...m.entries()].sort(([a],[b]) => a==='__sem_grupo__'?1:b==='__sem_grupo__'?-1:a.localeCompare(b,'pt-BR'))
              }
              const toggleH = (k: string) => setGruposHorizAbertos(prev => {
                const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n
              })
              const gruposEP = groupByH(dadosAnoFinal.entradas, getGrupoE)
              const gruposSP = groupByH(dadosAnoFinal.saidas, getGrupoS)
              const ehAtualMes = (mi: number) => mi === mesAtual && anoAtual === anoCorrente

              const thStyle = (mi?: number): React.CSSProperties => ({
                position:'sticky' as const, top:0, zIndex:10,
                background: (mi !== undefined && ehAtualMes(mi)) ? '#eff6ff' : '#f8fafc',
                padding:10, fontSize:10, fontWeight:700,
                textTransform:'uppercase' as const, letterSpacing:.5,
                color: (mi !== undefined && ehAtualMes(mi)) ? COR.azul : COR.textoSuave,
                borderBottom:`2px solid ${COR.borda}`, textAlign:'right' as const,
                whiteSpace:'nowrap' as const,
              })

              const renderValorH = (tipo: 'e'|'s', row: number, mes: number, valor: number, readOnly = false) => {
                const ativo = editando?.tipo === tipo && editando.row === row && editando.mes === mes
                if (ativo && !bloqueado && !readOnly) {
                  return (
                    <input autoFocus value={valorTemp}
                      onChange={e => setValorTemp(e.target.value)}
                      onFocus={e => e.target.select()}
                      onBlur={() => { if (skipBlurRef.current) { skipBlurRef.current = false } else { confirmarValorH() } }}
                      onKeyDown={e => {
                        if (e.key === 'Enter')  { skipBlurRef.current = true; confirmarValorH() }
                        if (e.key === 'Tab')    { e.preventDefault(); skipBlurRef.current = true; confirmarValorH(mes + 1) }
                        if (e.key === 'Escape') { setEditando(null) }
                      }}
                      style={{ width:'100%', padding:'3px 7px', textAlign:'right' as const,
                        border:`1.5px solid ${COR.azul}`, outline:'none',
                        background:'#dbeafe', color:COR.azulEscuro, fontSize:12,
                        fontFamily:'inherit', fontWeight:600, borderRadius:4, boxSizing:'border-box' as const }} />
                  )
                }
                const corVal = readOnly ? (valor === 0 ? '#c4b5fd' : '#7c3aed') : (valor === 0 ? '#c0cce0' : '#475569')
                return (
                  <span
                    onClick={readOnly || bloqueado ? undefined : () => iniciarValor(tipo, row, mes, valor)}
                    style={{padding:'3px 7px', borderRadius:6, cursor: readOnly || bloqueado ? 'default' : 'pointer',
                      display:'inline-block', minWidth:60, textAlign:'right' as const,
                      fontVariantNumeric:'tabular-nums' as const, transition:'background .15s', color: corVal}}
                    onMouseEnter={e => { if (!readOnly && !bloqueado) { const el=e.currentTarget as HTMLSpanElement; el.style.background='#eff6ff'; el.style.color=COR.azul } }}
                    onMouseLeave={e => { if (!readOnly && !bloqueado) { const el=e.currentTarget as HTMLSpanElement; el.style.background=''; el.style.color=corVal } }}>
                    {fmtH(valor)}
                  </span>
                )
              }

              return (
                <div style={{background:COR.branco, borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,.06)', overflow:'hidden'}}>
                  <div style={{overflowX:'auto' as const}}>
                    <table style={{width:'100%', borderCollapse:'collapse', minWidth:920}}>
                      <thead>
                        <tr>
                          <th style={{...thStyle(), textAlign:'left' as const, minWidth:190, position:'sticky' as const, left:0, zIndex:11, background:'#f8fafc'}}>Categoria</th>
                          {MESES.map((m, mi) => (
                            <th key={mi} style={thStyle(mi)}>{ehAtualMes(mi) ? 'â— ' : ''}{m}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>

                        {/* â”€â”€ RECEITAS â€” seÃ§Ã£o expansÃ­vel â”€â”€ */}
                        <tr onClick={() => setSecEntAberto(v => !v)} style={{cursor:'pointer'}}>
                          <td style={{position:'sticky' as const, left:0, zIndex:5, padding:'10px 12px', fontSize:13, fontWeight:700, color:COR.verde, background:'#f0fdf4', borderTop:`2px solid ${COR.borda}`, userSelect:'none' as const}}>
                            <span style={{display:'inline-block', marginRight:7, transition:'transform .2s', transform:secEntAberto?'rotate(90deg)':'none', fontSize:10}}>â–¶</span>
                            Receitas
                          </td>
                          {totalEntradas.map((v, mi) => (
                            <td key={mi} style={{padding:'10px', fontSize:12, fontWeight:700, color:COR.verde, background:'#f0fdf4', textAlign:'right' as const, borderTop:`2px solid ${COR.borda}`, fontVariantNumeric:'tabular-nums' as const}}>{fmtH(v)}</td>
                          ))}
                        </tr>

                        {secEntAberto && gruposEP.map(([grupo, cats]) => {
                          const label = grupo === '__sem_grupo__' ? 'Sem grupo' : grupo
                          const key = `e-${grupo}`
                          const aberto = gruposHorizAbertos.has(key)
                          const gVals = MESES.map((_,mi) => cats.reduce((s,c) => s + c.v[mi], 0))
                          return [
                            <tr key={key} onClick={() => toggleH(key)} style={{cursor:'pointer'}}>
                              <td style={{position:'sticky' as const, left:0, zIndex:5, padding:'8px 10px 8px 28px', fontSize:12, fontWeight:700, color:'#166534', background:'#f0fdf4', borderBottom:`1px solid #dcfce7`}}>
                                <span style={{display:'inline-block', marginRight:6, transition:'transform .2s', transform:aberto?'rotate(90deg)':'none', fontSize:9}}>â–¶</span>
                                {label}
                              </td>
                              {gVals.map((v, mi) => (
                                <td key={mi} style={{padding:'8px 10px', textAlign:'right' as const, fontWeight:600, color:'#166534', fontSize:12, background:'#f0fdf4', borderBottom:`1px solid #dcfce7`, fontVariantNumeric:'tabular-nums' as const}}>{fmtH(v)}</td>
                              ))}
                            </tr>,
                            ...(aberto ? cats.map(cat => {
                              const row = dadosAnoFinal.entradas.indexOf(cat)
                              return (
                                <tr key={cat.nome}>
                                  <td style={{position:'sticky' as const, left:0, zIndex:5, padding:'6px 10px 6px 46px', fontSize:12, color:COR.textoSuave, fontWeight:400, background:COR.branco, borderBottom:'1px solid #f8fafc'}}>{cat.nome}</td>
                                  {cat.v.map((v, mi) => (
                                    <td key={mi} style={{padding:'4px 6px', fontSize:12, textAlign:'right' as const, background:COR.branco, borderBottom:'1px solid #f8fafc'}}>{renderValorH('e', row, mi, v)}</td>
                                  ))}
                                </tr>
                              )
                            }) : [])
                          ]
                        })}

                        {/* â”€â”€ DESPESAS â€” seÃ§Ã£o expansÃ­vel â”€â”€ */}
                        <tr onClick={() => setSecSaiAberto(v => !v)} style={{cursor:'pointer'}}>
                          <td style={{position:'sticky' as const, left:0, zIndex:5, padding:'10px 12px', fontSize:13, fontWeight:700, color:COR.vermelho, background:'#fef2f2', borderTop:`2px solid ${COR.borda}`, userSelect:'none' as const}}>
                            <span style={{display:'inline-block', marginRight:7, transition:'transform .2s', transform:secSaiAberto?'rotate(90deg)':'none', fontSize:10}}>â–¶</span>
                            Despesas
                          </td>
                          {totalSaidas.map((v, mi) => (
                            <td key={mi} style={{padding:'10px', fontSize:12, fontWeight:700, color:COR.vermelho, background:'#fef2f2', textAlign:'right' as const, borderTop:`2px solid ${COR.borda}`, fontVariantNumeric:'tabular-nums' as const}}>{fmtH(v)}</td>
                          ))}
                        </tr>

                        {secSaiAberto && gruposSP.map(([grupo, cats]) => {
                          const label = grupo === '__sem_grupo__' ? 'Sem grupo' : grupo
                          const key = `s-${grupo}`
                          const aberto = gruposHorizAbertos.has(key)
                          const gVals = MESES.map((_,mi) => cats.reduce((s,c) => s + c.v[mi], 0))
                          return [
                            <tr key={key} onClick={() => toggleH(key)} style={{cursor:'pointer'}}>
                              <td style={{position:'sticky' as const, left:0, zIndex:5, padding:'8px 10px 8px 28px', fontSize:12, fontWeight:700, color:'#991b1b', background:'#fef2f2', borderBottom:`1px solid #fecdd3`}}>
                                <span style={{display:'inline-block', marginRight:6, transition:'transform .2s', transform:aberto?'rotate(90deg)':'none', fontSize:9}}>â–¶</span>
                                {label}
                              </td>
                              {gVals.map((v, mi) => (
                                <td key={mi} style={{padding:'8px 10px', textAlign:'right' as const, fontWeight:600, color:'#991b1b', fontSize:12, background:'#fef2f2', borderBottom:`1px solid #fecdd3`, fontVariantNumeric:'tabular-nums' as const}}>{fmtH(v)}</td>
                              ))}
                            </tr>,
                            ...(aberto ? cats.map(cat => {
                              const row = dadosAnoFinal.saidas.indexOf(cat)
                              const isCartao = nomeFaturaCartao(cat.nome, cartNomesH)
                              return (
                                <tr key={cat.nome}>
                                  <td style={{position:'sticky' as const, left:0, zIndex:5, padding:'6px 10px 6px 46px', fontSize:12, color:COR.textoSuave, fontWeight:400, background:COR.branco, borderBottom:'1px solid #f8fafc'}}>{cat.nome}</td>
                                  {cat.v.map((v, mi) => (
                                    <td key={mi} style={{padding:'4px 6px', fontSize:12, textAlign:'right' as const, background:COR.branco, borderBottom:'1px solid #f8fafc'}}>{renderValorH('s', row, mi, v, isCartao)}</td>
                                  ))}
                                </tr>
                              )
                            }) : [])
                          ]
                        })}

                      </tbody>

                      {/* â”€â”€ RESULTADO â€” sempre visÃ­vel, fixo no rodapÃ© â”€â”€ */}
                      <tfoot>
                        <tr>
                          <td style={{position:'sticky' as const, left:0, zIndex:6, padding:'11px 12px', fontSize:13, fontWeight:800, color:COR.texto, background:'#f1f5f9', borderTop:`2px solid ${COR.borda}`}}>
                            Resultado
                          </td>
                          {totalEntradas.map((te, mi) => {
                            const sob = te - totalSaidas[mi]
                            return (
                              <td key={mi} style={{padding:'11px 10px', fontSize:13, fontWeight:800, textAlign:'right' as const, background:'#f1f5f9', borderTop:`2px solid ${COR.borda}`, fontVariantNumeric:'tabular-nums' as const,
                                color:sob>0?COR.verde:sob<0?COR.vermelho:COR.textoSuave}}>
                                {fmtH(sob)}
                              </td>
                            )
                          })}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )
            })() : (() => {

              /* â”€â”€ LISTA â€” navegador mensal com cards por grupo â”€â”€ */
              const fmtL = (v: number) => v === 0 ? 'â€”'
                : v.toLocaleString('pt-BR', { minimumFractionDigits:0, maximumFractionDigits:0 })
              const cartNomesL = new Set(contas.filter(c => c.tipo === 'cartao').map(c => c.nome.toLowerCase()))
              const getGrupEL = (cat: Cat) =>
                (cat.id ? (categorias.find(c => c.id === cat.id) ?? categorias.find(c => c.nome === cat.nome)) : categorias.find(c => c.nome === cat.nome))?.grupo ?? 'Outros'
              const getGrupSL = (cat: Cat) =>
                nomeFaturaCartao(cat.nome, cartNomesL) ? 'CartÃ£o de CrÃ©dito'
                : ((cat.id ? (categorias.find(c => c.id === cat.id) ?? categorias.find(c => c.nome === cat.nome)) : categorias.find(c => c.nome === cat.nome))?.grupo ?? 'Outras saÃ­das')
              const groupByL = (cats: Cat[], fn: (c: Cat) => string): [string, Cat[]][] => {
                const m = new Map<string, Cat[]>()
                cats.forEach(c => { const g = fn(c); if (!m.has(g)) m.set(g, []); m.get(g)!.push(c) })
                return [...m.entries()].sort(([a],[b]) => {
                  const last = (s: string) => s === 'Outros' || s === 'Outras saÃ­das' || s === '__sem_grupo__'
                  if (last(a) && !last(b)) return 1
                  if (!last(a) && last(b)) return -1
                  if (a === 'CartÃ£o de CrÃ©dito') return 1
                  if (b === 'CartÃ£o de CrÃ©dito') return -1
                  return a.localeCompare(b, 'pt-BR')
                })
              }
              const te = totalEntradas[mesMobile]
              const ts = totalSaidas[mesMobile]
              const sob = te - ts
              const ehAtualL = mesMobile === mesAtual && anoAtual === anoCorrente
              const gruposEnt = groupByL(dadosAnoFinal.entradas, getGrupEL)
              const gruposSai = groupByL(dadosAnoFinal.saidas, getGrupSL)
              const toggleGA = (k: string) => setGruposAbertos(prev => {
                const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n
              })

              const entBarW = 100
              const saiBarW = te > 0 ? Math.min(100, Math.round(ts / te * 100)) : 0
              const sobBarW = te > 0 ? Math.min(100, Math.max(0, Math.round(sob / te * 100))) : 0

              return (
                <>
                {/* â”€â”€ Navegador de mÃªs â”€â”€ */}
                <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:14, marginBottom:16}}>
                  <button
                    onClick={() => setMesMobile(prev => (prev - 1 + 12) % 12)}
                    style={{width:36, height:36, borderRadius:10, border:`1.5px solid ${COR.borda}`, background:COR.branco, cursor:'pointer', fontSize:18, color:COR.textoSuave, fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center'}}>
                    â€¹
                  </button>
                  <div style={{display:'flex', alignItems:'center', gap:8}}>
                    <span style={{fontSize:18, fontWeight:800, color:COR.texto, minWidth:160, textAlign:'center' as const}}>
                      {MESES_FULL[mesMobile]} {anoAtual}
                    </span>
                    {ehAtualL && (
                      <span style={{fontSize:9, background:COR.azul, color:'#fff', padding:'2px 7px', borderRadius:10, fontWeight:700, textTransform:'uppercase' as const}}>Atual</span>
                    )}
                  </div>
                  <button
                    onClick={() => setMesMobile(prev => (prev + 1) % 12)}
                    style={{width:36, height:36, borderRadius:10, border:`1.5px solid ${COR.borda}`, background:COR.branco, cursor:'pointer', fontSize:18, color:COR.textoSuave, fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center'}}>
                    â€º
                  </button>
                </div>

                {/* â”€â”€ 3 cards de resumo â”€â”€ */}
                <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14}}>
                  {/* â†— Vai entrar */}
                  <div style={{background:COR.branco, borderRadius:12, padding:'14px 18px', boxShadow:'0 1px 3px rgba(0,0,0,.06)'}}>
                    <div style={{fontSize:11, color:COR.textoSuave, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:.3}}>Receitas</div>
                    <div style={{fontSize:20, fontWeight:800, fontVariantNumeric:'tabular-nums' as const, marginTop:2, color:COR.verde}}>{fmtL(te)}</div>
                    <div style={{height:4, borderRadius:4, background:'#f1f5f9', marginTop:8, overflow:'hidden'}}>
                      <div style={{height:'100%', borderRadius:4, background:'#34d399', width:`${entBarW}%`}}/>
                    </div>
                  </div>
                  {/* â†™ Vai sair */}
                  <div style={{background:COR.branco, borderRadius:12, padding:'14px 18px', boxShadow:'0 1px 3px rgba(0,0,0,.06)'}}>
                    <div style={{fontSize:11, color:COR.textoSuave, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:.3}}>Despesas</div>
                    <div style={{fontSize:20, fontWeight:800, fontVariantNumeric:'tabular-nums' as const, marginTop:2, color:COR.vermelho}}>{fmtL(ts)}</div>
                    <div style={{height:4, borderRadius:4, background:'#f1f5f9', marginTop:8, overflow:'hidden'}}>
                      <div style={{height:'100%', borderRadius:4, background:'#fca5a5', width:`${saiBarW}%`}}/>
                    </div>
                  </div>
                  {/* ðŸ’° Vai sobrar */}
                  <div style={{background:COR.branco, borderRadius:12, padding:'14px 18px', boxShadow:'0 1px 3px rgba(0,0,0,.06)'}}>
                    <div style={{fontSize:11, color:COR.textoSuave, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:.3}}>Resultado</div>
                    <div style={{fontSize:20, fontWeight:800, fontVariantNumeric:'tabular-nums' as const, marginTop:2, color:COR.azul}}>{fmtL(sob)}</div>
                    <div style={{height:4, borderRadius:4, background:'#f1f5f9', marginTop:8, overflow:'hidden'}}>
                      <div style={{height:'100%', borderRadius:4, background:'#93c5fd', width:`${sobBarW}%`}}/>
                    </div>
                  </div>
                </div>

                {/* â”€â”€ Cards de grupo â”€â”€ */}
                {[...gruposEnt.map(([g,cats]) => ({key:`e-${g}`,nome:g,cats,tipo:'e' as const})),
                  ...gruposSai.map(([g,cats]) => ({key:`s-${g}`,nome:g,cats,tipo:'s' as const}))
                ].map(({key,nome,cats,tipo}) => {
                  const groupTotal = cats.reduce((s,c) => s + (c.v[mesMobile] ?? 0), 0)
                  if (groupTotal === 0) return null
                  const isOpen = gruposAbertos.has(key)
                  const pct = ts > 0 && tipo === 's' ? Math.round(groupTotal / ts * 100) : te > 0 && tipo === 'e' ? Math.round(groupTotal / te * 100) : 0
                  const label = nome === '__sem_grupo__' ? (tipo === 'e' ? 'Outras entradas' : 'Outras saÃ­das') : nome
                  return (
                    <div key={key} style={{background:COR.branco, borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,.06)', overflow:'hidden', marginBottom:10}}>
                      {/* Header do card */}
                      <div
                        onClick={() => toggleGA(key)}
                        style={{padding:'12px 18px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between',
                          borderBottom:isOpen?'1px solid #f1f5f9':'1px solid transparent'}}>
                        <div style={{display:'flex', alignItems:'center', gap:10}}>
                          <div style={{width:36, height:36, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, background:'#dbeafe'}}>
                            {tipo === 'e' ? 'ðŸ’°' : 'ðŸ“Œ'}
                          </div>
                          <div>
                            <div style={{fontSize:14, fontWeight:700, color:COR.texto}}>{label}</div>
                            <div style={{fontSize:11, color:COR.textoSuave}}>{cats.filter(c => (c.v[mesMobile] ?? 0) > 0).length} categoria{cats.filter(c => (c.v[mesMobile] ?? 0) > 0).length !== 1 ? 's' : ''}</div>
                          </div>
                        </div>
                        <div style={{display:'flex', alignItems:'center', gap:12}}>
                          {pct > 0 && <span style={{fontSize:10, fontWeight:700, color:COR.textoSuave, background:'#f1f5f9', padding:'3px 8px', borderRadius:16}}>{pct}%</span>}
                          <span style={{fontSize:15, fontWeight:800, fontVariantNumeric:'tabular-nums' as const, color:COR.texto}}>{fmtL(groupTotal)}</span>
                          <span style={{color:COR.textoSuave, fontSize:12, display:'inline-block', transition:'transform .2s', transform:isOpen?'rotate(180deg)':'none'}}>â–¾</span>
                        </div>
                      </div>
                      {/* Categorias */}
                      {isOpen && (
                        <div style={{padding:'0 18px 12px'}}>
                          {cats.filter(c => (c.v[mesMobile] ?? 0) > 0).map(cat => {
                            const v = cat.v[mesMobile] ?? 0
                            const bw = groupTotal > 0 ? Math.round(v / groupTotal * 100) : 0
                            const {icone} = iconeCategoria(categorias, cat.nome)
                            return (
                              <div key={cat.nome} style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f8fafc'}}>
                                <div style={{display:'flex', alignItems:'center', gap:8}}>
                                  <span style={{fontSize:13}}>{icone}</span>
                                  <span style={{fontSize:13, color:'#475569', fontWeight:500}}>{cat.nome}</span>
                                </div>
                                <div style={{display:'flex', alignItems:'center', gap:10}}>
                                  <div style={{width:56, height:5, background:'#f1f5f9', borderRadius:4, overflow:'hidden'}}>
                                    <div style={{height:'100%', borderRadius:4, background:'#93c5fd', width:`${bw}%`}}/>
                                  </div>
                                  <span
                                    onClick={() => setModalMes(mesMobile)}
                                    style={{fontSize:13, fontWeight:700, color:COR.texto, fontVariantNumeric:'tabular-nums' as const, padding:'4px 8px', borderRadius:6, cursor:'pointer', transition:'background .15s'}}
                                    onMouseEnter={e => { const el=e.currentTarget as HTMLSpanElement; el.style.background='#eff6ff'; el.style.color=COR.azul }}
                                    onMouseLeave={e => { const el=e.currentTarget as HTMLSpanElement; el.style.background=''; el.style.color=COR.texto }}>
                                    {fmtL(v)}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Dica */}
                <div style={{marginTop:14, padding:'10px 14px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10, fontSize:12, color:'#92400e', lineHeight:1.5, display:'flex', alignItems:'flex-start', gap:8}}>
                  <span>ðŸ’¡</span>
                  <span>Toque no valor para ajustar. A % mostra quanto do total cada grupo representa.</span>
                </div>
                </>
              )
            })())}

            <div style={{ height: 600, flexShrink: 0 }} />
          </div>
        )}
      </div>
      </div>{/* fecha maxWidth wrapper */}

      {/* â”€â”€ MODAL DETALHE DO MÃŠS â”€â”€ */}
      {modalMes !== null && (aba === 'previsto' || (aba === 'real' && realExiste) || hideTabs) && (() => {
        const mi = modalMes
        const ehAtual = mi === mesAtual && anoAtual === anoCorrente
        const temReal = aba === 'real' && mesTemDadosReais[mi]
        const te = temReal ? totaisReais.te[mi] : totalEntradas[mi]
        const ts = temReal ? totaisReais.ts[mi] : totalSaidas[mi]
        const sfVal = temReal ? saldoFinalReal[mi] : saldoFinal[mi]
        const si = saldoInicialReal[mi]
        const sfCor = sfVal > 0 ? COR.verde : sfVal < 0 ? COR.vermelho : COR.textoSuave
        const entradasModal = aba === 'real' ? entradasComHistorico : dadosAno.entradas
        const saidasModal = dadosAnoFinal.saidas
        const metaAnual  = (planos[anoAtual] as any)?.metaAnual ?? 0
        const mesInicio  = (planos[anoAtual] as any)?.mesInicio ?? 0
        const mesesPlanejados = 12 - mesInicio
        const metaMensal = metaAnual > 0 ? metaAnual / mesesPlanejados : 0
        const resultado  = te - ts
        const metaPct    = metaMensal > 0 ? Math.min(100, Math.max(0, resultado / metaMensal * 100)) : 0
        const metaOk     = metaMensal > 0 && resultado >= metaMensal
        return (
          <div
            style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.45)', zIndex:150,
              display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
            onClick={e => { if (e.target === e.currentTarget) { setModalMes(null); setEditando(null) } }}>
            <div style={{ background:COR.branco, borderRadius:18, width:'100%', maxWidth:660,
              maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column',
              boxShadow:'0 24px 80px rgba(0,0,0,0.25)' }}>

              {/* Header: nav + tÃ­tulo + close */}
              <div style={{ padding:'14px 20px', borderBottom:`1px solid ${COR.borda}`, flexShrink:0,
                background:ehAtual?'#dbeafe':COR.branco,
                display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <button onClick={() => navegarModalMes(mi, mi > 0 ? mi - 1 : 11)}
                    style={{ width:28, height:28, borderRadius:7, border:`1px solid ${COR.borda}`,
                      background:'transparent', cursor:'pointer', fontSize:16, color:COR.textoSuave,
                      fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center' }}>â€¹</button>
                  <div style={{ fontSize:17, fontWeight:800, color:ehAtual?COR.azul:COR.texto }}>
                    {MESES_FULL[mi]}
                  </div>
                  {ehAtual && <span style={{ fontSize:8, background:COR.azul, color:'#fff', padding:'2px 6px', borderRadius:10, fontWeight:700, textTransform:'uppercase' }}>atual</span>}
                  <button onClick={() => navegarModalMes(mi, mi < 11 ? mi + 1 : 0)}
                    style={{ width:28, height:28, borderRadius:7, border:`1px solid ${COR.borda}`,
                      background:'transparent', cursor:'pointer', fontSize:16, color:COR.textoSuave,
                      fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center' }}>â€º</button>
                </div>
                <button onClick={() => { setModalMes(null); setEditando(null) }}
                  style={{ width:30, height:30, border:'none', background:'#f1f5f9', borderRadius:8,
                    cursor:'pointer', fontSize:18, color:COR.textoSuave, fontFamily:'inherit',
                    display:'flex', alignItems:'center', justifyContent:'center' }}>âœ•</button>
              </div>

              {/* Totals bar: SI / E / S / SF */}
              <div style={{ display:'flex', borderBottom:`1px solid ${COR.borda}`, flexShrink:0 }}>
                {([
                  { label:'VocÃª tem hoje', val:si,    cor:corSaldo(si)  },
                  { label:'Receitas',  val:te,    cor:'#16a34a'     },
                  { label:'Despesas',  val:ts,    cor:COR.vermelho  },
                  { label:'Resultado', val:sfVal, cor:sfCor         },
                ] as { label:string; val:number; cor:string }[]).map((item, idx) => (
                  <div key={idx} style={{ flex:1, padding:'10px 14px',
                    borderRight: idx < 3 ? `1px solid ${COR.borda}` : 'none' }}>
                    <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:.5,
                      color:COR.textoSuave, marginBottom:3 }}>{item.label}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:item.cor, fontVariantNumeric:'tabular-nums' }}>
                      {item.val.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                    </div>
                  </div>
                ))}
              </div>

              {/* Meta mensal */}
              {metaMensal > 0 && (
                <div style={{ padding:'9px 16px', borderBottom:`1px solid ${COR.borda}`, flexShrink:0,
                  background: metaOk ? '#f0fdf4' : '#faf5ff' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:.5,
                      color: metaOk ? '#166534' : '#6d28d9' }}>
                      {metaOk ? 'âœ“' : 'â—Ž'} Meta mensal
                    </span>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <span style={{ fontSize:12, color: resultado >= 0 ? '#16a34a' : COR.vermelho, fontWeight:600, fontVariantNumeric:'tabular-nums' }}>
                        {resultado.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                      </span>
                      <span style={{ fontSize:13, fontWeight:700, color: metaOk ? '#166534' : '#7c3aed' }}>
                        {metaPct.toFixed(0)}% de {metaMensal.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                      </span>
                    </div>
                  </div>
                  <div style={{ height:6, background:'rgba(0,0,0,0.08)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:3, transition:'width .4s',
                      background: metaOk ? '#16a34a' : '#7c3aed', width:`${metaPct}%` }}/>
                  </div>
                </div>
              )}

              {/* Scrollable body */}
              <div style={{ overflowY:'auto', flex:1, minHeight:0 }}>

                {/* Entradas */}
                <div style={{ margin:'10px 10px 6px', borderRadius:10, border:'1px solid #86efac', overflow:'hidden' }}>
                  <div style={{ padding:'8px 14px', background:'#dcfce7',
                    display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontSize:12, fontWeight:700, color:'#166534' }}>Receitas</span>
                  </div>
                  {(() => { const entradasComIdx = entradasModal.map((cat, ri) => ({ cat, ri }))
          .sort((a, b) => {
            const ga = (a.cat.id ? (categorias.find(c => c.id === a.cat.id) ?? categorias.find(c => c.nome === a.cat.nome)) : categorias.find(c => c.nome === a.cat.nome))?.grupo ?? '__sem_grupo__'
            const gb = (b.cat.id ? (categorias.find(c => c.id === b.cat.id) ?? categorias.find(c => c.nome === b.cat.nome)) : categorias.find(c => c.nome === b.cat.nome))?.grupo ?? '__sem_grupo__'
            return ga === '__sem_grupo__' ? 1 : gb === '__sem_grupo__' ? -1 : ga.localeCompare(gb, 'pt-BR')
          })
          let prevGrupoE: string | null = null; return entradasComIdx.map(({ cat, ri }) => {
                    const { icone, cor: corIcone } = iconeCategoria(categorias, cat.nome)
                    const catCfgE = cat.id ? (categorias.find(c => c.id === cat.id) ?? categorias.find(c => c.nome === cat.nome)) : categorias.find(c => c.nome === cat.nome)
                    const isAtiva = catCfgE?.ativa ?? true
                    if (!isAtiva && cat.v[mi] === 0) return null
                    const grupo = catCfgE?.grupo ?? '__sem_grupo__'
                    const descricaoE = catCfgE?.descricao
                    const showGrupoHeader = grupo !== prevGrupoE
                    prevGrupoE = grupo
                    const podeEditar = (aba === 'previsto' ? !bloqueado : (anoAtual > anoCorrente || mi >= mesAtual)) && isAtiva
                    return (
                      <div key={ri}>
                        {showGrupoHeader && (
                          <div style={{ padding:'4px 14px 4px 14px', background:'#f0fdf4',
                            fontSize:10, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:.5,
                            color:'#166534', borderBottom:'1px solid #dcfce7', borderTop:'1px solid #dcfce7', marginTop: prevGrupoE !== grupo ? 0 : 0 }}>
                            {grupo === '__sem_grupo__' ? 'Outros' : grupo}
                          </div>
                        )}
                        <div
                          onClick={podeEditar ? () => iniciarValor('e', ri, mi, cat.v[mi]) : undefined}
                          style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px',
                            borderBottom:'1px solid rgba(0,0,0,0.05)', cursor:podeEditar?'pointer':'default',
                            background:editando?.tipo==='e'&&editando.row===ri&&editando.mes===mi?'#f0fdf4':'transparent' }}>
                          <div style={{ width:20, height:20, borderRadius:5, background:corIcone,
                            display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, flexShrink:0 }}>{icone}</div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12, color:isAtiva?COR.texto:COR.textoSuave }}>{cat.nome}</div>
                            {descricaoE && <div style={{ fontSize:10, color:COR.textoSuave, marginTop:1 }}>{descricaoE}</div>}
                          </div>
                          {renderValor('e', ri, mi, cat.v[mi], !podeEditar)}
                        </div>
                      </div>
                    )
                  })})()}
                </div>

                {/* SaÃ­das */}
                <div style={{ margin:'6px 10px 10px', borderRadius:10, border:'1px solid #fca5a5', overflow:'hidden' }}>
                  <div style={{ padding:'8px 14px', background:'#fee2e2',
                    display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontSize:12, fontWeight:700, color:'#7f1d1d' }}>Despesas</span>
                  </div>
                  {(() => {
                    const temFatura = saidasModal.some(c => nomeFaturaCartao(c.nome, cartaoNomes))
                    const cartaoSinM = somaCartaoMes[mi]
                    const sinteticos: { cat: Cat; ri: number }[] =
                      cartaoSinM > 0 && !temFatura
                        ? [{ cat: { id: '__cartao__', nome: 'CartÃ£o de CrÃ©dito', t: 'cartao', v: somaCartaoMes }, ri: -1 }]
                        : []
                    const saidasComIdx = [
                      ...saidasModal.map((cat, ri) => ({ cat, ri })),
                      ...sinteticos,
                    ].sort((a, b) => {
                      const ga = (a.ri === -1 || nomeFaturaCartao(a.cat.nome, cartaoNomes)) ? 'CartÃ£o de CrÃ©dito'
                        : ((a.cat.id ? (categorias.find(c => c.id === a.cat.id) ?? categorias.find(c => c.nome === a.cat.nome)) : categorias.find(c => c.nome === a.cat.nome))?.grupo ?? '__sem_grupo__')
                      const gb = (b.ri === -1 || nomeFaturaCartao(b.cat.nome, cartaoNomes)) ? 'CartÃ£o de CrÃ©dito'
                        : ((b.cat.id ? (categorias.find(c => c.id === b.cat.id) ?? categorias.find(c => c.nome === b.cat.nome)) : categorias.find(c => c.nome === b.cat.nome))?.grupo ?? '__sem_grupo__')
                      if (ga === gb) return 0
                      if (ga === 'CartÃ£o de CrÃ©dito') return -1
                      if (gb === 'CartÃ£o de CrÃ©dito') return 1
                      if (ga === '__sem_grupo__') return 1
                      if (gb === '__sem_grupo__') return -1
                      return ga.localeCompare(gb, 'pt-BR')
                    })
                    let prevGrupoS: string | null = null
                    return saidasComIdx.map(({ cat, ri }) => {
                      if (ri === -1) {
                        const v = cat.v[mi] ?? 0
                        const showH = 'CartÃ£o de CrÃ©dito' !== prevGrupoS
                        prevGrupoS = 'CartÃ£o de CrÃ©dito'
                        return (
                          <div key="__cartao__">
                            {showH && (
                              <div style={{ padding:'4px 14px', background:'#f5f3ff',
                                fontSize:10, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:.5,
                                color:'#6d28d9', borderBottom:'1px solid #ddd6fe', borderTop:'1px solid #ddd6fe' }}>
                                CartÃ£o de CrÃ©dito
                              </div>
                            )}
                            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px',
                              borderBottom:'1px solid rgba(0,0,0,0.05)', background:'#faf5ff' }}>
                              <div style={{ width:20, height:20, borderRadius:5, background:'#7c3aed22',
                                display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, flexShrink:0 }}>ðŸ’³</div>
                              <span style={{ flex:1, fontSize:12, color:'#7c3aed', fontWeight:500 }}>
                                CartÃ£o de CrÃ©dito
                                <span style={{ fontSize:9, color:'#c4b5fd', marginLeft:4 }}>(calculado)</span>
                              </span>
                              <span style={{ fontSize:13, fontWeight:600, color:'#7c3aed', fontVariantNumeric:'tabular-nums' as const }}>
                                {v > 0 ? v.toLocaleString('pt-BR', { style:'currency', currency:'BRL' }) : 'â€”'}
                              </span>
                            </div>
                          </div>
                        )
                      }
                      const { icone, cor: corIcone } = iconeCategoria(categorias, cat.nome)
                      const ehFatura  = nomeFaturaCartao(cat.nome, cartaoNomes)
                      const catCfgS = cat.id ? (categorias.find(c => c.id === cat.id) ?? categorias.find(c => c.nome === cat.nome)) : categorias.find(c => c.nome === cat.nome)
                      const isAtiva = catCfgS?.ativa ?? true
                      if (!isAtiva && cat.v[mi] === 0) return null
                      const grupo = ehFatura ? 'CartÃ£o de CrÃ©dito' : (catCfgS?.grupo ?? '__sem_grupo__')
                      const descricaoS = catCfgS?.descricao
                      const showGrupoHeader = grupo !== prevGrupoS
                      prevGrupoS = grupo
                      const podeEditar = (aba === 'previsto' ? !bloqueado : (anoAtual > anoCorrente || mi >= mesAtual)) && !ehFatura && isAtiva
                      return (
                        <div key={ri}>
                          {showGrupoHeader && (
                            <div style={{ padding:'4px 14px', background:'#fff1f2',
                              fontSize:10, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:.5,
                              color:'#7f1d1d', borderBottom:'1px solid #fecaca', borderTop:'1px solid #fecaca' }}>
                              {grupo === '__sem_grupo__' ? 'Outros' : grupo}
                            </div>
                          )}
                          <div
                            onClick={podeEditar ? () => iniciarValor('s', ri, mi, cat.v[mi]) : undefined}
                            style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px',
                              borderBottom:'1px solid rgba(0,0,0,0.05)', cursor:podeEditar?'pointer':'default',
                              background:editando?.tipo==='s'&&editando.row===ri&&editando.mes===mi?'#fff5f5':'transparent' }}>
                            <div style={{ width:20, height:20, borderRadius:5, background:corIcone,
                              display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, flexShrink:0 }}>{icone}</div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:12, color:isAtiva?COR.texto:COR.textoSuave }}>
                                {cat.nome}
                                {ehFatura && <span style={{ fontSize:9, color:'#c4b5fd', marginLeft:4 }}>(auto)</span>}
                              </div>
                              {descricaoS && <div style={{ fontSize:10, color:COR.textoSuave, marginTop:1 }}>{descricaoS}</div>}
                            </div>
                            {renderValor('s', ri, mi, cat.v[mi], !podeEditar)}
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>

              </div>
            </div>
          </div>
        )
      })()}

      {/* â”€â”€ PROMPT COPIAR MÃŠS â”€â”€ */}
      {copiarMesPrompt !== null && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', zIndex:200,
          display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:360, padding:'28px 24px',
            boxShadow:'0 20px 60px rgba(0,0,0,0.3)', display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ fontSize:32, textAlign:'center' }}>ðŸ“‹</div>
            <div style={{ fontSize:16, fontWeight:700, color:'#0f172a', textAlign:'center' }}>
              {MESES_FULL[copiarMesPrompt.destino]} sem planejamento
            </div>
            <div style={{ fontSize:13, color:'#64748b', textAlign:'center', lineHeight:1.5 }}>
              Deseja copiar os valores de{' '}
              <strong>{MESES_FULL[copiarMesPrompt.origem]}</strong>{' '}
              para <strong>{MESES_FULL[copiarMesPrompt.destino]}</strong>?
            </div>
            <div style={{ display:'flex', gap:8, marginTop:4 }}>
              <button
                onClick={() => { setModalMes(copiarMesPrompt.destino); setCopiarMesPrompt(null) }}
                style={{ flex:1, padding:'10px 0', borderRadius:10, border:`1px solid #e2e8f0`,
                  background:'#f8fafc', cursor:'pointer', fontSize:13, fontWeight:600,
                  color:'#64748b', fontFamily:'inherit' }}>
                NÃ£o, ir assim mesmo
              </button>
              <button
                onClick={() => confirmarCopiarMes(copiarMesPrompt.origem, copiarMesPrompt.destino)}
                style={{ flex:1, padding:'10px 0', borderRadius:10, border:'none',
                  background:COR.azul, cursor:'pointer', fontSize:13, fontWeight:700,
                  color:'#fff', fontFamily:'inherit' }}>
                Sim, copiar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ QUIZ DE ONBOARDING â”€â”€ */}
      {quizAtivo && (
        <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.55)',zIndex:300,
          display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:'#fff',borderRadius:20,width:'100%',maxWidth:520,
            maxHeight:'88vh',overflowY:'auto',boxShadow:'0 25px 60px rgba(0,0,0,0.3)',
            display:'flex',flexDirection:'column'}}>

            {/* CabeÃ§alho */}
            <div style={{background:`linear-gradient(135deg,#0f2878,#1a56db)`,
              padding:'24px 28px 20px',borderRadius:'20px 20px 0 0',position:'relative',flexShrink:0}}>
              <div style={{position:'absolute',top:14,right:14,display:'flex',alignItems:'center',gap:6}}>
                <button onClick={() => { setQuizAtivo(false); setQuizConcluido(false); }} style={{
                  background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.25)',
                  borderRadius:8,color:'rgba(255,255,255,0.75)',padding:'4px 10px',
                  cursor:'pointer',fontSize:11,fontFamily:'inherit',fontWeight:500,
                  lineHeight:1}}>Pular â†’</button>
                <button onClick={() => { setQuizAtivo(false); setQuizConcluido(false); }} style={{
                  background:'rgba(255,255,255,0.15)',border:'none',borderRadius:8,color:'#fff',
                  width:28,height:28,cursor:'pointer',fontSize:16,fontFamily:'inherit',
                  display:'flex',alignItems:'center',justifyContent:'center'}}>Ã—</button>
              </div>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.6)',fontWeight:600,
                textTransform:'uppercase',letterSpacing:.8,marginBottom:6}}>
                {quizStep < QUIZ_STEP_RESUMO ? `Passo ${quizStep + 1} de ${QUIZ_TOTAL}` : 'Tudo pronto!'}
              </div>
              <div style={{fontSize:17,fontWeight:700,color:'#fff',lineHeight:1.3,paddingRight:32}}>
                {([
                  'Qual Ã© o seu objetivo financeiro?',
                  quizObjetivo==='guardar' ? 'Quanto deseja economizar este ano?' :
                  quizObjetivo==='quitar'  ? 'Qual o valor total que deseja quitar?' :
                  quizObjetivo==='tudo'    ? 'Qual sua meta de economia anual?' :
                                             'Vamos organizar suas finanÃ§as!',
                  'Quer considerar o saldo das suas contas no planejamento?',
                  'Quais sÃ£o suas receitas mensais?',
                  ...quizGruposAtivos.map(g => `Despesas com ${g === '__sem_grupo__' ? 'outras categorias' : g}`),
                  'Seu planejamento estÃ¡ pronto! ðŸŽ‰',
                ])[quizStep]}
              </div>
              <div style={{display:'flex',gap:5,marginTop:14}}>
                {Array.from({length: QUIZ_TOTAL}, (_, i) => (
                  <div key={i} style={{height:3,borderRadius:2,transition:'all .3s',
                    background:i<=quizStep?'#fff':'rgba(255,255,255,0.25)',
                    flex:i===quizStep?2:1}}/>
                ))}
              </div>
            </div>

            {/* Corpo */}
            <div style={{padding:'22px 28px',flex:1,overflowY:'auto'}}>

{quizConcluido ? (
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',gap:16,padding:'8px 0'}}>
                <div style={{fontSize:48,lineHeight:1}}>ðŸŽ‰</div>
                <div style={{fontSize:20,fontWeight:800,color:COR.texto,lineHeight:1.2}}>ParabÃ©ns! Seu planejamento estÃ¡ criado.</div>
                <div style={{fontSize:13,color:COR.textoSuave,lineHeight:1.6}}>Agora vocÃª pode acompanhar e ajustar seus valores usando os trÃªs modos de visualizaÃ§Ã£o:</div>
                <div style={{display:'flex',flexDirection:'column',gap:10,width:'100%',marginTop:4}}>
                  <div style={{display:'flex',gap:12,alignItems:'flex-start',padding:'12px 14px',borderRadius:12,background:'#eff6ff',border:'1px solid #bfdbfe'}}>
                    <div style={{fontSize:20,flexShrink:0}}>ðŸ“Š</div>
                    <div style={{textAlign:'left'}}>
                      <div style={{fontSize:13,fontWeight:700,color:'#1e40af',marginBottom:2}}>Grade</div>
                      <div style={{fontSize:12,color:COR.textoSuave,lineHeight:1.5}}>VisÃ£o geral do ano em cards mensais. Clique em qualquer mÃªs para ver ou editar os detalhes.</div>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:12,alignItems:'flex-start',padding:'12px 14px',borderRadius:12,background:'#f0fdf4',border:'1px solid #bbf7d0'}}>
                    <div style={{fontSize:20,flexShrink:0}}>ðŸ“‹</div>
                    <div style={{textAlign:'left'}}>
                      <div style={{fontSize:13,fontWeight:700,color:'#166534',marginBottom:2}}>Planilha</div>
                      <div style={{fontSize:12,color:COR.textoSuave,lineHeight:1.5}}>Todos os 12 meses lado a lado. Edite diretamente nas cÃ©lulas e use Tab para navegar rapidamente.</div>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:12,alignItems:'flex-start',padding:'12px 14px',borderRadius:12,background:'#faf5ff',border:'1px solid #e9d5ff'}}>
                    <div style={{fontSize:20,flexShrink:0}}>ðŸ“</div>
                    <div style={{textAlign:'left'}}>
                      <div style={{fontSize:13,fontWeight:700,color:'#6b21a8',marginBottom:2}}>Lista</div>
                      <div style={{fontSize:12,color:COR.textoSuave,lineHeight:1.5}}>Todas as categorias em lista. Ideal para ajustar valores de uma categoria especÃ­fica em todos os meses.</div>
                    </div>
                  </div>
                </div>
              </div>

              ) : (
              <>
              {/* Gate: sem bancos ou sem categorias */}
              {(() => {
                const semBancos = contas.filter(c => c.tipo === 'corrente' || c.tipo === 'poupanca').length === 0
                const semCats   = categorias.filter(c => c.ativa).length === 0
                if (!semBancos && !semCats) return null
                return (
                  <div style={{padding:'16px 0'}}>
                    <div style={{fontSize:44,textAlign:'center',marginBottom:14}}>âš™ï¸</div>
                    <h3 style={{fontSize:16,fontWeight:700,color:COR.texto,margin:'0 0 8px',textAlign:'center'}}>
                      Configure primeiro
                    </h3>
                    <p style={{fontSize:13,color:COR.textoSuave,lineHeight:1.7,margin:'0 0 18px',textAlign:'center'}}>
                      Para criar um planejamento vocÃª precisa ter:
                    </p>
                    <div style={{display:'flex',flexDirection:'column',gap:10}}>
                      {semBancos && (
                        <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',
                          borderRadius:10,background:'#fff7ed',border:'1px solid #fed7aa'}}>
                          <span style={{fontSize:22,flexShrink:0}}>ðŸ¦</span>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13,fontWeight:600,color:'#92400e'}}>Banco nÃ£o cadastrado</div>
                            <div style={{fontSize:11,color:'#b45309'}}>Conta corrente ou poupanÃ§a</div>
                          </div>
                          <button onClick={() => { setQuizAtivo(false); navigate('/configuracoes') }}
                            style={{padding:'7px 14px',border:'none',borderRadius:8,cursor:'pointer',
                              background:'#92400e',color:'#fff',fontSize:12,fontWeight:600,
                              fontFamily:'inherit',flexShrink:0}}>
                            Cadastrar â†’
                          </button>
                        </div>
                      )}
                      {semCats && (
                        <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',
                          borderRadius:10,background:'#fff7ed',border:'1px solid #fed7aa'}}>
                          <span style={{fontSize:22,flexShrink:0}}>ðŸ—‚ï¸</span>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13,fontWeight:600,color:'#92400e'}}>Sem categorias ativas</div>
                            <div style={{fontSize:11,color:'#b45309'}}>Receitas e despesas</div>
                          </div>
                          <button onClick={() => { setQuizAtivo(false); navigate('/configuracoes', { state: { aba: 'categorias' } }) }}
                            style={{padding:'7px 14px',border:'none',borderRadius:8,cursor:'pointer',
                              background:'#92400e',color:'#fff',fontSize:12,fontWeight:600,
                              fontFamily:'inherit',flexShrink:0}}>
                            Cadastrar â†’
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* Passo 0 â€” Objetivo */}
              {quizStep === 0 && (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  {([
                    {id:'guardar',  icon:'ðŸ’°', label:'Guardar dinheiro'},
                    {id:'organizar',icon:'ðŸ“‹', label:'Organizar gastos'},
                    {id:'quitar',   icon:'ðŸ’³', label:'Quitar dÃ­vidas'},
                    {id:'tudo',     icon:'ðŸŽ¯', label:'Tudo isso'},
                  ] as const).map(o => (
                    <button key={o.id} onClick={() => setQuizObjetivo(o.id)} style={{
                      padding:'18px 12px',borderRadius:12,cursor:'pointer',fontFamily:'inherit',
                      border:`2px solid ${quizObjetivo===o.id?COR.azul:COR.borda}`,
                      background:quizObjetivo===o.id?'#eff6ff':COR.branco,
                      display:'flex',flexDirection:'column',alignItems:'center',gap:8,transition:'all .15s'}}>
                      <span style={{fontSize:30}}>{o.icon}</span>
                      <span style={{fontSize:12,fontWeight:600,
                        color:quizObjetivo===o.id?COR.azul:COR.texto,textAlign:'center'}}>{o.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Passo 1 â€” Meta */}
              {quizStep === 1 && (() => {
                if (quizObjetivo === 'organizar') return (
                  <div style={{textAlign:'center',padding:'20px 0'}}>
                    <div style={{fontSize:40,marginBottom:12}}>ðŸ“‹</div>
                    <div style={{fontSize:14,fontWeight:600,color:COR.texto,marginBottom:8}}>
                      Ã“tima decisÃ£o!
                    </div>
                    <p style={{fontSize:13,color:COR.textoSuave,lineHeight:1.6,margin:0}}>
                      Vamos mapear todas as suas receitas e despesas para vocÃª ter uma visÃ£o clara de onde o seu dinheiro estÃ¡ indo.
                    </p>
                  </div>
                )
                const labelMeta = quizObjetivo==='quitar'
                  ? 'Valor total das dÃ­vidas a quitar'
                  : 'Meta de economia anual'
                const dicaMeta = quizObjetivo==='quitar'
                  ? 'Some todas as dÃ­vidas que quer eliminar este ano.'
                  : 'Quanto quer ter guardado ao final do ano?'
                return (
                  <div>
                    <p style={{fontSize:13,color:COR.textoSuave,marginBottom:6,marginTop:0}}>{dicaMeta}</p>
                    <input value={quizMetaStr} autoFocus
                      onChange={e => setQuizMetaStr(e.target.value)}
                      onFocus={e => e.target.select()}
                      onBlur={e => { const n=parseBRL(e.target.value); if(n>0) setQuizMetaStr(n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})) }}
                      placeholder="0,00"
                      style={{width:'100%',padding:'14px 16px',borderRadius:10,fontSize:22,
                        fontWeight:700,border:`2px solid ${COR.azul}`,outline:'none',
                        textAlign:'right',fontFamily:'inherit',color:COR.azulEscuro,
                        background:'#eff6ff',boxSizing:'border-box'}}/>
                    <p style={{fontSize:11,color:COR.textoSuave,marginTop:8,marginBottom:0}}>{labelMeta}</p>
                  </div>
                )
              })()}

              {/* Passo 2 â€” Saldo das contas */}
              {quizStep === 2 && (() => {
                const contasBanco = contas.filter(c => c.tipo === 'corrente' || c.tipo === 'poupanca')
                const totalSaldo  = contasBanco
                  .filter(c => !quizContasExcluidas.has(c.id))
                  .reduce((s, c) => s + parseBRL(quizSaldosContas[c.id] ?? c.saldoInicial.toLocaleString('pt-BR',{minimumFractionDigits:2})), 0)
                const toggleConta = (id: string) => setQuizContasExcluidas(prev => {
                  const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
                })
                return (
                  <div>
                    <p style={{fontSize:13,color:COR.textoSuave,marginBottom:12,marginTop:0}}>
                      Informe o saldo atual de cada conta para usar no planejamento.
                    </p>
                    {contasBanco.length > 0 ? (
                      <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:16}}>
                        {contasBanco.map(c => {
                          const selecionada = !quizContasExcluidas.has(c.id)
                          const valStr = quizSaldosContas[c.id] ?? c.saldoInicial.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})
                          return (
                            <div key={c.id} style={{display:'flex',alignItems:'center',gap:10,
                              padding:'8px 12px',borderRadius:8,
                              background:selecionada?'#f0f9ff':'#f8faff',
                              border:`1px solid ${selecionada?COR.azul:COR.borda}`,
                              transition:'all .15s',opacity:selecionada?1:0.5}}>
                              <div onClick={() => toggleConta(c.id)}
                                style={{width:18,height:18,borderRadius:4,flexShrink:0,cursor:'pointer',
                                  border:`2px solid ${selecionada?COR.azul:COR.borda}`,
                                  background:selecionada?COR.azul:'#fff',
                                  display:'flex',alignItems:'center',justifyContent:'center'}}>
                                {selecionada && <span style={{color:'#fff',fontSize:11,lineHeight:1}}>âœ“</span>}
                              </div>
                              <div style={{display:'flex',alignItems:'center',gap:6,flex:1,minWidth:0}}>
                                <span style={{fontSize:16}}>{c.icone || 'ðŸ¦'}</span>
                                <span style={{fontSize:13,fontWeight:500,color:COR.texto,
                                  overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                                  {c.banco || c.nome}
                                </span>
                              </div>
                              <input
                                value={valStr}
                                onChange={e => setQuizSaldosContas(p => ({...p,[c.id]:e.target.value}))}
                                onFocus={e => e.target.select()}
                                onBlur={e => {
                                  const n = parseBRL(e.target.value)
                                  setQuizSaldosContas(p => ({...p,[c.id]:n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}))
                                }}
                                disabled={!selecionada}
                                placeholder="0,00"
                                style={{width:110,padding:'5px 8px',borderRadius:7,fontSize:13,fontWeight:600,
                                  border:`1.5px solid ${selecionada?COR.azul:COR.borda}`,outline:'none',
                                  textAlign:'right',fontFamily:'inherit',
                                  color:selecionada?COR.azulEscuro:COR.textoSuave,
                                  background:selecionada?'#fff':'#f8faff'}}/>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div style={{textAlign:'center',padding:'16px 0 20px',fontSize:13,color:COR.textoSuave}}>
                        Nenhuma conta bancÃ¡ria cadastrada.
                      </div>
                    )}
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                      padding:'10px 14px',borderRadius:10,background:'#f0f9ff',
                      border:`1px solid ${COR.azul}44`,marginBottom:16}}>
                      <span style={{fontSize:13,color:COR.textoSuave,fontWeight:500}}>Total selecionado</span>
                      <span style={{fontSize:18,fontWeight:700,color:COR.azulEscuro}}>
                        {totalSaldo.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                      </span>
                    </div>
                    <p style={{fontSize:13,color:COR.textoSuave,marginBottom:12,marginTop:0}}>
                      Deseja considerar esse saldo no planejamento?
                    </p>
                    <div style={{display:'flex',gap:10}}>
                      <button onClick={() => {
                        setQuizConsiderarSaldo(true)
                        setQuizContasExcluidas(new Set())
                      }} style={{
                        flex:1,padding:'11px',borderRadius:10,cursor:'pointer',fontFamily:'inherit',
                        border:`2px solid ${quizConsiderarSaldo===true?COR.azul:COR.borda}`,
                        background:quizConsiderarSaldo===true?'#eff6ff':COR.branco,
                        color:quizConsiderarSaldo===true?COR.azul:COR.textoSuave,
                        fontWeight:600,fontSize:13,transition:'all .15s'}}>
                        âœ“ Sim, considerar
                      </button>
                      <button onClick={() => {
                        setQuizConsiderarSaldo(false)
                        setQuizContasExcluidas(new Set(contasBanco.map(c => c.id)))
                      }} style={{
                        flex:1,padding:'11px',borderRadius:10,cursor:'pointer',fontFamily:'inherit',
                        border:`2px solid ${quizConsiderarSaldo===false?COR.azul:COR.borda}`,
                        background:quizConsiderarSaldo===false?'#eff6ff':COR.branco,
                        color:quizConsiderarSaldo===false?COR.azul:COR.textoSuave,
                        fontWeight:600,fontSize:13,transition:'all .15s'}}>
                        âœ— NÃ£o considerar
                      </button>
                    </div>
                  </div>
                )
              })()}

              {/* Passo 3 â€” Entradas */}
              {quizStep === 3 && (() => {
                const cats = categorias.filter(c => c.tipo==='entrada' && c.ativa).sort((a,b) => a.nome.localeCompare(b.nome,'pt-BR'))
                if (cats.length === 0) return (
                  <div style={{textAlign:'center',padding:'12px 0'}}>
                    <p style={{fontSize:13,color:COR.textoSuave,margin:'0 0 12px'}}>
                      Nenhuma categoria de receita ativa.
                    </p>
                    <button onClick={() => { setQuizAtivo(false); navigate('/configuracoes', { state: { aba: 'categorias' } }) }}
                      style={{padding:'9px 20px',border:'none',borderRadius:8,cursor:'pointer',
                        background:COR.azul,color:'#fff',fontSize:13,fontWeight:600,fontFamily:'inherit'}}>
                      Ir para Categorias â†’
                    </button>
                  </div>
                )
                return <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  <p style={{fontSize:12,color:COR.textoSuave,margin:'0 0 6px'}}>Informe o valor que vocÃª recebe mensalmente em cada categoria.</p>
                  {cats.map(c => {
                    const {icone,cor} = iconeCategoria(categorias, c.nome)
                    return <div key={c.id} style={{display:'flex',alignItems:'center',gap:10,
                      padding:'8px 12px',borderRadius:10,border:`1px solid ${COR.borda}`,background:'#fafafa'}}>
                      <div style={{width:32,height:32,borderRadius:8,background:cor+'22',
                        display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{icone}</div>
                      <div style={{flex:1,display:'flex',flexDirection:'column',gap:1}}>
                        <span style={{fontSize:13,fontWeight:500,color:COR.texto}}>{c.nome}</span>
                        {c.descricao && <span style={{fontSize:11,color:COR.textoSuave,lineHeight:1.3}}>{c.descricao}</span>}
                      </div>
                      <input value={quizEntradas[c.id]??''}
                        onChange={e => setQuizEntradas(p=>({...p,[c.id]:e.target.value}))}
                        onFocus={e => e.target.select()}
                        onBlur={e => { const n=parseBRL(e.target.value); if(n>0) setQuizEntradas(p=>({...p,[c.id]:n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})})) }}
                        placeholder="0,00"
                        style={{width:120,padding:'6px 10px',borderRadius:8,fontSize:13,fontWeight:600,
                          border:`1.5px solid ${COR.borda}`,outline:'none',textAlign:'right',
                          fontFamily:'inherit',color:COR.verde}}/>
                    </div>
                  })}
                </div>
              })()}

              {/* Passos de saÃ­das â€” um por grupo */}
              {quizStep >= 4 && quizStep < QUIZ_STEP_RESUMO && (() => {
                const grupoAtual = quizGruposAtivos[quizStep - 4]
                const cats = categorias.filter(c => c.tipo==='saida' && c.ativa && !nomeFaturaCartao(c.nome, cartaoNomes))
                  .filter(c => grupoAtual === '__sem_grupo__' ? !c.grupo : c.grupo === grupoAtual)
                  .sort((a,b) => a.nome.localeCompare(b.nome,'pt-BR'))
                const totalEntradas   = Object.values(quizEntradas).reduce((s,v)=>s+parseBRL(v),0)
                const totalSaidasTudo = Object.values(quizSaidas).reduce((s,v)=>s+parseBRL(v),0)
                const totalGrupo      = cats.reduce((s,c)=>s+parseBRL(quizSaidas[c.id]??'0'),0)
                const percGrupo  = totalEntradas>0 ? totalGrupo/totalEntradas*100 : 0
                const percTotal  = totalEntradas>0 ? totalSaidasTudo/totalEntradas*100 : 0
                const corBarra   = percTotal>100?COR.vermelho:percTotal>80?'#f59e0b':COR.verde
                return <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  <p style={{fontSize:12,color:COR.textoSuave,margin:'0 0 6px'}}>Informe uma mÃ©dia mensal para cada despesa.</p>
                  {cats.map(c => {
                    const {icone,cor} = iconeCategoria(categorias, c.nome)
                    return <div key={c.id} style={{display:'flex',alignItems:'center',gap:10,
                      padding:'8px 12px',borderRadius:10,border:`1px solid ${COR.borda}`,background:'#fafafa'}}>
                      <div style={{width:32,height:32,borderRadius:8,background:cor+'22',
                        display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{icone}</div>
                      <div style={{flex:1,display:'flex',flexDirection:'column',gap:1}}>
                        <span style={{fontSize:13,fontWeight:500,color:COR.texto}}>{c.nome}</span>
                        {c.descricao && <span style={{fontSize:11,color:COR.textoSuave,lineHeight:1.3}}>{c.descricao}</span>}
                      </div>
                      <input value={quizSaidas[c.id]??''}
                        onChange={e => setQuizSaidas(p=>({...p,[c.id]:e.target.value}))}
                        onFocus={e => e.target.select()}
                        onBlur={e => { const n=parseBRL(e.target.value); if(n>0) setQuizSaidas(p=>({...p,[c.id]:n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})})) }}
                        placeholder="0,00"
                        style={{width:120,padding:'6px 10px',borderRadius:8,fontSize:13,fontWeight:600,
                          border:`1.5px solid ${COR.borda}`,outline:'none',textAlign:'right',
                          fontFamily:'inherit',color:COR.vermelho}}/>
                    </div>
                  })}
                  {totalEntradas > 0 && (
                    <div style={{marginTop:4,padding:'10px 14px',borderRadius:10,
                      background:'#f8faff',border:`1px solid ${COR.borda}`}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:3}}>
                        <span style={{color:COR.textoSuave}}>Este grupo</span>
                        <span style={{fontWeight:600,color:COR.vermelho}}>
                          {totalGrupo.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                          {percGrupo>0&&<span style={{color:COR.textoSuave,fontWeight:400}}> Â· {percGrupo.toFixed(0)}% da receita</span>}
                        </span>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:8}}>
                        <span style={{color:COR.textoSuave}}>Total comprometido</span>
                        <span style={{fontWeight:600,color:percTotal>100?COR.vermelho:COR.texto}}>
                          {totalSaidasTudo.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                          <span style={{color:COR.textoSuave,fontWeight:400}}> Â· {percTotal.toFixed(0)}% de {totalEntradas.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</span>
                        </span>
                      </div>
                      <div style={{height:5,borderRadius:3,background:'#e2e8f0',overflow:'hidden'}}>
                        <div style={{height:'100%',borderRadius:3,background:corBarra,
                          width:`${Math.min(percTotal,100)}%`,transition:'width .4s'}}/>
                      </div>
                    </div>
                  )}
                </div>
              })()}

              {/* Resumo final */}
              {quizStep === QUIZ_STEP_RESUMO && (() => {
                const mesAtual  = new Date().getMonth()
                const mesesRest = 12 - mesAtual
                const totalE    = Object.values(quizEntradas).reduce((s,v)=>s+parseBRL(v),0)
                const totalS    = Object.values(quizSaidas).reduce((s,v)=>s+parseBRL(v),0)
                const saldoIni  = quizConsiderarSaldo
                  ? contas.filter(c=>(c.tipo==='corrente'||c.tipo==='poupanca')&&!quizContasExcluidas.has(c.id)).reduce((s,c)=>s+c.saldoInicial,0)
                  : 0
                const saldoMes  = totalE - totalS
                const nomesMes  = ['Janeiro','Fevereiro','MarÃ§o','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
                const labels: Record<string,string> = {guardar:'ðŸ’° Guardar dinheiro',organizar:'ðŸ“‹ Organizar gastos',quitar:'ðŸ’³ Quitar dÃ­vidas',tudo:'ðŸŽ¯ Tudo isso'}
                return <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {quizObjetivo && <div style={{fontSize:13,color:COR.textoSuave,marginBottom:2}}>
                    Objetivo: <strong style={{color:COR.texto}}>{labels[quizObjetivo]}</strong>
                  </div>}
                  <div style={{marginBottom:4}}>
                    <div style={{fontSize:12,color:COR.texto,fontWeight:600,marginBottom:8}}>
                      Aplicar valores em quais meses?
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      {([
                        {v:false, label:`A partir de ${nomesMes[mesAtual]}`, desc:`${mesesRest} ${mesesRest===1?'mÃªs':'meses'}`},
                        {v:true,  label:'Todos os meses',                    desc:'Janeiro a Dezembro'},
                      ] as const).map(op => (
                        <button key={String(op.v)} onClick={() => setQuizTodosMeses(op.v)} style={{
                          flex:1,padding:'8px 10px',borderRadius:9,cursor:'pointer',fontFamily:'inherit',
                          border:`2px solid ${quizTodosMeses===op.v?COR.azul:COR.borda}`,
                          background:quizTodosMeses===op.v?'#eff6ff':COR.branco,
                          textAlign:'left',transition:'all .15s'}}>
                          <div style={{fontSize:12,fontWeight:600,color:quizTodosMeses===op.v?COR.azul:COR.texto}}>{op.label}</div>
                          <div style={{fontSize:10,color:COR.textoSuave,marginTop:2}}>{op.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  {([
                    {label:'Saldo inicial',        v:saldoIni, c:'#1a56db'},
                    {label:'Receitas / mÃªs',        v:totalE,   c:COR.verde},
                    {label:'Despesas / mÃªs',        v:totalS,   c:COR.vermelho},
                    {label:'Resultado',              v:saldoMes, c:saldoMes>=0?COR.verde:COR.vermelho},
                  ] as const).map(({label,v,c})=>(
                    <div key={label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                      padding:'10px 14px',borderRadius:10,background:c+'11',border:`1px solid ${c}33`}}>
                      <span style={{fontSize:12,color:COR.textoSuave,fontWeight:500}}>{label}</span>
                      <span style={{fontSize:14,fontWeight:700,color:c}}>
                        {v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                      </span>
                    </div>
                  ))}
                </div>
              })()}
                          </>
              )}</div>

            {/* RodapÃ© */}
            <div style={{padding:'14px 28px 24px',display:'flex',gap:10,borderTop:`1px solid ${COR.borda}`,flexShrink:0}}>
              {quizConcluido ? (
              <button data-quiz-nav='' onClick={() => { setQuizAtivo(false); setQuizConcluido(false); setAba('previsto') }} style={{
                flex:1,padding:'10px',borderRadius:9,border:'none',fontFamily:'inherit',
                background:`linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,color:'#fff',
                fontSize:13,fontWeight:700,cursor:'pointer'}}>
                Ver meu planejamento â†’
              </button>
              ) : (<>
              {quizStep > 0 && (
                <button data-quiz-nav='' onClick={() => setQuizStep(s=>s-1)} style={{
                  flex:1,padding:'10px',borderRadius:9,border:`1.5px solid ${COR.borda}`,
                  background:'#f8faff',color:COR.textoSuave,fontSize:13,fontWeight:600,
                  cursor:'pointer',fontFamily:'inherit'}}>â† Voltar</button>
              )}
              {quizStep < QUIZ_STEP_RESUMO ? (
                <button data-quiz-nav='' onClick={() => setQuizStep(s=>s+1)}
                  disabled={(quizStep===0 && !quizObjetivo) || (quizStep===2 && quizConsiderarSaldo===null)}
                  style={{flex:2,padding:'10px',borderRadius:9,border:'none',fontFamily:'inherit',
                    background:((quizStep===0&&!quizObjetivo)||(quizStep===2&&quizConsiderarSaldo===null))?'#e2e8f0':`linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,
                    color:((quizStep===0&&!quizObjetivo)||(quizStep===2&&quizConsiderarSaldo===null))?COR.textoSuave:'#fff',
                    fontSize:13,fontWeight:700,
                    cursor:((quizStep===0&&!quizObjetivo)||(quizStep===2&&quizConsiderarSaldo===null))?'default':'pointer'}}>
                  PrÃ³ximo â†’
                </button>
              ) : (
                <button data-quiz-nav='' onClick={confirmarQuiz} style={{
                  flex:2,padding:'10px',borderRadius:9,border:'none',
                  background:`linear-gradient(135deg,${COR.verde},#15803d)`,
                  color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                  âœ“ Criar meu planejamento
                </button>
              )}              </>)}
            
            </div>
          </div>
        </div>
      )}


      {/* â”€â”€ MODAL CONFIRMAR REFAZER / BLOQUEADO â”€â”€ */}
      {confirmarRefazer && (
        <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.55)',zIndex:400,
          display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:440,
            boxShadow:'0 20px 50px rgba(0,0,0,0.3)',overflow:'hidden'}}>
            {confirmarRefazer === 'refazer' ? (
              <div>
                <div style={{padding:'24px 24px 16px'}}>
                  <div style={{fontSize:18,fontWeight:700,color:'#0f172a',marginBottom:8}}>Refazer planejamento?</div>
                  <div style={{fontSize:13,color:'#64748b',lineHeight:1.6}}>
                    Isso irÃ¡ apagar o planejamento atual e iniciar o quiz novamente para criar um novo. Esta aÃ§Ã£o nÃ£o pode ser desfeita.
                  </div>
                </div>
                <div style={{padding:'0 24px 24px',display:'flex',gap:10}}>
                  <button onClick={() => setConfirmarRefazer(false)} style={{
                    flex:1,padding:'10px',borderRadius:9,border:'1.5px solid #e2e8f0',
                    background:'#f8faff',color:'#64748b',fontSize:13,fontWeight:600,
                    cursor:'pointer',fontFamily:'inherit'}}>
                    Cancelar
                  </button>
                  <button onClick={() => {
                    setConfirmarRefazer(false)
                    setQuizAtivo(true)
                    setQuizStep(0)
                    setQuizConcluido(false)
                    setQuizObjetivo('')
                    setQuizConsiderarSaldo(null)
                    setQuizEntradas({})
                    setQuizSaidas({})
                  }} style={{
                    flex:2,padding:'10px',borderRadius:9,border:'none',
                    background:'linear-gradient(135deg,#dc2626,#b91c1c)',
                    color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                    Sim, refazer
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{padding:'24px 24px 16px'}}>
                  <div style={{fontSize:18,fontWeight:700,color:'#0f172a',marginBottom:8}}>Planejamento bloqueado</div>
                  <div style={{fontSize:13,color:'#64748b',lineHeight:1.6}}>
                    Para refazer o quiz e criar um novo planejamento, Ã© necessÃ¡rio desbloquear o planejamento primeiro. Acesse as preferÃªncias para liberar a ediÃ§Ã£o.
                  </div>
                </div>
                <div style={{padding:'0 24px 24px',display:'flex',gap:10}}>
                  <button onClick={() => setConfirmarRefazer(false)} style={{
                    flex:1,padding:'10px',borderRadius:9,border:'1.5px solid #e2e8f0',
                    background:'#f8faff',color:'#64748b',fontSize:13,fontWeight:600,
                    cursor:'pointer',fontFamily:'inherit'}}>
                    Fechar
                  </button>
                  <button onClick={() => { setConfirmarRefazer(false); navigate('/configuracoes', { state: { aba: 'perfil' } }) }} style={{
                    flex:2,padding:'10px',borderRadius:9,border:'none',
                    background:'linear-gradient(135deg,#0f2878,#1a56db)',
                    color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                    Ir para PreferÃªncias
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* â”€â”€ MODAL CONFIRMAR ATUALIZAR PLANO â”€â”€ */}
      {confirmarAtualizar && (
        <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.55)',zIndex:400,
          display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:400,
            boxShadow:'0 20px 50px rgba(0,0,0,0.3)',overflow:'hidden'}}>
            <div style={{padding:'24px 24px 16px'}}>
              <div style={{fontSize:22,textAlign:'center',marginBottom:12}}>âš ï¸</div>
              <div style={{fontSize:16,fontWeight:700,color:'#0f172a',marginBottom:8}}>Atualizar Plano Atualizado?</div>
              <div style={{fontSize:13,color:'#64748b',lineHeight:1.6}}>
                O Plano Atualizado serÃ¡ substituÃ­do por uma cÃ³pia do Plano Original atual.
                EdiÃ§Ãµes manuais que vocÃª fez em meses futuros no Plano Atualizado serÃ£o perdidas.
              </div>
            </div>
            <div style={{padding:'0 24px 24px',display:'flex',gap:10}}>
              <button onClick={() => setConfirmarAtualizar(false)} style={{
                flex:1,padding:'10px',borderRadius:9,border:'1.5px solid #e2e8f0',
                background:'#f8faff',color:'#64748b',fontSize:13,fontWeight:600,
                cursor:'pointer',fontFamily:'inherit'}}>
                Cancelar
              </button>
              <button onClick={() => {
                finalizarPlanejamento(anoAtual, dadosPrevisto as PlanoAnoData)
                setConfirmarAtualizar(false)
              }} style={{
                flex:2,padding:'10px',borderRadius:9,border:'none',
                background:`linear-gradient(135deg,${COR.azulEscuro},${COR.azulMedio})`,
                color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                Sim, atualizar
              </button>
            </div>
          </div>
        </div>
      )}

            {/* LEGENDA */}
      <div style={{ display:'flex', gap:20, padding:'6px 24px 12px',
        fontSize:11, color:COR.textoSuave, flexWrap:'wrap',
        flexShrink:0, alignItems:'center', borderTop:`1px solid ${COR.borda}` }}>
        <span style={{ display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ background:'#eff6ff', color:'#1a56db',
            padding:'1px 6px', borderRadius:3, fontWeight:700, fontSize:10 }}>B</span>
          Banco
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ background:'#f3e8ff', color:'#7c3aed',
            padding:'1px 6px', borderRadius:3, fontWeight:700, fontSize:10 }}>C</span>
          CartÃ£o
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ background:'#f0fdf4', color:'#16a34a',
            padding:'1px 6px', borderRadius:3, fontWeight:700, fontSize:10 }}>D</span>
          Dinheiro
        </span>
        <span>â†’Dez Replicar valor do mÃªs atÃ© dezembro</span>
        <span style={{ color:'#7c3aed' }}>(auto) Fatura calculada automaticamente do mÃªs anterior</span>
      </div>

    {/* â”€â”€ MODAL DETALHES CATEGORIA REALIZADO â”€â”€ */}
    {modalCatReal && modalDados && (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:9999,
        display:'flex', alignItems:'center', justifyContent:'center' }}
        onClick={() => setModalCatReal(null)}>
        <div style={{ background:COR.branco, borderRadius:16, padding:24, maxWidth:460, width:'90%',
          maxHeight:'80vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}
          onClick={e => e.stopPropagation()}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:modalDados.corIcone,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{modalDados.icone}</div>
            <div>
              <div style={{ fontSize:16, fontWeight:700, color:COR.texto }}>{modalDados.nome}</div>
              <div style={{ fontSize:12, color:COR.textoSuave }}>{MESES[modalDados.mi]} {anoAtual}</div>
            </div>
            <button onClick={() => setModalCatReal(null)}
              style={{ marginLeft:'auto', border:'none', background:'transparent',
                cursor:'pointer', fontSize:22, color:COR.textoSuave, lineHeight:1 }}>Ã—</button>
          </div>
          <div style={{ display:'flex', gap:8, marginBottom:16 }}>
            <div style={{ flex:1, padding:'10px 12px', borderRadius:10, background:'#f8fafc', border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:.5, color:COR.textoSuave, marginBottom:4 }}>Previsto</div>
              <div style={{ fontSize:15, fontWeight:700, color:COR.texto }}>
                {modalDados.previsto > 0 ? modalDados.previsto.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : 'â€”'}
              </div>
            </div>
            <div style={{ flex:1, padding:'10px 12px', borderRadius:10,
              background: modalDados.lancAbs === 0 ? '#f8fafc' : modalDados.dentro ? '#f0fdf4' : '#fef2f2',
              border:`1px solid ${modalDados.lancAbs === 0 ? '#e2e8f0' : modalDados.dentro ? '#bbf7d0' : '#fecaca'}` }}>
              <div style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:.5, marginBottom:4,
                color: modalDados.lancAbs === 0 ? COR.textoSuave : modalDados.dentro ? '#16a34a' : COR.vermelho }}>Realizado</div>
              <div style={{ fontSize:15, fontWeight:700, color: modalDados.lancAbs === 0 ? COR.textoSuave : modalDados.dentro ? '#16a34a' : COR.vermelho }}>
                {modalDados.lancAbs > 0 ? modalDados.lancAbs.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : 'â€”'}
              </div>
            </div>
            {modalDados.previsto > 0 && (
              <div style={{ flex:1, padding:'10px 12px', borderRadius:10,
                background: modalDados.disponivel >= 0 ? '#f0fdf4' : '#fef2f2',
                border:`1px solid ${modalDados.disponivel >= 0 ? '#bbf7d0' : '#fecaca'}` }}>
                <div style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:.5, marginBottom:4,
                  color: modalDados.disponivel >= 0 ? '#16a34a' : COR.vermelho }}>DisponÃ­vel</div>
                <div style={{ fontSize:15, fontWeight:700, color: modalDados.disponivel >= 0 ? '#16a34a' : COR.vermelho }}>
                  {modalDados.disponivel.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                </div>
              </div>
            )}
          </div>
          {(modalDados.totalBanc !== 0 || modalDados.totalCart !== 0) && (
            <div style={{ display:'flex', gap:8, marginBottom:16 }}>
              {modalDados.totalBanc !== 0 && (
                <div style={{ flex:1, padding:'8px 12px', borderRadius:8, background:'#f0f9ff', border:'1px solid #bae6fd' }}>
                  <div style={{ fontSize:10, color:'#0369a1', fontWeight:600, marginBottom:2 }}>ðŸ¦ Banco</div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#0369a1' }}>
                    {modalDados.totalBanc.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                  </div>
                </div>
              )}
              {modalDados.totalCart !== 0 && (
                <div style={{ flex:1, padding:'8px 12px', borderRadius:8, background:'#faf5ff', border:'1px solid #e9d5ff' }}>
                  <div style={{ fontSize:10, color:'#7c3aed', fontWeight:600, marginBottom:2 }}>ðŸ’³ CartÃ£o</div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#7c3aed' }}>
                    {modalDados.totalCart.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                  </div>
                </div>
              )}
            </div>
          )}
          {modalDados.allLancs.length > 0 && (() => {
            const byDay: Record<number, typeof modalDados.allLancs> = {}
            modalDados.allLancs.forEach(l => { if (!byDay[l.dia]) byDay[l.dia] = []; byDay[l.dia].push(l) })
            const dias = Object.keys(byDay).map(Number).sort((a, b) => a - b)
            return (
              <div>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase',
                  letterSpacing:.5, color:COR.textoSuave, marginBottom:8 }}>LanÃ§amentos</div>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {dias.map(dia => (
                    <div key={dia}>
                      <div style={{ fontSize:11, fontWeight:700, color:COR.textoSuave,
                        background:'#f1f5f9', borderRadius:6, padding:'3px 10px',
                        marginBottom:5, display:'inline-block' }}>
                        {dia} de {MESES[modalDados.mi]}
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                        {byDay[dia].map((l, i) => (
                          <div key={i} style={{ display:'flex', alignItems:'center', gap:8,
                            padding:'7px 10px', borderRadius:8, background:'#f8fafc', border:'1px solid #f1f5f9' }}>
                            <span style={{ fontSize:14, flexShrink:0 }}>{l.icone}</span>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:12, color:COR.texto, fontWeight:500,
                                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                {l.descricao || modalDados.nome}
                              </div>
                              {l.sub && <div style={{ fontSize:10, color:COR.textoSuave }}>{l.sub}</div>}
                            </div>
                            <div style={{ fontSize:12, fontWeight:700, flexShrink:0,
                              color: l.valor < 0 ? '#16a34a' : COR.texto }}>
                              {l.valor.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
          {modalDados.allLancs.length === 0 && (
            <div style={{ textAlign:'center', padding:'20px 0', color:COR.textoSuave, fontSize:13 }}>
              Nenhum lanÃ§amento individual encontrado.<br/>
              <span style={{ fontSize:11 }}>Valores podem vir de fixas consolidadas automaticamente.</span>
            </div>
          )}
        </div>
      </div>
    )}

    {/* â”€â”€ MODAL REVISÃƒO POR DESVIO â”€â”€ */}
    {modalRevisao && (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:9999,
        display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
        onClick={() => setModalRevisao(false)}>
        <div style={{ background:COR.branco, borderRadius:16, padding:24, maxWidth:560, width:'100%',
          maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}
          onClick={e => e.stopPropagation()}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, flexShrink:0 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:'#eff6ff',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>ðŸ“Š</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:16, fontWeight:700, color:COR.texto }}>RevisÃ£o por Desvio</div>
              <div style={{ fontSize:12, color:COR.textoSuave }}>
                AnÃ¡lise de {mesAtual} {mesAtual === 1 ? 'mÃªs' : 'meses'} realizados Â· ajusta {MESES_FULL[mesAtual]} a Dezembro
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
              <span style={{ fontSize:11, color:COR.textoSuave, whiteSpace:'nowrap' }}>Desvio mÃ­n.</span>
              <div style={{ display:'flex', gap:3 }}>
                {[5, 10, 15, 20].map(p => (
                  <button key={p} onClick={() => {
                    setModalDesvioPerc(p)
                    setDesvioMinPerc(p)
                    setRevisaoItens(computeRevisaoItens(p))
                  }} style={{ padding:'3px 7px', fontFamily:'inherit', fontSize:11, fontWeight:600,
                    border:`1.5px solid ${modalDesvioPerc === p ? '#2563eb' : COR.borda}`, borderRadius:5,
                    cursor:'pointer', background: modalDesvioPerc === p ? '#eff6ff' : COR.branco,
                    color: modalDesvioPerc === p ? '#2563eb' : COR.textoSuave }}>
                    {p}%
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => setModalRevisao(false)} style={{ border:'none', background:'transparent', cursor:'pointer', fontSize:22, color:COR.textoSuave, lineHeight:1, marginLeft:4 }}>Ã—</button>
          </div>

          {revisaoItens.length === 0 ? (
            <div style={{ textAlign:'center', padding:'32px 0', color:COR.textoSuave, fontSize:13 }}>
              <div style={{ fontSize:32, marginBottom:12 }}>âœ…</div>
              Nenhuma categoria com desvio acima de {modalDesvioPerc}% encontrada.
              <br/><span style={{ fontSize:11 }}>Seu planejamento estÃ¡ bem alinhado com o realizado!</span>
            </div>
          ) : (
            <>
              <div style={{ fontSize:12, color:COR.textoSuave, marginBottom:14, padding:'8px 12px',
                background:'#eff6ff', borderRadius:8, flexShrink:0 }}>
                Categorias com desvio acima de {modalDesvioPerc}% entre o previsto e o realizado. O novo valor serÃ¡ aplicado de <strong>{MESES_FULL[mesAtual]}</strong> a Dezembro.
              </div>
              <div style={{ overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:12 }}>
                {(['entrada','saida'] as const).map(tipo => {
                  const lista = revisaoItens.filter(i => i.tipo === tipo)
                  if (lista.length === 0) return null
                  return (
                    <div key={tipo}>
                      <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5,
                        marginBottom:6, color: tipo === 'entrada' ? '#16a34a' : COR.vermelho }}>
                        {tipo === 'entrada' ? 'Receitas' : 'Despesas'}
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        {lista.map(item => {
                          const maisReal = tipo === 'entrada' ? item.prevReal > item.prevPlanned : item.prevReal < item.prevPlanned
                          return (
                            <div key={item.nome} style={{ display:'flex', alignItems:'center', gap:10,
                              padding:'10px 12px', borderRadius:10, background:'#f8fafc', border:'1px solid #e2e8f0' }}>
                              <div style={{ width:30, height:30, borderRadius:8, background:item.corIcone,
                                display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>
                                {item.icone}
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:13, fontWeight:600, color:COR.texto }}>{item.nome}</div>
                                <div style={{ fontSize:11, color:COR.textoSuave, marginTop:2 }}>
                                  Previsto {fmt(item.prevPlanned,true)} Â· Realizado {fmt(item.prevReal,true)}
                                  <span style={{ marginLeft:6, fontWeight:700, color: maisReal ? '#16a34a' : COR.vermelho }}>
                                    {Math.round(item.desvioPerc * 100)}% desvio
                                  </span>
                                </div>
                              </div>
                              <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                                <span style={{ fontSize:11, color:COR.textoSuave }}>R$</span>
                                <input type="number" value={item.novoValor}
                                  onChange={e => setRevisaoItens(prev => prev.map(it =>
                                    it.nome === item.nome && it.tipo === item.tipo ? { ...it, novoValor: e.target.value } : it))}
                                  style={{ width:90, padding:'4px 8px', border:'1px solid #e2e8f0', borderRadius:6,
                                    fontSize:13, fontWeight:600, textAlign:'right', outline:'none', fontFamily:'inherit' }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ display:'flex', gap:8, marginTop:16, flexShrink:0 }}>
                <button onClick={() => setModalRevisao(false)}
                  style={{ flex:1, padding:'10px 0', border:`1px solid ${COR.borda}`, borderRadius:9, cursor:'pointer',
                    fontSize:13, fontWeight:600, color:COR.textoSuave, background:'transparent', fontFamily:'inherit' }}>
                  Cancelar
                </button>
                <button onClick={aplicarRevisao}
                  style={{ flex:2, padding:'10px 0', border:'none', borderRadius:9, cursor:'pointer',
                    fontSize:13, fontWeight:600, color:'#fff', fontFamily:'inherit',
                    background:`linear-gradient(135deg,${COR.azulEscuro},${COR.azulMedio})` }}>
                  âœ“ Aplicar {revisaoItens.length} {revisaoItens.length === 1 ? 'ajuste' : 'ajustes'} nos meses restantes
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )}

    {/* â”€â”€ MODAL EVENTO DE VIDA â”€â”€ */}
    {modalEvento && (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:9999,
        display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
        onClick={() => setModalEvento(null)}>
        <div style={{ background:COR.branco, borderRadius:16, padding:24, maxWidth:460, width:'100%',
          boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}
          onClick={e => e.stopPropagation()}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:'#fef3c7',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>âš¡</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:16, fontWeight:700, color:COR.texto }}>Evento de Vida</div>
              <div style={{ fontSize:12, color:COR.textoSuave }}>
                Passo {modalEvento.step} de 2 Â· {modalEvento.step === 1 ? 'Tipo e inÃ­cio' : 'Categoria e valor'}
              </div>
            </div>
            <button onClick={() => setModalEvento(null)} style={{ border:'none', background:'transparent', cursor:'pointer', fontSize:22, color:COR.textoSuave, lineHeight:1 }}>Ã—</button>
          </div>

          {modalEvento.step === 1 && (<>
            <div style={{ fontSize:11, fontWeight:700, color:COR.textoSuave, textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>Tipo do evento</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:20 }}>
              {([
                { id:'nova_renda' as const,   emoji:'ðŸ’°', label:'Nova Renda',       desc:'Novo emprego, freelance, aluguel',  catTipo:'entrada' as const },
                { id:'novo_gasto' as const,   emoji:'ðŸ“‹', label:'Novo Gasto Fixo',  desc:'Financiamento, assinatura, escola', catTipo:'saida' as const },
                { id:'encerramento' as const, emoji:'âœ‚ï¸', label:'Encerramento',      desc:'Pagou parcela, cancelou plano',     catTipo:'saida' as const },
                { id:'ajuste' as const,       emoji:'ðŸ”§', label:'Ajuste de Valor',  desc:'Aumento de salÃ¡rio, reajuste',      catTipo:'entrada' as const },
              ]).map(ev => (
                <button key={ev.id}
                  onClick={() => setModalEvento(prev => prev ? { ...prev, tipo:ev.id, catTipo:ev.catTipo, catNome:'' } : prev)}
                  style={{ padding:'12px', borderRadius:10, border:`2px solid ${modalEvento.tipo === ev.id ? COR.azul : COR.borda}`,
                    cursor:'pointer', textAlign:'left', fontFamily:'inherit', transition:'all .15s',
                    background: modalEvento.tipo === ev.id ? '#eff6ff' : COR.branco }}>
                  <div style={{ fontSize:20, marginBottom:4 }}>{ev.emoji}</div>
                  <div style={{ fontSize:12, fontWeight:700, color:COR.texto, marginBottom:2 }}>{ev.label}</div>
                  <div style={{ fontSize:10, color:COR.textoSuave, lineHeight:1.4 }}>{ev.desc}</div>
                </button>
              ))}
            </div>
            <div style={{ fontSize:11, fontWeight:700, color:COR.textoSuave, textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>A partir de qual mÃªs</div>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:20 }}>
              {MESES.map((mes, mi) => (
                <button key={mi} disabled={mi < mesAtual}
                  onClick={() => setModalEvento(prev => prev ? { ...prev, mesInicio:mi } : prev)}
                  style={{ padding:'4px 10px', borderRadius:6, cursor: mi < mesAtual ? 'default' : 'pointer',
                    border:`1px solid ${modalEvento.mesInicio === mi ? COR.azul : COR.borda}`, fontSize:11, fontWeight:600, fontFamily:'inherit',
                    background: modalEvento.mesInicio === mi ? '#eff6ff' : mi < mesAtual ? '#f8fafc' : COR.branco,
                    color: modalEvento.mesInicio === mi ? COR.azul : mi < mesAtual ? '#cbd5e1' : COR.texto }}>
                  {mes}
                </button>
              ))}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setModalEvento(null)}
                style={{ flex:1, padding:'10px 0', border:`1px solid ${COR.borda}`, borderRadius:9, cursor:'pointer',
                  fontSize:13, fontWeight:600, color:COR.textoSuave, background:'transparent', fontFamily:'inherit' }}>
                Cancelar
              </button>
              <button disabled={!modalEvento.tipo}
                onClick={() => modalEvento.tipo && setModalEvento(prev => prev ? { ...prev, step:2 } : prev)}
                style={{ flex:2, padding:'10px 0', border:'none', borderRadius:9, fontSize:13, fontWeight:600, color:'#fff', fontFamily:'inherit',
                  cursor: modalEvento.tipo ? 'pointer' : 'default',
                  background: modalEvento.tipo ? `linear-gradient(135deg,${COR.azulEscuro},${COR.azulMedio})` : '#cbd5e1' }}>
                PrÃ³ximo â†’
              </button>
            </div>
          </>)}

          {modalEvento.step === 2 && (() => {
            const TIPO_INFO: Record<string,{emoji:string;label:string}> = {
              nova_renda:{emoji:'ðŸ’°',label:'Nova Renda'}, novo_gasto:{emoji:'ðŸ“‹',label:'Novo Gasto Fixo'},
              encerramento:{emoji:'âœ‚ï¸',label:'Encerramento'}, ajuste:{emoji:'ðŸ”§',label:'Ajuste de Valor'}
            }
            const info = TIPO_INFO[modalEvento.tipo] ?? { emoji:'âš¡', label:'Evento' }
            const ehEncerramento = modalEvento.tipo === 'encerramento'
            const ehAjuste = modalEvento.tipo === 'ajuste'
            const realAno = planosReal[anoAtual] as AnoData | undefined
            const origAno = planos[anoAtual]    as AnoData | undefined
            const catList = (() => {
              const fromReal = modalEvento.catTipo === 'entrada' ? realAno?.entradas : realAno?.saidas
              if (fromReal && fromReal.length > 0) return fromReal
              return (modalEvento.catTipo === 'entrada' ? origAno?.entradas : origAno?.saidas) ?? []
            })()
            const catFromReal = modalEvento.catNome
              ? catList === (modalEvento.catTipo === 'entrada' ? realAno?.entradas : realAno?.saidas)
                ? catList.find(c => c.nome === modalEvento.catNome)
                : undefined
              : undefined
            const catFromOrig = modalEvento.catNome && !catFromReal
              ? (modalEvento.catTipo === 'entrada' ? origAno?.entradas : origAno?.saidas)?.find(c => c.nome === modalEvento.catNome)
              : undefined
            const catSource = catFromReal ?? catFromOrig ?? (modalEvento.catNome ? catList.find(c => c.nome === modalEvento.catNome) : undefined)
            const fonteLabel = realAno && (modalEvento.catTipo === 'entrada' ? realAno.entradas : realAno.saidas).some(c => c.nome === modalEvento.catNome)
              ? 'Atualizado' : 'Original'
            const valorExistente = catSource?.v[modalEvento.mesInicio] ?? 0
            const adicional = parseFloat(modalEvento.novoValor) || 0
            const podeAplicar = !!modalEvento.catNome && (ehEncerramento || !!modalEvento.novoValor)
            return (<>
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px',
                background:'#f8fafc', borderRadius:8, marginBottom:16 }}>
                <span style={{ fontSize:16 }}>{info.emoji}</span>
                <span style={{ fontSize:13, fontWeight:600, color:COR.texto }}>{info.label}</span>
                <span style={{ fontSize:12, color:COR.textoSuave }}>Â· a partir de {MESES_FULL[modalEvento.mesInicio]}</span>
              </div>

              {ehAjuste && (
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:COR.textoSuave, textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>Tipo da categoria</div>
                  <div style={{ display:'flex', gap:6 }}>
                    {(['entrada','saida'] as const).map(t => (
                      <button key={t}
                        onClick={() => setModalEvento(prev => prev ? { ...prev, catTipo:t, catNome:'' } : prev)}
                        style={{ flex:1, padding:'6px 0', borderRadius:7, cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'inherit',
                          border:`1px solid ${modalEvento.catTipo === t ? COR.azul : COR.borda}`,
                          background: modalEvento.catTipo === t ? '#eff6ff' : COR.branco,
                          color: modalEvento.catTipo === t ? COR.azul : COR.textoSuave }}>
                        {t === 'entrada' ? 'â†‘ Entrada' : 'â†“ SaÃ­da'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ fontSize:11, fontWeight:700, color:COR.textoSuave, textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>Categoria</div>
              <select value={modalEvento.catNome}
                onChange={e => setModalEvento(prev => prev ? { ...prev, catNome:e.target.value, novoValor:'' } : prev)}
                style={{ width:'100%', padding:'8px 12px', borderRadius:8, border:`1px solid ${COR.borda}`,
                  fontSize:13, fontFamily:'inherit', marginBottom:12, outline:'none', background:COR.branco }}>
                <option value="">Selecione uma categoria...</option>
                {catList.map(c => <option key={c.nome} value={c.nome}>{c.nome}</option>)}
              </select>

              {/* Valor atual da categoria */}
              {modalEvento.catNome && !ehEncerramento && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'8px 12px', borderRadius:8, background:'#f8fafc',
                  border:`1px solid ${COR.borda}`, marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:COR.textoSuave,
                      textTransform:'uppercase', letterSpacing:.5, marginBottom:2 }}>Valor atual</div>
                    <div style={{ fontSize:14, fontWeight:700, color:COR.texto }}>
                      {valorExistente.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                    </div>
                  </div>
                  <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:20,
                    background: fonteLabel === 'Atualizado' ? '#eff6ff' : '#f0fdf4',
                    color: fonteLabel === 'Atualizado' ? '#2563eb' : '#16a34a',
                    border: `1px solid ${fonteLabel === 'Atualizado' ? '#bfdbfe' : '#bbf7d0'}` }}>
                    {fonteLabel}
                  </span>
                </div>
              )}

              {!ehEncerramento && (
                <>
                  <div style={{ fontSize:11, fontWeight:700, color:COR.textoSuave, textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>
                    {ehAjuste ? 'Novo valor mensal' : 'AcrÃ©scimo mensal'}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: modalEvento.catNome && adicional ? 8 : 20 }}>
                    <span style={{ fontSize:14, color:COR.textoSuave, flexShrink:0 }}>R$</span>
                    <input type="number" value={modalEvento.novoValor} placeholder="0,00"
                      onChange={e => setModalEvento(prev => prev ? { ...prev, novoValor:e.target.value } : prev)}
                      style={{ flex:1, padding:'8px 12px', borderRadius:8, border:`1px solid ${COR.borda}`,
                        fontSize:15, fontWeight:600, fontFamily:'inherit', outline:'none' }} />
                  </div>
                  {modalEvento.catNome && adicional !== 0 && (
                    <div style={{ fontSize:12, color:COR.textoSuave, marginBottom:20,
                      padding:'6px 10px', background:'#eff6ff', borderRadius:7 }}>
                      {ehAjuste
                        ? <>SerÃ¡ aplicado <strong style={{ color:COR.azulEscuro }}>{adicional.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong> a partir de {MESES_FULL[modalEvento.mesInicio]}</>
                        : <>Novo total: <strong style={{ color:COR.azulEscuro }}>{(valorExistente + adicional).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong> a partir de {MESES_FULL[modalEvento.mesInicio]}</>
                      }
                    </div>
                  )}
                  {(!modalEvento.catNome || adicional === 0) && <div style={{ height:0 }} />}
                </>
              )}
              {ehEncerramento && (
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px',
                  background:'#fef2f2', borderRadius:8, marginBottom:20, border:'1px solid #fecaca' }}>
                  <span>âœ‚ï¸</span>
                  <span style={{ fontSize:12, color:'#dc2626', fontWeight:600 }}>
                    O valor desta categoria serÃ¡ zerado a partir de {MESES_FULL[modalEvento.mesInicio]}
                  </span>
                </div>
              )}

              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setModalEvento(prev => prev ? { ...prev, step:1 } : prev)}
                  style={{ flex:1, padding:'10px 0', border:`1px solid ${COR.borda}`, borderRadius:9, cursor:'pointer',
                    fontSize:13, fontWeight:600, color:COR.textoSuave, background:'transparent', fontFamily:'inherit' }}>
                  â† Voltar
                </button>
                <button disabled={!podeAplicar} onClick={aplicarEvento}
                  style={{ flex:2, padding:'10px 0', border:'none', borderRadius:9, fontSize:13, fontWeight:600, color:'#fff', fontFamily:'inherit',
                    cursor: podeAplicar ? 'pointer' : 'default',
                    background: podeAplicar ? `linear-gradient(135deg,${COR.azulEscuro},${COR.azulMedio})` : '#cbd5e1' }}>
                  âœ“ Aplicar Evento
                </button>
              </div>
            </>)
          })()}
        </div>
      </div>
    )}

    </div>
  )
}
