import { useState } from 'react'
import type { Categoria } from '../../context/AppContext'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { COR, fmt } from './AcShared'

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

  const dispColor = (prev === 0 && lancAbs === 0) ? '#d1d5db'
    : isEntrada ? (disponivel > 0 ? COR.verde : '#d1d5db')
    : (disponivel >= 0 ? COR.verde : COR.vermelho)

  const realColor = isEntrada
    ? (lancAbs > 0 ? COR.azul : '#d1d5db')
    : (lancAbs === 0 ? '#d1d5db' : (lancAbs <= prev || prev === 0) ? COR.azul : COR.vermelho)

  return (
    <div style={{ borderBottom: `1px solid #f1f5f9` }}>
      {/* Linha principal — mesmo padrão das linhas de dia do banco */}
      <div
        onClick={() => setAberto(v => !v)}
        style={{
          display: 'flex', alignItems: 'stretch', cursor: 'pointer',
          background: aberto ? '#f8faff' : COR.branco,
          borderLeft: aberto ? `3px solid ${COR.azul}` : '3px solid transparent',
          transition: 'background .1s',
          minHeight: 52,
        }}
      >
        {/* Ícone + nome */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 12px 10px 10px',
          flex: 1, minWidth: 0,
          borderRight: '1px solid #f1f5f9',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7, background: corIcone, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
          }}>{icone}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 12, fontWeight: 600, color: COR.texto,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{nome}</div>
            {descricao && (
              <div style={{ fontSize: 10, color: COR.textoSuave }}>{descricao}</div>
            )}
          </div>
        </div>

        {/* Previsto */}
        <div style={{ padding: '10px 12px', textAlign: 'right', borderRight: '1px solid #f1f5f9', minWidth: 80 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: .4, marginBottom: 3 }}>
            Previsto
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
            {prev > 0 ? fmt(prev) : '—'}
          </div>
        </div>

        {/* Realizado */}
        <div style={{ padding: '10px 12px', textAlign: 'right', borderRight: '1px solid #f1f5f9', minWidth: 90 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: .4, marginBottom: 3 }}>
            Realizado
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: realColor, fontVariantNumeric: 'tabular-nums' }}>
            {lancAbs > 0 ? fmt(lancAbs) : '—'}
          </div>
        </div>

        {/* A receber / Disponível */}
        <div style={{ padding: '10px 12px', textAlign: 'right', borderRight: '1px solid #f1f5f9', minWidth: 90 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: .4, marginBottom: 3 }}>
            {isEntrada ? 'A receber' : 'Disponível'}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: dispColor, fontVariantNumeric: 'tabular-nums' }}>
            {(prev === 0 && lancAbs === 0) ? '—' : fmt(disponivel)}
          </div>
        </div>

        {/* Seta */}
        <div style={{
          width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, fontSize: 13, color: '#cbd5e1',
          transition: 'transform .2s', transform: aberto ? 'rotate(90deg)' : 'none',
        }}>›</div>
      </div>

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
            <div style={{ padding: '8px 15px 10px', color: COR.textoSuave, fontSize: 12,
              background: '#f8faff', borderTop: `1px solid #f1f5f9` }}>
              Nenhum lançamento neste mês
            </div>
          )
        }

        return (
          <div style={{ background: '#f8faff', borderTop: `1px solid #f1f5f9` }}>
            {grupos.map(g => (
              <div key={g.label}>
                <div style={{ padding: '5px 15px 3px', fontSize: 9, fontWeight: 700,
                  color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: .5 }}>
                  {g.label}
                </div>
                {g.itens.map((l, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '5px 15px',
                    borderTop: i === 0 ? 'none' : `1px solid #f1f5f9`,
                  }}>
                    <span style={{ fontSize: 10, color: COR.textoSuave, flexShrink: 0, minWidth: 36 }}>
                      dia {String(l.dia).padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: 11, color: COR.texto, flex: 1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {l.descricao || nome}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, flexShrink: 0,
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
