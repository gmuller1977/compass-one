import React from 'react'

// ── Paleta de cores ──────────────────────────────────────────────────
import { COR } from '../../utils/cores'
export { COR }

// ── Tipos ─────────────────────────────────────────────────────────────
export type TipoLanc = 'entrada' | 'saida'
export type FormaPag = 'credito'

export type Lancamento = {
  id: string; tipo: TipoLanc
  descricao: string; categoria: string
  subCategoria?: string
  valor: number; formaPagamento: FormaPag
  tipoLanc: 'fixa'|'variavel'
  consolidado?: boolean
  parcelas?: number
  parcelaAtual?: number
  diaCompra?: number; mesCompra?: number; anoCompra?: number
}

export type DadosMes = {
  lancamentos: Record<number, Lancamento[]>
  faturaAtual: string
  faturaAtualData?: string
  fechamentoOverride?: number
  vencimentoOverride?: number
  fixasConsolidadas?: Record<string, boolean>
  fixasMovidas?: Record<string, number>
  fixasValorOverride?: Record<string, number>
  fixasDescOverride?: Record<string, string>
  fixasPagOverride?: Record<string, FormaPag>
}

// ── Categoria + variante ──────────────────────────────────────────────
// O select de categoria carrega a variante junto (nome||variante), igual ao
// do extrato. Antes o select era so pelo nome e a variante dependia de um
// segundo campo que so aparecia com 2+ variantes — com uma variante so, ela
// nunca era gravada nem exibida.
type CatLike = { nome: string; descricao?: string }

export const catOptValue = (c: CatLike) =>
  c.descricao?.trim() ? `${c.nome}||${c.descricao.trim()}` : c.nome
export const catOptLabel = (c: CatLike) =>
  c.descricao?.trim() ? `${c.nome} · ${c.descricao.trim()}` : c.nome

export function parseCatOpt(v: string): { nome: string; variante: string } {
  const i = v.indexOf('||')
  return i === -1 ? { nome: v, variante: '' } : { nome: v.slice(0, i), variante: v.slice(i + 2) }
}

/** Rotulo do lancamento: "Seguro · Civic" quando ha variante. */
export const lancLabel = (l: { categoria: string; subCategoria?: string }) =>
  l.subCategoria?.trim() ? `${l.categoria} · ${l.subCategoria.trim()}` : l.categoria

// ── Constantes ────────────────────────────────────────────────────────
export const DADOS_MES_VAZIO: DadosMes = { lancamentos:{}, faturaAtual:'' }

export const NOMES_MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

// ── Funções auxiliares ────────────────────────────────────────────────
export function diasNoMes(mes: number, ano: number) { return new Date(ano, mes+1, 0).getDate() }

export function diaSemana(d: number, m: number, a: number) {
  return ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][new Date(a,m,d).getDay()]
}

export function mesKey(conta: string, ano: number, mes: number) {
  return `${conta}-${ano}-${String(mes+1).padStart(2,'0')}`
}

export function fmt(v: number) { return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) }

export function parseBRL(s: string) { return parseFloat(s.replace(/[R$\s.]/g,'').replace(',','.')) || 0 }

export function parseDateFatura(s: string, mesDefault: number, anoDefault: number): {dia:number;mes:number;ano:number}|null {
  const t = s.trim()
  if (!t) return null
  if (t.includes('/')) {
    const p = t.split('/')
    const dia = parseInt(p[0]) || 0
    const mes = p.length > 1 ? (parseInt(p[1]) || 0) : mesDefault + 1
    let ano = anoDefault
    if (p.length > 2 && p[2]) { const y = parseInt(p[2]) || 0; ano = y > 0 ? (y < 100 ? 2000+y : y) : anoDefault }
    return dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12 ? { dia, mes: mes-1, ano } : null
  }
  const d = t.replace(/\D/g, '')
  if (d.length <= 2) { const dia=parseInt(d); return dia>=1&&dia<=31 ? {dia,mes:mesDefault,ano:anoDefault} : null }
  if (d.length === 4) { const dia=parseInt(d.slice(0,2)),mes=parseInt(d.slice(2,4)); return dia>=1&&dia<=31&&mes>=1&&mes<=12 ? {dia,mes:mes-1,ano:anoDefault} : null }
  if (d.length === 6) { const dia=parseInt(d.slice(0,2)),mes=parseInt(d.slice(2,4)),y=parseInt(d.slice(4,6)); return dia>=1&&dia<=31&&mes>=1&&mes<=12 ? {dia,mes:mes-1,ano:2000+y} : null }
  if (d.length === 8) { const dia=parseInt(d.slice(0,2)),mes=parseInt(d.slice(2,4)),ano=parseInt(d.slice(4,8)); return dia>=1&&dia<=31&&mes>=1&&mes<=12 ? {dia,mes:mes-1,ano} : null }
  return null
}

// ── Focus helpers ─────────────────────────────────────────────────────
export function realcarFoco(e: React.FocusEvent<HTMLElement>) {
  e.currentTarget.style.border = `1.5px solid ${COR.azul}`
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,86,219,0.15)'
}

export function removerRealce(e: React.FocusEvent<HTMLElement>) {
  e.currentTarget.style.border = '1.5px solid #bae6fd'
  e.currentTarget.style.boxShadow = 'none'
}
