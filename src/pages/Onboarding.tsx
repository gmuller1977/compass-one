import { useState, useEffect } from 'react'
import { parseBRL } from '../utils/moeda'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { Conta, Categoria } from '../context/AppContext'
import { CATEGORIAS_PADRAO } from '../data/categoriasPadrao'
import { COR } from '../utils/cores'
import { creditarAurix } from '../utils/aurix'
import { dispararToastAurix } from '../components/aurix/AurixToast'
import '../styles/boas-vindas.css'

const BANCOS = [
  'Banco do Brasil', 'Bradesco', 'C6 Bank', 'Caixa', 'Inter',
  'Itaú', 'Nubank', 'Santander', 'Sicredi', 'XP', 'Outro',
]

const TOP10 = new Set([
  'Salário', 'Mercado / Supermercado', 'Aluguel / Financiamento',
  'Restaurante / Delivery', 'Combustível', 'Plano de Saúde',
  'Energia Elétrica', 'Transporte / Uber', 'Internet / Celular',
  'Streaming / Assinaturas',
])

const SLIDE_COUNT = 6

/**
 * A rota do primeiro slide: oscilação amortecida, forte na largada e reta no
 * destino. O traçado é gerado matematicamente e vem pronto do briefing — não
 * redesenhar à mão. O mesmo `d` alimenta três coisas: a rota pontilhada, o
 * rastro verde e o `offset-path` do avião, que precisa ser idêntico ou o
 * avião voa fora do próprio rastro.
 */
const BV_ROTA = 'M70.0 46.0 L71.9 53.2 L73.8 59.7 L75.7 65.1 L77.6 69.1 L79.5 71.6 L81.5 72.5 L83.4 72.2 L85.3 71.1 L87.2 69.5 L89.1 67.8 L91.0 66.4 L92.9 65.2 L94.8 64.2 L96.7 63.4 L98.6 62.6 L100.5 61.4 L102.5 60.0 L104.4 58.1 L106.3 56.1 L108.2 54.0 L110.1 52.0 L112.0 50.5 L113.9 49.4 L115.8 48.8 L117.7 48.6 L119.6 48.3 L121.5 47.7 L123.5 46.4 L125.4 44.1 L127.3 40.7 L129.2 36.4 L131.1 31.2 L133.0 25.8 L134.9 20.7 L136.8 16.3 L138.7 13.2 L140.6 11.8 L142.5 12.1 L144.5 14.0 L146.4 17.3 L148.3 21.6 L150.2 26.4 L152.1 31.2 L154.0 35.8 L155.9 39.9 L157.8 43.4 L159.7 46.5 L161.6 49.2 L163.5 51.7 L165.5 54.2 L167.4 56.6 L169.3 59.0 L171.2 61.1 L173.1 62.7 L175.0 63.7 L176.9 63.9 L178.8 63.4 L180.7 62.3 L182.6 60.7 L184.5 59.2 L186.5 57.9 L188.4 57.2 L190.3 57.4 L192.2 58.3 L194.1 59.8 L196.0 61.6 L197.9 63.4 L199.8 64.6 L201.7 64.8 L203.6 63.9 L205.5 61.7 L207.5 58.2 L209.4 53.8 L211.3 48.9 L213.2 43.9 L215.1 39.1 L217.0 34.9 L218.9 31.6 L220.8 29.1 L222.7 27.5 L224.6 26.5 L226.5 26.0 L228.5 25.9 L230.4 26.1 L232.3 26.4 L234.2 27.1 L236.1 28.1 L238.0 29.6 L239.9 31.6 L241.8 34.0 L243.7 36.8 L245.6 39.8 L247.5 42.7 L249.5 45.3 L251.4 47.3 L253.3 48.7 L255.2 49.3 L257.1 49.3 L259.0 48.8 L260.9 48.2 L262.8 47.6 L264.7 47.4 L266.6 47.6 L268.5 48.3 L270.5 49.5 L272.4 51.1 L274.3 52.8 L276.2 54.5 L278.1 55.8 L280.0 56.8 L281.9 57.2 L283.8 57.1 L285.7 56.6 L287.6 55.7 L289.5 54.6 L291.5 53.4 L293.4 52.1 L295.3 50.9 L297.2 49.8 L299.1 48.6 L301.0 47.4 L302.9 46.3 L304.8 45.0 L306.7 43.8 L308.6 42.7 L310.5 41.7 L312.5 41.0 L314.4 40.5 L316.3 40.4 L318.2 40.5 L320.1 41.0 L322.0 41.6 L323.9 42.3 L325.8 43.1 L327.7 43.7 L329.6 44.2 L331.5 44.5 L333.5 44.7 L335.4 44.7 L337.3 44.6 L339.2 44.5 L341.1 44.4 L343.0 44.4 L344.9 44.5 L346.8 44.7 L348.7 45.0 L350.6 45.4 L352.5 45.8 L354.5 46.1 L356.4 46.4 L358.3 46.7 L360.2 46.9 L362.1 47.1 L364.0 47.2 L365.9 47.3 L367.8 47.4 L369.7 47.5 L371.6 47.6 L373.5 47.6 L375.5 47.6 L377.4 47.6 L379.3 47.4 L381.2 47.3 L383.1 47.0 L385.0 46.8 L386.9 46.5 L388.8 46.2 L390.7 46.0 L392.6 45.8 L394.5 45.7 L396.5 45.7 L398.4 45.6 L400.3 45.6 L402.2 45.7 L404.1 45.7 L406.0 45.7 L407.9 45.8 L409.8 45.8 L411.7 45.8 L413.6 45.7 L415.5 45.7 L417.5 45.7 L419.4 45.7 L421.3 45.7 L423.2 45.7 L425.1 45.7 L427.0 45.7 L428.9 45.7 L430.8 45.8 L432.7 45.8 L434.6 45.8 L436.5 45.8 L438.5 45.8 L440.4 45.9 L442.3 45.9 L444.2 45.9 L446.1 46.0 L448.0 46.0 L449.9 46.1 L451.8 46.1 L453.7 46.2 L455.6 46.2 L457.5 46.2 L459.5 46.2 L461.4 46.2 L463.3 46.2 L465.2 46.1 L467.1 46.1 L469.0 46.1 L470.9 46.1 L472.8 46.1 L474.7 46.0 L476.6 46.0 L478.5 46.0 L480.5 46.0 L482.4 46.0 L484.3 46.0 L486.2 46.0 L488.1 46.0 L490.0 46.0'

