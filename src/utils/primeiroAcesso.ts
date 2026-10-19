import type { Categoria, Conta, PlanoAnoData, TipoMovimento, FormaPagamentoCategoria } from '../context/AppContext'
import { CATEGORIAS_PADRAO } from '../data/categoriasPadrao'
import { montarCategoria, ehFaturaDoCartao } from './novaCategoria'
import { buscarCategoria } from './categoriaIcone'
import { mesDaFaturaDaCompra, tipoNaFatura } from './lancamentoRapido'
import { mesDoGastoNoCartao } from './lancarPorMes'
import { dataDoSaldo, type OrigemDoSaldo } from './saldoDesde'

/**
 * O primeiro acesso de uma conta nova: seis perguntas e um resultado.
 * Pedido do Guilherme em 17/10/2026, sobre protótipo aprovado ("melhorou
 * bastante, pode publicar"): quem chegava caía em Configurações, num
 * formulário, e a primeira impressão era de trabalho, não de ajuda.
 *
 * O que as respostas viram, e quando:
 *
 * - **Na hora:** a conta do banco (com o saldo), o cartão, as categorias
 *   sugeridas ligadas, a forma de pagar de cada conta do mês, e a meta de
 *   economia nos meses que faltam do ano (`objetivos`).
 * - **O plano inicial** (18/10/2026, pedido do Guilherme): os valores
 *   informados viram o plano do primeiro mês INTEIRO, por 12 meses, o mesmo
 *   valor todo mês (`planoDoPrimeiroAcesso` em utils/primeiroPlano), e as
 *   contas do mês viram FIXAS com o dia (`fixasDoPrimeiroAcesso`). As
 *   `estimativas` ficam guardadas no plano do ano, de onde o plano é lido.
 */

/** "Visto" na conta (vistoNaConta): quem já passou, ou escolheu configurar sozinho. */
export const CHAVE_PRIMEIRO_ACESSO = 'primeiro-acesso'

/**
 * Conta nova vai para o primeiro acesso; quem já cadastrou alguma conta (o
 * caminho antigo, por Configurações) segue lá. Membro de conta compartilhada
 * nunca: o cadastro é do administrador.
 */
export function vaiParaPrimeiroAcesso(a: { onboardingCompleto: boolean; temConta: boolean; membro: boolean; visto: boolean }) {
  return !a.onboardingCompleto && !a.temConta && !a.membro && !a.visto
}

/**
 * O 13º (pedido do Guilherme em 17/10/2026): categoria própria de receita,
 * calculada pelo salário líquido informado, metade em novembro e metade em
 * dezembro. É aproximado: a 1ª parcela é metade do BRUTO e a 2ª desconta
 * INSS e IR do ano todo, então somadas dão perto de um salário líquido.
 * Entra no plano só nesses dois meses (`planoDaProposta`), nunca repetido.
 */
export const NOME_DECIMO = '13º salário'
const DECIMO_NOVO: Omit<Categoria, 'id'> = {
  nome: NOME_DECIMO, tipo: 'entrada', icone: '🎉', grupo: 'Renda',
  fixa: false, tipoMovimento: 'banco', formaPagamento: 'pix', cor: '#6b7280', ativa: true,
}

/** Metade em novembro, metade em dezembro, só nos meses do plano. */
export function valoresDoDecimo(valor: number, mesInicio: number): number[] {
  return Array.from({ length: 12 }, (_, i) => ((i === 10 || i === 11) && i >= mesInicio ? Math.round(valor * 50) / 100 : 0))
}

export type FormaDaConta = 'automatico' | 'manual' | 'cartao' | 'dinheiro'

export type ItemPrimeiroAcesso = {
  id: string
  /** O nome da categoria padrão (ou a criada) que recebe o valor. */
  categoria: string
  rotulo: string
  icone: string
  /** Tem fim: a tela de parcelas pergunta quantas faltam, sem pedir o valor de novo. */
  financiamento?: boolean
}

