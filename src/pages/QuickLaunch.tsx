import { useState, useEffect, useRef, useMemo } from 'react'
import { parseBRL } from '../utils/moeda'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useToast } from '../components/Toast'
import { lancamentoAntesDoSaldo } from '../utils/saldoDesde'
import BottomNav from '../components/BottomNav'
import type { Conta, DadosMes } from '../context/AppContext'
import { COR } from '../utils/cores'
import { M } from '../components/mobile/estilo'
import { saldoRealizadoConta, saldoBancosEDinheiro, type Deps } from '../utils/saldoConta'
import { construirRealizadoMes } from '../utils/realizadoMes'
import { nomesDeCartao, totaisDoMes, catKey } from '../components/acompanhamento/evolucaoCalcs'
import { lancarNaFatura, lancarNoExtrato, dataDoLancamento, dividirParcelas } from '../utils/lancamentoRapido'
import { bancosDoDebito, cartoesDoCredito, gastoDeHoje, type MesRef } from '../utils/lancarPorMes'
import ContasAPagarRapido from '../components/quickLaunch/ContasAPagarRapido'
import { nomeDaConta } from '../utils/nomeDaConta'
import { IconeCat } from '../components/IconeCat'
import { corDoIcone } from '../utils/iconeDesenhado'
import NleNovaCategoria from '../components/novoLancamentoExtrato/NleNovaCategoria'
import ModalTopo from '../components/ModalTopo'
import { grupoDaCategoria } from '../utils/rotuloCategoria'
import { ehContaDisponivel } from '../utils/saldoConta'
import { useLarguraMenorQue } from '../utils/larguraTela'

function useIsMobile() {
  return useLarguraMenorQue(640)
}

/** Por onde sai o dinheiro do lançamento: uma conta, um cartão ou a carteira. */
type Forma = { tipo: 'banco' | 'cartao' | 'dinheiro'; conta?: Conta }

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const nomeMes = (m: MesRef) => MESES[m.mes]
const Maiusc = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function mesKey(conta: string, ano: number, mes: number) {
  return `${conta}-${ano}-${String(mes + 1).padStart(2, '0')}`
}
function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function chip(ativo: boolean): React.CSSProperties {
  return {
    border: `1.5px solid ${ativo ? COR.azul : COR.borda}`, background: ativo ? '#eff6ff' : '#fff',
    color: ativo ? COR.azul : COR.textoSuave, borderRadius: 20, padding: '8px 14px', minHeight: 40,
    fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
  }
}
const ROXO = '#7c3aed'
const corDoDisponivel = (disp: number) => (disp < 0 ? COR.erroTexto : COR.sucessoTexto)

