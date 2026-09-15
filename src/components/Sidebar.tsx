import { useState, useEffect, createContext, useContext } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { saldoAurix } from '../utils/aurix'

export const SIDEBAR_W = 220
/** Recolhida: só os ícones, com o nome no `title`. */
export const SIDEBAR_W_MIN = 64

/**
 * O menu recolhido é preferência de APARELHO, não do usuário no banco.
 *
 * Mora no `localStorage` pela mesma razão do modal da descoberta: quem usa
 * num monitor largo e num notebook quer coisas diferentes nos dois, e uma
 * coluna no banco imporia a mesma escolha aos dois. Ler falha em aba anônima,
 * então tudo vem embrulhado em try/catch e o padrão é aberto.
 */
const CHAVE_RECOLHIDA = 'compass:menu-recolhido'

export function lerRecolhida(): boolean {
  try { return localStorage.getItem(CHAVE_RECOLHIDA) === '1' } catch { return false }
}
export function gravarRecolhida(v: boolean) {
  try { localStorage.setItem(CHAVE_RECOLHIDA, v ? '1' : '0') } catch { /* aba anônima */ }
}

/**
 * Recolhida chega aos filhos por contexto, e não por prop.
 *
 * `NavItemRow` e `SubItemRow` são chamados em dez lugares, alguns dentro de
 * ramos especiais como o de Lançamentos. Passar prop obrigaria a tocar os dez
 * e deixaria um esquecido — que renderizaria o rótulo por cima do ícone sem
 * nenhum erro de tipo.
 */
const RecolhidaCtx = createContext(false)

type SubLeaf    = { label: string; path: string }
type SubDivider = { divider: string }
type SubItem    = SubLeaf | SubDivider

type NavItem = {
  icon: string
  label: string
  path: string
  exact: boolean
  sub?: SubItem[]
  badge?: string
  disabled?: boolean
  excludeIfSearch?: string
}

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: '📅 Todo dia',
    items: [
      { icon: '🏠', label: 'Início',      path: '/dashboard',       exact: true  },
      { icon: '📋', label: 'Lançamentos', path: '/novo-lancamento', exact: false },
      { icon: '📈', label: 'Radar financeiro', path: '/radar',         exact: false },
    ],
  },
  {
    label: '📆 Todo mês',
    items: [
      { icon: '📊', label: 'Resumo mensal',  path: '/resumo-mensal', exact: false },
      { icon: '🔄', label: 'Revisão mensal', path: '/revisaomensal', exact: false },
      { icon: '🔮', label: 'Simulador',      path: '/simulacao',     exact: false },
    ],
  },
  {
    label: '🗓️ Todo ano',
    items: [
      {
        icon: '🎯', label: 'Planejamento', path: '/planejamento', exact: false,
        sub: [
          { label: 'Grade',      path: '/planejamento?modo=grade'    },
          { label: 'Painel',     path: '/planejamento?modo=painel'   },
          { label: 'Lista',      path: '/planejamento?modo=lista'    },
          // Por ultimo de proposito: sobrescreve o plano do ano inteiro.
          { divider: 'Recomeçar' },
          { label: 'Planejamento do Zero', path: '/wizard-planejamento'    },
        ],
      },
    ],
  },
  {
    label: '👤 Minha conta',
    items: [
      {
        icon: '⚙️', label: 'Configurações', path: '/configuracoes', exact: false,
        sub: [
          { label: 'Minhas Contas', path: '/configuracoes?aba=bancos'      },
          { label: 'Cartões',      path: '/configuracoes?aba=cartoes'      },
          { label: 'Categorias',   path: '/configuracoes?aba=categorias'   },
          { label: 'Grupos',       path: '/configuracoes?aba=grupos'       },
          { label: 'Perfil',       path: '/configuracoes?aba=perfil'       },
          { label: 'Preferências', path: '/configuracoes?aba=preferencias' },
        ],
      },
      { icon: '✨', label: 'Aurix', path: '/aurix', exact: false },
    ],
  },
]

function CompassIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="1.5"/>
      <polygon points="10,3 11.2,9.4 10,8.5 8.8,9.4" fill="white"/>
      <polygon points="10,17 8.8,10.6 10,11.5 11.2,10.6" fill="white" opacity=".5"/>
    </svg>
  )
}

