import { useMemo } from 'react'
import type { Conta } from '../../context/AppContext'
import { COR } from '../../utils/cores'
import type { SerieDoPlano } from '../../utils/simulacaoCompra'
import type { Deps } from '../../utils/saldoConta'
import {
  agruparPorItem, avaliarSalva, melhorOferta, type CompraSalva,
} from '../../utils/simulacoesDeCompra'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * As compras salvas, agrupadas pelo item: a mesma bicicleta em três lojas vira
 * uma comparação (pedido do Guilherme em 15/10/2026). Cada linha é julgada de
 * novo contra o plano de hoje (`avaliarSalva`).
 *
 * Página clara, cartão branco: texto `COR.texto`, verde `#15803d` (5,02) e
 * vermelho `#b91c1c` (6,47) no branco.
 */
export default function SimSalvas({ sims, serie, contas, planos, hoje, isMobile, abertaId, onAbrir, onExcluir }: {
  sims: CompraSalva[]
  serie: SerieDoPlano | null
  contas: Conta[]
  planos: Deps['planos']
  hoje: Date
  isMobile: boolean
  abertaId: string | null
  onAbrir: (s: CompraSalva) => void
  onExcluir: (s: CompraSalva) => void
}) {
  const grupos = useMemo(() => agruparPorItem(sims).map(g => {
    const avaliadas = g.sims.map(s => ({ id: s.id, s, av: serie ? avaliarSalva(s, serie, contas, planos, hoje) : null }))
    return { ...g, avaliadas, melhor: melhorOferta(avaliadas) }
  }), [sims, serie, contas, planos, hoje])

  if (sims.length === 0) return null
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ fontSize: 17, fontWeight: 800, color: COR.texto, marginBottom: 4 }}>
        <i aria-hidden className="ti ti-bookmark" style={{ fontSize: 18, verticalAlign: '-2px', marginRight: 6, color: COR.azul }} />
        Simulações salvas
      </div>
      <div style={{ fontSize: 13, color: COR.textoSuave, marginBottom: 12, lineHeight: 1.5 }}>
        A mesma compra em lojas diferentes fica junta para comparar. Tudo é
        conferido de novo com o seu planejamento de hoje.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {grupos.map(g => (
          <div key={g.chave} style={{ background: COR.branco, border: `1px solid ${COR.borda}`, borderRadius: 14, padding: isMobile ? '14px 14px' : '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: COR.texto }}>{g.nome}</span>
              {g.sims.length > 1 && (
                <span style={{ fontSize: 12.5, color: COR.textoSuave }}>comparando {g.sims.length} {g.sims.length === 1 ? 'loja' : 'lojas'}</span>
              )}
            </div>
            {!isMobile && (
              <div style={{ ...grade, fontSize: 11.5, fontWeight: 700, color: COR.textoSuave, textTransform: 'uppercase', letterSpacing: '.4px', paddingBottom: 6, borderBottom: `1px solid ${COR.bordaSuave}` }}>
                <span>Loja</span><span>À vista</span><span>Melhor forma</span><span>Total</span><span>Cabe?</span><span />
              </div>
            )}
            {g.avaliadas.map(({ s, av }) => {
              const m = av?.melhor
              const ehMelhor = g.melhor === s.id
              const forma = !m ? '—'
                : av!.mensal ? `${fmt(m.valorParcela)}/mês · ${m.parcelas} ${m.parcelas === 1 ? 'mês' : 'meses'}`
                : m.parcelas === 1 ? 'À vista' : `${m.parcelas}× de ${fmt(m.valorParcela)}`
              const cabe = !m ? null : m.cabe
              const loja = (
                <span style={{ fontWeight: 700, color: COR.texto }}>
                  {s.fornecedor || 'Sem loja'}
                  {ehMelhor && <span style={pilulaMelhor}>Melhor oferta</span>}
                  {s.integrado_planejamento && <span style={pilulaPlano}>No planejamento</span>}
                  {abertaId === s.id && <span style={pilulaPlano}>Aberta</span>}
                </span>
              )
              const cabeEl = cabe === null ? <span style={{ color: COR.textoSuave }}>—</span>
                : <span style={{ color: cabe ? '#15803d' : '#b91c1c', fontWeight: 700 }}>{cabe ? '✓ Cabe' : '✕ Não cabe'}</span>
              const acoes = (
                <span style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button onClick={() => onAbrir(s)} style={botao}>Abrir</button>
                  <button onClick={() => onExcluir(s)} aria-label={`Excluir ${s.nome} ${s.fornecedor ?? ''}`} style={{ ...botao, padding: '6px 9px' }}>
                    <i aria-hidden className="ti ti-trash" style={{ fontSize: 14, verticalAlign: '-2px' }} />
                  </button>
                </span>
              )
              if (isMobile) return (
                <div key={s.id} style={{ padding: '10px 0', borderTop: `1px solid ${COR.bordaSuave}`, fontSize: 14 }}>
                  <div>{loja}</div>
                  <div style={{ color: COR.textoSuave, marginTop: 4, fontSize: 13.5 }}>
                    {av?.aVista != null && <>À vista {fmt(av.aVista)} · </>}{forma}{m && m.parcelas > 1 && <> · total {fmt(m.total)}</>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                    {cabeEl}{acoes}
                  </div>
                </div>
              )
              return (
                <div key={s.id} style={{ ...grade, padding: '10px 0', borderBottom: `1px solid ${COR.bordaSuave}`, fontSize: 13.5, color: COR.texto }}>
                  {loja}
                  <span>{av?.aVista != null ? fmt(av.aVista) : '—'}</span>
                  <span>{forma}</span>
                  <span style={{ fontWeight: 700 }}>{m ? fmt(m.total) : '—'}</span>
                  {cabeEl}
                  {acoes}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

const grade: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.4fr 1fr .9fr auto', gap: 10, alignItems: 'center',
}
const botao: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 8, border: `1px solid ${COR.borda}`, background: COR.branco,
  color: COR.texto, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
}
const pilulaMelhor: React.CSSProperties = {
  marginLeft: 8, fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
  background: '#f0fdf4', color: '#14532d', verticalAlign: '1px',
}
const pilulaPlano: React.CSSProperties = {
  marginLeft: 6, fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 6,
  background: '#eff6ff', color: '#1e3a8a', verticalAlign: '1px',
}
