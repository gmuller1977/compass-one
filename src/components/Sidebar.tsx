import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { saldoAurix } from '../utils/aurix'

export const SIDEBAR_W = 220

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
      { icon: '📈', label: 'Evolução',    path: '/evolucao',        exact: false },
    ],
  },
  {
    label: '📆 Todo mês',
    items: [
      { icon: '🔄', label: 'Revisão mensal', path: '/revisaomensal', exact: false },
      { icon: '🔮', label: 'Simulador',      path: '/simulacao',                 exact: false },
    ],
  },
  {
    label: '🗓️ Todo ano',
    items: [
      {
        icon: '🎯', label: 'Planejamento', path: '/planejamento', exact: false,
        sub: [
          { label: 'Assistente', path: '/planejamento?modo=wizard'   },
          { label: 'Grade',      path: '/planejamento?modo=grade'    },
          { label: 'Planilha',   path: '/planejamento?modo=planilha' },
          { label: 'Lista',      path: '/planejamento?modo=lista'    },
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
          { label: 'Bancos',       path: '/configuracoes?aba=bancos'       },
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
  icon, label, active, isSair = false, expanded, hasSub, badge, disabled, onClick,
}: {
  icon: string; label: string; active: boolean
  isSair?: boolean; expanded?: boolean; hasSub?: boolean
  badge?: string; disabled?: boolean; onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 9,
        width: '100%', padding: '8px 10px', marginBottom: 1,
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
      <span style={{ fontSize: 15, width: 18, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge && (
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '.4px',
          padding: '2px 5px', borderRadius: 6,
          background: active ? 'rgba(26,86,219,.12)' : 'rgba(255,255,255,0.12)',
          color: active ? '#1a56db' : 'rgba(255,255,255,0.5)',
          border: `1px solid ${active ? 'rgba(26,86,219,.2)' : 'rgba(255,255,255,0.15)'}`,
          flexShrink: 0, textTransform: 'uppercase',
        }}>{badge}</span>
      )}
      {!badge && hasSub && (
        <span style={{
          fontSize: 10,
          color: active ? 'rgba(26,86,219,.5)' : 'rgba(255,255,255,0.35)',
          transition: 'transform .2s, color .12s',
          transform: expanded ? 'rotate(90deg)' : 'none',
          display: 'inline-block', flexShrink: 0,
        }}>›</span>
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

export default function Sidebar() {
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
    if (subPath.includes('modo=wizard')) return false
    return (pathname + search) === subPath
  }

  const [expandedItem, setExpandedItem] = useState<string|null>(() => {
    if (pathname.startsWith('/novo-lancamento')) return 'Lançamentos'
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        if (!item.disabled && !item.path.includes('?') && item.sub &&
            pathname.startsWith(item.path) && item.path !== '/dashboard') {
          if (item.excludeIfSearch && search === item.excludeIfSearch) continue
          return item.label
        }
      }
    }
    return null
  })

  useEffect(() => {
    if (pathname.startsWith('/novo-lancamento')) {
      setExpandedItem('Lançamentos')
    }
  }, [pathname, tipoParam]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleExpand(label: string) {
    setExpandedItem(prev => prev === label ? null : label)
  }

  function abrirNorth() {
    document.dispatchEvent(new CustomEvent('openNorth'))
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, bottom: 0, width: SIDEBAR_W,
      background: 'linear-gradient(180deg, #0f2878 0%, #1e3a8a 100%)',
      display: 'flex', flexDirection: 'column', zIndex: 100,
      fontFamily: "-apple-system,'Inter',sans-serif",
    }}>

      {/* ── Logo ── */}
      <div style={{
        padding: '20px 14px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
      }}>
        <div onClick={() => navigate('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CompassIcon />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#ffffff', letterSpacing: '-.3px', lineHeight: 1.1 }}>
              Compass <span style={{ fontWeight: 300, opacity: .7 }}>One</span>
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', marginTop: 2 }}>
              Sua bússola financeira
            </div>
          </div>
        </div>
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
          <div key={group.label} style={{ marginBottom: 18 }}>
            <div style={{
              fontSize: 9, fontWeight: 800,
              color: 'rgba(255,255,255,0.3)',
              letterSpacing: '1px', textTransform: 'uppercase',
              padding: '0 10px', marginBottom: 4,
            }}>
              {group.label}
            </div>
            {group.items.map(item => {
              const sub = item.sub ?? []
              const parentActive = !item.disabled && isParentActive(item.path, item.exact, item.excludeIfSearch)
              const hasSub = sub.length > 0
              const isExpanded = expandedItem === item.label

              // Special 3-level Lançamentos
              if (item.label === 'Lançamentos') {
                return (
                  <div key="lancamentos">
                    <NavItemRow
                      icon="📋"
                      label="Lançamentos"
                      active={lancActive}
                      hasSub
                      expanded={isExpanded}
                      onClick={() => {
                        toggleExpand('Lançamentos')
                      }}
                    />
                    {isExpanded && (
                      <div style={{ animation: 'subExpand .18s ease' }}>

                        <SubItemRow
                          label="Contas" icon="🏦"
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
                        <SubItemRow
                          label="Visão geral" icon="📊"
                          active={lancActive && tipoParam === 'consolidado'}
                          onClick={() => navigate('/novo-lancamento?tipo=consolidado')}
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
                    active={parentActive} hasSub={hasSub} expanded={isExpanded}
                    badge={item.badge} disabled={item.disabled}
                    onClick={() => hasSub ? toggleExpand(item.label) : navigate(item.path)}
                  />
                  {hasSub && isExpanded && (
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
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '9px 10px', borderRadius: 10, cursor: 'pointer',
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
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>North</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,.45)', marginTop: 1 }}>Assistente financeiro</div>
          </div>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#16a34a', boxShadow: '0 0 6px rgba(22,163,74,.7)', flexShrink: 0,
          }}/>
        </div>

        {/* User info */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 10px', marginBottom: 2, borderRadius: 8,
          background: 'rgba(255,255,255,0.08)',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 11, fontWeight: 700,
          }}>{inicial}</div>
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
        </div>

        <button
          onClick={sairDaConta}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            width: '100%', padding: '5px 10px', border: 'none',
            borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
            background: 'transparent',
            fontSize: 10, color: 'rgba(255,255,255,.35)',
            transition: 'background .15s, color .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.06)'; e.currentTarget.style.color = 'rgba(255,255,255,.65)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,.35)' }}
        >
          ↩ Sair
        </button>
      </div>

    </div>
  )
}
