import { useState, useMemo } from 'react'
import AppHeader from '../components/AppHeader'

const COR = {
  azul: '#1a56db', azulEscuro: '#0f2878', azulMedio: '#2563eb',
  fundo: '#f0f4ff', branco: '#ffffff', texto: '#0f172a',
  textoSuave: '#64748b', borda: '#e2e8f0',
  verde: '#16a34a', vermelho: '#dc2626',
}

type TipoLanc  = 'entrada' | 'saida'
type FormaPag  = 'debito' | 'credito'
type TipoConta = 'corrente' | 'poupanca' | 'cartao'

type Conta = {
  id: string; nome: string; banco: string
  tipo: TipoConta; cartaoNum?: 1|2|3; icone: string
}

type ContaFixa = {
  id: string; nome: string; categoria: string
  valor: number; tipo: TipoLanc
  formaPagamento: FormaPag; cartao?: 1|2|3
}

type Lancamento = {
  id: string; tipo: TipoLanc; descricao: string
  categoria: string; valor: number; data: string
  formaPagamento: FormaPag; cartao?: 1|2|3
  tipoLanc: 'fixa' | 'variavel'
}

type MesData = {
  fixasConfirmadas: string[]
  lancamentos: Lancamento[]
  saldoBanco: string
}

const CONTAS: Conta[] = [
  { id:'cc', nome:'Conta Corrente', banco:'Sicredi',  tipo:'corrente', icone:'🏦' },
  { id:'c1', nome:'Cartão 1',       banco:'Nubank',   tipo:'cartao',   icone:'💳', cartaoNum:1 },
  { id:'c2', nome:'Cartão 2',       banco:'Itaú',     tipo:'cartao',   icone:'💳', cartaoNum:2 },
  { id:'c3', nome:'Cartão 3',       banco:'Bradesco', tipo:'cartao',   icone:'💳', cartaoNum:3 },
  { id:'cp', nome:'Poupança',       banco:'Sicredi',  tipo:'poupanca', icone:'🏧' },
]

const CONTAS_FIXAS: ContaFixa[] = [
  { id:'f01', nome:'Prestação Casa',  categoria:'Prestação Casa',  valor:826,     tipo:'saida', formaPagamento:'debito'           },
  { id:'f02', nome:'Prestação Carro', categoria:'Prestação Carro', valor:1149.72, tipo:'saida', formaPagamento:'debito'           },
  { id:'f03', nome:'Plano de Saúde',  categoria:'Plano de Saúde',  valor:324.16,  tipo:'saida', formaPagamento:'debito'           },
  { id:'f04', nome:'Internet',        categoria:'Internet',        valor:100,     tipo:'saida', formaPagamento:'debito'           },
  { id:'f05', nome:'Celular',         categoria:'Celular',         valor:133.23,  tipo:'saida', formaPagamento:'debito'           },
  { id:'f06', nome:'Igreja',          categoria:'Igreja',          valor:50,      tipo:'saida', formaPagamento:'debito'           },
  { id:'f07', nome:'AABB',            categoria:'AABB',            valor:120,     tipo:'saida', formaPagamento:'debito'           },
  { id:'f08', nome:'Consórcio',       categoria:'Consórcio',       valor:460.94,  tipo:'saida', formaPagamento:'credito', cartao:1 },
  { id:'f09', nome:'Seguro Civic',    categoria:'Seguro Civic',    valor:193.65,  tipo:'saida', formaPagamento:'credito', cartao:2 },
  { id:'f10', nome:'Seguro March',    categoria:'Seguro March',    valor:94.72,   tipo:'saida', formaPagamento:'credito', cartao:2 },
]

const CAT_SAIDA   = ['Alimentação','Água','Combustível','Cuidados Pessoais','Cursos','Lazer','Luz','Manutenção Carro','Manutenção Casa','Meninos','Outros','Presente','Supermercado','Vestuário','Viagens','Aluguel']
const CAT_ENTRADA = ['Clientes a Receber','Salário Pri','Salário Gui','13º Salário / Férias','Outros']
const NOMES_MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']


