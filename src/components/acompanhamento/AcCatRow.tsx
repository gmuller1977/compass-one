import { useState } from 'react'
import type { Categoria } from '../../context/AppContext'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { COR, fmt, barCor } from './AcShared'

export interface AcCatRowProps {
  nome: string
  descricao?: string
  prev: number
  realBanc: number
  realCart: number
  realDinheiro: number
  lancamentos: import('./AcShared').Lanc[]
  isEntrada?: boolean
  categorias: Categoria[]
}

export default function AcCatRow({
  nome, descricao, prev, realBanc, realCart, realDinheiro, lancamentos,
  isEntrada, categorias,
}: AcCatRowProps) {
  const [aberto, setAberto] = useState(false)
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

  return (
    <div style={{ borderBottom: `1px solid ${COR.borda}` }}>
      <div
        onClick={() => setAberto(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
          cursor: 'pointer',
          background: aberto ? '#eff6ff' : 'transparent',
          borderLeft: aberto ? `3px solid ${COR.azul}` : '3px solid transparent',
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

        <div style={{ flexShrink: 0, fontSize: 12, color: '#cbd5e1', width: 14, textAlign: 'center',
          transition: 'transform .2s', transform: aberto ? 'rotate(90deg)' : 'none' }}>›</div>
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

      {/* Acordeon de lançamentos */}
      {aberto && (() => {
        const banco    = lancamentos.filter(l => l.fonte === 'banco')
        const cartao   = lancamentos.filter(l => l.fonte === 'cartao')
        const dinheiro = lancamentos.filter(l => l.fonte === 'dinheiro')
        const grupos = [
          { label: '🏦 Banco',    itens: banco    },
          { label: '💳 Cartão',   itens: cartao   },
          { label: '💵 Dinheiro', itens: dinheiro },
        ].filter(g => g.itens.length > 0)

        if (grupos.length === 0) {
          return (
            <div style={{ padding: '8px 15px 10px', color: COR.textoSuave, fontSize: 12 }}>
              Nenhum lançamento neste mês
            </div>
          )
        }

        return (
          <div style={{ background: '#f8faff', borderTop: `1px solid ${COR.borda}` }}>
            {grupos.map(g => (
              <div key={g.label}>
                <div style={{ padding: '6px 15px 4px', fontSize: 10, fontWeight: 700,
                  color: COR.textoSuave, textTransform: 'uppercase', letterSpacing: .5 }}>
                  {g.label}
                </div>
                {g.itens.map((l, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8,
                    padding: '4px 15px', borderTop: i === 0 ? 'none' : `1px solid ${COR.borda}` }}>
                    <span style={{ fontSize: 11, color: COR.textoSuave, flexShrink: 0, minWidth: 40 }}>
                      dia {String(l.dia).padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: 12, color: COR.texto, flex: 1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {l.descricao || nome}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, flexShrink: 0,
                      color: isEntrada ? COR.verde : COR.texto,
                      fontVariantNumeric: 'tabular-nums' }}>
                      {fmt(l.valor)}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )
      })()}
    </div>
  )
}
