import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AppHeader from '../components/AppHeader'

const COR = {
  azul:'#1a56db', azulEscuro:'#0f2878', azulMedio:'#2563eb',
  fundo:'#f0f4ff', branco:'#ffffff', texto:'#0f172a',
  textoSuave:'#64748b', borda:'#e2e8f0',
  verde:'#16a34a', vermelho:'#dc2626', amarelo:'#d97706',
}


function fmt(v: number) {
  return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
}
function mesKey(conta: string, ano: number, mes: number) {
  return `${conta}-${ano}-${String(mes+1).padStart(2,'0')}`
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { contas, categorias, extratoData, planos } = useApp()
  const hoje = new Date()
  const mes  = hoje.getMonth()
  const ano  = hoje.getFullYear()

  const temBanco      = contas.some(c => c.tipo === 'corrente' || c.tipo === 'poupanca')
  const temCartao     = contas.some(c => c.tipo === 'cartao')
  const temCategorias = categorias.some(c => c.ativa)
  const temPlano = useMemo(() => {
    const p = (planos as any)?.[ano]
    if (!p) return false
    return (p.metaAnual ?? 0) > 0 ||
      (p.entradas ?? []).some((c: any) => (c.v ?? []).some((v: number) => v > 0)) ||
      (p.saidas   ?? []).some((c: any) => (c.v ?? []).some((v: number) => v > 0))
  }, [planos, ano])
  // ── Calcula totais do mês atual para conta corrente ──
  const { totalEntradas, totalSaidas, saldoDisponivel, topCategorias } = useMemo(() => {
    let te = 0, ts = 0

    // Soma todas as contas correntes e poupança
    const contasPrincipais = contas.filter(c => c.tipo==='corrente' || c.tipo==='poupanca')
    const saldoIni = contasPrincipais.reduce((s,c) => s + c.saldoInicial, 0)

    // Lançamentos de todas as contas no mês
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

  const semContas = contas.length === 0
  const semDados  = !semContas && totalEntradas === 0 && totalSaidas === 0

  const passos = [
    {
      num: 1, icone: '🏦', titulo: 'Cadastre seus bancos',
      desc: 'Adicione suas contas correntes e poupanças para acompanhar o saldo.',
      feito: temBanco, path: '/configuracoes',
    },
    {
      num: 2, icone: '💳', titulo: 'Adicione seus cartões de crédito',
      desc: 'Vincule seus cartões para controlar faturas automaticamente.',
      feito: temCartao, path: '/configuracoes', opcional: true,
    },
    {
      num: 3, icone: '🗂️', titulo: 'Crie suas categorias',
      desc: 'Organize receitas e despesas para visualizar para onde vai o dinheiro.',
      feito: temCategorias, path: '/configuracoes',
    },
    {
      num: 4, icone: '📋', titulo: 'Faça o planejamento anual',
      desc: 'Defina metas e orçamentos mensais com o assistente de planejamento.',
      feito: temPlano, path: '/planejamento',
    },
  ]

  if (!temBanco || !temCategorias || !temPlano) return (
    <div style={{minHeight:'100vh',background:COR.fundo,fontFamily:"-apple-system,'Inter',sans-serif"}}>
      <AppHeader currentPath="/dashboard" />
      <div style={{maxWidth:560,margin:'0 auto',padding:'48px 24px'}}>
        <div style={{textAlign:'center',marginBottom:36}}>
          <div style={{fontSize:44,marginBottom:14}}>🧭</div>
          <h2 style={{fontSize:22,fontWeight:700,color:COR.texto,margin:'0 0 10px'}}>
            Bem-vindo ao Compass One
          </h2>
          <p style={{fontSize:14,color:COR.textoSuave,lineHeight:1.7,margin:0}}>
            Siga os passos abaixo para começar a organizar suas finanças.
          </p>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {passos.map(p => (
            <div key={p.num}
              onClick={() => navigate(p.path)}
              style={{
                display:'flex',alignItems:'center',gap:16,
                padding:'16px 20px',borderRadius:14,cursor:'pointer',
                background: p.feito ? '#f0fdf4' : COR.branco,
                border:`1.5px solid ${p.feito ? '#86efac' : COR.borda}`,
                transition:'box-shadow 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow='none')}
            >
              <div style={{
                width:38,height:38,borderRadius:'50%',flexShrink:0,
                display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'inherit',
                background: p.feito ? COR.verde : COR.azul,
                color:'#fff',fontWeight:700,fontSize: p.feito ? 17 : 14,
              }}>
                {p.feito ? '✓' : p.num}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:3,flexWrap:'wrap'}}>
                  <span style={{fontSize:17}}>{p.icone}</span>
                  <span style={{fontSize:14,fontWeight:600,color: p.feito ? '#15803d' : COR.texto}}>
                    {p.titulo}
                  </span>
                  {(p as any).opcional && (
                    <span style={{fontSize:10,fontWeight:600,color:COR.textoSuave,
                      background:'#f1f5f9',border:`1px solid ${COR.borda}`,
                      borderRadius:4,padding:'1px 6px',letterSpacing:.3}}>
                      opcional
                    </span>
                  )}
                </div>
                <div style={{fontSize:12,color:COR.textoSuave,lineHeight:1.5}}>
                  {p.desc}
                </div>
              </div>
              <span style={{fontSize:18,color:COR.textoSuave,flexShrink:0}}>›</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:COR.fundo,fontFamily:"-apple-system,'Inter',sans-serif"}}>

      <AppHeader currentPath="/dashboard" />

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
              <div style={{textAlign:'center',padding:'24px 0'}}>
                <div style={{fontSize:28,marginBottom:8}}>📊</div>
                <div style={{color:COR.textoSuave,fontSize:13,marginBottom:12}}>
                  Nenhum lançamento ainda este mês
                </div>
                {semDados && (
                  <button onClick={() => navigate('/novo-lancamento')} style={{
                    padding:'8px 18px',border:'none',borderRadius:8,cursor:'pointer',
                    background:COR.azul,color:'#fff',fontSize:12,fontWeight:600,fontFamily:'inherit'}}>
                    Registrar lançamento
                  </button>
                )}
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