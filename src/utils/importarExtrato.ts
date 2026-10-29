import type { Categoria, Conta, DadosMes, Lancamento } from '../context/AppContext'
import { totalFatura, type Deps } from './saldoConta'
import { contaDoPagamento } from './pagarConta'
import { diaEfetivoFixa, faturaEhAutomatica } from './diaDaFixa'
import { valorFixaNoMes } from './valorFixa'
import { ehAutomatica } from './debitoAutomatico'
import { CARTEIRA_ID, descricoesDaTransferencia } from './transferencia'

/**
 * Importar o extrato do banco em Lançamentos > Banco (29/10/2026, pedido do
 * Guilherme, com Lançamentos liberado para isso; análise em
 * "Importação de extrato e fatura", base de teste em `teste/`).
 *
 * Importar não é copiar o arquivo para dentro do app: é CASAR cada linha com
 * o que o app já sabe, senão o mesmo dinheiro conta duas vezes. Uma linha do
 * banco vira uma destas coisas, nesta ordem:
 *
 *   - fora: antes da data do saldo da conta (já está nele), data futura
 *     (agendamento) ou já importada antes (o código da linha no banco);
 *   - fatura: "pagamento de fatura" confirma a fatura do cartão, não é
 *     despesa (a compra já contou na fatura);
 *   - fixa: confirma a conta fixa do mês (aluguel, salário, luz), no valor e
 *     no dia do banco;
 *   - já lançado: a pessoa já lançou (mesmo valor, até 3 dias de diferença);
 *   - corrigir: lançou com outro valor (mesmo nome, até 10%): troca o valor;
 *   - transferência: para outra conta própria, saque (carteira) ou aplicação;
 *   - novo: um lançamento, com a categoria sugerida pelo histórico.
 *
 * Nada grava sem a pessoa ver: a janela (`NleImportar`) mostra cada linha
 * com a decisão e deixa desmarcar ou trocar. A gravação vai pelos campos de
 * sempre (`lancamentos`, `fixasConsolidadas`, `fixasValorOverride`,
 * `fixasMovidas`, `debitosConferidos`), e o código de cada linha fica em
 * `importados` do mês, para a mesma linha não entrar de novo.
 */

// ── Leitura do arquivo ──────────────────────────────────────────────────

export type TransacaoDoArquivo = {
  /** O código da linha no banco (FITID); no CSV, montado da data, valor e texto. */
  id: string
  /** AAAA-MM-DD */
  data: string
  /** Com sinal: negativo sai da conta. */
  valor: number
  descricao: string
}

export type ArquivoDoBanco = {
  formato: 'OFX' | 'CSV'
  transacoes: TransacaoDoArquivo[]
  /** O saldo que o banco informa no arquivo, e de quando. */
  saldo?: { valor: number; data: string }
}

/** OFX antigo vem em Windows-1252; o resto, em UTF-8. */
export function decodificarArquivo(bytes: Uint8Array): string {
  const inicio = new TextDecoder('latin1').decode(bytes.slice(0, 400))
  if (/CHARSET:\s*1252/i.test(inicio) || /encoding="?(windows-1252|iso-8859-1)/i.test(inicio))
    return new TextDecoder('windows-1252').decode(bytes)
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes) }
  catch { return new TextDecoder('windows-1252').decode(bytes) }
}

/** "1.234,56", "-80.00", "R$ 1.234,56", "(45,90)": o número com sinal, ou null. */
export function numeroDoBanco(s: string): number | null {
  let t = s.trim().replace(/R\$|\s/g, '')
  if (!t) return null
  let negativo = false
  if (/^\(.*\)$/.test(t)) { negativo = true; t = t.slice(1, -1) }
  if (t.startsWith('-')) { negativo = !negativo; t = t.slice(1) }
  else if (t.startsWith('+')) t = t.slice(1)
  if (t.endsWith('-')) { negativo = !negativo; t = t.slice(0, -1) }
  const virgula = t.lastIndexOf(','), ponto = t.lastIndexOf('.')
  if (virgula >= 0 && ponto >= 0) t = virgula > ponto ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '')
  else if (virgula >= 0) t = t.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '')
  if (!/^\d+(\.\d+)?$/.test(t)) return null
  const n = Math.round(Number(t) * 100) / 100
  return negativo ? -n : n
}

