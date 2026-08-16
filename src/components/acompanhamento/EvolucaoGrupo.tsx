import type { Categoria } from '../../context/AppContext'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { fmt, type CatReal } from './AcShared'
import { buildAllCats, calcGrupoReal, calcGrupoPrev } from './evolucaoCalcs'
import EvolucaoLinha from './EvolucaoLinha'

interface EvolucaoGrupoProps {
  tipo: 'saida' | 'entrada'
  grupo: string
  planCats: { nome: string; v: number[] }[]
  realMap: Record<string, CatReal>
  categorias: Categoria[]
  cartaoNomes: Set<string>
  mes: number
}

export default function EvolucaoGrupo({
  tipo, grupo, planCats, realMap, categorias, cartaoNomes, mes,
}: EvolucaoGrupoProps) {
  const isEntrada = tipo === 'entrada'
  const grupoLabel = grupo === '__sem_grupo__' ? 'Outras' : grupo

  const allCats = buildAllCats(tipo, grupo, planCats, realMap, categorias, cartaoNomes)
  if (allCats.length === 0) return null

  const totalPrev = calcGrupoPrev(allCats, mes)
  const totalReal = calcGrupoReal(allCats, realMap)

  const grupoIcone = (() => {
    const primNome = allCats[0]?.nome
    if (!primNome) return isEntrada ? '💰' : '📂'
    return iconeCategoria(categorias, primNome).icone
  })()

  const difVal = isEntrada
    ? (totalReal === 0 ? totalPrev : totalReal >= totalPrev ? totalReal - totalPrev : totalPrev - totalReal)
    : (totalReal === 0 ? totalPrev : totalReal <= totalPrev ? totalPrev - totalReal : totalReal - totalPrev)
  const difLabel = isEntrada
    ? (totalReal === 0 ? 'A receber' : totalReal >= totalPrev ? 'Diferença' : 'Faltou')
    : (totalReal === 0 ? 'Disponível' : totalReal <= totalPrev ? 'Disponível' : 'Estourou')
  const difCor = isEntrada
    ? (totalReal === 0 ? '#fcd34d' : totalReal >= totalPrev ? '#4ade80' : '#fcd34d')
    : (totalReal === 0 ? '#93c5fd' : totalReal <= totalPrev ? '#93c5fd' : '#fca5a5')

  const perc      = totalPrev > 0 ? totalReal / totalPrev : (totalReal > 0 ? 1 : 0)
  const percClamp = Math.min(perc, 1)
  const percLabel = totalPrev > 0 || totalReal > 0 ? `${Math.round(perc * 100)}%` : '—'
  const barCor    = isEntrada
    ? (totalReal === 0 ? '#fbbf24' : totalReal >= totalPrev ? '#4ade80' : '#fbbf24')
    : (totalReal === 0 ? '#fbbf24' : totalReal > totalPrev ? '#f87171' : '#4ade80')
  const barPctCor = perc === 0 ? 'rgba(255,255,255,0.5)' : perc > 1 ? '#fca5a5' : '#fff'

  const gradient = isEntrada
    ? 'linear-gradient(135deg,#0f2878,#1a56db)'
    : 'linear-gradient(135deg,#7f1d1d,#b91c1c)'
  const tipoLabel = isEntrada ? 'Recebimento' : 'Pagamento'

  return (
    <div style={{ flexShrink: 0 }}>
      {/* Header gradiente — mesmo layout das linhas para alinhar colunas */}
      <div style={{
        background: gradient, borderRadius: '12px 12px 0 0',
        padding: '10px 14px', color: '#fff',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {/* Espaçador invisível no lugar da barra lateral (3px) */}
        <div style={{ width: 3, flexShrink: 0 }} />
        {/* Ícone no mesmo tamanho do ícone das categorias */}
        <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: 'rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
          {grupoIcone}
        </div>
        {/* Título */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>{tipoLabel} — {grupoLabel}</div>
        </div>
        {/* Previsto */}
        <div style={{ textAlign: 'right', width: 90, padding: '0 4px', flexShrink: 0 }}>
          <div style={{ fontSize: 8, opacity: .6, textTransform: 'uppercase', letterSpacing: .3 }}>Previsto</div>
          <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}>{totalPrev > 0 ? fmt(totalPrev) : '—'}</div>
        </div>
        {/* Realizado */}
        <div style={{ textAlign: 'right', width: 90, padding: '0 4px', flexShrink: 0 }}>
          <div style={{ fontSize: 8, opacity: .6, textTransform: 'uppercase', letterSpacing: .3 }}>Realizado</div>
          <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2 }}>{totalReal > 0 ? fmt(totalReal) : '—'}</div>
        </div>
        {/* Diferença */}
        <div style={{ textAlign: 'right', width: 90, padding: '0 4px', flexShrink: 0 }}>
          <div style={{ fontSize: 8, opacity: .6, textTransform: 'uppercase', letterSpacing: .3 }}>{difLabel}</div>
          <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2, color: difCor }}>
            {(totalPrev === 0 && totalReal === 0) ? '—' : fmt(difVal)}
          </div>
        </div>
        {/* Barra de progresso */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, width: 90, justifyContent: 'flex-end', flexShrink: 0 }}>
          <div style={{ width: 50, height: 5, background: 'rgba(255,255,255,0.25)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 2, width: `${percClamp * 100}%`, background: barCor }} />
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, minWidth: 32, textAlign: 'right', color: barPctCor }}>{percLabel}</div>
        </div>
      </div>

      {/* Container branco com bordas */}
      <div style={{
        background: '#fff', border: '1px solid #e2e8f0',
        borderTop: 0, borderRadius: '0 0 12px 12px', overflow: 'hidden',
      }}>
        {allCats.map((cat, idx) => {
          const realKey = cat.descricao ? `${cat.nome}||${cat.descricao}` : cat.nome
          const cd = realMap[realKey]
          return (
            <EvolucaoLinha
              key={`${tipo}-${grupo}-${cat.nome}-${idx}`}
              nome={cat.nome}
              descricao={cat.descricao || undefined}
              prev={cat.v[mes] ?? 0}
              real={cd?.total ?? 0}
              isEntrada={isEntrada}
              categorias={categorias}
            />
          )
        })}
      </div>
    </div>
  )
}
