import { useEffect, useMemo, useRef, useState } from 'react'
import { COR } from '../../utils/cores'
import { parseConta } from '../../utils/moeda'
import type { Categoria, PlanoAnoData } from '../../context/AppContext'
import type { Deps } from '../../utils/saldoConta'
import type { LancadoAcima } from '../../utils/lancadoAcimaDoPlano'
import { linhasDaRevisao, gravarRevisao, type LinhaRevisao } from '../../utils/revisaoDoPlano'
import { useToast } from '../Toast'

const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const paraCampo = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
/** De onde veio o sugerido, em poucas palavras (a regra é valorMesAMes). */
function origem(l: LinhaRevisao): string {
  const temParcela = l.itens.some(i => i.parcela)
  const reais = (v: number) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`
  if (l.base === null) return 'cobre o já lançado'
  return temParcela ? `média ${reais(l.base)} + parcela` : l.sugerido > l.base + 0.005 ? 'o já lançado' : `média ${reais(l.base)}`
}
const chave = (l: LinhaRevisao) => `${l.nome}||${l.descricao}||${l.ano}-${l.mes}`

/**
 * "Revisar agora": a tabela da revisão do plano (utils/revisaoDoPlano). Uma
 * linha por categoria e mês, com o já lançado, o plano atual e o valor
 * sugerido — editável, aceita conta ("150+30"). Tudo marcado; "Confirmar"
 * grava os marcados. Pedido do Guilherme em 08/10/2026.
 *
 * Aberta da Início, do Radar e do Planejamento: a mesma janela nos três.
 */
export default function RevisaoPlanoDialog({ acima, deps, planos, setPlanos, categorias, onFechar }: {
  acima: LancadoAcima[]
  deps: Deps
  planos: Record<number, PlanoAnoData>
  setPlanos: React.Dispatch<React.SetStateAction<Record<number, PlanoAnoData>>>
  categorias: Categoria[]
  onFechar: () => void
}) {
  const { toast } = useToast()
  // Uma vez, ao abrir: a média de cada categoria lê meses de realizado.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const linhas = useMemo(() => linhasDaRevisao(acima, deps), [])
  // Só o que o plano resolve vem marcado; o resto aparece com o motivo.
  const [marcadas, setMarcadas] = useState<Set<string>>(() => new Set(linhas.filter(l => !l.motivo).map(chave)))
  const [textos, setTextos] = useState<Record<string, string>>(
    () => Object.fromEntries(linhas.map(l => [chave(l), paraCampo(l.sugerido)])))
  const fecharRef = useRef(onFechar)
  fecharRef.current = onFechar
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') fecharRef.current() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [])

  const valorDe = (l: LinhaRevisao) => parseConta(textos[chave(l)] ?? '')
  const escolhidas = linhas.filter(l => !l.motivo && marcadas.has(chave(l)))
  const planejaveis = linhas.filter(l => !l.motivo)
  const invalida = escolhidas.some(l => valorDe(l) === null)
  const anoHoje = new Date().getFullYear()
  const nomeMes = (l: LinhaRevisao) => (l.ano !== anoHoje ? `${MESES[l.mes]}/${String(l.ano).slice(2)}` : MESES[l.mes])

  function confirmar() {
    if (invalida || escolhidas.length === 0) return
    const escolhas = escolhidas.map(l => ({ linha: l, valor: valorDe(l)! }))
    // O relatório sai do plano de agora; a gravação, do mais recente.
    const nao = gravarRevisao(planos, escolhas, categorias).naoGravadas
    setPlanos(prev => gravarRevisao(prev, escolhas, categorias).planos)
    const n = escolhas.length - nao.length
    if (n > 0) toast(`Plano revisado em ${n === 1 ? '1 mês' : `${n} meses`}`)
    // Plano antigo com duas linhas do mesmo nome sem variante: não chuta.
    if (nao.length) toast(`${nao[0].nome}: o plano tem duas linhas com esse nome — ajuste pelo Planejamento`, 'error')
    onFechar()
  }

  const th: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: COR.textoSuave, textAlign: 'right', padding: '6px 8px', whiteSpace: 'nowrap' }
  const td: React.CSSProperties = { fontSize: 13, padding: '8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', borderTop: `1px solid ${COR.borda}`, verticalAlign: 'top' }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onFechar() }} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 1200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby="revisao-titulo" style={{
        background: COR.branco, borderRadius: 16, width: '100%', maxWidth: 680, padding: '18px 20px',
        boxShadow: '0 20px 50px rgba(15,23,42,.25)', color: COR.texto, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        <h3 id="revisao-titulo" style={{ margin: 0, fontSize: 17 }}>Revisão do planejamento</h3>
        <div style={{ fontSize: 13, color: COR.textoSuave, marginTop: 4, lineHeight: 1.4 }}>
          O que já está lançado passa do plano destes meses. Confira o valor sugerido e confirme.
        </div>

        <div style={{ overflow: 'auto', marginTop: 12, flex: 1, minHeight: 0 }}>
          {linhas.length === 0 ? (
            <div style={{ fontSize: 14, padding: '16px 0' }}>Nada para revisar ✓</div>
          ) : (
            <table style={{ width: '100%', minWidth: 540, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: 28 }} aria-label="Incluir" />
                  <th style={{ ...th, textAlign: 'left' }}>Categoria</th>
                  <th style={{ ...th, textAlign: 'left' }}>Mês</th>
                  <th style={th}>Já lançado</th>
                  <th style={th}>Plano atual</th>
                  <th style={th}>Sugerido</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map(l => {
                  const k = chave(l)
                  const marcada = marcadas.has(k)
                  const v = valorDe(l)
                  const abaixo = v !== null && v < l.jaLancado - 0.005
                  const parcelas = l.itens.filter(i => i.parcela)
                  const nome = l.descricao ? `${l.nome} · ${l.descricao}` : l.nome
                  return (
                    l.motivo ? (
                      // O plano não resolve: sem caixa, sem valor — o motivo e o que fazer.
                      <tr key={k}>
                        <td style={{ ...td, textAlign: 'center', color: COR.avisoTexto, fontWeight: 700 }} aria-hidden="true">!</td>
                        <td style={{ ...td, textAlign: 'left' }}>
                          <div style={{ fontWeight: 700 }}>{nome}</div>
                          {parcelas.length > 0 && (
                            <div style={{ fontSize: 11, color: COR.textoSuave, marginTop: 2 }}>
                              {parcelas.map(i => `${i.descricao} ${i.parcela!.atual} de ${i.parcela!.total}`).join(' · ')}
                            </div>
                          )}
                        </td>
                        <td style={{ ...td, textAlign: 'left' }}>{nomeMes(l)}</td>
                        <td style={td}>{fmt(l.jaLancado)}</td>
                        <td colSpan={2} style={{ ...td, textAlign: 'left' }}>
                          <div style={{ fontSize: 12, lineHeight: 1.4, color: COR.avisoTexto, background: COR.avisoFundo,
                            border: `1px solid ${COR.avisoBorda}`, borderRadius: 8, padding: '6px 8px' }}>
                            {l.motivo}
                          </div>
                        </td>
                      </tr>
                    ) :
                    <tr key={k} style={{ opacity: marcada ? 1 : 0.55 }}>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <input type="checkbox" checked={marcada} aria-label={`Revisar ${nome} em ${MESES[l.mes]}`}
                          onChange={e => setMarcadas(s => { const n = new Set(s); if (e.target.checked) n.add(k); else n.delete(k); return n })} />
                      </td>
                      <td style={{ ...td, textAlign: 'left' }}>
                        <div style={{ fontWeight: 700 }}>{nome}</div>
                        {parcelas.length > 0 && (
                          <div style={{ fontSize: 11, color: COR.textoSuave, marginTop: 2 }}>
                            {parcelas.map(i => `${i.descricao} ${i.parcela!.atual} de ${i.parcela!.total}`).join(' · ')}
                          </div>
                        )}
                      </td>
                      <td style={{ ...td, textAlign: 'left' }}>{nomeMes(l)}</td>
                      <td style={td}>{fmt(l.jaLancado)}</td>
                      <td style={{ ...td, color: COR.textoSuave }}>{fmt(l.plano)}</td>
                      <td style={{ ...td, paddingRight: 0 }}>
                        <input type="text" inputMode="decimal" value={textos[k] ?? ''} disabled={!marcada}
                          aria-label={`Valor sugerido para ${nome} em ${MESES[l.mes]}`}
                          onChange={e => setTextos(t => ({ ...t, [k]: e.target.value }))}
                          style={{ width: 110, padding: '6px 8px', borderRadius: 8, textAlign: 'right', fontFamily: 'inherit', fontSize: 13,
                            border: `1.5px solid ${v === null ? COR.erroTexto : COR.azul}`, fontWeight: 700, color: COR.texto, background: COR.branco }} />
                        {v !== null && !abaixo && Math.abs(v - l.sugerido) < 0.005 && (
                          <div style={{ fontSize: 11, color: COR.textoSuave, marginTop: 3 }}>{origem(l)}</div>
                        )}
                        {v === null && <div style={{ fontSize: 11, color: COR.erroTexto, marginTop: 3 }}>valor inválido</div>}
                        {abaixo && <div style={{ fontSize: 11, color: COR.avisoTexto, marginTop: 3 }}>abaixo do já lançado</div>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button type="button" onClick={onFechar} style={{
            border: 'none', borderRadius: 999, padding: '8px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', background: '#f1f5f9', color: '#1e3a8a',
          }}>{planejaveis.length ? 'Cancelar' : 'Fechar'}</button>
          {planejaveis.length > 0 && (
            <button type="button" onClick={confirmar} disabled={invalida || escolhidas.length === 0} style={{
              border: 'none', borderRadius: 999, padding: '8px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
              cursor: invalida || escolhidas.length === 0 ? 'default' : 'pointer', background: COR.azul, color: '#fff',
              opacity: invalida || escolhidas.length === 0 ? 0.5 : 1,
            }}>
              Confirmar {escolhidas.length === 1 ? '1 mês' : `${escolhidas.length} meses`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
