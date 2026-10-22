import type { Conta } from '../../context/AppContext'
import { fmt, type DadosMes } from './FcShared'
import KpiCard from '../KpiCard'
import { IconeCat } from '../IconeCat'

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

  // O status vive dentro de um KpiCard AZUL-ESCURO (#0f2878 -> #1e40af). As cores
  // antigas eram de fundo claro e sumiam: #16a34a 2,65, #0369a1 1,47 (azul sobre
  // azul), #b45309 1,74. Estas mantêm o sentido de cada uma e passam no extremo
  // claro #1e40af: verde 5,01 (o mesmo de Lançamentos e do Radar), azul-claro
  // 6,14, âmbar-claro 6,05.
  const statusCor = faturaStatus === 'paga' ? '#4ade80' : faturaStatus === 'fechada' ? '#bfdbfe' : '#fcd34d'
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
          <KpiCard icon="ti-credit-card" label="Limite planejado" value={fmt(totalPrevisto)}
            sublabel="por mês" style={{ flex: 1 }} />
          <KpiCard label="Total de todas as faturas" value={fmt(grandTotalFaturas)}
            valueColor={grandTotalFaturas > 0 ? '#f87171' : '#4ade80'}
            sublabel="lançado" style={{ flex: 1 }} />
          <KpiCard icon="ti-equal" label="Disponível" value={fmt(disponivel)}
            valueColor={disponivel >= 0 ? '#4ade80' : '#f87171'}
            sublabel={disponivel >= 0 ? '↑ no limite' : '↓ excedido'} style={{ flex: 1 }} />
          <KpiCard icon={statusSimb} label="Status" value={statusLbl}
            valueColor={statusCor} sublabel={`Vence dia ${diaVencimento}`} style={{ flex: 1 }} />
          {/* Conciliação: o mesmo cartão dos outros quatro, do mesmo tamanho e
              com as mesmas letras (pedido do Guilherme, 22/10/2026). Tocar abre
              a janela do valor da fatura. Diferença na paleta do fundo escuro:
              #86efac 4,8 e #fecaca 4,6 no #1e40af. */}
          <div role="button" tabIndex={0} aria-label="Informar o valor da fatura"
            onClick={abrirModal}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirModal() } }}
            style={{ flex: 1, display: 'flex', cursor: 'pointer' }}>
            <KpiCard icon="ti-arrows-exchange" label="Conciliação"
              value={mesDados.faturaAtual || 'Informar ✎'}
              valueColor={mesDados.faturaAtual ? '#fff' : 'rgba(255,255,255,.75)'}
              style={{ flex: 1 }}>
              <div style={{
                fontSize: 12, marginTop: 4, textAlign: 'right',
                color: diferenca === null ? 'rgba(255,255,255,.75)' : conciliado ? '#86efac' : '#fecaca',
              }}>
                {diferenca === null ? 'para conferir a diferença' : conciliado ? '✓ Conciliado'
                  : `diferença ${diferenca > 0 ? '+' : '-'}${fmt(Math.abs(diferenca))}`}
              </div>
            </KpiCard>
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
                  <IconeCat icone={c.icone} /> {c.banco}
                </button>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
