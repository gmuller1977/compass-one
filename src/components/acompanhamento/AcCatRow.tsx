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

  const perc    = prev > 0 ? lancAbs / prev : (lancAbs > 0 ? 1 : 0)
  const percPct = Math.round(Math.min(perc, 1) * 100)
  const barCor  = isEntrada
    ? (perc >= 1 ? COR.verde : perc >= 0.8 ? COR.amarelo : '#94a3b8')
    : (perc > 1 ? COR.vermelho : perc >= 0.9 ? COR.amarelo : COR.verde)

  const cols = [
    {
      label: 'Previsto',
      value: prev > 0 ? fmt(prev) : '—',
      cor: prev > 0 ? '#64748b' : '#d1d5db',
    },
    {
      label: 'Realizado',
      value: lancAbs > 0 ? fmt(lancAbs) : '—',
      cor: realColor,
    },
    {
      label: isEntrada ? 'A receber' : 'Disponível',
      value: (prev === 0 && lancAbs === 0) ? '—' : fmt(disponivel),
      cor: dispColor,
    },
  ]

  return (
    <div style={{ borderBottom: `1px solid #f1f5f9` }}>
      {/* Linha principal — mesmo padrão exato do cabeçalho dos dias do banco */}
      <div
        onClick={() => setAberto(v => !v)}
        style={{
          display: 'flex', alignItems: 'stretch', cursor: 'pointer',
          background: aberto ? '#eff6ff' : '#fafbff',
          borderLeft: aberto ? `3px solid ${COR.azul}` : '3px solid transparent',
          minHeight: 54,
        }}
      >
        {/* Ícone + nome — mesma estrutura da coluna de data no banco */}
        <div style={{
          width: 200, flexShrink: 0,
          padding: '11px 13px',
          borderRight: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', gap: 8,
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
              <div style={{ fontSize: 10, color: COR.textoSuave,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {descricao}
              </div>
            )}
          </div>
        </div>

        {/* Grid de colunas — mesmo flex:1 + grid 1fr do banco */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 88px' }}>
          {cols.map(col => (
            <div key={col.label} style={{ padding: '10px 12px', textAlign: 'right', borderRight: '1px solid #f8faff' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: .4, marginBottom: 3 }}>
                {col.label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: col.cor, fontVariantNumeric: 'tabular-nums' }}>
                {col.value}
              </div>
            </div>
          ))}

          {/* Coluna de progresso */}
          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: .4, textAlign: 'right' }}>
              {(prev === 0 && lancAbs === 0) ? '—' : `${percPct}%`}
            </div>
            <div style={{ background: '#e9edf2', borderRadius: 99, height: 4, overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(perc * 100, 100)}%`,
                height: 4, borderRadius: 99,
                background: (prev === 0 && lancAbs === 0) ? '#e9edf2' : barCor,
                transition: 'width .3s',
              }} />
            </div>
          </div>
        </div>

        {/* Seta — mesma largura do botão ＋ do banco */}
        <div style={{
          width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, fontSize: 13, color: '#cbd5e1',
          transition: 'transform .2s', transform: aberto ? 'rotate(90deg)' : 'none',
        }}>›</div>
      </div>

      {/* Acordeon — 3 colunas: Banco | Cartão | Dinheiro */}
      {aberto && (() => {
        const colunas = [
          { label: '🏦 Banco',    itens: lancamentos.filter(l => l.fonte === 'banco')    },
          { label: '💳 Cartão',   itens: lancamentos.filter(l => l.fonte === 'cartao')   },
          { label: '💵 Dinheiro', itens: lancamentos.filter(l => l.fonte === 'dinheiro') },
        ]
        const temAlgum = colunas.some(c => c.itens.length > 0)

        if (!temAlgum) {
          return (
            <div style={{ padding: '10px 16px', color: COR.textoSuave, fontSize: 12,
              background: '#f8faff', borderTop: `1px solid #f1f5f9` }}>
              Nenhum lançamento neste mês
            </div>
          )
        }

        return (
          <div style={{
            background: '#f8faff', borderTop: `1px solid #f1f5f9`,
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          }}>
            {colunas.map((col, ci) => (
              <div key={col.label} style={{
                borderRight: ci < 2 ? `1px solid #f1f5f9` : 'none',
              }}>
                {/* Cabeçalho da coluna */}
                <div style={{
                  padding: '7px 12px 5px',
                  fontSize: 9, fontWeight: 700, color: '#94a3b8',
                  textTransform: 'uppercase' as const, letterSpacing: .5,
                  borderBottom: `1px solid #f1f5f9`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span>{col.label}</span>
                  {col.itens.length > 0 && (
                    <span style={{ fontWeight: 700, color: isEntrada ? COR.verde : COR.azul }}>
                      {fmt(col.itens.reduce((s, l) => s + l.valor, 0))}
                    </span>
                  )}
                </div>

                {/* Lançamentos */}
                {col.itens.length === 0 ? (
                  <div style={{ padding: '8px 12px', fontSize: 11, color: '#d1d5db' }}>—</div>
                ) : col.itens.map((l, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 12px',
                    borderTop: i === 0 ? 'none' : `1px solid #f1f5f9`,
                  }}>
                    <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>
                      {String(l.dia).padStart(2, '0')}
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
