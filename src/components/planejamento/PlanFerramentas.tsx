import { useState, useEffect, Fragment } from 'react'
import { MESES_FULL, SEM_GRUPO, agrupar, type AnoData, type Cat } from './types'
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
const INPUT: React.CSSProperties = { border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13, width: '100%', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }
const BTN_OK: React.CSSProperties = { background: '#1a56db', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const fmtR = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const BTN_CANCEL: React.CSSProperties = { background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }

export default function PlanFerramentas({
  toolAberta, mesAtual, anoAtual, dadosAtivos, dadosAnoAnterior,
  onBulkSave, onClose,
}: Props) {
  const [toast, setToast] = useState<string | null>(null)

  // Copiar ano com ATUALIZAÇÃO DE VALOR (22/10/2026, pedido do Guilherme: o
  // "Reajuste %" saiu). Duas portas: copiar igual, ou abrir uma tabela por
  // grupo com um % de atualização em cada (só aumento). Chave "e|grupo" ou
  // "s|grupo"; vazio = sem atualização.
  const [comAtualizacao, setComAtualizacao] = useState(false)
  const [pctGrupo, setPctGrupo] = useState<Record<string, string>>({})

  // Zerar: um mês (o primeiro que pode mudar) ou o ano, e um segundo toque
  // para confirmar, porque não há como desfazer.
  const primeiroZeravel = primeiroMesZeravel(anoAtual)
  const [zerarQual, setZerarQual] = useState<'mes' | 'ano'>('mes')
  const [zerarMes, setZerarMes] = useState(primeiroZeravel)
  const [zerarConfirma, setZerarConfirma] = useState(false)

  useEffect(() => {
    setComAtualizacao(false); setPctGrupo({})
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

  const chaveGrupo = (tipo: 'e' | 's', cat: Cat) => `${tipo}|${cat.grupo ?? SEM_GRUPO}`
  const fatorDe = (chave: string, usar = comAtualizacao) => {
    const pct = usar ? parseBRL(pctGrupo[chave] ?? '') : 0
    return pct > 0 ? 1 + pct / 100 : 1
  }

  // Com %, cada valor (ou cada item, menos os do Simulador, de preço
  // fechado) é atualizado, e o total segue a soma dos itens.
  const atualizar = (c: { valor: number; itens: ItemPlano[] | null }, fator: number) => {
    if (fator === 1) return c
    if (!c.itens) return { valor: Math.round(c.valor * fator * 100) / 100, itens: null }
    const novos = reajustarItens(c.itens, fator)
    return { valor: somaItens(novos), itens: novos }
  }

  /** Os grupos do ano anterior, com o total que a cópia leva (dos meses que
   * ela grava, sem as parcelas de compras). */
  const gruposDaCopia = (() => {
    if (!dadosAnoAnterior || primeiroMesCopia > 11) return []
    // "Fica em" é a soma do que a cópia GRAVA (a mesma `atualizar`, mês a
    // mês e categoria a categoria), não total × %: com os centavos e os itens
    // do Simulador, os dois podiam diferir.
    const linhas: { chave: string; tipo: 'e' | 's'; grupo: string; total: number; novo: number }[] = []
    for (const [tipo, lista] of [['e', dadosAnoAnterior.entradas], ['s', dadosAnoAnterior.saidas]] as const) {
      for (const l of agrupar(lista, tipo)) {
        if (l.k !== 'grupo') continue
        const chave = `${tipo}|${l.grupo}`
        const fator = fatorDe(chave)
        let total = 0, novo = 0
        for (const ri of l.ris) for (let mi = primeiroMesCopia; mi < 12; mi++) {
          const c = paraCopiarAno(lista[ri], mi)
          total += c.valor
          novo += atualizar(c, fator).valor
        }
        if (total > 0) linhas.push({ chave, tipo, grupo: l.grupo, total, novo })
      }
    }
    return linhas
  })()

  function aplicarCopiaAno(usar = comAtualizacao) {
    if (!dadosAnoAnterior || primeiroMesCopia > 11) return
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
        const fator = fatorDe(chaveGrupo(tipo, cat), usar)
        for (let mi = primeiroMesCopia; mi < 12; mi++) ops.push({ tipo, ri, mi, ...atualizar(paraCopiarAno(cat, mi), fator) })
      })
    copiar('e', dadosAnoAnterior.entradas, dadosAtivos.entradas)
    copiar('s', dadosAnoAnterior.saidas, dadosAtivos.saidas)
    onBulkSave(ops)
    showToast(usar ? `Planejamento de ${anoAtual - 1} copiado com atualização de valor ✓`
      : `Planejamento de ${anoAtual - 1} copiado ✓`)
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
                {primeiroMesCopia <= 11 && !comAtualizacao && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button style={BTN_OK} onClick={() => aplicarCopiaAno(false)}>Copiar {anoAtual - 1}</button>
                    <button style={BTN_OK} onClick={() => setComAtualizacao(true)}>Copiar com atualização</button>
                    <button style={BTN_CANCEL} onClick={onClose}>Cancelar</button>
                  </div>
                )}
                {primeiroMesCopia <= 11 && comAtualizacao && (
                  <>
                    <div style={{ fontSize: 12, color: '#475569', marginBottom: 10 }}>
                      Informe quanto cada grupo sobe, em %. Grupo sem percentual é copiado com o mesmo valor.
                    </div>
                    <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                      <table style={{ borderCollapse: 'collapse', fontSize: 13, minWidth: 420, width: '100%' }}>
                        <thead>
                          <tr style={{ color: '#475569', fontSize: 12, textAlign: 'left' }}>
                            <th style={{ padding: '6px 8px', fontWeight: 600 }}>Grupo</th>
                            <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Planejado {anoAtual - 1}</th>
                            <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Atualização</th>
                            <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Fica em {anoAtual}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gruposDaCopia.map((g, i) => {
                            const titulo = i === 0 || gruposDaCopia[i - 1].tipo !== g.tipo
                            return (
                              <Fragment key={g.chave}>
                                {titulo && (
                                  <tr><td colSpan={4} style={{ padding: '10px 8px 4px', fontSize: 11, fontWeight: 700, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: .5 }}>
                                    {g.tipo === 'e' ? 'Receitas' : 'Despesas'}
                                  </td></tr>
                                )}
                                <tr style={{ borderTop: '1px solid #e2e8f0' }}>
                                  <td style={{ padding: '6px 8px', color: '#0f172a' }}>{g.grupo === SEM_GRUPO ? 'Outras' : g.grupo}</td>
                                  <td style={{ padding: '6px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#334155' }}>{fmtR(g.total)}</td>
                                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                      <input inputMode="decimal" placeholder="0" aria-label={`Atualização de ${g.grupo === SEM_GRUPO ? 'Outras' : g.grupo} em %`}
                                        value={pctGrupo[g.chave] ?? ''}
                                        onChange={e => setPctGrupo(p => ({ ...p, [g.chave]: e.target.value }))}
                                        style={{ ...INPUT, width: 70, padding: '5px 8px', fontSize: 16, textAlign: 'right' }} />
                                      <span style={{ color: '#475569' }}>%</span>
                                    </span>
                                  </td>
                                  <td style={{ padding: '6px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#0f172a' }}>
                                    {fmtR(g.novo)}
                                  </td>
                                </tr>
                              </Fragment>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button style={BTN_OK} onClick={() => aplicarCopiaAno(true)}>Copiar com atualização</button>
                      <button style={BTN_OK} onClick={() => aplicarCopiaAno(false)}>Copiar sem atualização</button>
                      <button style={BTN_CANCEL} onClick={() => setComAtualizacao(false)}>Voltar</button>
                    </div>
                  </>
                )}
                {primeiroMesCopia > 11 && <button style={BTN_CANCEL} onClick={onClose}>Fechar</button>}
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
