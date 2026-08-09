import { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { PlanoAnoData, Categoria } from '../context/AppContext'
import { GRUPOS_PADRAO } from '../data/categoriasPadrao'

const ANO     = new Date().getFullYear()
const MES_ATU = new Date().getMonth()

const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

// stepLabels / totalSteps computed inside component (dynamic when cartões exist)

type Objetivo = 'controlar' | 'economizar' | 'sonho' | 'dividas'
type Aplicar  = 'restantes' | 'todos'

const OBJETIVOS: { id: Objetivo; emoji: string; titulo: string; sub: string }[] = [
  { id:'controlar',  emoji:'📊', titulo:'Controlar meus gastos',  sub:'Saber para onde vai meu dinheiro e evitar surpresas no fim do mês' },
  { id:'economizar', emoji:'💰', titulo:'Economizar e poupar',    sub:'Guardar dinheiro todo mês e construir uma reserva de emergência' },
  { id:'sonho',      emoji:'🏠', titulo:'Realizar um sonho',      sub:'Planejar uma viagem, compra ou conquista importante' },
  { id:'dividas',    emoji:'📈', titulo:'Sair das dívidas',       sub:'Organizar as contas e criar um plano para quitar o que devo' },
]

function parseBRL(s: string): number {
  return parseFloat(s.replace(/[^\d,]/g, '').replace(',', '.')) || 0
}
function fmtBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style:'currency', currency:'BRL' })
}
function maskBRL(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  return 'R$ ' + (parseInt(digits) / 100).toLocaleString('pt-BR', { minimumFractionDigits:2 })
}
function nomeFaturaCartao(nome: string, cartaoNomes: Set<string>): boolean {
  if (cartaoNomes.has(nome.toLowerCase())) return true
  const n = nome.toLowerCase()
  return n.includes('cart') && (/cr[eé]d/.test(n) || n.includes('fatura'))
}
function getCatsByGrupo(cats: Categoria[]) {
  const map: Record<string, Categoria[]> = {}
  cats.forEach(c => { const g = c.grupo ?? 'Outros'; if (!map[g]) map[g] = []; map[g].push(c) })
  return [
    ...GRUPOS_PADRAO.filter(g => map[g]).map(g => ({ grupo: g, cats: map[g] })),
    ...Object.keys(map).filter(g => !GRUPOS_PADRAO.includes(g)).sort().map(g => ({ grupo: g, cats: map[g] })),
  ]
}

const inputSt: React.CSSProperties = {
  width:110, border:'1.5px solid #e2e8f0', borderRadius:10, padding:'8px 10px',
  fontSize:13, fontWeight:700, color:'#0f172a', background:'#f8fafc',
  outline:'none', fontFamily:'inherit', textAlign:'right', flexShrink:0,
}
const saldoInputSt: React.CSSProperties = {
  width:120, border:'1.5px solid #1a56db', borderRadius:10, padding:'8px 10px',
  fontSize:14, fontWeight:700, color:'#1a56db', background:'#eff6ff',
  outline:'none', fontFamily:'inherit', textAlign:'right', flexShrink:0,
}

