import { iconeCategoria } from '../../utils/categoriaIcone'
import { COR, MESES_FULL, fmt, nomeExibicao, type AnoData, type Cat } from './types'
import PlanCelulaEditavel from './PlanCelulaEditavel'

interface Props {
  mes: number
  dadosPrevisto: AnoData
  hasFaturaCat: boolean
  planoRef?: AnoData
  categorias: any[]
  onSave: (tipo: 'e' | 's', ri: number, valor: number) => void
  onClose: () => void
  somaCartaoMes: number[]
}

type CatIdx = { cat: Cat; ri: number }

/**
 * ri e o indice na lista ORIGINAL de dadosAtivos — e por ele que onSave grava
 * (editarValor escreve em d.saidas[ri]). Por isso a indexacao acontece antes
 * de qualquer filtro: indexar depois de filtrar deslocava tudo e o valor caia
 * na categoria errada.
 */
const comIndice = (cats: Cat[]): CatIdx[] => cats.map((cat, ri) => ({ cat, ri }))

function groupCats(items: CatIdx[]): [string, CatIdx[]][] {
  const map = new Map<string, CatIdx[]>()
  for (const item of items) {
    const g = item.cat.grupo ?? '__sem_grupo__'
    if (!map.has(g)) map.set(g, [])
    map.get(g)!.push(item)
  }
  return [...map.entries()].sort(([a], [b]) =>
    a === '__sem_grupo__' ? 1 : b === '__sem_grupo__' ? -1 : a.localeCompare(b, 'pt-BR')
  )
}

export default function PlanModalMes({
  mes, dadosPrevisto, hasFaturaCat,
  categorias, onSave, onClose,
}: Props) {
  const dadosAtivos = dadosPrevisto

  const entradasIdx = comIndice(dadosAtivos.entradas)
  const saidasVisiveis = hasFaturaCat
    ? comIndice(dadosAtivos.saidas).filter(x => x.cat.t !== 'cartao')
    : comIndice(dadosAtivos.saidas)

  const teTotal = dadosAtivos.entradas.reduce((s, c) => s + c.v[mes], 0)
  const tsTotal = saidasVisiveis.reduce((s, x) => s + x.cat.v[mes], 0)
  const resultado = teTotal - tsTotal

  const gruposEntradas = groupCats(entradasIdx)
  const gruposSaidas = groupCats(saidasVisiveis)

  function renderCat(cat: Cat, ri: number, tipo: 'e' | 's') {
    const { icone } = iconeCategoria(categorias, cat.nome)
    return (
      <div key={cat.id ?? cat.nome} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 0', borderBottom: `1px solid ${COR.borda}`,
      }}>
        <span style={{ fontSize: 16 }}>{icone}</span>
        <span style={{ flex: 1, fontSize: 13, color: COR.texto }}>{nomeExibicao(cat)}</span>
        <PlanCelulaEditavel
          valor={cat.v[mes]}
          onSave={v => onSave(tipo, ri, v)}
        />
      </div>
    )
  }

  function renderGrupos(grupos: [string, { cat: Cat; ri: number }[]][], tipo: 'e' | 's', corTipo: string) {
    const semGrupo = grupos.find(([g]) => g === '__sem_grupo__')?.[1] ?? []
    const comGrupo = grupos.filter(([g]) => g !== '__sem_grupo__')
    const temGrupos = comGrupo.length > 0

    return (
      <>
        {comGrupo.map(([grupo, items]) => (
          <div key={grupo} style={{ marginBottom: 12 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '.5px', color: corTipo, opacity: 0.7,
              padding: '6px 0 4px',
              borderBottom: `1px solid ${COR.borda}`,
              marginBottom: 2,
            }}>{grupo}</div>
            {items.map(({ cat, ri }) => renderCat(cat, ri, tipo))}
          </div>
        ))}

        {semGrupo.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            {temGrupos && (
              <div style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '.5px', color: COR.textoSuave, opacity: 0.7,
                padding: '6px 0 4px',
                borderBottom: `1px solid ${COR.borda}`,
                marginBottom: 2,
              }}>Outros</div>
            )}
            {semGrupo.map(({ cat, ri }) => renderCat(cat, ri, tipo))}
          </div>
        )}
      </>
    )
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: COR.branco, borderRadius: 20, width: '100%', maxWidth: 500,
        maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px', borderBottom: `1px solid ${COR.borda}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: COR.texto }}>{MESES_FULL[mes]}</div>
            <div style={{ fontSize: 11, color: COR.textoSuave }}>Planejamento</div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none', background: '#f1f5f9', borderRadius: 8,
              padding: '6px 12px', cursor: 'pointer', fontSize: 13, color: COR.textoSuave,
            }}
          >Fechar</button>
        </div>

        {/* Conteudo */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px' }}>
          {/* Receitas */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
              letterSpacing: '.4px', color: COR.verde, marginBottom: 8,
            }}>Receitas</div>
            {renderGrupos(gruposEntradas, 'e', COR.verde)}
          </div>

          {/* Despesas */}
          <div>
            <div style={{
              fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
              letterSpacing: '.4px', color: COR.vermelho, marginBottom: 8,
            }}>Despesas</div>
            {renderGrupos(gruposSaidas, 's', COR.vermelho)}
          </div>
        </div>

        {/* Rodape */}
        <div style={{
          padding: '14px 20px',
          background: 'linear-gradient(135deg,#0f2878,#1e40af)',
          display: 'flex', gap: 12,
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.65)', textTransform: 'uppercase', letterSpacing: '.4px' }}>Receitas</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{fmt(teTotal, true)}</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.65)', textTransform: 'uppercase', letterSpacing: '.4px' }}>Despesas</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{fmt(tsTotal, true)}</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.65)', textTransform: 'uppercase', letterSpacing: '.4px' }}>Resultado</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: resultado >= 0 ? '#86efac' : '#fca5a5', fontVariantNumeric: 'tabular-nums' }}>
              {resultado >= 0 ? '+' : ''}{fmt(resultado, true)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