/** dd/mm/aaaa, dd/mm/aa, aaaa-mm-dd ou aaaammdd → AAAA-MM-DD. */
export function dataDoBanco(s: string): string | null {
  const t = s.trim()
  let m = t.match(/^(\d{4})-?(\d{2})-?(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/)
  if (m) {
    const ano = m[3].length === 2 ? `20${m[3]}` : m[3]
    return `${ano}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  }
  return null
}

const ERRO_CARTAO = 'Este arquivo é de cartão de crédito. Por enquanto a importação é do extrato do banco: a fatura vem numa próxima etapa.'

/** Ids repetidos no mesmo arquivo viram id#2, id#3: são linhas diferentes. */
function idsUnicos(lista: TransacaoDoArquivo[]): TransacaoDoArquivo[] {
  const vistos = new Map<string, number>()
  return lista.map(t => {
    const n = (vistos.get(t.id) ?? 0) + 1
    vistos.set(t.id, n)
    return n === 1 ? t : { ...t, id: `${t.id}#${n}` }
  })
}

function lerOfx(texto: string): ArquivoDoBanco | { erro: string } {
  if (/<CREDITCARDMSGSRSV1>|<CCSTMTRS>/i.test(texto)) return { erro: ERRO_CARTAO }
  const tag = (bloco: string, nome: string) => bloco.match(new RegExp(`<${nome}>\\s*([^<\\r\\n]*)`, 'i'))?.[1]?.trim() ?? ''
  const blocos = texto.split(/<STMTTRN>/i).slice(1).map(b => b.split(/<\/STMTTRN>|<\/BANKTRANLIST>/i)[0])
  const transacoes: TransacaoDoArquivo[] = []
  for (const b of blocos) {
    const data = dataDoBanco(tag(b, 'DTPOSTED').slice(0, 8))
    const valor = numeroDoBanco(tag(b, 'TRNAMT'))
    if (!data || valor === null || valor === 0) continue
    const memo = tag(b, 'MEMO'), nome = tag(b, 'NAME')
    const descricao = (memo || nome || 'Sem descrição').replace(/\s+/g, ' ')
    transacoes.push({ id: tag(b, 'FITID') || `ofx-${data}-${valor}-${normalizar(descricao)}`, data, valor, descricao })
  }
  const ledger = texto.match(/<LEDGERBAL>([\s\S]*?)(<\/LEDGERBAL>|<AVAILBAL>|<\/STMTRS>)/i)?.[1]
  const saldoValor = ledger ? numeroDoBanco(tag(ledger, 'BALAMT')) : null
  const saldoData = ledger ? dataDoBanco(tag(ledger, 'DTASOF').slice(0, 8)) : null
  if (!transacoes.length) return { erro: 'Não achei nenhum lançamento neste arquivo.' }
  return {
    formato: 'OFX', transacoes: idsUnicos(transacoes),
    ...(saldoValor !== null && saldoData ? { saldo: { valor: saldoValor, data: saldoData } } : {}),
  }
}

/** Uma linha de CSV, com aspas. */
function celulas(linha: string, sep: string): string[] {
  const out: string[] = []
  let atual = '', aspas = false
  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i]
    if (aspas) {
      if (ch === '"' && linha[i + 1] === '"') { atual += '"'; i++ }
      else if (ch === '"') aspas = false
      else atual += ch
    } else if (ch === '"') aspas = true
    else if (ch === sep) { out.push(atual); atual = '' }
    else atual += ch
  }
  out.push(atual)
  return out.map(c => c.trim())
}

