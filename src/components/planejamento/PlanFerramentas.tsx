import { useState, useEffect } from 'react'
import MesesSelector from './MesesSelector'
import { MESES_FULL, type AnoData } from './types'
import type { Categoria } from '../../context/AppContext'
import { itensDoMes, reajustarItens, somaItens, paraCopiarAno, type ItemPlano } from '../../utils/itensPlano'
import { cadastroDaLinha } from '../acompanhamento/evolucaoCalcs'

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
  toolAberta: 'reajuste' | 'ano' | null
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
  categorias: Categoria[]
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
  toolAberta, mesAtual, anoAtual, dadosAtivos, dadosAnoAnterior, categorias,
  onBulkSave, onClose,
}: Props) {
  const defaultMeses = () => Array.from({ length: 12 }, (_, i) => i > mesAtual)

  const [toast, setToast] = useState<string | null>(null)

  // Reajuste
  const [reajTipo, setReajTipo] = useState<'aumento' | 'reducao'>('aumento')
  const [reajPct, setReajPct] = useState('')
  const [reajFiltro, setReajFiltro] = useState<'todas' | 'fixas' | 'variaveis'>('todas')
  const [reajMeses, setReajMeses] = useState(defaultMeses)

  useEffect(() => {
    setReajMeses(defaultMeses())
    setReajPct('')
  }, [toolAberta])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function getMesesDest(sel: boolean[]) {
    return sel.reduce<number[]>((acc, v, i) => v ? [...acc, i] : acc, [])
  }

  function aplicarReajuste() {
    const dest = getMesesDest(reajMeses)
    const pct = parseFloat(reajPct)
    if (!dest.length || isNaN(pct) || pct <= 0) return
    const fator = reajTipo === 'aumento' ? 1 + pct / 100 : 1 - pct / 100
    const ops: BulkOp[] = []

    const round2 = (n: number) => Math.round(n * 100) / 100
    // Mês com itens: o % vai em cada item (menos os do Simulador, de preço
    // fechado), e o total segue a soma deles.
    const reajustar = (tipo: 'e' | 's', ri: number, cat: { v: number[]; itens?: Record<number, ItemPlano[]> }, mi: number): BulkOp => {
      const itens = itensDoMes(cat, mi)
      if (!itens) return { tipo, ri, mi, valor: round2(cat.v[mi] * fator) }
      const novos = reajustarItens(itens, fator)
      return { tipo, ri, mi, valor: somaItens(novos), itens: novos }
    }

    if (reajFiltro === 'todas')
      dadosAtivos.entradas.forEach((cat, ri) =>
        dest.forEach(mi => { if (cat.v[mi] > 0) ops.push(reajustar('e', ri, cat, mi)) }))

    dadosAtivos.saidas.forEach((cat, ri) => {
      if (reajFiltro !== 'todas') {
        // Pelo id, depois pelo par (nome, variante): só o nome pegava o
        // cadastro da primeira variante ("Financiamento · Casa" no lugar de
        // "· Civic").
        const info = (cat.id ? categorias.find(c => c.id === cat.id) : undefined) ?? cadastroDaLinha(cat, categorias)
        const ehFixa = info?.fixa === true
        if (reajFiltro === 'fixas' && !ehFixa) return
        if (reajFiltro === 'variaveis' && ehFixa) return
      }
      dest.forEach(mi => { if (cat.v[mi] > 0) ops.push(reajustar('s', ri, cat, mi)) })
    })

    onBulkSave(ops)
    showToast(`Reajuste de ${pct}% aplicado ✓`)
  }

  /** Meses que a cópia do ano pode gravar: ano futuro, todos; ano corrente,
   * do mês de hoje em diante (os fechados guardam o plano com que foram
   * medidos); ano passado, nenhum. */
  const anoHoje = new Date().getFullYear()
  const primeiroMesCopia = anoAtual > anoHoje ? 0 : anoAtual === anoHoje ? mesAtual : 12

  function aplicarCopiaAno() {
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
        for (let mi = primeiroMesCopia; mi < 12; mi++) ops.push({ tipo, ri, mi, ...paraCopiarAno(cat, mi) })
      })
    copiar('e', dadosAnoAnterior.entradas, dadosAtivos.entradas)
    copiar('s', dadosAnoAnterior.saidas, dadosAtivos.saidas)
    onBulkSave(ops)
    showToast(`Planejamento de ${anoAtual - 1} copiado ✓`)
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

        {/* ── Reajuste % ── */}
        {toolAberta === 'reajuste' && (
          <>
            <div style={TITLE}>📈 Reajuste percentual</div>
            <div style={DESC}>Aplica um aumento ou redução percentual nos valores planejados.</div>

            <div style={{ display: 'flex', gap: 24, marginBottom: 14, flexWrap: 'wrap' }}>
              <div>
                <label style={LABEL}>Tipo:</label>
                {(['aumento', 'reducao'] as const).map(t => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', marginBottom: 4 }}>
                    <input type="radio" name="reajTipo" checked={reajTipo === t} onChange={() => setReajTipo(t)} />
                    {t === 'aumento' ? '↑ Aumento' : '↓ Redução'}
                  </label>
                ))}
              </div>
              <div>
                <label style={LABEL}>Percentual (%):</label>
                <input
                  type="number"
                  min="0.1" max="500" step="0.1"
                  placeholder="0.0"
                  value={reajPct}
                  onChange={e => setReajPct(e.target.value)}
                  style={{ ...INPUT, width: 100 }}
                />
              </div>
              <div>
                <label style={LABEL}>Aplicar em:</label>
                {([['todas', 'Todas as categorias'], ['fixas', 'Só despesas fixas'], ['variaveis', 'Só despesas variáveis']] as const).map(([v, l]) => (
                  <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', marginBottom: 4 }}>
                    <input type="radio" name="reajFiltro" checked={reajFiltro === v} onChange={() => setReajFiltro(v)} />
                    {l}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={LABEL}>Meses:</label>
              <MesesSelector mesAtual={mesAtual} selecionados={reajMeses} onChange={setReajMeses} />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button style={BTN_OK} onClick={aplicarReajuste}>Aplicar reajuste</button>
              <button style={BTN_CANCEL} onClick={onClose}>Cancelar</button>
            </div>
          </>
        )}

        {/* ── Copiar ano ── */}
        {toolAberta === 'ano' && (
          <>
            <div style={TITLE}>📅 Copiar ano anterior</div>
            {dadosAnoAnterior ? (
              <>
                <div style={DESC}>
                  {primeiroMesCopia > 11
                    ? <>Este ano já passou: o plano dele fica como foi medido.</>
                    : <>Copia os valores planejados de {anoAtual - 1} para {anoAtual}
                      {primeiroMesCopia > 0 ? `, de ${MESES_FULL[primeiroMesCopia]} a dezembro (os meses que já fecharam não mudam)` : ''}.<br />
                      Os valores desses meses serão substituídos. Parcelas de compras não são copiadas.</>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {primeiroMesCopia <= 11 && <button style={BTN_OK} onClick={aplicarCopiaAno}>Confirmar cópia de {anoAtual - 1}</button>}
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

      </div>
    </div>
  )
}
