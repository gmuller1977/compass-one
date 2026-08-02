import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import AppHeader from '../components/AppHeader'
import { useApp } from '../context/AppContext'
import type { MetaSim } from '../context/AppContext'

function useIsMobile() {
  const [v] = useState(() => window.innerWidth < 640)
  return v
}

const COR = {
  fundo: '#f8faff', branco: '#ffffff', borda: '#e8edf3',
  texto: '#0f172a', textoSuave: '#64748b', textoMuted: '#94a3b8',
  azul: '#1a56db', azulMedio: '#2563eb', verde: '#16a34a', vermelho: '#dc2626',
}

function parseBRL(s: string): number {
  return parseFloat(s.replace(/[^\d,]/g, '').replace(',', '.')) || 0
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

export default function Simulacao() {
  const navigate       = useNavigate()
  const isMobile       = useIsMobile()
  const { setMetaSim } = useApp()
  const hoje = new Date()

  const [aba, setAba] = useState<'divida' | 'meta'>('divida')

  // ── Dívida ──────────────────────────────────────────────────────────────
  const [nomeDivida,  setNomeDivida]  = useState('')
  const [valorDivida, setValorDivida] = useState('')
  const [parcelaStr,  setParcelaStr]  = useState('')
  const [taxaStr,     setTaxaStr]     = useState('')
  const [resultDiv,   setResultDiv]   = useState<DividaResult | null>(null)
  const [sliderDiv,   setSliderDiv]   = useState(0)
  const [visibleD,    setVisibleD]    = useState(false)

  // ── Meta ────────────────────────────────────────────────────────────────
  const [nomeMeta,    setNomeMeta]    = useState('')
  const [valorMeta,   setValorMeta]   = useState('')
  const [guardaStr,   setGuardaStr]   = useState('')
  const [resultMeta,  setResultMeta]  = useState<MetaResult | null>(null)
  const [sliderMeta,  setSliderMeta]  = useState(0)
  const [visibleM,    setVisibleM]    = useState(false)
  const [metaSalva,   setMetaSalva]   = useState(false)

  // ── Simular dívida ──────────────────────────────────────────────────────
  function simDiv() {
    const saldo   = parseBRL(valorDivida)
    const parcela = parseBRL(parcelaStr)
    const taxa    = taxaStr ? parseFloat(taxaStr.replace(',', '.')) / 100 : 0
    if (!saldo || !parcela) return
    if (taxa > 0 && parcela <= saldo * taxa) {
      alert('A parcela é menor que os juros mensais — a dívida nunca seria quitada com esses dados.')
      return
    }
    setResultDiv(simularDivida(saldo, parcela, taxa))
    setSliderDiv(0); setVisibleD(false)
    setTimeout(() => setVisibleD(true), 20)
  }

  const resultDivSlider = useMemo(() => {
    if (!resultDiv || sliderDiv === 0) return null
    const taxa = taxaStr ? parseFloat(taxaStr.replace(',', '.')) / 100 : 0
    return simularDivida(parseBRL(valorDivida), resultDiv.parcela + sliderDiv, taxa)
  }, [resultDiv, sliderDiv, valorDivida, taxaStr])

  // ── Simular meta ────────────────────────────────────────────────────────
  function simMeta() {
    const objetivo = parseBRL(valorMeta)
    const guarda   = parseBRL(guardaStr)
    if (!objetivo || !guarda) return
    setResultMeta(simularMeta(objetivo, guarda))
    setSliderMeta(0); setVisibleM(false); setMetaSalva(false)
    setTimeout(() => setVisibleM(true), 20)
  }

  const resultMetaSlider = useMemo(() => {
    if (!resultMeta || sliderMeta === 0) return null
    return simularMeta(parseBRL(valorMeta), resultMeta.guardaPorMes + sliderMeta)
  }, [resultMeta, sliderMeta, valorMeta])

  function salvarMeta() {
    if (!resultMeta) return
    const meta: MetaSim = {
      nome: nomeMeta || 'Minha meta',
      objetivo: parseBRL(valorMeta),
      guardaPorMes: resultMeta.guardaPorMes,
      iniciadoEm: new Date().toISOString(),
    }
    setMetaSim(meta); setMetaSalva(true)
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: COR.fundo, fontFamily: "-apple-system,'Inter',sans-serif" }}>
      <AppHeader currentPath="/simulacao" />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: isMobile ? '16px 14px 80px' : '28px 28px 48px' }}>

        {/* Cabeçalho */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: COR.textoMuted, marginBottom: 4 }}>MEU PLANO</div>
          <h1 style={{ fontSize: isMobile ? 20 : 25, fontWeight: 800, color: COR.texto, margin: 0 }}>
            🔮 Simulador financeiro
          </h1>
          <p style={{ fontSize: 13, color: COR.textoSuave, margin: '5px 0 0', lineHeight: 1.5 }}>
            Descubra em quanto tempo você quita uma dívida ou alcança um objetivo
          </p>
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${COR.borda}`, marginBottom: 24 }}>
          {([['divida', '💳 Quitar dívida'], ['meta', '🐷 Meta de poupança']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setAba(v)} style={{
              padding: '10px 20px', border: 'none', fontFamily: 'inherit',
              borderBottom: `2px solid ${aba === v ? COR.azul : 'transparent'}`,
              background: 'transparent', cursor: 'pointer', fontSize: 13,
              fontWeight: aba === v ? 700 : 500,
              color: aba === v ? COR.azul : COR.textoSuave, transition: 'all .15s',
            }}>{l}</button>
          ))}
        </div>

        {/* ═══════════════ ABA DÍVIDA ═══════════════ */}
        {aba === 'divida' && (
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
                  <label style={labelSt}>Parcela mensal atual (R$)</label>
                  <input value={parcelaStr} onChange={e => setParcelaStr(e.target.value)}
                    placeholder="R$ 500,00" style={inputSt} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelSt}>
                    Taxa de juros mensal (%) <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— opcional</span>
                  </label>
                  <input value={taxaStr} onChange={e => setTaxaStr(e.target.value)}
                    placeholder="Ex: 2,5 — deixe em branco se não souber" style={inputSt} />
                  <div style={{ fontSize: 11, color: COR.textoMuted, marginTop: 4 }}>
                    Não sabe? Deixe em branco e usamos só o valor total.
                  </div>
                </div>
              </div>
              <button onClick={simDiv} style={{
                marginTop: 18, width: '100%', padding: '12px 0', border: 'none', borderRadius: 9,
                background: `linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,
                color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>Simular →</button>
            </div>

            {resultDiv && (
              <div style={{ opacity: visibleD ? 1 : 0, transition: 'opacity .4s', display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Resultado principal */}
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

                {/* Gráfico */}
                <div style={card}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COR.texto, marginBottom: 14 }}>Saldo devedor ao longo do tempo</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={resultDiv.chartData} margin={{ top: 4, right: 8, left: -20, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} label={{ value: 'Meses', position: 'insideBottom', offset: -4, fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => [fmt(v), 'Saldo']} labelFormatter={v => `Mês ${v}`} />
                      <Line type="monotone" dataKey="saldo" stroke={COR.vermelho} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Slider */}
                <div style={card}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: COR.texto, marginBottom: 4 }}>E se eu pagasse mais?</div>
                  <div style={{ fontSize: 12, color: COR.textoMuted, marginBottom: 14 }}>Arraste para ver quanto tempo você economiza</div>
                  <input type="range" min={0} max={Math.round(resultDiv.parcela)} step={50}
                    value={sliderDiv} onChange={e => setSliderDiv(Number(e.target.value))}
                    style={{ width: '100%', accentColor: COR.vermelho }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: COR.textoMuted, marginTop: 4, marginBottom: 14 }}>
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
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ ABA META ═══════════════ */}
        {aba === 'meta' && (
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
                marginTop: 18, width: '100%', padding: '12px 0', border: 'none', borderRadius: 9,
                background: `linear-gradient(135deg,${COR.verde},#15803d)`,
                color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>Simular →</button>
            </div>

            {resultMeta && (
              <div style={{ opacity: visibleM ? 1 : 0, transition: 'opacity .4s', display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Resultado principal */}
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
                    <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: 8, borderRadius: 4, background: COR.verde, width: '100%', opacity: 0.18 }}/>
                    </div>
                    <div style={{ fontSize: 11, color: COR.textoMuted, marginTop: 5, textAlign: 'center' }}>
                      Progresso estimado ao completar os {resultMeta.meses} meses
                    </div>
                  </div>
                </div>

                {/* Gráfico */}
                <div style={card}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COR.texto, marginBottom: 14 }}>Evolução da poupança</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={resultMeta.chartData} margin={{ top: 4, right: 8, left: -20, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} label={{ value: 'Meses', position: 'insideBottom', offset: -4, fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => [fmt(v), 'Poupado']} labelFormatter={v => `Mês ${v}`} />
                      <Line type="monotone" dataKey="poupado" stroke={COR.verde} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Slider */}
                <div style={card}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: COR.texto, marginBottom: 4 }}>E se eu guardasse mais?</div>
                  <div style={{ fontSize: 12, color: COR.textoMuted, marginBottom: 14 }}>Arraste para ver como acelera seu objetivo</div>
                  <input type="range" min={0} max={Math.round(resultMeta.guardaPorMes)} step={50}
                    value={sliderMeta} onChange={e => setSliderMeta(Number(e.target.value))}
                    style={{ width: '100%', accentColor: COR.verde }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: COR.textoMuted, marginTop: 4, marginBottom: 14 }}>
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

                {/* Adicionar ao Dashboard */}
                <div style={{ ...card, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: COR.verde, marginBottom: 4 }}>
                        🐷 Acompanhar no Dashboard
                      </div>
                      <div style={{ fontSize: 12, color: '#166534', lineHeight: 1.5 }}>
                        Salve esta meta para ver o progresso direto no início
                      </div>
                    </div>
                    {metaSalva ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: COR.verde }}>✓ Meta salva!</span>
                        <button onClick={() => navigate('/dashboard')} style={{
                          padding: '7px 14px', border: 'none', borderRadius: 8,
                          background: COR.verde, color: '#fff', fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}>Ver no Dashboard →</button>
                      </div>
                    ) : (
                      <button onClick={salvarMeta} style={{
                        padding: '10px 20px', border: 'none', borderRadius: 9,
                        background: COR.verde, color: '#fff', fontSize: 13, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                      }}>Adicionar ao Dashboard →</button>
                    )}
                  </div>
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
