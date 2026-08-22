import { useState, useEffect } from 'react'
import MesesSelector from './MesesSelector'
import { MESES_FULL, type AnoData, fmt } from './types'

export interface BulkOp {
  tipo: 'e' | 's'
  ri: number
  mi: number
  valor: number
}

interface Props {
  toolAberta: 'copiar' | 'valor' | 'reajuste' | 'ano' | null
  mesAtual: number
  anoAtual: number
  dadosPrevisto: AnoData
  dadosAnoAnterior: AnoData | null
  categorias: any[]
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
  toolAberta, mesAtual, anoAtual, dadosPrevisto, dadosAnoAnterior, categorias,
  onBulkSave, onClose,
}: Props) {
  const defaultMeses = () => Array.from({ length: 12 }, (_, i) => i > mesAtual)

  const [toast, setToast] = useState<string | null>(null)

  // Copiar mês
  const [origemMes, setOrigemMes] = useState(mesAtual)
  const [copiarMeses, setCopiarMeses] = useState(defaultMeses)
  const [copiarReceitas, setCopiarReceitas] = useState(true)
  const [copiarDespesas, setCopiarDespesas] = useState(true)

  // Aplicar valor
  const [valorTipo, setValorTipo] = useState<'e' | 's'>('s')
  const [valorRi, setValorRi] = useState(0)
  const [valorStr, setValorStr] = useState('')
  const [valorMeses, setValorMeses] = useState(defaultMeses)

  // Reajuste
  const [reajTipo, setReajTipo] = useState<'aumento' | 'reducao'>('aumento')
  const [reajPct, setReajPct] = useState('')
  const [reajFiltro, setReajFiltro] = useState<'todas' | 'fixas' | 'variaveis'>('todas')
  const [reajMeses, setReajMeses] = useState(defaultMeses)

  useEffect(() => {
    setCopiarMeses(defaultMeses())
    setValorMeses(defaultMeses())
    setReajMeses(defaultMeses())
    setOrigemMes(mesAtual)
    setValorRi(0)
    setValorStr('')
    setReajPct('')
  }, [toolAberta])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function getMesesDest(sel: boolean[]) {
    return sel.reduce<number[]>((acc, v, i) => v ? [...acc, i] : acc, [])
  }

  function aplicarCopia() {
    const dest = getMesesDest(copiarMeses)
    if (!dest.length) return
    const ops: BulkOp[] = []
    if (copiarReceitas)
      dadosPrevisto.entradas.forEach((cat, ri) =>
        dest.forEach(mi => ops.push({ tipo: 'e', ri, mi, valor: cat.v[origemMes] })))
    if (copiarDespesas)
      dadosPrevisto.saidas.forEach((cat, ri) =>
        dest.forEach(mi => ops.push({ tipo: 's', ri, mi, valor: cat.v[origemMes] })))
    onBulkSave(ops)
    showToast(`Valores copiados para ${dest.length} ${dest.length === 1 ? 'mês' : 'meses'} ✓`)
  }

  function aplicarValor() {
    const dest = getMesesDest(valorMeses)
    if (!dest.length || !valorStr) return
    const valor = parseFloat(valorStr.replace(/\./g, '').replace(',', '.'))
    if (isNaN(valor)) return
    const lista = valorTipo === 'e' ? dadosPrevisto.entradas : dadosPrevisto.saidas
    if (!lista[valorRi]) return
    onBulkSave(dest.map(mi => ({ tipo: valorTipo, ri: valorRi, mi, valor })))
    showToast(`${fmt(valor)} aplicado em ${dest.length} ${dest.length === 1 ? 'mês' : 'meses'} ✓`)
  }

  function aplicarReajuste() {
    const dest = getMesesDest(reajMeses)
    const pct = parseFloat(reajPct)
    if (!dest.length || isNaN(pct) || pct <= 0) return
    const fator = reajTipo === 'aumento' ? 1 + pct / 100 : 1 - pct / 100
    const ops: BulkOp[] = []

    const round2 = (n: number) => Math.round(n * 100) / 100

    if (reajFiltro === 'todas')
      dadosPrevisto.entradas.forEach((cat, ri) =>
        dest.forEach(mi => { if (cat.v[mi] > 0) ops.push({ tipo: 'e', ri, mi, valor: round2(cat.v[mi] * fator) }) }))

    dadosPrevisto.saidas.forEach((cat, ri) => {
      if (reajFiltro !== 'todas') {
        const info = categorias.find((c: any) => c.id === cat.id || c.nome === cat.nome)
        const ehFixa = info?.fixa === true
        if (reajFiltro === 'fixas' && !ehFixa) return
        if (reajFiltro === 'variaveis' && ehFixa) return
      }
      dest.forEach(mi => { if (cat.v[mi] > 0) ops.push({ tipo: 's', ri, mi, valor: round2(cat.v[mi] * fator) }) })
    })

    onBulkSave(ops)
    showToast(`Reajuste de ${pct}% aplicado ✓`)
  }

  function aplicarCopiaAno() {
    if (!dadosAnoAnterior) return
    const ops: BulkOp[] = []
    dadosAnoAnterior.entradas.forEach(cat => {
      const ri = dadosPrevisto.entradas.findIndex(c => (c.id && c.id === cat.id) || c.nome === cat.nome)
      if (ri < 0) return
      cat.v.forEach((valor, mi) => ops.push({ tipo: 'e', ri, mi, valor }))
    })
    dadosAnoAnterior.saidas.forEach(cat => {
      const ri = dadosPrevisto.saidas.findIndex(c => (c.id && c.id === cat.id) || c.nome === cat.nome)
      if (ri < 0) return
      cat.v.forEach((valor, mi) => ops.push({ tipo: 's', ri, mi, valor }))
    })
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

        {/* ── Copiar mês ── */}
        {toolAberta === 'copiar' && (
          <>
            <div style={TITLE}>📋 Copiar planejamento de um mês</div>
            <div style={DESC}>Copia os valores planejados de um mês para os meses selecionados.</div>

            <div style={{ marginBottom: 14 }}>
              <label style={LABEL}>Copiar de:</label>
              <select value={origemMes} onChange={e => setOrigemMes(+e.target.value)} style={INPUT}>
                {MESES_FULL.map((m, mi) => (
                  <option key={mi} value={mi}>{m}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={LABEL}>Copiar para:</label>
              <MesesSelector mesAtual={mesAtual} selecionados={copiarMeses} onChange={setCopiarMeses} />
            </div>

            <div style={{ display: 'flex', gap: 20, marginBottom: 18 }}>
              {([['Receitas', copiarReceitas, setCopiarReceitas], ['Despesas', copiarDespesas, setCopiarDespesas]] as const).map(([lbl, val, set]) => (
                <label key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} />
                  {lbl}
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button style={BTN_OK} onClick={aplicarCopia}>Aplicar cópia</button>
              <button style={BTN_CANCEL} onClick={onClose}>Cancelar</button>
            </div>
          </>
        )}

        {/* ── Aplicar valor ── */}
        {toolAberta === 'valor' && (
          <>
            <div style={TITLE}>💱 Aplicar valor fixo</div>
            <div style={DESC}>Define um valor específico para uma categoria em múltiplos meses.</div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={LABEL}>Tipo:</label>
                <select value={valorTipo} onChange={e => { setValorTipo(e.target.value as 'e' | 's'); setValorRi(0) }} style={INPUT}>
                  <option value="e">Receitas</option>
                  <option value="s">Despesas</option>
                </select>
              </div>
              <div style={{ flex: 2 }}>
                <label style={LABEL}>Categoria:</label>
                <select value={valorRi} onChange={e => setValorRi(+e.target.value)} style={INPUT}>
                  {(valorTipo === 'e' ? dadosPrevisto.entradas : dadosPrevisto.saidas).map((cat, ri) => (
                    <option key={ri} value={ri}>{cat.descricao ? `${cat.nome} · ${cat.descricao}` : cat.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={LABEL}>Valor (R$):</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={valorStr}
                onChange={e => setValorStr(e.target.value)}
                style={INPUT}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={LABEL}>Aplicar nos meses:</label>
              <MesesSelector mesAtual={mesAtual} selecionados={valorMeses} onChange={setValorMeses} />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button style={BTN_OK} onClick={aplicarValor}>Aplicar valor</button>
              <button style={BTN_CANCEL} onClick={onClose}>Cancelar</button>
            </div>
          </>
        )}

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
                  Copia todos os valores planejados de {anoAtual - 1} para {anoAtual}.<br />
                  Os valores atuais serão substituídos.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={BTN_OK} onClick={aplicarCopiaAno}>Confirmar cópia de {anoAtual - 1}</button>
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
