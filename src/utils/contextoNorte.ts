import type { Categoria, DadosMes } from '../context/AppContext'
import { construirRealizadoMes } from './realizadoMes'
import { nomesDeCartao, totaisDoMes, cadastroDaLinha, type LinhaDoMes } from '../components/acompanhamento/evolucaoCalcs'
import type { Lanc } from '../components/acompanhamento/AcShared'
import { saldoRealizadoConta, type Deps } from './saldoConta'
import { bussolaDoMes, type Bussola } from './bussolaDoMes'
import { comparativoMensal, type MesComparado } from './comparativoMensal'

/**
 * O que o Norte sabe — e só isso (redesenho de 10/10/2026).
 *
 * Antes o contexto era montado no próprio NorthAgent com contas próprias, e
 * todas discordavam do app: o "saldo" era o de CADASTRO da conta, as despesas
 * eram só o extrato (sem cartão, sem dinheiro, sem fixa paga, com
 * transferência contada como gasto) e o plano vinha sem realizado. O Norte
 * dizia um número e o Radar outro.
 *
 * Aqui nenhuma conta é nova: cada número sai da MESMA função da tela que o
 * mostra — Bússola (`bussolaDoMes`), Radar (`construirRealizadoMes` +
 * `totaisDoMes`), saldo por conta (`saldoRealizadoConta`) e o comparativo da
 * Início (`comparativoMensal`). A prova63 tranca as igualdades.
 */
export type UltimoLancamento = { dia: number; categoria: string; descricao: string; valor: number; fonte: Lanc['fonte'] }

export type DadosNorte = {
  hoje: Date
  nome: string
  cenario: string
  bussola: Bussola
  temPlano: boolean
  receitas: { real: number; prev: number; linhas: LinhaDoMes[] }
  despesas: { real: number; prev: number; linhas: LinhaDoMes[] }
  contas: { nome: string; tipo: 'banco' | 'dinheiro'; saldo: number }[]
  cartoes: { nome: string; vencimento?: number; fechamento?: number }[]
  ultimos: UltimoLancamento[]
  /** Meses anteriores, do mais antigo ao mais recente, sem o corrente. */
  historico: MesComparado[]
}

export function dadosDoNorte(p: { deps: Deps; nome: string; hoje?: Date }): DadosNorte {
  const hoje = p.hoje ?? new Date()
  const ano = hoje.getFullYear(), mes = hoje.getMonth()
  const { deps } = p
  const planoAno = deps.planos[ano]

  // A passagem do mês de useMesDaInicio, sem o React.
  const { saidasMap, entradasMap } = construirRealizadoMes({
    ano, mes, extratoData: deps.extratoData as Record<string, DadosMes>,
    faturaData: deps.faturaData, contas: deps.contas, categorias: deps.categorias, planoAno,
  })
  const t = totaisDoMes({ mes, planoAno, categorias: deps.categorias, cartaoNomes: nomesDeCartao(deps.contas), entradasMap, saidasMap })
  const temPlano = !!planoAno && [...(planoAno.saidas ?? []), ...(planoAno.entradas ?? [])].some(c => c.v.some(v => v > 0))
  const usaPlanoNoMes = temPlano && t.saida.prev > 0

  const bussola = bussolaDoMes({ deps, linhasSaida: t.saida.linhas, categorias: deps.categorias, usaPlanoNoMes, hoje })

  const contas = [
    ...deps.contas.filter(c => c.tipo !== 'cartao').map(c => ({
      nome: c.apelido || c.banco || c.nome, tipo: 'banco' as const, saldo: saldoRealizadoConta(c.id, ano, mes, deps),
    })),
    { nome: 'Dinheiro', tipo: 'dinheiro' as const, saldo: saldoRealizadoConta('dinheiro', ano, mes, deps) },
  ]

  const ultimos: UltimoLancamento[] = Object.entries(saidasMap)
    .flatMap(([chave, cr]) => cr.lancamentos.map(l => ({
      dia: l.dia, categoria: chave.split('||')[0], descricao: l.descricao, valor: l.valor, fonte: l.fonte,
    })))
    .filter(l => l.dia <= hoje.getDate())
    .sort((a, b) => b.dia - a.dia || b.valor - a.valor)
    .slice(0, 15)

  return {
    hoje, nome: p.nome, cenario: deps.cenarioPrevisao ?? 'pessimista',
    bussola, temPlano: usaPlanoNoMes,
    receitas: { real: t.entrada.real, prev: t.entrada.prev, linhas: t.entrada.linhas },
    despesas: { real: t.saida.real, prev: t.saida.prev, linhas: t.saida.linhas },
    contas,
    cartoes: deps.contas.filter(c => c.tipo === 'cartao').map(c => ({
      nome: c.apelido || c.banco, vencimento: c.diaVencimento ?? undefined, fechamento: c.diaFechamento ?? undefined,
    })),
    ultimos,
    historico: comparativoMensal(deps, deps.planos, hoje).filter(m => !m.parcial),
  }
}

