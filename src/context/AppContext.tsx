import { createContext, useContext, useState, useEffect, useRef } from 'react'
import type { ReactNode, Dispatch, SetStateAction } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { CATEGORIAS_PADRAO } from '../data/categoriasPadrao'

// ── Types compartilhados ─────────────────────────────────────────────
export type TipoConta     = 'corrente' | 'poupanca' | 'cartao'
export type TipoCategoria = 'entrada' | 'saida'
export type FormaPagLanc  = 'debito' | 'pix' | 'transferencia' | 'dinheiro'
export type TipoLanc      = 'entrada' | 'saida'
export type TipoMovimento = 'banco' | 'cartao' | 'dinheiro'
export type FormaPagamentoBanco  = 'automatico' | 'debito' | 'pix' | 'boleto' | 'transferencia'
export type FormaPagamentoCartao = 'avista' | 'parcelado'
export type FormaPagamentoCategoria = FormaPagamentoBanco | FormaPagamentoCartao

export type FormaPagamentoFatura = 'automatico' | 'pix' | 'boleto' | 'transferencia'

export type Conta = {
  id: string; nome: string; banco: string; tipo: TipoConta
  saldoInicial: number; cor: string; icone: string
  limiteCartao?: number; diaVencimento?: number; diaFechamento?: number
  incluirNoSaldoInicial?: boolean
  agencia?: string; numeroConta?: string
  formaPagamentoFatura?: FormaPagamentoFatura
  contaPagamentoId?: string
  apelido?: string
  preferida?: boolean
}

export type Categoria = {
  id: string; nome: string; tipo: TipoCategoria
  fixa: boolean; tipoMovimento: TipoMovimento
  formaPagamento?: FormaPagamentoCategoria
  cor: string; icone: string; ativa: boolean
  grupo?: string
  diaVencimento?: number; descricao?: string
  numeroParcelas?: number
  contaDebitoId?: string
}

export type PlanoCat     = { id?: string; nome: string; t?: string; v: number[] }
export type PlanoAnoData = { saldoInicialJan: number; entradas: PlanoCat[]; saidas: PlanoCat[]; objetivos?: number[]; metaAnual?: number }

export type Lancamento = {
  id: string; tipo: TipoLanc
  descricao: string; categoria: string
  subCategoria?: string
  valor: number; formaPagamento: FormaPagLanc
  tipoLanc: 'fixa' | 'variavel'
}

export type DadosMes = {
  lancamentos: Record<number, Lancamento[]>
  saldoBanco: string
  saldoBancoData?: string
  fixasConsolidadas?: Record<string, boolean>
  fixasMovidas?: Record<string, number>
  fixasValorOverride?: Record<string, number>
  fixasDescOverride?: Record<string, string>
  fixasPagOverride?: Record<string, string>
}

// ── Dados iniciais (novos usuários começam em branco) ─────────────────
const CONTAS_INICIAIS: Conta[]     = []
const CATS_INICIAIS:   Categoria[] = []

// ── Chaves Supabase ──────────────────────────────────────────────────
const KEYS = {
  contas:               'compass_contas',
  categorias:           'compass_categorias',
  extrato:              'compass_extrato_dados',
  fatura:               'compass_fatura_dados',
  planos:               'compass_planos',
  planosReal:           'compass_planos_real',
  planejamentoLockado:  'compass_planejamento_lockado',
  desvioMinPerc:        'compass_desvio_min_perc',
}

// ── Context ───────────────────────────────────────────────────────────
type AppCtx = {
  user:       User | null
  carregando: boolean
  contas:     Conta[]
  categorias: Categoria[]
  extratoData: Record<string, DadosMes>
  faturaData:  Record<string, unknown>
  planos:     Record<number, PlanoAnoData>
  planosReal: Record<number, PlanoAnoData>
  planejamentoLockado: boolean
  desvioMinPerc: number
  setContas:      Dispatch<SetStateAction<Conta[]>>
  setCategorias:  Dispatch<SetStateAction<Categoria[]>>
  updateExtratoMes: (key: string, fn: (prev: DadosMes) => DadosMes) => void
  setExtratoData: (v: Record<string, DadosMes>) => void
  setFaturaData:  Dispatch<SetStateAction<Record<string, unknown>>>
  setPlanos:      Dispatch<SetStateAction<Record<number, PlanoAnoData>>>
  finalizarPlanejamento:  (ano: number, dados: PlanoAnoData) => void
  updatePlanoReal:        (ano: number, fn: (prev: PlanoAnoData) => PlanoAnoData) => void
  setPlanejamentoLockado: (v: boolean) => void
  setDesvioMinPerc: (v: number) => void
  limparDados: () => Promise<void>
  sairDaConta: () => Promise<void>
}

