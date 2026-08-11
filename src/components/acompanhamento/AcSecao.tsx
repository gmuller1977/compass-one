import type { Categoria } from '../../context/AppContext'
import { COR, type CatReal } from './AcShared'
import AcCatRow from './AcCatRow'

interface AcSecaoProps {
  tipo: 'saida' | 'entrada'
  grupos: string[]
  planCats: { nome: string; v: number[] }[]
  realMap: Record<string, CatReal>
  categorias: Categoria[]
  cartaoNomes: Set<string>
  mes: number
  abertos: Set<string>
  toggleAberto: (uid: string) => void
  isMobile: boolean
}

export default function AcSecao({
  tipo, grupos, planCats, realMap, categorias, cartaoNomes,
  mes, abertos, toggleAberto, isMobile,
}: AcSecaoProps) {
  const isEntrada  = tipo === 'entrada'
  const corGrupo   = isEntrada ? COR.verde     : COR.vermelho
  const fundoGrupo = isEntrada ? COR.verdeFundoGrupo : COR.vermelhoFundoGrupo
  const bordaGrupo = isEntrada ? '#bbf7d0' : '#fecaca'

  return (
    <>
      {grupos.map(grupo => {
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
                  <AcCatRow
                    key={uid}
                    uid={uid}
                    nome={cat.nome}
                    descricao={cat.descricao}
                    prev={cat.v[mes]??0}
                    realBanc={cd?.totalBanc??0}
                    realCart={cd?.totalCart??0}
                    lancamentos={cd?.lancamentos??[]}
                    isEntrada={isEntrada}
                    aberto={abertos.has(uid)}
                    toggleAberto={toggleAberto}
                    isMobile={isMobile}
                    mes={mes}
                    categorias={categorias}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </>
  )
}
