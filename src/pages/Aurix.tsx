import { useState, useEffect } from 'react'
import AppHeader from '../components/AppHeader'
import PageHeader from '../components/PageHeader'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { COR } from '../utils/cores'
import {
  saldoAurix, totalAcumuladoAurix, calcularNivel,
  historicoAurix, acoesHoje,
  type AurixTransacao,
} from '../utils/aurix'

function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
}

const ABAS = ['Como ganhar', 'Conquistas', 'Indicar amigos', 'Resgatar', 'Histórico']

type UserPrefs = {
  streak_atual: number
  maior_streak: number
  ultimo_acesso_ativo: string | null
}

type AcaoDiaria = {
  ref: string
  descricao: string
  pontos: number
  limite: string
}

const ACOES_DIARIAS: AcaoDiaria[] = [
  { ref: 'acao_login',     descricao: 'Abrir o app',            pontos: 3, limite: '1× por dia' },
  { ref: 'acao_dashboard', descricao: 'Acessar o Início',       pontos: 2, limite: '1× por dia' },
  { ref: 'acao_lancamento',descricao: 'Registrar um lançamento', pontos: 5, limite: 'Máx 25/dia' },
  { ref: 'acao_north',     descricao: 'Consultar o North',       pontos: 3, limite: '1× por dia' },
  { ref: 'acao_evolucao',  descricao: 'Ver a Evolução',          pontos: 2, limite: '1× por dia' },
]

const ACOES_MENSAIS = [
  { descricao: 'Revisão mensal completa',     pontos: 100 },
  { descricao: 'Conferir saldo real do banco', pontos: 30  },
  { descricao: 'Registrar lição aprendida',    pontos: 20  },
  { descricao: 'Mês com resultado positivo',   pontos: 50  },
  { descricao: 'Usar o simulador',             pontos: 15  },
]

const FILTROS_HIST = [
  { value: 'todos',    label: 'Todos'      },
  { value: 'acao',     label: 'Ações'      },
  { value: 'conquista',label: 'Conquistas' },
  { value: 'indicacao',label: 'Indicações' },
  { value: 'bonus',    label: 'Bônus'      },
]

