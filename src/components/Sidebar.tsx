import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export const SIDEBAR_W = 216

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
}

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'DIA A DIA',
    items: [
      { icon: '🏠', label: 'Início',      path: '/dashboard',       exact: true  },
      {
        icon: '📋', label: 'Lançamentos', path: '/novo-lancamento', exact: false,
        sub: [
          { label: 'Banco',       path: '/novo-lancamento?tipo=banco'       },
          { label: 'Cartão',      path: '/novo-lancamento?tipo=cartao'      },
          { label: 'Dinheiro',    path: '/novo-lancamento?tipo=dinheiro'    },
          { label: 'Visão geral', path: '/novo-lancamento?tipo=consolidado' },
        ],
      },
    ],
  },
  {
    label: 'MEU PLANO',
    items: [
      {
        icon: '🎯', label: 'Planejamento', path: '/planejamento', exact: false,
        sub: [
          { label: 'Assistente',     path: '/planejamento?modo=wizard'  },
          { label: 'Grade',          path: '/planejamento?modo=grade'   },
          { label: 'Planilha',       path: '/planejamento?modo=planilha'},
          { label: 'Lista',          path: '/planejamento?modo=lista'   },
          { label: 'Revisão mensal', path: '/planejamento?modo=revisao' },
        ],
      },
      { icon: '📈', label: 'Evolução',   path: '/evolucao',    exact: false },
      { icon: '🔮', label: 'Simulador',  path: '/simulacao',   exact: false },
    ],
  },
  {
    label: 'CONTA',
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
        width: '100%', padding: '7px 8px', marginBottom: 1,
        border: 'none', borderRadius: 8,
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: 'inherit', textAlign: 'left',
        background: active
          ? 'rgba(255,255,255,0.15)'
          : hovered
            ? 'rgba(255,255,255,0.1)'
            : 'transparent',
        color: isSair
          ? (hovered ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)')
          : active
            ? '#ffffff'
            : disabled
              ? 'rgba(255,255,255,0.3)'
              : 'rgba(255,255,255,0.7)',
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        transition: 'background .12s, color .12s',
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <span style={{ fontSize: 15, width: 20, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge && (
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '.4px',
          padding: '2px 5px', borderRadius: 4,
          background: 'rgba(255,255,255,0.15)',
          color: 'rgba(255,255,255,0.6)',
          border: '1px solid rgba(255,255,255,0.2)',
          flexShrink: 0,
          textTransform: 'uppercase',
        }}>{badge}</span>
      )}
      {!badge && hasSub && (
        <span style={{
          fontSize: 10,
          color: active ? '#ffffff' : 'rgba(255,255,255,0.4)',
          transition: 'transform .2s, color .12s',
          transform: expanded ? 'rotate(90deg)' : 'none',
          display: 'inline-block', flexShrink: 0,
        }}>▶</span>
      )}
      {!badge && !hasSub && active && (
        <div style={{
          width: 4, height: 4, borderRadius: '50%',
          background: '#ffffff', flexShrink: 0,
        }}/>
      )}
    </button>
  )
}

function SubItemRow({ label, active, onClick }: {
  label: string; active: boolean; onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', padding: '5px 8px 5px 33px', marginBottom: 1,
        border: 'none', borderRadius: 6, cursor: 'pointer',
        fontFamily: 'inherit', textAlign: 'left',
        background: 'transparent',
        color: active
          ? '#ffffff'
          : hovered
            ? 'rgba(255,255,255,0.9)'
            : 'rgba(255,255,255,0.6)',
        fontSize: 12,
        fontWeight: active ? 500 : 400,
        transition: 'color .1s',
      }}
    >
      <span style={{
        width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
        background: active ? '#ffffff' : hovered ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)',
        transition: 'background .1s',
      }}/>
      {label}
    </button>
  )
}

function SubDividerRow({ label }: { label: string }) {
  return (
    <div style={{
      padding: '8px 8px 3px 33px',
      fontSize: 10, fontWeight: 700,
      color: 'rgba(255,255,255,0.4)',
      letterSpacing: '.8px', textTransform: 'uppercase',
    }}>
      {label}
    </div>
  )
}

