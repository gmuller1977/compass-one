import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useToast } from '../components/Toast'
import { ehAutomaticoCategoria, ehCartaoCategoria } from '../utils/categoriaIcone'
import FaturaCartao from './FaturaCartao'
import BottomNav from '../components/BottomNav'
import TutorialCard from '../components/TutorialCard'
import {
  COR, NOMES_MESES,
  diaEfetivoFixa, fmt, parseBRL, diasNoMes, mesKey,
  formaPagCategoria, useIsMobile,
  type TipoLanc, type FormaPag, type CatFixa, type Lancamento, type DadosMes,
} from '../components/novoLancamentoExtrato/NleShared'
import NleHeader          from '../components/novoLancamentoExtrato/NleHeader'
import NleMobileWizard   from '../components/novoLancamentoExtrato/NleMobileWizard'
import NleMobileSubheader from '../components/novoLancamentoExtrato/NleMobileSubheader'
import NleConsolidado    from '../components/novoLancamentoExtrato/NleConsolidado'
import NleBanner          from '../components/novoLancamentoExtrato/NleBanner'
import NleExtrato         from '../components/novoLancamentoExtrato/NleExtrato'
import NleDesktopPanel   from '../components/novoLancamentoExtrato/NleDesktopPanel'
import NleModal           from '../components/novoLancamentoExtrato/NleModal'

