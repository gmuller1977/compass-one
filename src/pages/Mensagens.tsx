import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import PageHeader from '../components/PageHeader'
import { useIsMobile } from '../components/configuracoes/CfgShared'
import { useApp } from '../context/AppContext'
import { COR } from '../utils/cores'
import {
  apagarComunicado, ehNovo, enviarMensagem, lerComunicados, lerConversa, lerConversas, LIMITE_TEXTO,
  marcarComunicadosLidos, marcarConversaLida, ouvirMensagensNovas, publicarComunicado, souSuporte, textoDoSelo,
  type Comunicado, type Conversa, type MensagemSuporte,
} from '../utils/mensagens'

/**
 * Mensagens (18/11/2026, pedido do Guilherme: "um local de mensagem tipo
 * caixa de entrada, onde recebe os comunicados e pode enviar mensagens para
 * o suporte"). Prévias aprovadas em analises/caixa-de-mensagens/.
 *
 * Pessoa: Comunicados e Suporte lado a lado no computador; no celular, as
 * duas pílulas. Administrador (suporte_admins): Comunicados (escrever para
 * todos) e Conversas (lista + resposta, assinada "Suporte Compass One").
 */

const AZUL = 'var(--cx-azul)'
const SELO: CSSProperties = { background: '#22d3ee', color: '#0b1460', borderRadius: 999, fontSize: 11, fontWeight: 800, padding: '1px 7px' }
const CARTAO: CSSProperties = { background: '#fff', borderRadius: 20, boxShadow: '0 4px 18px rgba(30,64,175,.08)' }

const dataCurta = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
const dataHora = (iso: string) => `${dataCurta(iso)} · ${new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`

function Pilulas<T extends string>({ itens, valor, onEscolher }: { itens: { id: T; rotulo: string; selo?: number }[]; valor: T; onEscolher: (v: T) => void }) {
  return (
    <div role="tablist" style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
      {itens.map(i => {
        const on = i.id === valor
        return (
          <button key={i.id} role="tab" aria-selected={on} onClick={() => onEscolher(i.id)} style={{
            padding: '8px 14px', minHeight: 40, borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', gap: 6, alignItems: 'center',
            background: on ? '#fff' : 'rgba(255,255,255,.12)', color: on ? '#1e3a8a' : '#fff',
            border: on ? '1px solid #fff' : '1px solid rgba(255,255,255,.16)',
          }}>
            {i.rotulo}{!!i.selo && <span style={SELO}>{textoDoSelo(i.selo)}</span>}
          </button>
        )
      })}
    </div>
  )
}

function Aviso({ texto }: { texto: string }) {
  return (
    <div role="status" style={{ fontSize: 14, lineHeight: 1.5, borderRadius: 12, padding: '12px 14px', color: COR.avisoTexto, background: COR.avisoFundo }}>
      {texto}
    </div>
  )
}

// ── Comunicados ─────────────────────────────────────────────────────────
function ListaComunicados({ lista, novos, admin, onApagar }: { lista: Comunicado[]; novos: Set<number>; admin: boolean; onApagar?: (id: number) => void }) {
  if (!lista.length) return (
    <div style={{ ...CARTAO, padding: '18px 20px', fontSize: 14, color: COR.textoSuave, lineHeight: 1.5 }}>
      {admin ? 'Nenhum comunicado publicado ainda.' : 'Nenhum comunicado por enquanto. Novidades do Compass One aparecem aqui.'}
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {lista.map(c => (
        <article key={c.id} style={{ ...CARTAO, padding: '16px 18px', border: novos.has(c.id) ? '2px solid #93c5fd' : '2px solid transparent' }}>
          {novos.has(c.id) && <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 800, color: '#1d4ed8', background: '#eff6ff', borderRadius: 6, padding: '2px 7px', marginBottom: 6 }}>NOVO</span>}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
            <h3 style={{ margin: 0, fontSize: 16, color: COR.texto }}>{c.titulo}</h3>
            <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{dataCurta(c.criado_em)}</span>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{c.texto}</p>
          {admin && onApagar && (
            <button onClick={() => onApagar(c.id)} style={{ marginTop: 10, background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13, color: '#b91c1c', fontWeight: 600 }}>
              <i aria-hidden className="ti ti-trash" style={{ marginRight: 4 }} />Apagar
            </button>
          )}
        </article>
      ))}
    </div>
  )
}

