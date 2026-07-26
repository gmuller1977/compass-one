import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { PlanoCat } from '../context/AppContext'
import AppHeader from '../components/AppHeader'

const MESES      = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const COR = {
  azul:'#1a56db', azulEscuro:'#1e40af', azulMedio:'#2563eb',
  verde:'#16a34a', vermelho:'#dc2626', borda:'#e2e8f0',
  textoSuave:'#64748b', texto:'#0f172a', branco:'#ffffff', fundo:'#f8fafc',
}

type EventoTipo = ''|'nova_renda'|'novo_gasto'|'encerramento'|'ajuste'
type EventoState = {
  step: 1|2
  tipo: EventoTipo
  mesInicio: number
  catTipo: 'entrada'|'saida'
  catNome: string
  novoValor: string
}

const EVENTOS = [
  { id:'nova_renda'   as const, emoji:'🟢', label:'Nova Renda',      desc:'Salário, freelance, aluguel recebido', catTipo:'entrada' as const },
  { id:'novo_gasto'   as const, emoji:'🔴', label:'Novo Gasto',      desc:'Assinatura, dívida nova, mensalidade', catTipo:'saida'   as const },
  { id:'encerramento' as const, emoji:'❌', label:'Encerramento',    desc:'Fim de salário, quitação de dívida',   catTipo:'saida'   as const },
  { id:'ajuste'       as const, emoji:'🔧', label:'Ajuste de Valor', desc:'Aumento de salário, reajuste',         catTipo:'entrada' as const },
]

const TIPO_INFO: Record<string, { emoji:string; label:string }> = {
  nova_renda:   { emoji:'🟢', label:'Nova Renda' },
  novo_gasto:   { emoji:'🔴', label:'Novo Gasto' },
  encerramento: { emoji:'❌', label:'Encerramento' },
  ajuste:       { emoji:'🔧', label:'Ajuste de Valor' },
}

