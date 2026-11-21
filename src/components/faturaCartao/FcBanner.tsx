import { VALOR_OCULTO, valoresOcultos } from '../../utils/valoresOcultos'
import type { Conta } from '../../context/AppContext'
import { iconeDesenhado } from '../../utils/iconeDesenhado'
import { fmt, NOMES_MESES, type DadosMes } from './FcShared'
import KpiCard from '../KpiCard'
import { OndasTopo } from '../mobile/ui'
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
    <div style={{ background: 'linear-gradient(180deg, #070c18 0%, #111c3f 35%, #1e40af 100%)', position: 'relative', overflow: 'hidden', padding: '10px 28px 58px', display: 'flex', alignItems: 'flex-start', flexShrink: 0, gap: 8 }}>
      <OndasTopo />

      {/* Left: 4 stat boxes + card pills */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <KpiCard icon="ti-credit-card" label="Limite planejado" value={fmt(totalPrevisto)}
            sublabel={`para o mês de ${NOMES_MESES[mes]}`} vidro style={{ flex: 1 }} />
          <KpiCard label="Total de todas as faturas" value={fmt(grandTotalFaturas)}
            valueColor="#fff"
            sublabel="lançado" vidro style={{ flex: 1 }} />
          <KpiCard icon="ti-equal" label="Disponível" value={fmt(disponivel)}
            valueColor="#fff"
            sublabel={disponivel >= 0 ? '↑ no limite' : '↓ excedido'} vidro style={{ flex: 1 }} />
          {/* O lançado no Compass e a fatura do banco LADO A LADO (31/10/2026,
              pedido do Guilherme): embaixo do Compass, o andamento das
              bolinhas; embaixo do banco, a diferença, nas palavras do
              "Confira seus saldos". Clicar no banco abre a janela do valor. */}
          <KpiCard icon="ti-circle-check" label="Lançado no Compass" value={fmt(totalFatura)} vidro style={{ flex: 1 }}>
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
          <div role="button" tabIndex={0} aria-label={informada ? 'Alterar o valor da fatura' : 'Informar a fatura'} title="Clique para informar o valor da fatura no banco"
            onClick={abrirModal}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirModal() } }}
            style={{ flex: 1, display: 'flex', cursor: 'pointer' }}>
            <KpiCard icon={informada ? 'ti-building-bank' : 'ti-circle-check'}
              label={`Fatura no ${contasCartao.find(c => c.id === contaId)?.banco ?? 'banco'}`}
              destaque={informada ? 'Manual' : 'Conferido'}
              value={informada ? (valoresOcultos() ? VALOR_OCULTO : mesDados.faturaAtual!) : fmt(lado.compass.estado === 'falta-conferir' ? lado.compass.conferido
                : lado.compass.estado === 'tudo-conferido' ? totalFatura : 0)}
              valueColor="#fff" vidro style={{ flex: 1 }}>
              {/* Bem simples (06/11/2026, Guilherme): "Valor manual" ou
                  "Valor conferido", e embaixo só a diferença para o Compass. */}
              <div style={linha((lado.banco.estado === 'comparado' ? lado.banco.igual : lado.compass.estado === 'tudo-conferido') ? '#86efac'
                : lado.compass.estado === 'sem-compras' && lado.banco.estado !== 'comparado' ? 'rgba(255,255,255,.75)' : '#fff')}>
                {lado.banco.estado === 'comparado'
                  ? (lado.banco.igual ? '✓ igual ao Compass' : `diferença de ${fmt(Math.abs(lado.banco.diferenca))}`)
                  : lado.compass.estado === 'tudo-conferido' ? '✓ igual ao Compass'
                  : lado.compass.estado === 'falta-conferir' ? `diferença de ${fmt(lado.compass.falta)}`
                  : 'marque as bolinhas'}
              </div>
              <div style={{ textAlign: 'right', marginTop: 6 }}>
                <span style={{
                  display: 'inline-block', whiteSpace: 'nowrap', color: '#fff',
                  background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.45)',
                  borderRadius: 999, padding: '2px 10px', fontSize: 12, fontWeight: 700,
                }}>{informada ? '✎ Alterar valor' : '✎ Informar fatura'}</span>
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
                // O mesmo botão do seletor de bancos (NleBanner), 19/11/2026.
                <button key={c.id} onClick={() => onContaSelect(c.id)} aria-pressed={ativo} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 16px', borderRadius: 999, cursor: 'pointer', border: 'none',
                  background: ativo ? '#fff' : 'rgba(255,255,255,.14)',
                  color: ativo ? '#0b2545' : '#fff',
                  fontSize: 14, fontWeight: 700, fontFamily: 'inherit', transition: 'all .15s',
                }}>
                  <i aria-hidden className={`ti ${iconeDesenhado(c.icone) ?? 'ti-credit-card'}`} style={{ fontSize: 14, lineHeight: 1 }} /> {c.banco}
                </button>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
