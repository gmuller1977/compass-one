import type { Categoria, Conta, PlanoAnoData, TipoMovimento, FormaPagamentoCategoria } from '../context/AppContext'
import { CATEGORIAS_PADRAO } from '../data/categoriasPadrao'
import { montarCategoria } from './novaCategoria'
import { buscarCategoria } from './categoriaIcone'

/**
 * O primeiro acesso de uma conta nova: cinco perguntas e um resultado.
 * Pedido do Guilherme em 17/10/2026, sobre protótipo aprovado ("melhorou
 * bastante, pode publicar"): quem chegava caía em Configurações, num
 * formulário, e a primeira impressão era de trabalho, não de ajuda.
 *
 * O que as respostas viram, e quando:
 *
 * - **Na hora:** a conta do banco (com o saldo), o cartão, as categorias
 *   sugeridas ligadas, a forma de pagar de cada conta do mês, e a meta de
 *   economia nos meses que faltam do ano (`objetivos`).
 * - **No primeiro plano** (Modo Descoberta, quando o mês fechar): os valores
 *   e os dias informados ficam guardados em `estimativas`, no plano do ano.
 *   A proposta usa o realizado do mês; onde a categoria não teve lançamento,
 *   usa a estimativa. Ao criar o plano, as contas do mês viram FIXAS, com o
 *   dia de vencimento.
 *
 * Por que as contas não viram fixas logo: fixa sem valor no plano não aparece
 * para pagar em Lançamentos nem no Lançar (`semPlanoEIntocada`, e o Lançar
 * só mostra variáveis). Sem plano no primeiro mês, a pessoa não teria onde
 * lançar o aluguel. E valor no plano encerraria o Modo Descoberta
 * (`fimDoPlanejamento` olha só valores acima de zero).
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

export type FormaDaConta = 'automatico' | 'manual' | 'cartao' | 'dinheiro'

export type ItemPrimeiroAcesso = {
  id: string
  /** O nome da categoria padrão (ou a criada) que recebe o valor. */
  categoria: string
  rotulo: string
  icone: string
}

