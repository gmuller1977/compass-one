import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import type { DadosMes as ExtratoDadosMes } from '../context/AppContext'
import { iconeCategoria } from '../utils/categoriaIcone'

const COR = {
  azul: '#1a56db', azulEscuro: '#0f2878', azulMedio: '#2563eb',
  fundo: '#f0f4ff', branco: '#ffffff', texto: '#0f172a',
  textoSuave: '#64748b', borda: '#e2e8f0',
  verde: '#16a34a', vermelho: '#dc2626',
}

type TipoLanc = 'entrada' | 'saida'
type FormaPag = 'credito'


type Lancamento = {
  id: string; tipo: TipoLanc
  descricao: string; categoria: string
  valor: number; formaPagamento: FormaPag
  tipoLanc: 'fixa'|'variavel'
  consolidado?: boolean
  parcelas?: number
  parcelaAtual?: number
  diaCompra?: number; mesCompra?: number; anoCompra?: number
}

type DadosMes = {
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

const DADOS_MES_VAZIO: DadosMes = { lancamentos:{}, faturaAtual:'' }

function diasNoMes(mes: number, ano: number) { return new Date(ano, mes+1, 0).getDate() }
function diaSemana(d: number, m: number, a: number) {
  return ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][new Date(a,m,d).getDay()]
}
function mesKey(conta: string, ano: number, mes: number) {
  return `${conta}-${ano}-${String(mes+1).padStart(2,'0')}`
}
function fmt(v: number) { return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) }
function parseBRL(s: string) { return parseFloat(s.replace(/[R$\s.]/g,'').replace(',','.')) || 0 }

const NOMES_MESES  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function parseDateFatura(s: string, mesDefault: number, anoDefault: number): {dia:number;mes:number;ano:number}|null {
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

function useIsMobile() {
  const [m, setM] = useState(() => window.innerWidth < 640)
  useEffect(() => { const fn = () => setM(window.innerWidth < 640); window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn) }, [])
  return m
}

function realcarFoco(e: React.FocusEvent<HTMLElement>) {
  e.currentTarget.style.border = `1.5px solid ${COR.azul}`
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,86,219,0.15)'
}
function removerRealce(e: React.FocusEvent<HTMLElement>) {
  e.currentTarget.style.border = '1.5px solid #bae6fd'
  e.currentTarget.style.boxShadow = 'none'
}