export default function Simulacao() {
  const { pathname } = useLocation()
  const { planos, planosReal, setPlanos } = useApp()

  const anoAtual = new Date().getFullYear()
  const mesAtual = new Date().getMonth()

  const [evento, setEvento] = useState<EventoState | null>(null)
  const [resultado, setResultado] = useState<string | null>(null)

  const origAno = planos[anoAtual]
  const realAno = planosReal[anoAtual]

  const catList: PlanoCat[] = (() => {
    if (!evento) return []
    const fromReal = evento.catTipo === 'entrada' ? realAno?.entradas : realAno?.saidas
    if (fromReal && fromReal.length > 0) return fromReal
    return (evento.catTipo === 'entrada' ? origAno?.entradas : origAno?.saidas) ?? []
  })()

  const catSource    = catList.find(c => c.nome === evento?.catNome)
  const valorExiste  = catSource?.v[evento?.mesInicio ?? 0] ?? 0
  const adicional    = parseFloat(evento?.novoValor ?? '') || 0
  const ehEncerr     = evento?.tipo === 'encerramento'
  const ehAjuste     = evento?.tipo === 'ajuste'
  const podeAplicar  = !!evento?.catNome && (ehEncerr || !!evento?.novoValor)

  function aplicarEvento() {
    if (!evento?.catNome) return
    const { tipo, mesInicio, catTipo, catNome, novoValor } = evento
    const delta = parseFloat(novoValor) || 0

    setPlanos(prev => {
      const planoAno = prev[anoAtual]
      if (!planoAno) return prev
      const applyList = (list: PlanoCat[]) => list.map(c =>
        c.nome !== catNome ? c : {
          ...c,
          v: c.v.map((v, mi) => mi < mesInicio ? v : tipo === 'encerramento' ? 0 : v + delta),
        }
      )
      return {
        ...prev,
        [anoAtual]: {
          ...planoAno,
          entradas: catTipo === 'entrada' ? applyList(planoAno.entradas) : planoAno.entradas,
          saidas:   catTipo === 'saida'   ? applyList(planoAno.saidas)   : planoAno.saidas,
        },
      }
    })

    const info = TIPO_INFO[evento.tipo] ?? { emoji:'⚡', label:'Evento' }
    setResultado(`${info.emoji} ${info.label} aplicado em "${catNome}" a partir de ${MESES_FULL[mesInicio]}`)
    setEvento(null)
  }

  return (
    <div style={{ minHeight:'100vh', background:COR.fundo, fontFamily:"-apple-system,'Inter',sans-serif" }}>
      <AppHeader currentPath={pathname} />

      <div style={{ maxWidth:640, margin:'0 auto', padding:'32px 24px' }}>

        {/* Título */}
        <div style={{ marginBottom:24 }}>
          <h1 style={{ fontSize:22, fontWeight:700, color:COR.texto, margin:'0 0 4px' }}>Simulação</h1>
          <p style={{ fontSize:13, color:COR.textoSuave, margin:0 }}>
            Simule o impacto de eventos no seu planejamento financeiro.
          </p>
        </div>

        {/* Card Evento de Vida */}
        <div style={{ background:COR.branco, border:`1px solid ${COR.borda}`, borderRadius:16,
          padding:24, boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>

          {/* Cabeçalho do card */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom: evento ? 20 : 0 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:'#fef3c7',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
              ⚡
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:700, color:COR.texto }}>Evento de Vida</div>
              <div style={{ fontSize:12, color:COR.textoSuave }}>
                {evento
                  ? `Passo ${evento.step} de 2 · ${evento.step === 1 ? 'Tipo e início' : 'Categoria e valor'}`
                  : 'Nova renda, novo gasto, encerramento ou ajuste de valor'}
              </div>
            </div>
            {!evento && (
              <button onClick={() => { setResultado(null); setEvento({ step:1, tipo:'', mesInicio:mesAtual, catTipo:'entrada', catNome:'', novoValor:'' }) }}
                style={{ padding:'8px 16px', border:'none', borderRadius:9, cursor:'pointer',
                  fontFamily:'inherit', fontSize:13, fontWeight:600, color:'#fff',
                  background:`linear-gradient(135deg,${COR.azulEscuro},${COR.azulMedio})` }}>
                + Criar evento
              </button>
            )}
            {evento && (
              <button onClick={() => setEvento(null)}
                style={{ border:'none', background:'transparent', cursor:'pointer', fontSize:22, color:COR.textoSuave, lineHeight:1, padding:'0 2px' }}>
                ×
              </button>
            )}
          </div>

          {/* ── PASSO 1 ── */}
          {evento?.step === 1 && (
            <>
              <div style={{ fontSize:11, fontWeight:700, color:COR.textoSuave, textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>
                Tipo do evento
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:20 }}>
                {EVENTOS.map(ev => (
                  <button key={ev.id}
                    onClick={() => setEvento(prev => prev ? { ...prev, tipo:ev.id, catTipo:ev.catTipo, catNome:'' } : prev)}
                    style={{ padding:'12px', borderRadius:10,
                      border:`2px solid ${evento.tipo === ev.id ? COR.azul : COR.borda}`,
                      cursor:'pointer', textAlign:'left', fontFamily:'inherit', transition:'all .15s',
                      background: evento.tipo === ev.id ? '#eff6ff' : COR.branco }}>
                    <div style={{ fontSize:20, marginBottom:4 }}>{ev.emoji}</div>
                    <div style={{ fontSize:12, fontWeight:700, color:COR.texto }}>{ev.label}</div>
                    <div style={{ fontSize:11, color:COR.textoSuave }}>{ev.desc}</div>
                  </button>
                ))}
              </div>

              <div style={{ fontSize:11, fontWeight:700, color:COR.textoSuave, textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>
                A partir de qual mês?
              </div>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:20 }}>
                {MESES.map((mes, mi) => (
                  <button key={mi} disabled={mi < mesAtual}
                    onClick={() => mi >= mesAtual && setEvento(prev => prev ? { ...prev, mesInicio:mi } : prev)}
                    style={{ padding:'4px 10px', borderRadius:6,
                      cursor: mi < mesAtual ? 'default' : 'pointer',
                      border:`1px solid ${evento.mesInicio === mi ? COR.azul : COR.borda}`,
                      fontSize:11, fontWeight:600, fontFamily:'inherit',
                      background: evento.mesInicio === mi ? '#eff6ff' : mi < mesAtual ? '#f8fafc' : COR.branco,
                      color: evento.mesInicio === mi ? COR.azul : mi < mesAtual ? '#cbd5e1' : COR.texto }}>
                    {mes}
                  </button>
                ))}
              </div>

              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setEvento(null)}
                  style={{ flex:1, padding:'10px 0', border:`1px solid ${COR.borda}`, borderRadius:9,
                    fontSize:13, fontWeight:600, color:COR.textoSuave, fontFamily:'inherit',
                    cursor:'pointer', background:COR.branco }}>
                  Cancelar
                </button>
                <button disabled={!evento.tipo}
                  onClick={() => evento.tipo && setEvento(prev => prev ? { ...prev, step:2 } : prev)}
                  style={{ flex:2, padding:'10px 0', border:'none', borderRadius:9,
                    fontSize:13, fontWeight:600, color:'#fff', fontFamily:'inherit',
                    cursor: evento.tipo ? 'pointer' : 'default',
                    background: evento.tipo ? `linear-gradient(135deg,${COR.azulEscuro},${COR.azulMedio})` : '#cbd5e1' }}>
                  Próximo →
                </button>
              </div>
            </>
          )}

          {/* ── PASSO 2 ── */}
          {evento?.step === 2 && (() => {
            const info = TIPO_INFO[evento.tipo] ?? { emoji:'⚡', label:'Evento' }
            return (
              <>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                  <span style={{ fontSize:18 }}>{info.emoji}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:COR.texto }}>{info.label}</span>
                  <span style={{ fontSize:12, color:COR.textoSuave }}>· a partir de {MESES_FULL[evento.mesInicio]}</span>
                </div>

                {/* Toggle entrada / saída */}
                <div style={{ display:'flex', gap:6, marginBottom:14 }}>
                  {(['entrada','saida'] as const).map(t => (
                    <button key={t}
                      onClick={() => setEvento(prev => prev ? { ...prev, catTipo:t, catNome:'', novoValor:'' } : prev)}
                      style={{ flex:1, padding:'6px 0', borderRadius:7, cursor:'pointer',
                        fontSize:12, fontWeight:600, fontFamily:'inherit',
                        border:`1px solid ${evento.catTipo === t ? COR.azul : COR.borda}`,
                        background: evento.catTipo === t ? '#eff6ff' : COR.branco,
                        color: evento.catTipo === t ? COR.azul : COR.textoSuave }}>
                      {t === 'entrada' ? '↑ Entrada' : '↓ Saída'}
                    </button>
                  ))}
                </div>

                {/* Categoria */}
                <div style={{ fontSize:11, fontWeight:700, color:COR.textoSuave, textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>
                  Categoria
                </div>
                <select value={evento.catNome}
                  onChange={e => setEvento(prev => prev ? { ...prev, catNome:e.target.value, novoValor:'' } : prev)}
                  style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:`1px solid ${COR.borda}`,
                    fontSize:13, fontFamily:'inherit', marginBottom:14, outline:'none',
                    background:COR.branco, color:COR.texto }}>
                  <option value="">Selecione uma categoria...</option>
                  {catList.map(c => <option key={c.nome} value={c.nome}>{c.nome}</option>)}
                </select>

                {/* Valor atual */}
                {evento.catNome && !ehEncerr && (
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                    background:'#f8fafc', borderRadius:8, padding:'8px 12px', marginBottom:14, fontSize:12 }}>
                    <span style={{ color:COR.textoSuave }}>Valor atual em {MESES_FULL[evento.mesInicio]}</span>
                    <span style={{ fontWeight:700, color:COR.texto }}>
                      {valorExiste.toLocaleString('pt-BR',{ style:'currency', currency:'BRL' })}
                    </span>
                  </div>
                )}

                {/* Campo valor */}
                {!ehEncerr && (
                  <>
                    <div style={{ fontSize:11, fontWeight:700, color:COR.textoSuave, textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>
                      {ehAjuste ? 'Valor do ajuste' : 'Valor mensal'}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: evento.catNome && adicional ? 8 : 20 }}>
                      <span style={{ fontSize:14, color:COR.textoSuave, flexShrink:0 }}>R$</span>
                      <input type="number" value={evento.novoValor} placeholder="0,00"
                        onChange={e => setEvento(prev => prev ? { ...prev, novoValor:e.target.value } : prev)}
                        style={{ flex:1, padding:'8px 10px', borderRadius:8, border:`1px solid ${COR.borda}`,
                          fontSize:14, fontFamily:'inherit', outline:'none' }}/>
                    </div>
                    {evento.catNome && adicional !== 0 && (
                      <div style={{ fontSize:12, color:'#166534', marginBottom:20,
                        background:'#f0fdf4', borderRadius:8, padding:'8px 12px', border:'1px solid #bbf7d0' }}>
                        {ehAjuste
                          ? <>Será aplicado <strong>{adicional.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong> a partir de {MESES_FULL[evento.mesInicio]}</>
                          : <>Novo total: <strong>{(valorExiste + adicional).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong> a partir de {MESES_FULL[evento.mesInicio]}</>
                        }
                      </div>
                    )}
                    {(!evento.catNome || adicional === 0) && <div style={{ height:20 }} />}
                  </>
                )}

                {/* Aviso encerramento */}
                {ehEncerr && evento.catNome && (
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20,
                    background:'#fff5f5', borderRadius:8, padding:'10px 12px', border:'1px solid #fecaca' }}>
                    <span style={{ fontSize:16 }}>⚠️</span>
                    <span style={{ fontSize:12, color:COR.vermelho, fontWeight:600 }}>
                      O valor desta categoria será zerado a partir de {MESES_FULL[evento.mesInicio]}
                    </span>
                  </div>
                )}
                {ehEncerr && !evento.catNome && <div style={{ height:20 }} />}

                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => setEvento(prev => prev ? { ...prev, step:1 } : prev)}
                    style={{ flex:1, padding:'10px 0', border:`1px solid ${COR.borda}`, borderRadius:9,
                      fontSize:13, fontWeight:600, color:COR.textoSuave, fontFamily:'inherit',
                      cursor:'pointer', background:COR.branco }}>
                    ← Voltar
                  </button>
                  <button disabled={!podeAplicar} onClick={aplicarEvento}
                    style={{ flex:2, padding:'10px 0', border:'none', borderRadius:9,
                      fontSize:13, fontWeight:600, color:'#fff', fontFamily:'inherit',
                      cursor: podeAplicar ? 'pointer' : 'default',
                      background: podeAplicar
                        ? `linear-gradient(135deg,${COR.azulEscuro},${COR.azulMedio})`
                        : '#cbd5e1' }}>
                    ✓ Aplicar ao planejamento
                  </button>
                </div>
              </>
            )
          })()}
        </div>

        {/* Resultado */}
        {resultado && (
          <div style={{ marginTop:16, background:'#f0fdf4', border:'1px solid #bbf7d0',
            borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:13, fontWeight:600, color:COR.verde, flex:1 }}>{resultado}</span>
            <button onClick={() => { setResultado(null); setEvento({ step:1, tipo:'', mesInicio:mesAtual, catTipo:'entrada', catNome:'', novoValor:'' }) }}
              style={{ padding:'6px 12px', border:`1px solid ${COR.verde}`, borderRadius:7, cursor:'pointer',
                fontFamily:'inherit', fontSize:11, fontWeight:600, color:COR.verde, background:'transparent',
                whiteSpace:'nowrap' }}>
              + Outro evento
            </button>
            <button onClick={() => setResultado(null)}
              style={{ border:'none', background:'transparent', cursor:'pointer', fontSize:20, color:COR.verde, lineHeight:1, padding:'0 2px' }}>
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
