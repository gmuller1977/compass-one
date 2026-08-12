import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import AppHeader from '../components/AppHeader'
import PageHeader, { PH_BTN_SOLID } from '../components/PageHeader'
import TutorialCard from '../components/TutorialCard'
import { COR } from '../utils/cores'

type SimAtivaRow = {
  id: string
  tipo: 'divida' | 'meta'
  nome: string
  valor_total: number
  parcela: number
  resultado_meses: number
  data_conclusao: string
  integrado_planejamento: boolean
  created_at: string
}

function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
}


const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function mesKey(conta: string, ano: number, mes: number) {
  return `${conta}-${ano}-${String(mes + 1).padStart(2, '0')}`
}

type CompassStatus = 'verde' | 'amarelo' | 'vermelho' | 'sem-plano' | 'sem-dados'

const COMPASS_CFG: Record<CompassStatus, {
  bg: string; border: string; cor: string; icon: string; title: string; msg: (s: number, e: number) => string
}> = {
  verde:     { bg: '#f0fdf4', border: '#86efac', cor: '#16a34a', icon: '🧭', title: 'Você está no caminho certo!',          msg: (s) => `No caminho certo. Resultado positivo de +${fmt(s)} este mês.` },
  amarelo:   { bg: '#fffbeb', border: '#fde68a', cor: '#d97706', icon: '⚠️', title: 'Atenção!',                             msg: () => 'Atenção. Suas despesas estão perto do limite planejado para este mês.' },
  vermelho:  { bg: '#fff1f2', border: '#fecdd3', cor: '#dc2626', icon: '🔴', title: 'Fora do rumo.',                        msg: (_s, e) => `Acima do planejado. Despesas ultrapassaram o previsto em ${fmt(e)}.` },
  'sem-plano': { bg: '#f0f4ff', border: '#c7d7fd', cor: '#1a56db', icon: '🧭', title: 'Sem planejamento ainda',             msg: () => 'Crie seu planejamento para ativar a bússola e acompanhar seu progresso.' },
  'sem-dados': { bg: COR.fundo,  border: COR.borda,  cor: COR.textoSuave, icon: '📊', title: 'Sem movimentação',           msg: () => 'Sem movimentação este mês. Registre sua primeira despesa ou receita para ativar a bússola.' },
}

