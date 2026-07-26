import { useState, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { DadosMes, Categoria } from '../context/AppContext'
import { iconeCategoria } from '../utils/categoriaIcone'
import AppHeader from '../components/AppHeader'

const COR = {
  azul: '#1a56db', fundo: '#f0f4ff', branco: '#ffffff', texto: '#0f172a',
  textoSuave: '#64748b', borda: '#e2e8f0',
  verde: '#16a34a', vermelho: '#dc2626', amarelo: '#d97706',
  vermelhoFundoGrupo: '#ffeaea',
  verdeFundoGrupo: '#e8fdf0',
}
const MESES_CURTOS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const NOMES_MESES  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS_SEM     = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

function fmt(v: number) { return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) }
function diasNoMes(mes: number, ano: number) { return new Date(ano, mes+1, 0).getDate() }
function barCor(perc: number, isEntrada?: boolean) {
  if (isEntrada) return perc >= 1 ? COR.verde : (perc >= 0.8 ? COR.amarelo : COR.textoSuave)
  if (perc > 1) return COR.vermelho
  if (perc >= 0.9) return COR.amarelo
  return COR.verde
}

type Lanc = { dia: number; descricao: string; valor: number; icone: string; sub: string }
type CatReal = { total: number; totalBanc: number; totalCart: number; lancamentos: Lanc[] }
function mkCatReal(): CatReal { return { total:0, totalBanc:0, totalCart:0, lancamentos:[] } }

