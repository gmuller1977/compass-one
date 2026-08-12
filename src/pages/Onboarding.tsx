import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { Conta, Categoria } from '../context/AppContext'
import { CATEGORIAS_PADRAO } from '../data/categoriasPadrao'
import { COR } from '../utils/cores'

const BANCOS = [
  'Banco do Brasil', 'Bradesco', 'C6 Bank', 'Caixa', 'Inter',
  'Itaú', 'Nubank', 'Santander', 'Sicredi', 'XP', 'Outro',
]

type SlideSimples = { icon: string; title: string; subtitle: string; desc: string }
type SlideRotina  = { type: 'rotina' }
type Slide = SlideSimples | SlideRotina

const SLIDES: Slide[] = [
  {
    icon: '🧭',
    title: 'Bem-vindo ao Compass One!',
    subtitle: 'Sua bússola financeira',
    desc: 'Aqui você vai organizar suas finanças, saber para onde vai seu dinheiro e encontrar o caminho para uma vida financeira mais estável.',
  },
  {
    icon: '🏠',
    title: 'Início',
    subtitle: 'Sua visão geral do mês',
    desc: 'A bússola mostra se você está no caminho certo. Os cards mostram quanto você tem, ganhou e gastou.',
  },
  {
    icon: '📋',
    title: 'Lançamentos',
    subtitle: 'Simples e rápido',
    desc: 'Registre seus gastos e recebimentos com poucos toques. Simples e rápido.',
  },
  {
    icon: '🎯',
    title: 'Planejamento',
    subtitle: 'Seu orçamento mensal',
    desc: 'Defina quanto pretende gastar em cada categoria. Esse é o seu orçamento mensal.',
  },
  {
    icon: '📈',
    title: 'Evolução',
    subtitle: 'Acompanhe seu progresso',
    desc: 'Acompanhe se seus gastos reais estão dentro do planejado. Verde = no rumo. Vermelho = passou.',
  },
  { type: 'rotina' },
]

const ROTINA_COLS = [
  {
    titulo: 'Todo dia',
    tempo: '5 minutos por dia',
    passos: [
      { titulo: 'Conferir o saldo',       desc: 'Compare o saldo do app com o do banco.',                                       pill: { icon: '🏦', label: 'Lançamentos → Banco' } },
      { titulo: 'Registrar gastos',        desc: 'Anotou um café? Uma compra? Registre na hora para não esquecer.',              pill: { icon: '📋', label: 'Lançamentos' } },
      { titulo: 'Acompanhar a evolução',   desc: 'Veja se seus gastos estão dentro do planejado.',                               pill: { icon: '📈', label: 'Evolução' } },
      { titulo: 'Olhar a bússola',         desc: 'Confira o resumo do dia. Verde = no caminho certo.',                           pill: { icon: '🏠', label: 'Início' } },
    ],
  },
  {
    titulo: 'Todo mês',
    tempo: '30 minutos por mês',
    passos: [
      { titulo: 'Revisar o mês',           desc: 'Veja onde gastou mais e justifique os desvios.',                               pill: { icon: '🔄', label: 'Planejamento → Revisão' } },
      { titulo: 'Ajustar o plano',         desc: 'Corrija o planejamento dos próximos meses.',                                   pill: { icon: '🎯', label: 'Planejamento' } },
      { titulo: 'Conferir faturas',        desc: 'Verifique as faturas antes do vencimento.',                                    pill: { icon: '💳', label: 'Lançamentos → Cartão' } },
    ],
  },
  {
    titulo: 'Todo ano',
    tempo: '1 hora por ano',
    passos: [
      { titulo: 'Criar o planejamento',    desc: 'Defina seu orçamento para o ano. Use as lições do ano anterior.',              pill: { icon: '🎯', label: 'Planejamento → Assistente' } },
      { titulo: 'Definir objetivos',       desc: 'Economizar? Quitar dívidas? Realizar um sonho?',                               pill: { icon: '🔮', label: 'Simulador' } },
      { titulo: 'Lembrar dos extras',      desc: 'IPVA, escola, Natal, férias — inclua os gastos sazonais.',                    pill: { icon: '🎯', label: 'Planejamento → Grade' } },
    ],
  },
]

