import React, { useState } from 'react'
import type { Categoria } from '../../context/AppContext'
import { iconeCategoria } from '../../utils/categoriaIcone'
import EmptyState from '../EmptyState'
import BottomNav from '../BottomNav'
import { COR, MESES_FULL, fmt, type Lanc, type CatReal } from './AcShared'
import { buildAllCats, pickReal, cadastroDaLinha, type PlanCat } from './evolucaoCalcs'
import ResumoRadarFaixa from './ResumoRadarFaixa'
import RevisaoPlanoFaixa from './RevisaoPlanoFaixa'
import type { ResumoRadar } from '../../utils/resumoRadar'
import type { LancadoAcima } from '../../utils/lancadoAcimaDoPlano'
import { RADAR_COR_CLARO, faixaRadar, destaqueRadar, destaqueDoGrupo, ehFixaPaga } from './radarCores'
import { useAbrirAjuste } from './ajustePlanoContexto'
import { MemoriaSaldo, ChipCenario } from '../novoLancamentoExtrato/NleExtrato'
import type { CenarioPrevisao } from '../../utils/saldoConta'

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
  totalPrevE, totalPrevS, totalRealE, totalRealS,
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
  const percE     = totalPrevE > 0 ? Math.min(totalRealE / totalPrevE, 1) : (totalRealE > 0 ? 1 : 0)
  const percS     = totalPrevS > 0 ? Math.min(totalRealS / totalPrevS, 1) : (totalRealS > 0 ? 1 : 0)
  const fmtK = (v: number) => 'R$ ' + Math.round(v).toLocaleString('pt-BR')
  const totalAReceberE = Math.max(totalPrevE - totalRealE, 0)
  const totalApagarS   = Math.max(totalPrevS - totalRealS, 0)

  const btnStyle = { width:44,height:44,borderRadius:'50%',border:'none',
    background:'rgba(255,255,255,.14)',color:'#fff',
    fontSize:22,cursor:'pointer' as const,fontWeight:700,
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

    // O mesmo destaque das linhas do Radar no computador (destaqueRadar):
    // quanto RESTA ou quanto PASSOU, e o "gastou X de Y" embaixo, pequeno. As
    // cores são as da paleta clara do Radar, medidas no branco (radarCores).
    const fixa      = !!cadastroDaLinha({ nome, descricao }, categorias)?.fixa
    const fixaPaga  = ehFixaPaga(prev, lancAbs, isEntrada, fixa)
    const destaque  = destaqueRadar(prev, lancAbs, isEntrada, { fixa, fixaPaga })
    const dispColor = (prev === 0 && lancAbs === 0) ? COR.textoSuave
      : fixaPaga ? RADAR_COR_CLARO.bom
      : RADAR_COR_CLARO[faixaRadar(Math.round(perc * 100) / 100, isEntrada)]

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
          style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px 8px',
            cursor:'pointer', background: aberto ? '#f8faff' : '#fff' }}>
          <div style={{ width:44, height:44, borderRadius:'50%', flexShrink:0,
            background:corIcone+'1f', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
            {icone}
          </div>
          {/* Nome e o número que importa na mesma linha; o "gastou X de Y"
              embaixo, na largura toda — ao lado do número ele era cortado. */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:10 }}>
              <div style={{ fontSize:15, fontWeight:700, color:'#0f172a', minWidth:0,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{nome}</div>
              <div style={{ flexShrink:0, fontSize:15, fontWeight:800, color:dispColor, whiteSpace:'nowrap',
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
        {(prev > 0 || lancAbs > 0) && (
          <div style={{ margin:'0 16px 12px 72px' }}>
            <div style={{ background:'#eef2f8', borderRadius:4, height:6, overflow:'hidden' }}>
              <div style={{ width:`${Math.min(perc,1)*100}%`, height:6, borderRadius:4, background:progressColor }}/>
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
                  {(prev===0&&lancAbs===0)?'—':fmt(disponivel)}
                </div>
              </div>
            </div>
            {colunas.length > 0 && (
              <div style={{ display:'grid', gridTemplateColumns:`repeat(${colunas.length},1fr)`, gap:8 }}>
                {colunas.map(col => (
                  <div key={col.label}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#64748b', marginBottom:6 }}>{col.label}</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                      {col.itens.map((l,i) => (
                        <div key={i} style={{ padding:'8px 10px', borderRadius:12,
                          background:'#fff', border:'1px solid #e2e8f0',
                          display:'flex', flexDirection:'column', gap:1 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', gap:6 }}>
                            <span style={{ fontSize:13, color:COR.textoSuave, flexShrink:0 }}>
                              {String(l.dia).padStart(2,'0')}/{String(mes+1).padStart(2,'0')}
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
      const gPrev = linhasGrupo.reduce((t, l) => t + l.prev, 0)
      const gReal = linhasGrupo.reduce((t, l) => t + l.real, 0)
      const gPerc = gPrev > 0 ? gReal / gPrev : (gReal > 0 ? 1 : 0)
      const gCor  = dg.principal === '—' ? COR.textoSuave
        : RADAR_COR_CLARO[faixaRadar(Math.round(gPerc * 100) / 100, isEntrada)]
      return [
        ...(grupo !== '__sem_grupo__' ? [
          <div key={`sub-${grupo}`} style={{ padding:'18px 16px 8px', fontSize:16, fontWeight:700,
            display:'flex', alignItems:'center', gap:8, color:COR.texto, background:'#fff' }}>
            <span>{grupoIcone}</span>
            <span style={{ flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{grupoLabel}</span>
            <span style={{ fontSize:14, fontWeight:700, color:gCor, fontVariantNumeric:'tabular-nums' }}>
              {dg.principal}
            </span>
          </div>
        ] : []),
        ...allCats.map((cat, idx) => {
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
          return renderMobileCatRow(tipo, cat.nome, cat.descricao, prev, lancAbs, catInfo, uid, cd?.lancamentos ?? [])
        }),
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
      <div style={{ background:'linear-gradient(160deg,#0f2878 0%,#1e40af 100%)', borderRadius:'0 0 28px 28px',
        padding:'calc(16px + env(safe-area-inset-top)) 20px 22px', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
          <button aria-label="Mês anterior" onClick={() => { if(mes===0){setMes(11);setAno(a=>a-1)}else setMes(m=>m-1) }} style={btnStyle}>‹</button>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:20, fontWeight:800, color:'#fff' }}>{MESES_FULL[mes]}</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.75)' }}>{ano}{ehMesAtual ? ` · dia ${diaHoje} de ${totalDias}` : ''}</div>
          </div>
          <button aria-label="Próximo mês" onClick={() => { if(mes===11){setMes(0);setAno(a=>a+1)}else setMes(m=>m+1) }} style={btnStyle}>›</button>
        </div>

        <div style={{ marginTop:20 }}>
          <div style={{ fontSize:15, color:'rgba(255,255,255,.75)' }}>{ehMesAtual ? 'Quanto tenho hoje' : 'Saldo do mês'}</div>
          <div style={{ fontSize:34, fontWeight:800, letterSpacing:'-.02em', lineHeight:1.15, fontVariantNumeric:'tabular-nums',
            color: saldoReal >= 0 ? '#fff' : '#fecaca' }}>{fmt(saldoReal)}</div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:12, marginTop:18 }}>
          {([
            ['Recebido', '#86efac', '#4ade80', percE, totalRealE, totalPrevE],
            ['Gasto', '#fecaca', percS<0.8?'#4ade80':percS<1?'#fde047':'#f87171', percS, totalRealS, totalPrevS],
          ] as [string,string,string,number,number,number][]).map(([rot, corRot, corBarra, p, real, prev]) => (
            <div key={rot}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:8, marginBottom:6 }}>
                <span style={{ fontSize:14, fontWeight:700, color:corRot }}>{rot}</span>
                <span style={{ fontSize:14, color:'rgba(255,255,255,.75)', fontVariantNumeric:'tabular-nums' }}>
                  <b style={{ color:'#fff' }}>{fmtK(real)}</b>{prev > 0 ? ` de ${fmtK(prev)}` : ''}
                </span>
              </div>
              <div style={{ height:8, background:'rgba(255,255,255,.16)', borderRadius:4, overflow:'hidden' }}>
                <div style={{ width:`${Math.min(p,1)*100}%`, height:'100%', borderRadius:4, background:corBarra }}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      {/* Grade, não flex em coluna: na coluna os cartões (overflow hidden)
          encolhiam até caber na altura da tela e cortavam as linhas. */}
      <div style={{ padding:'16px 16px 110px', display:'grid', alignContent:'start', gap:16 }}>
        {!dadosAno ? (
          <EmptyState
            icon="📈"
            title="Veja se está no caminho certo"
            description={`Aqui você compara o que planejou com o que gastou em ${ano}. Para começar, monte seu plano.`}
            actionLabel="Criar plano →"
            onAction={() => navigate('/planejamento?modo=wizard')}
          />
        ) : (<>
          {resumo && <ResumoRadarFaixa resumo={resumo} />}
          <RevisaoPlanoFaixa acima={lancadoAcima} onRevisar={onRevisar} />
          {(dadosAno.entradas ?? []).length > 0 && (
            <div style={{ borderRadius:20, overflow:'hidden', boxShadow:'0 2px 14px rgba(15,40,120,.07)', background:'#fff' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'16px 16px 8px', background:'#fff' }}>
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
                padding:'14px 16px', background:'#f8faff', borderTop:'1px solid #eef2f8', gap:8 }}>
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
            <div style={{ borderRadius:20, overflow:'hidden', boxShadow:'0 2px 14px rgba(15,40,120,.07)', background:'#fff' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'16px 16px 8px', background:'#fff' }}>
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
                padding:'14px 16px', background:'#f8faff', borderTop:'1px solid #eef2f8', gap:8 }}>
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
              vermelha e o número em #fecaca (5,74 no #991b1b). */}
          <div style={{ borderRadius:20, overflow:'hidden', boxShadow:'0 4px 16px rgba(26,86,219,.25)',
            background: saldoPrev >= 0 ? 'linear-gradient(135deg,#0f2878,#1e40af)' : 'linear-gradient(135deg,#7f1d1d,#991b1b)' }}>
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
                color:saldoPrev>=0?'#fff':'#fecaca' }}>
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
