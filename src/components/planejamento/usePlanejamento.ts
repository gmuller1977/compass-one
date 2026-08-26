import { useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import type { PlanoAnoData } from '../../context/AppContext'
import { iconeCategoria } from '../../utils/categoriaIcone'
import {
  mergeCats, calcSaldos, nomeFaturaCartao, MESES,
  type Cat, type AnoData, type Aba,
} from './types'

// iconeCategoria imported above; suppress unused warning
void iconeCategoria

export function usePlanejamento(anoAtual: number) {
  const {
    contas, categorias, extratoData, faturaData,
    planos, setPlanos,
    planosReal, planejamentoLockado,
    finalizarPlanejamento, updatePlanoReal,
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

  const realExiste = !!planosReal[anoAtual]

  // Plano original com todas as categorias ativas
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

  // Plano realizado (planosReal mergeado com dadosBase)
  const dadosRealizado: AnoData = useMemo(() => {
    const realSalvo = planosReal[anoAtual] as AnoData | undefined
    if (!realSalvo) return { saldoInicialJan: SALDO_INICIAL_FIXO, entradas: [], saidas: [] }
    return {
      ...realSalvo,
      saldoInicialJan: SALDO_INICIAL_FIXO,
      entradas: mergeCats(dadosBase.entradas, realSalvo.entradas),
      saidas: mergeCats(dadosBase.saidas, realSalvo.saidas),
    }
  }, [anoAtual, dadosBase, planosReal, SALDO_INICIAL_FIXO])

  // Plano de referência para comparações (previsto vs realizado)
  const planoRef = useMemo(() =>
    ((planejamentoLockado && planosReal[anoAtual] ? planosReal[anoAtual] : planos[anoAtual]) as PlanoAnoData | undefined),
  [planejamentoLockado, planosReal, planos, anoAtual])

  // Categorias ativas + históricas (para aba Realizado)
  const entradasComHistorico = useMemo(() => {
    const realSaved = (planosReal[anoAtual] as PlanoAnoData | undefined)?.entradas ?? []
    const inativas = realSaved.filter(rs =>
      !dadosBase.entradas.some(be => be.nome === rs.nome || (be.id && rs.id && be.id === rs.id))
    )
    return [...dadosBase.entradas, ...inativas].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [dadosBase.entradas, planosReal, anoAtual])

  const saidasComHistorico = useMemo(() => {
    const realSaved = (planosReal[anoAtual] as PlanoAnoData | undefined)?.saidas ?? []
    const inativas = realSaved.filter(rs =>
      !dadosBase.saidas.some(bs => bs.nome === rs.nome || (bs.id && rs.id && bs.id === rs.id))
    )
    return [...dadosBase.saidas, ...inativas].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [dadosBase.saidas, planosReal, anoAtual])

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

  // dadosRealizado com fatura de cartão substituída pelo valor calculado
  const dadosRealizadoFinal: AnoData = useMemo(() => {
    const isFatura = (cat: Cat) => nomeFaturaCartao(cat.nome, cartaoNomes) || cat.t === 'fatura_cartao'
    const saidas = dadosRealizado.saidas.map(cat =>
      isFatura(cat) ? { ...cat, t: undefined, v: somaCartaoMes } : cat
    )
    return { ...dadosRealizado, saidas }
  }, [dadosRealizado, somaCartaoMes, cartaoNomes])

  // Excluir t='cartao' dos totais só se existir fatura_cartao (evita dupla contagem)
  // Sem fatura_cartao, as categorias cartao são o único planejamento do cartão
  const hasFaturaCat = useMemo(() =>
    dadosPrevisto.saidas.some(c => c.t === 'fatura_cartao' || nomeFaturaCartao(c.nome, cartaoNomes)),
    [dadosPrevisto.saidas, cartaoNomes]
  )

  // Totais para "Meu plano" (previsto)
  const previsto = useMemo(() => calcSaldos(dadosPrevistoFinal, hasFaturaCat), [dadosPrevistoFinal, hasFaturaCat])

  // Totais para "Realizado" (planosReal)
  const realizadoPlan = useMemo(() => calcSaldos(dadosRealizadoFinal, hasFaturaCat), [dadosRealizadoFinal, hasFaturaCat])

  // Lançamentos reais por categoria e mês (do extrato/fatura)
  const lancadoPorCatMes = useMemo(() => {
    const result: Record<number, {
      entrada: Record<string, number>; saida: Record<string, number>
      entradaCartao: Record<string, number>; saidaCartao: Record<string, number>
    }> = {}
    const fatDados = faturaData as Record<string, { lancamentos: Record<number, { tipo: string; valor: number; categoria: string }[]> }>
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
          result[mes][l.tipo][l.categoria] = (result[mes][l.tipo][l.categoria] ?? 0) + l.valor
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
            const planVal = planCats?.find(c => c.nome === f.nome)?.v[mes] ?? 0
            const fValor = (f as unknown as { valor?: number }).valor ?? 0
            const val = dados.fixasValorOverride?.[f.id] ?? (planVal > 0 ? planVal : fValor)
            result[mes][f.tipo][f.nome] = (result[mes][f.tipo][f.nome] ?? 0) + val
          })
        }
      })

      contas.filter(c => c.tipo === 'cartao').forEach(cartao => {
        const diaFech = (cartao as any).diaFechamento ?? 1
        const diaVenc = (cartao as any).diaVencimento ?? 1
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
            if (l.tipo === 'entrada') {
              result[mes]['saida'][l.categoria] = (result[mes]['saida'][l.categoria] ?? 0) + l.valor
              result[mes]['saidaCartao'][l.categoria] = (result[mes]['saidaCartao'][l.categoria] ?? 0) + l.valor
            } else {
              result[mes]['saida'][l.categoria] = (result[mes]['saida'][l.categoria] ?? 0) - l.valor
              result[mes]['saidaCartao'][l.categoria] = (result[mes]['saidaCartao'][l.categoria] ?? 0) - l.valor
            }
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
            const planVal = planCats?.find(c => c.nome === f.nome)?.v[mes] ?? 0
            const val = dados.fixasValorOverride?.[f.id] ?? planVal
            if (f.tipo === 'entrada') te[mes] += val
            else ts[mes] += val
          })
        }
      })
      contas.filter(c => c.tipo === 'cartao').forEach(cartao => {
        const diaFech = (cartao as any).diaFechamento ?? 1
        const diaVenc = (cartao as any).diaVencimento ?? 1
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
  function updateAno(fn: (d: AnoData) => AnoData, aba: Aba) {
    if (planejamentoLockado && aba === 'meu-plano') {
      console.warn('[plan-edit] BLOQUEADO: plano ativado e aba = "Meu plano". Nada foi gravado.')
      return
    }
    if (aba === 'meu-plano') {
      setPlanos(prev => ({ ...prev, [anoAtual]: fn(dadosPrevisto) as PlanoAnoData }))
    } else {
      // A tela mostra e indexa a lista MESCLADA (dadosRealizado), entao a
      // edicao tem que ser aplicada nela, nao no bruto salvo. No bruto ainda
      // ha linhas com id de categoria excluida: o valor era gravado nessa
      // linha orfa e o mergeCats, que casa por id do cadastro atual, nunca
      // mais o encontrava — o campo voltava a zero.
      updatePlanoReal(anoAtual, prev => {
        const temMescla = dadosRealizado.entradas.length > 0 || dadosRealizado.saidas.length > 0
        return fn(temMescla ? dadosRealizado : (prev as AnoData)) as PlanoAnoData
      })
    }
  }

  function editarValor(tipo: 'e' | 's', ri: number, mi: number, novoValor: number, aba: Aba) {
    console.log('[plan-edit] pedido:', { aba, planejamentoLockado, tipo, ri, mes: MESES[mi], novoValor })
    updateAno(d => {
      const lista = tipo === 'e' ? [...d.entradas] : [...d.saidas]
      const alvo = lista[ri]
      if (!alvo) {
        console.error('[plan-edit] ri FORA DA LISTA — nada gravado.', { ri, tamanho: lista.length,
          lista: lista.map((c, i) => `${i}:${c.descricao ? `${c.nome}/${c.descricao}` : c.nome}`) })
        return d
      }
      console.log('[plan-edit] gravando em:', {
        rotulo: alvo.descricao ? `${alvo.nome} · ${alvo.descricao}` : alvo.nome,
        id: alvo.id, valorAntes: alvo.v[mi], valorDepois: novoValor,
      })
      lista[ri] = { ...alvo, v: alvo.v.map((v, i) => i === mi ? novoValor : v) }
      return tipo === 'e' ? { ...d, entradas: lista } : { ...d, saidas: lista }
    }, aba)
  }

  function editarMultiplosValores(ops: { tipo: 'e' | 's'; ri: number; mi: number; valor: number }[], aba: Aba) {
    updateAno(d => {
      const entradas = d.entradas.map(c => ({ ...c, v: [...c.v] }))
      const saidas = d.saidas.map(c => ({ ...c, v: [...c.v] }))
      for (const op of ops) {
        const lista = op.tipo === 'e' ? entradas : saidas
        if (lista[op.ri]) lista[op.ri].v[op.mi] = op.valor
      }
      return { ...d, entradas, saidas }
    }, aba)
  }

  const planoAnoAnterior: AnoData | null = useMemo(() =>
    (planos[anoAtual - 1] as AnoData | undefined) ?? null,
  [planos, anoAtual])

  function ativarPlano() {
    finalizarPlanejamento(anoAtual, dadosPrevisto as PlanoAnoData)
  }

  function atualizarPlano() {
    finalizarPlanejamento(anoAtual, dadosPrevisto as PlanoAnoData)
  }

  return {
    // Dados
    anoCorrente,
    mesAtual,
    dadosBase,
    dadosPrevisto,
    dadosRealizado,
    dadosPrevistoFinal,
    dadosRealizadoFinal,
    planoRef,
    entradasComHistorico,
    saidasComHistorico,
    realExiste,
    hasFaturaCat,
    somaCartaoMes,
    somaCartaoBadges,
    cartaoNomes,
    // Totais
    previsto,
    realizadoPlan,
    totaisReais,
    saldoInicialReal,
    saldoFinalReal,
    lancadoPorCatMes,
    mesTemDadosReais,
    // Estado bloqueio
    planejamentoLockado,
    // Ações
    editarValor,
    editarMultiplosValores,
    ativarPlano,
    atualizarPlano,
    planoAnoAnterior,
    // Dados contexto (para passar para componentes)
    contas,
    categorias,
    extratoData,
    faturaData,
    SALDO_INICIAL_FIXO,
  }
}
