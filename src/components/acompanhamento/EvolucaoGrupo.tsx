import type { Categoria } from '../../context/AppContext'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { fmt, type CatReal } from './AcShared'
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

  const catsPlan = planCats.filter(cat => {
    const g = categorias.find((c: Categoria) => c.nome === cat.nome && c.tipo === tipo)?.grupo ?? '__sem_grupo__'
    return g === grupo
  })

  const nomeOcorrencia = new Map<string, number>()
  const catsComDesc = catsPlan.map(cat => {
    const ocorrencia = nomeOcorrencia.get(cat.nome) ?? 0
    nomeOcorrencia.set(cat.nome, ocorrencia + 1)
    const matching = categorias.filter((c: Categoria) => c.nome === cat.nome && c.tipo === tipo)
    const descricao = matching[ocorrencia]?.descricao ?? ''
    return { ...cat, descricao }
  })

  const plannedNames = new Set(catsPlan.map(c => c.nome))
  const extraCats = Object.keys(realMap)
    .map(k => k.includes('||') ? k.split('||')[0] : k)
    .filter((n, i, a) => a.indexOf(n) === i && !plannedNames.has(n))
    .flatMap(nome => {
      const cat = categorias.find((c: Categoria) => c.nome === nome && c.tipo === tipo)
      if (!cat || !cat.ativa || cartaoNomes.has(cat.nome.toLowerCase())) return []
      if ((cat.grupo ?? '__sem_grupo__') !== grupo) return []
      return [{ nome, v: Array(12).fill(0) as number[], descricao: cat.descricao ?? '' }]
    })

  const allCats = [...catsComDesc, ...extraCats]
  if (allCats.length === 0) return null

  const totalPrev = allCats.reduce((s, cat) => s + (cat.v[mes] ?? 0), 0)
  const totalReal = allCats.reduce((s, cat) => {
    const realKey = cat.descricao ? `${cat.nome}||${cat.descricao}` : cat.nome
    return s + (realMap[realKey]?.total ?? 0)
  }, 0)

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

  const gradient = isEntrada
    ? 'linear-gradient(135deg,#0f2878,#1a56db)'
    : 'linear-gradient(135deg,#7f1d1d,#b91c1c)'
  const tipoLabel = isEntrada ? 'Recebimento' : 'Pagamento'

  const hdrCol = (label: string, valor: string, cor?: string) => (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 8, opacity: .6, textTransform: 'uppercase' as const, letterSpacing: .3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: cor ?? '#fff', marginTop: 2 }}>{valor}</div>
    </div>
  )

  return (
    <div style={{ flexShrink: 0 }}>
      {/* Header gradiente */}
      <div style={{
        background: gradient, borderRadius: '12px 12px 0 0',
        padding: '12px 16px', color: '#fff',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 18 }}>{grupoIcone}</span>
          {tipoLabel} — {grupoLabel}
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {hdrCol('Previsto', totalPrev > 0 ? fmt(totalPrev) : '—')}
          {hdrCol('Realizado', totalReal > 0 ? fmt(totalReal) : '—')}
          {hdrCol(difLabel, (totalPrev === 0 && totalReal === 0) ? '—' : fmt(difVal), difCor)}
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
