import { diaNoMes } from '../utils/diasDaFatura'
import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { useToast } from '../components/Toast'
import { lancamentoAntesDoSaldo } from '../utils/saldoDesde'
import type { DadosMes as ExtratoDadosMes } from '../context/AppContext'
import {
  COR, DADOS_MES_VAZIO,
  diasNoMes, mesKey, fmt, parseBRL, parseDateFatura, dataCompraPadrao,
  type TipoLanc, type FormaPag, type Lancamento, type DadosMes,
} from '../components/faturaCartao/FcShared'
import FcMobileView from '../components/faturaCartao/FcMobileView'
import FcBanner from '../components/faturaCartao/FcBanner'
import FcDesktopLeft from '../components/faturaCartao/FcDesktopLeft'
import FcDesktopPanel from '../components/faturaCartao/FcDesktopPanel'
import FcModal from '../components/faturaCartao/FcModal'
import FcConfirmModal from '../components/faturaCartao/FcConfirmModal'
import NleNovaCategoria from '../components/novoLancamentoExtrato/NleNovaCategoria'
import { resolverFixaDoMes, dadosBancariosDoMes } from '../utils/fixasDoMes'
import { useLarguraMenorQue } from '../utils/larguraTela'
import { faturaAbertaNaTela, mesmoMes } from '../utils/lancarPorMes'
import { pedeValorDaFatura } from '../utils/pedirValorDaFatura'

function useIsMobile() {
  return useLarguraMenorQue(640)
}

type Props = {
  mobileSelecionado?: string
  onVoltar?: () => void
  onCartaoChange?: (id: string) => void
  mes: number
  setMes: React.Dispatch<React.SetStateAction<number>>
  ano: number
  setAno: React.Dispatch<React.SetStateAction<number>>
}

