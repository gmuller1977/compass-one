import { useState, useEffect } from 'react'
import { parseBRL } from '../utils/moeda'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { Conta, Categoria } from '../context/AppContext'
import { CATEGORIAS_PADRAO } from '../data/categoriasPadrao'
import { COR } from '../utils/cores'
import { creditarAurix } from '../utils/aurix'
import { dispararToastAurix } from '../components/aurix/AurixToast'

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
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 80, lineHeight: 1, marginBottom: 20,
              animation: 'compassSpin 8s linear infinite',
              display: 'inline-block',
            }}>🧭</div>
            <style>{`@keyframes compassSpin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
            <div style={{ fontSize: isMobile ? 22 : 26, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
              Bem-vindo ao Compass One!
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,.7)', marginBottom: 16 }}>
              Sua bússola financeira pessoal.
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', lineHeight: 1.7, marginBottom: 28 }}>
              Aqui você vai descobrir para onde vai o seu dinheiro, planejar o futuro e tomar decisões com segurança. Tudo de forma simples e visual.
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: isMobile ? 16 : 28, flexWrap: 'wrap' }}>
              {[['📊','Controle'],['🎯','Planejamento'],['📈','Radar'],['🧭','Direção']].map(([ico, lbl]) => (
                <div key={lbl} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>{ico}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', fontWeight: 600 }}>{lbl}</div>
                </div>
              ))}
            </div>
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
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', lineHeight: 1.6 }}>{desc}</div>
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
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', lineHeight: 1.5 }}>{desc}</div>
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
                Sua rotina financeira
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 3 }}>
                Simples. Consistente. Eficaz.
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
              fontSize: 11, color: 'rgba(255,255,255,.5)', lineHeight: 1.6, textAlign: 'center',
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
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', marginBottom: 24 }}>
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
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginBottom: 16 }}>
              Acumule Aurix, desbloqueie conquistas e suba de nível.
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }}>
              {NIVEIS.map((n, i) => (
                <span key={i} style={{
                  fontSize: 11, padding: '3px 8px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,.7)',
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
            <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,.7)', marginBottom: 12 }}>
              Vamos configurar o básico em poucos minutos.
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', marginBottom: 28, lineHeight: 1.6 }}>
              Cadastre suas contas, cartões e categorias. Leva menos de 5 minutos.
            </div>
            <div style={{
              display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap',
              marginBottom: 28, fontSize: 12, color: 'rgba(255,255,255,.5)',
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
      <div style={{
        minHeight: '100dvh', background: BG,
        display: 'flex', flexDirection: 'column',
        fontFamily: "-apple-system,'Inter',sans-serif",
      }}>
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
              }}>Próximo →</button>
              {slide > 0 ? (
                <button onClick={() => goSlide(slide - 1)} style={{
                  width: '100%', padding: '10px 20px', border: 'none', borderRadius: 12,
                  background: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.7)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}>← Voltar</button>
              ) : (
                <button onClick={pularApresentacao} style={{
                  width: '100%', padding: '10px 20px', border: 'none', borderRadius: 12,
                  background: 'transparent', color: 'rgba(255,255,255,.5)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}>Pular apresentação</button>
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
                background: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.7)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>← Voltar</button>
              <button onClick={() => { setOnboardingCompleto(true); navigate('/') }} style={{
                width: '100%', padding: '10px 20px', border: 'none', borderRadius: 12,
                background: 'transparent', color: 'rgba(255,255,255,.45)',
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
          Tudo pronto!
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,.65)', marginBottom: 28 }}>
          Seu Compass One está configurado.
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
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>
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
            Cadastre suas contas bancárias
          </div>
          <div style={{ fontSize: 13, color: COR.textoSuave, lineHeight: 1.5 }}>
            Adicione as contas que você usa no dia a dia. Pode ser corrente, poupança ou digital.
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
              Quais são seus tipos de gasto?
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
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', fontWeight: 600 }}>Compass One</div>
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