export default function Acompanhamento() {
  const hoje    = new Date()
  const mesHoje = hoje.getMonth()
  const anoHoje = hoje.getFullYear()

  const [mes, setMes]   = useState(mesHoje)
  const [ano, setAno]   = useState(anoHoje)
  const [abertos, setAbertos] = useState<Set<string>>(new Set())

  const { pathname } = useLocation()
  const { contas, categorias, planos, extratoData, faturaData } = useApp()

  const mesStr    = String(mes+1).padStart(2,'0')
  const totalDias = diasNoMes(mes, ano)
  const dadosAno  = planos[ano]
  const isPastMonth = ano < anoHoje || (ano === anoHoje && mes < mesHoje)

  // ── Realizados ────────────────────────────────────────────────────────
  const { saidasMap, entradasMap } = useMemo(() => {
    const saidas:  Record<string, CatReal> = {}
    const entradas: Record<string, CatReal> = {}
    const sufixo = `-${ano}-${mesStr}`

    const getSaida   = (n: string) => { if (!saidas[n])   saidas[n]  = mkCatReal(); return saidas[n] }
    const getEntrada = (n: string) => { if (!entradas[n]) entradas[n] = mkCatReal(); return entradas[n] }

    for (const [key, dados] of Object.entries(extratoData)) {
      if (!key.endsWith(sufixo)) continue
      if (contas.some(c => c.tipo === 'cartao' && key.startsWith(c.id))) continue
      const dm = dados as DadosMes

      for (let d = 1; d <= totalDias; d++) {
        for (const l of dm.lancamentos?.[d] ?? []) {
          if (l.tipo === 'saida') {
            const c = getSaida(l.categoria)
            c.total += l.valor; c.totalBanc += l.valor
            c.lancamentos.push({ dia:d, descricao:l.descricao, valor:l.valor, icone:'🏦', sub:l.formaPagamento })
          } else {
            const c = getEntrada(l.categoria)
            c.total += l.valor; c.totalBanc += l.valor
            c.lancamentos.push({ dia:d, descricao:l.descricao, valor:l.valor, icone:'🏦', sub:l.formaPagamento })
          }
        }
      }

      if (dm.fixasConsolidadas) {
        for (const fixaCat of categorias.filter((c: Categoria) => c.fixa && c.ativa)) {
          const ehAuto = fixaCat.formaPagamento === 'automatico'
          const confirmada = dm.fixasConsolidadas[fixaCat.id] !== undefined
            ? dm.fixasConsolidadas[fixaCat.id]
            : (ehAuto && isPastMonth)
          if (!confirmada) continue
          const planList = fixaCat.tipo === 'saida' ? dadosAno?.saidas : dadosAno?.entradas
          const planVal = planList?.find(c => c.nome === fixaCat.nome)?.v[mes] ?? 0
          const val = dm.fixasValorOverride?.[fixaCat.id] ?? (planVal > 0 ? planVal : 0)
          if (val <= 0) continue
          if (fixaCat.tipo === 'saida') {
            const c = getSaida(fixaCat.nome)
            c.total += val; c.totalBanc += val
            c.lancamentos.push({ dia:1, descricao:fixaCat.nome, valor:val, icone:'🏦', sub:'automático' })
          } else {
            const c = getEntrada(fixaCat.nome)
            c.total += val; c.totalBanc += val
            c.lancamentos.push({ dia:1, descricao:fixaCat.nome, valor:val, icone:'🏦', sub:'automático' })
          }
        }
      }
    }

    const fat = faturaData as Record<string, { lancamentos: Record<number, { tipo: string; categoria: string; descricao?: string; valor: number }[]> }>
    for (const card of contas.filter(c => c.tipo === 'cartao')) {
      const key = `${card.id}-${ano}-${mesStr}`
      const dm = fat[key]
      if (!dm) continue
      for (let d = 1; d <= totalDias; d++) {
        for (const l of dm.lancamentos?.[d] ?? []) {
          if (l.tipo === 'entrada') {
            const c = getSaida(l.categoria)
            c.total += l.valor; c.totalCart += l.valor
            c.lancamentos.push({ dia:d, descricao:l.descricao??l.categoria, valor:l.valor, icone:'💳', sub:card.apelido??card.nome })
          }
        }
      }
    }

    for (const c of Object.values(saidas))   c.lancamentos.sort((a,b) => a.dia-b.dia)
    for (const c of Object.values(entradas))  c.lancamentos.sort((a,b) => a.dia-b.dia)
    return { saidasMap: saidas, entradasMap: entradas }
  }, [ano, mes, mesStr, totalDias, isPastMonth, extratoData, faturaData, contas, categorias, dadosAno])

  // ── Grupos ────────────────────────────────────────────────────────────
  const cartaoNomes = useMemo(
    () => new Set(contas.filter(c => c.tipo === 'cartao').map(c => c.nome.toLowerCase())),
    [contas],
  )

  function buildGrupos(tipo: 'saida' | 'entrada') {
    const cats = categorias.filter((c: Categoria) =>
      c.tipo === tipo && c.ativa && !cartaoNomes.has(c.nome.toLowerCase())
    )
    const gs = Array.from(new Set(cats.map((c: Categoria) => c.grupo ?? '__sem_grupo__')))
    return gs.sort((a,b) => {
      if (a === '__sem_grupo__') return 1
      if (b === '__sem_grupo__') return -1
      return a.localeCompare(b, 'pt-BR')
    })
  }

  const gruposSaida   = useMemo(() => buildGrupos('saida'),  [categorias, cartaoNomes])
  const gruposEntrada = useMemo(() => buildGrupos('entrada'), [categorias, cartaoNomes])

  const { totalPrevS, totalRealS, totalPrevE, totalRealE } = useMemo(() => {
    const totalPrevS = (dadosAno?.saidas ?? []).reduce((s,c) => s + (c.v[mes]??0), 0)
    const totalRealS = Object.values(saidasMap).reduce((s,c) => s + c.total, 0)
    const totalPrevE = (dadosAno?.entradas ?? []).reduce((s,c) => s + (c.v[mes]??0), 0)
    const totalRealE = Object.values(entradasMap).reduce((s,c) => s + c.total, 0)
    return { totalPrevS, totalRealS, totalPrevE, totalRealE }
  }, [dadosAno, mes, saidasMap, entradasMap])

  function toggleAberto(nome: string) {
    setAbertos(prev => { const n = new Set(prev); n.has(nome)?n.delete(nome):n.add(nome); return n })
  }

  // ── Linha de categoria ─────────────────────────────────────────────────
  function CatRow({ nome, prev, realBanc, realCart, lancamentos, isEntrada }: {
    nome: string; prev: number; realBanc: number; realCart: number
    lancamentos: Lanc[]; isEntrada?: boolean
  }) {
    const { icone, cor: corIcone } = iconeCategoria(categorias, nome)
    const lancAbs    = realBanc + realCart
    const disponivel = prev - lancAbs
    const perc       = prev > 0 ? lancAbs / prev : (lancAbs > 0 ? 1 : 0)
    const bc         = barCor(perc, isEntrada)
    const aberto     = abertos.has(nome)

    const realColor  = isEntrada
      ? (lancAbs > 0 ? COR.verde : COR.textoSuave)
      : (lancAbs === 0 ? COR.textoSuave : (lancAbs <= prev || prev === 0) ? COR.azul : COR.vermelho)

    const dispColor  = (prev === 0 && lancAbs === 0) ? COR.textoSuave
      : isEntrada ? (disponivel <= 0 ? COR.textoSuave : COR.verde)
      : (disponivel >= 0 ? COR.verde : COR.vermelho)

    const byDay: Record<number, Lanc[]> = {}
    lancamentos.forEach(l => { if (!byDay[l.dia]) byDay[l.dia] = []; byDay[l.dia].push(l) })
    const dias = Object.keys(byDay).map(Number).sort((a,b) => a-b)

    return (
      <div style={{borderBottom:`1px solid ${COR.borda}`}}>
        {/* Linha principal */}
        <div
          onClick={() => lancamentos.length > 0 && toggleAberto(nome)}
          style={{
            display:'grid',gridTemplateColumns:'1fr 90px 90px 90px 20px',
            gap:6,padding:'8px 12px',alignItems:'center',
            cursor:lancamentos.length>0?'pointer':'default',
            background:aberto?'#f8faff':'transparent',
            transition:'background .15s',
          }}>
          <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0}}>
            <div style={{width:30,height:30,borderRadius:8,background:corIcone,flexShrink:0,
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>{icone}</div>
            <span style={{fontSize:13,fontWeight:600,color:COR.texto,
              overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{nome}</span>
          </div>
          <div style={{textAlign:'right',fontSize:13,fontWeight:500,color:COR.textoSuave,
            fontVariantNumeric:'tabular-nums'}}>
            {prev > 0 ? fmt(prev) : '—'}
          </div>
          <div style={{textAlign:'right',fontSize:13,fontWeight:700,color:realColor,
            fontVariantNumeric:'tabular-nums'}}>
            {lancAbs > 0 ? fmt(lancAbs) : '—'}
          </div>
          <div style={{textAlign:'right',fontSize:13,fontWeight:700,color:dispColor,
            fontVariantNumeric:'tabular-nums'}}>
            {(prev===0&&lancAbs===0)?'—':fmt(disponivel)}
          </div>
          <div style={{textAlign:'center',color:COR.textoSuave,fontSize:12,flexShrink:0,
            transform:aberto?'rotate(180deg)':'rotate(0deg)',transition:'transform .15s'}}>
            {lancamentos.length > 0 ? '⌄' : ''}
          </div>
        </div>

        {/* Barra de progresso */}
        {(prev > 0 || lancAbs > 0) && (
          <div style={{padding:'0 12px 6px',
            display:'grid',gridTemplateColumns:'1fr 90px 90px 90px 20px',gap:6}}>
            <div/>
            <div style={{gridColumn:'2/5',background:'#e9edf2',borderRadius:99,height:3,overflow:'hidden'}}>
              <div style={{width:`${Math.min(perc*100,100)}%`,height:3,borderRadius:99,
                background:bc,transition:'width .3s'}}/>
            </div>
            <div/>
          </div>
        )}

        {/* Lançamentos expandíveis */}
        {aberto && (
          <div style={{background:'#f8faff',borderTop:`1px solid ${COR.borda}`,
            padding:'10px 12px 12px'}}>
            {dias.length === 0 ? (
              <div style={{textAlign:'center',color:COR.textoSuave,fontSize:12,padding:'8px'}}>
                Nenhum lançamento encontrado.
              </div>
            ) : dias.map(dia => (
              <div key={dia} style={{marginBottom:10}}>
                <div style={{fontSize:10,fontWeight:700,color:COR.textoSuave,
                  textTransform:'uppercase',letterSpacing:.5,
                  background:'#e9edf2',borderRadius:6,padding:'2px 8px',
                  marginBottom:5,display:'inline-block'}}>
                  {dia} {NOMES_MESES[mes]} · {DIAS_SEM[new Date(ano,mes,dia).getDay()]}
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:3}}>
                  {byDay[dia].map((l,i) => (
                    <div key={i} style={{display:'flex',alignItems:'center',gap:8,
                      padding:'6px 10px',borderRadius:8,background:COR.branco,
                      border:`1px solid ${COR.borda}`}}>
                      <span style={{fontSize:14,flexShrink:0}}>{l.icone}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,color:COR.texto,fontWeight:500,
                          overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {l.descricao || nome}
                        </div>
                        {l.sub && <div style={{fontSize:10,color:COR.textoSuave}}>{l.sub}</div>}
                      </div>
                      <div style={{fontSize:12,fontWeight:700,flexShrink:0,
                        color:isEntrada?COR.verde:COR.texto}}>
                        {fmt(Math.abs(l.valor))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Seção (Entradas ou Saídas) ─────────────────────────────────────────
  function renderSecao(
    tipo: 'saida' | 'entrada',
    grupos: string[],
    planCats: { nome: string; v: number[] }[],
    realMap: Record<string, CatReal>,
  ) {
    const isEntrada   = tipo === 'entrada'
    const corGrupo    = isEntrada ? COR.verde     : COR.vermelho
    const fundoGrupo  = isEntrada ? COR.verdeFundoGrupo : COR.vermelhoFundoGrupo
    const bordaGrupo  = isEntrada ? '#bbf7d0' : '#fecaca'

    return grupos.map(grupo => {
      const catsPlan = planCats.filter(cat => {
        const g = categorias.find((c: Categoria) => c.nome === cat.nome && c.tipo === tipo)?.grupo ?? '__sem_grupo__'
        return g === grupo
      })
      if (catsPlan.length === 0) return null
      return (
        <div key={grupo} style={{marginBottom:4}}>
          {/* Cabeçalho do grupo */}
          <div style={{
            background:fundoGrupo,
            borderLeft:`3px solid ${corGrupo}`,
            padding:'5px 12px',
            fontSize:11,fontWeight:700,color:corGrupo,
            textTransform:'uppercase',letterSpacing:.6,
            borderBottom:`1px solid ${bordaGrupo}`,
          }}>
            {grupo === '__sem_grupo__' ? 'Outras' : grupo}
          </div>

          {/* Cabeçalho de colunas */}
          <div style={{
            display:'grid',gridTemplateColumns:'1fr 90px 90px 90px 20px',gap:6,
            padding:'4px 12px',background:'#fafbfd',
            borderBottom:`1px solid ${COR.borda}`,
          }}>
            <div/>
            {['Previsto','Realizado','Disponível'].map(h => (
              <div key={h} style={{textAlign:'right',fontSize:9,fontWeight:700,
                textTransform:'uppercase',letterSpacing:.5,color:COR.textoSuave}}>{h}</div>
            ))}
            <div/>
          </div>

          {/* Categorias */}
          <div style={{background:COR.branco}}>
            {catsPlan.map(cat => {
              const cd = realMap[cat.nome]
              return (
                <CatRow
                  key={cat.nome}
                  nome={cat.nome}
                  prev={cat.v[mes]??0}
                  realBanc={cd?.totalBanc??0}
                  realCart={cd?.totalCart??0}
                  lancamentos={cd?.lancamentos??[]}
                  isEntrada={isEntrada}
                />
              )
            })}
          </div>
        </div>
      )
    })
  }

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',background:COR.fundo,
      fontFamily:"-apple-system,'Inter',sans-serif"}}>
      <AppHeader currentPath={pathname} />

      {/* ABAS DE MÊS */}
      <div style={{background:COR.branco,borderBottom:`1px solid ${COR.borda}`,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px 0'}}>
          <button onClick={() => setAno(a => a-1)} style={{background:'none',border:'none',
            cursor:'pointer',color:COR.textoSuave,fontSize:18,padding:'0 4px',lineHeight:1}}>‹</button>
          <span style={{fontSize:13,fontWeight:600,color:COR.texto}}>{ano}</span>
          <button onClick={() => setAno(a => a+1)} style={{background:'none',border:'none',
            cursor:'pointer',color:COR.textoSuave,fontSize:18,padding:'0 4px',lineHeight:1}}>›</button>
        </div>
        <div style={{display:'flex',gap:3,padding:'6px 0 0',overflowX:'auto',paddingBottom:4}}>
          {MESES_CURTOS.map((m,i) => {
            const ativo = i === mes
            return (
              <button key={m} onClick={() => setMes(i)} style={{
                padding:'6px 14px 8px',borderRadius:'8px 8px 0 0',
                border:`1px solid ${ativo?COR.azul:COR.borda}`,
                cursor:'pointer',fontSize:12,fontWeight:ativo?700:500,fontFamily:'inherit',
                whiteSpace:'nowrap',background:ativo?COR.azul:'#f8faff',
                color:ativo?'#fff':COR.textoSuave,position:'relative',zIndex:ativo?1:0,
                display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                {m}
              </button>
            )
          })}
        </div>
      </div>

      {/* CAIXINHAS DE RESUMO */}
      {dadosAno && (
        <div style={{background:COR.branco,borderBottom:`2px solid ${COR.borda}`,
          padding:'10px 16px',flexShrink:0,display:'flex',gap:6,overflowX:'auto',
          alignItems:'stretch',flexWrap:'nowrap'}}>

          {/* Previsto Entradas */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',
            padding:'5px 10px',borderRadius:8,flex:'1 0 auto',
            background:'#f8faff',border:`1px solid ${COR.borda}`}}>
            <span style={{fontSize:10,fontWeight:600,textTransform:'uppercase',
              letterSpacing:.4,marginBottom:1,color:'#94a3b8'}}>Prev. Entradas</span>
            <span style={{fontSize:13,fontWeight:700,color:COR.textoSuave,fontVariantNumeric:'tabular-nums'}}>
              {totalPrevE > 0 ? fmt(totalPrevE) : '—'}
            </span>
          </div>

          {/* Real. Entradas */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',
            padding:'5px 10px',borderRadius:8,flex:'1 0 auto',
            background:totalRealE > 0 ? '#eff6ff' : '#f8faff',
            border:`1px solid ${totalRealE > 0 ? '#bfdbfe' : COR.borda}`}}>
            <span style={{fontSize:10,fontWeight:600,textTransform:'uppercase',
              letterSpacing:.4,marginBottom:1,color:totalRealE > 0 ? COR.azul : '#94a3b8'}}>
              Real. Entradas
            </span>
            <span style={{fontSize:13,fontWeight:700,fontVariantNumeric:'tabular-nums',
              color:totalRealE > 0 ? COR.azul : '#94a3b8'}}>
              {totalRealE > 0 ? fmt(totalRealE) : '—'}
            </span>
          </div>

          <div style={{width:1,background:COR.borda,flexShrink:0,margin:'4px 0'}}/>

          {/* Prev. Saídas */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',
            padding:'5px 10px',borderRadius:8,flex:'1 0 auto',
            background:'#f8faff',border:`1px solid ${COR.borda}`}}>
            <span style={{fontSize:10,fontWeight:600,textTransform:'uppercase',
              letterSpacing:.4,marginBottom:1,color:'#94a3b8'}}>Prev. Saídas</span>
            <span style={{fontSize:13,fontWeight:700,color:COR.textoSuave,fontVariantNumeric:'tabular-nums'}}>
              {totalPrevS > 0 ? fmt(totalPrevS) : '—'}
            </span>
          </div>

          {/* Real. Saídas */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',
            padding:'5px 10px',borderRadius:8,flex:'1 0 auto',
            background:totalRealS > 0 ? (totalRealS > totalPrevS ? '#fff1f2' : '#f0f9ff') : '#f8faff',
            border:`1px solid ${totalRealS > 0 ? (totalRealS > totalPrevS ? '#fecdd3' : '#bae6fd') : COR.borda}`}}>
            <span style={{fontSize:10,fontWeight:600,textTransform:'uppercase',
              letterSpacing:.4,marginBottom:1,
              color:totalRealS > 0 ? (totalRealS > totalPrevS ? COR.vermelho : '#0284c7') : '#94a3b8'}}>
              Real. Saídas
            </span>
            <span style={{fontSize:13,fontWeight:700,fontVariantNumeric:'tabular-nums',
              color:totalRealS > 0 ? (totalRealS > totalPrevS ? COR.vermelho : '#0284c7') : '#94a3b8'}}>
              {totalRealS > 0 ? fmt(totalRealS) : '—'}
            </span>
          </div>

          <div style={{width:1,background:COR.borda,flexShrink:0,margin:'4px 0'}}/>

          {/* Disponível */}
          {(() => {
            const disp = totalPrevS - totalRealS
            const corDisp = totalRealS === 0 ? '#94a3b8' : disp >= 0 ? COR.verde : COR.vermelho
            const bgDisp  = totalRealS === 0 ? '#f8faff' : disp >= 0 ? '#f0fdf4' : '#fff1f2'
            const bdDisp  = totalRealS === 0 ? COR.borda  : disp >= 0 ? '#bbf7d0' : '#fecdd3'
            return (
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',
                padding:'5px 10px',borderRadius:8,flex:'1 0 auto',
                background:bgDisp,border:`1px solid ${bdDisp}`}}>
                <span style={{fontSize:10,fontWeight:600,textTransform:'uppercase',
                  letterSpacing:.4,marginBottom:1,color:corDisp}}>Disponível</span>
                <span style={{fontSize:13,fontWeight:700,color:corDisp,fontVariantNumeric:'tabular-nums'}}>
                  {totalRealS === 0 ? '—' : fmt(disp)}
                </span>
              </div>
            )
          })()}
        </div>
      )}

      {/* CONTEÚDO */}
      <div style={{flex:1,overflowY:'auto',padding:'12px 16px 24px',
        display:'flex',flexDirection:'column',gap:12}}>
        {!dadosAno ? (
          <div style={{textAlign:'center',padding:'60px 20px',color:COR.textoSuave}}>
            <div style={{fontSize:32,marginBottom:12}}>📋</div>
            <div style={{fontSize:15,fontWeight:600,color:COR.texto,marginBottom:6}}>
              Sem planejamento para {ano}
            </div>
            <div style={{fontSize:13}}>
              Crie um planejamento anual para acompanhar o orçamento.
            </div>
          </div>
        ) : (
          <>
            {/* ENTRADAS */}
            {(dadosAno.entradas ?? []).length > 0 && (
              <div style={{background:COR.branco,borderRadius:12,
                border:`1px solid ${COR.borda}`,overflow:'hidden'}}>
                <div style={{padding:'10px 12px 8px',borderBottom:`1px solid ${COR.borda}`,
                  display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontSize:14,fontWeight:700,color:COR.verde}}>↑ Entradas</span>
                </div>
                {renderSecao('entrada', gruposEntrada, dadosAno.entradas ?? [], entradasMap)}
              </div>
            )}

            {/* SAÍDAS */}
            {(dadosAno.saidas ?? []).length > 0 && (
              <div style={{background:COR.branco,borderRadius:12,
                border:`1px solid ${COR.borda}`,overflow:'hidden'}}>
                <div style={{padding:'10px 12px 8px',borderBottom:`1px solid ${COR.borda}`,
                  display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontSize:14,fontWeight:700,color:COR.vermelho}}>↓ Saídas</span>
                </div>
                {renderSecao('saida', gruposSaida, dadosAno.saidas ?? [], saidasMap)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
