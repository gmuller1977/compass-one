import { useState, useMemo, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import type { DadosMes } from '../context/AppContext'
import { iconeCategoria } from '../utils/categoriaIcone'

const COR = {
  azul: '#1a56db', azulMedio: '#2563eb', fundo: '#f0f4ff',
  branco: '#ffffff', texto: '#0f172a',
  textoSuave: '#64748b', borda: '#e2e8f0',
  verde: '#16a34a', vermelho: '#dc2626',
}
const MESES_CURTOS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const NOMES_MESES  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS_SEM     = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

type LancItem = {
  contaId: string; contaBanco: string; contaNome: string
  contaCor: string; contaIcone: string
  tipo: 'entrada'|'saida'; categoria: string; descricao: string
  valor: number; confirmado: boolean
}

function fmt(v: number) { return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) }

export default function ExtratoConsolidado() {
  const hoje    = new Date()
  const diaHoje = hoje.getDate()
  const mesHoje = hoje.getMonth()
  const anoHoje = hoje.getFullYear()

  const [mes, setMes] = useState(mesHoje)
  const [ano]         = useState(anoHoje)
  const [diasAbertos, setDiasAbertos] = useState<Set<number>>(() => new Set([diaHoje]))

  const { contas, categorias, extratoData, planos } = useApp()

  const contasExtrato = useMemo(
    () => contas.filter(c => c.tipo === 'corrente' || c.tipo === 'poupanca'),
    [contas],
  )

  const totalDias = new Date(ano, mes+1, 0).getDate()
  const mesStr    = String(mes+1).padStart(2,'0')
  const eMesAtual = mes === mesHoje && ano === anoHoje

  useEffect(() => {
    setDiasAbertos(new Set(eMesAtual ? [diaHoje] : []))
  }, [mes, ano])

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

  const { itensPorDia, totalEntradas, totalSaidas, entradasConf, saidasConf } = useMemo(() => {
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
      if (override !== undefined && override > 0) return override
      const planoAno = planos[ano]
      if (planoAno) {
        const lista = tipo === 'entrada' ? planoAno.entradas : planoAno.saidas
        const found = lista.find(c => (catId && c.id === catId) || c.nome === catNome)
        const v = found?.v[mes] ?? 0
        if (v > 0) return v
      }
      return categorias.find(c => c.id === catId)?.valorPadrao ?? 0
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

    const isPastMonth = ano < anoHoje || (ano === anoHoje && mes < mesHoje)
    const primeiroBancoId = contasExtrato[0]?.id ?? ''

    // Conta que confirmou a fixa; se nenhuma, usa o primeiro banco
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

    // ── Lançamentos variáveis ──────────────────────────────────────────
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
            valor: l.valor, confirmado: l.consolidado ?? true,
          })
        }
      }
    }

    // ── Fixas de categoria (todas — confirmadas e não confirmadas) ─────
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

      const valor = valorFixaCat(cat.id, cat.nome, cat.tipo, fixasOvr[cat.id])
      if (valor <= 0) continue

      const confirmado = fixasConf[cat.id] === true
        || (isAuto && (isPastMonth || (eMesAtual && dia < diaHoje)))

      addItem(dia, {
        contaId: ownerContaId, contaBanco: ownerBanco,
        contaNome: ownerNome, contaCor: ownerCor, contaIcone: ownerIcone,
        tipo: cat.tipo as 'entrada'|'saida',
        categoria: cat.nome,
        descricao: fixasDescOvr[cat.id] ?? cat.nome,
        valor, confirmado,
      })
    }

    // ── Fixas de cartão de crédito ────────────────────────────────────
    if (contasExtrato.length > 0) {
      let faturasDados: Record<string, { lancamentos: Record<number, { tipo: string; valor: number }[]> }> = {}
      try { const r = localStorage.getItem('compass_fatura_dados'); if (r) faturasDados = JSON.parse(r) } catch { /**/ }

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
          || (isAuto && (isPastMonth || (eMesAtual && dia < diaHoje)))

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
  }, [fontes, extratoData, totalDias, categorias, contas, planos, ano, mes,
      contasExtrato, eMesAtual, diaHoje, mesHoje, anoHoje, mesStr])

  const saldoBase = useMemo(
    () => contasExtrato.reduce((s, c) => s + (c.saldoInicial ?? 0), 0),
    [contasExtrato],
  )

  // saldosConf: apenas itens confirmados → usado em dias passados/hoje (INICIAL/ATUAL/FINAL)
  // saldosAll:  todos os itens → usado em dias futuros (INICIAL/PREVISTO)
  const { saldosConf, saldosAll } = useMemo(() => {
    const saldosConf: Record<number, number> = {}
    const saldosAll:  Record<number, number> = {}
    let sConf = saldoBase, sAll = saldoBase
    for (let d = 1; d <= totalDias; d++) {
      for (const item of (itensPorDia[d] ?? [])) {
        const delta = item.tipo === 'entrada' ? item.valor : -item.valor
        if (item.confirmado) sConf += delta
        sAll += delta
      }
      saldosConf[d] = sConf
      saldosAll[d]  = sAll
    }
    return { saldosConf, saldosAll }
  }, [saldoBase, itensPorDia, totalDias])

  // Saldo disponível por conta (para exibição no header)
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

  // Saldo dinheiro: soma itens confirmados de contaId==='dinheiro' em itensPorDia
  const saldoDinheiro = useMemo(() => {
    let te = 0, ts = 0
    for (const itens of Object.values(itensPorDia)) {
      for (const item of itens) {
        if (item.contaId === 'dinheiro' && item.confirmado) {
          item.tipo === 'entrada' ? te += item.valor : ts += item.valor
        }
      }
    }
    return te - ts
  }, [itensPorDia])

  const saldoTotal = saldosPorConta.reduce((s, x) => s + x.saldo, 0) + saldoDinheiro
  const saldoDisponivel = saldoBase + entradasConf - saidasConf

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',
      background:COR.fundo,fontFamily:"-apple-system,'Inter',sans-serif"}}>

      {/* ABAS DE MÊS */}
      <div style={{background:COR.branco,borderBottom:`1px solid ${COR.borda}`,
        padding:'10px 16px 0',flexShrink:0,display:'flex',gap:3,overflowX:'auto'}}>
        {MESES_CURTOS.map((m,i) => {
          const isAtual = i===mesHoje && ano===anoHoje
          const ativo   = i===mes
          return (
            <button key={m} onClick={() => setMes(i)} style={{
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
        padding:'10px 16px',flexShrink:0,display:'flex',flexDirection:'column',gap:8}}>

        {/* Linha 1: mês + saldos resumidos */}
        <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
          <span style={{fontSize:14,fontWeight:700,color:COR.texto}}>{NOMES_MESES[mes]} {ano}</span>
          <span style={{color:COR.borda}}>|</span>
          <div style={{display:'flex',alignItems:'center',gap:5}}>
            <span style={{fontSize:13,color:COR.textoSuave,fontWeight:500}}>Disponível:</span>
            <span style={{fontSize:16,fontWeight:800,
              color:saldoDisponivel<0?COR.vermelho:COR.verde}}>{fmt(saldoDisponivel)}</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:5}}>
            <span style={{fontSize:13,color:COR.textoSuave,fontWeight:500}}>Previsto fim do mês:</span>
            <span style={{fontSize:16,fontWeight:800,
              color:(saldosAll[totalDias]??saldoBase)<0?COR.vermelho:'#64748b'}}>
              {fmt(saldosAll[totalDias]??saldoBase)}
            </span>
          </div>
        </div>

        {/* Linha 2: pills por conta */}
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {saldosPorConta.map(({conta,saldo,manual}) => (
            <span key={conta.id} style={{
              fontSize:13,fontWeight:500,
              padding:'4px 10px',borderRadius:6,
              display:'inline-flex',alignItems:'center',gap:5,
              background: conta.cor+'18',
              border:`1px solid ${conta.cor}55`}}>
              <span>{conta.icone}</span>
              <span style={{color:conta.cor,fontWeight:600}}>{conta.banco}</span>
              {manual && <span style={{color:'#94a3b8',fontSize:10}}>✓</span>}
              <span style={{fontWeight:700,
                color:saldo<0?COR.vermelho:COR.texto}}>{fmt(saldo)}</span>
            </span>
          ))}
          <span style={{
            fontSize:13,fontWeight:500,
            padding:'4px 10px',borderRadius:6,
            display:'inline-flex',alignItems:'center',gap:5,
            background:'#16a34a18',border:'1px solid #16a34a55'}}>
            <span>💵</span>
            <span style={{color:'#16a34a',fontWeight:600}}>Dinheiro</span>
            <span style={{fontWeight:700,
              color:saldoDinheiro<0?COR.vermelho:COR.texto}}>{fmt(saldoDinheiro)}</span>
          </span>
        </div>
      </div>

      {/* LISTA DE DIAS */}
      <div style={{flex:1,display:'flex',padding:'10px 16px',overflow:'hidden'}}>
      <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:6}}>

        {Array.from({length:totalDias},(_,i)=>i+1).map(dia => {
          const itens      = itensPorDia[dia] ?? []
          const ehHoje     = eMesAtual && dia===diaHoje
          const passado    = eMesAtual ? dia<diaHoje : ano<anoHoje||(ano===anoHoje&&mes<mesHoje)
          const diaFuturo  = !passado && !ehHoje
          const semana     = DIAS_SEM[new Date(ano,mes,dia).getDay()]
          const temItens   = itens.length > 0
          const aberto     = diasAbertos.has(dia)

          const saldosRef   = diaFuturo ? saldosAll : saldosConf
          const saldoIni    = dia===1 ? saldoBase : (saldosRef[dia-1] ?? saldoBase)
          const entradasDia = diaFuturo
            ? itens.reduce((s,i) => i.tipo==='entrada'?s+i.valor:s, 0)
            : itens.reduce((s,i) => i.tipo==='entrada'&&i.confirmado?s+i.valor:s, 0)
          const saidasDia   = diaFuturo
            ? itens.reduce((s,i) => i.tipo==='saida'?s+i.valor:s, 0)
            : itens.reduce((s,i) => i.tipo==='saida'&&i.confirmado?s+i.valor:s, 0)
          const saldoFinal  = saldosRef[dia] ?? saldoIni
          const corSaldoIni = saldoIni < 0 ? COR.vermelho : COR.verde
          const corSaldoFin = saldoFinal < 0 ? COR.vermelho : COR.verde

          return (
            <div key={dia}
              onClick={() => toggleDia(dia)}
              style={{borderRadius:12,overflow:'hidden',flexShrink:0,cursor:'pointer',
                border:`1.5px solid ${ehHoje?'#93c5fd':COR.borda}`,
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
                    borderRadius:4,background:'#dbeafe',color:COR.azul,
                    letterSpacing:.5,textTransform:'uppercase'}}>Hoje</span>
                )}

                <div style={{flex:1}}/>

                {/* Boxes: INICIAL, ENTRADAS, SAÍDA, FINAL */}
                <div style={{display:'flex',gap:6}}>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',
                    padding:'5px 10px',borderRadius:8,minWidth:150,
                    background:diaFuturo?'#f8faff':saldoIni<0?'#fff1f2':'#f0fdf4',
                    border:`1px solid ${diaFuturo?COR.borda:saldoIni<0?'#fecdd3':'#bbf7d0'}`}}>
                    <span style={{fontSize:10,fontWeight:600,textTransform:'uppercase',
                      letterSpacing:.4,marginBottom:1,
                      color:diaFuturo?'#94a3b8':corSaldoIni}}>Inicial</span>
                    <span style={{fontSize:13,fontWeight:700,
                      color:diaFuturo?'#64748b':corSaldoIni}}>
                      {fmt(saldoIni)}
                    </span>
                  </div>

                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',
                    padding:'5px 10px',borderRadius:8,minWidth:150,
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
                    padding:'5px 10px',borderRadius:8,minWidth:150,
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

                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',
                    padding:'5px 10px',borderRadius:8,minWidth:150,
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
                </div>

                {/* Chevron */}
                <span style={{width:18,flexShrink:0,textAlign:'center',fontSize:14,
                  color:'#94a3b8',opacity:temItens?1:0,userSelect:'none',
                  display:'inline-block',transition:'transform .15s',
                  transform:aberto?'rotate(180deg)':'rotate(0deg)'}}>⌄</span>
              </div>

              {/* Lançamentos */}
              {aberto && itens.map((item, idx) => {
                const catVisual = iconeCategoria(categorias, item.categoria)
                const opacidade = diaFuturo && !item.confirmado ? 0.5 : 1
                return (
                  <div key={idx}
                    style={{display:'flex',alignItems:'center',gap:10,
                      padding:'11px 16px 11px 12px',opacity:opacidade,
                      borderLeft:`4px solid ${item.contaCor}`,
                      borderBottom:idx<itens.length-1?`1px solid #f1f5f9`:'none'}}>
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
      </div>
    </div>
  )
}
