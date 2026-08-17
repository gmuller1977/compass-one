import type { Conta } from '../../context/AppContext'
import { COR, type DadosMes } from './NleShared'

type TabPrincipal = 'extrato' | 'cartao' | 'dinheiro' | 'consolidado'
type MobileStep   = 'tipo' | 'conta' | 'extrato'

type ModalSaldoInfo = {
  contaId: string; banco: string; icone: string; cor: string; key: string
}

type Props = {
  isMobile: boolean
  mobileStep: MobileStep
  setMobileStep: (v: MobileStep) => void
  tabPrincipal: TabPrincipal
  setTabPrincipal: (v: TabPrincipal) => void
  contasExtrato: Conta[]
  contas: Conta[]
  setContaId: (id: string) => void
  setMobileCartaoId: (id: string) => void
  setMobileView: (v: 'extrato' | 'form') => void
  mes: number
  ano: number
  dados: Record<string, DadosMes>
  hojeStr: string
  diaHoje: number
  mesHoje: number
  anoHoje: number
  resetarParaNovo: (dia: number) => void
  diaDefaultPara: (mes: number, ano: number) => number
  setModalSaldo: (v: ModalSaldoInfo | null) => void
  setModalSaldoValor: (v: string) => void
  mesKey: (conta: string, ano: number, mes: number) => string
  saldoSugerido: Record<string, string>
}

