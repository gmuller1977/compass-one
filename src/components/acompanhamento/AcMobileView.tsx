import { VALOR_OCULTO, valoresOcultos } from '../../utils/valoresOcultos'
import React, { useState } from 'react'
import type { Categoria } from '../../context/AppContext'
import { iconeCategoria } from '../../utils/categoriaIcone'
import EmptyState from '../EmptyState'
import BottomNav from '../BottomNav'
import { COR, MESES_FULL, fmt, type Lanc, type CatReal } from './AcShared'
import { buildAllCats, pickReal, cadastroDaLinha, fixasEVariaveis, type PlanCat } from './evolucaoCalcs'
import RevisaoPlanoFaixa from './RevisaoPlanoFaixa'
import type { ResumoRadar } from '../../utils/resumoRadar'
import type { LancadoAcima } from '../../utils/lancadoAcimaDoPlano'
import { AnelGrupo } from './EvolucaoGrupo'
import { RADAR_TEXTO_CLARO as RADAR_COR_CLARO, RADAR_TEXTO_AZUL as RADAR_COR_AZUL, RADAR_BARRA_CLARO, RADAR_BORDA_CLARO, RADAR_TRILHO_BRANCO, SEM_MOVIMENTO, RADAR_AMARELO, RADAR_COR_NEUTRA, faixaRadar, terceiraColuna, destaqueDoGrupo, ehFixaPaga, semPlano } from './radarCores'
import TabelaPlano from './TabelaPlano'
import { colunasBase } from './radarCores'
import { useForaDoMes } from './foraDoMesContexto'
import { useAbrirAjuste } from './ajustePlanoContexto'
import { MemoriaSaldo, ChipCenario } from '../novoLancamentoExtrato/NleExtrato'
import type { CenarioPrevisao } from '../../utils/saldoConta'
import { IconeCat } from '../IconeCat'
import { BotaoOlho, OndasTopo, RotuloTopo } from '../mobile/ui'
import { FONTE_SITE, FONTE_TITULO } from '../mobile/estilo'
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
  /** Com quanto o mês termina pelo plano (o do Planejamento); null sem plano. */
  saldoPlanejado: number | null
  /** Com quanto o mês abriu (o Saldo inicial do computador). */
  saldoInicial: number
  /** A frase "você está economizando" do computador; null sem plano. */
  fraseEconomia: React.ReactNode
  /** A frase embaixo do realizado, a mesma do computador. */
  subRealizado: string
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
  saldoAtual, saldoPrevisto, saldoPlanejado, subRealizado, saldoInicial, fraseEconomia,
  memoria, cenario, onCenario, lancadoAcima, onRevisar,
}: AcMobileViewProps) {
  const abrirAjuste = useAbrirAjuste()
  const foraDoMesIds = useForaDoMes()
  const [memoriaAberta, setMemoriaAberta] = useState(false)
  const [detalhes, setDetalhes] = useState(false)
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
  const fmtK = (v: number) => valoresOcultos() ? VALOR_OCULTO : 'R$ ' + Math.round(v).toLocaleString('pt-BR')


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
    const naoOcorre = foraDoMesIds.has(cadastroDaLinha({ nome, descricao }, categorias)?.id ?? '')
    const terceira  = terceiraColuna(prev, lancAbs, isEntrada, { fixa, fixaPaga, naoOcorre })
    // Sem plano no mês não há julgamento: só o realizado, em cor neutra e
    // sem barra (C2, decisão do Guilherme em 19/10/2026).
    const naoJulga  = semPlano(prev)

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
          {/* Nome e variante, com Fixa/Variável ao lado, e embaixo o
              disponível ou passou (21/11/2026, pedido do Guilherme: ao lado
              do número o nome era cortado, "Cuidados Pes..."). O nome quebra
              a linha se precisar; o "gastou X de Y" fica por último. */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', columnGap:8, rowGap:3 }}>
              <span style={{ fontSize:14, fontWeight:600, color:'#0f172a', minWidth:0, overflowWrap:'anywhere' }}>
                {nome}{descricao && <span style={{ fontWeight:500, color:COR.textoSuave }}> · {descricao}</span>}
              </span>
              <span style={{ fontSize:12, padding:'1px 8px', borderRadius:999, fontWeight:700, flexShrink:0,
                background:catInfo?.fixa?'#e0f2fe':'#f1f5f9',
                color:catInfo?.fixa?'#0369a1':'#64748b' }}>
                {catInfo?.fixa ? 'Fixa' : 'Variável'}
              </span>
            </div>
            {/* Planejado · Realizado · A pagar / Disponível (28/11/2026, Guilherme), como no computador. */}
            <div style={{ marginTop:6 }}>
              <TabelaPlano tamanho={15} colunas={[...colunasBase(prev, lancAbs, isEntrada, naoJulga),
                { rotulo: terceira.rotulo, valor: terceira.valor, cor: terceira.estado === 'neutro' ? '#334155' : RADAR_COR_CLARO[terceira.estado] }]} />
            </div>
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
        const cad = cadastroDaLinha({ nome: cat.nome, descricao: cat.descricao }, categorias)
        return { prev, real, fixa: !!cad?.fixa, naoOcorre: foraDoMesIds.has(cad?.id ?? '') }
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
        : gAtencao ? '#b91c1c' : 'var(--cx-borda)'
      // Uma CAIXA por grupo, como o dia em Lançamentos (pedido do Guilherme
      // em 13/10/2026: aberto, "parece ser tudo grupo"). O cabeçalho é o
      // grupo; aberto, as categorias ficam numa caixa recuada, dentro de uma
      // faixa azul-clara, com ícone e letra um degrau menores.
      return [
        <div key={`g-${grupo}`} data-grupo={gid} style={{ background:'#fff', borderRadius:20, overflow:'hidden',
          scrollMarginTop: 12,
          boxShadow: aberto ? 'var(--cx-brilho)' : '0 2px 14px rgba(15,40,120,.07)',
          border: gBorda === 'var(--cx-borda)' ? '1px solid var(--cx-borda)' : `2px solid ${gBorda}`, padding: gBorda === 'var(--cx-borda)' ? 1 : undefined }}>
        <button onClick={() => toggleAberto(gid)} aria-expanded={aberto}
          aria-label={`${grupoLabel}: ${dg.principal}`}
          style={{ display:'block', width:'100%', textAlign:'left', padding:'14px 16px 12px',
            background: aberto ? 'var(--cx-azul)' : '#fff',
            border:'none', cursor:'pointer', fontFamily:'inherit' }}>
          {/* Opção A (24/10/2026, escolha do Guilherme), a mesma do computador:
              o % num anel, no lugar da barra; à direita desde 21/11/2026 (pedido dele). */}
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
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
              {SEM_MOVIMENTO.includes(dg.principal) && <span style={{ fontSize:13, color:gRotulo }}>{dg.contexto}</span>}
            </div>
            <AnelGrupo pct={dg.julgado && !SEM_MOVIMENTO.includes(dg.principal) ? gPerc : null}
              pago={dg.principal.startsWith('✓')}
              cor={aberto ? '#0891b2' : gAtencao ? '#b91c1c' : '#2563eb'} trilho={aberto ? '#fff' : RADAR_TRILHO_BRANCO}
              corTexto={aberto ? '#fff' : gCor} alerta={gAtencao} />
          </div>
          {!SEM_MOVIMENTO.includes(dg.principal) && (
            <div style={{ marginTop:12 }}>
              {/* Só o total: Planejado · Realizado (28/11/2026, Guilherme). */}
              <div style={{ borderTop:`1px solid ${aberto ? 'rgba(255,255,255,0.18)' : '#e2e8f0'}`, paddingTop:10 }}>
                <TabelaPlano azul={aberto} colunas={colunasBase(dg.prev, dg.julgado ? dg.real : dg.fora, isEntrada, !dg.julgado)} />
              </div>
            </div>
          )}
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
    <div style={{ minHeight:'100vh', background:'#f2f5fc', fontFamily:FONTE_SITE }}>

      {/* Topo azul, no desenho da Bússola (redesenho de 10/10/2026): o mês
          com setas, o saldo de hoje grande, e as duas barras do mês com
          letra legível. A faixa branca "Quanto tenho" e a marca saíram. */}
      <div style={{ background:'linear-gradient(180deg, #070c18 0%, #111c3f 35%, #1e40af 100%)', position:'relative', overflow:'hidden',
        padding:'calc(16px + env(safe-area-inset-top)) 20px 66px', flexShrink:0 }}>
        <OndasTopo />
        <div style={{ position:'relative' }}>
        {/* Título e o mês com setas ao lado, como Lançamentos e o ano no
            Planejamento (pedido do Guilherme em 13/10/2026). */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
          <div style={{ minWidth:0 }}>
            <RotuloTopo icone="ti-radar-2">Acompanhamento do mês</RotuloTopo>
            <h1 style={{ margin:'4px 0 0', fontFamily:FONTE_TITULO, fontSize:32, fontWeight:700, lineHeight:1, color:'#fff' }}>Radar</h1>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
            <button aria-label="Mês anterior" onClick={() => { if(mes===0){setMes(11);setAno(a=>a-1)}else setMes(m=>m-1) }} style={SETA_OLHO}>‹</button>
            <span style={{ minWidth:46, textAlign:'center', color:'#fff', lineHeight:1.15 }}>
              <span style={{ display:'block', fontSize:17, fontWeight:800 }}>{MESES_FULL[mes].slice(0,3)}</span>
              <span style={{ display:'block', fontSize:12, fontWeight:600, color:'rgba(255,255,255,.75)' }}>{ano}</span>
            </span>
            <button aria-label="Próximo mês" onClick={() => { if(mes===11){setMes(0);setAno(a=>a+1)}else setMes(m=>m+1) }} style={SETA_OLHO}>›</button>
            <BotaoOlho tamanho={36} />
          </div>
        </div>

        {/* "Mês termina com" logo abaixo do saldo de hoje, sempre à vista
            (06/11/2026, Guilherme: "não é sempre que o usuário rola até o
            fim"). Antes ficava numa caixa no pé da tela, e o mês fora do
            corrente mostrava "Saldo do mês" no topo. Cabe −R$ 999.999,99 em
            375px. */}
        {/* Topo enxuto, como no computador (21/11/2026, pedido do Guilherme):
            os três saldos numa caixa, a frase do quanto está economizando no
            plano, e "Ver detalhes" com o "Mês termina com" e receitas e
            despesas. Cabe −R$ 999.999,99 em 375px (a letra encolhe, cqi). */}
        {fraseEconomia && (
          <div style={{ marginTop:18, fontSize:15, color:'#fff', display:'flex', alignItems:'center', gap:8, lineHeight:1.35 }}>
            <i className="ti ti-pig-money" aria-hidden style={{ fontSize:20, flexShrink:0 }} />{fraseEconomia}
          </div>
        )}
        <button type="button" onClick={() => setDetalhes(v => !v)} aria-expanded={detalhes}
          style={{ marginTop:12, background:'none', border:'1px solid rgba(255,255,255,.4)', borderRadius:999, color:'#fff', cursor:'pointer',
            fontFamily:'inherit', fontSize:14, fontWeight:600, padding:'8px 16px', display:'inline-flex', alignItems:'center', gap:6, minHeight:40 }}>
          {detalhes ? 'Ocultar detalhes' : 'Ver detalhes'}
          <i className={`ti ${detalhes ? 'ti-chevron-up' : 'ti-chevron-down'}`} aria-hidden />
        </button>
        {detalhes && (<>
        {/* Os três saldos moram dentro do "Ver detalhes" (21/11/2026,
            Guilherme: "no celular, os 3 cards podem ficar dentro do ver
            detalhes"). O computador segue com eles à vista. */}
        <div style={{ ...CAIXA_TOPO, padding:'4px 14px', marginTop:12 }}>
          {([
            ['ti-flag', 'Saldo inicial', `${MESES_FULL[mes]} começou com`, saldoInicial],
            ['ti-calendar-stats', 'Saldo final planejado', 'se o plano se cumprir', saldoPlanejado],
            ['ti-wallet', 'Saldo realizado', ehMesAtual ? `Hoje · dia ${diaHoje} de ${totalDias}` : subRealizado, saldoReal],
          ] as [string, string, string, number | null][]).map(([ic, rot, sub, v], i) => (
            <div key={rot} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', containerType:'inline-size',
              borderTop: i ? '1px solid rgba(255,255,255,.16)' : 'none' }}>
              <div style={{ minWidth:0, flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap', overflow:'hidden' }}>
                  <i className={`ti ${ic}`} aria-hidden style={{ fontSize:16, flexShrink:0 }} /><span style={{ overflow:'hidden', textOverflow:'ellipsis' }}>{rot}</span>
                </div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,.75)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{sub}</div>
              </div>
              {v === null
                ? <div style={{ fontSize:14, fontWeight:600, color:'#fff', textAlign:'right' }}>Sem plano neste mês</div>
                : <div style={{ fontFamily:FONTE_TITULO, fontSize:'min(28px, calc(100cqi / 13))', fontWeight:700, fontVariantNumeric:'tabular-nums',
                    whiteSpace:'nowrap', color:'#fff', flexShrink:0 }}>{fmt(v)}</div>}
            </div>
          ))}
        </div>
        <button onClick={() => setMemoriaAberta(v => !v)} aria-expanded={memoriaAberta} style={{
          ...CAIXA_TOPO, width:'100%', marginTop: 12, cursor:'pointer', fontFamily:'inherit', textAlign:'left',
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:10,
          ...(saldoPrev < 0 ? { background:'linear-gradient(135deg,#7f1d1d,#991b1b)', borderColor:'rgba(255,255,255,.3)' } : {}),
        }}>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:14, color:'#fff', fontWeight:700 }}>Mês termina com</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,.85)', marginTop:2, lineHeight:1.3 }}>o que já aconteceu + o que ainda falta do plano</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,.85)', display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginTop:4 }}>
              <span style={{ textDecoration:'underline', textUnderlineOffset:3, fontWeight:600 }}>{memoriaAberta ? 'ocultar cálculo' : 'ver cálculo'}</span>
              <ChipCenario cenario={cenario} />
            </div>
          </div>
          <div style={{ fontSize:22, fontWeight:800, letterSpacing:'-.02em', fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap', color:'#fff' }}>
            {fmt(saldoPrev)}
          </div>
        </button>
        {memoriaAberta && (
          <div style={{ marginTop:10, borderRadius:16, overflow:'hidden' }}>
            <MemoriaSaldo m={memoria} positivo={saldoPrev >= 0} cenario={cenario} onCenario={onCenario} />
          </div>
        )}

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
        </>)}
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
          {/* A frase "Ainda dá para gastar" saiu (06/11/2026, pedido do Guilherme), como no computador. */}
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
            </div>
          )}

        </>)}
      </div>

      <BottomNav />
    </div>
  )
}

/** Caixas do topo, no modelo da caixa do saldo final previsto da Início. */
const CAIXA_TOPO = { background:'rgba(255,255,255,.12)', border:'1px solid rgba(255,255,255,.16)', borderRadius:16,
  padding:'12px 14px', minWidth:0, color:'#fff' } as const

/** Como o BTN_ANO do Planejamento do celular. */
const SETA = { width:40, height:40, borderRadius:'50%', border:'none', background:'rgba(255,255,255,.15)',
  color:'#fff', fontSize:22, fontWeight:700, cursor:'pointer', fontFamily:'inherit', lineHeight:1 } as const
// Com o olho ao lado (21/11/2026), setas de 36 para caber em 360px.
const SETA_OLHO = { ...SETA, width:36, height:36 }
