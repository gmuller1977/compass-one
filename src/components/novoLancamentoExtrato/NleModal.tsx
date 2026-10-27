import ModalTopo from '../ModalTopo'
import { mascaraCentavos, trocarSinal } from '../../utils/moeda'

type ModalSaldoInfo = {
  contaId: string; banco: string; icone: string; cor: string; key: string
}

type Props = {
  modalSaldo: ModalSaldoInfo | null
  setModalSaldo: (v: ModalSaldoInfo | null) => void
  modalSaldoValor: string
  setModalSaldoValor: (v: string) => void
  confirmarModalSaldo: () => void
}

export default function NleModal({
  modalSaldo, setModalSaldo,
  modalSaldoValor, setModalSaldoValor,
  confirmarModalSaldo,
}: Props) {
  if (!modalSaldo) return null

  const ehDinheiro = modalSaldo.contaId === 'dinheiro'

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:1000,
      display:'flex',alignItems:'center',justifyContent:'center'}}
      onClick={() => setModalSaldo(null)}>
      <div role="dialog" aria-modal="true" aria-labelledby="nle-saldo-titulo"
        style={{background:'#fff',borderRadius:16,overflow:'hidden',width:400,maxWidth:'calc(100vw - 32px)',
        boxShadow:'0 20px 60px rgba(0,0,0,0.25)'}}
        onClick={e => e.stopPropagation()}>
        {/* O dinheiro nao tem banco nem conta: perguntar "saldo no banco" para
            quem esta conferindo a carteira e pedir a coisa errada. */}
        <ModalTopo icone={ehDinheiro ? 'ti-cash' : 'ti-building-bank'} rotulo={modalSaldo.banco}
          titulo={ehDinheiro ? 'Quanto você tem em espécie agora?' : 'Qual é o saldo atual no banco?'}
          id="nle-saldo-titulo" onFechar={() => setModalSaldo(null)}
          subtitulo={ehDinheiro
            ? 'Conte o que está na carteira para conferir se seus lançamentos estão batendo.'
            : 'Informe o saldo real da sua conta para conferir se seus lançamentos estão batendo.'} />
        <div style={{padding:'18px 24px 22px'}}>
        {/* Vírgula automática (27/10/2026, pedido do Guilherme). O banco
            aceita negativo, e o teclado numérico não tem "−": o botão troca o
            sinal. A carteira não fica negativa, então lá não há botão. */}
        <div style={{display:'flex',gap:8}}>
        {!ehDinheiro && (
          <button type="button" aria-label="Trocar o sinal (saldo negativo)" title="Saldo negativo"
            onClick={() => setModalSaldoValor(trocarSinal(modalSaldoValor))}
            style={{flexShrink:0,width:48,borderRadius:8,border:'1.5px solid #e2e8f0',background:'#f8faff',
              color:'#0f172a',fontSize:16,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>+/−</button>
        )}
        <input inputMode="numeric" autoFocus
          value={modalSaldoValor}
          onChange={e => setModalSaldoValor(mascaraCentavos(e.target.value, !ehDinheiro))}
          onFocus={e => e.target.select()}
          onKeyDown={e => {
            if (e.key === 'Enter') confirmarModalSaldo()
            if (e.key === 'Escape') setModalSaldo(null)
          }}
          placeholder="R$ 0,00"
          style={{flex:1,minWidth:0,width:'100%',border:`1.5px solid ${modalSaldo.cor}`,borderRadius:8,
            padding:'10px 14px',fontSize:16,fontWeight:700,color:'#0f172a',
            outline:'none',textAlign:'right',fontFamily:'inherit',boxSizing:'border-box'}}/>
        </div>
        <div style={{display:'flex',gap:10,marginTop:20}}>
          <button onClick={() => setModalSaldo(null)}
            style={{flex:1,padding:'10px',borderRadius:8,border:`1.5px solid #e2e8f0`,
              background:'#f8faff',color:'#64748b',fontSize:13,fontWeight:600,
              cursor:'pointer',fontFamily:'inherit'}}>
            Pular
          </button>
          <button onClick={confirmarModalSaldo}
            style={{flex:2,padding:'10px',borderRadius:8,border:'none',
              background:modalSaldo.cor,color:'#fff',fontSize:13,fontWeight:700,
              cursor:'pointer',fontFamily:'inherit'}}>
            Confirmar
          </button>
        </div>
        </div>
      </div>
    </div>
  )
}
