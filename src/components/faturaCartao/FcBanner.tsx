import type { Conta } from '../../context/AppContext'
import { fmt, type DadosMes } from './FcShared'

type Props = {
  contasCartao: Conta[]
  contaId: string
  onContaSelect: (id: string) => void
  totalPrevisto: number
  totalFatura: number
  grandTotalFaturas: number
  faturaStatus: 'paga' | 'fechada' | 'aberta'
  diaVencimento: number
  mesDados: DadosMes
  diferenca: number | null
  conciliado: boolean
  setModalFatura: (v: boolean) => void
  setModalFaturaValor: (v: string) => void
}

export default function FcBanner({
  contasCartao, contaId, onContaSelect,
  totalPrevisto, totalFatura, grandTotalFaturas,
  faturaStatus, diaVencimento,
  mesDados, diferenca, conciliado,
  setModalFatura, setModalFaturaValor,
}: Props) {
  const disponivel = totalPrevisto - grandTotalFaturas

  const statusCor = faturaStatus === 'paga' ? '#16a34a' : faturaStatus === 'fechada' ? '#0369a1' : '#d97706'
  const statusLbl = faturaStatus === 'paga' ? 'Paga' : faturaStatus === 'fechada' ? 'Fechada' : 'Aberta'
  const statusSimb = faturaStatus === 'paga' ? '✓' : faturaStatus === 'fechada' ? '■' : '●'

  const boxStyle = {
    display: 'flex' as const, flexDirection: 'column' as const,
    background: 'linear-gradient(135deg,#0f2878,#1e40af)',
    border: '1px solid rgba(255,255,255,.15)', borderRadius: 12, padding: '12px 14px',
  }

  function abrirModal() {
    setModalFaturaValor(mesDados.faturaAtual ?? '')
    setModalFatura(true)
  }

  return (
    <div style={{ background: '#f8faff', borderBottom: '1px solid #e2e8f0', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', flexShrink: 0, gap: 8 }}>

      {/* Left: 4 stat boxes + card pills */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>

          <div style={{ ...boxStyle, flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.7)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>💳 Limite planejado</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-.4px' }}>{fmt(totalPrevisto)}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.55)', marginTop: 3 }}>por mês</div>
          </div>

          <div style={{ ...boxStyle, flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.7)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>↓ Total fatura</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: totalFatura > 0 ? '#fca5a5' : '#86efac', letterSpacing: '-.4px' }}>{fmt(totalFatura)}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.55)', marginTop: 3 }}>lançado</div>
          </div>

          <div style={{ ...boxStyle, flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.7)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>= Disponível</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: disponivel >= 0 ? '#86efac' : '#fca5a5', letterSpacing: '-.4px' }}>{fmt(disponivel)}</div>
            <div style={{ fontSize: 10, color: disponivel >= 0 ? '#86efac' : '#fca5a5', marginTop: 3 }}>{disponivel >= 0 ? '↑ no limite' : '↓ excedido'}</div>
          </div>

          <div style={{ ...boxStyle, flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.7)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>{statusSimb} Status</div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.4px', color: statusCor }}>{statusLbl}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.55)', marginTop: 3 }}>Vence dia {diaVencimento}</div>
          </div>

        </div>

        {/* Card selector pills */}
        {contasCartao.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
            {contasCartao.map(c => {
              const ativo = c.id === contaId
              return (
                <button key={c.id} onClick={() => onContaSelect(c.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                  border: `1.5px solid ${ativo ? c.cor : '#e2e8f0'}`,
                  background: ativo ? c.cor + '18' : '#fff',
                  color: ativo ? c.cor : '#64748b',
                  fontSize: 12, fontWeight: 600, fontFamily: 'inherit', transition: 'all .15s',
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.cor, flexShrink: 0 }} />
                  {c.icone} {c.banco}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Right: Conciliação */}
      <div
        onClick={abrirModal}
        style={{
          display: 'flex', flexDirection: 'column', gap: 8,
          background: 'linear-gradient(135deg,#0f2878,#1e40af)',
          border: '1px solid rgba(255,255,255,.15)', borderRadius: 12, padding: '12px 14px',
          flexShrink: 0, cursor: 'pointer', minWidth: 200,
          transition: 'opacity .15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '.85')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.7)', textTransform: 'uppercase', letterSpacing: .5 }}>🔄 Conciliação</div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,.6)' }}>Fatura informada</span>
          <span style={{ fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: mesDados.faturaAtual ? '#fff' : 'rgba(255,255,255,.4)' }}>
            {mesDados.faturaAtual || <span style={{ fontSize: 11, fontStyle: 'italic' }}>Informar ✎</span>}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,.6)' }}>Diferença</span>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, whiteSpace: 'nowrap' as const,
            background: diferenca === null ? 'rgba(100,116,139,.3)' : conciliado ? 'rgba(34,197,94,.2)' : 'rgba(239,68,68,.2)',
            color: diferenca === null ? 'rgba(255,255,255,.4)' : conciliado ? '#86efac' : '#fca5a5',
          }}>
            {diferenca === null ? '— informar' : conciliado ? '✓ Conciliado' : `${diferenca > 0 ? '+' : '-'}${fmt(Math.abs(diferenca))}`}
          </span>
        </div>
      </div>
    </div>
  )
}
