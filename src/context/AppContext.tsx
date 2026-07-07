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
}

// ── Dados iniciais ───────────────────────────────────────────────────
const CONTAS_INICIAIS: Conta[] = [
  { id:'cc', nome:'Conta Corrente', banco:'Sicredi',  tipo:'corrente', saldoInicial:5000,  cor:'#1a56db', icone:'🏦' },
  { id:'c1', nome:'Cartão 1',       banco:'Nubank',   tipo:'cartao',   saldoInicial:0,     cor:'#7c3aed', icone:'💳', limiteCartao:5000,  diaVencimento:10, diaFechamento:3  },
  { id:'c2', nome:'Cartão 2',       banco:'Itaú',     tipo:'cartao',   saldoInicial:0,     cor:'#ea580c', icone:'💳', limiteCartao:8000,  diaVencimento:15, diaFechamento:8  },
  { id:'c3', nome:'Cartão 3',       banco:'Bradesco', tipo:'cartao',   saldoInicial:0,     cor:'#16a34a', icone:'💳', limiteCartao:3000,  diaVencimento:20, diaFechamento:13 },
  { id:'cp', nome:'Poupança',       banco:'Sicredi',  tipo:'poupanca', saldoInicial:5000,  cor:'#0891b2', icone:'🏧' },
]

