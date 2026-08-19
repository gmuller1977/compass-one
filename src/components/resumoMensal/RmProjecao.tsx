import { NOMES_MESES_RM } from '../../pages/ResumoMensal'

type Props = {
  saldoContas: number
  receitasAReceber: number
  despesasPendentes: number
  totalFaturas: number
  mes: number
  fmt: (v: number) => string
}

function SecaoHeader({ titulo }: { titulo: string }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg,#0f172a,#1e293b)',
      borderRadius: '12px 12px 0 0',
      padding: '13px 20px',
      color: '#fff',
    }}>
      <span style={{ fontSize: 14, fontWeight: 700 }}>{titulo}</span>
    </div>
  )
}

export default function RmProjecao({ saldoContas, receitasAReceber, despesasPendentes, totalFaturas, mes, fmt }: Props) {
  const projecao = saldoContas + receitasAReceber - despesasPendentes - totalFaturas

  const mensagem = (() => {
    if (projecao > 1000) return {
      style: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a' },
      texto: '✅ Boa! Você deve fechar o mês com folga.',
    }
    if (projecao >= 0) return {
      style: { background: '#fffbeb', border: '1px solid #fde68a', color: '#d97706' },
      texto: '⚠️ Margem apertada. Evite gastos não planejados até o final do mês.',
    }
    return {
      style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' },
      texto: '⚠️ Projeção negativa. Revise despesas pendentes ou considere adiar pagamentos não essenciais.',
    }
  })()

  return (
    <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
      <SecaoHeader titulo={`🔮 Projeção de Fechamento — ${NOMES_MESES_RM[mes]}`} />
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderTop: 0, borderRadius: '0 0 12px 12px', padding: 20 }}>
        <div style={{ background: '#fff', border: '2px solid #1a56db', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: 14, color: '#475569' }}>
            <span>Saldo atual das contas</span>
            <span style={{ fontWeight: 700 }}>{fmt(saldoContas)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: 14, color: '#475569' }}>
            <span>+ Receitas a receber</span>
            <span style={{ fontWeight: 700, color: '#16a34a' }}>{fmt(receitasAReceber)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: 14, color: '#475569' }}>
            <span>- Despesas pendentes</span>
            <span style={{ fontWeight: 700, color: '#dc2626' }}>{fmt(despesasPendentes)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: 14, color: '#475569' }}>
            <span>- Faturas dos cartões</span>
            <span style={{ fontWeight: 700, color: '#dc2626' }}>{fmt(totalFaturas)}</span>
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            borderTop: '2px solid #e2e8f0', paddingTop: 10, marginTop: 6,
            fontWeight: 800, fontSize: 16,
          }}>
            <span style={{ color: '#1e293b' }}>= Saldo previsto final</span>
            <span style={{ color: projecao >= 0 ? '#16a34a' : '#dc2626' }}>
              {projecao < 0 ? `-${fmt(Math.abs(projecao))}` : fmt(projecao)}
            </span>
          </div>

          <div style={{ ...mensagem.style, marginTop: 12, padding: '10px 14px', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            {mensagem.texto}
          </div>
        </div>
      </div>
    </div>
  )
}
