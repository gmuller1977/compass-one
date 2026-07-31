import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AppHeader from '../components/AppHeader'
import { useToast } from '../components/Toast'
import { iconeCategoria, ehAutomaticoCategoria, ehCartaoCategoria } from '../utils/categoriaIcone'
import FaturaCartao from './FaturaCartao'
import ExtratoConsolidado from './ExtratoConsolidado'
import BottomNav from '../components/BottomNav'

const COR = {
  azul: '#1a56db', azulEscuro: '#0f2878', azulMedio: '#2563eb',
  fundo: '#f0f4ff', branco: '#ffffff', texto: '#0f172a',
  textoSuave: '#64748b', borda: '#e2e8f0',
  verde: '#16a34a', vermelho: '#dc2626',
}

type TipoLanc = 'entrada' | 'saida'
type FormaPag = 'debito' | 'automatico' | 'credito' | 'pix' | 'transferencia' | 'dinheiro' | 'boleto' | 'manual'

type CatFixa = {
  id: string; nome: string; categoria: string
  subtitulo?: string
  valor: number; tipo: TipoLanc
  formaPagamento: FormaPag
  diaVencimento: number
  ehFaturaCartao?: boolean
}

type Lancamento = {
  id: string; tipo: TipoLanc
  descricao: string; categoria: string
  subCategoria?: string
  valor: number; formaPagamento: FormaPag
  tipoLanc: 'fixa'|'variavel'
  consolidado?: boolean
}

