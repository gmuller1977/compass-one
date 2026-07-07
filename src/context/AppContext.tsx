import { createContext, useContext, useState, useEffect, useRef } from 'react'
import type { ReactNode, Dispatch, SetStateAction } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

// ── Types compartilhados ─────────────────────────────────────────────
export type TipoConta     = 'corrente' | 'poupanca' | 'cartao'
export type TipoCategoria = 'entrada' | 'saida'
export type FormaPagLanc  = 'debito' | 'pix' | 'transferencia'
export type TipoLanc      = 'entrada' | 'saida'
export type TipoMovimento = 'banco' | 'cartao' | 'dinheiro'
export type FormaPagamentoBanco  = 'automatico' | 'pix' | 'boleto' | 'transferencia'
export type FormaPagamentoCartao = 'avista' | 'parcelado'
export type FormaPagamentoCategoria = FormaPagamentoBanco | FormaPagamentoCartao

export type Conta = {
  id: string; nome: string; banco: string; tipo: TipoConta
  saldoInicial: number; cor: string; icone: string
  limiteCartao?: number; diaVencimento?: number; diaFechamento?: number
  incluirNoSaldoInicial?: boolean
  agencia?: string; numeroConta?: string
}

export type Categoria = {
  id: string; nome: string; tipo: TipoCategoria
  fixa: boolean; tipoMovimento: TipoMovimento
  formaPagamento?: FormaPagamentoCategoria
  cor: string; icone: string; ativa: boolean
  diaVencimento?: number; descricao?: string
  valorPadrao?: number; numeroParcelas?: number
}

export type PlanoCat     = { nome: string; t?: string; v: number[] }
export type PlanoAnoData = { saldoInicialJan: number; entradas: PlanoCat[]; saidas: PlanoCat[] }

export type Lancamento = {
  id: string; tipo: TipoLanc
  descricao: string; categoria: string
  valor: number; formaPagamento: FormaPagLanc
  tipoLanc: 'fixa' | 'variavel'
}

export type DadosMes = {
  lancamentos: Record<number, Lancamento[]>
  saldoBanco: string
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
  planos:               'compass_planos',
  planosReal:           'compass_planos_real',
  planejamentoLockado:  'compass_planejamento_lockado',
}

// ── Context ───────────────────────────────────────────────────────────
type AppCtx = {
  user:       User | null
  carregando: boolean
  contas:     Conta[]
  categorias: Categoria[]
  extratoData: Record<string, DadosMes>
  planos:     Record<number, PlanoAnoData>
  planosReal: Record<number, PlanoAnoData>
  planejamentoLockado: boolean
  setContas:      Dispatch<SetStateAction<Conta[]>>
  setCategorias:  Dispatch<SetStateAction<Categoria[]>>
  updateExtratoMes: (key: string, fn: (prev: DadosMes) => DadosMes) => void
  setExtratoData: (v: Record<string, DadosMes>) => void
  setPlanos:      Dispatch<SetStateAction<Record<number, PlanoAnoData>>>
  finalizarPlanejamento:  (ano: number, dados: PlanoAnoData) => void
  updatePlanoReal:        (ano: number, fn: (prev: PlanoAnoData) => PlanoAnoData) => void
  setPlanejamentoLockado: (v: boolean) => void
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

  const [contas,      setContasState]     = useState<Conta[]>(CONTAS_INICIAIS)
  const [categorias,  setCategoriasState] = useState<Categoria[]>(CATS_INICIAIS)
  const [extratoData, setExtratoState]    = useState<Record<string, DadosMes>>({})
  const [planos,          setPlanosState]          = useState<Record<number, PlanoAnoData>>({})
  const [planosReal,      setPlanosRealState]       = useState<Record<number, PlanoAnoData>>({})
  const [planejamentoLockado, setPlanejamentoLockadoState] = useState(false)

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
        resetState()
        setCarregando(false)
      } else if (wasLoggedOutRef.current || !everLoadedRef.current) {
        // login após logout explícito OU primeiro login (página abriu sem sessão)
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
    const { data } = await supabase
      .from('user_data')
      .select('key, value')
      .eq('user_id', userId)
    const map: Record<string, unknown> = data
      ? Object.fromEntries(data.map(r => [r.key, r.value]))
      : {}
    setContasState((map[KEYS.contas]    as Conta[]      | undefined) ?? CONTAS_INICIAIS)
    setCategoriasState((map[KEYS.categorias] as Categoria[] | undefined) ?? CATS_INICIAIS)
    setExtratoState((map[KEYS.extrato]  as Record<string, DadosMes> | undefined) ?? {})
    setPlanosState((map[KEYS.planos]    as Record<number, PlanoAnoData> | undefined) ?? {})
    setPlanosRealState((map[KEYS.planosReal] as Record<number, PlanoAnoData> | undefined) ?? {})
    setPlanejamentoLockadoState((map[KEYS.planejamentoLockado] as boolean | undefined) ?? false)
    setCarregando(false)
    dataLoadedRef.current = true
  }

  function resetState() {
    dataLoadedRef.current = false
    setContasState(CONTAS_INICIAIS)
    setCategoriasState(CATS_INICIAIS)
    setExtratoState({})
    setPlanosState({})
    setPlanosRealState({})
    setPlanejamentoLockadoState(false)
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
  useEffect(() => { saveKey(KEYS.planos,     planos)      }, [planos])
  useEffect(() => { saveKey(KEYS.planosReal, planosReal)  }, [planosReal])
  useEffect(() => { saveKey(KEYS.planejamentoLockado, planejamentoLockado) }, [planejamentoLockado])

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
        supabase.from('user_data').upsert({ user_id: uid, key: KEYS.planos,              value: planos }),
        supabase.from('user_data').upsert({ user_id: uid, key: KEYS.planosReal,          value: planosReal }),
        supabase.from('user_data').upsert({ user_id: uid, key: KEYS.planejamentoLockado, value: planejamentoLockado }),
      ])
    }
    await supabase.auth.signOut()
  }

  return (
    <Ctx.Provider value={{
      user, carregando,
      contas, categorias, extratoData, planos, planosReal, planejamentoLockado,
      setContas: setContasState, setCategorias: setCategoriasState,
      setExtratoData, updateExtratoMes,
      setPlanos: setPlanosState,
      finalizarPlanejamento, updatePlanoReal, setPlanejamentoLockado, limparDados, sairDaConta,
    }}>
      {children}
    </Ctx.Provider>
  )
}
