import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import { useNorte, type Mensagem } from '../components/norte/useNorte'
import { M, fmt } from '../components/mobile/estilo'
import { ACOES_NORTE, separarAcoes, sugestoesDoNorte, type AcaoNorte } from '../utils/contextoNorte'
import { lerPedido, detalhesDoPedido, type PedidoNorte, type PedidoLancar, type PedidoPagar } from '../utils/acoesNorte'
import { simularCompra } from '../utils/simulacaoCompra'
import { Resposta } from '../components/simulacao/SimCompra'
import { useApp, type DadosMes } from '../context/AppContext'
import type { Deps } from '../utils/saldoConta'
import { reconhecimentoDeVoz, type Reconhecimento } from '../utils/voz'
import { COR } from '../utils/cores'
import { SIDEBAR_W } from '../components/Sidebar'

/**
 * A tela do Norte (10/10/2026): pedido do Guilherme, "temos que melhorar muito
 * o agente, talvez uma tela única só para ele". Antes era um painel por cima
 * da tela, aberto por um botão flutuante.
 *
 *   - Abre com o resumo do dia, sem precisar perguntar — os números da
 *     Bússola, calculados no aparelho, sem IA.
 *   - Perguntas prontas conforme a situação (`sugestoesDoNorte`).
 *   - Resposta curta, com botões para a tela certa: o Norte escreve [[radar]]
 *     e aqui vira "Ver no Radar" (`separarAcoes`).
 *   - A conversa fica guardada no aparelho (useNorte).
 *
 * Os números que o Norte conhece são os do app (utils/contextoNorte, prova63).
 */
