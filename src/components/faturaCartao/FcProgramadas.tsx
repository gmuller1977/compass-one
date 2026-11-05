import { useState } from 'react'
import type { Categoria } from '../../context/AppContext'
import { COR, fmt, lancLabel, type Lancamento } from './FcShared'
import { fixaOuVariavel } from '../../utils/fixaNoCartao'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { IconeRedondo } from '../mobile/ui'

/**
 * Etiqueta "Fixa" / "Variável" em cada compra da fatura (05/11/2026, pedido do
 * Guilherme), pelo cadastro da categoria; sem cadastro, nada.
 * Medido: #1e3a8a no #dbeafe 9,0; #475569 no #f1f5f9 6,9.
 */
export function EtiquetaTipo({ l, categorias }: { l: Lancamento; categorias: Categoria[] }) {
  const tipo = fixaOuVariavel(l, categorias)
  if (!tipo) return null
  const fixa = tipo === 'Fixa'
  return (
    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, fontWeight: 700, flexShrink: 0,
      whiteSpace: 'nowrap', background: fixa ? '#dbeafe' : '#f1f5f9', color: fixa ? '#1e3a8a' : '#475569' }}>
      {tipo}
    </span>
  )
}

/**
 * "Lançamentos fixos programados": as fixas lançadas sozinhas cuja data da
 * compra ainda não chegou. Fora do total da fatura; acordeão fechado, no
 * desenho do "Lançamentos futuros" do Banco. Tocar abre a compra para editar.
 */
export function BlocoProgramadas({ programadas, categorias, onAbrir }: {
  programadas: { dia: number; l: Lancamento }[]
  categorias: Categoria[]
  onAbrir: (dia: number, l: Lancamento) => void
}) {
  const [aberto, setAberto] = useState(false)
  if (programadas.length === 0) return null
  const total = programadas.reduce((a, { l }) => a + (l.tipo === 'entrada' ? l.valor : -l.valor), 0)
  const n = programadas.length
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
      <button type="button" onClick={() => setAberto(v => !v)} aria-expanded={aberto} style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 48, padding: '0 14px',
        border: `2px solid ${COR.azul}`, borderRadius: 14, background: '#dbeafe',
        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
      }}>
        <span aria-hidden style={{ width: 24, height: 24, borderRadius: '50%', background: COR.azul, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
          <i className="ti ti-clock" />
        </span>
        <span style={{ flex: 1, minWidth: 0, padding: '8px 0' }}>
          <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: COR.texto }}>Lançamentos fixos programados</span>
          <span style={{ display: 'block', fontSize: 13, color: '#334155', marginTop: 2 }}>
            {n} {n === 1 ? 'conta' : 'contas'} · {fmt(total)} · entram no total no dia
          </span>
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1a56db', whiteSpace: 'nowrap' }}>
          {aberto ? 'Esconder' : 'Ver'} <span aria-hidden style={{ display: 'inline-block', transform: aberto ? 'rotate(180deg)' : 'none' }}>▾</span>
        </span>
      </button>
      {aberto && (
        <div style={{ background: COR.branco, borderRadius: 16, border: '2px solid #93c5fd', padding: '4px 14px' }}>
          {programadas.map(({ dia, l }, idx) => {
            const cv = iconeCategoria(categorias, l.categoria)
            return (
              <div key={l.id} onClick={() => onAbrir(dia, l)} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', minHeight: 52, cursor: 'pointer',
                borderTop: idx === 0 ? 'none' : '1px solid #eef2f8',
              }}>
                <IconeRedondo icone={cv.icone} cor={cv.cor} tamanho={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: COR.texto, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {lancLabel(l)}
                  </div>
                  <div style={{ fontSize: 12, color: COR.textoSuave, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                    programada para {String(l.diaCompra).padStart(2, '0')}/{String((l.mesCompra ?? 0) + 1).padStart(2, '0')}
                  </div>
                </div>
                <EtiquetaTipo l={l} categorias={categorias} />
                <div style={{ fontSize: 14, fontWeight: 700, color: COR.textoSuave, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(l.valor)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