function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style:'currency', currency:'BRL' })
}
function parseBRL(s: string): number {
  return parseFloat(s.replace(/[R$\s.]/g,'').replace(',','.')) || 0
}
function dataHoje() { return new Date().toISOString().split('T')[0] }
function dataOntem() {
  const d = new Date(); d.setDate(d.getDate()-1)
  return d.toISOString().split('T')[0]
}
function fmtDataBR(iso: string) {
  if (!iso) return ''
  const [,m,d] = iso.split('-')
  return `${d}/${m}`
}
function mesKey(conta: string, mes: number, ano: number) {
  return `${conta}-${ano}-${String(mes+1).padStart(2,'0')}`
}

function dadosIniciais(): Record<string, MesData> {
  return {}
}

export default function NovoLancamentoClassico() {
  const agora      = new Date()

  const [mesAtual,    setMesAtual]    = useState(agora.getMonth())
  const [anoAtual,    setAnoAtual]    = useState(agora.getFullYear())
  const [contaAtual,  setContaAtual]  = useState('cc')
  const [dados,       setDados]       = useState<Record<string, MesData>>(dadosIniciais)
  const [busca,       setBusca]       = useState('')

  const [fTipo,      setFTipo]      = useState<TipoLanc>('saida')
  const [fDesc,      setFDesc]      = useState('')
  const [fCat,       setFCat]       = useState('')
  const [fValor,     setFValor]     = useState('')
  const [fData,      setFData]      = useState(dataHoje)
  const [fPagamento, setFPagamento] = useState<FormaPag>('debito')
  const [fCartao,    setFCartao]    = useState<1|2|3>(1)
  const [erroForm,   setErroForm]   = useState('')

  const key      = mesKey(contaAtual, mesAtual, anoAtual)
  const mesDados: MesData = dados[key] ?? { fixasConfirmadas:[], lancamentos:[], saldoBanco:'' }
  const contaInfo = CONTAS.find(c => c.id===contaAtual)!

  const fixasDaConta = useMemo(() => {
    const conta = CONTAS.find(c => c.id===contaAtual)
    if (!conta) return []
    if (conta.tipo==='cartao')
      return CONTAS_FIXAS.filter(f => f.formaPagamento==='credito' && f.cartao===conta.cartaoNum)
    return CONTAS_FIXAS.filter(f => f.formaPagamento==='debito')
  }, [contaAtual])

  const { totalEntradas, totalFixas, totalVariaveis, saldoMes } = useMemo(() => {
    const ls = mesDados.lancamentos
    const totalEntradas  = ls.filter(l => l.tipo==='entrada').reduce((s,l)=>s+l.valor,0)
    const totalSaidas    = ls.filter(l => l.tipo==='saida').reduce((s,l)=>s+l.valor,0)
    const totalFixas     = ls.filter(l => l.tipoLanc==='fixa').reduce((s,l)=>s+l.valor,0)
    const totalVariaveis = ls.filter(l => l.tipoLanc==='variavel' && l.tipo==='saida').reduce((s,l)=>s+l.valor,0)
    return { totalEntradas, totalSaidas, totalFixas, totalVariaveis, saldoMes:totalEntradas-totalSaidas }
  }, [mesDados])

  const saldoBancoNum = parseBRL(mesDados.saldoBanco)
  const diferenca     = mesDados.saldoBanco ? saldoBancoNum - saldoMes : null
  const conciliado    = diferenca !== null && Math.abs(diferenca) < 0.01

  const fixasConf = fixasDaConta.filter(f => mesDados.fixasConfirmadas.includes(f.id)).length
  const fixasPct  = fixasDaConta.length > 0
    ? Math.round((fixasConf / fixasDaConta.length)*100) : 0

  function updateMes(fn: (prev: MesData) => MesData) {
    setDados(prev => ({ ...prev, [key]: fn(prev[key] ?? { fixasConfirmadas:[], lancamentos:[], saldoBanco:'' }) }))
  }

  function navegarMes(delta: number) {
    let m = mesAtual+delta, a = anoAtual
    if (m<0)  { m=11; a-- }
    if (m>11) { m=0;  a++ }
    setMesAtual(m); setAnoAtual(a)
  }

  function toggleFixa(conta: ContaFixa) {
    const confirmada = mesDados.fixasConfirmadas.includes(conta.id)
    if (confirmada) {
      updateMes(prev => ({
        ...prev,
        fixasConfirmadas: prev.fixasConfirmadas.filter(id=>id!==conta.id),
        lancamentos: prev.lancamentos.filter(l=>l.id!==`${conta.id}-conf`),
      }))
    } else {
      const novoLanc: Lancamento = {
        id:`${conta.id}-conf`, tipo:conta.tipo,
        descricao:conta.nome, categoria:conta.categoria,
        valor:conta.valor, data:dataHoje(),
        formaPagamento:conta.formaPagamento, cartao:conta.cartao,
        tipoLanc:'fixa',
      }
      updateMes(prev => ({
        ...prev,
        fixasConfirmadas:[...prev.fixasConfirmadas, conta.id],
        lancamentos:[...prev.lancamentos, novoLanc],
      }))
    }
  }

  function lancar() {
    const valor = parseBRL(fValor)
    if (!fDesc.trim()) return setErroForm('Informe uma descrição')
    if (!fCat)         return setErroForm('Selecione uma categoria')
    if (valor<=0)      return setErroForm('Informe um valor válido')
    setErroForm('')
    const novoLanc: Lancamento = {
      id:`v-${Date.now()}`, tipo:fTipo,
      descricao:fDesc.trim(), categoria:fCat,
      valor, data:fData,
      formaPagamento:fPagamento,
      cartao:fPagamento==='credito'?fCartao:undefined,
      tipoLanc:'variavel',
    }
    updateMes(prev => ({ ...prev, lancamentos:[...prev.lancamentos, novoLanc] }))
    setFDesc(''); setFValor(''); setFCat('')
  }

  function excluir(l: Lancamento) {
    if (!window.confirm(`Excluir "${l.descricao}"?`)) return
    updateMes(prev => ({
      ...prev,
      lancamentos: prev.lancamentos.filter(x=>x.id!==l.id),
      fixasConfirmadas: l.tipoLanc==='fixa'
        ? prev.fixasConfirmadas.filter(id=>id!==l.id.replace('-conf',''))
        : prev.fixasConfirmadas,
    }))
  }

  const lancsFiltrados = useMemo(() => {
    const termo = busca.toLowerCase()
    return mesDados.lancamentos
      .filter(l => !termo || l.descricao.toLowerCase().includes(termo) || l.categoria.toLowerCase().includes(termo))
      .sort((a,b) => b.data.localeCompare(a.data))
  }, [mesDados.lancamentos, busca])

  const grupos = useMemo(() => {
    const g: Record<string, Lancamento[]> = {}
    lancsFiltrados.forEach(l => { if (!g[l.data]) g[l.data]=[]; g[l.data].push(l) })
    return g
  }, [lancsFiltrados])

  const datasOrdenadas = Object.keys(grupos).sort((a,b)=>b.localeCompare(a))

  const inputSt: React.CSSProperties = {
    border:`1.5px solid ${COR.borda}`, borderRadius:7,
    padding:'7px 10px', fontSize:12, outline:'none',
    background:'#f8fafc', fontFamily:'inherit', color:COR.texto, width:'100%',
  }

  function BadgePag({ l }: { l: Lancamento }) {
    if (l.formaPagamento==='debito')
      return <span style={{fontSize:9,padding:'1px 5px',borderRadius:3,fontWeight:700,background:'#fef9c3',color:'#92400e'}}>D</span>
    return <span style={{fontSize:9,padding:'1px 5px',borderRadius:3,fontWeight:700,background:'#eff6ff',color:COR.azul}}>C{l.cartao}</span>
  }

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',
      background:COR.fundo,fontFamily:"-apple-system,'Inter',sans-serif",overflow:'hidden'}}>

      <AppHeader currentPath="/novo-lancamento" />

      {/* SUB-HEADER: Contas + Mês + Saldo */}
      <div style={{background:COR.branco,borderBottom:`1px solid ${COR.borda}`,flexShrink:0}}>
        <div style={{display:'flex',padding:'10px 16px 0',gap:4,overflowX:'auto'}}>
          {CONTAS.map(c => {
            const ativa = c.id===contaAtual
            return (
              <button key={c.id} onClick={() => setContaAtual(c.id)} style={{
                padding:'7px 14px',borderRadius:'8px 8px 0 0',
                border:`1px solid ${ativa?COR.azul:COR.borda}`,
                borderBottom:ativa?`1px solid ${COR.branco}`:`1px solid ${COR.borda}`,
                cursor:'pointer',fontSize:12,fontWeight:500,
                fontFamily:'inherit',whiteSpace:'nowrap',
                background:ativa?COR.branco:'#f8faff',
                color:ativa?COR.azul:COR.textoSuave,
                marginBottom:ativa?-1:0,position:'relative',zIndex:ativa?1:0}}>
                {c.icone} {c.nome}
                <span style={{fontSize:10,color:ativa?COR.azulMedio:'#94a3b8',marginLeft:4,fontWeight:400}}>
                  {c.banco}
                </span>
              </button>
            )
          })}
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'8px 16px 10px',borderTop:`1px solid ${COR.borda}`}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <button onClick={() => navegarMes(-1)} style={{border:'none',
              background:'#f0f4ff',borderRadius:6,padding:'4px 10px',
              cursor:'pointer',fontSize:14,color:COR.textoSuave}}>←</button>
            <span style={{fontSize:14,fontWeight:700,color:COR.texto}}>
              {NOMES_MESES[mesAtual]} {anoAtual}
            </span>
            <button onClick={() => navegarMes(+1)} style={{border:'none',
              background:'#f0f4ff',borderRadius:6,padding:'4px 10px',
              cursor:'pointer',fontSize:14,color:COR.textoSuave}}>→</button>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:12,color:COR.textoSuave}}>Saldo extrato:</span>
            <input
              value={mesDados.saldoBanco}
              onChange={e => updateMes(prev=>({...prev,saldoBanco:e.target.value}))}
              placeholder="R$ 0,00"
              style={{border:`1.5px solid ${COR.azul}`,borderRadius:7,
                padding:'5px 10px',fontSize:13,fontWeight:600,
                color:COR.azul,background:'#eff6ff',outline:'none',
                width:140,textAlign:'right',fontFamily:'inherit'}}
            />
            {diferenca!==null && (
              <div style={{padding:'5px 12px',borderRadius:7,fontSize:12,fontWeight:600,
                background:conciliado?'#dcfce7':'#fee2e2',
                color:conciliado?'#166534':'#991b1b',
                border:`1px solid ${conciliado?'#86efac':'#fca5a5'}`}}>
                {conciliado?'✓ Conciliado':`Dif. ${fmt(Math.abs(diferenca))}`}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BODY */}
      <div style={{flex:1,display:'flex',overflow:'hidden'}}>

        {/* PAINEL ESQUERDO — Contas Fixas */}
        <div style={{width:260,flexShrink:0,background:COR.branco,
          borderRight:`1px solid ${COR.borda}`,display:'flex',
          flexDirection:'column',overflow:'hidden'}}>
          <div style={{padding:'12px 14px',borderBottom:`1px solid ${COR.borda}`,flexShrink:0}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:3}}>
              <span style={{fontSize:12,fontWeight:700,color:COR.texto}}>📌 Contas Fixas</span>
              <span style={{fontSize:11,color:COR.textoSuave}}>{fixasConf}/{fixasDaConta.length}</span>
            </div>
            <div style={{fontSize:11,color:COR.textoSuave,marginBottom:7}}>
              {NOMES_MESES[mesAtual]} {anoAtual}
            </div>
            <div style={{height:5,background:'#e2e8f0',borderRadius:3,overflow:'hidden'}}>
              <div style={{height:'100%',borderRadius:3,transition:'width .3s',
                width:`${fixasPct}%`,
                background:fixasPct===100?COR.verde:COR.azul}}/>
            </div>
            {fixasPct===100 && fixasDaConta.length>0 && (
              <div style={{fontSize:10,color:COR.verde,fontWeight:600,marginTop:4}}>
                ✓ Todas confirmadas!
              </div>
            )}
            {fixasDaConta.length===0 && (
              <div style={{fontSize:10,color:'#94a3b8',marginTop:4}}>
                Sem contas fixas para esta conta.
              </div>
            )}
          </div>

          <div style={{flex:1,overflowY:'auto',padding:8}}>
            {fixasDaConta.map(conta => {
              const confirmada = mesDados.fixasConfirmadas.includes(conta.id)
              return (
                <div key={conta.id} onClick={() => toggleFixa(conta)}
                  style={{display:'flex',alignItems:'center',gap:8,
                    padding:'9px 10px',borderRadius:8,marginBottom:4,
                    cursor:'pointer',transition:'all .15s',
                    border:`1px solid ${confirmada?'#86efac':COR.borda}`,
                    background:confirmada?'#f0fdf4':COR.branco}}>
                  <div style={{width:18,height:18,borderRadius:5,flexShrink:0,
                    border:`2px solid ${confirmada?COR.verde:'#cbd5e1'}`,
                    background:confirmada?COR.verde:'transparent',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:10,color:'#fff',transition:'all .15s'}}>
                    {confirmada?'✓':''}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:500,
                      color:confirmada?'#15803d':COR.texto}}>
                      {conta.nome}
                    </div>
                    <div style={{fontSize:11,color:COR.textoSuave,marginTop:1}}>
                      {fmt(conta.valor)}
                    </div>
                  </div>
                  {conta.formaPagamento==='debito'
                    ?<span style={{fontSize:9,padding:'1px 5px',borderRadius:3,fontWeight:700,background:'#fef9c3',color:'#92400e',flexShrink:0}}>D</span>
                    :<span style={{fontSize:9,padding:'1px 5px',borderRadius:3,fontWeight:700,background:'#eff6ff',color:COR.azul,flexShrink:0}}>C{conta.cartao}</span>
                  }
                </div>
              )
            })}
          </div>

          {/* Resumo */}
          <div style={{padding:'10px 14px',borderTop:`1px solid ${COR.borda}`,
            background:'#f8faff',flexShrink:0}}>
            <div style={{fontSize:11,fontWeight:700,color:COR.texto,marginBottom:8}}>
              Resumo do mês
            </div>
            {[
              {label:'Entradas',         val:totalEntradas,  cor:COR.verde,    sinal:'+'},
              {label:'Saídas fixas',     val:totalFixas,     cor:COR.azul,     sinal:'-'},
              {label:'Saídas variáveis', val:totalVariaveis, cor:COR.vermelho, sinal:'-'},
            ].map(r => (
              <div key={r.label} style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                <span style={{fontSize:10,color:COR.textoSuave}}>{r.label}</span>
                <span style={{fontSize:11,fontWeight:600,color:r.cor}}>{r.sinal}{fmt(r.val)}</span>
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',
              paddingTop:6,marginTop:4,borderTop:`1px solid ${COR.borda}`}}>
              <span style={{fontSize:11,fontWeight:700,color:COR.texto}}>Saldo</span>
              <span style={{fontSize:13,fontWeight:700,
                color:saldoMes>=0?COR.verde:COR.vermelho}}>
                {fmt(saldoMes)}
              </span>
            </div>
          </div>
        </div>

        {/* PAINEL DIREITO */}
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>

          {/* Cards resumo */}
          <div style={{display:'flex',gap:8,padding:'8px 16px',
            background:'#f8faff',flexShrink:0}}>
            {[
              {label:'Entradas',         val:totalEntradas,  cor:COR.verde,    sinal:'+'},
              {label:'Saídas fixas',     val:totalFixas,     cor:COR.azul,     sinal:'-'},
              {label:'Saídas variáveis', val:totalVariaveis, cor:COR.vermelho, sinal:'-'},
              {label:'Saldo do mês',     val:saldoMes,       cor:saldoMes>=0?COR.verde:COR.vermelho, sinal:saldoMes>=0?'+':''},
            ].map(c => (
              <div key={c.label} style={{flex:1,background:COR.branco,
                border:`1px solid ${COR.borda}`,borderRadius:8,padding:'8px 12px'}}>
                <div style={{fontSize:10,color:COR.textoSuave,marginBottom:3}}>{c.label}</div>
                <div style={{fontSize:14,fontWeight:700,color:c.cor}}>
                  {c.sinal}{fmt(Math.abs(c.val))}
                </div>
              </div>
            ))}
          </div>

          {/* Formulário */}
          <div style={{background:COR.branco,borderBottom:`1px solid ${COR.borda}`,
            padding:'10px 16px',flexShrink:0}}>
            <div style={{fontSize:11,fontWeight:700,color:COR.texto,marginBottom:8}}>
              Novo lançamento — {contaInfo.icone} {contaInfo.nome}
            </div>
            <div style={{display:'flex',gap:6,alignItems:'flex-end',flexWrap:'wrap',marginBottom:8}}>
              <div style={{display:'flex',background:'#f1f5f9',borderRadius:7,padding:3,alignSelf:'flex-end'}}>
                {(['entrada','saida'] as const).map(t => (
                  <button key={t} onClick={() => {setFTipo(t);setFCat('')}} style={{
                    padding:'5px 12px',border:'none',borderRadius:5,cursor:'pointer',
                    fontSize:12,fontWeight:500,fontFamily:'inherit',transition:'all .15s',
                    background:fTipo===t?COR.branco:'transparent',
                    color:fTipo===t?(t==='entrada'?COR.verde:COR.vermelho):COR.textoSuave,
                    boxShadow:fTipo===t?'0 1px 3px rgba(0,0,0,0.08)':'none'}}>
                    {t==='entrada'?'↑ Entrada':'↓ Saída'}
                  </button>
                ))}
              </div>
              <div style={{flex:2,minWidth:120}}>
                <div style={{fontSize:10,color:COR.textoSuave,marginBottom:3}}>Descrição</div>
                <input value={fDesc} onChange={e=>setFDesc(e.target.value)}
                  placeholder="Ex: Mercado, Farmácia..."
                  style={inputSt} onKeyDown={e=>e.key==='Enter'&&lancar()}/>
              </div>
              <div style={{flex:1.5,minWidth:120}}>
                <div style={{fontSize:10,color:COR.textoSuave,marginBottom:3}}>Categoria</div>
                <select value={fCat} onChange={e=>setFCat(e.target.value)} style={inputSt}>
                  <option value="">Selecione...</option>
                  {(fTipo==='entrada'?CAT_ENTRADA:CAT_SAIDA).map(c=>(
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div style={{width:110}}>
                <div style={{fontSize:10,color:COR.textoSuave,marginBottom:3}}>Valor</div>
                <input value={fValor} onChange={e=>setFValor(e.target.value)}
                  placeholder="R$ 0,00" style={inputSt}
                  onKeyDown={e=>e.key==='Enter'&&lancar()}/>
              </div>
              <div style={{width:120}}>
                <div style={{fontSize:10,color:COR.textoSuave,marginBottom:3}}>Data</div>
                <input type="date" value={fData} onChange={e=>setFData(e.target.value)} style={inputSt}/>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
              <span style={{fontSize:11,color:COR.textoSuave}}>Pagamento:</span>
              {(['debito','credito'] as const).map(p=>(
                <button key={p} onClick={()=>setFPagamento(p)} style={{
                  padding:'4px 12px',border:`1.5px solid ${fPagamento===p?COR.azul:COR.borda}`,
                  borderRadius:6,cursor:'pointer',fontSize:11,fontWeight:500,
                  background:fPagamento===p?'#eff6ff':COR.branco,
                  color:fPagamento===p?COR.azul:COR.textoSuave,fontFamily:'inherit'}}>
                  {p==='debito'?'Débito':'Crédito'}
                </button>
              ))}
              {fPagamento==='credito' && ([1,2,3] as const).map(c=>(
                <button key={c} onClick={()=>setFCartao(c)} style={{
                  padding:'4px 12px',border:`1.5px solid ${fCartao===c?COR.azul:COR.borda}`,
                  borderRadius:6,cursor:'pointer',fontSize:11,fontWeight:500,
                  background:fCartao===c?'#eff6ff':COR.branco,
                  color:fCartao===c?COR.azul:COR.textoSuave,fontFamily:'inherit'}}>
                  Cartão {c}
                </button>
              ))}
              <button onClick={lancar} style={{marginLeft:'auto',
                padding:'7px 20px',border:'none',borderRadius:8,
                background:`linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,
                color:'#fff',fontSize:13,fontWeight:600,
                cursor:'pointer',fontFamily:'inherit'}}>
                + Lançar
              </button>
            </div>
            {erroForm && (
              <div style={{marginTop:6,fontSize:11,color:COR.vermelho,
                background:'#fee2e2',padding:'4px 10px',borderRadius:6}}>
                ⚠ {erroForm}
              </div>
            )}
          </div>

          {/* Busca */}
          <div style={{padding:'8px 16px 4px',background:COR.branco,
            borderBottom:`1px solid ${COR.borda}`,flexShrink:0}}>
            <input value={busca} onChange={e=>setBusca(e.target.value)}
              placeholder="🔍 Buscar lançamento..."
              style={{...inputSt,background:'#f8faff'}}/>
          </div>

          {/* Lista */}
          <div style={{flex:1,overflowY:'auto',padding:'8px 16px'}}>
            {datasOrdenadas.length===0 && (
              <div style={{textAlign:'center',padding:'40px 0',
                color:COR.textoSuave,fontSize:13}}>
                Nenhum lançamento para {contaInfo.nome} em {NOMES_MESES[mesAtual]}.
              </div>
            )}
            {datasOrdenadas.map(data => (
              <div key={data}>
                <div style={{display:'flex',alignItems:'center',gap:8,
                  margin:'10px 0 5px 2px'}}>
                  <span style={{fontSize:10,color:'#94a3b8',fontWeight:600,
                    textTransform:'uppercase',letterSpacing:.5,whiteSpace:'nowrap'}}>
                    {data===dataHoje()?'Hoje':data===dataOntem()?'Ontem':''}{' '}{fmtDataBR(data)}
                  </span>
                  <div style={{flex:1,height:1,background:COR.borda}}/>
                  <span style={{fontSize:10,color:'#94a3b8',whiteSpace:'nowrap'}}>
                    {grupos[data].length} lançamento{grupos[data].length>1?'s':''}
                  </span>
                </div>
                {grupos[data].map(l => (
                  <div key={l.id}
                    style={{display:'flex',alignItems:'center',gap:8,
                      padding:'8px 10px',borderRadius:8,marginBottom:3,
                      background:l.tipoLanc==='fixa'?'#f0f9ff':COR.branco,
                      border:`1px solid ${l.tipoLanc==='fixa'?'#bae6fd':COR.borda}`}}
                    onMouseEnter={e=>(e.currentTarget.style.background=l.tipoLanc==='fixa'?'#e0f2fe':'#f8faff')}
                    onMouseLeave={e=>(e.currentTarget.style.background=l.tipoLanc==='fixa'?'#f0f9ff':COR.branco)}>
                    <div style={{width:30,height:30,borderRadius:8,flexShrink:0,
                      display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,
                      background:l.tipoLanc==='fixa'?'#e0f2fe':l.tipo==='entrada'?'#f0fdf4':'#fff1f2'}}>
                      {l.tipoLanc==='fixa'?'📌':l.tipo==='entrada'?'↑':'↓'}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:500,color:COR.texto,
                        display:'flex',alignItems:'center',gap:5,flexWrap:'wrap'}}>
                        {l.descricao}
                        <span style={{fontSize:9,padding:'1px 5px',borderRadius:3,fontWeight:600,
                          background:l.tipoLanc==='fixa'?'#e0f2fe':'#f1f5f9',
                          color:l.tipoLanc==='fixa'?'#0369a1':'#64748b'}}>
                          {l.tipoLanc==='fixa'?'fixa ✓':'variável'}
                        </span>
                      </div>
                      <div style={{fontSize:10,color:'#94a3b8',marginTop:1,
                        display:'flex',alignItems:'center',gap:4}}>
                        {l.categoria} <BadgePag l={l}/>
                      </div>
                    </div>
                    <div style={{fontSize:13,fontWeight:600,whiteSpace:'nowrap',
                      color:l.tipo==='entrada'?COR.verde:COR.texto}}>
                      {l.tipo==='entrada'?'+':'-'}{fmt(l.valor)}
                    </div>
                    <button onClick={() => excluir(l)}
                      style={{border:'none',background:'transparent',cursor:'pointer',
                        color:'#cbd5e1',fontSize:14,padding:'2px 4px',
                        borderRadius:4,flexShrink:0}}
                      onMouseEnter={e=>(e.currentTarget.style.color=COR.vermelho)}
                      onMouseLeave={e=>(e.currentTarget.style.color='#cbd5e1')}>✕</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}