function NavItemRow({
  icon, label, active, isSair = false, badge, disabled, onClick,
}: {
  icon: string; label: string; active: boolean
  isSair?: boolean
  badge?: string; disabled?: boolean; onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const recolhida = useContext(RecolhidaCtx)
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      // Recolhido, o nome vira `title`: sem ele o menu fica só de ícones e a
      // navegação passa a depender de adivinhação.
      title={recolhida ? label : undefined}
      aria-label={recolhida ? label : undefined}
      style={{
        display: 'flex', alignItems: 'center',
        gap: recolhida ? 0 : 9,
        justifyContent: recolhida ? 'center' : 'flex-start',
        width: '100%', padding: recolhida ? '9px 0' : '8px 10px', marginBottom: 1,
        border: 'none', borderRadius: 10,
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: 'inherit', textAlign: 'left',
        background: active
          ? '#ffffff'
          : hovered
            ? 'rgba(255,255,255,0.08)'
            : 'transparent',
        color: isSair
          ? (hovered ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)')
          : active
            ? '#1a56db'
            : disabled
              ? 'rgba(255,255,255,0.3)'
              : 'rgba(255,255,255,0.65)',
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        boxShadow: active ? '0 2px 8px rgba(0,0,0,.15)' : 'none',
        transition: 'background .12s, color .12s, box-shadow .12s',
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <span style={{ fontSize: recolhida ? 17 : 15, width: 18, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      {!recolhida && <span style={{ flex: 1 }}>{label}</span>}
      {!recolhida && badge && (
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '.4px',
          padding: '2px 5px', borderRadius: 6,
          background: active ? 'rgba(26,86,219,.12)' : 'rgba(255,255,255,0.12)',
          color: active ? '#1a56db' : 'rgba(255,255,255,0.5)',
          border: `1px solid ${active ? 'rgba(26,86,219,.2)' : 'rgba(255,255,255,0.15)'}`,
          flexShrink: 0, textTransform: 'uppercase',
        }}>{badge}</span>
      )}
    </button>
  )
}

function SubItemRow({
  label, icon, active, expanded, hasSub, onClick,
}: {
  label: string; icon?: string; active: boolean
  expanded?: boolean; hasSub?: boolean; onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', padding: '7px 10px 7px 18px', marginBottom: 1,
        border: 'none', borderRadius: 8, cursor: 'pointer',
        fontFamily: 'inherit', textAlign: 'left',
        background: active
          ? 'rgba(255,255,255,.9)'
          : hovered ? 'rgba(255,255,255,.06)' : 'transparent',
        color: active ? '#1a56db' : hovered ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.5)',
        fontSize: 12,
        fontWeight: active ? 700 : 400,
        boxShadow: active ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
        transition: 'background .12s, color .12s',
      }}
    >
      {icon
        ? <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1 }}>{icon}</span>
        : <span style={{
            width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
            background: active ? '#1a56db' : hovered ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.25)',
            transition: 'background .1s',
          }}/>
      }
      <span style={{ flex: 1 }}>{label}</span>
      {hasSub && (
        <span style={{
          fontSize: 10,
          color: active ? 'rgba(26,86,219,.5)' : 'rgba(255,255,255,.3)',
          transition: 'transform .2s',
          transform: expanded ? 'rotate(90deg)' : 'none',
          display: 'inline-block', flexShrink: 0,
        }}>›</span>
      )}
    </button>
  )
}

function SubDividerRow({ label }: { label: string }) {
  return (
    <div style={{
      padding: '8px 8px 3px 18px',
      fontSize: 10, fontWeight: 700,
      color: 'rgba(255,255,255,0.35)',
      letterSpacing: '.8px', textTransform: 'uppercase',
    }}>
      {label}
    </div>
  )
}

