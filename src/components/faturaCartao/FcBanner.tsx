import type { Conta } from '../../context/AppContext'
import { fmt, NOMES_MESES, type DadosMes } from './FcShared'
import KpiCard from '../KpiCard'
import { IconeCat } from '../IconeCat'
import type { LadoCompass, LadoBanco } from '../../utils/conferirFatura'

type Props = {
  contasCartao: Conta[]
  contaId: string
  onContaSelect: (id: string) => void
  totalPrevisto: number
  /** Mês da fatura (o do vencimento), 0–11. */
  mes: number
  grandTotalFaturas: number
  totalFatura: number
  mesDados: DadosMes
  lado: { compass: LadoCompass; banco: LadoBanco }
  abrirFatura: () => void
}

export default function FcBanner({
  contasCartao, contaId, onContaSelect,
  totalPrevisto, mes, grandTotalFaturas,
  totalFatura, mesDados, lado, abrirFatura,
}: Props) {
  const disponivel = totalPrevisto - grandTotalFaturas

  // O status saiu daqui para o lado do mês, no cabeçalho (31/10/2026).
  const abrirModal = abrirFatura
  const informada = !!mesDados.faturaAtual
  const linha = (cor: string): React.CSSProperties => ({ fontSize: 12, marginTop: 4, textAlign: 'right', color: cor })

  return (
    <div style={{ background: '#f8faff', borderBottom: '1px solid #e2e8f0', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', flexShrink: 0, gap: 8 }}>

      {/* Left: 4 stat boxes + card pills */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <KpiCard icon="ti-credit-card" label="Limite planejado" value={fmt(totalPrevisto)}
            sublabel={`para o mês de ${NOMES_MESES[mes]}`} style={{ flex: 1 }} />
          <KpiCard label="Total de todas as faturas" value={fmt(grandTotalFaturas)}
            valueColor="#fff"
            sublabel="lançado" style={{ flex: 1 }} />
          <KpiCard icon="ti-equal" label="Disponível" value={fmt(disponivel)}
            valueColor="#fff"
            sublabel={disponivel >= 0 ? '↑ no limite' : '↓ excedido'} style={{ flex: 1 }} />
          {/* O lançado no Compass e a fatura do banco LADO A LADO (31/10/2026,
              pedido do Guilherme): embaixo do Compass, o andamento das
              bolinhas; embaixo do banco, a diferença, nas palavras do
              "Confira seus saldos". Clicar no banco abre a janela do valor. */}
          <KpiCard icon="ti-circle-check" label="Lançado no Compass" value={fmt(totalFatura)} style={{ flex: 1 }}>
            <div style={linha(lado.banco.estado === 'comparado' && lado.compass.estado === 'falta-conferir' ? '#fff' : 'rgba(255,255,255,.75)')}>
              {lado.compass.estado === 'sem-compras' ? 'nenhuma compra'
                : lado.banco.estado === 'comparado' && lado.compass.estado === 'falta-conferir'
                  ? `falta conferir ${fmt(lado.compass.falta)}`
                : `total das compras no cartão ${contasCartao.find(c => c.id === contaId)?.banco ?? ''}`}
            </div>
          </KpiCard>
          {/* Sem o valor do banco, este card SOMA as compras com bolinha
              (02/11/2026, Guilherme: "os conferidos já iriam somar e mostrar
              se falta algo"); o valor do banco é pedido no fim. */}
          <div role="button" tabIndex={0} aria-label="Informar o valor da fatura no banco" title="Clique para informar o valor da fatura no banco"
            onClick={abrirModal}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirModal() } }}
            style={{ flex: 1, display: 'flex', cursor: 'pointer' }}>
            <KpiCard icon={informada ? 'ti-building-bank' : 'ti-circle-check'}
              label={informada ? 'Fatura no banco' : 'Conferido'}
              value={informada ? mesDados.faturaAtual! : fmt(lado.compass.estado === 'falta-conferir' ? lado.compass.conferido
                : lado.compass.estado === 'tudo-conferido' ? totalFatura : 0)}
              valueColor="#fff" style={{ flex: 1 }}>
              {lado.banco.estado === 'comparado' && lado.banco.informadoEm && (
                <div style={linha('rgba(255,255,255,.75)')}>você informou em {lado.banco.informadoEm}</div>
              )}
              <div style={linha(lado.banco.estado === 'comparado' ? (lado.banco.igual ? '#86efac' : '#fff')
                : lado.compass.estado === 'tudo-conferido' ? '#86efac' : lado.compass.estado === 'falta-conferir' ? '#fff' : 'rgba(255,255,255,.75)')}>
                {lado.banco.estado === 'comparado'
                  ? (lado.banco.igual ? '✓ igual ao Compass'
                    : lado.banco.mudouDepois !== null
                      ? `depois ${lado.banco.mudouDepois > 0 ? 'entraram' : 'saíram'} ${fmt(Math.abs(lado.banco.mudouDepois))} no Compass`
                    : lado.banco.diferenca > 0 ? `falta lançar ${fmt(lado.banco.diferenca)}`
                    : `${fmt(-lado.banco.diferenca)} a mais no Compass`)
                  : lado.compass.estado === 'tudo-conferido' ? '✓ tudo conferido'
                  : lado.compass.estado === 'falta-conferir' ? `falta conferir ${fmt(lado.compass.falta)}`
                  : 'marque as bolinhas'}
              </div>
              <div style={{ textAlign: 'right', marginTop: 6 }}>
                <span style={{
                  display: 'inline-block', whiteSpace: 'nowrap', color: '#fff',
                  background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.45)',
                  borderRadius: 999, padding: '2px 10px', fontSize: 12, fontWeight: 700,
                }}>{!informada ? '✎ Informar o banco'
                  : lado.banco.estado === 'comparado' && lado.banco.mudouDepois !== null ? '✎ Atualizar o valor' : '✎ Alterar'}</span>
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
