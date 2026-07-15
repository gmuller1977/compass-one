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
const MESES_CURTOS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function realcarFoco(e: React.FocusEvent<HTMLElement>) {
  e.currentTarget.style.border = `1.5px solid ${COR.azul}`
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,86,219,0.15)'
}
function removerRealce(e: React.FocusEvent<HTMLElement>) {
  e.currentTarget.style.border = '1.5px solid #bae6fd'
  e.currentTarget.style.boxShadow = 'none'
}

export default function FaturaCartao() {
  const hoje    = new Date()
  const diaHoje = hoje.getDate()
  const mesHoje = hoje.getMonth()
  const anoHoje = hoje.getFullYear()

  const { contas, categorias, faturaData, setFaturaData, extratoData, setExtratoData } = useApp()
  const contasCartao = contas.filter(c => c.tipo === 'cartao')
  const dados = faturaData as Record<string, DadosMes>
  const setDados = setFaturaData as React.Dispatch<React.SetStateAction<Record<string, DadosMes>>>
  const extratoRef = useRef(extratoData)
  useEffect(() => { extratoRef.current = extratoData }, [extratoData])

  const [contaId,  setContaId]  = useState(() => contasCartao[0]?.id ?? 'c1')
  const [mes,      setMes]      = useState(mesHoje)
  const [ano,      setAno]      = useState(anoHoje)
  const [diaSel,   setDiaSel]   = useState<number>(diaHoje)
  const [editandoId,           setEditandoId]           = useState<string|null>(null)
  const [editandoDiaOriginal,  setEditandoDiaOriginal]  = useState<number|null>(null)
  const [fTipo,    setFTipo]    = useState<TipoLanc>('saida')
  const [fCat,     setFCat]     = useState('')
  const [fDesc,    setFDesc]    = useState('')
  const [fValor,   setFValor]   = useState('')
  const [fParcelas, setFParcelas] = useState('1')
  const [fDataCompra, setFDataCompra] = useState('')
  const [editandoFechamento, setEditandoFechamento] = useState(false)
  const [editandoVencimento, setEditandoVencimento] = useState(false)

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
  const faturaExtNum  = parseBRL(mesDados.faturaAtual)

  // Datas efetivas (com override por mês)
  const diaFechamento = mesDados.fechamentoOverride ?? diaFechamentoBase
  const diaVencimento = mesDados.vencimentoOverride ?? diaVencimentoBase

  // Vencimento = a própria aba (mes = mês de pagamento)
  const mesVenc = mes
  const anoVenc = ano

  // billingMes: qual aba deve estar ativa (mês de vencimento da fatura em aberto)
  const billingMes = (() => {
    const m = (diaHoje >= diaFechamentoBase ? mesHoje + 1 : mesHoje) + billingOffset
    return m > 11 ? m - 12 : m
  })()
  const billingAno = (() => {
    const m = (diaHoje >= diaFechamentoBase ? mesHoje + 1 : mesHoje) + billingOffset
    return m > 11 ? anoHoje + 1 : anoHoje
  })()

  // Status da fatura: paga se a data de vencimento já passou
  const faturaStatus: 'paga' | 'aberta' = new Date(anoVenc, mesVenc, diaVencimento) < hoje ? 'paga' : 'aberta'

  // Categorias de cartão — estorno usa as mesmas categorias de saída, somente ativas
  const categoriasCartao = categorias
    .filter(c => c.tipo === 'saida' && c.tipoMovimento === 'cartao' && c.ativa)
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

  const totalFatura = totalEntradas - totalSaidas
  const diferenca   = faturaExtNum > 0 ? faturaExtNum - totalFatura : null
  const conciliado  = diferenca !== null && Math.abs(diferenca) < 0.01

  const totaisPorCartao = useMemo(() => {
    const cartoes = contas.filter(c => c.tipo === 'cartao')
    return cartoes.map(c => {
      // Cada cartão pode ter offset diferente
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
      return { conta: c, total: entradas - saidas }
    })
  }, [dados, mes, ano, contas])

  const grandTotalFaturas = totaisPorCartao.reduce((s, x) => s + x.total, 0)

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

    if (editandoId) {
      const diaOrigem = editandoDiaOriginal ?? diaSel
      const idAtual   = editandoId
      const futuroAlvo = ehDiaFuturo(diaSel)
      updateMes(prev => {
        const listaOrigem = prev.lancamentos[diaOrigem] ?? []
        const entrada = listaOrigem.find(l => l.id===idAtual)
        if (!entrada) return prev
        const novoConsolidado = diaOrigem !== diaSel ? !futuroAlvo : entrada.consolidado
        const atualizada: Lancamento = {
          ...entrada, tipo:fTipo, descricao:fDesc.trim()||fCat, categoria:fCat,
          valor:valorParcela, formaPagamento:'credito', consolidado:novoConsolidado,
          parcelas:nParcelas>1?nParcelas:undefined, parcelaAtual:entrada.parcelaAtual,
          diaCompra:diaCompraFinal, mesCompra:mesCompraFinal, anoCompra:anoCompraFinal,
        }
        if (diaOrigem === diaSel) {
          return { ...prev, lancamentos: { ...prev.lancamentos, [diaOrigem]: listaOrigem.map(l => l.id===idAtual ? atualizada : l) } }
        }
        return {
          ...prev,
          lancamentos: {
            ...prev.lancamentos,
            [diaOrigem]: listaOrigem.filter(l=>l.id!==idAtual),
            [diaSel]: [...(prev.lancamentos[diaSel]??[]), atualizada],
          }
        }
      })
    } else if (nParcelas > 1) {
      // Cria entrada em cada mês subsequente
      setDados(prev => {
        let result = { ...prev }
        for (let p = 1; p <= nParcelas; p++) {
          let m = purchaseMes + (p - 1)
          let a = purchaseAno
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
      updateMes(prev => ({
        ...prev,
        lancamentos: {
          ...prev.lancamentos,
          [diaSel]: [...(prev.lancamentos[diaSel]??[]), {
            id:`${baseId}-1`, tipo:fTipo,
            descricao:fDesc.trim()||fCat, categoria:fCat,
            valor:valorParcela, formaPagamento:'credito', tipoLanc:'variavel',
            consolidado: !ehDiaFuturo(diaSel),
            diaCompra:diaCompraFinal, mesCompra:mesCompraFinal, anoCompra:anoCompraFinal,
          }],
        }
      }))
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

      {/* ABAS DE MÊS */}
      <div style={{background:COR.branco,borderBottom:`1px solid ${COR.borda}`,
        padding:'10px 16px 0',flexShrink:0,display:'flex',gap:3,overflowX:'auto'}}>
        {MESES_CURTOS.map((m,i) => {
          const isAtual = i===billingMes && ano===billingAno
          const ativo   = i===mes
          return (
            <button key={m} onClick={() => { setMes(i); resetarParaNovo(diaDefaultPara(i,ano)) }} style={{
              padding:'7px 14px',borderRadius:'8px 8px 0 0',
              border:`1px solid ${ativo?COR.azul:COR.borda}`,
              cursor:'pointer',fontSize:12,fontWeight:ativo?700:500,
              fontFamily:'inherit',whiteSpace:'nowrap',
              background:ativo?COR.azul:'#f8faff',
              color:ativo?'#fff':COR.textoSuave,position:'relative',zIndex:ativo?1:0}}>
              {m}
              {isAtual && (
                <span style={{position:'absolute',bottom:3,left:'50%',
                  transform:'translateX(-50%)',width:4,height:4,
                  borderRadius:'50%',background:ativo?'#fff':COR.azul,display:'block'}}/>
              )}
            </button>
          )
        })}
      </div>

      {/* TOTAL DE TODAS AS FATURAS */}
      <div style={{background:'#f8faff',borderBottom:`1px solid ${COR.borda}`,
        padding:'6px 16px',flexShrink:0,display:'flex',alignItems:'center',gap:0,overflowX:'auto'}}>
        <span style={{fontSize:10,color:COR.textoSuave,fontWeight:600,marginRight:14,
          textTransform:'uppercase',letterSpacing:.5,whiteSpace:'nowrap',flexShrink:0}}>
          Faturas · {NOMES_MESES[mes]}
        </span>
        {totaisPorCartao.map(({conta, total}) => (
          <div key={conta.id} style={{display:'flex',alignItems:'center',gap:6,
            padding:'3px 12px',borderRight:`1px solid ${COR.borda}`,flexShrink:0}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:conta.cor,flexShrink:0}}/>
            <span style={{fontSize:11,color:COR.textoSuave,whiteSpace:'nowrap'}}>{conta.banco}</span>
            <span style={{fontSize:13,fontWeight:700,
              color:total>0?COR.vermelho:total<0?COR.verde:COR.textoSuave,
              whiteSpace:'nowrap'}}>
              {fmt(total)}
            </span>
          </div>
        ))}
        <div style={{display:'flex',alignItems:'center',gap:6,padding:'3px 12px',flexShrink:0}}>
          <span style={{fontSize:11,color:COR.textoSuave,whiteSpace:'nowrap'}}>Total</span>
          <span style={{fontSize:14,fontWeight:700,
            color:grandTotalFaturas>0?COR.vermelho:grandTotalFaturas<0?COR.verde:COR.textoSuave,
            whiteSpace:'nowrap'}}>
            {fmt(grandTotalFaturas)}
          </span>
        </div>
      </div>

      {/* BARRA DE RESUMO */}
      <div style={{background:COR.branco,borderBottom:`2px solid ${COR.borda}`,
        padding:'10px 16px',flexShrink:0,display:'flex',flexDirection:'column',gap:8}}>

        {/* Linha 1: mês + totais */}
        <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
          <span style={{fontSize:14,fontWeight:700,color:COR.texto}}>{NOMES_MESES[mes]} {ano}</span>
          <span style={{color:COR.borda}}>|</span>
          <div style={{display:'flex',alignItems:'center',gap:5}}>
            <span style={{fontSize:13,color:COR.textoSuave,fontWeight:500}}>Fatura:</span>
            <span style={{fontSize:16,fontWeight:800,
              color:totalFatura>0?COR.vermelho:totalFatura<0?COR.verde:COR.textoSuave}}>{fmt(totalFatura)}</span>
          </div>
          {contaInfo?.limiteCartao && (
            <div style={{display:'flex',alignItems:'center',gap:5}}>
              <span style={{fontSize:13,color:COR.textoSuave,fontWeight:500}}>Crédito disponível:</span>
              <span style={{fontSize:16,fontWeight:800,
                color:(contaInfo.limiteCartao-totalFatura)<0?COR.vermelho:COR.verde}}>
                {fmt(contaInfo.limiteCartao - totalFatura)}
              </span>
            </div>
          )}
        </div>

        {/* Linha 2: fatura atual → pill do cartão → diferença (mesma ordem do extrato banco) */}
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{fontSize:13,color:COR.textoSuave,fontWeight:500}}>Fatura atual cartão:</span>
            <input value={mesDados.faturaAtual}
              onChange={e => updateMes(prev=>({...prev,faturaAtual:e.target.value}))}
              onFocus={e => e.target.select()}
              onBlur={e => { const n = parseBRL(e.target.value); if (!isNaN(n) && e.target.value.trim()) updateMes(prev=>({...prev,faturaAtual:fmt(n)})) }}
              placeholder="R$ 0,00"
              style={{border:`1px solid ${contaInfo?.cor ?? COR.azul}55`,borderRadius:6,padding:'4px 10px',
                fontSize:13,fontWeight:700,color:contaInfo?.cor ?? COR.azul,
                background:`${contaInfo?.cor ?? COR.azul}18`,
                outline:'none',width:130,textAlign:'right',fontFamily:'inherit'}}/>
          </div>
          {contaInfo && (
            <span style={{fontSize:13,fontWeight:500,padding:'4px 10px',borderRadius:6,
              display:'inline-flex',alignItems:'center',gap:5,
              background:contaInfo.cor+'18',border:`1px solid ${contaInfo.cor}55`}}>
              <span>{contaInfo.icone}</span>
              <span style={{color:contaInfo.cor,fontWeight:600}}>{contaInfo.banco}</span>
              <span style={{fontWeight:700,color:totalFatura>0?COR.vermelho:COR.texto}}>{fmt(totalFatura)}</span>
            </span>
          )}
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{fontSize:13,color:COR.textoSuave,fontWeight:500}}>Diferença:</span>
            <div style={{padding:'5px 12px',borderRadius:7,fontSize:12,fontWeight:600,
              background:diferenca===null?'#f1f5f9':conciliado?'#dcfce7':'#fee2e2',
              color:diferenca===null?COR.textoSuave:conciliado?'#166534':'#991b1b',
              border:`1px solid ${diferenca===null?COR.borda:conciliado?'#86efac':'#fca5a5'}`,
              minWidth:110,textAlign:'center'}}>
              {diferenca===null?'':conciliado?'✓ Conciliado':`${diferenca>0?'+':'-'}${fmt(Math.abs(diferenca))}`}
            </div>
          </div>
          {/* Badge PAGA / ABERTA */}
          <span style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20,
            background:faturaStatus==='paga'?'#dcfce7':'#fef9c3',
            color:faturaStatus==='paga'?'#166534':'#92400e',
            border:`1px solid ${faturaStatus==='paga'?'#86efac':'#fde68a'}`}}>
            {faturaStatus==='paga'?'✓ Paga':'● Aberta'}
          </span>
          <span style={{color:COR.borda}}>|</span>
          <div style={{display:'flex',alignItems:'center',gap:5}}>
            <span style={{fontSize:11,color:COR.textoSuave}}>Fechamento:</span>
            {editandoFechamento ? (
              <input type="number" min={1} max={31} autoFocus
                defaultValue={diaFechamento}
                onBlur={e => {
                  const v = Math.min(Math.max(parseInt(e.target.value)||diaFechamentoBase,1),31)
                  if (v !== diaFechamentoBase) updateMes(prev=>({...prev,fechamentoOverride:v}))
                  else updateMes(prev=>({...prev,fechamentoOverride:undefined}))
                  setEditandoFechamento(false)
                }}
                onKeyDown={e => { if(e.key==='Enter'||e.key==='Escape') e.currentTarget.blur() }}
                style={{width:44,border:`1.5px solid ${COR.azul}`,borderRadius:5,padding:'3px 6px',
                  fontSize:12,fontWeight:700,outline:'none',fontFamily:'inherit',textAlign:'center'}}/>
            ) : (
              <span onClick={() => setEditandoFechamento(true)}
                title="Clique para editar"
                style={{fontSize:12,fontWeight:700,color:COR.azul,cursor:'pointer',
                  padding:'2px 6px',borderRadius:5,border:`1px dashed ${COR.borda}`,
                  background:'#f8faff'}}>
                dia {diaFechamento} de {NOMES_MESES[purchaseMes]}
                {mesDados.fechamentoOverride && (
                  <span style={{fontSize:9,color:'#94a3b8',marginLeft:3}}>*</span>
                )}
              </span>
            )}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:5}}>
            <span style={{fontSize:11,color:COR.textoSuave}}>Vencimento:</span>
            {editandoVencimento ? (
              <input type="number" min={1} max={31} autoFocus
                defaultValue={diaVencimento}
                onBlur={e => {
                  const v = Math.min(Math.max(parseInt(e.target.value)||diaVencimentoBase,1),31)
                  if (v !== diaVencimentoBase) updateMes(prev=>({...prev,vencimentoOverride:v}))
                  else updateMes(prev=>({...prev,vencimentoOverride:undefined}))
                  setEditandoVencimento(false)
                }}
                onKeyDown={e => { if(e.key==='Enter'||e.key==='Escape') e.currentTarget.blur() }}
                style={{width:44,border:`1.5px solid ${COR.azul}`,borderRadius:5,padding:'3px 6px',
                  fontSize:12,fontWeight:700,outline:'none',fontFamily:'inherit',textAlign:'center'}}/>
            ) : (
              <span onClick={() => setEditandoVencimento(true)}
                title="Clique para editar"
                style={{fontSize:12,fontWeight:700,color:COR.vermelho,cursor:'pointer',
                  padding:'2px 6px',borderRadius:5,border:`1px dashed ${COR.borda}`,
                  background:'#fff5f5'}}>
                {diaVencimento} de {NOMES_MESES[mesVenc]}
                {mesDados.vencimentoOverride && (
                  <span style={{fontSize:9,color:'#94a3b8',marginLeft:3}}>*</span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* CONTEÚDO: lista + painel */}
      <div style={{flex:1,display:'flex',gap:16,padding:'10px 16px',overflow:'hidden'}}>

      {/* LISTA DE LANÇAMENTOS (flat list) */}
      <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:8}}>

        {(() => {
          const todos: Array<{dia: number; l: Lancamento}> = []
          for (let d = 1; d <= totalDias; d++) {
            (mesDados.lancamentos[d] ?? []).forEach(l => todos.push({dia: d, l}))
          }

          if (todos.length === 0) {
            return (
              <div style={{textAlign:'center',color:COR.textoSuave,padding:40,fontSize:13}}>
                Nenhum lançamento nesta fatura.
              </div>
            )
          }

          return todos.map(({dia, l}, idx) => {
            const catVisual  = iconeCategoria(categorias, l.categoria)
            const emEdicao   = editandoId === l.id
            const prevDia    = idx > 0 ? todos[idx-1].dia : 0
            const showFechDiv = dia > diaFechamento && prevDia <= diaFechamento

            // Data da compra: usa campos armazenados se disponíveis (parcelados)
            const dc  = l.diaCompra ?? dia
            const mc  = l.mesCompra ?? purchaseMes
            const ac  = l.anoCompra ?? purchaseAno
            const dataLabel = ac !== purchaseAno
              ? `${String(dc).padStart(2,'0')} de ${NOMES_MESES[mc]} ${ac}`
              : `${String(dc).padStart(2,'0')} de ${NOMES_MESES[mc]}`

            return (
              <div key={l.id}>
                {showFechDiv && (
                  <div style={{display:'flex',alignItems:'center',gap:8,padding:'4px 0 8px'}}>
                    <div style={{flex:1,height:1,background:COR.borda}} />
                    <span style={{fontSize:10,color:COR.textoSuave,fontWeight:600,letterSpacing:.3}}>
                      Após fechamento
                    </span>
                    <div style={{flex:1,height:1,background:COR.borda}} />
                  </div>
                )}
                <div
                  onClick={() => { editarLancamento(dia, l); setDiaSel(dia) }}
                  style={{display:'flex',alignItems:'center',gap:12,cursor:'pointer',
                    padding:'12px 14px',borderRadius:12,flexShrink:0,
                    background: emEdicao ? '#eff6ff' : COR.branco,
                    border: `1.5px solid ${emEdicao ? COR.azul : COR.borda}`,
                    boxShadow: emEdicao ? '0 0 0 3px rgba(26,86,219,0.1)' : 'none',
                  }}
                  onMouseEnter={e=>{ if(!emEdicao) e.currentTarget.style.background='#fafbff' }}
                  onMouseLeave={e=>{ if(!emEdicao) e.currentTarget.style.background= emEdicao?'#eff6ff':COR.branco }}>
                  <div style={{width:38,height:38,borderRadius:10,flexShrink:0,
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,
                    background:catVisual.cor}}>
                    {catVisual.icone}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:COR.texto,
                      whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                      {l.descricao || l.categoria}
                    </div>
                    <div style={{fontSize:11,color:COR.textoSuave,marginTop:1}}>{l.categoria}</div>
                    <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>{dataLabel}</div>
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
              </div>
            )
          })
        })()}

        {/* Total da fatura */}
        <div style={{borderRadius:12,padding:'14px 16px',flexShrink:0,
          background:`linear-gradient(135deg,${COR.azulEscuro},${COR.azulMedio})`,
          display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,.8)'}}>
              Total da fatura — {NOMES_MESES[mes]} {ano}
            </div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.6)',marginTop:2}}>
              Vencimento: {diaVencimento} de {NOMES_MESES[mesVenc]} {anoVenc}
            </div>
          </div>
          <span style={{fontSize:18,fontWeight:700,color:'#fff'}}>{fmt(totalFatura)}</span>
        </div>
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

        {/* Vencimento da fatura */}
        <div style={{background:'#fff5f5',border:'1px solid #fecdd3',borderRadius:8,
          padding:'6px 12px',marginBottom:12,display:'flex',alignItems:'center',gap:6}}>
          <span style={{fontSize:10,color:COR.vermelho}}>📅</span>
          <span style={{fontSize:11,color:COR.vermelho,fontWeight:600}}>
            Vencimento da fatura: {diaVencimento} de {NOMES_MESES[mesVenc]} {anoVenc}
          </span>
        </div>

        {/* Compra / Estorno */}
        <div style={{display:'flex',background:'#e0f2fe',borderRadius:7,
          padding:3,marginBottom:12,width:'100%'}}>
          {(['saida','entrada'] as const).map(t => (
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
            <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:4}}>Valor da parcela *</div>
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
                Total: {fmt(parseBRL(fValor) * parseInt(fParcelas))} &nbsp;({fParcelas}x de {fmt(parseBRL(fValor))})
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
    </div>
  )
}
