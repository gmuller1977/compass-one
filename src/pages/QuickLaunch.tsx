import { useState, useEffect, useRef, useMemo } from 'react'
import { parseBRL } from '../utils/moeda'
import { limiteCartaoPlanejado } from '../utils/limiteCartao'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import BottomNav from '../components/BottomNav'
import type { DadosMes } from '../context/AppContext'
import { COR } from '../utils/cores'
import { M } from '../components/mobile/estilo'
import { saldoRealizadoConta, type Deps } from '../utils/saldoConta'
import { construirRealizadoMes } from '../utils/realizadoMes'
import { nomesDeCartao, totaisDoMes, catKey } from '../components/acompanhamento/evolucaoCalcs'
import { totalComprasFatura, mesDaFaturaDaCompra, lancarNaFatura, lancarNoExtrato, dataDoLancamento } from '../utils/lancamentoRapido'
import { interpretarLancamento } from '../utils/interpretarLancamento'
import EntradaPorTexto from '../components/quickLaunch/EntradaPorTexto'

function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
}


type FaturaLanc = {
  id: string; tipo: 'saida' | 'entrada'; consolidado?: boolean
  descricao: string; categoria: string
  valor: number; formaPagamento: 'credito'
  tipoLanc: 'variavel'
  diaCompra?: number; mesCompra?: number; anoCompra?: number
}
type FaturaMes = { lancamentos: Record<number, FaturaLanc[]>; faturaAtual: string }

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

