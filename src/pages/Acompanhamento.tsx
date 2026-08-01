import { useState, useMemo, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { DadosMes, Categoria } from '../context/AppContext'
import { iconeCategoria } from '../utils/categoriaIcone'
import AppHeader from '../components/AppHeader'
import BottomNav from '../components/BottomNav'
import EmptyState from '../components/EmptyState'

const COR = {
  azul: '#1a56db', fundo: '#f0f4ff', branco: '#ffffff', texto: '#0f172a',
  textoSuave: '#64748b', borda: '#e2e8f0',
  verde: '#16a34a', vermelho: '#dc2626', amarelo: '#d97706',
  vermelhoFundoGrupo: '#ffeaea',
  verdeFundoGrupo: '#e8fdf0',
}
const MESES_CURTOS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MESES_FULL   = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
}

function fmt(v: number) { return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) }
function diasNoMes(mes: number, ano: number) { return new Date(ano, mes+1, 0).getDate() }
function barCor(perc: number, isEntrada?: boolean) {
  if (isEntrada) return perc >= 1 ? COR.verde : (perc >= 0.8 ? COR.amarelo : COR.textoSuave)
  if (perc > 1) return COR.vermelho
  if (perc >= 0.9) return COR.amarelo
  return COR.verde
}

type Lanc = { dia: number; descricao: string; valor: number; sub: string; fonte: 'banco'|'cartao'|'dinheiro' }
type CatReal = { total: number; totalBanc: number; totalCart: number; lancamentos: Lanc[] }
function mkCatReal(): CatReal { return { total:0, totalBanc:0, totalCart:0, lancamentos:[] } }

