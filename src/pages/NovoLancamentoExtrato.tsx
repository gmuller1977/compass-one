import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const COR = {
  azul: '#1a56db', azulEscuro: '#0f2878', azulMedio: '#2563eb',
  fundo: '#f0f4ff', branco: '#ffffff', texto: '#0f172a',
  textoSuave: '#64748b', borda: '#e2e8f0',
  verde: '#16a34a', vermelho: '#dc2626',
}

type TipoLanc = 'entrada' | 'saida'
type FormaPag = 'debito' | 'pix' | 'transferencia'

type ContaConfig = {
  id: string; nome: string; banco: string
  icone: string; cor: string
  tipo: 'corrente' | 'poupanca' | 'cartao'
  cartaoNum?: 1|2|3
}

type CatFixa = {
  id: string; nome: string; categoria: string
  valor: number; tipo: TipoLanc
  formaPagamento: FormaPag
  diaVencimento: number
}

type Lancamento = {
  id: string; tipo: TipoLanc
  descricao: string; categoria: string
  valor: number; formaPagamento: FormaPag
  tipoLanc: 'fixa'|'variavel'
}

type DadosMes = {
  lancamentos: Record<number, Lancamento[]>
  saldoBanco: string
}

const CONTAS: ContaConfig[] = [
  { id:'cc', nome:'Conta Corrente', banco:'Sicredi',  icone:'ðŸ¦', cor:'#1a56db', tipo:'corrente'           },
  { id:'c1', nome:'CartÃ£o 1',       banco:'Nubank',   icone:'ðŸ’³', cor:'#7c3aed', tipo:'cartao', cartaoNum:1 },
  { id:'c2', nome:'CartÃ£o 2',       banco:'ItaÃº',     icone:'ðŸ’³', cor:'#ea580c', tipo:'cartao', cartaoNum:2 },
  { id:'c3', nome:'CartÃ£o 3',       banco:'Bradesco', icone:'ðŸ’³', cor:'#16a34a', tipo:'cartao', cartaoNum:3 },
  { id:'cp', nome:'PoupanÃ§a',       banco:'Sicredi',  icone:'ðŸ§', cor:'#0891b2', tipo:'poupanca'            },
]

const FIXAS: Record<string, CatFixa[]> = {
  cc: [
    { id:'f01', nome:'SalÃ¡rio Pri',     categoria:'SalÃ¡rio Pri',     valor:11548,   tipo:'entrada', formaPagamento:'transferencia', diaVencimento:1  },
    { id:'f02', nome:'PrestaÃ§Ã£o Casa',  categoria:'PrestaÃ§Ã£o Casa',  valor:826,     tipo:'saida',   formaPagamento:'debito',        diaVencimento:10 },
    { id:'f03', nome:'PrestaÃ§Ã£o Carro', categoria:'PrestaÃ§Ã£o Carro', valor:1149.72, tipo:'saida',   formaPagamento:'debito',        diaVencimento:15 },
    { id:'f04', nome:'Plano de SaÃºde',  categoria:'Plano de SaÃºde',  valor:324.16,  tipo:'saida',   formaPagamento:'debito',        diaVencimento:8  },
    { id:'f05', nome:'Internet',        categoria:'Internet',        valor:100,     tipo:'saida',   formaPagamento:'debito',        diaVencimento:20 },
    { id:'f06', nome:'Celular',         categoria:'Celular',         valor:133.23,  tipo:'saida',   formaPagamento:'debito',        diaVencimento:5  },
    { id:'f07', nome:'Igreja',          categoria:'Igreja',          valor:50,      tipo:'saida',   formaPagamento:'pix',           diaVencimento:10 },
    { id:'f08', nome:'AABB',            categoria:'AABB',            valor:120,     tipo:'saida',   formaPagamento:'debito',        diaVencimento:5  },
  ],
  cp: [], c1: [], c2: [], c3: [],
}

