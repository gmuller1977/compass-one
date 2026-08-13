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
  const [mes, setMes]     = useState(mesHoje)
  const [ano, setAno]     = useState(anoHoje)
  const [abertos, setAbertos] = useState<Set<string>>(new Set())

  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { contas, categorias, planos, planosReal, planejamentoLockado, extratoData, faturaData, user } = useApp()

  useEffect(() => {
    if (!user) return
    creditarAurix(user.id, 'acao', 'Viu a Evolução', 2, 'acao_evolucao').then(r => {
      if (r) dispararToastAurix({ tipo: 'acao', titulo: 'Viu a Evolução', pontos: 2 })
    })
  }, [user?.id])

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

      {/* PageHeader */}
      {!isMobile && (
        <div style={{ padding: '12px 16px 0', background: COR.branco, borderBottom: 'none', flexShrink: 0 }}>
          <PageHeader
            icon="ti-refresh"
            breadcrumb="MEU PLANO"
            title="Revisão mensal"
            subtitle={`${MESES_FULL[mes]} ${ano}`}
            mb={12}
            rightContent={
              <div style={{
                display: 'flex', alignItems: 'center',
                background: 'rgba(255,255,255,0.12)', borderRadius: 8, overflow: 'hidden',
              }}>
                <button onClick={() => setMes(m => Math.max(0, m-1))} style={{
                  border: 'none', background: 'transparent', cursor: mes===0?'default':'pointer',
                  padding: '5px 9px', color: mes===0?'rgba(255,255,255,0.3)':'#fff', fontSize: 11, lineHeight: 1,
                }}>◀</button>
                <span style={{
                  fontSize: 12, fontWeight: 500, color: '#fff',
                  padding: '5px 10px', borderLeft: '1px solid rgba(255,255,255,0.2)',
                  borderRight: '1px solid rgba(255,255,255,0.2)', minWidth: 80, textAlign: 'center',
                }}>{MESES_FULL[mes]}</span>
                <button onClick={() => setMes(m => Math.min(11, m+1))} style={{
                  border: 'none', background: 'transparent', cursor: mes===11?'default':'pointer',
                  padding: '5px 9px', color: mes===11?'rgba(255,255,255,0.3)':'#fff', fontSize: 11, lineHeight: 1,
                }}>▶</button>
              </div>
            }
          />
        </div>
      )}

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
                  <span style={{fontSize:14,fontWeight:700,color:COR.verde}}>↑ Entrou</span>
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
                  <span style={{fontSize:14,fontWeight:700,color:COR.vermelho}}>↓ Gastei</span>
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
