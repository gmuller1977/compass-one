import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const COR = {
  azul: '#1a56db', azulEscuro: '#0f2878', azulMedio: '#2563eb',
  fundo: '#f0f4ff', branco: '#ffffff', texto: '#0f172a',
  textoSuave: '#64748b', borda: '#e2e8f0',
  verde: '#16a34a', vermelho: '#dc2626', amarelo: '#d97706',
}

type TipoLanc = 'entrada' | 'saida'
type FormaPag = 'debito' | 'credito'

type ContaConfig = {
  id: string; nome: string; banco: string
  icone: string; cor: string
  tipo: 'corrente' | 'poupanca' | 'cartao'
  cartaoNum?: 1|2|3
}

type CatFixa = {
  id: string; nome: string; categoria: string
  valor: number; tipo: TipoLanc
  formaPagamento: FormaPag; cartao?: 1|2|3
  diaVencimento: number
}

type Lancamento = {
  id: string; tipo: TipoLanc
  descricao: string; categoria: string
  valor: number; formaPagamento: FormaPag
  cartao?: 1|2|3; tipoLanc: 'fixa'|'variavel'
}

type DadosMes = {
  lancamentos: Record<number, Lancamento[]>
  saldoBanco: string
}

const CONTAS: ContaConfig[] = [
  { id:'cc', nome:'Conta Corrente', banco:'Sicredi',  icone:'🏦', cor:'#1a56db', tipo:'corrente'           },
  { id:'c1', nome:'Cartão 1',       banco:'Nubank',   icone:'💳', cor:'#7c3aed', tipo:'cartao', cartaoNum:1 },
  { id:'c2', nome:'Cartão 2',       banco:'Itaú',     icone:'💳', cor:'#ea580c', tipo:'cartao', cartaoNum:2 },
  { id:'c3', nome:'Cartão 3',       banco:'Bradesco', icone:'💳', cor:'#16a34a', tipo:'cartao', cartaoNum:3 },
  { id:'cp', nome:'Poupança',       banco:'Sicredi',  icone:'🏧', cor:'#0891b2', tipo:'poupanca'            },
]

const FIXAS: Record<string, CatFixa[]> = {
  cc: [
    { id:'f01', nome:'Salário Pri',     categoria:'Salário Pri',     valor:11548,   tipo:'entrada', formaPagamento:'debito', diaVencimento:1  },
    { id:'f02', nome:'Prestação Casa',  categoria:'Prestação Casa',  valor:826,     tipo:'saida',   formaPagamento:'debito', diaVencimento:10 },
    { id:'f03', nome:'Prestação Carro', categoria:'Prestação Carro', valor:1149.72, tipo:'saida',   formaPagamento:'debito', diaVencimento:15 },
    { id:'f04', nome:'Plano de Saúde',  categoria:'Plano de Saúde',  valor:324.16,  tipo:'saida',   formaPagamento:'debito', diaVencimento:8  },
    { id:'f05', nome:'Internet',        categoria:'Internet',        valor:100,     tipo:'saida',   formaPagamento:'debito', diaVencimento:20 },
    { id:'f06', nome:'Celular',         categoria:'Celular',         valor:133.23,  tipo:'saida',   formaPagamento:'debito', diaVencimento:5  },
    { id:'f07', nome:'Igreja',          categoria:'Igreja',          valor:50,      tipo:'saida',   formaPagamento:'debito', diaVencimento:10 },
    { id:'f08', nome:'AABB',            categoria:'AABB',            valor:120,     tipo:'saida',   formaPagamento:'debito', diaVencimento:5  },
  ],
  cp: [],
  c1: [{ id:'f09', nome:'Consórcio',   categoria:'Consórcio',   valor:460.94, tipo:'saida', formaPagamento:'credito', cartao:1, diaVencimento:5  }],
  c2: [
    { id:'f10', nome:'Seguro Civic',  categoria:'Seguro Civic',  valor:193.65, tipo:'saida', formaPagamento:'credito', cartao:2, diaVencimento:15 },
    { id:'f11', nome:'Seguro March',  categoria:'Seguro March',  valor:94.72,  tipo:'saida', formaPagamento:'credito', cartao:2, diaVencimento:15 },
  ],
  c3: [],
}