const CAT_SAIDA   = ['AlimentaÃ§Ã£o','Ãgua','CombustÃ­vel','Cuidados Pessoais','Cursos','Lazer','Luz','ManutenÃ§Ã£o Carro','ManutenÃ§Ã£o Casa','Meninos','Outros','Presente','Supermercado','VestuÃ¡rio','Viagens','Aluguel']
const CAT_ENTRADA = ['Clientes a Receber','SalÃ¡rio Pri','SalÃ¡rio Gui','13Âº SalÃ¡rio / FÃ©rias','Outros']
const NOMES_MESES  = ['Janeiro','Fevereiro','MarÃ§o','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MESES_CURTOS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const DIAS_SEM     = ['Dom','Seg','Ter','Qua','Qui','Sex','SÃ¡b']
const STORAGE_KEY   = 'compass_extrato_dados'

const NAV = [
  { label:'Dashboard',    path:'/dashboard'       },
  { label:'Planejamento', path:'/planejamento'    },
  { label:'LanÃ§amentos',  path:'/novo-lancamento' },
  { label:'âš™ Config',    path:'/configuracoes'   },
]

const FORMAS_PAG: { id: FormaPag; label: string }[] = [
  { id:'debito',        label:'DÃ©bito'        },
  { id:'pix',           label:'Pix'           },
  { id:'transferencia', label:'TransferÃªncia' },
]

function fmt(v: number) { return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) }
function parseBRL(s: string) { return parseFloat(s.replace(/[R$\s.]/g,'').replace(',','.')) || 0 }
function diasNoMes(mes: number, ano: number) { return new Date(ano, mes+1, 0).getDate() }
function diaSemana(d: number, m: number, a: number) { return DIAS_SEM[new Date(a,m,d).getDay()] }
function mesKey(conta: string, ano: number, mes: number) {
  return `${conta}-${ano}-${String(mes+1).padStart(2,'0')}`
}

function carregarDados(): Record<string, DadosMes> {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : {} }
  catch { return {} }
}
function salvarDados(d: Record<string, DadosMes>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch { /* silent */ }
}

