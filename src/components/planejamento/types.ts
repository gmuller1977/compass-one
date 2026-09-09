export type Cat = { id?: string; nome: string; descricao?: string; grupo?: string; t?: string; v: number[] }

export function nomeExibicao(cat: Cat) {
  return cat.descricao ? `${cat.nome} · ${cat.descricao}` : cat.nome
}
export type AnoData = { saldoInicialJan: number; entradas: Cat[]; saidas: Cat[] }
export type Editando = { tipo: 'e' | 's'; row: number; mes: number } | null
export type ViewMode = 'grade' | 'planilha' | 'painel' | 'lista'
export type Aba = 'meu-plano' | 'realizado' | 'revisao'

// Motivos de bloqueio de edicao — mostrados ao clicar na celula, para o clique
// nunca cair no vazio sem explicacao.
// "Atualizado" e o rotulo que aparece na aba; internamente a aba se chama
// 'realizado'. As mensagens usam o rotulo visivel, senao mandam o usuario
// procurar por uma aba que nao existe com esse nome na tela.
export const MOTIVO_PLANO_LOCKADO =
  'Plano ativo: "Meu plano" está bloqueado 🔒. Para alterar valores, use a aba "Atualizado".'
export const MOTIVO_REALIZADO =
  'Este valor vem dos lançamentos. Para mudar, edite o lançamento em Lançamentos ou na fatura.'

export const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
export const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

import { COR } from '../../utils/cores'
export { COR }