const Ctx = createContext<AppCtx>({} as AppCtx)
export const useApp = () => useContext(Ctx)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user,       setUserState]  = useState<User | null>(null)
  const [carregando, setCarregando] = useState(true)
  const userIdRef       = useRef<string | null>(null)
  const dataLoadedRef   = useRef(false)   // bloqueia saves enquanto loadData roda ou após reset
  const everLoadedRef   = useRef(false)   // true após primeiro loadData — evita double-load
  const wasLoggedOutRef = useRef(false)   // true após logout explícito — garante reload no login
  const loadedUserIdRef = useRef<string | null>(null) // ID do usuário cujos dados estão em memória

  const [contas,      setContasState]     = useState<Conta[]>(CONTAS_INICIAIS)
  const [categorias,  setCategoriasState] = useState<Categoria[]>(CATS_INICIAIS)
  const [extratoData, setExtratoState]    = useState<Record<string, DadosMes>>({})
  const [faturaData,  setFaturaState]     = useState<Record<string, unknown>>({})
  const [planos,          setPlanosState]          = useState<Record<number, PlanoAnoData>>({})
  const [planosReal,      setPlanosRealState]       = useState<Record<number, PlanoAnoData>>({})
  const [planejamentoLockado, setPlanejamentoLockadoState] = useState(false)
  const [desvioMinPerc,       setDesvioMinPercState]       = useState(10)

  // ── Auth ─────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      userIdRef.current = u?.id ?? null
      setUserState(u)
      if (u) {
        everLoadedRef.current = true
        loadData(u.id)
      } else {
        setCarregando(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, session) => {
      const u = session?.user ?? null
      userIdRef.current = u?.id ?? null
      setUserState(u)
      if (!u) {
        wasLoggedOutRef.current = true
        loadedUserIdRef.current = null
        resetState()
        setCarregando(false)
      } else if (wasLoggedOutRef.current || !everLoadedRef.current || loadedUserIdRef.current !== u.id) {
        // login após logout explícito, primeiro login, OU mudança de usuário sem logout explícito
        wasLoggedOutRef.current = false
        everLoadedRef.current = true
        loadData(u.id)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadData(userId: string) {
    setCarregando(true)
    dataLoadedRef.current = false
    loadedUserIdRef.current = null
    const { data } = await supabase
      .from('user_data')
      .select('key, value')
      .eq('user_id', userId)
    const map: Record<string, unknown> = data
      ? Object.fromEntries(data.map(r => [r.key, r.value]))
      : {}
    setContasState((map[KEYS.contas] as Conta[] | undefined) ?? CONTAS_INICIAIS)
    const catsCarregadas = (map[KEYS.categorias] as Categoria[] | undefined) ?? CATS_INICIAIS
    const catsEfetivas = catsCarregadas.length === 0
      ? CATEGORIAS_PADRAO.map((c, i) => ({ ...c, id: `id-${Date.now()}-${i}-${Math.random().toString(36).slice(2,6)}` }))
      : catsCarregadas.map((c, i) => (c as { id?: string }).id ? c : { ...c, id: `id-${Date.now()}-${i}-${Math.random().toString(36).slice(2,6)}` })
    setCategoriasState(catsEfetivas)
    setExtratoState((map[KEYS.extrato]  as Record<string, DadosMes> | undefined) ?? {})
    // Fatura: carrega do Supabase; migra do localStorage se ainda não estiver no Supabase
    let faturaLoaded = (map[KEYS.fatura] as Record<string, unknown> | undefined) ?? {}
    if (Object.keys(faturaLoaded).length === 0) {
      try {
        const local = localStorage.getItem('compass_fatura_dados')
        if (local) faturaLoaded = JSON.parse(local)
      } catch { /* ignore */ }
    }
    setFaturaState(faturaLoaded)
    setPlanosState((map[KEYS.planos]    as Record<number, PlanoAnoData> | undefined) ?? {})
    setPlanosRealState((map[KEYS.planosReal] as Record<number, PlanoAnoData> | undefined) ?? {})
    setPlanejamentoLockadoState((map[KEYS.planejamentoLockado] as boolean | undefined) ?? false)
    setDesvioMinPercState((map[KEYS.desvioMinPerc] as number | undefined) ?? 10)
    loadedUserIdRef.current = userId
    setCarregando(false)
    dataLoadedRef.current = true
  }

  function resetState() {
    dataLoadedRef.current = false
    loadedUserIdRef.current = null
    setContasState(CONTAS_INICIAIS)
    setCategoriasState(CATS_INICIAIS)
    setExtratoState({})
    setFaturaState({})
    setPlanosState({})
    setPlanosRealState({})
    setPlanejamentoLockadoState(false)
    setDesvioMinPercState(10)
  }

  // ── Auto-save para Supabase ──────────────────────────────────────────
  function saveKey(key: string, val: unknown) {
    const uid = userIdRef.current
    if (!uid || !dataLoadedRef.current) return
    supabase.from('user_data')
      .upsert({ user_id: uid, key, value: val })
      .then(({ error }) => { if (error) console.error('Supabase save error:', key, error) })
  }

  useEffect(() => { saveKey(KEYS.contas,    contas)       }, [contas])
  useEffect(() => { saveKey(KEYS.categorias, categorias)  }, [categorias])
  useEffect(() => { saveKey(KEYS.extrato,    extratoData) }, [extratoData])
  useEffect(() => { saveKey(KEYS.fatura,     faturaData)  }, [faturaData])
  useEffect(() => { saveKey(KEYS.planos,     planos)      }, [planos])
  useEffect(() => { saveKey(KEYS.planosReal, planosReal)  }, [planosReal])
  useEffect(() => { saveKey(KEYS.planejamentoLockado, planejamentoLockado) }, [planejamentoLockado])
  useEffect(() => { saveKey(KEYS.desvioMinPerc,       desvioMinPerc)       }, [desvioMinPerc])

  // ── Funções de update ────────────────────────────────────────────────
  function setExtratoData(v: Record<string, DadosMes>) { setExtratoState(v) }

  function updateExtratoMes(key: string, fn: (prev: DadosMes) => DadosMes) {
    setExtratoState(prev => ({
      ...prev,
      [key]: fn(prev[key] ?? { lancamentos: {}, saldoBanco: '' }),
    }))
  }

  function finalizarPlanejamento(ano: number, dados: PlanoAnoData) {
    setPlanosRealState(prev => ({ ...prev, [ano]: JSON.parse(JSON.stringify(dados)) }))
    setPlanejamentoLockadoState(true)
  }

  function updatePlanoReal(ano: number, fn: (prev: PlanoAnoData) => PlanoAnoData) {
    setPlanosRealState(prev => ({
      ...prev,
      [ano]: fn(prev[ano] ?? { saldoInicialJan: 0, entradas: [], saidas: [] }),
    }))
  }

  function setPlanejamentoLockado(v: boolean) { setPlanejamentoLockadoState(v) }
  function setDesvioMinPerc(v: number) { setDesvioMinPercState(v) }

  async function limparDados() {
    const uid = userIdRef.current
    if (!uid) return
    await supabase.from('user_data').delete().eq('user_id', uid)
    resetState()
  }

  async function sairDaConta() {
    const uid = userIdRef.current
    if (uid && dataLoadedRef.current) {
      await Promise.all([
        supabase.from('user_data').upsert({ user_id: uid, key: KEYS.contas,              value: contas }),
        supabase.from('user_data').upsert({ user_id: uid, key: KEYS.categorias,          value: categorias }),
        supabase.from('user_data').upsert({ user_id: uid, key: KEYS.extrato,             value: extratoData }),
        supabase.from('user_data').upsert({ user_id: uid, key: KEYS.fatura,              value: faturaData }),
        supabase.from('user_data').upsert({ user_id: uid, key: KEYS.planos,              value: planos }),
        supabase.from('user_data').upsert({ user_id: uid, key: KEYS.planosReal,          value: planosReal }),
        supabase.from('user_data').upsert({ user_id: uid, key: KEYS.planejamentoLockado, value: planejamentoLockado }),
        supabase.from('user_data').upsert({ user_id: uid, key: KEYS.desvioMinPerc,        value: desvioMinPerc }),
      ])
    }
    await supabase.auth.signOut()
  }

  return (
    <Ctx.Provider value={{
      user, carregando,
      contas, categorias, extratoData, faturaData, planos, planosReal, planejamentoLockado, desvioMinPerc,
      setContas: setContasState, setCategorias: setCategoriasState,
      setExtratoData, updateExtratoMes,
      setFaturaData: setFaturaState,
      setPlanos: setPlanosState,
      finalizarPlanejamento, updatePlanoReal, setPlanejamentoLockado, setDesvioMinPerc, limparDados, sairDaConta,
    }}>
      {children}
    </Ctx.Provider>
  )
}
