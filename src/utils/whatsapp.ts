import type { Conta, Categoria } from '../context/AppContext'
import { interpretarLancamento } from './interpretarLancamento'
import { lancarNaFatura, lancarNoExtrato, comFechamentoDoMes, dividirParcelas } from './lancamentoRapido'
import { lancamentoAntesDoSaldo } from './saldoDesde'
import { carimbarAutor } from './autorDoLancamento'
import { nomeDaConta } from './nomeDaConta'

/**
 * Lançar pelo WhatsApp (23/11/2026, pedido do Guilherme: n8n e a API
 * oficial da Meta, escolhida no mesmo dia no lugar da Z-API; a Z-API
 * continua sendo lida).
 *
 * O caminho: a mensagem chega na Meta, o n8n repassa para a função
 * `whatsapp` do Supabase, e ela responde o texto que o n8n devolve à pessoa.
 * Tudo o que DECIDE mora aqui, sem banco e sem rede, para a prova testar e a
 * função só ler e gravar:
 *
 *  - o número só lança depois de ligado a um login por um código que a
 *    pessoa manda DO PRÓPRIO WhatsApp ("COMPASS 482913"), gerado no Perfil;
 *  - a frase é lida pelo mesmo `interpretarLancamento` do app (sem IA, nada
 *    de texto mandado para fora) e vira uma PROPOSTA; só o "SIM" grava,
 *    como o "Confirmar" do Lançar;
 *  - a gravação é a mesma do Lançar do celular: `lancarNoExtrato` e
 *    `lancarNaFatura` (valor digitado = TOTAL, `dividirParcelas`), com o
 *    fechamento do mês e a trava da data do saldo.
 */

export type ContaWa = Pick<Conta, 'id' | 'nome' | 'banco' | 'tipo' | 'apelido' | 'preferida' | 'diaFechamento' | 'saldoInicialDesde'>
  & Partial<Pick<Conta, 'saldoInicial' | 'cor' | 'icone'>>
export type CategoriaWa = Pick<Categoria, 'id' | 'nome' | 'tipo' | 'ativa' | 'tipoMovimento' | 'formaPagamento' | 'contaDebitoId' | 'descricao' | 'pinQuick'>

export type AcaoLancar = {
  tipo: 'lancar'
  destino: 'extrato' | 'fatura'
  /** 'dinheiro' é a carteira. */
  contaId: string
  ano: number; mes: number; dia: number
  tipoCategoria: 'saida' | 'entrada'
  categoria: string; subCategoria?: string; descricao: string
  /** O valor digitado: o TOTAL da compra, como no Lançar do celular. */
  total: number
  parcelas: number
  formaPagamento: 'debito' | 'pix' | 'transferencia' | 'dinheiro' | 'credito'
  /** Fechamento do cadastro; o do mês (`fechamentoOverride`) é lido ao gravar. */
  diaFechamento?: number
}

export type Hoje = { ano: number; mes: number; dia: number }

/** O dia em São Paulo (o servidor roda em UTC). mes de 0 a 11. */
export function hojeEmSaoPaulo(agora: Date = new Date()): Hoje {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(agora).split('-').map(Number)
  return { ano: p[0], mes: p[1] - 1, dia: p[2] }
}

/** Só os dígitos. Grupo ("...-group") ou vazio não é número de pessoa. */
export function normalizarTelefone(bruto: unknown): string | null {
  if (typeof bruto !== 'string' || /group|broadcast|newsletter/i.test(bruto)) return null
  const d = bruto.replace(/\D/g, '')
  return d.length >= 10 && d.length <= 15 ? d : null
}

/** A mensagem recebida, venha da API oficial da Meta ou da Z-API.
 *  `ignorar`: não é mensagem de uma pessoa (status de entrega, grupo, a
 *  própria conta) e não se responde nada. */
export type EntradaWa = {
  telefone: string | null
  messageId: string | null
  texto: string
  midia: boolean
  ignorar: boolean
}

const MIDIAS = ['audio', 'image', 'video', 'document', 'sticker']
const obj = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null