/** Marcações da bússola a cada 15°. Os quatro cardeais viram letras. */
const BV_TICKS = (() => {
  const out: { x1: number; y1: number; x2: number; y2: number; major: boolean }[] = []
  for (let deg = 0; deg < 360; deg += 15) {
    if (deg % 90 === 0) continue
    const major = deg % 45 === 0
    const rad = (deg - 90) * Math.PI / 180
    const r2 = 85 - (major ? 11 : 6)
    out.push({
      x1: 94 + 85 * Math.cos(rad), y1: 94 + 85 * Math.sin(rad),
      x2: 94 + r2 * Math.cos(rad), y2: 94 + r2 * Math.sin(rad),
      major,
    })
  }
  return out
})()

const FERRAMENTAS = [
  { icon: '🏠', nome: 'Início',       desc: 'Seu painel de comando. A bússola mostra se você está no rumo certo.' },
  { icon: '📋', nome: 'Lançamentos',  desc: 'Registre suas despesas e receitas. Banco, cartão e dinheiro.' },
  { icon: '📊', nome: 'Resumo mensal', desc: 'A foto completa do mês: patrimônio, receitas, despesas e projeção.' },
  { icon: '📈', nome: 'Radar financeiro', desc: 'Compare o que planejou com o que realmente aconteceu.' },
  { icon: '🎯', nome: 'Planejamento', desc: 'Defina seu orçamento anual. Categoria por categoria.' },
  { icon: '🔮', nome: 'Simulador',    desc: 'Simule cenários antes de decidir. Dívidas, metas, investimentos.' },
  { icon: '🧭', nome: 'North',        desc: 'Seu assistente com inteligência artificial. Pergunte qualquer coisa.' },
]

const ROTINA = [
  {
    titulo: '📅 Todo dia', tempo: '5 min',
    passos: [
      { titulo: 'Conferir o saldo',    pill: '🏦 Lançamentos → Banco' },
      { titulo: 'Registrar gastos',     pill: '📋 Lançamentos' },
      { titulo: 'Acompanhar radar financeiro', pill: '📈 Radar financeiro' },
      { titulo: 'Olhar a bússola',      pill: '🏠 Início' },
    ],
  },
  {
    titulo: '📆 Todo mês', tempo: '30 min',
    passos: [
      { titulo: 'Ver o resumo do mês',  pill: '📊 Resumo mensal' },
      { titulo: 'Revisar o mês',        pill: '🔄 Revisão mensal' },
      { titulo: 'Ajustar o plano',      pill: '🎯 Planejamento' },
      { titulo: 'Simular cenários',     pill: '🔮 Simulador' },
    ],
  },
  {
    titulo: '🗓️ Todo ano', tempo: '1 hora',
    passos: [
      { titulo: 'Criar planejamento',   pill: '🎯 Planejamento → Assistente' },
      { titulo: 'Definir objetivos',    pill: '🔮 Simulador' },
      { titulo: 'Planejar extras',      pill: '🎯 Planejamento → Grade' },
    ],
  },
]

const AURIX_EXEMPLOS = [
  { icon: '📋', acao: 'Registrou um gasto', pontos: '+5 Aurix' },
  { icon: '🔥', acao: '7 dias seguidos',    pontos: '+50 Aurix' },
  { icon: '📊', acao: 'Revisão mensal',     pontos: '+100 Aurix' },
]

const NIVEIS = ['🐣 Iniciante', '🧭 Navegador', '⭐ Explorador', '🔥 Disciplinado', '🏆 Mestre', '👑 Lenda']

function newId() {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

type Phase = 'welcome' | 'banco' | 'cartao' | 'categorias' | 'catconfig' | 'planejamento' | 'final'
type CatConf = { formasPag: string[]; fixa: boolean; diaPag: string; contaId: string }

const BG = 'linear-gradient(135deg, #0f2878 0%, #1a56db 100%)'

const inputSt: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: `1.5px solid ${COR.borda}`, fontSize: 13,
  fontFamily: 'inherit', color: COR.texto, outline: 'none',
  background: '#fff', boxSizing: 'border-box',
}

function FL({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: COR.textoSuave,
      textTransform: 'uppercase', letterSpacing: .5, marginBottom: 5 }}>
      {children}
    </div>
  )
}

function Hint({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{children}</div>
}

function BtnPrimary({ onClick, disabled, children }: {
  onClick: () => void; disabled?: boolean; children: React.ReactNode
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', padding: '13px 20px', border: 'none', borderRadius: 12,
      background: disabled ? '#e2e8f0' : `linear-gradient(135deg, ${COR.azul} 0%, ${COR.azulMedio} 100%)`,
      color: disabled ? '#94a3b8' : '#fff',
      fontSize: 15, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: 'inherit', boxShadow: disabled ? 'none' : '0 4px 12px rgba(26,86,219,.25)',
    }}>{children}</button>
  )
}

