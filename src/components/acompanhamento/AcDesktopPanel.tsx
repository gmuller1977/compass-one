import type { Categoria } from '../../context/AppContext'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { COR, fmt, barCor, type CatSel } from './AcShared'

interface Props {
  catSel: CatSel | null
  mes: number
  categorias: Categoria[]
}

export default function AcDesktopPanel({ catSel, mes, categorias }: Props) {
  if (!catSel) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 10, color: COR.textoSuave, background: '#f8faff' }}>
        <div style={{ fontSize: 44, opacity: .35 }}>📊</div>
        <span style={{ fontSize: 15, fontWeight: 600, color: COR.texto }}>Selecione uma categoria</span>
        <span style={{ fontSize: 12 }}>Clique em qualquer linha para ver os lançamentos</span>
      </div>
    )
  }

  const { icone, cor: corIcone } = iconeCategoria(categorias, catSel.nome)
  const isEntrada  = catSel.tipo === 'entrada'
  const lancAbs    = catSel.realBanc + catSel.realCart
  const disponivel = catSel.prev - lancAbs
  const perc       = catSel.prev > 0 ? lancAbs / catSel.prev : (lancAbs > 0 ? 1 : 0)
  const bc         = barCor(perc, isEntrada)

  const corTipo    = isEntrada ? COR.verde : COR.vermelho
  const fundoTipo  = isEntrada ? '#f0fdf4' : '#fff1f2'
  const bordaTipo  = isEntrada ? '#bbf7d0' : '#fecdd3'

  const realColor = isEntrada
    ? (lancAbs > 0 ? COR.verde : '#94a3b8')
    : (lancAbs === 0 ? '#94a3b8' : lancAbs <= catSel.prev || catSel.prev === 0 ? COR.azul : COR.vermelho)
  const realBg = isEntrada
    ? (lancAbs > 0 ? '#f0fdf4' : '#f8faff')
    : (lancAbs === 0 ? '#f8faff' : lancAbs <= catSel.prev || catSel.prev === 0 ? '#eff6ff' : '#fff1f2')
  const realBd = isEntrada
    ? (lancAbs > 0 ? '#bbf7d0' : COR.borda)
    : (lancAbs === 0 ? COR.borda : lancAbs <= catSel.prev || catSel.prev === 0 ? '#bfdbfe' : '#fecdd3')

  const dispColor = catSel.prev === 0 && lancAbs === 0 ? '#94a3b8'
    : isEntrada ? (disponivel > 0 ? COR.verde : '#94a3b8')
    : (disponivel >= 0 ? COR.verde : COR.vermelho)
  const dispBg = catSel.prev === 0 && lancAbs === 0 ? '#f8faff'
    : isEntrada ? (disponivel > 0 ? '#f0fdf4' : '#f8faff')
    : (disponivel >= 0 ? '#f0fdf4' : '#fff1f2')
  const dispBd = catSel.prev === 0 && lancAbs === 0 ? COR.borda
    : isEntrada ? (disponivel > 0 ? '#bbf7d0' : COR.borda)
    : (disponivel >= 0 ? '#bbf7d0' : '#fecdd3')

  const banco    = catSel.lancamentos.filter(l => l.fonte === 'banco')
  const cartao   = catSel.lancamentos.filter(l => l.fonte === 'cartao')
  const dinheiro = catSel.lancamentos.filter(l => l.fonte === 'dinheiro')
  const colunas  = [
    { label: '🏦 Banco',    itens: banco    },
    { label: '💳 Cartão',   itens: cartao   },
    { label: '💵 Dinheiro', itens: dinheiro },
  ].filter(c => c.itens.length > 0)

  const mesStr = String(mes + 1).padStart(2, '0')

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f8faff' }}>

      {/* Header da categoria */}
      <div style={{ flexShrink: 0, padding: '16px 20px 14px', background: COR.branco,
        borderBottom: `1px solid ${COR.borda}`, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: corIcone, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{icone}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: COR.texto,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{catSel.nome}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
              background: fundoTipo, border: `1px solid ${bordaTipo}`, color: corTipo,
              textTransform: 'uppercase', letterSpacing: .5, flexShrink: 0 }}>
              {isEntrada ? '↑ Receita' : '↓ Despesa'}
            </span>
          </div>
          {catSel.descricao && (
            <span style={{ fontSize: 12, color: COR.textoSuave }}>{catSel.descricao}</span>
          )}
        </div>
      </div>

      {/* Números resumo */}
      <div style={{ flexShrink: 0, padding: '14px 20px 12px', background: COR.branco,
        borderBottom: `1px solid ${COR.borda}`, display: 'flex', gap: 10 }}>
        {/* Previsto */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '10px 8px', borderRadius: 10, background: '#f8faff', border: `1px solid ${COR.borda}` }}>
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const,
            letterSpacing: .5, color: '#94a3b8', marginBottom: 4 }}>Previsto</span>
          <span style={{ fontSize: 17, fontWeight: 800, color: COR.textoSuave,
            fontVariantNumeric: 'tabular-nums' }}>
            {catSel.prev > 0 ? fmt(catSel.prev) : '—'}
          </span>
        </div>

        {/* Realizado */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '10px 8px', borderRadius: 10, background: realBg, border: `1px solid ${realBd}` }}>
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const,
            letterSpacing: .5, color: realColor, marginBottom: 4 }}>Realizado</span>
          <span style={{ fontSize: 17, fontWeight: 800, color: realColor,
            fontVariantNumeric: 'tabular-nums' }}>
            {lancAbs > 0 ? fmt(lancAbs) : '—'}
          </span>
          {catSel.realBanc > 0 && catSel.realCart > 0 && (
            <span style={{ fontSize: 10, color: realColor, marginTop: 2 }}>
              🏦 {fmt(catSel.realBanc)} · 💳 {fmt(catSel.realCart)}
            </span>
          )}
        </div>

        {/* Disponível */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '10px 8px', borderRadius: 10, background: dispBg, border: `1px solid ${dispBd}` }}>
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const,
            letterSpacing: .5, color: dispColor, marginBottom: 4 }}>
            {isEntrada ? 'A receber' : 'Disponível'}
          </span>
          <span style={{ fontSize: 17, fontWeight: 800, color: dispColor,
            fontVariantNumeric: 'tabular-nums' }}>
            {catSel.prev === 0 && lancAbs === 0 ? '—' : fmt(disponivel)}
          </span>
        </div>
      </div>

      {/* Barra de progresso */}
      {(catSel.prev > 0 || lancAbs > 0) && (
        <div style={{ flexShrink: 0, padding: '10px 20px 12px', background: COR.branco,
          borderBottom: `1px solid ${COR.borda}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: COR.textoSuave }}>Progresso do mês</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: bc }}>
              {catSel.prev > 0 ? `${Math.round(Math.min(perc, 1) * 100)}%` : '—'}
            </span>
          </div>
          <div style={{ background: '#e9edf2', borderRadius: 99, height: 8, overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(perc * 100, 100)}%`, height: 8, borderRadius: 99,
              background: bc, transition: 'width .4s' }} />
          </div>
        </div>
      )}

      {/* Lançamentos */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 20px' }}>
        {colunas.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: 200, gap: 8, color: COR.textoSuave }}>
            <span style={{ fontSize: 28, opacity: .4 }}>🔍</span>
            <span style={{ fontSize: 13 }}>Nenhum lançamento em {mesStr}/{new Date().getFullYear()}</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(colunas.length, 3)}, 1fr)`, gap: 12 }}>
            {colunas.map(col => (
              <div key={col.label}>
                <div style={{ fontSize: 11, fontWeight: 700, color: COR.textoSuave,
                  textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8,
                  paddingBottom: 6, borderBottom: `1px solid ${COR.borda}` }}>
                  {col.label}
                  <span style={{ marginLeft: 6, fontWeight: 500, color: '#94a3b8' }}>
                    ({col.itens.length})
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {col.itens.map((l, i) => (
                    <div key={i} style={{ padding: '8px 10px', borderRadius: 10,
                      background: COR.branco, border: `1px solid ${COR.borda}`,
                      display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
                        <span style={{ fontSize: 10, color: COR.textoSuave, flexShrink: 0 }}>
                          dia {String(l.dia).padStart(2, '0')}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700,
                          color: isEntrada ? COR.verde : COR.texto,
                          fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                          {fmt(l.valor)}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: COR.texto,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.descricao || catSel.nome}
                      </div>
                      {l.sub && l.sub !== 'automático' && (
                        <div style={{ fontSize: 10, color: COR.textoSuave }}>{l.sub}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
