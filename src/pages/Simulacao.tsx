import { useState, useMemo, useEffect, useCallback } from 'react'
import { parseBRL } from '../utils/moeda'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import AppHeader from '../components/AppHeader'
import PageHeader, { PH_BTN_SOLID } from '../components/PageHeader'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { COR } from '../utils/cores'

function useIsMobile() {
  const [v] = useState(() => window.innerWidth < 640)
  return v
}


function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho',
  'Agosto','Setembro','Outubro','Novembro','Dezembro']

function addMeses(base: Date, n: number) {
  const d = new Date(base.getFullYear(), base.getMonth() + n, 1)
  return `${MESES_FULL[d.getMonth()]}/${d.getFullYear()}`
}

type DividaResult = {
  meses: number; totalPago: number; jurosPagos: number; parcela: number
  chartData: { mes: number; saldo: number }[]
}
type MetaResult = {
  meses: number; guardaPorMes: number
  chartData: { mes: number; poupado: number }[]
}

type SimRow = {
  id: string
  tipo: 'divida' | 'meta'
  nome: string
  valor_total: number
  parcela: number
  juros: number
  resultado_meses: number
  data_conclusao: string
  total_pago?: number
  juros_pagos?: number
  ativo: boolean
  integrado_planejamento: boolean
  created_at: string
}

function simularDivida(saldo0: number, parcela: number, taxa: number): DividaResult {
  let saldo = saldo0; let totalPago = 0
  const chartData: { mes: number; saldo: number }[] = [{ mes: 0, saldo: Math.round(saldo) }]
  let meses = 0
  while (saldo > 0.01 && meses < 600) {
    saldo = taxa > 0 ? saldo * (1 + taxa) - parcela : saldo - parcela
    meses++
    const pago = saldo < 0 ? parcela + saldo : parcela
    totalPago += pago
    saldo = Math.max(0, saldo)
    chartData.push({ mes: meses, saldo: Math.round(saldo) })
    if (saldo === 0) break
  }
  return { meses, totalPago: Math.round(totalPago), jurosPagos: Math.round(totalPago - saldo0), parcela, chartData }
}

function simularMeta(objetivo: number, guarda: number): MetaResult {
  let poupado = 0
  const chartData: { mes: number; poupado: number }[] = [{ mes: 0, poupado: 0 }]
  let meses = 0
  while (poupado < objetivo && meses < 600) {
    poupado = Math.min(poupado + guarda, objetivo)
    meses++
    chartData.push({ mes: meses, poupado: Math.round(poupado) })
    if (poupado >= objetivo) break
  }
  return { meses, guardaPorMes: guarda, chartData }
}

const inputSt: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: `1px solid ${COR.borda}`,
  borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box', background: COR.branco, color: COR.texto,
}
const labelSt: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, color: COR.textoSuave,
  textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5,
}
const card: React.CSSProperties = {
  background: COR.branco, border: `.5px solid ${COR.borda}`, borderRadius: 12, padding: '20px 22px',
}

function SimCard({ sim, onDelete }: { sim: SimRow; onDelete: (id: string) => void }) {
  const isDivida = sim.tipo === 'divida'
  const [hovDel, setHovDel] = useState(false)
  return (
    <div style={{
      background: COR.branco,
      border: `.5px solid ${COR.borda}`,
      borderRadius: 10,
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: isDivida ? '#fff1f2' : '#f0fdf4',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18,
      }}>{isDivida ? '💳' : '🐷'}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: COR.texto }}>{sim.nome}</div>
        <div style={{ fontSize: 12, color: COR.textoSuave, marginTop: 2 }}>
          {fmt(sim.valor_total)} · {fmt(sim.parcela)}/mês
        </div>
        <div style={{ fontSize: 12, color: isDivida ? COR.vermelho : COR.verde, marginTop: 2 }}>
          {isDivida ? 'Quitada' : 'Alcançada'} em {sim.resultado_meses} meses — {sim.data_conclusao}
        </div>
        {sim.integrado_planejamento && (
          <div style={{
            display: 'inline-block', marginTop: 5, fontSize: 10, fontWeight: 600,
            padding: '2px 6px', borderRadius: 6,
            background: '#eff6ff', color: COR.azul,
          }}>✓ No planejamento</div>
        )}
      </div>
      <button
        onClick={() => onDelete(sim.id)}
        onMouseEnter={() => setHovDel(true)}
        onMouseLeave={() => setHovDel(false)}
        style={{
          border: 'none', background: hovDel ? '#fff1f2' : 'transparent',
          color: hovDel ? COR.vermelho : COR.textoMuted,
          borderRadius: 6, padding: '4px 8px', cursor: 'pointer',
          fontSize: 13, fontFamily: 'inherit', transition: 'all .12s',
          flexShrink: 0,
        }}
      >✕</button>
    </div>
  )
}

