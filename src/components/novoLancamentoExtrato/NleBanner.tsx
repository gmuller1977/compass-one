import type { Conta } from '../../context/AppContext'
import { fmt, parseBRL, NOMES_MESES } from './NleShared'
import KpiCard from '../KpiCard'

type ModalSaldoInfo = { contaId: string; banco: string; icone: string; cor: string; key: string }

type Props = {
  isMobile: boolean
  tabPrincipal: 'extrato' | 'cartao' | 'dinheiro' | 'consolidado'
  saldoBase: number
  totalEntradas: number
  totalSaidas: number
  saldoMes: number
  mes: number
  ano: number
  // Saldo banco salvo (mesDados.saldoBanco)
  saldoBancoSalvo: string
  // Modal handlers
  setModalSaldo: (v: ModalSaldoInfo | null) => void
  setModalSaldoValor: (v: string) => void
  saldoSugerido: Record<string, string>
  // Bancos
  contasExtrato: Conta[]
  contaIdEfetivo: string
  onContaSelect: (id: string) => void
}

export default function NleBanner({
  isMobile, tabPrincipal,
  saldoBase, totalEntradas, totalSaidas, saldoMes,
  mes, ano,
  saldoBancoSalvo,
  setModalSaldo, setModalSaldoValor, saldoSugerido,
  contasExtrato, contaIdEfetivo, onContaSelect,
}: Props) {
  if (isMobile || (tabPrincipal !== 'extrato' && tabPrincipal !== 'dinheiro')) return null

  const isDinheiro = tabPrincipal === 'dinheiro'
  const contaInfo  = contasExtrato.find(c => c.id === contaIdEfetivo)
  const mesStr     = String(mes + 1).padStart(2, '0')
  const chaveAtual = isDinheiro ? `dinheiro-${ano}-${mesStr}` : `${contaIdEfetivo}-${ano}-${mesStr}`

  const saldoBancoNum = parseBRL(saldoBancoSalvo)
  const diferenca     = saldoBancoNum > 0 ? saldoBancoNum - saldoMes : null
  const conciliado    = diferenca !== null && Math.abs(diferenca) < 0.01

  function abrirModal() {
    if (isDinheiro) {
      setModalSaldoValor('')
      setModalSaldo({ contaId: 'dinheiro', banco: 'Dinheiro', icone: '💵', cor: '#16a34a', key: chaveAtual })
    } else if (contaInfo) {
      setModalSaldoValor(saldoSugerido[contaIdEfetivo] ?? '')
      setModalSaldo({ contaId: contaIdEfetivo, banco: contaInfo.banco, icone: contaInfo.icone, cor: contaInfo.cor, key: chaveAtual })
    }
  }

  return (
    <div style={{ background: '#f8faff', borderBottom: '1px solid #e2e8f0', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', flexShrink: 0, gap: 8 }}>

      {/* Left: 4 stat boxes + bank selectors */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <KpiCard icon="💰" label="Saldo inicial" value={fmt(saldoBase)}
            sublabel={`${NOMES_MESES[mes]} ${ano}`} style={{ flex: 1 }} />
          <KpiCard icon="↑" label="Entradas" value={fmt(totalEntradas)}
            valueColor="#4ade80" sublabel="lançadas" style={{ flex: 1 }} />
          <KpiCard icon="↓" label="Saídas" value={fmt(totalSaidas)}
            valueColor="#f87171" sublabel="lançadas" style={{ flex: 1 }} />
          <KpiCard icon="=" label="Saldo atual" value={fmt(saldoMes)}
            valueColor={saldoMes >= 0 ? '#fff' : '#f87171'}
            sublabel={saldoMes >= 0 ? '↑ positivo' : '↓ negativo'} style={{ flex: 1 }} />
        </div>

        {/* Bank selector buttons */}
        {tabPrincipal === 'extrato' && contasExtrato.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
            {contasExtrato.map(c => {
              const ativo = c.id === contaIdEfetivo
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

      {/* Right: Conciliação — clique abre modal */}
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
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,.6)' }}>{isDinheiro ? 'Saldo em dinheiro' : 'Saldo no banco'}</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: saldoBancoSalvo ? '#fff' : 'rgba(255,255,255,.4)', fontVariantNumeric: 'tabular-nums' }}>
            {saldoBancoSalvo || <span style={{ fontSize: 11, fontStyle: 'italic' }}>Informar ✎</span>}
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
