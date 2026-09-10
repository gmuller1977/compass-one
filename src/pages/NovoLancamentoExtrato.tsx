import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useToast } from '../components/Toast'
import { ehAutomaticoCategoria, ehCartaoCategoria } from '../utils/categoriaIcone'
import { valorFixaNoMes } from '../utils/valorFixa'
import { faltaVariavelDoMes, saldoRealizadoConta, type Deps as DepsSaldo } from '../utils/saldoConta'
import FaturaCartao from './FaturaCartao'
import BottomNav from '../components/BottomNav'
import TutorialCard from '../components/TutorialCard'
import {
  COR, NOMES_MESES,
  contaDaFixaNoMes, diaEfetivoFixa, fmt, parseBRL, diasNoMes, mesKey, type Memoria,
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
  const [cartaoMes,         setCartaoMes]         = useState(mesHoje)
  const [cartaoAno,         setCartaoAno]         = useState(anoHoje)
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
  const isMobile = useIsMobile()
  const [mobileView, setMobileView] = useState<'extrato'|'form'>('extrato')
  const [mobileStep, setMobileStep] = useState<'tipo'|'conta'|'extrato'>('extrato')
  const [mobileDiaForm, setMobileDiaForm] = useState<number|null>(null)
  const [mobileCartaoId, setMobileCartaoId] = useState<string|null>(null)

  const hojeRef = useRef<HTMLDivElement>(null)
  const categoriaSelectRef = useRef<HTMLSelectElement>(null)
  const valorInputRef = useRef<HTMLInputElement>(null)
  const { contas, categorias, extratoData, updateExtratoMes, planos, setPlanos, faturaData, setFaturaData, user, sairDaConta, percentualAlerta, saldoInicialDinheiro, cenarioPrevisao } = useApp()

  // Valor planejado (previsto) para uma categoria no mês/ano atual
  function valorPrevistoCat(catId: string, catNome: string, tipoLanc: TipoLanc): number {
    // Mesma valoracao dos meses passados no saldoBase. Ver utils/valorFixa.
    const cat = categorias.find(c => c.id === catId)
      ?? categorias.find(c => c.nome === catNome && c.tipo === tipoLanc)
    if (!cat) return 0
    return valorFixaNoMes(cat, planos[ano], mes, categorias)
  }

  function valorPrevistoPorNome(catNome: string, tipoLanc: TipoLanc): number {
    const cat = categorias.find(c => c.nome === catNome)
    return valorPrevistoCat(cat?.id ?? '', catNome, tipoLanc)
  }

  const contasExtrato = contas
    .filter(c => c.tipo === 'corrente' || c.tipo === 'poupanca')
    .sort((a, b) => {
      const pDiff = (b.preferida ? 1 : 0) - (a.preferida ? 1 : 0)
      return pDiff !== 0 ? pDiff : a.nome.localeCompare(b.nome, 'pt-BR')
    })
  // Fixa sem conta de debito cadastrada precisa de um dono, senao aparece em
  // todas as contas — e num mes futuro, onde nada esta confirmado, cada conta
  // projeta todas elas. Era o que deixava a Caixa negativa.
  const contaPadraoFixas = (contasExtrato.find(c => c.preferida) ?? contasExtrato[0])?.id
  const isDinheiro = tabPrincipal === 'dinheiro'

  const contaIdEfetivo = isDinheiro ? 'dinheiro' : (contasExtrato.find(c => c.id === contaId)?.id ?? contasExtrato[0]?.id ?? '')
  const dados = extratoData as Record<string, DadosMes>
  // Os mesmos Deps que o Radar monta: a cascata e a projecao do saldo tem de
  // olhar exatamente os mesmos dados.
  // O DadosMes daqui vem do NleShared, com FormaPag mais largo que o do
  // AppContext; o cast atravessa essa diferenca, que nao muda nenhum valor.
  const depsSaldo = useMemo(() => ({
    extratoData, faturaData, contas, categorias, planos, saldoInicialDinheiro,
    cenarioPrevisao,
  }) as unknown as DepsSaldo,
  [extratoData, faturaData, contas, categorias, planos, saldoInicialDinheiro, cenarioPrevisao])
  const fixasCategoria = categorias
    .filter(c => {
      if (!c.fixa || !c.ativa) return false
      if (isDinheiro) return c.tipoMovimento === 'dinheiro'
      if (c.tipoMovimento === 'cartao') return false
      if (c.tipoMovimento === 'dinheiro') return false
      // Confirmada em outra conta vence tudo: quem pagou, pagou. Vale tambem
      // para fixa com conta de debito — se saiu de outro banco, nao segue
      // pendente no de origem.
      const confirmadaFora = contasExtrato
        .filter(ct => ct.id !== contaIdEfetivo)
        .some(ct => dados[mesKey(ct.id, ano, mes)]?.fixasConsolidadas?.[c.id] === true)
      if (confirmadaFora) return false
      if (dados[mesKey(contaIdEfetivo, ano, mes)]?.fixasConsolidadas?.[c.id] === true) return true
      return contaDaFixaNoMes(c, ano, mes, dados, contaPadraoFixas) === contaIdEfetivo
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
      // A fatura tem dono, como a categoria tem conta de debito: aparece so na
      // conta de pagamento do cartao — debito automatico, boleto ou PIX, tanto
      // faz. Cartao sem conta definida cai na preferida, para nunca aparecer em
      // todas. Confirmada em outra conta, some daqui.
      const fixaId = `cartao-${c.id}`
      const confirmadaFora = contasExtrato
        .filter(ct => ct.id !== contaIdEfetivo)
        .some(ct => dados[mesKey(ct.id, ano, mes)]?.fixasConsolidadas?.[fixaId] === true)
      if (confirmadaFora) return
      const confirmadaAqui = dados[mesKey(contaIdEfetivo, ano, mes)]?.fixasConsolidadas?.[fixaId] === true
      if (!confirmadaAqui && (c.contaPagamentoId ?? contaPadraoFixas) !== contaIdEfetivo) return
      const bOffset = (c.diaVencimento ?? 1) < (c.diaFechamento ?? 1) ? 1 : 0
      let pMes = mes - bOffset, pAno = ano
      if (pMes < 0) { pMes += 12; pAno-- }
      const fatKey = mesKey(c.id, pAno, pMes)
      const dm = faturasDados[fatKey]
      let total = 0
      if (dm) {
        const nDias = new Date(pAno, pMes + 1, 0).getDate()
        for (let d = 1; d <= nDias; d++) {
          ;(dm.lancamentos[d] ?? []).forEach((l: { tipo: string; valor: number }) => {
            l.tipo === 'entrada' ? total += l.valor : total -= l.valor
          })
        }
      }
      const fp = c.formaPagamentoFatura
      const formaPagamento: FormaPag = fp === 'pix' ? 'pix' : 'debito'
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
      const manual = parseBRL(manualStr)
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
            l.tipo === 'entrada' ? total += l.valor : total -= l.valor
          })
        }
      }
      return { conta: c, fatura: Math.max(0, total) }
    })
  }, [contas, faturaData, ano, mes])

  const saldoDinheiro = useMemo(() => {
    const mesStr = String(mes + 1).padStart(2, '0')
    const totalDiasM = new Date(ano, mes + 1, 0).getDate()
    const dm = dados[`dinheiro-${ano}-${mesStr}`]
    if (!dm) return saldoInicialDinheiro
    let te = 0, ts = 0
    for (let d = 1; d <= totalDiasM; d++) {
      for (const l of dm.lancamentos?.[d] ?? []) {
        l.tipo === 'entrada' ? te += l.valor : ts += l.valor
      }
    }
    return saldoInicialDinheiro + te - ts
  }, [dados, ano, mes, saldoInicialDinheiro])

  // Mapa de catId → {valor, tipo, diaVencimento, nome} para fixas consolidadas
  const fixasValorPorId = useMemo(() => {
    const dadosAno = planos[ano]
    const map: Record<string, { valor: number; tipo: string; diaVencimento: number; nome: string }> = {}
    for (const cat of categorias) {
      if (!cat.fixa || !cat.ativa) continue
      const planList = cat.tipo === 'saida'
        ? (dadosAno as { saidas?: { nome: string; v: number[] }[] } | undefined)?.saidas
        : (dadosAno as { entradas?: { nome: string; v: number[] }[] } | undefined)?.entradas
      const planVal = planList?.find(c => c.nome === cat.nome)?.v[mes] ?? 0
      map[cat.id] = {
        valor: planVal,
        tipo: cat.tipo,
        diaVencimento: cat.diaVencimento ?? 1,
        nome: cat.nome,
      }
    }
    return map
  }, [categorias, planos, mes, ano])

  const { totalEntradasMes, totalSaidasMes, recentLancs } = useMemo(() => {
    const mesStr = String(mes + 1).padStart(2, '0')
    const totalDiasM = new Date(ano, mes + 1, 0).getDate()
    let te = 0, ts = 0
    const lancs: { dia: number; banco: string; icone: string; cor: string; categoria: string; descricao: string; valor: number; tipo: string }[] = []

    function contarFixasConsolidadas(dm: DadosMes, banco: string, icone: string, cor: string) {
      for (const [catId, confirmed] of Object.entries(dm.fixasConsolidadas ?? {})) {
        if (!confirmed || catId.startsWith('cartao-')) continue
        const f = fixasValorPorId[catId]
        if (!f) continue
        const override = dm.fixasValorOverride?.[catId]
        const valor = override !== undefined ? override : f.valor
        if (valor <= 0) continue
        f.tipo === 'entrada' ? te += valor : ts += valor
        const dia = dm.fixasMovidas?.[catId] ?? f.diaVencimento
        lancs.push({ dia, banco, icone, cor, categoria: f.nome, descricao: f.nome, valor, tipo: f.tipo })
      }
    }

    for (const c of contasExtrato) {
      const dm = dados[`${c.id}-${ano}-${mesStr}`]
      if (!dm) continue
      for (let d = 1; d <= totalDiasM; d++) {
        for (const l of dm.lancamentos?.[d] ?? []) {
          l.tipo === 'entrada' ? te += l.valor : ts += l.valor
          lancs.push({ dia: d, banco: c.apelido ?? c.banco, icone: c.icone, cor: c.cor, categoria: l.categoria, descricao: (l as { descricao?: string }).descricao ?? '', valor: l.valor, tipo: l.tipo })
        }
      }
      contarFixasConsolidadas(dm, c.apelido ?? c.banco, c.icone, c.cor)
    }

    const dmDinheiro = dados[`dinheiro-${ano}-${mesStr}`]
    if (dmDinheiro) {
      for (let d = 1; d <= totalDiasM; d++) {
        for (const l of dmDinheiro.lancamentos?.[d] ?? []) {
          l.tipo === 'entrada' ? te += l.valor : ts += l.valor
          lancs.push({ dia: d, banco: 'Dinheiro', icone: '💵', cor: '#16a34a', categoria: l.categoria, descricao: (l as { descricao?: string }).descricao ?? '', valor: l.valor, tipo: l.tipo })
        }
      }
      contarFixasConsolidadas(dmDinheiro, 'Dinheiro', '💵', '#16a34a')
    }

    const fat = faturaData as Record<string, { lancamentos?: Record<number, { tipo: string; categoria: string; descricao?: string; valor: number }[]> }>
    for (const c of contas.filter(ct => ct.tipo === 'cartao')) {
      const dm = fat[`${c.id}-${ano}-${mesStr}`]
      if (!dm?.lancamentos) continue
      for (let d = 1; d <= totalDiasM; d++) {
        for (const l of dm.lancamentos[d] ?? []) {
          if (l.tipo === 'entrada') {
            ts += l.valor
            lancs.push({ dia: d, banco: c.apelido ?? c.nome, icone: c.icone || '💳', cor: c.cor || '#6366f1', categoria: l.categoria, descricao: l.descricao ?? '', valor: l.valor, tipo: 'saida' })
          }
        }
      }
    }

    lancs.sort((a, b) => b.dia - a.dia)
    return { totalEntradasMes: te, totalSaidasMes: ts, recentLancs: lancs }
  }, [contasExtrato, contas, dados, faturaData, ano, mes, fixasValorPorId])

  const fixas = [...fixasCategoria, ...fixasCartao]
  const categoriasVariaveis = categorias
    .filter(c => c.ativa && c.tipo === fTipo && (isDinheiro ? c.formaPagamento !== 'automatico' : true))
    .sort((a,b) => a.nome.localeCompare(b.nome,'pt-BR'))
  // Uma opcao por NOME: a variante e escolhida no campo Variante ao lado
  const categoriasSelect = categoriasVariaveis.filter((c, idx, arr) =>
    arr.findIndex(x => x.nome.trim().toLowerCase() === c.nome.trim().toLowerCase()) === idx
  )
  const subDescsDisponiveis = fCat
    ? categoriasVariaveis
        .filter(c => c.nome.trim().toLowerCase() === fCat.trim().toLowerCase() && c.descricao?.trim())
        .map(c => c.descricao!.trim())
    : []
  const contaInfo     = contas.find(c => c.id === contaIdEfetivo)
  const totalDias = diasNoMes(mes, ano)
  const eMesAtual = mes===mesHoje && ano===anoHoje
  const key       = mesKey(contaIdEfetivo, ano, mes)
  const mesDados  = dados[key] ?? { lancamentos:{}, saldoBanco:'' }
  const saldoExtNum = parseBRL(mesDados.saldoBanco)

  useEffect(() => {
    if (tabPrincipal !== 'extrato') return
    const bancos = contas.filter(c => c.tipo==='corrente'||c.tipo==='poupanca')
    const preferida = bancos.find(c => c.preferida)
    const inicial = preferida ?? bancos[0]
    if (inicial) { setContaId(inicial.id); setFBancoConsolidado(inicial.id) }
  }, [tabPrincipal]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (eMesAtual)
      setTimeout(() => hojeRef.current?.scrollIntoView({behavior:'smooth',block:'start'}), 150)

    // Abre tambem os dias com fixa ainda nao confirmada — o que a tela chama
    // de "previsto". Sao justamente os que exigem acao, e antes ficavam
    // fechados no meio do mes, sem nada indicando onde procurar.
    const dm = dados[key]
    const comPrevisto = fixas
      .filter(f => dm?.fixasConsolidadas?.[f.id] !== true)
      .map(f => diaEfetivoFixa(f, dm?.fixasMovidas, ehAutomatico(f), mes, ano, totalDias))
      .filter(d => d >= 1 && d <= totalDias)

    setDiasAbertos(new Set([...(eMesAtual ? [diaHoje] : []), ...comPrevisto]))
  }, [contaId, mes, ano, tabPrincipal]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (isDinheiro) setFPag('dinheiro') }, [tabPrincipal])

  useEffect(() => {
    if (isMobile) return
    const params  = new URLSearchParams(location.search)
    let rawTipo   = params.get('tipo')
    const conta   = params.get('conta')
    if (!rawTipo && !conta) return
    if (rawTipo === 'banco') rawTipo = 'extrato'
    if (rawTipo === 'resumo') rawTipo = 'consolidado'
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
  }, [location.search, contasExtrato.length]) // eslint-disable-line react-hooks/exhaustive-deps

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
    setModalSaldoValor(fmt(saldoMes))
    setModalSaldo({contaId:conta.id, banco:conta.banco, icone:conta.icone, cor:conta.cor, key:k})
  }, [tabPrincipal])



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

  // Conta escolhida no modal de edicao de uma fixa. Vazio = nao aplicavel.
  const [fContaFixa, setFContaFixa] = useState('')

  /**
   * Grava (ou remove) a conta daquele mes. Vai sempre no DadosMes da conta de
   * ORIGEM, mesmo quando a fixa ja se mudou e esta sendo editada no destino —
   * senao a proxima leitura procuraria no lugar errado.
   */
  function gravarContaDaFixa(fixaId: string) {
    const cat = categorias.find(c => c.id === fixaId)
    if (!cat || cat.tipoMovimento !== 'banco') return
    const origem = cat.contaDebitoId ?? contaPadraoFixas
    if (!origem || !fContaFixa) return
    updateMesPorKey(mesKey(origem, ano, mes), prev => {
      const mapa = { ...prev.fixasContaOverride }
      if (fContaFixa === origem) delete mapa[fixaId]
      else mapa[fixaId] = fContaFixa
      return { ...prev, fixasContaOverride: mapa }
    })
  }

  function editarFixa(dia: number, f: CatFixa) {
    setDiaSel(dia); setEditandoId(null); setEditandoDiaOriginal(null); setEditandoFixaId(f.id); if (isMobile) setMobileView('form')
    setFTipo(f.tipo); setFCat(f.categoria)
    setFDesc(mesDados.fixasDescOverride?.[f.id] ?? f.nome)
    setFValor(String(mesDados.fixasValorOverride?.[f.id] ?? f.valor).replace('.', ','))
    setFPag(mesDados.fixasPagOverride?.[f.id] ?? f.formaPagamento)
    const catFixa = categorias.find(c => c.id === f.id)
    setFContaFixa(catFixa && catFixa.tipoMovimento === 'banco'
      ? (contaDaFixaNoMes(catFixa, ano, mes, dados, contaPadraoFixas) ?? '')
      : '')
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

  // Fixa sem conta de debito cadastrada pode ter sido paga de qualquer conta.
  // Em vez de adivinhar, pergunta — com a preferida ja selecionada, que e o
  // caso comum. A escolha vale para aquele mes, que e como o
  // fixasConsolidadas ja funciona; para fixar de vez, o caminho e cadastrar a
  // conta de debito na categoria.
  const [escolherContaFixa, setEscolherContaFixa] = useState<string | null>(null)

  function consolidarFixa(fixaId: string) {
    const cat = categorias.find(c => c.id === fixaId)
    // Dinheiro nao tem banco para escolher: fixa de carteira e confirmada na
    // propria carteira. Sem isto a tela de dinheiro abria "Pagar de qual
    // conta?" com Sicredi e Caixa — e a escolha gravava fixasConsolidadas no
    // DadosMes do BANCO, fazendo aquele dinheiro entrar no saldo dele.
    const ehDinheiro = isDinheiro || cat?.tipoMovimento === 'dinheiro'
    const precisaEscolher = !ehDinheiro
      && !fixaId.startsWith('cartao-')
      && !cat?.contaDebitoId
      && contasExtrato.length > 1
    if (precisaEscolher) { setEscolherContaFixa(fixaId); return }
    updateMes(prev => ({
      ...prev,
      fixasConsolidadas: { ...prev.fixasConsolidadas, [fixaId]: true },
    }))
  }

  function confirmarFixaEm(fixaId: string, contaAlvo: string) {
    updateMesPorKey(mesKey(contaAlvo, ano, mes), prev => ({
      ...prev,
      fixasConsolidadas: { ...prev.fixasConsolidadas, [fixaId]: true },
    }))
    setEscolherContaFixa(null)
  }

  /**
   * O saldo com que um mes ABRE: o fechamento realizado do mes anterior.
   *
   * Mes aberto abre com o fechamento previsto do anterior; mes fechado, com o
   * realizado. E encadeamento, e por isso sai da MESMA funcao que o Radar usa.
   *
   * Antes era o acumuladoAte, que partia do saldo de CADASTRO da conta e
   * reacumulava tudo desde entao — nunca lia o saldo informado na conciliacao.
   * Com uma conciliacao de diferenca, as duas telas mostravam a mesma conta
   * com numeros diferentes: 4.300 num caso medido, e o saldo final previsto
   * saia torto pelo mesmo tanto.
   *
   * A conciliacao do mes EXIBIDO continua de fora, de proposito: a caixa de
   * conciliacao mostra o informado menos o calculado. Se o calculado virasse
   * o informado, a diferenca daria zero para sempre e a caixa viraria
   * enfeite. Mes passado ja foi conferido com o banco; nao ha o que
   * investigar nele.
   */
  const aberturaDe = useCallback((a: number, m: number) => {
    const mAnt = m === 0 ? 11 : m - 1
    const aAnt = m === 0 ? a - 1 : a
    return saldoRealizadoConta(contaIdEfetivo, aAnt, mAnt, depsSaldo)
  }, [contaIdEfetivo, depsSaldo])
  const saldoBase = useMemo(() => aberturaDe(ano, mes), [aberturaDe, ano, mes])

  // Mes futuro abre com o PREVISTO do mes anterior, nao com o realizado: as
  // fixas que ainda vao cair entre hoje e la ja contam. Encadeia, entao
  // novembro carrega o previsto de setembro e outubro.
  //
  // A projecao e POR CONTA: esta tela mostra uma conta de cada vez. Quem manda
  // e contaDaFixaNoMes — a conta escolhida naquele mes, senao a do cadastro,
  // senao a preferida. O Radar nao projeta nada; previsao e do Planejamento.
  const mesFuturo = ano > anoHoje || (ano === anoHoje && mes > mesHoje)

  // A MESMA cascata, agora parametrizada pelo mes. O corpo e o de sempre:
  // dia passado (ou hoje) so conta fixa confirmada; dia futuro conta sempre.
  // A unica coisa que mudou e receber (a, m) em vez de usar o mes exibido, para
  // poder fechar tambem os meses anteriores e encadear a abertura.
  const cascataDoMes = useCallback((a: number, m: number, abertura: number) => {
    const dmMes  = dados[mesKey(contaIdEfetivo, a, m)]
    const lancs  = (dmMes ?? { lancamentos:{} }).lancamentos
    const ovr    = dmMes?.fixasMovidas
    const totalD = new Date(a, m + 1, 0).getDate()
    // A lista tem de ser montada PARA (a, m). Usar a lista `fixas` do escopo
    // nao serve: ela ja foi filtrada para o mes exibido — a regra da fixa
    // flutuante consulta as consolidacoes daquele mes. Com outubro na tela, a
    // cascata de setembro rodava com a lista de outubro.
    //
    // O filtro abaixo e o mesmo do fixasCategoria, so que parametrizado.
    const fcMes: CatFixa[] = categorias
      .filter(c => {
        if (!c.fixa || !c.ativa) return false
        if (isDinheiro) return c.tipoMovimento === 'dinheiro'
        if (c.tipoMovimento === 'cartao') return false
        if (c.tipoMovimento === 'dinheiro') return false
        // Mesma regra do mes exibido, so que para (a, m).
        const confirmadaFora = contasExtrato
          .filter(ct => ct.id !== contaIdEfetivo)
          .some(ct => dados[mesKey(ct.id, a, m)]?.fixasConsolidadas?.[c.id] === true)
        if (confirmadaFora) return false
        if (dados[mesKey(contaIdEfetivo, a, m)]?.fixasConsolidadas?.[c.id] === true) return true
        return contaDaFixaNoMes(c, a, m, dados, contaPadraoFixas) === contaIdEfetivo
      })
      .filter(c => !ehCartaoCategoria(categorias, c.nome))
      .map(c => ({
        id: c.id, nome: c.nome, categoria: c.nome,
        subtitulo: c.grupo, descricao: c.descricao,
        valor: valorFixaNoMes(c, planos[a], m, categorias),
        tipo: c.tipo as TipoLanc,
        formaPagamento: formaPagCategoria(c.formaPagamento, c.tipoMovimento),
        diaVencimento: c.diaVencimento ?? 1,
      }))

    // A fatura do cartao tambem entra na cascata: o nome do cartao nao e uma
    // categoria, entao ela passa pelo filtro de ehCartaoCategoria. Montada aqui
    // para (a, m) pelo mesmo motivo das demais.
    const fatMes: CatFixa[] = isDinheiro ? [] : contas
      .filter(c => c.tipo === 'cartao' && c.diaVencimento)
      .flatMap(c => {
        const isAuto = c.formaPagamentoFatura === 'automatico'
          || (!c.formaPagamentoFatura && !!c.contaPagamentoId)
        // A fatura tem dono, como a categoria tem conta de debito: aparece so na
        // conta de pagamento do cartao — debito automatico, boleto ou PIX, tanto
        // faz. Cartao sem conta definida cai na preferida, para nunca aparecer em
        // todas. Confirmada em outra conta, some daqui.
        const fixaId = `cartao-${c.id}`
        const confirmadaFora = contasExtrato
          .filter(ct => ct.id !== contaIdEfetivo)
          .some(ct => dados[mesKey(ct.id, a, m)]?.fixasConsolidadas?.[fixaId] === true)
        if (confirmadaFora) return []
        const confirmadaAqui = dados[mesKey(contaIdEfetivo, a, m)]?.fixasConsolidadas?.[fixaId] === true
        if (!confirmadaAqui && (c.contaPagamentoId ?? contaPadraoFixas) !== contaIdEfetivo) return []
        const bOff = (c.diaVencimento ?? 1) < (c.diaFechamento ?? 1) ? 1 : 0
        let pM = m - bOff, pA = a
        if (pM < 0) { pM += 12; pA-- }
        const dmFat = (faturaData as Record<string, { lancamentos?: Record<number, { tipo: string; valor: number }[]> }>)[mesKey(c.id, pA, pM)]
        let total = 0
        for (const itens of Object.values(dmFat?.lancamentos ?? {}))
          for (const l of itens) total += l.tipo === 'entrada' ? l.valor : -l.valor
        const fp = c.formaPagamentoFatura
        const formaPagamento: FormaPag = fp === 'pix' ? 'pix' : 'debito'
        return [{
          id: `cartao-${c.id}`, nome: c.nome, categoria: c.banco,
          valor: total, tipo: 'saida' as TipoLanc, formaPagamento,
          diaVencimento: c.diaVencimento!, ehFaturaCartao: isAuto,
        }]
      })
    const mesPast   = a < anoHoje || (a === anoHoje && m < mesHoje)
    const ehCorrente = a === anoHoje && m === mesHoje
    // ── Projecao do que ainda nao aconteceu ──────────────────────────────
    // Ate aqui a cascata so projetava categorias FIXAS. O planejamento tem
    // tambem as variaveis, e elas caem em meses diferentes conforme a forma de
    // pagamento: PIX e debito no proprio mes, cartao no mes em que a fatura e
    // paga. Sem isso o saldo de um mes futuro subia indefinidamente.
    //
    // No mes corrente vale o que FALTA gastar: max(0, plano - realizado), por
    // categoria, com o realizado somando extrato, dinheiro E fatura. Somar o
    // plano inteiro por cima dos lancamentos reais contaria duas vezes o mesmo
    // gasto; nao somar nada deixava o saldo otimista.
    //
    // Quem calcula e faltaVariavelDoMes, no saldoConta: uma funcao so, a mesma
    // que a projecao do Radar usa, e o numero dela e o mesmo "Disponivel" que
    // o Radar mostra na linha da categoria. Mes futuro cai nela tambem — sem
    // lancamento, o realizado e 0 e sobra o plano inteiro.
    const falta = mesPast
      ? { saidaBanco: 0, saidaCartao: 0, entrada: 0, diaCartao: undefined as number | undefined }
      : faltaVariavelDoMes(contaIdEfetivo, a, m, depsSaldo)

    const variaveisBanco: CatFixa[] = (() => {
      const v = falta.saidaBanco
      if (v <= 0) return []
      return [{
        id: '__variaveis_banco__', nome: 'Gastos variáveis a realizar',
        categoria: 'Gastos variáveis a realizar',
        valor: v, tipo: 'saida' as TipoLanc, formaPagamento: 'debito' as FormaPag,
        diaVencimento: totalD,
      }]
    })()

    // Receita variavel que o plano espera e ainda nao chegou. Mesma formula da
    // despesa: reservar o que falta gastar e ignorar o que falta receber torcia
    // o saldo para baixo — na planilha do Guilherme eram 663,08 de diferenca.
    const receitasAReceber: CatFixa[] = (() => {
      const v = falta.entrada
      if (v <= 0) return []
      return [{
        id: '__receitas_a_receber__', nome: 'Receitas a receber',
        categoria: 'Receitas a receber',
        valor: v, tipo: 'entrada' as TipoLanc, formaPagamento: 'pix' as FormaPag,
        diaVencimento: totalD,
      }]
    })()

    // A fatura em aberto ainda vai crescer com o que falta gastar das
    // categorias de cartao. Esse complemento vem de faltaVariavelDoMes, que ja
    // decidiu quanto e e qual conta paga — o cartaoRef daqui so serve para
    // escolher o DIA em que a linha cai, quando a funcao nao devolve um.
    //
    // Antes a estimativa era agregada: planejado do cartao menos o total ja
    // lancado na fatura, sem saber de qual categoria veio cada compra. Mercado
    // planejado no banco e pago no cartao abatia o orcamento do cartao e nao
    // abatia o proprio — as duas telas divergiam sobre a mesma categoria.
    const cartaoRef = (() => {
      const aqui = new Set(fatMes.map(f => f.id.slice('cartao-'.length)))
      return contas
        .filter(c => c.tipo === 'cartao' && c.diaVencimento && aqui.has(c.id))
        .sort((x, y) => (x.diaVencimento ?? 1) - (y.diaVencimento ?? 1))[0]
    })()
    const complementoFatura: CatFixa[] = (() => {
      if (isDinheiro || falta.saidaCartao <= 0) return []
      return [{
        id: '__fatura_estimada__', nome: 'Fatura estimada', categoria: 'Fatura estimada',
        valor: falta.saidaCartao, tipo: 'saida' as TipoLanc, formaPagamento: 'debito' as FormaPag,
        diaVencimento: falta.diaCartao ?? cartaoRef?.diaVencimento ?? totalD,
      }]
    })()

    const todasFixas = [...fcMes, ...fatMes, ...variaveisBanco, ...complementoFatura, ...receitasAReceber]
    let saldo = abertura
    let entradas = 0, saidas = 0
    // Memoria de calculo: a MESMA passagem que forma o saldo vai classificando
    // cada parcela. Nao ha segunda conta para explicar a primeira — as linhas
    // fecham no fechamento por construcao.
    const mem: Memoria = {
      abertura, entradasReais: 0, saidasReais: 0,
      entradasPrevistas: 0, receitasAReceber: 0, fixasPrevistas: 0,
      faturaEmAberto: 0, faturaEstimada: 0, variaveisARealizar: 0,
      fechamento: 0,
    }
    // Onde cada fixa cai na cascata, e se ela conta.
    //
    //   confirmada           -> no dia dela, como realizado.
    //   mes fechado, sem confirmar -> nao conta. Nao se presume debito
    //                          automatico de mes passado (regra de 31/08).
    //   dia ja passou ou e hoje, sem confirmar -> esta ATRASADA. Conta em
    //                          HOJE, como previsto.
    //   dia futuro           -> no dia dela, como previsto.
    //
    // A linha da atrasada existia como "pular", e ai a conta vencida e nao
    // paga sumia do fim do mes. O Radar sempre a contou — projecaoDaConta nao
    // olha dia nenhum —, entao as duas telas discordavam sobre o mesmo mes.
    // Medido: 645,00 de diferenca num mes real.
    //
    // Lancar em HOJE, e nao no dia vencido, e o que preserva o saldo dos dias
    // passados: eles sao desenhados so com o que foi confirmado, por outro
    // caminho, e o "saldo atual" continua batendo com o extrato.
    const agendadas = todasFixas.flatMap(f => {
      const diaReal = diaEfetivoFixa(f, ovr, ehAutomatico(f), m, a, totalD)
      const confirmada = dmMes?.fixasConsolidadas?.[f.id] === true
      const jaPassou = mesPast || (ehCorrente && diaReal <= diaHoje)
      if (!confirmada && mesPast) return []
      const valor = jaPassou ? (dmMes?.fixasValorOverride?.[f.id] ?? f.valor) : f.valor
      const dia = (!confirmada && jaPassou) ? diaHoje : diaReal
      return [{ f, dia, confirmada, valor }]
    })

    const res: Record<number,number> = {}
    for (let d = 1; d <= totalD; d++) {
      agendadas.filter(x => x.dia === d)
        .forEach(({ f, confirmada, valor: v }) => {
          if (f.tipo === 'entrada') {
            saldo += v; entradas += v
            if (confirmada) mem.entradasReais += v
            else if (f.id === '__receitas_a_receber__') mem.receitasAReceber += v
            else mem.entradasPrevistas += v
          } else {
            saldo -= v; saidas += v
            if (confirmada) mem.saidasReais += v
            else if (f.id === '__fatura_estimada__') mem.faturaEstimada += v
            else if (f.id === '__variaveis_banco__') mem.variaveisARealizar += v
            else if (f.id.startsWith('cartao-')) mem.faturaEmAberto += v
            else mem.fixasPrevistas += v
          }
        })
      ;(lancs[d] ?? []).forEach(l => {
        if (l.tipo === 'entrada') { saldo += l.valor; entradas += l.valor; mem.entradasReais += l.valor }
        else { saldo -= l.valor; saidas += l.valor; mem.saidasReais += l.valor }
      })
      res[d] = saldo
    }
    mem.fechamento = saldo
    return { porDia: res, fechamento: saldo, entradas, saidas, memoria: mem }
  }, [dados, depsSaldo, contaIdEfetivo, contasExtrato, contaPadraoFixas, contas, faturaData, isDinheiro, categorias, planos, anoHoje, mesHoje, diaHoje])

  // O saldo inicial de um mes futuro e o FECHAMENTO do anterior, calculado pela
  // mesma cascata — nao por uma segunda conta que tenta chegar no mesmo lugar.
  // E a regra que ja vale entre dias, aplicada entre meses: o fim do dia 01 e o
  // inicio do dia 02.
  const saldoBaseExibido = useMemo(() => {
    if (!mesFuturo) return saldoBase
    // Parte do acumulado ate ANTES do mes corrente. Usar saldoBase aqui somaria
    // o mes corrente duas vezes: ele ja esta no acumulado do mes exibido.
    let acc = aberturaDe(anoHoje, mesHoje)
    let a = anoHoje, m = mesHoje
    while (a * 100 + m < ano * 100 + mes) {
      acc = cascataDoMes(a, m, acc).fechamento
      m++; if (m > 11) { m = 0; a++ }
    }
    return acc
  }, [saldoBase, mesFuturo, aberturaDe, cascataDoMes, ano, mes, anoHoje, mesHoje])

  const cascata = useMemo(
    () => cascataDoMes(ano, mes, saldoBaseExibido),
    [cascataDoMes, ano, mes, saldoBaseExibido],
  )
  const saldosDia = cascata.porDia

  // Mes futuro mostra o PREVISTO — vindo da mesma cascata que projeta o saldo,
  // para as caixas fecharem entre si. Mes corrente e passado mostram so o
  // realizado: o que foi lancado ou confirmado.
  const { totalEntradas, totalSaidas } = useMemo(() => {
    if (mesFuturo) return { totalEntradas: cascata.entradas, totalSaidas: cascata.saidas }
    return calcularRealizado()

    function calcularRealizado() {
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
    }
  }, [mesFuturo, cascata, dados, key, contaId, totalDias, mes, ano, categorias])

  const saldoMes   = saldoBaseExibido + totalEntradas - totalSaidas
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
      gravarContaDaFixa(editandoFixaId)
      setEditandoFixaId(null)
      setFCat(''); setFSubDesc(''); setFDesc(''); setFValor('')
      // Sem pular para a categoria: editar uma fixa nao e comecar um lancamento
      // novo. Esse foco existe para o "lancei, quero lancar outro", e aqui ele
      // jogava o cursor na lista de categorias logo depois do Enter.
      if (isMobile) setMobileDiaForm(null)
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
    const planoBase = planos[ano]
    if (planoBase) {
      setPlanos(prev => ({
        ...prev,
        [ano]: {
          ...planoBase,
          saidas: (planoBase.saidas ?? []).map(c =>
            c.nome === catNome ? { ...c, v: c.v.map((v, mi) => mi === mes ? novoVal : v) } : c
          ),
        },
      }))
    }
    setAlertaDesvio(null)
  }

  function onMesAnterior() {
    let m=mes-1, a=ano; if(m<0){m=11;a--}
    setMes(m); resetarParaNovo(diaDefaultPara(m, a))
  }
  function onMesProximo() {
    let m=mes+1, a=ano; if(m>11){m=0;a++}
    setMes(m); resetarParaNovo(diaDefaultPara(m, a))
  }
  function onCartaoMesSelect(m: number, a: number) {
    setCartaoMes(m); setCartaoAno(a)
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
        contaId={contaIdEfetivo}
        setContaId={setContaId}
        setMobileDiaForm={setMobileDiaForm}
        mes={mes}
        ano={ano}
        onMesSelect={(m, a) => { setMes(m); setAno(a); resetarParaNovo(diaDefaultPara(m, a)) }}
        cartaoMes={cartaoMes}
        cartaoAno={cartaoAno}
        onCartaoMesSelect={onCartaoMesSelect}
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
        ]} buttonLabel="Ver resumo mensal →" />}

      {tabPrincipal === 'cartao' ? (
        <FaturaCartao
          mobileSelecionado={isMobile ? (mobileCartaoId ?? undefined) : cartaoNavId}
          onCartaoChange={id => setCartaoAtualId(id)}
          onVoltar={() => setMobileStep('tipo')}
          mes={cartaoMes}
          setMes={setCartaoMes}
          ano={cartaoAno}
          setAno={setCartaoAno}
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
          saldoDinheiro={saldoDinheiro}
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
            saldoBase={saldoBaseExibido}
            saldoBasePrevisto={mesFuturo}
            totalEntradas={totalEntradas}
            totalSaidas={totalSaidas}
            saldoMes={saldoMes}
            mes={mes}
            ano={ano}
            saldoBancoSalvo={mesDados.saldoBanco ?? ''}
            setModalSaldo={setModalSaldo}
            setModalSaldoValor={setModalSaldoValor}
            contasExtrato={contasExtrato}
            contaIdEfetivo={contaIdEfetivo}
            onContaSelect={(id) => navigate(`/novo-lancamento?tipo=banco&conta=${id}`)}
          />

          <div style={{flex:1,display:'flex',flexDirection:isMobile?'column':'row',overflow:isMobile?'auto':'hidden', paddingBottom:isMobile?120:0}}>
            <NleExtrato
              isMobile={isMobile}
              mobileView={mobileView}
              isDinheiro={isDinheiro}
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
              memoria={cascata.memoria}
              cenarioPrevisao={cenarioPrevisao}
              saldoBase={saldoBaseExibido}
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
              fContaFixa={fContaFixa}
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
              categoriaSelectRef={categoriaSelectRef}
              valorInputRef={valorInputRef}
              resetarParaNovo={resetarParaNovo}
              setFTipo={setFTipo}
              setFPag={setFPag}
              setFCat={setFCat}
              setFSubDesc={setFSubDesc}
              setFContaFixa={setFContaFixa}
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

      {escolherContaFixa && (() => {
        const cat = categorias.find(c => c.id === escolherContaFixa)
        const nome = cat ? (cat.descricao ? `${cat.nome} · ${cat.descricao}` : cat.nome) : ''
        return (
          <div style={{ position:'fixed', inset:0, zIndex:600, background:'rgba(15,23,42,.45)',
            display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
            onClick={() => setEscolherContaFixa(null)}>
            <div onClick={e => e.stopPropagation()}
              style={{ background:'#fff', borderRadius:14, padding:20, minWidth:300, maxWidth:380,
                boxShadow:'0 8px 32px rgba(0,0,0,.22)' }}>
              <div style={{ fontSize:15, fontWeight:700, color:COR.texto, marginBottom:4 }}>
                {cat?.tipo === 'entrada' ? 'Receber em qual conta?' : 'Pagar de qual conta?'}
              </div>
              <div style={{ fontSize:12, color:COR.textoSuave, marginBottom:14 }}>{nome}</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {contasExtrato.map(c => (
                  <button key={c.id} onClick={() => confirmarFixaEm(escolherContaFixa, c.id)}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                      borderRadius:10, cursor:'pointer', fontFamily:'inherit', textAlign:'left' as const,
                      border: c.preferida ? `1.5px solid ${COR.azul}` : `1px solid ${COR.borda}`,
                      background: c.preferida ? '#eff6ff' : '#fff' }}>
                    <span style={{ fontSize:18 }}>{c.icone || '🏦'}</span>
                    <span style={{ flex:1 }}>
                      <span style={{ display:'block', fontSize:13, fontWeight:600, color:COR.texto }}>
                        {c.apelido ?? c.banco ?? c.nome}
                      </span>
                      {c.preferida && (
                        <span style={{ display:'block', fontSize:10, color:COR.azul, fontWeight:600 }}>favorita</span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
              <button onClick={() => setEscolherContaFixa(null)}
                style={{ marginTop:12, width:'100%', padding:'8px 12px', borderRadius:10,
                  border:`1px solid ${COR.borda}`, background:'#fff', color:COR.textoSuave,
                  fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                Cancelar
              </button>
            </div>
          </div>
        )
      })()}

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
