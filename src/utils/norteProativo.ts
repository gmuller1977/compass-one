import type { Categoria, DadosMes } from '../context/AppContext'
import type { Bussola } from './bussolaDoMes'
import { bussolaDoMes } from './bussolaDoMes'
import type { ContaAVencer } from './contasAVencer'
import type { AcaoNorte } from './contextoNorte'
import type { Deps } from './saldoConta'
import { construirRealizadoMes } from './realizadoMes'
import { nomesDeCartao, totaisDoMes } from '../components/acompanhamento/evolucaoCalcs'

/**
 * Fase C do Norte (10/10/2026): ele puxa conversa. Ao abrir a tela, o Norte
 * já diz o que importa hoje, sem pergunta e sem IA: conta atrasada, conta que
 * vence hoje ou amanhã, saldo que não cobre a semana, plano estourado, mês
 * negativo à frente e, à noite, os gastos do dia que ainda não foram lançados.
 *
 * Nada é calculado aqui: tudo sai da Bússola (`bussolaDoMes`), a mesma da
 * Início do celular. Este arquivo só escolhe e escreve.
 *
 * Os itens "importantes" acendem o selo no ícone do Norte na barra de baixo,
 * uma vez por dia: abrir a tela apaga; um item importante novo acende de novo.
 */
export type ItemDoDia = {
  /** Estável entre aberturas: é o que o selo compara com o que já foi visto. */
  id: string
  importante: boolean
  icone: string
  /** Aceita **negrito**. */
  texto: string
  /** Conta que pode ser marcada como paga dali mesmo. */
  pagar?: ContaAVencer
  acao?: AcaoNorte
}

export type ConversaDoDia = { saudacao: string; abertura: string; itens: ItemDoDia[] }