/** Contas do mês. "Financiamento do carro" não é categoria padrão: é criada se marcada. */
export const CONTAS_DO_MES: ItemPrimeiroAcesso[] = [
  { id: 'aluguel',   categoria: 'Aluguel / Financiamento', rotulo: 'Aluguel',                          icone: 'ti-home' },
  { id: 'casa',      categoria: 'Aluguel / Financiamento', rotulo: 'Financiamento da casa',            icone: 'ti-building-bank', financiamento: true },
  { id: 'carro',     categoria: 'Financiamento do carro',  rotulo: 'Financiamento do carro',           icone: 'ti-car', financiamento: true },
  { id: 'luz',       categoria: 'Energia Elétrica',        rotulo: 'Luz',                              icone: 'ti-bolt' },
  { id: 'agua',      categoria: 'Água / Saneamento',       rotulo: 'Água',                             icone: 'ti-droplet' },
  { id: 'internet',  categoria: 'Internet / Celular',      rotulo: 'Internet e celular',               icone: 'ti-wifi' },
  { id: 'saude',     categoria: 'Plano de Saúde',          rotulo: 'Plano de saúde',                   icone: 'ti-heart' },
  { id: 'escola',    categoria: 'Educação',                rotulo: 'Escola ou faculdade',              icone: 'ti-school' },
  { id: 'academia',  categoria: 'Academia',                rotulo: 'Academia',                         icone: 'ti-barbell' },
  { id: 'streaming', categoria: 'Streaming / Assinaturas', rotulo: 'Streaming e assinaturas',          icone: 'ti-device-tv' },
]

/** O dia a dia: variáveis, só o valor (um chute). */
export const DIA_A_DIA: ItemPrimeiroAcesso[] = [
  { id: 'mercado',     categoria: 'Mercado / Supermercado', rotulo: 'Mercado',                 icone: 'ti-shopping-cart' },
  { id: 'combustivel', categoria: 'Combustível',            rotulo: 'Combustível',             icone: 'ti-gas-station' },
  { id: 'transporte',  categoria: 'Transporte / Uber',      rotulo: 'Ônibus, Uber, transporte', icone: 'ti-bus' },
  { id: 'farmacia',    categoria: 'Farmácia',               rotulo: 'Farmácia',                icone: 'ti-pill' },
  { id: 'restaurante', categoria: 'Restaurante / Delivery', rotulo: 'Restaurante e delivery',  icone: 'ti-tools-kitchen-2' },
  { id: 'lazer',       categoria: 'Lazer / Entretenimento', rotulo: 'Lazer',                   icone: 'ti-confetti' },
]

const CARRO_NOVO: Omit<Categoria, 'id'> = {
  nome: 'Financiamento do carro', tipo: 'saida', icone: '🚗', grupo: 'Transporte',
  fixa: false, tipoMovimento: 'banco', cor: '#6b7280', ativa: true,
}

/** Onde caem as compras parceladas no cartão: a categoria não foi perguntada. */
export const NOME_PARCELADAS = 'Compras parceladas'
const PARCELADAS_NOVO: Omit<Categoria, 'id'> = {
  nome: NOME_PARCELADAS, tipo: 'saida', icone: '🏷', grupo: 'Outros',
  fixa: false, tipoMovimento: 'cartao', formaPagamento: 'parcelado', cor: '#6b7280', ativa: true,
}

/**
 * O que já estava na fatura quando a pessoa chegou (18/10/2026, análise da
 * chegada: sem isso, no primeiro vencimento o app mostrava uma fatura bem
 * menor que a do banco). Um lançamento só por fatura, nesta categoria.
 */
export const NOME_ANTERIORES = 'Compras antes do Compass One'
const ANTERIORES_NOVO: Omit<Categoria, 'id'> = {
  nome: NOME_ANTERIORES, tipo: 'saida', icone: '💳', grupo: 'Outros',
  fixa: false, tipoMovimento: 'cartao', formaPagamento: 'avista', cor: '#6b7280', ativa: true,
}

type MesFat = { ano: number; mes: number }
const somaMes = (m: MesFat, n: number): MesFat => { const t = m.ano * 12 + m.mes + n; return { ano: Math.floor(t / 12), mes: t % 12 } }

/**
 * As faturas de um cartão no dia de hoje: a ABERTA (onde cai a compra de
 * hoje, `mesDaFaturaDaCompra`) e, se houver, a FECHADA que ainda vai vencer.
 * `ano`/`mes` são o mês da fatura (a chave dela); `vence` é o dia em que
 * vence, e `gasto` o mês em que ela pesa no plano (`mesDoGastoNoCartao`).
 */