const CAT_SAIDA   = ['Alimentação','Água','Combustível','Cuidados Pessoais','Cursos','Lazer','Luz','Manutenção Carro','Manutenção Casa','Meninos','Outros','Presente','Supermercado','Vestuário','Viagens','Aluguel']
const CAT_ENTRADA = ['Clientes a Receber','Salário Pri','Salário Gui','13º Salário / Férias','Outros']
const NOMES_MESES  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MESES_CURTOS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const DIAS_SEM     = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

const SALDO_INICIAL = 5000

const NAV = [
  { label:'Dashboard',    path:'/dashboard'       },
  { label:'Planejamento', path:'/planejamento'    },
  { label:'Lançamentos',  path:'/novo-lancamento' },
  { label:'⚙ Config',    path:'/configuracoes'   },
]

function fmt(v: number) {
  return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
}
function parseBRL(s: string) {
  return parseFloat(s.replace(/[R$\s.]/g,'').replace(',','.')) || 0
}
function diasNoMes(mes: number, ano: number) {
  return new Date(ano, mes+1, 0).getDate()
}
function diaSemana(d: number, m: number, a: number) {
  return DIAS_SEM[new Date(a,m,d).getDay()]
}
function mesKey(conta: string, ano: number, mes: number) {
  return `${conta}-${ano}-${String(mes+1).padStart(2,'0')}`
}

