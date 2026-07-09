import { useState, useMemo, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import AppHeader from '../components/AppHeader'
import { iconeCategoria, ehAutomaticoCategoria, ehCartaoCategoria } from '../utils/categoriaIcone'
import FaturaCartao from './FaturaCartao'

const COR = {
  azul: '#1a56db', azulEscuro: '#0f2878', azulMedio: '#2563eb',
  fundo: '#f0f4ff', branco: '#ffffff', texto: '#0f172a',
  textoSuave: '#64748b', borda: '#e2e8f0',
  verde: '#16a34a', vermelho: '#dc2626',
}

type TipoLanc = 'entrada' | 'saida'
type FormaPag = 'debito' | 'credito' | 'pix' | 'transferencia' | 'dinheiro'

type CatFixa = {
  id: string; nome: string; categoria: string
  valor: number; tipo: TipoLanc
  formaPagamento: FormaPag
  diaVencimento: number
}

type Lancamento = {
  id: string; tipo: TipoLanc
  descricao: string; categoria: string
  valor: number; formaPagamento: FormaPag
  tipoLanc: 'fixa'|'variavel'
  consolidado?: boolean
}

type DadosMes = {
  lancamentos: Record<number, Lancamento[]>
  saldoBanco: string
  fixasConsolidadas?: Record<string, boolean>
  fixasMovidas?: Record<string, number>
  fixasValorOverride?: Record<string, number>
  fixasDescOverride?: Record<string, string>
  fixasPagOverride?: Record<string, FormaPag>
}

function ehFimDeSemana(dia: number, mes: number, ano: number) {
  const dow = new Date(ano, mes, dia).getDay()
  return dow === 0 || dow === 6
}
function diaUtilOuProximo(dia: number, mes: number, ano: number, totalDias: number) {
  let d = dia
  while (d <= totalDias && ehFimDeSemana(d, mes, ano)) d++
  return Math.min(d, totalDias)
}
function diaEfetivoFixa(
  f: CatFixa, overrides: Record<string, number> | undefined,
  automatico: boolean, mes: number, ano: number, totalDias: number,
) {
  const override = overrides?.[f.id]
  if (override !== undefined) return override
  if (automatico) return diaUtilOuProximo(f.diaVencimento, mes, ano, totalDias)
  return f.diaVencimento
}


const NOMES_MESES  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MESES_CURTOS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const DIAS_SEM     = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']


const FORMAS_SAI: { id: FormaPag; label: string }[] = [
  { id:'debito',        label:'Débito'        },
  { id:'pix',           label:'Pix'           },
  { id:'transferencia', label:'Transferência' },
  { id:'dinheiro',      label:'Dinheiro'      },
]
const FORMAS_ENT: { id: FormaPag; label: string }[] = [
  { id:'credito',       label:'Crédito'       },
  { id:'pix',           label:'Pix'           },
  { id:'transferencia', label:'Transferência' },
  { id:'dinheiro',      label:'Dinheiro'      },
]

function realcarFoco(e: React.FocusEvent<HTMLElement>) {
  e.currentTarget.style.border = `1.5px solid ${COR.azul}`
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,86,219,0.15)'
}
function removerRealce(e: React.FocusEvent<HTMLElement>) {
  e.currentTarget.style.border = '1.5px solid #bae6fd'
  e.currentTarget.style.boxShadow = 'none'
}
function fmt(v: number) { return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) }
function parseBRL(s: string) { return parseFloat(s.replace(/[R$\s.]/g,'').replace(',','.')) || 0 }
function diasNoMes(mes: number, ano: number) { return new Date(ano, mes+1, 0).getDate() }
function diaSemana(d: number, m: number, a: number) { return DIAS_SEM[new Date(a,m,d).getDay()] }
function mesKey(conta: string, ano: number, mes: number) {
  return `${conta}-${ano}-${String(mes+1).padStart(2,'0')}`
}

function formaPagCategoria(fp: string | undefined, mov: string | undefined): FormaPag {
  if (mov === 'dinheiro') return 'dinheiro'
  if (fp === 'pix') return 'pix'
  if (fp === 'transferencia') return 'transferencia'
  return 'debito'
}
function formaRecebCategoria(fp: string | undefined, mov: string | undefined): FormaPag {
  if (mov === 'dinheiro') return 'dinheiro'
  if (fp === 'pix') return 'pix'
  if (fp === 'transferencia') return 'transferencia'
  return 'credito'
}