export default function NovoLancamentoExtrato() {
  const { toast } = useToast()
  const navigate  = useNavigate()
  const location  = useLocation()
  const hoje      = new Date()
  const diaHoje   = hoje.getDate()
  const mesHoje   = hoje.getMonth()
  const anoHoje   = hoje.getFullYear()
  const hojeStr   = hoje.toISOString().slice(0,10)

  const [contaId, setContaId] = useState('consolidado')
  const [cartaoNavId,   setCartaoNavId]   = useState<string|undefined>(undefined)
  const [_cartaoAtualId, setCartaoAtualId] = useState<string|undefined>(undefined)
  const [mes,     setMes]     = useState(mesHoje)
  const [ano, setAno]          = useState(anoHoje)
  const [mostrarCalendario, setMostrarCalendario] = useState(false)
  const [anoCalendario,     setAnoCalendario]     = useState(anoHoje)
  const [calPos,            setCalPos]            = useState({top:0,left:0})
  const calBtnRef = useRef<HTMLButtonElement>(null)
  const [diaSel,  setDiaSel]  = useState<number>(diaHoje)
  const [editandoId, setEditandoId] = useState<string|null>(null)
  const [editandoDiaOriginal, setEditandoDiaOriginal] = useState<number|null>(null)
  const [editandoFixaId, setEditandoFixaId] = useState<string|null>(null)
  const [highlightDia, setHighlightDia] = useState<number|null>(null)
  const [fTipo,    setFTipo]    = useState<TipoLanc>('saida')
  const [fCat,     setFCat]     = useState('')
  const [fSubDesc, setFSubDesc] = useState('')
  const [fDesc,    setFDesc]    = useState('')
  const [fValor,   setFValor]   = useState('')
  const [fPag,    setFPag]    = useState<FormaPag>('debito')
  const [tabPrincipal, setTabPrincipal] = useState<'extrato'|'cartao'|'dinheiro'|'consolidado'>('extrato')
  const [fContaDestino,     setFContaDestino]      = useState('')
  const [fBancoConsolidado, setFBancoConsolidado]  = useState('')
  const [diasAbertos, setDiasAbertos] = useState<Set<number>>(() => new Set([diaHoje]))
  const [modalSaldo, setModalSaldo]   = useState<{contaId:string;banco:string;icone:string;cor:string;key:string}|null>(null)
  const [modalSaldoValor, setModalSaldoValor] = useState('')
  const [alertaDesvio, setAlertaDesvio] = useState<{catNome:string; totalGasto:number; previsto:number; valorAtual:number; descricao:string}|null>(null)
  const [saldoBancoInline, setSaldoBancoInline] = useState('')
  const isMobile = useIsMobile()
  const [mobileView, setMobileView] = useState<'extrato'|'form'>('extrato')
  const [mobileStep, setMobileStep] = useState<'tipo'|'conta'|'extrato'>('extrato')
  const [mobileDiaForm, setMobileDiaForm] = useState<number|null>(null)
  const [mobileCartaoId, setMobileCartaoId] = useState<string|null>(null)

  const hojeRef = useRef<HTMLDivElement>(null)
  const categoriaSelectRef = useRef<HTMLSelectElement>(null)
  const valorInputRef = useRef<HTMLInputElement>(null)
  const { contas, categorias, extratoData, updateExtratoMes, planos, planosReal, planejamentoLockado, updatePlanoReal, faturaData, setFaturaData, user, sairDaConta, percentualAlerta } = useApp()

  // Valor planejado (previsto) para uma categoria no mês/ano atual
  function valorPrevistoCat(catId: string, catNome: string, tipoLanc: TipoLanc): number {
    const planoReal = planosReal[ano] as typeof planos[number] | undefined
    const previsto  = planos[ano]    as typeof planos[number] | undefined
    const buscar = (lista: { id?: string; nome: string; v: number[] }[] | undefined) => {
      if (!lista) return undefined
      return catId
        ? (lista.find(c => c.id === catId) ?? lista.find(c => c.nome === catNome))
        : lista.find(c => c.nome === catNome)
    }
    if (planejamentoLockado) {
      const lista = tipoLanc === 'entrada' ? planoReal?.entradas : planoReal?.saidas
      return buscar(lista)?.v[mes] ?? 0
    }
    if (planoReal) {
      const lista = tipoLanc === 'entrada' ? planoReal.entradas : planoReal.saidas
      const found = buscar(lista)
      if (found) return found.v[mes] ?? 0
    }
    const lista = tipoLanc === 'entrada' ? previsto?.entradas : previsto?.saidas
    return buscar(lista)?.v[mes] ?? 0
  }

  function valorPrevistoPorNome(catNome: string, tipoLanc: TipoLanc): number {
    const cat = categorias.find(c => c.nome === catNome)
    return valorPrevistoCat(cat?.id ?? '', catNome, tipoLanc)
  }

  const contasExtrato = contas
    .filter(c => c.tipo === 'corrente' || c.tipo === 'poupanca')
    .sort((a, b) => (b.preferida ? 1 : 0) - (a.preferida ? 1 : 0))
  const isDinheiro = tabPrincipal === 'dinheiro'

  const contaIdEfetivo = isDinheiro ? 'dinheiro' : (contasExtrato.find(c => c.id === contaId)?.id ?? contasExtrato[0]?.id ?? '')
  const dados = extratoData as Record<string, DadosMes>
  const fixasCategoria = categorias
    .filter(c => {
      if (!c.fixa || !c.ativa) return false
      if (isDinheiro) return c.tipoMovimento === 'dinheiro'
      if (c.tipoMovimento === 'cartao') return false
      if (c.tipoMovimento === 'dinheiro') return false
      if (c.contaDebitoId && c.contaDebitoId !== contaIdEfetivo) return false
      if (!c.contaDebitoId) {
        const jaPaga = contasExtrato
          .filter(ct => ct.id !== contaIdEfetivo)
          .some(ct => dados[mesKey(ct.id, ano, mes)]?.fixasConsolidadas?.[c.id] === true)
        if (jaPaga) return false
      }
      return true
    })
    .map(c => ({
      id: c.id, nome: c.nome, categoria: c.nome,
      subtitulo: c.grupo,
      descricao: c.descricao,
      valor: valorPrevistoCat(c.id, c.nome, c.tipo as TipoLanc),
      tipo: c.tipo as TipoLanc,
      formaPagamento: formaPagCategoria(c.formaPagamento, c.tipoMovimento),
      diaVencimento: c.diaVencimento ?? 1,
    }))
  const fixasCartao: CatFixa[] = useMemo(() => {
    if (isDinheiro) return []
    const faturasDados = faturaData as Record<string, { lancamentos: Record<number, { tipo: string; valor: number }[]> }>
    const result: CatFixa[] = []
    contas.filter(c => c.tipo === 'cartao' && c.diaVencimento).forEach(c => {
      const isAutomatico = c.formaPagamentoFatura === 'automatico'
        || (!c.formaPagamentoFatura && !!c.contaPagamentoId)
      if (isAutomatico) {
        if (c.contaPagamentoId !== contaIdEfetivo) return
      } else {
        const jaPaga = contasExtrato
          .filter(ct => ct.id !== contaIdEfetivo)
          .some(ct => dados[mesKey(ct.id, ano, mes)]?.fixasConsolidadas?.[`cartao-${c.id}`] === true)
        if (jaPaga) return
      }
      const fatKey = mesKey(c.id, ano, mes)
      const dm = faturasDados[fatKey]
      let total = 0
      if (dm) {
        const nDias = new Date(ano, mes + 1, 0).getDate()
        for (let d = 1; d <= nDias; d++) {
          ;(dm.lancamentos[d] ?? []).forEach((l: { tipo: string; valor: number }) => {
            l.tipo === 'saida' ? total += l.valor : total -= l.valor
          })
        }
      }
      const fp = c.formaPagamentoFatura
      const formaPagamento: FormaPag =
        !fp || fp === 'automatico' || fp === 'boleto' ? 'debito' :
        fp === 'pix' ? 'pix' : 'transferencia'
      result.push({
        id: `cartao-${c.id}`,
        nome: c.nome,
        categoria: c.banco,
        valor: total,
        tipo: 'saida' as TipoLanc,
        formaPagamento,
        diaVencimento: c.diaVencimento!,
        ehFaturaCartao: isAutomatico,
      })
    })
    return result
  }, [contas, contaIdEfetivo, ano, mes, dados, contasExtrato, faturaData])

  const saldoAtualPorConta = useMemo(() => {
    const mesStr = String(mes + 1).padStart(2, '0')
    const totalDiasM = new Date(ano, mes + 1, 0).getDate()
    return contasExtrato.map(c => {
      const key = `${c.id}-${ano}-${mesStr}`
      const dm = dados[key]
      let te = 0, ts = 0
      if (dm) {
        for (let d = 1; d <= totalDiasM; d++) {
          ;(dm.lancamentos?.[d] ?? []).forEach((l: { tipo: string; valor: number }) => {
            l.tipo === 'entrada' ? te += l.valor : ts += l.valor
          })
        }
      }
      const calculado = c.saldoInicial + te - ts
      const manualStr = dm?.saldoBanco ?? ''
      const manual = parseFloat(manualStr.replace(/[R$\s.]/g, '').replace(',', '.')) || 0
      return { conta: c, saldo: manual > 0 ? manual : calculado, calculado }
    })
  }, [contasExtrato, dados, ano, mes])

  // Saldo calculado formatado por conta (para sugerir no modal — sem override manual)
  const saldoSugerido = useMemo(() => {
    const m: Record<string, string> = {}
    saldoAtualPorConta.forEach(({ conta, calculado }) => { m[conta.id] = fmt(calculado) })
    return m
  }, [saldoAtualPorConta])

  const faturaAtualPorCartao = useMemo(() => {
    const fat = faturaData as Record<string, { lancamentos?: Record<number, { tipo: string; valor: number }[]> }>
    return contas.filter(c => c.tipo === 'cartao').map(c => {
      const key = mesKey(c.id, ano, mes)
      const dm = fat[key]
      const totalDiasM = new Date(ano, mes + 1, 0).getDate()
      let total = 0
      if (dm?.lancamentos) {
        for (let d = 1; d <= totalDiasM; d++) {
          ;(dm.lancamentos[d] ?? []).forEach((l: { tipo: string; valor: number }) => {
            l.tipo === 'saida' ? total += l.valor : total -= l.valor
          })
        }
      }
      return { conta: c, fatura: Math.max(0, total) }
    })
  }, [contas, faturaData, ano, mes])

  const { totalEntradasMes, totalSaidasMes, recentLancs } = useMemo(() => {
    const mesStr = String(mes + 1).padStart(2, '0')
    const totalDiasM = new Date(ano, mes + 1, 0).getDate()
    let te = 0, ts = 0
    const lancs: { dia: number; banco: string; icone: string; cor: string; categoria: string; descricao: string; valor: number; tipo: string }[] = []
    for (const c of contasExtrato) {
      const dm = dados[`${c.id}-${ano}-${mesStr}`]
      if (!dm) continue
      for (let d = 1; d <= totalDiasM; d++) {
        for (const l of dm.lancamentos?.[d] ?? []) {
          l.tipo === 'entrada' ? te += l.valor : ts += l.valor
          lancs.push({ dia: d, banco: c.banco, icone: c.icone, cor: c.cor, categoria: l.categoria, descricao: (l as { descricao?: string }).descricao ?? '', valor: l.valor, tipo: l.tipo })
        }
      }
    }
    lancs.sort((a, b) => b.dia - a.dia)
    return { totalEntradasMes: te, totalSaidasMes: ts, recentLancs: lancs.slice(0, 40) }
  }, [contasExtrato, dados, ano, mes])

  const fixas = [...fixasCategoria, ...fixasCartao]
  const categoriasVariaveis = categorias
    .filter(c => c.ativa && c.tipo === fTipo && (isDinheiro ? c.formaPagamento !== 'automatico' : true))
    .sort((a,b) => a.nome.localeCompare(b.nome,'pt-BR'))
  const categoriasSelect = categoriasVariaveis.filter((c, idx, arr) =>
    arr.findIndex(x => x.nome === c.nome) === idx
  )
  const subDescsDisponiveis = fCat
    ? categoriasVariaveis.filter(c => c.nome === fCat && c.descricao).map(c => c.descricao!)
    : []
  const contaInfo     = contas.find(c => c.id === contaIdEfetivo)
  const SALDO_INICIAL = contaInfo?.saldoInicial ?? 0
  const totalDias = diasNoMes(mes, ano)
  const eMesAtual = mes===mesHoje && ano===anoHoje
  const key       = mesKey(contaIdEfetivo, ano, mes)
  const mesDados  = dados[key] ?? { lancamentos:{}, saldoBanco:'' }
  const saldoExtNum = parseBRL(mesDados.saldoBanco)

  useEffect(() => { setSaldoBancoInline(mesDados.saldoBanco ?? '') }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const bancos = contas.filter(c => c.tipo==='corrente'||c.tipo==='poupanca')
    const preferida = bancos.find(c => c.preferida)
    const inicial = preferida ?? bancos[0]
    if (inicial) { setContaId(inicial.id); setFBancoConsolidado(inicial.id) }
  }, [])

  useEffect(() => {
    if (eMesAtual)
      setTimeout(() => hojeRef.current?.scrollIntoView({behavior:'smooth',block:'start'}), 150)
    setDiasAbertos(new Set(eMesAtual ? [diaHoje] : []))
  }, [contaId, mes, ano, tabPrincipal])

  useEffect(() => { if (isDinheiro) setFPag('dinheiro') }, [tabPrincipal])

  useEffect(() => {
    if (isMobile) return
    const params  = new URLSearchParams(location.search)
    let rawTipo   = params.get('tipo')
    const conta   = params.get('conta')
    if (!rawTipo && !conta) return
    if (rawTipo === 'banco') rawTipo = 'extrato'
    const tipo = rawTipo as typeof tabPrincipal | null
    if (tipo && tipo !== tabPrincipal) setTabPrincipal(tipo)
    if (tipo === 'extrato') {
      if (conta && contasExtrato.find(c => c.id === conta)) {
        setContaId(conta)
      } else {
        const p = contasExtrato.find(c => c.preferida)
        setContaId((p ?? contasExtrato[0])?.id ?? '')
      }
    }
    if (tipo === 'cartao' && conta) {
      setCartaoNavId(conta)
    }
  }, [location.search]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tabPrincipal === 'dinheiro') {
      const k = mesKey('dinheiro', ano, mes)
      if (dados[k]?.saldoBancoData === hojeStr) return
      setModalSaldoValor('')
      setModalSaldo({contaId:'dinheiro', banco:'Dinheiro', icone:'💵', cor:'#16a34a', key:k})
      return
    }
    if (tabPrincipal !== 'extrato') return
    const conta = contasExtrato.find(c => c.id === contaId) ?? contasExtrato[0]
    if (!conta) return
    const k = mesKey(conta.id, ano, mes)
    if (dados[k]?.saldoBancoData === hojeStr) return
    setModalSaldoValor(saldoSugerido[conta.id] ?? '')
    setModalSaldo({contaId:conta.id, banco:conta.banco, icone:conta.icone, cor:conta.cor, key:k})
  }, [tabPrincipal])

  useEffect(() => {
    if (!mostrarCalendario) return
    const fechar = () => setMostrarCalendario(false)
    document.addEventListener('click', fechar)
    return () => document.removeEventListener('click', fechar)
  }, [mostrarCalendario])

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
    setDiaSel(novoDia); setEditandoId(null); setEditandoDiaOriginal(null); setEditandoFixaId(null)
    setFTipo('saida'); setFCat(''); setFSubDesc(''); setFDesc(''); setFValor(''); setFContaDestino('')
    setTimeout(() => categoriaSelectRef.current?.focus(), 50)
  }

  function editarLancamento(dia: number, l: Lancamento) {
    setDiaSel(dia); setEditandoId(l.id); setEditandoDiaOriginal(dia); setEditandoFixaId(null); if (isMobile) setMobileView('form')
    setFTipo(l.tipo); setFCat(l.categoria); setFSubDesc(l.subCategoria ?? ''); setFDesc(l.descricao)
    setFValor(String(l.valor).replace('.', ',')); setFPag(l.formaPagamento)
    if (l.formaPagamento === 'transferencia') {
      const tipoOposto = l.tipo === 'saida' ? 'entrada' : 'saida'
      const mesStr = String(mes+1).padStart(2,'0')
      const destino = contasExtrato.find(ct => {
        if (ct.id === contaIdEfetivo) return false
        const d = (extratoData as Record<string, DadosMes>)[`${ct.id}-${ano}-${mesStr}`]
        return d?.lancamentos?.[dia]?.some(
          lc => lc.valor === l.valor && lc.tipo === tipoOposto && lc.formaPagamento === 'transferencia'
        )
      })
      setFContaDestino(destino?.id ?? '')
    } else {
      setFContaDestino('')
    }
    setTimeout(() => categoriaSelectRef.current?.focus(), 50)
  }

  function editarFixa(dia: number, f: CatFixa) {
    setDiaSel(dia); setEditandoId(null); setEditandoDiaOriginal(null); setEditandoFixaId(f.id); if (isMobile) setMobileView('form')
    setFTipo(f.tipo); setFCat(f.categoria)
    setFDesc(mesDados.fixasDescOverride?.[f.id] ?? f.nome)
    setFValor(String(mesDados.fixasValorOverride?.[f.id] ?? f.valor).replace('.', ','))
    setFPag(mesDados.fixasPagOverride?.[f.id] ?? f.formaPagamento)
    setTimeout(() => valorInputRef.current?.focus(), 50)
  }

  function updateMes(fn: (prev: DadosMes) => DadosMes) {
    updateExtratoMes(key, fn as unknown as (prev: import('../context/AppContext').DadosMes) => import('../context/AppContext').DadosMes)
  }
  function updateMesPorKey(targetKey: string, fn: (prev: DadosMes) => DadosMes) {
    updateExtratoMes(targetKey, fn as unknown as (prev: import('../context/AppContext').DadosMes) => import('../context/AppContext').DadosMes)
  }

  function confirmarModalSaldo() {
    if (!modalSaldo) return
    const n = parseBRL(modalSaldoValor)
    if (modalSaldoValor.trim()) {
      updateMesPorKey(modalSaldo.key, prev => ({...prev, saldoBanco: fmt(n), saldoBancoData: hojeStr}))
    } else {
      updateMesPorKey(modalSaldo.key, prev => ({...prev, saldoBancoData: hojeStr}))
    }
    setModalSaldo(null)
  }

  function ehAutomatico(f: CatFixa) {
    return f.ehFaturaCartao === true || ehAutomaticoCategoria(categorias, f.categoria)
  }

  function desconsolidarFixa(fixaId: string) {
    updateMes(prev => ({
      ...prev,
      fixasConsolidadas: { ...prev.fixasConsolidadas, [fixaId]: false },
    }))
  }

  function consolidarFixa(fixaId: string) {
    updateMes(prev => ({
      ...prev,
      fixasConsolidadas: { ...prev.fixasConsolidadas, [fixaId]: true },
    }))
  }

  const saldoBase = useMemo(() => {
    let acc = SALDO_INICIAL
    for (const [k, dadosK] of Object.entries(dados)) {
      if (!k.startsWith(`${contaIdEfetivo}-`)) continue
      const sufixo = k.slice(-7)
      const ky = parseInt(sufixo.slice(0, 4))
      const km = parseInt(sufixo.slice(5, 7)) - 1
      if (isNaN(ky) || isNaN(km)) continue
      if (ky > ano || (ky === ano && km >= mes)) continue
      for (const itens of Object.values(dadosK.lancamentos ?? {}))
        for (const item of itens)
          acc += item.tipo === 'entrada' ? item.valor : -item.valor
      const planoAno = planosReal[ky] ?? planos[ky]
      for (const [catId, confirmed] of Object.entries(dadosK.fixasConsolidadas ?? {})) {
        if (!confirmed) continue
        const fixasOvr = dadosK.fixasValorOverride ?? {}
        if (catId.startsWith('cartao-')) {
          const cardId = catId.slice(7)
          const override = fixasOvr[catId]
          if (override !== undefined && override > 0) { acc -= override; continue }
          const dm = (faturaData as Record<string, { lancamentos?: Record<number, { tipo: string; valor: number }[]> }>)[`${cardId}-${sufixo}`]
          if (dm?.lancamentos) {
            const tdm = new Date(ky, km + 1, 0).getDate()
            let total = 0
            for (let d = 1; d <= tdm; d++) {
              ;(dm.lancamentos[d] ?? []).forEach((l: { tipo: string; valor: number }) => {
                l.tipo === 'saida' ? total += l.valor : total -= l.valor
              })
            }
            if (total > 0) acc -= total
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
    return acc
  }, [SALDO_INICIAL, dados, contaIdEfetivo, ano, mes, categorias, planos, planosReal, faturaData])

  const saldosDia = useMemo(() => {
    const dadosMesAtual = dados[key]
    const lancs     = (dadosMesAtual ?? { lancamentos:{} }).lancamentos
    const overrides = dadosMesAtual?.fixasMovidas
    const fc    = fixas.filter(f => !ehCartaoCategoria(categorias, f.categoria))
    const mesPast = ano < anoHoje || (ano === anoHoje && mes < mesHoje)
    let saldo = saldoBase
    const res: Record<number,number> = {}
    for (let d=1; d<=totalDias; d++) {
      const dPast = mesPast || (eMesAtual && d < diaHoje)
      const dHoje = eMesAtual && d === diaHoje
      fc.filter(f=>diaEfetivoFixa(f,overrides,ehAutomatico(f),mes,ano,totalDias)===d)
        .forEach(f => {
          if (dPast || dHoje) {
            const confirmada = dadosMesAtual?.fixasConsolidadas?.[f.id] === true
            if (!confirmada) return
          }
          const v = (dPast || dHoje) ? (dadosMesAtual?.fixasValorOverride?.[f.id] ?? f.valor) : f.valor
          saldo += f.tipo==='entrada' ? v : -v
        })
      ;(lancs[d]??[]).forEach(l=>{ saldo += l.tipo==='entrada'?l.valor:-l.valor })
      res[d] = saldo
    }
    return res
  }, [saldoBase, dados, key, contaId, totalDias, mes, ano, categorias, eMesAtual, diaHoje, anoHoje, mesHoje])

  const { totalEntradas, totalSaidas } = useMemo(() => {
    const dadosMesAtual = dados[key]
    const lancs     = (dadosMesAtual ?? { lancamentos:{} }).lancamentos
    const overrides = dadosMesAtual?.fixasMovidas
    const fc    = fixas.filter(f => !ehCartaoCategoria(categorias, f.categoria))
    let te=0, ts=0
    for (let d=1; d<=totalDias; d++) {
      fc.filter(f => diaEfetivoFixa(f,overrides,ehAutomatico(f),mes,ano,totalDias)===d)
        .filter(f => { return dadosMesAtual?.fixasConsolidadas?.[f.id] === true })
        .forEach(f=>{ const v = dadosMesAtual?.fixasValorOverride?.[f.id] ?? f.valor; f.tipo==='entrada'?te+=v:ts+=v })
      ;(lancs[d]??[]).forEach(l=>{ l.tipo==='entrada'?te+=l.valor:ts+=l.valor })
    }
    return { totalEntradas:te, totalSaidas:ts }
  }, [dados, key, contaId, totalDias, mes, ano, categorias])

  const saldoMes   = saldoBase + totalEntradas - totalSaidas
  const diferenca  = saldoExtNum > 0 ? saldoExtNum - saldoMes : null
  const conciliado = diferenca !== null && Math.abs(diferenca) < 0.01

  const catEditandoFixa = editandoFixaId ? categorias.find(c => c.id === editandoFixaId) : null
  const fixaEhAutomatica = catEditandoFixa?.tipoMovimento === 'banco' && catEditandoFixa?.formaPagamento === 'automatico'

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
      setFCat(''); setFSubDesc(''); setFDesc(''); setFValor('')
      if (isMobile) { setMobileDiaForm(null) } else { setTimeout(() => categoriaSelectRef.current?.focus(), 80) }
      return
    }
    if (fPag === 'transferencia' && !editandoId) {
      if (valor <= 0 || !fContaDestino) return
      const diaFuturoAlvo = ehDiaFuturo(diaSel)
      const contaDestNome = contasExtrato.find(c => c.id === fContaDestino)?.nome ?? ''
      const contaOriNome  = contaInfo?.nome ?? ''
      const tipoOposto: TipoLanc = fTipo === 'saida' ? 'entrada' : 'saida'
      const descPrimaria = fDesc.trim() || (fTipo === 'saida' ? `→ ${contaDestNome}` : `← ${contaDestNome}`)
      const descEspelho  = fDesc.trim() || (tipoOposto === 'entrada' ? `← ${contaOriNome}` : `→ ${contaOriNome}`)
      updateMes(prev => ({
        ...prev,
        lancamentos: {
          ...prev.lancamentos,
          [diaSel]: [...(prev.lancamentos[diaSel] ?? []), {
            id: `v-${Date.now()}`, tipo: fTipo,
            descricao: descPrimaria, categoria: 'Transferência',
            valor, formaPagamento: 'transferencia' as FormaPag,
            tipoLanc: 'variavel' as const, consolidado: !diaFuturoAlvo,
          }],
        },
      }))
      updateMesPorKey(mesKey(fContaDestino, ano, mes), prev => ({
        ...prev,
        lancamentos: {
          ...prev.lancamentos,
          [diaSel]: [...(prev.lancamentos[diaSel] ?? []), {
            id: `v-${Date.now() + 1}`, tipo: tipoOposto,
            descricao: descEspelho, categoria: 'Transferência',
            valor, formaPagamento: 'transferencia' as FormaPag,
            tipoLanc: 'variavel' as const, consolidado: !diaFuturoAlvo,
          }],
        },
      }))
      setFCat(''); setFSubDesc(''); setFDesc(''); setFValor(''); setFContaDestino('')
      if (isMobile) { setMobileDiaForm(null) } else { setTimeout(() => categoriaSelectRef.current?.focus(), 80) }
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
          subCategoria: fSubDesc || undefined,
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
            subCategoria: fSubDesc || undefined,
            valor, formaPagamento:fPag, tipoLanc:'variavel',
            consolidado: !diaFuturoAlvo,
          }],
        }
      }))
    }
    if (editandoId) {
      toast('Lançamento atualizado')
    } else {
      toast('Lançamento registrado')
    }
    if (fTipo === 'saida' && fCat && !editandoId) {
      const previsto = valorPrevistoPorNome(fCat, 'saida')
      if (previsto > 0) {
        const totalExistente = Object.values(mesDados.lancamentos)
          .flat()
          .filter(l => l.categoria === fCat && l.tipo === 'saida')
          .reduce((s, l) => s + l.valor, 0)
        const totalNovo = totalExistente + valor
        const limiteAlerta = previsto * (1 + percentualAlerta / 100)
        if (totalNovo > limiteAlerta) {
          setAlertaDesvio({ catNome: fCat, totalGasto: totalNovo, previsto, valorAtual: valor, descricao: fDesc.trim() || fCat })
        }
      }
    }
    setEditandoId(null); setEditandoDiaOriginal(null)
    setFCat(''); setFSubDesc(''); setFDesc(''); setFValor('')
    if (isMobile) { setMobileDiaForm(null) } else {
      setHighlightDia(diaSel); setTimeout(() => setHighlightDia(null), 1200)
      setTimeout(() => categoriaSelectRef.current?.focus(), 80)
    }
  }

  function lancarConsolidado() {
    const valor = parseBRL(fValor)
    if (!fCat || valor <= 0 || !fBancoConsolidado) return
    const diaFuturoAlvo = ehDiaFuturo(diaSel)
    const contaSel = contas.find(c => c.id === fBancoConsolidado)
    if (contaSel?.tipo === 'cartao') {
      const fatKey = mesKey(fBancoConsolidado, ano, mes)
      ;(setFaturaData as React.Dispatch<React.SetStateAction<Record<string, unknown>>>)(prev => {
        const dm = (prev[fatKey] ?? { lancamentos: {} }) as { lancamentos: Record<number, unknown[]> }
        return {
          ...prev,
          [fatKey]: {
            ...dm,
            lancamentos: {
              ...dm.lancamentos,
              [diaSel]: [...((dm.lancamentos[diaSel]) ?? []), {
                id: `v-${Date.now()}`, tipo: fTipo,
                descricao: fDesc.trim() || fCat, categoria: fCat,
                valor, consolidado: !diaFuturoAlvo,
              }],
            },
          },
        }
      })
    } else {
      updateMesPorKey(mesKey(fBancoConsolidado, ano, mes), prev => ({
        ...prev,
        lancamentos: {
          ...prev.lancamentos,
          [diaSel]: [...(prev.lancamentos[diaSel]??[]), {
            id:`v-${Date.now()}`, tipo:fTipo,
            descricao:fDesc.trim()||fCat, categoria:fCat,
            subCategoria: fSubDesc || undefined,
            valor, formaPagamento:fPag, tipoLanc:'variavel',
            consolidado: !diaFuturoAlvo,
          }],
        },
      }))
    }
    toast('Lancamento registrado')
    setFCat(''); setFSubDesc(''); setFDesc(''); setFValor('')
    setHighlightDia(diaSel); setTimeout(() => setHighlightDia(null), 1200)
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
    setFCat(''); setFSubDesc(''); setFDesc(''); setFValor('')
    toast('Lançamento excluído', 'info')
  }

  function excluir(dia: number, id: string) {
    updateMes(prev => ({
      ...prev,
      lancamentos: { ...prev.lancamentos, [dia]: (prev.lancamentos[dia]??[]).filter(l=>l.id!==id) }
    }))
    if (editandoId === id) {
      setEditandoId(null); setEditandoDiaOriginal(null)
      setFCat(''); setFSubDesc(''); setFDesc(''); setFValor('')
    }
  }

  // ── Handlers built in parent for child components ──────────────────

  function onAlertaAjustarMes(novoVal: number) {
    if (!alertaDesvio) return
    const catNome = alertaDesvio.catNome
    const baseReal = planosReal[ano] ?? planos[ano]
    if (baseReal) {
      const planoBase = (planosReal[ano]?.saidas?.length || planosReal[ano]?.entradas?.length)
        ? planosReal[ano]
        : baseReal
      const novoPlano = {
        ...planoBase,
        saidas: (planoBase.saidas ?? []).map(c =>
          c.nome === catNome ? { ...c, v: c.v.map((v, mi) => mi === mes ? novoVal : v) } : c
        ),
      }
      updatePlanoReal(ano, () => novoPlano)
    }
    setAlertaDesvio(null)
  }

  function onSaldoBancoSave() {
    const n = parseBRL(saldoBancoInline)
    updateMes(prev => ({...prev, saldoBanco: saldoBancoInline ? fmt(n) : '', saldoBancoData: hojeStr}))
  }

  function onMesAnterior() {
    let m=mes-1, a=ano; if(m<0){m=11;a--}
    setMes(m); resetarParaNovo(diaDefaultPara(m, a))
  }
  function onMesProximo() {
    let m=mes+1, a=ano; if(m>11){m=0;a++}
    setMes(m); resetarParaNovo(diaDefaultPara(m, a))
  }

  // ── JSX ────────────────────────────────────────────────────────────
  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',
      background:COR.fundo,fontFamily:"-apple-system,'Inter',sans-serif",overflow:'hidden'}}>
      <style>{`
        @keyframes rowSaved {
          0%   { box-shadow: 0 0 0 3px rgba(26,86,219,0.35), inset 0 0 0 9999px rgba(219,234,254,0.5); }
          100% { box-shadow: none; }
        }
      `}</style>

      <NleHeader
        isMobile={isMobile}
        user={user}
        sairDaConta={sairDaConta}
        tabPrincipal={tabPrincipal}
        setTabPrincipal={setTabPrincipal}
        contasExtrato={contasExtrato}
        setContaId={setContaId}
        setMobileDiaForm={setMobileDiaForm}
      />

      <NleMobileWizard
        isMobile={isMobile}
        mobileStep={mobileStep}
        setMobileStep={setMobileStep}
        tabPrincipal={tabPrincipal}
        setTabPrincipal={setTabPrincipal}
        contasExtrato={contasExtrato}
        contas={contas}
        setContaId={setContaId}
        setMobileCartaoId={setMobileCartaoId}
        setMobileView={setMobileView}
        mes={mes}
        ano={ano}
        dados={dados}
        hojeStr={hojeStr}
        diaHoje={diaHoje}
        mesHoje={mesHoje}
        anoHoje={anoHoje}
        resetarParaNovo={resetarParaNovo}
        diaDefaultPara={diaDefaultPara}
        setModalSaldo={setModalSaldo}
        setModalSaldoValor={setModalSaldoValor}
        mesKey={mesKey}
        saldoSugerido={saldoSugerido}
      />

      <NleMobileSubheader
        isMobile={isMobile}
        tabPrincipal={tabPrincipal}
        alertaDesvio={alertaDesvio}
        setAlertaDesvio={setAlertaDesvio}
        mesLabel={NOMES_MESES[mes]}
        onAlertaRevisar={() => { setAlertaDesvio(null); navigate('/planejamento', { state: { aba: 'revisao' } }) }}
        onAlertaAjustarMes={onAlertaAjustarMes}
        contasExtrato={contasExtrato}
        contaIdEfetivo={contaIdEfetivo}
        dados={dados}
        hojeStr={hojeStr}
        mes={mes}
        ano={ano}
        mesNome={NOMES_MESES[mes]}
        setContaId={setContaId}
        setModalSaldo={setModalSaldo}
        setModalSaldoValor={setModalSaldoValor}
        mesKey={mesKey}
        saldoSugerido={saldoSugerido}
        onMesAnterior={onMesAnterior}
        onMesProximo={onMesProximo}
        isDinheiro={isDinheiro}
        contaInfo={contaInfo}
        mesDados={mesDados}
        saldoMes={saldoMes}
        diferenca={diferenca}
        conciliado={conciliado}
        chaveAtual={key}
      />

      {/* Tutoriais */}
      {tabPrincipal === 'extrato' && <TutorialCard tela="lanc_banco" icon="🏦"
        title="Movimentação do banco"
        description="Aqui você registra tudo que entra e sai da sua conta bancária. É como o extrato do banco, só que organizado do seu jeito."
        tips={[
          { icon: '📅', text: 'Cada dia do mês aparece no calendário — toque para lançar' },
          { icon: '🔄', text: 'Gastos previstos do planejamento aparecem em cinza' },
          { icon: '✅', text: 'Quando pagar uma conta prevista, marque como paga' },
        ]} buttonLabel="Ver movimentação →" />}
      {tabPrincipal === 'cartao' && <TutorialCard tela="lanc_cartao" icon="💳"
        title="Fatura do cartão"
        description="Acompanhe os gastos do seu cartão de crédito. Veja quanto já gastou da fatura e quanto ainda tem de limite."
        tips={[
          { icon: '📋', text: 'Cada compra no cartão aparece aqui automaticamente' },
          { icon: '📊', text: 'Acompanhe o uso do limite em tempo real' },
          { icon: '📅', text: 'Veja a fatura aberta e as anteriores' },
        ]} buttonLabel="Ver fatura →" />}
      {tabPrincipal === 'dinheiro' && <TutorialCard tela="lanc_dinheiro" icon="💵"
        title="Gastos em dinheiro"
        description="Registre aqui os gastos que você fez em dinheiro vivo — aqueles que não aparecem no banco nem no cartão."
        tips={[
          { icon: '🧾', text: 'Controle os gastos que normalmente passam despercebidos' },
          { icon: '📝', text: 'Anote na hora para não esquecer depois' },
        ]} buttonLabel="Registrar →" />}
      {tabPrincipal === 'consolidado' && <TutorialCard tela="lanc_visaogeral" icon="📊"
        title="Tudo junto"
        description="Aqui você vê todos os seus gastos e recebimentos — banco, cartão e dinheiro — em um único lugar."
        tips={[
          { icon: '🔍', text: 'Visão completa de todas as movimentações do mês' },
          { icon: '📈', text: 'Compare entradas e saídas de todas as fontes' },
          { icon: '🗓️', text: 'Navegue entre os meses para ver o histórico' },
        ]} buttonLabel="Ver visão geral →" />}

      {tabPrincipal === 'cartao' ? (
        <FaturaCartao
          mobileSelecionado={isMobile ? (mobileCartaoId ?? undefined) : cartaoNavId}
          onCartaoChange={id => setCartaoAtualId(id)}
          onVoltar={() => setMobileStep('tipo')}
        />
      ) : tabPrincipal === 'consolidado' ? (
        <NleConsolidado
          isMobile={isMobile}
          mobileView={mobileView}
          setMobileView={setMobileView}
          saldoAtualPorConta={saldoAtualPorConta}
          faturaAtualPorCartao={faturaAtualPorCartao}
          totalEntradasMes={totalEntradasMes}
          totalSaidasMes={totalSaidasMes}
          recentLancs={recentLancs}
          mes={mes}
          ano={ano}
          fBancoConsolidado={fBancoConsolidado}
          setFBancoConsolidado={setFBancoConsolidado}
          diaSel={diaSel}
          setDiaSel={setDiaSel}
          totalDias={totalDias}
          fTipo={fTipo}
          setFTipo={setFTipo}
          setFPag={setFPag}
          fPag={fPag}
          contas={contas}
          contasExtrato={contasExtrato}
          fCat={fCat}
          setFCat={setFCat}
          fSubDesc={fSubDesc}
          setFSubDesc={setFSubDesc}
          fDesc={fDesc}
          setFDesc={setFDesc}
          fValor={fValor}
          setFValor={setFValor}
          categoriasSelect={categoriasSelect}
          subDescsDisponiveis={subDescsDisponiveis}
          categorias={categorias}
          valorInputRef={valorInputRef}
          categoriaSelectRef={categoriaSelectRef}
          lancarConsolidado={lancarConsolidado}
          resetarParaNovo={resetarParaNovo}
        />
      ) : (
        <>
          <NleBanner
            isMobile={isMobile}
            tabPrincipal={tabPrincipal}
            saldoBase={saldoBase}
            totalEntradas={totalEntradas}
            totalSaidas={totalSaidas}
            saldoMes={saldoMes}
            mes={mes}
            ano={ano}
            saldoBancoInline={saldoBancoInline}
            setSaldoBancoInline={setSaldoBancoInline}
            onSaldoBancoBlur={onSaldoBancoSave}
            onSaldoBancoEnter={onSaldoBancoSave}
            mostrarCalendario={mostrarCalendario}
            anoCalendario={anoCalendario}
            setAnoCalendario={setAnoCalendario}
            calPos={calPos}
            onMesSelect={(m, a) => { setMes(m); setAno(a); resetarParaNovo(diaDefaultPara(m, a)) }}
            setMostrarCalendario={setMostrarCalendario}
            contasExtrato={contasExtrato}
            contaIdEfetivo={contaIdEfetivo}
            onContaSelect={(id) => navigate(`/novo-lancamento?tipo=banco&conta=${id}`)}
          />

          <div style={{flex:1,display:'flex',flexDirection:isMobile?'column':'row',overflow:isMobile?'auto':'hidden', paddingBottom:isMobile?120:0}}>
            <NleExtrato
              isMobile={isMobile}
              mobileView={mobileView}
              mes={mes}
              ano={ano}
              totalDias={totalDias}
              eMesAtual={eMesAtual}
              diaHoje={diaHoje}
              anoHoje={anoHoje}
              mesHoje={mesHoje}
              fixas={fixas}
              categorias={categorias}
              mesDados={mesDados}
              saldosDia={saldosDia}
              saldoBase={saldoBase}
              saldoMes={saldoMes}
              totalEntradas={totalEntradas}
              totalSaidas={totalSaidas}
              contas={contas}
              diaSel={diaSel}
              diasAbertos={diasAbertos}
              highlightDia={highlightDia}
              editandoId={editandoId}
              editandoFixaId={editandoFixaId}
              mobileDiaForm={mobileDiaForm}
              fTipo={fTipo}
              fCat={fCat}
              fSubDesc={fSubDesc}
              fDesc={fDesc}
              fValor={fValor}
              fPag={fPag}
              categoriasSelect={categoriasSelect}
              subDescsDisponiveis={subDescsDisponiveis}
              valorInputRef={valorInputRef}
              categoriaSelectRef={categoriaSelectRef}
              hojeRef={hojeRef}
              toggleDia={toggleDia}
              resetarParaNovo={resetarParaNovo}
              setDiaSel={setDiaSel}
              editarFixa={editarFixa}
              editarLancamento={editarLancamento}
              excluir={excluir}
              lancar={lancar}
              desconsolidarFixa={desconsolidarFixa}
              consolidarFixa={consolidarFixa}
              setMobileDiaForm={setMobileDiaForm}
              setFTipo={setFTipo}
              setFCat={setFCat}
              setFSubDesc={setFSubDesc}
              setFDesc={setFDesc}
              setFValor={setFValor}
              setFPag={setFPag}
              setEditandoId={setEditandoId}
              setEditandoFixaId={setEditandoFixaId}
              ehAutomatico={ehAutomatico}
            />

            <NleDesktopPanel
              isMobile={isMobile}
              mes={mes}
              ano={ano}
              diaSel={diaSel}
              totalDias={totalDias}
              setDiaSel={setDiaSel}
              editandoId={editandoId}
              editandoFixaId={editandoFixaId}
              fixaEhAutomatica={fixaEhAutomatica}
              fTipo={fTipo}
              fCat={fCat}
              fSubDesc={fSubDesc}
              fDesc={fDesc}
              fValor={fValor}
              fPag={fPag}
              fContaDestino={fContaDestino}
              isDinheiro={isDinheiro}
              contaInfo={contaInfo}
              categoriasSelect={categoriasSelect}
              subDescsDisponiveis={subDescsDisponiveis}
              contasExtrato={contasExtrato}
              contaIdEfetivo={contaIdEfetivo}
              categorias={categorias}
              fixas={fixas}
              mesDados={mesDados}
              totalSaidas={totalSaidas}
              calBtnRef={calBtnRef}
              categoriaSelectRef={categoriaSelectRef}
              valorInputRef={valorInputRef}
              mostrarCalendario={mostrarCalendario}
              anoCalendario={anoCalendario}
              setAnoCalendario={setAnoCalendario}
              calPos={calPos}
              setCalPos={setCalPos}
              setMostrarCalendario={setMostrarCalendario}
              setMes={setMes}
              setAno={setAno}
              resetarParaNovo={resetarParaNovo}
              diaDefaultPara={diaDefaultPara}
              setFTipo={setFTipo}
              setFPag={setFPag}
              setFCat={setFCat}
              setFSubDesc={setFSubDesc}
              setFContaDestino={setFContaDestino}
              setFDesc={setFDesc}
              setFValor={setFValor}
              lancar={lancar}
              excluirAtual={excluirAtual}
            />
          </div>
        </>
      )}

      <BottomNav />

      <NleModal
        modalSaldo={modalSaldo}
        setModalSaldo={setModalSaldo}
        modalSaldoValor={modalSaldoValor}
        setModalSaldoValor={setModalSaldoValor}
        confirmarModalSaldo={confirmarModalSaldo}
      />
    </div>
  )
}