const CATS_INICIAIS: Categoria[] = [
  { id:'e1', nome:'Salário Pri',          tipo:'entrada', fixa:true,  tipoMovimento:'banco', formaPagamento:'automatico', cor:'#16a34a', icone:'💰', ativa:true, diaVencimento:1,  valorPadrao:11548   },
  { id:'e2', nome:'Salário Gui',          tipo:'entrada', fixa:true,  tipoMovimento:'banco', formaPagamento:'automatico', cor:'#16a34a', icone:'💰', ativa:true, diaVencimento:5,  valorPadrao:0       },
  { id:'e3', nome:'Clientes a Receber',   tipo:'entrada', fixa:false, tipoMovimento:'banco', formaPagamento:'automatico', cor:'#0891b2', icone:'📊', ativa:true },
  { id:'e4', nome:'13º Salário / Férias', tipo:'entrada', fixa:false, tipoMovimento:'banco', formaPagamento:'automatico', cor:'#d97706', icone:'🎁', ativa:true },
  { id:'e5', nome:'Outras Entradas',      tipo:'entrada', fixa:false, tipoMovimento:'banco', formaPagamento:'automatico', cor:'#6b7280', icone:'📌', ativa:true },
  { id:'s1',  nome:'Supermercado',    tipo:'saida', fixa:false, tipoMovimento:'cartao', formaPagamento:'avista', cor:'#dc2626', icone:'🛒', ativa:true },
  { id:'s2',  nome:'Combustível',     tipo:'saida', fixa:false, tipoMovimento:'cartao', formaPagamento:'avista', cor:'#ea580c', icone:'⛽', ativa:true },
  { id:'s3',  nome:'Prestação Casa',  tipo:'saida', fixa:true,  tipoMovimento:'banco', formaPagamento:'automatico', cor:'#0f172a', icone:'🏠', ativa:true, diaVencimento:10, valorPadrao:826,    descricao:'Financiamento habitacional' },
  { id:'s4',  nome:'Prestação Carro', tipo:'saida', fixa:true,  tipoMovimento:'banco', formaPagamento:'automatico', cor:'#0f172a', icone:'🚗', ativa:true, diaVencimento:15, valorPadrao:1149.72,descricao:'Financiamento veículo'      },
  { id:'s5',  nome:'Plano de Saúde',  tipo:'saida', fixa:true,  tipoMovimento:'banco', formaPagamento:'automatico', cor:'#db2777', icone:'💊', ativa:true, diaVencimento:8,  valorPadrao:324.16  },
  { id:'s6',  nome:'Internet',        tipo:'saida', fixa:true,  tipoMovimento:'banco', formaPagamento:'automatico', cor:'#0891b2', icone:'📱', ativa:true, diaVencimento:20, valorPadrao:100     },
  { id:'s7',  nome:'Luz',             tipo:'saida', fixa:true,  tipoMovimento:'banco', formaPagamento:'automatico', cor:'#d97706', icone:'💡', ativa:true, diaVencimento:12, valorPadrao:350     },
  { id:'s8',  nome:'Água',            tipo:'saida', fixa:true,  tipoMovimento:'banco', formaPagamento:'automatico', cor:'#0891b2', icone:'💧', ativa:true, diaVencimento:15, valorPadrao:145     },
  { id:'s9',  nome:'Consórcio',       tipo:'saida', fixa:true,  tipoMovimento:'cartao', formaPagamento:'avista', cor:'#1a56db', icone:'💎', ativa:true, diaVencimento:5,  valorPadrao:460.94  },
  { id:'s10', nome:'Celular',         tipo:'saida', fixa:true,  tipoMovimento:'banco', formaPagamento:'automatico', cor:'#6b7280', icone:'📱', ativa:true, diaVencimento:5,  valorPadrao:133.23  },
  { id:'s11', nome:'Igreja',          tipo:'saida', fixa:true,  tipoMovimento:'banco', formaPagamento:'pix', cor:'#16a34a', icone:'⛪', ativa:true, diaVencimento:10, valorPadrao:50      },
  { id:'s12', nome:'AABB',            tipo:'saida', fixa:true,  tipoMovimento:'banco', formaPagamento:'automatico', cor:'#1a56db', icone:'🏢', ativa:true, diaVencimento:5,  valorPadrao:120     },
  { id:'s13', nome:'Lazer',           tipo:'saida', fixa:false, tipoMovimento:'cartao', formaPagamento:'parcelado', cor:'#7c3aed', icone:'🎭', ativa:true },
  { id:'s14', nome:'Vestuário',       tipo:'saida', fixa:false, tipoMovimento:'cartao', formaPagamento:'parcelado', cor:'#db2777', icone:'👕', ativa:true },
  { id:'s15', nome:'Alimentação',     tipo:'saida', fixa:false, tipoMovimento:'cartao', formaPagamento:'avista', cor:'#d97706', icone:'🍽️', ativa:true },
  { id:'s16', nome:'Cursos',          tipo:'saida', fixa:false, tipoMovimento:'cartao', formaPagamento:'parcelado', cor:'#16a34a', icone:'🎓', ativa:true },
  { id:'s17', nome:'Viagens',         tipo:'saida', fixa:false, tipoMovimento:'cartao', formaPagamento:'parcelado', cor:'#ea580c', icone:'✈️', ativa:true },
  { id:'s18', nome:'Outras Saídas',   tipo:'saida', fixa:false, tipoMovimento:'cartao', formaPagamento:'avista', cor:'#6b7280', icone:'📌', ativa:true },
]

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
}

const Ctx = createContext<AppCtx>({} as AppCtx)
export const useApp = () => useContext(Ctx)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user,       setUserState]  = useState<User | null>(null)
  const [carregando, setCarregando] = useState(true)
  const userIdRef = useRef<string | null>(null)

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
      if (u) loadData(u.id)
      else    setCarregando(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, session) => {
      const u = session?.user ?? null
      userIdRef.current = u?.id ?? null
      setUserState(u)
      if (!u) { resetState(); setCarregando(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadData(userId: string) {
    setCarregando(true)
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
  }

  function resetState() {
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
    if (!uid) return
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

  return (
    <Ctx.Provider value={{
      user, carregando,
      contas, categorias, extratoData, planos, planosReal, planejamentoLockado,
      setContas: setContasState, setCategorias: setCategoriasState,
      setExtratoData, updateExtratoMes,
      setPlanos: setPlanosState,
      finalizarPlanejamento, updatePlanoReal, setPlanejamentoLockado,
    }}>
      {children}
    </Ctx.Provider>
  )
}
