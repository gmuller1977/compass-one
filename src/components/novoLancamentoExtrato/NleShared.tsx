import { useState, useEffect } from 'react'
import React from 'react'

// ── Paleta de cores ──────────────────────────────────────────────────
import { COR } from '../../utils/cores'
export { COR }

// ── Tipos ─────────────────────────────────────────────────────────────
export type TipoLanc = 'entrada' | 'saida'
export type FormaPag = 'debito' | 'automatico' | 'credito' | 'pix' | 'transferencia' | 'dinheiro' | 'boleto' | 'manual'

export type CatFixa = {
  id: string; nome: string; categoria: string
  subtitulo?: string
  descricao?: string
  valor: number; tipo: TipoLanc
  formaPagamento: FormaPag
  diaVencimento: number
  ehFaturaCartao?: boolean
}

export type Lancamento = {
  id: string; tipo: TipoLanc
  descricao: string; categoria: string
  subCategoria?: string
  valor: number; formaPagamento: FormaPag
  tipoLanc: 'fixa'|'variavel'
  consolidado?: boolean
}

export type DadosMes = {
  lancamentos: Record<number, Lancamento[]>
  saldoBanco: string
  saldoBancoData?: string
  fixasConsolidadas?: Record<string, boolean>
  fixasMovidas?: Record<string, number>
  fixasValorOverride?: Record<string, number>
  fixasDescOverride?: Record<string, string>
  fixasPagOverride?: Record<string, FormaPag>
}

// ── Constantes ────────────────────────────────────────────────────────
export const NOMES_MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
export const DIAS_SEM    = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

export const FORMAS_SAI: { id: FormaPag; label: string }[] = [
  { id:'debito',        label:'Débito'        },
  { id:'dinheiro',      label:'Dinheiro'      },
  { id:'pix',           label:'Pix'           },
  { id:'transferencia', label:'Transferência' },
]
export const FORMAS_ENT: { id: FormaPag; label: string }[] = [
  { id:'dinheiro',      label:'Dinheiro'      },
  { id:'pix',           label:'Pix'           },
  { id:'transferencia', label:'Transferência' },
]

// ── Funções auxiliares ────────────────────────────────────────────────
export function ehFimDeSemana(dia: number, mes: number, ano: number) {
  const dow = new Date(ano, mes, dia).getDay()
  return dow === 0 || dow === 6
}
export function diaUtilOuProximo(dia: number, mes: number, ano: number, totalDias: number) {
  let d = dia
  while (d <= totalDias && ehFimDeSemana(d, mes, ano)) d++
  return Math.min(d, totalDias)
}
export function diaEfetivoFixa(
  f: CatFixa, overrides: Record<string, number> | undefined,
  automatico: boolean, mes: number, ano: number, totalDias: number,
) {
  const override = overrides?.[f.id]
  if (override !== undefined) return override
  if (automatico) return diaUtilOuProximo(f.diaVencimento, mes, ano, totalDias)
  return f.diaVencimento
}

export function realcarFoco(e: React.FocusEvent<HTMLElement>) {
  e.currentTarget.style.border = `1.5px solid ${COR.azul}`
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,86,219,0.15)'
}
export function removerRealce(e: React.FocusEvent<HTMLElement>) {
  e.currentTarget.style.border = '1.5px solid #bae6fd'
  e.currentTarget.style.boxShadow = 'none'
}
export function fmt(v: number) { return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) }
export function parseBRL(s: string) { return parseFloat(s.replace(/[R$\s.]/g,'').replace(',','.')) || 0 }
export function diasNoMes(mes: number, ano: number) { return new Date(ano, mes+1, 0).getDate() }
export function diaSemana(d: number, m: number, a: number) { return DIAS_SEM[new Date(a,m,d).getDay()] }
export function mesKey(conta: string, ano: number, mes: number) {
  return `${conta}-${ano}-${String(mes+1).padStart(2,'0')}`
}
export function formaPagCategoria(fp: string | undefined, mov: string | undefined): FormaPag {
  if (mov === 'dinheiro') return 'dinheiro'
  if (fp === 'pix') return 'pix'
  if (fp === 'transferencia') return 'transferencia'
  if (fp === 'boleto') return 'boleto'
  if (fp === 'manual') return 'manual'
  if (fp === 'debito') return 'debito'
  if (fp === 'automatico') return 'automatico'
  return 'debito'
}
export function formaRecebCategoria(fp: string | undefined, mov: string | undefined): FormaPag {
  if (mov === 'dinheiro') return 'dinheiro'
  if (fp === 'pix') return 'pix'
  if (fp === 'transferencia') return 'transferencia'
  return 'pix'
}
export function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
}

// ── BadgePag ──────────────────────────────────────────────────────────
export function BadgePag({ fp }: { fp: FormaPag }) {
  const map: Record<FormaPag,{bg:string;cor:string;label:string}> = {
    debito:        {bg:'#fef9c3',cor:'#92400e', label:'Débito'},
    automatico:    {bg:'#fef9c3',cor:'#92400e', label:'Débito Automático'},
    credito:       {bg:'#eff6ff',cor:'#1a56db', label:'Crédito'},
    pix:           {bg:'#d1fae5',cor:'#065f46', label:'PIX'},
    transferencia: {bg:'#e0f2fe',cor:'#0369a1', label:'Transferência'},
    dinheiro:      {bg:'#f1f5f9',cor:'#475569', label:'Dinheiro'},
    boleto:        {bg:'#fce7f3',cor:'#9d174d', label:'Boleto'},
    manual:        {bg:'#ede9fe',cor:'#6d28d9', label:'Manual'},
  }
  const s = map[fp]
  if (!s) return null
  return <span style={{fontSize:9,padding:'1px 5px',borderRadius:3,fontWeight:700,background:s.bg,color:s.cor}}>{s.label}</span>
}