export function lerEntrada(bruto: unknown): EntradaWa {
  const vazio: EntradaWa = { telefone: null, messageId: null, texto: '', midia: false, ignorar: true }
  let p = obj(bruto)
  if (!p) return vazio
  // n8n às vezes embrulha o webhook em { body: ... }
  const corpo = obj(p.body)
  if (corpo && (corpo.entry || corpo.phone)) p = corpo

  // API oficial (WhatsApp Cloud API): entry[].changes[].value.messages[]
  if (Array.isArray(p.entry)) {
    const entrada = obj((p.entry as unknown[])[0])
    const mudanca = obj(Array.isArray(entrada?.changes) ? (entrada!.changes as unknown[])[0] : null)
    const value = obj(mudanca?.value)
    const m = obj(Array.isArray(value?.messages) ? (value!.messages as unknown[])[0] : null)
    if (!m) return vazio // statuses (entregue, lida) e afins
    const tipo = typeof m.type === 'string' ? m.type : ''
    const texto = tipo === 'text' && typeof obj(m.text)?.body === 'string' ? obj(m.text)!.body as string
      : tipo === 'button' && typeof obj(m.button)?.text === 'string' ? obj(m.button)!.text as string
      : ''
    const telefone = normalizarTelefone(m.from)
    return { telefone, messageId: typeof m.id === 'string' ? m.id : null, texto, midia: MIDIAS.includes(tipo), ignorar: !telefone }
  }

  // Z-API ("Ao receber")
  const telefone = normalizarTelefone(p.phone)
  if (typeof p.type === 'string' && p.type !== 'ReceivedCallback') return { ...vazio, telefone }
  if (!telefone || p.fromMe === true || p.isGroup === true || p.isNewsletter === true) return { ...vazio, telefone }
  const texto = typeof obj(p.text)?.message === 'string' ? obj(p.text)!.message as string : ''
  return {
    telefone, messageId: typeof p.messageId === 'string' ? p.messageId : null,
    texto, midia: MIDIAS.some(k => p![k]), ignorar: false,
  }
}

/** "+55 47 9****-1323": o bastante para reconhecer, sem expor o número na tela. */
export function telefoneMascarado(t: string): string {
  const d = t.replace(/\D/g, '')
  if (d.length < 10) return t
  const br = d.startsWith('55') && d.length >= 12
  const resto = br ? d.slice(2) : d
  return `${br ? '+55 ' : ''}${resto.slice(0, 2)} ${resto.slice(2, 3)}****-${resto.slice(-4)}`
}

/** O texto que o Perfil põe no link do WhatsApp. */
export const textoDoCodigo = (codigo: string) => `Quero ligar meu Compass One: COMPASS ${codigo}`

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export type Comando =
  | { tipo: 'codigo'; codigo: string }
  | { tipo: 'sim' } | { tipo: 'nao' } | { tipo: 'sair' } | { tipo: 'ajuda' }
  | { tipo: 'texto' }

export function classificar(texto: string): Comando {
  const t = semAcento(texto).replace(/[.!?,;]+$/g, '').trim()
  const cod = t.match(/compass\s*(?:one\s*)?:?\s*(\d{6})(?!\d)/)
  if (cod) return { tipo: 'codigo', codigo: cod[1] }
  if (/^(sim|s|ok|confirmar|confirmo|isso|pode lancar|pode)$/.test(t)) return { tipo: 'sim' }
  if (/^(nao|n|cancelar|cancela|errado)$/.test(t)) return { tipo: 'nao' }
  if (/^(sair|parar|desligar|stop)$/.test(t)) return { tipo: 'sair' }
  if (/^(oi|ola|ajuda|menu|help|bom dia|boa tarde|boa noite|como funciona)$/.test(t)) return { tipo: 'ajuda' }
  return { tipo: 'texto' }
}

export const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const TEXTO_AJUDA =
  'Para lançar, mande o valor e a categoria, do jeito que estão no app:\n' +
  '• 47 mercado\n• 32,90 farmácia ontem\n• 350 em 3x loja no nubank\n\n' +
  'Eu mostro o que entendi e só lanço depois do seu *SIM*.\n' +
  'Para desligar o WhatsApp do Compass One, mande *SAIR*.'

export const TEXTO_SEM_VINCULO =
  'Olá! Este WhatsApp ainda não está ligado a uma conta do Compass One.\n' +
  'Para ligar, abra o app em Configurações > Perfil > Lançar pelo WhatsApp e toque em "Ligar meu WhatsApp".'

