import { createContext, useContext, useState, useEffect, useRef } from 'react'
import type { ReactNode, Dispatch, SetStateAction } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { CATEGORIAS_PADRAO } from '../data/categoriasPadrao'

// ── Types compartilhados ─────────────────────────────────────────────
export type Perfil = { nome: string; apelido: string }
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
  pinQuick?: boolean
}

export type PlanoCat     = { id?: string; nome: string; t?: string; v: number[] }
export type PlanoAnoData = { saldoInicialJan: number; entradas: PlanoCat[]; saidas: PlanoCat[]; objetivos?: number[]; metaAnual?: number; mesInicio?: number }

export type MetaSim = {
  nome: string
  objetivo: number
  guardaPorMes: number
  iniciadoEm: string
}

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

// ── Context type ─────────────────────────────────────────────────────
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
  perfil: Perfil
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
  setPerfil: (v: Perfil) => void
  onboardingCompleto: boolean
  setOnboardingCompleto: (v: boolean) => void
  objetivoUsuario: string
  setObjetivoUsuario: (v: string) => void
  metaSim: MetaSim | null
  setMetaSim: (v: MetaSim | null) => void
  limparDados: () => Promise<void>
  sairDaConta: () => Promise<void>
  excluirConta: () => Promise<{ error?: string }>
}

const Ctx = createContext<AppCtx>({} as AppCtx)
export const useApp = () => useContext(Ctx)

// ── Row mappers ───────────────────────────────────────────────────────

