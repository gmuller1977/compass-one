import { createContext, useContext, useState, useEffect, useRef } from 'react'
import type { ReactNode, Dispatch, SetStateAction } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

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
  percentualAlerta: number
  metodoSugestao: string
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
  setPercentualAlerta: (v: number) => void
  setMetodoSugestao: (v: string) => void
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
  const loadRetryRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadRetryCountRef = useRef(0)
  // Refs para mesclar state do usuário com dados carregados do banco (evita perda em race condition)
  const contasRef      = useRef<Conta[]>([])
  const categoriasRef  = useRef<Categoria[]>([])
  // Rastreia a última contagem conhecida de cada tabela crítica.
  // Usado para bloquear saves vazios acidentais sobre dados existentes.
  const savedCountRef = useRef({ contas: -1, categorias: -1, extrato: -1, fatura: -1, planos: -1, planosReal: -1 })

  // State (não ref) para que effects de save re-executem quando o load terminar
  const [dataLoaded, setDataLoadedState] = useState(false)

  const [contas,      setContasState]     = useState<Conta[]>([])
  const [categorias,  setCategoriasState] = useState<Categoria[]>([])
  const [extratoData, setExtratoState]    = useState<Record<string, DadosMes>>({})
  const [faturaData,  setFaturaState]     = useState<Record<string, unknown>>({})
  const [planos,          setPlanosState]     = useState<Record<number, PlanoAnoData>>({})
  const [planosReal,      setPlanosRealState] = useState<Record<number, PlanoAnoData>>({})
  const [planejamentoLockado, setPlanejamentoLockadoState] = useState(false)
  const [desvioMinPerc,       setDesvioMinPercState]       = useState(10)
  const [percentualAlerta,    setPercentualAlertaState]    = useState(5)
  const [metodoSugestao,      setMetodoSugestaoState]      = useState('media_3_meses')
  const [perfil,              setPerfilState]              = useState<Perfil>({ nome: '', apelido: '' })
  const [onboardingCompleto,  setOnboardingCompletoState]  = useState(false)
  const [objetivoUsuario,     setObjetivoUsuarioState]     = useState('')
  const [metaSim,             setMetaSimState]             = useState<MetaSim | null>(null)

  // ── Auth ─────────────────────────────────────────────────────────────
  // Usamos SOMENTE onAuthStateChange (não getSession separado) para garantir que
  // o client Supabase está totalmente inicializado com auth headers antes de qualquer query.
  // getSession() pode disparar loadData antes dos headers estarem prontos, causando
  // queries que retornam vazio via RLS mesmo com sessão válida.
  useEffect(() => {
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
    console.log('🔄 [loadData] iniciando para userId:', userId.slice(0, 8))
    loadingForUserRef.current = userId
    setCarregando(true)
    dataLoadedRef.current = false
    loadedUserIdRef.current = null

    const [
      { data: contasRows,  error: contasErr },
      { data: categoriasRows, error: catsErr },
      { data: prefRow },
      { data: extratoRows, error: extratoErr },
      { data: faturaRows,  error: faturaErr },
      { data: planoRows,   error: planosErr },
    ] = await Promise.all([
      supabase.from('contas').select('*').eq('user_id', userId),
      supabase.from('categorias').select('*').eq('user_id', userId),
      supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('extrato_data').select('conta_id, ano, mes, dados').eq('user_id', userId),
      supabase.from('fatura_data').select('conta_id, ano, mes, dados').eq('user_id', userId),
      supabase.from('planejamento_data').select('ano, tipo_plano, dados').eq('user_id', userId),
    ])

    console.log('📊 [loadData] resultado do banco:', {
      contas: contasRows?.length ?? 'ERRO',
      categorias: categoriasRows?.length ?? 'ERRO',
      erros: { contasErr: !!contasErr, catsErr: !!catsErr, extratoErr: !!extratoErr, faturaErr: !!faturaErr, planosErr: !!planosErr }
    })

    // Se qualquer tabela crítica retornar erro, abortar sem salvar estado vazio e agendar retry
    if (contasErr || catsErr || extratoErr || faturaErr || planosErr) {
      console.error('loadData erro:', { contasErr, catsErr, extratoErr, faturaErr, planosErr })
      loadingForUserRef.current = null
      loadRetryCountRef.current += 1
      const tentativa = loadRetryCountRef.current
      if (tentativa <= 4) {
        const delay = Math.min(1000 * tentativa, 8000) // 1s, 2s, 3s, 4s... max 8s
        console.warn(`loadData: tentativa ${tentativa}/4, retry em ${delay}ms`)
        loadRetryRef.current = setTimeout(() => { loadRetryRef.current = null; loadData(userId) }, delay)
      } else {
        console.error('loadData: máximo de tentativas atingido, dados podem estar indisponíveis')
        setCarregando(false)
      }
      return
    }
    loadRetryCountRef.current = 0 // reset no sucesso

    // Contas — mescla com qualquer item que o usuário adicionou durante o load
    const contasLoaded: Conta[] = (contasRows ?? []).map(rowToConta)
    const contasDbIds = new Set(contasLoaded.map(c => c.id))
    const userOnlyContas = contasRef.current.filter(c => !contasDbIds.has(c.id))
    const mergedContas = userOnlyContas.length > 0 ? [...contasLoaded, ...userOnlyContas] : contasLoaded
    if (userOnlyContas.length > 0) console.log('🔀 [loadData] mesclando', userOnlyContas.length, 'contas adicionadas durante o load')
    setContasState(mergedContas)
    const contaIdSet = new Set(mergedContas.map(c => c.id))

    // Categorias — deduplica por nome antes de usar (protege contra race condition de carregamento duplo)
    const rawCats: Categoria[] = (categoriasRows ?? []).map(rowToCategoria)
    const seenNomes = new Set<string>()
    const catsLoaded = rawCats.filter(c => {
      if (seenNomes.has(c.nome)) return false
      seenNomes.add(c.nome)
      return true
    })
    // NÃO gera CATEGORIAS_PADRAO aqui: se DB retornou 0 por falha de auth,
    // salvar PADRAO deletaria as categorias reais do usuário.
    // PADRAO é criado somente no fluxo de Onboarding.
    // Mescla com categorias que o usuário adicionou durante o load
    const catsDbIds = new Set(catsLoaded.map(c => c.id))
    const userOnlyCats = categoriasRef.current.filter(c => !catsDbIds.has(c.id))
    const mergedCats = userOnlyCats.length > 0 ? [...catsLoaded, ...userOnlyCats] : catsLoaded
    setCategoriasState(mergedCats)

    // Preferences
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pref = prefRow as any
    setPerfilState({ nome: pref?.perfil_nome ?? '', apelido: pref?.perfil_apelido ?? '' })
    const hasData = contasLoaded.length > 0 || (categoriasRows ?? []).length > 0
    setOnboardingCompletoState(pref?.onboarding_completo ?? hasData)
    setPlanejamentoLockadoState(pref?.planejamento_lockado ?? false)
    setDesvioMinPercState(Number(pref?.desvio_min_perc ?? 10))
    setPercentualAlertaState(Number(pref?.percentual_alerta ?? 5))
    setMetodoSugestaoState(pref?.metodo_sugestao ?? 'media_3_meses')
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

    // Registra contagens após load bem-sucedido para proteção de save seguro
    savedCountRef.current = {
      contas:     mergedContas.length,
      categorias: mergedCats.length,
      extrato:    Object.keys(extratoLoaded).length,
      fatura:     Object.keys(faturaLoaded).length,
      planos:     Object.keys(planosLoaded).length,
      planosReal: Object.keys(planosRealLoaded).length,
    }

    loadedUserIdRef.current = userId
    setCarregando(false)
    dataLoadedRef.current = true
    setDataLoadedState(true) // dispara effects de save com o state atual (incluindo itens adicionados durante load)
    loadingForUserRef.current = null
  }

  function resetState() {
    dataLoadedRef.current = false
    setDataLoadedState(false)
    loadedUserIdRef.current = null
    savedCountRef.current = { contas: -1, categorias: -1, extrato: -1, fatura: -1, planos: -1, planosReal: -1 }
    if (loadRetryRef.current) { clearTimeout(loadRetryRef.current); loadRetryRef.current = null }
    loadRetryCountRef.current = 0
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

  function safeSaveCheck(key: keyof typeof savedCountRef.current, newCount: number): boolean {
    const known = savedCountRef.current[key]
    if (known < 0) {
      console.warn(`[safeSave] Bloqueado: ${key} nunca carregado do banco (known=${known})`)
      return false
    }
    if (newCount === 0 && known > 0) {
      console.warn(`[safeSave] Bloqueado: tentativa de apagar ${known} ${key} com estado vazio`)
      return false
    }
    return true
  }

  async function saveContas(list: Conta[]) {
    if (!canSave()) return
    const uid = userIdRef.current!
    console.log('💾 [saveContas] chamado:', { qtd: list.length, savedCount: savedCountRef.current.contas, dataLoaded: dataLoadedRef.current })
    if (list.length === 0) {
      if (!safeSaveCheck('contas', 0)) return
      console.error('⚠️ [saveContas] DELETE ALL contas!')
      await supabase.from('contas').delete().eq('user_id', uid)
      savedCountRef.current.contas = 0
      return
    }
    const { data: upserted, error } = await supabase.from('contas').upsert(list.map(c => contaToRow(c, uid))).select('id')
    if (error) { console.error('❌ [saveContas] upsert error:', error.message, error.code); return }
    console.log('✅ [saveContas] upsert OK:', upserted?.length, 'rows. IDs:', list.map(c => c.id))
    const ids = list.map(c => c.id).join(',')
    const { error: delErr, count } = await supabase.from('contas').delete({ count: 'exact' }).eq('user_id', uid).not('id', 'in', `(${ids})`)
    if (delErr) console.error('❌ [saveContas] delete-stale error:', delErr.message)
    else if (count && count > 0) console.warn('🗑️ [saveContas] delete-stale apagou', count, 'contas antigas')
    savedCountRef.current.contas = list.length
  }

  async function saveCategorias(list: Categoria[]) {
    if (!canSave()) return
    const uid = userIdRef.current!
    if (list.length === 0) {
      if (!safeSaveCheck('categorias', 0)) return
      await supabase.from('categorias').delete().eq('user_id', uid)
      savedCountRef.current.categorias = 0
      return
    }
    const { error } = await supabase.from('categorias').upsert(list.map(c => categoriaToRow(c, uid)))
    if (error) { console.error('save categorias:', error); return }
    const ids = list.map(c => c.id).join(',')
    await supabase.from('categorias').delete().eq('user_id', uid).not('id', 'in', `(${ids})`)
    savedCountRef.current.categorias = list.length
  }

  async function saveExtratoData(data: Record<string, DadosMes>) {
    if (!canSave()) return
    const uid = userIdRef.current!
    if (Object.keys(data).length === 0) {
      if (!safeSaveCheck('extrato', 0)) return
      await supabase.from('extrato_data').delete().eq('user_id', uid)
      savedCountRef.current.extrato = 0
      return
    }
    const rows = Object.entries(data).map(([key, dados]) => {
      const { contaId, ano, mes } = parseExtratoKey(key)
      return { user_id: uid, conta_id: contaId, ano, mes, dados }
    })
    const { error } = await supabase
      .from('extrato_data')
      .upsert(rows, { onConflict: 'user_id,conta_id,ano,mes' })
    if (error) { console.error('save extrato_data:', error); return }
    savedCountRef.current.extrato = rows.length
  }

  async function saveFaturaData(data: Record<string, unknown>) {
    if (!canSave()) return
    const uid = userIdRef.current!
    if (Object.keys(data).length === 0) {
      if (!safeSaveCheck('fatura', 0)) return
      await supabase.from('fatura_data').delete().eq('user_id', uid)
      savedCountRef.current.fatura = 0
      return
    }
    const rows = Object.entries(data).map(([key, dados]) => {
      const { contaId, ano, mes } = parseExtratoKey(key)
      return { user_id: uid, conta_id: contaId, ano, mes, dados }
    })
    const { error } = await supabase
      .from('fatura_data')
      .upsert(rows, { onConflict: 'user_id,conta_id,ano,mes' })
    if (error) { console.error('save fatura_data:', error); return }
    savedCountRef.current.fatura = rows.length
  }

  async function savePlanosData(dict: Record<number, PlanoAnoData>, tipo: 'previsto' | 'real') {
    if (!canSave()) return
    const uid = userIdRef.current!
    const entries = Object.entries(dict)
    const countKey = tipo === 'previsto' ? 'planos' : 'planosReal'
    if (entries.length === 0) {
      if (!safeSaveCheck(countKey, 0)) return
      await supabase.from('planejamento_data').delete().eq('user_id', uid).eq('tipo_plano', tipo)
      savedCountRef.current[countKey] = 0
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
    savedCountRef.current[countKey] = entries.length
  }

  async function saveUserPrefs(
    p: Perfil, oc: boolean, pl: boolean, dmp: number, ou = '', ms: MetaSim | null = null,
    pa = 5, metodo = 'media_3_meses'
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
      percentual_alerta: pa,
      metodo_sugestao: metodo,
      objetivo_usuario: ou || null,
      meta_simulacao: ms ?? null,
      atualizado_em: new Date().toISOString(),
    })
    if (error) console.error('save user_preferences:', error)
  }

  // ── Auto-save effects ────────────────────────────────────────────────
  // dataLoaded é state (não ref) para que o effect re-execute quando o load terminar,
  // garantindo que itens adicionados durante o load sejam salvos no banco.
  useEffect(() => { // eslint-disable-line react-hooks/exhaustive-deps
    contasRef.current = contas
    if (!dataLoaded) return
    if (contas.length === 0) return
    saveContas(contas)
  }, [contas, dataLoaded])
  useEffect(() => { // eslint-disable-line react-hooks/exhaustive-deps
    categoriasRef.current = categorias
    if (!dataLoaded) return
    if (categorias.length === 0) return
    saveCategorias(categorias)
  }, [categorias, dataLoaded])
  useEffect(() => { // eslint-disable-line react-hooks/exhaustive-deps
    if (!dataLoadedRef.current) return
    saveExtratoData(extratoData)
  }, [extratoData])
  useEffect(() => { // eslint-disable-line react-hooks/exhaustive-deps
    if (!dataLoadedRef.current) return
    saveFaturaData(faturaData)
  }, [faturaData])
  useEffect(() => { // eslint-disable-line react-hooks/exhaustive-deps
    if (!dataLoadedRef.current) return
    savePlanosData(planos, 'previsto')
  }, [planos])
  useEffect(() => { // eslint-disable-line react-hooks/exhaustive-deps
    if (!dataLoadedRef.current) return
    savePlanosData(planosReal, 'real')
  }, [planosReal])
  useEffect(() => { // eslint-disable-line react-hooks/exhaustive-deps
    if (!dataLoadedRef.current) return
    saveUserPrefs(perfil, onboardingCompleto, planejamentoLockado, desvioMinPerc, objetivoUsuario, metaSim, percentualAlerta, metodoSugestao)
  }, [perfil, onboardingCompleto, planejamentoLockado, desvioMinPerc, objetivoUsuario, metaSim, percentualAlerta, metodoSugestao])

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
  function setPercentualAlerta(v: number) { setPercentualAlertaState(v) }
  function setMetodoSugestao(v: string) { setMetodoSugestaoState(v) }
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
        saveUserPrefs(perfil, onboardingCompleto, planejamentoLockado, desvioMinPerc, objetivoUsuario, metaSim, percentualAlerta, metodoSugestao),
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
      planejamentoLockado, desvioMinPerc, percentualAlerta, metodoSugestao, perfil,
      setContas: setContasState, setCategorias: setCategoriasState,
      setExtratoData, updateExtratoMes,
      setFaturaData: setFaturaState,
      setPlanos: setPlanosState,
      finalizarPlanejamento, updatePlanoReal, setPlanejamentoLockado,
      setDesvioMinPerc, setPercentualAlerta, setMetodoSugestao, setPerfil,
      onboardingCompleto, setOnboardingCompleto,
      objetivoUsuario, setObjetivoUsuario,
      metaSim, setMetaSim,
      limparDados, sairDaConta, excluirConta,
    }}>
      {children}
    </Ctx.Provider>
  )
}
