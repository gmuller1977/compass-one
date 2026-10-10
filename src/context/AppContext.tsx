import { createContext, useContext, useState, useEffect, useRef } from 'react'
import type { ItensPorMes } from '../utils/itensPlano'
import type { CenarioPrevisao } from '../utils/saldoConta'
import type { ReactNode, Dispatch, SetStateAction } from 'react'
import type { User } from '@supabase/supabase-js'
import { mesesAlterados } from '../utils/gravacaoPorMes'
import { supabase } from '../lib/supabase'
import { limparUltimaAtividade } from '../utils/inatividade'

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
export type FormaPagamentoFatura = 'automatico' | 'pix' | 'boleto'

export type Conta = {
  id: string; nome: string; banco: string; tipo: TipoConta
  saldoInicial: number; cor: string; icone: string
  diaVencimento?: number; diaFechamento?: number
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
  /**
   * Qualquer categoria, fixa ou variável (utils/recorrencia). 'anual' (padrão):
   * repete todo mês, até dezembro. 'temporaria': um período curto (IPVA, IPTU,
   * seguro), perguntado ao planejar.
   *
   * A coluna `recorrencia_fim` (o "Até quando?") saiu do app em 08/10/2026, a
   * pedido do Guilherme: não é lida nem gravada, e o que está nela fica como
   * estava no banco.
   */
  recorrencia?: 'anual' | 'temporaria'
}

// descricao = variante (ex.: Seguro · Civic) e grupo sao gravados no plano
// desde usePlanejamento; declarar aqui evita casar categoria so pelo nome.
// `itens`: o detalhe do valor de cada mês (utils/itensPlano). `v` continua
// sendo a verdade; quem lê o plano não precisa saber que os itens existem.
export type PlanoCat     = { id?: string; nome: string; descricao?: string; grupo?: string; t?: string; v: number[]; itens?: ItensPorMes }
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
  /**
   * Em qual conta esta fixa cai NESTE mês, quando não é a do cadastro.
   *
   * Gravado sempre no DadosMes da conta de origem — a do cadastro, ou a
   * preferida quando a categoria não tem nenhuma. Assim existe um lugar só
   * para consultar, mesmo depois de a fixa já ter se mudado; guardar no destino
   * obrigaria a varrer todas as contas para descobrir quem a recebeu.
   */
  fixasContaOverride?: Record<string, string>
}

// ── Context type ─────────────────────────────────────────────────────
/**
 * `salvando`: há mês a caminho do banco. `erro`: a última tentativa falhou e o
 * que foi lançado está só neste aparelho — o app tenta de novo sozinho.
 * `semConexao`: o mesmo, com o navegador dizendo que está offline.
 */
export type EstadoGravacao = 'salvo' | 'salvando' | 'erro' | 'semConexao'

