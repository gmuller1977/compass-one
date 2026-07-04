import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode, Dispatch, SetStateAction } from 'react'

// ── Types compartilhados ─────────────────────────────────────────────
export type TipoConta     = 'corrente' | 'poupanca' | 'cartao'
export type TipoCategoria = 'entrada' | 'saida'
export type FormaPagCat   = 'debito' | 'credito' | 'ambos'
export type FormaPagLanc  = 'debito' | 'pix' | 'transferencia'
export type TipoLanc      = 'entrada' | 'saida'

export type Conta = {
  id: string; nome: string; banco: string; tipo: TipoConta
  saldoInicial: number; cor: string; icone: string
  limiteCartao?: number; diaVencimento?: number; diaFechamento?: number
  incluirNoSaldoInicial?: boolean
}

export type Categoria = {
  id: string; nome: string; tipo: TipoCategoria
  fixa: boolean; formaPagamento: FormaPagCat
  cor: string; icone: string; ativa: boolean
  diaVencimento?: number; descricao?: string
  valorPadrao?: number
}

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
  { id:'e1', nome:'Salário Pri',          tipo:'entrada', fixa:true,  formaPagamento:'debito',  cor:'#16a34a', icone:'💰', ativa:true, diaVencimento:1,  valorPadrao:11548   },
  { id:'e2', nome:'Salário Gui',          tipo:'entrada', fixa:true,  formaPagamento:'debito',  cor:'#16a34a', icone:'💰', ativa:true, diaVencimento:5,  valorPadrao:0       },
  { id:'e3', nome:'Clientes a Receber',   tipo:'entrada', fixa:false, formaPagamento:'debito',  cor:'#0891b2', icone:'📊', ativa:true },
  { id:'e4', nome:'13º Salário / Férias', tipo:'entrada', fixa:false, formaPagamento:'debito',  cor:'#d97706', icone:'🎁', ativa:true },
  { id:'e5', nome:'Outras Entradas',      tipo:'entrada', fixa:false, formaPagamento:'ambos',   cor:'#6b7280', icone:'📌', ativa:true },
  { id:'s1',  nome:'Supermercado',    tipo:'saida', fixa:false, formaPagamento:'debito',  cor:'#dc2626', icone:'🛒', ativa:true },
  { id:'s2',  nome:'Combustível',     tipo:'saida', fixa:false, formaPagamento:'ambos',   cor:'#ea580c', icone:'⛽', ativa:true },
  { id:'s3',  nome:'Prestação Casa',  tipo:'saida', fixa:true,  formaPagamento:'debito',  cor:'#0f172a', icone:'🏠', ativa:true, diaVencimento:10, valorPadrao:826,    descricao:'Financiamento habitacional' },
  { id:'s4',  nome:'Prestação Carro', tipo:'saida', fixa:true,  formaPagamento:'debito',  cor:'#0f172a', icone:'🚗', ativa:true, diaVencimento:15, valorPadrao:1149.72,descricao:'Financiamento veículo'      },
  { id:'s5',  nome:'Plano de Saúde',  tipo:'saida', fixa:true,  formaPagamento:'debito',  cor:'#db2777', icone:'💊', ativa:true, diaVencimento:8,  valorPadrao:324.16  },
  { id:'s6',  nome:'Internet',        tipo:'saida', fixa:true,  formaPagamento:'debito',  cor:'#0891b2', icone:'📱', ativa:true, diaVencimento:20, valorPadrao:100     },
  { id:'s7',  nome:'Luz',             tipo:'saida', fixa:true,  formaPagamento:'debito',  cor:'#d97706', icone:'💡', ativa:true, diaVencimento:12, valorPadrao:350     },
  { id:'s8',  nome:'Água',            tipo:'saida', fixa:true,  formaPagamento:'debito',  cor:'#0891b2', icone:'💧', ativa:true, diaVencimento:15, valorPadrao:145     },
  { id:'s9',  nome:'Consórcio',       tipo:'saida', fixa:true,  formaPagamento:'credito', cor:'#1a56db', icone:'💎', ativa:true, diaVencimento:5,  valorPadrao:460.94  },
  { id:'s10', nome:'Celular',         tipo:'saida', fixa:true,  formaPagamento:'debito',  cor:'#6b7280', icone:'📱', ativa:true, diaVencimento:5,  valorPadrao:133.23  },
  { id:'s11', nome:'Igreja',          tipo:'saida', fixa:true,  formaPagamento:'debito',  cor:'#16a34a', icone:'⛪', ativa:true, diaVencimento:10, valorPadrao:50      },
  { id:'s12', nome:'AABB',            tipo:'saida', fixa:true,  formaPagamento:'debito',  cor:'#1a56db', icone:'🏢', ativa:true, diaVencimento:5,  valorPadrao:120     },
  { id:'s13', nome:'Lazer',           tipo:'saida', fixa:false, formaPagamento:'credito', cor:'#7c3aed', icone:'🎭', ativa:true },
  { id:'s14', nome:'Vestuário',       tipo:'saida', fixa:false, formaPagamento:'credito', cor:'#db2777', icone:'👕', ativa:true },
  { id:'s15', nome:'Alimentação',     tipo:'saida', fixa:false, formaPagamento:'ambos',   cor:'#d97706', icone:'🍽️', ativa:true },
  { id:'s16', nome:'Cursos',          tipo:'saida', fixa:false, formaPagamento:'credito', cor:'#16a34a', icone:'🎓', ativa:true },
  { id:'s17', nome:'Viagens',         tipo:'saida', fixa:false, formaPagamento:'credito', cor:'#ea580c', icone:'✈️', ativa:true },
  { id:'s18', nome:'Outras Saídas',   tipo:'saida', fixa:false, formaPagamento:'ambos',   cor:'#6b7280', icone:'📌', ativa:true },
]

