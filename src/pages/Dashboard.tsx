import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const COR = {
  azul:'#1a56db', azulEscuro:'#0f2878', azulMedio:'#2563eb',
  fundo:'#f0f4ff', branco:'#ffffff', texto:'#0f172a',
  textoSuave:'#64748b', borda:'#e2e8f0',
  verde:'#16a34a', vermelho:'#dc2626', amarelo:'#d97706',
}

const NAV = [
  { label:'Dashboard',    path:'/dashboard'       },
  { label:'Planejamento', path:'/planejamento'    },
  { label:'Lançamentos',  path:'/novo-lancamento' },
  { label:'⚙ Config',    path:'/configuracoes'   },
]

function fmt(v: number) {
  return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
}
function mesKey(conta: string, ano: number, mes: number) {
  return `${conta}-${ano}-${String(mes+1).padStart(2,'0')}`
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { contas, categorias, extratoData } = useApp()
  const hoje = new Date()
  const mes  = hoje.getMonth()
  const ano  = hoje.getFullYear()
  const hojeStr = hoje.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})

  // ── Calcula totais do mês atual para conta corrente ──
  const { totalEntradas, totalSaidas, saldoDisponivel, topCategorias } = useMemo(() => {
    let te = 0, ts = 0

    // Soma todas as contas correntes e poupança
    const contasPrincipais = contas.filter(c => c.tipo==='corrente' || c.tipo==='poupanca')
    const saldoIni = contasPrincipais.reduce((s,c) => s + c.saldoInicial, 0)

    // Fixas previstas (categorias fixas ativas com valor)
    const fixas = categorias.filter(c=>c.fixa && c.ativa && c.valorPadrao && c.valorPadrao>0)
    fixas.forEach(f => {
      if (f.tipo==='entrada') te += f.valorPadrao ?? 0
      else                    ts += f.valorPadrao ?? 0
    })

    // Lançamentos variáveis de todas as contas no mês
    const gastoPorCat: Record<string, number> = {}
    contas.forEach(conta => {
      const key   = mesKey(conta.id, ano, mes)
      const dados = extratoData[key]
      if (!dados) return
      Object.values(dados.lancamentos).flat().forEach(l => {
        if (l.tipo==='entrada') te += l.valor
        else {
          ts += l.valor
          gastoPorCat[l.categoria] = (gastoPorCat[l.categoria]??0) + l.valor
        }
      })
    })

    const saldoDisponivel = saldoIni + te - ts

    // Top 5 categorias com mais gasto
    const topCategorias = Object.entries(gastoPorCat)
      .sort((a,b)=>b[1]-a[1])
      .slice(0,5)
      .map(([nome,gasto]) => {
        const cat = categorias.find(c=>c.nome===nome)
        return { nome, gasto, cor: cat?.cor??COR.azul, icone: cat?.icone??'📌' }
      })

    return { totalEntradas:te, totalSaidas:ts, saldoDisponivel, topCategorias }
  }, [contas, categorias, extratoData, mes, ano])

  // ── Últimos lançamentos ──
  const ultimosLanc = useMemo(() => {
    const todos: { descricao:string; categoria:string; valor:number; tipo:string; data:number }[] = []
    contas.forEach(conta => {
      const key   = mesKey(conta.id, ano, mes)
      const dados = extratoData[key]
      if (!dados) return
      Object.entries(dados.lancamentos).forEach(([dia, ls]) => {
        ls.forEach(l => todos.push({ ...l, data: parseInt(dia) }))
      })
    })
    return todos.sort((a,b) => b.data - a.data).slice(0, 5)
  }, [contas, extratoData, mes, ano])

  return (
    <div style={{minHeight:'100vh',background:COR.fundo,fontFamily:"-apple-system,'Inter',sans-serif"}}>

      {/* HEADER */}
      <div style={{background:`linear-gradient(135deg,${COR.azulEscuro},#2563eb)`,
        padding:'20px 32px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:28}}>
          <div style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}
            onClick={()=>navigate('/dashboard')}>
            <div style={{width:32,height:32,borderRadius:8,background:'rgba(255,255,255,0.15)',
              border:'1px solid rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="1.5"/>
                <polygon points="10,3 11.2,9.4 10,8.5 8.8,9.4" fill="white"/>
                <polygon points="10,17 8.8,10.6 10,11.5 11.2,10.6" fill="white" opacity=".5"/>
              </svg>
            </div>
            <span style={{color:'#fff',fontWeight:700,fontSize:18,letterSpacing:-.3}}>
              Compass <span style={{fontWeight:300,opacity:.75}}>One</span>
            </span>
          </div>
          <nav style={{display:'flex',gap:2}}>
            {NAV.map(n=>(
              <button key={n.path} onClick={()=>navigate(n.path)} style={{
                padding:'6px 14px',borderRadius:8,border:'none',cursor:'pointer',
                fontSize:13,fontWeight:500,fontFamily:'inherit',
                background:n.path==='/dashboard'?'rgba(255,255,255,0.2)':'transparent',
                color:n.path==='/dashboard'?'#fff':'rgba(255,255,255,0.6)'}}>
                {n.label}
              </button>
            ))}
          </nav>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <span style={{color:'rgba(255,255,255,0.7)',fontSize:13,textTransform:'capitalize'}}>{hojeStr}</span>
          <div style={{width:34,height:34,borderRadius:'50%',background:'rgba(255,255,255,0.15)',
            display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:14,fontWeight:600}}>G</div>
        </div>
      </div>

      <div style={{maxWidth:900,margin:'0 auto',padding:'28px 24px'}}>

        {/* CARDS RESUMO */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:24}}>
          {[
            { label:'Saldo disponível', valor:saldoDisponivel, cor: saldoDisponivel<0?COR.vermelho:COR.azul,  icone:'◎' },
            { label:'Entradas no mês',  valor:totalEntradas,   cor:COR.verde,   icone:'↑' },
            { label:'Saídas no mês',    valor:totalSaidas,     cor:COR.vermelho,icone:'↓' },
          ].map(item=>(
            <div key={item.label} style={{background:COR.branco,borderRadius:14,
              padding:'20px 22px',border:`1px solid ${COR.borda}`}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                <span style={{fontSize:12,color:COR.textoSuave,fontWeight:500}}>{item.label}</span>
                <span style={{fontSize:18,color:item.cor}}>{item.icone}</span>
              </div>
              <div style={{fontSize:22,fontWeight:700,color:item.cor,letterSpacing:-.5}}>
                {fmt(item.valor)}
              </div>
            </div>
          ))}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>

          {/* TOP CATEGORIAS */}
          <div style={{background:COR.branco,borderRadius:14,padding:'22px 24px',border:`1px solid ${COR.borda}`}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <h2 style={{fontSize:15,fontWeight:600,color:COR.texto,margin:0}}>Top gastos do mês</h2>
              <span style={{fontSize:12,color:COR.azul,cursor:'pointer'}}
                onClick={()=>navigate('/novo-lancamento')}>Ver tudo</span>
            </div>
            {topCategorias.length === 0 ? (
              <div style={{textAlign:'center',padding:'20px 0',color:COR.textoSuave,fontSize:13}}>
                Nenhum lançamento ainda este mês
              </div>
            ) : topCategorias.map(cat=>(
              <div key={cat.nome} style={{marginBottom:16}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                  <span style={{fontSize:13,color:COR.texto,fontWeight:500,
                    display:'flex',alignItems:'center',gap:6}}>
                    <span>{cat.icone}</span>{cat.nome}
                  </span>
                  <span style={{fontSize:12,color:COR.vermelho,fontWeight:600}}>{fmt(cat.gasto)}</span>
                </div>
                <div style={{height:5,background:COR.fundo,borderRadius:3,overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:3,background:cat.cor,
                    width:`${Math.min((cat.gasto/totalSaidas)*100,100)}%`,
                    transition:'width 0.4s ease'}}/>
                </div>
              </div>
            ))}
          </div>

          {/* ÚLTIMOS LANÇAMENTOS */}
          <div style={{background:COR.branco,borderRadius:14,padding:'22px 24px',border:`1px solid ${COR.borda}`}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <h2 style={{fontSize:15,fontWeight:600,color:COR.texto,margin:0}}>Últimos lançamentos</h2>
              <span style={{fontSize:12,color:COR.azul,cursor:'pointer'}}
                onClick={()=>navigate('/novo-lancamento')}>Ver tudo</span>
            </div>
            {ultimosLanc.length === 0 ? (
              <div style={{textAlign:'center',padding:'20px 0',color:COR.textoSuave,fontSize:13}}>
                Nenhum lançamento ainda este mês
              </div>
            ) : ultimosLanc.map((l,i)=>{
              const cat = categorias.find(c=>c.nome===l.categoria)
              return (
                <div key={i} style={{
                  display:'flex',alignItems:'center',justifyContent:'space-between',
                  paddingBottom:14,marginBottom:14,
                  borderBottom:i<ultimosLanc.length-1?`1px solid ${COR.borda}`:'none'}}>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <div style={{width:36,height:36,borderRadius:10,
                      background:l.tipo==='entrada'?'#f0fdf4':'#fff1f2',
                      display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>
                      {cat?.icone ?? (l.tipo==='entrada'?'↑':'↓')}
                    </div>
                    <div>
                      <div style={{fontSize:13,fontWeight:500,color:COR.texto}}>{l.descricao}</div>
                      <div style={{fontSize:11,color:COR.textoSuave,marginTop:2}}>
                        {l.categoria} · dia {l.data}
                      </div>
                    </div>
                  </div>
                  <div style={{fontSize:14,fontWeight:600,
                    color:l.tipo==='entrada'?COR.verde:COR.vermelho}}>
                    {l.tipo==='entrada'?'+':'-'}{fmt(l.valor)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* BOTÃO FLUTUANTE */}
      <button onClick={()=>navigate('/novo-lancamento')} style={{
        position:'fixed',bottom:28,right:28,width:56,height:56,
        borderRadius:'50%',border:'none',
        background:`linear-gradient(135deg,#1a56db,#2563eb)`,
        color:'#fff',fontSize:28,cursor:'pointer',
        boxShadow:'0 4px 20px rgba(26,86,219,0.4)',
        display:'flex',alignItems:'center',justifyContent:'center',transition:'transform 0.15s'}}
        onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.1)')}
        onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}>
        +
      </button>
    </div>
  )
}