export const TEXTO_SO_TEXTO = 'Por enquanto eu entendo só mensagens de texto. Exemplo: 47 mercado'

export const TEXTO_CODIGO_INVALIDO =
  'Esse código não vale mais. Gere um novo no app, em Configurações > Perfil > Lançar pelo WhatsApp.'

export const textoLigado = (nome?: string) =>
  `Pronto${nome ? `, ${nome}` : ''}! Este WhatsApp está ligado ao seu Compass One.\n\n${TEXTO_AJUDA}`

export const TEXTO_DESLIGADO =
  'Pronto, este WhatsApp foi desligado do Compass One. Para ligar de novo, use o app em Configurações > Perfil > Lançar pelo WhatsApp.'

export const TEXTO_NADA_PENDENTE = 'Não há nenhum lançamento esperando confirmação. Para lançar, mande por exemplo: 47 mercado'
export const TEXTO_CANCELADO = 'Cancelado. Nada foi lançado.'

const nomeCat = (c: Pick<CategoriaWa, 'nome' | 'descricao'>) => (c.descricao ? `${c.nome} · ${c.descricao}` : c.nome)

function quandoTexto(a: AcaoLancar, hoje: Hoje): string {
  if (a.ano === hoje.ano && a.mes === hoje.mes && a.dia === hoje.dia) return 'hoje'
  const ontem = new Date(hoje.ano, hoje.mes, hoje.dia - 1)
  if (a.ano === ontem.getFullYear() && a.mes === ontem.getMonth() && a.dia === ontem.getDate()) return 'ontem'
  return `em ${String(a.dia).padStart(2, '0')}/${String(a.mes + 1).padStart(2, '0')}`
}

/**
 * O `interpretarLancamento` devolve o resto da frase sem acento e sem as
 * palavras de ligação ("pao leite"). A descrição gravada usa as palavras como
 * a pessoa escreveu ("pão e leite"): fica cada palavra que sobrou, e a de
 * ligação só entre duas que ficaram. "dinheiro"/"espécie" disseram onde, não o quê.
 */
function descricaoOriginal(texto: string, resto: string): string {
  const sobra = resto.split(' ').filter(Boolean).filter(w => w !== 'dinheiro' && w !== 'especie')
  const tokens = texto.replace(/[!?;]/g, ' ').split(/\s+/).filter(Boolean)
  const fica = tokens.map(tok => {
    const i = sobra.indexOf(semAcento(tok))
    if (i < 0) return false
    sobra.splice(i, 1)
    return true
  })
  const LIGA = new Set(['e', 'de', 'do', 'da', 'dos', 'das', 'com', 'pra', 'para'])
  return tokens.filter((tok, i) => fica[i]
    || (LIGA.has(semAcento(tok)) && fica[i - 1] && fica[i + 1])).join(' ')
}

export type Leitura =
  | { ok: true; acao: AcaoLancar; resposta: string }
  | { ok: false; resposta: string }

/**
 * A frase vira uma proposta de lançamento, ou a explicação do que faltou.
 * Nunca chuta: sem valor, sem categoria ou sem um cartão claro, pergunta.
 */