export default function Dashboard() {
  const navigate  = useNavigate()
  const isMobile  = useIsMobile()
  const { contas, categorias, extratoData, planos, perfil, user, objetivoUsuario } = useApp()

  const hoje = new Date()
  const [viewMes, setViewMes] = useState(hoje.getMonth())
  const [viewAno, setViewAno] = useState(hoje.getFullYear())

  const nome = perfil.apelido || perfil.nome.split(' ')[0] || user?.email?.split('@')[0] || 'Usuário'

  function prevMes() {
    if (viewMes === 0) { setViewMes(11); setViewAno(a => a - 1) }
    else setViewMes(m => m - 1)
  }
  function nextMes() {
    const now = new Date()
    if (viewAno > now.getFullYear() || (viewAno === now.getFullYear() && viewMes >= now.getMonth())) return
    if (viewMes === 11) { setViewMes(0); setViewAno(a => a + 1) }
    else setViewMes(m => m + 1)
  }
  const isCurrent = viewMes === hoje.getMonth() && viewAno === hoje.getFullYear()
  const isAtMax   = isCurrent

  // ── Cálculos do mês ──────────────────────────────────────────────────
  const { totalEntradas, totalSaidas, saldoDisponivel, topCategorias, ultimosLanc } = useMemo(() => {
    let te = 0, ts = 0
    const gastoPorCat: Record<string, number> = {}

    contas.forEach(conta => {
      const dados = extratoData[mesKey(conta.id, viewAno, viewMes)]
      if (!dados) return
      Object.values(dados.lancamentos).flat().forEach(l => {
        if (l.tipo === 'entrada') te += l.valor
        else { ts += l.valor; gastoPorCat[l.categoria] = (gastoPorCat[l.categoria] ?? 0) + l.valor }
      })
    })

    const saldoIni = contas
      .filter(c => c.tipo === 'corrente' || c.tipo === 'poupanca')
      .reduce((s, c) => s + c.saldoInicial, 0)

    const topCategorias = Object.entries(gastoPorCat)
      .sort((a, b) => b[1] - a[1]).slice(0, 4)
      .map(([nome, gasto]) => {
        const cat = categorias.find(c => c.nome === nome)
        return { nome, gasto, cor: cat?.cor ?? COR.azul, icone: cat?.icone ?? '📌' }
      })

    const todos: Array<{ descricao: string; categoria: string; valor: number; tipo: string; data: number }> = []
    contas.forEach(conta => {
      const dados = extratoData[mesKey(conta.id, viewAno, viewMes)]
      if (!dados) return
      Object.entries(dados.lancamentos).forEach(([dia, ls]) =>
        ls.forEach(l => todos.push({ ...l, data: parseInt(dia) }))
      )
    })

    return {
      totalEntradas: te,
      totalSaidas:   ts,
      saldoDisponivel: saldoIni + te - ts,
      topCategorias,
      ultimosLanc: todos.sort((a, b) => b.data - a.data).slice(0, 5),
    }
  }, [contas, categorias, extratoData, viewMes, viewAno])

  const totalPrevS = useMemo(() => {
    const p = planos[viewAno]
    if (!p) return 0
    return (p.saidas ?? []).reduce((s, c) => s + (c.v[viewMes] ?? 0), 0)
  }, [planos, viewAno, viewMes])

  const temPlano = useMemo(() => {
    const p = planos[viewAno]
    if (!p) return false
    return (p.saidas ?? []).some(c => c.v.some(v => v > 0)) ||
           (p.entradas ?? []).some(c => c.v.some(v => v > 0))
  }, [planos, viewAno])

  const temBanco      = contas.some(c => c.tipo === 'corrente' || c.tipo === 'poupanca')
  const temCategorias = categorias.some(c => c.ativa)

  // ── Bússola ──────────────────────────────────────────────────────────
  const { compassStatus, sobrou, excedeu } = useMemo<{
    compassStatus: CompassStatus; sobrou: number; excedeu: number
  }>(() => {
    if (totalEntradas === 0 && totalSaidas === 0)
      return { compassStatus: 'sem-dados', sobrou: 0, excedeu: 0 }
    if (!temPlano || totalPrevS === 0)
      return { compassStatus: 'sem-plano', sobrou: 0, excedeu: 0 }
    const perc = totalSaidas / totalPrevS
    if (totalSaidas > totalPrevS)
      return { compassStatus: 'vermelho', sobrou: 0, excedeu: totalSaidas - totalPrevS }
    if (perc >= 0.9)
      return { compassStatus: 'amarelo', sobrou: 0, excedeu: 0 }
    return { compassStatus: 'verde', sobrou: totalEntradas - totalSaidas, excedeu: 0 }
  }, [totalEntradas, totalSaidas, temPlano, totalPrevS])

  const percGastei = totalPrevS > 0 ? Math.round((totalSaidas / totalPrevS) * 100) : null

  const dica = useMemo(() => {
    if (topCategorias.length === 0)
      return 'Registre seus primeiros gastos para ver insights personalizados.'
    const top = topCategorias[0]
    if (percGastei !== null)
      return `Você usou ${percGastei}% do orçamento este mês. Maior despesa: ${top.nome} (${fmt(top.gasto)}).`
    return `Maior gasto deste mês: ${top.nome} — ${fmt(top.gasto)}.`
  }, [topCategorias, percGastei])

  const cc = COMPASS_CFG[compassStatus]
  const maxGasto = topCategorias[0]?.gasto || 1

  // ── Simulações ativas ─────────────────────────────────────────────────
  const [simAtivas, setSimAtivas] = useState<SimAtivaRow[]>([])

  useEffect(() => {
    if (!user) return
    supabase.from('simulacoes').select('*').eq('ativo', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setSimAtivas(data as SimAtivaRow[]) })
  }, [user])

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', background: COR.fundo,
      fontFamily: "-apple-system,'Inter',sans-serif",
    }}>
      {/* Mobile top bar */}
      <AppHeader currentPath="/dashboard" />

      <div style={{ maxWidth: 860, margin: '0 auto', padding: isMobile ? '16px 14px 80px' : '28px 28px 40px' }}>

        {/* ── PageHeader ── */}
        <PageHeader
          icon="ti-layout-dashboard"
          title={`Olá, ${nome}`}
          subtitle={`${MESES_FULL[viewMes]} ${viewAno}`}
          rightContent={
            <>
              <div style={{
                display: 'flex', alignItems: 'center',
                background: 'rgba(255,255,255,0.12)', borderRadius: 8, overflow: 'hidden',
              }}>
                <button onClick={prevMes} style={{
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  padding: '5px 9px', color: '#fff', fontSize: 11, lineHeight: 1,
                }}>◀</button>
                <span style={{
                  fontSize: 12, fontWeight: 500, color: '#fff',
                  padding: '5px 8px',
                  borderLeft: '1px solid rgba(255,255,255,0.2)',
                  borderRight: '1px solid rgba(255,255,255,0.2)',
                  minWidth: isMobile ? 56 : 80, textAlign: 'center',
                }}>{MESES_FULL[viewMes].slice(0, isMobile ? 3 : 9)} {viewAno}</span>
                <button onClick={nextMes} style={{
                  border: 'none', background: 'transparent',
                  cursor: isAtMax ? 'not-allowed' : 'pointer',
                  padding: '5px 9px', color: isAtMax ? 'rgba(255,255,255,0.3)' : '#fff',
                  fontSize: 11, lineHeight: 1,
                }}>▶</button>
              </div>
              <button onClick={() => navigate('/novo-lancamento')} style={PH_BTN_SOLID}>
                + Lançar
              </button>
            </>
          }
        />

        {/* ── Banners de setup ── */}
        {(!temBanco || !temCategorias) && (
          <div style={{
            background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12,
            padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12,
            marginBottom: 16,
          }}>
            <span style={{ fontSize: 16 }}>🧭</span>
            <span style={{ flex: 1, fontSize: 13, color: '#1e40af', fontWeight: 500 }}>
              Configure suas contas e categorias para uma visão completa
            </span>
            <button onClick={() => navigate('/configuracoes')} style={{
              background: COR.azul, color: '#fff', border: 'none', borderRadius: 8,
              padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}>Configurar →</button>
          </div>
        )}
        {temBanco && temCategorias && !temPlano && (
          <div style={{
            background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12,
            padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12,
            marginBottom: 16,
          }}>
            <span style={{ fontSize: 16 }}>📋</span>
            <span style={{ flex: 1, fontSize: 13, color: '#92400e', fontWeight: 500 }}>
              Complete seu planejamento para ter uma visão completa
            </span>
            <button onClick={() => navigate('/planejamento', { state: { openQuiz: true } })} style={{
              background: '#d97706', color: '#fff', border: 'none', borderRadius: 8,
              padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}>Começar →</button>
          </div>
        )}

        {/* ── Tutorial primeira visita ── */}
        <TutorialCard
          tela="inicio"
          icon="🧭"
          title="Seu painel de comando"
          description="Aqui você vê o resumo da sua vida financeira. A bússola te mostra se está no caminho certo — tudo de forma simples e visual."
          tips={[
            { icon: '💳', text: 'Os cards mostram quanto você tem, ganhou e gastou' },
            { icon: '🧭', text: 'A bússola muda de cor conforme sua situação financeira' },
            { icon: '📊', text: 'Abaixo você vê seus maiores gastos e últimos lançamentos' },
          ]}
          buttonLabel="Ver meu painel →"
        />

        {/* ── Bússola hero ── */}
        <div style={{
          background: cc.bg, border: `1.5px solid ${cc.border}`, borderRadius: 14,
          padding: isMobile ? '14px 16px' : '18px 22px',
          display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20,
        }}>
          <div style={{
            width: isMobile ? 44 : 52, height: isMobile ? 44 : 52, borderRadius: 14, flexShrink: 0,
            background: cc.bg, border: `2px solid ${cc.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: isMobile ? 22 : 26,
          }}>{cc.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: isMobile ? 14 : 15, fontWeight: 700, color: cc.cor, marginBottom: 4,
            }}>{cc.title}</div>
            <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
              {cc.msg(sobrou, excedeu)}
            </div>
            {objetivoUsuario && (
              <div style={{ marginTop: 8, fontSize: 12, color: cc.cor, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span>🎯 Seu objetivo: {
                  objetivoUsuario === 'controlar' ? 'Controlar meus gastos' :
                  objetivoUsuario === 'economizar' ? 'Economizar e poupar' :
                  objetivoUsuario === 'sonho' ? 'Realizar um sonho' :
                  objetivoUsuario === 'dividas' ? 'Sair das dívidas' : objetivoUsuario
                }</span>
                {objetivoUsuario === 'dividas' && (
                  <button onClick={() => navigate('/simulacao')} style={{
                    background: 'transparent', border: `1px solid ${cc.cor}`, color: cc.cor,
                    borderRadius: 6, padding: '2px 8px', fontSize: 11, cursor: 'pointer',
                    fontFamily: 'inherit', fontWeight: 600,
                  }}>Usar simulador →</button>
                )}
              </div>
            )}
          </div>
          {compassStatus === 'sem-plano' && (
            <button
              onClick={() => navigate('/planejamento', { state: { openQuiz: true } })}
              style={{
                background: COR.azul, color: '#fff', border: 'none', borderRadius: 10,
                padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >Começar →</button>
          )}
        </div>

        {/* ── KPI cards ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: 12, marginBottom: 20,
        }}>
          {[
            {
              label: 'Meu saldo',
              hint:  'Saldo de todas as contas',
              valor: saldoDisponivel,
              cor:   saldoDisponivel < 0 ? COR.vermelho : COR.azul,
              icone: '◎',
            },
            {
              label: 'Receitas do mês',
              hint:  'Salário + extras',
              valor: totalEntradas,
              cor:   COR.verde,
              icone: '↑',
            },
            {
              label: 'Despesas do mês',
              hint:  percGastei !== null ? `${percGastei}% do planejado` : 'Gastos do mês',
              valor: totalSaidas,
              cor:   COR.vermelho,
              icone: '↓',
            },
          ].map(card => (
            <div key={card.label} style={{
              background: COR.branco, borderRadius: 12,
              padding: '18px 20px', border: `.5px solid ${COR.borda}`,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
              }}>
                <span style={{ fontSize: 12, color: COR.textoMuted, fontWeight: 500 }}>{card.label}</span>
                <span style={{ fontSize: 15, color: card.cor, opacity: .65 }}>{card.icone}</span>
              </div>
              <div style={{
                fontSize: isMobile ? 20 : 24, fontWeight: 700, color: card.cor,
                fontFamily: 'Georgia, serif', letterSpacing: '-.5px',
                fontVariantNumeric: 'tabular-nums', marginBottom: 6,
              }}>{fmt(card.valor)}</div>
              <div style={{ fontSize: 11, color: '#b0b8c4' }}>{card.hint}</div>
            </div>
          ))}
        </div>

        {/* ── Minhas metas e dívidas ── */}
        {simAtivas.length > 0 && (() => {
          return (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COR.texto }}>Minhas metas e dívidas</div>
              <button onClick={() => navigate('/simulacao')} style={{
                border: 'none', background: 'transparent', color: COR.azul,
                fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
              }}>Ver todas →</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {simAtivas.slice(0, 4).map(sim => {
                const isDivida = sim.tipo === 'divida'
                const inicio = new Date(sim.created_at)
                const mesesPassados = (hoje.getFullYear() - inicio.getFullYear()) * 12 + (hoje.getMonth() - inicio.getMonth())
                const progresso = Math.max(0, Math.min(100, Math.round((mesesPassados / sim.resultado_meses) * 100)))
                return (
                  <div key={sim.id} style={{
                    background: COR.branco, border: `.5px solid ${COR.borda}`,
                    borderRadius: 12, padding: '14px 16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 20 }}>{isDivida ? '💳' : '🐷'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: COR.texto, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sim.nome}
                        </div>
                        <div style={{ fontSize: 11, color: COR.textoMuted }}>
                          {fmt(sim.valor_total)} · {fmt(sim.parcela)}/mês
                        </div>
                      </div>
                    </div>
                    <div style={{ height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                      <div style={{ height: 5, borderRadius: 3, background: isDivida ? COR.vermelho : COR.verde, width: `${progresso}%`, transition: 'width .4s' }}/>
                    </div>
                    <div style={{ fontSize: 11, color: COR.textoMuted, display: 'flex', justifyContent: 'space-between' }}>
                      <span>{progresso}% {isDivida ? 'quitado' : 'poupado'}</span>
                      <span>{isDivida ? 'Quitada' : 'Alcançada'} em {sim.data_conclusao}</span>
                    </div>
                    {sim.integrado_planejamento && (
                      <div style={{ fontSize: 10, fontWeight: 600, color: COR.azul, marginTop: 5 }}>✓ No planejamento</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          )
        })()}

        {/* ── 2-col grid ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: 14, alignItems: 'start',
        }}>

          {/* Esquerda: Onde mais gastei + Dica */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{
              background: COR.branco, borderRadius: 12,
              padding: '18px 20px', border: `.5px solid ${COR.borda}`,
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: COR.texto, marginBottom: 18 }}>
                Maiores despesas
              </div>
              {topCategorias.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
                  <div style={{ color: COR.textoMuted, fontSize: 13, marginBottom: 12 }}>
                    Nenhum gasto registrado
                  </div>
                  <button onClick={() => navigate('/novo-lancamento')} style={{
                    padding: '7px 14px', border: 'none', borderRadius: 8,
                    background: COR.azul, color: '#fff', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>Registrar gasto</button>
                </div>
              ) : topCategorias.map(cat => (
                <div key={cat.nome} style={{ marginBottom: 16 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{cat.icone}</span>
                      <span style={{ fontSize: 13, color: COR.texto, fontWeight: 500 }}>{cat.nome}</span>
                    </div>
                    <span style={{
                      fontSize: 13, color: COR.vermelho, fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                    }}>{fmt(cat.gasto)}</span>
                  </div>
                  <div style={{ height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: 4, borderRadius: 2, background: cat.cor,
                      width: `${Math.min((cat.gasto / maxGasto) * 100, 100)}%`,
                      transition: 'width .4s ease',
                    }}/>
                  </div>
                </div>
              ))}
            </div>

            {/* Dica contextual */}
            <div style={{
              background: '#fffbeb', borderRadius: 12,
              padding: '14px 16px', border: '.5px solid #fde68a',
              display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>💡</span>
              <p style={{ fontSize: 12, color: '#92400e', lineHeight: 1.7, margin: 0 }}>{dica}</p>
            </div>
          </div>

          {/* Direita: Últimos lançamentos */}
          <div style={{
            background: COR.branco, borderRadius: 12,
            padding: '18px 20px', border: `.5px solid ${COR.borda}`,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18,
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: COR.texto }}>Últimas movimentações</div>
              <button onClick={() => navigate('/novo-lancamento')} style={{
                border: 'none', background: 'transparent', color: COR.azul,
                fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
              }}>Ver tudo</button>
            </div>
            {ultimosLanc.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0 16px' }}>
                <div style={{ fontSize: 30, marginBottom: 10 }}>📋</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: COR.texto, marginBottom: 5 }}>
                  Nenhum lançamento este mês
                </div>
                <div style={{ fontSize: 12, color: COR.textoMuted, lineHeight: 1.55, marginBottom: 14 }}>
                  Registre seus gastos e receitas para ver<br/>o histórico aqui.
                </div>
                <button onClick={() => navigate('/novo-lancamento')} style={{
                  padding: '7px 18px', border: 'none', borderRadius: 8,
                  background: COR.azul, color: '#fff',
                  fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>Registrar →</button>
              </div>
            ) : ultimosLanc.map((l, i) => {
              const cat = categorias.find(c => c.nome === l.categoria)
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  paddingBottom: i < ultimosLanc.length - 1 ? 13 : 0,
                  marginBottom: i < ultimosLanc.length - 1 ? 13 : 0,
                  borderBottom: i < ultimosLanc.length - 1 ? `1px solid #f1f5f9` : 'none',
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: l.tipo === 'entrada' ? COR.verde : COR.vermelho,
                  }}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 500, color: COR.texto,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {(l.descricao && l.descricao.trim()) ? l.descricao : l.categoria}
                    </div>
                    <div style={{ fontSize: 11, color: COR.textoMuted, marginTop: 1 }}>
                      {cat?.icone ?? ''} {l.categoria} · dia {l.data}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 13, fontWeight: 600, flexShrink: 0,
                    fontVariantNumeric: 'tabular-nums',
                    color: l.tipo === 'entrada' ? COR.verde : COR.vermelho,
                  }}>
                    {l.tipo === 'entrada' ? '+' : '−'}{fmt(l.valor)}
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </div>

      {/* FAB mobile */}
      {isMobile && (
        <button
          onClick={() => navigate('/novo-lancamento')}
          style={{
            position: 'fixed', bottom: 76, right: 20,
            width: 52, height: 52, borderRadius: '50%', border: 'none',
            background: 'linear-gradient(135deg,#1a56db,#2563eb)',
            color: '#fff', fontSize: 26, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(26,86,219,.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >+</button>
      )}
    </div>
  )
}
