import type { Conta } from '../../context/AppContext'
import { fmt, NOMES_MESES } from './NleShared'
import KpiCard from '../KpiCard'
import { RADAR_COR_AZUL } from '../acompanhamento/radarCores'
import { IconeCat } from '../IconeCat'

type ModalSaldoInfo = { contaId: string; banco: string; icone: string; cor: string; key: string }

type Props = {
  isMobile: boolean
  tabPrincipal: 'extrato' | 'cartao' | 'dinheiro' | 'consolidado'
  saldoBase: number
  /** O saldo inicial veio de projecao, nao do realizado. */
  saldoBasePrevisto?: boolean
  totalEntradas: number
  totalSaidas: number
  saldoMes: number
  mes: number
  ano: number
  /** O informado de verdade (utils/saldoInformado), ou null. */
  saldoBancoNum: number | null
  // Modal handlers
  setModalSaldo: (v: ModalSaldoInfo | null) => void
  setModalSaldoValor: (v: string) => void
  // Bancos
  contasExtrato: Conta[]
  contaIdEfetivo: string
  onContaSelect: (id: string) => void
}

export default function NleBanner({
  isMobile, tabPrincipal,
  saldoBase, saldoBasePrevisto, totalEntradas, totalSaidas, saldoMes,
  mes, ano,
  saldoBancoNum,
  setModalSaldo, setModalSaldoValor,
  contasExtrato, contaIdEfetivo, onContaSelect,
}: Props) {
  if (isMobile || (tabPrincipal !== 'extrato' && tabPrincipal !== 'dinheiro')) return null

  const isDinheiro = tabPrincipal === 'dinheiro'
  const contaInfo  = contasExtrato.find(c => c.id === contaIdEfetivo)
  const mesStr     = String(mes + 1).padStart(2, '0')
  const chaveAtual = isDinheiro ? `dinheiro-${ano}-${mesStr}` : `${contaIdEfetivo}-${ano}-${mesStr}`

  const diferenca     = saldoBancoNum !== null ? saldoBancoNum - saldoMes : null
  const conciliado    = diferenca !== null && Math.abs(diferenca) < 0.01

  /**
   * O modal sugere o SALDO ATUAL — o mesmo numero da caixa logo acima dele.
   *
   * Vinha de `saldoSugerido`, uma terceira conta que faz
   * `saldoInicial do cadastro + lancamentos DO MES`: ela ignora os meses
   * anteriores, as fixas confirmadas e a fatura. Numa conta com historico o
   * numero sugerido nao era o de tela nenhuma.
   *
   * A pergunta da conciliacao e "achamos que voce tem X, quanto o banco diz?".
   * O X tem de ser o X que a tela mostra.
   */
  function abrirModal() {
    setModalSaldoValor(fmt(saldoMes))
    if (isDinheiro) {
      setModalSaldo({ contaId: 'dinheiro', banco: 'Dinheiro', icone: '💵', cor: '#16a34a', key: chaveAtual })
    } else if (contaInfo) {
      setModalSaldo({ contaId: contaIdEfetivo, banco: contaInfo.banco, icone: contaInfo.icone, cor: contaInfo.cor, key: chaveAtual })
    }
  }

  return (
    <div style={{ background: '#f8faff', borderBottom: '1px solid #e2e8f0', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', flexShrink: 0, gap: 8 }}>

      {/* Left: 4 stat boxes + bank selectors */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Os quatro valores leem a MESMA paleta do Radar: entradas verde,
              saídas vermelho, e os saldos verde se positivos e vermelho se
              negativos — pedido do Guilherme, para as duas telas falarem igual. */}
          <KpiCard icon="ti-wallet" label={saldoBasePrevisto ? 'Saldo inicial previsto' : 'Saldo inicial'} value={fmt(saldoBase)}
            valueColor={saldoBase >= 0 ? RADAR_COR_AZUL.bom : RADAR_COR_AZUL.ruim}
            sublabel={`${NOMES_MESES[mes]} ${ano}`} style={{ flex: 1 }} />
          <KpiCard icon="ti-arrow-up" label="Entradas" value={fmt(totalEntradas)}
            valueColor={RADAR_COR_AZUL.bom} sublabel={saldoBasePrevisto ? 'previstas' : 'lançadas'} style={{ flex: 1 }} />
          <KpiCard icon="ti-arrow-down" label="Saídas" value={fmt(totalSaidas)}
            valueColor={RADAR_COR_AZUL.ruim} sublabel={saldoBasePrevisto ? 'previstas' : 'lançadas'} style={{ flex: 1 }} />
          <KpiCard icon="ti-equal" label={saldoBasePrevisto ? 'Saldo previsto' : 'Saldo atual'} value={fmt(saldoMes)}
            valueColor={saldoMes >= 0 ? RADAR_COR_AZUL.bom : RADAR_COR_AZUL.ruim}
            sublabel={saldoMes >= 0 ? '↑ positivo' : '↓ negativo'} style={{ flex: 1 }} />
          {/* O saldo que o banco (ou a carteira) mostra, no MESMO cartão dos
              outros, como a "Fatura do cartão" (22/10/2026, pedido do
              Guilherme: "Conciliação" confundia). A diferença vai em palavras,
              contra o Saldo atual ao lado; a pílula diz que o cartão abre a
              caixa de saldo. #86efac 4,8 e #fdba74 5,2 no #1e40af. */}
          <div role="button" tabIndex={0} aria-label={isDinheiro ? 'Informar o saldo em dinheiro' : 'Informar o saldo do banco'}
            title={isDinheiro ? 'Clique para informar quanto tem em dinheiro' : 'Clique para informar o saldo que aparece no banco'}
            onClick={abrirModal}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirModal() } }}
            style={{ flex: 1, display: 'flex', cursor: 'pointer' }}>
            <KpiCard icon={isDinheiro ? 'ti-wallet' : 'ti-building-bank'}
              label={isDinheiro ? 'Saldo em dinheiro' : 'Saldo no banco'}
              value={saldoBancoNum !== null ? fmt(saldoBancoNum) : '—'}
              style={{ flex: 1 }}>
              <div style={{
                fontSize: 12, marginTop: 4, textAlign: 'right',
                color: diferenca === null ? 'rgba(255,255,255,.75)' : conciliado ? '#86efac' : '#fdba74',
              }}>
                {diferenca === null ? 'não informado' : conciliado ? '✓ igual ao Compass'
                  : diferenca > 0 ? `falta lançar ${fmt(diferenca)}` : `${fmt(-diferenca)} a mais no Compass`}
              </div>
              <div style={{ textAlign: 'right', marginTop: 6 }}>
                <span style={{
                  display: 'inline-block', whiteSpace: 'nowrap', color: '#fff',
                  background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.45)',
                  borderRadius: 999, padding: '2px 10px', fontSize: 12, fontWeight: 700,
                }}>{saldoBancoNum !== null ? '✎ Alterar' : '✎ Informar'}</span>
              </div>
            </KpiCard>
          </div>
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