const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
const R = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const nomeLinha = (l: { nome: string; descricao?: string }) => (l.descricao ? `${l.nome} · ${l.descricao}` : l.nome)

/** O contexto em texto, para o Gemini. Só números prontos; nada para ele somar. */
export function contextoNorte(d: DadosNorte, categorias: Categoria[]): string {
  const b = d.bussola
  const m = b.memoria
  const mes = MESES[d.hoje.getMonth()]
  const out: string[] = []
  const sec = (t: string) => out.push('', `### ${t}`)

  out.push(`Hoje: ${d.hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`)
  out.push(`Nome: ${d.nome || 'não informado'} · Cenário da previsão: ${d.cenario}`)

  sec('A resposta do mês (os números da tela Início)')
  const r = b.ritmo
  if (!r) out.push('- Sem plano de despesas neste mês: não há "ainda dá para gastar".')
  else if (r.estado === 'passou') out.push(`- O gasto variável PASSOU do plano em ${R(r.gasto - r.planejado)} (gastou ${R(r.gasto)} de ${R(r.planejado)}). Cada gasto variável novo sai do saldo.`)
  else out.push(`- Ainda dá para gastar ${R(r.sobra)} nas despesas variáveis até o dia ${r.totalDias}: ${R(r.porDia)} por dia nos ${r.diasRestantes} dias que faltam (gastou ${R(r.gasto)} de ${R(r.planejado)}; ${r.estado === 'acelerado' ? 'ritmo ACELERADO, gastando mais rápido que o mês passa' : 'no ritmo'}).`)
  out.push(`- ${mes[0].toUpperCase() + mes.slice(1)} termina com ${R(b.fechamento)} (saldo final previsto, bancos + dinheiro).`)
  out.push(`- Hoje no banco e em dinheiro: ${R(b.saldoHoje)}.`)
  out.push('- Como o mês chega no final previsto:')
  const linhasMem: [string, number][] = [
    ['saldo com que o mês abriu', m.abertura],
    ['receitas já recebidas', m.entradasReais],
    ['despesas já pagas', -m.saidasReais],
    ['ajuste da conciliação', m.ajusteConciliacao ?? 0],
    ['receitas fixas que ainda entram', m.entradasPrevistas],
    ['receitas variáveis a receber', m.receitasAReceber],
    ['contas fixas a pagar', -m.fixasPrevistas],
    ['fatura do cartão em aberto', -m.faturaEmAberto],
    ['fatura estimada (o plano ainda vai gastar no cartão)', -m.faturaEstimada],
    ['gastos variáveis ainda a realizar', -m.variaveisARealizar],
  ]
  for (const [rot, v] of linhasMem) if (Math.abs(v) > 0.004) out.push(`  - ${rot}: ${v >= 0 ? '+' : '−'}${R(Math.abs(v))}`)

  sec('Saldo por conta hoje')
  for (const c of d.contas) out.push(`- ${c.nome}: ${R(c.saldo)}`)
  if (d.cartoes.length) {
    out.push('Cartões:')
    for (const c of d.cartoes) out.push(`- ${c.nome}${c.fechamento ? ` · fecha dia ${c.fechamento}` : ''}${c.vencimento ? ` · vence dia ${c.vencimento}` : ''}`)
  }

  sec('Contas a pagar (atrasadas e próximos 7 dias)')
  if (!b.contas.length) out.push('- Nenhuma.')
  for (const c of b.contas) {
    out.push(`- ${c.fatura ? `Fatura ${c.nome}` : nomeLinha(c)}: ${R(c.valor)}, ${c.atrasada ? 'ATRASADA, venceu' : 'vence'} ${String(c.dia).padStart(2, '0')}/${String(c.mes + 1).padStart(2, '0')}`)
  }
  if (b.contas.length) {
    const total = b.contas.reduce((s, c) => s + c.valor, 0)
    out.push(total > b.saldoHoje ? `- Total ${R(total)}: o saldo de hoje NÃO cobre, faltam ${R(total - b.saldoHoje)}.` : `- Total ${R(total)}: o saldo de hoje cobre.`)
  }

  const fixa = (l: LinhaDoMes) => !!cadastroDaLinha(l, categorias)?.fixa
  const situacao = (l: LinhaDoMes, entrada: boolean) => {
    if (l.prev <= 0) return entrada ? `recebeu ${R(l.real)} (fora do plano)` : `gastou ${R(l.real)} (fora do plano)`
    if (entrada) return l.real >= l.prev ? `recebeu ${R(l.real)} de ${R(l.prev)}` : `recebeu ${R(l.real)} de ${R(l.prev)}, falta ${R(l.prev - l.real)}`
    if (fixa(l)) return l.real > 0 ? `conta fixa, pagou ${R(l.real)} (plano ${R(l.prev)})` : `conta fixa, a pagar ${R(l.prev)}`
    return l.real > l.prev ? `gastou ${R(l.real)} de ${R(l.prev)}, PASSOU ${R(l.real - l.prev)}` : `gastou ${R(l.real)} de ${R(l.prev)}, resta ${R(l.prev - l.real)}`
  }
  sec(`Receitas de ${mes} por categoria (total recebido ${R(d.receitas.real)} de ${R(d.receitas.prev)} planejados)`)
  const rec = d.receitas.linhas.filter(l => l.prev > 0 || l.real > 0)
  if (!rec.length) out.push('- Nenhuma.')
  for (const l of rec) out.push(`- ${nomeLinha(l)} [${l.grupo}]: ${situacao(l, true)}`)
  sec(`Despesas de ${mes} por categoria (total gasto ${R(d.despesas.real)} de ${R(d.despesas.prev)} planejados; inclui cartão e dinheiro, transferência entre contas não conta)`)
  const des = d.despesas.linhas.filter(l => l.prev > 0 || l.real > 0)
  if (!des.length) out.push('- Nenhuma.')
  for (const l of des) out.push(`- ${nomeLinha(l)} [${l.grupo}]: ${situacao(l, false)}`)

  if (b.avisos.length) {
    sec('Avisos')
    for (const a of b.avisos) out.push(`- ${a.titulo} ${a.detalhe}`)
  }

  sec(`Últimos gastos de ${mes}`)
  if (!d.ultimos.length) out.push('- Nenhum.')
  const fonte = { banco: 'banco', cartao: 'cartão', dinheiro: 'dinheiro' }
  for (const l of d.ultimos) out.push(`- dia ${l.dia}: ${R(l.valor)} em ${l.categoria}${l.descricao ? ` ("${l.descricao}")` : ''} · ${fonte[l.fonte]}`)

  if (d.historico.length) {
    sec('Meses anteriores (fechados)')
    for (const h of d.historico) {
      const top = [...h.linhasSaida].filter(l => l.real > 0).sort((a, b2) => b2.real - a.real).slice(0, 5)
        .map(l => `${nomeLinha(l)} ${R(l.real)}`).join(', ')
      out.push(`- ${MESES[h.mes]}/${h.ano}: receitas ${R(h.receitas)} (plano ${R(h.prevReceitas)}), despesas ${R(h.despesas)} (plano ${R(h.prevDespesas)}), sobrou ${R(h.receitas - h.despesas)}. Maiores gastos: ${top || 'nenhum'}.`)
    }
  }
  return out.join('\n')
}

