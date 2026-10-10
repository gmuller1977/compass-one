import type { Categoria, Conta, DadosMes } from '../context/AppContext'
import type { ContaAVencer } from './contasAVencer'
import { contaDoPagamento } from './pagarConta'
import { dataDoLancamento } from './lancamentoRapido'

/**
 * O que o Norte pode FAZER (Fase B, 10/10/2026): lançar, pagar uma conta e
 * simular uma compra. Ele não grava nada sozinho: escreve um pedido no fim da
 * resposta, a tela mostra um cartão com o que vai acontecer, e só o toque em
 * "Confirmar" grava — pelos MESMOS caminhos do Lançar e do "Pagar" da Bússola.
 *
 * O pedido vai no texto, e não por function calling do Gemini, de propósito:
 * assim a função north-chat do Supabase não muda (nada para publicar no
 * servidor) e a validação fica toda aqui, no aparelho, contra o cadastro.
 *
 *   [[fazer:lancar valor=47 categoria=<id> conta=<id|dinheiro> data=hoje parcelas=1 descricao="feira"]]
 *   [[fazer:pagar conta=<id da conta a vencer> ano=2026 mes=10 valor=2200]]
 *   [[fazer:simular valor=3000 parcelas=10 cartao=<id> nome="TV"]]
 *
 * Ids que não existem, valor inválido ou data no futuro: o pedido é recusado
 * e o cartão diz por quê. Nunca se chuta.
 */
export type PedidoLancar = {
  tipo: 'lancar'
  valor: number; categoriaId: string; contaId: string
  /** 'hoje' | 'ontem' | 'aaaa-mm-dd' — lido por dataDoLancamento. */
  data: string
  parcelas: number; descricao: string
}
export type PedidoPagar = { tipo: 'pagar'; id: string; ano: number; mes: number; valor: number; previsto: number; nome: string }
export type PedidoSimular = { tipo: 'simular'; valor: number; parcelas: number; cartaoId?: string; nome: string }
export type PedidoNorte = PedidoLancar | PedidoPagar | PedidoSimular

export type LeituraDoPedido =
  | { ok: true; pedido: PedidoNorte }
  | { ok: false; erro: string }

const RE_PEDIDO = /\[\[fazer:([a-z]+)([^\]]*)\]\]/

function atributos(s: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const m of s.matchAll(/(\w+)=("([^"]*)"|\S+)/g)) out[m[1]] = m[3] ?? m[2]
  return out
}

const numero = (s: string | undefined): number | null => {
  if (s === undefined) return null
  const t = s.trim()
  // Aceita "47", "47.90", "47,90" e "1.234,56"; nunca adivinha milhar ambíguo.
  const n = /^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(t) ? Number(t.replace(/\./g, '').replace(',', '.'))
    : Number(t.replace(',', '.'))
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

/** Separa o pedido do texto. O texto volta limpo; o pedido, validado ou com o motivo da recusa. */
export function lerPedido(
  texto: string,
  cad: { categorias: Categoria[]; contas: Conta[]; aVencer: ContaAVencer[]; hoje?: Date },
): { texto: string; leitura: LeituraDoPedido | null } {
  const m = texto.match(RE_PEDIDO)
  const limpo = texto.replace(new RegExp(RE_PEDIDO.source, 'g'), '').trim()
  if (!m) return { texto: limpo, leitura: null }
  return { texto: limpo, leitura: validar(m[1], atributos(m[2]), cad) }
}

function validar(
  tipo: string, a: Record<string, string>,
  cad: { categorias: Categoria[]; contas: Conta[]; aVencer: ContaAVencer[]; hoje?: Date },
): LeituraDoPedido {
  const hoje = cad.hoje ?? new Date()
  const valor = numero(a.valor)

  if (tipo === 'lancar') {
    if (valor === null || valor <= 0) return { ok: false, erro: 'O valor não ficou claro.' }
    const cat = cad.categorias.find(c => c.id === a.categoria && c.ativa)
    if (!cat) return { ok: false, erro: 'Não achei essa categoria no seu cadastro.' }
    const conta = a.conta === 'dinheiro' ? { id: 'dinheiro', tipo: 'dinheiro' } : cad.contas.find(c => c.id === a.conta)
    if (!conta) return { ok: false, erro: 'Não achei essa conta ou cartão.' }
    const data = a.data ?? 'hoje'
    if (data !== 'hoje' && data !== 'ontem') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { ok: false, erro: 'A data não ficou clara.' }
      const d = new Date(Number(data.slice(0, 4)), Number(data.slice(5, 7)) - 1, Number(data.slice(8, 10)))
      const h = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
      if (Number.isNaN(d.getTime()) || d > h) return { ok: false, erro: 'Não dá para lançar com data no futuro.' }
    }
    const parcelas = Math.floor(numero(a.parcelas) ?? 1)
    if (parcelas < 1 || parcelas > 24) return { ok: false, erro: 'Parcelas vão de 1 a 24.' }
    if (parcelas > 1 && conta.tipo !== 'cartao') return { ok: false, erro: 'Parcelado só no cartão.' }
    return { ok: true, pedido: { tipo: 'lancar', valor, categoriaId: cat.id, contaId: conta.id, data, parcelas, descricao: (a.descricao ?? '').trim() } }
  }

  if (tipo === 'pagar') {
    const ano = Number(a.ano), mes = Number(a.mes) - 1
    const c = cad.aVencer.find(x => x.id === a.conta && x.ano === ano && x.mes === mes)
    if (!c) return { ok: false, erro: 'Essa conta não está entre as contas a pagar.' }
    const v = valor !== null && valor > 0 ? valor : c.valor
    const nome = c.fatura ? `Fatura ${c.nome}` : c.descricao ? `${c.nome} · ${c.descricao}` : c.nome
    return { ok: true, pedido: { tipo: 'pagar', id: c.id, ano: c.ano, mes: c.mes, valor: v, previsto: c.valor, nome } }
  }

  if (tipo === 'simular') {
    if (valor === null || valor <= 0) return { ok: false, erro: 'O valor da compra não ficou claro.' }
    const parcelas = Math.floor(numero(a.parcelas) ?? 1)
    if (parcelas < 1 || parcelas > 24) return { ok: false, erro: 'Parcelas vão de 1 a 24.' }
    let cartaoId: string | undefined
    if (a.cartao) {
      const c = cad.contas.find(x => x.id === a.cartao && x.tipo === 'cartao')
      if (!c) return { ok: false, erro: 'Não achei esse cartão.' }
      cartaoId = c.id
    }
    return { ok: true, pedido: { tipo: 'simular', valor, parcelas, cartaoId, nome: (a.nome ?? '').trim() } }
  }

  return { ok: false, erro: 'Ainda não sei fazer isso.' }
}

