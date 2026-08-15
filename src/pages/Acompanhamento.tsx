import { useState, useMemo, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { DadosMes, Categoria } from '../context/AppContext'
import AppHeader from '../components/AppHeader'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import TutorialCard from '../components/TutorialCard'
import { COR, MESES_CURTOS, MESES_FULL, diasNoMes, mkCatReal, type CatReal } from '../components/acompanhamento/AcShared'
import { creditarAurix } from '../utils/aurix'
import { dispararToastAurix } from '../components/aurix/AurixToast'
import AcMobileView from '../components/acompanhamento/AcMobileView'
import AcResumoBoxes from '../components/acompanhamento/AcResumoBoxes'
import AcSecao from '../components/acompanhamento/AcSecao'

function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
}

export default function Acompanhamento() {
  const hoje    = new Date()
  const mesHoje = hoje.getMonth()
  const anoHoje = hoje.getFullYear()

  const isMobile = useIsMobile()
  const [mes, setMes]               = useState(mesHoje)
  const [ano, setAno]               = useState(anoHoje)
  const [abertos, setAbertos]       = useState<Set<string>>(new Set())
  const [mostrarCal, setMostrarCal] = useState(false)
  const [anoCal, setAnoCal]         = useState(anoHoje)

  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { contas, categorias, planos, planosReal, planejamentoLockado, extratoData, faturaData, user } = useApp()

  useEffect(() => {
    if (!user) return
    creditarAurix(user.id, 'acao', 'Viu a Evolução', 2, 'acao_evolucao').then(r => {
      if (r) dispararToastAurix({ tipo: 'acao', titulo: 'Viu a Evolução', pontos: 2 })
    })
  }, [user?.id])

  useEffect(() => {
    if (!mostrarCal) return
    const fechar = () => setMostrarCal(false)
    document.addEventListener('click', fechar)
    return () => document.removeEventListener('click', fechar)
  }, [mostrarCal])

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

  // ── Mobile: early return ───────────────────────────────────────────────
  if (isMobile) {
    return (
      <AcMobileView
        mes={mes}
        ano={ano}
        setMes={setMes}
        setAno={setAno}
        totalDias={totalDias}
        dadosAno={dadosAno}
        gruposEntrada={gruposEntrada}
        gruposSaida={gruposSaida}
        entradasMap={entradasMap}
        saidasMap={saidasMap}
        totalPrevE={totalPrevE}
        totalPrevS={totalPrevS}
        totalRealE={totalRealE}
        totalRealS={totalRealS}
        categorias={categorias}
        cartaoNomes={cartaoNomes}
        user={user}
        abertos={abertos}
        toggleAberto={toggleAberto}
        navigate={navigate}
      />
    )
  }

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',overflow:'hidden',background:COR.fundo,
      fontFamily:"-apple-system,'Inter',sans-serif"}}>
      <AppHeader currentPath={pathname} />

      {/* PageHeader — mesmo estilo do banco */}
      <div style={{ padding: '12px 16px 0', flexShrink: 0 }}>
        <PageHeader
          icon="ti-chart-bar"
          breadcrumb="MEU PLANO"
          title="Evolução Mensal"
          mb={0}
          rightContent={
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => { const m=mes-1<0?11:mes-1; const a=mes-1<0?ano-1:ano; setMes(m); setAno(a) }}
                  style={{ width:28,height:28,borderRadius:8,border:'none',background:'rgba(255,255,255,0.15)',
                    color:'#fff',cursor:'pointer',fontSize:16,fontWeight:700,display:'flex',
                    alignItems:'center',justifyContent:'center',fontFamily:'inherit' }}>‹</button>
                <button
                  onClick={e => { e.stopPropagation(); setAnoCal(ano); setMostrarCal(v => !v) }}
                  style={{ fontSize:20,fontWeight:800,color:'#fff',border:'none',
                    background:'rgba(255,255,255,0.12)',borderRadius:8,padding:'4px 14px',
                    cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap' }}>
                  {MESES_FULL[mes]} {ano}
                </button>
                <button onClick={() => { const m=mes+1>11?0:mes+1; const a=mes+1>11?ano+1:ano; setMes(m); setAno(a) }}
                  style={{ width:28,height:28,borderRadius:8,border:'none',background:'rgba(255,255,255,0.15)',
                    color:'#fff',cursor:'pointer',fontSize:16,fontWeight:700,display:'flex',
                    alignItems:'center',justifyContent:'center',fontFamily:'inherit' }}>›</button>
              </div>

              {mostrarCal && (
                <div
                  style={{ position:'absolute',top:'calc(100% + 8px)',right:0,zIndex:300,
                    background:'#fff',borderRadius:14,boxShadow:'0 8px 32px rgba(0,0,0,.22)',
                    padding:16,minWidth:272 }}
                  onClick={e => e.stopPropagation()}>
                  <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12 }}>
                    <button onClick={() => setAnoCal(a => a-1)}
                      style={{ border:'none',background:'#eff6ff',color:COR.azul,borderRadius:6,
                        padding:'4px 12px',fontSize:16,cursor:'pointer',fontFamily:'inherit' }}>‹</button>
                    <span style={{ fontWeight:700,fontSize:15,color:COR.texto }}>{anoCal}</span>
                    <button onClick={() => setAnoCal(a => a+1)}
                      style={{ border:'none',background:'#eff6ff',color:COR.azul,borderRadius:6,
                        padding:'4px 12px',fontSize:16,cursor:'pointer',fontFamily:'inherit' }}>›</button>
                  </div>
                  <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6 }}>
                    {MESES_CURTOS.map((abrev, i) => {
                      const ativo = i === mes && anoCal === ano
                      return (
                        <button key={i}
                          onClick={() => { setMes(i); setAno(anoCal); setMostrarCal(false) }}
                          style={{ padding:'8px 4px',border:'none',borderRadius:8,cursor:'pointer',
                            fontFamily:'inherit',fontSize:12,fontWeight:ativo?700:500,
                            background:ativo?COR.azul:'#f1f5f9',color:ativo?'#fff':COR.texto }}>
                          {abrev}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          }
        />
      </div>

      {/* CAIXINHAS DE RESUMO */}
      {dadosAno && (
        <AcResumoBoxes
          isMobile={isMobile}
          totalPrevE={totalPrevE}
          totalPrevS={totalPrevS}
          totalRealE={totalRealE}
          totalRealS={totalRealS}
        />
      )}

      {/* CONTEÚDO */}
      <div style={{flex:1,overflowY:'auto',padding:'12px 16px 80px',
        display:'flex',flexDirection:'column',gap:12}}>
        <TutorialCard
          tela="evolucao"
          icon="📈"
          title="Veja como você está indo"
          description="Aqui o app compara o que você planejou com o que realmente gastou. É assim que você descobre onde pode melhorar."
          tips={[
            { icon: '🟢', text: 'Verde = dentro do plano' },
            { icon: '🟡', text: 'Amarelo = chegando no limite' },
            { icon: '🔴', text: 'Vermelho = passou do planejado' },
          ]}
          buttonLabel="Ver minha evolução →"
        />
        {!dadosAno ? (
          <EmptyState
            icon="📈"
            title="Veja se está no caminho certo"
            description={`Aqui você compara o que planejou com o que gastou em ${ano}. Para começar, monte seu plano.`}
            actionLabel="Criar plano →"
            onAction={() => navigate('/planejamento?modo=wizard')}
          />
        ) : (
          <>
            {/* ENTRADAS */}
            {(dadosAno.entradas ?? []).length > 0 && (
              <div style={{background:COR.branco,borderRadius:12,
                border:`1px solid ${COR.borda}`,overflow:'hidden',flexShrink:0}}>
                <div style={{padding:'10px 12px 8px',borderBottom:`1px solid ${COR.borda}`,
                  display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontSize:14,fontWeight:700,color:COR.verde}}>↑ Recebimento</span>
                </div>
                <AcSecao
                  tipo="entrada"
                  grupos={gruposEntrada}
                  planCats={dadosAno.entradas ?? []}
                  realMap={entradasMap}
                  categorias={categorias}
                  cartaoNomes={cartaoNomes}
                  mes={mes}
                  abertos={abertos}
                  toggleAberto={toggleAberto}
                  isMobile={isMobile}
                />
              </div>
            )}

            {/* SAÍDAS */}
            {(dadosAno.saidas ?? []).length > 0 && (
              <div style={{background:COR.branco,borderRadius:12,
                border:`1px solid ${COR.borda}`,overflow:'hidden',flexShrink:0}}>
                <div style={{padding:'10px 12px 8px',borderBottom:`1px solid ${COR.borda}`,
                  display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontSize:14,fontWeight:700,color:COR.vermelho}}>↓ Pagamento</span>
                </div>
                <AcSecao
                  tipo="saida"
                  grupos={gruposSaida}
                  planCats={dadosAno.saidas ?? []}
                  realMap={saidasMap}
                  categorias={categorias}
                  cartaoNomes={cartaoNomes}
                  mes={mes}
                  abertos={abertos}
                  toggleAberto={toggleAberto}
                  isMobile={isMobile}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
