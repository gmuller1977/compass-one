import { useState } from 'react'
import MesesSelector from './MesesSelector'
import { MESES_FULL, fmt, parseValor } from './types'
import { COR } from '../../utils/cores'

interface Props {
  mesAtual: number
  /** Doze valores; zero significa "sem meta neste mês". */
  objetivos: number[]
  /** Resultado previsto de cada mês: entradas menos saídas. */
  sobraPrevista: number[]
  onSalvar: (objetivos: number[]) => void
  onFechar: () => void
}

/**
 * Quanto você quer que sobre em cada mês.
 *
 * O campo já existia no modelo — `PlanoAnoData.objetivos`, doze números, um por
 * mês — declarado, gravado a cada save e nunca lido nem escrito por ninguém.
 *
 * É por MÊS, e não um número só, porque dezembro não é fevereiro. Foi para isso
 * que `objetivos` nasceu array.
 */
export default function PlanModalMeta({
  mesAtual, objetivos, sobraPrevista, onSalvar, onFechar,
}: Props) {
  const [valorStr, setValorStr] = useState('')
  const [erro, setErro] = useState('')
  // O mês corrente ainda está acontecendo, então a meta dele vale. O seletor
  // bloqueia `mi <= mesAtual`; um a menos libera o mês de hoje em diante.
  const [meses, setMeses] = useState(() =>
    Array.from({ length: 12 }, (_, i) => i >= mesAtual))

  function salvar() {
    const v = parseValor(valorStr)
    if (v === null) return setErro(`"${valorStr.trim()}" não é um valor`)
    if (!meses.some(Boolean)) return setErro('Escolha ao menos um mês')
    onSalvar(objetivos.map((atual, i) => (meses[i] ? v : atual)))
    onFechar()
  }

  const definidos = objetivos
    .map((v, i) => ({ v, i }))
    .filter(o => o.v > 0)

  return (
    <div
      onClick={onFechar}
      style={{
        position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(15,23,42,.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: COR.branco, borderRadius: 14, padding: '22px 26px',
          width: '100%', maxWidth: 520, maxHeight: '86vh', overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,.25)',
        }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: COR.texto }}>
          🎯 Meta mensal
        </div>
        <div style={{ fontSize: 12, color: COR.textoSuave, marginTop: 4, marginBottom: 18 }}>
          Quanto você quer que sobre no fim de cada mês.
        </div>

        <label style={{ fontSize: 12, fontWeight: 600, color: COR.texto,
          display: 'block', marginBottom: 4 }}>
          Valor da meta
        </label>
        <input autoFocus value={valorStr} onChange={e => setValorStr(e.target.value)}
          placeholder="R$ 500,00" onKeyDown={e => e.key === 'Enter' && salvar()}
          style={{ border: `1px solid ${COR.borda}`, borderRadius: 8, padding: '9px 12px',
            fontSize: 14, width: 200, fontFamily: 'inherit', outline: 'none',
            boxSizing: 'border-box', color: COR.texto, background: COR.branco }} />
        <div style={{ fontSize: 11, color: COR.textoSuave, marginTop: 5 }}>
          Zero apaga a meta dos meses escolhidos.
        </div>

        <div style={{ fontSize: 12, fontWeight: 600, color: COR.texto,
          margin: '16px 0 6px' }}>
          Aplicar em quais meses
        </div>
        <MesesSelector mesAtual={mesAtual - 1} selecionados={meses} onChange={setMeses} />

        {definidos.length > 0 && (
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${COR.bordaSuave}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: COR.textoSuave,
              textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>
              Metas de hoje
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {definidos.map(({ v, i }) => {
                const sobra = sobraPrevista[i] ?? 0
                const cumpre = sobra >= v
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: 12, color: COR.texto }}>
                    <span style={{ minWidth: 78 }}>{MESES_FULL[i]}</span>
                    <b style={{ minWidth: 88, fontVariantNumeric: 'tabular-nums' }}>{fmt(v, true)}</b>
                    <span style={{ color: COR.textoSuave }}>previsto</span>
                    <b style={{ color: cumpre ? COR.sucessoTexto : COR.avisoTexto,
                      fontVariantNumeric: 'tabular-nums' }}>
                      {fmt(sobra, true)}
                    </b>
                    <span>{cumpre ? '✓' : '⚠'}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {erro && (
          <div style={{ background: COR.erroFundo, color: COR.erroTexto, borderRadius: 8,
            padding: '8px 12px', fontSize: 12, marginTop: 14 }}>⚠ {erro}</div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button onClick={salvar} style={{
            background: COR.azul, color: '#fff', border: 'none', borderRadius: 8,
            padding: '9px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit',
          }}>Salvar</button>
          <button onClick={onFechar} style={{
            background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8,
            padding: '9px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            fontFamily: 'inherit',
          }}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}