export default function Acompanhamento() {
  const hoje    = new Date()
  const mesHoje = hoje.getMonth()
  const anoHoje = hoje.getFullYear()

  const isMobile = useIsMobile()
  const [mes, setMes]     = useState(mesHoje)
  const [ano, setAno]     = useState(anoHoje)
  const [abertos, setAbertos] = useState<Set<string>>(new Set())

  const { pathname } = useLocation()
  const { contas, categorias, planos, planosReal, planejamentoLockado, extratoData, faturaData, user } = useApp()

  const mesStr    = String(mes+1).padStart(2,'0')
  const totalDias = diasNoMes(mes, ano)
  const dadosAno  = (planejamentoLockado && planosReal[ano]) ? planosReal[ano] : planos[ano]
  const isPastMonth = ano < anoHoje || (ano === anoHoje && mes < mesHoje)

  // ── Realizados ────────────────────────────────────────────────────────
  const { saidasMap, entradasMap } = useMemo(() => {
    const saidas:  Record<string, CatReal> = {}
    const entradas: Record<string, CatReal> = {}
    const sufixo = `-${ano}-${mesStr}`

    // Chave do bucket: "nome" para categorias únicas, "nome||subCategoria" quando subCategoria está definida
    function rKey(nome: string, sub?: string) { return sub ? `${nome}||${sub}` : nome }

    const getSaida   = (k: string) => { if (!saidas[k])   saidas[k]  = mkCatReal(); return saidas[k] }
    const getEntrada = (k: string) => { if (!entradas[k]) entradas[k] = mkCatReal(); return entradas[k] }

    for (const [key, dados] of Object.entries(extratoData)) {
      if (!key.endsWith(sufixo)) continue
      if (!contas.some(c => key.startsWith(c.id))) continue   // ignora contas excluídas
      if (contas.some(c => c.tipo === 'cartao' && key.startsWith(c.id))) continue
      const dm = dados as DadosMes

      for (let d = 1; d <= totalDias; d++) {
        for (const l of dm.lancamentos?.[d] ?? []) {
          const fonte = l.formaPagamento === 'dinheiro' ? 'dinheiro' : 'banco'
          const sub   = (l as { subCategoria?: string }).subCategoria
          if (l.tipo === 'saida') {
            const c = getSaida(rKey(l.categoria, sub))
            c.total += l.valor; c.totalBanc += l.valor
            c.lancamentos.push({ dia:d, descricao:l.descricao, valor:l.valor, sub:l.formaPagamento, fonte })
          } else {
            const c = getEntrada(rKey(l.categoria, sub))
            c.total += l.valor; c.totalBanc += l.valor
            c.lancamentos.push({ dia:d, descricao:l.descricao, valor:l.valor, sub:l.formaPagamento, fonte })
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
            c.lancamentos.push({ dia:1, descricao:fixaCat.nome, valor:val, sub:'automático', fonte:'banco' })
          } else {
            const c = getEntrada(fixaCat.nome)
            c.total += val; c.totalBanc += val
            c.lancamentos.push({ dia:1, descricao:fixaCat.nome, valor:val, sub:'automático', fonte:'banco' })
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
            c.lancamentos.push({ dia:d, descricao:l.descricao??l.categoria, valor:l.valor, sub:card.apelido??card.nome, fonte:'cartao' })
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

  function toggleAberto(uid: string) {
    setAbertos(prev => { const n = new Set(prev); n.has(uid)?n.delete(uid):n.add(uid); return n })
  }

  // ── Linha de categoria ─────────────────────────────────────────────────
  function CatRow({ uid, nome, descricao, prev, realBanc, realCart, lancamentos, isEntrada }: {
    uid: string; nome: string; descricao?: string; prev: number; realBanc: number; realCart: number
    lancamentos: Lanc[]; isEntrada?: boolean
  }) {
    const aberto = abertos.has(uid)
    const { icone, cor: corIcone } = iconeCategoria(categorias, nome)
    const lancAbs    = realBanc + realCart
    const disponivel = prev - lancAbs
    const perc       = prev > 0 ? lancAbs / prev : (lancAbs > 0 ? 1 : 0)
    const bc         = barCor(perc, isEntrada)

    const realColor = isEntrada
      ? (lancAbs > 0 ? COR.verde : '#94a3b8')
      : (lancAbs === 0 ? '#94a3b8' : (lancAbs <= prev || prev === 0) ? COR.azul : COR.vermelho)
    const realBg = isEntrada
      ? (lancAbs > 0 ? '#f0fdf4' : '#f8faff')
      : (lancAbs === 0 ? '#f8faff' : (lancAbs <= prev || prev === 0) ? '#eff6ff' : '#fff1f2')
    const realBd = isEntrada
      ? (lancAbs > 0 ? '#bbf7d0' : COR.borda)
      : (lancAbs === 0 ? COR.borda : (lancAbs <= prev || prev === 0) ? '#bfdbfe' : '#fecdd3')

    const dispColor = (prev === 0 && lancAbs === 0) ? '#94a3b8'
      : isEntrada ? (disponivel > 0 ? COR.verde : '#94a3b8')
      : (disponivel >= 0 ? COR.verde : COR.vermelho)
    const dispBg = (prev === 0 && lancAbs === 0) ? '#f8faff'
      : isEntrada ? (disponivel > 0 ? '#f0fdf4' : '#f8faff')
      : (disponivel >= 0 ? '#f0fdf4' : '#fff1f2')
    const dispBd = (prev === 0 && lancAbs === 0) ? COR.borda
      : isEntrada ? (disponivel > 0 ? '#bbf7d0' : COR.borda)
      : (disponivel >= 0 ? '#bbf7d0' : '#fecdd3')


    return (
      <div style={{borderBottom:`1px solid ${COR.borda}`}}>
        {/* Linha */}
        <div onClick={() => toggleAberto(uid)}
          style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',
            cursor:'pointer',background:aberto?'#f8faff':'transparent',transition:'background .15s'}}>
          {/* Ícone + nome */}
          <div style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:0}}>
            <div style={{width:30,height:30,borderRadius:8,background:corIcone,flexShrink:0,
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>{icone}</div>
            <div style={{display:'flex',flexDirection:'column',minWidth:0}}>
              <span style={{fontSize:13,fontWeight:600,color:COR.texto,
                overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{nome}</span>
              {descricao && (
                <span style={{fontSize:10,color:COR.textoSuave,
                  overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{descricao}</span>
              )}
            </div>
          </div>

          {isMobile ? (
            /* Mobile: só disponível */
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',flexShrink:0,
              padding:'5px 10px',borderRadius:8,minWidth:90,
              background:dispBg,border:`1px solid ${dispBd}`}}>
              <span style={{fontSize:9,fontWeight:600,textTransform:'uppercase',
                letterSpacing:.4,marginBottom:1,color:dispColor}}>{isEntrada ? 'A receber' : 'Disponível'}</span>
              <span style={{fontSize:13,fontWeight:700,color:dispColor,
                fontVariantNumeric:'tabular-nums'}}>
                {(prev===0&&lancAbs===0)?'—':fmt(disponivel)}
              </span>
            </div>
          ) : (
            /* Desktop: três caixinhas separadas */
            <div style={{display:'flex',gap:6,flexShrink:0}}>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',
                padding:'5px 10px',borderRadius:8,minWidth:90,
                background:'#f8faff',border:`1px solid ${COR.borda}`}}>
                <span style={{fontSize:9,fontWeight:600,textTransform:'uppercase',
                  letterSpacing:.4,marginBottom:1,color:'#94a3b8'}}>Previsto</span>
                <span style={{fontSize:13,fontWeight:700,color:COR.textoSuave,
                  fontVariantNumeric:'tabular-nums'}}>
                  {prev > 0 ? fmt(prev) : '—'}
                </span>
              </div>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',
                padding:'5px 10px',borderRadius:8,minWidth:90,
                background:realBg,border:`1px solid ${realBd}`}}>
                <span style={{fontSize:9,fontWeight:600,textTransform:'uppercase',
                  letterSpacing:.4,marginBottom:1,color:realColor}}>Realizado</span>
                <span style={{fontSize:13,fontWeight:700,color:realColor,
                  fontVariantNumeric:'tabular-nums'}}>
                  {lancAbs > 0 ? fmt(lancAbs) : '—'}
                </span>
              </div>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',
                padding:'5px 10px',borderRadius:8,minWidth:90,
                background:dispBg,border:`1px solid ${dispBd}`}}>
                <span style={{fontSize:9,fontWeight:600,textTransform:'uppercase',
                  letterSpacing:.4,marginBottom:1,color:dispColor}}>Disponível</span>
                <span style={{fontSize:13,fontWeight:700,color:dispColor,
                  fontVariantNumeric:'tabular-nums'}}>
                  {(prev===0&&lancAbs===0)?'—':fmt(disponivel)}
                </span>
              </div>
            </div>
          )}
          {/* Chevron */}
          <div style={{flexShrink:0,fontSize:12,color:COR.textoSuave,width:16,textAlign:'center',
            transform:aberto?'rotate(180deg)':'rotate(0deg)',transition:'transform .15s'}}>⌄</div>
        </div>

        {/* Barra de progresso */}
        {(prev > 0 || lancAbs > 0) && (
          <div style={{padding:'0 12px 6px'}}>
            <div style={{background:'#e9edf2',borderRadius:99,height:3,overflow:'hidden'}}>
              <div style={{width:`${Math.min(perc*100,100)}%`,height:3,borderRadius:99,
                background:bc,transition:'width .3s'}}/>
            </div>
          </div>
        )}

        {/* Expansão: lançamentos em 3 colunas */}
        {aberto && (() => {
          const banco   = lancamentos.filter(l => l.fonte === 'banco')
          const cartao  = lancamentos.filter(l => l.fonte === 'cartao')
          const dinheiro = lancamentos.filter(l => l.fonte === 'dinheiro')
          const colunas = [
            { label:'🏦 Banco',   itens: banco   },
            { label:'💳 Cartão',  itens: cartao  },
            { label:'💵 Dinheiro', itens: dinheiro },
          ].filter(c => c.itens.length > 0)
          return (
            <div style={{background:'#f8faff',borderTop:`1px solid ${COR.borda}`,
              padding:'10px 12px 12px'}}>
              {/* Mobile: Previsto + Realizado no topo do detalhe */}
              {isMobile && (
                <div style={{display:'flex',gap:8,marginBottom:10}}>
                  <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',
                    padding:'6px 8px',borderRadius:8,
                    background:'#f8faff',border:`1px solid ${COR.borda}`}}>
                    <span style={{fontSize:9,fontWeight:600,textTransform:'uppercase',
                      letterSpacing:.4,marginBottom:1,color:'#94a3b8'}}>Previsto</span>
                    <span style={{fontSize:14,fontWeight:700,color:COR.textoSuave,
                      fontVariantNumeric:'tabular-nums'}}>
                      {prev > 0 ? fmt(prev) : '—'}
                    </span>
                  </div>
                  <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',
                    padding:'6px 8px',borderRadius:8,
                    background:realBg,border:`1px solid ${realBd}`}}>
                    <span style={{fontSize:9,fontWeight:600,textTransform:'uppercase',
                      letterSpacing:.4,marginBottom:1,color:realColor}}>Realizado</span>
                    <span style={{fontSize:14,fontWeight:700,color:realColor,
                      fontVariantNumeric:'tabular-nums'}}>
                      {lancAbs > 0 ? fmt(lancAbs) : '—'}
                    </span>
                  </div>
                </div>
              )}
              {colunas.length === 0 ? (
                <div style={{textAlign:'center',color:COR.textoSuave,fontSize:12}}>
                  Nenhum lançamento encontrado.
                </div>
              ) : (
                <div style={{display:'grid',
                  gridTemplateColumns:`repeat(${colunas.length}, 1fr)`,gap:10}}>
                  {colunas.map(col => (
                    <div key={col.label}>
                      <div style={{fontSize:10,fontWeight:700,color:COR.textoSuave,
                        textTransform:'uppercase',letterSpacing:.5,
                        marginBottom:6,padding:'2px 0'}}>
                        {col.label}
                      </div>
                      <div style={{display:'flex',flexDirection:'column',gap:3}}>
                        {col.itens.map((l,i) => (
                          <div key={i} style={{padding:'5px 8px',borderRadius:7,
                            background:COR.branco,border:`1px solid ${COR.borda}`,
                            display:'flex',flexDirection:'column',gap:1}}>
                            <div style={{display:'flex',justifyContent:'space-between',gap:6}}>
                              <span style={{fontSize:10,color:COR.textoSuave,flexShrink:0}}>
                                {String(l.dia).padStart(2,'0')}/{String(mes+1).padStart(2,'0')}
                              </span>
                              <span style={{fontSize:11,fontWeight:700,
                                color:isEntrada?COR.verde:COR.texto,
                                fontVariantNumeric:'tabular-nums',flexShrink:0}}>
                                {fmt(l.valor)}
                              </span>
                            </div>
                            <div style={{fontSize:11,color:COR.texto,
                              overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                              {l.descricao || nome}
                            </div>
                            {l.sub && (
                              <div style={{fontSize:9,color:COR.textoSuave}}>{l.sub}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })()}
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

      // Para nomes duplicados no plano, pareia com a nª categoria do cadastro (pela ordem)
      const nomeOcorrencia = new Map<string, number>()
      const catsComDesc = catsPlan.map(cat => {
        const ocorrencia = nomeOcorrencia.get(cat.nome) ?? 0
        nomeOcorrencia.set(cat.nome, ocorrencia + 1)
        const matching = categorias.filter((c: Categoria) => c.nome === cat.nome && c.tipo === tipo)
        const descricao = matching[ocorrencia]?.descricao ?? ''
        return { ...cat, descricao }
      })
      // Include categories with actual transactions but no plan entry
      const plannedNames = new Set(catsPlan.map(c => c.nome))
      const extraCats = Object.keys(realMap)
        .map(k => k.includes('||') ? k.split('||')[0] : k)
        .filter((n,i,a) => a.indexOf(n)===i && !plannedNames.has(n))
        .flatMap(nome => {
          const cat = categorias.find((c: Categoria) => c.nome===nome && c.tipo===tipo)
          if (!cat || !cat.ativa || cartaoNomes.has(cat.nome.toLowerCase())) return []
          if ((cat.grupo ?? '__sem_grupo__') !== grupo) return []
          return [{ nome, v: Array(12).fill(0) as number[], descricao: cat.descricao ?? '' }]
        })
      const allCats = [...catsComDesc, ...extraCats]
      if (allCats.length === 0) return null

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

          {/* Categorias */}
          <div style={{background:COR.branco}}>
            {allCats.map((cat, idx) => {
              const realKey = cat.descricao ? `${cat.nome}||${cat.descricao}` : cat.nome
              const cd  = realMap[realKey] ?? realMap[cat.nome]
              const uid = `${tipo}-${grupo}-${cat.nome}-${idx}`
              return (
                <CatRow
                  key={uid}
                  uid={uid}
                  nome={cat.nome}
                  descricao={cat.descricao}
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

  // ── Mobile redesign ────────────────────────────────────────────────────
  if (isMobile) {
    const diaHoje   = new Date().getDate()
    const saldoReal = totalRealE - totalRealS
    const saldoPrev = totalPrevE - totalPrevS
    const percE     = totalPrevE > 0 ? Math.min(totalRealE / totalPrevE, 1) : (totalRealE > 0 ? 1 : 0)
    const percS     = totalPrevS > 0 ? Math.min(totalRealS / totalPrevS, 1) : (totalRealS > 0 ? 1 : 0)
    const corSaldoR = (totalRealE===0&&totalRealS===0) ? '#94a3b8' : saldoReal>=0 ? COR.verde : COR.vermelho
    const corSaldoP = (totalPrevE===0&&totalPrevS===0) ? '#94a3b8' : saldoPrev>=0 ? COR.verde : COR.vermelho
    const userInitial = (() => { const u = user as any; return u?.displayName?.[0] ?? u?.email?.[0]?.toUpperCase() ?? '?' })()
    const fmtK = (v: number) => 'R$ ' + Math.round(v).toLocaleString('pt-BR')
    const totalAReceberE = Math.max(totalPrevE - totalRealE, 0)
    const totalApagarS   = Math.max(totalPrevS - totalRealS, 0)

    const btnStyle = { width:30,height:30,borderRadius:9,border:'none',
      background:'rgba(255,255,255,.15)',color:'#fff',
      fontSize:16,cursor:'pointer' as const,fontWeight:700,
      display:'flex' as const,alignItems:'center' as const,justifyContent:'center' as const }

    const renderMobileCatRow = (
      tipo: 'entrada'|'saida', nome: string, descricao: string,
      prev: number, lancAbs: number, catInfo: Categoria|undefined, uid: string,
      lancamentos: Lanc[],
    ) => {
      const { icone, cor: corIcone } = iconeCategoria(categorias, nome)
      const perc      = prev > 0 ? lancAbs / prev : (lancAbs > 0 ? 1 : 0)
      const isEntrada = tipo === 'entrada'
      const aberto    = abertos.has(uid)
      const disponivel = prev - lancAbs

      // Value shown on collapsed row
      let dispLabel: string, dispValue: string, dispColor: string
      if (prev === 0 && lancAbs === 0) {
        dispLabel = isEntrada ? 'A receber' : 'Disponível'; dispValue = '—'; dispColor = '#94a3b8'
      } else if (isEntrada) {
        if (lancAbs >= prev && prev > 0) { dispLabel = 'Recebido';  dispValue = fmt(lancAbs);               dispColor = '#16a34a' }
        else                             { dispLabel = 'A receber'; dispValue = fmt(Math.max(disponivel,0)); dispColor = '#d97706' }
      } else {
        if (lancAbs === 0 && catInfo?.fixa) { dispLabel = 'A pagar';    dispValue = fmt(prev);         dispColor = '#d97706' }
        else if (disponivel >= 0)            { dispLabel = 'Disponível'; dispValue = fmt(disponivel);   dispColor = '#16a34a' }
        else                                 { dispLabel = 'Excedido';   dispValue = fmt(-disponivel);  dispColor = '#dc2626' }
      }

      const progressColor = isEntrada
        ? (perc >= 1 ? COR.verde : perc >= 0.5 ? '#4ade80' : '#94a3b8')
        : (perc > 1  ? COR.vermelho : perc >= 0.8 ? COR.amarelo : COR.verde)

      // Detail: status badge
      let statusLabel: string, statusBg: string, statusColor: string
      if (prev === 0 && lancAbs === 0) {
        statusLabel = 'Sem previsão'; statusBg = '#f1f5f9'; statusColor = '#64748b'
      } else if (isEntrada) {
        if (lancAbs >= prev && prev > 0) { statusLabel = '✓ Recebido';                      statusBg = '#dcfce7'; statusColor = '#166534' }
        else if (lancAbs > 0)            { statusLabel = `${Math.round(perc*100)}% receb.`;  statusBg = '#fef9c3'; statusColor = '#92400e' }
        else                             { statusLabel = 'A receber';                        statusBg = '#fffbeb'; statusColor = '#92400e' }
      } else {
        if (lancAbs === 0 && prev > 0)   { statusLabel = 'A pagar';                          statusBg = '#fffbeb'; statusColor = '#92400e' }
        else if (lancAbs > prev && prev > 0) { statusLabel = `⚠ ${Math.round(perc*100)}% gasto`; statusBg = '#fee2e2'; statusColor = '#991b1b' }
        else if (perc >= 0.8)            { statusLabel = `⚠ ${Math.round(perc*100)}% gasto`; statusBg = '#fef9c3'; statusColor = '#92400e' }
        else                             { statusLabel = `${Math.round(perc*100)}% gasto`;   statusBg = '#dcfce7'; statusColor = '#166534' }
      }

      const realColor = isEntrada
        ? (lancAbs > 0 ? '#16a34a' : '#94a3b8')
        : (lancAbs > 0 ? '#dc2626' : '#94a3b8')
      const realBg  = isEntrada ? (lancAbs > 0 ? '#f0fdf4' : '#f8faff') : (lancAbs > 0 ? '#fff1f2' : '#f8faff')
      const realBd  = isEntrada ? (lancAbs > 0 ? '#bbf7d0' : COR.borda) : (lancAbs > 0 ? '#fecdd3' : COR.borda)
      const dispBg2 = (prev===0&&lancAbs===0) ? '#f8faff' : (disponivel >= 0 ? '#f0fdf4' : '#fff1f2')
      const dispBd2 = (prev===0&&lancAbs===0) ? COR.borda : (disponivel >= 0 ? '#bbf7d0' : '#fecdd3')
      const dispC2  = (prev===0&&lancAbs===0) ? '#94a3b8' : (disponivel >= 0 ? '#16a34a' : '#dc2626')

      const banco    = lancamentos.filter(l => l.fonte === 'banco')
      const cartao   = lancamentos.filter(l => l.fonte === 'cartao')
      const dinheiro = lancamentos.filter(l => l.fonte === 'dinheiro')
      const colunas  = [
        { label:'🏦 Banco',    itens: banco    },
        { label:'💳 Cartão',   itens: cartao   },
        { label:'💵 Dinheiro', itens: dinheiro },
      ].filter(c => c.itens.length > 0)

      return (
        <div key={uid} style={{ background:'#fff', borderBottom:'1px solid #f5f7ff' }}>
          {/* COMPACT ROW */}
          <div onClick={() => toggleAberto(uid)}
            style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 16px 6px',
              cursor:'pointer', background: aberto ? '#f8faff' : '#fff' }}>
            <div style={{ width:38, height:38, borderRadius:11, flexShrink:0,
              background:corIcone+'20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
              {icone}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#0f172a',
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{nome}</div>
              <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
                <span style={{ fontSize:8, padding:'1px 6px', borderRadius:4, fontWeight:700,
                  background:catInfo?.fixa?'#e0f2fe':'#f1f5f9',
                  color:catInfo?.fixa?'#0369a1':'#64748b' }}>
                  {catInfo?.fixa ? 'Fixa' : 'Variável'}
                </span>
                {descricao && <span style={{ fontSize:10, color:'#94a3b8' }}>· {descricao}</span>}
              </div>
            </div>
            <div style={{ flexShrink:0, textAlign:'right' as const }}>
              <div style={{ fontSize:8, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:.3,
                color:'#94a3b8', marginBottom:2 }}>{dispLabel}</div>
              <div style={{ fontSize:14, fontWeight:800, color:dispColor, fontVariantNumeric:'tabular-nums' }}>
                {dispValue}
              </div>
            </div>
            <div style={{ flexShrink:0, fontSize:11, color:'#94a3b8', width:14, textAlign:'center' as const,
              transform: aberto ? 'rotate(180deg)' : 'none', transition:'transform .15s' }}>⌄</div>
          </div>
          {/* PROGRESS BAR */}
          {(prev > 0 || lancAbs > 0) && (
            <div style={{ margin:'0 16px 8px' }}>
              <div style={{ background:'#f1f5f9', borderRadius:3, height:4, overflow:'hidden' }}>
                <div style={{ width:`${Math.min(perc,1)*100}%`, height:4, borderRadius:3, background:progressColor }}/>
              </div>
            </div>
          )}
          {/* EXPANDED DETAIL */}
          {aberto && (
            <div style={{ background:'#f8faff', borderTop:'1px solid #e2e8f0', padding:'10px 16px 14px' }}>
              <div style={{ display:'flex', alignItems:'center', marginBottom:8 }}>
                <span style={{ fontSize:10, fontWeight:600, padding:'3px 8px', borderRadius:7,
                  background:statusBg, color:statusColor }}>{statusLabel}</span>
              </div>
              <div style={{ display:'flex', gap:6, marginBottom: colunas.length > 0 ? 10 : 0 }}>
                <div style={{ flex:1, background:'#f0f4ff', border:'1px solid #e2e8f0', borderRadius:10, padding:'8px 6px', textAlign:'center' as const }}>
                  <div style={{ fontSize:8, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:.4, color:'#94a3b8', marginBottom:4 }}>Previsto</div>
                  <div style={{ fontSize:13, fontWeight:800, color:'#64748b', fontVariantNumeric:'tabular-nums' }}>{prev>0?fmt(prev):'—'}</div>
                </div>
                <div style={{ flex:1, background:realBg, border:`1px solid ${realBd}`, borderRadius:10, padding:'8px 6px', textAlign:'center' as const }}>
                  <div style={{ fontSize:8, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:.4, color:realColor, marginBottom:4 }}>Realizado</div>
                  <div style={{ fontSize:13, fontWeight:800, fontVariantNumeric:'tabular-nums', color:realColor }}>
                    {lancAbs>0?fmt(lancAbs):'—'}
                  </div>
                </div>
                <div style={{ flex:1, background:dispBg2, border:`1px solid ${dispBd2}`, borderRadius:10, padding:'8px 6px', textAlign:'center' as const }}>
                  <div style={{ fontSize:8, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:.4, color:dispC2, marginBottom:4 }}>
                    {isEntrada ? 'A receber' : 'Disponível'}
                  </div>
                  <div style={{ fontSize:13, fontWeight:800, fontVariantNumeric:'tabular-nums', color:dispC2 }}>
                    {(prev===0&&lancAbs===0)?'—':fmt(disponivel)}
                  </div>
                </div>
              </div>
              {colunas.length > 0 && (
                <div style={{ display:'grid', gridTemplateColumns:`repeat(${colunas.length},1fr)`, gap:8 }}>
                  {colunas.map(col => (
                    <div key={col.label}>
                      <div style={{ fontSize:10, fontWeight:700, color:'#64748b',
                        textTransform:'uppercase' as const, letterSpacing:.5, marginBottom:6 }}>{col.label}</div>
                      <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                        {col.itens.map((l,i) => (
                          <div key={i} style={{ padding:'5px 8px', borderRadius:7,
                            background:'#fff', border:'1px solid #e2e8f0',
                            display:'flex', flexDirection:'column', gap:1 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', gap:6 }}>
                              <span style={{ fontSize:10, color:'#94a3b8', flexShrink:0 }}>
                                {String(l.dia).padStart(2,'0')}/{String(mes+1).padStart(2,'0')}
                              </span>
                              <span style={{ fontSize:11, fontWeight:700, flexShrink:0,
                                color:isEntrada?'#16a34a':'#0f172a', fontVariantNumeric:'tabular-nums' }}>
                                {fmt(l.valor)}
                              </span>
                            </div>
                            <div style={{ fontSize:11, color:'#0f172a',
                              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {l.descricao || nome}
                            </div>
                            {l.sub && <div style={{ fontSize:9, color:'#94a3b8' }}>{l.sub}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )
    }

    const renderMobileSecao = (
      tipo: 'saida'|'entrada',
      grupos: string[],
      planCats: { nome: string; v: number[] }[],
      realMap: Record<string, CatReal>,
    ) => {
      const isEntrada = tipo === 'entrada'
      return grupos.flatMap(grupo => {
        const catsPlan = planCats.filter(cat => {
          const g = categorias.find((c: Categoria) => c.nome===cat.nome && c.tipo===tipo)?.grupo ?? '__sem_grupo__'
          return g === grupo
        })
        const nomeOcorrencia = new Map<string, number>()
        const catsComDesc = catsPlan.map(cat => {
          const ocorrencia = nomeOcorrencia.get(cat.nome) ?? 0
          nomeOcorrencia.set(cat.nome, ocorrencia + 1)
          const matching = categorias.filter((c: Categoria) => c.nome===cat.nome && c.tipo===tipo)
          const descricao = matching[ocorrencia]?.descricao ?? ''
          const catInfo   = matching[ocorrencia] ?? matching[0]
          return { nome:cat.nome, v:cat.v, descricao, catInfo }
        })
        // Include categories with actual transactions but no plan entry
        const plannedNames = new Set(catsPlan.map(c => c.nome))
        const extraCats = Object.keys(realMap)
          .map(k => k.includes('||') ? k.split('||')[0] : k)
          .filter((n,i,a) => a.indexOf(n)===i && !plannedNames.has(n))
          .flatMap(nome => {
            const cat = categorias.find((c: Categoria) => c.nome===nome && c.tipo===tipo)
            if (!cat || !cat.ativa || cartaoNomes.has(cat.nome.toLowerCase())) return []
            if ((cat.grupo ?? '__sem_grupo__') !== grupo) return []
            return [{ nome, v: Array(12).fill(0) as number[], descricao: cat.descricao ?? '', catInfo: cat }]
          })
        const allCats = [...catsComDesc, ...extraCats]
        if (allCats.length === 0) return []
        const grupoLabel = grupo==='__sem_grupo__' ? 'Outras' : grupo
        const grupoIcone = (() => {
          const primNome = allCats[0]?.nome
          if (!primNome) return isEntrada ? '💰' : '📂'
          return iconeCategoria(categorias, primNome).icone
        })()
        return [
          ...(grupo !== '__sem_grupo__' ? [
            <div key={`sub-${grupo}`} style={{ padding:'7px 16px', fontSize:9, fontWeight:800, letterSpacing:.7,
              display:'flex', alignItems:'center', gap:5, textTransform:'uppercase',
              borderBottom:'1px solid #f1f5f9', background:'#f8faff', color:'#64748b' }}>
              <span>{grupoIcone}</span>
              <span>{grupoLabel}</span>
            </div>
          ] : []),
          ...allCats.map((cat, idx) => {
            const realKey = cat.descricao ? `${cat.nome}||${cat.descricao}` : cat.nome
            const cd      = realMap[realKey] ?? realMap[cat.nome]
            const prev    = cat.v[mes] ?? 0
            const lancAbs = (cd?.totalBanc ?? 0) + (cd?.totalCart ?? 0)
            const uid     = `m-${tipo}-${grupo}-${cat.nome}-${idx}`
            return renderMobileCatRow(tipo, cat.nome, cat.descricao, prev, lancAbs, cat.catInfo, uid, cd?.lancamentos ?? [])
          }),
        ]
      })
    }

    return (
      <div style={{ height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden',
        background:'#f0f4ff', fontFamily:"-apple-system,'Inter',sans-serif" }}>

        {/* GRADIENT HEADER */}
        <div style={{ background:'linear-gradient(135deg,#0f2878,#2563eb)', padding:'16px 20px 14px', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
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
            <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,.2)',
              display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13, fontWeight:700 }}>
              {userInitial}
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <button onClick={() => setAno(a => a-1)} style={btnStyle}>‹</button>
              <span style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,.7)' }}>{ano}</span>
              <button onClick={() => setAno(a => a+1)} style={btnStyle}>›</button>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <button onClick={() => { if(mes===0){setMes(11);setAno(a=>a-1)}else setMes(m=>m-1) }} style={btnStyle}>‹</button>
              <span style={{ fontSize:18, fontWeight:800, color:'#fff', minWidth:90, textAlign:'center' }}>{MESES_FULL[mes]}</span>
              <button onClick={() => { if(mes===11){setMes(0);setAno(a=>a+1)}else setMes(m=>m+1) }} style={btnStyle}>›</button>
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:10, fontWeight:700, color:'#86efac', width:56, flexShrink:0 }}>↑ Recebimentos</span>
              <div style={{ flex:1, height:6, background:'rgba(255,255,255,.15)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ width:`${Math.min(percE,1)*100}%`, height:'100%', borderRadius:3, background:'#4ade80' }}/>
              </div>
              {totalPrevE>0 && <span style={{ fontSize:10, color:'rgba(255,255,255,.6)', whiteSpace:'nowrap' }}>{fmtK(totalRealE)} / {fmtK(totalPrevE)}</span>}
              <span style={{ fontSize:10, fontWeight:800, minWidth:28, textAlign:'right', color:'#fbbf24' }}>
                {totalPrevE>0 ? `${Math.round(percE*100)}%` : '—'}
              </span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:10, fontWeight:700, color:'#fca5a5', width:56, flexShrink:0 }}>↓ Gastos</span>
              <div style={{ flex:1, height:6, background:'rgba(255,255,255,.15)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ width:`${Math.min(percS,1)*100}%`, height:'100%', borderRadius:3, background:'#f87171' }}/>
              </div>
              {totalPrevS>0 && <span style={{ fontSize:10, color:'rgba(255,255,255,.6)', whiteSpace:'nowrap' }}>{fmtK(totalRealS)} / {fmtK(totalPrevS)}</span>}
              <span style={{ fontSize:10, fontWeight:800, minWidth:28, textAlign:'right',
                color:percS<0.5?'#4ade80':percS<0.8?'#fbbf24':'#f87171' }}>
                {totalPrevS>0 ? `${Math.round(percS*100)}%` : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* SALDO STRIP */}
        <div style={{ background:'#fff', borderBottom:'2px solid #e2e8f0', padding:'10px 16px', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:9, color:'#94a3b8', fontWeight:700, textTransform:'uppercase', letterSpacing:.4, marginBottom:3 }}>
                Quanto tenho
              </div>
              <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
                <span style={{ fontSize:17, fontWeight:800, color:corSaldoR, letterSpacing:-.4, fontVariantNumeric:'tabular-nums' }}>
                  {(totalRealE===0&&totalRealS===0) ? '—' : fmt(saldoReal)}
                </span>
                {!(totalRealE===0&&totalRealS===0) && <>
                  <span style={{ fontSize:11, color:'#94a3b8' }}>→ prev.</span>
                  <span style={{ fontSize:13, fontWeight:700, color:corSaldoP, fontVariantNumeric:'tabular-nums' }}>{fmt(saldoPrev)}</span>
                </>}
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:9, color:'#94a3b8', marginBottom:2 }}>Dia do mês</div>
              <div style={{ fontSize:11, fontWeight:700, color:'#1a56db' }}>{diaHoje} de {totalDias}</div>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ flex:1, overflowY:'auto', padding:'10px 14px 90px', display:'flex', flexDirection:'column', gap:10 }}>
          {!dadosAno ? (
            <EmptyState
              icon="📋"
              title={`Sem planejamento para ${ano}`}
              description="Crie um planejamento anual para acompanhar o orçamento."
            />
          ) : (<>
            {(dadosAno.entradas ?? []).length > 0 && (
              <div style={{ borderRadius:18, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,.08)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'12px 16px', background:'#f0fdf4', borderBottom:'2px solid #dcfce7' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <span style={{ fontSize:16 }}>↑</span>
                    <span style={{ fontSize:13, fontWeight:800, textTransform:'uppercase', letterSpacing:.6, color:'#16a34a' }}>Quanto entrou</span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2 }}>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:6,
                      background:'#dcfce7', color:'#166534' }}>
                      {totalPrevE>0 ? `${Math.round(percE*100)}% recebido` : 'Sem previsão'}
                    </span>
                    {totalPrevE>0 && <span style={{ fontSize:10, color:'#94a3b8' }}>{fmt(totalRealE)} de {fmt(totalPrevE)}</span>}
                  </div>
                </div>
                {renderMobileSecao('entrada',
                  gruposEntrada.includes('__sem_grupo__') ? gruposEntrada : [...gruposEntrada, '__sem_grupo__'],
                  dadosAno.entradas ?? [], entradasMap)}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'10px 16px', background:'#f0fdf4', borderTop:'1px solid #dcfce7' }}>
                  <span style={{ fontSize:12, fontWeight:800, color:'#16a34a' }}>Total entrou</span>
                  <div style={{ display:'flex', gap:12 }}>
                    {([['Previsto','#64748b',fmt(totalPrevE)],['Realizado','#16a34a',fmt(totalRealE)],['A receber','#d97706',fmt(totalAReceberE)]] as [string,string,string][]).map(([lbl,cor,val]) => (
                      <div key={lbl} style={{ display:'flex', flexDirection:'column', alignItems:'flex-end' }}>
                        <span style={{ fontSize:8, fontWeight:700, textTransform:'uppercase', letterSpacing:.3, color:'#94a3b8', marginBottom:1 }}>{lbl}</span>
                        <span style={{ fontSize:13, fontWeight:800, color:cor, fontVariantNumeric:'tabular-nums' }}>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {(dadosAno.saidas ?? []).length > 0 && (
              <div style={{ borderRadius:18, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,.08)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'12px 16px', background:'#fff1f2', borderBottom:'2px solid #fecdd3' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <span style={{ fontSize:16 }}>↓</span>
                    <span style={{ fontSize:13, fontWeight:800, textTransform:'uppercase', letterSpacing:.6, color:'#dc2626' }}>Quanto gastei</span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2 }}>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:6,
                      background:percS<0.8?'#dcfce7':percS<1?'#fef9c3':'#fee2e2',
                      color:percS<0.8?'#166534':percS<1?'#92400e':'#991b1b' }}>
                      {totalPrevS>0 ? `${Math.round(percS*100)}% gasto` : 'Sem previsão'}
                    </span>
                    {totalPrevS>0 && <span style={{ fontSize:10, color:'#94a3b8' }}>{fmt(totalRealS)} de {fmt(totalPrevS)}</span>}
                  </div>
                </div>
                {renderMobileSecao('saida', gruposSaida, dadosAno.saidas ?? [], saidasMap)}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'10px 16px', background:'#fff1f2', borderTop:'1px solid #fecdd3' }}>
                  <span style={{ fontSize:12, fontWeight:800, color:'#dc2626' }}>Total gastei</span>
                  <div style={{ display:'flex', gap:12 }}>
                    {([['Previsto','#64748b',fmt(totalPrevS)],['Realizado','#dc2626',fmt(totalRealS)],['Disponível','#16a34a',fmt(totalApagarS)]] as [string,string,string][]).map(([lbl,cor,val]) => (
                      <div key={lbl} style={{ display:'flex', flexDirection:'column', alignItems:'flex-end' }}>
                        <span style={{ fontSize:8, fontWeight:700, textTransform:'uppercase', letterSpacing:.3, color:'#94a3b8', marginBottom:1 }}>{lbl}</span>
                        <span style={{ fontSize:13, fontWeight:800, color:cor, fontVariantNumeric:'tabular-nums' }}>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div style={{ borderRadius:18, background:'linear-gradient(135deg,#0f2878,#2563eb)',
              padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between',
              boxShadow:'0 4px 16px rgba(26,86,219,.25)' }}>
              <div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.6)', fontWeight:600, marginBottom:3 }}>
                  Saldo previsto fim do mês
                </div>
                <div style={{ fontSize:9, color:'rgba(255,255,255,.4)' }}>
                  {MESES_FULL[mes]} {ano} · com todas as fixas
                </div>
              </div>
              <div style={{ fontSize:20, fontWeight:800, letterSpacing:-.5, fontVariantNumeric:'tabular-nums',
                color:saldoPrev>=0?'#4ade80':'#f87171' }}>
                {fmt(saldoPrev)}
              </div>
            </div>
          </>)}
        </div>

        <BottomNav />
      </div>
    )
  }

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',overflow:'hidden',background:COR.fundo,
      fontFamily:"-apple-system,'Inter',sans-serif"}}>
      <AppHeader currentPath={pathname} />

      {/* ABAS DE MÊS */}
      <div style={{background:COR.branco,borderBottom:`1px solid ${COR.borda}`,flexShrink:0}}>
        {isMobile ? (
          /* Mobile: ano + setas de mês na mesma linha */
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
            padding:'10px 16px 10px',gap:8}}>
            <div style={{display:'flex',alignItems:'center',gap:4}}>
              <button onClick={() => setAno(a => a-1)} style={{background:'none',border:'none',
                cursor:'pointer',color:COR.textoSuave,fontSize:16,padding:'0 4px',lineHeight:1}}>‹</button>
              <span style={{fontSize:13,fontWeight:700,color:COR.texto}}>{ano}</span>
              <button onClick={() => setAno(a => a+1)} style={{background:'none',border:'none',
                cursor:'pointer',color:COR.textoSuave,fontSize:16,padding:'0 4px',lineHeight:1}}>›</button>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <button onClick={() => setMes(m => Math.max(0, m-1))} style={{
                border:'none',background:mes===0?'#f1f5f9':'#eff6ff',color:mes===0?'#cbd5e1':COR.azul,
                borderRadius:8,padding:'5px 14px',fontSize:16,cursor:mes===0?'default':'pointer',fontFamily:'inherit'}}>‹</button>
              <span style={{fontWeight:700,fontSize:15,color:COR.texto,minWidth:80,textAlign:'center'}}>
                {MESES_FULL[mes]}
              </span>
              <button onClick={() => setMes(m => Math.min(11, m+1))} style={{
                border:'none',background:mes===11?'#f1f5f9':'#eff6ff',color:mes===11?'#cbd5e1':COR.azul,
                borderRadius:8,padding:'5px 14px',fontSize:16,cursor:mes===11?'default':'pointer',fontFamily:'inherit'}}>›</button>
            </div>
          </div>
        ) : (
          /* Desktop: ano acima, 12 abas de mês */
          <>
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
          </>
        )}
      </div>

      {/* CAIXINHAS DE RESUMO */}
      {dadosAno && (() => {
        const saldoReal = totalRealE - totalRealS
        const saldoPrev = totalPrevE - totalPrevS
        const semDados  = totalRealE === 0 && totalRealS === 0 && totalPrevE === 0 && totalPrevS === 0
        const corSaldoR = semDados ? '#94a3b8' : saldoReal >= 0 ? COR.verde : COR.vermelho
        const corSaldoP = semDados ? '#94a3b8' : saldoPrev >= 0 ? COR.verde : COR.vermelho
        const percE = totalPrevE > 0 ? Math.min(totalRealE / totalPrevE, 1) : (totalRealE > 0 ? 1 : 0)
        const percS = totalPrevS > 0 ? Math.min(totalRealS / totalPrevS, 1) : (totalRealS > 0 ? 1 : 0)
        const barCorE = percE >= 1 ? COR.azul : COR.verde
        const barCorS = percS >= 1 ? COR.vermelho : percS >= 0.8 ? '#f59e0b' : COR.azul
        return isMobile ? (
          /* Mobile: linhas com barra de progresso */
          <div style={{background:COR.branco,borderBottom:`2px solid ${COR.borda}`,
            padding:'10px 14px 12px',flexShrink:0,display:'flex',flexDirection:'column',gap:8}}>
            {/* Linha Entradas */}
            <div>
              <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:4}}>
                <span style={{fontSize:11,fontWeight:700,color:COR.verde}}>↑ Entrou</span>
                <div style={{display:'flex',alignItems:'baseline',gap:4}}>
                  <span style={{fontSize:14,fontWeight:800,color:COR.verde,
                    fontVariantNumeric:'tabular-nums'}}>
                    {totalRealE > 0 ? fmt(totalRealE) : '—'}
                  </span>
                  {totalPrevE > 0 && (
                    <span style={{fontSize:10,color:COR.textoSuave,fontVariantNumeric:'tabular-nums'}}>
                      de {fmt(totalPrevE)}
                    </span>
                  )}
                  <span style={{fontSize:10,fontWeight:600,color:barCorE,minWidth:32,textAlign:'right'}}>
                    {totalPrevE > 0 ? `${Math.round(percE*100)}%` : ''}
                  </span>
                </div>
              </div>
              <div style={{background:'#e9edf2',borderRadius:99,height:4,overflow:'hidden'}}>
                <div style={{width:`${percE*100}%`,height:4,borderRadius:99,background:barCorE,transition:'width .3s'}}/>
              </div>
            </div>
            {/* Linha Saídas */}
            <div>
              <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:4}}>
                <span style={{fontSize:11,fontWeight:700,color:COR.vermelho}}>↓ Gastei</span>
                <div style={{display:'flex',alignItems:'baseline',gap:4}}>
                  <span style={{fontSize:14,fontWeight:800,color:COR.vermelho,
                    fontVariantNumeric:'tabular-nums'}}>
                    {totalRealS > 0 ? fmt(totalRealS) : '—'}
                  </span>
                  {totalPrevS > 0 && (
                    <span style={{fontSize:10,color:COR.textoSuave,fontVariantNumeric:'tabular-nums'}}>
                      de {fmt(totalPrevS)}
                    </span>
                  )}
                  <span style={{fontSize:10,fontWeight:600,color:barCorS,minWidth:32,textAlign:'right'}}>
                    {totalPrevS > 0 ? `${Math.round(percS*100)}%` : ''}
                  </span>
                </div>
              </div>
              <div style={{background:'#e9edf2',borderRadius:99,height:4,overflow:'hidden'}}>
                <div style={{width:`${percS*100}%`,height:4,borderRadius:99,background:barCorS,transition:'width .3s'}}/>
              </div>
            </div>
            {/* Saldo */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
              paddingTop:8,borderTop:`1px solid ${COR.borda}`}}>
              <span style={{fontSize:11,fontWeight:600,color:COR.textoSuave}}>Quanto tenho</span>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontSize:14,fontWeight:800,color:corSaldoR,fontVariantNumeric:'tabular-nums'}}>
                  {semDados ? '—' : fmt(saldoReal)}
                </span>
                {!semDados && (
                  <>
                    <span style={{fontSize:12,color:COR.textoSuave}}>→</span>
                    <span style={{fontSize:13,fontWeight:700,color:corSaldoP,fontVariantNumeric:'tabular-nums'}}>
                      {fmt(saldoPrev)}
                    </span>
                    <span style={{fontSize:9,color:COR.textoSuave,fontWeight:500}}>prev.</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Desktop: layout original com caixas separadas */
          <div style={{background:COR.branco,borderBottom:`2px solid ${COR.borda}`,
            padding:'10px 16px',flexShrink:0,display:'flex',gap:6,overflowX:'auto',
            alignItems:'stretch',flexWrap:'nowrap'}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',
              padding:'5px 10px',borderRadius:8,flex:'1 0 auto',
              background:'#f8faff',border:`1px solid ${COR.borda}`}}>
              <span style={{fontSize:10,fontWeight:600,textTransform:'uppercase',
                letterSpacing:.4,marginBottom:1,color:'#94a3b8'}}>Prev. entrou</span>
              <span style={{fontSize:13,fontWeight:700,color:COR.textoSuave,fontVariantNumeric:'tabular-nums'}}>
                {totalPrevE > 0 ? fmt(totalPrevE) : '—'}
              </span>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',
              padding:'5px 10px',borderRadius:8,flex:'1 0 auto',
              background:totalRealE > 0 ? '#eff6ff' : '#f8faff',
              border:`1px solid ${totalRealE > 0 ? '#bfdbfe' : COR.borda}`}}>
              <span style={{fontSize:10,fontWeight:600,textTransform:'uppercase',
                letterSpacing:.4,marginBottom:1,color:totalRealE > 0 ? COR.azul : '#94a3b8'}}>
                Real. entrou
              </span>
              <span style={{fontSize:13,fontWeight:700,fontVariantNumeric:'tabular-nums',
                color:totalRealE > 0 ? COR.azul : '#94a3b8'}}>
                {totalRealE > 0 ? fmt(totalRealE) : '—'}
              </span>
            </div>
            <div style={{width:1,background:COR.borda,flexShrink:0,margin:'4px 0'}}/>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',
              padding:'5px 10px',borderRadius:8,flex:'1 0 auto',
              background:'#f8faff',border:`1px solid ${COR.borda}`}}>
              <span style={{fontSize:10,fontWeight:600,textTransform:'uppercase',
                letterSpacing:.4,marginBottom:1,color:'#94a3b8'}}>Prev. gastei</span>
              <span style={{fontSize:13,fontWeight:700,color:COR.textoSuave,fontVariantNumeric:'tabular-nums'}}>
                {totalPrevS > 0 ? fmt(totalPrevS) : '—'}
              </span>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',
              padding:'5px 10px',borderRadius:8,flex:'1 0 auto',
              background:totalRealS > 0 ? (totalRealS > totalPrevS ? '#fff1f2' : '#f0f9ff') : '#f8faff',
              border:`1px solid ${totalRealS > 0 ? (totalRealS > totalPrevS ? '#fecdd3' : '#bae6fd') : COR.borda}`}}>
              <span style={{fontSize:10,fontWeight:600,textTransform:'uppercase',
                letterSpacing:.4,marginBottom:1,
                color:totalRealS > 0 ? (totalRealS > totalPrevS ? COR.vermelho : '#0284c7') : '#94a3b8'}}>
                Real. gastei
              </span>
              <span style={{fontSize:13,fontWeight:700,fontVariantNumeric:'tabular-nums',
                color:totalRealS > 0 ? (totalRealS > totalPrevS ? COR.vermelho : '#0284c7') : '#94a3b8'}}>
                {totalRealS > 0 ? fmt(totalRealS) : '—'}
              </span>
            </div>
            <div style={{width:1,background:COR.borda,flexShrink:0,margin:'4px 0'}}/>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',
              padding:'5px 10px',borderRadius:8,flex:'1 0 auto',
              background:saldoReal>=0?'#f0fdf4':'#fff1f2',
              border:`1px solid ${saldoReal>=0?'#bbf7d0':'#fecdd3'}`}}>
              <span style={{fontSize:10,fontWeight:600,textTransform:'uppercase',
                letterSpacing:.4,marginBottom:1,color:corSaldoR}}>Saldo</span>
              <span style={{fontSize:13,fontWeight:700,color:corSaldoR,fontVariantNumeric:'tabular-nums'}}>
                {semDados ? '—' : fmt(saldoReal)}
              </span>
            </div>
          </div>
        )
      })()}

      {/* CONTEÚDO */}
      <div style={{flex:1,overflowY:'auto',padding:'12px 16px 80px',
        display:'flex',flexDirection:'column',gap:12}}>
        {!dadosAno ? (
          <EmptyState
            icon="📋"
            title={`Sem planejamento para ${ano}`}
            description="Crie um planejamento anual para acompanhar o orçamento."
          />
        ) : (
          <>
            {/* ENTRADAS */}
            {(dadosAno.entradas ?? []).length > 0 && (
              <div style={{background:COR.branco,borderRadius:12,
                border:`1px solid ${COR.borda}`,overflow:'hidden',flexShrink:0}}>
                <div style={{padding:'10px 12px 8px',borderBottom:`1px solid ${COR.borda}`,
                  display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontSize:14,fontWeight:700,color:COR.verde}}>↑ Entrou</span>
                </div>
                {renderSecao('entrada', gruposEntrada, dadosAno.entradas ?? [], entradasMap)}
              </div>
            )}

            {/* SAÍDAS */}
            {(dadosAno.saidas ?? []).length > 0 && (
              <div style={{background:COR.branco,borderRadius:12,
                border:`1px solid ${COR.borda}`,overflow:'hidden',flexShrink:0}}>
                <div style={{padding:'10px 12px 8px',borderBottom:`1px solid ${COR.borda}`,
                  display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontSize:14,fontWeight:700,color:COR.vermelho}}>↓ Gastei</span>
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
