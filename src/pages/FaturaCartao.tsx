import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import type { DadosMes as ExtratoDadosMes } from '../context/AppContext'
import {
  COR, DADOS_MES_VAZIO,
  diasNoMes, mesKey, fmt, parseBRL, parseDateFatura,
  type TipoLanc, type FormaPag, type Lancamento, type DadosMes,
} from '../components/faturaCartao/FcShared'
import FcMobileView from '../components/faturaCartao/FcMobileView'
import FcDesktopLeft from '../components/faturaCartao/FcDesktopLeft'
import FcDesktopPanel from '../components/faturaCartao/FcDesktopPanel'
import FcModal from '../components/faturaCartao/FcModal'

function useIsMobile() {
  const [m, setM] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const fn = () => setM(window.innerWidth < 640)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return m
}

export default function FaturaCartao({ mobileSelecionado, onCartaoChange }: { mobileSelecionado?: string; onVoltar?: () => void; onCartaoChange?: (id: string) => void } = {}) {
  const hoje    = new Date()
  const diaHoje = hoje.getDate()
  const mesHoje = hoje.getMonth()
  const anoHoje = hoje.getFullYear()
  const hojeStr = hoje.toISOString().slice(0,10)
  const isMobile = useIsMobile()
  const [mobileView, setMobileView] = useState<'extrato'|'form'>('extrato')

  const { contas, categorias, planos, faturaData, setFaturaData, extratoData, setExtratoData, carregando } = useApp()
  const contasCartao = contas.filter(c => c.tipo === 'cartao')
  const dados = faturaData as Record<string, DadosMes>
  const setDados = setFaturaData as React.Dispatch<React.SetStateAction<Record<string, DadosMes>>>
  const extratoRef = useRef(extratoData)
  useEffect(() => { extratoRef.current = extratoData }, [extratoData])

  const [contaId,  setContaId]  = useState(() => mobileSelecionado ?? contasCartao[0]?.id ?? 'c1')
  const [mes,      setMes]      = useState(mesHoje)
  const [ano,      setAno]      = useState(anoHoje)
  const [diaSel,   setDiaSel]   = useState<number>(diaHoje)
  const [editandoId,           setEditandoId]           = useState<string|null>(null)
  const [editandoDiaOriginal,  setEditandoDiaOriginal]  = useState<number|null>(null)
  const [fTipo,    setFTipo]    = useState<TipoLanc>('entrada')
  const [fCat,     setFCat]     = useState('')
  const [fDesc,    setFDesc]    = useState('')
  const [fValor,   setFValor]   = useState('')
  const [fParcelas, setFParcelas] = useState('1')
  const [fDataCompra, setFDataCompra] = useState('')
  const [editandoFechamento, setEditandoFechamento] = useState(false)
  const [editandoVencimento, setEditandoVencimento] = useState(false)
  const [editFechVal, setEditFechVal] = useState(1)
  const [editVencVal, setEditVencVal] = useState(1)
  const [diasFechados, setDiasFechados] = useState<Set<string>>(new Set())
  const [modalFatura, setModalFatura]       = useState(false)
  const [modalFaturaValor, setModalFaturaValor] = useState('')

  const [mostrarCalendario, setMostrarCalendario] = useState(false)
  const [anoCalendario,     setAnoCalendario]     = useState(anoHoje)
  const [calPos,            setCalPos]            = useState({top:0,left:0})
  const calBtnRef      = useRef<HTMLButtonElement>(null)
  const categoriaSelectRef  = useRef<HTMLSelectElement>(null)
  const valorInputRef       = useRef<HTMLInputElement>(null)
  const dataCompraRef       = useRef<HTMLInputElement>(null)
  const parcelasBtnRefs     = useRef<(HTMLButtonElement|null)[]>([])

  const contaInfo        = contas.find(c => c.id === contaId)
  // Datas base do cartão
  const diaFechamentoBase = contaInfo?.diaFechamento ?? 1
  const diaVencimentoBase = contaInfo?.diaVencimento ?? 1
  // billingOffset: vencimento cai no mês seguinte ao fechamento quando diaVenc < diaFech
  const billingOffset    = diaVencimentoBase < diaFechamentoBase ? 1 : 0

  // Tab = mês de VENCIMENTO (pagamento). Mês de compra = tab - offset
  let _pMes = mes - billingOffset, _pAno = ano
  if (_pMes < 0) { _pMes += 12; _pAno-- }
  const purchaseMes   = _pMes   // mês do calendário onde as compras ocorreram
  const purchaseAno   = _pAno

  const totalDias     = diasNoMes(purchaseMes, purchaseAno)
  const eMesAtual     = purchaseMes === mesHoje && purchaseAno === anoHoje
  const key           = mesKey(contaId, purchaseAno, purchaseMes)
  const mesDados      = dados[key] ?? DADOS_MES_VAZIO

  // Datas efetivas (com override por mês)
  const diaFechamento = mesDados.fechamentoOverride ?? diaFechamentoBase
  const diaVencimento = mesDados.vencimentoOverride ?? diaVencimentoBase

  // Vencimento = a própria aba (mes = mês de pagamento)
  const mesVenc = mes
  const anoVenc = ano

  // Status da fatura
  const faturaStatus =
    new Date(anoVenc, mesVenc, diaVencimento) <= hoje ? 'paga' :
    new Date(purchaseAno, purchaseMes, diaFechamento) <= hoje ? 'fechada' : 'aberta'

  // Todas as categorias de saída ativas — cartão pode cobrir qualquer tipo de gasto
  const categoriasCartao = categorias
    .filter(c => c.tipo === 'saida' && c.ativa)
    .sort((a,b) => a.nome.localeCompare(b.nome,'pt-BR'))

  // Sincroniza totais das faturas como lançamentos previstos no extrato bancário
  useEffect(() => {
    const extrato = { ...extratoRef.current } as Record<string, { lancamentos: Record<number, unknown[]>; saldoBanco: string }>

    for (const fatKey of Object.keys(dados)) {
      const parts = fatKey.split('-')
      if (parts.length !== 3) continue
      const [cId, aStr, mStr] = parts
      const a = parseInt(aStr)
      const m = parseInt(mStr) - 1  // mês de compra (0-based)
      if (isNaN(a) || isNaN(m)) continue

      const contaCartao = contas.find(c => c.id === cId && c.tipo === 'cartao')
      if (!contaCartao) continue

      const diaFechBase = contaCartao.diaFechamento ?? 1
      const diaVencBase = contaCartao.diaVencimento ?? 1

      // Mês de vencimento: próximo mês quando diaVenc < diaFech (caso comum)
      let vencMes = m, vencAno = a
      if (diaVencBase < diaFechBase) {
        vencMes = m + 1
        if (vencMes > 11) { vencMes = 0; vencAno++ }
      }

      // Débito automático → banco vinculado; caso contrário → todos os bancos correntes
      const bankIds: string[] = contaCartao.formaPagamentoFatura === 'automatico' && contaCartao.contaPagamentoId
        ? [contaCartao.contaPagamentoId]
        : contas.filter(c => c.tipo === 'corrente').map(c => c.id)
      if (bankIds.length === 0) continue

      const dm = dados[fatKey]
      const nDias = diasNoMes(m, a)
      let saidas = 0, entradas = 0
      for (let d = 1; d <= nDias; d++) {
        ;(dm.lancamentos[d] ?? []).forEach(l => {
          l.tipo === 'entrada' ? entradas += l.valor : saidas += l.valor
        })
      }
      const total = entradas - saidas

      const diaVenc = dm.vencimentoOverride ?? diaVencBase
      const lancId = `fatura-${cId}-${a}-${String(m + 1).padStart(2, '0')}`
      const descricao = `Fatura ${contaCartao.banco}`

      for (const bankId of bankIds) {
        const extratoKey = `${bankId}-${vencAno}-${String(vencMes + 1).padStart(2, '0')}`
        const extratoMes = extrato[extratoKey] ?? { lancamentos: {}, saldoBanco: '' }
        const novaLancs: Record<number, unknown[]> = {}
        for (const dStr in extratoMes.lancamentos) {
          const dNum = parseInt(dStr)
          novaLancs[dNum] = (extratoMes.lancamentos[dNum] ?? []).filter((l: unknown) => (l as { id: string }).id !== lancId)
        }
        if (total > 0) {
          novaLancs[diaVenc] = [
            ...(novaLancs[diaVenc] ?? []).filter((l: unknown) => (l as { id: string }).id !== lancId),
            { id: lancId, tipo: 'saida', descricao, categoria: descricao,
              valor: total, formaPagamento: 'debito', tipoLanc: 'fixa' },
          ]
        }
        extrato[extratoKey] = { ...extratoMes, lancamentos: novaLancs }
      }
    }

    setExtratoData(extrato as unknown as Record<string, ExtratoDadosMes>)
  }, [dados, contas]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-avança para a aba do mês de vencimento da fatura em aberto
  useEffect(() => {
    const conta = contas.find(c => c.id === contaId)
    const diaFech = conta?.diaFechamento ?? 1
    const diaVenc = conta?.diaVencimento ?? 1
    const offset  = diaVenc < diaFech ? 1 : 0
    // Tab = mês de vencimento: antes do fechamento → mesHoje+offset; depois → mesHoje+1+offset
    const rawM = (diaHoje >= diaFech ? mesHoje + 1 : mesHoje) + offset
    let tabMes = rawM, tabAno = anoHoje
    if (tabMes > 11) { tabMes -= 12; tabAno++ }
    setMes(tabMes); setAno(tabAno)
    setDiaSel(diaHoje >= diaFech ? 1 : diaHoje)
  }, [contaId, contas])

  useEffect(() => { if (mobileSelecionado) setContaId(mobileSelecionado) }, [mobileSelecionado])
  useEffect(() => { onCartaoChange?.(contaId) }, [contaId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Modal "valor da fatura" — abre uma vez por dia por fatura
  // Delay de 50ms: aguarda o auto-avança (efeito anterior) corrigir o mês/key antes de abrir
  useEffect(() => {
    if (carregando) return
    const dm = dados[key] ?? DADOS_MES_VAZIO
    if (dm.faturaAtualData === hojeStr) return
    const t = setTimeout(() => {
      setModalFaturaValor(dm.faturaAtual ?? '')
      setModalFatura(true)
    }, 50)
    return () => clearTimeout(t)
  }, [key, carregando]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleDia(dateKey: string) {
    setDiasFechados(prev => {
      const next = new Set(prev)
      next.has(dateKey) ? next.delete(dateKey) : next.add(dateKey)
      return next
    })
  }

  // Limpa dias fechados ao trocar de conta/mês
  useEffect(() => { setDiasFechados(new Set()) }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mostrarCalendario) return
    const fechar = () => setMostrarCalendario(false)
    document.addEventListener('click', fechar)
    return () => document.removeEventListener('click', fechar)
  }, [mostrarCalendario])

  function diaDefaultPara(novoMes: number, novoAno: number) {
    // novoMes é mês de vencimento; mês de compra = novoMes - billingOffset
    let pMes = novoMes - billingOffset, pAno = novoAno
    if (pMes < 0) { pMes += 12; pAno-- }
    return (pMes === mesHoje && pAno === anoHoje) ? diaHoje : 1
  }

  function ehDiaFuturo(dia: number) {
    const passadoDia = eMesAtual ? dia < diaHoje : (ano<anoHoje || (ano===anoHoje && mes<mesHoje))
    const ehHojeDia  = eMesAtual && dia === diaHoje
    return !passadoDia && !ehHojeDia
  }

  function confirmarModalFatura() {
    const n = parseBRL(modalFaturaValor)
    if (modalFaturaValor.trim()) {
      updateMes(prev => ({...prev, faturaAtual: fmt(n), faturaAtualData: hojeStr}))
    } else {
      updateMes(prev => ({...prev, faturaAtualData: hojeStr}))
    }
    setModalFatura(false)
    setTimeout(() => dataCompraRef.current?.focus(), 80)
  }

  function resetarParaNovo(novoDia: number) {
    setDiaSel(novoDia); setEditandoId(null); setEditandoDiaOriginal(null)
    setFTipo('entrada'); setFCat(''); setFDesc(''); setFValor(''); setFParcelas('1'); setFDataCompra('')
    setTimeout(() => dataCompraRef.current?.focus(), 50)
  }

  function editarLancamento(dia: number, l: Lancamento) {
    setDiaSel(dia); setEditandoId(l.id); setEditandoDiaOriginal(dia)
    setFTipo(l.tipo); setFCat(l.categoria); setFDesc(l.descricao)
    setFValor(String(l.valor).replace('.', ','))
    setFParcelas(String(l.parcelas ?? 1))
    const dc = l.diaCompra ?? dia
    const mc = l.mesCompra ?? purchaseMes
    const ac = l.anoCompra ?? purchaseAno
    const acStr = ac !== purchaseAno ? `/${ac}` : ''
    setFDataCompra(`${String(dc).padStart(2,'0')}/${String(mc+1).padStart(2,'0')}${acStr}`)
    setTimeout(() => dataCompraRef.current?.focus(), 50)
  }

  function updateMes(fn: (prev: DadosMes) => DadosMes) {
    setDados(prev => ({ ...prev, [key]: fn(prev[key] ?? DADOS_MES_VAZIO) }))
  }

  const { totalEntradas, totalSaidas } = useMemo(() => {
    const dadosMesAtual = dados[key]
    const lancs = (dadosMesAtual ?? DADOS_MES_VAZIO).lancamentos
    let te=0, ts=0
    for (let d=1; d<=totalDias; d++) {
      ;(lancs[d]??[]).forEach(l=>{ l.tipo==='entrada'?te+=l.valor:ts+=l.valor })
    }
    return { totalEntradas:te, totalSaidas:ts }
  }, [dados, key, totalDias])

  const totalFatura  = totalEntradas - totalSaidas
  const faturaExtNum = parseBRL(mesDados.faturaAtual ?? '')
  const diferenca    = faturaExtNum > 0 ? faturaExtNum - totalFatura : null
  const conciliado   = diferenca !== null && Math.abs(diferenca) < 0.01

  const totalPrevisto = useMemo(() => {
    const planosAno = (planos as Record<number, { saidas: { nome: string; v: number[] }[] }>)[purchaseAno]
    if (!planosAno) return 0
    return planosAno.saidas
      .filter(pc => {
        const cat = categorias.find(c => c.nome === pc.nome)
        return cat?.tipoMovimento === 'cartao' && cat?.ativa
      })
      .reduce((s, pc) => s + (pc.v[purchaseMes] ?? 0), 0)
  }, [planos, categorias, purchaseAno, purchaseMes])

  const grandTotalFaturas = useMemo(() => {
    return contas.filter(c => c.tipo === 'cartao').reduce((total, c) => {
      const off = (c.diaVencimento ?? 1) < (c.diaFechamento ?? 1) ? 1 : 0
      let pMes = mes - off, pAno = ano
      if (pMes < 0) { pMes += 12; pAno-- }
      const nDias = diasNoMes(pMes, pAno)
      const k = mesKey(c.id, pAno, pMes)
      const dm = dados[k] ?? DADOS_MES_VAZIO
      let saidas = 0, entradas = 0
      for (let d = 1; d <= nDias; d++) {
        ;(dm.lancamentos[d] ?? []).forEach(l => {
          l.tipo === 'entrada' ? entradas += l.valor : saidas += l.valor
        })
      }
      return total + (entradas - saidas)
    }, 0)
  }, [dados, mes, ano, contas])

  function lancar() {
    const valorParcela = parseBRL(fValor)
    const nParcelas    = Math.max(1, parseInt(fParcelas) || 1)
    if (!fCat || valorParcela <= 0) return
    const baseId = `v-${Date.now()}`
    // Resolve data de compra a partir do campo livre
    const parsedCompra = parseDateFatura(fDataCompra, purchaseMes, purchaseAno)
    const diaCompraFinal = parsedCompra?.dia ?? diaSel
    const mesCompraFinal = parsedCompra?.mes ?? purchaseMes
    const anoCompraFinal = parsedCompra?.ano ?? purchaseAno

    // Se a data de compra for após o fechamento desta fatura → lança na próxima
    const routeToNext = !editandoId && (() => {
      if (anoCompraFinal > purchaseAno) return true
      if (anoCompraFinal < purchaseAno) return false
      if (mesCompraFinal > purchaseMes) return true
      if (mesCompraFinal < purchaseMes) return false
      return diaCompraFinal > diaFechamento
    })()
    let targetMes = purchaseMes, targetAno = purchaseAno
    if (routeToNext) {
      targetMes++; if (targetMes > 11) { targetMes = 0; targetAno++ }
    }

    if (editandoId) {
      const diaOrigem = editandoDiaOriginal ?? diaSel
      const idAtual   = editandoId
      const futuroAlvo = ehDiaFuturo(diaSel)
      setDados(prev => {
        const dmCurrent = prev[key] ?? DADOS_MES_VAZIO
        const listaOrigem = dmCurrent.lancamentos[diaOrigem] ?? []
        const entrada = listaOrigem.find(l => l.id === idAtual)
        if (!entrada) return prev
        const novoConsolidado = diaOrigem !== diaSel ? !futuroAlvo : entrada.consolidado
        const atualizada: Lancamento = {
          ...entrada, tipo:fTipo, descricao:fDesc.trim()||fCat, categoria:fCat,
          valor:valorParcela, formaPagamento:'credito', consolidado:novoConsolidado,
          parcelas:nParcelas>1?nParcelas:undefined, parcelaAtual:entrada.parcelaAtual,
          diaCompra:diaCompraFinal, mesCompra:mesCompraFinal, anoCompra:anoCompraFinal,
        }
        const dmUpdated = diaOrigem === diaSel
          ? { ...dmCurrent, lancamentos: { ...dmCurrent.lancamentos, [diaOrigem]: listaOrigem.map(l => l.id===idAtual ? atualizada : l) } }
          : {
              ...dmCurrent,
              lancamentos: {
                ...dmCurrent.lancamentos,
                [diaOrigem]: listaOrigem.filter(l => l.id !== idAtual),
                [diaSel]: [...(dmCurrent.lancamentos[diaSel] ?? []), atualizada],
              },
            }
        let result = { ...prev, [key]: dmUpdated }
        // Propagate category/description changes to sibling installments in other months
        const novaDesc = fDesc.trim() || fCat
        if (entrada.parcelas && entrada.parcelas > 1 && (fCat !== entrada.categoria || novaDesc !== entrada.descricao)) {
          const baseId = entrada.id.replace(/-\d+$/, '')
          const totalParcelas = entrada.parcelas
          const currentParcela = entrada.parcelaAtual ?? 1
          // Compute the purchase month of installment 1
          let baseMes = purchaseMes - (currentParcela - 1)
          let baseAno = purchaseAno
          while (baseMes < 0) { baseMes += 12; baseAno-- }
          for (let p = 1; p <= totalParcelas; p++) {
            if (p === currentParcela) continue
            let m = baseMes + (p - 1)
            let a = baseAno
            while (m > 11) { m -= 12; a++ }
            const sibKey = mesKey(contaId, a, m)
            const sibDm = result[sibKey] as DadosMes | undefined
            if (!sibDm?.lancamentos) continue
            const targetId = `${baseId}-${p}`
            let dmChanged = false
            const newLancs: Record<number, Lancamento[]> = {}
            for (const [dStr, list] of Object.entries(sibDm.lancamentos)) {
              const d = parseInt(dStr)
              const newList = (list as Lancamento[]).map(l => {
                if (l.id === targetId) { dmChanged = true; return { ...l, categoria: fCat, descricao: novaDesc } }
                return l
              })
              newLancs[d] = newList
            }
            if (dmChanged) result = { ...result, [sibKey]: { ...sibDm, lancamentos: newLancs } }
          }
        }
        return result
      })
    } else if (nParcelas > 1) {
      // Cria entrada em cada mês subsequente (começa no targetMes se após fechamento)
      setDados(prev => {
        let result = { ...prev }
        for (let p = 1; p <= nParcelas; p++) {
          let m = targetMes + (p - 1)
          let a = targetAno
          while (m > 11) { m -= 12; a++ }
          const k = mesKey(contaId, a, m)
          const dadosMes = result[k] ?? DADOS_MES_VAZIO
          const desc = fDesc.trim() || fCat
          result = {
            ...result,
            [k]: {
              ...dadosMes,
              lancamentos: {
                ...dadosMes.lancamentos,
                [diaSel]: [...(dadosMes.lancamentos[diaSel]??[]), {
                  id:`${baseId}-${p}`, tipo:fTipo,
                  descricao:desc, categoria:fCat,
                  valor:valorParcela, formaPagamento:'credito' as FormaPag, tipoLanc:'variavel' as const,
                  consolidado: p===1 ? !ehDiaFuturo(diaSel) : false,
                  parcelas:nParcelas, parcelaAtual:p,
                  diaCompra:diaCompraFinal, mesCompra:mesCompraFinal, anoCompra:anoCompraFinal,
                }],
              }
            }
          }
        }
        return result
      })
    } else {
      // Avista — vai para targetKey (próxima fatura se após fechamento)
      const lancKey = routeToNext ? mesKey(contaId, targetAno, targetMes) : key
      setDados(prev => {
        const dm = prev[lancKey] ?? DADOS_MES_VAZIO
        return {
          ...prev,
          [lancKey]: {
            ...dm,
            lancamentos: {
              ...dm.lancamentos,
              [diaSel]: [...(dm.lancamentos[diaSel]??[]), {
                id:`${baseId}-1`, tipo:fTipo,
                descricao:fDesc.trim()||fCat, categoria:fCat,
                valor:valorParcela, formaPagamento:'credito' as FormaPag, tipoLanc:'variavel' as const,
                consolidado: !ehDiaFuturo(diaSel),
                diaCompra:diaCompraFinal, mesCompra:mesCompraFinal, anoCompra:anoCompraFinal,
              }],
            }
          }
        }
      })
    }

    setEditandoId(null); setEditandoDiaOriginal(null)
    setFCat(''); setFDesc(''); setFValor(''); setFParcelas('1')
    setTimeout(() => { const el = dataCompraRef.current; if (el) { el.focus(); el.select() } }, 80)
  }

  function excluirAtual() {
    if (!editandoId) return
    if (!window.confirm('Excluir este lançamento?')) return
    const diaAlvo = editandoDiaOriginal ?? diaSel
    const idAtual = editandoId
    updateMes(prev => ({
      ...prev,
      lancamentos: { ...prev.lancamentos, [diaAlvo]: (prev.lancamentos[diaAlvo]??[]).filter(l=>l.id!==idAtual) }
    }))
    setEditandoId(null); setEditandoDiaOriginal(null)
    setFCat(''); setFDesc(''); setFValor(''); setFParcelas('1')
  }

  function excluir(dia: number, id: string) {
    updateMes(prev => ({
      ...prev,
      lancamentos: { ...prev.lancamentos, [dia]: (prev.lancamentos[dia]??[]).filter(l=>l.id!==id) }
    }))
    if (editandoId === id) {
      setEditandoId(null); setEditandoDiaOriginal(null)
      setFCat(''); setFDesc(''); setFValor(''); setFParcelas('1')
    }
  }

  // ── Mobile ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <FcMobileView
        contasCartao={contasCartao}
        contaId={contaId} setContaId={setContaId}
        mes={mes} setMes={setMes} ano={ano} setAno={setAno}
        anoHoje={anoHoje} diaHoje={diaHoje}
        mobileView={mobileView} setMobileView={setMobileView}
        editandoFechamento={editandoFechamento} setEditandoFechamento={setEditandoFechamento}
        editandoVencimento={editandoVencimento} setEditandoVencimento={setEditandoVencimento}
        editFechVal={editFechVal} setEditFechVal={setEditFechVal}
        editVencVal={editVencVal} setEditVencVal={setEditVencVal}
        fTipo={fTipo} setFTipo={setFTipo}
        fCat={fCat} setFCat={setFCat}
        fDesc={fDesc} setFDesc={setFDesc}
        fValor={fValor} setFValor={setFValor}
        fParcelas={fParcelas} setFParcelas={setFParcelas}
        fDataCompra={fDataCompra} setFDataCompra={setFDataCompra}
        editandoId={editandoId} setEditandoId={setEditandoId}
        editandoDiaOriginal={editandoDiaOriginal} setEditandoDiaOriginal={setEditandoDiaOriginal}
        diaSel={diaSel} setDiaSel={setDiaSel}
        diaFechamento={diaFechamento} diaVencimento={diaVencimento}
        diaFechamentoBase={diaFechamentoBase} diaVencimentoBase={diaVencimentoBase}
        mesDados={mesDados} totalDias={totalDias}
        purchaseMes={purchaseMes} purchaseAno={purchaseAno}
        faturaStatus={faturaStatus as 'paga' | 'fechada' | 'aberta'}
        totalPrevisto={totalPrevisto} grandTotalFaturas={grandTotalFaturas}
        totalFatura={totalFatura} mesVenc={mesVenc} anoVenc={anoVenc}
        categorias={categorias} categoriasCartao={categoriasCartao}
        dataCompraRef={dataCompraRef}
        categoriaSelectRef={categoriaSelectRef}
        valorInputRef={valorInputRef}
        parcelasBtnRefs={parcelasBtnRefs}
        resetarParaNovo={resetarParaNovo}
        editarLancamento={editarLancamento}
        excluir={excluir}
        updateMes={updateMes}
        lancar={lancar}
        diaDefaultPara={diaDefaultPara}
      />
    )
  }

  // ── Desktop ─────────────────────────────────────────────────────────
  return (
    <div style={{flex:1,display:'flex',flexDirection:'row',overflow:'hidden',background:COR.fundo}}>
      <FcDesktopLeft
        contasCartao={contasCartao}
        contaId={contaId} setContaId={setContaId}
        mes={mes} setMes={setMes} ano={ano} setAno={setAno}
        totalFatura={totalFatura}
        totalPrevisto={totalPrevisto} grandTotalFaturas={grandTotalFaturas}
        diferenca={diferenca} conciliado={conciliado}
        faturaStatus={faturaStatus as 'paga' | 'fechada' | 'aberta'}
        diaFechamento={diaFechamento} diaVencimento={diaVencimento}
        mesDados={mesDados} totalDias={totalDias}
        purchaseMes={purchaseMes} purchaseAno={purchaseAno}
        mesVenc={mesVenc} anoVenc={anoVenc}
        editandoId={editandoId}
        diasFechados={diasFechados}
        categorias={categorias}
        mostrarCalendario={mostrarCalendario} setMostrarCalendario={setMostrarCalendario}
        anoCalendario={anoCalendario} setAnoCalendario={setAnoCalendario}
        calPos={calPos} setCalPos={setCalPos}
        calBtnRef={calBtnRef}
        resetarParaNovo={resetarParaNovo}
        diaDefaultPara={diaDefaultPara}
        editarLancamento={editarLancamento}
        excluir={excluir}
        toggleDia={toggleDia}
        setDiaSel={setDiaSel}
      />
      <FcDesktopPanel
        editandoId={editandoId}
        editandoFechamento={editandoFechamento} setEditandoFechamento={setEditandoFechamento}
        editandoVencimento={editandoVencimento} setEditandoVencimento={setEditandoVencimento}
        fTipo={fTipo} setFTipo={setFTipo}
        fCat={fCat} setFCat={setFCat}
        fDesc={fDesc} setFDesc={setFDesc}
        fValor={fValor} setFValor={setFValor}
        fParcelas={fParcelas} setFParcelas={setFParcelas}
        fDataCompra={fDataCompra} setFDataCompra={setFDataCompra}
        diaFechamento={diaFechamento} diaVencimento={diaVencimento}
        diaFechamentoBase={diaFechamentoBase} diaVencimentoBase={diaVencimentoBase}
        mesDados={mesDados}
        purchaseMes={purchaseMes} purchaseAno={purchaseAno}
        diaSel={diaSel} setDiaSel={setDiaSel}
        mesVenc={mesVenc} anoVenc={anoVenc}
        categoriasCartao={categoriasCartao}
        dataCompraRef={dataCompraRef}
        categoriaSelectRef={categoriaSelectRef}
        valorInputRef={valorInputRef}
        parcelasBtnRefs={parcelasBtnRefs}
        resetarParaNovo={resetarParaNovo}
        excluirAtual={excluirAtual}
        lancar={lancar}
        updateMes={updateMes}
        setModalFatura={setModalFatura}
        setModalFaturaValor={setModalFaturaValor}
      />
      <FcModal
        modalFatura={modalFatura} setModalFatura={setModalFatura}
        modalFaturaValor={modalFaturaValor} setModalFaturaValor={setModalFaturaValor}
        contaInfo={contaInfo}
        hojeStr={hojeStr}
        confirmarModalFatura={confirmarModalFatura}
        updateMes={updateMes}
      />
    </div>
  )
}