function BtnGhost({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: '10px 20px', border: 'none', borderRadius: 12,
      background: 'transparent', color: COR.textoSuave,
      fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    }}>{children}</button>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  const { contas, categorias, setContas, setCategorias, setOnboardingCompleto, user } = useApp()

  const [phase, setPhase]   = useState<Phase>('welcome')
  const [slide, setSlide]   = useState(0)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  // ── Banco ──────────────────────────────────────────────────────────────
  const [bancosLocal, setBancosLocal]   = useState<Conta[]>([])
  const [bancoBanco,  setBancoBanco]    = useState('')
  const [bancoNome,   setBancoNome]     = useState('')
  const [bancoTipo,   setBancoTipo]     = useState<'corrente'|'poupanca'>('corrente')
  const [bancoSaldo,  setBancoSaldo]    = useState('')

  // ── Cartão ─────────────────────────────────────────────────────────────
  const [cartoesLocal, setCartoesLocal]   = useState<Conta[]>([])
  const [cartaoBanco,   setCartaoBanco]   = useState('')
  const [cartaoVenc,    setCartaoVenc]    = useState('')
  const [cartaoApelido, setCartaoApelido] = useState('')

  // ── Categorias ─────────────────────────────────────────────────────────
  const [catSel, setCatSel]     = useState<Set<string>>(() => new Set(TOP10))
  const [verMais, setVerMais]   = useState(false)

  // ── CatConfig ──────────────────────────────────────────────────────────
  const [catConfig, setCatConfig]     = useState<Record<string, CatConf>>({})
  const [catConfigStep, setCatConfigStep] = useState<1|2|3>(1)

  // ── Final ──────────────────────────────────────────────────────────────
  const [finalCreditado, setFinalCreditado] = useState(false)

  useEffect(() => {
    if (phase !== 'final' || finalCreditado || !user?.id) return
    setFinalCreditado(true)
    creditarAurix(user.id, 'conquista', 'Boas-vindas concluídas', 20, 'conquista_primeiro_passo')
      .then(r => { if (r) dispararToastAurix({ tipo: 'conquista', titulo: 'Primeiro Passo!', pontos: 20, icone: '🎉' }) })
  }, [phase, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Slide helpers ──────────────────────────────────────────────────────
  function goSlide(n: number) {
    if (n >= 0 && n < SLIDE_COUNT) setSlide(n)
  }

  function pularApresentacao() {
    setPhase('banco')
  }

  // ── Banco helpers ──────────────────────────────────────────────────────
  function addBancoCurrent() {
    if (!bancoBanco) return
    const c: Conta = {
      id: newId(), nome: bancoNome || bancoBanco, banco: bancoBanco,
      tipo: bancoTipo, saldoInicial: parseBRL(bancoSaldo),
      cor: '#1a56db', icone: '🏦',
      preferida: bancosLocal.length === 0, incluirNoSaldoInicial: true,
    }
    setBancosLocal(prev => [...prev, c])
    setBancoBanco(''); setBancoNome(''); setBancoSaldo(''); setBancoTipo('corrente')
  }

  function removeBanco(id: string) { setBancosLocal(prev => prev.filter(c => c.id !== id)) }

  function submitBanco(pular = false) {
    if (!pular) {
      const tudo = [...bancosLocal]
      if (bancoBanco) {
        tudo.push({
          id: newId(), nome: bancoNome || bancoBanco, banco: bancoBanco,
          tipo: bancoTipo, saldoInicial: parseBRL(bancoSaldo),
          cor: '#1a56db', icone: '🏦',
          preferida: tudo.length === 0, incluirNoSaldoInicial: true,
        })
      }
      if (tudo.length > 0) setContas(prev => [...prev.filter(c => c.tipo === 'cartao'), ...tudo])
    }
    setPhase('cartao')
  }

  // ── Cartão helpers ─────────────────────────────────────────────────────
  function addCartaoCurrent() {
    if (!cartaoBanco) return
    const c: Conta = {
      id: newId(), nome: cartaoApelido || cartaoBanco, banco: cartaoBanco,
      tipo: 'cartao', saldoInicial: 0,
      cor: '#7c3aed', icone: '💳',
      diaVencimento: parseInt(cartaoVenc) || undefined,
      preferida: false, incluirNoSaldoInicial: false,
    }
    setCartoesLocal(prev => [...prev, c])
    setCartaoBanco(''); setCartaoVenc(''); setCartaoApelido('')
  }

  function removeCartao(id: string) { setCartoesLocal(prev => prev.filter(c => c.id !== id)) }

  function submitCartao(pular = false) {
    if (!pular) {
      const tudo = [...cartoesLocal]
      if (cartaoBanco) {
        tudo.push({
          id: newId(), nome: cartaoApelido || cartaoBanco, banco: cartaoBanco,
          tipo: 'cartao', saldoInicial: 0, cor: '#7c3aed', icone: '💳',
          diaVencimento: parseInt(cartaoVenc) || undefined,
          preferida: false, incluirNoSaldoInicial: false,
        })
      }
      if (tudo.length > 0) setContas(prev => [...prev.filter(c => c.tipo !== 'cartao'), ...tudo])
    } else if (cartoesLocal.length > 0) {
      setContas(prev => [...prev.filter(c => c.tipo !== 'cartao'), ...cartoesLocal])
    }
    setPhase('categorias')
  }

  // ── Categorias helpers ─────────────────────────────────────────────────
  function toggleCat(nome: string) {
    setCatSel(prev => { const n = new Set(prev); if (n.has(nome)) n.delete(nome); else n.add(nome); return n })
  }

  function submitCategorias() {
    const atuais: Categoria[] = categorias.length > 0
      ? categorias.map(c => ({ ...c, ativa: catSel.has(c.nome) }))
      : CATEGORIAS_PADRAO.map((c, i) => ({ ...c, id: newId() + i, ativa: catSel.has(c.nome) }))
    setCategorias(atuais)

    const despesas = atuais.filter(c => c.ativa && c.tipo === 'saida')
    const firstContaId = contas.find(c => c.tipo !== 'cartao')?.id ?? ''
    const cfg: Record<string, CatConf> = {}
    despesas.forEach(c => {
      cfg[c.nome] = { formasPag: ['banco'], fixa: false, diaPag: '', contaId: firstContaId }
    })
    setCatConfig(cfg)
    setCatConfigStep(1)
    setPhase('catconfig')
  }

  // ── CatConfig helpers ──────────────────────────────────────────────────
  function updateCatConf(nome: string, upd: Partial<CatConf>) {
    setCatConfig(prev => ({ ...prev, [nome]: { ...prev[nome], ...upd } }))
  }

  function toggleForma(cat: string, forma: string) {
    const curr = catConfig[cat]?.formasPag ?? ['banco']
    if (curr.includes(forma) && curr.length === 1) return
    const next = curr.includes(forma) ? curr.filter(f => f !== forma) : [...curr, forma]
    updateCatConf(cat, { formasPag: next })
  }

  function advanceCatConfig() {
    if (catConfigStep === 1) { setCatConfigStep(2); return }
    if (catConfigStep === 2) {
      const totalContas = contas.length
      if (totalContas <= 1) { submitCatConfig(); return }
      // Smart default for step 3: if category prefers 'cartao', suggest first card
      const primCartao = contas.find(c => c.tipo === 'cartao')
      const primBanco  = contas.find(c => c.tipo !== 'cartao')
      const cfg = { ...catConfig }
      Object.keys(cfg).forEach(nome => {
        const prefersCartao = cfg[nome].formasPag.includes('cartao') && primCartao
        cfg[nome] = { ...cfg[nome], contaId: prefersCartao ? (primCartao?.id ?? '') : (primBanco?.id ?? '') }
      })
      setCatConfig(cfg)
      setCatConfigStep(3)
      return
    }
    submitCatConfig()
  }

  function submitCatConfig() {
    setOnboardingCompleto(true)
    setPhase('planejamento')
  }

  // ── Back navigation ────────────────────────────────────────────────────
  function goBack() {
    switch (phase) {
      case 'banco':      setPhase('welcome'); setSlide(5); break
      case 'cartao':     setPhase('banco');    break
      case 'categorias': setPhase('cartao');   break
      case 'catconfig':
        if (catConfigStep > 1) setCatConfigStep(s => (s - 1) as 1|2|3)
        else setPhase('categorias')
        break
      case 'planejamento': setPhase('catconfig'); setCatConfigStep(3); break
      default: break
    }
  }

  // ── Computed ───────────────────────────────────────────────────────────
  const catDespesas = Object.keys(catConfig)
  const STEP_PCT: Partial<Record<Phase, number>> = {
    banco: 20, cartao: 40, categorias: 60, catconfig: 80, planejamento: 100,
  }
  const STEP_LBL: Partial<Record<Phase, string>> = {
    banco: 'Etapa 1 de 5 — Suas contas',
    cartao: 'Etapa 2 de 5 — Seus cartões',
    categorias: 'Etapa 3 de 5 — Tipos de gasto',
    catconfig: 'Etapa 4 de 5 — Configurar categorias',
    planejamento: 'Etapa 5 de 5 — Seu plano',
  }

  // ─────────────────────────────────────────────────────────────────────
  // ── WELCOME PHASE ────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────
  if (phase === 'welcome') {
    const pillSt: React.CSSProperties = {
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: 'rgba(147,197,253,0.15)', border: '1px solid rgba(147,197,253,0.25)',
      color: '#93c5fd', fontSize: 10, borderRadius: 10,
      padding: '2px 8px', fontWeight: 600, whiteSpace: 'nowrap',
    }

    function renderSlideContent() {
      switch (slide) {
        // ── Slide 0: Boas-vindas ────────────────────────────────────────
        case 0: return (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column',
            alignItems: 'center', width: '100%' }}>

            {/* Os dois SVGs são decorativos: o sentido inteiro está no texto,
                então leitor de tela não ganha nada lendo agulha e rota. */}
            <svg className="bv-compass" viewBox="0 0 188 188" aria-hidden="true">
              <circle className="bv-ring-outer" cx="94" cy="94" r="85"/>
              <circle className="bv-ring-inner" cx="94" cy="94" r="71"/>
              {BV_TICKS.map((t, i) => (
                <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
                  className={t.major ? 'bv-tick' : 'bv-tick-min'}/>
              ))}
              <text className="bv-letter bv-letter-n" x="94" y="26">N</text>
              <text className="bv-letter" x="162" y="99">L</text>
              <text className="bv-letter" x="94" y="172">S</text>
              <text className="bv-letter" x="26" y="99">O</text>
              <g className="bv-needle">
                <path className="bv-needle-n" d="M94 30 L102 94 L94 88 L86 94 Z"/>
                <path className="bv-needle-s" d="M94 158 L86 94 L94 100 L102 94 Z"/>
              </g>
              <circle className="bv-hub" cx="94" cy="94" r="4.5"/>
            </svg>

            <h1 className="bv-title">
              Dez minutos agora<br />valem o ano inteiro
            </h1>

            <p className="bv-lede">
              Você descobre onde está e define para onde quer chegar.
              Chega de voar no escuro: a partir de hoje, quando o dinheiro
              sair da rota, você fica sabendo.
            </p>

            {/* Turbulenta na largada, reta no destino — a rota conta a mesma
                coisa que o parágrafo, sem repetir palavra nenhuma. */}
            <svg className="bv-track" viewBox="0 0 560 108" aria-hidden="true">
              <path className="bv-route-ahead" pathLength={1000} d={BV_ROTA}/>
              <path className="bv-trail" pathLength={1000} d={BV_ROTA}/>
              <circle className="bv-origin" cx="70" cy="46" r="4"/>
              <circle className="bv-goal" cx="490" cy="46" r="6"/>
              <g className="bv-plane">
                <path d="M11 0 L3 -1.5 L-1 -8 L-4 -8 L-2 -1.5 L-8 -1.5 L-10 -4.5 L-12 -4.5 L-11 0 L-12 4.5 L-10 4.5 L-8 1.5 L-2 1.5 L-4 8 L-1 8 L3 1.5 Z"/>
              </g>
              <text className="bv-axis-now" x="70" y="100">voando no escuro</text>
              <text className="bv-axis-goal" x="490" y="100">voo tranquilo</text>
            </svg>
          </div>
        )

        // ── Slide 1: O que vai conseguir ────────────────────────────────
        case 1: return (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: '#fff' }}>
                O que você vai conseguir
              </div>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: 14,
            }}>
              {[
                { ico: '🔍', titulo: 'Clareza',  desc: 'Saiba exatamente para onde vai cada real. Sem surpresas no final do mês.' },
                { ico: '🎯', titulo: 'Direção',  desc: 'Monte um plano realista e acompanhe se está no caminho certo. A bússola te avisa.' },
                { ico: '💪', titulo: 'Controle', desc: 'Tome decisões com base em dados, não em achismo. Simule antes de agir.' },
              ].map(({ ico, titulo, desc }) => (
                <div key={titulo} style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 14, padding: '18px 16px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>{ico}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 6 }}>{titulo}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.9)', lineHeight: 1.6 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        )

        // ── Slide 2: Suas ferramentas ────────────────────────────────────
        case 2: return (
          <div style={{ width: '100%', maxWidth: 500 }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: '#fff' }}>
                Suas ferramentas
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {FERRAMENTAS.map(({ icon, nome, desc }) => (
                <div key={nome} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, padding: '12px 14px',
                }}>
                  <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1.2 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{nome}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,.9)', lineHeight: 1.5 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

        // ── Slide 3: Rotina financeira ───────────────────────────────────
        case 3: return (
          <div style={{ width: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <div style={{ fontSize: isMobile ? 17 : 20, fontWeight: 800, color: '#fff' }}>
                Como se voa por aqui
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.9)', marginTop: 3 }}>
                Voar bem não é esforço constante. É a coisa certa no momento certo.
              </div>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: 12, marginBottom: 16,
            }}>
              {ROTINA.map((col) => (
                <div key={col.titulo} style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, padding: '14px 12px',
                }}>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>{col.titulo}</div>
                    <div style={{
                      display: 'inline-block', marginTop: 4,
                      background: 'rgba(147,197,253,0.15)', border: '1px solid rgba(147,197,253,0.25)',
                      color: '#93c5fd', fontSize: 9, borderRadius: 20, padding: '2px 8px', fontWeight: 600,
                    }}>{col.tempo}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {col.passos.map((p, pi) => (
                      <div key={pi} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                          background: 'rgba(147,197,253,0.2)', border: '1px solid rgba(147,197,253,0.3)',
                          color: '#93c5fd', fontSize: 9, fontWeight: 800,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{pi + 1}</div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{p.titulo}</div>
                          <div style={pillSt}>{p.pill}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: '10px 14px',
              fontSize: 11, color: 'rgba(255,255,255,.9)', lineHeight: 1.6, textAlign: 'center',
            }}>
              <span style={{ color: '#93c5fd', fontWeight: 700 }}>5 min/dia + 30 min/mês + 1h/ano</span>
              {' '}= controle total.
            </div>
          </div>
        )

        // ── Slide 4: Programa Aurix ──────────────────────────────────────
        case 4: return (
          <div style={{ textAlign: 'center', maxWidth: 480 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✨</div>
            <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: '#fff', marginBottom: 6 }}>
              Ganhe Aurix usando o app
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.9)', marginBottom: 24 }}>
              Cada ação no Compass One te recompensa.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {AURIX_EXEMPLOS.map(({ icon, acao, pontos }) => (
                <div key={acao} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 12, padding: '12px 16px',
                }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
                  <span style={{ flex: 1, fontSize: 13, color: '#fff', textAlign: 'left' }}>{acao}</span>
                  <span style={{
                    fontSize: 13, fontWeight: 800,
                    color: '#fbbf24', flexShrink: 0,
                  }}>{pontos}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.9)', marginBottom: 16 }}>
              Acumule Aurix, desbloqueie conquistas e suba de nível.
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }}>
              {NIVEIS.map((n, i) => (
                <span key={i} style={{
                  fontSize: 11, padding: '3px 8px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.1)', color: '#fff',
                }}>{n}</span>
              ))}
            </div>
          </div>
        )

        // ── Slide 5: Vamos configurar ────────────────────────────────────
        default: return (
          <div style={{ textAlign: 'center', maxWidth: 440 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🚀</div>
            <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
              Tudo pronto para começar!
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,.9)', marginBottom: 12 }}>
              Vamos configurar o básico em poucos minutos.
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.9)', marginBottom: 28, lineHeight: 1.6 }}>
              Cadastre suas contas, cartões e categorias. Leva menos de 5 minutos.
            </div>
            <div style={{
              display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap',
              marginBottom: 28, fontSize: 12, color: '#fff',
            }}>
              {['① Contas', '② Cartões', '③ Categorias', '④ Configurar', '⑤ Plano'].map((s, i) => (
                <span key={i} style={{
                  background: 'rgba(255,255,255,0.1)', borderRadius: 8,
                  padding: '3px 9px',
                }}>{s}</span>
              ))}
            </div>
          </div>
        )
      }
    }

    return (
      // O primeiro slide troca o azul linear compartilhado pelo radial da
      // referência — é a classe bv-stage que pinta o fundo e a grade de
      // instrumento. Os outros cinco seguem com o BG de sempre.
      <div
        className={slide === 0 ? 'bv-stage' : undefined}
        style={{
          minHeight: '100dvh',
          background: slide === 0 ? undefined : BG,
          position: slide === 0 ? 'relative' : undefined,
          display: 'flex', flexDirection: 'column',
          fontFamily: "-apple-system,'Inter',sans-serif",
        }}
      >
        {/* X close */}
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 10 }}>
          <button onClick={() => { setOnboardingCompleto(true); navigate('/') }} style={{
            background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: '50%',
            width: 32, height: 32, cursor: 'pointer', color: '#fff', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* Slide content */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: isMobile ? '60px 20px 16px' : '60px 32px 16px',
          maxWidth: 700, margin: '0 auto', width: '100%', overflowY: 'auto',
        }}>
          {renderSlideContent()}
        </div>

        {/* Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 7, padding: '12px 0 6px' }}>
          {Array.from({ length: SLIDE_COUNT }, (_, i) => (
            <div key={i} onClick={() => goSlide(i)} style={{
              width: i === slide ? 20 : 7, height: 7, borderRadius: 6,
              background: i === slide ? '#fff' : 'rgba(255,255,255,.3)',
              cursor: 'pointer', transition: 'all .2s',
            }} />
          ))}
        </div>

        {/* Navigation */}
        <div style={{
          padding: '8px 24px 36px',
          maxWidth: 440, margin: '0 auto', width: '100%',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {slide < 5 ? (
            <>
              <button onClick={() => goSlide(slide + 1)} style={{
                width: '100%', padding: '13px 20px', border: 'none', borderRadius: 12,
                background: '#fff', color: COR.azulEscuro,
                fontSize: 15, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(0,0,0,.2)',
              }}>{slide === 0 ? 'Traçar minha rota' : 'Próximo →'}</button>
              {slide > 0 ? (
                <button onClick={() => goSlide(slide - 1)} style={{
                  width: '100%', padding: '10px 20px', border: 'none', borderRadius: 12,
                  background: 'rgba(255,255,255,.1)', color: '#fff',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}>← Voltar</button>
              ) : (
                <button onClick={pularApresentacao} style={{
                  width: '100%', padding: '10px 20px', border: 'none', borderRadius: 12,
                  background: 'transparent', color: 'rgba(255,255,255,.9)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}>Ver depois</button>
              )}
            </>
          ) : (
            <>
              <button onClick={() => setPhase('banco')} style={{
                width: '100%', padding: '14px 20px', border: 'none', borderRadius: 12,
                background: '#fff', color: COR.azulEscuro,
                fontSize: 16, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(0,0,0,.2)',
              }}>Vamos lá →</button>
              <button onClick={goSlide.bind(null, 4)} style={{
                width: '100%', padding: '10px 20px', border: 'none', borderRadius: 12,
                background: 'rgba(255,255,255,.1)', color: '#fff',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>← Voltar</button>
              <button onClick={() => { setOnboardingCompleto(true); navigate('/') }} style={{
                width: '100%', padding: '10px 20px', border: 'none', borderRadius: 12,
                background: 'transparent', color: 'rgba(255,255,255,.9)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>Pular por agora</button>
            </>
          )}
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────
  // ── FINAL PHASE ──────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────
  if (phase === 'final') {
    const nContas   = contas.filter(c => c.tipo !== 'cartao').length
    const nCartoes  = contas.filter(c => c.tipo === 'cartao').length
    const nCats     = categorias.filter(c => c.ativa).length

    return (
      <div style={{
        minHeight: '100dvh', background: BG,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '32px 24px',
        fontFamily: "-apple-system,'Inter',sans-serif",
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🎉</div>
        <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: '#fff', marginBottom: 6 }}>
          Plano de voo traçado
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,.9)', marginBottom: 28 }}>
          A aeronave está preparada e os instrumentos calibrados.
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 16, padding: '20px 28px', marginBottom: 24,
          display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left',
          maxWidth: 360, width: '100%',
        }}>
          {[
            `✅ ${nContas} conta${nContas !== 1 ? 's' : ''} cadastrada${nContas !== 1 ? 's' : ''}`,
            `✅ ${nCartoes} cartão${nCartoes !== 1 ? 'ões' : ''} cadastrado${nCartoes !== 1 ? 's' : ''}`,
            `✅ ${nCats} categorias configuradas`,
          ].map(txt => (
            <div key={txt} style={{ fontSize: 13, color: '#fff' }}>{txt}</div>
          ))}
          {nContas === 0 && nCartoes === 0 && (
            <div style={{ fontSize: 12, color: '#fff' }}>
              ⚠️ Adicione contas em Configurações quando quiser.
            </div>
          )}
        </div>

        <div style={{
          background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)',
          borderRadius: 12, padding: '12px 20px', marginBottom: 28,
          fontSize: 13, color: '#fbbf24', fontWeight: 700,
        }}>
          ✨ +20 Aurix de boas-vindas creditados!
        </div>

        <div style={{ maxWidth: 360, width: '100%' }}>
          <button onClick={() => navigate('/')} style={{
            width: '100%', padding: '14px 20px', border: 'none', borderRadius: 12,
            background: '#fff', color: COR.azulEscuro,
            fontSize: 16, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(0,0,0,.2)',
          }}>
            Abrir meu Dashboard →
          </button>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────
  // ── CONFIG PHASES ────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────

  const pct = STEP_PCT[phase] ?? 0
  const lbl = STEP_LBL[phase] ?? ''
  const hasBack = true

  function renderConfig() {
    // ── BANCO ──────────────────────────────────────────────────────────
    if (phase === 'banco') return (
      <>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🏦</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: COR.texto, marginBottom: 4 }}>
            Onde você está agora
          </div>
          <div style={{ fontSize: 13, color: COR.textoSuave, lineHeight: 1.5 }}>
            Todo voo começa com uma checagem. Informe o saldo atual de cada conta — é daqui
            que a travessia parte. Não precisa ser exato ao centavo; precisa ser honesto.
          </div>
        </div>

        {/* Contas já adicionadas */}
        {bancosLocal.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {bancosLocal.map(c => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: '#f0f9ff', border: '1px solid #bae6fd',
                borderRadius: 10, padding: '10px 14px',
              }}>
                <span style={{ fontSize: 18 }}>🏦</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COR.texto }}>{c.nome}</div>
                  <div style={{ fontSize: 11, color: '#0284c7' }}>{c.tipo === 'corrente' ? 'Corrente' : 'Poupança'}</div>
                </div>
                <button onClick={() => removeBanco(c.id)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#94a3b8', fontSize: 18, padding: 4,
                }}>×</button>
              </div>
            ))}
          </div>
        )}

        {/* Formulário */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <FL>Banco</FL>
            <select value={bancoBanco} onChange={e => setBancoBanco(e.target.value)}
              style={{ ...inputSt, background: bancoBanco ? '#fff' : '#f8fafc' }}>
              <option value="">Selecione o banco...</option>
              {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <FL>Nome da conta</FL>
            <input value={bancoNome} onChange={e => setBancoNome(e.target.value)}
              placeholder="Ex: Minha corrente, Conta Principal"
              style={inputSt} />
          </div>
          <div>
            <FL>Tipo</FL>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['corrente','poupanca'] as const).map(t => (
                <button key={t} onClick={() => setBancoTipo(t)} style={{
                  flex: 1, padding: '9px 0', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer',
                  border: `1.5px solid ${bancoTipo === t ? COR.azul : COR.borda}`, borderRadius: 8,
                  background: bancoTipo === t ? '#eff6ff' : '#fff',
                  color: bancoTipo === t ? COR.azul : COR.textoSuave,
                  fontWeight: bancoTipo === t ? 600 : 400,
                }}>{t === 'corrente' ? 'Corrente' : 'Poupança'}</button>
              ))}
            </div>
          </div>
          <div>
            <FL>Saldo atual aproximado</FL>
            <input value={bancoSaldo} onChange={e => setBancoSaldo(e.target.value)}
              placeholder="0,00" style={inputSt} />
            <Hint>Pode ser aproximado — você ajusta depois.</Hint>
          </div>
        </div>

        {bancoBanco && (
          <button onClick={addBancoCurrent} style={{
            width: '100%', marginTop: 14, padding: '10px 20px', border: `1.5px solid ${COR.azul}`,
            borderRadius: 10, background: '#eff6ff', color: COR.azul,
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>+ Adicionar conta</button>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          <BtnPrimary onClick={() => submitBanco(false)}>Próximo →</BtnPrimary>
          <BtnGhost onClick={() => submitBanco(true)}>Pular por agora</BtnGhost>
          <div style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8' }}>
            Você pode adicionar mais contas depois em Configurações.
          </div>
        </div>
      </>
    )

    // ── CARTÃO ─────────────────────────────────────────────────────────
    if (phase === 'cartao') return (
      <>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>💳</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: COR.texto, marginBottom: 4 }}>
            Tem cartão de crédito?
          </div>
          <div style={{ fontSize: 13, color: COR.textoSuave, lineHeight: 1.5, marginBottom: 8 }}>
            Cadastre para acompanhar faturas e controlar o limite.
          </div>
          <div style={{
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            borderRadius: 10, padding: '8px 12px',
            fontSize: 12, color: '#16a34a', lineHeight: 1.5,
          }}>
            Se está endividado no cartão, cadastrar é o primeiro passo para retomar o controle.
          </div>
        </div>

        {cartoesLocal.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {cartoesLocal.map(c => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: '#faf5ff', border: '1px solid #e9d5ff',
                borderRadius: 10, padding: '10px 14px',
              }}>
                <span style={{ fontSize: 18 }}>💳</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COR.texto }}>{c.nome}</div>
                  {c.diaVencimento && (
                    <div style={{ fontSize: 11, color: '#7c3aed' }}>Vence dia {c.diaVencimento}</div>
                  )}
                </div>
                <button onClick={() => removeCartao(c.id)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#94a3b8', fontSize: 18, padding: 4,
                }}>×</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <FL>Banco / Bandeira</FL>
            <select value={cartaoBanco} onChange={e => setCartaoBanco(e.target.value)}
              style={{ ...inputSt, background: cartaoBanco ? '#fff' : '#f8fafc' }}>
              <option value="">Selecione...</option>
              {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <FL>Apelido (opcional)</FL>
            <input value={cartaoApelido} onChange={e => setCartaoApelido(e.target.value)}
              placeholder="Ex: Nubank Gold, Cartão do Trabalho"
              style={inputSt} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <FL>Dia de vencimento</FL>
              <input type="number" min={1} max={31} value={cartaoVenc}
                onChange={e => setCartaoVenc(e.target.value)}
                placeholder="15" style={inputSt} />
            </div>
          </div>
          <Hint>Não sabe o limite? Veja no app do banco ou deixe em branco.</Hint>
        </div>

        {cartaoBanco && (
          <button onClick={addCartaoCurrent} style={{
            width: '100%', marginTop: 14, padding: '10px 20px', border: `1.5px solid #7c3aed`,
            borderRadius: 10, background: '#faf5ff', color: '#7c3aed',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>+ Adicionar cartão</button>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          <BtnPrimary onClick={() => submitCartao(false)}>Próximo →</BtnPrimary>
          <BtnGhost onClick={() => submitCartao(true)}>Pular por agora (adiciono depois)</BtnGhost>
        </div>
      </>
    )

    // ── CATEGORIAS ─────────────────────────────────────────────────────
    if (phase === 'categorias') {
      const lista = verMais ? CATEGORIAS_PADRAO : CATEGORIAS_PADRAO.slice(0, 14)
      return (
        <>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: COR.texto, marginBottom: 6 }}>
              Para onde vai
            </div>
            <div style={{ fontSize: 13, color: COR.textoSuave, lineHeight: 1.55 }}>
              Já selecionamos as mais comuns — desative as que não se aplicam a você.
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            {lista.map(c => {
              const sel = catSel.has(c.nome)
              return (
                <button key={c.nome} onClick={() => toggleCat(c.nome)} style={{
                  padding: '6px 10px', border: `1.5px solid ${sel ? COR.azul : COR.borda}`,
                  borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12,
                  background: sel ? '#eff6ff' : '#fff',
                  color: sel ? COR.azul : COR.textoSuave,
                  fontWeight: sel ? 600 : 400,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <span>{c.icone}</span>
                  <span>{c.nome}</span>
                </button>
              )
            })}
          </div>
          {!verMais && CATEGORIAS_PADRAO.length > 14 && (
            <button onClick={() => setVerMais(true)} style={{
              fontSize: 12, color: COR.azul, fontWeight: 600,
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', padding: '4px 0', marginBottom: 8,
            }}>
              Ver mais ({CATEGORIAS_PADRAO.length - 14} categorias) +
            </button>
          )}
          <div style={{ marginTop: 12 }}>
            <BtnPrimary onClick={submitCategorias}>Próximo →</BtnPrimary>
          </div>
          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: '#94a3b8' }}>
            Você pode criar categorias personalizadas depois em Configurações.
          </div>
        </>
      )
    }

    // ── CATCONFIG ──────────────────────────────────────────────────────
    if (phase === 'catconfig') {
      const forma_labels: Record<string, string> = { banco: '🏦 Banco', cartao: '💳 Cartão', dinheiro: '💵 Dinheiro' }

      return (
        <>
          {/* Sub-step header */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            {[1,2,3].map(s => (
              <div key={s} style={{
                flex: 1, height: 4, borderRadius: 3,
                background: s <= catConfigStep ? COR.azul : '#e2e8f0',
                transition: 'background .2s',
              }} />
            ))}
          </div>

          {catConfigStep === 1 && (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: COR.texto, marginBottom: 4 }}>
                  Como você paga cada despesa?
                </div>
                <div style={{ fontSize: 12, color: COR.textoSuave, lineHeight: 1.5 }}>
                  Selecione como você costuma pagar cada tipo de gasto. Múltipla seleção permitida.
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {catDespesas.map(nome => (
                  <div key={nome} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    flexWrap: 'wrap', padding: '8px 0',
                    borderBottom: '1px solid #f1f5f9',
                  }}>
                    <div style={{ flex: 1, minWidth: 80, fontSize: 13, fontWeight: 600, color: COR.texto }}>
                      {nome}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(['banco','cartao','dinheiro'] as const).map(f => {
                        const ativo = catConfig[nome]?.formasPag.includes(f)
                        return (
                          <button key={f} onClick={() => toggleForma(nome, f)} style={{
                            padding: '5px 10px', border: `1.5px solid ${ativo ? COR.azul : COR.borda}`,
                            borderRadius: 20, fontFamily: 'inherit', fontSize: 11, cursor: 'pointer',
                            background: ativo ? '#eff6ff' : '#fff',
                            color: ativo ? COR.azul : COR.textoSuave,
                            fontWeight: ativo ? 600 : 400,
                          }}>{forma_labels[f]}</button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {catConfigStep === 2 && (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: COR.texto, marginBottom: 4 }}>
                  Fixas ou variáveis?
                </div>
                <div style={{ fontSize: 12, color: COR.textoSuave, lineHeight: 1.5 }}>
                  Despesas fixas: valor parecido todo mês (aluguel, internet). Variáveis: mudam de valor (mercado, lazer).
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {catDespesas.map(nome => {
                  const conf  = catConfig[nome]
                  const fixa  = conf?.fixa ?? false
                  return (
                    <div key={nome} style={{
                      padding: '10px 0', borderBottom: '1px solid #f1f5f9',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 80, fontSize: 13, fontWeight: 600, color: COR.texto }}>
                          {nome}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {[false,true].map(v => (
                            <button key={String(v)} onClick={() => updateCatConf(nome, { fixa: v })} style={{
                              padding: '5px 12px', border: `1.5px solid ${fixa === v ? COR.azul : COR.borda}`,
                              borderRadius: 20, fontFamily: 'inherit', fontSize: 11, cursor: 'pointer',
                              background: fixa === v ? '#eff6ff' : '#fff',
                              color: fixa === v ? COR.azul : COR.textoSuave,
                              fontWeight: fixa === v ? 600 : 400,
                            }}>{v ? 'Fixa' : 'Variável'}</button>
                          ))}
                        </div>
                      </div>
                      {fixa && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, paddingLeft: 4 }}>
                          <span style={{ fontSize: 11, color: COR.textoSuave }}>Dia do pagamento:</span>
                          <input
                            type="number" min={1} max={31}
                            value={conf?.diaPag ?? ''}
                            onChange={e => updateCatConf(nome, { diaPag: e.target.value })}
                            placeholder="—"
                            style={{ ...inputSt, width: 64, padding: '5px 8px', fontSize: 12 }}
                          />
                          <span style={{ fontSize: 10, color: '#94a3b8' }}>Não sabe? Deixe em branco.</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {catConfigStep === 3 && (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: COR.texto, marginBottom: 4 }}>
                  Conta padrão
                </div>
                <div style={{ fontSize: 12, color: COR.textoSuave, lineHeight: 1.5 }}>
                  De qual conta sai cada despesa por padrão? Você pode mudar na hora do lançamento.
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {catDespesas.map(nome => (
                  <div key={nome} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 0', borderBottom: '1px solid #f1f5f9',
                    flexWrap: 'wrap',
                  }}>
                    <div style={{ flex: 1, minWidth: 80, fontSize: 13, fontWeight: 600, color: COR.texto }}>
                      {nome}
                    </div>
                    <select
                      value={catConfig[nome]?.contaId ?? ''}
                      onChange={e => updateCatConf(nome, { contaId: e.target.value })}
                      style={{ ...inputSt, width: 'auto', padding: '6px 10px', fontSize: 12 }}
                    >
                      {contas.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.nome} ({c.tipo === 'cartao' ? 'Cartão' : c.tipo === 'corrente' ? 'Corrente' : 'Poupança'})
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{ marginTop: 20 }}>
            <BtnPrimary onClick={advanceCatConfig}>Próximo →</BtnPrimary>
          </div>
        </>
      )
    }

    // ── PLANEJAMENTO ───────────────────────────────────────────────────
    if (phase === 'planejamento') return (
      <>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>🎯</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: COR.texto, marginBottom: 8 }}>
            Monte seu plano financeiro
          </div>
          <div style={{ fontSize: 13, color: COR.textoSuave, lineHeight: 1.6, marginBottom: 12 }}>
            O planejamento é o coração do Compass One. É ele que permite a bússola te guiar.
          </div>
          <div style={{ fontSize: 13, color: COR.textoSuave, lineHeight: 1.6 }}>
            Leva apenas 5 minutos e você terá uma visão completa do seu ano financeiro.
          </div>
        </div>

        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#0284c7', marginBottom: 4 }}>
            💡 O que é o planejamento?
          </div>
          <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
            Você define quanto pretende gastar em cada categoria por mês. A bússola vai comparar com seus gastos reais para te dizer se está no rumo.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <BtnPrimary onClick={() => navigate('/wizard-planejamento', { replace: true })}>Começar meu plano →</BtnPrimary>
          <BtnGhost onClick={() => setPhase('final')}>Fazer depois — quero explorar o app primeiro</BtnGhost>
        </div>
      </>
    )

    return null
  }

  return (
    <div style={{
      minHeight: '100dvh', background: COR.fundo,
      display: 'flex', flexDirection: 'column',
      fontFamily: "-apple-system,'Inter',sans-serif",
    }}>
      {/* Blue header */}
      <div style={{
        background: BG, padding: '20px 24px 24px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          {hasBack && (
            <button onClick={goBack} style={{
              background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 8,
              padding: '6px 10px', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>← Voltar</button>
          )}
          <div style={{ flex: 1, textAlign: hasBack ? 'center' : 'left' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.9)', fontWeight: 600 }}>Compass One</div>
          </div>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,.85)', marginBottom: 10 }}>
          {lbl}
        </div>
        <div style={{ background: 'rgba(255,255,255,.2)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 4,
            background: '#fff', width: `${pct}%`, transition: 'width .4s ease',
          }} />
        </div>
      </div>

      {/* Card content */}
      <div style={{
        flex: 1, overflowY: 'auto',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '20px 20px 40px',
      }}>
        <div style={{
          background: '#fff', borderRadius: 20,
          padding: '24px 20px',
          maxWidth: 480, width: '100%',
          boxShadow: '0 4px 24px rgba(0,0,0,.08)',
        }}>
          {renderConfig()}
        </div>
      </div>
    </div>
  )
}
