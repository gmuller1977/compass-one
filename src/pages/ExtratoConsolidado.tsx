import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { DadosMes } from '../context/AppContext'
import { iconeCategoria } from '../utils/categoriaIcone'
import { COR } from '../utils/cores'
import PageHeader, { PH_BTN_WHITE } from '../components/PageHeader'

const NOMES_MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS_SEM    = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

type LancItem = {
  contaId: string; contaBanco: string; contaNome: string
  contaCor: string; contaIcone: string
  tipo: 'entrada'|'saida'; categoria: string; descricao: string
  valor: number; confirmado: boolean
}

function fmt(v: number) { return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) }

function useIsMobile() {
  const [m, setM] = useState(() => window.innerWidth < 640)
  useEffect(() => { const fn = () => setM(window.innerWidth < 640); window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn) }, [])
  return m
}

export default function ExtratoConsolidado({ mesProp, onMesProp }: { mesProp?: number; onMesProp?: (m: number) => void } = {}) {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const hoje    = new Date()
  const diaHoje = hoje.getDate()
  const mesHoje = hoje.getMonth()
  const anoHoje = hoje.getFullYear()

  const [mesSelf, setMesSelf] = useState(mesHoje)
  const mes    = mesProp ?? mesSelf
  const setMes = onMesProp ?? setMesSelf
  const [ano, setAno]  = useState(anoHoje)
  const [mostrarCalendario, setMostrarCalendario] = useState(false)
  const [anoCalendario,     setAnoCalendario]     = useState(anoHoje)
  const [calPos,            setCalPos]            = useState({top:0,left:0})
  const calBtnRef = useRef<HTMLButtonElement>(null)
  const [diasAbertos, setDiasAbertos] = useState<Set<number>>(() => {
    const dias = new Set<number>()
    for (let i = 0; i <= 3; i++) { if (diaHoje - i >= 1) dias.add(diaHoje - i) }
    return dias
  })

  const { contas, categorias, extratoData, faturaData, planos, planosReal, saldoInicialDinheiro } = useApp()

  const contasExtrato = useMemo(
    () => contas.filter(c => c.tipo === 'corrente' || c.tipo === 'poupanca'),
    [contas],
  )

  const totalDias = new Date(ano, mes+1, 0).getDate()
  const mesStr    = String(mes+1).padStart(2,'0')
  const eMesAtual = mes === mesHoje && ano === anoHoje

  useEffect(() => {
    if (eMesAtual) {
      const dias = new Set<number>()
      for (let i = 0; i <= 3; i++) { if (diaHoje - i >= 1) dias.add(diaHoje - i) }
      setDiasAbertos(dias)
    } else {
      setDiasAbertos(new Set())
    }
  }, [mes, ano])

  useEffect(() => {
    if (!mostrarCalendario) return
    const fechar = () => setMostrarCalendario(false)
    document.addEventListener('click', fechar)
    return () => document.removeEventListener('click', fechar)
  }, [mostrarCalendario])

  function toggleDia(dia: number) {
    setDiasAbertos(prev => {
      const next = new Set(prev)
      next.has(dia) ? next.delete(dia) : next.add(dia)
      return next
    })
  }

  const fontes = useMemo(() => [
    ...contasExtrato.map(c => ({
      key: `${c.id}-${ano}-${mesStr}`,
      contaId: c.id, contaBanco: c.banco, contaNome: c.nome,
      contaCor: c.cor, contaIcone: c.icone,
    })),
    {
      key: `dinheiro-${ano}-${mesStr}`,
      contaId: 'dinheiro', contaBanco: 'Dinheiro', contaNome: 'Dinheiro',
      contaCor: '#16a34a', contaIcone: '💵',
    },
  ], [contasExtrato, ano, mesStr])

  const { itensPorDia, entradasConf, saidasConf } = useMemo(() => {
    const itensPorDia: Record<number, LancItem[]> = {}
    let te = 0, ts = 0, teConf = 0, tsConf = 0

    function addItem(dia: number, item: LancItem) {
      const d = Math.min(Math.max(dia, 1), totalDias)
      if (!itensPorDia[d]) itensPorDia[d] = []
      itensPorDia[d].push(item)
      if (item.tipo === 'entrada') te += item.valor
      else ts += item.valor
      if (item.confirmado) {
        if (item.tipo === 'entrada') teConf += item.valor
        else tsConf += item.valor
      }
    }

    function valorFixaCat(catId: string, catNome: string, tipo: string, override?: number): number {
      if (override !== undefined) return override
      const planoAno = planosReal[ano] ?? planos[ano]
      if (planoAno) {
        const lista = tipo === 'entrada' ? planoAno.entradas : planoAno.saidas
        const found = lista.find(c => (catId && c.id === catId) || c.nome === catNome)
        const v = found?.v[mes] ?? 0
        if (v > 0) return v
      }
      return 0
    }

    function ehFimDeSemana(d: number) {
      const dow = new Date(ano, mes, d).getDay()
      return dow === 0 || dow === 6
    }
    function diaUtil(d: number) {
      let x = d
      while (x <= totalDias && ehFimDeSemana(x)) x++
      return Math.min(x, totalDias)
    }

    const preferidaBanco = contasExtrato.find(ct => ct.preferida)
    const primeiroBancoId = (preferidaBanco ?? contasExtrato[0])?.id ?? ''

    function ownerDeFixa(fixaId: string): string {
      const confirmado = contasExtrato.find(ct =>
        (extratoData[`${ct.id}-${ano}-${mesStr}`] as DadosMes | undefined)
          ?.fixasConsolidadas?.[fixaId] === true
      )
      return confirmado?.id ?? primeiroBancoId
    }

    function infoOwner(contaId: string) {
      const c = contasExtrato.find(ct => ct.id === contaId)
      if (!c) return null
      return { contaBanco: c.banco, contaNome: c.nome, contaCor: c.cor, contaIcone: c.icone }
    }

    for (const fonte of fontes) {
      const dados = extratoData[fonte.key] as DadosMes | undefined
      if (!dados) continue
      for (let d = 1; d <= totalDias; d++) {
        for (const l of dados.lancamentos?.[d] ?? []) {
          addItem(d, {
            contaId: fonte.contaId, contaBanco: fonte.contaBanco,
            contaNome: fonte.contaNome, contaCor: fonte.contaCor,
            contaIcone: fonte.contaIcone, tipo: l.tipo,
            categoria: l.categoria, descricao: l.descricao,
            valor: l.valor, confirmado: (l as {consolidado?: boolean}).consolidado ?? true,
          })
        }
      }
    }

    for (const cat of categorias) {
      if (!cat.fixa || !cat.ativa) continue
      if (cat.tipoMovimento === 'cartao') continue

      let ownerContaId: string
      let ownerBanco: string; let ownerNome: string
      let ownerCor: string; let ownerIcone: string

      if (cat.tipoMovimento === 'dinheiro') {
        ownerContaId = 'dinheiro'
        ownerBanco = 'Dinheiro'; ownerNome = 'Dinheiro'
        ownerCor = '#16a34a'; ownerIcone = '💵'
      } else {
        const oid = cat.contaDebitoId ?? ownerDeFixa(cat.id)
        if (!oid) continue
        const info = infoOwner(oid)
        if (!info) continue
        ownerContaId = oid
        ownerBanco = info.contaBanco; ownerNome = info.contaNome
        ownerCor = info.contaCor; ownerIcone = info.contaIcone
      }

      const dadosOwner = extratoData[
        ownerContaId === 'dinheiro'
          ? `dinheiro-${ano}-${mesStr}`
          : `${ownerContaId}-${ano}-${mesStr}`
      ] as DadosMes | undefined

      const fixasConf    = dadosOwner?.fixasConsolidadas ?? {}
      const fixasOvr     = dadosOwner?.fixasValorOverride ?? {}
      const fixasMov     = dadosOwner?.fixasMovidas ?? {}
      const fixasDescOvr = dadosOwner?.fixasDescOverride ?? {}

      const isAuto = cat.formaPagamento === 'automatico'
      const diaRaw = fixasMov[cat.id] !== undefined
        ? fixasMov[cat.id]
        : isAuto ? diaUtil(cat.diaVencimento ?? 1) : (cat.diaVencimento ?? 1)
      const dia = Math.min(Math.max(diaRaw, 1), totalDias)

      const confirmado = fixasConf[cat.id] === true

      const override = fixasOvr[cat.id]
      const valor = valorFixaCat(cat.id, cat.nome, cat.tipo, override)
      if (valor <= 0) continue

      addItem(dia, {
        contaId: ownerContaId, contaBanco: ownerBanco,
        contaNome: ownerNome, contaCor: ownerCor, contaIcone: ownerIcone,
        tipo: cat.tipo as 'entrada'|'saida',
        categoria: cat.nome,
        descricao: fixasDescOvr[cat.id] ?? cat.nome,
        valor, confirmado,
      })
    }

    if (contasExtrato.length > 0) {
      const faturasDados = faturaData as Record<string, { lancamentos: Record<number, { tipo: string; valor: number }[]> }>

      for (const card of contas.filter(c => c.tipo === 'cartao' && c.diaVencimento)) {
        const isAuto = card.formaPagamentoFatura === 'automatico'
          || (!card.formaPagamentoFatura && !!card.contaPagamentoId)

        const fixaId = `cartao-${card.id}`
        const oid = isAuto && card.contaPagamentoId
          ? card.contaPagamentoId
          : ownerDeFixa(fixaId)
        if (!oid) continue
        const info = infoOwner(oid)
        if (!info) continue

        const dadosOwner = extratoData[`${oid}-${ano}-${mesStr}`] as DadosMes | undefined
        const fixasConf = dadosOwner?.fixasConsolidadas ?? {}
        const fixasOvr  = dadosOwner?.fixasValorOverride ?? {}
        const fixasMov  = dadosOwner?.fixasMovidas ?? {}

        const diaRaw = fixasMov[fixaId] !== undefined
          ? fixasMov[fixaId]
          : isAuto ? diaUtil(card.diaVencimento!) : card.diaVencimento!
        const dia = Math.min(Math.max(diaRaw, 1), totalDias)

        let total = fixasOvr[fixaId] !== undefined && fixasOvr[fixaId] > 0 ? fixasOvr[fixaId] : 0
        if (total === 0) {
          const dm = faturasDados[`${card.id}-${ano}-${mesStr}`]
          if (dm) {
            for (let d = 1; d <= totalDias; d++) {
              ;(dm.lancamentos[d] ?? []).forEach((l: {tipo:string;valor:number}) => {
                l.tipo === 'saida' ? total += l.valor : total -= l.valor
              })
            }
          }
        }
        if (total <= 0) continue

        const confirmado = fixasConf[fixaId] === true

        addItem(dia, {
          contaId: oid, contaBanco: info.contaBanco,
          contaNome: info.contaNome, contaCor: info.contaCor, contaIcone: info.contaIcone,
          tipo: 'saida',
          categoria: 'Cartão de Crédito', descricao: card.nome,
          valor: total, confirmado,
        })
      }
    }

    return { itensPorDia, totalEntradas: te, totalSaidas: ts, entradasConf: teConf, saidasConf: tsConf }
  }, [fontes, extratoData, faturaData, totalDias, categorias, contas, planos, planosReal, ano, mes,
      contasExtrato, eMesAtual, diaHoje, mesHoje, anoHoje, mesStr])

  const saldoBase = useMemo(() => {
    const base = contasExtrato.reduce((s, c) => s + (c.saldoInicial ?? 0), 0) + saldoInicialDinheiro
    const todasContas = [...contasExtrato.map(c => c.id), 'dinheiro']
    let acc = base

    const porMes: Record<string, DadosMes[]> = {}
    for (const [key, dados] of Object.entries(extratoData)) {
      if (!todasContas.some(id => key.startsWith(id + '-'))) continue
      const sufixo = key.slice(-7)
      const keyAno = parseInt(sufixo.slice(0, 4))
      const keyMes = parseInt(sufixo.slice(5, 7)) - 1
      if (isNaN(keyAno) || isNaN(keyMes)) continue
      if (keyAno > ano || (keyAno === ano && keyMes >= mes)) continue
      if (!porMes[sufixo]) porMes[sufixo] = []
      porMes[sufixo].push(dados)
    }

    for (const [sufixo, entradas] of Object.entries(porMes)) {
      const ky = parseInt(sufixo.slice(0, 4))
      const km = parseInt(sufixo.slice(5, 7)) - 1
      const planoAno = planosReal[ky] ?? planos[ky]

      for (const dados of entradas) {
        for (const itens of Object.values(dados.lancamentos ?? {})) {
          for (const item of itens) {
            acc += item.tipo === 'entrada' ? item.valor : -item.valor
          }
        }
      }

      const catJaContado = new Set<string>()
      for (const dados of entradas) {
        for (const [catId, confirmed] of Object.entries(dados.fixasConsolidadas ?? {})) {
          if (!confirmed || catJaContado.has(catId)) continue
          catJaContado.add(catId)
          const fixasOvr = dados.fixasValorOverride ?? {}

          if (catId.startsWith('cartao-')) {
            const cardId = catId.slice(7)
            const override = fixasOvr[catId]
            if (override !== undefined && override > 0) {
              acc -= override
            } else {
              const dm = (faturaData as Record<string, { lancamentos?: Record<number, { tipo: string; valor: number }[]> }>)[`${cardId}-${sufixo}`]
              if (dm?.lancamentos) {
                const totalDiasM = new Date(ky, km + 1, 0).getDate()
                let total = 0
                for (let d = 1; d <= totalDiasM; d++) {
                  ;(dm.lancamentos[d] ?? []).forEach((l: { tipo: string; valor: number }) => {
                    l.tipo === 'saida' ? total += l.valor : total -= l.valor
                  })
                }
                if (total > 0) acc -= total
              }
            }
          } else {
            const cat = categorias.find(c => c.id === catId)
            if (!cat) continue
            const override = fixasOvr[catId]
            let valor = 0
            if (override !== undefined) {
              valor = override
            } else if (planoAno) {
              const lista = cat.tipo === 'entrada' ? planoAno.entradas : planoAno.saidas
              const found = lista.find(c => c.id === catId || c.nome === cat.nome)
              valor = found?.v[km] ?? 0
            }
            if (valor <= 0) continue
            acc += cat.tipo === 'entrada' ? valor : -valor
          }
        }
      }
    }

    return acc
  }, [contasExtrato, extratoData, faturaData, planos, planosReal, categorias, ano, mes, saldoInicialDinheiro])

  const { saldosConf, saldosAll } = useMemo(() => {
    const saldosConf: Record<number, number> = {}
    const saldosAll:  Record<number, number> = {}
    let sConf = saldoBase, sAll = saldoBase
    const limitePassado = eMesAtual ? diaHoje
      : (ano < anoHoje || (ano === anoHoje && mes < mesHoje)) ? totalDias : 0
    for (let d = 1; d <= totalDias; d++) {
      for (const item of (itensPorDia[d] ?? [])) {
        const delta = item.tipo === 'entrada' ? item.valor : -item.valor
        if (item.confirmado) sConf += delta
        if (d <= limitePassado ? item.confirmado : true) sAll += delta
      }
      saldosConf[d] = sConf
      saldosAll[d]  = sAll
    }
    return { saldosConf, saldosAll }
  }, [saldoBase, itensPorDia, totalDias, eMesAtual, diaHoje, ano, anoHoje, mes, mesHoje])

  const saldosPorConta = useMemo(() => contasExtrato.map(c => {
    const key   = `${c.id}-${ano}-${mesStr}`
    const dados = extratoData[key] as {
      saldoBanco?: string
      lancamentos?: Record<number, {tipo:string;valor:number}[]>
    } | undefined
    const manual = parseFloat((dados?.saldoBanco ?? '').replace(/[R$\s.]/g,'').replace(',','.')) || 0
    if (manual > 0) return { conta: c, saldo: manual, manual: true }
    let te = 0, ts = 0
    if (dados) {
      for (let d = 1; d <= totalDias; d++) {
        ;(dados.lancamentos?.[d] ?? []).forEach((l: {tipo:string;valor:number}) => {
          l.tipo==='entrada' ? te+=l.valor : ts+=l.valor
        })
      }
    }
    return { conta: c, saldo: c.saldoInicial + te - ts, manual: false }
  }), [contasExtrato, extratoData, ano, mesStr, totalDias])

  const saldoDinheiro = useMemo(() => {
    let te = 0, ts = 0
    for (const itens of Object.values(itensPorDia)) {
      for (const item of itens) {
        if (item.contaId === 'dinheiro' && item.confirmado) {
          item.tipo === 'entrada' ? te += item.valor : ts += item.valor
        }
      }
    }
    return saldoInicialDinheiro + te - ts
  }, [itensPorDia, saldoInicialDinheiro])

  const cartoesInfo = useMemo(() => {
    return contas.filter(c => c.tipo === 'cartao').map(card => {
      const billingOff = (card.diaVencimento ?? 1) < (card.diaFechamento ?? 1) ? 1 : 0
      let pMes = mes - billingOff, pAno = ano
      if (pMes < 0) { pMes += 12; pAno-- }
      const pMesStr = String(pMes + 1).padStart(2, '0')
      const key = `${card.id}-${pAno}-${pMesStr}`
      const dm = (faturaData as Record<string, { lancamentos?: Record<number, {tipo:string;valor:number}[]> }>)[key]
      let gasto = 0
      if (dm?.lancamentos) {
        const pTotalDias = new Date(pAno, pMes + 1, 0).getDate()
        for (let d = 1; d <= pTotalDias; d++) {
          for (const l of dm.lancamentos[d] ?? []) {
            l.tipo === 'saida' ? gasto += l.valor : gasto -= l.valor
          }
        }
      }
      return { card, gasto: Math.max(0, gasto) }
    })
  }, [contas, faturaData, mes, ano])

  const saldoDisponivel = saldoBase + entradasConf - saidasConf

  // ── Render ────────────────────────────────────────────────────────────

  const cardStyle = (cor: string, clickable = false): React.CSSProperties => ({
    background: COR.branco,
    borderRadius: 10,
    borderLeft: `4px solid ${cor}`,
    border: `1px solid ${COR.borda}`,
    borderLeftWidth: 4,
    borderLeftColor: cor,
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    cursor: clickable ? 'pointer' : 'default',
    transition: 'box-shadow .15s',
    flexShrink: 0,
  })

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',
      background:COR.fundo,fontFamily:"-apple-system,'Inter',sans-serif"}}>

      {/* PageHeader */}
      {!isMobile && (
        <div style={{padding:'12px 16px 0', flexShrink:0}}>
          <PageHeader
            icon="ti-list-details"
            breadcrumb="LANÇAMENTOS"
            title="Resumo mensal"
            mb={12}
            rightContent={<>
              <button
                onClick={() => { let m=mes-1,a=ano; if(m<0){m=11;a--} setMes(m);setAno(a) }}
                style={PH_BTN_WHITE}>‹</button>
              <button ref={calBtnRef} onClick={(e) => {
                  e.stopPropagation()
                  const rect = calBtnRef.current?.getBoundingClientRect()
                  if (rect) setCalPos({top: rect.bottom + 8, left: rect.left})
                  setAnoCalendario(ano)
                  setMostrarCalendario(v=>!v)
                }}
                style={{border:'none',background:'rgba(255,255,255,.15)',color:'rgba(255,255,255,.9)',
                  fontWeight:600,fontSize:13,cursor:'pointer',fontFamily:'inherit',
                  padding:'4px 14px',borderRadius:6,whiteSpace:'nowrap'}}>
                {NOMES_MESES[mes]} {ano}
              </button>
              <button
                onClick={() => { let m=mes+1,a=ano; if(m>11){m=0;a++} setMes(m);setAno(a) }}
                style={PH_BTN_WHITE}>›</button>
            </>}
          />
        </div>
      )}

      {/* Calendar popup */}
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

      {/* ── Seção A: Patrimônio ──────────────────────────────────────────── */}
      <div style={{flexShrink:0,background:COR.branco,borderBottom:`1px solid ${COR.borda}`}}>

        {/* Mobile: mês */}
        {isMobile && (
          <div style={{padding:'10px 16px 0',display:'flex',alignItems:'center',gap:10}}>
            <button onClick={() => { let m=mes-1,a=ano; if(m<0){m=11;a--} setMes(m);setAno(a) }}
              style={{border:'none',background:'#f1f5f9',color:COR.texto,borderRadius:6,
                padding:'4px 10px',fontSize:16,cursor:'pointer',fontFamily:'inherit'}}>‹</button>
            <span style={{fontWeight:700,fontSize:14,color:COR.texto,flex:1,textAlign:'center'}}>
              {NOMES_MESES[mes]} {ano}
            </span>
            <button onClick={() => { let m=mes+1,a=ano; if(m>11){m=0;a++} setMes(m);setAno(a) }}
              style={{border:'none',background:'#f1f5f9',color:COR.texto,borderRadius:6,
                padding:'4px 10px',fontSize:16,cursor:'pointer',fontFamily:'inherit'}}>›</button>
          </div>
        )}

        {/* Summary cards */}
        <div style={{padding:'10px 16px 0',display:'flex',gap:8,flexWrap:'wrap'}}>
          {[
            { label:'Saldo inicial',  valor:saldoBase,       cor:'#2563eb', bg:'#eff6ff', bord:'#bfdbfe' },
            { label:'Entradas',       valor:entradasConf,    cor:COR.verde,  bg:'#f0fdf4', bord:'#bbf7d0' },
            { label:'Saídas',         valor:saidasConf,      cor:COR.vermelho,bg:'#fff1f2',bord:'#fecdd3' },
            { label:'Disponível',     valor:saldoDisponivel, cor:saldoDisponivel<0?COR.vermelho:'#0f172a', bg:saldoDisponivel<0?'#fff1f2':'#f8faff', bord:saldoDisponivel<0?'#fecdd3':COR.borda },
          ].map(({label,valor,cor,bg,bord}) => (
            <div key={label} style={{flex:1,minWidth:110,padding:'8px 12px',borderRadius:8,
              background:bg,border:`1px solid ${bord}`}}>
              <div style={{fontSize:10,fontWeight:600,color:cor,textTransform:'uppercase',letterSpacing:.5,marginBottom:2}}>
                {label}
              </div>
              <div style={{fontSize:14,fontWeight:700,color:cor,fontVariantNumeric:'tabular-nums'}}>
                {fmt(valor)}
              </div>
            </div>
          ))}
        </div>

        {/* Two columns: Contas Bancárias | Cartões de Crédito */}
        <div style={{padding:'10px 16px 12px',display:'grid',
          gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:12}}>

          {/* Contas Bancárias */}
          <div>
            <div style={{fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',
              letterSpacing:.6,marginBottom:8}}>Contas Bancárias</div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {/* Dinheiro em carteira */}
              <div
                onClick={() => navigate('/novo-lancamento?tipo=dinheiro')}
                style={cardStyle('#16a34a', true)}
                onMouseEnter={e=>(e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.1)')}
                onMouseLeave={e=>(e.currentTarget.style.boxShadow='none')}
              >
                <span style={{fontSize:18,flexShrink:0}}>💵</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,color:COR.texto,
                    overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>Dinheiro</div>
                  <div style={{fontSize:10,color:'#94a3b8',fontWeight:500}}>Em carteira</div>
                </div>
                <span style={{fontSize:13,fontWeight:700,color:saldoDinheiro<0?COR.vermelho:COR.texto,
                  fontVariantNumeric:'tabular-nums',flexShrink:0}}>{fmt(saldoDinheiro)}</span>
              </div>

              {/* Contas bancárias */}
              {saldosPorConta.map(({conta,saldo,manual}) => (
                <div
                  key={conta.id}
                  onClick={() => navigate(`/novo-lancamento?tipo=extrato&conta=${conta.id}`)}
                  style={cardStyle(conta.cor, true)}
                  onMouseEnter={e=>(e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.1)')}
                  onMouseLeave={e=>(e.currentTarget.style.boxShadow='none')}
                >
                  <span style={{fontSize:18,flexShrink:0}}>{conta.icone}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600,color:COR.texto,
                      overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {conta.apelido ?? conta.banco}
                    </div>
                    <div style={{fontSize:10,color:'#94a3b8',fontWeight:500}}>
                      {conta.nome}{manual?' · manual':''}
                    </div>
                  </div>
                  <span style={{fontSize:13,fontWeight:700,color:saldo<0?COR.vermelho:COR.texto,
                    fontVariantNumeric:'tabular-nums',flexShrink:0}}>{fmt(saldo)}</span>
                </div>
              ))}

              {contasExtrato.length === 0 && (
                <div style={{fontSize:12,color:'#94a3b8',padding:'8px 0',textAlign:'center'}}>
                  Nenhuma conta cadastrada
                </div>
              )}
            </div>
          </div>

          {/* Cartões de Crédito */}
          <div>
            <div style={{fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',
              letterSpacing:.6,marginBottom:8}}>Cartões de Crédito</div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {cartoesInfo.length === 0 ? (
                <div style={{fontSize:12,color:'#94a3b8',padding:'8px 0',textAlign:'center'}}>
                  Nenhum cartão cadastrado
                </div>
              ) : cartoesInfo.map(({card, gasto}) => {
                const limite = card.limiteCartao ?? 0
                const pct    = limite > 0 ? Math.min(gasto / limite, 1) : 0
                const corBar = pct > .9 ? COR.vermelho : pct > .7 ? '#f59e0b' : COR.verde
                const cor    = card.cor || '#6366f1'
                return (
                  <div
                    key={card.id}
                    onClick={() => navigate(`/novo-lancamento?tipo=cartao&conta=${card.id}`)}
                    style={cardStyle(cor, true)}
                    onMouseEnter={e=>(e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.1)')}
                    onMouseLeave={e=>(e.currentTarget.style.boxShadow='none')}
                  >
                    <span style={{fontSize:18,flexShrink:0}}>{card.icone || '💳'}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,color:COR.texto,
                        overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {card.apelido ?? card.nome}
                      </div>
                      {limite > 0 ? (
                        <>
                          <div style={{display:'flex',justifyContent:'space-between',
                            fontSize:10,color:'#94a3b8',fontWeight:500,marginTop:2,marginBottom:4}}>
                            <span>{fmt(gasto)} gastos</span>
                            <span>limite {fmt(limite)}</span>
                          </div>
                          <div style={{height:5,borderRadius:3,background:'#e2e8f0',overflow:'hidden'}}>
                            <div style={{height:'100%',borderRadius:3,
                              background:corBar,width:`${pct*100}%`,
                              transition:'width .3s'}} />
                          </div>
                        </>
                      ) : (
                        <div style={{fontSize:10,color:'#94a3b8',fontWeight:500,marginTop:2}}>
                          {fmt(gasto)} gastos · sem limite cadastrado
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Separator: Movimentações do mês ─────────────────────────────── */}
      <div style={{padding:'8px 16px 4px',flexShrink:0,display:'flex',alignItems:'center',gap:10}}>
        <div style={{flex:1,height:1,background:COR.borda}} />
        <span style={{fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:.7,whiteSpace:'nowrap'}}>
          Movimentações do mês
        </span>
        <div style={{flex:1,height:1,background:COR.borda}} />
      </div>

      {/* ── Seção B: Extrato dia a dia ───────────────────────────────────── */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:6,padding:'4px 16px'}}>

        {Array.from({length:totalDias},(_,i)=>i+1).map(dia => {
          const itens      = itensPorDia[dia] ?? []
          const ehHoje     = eMesAtual && dia===diaHoje
          const passado    = eMesAtual ? dia<diaHoje : ano<anoHoje||(ano===anoHoje&&mes<mesHoje)
          const diaFuturo  = !passado && !ehHoje
          const semana     = DIAS_SEM[new Date(ano,mes,dia).getDay()]
          const itensVisiveis = diaFuturo ? itens : itens.filter(i => i.confirmado)
          const temItens   = itensVisiveis.length > 0
          const aberto     = diasAbertos.has(dia)

          const saldosRef  = diaFuturo ? saldosAll : saldosConf
          const prevFuturo = eMesAtual && dia > 1 && (dia - 1) > diaHoje
          const saldoIni   = dia===1 ? saldoBase : ((prevFuturo ? saldosAll : saldosConf)[dia-1] ?? saldoBase)
          const entradasDia = diaFuturo
            ? itens.reduce((s,i) => i.tipo==='entrada'?s+i.valor:s, 0)
            : itens.reduce((s,i) => i.tipo==='entrada'&&i.confirmado?s+i.valor:s, 0)
          const saidasDia   = diaFuturo
            ? itens.reduce((s,i) => i.tipo==='saida'?s+i.valor:s, 0)
            : itens.reduce((s,i) => i.tipo==='saida'&&i.confirmado?s+i.valor:s, 0)
          const saldoFinal  = saldosRef[dia] ?? saldoIni
          const corSaldoFin = saldoFinal < 0 ? COR.vermelho : COR.verde

          return (
            <div key={dia}
              onClick={() => toggleDia(dia)}
              style={{borderRadius:12,overflow:'hidden',flexShrink:0,cursor:'pointer',
                borderTop:`1.5px solid ${ehHoje?'#93c5fd':COR.borda}`,
                borderRight:`1.5px solid ${ehHoje?'#93c5fd':COR.borda}`,
                borderBottom:`1.5px solid ${ehHoje?'#93c5fd':COR.borda}`,
                borderLeft: aberto ? `4px solid ${ehHoje ? COR.azul : '#64748b'}` : `1.5px solid ${ehHoje?'#93c5fd':COR.borda}`,
                background:COR.branco,
                boxShadow:ehHoje?'0 0 0 2px rgba(147,197,253,0.3)':'none'}}>

              {/* Cabeçalho do dia */}
              <div style={{display:'flex',alignItems:'center',gap:12,
                padding:'10px 16px',minHeight:54,
                background:ehHoje?'#f0f7ff':'#fafbff',
                borderBottom:aberto&&temItens?`1px solid ${COR.borda}`:'none'}}>

                <div style={{display:'flex',flexDirection:'column',
                  alignItems:'center',minWidth:32,flexShrink:0}}>
                  <span style={{fontSize:18,fontWeight:700,lineHeight:1,
                    color:ehHoje?COR.azul:COR.texto}}>{String(dia).padStart(2,'0')}</span>
                  <span style={{fontSize:10,color:'#94a3b8',fontWeight:500,marginTop:1,
                    textTransform:'uppercase'}}>{semana}</span>
                </div>

                {ehHoje && (
                  <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',
                    borderRadius:6,background:'#dbeafe',color:COR.azul,
                    letterSpacing:.5,textTransform:'uppercase'}}>Hoje</span>
                )}

                <div style={{flex:1}}/>

                <div style={{display:'flex',gap:6}}>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',
                    padding:'5px 10px',borderRadius:8,flex:isMobile?1:undefined,minWidth:isMobile?0:130,
                    background:diaFuturo?'#f8faff':entradasDia>0?'#eff6ff':'#f8faff',
                    border:`1px solid ${diaFuturo?COR.borda:entradasDia>0?'#bfdbfe':COR.borda}`}}>
                    <span style={{fontSize:10,fontWeight:600,textTransform:'uppercase',
                      letterSpacing:.4,marginBottom:1,
                      color:diaFuturo?'#94a3b8':entradasDia>0?COR.azul:'#94a3b8'}}>Entradas</span>
                    <span style={{fontSize:13,fontWeight:700,
                      color:diaFuturo?'#64748b':entradasDia>0?COR.azul:'#94a3b8'}}>
                      {entradasDia===0?'—':`+${fmt(entradasDia)}`}
                    </span>
                  </div>

                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',
                    padding:'5px 10px',borderRadius:8,flex:isMobile?1:undefined,minWidth:isMobile?0:130,
                    background:diaFuturo?'#f8faff':saidasDia>0?'#fff1f2':'#f8faff',
                    border:`1px solid ${diaFuturo?COR.borda:saidasDia>0?'#fecdd3':COR.borda}`}}>
                    <span style={{fontSize:10,fontWeight:600,textTransform:'uppercase',
                      letterSpacing:.4,marginBottom:1,
                      color:diaFuturo?'#94a3b8':saidasDia>0?COR.vermelho:'#94a3b8'}}>Saída</span>
                    <span style={{fontSize:13,fontWeight:700,
                      color:diaFuturo?'#64748b':saidasDia>0?COR.vermelho:'#94a3b8'}}>
                      {saidasDia===0?'—':`-${fmt(saidasDia)}`}
                    </span>
                  </div>

                  {!isMobile && (
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',
                    padding:'5px 10px',borderRadius:8,minWidth:130,
                    background:diaFuturo?'#f8faff':saldoFinal<0?'#fff1f2':'#f0fdf4',
                    border:`1px solid ${diaFuturo?COR.borda:saldoFinal<0?'#fecdd3':'#bbf7d0'}`}}>
                    <span style={{fontSize:10,fontWeight:600,textTransform:'uppercase',
                      letterSpacing:.4,marginBottom:1,
                      color:diaFuturo?'#94a3b8':corSaldoFin}}>
                      {diaFuturo?'Previsto':passado?'Final':'Atual'}
                    </span>
                    <span style={{fontSize:13,fontWeight:700,
                      color:diaFuturo?'#64748b':corSaldoFin}}>{fmt(saldoFinal)}</span>
                  </div>
                  )}
                </div>

                <span style={{width:18,flexShrink:0,textAlign:'center',fontSize:14,
                  color:'#94a3b8',opacity:temItens?1:0,userSelect:'none',
                  display:'inline-block',transition:'transform .15s',
                  transform:aberto?'rotate(180deg)':'rotate(0deg)'}}>⌄</span>
              </div>

              {/* Lançamentos */}
              {aberto && itensVisiveis.map((item, idx) => {
                const catVisual  = iconeCategoria(categorias, item.categoria)
                const opacidade  = diaFuturo && !item.confirmado ? 0.5 : 1
                return (
                  <div key={idx}
                    style={{display:'flex',alignItems:'center',gap:10,
                      padding:'11px 16px 11px 12px',opacity:opacidade,
                      borderLeft:`4px solid ${item.contaCor}`,
                      borderBottom:idx<itensVisiveis.length-1?`1px solid #f1f5f9`:'none'}}>
                    <div style={{width:34,height:34,borderRadius:8,flexShrink:0,
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:16,background:catVisual.cor}}>
                      {catVisual.icone}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:5,minWidth:0}}>
                        <span style={{fontSize:13,fontWeight:600,color:COR.texto,
                          overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {item.categoria}
                        </span>
                        {/* Source badge */}
                        <span style={{flexShrink:0,fontSize:9,fontWeight:700,
                          padding:'1px 5px',borderRadius:3,whiteSpace:'nowrap',
                          background:item.contaCor+'22',color:item.contaCor}}>
                          {item.contaIcone} {item.contaBanco}
                        </span>
                      </div>
                      {item.descricao && item.descricao !== item.categoria && (
                        <div style={{fontSize:11,color:'#94a3b8',marginTop:1,
                          overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {item.descricao}
                        </div>
                      )}
                    </div>
                    <span style={{fontSize:14,fontWeight:700,flexShrink:0,
                      color:item.tipo==='entrada'?COR.azul:COR.vermelho}}>
                      {item.tipo==='entrada'?'+':'-'}{fmt(item.valor)}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Saldo final previsto */}
      <div style={{padding:'4px 16px 10px',flexShrink:0}}>
        <div style={{borderRadius:12,padding:'12px 16px',
          background:(saldosAll[totalDias]??saldoBase)<0?'linear-gradient(135deg,#7f1d1d,#dc2626)':'linear-gradient(135deg,#0f2878,#2563eb)',
          display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,.8)'}}>
            Saldo final previsto — {NOMES_MESES[mes]} {ano}
          </span>
          <span style={{fontSize:18,fontWeight:700,color:'#fff',fontVariantNumeric:'tabular-nums'}}>
            {fmt(saldosAll[totalDias]??saldoBase)}
          </span>
        </div>
      </div>
      </div>
    </div>
  )
}