export default function FaturaCartao({ mobileSelecionado }: { mobileSelecionado?: string; onVoltar?: () => void } = {}) {
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
    setFValor(fmt(l.valor * (l.parcelas ?? 1)))
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
    const nParcelas    = Math.max(1, parseInt(fParcelas) || 1)
    const valorParcela = parseBRL(fValor) / nParcelas
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
                  valor:valorParcela, formaPagamento:'credito', tipoLanc:'variavel',
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
                valor:valorParcela, formaPagamento:'credito', tipoLanc:'variavel',
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

  // Mês/ano de vencimento da fatura exibida
  if (isMobile) {
    const prevMesNav = () => { if (mes === 0) { setMes(11); setAno(y => y-1) } else setMes(m => m-1) }
    const nextMesNav = () => { if (mes === 11) { setMes(0); setAno(y => y+1) } else setMes(m => m+1) }
    const statusCor = faturaStatus==='paga' ? '#16a34a' : faturaStatus==='fechada' ? '#0369a1' : '#d97706'
    const statusLbl = faturaStatus==='paga' ? 'Paga' : faturaStatus==='fechada' ? 'Fechada' : 'Aberta'
    const disponivel = totalPrevisto - grandTotalFaturas
    return (
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:COR.fundo}}>

        {/* SUB-HEADER */}
        <div style={{flexShrink:0,background:COR.branco,boxShadow:'0 2px 6px rgba(0,0,0,0.06)'}}>
          {/* Cartão pills */}
          <div style={{display:'flex',gap:6,padding:'10px 14px 4px',overflowX:'auto',
            scrollbarWidth:'none' as const}}>
            {contasCartao.map(c => {
              const ativa = c.id === contaId
              return (
                <button key={c.id}
                  onClick={() => { setContaId(c.id); resetarParaNovo(diaDefaultPara(mes,ano)) }}
                  style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',
                    borderRadius:20,border:`1.5px solid ${ativa ? COR.azul : COR.borda}`,
                    background:ativa ? '#eff6ff' : '#f8faff',flexShrink:0,
                    cursor:'pointer',whiteSpace:'nowrap' as const,
                    fontFamily:'inherit',fontSize:12,fontWeight:600,
                    color:ativa ? COR.azul : COR.textoSuave}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:c.cor,flexShrink:0}}/>
                  <span style={{fontSize:14,lineHeight:1}}>{c.icone}</span>
                  {c.banco}{c.apelido ? ` ${c.apelido}` : ''}
                </button>
              )
            })}
          </div>
          {/* Mês nav + status badge */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
            padding:'8px 14px 10px'}}>
            <button onClick={prevMesNav} style={{width:30,height:30,borderRadius:9,border:'none',
              background:'#f0f4ff',display:'flex',alignItems:'center',justifyContent:'center',
              cursor:'pointer',fontSize:16,color:COR.azul,fontFamily:'inherit'}}>‹</button>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:15,fontWeight:700,color:COR.texto}}>
                {NOMES_MESES[mes]}{ano !== anoHoje ? ` ${ano}` : ''}
              </span>
              <span style={{fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:20,
                background:statusCor+'18',color:statusCor,border:`1px solid ${statusCor}44`}}>
                {statusLbl}
              </span>
            </div>
            <button onClick={nextMesNav} style={{width:30,height:30,borderRadius:9,border:'none',
              background:'#f0f4ff',display:'flex',alignItems:'center',justifyContent:'center',
              cursor:'pointer',fontSize:16,color:COR.azul,fontFamily:'inherit'}}>›</button>
          </div>
        </div>

        {/* INFO BAR: fecha · vence */}
        <div style={{flexShrink:0,background:COR.branco,borderBottom:`1px solid ${COR.borda}`,
          padding:'7px 14px',display:'flex',alignItems:'center',gap:5,flexWrap:'wrap' as const}}>
          <span style={{fontSize:11,color:'#94a3b8'}}>
            Fecha dia {diaFechamento} de {NOMES_MESES[purchaseMes]}
          </span>
          <span style={{color:'#e2e8f0',fontSize:12}}>·</span>
          <span style={{fontSize:11,color:'#94a3b8'}}>
            Vence dia {diaVencimento} de {NOMES_MESES[mesVenc]}{anoVenc !== anoHoje ? ` ${anoVenc}` : ''}
          </span>
        </div>

        {/* RESUMO STRIP */}
        <div style={{flexShrink:0,background:COR.branco,borderBottom:`2px solid ${COR.borda}`,
          padding:'10px 14px',display:'flex',gap:0}}>
          <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2,
            paddingRight:6,borderRight:`1px solid ${COR.borda}`}}>
            <span style={{fontSize:9,color:'#94a3b8',fontWeight:600,
              textTransform:'uppercase' as const,letterSpacing:.3,textAlign:'center' as const}}>
              Limite planejado
            </span>
            <span style={{fontSize:13,fontWeight:800,color:COR.azul,letterSpacing:-.3}}>
              {fmt(totalPrevisto)}
            </span>
          </div>
          <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2,
            padding:'0 6px',borderRight:`1px solid ${COR.borda}`}}>
            <span style={{fontSize:9,color:'#94a3b8',fontWeight:600,
              textTransform:'uppercase' as const,letterSpacing:.3,textAlign:'center' as const}}>
              Fatura total
            </span>
            <span style={{fontSize:13,fontWeight:800,color:COR.vermelho,letterSpacing:-.3}}>
              {fmt(grandTotalFaturas)}
            </span>
          </div>
          <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2,paddingLeft:6}}>
            <span style={{fontSize:9,color:'#94a3b8',fontWeight:600,
              textTransform:'uppercase' as const,letterSpacing:.3,textAlign:'center' as const}}>
              Disponível
            </span>
            <span style={{fontSize:13,fontWeight:800,
              color:disponivel>=0?COR.verde:COR.vermelho,letterSpacing:-.3}}>
              {fmt(disponivel)}
            </span>
          </div>
        </div>

        {/* FORM VIEW */}
        {mobileView === 'form' && (
          <div style={{flex:1,overflowY:'auto',scrollbarWidth:'none' as const}}>
            {/* Back bar */}
            <div style={{background:COR.branco,padding:'10px 16px',
              borderBottom:`1px solid ${COR.borda}`,
              display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
              <button onClick={() => { resetarParaNovo(diaSel); setMobileView('extrato') }}
                style={{border:'none',background:'transparent',color:COR.azul,
                  fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',padding:0}}>
                ‹ Voltar
              </button>
              <span style={{fontSize:14,fontWeight:700,color:COR.texto}}>
                {editandoId ? 'Editar lançamento' : 'Novo lançamento'}
              </span>
            </div>

            <div style={{padding:'14px',display:'flex',flexDirection:'column'}}>

              {/* Toggle Compra / Estorno */}
              <div style={{display:'flex',background:'#f1f5f9',borderRadius:12,
                padding:3,gap:3,marginBottom:16}}>
                {(['entrada','saida'] as const).map(t => {
                  const ativo = fTipo === t
                  const isCompra = t === 'entrada'
                  return (
                    <button key={t} onClick={() => setFTipo(t)} style={{
                      flex:1,padding:10,border:'none',borderRadius:10,cursor:'pointer',
                      fontSize:13,fontWeight:700,fontFamily:'inherit',
                      display:'flex',alignItems:'center',justifyContent:'center',gap:5,
                      background: ativo ? (isCompra ? '#fff1f2' : '#f0fdf4') : 'transparent',
                      color: ativo ? (isCompra ? '#dc2626' : '#16a34a') : '#94a3b8',
                      boxShadow: ativo ? (isCompra ? '0 2px 8px rgba(220,38,38,.12)' : '0 2px 8px rgba(22,163,74,.12)') : 'none',
                    }}>
                      {isCompra ? '↓ Compra' : '↑ Estorno'}
                    </button>
                  )
                })}
              </div>

              {/* Data da compra */}
              {(() => {
                const parsed = parseDateFatura(fDataCompra, purchaseMes, purchaseAno)
                const dispDia = parsed?.dia ?? diaSel
                const dispMes = parsed?.mes ?? purchaseMes
                const dispAno = parsed?.ano ?? purchaseAno
                const label = `📅 ${dispDia} de ${NOMES_MESES[dispMes]}${dispAno !== purchaseAno ? ' '+dispAno : ''} · ${diaSemana(dispDia,dispMes,dispAno)}`
                return (
                  <div style={{marginBottom:14}}>
                    <label style={{fontSize:10,fontWeight:700,color:COR.azul,
                      textTransform:'uppercase' as const,letterSpacing:.5,
                      marginBottom:5,display:'block'}}>
                      📅 Data da compra
                    </label>
                    <input ref={dataCompraRef} type="text" value={fDataCompra}
                      onChange={e => setFDataCompra(e.target.value)}
                      onBlur={() => {
                        const p = parseDateFatura(fDataCompra, purchaseMes, purchaseAno)
                        if (p) {
                          setDiaSel(p.dia)
                          const acStr = p.ano !== purchaseAno ? `/${p.ano}` : ''
                          setFDataCompra(`${String(p.dia).padStart(2,'0')}/${String(p.mes+1).padStart(2,'0')}${acStr}`)
                        }
                      }}
                      placeholder={`${String(diaSel).padStart(2,'0')}/${String(purchaseMes+1).padStart(2,'0')}`}
                      style={{width:'100%',border:`1.5px solid ${COR.borda}`,borderRadius:12,
                        padding:'11px 14px',fontSize:14,outline:'none',background:'#fff',
                        fontFamily:'inherit',color:COR.texto,boxSizing:'border-box' as const}}
                      onKeyDown={e => { if (e.key==='Enter') (e.target as HTMLInputElement).blur() }}/>
                    <div style={{fontSize:11,color:COR.azul,fontWeight:600,marginTop:4}}>{label}</div>
                  </div>
                )
              })()}

              {/* Categoria */}
              <div style={{marginBottom:14}}>
                <label style={{fontSize:10,fontWeight:700,color:COR.azul,
                  textTransform:'uppercase' as const,letterSpacing:.5,
                  marginBottom:5,display:'block'}}>🏷 Categoria</label>
                <select ref={categoriaSelectRef} value={fCat} onChange={e => setFCat(e.target.value)}
                  style={{width:'100%',border:`1.5px solid ${COR.borda}`,borderRadius:12,
                    padding:'11px 14px',fontSize:14,outline:'none',background:'#fff',
                    fontFamily:'inherit',color:COR.texto,
                    appearance:'none' as const,cursor:'pointer',
                    backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E\")",
                    backgroundRepeat:'no-repeat',backgroundPosition:'calc(100% - 14px) center'}}>
                  <option value="">Selecione...</option>
                  {categoriasCartao.map(c => (
                    <option key={c.id} value={c.nome}>{c.nome}</option>
                  ))}
                </select>
              </div>

              {/* Valor total */}
              <div style={{marginBottom:14}}>
                <label style={{fontSize:10,fontWeight:700,color:COR.azul,
                  textTransform:'uppercase' as const,letterSpacing:.5,
                  marginBottom:5,display:'block'}}>💰 Valor total</label>
                <input ref={valorInputRef} value={fValor}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g,'')
                    if (!digits) { setFValor(''); return }
                    const num = (parseInt(digits)/100).toFixed(2)
                    setFValor('R$ '+parseFloat(num).toLocaleString('pt-BR',{minimumFractionDigits:2}))
                  }}
                  placeholder="R$ 0,00"
                  style={{width:'100%',border:`2px solid ${COR.azul}`,borderRadius:12,
                    padding:'12px 14px',fontSize:22,fontWeight:800,color:COR.azul,
                    background:'#eff6ff',outline:'none',fontFamily:'inherit',
                    textAlign:'center' as const,letterSpacing:-.4,
                    boxSizing:'border-box' as const}}
                  onKeyDown={e => e.key==='Enter' && lancar()}/>
              </div>

              {/* Parcelas */}
              <div style={{marginBottom:14}}>
                <label style={{fontSize:10,fontWeight:700,color:COR.azul,
                  textTransform:'uppercase' as const,letterSpacing:.5,
                  marginBottom:5,display:'block'}}>🔢 Parcelas</label>
                <div style={{display:'flex',flexWrap:'wrap' as const,gap:7}}>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map((n, i) => {
                    const parcelasAtual = Math.max(1, parseInt(fParcelas) || 1)
                    const ativo = parcelasAtual === n
                    return (
                      <button key={n} ref={el => { parcelasBtnRefs.current[i] = el }}
                        tabIndex={ativo ? 0 : -1} onClick={() => setFParcelas(String(n))}
                        onKeyDown={e => {
                          if (e.key==='ArrowRight'||e.key==='ArrowDown') { e.preventDefault(); if (n<12) { setFParcelas(String(n+1)); parcelasBtnRefs.current[i+1]?.focus() } }
                          else if (e.key==='ArrowLeft'||e.key==='ArrowUp') { e.preventDefault(); if (n>1) { setFParcelas(String(n-1)); parcelasBtnRefs.current[i-1]?.focus() } }
                          else if (e.key==='Enter') { e.preventDefault(); lancar() }
                        }}
                        style={{width:46,height:36,borderRadius:9,
                          border:`1.5px solid ${ativo ? COR.azul : COR.borda}`,
                          background: ativo ? '#eff6ff' : '#fff',
                          fontSize:12,fontWeight:700,
                          color: ativo ? COR.azul : COR.textoSuave,
                          cursor:'pointer',fontFamily:'inherit',
                          display:'flex',alignItems:'center',justifyContent:'center',
                          boxShadow: ativo ? '0 0 0 2px rgba(26,86,219,.15)' : 'none'}}>
                        {n}x
                      </button>
                    )
                  })}
                </div>
                {parseBRL(fValor) > 0 && (
                  <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',
                    borderRadius:10,padding:'10px 14px',marginTop:8,
                    display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:11,color:COR.textoSuave}}>Valor de cada parcela</span>
                    <span style={{fontSize:14,fontWeight:800,color:'#16a34a'}}>
                      {fmt(parseBRL(fValor) / Math.max(1, parseInt(fParcelas)||1))} · {fParcelas||'1'}x
                    </span>
                  </div>
                )}
              </div>

              {/* Descrição */}
              <div style={{marginBottom:14}}>
                <label style={{fontSize:10,fontWeight:700,color:COR.azul,
                  textTransform:'uppercase' as const,letterSpacing:.5,
                  marginBottom:5,display:'block'}}>
                  📝 Descrição{' '}
                  <span style={{fontWeight:400,color:'#94a3b8',
                    textTransform:'none' as const,fontSize:9,letterSpacing:0}}>
                    (opcional)
                  </span>
                </label>
                <input value={fDesc} onChange={e => setFDesc(e.target.value)}
                  placeholder="Ex: Mercado Extra, Farmácia..."
                  style={{width:'100%',border:`1.5px solid ${COR.borda}`,borderRadius:12,
                    padding:'11px 14px',fontSize:14,outline:'none',background:'#fff',
                    fontFamily:'inherit',color:COR.texto,boxSizing:'border-box' as const}}
                  onKeyDown={e => e.key==='Enter' && lancar()}/>
              </div>

              {/* Botões */}
              <div style={{display:'flex',gap:8,marginTop:4,paddingBottom:20}}>
                {editandoId && (
                  <button onClick={() => {
                    if (!editandoId || !window.confirm('Excluir este lançamento?')) return
                    const diaAlvo = editandoDiaOriginal ?? diaSel
                    const idAtual = editandoId
                    updateMes(prev => ({...prev, lancamentos:{ ...prev.lancamentos, [diaAlvo]:(prev.lancamentos[diaAlvo]??[]).filter(l=>l.id!==idAtual) }}))
                    setEditandoId(null); setEditandoDiaOriginal(null)
                    setFCat(''); setFDesc(''); setFValor(''); setFParcelas('1')
                    setMobileView('extrato')
                  }} style={{
                    flex:1,padding:'13px 0',border:`1.5px solid ${COR.borda}`,
                    borderRadius:12,cursor:'pointer',fontSize:14,fontWeight:600,
                    background:COR.branco,color:COR.vermelho,fontFamily:'inherit'}}>
                    Excluir
                  </button>
                )}
                <button onClick={() => {
                  const valid = !!fCat && parseBRL(fValor) > 0
                  lancar()
                  if (valid) setMobileView('extrato')
                }} style={{
                  flex:2,padding:15,border:'none',borderRadius:14,
                  background:`linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,
                  color:'#fff',fontSize:16,fontWeight:800,cursor:'pointer',fontFamily:'inherit',
                  boxShadow:'0 4px 16px rgba(26,86,219,.3)'}}>
                  {editandoId ? '✓ Salvar alterações' : '✓ Salvar lançamento'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EXTRATO VIEW: flat list in one card */}
        {mobileView === 'extrato' && (
          <div style={{flex:1,overflowY:'auto',padding:'10px 14px 160px'}}>
            {(() => {
              const allItems: Array<{dia:number;dc:number;mc:number;ac:number;l:Lancamento}> = []
              for (let d = 1; d <= totalDias; d++) {
                for (const l of (mesDados.lancamentos[d] ?? [])) {
                  const dc = l.diaCompra ?? d
                  const mc = l.mesCompra ?? purchaseMes
                  const ac = l.anoCompra ?? purchaseAno
                  allItems.push({dia:d, dc, mc, ac, l})
                }
              }
              if (allItems.length === 0) {
                return (
                  <div style={{textAlign:'center' as const,color:COR.textoSuave,padding:40,fontSize:13}}>
                    Nenhum lançamento nesta fatura.
                  </div>
                )
              }
              allItems.sort((a, b) => {
                const ka = `${a.ac}-${String(a.mc+1).padStart(2,'0')}-${String(a.dc).padStart(2,'0')}`
                const kb = `${b.ac}-${String(b.mc+1).padStart(2,'0')}-${String(b.dc).padStart(2,'0')}`
                return kb.localeCompare(ka)
              })
              return (
                <div style={{background:COR.branco,borderRadius:14,
                  border:`1.5px solid ${COR.borda}`,overflow:'hidden',
                  boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
                  {allItems.map(({dia, dc, mc, ac, l}, idx) => {
                    const catVisual = iconeCategoria(categorias, l.categoria)
                    const hasDesc = !!(l.descricao && l.descricao !== l.categoria)
                    const nomePrimario = hasDesc ? l.descricao : l.categoria
                    const mesCompraLabel = (mc !== purchaseMes || ac !== purchaseAno)
                      ? ` de ${NOMES_MESES[mc].slice(0,3)}`
                      : ''
                    return (
                      <div key={l.id}
                        onClick={() => { editarLancamento(dia, l); setMobileView('form') }}
                        style={{display:'flex',alignItems:'center',gap:10,
                          padding:'11px 14px',cursor:'pointer',
                          borderBottom: idx < allItems.length-1 ? `1px solid ${COR.borda}` : 'none',
                          background:COR.branco}}>
                        <div style={{width:38,height:38,borderRadius:11,flexShrink:0,
                          display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,
                          background:catVisual.cor}}>
                          {catVisual.icone}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:600,color:COR.texto,
                            whiteSpace:'nowrap' as const,overflow:'hidden',textOverflow:'ellipsis'}}>
                            {nomePrimario}
                          </div>
                          <div style={{fontSize:10,color:'#94a3b8',marginTop:2,
                            display:'flex',alignItems:'center',gap:5}}>
                            <span>
                              {hasDesc ? `${l.categoria} · ` : ''}dia {dc}{mesCompraLabel}
                            </span>
                            {l.parcelas && l.parcelas > 1 && (
                              <span style={{fontSize:8,padding:'1px 6px',borderRadius:4,fontWeight:700,
                                background:'#f5f3ff',color:'#7c3aed'}}>
                                {l.parcelaAtual}/{l.parcelas}x
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{fontSize:14,fontWeight:700,whiteSpace:'nowrap' as const,
                          letterSpacing:-.3,color:l.tipo==='entrada'?COR.azul:COR.vermelho,flexShrink:0}}>
                          {l.tipo==='entrada'?'+':'-'}{fmt(l.valor)}
                        </div>
                        <button onClick={e => { e.stopPropagation(); excluir(dia, l.id) }}
                          style={{border:'none',background:'transparent',cursor:'pointer',
                            color:'#e2e8f0',fontSize:14,padding:3,borderRadius:5,flexShrink:0}}>✕</button>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        )}

        {/* TOTAL FOOTER */}
        {mobileView === 'extrato' && (
          <div style={{position:'fixed',left:0,right:0,bottom:60,zIndex:39,
            background:`linear-gradient(135deg,${COR.azulEscuro},${COR.azulMedio})`,
            padding:'10px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',
            boxShadow:'0 -2px 8px rgba(0,0,0,0.2)'}}>
            <div>
              <div style={{fontSize:10,fontWeight:600,color:'rgba(255,255,255,.6)'}}>
                Total da fatura — {NOMES_MESES[mes]} {ano}
              </div>
              <div style={{fontSize:9,color:'rgba(255,255,255,.4)',marginTop:1}}>
                Vence dia {diaVencimento} de {NOMES_MESES[mesVenc]} {anoVenc}
              </div>
            </div>
            <span style={{fontSize:18,fontWeight:800,color:'#fff',fontVariantNumeric:'tabular-nums' as const}}>
              {fmt(totalFatura)}
            </span>
          </div>
        )}

        {/* ADD BAR */}
        {mobileView === 'extrato' && (
          <button onClick={() => { resetarParaNovo(diaHoje); setMobileView('form') }}
            style={{position:'fixed',left:0,right:0,bottom:104,zIndex:40,
              border:'none',background:COR.branco,
              borderTop:`1px solid ${COR.borda}`,borderBottom:`1px solid ${COR.borda}`,
              padding:'11px 20px',display:'flex',alignItems:'center',justifyContent:'center',
              gap:6,cursor:'pointer',fontFamily:'inherit'}}>
            <span style={{fontSize:16,color:COR.azul,fontWeight:700,lineHeight:1}}>+</span>
            <span style={{fontSize:13,fontWeight:600,color:COR.azul}}>Adicionar lançamento</span>
          </button>
        )}

      </div>
    )
  }

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:COR.fundo}}>

      {/* ABAS DE CARTÃO */}
      <div style={{background:COR.branco,borderBottom:`1px solid ${COR.borda}`,
        padding:'10px 16px 0',flexShrink:0,display:'flex',gap:3,overflowX:'auto'}}>
        {contasCartao.map(c => {
          const ativa = c.id===contaId
          return (
            <button key={c.id} onClick={() => { setContaId(c.id); resetarParaNovo(diaDefaultPara(mes,ano)) }} style={{
              display:'flex',alignItems:'center',gap:6,
              padding:'7px 14px',borderRadius:'8px 8px 0 0',
              border:`1px solid ${ativa?COR.azul:COR.borda}`,
              cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',
              background:ativa?COR.azul:'#f8faff',color:ativa?'#fff':COR.textoSuave,
              position:'relative',zIndex:ativa?1:0,textAlign:'left'}}>
              <div style={{width:7,height:7,borderRadius:'50%',flexShrink:0,background:ativa?'#fff':c.cor}}/>
              <div>
                <div style={{fontSize:12,fontWeight:ativa?700:600}}>{c.banco}</div>
                {c.apelido && (
                  <div style={{fontSize:10,fontWeight:400,color:ativa?'rgba(255,255,255,0.75)':'#94a3b8',marginTop:1}}>
                    {c.apelido}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Barra Total da fatura com seletor de mês */}
      <div style={{borderRadius:0,padding:'10px 16px',flexShrink:0,position:'relative',
        background:totalFatura<0?'linear-gradient(135deg,#7f1d1d,#dc2626)':`linear-gradient(135deg,${COR.azulEscuro},${COR.azulMedio})`,
        display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:4}}>
          <button onClick={() => { const prevMesNav = () => { if (mes===0){setMes(11);setAno(y=>y-1)}else setMes(m=>m-1) }; prevMesNav() }}
            style={{border:'none',background:'rgba(255,255,255,.15)',color:'#fff',
              borderRadius:6,padding:'3px 10px',fontSize:16,cursor:'pointer',fontFamily:'inherit',lineHeight:1}}>‹</button>
          <button ref={calBtnRef} onClick={(e) => {
              e.stopPropagation()
              const rect = calBtnRef.current?.getBoundingClientRect()
              if (rect) setCalPos({top: rect.bottom + 8, left: rect.left})
              setAnoCalendario(ano)
              setMostrarCalendario(v=>!v)
            }}
            style={{border:'none',background:'transparent',color:'rgba(255,255,255,.9)',
              fontWeight:600,fontSize:13,cursor:'pointer',fontFamily:'inherit',
              padding:'4px 8px',borderRadius:6,transition:'background .15s'}}
            onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,.12)')}
            onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
            Total da fatura — {NOMES_MESES[mes]} {ano}
          </button>
          <button onClick={() => { const nextMesNav = () => { if (mes===11){setMes(0);setAno(y=>y+1)}else setMes(m=>m+1) }; nextMesNav() }}
            style={{border:'none',background:'rgba(255,255,255,.15)',color:'#fff',
              borderRadius:6,padding:'3px 10px',fontSize:16,cursor:'pointer',fontFamily:'inherit',lineHeight:1}}>›</button>
        </div>
        <span style={{fontSize:18,fontWeight:700,color:'#fff',fontVariantNumeric:'tabular-nums'}}>
          {fmt(totalFatura)}
        </span>
        {mostrarCalendario && (
          <div style={{position:'fixed',top:calPos.top,left:calPos.left,zIndex:200,
            background:'#fff',borderRadius:14,boxShadow:'0 8px 32px rgba(0,0,0,.18)',
            padding:16,minWidth:272}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
              <button onClick={()=>setAnoCalendario(a=>a-1)}
                style={{border:'none',background:'#eff6ff',color:COR.azul,borderRadius:6,
                  padding:'4px 12px',fontSize:16,cursor:'pointer',fontFamily:'inherit'}}>‹</button>
              <span style={{fontWeight:700,fontSize:15,color:COR.texto}}>{anoCalendario}</span>
              <button onClick={()=>setAnoCalendario(a=>a+1)}
                style={{border:'none',background:'#eff6ff',color:COR.azul,borderRadius:6,
                  padding:'4px 12px',fontSize:16,cursor:'pointer',fontFamily:'inherit'}}>›</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
              {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((abrev,i) => {
                const ativo = i===mes && anoCalendario===ano
                return (
                  <button key={i} onClick={() => {
                    setMes(i); setAno(anoCalendario)
                    resetarParaNovo(diaDefaultPara(i, anoCalendario))
                    setMostrarCalendario(false)
                  }} style={{
                    padding:'8px 4px',border:'none',borderRadius:8,cursor:'pointer',
                    fontFamily:'inherit',fontSize:12,fontWeight:ativo?700:500,
                    background:ativo?COR.azul:'#f1f5f9',
                    color:ativo?'#fff':COR.texto}}>
                    {abrev}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* RESUMO ORÇAMENTO CARTÃO */}
      {(() => {
        const disponivel = totalPrevisto - grandTotalFaturas
        return (
          <div style={{background:'#f8faff',borderBottom:`1px solid ${COR.borda}`,
            padding:'6px 16px',flexShrink:0,display:'flex',alignItems:'center',gap:0,overflowX:'auto'}}>
            <div style={{display:'flex',alignItems:'center',gap:6,
              padding:'3px 16px',borderRight:`1px solid ${COR.borda}`,flexShrink:0}}>
              <span style={{fontSize:11,color:COR.textoSuave,whiteSpace:'nowrap'}}>Limite Planejado</span>
              <span style={{fontSize:13,fontWeight:700,color:COR.texto,whiteSpace:'nowrap'}}>
                {fmt(totalPrevisto)}
              </span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6,
              padding:'3px 16px',borderRight:`1px solid ${COR.borda}`,flexShrink:0}}>
              <span style={{fontSize:11,color:COR.textoSuave,whiteSpace:'nowrap'}}>Total Utilizado</span>
              <span style={{fontSize:13,fontWeight:700,
                color:grandTotalFaturas>0?COR.vermelho:grandTotalFaturas<0?COR.verde:COR.textoSuave,
                whiteSpace:'nowrap'}}>
                {fmt(grandTotalFaturas)}
              </span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6,
              padding:'3px 16px',flexShrink:0}}>
              <span style={{fontSize:11,color:COR.textoSuave,whiteSpace:'nowrap'}}>Valor Disponível</span>
              <span style={{fontSize:13,fontWeight:700,
                color:disponivel>=0?COR.verde:COR.vermelho,
                whiteSpace:'nowrap'}}>
                {fmt(disponivel)}
              </span>
            </div>
          </div>
        )
      })()}

      {/* BARRA DE RESUMO */}
      <div style={{background:COR.branco,borderBottom:`2px solid ${COR.borda}`,
        padding:'10px 16px',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>

          {/* Pill: Diferença */}
          {(() => {
            const cor = diferenca===null ? '#64748b' : conciliado ? '#16a34a' : Math.abs(diferenca)<50 ? '#d97706' : '#dc2626'
            const lbl = diferenca===null ? '—' : conciliado ? '✓ Conciliado' : `${diferenca>0?'+':'-'} ${fmt(Math.abs(diferenca))}`
            return (
              <div style={{display:'inline-flex',alignItems:'center',gap:6,
                padding:'4px 12px',borderRadius:20,whiteSpace:'nowrap',
                background:cor+'18',border:`1.5px solid ${cor}44`}}>
                <span style={{fontSize:11,fontWeight:600,color:cor}}>Diferença</span>
                <span style={{fontSize:14,fontWeight:800,color:cor}}>{lbl}</span>
              </div>
            )
          })()}

          <span style={{color:COR.borda}}>|</span>

          {/* Pill: Status */}
          {(() => {
            const cor = faturaStatus==='paga' ? '#16a34a' : faturaStatus==='fechada' ? '#0369a1' : '#d97706'
            const simbolo = faturaStatus==='paga' ? '✓' : faturaStatus==='fechada' ? '■' : '●'
            const lbl = faturaStatus==='paga' ? 'Paga' : faturaStatus==='fechada' ? 'Fechada' : 'Aberta'
            return (
              <div style={{display:'inline-flex',alignItems:'center',gap:6,
                padding:'4px 12px',borderRadius:20,whiteSpace:'nowrap',
                background:cor+'18',border:`1.5px solid ${cor}44`}}>
                <span style={{fontSize:13,color:cor}}>{simbolo}</span>
                <span style={{fontSize:14,fontWeight:800,color:cor}}>{lbl}</span>
              </div>
            )
          })()}

        </div>
      </div>

      {/* CONTEÚDO: lista + painel */}
      <div style={{flex:1,display:'flex',gap:16,padding:'10px 16px',overflow:'hidden'}}>

      {/* LISTA DE LANÇAMENTOS agrupados por dia */}
      <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:8}}>

        {(() => {
          type DiaGroup = { dateKey:string; dc:number; mc:number; ac:number; items:Array<{dia:number;l:Lancamento}> }
          const groupMap = new Map<string, DiaGroup>()
          for (let d = 1; d <= totalDias; d++) {
            for (const l of (mesDados.lancamentos[d] ?? [])) {
              const dc = l.diaCompra ?? d
              const mc = l.mesCompra ?? purchaseMes
              const ac = l.anoCompra ?? purchaseAno
              const dateKey = `${ac}-${String(mc+1).padStart(2,'0')}-${String(dc).padStart(2,'0')}`
              if (!groupMap.has(dateKey)) groupMap.set(dateKey, {dateKey, dc, mc, ac, items:[]})
              groupMap.get(dateKey)!.items.push({dia:d, l})
            }
          }

          if (groupMap.size === 0) {
            return (
              <div style={{textAlign:'center',color:COR.textoSuave,padding:40,fontSize:13}}>
                Nenhum lançamento nesta fatura.
              </div>
            )
          }

          // Decrescente: mais recente primeiro
          const grupos = [...groupMap.values()].sort((a,b) => b.dateKey.localeCompare(a.dateKey))

          const isAfterClosing = (g: DiaGroup) => {
            if (g.ac > purchaseAno) return true
            if (g.ac < purchaseAno) return false
            if (g.mc > purchaseMes) return true
            if (g.mc < purchaseMes) return false
            return g.dc > diaFechamento
          }

          return grupos.map((grupo, gIdx) => {
            const {dateKey, dc, mc, ac, items} = grupo
            const aberto = !diasFechados.has(dateKey)
            const semana = diaSemana(dc, mc, ac)
            const mesAno = (mc !== purchaseMes || ac !== purchaseAno)
              ? `${NOMES_MESES[mc]}${ac !== purchaseAno ? ' '+ac : ''}`
              : NOMES_MESES[mc]
            const prevGrupo = gIdx > 0 ? grupos[gIdx-1] : null
            // divider aparece quando saímos da zona "após fechamento" para a zona normal
            const showFechDiv = prevGrupo !== null && isAfterClosing(prevGrupo) && !isAfterClosing(grupo)

            return [
              showFechDiv ? (
                <div key={`div-${dateKey}`}
                  style={{display:'flex',alignItems:'center',gap:8,padding:'4px 0'}}>
                  <div style={{flex:1,height:1,background:COR.borda}}/>
                  <span style={{fontSize:10,color:COR.textoSuave,fontWeight:600,letterSpacing:.3}}>
                    Período da fatura
                  </span>
                  <div style={{flex:1,height:1,background:COR.borda}}/>
                </div>
              ) : null,

              <div key={dateKey}
                style={{borderRadius:12,overflow:'hidden',flexShrink:0,
                  border:`1.5px solid ${COR.borda}`,background:COR.branco}}>

                {/* Cabeçalho do dia */}
                <div
                  onClick={() => toggleDia(dateKey)}
                  style={{display:'flex',alignItems:'center',gap:12,padding:'10px 16px',
                    cursor:'pointer',userSelect:'none',background:'#fafbff',
                    borderBottom:aberto?`1px solid ${COR.borda}`:'none'}}>

                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',
                    minWidth:32,flexShrink:0}}>
                    <span style={{fontSize:18,fontWeight:700,lineHeight:1,color:COR.texto}}>
                      {String(dc).padStart(2,'0')}
                    </span>
                    <span style={{fontSize:10,color:'#94a3b8',fontWeight:500,
                      textTransform:'uppercase',letterSpacing:.3,marginTop:1}}>
                      {semana}
                    </span>
                  </div>

                  <span style={{fontSize:12,color:COR.textoSuave,flex:1}}>{mesAno}</span>

                  <span style={{fontSize:16,color:'#94a3b8',display:'inline-block',
                    transition:'transform .2s',
                    transform:aberto?'rotate(180deg)':'rotate(0deg)'}}>⌄</span>
                </div>

                {/* Lançamentos do dia */}
                {aberto && items.map(({dia, l}) => {
                  const catVisual = iconeCategoria(categorias, l.categoria)
                  const emEdicao  = editandoId === l.id
                  return (
                    <div key={l.id}
                      onClick={() => { editarLancamento(dia, l); setDiaSel(dia) }}
                      style={{display:'flex',alignItems:'center',gap:12,cursor:'pointer',
                        padding:'12px 14px',flexShrink:0,
                        background: emEdicao ? '#eff6ff' : COR.branco,
                        borderBottom:`1px solid ${COR.borda}`,
                        borderLeft: emEdicao ? `3px solid ${COR.azul}` : '3px solid transparent'}}
                      onMouseEnter={e=>{ if(!emEdicao) e.currentTarget.style.background='#fafbff' }}
                      onMouseLeave={e=>{ if(!emEdicao) e.currentTarget.style.background=COR.branco }}>
                      <div style={{width:38,height:38,borderRadius:10,flexShrink:0,
                        display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,
                        background:catVisual.cor}}>
                        {catVisual.icone}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600,color:COR.texto,
                          whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                          {l.categoria}
                        </div>
                        {l.descricao && l.descricao !== l.categoria && (
                          <div style={{fontSize:11,color:COR.textoSuave,marginTop:1,
                            whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                            {l.descricao}
                          </div>
                        )}
                      </div>
                      {l.parcelas && l.parcelas > 1 && (
                        <span style={{fontSize:11,padding:'3px 8px',borderRadius:6,fontWeight:700,
                          flexShrink:0,background:'#ede9fe',color:'#7c3aed'}}>
                          {l.parcelaAtual}&nbsp;de&nbsp;{l.parcelas}
                        </span>
                      )}
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <div style={{fontSize:14,fontWeight:700,
                          color:l.tipo==='entrada'?COR.azul:COR.vermelho}}>
                          {l.tipo==='entrada'?'+':'-'}{fmt(l.valor)}
                        </div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); excluir(dia, l.id) }}
                        style={{border:'none',background:'transparent',cursor:'pointer',
                          color:'#cbd5e1',fontSize:14,padding:'2px 5px',borderRadius:4,flexShrink:0}}
                        onMouseEnter={e=>(e.currentTarget.style.color=COR.vermelho)}
                        onMouseLeave={e=>(e.currentTarget.style.color='#cbd5e1')}>✕</button>
                    </div>
                  )
                })}
              </div>
            ]
          })
        })()}

      </div>

      {/* PAINEL DE LANÇAMENTO */}
      <div style={{width:340,flexShrink:0,background:COR.branco,
        border:`1px solid ${COR.borda}`,borderRadius:12,padding:20,overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
          <h3 style={{fontSize:14,fontWeight:700,color:COR.texto,margin:0}}>
            {editandoId ? 'Editar lançamento' : 'Novo lançamento'}
          </h3>
          {editandoId && (
            <button onClick={() => resetarParaNovo(diaSel)} title="Cancelar edição" style={{
              border:'none',background:'transparent',cursor:'pointer',fontSize:18,color:COR.textoSuave}}>✕</button>
          )}
        </div>

        {/* Datas e saldo atual */}
        <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:12}}>
          {/* Fechamento */}
          {editandoFechamento ? (
            <div style={{display:'flex',alignItems:'center',gap:6,background:'#eff6ff',
              border:`1px solid ${COR.azul}44`,borderRadius:8,padding:'6px 12px'}}>
              <span style={{fontSize:11,fontWeight:600,color:COR.azul,flex:1}}>Fecha dia</span>
              <input type="number" min={1} max={31} autoFocus
                defaultValue={diaFechamento}
                onBlur={e => {
                  const v = Math.min(Math.max(parseInt(e.target.value)||diaFechamentoBase,1),31)
                  if (v !== diaFechamentoBase) updateMes(prev=>({...prev,fechamentoOverride:v}))
                  else updateMes(prev=>({...prev,fechamentoOverride:undefined}))
                  setEditandoFechamento(false)
                }}
                onKeyDown={e => { if(e.key==='Enter'||e.key==='Escape') e.currentTarget.blur() }}
                style={{width:40,border:`1px solid ${COR.azul}66`,borderRadius:4,padding:'2px 6px',
                  fontSize:13,fontWeight:700,outline:'none',fontFamily:'inherit',textAlign:'center',
                  background:'transparent',color:COR.azul}}/>
              <span style={{fontSize:11,color:COR.azul}}>de {NOMES_MESES[purchaseMes]}</span>
            </div>
          ) : (
            <div onClick={() => setEditandoFechamento(true)} title="Clique para editar"
              style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',background:'#eff6ff',
                border:`1px solid ${COR.azul}44`,borderRadius:8,padding:'6px 12px'}}>
              <span style={{fontSize:11,fontWeight:600,color:COR.azul,flex:1}}>
                Fecha dia {diaFechamento} de {NOMES_MESES[purchaseMes]}
                {mesDados.fechamentoOverride && <sup style={{fontSize:9,color:'#94a3b8',marginLeft:2}}>*</sup>}
              </span>
              <span style={{fontSize:11,color:COR.azul}}>✎</span>
            </div>
          )}
          {/* Vencimento */}
          {editandoVencimento ? (
            <div style={{display:'flex',alignItems:'center',gap:6,background:'#fff5f5',
              border:`1px solid ${COR.vermelho}44`,borderRadius:8,padding:'6px 12px'}}>
              <span style={{fontSize:11,fontWeight:600,color:COR.vermelho,flex:1}}>Vence dia</span>
              <input type="number" min={1} max={31} autoFocus
                defaultValue={diaVencimento}
                onBlur={e => {
                  const v = Math.min(Math.max(parseInt(e.target.value)||diaVencimentoBase,1),31)
                  if (v !== diaVencimentoBase) updateMes(prev=>({...prev,vencimentoOverride:v}))
                  else updateMes(prev=>({...prev,vencimentoOverride:undefined}))
                  setEditandoVencimento(false)
                }}
                onKeyDown={e => { if(e.key==='Enter'||e.key==='Escape') e.currentTarget.blur() }}
                style={{width:40,border:`1px solid ${COR.vermelho}66`,borderRadius:4,padding:'2px 6px',
                  fontSize:13,fontWeight:700,outline:'none',fontFamily:'inherit',textAlign:'center',
                  background:'transparent',color:COR.vermelho}}/>
              <span style={{fontSize:11,color:COR.vermelho}}>de {NOMES_MESES[mesVenc]} {anoVenc}</span>
            </div>
          ) : (
            <div onClick={() => setEditandoVencimento(true)} title="Clique para editar"
              style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',background:'#fff5f5',
                border:`1px solid ${COR.vermelho}44`,borderRadius:8,padding:'6px 12px'}}>
              <span style={{fontSize:11,fontWeight:600,color:COR.vermelho,flex:1}}>
                Vence {diaVencimento} de {NOMES_MESES[mesVenc]} {anoVenc}
                {mesDados.vencimentoOverride && <sup style={{fontSize:9,color:'#94a3b8',marginLeft:2}}>*</sup>}
              </span>
              <span style={{fontSize:11,color:COR.vermelho}}>✎</span>
            </div>
          )}
          {/* Saldo atual da fatura — editável */}
          <div onClick={() => { setModalFaturaValor(mesDados.faturaAtual ?? ''); setModalFatura(true) }}
            title="Clique para atualizar"
            style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',
              background: mesDados.faturaAtual ? '#f0fdf4' : '#f8faff',
              border: mesDados.faturaAtual ? '1px solid #86efac' : '1.5px dashed #e2e8f0',
              borderRadius:8,padding:'6px 12px'}}>
            <span style={{fontSize:11,fontWeight:600,
              color: mesDados.faturaAtual ? COR.verde : '#64748b',flex:1}}>
              Fatura informada
            </span>
            <span style={{fontSize:13,fontWeight:800,
              color: mesDados.faturaAtual ? COR.texto : '#94a3b8'}}>
              {mesDados.faturaAtual || 'Informar'}
            </span>
            <span style={{fontSize:11,color: mesDados.faturaAtual ? COR.verde : '#94a3b8'}}>✎</span>
          </div>
        </div>

        {/* Compra / Estorno */}
        <div style={{display:'flex',background:'#e0f2fe',borderRadius:7,
          padding:3,marginBottom:12,width:'100%'}}>
          {(['entrada','saida'] as const).map(t => (
            <button key={t} tabIndex={-1} onClick={() => setFTipo(t)} style={{
              flex:1,padding:'7px 0',border:'none',borderRadius:5,
              cursor:'pointer',fontSize:12,fontWeight:600,
              fontFamily:'inherit',transition:'all .15s',
              background:fTipo===t?COR.branco:'transparent',
              color:fTipo===t?(t==='entrada'?COR.azul:COR.vermelho):'#0369a1',
              boxShadow:fTipo===t?'0 1px 2px rgba(0,0,0,.08)':'none'}}>
              {t==='saida'?'↑ Estorno':'↓ Compra'}
            </button>
          ))}
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:10}}>
          {/* Data da compra — campo livre */}
          {(() => {
            const parsed = parseDateFatura(fDataCompra, purchaseMes, purchaseAno)
            const dispDia = parsed?.dia ?? diaSel
            const dispMes = parsed?.mes ?? purchaseMes
            const dispAno = parsed?.ano ?? purchaseAno
            const label = `${String(dispDia).padStart(2,'0')} de ${NOMES_MESES[dispMes]}${dispAno !== purchaseAno ? ' '+dispAno : ''} · ${diaSemana(dispDia,dispMes,dispAno)}`
            return (
              <div>
                <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:4}}>Data da compra</div>
                <input
                  ref={dataCompraRef}
                  autoFocus
                  type="text"
                  value={fDataCompra}
                  onChange={e => setFDataCompra(e.target.value)}
                  onBlur={() => {
                    const p = parseDateFatura(fDataCompra, purchaseMes, purchaseAno)
                    if (p) {
                      setDiaSel(p.dia)
                      // Formata para DD/MM ou DD/MM/AAAA ao sair do campo
                      const acStr = p.ano !== purchaseAno ? `/${p.ano}` : ''
                      setFDataCompra(`${String(p.dia).padStart(2,'0')}/${String(p.mes+1).padStart(2,'0')}${acStr}`)
                    }
                  }}
                  onFocus={realcarFoco}
                  placeholder={`${String(diaSel).padStart(2,'0')}/${String(purchaseMes+1).padStart(2,'0')}`}
                  style={{border:'1.5px solid #bae6fd',borderRadius:7,padding:'7px 10px',
                    fontSize:12,outline:'none',background:'#fff',
                    fontFamily:'inherit',color:COR.texto,width:'100%'}}
                  onKeyDown={e => { if (e.key==='Enter') { (e.target as HTMLInputElement).blur() } }}
                />
                <div style={{fontSize:11,color:'#94a3b8',marginTop:4}}>{label}</div>
              </div>
            )
          })()}
          <div>
            <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:4}}>Categoria</div>
            <select ref={categoriaSelectRef} value={fCat}
              onChange={e=>setFCat(e.target.value)}
              onFocus={realcarFoco} onBlur={removerRealce}
              style={{border:`1.5px solid #bae6fd`,borderRadius:7,padding:'7px 10px',
                fontSize:12,outline:'none',background:'#fff',
                fontFamily:'inherit',color:COR.texto,width:'100%'}}>
              <option value="">Selecione...</option>
              {categoriasCartao.map(c=>(
                <option key={c.id} value={c.nome}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:4}}>Valor total *</div>
            <input ref={valorInputRef} value={fValor} onChange={e=>setFValor(e.target.value)}
              placeholder="R$ 0,00"
              onFocus={realcarFoco} onBlur={removerRealce}
              style={{border:`1.5px solid #bae6fd`,borderRadius:7,padding:'7px 10px',
                fontSize:12,outline:'none',background:'#fff',
                fontFamily:'inherit',color:COR.texto,width:'100%'}}
              onKeyDown={e=>e.key==='Enter'&&lancar()}/>
          </div>
          <div>
            <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:4}}>Parcelas</div>
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map((n, i) => {
                const parcelasAtual = Math.max(1, parseInt(fParcelas) || 1)
                const ativo = parcelasAtual === n
                return (
                  <button key={n}
                    ref={el => { parcelasBtnRefs.current[i] = el }}
                    tabIndex={ativo ? 0 : -1}
                    onClick={() => setFParcelas(String(n))}
                    onKeyDown={e => {
                      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                        e.preventDefault()
                        if (n < 12) { setFParcelas(String(n+1)); parcelasBtnRefs.current[i+1]?.focus() }
                      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                        e.preventDefault()
                        if (n > 1) { setFParcelas(String(n-1)); parcelasBtnRefs.current[i-1]?.focus() }
                      } else if (e.key === 'Enter') {
                        e.preventDefault(); lancar()
                      }
                    }}
                    style={{
                      padding:'4px 8px',border:`1.5px solid ${ativo?COR.azul:'#bae6fd'}`,
                      borderRadius:6,cursor:'pointer',fontSize:11,fontWeight:500,
                      background:ativo?'#eff6ff':'#fff',
                      color:ativo?COR.azul:'#0369a1',fontFamily:'inherit'}}>
                    {n}x
                  </button>
                )
              })}
              <input
                type="number" min={13} placeholder="+12x"
                tabIndex={parseInt(fParcelas) > 12 ? 0 : -1}
                value={parseInt(fParcelas)>12 ? fParcelas : ''}
                onChange={e => { if(e.target.value) setFParcelas(e.target.value) }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); lancar() } }}
                onFocus={e => { e.currentTarget.style.border=`1.5px solid ${COR.azul}`; e.currentTarget.style.boxShadow='0 0 0 3px rgba(26,86,219,0.15)' }}
                onBlur={e => { e.currentTarget.style.border='1.5px solid #bae6fd'; e.currentTarget.style.boxShadow='none'; if(!e.target.value) setFParcelas('1') }}
                style={{width:52,border:`1.5px solid ${parseInt(fParcelas)>12?COR.azul:'#bae6fd'}`,
                  borderRadius:6,padding:'4px 6px',fontSize:11,outline:'none',
                  background:parseInt(fParcelas)>12?'#eff6ff':'#fff',
                  color:parseInt(fParcelas)>12?COR.azul:'#94a3b8',fontFamily:'inherit',textAlign:'center'}}/>
            </div>
            {parseInt(fParcelas) > 1 && parseBRL(fValor) > 0 && (
              <div style={{fontSize:11,color:COR.textoSuave,marginTop:6}}>
                {fParcelas}x de {fmt(parseBRL(fValor) / parseInt(fParcelas))}
              </div>
            )}
          </div>
          <div>
            <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:4}}>Descrição</div>
            <input value={fDesc} onChange={e=>setFDesc(e.target.value)}
              placeholder="Ex: Mercado Extra, Farmácia..."
              onFocus={realcarFoco} onBlur={removerRealce}
              style={{border:`1.5px solid #bae6fd`,borderRadius:7,padding:'7px 10px',
                fontSize:12,outline:'none',background:'#fff',
                fontFamily:'inherit',color:COR.texto,width:'100%'}}
              onKeyDown={e=>e.key==='Enter'&&lancar()}/>
          </div>
        </div>

        <div style={{fontSize:10,color:'#94a3b8',marginBottom:14}}>
          Enter no valor ou na descrição para salvar
        </div>

        <div style={{display:'flex',gap:8}}>
          {editandoId && (
            <button onClick={excluirAtual} style={{
              flex:1,padding:'10px 0',border:`1.5px solid ${COR.borda}`,
              borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:500,
              background:COR.branco,color:COR.vermelho,fontFamily:'inherit'}}>
              Excluir
            </button>
          )}
          <button onClick={lancar} style={{
            flex:2,padding:'10px 0',border:'none',borderRadius:8,
            background:`linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,
            color:'#fff',fontSize:13,fontWeight:600,
            cursor:'pointer',fontFamily:'inherit'}}>
            {editandoId ? 'Salvar alterações' : 'Lançar'}
          </button>
        </div>
      </div>
      </div>

      {/* MODAL FATURA DO CARTÃO */}
      {modalFatura && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:1000,
          display:'flex',alignItems:'center',justifyContent:'center'}}
          onClick={() => setModalFatura(false)}>
          <div style={{background:'#fff',borderRadius:14,padding:'28px 32px',minWidth:360,
            boxShadow:'0 20px 60px rgba(0,0,0,0.25)'}}
            onClick={e => e.stopPropagation()}>
            <div style={{marginBottom:20}}>
              {contaInfo && (
                <span style={{fontSize:14,fontWeight:500,padding:'4px 12px',borderRadius:6,
                  display:'inline-flex',alignItems:'center',gap:6,
                  background:contaInfo.cor+'18',border:`1px solid ${contaInfo.cor}55`}}>
                  <span>{contaInfo.icone}</span>
                  <span style={{color:contaInfo.cor,fontWeight:700}}>{contaInfo.banco}</span>
                </span>
              )}
            </div>
            <p style={{fontSize:14,color:'#0f172a',fontWeight:600,margin:'0 0 6px'}}>
              Qual é o valor atual da fatura?
            </p>
            <p style={{fontSize:12,color:'#94a3b8',margin:'0 0 16px'}}>
              Informe o valor do cartão para acompanhar a diferença em relação ao sistema.
            </p>
            <input autoFocus
              value={modalFaturaValor}
              onChange={e => setModalFaturaValor(e.target.value)}
              onFocus={e => e.target.select()}
              onKeyDown={e => {
                if (e.key === 'Enter') confirmarModalFatura()
                if (e.key === 'Escape') setModalFatura(false)
              }}
              placeholder="R$ 0,00"
              style={{width:'100%',border:`1.5px solid ${contaInfo?.cor ?? COR.azul}`,
                borderRadius:8,padding:'10px 14px',fontSize:16,fontWeight:700,
                color:'#0f172a',outline:'none',textAlign:'right',
                fontFamily:'inherit',boxSizing:'border-box'}}/>
            <div style={{display:'flex',gap:10,marginTop:20}}>
              <button
                onClick={() => { updateMes(prev=>({...prev,faturaAtualData:hojeStr})); setModalFatura(false) }}
                style={{flex:1,padding:'10px',borderRadius:8,border:`1.5px solid #e2e8f0`,
                  background:'#f8faff',color:'#64748b',fontSize:13,fontWeight:600,
                  cursor:'pointer',fontFamily:'inherit'}}>
                Pular
              </button>
              <button onClick={confirmarModalFatura}
                style={{flex:2,padding:'10px',borderRadius:8,border:'none',
                  background:contaInfo?.cor ?? COR.azul,color:'#fff',fontSize:13,fontWeight:700,
                  cursor:'pointer',fontFamily:'inherit'}}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
