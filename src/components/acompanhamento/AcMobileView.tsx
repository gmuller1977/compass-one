import React, { useState } from 'react'
import type { Categoria } from '../../context/AppContext'
import { iconeCategoria } from '../../utils/categoriaIcone'
import EmptyState from '../EmptyState'
import BottomNav from '../BottomNav'
import { COR, MESES_FULL, fmt, type Lanc, type CatReal } from './AcShared'
import { buildAllCats, pickReal, cadastroDaLinha, fixasEVariaveis, type PlanCat } from './evolucaoCalcs'
import ResumoRadarFaixa from './ResumoRadarFaixa'
import RevisaoPlanoFaixa from './RevisaoPlanoFaixa'
import type { ResumoRadar } from '../../utils/resumoRadar'
import type { LancadoAcima } from '../../utils/lancadoAcimaDoPlano'
import { AnelGrupo } from './EvolucaoGrupo'
import { RADAR_TEXTO_CLARO as RADAR_COR_CLARO, RADAR_TEXTO_AZUL as RADAR_COR_AZUL, RADAR_BARRA_CLARO, RADAR_BORDA_CLARO, RADAR_TRILHO_BRANCO, SEM_MOVIMENTO, RADAR_AMARELO, RADAR_COR_NEUTRA, faixaRadar, destaqueRadar, destaqueDoGrupo, ehFixaPaga, semPlano } from './radarCores'
import { useAbrirAjuste } from './ajustePlanoContexto'
import { MemoriaSaldo, ChipCenario } from '../novoLancamentoExtrato/NleExtrato'
import type { CenarioPrevisao } from '../../utils/saldoConta'
import { IconeCat } from '../IconeCat'
import { corDoIcone } from '../../utils/iconeDesenhado'

interface AcMobileViewProps {
  mes: number
  ano: number
  setMes: React.Dispatch<React.SetStateAction<number>>
  setAno: React.Dispatch<React.SetStateAction<number>>
  totalDias: number
  dadosAno: { entradas?: PlanCat[]; saidas?: PlanCat[] } | undefined
  gruposEntrada: string[]
  gruposSaida: string[]
  entradasMap: Record<string, CatReal>
  saidasMap: Record<string, CatReal>
  totalPrevE: number
  totalPrevS: number
  totalRealE: number
  totalRealS: number
  /** Real ÷ plano só das linhas com plano (totaisJulgados); null sem plano. */
  percJulgadoE: number | null
  percJulgadoS: number | null
  categorias: Categoria[]
  cartaoNomes: Set<string>
  user: unknown
  abertos: Set<string>
  toggleAberto: (uid: string) => void
  navigate: (to: string) => void
  /** Os mesmos números do Radar no computador — ver RadarFinanceiro. */
  saldoAtual: number
  saldoPrevisto: number
  resumo: ResumoRadar | null
  /** A memória de cálculo do saldo final previsto — a mesma do rodapé do Radar. */
  memoria: React.ComponentProps<typeof MemoriaSaldo>['m']
  cenario: CenarioPrevisao
  onCenario: (c: CenarioPrevisao) => void
  /** Já lançado acima do plano dos próximos meses, e o botão da revisão. */
  lancadoAcima: LancadoAcima[]
  onRevisar: () => void
}

