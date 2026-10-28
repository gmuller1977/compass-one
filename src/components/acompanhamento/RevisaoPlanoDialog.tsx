import { useEffect, useMemo, useRef, useState } from 'react'
import { COR } from '../../utils/cores'
import { BolinhaConferido } from '../faturaCartao/FcConferir'
import ModalTopo from '../ModalTopo'
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
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
      {parcelas.map((i, n) => {
        const rotulo = `${i.descricao} ${i.parcela!.atual} de ${i.parcela!.total}`
        return i.parcela!.compra ? (
          // Fora do Tab: ele anda bolinha → sugerido → próxima bolinha
          // (pedido do Guilherme em 28/10/2026). O clique segue renomeando.
          <button key={n} type="button" tabIndex={-1} title="Trocar o nome da compra em todas as parcelas"
            onClick={() => setEditando({ i, texto: i.descricao })} style={PILULA}>
            <i aria-hidden className="ti ti-pencil" style={{ fontSize: 11, color: '#1d4ed8' }} />{rotulo}
          </button>
        ) : <span key={n} style={{ ...PILULA, cursor: 'default' }}>{rotulo}</span>
      })}
    </div>
  )
}

/** A parcela numa pílula (#1e3a8a no #eef2f8: 9,4). */
const PILULA: React.CSSProperties = {
  all: 'unset', cursor: 'pointer', fontSize: 12, color: '#1e3a8a', background: '#eef2f8', borderRadius: 999,
  padding: '2px 8px', display: 'inline-flex', gap: 4, alignItems: 'center',
}