export default function NleMobileWizard({
  isMobile, mobileStep, setMobileStep,
  tabPrincipal, setTabPrincipal,
  contasExtrato, contas,
  setContaId, setMobileCartaoId, setMobileView,
  mes, ano, dados, hojeStr,
  resetarParaNovo, diaDefaultPara,
  setModalSaldo, setModalSaldoValor, mesKey, saldoSugerido,
}: Props) {
  if (!isMobile) return null

  /* ── STEP TIPO ── */
  if (mobileStep === 'tipo') {
    return (
      <div style={{position:'fixed',top:52,left:0,right:0,bottom:60,background:COR.fundo,zIndex:50,overflowY:'auto'}}>
        <div style={{padding:'28px 16px 16px'}}>
          <h2 style={{fontSize:20,fontWeight:800,color:COR.texto,margin:0}}>O que deseja ver?</h2>
          <p style={{fontSize:13,color:COR.textoSuave,marginTop:4,marginBottom:24}}>Selecione o tipo de extrato</p>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {([
              {tipo:'extrato'     as const, icone:'🏦', label:'Banco',             desc: contasExtrato.length > 0 ? contasExtrato.slice(0,2).map(c=>c.banco).join(', ')+(contasExtrato.length>2?' ...':'') : 'Extrato bancário'},
              {tipo:'cartao'      as const, icone:'💳', label:'Cartão de Crédito', desc:'Faturas e gastos no cartão'},
              {tipo:'dinheiro'    as const, icone:'💵', label:'Dinheiro',           desc:'Lançamentos em espécie'},
              {tipo:'consolidado' as const, icone:'📊', label:'Resumo mensal',      desc:'Resumo de todas as contas e movimentações'},
            ] as const).map(({tipo,icone,label,desc}) => (
              <button key={tipo} onClick={() => {
                setTabPrincipal(tipo)
                if (tipo === 'extrato') {
                  if (contasExtrato.length === 1) {
                    const c = contasExtrato[0]
                    setContaId(c.id)
                    resetarParaNovo(diaDefaultPara(mes, ano))
                    const k = mesKey(c.id, ano, mes)
                    if (dados[k]?.saldoBancoData !== hojeStr) {
                      setModalSaldoValor(saldoSugerido[c.id] ?? '')
                      setModalSaldo({contaId:c.id, banco:c.banco, icone:c.icone, cor:c.cor, key:k})
                    }
                    setMobileView('extrato'); setMobileStep('extrato')
                  } else {
                    setMobileStep('conta')
                  }
                } else if (tipo === 'cartao') {
                  const cartoes = contas.filter(c => c.tipo === 'cartao')
                  if (cartoes.length === 1) {
                    setMobileCartaoId(cartoes[0].id); setMobileView('extrato'); setMobileStep('extrato')
                  } else {
                    setMobileStep('conta')
                  }
                } else {
                  setMobileView('extrato'); setMobileStep('extrato')
                }
              }} style={{
                background:COR.branco,border:`1.5px solid ${COR.borda}`,borderRadius:14,
                padding:'16px 20px',display:'flex',alignItems:'center',gap:16,
                cursor:'pointer',fontFamily:'inherit',textAlign:'left',width:'100%',
                boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
              }}>
                <span style={{fontSize:32,lineHeight:1}}>{icone}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:700,color:COR.texto}}>{label}</div>
                  <div style={{fontSize:12,color:COR.textoSuave,marginTop:2}}>{desc}</div>
                </div>
                <span style={{fontSize:20,color:'#cbd5e1',fontWeight:300}}>›</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* ── STEP CONTA ── */
  if (mobileStep === 'conta') {
    return (
      <div style={{position:'fixed',top:52,left:0,right:0,bottom:60,background:COR.fundo,zIndex:50,overflowY:'auto'}}>
        <div style={{padding:'16px 16px 0',display:'flex',alignItems:'center',gap:8,borderBottom:`1px solid ${COR.borda}`,paddingBottom:12,background:COR.branco}}>
          <button onClick={() => setMobileStep('tipo')}
            style={{border:'none',background:'transparent',color:COR.azul,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',padding:0}}>
            ← Voltar
          </button>
          <span style={{fontSize:14,fontWeight:600,color:COR.texto}}>
            {tabPrincipal === 'cartao' ? 'Selecione o cartão' : 'Selecione o banco'}
          </span>
        </div>
        <div style={{padding:'16px',display:'flex',flexDirection:'column',gap:10}}>
          {tabPrincipal === 'cartao' ? (
            contas.filter(c => c.tipo === 'cartao').map(c => (
              <button key={c.id} onClick={() => {
                setMobileCartaoId(c.id)
                setMobileView('extrato'); setMobileStep('extrato')
              }} style={{
                background:COR.branco,border:`1.5px solid ${COR.borda}`,borderRadius:14,
                padding:'16px 20px',display:'flex',alignItems:'center',gap:14,
                cursor:'pointer',fontFamily:'inherit',textAlign:'left',width:'100%',
                boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
              }}>
                <div style={{width:40,height:40,borderRadius:10,background:c.cor+'22',border:`1.5px solid ${c.cor}55`,
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{c.icone}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:700,color:COR.texto}}>{c.banco}</div>
                  {c.apelido && <div style={{fontSize:12,color:COR.textoSuave,marginTop:2}}>{c.apelido}</div>}
                </div>
                <span style={{fontSize:20,color:'#cbd5e1',fontWeight:300}}>›</span>
              </button>
            ))
          ) : (
            contasExtrato.map(c => (
              <button key={c.id} onClick={() => {
                setContaId(c.id)
                resetarParaNovo(diaDefaultPara(mes, ano))
                const k = mesKey(c.id, ano, mes)
                if (dados[k]?.saldoBancoData !== hojeStr) {
                  setModalSaldoValor(dados[k]?.saldoBanco ?? '')
                  setModalSaldo({contaId:c.id, banco:c.banco, icone:c.icone, cor:c.cor, key:k})
                }
                setMobileView('extrato'); setMobileStep('extrato')
              }} style={{
                background:COR.branco,border:`1.5px solid ${COR.borda}`,borderRadius:14,
                padding:'16px 20px',display:'flex',alignItems:'center',gap:14,
                cursor:'pointer',fontFamily:'inherit',textAlign:'left',width:'100%',
                boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
              }}>
                <div style={{width:40,height:40,borderRadius:10,background:c.cor+'22',border:`1.5px solid ${c.cor}55`,
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{c.icone}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:700,color:COR.texto}}>{c.banco}</div>
                  <div style={{fontSize:12,color:COR.textoSuave,marginTop:2}}>{c.nome}</div>
                </div>
                <span style={{fontSize:20,color:'#cbd5e1',fontWeight:300}}>›</span>
              </button>
            ))
          )}
        </div>
      </div>
    )
  }

  return null
}