// ── Storage ──────────────────────────────────────────────────────────
const KEYS = {
  contas:      'compass_contas',
  categorias:  'compass_categorias',
  extrato:     'compass_extrato_dados',
}

function load<T>(key: string, fallback: T): T {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback }
  catch { return fallback }
}
function save(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch { /* silent */ }
}

// ── Context ───────────────────────────────────────────────────────────
type AppCtx = {
  contas:     Conta[]
  categorias: Categoria[]
  extratoData: Record<string, DadosMes>
  setContas:      Dispatch<SetStateAction<Conta[]>>
  setCategorias:  Dispatch<SetStateAction<Categoria[]>>
  updateExtratoMes: (key: string, fn: (prev: DadosMes) => DadosMes) => void
  setExtratoData: (v: Record<string, DadosMes>) => void
}

const Ctx = createContext<AppCtx>({} as AppCtx)
export const useApp = () => useContext(Ctx)

export function AppProvider({ children }: { children: ReactNode }) {
  const [contas,      setContasState]     = useState<Conta[]>      (() => load(KEYS.contas,     CONTAS_INICIAIS))
  const [categorias,  setCategoriasState] = useState<Categoria[]>  (() => load(KEYS.categorias, CATS_INICIAIS))
  const [extratoData, setExtratoState]    = useState<Record<string, DadosMes>>(() => load(KEYS.extrato, {}))

  useEffect(() => { save(KEYS.contas,     contas)      }, [contas])
  useEffect(() => { save(KEYS.categorias, categorias)  }, [categorias])
  useEffect(() => { save(KEYS.extrato,    extratoData) }, [extratoData])

  function setExtratoData(v: Record<string, DadosMes>) { setExtratoState(v) }

  function updateExtratoMes(key: string, fn: (prev: DadosMes) => DadosMes) {
    setExtratoState(prev => ({
      ...prev,
      [key]: fn(prev[key] ?? { lancamentos:{}, saldoBanco:'' }),
    }))
  }

  return (
    <Ctx.Provider value={{
      contas, categorias, extratoData,
      setContas: setContasState, setCategorias: setCategoriasState,
      setExtratoData, updateExtratoMes,
    }}>
      {children}
    </Ctx.Provider>
  )
}