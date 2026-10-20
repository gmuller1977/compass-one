import { useEffect, useRef, useState } from 'react'
import { COR } from '../../utils/cores'
import ModalTopo from '../ModalTopo'
import { nomeDoMes, type MesRef } from '../../utils/recorrencia'

const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * A janela que aparece ao digitar um valor no Planejamento — utils/recorrencia.
 * Vale para qualquer categoria, fixa ou variável (20/10/2026).
 *
 *   - MENSAL: o valor já foi repetido sozinho até dezembro (ou até o fim). A
 *     janela só abre se algum mês tinha valor DIFERENTE — o reajuste de julho,
 *     um mês com itens —, e pergunta se muda esses também. Desmarcados.
 *   - PARCELADA: "Em quantas vezes?", no modelo do cartão ("3x · até maio").
 *     As parcelas viram itens: "IPVA · 1 de 3".
 *
 * "Só [mês]" / "Manter" deixa como está — o digitado já está gravado.
 */
export default function RepetirValorDialog({
  nome, tipo, mes, valor, ano, repetidoAte, diferentes, candidatos, onAlterar, onParcelas, onFechar,
}: {
  nome: string
  tipo: 'anual' | 'temporaria'
  ano: number
  mes: number
  valor: number
  /** Anual: o último mês que já recebeu o valor (null se nenhum recebeu). */
  repetidoAte: MesRef | null
  /** Anual: os meses que ficaram de fora por terem outro valor. */
  diferentes: { m: MesRef; atual: number; itens: boolean }[]
  /** Temporária: os meses que podem ser o último (do seguinte ao digitado em diante). */
  candidatos: MesRef[]
  onAlterar: (meses: MesRef[]) => void
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
  const nomeMes = (m: MesRef) => nomeDoMes(m, ano)
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
        background: COR.branco, borderRadius: 16, width: '100%', maxWidth: 420, overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(15,23,42,.25)', color: COR.texto, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        <ModalTopo icone="ti-repeat" rotulo={`${nome} · ${tipo === 'anual' ? 'mensal' : 'parcelada'}`} id="repetir-titulo"
          onFechar={onFechar}
          titulo={tipo === 'anual'
            ? (diferentes.length === 1 ? 'Este mês tem outro valor' : 'Estes meses têm outro valor')
            : 'Em quantas vezes?'} />
        <div style={{ overflowY: 'auto', padding: '16px 20px 18px' }}>
        {tipo === 'anual' ? (
          <>
            <div style={{ fontSize: 13, color: COR.textoSuave, lineHeight: 1.4 }}>
              {repetidoAte
                ? <>{fmt(valor)} foi repetido até {nomeMes(repetidoAte)}, menos {diferentes.length === 1 ? 'neste' : 'nestes'}:</>
                : <>{fmt(valor)} não foi repetido. Alterar também?</>}
            </div>
            <div style={{ marginTop: 12, border: `1px solid ${COR.avisoBorda}`, background: COR.avisoFundo, borderRadius: 10,
              padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {diferentes.map(d => (
                <label key={chave(d.m)} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, cursor: 'pointer',
                  color: COR.avisoTexto, lineHeight: 1.4 }}>
                  <input type="checkbox" checked={marcados.has(chave(d.m))} style={{ marginTop: 3 }}
                    onChange={e => setMarcados(s => { const n = new Set(s); if (e.target.checked) n.add(chave(d.m)); else n.delete(chave(d.m)); return n })} />
                  <span>
                    Em {nomeMes(d.m)} o valor planejado é <b>{fmt(d.atual)}</b>{d.itens ? ', detalhado em itens' : ''}. Trocar por {fmt(valor)}?
                  </span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <button type="button" onClick={onFechar} style={btn(false)}>Manter</button>
              <button type="button" autoFocus style={{ ...btn(true), opacity: marcados.size === 0 ? 0.5 : 1, cursor: marcados.size === 0 ? 'default' : 'pointer' }} disabled={marcados.size === 0}
                onClick={() => onAlterar(diferentes.filter(d => marcados.has(chave(d.m))).map(d => d.m))}>
                Alterar marcados
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, color: COR.textoSuave }}>
              {fmt(valor)} por mês, a partir de {MESES[mes]}.
            </div>
            {candidatos.length > 0 ? (
              <select value={ate} onChange={e => setAte(Number(e.target.value))} aria-label="Em quantas vezes"
                style={{ marginTop: 12, width: '100%', padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${COR.azul}`,
                  fontFamily: 'inherit', fontSize: 14, background: COR.branco, color: COR.texto }}>
                {candidatos.map((m, i) => (
                  <option key={chave(m)} value={i}>{i + 2}x · até {nomeMes(m)}</option>
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
                  Gravar em {nParcelas}x
                </button>
              )}
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  )
}