const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
const MESES_LONGOS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
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

  // Uma caixa por mês, como os dias de Lançamentos (pedido do Guilherme em
  // 28/10/2026, opção A): "Dezembro 2026 · 3 categorias" e as linhas dentro.
  const meses = useMemo(() => {
    const g = new Map<string, LinhaRevisao[]>()
    for (const l of linhas) {
      const k = `${l.ano}-${String(l.mes).padStart(2, '0')}`
      g.set(k, [...(g.get(k) ?? []), l])
    }
    return [...g].sort(([x], [y]) => x.localeCompare(y)).map(([, ls]) => ls)
  }, [linhas])
  const alternar = (k: string) => setMarcadas(s => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n })
  const tamNome = estreito ? 15 : 14
  const colunas = '40px minmax(0, 1fr) 122px 122px 146px'
  const rotuloCol: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: COR.textoSuave, textAlign: 'right' }
  const num: React.CSSProperties = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }

  const marca = (l: LinhaRevisao, nome: string) => l.motivo
    ? <span aria-hidden="true" style={{ width: 26, height: 26, borderRadius: '50%', boxSizing: 'border-box', flexShrink: 0,
        border: '2px solid #a16207', background: COR.avisoFundo, color: '#a16207', fontWeight: 800, fontSize: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>!</span>
    : <BolinhaConferido marcado={marcadas.has(chave(l))} onToggle={() => alternar(chave(l))}
        rotulo={`${marcadas.has(chave(l)) ? 'Não revisar' : 'Revisar'} ${nome} em ${MESES[l.mes]}`} />
  const nomeLinha = (l: LinhaRevisao) => (
    <>
      <div style={{ fontSize: tamNome }}>
        {l.grupo && <span style={{ color: COR.textoSuave }}>{l.grupo} · </span>}
        <b>{l.nome}{l.descricao ? ` · ${l.descricao}` : ''}</b>
      </div>
      <ParcelasEditaveis itens={l.itens} nomeCat={l.nome} onRenomeado={(c, novo) => setRenomes(r => ({ ...r, [c]: novo }))} />
    </>
  )
  const motivoCaixa = (l: LinhaRevisao) => (
    <div style={{ fontSize: 12.5, lineHeight: 1.4, color: COR.avisoTexto, background: COR.avisoFundo,
      border: `1px solid ${COR.avisoBorda}`, borderRadius: 8, padding: '6px 10px', marginTop: estreito ? 8 : 0 }}>
      Já lançado {fmt(l.jaLancado)}. {l.motivo}
    </div>
  )
  const campoSugerido = (l: LinhaRevisao, nome: string) => {
    const k = chave(l)
    const v = valorDe(l)
    const abaixo = v !== null && v < l.jaLancado - 0.005
    return (
      <div style={{ textAlign: 'right' }}>
        <input type="text" inputMode="decimal" value={textos[k] ?? ''} disabled={!marcadas.has(k)}
          aria-label={`Valor sugerido para ${nome} em ${MESES[l.mes]}`}
          onChange={e => setTextos(t => ({ ...t, [k]: e.target.value }))}
          style={{ width: 146, boxSizing: 'border-box', padding: '7px 10px', borderRadius: 10, textAlign: 'right', fontFamily: 'inherit',
            fontSize: estreito ? 16 : 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: COR.texto, background: COR.branco,
            border: `1.5px solid ${v === null ? COR.erroTexto : '#1d4ed8'}` }} />
        {v !== null && !abaixo && Math.abs(v - l.sugerido) < 0.005 && (
          <div style={{ fontSize: estreito ? 12 : 11, color: COR.textoSuave, marginTop: 3 }}>{origem(l)}</div>
        )}
        {v === null && <div style={{ fontSize: estreito ? 12 : 11, color: COR.erroTexto, marginTop: 3 }}>valor inválido</div>}
        {abaixo && <div style={{ fontSize: estreito ? 12 : 11, color: COR.avisoTexto, marginTop: 3 }}>abaixo do já lançado</div>}
      </div>
    )
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onFechar() }} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 1200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: estreito ? 0 : 16,
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby="revisao-titulo" style={{
        background: '#f6f8fd', borderRadius: estreito ? 0 : 16, width: '100%', maxWidth: 760, overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(15,23,42,.25)', color: COR.texto, maxHeight: estreito ? '100%' : '90vh',
        height: estreito ? '100%' : undefined, display: 'flex', flexDirection: 'column',
      }}>
        <ModalTopo icone="ti-calendar-search" rotulo="Planejamento" titulo="Revisão do planejamento" id="revisao-titulo"
          onFechar={onFechar}
          subtitulo="O que já está lançado passa do plano destes meses. Confira o valor sugerido e confirme." />
        <div style={{ padding: estreito ? '0 14px 14px' : '0 20px 18px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>

        <div style={{ overflow: 'auto', paddingTop: estreito ? 14 : 18, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {linhas.length === 0 ? (
            <div style={{ fontSize: 14, padding: '16px 0' }}>Nada para revisar ✓</div>
          ) : <>
            {planejaveis.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#eef2f8', borderRadius: 12,
                padding: '10px 14px', fontSize: estreito ? 14 : 13 }}>
                <span style={{ flex: 1 }}>
                  <b>{escolhidas.length} de {planejaveis.length}</b> {planejaveis.length === 1 ? 'mês marcado' : 'meses marcados'} para revisar
                </span>
                <button type="button" onClick={() => setMarcadas(escolhidas.length ? new Set() : new Set(planejaveis.map(chave)))}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 0', fontFamily: 'inherit',
                    fontSize: estreito ? 14 : 13, fontWeight: 600, color: COR.azul, whiteSpace: 'nowrap' }}>
                  {escolhidas.length ? 'Desmarcar todos' : 'Marcar todos'}
                </button>
              </div>
            )}
            {meses.map(ls => (
              <div key={`${ls[0].ano}-${ls[0].mes}`}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, padding: '0 4px 6px' }}>
                  <b style={{ fontSize: 15 }}>{MESES_LONGOS[ls[0].mes]} {ls[0].ano}</b>
                  <span style={{ fontSize: 13, color: COR.textoSuave }}>· {ls.length} {ls.length === 1 ? 'categoria' : 'categorias'}</span>
                </div>
                <div style={{ border: '1.5px solid #93c5fd', borderRadius: 14, background: COR.branco, overflow: 'hidden' }}>
                  {!estreito && (
                    <div style={{ display: 'grid', gridTemplateColumns: colunas, gap: 8, padding: '8px 14px 6px' }}>
                      <span /><span style={{ ...rotuloCol, textAlign: 'left' }}>Categoria</span>
                      <span style={rotuloCol}>Já lançado</span><span style={rotuloCol}>Plano atual</span><span style={rotuloCol}>Sugerido</span>
                    </div>
                  )}
                  {ls.map((l, n) => {
                    const k = chave(l)
                    const nome = l.descricao ? `${l.nome} · ${l.descricao}` : l.nome
                    const apagada = !l.motivo && !marcadas.has(k)
                    return (
                      <div key={k} style={{ borderTop: n || !estreito ? `1px solid ${COR.borda}` : 'none', padding: '12px 14px',
                        opacity: apagada ? 0.55 : 1 }}>
                        {estreito ? <>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            {marca(l, nome)}<div style={{ flex: 1, minWidth: 0 }}>{nomeLinha(l)}</div>
                          </div>
                          {l.motivo ? motivoCaixa(l) : (
                            <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'flex-start' }}>
                              <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: COR.textoSuave, lineHeight: 1.5, paddingTop: 18 }}>
                                <div>Já lançado <b style={{ color: COR.texto, ...num }}>{fmt(l.jaLancado)}</b></div>
                                <div>Plano atual <span style={num}>{fmt(l.plano)}</span></div>
                              </div>
                              <div>
                                <div style={{ fontSize: 12, color: COR.textoSuave, marginBottom: 2, textAlign: 'right' }}>Sugerido</div>
                                {campoSugerido(l, nome)}
                              </div>
                            </div>
                          )}
                        </> : (
                          <div style={{ display: 'grid', gridTemplateColumns: colunas, gap: 8, alignItems: 'start' }}>
                            <span style={{ paddingTop: 4 }}>{marca(l, nome)}</span>
                            <div style={{ minWidth: 0 }}>{nomeLinha(l)}</div>
                            {l.motivo ? <div style={{ gridColumn: '3 / 6' }}>{motivoCaixa(l)}</div> : <>
                              <span style={{ ...num, textAlign: 'right', fontSize: 14, fontWeight: 600, paddingTop: 7 }}>{fmt(l.jaLancado)}</span>
                              <span style={{ ...num, textAlign: 'right', fontSize: 14, color: COR.textoSuave, paddingTop: 7 }}>{fmt(l.plano)}</span>
                              {campoSugerido(l, nome)}
                            </>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </>}
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
    </div>
  )
}
