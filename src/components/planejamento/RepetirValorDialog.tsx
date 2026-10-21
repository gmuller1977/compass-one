import { useEffect, useRef, useState } from 'react'
import { COR } from '../../utils/cores'
import ModalTopo from '../ModalTopo'
import { nomeDoMes, type MesRef } from '../../utils/recorrencia'
import { parseConta } from '../../utils/moeda'

const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
const primeiraMaiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
const numero = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const cel: React.CSSProperties = { padding: '8px 6px', verticalAlign: 'middle' }
const caixa: React.CSSProperties = { width: 18, height: 18, margin: 0, cursor: 'pointer', accentColor: COR.azul }
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
 * Na mensal, uma tabela: mês, planejado e o valor de troca, editável.
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
  /** Os meses marcados, cada um com o seu valor de troca. */
  onAlterar: (meses: { m: MesRef; valor: number }[]) => void
  onParcelas: (ate: MesRef) => void
  onFechar: () => void
}) {
  const [marcados, setMarcados] = useState<Set<string>>(new Set())
  const [ate, setAte] = useState(0)
  // Valor de troca de cada mês: começa no digitado e pode ser outro. Mexer
  // nele marca o mês (pedido do Guilherme, 21/10/2026).
  const [trocas, setTrocas] = useState<Record<string, string>>(
    () => Object.fromEntries(diferentes.map(d => [`${d.m.ano}-${d.m.mes}`, numero(valor)])))
  const marcar = (k: string, sim: boolean) => setMarcados(s => {
    if (s.has(k) === sim) return s
    const n = new Set(s); if (sim) n.add(k); else n.delete(k); return n
  })
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
  const todos = diferentes.length > 0 && diferentes.every(d => marcados.has(chave(d.m)))
  const algumInvalido = diferentes.some(d => marcados.has(chave(d.m)) && parseConta(trocas[chave(d.m)] ?? '') === null)
  const podeAlterar = marcados.size > 0 && !algumInvalido
  const todosValidos = diferentes.every(d => parseConta(trocas[chave(d.m)] ?? '') !== null)

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onFechar() }} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 1200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby="repetir-titulo" style={{
        background: COR.branco, borderRadius: 16, width: '100%', maxWidth: tipo === 'anual' ? 480 : 420, overflow: 'hidden',
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
                : <>{fmt(valor)} não foi repetido nos meses abaixo, porque eles têm outro valor.</>}
              {' '}Marque os que quer trocar; o valor de troca pode ser outro.
            </div>
            <table style={{ marginTop: 12, width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: '#475569', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  <th style={{ ...cel, width: 28 }}>
                    <input type="checkbox" aria-label="Marcar todos" checked={todos} style={caixa}
                      onChange={e => setMarcados(e.target.checked ? new Set(diferentes.map(d => chave(d.m))) : new Set())} />
                  </th>
                  <th style={{ ...cel, textAlign: 'left' }}>Mês</th>
                  <th style={{ ...cel, textAlign: 'right' }}>Planejado</th>
                  <th style={{ ...cel, textAlign: 'right', width: 116 }}>Valor de troca</th>
                </tr>
              </thead>
              <tbody>
                {diferentes.map(d => {
                  const k = chave(d.m)
                  const marcado = marcados.has(k)
                  const invalido = parseConta(trocas[k] ?? '') === null
                  return (
                    <tr key={k} style={{ borderTop: `1px solid ${COR.borda}`, background: marcado ? '#eff6ff' : undefined }}>
                      <td style={cel}>
                        <input type="checkbox" checked={marcado} aria-label={`Trocar ${nomeMes(d.m)}`} style={caixa}
                          onChange={e => marcar(k, e.target.checked)} />
                      </td>
                      <td style={{ ...cel, fontWeight: 600, color: '#1e3a8a', cursor: 'pointer' }} onClick={() => marcar(k, !marcado)}>
                        {primeiraMaiuscula(nomeMes(d.m))}
                      </td>
                      <td style={{ ...cel, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(d.atual)}
                        {d.itens && <div style={{ fontSize: 11, color: '#475569' }}>em itens</div>}
                      </td>
                      <td style={{ ...cel, textAlign: 'right' }}>
                        <input type="text" inputMode="decimal" value={trocas[k] ?? ''} aria-label={`Valor de troca de ${nomeMes(d.m)}`}
                          onChange={e => { const t = e.target.value; setTrocas(s => ({ ...s, [k]: t })); marcar(k, true) }}
                          onFocus={e => e.target.select()}
                          style={{ width: 104, padding: '7px 8px', borderRadius: 8, textAlign: 'right', fontFamily: 'inherit',
                            fontSize: 16, fontVariantNumeric: 'tabular-nums', color: COR.texto, background: COR.branco,
                            border: `1.5px solid ${invalido ? COR.erroTexto : marcado ? COR.azul : '#cbd5e1'}` }} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {algumInvalido && (
              <div style={{ fontSize: 12, color: COR.erroTexto, marginTop: 8 }}>Confira o valor de troca marcado em vermelho.</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
              <button type="button" onClick={onFechar} style={btn(false)}>Manter</button>
              <button type="button" style={{ ...btn(false), opacity: todosValidos ? 1 : 0.5, cursor: todosValidos ? 'pointer' : 'default' }}
                disabled={!todosValidos}
                onClick={() => onAlterar(diferentes.map(d => ({ m: d.m, valor: parseConta(trocas[chave(d.m)] ?? '') ?? valor })))}>
                Alterar todos
              </button>
              <button type="button" autoFocus style={{ ...btn(true), opacity: podeAlterar ? 1 : 0.5, cursor: podeAlterar ? 'pointer' : 'default' }}
                disabled={!podeAlterar}
                onClick={() => onAlterar(diferentes.filter(d => marcados.has(chave(d.m)))
                  .map(d => ({ m: d.m, valor: parseConta(trocas[chave(d.m)] ?? '') ?? valor })))}>
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
