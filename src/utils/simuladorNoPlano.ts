import type { Categoria, PlanoAnoData, PlanoCat } from '../context/AppContext'
import { comItens, comValor, itensDoMes, novoIdItem, somaItens, type ItemPlano } from './itensPlano'

/**
 * O Simulador grava no plano como ITEM de uma categoria que já existe — a
 * compra aprovada, a parcela da dívida, o depósito da meta. Decidido com o
 * Guilherme em 13/09/2026 e feito em 06/10/2026, sobre os itens do plano:
 *
 *   1. escolher uma categoria EXISTENTE (categoria nova ficou de fora);
 *   2. SOMAR ao que já estava planejado, nunca substituir;
 *   3. desfazer é SUBTRAIR — tira só os itens daquela simulação.
 *
 * Antes, "Incluir no planejamento" criava uma linha com o nome da dívida e
 * sem categoria — que o Radar não mostra, porque linha do plano só aparece
 * com categoria ativa — e sobrescrevia o array inteiro, só do ano corrente.
 *
 * Não existe registro à parte: quem está "no plano" é descoberto lendo os
 * itens com `simulacaoId` (integracoesNoPlano). Um lugar só para discordar.
 */
export type ParcelaNoPlano = { ano: number; mes: number; valor: number }
type Planos = Record<number, PlanoAnoData | undefined>

const MEIO_CENTAVO = 0.005
const PREFIXO_BASE = 'base-'