type AppCtx = {
  user:       User | null
  carregando: boolean
  contas:     Conta[]
  categorias: Categoria[]
  extratoData: Record<string, DadosMes>
  faturaData:  Record<string, unknown>
  planos:     Record<number, PlanoAnoData>
  desvioMinPerc: number
  percentualAlerta: number
  metodoSugestao: string
  /** Como o saldo previsto agrega a sobra do plano. Ver utils/saldoConta. */
  cenarioPrevisao: CenarioPrevisao
  saldoInicialDinheiro: number
  perfil: Perfil
  setContas:      Dispatch<SetStateAction<Conta[]>>
  setCategorias:  Dispatch<SetStateAction<Categoria[]>>
  updateExtratoMes: (key: string, fn: (prev: DadosMes) => DadosMes) => void
  setExtratoData: (v: Record<string, DadosMes>) => void
  setFaturaData:  Dispatch<SetStateAction<Record<string, unknown>>>
  setPlanos:      Dispatch<SetStateAction<Record<number, PlanoAnoData>>>
  setDesvioMinPerc: (v: number) => void
  setPercentualAlerta: (v: number) => void
  setMetodoSugestao: (v: string) => void
  setCenarioPrevisao: (v: CenarioPrevisao) => void
  setSaldoInicialDinheiro: (v: number) => void
  salvarSaldoInicialDinheiro: (v: number) => Promise<void>
  setPerfil: (v: Perfil) => void
  onboardingCompleto: boolean
  setOnboardingCompleto: (v: boolean) => void
  objetivoUsuario: string
  setObjetivoUsuario: (v: string) => void
  metaSim: MetaSim | null
  setMetaSim: (v: MetaSim | null) => void
  /** Se o que foi lançado já está no banco — ver "Gravação por mês". */
  gravacao: EstadoGravacao
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

/**
 * Formato das linhas como o Supabase devolve: snake_case, e qualquer coluna
 * pode vir null. Descrever isso aqui e o que faz o compilador avisar se uma
 * coluna for renomeada no banco. Com `any`, a leitura de uma coluna que
 * deixou de existir virava `undefined` em silencio e caia no valor padrao —
 * um cartao perdia o dia de fechamento e passava a fechar no dia 1.
 *
 * Numeros vem como number ou string dependendo do tipo da coluna, por isso
 * os `Number(...)` na conversao.
 */
type ContaRow = {
  id: string
  nome: string
  banco?: string | null
  tipo?: string | null
  saldo_inicial?: number | string | null
  cor?: string | null
  icone?: string | null
  dia_vencimento?: number | string | null
  dia_fechamento?: number | string | null
  incluir_no_saldo_inicial?: boolean | null
  agencia?: string | null
  numero_conta?: string | null
  forma_pagamento_fatura?: FormaPagamentoFatura | null
  conta_pagamento_id?: string | null
  apelido?: string | null
  preferida?: boolean | null
}

type CategoriaRow = {
  id: string
  nome: string
  tipo?: string | null
  fixa?: boolean | null
  tipo_movimento?: string | null
  forma_pagamento?: FormaPagamentoCategoria | null
  cor?: string | null
  icone?: string | null
  ativa?: boolean | null
  grupo?: string | null
  dia_vencimento?: number | string | null
  descricao?: string | null
  numero_parcelas?: number | string | null
  conta_debito_id?: string | null
  pin_quick?: boolean | null
  recorrencia?: string | null
}

type PrefRow = {
  perfil_nome?: string | null
  perfil_apelido?: string | null
  onboarding_completo?: boolean | null
  planejamento_lockado?: boolean | null
  desvio_min_perc?: number | string | null
  percentual_alerta?: number | string | null
  metodo_sugestao?: string | null
  cenario_previsao?: string | null
  objetivo_usuario?: string | null
  streak_atual?: number | string | null
  maior_streak?: number | string | null
  ultimo_acesso_ativo?: string | null
  meta_simulacao?: MetaSim | null
  saldo_inicial_dinheiro?: number | string | null
}

function rowToConta(row: ContaRow): Conta {
  return {
    id: row.id,
    nome: row.nome,
    banco: row.banco ?? '',
    tipo: row.tipo as TipoConta,
    saldoInicial: Number(row.saldo_inicial ?? 0),
    cor: row.cor ?? '',
    icone: row.icone ?? '',
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
    // Colunas da migração 013 — precisam existir no banco antes deste código.
    recorrencia: c.recorrencia ?? 'anual',
  }
}

function rowToCategoria(row: CategoriaRow): Categoria {
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
    recorrencia: row.recorrencia === 'temporaria' ? 'temporaria' : 'anual',
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

  // ── Gravação por mês ──────────────────────────────────────────────────
  // O que está no banco, mês a mês: o objeto como foi carregado ou gravado.
  // Toda tela atualiza um mês por spread, então o mês alterado é o que tem
  // identidade diferente daqui — e só ele vai para o banco. Antes cada
  // lançamento regravava o histórico inteiro de extratos e faturas: lento no
  // celular e, com o computador aberto ao mesmo tempo, a aba antiga devolvia
  // meses velhos por cima dos novos.
  const extratoNoBancoRef = useRef<Record<string, unknown>>({})
  const faturaNoBancoRef  = useRef<Record<string, unknown>>({})
  // O estado mais recente a gravar, e uma fila por tabela: gravações do mesmo
  // mês nunca correm juntas, e a mais nova sempre chega por último.
  const extratoAGravarRef = useRef<Record<string, unknown>>({})
  const faturaAGravarRef  = useRef<Record<string, unknown>>({})
  const filaExtratoRef = useRef<Promise<void>>(Promise.resolve())
  const filaFaturaRef  = useRef<Promise<void>>(Promise.resolve())
  const gravandoRef = useRef(0)
  const falhouRef = useRef(false)
  const novaTentativaRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tentativasRef = useRef(0)
  const [gravacao, setGravacao] = useState<EstadoGravacao>('salvo')

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
  // Pessimista e o padrao porque e o comportamento que ja estava no ar, e
  // porque errar para menos e o lado certo de errar num app de financas.
  const [cenarioPrevisao,     setCenarioPrevisaoState]     = useState<CenarioPrevisao>('pessimista')
  const [perfil,              setPerfilState]              = useState<Perfil>({ nome: '', apelido: '' })
  const [onboardingCompleto,  setOnboardingCompletoState]  = useState(false)
  const [objetivoUsuario,     setObjetivoUsuarioState]     = useState('')
  const [metaSim,             setMetaSimState]             = useState<MetaSim | null>(null)
  const [saldoInicialDinheiro, setSaldoInicialDinheiroState] = useState(0)

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
        // Sem sessão, o carimbo de última atividade não vale mais nada. Apagar
        // aqui — e não só no "Sair" — cobre toda forma de a sessão acabar, e
        // impede o próximo login de herdar um carimbo velho e sair na hora.
        limparUltimaAtividade()
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
    if (import.meta.env.DEV) console.log('🔄 [loadData] iniciando para userId:', userId.slice(0, 8))
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

    if (import.meta.env.DEV) console.log('📊 [loadData] resultado do banco:', {
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
    if (import.meta.env.DEV && userOnlyContas.length > 0) console.log('🔀 [loadData] mesclando', userOnlyContas.length, 'contas adicionadas durante o load')
    setContasState(mergedContas)
    const contaIdSet = new Set(mergedContas.map(c => c.id))

    // Categorias — deduplica por (nome+tipo+variante) para proteger contra race condition de carregamento duplo
    // Inclui descricao na chave para permitir mesma categoria com variantes diferentes (ex: Guilherme·SENAC e Guilherme·ABC)
    const rawCats: Categoria[] = (categoriasRows ?? []).map(rowToCategoria)
    const seenCatKeys = new Set<string>()
    const catsLoaded = rawCats.filter(c => {
      const key = `${c.nome}|${c.tipo}|${c.descricao ?? ''}`
      if (seenCatKeys.has(key)) return false
      seenCatKeys.add(key)
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
    const pref = prefRow as PrefRow | null
    setPerfilState({ nome: pref?.perfil_nome ?? '', apelido: pref?.perfil_apelido ?? '' })
    const hasData = contasLoaded.length > 0 || (categoriasRows ?? []).length > 0
    setOnboardingCompletoState(pref?.onboarding_completo ?? hasData)
    setPlanejamentoLockadoState(pref?.planejamento_lockado ?? false)
    setDesvioMinPercState(Number(pref?.desvio_min_perc ?? 10))
    setPercentualAlertaState(Number(pref?.percentual_alerta ?? 5))
    setMetodoSugestaoState(pref?.metodo_sugestao ?? 'media_3_meses')
    setCenarioPrevisaoState(
      pref?.cenario_previsao === 'moderado' || pref?.cenario_previsao === 'otimista'
        ? pref.cenario_previsao
        : 'pessimista')
    setObjetivoUsuarioState(pref?.objetivo_usuario ?? '')
    setMetaSimState(pref?.meta_simulacao ?? null)
    setSaldoInicialDinheiroState(Number(pref?.saldo_inicial_dinheiro ?? 0))

    // Extrato — filtra contas excluídas (permite 'dinheiro' que não tem conta registrada)
    const extratoLoaded: Record<string, DadosMes> = {}
    for (const row of (extratoRows ?? [])) {
      if (row.conta_id !== 'dinheiro' && !contaIdSet.has(row.conta_id)) continue
      extratoLoaded[extratoKeyFromRow(row.conta_id, row.ano, row.mes)] = row.dados as DadosMes
    }
    extratoNoBancoRef.current = { ...extratoLoaded }
    extratoAGravarRef.current = extratoLoaded
    setExtratoState(extratoLoaded)

    // Fatura — filtra contas excluídas
    const faturaLoaded: Record<string, unknown> = {}
    for (const row of (faturaRows ?? [])) {
      if (!contaIdSet.has(row.conta_id)) continue
      faturaLoaded[extratoKeyFromRow(row.conta_id, row.ano, row.mes)] = row.dados
    }
    faturaNoBancoRef.current = { ...faturaLoaded }
    faturaAGravarRef.current = faturaLoaded
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
    extratoNoBancoRef.current = {}; faturaNoBancoRef.current = {}
    extratoAGravarRef.current = {}; faturaAGravarRef.current = {}
    falhouRef.current = false; tentativasRef.current = 0
    if (novaTentativaRef.current) { clearTimeout(novaTentativaRef.current); novaTentativaRef.current = null }
    setGravacao('salvo')
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
    if (import.meta.env.DEV) console.log('💾 [saveContas] chamado:', { qtd: list.length, savedCount: savedCountRef.current.contas, dataLoaded: dataLoadedRef.current })
    if (list.length === 0) {
      if (!safeSaveCheck('contas', 0)) return
      console.error('⚠️ [saveContas] DELETE ALL contas!')
      await supabase.from('contas').delete().eq('user_id', uid)
      savedCountRef.current.contas = 0
      return
    }
    const { data: upserted, error } = await supabase.from('contas').upsert(list.map(c => contaToRow(c, uid))).select('id')
    if (error) { console.error('❌ [saveContas] upsert error:', error.message, error.code); return }
    if (import.meta.env.DEV) console.log('✅ [saveContas] upsert OK:', upserted?.length, 'rows. IDs:', list.map(c => c.id))
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

  function atualizarEstadoGravacao() {
    if (gravandoRef.current > 0) setGravacao('salvando')
    else if (falhouRef.current) setGravacao(navigator.onLine === false ? 'semConexao' : 'erro')
    else setGravacao('salvo')
  }

  /**
   * Grava os meses que mudaram desde o último carregamento ou gravação. Falha
   * não marca nada como gravado: o mês continua diferente do banco e vai na
   * próxima tentativa, que é agendada aqui mesmo.
   */
  async function gravarMesesAlterados(
    tabela: 'extrato_data' | 'fatura_data',
    data: Record<string, unknown>,
    noBanco: { current: Record<string, unknown> },
    countKey: 'extrato' | 'fatura',
  ) {
    if (!canSave()) return
    const uid = userIdRef.current!
    if (Object.keys(data).length === 0) {
      if (!safeSaveCheck(countKey, 0)) return
      await supabase.from(tabela).delete().eq('user_id', uid)
      noBanco.current = {}
      savedCountRef.current[countKey] = 0
      return
    }
    const alterados = mesesAlterados(data, noBanco.current)
    if (alterados.length === 0) return
    const rows = alterados.map(key => {
      const { contaId, ano, mes } = parseExtratoKey(key)
      return { user_id: uid, conta_id: contaId, ano, mes, dados: data[key] }
    })
    gravandoRef.current++
    atualizarEstadoGravacao()
    let error: unknown = null
    try {
      ;({ error } = await supabase.from(tabela).upsert(rows, { onConflict: 'user_id,conta_id,ano,mes' }))
    } catch (e) {
      error = e
    }
    gravandoRef.current--
    if (error) {
      console.error(`save ${tabela}:`, error)
      falhouRef.current = true
      agendarNovaTentativa()
    } else {
      for (const k of alterados) noBanco.current[k] = data[k]
      savedCountRef.current[countKey] = Object.keys(data).length
      if (!temMesNaoGravado()) { falhouRef.current = false; tentativasRef.current = 0 }
    }
    atualizarEstadoGravacao()
  }

  function temMesNaoGravado(): boolean {
    return mesesAlterados(extratoAGravarRef.current, extratoNoBancoRef.current).length > 0
      || mesesAlterados(faturaAGravarRef.current, faturaNoBancoRef.current).length > 0
  }

  function saveExtratoData(data: Record<string, DadosMes>): Promise<void> {
    extratoAGravarRef.current = data
    filaExtratoRef.current = filaExtratoRef.current.then(() =>
      gravarMesesAlterados('extrato_data', extratoAGravarRef.current, extratoNoBancoRef, 'extrato'))
    return filaExtratoRef.current
  }

  function saveFaturaData(data: Record<string, unknown>): Promise<void> {
    faturaAGravarRef.current = data
    filaFaturaRef.current = filaFaturaRef.current.then(() =>
      gravarMesesAlterados('fatura_data', faturaAGravarRef.current, faturaNoBancoRef, 'fatura'))
    return filaFaturaRef.current
  }

  /** 5 s, 10 s, 20 s... até 1 min, e na hora em que a conexão volta. */
  function agendarNovaTentativa() {
    if (novaTentativaRef.current) return
    const espera = Math.min(5000 * 2 ** tentativasRef.current, 60000)
    tentativasRef.current++
    novaTentativaRef.current = setTimeout(tentarGravarDeNovo, espera)
  }

  function tentarGravarDeNovo() {
    if (novaTentativaRef.current) { clearTimeout(novaTentativaRef.current); novaTentativaRef.current = null }
    if (!falhouRef.current) return
    saveExtratoData(extratoAGravarRef.current as Record<string, DadosMes>)
    saveFaturaData(faturaAGravarRef.current)
  }

  useEffect(() => {
    const voltou = () => tentarGravarDeNovo()
    const caiu = () => atualizarEstadoGravacao()
    window.addEventListener('online', voltou)
    window.addEventListener('offline', caiu)
    return () => { window.removeEventListener('online', voltou); window.removeEventListener('offline', caiu) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Ao voltar para o app depois de um tempo em outra aba ou em outro app,
   * relê do banco o que pode ter sido mudado em OUTRO aparelho: lançamentos,
   * faturas, plano, contas e categorias. Sem isso a aba que ficou aberta no
   * computador seguia com a cópia antiga e, na próxima edição, gravava por
   * cima do que foi lançado no celular.
   *
   * Não relê com gravação pendente: o que só existe aqui iria embora. Nesse
   * caso grava primeiro, e a releitura fica para a próxima volta.
   */
  async function recarregarDoBanco() {
    const uid = userIdRef.current
    if (!uid || !dataLoadedRef.current) return
    if (gravandoRef.current > 0 || falhouRef.current || temMesNaoGravado()) return

    const [
      { data: contasRows, error: e1 },
      { data: categoriasRows, error: e2 },
      { data: extratoRows, error: e3 },
      { data: faturaRows, error: e4 },
      { data: planoRows, error: e5 },
    ] = await Promise.all([
      supabase.from('contas').select('*').eq('user_id', uid),
      supabase.from('categorias').select('*').eq('user_id', uid),
      supabase.from('extrato_data').select('conta_id, ano, mes, dados').eq('user_id', uid),
      supabase.from('fatura_data').select('conta_id, ano, mes, dados').eq('user_id', uid),
      supabase.from('planejamento_data').select('ano, tipo_plano, dados').eq('user_id', uid).eq('tipo_plano', 'previsto'),
    ])
    if (e1 || e2 || e3 || e4 || e5) { console.warn('recarregarDoBanco: mantendo a cópia local', { e1, e2, e3, e4, e5 }); return }
    // Algo foi gravado enquanto a leitura estava no ar: a cópia local é mais nova.
    if (userIdRef.current !== uid || gravandoRef.current > 0 || temMesNaoGravado()) return
    // Banco vazio com dados aqui é falha de leitura, não exclusão (ver safeSaveCheck).
    if ((contasRows ?? []).length === 0 && contasRef.current.length > 0) return

    const contasLidas = (contasRows ?? []).map(rowToConta)
    const contaIds = new Set(contasLidas.map(c => c.id))
    const extrato: Record<string, DadosMes> = {}
    for (const row of extratoRows ?? []) {
      if (row.conta_id !== 'dinheiro' && !contaIds.has(row.conta_id)) continue
      extrato[extratoKeyFromRow(row.conta_id, row.ano, row.mes)] = row.dados as DadosMes
    }
    const fatura: Record<string, unknown> = {}
    for (const row of faturaRows ?? []) {
      if (!contaIds.has(row.conta_id)) continue
      fatura[extratoKeyFromRow(row.conta_id, row.ano, row.mes)] = row.dados
    }
    const planosLidos: Record<number, PlanoAnoData> = {}
    for (const row of planoRows ?? []) planosLidos[row.ano] = row.dados as PlanoAnoData

    extratoNoBancoRef.current = { ...extrato }; extratoAGravarRef.current = extrato
    faturaNoBancoRef.current  = { ...fatura };  faturaAGravarRef.current  = fatura
    savedCountRef.current.contas     = contasLidas.length
    savedCountRef.current.categorias = (categoriasRows ?? []).length
    savedCountRef.current.extrato    = Object.keys(extrato).length
    savedCountRef.current.fatura     = Object.keys(fatura).length
    savedCountRef.current.planos     = Object.keys(planosLidos).length
    setContasState(contasLidas)
    const vistas = new Set<string>()
    setCategoriasState((categoriasRows ?? []).map(rowToCategoria).filter(c => {
      const k = `${c.nome}|${c.tipo}|${c.descricao ?? ''}`
      if (vistas.has(k)) return false
      vistas.add(k)
      return true
    }))
    setExtratoState(extrato)
    setFaturaState(fatura)
    setPlanosState(planosLidos)
  }

  useEffect(() => {
    let saiuEm = 0
    const mudou = () => {
      if (document.visibilityState === 'hidden') { saiuEm = Date.now(); return }
      if (saiuEm && Date.now() - saiuEm >= 30_000) recarregarDoBanco()
      saiuEm = 0
    }
    document.addEventListener('visibilitychange', mudou)
    return () => document.removeEventListener('visibilitychange', mudou)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Fechar ou recarregar a aba com mês não gravado perderia o lançamento: o
  // navegador pergunta antes.
  useEffect(() => {
    const antesDeSair = (e: BeforeUnloadEvent) => {
      if (gravandoRef.current > 0 || temMesNaoGravado()) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', antesDeSair)
    return () => window.removeEventListener('beforeunload', antesDeSair)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
    pa = 5, metodo = 'media_3_meses', sid = 0, cen: CenarioPrevisao = 'pessimista'
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
      cenario_previsao: cen,
      objetivo_usuario: ou || null,
      meta_simulacao: ms ?? null,
      saldo_inicial_dinheiro: sid,
      atualizado_em: new Date().toISOString(),
    })
    if (error) console.error('save user_preferences:', error)
  }

  async function salvarSaldoInicialDinheiro(v: number) {
    setSaldoInicialDinheiroState(v)
    if (!canSave()) return
    const uid = userIdRef.current!
    const { error } = await supabase.from('user_preferences').upsert({
      user_id: uid,
      saldo_inicial_dinheiro: v,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    if (error) console.error('save saldo_inicial_dinheiro:', error)
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
    saveUserPrefs(perfil, onboardingCompleto, planejamentoLockado, desvioMinPerc, objetivoUsuario, metaSim, percentualAlerta, metodoSugestao, saldoInicialDinheiro, cenarioPrevisao)
  }, [perfil, onboardingCompleto, planejamentoLockado, desvioMinPerc, objetivoUsuario, metaSim, percentualAlerta, metodoSugestao, saldoInicialDinheiro, cenarioPrevisao])

  // ── Funções de update ────────────────────────────────────────────────
  function setExtratoData(v: Record<string, DadosMes>) { setExtratoState(v) }

  function updateExtratoMes(key: string, fn: (prev: DadosMes) => DadosMes) {
    setExtratoState(prev => ({
      ...prev,
      [key]: fn(prev[key] ?? { lancamentos: {}, saldoBanco: '' }),
    }))
  }

  // finalizarPlanejamento / updatePlanoReal / setPlanejamentoLockado foram
  // removidos na migracao para plano unico. Eram as duas operacoes que
  // sobrescreviam um plano inteiro e travavam a edicao; manter exportadas
  // deixaria o modelo de dois planos voltar pela porta dos fundos.
  // planosReal continua sendo carregado e salvo apenas como historico.

  function setDesvioMinPerc(v: number) { setDesvioMinPercState(v) }
  function setPercentualAlerta(v: number) { setPercentualAlertaState(v) }
  function setMetodoSugestao(v: string) { setMetodoSugestaoState(v) }
  function setCenarioPrevisao(v: CenarioPrevisao) { setCenarioPrevisaoState(v) }
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
        saveUserPrefs(perfil, onboardingCompleto, planejamentoLockado, desvioMinPerc, objetivoUsuario, metaSim, percentualAlerta, metodoSugestao, saldoInicialDinheiro, cenarioPrevisao),
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
      contas, categorias, extratoData, faturaData, planos,
      desvioMinPerc, percentualAlerta, metodoSugestao, cenarioPrevisao, perfil,
      saldoInicialDinheiro, setSaldoInicialDinheiro: setSaldoInicialDinheiroState, salvarSaldoInicialDinheiro,
      setContas: setContasState, setCategorias: setCategoriasState,
      setExtratoData, updateExtratoMes,
      setFaturaData: setFaturaState,
      setPlanos: setPlanosState,
      setDesvioMinPerc, setPercentualAlerta, setMetodoSugestao, setCenarioPrevisao, setPerfil,
      onboardingCompleto, setOnboardingCompleto,
      objetivoUsuario, setObjetivoUsuario,
      metaSim, setMetaSim,
      gravacao,
      limparDados, sairDaConta, excluirConta,
    }}>
      {children}
    </Ctx.Provider>
  )
}
