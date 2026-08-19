import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import type { DadosMes as ExtratoDadosMes } from '../context/AppContext'
import {
  COR, DADOS_MES_VAZIO,
  diasNoMes, mesKey, fmt, parseBRL, parseDateFatura,
  type TipoLanc, type FormaPag, type Lancamento, type DadosMes,
} from '../components/faturaCartao/FcShared'
import FcMobileView from '../components/faturaCartao/FcMobileView'
import FcBanner from '../components/faturaCartao/FcBanner'
import FcDesktopLeft from '../components/faturaCartao/FcDesktopLeft'
import FcDesktopPanel from '../components/faturaCartao/FcDesktopPanel'
import FcModal from '../components/faturaCartao/FcModal'
import FcConfirmModal from '../components/faturaCartao/FcConfirmModal'

function useIsMobile() {
  const [m, setM] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const fn = () => setM(window.innerWidth < 640)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return m
}

type Props = {
  mobileSelecionado?: string
  onVoltar?: () => void
  onCartaoChange?: (id: string) => void
  mes: number
  setMes: React.Dispatch<React.SetStateAction<number>>
  ano: number
  setAno: React.Dispatch<React.SetStateAction<number>>
}

export default function FaturaCartao({ mobileSelecionado, onCartaoChange, mes, setMes, ano, setAno }: Props) {
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
  const [fVariante, setFVariante] = useState('')
  const [modalFatura, setModalFatura]       = useState(false)
  const [modalFaturaValor, setModalFaturaValor] = useState('')
  const [confirmacao, setConfirmacao] = useState<{ mensagem: string; detalhe?: string; onConfirmar: () => void } | null>(null)

  function pedirConfirmacao(mensagem: string, onConfirmar: () => void, detalhe?: string) {
    setConfirmacao({ mensagem, detalhe, onConfirmar })
  }

  const categoriaSelectRef  = useRef<HTMLSelectElement>(null)
  const valorInputRef       = useRef<HTMLInputElement>(null)
  const dataCompraRef       = useRef<HTMLInputElement>(null)
  const parcelasBtnRefs     = useRef<(HTMLButtonElement|null)[]>([])

  const contaInfo        = contas.find(c => c.id === contaId)
  const diaFechamentoBase = contaInfo?.diaFechamento ?? 1
  const diaVencimentoBase = contaInfo?.diaVencimento ?? 1
  const billingOffset    = diaVencimentoBase < diaFechamentoBase ? 1 : 0

  let _pMes = mes - billingOffset, _pAno = ano
  if (_pMes < 0) { _pMes += 12; _pAno-- }
  const purchaseMes   = _pMes
  const purchaseAno   = _pAno

  const totalDias     = diasNoMes(purchaseMes, purchaseAno)
  const eMesAtual     = purchaseMes === mesHoje && purchaseAno === anoHoje
  const key           = mesKey(contaId, purchaseAno, purchaseMes)
  const mesDados      = dados[key] ?? DADOS_MES_VAZIO

  const diaFechamento = mesDados.fechamentoOverride ?? diaFechamentoBase
  const diaVencimento = mesDados.vencimentoOverride ?? diaVencimentoBase

  const mesVenc = mes
  const anoVenc = ano

  const faturaStatus =
    new Date(anoVenc, mesVenc, diaVencimento) <= hoje ? 'paga' :
    new Date(purchaseAno, purchaseMes, diaFechamento) <= hoje ? 'fechada' : 'aberta'

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
      const m = parseInt(mStr) - 1
      if (isNaN(a) || isNaN(m)) continue

      const contaCartao = contas.find(c => c.id === cId && c.tipo === 'cartao')
      if (!contaCartao) continue

      const diaFechBase = contaCartao.diaFechamento ?? 1
      const diaVencBase = contaCartao.diaVencimento ?? 1

      let vencMes = m, vencAno = a
      if (diaVencBase < diaFechBase) {
        vencMes = m + 1
        if (vencMes > 11) { vencMes = 0; vencAno++ }
      }

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
    const rawM = (diaHoje >= diaFech ? mesHoje + 1 : mesHoje) + offset
    let tabMes = rawM, tabAno = anoHoje
    if (tabMes > 11) { tabMes -= 12; tabAno++ }
    setMes(tabMes); setAno(tabAno)
    setDiaSel(diaHoje >= diaFech ? 1 : diaHoje)
  }, [contaId, contas])

  useEffect(() => { if (mobileSelecionado) setContaId(mobileSelecionado) }, [mobileSelecionado])
  useEffect(() => { onCartaoChange?.(contaId) }, [contaId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Modal "valor da fatura" — abre uma vez por dia por fatura
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

  useEffect(() => { setDiasFechados(new Set()) }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  function diaDefaultPara(novoMes: number, novoAno: number) {
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
    setFTipo('entrada'); setFCat(''); setFDesc(''); setFVariante(''); setFValor(''); setFParcelas('1'); setFDataCompra('')
    setTimeout(() => dataCompraRef.current?.focus(), 50)
  }

  function editarLancamento(dia: number, l: Lancamento) {
    setDiaSel(dia); setEditandoId(l.id); setEditandoDiaOriginal(dia)
    setFTipo(l.tipo); setFCat(l.categoria); setFDesc(l.descricao); setFVariante(l.subCategoria ?? '')
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
    const planosAno = (planos as Record<number, { saidas: { nome: string; v: number[] }[] }>)[ano]
    if (!planosAno) return 0
    return planosAno.saidas
      .filter(pc => {
        const cat = categorias.find(c => c.nome === pc.nome)
        return cat?.tipoMovimento === 'cartao' && cat?.ativa
      })
      .reduce((s, pc) => s + (pc.v[mes] ?? 0), 0)
  }, [planos, categorias, ano, mes])

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
    console.log('[lancar] chamado editandoId=', editandoId)
    const valorParcela = parseBRL(fValor)
    const nParcelas    = Math.max(1, parseInt(fParcelas) || 1)
    if (!fCat || valorParcela <= 0) return
    const baseId = `v-${Date.now()}`
    const norm = fCat.trim().toLowerCase()
    const subDescsDisponiveis = categoriasCartao
      .filter(c => c.nome.trim().toLowerCase() === norm && c.descricao)
      .map(c => c.descricao!)
    const subCatToSave = subDescsDisponiveis.length > 1 && fVariante
      ? (subDescsDisponiveis.includes(fVariante) ? fVariante : undefined)
      : undefined
    const parsedCompra = parseDateFatura(fDataCompra, purchaseMes, purchaseAno)
    const diaCompraFinal = parsedCompra?.dia ?? diaSel
    const mesCompraFinal = parsedCompra?.mes ?? purchaseMes
    const anoCompraFinal = parsedCompra?.ano ?? purchaseAno

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
          subCategoria: subCatToSave,
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
        const novaDesc = fDesc.trim() || fCat
        console.log('[parcelas-edit] entrada:', { id: entrada.id, parcelas: entrada.parcelas, parcelaAtual: entrada.parcelaAtual, valor: entrada.valor, categoria: entrada.categoria, descricao: entrada.descricao })
        console.log('[parcelas-edit] novo:', { fCat, novaDesc, valorParcela })
        if (entrada.parcelas && entrada.parcelas > 1 && (fCat !== entrada.categoria || novaDesc !== entrada.descricao || valorParcela !== entrada.valor)) {
          const baseId = entrada.id.replace(/-\d+$/, '')
          const totalParcelas = entrada.parcelas
          const currentParcela = entrada.parcelaAtual ?? 1
          let baseMes = purchaseMes - (currentParcela - 1)
          let baseAno = purchaseAno
          while (baseMes < 0) { baseMes += 12; baseAno-- }
          console.log('[parcelas-edit] propagando', { baseId, totalParcelas, currentParcela, baseMes, baseAno, purchaseMes, purchaseAno })
          for (let p = 1; p <= totalParcelas; p++) {
            if (p === currentParcela) continue
            let m = baseMes + (p - 1)
            let a = baseAno
            while (m > 11) { m -= 12; a++ }
            const sibKey = mesKey(contaId, a, m)
            const sibDm = result[sibKey] as DadosMes | undefined
            const targetId = `${baseId}-${p}`
            console.log(`[parcelas-edit] p=${p} sibKey=${sibKey} exists=${!!sibDm} targetId=${targetId}`)
            if (!sibDm?.lancamentos) { console.log(`[parcelas-edit] p=${p} SEM DADOS`); continue }
            let dmChanged = false
            const newLancs: Record<number, Lancamento[]> = {}
            for (const [dStr, list] of Object.entries(sibDm.lancamentos)) {
              const d = parseInt(dStr)
              const newList = (list as Lancamento[]).map(l => {
                console.log(`[parcelas-edit] p=${p} dia=${d} l.id=${l.id} vs targetId=${targetId}`)
                if (l.id === targetId) { dmChanged = true; return { ...l, categoria: fCat, descricao: novaDesc, subCategoria: subCatToSave, valor: valorParcela } }
                return l
              })
              newLancs[d] = newList
            }
            if (dmChanged) result = { ...result, [sibKey]: { ...sibDm, lancamentos: newLancs } }
            else console.log(`[parcelas-edit] p=${p} NÃO ENCONTROU targetId no mês`)
          }
        } else {
          console.log('[parcelas-edit] NÃO PROPAGOU - condição falsa:', { parcelas: entrada.parcelas, catMudou: fCat !== entrada.categoria, descMudou: novaDesc !== entrada.descricao, valMudou: valorParcela !== entrada.valor })
        }
        return result
      })
    } else if (nParcelas > 1) {
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
                  descricao:desc, categoria:fCat, subCategoria:subCatToSave,
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
                descricao:fDesc.trim()||fCat, categoria:fCat, subCategoria:subCatToSave,
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

  function excluirTodasParcelas(id: string, diaOrigem: number) {
    const lancamento = (dados[key]?.lancamentos[diaOrigem] ?? []).find(l => l.id === id)
    const totalParcelas = lancamento?.parcelas ?? 1
    const currentParcela = lancamento?.parcelaAtual ?? 1
    if (totalParcelas <= 1) {
      updateMes(prev => ({
        ...prev,
        lancamentos: { ...prev.lancamentos, [diaOrigem]: (prev.lancamentos[diaOrigem]??[]).filter(l=>l.id!==id) }
      }))
      return
    }
    const baseId = id.replace(/-\d+$/, '')
    setDados(prev => {
      let result = { ...prev }
      for (let p = 1; p <= totalParcelas; p++) {
        let m = mes - (currentParcela - 1) + (p - 1)
        let a = ano
        while (m < 0) { m += 12; a-- }
        while (m > 11) { m -= 12; a++ }
        const sibKey = mesKey(contaId, a, m)
        const sibDm = result[sibKey] as DadosMes | undefined
        if (!sibDm?.lancamentos) continue
        const targetId = `${baseId}-${p}`
        const newLancs: Record<number, Lancamento[]> = {}
        let changed = false
        for (const [dStr, list] of Object.entries(sibDm.lancamentos)) {
          const d = parseInt(dStr)
          const orig = list as Lancamento[]
          const filtered = orig.filter(l => l.id !== targetId)
          if (filtered.length !== orig.length) changed = true
          newLancs[d] = filtered
        }
        if (changed) result = { ...result, [sibKey]: { ...sibDm, lancamentos: newLancs } }
      }
      return result
    })
  }

  function excluirAtual() {
    if (!editandoId) return
    const diaAlvo = editandoDiaOriginal ?? diaSel
    const idAlvo = editandoId
    const lancamento = (dados[key]?.lancamentos[diaAlvo] ?? []).find(l => l.id === idAlvo)
    const totalParcelas = lancamento?.parcelas ?? 1
    const mensagem = totalParcelas > 1 ? 'Excluir parcelamento?' : 'Excluir lançamento?'
    const detalhe = totalParcelas > 1 ? `Todas as ${totalParcelas} parcelas serão removidas.` : undefined
    pedirConfirmacao(mensagem, () => {
      excluirTodasParcelas(idAlvo, diaAlvo)
      setEditandoId(null); setEditandoDiaOriginal(null)
      setFCat(''); setFDesc(''); setFVariante(''); setFValor(''); setFParcelas('1')
      if (isMobile) setMobileView('extrato')
    }, detalhe)
  }

  function excluir(dia: number, id: string) {
    const lancamento = (dados[key]?.lancamentos[dia] ?? []).find(l => l.id === id)
    const totalParcelas = lancamento?.parcelas ?? 1
    const doExcluir = () => {
      excluirTodasParcelas(id, dia)
      if (editandoId === id) {
        setEditandoId(null); setEditandoDiaOriginal(null)
        setFCat(''); setFDesc(''); setFVariante(''); setFValor(''); setFParcelas('1')
      }
      if (isMobile) setMobileView('extrato')
    }
    if (totalParcelas > 1) {
      pedirConfirmacao('Excluir parcelamento?', doExcluir, `Todas as ${totalParcelas} parcelas serão removidas.`)
    } else {
      pedirConfirmacao('Excluir lançamento?', doExcluir)
    }
  }

  // ── Mobile ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
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
        fVariante={fVariante} setFVariante={setFVariante}
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
      {confirmacao && (
        <FcConfirmModal
          mensagem={confirmacao.mensagem}
          detalhe={confirmacao.detalhe}
          onConfirmar={() => { confirmacao.onConfirmar(); setConfirmacao(null) }}
          onCancelar={() => setConfirmacao(null)}
        />
      )}
      </>
    )
  }

  // ── Desktop ─────────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: COR.fundo }}>
      <FcBanner
        contasCartao={contasCartao}
        contaId={contaId}
        onContaSelect={id => { setContaId(id); resetarParaNovo(diaDefaultPara(mes, ano)) }}
        totalPrevisto={totalPrevisto}
        grandTotalFaturas={grandTotalFaturas}
        faturaStatus={faturaStatus as 'paga' | 'fechada' | 'aberta'}
        diaVencimento={diaVencimento}
        mesDados={mesDados}
        diferenca={diferenca}
        conciliado={conciliado}
        setModalFatura={setModalFatura}
        setModalFaturaValor={setModalFaturaValor}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
        <FcDesktopLeft
          mesDados={mesDados}
          totalDias={totalDias}
          purchaseMes={purchaseMes}
          purchaseAno={purchaseAno}
          totalFatura={totalFatura}
          diaFechamento={diaFechamento}
          diaVencimento={diaVencimento}
          mesVenc={mesVenc}
          anoVenc={anoVenc}
          editandoId={editandoId}
          diasFechados={diasFechados}
          categorias={categorias}
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
          fVariante={fVariante} setFVariante={setFVariante}
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
        />
      </div>
      <FcModal
        modalFatura={modalFatura} setModalFatura={setModalFatura}
        modalFaturaValor={modalFaturaValor} setModalFaturaValor={setModalFaturaValor}
        contaInfo={contaInfo}
        hojeStr={hojeStr}
        confirmarModalFatura={confirmarModalFatura}
        updateMes={updateMes}
      />
      {confirmacao && (
        <FcConfirmModal
          mensagem={confirmacao.mensagem}
          detalhe={confirmacao.detalhe}
          onConfirmar={() => { confirmacao.onConfirmar(); setConfirmacao(null) }}
          onCancelar={() => setConfirmacao(null)}
        />
      )}
    </div>
  )
}