export default function WizardPlanejamento() {
  const navigate = useNavigate()
  const location = useLocation()
  const refazer  = (location.state as { refazer?: boolean } | null)?.refazer === true
  const { contas, categorias, planos, setPlanos, setOnboardingCompleto, onboardingCompleto, setObjetivoUsuario } = useApp()

  const contasBanco  = useMemo(() => contas.filter(c => c.tipo !== 'cartao'), [contas])
  const cartaoNomes  = useMemo(() => new Set(contas.filter(c => c.tipo === 'cartao').map(c => c.nome.toLowerCase())), [contas])
  const catsEntrada  = useMemo(() => categorias.filter(c => c.tipo === 'entrada'), [categorias])
  const catsSaida    = useMemo(() => categorias.filter(c => c.tipo === 'saida' && !nomeFaturaCartao(c.nome, cartaoNomes)), [categorias, cartaoNomes])
  const existingPlan = refazer ? undefined : planos[ANO]

  function initSaldos(): Record<string,string> {
    const r: Record<string,string> = {}
    contas.filter(c => c.tipo !== 'cartao').forEach(c => { if (c.saldoInicial) r[c.id] = fmtBRL(c.saldoInicial) })
    return r
  }
  function initValues(tipo: 'entrada'|'saida'): Record<string,string> {
    const r: Record<string,string> = {}
    const arr = existingPlan ? (tipo === 'entrada' ? existingPlan.entradas : existingPlan.saidas) : []
    arr.forEach(e => {
      const val = e.v[MES_ATU] || e.v.find(v => v > 0) || 0
      if (val > 0) r[e.nome] = fmtBRL(val)
    })
    return r
  }

  const [step,     setStep]     = useState(1)
  const [objetivo, setObjetivo] = useState<Objetivo>('controlar')
  const [usarSaldo,setUsarSaldo]= useState(true)
  const [saldos,   setSaldos]   = useState<Record<string,string>>(initSaldos)
  const [entradas, setEntradas] = useState<Record<string,string>>(() => initValues('entrada'))
  const [saidas,   setSaidas]   = useState<Record<string,string>>(() => initValues('saida'))
  const [aplicar,  setAplicar]  = useState<Aplicar>('restantes')
  const [faturas,  setFaturas]  = useState<Record<string,string>>(() => {
    const r: Record<string,string> = {}
    const faturaCats = (existingPlan?.saidas ?? []).filter((c: { t?: string }) => c.t === 'fatura_cartao')
    faturaCats.forEach((c: { id?: string; v: number[] }) => {
      const id = c.id?.replace('fatura-', '')
      if (id) {
        const val = c.v[MES_ATU] || c.v.find((v: number) => v > 0) || 0
        if (val > 0) r[id] = fmtBRL(val)
      }
    })
    return r
  })

  const totalEntradas = useMemo(() => catsEntrada.reduce((s,c) => s + parseBRL(entradas[c.nome] ?? ''), 0), [entradas, catsEntrada])
  const totalSaidas   = useMemo(() => catsSaida.reduce((s,c) => s + parseBRL(saidas[c.nome] ?? ''), 0), [saidas, catsSaida])
  const saldoInicialJan = useMemo(() => {
    if (!usarSaldo || !contasBanco.length) return 0
    return contasBanco.reduce((s,c) => s + (parseBRL(saldos[c.id] ?? '') || c.saldoInicial || 0), 0)
  }, [usarSaldo, saldos, contasBanco])

  const cartoes     = useMemo(() => contas.filter(c => c.tipo === 'cartao'), [contas])
  const hasCartoes  = cartoes.length > 0
  const stepLabels  = hasCartoes
    ? ['Objetivo','Saldo inicial','Cartões','Entradas','Saídas','Resumo']
    : ['Objetivo','Saldo inicial','Entradas','Saídas','Resumo']
  const totalSteps  = stepLabels.length

  const resultadoMensal = totalEntradas - totalSaidas
  const mesesAplicar    = aplicar === 'restantes' ? 12 - MES_ATU : 12
  const entradasAnual   = totalEntradas * mesesAplicar
  const saidasAnual     = totalSaidas   * mesesAplicar
  const saldoFinalDez   = saldoInicialJan + entradasAnual - saidasAnual

  function buildV(val: number): number[] {
    return Array(12).fill(0).map((_,i) => aplicar === 'todos' || i >= MES_ATU ? val : 0)
  }

  function criarPlanejamento() {
    const faturaCats = cartoes
      .filter(c => parseBRL(faturas[c.id] ?? '') > 0)
      .map(c => {
        const v = Array(12).fill(0) as number[]
        v[MES_ATU] = parseBRL(faturas[c.id] ?? '')
        return { id: `fatura-${c.id}`, nome: c.nome, t: 'fatura_cartao', v }
      })
    const novoPlano: PlanoAnoData = {
      saldoInicialJan,
      entradas: catsEntrada.filter(c => parseBRL(entradas[c.nome] ?? '') > 0).map(c => ({
        nome: c.nome, id: c.id, v: buildV(parseBRL(entradas[c.nome] ?? '')),
      })),
      saidas: [
        ...catsSaida.filter(c => parseBRL(saidas[c.nome] ?? '') > 0).map(c => ({
          nome: c.nome, id: c.id,
          t: c.tipoMovimento === 'cartao' ? 'cartao' : undefined,
          v: buildV(parseBRL(saidas[c.nome] ?? '')),
        })),
        ...faturaCats,
      ],
    }
    setPlanos(prev => ({ ...prev, [ANO]: novoPlano }))
    setObjetivoUsuario(objetivo)
    if (!onboardingCompleto) setOnboardingCompleto(true)
    navigate('/planejamento', { replace: true })
  }

  // ── Header ────────────────────────────────────────────────────────────
  const header = (
    <div style={{ background:'linear-gradient(135deg,#0f2878,#2563eb)', padding:'12px 20px 20px', flexShrink:0 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:'rgba(255,255,255,.15)',
            border:'1px solid rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="1.5"/>
              <polygon points="10,3 11.2,9.4 10,8.5 8.8,9.4" fill="white"/>
              <polygon points="10,17 8.8,10.6 10,11.5 11.2,10.6" fill="white" opacity=".5"/>
            </svg>
          </div>
          <span style={{ color:'#fff', fontSize:16, fontWeight:700 }}>
            Compass <span style={{ fontWeight:300, opacity:.7 }}>One</span>
          </span>
        </div>
        <button onClick={() => navigate(-1)} style={{
          border:'none', background:'rgba(255,255,255,.15)', color:'#fff',
          width:30, height:30, borderRadius:8, fontSize:16, cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'inherit',
        }}>✕</button>
      </div>

      <div style={{ marginBottom:12 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
          <span style={{ fontSize:11, color:'rgba(255,255,255,.7)', fontWeight:600 }}>
            Passo {step} — {stepLabels[step-1]}
          </span>
          <span style={{ fontSize:11, color:'rgba(255,255,255,.5)' }}>{step} de {totalSteps}</span>
        </div>
        <div style={{ height:4, background:'rgba(255,255,255,.2)', borderRadius:2, overflow:'hidden' }}>
          <div style={{ height:'100%', background:'#fff', borderRadius:2,
            width:`${(step/totalSteps)*100}%`, transition:'width .4s ease' }} />
        </div>
      </div>

      <div style={{ display:'flex', justifyContent:'center', gap:6 }}>
        {Array.from({ length: totalSteps }, (_,i) => (
          <div key={i} style={{
            width: i+1===step ? 20 : 8, height:8, borderRadius:4,
            background: i+1<step ? 'rgba(255,255,255,.6)' : i+1===step ? '#fff' : 'rgba(255,255,255,.25)',
            transition:'all .3s',
          }} />
        ))}
      </div>
    </div>
  )

  // ── Footer ────────────────────────────────────────────────────────────
  const footer = (
    <div style={{ padding:16, background:'#fff', borderTop:'1px solid #e2e8f0', flexShrink:0, display:'flex', gap:10 }}>
      {step > 1 && (
        <button onClick={() => setStep(s => s - 1)} style={{
          flex:1, padding:13, border:'1.5px solid #e2e8f0', borderRadius:12,
          background:'#fff', color:'#64748b', fontSize:14, fontWeight:700,
          cursor:'pointer', fontFamily:'inherit',
        }}>‹ Voltar</button>
      )}
      {step < totalSteps ? (
        <button onClick={() => setStep(s => s + 1)} style={{
          flex:2, padding:13, border:'none', borderRadius:12,
          background:'linear-gradient(135deg,#1a56db,#2563eb)',
          color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer',
          fontFamily:'inherit', boxShadow:'0 4px 12px rgba(26,86,219,.3)',
        }}>Próximo →</button>
      ) : (
        <button onClick={criarPlanejamento} style={{
          flex:2, padding:13, border:'none', borderRadius:12,
          background:'linear-gradient(135deg,#16a34a,#15803d)',
          color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer',
          fontFamily:'inherit', boxShadow:'0 4px 12px rgba(22,163,74,.3)',
        }}>✓ Criar planejamento</button>
      )}
    </div>
  )

  // ── Step 1: Objetivo ──────────────────────────────────────────────────
  function renderStep1() {
    return (
      <>
        <div style={{ fontSize:40, textAlign:'center', marginBottom:12 }}>🎯</div>
        <div style={{ fontSize:18, fontWeight:800, color:'#0f172a', textAlign:'center', marginBottom:6 }}>Qual é seu objetivo?</div>
        <div style={{ fontSize:13, color:'#64748b', textAlign:'center', lineHeight:1.5, marginBottom:24 }}>
          Vamos personalizar seu planejamento de {ANO} com base no que você quer alcançar.
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {OBJETIVOS.map(o => (
            <button key={o.id} onClick={() => setObjetivo(o.id)} style={{
              background: objetivo===o.id ? '#eff6ff' : '#fff',
              border:`2px solid ${objetivo===o.id ? '#1a56db' : '#e2e8f0'}`,
              borderRadius:16, padding:16, cursor:'pointer', fontFamily:'inherit',
              display:'flex', alignItems:'center', gap:14, textAlign:'left', transition:'all .15s',
            }}>
              <div style={{ fontSize:28, flexShrink:0 }}>{o.emoji}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, color:'#0f172a', marginBottom:3 }}>{o.titulo}</div>
                <div style={{ fontSize:11, color:'#64748b', lineHeight:1.4 }}>{o.sub}</div>
              </div>
              <div style={{
                width:22, height:22, borderRadius:'50%', flexShrink:0,
                border:`2px solid ${objetivo===o.id ? '#1a56db' : '#e2e8f0'}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:12, fontWeight:700,
                background: objetivo===o.id ? '#1a56db' : 'transparent',
                color:'#fff', transition:'all .15s',
              }}>{objetivo===o.id ? '✓' : ''}</div>
            </button>
          ))}
        </div>
      </>
    )
  }

  // ── Step 2: Saldo inicial ─────────────────────────────────────────────
  function renderStep2() {
    return (
      <>
        <div style={{ fontSize:40, textAlign:'center', marginBottom:12 }}>🏦</div>
        <div style={{ fontSize:18, fontWeight:800, color:'#0f172a', textAlign:'center', marginBottom:6 }}>Usar saldo dos bancos?</div>
        <div style={{ fontSize:13, color:'#64748b', textAlign:'center', lineHeight:1.5, marginBottom:20 }}>
          Quer começar o planejamento com os saldos atuais das suas contas?
        </div>

        <div style={{ display:'flex', background:'#f1f5f9', borderRadius:12, padding:3, gap:3, marginBottom:20 }}>
          <button onClick={() => setUsarSaldo(true)} style={{
            flex:1, padding:11, border:'none', borderRadius:10, cursor:'pointer',
            fontSize:14, fontWeight:700, fontFamily:'inherit', transition:'all .15s',
            background: usarSaldo ? '#f0fdf4' : 'transparent',
            color: usarSaldo ? '#16a34a' : '#94a3b8',
            boxShadow: usarSaldo ? '0 2px 6px rgba(22,163,74,.15)' : 'none',
          }}>✓ Sim, usar saldos</button>
          <button onClick={() => setUsarSaldo(false)} style={{
            flex:1, padding:11, border:'none', borderRadius:10, cursor:'pointer',
            fontSize:14, fontWeight:700, fontFamily:'inherit', transition:'all .15s',
            background: !usarSaldo ? '#fff1f2' : 'transparent',
            color: !usarSaldo ? '#dc2626' : '#94a3b8',
            boxShadow: !usarSaldo ? '0 2px 6px rgba(220,38,38,.15)' : 'none',
          }}>✕ Não, do zero</button>
        </div>

        {usarSaldo && contasBanco.length === 0 && (
          <div style={{ textAlign:'center', color:'#94a3b8', fontSize:13, padding:'20px 0' }}>
            Nenhuma conta cadastrada. Adicione em Configurações → Bancos.
          </div>
        )}
        {usarSaldo && contasBanco.length > 0 && (
          <>
            <div style={{ fontSize:10, fontWeight:800, color:'#64748b', textTransform:'uppercase',
              letterSpacing:.6, padding:'8px 4px 6px', borderBottom:'1px solid #e2e8f0',
              marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
              🏦 Contas correntes e poupanças
            </div>
            {contasBanco.map(c => (
              <div key={c.id} style={{
                background:'#fff', border:'1.5px solid #e2e8f0',
                borderLeft:`4px solid ${c.cor}`, borderRadius:14, padding:14,
                marginBottom:10, display:'flex', alignItems:'center', gap:12,
              }}>
                <div style={{ width:42, height:42, borderRadius:12, background:c.cor+'22',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                  {c.icone}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#0f172a' }}>{c.nome}</div>
                  <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>
                    {c.tipo === 'poupanca' ? 'Poupança' : 'Conta Corrente'}
                  </div>
                </div>
                <input
                  value={saldos[c.id] ?? ''}
                  onChange={e => setSaldos(prev => ({ ...prev, [c.id]: maskBRL(e.target.value) }))}
                  placeholder="R$ 0,00"
                  style={saldoInputSt}
                />
              </div>
            ))}
          </>
        )}
      </>
    )
  }

  // ── Step 3 (opcional): Cartões ────────────────────────────────────────
  function renderStepCartoes() {
    const totalFaturas = cartoes.reduce((s, c) => s + parseBRL(faturas[c.id] ?? ''), 0)
    return (
      <>
        <div style={{ fontSize:40, textAlign:'center', marginBottom:12 }}>💳</div>
        <div style={{ fontSize:18, fontWeight:800, color:'#0f172a', textAlign:'center', marginBottom:6 }}>
          Fatura dos seus cartões
        </div>
        <div style={{ fontSize:13, color:'#64748b', textAlign:'center', lineHeight:1.5, marginBottom:16 }}>
          Informe o valor da fatura atual de cada cartão de crédito.
        </div>
        <div style={{ padding:'10px 14px', background:'#fffbeb', borderRadius:10,
          border:'1px solid #fde68a', marginBottom:20 }}>
          <div style={{ fontSize:12, color:'#92400e', lineHeight:1.6 }}>
            💡 Use o valor da fatura mais recente como ponto de partida. O planejamento vai calcular automaticamente nos meses seguintes com base nos seus lançamentos.
          </div>
        </div>
        {cartoes.map(c => (
          <div key={c.id} style={{
            background:'#fff', border:'1.5px solid #e2e8f0',
            borderLeft:`4px solid ${c.cor}`, borderRadius:14, padding:14,
            marginBottom:10, display:'flex', alignItems:'center', gap:12,
          }}>
            <div style={{ width:42, height:42, borderRadius:12, background:c.cor+'22',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
              {c.icone}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#0f172a' }}>{c.nome}</div>
              {c.limiteCartao != null && c.limiteCartao > 0 && (
                <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>
                  Limite: {fmtBRL(c.limiteCartao)}
                </div>
              )}
            </div>
            <input
              value={faturas[c.id] ?? ''}
              onChange={e => setFaturas(prev => ({ ...prev, [c.id]: maskBRL(e.target.value) }))}
              onFocus={e => { e.target.style.borderColor='#7c3aed'; e.target.style.background='#fff' }}
              onBlur={e  => { e.target.style.borderColor='#e2e8f0'; e.target.style.background='#f8fafc' }}
              placeholder="R$ 0,00"
              style={inputSt}
            />
          </div>
        ))}
        {totalFaturas > 0 && (
          <div style={{ background:'#f5f3ff', border:'1px solid #ddd6fe', borderRadius:12,
            padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:13, color:'#6d28d9', fontWeight:600 }}>Total faturas</span>
            <span style={{ fontSize:15, fontWeight:800, color:'#6d28d9' }}>{fmtBRL(totalFaturas)}</span>
          </div>
        )}
      </>
    )
  }

  // ── Steps 3 & 4: Categorias ───────────────────────────────────────────
  function renderCatStep(
    tipo: 'entrada'|'saida',
    cats: typeof catsEntrada,
    values: Record<string,string>,
    setValues: React.Dispatch<React.SetStateAction<Record<string,string>>>,
  ) {
    const isEntrada = tipo === 'entrada'
    const grupos    = getCatsByGrupo(cats)
    return (
      <>
        <div style={{ fontSize:40, textAlign:'center', marginBottom:12 }}>{isEntrada ? '↑' : '↓'}</div>
        <div style={{ fontSize:18, fontWeight:800, color:'#0f172a', textAlign:'center', marginBottom:6 }}>
          {isEntrada ? 'Suas receitas mensais' : 'Suas despesas mensais'}
        </div>
        <div style={{ fontSize:13, color:'#64748b', textAlign:'center', lineHeight:1.5, marginBottom:!isEntrada ? 12 : 24 }}>
          Informe o valor mensal de cada categoria. Deixe em branco se não se aplica.
        </div>
        {!isEntrada && (
          <div style={{ fontSize:12, color:'#64748b', lineHeight:1.6, marginBottom:20,
            padding:'10px 14px', background:'#fffbeb', borderRadius:10, border:'1px solid #fde68a' }}>
            💡 Preencha apenas as que você conhece. Deixe em branco as que não sabe — você ajusta depois.
          </div>
        )}
        {grupos.length === 0 && (
          <div style={{ textAlign:'center', color:'#94a3b8', fontSize:13, padding:'20px 0' }}>
            Nenhuma categoria {isEntrada ? 'de entrada' : 'de saída'} ativa.
          </div>
        )}
        {grupos.map(({ grupo, cats: gCats }) => (
          <div key={grupo}>
            <div style={{ fontSize:10, fontWeight:800, color:'#64748b', textTransform:'uppercase',
              letterSpacing:.6, padding:'8px 4px 6px', borderBottom:'1px solid #e2e8f0', marginBottom:8 }}>
              {grupo}
            </div>
            {gCats.map(c => (
              <div key={c.nome} style={{
                background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:12,
                padding:'12px 14px', marginBottom:8, display:'flex', alignItems:'center', gap:10,
              }}>
                <div style={{ width:36, height:36, borderRadius:10, background:c.cor+'22',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                  {c.icone}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#0f172a' }}>{c.nome}</div>
                  {c.descricao && <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>{c.descricao}</div>}
                </div>
                <input
                  value={values[c.nome] ?? ''}
                  onChange={e => setValues(prev => ({ ...prev, [c.nome]: maskBRL(e.target.value) }))}
                  onFocus={e => { e.target.style.borderColor='#1a56db'; e.target.style.background='#fff' }}
                  onBlur={e  => { e.target.style.borderColor='#e2e8f0'; e.target.style.background='#f8fafc' }}
                  placeholder="R$ 0,00"
                  style={inputSt}
                />
              </div>
            ))}
          </div>
        ))}
      </>
    )
  }

  // ── Step 5: Resumo ────────────────────────────────────────────────────
  function renderStep5() {
    const corRes = resultadoMensal > 0 ? '#16a34a' : resultadoMensal < 0 ? '#dc2626' : '#64748b'
    const corAnual= saldoFinalDez  >= 0 ? '#16a34a' : '#dc2626'

    return (
      <>
        <div style={{ fontSize:40, textAlign:'center', marginBottom:12 }}>✅</div>
        <div style={{ fontSize:18, fontWeight:800, color:'#0f172a', textAlign:'center', marginBottom:6 }}>Resumo do planejamento</div>
        <div style={{ fontSize:13, color:'#64748b', textAlign:'center', lineHeight:1.5, marginBottom:20 }}>
          Confira os valores e escolha como aplicar.
        </div>

        {/* Visão mensal */}
        <div style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:16, overflow:'hidden', marginBottom:12 }}>
          <div style={{ padding:'14px 16px', borderBottom:'1px solid #e2e8f0',
            display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:13, fontWeight:700, color:'#0f172a' }}>📊 Visão mensal</span>
            <span style={{ fontSize:11, color:'#94a3b8' }}>Base Janeiro {ANO}</span>
          </div>
          {saldoInicialJan > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 16px', borderBottom:'1px solid #f8faff' }}>
              <span style={{ fontSize:12, color:'#64748b' }}>🏦 Saldo inicial</span>
              <span style={{ fontSize:13, fontWeight:700, color:'#d97706' }}>{fmtBRL(saldoInicialJan)}</span>
            </div>
          )}
          <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 16px', borderBottom:'1px solid #f8faff' }}>
            <span style={{ fontSize:12, color:'#64748b' }}>↑ Total entradas</span>
            <span style={{ fontSize:13, fontWeight:700, color:'#1a56db' }}>{fmtBRL(totalEntradas)}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 16px', borderBottom:'1px solid #f8faff' }}>
            <span style={{ fontSize:12, color:'#64748b' }}>↓ Total saídas</span>
            <span style={{ fontSize:13, fontWeight:700, color:'#dc2626' }}>{fmtBRL(totalSaidas)}</span>
          </div>
          <div style={{ padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f8faff' }}>
            <span style={{ fontSize:13, fontWeight:700, color:'#0f172a' }}>= Resultado mensal</span>
            <span style={{ fontSize:16, fontWeight:800, letterSpacing:-.4, color:corRes }}>
              {resultadoMensal >= 0 ? '+' : ''}{fmtBRL(resultadoMensal)}
            </span>
          </div>
          {resultadoMensal < 0 && (
            <div style={{ padding:'12px 16px', background:'#fff1f2', borderTop:'1px solid #fecdd3' }}>
              <div style={{ fontSize:12, color:'#991b1b', lineHeight:1.5, marginBottom:8 }}>
                ⚠ Seus gastos planejados são maiores que sua renda. Revise as categorias de saída para equilibrar.
              </div>
              <button onClick={() => setStep(hasCartoes ? 5 : 4)} style={{
                border:'none', background:'transparent', color:'#dc2626',
                fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', padding:0,
              }}>← Revisar saídas</button>
            </div>
          )}
          {resultadoMensal > 0 && totalEntradas > 0 && (
            <div style={{ padding:'12px 16px', background:'#f0fdf4', borderTop:'1px solid #bbf7d0' }}>
              <div style={{ fontSize:12, color:'#166534', lineHeight:1.5 }}>
                ✓ Ótimo! Se seguir esse plano, você vai guardar {fmtBRL(resultadoMensal)} por mês.
              </div>
            </div>
          )}
        </div>

        {/* Projeção anual */}
        <div style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:16, overflow:'hidden', marginBottom:16 }}>
          <div style={{ padding:'14px 16px', borderBottom:'1px solid #e2e8f0' }}>
            <span style={{ fontSize:13, fontWeight:700, color:'#0f172a' }}>📅 Projeção anual {ANO}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 16px', borderBottom:'1px solid #f8faff' }}>
            <span style={{ fontSize:12, color:'#64748b' }}>↑ Entradas ({mesesAplicar} meses)</span>
            <span style={{ fontSize:13, fontWeight:700, color:'#1a56db' }}>{fmtBRL(entradasAnual)}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 16px', borderBottom:'1px solid #f8faff' }}>
            <span style={{ fontSize:12, color:'#64748b' }}>↓ Saídas ({mesesAplicar} meses)</span>
            <span style={{ fontSize:13, fontWeight:700, color:'#dc2626' }}>{fmtBRL(saidasAnual)}</span>
          </div>
          <div style={{ padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f8faff' }}>
            <span style={{ fontSize:13, fontWeight:700, color:'#0f172a' }}>= Saldo final Dez {ANO}</span>
            <span style={{ fontSize:16, fontWeight:800, letterSpacing:-.4, color:corAnual }}>{fmtBRL(saldoFinalDez)}</span>
          </div>
        </div>

        {/* Como aplicar */}
        <div style={{ fontSize:12, fontWeight:700, color:'#0f172a', marginBottom:4 }}>Como deseja aplicar?</div>
        <div style={{ fontSize:11, color:'#94a3b8', marginBottom:10 }}>
          Está começando agora? Escolha "A partir de agora".
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {([
            { id:'restantes' as Aplicar, emoji:'📅', titulo:'A partir de agora', sub:`${MESES_FULL[MES_ATU]} → Dezembro ${ANO}` },
            { id:'todos'     as Aplicar, emoji:'📆', titulo:'Ano inteiro (Jan → Dez)', sub:`Todos os 12 meses de ${ANO}` },
          ]).map(opt => (
            <button key={opt.id} onClick={() => setAplicar(opt.id)} style={{
              background: aplicar===opt.id ? '#eff6ff' : '#fff',
              border:`2px solid ${aplicar===opt.id ? '#1a56db' : '#e2e8f0'}`,
              borderRadius:14, padding:'14px 16px', cursor:'pointer', fontFamily:'inherit',
              display:'flex', alignItems:'center', gap:12, textAlign:'left', transition:'all .15s',
            }}>
              <div style={{ fontSize:24, flexShrink:0 }}>{opt.emoji}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#0f172a', marginBottom:3 }}>{opt.titulo}</div>
                <div style={{ fontSize:11, color:'#64748b' }}>{opt.sub}</div>
              </div>
              <div style={{
                width:22, height:22, borderRadius:'50%', flexShrink:0,
                border:`2px solid ${aplicar===opt.id ? '#1a56db' : '#e2e8f0'}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:11, fontWeight:700,
                background: aplicar===opt.id ? '#1a56db' : 'transparent',
                color:'#fff',
              }}>{aplicar===opt.id ? '✓' : ''}</div>
            </button>
          ))}
        </div>
      </>
    )
  }

  const stepContent = hasCartoes
    ? [renderStep1(), renderStep2(), renderStepCartoes(),
       renderCatStep('entrada', catsEntrada, entradas, setEntradas),
       renderCatStep('saida',   catsSaida,   saidas,   setSaidas),
       renderStep5()]
    : [renderStep1(), renderStep2(),
       renderCatStep('entrada', catsEntrada, entradas, setEntradas),
       renderCatStep('saida',   catsSaida,   saidas,   setSaidas),
       renderStep5()]

  return (
    <div style={{ minHeight:'100dvh', background:'#f0f4ff', display:'flex', flexDirection:'column',
      fontFamily:"-apple-system,'Inter',sans-serif", maxWidth:480, margin:'0 auto' }}>
      {header}
      <div style={{ flex:1, overflowY:'auto', padding:'20px 16px', scrollbarWidth:'none' }}>
        {stepContent[step - 1]}
      </div>
      {footer}
    </div>
  )
}