export default function NovoLancamentoExtrato() {
  const hoje      = new Date()
  const diaHoje   = hoje.getDate()
  const mesHoje   = hoje.getMonth()
  const anoHoje   = hoje.getFullYear()

  const [contaId, setContaId] = useState('')
  const [mes,     setMes]     = useState(mesHoje)
  const [ano]                  = useState(anoHoje)
  const [diaSel,  setDiaSel]  = useState<number>(diaHoje)
  const [editandoId, setEditandoId] = useState<string|null>(null)
  const [editandoDiaOriginal, setEditandoDiaOriginal] = useState<number|null>(null)
  const [editandoFixaId, setEditandoFixaId] = useState<string|null>(null)
  const [fTipo,   setFTipo]   = useState<TipoLanc>('saida')
  const [fCat,    setFCat]    = useState('')
  const [fDesc,   setFDesc]   = useState('')
  const [fValor,  setFValor]  = useState('')
  const [fPag,    setFPag]    = useState<FormaPag>('debito')
  const [modo, setModo] = useState<'banco'|'cartao'>('banco')
  const [confirmandoFixaId, setConfirmandoFixaId] = useState<string|null>(null)
  const [diaConfirmacao,    setDiaConfirmacao]     = useState('')

  const hojeRef = useRef<HTMLDivElement>(null)
  const categoriaSelectRef = useRef<HTMLSelectElement>(null)
  const valorInputRef = useRef<HTMLInputElement>(null)
  const { contas, categorias, extratoData, updateExtratoMes } = useApp()
  const contasExtrato = contas.filter(c => c.tipo === 'corrente' || c.tipo === 'poupanca')
  const contaIdEfetivo = contasExtrato.find(c => c.id === contaId)?.id ?? contasExtrato[0]?.id ?? ''
  const dados = extratoData as Record<string, DadosMes>
  const fixas = categorias
    .filter(c => c.fixa && c.ativa && c.tipoMovimento !== 'cartao')
    .map(c => ({
      id: c.id, nome: c.nome, categoria: c.nome,
      valor: c.valorPadrao ?? 0, tipo: c.tipo as TipoLanc,
      formaPagamento: formaPagCategoria(c.formaPagamento, c.tipoMovimento),
      diaVencimento: c.diaVencimento ?? 1,
    }))
  const categoriasVariaveis = categorias
    .filter(c => c.tipo === fTipo)
    .sort((a,b) => a.nome.localeCompare(b.nome,'pt-BR'))
  const contaInfo     = contas.find(c => c.id === contaIdEfetivo)
  const SALDO_INICIAL = contaInfo?.saldoInicial ?? 0
  const totalDias = diasNoMes(mes, ano)
  const eMesAtual = mes===mesHoje && ano===anoHoje
  const key       = mesKey(contaIdEfetivo, ano, mes)
  const mesDados  = dados[key] ?? { lancamentos:{}, saldoBanco:'' }
  const saldoExtNum = parseBRL(mesDados.saldoBanco)

  useEffect(() => {
    if (eMesAtual)
      setTimeout(() => hojeRef.current?.scrollIntoView({behavior:'smooth',block:'center'}), 150)
  }, [contaId, mes, ano])

  function diaDefaultPara(novoMes: number, novoAno: number) {
    return (novoMes===mesHoje && novoAno===anoHoje) ? diaHoje : 1
  }

  function ehDiaFuturo(dia: number) {
    const passadoDia = eMesAtual ? dia < diaHoje : (ano<anoHoje || (ano===anoHoje && mes<mesHoje))
    const ehHojeDia  = eMesAtual && dia === diaHoje
    return !passadoDia && !ehHojeDia
  }

  function resetarParaNovo(novoDia: number) {
    setDiaSel(novoDia); setEditandoId(null); setEditandoDiaOriginal(null); setEditandoFixaId(null)
    setFTipo('saida'); setFCat(''); setFDesc(''); setFValor('')
    setTimeout(() => categoriaSelectRef.current?.focus(), 50)
  }

  function editarLancamento(dia: number, l: Lancamento) {
    setDiaSel(dia); setEditandoId(l.id); setEditandoDiaOriginal(dia); setEditandoFixaId(null)
    setFTipo(l.tipo); setFCat(l.categoria); setFDesc(l.descricao)
    setFValor(String(l.valor).replace('.', ',')); setFPag(l.formaPagamento)
    setTimeout(() => categoriaSelectRef.current?.focus(), 50)
  }

  function editarFixa(dia: number, f: CatFixa) {
    setDiaSel(dia); setEditandoId(null); setEditandoDiaOriginal(null); setEditandoFixaId(f.id)
    setFTipo(f.tipo); setFCat(f.categoria)
    setFDesc(mesDados.fixasDescOverride?.[f.id] ?? f.nome)
    setFValor(String(mesDados.fixasValorOverride?.[f.id] ?? f.valor).replace('.', ','))
    setFPag(mesDados.fixasPagOverride?.[f.id] ?? f.formaPagamento)
    setTimeout(() => valorInputRef.current?.focus(), 50)
  }

  function updateMes(fn: (prev: DadosMes) => DadosMes) {
    updateExtratoMes(key, fn as unknown as (prev: import('../context/AppContext').DadosMes) => import('../context/AppContext').DadosMes)
  }

  function ehAutomatico(f: CatFixa) {
    return ehAutomaticoCategoria(categorias, f.categoria)
  }

  function desconsolidarFixa(fixaId: string) {
    updateMes(prev => ({
      ...prev,
      fixasConsolidadas: { ...prev.fixasConsolidadas, [fixaId]: false },
    }))
  }

  function confirmarBoleto(f: CatFixa, diaPago: number) {
    updateMes(prev => {
      const fixasMovidas = { ...prev.fixasMovidas }
      if (diaPago === f.diaVencimento) delete fixasMovidas[f.id]
      else fixasMovidas[f.id] = diaPago
      return {
        ...prev,
        fixasMovidas,
        fixasConsolidadas: { ...prev.fixasConsolidadas, [f.id]: true },
      }
    })
    setConfirmandoFixaId(null)
  }

  const saldosDia = useMemo(() => {
    const dadosMesAtual = dados[key]
    const lancs     = (dadosMesAtual ?? { lancamentos:{} }).lancamentos
    const overrides = dadosMesAtual?.fixasMovidas
    const fc    = fixas.filter(f => !ehCartaoCategoria(categorias, f.categoria))
    let saldo = SALDO_INICIAL
    const res: Record<number,number> = {}
    for (let d=1; d<=totalDias; d++) {
      fc.filter(f=>diaEfetivoFixa(f,overrides,ehAutomatico(f),mes,ano,totalDias)===d)
        .forEach(f=>{ const v = dadosMesAtual?.fixasValorOverride?.[f.id] ?? f.valor; saldo += f.tipo==='entrada'?v:-v })
      ;(lancs[d]??[]).forEach(l=>{ saldo += l.tipo==='entrada'?l.valor:-l.valor })
      res[d] = saldo
    }
    return res
  }, [dados, key, contaId, totalDias, mes, ano, categorias])

  const { totalEntradas, totalSaidas } = useMemo(() => {
    const dadosMesAtual = dados[key]
    const lancs     = (dadosMesAtual ?? { lancamentos:{} }).lancamentos
    const overrides = dadosMesAtual?.fixasMovidas
    const fc    = fixas.filter(f => !ehCartaoCategoria(categorias, f.categoria))
    let te=0, ts=0
    for (let d=1; d<=totalDias; d++) {
      fc.filter(f=>diaEfetivoFixa(f,overrides,ehAutomatico(f),mes,ano,totalDias)===d)
        .forEach(f=>{ const v = dadosMesAtual?.fixasValorOverride?.[f.id] ?? f.valor; f.tipo==='entrada'?te+=v:ts+=v })
      ;(lancs[d]??[]).forEach(l=>{ l.tipo==='entrada'?te+=l.valor:ts+=l.valor })
    }
    return { totalEntradas:te, totalSaidas:ts }
  }, [dados, key, contaId, totalDias, mes, ano, categorias])

  const saldoMes   = SALDO_INICIAL + totalEntradas - totalSaidas
  const diferenca  = saldoExtNum > 0 ? saldoExtNum - saldoMes : null
  const conciliado = diferenca !== null && Math.abs(diferenca) < 0.01

  function lancar() {
    const valor = parseBRL(fValor)
    if (editandoFixaId) {
      if (valor <= 0) return
      const diaAlvo = diaSel
      updateMes(prev => ({
        ...prev,
        fixasMovidas:       { ...prev.fixasMovidas,       [editandoFixaId]: diaAlvo },
        fixasValorOverride: { ...prev.fixasValorOverride, [editandoFixaId]: valor },
        fixasDescOverride:  { ...prev.fixasDescOverride,  [editandoFixaId]: fDesc.trim() },
        fixasPagOverride:   { ...prev.fixasPagOverride,   [editandoFixaId]: fPag },
      }))
      setEditandoFixaId(null)
      setFCat(''); setFDesc(''); setFValor('')
      setTimeout(() => categoriaSelectRef.current?.focus(), 80)
      return
    }
    if (!fCat || valor <= 0) return
    const diaFuturoAlvo = ehDiaFuturo(diaSel)
    if (editandoId) {
      const diaOrigem = editandoDiaOriginal ?? diaSel
      const idAtual = editandoId
      updateMes(prev => {
        const listaOrigem = prev.lancamentos[diaOrigem] ?? []
        const entrada = listaOrigem.find(l => l.id===idAtual)
        if (!entrada) return prev
        const precisaRecalcular = diaOrigem !== diaSel
        const novoConsolidado = precisaRecalcular ? !diaFuturoAlvo : entrada.consolidado
        const atualizada: Lancamento = {
          ...entrada, tipo:fTipo, descricao:fDesc.trim()||fCat, categoria:fCat,
          valor, formaPagamento:fPag, consolidado:novoConsolidado,
        }
        if (diaOrigem === diaSel) {
          return { ...prev, lancamentos: { ...prev.lancamentos, [diaOrigem]: listaOrigem.map(l => l.id===idAtual ? atualizada : l) } }
        }
        return {
          ...prev,
          lancamentos: {
            ...prev.lancamentos,
            [diaOrigem]: listaOrigem.filter(l => l.id!==idAtual),
            [diaSel]: [...(prev.lancamentos[diaSel]??[]), atualizada],
          }
        }
      })
    } else {
      updateMes(prev => ({
        ...prev,
        lancamentos: {
          ...prev.lancamentos,
          [diaSel]: [...(prev.lancamentos[diaSel]??[]), {
            id:`v-${Date.now()}`, tipo:fTipo,
            descricao:fDesc.trim()||fCat, categoria:fCat,
            valor, formaPagamento:fPag, tipoLanc:'variavel',
            consolidado: !diaFuturoAlvo,
          }],
        }
      }))
    }
    setEditandoId(null); setEditandoDiaOriginal(null)
    setFCat(''); setFDesc(''); setFValor('')
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
    setFCat(''); setFDesc(''); setFValor('')
  }

  function toggleConsolidarLancamento(dia: number, id: string) {
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
      setFCat(''); setFDesc(''); setFValor('')
    }
  }

  function BadgePag({ fp }: { fp: FormaPag }) {
    const map: Record<FormaPag,{bg:string;cor:string;label:string}> = {
      debito:        {bg:'#fef9c3',cor:'#92400e', label:'Déb'},
      credito:       {bg:'#eff6ff',cor:'#1a56db', label:'Créd'},
      pix:           {bg:'#d1fae5',cor:'#065f46', label:'Pix'},
      transferencia: {bg:'#e0f2fe',cor:'#0369a1', label:'TED'},
      dinheiro:      {bg:'#f1f5f9',cor:'#475569', label:'Din'},
    }
    const s = map[fp]
    return <span style={{fontSize:9,padding:'1px 5px',borderRadius:3,fontWeight:700,background:s.bg,color:s.cor}}>{s.label}</span>
  }

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',
      background:COR.fundo,fontFamily:"-apple-system,'Inter',sans-serif",overflow:'hidden'}}>

      <AppHeader currentPath="/novo-lancamento" />

      {/* MODO: Extrato bancário vs Fatura cartão */}
      <div style={{background:COR.branco,borderBottom:`1px solid ${COR.borda}`,
        padding:'10px 16px',flexShrink:0,display:'flex',gap:6}}>
        {([['banco','🏦 Extrato Bancário'],['cartao','💳 Fatura Cartão']] as const).map(([v,l]) => (
          <button key={v} onClick={() => setModo(v)} style={{
            padding:'7px 16px',borderRadius:8,
            border:`1.5px solid ${modo===v?COR.azul:COR.borda}`,
            cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'inherit',
            background:modo===v?COR.azul:'#f8faff',color:modo===v?'#fff':COR.textoSuave}}>
            {l}
          </button>
        ))}
      </div>

      {modo==='cartao' ? <FaturaCartao /> : (
      <>
      {/* ABAS DE BANCO */}
      <div style={{background:COR.branco,borderBottom:`1px solid ${COR.borda}`,
        padding:'10px 16px 0',flexShrink:0,display:'flex',gap:3,overflowX:'auto'}}>
        {contasExtrato.map(c => {
          const ativa = c.id===contaIdEfetivo
          return (
            <button key={c.id} onClick={() => { setContaId(c.id); resetarParaNovo(diaDefaultPara(mes,ano)) }} style={{
              display:'flex',alignItems:'center',gap:6,
              padding:'7px 14px',borderRadius:'8px 8px 0 0',
              border:`1px solid ${ativa?COR.azul:COR.borda}`,
              cursor:'pointer',fontSize:12,fontWeight:ativa?700:500,fontFamily:'inherit',whiteSpace:'nowrap',
              background:ativa?COR.azul:'#f8faff',color:ativa?'#fff':COR.textoSuave,
              position:'relative',zIndex:ativa?1:0}}>
              <div style={{width:7,height:7,borderRadius:'50%',background:ativa?'#fff':c.cor}}/>
              {c.icone} {c.nome}
              <span style={{fontSize:9,color:ativa?'rgba(255,255,255,0.8)':'#94a3b8',fontWeight:400,marginLeft:2}}>{c.banco}</span>
            </button>
          )
        })}
      </div>

      {/* ABAS DE MÊS */}
      <div style={{background:COR.branco,borderBottom:`1px solid ${COR.borda}`,
        padding:'10px 16px 0',flexShrink:0,display:'flex',gap:3,overflowX:'auto'}}>
        {MESES_CURTOS.map((m,i) => {
          const isAtual = i===mesHoje && ano===anoHoje
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

      {/* BARRA DE SALDO */}
      <div style={{background:COR.branco,borderBottom:`2px solid ${COR.borda}`,
        padding:'8px 16px',flexShrink:0,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:12,fontWeight:600,color:COR.texto}}>{NOMES_MESES[mes]} {ano}</span>
        <span style={{color:COR.borda}}>|</span>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <span style={{fontSize:11,color:COR.textoSuave}}>Extrato atual banco:</span>
          <input value={mesDados.saldoBanco}
            onChange={e => updateMes(prev=>({...prev,saldoBanco:e.target.value}))}
            placeholder="R$ 0,00"
            style={{border:`1.5px solid ${COR.azul}`,borderRadius:7,padding:'5px 10px',
              fontSize:12,fontWeight:600,color:COR.azul,background:'#eff6ff',
              outline:'none',width:130,textAlign:'right',fontFamily:'inherit'}}/>
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
        <span style={{fontSize:11,color:COR.azul,fontWeight:500}}>↑ {fmt(totalEntradas)}</span>
        <span style={{fontSize:11,color:COR.vermelho,fontWeight:500}}>↓ {fmt(totalSaidas)}</span>
        <span style={{fontSize:11,color:COR.azul,fontWeight:700}}>= {fmt(saldoMes)}</span>
      </div>

      {/* CONTEÚDO: lista + painel de lançamento */}
      <div style={{flex:1,display:'flex',gap:16,padding:'10px 16px',overflow:'hidden'}}>

      {/* EXTRATO */}
      <div style={{flex:1,overflowY:'auto',
        display:'flex',flexDirection:'column',gap:6}}>

        {Array.from({length:totalDias},(_,i)=>i+1).map(dia => {
          const ehHoje    = eMesAtual && dia===diaHoje
          const passado   = eMesAtual ? dia<diaHoje : ano<anoHoje||(ano===anoHoje&&mes<mesHoje)
          const semana    = diaSemana(dia, mes, ano)
          const fs        = fixas.filter(f=>diaEfetivoFixa(f,mesDados.fixasMovidas,ehAutomatico(f),mes,ano,totalDias)===dia)
          const ls        = mesDados.lancamentos[dia] ?? []
          const temItens  = fs.length>0 || ls.length>0
          const saldoIni  = dia===1 ? SALDO_INICIAL : (saldosDia[dia-1] ?? SALDO_INICIAL)
          const diaFuturo = !passado && !ehHoje
          // Valor exibido: projeção total (todos os itens do dia)
          const entradasDia = fs.filter(f=>f.tipo==='entrada')
            .reduce((s,f)=>s+(mesDados.fixasValorOverride?.[f.id]??f.valor),0)
            + ls.filter(l=>l.tipo==='entrada').reduce((s,l)=>s+l.valor,0)
          const saidasDia = fs.filter(f=>f.tipo==='saida')
            .reduce((s,f)=>s+(mesDados.fixasValorOverride?.[f.id]??f.valor),0)
            + ls.filter(l=>l.tipo==='saida').reduce((s,l)=>s+l.valor,0)
          // Cor dos boxes: apenas itens consolidados (hoje e futuros filtram; passado = tudo consolidado)
          const entradasColor = passado ? entradasDia
            : fs.filter(f=>f.tipo==='entrada'&&(mesDados.fixasConsolidadas?.[f.id]??false))
                .reduce((s,f)=>s+(mesDados.fixasValorOverride?.[f.id]??f.valor),0)
              + ls.filter(l=>l.tipo==='entrada'&&(diaFuturo?l.consolidado===true:true)).reduce((s,l)=>s+l.valor,0)
          const saidasColor = passado ? saidasDia
            : fs.filter(f=>f.tipo==='saida'&&(mesDados.fixasConsolidadas?.[f.id]??false))
                .reduce((s,f)=>s+(mesDados.fixasValorOverride?.[f.id]??f.valor),0)
              + ls.filter(l=>l.tipo==='saida'&&(diaFuturo?l.consolidado===true:true)).reduce((s,l)=>s+l.valor,0)
          // ATUAL: tem consolidados hoje → exibe só confirmados; PREVISTO → exibe projeção total
          const temConsolidado = ehHoje && (entradasColor > 0 || saidasColor > 0)
          const entradasBoxVal = temConsolidado ? entradasColor : entradasDia
          const saidasBoxVal   = temConsolidado ? saidasColor   : saidasDia
          const saldoDia = temConsolidado
            ? saldoIni + entradasColor - saidasColor
            : saldosDia[dia]
          const selecionado = diaSel===dia
          const corIni    = saldoIni<0 ? COR.vermelho : COR.verde
          const corSaldo  = saldoDia<0 ? COR.vermelho : COR.verde

          return (
            <div key={dia}
              ref={ehHoje ? hojeRef : undefined}
              onClick={() => resetarParaNovo(dia)}
              style={{borderRadius:12,overflow:'hidden',flexShrink:0,cursor:'pointer',
                position:'relative',zIndex:selecionado?7:6,
                border:`1.5px solid ${selecionado?COR.azul:ehHoje?'#93c5fd':COR.borda}`,
                background:COR.branco,
                boxShadow:selecionado?`0 0 0 3px rgba(26,86,219,0.12)`:
                  ehHoje?`0 0 0 2px rgba(147,197,253,0.3)`:'none',
              }}>

              {/* Cabeçalho */}
              <div style={{display:'flex',alignItems:'center',gap:12,
                padding:'10px 16px',minHeight:54,
                background:selecionado?'#eff6ff':ehHoje?'#f0f7ff':'#fafbff',
                borderBottom:temItens||selecionado?`1px solid ${selecionado?'#bfdbfe':COR.borda}`:'none'}}>

                <div style={{display:'flex',flexDirection:'column',
                  alignItems:'center',minWidth:32,flexShrink:0}}>
                  <span style={{fontSize:17,fontWeight:700,lineHeight:1,
                    color:selecionado||ehHoje?COR.azul:COR.texto}}>
                    {String(dia).padStart(2,'0')}
                  </span>
                  <span style={{fontSize:9,color:selecionado||ehHoje?COR.azulMedio:'#94a3b8',
                    fontWeight:600,textTransform:'uppercase',letterSpacing:.3,marginTop:2}}>
                    {semana}
                  </span>
                </div>

                {ehHoje && (
                  <span style={{fontSize:10,background:COR.azul,color:'#fff',
                    padding:'2px 8px',borderRadius:5,fontWeight:600,flexShrink:0}}>Hoje</span>
                )}

                {/* Inicial | Entradas | Saída | Final */}
                <div style={{flex:1,display:'flex',alignItems:'center',
                  justifyContent:'flex-end',gap:6}}>

                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',
                    padding:'5px 10px',borderRadius:8,minWidth:96,
                    background:saldoIni<0?'#fff1f2':'#f0fdf4',
                    border:`1px solid ${saldoIni<0?'#fecdd3':'#bbf7d0'}`}}>
                    <span style={{fontSize:9,fontWeight:600,
                      textTransform:'uppercase',letterSpacing:.4,marginBottom:1,color:corIni}}>Inicial</span>
                    <span style={{fontSize:12,fontWeight:600,color:corIni}}>{fmt(saldoIni)}</span>
                  </div>

                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',
                    padding:'5px 10px',borderRadius:8,minWidth:96,
                    background:entradasColor===0?'#f8faff':'#eff6ff',
                    border:`1px solid ${entradasColor===0?COR.borda:'#bfdbfe'}`}}>
                    <span style={{fontSize:9,fontWeight:600,textTransform:'uppercase',
                      letterSpacing:.4,marginBottom:1,
                      color:entradasColor===0?'#94a3b8':COR.azul}}>
                      Entradas
                    </span>
                    <span style={{fontSize:12,fontWeight:700,
                      color:entradasColor===0?'#94a3b8':COR.azul}}>
                      {entradasBoxVal===0?'—':`+${fmt(entradasBoxVal)}`}
                    </span>
                  </div>

                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',
                    padding:'5px 10px',borderRadius:8,minWidth:96,
                    background:saidasColor===0?'#f8faff':'#fff1f2',
                    border:`1px solid ${saidasColor===0?COR.borda:'#fecdd3'}`}}>
                    <span style={{fontSize:9,fontWeight:600,textTransform:'uppercase',
                      letterSpacing:.4,marginBottom:1,
                      color:saidasColor===0?'#94a3b8':COR.vermelho}}>
                      Saída
                    </span>
                    <span style={{fontSize:12,fontWeight:700,
                      color:saidasColor===0?'#94a3b8':COR.vermelho}}>
                      {saidasBoxVal===0?'—':`-${fmt(saidasBoxVal)}`}
                    </span>
                  </div>

                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',
                    padding:'5px 10px',borderRadius:8,minWidth:96,
                    background:saldoDia<0?'#fff1f2':'#f0fdf4',
                    border:`1px solid ${saldoDia<0?'#fecdd3':'#bbf7d0'}`}}>
                    <span style={{fontSize:9,fontWeight:600,textTransform:'uppercase',
                      letterSpacing:.4,marginBottom:1,color:corSaldo}}>
                      {passado?'Final':temConsolidado?'Atual':'Previsto'}
                    </span>
                    <span style={{fontSize:12,fontWeight:700,color:corSaldo}}>{fmt(saldoDia)}</span>
                  </div>
                </div>
              </div>

              {/* Fixas */}
              {fs.map(f => {
                const catVisual = iconeCategoria(categorias, f.categoria)
                const automatico = ehAutomatico(f)
                const consolidada = mesDados.fixasConsolidadas?.[f.id] !== undefined
                  ? mesDados.fixasConsolidadas[f.id]
                  : (automatico ? passado : false)
                const corValor = consolidada ? (f.tipo==='entrada'?COR.azul:COR.vermelho) : '#94a3b8'
                const confirmando = confirmandoFixaId === f.id
                const emEdicaoFixa = editandoFixaId === f.id
                const valorMostrado = mesDados.fixasValorOverride?.[f.id] ?? f.valor
                return (
                <div key={f.id} onClick={e => e.stopPropagation()}
                  style={{background:emEdicaoFixa?'#eff6ff':'transparent'}}>
                  <div onClick={() => editarFixa(dia, f)}
                    style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',
                    padding:'10px 16px',borderBottom:`1px solid #f1f5f9`}}>
                    {!passado && (
                      <input type="checkbox" checked={consolidada}
                        onClick={e => e.stopPropagation()}
                        onChange={() => {
                          if (consolidada) {
                            desconsolidarFixa(f.id)
                          } else if (automatico) {
                            updateMes(prev => ({
                              ...prev,
                              fixasConsolidadas: { ...prev.fixasConsolidadas, [f.id]: true }
                            }))
                          } else {
                            setConfirmandoFixaId(f.id)
                            setDiaConfirmacao(String(dia))
                          }
                        }}
                        title="Consolidar lançamento"
                        style={{cursor:'pointer',width:15,height:15,flexShrink:0}} />
                    )}
                    <div style={{width:32,height:32,borderRadius:8,flexShrink:0,
                      display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,
                      background:catVisual.cor,opacity:consolidada?1:0.5}}>
                      {catVisual.icone}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:500,
                        color:consolidada?COR.texto:'#94a3b8',
                        display:'flex',alignItems:'center',gap:5}}>
                        {f.nome}
                        <span style={{fontSize:9,padding:'1px 5px',borderRadius:3,fontWeight:600,
                          background:consolidada?'#e0f2fe':'#f1f5f9',
                          color:consolidada?'#0369a1':'#94a3b8'}}>
                          {consolidada ? (automatico && passado ? 'fixa ✓' : 'consolidado') : 'não consolidado'}
                        </span>
                        {automatico && f.tipo==='saida' && (
                          <span style={{fontSize:9,padding:'1px 5px',borderRadius:3,fontWeight:600,
                            background:'#f1f5f9',color:'#94a3b8'}}>
                            débito automático
                          </span>
                        )}
                      </div>
                      <div style={{fontSize:10,color:'#94a3b8',marginTop:2,
                        display:'flex',alignItems:'center',gap:4}}>
                        {f.categoria} <BadgePag fp={f.formaPagamento}/>
                      </div>
                    </div>
                    <div style={{fontSize:13,fontWeight:600,color:corValor}}>
                      {f.tipo==='entrada'?'+':'-'}{fmt(valorMostrado)}
                    </div>
                  </div>

                  {/* Confirmação inline — boleto */}
                  {confirmando && (
                    <div style={{display:'flex',alignItems:'center',gap:8,
                      padding:'8px 16px',background:'#f0f9ff',borderBottom:'1px solid #bae6fd'}}>
                      <span style={{fontSize:10,color:'#0369a1',fontWeight:600}}>
                        Pago no dia:
                      </span>
                      <input type="number" min={1} max={totalDias} autoFocus
                        value={diaConfirmacao}
                        onChange={e => setDiaConfirmacao(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            const d = Math.min(Math.max(parseInt(diaConfirmacao)||dia,1),totalDias)
                            confirmarBoleto(f, d)
                          }
                          if (e.key === 'Escape') setConfirmandoFixaId(null)
                        }}
                        style={{width:50,border:'1.5px solid #bae6fd',borderRadius:6,
                          padding:'4px 8px',fontSize:12,outline:'none',background:'#fff',
                          fontFamily:'inherit',color:COR.texto,textAlign:'center'}} />
                      <button onClick={() => {
                        const d = Math.min(Math.max(parseInt(diaConfirmacao)||dia,1),totalDias)
                        confirmarBoleto(f, d)
                      }} style={{border:'none',borderRadius:6,padding:'5px 12px',
                        fontSize:11,fontWeight:600,color:'#fff',background:COR.azul,cursor:'pointer',
                        fontFamily:'inherit'}}>
                        Confirmar
                      </button>
                      <button onClick={() => setConfirmandoFixaId(null)}
                        style={{border:'none',background:'transparent',cursor:'pointer',
                          fontSize:11,color:'#64748b',fontFamily:'inherit'}}>
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              )})}

              {/* Lançamentos variáveis */}
              {ls.map(l => {
                const catVisual = iconeCategoria(categorias, l.categoria)
                const consolidado = l.consolidado !== false
                const corValor = consolidado ? (l.tipo==='entrada'?COR.azul:COR.vermelho) : '#94a3b8'
                const emEdicao = editandoId === l.id
                return (
                <div key={l.id}
                  onClick={e => { e.stopPropagation(); if(!l.id.startsWith('fatura-')) editarLancamento(dia, l) }}
                  style={{display:'flex',alignItems:'center',gap:10,cursor:l.id.startsWith('fatura-')?'default':'pointer',
                    padding:'10px 16px',borderBottom:`1px solid #f1f5f9`,
                    background:emEdicao?'#eff6ff':'transparent'}}
                  onMouseEnter={e=>{ if(!emEdicao) e.currentTarget.style.background='#fafbff' }}
                  onMouseLeave={e=>{ if(!emEdicao) e.currentTarget.style.background='transparent' }}>
                  {!l.id.startsWith('fatura-') && (
                    <input type="checkbox" checked={consolidado}
                      onClick={e => e.stopPropagation()}
                      onChange={() => toggleConsolidarLancamento(dia, l.id)}
                      title="Consolidar lançamento"
                      style={{cursor:'pointer',width:15,height:15,flexShrink:0}} />
                  )}
                  <div style={{width:32,height:32,borderRadius:8,flexShrink:0,
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,
                    background:catVisual.cor,opacity:consolidado?1:0.5}}>
                    {catVisual.icone}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600,
                      color:consolidado?COR.texto:'#94a3b8',
                      display:'flex',alignItems:'center',gap:5}}>
                      {l.categoria}
                      <BadgePag fp={l.formaPagamento}/>
                      <span style={{fontSize:9,padding:'1px 5px',borderRadius:3,fontWeight:600,
                        background:consolidado?'#e0f2fe':'#f1f5f9',
                        color:consolidado?'#0369a1':'#94a3b8'}}>
                        {consolidado?'consolidado':'não consolidado'}
                      </span>
                    </div>
                    <div style={{fontSize:11,color:'#64748b',marginTop:1}}>
                      {l.descricao}
                    </div>
                  </div>
                  <div style={{fontSize:13,fontWeight:600,color:corValor}}>
                    {l.tipo==='entrada'?'+':'-'}{fmt(l.valor)}
                  </div>
                  {!l.id.startsWith('fatura-') && (
                    <button onClick={e => { e.stopPropagation(); excluir(dia, l.id) }}
                      style={{border:'none',background:'transparent',cursor:'pointer',
                        color:'#cbd5e1',fontSize:14,padding:'2px 5px',borderRadius:4}}
                      onMouseEnter={e=>(e.currentTarget.style.color=COR.vermelho)}
                      onMouseLeave={e=>(e.currentTarget.style.color='#cbd5e1')}>✕</button>
                  )}
                </div>
              )})}

            </div>
          )
        })}

        {/* Saldo final */}
        <div style={{borderRadius:12,padding:'14px 16px',flexShrink:0,
          background:`linear-gradient(135deg,${COR.azulEscuro},${COR.azulMedio})`,
          display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,.8)'}}>
            Saldo final previsto — {NOMES_MESES[mes]} {ano}
          </span>
          <span style={{fontSize:18,fontWeight:700,color:'#fff'}}>
            {fmt(saldosDia[totalDias] ?? saldoMes)}
          </span>
        </div>
      </div>

      {/* PAINEL DE LANÇAMENTO */}
      <div style={{width:340,flexShrink:0,background:COR.branco,
        border:`1px solid ${COR.borda}`,borderRadius:12,padding:20,overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
          <h3 style={{fontSize:14,fontWeight:700,color:COR.texto,margin:0}}>
            {editandoFixaId ? 'Editar fixa' : editandoId ? 'Editar lançamento' : 'Novo lançamento'}
          </h3>
          {(editandoId || editandoFixaId) && (
            <button onClick={() => resetarParaNovo(diaSel)} title="Cancelar edição" style={{
              border:'none',background:'transparent',cursor:'pointer',fontSize:18,color:COR.textoSuave}}>✕</button>
          )}
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

        {!editandoFixaId && (
        <div style={{display:'flex',background:'#e0f2fe',borderRadius:7,
          padding:3,marginBottom:12,width:'fit-content'}}>
          {(['saida','entrada'] as const).map(t => (
            <button key={t} onClick={() => { setFTipo(t); setFPag(t === 'entrada' ? 'credito' : 'debito') }} style={{
              padding:'5px 14px',border:'none',borderRadius:5,
              cursor:'pointer',fontSize:12,fontWeight:500,
              fontFamily:'inherit',transition:'all .15s',
              background:fTipo===t?COR.branco:'transparent',
              color:fTipo===t?(t==='entrada'?COR.azul:COR.vermelho):'#0369a1',
              boxShadow:fTipo===t?'0 1px 2px rgba(0,0,0,.08)':'none'}}>
              {t==='entrada'?'↑ Entrada':'↓ Saída'}
            </button>
          ))}
        </div>
        )}

        <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:10}}>
          <div>
            <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:4}}>Categoria</div>
            {editandoFixaId ? (
              <div style={{border:'1.5px solid #e2e8f0',borderRadius:7,padding:'7px 10px',
                fontSize:12,background:'#f8faff',color:'#64748b',fontFamily:'inherit'}}>
                {fCat}
              </div>
            ) : (
            <select ref={categoriaSelectRef} autoFocus value={fCat}
              onChange={e => {
                const nome = e.target.value
                setFCat(nome)
                const cat = categorias.find(c => c.nome === nome)
                if (cat) setFPag(fTipo === 'entrada'
                  ? formaRecebCategoria(cat.formaPagamento, cat.tipoMovimento)
                  : formaPagCategoria(cat.formaPagamento, cat.tipoMovimento))
              }}
              onFocus={realcarFoco} onBlur={removerRealce}
              style={{border:`1.5px solid #bae6fd`,borderRadius:7,padding:'7px 10px',
                fontSize:12,outline:'none',background:'#fff',
                fontFamily:'inherit',color:COR.texto,width:'100%'}}>
              <option value="">Selecione...</option>
              {categoriasVariaveis.map(c=>(
                <option key={c.id} value={c.nome}>{c.nome}</option>
              ))}
            </select>
            )}
          </div>
          <div>
            <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:4}}>Valor *</div>
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
        </div>

        <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginBottom:4}}>
          <span style={{fontSize:11,color:'#0369a1',fontWeight:500,width:'100%'}}>
            {fTipo === 'entrada' ? 'Forma de recebimento:' : 'Forma de pagamento:'}
          </span>
          {(fTipo === 'entrada' ? FORMAS_ENT : FORMAS_SAI).map(p=>(
            <button key={p.id} onClick={()=>setFPag(p.id)} style={{
              padding:'4px 12px',
              border:`1.5px solid ${fPag===p.id?COR.azul:'#bae6fd'}`,
              borderRadius:6,cursor:'pointer',fontSize:11,fontWeight:500,
              background:fPag===p.id?'#eff6ff':'#fff',
              color:fPag===p.id?COR.azul:'#0369a1',fontFamily:'inherit'}}>
              {p.label}
            </button>
          ))}
        </div>
        <div style={{fontSize:10,color:'#94a3b8',marginBottom:14}}>
          Enter no valor ou na descrição para salvar
        </div>

        <div style={{display:'flex',gap:8}}>
          {editandoId && !editandoId.startsWith('fatura-') && (
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
            {(editandoId || editandoFixaId) ? 'Salvar alterações' : 'Lançar'}
          </button>
        </div>
      </div>
      </div>
      </>
      )}
    </div>
  )
}