export default function Sidebar({ recolhida, onRecolher }: {
  recolhida: boolean
  onRecolher: (v: boolean) => void
}) {
  const navigate              = useNavigate()
  const { pathname, search }  = useLocation()
  const { perfil, user, sairDaConta, contas } = useApp()

  const nome    = perfil.apelido || perfil.nome.split(' ')[0] || user?.email?.split('@')[0] || 'Usuário'
  const email   = user?.email ?? ''
  const inicial = nome.charAt(0).toUpperCase()

  const [saldoAurixVal, setSaldoAurixVal] = useState(0)
  const [streakAtual, setStreakAtual] = useState(0)

  useEffect(() => {
    if (!user?.id) return
    saldoAurix(user.id).then(setSaldoAurixVal)
    supabase.from('user_preferences').select('streak_atual').eq('user_id', user.id).single()
      .then(({ data }) => { if (data) setStreakAtual(data.streak_atual ?? 0) })
  }, [user?.id])

  const cartoes = contas.filter(c => c.tipo === 'cartao')

  const params     = new URLSearchParams(search)
  const tipoParam  = params.get('tipo')
  const lancActive      = pathname.startsWith('/novo-lancamento')
  const cartaoSubActive = lancActive && tipoParam === 'cartao'

  function isParentActive(path: string, exact: boolean, excludeIfSearch?: string) {
    if (excludeIfSearch && search === excludeIfSearch) return false
    if (path.includes('?')) {
      const [basePath, query] = path.split('?', 2)
      return pathname === basePath && search === `?${query}`
    }
    return exact ? pathname === path : pathname.startsWith(path)
  }
  function isSubActive(subPath: string) {
    return (pathname + search) === subPath
  }

  function abrirNorth() {
    document.dispatchEvent(new CustomEvent('openNorth'))
  }

  return (
    <RecolhidaCtx.Provider value={recolhida}>
    <div style={{
      position: 'fixed', top: 0, left: 0, bottom: 0,
      width: recolhida ? SIDEBAR_W_MIN : SIDEBAR_W,
      background: 'linear-gradient(180deg, #0f2878 0%, #1e3a8a 100%)',
      display: 'flex', flexDirection: 'column', zIndex: 100,
      fontFamily: "-apple-system,'Inter',sans-serif",
      transition: 'width .18s ease',
    }}>

      {/* ── Logo ── */}
      <div style={{
        padding: recolhida ? '20px 0 16px' : '20px 14px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
      }}>
        {/* A logo É o botão de recolher. Ela deixou de levar ao Dashboard, e
            isso não custa nada: "🏠 Início" é o primeiro item do menu, vai
            para o mesmo `/dashboard` e diz o nome do destino. A logo era o
            atalho mudo para o lugar que já tem linha própria. */}
        <button
          onClick={() => onRecolher(!recolhida)}
          title={recolhida ? 'Expandir menu' : 'Recolher menu'}
          aria-label={recolhida ? 'Expandir menu' : 'Recolher menu'}
          aria-expanded={!recolhida}
          style={{
            display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer',
            justifyContent: recolhida ? 'center' : 'flex-start',
            width: '100%', padding: 0, border: 'none', background: 'transparent',
            fontFamily: 'inherit', textAlign: 'left',
          }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CompassIcon />
          </div>
          {!recolhida && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#ffffff', letterSpacing: '-.3px', lineHeight: 1.1 }}>
                  Compass <span style={{ fontWeight: 300, opacity: .7 }}>One</span>
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', marginTop: 2 }}>
                  Sua bússola financeira
                </div>
              </div>
              {/* Sem isto a logo vira um botão invisível: nada na tela diz que
                  clicar ali recolhe. O rodapé tinha o rótulo por escrito. */}
              <span aria-hidden="true" style={{
                fontSize: 13, color: 'rgba(255,255,255,.4)', flexShrink: 0,
              }}>«</span>
            </>
          )}
        </button>
      </div>

      {/* ── Nav ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px 4px', scrollbarWidth: 'none' as never }}>
        <style>{`
          @keyframes subExpand {
            from { opacity: 0; transform: translateY(-4px); }
            to   { opacity: 1; transform: translateY(0);    }
          }
        `}</style>
        {NAV_GROUPS.map(group => (
          <div key={group.label} style={{ marginBottom: recolhida ? 10 : 18 }}>
            {/* Recolhido o rótulo do grupo não cabe, e some com ele a
                organização do menu. Um filete no lugar preserva a separação
                sem pedir largura. */}
            {recolhida ? (
              <div style={{ height: 1, background: 'rgba(255,255,255,0.10)', margin: '0 12px 8px' }} />
            ) : (
              <div style={{
                fontSize: 9, fontWeight: 800,
                color: 'rgba(255,255,255,0.3)',
                letterSpacing: '1px', textTransform: 'uppercase',
                padding: '0 10px', marginBottom: 4,
              }}>
                {group.label}
              </div>
            )}
            {group.items.map(item => {
              const sub = item.sub ?? []
              const parentActive = !item.disabled && isParentActive(item.path, item.exact, item.excludeIfSearch)
              const hasSub = sub.length > 0
              // Os filhos ficam SEMPRE à vista. Recolhido não há largura para
              // eles, e só aí eles somem.
              const mostraSub = !recolhida
              // O pai vira link, e aponta para o PRIMEIRO FILHO, não para o
              // próprio `path`. `isSubActive` casa `pathname + search` exato:
              // `/planejamento` puro não acenderia nenhum filho, e a Grade —
              // que é exatamente onde a rota cai — ficaria apagada.
              const primeiroFilho = sub.find((s): s is SubLeaf => !('divider' in s))
              const destino = primeiroFilho?.path ?? item.path

              // Special 3-level Lançamentos
              if (item.label === 'Lançamentos') {
                return (
                  <div key="lancamentos">
                    <NavItemRow
                      icon="📋"
                      label="Lançamentos"
                      active={lancActive}
                      onClick={() => navigate('/novo-lancamento?tipo=banco')}
                    />
                    {mostraSub && (
                      <div style={{ animation: 'subExpand .18s ease' }}>

                        <SubItemRow
                          label="Banco" icon="🏦"
                          active={lancActive && tipoParam === 'banco'}
                          onClick={() => navigate('/novo-lancamento?tipo=banco')}
                        />

                        {cartoes.length > 0 && (
                          <SubItemRow
                            label="Cartão"
                            icon="💳"
                            active={cartaoSubActive}
                            onClick={() => navigate('/novo-lancamento?tipo=cartao')}
                          />
                        )}

                        <SubItemRow
                          label="Dinheiro" icon="💵"
                          active={lancActive && tipoParam === 'dinheiro'}
                          onClick={() => navigate('/novo-lancamento?tipo=dinheiro')}
                        />
                      </div>
                    )}
                  </div>
                )
              }

              // Regular item
              return (
                <div key={item.label}>
                  <NavItemRow
                    icon={item.icon} label={item.label}
                    active={parentActive}
                    badge={item.badge} disabled={item.disabled}
                    onClick={() => navigate(destino)}
                  />
                  {hasSub && mostraSub && (
                    <div style={{ animation: 'subExpand .18s ease' }}>
                      {sub.map((s, i) => {
                        if ('divider' in s) return <SubDividerRow key={i} label={s.divider} />
                        return (
                          <SubItemRow
                            key={s.path} label={s.label}
                            active={isSubActive(s.path)}
                            onClick={() => navigate(s.path)}
                          />
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* ── Footer: Norte + User + Sair ── */}
      <div style={{
        padding: '10px 10px 14px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
      }}>

        {/* North card */}
        <div
          onClick={abrirNorth}
          title={recolhida ? 'North — assistente financeiro' : undefined}
          style={{
            display: 'flex', alignItems: 'center',
            gap: recolhida ? 0 : 9,
            justifyContent: recolhida ? 'center' : 'flex-start',
            padding: recolhida ? '9px 0' : '9px 10px', borderRadius: 10, cursor: 'pointer',
            marginBottom: 8,
            background: 'rgba(255,255,255,.08)',
            border: '1px solid rgba(255,255,255,.12)',
            transition: 'background .15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.13)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,.08)')}
        >
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg,#1a56db,#2563eb)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
          }}>🧭</div>
          {!recolhida && (
            <>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>North</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,.45)', marginTop: 1 }}>Assistente financeiro</div>
              </div>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#16a34a', boxShadow: '0 0 6px rgba(22,163,74,.7)', flexShrink: 0,
              }}/>
            </>
          )}
        </div>

        {/* User info */}
        <div
          title={recolhida ? `${nome} · ${email}` : undefined}
          style={{
            display: 'flex', alignItems: 'center',
            gap: recolhida ? 0 : 8,
            justifyContent: recolhida ? 'center' : 'flex-start',
            padding: recolhida ? '7px 0' : '7px 10px', marginBottom: 2, borderRadius: 8,
            background: 'rgba(255,255,255,0.08)',
          }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 11, fontWeight: 700,
          }}>{inicial}</div>
          {!recolhida && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: '#ffffff',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{nome}</div>
            <div style={{
              fontSize: 9, color: 'rgba(255,255,255,0.35)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{email}</div>
            <div
              onClick={() => navigate('/aurix')}
              style={{
                fontSize: 9, color: 'rgba(255,255,255,0.55)', marginTop: 2,
                cursor: 'pointer', display: 'inline-block',
              }}
            >
              ✨ {saldoAurixVal.toLocaleString('pt-BR')} Aurix
              {streakAtual > 0 && ` · 🔥 ${streakAtual} dias`}
            </div>
          </div>
          )}
        </div>

        <button
          onClick={sairDaConta}
          title={recolhida ? 'Sair da conta' : undefined}
          aria-label={recolhida ? 'Sair da conta' : undefined}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            justifyContent: recolhida ? 'center' : 'flex-start',
            width: '100%', padding: recolhida ? '5px 0' : '5px 10px', border: 'none',
            borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
            background: 'transparent',
            fontSize: 10, color: 'rgba(255,255,255,.35)',
            transition: 'background .15s, color .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.06)'; e.currentTarget.style.color = 'rgba(255,255,255,.65)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,.35)' }}
        >
          {recolhida ? '↩' : '↩ Sair'}
        </button>
      </div>

    </div>
    </RecolhidaCtx.Provider>
  )
}