function contaToRow(c: Conta, userId: string) {
  return {
    id: c.id,
    user_id: userId,
    nome: c.nome,
    banco: c.banco,
    tipo: c.tipo,
    saldo_inicial: c.saldoInicial,
    cor: c.cor,
    icone: c.icone,
    limite_cartao: c.limiteCartao ?? null,
    dia_vencimento: c.diaVencimento ?? null,
    dia_fechamento: c.diaFechamento ?? null,
    incluir_no_saldo_inicial: c.incluirNoSaldoInicial ?? true,
    agencia: c.agencia ?? null,
    numero_conta: c.numeroConta ?? null,
    forma_pagamento_fatura: c.formaPagamentoFatura ?? null,
    conta_pagamento_id: c.contaPagamentoId ?? null,
    apelido: c.apelido ?? null,
    preferida: c.preferida ?? false,
    ativo: true,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToConta(row: any): Conta {
  return {
    id: row.id,
    nome: row.nome,
    banco: row.banco ?? '',
    tipo: row.tipo as TipoConta,
    saldoInicial: Number(row.saldo_inicial ?? 0),
    cor: row.cor ?? '',
    icone: row.icone ?? '',
    limiteCartao: row.limite_cartao != null ? Number(row.limite_cartao) : undefined,
    diaVencimento: row.dia_vencimento != null ? Number(row.dia_vencimento) : undefined,
    diaFechamento: row.dia_fechamento != null ? Number(row.dia_fechamento) : undefined,
    incluirNoSaldoInicial: row.incluir_no_saldo_inicial ?? true,
    agencia: row.agencia ?? undefined,
    numeroConta: row.numero_conta ?? undefined,
    formaPagamentoFatura: row.forma_pagamento_fatura ?? undefined,
    contaPagamentoId: row.conta_pagamento_id ?? undefined,
    apelido: row.apelido ?? undefined,
    preferida: row.preferida ?? false,
  }
}

function categoriaToRow(c: Categoria, userId: string) {
  return {
    id: c.id,
    user_id: userId,
    nome: c.nome,
    tipo: c.tipo,
    grupo: c.grupo ?? null,
    fixa: c.fixa,
    tipo_movimento: c.tipoMovimento,
    forma_pagamento: c.formaPagamento ?? null,
    cor: c.cor,
    icone: c.icone,
    ativa: c.ativa,
    dia_vencimento: c.diaVencimento ?? null,
    descricao: c.descricao ?? null,
    numero_parcelas: c.numeroParcelas ?? 1,
    conta_debito_id: c.contaDebitoId ?? null,
    pin_quick: c.pinQuick ?? false,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToCategoria(row: any): Categoria {
  return {
    id: row.id,
    nome: row.nome,
    tipo: row.tipo as TipoCategoria,
    fixa: row.fixa ?? false,
    tipoMovimento: (row.tipo_movimento ?? 'banco') as TipoMovimento,
    formaPagamento: row.forma_pagamento ?? undefined,
    cor: row.cor ?? '',
    icone: row.icone ?? '',
    ativa: row.ativa ?? true,
    grupo: row.grupo ?? undefined,
    diaVencimento: row.dia_vencimento != null ? Number(row.dia_vencimento) : undefined,
    descricao: row.descricao ?? undefined,
    numeroParcelas: row.numero_parcelas != null ? Number(row.numero_parcelas) : undefined,
    contaDebitoId: row.conta_debito_id ?? undefined,
    pinQuick: row.pin_quick ?? false,
  }
}

function parseExtratoKey(key: string): { contaId: string; ano: number; mes: number } {
  // key: {contaId}-{YYYY}-{MM}  →  last 8 chars = '-YYYY-MM'
  return {
    contaId: key.slice(0, -8),
    ano: parseInt(key.slice(-7, -3)),
    mes: parseInt(key.slice(-2)),
  }
}

function extratoKeyFromRow(contaId: string, ano: number, mes: number): string {
  return `${contaId}-${ano}-${String(mes).padStart(2, '0')}`
}

// ── Provider ──────────────────────────────────────────────────────────
export function AppProvider({ children }: { children: ReactNode }) {
  const [user,       setUserState]  = useState<User | null>(null)
  const [carregando, setCarregando] = useState(true)
  const userIdRef       = useRef<string | null>(null)
  const dataLoadedRef   = useRef(false)
  const everLoadedRef   = useRef(false)
  const wasLoggedOutRef = useRef(false)
  const loadedUserIdRef = useRef<string | null>(null)
  const loadingForUserRef = useRef<string | null>(null)

  const [contas,      setContasState]     = useState<Conta[]>([])
  const [categorias,  setCategoriasState] = useState<Categoria[]>([])
  const [extratoData, setExtratoState]    = useState<Record<string, DadosMes>>({})
  const [faturaData,  setFaturaState]     = useState<Record<string, unknown>>({})
  const [planos,          setPlanosState]     = useState<Record<number, PlanoAnoData>>({})
  const [planosReal,      setPlanosRealState] = useState<Record<number, PlanoAnoData>>({})
  const [planejamentoLockado, setPlanejamentoLockadoState] = useState(false)
  const [desvioMinPerc,       setDesvioMinPercState]       = useState(10)
  const [perfil,              setPerfilState]              = useState<Perfil>({ nome: '', apelido: '' })
  const [onboardingCompleto,  setOnboardingCompletoState]  = useState(false)
  const [objetivoUsuario,     setObjetivoUsuarioState]     = useState('')
  const [metaSim,             setMetaSimState]             = useState<MetaSim | null>(null)

  // ── Auth ─────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      userIdRef.current = u?.id ?? null
      setUserState(u)
      if (u) { everLoadedRef.current = true; loadData(u.id) }
      else setCarregando(false)
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
        wasLoggedOutRef.current = false
        everLoadedRef.current = true
        loadData(u.id)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Load data ────────────────────────────────────────────────────────
  async function loadData(userId: string) {
    if (loadingForUserRef.current === userId) return
    loadingForUserRef.current = userId
    setCarregando(true)
    dataLoadedRef.current = false
    loadedUserIdRef.current = null

    const [
      { data: contasRows },
      { data: categoriasRows },
      { data: prefRow },
      { data: extratoRows },
      { data: faturaRows },
      { data: planoRows },
    ] = await Promise.all([
      supabase.from('contas').select('*').eq('user_id', userId),
      supabase.from('categorias').select('*').eq('user_id', userId),
      supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('extrato_data').select('conta_id, ano, mes, dados').eq('user_id', userId),
      supabase.from('fatura_data').select('conta_id, ano, mes, dados').eq('user_id', userId),
      supabase.from('planejamento_data').select('ano, tipo_plano, dados').eq('user_id', userId),
    ])

    // Contas
    const contasLoaded: Conta[] = (contasRows ?? []).map(rowToConta)
    setContasState(contasLoaded)
    const contaIdSet = new Set(contasLoaded.map(c => c.id))

    // Categorias — deduplica por nome antes de usar (protege contra race condition de carregamento duplo)
    const rawCats: Categoria[] = (categoriasRows ?? []).map(rowToCategoria)
    const seenNomes = new Set<string>()
    let catsLoaded = rawCats.filter(c => {
      if (seenNomes.has(c.nome)) return false
      seenNomes.add(c.nome)
      return true
    })
    if (catsLoaded.length === 0) {
      catsLoaded = CATEGORIAS_PADRAO.map((c, i) => ({
        ...c,
        id: `id-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      }))
    }
    setCategoriasState(catsLoaded)

    // Preferences
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pref = prefRow as any
    setPerfilState({ nome: pref?.perfil_nome ?? '', apelido: pref?.perfil_apelido ?? '' })
    const hasData = contasLoaded.length > 0 || (categoriasRows ?? []).length > 0
    setOnboardingCompletoState(pref?.onboarding_completo ?? hasData)
    setPlanejamentoLockadoState(pref?.planejamento_lockado ?? false)
    setDesvioMinPercState(Number(pref?.desvio_min_perc ?? 10))
    setObjetivoUsuarioState(pref?.objetivo_usuario ?? '')
    setMetaSimState(pref?.meta_simulacao ?? null)

    // Extrato — filtra contas excluídas
    const extratoLoaded: Record<string, DadosMes> = {}
    for (const row of (extratoRows ?? [])) {
      if (!contaIdSet.has(row.conta_id)) continue
      extratoLoaded[extratoKeyFromRow(row.conta_id, row.ano, row.mes)] = row.dados as DadosMes
    }
    setExtratoState(extratoLoaded)

    // Fatura — filtra contas excluídas
    const faturaLoaded: Record<string, unknown> = {}
    for (const row of (faturaRows ?? [])) {
      if (!contaIdSet.has(row.conta_id)) continue
      faturaLoaded[extratoKeyFromRow(row.conta_id, row.ano, row.mes)] = row.dados
    }
    setFaturaState(faturaLoaded)

    // Planos
    const planosLoaded: Record<number, PlanoAnoData> = {}
    const planosRealLoaded: Record<number, PlanoAnoData> = {}
    for (const row of (planoRows ?? [])) {
      if (row.tipo_plano === 'previsto') planosLoaded[row.ano] = row.dados as PlanoAnoData
      else if (row.tipo_plano === 'real') planosRealLoaded[row.ano] = row.dados as PlanoAnoData
    }
    setPlanosState(planosLoaded)
    setPlanosRealState(planosRealLoaded)

    loadedUserIdRef.current = userId
    setCarregando(false)
    dataLoadedRef.current = true
    loadingForUserRef.current = null
  }

  function resetState() {
    dataLoadedRef.current = false
    loadedUserIdRef.current = null
    setContasState([])
    setCategoriasState([])
    setExtratoState({})
    setFaturaState({})
    setPlanosState({})
    setPlanosRealState({})
    setPlanejamentoLockadoState(false)
    setDesvioMinPercState(10)
    setPerfilState({ nome: '', apelido: '' })
    setOnboardingCompletoState(false)
  }

  // ── Save helpers ─────────────────────────────────────────────────────
  function canSave() { return !!(userIdRef.current && dataLoadedRef.current) }

  async function saveContas(list: Conta[]) {
    if (!canSave()) return
    const uid = userIdRef.current!
    if (list.length === 0) {
      await supabase.from('contas').delete().eq('user_id', uid)
      return
    }
    const { error } = await supabase.from('contas').upsert(list.map(c => contaToRow(c, uid)))
    if (error) { console.error('save contas:', error); return }
    const ids = list.map(c => `'${c.id}'`).join(',')
    await supabase.from('contas').delete().eq('user_id', uid).not('id', 'in', `(${ids})`)
  }

  async function saveCategorias(list: Categoria[]) {
    if (!canSave()) return
    const uid = userIdRef.current!
    if (list.length === 0) {
      await supabase.from('categorias').delete().eq('user_id', uid)
      return
    }
    const { error } = await supabase.from('categorias').upsert(list.map(c => categoriaToRow(c, uid)))
    if (error) { console.error('save categorias:', error); return }
    const ids = list.map(c => `'${c.id}'`).join(',')
    await supabase.from('categorias').delete().eq('user_id', uid).not('id', 'in', `(${ids})`)
  }

  async function saveExtratoData(data: Record<string, DadosMes>) {
    if (!canSave()) return
    const uid = userIdRef.current!
    if (Object.keys(data).length === 0) {
      await supabase.from('extrato_data').delete().eq('user_id', uid)
      return
    }
    const rows = Object.entries(data).map(([key, dados]) => {
      const { contaId, ano, mes } = parseExtratoKey(key)
      return { user_id: uid, conta_id: contaId, ano, mes, dados }
    })
    const { error } = await supabase
      .from('extrato_data')
      .upsert(rows, { onConflict: 'user_id,conta_id,ano,mes' })
    if (error) console.error('save extrato_data:', error)
  }

  async function saveFaturaData(data: Record<string, unknown>) {
    if (!canSave()) return
    const uid = userIdRef.current!
    if (Object.keys(data).length === 0) {
      await supabase.from('fatura_data').delete().eq('user_id', uid)
      return
    }
    const rows = Object.entries(data).map(([key, dados]) => {
      const { contaId, ano, mes } = parseExtratoKey(key)
      return { user_id: uid, conta_id: contaId, ano, mes, dados }
    })
    const { error } = await supabase
      .from('fatura_data')
      .upsert(rows, { onConflict: 'user_id,conta_id,ano,mes' })
    if (error) console.error('save fatura_data:', error)
  }

  async function savePlanosData(dict: Record<number, PlanoAnoData>, tipo: 'previsto' | 'real') {
    if (!canSave()) return
    const uid = userIdRef.current!
    const entries = Object.entries(dict)
    if (entries.length === 0) {
      await supabase.from('planejamento_data').delete().eq('user_id', uid).eq('tipo_plano', tipo)
      return
    }
    const rows = entries.map(([anoStr, dados]) => ({
      user_id: uid,
      ano: parseInt(anoStr),
      tipo_plano: tipo,
      saldo_inicial_jan: (dados as PlanoAnoData).saldoInicialJan ?? 0,
      meta_anual: (dados as PlanoAnoData).metaAnual ?? null,
      mes_inicio: (dados as PlanoAnoData).mesInicio ?? 1,
      objetivos: (dados as PlanoAnoData).objetivos ?? [],
      dados,
    }))
    const { error } = await supabase
      .from('planejamento_data')
      .upsert(rows, { onConflict: 'user_id,ano,tipo_plano' })
    if (error) { console.error('save planejamento_data:', error); return }
    const anos = entries.map(([a]) => a).join(',')
    await supabase.from('planejamento_data')
      .delete().eq('user_id', uid).eq('tipo_plano', tipo)
      .not('ano', 'in', `(${anos})`)
  }

  async function saveUserPrefs(
    p: Perfil, oc: boolean, pl: boolean, dmp: number, ou = '', ms: MetaSim | null = null
  ) {
    if (!canSave()) return
    const uid = userIdRef.current!
    const { error } = await supabase.from('user_preferences').upsert({
      user_id: uid,
      perfil_nome: p.nome,
      perfil_apelido: p.apelido,
      onboarding_completo: oc,
      planejamento_lockado: pl,
      desvio_min_perc: dmp,
      objetivo_usuario: ou || null,
      meta_simulacao: ms ?? null,
      atualizado_em: new Date().toISOString(),
    })
    if (error) console.error('save user_preferences:', error)
  }

  // ── Auto-save effects ────────────────────────────────────────────────
  useEffect(() => { saveContas(contas) }, [contas])          // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { saveCategorias(categorias) }, [categorias]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { saveExtratoData(extratoData) }, [extratoData]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { saveFaturaData(faturaData) }, [faturaData])    // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { savePlanosData(planos, 'previsto') }, [planos])       // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { savePlanosData(planosReal, 'real') }, [planosReal])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    saveUserPrefs(perfil, onboardingCompleto, planejamentoLockado, desvioMinPerc, objetivoUsuario, metaSim)
  }, [perfil, onboardingCompleto, planejamentoLockado, desvioMinPerc, objetivoUsuario, metaSim]) // eslint-disable-line react-hooks/exhaustive-deps

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
  }

  function updatePlanoReal(ano: number, fn: (prev: PlanoAnoData) => PlanoAnoData) {
    setPlanosRealState(prev => ({
      ...prev,
      [ano]: fn(prev[ano] ?? { saldoInicialJan: 0, entradas: [], saidas: [] }),
    }))
  }

  function setPlanejamentoLockado(v: boolean) { setPlanejamentoLockadoState(v) }
  function setDesvioMinPerc(v: number) { setDesvioMinPercState(v) }
  function setPerfil(v: Perfil) { setPerfilState(v) }
  function setOnboardingCompleto(v: boolean) { setOnboardingCompletoState(v) }
  function setObjetivoUsuario(v: string) { setObjetivoUsuarioState(v) }
  function setMetaSim(v: MetaSim | null) { setMetaSimState(v) }

  async function limparDados() {
    const uid = userIdRef.current
    if (!uid) return
    await Promise.all([
      supabase.from('contas').delete().eq('user_id', uid),
      supabase.from('categorias').delete().eq('user_id', uid),
      supabase.from('user_preferences').delete().eq('user_id', uid),
      supabase.from('extrato_data').delete().eq('user_id', uid),
      supabase.from('fatura_data').delete().eq('user_id', uid),
      supabase.from('planejamento_data').delete().eq('user_id', uid),
    ])
    resetState()
  }

  async function sairDaConta() {
    const uid = userIdRef.current
    if (uid && dataLoadedRef.current) {
      await Promise.all([
        saveContas(contas),
        saveCategorias(categorias),
        saveExtratoData(extratoData),
        saveFaturaData(faturaData),
        savePlanosData(planos, 'previsto'),
        savePlanosData(planosReal, 'real'),
        saveUserPrefs(perfil, onboardingCompleto, planejamentoLockado, desvioMinPerc, objetivoUsuario, metaSim),
      ])
    }
    await supabase.auth.signOut()
  }

  async function excluirConta(): Promise<{ error?: string }> {
    const { error } = await supabase.rpc('delete_current_user')
    if (error) return { error: error.message }
    try { await supabase.auth.signOut() } catch { /* sessão já invalidada */ }
    return {}
  }

  return (
    <Ctx.Provider value={{
      user, carregando,
      contas, categorias, extratoData, faturaData, planos, planosReal,
      planejamentoLockado, desvioMinPerc, perfil,
      setContas: setContasState, setCategorias: setCategoriasState,
      setExtratoData, updateExtratoMes,
      setFaturaData: setFaturaState,
      setPlanos: setPlanosState,
      finalizarPlanejamento, updatePlanoReal, setPlanejamentoLockado,
      setDesvioMinPerc, setPerfil,
      onboardingCompleto, setOnboardingCompleto,
      objetivoUsuario, setObjetivoUsuario,
      metaSim, setMetaSim,
      limparDados, sairDaConta, excluirConta,
    }}>
      {children}
    </Ctx.Provider>
  )
}
