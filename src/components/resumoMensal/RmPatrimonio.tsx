import type { SaldoConta, FaturaCartao } from '../../pages/ResumoMensal'

type Props = {
  saldoAtualPorConta: SaldoConta[]
  faturaAtualPorCartao: FaturaCartao[]
  saldoDinheiro: number
  fmt: (v: number) => string
}

function SecaoHeader({ titulo }: { titulo: string }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg,#0f2878,#1a56db)',
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

function saldoCor(saldo: number) {
  if (saldo > 0) return '#4ade80'
  if (saldo === 0) return '#fbbf24'
  return '#f87171'
}

export default function RmPatrimonio({ saldoAtualPorConta, faturaAtualPorCartao, saldoDinheiro, fmt }: Props) {
  const totalContas = saldoAtualPorConta.reduce((s, c) => s + c.saldo, 0) + saldoDinheiro
  const totalFaturas = faturaAtualPorCartao.reduce((s, f) => s + f.fatura, 0)
  const patrimonio = totalContas - totalFaturas

  return (
    <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
      <SecaoHeader titulo="🏦 Patrimônio" />
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderTop: 0, borderRadius: '0 0 12px 12px', padding: 14 }}>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>

          {/* Contas bancárias */}
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8', letterSpacing: '.4px', textTransform: 'uppercase', marginBottom: 6 }}>
              CONTAS BANCÁRIAS
            </div>

            {/* Dinheiro */}
            <div style={{
              padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 7,
              borderBottom: '1px solid #f1f5f9',
              borderLeft: `3px solid ${saldoCor(saldoDinheiro)}`,
              borderRadius: 4, marginBottom: 3, fontSize: 12,
            }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>💵</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#1e293b' }}>Dinheiro</div>
                <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 1 }}>Carteira</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: saldoDinheiro >= 0 ? '#1a56db' : '#dc2626', textAlign: 'right', minWidth: 70 }}>
                {fmt(saldoDinheiro)}
              </div>
            </div>

            {saldoAtualPorConta.map(({ conta, saldo }) => (
              <div key={conta.id} style={{
                padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 7,
                borderBottom: '1px solid #f1f5f9',
                borderLeft: `3px solid ${saldoCor(saldo)}`,
                borderRadius: 4, marginBottom: 3, fontSize: 12,
              }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
                  {conta.icone || '🏦'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: '#1e293b' }}>{conta.apelido ?? conta.nome}</div>
                  <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 1 }}>{conta.banco}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: saldo >= 0 ? '#1a56db' : '#dc2626', textAlign: 'right', minWidth: 70 }}>
                  {fmt(saldo)}
                </div>
              </div>
            ))}

            <div style={{ padding: '8px 10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 7, borderRadius: 7, marginTop: 6, fontSize: 11 }}>
              <div style={{ flex: 1, fontWeight: 700, color: '#1e293b' }}>Total em contas</div>
              <div style={{ fontWeight: 800, color: '#1a56db', fontSize: 12 }}>{fmt(totalContas)}</div>
            </div>
          </div>

          {/* Cartões */}
          {faturaAtualPorCartao.length > 0 && (
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8', letterSpacing: '.4px', textTransform: 'uppercase', marginBottom: 6 }}>
                CARTÕES DE CRÉDITO
              </div>

              {faturaAtualPorCartao.map(({ conta, fatura }) => {
                const limite = conta.limiteCartao ?? 0
                const pct    = limite > 0 ? Math.min(100, Math.round((fatura / limite) * 100)) : 0
                const cor    = usoCor(pct)
                const disponivel = Math.max(0, limite - fatura)
                return (
                  <div key={conta.id} style={{
                    padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 7,
                    borderBottom: '1px solid #f1f5f9',
                    borderLeft: `3px solid ${cor}`,
                    borderRadius: 4, marginBottom: 3, fontSize: 12,
                  }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>💳</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: '#1e293b' }}>{conta.apelido ?? conta.nome}</div>
                      <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 1 }}>
                        {limite > 0 ? `${pct}% do limite · Disponível ${fmt(disponivel)}` : 'Sem limite cadastrado'}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', textAlign: 'right', minWidth: 70 }}>
                      {fmt(fatura)}
                    </div>
                  </div>
                )
              })}

              <div style={{ padding: '8px 10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 7, borderRadius: 7, marginTop: 6, fontSize: 11 }}>
                <div style={{ flex: 1, fontWeight: 700, color: '#1e293b' }}>Total faturas</div>
                <div style={{ fontWeight: 800, color: '#dc2626', fontSize: 12 }}>{fmt(totalFaturas)}</div>
              </div>
            </div>
          )}
        </div>

        {/* Patrimônio total */}
        <div style={{
          marginTop: 12, padding: '10px 14px',
          background: '#eff6ff', border: '2px solid #1a56db',
          borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>Patrimônio total</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: patrimonio >= 0 ? '#16a34a' : '#dc2626' }}>
            {fmt(patrimonio)}
          </span>
        </div>

      </div>
    </div>
  )
}