const DIAS_SEM = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const R = (v: number) => Math.abs(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const nomeConta = (c: ContaAVencer) => (c.fatura ? `Fatura ${c.nome}` : c.descricao ? `${c.nome} · ${c.descricao}` : c.nome)
const idConta = (c: ContaAVencer) => `${c.id}-${c.ano}-${c.mes}`

/** À noite o Norte pergunta pelos gastos do dia — o mesmo horário do lembrete das 21h, um pouco antes. */
export const HORA_DE_PERGUNTAR = 18

export function conversaDoDia(p: { bussola: Bussola; nome: string; hoje: Date; lancouHoje: boolean }): ConversaDoDia {
  const { bussola: b, hoje } = p
  const h = hoje.getHours()
  const saudacao = `${h >= 5 && h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'}${p.nome ? `, ${p.nome}` : ''}!`
  const itens: ItemDoDia[] = []
  const r = b.ritmo

  // Contas: atrasada, hoje, amanhã — uma linha cada, com "Marcar como paga".
  const dataDe = (c: ContaAVencer) => new Date(c.ano, c.mes, c.dia)
  const dHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const dias = (c: ContaAVencer) => Math.round((dataDe(c).getTime() - dHoje.getTime()) / 86400000)
  const resto: ContaAVencer[] = []
  for (const c of b.contas) {
    if (c.atrasada) {
      itens.push({ id: `atrasada:${idConta(c)}`, importante: true, icone: '⚠️', pagar: c,
        texto: `**${nomeConta(c)}** venceu dia ${c.dia} e ainda não está marcada como paga · ${R(c.valor)}` })
    } else if (dias(c) === 0) {
      itens.push({ id: `hoje:${idConta(c)}`, importante: true, icone: '📅', pagar: c,
        texto: `Hoje vence **${nomeConta(c)}** · ${R(c.valor)}` })
    } else if (dias(c) === 1) {
      itens.push({ id: `amanha:${idConta(c)}`, importante: true, icone: '📅', pagar: c,
        texto: `Amanhã vence **${nomeConta(c)}** · ${R(c.valor)}` })
    } else resto.push(c)
  }
  if (resto.length) {
    const ultimo = resto[resto.length - 1]
    const total = resto.reduce((t, c) => t + c.valor, 0)
    itens.push({ id: 'semana', importante: false, icone: '🗓️', acao: 'contas',
      texto: resto.length === 1
        ? `${DIAS_SEM[dataDe(ultimo).getDay()].replace(/^./, x => x.toUpperCase())} vence **${nomeConta(ultimo)}** · ${R(total)}`
        : `Até ${DIAS_SEM[dataDe(ultimo).getDay()]} vencem mais **${resto.length} contas** · ${R(total)}` })
  }

  // O saldo cobre a semana? A mesma conta da etiqueta "faltam R$ X" da Bússola.
  const aPagar = b.contas.reduce((t, c) => t + c.valor, 0)
  const cobre = aPagar <= b.saldoHoje + 0.004
  if (b.contas.length && !cobre) {
    itens.push({ id: 'nao-cobre', importante: true, icone: '💸', acao: 'contas',
      texto: `O saldo de hoje (${R(b.saldoHoje)}) não cobre as contas da semana (${R(aPagar)}): **faltam ${R(aPagar - b.saldoHoje)}**` })
  }

  // Plano do mês.
  if (r?.estado === 'passou') {
    itens.push({ id: 'passou', importante: true, icone: '🔴', acao: 'radar',
      texto: `O gasto variável **passou do plano em ${R(r.gasto - r.planejado)}**. Daqui até o fim do mês, cada gasto sai do saldo` })
  } else if (r?.estado === 'acelerado') {
    itens.push({ id: 'acelerado', importante: false, icone: '🏃', acao: 'radar',
      texto: `Você já usou ${Math.round(r.percGasto * 100)}% da variável com ${Math.round(r.percMes * 100)}% do mês. Segurando em **${R(r.porDia)} por dia**, fecha dentro` })
  }
  const e = b.estouradas[0]
  if (e) {
    itens.push({ id: `estourou:${e.nome}·${e.descricao}`, importante: false, icone: '📈', acao: 'radar',
      texto: `**${e.descricao ? `${e.nome} · ${e.descricao}` : e.nome}** ${e.semPlano ? 'teve gasto fora do plano' : 'passou do plano'}: ${R(e.excesso)}` +
        (b.estouradas.length > 1 ? ` (e mais ${b.estouradas.length - 1})` : '') })
  }

  // Mais à frente: os avisos da Bússola que nenhum item acima já disse.
  for (const a of b.avisos) {
    if (a.id === 'negativo') itens.push({ id: 'negativo', importante: true, icone: '🔮', acao: 'planejamento', texto: a.titulo })
    if (a.id === 'parcelas') itens.push({ id: 'parcelas', importante: false, icone: '🧾', acao: 'planejamento', texto: a.titulo })
  }

  // À noite: lançou os gastos de hoje?
  if (!p.lancouHoje && h >= HORA_DE_PERGUNTAR) {
    itens.push({ id: 'lancar', importante: true, icone: '✍️',
      texto: 'Ainda não vi gastos de hoje. Gastou alguma coisa? É só me dizer, por exemplo "mercado 47"' })
  }

  let abertura: string
  if (r && r.estado !== 'passou') abertura = `Ainda dá para gastar **${R(r.sobra)}**, uns ${R(r.porDia)} por dia, e o mês termina com **${b.fechamento < 0 ? '−' : ''}${R(b.fechamento)}**.`
  else abertura = `Hoje você tem **${R(b.saldoHoje)}** no banco e em dinheiro, e o mês termina com **${b.fechamento < 0 ? '−' : ''}${R(b.fechamento)}**.`
  if (b.contas.length && cobre) abertura += ' O saldo cobre as contas da semana.'
  if (!itens.length) abertura += ' Tudo em dia por aqui ✓'

  return { saudacao, abertura, itens }
}

/**
 * Lançou alguma coisa hoje? A regra do lembrete das 21h (lancouNoDia, na
 * função lembrete-diario), sobre os dados do aparelho: no extrato o dia é a
 * chave do mês; na fatura vale a data da COMPRA, que pode ter ido para a
 * fatura seguinte.
 */
export function lancouHoje(extratoData: Record<string, DadosMes>, faturaData: Record<string, unknown>, hoje: Date): boolean {
  const ano = hoje.getFullYear(), mes = hoje.getMonth(), dia = hoje.getDate()
  const sufixo = `-${ano}-${String(mes + 1).padStart(2, '0')}`
  for (const [k, dm] of Object.entries(extratoData)) {
    if (k.endsWith(sufixo) && (dm?.lancamentos?.[dia]?.length ?? 0) > 0) return true
  }
  for (const v of Object.values(faturaData)) {
    const l = (v as { lancamentos?: Record<string, { diaCompra?: number; mesCompra?: number; anoCompra?: number }[]> } | null)?.lancamentos
    if (l && Object.values(l).some(itens => itens?.some(x => x.diaCompra === dia && x.mesCompra === mes && x.anoCompra === ano))) return true
  }
  return false
}

/**
 * A Bússola de hoje, guardada: a barra de baixo é montada de novo em cada tela
 * do celular, e a conta da série do plano não precisa ser refeita a cada troca.
 * Chave pela identidade dos dados do contexto — mudou um lançamento, refaz.
 */
let guardada: { chave: unknown[]; valor: Bussola } | null = null
export function bussolaDeHoje(deps: Deps, categorias: Categoria[], hoje: Date): Bussola {
  const chave = [deps.extratoData, deps.faturaData, deps.contas, deps.categorias, deps.planos, deps.saldoInicialDinheiro, deps.cenarioPrevisao, hoje.toDateString()]
  if (guardada && guardada.chave.length === chave.length && guardada.chave.every((x, i) => x === chave[i])) return guardada.valor
  const ano = hoje.getFullYear(), mes = hoje.getMonth()
  const planoAno = deps.planos[ano]
  const { saidasMap, entradasMap } = construirRealizadoMes({
    ano, mes, extratoData: deps.extratoData as Record<string, DadosMes>,
    faturaData: deps.faturaData, contas: deps.contas, categorias, planoAno,
  })
  const t = totaisDoMes({ mes, planoAno, categorias, cartaoNomes: nomesDeCartao(deps.contas), entradasMap, saidasMap })
  const temPlano = !!planoAno && [...(planoAno.saidas ?? []), ...(planoAno.entradas ?? [])].some(c => c.v.some(v => v > 0))
  const valor = bussolaDoMes({ deps, linhasSaida: t.saida.linhas, categorias, usaPlanoNoMes: temPlano && t.saida.prev > 0, hoje })
  guardada = { chave, valor }
  return valor
}

/** O que já foi visto hoje, por usuário, no aparelho. */
const chaveVisto = (uid: string) => `compass-norte-visto-${uid}`
const diaIso = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`

export function itensNaoVistos(itens: ItemDoDia[], visto: string | null, hoje: Date): number {
  const [dia, ids] = (visto ?? '').split('|')
  const vistos = dia === diaIso(hoje) ? new Set((ids ?? '').split(',')) : new Set<string>()
  return itens.filter(i => i.importante && !vistos.has(i.id)).length
}

export function lerVisto(uid: string): string | null {
  try { return localStorage.getItem(chaveVisto(uid)) } catch { return null }
}

export function marcarVisto(uid: string, itens: ItemDoDia[], hoje: Date) {
  try {
    localStorage.setItem(chaveVisto(uid), `${diaIso(hoje)}|${itens.map(i => i.id).join(',')}`)
    window.dispatchEvent(new Event('compass-norte-visto'))
  } catch { /* só o selo fica aceso */ }
}
