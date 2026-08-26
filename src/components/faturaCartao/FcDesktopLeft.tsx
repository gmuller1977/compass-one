import React from 'react'
import type { Categoria } from '../../context/AppContext'
import { iconeCategoria } from '../../utils/categoriaIcone'
import {
  COR, NOMES_MESES, fmt, diaSemana, lancLabel,
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
  diasFechados: Set<string>
  categorias: Categoria[]
  editarLancamento: (dia: number, l: Lancamento) => void
  excluir: (dia: number, id: string) => void
  toggleDia: (dateKey: string) => void
  setDiaSel: React.Dispatch<React.SetStateAction<number>>
}

export default function FcDesktopLeft({
  mesDados, totalDias, purchaseMes, purchaseAno,
  totalFatura, diaFechamento, diaVencimento, mesVenc, anoVenc,
  editandoId, diasFechados, categorias,
  editarLancamento, excluir, toggleDia, setDiaSel,
}: Props) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Lista de lançamentos agrupados por data de compra */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 16px' }}>
        {(() => {
          type DiaGroup = { dateKey: string; dc: number; mc: number; ac: number; items: Array<{ dia: number; l: Lancamento }> }
          const groupMap = new Map<string, DiaGroup>()
          for (let d = 1; d <= totalDias; d++) {
            for (const l of (mesDados.lancamentos[d] ?? [])) {
              const dc = l.diaCompra ?? d
              const mc = l.mesCompra ?? purchaseMes
              const ac = l.anoCompra ?? purchaseAno
              const dateKey = `${ac}-${String(mc + 1).padStart(2, '0')}-${String(dc).padStart(2, '0')}`
              if (!groupMap.has(dateKey)) groupMap.set(dateKey, { dateKey, dc, mc, ac, items: [] })
              groupMap.get(dateKey)!.items.push({ dia: d, l })
            }
          }

          if (groupMap.size === 0) {
            return (
              <div style={{ textAlign: 'center', color: COR.textoSuave, padding: 40, fontSize: 13 }}>
                Nenhum lançamento nesta fatura.
              </div>
            )
          }

          // Decrescente: mais recente primeiro
          const grupos = [...groupMap.values()].sort((a, b) => b.dateKey.localeCompare(a.dateKey))

          const isAfterClosing = (g: DiaGroup) => {
            if (g.ac > purchaseAno) return true
            if (g.ac < purchaseAno) return false
            if (g.mc > purchaseMes) return true
            if (g.mc < purchaseMes) return false
            return g.dc > diaFechamento
          }

          return grupos.map((grupo, gIdx) => {
            const { dateKey, dc, mc, ac, items } = grupo
            const aberto = !diasFechados.has(dateKey)
            const semana = diaSemana(dc, mc, ac)
            const mesAno = (mc !== purchaseMes || ac !== purchaseAno)
              ? `${NOMES_MESES[mc]}${ac !== purchaseAno ? ' ' + ac : ''}`
              : NOMES_MESES[mc]
            const prevGrupo = gIdx > 0 ? grupos[gIdx - 1] : null
            const showFechDiv = prevGrupo !== null && isAfterClosing(prevGrupo) && !isAfterClosing(grupo)

            return [
              showFechDiv ? (
                <div key={`div-${dateKey}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                  <div style={{ flex: 1, height: 1, background: COR.borda }} />
                  <span style={{ fontSize: 10, color: COR.textoSuave, fontWeight: 600, letterSpacing: .3 }}>
                    Período da fatura
                  </span>
                  <div style={{ flex: 1, height: 1, background: COR.borda }} />
                </div>
              ) : null,

              <div key={dateKey}
                style={{ borderRadius: 12, overflow: 'hidden', flexShrink: 0, border: `1.5px solid ${COR.borda}`, background: COR.branco }}>

                <div
                  onClick={() => toggleDia(dateKey)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer', userSelect: 'none', background: '#fafbff', borderBottom: aberto ? `1px solid ${COR.borda}` : 'none' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 32, flexShrink: 0 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, lineHeight: 1, color: COR.texto }}>{String(dc).padStart(2, '0')}</span>
                    <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: .3, marginTop: 1 }}>{semana}</span>
                  </div>
                  <span style={{ fontSize: 12, color: COR.textoSuave, flex: 1 }}>{mesAno}</span>
                  <span style={{ fontSize: 16, color: '#94a3b8', display: 'inline-block', transition: 'transform .2s', transform: aberto ? 'rotate(180deg)' : 'rotate(0deg)' }}>⌄</span>
                </div>

                {aberto && items.map(({ dia, l }) => {
                  const catVisual = iconeCategoria(categorias, l.categoria)
                  const emEdicao = editandoId === l.id
                  return (
                    <div key={l.id}
                      onClick={() => { editarLancamento(dia, l); setDiaSel(dia) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '12px 14px', flexShrink: 0, background: emEdicao ? '#eff6ff' : COR.branco, borderBottom: `1px solid ${COR.borda}`, borderLeft: emEdicao ? `3px solid ${COR.azul}` : '3px solid transparent' }}
                      onMouseEnter={e => { if (!emEdicao) e.currentTarget.style.background = '#fafbff' }}
                      onMouseLeave={e => { if (!emEdicao) e.currentTarget.style.background = COR.branco }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, background: catVisual.cor }}>
                        {catVisual.icone}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: COR.texto, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {lancLabel(l)}
                        </div>
                        {l.descricao && l.descricao !== l.categoria && (
                          <div style={{ fontSize: 11, color: COR.textoSuave, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {l.descricao}
                          </div>
                        )}
                      </div>
                      {l.parcelas && l.parcelas > 1 && (
                        <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 700, flexShrink: 0, background: '#ede9fe', color: '#7c3aed' }}>
                          {l.parcelaAtual}&nbsp;de&nbsp;{l.parcelas}
                        </span>
                      )}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: l.tipo === 'entrada' ? COR.azul : COR.vermelho }}>
                          {l.tipo === 'entrada' ? '+' : '-'}{fmt(l.valor)}
                        </div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); excluir(dia, l.id) }}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#cbd5e1', fontSize: 14, padding: '2px 5px', borderRadius: 6, flexShrink: 0 }}
                        onMouseEnter={e => (e.currentTarget.style.color = COR.vermelho)}
                        onMouseLeave={e => (e.currentTarget.style.color = '#cbd5e1')}>✕</button>
                    </div>
                  )
                })}
              </div>
            ]
          })
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
