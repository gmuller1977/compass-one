import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
}

const st = {
  h1: { fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px', lineHeight: 1.3 } as React.CSSProperties,
  h2: { fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '28px 0 8px', lineHeight: 1.4 } as React.CSSProperties,
  h3: { fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '18px 0 6px', lineHeight: 1.4 } as React.CSSProperties,
  p:  { fontSize: 13, color: '#475569', margin: '0 0 10px', lineHeight: 1.75 } as React.CSSProperties,
  ul: { margin: '4px 0 12px', paddingLeft: 22 } as React.CSSProperties,
  li: { fontSize: 13, color: '#475569', marginBottom: 6, lineHeight: 1.65 } as React.CSSProperties,
  hr: { border: 'none', borderTop: '1px solid #e2e8f0', margin: '20px 0' } as React.CSSProperties,
  th: { padding: '8px 14px', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' as const, fontWeight: 700, fontSize: 12, color: '#0f172a', whiteSpace: 'nowrap' as const } as React.CSSProperties,
  td: { padding: '8px 14px', borderBottom: '1px solid #f1f5f9', fontSize: 12, color: '#475569', verticalAlign: 'top' as const } as React.CSSProperties,
}

function inline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|https?:\/\/\S+)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ fontWeight: 700, color: '#0f172a' }}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('http://') || part.startsWith('https://')) {
      return <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#1a56db', wordBreak: 'break-all' }}>{part}</a>
    }
    return <span key={i}>{part}</span>
  })
}

function isSeparator(line: string) { return /^[-*_]{3,}$/.test(line.trim()) }
function isTableSep(line: string)  { return /^\|[\s\-:|]+\|/.test(line.trim()) }

function renderMd(md: string): ReactNode[] {
  const lines = md.split('\n')
  const nodes: ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const raw = lines[i]
    const t   = raw.trim()

    if (!t) { i++; continue }

    if (isSeparator(t)) {
      nodes.push(<hr key={key++} style={st.hr} />)
      i++; continue
    }

    if (t.startsWith('# ')) {
      nodes.push(<h1 key={key++} style={st.h1}>{inline(t.slice(2))}</h1>)
      i++; continue
    }
    if (t.startsWith('## ')) {
      nodes.push(<h2 key={key++} style={st.h2}>{inline(t.slice(3))}</h2>)
      i++; continue
    }
    if (t.startsWith('### ')) {
      nodes.push(<h3 key={key++} style={st.h3}>{inline(t.slice(4))}</h3>)
      i++; continue
    }

    // Table: header row followed by separator
    if (t.startsWith('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const headers = t.split('|').filter(Boolean).map(h => h.trim())
      i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i].trim().split('|').filter(Boolean).map(c => c.trim()))
        i++
      }
      nodes.push(
        <div key={key++} style={{ overflowX: 'auto', margin: '8px 0 16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: 8, overflow: 'hidden' }}>
            <thead>
              <tr>{headers.map((h, j) => <th key={j} style={st.th}>{inline(h)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => <td key={ci} style={st.td}>{inline(cell)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    // List
    if (t.startsWith('- ') || t.startsWith('* ')) {
      const items: string[] = []
      while (i < lines.length) {
        const lt = lines[i].trim()
        if (lt.startsWith('- ') || lt.startsWith('* ')) {
          items.push(lt.slice(2)); i++
        } else if (!lt) {
          i++; break
        } else { break }
      }
      nodes.push(
        <ul key={key++} style={st.ul}>
          {items.map((item, j) => <li key={j} style={st.li}>{inline(item)}</li>)}
        </ul>
      )
      continue
    }

    nodes.push(<p key={key++} style={st.p}>{inline(t)}</p>)
    i++
  }

  return nodes
}

const LogoSVG = ({ size = 36 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="1.2"/>
    <polygon points="10,2.5 11.4,9 10,8 8.6,9" fill="white"/>
    <polygon points="10,17.5 8.6,11 10,12 11.4,11" fill="white" opacity=".5"/>
    <polygon points="17.5,10 11,11.4 12,10 11,8.6" fill="white" opacity=".3"/>
    <polygon points="2.5,10 9,8.6 8,10 9,11.4" fill="white" opacity=".3"/>
    <circle cx="10" cy="10" r="1.5" fill="white"/>
  </svg>
)

export default function LegalPage({ rawMd }: { rawMd: string }) {
  const navigate  = useNavigate()
  const isMobile  = useIsMobile()
  const nodes     = renderMd(rawMd)

  function hero(compact: boolean) {
    return (
      <div style={{
        background: 'linear-gradient(135deg,#0f2878,#2563eb)',
        padding: compact ? '28px 32px 40px' : '60px 48px',
        flexShrink: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
        ...(compact ? {} : { flex: 1, maxWidth: 340 }),
      }}>
        <div style={{ position:'absolute', width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,.05)', top:-60, right:-60 }}/>
        <div style={{ position:'absolute', width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,.04)', bottom:-40, left:-20 }}/>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14, position:'relative', zIndex:1 }}>
          <div style={{
            width: compact ? 64 : 80, height: compact ? 64 : 80, borderRadius: 20,
            background: 'rgba(255,255,255,.15)', border: '2px solid rgba(255,255,255,.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(0,0,0,.2)',
          }}>
            <LogoSVG size={compact ? 32 : 40}/>
          </div>
          <div>
            <div style={{ color:'#fff', fontSize: compact ? 22 : 26, fontWeight:800, letterSpacing:-.5, textAlign:'center' }}>
              Compass <span style={{ fontWeight:300, opacity:.7 }}>One</span>
            </div>
            <div style={{ color:'rgba(255,255,255,.55)', fontSize:11, fontWeight:500, textAlign:'center', marginTop:4 }}>
              Sua bússola financeira
            </div>
          </div>
        </div>
      </div>
    )
  }

  const backBtn = (
    <button
      onClick={() => navigate(-1)}
      style={{ display:'inline-flex', alignItems:'center', gap:6, border:'none', background:'transparent',
        color:'#64748b', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
        padding:'6px 0', marginBottom:24 }}>
      ← Voltar
    </button>
  )

  if (isMobile) {
    return (
      <div style={{ height:'100dvh', display:'flex', flexDirection:'column',
        background:'#f8faff', fontFamily:"-apple-system,'Inter',sans-serif", overflow:'hidden' }}>
        {hero(true)}
        <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'none', padding:'24px 20px 40px' }}>
          {backBtn}
          {nodes}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', fontFamily:"-apple-system,'Inter',sans-serif", background:'#f8faff' }}>
      {hero(false)}
      <div style={{ flex:1, overflowY:'auto', padding:'48px 40px 64px' }}>
        <div style={{ maxWidth:680, margin:'0 auto' }}>
          {backBtn}
          {nodes}
        </div>
      </div>
    </div>
  )
}
