import type { Conta } from '../../context/AppContext'
import { fmt, NOMES_MESES } from './NleShared'
import KpiCard from '../KpiCard'
import { OndasTopo } from '../mobile/ui'
import { iconeDesenhado } from '../../utils/iconeDesenhado'
import { textoConferido } from '../../utils/conferirSaldos'
import { valorNaMascara } from '../../utils/moeda'

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
  /** Conferido sem valor digitado ("Confere" na Início): a data, ou null. */
  conferidoEm?: string | null
  /** Banco: o que ainda não tem bolinha de conferido (utils/conferirExtrato).
   *  null na carteira e no mês futuro. */
  faltaConferir?: { liquido: number; qtd: number } | null
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
  saldoBancoNum, conferidoEm = null, faltaConferir = null,
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
  // Sem valor digitado, o banco mostra o CONFERIDO pelas bolinhas, como a
  // fatura (19/11/2026, decisão do Guilherme: "igual ao cartão").
  const pelasBolinhas = diferenca === null && !conferidoEm && faltaConferir !== null
  const conferidoValor = pelasBolinhas ? saldoMes - faltaConferir!.liquido : null
  const tudoConferido = pelasBolinhas && faltaConferir!.qtd === 0
  const textoFalta = !pelasBolinhas ? '' : tudoConferido ? '✓ tudo conferido'
    : Math.abs(faltaConferir!.liquido) >= 0.005 ? `falta conferir ${fmt(Math.abs(faltaConferir!.liquido))}`
    : `falta conferir ${faltaConferir!.qtd} ${faltaConferir!.qtd === 1 ? 'lançamento' : 'lançamentos'}`

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
    setModalSaldoValor(isDinheiro ? '' : valorNaMascara(saldoMes))
    if (isDinheiro) {
      setModalSaldo({ contaId: 'dinheiro', banco: 'Dinheiro', icone: '💵', cor: '#16a34a', key: chaveAtual })
    } else if (contaInfo) {
      setModalSaldo({ contaId: contaIdEfetivo, banco: contaInfo.banco, icone: contaInfo.icone, cor: contaInfo.cor, key: chaveAtual })
    }
  }

  return (
    <div style={{ background: 'linear-gradient(180deg, #070c18 0%, #111c3f 35%, #1e40af 100%)', position: 'relative', overflow: 'hidden', padding: '10px 28px 58px', display: 'flex', alignItems: 'flex-start', flexShrink: 0, gap: 8 }}>
      <OndasTopo />

      {/* Left: 4 stat boxes + bank selectors */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Número no cartão azul é BRANCO (24/10/2026, Guilherme: "número
              branco nos card azul, e onde for branco usamos o verde e laranja"). */}
          <KpiCard icon="ti-wallet" label={saldoBasePrevisto ? 'Saldo inicial previsto' : 'Saldo inicial'} value={fmt(saldoBase)}
            valueColor="#fff"
            sublabel={`${NOMES_MESES[mes]} ${ano}`} vidro style={{ flex: 1 }} />
          <KpiCard icon="ti-arrow-up" label="Entradas" value={fmt(totalEntradas)}
            valueColor="#fff" sublabel={saldoBasePrevisto ? 'previstas' : 'lançadas'} vidro style={{ flex: 1 }} />
          <KpiCard icon="ti-arrow-down" label="Saídas" value={fmt(totalSaidas)}
            valueColor="#fff" sublabel={saldoBasePrevisto ? 'previstas' : 'lançadas'} vidro style={{ flex: 1 }} />
          <KpiCard icon="ti-equal" label={saldoBasePrevisto ? 'Saldo previsto' : 'Saldo no Compass One'} value={fmt(saldoMes)}
            valueColor="#fff"
            sublabel={saldoMes >= 0 ? '↑ positivo' : '↓ negativo'} vidro style={{ flex: 1 }} />
          {/* O saldo que o banco (ou a carteira) mostra, no MESMO cartão dos
              outros, como a "Fatura do cartão" (22/10/2026, pedido do
              Guilherme: "Conciliação" confundia). A diferença vai em palavras,
              contra o Saldo no Compass One ao lado; a pílula diz que o cartão abre a
              caixa de saldo. #86efac 4,8 e #fdba74 5,2 no #1e40af. */}
          <div role="button" tabIndex={0} aria-label={isDinheiro ? 'Informar o saldo em dinheiro' : 'Informar o saldo do banco'}
            title={isDinheiro ? 'Clique para informar quanto tem em dinheiro' : 'Clique para informar o saldo que aparece no banco'}
            onClick={abrirModal}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirModal() } }}
            style={{ flex: 1, display: 'flex', cursor: 'pointer' }}>
            <KpiCard icon={isDinheiro ? 'ti-wallet' : 'ti-building-bank'}
              label={isDinheiro ? 'Saldo em dinheiro' : 'Saldo no banco'}
              destaque={saldoBancoNum !== null ? 'Manual' : conferidoEm || pelasBolinhas ? 'Conferido' : undefined}
              value={saldoBancoNum !== null ? fmt(saldoBancoNum) : conferidoEm ? fmt(saldoMes) : conferidoValor !== null ? fmt(conferidoValor) : '—'}
              vidro style={{ flex: 1 }}>
              <div style={{
                fontSize: 12, marginTop: 4, textAlign: 'right',
                color: pelasBolinhas ? (tudoConferido ? '#86efac' : '#fff')
                  : diferenca === null && !conferidoEm ? 'rgba(255,255,255,.75)' : diferenca === null || conciliado ? '#86efac' : '#fff',
              }}>
                {pelasBolinhas ? textoFalta : diferenca === null ? (conferidoEm ? textoConferido(conferidoEm) : 'não informado') : conciliado ? '✓ igual ao Compass'
                  : diferenca > 0 ? `falta lançar ${fmt(diferenca)}` : `${fmt(-diferenca)} a mais no Compass`}
              </div>
              <div style={{ textAlign: 'right', marginTop: 6 }}>
                <span style={{
                  display: 'inline-block', whiteSpace: 'nowrap', color: '#fff',
                  background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.45)',
                  borderRadius: 999, padding: '2px 10px', fontSize: 12, fontWeight: 700,
                }}>{saldoBancoNum !== null || conferidoEm ? '✎ Alterar valor' : isDinheiro ? '✎ Informar saldo' : '✎ Informar saldo banco'}</span>
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
                <button key={c.id} onClick={() => onContaSelect(c.id)} aria-pressed={ativo} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 16px', borderRadius: 999, cursor: 'pointer', border: 'none',
                  background: ativo ? '#fff' : 'rgba(255,255,255,.14)',
                  color: ativo ? '#0b2545' : '#fff',
                  fontSize: 14, fontWeight: 700, fontFamily: 'inherit', transition: 'all .15s',
                }}>
                  <i aria-hidden className={`ti ${iconeDesenhado(c.icone) ?? 'ti-building-bank'}`} style={{ fontSize: 14, lineHeight: 1 }} /> {c.banco}
                </button>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