function fmtData(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

export default function Aurix() {
  const { user } = useApp()
  const isMobile = useIsMobile()
  const userId = user?.id ?? ''

  const [abaAtiva, setAbaAtiva] = useState(0)
  const [saldo, setSaldo] = useState(0)
  const [total, setTotal] = useState(0)
  const [prefs, setPrefs] = useState<UserPrefs>({ streak_atual: 0, maior_streak: 0, ultimo_acesso_ativo: null })
  const [acoesFeitas, setAcoesFeitas] = useState<string[]>([])
  const [historico, setHistorico] = useState<AurixTransacao[]>([])
  const [pagina, setPagina] = useState(0)
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [carregandoHist, setCarregandoHist] = useState(false)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!userId) return
    async function carregar() {
      setCarregando(true)
      const [s, t, feitas] = await Promise.all([
        saldoAurix(userId),
        totalAcumuladoAurix(userId),
        acoesHoje(userId),
      ])
      setSaldo(s)
      setTotal(t)
      setAcoesFeitas(feitas)

      const { data } = await supabase
        .from('user_preferences')
        .select('streak_atual, maior_streak, ultimo_acesso_ativo')
        .eq('user_id', userId)
        .single()
      if (data) setPrefs(data as UserPrefs)
      setCarregando(false)
    }
    carregar()
  }, [userId])

  useEffect(() => {
    if (!userId || abaAtiva !== 4) return
    carregarHistorico(0, filtroTipo)
  }, [abaAtiva, userId])

  async function carregarHistorico(p: number, tipo: string) {
    setCarregandoHist(true)
    const dados = await historicoAurix(userId, p, tipo)
    if (p === 0) setHistorico(dados)
    else setHistorico(prev => [...prev, ...dados])
    setPagina(p)
    setCarregandoHist(false)
  }

  function onFiltroChange(tipo: string) {
    setFiltroTipo(tipo)
    carregarHistorico(0, tipo)
  }

  const nivel = calcularNivel(total)
  const progressoNivel = nivel.proximo
    ? Math.min(100, ((total - nivel.minimo) / (nivel.maximo - nivel.minimo + 1)) * 100)
    : 100
  const acoesCompletadas = ACOES_DIARIAS.filter(a => acoesFeitas.includes(a.ref)).length
  const aurixHoje = ACOES_DIARIAS.filter(a => acoesFeitas.includes(a.ref)).reduce((s, a) => s + a.pontos, 0)

  if (carregando) return (
    <div style={{ minHeight: '100vh', background: COR.fundo, padding: isMobile ? '12px 12px 80px' : '20px 28px' }}>
      {isMobile && <AppHeader currentPath="/aurix" />}
      <div style={{ textAlign: 'center', paddingTop: 60, color: COR.textoSuave, fontSize: 14 }}>
        Carregando...
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: COR.fundo, padding: isMobile ? '12px 12px 80px' : '20px 28px' }}>
      {isMobile && <AppHeader currentPath="/aurix" />}

      <PageHeader
        icon="ti-sparkles"
        breadcrumb="CONTA"
        title="Programa Aurix"
        subtitle={`Nível: ${nivel.nome} ${nivel.icone}`}
      />

      {/* Card de resumo */}
      <div style={{
        background: COR.branco,
        borderRadius: 12,
        padding: isMobile ? '16px' : '20px 24px',
        marginBottom: 16,
        border: `1px solid ${COR.borda}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 20 }}>✨</span>
          <span style={{ fontSize: isMobile ? 22 : 26, fontWeight: 700, color: COR.texto }}>
            {saldo.toLocaleString('pt-BR')} Aurix disponíveis
          </span>
        </div>

        {/* Barra de progresso de nível */}
        {nivel.proximo && (
          <div style={{ marginBottom: 14 }}>
            <div style={{
              height: 8, borderRadius: 4, background: COR.bordaSuave, overflow: 'hidden', marginBottom: 6,
            }}>
              <div style={{
                height: '100%', borderRadius: 4,
                background: 'linear-gradient(90deg, #1a56db, #7c3aed)',
                width: `${progressoNivel}%`,
                transition: 'width 0.6s ease',
              }} />
            </div>
            <div style={{ fontSize: 12, color: COR.textoSuave }}>
              Faltam {nivel.faltam.toLocaleString('pt-BR')} Aurix para {nivel.proximo}
            </div>
          </div>
        )}

        {/* Streak e estatísticas */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
          gap: 10,
        }}>
          <div style={{
            background: COR.fundo, borderRadius: 8, padding: '10px 14px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 18, marginBottom: 2 }}>🔥</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: COR.texto }}>{prefs.streak_atual}</div>
            <div style={{ fontSize: 11, color: COR.textoSuave }}>dias de streak</div>
          </div>
          <div style={{
            background: COR.fundo, borderRadius: 8, padding: '10px 14px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 18, marginBottom: 2 }}>📅</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: COR.texto }}>{prefs.maior_streak}</div>
            <div style={{ fontSize: 11, color: COR.textoSuave }}>maior streak</div>
          </div>
          <div style={{
            background: COR.fundo, borderRadius: 8, padding: '10px 14px',
            textAlign: 'center',
            gridColumn: isMobile ? '1 / -1' : 'auto',
          }}>
            <div style={{ fontSize: 18, marginBottom: 2 }}>⚡</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: COR.texto }}>
              {acoesCompletadas}/{ACOES_DIARIAS.length}
            </div>
            <div style={{ fontSize: 11, color: COR.textoSuave }}>ações hoje (+{aurixHoje} Aurix)</div>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 16,
        overflowX: 'auto', paddingBottom: 4,
      }}>
        {ABAS.map((aba, i) => (
          <button
            key={aba}
            onClick={() => setAbaAtiva(i)}
            style={{
              padding: '8px 14px', borderRadius: 8,
              fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              whiteSpace: 'nowrap', flexShrink: 0,
              background: abaAtiva === i ? COR.azul : COR.branco,
              color: abaAtiva === i ? '#fff' : COR.textoSuave,
              transition: 'all 0.15s',
              boxShadow: abaAtiva === i ? '0 2px 8px rgba(26,86,219,0.25)' : 'none',
              border: abaAtiva === i ? 'none' : `1px solid ${COR.borda}`,
            }}
          >
            {aba}
          </button>
        ))}
      </div>

      {/* Aba: Como ganhar */}
      {abaAtiva === 0 && (
        <div>
          {/* Progresso diário */}
          <div style={{
            background: COR.branco, borderRadius: 12, padding: '16px 20px',
            marginBottom: 12, border: `1px solid ${COR.borda}`,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: COR.texto, marginBottom: 10 }}>
              Diário
            </div>
            <div style={{ height: 6, borderRadius: 3, background: COR.bordaSuave, marginBottom: 10, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                background: 'linear-gradient(90deg, #16a34a, #22c55e)',
                width: `${(acoesCompletadas / ACOES_DIARIAS.length) * 100}%`,
                transition: 'width 0.4s ease',
              }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ACOES_DIARIAS.map(acao => {
                const feita = acoesFeitas.includes(acao.ref)
                return (
                  <div key={acao.ref} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 8,
                    background: feita ? '#f0fdf4' : COR.fundo,
                    border: `1px solid ${feita ? '#86efac' : COR.borda}`,
                  }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{feita ? '✅' : '○'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: feita ? '#15803d' : COR.texto }}>
                        {acao.descricao}
                      </div>
                      <div style={{ fontSize: 11, color: COR.textoMuted }}>{acao.limite}</div>
                    </div>
                    <div style={{
                      fontSize: 12, fontWeight: 700,
                      color: feita ? '#16a34a' : COR.azul,
                    }}>
                      +{acao.pontos}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Semanal */}
          <div style={{
            background: COR.branco, borderRadius: 12, padding: '16px 20px',
            marginBottom: 12, border: `1px solid ${COR.borda}`,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: COR.texto, marginBottom: 10 }}>
              Semanal
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { descricao: 'Streak de 7 dias consecutivos', pontos: 50, info: 'bônus automático' },
                { descricao: 'Lançar em todas as contas na semana', pontos: 20, info: 'verificado diariamente' },
              ].map(a => (
                <div key={a.descricao} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 8,
                  background: COR.fundo, border: `1px solid ${COR.borda}`,
                }}>
                  <span style={{ fontSize: 16 }}>○</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: COR.texto }}>{a.descricao}</div>
                    <div style={{ fontSize: 11, color: COR.textoMuted }}>{a.info}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: COR.azul }}>+{a.pontos}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Mensal */}
          <div style={{
            background: COR.branco, borderRadius: 12, padding: '16px 20px',
            border: `1px solid ${COR.borda}`,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: COR.texto, marginBottom: 10 }}>
              Mensal
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ACOES_MENSAIS.map(a => (
                <div key={a.descricao} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 8,
                  background: COR.fundo, border: `1px solid ${COR.borda}`,
                }}>
                  <span style={{ fontSize: 16 }}>○</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: COR.texto }}>{a.descricao}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: COR.azul }}>+{a.pontos}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Aba: Conquistas (stub) */}
      {abaAtiva === 1 && (
        <div style={{
          background: COR.branco, borderRadius: 12, padding: '32px 24px',
          border: `1px solid ${COR.borda}`, textAlign: 'center',
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🏆</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: COR.texto, marginBottom: 6 }}>
            Conquistas — em breve
          </div>
          <div style={{ fontSize: 13, color: COR.textoSuave }}>
            Continue usando o app e desbloqueie badges exclusivos!
          </div>
        </div>
      )}

      {/* Aba: Indicar amigos (stub) */}
      {abaAtiva === 2 && (
        <div style={{
          background: COR.branco, borderRadius: 12, padding: '32px 24px',
          border: `1px solid ${COR.borda}`, textAlign: 'center',
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🌟</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: COR.texto, marginBottom: 6 }}>
            Indicações — em breve
          </div>
          <div style={{ fontSize: 13, color: COR.textoSuave }}>
            Em breve você poderá convidar amigos e ganhar Aurix por isso!
          </div>
        </div>
      )}

      {/* Aba: Resgatar (stub) */}
      {abaAtiva === 3 && (
        <div style={{
          background: COR.branco, borderRadius: 12, padding: '32px 24px',
          border: `1px solid ${COR.borda}`, textAlign: 'center',
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🎁</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: COR.texto, marginBottom: 6 }}>
            Em breve você poderá trocar seus Aurix por recompensas exclusivas!
          </div>
          <div style={{ fontSize: 13, color: COR.textoSuave }}>
            Seus pontos estão sendo acumulados e estarão disponíveis quando o catálogo abrir.
          </div>
        </div>
      )}

      {/* Aba: Histórico */}
      {abaAtiva === 4 && (
        <div>
          {/* Filtros */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {FILTROS_HIST.map(f => (
              <button
                key={f.value}
                onClick={() => onFiltroChange(f.value)}
                style={{
                  padding: '5px 12px', borderRadius: 20,
                  fontFamily: 'inherit', fontSize: 11, fontWeight: 500, cursor: 'pointer',
                  background: filtroTipo === f.value ? COR.azul : COR.branco,
                  color: filtroTipo === f.value ? '#fff' : COR.textoSuave,
                  border: filtroTipo === f.value ? 'none' : `1px solid ${COR.borda}`,
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Lista */}
          <div style={{
            background: COR.branco, borderRadius: 12, border: `1px solid ${COR.borda}`,
            overflow: 'hidden',
          }}>
            {historico.length === 0 && !carregandoHist && (
              <div style={{ padding: 32, textAlign: 'center', color: COR.textoSuave, fontSize: 13 }}>
                Nenhum registro encontrado.
              </div>
            )}
            {historico.map((t, i) => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px',
                borderBottom: i < historico.length - 1 ? `1px solid ${COR.bordaSuave}` : 'none',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: COR.texto, marginBottom: 1 }}>
                    {t.descricao}
                  </div>
                  <div style={{ fontSize: 11, color: COR.textoMuted }}>
                    {fmtData(t.created_at)} · {t.tipo}
                  </div>
                </div>
                <div style={{
                  fontSize: 14, fontWeight: 700, flexShrink: 0,
                  color: t.pontos > 0 ? COR.verde : COR.vermelho,
                }}>
                  {t.pontos > 0 ? '+' : ''}{t.pontos}
                </div>
              </div>
            ))}
            {carregandoHist && (
              <div style={{ padding: 16, textAlign: 'center', color: COR.textoSuave, fontSize: 13 }}>
                Carregando...
              </div>
            )}
          </div>

          {historico.length > 0 && historico.length === (pagina + 1) * 20 && (
            <button
              onClick={() => carregarHistorico(pagina + 1, filtroTipo)}
              disabled={carregandoHist}
              style={{
                display: 'block', width: '100%', marginTop: 10,
                padding: '10px', border: `1px solid ${COR.borda}`,
                borderRadius: 8, background: COR.branco,
                color: COR.azul, fontSize: 13, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Carregar mais
            </button>
          )}
        </div>
      )}
    </div>
  )
}