export default function AcMobileView({
  mes, ano, setMes, setAno,
  totalDias, dadosAno,
  gruposEntrada, gruposSaida,
  entradasMap, saidasMap,
  totalPrevE, totalPrevS, totalRealE, totalRealS, percJulgadoE, percJulgadoS,
  categorias, cartaoNomes,
  abertos, toggleAberto, navigate,
  saldoAtual, saldoPrevisto, resumo,
  memoria, cenario, onCenario, lancadoAcima, onRevisar,
}: AcMobileViewProps) {
  const abrirAjuste = useAbrirAjuste()
  const [memoriaAberta, setMemoriaAberta] = useState(false)
  const diaHoje   = new Date().getDate()
  const ehMesAtual = ano === new Date().getFullYear() && mes === new Date().getMonth()
  // "Quanto tenho" é o saldo das contas (bancos + dinheiro) e o previsto é o
  // fechamento da memória de cálculo — os números do Radar no computador.
  // Antes eram receitas − despesas do mês, realizadas e planejadas, que não
  // levavam em conta o saldo com que o mês abriu.
  const saldoReal = saldoAtual
  const saldoPrev = saldoPrevisto
  // A barra julga só as linhas com plano; sem plano fica vazia (C2).
  const percE     = Math.min(percJulgadoE ?? 0, 1)
  const percS     = Math.min(percJulgadoS ?? 0, 1)
  const fmtK = (v: number) => 'R$ ' + Math.round(v).toLocaleString('pt-BR')
  const totalAReceberE = Math.max(totalPrevE - totalRealE, 0)
  const totalApagarS   = Math.max(totalPrevS - totalRealS, 0)


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

    // O mesmo destaque das linhas do Radar no computador (destaqueRadar):
    // quanto RESTA ou quanto PASSOU, e o "gastou X de Y" embaixo, pequeno. As
    // cores são as da paleta clara do Radar, medidas no branco (radarCores).
    const fixa      = !!cadastroDaLinha({ nome, descricao }, categorias)?.fixa
    const fixaPaga  = ehFixaPaga(prev, lancAbs, isEntrada, fixa)
    const destaque  = destaqueRadar(prev, lancAbs, isEntrada, { fixa, fixaPaga })
    // Sem plano no mês não há julgamento: só o realizado, em cor neutra e
    // sem barra (C2, decisão do Guilherme em 19/10/2026).
    const naoJulga  = semPlano(prev)
    const dispColor = (prev === 0 && lancAbs === 0) ? COR.textoSuave
      : naoJulga ? RADAR_COR_NEUTRA
      : fixaPaga ? RADAR_COR_CLARO.bom
      : RADAR_COR_CLARO[faixaRadar(Math.round(perc * 100) / 100, isEntrada)]

    // A barra é a do computador: faixa do Radar em tom claro sobre trilho
    // azul-escuro (antes tinha amarelo e vermelho próprios, 23/10/2026).
    const progressColor = RADAR_BARRA_CLARO[fixaPaga ? 'bom' : faixaRadar(Math.round(perc * 100) / 100, isEntrada)]

    // Detail: status badge
    let statusLabel: string, statusBg: string, statusColor: string
    if (naoJulga) {
      statusLabel = 'Sem plano neste mês'; statusBg = '#f1f5f9'; statusColor = '#475569'
    } else if (isEntrada) {
      if (lancAbs >= prev && prev > 0) { statusLabel = '✓ Recebido';                      statusBg = '#dcfce7'; statusColor = '#166534' }
      else if (lancAbs > 0)            { statusLabel = `${Math.round(perc*100)}% receb.`;  statusBg = '#fef9c3'; statusColor = '#92400e' }
      else                             { statusLabel = 'A receber';                        statusBg = '#fffbeb'; statusColor = '#92400e' }
    } else {
      if (lancAbs === 0 && prev > 0)      { statusLabel = 'A pagar';                          statusBg = '#fffbeb'; statusColor = '#92400e' }
      else if (lancAbs > prev && prev > 0) { statusLabel = `⚠ ${Math.round(perc*100)}% gasto`; statusBg = '#fee2e2'; statusColor = '#991b1b' }
      else if (perc >= 0.8)               { statusLabel = `⚠ ${Math.round(perc*100)}% gasto`; statusBg = '#fef9c3'; statusColor = '#92400e' }
      else                                { statusLabel = `${Math.round(perc*100)}% gasto`;   statusBg = '#dcfce7'; statusColor = '#166534' }
    }

    const realColor = isEntrada
      ? (lancAbs > 0 ? '#16a34a' : '#94a3b8')
      : (lancAbs > 0 ? '#dc2626' : '#94a3b8')
    const realBg  = isEntrada ? (lancAbs > 0 ? '#f0fdf4' : '#f8faff') : (lancAbs > 0 ? '#fff1f2' : '#f8faff')
    const realBd  = isEntrada ? (lancAbs > 0 ? '#bbf7d0' : COR.borda) : (lancAbs > 0 ? '#fecdd3' : COR.borda)
    const dispBg2 = naoJulga ? '#f8faff' : (disponivel >= 0 ? '#f0fdf4' : '#fff1f2')
    const dispBd2 = naoJulga ? COR.borda : (disponivel >= 0 ? '#bbf7d0' : '#fecdd3')
    const dispC2  = naoJulga ? '#64748b' : (disponivel >= 0 ? '#16a34a' : '#dc2626')

    const banco    = lancamentos.filter(l => l.fonte === 'banco')
    const cartao   = lancamentos.filter(l => l.fonte === 'cartao')
    const dinheiro = lancamentos.filter(l => l.fonte === 'dinheiro')
    const colunas  = [
      { label:'Banco',    icone:'ti-building-bank', itens: banco    },
      { label:'Cartão',   icone:'ti-credit-card',   itens: cartao   },
      { label:'Dinheiro', icone:'ti-cash',          itens: dinheiro },
    ].filter(c => c.itens.length > 0)

    return (
      <div key={uid} style={{ background:'#fff' }}>
        {/* COMPACT ROW */}
        <div onClick={() => toggleAberto(uid)}
          style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px 8px',
            cursor:'pointer', background: aberto ? '#f8faff' : '#fff' }}>
          <div style={{ width:36, height:36, borderRadius:'50%', flexShrink:0,
            background:corIcone+'1f', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
            <IconeCat icone={icone} cor={corDoIcone(corIcone)} />
          </div>
          {/* Nome e o número que importa na mesma linha; o "gastou X de Y"
              embaixo, na largura toda — ao lado do número ele era cortado. */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:10 }}>
              <div style={{ fontSize:14, fontWeight:600, color:'#0f172a', minWidth:0,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{nome}</div>
              <div style={{ flexShrink:0, fontSize:16, fontWeight:800, color:dispColor, whiteSpace:'nowrap',
                fontVariantNumeric:'tabular-nums' }}>{destaque.principal}</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:3, minWidth:0 }}>
              <span style={{ fontSize:12, padding:'1px 8px', borderRadius:999, fontWeight:700, flexShrink:0,
                background:catInfo?.fixa?'#e0f2fe':'#f1f5f9',
                color:catInfo?.fixa?'#0369a1':'#64748b' }}>
                {catInfo?.fixa ? 'Fixa' : 'Variável'}
              </span>
              {descricao && <span style={{ fontSize:13, color:COR.textoSuave, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>· {descricao}</span>}
            </div>
            <div style={{ fontSize:13, color:COR.textoSuave, marginTop:3, fontVariantNumeric:'tabular-nums' }}>{destaque.contexto}</div>
          </div>
        </div>
        {/* PROGRESS BAR */}
        {!naoJulga && (
          <div style={{ margin:'0 14px 12px 62px' }}>
            <div style={{ background:RADAR_TRILHO_BRANCO, border:`1px solid ${RADAR_BORDA_CLARO}`, boxSizing:'border-box', borderRadius:4, height:8, overflow:'hidden' }}>
              <div style={{ width:`${Math.min(perc,1)*100}%`, height:'100%', borderRadius:4, background:progressColor }}/>
            </div>
          </div>
        )}
        {/* EXPANDED DETAIL */}
        {aberto && (
          <div style={{ background:'#f8faff', borderTop:'1px solid #e2e8f0', padding:'10px 16px 14px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:8 }}>
              <span style={{ fontSize:13, fontWeight:600, padding:'4px 10px', borderRadius:999,
                background:statusBg, color:statusColor }}>{statusLabel}</span>
              {/* Ajustar o plano daqui, como no Radar do computador: muda os
                  PRÓXIMOS meses (AjustePlanoRadar), nunca o corrente. */}
              {abrirAjuste && (
                <button onClick={() => abrirAjuste({ tipo, nome, descricao: descricao || undefined, prev, real: lancAbs })} style={{
                  border:`1px solid ${COR.borda}`, background:'#fff', color:COR.azul, borderRadius:999,
                  padding:'8px 14px', minHeight:40, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                }}>Ajustar plano</button>
              )}
            </div>
            <div style={{ display:'flex', gap:6, marginBottom: colunas.length > 0 ? 10 : 0 }}>
              <div style={{ flex:1, background:'#f8faff', border:'1px solid #e2e8f0', borderRadius:14, padding:'10px 4px', textAlign:'center' as const, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color:COR.textoSuave, marginBottom:4 }}>Previsto</div>
                <div style={{ fontSize:14, fontWeight:800, color:'#64748b', fontVariantNumeric:'tabular-nums' }}>{prev>0?fmt(prev):'—'}</div>
              </div>
              <div style={{ flex:1, background:realBg, border:`1px solid ${realBd}`, borderRadius:14, padding:'10px 4px', textAlign:'center' as const, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color:realColor, marginBottom:4 }}>Realizado</div>
                <div style={{ fontSize:14, fontWeight:800, fontVariantNumeric:'tabular-nums', color:realColor }}>
                  {lancAbs>0?fmt(lancAbs):'—'}
                </div>
              </div>
              <div style={{ flex:1, background:dispBg2, border:`1px solid ${dispBd2}`, borderRadius:14, padding:'10px 4px', textAlign:'center' as const, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color:dispC2, marginBottom:4 }}>
                  {isEntrada ? 'A receber' : 'Disponível'}
                </div>
                <div style={{ fontSize:14, fontWeight:800, fontVariantNumeric:'tabular-nums', color:dispC2 }}>
                  {naoJulga?'—':fmt(disponivel)}
                </div>
              </div>
            </div>
            {colunas.length > 0 && (
              <div style={{ display:'grid', gridTemplateColumns:`repeat(${colunas.length},minmax(0,1fr))`, gap:8 }}>
                {colunas.map(col => (
                  <div key={col.label}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#64748b', marginBottom:6 }}><i className={`ti ${col.icone}`} aria-hidden style={{ verticalAlign:-2 }} /> {col.label}</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                      {col.itens.map((l,i) => (
                        <div key={i} style={{ padding:'8px 10px', borderRadius:12,
                          background:'#fff', border:'1px solid #e2e8f0',
                          display:'flex', flexDirection:'column', gap:1 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', gap:6 }}>
                            <span style={{ fontSize:13, color:COR.textoSuave, flexShrink:0 }}>
                              {String(l.dia).padStart(2,'0')}/{String((l.mesFatura ?? mes)+1).padStart(2,'0')}
                              {l.parcela && <b style={{ color:'#475569', fontWeight:700, marginLeft:6 }}>{l.parcela.atual} de {l.parcela.total}</b>}
                            </span>
                            <span style={{ fontSize:14, fontWeight:700, flexShrink:0,
                              color:isEntrada?COR.azul:'#0f172a', fontVariantNumeric:'tabular-nums' }}>
                              {fmt(l.valor)}
                            </span>
                          </div>
                          <div style={{ fontSize:14, color:'#0f172a',
                            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {l.descricao || nome}
                          </div>
                          {l.sub && <div style={{ fontSize:12, color:COR.textoSuave }}>{l.sub}</div>}
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
    planCats: PlanCat[],
    realMap: Record<string, CatReal>,
  ) => {
    const isEntrada = tipo === 'entrada'
    return grupos.flatMap(grupo => {
      const allCats = buildAllCats(tipo, grupo, planCats, realMap, categorias, cartaoNomes)
      if (allCats.length === 0) return []
      const grupoLabel = grupo==='__sem_grupo__' ? 'Outras' : grupo
      const grupoIcone = (() => {
        const primNome = allCats[0]?.nome
        if (!primNome) return isEntrada ? '💰' : '📂'
        return iconeCategoria(categorias, primNome).icone
      })()
      // O número do cabeçalho do grupo, como no computador (destaqueDoGrupo):
      // fixa paga entra pelo valor pago, e grupo só de fixas pagas é "✓ pago".
      const linhasGrupo = allCats.map(cat => {
        const prev = cat.v[mes] ?? 0
        const real = pickReal(realMap, cat.nome, cat.descricao, categorias)?.total ?? 0
        return { prev, real, fixa: !!cadastroDaLinha({ nome: cat.nome, descricao: cat.descricao }, categorias)?.fixa }
      })
      const dg = destaqueDoGrupo(linhasGrupo, isEntrada)
      // Barra e cor julgam só as linhas COM plano (destaqueDoGrupo); grupo
      // sem plano nenhum fica neutro, só com o realizado (C2, 19/10/2026).
      const gPrev = dg.prev
      const gReal = dg.real
      const gPerc = gPrev > 0 ? gReal / gPrev : 0
      // Cada grupo é um acordeão, FECHADO por padrão, como no computador:
      // recolhida, a tela vira um painel de barras (pedido do Guilherme em
      // 10/10/2026). "Outras" também fecha.
      const gid = `g-${tipo}-${grupo}`
      const aberto = abertos.has(gid)
      // Aberto, o cabeçalho fica AZUL-ESCURO, como no computador (21/10/2026),
      // com a paleta do azul (RADAR_COR_AZUL) e rótulo a 75% (5,1).
      const gAtencao = dg.julgado && !SEM_MOVIMENTO.includes(dg.principal) && !isEntrada && gPerc > 1.005
      const gCor  = SEM_MOVIMENTO.includes(dg.principal) ? (aberto ? 'rgba(255,255,255,0.75)' : COR.textoSuave)
        : !dg.julgado ? (aberto ? '#ffffff' : RADAR_COR_NEUTRA)
        : aberto ? RADAR_COR_AZUL[faixaRadar(Math.round(gPerc * 100) / 100, isEntrada)] : gAtencao ? '#b91c1c' : '#1d4ed8'
      const gTexto  = aberto ? '#ffffff' : COR.texto
      const gRotulo = aberto ? 'rgba(255,255,255,0.75)' : COR.textoSuave
      // Borda pelo julgamento (24/10/2026, pedido do Guilherme): dentro do
      // plano azul-claro, passou vermelho (borda e número); sem plano, sem borda.
      // Fechado: número e anel azul neon; passou de 100%, marcador de atenção
      // (24/10/2026, Guilherme), igual ao computador.
      const gBorda = aberto ? '#1e40af' : !dg.julgado || SEM_MOVIMENTO.includes(dg.principal) ? 'transparent'
        : gAtencao ? '#b91c1c' : '#93c5fd'
      // Uma CAIXA por grupo, como o dia em Lançamentos (pedido do Guilherme
      // em 13/10/2026: aberto, "parece ser tudo grupo"). O cabeçalho é o
      // grupo; aberto, as categorias ficam numa caixa recuada, dentro de uma
      // faixa azul-clara, com ícone e letra um degrau menores.
      return [
        <div key={`g-${grupo}`} data-grupo={gid} style={{ background:'#fff', borderRadius:20, overflow:'hidden',
          scrollMarginTop: 12,
          boxShadow: aberto ? 'var(--cx-brilho)' : '0 2px 14px rgba(15,40,120,.07)',
          border:`2px solid ${gBorda}` }}>
        <button onClick={() => toggleAberto(gid)} aria-expanded={aberto}
          aria-label={`${grupoLabel}: ${dg.principal}`}
          style={{ display:'block', width:'100%', textAlign:'left', padding:'14px 16px 12px',
            background: aberto ? 'var(--cx-azul)' : '#fff',
            border:'none', cursor:'pointer', fontFamily:'inherit' }}>
          {/* Opção A (24/10/2026, escolha do Guilherme), a mesma do computador:
              o % num anel à esquerda, no lugar da barra. */}
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <AnelGrupo pct={dg.julgado && !SEM_MOVIMENTO.includes(dg.principal) ? gPerc : null}
              pago={dg.principal.startsWith('✓')}
              cor={aberto ? '#0891b2' : gAtencao ? '#b91c1c' : '#2563eb'} trilho={aberto ? '#fff' : RADAR_TRILHO_BRANCO}
              corTexto={aberto ? '#fff' : gCor} alerta={gAtencao} />
            <div style={{ flex:1, minWidth:0, display:'grid', gap:2 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:16, fontWeight:700, color:gTexto }}>
                <IconeCat icone={grupoIcone} cor={aberto ? '#ffffff' : COR.azul} />
                <span style={{ flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{grupoLabel}</span>
                <span aria-hidden style={{ color:gRotulo, fontSize:14, transform: aberto ? 'rotate(90deg)' : undefined,
                  transition:'transform .15s', width:14, textAlign:'center' }}>›</span>
              </div>
              <span style={{ fontSize:19, fontWeight:800, color:gCor, fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap' }}>
                {dg.principal}
              </span>
              <span style={{ fontSize:13, color:gRotulo, whiteSpace:'nowrap', fontVariantNumeric:'tabular-nums', overflow:'hidden', textOverflow:'ellipsis' }}>
                {dg.julgado ? `${fmtK(gReal)} de ${fmtK(gPrev)}` : fmtK(dg.fora)}
                {dg.julgado && Math.abs(dg.fora) > 0.005 ? ` · ${fmtK(dg.fora)} sem plano` : ''}
              </span>
            </div>
          </div>
        </button>
        {aberto && (
          <div style={{ background:'#eaf1fd', padding:'10px 10px 12px' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#1e3a8a', letterSpacing:'.04em',
              textTransform:'uppercase', margin:'0 6px 8px' }}>
              {allCats.length} {allCats.length === 1 ? 'categoria' : 'categorias'}
            </div>
            {fixasEVariaveis(allCats, categorias).map(parte => (
            <div key={parte.rotulo} style={{ marginTop:8 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', margin:'0 6px 6px' }}>
              {parte.rotulo} · {parte.cats.length}
            </div>
            <div style={{ background:'#fff', borderRadius:14, overflow:'hidden', border:'1px solid #dbe6f8' }}>
        {parte.cats.map((cat, idx) => {
          const cd      = pickReal(realMap, cat.nome, cat.descricao, categorias)
          const prev    = cat.v[mes] ?? 0
          // O total da linha, dinheiro incluído, como no Radar do computador.
          // Antes era banco + cartão: gasto em espécie não aparecia aqui.
          const lancAbs = cd?.total ?? 0
          const uid     = `m-${tipo}-${grupo}-${cat.nome}-${cat.descricao}-${idx}`
          const catInfo =
            (cat.descricao
              ? categorias.find((c: Categoria) => c.nome===cat.nome && c.tipo===tipo && c.descricao===cat.descricao)
              : undefined)
            ?? categorias.find((c: Categoria) => c.nome===cat.nome && c.tipo===tipo)
          return (
            <div key={uid} style={{ borderTop: idx > 0 ? '1px solid #e2e8f0' : 'none' }}>
              {renderMobileCatRow(tipo, cat.nome, cat.descricao, prev, lancAbs, catInfo, uid, cd?.lancamentos ?? [])}
            </div>
          )
        })}
            </div>
            </div>
            ))}
          </div>
        )}
        </div>,
      ]
    })
  }

  return (
    // A PÁGINA rola, como na Bússola. Antes era uma caixa de 100vh com o
    // conteúdo num filho flex:1 rolável — sem minHeight:0 o filho crescia do
    // tamanho do conteúdo, a caixa cortava e nada rolava (relatado pelo
    // Guilherme em 10/10/2026).
    <div style={{ minHeight:'100vh', background:'#f2f5fc', fontFamily:"-apple-system,'Inter',sans-serif" }}>

      {/* Topo azul, no desenho da Bússola (redesenho de 10/10/2026): o mês
          com setas, o saldo de hoje grande, e as duas barras do mês com
          letra legível. A faixa branca "Quanto tenho" e a marca saíram. */}
      <div style={{ background:'var(--cx-azul)', borderRadius:'0 0 28px 28px', boxShadow:'var(--cx-brilho-topo)',
        padding:'calc(16px + env(safe-area-inset-top)) 20px 22px', flexShrink:0 }}>
        {/* Título e o mês com setas ao lado, como Lançamentos e o ano no
            Planejamento (pedido do Guilherme em 13/10/2026). */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
          <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:'#fff', letterSpacing:'-.01em' }}>Radar</h1>
          <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
            <button aria-label="Mês anterior" onClick={() => { if(mes===0){setMes(11);setAno(a=>a-1)}else setMes(m=>m-1) }} style={SETA}>‹</button>
            <span style={{ minWidth:58, textAlign:'center', color:'#fff', lineHeight:1.15 }}>
              <span style={{ display:'block', fontSize:17, fontWeight:800 }}>{MESES_FULL[mes].slice(0,3)}</span>
              <span style={{ display:'block', fontSize:12, fontWeight:600, color:'rgba(255,255,255,.75)' }}>{ano}</span>
            </span>
            <button aria-label="Próximo mês" onClick={() => { if(mes===11){setMes(0);setAno(a=>a+1)}else setMes(m=>m+1) }} style={SETA}>›</button>
          </div>
        </div>

        <div style={{ marginTop:18 }}>
          <div style={{ fontSize:15, color:'rgba(255,255,255,.75)' }}>{ehMesAtual ? `Quanto tenho hoje · dia ${diaHoje} de ${totalDias}` : 'Saldo do mês'}</div>
          <div style={{ fontSize:34, fontWeight:800, letterSpacing:'-.02em', lineHeight:1.15, fontVariantNumeric:'tabular-nums',
            color: '#fff' }}>{fmt(saldoReal)}</div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:12, marginTop:18 }}>
          {([
            // Receitas e Despesas, nas cores do "Resumo do mês" da Início: verde
            // e laranja pelo TIPO (pedido do Guilherme, 23/10/2026). Quem diz se
            // passou do plano são os grupos logo abaixo.
            // Texto no azul é branco (24/10/2026); a cor fica na barra.
            ['Receitas', '#fff', '#86efac', percE, totalRealE, totalPrevE],
            ['Despesas', '#fff', RADAR_AMARELO, percS, totalRealS, totalPrevS],
          ] as [string,string,string,number,number,number][]).map(([rot, corRot, , p, real, prev]) => (
            <div key={rot}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:8, marginBottom:6 }}>
                <span style={{ fontSize:14, fontWeight:700, color:corRot }}>{rot}</span>
                <span style={{ fontSize:14, color:'rgba(255,255,255,.75)', fontVariantNumeric:'tabular-nums' }}>
                  <b style={{ color:'#fff' }}>{fmtK(real)}</b>{prev > 0 ? ` de ${fmtK(prev)}` : ''}
                </span>
              </div>
              <div style={{ height:8, background:'var(--cx-trilho)', boxShadow:'var(--cx-trilho-brilho)', borderRadius:4, overflow:'hidden' }}>
                <div style={{ width:`${Math.min(p,1)*100}%`, height:'100%', borderRadius:4, background:'var(--cx-barra)' }}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      {/* Grade, não flex em coluna: na coluna os cartões (overflow hidden)
          encolhiam até caber na altura da tela e cortavam as linhas. */}
      {/* minmax(0,1fr): sem ele a coluna cresce até o texto mais comprido que
          não quebra (a descrição de um lançamento, com reticências), e a tela
          ganhava rolagem para o lado (30/10/2026, relatado pelo Guilherme). */}
      <div style={{ padding:'16px 16px 110px', display:'grid', gridTemplateColumns:'minmax(0,1fr)', alignContent:'start', gap:16 }}>
        {!dadosAno ? (
          <EmptyState
            icon="ti-radar-2"
            title="Veja se está no caminho certo"
            description={`Aqui você compara o que planejou com o que gastou em ${ano}. Para começar, monte seu plano.`}
            actionLabel="Criar plano →"
            onAction={() => navigate(`/planejamento?ano=${ano}`)}
          />
        ) : (<>
          {resumo && <ResumoRadarFaixa resumo={resumo} />}
          <RevisaoPlanoFaixa acima={lancadoAcima} onRevisar={onRevisar} />
          {(dadosAno.entradas ?? []).length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'6px 4px 0' }}>
                <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                  <span style={{ fontSize:19, fontWeight:800, color:COR.texto }}>Receitas</span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2 }}>
                  <span style={{ fontSize:13, fontWeight:700, padding:'4px 10px', borderRadius:999,
                    background:'#dcfce7', color:'#166534' }}>
                    {totalPrevE>0 ? `${Math.round(percE*100)}% recebido` : 'Sem previsão'}
                  </span>
                  
                </div>
              </div>
              {renderMobileSecao('entrada',
                gruposEntrada.includes('__sem_grupo__') ? gruposEntrada : [...gruposEntrada, '__sem_grupo__'],
                dadosAno.entradas ?? [], entradasMap)}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'14px 16px', background:'#fff', borderRadius:20, gap:8,
                boxShadow:'0 2px 14px rgba(15,40,120,.07)' }}>
                <span style={{ fontSize:15, fontWeight:800, color:COR.texto }}>Total</span>
                <div style={{ display:'flex', gap:10, minWidth:0 }}>
                  {([['Previsto','#64748b',fmt(totalPrevE)],['Realizado','#16a34a',fmt(totalRealE)],['A receber','#b45309',fmt(totalAReceberE)]] as [string,string,string][]).map(([lbl,cor,val]) => (
                    <div key={lbl} style={{ display:'flex', flexDirection:'column', alignItems:'flex-end' }}>
                      <span style={{ fontSize:12, fontWeight:600, color:COR.textoSuave, marginBottom:1 }}>{lbl}</span>
                      <span style={{ fontSize:14, fontWeight:800, color:cor, fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap' }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(dadosAno.saidas ?? []).length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'6px 4px 0' }}>
                <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                  <span style={{ fontSize:19, fontWeight:800, color:COR.texto }}>Despesas</span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2 }}>
                  <span style={{ fontSize:13, fontWeight:700, padding:'4px 10px', borderRadius:999,
                    background:percS<0.8?'#dcfce7':percS<1?'#fef9c3':'#fee2e2',
                    color:percS<0.8?'#166534':percS<1?'#92400e':'#991b1b' }}>
                    {totalPrevS>0 ? `${Math.round(percS*100)}% gasto` : 'Sem previsão'}
                  </span>
                  
                </div>
              </div>
              {renderMobileSecao('saida', gruposSaida, dadosAno.saidas ?? [], saidasMap)}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'14px 16px', background:'#fff', borderRadius:20, gap:8,
                boxShadow:'0 2px 14px rgba(15,40,120,.07)' }}>
                <span style={{ fontSize:15, fontWeight:800, color:COR.texto }}>Total</span>
                <div style={{ display:'flex', gap:10, minWidth:0 }}>
                  {([['Previsto','#64748b',fmt(totalPrevS)],['Realizado','#dc2626',fmt(totalRealS)],['Disponível','#16a34a',fmt(totalApagarS)]] as [string,string,string][]).map(([lbl,cor,val]) => (
                    <div key={lbl} style={{ display:'flex', flexDirection:'column', alignItems:'flex-end' }}>
                      <span style={{ fontSize:12, fontWeight:600, color:COR.textoSuave, marginBottom:1 }}>{lbl}</span>
                      <span style={{ fontSize:14, fontWeight:800, color:cor, fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap' }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Saldo final previsto: toca e abre a memória de cálculo, a mesma
              do rodapé do Radar no computador. Negativo, a caixa fica
              vermelha e o número BRANCO: o laranja #c2410c some no #991b1b. */}
          <div style={{ borderRadius:20, overflow:'hidden', boxShadow:'0 4px 16px rgba(26,86,219,.25)',
            background: saldoPrev >= 0 ? 'var(--cx-azul)' : 'linear-gradient(135deg,#7f1d1d,#991b1b)' }}>
            <button onClick={() => setMemoriaAberta(v => !v)} aria-expanded={memoriaAberta} style={{
              width:'100%', padding:'18px 18px', display:'flex', gap:10, alignItems:'center', justifyContent:'space-between',
              background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left',
            }}>
              <div>
                <div style={{ fontSize:15, color:'#fff', fontWeight:700, marginBottom:4 }}>
                  Mês termina com
                </div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,.8)', display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                  <span style={{ textDecoration:'underline', textUnderlineOffset:3 }}>{memoriaAberta ? 'fechar' : 'como cheguei'}</span>
                  <ChipCenario cenario={cenario} />
                </div>
              </div>
              <div style={{ fontSize:24, fontWeight:800, letterSpacing:-.5, fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap',
                color:'#fff' }}>
                {fmt(saldoPrev)}
              </div>
            </button>
            {memoriaAberta && (
              <MemoriaSaldo m={memoria} positivo={saldoPrev >= 0} cenario={cenario} onCenario={onCenario} />
            )}
          </div>
        </>)}
      </div>

      <BottomNav />
    </div>
  )
}

/** Como o BTN_ANO do Planejamento do celular. */
const SETA = { width:40, height:40, borderRadius:'50%', border:'none', background:'rgba(255,255,255,.15)',
  color:'#fff', fontSize:22, fontWeight:700, cursor:'pointer', fontFamily:'inherit', lineHeight:1 } as const
