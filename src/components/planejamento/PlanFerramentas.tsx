import { useState, useEffect } from 'react'
import { MESES_FULL, type AnoData } from './types'
import { reajustarItens, somaItens, paraCopiarAno, type ItemPlano } from '../../utils/itensPlano'
import { parseBRL } from '../../utils/moeda'
import { opsParaZerar, primeiroMesZeravel } from './zerarPlano'

/**
 * Com `itens`, o mês recebe o detalhe e o valor vira a soma dele; sem, grava
 * só o valor e o detalhe daquele mês sai (usePlanejamento.editarMultiplosValores).
 */
export interface BulkOp {
  tipo: 'e' | 's'
  ri: number
  mi: number
  valor: number
  itens?: ItemPlano[] | null
}

interface Props {
  toolAberta: 'ano' | 'zerar' | null
  mesAtual: number
  anoAtual: number
  /**
   * Dados da ABA CORRENTE — nao do previsto. As ferramentas leem valores daqui
   * (origem da copia, base do reajuste) e gravam na aba ativa; receber o
   * previsto enquanto se edita o Atualizado copiava numeros de um plano para
   * o outro.
   */
  dadosAtivos: AnoData
  dadosAnoAnterior: AnoData | null
  onBulkSave: (ops: BulkOp[]) => void
  onClose: () => void
}