// Top 10 nomes de categorias pré-selecionados
const TOP10 = new Set([
  'Salário', 'Mercado / Supermercado', 'Aluguel / Financiamento',
  'Restaurante / Delivery', 'Combustível', 'Plano de Saúde',
  'Energia Elétrica', 'Transporte / Uber', 'Internet / Celular',
  'Streaming / Assinaturas',
])

function parseBRL(s: string): number {
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
}

function newId() {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

type Phase = 'welcome' | 'banco' | 'cartao' | 'categorias' | 'planejamento'

const inputSt: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: `1.5px solid ${COR.borda}`, fontSize: 13,
  fontFamily: 'inherit', color: COR.texto, outline: 'none',
  background: '#fff', boxSizing: 'border-box',
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: COR.textoSuave,
      textTransform: 'uppercase', letterSpacing: .5, marginBottom: 5 }}>
      {children}
    </div>
  )
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{children}</div>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  const { contas, categorias, setContas, setCategorias, setOnboardingCompleto } = useApp()

  // Se o usuário já tem dados, pula welcome; se veio de "Rever boas-vindas", começa do zero
  const hasBank = contas.some(c => c.tipo !== 'cartao')
  const [phase, setPhase] = useState<Phase>(hasBank ? 'banco' : 'welcome')
  const [slide, setSlide] = useState(0)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600)
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 600)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  const isRotinaSlide = phase === 'welcome' && 'type' in SLIDES[slide]

  // ── Banco ────────────────────────────────────────────────
  const [bancoBanco,   setBancoBanco]   = useState('')
  const [bancoNome,    setBancoNome]    = useState('')
  const [bancoTipo,    setBancoTipo]    = useState<'corrente'|'poupanca'>('corrente')
  const [bancoSaldo,   setBancoSaldo]   = useState('')

  // ── Cartão ───────────────────────────────────────────────
  const [cartaoBanco,   setCartaoBanco]   = useState('')
  const [cartaoLimite,  setCartaoLimite]  = useState('')
  const [cartaoVenc,    setCartaoVenc]    = useState('')
  const [cartaoApelido, setCartaoApelido] = useState('')

  // ── Categorias ───────────────────────────────────────────
  const [catSel, setCatSel] = useState<Set<string>>(() => new Set(TOP10))
  const [verMais, setVerMais] = useState(false)

  // ── Helpers ──────────────────────────────────────────────
  function nextSlide() {
    if (slide < SLIDES.length - 1) setSlide(s => s + 1)
    else setPhase('banco')
  }

  function submitBanco() {
    const conta: Conta = {
      id: newId(),
      nome: bancoNome || bancoBanco,
      banco: bancoBanco || 'Meu banco',
      tipo: bancoTipo,
      saldoInicial: parseBRL(bancoSaldo),
      cor: '#1a56db', icone: '🏦',
      preferida: true, incluirNoSaldoInicial: true,
    }
    setContas(prev => [...prev.filter(c => c.id !== conta.id), conta])
    setPhase('cartao')
  }

  function submitCartao(pular = false) {
    if (!pular && cartaoBanco) {
      const cartao: Conta = {
        id: newId(),
        nome: cartaoApelido || cartaoBanco,
        banco: cartaoBanco,
        tipo: 'cartao',
        saldoInicial: 0,
        cor: '#7c3aed', icone: '💳',
        limiteCartao: parseBRL(cartaoLimite) || undefined,
        diaVencimento: parseInt(cartaoVenc) || undefined,
        preferida: false, incluirNoSaldoInicial: false,
      }
      setContas(prev => [...prev, cartao])
    }
    setPhase('categorias')
  }

  function toggleCat(nome: string) {
    setCatSel(prev => {
      const next = new Set(prev)
      if (next.has(nome)) next.delete(nome)
      else next.add(nome)
      return next
    })
  }

  function submitCategorias() {
    // Sync ativa flags based on selection
    const atuais: Categoria[] = categorias.length > 0
      ? categorias.map(c => ({ ...c, ativa: catSel.has(c.nome) }))
      : CATEGORIAS_PADRAO.map((c, i) => ({
          ...c,
          id: newId() + i,
          ativa: catSel.has(c.nome),
        }))
    setCategorias(atuais)
    setOnboardingCompleto(true)
    setPhase('planejamento')
  }

  function finalizarSemPlano() {
    navigate('/', { replace: true })
  }

  function irParaPlano() {
    navigate('/wizard-planejamento', { replace: true })
  }

  // ── Layout wrapper ─────────────────────────────────────
  return (
    <div style={{
      minHeight: '100dvh', background: COR.fundo,
      display: 'flex', flexDirection: 'column',
      fontFamily: "-apple-system,'Inter',sans-serif",
    }}>

      {/* ── Header azul ─────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${COR.azulEscuro} 0%, ${COR.azulMedio} 100%)`,
        padding: '24px 24px 28px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.6)',
          letterSpacing: 1.5, textTransform: 'uppercase' }}>
          Compass One
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 10 }}>
          {phase === 'welcome'     ? 'Conheça o app'
           : phase === 'banco'     ? 'Adicione sua conta bancária'
           : phase === 'cartao'    ? 'Tem cartão de crédito?'
           : phase === 'categorias'? 'Seus tipos de gasto'
           :                         'Monte seu planejamento'}
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          {(['welcome','banco','cartao','categorias','planejamento'] as Phase[]).map((p, i) => (
            <div key={p} style={{
              height: 7, borderRadius: 6,
              width: p === phase ? 22 : 7,
              background: i < (['welcome','banco','cartao','categorias','planejamento'] as Phase[]).indexOf(phase)
                ? 'rgba(255,255,255,.6)'
                : p === phase ? '#fff' : 'rgba(255,255,255,.25)',
              transition: 'all .3s',
            }} />
          ))}
        </div>
      </div>

      {/* ── Conteúdo ─────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '20px 20px 32px',
        overflowY: 'auto',
      }}>
        <div style={{
          background: isRotinaSlide ? 'transparent' : COR.branco,
          borderRadius: 20,
          padding: isRotinaSlide ? 0 : '28px 24px',
          maxWidth: isRotinaSlide ? 680 : 420,
          width: '100%',
          boxShadow: isRotinaSlide ? 'none' : '0 4px 24px rgba(0,0,0,.08)',
        }}>

          {/* ──────── WELCOME ──────── */}
          {phase === 'welcome' && (() => {
            const sl = SLIDES[slide]
            const isRotina = 'type' in sl

            if (isRotina) {
              // ── Slide "Sua rotina financeira" ──────────────────────
              const pillSt: React.CSSProperties = {
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'rgba(147,197,253,0.12)',
                border: '1px solid rgba(147,197,253,0.2)',
                color: '#93c5fd', fontSize: 9, borderRadius: 10,
                padding: '2px 7px', fontWeight: 600, whiteSpace: 'nowrap',
                marginTop: 4,
              }
              return (
                <div style={{
                  background: 'linear-gradient(135deg, #0f2878 0%, #1a56db 100%)',
                  borderRadius: 20, padding: isMobile ? '20px 16px' : '24px 24px',
                }}>
                  {/* Título */}
                  <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: '#fff' }}>
                      Sua rotina financeira
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', marginTop: 3 }}>
                      Simples. Consistente. Eficaz.
                    </div>
                  </div>

                  {/* 3 colunas */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                    gap: 12, marginBottom: 18,
                  }}>
                    {ROTINA_COLS.map((col) => (
                      <div key={col.titulo} style={{
                        background: 'rgba(255,255,255,0.06)',
                        borderRadius: 12, padding: '14px 12px',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}>
                        {/* Cabeçalho da coluna */}
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{col.titulo}</div>
                          <div style={{
                            display: 'inline-block', marginTop: 3,
                            background: 'rgba(147,197,253,0.15)',
                            border: '1px solid rgba(147,197,253,0.25)',
                            color: '#93c5fd', fontSize: 9, borderRadius: 20,
                            padding: '2px 8px', fontWeight: 600,
                          }}>{col.tempo}</div>
                        </div>

                        {/* Passos */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {col.passos.map((p, pi) => (
                            <div key={pi} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                              <div style={{
                                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                                background: 'rgba(147,197,253,0.2)', border: '1px solid rgba(147,197,253,0.3)',
                                color: '#93c5fd', fontSize: 10, fontWeight: 800,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>{pi + 1}</div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
                                  {p.titulo}
                                </div>
                                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', lineHeight: 1.4, marginTop: 2 }}>
                                  {p.desc}
                                </div>
                                <div style={pillSt}>
                                  <span>{p.pill.icon}</span>
                                  <span>{p.pill.label}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Rodapé */}
                  <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                    border: '1px solid rgba(255,255,255,0.08)',
                    fontSize: 11, color: 'rgba(255,255,255,.55)', lineHeight: 1.6, textAlign: 'center',
                  }}>
                    <span style={{ color: '#93c5fd', fontWeight: 700 }}>5 min/dia + 30 min/mês + 1h/ano</span>
                    {' '}= controle total das suas finanças.<br />
                    A bússola te avisa se algo sair do rumo. O Norte te ajuda quando tiver dúvida.
                  </div>

                  {/* Dots + Botão */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 14 }}>
                    {SLIDES.map((_, i) => (
                      <div key={i} onClick={() => setSlide(i)} style={{
                        width: i === slide ? 18 : 7, height: 7, borderRadius: 6,
                        background: i === slide ? '#fff' : 'rgba(255,255,255,.3)',
                        cursor: 'pointer', transition: 'all .2s',
                      }} />
                    ))}
                  </div>

                  <button onClick={nextSlide} style={{
                    width: '100%', padding: '13px 20px', border: 'none', borderRadius: 12,
                    background: '#fff', color: COR.azulEscuro,
                    fontSize: 15, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(0,0,0,.2)',
                  }}>
                    Vamos começar →
                  </button>
                </div>
              )
            }

            // ── Slides simples ────────────────────────────────────────
            const s = sl as SlideSimples
            return (
              <>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ fontSize: 52, lineHeight: 1, marginBottom: 16 }}>{s.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: COR.texto, marginBottom: 4 }}>{s.title}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COR.azul, marginBottom: 10 }}>{s.subtitle}</div>
                  <div style={{ fontSize: 14, color: COR.textoSuave, lineHeight: 1.6 }}>{s.desc}</div>
                </div>

                {/* Slide dots */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 22 }}>
                  {SLIDES.map((_, i) => (
                    <div key={i} onClick={() => setSlide(i)} style={{
                      width: i === slide ? 18 : 7, height: 7, borderRadius: 6,
                      background: i === slide ? COR.azul : '#cbd5e1',
                      cursor: 'pointer', transition: 'all .2s',
                    }} />
                  ))}
                </div>

                <button onClick={nextSlide} style={{
                  width: '100%', padding: '13px 20px', border: 'none', borderRadius: 12,
                  background: `linear-gradient(135deg, ${COR.azul} 0%, ${COR.azulMedio} 100%)`,
                  color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(26,86,219,.25)',
                }}>
                  Próximo →
                </button>

                <button onClick={() => setPhase('banco')} style={{
                  width: '100%', marginTop: 8, padding: '10px 20px',
                  border: 'none', borderRadius: 12, background: 'transparent',
                  color: COR.textoSuave, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  Pular apresentação
                </button>
              </>
            )
          })()}

          {/* ──────── BANCO ──────── */}
          {phase === 'banco' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 22 }}>
                <div style={{ fontSize: 40, lineHeight: 1, marginBottom: 10 }}>🏦</div>
                <div style={{ fontSize: 13, color: COR.textoSuave, lineHeight: 1.5 }}>
                  Adicione a conta bancária que você usa no dia a dia.
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <FieldLabel>Banco *</FieldLabel>
                  <select value={bancoBanco} onChange={e => setBancoBanco(e.target.value)}
                    style={{ ...inputSt, background: bancoBanco ? '#fff' : '#f8fafc' }}>
                    <option value="">Selecione o banco...</option>
                    {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>

                <div>
                  <FieldLabel>Nome / Titular</FieldLabel>
                  <input value={bancoNome} onChange={e => setBancoNome(e.target.value)}
                    placeholder="Ex: João Silva ou Conta Principal"
                    style={inputSt} />
                </div>

                <div>
                  <FieldLabel>Tipo de conta</FieldLabel>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['corrente', 'poupanca'] as const).map(t => (
                      <button key={t} onClick={() => setBancoTipo(t)} style={{
                        flex: 1, padding: '9px 0', border: `1.5px solid ${bancoTipo === t ? COR.azul : COR.borda}`,
                        borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                        background: bancoTipo === t ? '#eff6ff' : COR.branco,
                        color: bancoTipo === t ? COR.azul : COR.textoSuave, fontWeight: bancoTipo === t ? 600 : 400,
                      }}>
                        {t === 'corrente' ? 'Corrente' : 'Poupança'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <FieldLabel>Saldo atual aproximado</FieldLabel>
                  <input value={bancoSaldo} onChange={e => setBancoSaldo(e.target.value)}
                    placeholder="0,00" style={inputSt} />
                  <Hint>Pode ser aproximado — você ajusta depois.</Hint>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 22 }}>
                <button onClick={submitBanco} disabled={!bancoBanco} style={{
                  padding: '13px 20px', border: 'none', borderRadius: 12,
                  background: bancoBanco
                    ? `linear-gradient(135deg, ${COR.azul} 0%, ${COR.azulMedio} 100%)`
                    : '#e2e8f0',
                  color: bancoBanco ? '#fff' : '#94a3b8',
                  fontSize: 15, fontWeight: 700, cursor: bancoBanco ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit', boxShadow: bancoBanco ? '0 4px 12px rgba(26,86,219,.25)' : 'none',
                }}>
                  Continuar →
                </button>
                <button onClick={() => setPhase('cartao')} style={{
                  padding: '10px 20px', border: 'none', borderRadius: 12, background: 'transparent',
                  color: COR.textoSuave, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  Pular por agora
                </button>
              </div>
            </>
          )}

          {/* ──────── CARTÃO ──────── */}
          {phase === 'cartao' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 22 }}>
                <div style={{ fontSize: 40, lineHeight: 1, marginBottom: 10 }}>💳</div>
                <div style={{ fontSize: 13, color: COR.textoSuave, lineHeight: 1.5 }}>
                  Cadastre um cartão para acompanhar suas faturas.
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <FieldLabel>Bandeira / Banco</FieldLabel>
                  <select value={cartaoBanco} onChange={e => setCartaoBanco(e.target.value)}
                    style={{ ...inputSt, background: cartaoBanco ? '#fff' : '#f8fafc' }}>
                    <option value="">Selecione...</option>
                    {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>

                <div>
                  <FieldLabel>Apelido (opcional)</FieldLabel>
                  <input value={cartaoApelido} onChange={e => setCartaoApelido(e.target.value)}
                    placeholder="Ex: Nubank Gold, Cartão do Trabalho"
                    style={inputSt} />
                </div>

                <div>
                  <FieldLabel>Limite total</FieldLabel>
                  <input value={cartaoLimite} onChange={e => setCartaoLimite(e.target.value)}
                    placeholder="5.000,00" style={inputSt} />
                </div>

                <div>
                  <FieldLabel>Dia do vencimento</FieldLabel>
                  <input type="number" min={1} max={31} value={cartaoVenc}
                    onChange={e => setCartaoVenc(e.target.value)}
                    placeholder="Ex: 15" style={{ ...inputSt, width: 90 }} />
                  <Hint>Não sabe o dia? Veja no app do banco ou deixe em branco.</Hint>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 22 }}>
                <button onClick={() => submitCartao(false)} disabled={!cartaoBanco} style={{
                  padding: '13px 20px', border: 'none', borderRadius: 12,
                  background: cartaoBanco
                    ? `linear-gradient(135deg, ${COR.azul} 0%, ${COR.azulMedio} 100%)`
                    : '#e2e8f0',
                  color: cartaoBanco ? '#fff' : '#94a3b8',
                  fontSize: 15, fontWeight: 700,
                  cursor: cartaoBanco ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit', boxShadow: cartaoBanco ? '0 4px 12px rgba(26,86,219,.25)' : 'none',
                }}>
                  Adicionar cartão →
                </button>
                <button onClick={() => submitCartao(true)} style={{
                  padding: '10px 20px', border: 'none', borderRadius: 12, background: 'transparent',
                  color: COR.textoSuave, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  Pular por agora (adiciono depois)
                </button>
              </div>
            </>
          )}

          {/* ──────── CATEGORIAS ──────── */}
          {phase === 'categorias' && (() => {
            const lista = verMais ? CATEGORIAS_PADRAO : CATEGORIAS_PADRAO.slice(0, 14)
            return (
              <>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: COR.texto, marginBottom: 6 }}>
                    Seus tipos de gasto
                  </div>
                  <div style={{ fontSize: 13, color: COR.textoSuave, lineHeight: 1.55 }}>
                    Categorias são os tipos de gasto do seu dia a dia — como Mercado, Conta de Luz, Uber.
                    Marque as que fazem sentido para você.
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  {lista.map(c => {
                    const sel = catSel.has(c.nome)
                    return (
                      <button key={c.nome} onClick={() => toggleCat(c.nome)} style={{
                        padding: '6px 10px', border: `1.5px solid ${sel ? COR.azul : COR.borda}`,
                        borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12,
                        background: sel ? '#eff6ff' : COR.branco,
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
                    Ver mais ({CATEGORIAS_PADRAO.length - 14} categorias) ↓
                  </button>
                )}

                <button onClick={submitCategorias} style={{
                  width: '100%', marginTop: 10, padding: '13px 20px', border: 'none', borderRadius: 12,
                  background: `linear-gradient(135deg, ${COR.azul} 0%, ${COR.azulMedio} 100%)`,
                  color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(26,86,219,.25)',
                }}>
                  Continuar →
                </button>
              </>
            )
          })()}

          {/* ──────── PLANEJAMENTO ──────── */}
          {phase === 'planejamento' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 14 }}>🎯</div>
                <div style={{ fontSize: 19, fontWeight: 800, color: COR.texto, marginBottom: 8 }}>
                  Tudo pronto!
                </div>
                <div style={{ fontSize: 13, color: COR.textoSuave, lineHeight: 1.6 }}>
                  Você já pode usar o app! O planejamento pode ser feito quando estiver pronto — ele vai deixar a bússola ainda mais precisa.
                </div>
              </div>

              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd',
                borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0284c7', marginBottom: 4 }}>
                  💡 O que é o planejamento?
                </div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                  Você define quanto pretende gastar em cada categoria por mês. A bússola vai comparar com seus gastos reais para te dizer se está no rumo.
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={finalizarSemPlano} style={{
                  padding: '13px 20px', border: 'none', borderRadius: 12,
                  background: `linear-gradient(135deg, ${COR.azul} 0%, ${COR.azulMedio} 100%)`,
                  color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(26,86,219,.25)',
                }}>
                  Fazer depois →
                </button>
                <button onClick={irParaPlano} style={{
                  padding: '11px 20px', border: `1.5px solid ${COR.azul}`, borderRadius: 12,
                  background: '#eff6ff', color: COR.azul,
                  fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  Começar planejamento agora
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