export default function NovoLancamentoExtrato() {
  const navigate   = useNavigate()
  const hoje       = new Date()
  const diaHoje    = hoje.getDate()
  const mesHoje    = hoje.getMonth()
  const anoHoje    = hoje.getFullYear()

  const [contaId,     setContaId]     = useState('cc')
  const [mes,         setMes]         = useState(mesHoje)
  const [ano]         = useState(anoHoje)
  const [dados,       setDados]       = useState<Record<string, DadosMes>>({})
  const [formAberto,  setFormAberto]  = useState<number|null>(null)
  const [fTipo,       setFTipo]       = useState<TipoLanc>('saida')
  const [fCat,        setFCat]        = useState('')
  const [fDesc,       setFDesc]       = useState('')
  const [fValor,      setFValor]      = useState('')
  const [fPag,        setFPag]        = useState<FormaPag>('debito')
  const [fCartao,     setFCartao]     = useState<1|2|3>(1)

  const hojeRef    = useRef<HTMLDivElement>(null)
  const fixas      = FIXAS[contaId] ?? []
  const totalDias  = diasNoMes(mes, ano)
  const eMesAtual  = mes===mesHoje && ano===anoHoje
  const key        = mesKey(contaId, ano, mes)
  const mesDados   = dados[key] ?? { lancamentos:{}, saldoBanco:'' }
  const saldoExtNum = parseBRL(mesDados.saldoBanco)

  // ── Auto-scroll no dia de hoje ──
  useEffect(() => {
    if (eMesAtual) {
      setTimeout(() => hojeRef.current?.scrollIntoView({behavior:'smooth',block:'center'}), 150)
    }
  }, [contaId, mes, ano])

  // ── Helpers de update ──
  function updateMes(fn: (prev: DadosMes) => DadosMes) {
    setDados(prev => ({ ...prev, [key]: fn(prev[key] ?? { lancamentos:{}, saldoBanco:'' }) }))
  }
  function setSaldoBanco(v: string) {
    updateMes(prev => ({ ...prev, saldoBanco:v }))
  }

  // ── Fixas do dia ──
  function fixasDia(dia: number): CatFixa[] {
    return fixas.filter(f => f.diaVencimento===dia)
  }

  // ── Lançamentos variáveis do dia ──
  function lancsDia(dia: number): Lancamento[] {
    return mesDados.lancamentos[dia] ?? []
  }

  // ── Saldo acumulado por dia ──
  const saldosDia = useMemo(() => {
    let saldo = SALDO_INICIAL
    const res: Record<number, number> = {}
    for (let d=1; d<=totalDias; d++) {
      fixasDia(d).forEach(f => { saldo += f.tipo==='entrada' ? f.valor : -f.valor })
      lancsDia(d).forEach(l => { saldo += l.tipo==='entrada' ? l.valor : -l.valor })
      res[d] = saldo
    }
    return res
  }, [dados, contaId, mes, ano, totalDias])

  // ── Totais do mês ──
  const { totalEntradas, totalSaidas } = useMemo(() => {
    let te=0, ts=0
    for (let d=1; d<=totalDias; d++) {
      fixasDia(d).forEach(f => { f.tipo==='entrada' ? te+=f.valor : ts+=f.valor })
      lancsDia(d).forEach(l => { l.tipo==='entrada' ? te+=l.valor : ts+=l.valor })
    }
    return { totalEntradas:te, totalSaidas:ts }
  }, [dados, contaId, mes, ano, totalDias])

  const saldoMes   = SALDO_INICIAL + totalEntradas - totalSaidas
  const diferenca  = saldoExtNum > 0 ? saldoExtNum - saldoMes : null
  const conciliado = diferenca !== null && Math.abs(diferenca) < 0.01

  // ── Lançar ──
  function lancar(dia: number) {
    const valor = parseBRL(fValor)
    if (!fCat || valor <= 0) return
    const novoLanc: Lancamento = {
      id:`v-${Date.now()}`, tipo:fTipo,
      descricao:fDesc.trim()||fCat, categoria:fCat,
      valor, formaPagamento:fPag,
      cartao:fPag==='credito'?fCartao:undefined,
      tipoLanc:'variavel',
    }
    updateMes(prev => ({
      ...prev,
      lancamentos: {
        ...prev.lancamentos,
        [dia]: [...(prev.lancamentos[dia]??[]), novoLanc],
      }
    }))
    // Limpa campos mas mantém o form aberto
    setFCat(''); setFDesc(''); setFValor('')
  }

  function excluir(dia: number, id: string) {
    updateMes(prev => ({
      ...prev,
      lancamentos: {
        ...prev.lancamentos,
        [dia]: (prev.lancamentos[dia]??[]).filter(l => l.id!==id),
      }
    }))
  }

  function BadgePag({ fp, cartao }: { fp: FormaPag; cartao?: number }) {
    if (fp==='debito')
      return <span style={{fontSize:9,padding:'1px 5px',borderRadius:3,fontWeight:700,background:'#fef9c3',color:'#92400e'}}>D</span>
    return <span style={{fontSize:9,padding:'1px 5px',borderRadius:3,fontWeight:700,background:'#eff6ff',color:COR.azul}}>C{cartao}</span>
  }

  const inputSt: React.CSSProperties = {
    border:`1.5px solid ${COR.borda}`, borderRadius:7,
    padding:'7px 10px', fontSize:12, outline:'none',
    background:'#f8fafc', fontFamily:'inherit', color:COR.texto,
  }

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',
      background:COR.fundo,fontFamily:"-apple-system,'Inter',sans-serif",overflow:'hidden'}}>

      {/* ── HEADER ── */}
      <div style={{background:`linear-gradient(135deg,${COR.azulEscuro},${COR.azulMedio})`,
        padding:'14px 24px',display:'flex',alignItems:'center',
        justifyContent:'space-between',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:20}}>
          <div style={{display:'flex',alignItems:'center',gap:9,cursor:'pointer'}}
            onClick={() => navigate('/dashboard')}>
            <div style={{width:30,height:30,borderRadius:8,
              background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.2)',
              display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="1.5"/>
                <polygon points="10,3 11.2,9.4 10,8.5 8.8,9.4" fill="white"/>
                <polygon points="10,17 8.8,10.6 10,11.5 11.2,10.6" fill="white" opacity=".5"/>
              </svg>
            </div>
            <span style={{color:'#fff',fontWeight:700,fontSize:16}}>
              Compass <span style={{fontWeight:300,opacity:.75}}>One</span>
            </span>
          </div>
          <nav style={{display:'flex',gap:2}}>
            {NAV.map(n => (
              <button key={n.path} onClick={() => navigate(n.path)} style={{
                padding:'5px 12px',borderRadius:7,border:'none',cursor:'pointer',
                fontSize:12,fontWeight:500,fontFamily:'inherit',
                background:n.path==='/novo-lancamento'?'rgba(255,255,255,0.2)':'transparent',
                color:n.path==='/novo-lancamento'?'#fff':'rgba(255,255,255,0.6)'}}>
                {n.label}
              </button>
            ))}
          </nav>
        </div>
        <div style={{width:32,height:32,borderRadius:'50%',
          background:'rgba(255,255,255,0.15)',display:'flex',
          alignItems:'center',justifyContent:'center',
          color:'#fff',fontSize:13,fontWeight:600}}>G</div>
      </div>

      {/* ── ABAS DE BANCO ── */}
      <div style={{background:COR.branco,borderBottom:`1px solid ${COR.borda}`,
        padding:'10px 16px 0',flexShrink:0,display:'flex',gap:3,overflowX:'auto'}}>
        {CONTAS.map(c => {
          const ativa = c.id===contaId
          return (
            <button key={c.id} onClick={() => setContaId(c.id)} style={{
              display:'flex',alignItems:'center',gap:6,
              padding:'7px 14px',borderRadius:'8px 8px 0 0',
              border:`1px solid ${ativa?c.cor:COR.borda}`,
              borderBottom:ativa?`1px solid ${COR.branco}`:`1px solid ${COR.borda}`,
              cursor:'pointer',fontSize:12,fontWeight:500,
              fontFamily:'inherit',whiteSpace:'nowrap',
              background:ativa?COR.branco:'#f8faff',
              color:ativa?c.cor:COR.textoSuave,
              marginBottom:ativa?-1:0,position:'relative',zIndex:ativa?1:0}}>
              <div style={{width:7,height:7,borderRadius:'50%',background:c.cor,flexShrink:0}}/>
              {c.icone} {c.nome}
              <span style={{fontSize:9,color:ativa?c.cor:'#94a3b8',fontWeight:400,marginLeft:2}}>
                {c.banco}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── ABAS DE MÊS ── */}
      <div style={{background:COR.branco,borderBottom:`1px solid ${COR.borda}`,
        padding:'7px 16px',flexShrink:0,display:'flex',gap:3,overflowX:'auto'}}>
        {MESES_CURTOS.map((m, i) => {
          const isAtual = i===mesHoje && ano===anoHoje
          const ativo   = i===mes
          return (
            <button key={m} onClick={() => setMes(i)} style={{
              padding:'5px 11px',
              border:`1px solid ${ativo?COR.azul:'transparent'}`,
              borderRadius:6,cursor:'pointer',fontSize:11,fontWeight:ativo?700:400,
              fontFamily:'inherit',whiteSpace:'nowrap',
              background:ativo?'#eff6ff':'transparent',
              color:ativo?COR.azul:COR.textoSuave,position:'relative'}}>
              {m}
              {isAtual && (
                <span style={{position:'absolute',bottom:2,left:'50%',
                  transform:'translateX(-50%)',width:4,height:4,
                  borderRadius:'50%',background:COR.azul,display:'block'}}/>
              )}
            </button>
          )
        })}
      </div>

      {/* ── BARRA DE SALDO E DIFERENÇA ── */}
      <div style={{background:COR.branco,borderBottom:`2px solid ${COR.borda}`,
        padding:'8px 16px',flexShrink:0,display:'flex',
        alignItems:'center',gap:10,flexWrap:'wrap'}}>

        <span style={{fontSize:12,fontWeight:600,color:COR.texto}}>
          {NOMES_MESES[mes]} {ano}
        </span>
        <span style={{color:COR.borda,fontSize:16}}>|</span>

        {/* Saldo extrato */}
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <span style={{fontSize:11,color:COR.textoSuave}}>Extrato:</span>
          <input
            value={mesDados.saldoBanco}
            onChange={e => setSaldoBanco(e.target.value)}
            placeholder="R$ 0,00"
            style={{border:`1.5px solid ${COR.azul}`,borderRadius:7,
              padding:'5px 10px',fontSize:12,fontWeight:600,
              color:COR.azul,background:'#eff6ff',outline:'none',
              width:130,textAlign:'right',fontFamily:'inherit'}}
          />
        </div>

        {/* Diferença — sempre visível */}
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <span style={{fontSize:11,color:COR.textoSuave}}>Diferença:</span>
          <div style={{padding:'5px 12px',borderRadius:7,fontSize:12,fontWeight:600,
            background: diferenca===null ? '#f1f5f9'
              : conciliado ? '#dcfce7' : '#fee2e2',
            color: diferenca===null ? COR.textoSuave
              : conciliado ? '#166534' : '#991b1b',
            border:`1px solid ${diferenca===null ? COR.borda
              : conciliado ? '#86efac' : '#fca5a5'}`,
            minWidth:100,textAlign:'center'}}>
            {diferenca===null
              ? 'Digite o extrato'
              : conciliado
                ? '✓ Conciliado'
                : `${diferenca > 0 ? '+' : '-'}${fmt(Math.abs(diferenca))}`}
          </div>
        </div>

        <span style={{color:COR.borda,fontSize:16}}>|</span>
        <span style={{fontSize:11,color:COR.verde,fontWeight:500}}>↑ {fmt(totalEntradas)}</span>
        <span style={{fontSize:11,color:COR.vermelho,fontWeight:500}}>↓ {fmt(totalSaidas)}</span>
        <span style={{fontSize:11,color:COR.azul,fontWeight:700}}>= {fmt(saldoMes)}</span>
      </div>

      {/* ── EXTRATO ── */}
      <div style={{flex:1,overflowY:'auto',padding:'12px 16px',
        display:'flex',flexDirection:'column',gap:8}}>

        {Array.from({length:totalDias},(_,i) => i+1).map(dia => {
          const ehHoje   = eMesAtual && dia===diaHoje
          const passado  = eMesAtual ? dia < diaHoje
            : ano < anoHoje || (ano===anoHoje && mes < mesHoje)
          const semana   = diaSemana(dia, mes, ano)
          const fs       = fixasDia(dia)
          const ls       = lancsDia(dia)
          const temItens = fs.length > 0 || ls.length > 0
          const saldoDia = saldosDia[dia]
          const formDia  = formAberto===dia

          return (
            <div key={dia}
              ref={ehHoje ? hojeRef : undefined}
              style={{borderRadius:12,overflow:'hidden',
                border:`1.5px solid ${ehHoje ? COR.azul : COR.borda}`,
                background:COR.branco,
                boxShadow: ehHoje ? `0 0 0 3px rgba(26,86,219,0.1)` : 'none',
              }}>

              {/* ── Cabeçalho do dia ── */}
              <div style={{display:'flex',alignItems:'center',gap:10,
                padding:'12px 16px',
                background: ehHoje ? '#eff6ff'
                  : passado && temItens ? COR.branco
                  : passado ? '#fafbff'
                  : '#fafcff',
                borderBottom: temItens||formDia
                  ? `1px solid ${ehHoje?'#bfdbfe':COR.borda}` : 'none',
                minHeight:56}}>

                {/* Data */}
                <div style={{display:'flex',flexDirection:'column',
                  alignItems:'center',minWidth:36}}>
                  <span style={{fontSize:18,fontWeight:700,lineHeight:1,
                    color:ehHoje?COR.azul:passado?COR.texto:'#94a3b8'}}>
                    {String(dia).padStart(2,'0')}
                  </span>
                  <span style={{fontSize:9,color:ehHoje?COR.azulMedio:'#94a3b8',
                    fontWeight:600,textTransform:'uppercase',letterSpacing:.3,marginTop:2}}>
                    {semana}
                  </span>
                </div>

                {/* Badge hoje */}
                {ehHoje && (
                  <span style={{fontSize:10,background:COR.azul,color:'#fff',
                    padding:'2px 8px',borderRadius:5,fontWeight:600}}>
                    Hoje
                  </span>
                )}

                <div style={{flex:1,height:1,
                  background:ehHoje?'#bfdbfe':COR.borda,margin:'0 4px'}}/>

                {/* Saldo do dia */}
                <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:2}}>
                  <span style={{fontSize:9,color:'#94a3b8',fontWeight:600,
                    textTransform:'uppercase',letterSpacing:.4}}>
                    {passado ? 'Saldo' : ehHoje ? 'Saldo atual' : 'Saldo previsto'}
                  </span>
                  <span style={{fontSize:15,fontWeight:700,letterSpacing:-.4,
                    color: saldoDia < 0 ? COR.vermelho
                      : ehHoje ? COR.azul
                      : passado ? COR.verde
                      : '#94a3b8'}}>
                    {fmt(saldoDia)}
                  </span>
                </div>
              </div>

              {/* ── Contas fixas do dia ── */}
              {fs.map(f => (
                <div key={f.id} style={{display:'flex',alignItems:'center',gap:10,
                  padding:'10px 16px',borderBottom:`1px solid #f1f5f9`}}>
                  <div style={{width:32,height:32,borderRadius:8,flexShrink:0,
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,
                    background:passado
                      ? (f.tipo==='entrada'?'#f0fdf4':'#f0f9ff')
                      : '#f1f5f9'}}>
                    {passado?(f.tipo==='entrada'?'↑':'📌'):'📌'}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:500,
                      color:passado?COR.texto:'#94a3b8',
                      display:'flex',alignItems:'center',gap:5,flexWrap:'wrap'}}>
                      {f.nome}
                      <span style={{fontSize:9,padding:'1px 5px',borderRadius:3,fontWeight:600,
                        background:passado?'#e0f2fe':'#f1f5f9',
                        color:passado?'#0369a1':'#94a3b8'}}>
                        {passado?'fixa ✓':'previsto'}
                      </span>
                    </div>
                    <div style={{fontSize:10,color:'#94a3b8',marginTop:2,
                      display:'flex',alignItems:'center',gap:4}}>
                      {f.categoria}
                      <BadgePag fp={f.formaPagamento} cartao={f.cartao}/>
                    </div>
                  </div>
                  <div style={{fontSize:13,fontWeight:600,
                    color:passado
                      ? (f.tipo==='entrada'?COR.verde:COR.texto)
                      : '#94a3b8'}}>
                    {f.tipo==='entrada'?'+':'-'}{fmt(f.valor)}
                  </div>
                </div>
              ))}

              {/* ── Lançamentos variáveis do dia ── */}
              {ls.map(l => (
                <div key={l.id}
                  style={{display:'flex',alignItems:'center',gap:10,
                    padding:'10px 16px',borderBottom:`1px solid #f1f5f9`}}
                  onMouseEnter={e=>(e.currentTarget.style.background='#fafbff')}
                  onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                  <div style={{width:32,height:32,borderRadius:8,flexShrink:0,
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,
                    background:l.tipo==='entrada'?'#f0fdf4':'#fff1f2'}}>
                    {l.tipo==='entrada'?'↑':'↓'}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:500,color:COR.texto}}>
                      {l.descricao}
                    </div>
                    <div style={{fontSize:10,color:'#94a3b8',marginTop:2,
                      display:'flex',alignItems:'center',gap:4}}>
                      {l.categoria}
                      <BadgePag fp={l.formaPagamento} cartao={l.cartao}/>
                    </div>
                  </div>
                  <div style={{fontSize:13,fontWeight:600,
                    color:l.tipo==='entrada'?COR.verde:COR.texto}}>
                    {l.tipo==='entrada'?'+':'-'}{fmt(l.valor)}
                  </div>
                  <button onClick={() => excluir(dia, l.id)}
                    style={{border:'none',background:'transparent',cursor:'pointer',
                      color:'#cbd5e1',fontSize:14,padding:'2px 5px',
                      borderRadius:4,flexShrink:0}}
                    onMouseEnter={e=>(e.currentTarget.style.color=COR.vermelho)}
                    onMouseLeave={e=>(e.currentTarget.style.color='#cbd5e1')}>✕</button>
                </div>
              ))}

              {/* ── BOTÃO + LANÇAMENTO ── */}
              <button
                onClick={() => {
                  if (formDia) {
                    setFormAberto(null)
                  } else {
                    setFormAberto(dia)
                    setFTipo('saida'); setFCat(''); setFDesc(''); setFValor('')
                  }
                }}
                style={{display:'flex',alignItems:'center',justifyContent:'center',
                  gap:6,padding:'10px 16px',fontSize:12,fontWeight:500,
                  color: formDia ? COR.textoSuave : COR.azul,
                  cursor:'pointer',border:'none',
                  background: formDia ? '#f8faff' : ehHoje ? '#f0f7ff' : '#fafbff',
                  width:'100%',
                  borderTop:`1px dashed ${ehHoje?'#bfdbfe':COR.borda}`,
                  transition:'background .15s'}}>
                <span style={{fontSize:16,fontWeight:700,lineHeight:1}}>
                  {formDia ? '▲' : '+'}
                </span>
                {formDia ? 'Fechar' : 'Adicionar lançamento neste dia'}
              </button>

              {/* ── FORMULÁRIO ACORDEÃO ── */}
              {formDia && (
                <div style={{background:'#f0f9ff',borderTop:`1px solid #bae6fd`,
                  padding:'14px 16px'}}>

                  {/* Toggle entrada/saída */}
                  <div style={{display:'flex',background:'#e0f2fe',borderRadius:7,
                    padding:3,marginBottom:12,width:'fit-content'}}>
                    {(['saida','entrada'] as const).map(t => (
                      <button key={t} onClick={() => setFTipo(t)} style={{
                        padding:'5px 14px',border:'none',borderRadius:5,
                        cursor:'pointer',fontSize:12,fontWeight:500,
                        fontFamily:'inherit',transition:'all .15s',
                        background:fTipo===t?COR.branco:'transparent',
                        color:fTipo===t
                          ?(t==='entrada'?COR.verde:COR.vermelho)
                          :'#0369a1',
                        boxShadow:fTipo===t?'0 1px 2px rgba(0,0,0,.08)':'none'}}>
                        {t==='entrada'?'↑ Entrada':'↓ Saída'}
                      </button>
                    ))}
                  </div>

                  {/* Campos */}
                  <div style={{display:'flex',gap:8,alignItems:'flex-end',
                    flexWrap:'wrap',marginBottom:10}}>
                    <div style={{flex:'1 1 130px'}}>
                      <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:4}}>
                        Categoria *
                      </div>
                      <select value={fCat} onChange={e=>setFCat(e.target.value)}
                        style={{...inputSt,width:'100%',borderColor:'#bae6fd',background:'#fff'}}>
                        <option value="">Selecione...</option>
                        {(fTipo==='entrada'?CAT_ENTRADA:CAT_SAIDA).map(c=>(
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{flex:'2 1 160px'}}>
                      <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:4}}>
                        Descrição
                      </div>
                      <input value={fDesc} onChange={e=>setFDesc(e.target.value)}
                        placeholder="Ex: Mercado Extra, Farmácia..."
                        style={{...inputSt,width:'100%',borderColor:'#bae6fd',background:'#fff'}}/>
                    </div>
                    <div style={{flex:'0 0 110px'}}>
                      <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:4}}>
                        Valor *
                      </div>
                      <input value={fValor} onChange={e=>setFValor(e.target.value)}
                        placeholder="R$ 0,00"
                        style={{...inputSt,width:'100%',borderColor:'#bae6fd',background:'#fff'}}
                        onKeyDown={e=>e.key==='Enter'&&lancar(dia)}/>
                    </div>
                  </div>

                  {/* Forma de pagamento */}
                  <div style={{display:'flex',alignItems:'center',gap:8,
                    marginBottom:12,flexWrap:'wrap'}}>
                    <span style={{fontSize:11,color:'#0369a1',fontWeight:500}}>Pagamento:</span>
                    {(['debito','credito'] as const).map(p=>(
                      <button key={p} onClick={()=>setFPag(p)} style={{
                        padding:'4px 12px',
                        border:`1.5px solid ${fPag===p?COR.azul:'#bae6fd'}`,
                        borderRadius:6,cursor:'pointer',fontSize:11,fontWeight:500,
                        background:fPag===p?'#eff6ff':'#fff',
                        color:fPag===p?COR.azul:'#0369a1',fontFamily:'inherit'}}>
                        {p==='debito'?'Débito':'Crédito'}
                      </button>
                    ))}
                    {fPag==='credito' && ([1,2,3] as const).map(c=>(
                      <button key={c} onClick={()=>setFCartao(c)} style={{
                        padding:'4px 12px',
                        border:`1.5px solid ${fCartao===c?COR.azul:'#bae6fd'}`,
                        borderRadius:6,cursor:'pointer',fontSize:11,fontWeight:500,
                        background:fCartao===c?'#eff6ff':'#fff',
                        color:fCartao===c?COR.azul:'#0369a1',fontFamily:'inherit'}}>
                        Cartão {c}
                      </button>
                    ))}
                  </div>

                  {/* Botão salvar */}
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <button onClick={()=>lancar(dia)} style={{
                      padding:'8px 24px',border:'none',borderRadius:8,
                      background:`linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,
                      color:'#fff',fontSize:13,fontWeight:600,
                      cursor:'pointer',fontFamily:'inherit'}}>
                      ✓ Salvar lançamento
                    </button>
                    <span style={{fontSize:10,color:'#0369a1'}}>
                      Enter para salvar · formulário fica aberto para novo lançamento
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Saldo final do mês */}
        <div style={{borderRadius:12,padding:'14px 16px',
          background:`linear-gradient(135deg,${COR.azulEscuro},${COR.azulMedio})`,
          display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,.8)'}}>
            Saldo final previsto — {NOMES_MESES[mes]} {ano}
          </span>
          <span style={{fontSize:18,fontWeight:700,color:'#fff'}}>
            {fmt(saldosDia[totalDias] ?? saldoMes)}
          </span>
        </div>

      </div>
    </div>
  )
}