export function faturasDeHoje(venc: number, hoje = new Date()): {
  aberta: MesFat & { fecha: number; vence: MesFat; gasto: MesFat }
  aPagar?: MesFat & { vence: MesFat; gasto: MesFat }
} {
  const fecha = fechamentoDoVencimento(venc)
  const cartao = { diaFechamento: fecha, diaVencimento: venc }
  const aberta = mesDaFaturaDaCompra(cartao, hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  // Vence no mês seguinte ao do fechamento quando o dia de vencer é menor.
  const desloc = venc < fecha ? 1 : 0
  const anterior = somaMes(aberta, -1)
  const venceAnterior = somaMes(anterior, desloc)
  const dataVence = new Date(venceAnterior.ano, venceAnterior.mes, venc)
  const hojeZero = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  return {
    aberta: { ...aberta, fecha, vence: somaMes(aberta, desloc), gasto: somaMes(aberta, desloc) },
    ...(dataVence >= hojeZero ? { aPagar: { ...anterior, vence: venceAnterior, gasto: venceAnterior } } : {}),
  }
}

/**
 * Uma parcela em andamento. No CARTÃO, as que faltam são lançadas na fatura
 * (como a FaturaCartao grava uma compra parcelada). Fora dele, vira uma
 * conta fixa até a última parcela (`ate`), que aparece em Lançamentos para
 * confirmar quando o plano nasce: débito automático não se presume pago.
 * `banco` e `cartao` são o NOME escolhido quando há mais de um.
 */
export type ParcelaInformada = {
  nome: string; valor: number; faltam: number; forma?: FormaDaConta
  /** Total de parcelas, se a pessoa souber ("4 de 12"). */
  total?: number
  dia?: number; banco?: string; cartao?: string
}

export type Respostas = {
  banco: string
  saldo: number
  renda: number
  /** Dia em que o salário cai; 0 = não informado. */
  diaRenda: number
  /** Recebe 13º salário. */
  decimo: boolean
  usaCartao: boolean
  cartao: string
  vencimento: number
  /** Outros bancos além do do salário, com o saldo. */
  outrosBancos: { banco: string; saldo: number }[]
  /** Outros cartões além do primeiro. */
  outrosCartoes: { cartao: string; vencimento: number }[]
  contas: Record<string, { valor: number; dia: number; forma: FormaDaConta; faltam?: number; banco?: string }>
  /** Contas do mês fora da lista, pelo nome que a pessoa deu. */
  outrasContas: { nome: string; valor: number; dia: number; forma: FormaDaConta; banco?: string }[]
  diaADia: Record<string, number>
  /** Gastos do dia a dia fora da lista. */
  outrosGastos: { nome: string; valor: number }[]
  parcelas: ParcelaInformada[]
  /**
   * Por nome do cartão: o que já está na fatura aberta (com as parcelas, como
   * o app do banco mostra) e na fechada que ainda não venceu.
   */
  faturas?: Record<string, { aberta: number; aPagar: number }>
  meta: number
  /**
   * De quando são os saldos e as faturas informados (utils/saldoDesde): hoje
   * (o padrão; lança de hoje em diante) ou o dia 1º do mês (lança o que já
   * passou). Vira a data do saldo de cada banco criado aqui; o cartão com
   * fatura informada leva sempre hoje.
   */
  saldoDe?: OrigemDoSaldo
}

/** O que o primeiro plano lê. Guardado no plano do ano, que é jsonb: sem migração. */
export type EstimativasIniciais = {
  /**
   * Por id de categoria. `ate`: último mês ("AAAA-MM") de um financiamento ou
   * parcela. `desde`: primeiro mês, quando não é o de hoje (a parcela no
   * cartão conta no mês em que a fatura vence).
   */
  porCategoria: Record<string, { valor: number; dia?: number; fixa?: boolean; ate?: string; desde?: string }>
  /** O 13º estimado (o salário líquido) e a categoria dele. */
  decimo?: { categoriaId: string; valor: number }
  /** `contaDoMes`: um financiamento já somado nas contas do mês, só com o fim. */
  parcelas?: { nome: string; valor: number; faltam: number; desde: string; contaDoMes?: boolean; forma?: FormaDaConta }[]
  /** Gastos de um mês só (as faturas em aberto): entram no plano só naquele mês. */
  pontuais?: { categoriaId: string; ano: number; mes: number; valor: number }[]
  /** O dia do primeiro acesso ("AAAA-MM-DD"): ver `mesDaChegada`. */
  chegada?: string
  /** `Respostas.saldoDe`: decide o que do mês da chegada entra no plano. */
  saldoDe?: OrigemDoSaldo
}

/** `liberado`: quanto deixa de sair quando a última parcela (ou financiamento) acabar. */
export type Resumo = { renda: number; contas: number; diaADia: number; parcelas: number; sobra: number; mesesDeParcela: number; liberado: number }

/** Os financiamentos marcados nas contas do mês, com quantas parcelas faltam. */
export function financiamentosComFim(r: Respostas) {
  return CONTAS_DO_MES.filter(i => i.financiamento && r.contas[i.id] && r.contas[i.id].valor > 0 && (r.contas[i.id].faltam ?? 0) > 0)
    .map(i => ({ nome: i.rotulo, valor: r.contas[i.id].valor, faltam: r.contas[i.id].faltam!, forma: r.contas[i.id].forma }))
}

export function resumoDasRespostas(r: Respostas): Resumo {
  const contas = Object.values(r.contas).reduce((s, c) => s + c.valor, 0) + r.outrasContas.filter(c => c.nome.trim()).reduce((s, c) => s + c.valor, 0)
  const diaADia = Object.values(r.diaADia).reduce((s, v) => s + v, 0) + r.outrosGastos.filter(c => c.nome.trim()).reduce((s, c) => s + c.valor, 0)
  const parcs = r.parcelas.filter(p => p.valor > 0)
  const parcelas = parcs.reduce((s, p) => s + p.valor, 0)
  const comFim = [...parcs, ...financiamentosComFim(r)]
  const mesesDeParcela = comFim.length ? Math.max(...comFim.map(p => Math.max(1, Math.round(p.faltam) || 1))) : 0
  const liberado = comFim.reduce((s, p) => s + p.valor, 0)
  return { renda: r.renda, contas, diaADia, parcelas, sobra: r.renda - contas - diaADia - parcelas, mesesDeParcela, liberado }
}

/**
 * O que a pessoa contou que já está nas faturas dos cartões (compras de
 * antes de chegar) e os meses em que isso pesa: o mês em que cada fatura
 * vence, a mesma regra que grava os `pontuais`. A tela do resultado mostra
 * à parte, porque não se repete todo mês (análise da chegada v3, C7).
 */
export function faturasInformadas(r: Respostas, hoje = new Date()): { total: number; meses: MesFat[] } {
  if (!r.usaCartao) return { total: 0, meses: [] }
  const cartoes = [{ cartao: r.cartao, vencimento: r.vencimento }, ...r.outrosCartoes].filter(c => c.cartao && c.vencimento)
  let total = 0
  const meses: MesFat[] = []
  const anotar = (m: MesFat, v: number) => {
    if (v <= 0) return
    total += v
    if (!meses.some(x => x.ano === m.ano && x.mes === m.mes)) meses.push(m)
  }
  for (const c of cartoes) {
    const f = r.faturas?.[c.cartao]
    if (!f) continue
    const h = faturasDeHoje(c.vencimento, hoje)
    anotar(h.aberta.gasto, f.aberta)
    if (h.aPagar) anotar(h.aPagar.gasto, f.aPagar)
  }
  meses.sort((a, b) => a.ano * 12 + a.mes - (b.ano * 12 + b.mes))
  return { total: Math.round(total * 100) / 100, meses }
}

/** Fecha uns 7 dias antes de vencer, o comum no Brasil. Ajustável em Configurações. */
export function fechamentoDoVencimento(venc: number) {
  const f = venc - 7
  return f >= 1 ? f : f + 30
}

function gerarId() {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

/**
 * "Como você paga?" nos campos do cadastro (CfgCategorias): Lançamentos e
 * Forma de lançamento. PIX, boleto, débito e transferência são uma resposta
 * só: nenhum número do app muda entre eles.
 */
function formaParaCategoria(forma: FormaDaConta, idBanco: string | undefined):
  { tipoMovimento: TipoMovimento; formaPagamento?: FormaPagamentoCategoria; contaDebitoId?: string } {
  if (forma === 'cartao') return { tipoMovimento: 'cartao', formaPagamento: 'avista', contaDebitoId: undefined }
  if (forma === 'dinheiro') return { tipoMovimento: 'dinheiro', formaPagamento: undefined, contaDebitoId: undefined }
  return { tipoMovimento: 'banco', formaPagamento: forma === 'automatico' ? 'automatico' : 'pix', contaDebitoId: idBanco }
}

/** O mês ("AAAA-MM") da última de `faltam` parcelas, contando a deste mês. */
export function ultimoMes(hoje: Date, faltam: number) {
  const t = hoje.getFullYear() * 12 + hoje.getMonth() + Math.max(1, faltam) - 1
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`
}

/**
 * As respostas viram cadastro. Pura: devolve as listas novas e o plano do
 * ano com a meta e as estimativas; quem chama grava. As parcelas no cartão
 * voltam lançadas em `faturas`.
 */

export function aplicarRespostas({ r, nomeTitular, contas, categorias, planoDoAno, faturaData = {}, hoje = new Date() }: {
  r: Respostas
  nomeTitular: string
  contas: Conta[]
  categorias: Categoria[]
  planoDoAno: PlanoAnoData | undefined
  faturaData?: Record<string, unknown>
  hoje?: Date
}): { contas: Conta[]; categorias: Categoria[]; plano: PlanoAnoData; faturas: Record<string, unknown> } {
  // Contas: o banco do salário é a preferida; o cartão é pago por ele.
  const idBanco = gerarId()
  const novas: Conta[] = []
  const saldoInicialDesde = dataDoSaldo(r.saldoDe ?? 'hoje', hoje)
  if (r.banco) {
    novas.push({
      id: idBanco, nome: nomeTitular.trim() || r.banco, banco: r.banco, tipo: 'corrente',
      saldoInicial: r.saldo, cor: '#1a56db', icone: '🏦', preferida: true, saldoInicialDesde,
    })
  }
  r.outrosBancos.filter(b => b.banco && b.banco !== r.banco).forEach((b, i) => novas.push({
    id: `${gerarId()}-b${i}`, nome: nomeTitular.trim() || b.banco, banco: b.banco, tipo: 'corrente',
    saldoInicial: b.saldo, cor: '#0891b2', icone: '🏦', saldoInicialDesde,
  }))
  const cartoes = r.usaCartao
    ? [{ cartao: r.cartao, vencimento: r.vencimento }, ...r.outrosCartoes].filter(c => c.cartao && c.vencimento)
    : []
  cartoes.forEach((c, i) => novas.push({
    id: `${gerarId()}-c${i}`, nome: c.cartao, banco: c.cartao, tipo: 'cartao', saldoInicial: 0,
    cor: '#7c3aed', icone: '💳', diaVencimento: c.vencimento, diaFechamento: fechamentoDoVencimento(c.vencimento),
    formaPagamentoFatura: 'boleto', contaPagamentoId: r.banco ? idBanco : undefined,
    // A fatura informada é a de HOJE, mesmo no "desde o dia 1º": o app do
    // banco mostra o total de agora. Sem valor informado, não há o que travar.
    ...(((r.faturas?.[c.cartao]?.aberta ?? 0) > 0 || (r.faturas?.[c.cartao]?.aPagar ?? 0) > 0)
      ? { saldoInicialDesde: dataDoSaldo('hoje', hoje) } : {}),
  }))
  const temCartao = cartoes.length > 0
  // Com mais de um banco ou cartão, a pessoa diz qual pelo nome.
  const idDoBanco = (nome?: string) => (nome && novas.find(n => n.tipo !== 'cartao' && n.banco === nome)?.id) || (r.banco ? idBanco : undefined)
  const cartaoPorNome = (nome?: string) => novas.find(n => n.tipo === 'cartao' && n.banco === nome) ?? novas.find(n => n.tipo === 'cartao')
  const contasFinal = [
    ...contas.map(c => (novas.some(n => n.preferida) && c.tipo !== 'cartao' ? { ...c, preferida: false } : c)),
    ...novas,
  ]

  // Categorias: as sugeridas ligadas (como em PrimeirosPassos), e as marcadas
  // garantidas e ativas.
  let cats: Categoria[] = categorias.length > 0 ? [...categorias]
    : CATEGORIAS_PADRAO.map((c, i) => ({ ...c, ativa: true, id: `${gerarId()}-${i}` }))
  const achar = (nome: string, tipo: 'entrada' | 'saida') =>
    cats.find(c => c.nome === nome && c.tipo === tipo && !c.descricao)

  let decimo: EstimativasIniciais['decimo']
  const garantir = (nome: string, tipo: 'entrada' | 'saida'): Categoria => {
    const ja = achar(nome, tipo)
    if (ja) {
      if (!ja.ativa) cats = cats.map(c => (c.id === ja.id ? { ...c, ativa: true } : c))
      return { ...ja, ativa: true }
    }
    const padrao = nome === CARRO_NOVO.nome ? CARRO_NOVO : nome === NOME_DECIMO ? DECIMO_NOVO : nome === NOME_PARCELADAS ? PARCELADAS_NOVO : nome === NOME_ANTERIORES ? ANTERIORES_NOVO : CATEGORIAS_PADRAO.find(c => c.nome === nome && c.tipo === tipo)
    const nova: Categoria = padrao
      ? { ...padrao, ativa: true, id: gerarId() }
      : { nome, tipo, icone: '📌', grupo: 'Outros', fixa: false, tipoMovimento: 'banco', cor: '#6b7280', ativa: true, id: gerarId() }
    cats = [...cats, nova]
    return nova
  }

  const porCategoria: EstimativasIniciais['porCategoria'] = {}

  // Nome digitado pela pessoa: a categoria que já existe com esse nome
  // (sem acento e caixa), ou uma nova pela regra de criar no lançamento.
  // A fatura do cartão escrita como conta ("Cartão de crédito") não vira
  // categoria: os cartões informados já trazem a fatura (ehFaturaDoCartao).
  const nomesCartoes = [...cartoes.map(c => c.cartao), ...contas.filter(c => c.tipo === 'cartao').flatMap(c => [c.nome, c.banco, c.apelido ?? ''])]
  const pelaPessoa = (nome: string): Categoria | null => {
    if (ehFaturaDoCartao(nome, nomesCartoes)) return null
    const existente = buscarCategoria(cats.filter(c => c.tipo === 'saida'), nome)
    if (existente) {
      if (!existente.ativa) cats = cats.map(c => (c.id === existente.id ? { ...c, ativa: true } : c))
      return existente
    }
    const nova = montarCategoria(nome, { tipo: 'saida', isDinheiro: false, contaId: r.banco ? idBanco : undefined, categorias: cats, nomesCartoes })
    if ('erro' in nova) return null
    cats = [...cats, nova]
    return nova
  }
  const somar = (id: string, e: { valor: number; dia?: number; fixa?: boolean; ate?: string; desde?: string }) => {
    const ja = porCategoria[id]
    // Duas parcelas na mesma categoria: a linha vai da que começa primeiro
    // até a que termina por último.
    const ate = ja?.ate && e.ate ? (ja.ate > e.ate ? ja.ate : e.ate) : undefined
    const desde = ja?.desde && e.desde ? (ja.desde < e.desde ? ja.desde : e.desde) : undefined
    porCategoria[id] = ja ? { ...ja, valor: ja.valor + e.valor, ate, ...(desde ? { desde } : {}) } : e
  }

  if (r.renda > 0) {
    const sal = garantir('Salário', 'entrada')
    if (r.banco) cats = cats.map(c => (c.id === sal.id ? { ...c, tipoMovimento: 'banco', formaPagamento: 'pix', contaDebitoId: idBanco } : c))
    if (r.decimo) {
      const dec = garantir(NOME_DECIMO, 'entrada')
      if (r.banco) cats = cats.map(c => (c.id === dec.id ? { ...c, contaDebitoId: idBanco } : c))
      decimo = { categoriaId: dec.id, valor: r.renda }
    }
    porCategoria[sal.id] = { valor: r.renda, dia: r.diaRenda || undefined, fixa: !!r.diaRenda }
  }
  for (const item of CONTAS_DO_MES) {
    const resp = r.contas[item.id]
    if (!resp) continue
    const cat = garantir(item.categoria, 'saida')
    const forma = resp.forma === 'cartao' && !temCartao ? 'manual' : resp.forma
    cats = cats.map(c => (c.id === cat.id ? { ...c, ...formaParaCategoria(forma, idDoBanco(resp.banco)) } : c))
    const ate = item.financiamento && (resp.faltam ?? 0) > 0 ? ultimoMes(hoje, resp.faltam!) : undefined
    if (resp.valor > 0) somar(cat.id, { valor: resp.valor, dia: resp.dia || undefined, fixa: true, ...(ate ? { ate } : {}) })
  }
  for (const o of r.outrasContas) {
    if (!o.nome.trim()) continue
    const cat = pelaPessoa(o.nome)
    if (!cat) continue
    const forma = o.forma === 'cartao' && !temCartao ? 'manual' : o.forma
    cats = cats.map(c => (c.id === cat.id ? { ...c, ...formaParaCategoria(forma, idDoBanco(o.banco)) } : c))
    if (o.valor > 0) somar(cat.id, { valor: o.valor, dia: o.dia || undefined, fixa: true })
  }
  for (const item of DIA_A_DIA) {
    const v = r.diaADia[item.id]
    if (v === undefined) continue
    const cat = garantir(item.categoria, 'saida')
    if (v > 0) somar(cat.id, { valor: v })
  }
  for (const o of r.outrosGastos) {
    if (!o.nome.trim()) continue
    const cat = pelaPessoa(o.nome)
    if (cat && o.valor > 0) somar(cat.id, { valor: o.valor })
  }

  // Parcelas: no cartão, lançadas na fatura; fora dele, conta fixa até a última.
  let faturas = faturaData
  r.parcelas.filter(p => p.valor > 0).forEach((p, i) => {
    const faltam = Math.max(1, Math.round(p.faltam) || 1)
    const cartao = p.forma === 'cartao' && temCartao ? cartaoPorNome(p.cartao) : undefined
    if (cartao) {
      const n = p.total && p.total >= faltam ? p.total : faltam
      const primeira = n - faltam + 1
      const inicio = mesDaFaturaDaCompra(cartao, hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
      // No plano a parcela conta no mês em que a fatura VENCE (a regra do
      // realizado): a última é esse mês + faltam − 1, não hoje + faltam − 1.
      const gasto = mesDoGastoNoCartao(cartao, hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
      const parc = garantir(NOME_PARCELADAS, 'saida')
      somar(parc.id, { valor: p.valor, ate: ultimoMes(new Date(gasto.ano, gasto.mes, 1), faltam),
        desde: `${gasto.ano}-${String(gasto.mes + 1).padStart(2, '0')}` })
      // A compra foi no mês da fatura da parcela 1.
      const tc = inicio.ano * 12 + inicio.mes - (primeira - 1)
      const baseId = `pa-${Date.now()}-${i}`
      const out = { ...faturas }
      for (let k = 0; k < faltam; k++) {
        const t = inicio.ano * 12 + inicio.mes + k
        const chave = `${cartao.id}-${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`
        const dm = (out[chave] as { lancamentos: Record<number, unknown[]>; faturaAtual?: string } | undefined) ?? { lancamentos: {}, faturaAtual: '' }
        out[chave] = {
          ...dm,
          lancamentos: {
            ...dm.lancamentos,
            1: [...(dm.lancamentos[1] ?? []), {
              id: `${baseId}-${primeira + k}`, tipo: tipoNaFatura('saida'),
              descricao: p.nome, categoria: NOME_PARCELADAS, valor: p.valor,
              formaPagamento: 'credito', tipoLanc: 'variavel', consolidado: k === 0,
              ...(n > 1 ? { parcelas: n, parcelaAtual: primeira + k } : {}),
              diaCompra: 1, mesCompra: tc % 12, anoCompra: Math.floor(tc / 12),
            }],
          },
        }
      }
      faturas = out
    } else {
      const cat = pelaPessoa(p.nome)
      if (!cat) return
      const forma = p.forma === 'cartao' ? 'manual' : p.forma ?? 'manual'
      cats = cats.map(c => (c.id === cat.id ? { ...c, ...formaParaCategoria(forma, idDoBanco(p.banco)), recorrencia: 'temporaria' } : c))
      somar(cat.id, { valor: p.valor, dia: p.dia || undefined, fixa: true, ate: ultimoMes(hoje, faltam) })
    }
  })

  // O que já estava nas faturas: um lançamento por fatura. Na aberta, o
  // valor informado inclui as parcelas que acabaram de ser lançadas nela.
  const pontuais: NonNullable<EstimativasIniciais['pontuais']> = []
  for (const cartao of novas.filter(n => n.tipo === 'cartao')) {
    const f = r.faturas?.[cartao.banco ?? cartao.nome]
    if (!f || !cartao.diaVencimento) continue
    const hojeF = faturasDeHoje(cartao.diaVencimento, hoje)
    const lancar = (m: MesFat & { gasto: MesFat }, informado: number, descontarParcelas: boolean, sufixo: string) => {
      const chave = `${cartao.id}-${m.ano}-${String(m.mes + 1).padStart(2, '0')}`
      const dm = (faturas[chave] as { lancamentos: Record<number, { tipo: string; valor: number }[]>; faturaAtual?: string } | undefined)
        ?? { lancamentos: {}, faturaAtual: '' }
      const jaLancado = descontarParcelas
        ? Object.values(dm.lancamentos).flat().reduce((s, l) => s + (l.tipo === 'entrada' ? l.valor : -l.valor), 0) : 0
      const valor = Math.round((informado - jaLancado) * 100) / 100
      if (valor <= 0) return
      const cat = garantir(NOME_ANTERIORES, 'saida')
      faturas = {
        ...faturas,
        [chave]: {
          ...dm,
          lancamentos: {
            ...dm.lancamentos,
            1: [...(dm.lancamentos[1] ?? []), {
              id: `pa-ant-${Date.now()}-${cartao.id}-${sufixo}`, tipo: tipoNaFatura('saida'),
              descricao: NOME_ANTERIORES, categoria: NOME_ANTERIORES, valor,
              formaPagamento: 'credito', tipoLanc: 'variavel', consolidado: true,
              diaCompra: 1, mesCompra: m.mes, anoCompra: m.ano,
            }],
          },
        },
      }
      pontuais.push({ categoriaId: cat.id, ano: m.gasto.ano, mes: m.gasto.mes, valor })
    }
    if (f.aberta > 0) lancar(hojeF.aberta, f.aberta, true, 'a')
    if (f.aPagar > 0 && hojeF.aPagar) lancar(hojeF.aPagar, f.aPagar, false, 'f')
  }

  const ano = hoje.getFullYear()
  const mes = hoje.getMonth()
  const desde = `${ano}-${String(mes + 1).padStart(2, '0')}`
  const parcelas = [
    ...financiamentosComFim(r).map(f => ({ ...f, desde, contaDoMes: true })),
    ...r.parcelas.filter(p => p.valor > 0).map(p => ({ ...p, desde })),
  ]

  const base: PlanoAnoData = planoDoAno ?? { saldoInicialJan: 0, entradas: [], saidas: [] }
  const objetivos = Array.from({ length: 12 }, (_, i) => (r.meta > 0 && i >= mes ? r.meta : base.objetivos?.[i] ?? 0))
  const plano: PlanoAnoData = {
    ...base,
    objetivos,
    estimativas: { porCategoria, chegada: `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`, ...(decimo ? { decimo } : {}), ...(parcelas.length ? { parcelas } : {}), ...(pontuais.length ? { pontuais } : {}), ...(r.saldoDe === 'dia1' ? { saldoDe: 'dia1' as const } : {}) },
  }

  return { contas: contasFinal, categorias: cats, plano, faturas }
}

/** As estimativas do primeiro acesso, em qualquer ano do plano (o mês pode ter virado o ano). */
export function estimativasDosPlanos(planos: Record<number, PlanoAnoData | undefined>): EstimativasIniciais | undefined {
  const anos = Object.keys(planos).map(Number).sort((a, b) => b - a)
  for (const a of anos) {
    const e = planos[a]?.estimativas
    if (e) return e
  }
  return undefined
}

/**
 * Ao criar o primeiro plano, as contas do mês informadas viram FIXAS com o
 * dia de vencimento. Daí em diante aparecem em "Contas da semana" e em
 * Lançamentos para marcar como pagas.
 */
export function fixasDoPrimeiroAcesso(categorias: Categoria[], est: EstimativasIniciais | undefined): Categoria[] {
  if (!est) return categorias
  return categorias.map(c => {
    const e = est.porCategoria[c.id]
    if (!e?.fixa || !e.dia || c.fixa) return c
    return { ...c, fixa: true, diaVencimento: e.dia ?? c.diaVencimento }
  })
}
