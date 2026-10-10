import { useState, useEffect, useRef, useMemo } from 'react'
import { parseBRL } from '../utils/moeda'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import BottomNav from '../components/BottomNav'
import type { Conta, DadosMes } from '../context/AppContext'
import { COR } from '../utils/cores'
import { M } from '../components/mobile/estilo'
import { saldoRealizadoConta, saldoBancosEDinheiro, type Deps } from '../utils/saldoConta'
import { construirRealizadoMes } from '../utils/realizadoMes'
import { nomesDeCartao, totaisDoMes, catKey } from '../components/acompanhamento/evolucaoCalcs'
import { lancarNaFatura, lancarNoExtrato, dataDoLancamento } from '../utils/lancamentoRapido'
import { formasDoMes, gastoDeHoje, mesDoGastoNoCartao, type MesRef, type QualMes } from '../utils/lancarPorMes'
import ContasAPagarRapido from '../components/quickLaunch/ContasAPagarRapido'

function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
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
  const navigate   = useNavigate()
  const isMobile   = useIsMobile()

  useEffect(() => {
    if (!isMobile) navigate('/dashboard', { replace: true })
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

  // Categoria → mês → forma de pagar → valor (pedido do Guilherme em
  // 10/10/2026). Antes a conta era escolhida primeiro, num cartão no topo, e
  // a categoria ficava por baixo dele. Regras em utils/lancarPorMes.
  // Id da categoria — o nome não basta: variantes (Seguro · Civic, Seguro ·
  // March) têm o mesmo nome e são categorias diferentes.
  const [catSel, setCatSel] = useState<string | null>(null)
  const [etapa, setEtapa] = useState<'mes' | 'forma' | 'valor'>('mes')
  const [qualMes, setQualMes] = useState<QualMes>('atual')
  const [forma, setForma] = useState<Forma | null>(null)
  const [quando, setQuando] = useState<'hoje' | 'ontem' | string>('hoje')
  const [parcelas, setParcelas] = useState(1)
  const [tipoSel, setTipoSel] = useState<'saida' | 'entrada'>('saida')
  const [valor, setValor]   = useState('')
  const [desc,  setDesc]    = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)

  // Gerenciamento do grid
  const [gerenciar, setGerenciar] = useState(false)
  const [pinLocal, setPinLocal]   = useState<Set<string>>(new Set())

  const valorRef = useRef<HTMLInputElement>(null)

  const contasBanco = useMemo(() => contas.filter(c => c.tipo !== 'cartao'), [contas])
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
  const mesProximo: MesRef = useMemo(() => (mes === 11 ? { ano: ano + 1, mes: 0 } : { ano, mes: mes + 1 }), [ano, mes])
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
  const linhasAtual = useMemo(() => linhasDoMes(mesAtual), [planos, mesAtual, extratoData, faturaData, contas, categorias]) // eslint-disable-line react-hooks/exhaustive-deps
  const linhasProximo = useMemo(() => linhasDoMes(mesProximo), [planos, mesProximo, extratoData, faturaData, contas, categorias]) // eslint-disable-line react-hooks/exhaustive-deps

  const gastosHoje = useMemo(() => gastoDeHoje(contas, extratoData, faturaData, hoje), [contas, extratoData, faturaData, dia]) // eslint-disable-line react-hooks/exhaustive-deps

  // Categorias variáveis
  const catsVariaveis = useMemo(() => categorias.filter(c => !c.fixa), [categorias])
  const hasAnyPin = useMemo(() => categorias.some(c => c.pinQuick === true), [categorias])
  const catsGrid = useMemo(() => {
    if (hasAnyPin) return categorias.filter(c => c.ativa && c.pinQuick === true)
    return categorias.filter(c => c.ativa && !c.fixa)
  }, [categorias, hasAnyPin])

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

  function linhaDaCategoria(c: { nome: string; descricao?: string; tipo: 'saida' | 'entrada' }, qual: QualMes = 'atual') {
    return (qual === 'atual' ? linhasAtual : linhasProximo).get(`${c.tipo}|${catKey(c.nome, c.descricao)}`) ?? { prev: 0, real: 0 }
  }

  const formasAtual = catObj ? formasDoMes(contas, hoje, 'atual', catObj.tipo) : null
  const formasProximo = catObj ? formasDoMes(contas, hoje, 'proximo', catObj.tipo) : null
  const formasEscolhidas = qualMes === 'atual' ? formasAtual : formasProximo
  const listaDeFormas = (f: typeof formasAtual): Forma[] => !f ? [] : [
    ...f.bancos.map(c => ({ tipo: 'banco' as const, conta: c })),
    ...f.cartoes.map(c => ({ tipo: 'cartao' as const, conta: c })),
    ...(f.dinheiro ? [{ tipo: 'dinheiro' as const }] : []),
  ]

  function abrirCat(c: typeof catsGrid[0]) {
    setCatSel(c.id); setTipoSel(c.tipo); setValor(''); setDesc(''); setParcelas(1); setQuando('hoje')
    setForma(null); setQualMes('atual'); setEtapa('mes')
  }
  function fecharInput() {
    setCatSel(null); setValor(''); setDesc(''); setParcelas(1); setQuando('hoje'); setForma(null); setEtapa('mes')
  }
  function escolherMes(q: QualMes) {
    setQualMes(q)
    // Uma forma só (só um banco, sem cartão nem dinheiro): vai direto ao valor.
    const lista = listaDeFormas(q === 'atual' ? formasAtual : formasProximo)
    if (lista.length === 1) escolherForma(lista[0])
    else setEtapa('forma')
  }
  function escolherForma(f: Forma) {
    setForma(f); setParcelas(1); setEtapa('valor')
    setTimeout(() => valorRef.current?.focus(), 80)
  }
  function voltar() {
    if (etapa === 'valor' && listaDeFormas(formasEscolhidas).length > 1) setEtapa('forma')
    else setEtapa('mes')
  }

  function registrar() {
    const v = parseBRL(valor)
    if (!catObj || v <= 0 || !forma) return
    const data = dataDoLancamento(quando)
    const [aL, mL, dL] = [data.getFullYear(), data.getMonth(), data.getDate()]
    const descricao = desc.trim() || catObj.nome
    const baseId = `v-${Date.now()}`

    if (forma.tipo === 'cartao' && forma.conta) {
      // Mesmo formato da tela da fatura: fechamento, parcelas e compra como
      // `entrada` — ver lancarNaFatura.
      setFaturaData(prev => lancarNaFatura(prev, {
        cartao: forma.conta!, ano: aL, mes: mL, dia: dL,
        tipoDaCategoria: tipoSel, categoria: catObj.nome, subCategoria: catObj.descricao,
        descricao, valorParcela: v, parcelas, baseId,
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
    : f.tipo === 'cartao' ? (f.conta?.apelido || f.conta?.nome || 'Cartão') : (f.conta?.banco || f.conta?.nome || 'Banco')

  const dataHoje = hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const hora = hoje.getHours()
  const saudacao = hora >= 5 && hora < 12 ? 'Bom dia' : hora >= 12 && hora < 18 ? 'Boa tarde' : 'Boa noite'
  const nomeUser = perfil.apelido || perfil.nome.split(' ')[0] || user?.email?.split('@')[0] || 'Usuário'

  /** Um quadro de mês: o disponível da categoria, e o que já foi gasto. */
  function QuadroMes({ qual }: { qual: QualMes }) {
    if (!catObj) return null
    const m = qual === 'atual' ? mesAtual : mesProximo
    const { prev, real } = linhaDaCategoria(catObj, qual)
    const receita = catObj.tipo === 'entrada'
    const disp = prev - real
    const lista = listaDeFormas(qual === 'atual' ? formasAtual : formasProximo)
    const semForma = lista.length === 0
    return (
      <button
        onClick={() => !semForma && escolherMes(qual)}
        disabled={semForma}
        aria-label={`${Maiusc(nomeMes(m))}: ${prev > 0 ? `${receita ? 'falta receber' : 'disponível'} ${fmt(disp)}` : 'sem plano'}`}
        style={{
          flex: 1, minWidth: 0, textAlign: 'left', background: '#fff', border: `1.5px solid ${COR.borda}`,
          borderRadius: 18, padding: '14px 14px', cursor: semForma ? 'default' : 'pointer', fontFamily: 'inherit',
          display: 'flex', flexDirection: 'column', gap: 4, boxShadow: semForma ? 'none' : M.sombra,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 700, color: COR.texto }}>{Maiusc(nomeMes(m))}</span>
        {prev > 0 ? (
          <>
            <span style={{ fontSize: 13, color: COR.textoSuave }}>
              {receita ? (disp > 0 ? 'falta receber' : 'recebido') : disp >= 0 ? 'disponível' : 'passou'}
            </span>
            <span style={{ fontSize: 22, fontWeight: 800, color: receita ? COR.texto : corDoDisponivel(disp), letterSpacing: '-.4px' }}>
              {fmt(Math.abs(disp))}
            </span>
            <span style={{ fontSize: 13, color: COR.textoSuave }}>{receita ? 'recebeu' : 'gastou'} {fmt(real)} de {fmt(prev)}</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: 13, color: COR.textoSuave }}>sem plano</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: COR.texto }}>{fmt(real)}</span>
            <span style={{ fontSize: 13, color: COR.textoSuave }}>{receita ? 'recebido' : 'gasto'} no mês</span>
          </>
        )}
        <span style={{ fontSize: 13, fontWeight: 700, color: semForma ? COR.textoSuave : COR.azul, marginTop: 4 }}>
          {semForma ? 'Nenhum cartão fechado: só consulta' : 'Lançar aqui ›'}
        </span>
      </button>
    )
  }

  /** Uma forma de pagar na lista: nome, e o saldo ou o mês da fatura. */
  function LinhaForma({ f }: { f: Forma }) {
    const cartao = f.tipo === 'cartao' && f.conta
    const legenda = f.tipo === 'dinheiro' ? `saldo ${fmt(saldos.dinheiro ?? 0)}`
      : cartao ? `fatura de ${nomeMes(mesDoGastoNoCartao(f.conta!, ano, mes, dia))}`
      : `${f.conta?.nome ?? ''} · saldo ${fmt(saldos[f.conta!.id] ?? 0)}`
    const icone = f.tipo === 'dinheiro' ? '💵' : f.conta?.icone || (cartao ? '💳' : '🏦')
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
        background: 'linear-gradient(160deg,#0f2878 0%,#1e40af 100%)', borderRadius: '0 0 28px 28px',
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
            const { prev: previsto, real: realizado } = linhaDaCategoria(c)
            const disponivel = previsto - realizado
            const temPrevisto = previsto > 0 && c.tipo === 'saida'
            const ult = temPrevisto ? null : ultimoValorCat(c.nome)
            return (
              <button
                key={c.id}
                onClick={() => catSel === c.id ? fecharInput() : abrirCat(c)}
                style={{
                  background: active ? '#eff6ff' : '#fff',
                  border: `2px solid ${active ? COR.azul : 'transparent'}`, boxShadow: M.sombra,
                  borderRadius: 18, padding: '14px 6px', minHeight: 112, minWidth: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  cursor: 'pointer', transform: active ? 'scale(.95)' : undefined,
                  transition: 'all .15s',
                }}
              >
                <span aria-hidden style={{
                  width: 46, height: 46, borderRadius: '50%', fontSize: 24,
                  background: `${/^#[0-9a-f]{6}$/i.test(c.cor ?? '') ? c.cor : COR.azul}1f`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{c.icone}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: COR.texto, textAlign: 'center', lineHeight: 1.2,
                  maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.descricao ? `${c.nome} · ${c.descricao}` : c.nome}
                </span>
                {temPrevisto ? (
                  <span style={{ fontSize: 13, color: corDoDisponivel(disponivel), fontWeight: 700, textAlign: 'center' }}>
                    {fmt(disponivel)}
                  </span>
                ) : (
                  <span style={{ fontSize: 13, color: COR.textoSuave }}>
                    {ult ? fmt(ult) : c.tipo === 'entrada' ? 'receita' : ''}
                  </span>
                )}
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
            background: '#fff', borderRadius: '20px 20px 0 0', maxHeight: '88vh', overflowY: 'auto',
            padding: '10px 16px calc(16px + env(safe-area-inset-bottom))', animation: 'slideUp .2s ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 8 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e2e8f0' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              {etapa !== 'mes' && (
                <button onClick={voltar} aria-label="Voltar" style={{
                  border: 'none', background: '#f1f5f9', borderRadius: '50%', width: 40, height: 40, flexShrink: 0,
                  fontSize: 20, color: COR.texto, cursor: 'pointer', fontFamily: 'inherit',
                }}>‹</button>
              )}
              <span aria-hidden style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0, fontSize: 22,
                background: `${/^#[0-9a-f]{6}$/i.test(catObj.cor ?? '') ? catObj.cor : COR.azul}1f`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{catObj.icone || '💰'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: COR.texto, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {catObj.descricao ? `${catObj.nome} · ${catObj.descricao}` : catObj.nome}
                </div>
                <div style={{ fontSize: 13, color: COR.textoSuave }}>
                  {etapa === 'mes' ? 'Em qual mês?'
                    : etapa === 'forma' ? `${Maiusc(nomeMes(formasEscolhidas!.mes))} · como você pagou?`
                    : `${Maiusc(nomeMes(formasEscolhidas!.mes))} · ${forma ? nomeDaForma(forma) : ''}${isCartao ? ' · crédito' : ''}`}
                </div>
              </div>
              <button onClick={fecharInput} aria-label="Fechar"
                style={{ border: 'none', background: 'transparent', fontSize: 20, color: '#94a3b8', cursor: 'pointer', padding: 8 }}>✕</button>
            </div>

            {etapa === 'mes' && (
              <div style={{ display: 'flex', gap: 10 }}>
                <QuadroMes qual="atual" />
                {catObj.tipo === 'saida' && <QuadroMes qual="proximo" />}
              </div>
            )}

            {etapa === 'forma' && formasEscolhidas && (
              <div>
                {formasEscolhidas.bancos.length > 0 && <div style={tituloGrupo}>🏦 Banco</div>}
                {formasEscolhidas.bancos.map(c => <LinhaForma key={c.id} f={{ tipo: 'banco', conta: c }} />)}
                {formasEscolhidas.cartoes.length > 0 && <div style={tituloGrupo}>💳 Cartão</div>}
                {formasEscolhidas.cartoes.map(c => <LinhaForma key={c.id} f={{ tipo: 'cartao', conta: c }} />)}
                {formasEscolhidas.dinheiro && <div style={tituloGrupo}>💵 Dinheiro</div>}
                {formasEscolhidas.dinheiro && <LinhaForma f={{ tipo: 'dinheiro' }} />}
                {qualMes === 'atual' && catObj.tipo === 'saida' && formasProximo && formasProximo.cartoes.length > 0 && (
                  <div style={{ fontSize: 13, color: COR.textoSuave, margin: '12px 4px 0', lineHeight: 1.45 }}>
                    {formasProximo.cartoes.map(c => c.apelido || c.nome).join(', ')} já {formasProximo.cartoes.length > 1 ? 'fecharam' : 'fechou'} a
                    fatura: a compra de hoje conta em {nomeMes(mesProximo)}, e {formasProximo.cartoes.length > 1 ? 'eles aparecem' : 'ele aparece'} lá.
                  </div>
                )}
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
                      : '📅 Outro dia'}
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
                    placeholder={parcelas > 1 ? 'Valor da parcela' : 'R$ 0,00'}
                    aria-label={parcelas > 1 ? 'Valor de cada parcela' : 'Valor'}
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

                {parcelas > 1 && parseBRL(valor) > 0 && (
                  <div style={{ fontSize: 14, color: COR.textoSuave, marginTop: -4, marginBottom: 8, textAlign: 'center' }}>
                    {parcelas}× de {fmt(parseBRL(valor))} · total {fmt(parseBRL(valor) * parcelas)}
                  </div>
                )}

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
                >{isCartao ? '💳 Lançar na fatura' : '✓ Registrar lançamento'}</button>
              </>
            )}
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
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e2e8f0' }}/>
            </div>
            <div style={{
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
              padding: '12px 20px 14px', borderBottom: `1px solid ${COR.borda}`,
            }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: COR.texto }}>Categorias no Início</div>
                <div style={{ fontSize: 12, color: COR.textoSuave, marginTop: 3 }}>
                  Categorias variáveis disponíveis no lançamento rápido
                </div>
              </div>
              <button
                onClick={() => setGerenciar(false)}
                style={{ border: 'none', background: 'transparent', fontSize: 20, color: '#94a3b8', cursor: 'pointer', padding: 4, flexShrink: 0 }}
              >✕</button>
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
                        {tipo === 'saida' ? '📤 Saídas' : '📥 Entradas'}
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
                            <span style={{ fontSize: 24, opacity: c.ativa ? 1 : .4, flexShrink: 0 }}>{c.icone}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: c.ativa ? COR.texto : '#94a3b8' }}>
                                {c.nome}
                              </div>
                              {!c.ativa && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>inativa</div>}
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
