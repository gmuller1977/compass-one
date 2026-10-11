import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { COR } from '../../utils/cores'
import { parseConta } from '../../utils/moeda'
import type { Categoria, PlanoAnoData } from '../../context/AppContext'
import type { Deps } from '../../utils/saldoConta'
import type { LancadoAcima } from '../../utils/lancadoAcimaDoPlano'
import { linhasDaRevisao, gravarRevisao, type LinhaRevisao } from '../../utils/revisaoDoPlano'
import { useToast } from '../Toast'
import { useApp } from '../../context/AppContext'
import { renomearNaFatura, renomearNosPlanos } from '../../utils/renomearCompra'
import type { JaLancado } from '../../utils/historicoDaCategoria'

const chaveCompra = (i: JaLancado) => (i.parcela?.compra ? `${i.parcela.compra.contaId}|${i.parcela.compra.base}` : '')

/**
 * As parcelas da linha, cada uma com o nome tocável: trocar o nome renomeia a
 * compra em TODAS as parcelas — na fatura e nos itens do plano. Pedido do
 * Guilherme em 11/10/2026; só compra parcelada (utils/renomearCompra).
 */
function ParcelasEditaveis({ itens, nomeCat, onRenomeado }: { itens: JaLancado[]; nomeCat: string; onRenomeado: (compra: string, novo: string) => void }) {
  const { setFaturaData, setPlanos } = useApp()
  const { toast } = useToast()
  const [editando, setEditando] = useState<{ i: JaLancado; texto: string } | null>(null)
  const parcelas = itens.filter(i => i.parcela)
  if (parcelas.length === 0) return null
  if (editando) {
    const { i, texto } = editando
    const salvar = () => {
      const novo = texto.trim()
      const c = i.parcela!.compra!
      if (novo && novo !== i.descricao.trim()) {
        const ref = { contaId: c.contaId, base: c.base, total: i.parcela!.total }
        setFaturaData(f => renomearNaFatura(f, ref, novo))
        setPlanos(p => renomearNosPlanos(p, nomeCat, i.descricao, ref.total, novo))
        toast(`"${novo}" nas ${ref.total} parcelas da compra.`, 'success')
        onRenomeado(chaveCompra(i), novo)
      }
      setEditando(null)
    }
    return (
      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input autoFocus value={texto} aria-label="Nome da compra"
            onChange={e => setEditando({ i, texto: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter') salvar(); if (e.key === 'Escape') { e.stopPropagation(); setEditando(null) } }}
            style={{ flex: 1, minWidth: 0, padding: '6px 8px', borderRadius: 8, border: `1.5px solid ${COR.azul}`,
              fontFamily: 'inherit', fontSize: 16, color: COR.texto }} />
          <span style={{ fontSize: 12, color: COR.textoSuave, whiteSpace: 'nowrap' }}>{i.parcela!.atual} de {i.parcela!.total}</span>
        </span>
        <span style={{ fontSize: 12, color: COR.textoSuave }}>Vale para as {i.parcela!.total} parcelas da compra.</span>
        <span style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={salvar} style={{ border: 'none', borderRadius: 999, padding: '5px 12px', fontFamily: 'inherit',
            fontSize: 12, fontWeight: 700, cursor: 'pointer', background: COR.azul, color: '#fff' }}>Salvar nome</button>
          <button type="button" onClick={() => setEditando(null)} style={{ border: 'none', borderRadius: 999, padding: '5px 12px',
            fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: '#f1f5f9', color: '#1e3a8a' }}>Cancelar</button>
        </span>
      </div>
    )
  }
  return (
    <div style={{ fontSize: 12, color: COR.textoSuave, marginTop: 2, display: 'flex', flexWrap: 'wrap', gap: '2px 8px' }}>
      {parcelas.map((i, n) => {
        const rotulo = `${i.descricao} ${i.parcela!.atual} de ${i.parcela!.total}`
        return i.parcela!.compra ? (
          <button key={n} type="button" title="Trocar o nome da compra em todas as parcelas"
            onClick={() => setEditando({ i, texto: i.descricao })}
            style={{ all: 'unset', cursor: 'pointer', color: COR.azul, textDecoration: 'underline', textUnderlineOffset: 2 }}>
            ✎ {rotulo}
          </button>
        ) : <span key={n}>{rotulo}</span>
      })}
    </div>
  )
}

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
  const linhasDeAbertura = useMemo(() => linhasDaRevisao(acima, deps), [])
  // Compra renomeada aqui: a tabela e a gravação usam o nome novo — senão
  // "Confirmar" gravaria nos itens do plano o nome antigo de volta.
  const [renomes, setRenomes] = useState<Record<string, string>>({})
  const linhas = useMemo(() => linhasDeAbertura.map(l => ({
    ...l, itens: l.itens.map(i => (renomes[chaveCompra(i)] ? { ...i, descricao: renomes[chaveCompra(i)] } : i)),
  })), [linhasDeAbertura, renomes])
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

  const estreito = window.innerWidth < 640
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
          ) : estreito ? (
            // Celular: um cartão por linha, e os três números lado a lado —
            // a tabela de seis colunas cortava "Plano atual" e "Sugerido".
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {linhas.map(l => {
                const k = chave(l)
                const marcada = marcadas.has(k)
                const v = valorDe(l)
                const abaixo = v !== null && v < l.jaLancado - 0.005
                const nome = l.descricao ? `${l.nome} · ${l.descricao}` : l.nome
                const numero = (rotulo: string, valor: ReactNode) => (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: COR.textoSuave }}>{rotulo}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{valor}</div>
                  </div>
                )
                return (
                  <div key={k} style={{ border: `1px solid ${COR.borda}`, borderRadius: 12, padding: '12px 12px',
                    opacity: l.motivo || marcada ? 1 : 0.55 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      {l.motivo
                        ? <span aria-hidden="true" style={{ width: 22, textAlign: 'center', color: COR.avisoTexto, fontWeight: 800, fontSize: 16 }}>!</span>
                        : <input type="checkbox" checked={marcada} aria-label={`Revisar ${nome} em ${MESES[l.mes]}`}
                            onChange={e => setMarcadas(s => { const n = new Set(s); if (e.target.checked) n.add(k); else n.delete(k); return n })}
                            style={{ width: 22, height: 22, margin: 0, flexShrink: 0 }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>{nome} <span style={{ fontWeight: 500, color: COR.textoSuave }}>· {nomeMes(l)}</span></div>
                        <ParcelasEditaveis itens={l.itens} nomeCat={l.nome} onRenomeado={(c, novo) => setRenomes(r => ({ ...r, [c]: novo }))} />
                      </div>
                    </div>
                    {l.motivo ? (
                      <div style={{ fontSize: 13, lineHeight: 1.4, color: COR.avisoTexto, background: COR.avisoFundo, marginTop: 10,
                        border: `1px solid ${COR.avisoBorda}`, borderRadius: 8, padding: '8px 10px' }}>
                        Já lançado {fmt(l.jaLancado)}. {l.motivo}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 10 }}>
                        {numero('Já lançado', fmt(l.jaLancado))}
                        {numero('Plano atual', <span style={{ color: COR.textoSuave }}>{fmt(l.plano)}</span>)}
                        <div style={{ flex: 1.2, minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: COR.textoSuave }}>Sugerido</div>
                          <input type="text" inputMode="decimal" value={textos[k] ?? ''} disabled={!marcada}
                            aria-label={`Valor sugerido para ${nome} em ${MESES[l.mes]}`}
                            onChange={e => setTextos(t => ({ ...t, [k]: e.target.value }))}
                            style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px', borderRadius: 8, textAlign: 'right', fontFamily: 'inherit',
                              fontSize: 16, marginTop: 2, border: `1.5px solid ${v === null ? COR.erroTexto : COR.azul}`, fontWeight: 700,
                              color: COR.texto, background: COR.branco }} />
                        </div>
                      </div>
                    )}
                    {!l.motivo && v !== null && !abaixo && Math.abs(v - l.sugerido) < 0.005 && (
                      <div style={{ fontSize: 12, color: COR.textoSuave, marginTop: 4, textAlign: 'right' }}>{origem(l)}</div>
                    )}
                    {!l.motivo && v === null && <div style={{ fontSize: 12, color: COR.erroTexto, marginTop: 4, textAlign: 'right' }}>valor inválido</div>}
                    {!l.motivo && abaixo && <div style={{ fontSize: 12, color: COR.avisoTexto, marginTop: 4, textAlign: 'right' }}>abaixo do já lançado</div>}
                  </div>
                )
              })}
            </div>
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
                  const nome = l.descricao ? `${l.nome} · ${l.descricao}` : l.nome
                  return (
                    l.motivo ? (
                      // O plano não resolve: sem caixa, sem valor — o motivo e o que fazer.
                      <tr key={k}>
                        <td style={{ ...td, textAlign: 'center', color: COR.avisoTexto, fontWeight: 700 }} aria-hidden="true">!</td>
                        <td style={{ ...td, textAlign: 'left' }}>
                          <div style={{ fontWeight: 700 }}>{nome}</div>
                          <ParcelasEditaveis itens={l.itens} nomeCat={l.nome} onRenomeado={(c, novo) => setRenomes(r => ({ ...r, [c]: novo }))} />
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
                        <ParcelasEditaveis itens={l.itens} nomeCat={l.nome} onRenomeado={(c, novo) => setRenomes(r => ({ ...r, [c]: novo }))} />
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
