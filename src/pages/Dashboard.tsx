import { useNavigate } from 'react-router-dom'

const COR = {
  azul: '#1a56db', azulEscuro: '#0f2878', azulMedio: '#2563eb',
  fundo: '#f0f4ff', branco: '#ffffff', texto: '#0f172a',
  textoSuave: '#64748b', borda: '#e2e8f0',
  verde: '#16a34a', vermelho: '#dc2626', amarelo: '#d97706',
}

const NAV = [
  { label:'Dashboard',    path:'/dashboard'       },
  { label:'Planejamento', path:'/planejamento'    },
  { label:'Lançamentos',  path:'/novo-lancamento' },
  { label:'⚙ Config',    path:'/configuracoes'   },
]

const resumo = [
  { label:'Saldo disponível', valor:'R$ 3.241,80',  cor:COR.azul,     icone:'◎' },
  { label:'Entradas no mês',  valor:'R$ 15.273,22', cor:COR.verde,    icone:'↑' },
  { label:'Saídas no mês',    valor:'R$ 12.031,42', cor:COR.vermelho, icone:'↓' },
]

const categorias = [
  { nome:'Supermercado',   gasto:2840, limite:3500, cor:COR.azul     },
  { nome:'Combustível',    gasto:1039, limite:1300, cor:COR.amarelo  },
  { nome:'Lazer',          gasto:549,  limite:600,  cor:COR.verde    },
  { nome:'Vestuário',      gasto:466,  limite:400,  cor:COR.vermelho },
  { nome:'Plano de Saúde', gasto:324,  limite:324,  cor:COR.azul     },
  { nome:'Cursos',         gasto:272,  limite:332,  cor:COR.verde    },
]

const lancamentos = [
  { descricao:'Supermercado', categoria:'Alimentação', valor:-284.90, data:'Hoje'  },
  { descricao:'Posto Shell',  categoria:'Combustível',  valor:-180.00, data:'Hoje'  },
  { descricao:'Salário',      categoria:'Entrada',      valor:11548,   data:'Ontem' },
  { descricao:'Netflix',      categoria:'Lazer',        valor:-44.90,  data:'29/06' },
  { descricao:'Farmácia',     categoria:'Saúde',        valor:-67.30,  data:'28/06' },
]

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style:'currency', currency:'BRL' })
}
function porcentagem(gasto: number, limite: number) {
  return Math.min((gasto / limite) * 100, 100)
}
function corBarra(gasto: number, limite: number) {
  const pct = (gasto / limite) * 100
  if (pct >= 100) return COR.vermelho
  if (pct >= 80)  return COR.amarelo
  return COR.azul
}

