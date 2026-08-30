import type { FaturaCartao } from '../../pages/ResumoMensal'
import { NOMES_MESES_RM } from '../../pages/ResumoMensal'

type Props = {
  faturas: FaturaCartao[]
  hoje: Date
  fmt: (v: number) => string
}

function SecaoHeader({ titulo }: { titulo: string }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg,#312e81,#4c1d95)',
      borderRadius: '12px 12px 0 0',
      padding: '13px 20px',
      color: '#fff',
    }}>
      <span style={{ fontSize: 14, fontWeight: 700 }}>{titulo}</span>
    </div>
  )
}

export default function RmFaturas({ faturas, hoje, fmt }: Props) {
  const mesNome = NOMES_MESES_RM[hoje.getMonth()]
  const diaHoje = hoje.getDate()

  return (
    <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
      <SecaoHeader titulo={`💳 Faturas de ${mesNome}`} />
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderTop: 0, borderRadius: '0 0 12px 12px', padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {faturas.map(({ conta, fatura }) => {
            // Sem limite por cartao: o planejamento e por total de cartoes. O
            // agregado fica no bloco Patrimonio; aqui cada cartao mostra a propria
            // fatura e o vencimento.
            const vence      = conta.diaVencimento ?? 0
            const diasAte    = vence - diaHoje
            const vencido    = diasAte < 0

            return (
              <div key={conta.id} style={{
                background: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: 12, padding: '16px 18px',
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  💳 {conta.apelido ?? conta.nome}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                  <span>Fatura:</span><b style={{ color: '#0f172a', fontSize: 14, fontWeight: 700 }}>{fmt(fatura)}</b>
                </div>
                {vence > 0 && (
                  <div style={{
                    fontSize: 10, marginTop: 6,
                    color: vencido ? '#dc2626' : (diasAte < 5 ? '#b45309' : '#94a3b8'),
                    fontWeight: vencido || diasAte < 5 ? 600 : 400,
                  }}>
                    {vencido ? 'Vencido!' : diasAte < 5 ? `Vence em ${diasAte} dias!` : `Vence dia ${vence}`}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
