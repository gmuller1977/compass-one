import type { Conta } from '../../context/AppContext'
import AlertaOrcamento from '../AlertaOrcamento'
import { COR, fmt, type DadosMes } from './NleShared'

type TabPrincipal = 'extrato' | 'cartao' | 'dinheiro' | 'consolidado'

type AlertaDesvio = {
  catNome: string
  totalGasto: number
  previsto: number
  valorAtual: number
  descricao: string
}

type ModalSaldoInfo = {
  contaId: string; banco: string; icone: string; cor: string; key: string
}

type Props = {
  isMobile: boolean
  tabPrincipal: TabPrincipal

  // Alerta orçamento
  alertaDesvio: AlertaDesvio | null
  setAlertaDesvio: (v: AlertaDesvio | null) => void
  mesLabel: string
  onAlertaRevisar: () => void
  onAlertaAjustarMes: (novoVal: number) => void

  // Sub-header
  contasExtrato: Conta[]
  contaIdEfetivo: string
  dados: Record<string, DadosMes>
  hojeStr: string
  mes: number
  ano: number
  mesNome: string
  setContaId: (id: string) => void
  setModalSaldo: (v: ModalSaldoInfo | null) => void
  setModalSaldoValor: (v: string) => void
  mesKey: (conta: string, ano: number, mes: number) => string
  saldoSugerido: Record<string, string>
  onMesAnterior: () => void
  onMesProximo: () => void

  // Saldo card
  isDinheiro: boolean
  contaInfo: Conta | undefined
  mesDados: DadosMes
  saldoMes: number
  diferenca: number | null
  conciliado: boolean
  chaveAtual: string
}