export function mergeCats(base: Cat[], saved: Cat[]): Cat[] {
  return base.map(cat => {
    const found = cat.id
      ? (saved.find(c => c.id === cat.id) ?? saved.find(c => !c.id && c.nome === cat.nome))
      : saved.find(c => c.nome === cat.nome)
    // Preserva descricao do base (fonte de verdade é o cadastro da categoria)
    return found ? { ...cat, v: found.v } : cat
  }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

/**
 * Ancora do fluxo de caixa: ate `ateMes` (inclusive) o movimento vem dos
 * lancamentos; dali em diante, do plano. Sem ancora, a cascata e 100% plano —
 * uma projecao que nunca olha para a realidade.
 */
export type AncoraReal = {
  /** Ultimo mes fechado, 0-11. -1 = nenhum mes fechado ainda. */
  ateMes: number
  te: number[]
  ts: number[]
  /**
   * Saldo REAL ao fim de um mes — bancos mais dinheiro, o mesmo numero que o
   * Radar mostra. `-1` pede o fim de dezembro do ano anterior, que e com o que
   * janeiro abre.
   *
   * Existe porque o Planejamento calculava o realizado por conta propria,
   * partindo da soma dos saldos de CADASTRO das contas correntes e poupancas.
   * Isso deixava de fora o dinheiro em carteira, ignorava a conciliacao e
   * incluia contas marcadas para ficar fora do saldo inicial — tres motivos
   * para agosto abrir com um numero aqui e outro no Radar.
   */
  fim?: (mes: number) => number
}

export type Saldos = ReturnType<typeof calcSaldos>

export const SEM_GRUPO = '__sem_grupo__'

/** Uma linha de detalhe: o cabeçalho de um grupo, ou uma categoria dele. */
export type LinhaCat =
  | { k: 'grupo'; tipo: 'e' | 's'; grupo: string; ris: number[] }
  | { k: 'cat'; tipo: 'e' | 's'; ri: number; cat: Cat }

/**
 * Quebra a lista de categorias em grupos, na ordem de exibição.
 *
 * `ri` é sempre o índice na lista ORIGINAL — é por ele que onSave grava, e por
 * isso ele viaja junto em vez de ser recalculado depois da ordenação.
 *
 * Sem nenhum grupo de verdade, não emite cabeçalho nenhum: uma tela com doze
 * categorias soltas não ganha nada com um "Outros" sozinho no topo.
 */
export function agrupar(cats: Cat[], tipo: 'e' | 's'): LinhaCat[] {
  const porGrupo = new Map<string, { ri: number; cat: Cat }[]>()
  cats.forEach((cat, ri) => {
    const g = cat.grupo ?? SEM_GRUPO
    if (!porGrupo.has(g)) porGrupo.set(g, [])
    porGrupo.get(g)!.push({ ri, cat })
  })
  const ordenados = [...porGrupo.entries()].sort(([a], [b]) =>
    a === SEM_GRUPO ? 1 : b === SEM_GRUPO ? -1 : a.localeCompare(b, 'pt-BR'))
  const temGrupoReal = ordenados.some(([g]) => g !== SEM_GRUPO)

  const out: LinhaCat[] = []
  for (const [grupo, items] of ordenados) {
    if (temGrupoReal) out.push({ k: 'grupo', tipo, grupo, ris: items.map(i => i.ri) })
    for (const { ri, cat } of items) out.push({ k: 'cat', tipo, ri, cat })
  }
  return out
}

/** Soma do grupo num mês. */
export function somaDoGrupo(l: Extract<LinhaCat, { k: 'grupo' }>, cats: Cat[], mi: number) {
  return l.ris.reduce((s, ri) => s + (cats[ri]?.v[mi] ?? 0), 0)
}

/**
 * Marca um valor PREVISTO. Real fica em pé; previsto, em itálico.
 *
 * Itálico e não opacidade: sobre o azul do Planejamento, baixar a opacidade
 * derrubaria o contraste do número — e ele é texto, não elemento gráfico.
 */
export const PREVISTO: React.CSSProperties = { fontStyle: 'italic' }

/**
 * O que dizer no hover de um valor. A legenda do itálico vivia no badge da
 * âncora, que saiu por repetir o que a marcação célula a célula já diz; o
 * título mantém a convenção descobrível sem ocupar altura em três telas.
 */
export const tituloValor = (real: boolean) =>
  real ? 'Valor realizado' : 'Valor previsto'

export function calcSaldos(data: AnoData, exclCartao = false, ancora?: AncoraReal) {
  const planE = Array.from({ length: 12 }, (_, i) =>
    data.entradas.reduce((s, c) => s + c.v[i], 0))
  const planS = Array.from({ length: 12 }, (_, i) =>
    (exclCartao ? data.saidas.filter(c => c.t !== 'cartao') : data.saidas)
      .reduce((s, c) => s + c.v[i], 0))

  const fechado = (i: number) => !!ancora && i <= ancora.ateMes

  // Receitas e Despesas sao SEMPRE a soma das categorias do plano, inclusive
  // em mes fechado. Esta e uma tela de PLANEJAMENTO, e misturar realizado com
  // projetado quebrava a unica coisa que ela precisa garantir: a soma bate com
  // as categorias listadas embaixo dela. Decidido pelo Guilherme em 09/09/2026.
  //
  // Antes, mes fechado trocava o plano pela ancora nos dois totais. Quem somava
  // as categorias nao chegava no total do mes e concluia, com razao, que a
  // conta nao fechava. O realizado por categoria tem lugar proprio — o Radar e
  // a Revisao Mensal.
  const totalE = planE
  const totalS = planS

  // A realidade entra num ponto so: o SALDO INICIAL, ancorado no fechamento
  // real do mes anterior quando ele e conhecido. Dali em diante e aritmetica do
  // plano.
  const si: number[] = [], sf: number[] = []
  const siReal: boolean[] = [], sfReal: boolean[] = []
  for (let i = 0; i < 12; i++) {
    const temReal = !!ancora?.fim
    const aberturaReal = temReal && fechado(i - 1)
    const abertura = aberturaReal ? ancora!.fim!(i - 1)
      : i === 0 ? data.saldoInicialJan
      : sf[i - 1]
    si.push(abertura)
    siReal.push(aberturaReal)
    // O fechamento e SEMPRE calculado: abertura + receitas - despesas. O
    // fechamento real de agosto nao se perde — ele aparece como o saldo inicial
    // de setembro, que e onde ele pertence. Comparar "planejei fechar em X" com
    // "abri setembro em Y" e a leitura util; sobrescrever o X pelo Y apagava a
    // pergunta.
    sf.push(abertura + totalE[i] - totalS[i])
    sfReal.push(false)
  }
  return {
    totalEntradas: totalE, totalSaidas: totalS, saldoInicial: si, saldoFinal: sf,
    /**
     * Real ou previsto, celula a celula. As duas pontas de um mes podem
     * discordar: o primeiro mes aberto ABRE com o saldo real do anterior e
     * FECHA com o previsto. Sao os quatro numeros que a tela precisa nomear.
     */
    inicialReal: siReal, finalReal: sfReal,
    /**
     * Ate que mes existe fechamento real conhecido (-1 = nenhum). Nao marca
     * mais Receitas e Despesas — elas sao sempre plano —, e sim ate onde o
     * saldo inicial pode ser ancorado.
     */
    realizadoAte: ancora?.ateMes ?? -1,
  }
}

export function fmt(v: number, sempre = false) {
  if (v === 0 && !sempre) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export { parseBRL, parseValor } from '../../utils/moeda'

export function nomeFaturaCartao(nome: string, cartaoNomes: Set<string>): boolean {
  if (cartaoNomes.has(nome.toLowerCase())) return true
  const n = nome.toLowerCase()
  return n.includes('cart') && (/cr[eé]d/.test(n) || n.includes('fatura'))
}

export function corSaldo(v: number) {
  if (v < 0) return '#dc2626'
  if (v < 1000) return '#b45309'
  return '#16a34a'
}