function NovoComunicado({ onPublicado }: { onPublicado: () => void }) {
  const [titulo, setTitulo] = useState('')
  const [texto, setTexto] = useState('')
  const [porEmail, setPorEmail] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const pronto = titulo.trim() && texto.trim()
  const rot: CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: '#1e3a8a', margin: '12px 0 6px' }
  const campo: CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '11px 13px', border: `1.5px solid ${COR.borda}`, borderRadius: 12, fontSize: 16, fontFamily: 'inherit', color: COR.texto }

  async function publicar() {
    setEnviando(true); setErro('')
    const r = await publicarComunicado(titulo, texto, porEmail)
    setEnviando(false)
    if (!r.ok) { setErro(r.erro); return }
    setTitulo(''); setTexto(''); setPorEmail(false); setConfirmar(false)
    onPublicado()
  }

  return (
    <div style={{ ...CARTAO, padding: '6px 18px 18px' }}>
      <label style={rot} htmlFor="com-titulo">Novo comunicado para todos</label>
      <input id="com-titulo" value={titulo} maxLength={120} onChange={e => setTitulo(e.target.value)} placeholder="Título" style={campo} />
      <label style={rot} htmlFor="com-texto">Texto</label>
      <textarea id="com-texto" value={texto} maxLength={LIMITE_TEXTO} rows={3} onChange={e => setTexto(e.target.value)} placeholder="Escreva o comunicado" style={{ ...campo, resize: 'vertical' }} />
      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 12, fontSize: 14, color: COR.texto, cursor: 'pointer', lineHeight: 1.45 }}>
        <input type="checkbox" checked={porEmail} onChange={e => setPorEmail(e.target.checked)} style={{ width: 20, height: 20, marginTop: 1, flexShrink: 0 }} />
        <span>Avisar também por e-mail<br /><span style={{ fontSize: 13, color: COR.textoSuave }}>Só para quem aceitou receber novidades e ofertas.</span></span>
      </label>
      {erro && <div style={{ marginTop: 10 }}><Aviso texto={erro} /></div>}
      {!confirmar ? (
        <button disabled={!pronto} onClick={() => setConfirmar(true)} style={{ marginTop: 14, padding: '11px 18px', minHeight: 44, border: 'none', borderRadius: 12,
          background: pronto ? AZUL : '#cbd5e1', color: '#fff', fontWeight: 700, fontSize: 14, cursor: pronto ? 'pointer' : 'default', fontFamily: 'inherit' }}>
          Enviar para todos
        </button>
      ) : (
        <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: COR.texto, flexBasis: '100%' }}>
            Todos os usuários vão ver este comunicado{porEmail ? ', e quem aceitou novidades recebe por e-mail' : ''}. Publicar?
          </span>
          <button disabled={enviando} onClick={publicar} style={{ padding: '11px 18px', minHeight: 44, border: 'none', borderRadius: 12, background: AZUL, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
            {enviando ? 'Publicando…' : 'Publicar'}
          </button>
          <button onClick={() => setConfirmar(false)} style={{ padding: '11px 18px', minHeight: 44, border: `1.5px solid ${COR.borda}`, borderRadius: 12, background: '#fff', color: COR.texto, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
            Voltar
          </button>
        </div>
      )}
    </div>
  )
}

