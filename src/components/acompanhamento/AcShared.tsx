// ── Paleta de cores ──────────────────────────────────────────────────
import { COR } from '../../utils/cores'
export { COR }

export const MESES_CURTOS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
export const MESES_FULL   = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

// ── Tipos ─────────────────────────────────────────────────────────────
export type Lanc = { dia: number; descricao: string; valor: number; sub: string; fonte: 'banco'|'cartao'|'dinheiro' }
export type CatReal = { total: number; totalBanc: number; totalCart: number; totalDinheiro: number; lancamentos: Lanc[] }
export type CatSel = {
  uid: string
  nome: string
  descricao?: string
  tipo: 'entrada' | 'saida'
  prev: number
  realBanc: number
  realCart: number
  realDinheiro: number
  lancamentos: Lanc[]
}

// ── Helpers ───────────────────────────────────────────────────────────
export function mkCatReal(): CatReal { return { total:0, totalBanc:0, totalCart:0, totalDinheiro:0, lancamentos:[] } }
export function fmt(v: number) { return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) }
export function diasNoMes(mes: number, ano: number) { return new Date(ano, mes+1, 0).getDate() }
export function barCor(perc: number, isEntrada?: boolean) {
  if (isEntrada) return perc >= 1 ? COR.verde : (perc >= 0.8 ? COR.amarelo : COR.textoSuave)
  if (perc > 1) return COR.vermelho
  if (perc >= 0.9) return COR.amarelo
  return COR.verde
}
/**
 * A mesma leitura de barCor, sobre fundo azul. Os tons de barCor são de fundo
 * claro e somem no azul do KpiCard; estes já são os que AcMobileView usa lá.
 *
 * A leitura é a de sempre: em receita, chegar ao planejado é bom; em despesa,
 * passar dele é ruim.
 */
export function barCorSobreAzul(perc: number, isEntrada?: boolean) {
  if (isEntrada) return perc >= 1 ? '#4ade80' : (perc >= 0.8 ? '#fbbf24' : 'rgba(255,255,255,.45)')
  if (perc > 1) return '#f87171'
  if (perc >= 0.9) return '#fbbf24'
  return '#4ade80'
}