export default function Norte() {
  const navigate = useNavigate()
  const { dados, deps, messages, loading, enviar, limpar, nome, marcarPedido, lancar, pagar } = useNorte()
  const { extratoData } = useApp()
  const [texto, setTexto] = useState('')
  const [ouvindo, setOuvindo] = useState(false)
  const rec = useRef<Reconhecimento | null>(null)
  const fimRef = useRef<HTMLDivElement>(null)
  const Voz = reconhecimentoDeVoz()
  // No computador não há barra de baixo: a caixa encosta no pé da tela.
  const celular = typeof window !== 'undefined' && window.innerWidth < 640
  const sugestoes = useMemo(() => sugestoesDoNorte(dados), [dados])
  const b = dados.bussola
  const r = b.ritmo

  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages, loading])

  function mandar(t: string) {
    const v = t.trim()
    if (!v || loading) return
    enviar(v)
    setTexto('')
  }
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); mandar(texto) }
  }
  function ouvir() {
    if (!Voz) return
    if (ouvindo) { rec.current?.stop(); return }
    const rr = new Voz()
    rr.lang = 'pt-BR'; rr.interimResults = false; rr.maxAlternatives = 1
    rr.onresult = e => mandar(e.results[0]?.[0]?.transcript ?? '')
    rr.onerror = () => setOuvindo(false)
    rr.onend = () => setOuvindo(false)
    rec.current = rr
    setOuvindo(true)
    rr.start()
  }
  function irPara(a: AcaoNorte) {
    const rota = ACOES_NORTE[a].rota
    if (rota.startsWith('/#')) {
      navigate('/')
      setTimeout(() => document.getElementById(rota.slice(2))?.scrollIntoView({ behavior: 'smooth' }), 400)
    } else navigate(rota)
  }

  const hora = new Date().getHours()
  const saudacao = hora >= 5 && hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div style={{ minHeight: '100dvh', background: M.fundo, fontFamily: "-apple-system,'Inter',sans-serif" }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'linear-gradient(160deg,#0f2878 0%,#1e40af 100%)', color: '#fff',
        padding: 'calc(14px + env(safe-area-inset-top)) 16px 14px', borderRadius: '0 0 24px 24px',
        boxShadow: '0 4px 18px rgba(15,40,120,.18)',
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span aria-hidden style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,.16)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>🧭</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Norte</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.75)' }}>
              {loading ? 'pensando…' : 'Assistente financeiro'}
            </div>
          </div>
          {messages.length > 0 && (
            <button onClick={limpar} style={{
              border: 'none', background: 'rgba(255,255,255,.14)', color: '#fff', borderRadius: 999,
              padding: '9px 14px', minHeight: 40, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
            }}>Nova conversa</button>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 640, margin: '0 auto', padding: '16px 16px 210px' }}>
        {/* O resumo do dia: sem IA, os números da Bússola. */}
        <Bolha>
          <div style={{ fontSize: 16, fontWeight: 700, color: COR.texto }}>{saudacao}{nome ? `, ${nome}` : ''}! 👋</div>
          {r ? (
            <div style={{ marginTop: 6, fontSize: 15, color: COR.texto, lineHeight: 1.5 }}>
              {r.estado === 'passou'
                ? <>O gasto variável passou do plano em <b style={{ color: COR.erroTexto }}>{fmt(r.gasto - r.planejado)}</b>.</>
                : <>Ainda dá para gastar <b>{fmt(r.sobra)}</b>, uns <b>{fmt(r.porDia)}</b> por dia.</>}
              {' '}O mês termina com <b style={{ color: b.fechamento < 0 ? COR.erroTexto : undefined }}>{fmt(b.fechamento)}</b>.
              {b.contas.length > 0 && <> {b.contas.length === 1 ? 'Uma conta vence' : `${b.contas.length} contas vencem`} nos próximos dias.</>}
            </div>
          ) : (
            <div style={{ marginTop: 6, fontSize: 15, color: COR.texto, lineHeight: 1.5 }}>
              Hoje você tem <b>{fmt(b.saldoHoje)}</b> no banco e em dinheiro, e o mês termina com <b>{fmt(b.fechamento)}</b>.
            </div>
          )}
          <div style={{ marginTop: 8, fontSize: 14, color: COR.textoSuave }}>Pergunte o que quiser sobre o seu dinheiro.</div>
        </Bolha>

        {messages.map(m => (
          <MensagemNorte key={m.ts + m.role} m={m} onAcao={irPara}
            cad={{ categorias: deps.categorias, contas: deps.contas, aVencer: dados.bussola.contas, extratoData: extratoData as Record<string, DadosMes> }}
            deps={deps}
            onFeito={(p) => {
              const ok = p.tipo === 'lancar' ? lancar(p) : p.tipo === 'pagar' ? pagar(p) : false
              if (ok) marcarPedido(m.ts, 'feito')
              return ok
            }}
            onCancelar={() => marcarPedido(m.ts, 'cancelado')} />
        ))}

        {loading && (
          <Bolha>
            <span aria-label="O Norte está escrevendo" style={{ display: 'inline-flex', gap: 5, padding: '4px 0' }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: COR.textoSuave,
                  animation: `norteDot 1s ${i * 0.15}s infinite ease-in-out` }} />
              ))}
            </span>
          </Bolha>
        )}

        {!loading && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            {(messages.length ? sugestoes.filter(x => !messages.some(m => m.content === x)).slice(0, 3) : sugestoes).map(s => (
              <button key={s} onClick={() => mandar(s)} style={{
                border: `1.5px solid #c7d7fe`, background: '#fff', color: COR.azul, borderRadius: 999,
                padding: '10px 14px', minHeight: 44, fontSize: 15, fontWeight: 600, fontFamily: 'inherit',
                cursor: 'pointer', textAlign: 'left',
              }}>{s}</button>
            ))}
          </div>
        )}
        <div ref={fimRef} />
      </main>

      {/* Caixa de pergunta, presa acima da barra de baixo. 16 px: menos que
          isso o iPhone dá zoom ao tocar. */}
      <div style={{
        position: 'fixed', left: celular ? 0 : SIDEBAR_W, right: 0, bottom: celular ? 'calc(104px + env(safe-area-inset-bottom))' : 0, zIndex: 90,
        padding: '10px 12px', background: `linear-gradient(to top, ${M.fundo} 70%, transparent)`,
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={onKeyDown} rows={1}
            placeholder={ouvindo ? 'Ouvindo…' : 'Pergunte ao Norte'} aria-label="Pergunta para o Norte"
            style={{
              flex: 1, resize: 'none', border: `1.5px solid ${COR.borda}`, borderRadius: 22, padding: '12px 16px',
              fontSize: 16, fontFamily: 'inherit', color: COR.texto, background: '#fff', outline: 'none',
              boxShadow: M.sombra, maxHeight: 120, minHeight: 48, boxSizing: 'border-box',
            }} />
          {Voz && !texto.trim() ? (
            <button onClick={ouvir} aria-label={ouvindo ? 'Parar de ouvir' : 'Falar'} style={botaoRedondo(ouvindo)}>🎤</button>
          ) : (
            <button onClick={() => mandar(texto)} disabled={!texto.trim() || loading} aria-label="Enviar" style={botaoRedondo(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <style>{'@keyframes norteDot{0%,80%,100%{opacity:.3;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}'}</style>
      <BottomNav />
    </div>
  )
}

function botaoRedondo(forte: boolean) {
  return {
    width: 48, height: 48, borderRadius: '50%', border: 'none', flexShrink: 0, cursor: 'pointer',
    background: forte ? `linear-gradient(135deg,${COR.azul},${COR.azulMedio})` : '#fff',
    color: forte ? '#fff' : COR.texto, fontSize: 20, boxShadow: M.sombra,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  } as const
}

function Bolha({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 12 }}>
      <span aria-hidden style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, fontSize: 16,
        background: 'linear-gradient(135deg,#0f2878,#1e40af)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🧭</span>
      <div style={{ background: '#fff', borderRadius: '20px 20px 20px 6px', padding: '12px 16px', boxShadow: M.sombra, maxWidth: '86%', minWidth: 0 }}>
        {children}
      </div>
    </div>
  )
}

type Cad = { categorias: Deps['categorias']; contas: Deps['contas']; aVencer: ReturnType<typeof useNorte>['dados']['bussola']['contas']; extratoData: Record<string, DadosMes> }

function MensagemNorte({ m, onAcao, cad, deps, onFeito, onCancelar }: {
  m: Mensagem; onAcao: (a: AcaoNorte) => void; cad: Cad; deps: Deps
  onFeito: (p: PedidoLancar | PedidoPagar) => boolean; onCancelar: () => void
}) {
  if (m.role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <div style={{ background: COR.azul, color: '#fff', borderRadius: '20px 20px 6px 20px', padding: '11px 16px',
          fontSize: 15, lineHeight: 1.45, maxWidth: '82%', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{m.content}</div>
      </div>
    )
  }
  const { texto: semPedido, leitura } = lerPedido(m.content, cad)
  const { texto, acoes } = separarAcoes(semPedido)
  return (
    <>
      <Bolha>
        {texto && <Texto texto={texto} />}
        {leitura && !leitura.ok && !m.pedido && (
          <div role="alert" style={{ marginTop: 10, fontSize: 14, color: COR.erroTexto, background: COR.erroFundo, borderRadius: 12, padding: '8px 12px' }}>
            Não consegui preparar isso: {leitura.erro}
          </div>
        )}
        {leitura?.ok && leitura.pedido.tipo !== 'simular' && (
          <CartaoPedido pedido={leitura.pedido} estado={m.pedido} cad={cad} onFeito={onFeito} onCancelar={onCancelar} />
        )}
        {acoes.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {acoes.map(a => (
              <button key={a} onClick={() => onAcao(a)} style={{
                border: 'none', background: '#eff6ff', color: COR.azul, borderRadius: 999, padding: '9px 14px',
                minHeight: 40, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
              }}>{ACOES_NORTE[a].rotulo} ›</button>
            ))}
          </div>
        )}
      </Bolha>
      {leitura?.ok && leitura.pedido.tipo === 'simular' && <Simulacao pedido={leitura.pedido} deps={deps} />}
    </>
  )
}

/**
 * O cartão do pedido: o que vai ser gravado, e os dois botões. Só o toque em
 * "Confirmar" grava; depois disso o cartão fica como registro ("✓ Lançado"),
 * guardado na conversa — recarregar a tela não oferece o mesmo pedido de novo.
 */
function CartaoPedido({ pedido, estado, cad, onFeito, onCancelar }: {
  pedido: PedidoLancar | PedidoPagar; estado?: 'feito' | 'cancelado'; cad: Cad
  onFeito: (p: PedidoLancar | PedidoPagar) => boolean; onCancelar: () => void
}) {
  const [falhou, setFalhou] = useState(false)
  // Dois toques rápidos não gravam duas vezes.
  const [gravando, setGravando] = useState(false)
  const det = detalhesDoPedido(pedido, cad)
  const linha = (rot: string, val: ReactNode) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 15, padding: '4px 0' }}>
      <span style={{ color: COR.textoSuave }}>{rot}</span><span style={{ color: COR.texto, fontWeight: 600, textAlign: 'right' }}>{val}</span>
    </div>
  )
  let titulo: string, corpo: ReactNode, rotFeito: string
  if (pedido.tipo === 'lancar') {
    const d = det as { categoria: string; icone: string; entrada: boolean; conta: string; quando: string }
    titulo = d.entrada ? 'Lançar receita' : 'Lançar gasto'
    rotFeito = '✓ Lançado'
    corpo = <>
      <div style={{ fontSize: 26, fontWeight: 800, color: d.entrada ? COR.azul : COR.texto, margin: '2px 0 6px' }}>
        {d.entrada ? '+' : '−'}{fmt(pedido.valor)}{pedido.parcelas > 1 && <span style={{ fontSize: 15, fontWeight: 600, color: COR.textoSuave }}> por parcela</span>}
      </div>
      {linha('Categoria', <>{d.icone} {d.categoria}</>)}
      {linha(d.entrada ? 'Entra em' : 'Pago com', d.conta)}
      {linha('Quando', d.quando)}
      {pedido.parcelas > 1 && linha('Parcelas', `${pedido.parcelas}× · total ${fmt(pedido.valor * pedido.parcelas)}`)}
      {pedido.descricao && linha('Descrição', pedido.descricao)}
    </>
  } else {
    const d = det as { de?: string; deNome: string }
    titulo = 'Marcar como paga'
    rotFeito = '✓ Pago'
    corpo = <>
      <div style={{ fontSize: 17, fontWeight: 700, color: COR.texto, margin: '2px 0 6px' }}>{pedido.nome}</div>
      {linha('Valor', fmt(pedido.valor))}
      {Math.abs(pedido.valor - pedido.previsto) > 0.004 && linha('Previsto', fmt(pedido.previsto))}
      {linha('Pago de', d.deNome || 'sem conta definida')}
    </>
  }
  return (
    <div style={{ marginTop: 12, border: `1.5px solid ${estado === 'feito' ? '#bbf7d0' : '#c7d7fe'}`, borderRadius: 16, padding: '12px 14px',
      background: estado === 'feito' ? COR.sucessoFundo : '#f8faff' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: COR.textoSuave }}>{titulo}</div>
      {corpo}
      {estado ? (
        <div style={{ marginTop: 8, fontSize: 15, fontWeight: 700, color: estado === 'feito' ? COR.sucessoTexto : COR.textoSuave }}>
          {estado === 'feito' ? rotFeito : 'Cancelado'}
        </div>
      ) : (
        <>
          {falhou && <div role="alert" style={{ marginTop: 8, fontSize: 14, color: COR.erroTexto }}>Não deu para gravar. Confira o cadastro e tente pela tela.</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={onCancelar} style={{ flex: 1, minHeight: 46, borderRadius: 14, border: `1.5px solid ${COR.borda}`, background: '#fff',
              color: COR.texto, fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>Cancelar</button>
            <button disabled={gravando} onClick={() => { setGravando(true); const ok = onFeito(pedido); setFalhou(!ok); if (!ok) setGravando(false) }} style={{ flex: 1.4, minHeight: 46, borderRadius: 14, border: 'none',
              background: `linear-gradient(135deg,${COR.azul},${COR.azulMedio})`, color: '#fff', fontSize: 15, fontWeight: 700,
              fontFamily: 'inherit', cursor: 'pointer' }}>Confirmar</button>
          </div>
        </>
      )}
    </div>
  )
}

/** "Posso comprar?" pelo Norte: a MESMA conta e a MESMA resposta da tela Posso comprar. */
function Simulacao({ pedido, deps }: { pedido: Extract<PedidoNorte, { tipo: 'simular' }>; deps: Deps }) {
  const r = useMemo(() => {
    const h = new Date()
    return simularCompra({ valorTotal: pedido.valor, parcelas: pedido.parcelas, cartaoId: pedido.cartaoId, ano: h.getFullYear(), mes: h.getMonth() }, deps, { piso: 0 })
  }, [pedido, deps])
  if (!r) return (
    <Bolha><div style={{ fontSize: 15, color: COR.texto }}>Para simular, preciso de um plano para os próximos meses.</div></Bolha>
  )
  return (
    <div style={{ margin: '0 0 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Resposta nome={pedido.nome} r={r} isMobile piso={0} valorTotal={pedido.valor} parcelas={pedido.parcelas} />
    </div>
  )
}

/** Markdown mínimo, sem HTML cru: **negrito** e listas com "- ". */
function Texto({ texto }: { texto: string }) {
  const negrito = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? <b key={i}>{p.slice(2, -2)}</b> : <span key={i}>{p}</span>)
  const linhas = texto.split('\n')
  return (
    <div style={{ fontSize: 15, lineHeight: 1.5, color: COR.texto, overflowWrap: 'anywhere' }}>
      {linhas.map((l, i) => {
        if (!l.trim()) return <div key={i} style={{ height: 6 }} />
        const item = /^\s*[-•*]\s+/.test(l)
        return item
          ? <div key={i} style={{ display: 'flex', gap: 8, marginTop: 2 }}><span aria-hidden>•</span><span>{negrito(l.replace(/^\s*[-•*]\s+/, ''))}</span></div>
          : <div key={i}>{negrito(l)}</div>
      })}
    </div>
  )
}
