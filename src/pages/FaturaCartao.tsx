import { useState, useMemo, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
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
const MESES_CURTOS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const STORAGE_KEY  = 'compass_fatura_dados'

function carregarDados(): Record<string, DadosMes> {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : {} }
  catch { return {} }
}
function salvarDados(d: Record<string, DadosMes>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch { /* silent */ }
}

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

  const { contas, categorias } = useApp()
  const contasCartao = contas.filter(c => c.tipo === 'cartao')

  const [contaId,  setContaId]  = useState(() => contasCartao[0]?.id ?? 'c1')
  const [mes,      setMes]      = useState(mesHoje)
  const [ano,      setAno]      = useState(anoHoje)
  const [dados,    setDados]    = useState<Record<string, DadosMes>>(carregarDados)
  const [diaSel,   setDiaSel]   = useState<number>(diaHoje)
  const [diasAbertos, setDiasAbertos] = useState<Set<number>>(() => new Set([diaHoje]))
  const [editandoId,           setEditandoId]           = useState<string|null>(null)
  const [editandoDiaOriginal,  setEditandoDiaOriginal]  = useState<number|null>(null)
  const [fTipo,    setFTipo]    = useState<TipoLanc>('saida')
  const [fCat,     setFCat]     = useState('')
  const [fDesc,    setFDesc]    = useState('')
  const [fValor,   setFValor]   = useState('')
  const [fParcelas, setFParcelas] = useState('1')
  const [editandoFechamento, setEditandoFechamento] = useState(false)
  const [editandoVencimento, setEditandoVencimento] = useState(false)

  const hojeRef           = useRef<HTMLDivElement>(null)
  const categoriaSelectRef = useRef<HTMLSelectElement>(null)
  const valorInputRef      = useRef<HTMLInputElement>(null)

  const contaInfo     = contas.find(c => c.id === contaId)
  const totalDias     = diasNoMes(mes, ano)
  const eMesAtual     = mes === mesHoje && ano === anoHoje
  const key           = mesKey(contaId, ano, mes)
  const mesDados      = dados[key] ?? DADOS_MES_VAZIO
  const faturaExtNum  = parseBRL(mesDados.faturaAtual)

  // Datas efetivas de fechamento e vencimento (override por mês ou base do cartão)
  const diaFechamentoBase = contaInfo?.diaFechamento ?? 1
  const diaVencimentoBase = contaInfo?.diaVencimento ?? 1
  const diaFechamento = mesDados.fechamentoOverride ?? diaFechamentoBase
  const diaVencimento = mesDados.vencimentoOverride ?? diaVencimentoBase

  // Mês/ano da aba atual = mês de vencimento (tab = billing month)
  const mesVenc = mes
  const anoVenc = ano

  // Calcula a aba padrão do período de faturamento atual (para marcar o ponto)
  const billingOffset = diaVencimentoBase < diaFechamentoBase ? 1 : 0
  const billingMes = (() => { let m = (diaHoje >= diaFechamentoBase ? mesHoje + 1 : mesHoje) + billingOffset; return m > 11 ? m - 12 : m })()
  const billingAno = (() => { let m = (diaHoje >= diaFechamentoBase ? mesHoje + 1 : mesHoje) + billingOffset; return m > 11 ? anoHoje + 1 : anoHoje })()

  // Status da fatura: paga se a data de vencimento já passou
  const faturaStatus: 'paga' | 'aberta' = new Date(anoVenc, mesVenc, diaVencimento) < hoje ? 'paga' : 'aberta'

  // Categorias de cartão — estorno usa as mesmas categorias de saída
  const categoriasCartao = categorias
    .filter(c => c.tipo === 'saida' && c.tipoMovimento === 'cartao')
    .sort((a,b) => a.nome.localeCompare(b.nome,'pt-BR'))

  useEffect(() => { salvarDados(dados) }, [dados])

  // Sincroniza totais das faturas como lançamentos previstos no extrato bancário
  useEffect(() => {
    const contaBancoId = contas.find(c => c.tipo === 'corrente')?.id
    if (!contaBancoId) return

    const extratoRaw = localStorage.getItem('compass_extrato_dados')
    const extrato: Record<string, { lancamentos: Record<number, unknown[]>; saldoBanco: string }> =
      extratoRaw ? JSON.parse(extratoRaw) : {}

    for (const fatKey of Object.keys(dados)) {
      const parts = fatKey.split('-')
      if (parts.length !== 3) continue
      const [cId, aStr, mStr] = parts
      const a = parseInt(aStr)
      const m = parseInt(mStr) - 1
      if (isNaN(a) || isNaN(m)) continue

      const contaCartao = contas.find(c => c.id === cId && c.tipo === 'cartao')
      if (!contaCartao) continue

      const dm = dados[fatKey]
      const nDias = diasNoMes(m, a)
      let saidas = 0, entradas = 0
      for (let d = 1; d <= nDias; d++) {
        ;(dm.lancamentos[d] ?? []).forEach(l => {
          l.tipo === 'entrada' ? entradas += l.valor : saidas += l.valor
        })
      }
      const total = saidas - entradas

      const diaVenc = dm.vencimentoOverride ?? contaCartao.diaVencimento ?? 1

      // Tab = mês de vencimento, então a chave do extrato é o próprio mês da fatura
      const lancId = `fatura-${cId}-${a}-${String(m + 1).padStart(2, '0')}`
      const extratoKey = `${contaBancoId}-${a}-${String(m + 1).padStart(2, '0')}`
      const descricao = `Fatura ${contaCartao.banco}`

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

    localStorage.setItem('compass_extrato_dados', JSON.stringify(extrato))
    window.dispatchEvent(new CustomEvent('compass:extrato-updated'))
  }, [dados, contas]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-avança para a aba do período de faturamento atual
  // A aba representa o mês de VENCIMENTO da fatura, não o mês de compra
  useEffect(() => {
    const conta = contas.find(c => c.id === contaId)
    const diaFech = conta?.diaFechamento ?? 1
    const diaVenc = conta?.diaVencimento ?? 1
    const offset  = diaVenc < diaFech ? 1 : 0  // venc no mês seguinte ao fechamento
    if (diaHoje >= diaFech) {
      // Passou do fechamento: próximo período de faturamento
      let m = mesHoje + 1 + offset, a = anoHoje
      if (m > 11) { m -= 12; a++ }
      setMes(m); setAno(a); setDiaSel(1)
    } else {
      // Antes do fechamento: período atual
      let m = mesHoje + offset, a = anoHoje
      if (m > 11) { m = 0; a++ }
      setMes(m); setAno(a); setDiaSel(diaHoje)
    }
  }, [contaId, contas])

  useEffect(() => {
    if (eMesAtual)
      setTimeout(() => hojeRef.current?.scrollIntoView({behavior:'smooth',block:'center'}), 150)
    setDiasAbertos(new Set(eMesAtual ? [diaHoje] : []))
  }, [contaId, mes, ano])

  function diaDefaultPara(novoMes: number, novoAno: number) {
    return (novoMes===mesHoje && novoAno===anoHoje) ? diaHoje : 1
  }

  function ehDiaFuturo(dia: number) {
    const passadoDia = eMesAtual ? dia < diaHoje : (ano<anoHoje || (ano===anoHoje && mes<mesHoje))
    const ehHojeDia  = eMesAtual && dia === diaHoje
    return !passadoDia && !ehHojeDia
  }

  function toggleDia(dia: number) {
    setDiasAbertos(prev => {
      const next = new Set(prev)
      next.has(dia) ? next.delete(dia) : next.add(dia)
      return next
    })
  }

  function resetarParaNovo(novoDia: number) {
    setDiaSel(novoDia); setEditandoId(null); setEditandoDiaOriginal(null)
    setFTipo('saida'); setFCat(''); setFDesc(''); setFValor(''); setFParcelas('1')
    setTimeout(() => categoriaSelectRef.current?.focus(), 50)
  }

  function editarLancamento(dia: number, l: Lancamento) {
    setDiaSel(dia); setEditandoId(l.id); setEditandoDiaOriginal(dia)
    setFTipo(l.tipo); setFCat(l.categoria); setFDesc(l.descricao)
    setFValor(String(l.valor).replace('.', ','))
    setFParcelas(String(l.parcelas ?? 1))
    setTimeout(() => categoriaSelectRef.current?.focus(), 50)
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

  const totalFatura = totalSaidas - totalEntradas
  const diferenca   = faturaExtNum > 0 ? faturaExtNum - totalFatura : null
  const conciliado  = diferenca !== null && Math.abs(diferenca) < 0.01

  const totaisPorCartao = useMemo(() => {
    const cartoes = contas.filter(c => c.tipo === 'cartao')
    const nDias = diasNoMes(mes, ano)
    return cartoes.map(c => {
      const k = mesKey(c.id, ano, mes)
      const dm = dados[k] ?? DADOS_MES_VAZIO
      let saidas = 0, entradas = 0
      for (let d = 1; d <= nDias; d++) {
        ;(dm.lancamentos[d] ?? []).forEach(l => {
          l.tipo === 'entrada' ? entradas += l.valor : saidas += l.valor
        })
      }
      return { conta: c, total: saidas - entradas }
    })
  }, [dados, mes, ano, contas])

  const grandTotalFaturas = totaisPorCartao.reduce((s, x) => s + x.total, 0)

  function lancar() {
    const valorParcela = parseBRL(fValor)
    const nParcelas    = Math.max(1, parseInt(fParcelas) || 1)
    if (!fCat || valorParcela <= 0) return
    const baseId = `v-${Date.now()}`

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
          let m = mes + (p - 1)
          let a = ano
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
          }],
        }
      }))
    }

    setEditandoId(null); setEditandoDiaOriginal(null)
    setFCat(''); setFDesc(''); setFValor(''); setFParcelas('1')
    setTimeout(() => categoriaSelectRef.current?.focus(), 80)
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

  function toggleConsolidar(dia: number, id: string) {
    updateMes(prev => ({
      ...prev,
      lancamentos: {
        ...prev.lancamentos,
        [dia]: (prev.lancamentos[dia]??[]).map(l => l.id===id ? {...l, consolidado:!l.consolidado} : l),
      },
    }))
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

        {/* Linha 2: pill + fatura atual + total sistema + diferença + status + fechamento + vencimento */}
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          {contaInfo && (
            <span style={{fontSize:13,fontWeight:500,padding:'4px 10px',borderRadius:6,
              display:'inline-flex',alignItems:'center',gap:5,
              background:contaInfo.cor+'18',border:`1px solid ${contaInfo.cor}55`}}>
              <span>{contaInfo.icone}</span>
              <span style={{color:contaInfo.cor,fontWeight:600}}>{contaInfo.banco}</span>
              <span style={{fontWeight:700,color:totalFatura>0?COR.vermelho:COR.texto}}>{fmt(totalFatura)}</span>
            </span>
          )}
          {/* Badge PAGA / ABERTA */}
          <span style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20,
            background:faturaStatus==='paga'?'#dcfce7':'#fef9c3',
            color:faturaStatus==='paga'?'#166534':'#92400e',
            border:`1px solid ${faturaStatus==='paga'?'#86efac':'#fde68a'}`}}>
            {faturaStatus==='paga'?'✓ Paga':'● Aberta'}
          </span>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{fontSize:11,color:COR.textoSuave}}>Fatura atual cartão:</span>
            <input value={mesDados.faturaAtual}
              onChange={e => updateMes(prev=>({...prev,faturaAtual:e.target.value}))}
              onFocus={e => e.target.select()}
              onBlur={e => { const n = parseBRL(e.target.value); if (!isNaN(n) && e.target.value.trim()) updateMes(prev=>({...prev,faturaAtual:fmt(n)})) }}
              placeholder="R$ 0,00"
              style={{border:`1.5px solid ${COR.azul}`,borderRadius:7,padding:'5px 10px',
                fontSize:12,fontWeight:600,color:COR.azul,background:'#eff6ff',
                outline:'none',width:130,textAlign:'right',fontFamily:'inherit'}}/>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{fontSize:11,color:COR.textoSuave}}>Total sistema:</span>
            <span style={{fontSize:13,fontWeight:700,
              color:totalFatura>0?COR.vermelho:totalFatura<0?COR.verde:COR.textoSuave}}>
              {fmt(totalFatura)}
            </span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{fontSize:11,color:COR.textoSuave}}>Diferença:</span>
            <div style={{padding:'5px 12px',borderRadius:7,fontSize:12,fontWeight:600,
              background:diferenca===null?'#f1f5f9':conciliado?'#dcfce7':'#fee2e2',
              color:diferenca===null?COR.textoSuave:conciliado?'#166534':'#991b1b',
              border:`1px solid ${diferenca===null?COR.borda:conciliado?'#86efac':'#fca5a5'}`,
              minWidth:110,textAlign:'center'}}>
              {diferenca===null?'':conciliado?'✓ Conciliado':`${diferenca>0?'+':'-'}${fmt(Math.abs(diferenca))}`}
            </div>
          </div>
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
                dia {diaFechamento}
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

      {/* LISTA DE DIAS */}
      <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:6}}>

        {Array.from({length:totalDias},(_,i)=>i+1).map(dia => {
          const ehHoje   = eMesAtual && dia===diaHoje
          const passado  = eMesAtual ? dia<diaHoje : ano<anoHoje||(ano===anoHoje&&mes<mesHoje)
          const semana   = diaSemana(dia, mes, ano)
          const ls       = mesDados.lancamentos[dia] ?? []
          const temItens = ls.length > 0
          const selecionado = diaSel===dia
          const aberto    = diasAbertos.has(dia)
          const diaFuturo = !passado && !ehHoje

          const saidasDia  = ls.filter(l=>l.tipo==='saida').reduce((s,l)=>s+l.valor,0)
          const entradasDia = ls.filter(l=>l.tipo==='entrada').reduce((s,l)=>s+l.valor,0)
          const totalDia   = saidasDia - entradasDia

          // Indica o dia de vencimento
          const ehVencimento  = dia === diaVencimento && mes === mesVenc && ano === anoVenc

          return (
            <div key={dia}
              ref={ehHoje ? hojeRef : undefined}
              onClick={() => { toggleDia(dia); resetarParaNovo(dia) }}
              style={{borderRadius:12,overflow:'hidden',flexShrink:0,cursor:'pointer',
                position:'relative',zIndex:selecionado?7:6,
                border:`1.5px solid ${selecionado?COR.azul:ehHoje?'#93c5fd':COR.borda}`,
                background:COR.branco,
                boxShadow:selecionado?`0 0 0 3px rgba(26,86,219,0.12)`:
                  ehHoje?`0 0 0 2px rgba(147,197,253,0.3)`:'none',
              }}>

              {/* Cabeçalho do dia */}
              <div style={{display:'flex',alignItems:'center',gap:12,
                padding:'10px 16px',minHeight:54,
                background:selecionado?'#eff6ff':ehHoje?'#f0f7ff':'#fafbff',
                borderBottom:aberto&&(temItens||selecionado)?`1px solid ${selecionado?'#bfdbfe':COR.borda}`:'none'}}>

                <div style={{display:'flex',flexDirection:'column',alignItems:'center',minWidth:32,flexShrink:0}}>
                  <span style={{fontSize:18,fontWeight:700,lineHeight:1,
                    color:selecionado||ehHoje?COR.azul:COR.texto}}>
                    {String(dia).padStart(2,'0')}
                  </span>
                  <span style={{fontSize:10,color:'#94a3b8',
                    fontWeight:500,textTransform:'uppercase',letterSpacing:.3,marginTop:1}}>
                    {semana}
                  </span>
                </div>

                {ehHoje && (
                  <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',
                    borderRadius:4,background:'#dbeafe',color:COR.azul,
                    letterSpacing:.5,textTransform:'uppercase',flexShrink:0}}>Hoje</span>
                )}
                {ehVencimento && (
                  <span style={{fontSize:10,background:COR.vermelho,color:'#fff',
                    padding:'2px 8px',borderRadius:5,fontWeight:600,flexShrink:0}}>Vencimento</span>
                )}

                <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:6}}>
                  {temItens && (
                    <span style={{fontSize:13,fontWeight:700,
                      color:totalDia>0?COR.vermelho:COR.azul}}>
                      {totalDia>0?`-${fmt(totalDia)}`:`+${fmt(-totalDia)}`}
                    </span>
                  )}
                  <span style={{width:18,flexShrink:0,textAlign:'center',fontSize:14,
                    color:'#94a3b8',opacity:temItens?1:0,userSelect:'none',
                    display:'inline-block',transition:'transform .15s',
                    transform:aberto?'rotate(180deg)':'rotate(0deg)'}}>⌄</span>
                </div>
              </div>

              {/* Lançamentos — agrupados por tipo */}
              {aberto && (() => {
                const parcelados = ls.filter(l => l.parcelas && l.parcelas > 1)
                const manuais    = ls.filter(l => !l.parcelas || l.parcelas <= 1)
                const grupos: Array<{label: string; itens: typeof ls}> = []
                if (parcelados.length) grupos.push({label:'Parcelados', itens:parcelados})
                if (manuais.length)    grupos.push({label:'Manuais',    itens:manuais})
                const mostrarHeader = parcelados.length > 0 && manuais.length > 0

                const renderItem = (l: typeof ls[0]) => {
                  const catVisual = iconeCategoria(categorias, l.categoria)
                  const emEdicao  = editandoId === l.id
                  const corValor  = l.tipo==='entrada' ? COR.azul : COR.vermelho
                  return (
                    <div key={l.id}
                      onClick={e => { e.stopPropagation(); editarLancamento(dia, l) }}
                      style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',
                        padding:'10px 16px',borderBottom:`1px solid #f1f5f9`,
                        background:emEdicao?'#eff6ff':'transparent'}}
                      onMouseEnter={e=>{ if(!emEdicao) e.currentTarget.style.background='#fafbff' }}
                      onMouseLeave={e=>{ if(!emEdicao) e.currentTarget.style.background='transparent' }}>
                      <div style={{width:32,height:32,borderRadius:8,flexShrink:0,
                        display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,
                        background:catVisual.cor}}>
                        {catVisual.icone}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:500,color:COR.texto,
                          display:'flex',alignItems:'center',gap:5,flexWrap:'wrap'}}>
                          {l.descricao}
                          {l.parcelas && (
                            <span style={{fontSize:9,padding:'1px 5px',borderRadius:3,fontWeight:700,
                              background:'#ede9fe',color:'#7c3aed'}}>
                              {l.parcelaAtual}/{l.parcelas}
                            </span>
                          )}
                        </div>
                        <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>{l.categoria}</div>
                      </div>
                      <div style={{fontSize:13,fontWeight:600,color:corValor}}>
                        {l.tipo==='entrada'?'+':'-'}{fmt(l.valor)}
                      </div>
                      <button onClick={e => { e.stopPropagation(); excluir(dia, l.id) }}
                        style={{border:'none',background:'transparent',cursor:'pointer',
                          color:'#cbd5e1',fontSize:14,padding:'2px 5px',borderRadius:4}}
                        onMouseEnter={e=>(e.currentTarget.style.color=COR.vermelho)}
                        onMouseLeave={e=>(e.currentTarget.style.color='#cbd5e1')}>✕</button>
                    </div>
                  )
                }

                return grupos.map(g => (
                  <div key={g.label}>
                    {mostrarHeader && (
                      <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:.5,
                        color:COR.textoSuave,padding:'4px 16px',background:'#f8faff',
                        borderBottom:`1px solid ${COR.borda}`}}>
                        {g.label}
                      </div>
                    )}
                    {g.itens.map(renderItem)}
                  </div>
                ))
              })()}

            </div>
          )
        })}

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

        <div style={{display:'flex',alignItems:'flex-end',gap:8,marginBottom:14}}>
          <div style={{flex:'0 0 64px'}}>
            <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:4}}>Dia</div>
            <input type="number" min={1} max={totalDias} value={diaSel}
              onChange={e => setDiaSel(Math.min(Math.max(parseInt(e.target.value)||1,1),totalDias))}
              onFocus={realcarFoco} onBlur={removerRealce}
              style={{border:'1.5px solid #bae6fd',borderRadius:7,padding:'7px 10px',
                fontSize:12,outline:'none',background:'#fff',
                fontFamily:'inherit',color:COR.texto,width:'100%',textAlign:'center'}} />
          </div>
          <div style={{fontSize:11,color:'#94a3b8',paddingBottom:8}}>
            {NOMES_MESES[mes]} · {diaSemana(diaSel,mes,ano)}
          </div>
        </div>

        <div style={{display:'flex',background:'#e0f2fe',borderRadius:7,
          padding:3,marginBottom:12,width:'fit-content'}}>
          {(['saida','entrada'] as const).map(t => (
            <button key={t} onClick={() => setFTipo(t)} style={{
              padding:'5px 14px',border:'none',borderRadius:5,
              cursor:'pointer',fontSize:12,fontWeight:500,
              fontFamily:'inherit',transition:'all .15s',
              background:fTipo===t?COR.branco:'transparent',
              color:fTipo===t?(t==='entrada'?COR.azul:COR.vermelho):'#0369a1',
              boxShadow:fTipo===t?'0 1px 2px rgba(0,0,0,.08)':'none'}}>
              {t==='entrada'?'↑ Estorno':'↓ Compra'}
            </button>
          ))}
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:10}}>
          <div>
            <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:4}}>Categoria</div>
            <select ref={categoriaSelectRef} autoFocus value={fCat}
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
            <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:4}}>Descrição</div>
            <input value={fDesc} onChange={e=>setFDesc(e.target.value)}
              placeholder="Ex: Mercado Extra, Farmácia..."
              onFocus={realcarFoco} onBlur={removerRealce}
              style={{border:`1.5px solid #bae6fd`,borderRadius:7,padding:'7px 10px',
                fontSize:12,outline:'none',background:'#fff',
                fontFamily:'inherit',color:COR.texto,width:'100%'}}
              onKeyDown={e=>e.key==='Enter'&&lancar()}/>
          </div>
          <div>
            <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:4}}>Parcelas</div>
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => {
                const parcelasAtual = Math.max(1, parseInt(fParcelas) || 1)
                const ativo = parcelasAtual === n
                return (
                  <button key={n} onClick={()=>setFParcelas(String(n))} style={{
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
                value={parseInt(fParcelas)>12 ? fParcelas : ''}
                onChange={e => { if(e.target.value) setFParcelas(e.target.value) }}
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