export function lerLancamento(
  texto: string,
  dados: { categorias: CategoriaWa[]; contas: ContaWa[]; hoje: Hoje },
): Leitura {
  const { categorias, hoje } = dados
  const contas = dados.contas
  const r = interpretarLancamento(texto, categorias as Categoria[], contas as Conta[])
  const emDinheiro = /(^|\s)(dinheiro|especie)(\s|$)/.test(semAcento(texto))

  if (r.valor == null) return { ok: false, resposta: 'Não encontrei o valor. Mande o valor e a categoria, por exemplo: 47 mercado' }
  const cat = categorias.find(c => c.id === r.categoriaId)
  if (!cat) {
    const ativas = categorias.filter(c => c.ativa)
    const exemplos = [...ativas.filter(c => c.pinQuick), ...ativas.filter(c => !c.pinQuick)]
      .slice(0, 6).map(nomeCat).join(', ')
    return {
      ok: false,
      resposta: 'Não encontrei a categoria. Escreva o nome como está no app, por exemplo: 47 mercado.' +
        (exemplos ? `\nAlgumas das suas: ${exemplos}.` : ''),
    }
  }

  const data = new Date(hoje.ano, hoje.mes, hoje.dia - r.diasAtras)
  const [ano, mes, dia] = [data.getFullYear(), data.getMonth(), data.getDate()]
  const parcelas = r.parcelas ?? 1
  const cartoes = contas.filter(c => c.tipo === 'cartao')
  const bancos = contas.filter(c => c.tipo === 'corrente')
  const listaCartoes = () => cartoes.map(c => nomeDaConta(c as Conta, contas as Conta[])).join(', ')

  let conta: ContaWa | 'dinheiro' | undefined
  const dita = contas.find(c => c.id === r.contaId)
  if (dita) {
    if (dita.tipo === 'poupanca')
      return { ok: false, resposta: `${nomeDaConta(dita as Conta, contas as Conta[])} é um investimento. Aplicação e resgate se lançam no app, em Investimentos.` }
    conta = dita
  } else if (emDinheiro) conta = 'dinheiro'
  else if (parcelas > 1 || cat.tipoMovimento === 'cartao') {
    if (cartoes.length === 1) conta = cartoes[0]
    else if (cartoes.length === 0) {
      if (parcelas > 1) return { ok: false, resposta: 'Compra parcelada entra num cartão, e não há cartão cadastrado no app.' }
    } else return { ok: false, resposta: `Em qual cartão? Mande de novo com o nome dele, por exemplo: ${r.valor.toLocaleString('pt-BR')} ${cat.nome.toLowerCase()} ${nomeDaConta(cartoes[0] as Conta, contas as Conta[]).toLowerCase()}.\nSeus cartões: ${listaCartoes()}.` }
  } else if (cat.tipoMovimento === 'dinheiro') conta = 'dinheiro'
  if (!conta) {
    conta = bancos.find(b => b.id === cat.contaDebitoId) ?? bancos.find(b => b.preferida) ?? bancos[0]
    if (!conta) return { ok: false, resposta: 'Não há conta de banco cadastrada no app para este lançamento.' }
  }

  const ehCartao = conta !== 'dinheiro' && conta.tipo === 'cartao'
  if (ehCartao && cat.tipo === 'entrada') return { ok: false, resposta: 'Recebimento não entra no cartão. Mande de novo sem o nome do cartão, ou com o nome do banco.' }
  if (!ehCartao && parcelas > 1) return { ok: false, resposta: `Parcelado só no cartão. Mande de novo com o nome do cartão${cartoes.length ? ` (${listaCartoes()})` : ''}.` }

  if (conta !== 'dinheiro') {
    const trava = lancamentoAntesDoSaldo(conta as Conta, ano, mes, dia)
    if (trava) return { ok: false, resposta: trava }
  }

  const descricao = descricaoOriginal(texto, r.descricao) || cat.nome
  const formaPagamento: AcaoLancar['formaPagamento'] = ehCartao ? 'credito'
    : conta === 'dinheiro' ? 'dinheiro'
    : cat.formaPagamento === 'pix' || cat.formaPagamento === 'transferencia' ? cat.formaPagamento : 'debito'

  const acao: AcaoLancar = {
    tipo: 'lancar', destino: ehCartao ? 'fatura' : 'extrato',
    contaId: conta === 'dinheiro' ? 'dinheiro' : conta.id,
    ano, mes, dia, tipoCategoria: cat.tipo,
    categoria: cat.nome, ...(cat.descricao ? { subCategoria: cat.descricao } : {}),
    descricao, total: r.valor, parcelas, formaPagamento,
    ...(ehCartao && (conta as ContaWa).diaFechamento != null ? { diaFechamento: (conta as ContaWa).diaFechamento } : {}),
  }
  return { ok: true, acao, resposta: textoDaProposta(acao, contas, hoje) }
}

