import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const h = () => setV(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
}

const AZUL_ESCURO = '#0f2878'
const AZUL_MEDIO  = '#2563eb'
const AZUL        = '#1a56db'

function CompassIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="1.5"/>
      <polygon points="10,3 11.2,9.4 10,8.5 8.8,9.4" fill="white"/>
      <polygon points="10,17 8.8,10.6 10,11.5 11.2,10.6" fill="white" opacity=".5"/>
    </svg>
  )
}

function AppMockup() {
  return (
    <div style={{
      width: 340, flexShrink: 0,
      background: '#f8faff',
      borderRadius: 20,
      overflow: 'hidden',
      boxShadow: '0 40px 100px rgba(15,40,120,.35), 0 8px 24px rgba(0,0,0,.15)',
      transform: 'perspective(1200px) rotateY(-8deg) rotateX(2deg)',
      border: '1px solid rgba(255,255,255,.25)',
      userSelect: 'none',
    }}>
      {/* App header */}
      <div style={{
        background: `linear-gradient(135deg,${AZUL_ESCURO},${AZUL_MEDIO})`,
        padding: '14px 16px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{
            width:26, height:26, borderRadius:8,
            background:'rgba(255,255,255,.2)', border:'1px solid rgba(255,255,255,.3)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <CompassIcon size={15} />
          </div>
          <span style={{ color:'#fff', fontSize:14, fontWeight:700 }}>
            Compass <span style={{ fontWeight:300, opacity:.7 }}>One</span>
          </span>
        </div>
        <div style={{
          fontSize:11, color:'rgba(255,255,255,.8)', fontWeight:600,
          background:'rgba(255,255,255,.12)', padding:'4px 10px', borderRadius:12,
        }}>Agosto 2026</div>
      </div>

      {/* Main content */}
      <div style={{ padding:'14px 14px 16px' }}>

        {/* Compass card */}
        <div style={{
          background:'#f0fdf4', border:'1.5px solid #bbf7d0', borderRadius:12,
          padding:'11px 13px', marginBottom:11, display:'flex', alignItems:'center', gap:11,
        }}>
          <div style={{
            width:36, height:36, background:'#f0fdf4', border:'2px solid #86efac',
            borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
          }}>🟢</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#16a34a', marginBottom:2 }}>No caminho certo</div>
            <div style={{ fontSize:10, color:'#475569', lineHeight:1.4 }}>Você está dentro do planejado este mês.</div>
          </div>
        </div>

        {/* KPI cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:7, marginBottom:11 }}>
          {[
            { label:'Tenho',  value:'R$ 4.820', color:'#0f172a' },
            { label:'Entrou', value:'R$ 8.500', color:'#16a34a' },
            { label:'Gastei', value:'R$ 3.680', color:'#dc2626' },
          ].map(k => (
            <div key={k.label} style={{
              background:'#fff', borderRadius:10, padding:'9px 9px',
              border:'1px solid #e2e8f0',
            }}>
              <div style={{ fontSize:8, color:'#94a3b8', fontWeight:700, textTransform:'uppercase', letterSpacing:'.3px', marginBottom:3 }}>{k.label}</div>
              <div style={{ fontSize:12, fontWeight:800, color:k.color, fontVariantNumeric:'tabular-nums' }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Onde mais gastei */}
        <div style={{ background:'#fff', borderRadius:10, padding:'10px 12px', border:'1px solid #e2e8f0' }}>
          <div style={{ fontSize:11, fontWeight:600, color:'#0f172a', marginBottom:9 }}>Últimos lançamentos</div>
          {[
            { icon:'🛒', name:'Supermercado',   value:'-R$ 284', color:'#dc2626' },
            { icon:'💼', name:'Salário',         value:'+R$ 7.000', color:'#16a34a' },
            { icon:'⛽', name:'Combustível',     value:'-R$ 150', color:'#dc2626' },
          ].map((l, i) => (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap:8,
              paddingBottom: i < 2 ? 8 : 0, marginBottom: i < 2 ? 8 : 0,
              borderBottom: i < 2 ? '1px solid #f1f5f9' : 'none',
            }}>
              <div style={{
                width:24, height:24, borderRadius:8, background:'#f8fafc',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:13,
              }}>{l.icon}</div>
              <div style={{ flex:1, fontSize:11, color:'#475569' }}>{l.name}</div>
              <div style={{ fontSize:11, fontWeight:700, color:l.color, fontVariantNumeric:'tabular-nums' }}>{l.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const ano = new Date().getFullYear()

  const s0 = useRef<HTMLDivElement>(null)
  const s1 = useRef<HTMLDivElement>(null)
  const s2 = useRef<HTMLDivElement>(null)
  const sP = useRef<HTMLDivElement>(null)
  const s3 = useRef<HTMLDivElement>(null)
  const s4 = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('lp-visible') }),
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )
    ;[s0, s1, s2, sP, s3, s4].forEach(r => { if (r.current) observer.observe(r.current) })
    return () => observer.disconnect()
  }, [])

  return (
    <div style={{
      minHeight: '100vh', background: '#fff',
      fontFamily: "-apple-system,'Inter',sans-serif",
      overflowX: 'hidden',
    }}>
      <style>{`
        html { scroll-behavior: smooth }
        .lp-fade { opacity: 0; transform: translateY(28px); transition: opacity .65s ease, transform .65s ease }
        .lp-fade.lp-visible { opacity: 1; transform: none }
        .benefit-card { transition: transform .2s ease, box-shadow .2s ease !important }
        .benefit-card:hover { transform: translateY(-5px) !important; box-shadow: 0 16px 40px rgba(0,0,0,.12) !important }
        .lp-cta-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(15,40,120,.32) !important; }
        .lp-cta-primary { transition: transform .2s, box-shadow .2s }
        .plans-grid { display:grid; grid-template-columns:1fr; gap:16px }
        @media(min-width:640px) { .plans-grid { grid-template-columns:repeat(2,1fr) } }
        @media(min-width:1100px){ .plans-grid { grid-template-columns:repeat(5,1fr) } }
      `}</style>

      {/* ── HERO ── */}
      <div style={{
        background: `linear-gradient(150deg, ${AZUL_ESCURO} 0%, ${AZUL_MEDIO} 100%)`,
        padding: isMobile ? '36px 20px 52px' : '56px 40px 72px',
        overflow: 'hidden',
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          gap: isMobile ? 40 : 60,
        }}>
          {/* Left: text */}
          <div style={{ flex: 1, minWidth: 0, textAlign: isMobile ? 'center' : 'left' }}>
            {/* Logo */}
            <div style={{
              display:'flex', alignItems:'center', gap:10,
              justifyContent: isMobile ? 'center' : 'flex-start',
              marginBottom: 28,
            }}>
              <div style={{
                width:46, height:46, borderRadius:14,
                background:'rgba(255,255,255,.15)', border:'1.5px solid rgba(255,255,255,.25)',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <CompassIcon size={26} />
              </div>
              <span style={{ color:'#fff', fontSize:22, fontWeight:700 }}>
                Compass <span style={{ fontWeight:300, opacity:.7 }}>One</span>
              </span>
            </div>

            {/* Badge */}
            <div style={{
              display: 'inline-flex', alignItems:'center', gap:6,
              background:'rgba(255,255,255,.12)', border:'1px solid rgba(255,255,255,.2)',
              borderRadius:20, padding:'5px 14px', marginBottom:20,
              fontSize:12, fontWeight:600, color:'rgba(255,255,255,.9)',
              letterSpacing:'.3px',
            }}>
              ✨ 100% gratuito · Sem cartão de crédito
            </div>

            <h1 style={{
              color: '#fff',
              fontSize: isMobile ? 34 : 50,
              fontWeight: 800,
              margin: '0 0 18px',
              lineHeight: 1.1,
              letterSpacing: '-1.5px',
            }}>
              Chega de se perder<br/>nas contas.
            </h1>
            <p style={{
              color: 'rgba(255,255,255,.82)',
              fontSize: isMobile ? 16 : 18,
              margin: '0 0 36px',
              lineHeight: 1.65,
              maxWidth: 440,
              marginLeft: isMobile ? 'auto' : 0,
              marginRight: isMobile ? 'auto' : 0,
            }}>
              O Compass One mostra o caminho para uma vida financeira mais tranquila.
            </p>

            {/* CTAs */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: 12,
              alignItems: isMobile ? 'stretch' : 'center',
              marginBottom: 24,
            }}>
              <button
                className="lp-cta-primary"
                onClick={() => navigate('/cadastro')}
                style={{
                  background: '#fff', color: AZUL_ESCURO,
                  border: 'none', borderRadius: 12,
                  padding: '15px 36px', fontSize: 16, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 8px 28px rgba(0,0,0,.22)',
                }}
              >
                Começar grátis →
              </button>
              <button
                onClick={() => navigate('/login')}
                style={{
                  background: 'transparent',
                  color: 'rgba(255,255,255,.85)',
                  border: '1.5px solid rgba(255,255,255,.35)',
                  borderRadius: 12, padding: '14px 28px',
                  fontSize: 15, fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Já tenho conta → Entrar
              </button>
            </div>

            {/* Security */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              justifyContent: isMobile ? 'center' : 'flex-start',
              color: 'rgba(255,255,255,.5)', fontSize: 12,
            }}>
              <span>🔒</span> Seus dados são criptografados e só você tem acesso
            </div>
          </div>

          {/* Right: App mockup */}
          {!isMobile && (
            <div style={{ flexShrink: 0, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <AppMockup />
            </div>
          )}

          {/* Mobile: smaller mockup below */}
          {isMobile && (
            <div style={{
              display:'flex', justifyContent:'center', width:'100%',
              transform:'scale(0.82)', transformOrigin:'top center',
            }}>
              <AppMockup />
            </div>
          )}
        </div>
      </div>

      {/* ── BENEFITS ── */}
      <div
        ref={s0}
        className="lp-fade"
        style={{ padding: isMobile ? '72px 20px' : '96px 24px', background: '#fff' }}
      >
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <h2 style={{
            textAlign: 'center', fontSize: isMobile ? 24 : 32,
            fontWeight: 700, color: '#0f172a', margin: '0 0 8px',
          }}>
            Controle real, não complicado
          </h2>
          <p style={{
            textAlign: 'center', color: '#64748b', fontSize: 16,
            margin: '0 0 48px', lineHeight: 1.6,
          }}>
            Três coisas que você vai ter desde o primeiro dia
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)',
            gap: 20,
          }}>
            {[
              {
                icon:'📊', title:'Clareza financeira',
                desc:'Veja para onde vai cada centavo, organizado por categoria e mês. Sem planilha, sem confusão.',
                accent:'#1a56db', accentBg:'#eff6ff',
              },
              {
                icon:'🎯', title:'Plano que funciona',
                desc:'Monte um orçamento mensal e acompanhe em tempo real se está dentro do previsto.',
                accent:'#16a34a', accentBg:'#f0fdf4',
              },
              {
                icon:'📈', title:'Evolução visível',
                desc:'Compare o que planejou com o que aconteceu de verdade e ajuste o mês seguinte.',
                accent:'#7c3aed', accentBg:'#f5f3ff',
              },
            ].map(b => (
              <div
                key={b.title}
                className="benefit-card"
                style={{
                  background: '#fff', borderRadius: 14,
                  padding: '28px 24px',
                  border: '1px solid #e2e8f0',
                  borderLeft: `4px solid ${b.accent}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,.04)',
                }}
              >
                <div style={{
                  width: 60, height: 60, borderRadius: '50%',
                  background: b.accentBg, marginBottom: 20,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize: 28,
                }}>{b.icon}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>{b.title}</div>
                <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.65 }}>{b.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PARA QUEM É ── */}
      <div
        ref={s1}
        className="lp-fade"
        style={{
          padding: isMobile ? '72px 20px' : '96px 24px',
          background: 'linear-gradient(180deg, #f8faff 0%, #f8faff 100%)',
        }}
      >
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <h2 style={{
            textAlign: 'center', fontSize: isMobile ? 24 : 32,
            fontWeight: 700, color: '#0f172a', margin: '0 0 8px',
          }}>
            Para quem é o Compass One?
          </h2>
          <p style={{
            textAlign: 'center', color: '#64748b', fontSize: 16,
            margin: '0 0 48px',
          }}>
            Funciona para qualquer perfil financeiro
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              {
                icon:'💸', iconBg:'#fef2f2',
                title:'Quem vive no negativo',
                desc:'Você nunca sabe onde foi o dinheiro. Com o Compass, cada real tem nome e destino.',
                impact:'→ O Compass mostra o caminho de volta',
              },
              {
                icon:'🗂️', iconBg:'#eff6ff',
                title:'Quem quer se organizar',
                desc:'Você tem renda, mas falta controle. Registre entradas e saídas e veja a diferença em semanas.',
                impact:'→ Veja para onde vai cada real',
              },
              {
                icon:'🏦', iconBg:'#f0fdf4',
                title:'Quem quer construir reserva',
                desc:'Defina metas, acompanhe o que está economizando e chegue lá com mais segurança.',
                impact:'→ Acompanhe seu progresso mês a mês',
              },
            ].map(p => (
              <div key={p.title} style={{
                background: '#fff', borderRadius: 14, padding: '22px 24px',
                border: '1.5px solid #e2e8f0',
                display: 'flex', alignItems: 'flex-start', gap: 20,
              }}>
                <div style={{
                  width: 54, height: 54, borderRadius: 14, flexShrink: 0,
                  background: p.iconBg,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize: 26,
                }}>{p.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>{p.title}</div>
                  <div style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.65, marginBottom: 8 }}>{p.desc}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: AZUL }}>{p.impact}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── COMO FUNCIONA — Timeline ── */}
      <div
        ref={s2}
        className="lp-fade"
        style={{ padding: isMobile ? '72px 20px' : '96px 24px', background: '#fff' }}
      >
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <h2 style={{
            textAlign: 'center', fontSize: isMobile ? 24 : 32,
            fontWeight: 700, color: '#0f172a', margin: '0 0 8px',
          }}>
            Como funciona
          </h2>
          <p style={{
            textAlign: 'center', color: '#64748b', fontSize: 16,
            margin: '0 0 52px',
          }}>
            Três passos e você já está no controle
          </p>

          {/* Timeline container */}
          <div style={{ position: 'relative', paddingLeft: 28 }}>
            {/* Vertical line */}
            <div style={{
              position: 'absolute', left: 18, top: 20, bottom: 20,
              width: 2, background: '#e2e8f0', zIndex: 0,
            }}/>

            {[
              {
                n:'1', icon:'🏦', title:'Configure suas contas',
                desc:'Adicione seus bancos e cartões. Leva menos de dois minutos e não precisa de senha de banco.',
                dotBg:`linear-gradient(135deg,#1a56db,#2563eb)`,
              },
              {
                n:'2', icon:'🎯', title:'Monte seu plano mensal',
                desc:'Defina quanto pode gastar em cada categoria. O app te guia com perguntas simples.',
                dotBg:`linear-gradient(135deg,#16a34a,#22c55e)`,
              },
              {
                n:'3', icon:'📊', title:'Registre e acompanhe',
                desc:'Cada gasto que você registra aparece no painel. A bússola mostra se está no caminho certo.',
                dotBg:`linear-gradient(135deg,#7c3aed,#a855f7)`,
              },
            ].map((s, i, arr) => (
              <div key={s.n} style={{
                display: 'flex', alignItems: 'flex-start', gap: 24,
                position: 'relative', zIndex: 1,
                marginBottom: i < arr.length - 1 ? 40 : 0,
              }}>
                {/* Dot */}
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: s.dotBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20,
                  boxShadow: '0 4px 14px rgba(0,0,0,.18)',
                  marginLeft: -10,
                }}>{s.icon}</div>
                {/* Content */}
                <div style={{
                  flex: 1, background: '#fff', borderRadius: 14, padding: '18px 22px',
                  border: '1.5px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,.04)',
                  marginTop: 4,
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                    <span style={{
                      fontSize:10, fontWeight:700, color:'#94a3b8',
                      textTransform:'uppercase', letterSpacing:'.5px',
                    }}>Passo {s.n}</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>{s.title}</div>
                  <div style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.65 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PLANOS ── */}
      <div
        ref={sP}
        className="lp-fade"
        style={{ padding: isMobile ? '72px 20px' : '96px 24px', background: 'linear-gradient(180deg,#f8faff 0%,#f8faff 100%)' }}
      >
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <h2 style={{
            textAlign: 'center', fontSize: isMobile ? 24 : 32,
            fontWeight: 700, color: '#0f172a', margin: '0 0 8px',
          }}>
            Escolha seu plano
          </h2>
          <p style={{
            textAlign: 'center', color: '#64748b', fontSize: 16,
            margin: '0 0 48px',
          }}>
            Comece grátis. Evolua quando quiser.
          </p>

          <div className="plans-grid">
            {[
              {
                emoji: '🆓', name: 'Grátis', badge: 'DISPONÍVEL',
                badgeBg: '#dcfce7', badgeColor: '#166534',
                desc: 'Acesso completo a todas as funcionalidades. Sem limite de uso.',
                accent: '#16a34a', border: '2px solid #16a34a',
                headerBg: '#f0fdf4',
                features: [
                  'Todas as funcionalidades liberadas',
                  'Contas e cartões ilimitados',
                  'Dashboard com bússola',
                  'Lançamentos, planejamento, evolução',
                  'Categorias personalizadas',
                ],
                cta: 'Começar grátis →',
                ctaBg: '#16a34a', ctaColor: '#fff',
                disabled: false,
                opacity: 1,
              },
              {
                emoji: '🤖', name: 'Individual', badge: 'EM BREVE',
                badgeBg: '#fef9c3', badgeColor: '#854d0e',
                desc: 'Controle total com inteligência artificial.',
                accent: '#2563eb', border: '1.5px solid #e2e8f0',
                headerBg: '#eff6ff',
                features: [
                  'Agente Compass (IA)',
                  'Simulador de dívidas',
                  'Exportar PDF e Excel',
                  'Metas de poupança',
                  'Relatórios detalhados',
                ],
                cta: 'Em breve',
                ctaBg: '#e2e8f0', ctaColor: '#94a3b8',
                disabled: true,
                opacity: 0.85,
              },
              {
                emoji: '👨‍👩‍👧', name: 'Família', badge: 'EM BREVE',
                badgeBg: '#fef9c3', badgeColor: '#854d0e',
                desc: 'Finanças em conjunto com quem você ama.',
                accent: '#0ea5e9', border: '1.5px solid #e2e8f0',
                headerBg: '#f0f9ff',
                features: [
                  'Tudo do Individual',
                  'Até 5 perfis',
                  'Visão compartilhada',
                  'Metas familiares',
                  'Orçamento por pessoa',
                ],
                cta: 'Em breve',
                ctaBg: '#e2e8f0', ctaColor: '#94a3b8',
                disabled: true,
                opacity: 0.85,
              },
              {
                emoji: '💼', name: 'Negócio', badge: 'EM BREVE',
                badgeBg: '#fef9c3', badgeColor: '#854d0e',
                desc: 'Para MEI, autônomos e pequenos negócios.',
                accent: '#7c3aed', border: '1.5px solid #e2e8f0',
                headerBg: '#faf5ff',
                features: [
                  'Tudo do Individual',
                  'Separa pessoal × negócio',
                  'Fluxo de caixa',
                  'DRE simplificado',
                  'Relatórios para contador',
                ],
                cta: 'Em breve',
                ctaBg: '#e2e8f0', ctaColor: '#94a3b8',
                disabled: true,
                opacity: 0.85,
              },
              {
                emoji: '👑', name: 'VIP', badge: 'EM BREVE',
                badgeBg: '#fef9c3', badgeColor: '#854d0e',
                desc: 'Experiência premium com acompanhamento profissional.',
                accent: '#b45309', border: '1.5px solid #e2e8f0',
                headerBg: '#fffbeb',
                features: [
                  'Tudo dos planos anteriores',
                  'Reunião mensal com especialista',
                  'Análise personalizada do perfil',
                  'Suporte prioritário',
                  'Acesso antecipado a novidades',
                ],
                cta: 'Em breve',
                ctaBg: '#e2e8f0', ctaColor: '#94a3b8',
                disabled: true,
                opacity: 0.85,
              },
            ].map(plan => (
              <div key={plan.name} style={{
                background: '#fff', borderRadius: 20, overflow: 'hidden',
                border: plan.border,
                boxShadow: plan.disabled ? 'none' : '0 8px 32px rgba(22,163,74,.15)',
                opacity: plan.opacity,
                display: 'flex', flexDirection: 'column',
              }}>
                {/* Card header */}
                <div style={{ background: plan.headerBg, padding: '20px 20px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 28 }}>{plan.emoji}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '.5px',
                      textTransform: 'uppercase' as const,
                      background: plan.badgeBg, color: plan.badgeColor,
                      padding: '3px 8px', borderRadius: 20,
                    }}>{plan.badge}</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>{plan.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{plan.desc}</div>
                </div>

                {/* Features */}
                <div style={{ padding: '16px 20px', flex: 1 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 9 }}>
                      <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>✅</span>
                      <span style={{ fontSize: 12.5, color: '#374151', lineHeight: 1.45 }}>{f}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div style={{ padding: '0 20px 20px' }}>
                  <button
                    onClick={plan.disabled ? undefined : () => navigate('/cadastro')}
                    disabled={plan.disabled}
                    style={{
                      width: '100%', padding: '11px 0', borderRadius: 10, border: 'none',
                      background: plan.ctaBg, color: plan.ctaColor,
                      fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                      cursor: plan.disabled ? 'default' : 'pointer',
                    }}
                  >
                    {plan.cta}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer note */}
          <p style={{
            textAlign: 'center', color: '#94a3b8', fontSize: 12.5,
            marginTop: 28, lineHeight: 1.7,
          }}>
            Todos os planos incluem: dados criptografados · sem anúncios · cancele quando quiser
          </p>
        </div>
      </div>

      {/* ── GRÁTIS E SEGURO ── */}
      <div
        ref={s3}
        className="lp-fade"
        style={{
          padding: isMobile ? '72px 20px' : '96px 24px',
          background: 'linear-gradient(180deg, #f8faff 0%, #e8eeff 100%)',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>🔒</div>
          <h2 style={{ fontSize: isMobile ? 24 : 30, fontWeight: 700, color: '#0f172a', margin: '0 0 14px' }}>
            Grátis e seguro
          </h2>
          <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.7, margin: '0 0 28px' }}>
            Nenhum cartão de crédito necessário. Seus dados ficam criptografados<br/>
            e só você tem acesso às suas informações financeiras.
          </p>

          {/* Trust badges */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 10,
            justifyContent: 'center', marginBottom: 40,
          }}>
            {[
              '🔒 Criptografia',
              '🚫 Sem anúncios',
              '💳 Sem cartão de crédito',
            ].map(b => (
              <span key={b} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: '#fff', border: '1.5px solid #dde6fc',
                borderRadius: 20, padding: '8px 18px',
                fontSize: 13, color: AZUL, fontWeight: 600,
                boxShadow: '0 1px 4px rgba(0,0,0,.05)',
              }}>{b}</span>
            ))}
          </div>

          <button
            className="lp-cta-primary"
            onClick={() => navigate('/cadastro')}
            style={{
              background: `linear-gradient(135deg,${AZUL_ESCURO},${AZUL_MEDIO})`,
              color: '#fff', border: 'none', borderRadius: 14,
              padding: '16px 48px', fontSize: 17, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: `0 8px 28px rgba(26,86,219,.3)`,
              display: 'inline-block', marginBottom: 14,
            }}
          >
            Começar grátis →
          </button>
          <div>
            <button onClick={() => navigate('/login')} style={{
              border: 'none', background: 'transparent',
              color: '#94a3b8', fontSize: 14, cursor: 'pointer',
              fontFamily: 'inherit', textDecoration: 'underline',
            }}>
              Já tenho uma conta
            </button>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div
        ref={s4}
        className="lp-fade"
        style={{
          padding: '24px 20px',
          borderTop: '1px solid #e2e8f0',
          background: '#fafbff',
        }}
      >
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{
            textAlign: 'center', color: '#94a3b8', fontSize: 12.5,
            lineHeight: 1.7, marginBottom: 10,
          }}>
            © {ano} Compass One · Feito para brasileiros que querem ter controle da sua vida financeira.
          </p>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, flexWrap: 'wrap',
            color: '#94a3b8', fontSize: 12,
          }}>
            <button onClick={() => navigate('/termos')} style={{
              border:'none', background:'transparent', color:'#94a3b8',
              cursor:'pointer', fontFamily:'inherit', fontSize:12, textDecoration:'underline',
            }}>Termos</button>
            <span>·</span>
            <button onClick={() => navigate('/privacidade')} style={{
              border:'none', background:'transparent', color:'#94a3b8',
              cursor:'pointer', fontFamily:'inherit', fontSize:12, textDecoration:'underline',
            }}>Privacidade</button>
            <span>·</span>
            <a href="mailto:suporte@compassone.app" style={{
              color:'#94a3b8', fontSize:12, textDecoration:'underline',
            }}>Suporte</a>
          </div>
        </div>
      </div>
    </div>
  )
}