function lerCsv(texto: string): ArquivoDoBanco | { erro: string } {
  const linhas = texto.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim())
  if (!linhas.length) return { erro: 'O arquivo está vazio.' }
  const contar = (c: string) => linhas.slice(0, 5).reduce((s, l) => s + l.split(c).length - 1, 0)
  const sep = [';', '\t', ','].sort((a, b) => contar(b) - contar(a))[0]
  const tabela = linhas.map(l => celulas(l, sep))

  // Cabeçalho: a primeira linha cujas células não são data.
  const iCab = tabela.findIndex(r => r.some(c => /data|date/i.test(normalizar(c))))
  const cab = iCab >= 0 ? tabela[iCab].map(c => normalizar(c)) : []
  if (cab.includes('TITLE') && cab.includes('AMOUNT')) return { erro: ERRO_CARTAO }
  const col = (...nomes: string[]) => cab.findIndex(c => nomes.some(n => c === n || c.startsWith(n)))
  const cData = iCab >= 0 ? col('DATA', 'DATE') : 0
  const cDesc = iCab >= 0 ? col('DESCRICAO', 'HISTORICO', 'LANCAMENTO', 'DESCRIPTION', 'MEMO', 'DETALHE', 'ESTABELECIMENTO') : 1
  const cValor = iCab >= 0 ? col('VALOR', 'AMOUNT', 'VALUE', 'QUANTIA') : 2
  const cCred = col('CREDITO', 'ENTRADA'), cDeb = col('DEBITO', 'SAIDA')
  const cSaldo = col('SALDO', 'BALANCE')
  const cId = col('IDENTIFICADOR', 'ID', 'DOCUMENTO')
  if (cData < 0 || cDesc < 0 || (cValor < 0 && cCred < 0)) return { erro: 'Não reconheci as colunas deste CSV (data, descrição e valor).' }

  const transacoes: TransacaoDoArquivo[] = []
  let saldo: ArquivoDoBanco['saldo']
  for (const r of tabela.slice(iCab + 1)) {
    const data = dataDoBanco(r[cData] ?? '')
    if (!data) continue
    const descricao = (r[cDesc] ?? '').replace(/\s+/g, ' ') || 'Sem descrição'
    let valor = cValor >= 0 ? numeroDoBanco(r[cValor] ?? '') : null
    if (valor === null && cCred >= 0) {
      const cr = numeroDoBanco(r[cCred] ?? ''), db = cDeb >= 0 ? numeroDoBanco(r[cDeb] ?? '') : null
      valor = cr ? Math.abs(cr) : db ? -Math.abs(db) : null
    }
    const s = cSaldo >= 0 ? numeroDoBanco(r[cSaldo] ?? '') : null
    if (s !== null && (!saldo || data >= saldo.data)) saldo = { valor: s, data }
    if (valor === null || valor === 0 || /^SALDO\b/.test(normalizar(descricao))) continue
    const id = (cId >= 0 && r[cId]) || `csv-${data}-${valor.toFixed(2)}-${normalizar(descricao)}`
    transacoes.push({ id, data, valor, descricao })
  }
  if (!transacoes.length) return { erro: 'Não achei nenhum lançamento neste arquivo.' }
  return { formato: 'CSV', transacoes: idsUnicos(transacoes), ...(saldo ? { saldo } : {}) }
}

/** OFX ou CSV, pelo conteúdo (não pelo nome do arquivo). */
export function lerArquivoDoBanco(texto: string): ArquivoDoBanco | { erro: string } {
  if (/<OFX>|OFXHEADER/i.test(texto)) return lerOfx(texto)
  if (/%PDF/.test(texto.slice(0, 10))) return { erro: 'PDF ainda não é lido. No app ou site do banco, exporte o extrato em OFX (ou CSV).' }
  return lerCsv(texto)
}

// ── Texto ───────────────────────────────────────────────────────────────

/** Maiúsculas, sem acento e sem pontuação. */
export function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim()
}

/** O que o banco escreve antes do nome, e que não diz nada sobre o gasto. */
const PREFIXOS = /^(COMPRA (COM )?(CARTAO )?(DE )?DEBITO|COMPRA CARTAO DEBITO|COMPRA DEBITO|COMPRA|PIX (ENVIADO|RECEBIDO|EMITIDO|TRANSF)|PIX|DEB(ITO)? AUT(OMATICO)?|CRED(ITO)?|TED (ENVIADA|RECEBIDA)|DOC|PAGTO|PAGAMENTO( DE)?|DEBITO|ELO|VISA|MASTERCARD)\b\s*/

const VAZIAS = new Set(['COMPRA', 'DEBITO', 'CREDITO', 'PIX', 'ENVIADO', 'ENVIADA', 'RECEBIDO', 'RECEBIDA', 'TED', 'DOC',
  'TRANSF', 'TRANSFERENCIA', 'PAGTO', 'PAGAMENTO', 'CARTAO', 'ELO', 'VISA', 'MASTER', 'MASTERCARD', 'LTDA', 'EIRELI',
  'COM', 'PARA', 'DOS', 'DAS', 'BOLETO', 'AUT', 'AUTOMATICO', 'CRED', 'DEB', 'SAO', 'BRASIL', 'TRIP'])

/** As palavras que identificam o gasto ("SUPERMERCADO ZAFFARI" → SUPERMERCADO, ZAFFARI). */
export function palavras(s: string): string[] {
  return normalizar(s).split(' ').filter(p => p.length >= 4 && !VAZIAS.has(p) && !/^\d+$/.test(p))
}