/** Contas do mês. "Financiamento do carro" não é categoria padrão: é criada se marcada. */
export const CONTAS_DO_MES: ItemPrimeiroAcesso[] = [
  { id: 'casa',      categoria: 'Aluguel / Financiamento', rotulo: 'Aluguel ou financiamento da casa', icone: 'ti-home' },
  { id: 'carro',     categoria: 'Financiamento do carro',  rotulo: 'Financiamento do carro',           icone: 'ti-car' },
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

export type Respostas = {
  banco: string
  saldo: number
  renda: number
  /** Dia em que o salário cai; 0 = não informado. */
  diaRenda: number
  usaCartao: boolean
  cartao: string
  vencimento: number
  /** Outros bancos além do do salário, com o saldo. */
  outrosBancos: { banco: string; saldo: number }[]
  /** Outros cartões além do primeiro. */
  outrosCartoes: { cartao: string; vencimento: number }[]
  contas: Record<string, { valor: number; dia: number; forma: FormaDaConta }>
  /** Contas do mês fora da lista, pelo nome que a pessoa deu. */
  outrasContas: { nome: string; valor: number; dia: number; forma: FormaDaConta }[]
  diaADia: Record<string, number>
  /** Gastos do dia a dia fora da lista. */
  outrosGastos: { nome: string; valor: number }[]
  parcelas: { nome: string; valor: number; faltam: number }[]
  meta: number
}

/** O que o primeiro plano lê. Guardado no plano do ano, que é jsonb: sem migração. */
export type EstimativasIniciais = {
  /** Por id de categoria. */
  porCategoria: Record<string, { valor: number; dia?: number; fixa?: boolean }>
  parcelas?: { nome: string; valor: number; faltam: number; desde: string }[]
}

export type Resumo = { renda: number; contas: number; diaADia: number; parcelas: number; sobra: number; mesesDeParcela: number }

export function resumoDasRespostas(r: Respostas): Resumo {
  const contas = Object.values(r.contas).reduce((s, c) => s + c.valor, 0) + r.outrasContas.filter(c => c.nome.trim()).reduce((s, c) => s + c.valor, 0)
  const diaADia = Object.values(r.diaADia).reduce((s, v) => s + v, 0) + r.outrosGastos.filter(c => c.nome.trim()).reduce((s, c) => s + c.valor, 0)
  const parcs = r.parcelas.filter(p => p.valor > 0)
  const parcelas = parcs.reduce((s, p) => s + p.valor, 0)
  const mesesDeParcela = parcs.length ? Math.max(...parcs.map(p => Math.max(1, Math.round(p.faltam) || 1))) : 0
  return { renda: r.renda, contas, diaADia, parcelas, sobra: r.renda - contas - diaADia - parcelas, mesesDeParcela }
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

/**
 * As respostas viram cadastro. Pura: devolve as listas novas e o plano do
 * ano com a meta e as estimativas; quem chama grava.
 */
export function aplicarRespostas({ r, nomeTitular, contas, categorias, planoDoAno, hoje = new Date() }: {
  r: Respostas
  nomeTitular: string
  contas: Conta[]
  categorias: Categoria[]
  planoDoAno: PlanoAnoData | undefined
  hoje?: Date
}): { contas: Conta[]; categorias: Categoria[]; plano: PlanoAnoData } {
  // Contas: o banco do salário é a preferida; o cartão é pago por ele.
  const idBanco = gerarId()
  const novas: Conta[] = []
  if (r.banco) {
    novas.push({
      id: idBanco, nome: nomeTitular.trim() || r.banco, banco: r.banco, tipo: 'corrente',
      saldoInicial: r.saldo, cor: '#1a56db', icone: '🏦', preferida: true,
    })
  }
  r.outrosBancos.filter(b => b.banco && b.banco !== r.banco).forEach((b, i) => novas.push({
    id: `${gerarId()}-b${i}`, nome: nomeTitular.trim() || b.banco, banco: b.banco, tipo: 'corrente',
    saldoInicial: b.saldo, cor: '#0891b2', icone: '🏦',
  }))
  const cartoes = r.usaCartao
    ? [{ cartao: r.cartao, vencimento: r.vencimento }, ...r.outrosCartoes].filter(c => c.cartao && c.vencimento)
    : []
  cartoes.forEach((c, i) => novas.push({
    id: `${gerarId()}-c${i}`, nome: c.cartao, banco: c.cartao, tipo: 'cartao', saldoInicial: 0,
    cor: '#7c3aed', icone: '💳', diaVencimento: c.vencimento, diaFechamento: fechamentoDoVencimento(c.vencimento),
    formaPagamentoFatura: 'boleto', contaPagamentoId: r.banco ? idBanco : undefined,
  }))
  const temCartao = cartoes.length > 0
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

  const garantir = (nome: string, tipo: 'entrada' | 'saida'): Categoria => {
    const ja = achar(nome, tipo)
    if (ja) {
      if (!ja.ativa) cats = cats.map(c => (c.id === ja.id ? { ...c, ativa: true } : c))
      return { ...ja, ativa: true }
    }
    const padrao = nome === CARRO_NOVO.nome ? CARRO_NOVO : CATEGORIAS_PADRAO.find(c => c.nome === nome && c.tipo === tipo)
    const nova: Categoria = padrao
      ? { ...padrao, ativa: true, id: gerarId() }
      : { nome, tipo, icone: '📌', grupo: 'Outros', fixa: false, tipoMovimento: 'banco', cor: '#6b7280', ativa: true, id: gerarId() }
    cats = [...cats, nova]
    return nova
  }

  const porCategoria: EstimativasIniciais['porCategoria'] = {}

  // Nome digitado pela pessoa: a categoria que já existe com esse nome
  // (sem acento e caixa), ou uma nova pela regra de criar no lançamento.
  const pelaPessoa = (nome: string): Categoria | null => {
    const existente = buscarCategoria(cats.filter(c => c.tipo === 'saida'), nome)
    if (existente) {
      if (!existente.ativa) cats = cats.map(c => (c.id === existente.id ? { ...c, ativa: true } : c))
      return existente
    }
    const nova = montarCategoria(nome, { tipo: 'saida', isDinheiro: false, contaId: r.banco ? idBanco : undefined, categorias: cats })
    if ('erro' in nova) return null
    cats = [...cats, nova]
    return nova
  }
  const somar = (id: string, e: { valor: number; dia?: number; fixa?: boolean }) => {
    const ja = porCategoria[id]
    porCategoria[id] = ja ? { ...ja, valor: ja.valor + e.valor } : e
  }

  if (r.renda > 0) {
    const sal = garantir('Salário', 'entrada')
    if (r.banco) cats = cats.map(c => (c.id === sal.id ? { ...c, tipoMovimento: 'banco', formaPagamento: 'pix', contaDebitoId: idBanco } : c))
    porCategoria[sal.id] = { valor: r.renda, dia: r.diaRenda || undefined, fixa: !!r.diaRenda }
  }
  for (const item of CONTAS_DO_MES) {
    const resp = r.contas[item.id]
    if (!resp) continue
    const cat = garantir(item.categoria, 'saida')
    const forma = resp.forma === 'cartao' && !temCartao ? 'manual' : resp.forma
    cats = cats.map(c => (c.id === cat.id ? { ...c, ...formaParaCategoria(forma, r.banco ? idBanco : undefined) } : c))
    if (resp.valor > 0) somar(cat.id, { valor: resp.valor, dia: resp.dia || undefined, fixa: true })
  }
  for (const o of r.outrasContas) {
    if (!o.nome.trim()) continue
    const cat = pelaPessoa(o.nome)
    if (!cat) continue
    const forma = o.forma === 'cartao' && !temCartao ? 'manual' : o.forma
    cats = cats.map(c => (c.id === cat.id ? { ...c, ...formaParaCategoria(forma, r.banco ? idBanco : undefined) } : c))
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

  const ano = hoje.getFullYear()
  const mes = hoje.getMonth()
  const desde = `${ano}-${String(mes + 1).padStart(2, '0')}`
  const parcelas = r.parcelas.filter(p => p.valor > 0).map(p => ({ ...p, desde }))

  const base: PlanoAnoData = planoDoAno ?? { saldoInicialJan: 0, entradas: [], saidas: [] }
  const objetivos = Array.from({ length: 12 }, (_, i) => (r.meta > 0 && i >= mes ? r.meta : base.objetivos?.[i] ?? 0))
  const plano: PlanoAnoData = {
    ...base,
    objetivos,
    estimativas: { porCategoria, ...(parcelas.length ? { parcelas } : {}) },
  }

  return { contas: contasFinal, categorias: cats, plano }
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