// ── Conversa ────────────────────────────────────────────────────────────
function Chat({ conversaDe, comoSuporte, nomeOutro, altura }: { conversaDe: string; comoSuporte: boolean; nomeOutro: string; altura: string }) {
  const [msgs, setMsgs] = useState<MensagemSuporte[]>([])
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState('')
  const fim = useRef<HTMLDivElement>(null)
  const meu = comoSuporte ? 'suporte' : 'pessoa'

  useEffect(() => {
    let vivo = true
    setCarregando(true); setMsgs([])
    const ler = async () => {
      const r = await lerConversa(conversaDe)
      if (!vivo) return
      setErro(r.erro); setCarregando(false)
      setMsgs(antes => (antes.length === r.lista.length && antes.at(-1)?.id === r.lista.at(-1)?.id ? antes : r.lista))
      const outro = comoSuporte ? 'pessoa' : 'suporte'
      if (r.lista.some(m => m.autor === outro && !m.lida_em)) marcarConversaLida(conversaDe)
    }
    ler()
    const parar = ouvirMensagensNovas(conversaDe, ler)
    const t = setInterval(() => { if (document.visibilityState === 'visible') ler() }, 30_000)
    return () => { vivo = false; clearInterval(t); parar() }
  }, [conversaDe, comoSuporte])

  useEffect(() => { fim.current?.scrollIntoView({ block: 'end' }) }, [msgs.length])

  async function enviar() {
    if (!texto.trim() || enviando) return
    setEnviando(true); setErroEnvio('')
    const r = await enviarMensagem(conversaDe, meu, texto)
    setEnviando(false)
    if (r.msg) { setMsgs(l => [...l, r.msg!]); setTexto('') } else setErroEnvio(r.erro)
  }

  if (erro === 'falta-ativar') return <Aviso texto="A caixa de mensagens ainda não foi ativada." />

  return (
    <div style={{ ...CARTAO, display: 'flex', flexDirection: 'column', height: altura, minHeight: 320, overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, background: '#f8fafc' }}>
        {!comoSuporte && <span style={{ alignSelf: 'center', fontSize: 12, color: '#475569', background: '#e2e8f0', borderRadius: 999, padding: '4px 12px' }}>Respondemos em até 2 dias úteis</span>}
        {carregando && <span style={{ fontSize: 14, color: COR.textoSuave }}>Carregando…</span>}
        {erro && erro !== 'falta-ativar' && <Aviso texto={erro} />}
        {!carregando && !erro && msgs.length === 0 && !comoSuporte && (
          <p style={{ fontSize: 14, color: '#475569', textAlign: 'center', margin: '12px 8px', lineHeight: 1.5 }}>
            Tem uma dúvida, achou um erro ou quer sugerir algo? Escreva aqui. Você recebe a resposta nesta conversa e por e-mail.
          </p>
        )}
        {msgs.map(m => {
          const eu = m.autor === meu
          return (
            <div key={m.id} style={{
              maxWidth: '82%', padding: '10px 14px', borderRadius: 18, fontSize: 14, lineHeight: 1.45, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
              alignSelf: eu ? 'flex-end' : 'flex-start',
              background: eu ? AZUL : '#fff', color: eu ? '#fff' : COR.texto,
              borderBottomRightRadius: eu ? 6 : 18, borderBottomLeftRadius: eu ? 18 : 6,
              boxShadow: eu ? 'none' : '0 2px 10px rgba(30,64,175,.08)',
            }}>
              {!eu && <div style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', marginBottom: 2 }}>{nomeOutro}</div>}
              {m.texto}
              <small style={{ display: 'block', fontSize: 11, marginTop: 4, color: eu ? 'rgba(255,255,255,.8)' : '#64748b' }}>{dataHora(m.criado_em)}</small>
            </div>
          )
        })}
        <div ref={fim} />
      </div>
      {erroEnvio && <div style={{ padding: '0 16px 8px' }}><Aviso texto={erroEnvio} /></div>}
      <form onSubmit={e => { e.preventDefault(); enviar() }} style={{ display: 'flex', gap: 8, padding: '12px 14px', borderTop: `1px solid ${COR.borda}`, background: '#fff' }}>
        <textarea value={texto} maxLength={LIMITE_TEXTO} rows={1} aria-label="Sua mensagem"
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) { e.preventDefault(); enviar() } }}
          placeholder={comoSuporte ? 'Responder como Suporte Compass One' : 'Escreva sua mensagem'}
          style={{ flex: 1, padding: '12px 14px', border: `1.5px solid ${COR.borda}`, borderRadius: 14, fontSize: 16, fontFamily: 'inherit', resize: 'none', maxHeight: 140, color: COR.texto }} />
        <button type="submit" disabled={!texto.trim() || enviando} aria-label="Enviar" style={{
          width: 48, height: 48, alignSelf: 'flex-end', border: 'none', borderRadius: '50%', flexShrink: 0,
          background: texto.trim() ? AZUL : '#cbd5e1', 
          color: '#fff', fontSize: 20, cursor: texto.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><i aria-hidden className="ti ti-send" /></button>
      </form>
    </div>
  )
}