const PANEL: React.CSSProperties = {
  background: '#fff', border: '2px solid #1a56db', borderRadius: 14,
  padding: '20px 24px', marginBottom: 12,
}
const TITLE: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }
const DESC: React.CSSProperties = { fontSize: 12, color: '#94a3b8', marginBottom: 16 }
const LABEL: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }
const INPUT: React.CSSProperties = { border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13, width: '100%', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }
const BTN_OK: React.CSSProperties = { background: '#1a56db', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const BTN_CANCEL: React.CSSProperties = { background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }

export default function PlanFerramentas({
  toolAberta, mesAtual, anoAtual, dadosAtivos, dadosAnoAnterior,
  onBulkSave, onClose,
}: Props) {
  const [toast, setToast] = useState<string | null>(null)

  // Reajuste na cópia do ano (22/10/2026, pedido do Guilherme: o botão
  // "Reajuste %" saiu e virou opção do Copiar ano). Vazio = copia igual.
  const [reajTipo, setReajTipo] = useState<'aumento' | 'reducao'>('aumento')
  const [reajPct, setReajPct] = useState('')

  // Zerar: um mês (o primeiro que pode mudar) ou o ano, e um segundo toque
  // para confirmar, porque não há como desfazer.
  const primeiroZeravel = primeiroMesZeravel(anoAtual)
  const [zerarQual, setZerarQual] = useState<'mes' | 'ano'>('mes')
  const [zerarMes, setZerarMes] = useState(primeiroZeravel)
  const [zerarConfirma, setZerarConfirma] = useState(false)

  useEffect(() => {
    setReajPct('')
    setZerarQual('mes'); setZerarMes(Math.min(primeiroZeravel, 11)); setZerarConfirma(false)
  }, [toolAberta, anoAtual])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  /** Meses que a cópia do ano pode gravar: ano futuro, todos; ano corrente,
   * do mês de hoje em diante (os fechados guardam o plano com que foram
   * medidos); ano passado, nenhum. */
  const anoHoje = new Date().getFullYear()
  const primeiroMesCopia = anoAtual > anoHoje ? 0 : anoAtual === anoHoje ? mesAtual : 12

  function aplicarCopiaAno() {
    if (!dadosAnoAnterior || primeiroMesCopia > 11) return
    const pct = parseBRL(reajPct)
    if (pct < 0 || (reajTipo === 'reducao' && pct >= 100)) return
    const fator = pct > 0 ? (reajTipo === 'aumento' ? 1 + pct / 100 : 1 - pct / 100) : 1
    // Com %, cada valor (ou cada item, menos os do Simulador, de preço
    // fechado) é reajustado, e o total segue a soma dos itens.
    const reajustar = (c: { valor: number; itens: ItemPlano[] | null }) => {
      if (fator === 1) return c
      if (!c.itens) return { valor: Math.round(c.valor * fator * 100) / 100, itens: null }
      const novos = reajustarItens(c.itens, fator)
      return { valor: somaItens(novos), itens: novos }
    }
    const ops: BulkOp[] = []
    // A linha do ano novo é achada pelo id, depois pelo par (nome, variante):
    // só o nome punha "Seguro · Civic" na linha de "Seguro · March".
    const achar = (lista: AnoData['entradas'], cat: AnoData['entradas'][number]) => {
      const porId = cat.id ? lista.findIndex(c => c.id === cat.id) : -1
      if (porId >= 0) return porId
      return lista.findIndex(c => c.nome === cat.nome && (c.descricao ?? '') === (cat.descricao ?? ''))
    }
    const copiar = (tipo: 'e' | 's', origem: AnoData['entradas'], destino: AnoData['entradas']) =>
      origem.forEach(cat => {
        const ri = achar(destino, cat)
        if (ri < 0) return
        for (let mi = primeiroMesCopia; mi < 12; mi++) ops.push({ tipo, ri, mi, ...reajustar(paraCopiarAno(cat, mi)) })
      })
    copiar('e', dadosAnoAnterior.entradas, dadosAtivos.entradas)
    copiar('s', dadosAnoAnterior.saidas, dadosAtivos.saidas)
    onBulkSave(ops)
    showToast(fator === 1 ? `Planejamento de ${anoAtual - 1} copiado ✓`
      : `Planejamento de ${anoAtual - 1} copiado com ${reajTipo === 'aumento' ? 'aumento' : 'redução'} de ${pct.toLocaleString('pt-BR')}% ✓`)
    onClose()
  }

  const mesesZerar = zerarQual === 'ano'
    ? Array.from({ length: 12 - primeiroZeravel }, (_, i) => primeiroZeravel + i)
    : [zerarMes]
  const nomeZerar = zerarQual === 'ano'
    ? (primeiroZeravel > 0 ? `${MESES_FULL[primeiroZeravel]} a dezembro de ${anoAtual}` : `todo o ano de ${anoAtual}`)
    : `${MESES_FULL[zerarMes]} de ${anoAtual}`

  function aplicarZerar() {
    onBulkSave(opsParaZerar(dadosAtivos, mesesZerar))
    showToast(`Plano de ${nomeZerar} zerado ✓`)
    onClose()
  }

  if (!toolAberta) return null

  return (
    <div style={{ marginBottom: 12 }}>
      <style>{`
        @keyframes planFadeDown { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }
        @keyframes planFadeUp   { from { opacity:0; transform:translateY(6px) }  to { opacity:1; transform:translateY(0) } }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
          background: '#1a56db', color: '#fff', borderRadius: 10,
          padding: '12px 20px', fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 20px rgba(26,86,219,.4)',
          animation: 'planFadeUp .2s ease',
        }}>
          {toast}
        </div>
      )}

      <div style={{ ...PANEL, animation: 'planFadeDown .2s ease' }}>

        {/* ── Copiar ano ── */}
        {toolAberta === 'ano' && (
          <>
            <div style={TITLE}><i aria-hidden className="ti ti-copy" style={{ fontSize: 17, verticalAlign: '-2px', marginRight: 6 }} />Copiar ano anterior</div>
            {dadosAnoAnterior ? (
              <>
                <div style={DESC}>
                  {primeiroMesCopia > 11
                    ? <>Este ano já passou: o plano dele fica como foi medido.</>
                    : <>Copia os valores planejados de {anoAtual - 1} para {anoAtual}
                      {primeiroMesCopia > 0 ? `, de ${MESES_FULL[primeiroMesCopia]} a dezembro (os meses que já fecharam não mudam)` : ''}.<br />
                      Os valores desses meses serão substituídos. Parcelas de compras não são copiadas.</>}
                </div>
                {primeiroMesCopia <= 11 && (
                  <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
                    <div>
                      <label style={LABEL}>Reajuste (opcional):</label>
                      <div style={{ display: 'flex', gap: 14 }}>
                        {(['aumento', 'reducao'] as const).map(t => (
                          <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                            <input type="radio" name="reajTipo" checked={reajTipo === t} onChange={() => setReajTipo(t)} />
                            {t === 'aumento' ? '↑ Aumento' : '↓ Redução'}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={LABEL}>Percentual (%):</label>
                      <input inputMode="decimal" placeholder="0" value={reajPct}
                        onChange={e => setReajPct(e.target.value)}
                        style={{ ...INPUT, width: 100, fontSize: 16 }} />
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  {primeiroMesCopia <= 11 && <button style={BTN_OK} onClick={aplicarCopiaAno}>
                    Confirmar cópia de {anoAtual - 1}{parseBRL(reajPct) > 0 ? ` com ${reajTipo === 'aumento' ? '+' : '−'}${reajPct.trim()}%` : ''}
                  </button>}
                  <button style={BTN_CANCEL} onClick={onClose}>Cancelar</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ ...DESC, color: '#ef4444' }}>
                  Nenhum planejamento encontrado para {anoAtual - 1}.
                </div>
                <button style={BTN_CANCEL} onClick={onClose}>Fechar</button>
              </>
            )}
          </>
        )}

        {/* ── Zerar ── */}
        {toolAberta === 'zerar' && (
          <>
            <div style={TITLE}><i aria-hidden className="ti ti-eraser" style={{ fontSize: 17, verticalAlign: '-2px', marginRight: 6 }} />Zerar o plano</div>
            {primeiroZeravel > 11 ? (
              <>
                <div style={DESC}>Este ano já passou: o plano dele fica como foi medido.</div>
                <button style={BTN_CANCEL} onClick={onClose}>Fechar</button>
              </>
            ) : (
              <>
                <div style={{ ...DESC, color: '#475569' }}>
                  Apaga os valores planejados de receitas e despesas, para você planejar de novo.
                  A meta de economia e os lançamentos não mudam.
                  {primeiroZeravel > 0 && ' Os meses que já fecharam não mudam.'}
                </div>
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                    <input type="radio" name="zerarQual" checked={zerarQual === 'mes'}
                      onChange={() => { setZerarQual('mes'); setZerarConfirma(false) }} />
                    Só o mês
                    <select value={zerarMes} disabled={zerarQual !== 'mes'}
                      onChange={e => { setZerarMes(Number(e.target.value)); setZerarConfirma(false) }}
                      style={{ ...INPUT, width: 'auto', padding: '6px 10px', fontSize: 16 }}>
                      {MESES_FULL.map((m, mi) => mi >= primeiroZeravel && <option key={mi} value={mi}>{m}</option>)}
                    </select>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                    <input type="radio" name="zerarQual" checked={zerarQual === 'ano'}
                      onChange={() => { setZerarQual('ano'); setZerarConfirma(false) }} />
                    {primeiroZeravel > 0 ? `De ${MESES_FULL[primeiroZeravel]} a dezembro` : `O ano inteiro`}
                  </label>
                </div>
                {zerarConfirma ? (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontSize: 13, color: '#7f1d1d', fontWeight: 600, marginBottom: 8 }}>
                      Zerar o plano de {nomeZerar}? Isso não dá para desfazer.
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button style={{ ...BTN_OK, background: '#b91c1c' }} onClick={aplicarZerar}>Sim, zerar</button>
                      <button style={BTN_CANCEL} onClick={() => setZerarConfirma(false)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button style={{ ...BTN_OK, background: '#b91c1c' }} onClick={() => setZerarConfirma(true)}>Zerar {nomeZerar}</button>
                    <button style={BTN_CANCEL} onClick={onClose}>Cancelar</button>
                  </div>
                )}
              </>
            )}
          </>
        )}

      </div>
    </div>
  )
}