export default function Dashboard() {
  const navigate = useNavigate()
  const hoje = new Date().toLocaleDateString('pt-BR', { month:'long', year:'numeric' })

  return (
    <div style={{ minHeight:'100vh', background:COR.fundo,
      fontFamily:"-apple-system,'Inter',sans-serif" }}>

      {/* HEADER */}
      <div style={{ background:`linear-gradient(135deg,${COR.azulEscuro},#2563eb)`,
        padding:'20px 32px', display:'flex', alignItems:'center',
        justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:28 }}>
          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}
            onClick={() => navigate('/dashboard')}>
            <div style={{ width:32, height:32, borderRadius:8,
              background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.2)',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="1.5"/>
                <polygon points="10,3 11.2,9.4 10,8.5 8.8,9.4" fill="white"/>
                <polygon points="10,17 8.8,10.6 10,11.5 11.2,10.6" fill="white" opacity=".5"/>
              </svg>
            </div>
            <span style={{ color:'#fff', fontWeight:700, fontSize:18, letterSpacing:-0.3 }}>
              Compass <span style={{ fontWeight:300, opacity:.75 }}>One</span>
            </span>
          </div>
          {/* Nav */}
          <nav style={{ display:'flex', gap:2 }}>
            {NAV.map(n => (
              <button key={n.path} onClick={() => navigate(n.path)} style={{
                padding:'6px 14px', borderRadius:8, border:'none', cursor:'pointer',
                fontSize:13, fontWeight:500, fontFamily:'inherit',
                background: n.path==='/dashboard' ? 'rgba(255,255,255,0.2)' : 'transparent',
                color:      n.path==='/dashboard' ? '#fff' : 'rgba(255,255,255,0.6)',
              }}>{n.label}</button>
            ))}
          </nav>
        </div>
        {/* Mês + avatar */}
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <span style={{ color:'rgba(255,255,255,0.7)', fontSize:13,
            textTransform:'capitalize' }}>{hoje}</span>
          <div style={{ width:34, height:34, borderRadius:'50%',
            background:'rgba(255,255,255,0.15)', display:'flex',
            alignItems:'center', justifyContent:'center',
            color:'#fff', fontSize:14, fontWeight:600 }}>G</div>
        </div>
      </div>

      <div style={{ maxWidth:900, margin:'0 auto', padding:'28px 24px' }}>

        {/* CARDS RESUMO */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
          {resumo.map(item => (
            <div key={item.label} style={{ background:COR.branco, borderRadius:14,
              padding:'20px 22px', border:`1px solid ${COR.borda}` }}>
              <div style={{ display:'flex', alignItems:'center',
                justifyContent:'space-between', marginBottom:10 }}>
                <span style={{ fontSize:12, color:COR.textoSuave, fontWeight:500 }}>
                  {item.label}
                </span>
                <span style={{ fontSize:18, color:item.cor }}>{item.icone}</span>
              </div>
              <div style={{ fontSize:22, fontWeight:700, color:COR.texto, letterSpacing:-0.5 }}>
                {item.valor}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

          {/* ORÇAMENTO */}
          <div style={{ background:COR.branco, borderRadius:14,
            padding:'22px 24px', border:`1px solid ${COR.borda}` }}>
            <div style={{ display:'flex', alignItems:'center',
              justifyContent:'space-between', marginBottom:20 }}>
              <h2 style={{ fontSize:15, fontWeight:600, color:COR.texto, margin:0 }}>
                Orçamento do mês
              </h2>
              <span style={{ fontSize:12, color:COR.azul, cursor:'pointer' }}
                onClick={() => navigate('/planejamento')}>Ver tudo</span>
            </div>
            {categorias.map(cat => (
              <div key={cat.nome} style={{ marginBottom:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontSize:13, color:COR.texto, fontWeight:500 }}>{cat.nome}</span>
                  <span style={{ fontSize:12, color:COR.textoSuave }}>
                    {fmt(cat.gasto)}
                    <span style={{ color:COR.borda }}> / {fmt(cat.limite)}</span>
                  </span>
                </div>
                <div style={{ height:6, background:COR.fundo, borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:3,
                    width:`${porcentagem(cat.gasto,cat.limite)}%`,
                    background:corBarra(cat.gasto,cat.limite),
                    transition:'width 0.4s ease' }} />
                </div>
              </div>
            ))}
          </div>

          {/* ÚLTIMOS LANÇAMENTOS */}
          <div style={{ background:COR.branco, borderRadius:14,
            padding:'22px 24px', border:`1px solid ${COR.borda}` }}>
            <div style={{ display:'flex', alignItems:'center',
              justifyContent:'space-between', marginBottom:20 }}>
              <h2 style={{ fontSize:15, fontWeight:600, color:COR.texto, margin:0 }}>
                Últimos lançamentos
              </h2>
              <span style={{ fontSize:12, color:COR.azul, cursor:'pointer' }}
                onClick={() => navigate('/novo-lancamento')}>Ver tudo</span>
            </div>
            {lancamentos.map((l,i) => (
              <div key={i} style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                paddingBottom:14, marginBottom:14,
                borderBottom: i < lancamentos.length-1 ? `1px solid ${COR.borda}` : 'none',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:36, height:36, borderRadius:10,
                    background: l.valor > 0 ? '#f0fdf4' : '#fff1f2',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>
                    {l.valor > 0 ? '↑' : '↓'}
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500, color:COR.texto }}>
                      {l.descricao}
                    </div>
                    <div style={{ fontSize:11, color:COR.textoSuave, marginTop:2 }}>
                      {l.categoria} · {l.data}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize:14, fontWeight:600,
                  color: l.valor > 0 ? COR.verde : COR.texto }}>
                  {l.valor > 0 ? '+' : ''}{fmt(l.valor)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTÃO FLUTUANTE */}
      <button onClick={() => navigate('/novo-lancamento')} style={{
        position:'fixed', bottom:28, right:28,
        width:56, height:56, borderRadius:'50%', border:'none',
        background:`linear-gradient(135deg,#1a56db,#2563eb)`,
        color:'#fff', fontSize:28, cursor:'pointer',
        boxShadow:'0 4px 20px rgba(26,86,219,0.4)',
        display:'flex', alignItems:'center', justifyContent:'center',
        transition:'transform 0.15s',
      }}
        onMouseEnter={e => (e.currentTarget.style.transform='scale(1.1)')}
        onMouseLeave={e => (e.currentTarget.style.transform='scale(1)')}
        title="Novo lançamento">
        +
      </button>
    </div>
  )
}