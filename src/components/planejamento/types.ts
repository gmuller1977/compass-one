export type Cat = { id?: string; nome: string; descricao?: string; grupo?: string; t?: string; v: number[] }

export function nomeExibicao(cat: Cat) {
  return cat.descricao ? `${cat.nome} · ${cat.descricao}` : cat.nome
}
export type AnoData = { saldoInicialJan: number; entradas: Cat[]; saidas: Cat[] }
export type Editando = { tipo: 'e' | 's'; row: number; mes: number } | null
export type ViewMode = 'grade' | 'planilha' | 'lista'
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

export function calcSaldos(data: AnoData, exclCartao = false) {
  const totalE = Array.from({ length: 12 }, (_, i) =>
    data.entradas.reduce((s, c) => s + c.v[i], 0))
  const totalS = Array.from({ length: 12 }, (_, i) =>
    (exclCartao ? data.saidas.filter(c => c.t !== 'cartao') : data.saidas)
      .reduce((s, c) => s + c.v[i], 0))
  const si: number[] = [], sf: number[] = []
  for (let i = 0; i < 12; i++) {
    const s = i === 0 ? data.saldoInicialJan : sf[i - 1]
    si.push(s); sf.push(s + totalE[i] - totalS[i])
  }
  return { totalEntradas: totalE, totalSaidas: totalS, saldoInicial: si, saldoFinal: sf }
}

export function fmt(v: number, sempre = false) {
  if (v === 0 && !sempre) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function parseBRL(s: string): number {
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
}

export function nomeFaturaCartao(nome: string, cartaoNomes: Set<string>): boolean {
  if (cartaoNomes.has(nome.toLowerCase())) return true
  const n = nome.toLowerCase()
  return n.includes('cart') && (/cr[eé]d/.test(n) || n.includes('fatura'))
}

export function corSaldo(v: number) {
  if (v < 0) return '#dc2626'
  if (v < 1000) return '#d97706'
  return '#16a34a'
}
