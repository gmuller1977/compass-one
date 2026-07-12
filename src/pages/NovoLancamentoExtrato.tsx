import { useState, useMemo, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import AppHeader from '../components/AppHeader'
import { iconeCategoria, ehAutomaticoCategoria, ehCartaoCategoria } from '../utils/categoriaIcone'
import FaturaCartao from './FaturaCartao'
import ExtratoConsolidado from './ExtratoConsolidado'

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
  ehFaturaCartao?: boolean
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
  const [modo, setModo] = useState<'consolidado'|'banco'|'cartao'|'dinheiro'>('consolidado')
  const [fContaDestino,     setFContaDestino]      = useState('')
  const [diasAbertos, setDiasAbertos] = useState<Set<number>>(() => new Set([diaHoje]))
  const [modalSaldo, setModalSaldo]   = useState<{contaId:string;banco:string;icone:string;cor:string;key:string}|null>(null)
  const [modalSaldoValor, setModalSaldoValor] = useState('')

  const hojeRef = useRef<HTMLDivElement>(null)
  const categoriaSelectRef = useRef<HTMLSelectElement>(null)
  const valorInputRef = useRef<HTMLInputElement>(null)
  const { contas, categorias, extratoData, updateExtratoMes, planos, updatePlanoReal } = useApp()

  // Valor planejado (previsto) para uma categoria fixa no mês/ano atual
  function valorPrevistoCat(catId: string, catNome: string, tipoLanc: TipoLanc): number {
    const planoAno = planos[ano] as typeof planos[number] | undefined
    if (!planoAno) return 0
    const lista = tipoLanc === 'entrada' ? planoAno.entradas : planoAno.saidas
    const found = lista.find(c => (catId && c.id === catId) || c.nome === catNome)
    return found?.v[mes] ?? 0
  }

  // Grava no planosReal o valor realizado de uma categoria fixa para o mês atual
  function atualizarRealFixa(catId: string, catNome: string, tipoLanc: TipoLanc, valor: number) {
    updatePlanoReal(ano, prev => {
      const campo = tipoLanc === 'entrada' ? 'entradas' : 'saidas'
      const lista = campo === 'entradas' ? prev.entradas : prev.saidas
      const existe = lista.some(c => (catId && c.id === catId) || c.nome === catNome)
      const novaLista = existe
        ? lista.map(c => ((catId && c.id === catId) || c.nome === catNome)
            ? { ...c, v: c.v.map((v, i) => i === mes ? valor : v) }
            : c)
        : (() => {
            const cat = categorias.find(c => c.id === catId || c.nome === catNome)
            const newV = new Array(12).fill(0); newV[mes] = valor
            return [...lista, { id: catId, nome: catNome, t: cat?.tipoMovimento, v: newV }]
          })()
      return campo === 'entradas' ? { ...prev, entradas: novaLista } : { ...prev, saidas: novaLista }
    })
  }
  const contasExtrato = contas.filter(c => c.tipo === 'corrente' || c.tipo === 'poupanca')
  const isDinheiro = modo === 'dinheiro'
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
      valor: (() => { const vp = valorPrevistoCat(c.id, c.nome, c.tipo as TipoLanc); return vp > 0 ? vp : (c.valorPadrao ?? 0) })(),
      tipo: c.tipo as TipoLanc,
      formaPagamento: formaPagCategoria(c.formaPagamento, c.tipoMovimento),
      diaVencimento: c.diaVencimento ?? 1,
    }))
  const fixasCartao: CatFixa[] = useMemo(() => {
    if (isDinheiro) return []
    let faturasDados: Record<string, { lancamentos: Record<number, { tipo: string; valor: number }[]> }> = {}
    try { const r = localStorage.getItem('compass_fatura_dados'); if (r) faturasDados = JSON.parse(r) } catch { /**/ }

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
  }, [contas, contaIdEfetivo, ano, mes, dados, contasExtrato])
  const fixas = [...fixasCategoria, ...fixasCartao]
  const categoriasVariaveis = categorias
    .filter(c => c.tipo === fTipo && (!isDinheiro || c.tipoMovimento === 'dinheiro'))
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
    setDiasAbertos(new Set(eMesAtual ? [diaHoje] : []))
  }, [contaId, mes, ano])

  useEffect(() => { if (isDinheiro) setFPag('dinheiro') }, [modo])

  useEffect(() => {
    if (modo === 'dinheiro') {
      const k = mesKey('dinheiro', ano, mes)
      setModalSaldoValor(dados[k]?.saldoBanco ?? '')
      setModalSaldo({contaId:'dinheiro', banco:'Dinheiro', icone:'💵', cor:'#16a34a', key:k})
      return
    }
    if (modo !== 'banco') return
    const conta = contasExtrato.find(c => c.id === contaId) ?? contasExtrato[0]
    if (!conta) return
    const k = mesKey(conta.id, ano, mes)
    setModalSaldoValor(dados[k]?.saldoBanco ?? '')
    setModalSaldo({contaId:conta.id, banco:conta.banco, icone:conta.icone, cor:conta.cor, key:k})
  }, [modo])

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
    setFTipo('saida'); setFCat(''); setFDesc(''); setFValor(''); setFContaDestino('')
    setTimeout(() => categoriaSelectRef.current?.focus(), 50)
  }

  function editarLancamento(dia: number, l: Lancamento) {
    setDiaSel(dia); setEditandoId(l.id); setEditandoDiaOriginal(dia); setEditandoFixaId(null)
    setFTipo(l.tipo); setFCat(l.categoria); setFDesc(l.descricao)
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
  function updateMesPorKey(targetKey: string, fn: (prev: DadosMes) => DadosMes) {
    updateExtratoMes(targetKey, fn as unknown as (prev: import('../context/AppContext').DadosMes) => import('../context/AppContext').DadosMes)
  }

  function confirmarModalSaldo() {
    if (!modalSaldo) return
    const n = parseBRL(modalSaldoValor)
    if (modalSaldoValor.trim()) {
      updateMesPorKey(modalSaldo.key, prev => ({...prev, saldoBanco: fmt(n)}))
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

  const saldosDia = useMemo(() => {
    const dadosMesAtual = dados[key]
    const lancs     = (dadosMesAtual ?? { lancamentos:{} }).lancamentos
    const overrides = dadosMesAtual?.fixasMovidas
    const fc    = fixas.filter(f => !ehCartaoCategoria(categorias, f.categoria))
    const mesPast = ano < anoHoje || (ano === anoHoje && mes < mesHoje)
    let saldo = SALDO_INICIAL
    const res: Record<number,number> = {}
    for (let d=1; d<=totalDias; d++) {
      const dPast = mesPast || (eMesAtual && d < diaHoje)
      const dHoje = eMesAtual && d === diaHoje
      fc.filter(f=>diaEfetivoFixa(f,overrides,ehAutomatico(f),mes,ano,totalDias)===d)
        .forEach(f => {
          if (dPast || dHoje) {
            // passado/hoje: só fixas confirmadas entram no saldo acumulado
            const conf = dadosMesAtual?.fixasConsolidadas?.[f.id]
            const confirmada = conf !== undefined ? conf : (ehAutomatico(f) && dPast)
            if (!confirmada) return
          }
          const v = dadosMesAtual?.fixasValorOverride?.[f.id] ?? f.valor
          saldo += f.tipo==='entrada' ? v : -v
        })
      ;(lancs[d]??[]).forEach(l=>{ saldo += l.tipo==='entrada'?l.valor:-l.valor })
      res[d] = saldo
    }
    return res
  }, [dados, key, contaId, totalDias, mes, ano, categorias, eMesAtual, diaHoje, anoHoje, mesHoje])

  const { totalEntradas, totalSaidas } = useMemo(() => {
    const dadosMesAtual = dados[key]
    const lancs     = (dadosMesAtual ?? { lancamentos:{} }).lancamentos
    const overrides = dadosMesAtual?.fixasMovidas
    const fc    = fixas.filter(f => !ehCartaoCategoria(categorias, f.categoria))
    const mesPast = ano < anoHoje || (ano === anoHoje && mes < mesHoje)
    const dPassado = (d: number) => mesPast || (eMesAtual && d < diaHoje)
    let te=0, ts=0
    for (let d=1; d<=totalDias; d++) {
      fc.filter(f => diaEfetivoFixa(f,overrides,ehAutomatico(f),mes,ano,totalDias)===d)
        .filter(f => {
          const c = dadosMesAtual?.fixasConsolidadas?.[f.id]
          return c !== undefined ? c : (ehAutomatico(f) && dPassado(d))
        })
        .forEach(f=>{ const v = dadosMesAtual?.fixasValorOverride?.[f.id] ?? f.valor; f.tipo==='entrada'?te+=v:ts+=v })
      ;(lancs[d]??[]).forEach(l=>{ l.tipo==='entrada'?te+=l.valor:ts+=l.valor })
    }
    return { totalEntradas:te, totalSaidas:ts }
  }, [dados, key, contaId, totalDias, mes, ano, categorias])

  const saldoMes   = SALDO_INICIAL + totalEntradas - totalSaidas
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
      if (mesDados.fixasConsolidadas?.[editandoFixaId] === true) {
        const f = fixasCategoria.find(f => f.id === editandoFixaId)
        if (f) atualizarRealFixa(editandoFixaId, f.nome, f.tipo, valor)
      }
      setEditandoFixaId(null)
      setFCat(''); setFDesc(''); setFValor('')
      setTimeout(() => categoriaSelectRef.current?.focus(), 80)
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
      setFCat(''); setFDesc(''); setFValor(''); setFContaDestino('')
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
        {([['consolidado','📊 Consolidado'],['banco','🏦 Extrato Bancário'],['cartao','💳 Fatura Cartão'],['dinheiro','💵 Dinheiro']] as const).map(([v,l]) => (
          <button key={v} onClick={() => setModo(v)} style={{
            padding:'7px 16px',borderRadius:8,
            border:`1.5px solid ${modo===v?COR.azul:COR.borda}`,
            cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'inherit',
            background:modo===v?COR.azul:'#f8faff',color:modo===v?'#fff':COR.textoSuave}}>
            {l}
          </button>
        ))}
      </div>

      {modo==='consolidado' ? <ExtratoConsolidado /> : modo==='cartao' ? <FaturaCartao /> : (
      <>
      {/* ABAS DE BANCO — ocultas no modo dinheiro */}
      {!isDinheiro && (
      <div style={{background:COR.branco,borderBottom:`1px solid ${COR.borda}`,
        padding:'10px 16px 0',flexShrink:0,display:'flex',gap:3,overflowX:'auto'}}>
        {contasExtrato.map(c => {
          const ativa = c.id===contaIdEfetivo
          return (
            <button key={c.id} onClick={() => {
              setContaId(c.id)
              resetarParaNovo(diaDefaultPara(mes,ano))
              const k = mesKey(c.id, ano, mes)
              setModalSaldoValor(dados[k]?.saldoBanco ?? '')
              setModalSaldo({contaId:c.id, banco:c.banco, icone:c.icone, cor:c.cor, key:k})
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
      )}

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
        padding:'10px 16px',flexShrink:0,
        display:'flex',flexDirection:'row',
        alignItems:'center',gap:14,flexWrap:'wrap'}}>

        {isDinheiro ? (<>
          {/* Dinheiro — linha única (igual ao banco) */}
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{fontSize:13,color:COR.textoSuave,fontWeight:500}}>Saldo dinheiro atual:</span>
            <input value={mesDados.saldoBanco}
              onChange={e => updateMes(prev=>({...prev,saldoBanco:e.target.value}))}
              onFocus={e => e.target.select()}
              onBlur={e => { const n = parseBRL(e.target.value); if (!isNaN(n) && e.target.value.trim()) updateMes(prev=>({...prev,saldoBanco:fmt(n)})) }}
              placeholder="R$ 0,00"
              style={{border:`1px solid #16a34a55`,borderRadius:6,padding:'4px 10px',
                fontSize:13,fontWeight:700,color:'#16a34a',background:'#16a34a18',
                outline:'none',width:130,textAlign:'right',fontFamily:'inherit'}}/>
          </div>
          <span style={{fontSize:13,fontWeight:500,padding:'4px 10px',borderRadius:6,
            display:'inline-flex',alignItems:'center',gap:5,
            background:'#16a34a18',border:'1px solid #16a34a55'}}>
            <span>💵</span>
            <span style={{color:'#16a34a',fontWeight:600}}>Dinheiro</span>
            <span style={{fontWeight:700,color:saldoMes<0?COR.vermelho:COR.texto}}>{fmt(saldoMes)}</span>
          </span>
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
          <div style={{display:'flex',alignItems:'center',gap:5}}>
            <span style={{fontSize:13,color:COR.textoSuave,fontWeight:500}}>Previsto fim do mês:</span>
            <span style={{fontSize:16,fontWeight:800,
              color:(saldosDia[totalDias]??saldoMes)<0?COR.vermelho:'#64748b'}}>
              {fmt(saldosDia[totalDias]??saldoMes)}
            </span>
          </div>
        </>) : (<>
          {/* Banco — linha única */}
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{fontSize:13,color:COR.textoSuave,fontWeight:500}}>Saldo atual banco:</span>
            <input value={mesDados.saldoBanco}
              onChange={e => updateMes(prev=>({...prev,saldoBanco:e.target.value}))}
              onFocus={e => e.target.select()}
              onBlur={e => { const n = parseBRL(e.target.value); if (!isNaN(n) && e.target.value.trim()) updateMes(prev=>({...prev,saldoBanco:fmt(n)})) }}
              placeholder="R$ 0,00"
              style={{border:`1px solid ${contaInfo?.cor ?? COR.azul}55`,borderRadius:6,padding:'4px 10px',
                fontSize:13,fontWeight:700,color:contaInfo?.cor ?? COR.azul,background:`${contaInfo?.cor ?? COR.azul}18`,
                outline:'none',width:130,textAlign:'right',fontFamily:'inherit'}}/>
          </div>
          {contaInfo && (
            <span style={{fontSize:13,fontWeight:500,padding:'4px 10px',borderRadius:6,
              display:'inline-flex',alignItems:'center',gap:5,
              background:contaInfo.cor+'18',border:`1px solid ${contaInfo.cor}55`}}>
              <span>{contaInfo.icone}</span>
              <span style={{color:contaInfo.cor,fontWeight:600}}>{contaInfo.banco}</span>
              <span style={{fontWeight:700,color:saldoMes<0?COR.vermelho:COR.texto}}>{fmt(saldoMes)}</span>
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
          <div style={{display:'flex',alignItems:'center',gap:5}}>
            <span style={{fontSize:13,color:COR.textoSuave,fontWeight:500}}>Previsto fim do mês:</span>
            <span style={{fontSize:16,fontWeight:800,
              color:(saldosDia[totalDias]??saldoMes)<0?COR.vermelho:'#64748b'}}>
              {fmt(saldosDia[totalDias]??saldoMes)}
            </span>
          </div>
        </>)}
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
          // Confirmados: fixas consolidadas (ou automáticas em dia passado) + lancamentos manuais
          const entradasConf =
            fs.filter(f => f.tipo==='entrada' && (
              mesDados.fixasConsolidadas?.[f.id] !== undefined
                ? mesDados.fixasConsolidadas[f.id]
                : (ehAutomatico(f) && passado)
            ))
            .reduce((s,f) => s + (mesDados.fixasValorOverride?.[f.id] ?? f.valor), 0)
            + ls.filter(l => l.tipo==='entrada').reduce((s,l) => s + l.valor, 0)
          const saidasConf =
            fs.filter(f => f.tipo==='saida' && (
              mesDados.fixasConsolidadas?.[f.id] !== undefined
                ? mesDados.fixasConsolidadas[f.id]
                : (ehAutomatico(f) && passado)
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
          const corIni    = saldoIni<0 ? COR.vermelho : COR.verde
          const corSaldo  = saldoDia<0 ? COR.vermelho : COR.verde

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

                {/* Inicial | Entradas | Saída | Final */}
                <div style={{flex:1,display:'flex',alignItems:'center',
                  justifyContent:'flex-end',gap:6}}>

                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',
                    padding:'5px 10px',borderRadius:8,minWidth:150,
                    background:diaFuturo?'#f8faff':saldoIni<0?'#fff1f2':'#f0fdf4',
                    border:`1px solid ${diaFuturo?COR.borda:saldoIni<0?'#fecdd3':'#bbf7d0'}`}}>
                    <span style={{fontSize:10,fontWeight:600,
                      textTransform:'uppercase',letterSpacing:.4,marginBottom:1,
                      color:diaFuturo?'#94a3b8':corIni}}>Inicial</span>
                    <span style={{fontSize:13,fontWeight:700,
                      color:diaFuturo?'#64748b':corIni}}>{fmt(saldoIni)}</span>
                  </div>

                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',
                    padding:'5px 10px',borderRadius:8,minWidth:150,
                    background:entradasConf>0?'#eff6ff':'#f8faff',
                    border:`1px solid ${entradasConf>0?'#bfdbfe':COR.borda}`}}>
                    <span style={{fontSize:10,fontWeight:600,textTransform:'uppercase',
                      letterSpacing:.4,marginBottom:1,
                      color:entradasConf>0?COR.azul:'#94a3b8'}}>
                      Entradas
                    </span>
                    <span style={{fontSize:13,fontWeight:700,
                      color:entradasConf>0?COR.azul:entradasDia>0?'#94a3b8':'#94a3b8'}}>
                      {entradasBoxVal===0?'—':`+${fmt(entradasBoxVal)}`}
                    </span>
                  </div>

                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',
                    padding:'5px 10px',borderRadius:8,minWidth:150,
                    background:saidasConf>0?'#fff1f2':'#f8faff',
                    border:`1px solid ${saidasConf>0?'#fecdd3':COR.borda}`}}>
                    <span style={{fontSize:10,fontWeight:600,textTransform:'uppercase',
                      letterSpacing:.4,marginBottom:1,
                      color:saidasConf>0?COR.vermelho:'#94a3b8'}}>
                      Saída
                    </span>
                    <span style={{fontSize:13,fontWeight:700,
                      color:saidasConf>0?COR.vermelho:saidasDia>0?'#94a3b8':'#94a3b8'}}>
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
                    <span style={{fontSize:13,fontWeight:700,
                      color:diaFuturo?'#64748b':corSaldo}}>{fmt(saldoDia)}</span>
                  </div>
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
                  : (automatico ? passado : false)
                const corValor = consolidada ? (f.tipo==='entrada'?COR.azul:COR.vermelho) : '#94a3b8'
                const emEdicaoFixa = editandoFixaId === f.id
                const valorMostrado = mesDados.fixasValorOverride?.[f.id] ?? f.valor
                return (
                <div key={f.id} onClick={e => e.stopPropagation()}
                  style={{background:emEdicaoFixa?'#eff6ff':'transparent'}}>
                  <div onClick={() => editarFixa(dia, f)}
                    style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',
                    padding:'10px 16px',borderBottom:`1px solid #f1f5f9`}}>
                    {(ehFaturaFixa || !(passado && automatico)) && (
                      <input type="checkbox" checked={consolidada}
                        onClick={e => e.stopPropagation()}
                        onChange={() => {
                          if (consolidada) {
                            desconsolidarFixa(f.id)
                            atualizarRealFixa(f.id, f.nome, f.tipo, valorPrevistoCat(f.id, f.nome, f.tipo))
                          } else {
                            updateMes(prev => ({
                              ...prev,
                              fixasConsolidadas: { ...prev.fixasConsolidadas, [f.id]: true }
                            }))
                            atualizarRealFixa(f.id, f.nome, f.tipo, mesDados.fixasValorOverride?.[f.id] ?? f.valor)
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
                        {ehFaturaFixa ? 'Cartão de Crédito' : f.nome}
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
                        {ehFaturaFixa
                          ? `${f.categoria}${f.nome !== f.categoria ? ' · ' + f.nome : ''}`
                          : f.categoria
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
          {!(editandoFixaId && fixaEhAutomatica) && (
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
          )}
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