/** Para o cartão de confirmação: data por extenso e a conta onde o pagamento cai. */
export function detalhesDoPedido(
  p: PedidoNorte,
  cad: { categorias: Categoria[]; contas: Conta[]; extratoData: Record<string, DadosMes>; hoje?: Date },
) {
  const nomeConta = (id: string | undefined) => id === 'dinheiro' ? 'Dinheiro'
    : (() => { const c = cad.contas.find(x => x.id === id); return c ? (c.apelido || c.banco || c.nome) : '' })()
  if (p.tipo === 'lancar') {
    const cat = cad.categorias.find(c => c.id === p.categoriaId)!
    const d = dataDoLancamento(p.data, cad.hoje)
    const h = cad.hoje ?? new Date()
    const ehHoje = d.toDateString() === new Date(h.getFullYear(), h.getMonth(), h.getDate()).toDateString()
    return {
      categoria: cat.descricao ? `${cat.nome} · ${cat.descricao}` : cat.nome,
      icone: cat.icone, cor: cat.cor, entrada: cat.tipo === 'entrada',
      conta: nomeConta(p.contaId),
      quando: ehHoje ? 'hoje' : p.data === 'ontem' ? 'ontem' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    }
  }
  if (p.tipo === 'pagar') {
    const de = contaDoPagamento(p.id, p.ano, p.mes, cad.contas, cad.categorias, cad.extratoData)
    return { de, deNome: nomeConta(de) }
  }
  return { cartao: p.cartaoId ? nomeConta(p.cartaoId) : 'Débito ou Pix' }
}

/** O que o Norte precisa saber para montar pedidos: os ids do cadastro. */
export function cadastroParaNorte(categorias: Categoria[], contas: Conta[], aVencer: ContaAVencer[]): string {
  const out: string[] = []
  out.push('', '### Cadastro (ids para os pedidos [[fazer:...]])')
  out.push('Categorias ativas:')
  for (const c of categorias.filter(x => x.ativa)) {
    out.push(`- id=${c.id} · ${c.descricao ? `${c.nome} · ${c.descricao}` : c.nome} · ${c.tipo === 'entrada' ? 'receita' : 'despesa'}${c.fixa ? ' fixa' : ''}`)
  }
  out.push('Contas e cartões:')
  for (const c of contas) out.push(`- id=${c.id} · ${c.apelido || c.banco || c.nome}${c.apelido && c.banco ? ` (${c.banco})` : ''} · ${c.tipo === 'cartao' ? 'cartão de crédito' : 'conta bancária'}`)
  out.push('- id=dinheiro · Dinheiro (carteira)')
  out.push('Contas a pagar que podem ser marcadas como pagas:')
  if (!aVencer.length) out.push('- nenhuma')
  for (const c of aVencer) out.push(`- conta=${c.id} ano=${c.ano} mes=${c.mes + 1} · ${c.fatura ? `Fatura ${c.nome}` : c.nome} · ${c.valor.toFixed(2)}`)
  return out.join('\n')
}
