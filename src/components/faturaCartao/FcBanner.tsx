import type { Conta } from '../../context/AppContext'
import { fmt, type DadosMes } from './FcShared'
import KpiCard from '../KpiCard'

type Props = {
  contasCartao: Conta[]
  contaId: string
  onContaSelect: (id: string) => void
  totalPrevisto: number
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
  totalPrevisto, grandTotalFaturas,
  faturaStatus, diaVencimento,
  mesDados, diferenca, conciliado,
  setModalFatura, setModalFaturaValor,
}: Props) {
  const disponivel = totalPrevisto - grandTotalFaturas

  const statusCor = faturaStatus === 'paga' ? '#16a34a' : faturaStatus === 'fechada' ? '#0369a1' : '#d97706'
  const statusLbl = faturaStatus === 'paga' ? 'Paga' : faturaStatus === 'fechada' ? 'Fechada' : 'Aberta'
  const statusSimb = faturaStatus === 'paga' ? '✓' : faturaStatus === 'fechada' ? '■' : '●'

  function abrirModal() {
    setModalFaturaValor(mesDados.faturaAtual ?? '')
    setModalFatura(true)
  }

  return (
    <div style={{ background: '#f8faff', borderBottom: '1px solid #e2e8f0', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', flexShrink: 0, gap: 8 }}>

      {/* Left: 4 stat boxes + card pills */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <KpiCard icon="💳" label="Limite planejado" value={fmt(totalPrevisto)}
            sublabel="por mês" style={{ flex: 1 }} />
          <KpiCard label="Total de todas as faturas" value={fmt(grandTotalFaturas)}
            valueColor={grandTotalFaturas > 0 ? '#f87171' : '#4ade80'}
            sublabel="lançado" style={{ flex: 1 }} />
          <KpiCard icon="=" label="Disponível" value={fmt(disponivel)}
            valueColor={disponivel >= 0 ? '#4ade80' : '#f87171'}
            sublabel={disponivel >= 0 ? '↑ no limite' : '↓ excedido'} style={{ flex: 1 }} />
          <KpiCard icon={statusSimb} label="Status" value={statusLbl}
            valueColor={statusCor} sublabel={`Vence dia ${diaVencimento}`} style={{ flex: 1 }} />
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
