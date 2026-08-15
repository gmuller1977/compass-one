import type { Categoria } from '../../context/AppContext'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { COR, fmt, barCor, type CatSel } from './AcShared'

export interface AcCatRowProps {
  uid: string
  nome: string
  descricao?: string
  prev: number
  realBanc: number
  realCart: number
  realDinheiro: number
  lancamentos: import('./AcShared').Lanc[]
  isEntrada?: boolean
  selecionada: boolean
  onSelect: (cat: CatSel) => void
  categorias: Categoria[]
}

export default function AcCatRow({
  uid, nome, descricao, prev, realBanc, realCart, realDinheiro, lancamentos,
  isEntrada, selecionada, onSelect, categorias,
}: AcCatRowProps) {
  const { icone, cor: corIcone } = iconeCategoria(categorias, nome)
  const lancAbs    = realBanc + realCart + realDinheiro
  const disponivel = prev - lancAbs
  const perc       = prev > 0 ? lancAbs / prev : (lancAbs > 0 ? 1 : 0)
  const bc         = barCor(perc, isEntrada)

  const realColor = isEntrada
    ? (lancAbs > 0 ? COR.verde : '#94a3b8')
    : (lancAbs === 0 ? '#94a3b8' : (lancAbs <= prev || prev === 0) ? COR.azul : COR.vermelho)
  const realBg = isEntrada
    ? (lancAbs > 0 ? '#f0fdf4' : '#f8faff')
    : (lancAbs === 0 ? '#f8faff' : (lancAbs <= prev || prev === 0) ? '#eff6ff' : '#fff1f2')
  const realBd = isEntrada
    ? (lancAbs > 0 ? '#bbf7d0' : COR.borda)
    : (lancAbs === 0 ? COR.borda : (lancAbs <= prev || prev === 0) ? '#bfdbfe' : '#fecdd3')

  const dispColor = (prev === 0 && lancAbs === 0) ? '#94a3b8'
    : isEntrada ? (disponivel > 0 ? COR.verde : '#94a3b8')
    : (disponivel >= 0 ? COR.verde : COR.vermelho)

  const handleClick = () =>
    onSelect({ uid, nome, descricao, tipo: isEntrada ? 'entrada' : 'saida', prev, realBanc, realCart, realDinheiro, lancamentos })

  return (
    <div style={{ borderBottom: `1px solid ${COR.borda}` }}>
      <div
        onClick={handleClick}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
          cursor: 'pointer',
          background: selecionada ? '#eff6ff' : 'transparent',
          borderLeft: selecionada ? `3px solid ${COR.azul}` : '3px solid transparent',
          transition: 'background .12s',
        }}
      >
        {/* Ícone + nome */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: corIcone, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{icone}</div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: COR.texto,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nome}</span>
            {descricao && (
              <span style={{ fontSize: 10, color: COR.textoSuave,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{descricao}</span>
            )}
          </div>
        </div>

        {/* Previsto */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0,
          padding: '4px 8px', borderRadius: 8, minWidth: 74,
          background: '#f8faff', border: `1px solid ${COR.borda}` }}>
          <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase' as const,
            letterSpacing: .4, marginBottom: 1, color: '#94a3b8' }}>Previsto</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: COR.textoSuave, fontVariantNumeric: 'tabular-nums' }}>
            {prev > 0 ? fmt(prev) : '—'}
          </span>
        </div>

        {/* Realizado */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0,
          padding: '4px 8px', borderRadius: 8, minWidth: 74,
          background: realBg, border: `1px solid ${realBd}` }}>
          <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase' as const,
            letterSpacing: .4, marginBottom: 1, color: realColor }}>Realizado</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: realColor, fontVariantNumeric: 'tabular-nums' }}>
            {lancAbs > 0 ? fmt(lancAbs) : '—'}
          </span>
        </div>

        {/* A receber / Disponível */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0,
          padding: '4px 8px', borderRadius: 8, minWidth: 74 }}>
          <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase' as const,
            letterSpacing: .4, marginBottom: 1, color: dispColor }}>
            {isEntrada ? 'A receber' : 'Disponível'}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: dispColor, fontVariantNumeric: 'tabular-nums' }}>
            {(prev === 0 && lancAbs === 0) ? '—' : fmt(disponivel)}
          </span>
        </div>

        <div style={{ flexShrink: 0, fontSize: 12, color: '#cbd5e1', width: 14, textAlign: 'center' }}>›</div>
      </div>

      {/* Barra de progresso */}
      {(prev > 0 || lancAbs > 0) && (
        <div style={{ padding: '0 12px 5px', paddingLeft: 15 }}>
          <div style={{ background: '#e9edf2', borderRadius: 99, height: 3, overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(perc * 100, 100)}%`, height: 3, borderRadius: 99,
              background: bc, transition: 'width .3s' }} />
          </div>
        </div>
      )}
    </div>
  )
}