export default function FaturaCartao({ mobileSelecionado, onCartaoChange, mes, setMes, ano, setAno }: Props) {
  const hoje    = new Date()
  const diaHoje = hoje.getDate()
  const mesHoje = hoje.getMonth()
  const anoHoje = hoje.getFullYear()
  const hojeStr = hoje.toISOString().slice(0,10)
  const isMobile = useIsMobile()
  const { toast } = useToast()
  const [mobileView, setMobileView] = useState<'extrato'|'form'>('extrato')

  const { contas, categorias, setCategorias, planos, faturaData, setFaturaData, extratoData, setExtratoData, carregando } = useApp()
  // "+ Nova" categoria, a mesma caixa de Lançamentos, criando categoria de cartão.
  const [novaCatAberta, setNovaCatAberta] = useState(false)
  const contasCartao = contas.filter(c => c.tipo === 'cartao')
  const dados = faturaData as Record<string, DadosMes>
  const setDados = setFaturaData as React.Dispatch<React.SetStateAction<Record<string, DadosMes>>>
  const extratoRef = useRef(extratoData)
  useEffect(() => { extratoRef.current = extratoData }, [extratoData])

  const [contaId,  setContaId]  = useState(() => mobileSelecionado ?? contasCartao[0]?.id ?? 'c1')
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
  const [editFechVal, setEditFechVal] = useState(1)
  const [editVencVal, setEditVencVal] = useState(1)
  const [fVariante, setFVariante] = useState('')
  const [modalFatura, setModalFatura]       = useState(false)
  const [modalFaturaValor, setModalFaturaValor] = useState('')
  const [confirmacao, setConfirmacao] = useState<{ mensagem: string; detalhe?: string; onConfirmar: () => void } | null>(null)

  function pedirConfirmacao(mensagem: string, onConfirmar: () => void, detalhe?: string) {
    setConfirmacao({ mensagem, detalhe, onConfirmar })
  }

  const categoriaSelectRef  = useRef<HTMLSelectElement>(null)
  const valorInputRef       = useRef<HTMLInputElement>(null)
  const dataCompraRef       = useRef<HTMLInputElement>(null)
  const parcelasBtnRefs     = useRef<(HTMLButtonElement|null)[]>([])

  const contaInfo        = contas.find(c => c.id === contaId)
  const diaFechamentoBase = contaInfo?.diaFechamento ?? 1
  const diaVencimentoBase = contaInfo?.diaVencimento ?? 1
  const billingOffset    = diaVencimentoBase < diaFechamentoBase ? 1 : 0

  let _pMes = mes - billingOffset, _pAno = ano
  if (_pMes < 0) { _pMes += 12; _pAno-- }
  const purchaseMes   = _pMes
  const purchaseAno   = _pAno

  const totalDias     = diasNoMes(purchaseMes, purchaseAno)
  const eMesAtual     = purchaseMes === mesHoje && purchaseAno === anoHoje
  const key           = mesKey(contaId, purchaseAno, purchaseMes)
  const mesDados      = dados[key] ?? DADOS_MES_VAZIO

  const diaFechamento = mesDados.fechamentoOverride ?? diaFechamentoBase
  const diaVencimento = mesDados.vencimentoOverride ?? diaVencimentoBase

  const mesVenc = mes
  const anoVenc = ano

  // "Paga" passa a significar CONCILIADA no extrato, nao "a data de vencimento
  // ja passou". A data so diz que era para ter sido paga — o banco pode recusar,
  // a fatura pode ser contestada. Mesma correcao feita nas fixas automaticas:
  // nao assumir o que ninguem confirmou.
  //
  // O pagamento entra no extrato bancario como a fixa "cartao-<id>", no mes de
  // VENCIMENTO, em qualquer conta de banco.
  //
  // Lê o EXTRATO (extratoData), e não `dados`: nesta tela `dados` é a FATURA,
  // que só tem chaves de cartão — justamente as que o filtro abaixo descarta.
  // Lendo `dados`, a busca voltava sempre vazia e "Paga" nunca aparecia, para
  // cartão nenhum; e o aviso diário do valor da fatura abria até em fatura já
  // paga. Corrigido em 26/09/2026, relatado pelo Guilherme (prova30).
  const faturaPaga = useMemo(() => {
    const dms = dadosBancariosDoMes(
      extratoData as Record<string, { fixasConsolidadas?: Record<string, boolean> }>,
      `-${anoVenc}-${String(mesVenc + 1).padStart(2, '0')}`,
      k => contas.some(c => c.tipo === 'cartao' && k.startsWith(c.id)),
    )
    return resolverFixaDoMes(`cartao-${contaId}`, dms).consolidada
  }, [extratoData, contas, contaId, anoVenc, mesVenc])

  const faturaStatus =
    faturaPaga ? 'paga' :
    new Date(purchaseAno, purchaseMes, diaFechamento) <= hoje ? 'fechada' : 'aberta'

  // Inativa fica fora da lista — nao se escolhe uma categoria morta para uma
  // compra nova. A excecao e a que esta sendo EDITADA: editarLancamento
  // carrega fCat a partir do lancamento gravado, e uma parcela antiga pode
  // apontar para categoria ja inativada. Sem esta linha o <select> ficava com
  // um value sem <option> correspondente — em branco na tela — e salvar
  // trocava a categoria da parcela sem que ninguem tivesse pedido.
  const categoriasCartao = categorias
    .filter(c => c.tipo === 'saida'
      && (c.ativa || c.nome.trim().toLowerCase() === fCat.trim().toLowerCase()))
    .sort((a,b) => a.nome.localeCompare(b.nome,'pt-BR'))

  // Sincroniza totais das faturas como lançamentos previstos no extrato bancário
  useEffect(() => {
    const extrato = { ...extratoRef.current } as Record<string, { lancamentos: Record<number, unknown[]>; saldoBanco: string }>

    for (const fatKey of Object.keys(dados)) {
      const parts = fatKey.split('-')
      if (parts.length !== 3) continue
      const [cId, aStr, mStr] = parts
      const a = parseInt(aStr)
      const m = parseInt(mStr) - 1
      if (isNaN(a) || isNaN(m)) continue

      const contaCartao = contas.find(c => c.id === cId && c.tipo === 'cartao')
      if (!contaCartao) continue

      const diaFechBase = contaCartao.diaFechamento ?? 1
      const diaVencBase = contaCartao.diaVencimento ?? 1

      let vencMes = m, vencAno = a
      if (diaVencBase < diaFechBase) {
        vencMes = m + 1
        if (vencMes > 11) { vencMes = 0; vencAno++ }
      }

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

  // Auto-avança para a aba do mês de vencimento da fatura em aberto ao ABRIR
  // a tela. Trocar de cartão mantém o mês escolhido (22/10/2026, pedido do
  // Guilherme: no cartão B pulava para a fatura atual), SALVO quando o mês na
  // tela era a fatura em aberto do cartão anterior: aí vai para a fatura em
  // aberto do novo (28/10/2026, pedido dele: Sicredi fechado em dezembro, XP
  // aberto em novembro, e a troca deixava em dezembro). Mês olhado de
  // propósito, que não é a fatura em aberto, fica. `faturaAbertaNaTela`.
  const contaPosicionada = useRef<string | null>(null)
  useEffect(() => {
    const conta = contas.find(c => c.id === contaId)
    if (!conta) return
    const anterior = contaPosicionada.current
    if (anterior === contaId) return
    contaPosicionada.current = contaId
    const aberta = faturaAbertaNaTela(conta, hoje)
    if (anterior !== null) {
      const contaAnterior = contas.find(c => c.id === anterior)
      if (!contaAnterior || !mesmoMes(faturaAbertaNaTela(contaAnterior, hoje), { ano, mes })) return
      if (mesmoMes(aberta, { ano, mes })) return
    }
    setMes(aberta.mes); setAno(aberta.ano)
    setDiaSel(diaDefaultPara(aberta.mes, aberta.ano))
  }, [contaId, contas]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (mobileSelecionado) setContaId(mobileSelecionado) }, [mobileSelecionado])
  useEffect(() => { onCartaoChange?.(contaId) }, [contaId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Modal "valor da fatura" — abre uma vez por dia por fatura
  useEffect(() => {
    if (carregando) return
    const dm = dados[key] ?? DADOS_MES_VAZIO
    if (!pedeValorDaFatura({
      perguntouHoje: dm.faturaAtualData === hojeStr,
      totalAgora: totalFatura,
      totalNaUltimaVez: dm.faturaAtualTotal,
      informado: parseBRL(dm.faturaAtual ?? ''),
    })) return
    // Só a fatura EM ABERTO de agora pede o valor: a que fecha no próximo
    // fechamento. Fechada, paga ou futura, não — passando os meses a janela
    // abria em cada um (pedido do Guilherme, 21/10/2026).
    if (faturaStatus !== 'aberta') return
    if (new Date(purchaseAno, purchaseMes - 1, diaFechamentoBase) > hoje) return
    const t = setTimeout(() => {
      setModalFaturaValor(dm.faturaAtual ?? '')
      setModalFatura(true)
    }, 50)
    return () => clearTimeout(t)
  }, [key, carregando, faturaStatus]) // eslint-disable-line react-hooks/exhaustive-deps



  function diaDefaultPara(novoMes: number, novoAno: number) {
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
      updateMes(prev => ({...prev, faturaAtual: fmt(n), faturaAtualData: hojeStr, faturaAtualTotal: totalFatura}))
    } else {
      updateMes(prev => ({...prev, faturaAtualData: hojeStr, faturaAtualTotal: totalFatura}))
    }
    setModalFatura(false)
    setTimeout(() => dataCompraRef.current?.focus(), 80)
  }

  function pularModalFatura() {
    updateMes(prev => ({...prev, faturaAtualData: hojeStr, faturaAtualTotal: totalFatura}))
    setModalFatura(false)
  }

  function resetarParaNovo(novoDia: number) {
    setDiaSel(novoDia); setEditandoId(null); setEditandoDiaOriginal(null)
    setFTipo('entrada'); setFCat(''); setFDesc(''); setFVariante(''); setFValor(''); setFParcelas('1'); setFDataCompra('')
    setTimeout(() => dataCompraRef.current?.focus(), 50)
  }

  function editarLancamento(dia: number, l: Lancamento) {
    setDiaSel(dia); setEditandoId(l.id); setEditandoDiaOriginal(dia)
    setFTipo(l.tipo); setFCat(l.categoria.trim()); setFDesc(l.descricao); setFVariante((l.subCategoria ?? '').trim())
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

  const totalFatura  = totalEntradas - totalSaidas
  const faturaExtNum = parseBRL(mesDados.faturaAtual ?? '')
  const diferenca    = faturaExtNum > 0 ? faturaExtNum - totalFatura : null
  const conciliado   = diferenca !== null && Math.abs(diferenca) < 0.01

  const totalPrevisto = useMemo(() => {
    const planosAno = (planos as Record<number, { saidas: { nome: string; v: number[] }[] }>)[ano]
    if (!planosAno) return 0
    return planosAno.saidas
      .filter(pc => {
        const cat = categorias.find(c => c.nome === pc.nome)
        return cat?.tipoMovimento === 'cartao' && cat?.ativa
      })
      .reduce((s, pc) => s + (pc.v[mes] ?? 0), 0)
  }, [planos, categorias, ano, mes])

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

  // Editando a parcela k de N (k < N): avisa que um valor novo vale também
  // para as seguintes, a regra de lancar() (22/10/2026).
  const parcelaEditada = editandoId && editandoDiaOriginal !== null
    ? (mesDados.lancamentos[editandoDiaOriginal] ?? []).find(l => l.id === editandoId)
    : undefined
  const avisoParcelas = parcelaEditada?.parcelas && (parcelaEditada.parcelaAtual ?? 1) < parcelaEditada.parcelas
    ? ((parcelaEditada.parcelaAtual ?? 1) + 1 === parcelaEditada.parcelas
      ? `Um valor novo vale também para a parcela ${parcelaEditada.parcelas}.`
      : `Um valor novo vale também para as parcelas ${(parcelaEditada.parcelaAtual ?? 1) + 1} a ${parcelaEditada.parcelas}.`)
    : undefined

  function lancar() {
    const valorParcela = parseBRL(fValor)
    const nParcelas    = Math.max(1, parseInt(fParcelas) || 1)
    if (!fCat || valorParcela <= 0) return
    const baseId = `v-${Date.now()}`
    const norm = fCat.trim().toLowerCase()
    const subDescsDisponiveis = categoriasCartao
      .filter(c => c.nome.trim().toLowerCase() === norm && c.descricao?.trim())
      .map(c => c.descricao!.trim())
    // Grava a variante sempre que ela for valida para a categoria. Antes exigia
    // 2+ variantes cadastradas: com uma variante so, nada era gravado e o
    // lancamento ficava orfao ("Seguro" puro, sem casar com o planejamento).
    const varianteEscolhida = fVariante.trim()
    const subCatToSave = varianteEscolhida && subDescsDisponiveis.includes(varianteEscolhida)
      ? varianteEscolhida
      : undefined
    // Campo vazio numa compra nova = HOJE, como se a pessoa tivesse digitado a
    // data de hoje (o dia do lançamento acompanha, como no onBlur do campo).
    const compraVazia = !editandoId && !fDataCompra.trim()
    const parsedCompra = parseDateFatura(fDataCompra, purchaseMes, purchaseAno)
      ?? (compraVazia ? dataCompraPadrao() : null)
    const diaLanc = compraVazia ? diaHoje : diaSel
    const diaCompraFinal = parsedCompra?.dia ?? diaLanc
    const mesCompraFinal = parsedCompra?.mes ?? purchaseMes
    const anoCompraFinal = parsedCompra?.ano ?? purchaseAno
    // Compra antes do valor de fatura informado já está nele (utils/saldoDesde).
    if (!editandoId) {
      const trava = lancamentoAntesDoSaldo(contaInfo, anoCompraFinal, mesCompraFinal, diaCompraFinal)
      if (trava) { toast(trava, 'error'); return }
    }

    const routeToNext = !editandoId && (() => {
      if (anoCompraFinal > purchaseAno) return true
      if (anoCompraFinal < purchaseAno) return false
      if (mesCompraFinal > purchaseMes) return true
      if (mesCompraFinal < purchaseMes) return false
      // No dia do fechamento a compra já vai para a fatura seguinte.
      return diaCompraFinal >= diaFechamento
    })()
    let targetMes = purchaseMes, targetAno = purchaseAno
    if (routeToNext) {
      targetMes++; if (targetMes > 11) { targetMes = 0; targetAno++ }
    }

    if (editandoId) {
      const diaOrigem = editandoDiaOriginal ?? diaLanc
      const idAtual   = editandoId
      const futuroAlvo = ehDiaFuturo(diaLanc)
      setDados(prev => {
        const dmCurrent = prev[key] ?? DADOS_MES_VAZIO
        const listaOrigem = dmCurrent.lancamentos[diaOrigem] ?? []
        const entrada = listaOrigem.find(l => l.id === idAtual)
        if (!entrada) return prev
        const novoConsolidado = diaOrigem !== diaLanc ? !futuroAlvo : entrada.consolidado
        const atualizada: Lancamento = {
          ...entrada, tipo:fTipo, descricao:fDesc.trim()||fCat, categoria:fCat,
          subCategoria: subCatToSave,
          valor:valorParcela, formaPagamento:'credito', consolidado:novoConsolidado,
          parcelas:nParcelas>1?nParcelas:undefined, parcelaAtual:entrada.parcelaAtual,
          diaCompra:diaCompraFinal, mesCompra:mesCompraFinal, anoCompra:anoCompraFinal,
        }
        const dmUpdated = diaOrigem === diaLanc
          ? { ...dmCurrent, lancamentos: { ...dmCurrent.lancamentos, [diaOrigem]: listaOrigem.map(l => l.id===idAtual ? atualizada : l) } }
          : {
              ...dmCurrent,
              lancamentos: {
                ...dmCurrent.lancamentos,
                [diaOrigem]: listaOrigem.filter(l => l.id !== idAtual),
                [diaLanc]: [...(dmCurrent.lancamentos[diaLanc] ?? []), atualizada],
              },
            }
        let result = { ...prev, [key]: dmUpdated }
        const novaDesc = fDesc.trim() || fCat
        // So a parcela 1 (mae) propaga para as demais. Editar uma filha altera
        // apenas ela — parcelas podem ter valores diferentes entre si.
        //
        // Categoria e variante sao da COMPRA: salvar a mae sempre alinha as
        // filhas. Antes so propagava quando categoria, descricao ou valor
        // mudavam — trocar so a VARIANTE deixava as parcelas 2..N sem ela, e
        // esse dinheiro nao casava com nenhuma linha do plano (Academia com
        // Martin e Gui: dezembro em diante caia em "Academia" pura). Bug
        // relatado em 08/10/2026. Salvar a mae de novo conserta as que ja
        // ficaram para tras. Descricao e valor so vao quando mudaram: uma
        // filha pode ter valor proprio.
        //
        // VALOR corrigido em QUALQUER parcela segue para as SEGUINTES; as
        // anteriores ficam (22/10/2026, pedido do Guilherme: a 1ª foi 103,15 e
        // as outras 103,05 — corrigir a 2ª corrige da 3ª em diante, sem ir uma
        // a uma). Editar uma filha continua sem mexer em categoria e descricao.
        const currentParcela = entrada.parcelaAtual ?? 1
        const ehMae = currentParcela === 1
        const mudouDesc = ehMae && novaDesc !== entrada.descricao
        const mudouValor = valorParcela !== entrada.valor
        if ((ehMae || mudouValor) && entrada.parcelas && entrada.parcelas > 1) {
          const baseId = entrada.id.replace(/-\d+$/, '')
          const totalParcelas = entrada.parcelas
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
            const targetId = `${baseId}-${p}`
            if (!sibDm?.lancamentos) continue
            let dmChanged = false
            const newLancs: Record<number, Lancamento[]> = {}
            for (const [dStr, list] of Object.entries(sibDm.lancamentos)) {
              const d = parseInt(dStr)
              const newList = (list as Lancamento[]).map(l => {
                if (l.id !== targetId) return l
                const nova = {
                  ...l,
                  ...(ehMae ? { categoria: fCat, subCategoria: subCatToSave } : {}),
                  ...(mudouDesc ? { descricao: novaDesc } : {}),
                  ...(mudouValor && p > currentParcela ? { valor: valorParcela } : {}),
                }
                if (nova.categoria === l.categoria && nova.subCategoria === l.subCategoria
                  && nova.descricao === l.descricao && nova.valor === l.valor) return l
                dmChanged = true
                return nova
              })
              newLancs[d] = newList
            }
            if (dmChanged) result = { ...result, [sibKey]: { ...sibDm, lancamentos: newLancs } }
          }
        }
        return result
      })
    } else if (nParcelas > 1) {
      setDados(prev => {
        let result = { ...prev }
        for (let p = 1; p <= nParcelas; p++) {
          let m = targetMes + (p - 1)
          let a = targetAno
          while (m > 11) { m -= 12; a++ }
          const k = mesKey(contaId, a, m)
          const dadosMes = result[k] ?? DADOS_MES_VAZIO
          const desc = fDesc.trim() || fCat
          // Dia 29, 30 ou 31 num mês mais curto: o último dia (utils/diasDaFatura).
          const dP = diaNoMes(diaLanc, a, m)
          result = {
            ...result,
            [k]: {
              ...dadosMes,
              lancamentos: {
                ...dadosMes.lancamentos,
                [dP]: [...(dadosMes.lancamentos[dP]??[]), {
                  id:`${baseId}-${p}`, tipo:fTipo,
                  descricao:desc, categoria:fCat, subCategoria:subCatToSave,
                  valor:valorParcela, formaPagamento:'credito' as FormaPag, tipoLanc:'variavel' as const,
                  consolidado: p===1 ? !ehDiaFuturo(diaLanc) : false,
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
      const lancKey = routeToNext ? mesKey(contaId, targetAno, targetMes) : key
      setDados(prev => {
        const dm = prev[lancKey] ?? DADOS_MES_VAZIO
        return {
          ...prev,
          [lancKey]: {
            ...dm,
            lancamentos: {
              ...dm.lancamentos,
              [diaLanc]: [...(dm.lancamentos[diaLanc]??[]), {
                id:`${baseId}-1`, tipo:fTipo,
                descricao:fDesc.trim()||fCat, categoria:fCat, subCategoria:subCatToSave,
                valor:valorParcela, formaPagamento:'credito' as FormaPag, tipoLanc:'variavel' as const,
                consolidado: !ehDiaFuturo(diaLanc),
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

  function excluirTodasParcelas(id: string, diaOrigem: number) {
    const lancamento = (dados[key]?.lancamentos[diaOrigem] ?? []).find(l => l.id === id)
    const totalParcelas = lancamento?.parcelas ?? 1
    const currentParcela = lancamento?.parcelaAtual ?? 1
    if (totalParcelas <= 1) {
      updateMes(prev => ({
        ...prev,
        lancamentos: { ...prev.lancamentos, [diaOrigem]: (prev.lancamentos[diaOrigem]??[]).filter(l=>l.id!==id) }
      }))
      return
    }
    const baseId = id.replace(/-\d+$/, '')
    setDados(prev => {
      let result = { ...prev }
      for (let p = 1; p <= totalParcelas; p++) {
        let m = mes - (currentParcela - 1) + (p - 1)
        let a = ano
        while (m < 0) { m += 12; a-- }
        while (m > 11) { m -= 12; a++ }
        const sibKey = mesKey(contaId, a, m)
        const sibDm = result[sibKey] as DadosMes | undefined
        if (!sibDm?.lancamentos) continue
        const targetId = `${baseId}-${p}`
        const newLancs: Record<number, Lancamento[]> = {}
        let changed = false
        for (const [dStr, list] of Object.entries(sibDm.lancamentos)) {
          const d = parseInt(dStr)
          const orig = list as Lancamento[]
          const filtered = orig.filter(l => l.id !== targetId)
          if (filtered.length !== orig.length) changed = true
          newLancs[d] = filtered
        }
        if (changed) result = { ...result, [sibKey]: { ...sibDm, lancamentos: newLancs } }
      }
      return result
    })
  }

  function excluirAtual() {
    if (!editandoId) return
    const diaAlvo = editandoDiaOriginal ?? diaSel
    const idAlvo = editandoId
    const lancamento = (dados[key]?.lancamentos[diaAlvo] ?? []).find(l => l.id === idAlvo)
    const totalParcelas = lancamento?.parcelas ?? 1
    const mensagem = totalParcelas > 1 ? 'Excluir parcelamento?' : 'Excluir lançamento?'
    const detalhe = totalParcelas > 1 ? `Todas as ${totalParcelas} parcelas serão removidas.` : undefined
    pedirConfirmacao(mensagem, () => {
      excluirTodasParcelas(idAlvo, diaAlvo)
      setEditandoId(null); setEditandoDiaOriginal(null)
      setFCat(''); setFDesc(''); setFVariante(''); setFValor(''); setFParcelas('1')
      if (isMobile) setMobileView('extrato')
    }, detalhe)
  }

  function excluir(dia: number, id: string) {
    const lancamento = (dados[key]?.lancamentos[dia] ?? []).find(l => l.id === id)
    const totalParcelas = lancamento?.parcelas ?? 1
    const doExcluir = () => {
      excluirTodasParcelas(id, dia)
      if (editandoId === id) {
        setEditandoId(null); setEditandoDiaOriginal(null)
        setFCat(''); setFDesc(''); setFVariante(''); setFValor(''); setFParcelas('1')
      }
      if (isMobile) setMobileView('extrato')
    }
    if (totalParcelas > 1) {
      pedirConfirmacao('Excluir parcelamento?', doExcluir, `Todas as ${totalParcelas} parcelas serão removidas.`)
    } else {
      pedirConfirmacao('Excluir lançamento?', doExcluir)
    }
  }

  // ── Mobile ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
      <FcMobileView
        contasCartao={contasCartao}
        contaId={contaId} setContaId={setContaId}
        mes={mes} setMes={setMes} ano={ano} setAno={setAno}
        anoHoje={anoHoje} diaHoje={diaHoje}
        mobileView={mobileView} setMobileView={setMobileView}
        editandoFechamento={editandoFechamento} setEditandoFechamento={setEditandoFechamento}
        editandoVencimento={editandoVencimento} setEditandoVencimento={setEditandoVencimento}
        editFechVal={editFechVal} setEditFechVal={setEditFechVal}
        editVencVal={editVencVal} setEditVencVal={setEditVencVal}
        fTipo={fTipo} setFTipo={setFTipo}
        fCat={fCat} setFCat={setFCat}
        fDesc={fDesc} setFDesc={setFDesc}
        fVariante={fVariante} setFVariante={setFVariante}
        fValor={fValor} setFValor={setFValor}
        fParcelas={fParcelas} setFParcelas={setFParcelas}
        fDataCompra={fDataCompra} setFDataCompra={setFDataCompra}
        editandoId={editandoId}
        editandoDiaOriginal={editandoDiaOriginal} avisoParcelas={avisoParcelas}
        diaSel={diaSel} setDiaSel={setDiaSel}
        diaFechamento={diaFechamento} diaVencimento={diaVencimento}
        diaFechamentoBase={diaFechamentoBase} diaVencimentoBase={diaVencimentoBase}
        mesDados={mesDados} totalDias={totalDias}
        purchaseMes={purchaseMes} purchaseAno={purchaseAno}
        faturaStatus={faturaStatus as 'paga' | 'fechada' | 'aberta'}
        totalPrevisto={totalPrevisto} grandTotalFaturas={grandTotalFaturas}
        totalFatura={totalFatura} mesVenc={mesVenc} anoVenc={anoVenc}
        categorias={categorias} categoriasCartao={categoriasCartao}
        dataCompraRef={dataCompraRef}
        categoriaSelectRef={categoriaSelectRef}
        onNovaCategoria={() => setNovaCatAberta(true)}
        valorInputRef={valorInputRef}
        parcelasBtnRefs={parcelasBtnRefs}
        resetarParaNovo={resetarParaNovo}
        editarLancamento={editarLancamento}
        excluir={excluir}
        updateMes={updateMes}
        lancar={lancar}
        diaDefaultPara={diaDefaultPara}
        diferenca={diferenca}
        conciliado={conciliado}
        abrirFatura={() => { setModalFaturaValor(mesDados.faturaAtual ?? ''); setModalFatura(true) }}
      />
      <FcModal folha
        modalFatura={modalFatura} setModalFatura={setModalFatura}
        modalFaturaValor={modalFaturaValor} setModalFaturaValor={setModalFaturaValor}
        contaInfo={contaInfo}
        hojeStr={hojeStr}
        confirmarModalFatura={confirmarModalFatura}
        pularModalFatura={pularModalFatura}
        mesVenc={mesVenc} anoVenc={anoVenc}
      />
      {confirmacao && (
        <FcConfirmModal
          mensagem={confirmacao.mensagem}
          detalhe={confirmacao.detalhe}
          onConfirmar={() => { confirmacao.onConfirmar(); setConfirmacao(null) }}
          onCancelar={() => setConfirmacao(null)}
        />
      )}
      <NleNovaCategoria aberto={novaCatAberta} tipo="saida" isDinheiro={false} isCartao categorias={categorias}
        onFechar={() => setNovaCatAberta(false)}
        onCriar={c => { setCategorias(prev => [...prev, c]); setFCat(c.nome); setFVariante(''); setNovaCatAberta(false) }} />
      </>
    )
  }

  // ── Desktop ─────────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: COR.fundo }}>
      <FcBanner
        contasCartao={contasCartao}
        contaId={contaId}
        onContaSelect={id => { setContaId(id); resetarParaNovo(diaDefaultPara(mes, ano)) }}
        totalPrevisto={totalPrevisto}
        grandTotalFaturas={grandTotalFaturas}
        faturaStatus={faturaStatus as 'paga' | 'fechada' | 'aberta'}
        diaVencimento={diaVencimento}
        mesDados={mesDados}
        diferenca={diferenca}
        conciliado={conciliado}
        setModalFatura={setModalFatura}
        setModalFaturaValor={setModalFaturaValor}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
        <FcDesktopLeft
          mesDados={mesDados}
          totalDias={totalDias}
          purchaseMes={purchaseMes}
          purchaseAno={purchaseAno}
          totalFatura={totalFatura}
          diaFechamento={diaFechamento}
          diaVencimento={diaVencimento}
          mesVenc={mesVenc}
          anoVenc={anoVenc}
          editandoId={editandoId}
          categorias={categorias}
          editarLancamento={editarLancamento}
          excluir={excluir}
          setDiaSel={setDiaSel}
          updateMes={updateMes}
        />
        <FcDesktopPanel
          editandoId={editandoId} avisoParcelas={avisoParcelas}
          editandoFechamento={editandoFechamento} setEditandoFechamento={setEditandoFechamento}
          editandoVencimento={editandoVencimento} setEditandoVencimento={setEditandoVencimento}
          fTipo={fTipo} setFTipo={setFTipo}
          fCat={fCat} setFCat={setFCat}
          fDesc={fDesc} setFDesc={setFDesc}
          fVariante={fVariante} setFVariante={setFVariante}
          fValor={fValor} setFValor={setFValor}
          fParcelas={fParcelas} setFParcelas={setFParcelas}
          fDataCompra={fDataCompra} setFDataCompra={setFDataCompra}
          diaFechamento={diaFechamento} diaVencimento={diaVencimento}
          diaFechamentoBase={diaFechamentoBase} diaVencimentoBase={diaVencimentoBase}
          mesDados={mesDados}
          purchaseMes={purchaseMes} purchaseAno={purchaseAno}
          diaSel={diaSel} setDiaSel={setDiaSel}
          mesVenc={mesVenc} anoVenc={anoVenc}
          categoriasCartao={categoriasCartao}
          dataCompraRef={dataCompraRef}
          categoriaSelectRef={categoriaSelectRef}
          onNovaCategoria={() => setNovaCatAberta(true)}
          valorInputRef={valorInputRef}
          parcelasBtnRefs={parcelasBtnRefs}
          resetarParaNovo={resetarParaNovo}
          excluirAtual={excluirAtual}
          lancar={lancar}
          updateMes={updateMes}
        />
      </div>
      <FcModal
        modalFatura={modalFatura} setModalFatura={setModalFatura}
        modalFaturaValor={modalFaturaValor} setModalFaturaValor={setModalFaturaValor}
        contaInfo={contaInfo}
        hojeStr={hojeStr}
        confirmarModalFatura={confirmarModalFatura}
        pularModalFatura={pularModalFatura}
        mesVenc={mesVenc} anoVenc={anoVenc}
      />
      {confirmacao && (
        <FcConfirmModal
          mensagem={confirmacao.mensagem}
          detalhe={confirmacao.detalhe}
          onConfirmar={() => { confirmacao.onConfirmar(); setConfirmacao(null) }}
          onCancelar={() => setConfirmacao(null)}
        />
      )}
      <NleNovaCategoria aberto={novaCatAberta} tipo="saida" isDinheiro={false} isCartao categorias={categorias}
        onFechar={() => setNovaCatAberta(false)}
        onCriar={c => { setCategorias(prev => [...prev, c]); setFCat(c.nome); setFVariante(''); setNovaCatAberta(false) }} />
    </div>
  )
}
