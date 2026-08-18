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
      padding: '11px 16px',
      color: '#fff',
    }}>
      <span style={{ fontSize: 12, fontWeight: 700 }}>{titulo}</span>
    </div>
  )
}

function usoCor(pct: number) {
  if (pct < 50) return '#4ade80'
  if (pct < 80) return '#fbbf24'
  return '#f87171'
}

export default function RmFaturas({ faturas, hoje, fmt }: Props) {
  const mesNome = NOMES_MESES_RM[hoje.getMonth()]
  const diaHoje = hoje.getDate()

  return (
    <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
      <SecaoHeader titulo={`💳 Faturas de ${mesNome}`} />
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderTop: 0, borderRadius: '0 0 12px 12px', padding: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
          {faturas.map(({ conta, fatura }) => {
            const limite    = conta.limiteCartao ?? 0
            const pct       = limite > 0 ? Math.min(100, Math.round((fatura / limite) * 100)) : 0
            const cor       = usoCor(pct)
            const disponivel = Math.max(0, limite - fatura)
            const vence     = conta.diaVencimento ?? 0
            const diasAte   = vence - diaHoje
            const vencido   = diasAte < 0

            return (
              <div key={conta.id} style={{
                background: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: 10, padding: 12,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                  💳 {conta.apelido ?? conta.nome}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginBottom: 2 }}>
                  <span>Fatura:</span><b style={{ color: '#1e293b' }}>{fmt(fatura)}</b>
                </div>
                {limite > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginBottom: 2 }}>
                      <span>Limite:</span><b style={{ color: '#1e293b' }}>{fmt(limite)}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginBottom: 6 }}>
                      <span>Disponível:</span><b style={{ color: '#16a34a' }}>{fmt(disponivel)}</b>
                    </div>
                    <div style={{ width: '100%', height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: cor, borderRadius: 4 }} />
                    </div>
                  </>
                )}
                {vence > 0 && (
                  <div style={{
                    fontSize: 8, marginTop: 4,
                    color: vencido ? '#dc2626' : (diasAte < 5 ? '#d97706' : '#94a3b8'),
                    fontWeight: vencido || diasAte < 5 ? 600 : 400,
                  }}>
                    {limite > 0 ? `${pct}% usado · ` : ''}
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
