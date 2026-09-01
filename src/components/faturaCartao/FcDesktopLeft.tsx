import React from 'react'
import type { Categoria } from '../../context/AppContext'
import { iconeCategoria } from '../../utils/categoriaIcone'
import {
  COR, NOMES_MESES, fmt, diaSemana, lancLabel, ordemLancamento,
  type Lancamento, type DadosMes,
} from './FcShared'

type Props = {
  mesDados: DadosMes
  totalDias: number
  purchaseMes: number
  purchaseAno: number
  totalFatura: number
  diaFechamento: number
  diaVencimento: number
  mesVenc: number
  anoVenc: number
  editandoId: string | null
  categorias: Categoria[]
  editarLancamento: (dia: number, l: Lancamento) => void
  excluir: (dia: number, id: string) => void
  setDiaSel: React.Dispatch<React.SetStateAction<number>>
}

export default function FcDesktopLeft({
  mesDados, totalDias, purchaseMes, purchaseAno,
  totalFatura, diaFechamento, diaVencimento, mesVenc, anoVenc,
  editandoId, categorias,
  editarLancamento, excluir, setDiaSel,
}: Props) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Lista plana, na ordem em que foi digitada. Antes era um acordeão por
          dia de compra: conferir contra a fatura do banco exigia abrir grupo a
          grupo e a data não aparecia ao lado do lançamento. */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px' }}>
        {(() => {
          const itens: Array<{ dia: number; dc: number; mc: number; ac: number; l: Lancamento }> = []
          for (let d = 1; d <= totalDias; d++) {
            for (const l of (mesDados.lancamentos[d] ?? [])) {
              itens.push({
                dia: d,
                dc: l.diaCompra ?? d,
                mc: l.mesCompra ?? purchaseMes,
                ac: l.anoCompra ?? purchaseAno,
                l,
              })
            }
          }

          if (itens.length === 0) {
            return (
              <div style={{ textAlign: 'center', color: COR.textoSuave, padding: 40, fontSize: 13 }}>
                Nenhum lançamento nesta fatura.
              </div>
            )
          }

          itens.sort((a, b) => ordemLancamento(a.l.id) - ordemLancamento(b.l.id))

          return (
            <div style={{ background: COR.branco, borderRadius: 12,
              border: `1.5px solid ${COR.borda}`, overflow: 'hidden' }}>
            {itens.map(({ dia, dc, mc, ac, l }, idx) => {
              const catVisual = iconeCategoria(categorias, l.categoria)
              const emEdicao  = editandoId === l.id
              const outroMes  = mc !== purchaseMes || ac !== purchaseAno
              // O acordeao antigo separava as compras posteriores ao fechamento com um
              // divisor. Numa lista por ordem de digitacao isso nao cabe, entao a
              // informacao vira marcador na propria linha — ela nao podia se perder.
              const posFechamento = ac > purchaseAno
                || (ac === purchaseAno && mc > purchaseMes)
                || (ac === purchaseAno && mc === purchaseMes && dc > diaFechamento)
              return (
                <div key={l.id}
                  onClick={() => { editarLancamento(dia, l); setDiaSel(dia) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                    padding: '10px 14px',
                    background: emEdicao ? '#eff6ff' : COR.branco,
                    borderBottom: idx < itens.length - 1 ? `1px solid ${COR.borda}` : 'none',
                    borderLeft: emEdicao ? `3px solid ${COR.azul}` : '3px solid transparent',
                  }}
                  onMouseEnter={e => { if (!emEdicao) e.currentTarget.style.background = '#fafbff' }}
                  onMouseLeave={e => { if (!emEdicao) e.currentTarget.style.background = COR.branco }}>

                  {/* Data primeiro: é por ela que se confere contra a fatura do banco */}
                  <div style={{ minWidth: 46, flexShrink: 0, textAlign: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1, color: COR.texto,
                      fontVariantNumeric: 'tabular-nums' }}>{String(dc).padStart(2, '0')}/{String(mc + 1).padStart(2, '0')}</div>
                    <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase',
                      letterSpacing: .3, marginTop: 2 }}>
                      {outroMes ? (ac !== purchaseAno ? ac : NOMES_MESES[mc].slice(0, 3)) : diaSemana(dc, mc, ac)}
                    </div>
                  </div>

                  <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: 16, background: catVisual.cor }}>
                    {catVisual.icone}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: COR.texto, whiteSpace: 'nowrap',
                      overflow: 'hidden', textOverflow: 'ellipsis' }}>{lancLabel(l)}</div>
                    {l.descricao && l.descricao !== l.categoria && (
                      <div style={{ fontSize: 11, color: COR.textoSuave, marginTop: 1, whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.descricao}</div>
                    )}
                  </div>

                  {posFechamento && (
                    <span title="Compra após o fechamento: entra na próxima fatura"
                      style={{ fontSize: 10, padding: '3px 7px', borderRadius: 6, fontWeight: 700,
                        flexShrink: 0, background: COR.avisoFundo, color: COR.avisoTexto }}>
                      próxima
                    </span>
                  )}

                  {l.parcelas && l.parcelas > 1 && (
                    <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 700,
                      flexShrink: 0, background: '#ede9fe', color: '#7c3aed' }}>
                      {l.parcelaAtual}&nbsp;de&nbsp;{l.parcelas}
                    </span>
                  )}

                  <div style={{ fontSize: 14, fontWeight: 700, flexShrink: 0,
                    fontVariantNumeric: 'tabular-nums',
                    color: l.tipo === 'entrada' ? COR.azul : COR.vermelho }}>
                    {l.tipo === 'entrada' ? '+' : '-'}{fmt(l.valor)}
                  </div>

                  <button
                    onClick={e => { e.stopPropagation(); excluir(dia, l.id) }}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#cbd5e1',
                      fontSize: 14, padding: '2px 5px', borderRadius: 6, flexShrink: 0 }}
                    onMouseEnter={e => (e.currentTarget.style.color = COR.vermelho)}
                    onMouseLeave={e => (e.currentTarget.style.color = '#cbd5e1')}>✕</button>
                </div>
              )
            })}
            </div>
          )
        })()}
      </div>

      {/* Footer: total da fatura */}
      <div style={{ flexShrink: 0, padding: '0 12px 12px' }}>
        <div style={{ background: totalFatura < 0 ? 'linear-gradient(135deg,#7f1d1d,#dc2626)' : `linear-gradient(135deg,#0f2878,#1e40af)`, borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.6)' }}>
              Total da fatura — {NOMES_MESES[purchaseMes]} {purchaseAno}
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', marginTop: 1 }}>
              Vence dia {diaVencimento} de {NOMES_MESES[mesVenc]} {anoVenc}
            </div>
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' as const }}>
            {fmt(totalFatura)}
          </span>
        </div>
      </div>

    </div>
  )
}