const MESES_ABR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function calcularImpacto(parcela: number, planos: Record<number, { entradas: {v:number[]}[]; saidas: {v:number[]}[] }>) {
  const hoje   = new Date()
  const anoBase = hoje.getFullYear()
  const mesBase = hoje.getMonth()
  return Array.from({ length: 6 }, (_, i) => {
    const mesTotal = mesBase + i
    const ano = anoBase + Math.floor(mesTotal / 12)
    const mes = mesTotal % 12
    const plano = planos[ano]
    const receitas  = plano ? plano.entradas.reduce((s, c) => s + (c.v[mes] || 0), 0) : 0
    const despesas  = plano ? plano.saidas.reduce((s,  c) => s + (c.v[mes] || 0), 0) : 0
    const resultado = receitas - despesas
    return {
      label: `${MESES_ABR[mes]}/${ano}`,
      resultado,
      resultadoComParcela: resultado - parcela,
      temDados: !!plano && (receitas > 0 || despesas > 0),
    }
  })
}

function TabelaImpacto({ parcela, planos, cor }: {
  parcela: number
  planos: Record<number, { entradas: {v:number[]}[]; saidas: {v:number[]}[] }>
  cor: string
}) {
  const linhas = calcularImpacto(parcela, planos)
  const temAlgumPlano = linhas.some(l => l.temDados)
  const thSt: React.CSSProperties = {
    textAlign: 'right', padding: '6px 10px',
    borderBottom: `1px solid ${COR.borda}`,
    color: COR.textoMuted, fontWeight: 600, fontSize: 11,
    textTransform: 'uppercase', letterSpacing: '.4px',
  }
  return (
    <div style={card}>
      <div style={{ fontSize: 14, fontWeight: 700, color: COR.texto, marginBottom: 4 }}>
        📊 Impacto no seu planejamento
      </div>
      <div style={{ fontSize: 12, color: COR.textoMuted, marginBottom: 16 }}>
        Como a parcela de {fmt(parcela)}/mês afeta seu resultado nos próximos 6 meses
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 340 }}>
          <thead>
            <tr>
              <th style={{ ...thSt, textAlign: 'left' }}>Mês</th>
              <th style={thSt}>Resultado atual</th>
              <th style={{ ...thSt, color: cor }}>Com parcela</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '8px 10px', color: COR.texto, fontWeight: 500 }}>{row.label}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                  color: row.temDados ? (row.resultado >= 0 ? COR.verde : COR.vermelho) : COR.textoMuted }}>
                  {row.temDados ? fmt(row.resultado) : '—'}
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                  color: row.temDados ? (row.resultadoComParcela >= 0 ? COR.verde : COR.vermelho) : COR.textoMuted }}>
                  {row.temDados ? fmt(row.resultadoComParcela) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!temAlgumPlano && (
        <div style={{ fontSize: 11, color: COR.textoMuted, marginTop: 12, padding: '8px 10px', background: '#f8fafc', borderRadius: 6 }}>
          💡 Crie um planejamento para ver o impacto real nos seus meses.
        </div>
      )}
    </div>
  )
}

