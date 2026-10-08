import { useMemo } from 'react'
import { comItens, comValor, type ItemPlano } from '../../utils/itensPlano'
import { useApp } from '../../context/AppContext'
import type { PlanoAnoData } from '../../context/AppContext'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { calcSaldos, MESES, type AnoData, type AncoraReal } from './types'
import {
  dadosBaseDoPlano, dadosPrevistoDoAno, somaCartaoDoAno, comFaturaCalculada, temFaturaCat,
  mesDaAncora, fimRealDoAno, saldoInicialJanDoAno,
} from './previstoDoAno'
import { acharPlanCat } from '../acompanhamento/evolucaoCalcs'
import { resolverFixaDoMes, dadosBancariosDoMes } from '../../utils/fixasDoMes'
import type { Deps } from '../../utils/saldoConta'

// iconeCategoria imported above; suppress unused warning
void iconeCategoria

export function usePlanejamento(anoAtual: number) {
  const {
    contas, categorias, extratoData, faturaData,
    planos, setPlanos, saldoInicialDinheiro,
  } = useApp()

  const anoCorrente = new Date().getFullYear()
  const mesAtual = new Date().getMonth()

  const contasSaldoIni = contas.filter(c => c.tipo === 'corrente' || c.tipo === 'poupanca')
  const SALDO_INICIAL_FIXO = contasSaldoIni
    .filter(c => c.incluirNoSaldoInicial !== false)
    .reduce((s, c) => s + c.saldoInicial, 0)

  const cartaoNomes = useMemo(() =>
    new Set(contas.filter(c => c.tipo === 'cartao').map(c => c.nome.toLowerCase())), [contas])

  // A passagem do ano mora em previstoDoAno.ts, para servir também ao ano
  // anterior: ano FUTURO abre com o dezembro previsto do ano de antes.
  const depsSaldo: Deps = useMemo(() => ({
    extratoData,
    faturaData: faturaData as Deps['faturaData'],
    contas, categorias,
    planos: planos as Deps['planos'],
    saldoInicialDinheiro,
  }), [extratoData, faturaData, contas, categorias, planos, saldoInicialDinheiro])

  const saldoInicialJan = useMemo(() => saldoInicialJanDoAno(anoAtual, {
    anoCorrente, mesAtual, categorias, contas, faturaData, planos,
    saldoInicialFixo: SALDO_INICIAL_FIXO, depsSaldo,
  }), [anoAtual, anoCorrente, mesAtual, categorias, contas, faturaData, planos, SALDO_INICIAL_FIXO, depsSaldo])

  // ── Dados base (categorias ativas com v=0) ──
  const dadosBase: AnoData = useMemo(() => dadosBaseDoPlano(categorias, saldoInicialJan), [saldoInicialJan, categorias])

  // Plano unico do ano. planosReal deixou de ser escrito na migracao para
  // plano unico — as linhas antigas ficam no banco so como historico.
  const dadosPrevisto: AnoData = useMemo(
    () => dadosPrevistoDoAno(planos[anoAtual] as AnoData | undefined, dadosBase, saldoInicialJan),
    [anoAtual, dadosBase, planos, saldoInicialJan])

  const planoRef = useMemo(() =>
    (planos[anoAtual] as PlanoAnoData | undefined),
  [planos, anoAtual])

  // Cálculo de fatura de cartão por mês: informado → lançamentos reais mês anterior → R$0
  const somaCartaoMes = useMemo(
    () => somaCartaoDoAno(dadosPrevisto, anoAtual, contas, faturaData),
    [dadosPrevisto, anoAtual, contas, faturaData])

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
  const dadosPrevistoFinal: AnoData = useMemo(
    () => comFaturaCalculada(dadosPrevisto, somaCartaoMes, cartaoNomes),
    [dadosPrevisto, somaCartaoMes, cartaoNomes])

  // Excluir t='cartao' dos totais só se existir fatura_cartao (evita dupla contagem)
  // Sem fatura_cartao, as categorias cartao são o único planejamento do cartão
  const hasFaturaCat = useMemo(() => temFaturaCat(dadosPrevisto, cartaoNomes), [dadosPrevisto, cartaoNomes])


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
      })
      // A fixa e do mes, nao da conta. Somar por chave do extrato contaria aqui o
      // efeito era pior — este total alimenta a ancora do saldo inicial.
      const dmsBancoT = dadosBancariosDoMes(
        extratoData as Record<string, { fixasConsolidadas?: Record<string, boolean>; fixasValorOverride?: Record<string, number> }>,
        sufixo,
        key => contas.some(c => c.tipo === 'cartao' && key.startsWith(c.id)),
      )
      categorias.filter(c => c.fixa && c.ativa).forEach(f => {
        const { consolidada, override } = resolverFixaDoMes(f.id, dmsBancoT)
        if (!consolidada) return
        const planCats = f.tipo === 'entrada' ? planoRef?.entradas : planoRef?.saidas
        const planVal = acharPlanCat(planCats, f.nome, f.descricao)?.v[mes] ?? 0
        const val = override ?? planVal
        if (f.tipo === 'entrada') te[mes] += val
        else ts[mes] += val
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

  /** Ultimo mes fechado — ver mesDaAncora (ano futuro: -2, nada fechado). */
  const ancoraMes = mesDaAncora(anoAtual, anoCorrente, mesAtual)

  // O realizado sai de saldoConta, a mesma fonte dos cartoes do Radar. O
  // Planejamento nao recalcula o passado: so encadeia o futuro a partir dele.
  const fimReal = useMemo(() => fimRealDoAno(anoAtual, depsSaldo), [anoAtual, depsSaldo])

  const ancora = useMemo<AncoraReal>(
    () => ({ ateMes: ancoraMes, te: totaisReais.te, ts: totaisReais.ts, fim: fimReal }),
    [ancoraMes, totaisReais, fimReal],
  )

  // Totais para "Meu plano" (previsto) — realizado ate a ancora, plano depois
  const previsto = useMemo(
    () => calcSaldos(dadosPrevistoFinal, hasFaturaCat, ancora),
    [dadosPrevistoFinal, hasFaturaCat, ancora])

  // Saldo real (calculado dos lançamentos)
  // A mesma fonte, para nao existir uma segunda versao do realizado.
  const { saldoInicialReal, saldoFinalReal } = useMemo(() => {
    const sf = Array.from({ length: 12 }, (_, i) => fimReal(i))
    const si = sf.map((_, i) => (i === 0 ? fimReal(-1) : sf[i - 1]))
    return { saldoInicialReal: si, saldoFinalReal: sf }
  }, [fimReal])

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
      // Gravar só o valor tira os itens do mês (comValor): senão o detalhe
      // somaria outra coisa. A célula com itens abre o editor, não chega aqui.
      lista[ri] = comValor(alvo, mi, novoValor)
      return tipo === 'e' ? { ...d, entradas: lista } : { ...d, saidas: lista }
    })
  }

  /**
   * A meta de sobra de cada mês, sempre com doze posições. Zero = sem meta.
   */
  const objetivos = useMemo(() => {
    const salvo = (planos[anoAtual] as PlanoAnoData | undefined)?.objetivos
    return Array.from({ length: 12 }, (_, i) => salvo?.[i] ?? 0)
  }, [planos, anoAtual])

  /**
   * Grava as metas sem passar por updateAno: `AnoData` não declara
   * `objetivos`, e escrever por lá exigiria alargar um tipo que existe para
   * falar de categorias. A base é dadosPrevisto, como em updateAno, para que o
   * primeiro save também crie o plano do ano quando ainda não existe.
   */
  function editarMetas(valores: number[]) {
    setPlanos(prev => ({
      ...prev,
      [anoAtual]: { ...(dadosPrevisto as unknown as PlanoAnoData), objetivos: valores },
    }))
  }

  /**
   * Ferramentas em lote. Uma op com `itens` grava os itens e o valor vira a
   * soma deles (copiar um mês detalhado leva o detalhe; reajuste escala cada
   * item). Sem `itens`, grava só o valor e o detalhe do mês sai.
   */
  function editarMultiplosValores(ops: { tipo: 'e' | 's'; ri: number; mi: number; valor: number; itens?: ItemPlano[] | null }[]) {
    updateAno(d => {
      const entradas = [...d.entradas]
      const saidas = [...d.saidas]
      for (const op of ops) {
        const lista = op.tipo === 'e' ? entradas : saidas
        const alvo = lista[op.ri]
        if (!alvo) continue
        lista[op.ri] = op.itens && op.itens.length
          ? comItens(alvo, [op.mi], op.itens)
          : comValor(alvo, op.mi, op.valor)
      }
      return { ...d, entradas, saidas }
    })
  }

  /**
   * Itens de uma categoria em um ou mais meses (o editor de itens). `null`
   * tira o detalhe e mantém o total. Ver utils/itensPlano.
   */
  function editarItens(tipo: 'e' | 's', ri: number, meses: number[], itens: ItemPlano[] | null) {
    updateAno(d => {
      const lista = tipo === 'e' ? [...d.entradas] : [...d.saidas]
      if (!lista[ri]) return d
      lista[ri] = comItens(lista[ri], meses, itens)
      return tipo === 'e' ? { ...d, entradas: lista } : { ...d, saidas: lista }
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
    mesTemDadosReais,
    // Ações
    editarValor,
    editarMultiplosValores,
    editarItens,
    objetivos,
    editarMetas,
    planoAnoAnterior,
    // Dados contexto (para passar para componentes)
    contas,
    categorias,
    extratoData,
    faturaData,
    SALDO_INICIAL_FIXO,
  }
}