export default function Sidebar() {
  const navigate              = useNavigate()
  const { pathname, search }  = useLocation()
  const { perfil, user, sairDaConta } = useApp()

  const nome    = perfil.apelido || perfil.nome.split(' ')[0] || user?.email?.split('@')[0] || 'Usuário'
  const email   = user?.email ?? ''
  const inicial = nome.charAt(0).toUpperCase()

  function isParentActive(path: string, exact: boolean) {
    return exact ? pathname === path : pathname.startsWith(path)
  }

  function isSubActive(subPath: string) {
    if (subPath.includes('modo=wizard')) return false
    return (pathname + search) === subPath
  }

  const [expandedItem, setExpandedItem] = useState<string|null>(() => {
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        if (!item.disabled && pathname.startsWith(item.path) && item.path !== '/dashboard') {
          return item.label
        }
      }
    }
    return null
  })

  function toggleExpand(label: string) {
    setExpandedItem(prev => prev === label ? null : label)
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, bottom: 0, width: SIDEBAR_W,
      background: 'linear-gradient(180deg, #0f2878 0%, #1a56db 100%)',
      display: 'flex', flexDirection: 'column', zIndex: 100,
      fontFamily: "-apple-system,'Inter',sans-serif",
    }}>

      {/* ── Logo ── */}
      <div style={{
        padding: '18px 14px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        flexShrink: 0,
      }}>
        <div
          onClick={() => navigate('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CompassIcon />
          </div>
          <div style={{ lineHeight: 1.2 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>Compass</span>
            {' '}
            <span style={{ fontSize: 14, fontWeight: 300, color: 'rgba(255,255,255,0.7)' }}>One</span>
          </div>
        </div>
      </div>

      {/* ── Nav ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 4px' }}>
        {NAV_GROUPS.map(group => (
          <div key={group.label} style={{ marginBottom: 18 }}>
            <div style={{
              fontSize: 10, fontWeight: 700,
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '1px', textTransform: 'uppercase',
              padding: '0 8px', marginBottom: 4,
            }}>
              {group.label}
            </div>
            {group.items.map(item => {
              const sub = item.sub ?? []
              const parentActive = !item.disabled && isParentActive(item.path, item.exact)
              const hasSub = sub.length > 0
              const isExpanded = expandedItem === item.label && hasSub
              return (
                <div key={item.label}>
                  <NavItemRow
                    icon={item.icon}
                    label={item.label}
                    active={parentActive}
                    hasSub={hasSub}
                    expanded={isExpanded}
                    badge={item.badge}
                    disabled={item.disabled}
                    onClick={() => hasSub ? toggleExpand(item.label) : navigate(item.path)}
                  />
                  {hasSub && isExpanded && (
                    <div style={{ animation: 'subExpand .18s ease' }}>
                      {sub.map((s, i) => {
                        if ('divider' in s) {
                          return <SubDividerRow key={i} label={s.divider} />
                        }
                        return (
                          <SubItemRow
                            key={s.path}
                            label={s.label}
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
        <style>{`
          @keyframes subExpand {
            from { opacity: 0; transform: translateY(-4px); }
            to   { opacity: 1; transform: translateY(0);    }
          }
        `}</style>
      </div>

      {/* ── User footer ── */}
      <div style={{
        padding: '10px 10px 14px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '6px 8px', marginBottom: 4, borderRadius: 8,
          background: 'rgba(255,255,255,0.1)',
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 12, fontWeight: 700,
          }}>
            {inicial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 12, fontWeight: 600, color: '#ffffff',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{nome}</div>
            <div style={{
              fontSize: 10, color: 'rgba(255,255,255,0.6)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{email}</div>
          </div>
        </div>
        <NavItemRow icon="⏻" label="Sair" active={false} isSair onClick={sairDaConta} />
      </div>

    </div>
  )
}
