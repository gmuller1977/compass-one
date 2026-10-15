import type { Conta } from '../context/AppContext'
import type { Opcao } from './comparativoCompra'
import { compararOpcoes } from './comparativoCompra'
import { parseValor } from './moeda'
import {
  parcelasQueOPlanoCobre, simularCompraSobre, type SerieDoPlano,
} from './simulacaoCompra'
import type { Deps } from './saldoConta'

/**
 * Simulações de COMPRA salvas (pedido do Guilherme em 15/10/2026): o que se
 * quer comprar, DE QUEM, e o formulário inteiro para reabrir. Moram na mesma
 * tabela `simulacoes` da Dívida e da Meta, com `tipo: 'compra'`, `fornecedor`
 * e `detalhes` (migração 019).
 *
 * A comparação entre lojas NÃO usa o veredito gravado: cada salva é julgada de
 * novo contra o plano de HOJE, pela mesma `compararOpcoes` da tabela. Um "cabe"
 * guardado de três semanas atrás mentiria depois de qualquer lançamento.
 */
export interface DetalhesCompra {
  modo: 'parcelada' | 'mensal'
  valor: string
  opcoes: Opcao[]
  escolhida: string | null
  cartaoId: string
  /** AAAA-MM-DD */
  data: string
  mensal: string
  meses: string
  guardar: string
}

export interface CompraSalva {
  id: string
  nome: string
  fornecedor: string | null
  valor_total: number
  parcela: number
  resultado_meses: number
  integrado_planejamento: boolean
  created_at: string
  detalhes: DetalhesCompra | null
}

/** "Bicicleta", "bicicleta " e "Bicícleta" são o mesmo item. */
export const chaveDoItem = (nome: string) =>
  nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

export interface GrupoDeItem { chave: string; nome: string; sims: CompraSalva[] }

/** Agrupa pelo item; o grupo mais recente primeiro. */
export function agruparPorItem(sims: CompraSalva[]): GrupoDeItem[] {
  const grupos = new Map<string, GrupoDeItem>()
  const ordenadas = [...sims].sort((a, b) => b.created_at.localeCompare(a.created_at))
  for (const s of ordenadas) {
    const chave = chaveDoItem(s.nome)
    const g = grupos.get(chave)
    if (g) g.sims.push(s)
    else grupos.set(chave, { chave, nome: s.nome, sims: [s] })
  }
  return [...grupos.values()]
}

export interface Avaliacao {
  /** Preço à vista (linha de 1×). `null` sem ela. */
  aVista: number | null
  /** A forma que a tela recomendaria hoje — a mais barata entre as que cabem. */
  melhor: { parcelas: number; valorParcela: number; total: number; cabe: boolean } | null
  mensal: boolean
}

const dataDe = (iso: string, hoje: Date) => {
  const [a, m, d] = iso.split('-').map(Number)
  const h0 = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const dt = a && m && d ? new Date(a, m - 1, d) : h0
  // Simulação de uma data que já passou é julgada como compra de hoje.
  return isNaN(dt.getTime()) || dt < h0 ? h0 : dt
}

export function avaliarSalva(
  s: CompraSalva, serie: SerieDoPlano, contas: Conta[], planos: Deps['planos'], hoje: Date,
): Avaliacao | null {
  const det = s.detalhes
  if (!det) return null
  const dt = dataDe(det.data, hoje)
  const alvo = { ano: dt.getFullYear(), mes: dt.getMonth(), dia: dt.getDate(), cartaoId: det.cartaoId || undefined }
  const teto = parcelasQueOPlanoCobre(planos, alvo, contas)
  // O "cabe" é não ficar no vermelho; o guardar por mês é régua da meta.
  const piso = 0

  if (det.modo === 'mensal') {
    const valor = parseValor(det.mensal) ?? 0
    const meses = Math.min(teto, parseInt(det.meses, 10) || teto)
    if (valor <= 0 || meses <= 0) return null
    const r = simularCompraSobre(serie, { ...alvo, valorTotal: valor * meses, parcelas: meses }, contas, { piso })
    return { aVista: null, mensal: true, melhor: { parcelas: meses, valorParcela: valor, total: valor * meses, cabe: r.cabe } }
  }

  const linhas = compararOpcoes(det.opcoes, { serie, contas, alvo, teto, piso })
  const aVista = linhas.find(l => l.opcao.parcelas === 1 && l.total > 0)?.total ?? null
  const julgadas = linhas.filter(l => l.veredito)
  const l = linhas.find(x => x.recomendada)
    ?? [...julgadas].sort((a, b) => a.total - b.total)[0]
  return {
    aVista, mensal: false,
    melhor: l ? { parcelas: l.opcao.parcelas, valorParcela: l.opcao.valorParcela, total: l.total, cabe: !!l.veredito?.cabe } : null,
  }
}

/**
 * A melhor oferta do grupo: o menor total entre as que cabem; nenhuma cabendo,
 * o menor total. Só faz sentido com duas lojas ou mais.
 */
export function melhorOferta(avaliadas: { id: string; av: Avaliacao | null }[]): string | null {
  const validas = avaliadas.filter(x => x.av?.melhor)
  if (validas.length < 2) return null
  const cabem = validas.filter(x => x.av!.melhor!.cabe)
  const pool = cabem.length ? cabem : validas
  return pool.reduce((a, b) => (b.av!.melhor!.total < a.av!.melhor!.total ? b : a)).id
}