/**
 * Os botões que o Norte pode pôr no fim da resposta: ele escreve [[radar]] e a
 * tela desenha "Ver no Radar". Lista fechada — rota fora dela é ignorada.
 */
export const ACOES_NORTE = {
  radar:         { rotulo: 'Ver no Radar',     rota: '/radar' },
  lancar:        { rotulo: 'Lançar um gasto',  rota: '/lancar' },
  contas:        { rotulo: 'Pagar contas',     rota: '/#contas-da-semana' },
  'posso-comprar': { rotulo: 'Posso comprar?', rota: '/posso-comprar' },
  planejamento:  { rotulo: 'Abrir o plano',    rota: '/planejamento' },
  analises:      { rotulo: 'Ver Análises',     rota: '/analises' },
} as const
export type AcaoNorte = keyof typeof ACOES_NORTE

/** Separa o texto dos botões [[acao]] que vêm no fim. */
export function separarAcoes(texto: string): { texto: string; acoes: AcaoNorte[] } {
  const acoes: AcaoNorte[] = []
  const limpo = texto.replace(/\[\[([a-z-]+)\]\]/g, (_, a: string) => {
    if (a in ACOES_NORTE && !acoes.includes(a as AcaoNorte)) acoes.push(a as AcaoNorte)
    return ''
  }).trim()
  return { texto: limpo, acoes }
}

