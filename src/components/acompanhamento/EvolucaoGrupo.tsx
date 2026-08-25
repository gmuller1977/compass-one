import type { Categoria } from '../../context/AppContext'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { fmt, type CatReal } from './AcShared'
import { buildAllCats, calcGrupoReal, calcGrupoPrev, pickReal, type PlanCat } from './evolucaoCalcs'
import EvolucaoLinha from './EvolucaoLinha'

const GRADIENT_STEPS = [
  { pct: 0,   from: '#bfdbfe', to: '#93c5fd', text: '#1e3a8a' },
  { pct: 25,  from: '#93c5fd', to: '#60a5fa', text: '#1e3a8a' },
  { pct: 50,  from: '#60a5fa', to: '#3b82f6', text: '#fff' },
  { pct: 75,  from: '#3b82f6', to: '#2563eb', text: '#fff' },
  { pct: 90,  from: '#2563eb', to: '#1e40af', text: '#fff' },
  { pct: 100, from: '#1e3a8a', to: '#0f2878', text: '#fff' },
]

function corHeaderGrupo(percentual: number) {
  if (percentual > 100) {
    return { bg: 'linear-gradient(135deg, #991b1b, #dc2626)', text: '#fff', dark: false }
  }
  let faixa = GRADIENT_STEPS[0]
  for (const c of GRADIENT_STEPS) { if (percentual >= c.pct) faixa = c }
  return {
    bg: `linear-gradient(135deg, ${faixa.from}, ${faixa.to})`,
    text: faixa.text,
    dark: faixa.text !== '#fff',
  }
}

interface EvolucaoGrupoProps {
  tipo: 'saida' | 'entrada'
  grupo: string
  planCats: PlanCat[]
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

  const perc       = totalPrev > 0 ? totalReal / totalPrev : (totalReal > 0 ? 1 : 0)
  const percClamp  = Math.min(perc, 1)
  const percentual = Math.round(perc * 100)
  const percLabel  = totalPrev > 0 || totalReal > 0 ? `${percentual}%` : '—'

  const cor      = corHeaderGrupo(percentual)
  const barFill  = cor.dark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.7)'
  const barTrack = cor.dark ? 'rgba(0,0,0,0.1)'  : 'rgba(255,255,255,0.2)'
  const tipoLabel = isEntrada ? 'Recebimento' : 'Pagamento'

  return (
    <div style={{ flexShrink: 0 }}>
      {/* Header com gradiente dinâmico */}
      <div style={{
        background: cor.bg, borderRadius: '12px 12px 0 0',
        padding: '10px 14px', color: cor.text,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: cor.dark ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
          {grupoIcone}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>{tipoLabel} — {grupoLabel}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ fontSize: 11, opacity: cor.dark ? 0.75 : 0.9, whiteSpace: 'nowrap' }}>
            <strong style={{ fontWeight: 700 }}>{totalReal > 0 ? fmt(totalReal) : '—'}</strong>
            <span style={{ opacity: 0.65 }}> de </span>
            {totalPrev > 0 ? fmt(totalPrev) : '—'}
          </div>
          <div style={{ width: 60, height: 5, background: barTrack, borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ height: '100%', borderRadius: 2, width: `${percClamp * 100}%`, background: barFill }} />
          </div>
          <div style={{ fontSize: 12, fontWeight: 800, minWidth: 30, textAlign: 'right' }}>{percLabel}</div>
        </div>
      </div>

      {/* Container branco com bordas */}
      <div style={{
        background: '#fff', border: '1px solid #e2e8f0',
        borderTop: 0, borderRadius: '0 0 12px 12px', overflow: 'hidden',
      }}>
        {allCats.map((cat, idx) => {
          const cd = pickReal(realMap, cat.nome, cat.descricao)
          return (
            <EvolucaoLinha
              key={`${tipo}-${grupo}-${cat.nome}-${cat.descricao}-${idx}`}
              nome={cat.nome}
              descricao={cat.descricao || undefined}
              prev={cat.v[mes] ?? 0}
              real={cd?.total ?? 0}
              isEntrada={isEntrada}
              categorias={categorias}
              lancamentos={cd?.lancamentos ?? []}
              totalBanc={cd?.totalBanc ?? 0}
              totalCart={cd?.totalCart ?? 0}
              totalDinheiro={cd?.totalDinheiro ?? 0}
              mes={mes}
            />
          )
        })}
      </div>
    </div>
  )
}