/** "COMPRA DEBITO FARMACIA DROGASIL" → "Farmacia Drogasil". */
export function descricaoLimpa(s: string): string {
  // Tira o prefixo palavra a palavra do texto ORIGINAL, para manter os acentos.
  const ps = s.trim().split(/\s+/)
  const prefixo = normalizar(s).match(PREFIXOS)?.[0].trim() ?? ''
  let k = 0
  if (prefixo) while (k < ps.length && normalizar(ps.slice(0, k).join(' ')) !== prefixo) k++
  const resto = k < ps.length ? ps.slice(k) : ps
  return resto.map(p => p.toLowerCase())
    .map((p, i) => (i > 0 && p.length <= 2) ? p : p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
}

// ── Classificação ───────────────────────────────────────────────────────

export type Acao = 'fora' | 'fatura' | 'fixa' | 'ja_lancado' | 'corrigir' | 'transferencia' | 'novo'

export type Existente = { chave: string; dia: number; id: string; valor: number; descricao: string; categoria: string }

export type LinhaImportada = {
  t: TransacaoDoArquivo
  ano: number; mes: number; dia: number
  tipo: 'entrada' | 'saida'
  valor: number
  acao: Acao
  /** Por que fica de fora. */
  motivo?: string
  descricao: string
  /** Novo: a categoria sugerida (id do cadastro). */
  categoriaId?: string
  /** Já lançado ou corrigir: o lançamento que já existe. */
  existente?: Existente
  /** Fixa ou fatura: o que se confirma. */
  fixa?: { id: string; nome: string; previsto: number; jaConfirmada: boolean; diaPrevisto: number; automatica: boolean }
  /** Transferência: a outra conta (id, ou 'dinheiro'). */
  destinoId?: string
}

export type ContextoImportacao = Deps & { contaId: string; hoje: Date }

const chaveMes = (conta: string, ano: number, mes: number) => `${conta}-${ano}-${String(mes + 1).padStart(2, '0')}`
const diaDoAno = (ano: number, mes: number, dia: number) => Date.UTC(ano, mes, dia) / 86400000
const nomeDaConta = (c: Conta) => c.apelido || c.banco || c.nome

/** Os lançamentos da conta em volta de uma data (± dias), com o dia de cada um. */
function lancamentosPerto(ctx: ContextoImportacao, conta: string, ano: number, mes: number, dia: number, folga: number) {
  const out: (Lancamento & { _chave: string; _dia: number; _dist: number; idBanco?: string })[] = []
  const alvo = diaDoAno(ano, mes, dia)
  for (const dm of [-1, 0, 1]) {
    const d = new Date(ano, mes + dm, 1)
    const k = chaveMes(conta, d.getFullYear(), d.getMonth())
    for (const [diaTxt, lista] of Object.entries(ctx.extratoData[k]?.lancamentos ?? {})) {
      const dist = Math.abs(diaDoAno(d.getFullYear(), d.getMonth(), Number(diaTxt)) - alvo)
      if (dist > folga) continue
      for (const l of lista) out.push({ ...l, _chave: k, _dia: Number(diaTxt), _dist: dist })
    }
  }
  return out
}

const ehTransf = (l: { categoria: string; formaPagamento?: string }) =>
  l.formaPagamento === 'transferencia' || l.categoria === 'Transferência'

const RE_FATURA = /\bFATURA\b|PAG(TO|AMENTO)? (DE )?CART|PGTO CART|CARTAO CRED(ITO)? PAG/
const RE_SAQUE = /\bSAQUE\b/
const RE_APLICACAO = /\bAPLIC(ACAO)?\b|\bINVEST|\bCDB\b|\bPOUPANCA\b/
const RE_RESGATE = /\bRESGATE\b/
const RE_TRANSF = /\bTED\b|\bDOC\b|\bTRANSF|\bPIX\b|\bTEF\b/

/**
 * Categoria sugerida: primeiro o histórico da pessoa (uma palavra do texto
 * que já apareceu num lançamento dela), depois um dicionário curto de nomes
 * comuns. Sem nenhum dos dois, fica sem sugestão, e a pessoa escolhe.
 */
const DICIONARIO: [RegExp, string][] = [
  [/FARMACIA|DROGA|PANVEL|RAIA|PAGUE MENOS/, 'FARMACIA'],
  [/SUPERMERC|MERCADO|ATACAD|ZAFFARI|CARREFOUR|ASSAI|HORTIFRUTI/, 'MERCADO'],
  [/\bUBER\b|\b99\b|CABIFY|TAXI|METRO|ONIBUS/, 'TRANSPORTE'],
  [/POSTO|COMBUST|IPIRANGA|SHELL|PETROBRAS|GASOLINA/, 'COMBUST'],
  [/RESTAURANTE|IFOOD|LANCHONETE|PIZZ|BURGER|DELIVERY/, 'RESTAURANTE'],
  [/NETFLIX|SPOTIFY|DISNEY|PRIME VIDEO|HBO|GLOBOPLAY/, 'ASSINATURA'],
  [/\bTARIFA\b|\bANUIDADE\b|PACOTE SERV/, 'TARIFA'],
  [/\bPET\b|PETSHOP|PETZ|COBASI|VETERIN/, 'PET'],
  [/ACADEMIA|SMARTFIT|SMART FIT|BLUEFIT/, 'ACADEMIA'],
]

export function mapaDoHistorico(ctx: Deps): Map<string, { nome: string; sub?: string }> {
  const contagem = new Map<string, Map<string, number>>()
  const somar = (texto: string, nome: string, sub?: string) => {
    if (!nome || nome === 'Transferência') return
    const chave = `${nome}\u0000${sub ?? ''}`
    for (const p of palavras(texto)) {
      const m = contagem.get(p) ?? new Map<string, number>()
      m.set(chave, (m.get(chave) ?? 0) + 1)
      contagem.set(p, m)
    }
  }
  for (const dm of Object.values(ctx.extratoData))
    for (const lista of Object.values(dm?.lancamentos ?? {}))
      for (const l of lista) somar(l.descricao, l.categoria, l.subCategoria)
  for (const dm of Object.values(ctx.faturaData as Record<string, { lancamentos?: Record<number, { descricao?: string; categoria?: string; subCategoria?: string }[]> }>))
    for (const lista of Object.values(dm?.lancamentos ?? {}))
      for (const l of lista) somar(l.descricao ?? '', l.categoria ?? '', l.subCategoria)
  const out = new Map<string, { nome: string; sub?: string }>()
  for (const [p, m] of contagem) {
    const [chave] = [...m.entries()].sort((a, b) => b[1] - a[1])[0]
    const [nome, sub] = chave.split('\u0000')
    out.set(p, { nome, sub: sub || undefined })
  }
  return out
}

export function sugerirCategoria(
  texto: string, tipo: 'entrada' | 'saida', categorias: Categoria[], historico: Map<string, { nome: string; sub?: string }>,
): string | undefined {
  const ativas = categorias.filter(c => c.ativa && c.tipo === tipo)
  for (const p of palavras(texto)) {
    const h = historico.get(p)
    const cat = h && ativas.find(c => c.nome === h.nome && (c.descricao ?? '') === (h.sub ?? ''))
    if (cat) return cat.id
  }
  const n = normalizar(texto)
  for (const [re, alvo] of DICIONARIO) {
    if (!re.test(n)) continue
    const cat = ativas.find(c => normalizar(c.nome).includes(alvo) && !c.descricao)
      ?? ativas.find(c => normalizar(c.nome).includes(alvo))
    if (cat) return cat.id
  }
  return undefined
}

/** As contas para onde a conta importada pode transferir (as outras próprias). */
function contasProprias(ctx: ContextoImportacao): Conta[] {
  return ctx.contas.filter(c => c.id !== ctx.contaId && (c.tipo === 'corrente' || c.tipo === 'poupanca'))
}

export function classificar(arquivo: ArquivoDoBanco, ctx: ContextoImportacao): LinhaImportada[] {
  const conta = ctx.contas.find(c => c.id === ctx.contaId)
  const hojeIso = `${ctx.hoje.getFullYear()}-${String(ctx.hoje.getMonth() + 1).padStart(2, '0')}-${String(ctx.hoje.getDate()).padStart(2, '0')}`
  const historico = mapaDoHistorico(ctx)
  const usados = new Set<string>()        // lançamentos já casados
  const fixasUsadas = new Set<string>()   // `${chave}|${fixaId}`
  const proprias = contasProprias(ctx)
  const ordenadas = [...arquivo.transacoes].sort((a, b) => a.data.localeCompare(b.data))

  return ordenadas.map(t => {
    const [ano, mes1, dia] = t.data.split('-').map(Number)
    const mes = mes1 - 1
    const tipo: 'entrada' | 'saida' = t.valor > 0 ? 'entrada' : 'saida'
    const valor = Math.abs(t.valor)
    const base: LinhaImportada = { t, ano, mes, dia, tipo, valor, acao: 'novo', descricao: descricaoLimpa(t.descricao) }
    const chave = chaveMes(ctx.contaId, ano, mes)
    const dm = ctx.extratoData[chave]
    const texto = normalizar(t.descricao)

    // 1. Fora
    if (dm?.importados?.[t.id]) return { ...base, acao: 'fora', motivo: 'já importada antes' }
    if (conta?.saldoInicialDesde && t.data < conta.saldoInicialDesde)
      return { ...base, acao: 'fora', motivo: 'antes do saldo inicial da conta (já está nele)' }
    if (t.data > hojeIso) return { ...base, acao: 'fora', motivo: 'data futura (agendamento)' }

    // 2. Pagamento de fatura
    if (tipo === 'saida' && RE_FATURA.test(texto)) {
      const cartoes = ctx.contas.filter(c => c.tipo === 'cartao')
      const daConta = cartoes.filter(c => contaDoPagamento(`cartao-${c.id}`, ano, mes, ctx.contas, ctx.categorias, ctx.extratoData) === ctx.contaId)
      const candidatos = daConta.length ? daConta : cartoes
      const pelo = candidatos.filter(c => [c.nome, c.banco, c.apelido ?? ''].some(n => n && palavrasOuSigla(n).some(p => texto.includes(p))))
      const lista = (pelo.length ? pelo : candidatos)
        .map(c => ({ c, total: totalFatura(c.id, ano, mes, ctx.contas, ctx.faturaData) }))
        .filter(x => !fixasUsadas.has(`${chave}|cartao-${x.c.id}`))
        .sort((a, b) => Math.abs(a.total - valor) - Math.abs(b.total - valor))
      const achado = lista[0]
      if (achado) {
        const id = `cartao-${achado.c.id}`
        fixasUsadas.add(`${chave}|${id}`)
        return {
          ...base, acao: 'fatura', descricao: `Fatura ${nomeDaConta(achado.c)}`,
          fixa: {
            id, nome: `Fatura ${nomeDaConta(achado.c)}`, previsto: achado.total,
            jaConfirmada: dm?.fixasConsolidadas?.[id] === true,
            diaPrevisto: achado.c.diaVencimento ?? dia, automatica: faturaEhAutomatica(achado.c),
          },
        }
      }
    }

    // 3. Conta fixa do mês
    const totalDias = new Date(ano, mes + 1, 0).getDate()
    const fixas = ctx.categorias
      .filter(c => c.fixa && c.tipo === tipo && c.tipoMovimento !== 'cartao' && c.tipoMovimento !== 'dinheiro')
      .filter(c => !fixasUsadas.has(`${chave}|${c.id}`))
      .filter(c => !c.contaDebitoId || contaDoPagamento(c.id, ano, mes, ctx.contas, ctx.categorias, ctx.extratoData) === ctx.contaId)
      .filter(c => !Object.entries(ctx.extratoData).some(([k, d]) => k !== chave && k.endsWith(chave.slice(ctx.contaId.length)) && d?.fixasConsolidadas?.[c.id] === true))
      .map(c => {
        const jaConfirmada = dm?.fixasConsolidadas?.[c.id] === true
        if (!c.ativa && !jaConfirmada) return null
        const previsto = valorFixaNoMes(c, ctx.planos[ano], mes, ctx.categorias)
        if (previsto <= 0) return null
        const automatica = ehAutomatica(c)
        const diaPrevisto = diaEfetivoFixa({ id: c.id, diaVencimento: c.diaVencimento ?? 1 }, dm?.fixasMovidas, automatica && c.tipo === 'saida', mes, ano, totalDias)
        const distDia = Math.abs(diaPrevisto - dia)
        const difValor = Math.abs(previsto - valor) / previsto
        const nome = palavras(`${c.nome} ${c.descricao ?? ''}`).some(p => texto.includes(p))
        if (distDia > 5 || difValor > (nome ? 0.6 : 0.25)) return null
        return { c, previsto, jaConfirmada, diaPrevisto, automatica, nota: difValor * 10 + distDia / 5 - (nome ? 1 : 0) }
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
      .sort((a, b) => a.nota - b.nota)
    if (fixas[0]) {
      const f = fixas[0]
      fixasUsadas.add(`${chave}|${f.c.id}`)
      const nome = f.c.descricao ? `${f.c.nome} · ${f.c.descricao}` : f.c.nome
      return {
        ...base, acao: 'fixa', descricao: nome,
        fixa: { id: f.c.id, nome, previsto: f.previsto, jaConfirmada: f.jaConfirmada, diaPrevisto: f.diaPrevisto, automatica: f.automatica },
      }
    }

    // 4 e 5. Já lançado (mesmo valor) ou com outro valor (mesmo nome)
    const perto = lancamentosPerto(ctx, ctx.contaId, ano, mes, dia, 3)
      .filter(l => l.tipo === tipo && !usados.has(`${l._chave}|${l.id}`))
    const igual = perto.filter(l => Math.abs(l.valor - valor) < 0.005).sort((a, b) => a._dist - b._dist)[0]
    const meus = palavras(t.descricao)
    const parecido = igual ? undefined : perto
      .filter(l => !ehTransf(l) && Math.abs(l.valor - valor) / valor <= 0.1
        && palavras(`${l.descricao} ${l.categoria}`).some(p => meus.includes(p)))
      .sort((a, b) => a._dist - b._dist || Math.abs(a.valor - valor) - Math.abs(b.valor - valor))[0]
    const casado = igual ?? parecido
    if (casado) {
      usados.add(`${casado._chave}|${casado.id}`)
      return {
        ...base, acao: igual ? 'ja_lancado' : 'corrigir',
        existente: { chave: casado._chave, dia: casado._dia, id: casado.id, valor: casado.valor, descricao: casado.descricao, categoria: casado.categoria },
      }
    }

    // 6. Transferência
    if (RE_SAQUE.test(texto) && tipo === 'saida') return { ...base, acao: 'transferencia', destinoId: CARTEIRA_ID, descricao: 'Saque' }
    const descTransf = tipo === 'saida' ? 'Transferência enviada' : 'Transferência recebida'
    const investimentos = proprias.filter(c => c.tipo === 'poupanca')
    if ((RE_APLICACAO.test(texto) && tipo === 'saida') || (RE_RESGATE.test(texto) && tipo === 'entrada')) {
      if (investimentos.length) return { ...base, acao: 'transferencia', destinoId: investimentos[0].id, descricao: tipo === 'saida' ? 'Aplicação' : 'Resgate' }
      return { ...base, acao: 'novo', motivo: 'Parece uma aplicação. Cadastre a conta de investimento em Configurações para ela virar transferência.' }
    }
    if (RE_TRANSF.test(texto)) {
      const outra = proprias.find(c => [c.banco, c.apelido ?? '', c.nome].some(n => n && palavrasOuSigla(n).some(p => texto.includes(p))))
      if (outra) return { ...base, acao: 'transferencia', destinoId: outra.id, descricao: descTransf }
    }

    // 7. Novo
    return { ...base, categoriaId: sugerirCategoria(t.descricao, tipo, ctx.categorias, historico) }
  })
}

/** "Caixa" → CAIXA; "Banco do Brasil" → BANCO, BRASIL e BB; "XP" → XP. */
function palavrasOuSigla(nome: string): string[] {
  const n = normalizar(nome)
  const ps = n.split(' ').filter(p => p.length >= 2 && !['BANCO', 'DE', 'DO', 'DA', 'CONTA'].includes(p))
  return ps.length ? ps : [n]
}

/** Se a transferência já está na outra conta (importada de lá antes, ou lançada à mão). */
export function outraPontaJaExiste(l: LinhaImportada, ctx: ContextoImportacao): boolean {
  if (!l.destinoId) return false
  const oposto = l.tipo === 'saida' ? 'entrada' : 'saida'
  return lancamentosPerto(ctx, l.destinoId, l.ano, l.mes, l.dia, 3)
    .some(x => x.tipo === oposto && ehTransf(x) && Math.abs(x.valor - l.valor) < 0.005)
}

// ── Gravação ────────────────────────────────────────────────────────────

/** Uma linha como a pessoa deixou na janela. */
export type Escolha = { marcada: boolean; categoriaId?: string; destinoId?: string }

export type Mudancas = Map<string, ((dm: DadosMes) => DadosMes)[]>

const novoMes = (): DadosMes => ({ lancamentos: {}, saldoBanco: '' })

/** O que cada linha marcada grava, por chave de mês. */
export function mudancasDaImportacao(
  linhas: LinhaImportada[], escolhas: Escolha[], ctx: ContextoImportacao, carimbo = Date.now(),
): Mudancas {
  const m: Mudancas = new Map()
  const em = (k: string, fn: (dm: DadosMes) => DadosMes) => m.set(k, [...(m.get(k) ?? []), fn])
  const marcarImportada = (k: string, id: string) => em(k, dm => ({ ...dm, importados: { ...dm.importados, [id]: true } }))
  const nomeDe = (id: string) => id === CARTEIRA_ID ? 'Dinheiro' : (() => { const c = ctx.contas.find(x => x.id === id); return c ? nomeDaConta(c) : '' })()

  linhas.forEach((l, i) => {
    const e = escolhas[i]
    if (!e?.marcada || l.acao === 'fora') return
    const k = chaveMes(ctx.contaId, l.ano, l.mes)
    const novoId = `imp-${carimbo}-${i}`

    if (l.acao === 'fixa' || l.acao === 'fatura') {
      const f = l.fixa!
      em(k, dm => {
        const mudouValor = Math.abs(l.valor - f.previsto) > 0.004
        const valores = { ...dm.fixasValorOverride }
        if (mudouValor) valores[f.id] = l.valor
        else delete valores[f.id]
        return {
          ...dm,
          fixasConsolidadas: { ...dm.fixasConsolidadas, [f.id]: true },
          fixasValorOverride: valores,
          ...(l.dia !== f.diaPrevisto ? { fixasMovidas: { ...dm.fixasMovidas, [f.id]: l.dia } } : {}),
          ...(f.automatica ? { debitosConferidos: { ...dm.debitosConferidos, [f.id]: true } } : {}),
        }
      })
    } else if (l.acao === 'ja_lancado' || l.acao === 'corrigir') {
      const ex = l.existente!
      em(ex.chave, dm => ({
        ...dm,
        lancamentos: {
          ...dm.lancamentos,
          [ex.dia]: (dm.lancamentos[ex.dia] ?? []).map(x => x.id !== ex.id ? x
            : { ...x, idBanco: l.t.id, ...(l.acao === 'corrigir' ? { valor: l.valor } : {}) }),
        },
      }))
    } else if (l.acao === 'transferencia' && e.destinoId) {
      const destino = e.destinoId
      const { primaria, espelho } = descricoesDaTransferencia({
        origemId: ctx.contaId, destinoId: destino, tipo: l.tipo, nomeOrigem: nomeDe(ctx.contaId), nomeDestino: nomeDe(destino),
      })
      const lanc = (id: string, tipo: 'entrada' | 'saida', descricao: string, idBanco?: string): Lancamento => ({
        id, tipo, descricao, categoria: 'Transferência', valor: l.valor, formaPagamento: 'transferencia',
        tipoLanc: 'variavel', consolidado: true, ...(idBanco ? { idBanco } : {}),
      })
      em(k, dm => ({ ...dm, lancamentos: { ...dm.lancamentos, [l.dia]: [...(dm.lancamentos[l.dia] ?? []), lanc(novoId, l.tipo, primaria, l.t.id)] } }))
      const contaDestino = ctx.contas.find(c => c.id === destino)
      const iso = `${l.ano}-${String(l.mes + 1).padStart(2, '0')}-${String(l.dia).padStart(2, '0')}`
      const destinoAntesDoSaldo = !!contaDestino?.saldoInicialDesde && iso < contaDestino.saldoInicialDesde
      if (!outraPontaJaExiste(l, ctx) && !destinoAntesDoSaldo) {
        const kd = chaveMes(destino, l.ano, l.mes)
        em(kd, dm => ({ ...dm, lancamentos: { ...dm.lancamentos, [l.dia]: [...(dm.lancamentos[l.dia] ?? []),
          lanc(`${novoId}-t`, l.tipo === 'saida' ? 'entrada' : 'saida', espelho)] } }))
      }
    } else if (l.acao === 'novo' || l.acao === 'transferencia') {
      const cat = ctx.categorias.find(c => c.id === e.categoriaId)
      if (!cat) return
      const lanc: Lancamento = {
        id: novoId, tipo: l.tipo, descricao: l.descricao, categoria: cat.nome,
        ...(cat.descricao ? { subCategoria: cat.descricao } : {}),
        valor: l.valor, formaPagamento: 'debito', tipoLanc: 'variavel', consolidado: true, idBanco: l.t.id,
      }
      em(k, dm => ({ ...dm, lancamentos: { ...dm.lancamentos, [l.dia]: [...(dm.lancamentos[l.dia] ?? []), lanc] } }))
    } else return
    marcarImportada(k, l.t.id)
  })
  return m
}

/** As mudanças aplicadas sobre o extrato (para a prova e para o saldo de depois). */
export function aplicarMudancas(extrato: Record<string, DadosMes>, m: Mudancas): Record<string, DadosMes> {
  const out = { ...extrato }
  for (const [k, fns] of m) out[k] = fns.reduce((dm, fn) => fn(dm), out[k] ?? novoMes())
  return out
}

/** Se a linha pode ser gravada como está na janela. */
export function podeGravar(l: LinhaImportada, e: Escolha): boolean {
  if (l.acao === 'fora') return false
  if (l.acao === 'novo') return !!e.categoriaId
  if (l.acao === 'transferencia') return !!e.destinoId || !!e.categoriaId
  return true
}
