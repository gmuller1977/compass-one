import type { Conta, Categoria } from '../context/AppContext'

/**
 * Lê um lançamento escrito ou falado: "47 mercado nubank", "gastei 32,90 no
 * ifood ontem", "1.200 aluguel", "350 em 3x na loja no nubank".
 *
 * Não grava nada: devolve o que entendeu para PRÉ-PREENCHER o Quick Launch, e
 * a pessoa confirma. Sem IA, de propósito — roda no aparelho, sem custo por
 * lançamento e sem mandar o texto para fora. O que não reconhece fica de fora
 * e vira a descrição.
 *
 * Casamento sem acento e sem caixa. Categoria: o nome inteiro tem de
 * aparecer como palavra(s) no texto; com mais de uma, ganha o nome mais longo
 * ("cartão de crédito" antes de "crédito"). Conta: nome, apelido ou banco.
 */
export type LancamentoInterpretado = {
  valor?: number
  categoriaId?: string
  contaId?: string
  /** 0 = hoje, 1 = ontem. */
  diasAtras: number
  parcelas?: number
  descricao: string
}

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const DESCARTAR = new Set(['gastei', 'paguei', 'comprei', 'recebi', 'no', 'na', 'nos', 'nas', 'em', 'de', 'do', 'da',
  'com', 'pelo', 'pela', 'reais', 'real', 'r$', 'rs', 'hoje', 'ontem', 'cartao', 'conta', 'e', 'o', 'a', 'um', 'uma', 'vezes'])

function lerValor(tok: string): number | undefined {
  const t = tok.replace(/^r\$/, '')
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$|^\d+\.\d{1,2}$/.test(t)) return undefined
  // "1.200" é milhar; "32.90" (fala transcrita, teclado en-US) é centavo.
  const n = /^\d+\.\d{1,2}$/.test(t) ? Number(t) : Number(t.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : undefined
}

function contem(texto: string, termo: string): boolean {
  const t = semAcento(termo).trim()
  if (!t) return false
  return new RegExp(`(^|\\s)${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`).test(texto)
}

export function interpretarLancamento(
  entrada: string, categorias: Categoria[], contas: Conta[],
): LancamentoInterpretado {
  let texto = ' ' + semAcento(entrada).replace(/[!?;]/g, ' ').replace(/\s+/g, ' ').trim() + ' '
  const out: LancamentoInterpretado = { diasAtras: 0, descricao: '' }

  if (contem(texto, 'ontem')) out.diasAtras = 1

  const parc = texto.match(/\s(\d{1,2})\s?x\s|\sem (\d{1,2}) vezes\s/)
  if (parc) {
    const n = Number(parc[1] ?? parc[2])
    if (n >= 2 && n <= 48) out.parcelas = n
    texto = texto.replace(parc[0], ' ')
  }

  const tokens = texto.trim().split(' ')
  const iValor = tokens.findIndex(t => lerValor(t) !== undefined)
  if (iValor >= 0) { out.valor = lerValor(tokens[iValor]); tokens.splice(iValor, 1) }
  texto = ' ' + tokens.join(' ') + ' '

  const ativas = categorias.filter(c => c.ativa)
  const cat = ativas
    // Variante só entra se for dita ("seguro march") ou se for a única com o
    // nome — com Seguro · Civic e Seguro · March, "seguro" sozinho não chuta.
    .filter(c => contem(texto, c.nome)
      && (!c.descricao || contem(texto, c.descricao) || ativas.filter(o => o.nome === c.nome).length === 1))
    .sort((a, b) => (b.nome.length + (b.descricao && contem(texto, b.descricao) ? 100 : 0))
                  - (a.nome.length + (a.descricao && contem(texto, a.descricao) ? 100 : 0)))[0]
  if (cat) {
    out.categoriaId = cat.id
    texto = texto.replace(` ${semAcento(cat.nome)} `, ' ')
    if (cat.descricao && contem(texto, cat.descricao)) texto = texto.replace(` ${semAcento(cat.descricao)} `, ' ')
  }

  const conta = contas.find(c => [c.apelido, c.nome, c.banco].some(n => n && contem(texto, n)))
  if (conta) {
    out.contaId = conta.id
    for (const n of [conta.apelido, conta.nome, conta.banco]) if (n) texto = texto.replace(` ${semAcento(n)} `, ' ')
  }

  out.descricao = texto.trim().split(' ').filter(t => t && !DESCARTAR.has(t)).join(' ')
  return out
}