export default function NovoLancamentoExtrato() {
  const navigate  = useNavigate()
  const hoje      = new Date()
  const diaHoje   = hoje.getDate()
  const mesHoje   = hoje.getMonth()
  const anoHoje   = hoje.getFullYear()

  const [contaId, setContaId] = useState('cc')
  const [mes,     setMes]     = useState(mesHoje)
  const [ano]                  = useState(anoHoje)
  const [dados,   setDados]   = useState<Record<string, DadosMes>>(carregarDados)
  const [diaSel,  setDiaSel]  = useState<number|null>(null)
  const [fTipo,   setFTipo]   = useState<TipoLanc>('saida')
  const [fCat,    setFCat]    = useState('')
  const [fDesc,   setFDesc]   = useState('')
  const [fValor,  setFValor]  = useState('')
  const [fPag,    setFPag]    = useState<FormaPag>('debito')

  const hojeRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLDivElement>(null)
  const { contas } = useApp()
  const fixas         = FIXAS[contaId] ?? []
  const contaInfo     = contas.find(c => c.id === contaId)
  const SALDO_INICIAL = contaInfo?.saldoInicial ?? 0
  const totalDias = diasNoMes(mes, ano)
  const eMesAtual = mes===mesHoje && ano===anoHoje
  const key       = mesKey(contaId, ano, mes)
  const mesDados  = dados[key] ?? { lancamentos:{}, saldoBanco:'' }
  const saldoExtNum = parseBRL(mesDados.saldoBanco)

  useEffect(() => { salvarDados(dados) }, [dados])

  useEffect(() => {
    if (eMesAtual)
      setTimeout(() => hojeRef.current?.scrollIntoView({behavior:'smooth',block:'center'}), 150)
  }, [contaId, mes, ano])

  useEffect(() => {
    if (diaSel !== null)
      setTimeout(() => formRef.current?.scrollIntoView({behavior:'smooth',block:'nearest'}), 80)
  }, [diaSel])

  function updateMes(fn: (prev: DadosMes) => DadosMes) {
    setDados(prev => ({ ...prev, [key]: fn(prev[key] ?? { lancamentos:{}, saldoBanco:'' }) }))
  }

  const saldosDia = useMemo(() => {
    const lancs = (dados[key] ?? { lancamentos:{} }).lancamentos
    const fc    = FIXAS[contaId] ?? []
    let saldo = SALDO_INICIAL
    const res: Record<number,number> = {}
    for (let d=1; d<=totalDias; d++) {
      fc.filter(f=>f.diaVencimento===d).forEach(f=>{ saldo += f.tipo==='entrada'?f.valor:-f.valor })
      ;(lancs[d]??[]).forEach(l=>{ saldo += l.tipo==='entrada'?l.valor:-l.valor })
      res[d] = saldo
    }
    return res
  }, [dados, key, contaId, totalDias])

  const { totalEntradas, totalSaidas } = useMemo(() => {
    const lancs = (dados[key] ?? { lancamentos:{} }).lancamentos
    const fc    = FIXAS[contaId] ?? []
    let te=0, ts=0
    for (let d=1; d<=totalDias; d++) {
      fc.filter(f=>f.diaVencimento===d).forEach(f=>{ f.tipo==='entrada'?te+=f.valor:ts+=f.valor })
      ;(lancs[d]??[]).forEach(l=>{ l.tipo==='entrada'?te+=l.valor:ts+=l.valor })
    }
    return { totalEntradas:te, totalSaidas:ts }
  }, [dados, key, contaId, totalDias])

  const saldoMes   = SALDO_INICIAL + totalEntradas - totalSaidas
  const diferenca  = saldoExtNum > 0 ? saldoExtNum - saldoMes : null
  const conciliado = diferenca !== null && Math.abs(diferenca) < 0.01

  function lancar() {
    if (!diaSel) return
    const valor = parseBRL(fValor)
    if (!fCat || valor <= 0) return
    updateMes(prev => ({
      ...prev,
      lancamentos: {
        ...prev.lancamentos,
        [diaSel]: [...(prev.lancamentos[diaSel]??[]), {
          id:`v-${Date.now()}`, tipo:fTipo,
          descricao:fDesc.trim()||fCat, categoria:fCat,
          valor, formaPagamento:fPag, tipoLanc:'variavel',
        }],
      }
    }))
    setFCat(''); setFDesc(''); setFValor('')
    setTimeout(() => formRef.current?.scrollIntoView({behavior:'smooth',block:'nearest'}), 80)
  }

  function excluir(dia: number, id: string) {
    updateMes(prev => ({
      ...prev,
      lancamentos: { ...prev.lancamentos, [dia]: (prev.lancamentos[dia]??[]).filter(l=>l.id!==id) }
    }))
  }

  function BadgePag({ fp }: { fp: FormaPag }) {
    const map: Record<FormaPag,{bg:string;cor:string;label:string}> = {
      debito:        {bg:'#fef9c3',cor:'#92400e',label:'D'},
      pix:           {bg:'#d1fae5',cor:'#065f46',label:'Pix'},
      transferencia: {bg:'#eff6ff',cor:'#1a56db',label:'TED'},
    }
    const s = map[fp]
    return <span style={{fontSize:9,padding:'1px 5px',borderRadius:3,fontWeight:700,background:s.bg,color:s.cor}}>{s.label}</span>
  }

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',
      background:COR.fundo,fontFamily:"-apple-system,'Inter',sans-serif",overflow:'hidden'}}>

      {/* HEADER */}
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

      {/* ABAS DE BANCO */}
      <div style={{background:COR.branco,borderBottom:`1px solid ${COR.borda}`,
        padding:'10px 16px 0',flexShrink:0,display:'flex',gap:3,overflowX:'auto'}}>
        {CONTAS.map(c => {
          const ativa = c.id===contaId
          return (
            <button key={c.id} onClick={() => { setContaId(c.id); setDiaSel(null) }} style={{
              display:'flex',alignItems:'center',gap:6,
              padding:'7px 14px',borderRadius:'8px 8px 0 0',
              border:`1px solid ${ativa?c.cor:COR.borda}`,
              borderBottom:ativa?`1px solid ${COR.branco}`:`1px solid ${COR.borda}`,
              cursor:'pointer',fontSize:12,fontWeight:500,fontFamily:'inherit',whiteSpace:'nowrap',
              background:ativa?COR.branco:'#f8faff',color:ativa?c.cor:COR.textoSuave,
              marginBottom:ativa?-1:0,position:'relative',zIndex:ativa?1:0}}>
              <div style={{width:7,height:7,borderRadius:'50%',background:c.cor}}/>
              {c.icone} {c.nome}
              <span style={{fontSize:9,color:ativa?c.cor:'#94a3b8',fontWeight:400,marginLeft:2}}>{c.banco}</span>
            </button>
          )
        })}
      </div>

      {/* ABAS DE MÃŠS */}
      <div style={{background:COR.branco,borderBottom:`1px solid ${COR.borda}`,
        padding:'7px 16px',flexShrink:0,display:'flex',gap:3,overflowX:'auto'}}>
        {MESES_CURTOS.map((m,i) => {
          const isAtual = i===mesHoje && ano===anoHoje
          const ativo   = i===mes
          return (
            <button key={m} onClick={() => { setMes(i); setDiaSel(null) }} style={{
              padding:'5px 11px',border:`1px solid ${ativo?COR.azul:'transparent'}`,
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

      {/* BARRA DE SALDO */}
      <div style={{background:COR.branco,borderBottom:`2px solid ${COR.borda}`,
        padding:'8px 16px',flexShrink:0,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:12,fontWeight:600,color:COR.texto}}>{NOMES_MESES[mes]} {ano}</span>
        <span style={{color:COR.borda}}>|</span>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <span style={{fontSize:11,color:COR.textoSuave}}>Extrato:</span>
          <input value={mesDados.saldoBanco}
            onChange={e => updateMes(prev=>({...prev,saldoBanco:e.target.value}))}
            placeholder="R$ 0,00"
            style={{border:`1.5px solid ${COR.azul}`,borderRadius:7,padding:'5px 10px',
              fontSize:12,fontWeight:600,color:COR.azul,background:'#eff6ff',
              outline:'none',width:130,textAlign:'right',fontFamily:'inherit'}}/>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <span style={{fontSize:11,color:COR.textoSuave}}>DiferenÃ§a:</span>
          <div style={{padding:'5px 12px',borderRadius:7,fontSize:12,fontWeight:600,
            background:diferenca===null?'#f1f5f9':conciliado?'#dcfce7':'#fee2e2',
            color:diferenca===null?COR.textoSuave:conciliado?'#166534':'#991b1b',
            border:`1px solid ${diferenca===null?COR.borda:conciliado?'#86efac':'#fca5a5'}`,
            minWidth:110,textAlign:'center'}}>
            {diferenca===null?'Digite o extrato':conciliado?'âœ“ Conciliado':`${diferenca>0?'+':'-'}${fmt(Math.abs(diferenca))}`}
          </div>
        </div>
        <span style={{color:COR.borda}}>|</span>
        <span style={{fontSize:11,color:COR.azul,fontWeight:500}}>â†‘ {fmt(totalEntradas)}</span>
        <span style={{fontSize:11,color:COR.vermelho,fontWeight:500}}>â†“ {fmt(totalSaidas)}</span>
        <span style={{fontSize:11,color:COR.azul,fontWeight:700}}>= {fmt(saldoMes)}</span>
      </div>

      {/* OVERLAY â€” fecha form ao clicar fora */}
      {diaSel !== null && (
        <div onClick={() => setDiaSel(null)}
          style={{position:'fixed',inset:0,zIndex:5,background:'transparent'}}/>
      )}

      {/* EXTRATO */}
      <div style={{flex:1,overflowY:'auto',padding:'10px 16px',
        display:'flex',flexDirection:'column',gap:6,position:'relative',zIndex:6}}>

        {Array.from({length:totalDias},(_,i)=>i+1).map(dia => {
          const ehHoje    = eMesAtual && dia===diaHoje
          const passado   = eMesAtual ? dia<diaHoje : ano<anoHoje||(ano===anoHoje&&mes<mesHoje)
          const semana    = diaSemana(dia, mes, ano)
          const fs        = fixas.filter(f=>f.diaVencimento===dia)
          const ls        = mesDados.lancamentos[dia] ?? []
          const temItens  = fs.length>0 || ls.length>0
          const saldoDia  = saldosDia[dia]
          const saldoIni  = dia===1 ? SALDO_INICIAL : (saldosDia[dia-1] ?? SALDO_INICIAL)
          const delta     = saldoDia - saldoIni
          const formAberto = diaSel===dia
          const corSaldo  = saldoDia<0 ? COR.vermelho : ehHoje ? COR.azul : '#94a3b8'

          return (
            <div key={dia}
              ref={ehHoje ? hojeRef : undefined}
              style={{borderRadius:12,overflow:'hidden',flexShrink:0,
                position:'relative',zIndex:formAberto?7:6,
                border:`1.5px solid ${formAberto?COR.azul:ehHoje?'#93c5fd':COR.borda}`,
                background:COR.branco,
                boxShadow:formAberto?`0 0 0 3px rgba(26,86,219,0.12)`:
                  ehHoje?`0 0 0 2px rgba(147,197,253,0.3)`:'none',
              }}>

              {/* CabeÃ§alho */}
              <div style={{display:'flex',alignItems:'center',gap:12,
                padding:'10px 16px',minHeight:54,
                background:formAberto?'#eff6ff':ehHoje?'#f0f7ff':'#fafbff',
                borderBottom:temItens||formAberto?`1px solid ${formAberto?'#bfdbfe':COR.borda}`:'none'}}>

                <div style={{display:'flex',flexDirection:'column',
                  alignItems:'center',minWidth:32,flexShrink:0}}>
                  <span style={{fontSize:17,fontWeight:700,lineHeight:1,
                    color:formAberto||ehHoje?COR.azul:COR.texto}}>
                    {String(dia).padStart(2,'0')}
                  </span>
                  <span style={{fontSize:9,color:formAberto||ehHoje?COR.azulMedio:'#94a3b8',
                    fontWeight:600,textTransform:'uppercase',letterSpacing:.3,marginTop:2}}>
                    {semana}
                  </span>
                </div>

                {ehHoje && (
                  <span style={{fontSize:10,background:COR.azul,color:'#fff',
                    padding:'2px 8px',borderRadius:5,fontWeight:600,flexShrink:0}}>Hoje</span>
                )}

                {/* Inicial | MovimentaÃ§Ã£o | Final */}
                <div style={{flex:1,display:'flex',alignItems:'center',
                  justifyContent:'flex-end',gap:6}}>

                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',
                    padding:'5px 12px',borderRadius:8,minWidth:110,
                    background:'#f8faff',border:`1px solid ${COR.borda}`}}>
                    <span style={{fontSize:9,color:'#94a3b8',fontWeight:600,
                      textTransform:'uppercase',letterSpacing:.4,marginBottom:1}}>Inicial</span>
                    <span style={{fontSize:12,fontWeight:600,color:'#94a3b8'}}>{fmt(saldoIni)}</span>
                  </div>

                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',
                    padding:'5px 12px',borderRadius:8,minWidth:110,
                    background:delta===0?'#f8faff':delta>0?'#f0fdf4':'#fff1f2',
                    border:`1px solid ${delta===0?COR.borda:delta>0?'#bbf7d0':'#fecdd3'}`}}>
                    <span style={{fontSize:9,fontWeight:600,textTransform:'uppercase',
                      letterSpacing:.4,marginBottom:1,
                      color:delta===0?'#94a3b8':delta>0?COR.verde:COR.vermelho}}>
                      MovimentaÃ§Ã£o
                    </span>
                    <span style={{fontSize:12,fontWeight:700,
                      color:delta===0?'#94a3b8':delta>0?COR.verde:COR.vermelho}}>
                      {delta===0?'â€”':`${delta>0?'+':''}${fmt(delta)}`}
                    </span>
                  </div>

                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',
                    padding:'5px 12px',borderRadius:8,minWidth:110,
                    background:saldoDia<0?'#fff1f2':ehHoje?'#eff6ff':'#f8faff',
                    border:`1px solid ${saldoDia<0?'#fecdd3':ehHoje?'#bfdbfe':COR.borda}`}}>
                    <span style={{fontSize:9,fontWeight:600,textTransform:'uppercase',
                      letterSpacing:.4,marginBottom:1,color:corSaldo}}>
                      {passado?'Final':ehHoje?'Atual':'Previsto'}
                    </span>
                    <span style={{fontSize:12,fontWeight:700,color:corSaldo}}>{fmt(saldoDia)}</span>
                  </div>
                </div>
              </div>

              {/* Fixas */}
              {fs.map(f => (
                <div key={f.id} style={{display:'flex',alignItems:'center',gap:10,
                  padding:'10px 16px',borderBottom:`1px solid #f1f5f9`}}>
                  <div style={{width:32,height:32,borderRadius:8,flexShrink:0,
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,
                    background:passado?(f.tipo==='entrada'?'#eff6ff':'#f0f9ff'):'#f1f5f9'}}>
                    {passado?(f.tipo==='entrada'?'â†‘':'ðŸ“Œ'):'ðŸ“Œ'}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:500,
                      color:passado?COR.texto:'#94a3b8',
                      display:'flex',alignItems:'center',gap:5}}>
                      {f.nome}
                      <span style={{fontSize:9,padding:'1px 5px',borderRadius:3,fontWeight:600,
                        background:passado?'#e0f2fe':'#f1f5f9',
                        color:passado?'#0369a1':'#94a3b8'}}>
                        {passado?'fixa âœ“':'previsto'}
                      </span>
                    </div>
                    <div style={{fontSize:10,color:'#94a3b8',marginTop:2,
                      display:'flex',alignItems:'center',gap:4}}>
                      {f.categoria} <BadgePag fp={f.formaPagamento}/>
                    </div>
                  </div>
                  <div style={{fontSize:13,fontWeight:600,
                    color:f.tipo==='entrada'?COR.azul:COR.vermelho}}>
                    {f.tipo==='entrada'?'+':'-'}{fmt(f.valor)}
                  </div>
                </div>
              ))}

              {/* LanÃ§amentos variÃ¡veis */}
              {ls.map(l => (
                <div key={l.id}
                  style={{display:'flex',alignItems:'center',gap:10,
                    padding:'10px 16px',borderBottom:`1px solid #f1f5f9`}}
                  onMouseEnter={e=>(e.currentTarget.style.background='#fafbff')}
                  onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                  <div style={{width:32,height:32,borderRadius:8,flexShrink:0,
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,
                    background:l.tipo==='entrada'?'#eff6ff':'#fff1f2'}}>
                    {l.tipo==='entrada'?'â†‘':'â†“'}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:500,color:COR.texto}}>{l.descricao}</div>
                    <div style={{fontSize:10,color:'#94a3b8',marginTop:2,
                      display:'flex',alignItems:'center',gap:4}}>
                      {l.categoria} <BadgePag fp={l.formaPagamento}/>
                    </div>
                  </div>
                  <div style={{fontSize:13,fontWeight:600,
                    color:l.tipo==='entrada'?COR.azul:COR.vermelho}}>
                    {l.tipo==='entrada'?'+':'-'}{fmt(l.valor)}
                  </div>
                  <button onClick={() => excluir(dia, l.id)}
                    style={{border:'none',background:'transparent',cursor:'pointer',
                      color:'#cbd5e1',fontSize:14,padding:'2px 5px',borderRadius:4}}
                    onMouseEnter={e=>(e.currentTarget.style.color=COR.vermelho)}
                    onMouseLeave={e=>(e.currentTarget.style.color='#cbd5e1')}>âœ•</button>
                </div>
              ))}

              {/* BotÃ£o + */}
              <button
                onClick={() => {
                  if (formAberto) { setDiaSel(null) }
                  else { setDiaSel(dia); setFTipo('saida'); setFCat(''); setFDesc(''); setFValor('') }
                }}
                style={{display:'flex',alignItems:'center',justifyContent:'center',
                  gap:6,padding:'9px 16px',fontSize:12,fontWeight:500,
                  color:formAberto?COR.textoSuave:COR.azul,
                  cursor:'pointer',border:'none',
                  background:formAberto?'#f0f7ff':'#fafbff',
                  width:'100%',
                  borderTop:`1px dashed ${formAberto?'#bfdbfe':COR.borda}`,
                  transition:'background .15s'}}>
                <span style={{fontSize:16,fontWeight:700,lineHeight:1}}>{formAberto?'â–²':'+'}</span>
                {formAberto?'Fechar':'Adicionar lanÃ§amento neste dia'}
              </button>

              {/* FormulÃ¡rio acordeÃ£o */}
              {formAberto && (
                <div ref={formRef}
                  style={{background:'#f0f9ff',borderTop:`1px solid #bae6fd`,padding:'14px 16px'}}>

                  <div style={{display:'flex',background:'#e0f2fe',borderRadius:7,
                    padding:3,marginBottom:12,width:'fit-content'}}>
                    {(['saida','entrada'] as const).map(t => (
                      <button key={t} onClick={() => setFTipo(t)} style={{
                        padding:'5px 14px',border:'none',borderRadius:5,
                        cursor:'pointer',fontSize:12,fontWeight:500,
                        fontFamily:'inherit',transition:'all .15s',
                        background:fTipo===t?COR.branco:'transparent',
                        color:fTipo===t?(t==='entrada'?COR.azul:COR.vermelho):'#0369a1',
                        boxShadow:fTipo===t?'0 1px 2px rgba(0,0,0,.08)':'none'}}>
                        {t==='entrada'?'â†‘ Entrada':'â†“ SaÃ­da'}
                      </button>
                    ))}
                  </div>

                  <div style={{display:'flex',gap:8,alignItems:'flex-end',flexWrap:'wrap',marginBottom:10}}>
                    <div style={{flex:'1 1 130px'}}>
                      <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:4}}>Categoria *</div>
                      <select value={fCat} onChange={e=>setFCat(e.target.value)}
                        style={{border:`1.5px solid #bae6fd`,borderRadius:7,padding:'7px 10px',
                          fontSize:12,outline:'none',background:'#fff',
                          fontFamily:'inherit',color:COR.texto,width:'100%'}}>
                        <option value="">Selecione...</option>
                        {(fTipo==='entrada'?CAT_ENTRADA:CAT_SAIDA).map(c=>(
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{flex:'2 1 160px'}}>
                      <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:4}}>DescriÃ§Ã£o</div>
                      <input value={fDesc} onChange={e=>setFDesc(e.target.value)}
                        placeholder="Ex: Mercado Extra, FarmÃ¡cia..."
                        style={{border:`1.5px solid #bae6fd`,borderRadius:7,padding:'7px 10px',
                          fontSize:12,outline:'none',background:'#fff',
                          fontFamily:'inherit',color:COR.texto,width:'100%'}}/>
                    </div>
                    <div style={{flex:'0 0 110px'}}>
                      <div style={{fontSize:10,color:'#0369a1',fontWeight:600,marginBottom:4}}>Valor *</div>
                      <input value={fValor} onChange={e=>setFValor(e.target.value)}
                        placeholder="R$ 0,00" autoFocus
                        style={{border:`1.5px solid #bae6fd`,borderRadius:7,padding:'7px 10px',
                          fontSize:12,outline:'none',background:'#fff',
                          fontFamily:'inherit',color:COR.texto,width:'100%'}}
                        onKeyDown={e=>e.key==='Enter'&&lancar()}/>
                    </div>
                  </div>

                  <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                    <span style={{fontSize:11,color:'#0369a1',fontWeight:500}}>Pagamento:</span>
                    {FORMAS_PAG.map(p=>(
                      <button key={p.id} onClick={()=>setFPag(p.id)} style={{
                        padding:'4px 12px',
                        border:`1.5px solid ${fPag===p.id?COR.azul:'#bae6fd'}`,
                        borderRadius:6,cursor:'pointer',fontSize:11,fontWeight:500,
                        background:fPag===p.id?'#eff6ff':'#fff',
                        color:fPag===p.id?COR.azul:'#0369a1',fontFamily:'inherit'}}>
                        {p.label}
                      </button>
                    ))}
                    <span style={{fontSize:10,color:'#94a3b8',marginLeft:4}}>
                      Enter para salvar Â· form fica aberto para prÃ³ximo lanÃ§amento
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Saldo final */}
        <div style={{borderRadius:12,padding:'14px 16px',flexShrink:0,
          background:`linear-gradient(135deg,${COR.azulEscuro},${COR.azulMedio})`,
          display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,.8)'}}>
            Saldo final previsto â€” {NOMES_MESES[mes]} {ano}
          </span>
          <span style={{fontSize:18,fontWeight:700,color:'#fff'}}>
            {fmt(saldosDia[totalDias] ?? saldoMes)}
          </span>
        </div>
      </div>
    </div>
  )
}
