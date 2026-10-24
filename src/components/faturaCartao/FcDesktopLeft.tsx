import React from 'react'
import type { Categoria } from '../../context/AppContext'
import { iconeCategoria, buscarCategoria } from '../../utils/categoriaIcone'
import {
  COR, NOMES_MESES, fmt, diaSemanaLongo, lancLabel, compararNaFatura,
  type Lancamento, type DadosMes,
} from './FcShared'
import { grupoDoLanc } from './fcRotulo'
import { IconeCat } from '../IconeCat'

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

      {/* Por data da compra, a mais recente no topo, agrupada por dia (sem acordeão:
          tudo à vista para conferir contra a fatura do banco). */}
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

          itens.sort(compararNaFatura)
          // Agrupadas por DIA DA COMPRA, como os dias do Banco (24/10/2026, pedido do
          // Guilherme): título "dd/mm semana" com o total do dia e um card com borda.
          const grupos: Array<{ dc: number; mc: number; ac: number; itens: typeof itens }> = []
          for (const it of itens) {
            const g = grupos[grupos.length - 1]
            if (g && g.dc === it.dc && g.mc === it.mc && g.ac === it.ac) g.itens.push(it)
            else grupos.push({ dc: it.dc, mc: it.mc, ac: it.ac, itens: [it] })
          }

          return grupos.map(g => {
            const totalDia = g.itens.reduce((a, { l }) => a + (l.tipo === 'entrada' ? l.valor : -l.valor), 0)
            return (
            <section key={`${g.ac}-${g.mc}-${g.dc}`} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px 8px' }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: COR.texto, fontVariantNumeric: 'tabular-nums' }}>
                  {String(g.dc).padStart(2, '0')}/{String(g.mc + 1).padStart(2, '0')}{g.ac !== purchaseAno ? `/${g.ac}` : ''}
                </span>
                <span style={{ fontSize: 15, fontWeight: 500, color: COR.textoSuave, flex: 1 }}>
                  {diaSemanaLongo(g.dc, g.mc, g.ac)}
                </span>
                <span style={{ fontSize: 13, color: COR.textoSuave, fontVariantNumeric: 'tabular-nums' }}>
                  total <b style={{ color: COR.texto }}>{fmt(totalDia)}</b>
                </span>
              </div>
            <div style={{ background: COR.branco, borderRadius: 16,
              border: '2px solid #93c5fd', overflow: 'hidden' }}>
            {g.itens.map(({ dia, dc, mc, ac, l }, idx) => {
              const catVisual = iconeCategoria(categorias, l.categoria)
              const emEdicao  = editandoId === l.id
              // O acordeao antigo separava as compras posteriores ao fechamento com um
              // divisor. Numa lista unica por data isso nao cabe, entao a
              // informacao vira marcador na propria linha — ela nao podia se perder.
              const posFechamento = ac > purchaseAno
                || (ac === purchaseAno && mc > purchaseMes)
                || (ac === purchaseAno && mc === purchaseMes && dc >= diaFechamento)
              return (
                <div key={l.id}
                  onClick={() => { editarLancamento(dia, l); setDiaSel(dia) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                    padding: '10px 14px',
                    background: emEdicao ? '#eff6ff' : COR.branco,
                    borderBottom: idx < g.itens.length - 1 ? `1px solid ${COR.borda}` : 'none',
                    borderLeft: emEdicao ? `3px solid ${COR.azul}` : '3px solid transparent',
                  }}
                  onMouseEnter={e => { if (!emEdicao) e.currentTarget.style.background = '#fafbff' }}
                  onMouseLeave={e => { if (!emEdicao) e.currentTarget.style.background = COR.branco }}>

                  <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: 16, background: catVisual.cor }}>
                    <IconeCat icone={catVisual.icone} cor="#fff" />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: COR.texto, whiteSpace: 'nowrap',
                      overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {/* Grupo antes do nome, em cinza: "Casa · Mercado". */}
                      {grupoDoLanc(l, categorias) && (
                        <span style={{ fontWeight: 500, color: COR.textoSuave }}>{grupoDoLanc(l, categorias)} · </span>
                      )}
                      {lancLabel(l)}
                    </div>
                    {l.descricao && l.descricao !== l.categoria && (
                      <div style={{ fontSize: 11, color: COR.textoSuave, marginTop: 1, whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.descricao}</div>
                    )}
                  </div>

                  {posFechamento && (
                    <span title="Compra no dia do fechamento ou depois: entra na próxima fatura"
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

                  {/* A parcela sobrevive a categoria ser inativada — a compra
                      ja aconteceu e a divida continua. Mas sem esta marca ela
                      reaparece todo mes numa categoria que o usuario acredita
                      ter removido. Cinza, nao ambar: nao ha nada de errado
                      aqui, so algo a explicar. Medido: #475569 sobre #f1f5f9
                      da 6,92:1; COR.textoSuave daria 4,34:1 e reprovaria. */}
                  {buscarCategoria(categorias, l.categoria)?.ativa === false && (
                    <span title="A categoria foi inativada. Esta parcela continua valendo."
                      style={{ fontSize: 10, padding: '3px 7px', borderRadius: 6, fontWeight: 700,
                        flexShrink: 0, background: '#f1f5f9', color: '#475569' }}>
                      categoria inativa
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
            </section>
            )
          })
        })()}
      </div>

      {/* Footer: total da fatura */}
      <div style={{ flexShrink: 0, padding: '0 12px 12px' }}>
        <div style={{ background: totalFatura < 0 ? 'linear-gradient(135deg,#7f1d1d,#dc2626)' : `var(--cx-azul)`, borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            {/* O mês da fatura é o do VENCIMENTO, como o seletor do topo (o
                rodapé dizia o mês das compras; 22/10/2026). Branco, um ponto
                maior, pedido do Guilherme. */}
            <div style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>
              Total lançado no Compass — {NOMES_MESES[mesVenc]} {anoVenc}
            </div>
            <div style={{ fontSize: 10, color: '#fff', marginTop: 1 }}>
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