export const novoIdSimulacao = () => `sim-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

/** Divide o total em parcelas de centavos; a última leva a sobra do arredondamento. */
export function dividirEmParcelas(total: number, n: number): number[] {
  if (n <= 0) return []
  const base = Math.floor((total / n) * 100) / 100
  const out = Array.from({ length: n }, () => base)
  out[n - 1] = Math.round((total - base * (n - 1)) * 100) / 100
  return out
}

/** Meses consecutivos a partir de um, cada um com um valor. */
export function parcelasDesde(ano: number, mes: number, valores: number[]): ParcelaNoPlano[] {
  return valores.map((valor, k) => {
    const t = mes + k
    return { ano: ano + Math.floor(t / 12), mes: ((t % 12) + 12) % 12, valor }
  })
}

const rotulo = (c: { nome: string; descricao?: string }) => (c.descricao ? `${c.nome} · ${c.descricao}` : c.nome)

/** A linha do plano daquela categoria, pela mesma regra do mergeCats: id, depois nome sem id. */
function acharLinha(saidas: PlanoCat[], cat: Categoria): number {
  const porId = saidas.findIndex(c => c.id === cat.id)
  return porId >= 0 ? porId : saidas.findIndex(c => !c.id && c.nome === cat.nome)
}

/**
 * Inclui as parcelas no plano, como itens da categoria. Mês de ano sem plano
 * não é gravado e volta em `fora` — quem chama diz isso na tela.
 */
export function incluirNoPlano(
  planos: Planos, cat: Categoria, parcelas: ParcelaNoPlano[], descricao: string, simulacaoId: string,
): { planos: Planos; gravadas: ParcelaNoPlano[]; fora: ParcelaNoPlano[] } {
  const novos: Planos = { ...planos }
  const gravadas: ParcelaNoPlano[] = [], fora: ParcelaNoPlano[] = []
  parcelas.forEach((p, k) => {
    const plano = novos[p.ano]
    if (!plano) { fora.push(p); return }
    const saidas = [...(plano.saidas ?? [])]
    let i = acharLinha(saidas, cat)
    if (i < 0) {
      saidas.push({ id: cat.id, nome: cat.nome, descricao: cat.descricao, grupo: cat.grupo, t: cat.tipoMovimento, v: Array(12).fill(0) })
      i = saidas.length - 1
    }
    const linha = saidas[i]
    const atual = linha.v[p.mes] ?? 0
    // O que já estava planejado vira o primeiro item — somar, nunca substituir.
    const existentes: ItemPlano[] = itensDoMes(linha, p.mes)
      ?? (atual > MEIO_CENTAVO ? [{ id: `${PREFIXO_BASE}${novoIdItem()}`, descricao: rotulo(linha), valor: atual }] : [])
    const item: ItemPlano = {
      id: novoIdItem(), simulacaoId, valor: p.valor,
      descricao: parcelas.length > 1 ? `${descricao} · ${k + 1} de ${parcelas.length}` : descricao,
    }
    saidas[i] = comItens(linha, [p.mes], [...existentes, item])
    novos[p.ano] = { ...plano, saidas }
    gravadas.push(p)
  })
  return { planos: novos, gravadas, fora }
}

/**
 * Tira do plano tudo o que uma simulação gravou. Desfazer é SUBTRAIR: o valor
 * do mês perde exatamente o que ela somou. Se só sobrar o item que guardava o
 * valor anterior, o detalhe some e fica o total, como antes da simulação.
 */
export function desfazerNoPlano(planos: Planos, simulacaoId: string): Planos {
  const novos: Planos = { ...planos }
  for (const [anoStr, plano] of Object.entries(planos)) {
    if (!plano) continue
    let mudou = false
    const saidas = (plano.saidas ?? []).map(linha => {
      let l = linha
      for (const [mesStr, itens] of Object.entries(linha.itens ?? {})) {
        const mes = Number(mesStr)
        const daSim = itens.filter(i => i.simulacaoId === simulacaoId)
        if (!daSim.length) continue
        mudou = true
        const resto = itens.filter(i => i.simulacaoId !== simulacaoId)
        const novoV = Math.max(0, Math.round(((l.v[mes] ?? 0) - somaItens(daSim)) * 100) / 100)
        const soBase = resto.length === 1 && resto[0].id.startsWith(PREFIXO_BASE)
        l = resto.length > 0 && !soBase && Math.abs(somaItens(resto) - novoV) < MEIO_CENTAVO
          ? comItens(l, [mes], resto)
          : comValor(l, mes, novoV)
      }
      return l
    })
    if (mudou) novos[Number(anoStr)] = { ...plano, saidas }
  }
  return novos
}

export type IntegracaoNoPlano = {
  simulacaoId: string
  /** O que foi comprado, sem o "· 1 de 6". */
  descricao: string
  categoria: string
  meses: ParcelaNoPlano[]
  total: number
}

/** O que o Simulador tem no plano hoje, lido dos próprios itens. Só itens válidos (que somam o mês). */
export function integracoesNoPlano(planos: Planos): IntegracaoNoPlano[] {
  const por = new Map<string, IntegracaoNoPlano>()
  for (const [anoStr, plano] of Object.entries(planos)) {
    if (!plano) continue
    for (const linha of plano.saidas ?? []) {
      for (const mesStr of Object.keys(linha.itens ?? {})) {
        const mes = Number(mesStr)
        for (const it of itensDoMes(linha, mes) ?? []) {
          if (!it.simulacaoId) continue
          const atual = por.get(it.simulacaoId) ?? {
            simulacaoId: it.simulacaoId, descricao: it.descricao.replace(/ · \d+ de \d+$/, ''),
            categoria: rotulo(linha), meses: [], total: 0,
          }
          atual.meses.push({ ano: Number(anoStr), mes, valor: it.valor })
          atual.total = Math.round((atual.total + it.valor) * 100) / 100
          por.set(it.simulacaoId, atual)
        }
      }
    }
  }
  return [...por.values()].map(i => ({ ...i, meses: i.meses.sort((a, b) => a.ano * 12 + a.mes - (b.ano * 12 + b.mes)) }))
}

const MESES_ABR = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const mesAno = (p: { ano: number; mes: number }) => `${MESES_ABR[p.mes]}/${p.ano}`

/** "R$ 300,00 por mês · nov/2026 a abr/2027 (6 meses)" — ou "R$ 1.800,00 em nov/2026". */
export function resumoDasParcelas(ps: ParcelaNoPlano[]): string {
  if (ps.length === 0) return ''
  if (ps.length === 1) return `${fmtBRL(ps[0].valor)} em ${mesAno(ps[0])}`
  const iguais = ps.every(p => Math.abs(p.valor - ps[0].valor) < 0.02)
  const valor = iguais ? `${fmtBRL(ps[0].valor)} por mês` : `${fmtBRL(ps.reduce((t, p) => t + p.valor, 0))} no total`
  return `${valor} · ${mesAno(ps[0])} a ${mesAno(ps[ps.length - 1])} (${ps.length} meses)`
}