export default function Simulacao() {
  const isMobile                          = useIsMobile()
  const { user, planos, setPlanos } = useApp()
  const hoje                              = new Date()

  const [aba, setAba] = useState<'divida' | 'meta'>('divida')

  // ── Saved simulations ────────────────────────────────────────────────
  const [simList,      setSimList]      = useState<SimRow[]>([])
  const [listLoading,  setListLoading]  = useState(true)
  const [simSalva,     setSimSalva]     = useState(false)
  const [integrado,    setIntegrado]    = useState(false)

  const loadSims = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('simulacoes')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setSimList(data as SimRow[])
    setListLoading(false)
  }, [user])

  useEffect(() => { loadSims() }, [loadSims])

  const simListFiltrada = simList.filter(s => s.tipo === aba)

  async function excluirSim(id: string) {
    await supabase.from('simulacoes').delete().eq('id', id)
    setSimList(prev => prev.filter(s => s.id !== id))
  }

  // ── Dívida form ──────────────────────────────────────────────────────
  const [nomeDivida,  setNomeDivida]  = useState('')
  const [valorDivida, setValorDivida] = useState('')
  const [parcelaStr,  setParcelaStr]  = useState('')
  const [taxaStr,     setTaxaStr]     = useState('')
  const [resultDiv,   setResultDiv]   = useState<DividaResult | null>(null)
  const [sliderDiv,   setSliderDiv]   = useState(0)
  const [visibleD,    setVisibleD]    = useState(false)

  // ── Meta form ────────────────────────────────────────────────────────
  const [nomeMeta,   setNomeMeta]   = useState('')
  const [valorMeta,  setValorMeta]  = useState('')
  const [guardaStr,  setGuardaStr]  = useState('')
  const [resultMeta, setResultMeta] = useState<MetaResult | null>(null)
  const [sliderMeta, setSliderMeta] = useState(0)
  const [visibleM,   setVisibleM]   = useState(false)

  // ── Simular ──────────────────────────────────────────────────────────
  function simDiv() {
    const saldo   = parseBRL(valorDivida)
    const parcela = parseBRL(parcelaStr)
    const taxa    = taxaStr ? parseFloat(taxaStr.replace(',', '.')) / 100 : 0
    if (!saldo || !parcela) return
    if (taxa > 0 && parcela <= saldo * taxa) {
      alert('A parcela é menor que os juros mensais — a dívida nunca seria quitada.')
      return
    }
    setResultDiv(simularDivida(saldo, parcela, taxa))
    setSliderDiv(0); setVisibleD(false); setSimSalva(false); setIntegrado(false)
    setTimeout(() => setVisibleD(true), 20)
  }

  function simMeta() {
    const objetivo = parseBRL(valorMeta)
    const guarda   = parseBRL(guardaStr)
    if (!objetivo || !guarda) return
    setResultMeta(simularMeta(objetivo, guarda))
    setSliderMeta(0); setVisibleM(false); setSimSalva(false); setIntegrado(false)
    setTimeout(() => setVisibleM(true), 20)
  }

  const resultDivSlider = useMemo(() => {
    if (!resultDiv || sliderDiv === 0) return null
    const taxa = taxaStr ? parseFloat(taxaStr.replace(',', '.')) / 100 : 0
    return simularDivida(parseBRL(valorDivida), resultDiv.parcela + sliderDiv, taxa)
  }, [resultDiv, sliderDiv, valorDivida, taxaStr])

  const resultMetaSlider = useMemo(() => {
    if (!resultMeta || sliderMeta === 0) return null
    return simularMeta(parseBRL(valorMeta), resultMeta.guardaPorMes + sliderMeta)
  }, [resultMeta, sliderMeta, valorMeta])

  // ── Salvar ───────────────────────────────────────────────────────────
  async function salvarSimulacao() {
    if (!user) return
    let row: Record<string, unknown>

    if (aba === 'divida' && resultDiv) {
      row = {
        user_id:         user.id,
        tipo:            'divida',
        nome:            nomeDivida || 'Dívida sem nome',
        valor_total:     parseBRL(valorDivida),
        parcela:         resultDiv.parcela,
        juros:           taxaStr ? parseFloat(taxaStr.replace(',', '.')) : 0,
        resultado_meses: resultDiv.meses,
        data_conclusao:  addMeses(hoje, resultDiv.meses),
        total_pago:      resultDiv.totalPago,
        juros_pagos:     resultDiv.jurosPagos,
      }
    } else if (aba === 'meta' && resultMeta) {
      row = {
        user_id:         user.id,
        tipo:            'meta',
        nome:            nomeMeta || 'Meta sem nome',
        valor_total:     parseBRL(valorMeta),
        parcela:         resultMeta.guardaPorMes,
        juros:           0,
        resultado_meses: resultMeta.meses,
        data_conclusao:  addMeses(hoje, resultMeta.meses),
      }
    } else return

    const { data, error } = await supabase.from('simulacoes').insert([row]).select().single()
    if (!error && data) {
      setSimList(prev => [data as SimRow, ...prev])
      setSimSalva(true)
    }
  }

  // ── Incluir no planejamento ──────────────────────────────────────────
  async function incluirNoPlanejamento() {
    if (!user) return
    const parcela  = aba === 'divida' ? resultDiv?.parcela       : resultMeta?.guardaPorMes
    const nome     = aba === 'divida' ? (nomeDivida || 'Dívida') : (nomeMeta || 'Meta')
    const mesesTot = aba === 'divida' ? resultDiv?.meses         : resultMeta?.meses
    if (!parcela || !mesesTot) return

    const anoAtual = hoje.getFullYear()
    const mesAtual = hoje.getMonth()

    // Build monthly value array for current year
    const v = Array(12).fill(0)
    for (let m = mesAtual; m < 12 && (m - mesAtual) < mesesTot; m++) {
      v[m] = parcela
    }

    const planoBase = planos[anoAtual] ?? { saldoInicialJan: 0, entradas: [], saidas: [] }
    const jaExiste  = planoBase.saidas.find(c => c.nome === nome)
    const novasSaidas = jaExiste
      ? planoBase.saidas.map(c => c.nome === nome ? { ...c, v } : c)
      : [...planoBase.saidas, { nome, t: 'Outros', v }]

    // Grava no plano unico. Antes chamava finalizarPlanejamento, que
    // sobrescrevia o plano "real" e travava o planejamento a partir daqui.
    setPlanos(prev => ({ ...prev, [anoAtual]: { ...planoBase, saidas: novasSaidas } }))

    // Mark simulation as integrated in DB if it was saved
    const simSalvada = simList.find(s => s.tipo === aba && !s.integrado_planejamento)
    if (simSalvada) {
      await supabase.from('simulacoes').update({ integrado_planejamento: true }).eq('id', simSalvada.id)
      setSimList(prev => prev.map(s => s.id === simSalvada.id ? { ...s, integrado_planejamento: true } : s))
    }

    setIntegrado(true)
  }

  // ── Render ───────────────────────────────────────────────────────────
  const isDivida = aba === 'divida'
  const corAba   = isDivida ? COR.vermelho : COR.verde

  return (
    <div style={{ minHeight: '100vh', background: COR.fundo, fontFamily: "-apple-system,'Inter',sans-serif" }}>
      <AppHeader currentPath="/simulacao" />

      {/* Header em largura cheia, como na tela de Lancamentos */}
      <div style={{ padding: isMobile ? '12px 14px 0' : '16px 28px 0' }}>
          <PageHeader
            icon="ti-calculator"
            breadcrumb="MEU PLANO"
            title="Simulador"
            subtitle={simList.length > 0 ? `${simList.length} simulaç${simList.length === 1 ? 'ão salva' : 'ões salvas'}` : 'Nenhuma simulação salva'}
            rightContent={
              <button onClick={() => { setAba('divida'); setSimSalva(false) }} style={PH_BTN_SOLID}>
                + Nova simulação
              </button>
            }
          />
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: isMobile ? '16px 14px 80px' : '28px 28px 48px' }}>

        {/* Abas */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${COR.borda}`, marginBottom: 24 }}>
          {([['divida', '💳 Quitar dívida'], ['meta', '🐷 Meta de poupança']] as const).map(([v, l]) => (
            <button key={v} onClick={() => { setAba(v); setSimSalva(false) }} style={{
              padding: '10px 20px', border: 'none', fontFamily: 'inherit',
              borderBottom: `2px solid ${aba === v ? corAba : 'transparent'}`,
              background: 'transparent', cursor: 'pointer', fontSize: 13,
              fontWeight: aba === v ? 700 : 500,
              color: aba === v ? corAba : COR.textoSuave, transition: 'all .15s',
            }}>{l}</button>
          ))}
        </div>

        {/* ── Minhas simulações salvas ── */}
        {!listLoading && simListFiltrada.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: COR.textoMuted, letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 10 }}>
              Minhas simulações salvas
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {simListFiltrada.map(s => (
                <SimCard key={s.id} sim={s} onDelete={excluirSim} />
              ))}
            </div>
            <div style={{ height: 1, background: COR.borda, margin: '20px 0' }} />
          </div>
        )}

        {/* ═══ ABA DÍVIDA ═══ */}
        {isDivida && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div style={card}>
              <div style={{ fontSize: 14, fontWeight: 700, color: COR.texto, marginBottom: 16 }}>Dados da dívida</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelSt}>Nome da dívida</label>
                  <input value={nomeDivida} onChange={e => setNomeDivida(e.target.value)}
                    placeholder="Ex: Cartão Nubank, Empréstimo..." style={inputSt} />
                </div>
                <div>
                  <label style={labelSt}>Valor total (R$)</label>
                  <input value={valorDivida} onChange={e => setValorDivida(e.target.value)}
                    placeholder="R$ 10.000,00" style={inputSt} />
                </div>
                <div>
                  <label style={labelSt}>Parcela mensal (R$)</label>
                  <input value={parcelaStr} onChange={e => setParcelaStr(e.target.value)}
                    placeholder="R$ 500,00" style={inputSt} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelSt}>
                    Juros mensal (%) <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— opcional</span>
                  </label>
                  <input value={taxaStr} onChange={e => setTaxaStr(e.target.value)}
                    placeholder="Ex: 2,5 — deixe em branco se não souber" style={inputSt} />
                </div>
              </div>
              <button onClick={simDiv} style={{
                marginTop: 18, width: '100%', padding: '12px 0', border: 'none', borderRadius: 10,
                background: `linear-gradient(135deg,${COR.vermelho},#b91c1c)`,
                color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>Calcular →</button>
            </div>

            {resultDiv && (
              <div style={{ opacity: visibleD ? 1 : 0, transition: 'opacity .4s', display: 'flex', flexDirection: 'column', gap: 14 }}>

                <div style={{ ...card, borderLeft: `4px solid ${COR.vermelho}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: COR.vermelho, marginBottom: 10 }}>
                    {nomeDivida || 'Sua dívida'}
                  </div>
                  <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 800, color: COR.texto, lineHeight: 1.4 }}>
                    Pagando {fmt(resultDiv.parcela)}/mês, você quita em{' '}
                    <span style={{ color: COR.vermelho }}>{resultDiv.meses} meses</span>{' '}
                    ({addMeses(hoje, resultDiv.meses)})
                  </div>
                  <div style={{ display: 'flex', gap: 24, marginTop: 14, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 11, color: COR.textoMuted }}>Total pago</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: COR.texto }}>{fmt(resultDiv.totalPago)}</div>
                    </div>
                    {resultDiv.jurosPagos > 0 && (
                      <div>
                        <div style={{ fontSize: 11, color: COR.textoMuted }}>Juros pagos</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: COR.vermelho }}>{fmt(resultDiv.jurosPagos)}</div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={card}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COR.texto, marginBottom: 14 }}>Saldo devedor ao longo do tempo</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={resultDiv.chartData} margin={{ top: 4, right: 8, left: -20, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} label={{ value: 'Meses', position: 'insideBottom', offset: -4, fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: unknown) => [fmt(v as number), 'Saldo']} labelFormatter={v => `Mês ${v}`} />
                      <Line type="monotone" dataKey="saldo" stroke={COR.vermelho} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div style={card}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: COR.texto, marginBottom: 4 }}>E se eu pagasse mais?</div>
                  <div style={{ fontSize: 12, color: COR.textoMuted, marginBottom: 14 }}>Arraste para ver quanto tempo você economiza</div>
                  <input type="range" min={0} max={Math.round(resultDiv.parcela)} step={50}
                    value={sliderDiv} onChange={e => setSliderDiv(Number(e.target.value))}
                    style={{ width: '100%', accentColor: COR.vermelho }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: COR.textoMuted, marginTop: 4, marginBottom: sliderDiv > 0 ? 14 : 0 }}>
                    <span>{fmt(resultDiv.parcela)} (atual)</span>
                    <span>{fmt(resultDiv.parcela * 2)} (2×)</span>
                  </div>
                  {sliderDiv > 0 && resultDivSlider && (
                    <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, padding: '12px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: COR.vermelho, marginBottom: 4 }}>
                        Pagando {fmt(resultDiv.parcela + sliderDiv)}/mês (+{fmt(sliderDiv)})
                      </div>
                      <div style={{ fontSize: 13, color: COR.texto }}>
                        Você quita em <strong>{resultDivSlider.meses} meses</strong> ({addMeses(hoje, resultDivSlider.meses)})
                      </div>
                      {resultDiv.meses - resultDivSlider.meses > 0 && (
                        <div style={{ fontSize: 12, color: COR.verde, marginTop: 6, fontWeight: 600 }}>
                          ✓ Economiza {resultDiv.meses - resultDivSlider.meses} meses
                          {resultDiv.totalPago - resultDivSlider.totalPago > 0 && ` e ${fmt(resultDiv.totalPago - resultDivSlider.totalPago)}`}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Impacto no planejamento */}
                <TabelaImpacto parcela={resultDiv.parcela} planos={planos} cor={COR.vermelho} />

                {/* Ações */}
                <div style={{ ...card, background: 'linear-gradient(135deg,#f8faff,#f8faff)', border: '1px solid #dbeafe' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: COR.texto, marginBottom: 12 }}>O que você quer fazer?</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button onClick={salvarSimulacao} disabled={simSalva} style={{
                      flex: 1, minWidth: 140, padding: '11px 16px', border: 'none', borderRadius: 10,
                      background: simSalva ? '#f1f5f9' : `linear-gradient(135deg,${COR.azulEscuro},${COR.azulMedio})`,
                      color: simSalva ? COR.textoMuted : '#fff',
                      fontSize: 13, fontWeight: 700, cursor: simSalva ? 'default' : 'pointer', fontFamily: 'inherit',
                      transition: 'all .15s',
                    }}>
                      {simSalva ? '✓ Simulação salva' : '💾 Salvar simulação'}
                    </button>
                    <button onClick={incluirNoPlanejamento} disabled={integrado} style={{
                      flex: 1, minWidth: 140, padding: '11px 16px', border: `1px solid ${integrado ? '#bbf7d0' : COR.borda}`, borderRadius: 10,
                      background: integrado ? '#f0fdf4' : COR.branco,
                      color: integrado ? COR.verde : COR.texto,
                      fontSize: 13, fontWeight: 600, cursor: integrado ? 'default' : 'pointer', fontFamily: 'inherit',
                      transition: 'all .15s',
                    }}>
                      {integrado ? '✓ No planejamento' : '📅 Incluir no planejamento'}
                    </button>
                  </div>
                  {integrado && (
                    <div style={{ fontSize: 12, color: COR.verde, marginTop: 10 }}>
                      Parcela de {fmt(resultDiv.parcela)}/mês adicionada ao planejamento de {hoje.getFullYear()}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

        {/* ═══ ABA META ═══ */}
        {!isDivida && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div style={card}>
              <div style={{ fontSize: 14, fontWeight: 700, color: COR.texto, marginBottom: 16 }}>Dados do objetivo</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelSt}>Nome do objetivo</label>
                  <input value={nomeMeta} onChange={e => setNomeMeta(e.target.value)}
                    placeholder="Ex: Viagem, Reserva de emergência..." style={inputSt} />
                </div>
                <div>
                  <label style={labelSt}>Valor total (R$)</label>
                  <input value={valorMeta} onChange={e => setValorMeta(e.target.value)}
                    placeholder="R$ 20.000,00" style={inputSt} />
                </div>
                <div>
                  <label style={labelSt}>Quanto pode guardar por mês (R$)</label>
                  <input value={guardaStr} onChange={e => setGuardaStr(e.target.value)}
                    placeholder="R$ 800,00" style={inputSt} />
                </div>
              </div>
              <button onClick={simMeta} style={{
                marginTop: 18, width: '100%', padding: '12px 0', border: 'none', borderRadius: 10,
                background: `linear-gradient(135deg,${COR.verde},#15803d)`,
                color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>Calcular →</button>
            </div>

            {resultMeta && (
              <div style={{ opacity: visibleM ? 1 : 0, transition: 'opacity .4s', display: 'flex', flexDirection: 'column', gap: 14 }}>

                <div style={{ ...card, borderLeft: `4px solid ${COR.verde}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: COR.verde, marginBottom: 10 }}>
                    {nomeMeta || 'Seu objetivo'}
                  </div>
                  <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 800, color: COR.texto, lineHeight: 1.4 }}>
                    Guardando {fmt(resultMeta.guardaPorMes)}/mês, você alcança em{' '}
                    <span style={{ color: COR.verde }}>{resultMeta.meses} meses</span>{' '}
                    ({addMeses(hoje, resultMeta.meses)})
                  </div>
                  <div style={{ margin: '14px 0 4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: COR.textoMuted, marginBottom: 5 }}>
                      <span>R$ 0</span><span>{fmt(parseBRL(valorMeta))}</span>
                    </div>
                    <div style={{ height: 8, background: '#dcfce7', borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{ height: 8, borderRadius: 6, background: COR.verde, width: '0%' }}/>
                    </div>
                    <div style={{ fontSize: 11, color: COR.textoMuted, marginTop: 5 }}>
                      Progresso será acompanhado após salvar
                    </div>
                  </div>
                </div>

                <div style={card}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COR.texto, marginBottom: 14 }}>Evolução da poupança</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={resultMeta.chartData} margin={{ top: 4, right: 8, left: -20, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} label={{ value: 'Meses', position: 'insideBottom', offset: -4, fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: unknown) => [fmt(v as number), 'Poupado']} labelFormatter={v => `Mês ${v}`} />
                      <Line type="monotone" dataKey="poupado" stroke={COR.verde} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div style={card}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: COR.texto, marginBottom: 4 }}>E se eu guardasse mais?</div>
                  <div style={{ fontSize: 12, color: COR.textoMuted, marginBottom: 14 }}>Arraste para ver como acelera seu objetivo</div>
                  <input type="range" min={0} max={Math.round(resultMeta.guardaPorMes)} step={50}
                    value={sliderMeta} onChange={e => setSliderMeta(Number(e.target.value))}
                    style={{ width: '100%', accentColor: COR.verde }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: COR.textoMuted, marginTop: 4, marginBottom: sliderMeta > 0 ? 14 : 0 }}>
                    <span>{fmt(resultMeta.guardaPorMes)} (atual)</span>
                    <span>{fmt(resultMeta.guardaPorMes * 2)} (2×)</span>
                  </div>
                  {sliderMeta > 0 && resultMetaSlider && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: COR.verde, marginBottom: 4 }}>
                        Guardando {fmt(resultMeta.guardaPorMes + sliderMeta)}/mês (+{fmt(sliderMeta)})
                      </div>
                      <div style={{ fontSize: 13, color: COR.texto }}>
                        Você alcança em <strong>{resultMetaSlider.meses} meses</strong> ({addMeses(hoje, resultMetaSlider.meses)})
                      </div>
                      {resultMeta.meses - resultMetaSlider.meses > 0 && (
                        <div style={{ fontSize: 12, color: COR.verde, marginTop: 6, fontWeight: 600 }}>
                          ✓ Chega {resultMeta.meses - resultMetaSlider.meses} meses antes
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Impacto no planejamento */}
                <TabelaImpacto parcela={resultMeta.guardaPorMes} planos={planos} cor={COR.verde} />

                {/* Ações */}
                <div style={{ ...card, background: 'linear-gradient(135deg,#f0fdf4,#f8faff)', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: COR.texto, marginBottom: 12 }}>O que você quer fazer?</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button onClick={salvarSimulacao} disabled={simSalva} style={{
                      flex: 1, minWidth: 140, padding: '11px 16px', border: 'none', borderRadius: 10,
                      background: simSalva ? '#f1f5f9' : `linear-gradient(135deg,${COR.azulEscuro},${COR.azulMedio})`,
                      color: simSalva ? COR.textoMuted : '#fff',
                      fontSize: 13, fontWeight: 700, cursor: simSalva ? 'default' : 'pointer', fontFamily: 'inherit',
                      transition: 'all .15s',
                    }}>
                      {simSalva ? '✓ Simulação salva' : '💾 Salvar simulação'}
                    </button>
                    <button onClick={incluirNoPlanejamento} disabled={integrado} style={{
                      flex: 1, minWidth: 140, padding: '11px 16px', border: `1px solid ${integrado ? '#bbf7d0' : COR.borda}`, borderRadius: 10,
                      background: integrado ? '#f0fdf4' : COR.branco,
                      color: integrado ? COR.verde : COR.texto,
                      fontSize: 13, fontWeight: 600, cursor: integrado ? 'default' : 'pointer', fontFamily: 'inherit',
                      transition: 'all .15s',
                    }}>
                      {integrado ? '✓ No planejamento' : '📅 Incluir no planejamento'}
                    </button>
                  </div>
                  {integrado && (
                    <div style={{ fontSize: 12, color: COR.verde, marginTop: 10 }}>
                      {fmt(resultMeta.guardaPorMes)}/mês de poupança adicionado ao planejamento de {hoje.getFullYear()}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

      </div>
      <style>{`
        input[type=range] { cursor: pointer; }
        input:focus { outline: 2px solid ${COR.azul}; outline-offset: 1px; }
      `}</style>
    </div>
  )
}