type DadosMes = {
  lancamentos: Record<number, Lancamento[]>
  saldoBanco: string
  saldoBancoData?: string
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
const DIAS_SEM     = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']


const FORMAS_SAI: { id: FormaPag; label: string }[] = [
  { id:'debito',        label:'Débito'        },
  { id:'dinheiro',      label:'Dinheiro'      },
  { id:'pix',           label:'Pix'           },
  { id:'transferencia', label:'Transferência' },
]
const FORMAS_ENT: { id: FormaPag; label: string }[] = [
  { id:'dinheiro',      label:'Dinheiro'      },
  { id:'pix',           label:'Pix'           },
  { id:'transferencia', label:'Transferência' },
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
  if (fp === 'boleto') return 'boleto'
  if (fp === 'manual') return 'manual'
  if (fp === 'debito') return 'debito'
  if (fp === 'automatico') return 'automatico'
  return 'debito'
}
function formaRecebCategoria(fp: string | undefined, mov: string | undefined): FormaPag {
  if (mov === 'dinheiro') return 'dinheiro'
  if (fp === 'pix') return 'pix'
  if (fp === 'transferencia') return 'transferencia'
  return 'pix'
}

function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
}

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
  const [alertaDesvio, setAlertaDesvio] = useState<{catNome:string; totalGasto:number; previsto:number}|null>(null)
  const isMobile = useIsMobile()
  const [mobileView, setMobileView] = useState<'extrato'|'form'>('extrato')
  const [mobileStep, setMobileStep] = useState<'tipo'|'conta'|'extrato'>('extrato')

  const [mobileDiaForm, setMobileDiaForm] = useState<number|null>(null)
  const [mobileCartaoId, setMobileCartaoId] = useState<string|null>(null)


  const hojeRef = useRef<HTMLDivElement>(null)
  const categoriaSelectRef = useRef<HTMLSelectElement>(null)
  const valorInputRef = useRef<HTMLInputElement>(null)
  const { contas, categorias, extratoData, updateExtratoMes, planos, planosReal, faturaData, user, sairDaConta } = useApp()

  // Valor planejado (previsto) para uma categoria no mês/ano atual
  // Prefere planosReal (Atualizado) quando disponível
  function valorPrevistoCat(catId: string, catNome: string, tipoLanc: TipoLanc): number {
    const planoAno = (planosReal[ano] ?? planos[ano]) as typeof planos[number] | undefined
    if (!planoAno) return 0
    const lista = tipoLanc === 'entrada' ? planoAno.entradas : planoAno.saidas
    // Busca por ID primeiro; só cai em nome para entradas do plano sem ID (dados legados)
    const found = catId
      ? (lista.find(c => c.id === catId) ?? lista.find(c => !c.id && c.nome === catNome))
      : lista.find(c => c.nome === catNome)
    return found?.v[mes] ?? 0
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
      // Sem conta específica: some se já consolidada em outro banco no mesmo mês
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
        // Débito automático: só aparece no banco vinculado
        if (c.contaPagamentoId !== contaIdEfetivo) return
      } else {
        // Outras formas: aparece em todos os bancos, mas some se já paga em outro
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
  const fixas = [...fixasCategoria, ...fixasCartao]
  const categoriasVariaveis = categorias
    .filter(c => c.ativa && c.tipo === fTipo && (isDinheiro ? c.formaPagamento !== 'automatico' : true))
    .sort((a,b) => a.nome.localeCompare(b.nome,'pt-BR'))
  // Para o select: deduplica por nome (exibe cada nome só uma vez)
  const categoriasSelect = categoriasVariaveis.filter((c, idx, arr) =>
    arr.findIndex(x => x.nome === c.nome) === idx
  )
  // Subcategorias disponíveis para a categoria selecionada (quando há duplicatas com descrição)
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

  // Sidebar desktop → ?tipo= param troca a aba
  useEffect(() => {
    if (isMobile) return
    const tipo = new URLSearchParams(location.search).get('tipo') as typeof tabPrincipal | null
    if (!tipo || tipo === tabPrincipal) return
    setTabPrincipal(tipo)
    if (tipo === 'extrato') {
      const p = contasExtrato.find(c => c.preferida)
      setContaId((p ?? contasExtrato[0])?.id ?? '')
    }
    navigate(location.pathname, { replace: true })
  }, [location.search]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tabPrincipal === 'dinheiro') {
      const k = mesKey('dinheiro', ano, mes)
      if (dados[k]?.saldoBancoData === hojeStr) return
      setModalSaldoValor(dados[k]?.saldoBanco ?? '')
      setModalSaldo({contaId:'dinheiro', banco:'Dinheiro', icone:'💵', cor:'#16a34a', key:k})
      return
    }
    if (tabPrincipal !== 'extrato') return
    const conta = contasExtrato.find(c => c.id === contaId) ?? contasExtrato[0]
    if (!conta) return
    const k = mesKey(conta.id, ano, mes)
    if (dados[k]?.saldoBancoData === hojeStr) return
    setModalSaldoValor(dados[k]?.saldoBanco ?? '')
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
      // Encontra conta espelho: mesmo dia, tipo oposto, mesmo valor, forma transferência
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

  // Carry-over: saldoInicial + tudo realizado de meses anteriores
  const saldoBase = useMemo(() => {
    let acc = SALDO_INICIAL
    for (const [k, dadosK] of Object.entries(dados)) {
      if (!k.startsWith(`${contaIdEfetivo}-`)) continue
      const sufixo = k.slice(-7)                    // "YYYY-MM"
      const ky = parseInt(sufixo.slice(0, 4))
      const km = parseInt(sufixo.slice(5, 7)) - 1
      if (isNaN(ky) || isNaN(km)) continue
      if (ky > ano || (ky === ano && km >= mes)) continue
      // lançamentos variáveis
      for (const itens of Object.values(dadosK.lancamentos ?? {}))
        for (const item of itens)
          acc += item.tipo === 'entrada' ? item.valor : -item.valor
      // fixas confirmadas
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
            // passado/hoje: só fixas confirmadas entram no saldo acumulado
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
        .filter(f => {
          return dadosMesAtual?.fixasConsolidadas?.[f.id] === true
        })
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
    // Verificar se a categoria ultrapassou o planejado (apenas saídas)
    if (fTipo === 'saida' && fCat && !editandoId) {
      const previsto = valorPrevistoPorNome(fCat, 'saida')
      if (previsto > 0) {
        const totalExistente = Object.values(mesDados.lancamentos)
          .flat()
          .filter(l => l.categoria === fCat && l.tipo === 'saida')
          .reduce((s, l) => s + l.valor, 0)
        const totalNovo = totalExistente + valor
        if (totalNovo > previsto) {
          setAlertaDesvio({ catNome: fCat, totalGasto: totalNovo, previsto })
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
    toast('Lançamento registrado')
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

  function BadgePag({ fp }: { fp: FormaPag }) {
    const map: Record<FormaPag,{bg:string;cor:string;label:string}> = {
      debito:        {bg:'#fef9c3',cor:'#92400e', label:'Débito'},
      automatico:    {bg:'#fef9c3',cor:'#92400e', label:'Débito Automático'},
      credito:       {bg:'#eff6ff',cor:'#1a56db', label:'Crédito'},
      pix:           {bg:'#d1fae5',cor:'#065f46', label:'PIX'},
      transferencia: {bg:'#e0f2fe',cor:'#0369a1', label:'Transferência'},
      dinheiro:      {bg:'#f1f5f9',cor:'#475569', label:'Dinheiro'},
      boleto:        {bg:'#fce7f3',cor:'#9d174d', label:'Boleto'},
      manual:        {bg:'#ede9fe',cor:'#6d28d9', label:'Manual'},
    }
    const s = map[fp]
    if (!s) return null
    return <span style={{fontSize:9,padding:'1px 5px',borderRadius:3,fontWeight:700,background:s.bg,color:s.cor}}>{s.label}</span>
  }

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',
      background:COR.fundo,fontFamily:"-apple-system,'Inter',sans-serif",overflow:'hidden'}}>
      <style>{`
        @keyframes rowSaved {
          0%   { box-shadow: 0 0 0 3px rgba(26,86,219,0.35), inset 0 0 0 9999px rgba(219,234,254,0.5); }
          100% { box-shadow: none; }
        }
      `}</style>

      {isMobile ? (
        <div style={{background:`linear-gradient(135deg,${COR.azulEscuro},${COR.azulMedio})`,
          padding:'16px 20px 0',flexShrink:0}}>
          {/* Logo + avatar */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:28,height:28,borderRadius:8,background:'rgba(255,255,255,.15)',
                border:'1px solid rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="1.5"/>
                  <polygon points="10,3 11.2,9.4 10,8.5 8.8,9.4" fill="white"/>
                  <polygon points="10,17 8.8,10.6 10,11.5 11.2,10.6" fill="white" opacity=".5"/>
                </svg>
              </div>
              <span style={{color:'#fff',fontWeight:700,fontSize:15}}>
                Compass <span style={{fontWeight:300,opacity:.75}}>One</span>
              </span>
            </div>
            <button onClick={sairDaConta} title="Sair"
              style={{width:32,height:32,borderRadius:'50%',background:'rgba(255,255,255,.2)',
                border:'none',cursor:'pointer',display:'flex',alignItems:'center',
                justifyContent:'center',color:'#fff',fontSize:13,fontWeight:700}}>
              {user?.email?.charAt(0).toUpperCase() ?? 'U'}
            </button>
          </div>
          {/* Tipo tabs */}
          <div style={{display:'flex',gap:6,overflowX:'auto',scrollbarWidth:'none' as never}}>
            {([
              {v:'extrato'     as const, icon:'🏦', label:'Extrato'},
              {v:'cartao'      as const, icon:'💳', label:'Cartão'},
              {v:'dinheiro'    as const, icon:'💵', label:'Dinheiro'},
              {v:'consolidado' as const, icon:'📊', label:'Total'},
            ]).map(({v,icon,label}) => {
              const ativo = tabPrincipal === v
              return (
                <button key={v} onClick={() => {
                  setTabPrincipal(v)
                  setMobileDiaForm(null)
                  if (v==='extrato') { const p=contasExtrato.find(c=>c.preferida); setContaId((p??contasExtrato[0])?.id??'') }
                }} style={{
                  display:'flex',flexDirection:'column',alignItems:'center',gap:4,
                  padding:'8px 16px',borderRadius:'12px 12px 0 0',
                  cursor:'pointer',whiteSpace:'nowrap',flexShrink:0,
                  border:'none',background:ativo?'rgba(255,255,255,.15)':'transparent',
                }}>
                  <span style={{fontSize:18}}>{icon}</span>
                  <span style={{fontSize:10,fontWeight:600,color:ativo?'#fff':'rgba(255,255,255,.6)'}}>{label}</span>
                  <span style={{width:4,height:4,borderRadius:'50%',background:'#fff',
                    opacity:ativo?1:0,marginTop:2}}/>
                </button>
              )
            })}
          </div>
        </div>
      ) : <AppHeader currentPath="/novo-lancamento" />}

      {/* DESKTOP: cabeçalho do tipo de lançamento ativo */}
      {!isMobile && (
        <div style={{ padding:'12px 20px', background:COR.branco, borderBottom:`1px solid ${COR.borda}`, flexShrink:0, display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:22, lineHeight:1 }}>
            {tabPrincipal==='extrato' ? '🏦' : tabPrincipal==='cartao' ? '💳' : tabPrincipal==='dinheiro' ? '💵' : '📊'}
          </span>
          <span style={{ fontSize:15, fontWeight:700, color:COR.texto }}>
            {tabPrincipal==='extrato' ? 'Extrato Bancário' : tabPrincipal==='cartao' ? 'Cartão de Crédito' : tabPrincipal==='dinheiro' ? 'Dinheiro' : 'Consolidado'}
          </span>
        </div>
      )}

      {/* ── WIZARD MOBILE: STEP TIPO ── */}
      {isMobile && mobileStep === 'tipo' && (
        <div style={{position:'fixed',top:52,left:0,right:0,bottom:60,background:COR.fundo,zIndex:50,overflowY:'auto'}}>
          <div style={{padding:'28px 16px 16px'}}>
            <h2 style={{fontSize:20,fontWeight:800,color:COR.texto,margin:0}}>O que deseja ver?</h2>
            <p style={{fontSize:13,color:COR.textoSuave,marginTop:4,marginBottom:24}}>Selecione o tipo de extrato</p>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {([
                {tipo:'extrato' as const,  icone:'🏦', label:'Banco',              desc: contasExtrato.length > 0 ? contasExtrato.slice(0,2).map(c=>c.banco).join(', ')+(contasExtrato.length>2?' ...':'') : 'Extrato bancário'},
                {tipo:'cartao' as const,   icone:'💳', label:'Cartão de Crédito',  desc:'Faturas e gastos no cartão'},
                {tipo:'dinheiro' as const, icone:'💵', label:'Dinheiro',            desc:'Lançamentos em espécie'},
                {tipo:'consolidado' as const,icone:'📊',label:'Consolidado',        desc:'Visão geral de todas as contas'},
              ] as const).map(({tipo,icone,label,desc}) => (
                <button key={tipo} onClick={() => {
                  setTabPrincipal(tipo)
                  if (tipo === 'extrato') {
                    if (contasExtrato.length === 1) {
                      const c = contasExtrato[0]; setContaId(c.id); resetarParaNovo(diaDefaultPara(mes,ano))
                      const k = mesKey(c.id,ano,mes)
                      if (dados[k]?.saldoBancoData !== hojeStr) { setModalSaldoValor(dados[k]?.saldoBanco??''); setModalSaldo({contaId:c.id,banco:c.banco,icone:c.icone,cor:c.cor,key:k}) }
                      setMobileView('extrato'); setMobileStep('extrato')
                    } else { setMobileStep('conta') }
                  } else if (tipo === 'cartao') {
                    const cartoes = contas.filter(c => c.tipo === 'cartao')
                    if (cartoes.length === 1) { setMobileCartaoId(cartoes[0].id); setMobileView('extrato'); setMobileStep('extrato') }
                    else { setMobileStep('conta') }
                  } else { setMobileView('extrato'); setMobileStep('extrato') }
                }} style={{
                  background:COR.branco,border:`1.5px solid ${COR.borda}`,borderRadius:14,
                  padding:'16px 20px',display:'flex',alignItems:'center',gap:16,
                  cursor:'pointer',fontFamily:'inherit',textAlign:'left',width:'100%',
                  boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
                }}>
                  <span style={{fontSize:32,lineHeight:1}}>{icone}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:15,fontWeight:700,color:COR.texto}}>{label}</div>
                    <div style={{fontSize:12,color:COR.textoSuave,marginTop:2}}>{desc}</div>
                  </div>
                  <span style={{fontSize:20,color:'#cbd5e1',fontWeight:300}}>›</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── WIZARD MOBILE: STEP CONTA ── */}
      {isMobile && mobileStep === 'conta' && (
        <div style={{position:'fixed',top:52,left:0,right:0,bottom:60,background:COR.fundo,zIndex:50,overflowY:'auto'}}>
          <div style={{padding:'16px 16px 0',display:'flex',alignItems:'center',gap:8,borderBottom:`1px solid ${COR.borda}`,paddingBottom:12,background:COR.branco}}>
            <button onClick={() => setMobileStep('tipo')} style={{border:'none',background:'transparent',color:COR.azul,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',padding:0}}>← Voltar</button>
            <span style={{fontSize:14,fontWeight:600,color:COR.texto}}>
              {tabPrincipal === 'cartao' ? 'Selecione o cartão' : 'Selecione o banco'}
            </span>
          </div>
          <div style={{padding:'16px',display:'flex',flexDirection:'column',gap:10}}>
            {tabPrincipal === 'cartao' ? (
              contas.filter(c => c.tipo === 'cartao').map(c => (
                <button key={c.id} onClick={() => {
                  setMobileCartaoId(c.id)
                  setMobileView('extrato'); setMobileStep('extrato')
                }} style={{
                  background:COR.branco,border:`1.5px solid ${COR.borda}`,borderRadius:14,
                  padding:'16px 20px',display:'flex',alignItems:'center',gap:14,
                  cursor:'pointer',fontFamily:'inherit',textAlign:'left',width:'100%',
                  boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
                }}>
                  <div style={{width:40,height:40,borderRadius:10,background:c.cor+'22',border:`1.5px solid ${c.cor}55`,
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{c.icone}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:15,fontWeight:700,color:COR.texto}}>{c.banco}</div>
                    {c.apelido && <div style={{fontSize:12,color:COR.textoSuave,marginTop:2}}>{c.apelido}</div>}
                  </div>
                  <span style={{fontSize:20,color:'#cbd5e1',fontWeight:300}}>›</span>
                </button>
              ))
            ) : (
              contasExtrato.map(c => (
                <button key={c.id} onClick={() => {
                  setContaId(c.id); resetarParaNovo(diaDefaultPara(mes,ano))
                  const k = mesKey(c.id,ano,mes)
                  if (dados[k]?.saldoBancoData !== hojeStr) { setModalSaldoValor(dados[k]?.saldoBanco??''); setModalSaldo({contaId:c.id,banco:c.banco,icone:c.icone,cor:c.cor,key:k}) }
                  setMobileView('extrato'); setMobileStep('extrato')
                }} style={{
                  background:COR.branco,border:`1.5px solid ${COR.borda}`,borderRadius:14,
                  padding:'16px 20px',display:'flex',alignItems:'center',gap:14,
                  cursor:'pointer',fontFamily:'inherit',textAlign:'left',width:'100%',
                  boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
                }}>
                  <div style={{width:40,height:40,borderRadius:10,background:c.cor+'22',border:`1.5px solid ${c.cor}55`,
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{c.icone}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:15,fontWeight:700,color:COR.texto}}>{c.banco}</div>
                    <div style={{fontSize:12,color:COR.textoSuave,marginTop:2}}>{c.nome}</div>
                  </div>
                  <span style={{fontSize:20,color:'#cbd5e1',fontWeight:300}}>›</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* ALERTA DE DESVIO */}
      {alertaDesvio && (
        <div style={{ background:'#fef3c7', borderBottom:'1px solid #fcd34d',
          padding:'10px 16px', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <span style={{ fontSize:15 }}>⚠️</span>
          <div style={{ flex:1, fontSize:12, color:'#92400e' }}>
            <strong>{alertaDesvio.catNome}</strong> ultrapassou o planejado:{' '}
            gasto {alertaDesvio.totalGasto.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} de{' '}
            {alertaDesvio.previsto.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} previstos.
          </div>
          <button
            onClick={() => { setAlertaDesvio(null); navigate('/planejamento', { state: { aba: 'revisao' } }) }}
            style={{ padding:'5px 12px', border:'none', borderRadius:7, cursor:'pointer',
              fontFamily:'inherit', fontSize:12, fontWeight:600,
              background:'#d97706', color:'#fff', whiteSpace:'nowrap' }}>
            Fazer revisão →
          </button>
          <button onClick={() => setAlertaDesvio(null)}
            style={{ border:'none', background:'transparent', cursor:'pointer',
              fontSize:18, color:'#92400e', lineHeight:1, padding:'0 4px' }}>
            ×
          </button>
        </div>
      )}

      {/* SUB-HEADER MOBILE: bank pills + month nav */}
      {isMobile && tabPrincipal !== 'cartao' && (
        <div style={{background:COR.branco,borderBottom:`1px solid ${COR.borda}`,flexShrink:0}}>
          {tabPrincipal === 'extrato' && contasExtrato.length > 0 && (
            <div style={{display:'flex',gap:6,padding:'10px 14px',overflowX:'auto',scrollbarWidth:'none' as never}}>
              {contasExtrato.map(c => {
                const ativo = c.id === contaIdEfetivo
                return (
                  <button key={c.id} onClick={() => {
                    setContaId(c.id)
                    const k=mesKey(c.id,ano,mes)
                    if(dados[k]?.saldoBancoData!==hojeStr){setModalSaldoValor(dados[k]?.saldoBanco??'');setModalSaldo({contaId:c.id,banco:c.banco,icone:c.icone,cor:c.cor,key:k})}
                  }} style={{
                    display:'flex',alignItems:'center',gap:5,
                    padding:'5px 12px',borderRadius:20,flexShrink:0,
                    border:`1.5px solid ${ativo?COR.azul:'#e2e8f0'}`,
                    background:ativo?'#eff6ff':'#f8faff',
                    cursor:'pointer',whiteSpace:'nowrap',
                    fontSize:11,fontWeight:500,color:ativo?COR.azul:'#64748b',
                  }}>
                    <span style={{width:7,height:7,borderRadius:'50%',background:c.cor,display:'inline-block'}}/>
                    {c.icone} {c.banco}
                  </button>
                )
              })}
            </div>
          )}
          {tabPrincipal === 'dinheiro' && (
            <div style={{padding:'10px 14px'}}>
              <span style={{fontSize:12,color:COR.azul,fontWeight:600}}>💵 Dinheiro em espécie</span>
            </div>
          )}
          {tabPrincipal === 'consolidado' && (
            <div style={{padding:'10px 14px'}}>
              <span style={{fontSize:12,color:COR.azul,fontWeight:600}}>📊 Visão consolidada</span>
            </div>
          )}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 14px 10px'}}>
            <button onClick={() => { let m=mes-1,a=ano; if(m<0){m=11;a--}; setMes(m); resetarParaNovo(diaDefaultPara(m,a)) }}
              style={{width:32,height:32,borderRadius:10,border:'none',background:'#f0f4ff',
                display:'flex',alignItems:'center',justifyContent:'center',
                cursor:'pointer',fontSize:16,color:COR.azul,fontWeight:700}}>‹</button>
            <span style={{fontSize:15,fontWeight:700,color:COR.texto}}>{NOMES_MESES[mes]} {ano}</span>
            <button onClick={() => { let m=mes+1,a=ano; if(m>11){m=0;a++}; setMes(m); resetarParaNovo(diaDefaultPara(m,a)) }}
              style={{width:32,height:32,borderRadius:10,border:'none',background:'#f0f4ff',
                display:'flex',alignItems:'center',justifyContent:'center',
                cursor:'pointer',fontSize:16,color:COR.azul,fontWeight:700}}>›</button>
          </div>
        </div>
      )}

      {/* SALDO CARD — mobile only (extrato/dinheiro) */}
      {isMobile && (tabPrincipal==='extrato'||tabPrincipal==='dinheiro') && (
        <div style={{margin:'0 14px 10px',borderRadius:14,overflow:'hidden',
          boxShadow:'0 2px 12px rgba(0,0,0,.07)',flexShrink:0}}>
          {/* Banco (extrato) */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
            padding:'10px 14px',background:COR.branco,borderBottom:`1px solid #f0f4ff`}}
            onClick={e=>{e.stopPropagation();setModalSaldoValor(mesDados.saldoBanco??'');
              isDinheiro
                ?setModalSaldo({contaId:'dinheiro',banco:'Dinheiro',icone:'💵',cor:COR.verde,key})
                :setModalSaldo({contaId:contaIdEfetivo,banco:contaInfo?.banco??'',icone:contaInfo?.icone??'',cor:contaInfo?.cor??COR.azul,key})
            }}>
            <span style={{fontSize:11,color:COR.textoSuave,fontWeight:500,display:'flex',alignItems:'center',gap:5}}>
              💰 {isDinheiro?'Dinheiro':(contaInfo?.banco??'Banco')} (extrato)
            </span>
            <span style={{fontSize:13,fontWeight:700,cursor:'pointer',
              color:mesDados.saldoBanco?COR.texto:'#94a3b8'}}>
              {mesDados.saldoBanco || <span style={{fontSize:11,fontStyle:'italic'}}>Informar ✎</span>}
            </span>
          </div>
          {/* Sistema */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
            padding:'10px 14px',background:COR.branco,borderBottom:`1px solid #f0f4ff`}}>
            <span style={{fontSize:11,color:COR.textoSuave,fontWeight:500,display:'flex',alignItems:'center',gap:5}}>
              📱 Sistema
            </span>
            <span style={{fontSize:13,fontWeight:700,color:COR.azul}}>{fmt(saldoMes)}</span>
          </div>
          {/* Diferença */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
            padding:'10px 14px',
            background:diferenca===null?COR.branco:conciliado?'#f0fdf4':'#fff1f2'}}>
            <span style={{fontSize:11,fontWeight:500,display:'flex',alignItems:'center',gap:5,
              color:diferenca===null?COR.textoSuave:conciliado?'#166534':'#991b1b'}}>
              {diferenca===null?'⚖':conciliado?'✓':'⚠'} Diferença
            </span>
            <span style={{fontSize:13,fontWeight:700,
              color:diferenca===null?COR.textoSuave:conciliado?'#166534':'#991b1b'}}>
              {diferenca===null?'—':conciliado?'✓ Conciliado':`${diferenca>0?'+':'-'}${fmt(Math.abs(diferenca))}`}
            </span>
          </div>
        </div>
      )}


      {/* DESKTOP: tab selector removido — navegação via sidebar */}

      {tabPrincipal==='cartao' ? <FaturaCartao mobileSelecionado={mobileCartaoId ?? undefined} onVoltar={() => setMobileStep('tipo')} /> :
       tabPrincipal==='consolidado' ? (
      <div style={{flex:1,display:'flex',flexDirection:isMobile?'column':'row',
        gap:isMobile?0:16,padding:isMobile?0:'10px 16px',
        overflow:isMobile?'auto':'hidden'}}>
        <div style={{flex:1,display:isMobile&&mobileView==='form'?'none':'flex',
          flexDirection:'column',overflow:'hidden'}}>
          <ExtratoConsolidado mesProp={isMobile ? mes : undefined} onMesProp={isMobile ? setMes : undefined} />
        </div>
        {/* PAINEL DE LANÇAMENTO — consolidado */}
        <div style={{width:isMobile?'100%':340,flexShrink:0,background:COR.branco,
          border:isMobile?'none':`1px solid ${COR.borda}`,
          borderRadius:isMobile?0:12,padding:isMobile?'16px 12px':20,overflowY:'auto',
          display:isMobile&&mobileView==='extrato'?'none':'block'}}>
          {isMobile && (
            <button onClick={() => { setMobileView('extrato'); resetarParaNovo(diaSel) }} style={{
              border:'none',background:'transparent',cursor:'pointer',
              fontSize:13,fontWeight:600,color:COR.azul,fontFamily:'inherit',
              padding:'0 0 12px 0',display:'block'}}>← Voltar</button>
          )}
          <h3 style={{fontSize:14,fontWeight:700,color:COR.texto,margin:'0 0 14px'}}>Novo lançamento</h3>

          {/* Banco */}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:4}}>Banco *</div>
            <select value={fBancoConsolidado} onChange={e=>setFBancoConsolidado(e.target.value)}
              onFocus={realcarFoco} onBlur={removerRealce}
              style={{border:`1.5px solid #bae6fd`,borderRadius:7,padding:'7px 10px',
                fontSize:12,outline:'none',background:'#fff',
                fontFamily:'inherit',color:COR.texto,width:'100%'}}>
              <option value="">Selecione o banco...</option>
              {contasExtrato.map(c=>(
                <option key={c.id} value={c.id}>{c.icone} {c.banco} — {c.nome}</option>
              ))}
            </select>
          </div>

          {/* Dia */}
          <div style={{display:'flex',alignItems:'flex-end',gap:8,marginBottom:14}}>
            <div style={{flex:'0 0 64px'}}>
              <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:4}}>Dia</div>
              <input type="number" min={1} max={totalDias} value={diaSel}
                onChange={e=>setDiaSel(Math.min(Math.max(parseInt(e.target.value)||1,1),totalDias))}
                onFocus={realcarFoco} onBlur={removerRealce}
                style={{border:'1.5px solid #bae6fd',borderRadius:7,padding:'7px 10px',
                  fontSize:12,outline:'none',background:'#fff',
                  fontFamily:'inherit',color:COR.texto,width:'100%',textAlign:'center'}}/>
            </div>
            <div style={{fontSize:11,color:'#94a3b8',paddingBottom:8}}>
              {NOMES_MESES[mes]} · {diaSemana(diaSel,mes,ano)}
            </div>
          </div>

          {/* Entrada/Saída */}
          <div style={{display:'flex',background:'#e0f2fe',borderRadius:7,
            padding:3,marginBottom:10,width:'fit-content'}}>
            {(['saida','entrada'] as const).map(t=>(
              <button key={t} onClick={()=>{
                setFTipo(t)
                setFPag(t==='entrada'?'pix':'debito')
              }} style={{
                padding:'5px 14px',border:'none',borderRadius:5,cursor:'pointer',
                fontSize:12,fontWeight:500,fontFamily:'inherit',
                background:fTipo===t?COR.branco:'transparent',
                color:fTipo===t?(t==='entrada'?COR.azul:COR.vermelho):'#0369a1',
                boxShadow:fTipo===t?'0 1px 2px rgba(0,0,0,.08)':'none'}}>
                {t==='entrada'?'↑ Entrada':'↓ Saída'}
              </button>
            ))}
          </div>

          {/* Forma de pagamento */}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:6}}>
              {fTipo==='entrada'?'Forma de recebimento:':'Forma de pagamento:'}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
              {(fTipo==='entrada'
                ? FORMAS_ENT.filter(p=>p.id!=='transferencia'&&p.id!=='dinheiro')
                : FORMAS_SAI.filter(p=>p.id!=='transferencia'&&p.id!=='dinheiro')
              ).map(p=>(
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
          </div>

          {/* Categoria + Valor + Descrição */}
          <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:10}}>
            <div>
              <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:4}}>Categoria</div>
              <select ref={categoriaSelectRef} value={fCat}
                onChange={e=>{
                  const nome=e.target.value; setFCat(nome); setFSubDesc('')
                  const cat=categorias.find(c=>c.nome===nome)
                  if (cat) setFPag(fTipo==='entrada'
                    ?formaRecebCategoria(cat.formaPagamento,cat.tipoMovimento)
                    :formaPagCategoria(cat.formaPagamento,cat.tipoMovimento))
                  if (nome) setTimeout(() => valorInputRef.current?.focus(), 50)
                }}
                onFocus={realcarFoco} onBlur={removerRealce}
                style={{border:`1.5px solid #bae6fd`,borderRadius:7,padding:'7px 10px',
                  fontSize:12,outline:'none',background:'#fff',
                  fontFamily:'inherit',color:COR.texto,width:'100%'}}>
                <option value="">Selecione...</option>
                {categoriasSelect.map(c=>(
                  <option key={c.id} value={c.nome}>{c.nome}</option>
                ))}
              </select>
              {/* Chips de sub-descrição quando categoria tem múltiplas variantes */}
              {subDescsDisponiveis.length > 1 && (
                <div style={{marginTop:6}}>
                  <div style={{fontSize:9,color:'#0369a1',fontWeight:600,
                    textTransform:'uppercase',letterSpacing:.4,marginBottom:4}}>
                    Qual variante?
                  </div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                    {subDescsDisponiveis.map(desc => (
                      <button key={desc} type="button"
                        onClick={() => setFSubDesc(desc === fSubDesc ? '' : desc)}
                        style={{
                          padding:'4px 10px',borderRadius:20,fontSize:11,fontWeight:600,
                          border:`1.5px solid ${fSubDesc===desc?'#1a56db':'#bae6fd'}`,
                          background:fSubDesc===desc?'#1a56db':'#eff6ff',
                          color:fSubDesc===desc?'#fff':'#1a56db',
                          cursor:'pointer',fontFamily:'inherit',
                        }}>
                        {desc}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div>
              <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:4}}>Valor *</div>
              <input ref={valorInputRef} value={fValor} onChange={e=>setFValor(e.target.value)}
                placeholder="R$ 0,00" onFocus={realcarFoco} onBlur={removerRealce}
                style={{border:`1.5px solid #bae6fd`,borderRadius:7,padding:'7px 10px',
                  fontSize:12,outline:'none',background:'#fff',
                  fontFamily:'inherit',color:COR.texto,width:'100%'}}
                onKeyDown={e=>e.key==='Enter'&&lancarConsolidado()}/>
            </div>
            <div>
              <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:4}}>Descrição</div>
              <input value={fDesc} onChange={e=>setFDesc(e.target.value)}
                placeholder="Ex: Mercado Extra, Farmácia..."
                onFocus={realcarFoco} onBlur={removerRealce}
                style={{border:`1.5px solid #bae6fd`,borderRadius:7,padding:'7px 10px',
                  fontSize:12,outline:'none',background:'#fff',
                  fontFamily:'inherit',color:COR.texto,width:'100%'}}
                onKeyDown={e=>e.key==='Enter'&&lancarConsolidado()}/>
            </div>
          </div>

          <div style={{fontSize:10,color:'#94a3b8',marginBottom:14}}>
            Enter no valor ou na descrição para salvar
          </div>
          <button onClick={lancarConsolidado} style={{
            width:'100%',padding:'10px 0',border:'none',borderRadius:8,
            background:`linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,
            color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
            Lançar
          </button>
        </div>
      </div>
      ) : (
      <>
      {tabPrincipal === 'extrato' && (
      isMobile ? null : (
        <div style={{background:COR.branco,borderBottom:`1px solid ${COR.borda}`,
          padding:'10px 16px 0',flexShrink:0,display:'flex',gap:3,overflowX:'auto'}}>
          {contasExtrato.map(c => {
            const ativa = c.id===contaId
            return (
              <button key={c.id} onClick={() => {
                setContaId(c.id); resetarParaNovo(diaDefaultPara(mes,ano))
                const k = mesKey(c.id,ano,mes)
                if (dados[k]?.saldoBancoData !== hojeStr) {
                  setModalSaldoValor(dados[k]?.saldoBanco ?? '')
                  setModalSaldo({contaId:c.id,banco:c.banco,icone:c.icone,cor:c.cor,key:k})
                }
              }} style={{
                display:'flex',alignItems:'center',gap:6,
                padding:'7px 14px',borderRadius:'8px 8px 0 0',
                border:`1px solid ${ativa?COR.azul:COR.borda}`,
                cursor:'pointer',fontSize:12,fontWeight:ativa?700:500,fontFamily:'inherit',whiteSpace:'nowrap',
                background:ativa?COR.azul:'#f8faff',color:ativa?'#fff':COR.textoSuave,
                position:'relative',zIndex:ativa?1:0}}>
                <div style={{width:7,height:7,borderRadius:'50%',background:ativa?'#fff':c.cor}}/>
                {c.icone} {c.banco}
                <span style={{fontSize:9,color:ativa?'rgba(255,255,255,0.8)':'#94a3b8',fontWeight:400,marginLeft:2}}>{c.nome}</span>
              </button>
            )
          })}
        </div>
      )
      )}
      <div style={{flex:1,display:'flex',flexDirection: isMobile ? 'column' : 'row',gap: isMobile ? 0 : 16,padding: isMobile ? 0 : '0 16px 10px',overflow: isMobile ? 'auto' : 'hidden', paddingBottom: isMobile ? 120 : 0}}>
      <div style={{flex:1,display: isMobile && mobileView==='form' ? 'none' : 'flex',flexDirection:'column',overflow: isMobile ? 'visible' : 'hidden'}}>


      {/* BARRA DE SALDO — desktop only (mobile fica no sticky acima) */}
      {!isMobile && <div style={{background:COR.branco,borderBottom:`2px solid ${COR.borda}`,
        padding:'10px 0',flexShrink:0,
        display:'flex',flexDirection:'row',
        alignItems:'center',gap:14,flexWrap:'wrap'}}>

        {isDinheiro ? (<>
          <div style={{display:'flex',alignItems:'center',gap:5}}>
            <span style={{fontSize:11,color:COR.textoSuave}}>Saldo dinheiro atual:</span>
            <span
              onClick={() => { setModalSaldoValor(mesDados.saldoBanco ?? ''); setModalSaldo({contaId:'dinheiro',banco:'Dinheiro',icone:'💵',cor:'#16a34a',key}) }}
              style={{display:'inline-flex',alignItems:'center',gap:5,
                fontSize:12,fontWeight:600,cursor:'pointer',
                padding:'3px 8px',borderRadius:6,
                border: mesDados.saldoBanco ? '1.5px solid #16a34a' : '1.5px dashed #e2e8f0',
                color: mesDados.saldoBanco ? '#16a34a' : '#64748b',
                background: mesDados.saldoBanco ? '#16a34a18' : '#f8faff'}}>
              <span style={{fontSize:11}}>✎</span>
              {mesDados.saldoBanco || 'Informar'}
            </span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{fontSize:13,color:COR.textoSuave,fontWeight:500}}>Diferença:</span>
            <div style={{padding:'5px 12px',borderRadius:7,fontSize:12,fontWeight:600,
              background:diferenca===null?'#f1f5f9':conciliado?'#dcfce7':'#fee2e2',
              color:diferenca===null?COR.textoSuave:conciliado?'#166534':'#991b1b',
              border:`1px solid ${diferenca===null?COR.borda:conciliado?'#86efac':'#fca5a5'}`,
              minWidth:isMobile?80:110,textAlign:'center'}}>
              {diferenca===null?'':conciliado?'✓ Conciliado':`${diferenca>0?'+':'-'}${fmt(Math.abs(diferenca))}`}
            </div>
          </div>
        </>) : (<>
          {/* Banco */}
          <div style={{display:'flex',alignItems:'center',gap:5}}>
            <span style={{fontSize:11,color:COR.textoSuave}}>Saldo atual banco:</span>
            <span
              onClick={() => { setModalSaldoValor(mesDados.saldoBanco ?? ''); setModalSaldo({contaId:contaIdEfetivo, banco:contaInfo?.banco??'', icone:contaInfo?.icone??'', cor:contaInfo?.cor??COR.azul, key}) }}
              style={{display:'inline-flex',alignItems:'center',gap:5,
                fontSize:12,fontWeight:600,cursor:'pointer',
                padding:'3px 8px',borderRadius:6,
                border: mesDados.saldoBanco
                  ? `1.5px solid ${contaInfo?.cor ?? COR.azul}`
                  : '1.5px dashed #e2e8f0',
                color: mesDados.saldoBanco ? (contaInfo?.cor ?? COR.azul) : '#64748b',
                background: mesDados.saldoBanco ? `${contaInfo?.cor ?? COR.azul}18` : '#f8faff'}}>
              <span style={{fontSize:11}}>✎</span>
              {mesDados.saldoBanco || 'Informar'}
            </span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{fontSize:13,color:COR.textoSuave,fontWeight:500}}>Diferença:</span>
            <div style={{padding:'5px 12px',borderRadius:7,fontSize:12,fontWeight:600,
              background:diferenca===null?'#f1f5f9':conciliado?'#dcfce7':'#fee2e2',
              color:diferenca===null?COR.textoSuave:conciliado?'#166534':'#991b1b',
              border:`1px solid ${diferenca===null?COR.borda:conciliado?'#86efac':'#fca5a5'}`,
              minWidth:isMobile?80:110,textAlign:'center'}}>
              {diferenca===null?'':conciliado?'✓ Conciliado':`${diferenca>0?'+':'-'}${fmt(Math.abs(diferenca))}`}
            </div>
          </div>
        </>)}
      </div>}


      {/* Barra saldo inicial — web only */}
      {!isMobile && (
        <div style={{borderRadius:12,padding:'10px 16px',flexShrink:0,margin:'8px 0 0',position:'relative',
          background:saldoBase<0?'linear-gradient(135deg,#7f1d1d,#dc2626)':`linear-gradient(135deg,${COR.azulEscuro},${COR.azulMedio})`,
          display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          {/* Setas + label clicável */}
          <div style={{display:'flex',alignItems:'center',gap:4}}>
            <button onClick={() => {
              let m=mes-1, a=ano
              if (m<0) { m=11; a-- }
              setMes(m); setAno(a); resetarParaNovo(diaDefaultPara(m,a))
            }} style={{border:'none',background:'rgba(255,255,255,.15)',color:'#fff',
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
              Saldo inicial — {NOMES_MESES[mes]} {ano}
            </button>
            <button onClick={() => {
              let m=mes+1, a=ano
              if (m>11) { m=0; a++ }
              setMes(m); setAno(a); resetarParaNovo(diaDefaultPara(m,a))
            }} style={{border:'none',background:'rgba(255,255,255,.15)',color:'#fff',
              borderRadius:6,padding:'3px 10px',fontSize:16,cursor:'pointer',fontFamily:'inherit',lineHeight:1}}>›</button>
          </div>
          {/* Valor — imutável */}
          <span style={{fontSize:18,fontWeight:700,color:'#fff',fontVariantNumeric:'tabular-nums'}}>
            {fmt(saldoBase)}
          </span>
          {/* Calendário popup */}
          {mostrarCalendario && (
            <div style={{position:'fixed',top:calPos.top,left:calPos.left,zIndex:200,
              background:'#fff',borderRadius:14,boxShadow:'0 8px 32px rgba(0,0,0,.18)',
              padding:16,minWidth:272}} onClick={e=>e.stopPropagation()}>
              {/* Seletor de ano */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <button onClick={()=>setAnoCalendario(a=>a-1)}
                  style={{border:'none',background:'#eff6ff',color:COR.azul,borderRadius:6,
                    padding:'4px 12px',fontSize:16,cursor:'pointer',fontFamily:'inherit'}}>‹</button>
                <span style={{fontWeight:700,fontSize:15,color:COR.texto}}>{anoCalendario}</span>
                <button onClick={()=>setAnoCalendario(a=>a+1)}
                  style={{border:'none',background:'#eff6ff',color:COR.azul,borderRadius:6,
                    padding:'4px 12px',fontSize:16,cursor:'pointer',fontFamily:'inherit'}}>›</button>
              </div>
              {/* Grid 4×3 meses */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
                {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((abrev,i) => {
                  const ativo = i===mes && anoCalendario===ano
                  return (
                    <button key={i} onClick={() => {
                      setMes(i); setAno(anoCalendario)
                      resetarParaNovo(diaDefaultPara(i,anoCalendario))
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
      )}

      {/* EXTRATO */}
      <div style={{flex:1,overflowY:'auto',
        display:'flex',flexDirection:'column',gap:6,paddingTop:10}}>

        {Array.from({length:totalDias},(_,i)=>i+1).map(dia => {
          const ehHoje    = eMesAtual && dia===diaHoje
          const passado   = eMesAtual ? dia<diaHoje : ano<anoHoje||(ano===anoHoje&&mes<mesHoje)
          const semana    = diaSemana(dia, mes, ano)
          const fs        = fixas.filter(f=>diaEfetivoFixa(f,mesDados.fixasMovidas,ehAutomatico(f),mes,ano,totalDias)===dia)
          const lsRaw     = mesDados.lancamentos[dia] ?? []
          const ls        = lsRaw
          const temItens  = fs.length>0 || ls.length>0
          const saldoIni  = dia===1 ? saldoBase : (saldosDia[dia-1] ?? saldoBase)
          const diaFuturo = !passado && !ehHoje
          // Valor exibido: projeção total (todos os itens do dia)
          const entradasDia = fs.filter(f=>f.tipo==='entrada')
            .reduce((s,f)=>{const conf=mesDados.fixasConsolidadas?.[f.id]!==undefined?mesDados.fixasConsolidadas[f.id]:(ehAutomatico(f)&&!eMesAtual&&passado);return s+(conf?(mesDados.fixasValorOverride?.[f.id]??f.valor):f.valor)},0)
            + ls.filter(l=>l.tipo==='entrada').reduce((s,l)=>s+l.valor,0)
          const saidasDia = fs.filter(f=>f.tipo==='saida')
            .reduce((s,f)=>{const conf=mesDados.fixasConsolidadas?.[f.id]!==undefined?mesDados.fixasConsolidadas[f.id]:(ehAutomatico(f)&&!eMesAtual&&passado);return s+(conf?(mesDados.fixasValorOverride?.[f.id]??f.valor):f.valor)},0)
            + ls.filter(l=>l.tipo==='saida').reduce((s,l)=>s+l.valor,0)
          // Confirmados: fixas consolidadas (ou automáticas em dia passado) + lancamentos manuais
          const entradasConf =
            fs.filter(f => f.tipo==='entrada' && (
              mesDados.fixasConsolidadas?.[f.id] !== undefined
                ? mesDados.fixasConsolidadas[f.id]
                : (ehAutomatico(f) && !eMesAtual && passado)
            ))
            .reduce((s,f) => s + (mesDados.fixasValorOverride?.[f.id] ?? f.valor), 0)
            + ls.filter(l => l.tipo==='entrada').reduce((s,l) => s + l.valor, 0)
          const saidasConf =
            fs.filter(f => f.tipo==='saida' && (
              mesDados.fixasConsolidadas?.[f.id] !== undefined
                ? mesDados.fixasConsolidadas[f.id]
                : (ehAutomatico(f) && !eMesAtual && passado)
            ))
            .reduce((s,f) => s + (mesDados.fixasValorOverride?.[f.id] ?? f.valor), 0)
            + ls.filter(l => l.tipo==='saida').reduce((s,l) => s + l.valor, 0)
          const temConf = entradasConf > 0 || saidasConf > 0
          const entradasBoxVal = temConf ? entradasConf : entradasDia
          const saidasBoxVal   = temConf ? saidasConf   : saidasDia
          // Futuro: projeção total. Hoje/passado: só confirmados
          const saldoDia = diaFuturo
            ? saldosDia[dia] ?? saldoIni
            : saldoIni + entradasConf - saidasConf
          const selecionado = diaSel===dia
          const aberto    = diasAbertos.has(dia)
          const corSaldo  = saldoDia<0 ? COR.vermelho : COR.verde

          return (
            <div key={dia}
              ref={ehHoje ? hojeRef : undefined}
              onClick={() => { setMobileDiaForm(null); toggleDia(dia); if(!isMobile) resetarParaNovo(dia); else setDiaSel(dia) }}
              style={{borderRadius:12,overflow:'hidden',flexShrink:0,cursor:'pointer',
                position:'relative',zIndex:selecionado?7:6,
                border:`1.5px solid ${selecionado?COR.azul:ehHoje?'#93c5fd':COR.borda}`,
                background:COR.branco,
                boxShadow:selecionado?`0 0 0 3px rgba(26,86,219,0.12)`:
                  ehHoje?`0 0 0 2px rgba(147,197,253,0.3)`:'none',
                animation: highlightDia===dia ? 'rowSaved 1.2s ease-out' : undefined,
              }}>

              {/* Cabeçalho */}
              <div style={{display:'flex',alignItems:'center',gap:12,
                padding:'10px 16px',minHeight:54,
                background:selecionado?'#eff6ff':ehHoje?'#f0f7ff':'#fafbff',
                borderBottom:aberto&&(temItens||selecionado)?`1px solid ${selecionado?'#bfdbfe':COR.borda}`:'none'}}>

                <div style={{display:'flex',flexDirection:'column',
                  alignItems:'center',minWidth:32,flexShrink:0}}>
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

                {/* Boxes: mobile → Inicial|Movimentação|Final  desktop → Entradas|Saídas|Final */}
                <div style={{flex:1,display:'flex',alignItems:'center',
                  justifyContent:'flex-end',gap:isMobile?4:6}}>
                  {isMobile ? (<>
                    {/* Inicial */}
                    <div style={{display:'flex',flexDirection:'column',alignItems:'center',
                      padding:'5px 8px',borderRadius:9,flex:1,
                      background:'#f8faff',border:`1px solid ${COR.borda}`}}>
                      <span style={{fontSize:8,fontWeight:700,textTransform:'uppercase',
                        letterSpacing:.4,marginBottom:2,color:'#94a3b8'}}>Inicial</span>
                      <span style={{fontSize:11,fontWeight:700,color:'#64748b',letterSpacing:'-.3px'}}>
                        {fmt(saldoIni).replace('R$ ','R$ ')}
                      </span>
                    </div>
                    {/* Movimentação */}
                    {(() => {
                      const mov = diaFuturo ? (entradasDia - saidasDia) : (entradasConf - saidasConf)
                      const pos = mov > 0; const neg = mov < 0
                      return (
                        <div style={{display:'flex',flexDirection:'column',alignItems:'center',
                          padding:'5px 8px',borderRadius:9,flex:1,
                          background:pos?'#f0fdf4':neg?'#fff1f2':'#f8faff',
                          border:`1px solid ${pos?'#bbf7d0':neg?'#fecdd3':COR.borda}`}}>
                          <span style={{fontSize:8,fontWeight:700,textTransform:'uppercase',
                            letterSpacing:.4,marginBottom:2,
                            color:pos?COR.verde:neg?COR.vermelho:'#94a3b8'}}>Mov.</span>
                          <span style={{fontSize:11,fontWeight:700,letterSpacing:'-.3px',
                            color:pos?COR.verde:neg?COR.vermelho:'#94a3b8'}}>
                            {mov===0?'—':`${mov>0?'+':'-'}${fmt(Math.abs(mov)).replace('R$ ','R$ ')}`}
                          </span>
                        </div>
                      )
                    })()}
                    {/* Final */}
                    <div style={{display:'flex',flexDirection:'column',alignItems:'center',
                      padding:'5px 8px',borderRadius:9,flex:1,
                      background:diaFuturo?'#f8faff':ehHoje?'#eff6ff':saldoDia<0?'#fff1f2':'#f0fdf4',
                      border:`1px solid ${diaFuturo?COR.borda:ehHoje?'#bfdbfe':saldoDia<0?'#fecdd3':'#bbf7d0'}`}}>
                      <span style={{fontSize:8,fontWeight:700,textTransform:'uppercase',
                        letterSpacing:.4,marginBottom:2,
                        color:diaFuturo?'#94a3b8':ehHoje?COR.azul:corSaldo}}>
                        {diaFuturo?'Prev.':ehHoje?'Atual':'Final'}
                      </span>
                      <span style={{fontSize:11,fontWeight:700,letterSpacing:'-.3px',
                        color:diaFuturo?'#64748b':ehHoje?COR.azul:corSaldo}}>
                        {fmt(saldoDia).replace('R$ ','R$ ')}
                      </span>
                    </div>
                  </>) : (<>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'center',
                      padding:'5px 10px',borderRadius:8,minWidth:150,
                      background:entradasConf>0?'#eff6ff':'#f8faff',
                      border:`1px solid ${entradasConf>0?'#bfdbfe':COR.borda}`}}>
                      <span style={{fontSize:10,fontWeight:600,textTransform:'uppercase',
                        letterSpacing:.4,marginBottom:1,
                        color:entradasConf>0?COR.azul:'#94a3b8'}}>Entradas</span>
                      <span style={{fontSize:13,fontWeight:700,color:entradasConf>0?COR.azul:'#94a3b8'}}>
                        {entradasBoxVal===0?'—':`+${fmt(entradasBoxVal)}`}
                      </span>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'center',
                      padding:'5px 10px',borderRadius:8,minWidth:150,
                      background:saidasConf>0?'#fff1f2':'#f8faff',
                      border:`1px solid ${saidasConf>0?'#fecdd3':COR.borda}`}}>
                      <span style={{fontSize:10,fontWeight:600,textTransform:'uppercase',
                        letterSpacing:.4,marginBottom:1,
                        color:saidasConf>0?COR.vermelho:'#94a3b8'}}>Saídas</span>
                      <span style={{fontSize:13,fontWeight:700,color:saidasConf>0?COR.vermelho:'#94a3b8'}}>
                        {saidasBoxVal===0?'—':`-${fmt(saidasBoxVal)}`}
                      </span>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'center',
                      padding:'5px 10px',borderRadius:8,minWidth:150,
                      background:diaFuturo?'#f8faff':saldoDia<0?'#fff1f2':'#f0fdf4',
                      border:`1px solid ${diaFuturo?COR.borda:saldoDia<0?'#fecdd3':'#bbf7d0'}`}}>
                      <span style={{fontSize:10,fontWeight:600,textTransform:'uppercase',
                        letterSpacing:.4,marginBottom:1,
                        color:diaFuturo?'#94a3b8':corSaldo}}>
                        {diaFuturo?'Previsto':passado?'Final':'Atual'}
                      </span>
                      <span style={{fontSize:13,fontWeight:700,color:diaFuturo?'#64748b':corSaldo}}>
                        {fmt(saldoDia)}
                      </span>
                    </div>
                  </>)}
                </div>

                {/* Chevron */}
                <span style={{width:18,flexShrink:0,textAlign:'center',fontSize:14,
                  color:'#94a3b8',opacity:temItens?1:0,userSelect:'none',
                  display:'inline-block',transition:'transform .15s',
                  transform:aberto?'rotate(180deg)':'rotate(0deg)'}}>⌄</span>
              </div>

              {/* Fixas */}
              {aberto && fs.map(f => {
                const ehFaturaFixa = f.id.startsWith('cartao-')
                const catVisual = iconeCategoria(categorias, f.categoria)
                const automatico = ehAutomatico(f)
                const consolidada = mesDados.fixasConsolidadas?.[f.id] !== undefined
                  ? mesDados.fixasConsolidadas[f.id]
                  : (automatico && !eMesAtual && passado)
                const corValor = consolidada ? (f.tipo==='entrada'?COR.azul:COR.vermelho) : '#94a3b8'
                const emEdicaoFixa = editandoFixaId === f.id
                const valorMostrado = mesDados.fixasValorOverride?.[f.id] ?? f.valor
                return (
                <div key={f.id} onClick={e => e.stopPropagation()}
                  style={{background:emEdicaoFixa?'#eff6ff':'transparent'}}>
                  <div onClick={() => editarFixa(dia, f)}
                    style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',
                    padding:'10px 16px',borderBottom:`1px solid #f1f5f9`}}>
                    <input type="checkbox" checked={consolidada}
                      onClick={e => e.stopPropagation()}
                      onChange={() => {
                        if (consolidada) {
                          desconsolidarFixa(f.id)
                        } else {
                          updateMes(prev => ({
                            ...prev,
                            fixasConsolidadas: { ...prev.fixasConsolidadas, [f.id]: true }
                          }))
                        }
                      }}
                      title="Consolidar lançamento"
                      style={{cursor:'pointer',width:15,height:15,flexShrink:0}} />
                    <div style={{width:32,height:32,borderRadius:8,flexShrink:0,
                      display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,
                      background:catVisual.cor,opacity:consolidada?1:0.5}}>
                      {catVisual.icone}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:500,
                        color:consolidada?COR.texto:'#94a3b8',
                        display:'flex',alignItems:'center',gap:5}}>
                        {ehFaturaFixa ? 'Cartão de Crédito' : f.nome}
                        <span style={{fontSize:9,padding:'1px 5px',borderRadius:3,fontWeight:600,
                          background:consolidada?'#e0f2fe':'#f1f5f9',
                          color:consolidada?'#0369a1':'#94a3b8'}}>
                          {consolidada ? (automatico && !eMesAtual && passado ? 'fixa ✓' : 'consolidado') : 'não consolidado'}
                        </span>
                      </div>
                      <div style={{fontSize:10,color:'#94a3b8',marginTop:2,
                        display:'flex',alignItems:'center',gap:4}}>
                        {ehFaturaFixa
                          ? `${f.categoria}${f.nome !== f.categoria ? ' · ' + f.nome : ''}`
                          : (f.subtitulo ?? f.categoria)
                        } <BadgePag fp={f.formaPagamento}/>
                      </div>
                    </div>
                    <div style={{fontSize:13,fontWeight:600,color:corValor}}>
                      {f.tipo==='entrada'?'+':'-'}{fmt(valorMostrado)}
                    </div>
                  </div>

                </div>
              )})}

              {/* Lançamentos variáveis */}
              {aberto && ls.map(l => {
                const catVisual = iconeCategoria(categorias, l.categoria)
                const corValor = l.tipo==='entrada' ? COR.azul : COR.vermelho
                const emEdicao = editandoId === l.id
                const cartaoNomesExtrato = new Set(contas.filter(c => c.tipo === 'cartao').map(c => c.nome.toLowerCase()))
                const catLower = l.categoria.toLowerCase()
                const ehFaturaLanc = cartaoNomesExtrato.has(catLower) ||
                  (catLower.includes('cart') && (/cr[eé]d/.test(catLower) || catLower.includes('fatura')))
                return (
                <div key={l.id}
                  onClick={e => { e.stopPropagation(); if(!l.id.startsWith('fatura-')) editarLancamento(dia, l) }}
                  style={{display:'flex',alignItems:'center',gap:10,cursor:l.id.startsWith('fatura-')?'default':'pointer',
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
                    <div style={{fontSize:12,fontWeight:600,color:COR.texto,
                      display:'flex',alignItems:'center',gap:5}}>
                      {ehFaturaLanc ? 'Cartão de Crédito' : l.categoria}
                      <BadgePag fp={l.formaPagamento}/>
                    </div>
                    <div style={{fontSize:11,color:'#64748b',marginTop:1}}>
                      {ehFaturaLanc ? l.categoria : l.descricao}
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

              {/* INLINE FORM — mobile only, mostra dentro do dia card */}
              {isMobile && aberto && (
                <>
                  <button
                    onClick={e => { e.stopPropagation()
                      if (mobileDiaForm===dia) { setMobileDiaForm(null) } else {
                        setMobileDiaForm(dia); setDiaSel(dia)
                        setFTipo('saida'); setFCat(''); setFSubDesc(''); setFDesc(''); setFValor(''); setFPag('debito')
                        setEditandoId(null); setEditandoFixaId(null)
                        setTimeout(()=>categoriaSelectRef.current?.focus(),80)
                      }
                    }}
                    style={{display:'flex',alignItems:'center',justifyContent:'center',gap:5,
                      padding:9,fontSize:11,fontWeight:600,color:COR.azul,
                      cursor:'pointer',border:'none',background:'#f8faff',width:'100%',
                      borderTop:`1px dashed #bfdbfe`}}>
                    + Adicionar neste dia
                  </button>
                  {mobileDiaForm === dia && (
                    <div onClick={e=>e.stopPropagation()}
                      style={{background:'#f0f9ff',borderTop:`2px solid ${COR.azul}`,padding:'12px 14px'}}>
                      <div style={{display:'flex',background:'#e0f2fe',borderRadius:8,padding:3,marginBottom:10,width:'fit-content'}}>
                        {(['saida','entrada'] as const).map(t=>(
                          <button key={t} onClick={()=>{setFTipo(t);setFPag(t==='entrada'?'pix':'debito')}} style={{
                            padding:'5px 14px',border:'none',borderRadius:6,cursor:'pointer',
                            fontSize:11,fontWeight:600,fontFamily:'inherit',
                            background:fTipo===t?COR.branco:'transparent',
                            color:fTipo===t?(t==='entrada'?COR.verde:COR.vermelho):'#0369a1',
                            boxShadow:fTipo===t?'0 1px 3px rgba(0,0,0,.1)':'none'}}>
                            {t==='saida'?'↓ Saída':'↑ Entrada'}
                          </button>
                        ))}
                      </div>
                      <div style={{display:'flex',gap:6,marginBottom:8,flexWrap:'wrap' as never}}>
                        <div style={{flex:'1.5 1 100px',display:'flex',flexDirection:'column',gap:3}}>
                          <div style={{fontSize:9,color:'#0369a1',fontWeight:700,textTransform:'uppercase' as never,letterSpacing:.3}}>Categoria</div>
                          <select ref={categoriaSelectRef} value={fCat}
                            onChange={e=>{const n=e.target.value;setFCat(n);setFSubDesc('');const c=categorias.find(x=>x.nome===n);if(c)setFPag(fTipo==='entrada'?formaRecebCategoria(c.formaPagamento,c.tipoMovimento):formaPagCategoria(c.formaPagamento,c.tipoMovimento));if(n)setTimeout(()=>valorInputRef.current?.focus(),50)}}
                            style={{border:`1.5px solid #bae6fd`,borderRadius:9,padding:'8px 10px',fontSize:13,outline:'none',background:'#fff',fontFamily:'inherit',color:COR.texto}}>
                            <option value="">Selecione...</option>
                            {categoriasSelect.map(c=><option key={c.id} value={c.nome}>{c.nome}</option>)}
                          </select>
                        </div>
                        <div style={{flex:'2 1 120px',display:'flex',flexDirection:'column',gap:3}}>
                          <div style={{fontSize:9,color:'#0369a1',fontWeight:700,textTransform:'uppercase' as never,letterSpacing:.3}}>Descrição</div>
                          <input value={fDesc} onChange={e=>setFDesc(e.target.value)}
                            placeholder="Ex: Mercado Extra..."
                            style={{border:`1.5px solid #bae6fd`,borderRadius:9,padding:'8px 10px',fontSize:13,outline:'none',background:'#fff',fontFamily:'inherit',color:COR.texto}}
                            onKeyDown={e=>e.key==='Enter'&&lancar()}/>
                        </div>
                        <div style={{flex:'0 0 90px',display:'flex',flexDirection:'column',gap:3}}>
                          <div style={{fontSize:9,color:'#0369a1',fontWeight:700,textTransform:'uppercase' as never,letterSpacing:.3}}>Valor</div>
                          <input ref={valorInputRef} value={fValor} onChange={e=>setFValor(e.target.value)}
                            placeholder="R$ 0,00" inputMode="decimal"
                            style={{border:`1.5px solid #bae6fd`,borderRadius:9,padding:'8px 10px',fontSize:13,outline:'none',background:'#fff',fontFamily:'inherit',color:COR.texto}}
                            onKeyDown={e=>e.key==='Enter'&&lancar()}/>
                        </div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap' as never,marginBottom:8}}>
                        <span style={{fontSize:10,color:'#0369a1',fontWeight:600}}>Pgto:</span>
                        {(fTipo==='entrada'?FORMAS_ENT:FORMAS_SAI).map(p=>(
                          <button key={p.id} onClick={()=>setFPag(p.id)} style={{
                            padding:'4px 10px',border:`1.5px solid ${fPag===p.id?COR.azul:'#bae6fd'}`,
                            borderRadius:6,cursor:'pointer',fontSize:10,fontWeight:600,
                            background:fPag===p.id?'#eff6ff':'#fff',color:fPag===p.id?COR.azul:'#0369a1',
                            fontFamily:'inherit'}}>
                            {p.label}
                          </button>
                        ))}
                      </div>
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={()=>setMobileDiaForm(null)}
                          style={{flex:1,padding:'9px 0',border:`1.5px solid ${COR.borda}`,borderRadius:8,
                            background:'#fff',color:COR.textoSuave,fontSize:12,fontWeight:600,
                            cursor:'pointer',fontFamily:'inherit'}}>Cancelar</button>
                        <button onClick={lancar}
                          style={{flex:2,padding:'9px 0',border:'none',borderRadius:8,
                            background:`linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,
                            color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Lançar</button>
                      </div>
                      <div style={{fontSize:9,color:'#0369a1',marginTop:8,opacity:.7}}>↵ Enter no valor para salvar</div>
                    </div>
                  )}
                </>
              )}

            </div>
          )
        })}

        {/* Saldo final — mobile inline (dentro do scroll) */}
        {isMobile && (
          <div style={{margin:'4px 0 8px',borderRadius:14,
            background:(saldosDia[totalDias]??saldoMes)<0?'linear-gradient(135deg,#7f1d1d,#dc2626)':`linear-gradient(135deg,${COR.azulEscuro},${COR.azulMedio})`,
            padding:'14px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
            <span style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,.7)'}}>
              Saldo final — {NOMES_MESES[mes]} {ano}
            </span>
            <span style={{fontSize:17,fontWeight:800,color:'#fff',letterSpacing:'-.5px'}}>
              {fmt(saldosDia[totalDias]??saldoMes)}
            </span>
          </div>
        )}

      </div>

      {/* Saldo final previsto — fora do scroll, fixo no fundo do painel */}
      {!isMobile && (
        <div style={{borderRadius:12,padding:'14px 16px',flexShrink:0,margin:'0 0 10px',
          background:(saldosDia[totalDias]??saldoMes)<0?'linear-gradient(135deg,#7f1d1d,#dc2626)':`linear-gradient(135deg,${COR.azulEscuro},${COR.azulMedio})`,
          display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,.8)'}}>
            Saldo final previsto — {NOMES_MESES[mes]} {ano}
          </span>
          <span style={{fontSize:18,fontWeight:700,color:'#fff',fontVariantNumeric:'tabular-nums'}}>
            {fmt(saldosDia[totalDias] ?? saldoMes)}
          </span>
        </div>
      )}
      </div>{/* fim coluna esquerda */}

      {/* PAINEL DE LANÇAMENTO */}
      <div style={{width: isMobile ? '100%' : 340, flexShrink:0, background:COR.branco,
        border:`1px solid ${COR.borda}`,borderRadius:12,padding: isMobile ? '16px 12px' : 20,
        overflowY:'auto', marginTop:10,
        display: isMobile ? 'none' : 'block'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
          {isMobile && (
            <button onClick={() => { setMobileView('extrato'); resetarParaNovo(diaSel) }} style={{
              border:'none', background:'transparent', cursor:'pointer',
              fontSize:13, fontWeight:600, color:COR.azul, fontFamily:'inherit', padding:'0 8px 0 0',
            }}>← Voltar</button>
          )}
          <h3 style={{fontSize:14,fontWeight:700,color:COR.texto,margin:0,flex:1}}>
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
            {editandoFixaId && fixaEhAutomatica ? (
              <div style={{border:'1.5px solid #e2e8f0',borderRadius:7,padding:'7px 10px',
                fontSize:12,background:'#f8faff',color:'#64748b',textAlign:'center',
                fontFamily:'inherit'}}>
                {diaSel}
              </div>
            ) : (
              <input type="number" min={1} max={totalDias} value={diaSel}
                onChange={e => setDiaSel(Math.min(Math.max(parseInt(e.target.value)||1,1),totalDias))}
                onFocus={e => { realcarFoco(e); e.currentTarget.select() }} onBlur={removerRealce}
                style={{border:'1.5px solid #bae6fd',borderRadius:7,padding:'7px 10px',
                  fontSize:12,outline:'none',background:'#fff',
                  fontFamily:'inherit',color:COR.texto,width:'100%',textAlign:'center'}} />
            )}
          </div>
          <div style={{fontSize:11,color:'#94a3b8',paddingBottom:8}}>
            {NOMES_MESES[mes]} · {diaSemana(diaSel,mes,ano)}
          </div>
        </div>

        {!editandoFixaId && (
        <div style={{display:'flex',background:'#e0f2fe',borderRadius:7,
          padding:3,marginBottom:10,width:'fit-content'}}>
          {(['saida','entrada'] as const).map(t => (
            <button key={t} onClick={() => {
              setFTipo(t)
              if (!isDinheiro && fPag !== 'transferencia') setFPag(t === 'entrada' ? 'credito' : 'debito')
            }} style={{
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

        {/* FORMA DE PAGAMENTO — acima da categoria; também para fixas não-automáticas */}
        {!isDinheiro && (!editandoFixaId || (editandoFixaId && !fixaEhAutomatica)) && (
        <div style={{marginBottom:12}}>
          <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:6}}>
            {fTipo === 'entrada' ? 'Forma de recebimento:' : 'Forma de pagamento:'}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
            {(fTipo === 'entrada' ? FORMAS_ENT : FORMAS_SAI).map(p=>(
              <button key={p.id} onClick={()=>{ setFPag(p.id); if(p.id!=='transferencia') setFContaDestino('') }} style={{
                padding:'4px 12px',
                border:`1.5px solid ${fPag===p.id?COR.azul:'#bae6fd'}`,
                borderRadius:6,cursor:'pointer',fontSize:11,fontWeight:500,
                background:fPag===p.id?'#eff6ff':'#fff',
                color:fPag===p.id?COR.azul:'#0369a1',fontFamily:'inherit'}}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        )}

        <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:10}}>
          <div>
            <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:4}}>
              {fPag === 'transferencia'
                ? (fTipo === 'saida' ? 'Transferir para:' : 'Receber de:')
                : 'Categoria'}
            </div>
            {editandoFixaId ? (
              <div style={{border:'1.5px solid #e2e8f0',borderRadius:7,padding:'7px 10px',
                fontSize:12,background:'#f8faff',color:'#64748b',fontFamily:'inherit'}}>
                {fCat}
              </div>
            ) : fPag === 'transferencia' ? (
              <select ref={categoriaSelectRef} value={fContaDestino}
                onChange={e => setFContaDestino(e.target.value)}
                onFocus={realcarFoco} onBlur={removerRealce}
                style={{border:`1.5px solid #bae6fd`,borderRadius:7,padding:'7px 10px',
                  fontSize:12,outline:'none',background:'#fff',
                  fontFamily:'inherit',color:COR.texto,width:'100%'}}>
                <option value="">Selecione a conta...</option>
                {contasExtrato.filter(c => c.id !== contaIdEfetivo).map(c=>(
                  <option key={c.id} value={c.id}>{c.icone} {c.nome} — {c.banco}</option>
                ))}
              </select>
            ) : (
            <>
            <select ref={categoriaSelectRef} autoFocus value={fCat}
              onChange={e => {
                const nome = e.target.value
                setFCat(nome); setFSubDesc('')
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
              {categoriasSelect.map(c=>(
                <option key={c.id} value={c.nome}>{c.nome}</option>
              ))}
            </select>
            {subDescsDisponiveis.length > 1 && (
              <div style={{marginTop:6}}>
                <div style={{fontSize:9,color:'#0369a1',fontWeight:600,
                  textTransform:'uppercase',letterSpacing:.4,marginBottom:4}}>
                  Qual variante?
                </div>
                <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                  {subDescsDisponiveis.map(desc => (
                    <button key={desc} type="button"
                      onClick={() => setFSubDesc(desc === fSubDesc ? '' : desc)}
                      style={{
                        padding:'4px 10px',borderRadius:20,fontSize:11,fontWeight:600,
                        border:`1.5px solid ${fSubDesc===desc?'#1a56db':'#bae6fd'}`,
                        background:fSubDesc===desc?'#1a56db':'#eff6ff',
                        color:fSubDesc===desc?'#fff':'#1a56db',
                        cursor:'pointer',fontFamily:'inherit',
                      }}>
                      {desc}
                    </button>
                  ))}
                </div>
              </div>
            )}
            </>
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
              placeholder={fPag==='transferencia'?'Opcional — ex: Reserva emergência':'Ex: Mercado Extra, Farmácia...'}
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


      <BottomNav />

      {/* MODAL SALDO BANCO */}
      {modalSaldo && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:1000,
          display:'flex',alignItems:'center',justifyContent:'center'}}
          onClick={() => setModalSaldo(null)}>
          <div style={{background:'#fff',borderRadius:14,padding:'28px 32px',minWidth:360,
            boxShadow:'0 20px 60px rgba(0,0,0,0.25)'}}
            onClick={e => e.stopPropagation()}>
            <div style={{marginBottom:20,display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:14,fontWeight:500,padding:'4px 12px',borderRadius:6,
                display:'inline-flex',alignItems:'center',gap:6,
                background:modalSaldo.cor+'18',border:`1px solid ${modalSaldo.cor}55`}}>
                <span>{modalSaldo.icone}</span>
                <span style={{color:modalSaldo.cor,fontWeight:700}}>{modalSaldo.banco}</span>
              </span>
            </div>
            <p style={{fontSize:14,color:'#0f172a',fontWeight:600,margin:'0 0 6px'}}>
              Qual é o saldo atual no banco?
            </p>
            <p style={{fontSize:12,color:'#94a3b8',margin:'0 0 16px'}}>
              Informe o saldo para calcular a diferença em relação ao sistema.
            </p>
            <input autoFocus
              value={modalSaldoValor}
              onChange={e => setModalSaldoValor(e.target.value)}
              onFocus={e => e.target.select()}
              onKeyDown={e => {
                if (e.key === 'Enter') confirmarModalSaldo()
                if (e.key === 'Escape') setModalSaldo(null)
              }}
              placeholder="R$ 0,00"
              style={{width:'100%',border:`1.5px solid ${modalSaldo.cor}`,borderRadius:8,
                padding:'10px 14px',fontSize:16,fontWeight:700,color:'#0f172a',
                outline:'none',textAlign:'right',fontFamily:'inherit',boxSizing:'border-box'}}/>
            <div style={{display:'flex',gap:10,marginTop:20}}>
              <button onClick={() => setModalSaldo(null)}
                style={{flex:1,padding:'10px',borderRadius:8,border:`1.5px solid #e2e8f0`,
                  background:'#f8faff',color:'#64748b',fontSize:13,fontWeight:600,
                  cursor:'pointer',fontFamily:'inherit'}}>
                Pular
              </button>
              <button onClick={confirmarModalSaldo}
                style={{flex:2,padding:'10px',borderRadius:8,border:'none',
                  background:modalSaldo.cor,color:'#fff',fontSize:13,fontWeight:700,
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