export default function QuickLaunch() {
  const { user, contas, categorias, extratoData, faturaData, planos, updateExtratoMes, setFaturaData, setCategorias, perfil, saldoInicialDinheiro, cenarioPrevisao } = useApp()
  const navigate   = useNavigate()
  const isMobile   = useIsMobile()

  useEffect(() => {
    if (!isMobile) navigate('/dashboard', { replace: true })
  }, [isMobile, navigate])

  const hoje = new Date()
  const ano  = hoje.getFullYear()
  const mes  = hoje.getMonth()
  const dia  = hoje.getDate()

  const [contaSelId, setContaSelId] = useState<string | null>(null)
  const [escolherConta, setEscolherConta] = useState(false)
  // Id da categoria — o nome não basta: variantes (Seguro · Civic, Seguro ·
  // March) têm o mesmo nome e são categorias diferentes.
  const [catSel, setCatSel] = useState<string | null>(null)
  const [quando, setQuando] = useState<'hoje' | 'ontem' | string>('hoje')
  const [parcelas, setParcelas] = useState(1)
  const [tipoSel, setTipoSel] = useState<'saida' | 'entrada'>('saida')
  const [valor, setValor]   = useState('')
  const [desc,  setDesc]    = useState('')
  const [feedback, setFeedback] = useState(false)

  // Gerenciamento do grid
  const [gerenciar, setGerenciar] = useState(false)
  const [pinLocal, setPinLocal]   = useState<Set<string>>(new Set())

  const valorRef = useRef<HTMLInputElement>(null)

  const contasBanco  = useMemo(() => contas.filter(c => c.tipo !== 'cartao'), [contas])
  const contasCartao = useMemo(() => contas.filter(c => c.tipo === 'cartao'),  [contas])

  // Inicializa com a primeira conta bancária
  useEffect(() => {
    if (!contaSelId && contasBanco.length > 0) setContaSelId(contasBanco[0].id)
  }, [contasBanco, contaSelId])

  const contaSel = useMemo(
    () => contas.find(c => c.id === contaSelId) ?? contasBanco[0] ?? null,
    [contas, contaSelId, contasBanco]
  )
  const isCartao = contaSel?.tipo === 'cartao'

  const key = contaSel ? mesKey(contaSel.id, ano, mes) : ''

  const mesDadosBanco: DadosMes = (extratoData as Record<string, DadosMes>)[key] ?? {
    lancamentos: {}, saldoBanco: '0',
  }
  // Limite planejado e total das faturas: os dois sao AGREGADOS, do conjunto
  // dos cartoes. O planejamento e por total, nao por cartao — nao ha no dado a
  // que cartao cada categoria pertence. Ver utils/limiteCartao.
  const limitePlanejadoCartoes = useMemo(
    () => limiteCartaoPlanejado(planos[ano], categorias, mes),
    [planos, ano, categorias, mes],
  )
  // Compras menos estornos: na fatura `entrada` é compra (ver lancamentoRapido).
  const totalFaturasMes = useMemo(() => {
    const fat = faturaData as Record<string, FaturaMes>
    return contas.filter(c => c.tipo === 'cartao').reduce(
      (soma, c) => soma + totalComprasFatura(fat[mesKey(c.id, ano, mes)]), 0)
  }, [contas, faturaData, ano, mes])

  // O saldo das contas é o MESMO do Radar e de Lançamentos: conciliação,
  // fixas confirmadas e pagamento de fatura entram (saldoConta). Antes o
  // Quick Launch somava só os lançamentos, com uma função própria.
  const depsSaldo: Deps = useMemo(() => ({
    extratoData: extratoData as Record<string, DadosMes>,
    faturaData: faturaData as Deps['faturaData'],
    contas, categorias, planos, saldoInicialDinheiro, cenarioPrevisao,
  }), [extratoData, faturaData, contas, categorias, planos, saldoInicialDinheiro, cenarioPrevisao])

  const saldoAtual = useMemo(() => {
    if (!contaSel) return 0
    if (isCartao) return limitePlanejadoCartoes - totalFaturasMes
    return saldoRealizadoConta(contaSel.id, ano, mes, depsSaldo)
  }, [contaSel, isCartao, ano, mes, depsSaldo, limitePlanejadoCartoes, totalFaturasMes])

  const saldosBanco = useMemo(() => {
    const map: Record<string, number> = {}
    for (const c of contasBanco) map[c.id] = saldoRealizadoConta(c.id, ano, mes, depsSaldo)
    return map
  }, [contasBanco, ano, mes, depsSaldo])

  // Previsto e realizado de cada categoria saem das linhas do Radar
  // (totaisDoMes), por (nome, variante) — cartão e dinheiro incluídos.
  const linhasSaidaDoMes = useMemo(() => {
    const planoAno = planos[ano]
    const { saidasMap, entradasMap } = construirRealizadoMes({
      ano, mes, extratoData: extratoData as Record<string, DadosMes>,
      faturaData, contas, categorias, planoAno,
    })
    const t = totaisDoMes({ mes, planoAno, categorias, cartaoNomes: nomesDeCartao(contas), entradasMap, saidasMap })
    const porChave = new Map<string, { prev: number; real: number }>()
    for (const l of t.saida.linhas) porChave.set(catKey(l.nome, l.descricao), { prev: l.prev, real: l.real })
    return porChave
  }, [planos, ano, mes, extratoData, faturaData, contas, categorias])

  const gastosHoje = useMemo(() => {
    if (isCartao && contaSel) {
      // A compra de hoje pode ter ido para a fatura seguinte (fechamento).
      const fm = mesDaFaturaDaCompra(contaSel, ano, mes, dia)
      const dm = (faturaData as Record<string, FaturaMes>)[mesKey(contaSel.id, fm.ano, fm.mes)]
      return totalComprasFatura({ lancamentos: { [dia]: dm?.lancamentos[dia] ?? [] } })
    }
    return (mesDadosBanco.lancamentos[dia] ?? [])
      .filter(l => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0)
  }, [isCartao, contaSel, faturaData, ano, mes, mesDadosBanco, dia])

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
    setPinLocal(prev => { const n = new Set(prev); n.has(catId) ? n.delete(catId) : n.add(catId); return n })
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

  function linhaDaCategoria(c: { nome: string; descricao?: string }) {
    return linhasSaidaDoMes.get(catKey(c.nome, c.descricao)) ?? { prev: 0, real: 0 }
  }

  function abrirCat(c: typeof catsGrid[0]) {
    setCatSel(c.id); setTipoSel(c.tipo); setValor(''); setDesc(''); setParcelas(1); setQuando('hoje')
    setTimeout(() => valorRef.current?.focus(), 80)
  }
  function fecharInput() { setCatSel(null); setValor(''); setDesc(''); setParcelas(1); setQuando('hoje') }

  /** "47 mercado nubank" → abre o lançamento já preenchido, para confirmar. */
  function aplicarTexto(texto: string): string | null {
    const r = interpretarLancamento(texto, categorias, contas)
    const cat = r.categoriaId ? categorias.find(c => c.id === r.categoriaId) : undefined
    if (!cat && r.valor === undefined) return 'Não entendi. Tente algo como "47 mercado nubank".'
    if (r.contaId) setContaSelId(r.contaId)
    if (cat) { setCatSel(cat.id); setTipoSel(cat.tipo) }
    setValor(r.valor !== undefined ? r.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '')
    setDesc(r.descricao ? r.descricao.charAt(0).toUpperCase() + r.descricao.slice(1) : '')
    setParcelas(r.parcelas ?? 1)
    setQuando(r.diasAtras === 1 ? 'ontem' : 'hoje')
    if (!cat) return 'Valor entendido. Agora toque na categoria.'
    setTimeout(() => valorRef.current?.focus(), 80)
    return null
  }

  function registrar() {
    const v = parseBRL(valor)
    if (!catObj || v <= 0 || !contaSel) return
    const data = dataDoLancamento(quando)
    const [aL, mL, dL] = [data.getFullYear(), data.getMonth(), data.getDate()]
    const descricao = desc.trim() || catObj.nome
    const baseId = `v-${Date.now()}`

    if (isCartao) {
      // Mesmo formato da tela da fatura: fechamento, parcelas e compra como
      // `entrada` — ver lancarNaFatura.
      setFaturaData(prev => lancarNaFatura(prev, {
        cartao: contaSel, ano: aL, mes: mL, dia: dL,
        tipoDaCategoria: tipoSel, categoria: catObj.nome, subCategoria: catObj.descricao,
        descricao, valorParcela: v, parcelas, baseId,
      }))
    } else {
      const fp  = catObj.formaPagamento ?? (tipoSel === 'saida' ? 'debito' : 'dinheiro')
      updateExtratoMes(mesKey(contaSel.id, aL, mL), prev => lancarNoExtrato(prev, {
        dia: dL, tipo: tipoSel, categoria: catObj.nome, subCategoria: catObj.descricao, descricao,
        valor: v, formaPagamento: fp as 'debito' | 'pix' | 'transferencia' | 'dinheiro', id: baseId,
      }))
    }

    setFeedback(true)
    fecharInput()
    setTimeout(() => setFeedback(false), 2000)
  }

  const dataHoje = hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const hora = hoje.getHours()
  const saudacao = hora >= 5 && hora < 12 ? 'Bom dia' : hora >= 12 && hora < 18 ? 'Boa tarde' : 'Boa noite'
  const nomeUser = perfil.apelido || perfil.nome.split(' ')[0] || user?.email?.split('@')[0] || 'Usuário'

  return (
    <div style={{
      minHeight: '100vh', background: M.fundo,
      display: 'flex', flexDirection: 'column',
      fontFamily: "-apple-system,'Inter',sans-serif",
      paddingBottom: 80,
    }}>
      <style>{`@keyframes slideUp{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}`}</style>

      {/* Header: título e o gasto de hoje. A faixa "Despesas hoje · Mês ·
          Dia" (letras de 9 px) saiu no redesenho do celular: virou esta linha. */}
      <div style={{
        background: 'linear-gradient(160deg,#0f2878 0%,#1e40af 100%)', borderRadius: '0 0 28px 28px',
        padding: 'calc(18px + env(safe-area-inset-top)) 20px 40px', flexShrink: 0,
      }}>
        <div style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>{saudacao}, {nomeUser} 👋</div>
        <div style={{ color: 'rgba(255,255,255,.75)', fontSize: 15, marginTop: 4 }}>
          {gastosHoje > 0
            ? <>Hoje você já gastou <b style={{ color: '#fff' }}>{fmt(gastosHoje)}</b></>
            : <>{dataHoje.charAt(0).toUpperCase() + dataHoje.slice(1)}</>}
        </div>
      </div>

      {/* Conta card — clicável para abrir seletor */}
      {contaSel && (
        <div
          onClick={() => setEscolherConta(true)}
          style={{
            margin: '0 16px', marginTop: -24,
            background: '#fff', borderRadius: M.raio, padding: '16px 18px',
            boxShadow: '0 6px 24px rgba(15,40,120,.12)',
            display: 'flex', alignItems: 'center', gap: 12,
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: '50%', background: contaSel.cor || COR.azul,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, flexShrink: 0,
          }}>{contaSel.icone || (isCartao ? '💳' : '🏦')}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, color: COR.textoSuave, fontWeight: 500, marginBottom: 1 }}>
              {isCartao ? (contaSel.apelido || contaSel.banco) : contaSel.banco}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: COR.texto, letterSpacing: '-.5px' }}>
              {isCartao
                ? <span style={{ color: saldoAtual < 0 ? COR.vermelho : COR.texto }}>{fmt(saldoAtual)}</span>
                : fmt(saldoAtual)
              }
            </div>
            <div style={{ fontSize: 13, color: COR.textoSuave, marginTop: 1 }}>
              {isCartao ? `disponível nos cartões · plano ${fmt(limitePlanejadoCartoes)}` : contaSel.nome}
            </div>
          </div>
          <div style={{
            fontSize: 14, color: COR.azul, background: '#eff6ff',
            padding: '8px 12px', borderRadius: 20, fontWeight: 700,
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>Trocar</div>
        </div>
      )}

      {/* Grid */}
      <div style={{ flex: 1, padding: '16px 16px 6px', overflowY: 'auto' }}>
        <EntradaPorTexto onTexto={aplicarTexto} />
        <div style={{
          fontSize: M.titulo, fontWeight: 700, color: COR.texto,
          marginBottom: 12, marginTop: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>{isCartao ? 'O que você comprou?' : 'O que você gastou?'}</span>
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
          {Array.from({ length: 9 }, (_, i) => {
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
            const linha      = c.tipo === 'saida' ? linhaDaCategoria(c) : { prev: 0, real: 0 }
            const previsto   = linha.prev
            const realizado  = linha.real
            const disponivel = previsto - realizado
            const temPrevisto = previsto > 0
            const corDisp = disponivel < 0 ? COR.vermelho : disponivel < previsto * .2 ? '#b45309' : COR.verde
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
                  {c.nome}
                </span>
                {temPrevisto ? (
                  <span style={{ fontSize: 13, color: corDisp, fontWeight: 700, textAlign: 'center' }}>
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

      </div>

      {/* Input rápido */}
      {catSel && (
        <div style={{
          background: '#fff', borderTop: `2px solid ${isCartao ? '#7c3aed' : COR.azul}`,
          padding: '12px 16px 8px', flexShrink: 0, animation: 'slideUp .2s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: isCartao ? '#f5f3ff' : '#eff6ff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>
              {catObj?.icone ?? '💰'}
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: COR.texto }}>
                {catObj ? (catObj.descricao ? `${catObj.nome} · ${catObj.descricao}` : catObj.nome) : ''}
              </div>
              <div style={{ fontSize: 13, color: COR.textoSuave }}>
                {tipoSel === 'saida' ? 'Despesa' : 'Receita'} · {contaSel?.nome}
                {isCartao ? ' · Crédito 💳' : ''}
              </div>
            </div>
            <button
              onClick={fecharInput}
              style={{ marginLeft: 'auto', border: 'none', background: 'transparent', fontSize: 20, color: '#94a3b8', cursor: 'pointer', padding: 4 }}
            >✕</button>
          </div>

          {/* Quando, parcelas e o último valor da categoria: o que faltava
              para não precisar ir à tela completa de Lançamentos. */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {(['hoje', 'ontem'] as const).map(q => (
              <button key={q} onClick={() => setQuando(q)} style={chip(quando === q)}>
                {q === 'hoje' ? 'Hoje' : 'Ontem'}
              </button>
            ))}
            <label style={{ ...chip(quando !== 'hoje' && quando !== 'ontem'), position: 'relative' }}>
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
                flex: '1.2', border: `2px solid ${isCartao ? '#7c3aed' : COR.azul}`, borderRadius: 12,
                padding: '12px 12px', fontSize: 24, fontWeight: 800, minWidth: 0,
                color: isCartao ? '#7c3aed' : COR.azul, background: isCartao ? '#f5f3ff' : '#eff6ff',
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
              width: '100%', padding: 13, border: 'none', borderRadius: 14,
              background: isCartao
                ? 'linear-gradient(135deg,#7c3aed,#a855f7)'
                : `linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,
              color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >{isCartao ? '💳 Lançar na fatura' : '✓ Registrar lançamento'}</button>
        </div>
      )}

      {/* Feedback toast */}
      {feedback && (
        <div style={{
          position: 'fixed', top: '45%', left: '50%',
          transform: 'translate(-50%,-50%)',
          background: COR.verde, color: '#fff', borderRadius: 14,
          padding: '14px 24px', fontSize: 14, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 8,
          zIndex: 200, boxShadow: '0 8px 30px rgba(22,163,74,.4)',
          whiteSpace: 'nowrap',
        }}>
          ✓ Lançamento registrado!
        </div>
      )}

      {/* ── Bottom sheet: selecionar conta ── */}
      {escolherConta && (
        <>
          <div
            onClick={() => setEscolherConta(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 110 }}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 111,
            background: '#fff', borderRadius: '20px 20px 0 0',
            maxHeight: '75vh', display: 'flex', flexDirection: 'column',
            animation: 'slideUp .25s ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e2e8f0' }}/>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 20px 14px', borderBottom: `1px solid ${COR.borda}`,
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: COR.texto }}>Selecionar conta</div>
              <button
                onClick={() => setEscolherConta(false)}
                style={{ border: 'none', background: 'transparent', fontSize: 20, color: '#94a3b8', cursor: 'pointer', padding: 4 }}
              >✕</button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {/* Contas bancárias */}
              {contasBanco.length > 0 && (
                <>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: COR.textoSuave, textTransform: 'uppercase',
                    letterSpacing: '.5px', padding: '12px 20px 6px', background: '#f8fafc',
                  }}>🏦 Contas</div>
                  {contasBanco.map(c => {
                    const sel = c.id === contaSel?.id
                    return (
                      <div
                        key={c.id}
                        onClick={() => { setContaSelId(c.id); setEscolherConta(false) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 20px', cursor: 'pointer',
                          background: sel ? '#eff6ff' : '#fff',
                          borderBottom: `1px solid ${COR.borda}`,
                        }}
                      >
                        <div style={{
                          width: 40, height: 40, borderRadius: 10, background: c.cor || COR.azul,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 20, flexShrink: 0,
                        }}>{c.icone || '🏦'}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: COR.texto }}>{c.banco}</div>
                          <div style={{ fontSize: 13, color: COR.textoSuave, marginTop: 1 }}>{c.nome}</div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: saldosBanco[c.id] >= 0 ? COR.verde : COR.vermelho, flexShrink: 0 }}>
                          {fmt(saldosBanco[c.id] ?? 0)}
                        </div>
                        {sel && (
                          <div style={{
                            width: 20, height: 20, borderRadius: '50%', background: COR.azul,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: 12, flexShrink: 0,
                          }}>✓</div>
                        )}
                      </div>
                    )
                  })}
                </>
              )}

              {/* Cartões */}
              {contasCartao.length > 0 && (
                <>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: COR.textoSuave, textTransform: 'uppercase',
                    letterSpacing: '.5px', padding: '12px 20px 6px', background: '#f8fafc',
                  }}>💳 Cartões de crédito</div>
                  {contasCartao.map(c => {
                    const sel = c.id === contaSel?.id
                    const fatMes = (faturaData as Record<string, FaturaMes>)[mesKey(c.id, ano, mes)] ?? { lancamentos: {}, faturaAtual: '' }
                    const totalFat = totalComprasFatura(fatMes)

                    return (
                      <div
                        key={c.id}
                        onClick={() => { setContaSelId(c.id); setEscolherConta(false) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 20px', cursor: 'pointer',
                          background: sel ? '#f5f3ff' : '#fff',
                          borderBottom: `1px solid ${COR.borda}`,
                        }}
                      >
                        <div style={{
                          width: 40, height: 40, borderRadius: 10, background: c.cor || '#7c3aed',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 20, flexShrink: 0,
                        }}>{c.icone || '💳'}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: COR.texto }}>{c.nome}</div>
                          <div style={{ fontSize: 13, color: COR.textoSuave, marginTop: 1 }}>
                            Fatura: {fmt(totalFat)}
                          </div>
                        </div>
                        {sel && (
                          <div style={{
                            width: 20, height: 20, borderRadius: '50%', background: '#7c3aed',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: 12, flexShrink: 0,
                          }}>✓</div>
                        )}
                      </div>
                    )
                  })}
                </>
              )}

              {contas.length === 0 && (
                <div style={{ padding: 32, textAlign: 'center', color: COR.textoSuave, fontSize: 13 }}>
                  Nenhuma conta cadastrada.
                </div>
              )}
            </div>
          </div>
        </>
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