// ── Tela ────────────────────────────────────────────────────────────────
type AbaPessoa = 'comunicados' | 'suporte'
type AbaAdmin = 'comunicados' | 'conversas'

export default function Mensagens() {
  const { pathname } = useLocation()
  const [params, setParams] = useSearchParams()
  const isMobile = useIsMobile()
  const { user } = useApp()
  const uid = user?.id ?? ''

  const [admin, setAdmin] = useState<boolean | null>(null)
  const [comunicados, setComunicados] = useState<Comunicado[]>([])
  const [novos, setNovos] = useState<Set<number>>(new Set())
  const [erro, setErro] = useState('')
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [recarregar, setRecarregar] = useState(0)

  const aba = (params.get('aba') ?? '') as string
  const conversaAberta = params.get('conversa') ?? ''
  const abaPessoa: AbaPessoa = aba === 'suporte' ? 'suporte' : 'comunicados'
  const abaAdmin: AbaAdmin = aba === 'comunicados' ? 'comunicados' : 'conversas'
  const irPara = (novo: Record<string, string>) => setParams(novo, { replace: true })

  useEffect(() => { souSuporte().then(setAdmin) }, [])

  useEffect(() => {
    if (!uid) return
    let vivo = true
    lerComunicados().then(r => {
      if (!vivo) return
      setErro(r.erro)
      setComunicados(r.lista)
      const n = new Set(r.lista.filter(c => ehNovo(c, r.lidos, user?.created_at)).map(c => c.id))
      setNovos(n)
      // Abriu a caixa: os comunicados contam como lidos (o "NOVO" fica até sair da tela).
      const naoMarcados = r.lista.filter(c => !r.lidos.has(c.id)).map(c => c.id)
      marcarComunicadosLidos(naoMarcados)
    })
    return () => { vivo = false }
  }, [uid, user?.created_at, recarregar])

  useEffect(() => {
    if (!admin) return
    let vivo = true
    const ler = () => lerConversas().then(l => { if (vivo) setConversas(l) })
    ler()
    const parar = ouvirMensagensNovas('', ler)
    const t = setInterval(() => { if (document.visibilityState === 'visible') ler() }, 30_000)
    return () => { vivo = false; clearInterval(t); parar() }
  }, [admin, conversaAberta, recarregar])

  const naoLidasConversas = useMemo(() => conversas.reduce((s, c) => s + c.nao_lidas, 0), [conversas])
  const conversa = conversas.find(c => c.user_id === conversaAberta)

  async function apagar(id: number) {
    if (!window.confirm('Apagar este comunicado para todos?')) return
    if (await apagarComunicado(id)) setRecarregar(n => n + 1)
  }

  const pad = isMobile ? '12px 14px 0' : '16px 28px 0'
  const corpo: CSSProperties = { maxWidth: 1080, margin: '0 auto', padding: isMobile ? '4px 14px 100px' : '8px 28px 40px' }
  const tituloCol: CSSProperties = { fontSize: 15, fontWeight: 700, color: COR.texto, margin: '0 0 10px' }
  const alturaChat = isMobile ? 'calc(100vh - 300px)' : 'calc(100vh - 230px)'

  const cabecalho = (filhos?: React.ReactNode) => (
    <div style={{ padding: pad }}>
      <PageHeader icon="ti-mail" breadcrumb={admin ? 'ADMINISTRADOR · SÓ VOCÊ VÊ' : 'MINHA CONTA'} title="Mensagens"
        subtitle={admin ? 'Comunicados para todos e as conversas do suporte' : 'Comunicados do Compass One e a sua conversa com o suporte'}>
        {filhos}
      </PageHeader>
    </div>
  )

  if (erro === 'falta-ativar') return (
    <div style={{ minHeight: '100vh', background: COR.fundo, fontFamily: "-apple-system,'Inter',sans-serif" }}>
      <AppHeader currentPath={pathname} />
      {cabecalho()}
      <div style={corpo}><Aviso texto="A caixa de mensagens ainda não foi ativada." /></div>
    </div>
  )

  // ── Administrador ──
  if (admin) {
    const lista = (
      <div style={{ ...CARTAO, overflow: 'hidden' }}>
        {conversas.length === 0 && <div style={{ padding: '16px 18px', fontSize: 14, color: COR.textoSuave }}>Nenhuma conversa ainda.</div>}
        {conversas.map((c, i) => (
          <button key={c.user_id} onClick={() => irPara({ conversa: c.user_id })} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
            padding: '12px 16px', minHeight: 56, border: 'none', borderTop: i ? `1px solid ${COR.borda}` : 'none', cursor: 'pointer', fontFamily: 'inherit',
            background: c.user_id === conversaAberta ? '#eff6ff' : '#fff', color: COR.texto, fontSize: 14,
          }}>
            <span style={{ minWidth: 0 }}>
              <b style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</b>
              <small style={{ display: 'block', color: '#64748b', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.ultima_autor === 'suporte' ? 'Você: ' : ''}{c.ultima}
              </small>
            </span>
            {c.nao_lidas > 0 && <span style={{ ...SELO, flexShrink: 0 }}>{textoDoSelo(c.nao_lidas)}</span>}
          </button>
        ))}
      </div>
    )
    const chat = conversaAberta ? (
      <div>
        {conversa && <div style={{ fontSize: 13, color: COR.textoSuave, margin: '0 0 8px' }}>{conversa.nome} · {conversa.email}</div>}
        <Chat conversaDe={conversaAberta} comoSuporte nomeOutro={conversa?.nome ?? 'Pessoa'} altura={alturaChat} />
      </div>
    ) : <div style={{ ...CARTAO, padding: '18px 20px', fontSize: 14, color: COR.textoSuave }}>Escolha uma conversa.</div>

    return (
      <div style={{ minHeight: '100vh', background: COR.fundo, fontFamily: "-apple-system,'Inter',sans-serif" }}>
        <AppHeader currentPath={pathname} />
        {cabecalho(<Pilulas<AbaAdmin> valor={abaAdmin} onEscolher={v => irPara({ aba: v })}
          itens={[{ id: 'comunicados', rotulo: 'Comunicados' }, { id: 'conversas', rotulo: 'Conversas', selo: naoLidasConversas }]} />)}
        <div style={corpo}>
          {abaAdmin === 'comunicados' ? (
            <div style={{ display: 'grid', gap: 16, maxWidth: 720 }}>
              <NovoComunicado onPublicado={() => setRecarregar(n => n + 1)} />
              <ListaComunicados lista={comunicados} novos={new Set()} admin onApagar={apagar} />
            </div>
          ) : isMobile ? (
            conversaAberta ? (
              <div>
                <button onClick={() => irPara({ aba: 'conversas' })} style={{ background: 'none', border: 'none', padding: '4px 0 10px', fontFamily: 'inherit',
                  fontSize: 14, fontWeight: 600, color: '#1d4ed8', cursor: 'pointer' }}>‹ Todas as conversas</button>
                {chat}
              </div>
            ) : lista
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 18, alignItems: 'start' }}>{lista}{chat}</div>
          )}
        </div>
      </div>
    )
  }

  // ── Pessoa ──
  const colComunicados = (
    <section>
      {!isMobile && <h2 style={tituloCol}>Comunicados</h2>}
      <ListaComunicados lista={comunicados} novos={novos} admin={false} />
    </section>
  )
  const colSuporte = uid ? (
    <section>
      {!isMobile && <h2 style={tituloCol}>Suporte</h2>}
      <Chat conversaDe={uid} comoSuporte={false} nomeOutro="Suporte Compass One" altura={alturaChat} />
    </section>
  ) : null

  return (
    <div style={{ minHeight: '100vh', background: COR.fundo, fontFamily: "-apple-system,'Inter',sans-serif" }}>
      <AppHeader currentPath={pathname} />
      {cabecalho(isMobile && admin === false ? (
        <Pilulas<AbaPessoa> valor={abaPessoa} onEscolher={v => irPara({ aba: v })}
          itens={[{ id: 'comunicados', rotulo: 'Comunicados', selo: novos.size }, { id: 'suporte', rotulo: 'Suporte' }]} />
      ) : undefined)}
      <div style={corpo}>
        {erro && <div style={{ marginBottom: 12 }}><Aviso texto={erro} /></div>}
        {isMobile
          ? (abaPessoa === 'suporte' ? colSuporte : colComunicados)
          : <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>{colComunicados}{colSuporte}</div>}
      </div>
    </div>
  )
}
