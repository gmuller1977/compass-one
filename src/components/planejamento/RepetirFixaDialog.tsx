import { useEffect, useRef, useState } from 'react'
import { COR } from '../../utils/cores'
import type { MesRef } from '../../utils/recorrencia'

const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * A pergunta que aparece ao digitar o valor de uma conta FIXA no Planejamento
 * — utils/recorrencia. Decidida com o Guilherme em 07/10/2026.
 *
 *   - ANUAL: "Usar R$ X também de novembro até dezembro?" (ou até o fim do
 *     financiamento, atravessando os anos que já têm plano). Mês com valor
 *     DIFERENTE dos outros — o reajuste de julho — aparece marcado à parte, e
 *     só muda se for marcado.
 *   - TEMPORÁRIA: "Parcelas fixas até qual mês?". As parcelas viram itens:
 *     "IPVA · 1 de 3".
 *
 * "Só este mês" deixa o valor só onde foi digitado — que é o que já está gravado.
 */
export default function RepetirFixaDialog({
  nome, tipo, mes, valor, ano, destinos, candidatos, onRepetir, onParcelas, onFechar,
}: {
  nome: string
  tipo: 'anual' | 'temporaria'
  ano: number
  mes: number
  valor: number
  /** Anual: os meses para onde o valor vai, com o valor que têm hoje e se diverge. */
  destinos: { m: MesRef; atual: number; diverge: boolean }[]
  /** Temporária: os meses que podem ser o último (do seguinte ao digitado em diante). */
  candidatos: MesRef[]
  onRepetir: (meses: MesRef[]) => void
  onParcelas: (ate: MesRef) => void
  onFechar: () => void
}) {
  const [marcados, setMarcados] = useState<Set<string>>(new Set())
  const [ate, setAte] = useState(0)
  const fecharRef = useRef(onFechar)
  fecharRef.current = onFechar
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') fecharRef.current() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [])

  const chave = (m: MesRef) => `${m.ano}-${m.mes}`
  const nomeMes = (m: MesRef) => (m.ano !== ano ? `${MESES[m.mes]} de ${m.ano}` : MESES[m.mes])
  const normais = destinos.filter(d => !d.diverge)
  const diferentes = destinos.filter(d => d.diverge)
  const ultimo = destinos[destinos.length - 1]
  const btn = (primario: boolean): React.CSSProperties => ({
    border: 'none', borderRadius: 999, padding: '8px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
    cursor: 'pointer', background: primario ? COR.azul : '#f1f5f9', color: primario ? '#fff' : '#1e3a8a',
  })
  const nParcelas = ate + 2

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onFechar() }} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 1200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby="repetir-titulo" style={{
        background: COR.branco, borderRadius: 16, width: '100%', maxWidth: 420, padding: '18px 20px',
        boxShadow: '0 20px 50px rgba(15,23,42,.25)', color: COR.texto, maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ fontSize: 12, color: COR.textoSuave }}>{nome} · conta fixa {tipo === 'anual' ? 'anual' : 'temporária'}</div>

        {tipo === 'anual' ? (
          <>
            <h3 id="repetir-titulo" style={{ margin: '4px 0 0', fontSize: 16, lineHeight: 1.35 }}>
              Usar {fmt(valor)} também de {nomeMes(destinos[0].m)} até {nomeMes(ultimo.m)}?
            </h3>
            {normais.length < destinos.length && normais.length > 0 && (
              <div style={{ fontSize: 13, color: COR.textoSuave, marginTop: 6 }}>
                {normais.length === 1 ? '1 mês' : `${normais.length} meses`} recebem o valor novo.
              </div>
            )}
            {diferentes.length > 0 && (
              <div style={{ marginTop: 12, border: `1px solid ${COR.avisoBorda}`, background: COR.avisoFundo, borderRadius: 10,
                padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {diferentes.map(d => (
                  <label key={chave(d.m)} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, cursor: 'pointer',
                    color: COR.avisoTexto, lineHeight: 1.4 }}>
                    <input type="checkbox" checked={marcados.has(chave(d.m))} style={{ marginTop: 3 }}
                      onChange={e => setMarcados(s => { const n = new Set(s); if (e.target.checked) n.add(chave(d.m)); else n.delete(chave(d.m)); return n })} />
                    <span>
                      Em {nomeMes(d.m)} o valor planejado é <b>{fmt(d.atual)}</b>, diferente dos outros meses. Alterar também?
                    </span>
                  </label>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <button type="button" onClick={onFechar} style={btn(false)}>Só {MESES[mes]}</button>
              <button type="button" autoFocus style={btn(true)}
                onClick={() => onRepetir(destinos.filter(d => !d.diverge || marcados.has(chave(d.m))).map(d => d.m))}>
                Repetir
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 id="repetir-titulo" style={{ margin: '4px 0 0', fontSize: 16 }}>Parcelas fixas até qual mês?</h3>
            <div style={{ fontSize: 13, color: COR.textoSuave, marginTop: 4 }}>
              {fmt(valor)} por mês, a partir de {MESES[mes]}.
            </div>
            {candidatos.length > 0 ? (
              <select value={ate} onChange={e => setAte(Number(e.target.value))} aria-label="Último mês das parcelas"
                style={{ marginTop: 12, width: '100%', padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${COR.azul}`,
                  fontFamily: 'inherit', fontSize: 14, background: COR.branco, color: COR.texto }}>
                {candidatos.map((m, i) => (
                  <option key={chave(m)} value={i}>até {nomeMes(m)} · {i + 2} parcelas</option>
                ))}
              </select>
            ) : (
              <div style={{ fontSize: 13, marginTop: 10 }}>Não há meses planejados depois deste.</div>
            )}
            {candidatos.length > 0 && (
              <div style={{ fontSize: 12, color: COR.textoSuave, marginTop: 8 }}>
                Cada mês fica marcado com a parcela: “1 de {nParcelas}”, “2 de {nParcelas}”…
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <button type="button" onClick={onFechar} style={btn(false)}>Só {MESES[mes]}</button>
              {candidatos.length > 0 && (
                <button type="button" autoFocus style={btn(true)} onClick={() => onParcelas(candidatos[ate])}>
                  Gravar {nParcelas} parcelas
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