export default function QuickLaunch() {
  const { user, contas, categorias, extratoData, faturaData, planos, updateExtratoMes, setFaturaData, setCategorias, perfil, saldoInicialDinheiro, cenarioPrevisao } = useApp()
  const { toast } = useToast()
  const navigate   = useNavigate()
  const isMobile   = useIsMobile()

  useEffect(() => {
    if (!isMobile) navigate('/novo-lancamento', { replace: true })
  }, [isMobile, navigate])
  // "Pagar contas" da Bússola abre aqui, já nas contas da semana.
  const location = useLocation()
  useEffect(() => {
    if (location.hash !== '#contas') return
    const t = setTimeout(() => document.getElementById('contas-da-semana')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
    return () => clearTimeout(t)
  }, [location.hash])

  const hoje = new Date()
  const ano  = hoje.getFullYear()
  const mes  = hoje.getMonth()
  const dia  = hoje.getDate()

  // Categoria → débito ou crédito → conta ou cartão → valor (26/10/2026,
  // pedido do Guilherme; antes era o mês, e o cartão fechado ia para
  // dezembro). Regras em utils/lancarPorMes.
  // Id da categoria — o nome não basta: variantes (Seguro · Civic, Seguro ·
  // March) têm o mesmo nome e são categorias diferentes.
  const [catSel, setCatSel] = useState<string | null>(null)
  const [etapa, setEtapa] = useState<'modo' | 'forma' | 'cartao' | 'valor'>('modo')
  const [forma, setForma] = useState<Forma | null>(null)
  const [quando, setQuando] = useState<'hoje' | 'ontem' | string>('hoje')
  const [parcelas, setParcelas] = useState(1)
  const [tipoSel, setTipoSel] = useState<'saida' | 'entrada'>('saida')
  const [valor, setValor]   = useState('')
  const [desc,  setDesc]    = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)

  // Gerenciamento do grid
  const [gerenciar, setGerenciar] = useState(false)
  // "+ Nova categoria" dentro do "adicionar": a mesma caixa de Lançamentos.
  const [novaCatAberta, setNovaCatAberta] = useState(false)
  const [pinLocal, setPinLocal]   = useState<Set<string>>(new Set())

  const valorRef = useRef<HTMLInputElement>(null)

  const contasBanco = useMemo(() => contas.filter(ehContaDisponivel), [contas])
  const isCartao = forma?.tipo === 'cartao'

  // O saldo das contas é o MESMO do Radar e de Lançamentos (saldoConta).
  const depsSaldo: Deps = useMemo(() => ({
    extratoData: extratoData as Record<string, DadosMes>,
    faturaData: faturaData as Deps['faturaData'],
    contas, categorias, planos, saldoInicialDinheiro, cenarioPrevisao,
  }), [extratoData, faturaData, contas, categorias, planos, saldoInicialDinheiro, cenarioPrevisao])

  const saldoHoje = useMemo(() => saldoBancosEDinheiro(ano, mes, depsSaldo), [ano, mes, depsSaldo])
  const saldos = useMemo(() => {
    const map: Record<string, number> = {}
    for (const c of contasBanco) map[c.id] = saldoRealizadoConta(c.id, ano, mes, depsSaldo)
    map.dinheiro = saldoRealizadoConta('dinheiro', ano, mes, depsSaldo)
    return map
  }, [contasBanco, ano, mes, depsSaldo])

  // Previsto e realizado de cada categoria saem das linhas do Radar
  // (totaisDoMes), por (nome, variante) — cartão e dinheiro incluídos. Deste
  // mês e do próximo: o próximo já tem as parcelas lançadas.
  const mesAtual: MesRef = useMemo(() => ({ ano, mes }), [ano, mes])
  const linhasDoMes = (m: MesRef) => {
    const planoAno = planos[m.ano]
    const { saidasMap, entradasMap } = construirRealizadoMes({
      ano: m.ano, mes: m.mes, extratoData: extratoData as Record<string, DadosMes>,
      faturaData, contas, categorias, planoAno,
    })
    const t = totaisDoMes({ mes: m.mes, planoAno, categorias, cartaoNomes: nomesDeCartao(contas), entradasMap, saidasMap })
    const porChave = new Map<string, { prev: number; real: number }>()
    for (const l of t.saida.linhas) porChave.set(`saida|${catKey(l.nome, l.descricao)}`, { prev: l.prev, real: l.real })
    for (const l of t.entrada.linhas) porChave.set(`entrada|${catKey(l.nome, l.descricao)}`, { prev: l.prev, real: l.real })
    return porChave
  }
  // Este mês (débito) e o mês da fatura de cada cartão (crédito), que pode ser
  // o próximo ou o seguinte a ele.
  const cartoesHoje = useMemo(() => cartoesDoCredito(contas, hoje, 'saida'), [contas, dia]) // eslint-disable-line react-hooks/exhaustive-deps
  const linhasPorMes = useMemo(() => {
    const map = new Map<number, Map<string, { prev: number; real: number }>>()
    for (const m of [mesAtual, ...cartoesHoje.map(c => c.mes)]) {
      const k = m.ano * 12 + m.mes
      if (!map.has(k)) map.set(k, linhasDoMes(m))
    }
    return map
  }, [planos, mesAtual, cartoesHoje, extratoData, faturaData, contas, categorias]) // eslint-disable-line react-hooks/exhaustive-deps

  const gastosHoje = useMemo(() => gastoDeHoje(contas, extratoData, faturaData, hoje), [contas, extratoData, faturaData, dia]) // eslint-disable-line react-hooks/exhaustive-deps

  // Categorias variáveis
  // Atalhos e lista de escolha em ordem alfabética de "Nome · Variante"
  // (pedido do Guilherme, 14/10/2026).
  const catsOrdenadas = useMemo(() => {
    const rot = (c: { nome: string; descricao?: string }) => c.descricao ? `${c.nome} · ${c.descricao}` : c.nome
    return [...categorias].sort((a, b) => rot(a).localeCompare(rot(b), 'pt-BR', { sensitivity: 'base' }))
  }, [categorias])
  const catsVariaveis = useMemo(() => catsOrdenadas.filter(c => !c.fixa), [catsOrdenadas])
  const hasAnyPin = useMemo(() => categorias.some(c => c.pinQuick === true), [categorias])
  const catsGrid = useMemo(() => {
    if (hasAnyPin) return catsOrdenadas.filter(c => c.ativa && c.pinQuick === true)
    return catsOrdenadas.filter(c => c.ativa && !c.fixa)
  }, [catsOrdenadas, hasAnyPin])

  function abrirGerenciar() {
    if (hasAnyPin) {
      setPinLocal(new Set(categorias.filter(c => c.pinQuick === true).map(c => c.id)))
    } else {
      setPinLocal(new Set(categorias.filter(c => c.ativa && !c.fixa).map(c => c.id)))
    }
    setGerenciar(true)
  }
  function toggleLocal(catId: string) {
    setPinLocal(prev => { const n = new Set(prev); if (n.has(catId)) n.delete(catId); else n.add(catId); return n })
  }
  function salvarPins() {
    setCategorias(prev => prev.map(c => ({ ...c, pinQuick: pinLocal.has(c.id) })))
    setGerenciar(false)
  }

  /** O valor do lançamento mais recente da categoria, no extrato ou na fatura. */
  function ultimoValorCat(catNome: string): number | null {
    let melhor = -1, valorMelhor: number | null = null
    const olhar = (fonte: Record<string, unknown>, ehFatura: boolean) => {
      for (const [k, dm] of Object.entries(fonte)) {
        const ym = parseInt(k.slice(-7, -3)) * 100 + parseInt(k.slice(-2))
        for (const [d, lcs] of Object.entries((dm as { lancamentos?: Record<string, { categoria: string; valor: number; tipo: string }[]> }).lancamentos ?? {})) {
          for (const l of lcs) {
            if (l.categoria !== catNome || (ehFatura && l.tipo !== 'entrada')) continue
            const quando = ym * 100 + Number(d)
            if (quando >= melhor) { melhor = quando; valorMelhor = l.valor }
          }
        }
      }
    }
    olhar(extratoData as Record<string, unknown>, false)
    olhar(faturaData as Record<string, unknown>, true)
    return valorMelhor
  }
  const catObj = catSel ? categorias.find(c => c.id === catSel) ?? null : null
  const sugerido = catObj ? ultimoValorCat(catObj.nome) : null

  function linhaDaCategoria(c: { nome: string; descricao?: string; tipo: 'saida' | 'entrada' }, m: MesRef = mesAtual) {
    return linhasPorMes.get(m.ano * 12 + m.mes)?.get(`${c.tipo}|${catKey(c.nome, c.descricao)}`) ?? { prev: 0, real: 0 }
  }

  const bancos = useMemo(() => bancosDoDebito(contas), [contas])
  const cartoesCredito = useMemo(() => catObj?.tipo === 'saida' ? cartoesHoje : [], [catObj?.tipo, cartoesHoje])
  // Os meses das faturas, cada um com os cartões que vencem nele: com um
  // cartão fechado, são dois meses (pedido do Guilherme, 26/10/2026).
  const mesesDoCredito = useMemo(() => {
    const grupos: { m: MesRef; cartoes: Conta[] }[] = []
    for (const { cartao, mes: m } of cartoesCredito) {
      const g = grupos.find(x => x.m.ano === m.ano && x.m.mes === m.mes)
      if (g) g.cartoes.push(cartao); else grupos.push({ m, cartoes: [cartao] })
    }
    return grupos.sort((a, b) => (a.m.ano * 12 + a.m.mes) - (b.m.ano * 12 + b.m.mes))
  }, [cartoesCredito])
  const faturaDe = (c: Conta) => cartoesHoje.find(x => x.cartao.id === c.id)?.mes ?? mesAtual

  function abrirCat(c: typeof catsGrid[0]) {
    setCatSel(c.id); setTipoSel(c.tipo); setValor(''); setDesc(''); setParcelas(1); setQuando('hoje')
    setForma(null); setEtapa('modo')
  }
  function fecharInput() {
    setCatSel(null); setValor(''); setDesc(''); setParcelas(1); setQuando('hoje'); setForma(null); setEtapa('modo')
  }
  function escolherForma(f: Forma) {
    setForma(f); setParcelas(1); setEtapa('valor')
    setTimeout(() => valorRef.current?.focus(), 80)
  }
  function voltar() {
    if (etapa === 'valor') setEtapa(forma?.tipo === 'cartao' ? 'cartao' : 'forma')
    else setEtapa('modo')
  }

  function registrar() {
    const v = parseBRL(valor)
    if (!catObj || v <= 0 || !forma) return
    const data = dataDoLancamento(quando)
    const [aL, mL, dL] = [data.getFullYear(), data.getMonth(), data.getDate()]
    const descricao = desc.trim() || catObj.nome
    const baseId = `v-${Date.now()}`
    // Antes da data do saldo da conta, já está no saldo (utils/saldoDesde).
    const trava = forma.tipo !== 'dinheiro' && lancamentoAntesDoSaldo(forma.conta, aL, mL, dL)
    if (trava) { toast(trava, 'error'); return }

    if (forma.tipo === 'cartao' && forma.conta) {
      // Mesmo formato da tela da fatura: fechamento, parcelas e compra como
      // `entrada` — ver lancarNaFatura. O valor digitado é o TOTAL da compra;
      // os centavos que sobram da divisão vão na 1ª parcela.
      const valores = dividirParcelas(v, parcelas)
      setFaturaData(prev => lancarNaFatura(prev, {
        cartao: forma.conta!, ano: aL, mes: mL, dia: dL,
        tipoDaCategoria: tipoSel, categoria: catObj.nome, subCategoria: catObj.descricao,
        descricao, valorParcela: valores[valores.length - 1], valores, parcelas, baseId,
      }))
    } else {
      const fp = forma.tipo === 'dinheiro' ? 'dinheiro'
        : catObj.formaPagamento === 'pix' || catObj.formaPagamento === 'transferencia' ? catObj.formaPagamento : 'debito'
      const conta = forma.tipo === 'dinheiro' ? 'dinheiro' : forma.conta!.id
      updateExtratoMes(mesKey(conta, aL, mL), prev => lancarNoExtrato(prev, {
        dia: dL, tipo: tipoSel, categoria: catObj.nome, subCategoria: catObj.descricao, descricao,
        valor: v, formaPagamento: fp, id: baseId,
      }))
    }

    setFeedback(`✓ Lançado · ${nomeDaForma(forma)}`)
    fecharInput()
    setTimeout(() => setFeedback(null), 2000)
  }

  const nomeDaForma = (f: Forma) => f.tipo === 'dinheiro' ? 'Dinheiro'
    : f.conta ? nomeDaConta(f.conta, contas) : f.tipo === 'cartao' ? 'Cartão' : 'Banco'

  const dataHoje = hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const hora = hoje.getHours()
  const saudacao = hora >= 5 && hora < 12 ? 'Bom dia' : hora >= 12 && hora < 18 ? 'Boa tarde' : 'Boa noite'
  const nomeUser = perfil.apelido || perfil.nome.split(' ')[0] || user?.email?.split('@')[0] || 'Usuário'

  /** O disponível da categoria num mês, em letra grande (débito). */
  function DisponivelDoMes({ m }: { m: MesRef }) {
    if (!catObj) return null
    const { prev, real } = linhaDaCategoria(catObj, m)
    const receita = catObj.tipo === 'entrada'
    const disp = prev - real
    return prev > 0 ? (
      <>
        <span style={{ fontSize: 13, color: COR.textoSuave }}>
          {receita ? (disp > 0 ? 'falta receber' : 'recebido') : disp >= 0 ? 'disponível' : 'passou'} em {nomeMes(m)}
        </span>
        <span style={{ fontSize: 22, fontWeight: 800, color: receita ? COR.texto : corDoDisponivel(disp), letterSpacing: '-.4px', overflowWrap: 'anywhere' }}>
          {fmt(Math.abs(disp))}
        </span>
        <span style={{ fontSize: 13, color: COR.textoSuave }}>{receita ? 'recebeu' : 'gastou'} {fmt(real)} de {fmt(prev)}</span>
      </>
    ) : (
      <>
        <span style={{ fontSize: 13, color: COR.textoSuave }}>sem plano em {nomeMes(m)}</span>
        <span style={{ fontSize: 22, fontWeight: 800, color: COR.texto, overflowWrap: 'anywhere' }}>{fmt(real)}</span>
        <span style={{ fontSize: 13, color: COR.textoSuave }}>{receita ? 'recebido' : 'gasto'} no mês</span>
      </>
    )
  }

  const cartaoBranco: React.CSSProperties = {
    width: '100%', textAlign: 'left', background: '#fff', border: `1.5px solid ${COR.borda}`,
    borderRadius: 18, padding: '14px 14px', fontFamily: 'inherit', boxSizing: 'border-box',
    display: 'flex', flexDirection: 'column', gap: 4, boxShadow: M.sombra,
  }
  const CabecalhoModo = ({ icone, titulo, legenda }: { icone: string; titulo: string; legenda: string }) => (
    <span style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
      <span aria-hidden style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--cx-azul)', boxShadow: 'var(--cx-bolinha)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <i className={`ti ${icone}`} style={{ color: '#fff', fontSize: 19 }} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 16, fontWeight: 800, color: COR.texto }}>{titulo}</span>
        <span style={{ display: 'block', fontSize: 13, color: COR.textoSuave }}>{legenda}</span>
      </span>
    </span>
  )

  /** Débito: banco ou dinheiro, conta neste mês. */
  function QuadroDebito() {
    if (!catObj) return null
    const receita = catObj.tipo === 'entrada'
    return (
      <button onClick={() => setEtapa('forma')} style={{ ...cartaoBranco, cursor: 'pointer' }}
        aria-label={`${receita ? 'Banco ou dinheiro' : 'Débito'}: conta em ${nomeMes(mesAtual)}`}>
        <CabecalhoModo icone="ti-building-bank" titulo={receita ? 'Banco ou dinheiro' : 'Débito'}
          legenda={receita ? 'Entra no banco ou no dinheiro hoje' : 'Sai do banco ou do dinheiro hoje'} />
        <DisponivelDoMes m={mesAtual} />
        <span style={{ fontSize: 13, fontWeight: 700, color: COR.azul, marginTop: 4 }}>Escolher a conta ›</span>
      </button>
    )
  }

  /** O disponível da categoria num mês, numa linha (crédito). */
  function DisponivelNaLinha({ m }: { m: MesRef }) {
    const { prev, real } = linhaDaCategoria(catObj!, m)
    const disp = prev - real
    return (
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 0', borderTop: '1px solid #eef2f8' }}>
        <span style={{ fontSize: 13, color: COR.textoSuave }}>
          {prev > 0 ? (disp >= 0 ? 'disponível' : 'passou') : 'sem plano'} em <b style={{ color: COR.texto }}>{nomeMes(m)}{m.ano !== ano ? ` de ${m.ano}` : ''}</b>
        </span>
        <span style={{ fontSize: 20, fontWeight: 800, color: prev > 0 ? corDoDisponivel(disp) : COR.texto, letterSpacing: '-.3px', overflowWrap: 'anywhere' }}>
          {fmt(prev > 0 ? Math.abs(disp) : real)}
        </span>
        <span style={{ fontSize: 13, color: COR.textoSuave }}>{prev > 0 ? `gastou ${fmt(real)} de ${fmt(prev)}` : 'gasto no mês'}</span>
      </span>
    )
  }

  /** Crédito: o disponível da categoria em cada mês de fatura. */
  function QuadroCredito() {
    if (!catObj) return null
    const sem = mesesDoCredito.length === 0
    return (
      <button onClick={() => !sem && setEtapa('cartao')} disabled={sem}
        aria-label={`Crédito: ${mesesDoCredito.map(g => nomeMes(g.m)).join(' e ')}`}
        style={{ ...cartaoBranco, cursor: sem ? 'default' : 'pointer' }}>
        <CabecalhoModo icone="ti-credit-card" titulo="Crédito"
          legenda={mesesDoCredito.length > 1 ? 'A compra cai na fatura de um destes meses' : 'A compra cai na fatura do cartão'} />
        {sem
          ? <span style={{ fontSize: 13, color: COR.textoSuave }}>Nenhum cartão cadastrado.</span>
          : mesesDoCredito.map(g => <DisponivelNaLinha key={g.m.ano * 12 + g.m.mes} m={g.m} />)}
        {!sem && <span style={{ fontSize: 13, fontWeight: 700, color: COR.azul, marginTop: 4 }}>Escolher o cartão ›</span>}
      </button>
    )
  }

  function LinhaCartao({ cartao }: { cartao: Conta }) {
    return (
      <button onClick={() => escolherForma({ tipo: 'cartao', conta: cartao })}
        aria-label={nomeDaConta(cartao, contas)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 56, padding: '10px 4px',
          background: 'none', border: 'none', borderTop: '1px solid #eef2f8', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        }}>
        <span aria-hidden style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0, fontSize: 20, background: '#f5f3ff',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconeCat icone={cartao.icone || '💳'} cor={corDoIcone(cartao.cor ?? COR.azul)} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: COR.texto, overflowWrap: 'anywhere' }}>{nomeDaConta(cartao, contas)}</span>
          {cartao.diaVencimento != null && (
            <span style={{ display: 'block', fontSize: 13, color: COR.textoSuave, marginTop: 2 }}>vence dia {cartao.diaVencimento}</span>
          )}
        </span>
        <span aria-hidden style={{ color: COR.textoSuave, fontSize: 20 }}>›</span>
      </button>
    )
  }

  /** Uma forma de pagar na lista: nome, e o saldo ou o mês da fatura. */
  function LinhaForma({ f }: { f: Forma }) {
    const cartao = f.tipo === 'cartao' && f.conta
    const legenda = f.tipo === 'dinheiro' ? `saldo ${fmt(saldos.dinheiro ?? 0)}`
      : cartao ? `fatura de ${nomeMes(faturaDe(f.conta!))}`
      : `${f.conta?.nome ?? ''} · saldo ${fmt(saldos[f.conta!.id] ?? 0)}`
    const icone = f.tipo === 'dinheiro' ? <i className="ti ti-cash" style={{ color: '#15803d' }} /> : <IconeCat icone={f.conta?.icone || (cartao ? '💳' : '🏦')} cor={corDoIcone(f.conta?.cor ?? COR.azul)} />
    return (
      <button onClick={() => escolherForma(f)} style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 56, padding: '10px 4px',
        background: 'none', border: 'none', borderTop: '1px solid #eef2f8', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
      }}>
        <span aria-hidden style={{
          width: 42, height: 42, borderRadius: '50%', flexShrink: 0, fontSize: 20,
          background: f.tipo === 'cartao' ? '#f5f3ff' : f.tipo === 'dinheiro' ? '#f0fdf4' : '#eff6ff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{icone}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: COR.texto }}>{nomeDaForma(f)}</span>
          <span style={{ display: 'block', fontSize: 13, color: COR.textoSuave, marginTop: 2 }}>{legenda}</span>
        </span>
        <span aria-hidden style={{ color: COR.textoSuave, fontSize: 20 }}>›</span>
      </button>
    )
  }

  const tituloGrupo: React.CSSProperties = {
    fontSize: 13, fontWeight: 700, color: COR.textoSuave, textTransform: 'uppercase', letterSpacing: '.4px', margin: '14px 4px 2px',
  }

  return (
    <div style={{
      minHeight: '100vh', background: M.fundo,
      display: 'flex', flexDirection: 'column',
      fontFamily: "-apple-system,'Inter',sans-serif",
      paddingBottom: 80,
    }}>
      <style>{`@keyframes slideUp{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}`}</style>

      {/* Header: título e o gasto de hoje, somando bancos, dinheiro e cartões. */}
      <div style={{
        background: 'var(--cx-azul)', borderRadius: '0 0 28px 28px', boxShadow: 'var(--cx-brilho-topo)',
        padding: 'calc(18px + env(safe-area-inset-top)) 20px 26px', flexShrink: 0,
      }}>
        <div style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>{saudacao}, {nomeUser} 👋</div>
        <div style={{ color: 'rgba(255,255,255,.75)', fontSize: 15, marginTop: 4 }}>
          {gastosHoje > 0
            ? <>Hoje você já gastou <b style={{ color: '#fff' }}>{fmt(gastosHoje)}</b></>
            : <>{Maiusc(dataHoje)}</>}
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, padding: '16px 16px 6px', overflowY: 'auto' }}>
        <div style={{
          fontSize: M.titulo, fontWeight: 700, color: COR.texto,
          marginBottom: 12, marginTop: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>O que você gastou?</span>
          <button
            onClick={abrirGerenciar}
            style={{
              border: `1px solid ${COR.borda}`, background: '#fff', color: COR.azul,
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              borderRadius: 20, padding: '7px 14px',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >Editar</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 8 }}>
          {/* As categorias e UM "adicionar": seis quadros vazios empurravam as
              contas da semana para fora da tela. */}
          {Array.from({ length: catsGrid.length + 1 }, (_, i) => {
            const c = catsGrid[i]
            if (!c) {
              return (
                <button
                  key={`add-${i}`}
                  onClick={abrirGerenciar}
                  style={{
                    background: 'transparent',
                    border: '2px dashed #cbd5e1',
                    borderRadius: 18, padding: '14px 8px', minHeight: 112,
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', gap: 5,
                    cursor: 'pointer', transition: 'all .15s',
                  }}
                >
                  <span style={{ fontSize: 26, color: COR.textoSuave, fontWeight: 300, lineHeight: 1 }}>+</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: COR.textoSuave }}>adicionar</span>
                </button>
              )
            }
            const active     = catSel === c.id
            return (
              <button
                key={c.id}
                onClick={() => catSel === c.id ? fecharInput() : abrirCat(c)}
                // Quadro azul como o topo (pedido do Guilherme, 10/10/2026), com
                // o círculo do ícone em cinza claro. No azul, a paleta escura:
                // #86efac 4,8 e #fdba74 5,2 no extremo #1e40af; rótulo a 75%.
                style={{
                  background: 'var(--cx-azul)',
                  border: `2px solid ${active ? '#fff' : 'transparent'}`, boxShadow: '0 4px 14px rgba(15,40,120,.18)',
                  borderRadius: 18, padding: '14px 6px', minHeight: 112, minWidth: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  cursor: 'pointer', transform: active ? 'scale(.95)' : undefined,
                  transition: 'all .15s',
                }}
              >
                <span aria-hidden style={{
                  width: 46, height: 46, borderRadius: '50%', fontSize: 24,
                  background: '#e6ebf1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}><IconeCat icone={c.icone} cor={corDoIcone(c.cor)} /></span>
                {/* Nome inteiro, com a variante, e sem valor: o disponível
                    depende do mês em que se paga, que só se escolhe depois
                    (pedido do Guilherme, 14/10/2026). */}
                <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', textAlign: 'center', lineHeight: 1.25,
                  maxWidth: '100%', overflowWrap: 'anywhere', hyphens: 'auto' }}>
                  {c.descricao ? `${c.nome} · ${c.descricao}` : c.nome}
                </span>
              </button>
            )
          })}
        </div>

        {/* Contas da semana, com "Pagar" — vieram da Bússola: pagar e lançar
            são o mesmo gesto do dia. */}
        <div id="contas-da-semana" style={{ scrollMarginTop: 16, marginTop: 16 }}>
          <ContasAPagarRapido deps={depsSaldo} saldoHoje={saldoHoje} vazio="Nada vence nesta semana" />
        </div>

      </div>

      {/* ── Lançar: mês → forma de pagar → valor ── */}
      {catSel && catObj && (
        <>
          <div onClick={fecharInput} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 110 }} />
          <div role="dialog" aria-label={`Lançar em ${catObj.nome}`} style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 111,
            background: '#fff', borderRadius: '20px 20px 0 0', maxHeight: '88vh',
            display: 'flex', flexDirection: 'column', animation: 'slideUp .2s ease',
          }}>
            <ModalTopo raio={20} voltar={etapa !== 'modo' ? voltar : undefined} onFechar={fecharInput}
              icone={<IconeCat icone={catObj.icone || '💰'} cor="#fff" tamanho={22} />}
              rotulo={etapa === 'modo' ? (catObj.tipo === 'entrada' ? 'Onde entrou?' : 'Débito ou crédito?')
                : etapa === 'forma' ? (catObj.tipo === 'entrada' ? 'Em qual conta?' : 'Débito · de qual conta?')
                : etapa === 'cartao' ? 'Crédito · qual cartão?'
                : isCartao && forma?.conta ? `${nomeDaForma(forma)} · fatura de ${nomeMes(faturaDe(forma.conta))}`
                : `${catObj.tipo === 'entrada' ? '' : 'Débito · '}${forma ? nomeDaForma(forma) : ''}`}
              titulo={catObj.descricao ? `${catObj.nome} · ${catObj.descricao}` : catObj.nome} />
            <div style={{ overflowY: 'auto', padding: '14px 16px calc(16px + env(safe-area-inset-bottom))' }}>

            {etapa === 'modo' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <QuadroDebito />
                {catObj.tipo === 'saida' && <QuadroCredito />}
              </div>
            )}

            {etapa === 'forma' && (
              <div>
                {bancos.length > 0 && <div style={tituloGrupo}><i className="ti ti-building-bank" aria-hidden style={{ verticalAlign: -2 }} /> Banco</div>}
                {bancos.map(c => <LinhaForma key={c.id} f={{ tipo: 'banco', conta: c }} />)}
                <div style={tituloGrupo}><i className="ti ti-cash" aria-hidden style={{ verticalAlign: -2 }} /> Dinheiro</div>
                <LinhaForma f={{ tipo: 'dinheiro' }} />
              </div>
            )}

            {etapa === 'cartao' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {mesesDoCredito.map(g => (
                  <div key={g.m.ano * 12 + g.m.mes} style={{ ...cartaoBranco, gap: 0 }}>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 10 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: COR.texto }}>Fatura de {nomeMes(g.m)}{g.m.ano !== ano ? ` de ${g.m.ano}` : ''}</span>
                      <DisponivelDoMes m={g.m} />
                    </span>
                    {g.cartoes.map(c => <LinhaCartao key={c.id} cartao={c} />)}
                  </div>
                ))}
              </div>
            )}

            {etapa === 'valor' && (
              <>
                {/* Quando, parcelas e o último valor da categoria. */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {(['hoje', 'ontem'] as const).map(q => (
                    <button key={q} onClick={() => setQuando(q)} style={chip(quando === q)}>
                      {q === 'hoje' ? 'Hoje' : 'Ontem'}
                    </button>
                  ))}
                  <label style={{ ...chip(quando !== 'hoje' && quando !== 'ontem'), position: 'relative', display: 'inline-flex', alignItems: 'center', overflow: 'hidden', height: 40, boxSizing: 'border-box' }}>
                    {quando !== 'hoje' && quando !== 'ontem'
                      ? dataDoLancamento(quando).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                      : <><i className="ti ti-calendar" aria-hidden style={{ marginRight: 4 }} />Outro dia</>}
                    <input
                      type="date"
                      max={`${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`}
                      onChange={e => e.target.value && setQuando(e.target.value)}
                      aria-label="Data do lançamento"
                      style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                    />
                  </label>
                  {isCartao && (
                    <select
                      value={parcelas}
                      onChange={e => setParcelas(Number(e.target.value))}
                      aria-label="Parcelas"
                      style={{ ...chip(parcelas > 1), appearance: 'none' }}
                    >
                      {Array.from({ length: 24 }, (_, i) => i + 1).map(n => (
                        <option key={n} value={n}>{n === 1 ? 'À vista' : `${n}×`}</option>
                      ))}
                    </select>
                  )}
                  {sugerido !== null && !valor && (
                    <button
                      onClick={() => setValor(sugerido.toLocaleString('pt-BR', { minimumFractionDigits: 2 }))}
                      style={{ ...chip(false), marginLeft: 'auto' }}
                    >Último: {fmt(sugerido)}</button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <input
                    ref={valorRef}
                    value={valor}
                    onChange={e => setValor(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && registrar()}
                    placeholder={parcelas > 1 ? 'Valor total' : 'R$ 0,00'}
                    aria-label={parcelas > 1 ? 'Valor total da compra' : 'Valor'}
                    inputMode="decimal"
                    style={{
                      flex: '1.2', border: `2px solid ${isCartao ? ROXO : COR.azul}`, borderRadius: 12,
                      padding: '12px 12px', fontSize: 24, fontWeight: 800, minWidth: 0,
                      color: isCartao ? ROXO : COR.azul, background: isCartao ? '#f5f3ff' : '#eff6ff',
                      outline: 'none', fontFamily: 'inherit', textAlign: 'center',
                    }}
                  />
                  <input
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && registrar()}
                    placeholder="Descrição (opcional)"
                    style={{
                      flex: 1, border: `1.5px solid ${COR.borda}`, borderRadius: 12,
                      padding: '12px 12px', fontSize: 15, color: COR.texto, minWidth: 0,
                      background: '#f8fafc', outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                </div>

                {parcelas > 1 && parseBRL(valor) > 0 && (() => {
                  const [primeira, demais] = dividirParcelas(parseBRL(valor), parcelas)
                  return (
                    <div style={{ fontSize: 14, color: COR.textoSuave, marginTop: -4, marginBottom: 8, textAlign: 'center' }}>
                      {primeira === demais
                        ? <>{parcelas}× de <b style={{ color: COR.texto }}>{fmt(demais)}</b></>
                        : <>1ª de <b style={{ color: COR.texto }}>{fmt(primeira)}</b> e {parcelas - 1}× de <b style={{ color: COR.texto }}>{fmt(demais)}</b></>}
                      {' '}· total {fmt(parseBRL(valor))}
                    </div>
                  )
                })()}

                <button
                  onClick={registrar}
                  style={{
                    width: '100%', padding: 14, border: 'none', borderRadius: 14,
                    background: isCartao
                      ? `linear-gradient(135deg,${ROXO},#a855f7)`
                      : `linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,
                    color: '#fff', fontSize: 15, fontWeight: 700, minHeight: 48,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >{isCartao ? <><i className="ti ti-credit-card" aria-hidden style={{ verticalAlign: -2 }} /> Lançar na fatura</> : '✓ Registrar lançamento'}</button>
              </>
            )}
            </div>
          </div>
        </>
      )}

      {/* Feedback toast */}
      {feedback && (
        <div role="status" style={{
          position: 'fixed', top: '45%', left: '50%',
          transform: 'translate(-50%,-50%)',
          background: COR.sucessoTexto, color: '#fff', borderRadius: 14,
          padding: '14px 24px', fontSize: 15, fontWeight: 600,
          zIndex: 200, boxShadow: '0 8px 30px rgba(22,163,74,.4)',
          whiteSpace: 'nowrap',
        }}>
          {feedback}
        </div>
      )}

      <NleNovaCategoria aberto={novaCatAberta} tipo="saida" isDinheiro={false}
        contaId={(contas.find(c => c.preferida && ehContaDisponivel(c)) ?? contas.find(ehContaDisponivel))?.id}
        categorias={categorias} onFechar={() => setNovaCatAberta(false)}
        onCriar={c => {
          // Com atalhos escolhidos, a nova entra neles; sem, a grade mostra todas as variáveis.
          const nova = hasAnyPin ? { ...c, pinQuick: true } : c
          setCategorias(prev => [...prev, nova])
          setNovaCatAberta(false); setGerenciar(false)
          abrirCat(nova)
        }} />
      {/* ── Bottom sheet: gerenciar categorias do grid ── */}
      {gerenciar && (
        <>
          <div
            onClick={() => setGerenciar(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 110 }}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 111,
            background: '#fff', borderRadius: '20px 20px 0 0',
            maxHeight: '82vh', display: 'flex', flexDirection: 'column',
            animation: 'slideUp .25s ease',
          }}>
            <ModalTopo raio={20} icone="ti-layout-grid" rotulo="Lançar" titulo="Categorias no Início"
              subtitulo="Categorias variáveis disponíveis no lançamento rápido" onFechar={() => setGerenciar(false)} />

            {/* Fixo acima da lista, que rola sozinha (pedido do Guilherme, 18/10/2026). */}
            <div style={{ padding: '12px 20px', borderBottom: `1px solid ${COR.borda}`, flexShrink: 0 }}>
              <button type="button" onClick={() => setNovaCatAberta(true)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', minHeight: 48,
                border: 'none', borderRadius: 14, background: 'var(--cx-azul)', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: '#fff',
              }}>
                <i className="ti ti-plus" aria-hidden style={{ fontSize: 20 }} /> Nova categoria
              </button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {catsVariaveis.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: COR.textoSuave, fontSize: 13 }}>
                  Nenhuma categoria variável cadastrada.
                </div>
              ) : (
                ['saida', 'entrada'].map(tipo => {
                  const cats = catsVariaveis.filter(c => c.tipo === tipo)
                  if (cats.length === 0) return null
                  return (
                    <div key={tipo}>
                      <div style={{
                        fontSize: 12, fontWeight: 700, color: COR.textoSuave, textTransform: 'uppercase',
                        letterSpacing: '.5px', padding: '12px 20px 6px', background: '#f8fafc',
                      }}>
                        <i className={`ti ${tipo === 'saida' ? 'ti-arrow-up-right' : 'ti-arrow-down-left'}`} aria-hidden style={{ verticalAlign: -2 }} /> {tipo === 'saida' ? 'Saídas' : 'Entradas'}
                      </div>
                      {cats.map(c => {
                        const ativo = pinLocal.has(c.id)
                        return (
                          <div
                            key={c.id}
                            onClick={() => toggleLocal(c.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 12,
                              padding: '12px 20px', cursor: 'pointer',
                              borderBottom: `1px solid ${COR.borda}`,
                              background: ativo ? '#f0f7ff' : '#fff',
                              transition: 'background .15s',
                            }}
                          >
                            <span style={{ fontSize: 24, opacity: c.ativa ? 1 : .4, flexShrink: 0 }}><IconeCat icone={c.icone} cor={corDoIcone(c.cor)} /></span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: c.ativa ? COR.texto : '#94a3b8' }}>
                                {c.descricao ? `${c.nome} · ${c.descricao}` : c.nome}
                              </div>
                              {/* Grupo embaixo: com a variante, distingue "Seguro · Civic"
                                  de "Seguro · March" (pedido do Guilherme, 14/10/2026). */}
                              {(() => {
                                const sub = [grupoDaCategoria(c.nome, c.descricao, categorias), c.ativa ? undefined : 'inativa']
                                  .filter(Boolean).join(' · ')
                                return sub && <div style={{ fontSize: 12, color: c.ativa ? COR.textoSuave : '#94a3b8', marginTop: 1 }}>{sub}</div>
                              })()}
                            </div>
                            <div style={{
                              width: 44, height: 24, borderRadius: 12, flexShrink: 0,
                              background: ativo ? COR.azul : '#e2e8f0',
                              position: 'relative', transition: 'background .2s',
                            }}>
                              <div style={{
                                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                                position: 'absolute', top: 2, left: ativo ? 22 : 2,
                                transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                              }}/>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })
              )}
            </div>

            <div style={{ padding: '12px 20px 20px', borderTop: `1px solid ${COR.borda}` }}>
              <div style={{ fontSize: 13, color: COR.textoSuave, textAlign: 'center', marginBottom: 10 }}>
                {pinLocal.size} categoria{pinLocal.size !== 1 ? 's' : ''} selecionada{pinLocal.size !== 1 ? 's' : ''}
              </div>
              <button
                onClick={salvarPins}
                style={{
                  width: '100%', padding: '13px', border: 'none', borderRadius: 14,
                  background: `linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,
                  color: '#fff', fontSize: 15, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >Salvar</button>
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  )
}