export default function NleMobileSubheader({
  isMobile, tabPrincipal,
  alertaDesvio, setAlertaDesvio, mesLabel,
  onAlertaRevisar, onAlertaAjustarMes,
  contasExtrato, contaIdEfetivo, dados, hojeStr, mes, ano, mesNome,
  setContaId, setModalSaldo, setModalSaldoValor, mesKey, saldoSugerido,
  onMesAnterior, onMesProximo,
  isDinheiro, contaInfo, mesDados, saldoMes, diferenca, conciliado, chaveAtual,
}: Props) {
  return (
    <>
      {/* ALERTA DE ORÇAMENTO */}
      {alertaDesvio && (
        <AlertaOrcamento
          catNome={alertaDesvio.catNome}
          previsto={alertaDesvio.previsto}
          totalGasto={alertaDesvio.totalGasto}
          valorAtual={alertaDesvio.valorAtual}
          descricao={alertaDesvio.descricao}
          mesLabel={mesLabel}
          onRevisar={onAlertaRevisar}
          onAjustarMes={onAlertaAjustarMes}
          onIgnorar={() => setAlertaDesvio(null)}
        />
      )}

      {/* SUB-HEADER MOBILE: bank pills + month nav */}
      {isMobile && tabPrincipal !== 'cartao' && (
        <div style={{background:COR.branco,borderBottom:`1px solid ${COR.borda}`,flexShrink:0}}>
          {tabPrincipal === 'extrato' && contasExtrato.length > 0 && (
            <div style={{display:'flex',gap:6,padding:'10px 14px',overflowX:'auto',scrollbarWidth:'none' as never}}>
              {contasExtrato.map(c => {
                const ativo = c.id === contaIdEfetivo
                return (
                  <button key={c.id} onClick={() => {
                    setContaId(c.id)
                    const k = mesKey(c.id, ano, mes)
                    if (dados[k]?.saldoBancoData !== hojeStr) {
                      setModalSaldoValor(saldoSugerido[c.id] ?? '')
                      setModalSaldo({contaId:c.id, banco:c.banco, icone:c.icone, cor:c.cor, key:k})
                    }
                  }} style={{
                    display:'flex',alignItems:'center',gap:5,
                    padding:'5px 12px',borderRadius:20,flexShrink:0,
                    border:`1.5px solid ${ativo?COR.azul:'#e2e8f0'}`,
                    background:ativo?'#eff6ff':'#f8faff',
                    cursor:'pointer',whiteSpace:'nowrap',
                    fontSize:11,fontWeight:500,color:ativo?COR.azul:'#64748b',
                  }}>
                    <span style={{width:7,height:7,borderRadius:'50%',background:c.cor,display:'inline-block'}}/>
                    {c.icone} {c.banco}
                  </button>
                )
              })}
            </div>
          )}
          {tabPrincipal === 'dinheiro' && (
            <div style={{padding:'10px 14px'}}>
              <span style={{fontSize:12,color:COR.azul,fontWeight:600}}>💵 Dinheiro em espécie</span>
            </div>
          )}
          {tabPrincipal === 'consolidado' && (
            <div style={{padding:'10px 14px'}}>
              <span style={{fontSize:12,color:COR.azul,fontWeight:600}}>📊 Visão consolidada</span>
            </div>
          )}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 14px 10px'}}>
            <button onClick={onMesAnterior}
              style={{width:32,height:32,borderRadius:10,border:'none',background:'#f0f4ff',
                display:'flex',alignItems:'center',justifyContent:'center',
                cursor:'pointer',fontSize:16,color:COR.azul,fontWeight:700}}>‹</button>
            <span style={{fontSize:15,fontWeight:700,color:COR.texto}}>{mesNome} {ano}</span>
            <button onClick={onMesProximo}
              style={{width:32,height:32,borderRadius:10,border:'none',background:'#f0f4ff',
                display:'flex',alignItems:'center',justifyContent:'center',
                cursor:'pointer',fontSize:16,color:COR.azul,fontWeight:700}}>›</button>
          </div>
        </div>
      )}

      {/* SALDO CARD — mobile only (extrato/dinheiro) */}
      {isMobile && (tabPrincipal==='extrato'||tabPrincipal==='dinheiro') && (
        <div style={{margin:'0 14px 10px',borderRadius:14,overflow:'hidden',
          boxShadow:'0 2px 12px rgba(0,0,0,.07)',flexShrink:0}}>
          {/* Banco (extrato) */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
            padding:'10px 14px',background:COR.branco,borderBottom:`1px solid #f0f4ff`}}
            onClick={e => {
              e.stopPropagation()
              setModalSaldoValor(isDinheiro ? '' : (saldoSugerido[contaIdEfetivo] ?? ''))
              isDinheiro
                ? setModalSaldo({contaId:'dinheiro', banco:'Dinheiro', icone:'💵', cor:COR.verde, key:chaveAtual})
                : setModalSaldo({contaId:contaIdEfetivo, banco:contaInfo?.banco??'', icone:contaInfo?.icone??'', cor:contaInfo?.cor??COR.azul, key:chaveAtual})
            }}>
            <span style={{fontSize:11,color:COR.textoSuave,fontWeight:500,display:'flex',alignItems:'center',gap:5}}>
              💰 {isDinheiro?'Dinheiro':(contaInfo?.banco??'Banco')} (extrato)
            </span>
            <span style={{fontSize:13,fontWeight:700,cursor:'pointer',
              color:mesDados.saldoBanco?COR.texto:'#94a3b8'}}>
              {mesDados.saldoBanco || <span style={{fontSize:11,fontStyle:'italic'}}>Informar ✎</span>}
            </span>
          </div>
          {/* Sistema */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
            padding:'10px 14px',background:COR.branco,borderBottom:`1px solid #f0f4ff`}}>
            <span style={{fontSize:11,color:COR.textoSuave,fontWeight:500,display:'flex',alignItems:'center',gap:5}}>
              📱 Sistema
            </span>
            <span style={{fontSize:13,fontWeight:700,color:COR.azul}}>{fmt(saldoMes)}</span>
          </div>
          {/* Diferença */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
            padding:'10px 14px',
            background:diferenca===null?COR.branco:conciliado?'#f0fdf4':'#fff1f2'}}>
            <span style={{fontSize:11,fontWeight:500,display:'flex',alignItems:'center',gap:5,
              color:diferenca===null?COR.textoSuave:conciliado?'#166534':'#991b1b'}}>
              {diferenca===null?'⚖':conciliado?'✓':'⚠'} Diferença
            </span>
            <span style={{fontSize:13,fontWeight:700,
              color:diferenca===null?COR.textoSuave:conciliado?'#166534':'#991b1b'}}>
              {diferenca===null?'—':conciliado?'✓ Conciliado':`${diferenca>0?'+':'-'}${fmt(Math.abs(diferenca))}`}
            </span>
          </div>
        </div>
      )}
    </>
  )
}