export function textoDaProposta(a: AcaoLancar, contas: ContaWa[], hoje: Hoje): string {
  const conta = contas.find(c => c.id === a.contaId)
  const onde = a.contaId === 'dinheiro' ? 'em dinheiro'
    : conta ? `${a.destino === 'fatura' ? 'no cartão' : 'no'} ${nomeDaConta(conta as Conta, contas as Conta[])}` : ''
  let valor = `*${brl(a.total)}*`
  if (a.parcelas > 1) {
    const v = dividirParcelas(a.total, a.parcelas)
    valor += v[0] === v[1]
      ? ` em ${a.parcelas}x de ${brl(v[1])}`
      : ` em ${a.parcelas}x (1ª de ${brl(v[0])} e ${a.parcelas - 1}x de ${brl(v[1])})`
  }
  const verbo = a.tipoCategoria === 'entrada' ? 'Lançar o recebimento de' : 'Lançar'
  const desc = a.descricao !== a.categoria ? ` (${a.descricao})` : ''
  return `${verbo} ${valor} em *${a.subCategoria ? `${a.categoria} · ${a.subCategoria}` : a.categoria}*${desc} ${onde}, ${quandoTexto(a, hoje)}?\n` +
    'Responda *SIM* para lançar ou *NÃO* para cancelar.'
}

export type RefMes = { contaId: string; ano: number; mes: number }

/** A chave do mês no formato do app (`<conta>-AAAA-MM`, mes 0 a 11). */
export const chaveDoMes = (contaId: string, ano: number, mes: number) => `${contaId}-${ano}-${String(mes + 1).padStart(2, '0')}`

/**
 * Os meses que a gravação pode tocar: o do extrato, ou, na fatura, do mês da
 * compra (onde mora o fechamento do mês) até o da última parcela.
 */
export function mesesDaAcao(a: AcaoLancar): RefMes[] {
  if (a.destino === 'extrato') return [{ contaId: a.contaId, ano: a.ano, mes: a.mes }]
  const out: RefMes[] = []
  for (let i = 0; i <= a.parcelas; i++) {
    const d = new Date(a.ano, a.mes + i, 1)
    out.push({ contaId: a.contaId, ano: d.getFullYear(), mes: d.getMonth() })
  }
  return out
}

/**
 * Aplica a proposta confirmada sobre os meses lidos do banco (chave do app).
 * Devolve SÓ os meses que mudaram, já com o autor (o login que ligou o
 * WhatsApp), como o app carimba ao gravar.
 */
export function aplicarLancamento(
  a: AcaoLancar, meses: Record<string, unknown>, p: { baseId: string; autor: string },
): Record<string, unknown> {
  let novos: Record<string, unknown>
  if (a.destino === 'fatura') {
    const valores = dividirParcelas(a.total, a.parcelas)
    novos = lancarNaFatura(meses, {
      cartao: comFechamentoDoMes({ id: a.contaId, diaFechamento: a.diaFechamento }, meses, a.ano, a.mes),
      ano: a.ano, mes: a.mes, dia: a.dia, tipoDaCategoria: a.tipoCategoria,
      categoria: a.categoria, subCategoria: a.subCategoria, descricao: a.descricao,
      valorParcela: valores[valores.length - 1], valores, parcelas: a.parcelas, baseId: p.baseId,
    })
  } else {
    const k = chaveDoMes(a.contaId, a.ano, a.mes)
    const dm = (meses[k] as { lancamentos: Record<number, unknown[]> } | undefined) ?? { lancamentos: {}, saldoBanco: '' }
    novos = {
      ...meses,
      [k]: lancarNoExtrato(dm, {
        dia: a.dia, tipo: a.tipoCategoria, categoria: a.categoria, subCategoria: a.subCategoria,
        descricao: a.descricao, valor: a.total, id: p.baseId,
        formaPagamento: a.formaPagamento === 'credito' ? 'debito' : a.formaPagamento,
      }),
    }
  }
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(novos)) if (novos[k] !== meses[k]) out[k] = carimbarAutor(meses[k], novos[k], p.autor)
  return out
}

export const textoLancado = (a: AcaoLancar) =>
  `${a.tipoCategoria === 'entrada' ? 'Recebimento lançado' : 'Lançado'}: ${brl(a.total)} em ${a.subCategoria ? `${a.categoria} · ${a.subCategoria}` : a.categoria}. Já aparece no app.`

/** Proposta guardada há mais disso não vale o "SIM". */
export const MINUTOS_DA_PROPOSTA = 15
