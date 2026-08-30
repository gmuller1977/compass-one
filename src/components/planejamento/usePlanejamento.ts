import { useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import type { PlanoAnoData } from '../../context/AppContext'
import { iconeCategoria } from '../../utils/categoriaIcone'
import {
  mergeCats, calcSaldos, nomeFaturaCartao, MESES,
  type Cat, type AnoData, type AncoraReal,
} from './types'
import { catKey, norm, resolverSub } from '../acompanhamento/evolucaoCalcs'

// iconeCategoria imported above; suppress unused warning
void iconeCategoria

/**
 * Linha do plano correspondente a uma categoria do cadastro.
 * Casa pelo par (nome, variante). O fallback pelo nome puro so entra quando
 * existe UMA linha com aquele nome — plano antigo, gravado antes das variantes.
 * Com duas linhas nao ha fallback: escolher uma somaria no lugar errado.
 */
function acharPlanCat<T extends { nome: string; descricao?: string }>(
  cats: T[] | undefined,
  nome: string,
  descricao?: string,
): T | undefined {
  if (!cats) return undefined
  const alvo = catKey(nome, descricao)
  const exato = cats.find(c => catKey(c.nome, c.descricao) === alvo)
  if (exato) return exato
  const doNome = cats.filter(c => norm(c.nome) === norm(nome))
  return doNome.length === 1 ? doNome[0] : undefined
}

export function usePlanejamento(anoAtual: number) {
  const {
    contas, categorias, extratoData, faturaData,
    planos, setPlanos,
  } = useApp()

  const anoCorrente = new Date().getFullYear()
  const mesAtual = new Date().getMonth()

  const contasSaldoIni = contas.filter(c => c.tipo === 'corrente' || c.tipo === 'poupanca')
  const SALDO_INICIAL_FIXO = contasSaldoIni
    .filter(c => c.incluirNoSaldoInicial !== false)
    .reduce((s, c) => s + c.saldoInicial, 0)

  const cartaoNomes = useMemo(() =>
    new Set(contas.filter(c => c.tipo === 'cartao').map(c => c.nome.toLowerCase())), [contas])

  // ── Dados base (categorias ativas com v=0) ──
  const dadosBase: AnoData = useMemo(() => ({
    saldoInicialJan: SALDO_INICIAL_FIXO,
    entradas: categorias
      .filter(c => c.tipo === 'entrada' && c.ativa)
      .map(c => ({ id: c.id, nome: c.nome, descricao: c.descricao, grupo: c.grupo, t: c.tipoMovimento, v: new Array(12).fill(0) }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    saidas: categorias
      .filter(c => c.tipo === 'saida' && c.ativa)
      .map(c => ({ id: c.id, nome: c.nome, descricao: c.descricao, grupo: c.grupo, t: c.tipoMovimento, v: new Array(12).fill(0) }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
  }), [SALDO_INICIAL_FIXO, categorias])

  // Plano unico do ano. planosReal deixou de ser escrito na migracao para
  // plano unico — as linhas antigas ficam no banco so como historico.
  const dadosPrevisto: AnoData = useMemo(() => {
    const salvo = planos[anoAtual] as AnoData | undefined
    if (!salvo) return dadosBase
    return {
      ...salvo,
      saldoInicialJan: SALDO_INICIAL_FIXO,
      entradas: mergeCats(dadosBase.entradas, salvo.entradas),
      saidas: mergeCats(dadosBase.saidas, salvo.saidas),
    }
  }, [anoAtual, dadosBase, planos, SALDO_INICIAL_FIXO])

  const planoRef = useMemo(() =>
    (planos[anoAtual] as PlanoAnoData | undefined),
  [planos, anoAtual])

  // Cálculo de fatura de cartão por mês: informado → lançamentos reais mês anterior → R$0
  const somaCartaoMes = useMemo(() => {
    const faturaCatsPlan = dadosPrevisto.saidas.filter(c => c.t === 'fatura_cartao')
    const cartoesContas = contas.filter(c => c.tipo === 'cartao')
    const fat = faturaData as Record<string, { lancamentos?: Record<number, { tipo: string; valor: number }[]> }>
    return MESES.map((_, i) => {
      const informado = faturaCatsPlan.reduce((s, c) => s + (c.v[i] ?? 0), 0)
      if (informado > 0) return informado
      const prevMes = i === 0 ? 11 : i - 1
      const prevAno = i === 0 ? anoAtual - 1 : anoAtual
      const prevMesStr = String(prevMes + 1).padStart(2, '0')
      let calculado = 0
      for (const cartao of cartoesContas) {
        const dm = fat[`${cartao.id}-${prevAno}-${prevMesStr}`]
        if (!dm?.lancamentos) continue
        const totalDiasM = new Date(prevAno, prevMes + 1, 0).getDate()
        for (let d = 1; d <= totalDiasM; d++) {
          ;(dm.lancamentos[d] ?? []).forEach(l => {
            l.tipo === 'saida' ? calculado += l.valor : calculado -= l.valor
          })
        }
      }
      return Math.max(0, calculado)
    })
  }, [dadosPrevisto, anoAtual, contas, faturaData])

  const somaCartaoBadges = useMemo(() => {
    const faturaCatsPlan = dadosPrevisto.saidas.filter(c => c.t === 'fatura_cartao')
    const cartoesContas = contas.filter(c => c.tipo === 'cartao')
    const fat = faturaData as Record<string, { lancamentos?: Record<number, unknown[]> }>
    return MESES.map((_, i) => {
      const informado = faturaCatsPlan.reduce((s, c) => s + (c.v[i] ?? 0), 0)
      if (informado > 0) return 'informado'
      const prevMes = i === 0 ? 11 : i - 1
      const prevAno = i === 0 ? anoAtual - 1 : anoAtual
      const prevMesStr = String(prevMes + 1).padStart(2, '0')
      for (const cartao of cartoesContas) {
        const dm = fat[`${cartao.id}-${prevAno}-${prevMesStr}`]
        if (dm?.lancamentos && Object.keys(dm.lancamentos).length > 0) return 'calculado'
      }
      return 'sem_dados'
    }) as ('informado' | 'calculado' | 'sem_dados')[]
  }, [dadosPrevisto, contas, faturaData, anoAtual])

  // dadosPrevisto com fatura de cartão substituída pelo valor calculado
  const dadosPrevistoFinal: AnoData = useMemo(() => {
    const isFatura = (cat: Cat) => nomeFaturaCartao(cat.nome, cartaoNomes) || cat.t === 'fatura_cartao'
    const saidas = dadosPrevisto.saidas.map(cat =>
      isFatura(cat) ? { ...cat, t: undefined, v: somaCartaoMes } : cat
    )
    return { ...dadosPrevisto, saidas }
  }, [dadosPrevisto, somaCartaoMes, cartaoNomes])

  // Excluir t='cartao' dos totais só se existir fatura_cartao (evita dupla contagem)
  // Sem fatura_cartao, as categorias cartao são o único planejamento do cartão
  const hasFaturaCat = useMemo(() =>
    dadosPrevisto.saidas.some(c => c.t === 'fatura_cartao' || nomeFaturaCartao(c.nome, cartaoNomes)),
    [dadosPrevisto.saidas, cartaoNomes]
  )

  // Lançamentos reais por categoria e mês (do extrato/fatura)
  const lancadoPorCatMes = useMemo(() => {
    const result: Record<number, {
      entrada: Record<string, number>; saida: Record<string, number>
      entradaCartao: Record<string, number>; saidaCartao: Record<string, number>
    }> = {}
    const fatDados = faturaData as Record<string, { lancamentos: Record<number, { tipo: string; valor: number; categoria: string; subCategoria?: string }[]> }>
    const _hoje = new Date()
    const mesHojeRef = _hoje.getMonth()
    const anoHojeRef = _hoje.getFullYear()
    for (let mes = 0; mes < 12; mes++) {
      result[mes] = { entrada: {}, saida: {}, entradaCartao: {}, saidaCartao: {} }
      const mesStr = String(mes + 1).padStart(2, '0')
      const sufixo = `-${anoAtual}-${mesStr}`

      Object.entries(extratoData).forEach(([key, dados]) => {
        if (!key.endsWith(sufixo)) return
        Object.values(dados.lancamentos).flat().forEach(l => {
          const k = catKey(l.categoria, resolverSub(
            categorias, l.categoria, l.tipo,
            (l as { subCategoria?: string }).subCategoria,
          ))
          result[mes][l.tipo][k] = (result[mes][l.tipo][k] ?? 0) + l.valor
        })
        const ehCartaoKey = contas.some(c => c.tipo === 'cartao' && key.startsWith(c.id))
        if (!ehCartaoKey) {
          const ehMesPassado = mes < mesHojeRef || anoAtual < anoHojeRef
          categorias.filter(c => c.fixa && c.ativa).forEach(f => {
            const ehAuto = (f as unknown as { formaPagamento?: string }).formaPagamento === 'automatico'
            const estaConsolidada = dados.fixasConsolidadas?.[f.id] !== undefined
              ? dados.fixasConsolidadas[f.id]
              : (ehAuto && ehMesPassado)
            if (!estaConsolidada) return
            const planCats = f.tipo === 'entrada' ? planoRef?.entradas : planoRef?.saidas
            const planVal = acharPlanCat(planCats, f.nome, f.descricao)?.v[mes] ?? 0
            const fValor = (f as unknown as { valor?: number }).valor ?? 0
            const val = dados.fixasValorOverride?.[f.id] ?? (planVal > 0 ? planVal : fValor)
            const kf = catKey(f.nome, f.descricao)
            result[mes][f.tipo][kf] = (result[mes][f.tipo][kf] ?? 0) + val
          })
        }
      })

      contas.filter(c => c.tipo === 'cartao').forEach(cartao => {
        const diaFech = cartao.diaFechamento ?? 1
        const diaVenc = cartao.diaVencimento ?? 1
        const offset = diaVenc < diaFech ? 1 : 0
        let pMes = mes - offset
        let pAno = anoAtual
        if (pMes < 0) { pMes += 12; pAno-- }
        const fatKey = `${cartao.id}-${pAno}-${String(pMes + 1).padStart(2, '0')}`
        const dm = fatDados[fatKey]
        if (!dm) return
        const nDias = new Date(pAno, pMes + 1, 0).getDate()
        for (let d = 1; d <= nDias; d++) {
          ;(dm.lancamentos[d] ?? []).forEach(l => {
            // Tudo que vem da fatura cai no balde de saida — inclusive o estorno,
            // que entra com sinal negativo. Por isso a variante resolve sempre
            // contra as categorias de saida.
            const k = catKey(l.categoria, resolverSub(categorias, l.categoria, 'saida', l.subCategoria))
            const sinal = l.tipo === 'entrada' ? 1 : -1
            result[mes]['saida'][k] = (result[mes]['saida'][k] ?? 0) + sinal * l.valor
            result[mes]['saidaCartao'][k] = (result[mes]['saidaCartao'][k] ?? 0) + sinal * l.valor
          })
        }
      })
    }
    return result
  }, [contas, categorias, extratoData, faturaData, anoAtual, planoRef])

  // Totais reais (lançamentos do extrato) por mês
  const totaisReais = useMemo(() => {
    const fatDados = faturaData as Record<string, { lancamentos: Record<number, { tipo: string; valor: number }[]> }>
    const te = new Array(12).fill(0)
    const ts = new Array(12).fill(0)
    for (let mes = 0; mes < 12; mes++) {
      const mesStr = String(mes + 1).padStart(2, '0')
      const sufixo = `-${anoAtual}-${mesStr}`
      const cartaoOverrides: Record<string, number> = {}
      Object.entries(extratoData).forEach(([key, dados]) => {
        if (!key.endsWith(sufixo) || !dados.fixasConsolidadas) return
        Object.entries(dados.fixasConsolidadas).forEach(([fixaId, consolidada]) => {
          if (!consolidada || !fixaId.startsWith('cartao-')) return
          const v = dados.fixasValorOverride?.[fixaId]
          if (v !== undefined) cartaoOverrides[fixaId.replace('cartao-', '')] = v
        })
      })
      Object.entries(extratoData).forEach(([key, dados]) => {
        if (!key.endsWith(sufixo)) return
        const ehCartaoKey = contas.some(c => c.tipo === 'cartao' && key.startsWith(c.id))
        if (ehCartaoKey) return
        Object.values(dados.lancamentos).flat().forEach((l: { tipo: string; valor: number }) => {
          if (l.tipo === 'entrada') te[mes] += l.valor
          else ts[mes] += l.valor
        })
        if (dados.fixasConsolidadas) {
          categorias.filter(c => c.fixa && c.ativa).forEach(f => {
            if (!dados.fixasConsolidadas?.[f.id]) return
            const planCats = f.tipo === 'entrada' ? planoRef?.entradas : planoRef?.saidas
            const planVal = acharPlanCat(planCats, f.nome, f.descricao)?.v[mes] ?? 0
            const val = dados.fixasValorOverride?.[f.id] ?? planVal
            if (f.tipo === 'entrada') te[mes] += val
            else ts[mes] += val
          })
        }
      })
      contas.filter(c => c.tipo === 'cartao').forEach(cartao => {
        const diaFech = cartao.diaFechamento ?? 1
        const diaVenc = cartao.diaVencimento ?? 1
        const offset = diaVenc < diaFech ? 1 : 0
        let pMes = mes - offset
        let pAno = anoAtual
        if (pMes < 0) { pMes += 12; pAno-- }
        if (cartaoOverrides[cartao.id] !== undefined) {
          ts[mes] += cartaoOverrides[cartao.id]
        } else {
          const fatKey = `${cartao.id}-${pAno}-${String(pMes + 1).padStart(2, '0')}`
          const dm = fatDados[fatKey]
          if (!dm) return
          const nDias = new Date(pAno, pMes + 1, 0).getDate()
          for (let d = 1; d <= nDias; d++) {
            ;(dm.lancamentos[d] ?? []).forEach((l: { tipo: string; valor: number }) => {
              if (l.tipo === 'entrada') ts[mes] += l.valor
              else ts[mes] -= l.valor
            })
          }
        }
      })
    }
    return { te, ts }
  }, [contas, categorias, extratoData, faturaData, anoAtual, planoRef])

  /**
   * Ultimo mes fechado. Regra: mes anterior ao corrente (opcao "por data").
   * Ano passado -> tudo fechado. Ano futuro -> nada fechado.
   */
  const ancoraMes = anoAtual < anoCorrente ? 11
    : anoAtual > anoCorrente ? -1
    : mesAtual - 1

  const ancora = useMemo<AncoraReal>(
    () => ({ ateMes: ancoraMes, te: totaisReais.te, ts: totaisReais.ts }),
    [ancoraMes, totaisReais],
  )

  // Totais para "Meu plano" (previsto) — realizado ate a ancora, plano depois
  const previsto = useMemo(
    () => calcSaldos(dadosPrevistoFinal, hasFaturaCat, ancora),
    [dadosPrevistoFinal, hasFaturaCat, ancora])

  // Saldo real (calculado dos lançamentos)
  const { saldoInicialReal, saldoFinalReal } = useMemo(() => {
    const si: number[] = []
    const sf: number[] = []
    for (let i = 0; i < 12; i++) {
      const s = i === 0 ? SALDO_INICIAL_FIXO : sf[i - 1]
      si.push(s)
      sf.push(s + totaisReais.te[i] - totaisReais.ts[i])
    }
    return { saldoInicialReal: si, saldoFinalReal: sf }
  }, [totaisReais, SALDO_INICIAL_FIXO])

  // Meses com dados reais
  const mesTemDadosReais = useMemo(() =>
    Array.from({ length: 12 }, (_, mes) => {
      const mesStr = String(mes + 1).padStart(2, '0')
      return contas.filter(c => c.tipo !== 'cartao').some(conta => {
        const key = `${conta.id}-${anoAtual}-${mesStr}`
        const dados = extratoData[key]
        if (!dados) return false
        const temLanc = Object.values(dados.lancamentos).some(arr => (arr as unknown[]).length > 0)
        const temConsolidados = !!dados.fixasConsolidadas && Object.values(dados.fixasConsolidadas).some(v => v)
        return temLanc || temConsolidados
      })
    }), [contas, extratoData, anoAtual])

  // Ações
  // A edicao e aplicada na lista MESCLADA (dadosPrevisto), que e a mesma que a
  // tela indexa. Aplicar no bruto salvo desalinhava os indices sempre que o
  // cadastro mudava depois do plano ter sido gravado.
  function updateAno(fn: (d: AnoData) => AnoData) {
    setPlanos(prev => ({ ...prev, [anoAtual]: fn(dadosPrevisto) as PlanoAnoData }))
  }

  function editarValor(tipo: 'e' | 's', ri: number, mi: number, novoValor: number) {
    updateAno(d => {
      const lista = tipo === 'e' ? [...d.entradas] : [...d.saidas]
      const alvo = lista[ri]
      if (!alvo) return d
      lista[ri] = { ...alvo, v: alvo.v.map((v, i) => i === mi ? novoValor : v) }
      return tipo === 'e' ? { ...d, entradas: lista } : { ...d, saidas: lista }
    })
  }

  function editarMultiplosValores(ops: { tipo: 'e' | 's'; ri: number; mi: number; valor: number }[]) {
    updateAno(d => {
      const entradas = d.entradas.map(c => ({ ...c, v: [...c.v] }))
      const saidas = d.saidas.map(c => ({ ...c, v: [...c.v] }))
      for (const op of ops) {
        const lista = op.tipo === 'e' ? entradas : saidas
        if (lista[op.ri]) lista[op.ri].v[op.mi] = op.valor
      }
      return { ...d, entradas, saidas }
    })
  }

  const planoAnoAnterior: AnoData | null = useMemo(() =>
    (planos[anoAtual - 1] as AnoData | undefined) ?? null,
  [planos, anoAtual])

  return {
    // Dados
    anoCorrente,
    mesAtual,
    dadosBase,
    dadosPrevisto,
    dadosPrevistoFinal,
    planoRef,
    hasFaturaCat,
    somaCartaoMes,
    somaCartaoBadges,
    cartaoNomes,
    // Totais
    previsto,
    totaisReais,
    saldoInicialReal,
    saldoFinalReal,
    ancoraMes,
    lancadoPorCatMes,
    mesTemDadosReais,
    // Ações
    editarValor,
    editarMultiplosValores,
    planoAnoAnterior,
    // Dados contexto (para passar para componentes)
    contas,
    categorias,
    extratoData,
    faturaData,
    SALDO_INICIAL_FIXO,
  }
}