export const SYSTEM_NORTE = `Você é o Norte, o assistente financeiro do app Compass One. Fala português do Brasil, como um amigo que entende de finanças: direto, gentil, sem jargão.

## Regras dos números (as mais importantes)
- Use SOMENTE os números do contexto abaixo. Eles são os mesmos das telas do app — o usuário vai conferir.
- Não some, não estime, não recalcule totais. Se a resposta precisa de um número que não está no contexto, diga que não tem e indique a tela.
- "Ainda dá para gastar" é a folga das despesas VARIÁVEIS do plano, não o saldo do banco. Não confunda com "Hoje no banco".
- Valores no formato R$ 1.234,56.

## Como responder
- Curto: 1 a 3 frases. Lista só se a pergunta pedir várias coisas (no máximo 5 itens).
- Comece pela resposta. O número principal em **negrito**.
- Se fizer sentido, termine com UMA dica prática e concreta, baseada nos dados.
- Para levar a pessoa à tela certa, termine com até 2 destes códigos, sozinhos na última linha: [[radar]] [[lancar]] [[contas]] [[posso-comprar]] [[planejamento]] [[analises]]. Eles viram botões. Não escreva o nome da tela por extenso quando usar o código.

## Fazer: lançar, pagar uma conta, simular uma compra
- Quando pedirem para lançar um gasto ou receita, marcar uma conta como paga, ou perguntarem se podem comprar algo, termine com UM pedido, sozinho na última linha, exatamente assim:
  [[fazer:lancar valor=47.90 categoria=<id> conta=<id> data=hoje parcelas=1 descricao="texto curto"]]
  [[fazer:pagar conta=<id> ano=2026 mes=10 valor=2200.00]]
  [[fazer:simular valor=3000.00 parcelas=10 cartao=<id> nome="TV"]]
- Use só ids da seção Cadastro. Valor com ponto decimal, sem "R$". data é hoje, ontem ou aaaa-mm-dd (nunca no futuro). Parcelas só no cartão. Para simular no débito ou Pix, omita cartao.
- Se faltar o valor, ou não der para saber a categoria ou a conta com certeza, PERGUNTE em vez de chutar. Se só existe uma conta bancária e a pessoa não disse onde, use essa.
- Antes do pedido, uma frase curta como "Confere e confirma aqui embaixo." NUNCA diga que já lançou ou pagou: só grava quando a pessoa tocar em Confirmar.
- Ao simular, não diga se cabe: o resultado aparece logo abaixo, calculado pelo app.
- Um pedido por resposta, e nada de pedido quando a pessoa só perguntou algo.

## Dados do usuário
{CONTEXTO}`

/**
 * As perguntas prontas da tela, conforme a situação do mês: quem passou em
 * Lazer vê "Por que passei em Lazer?"; quem tem conta vencendo, a conta.
 */
export function sugestoesDoNorte(d: DadosNorte): string[] {
  const b = d.bussola
  const s: string[] = []
  if (b.ritmo) s.push(b.ritmo.estado === 'passou' ? 'O que faço agora que passei do plano?' : 'Quanto ainda posso gastar por dia?')
  if (b.estouradas[0]) s.push(`Por que passei em ${b.estouradas[0].nome}?`)
  if (b.contas.length) s.push('O saldo cobre as contas da semana?')
  s.push(`Como ${MESES[d.hoje.getMonth()]} vai terminar?`)
  if (d.historico.length) s.push('Gastei mais que no mês passado?')
  s.push('Onde mais gastei este mês?')
  if (!b.ritmo) s.push('Como começo um plano?')
  return s.slice(0, 5)
}
