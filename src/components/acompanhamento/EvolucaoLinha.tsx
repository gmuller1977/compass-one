import { useState } from 'react'
import type { Categoria } from '../../context/AppContext'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { fmt, type Lanc } from './AcShared'
import { RADAR_COR_CLARO as COR, RADAR_TRILHO_BRANCO as TRILHO, faixaRadar, destaqueRadar, ehFixaPaga } from './radarCores'
import { useAbrirAjuste } from './ajustePlanoContexto'

interface EvolucaoLinhaProps {
  nome: string
  descricao?: string
  prev: number
  real: number
  isEntrada: boolean
  categorias: Categoria[]
  lancamentos?: Lanc[]
  totalBanc?: number
  totalCart?: number
  totalDinheiro?: number
  mes: number
  isSubtotal?: boolean
  grupoLabel?: string
}

function calcStatus(isEntrada: boolean, prev: number, real: number) {
  if (isEntrada) {
    if (real === 0) return { texto: '○ A receber', cor: '#b45309', barra: '#fbbf24' }
    if (real >= prev) return { texto: '✓ Recebido', cor: '#16a34a', barra: '#4ade80' }
    return { texto: '◐ Parcial', cor: '#b45309', barra: '#fbbf24' }
  }
  if (real === 0) return { texto: '○ Pendente', cor: '#b45309', barra: '#fbbf24' }
  if (real <= prev) {
    if (real === prev) return { texto: '✓ Pago', cor: '#16a34a', barra: '#4ade80' }
    return { texto: 'Dentro do previsto', cor: '#16a34a', barra: '#4ade80' }
  }
  return { texto: '⚠ Acima do previsto', cor: '#dc2626', barra: '#f87171' }
}

function calcDif(isEntrada: boolean, prev: number, real: number) {
  if (isEntrada) {
    if (real === 0 && prev === 0) return { label: '—', valor: 0, cor: '#cbd5e1', vazio: true }
    if (real === 0) return { label: 'A receber', valor: prev, cor: '#b45309', vazio: false }
    if (real >= prev) return { label: 'Diferença', valor: real - prev, cor: '#16a34a', vazio: false }
    return { label: 'Faltou', valor: prev - real, cor: '#b45309', vazio: false }
  }
  if (real === 0 && prev === 0) return { label: '—', valor: 0, cor: '#cbd5e1', vazio: true }
  if (real === 0) return { label: 'Disponível', valor: prev, cor: '#1a56db', vazio: false }
  if (real <= prev) return { label: 'Disponível', valor: prev - real, cor: '#1a56db', vazio: false }
  return { label: 'Estourou', valor: real - prev, cor: '#dc2626', negativo: true, vazio: false }
}

export default function EvolucaoLinha({
  nome, descricao, prev, real, isEntrada, categorias,
  lancamentos = [], totalBanc = 0, totalCart = 0, totalDinheiro = 0,
  mes, isSubtotal, grupoLabel,
}: EvolucaoLinhaProps) {
  const [aberto, setAberto] = useState(false)
  const abrirAjuste = useAbrirAjuste()
  const { icone } = iconeCategoria(categorias, nome)
  const status = calcStatus(isEntrada, prev, real)
  const dif    = calcDif(isEntrada, prev, real)

  const barraFundo = status.barra
  const perc       = prev > 0 ? real / prev : (real > 0 ? 1 : 0)
  const percClamp  = Math.min(perc, 1)
  const percLabel  = prev > 0 || real > 0 ? `${Math.round(perc * 100)}%` : '—'
  const percCor    = perc === 0 ? '#cbd5e1' : perc > 1 ? '#dc2626' : '#16a34a'
  const barCor     = perc > 1 ? '#f87171' : barraFundo

  // ── Subtotal (sem acordeão) ───────────────────────────────────────────
  if (isSubtotal) {
    const bordaCor = isEntrada ? '#1a56db' : '#dc2626'
    return (
      <div style={{
        padding: '10px 14px', background: '#dbeafe',
        display: 'flex', alignItems: 'center', gap: 8,
        borderTop: '2px solid #93c5fd',
      }}>
        <div style={{ width: 3, height: 32, borderRadius: 2, background: bordaCor, flexShrink: 0 }} />
        <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: '#e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#475569' }}>∑</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Total {grupoLabel}</div>
        </div>
        <div style={{ textAlign: 'right', width: 90, padding: '0 4px', flexShrink: 0 }}>
          <div style={{ fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .3 }}>Previsto</div>
          <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2, color: '#64748b' }}>{prev > 0 ? fmt(prev) : '—'}</div>
        </div>
        <div style={{ textAlign: 'right', width: 90, padding: '0 4px', flexShrink: 0 }}>
          <div style={{ fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .3 }}>Realizado</div>
          <div style={{ fontSize: 12, fontWeight: 800, marginTop: 2, color: '#0f172a' }}>{real !== 0 ? fmt(real) : '—'}</div>
        </div>
        <div style={{ textAlign: 'right', width: 90, padding: '0 4px', flexShrink: 0 }}>
          <div style={{ fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .3 }}>{dif.label}</div>
          <div style={{ fontSize: 12, fontWeight: 800, marginTop: 2, color: dif.vazio ? '#cbd5e1' : dif.cor }}>
            {dif.vazio ? '—' : fmt(dif.valor)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, width: 90, justifyContent: 'flex-end', flexShrink: 0 }}>
          <div style={{ width: 50, height: 6, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 2, width: `${percClamp * 100}%`, background: barCor }} />
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, minWidth: 32, textAlign: 'right', color: percCor }}>{percLabel}</div>
        </div>
      </div>
    )
  }

  // ── Linha de categoria ────────────────────────────────────────────────
  const displayName   = descricao ? `${nome} · ${descricao}` : nome
  const temLancamentos = lancamentos.length > 0

  const banco    = lancamentos.filter(l => l.fonte === 'banco')
  const cartao   = lancamentos.filter(l => l.fonte === 'cartao')
  const dinheiro = lancamentos.filter(l => l.fonte === 'dinheiro')
  const colunas  = [
    { label: '🏦 Banco',    total: totalBanc,     itens: banco    },
    { label: '💳 Cartão',   total: totalCart,     itens: cartao   },
    { label: '💵 Dinheiro', total: totalDinheiro, itens: dinheiro },
  ].filter(c => c.itens.length > 0)

  // Categoria MÃE: os lançamentos das variantes somam nela e cada um guarda a
  // variante (utils/categoriaMae). Aberta, ela mostra quanto foi de cada uma.
  const porVariante = (() => {
    if (!lancamentos.some(l => l.variante)) return []
    const m = new Map<string, number>()
    for (const l of lancamentos) m.set(l.variante ?? '', (m.get(l.variante ?? '') ?? 0) + l.valor)
    return [...m.entries()].sort((a, b) => (a[0] ? 0 : 1) - (b[0] ? 0 : 1) || b[1] - a[1])
  })()

  // O MESMO modelo do cabeçalho do grupo, um degrau menor: números em 14px
  // (os do grupo são 16), barra de 16px de espessura (a do grupo é 20) e os
  // mesmos 200px de comprimento. Com o mesmo recuo à direita — o espaço do
  // chevron, o mesmo gap e 15px de padding, que com a borda de 1px do
  // contêiner dá os 16px do cabeçalho —, as barras das categorias ficam
  // exatamente embaixo da barra do grupo.
  //
  // O fundo é BRANCO, então vale a paleta escura: ver radarCores.
  //
  // Fixa paga no valor EXATO é "feito", não "chegando no limite": pela regra
  // do grupo, 100% numa despesa é amarelo, e AABB 120 de 120 apareceria como
  // alerta.
  const noValorExato = prev > 0 && Math.abs(real - prev) < 0.005
  const semDados = prev <= 0 && real === 0
  const percArred = Math.round(perc * 100) / 100

  // Conta FIXA de despesa paga até o previsto é verde e "✓ Pago" — decidido
  // pelo Guilherme em 26/09/2026. Pela regra das faixas, 99–100% é amarelo
  // ("chegando no limite"), e o financiamento de 1.149,72 de 1.150 aparecia
  // como alerta depois de pago. Paga ACIMA do previsto continua vermelha: é
  // estouro de verdade.
  //
  // O cadastro é achado pelo par (nome, variante), e o nome sozinho só vale
  // quando é único — senão Seguro · Civic e Seguro · March se confundem. Ver
  // CLAUDE.md, "Categorias e variantes".
  const cadastro = categorias.find(c => c.nome === nome && (c.descricao ?? '') === (descricao ?? ''))
    ?? (categorias.filter(c => c.nome === nome).length === 1 ? categorias.find(c => c.nome === nome) : undefined)
  const fixaPaga = ehFixaPaga(prev, real, isEntrada, !!cadastro?.fixa)

  const faixa = noValorExato || fixaPaga ? 'bom' : faixaRadar(percArred, isEntrada)
  const cor = semDados ? '#94a3b8' : COR[faixa]
  // O número grande é o que importa agora — resta, passou, a pagar, ✓ pago —,
  // e o "gastou X de Y" desce para a linha de baixo. O percentual saiu: a
  // barra já mostra a proporção. Mesma regra do grupo (destaqueRadar), pedido
  // do Guilherme em 06/10/2026. Fixa paga continua sem "disponível": o saldo
  // previsto já não conta nada dela.
  const destaque = destaqueRadar(prev, real, isEntrada, { fixa: !!cadastro?.fixa, fixaPaga })
  const alternar = () => temLancamentos && setAberto(v => !v)

  return (
    <div style={{ borderBottom: '1px solid #f1f5f9' }}>
      <div
        role={temLancamentos ? 'button' : undefined}
        tabIndex={temLancamentos ? 0 : undefined}
        aria-expanded={temLancamentos ? aberto : undefined}
        onClick={alternar}
        onKeyDown={e => { if (temLancamentos && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); alternar() } }}
        style={{
          padding: '10px 15px 10px 16px', display: 'flex', alignItems: 'center', gap: 10,
          cursor: temLancamentos ? 'pointer' : 'default', color: '#0f172a',
          background: aberto ? '#f8fafc' : '#fff',
        }}
      >
        <div style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0, background: '#f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
          {icone}
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          {/* Fixa ou variável, como no cadastro — é a divisão que a memória do
              saldo final usa (fixas pagas e a pagar × variável a realizar).
              Pedido do Guilherme em 06/10/2026. Sem cadastro ("Outras",
              categoria excluída), sem marcador. Fixa #3730a3 sobre #e0e7ff:
              8,0; variável #475569 sobre #f1f5f9: 6,9. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span title={displayName} style={{ fontSize: 12, fontWeight: 600, minWidth: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </span>
            {cadastro && (
              <span style={{ flexShrink: 0, fontSize: 9.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase',
                borderRadius: 999, padding: '1px 6px',
                background: cadastro.fixa ? '#e0e7ff' : '#f1f5f9', color: cadastro.fixa ? '#3730a3' : '#475569' }}>
                {cadastro.fixa ? 'fixa' : 'variável'}
              </span>
            )}
          </div>
          <div style={{ fontSize: 10.5, marginTop: 2, color: '#475569',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {destaque.contexto}
          </div>
        </div>
        {/* Ajustar o plano daqui mesmo (ajustePlanoContexto). stopPropagation:
            a linha inteira abre os lançamentos. #475569 no branco: 7,6. */}
        {abrirAjuste && (
          <button type="button" title="Ajustar o plano" aria-label={`Ajustar o plano de ${displayName}`}
            onClick={e => { e.stopPropagation(); abrirAjuste({ tipo: isEntrada ? 'entrada' : 'saida', nome, descricao, prev, real }) }}
            onKeyDown={e => e.stopPropagation()}
            style={{ border: '1px solid #e2e8f0', background: '#fff', color: '#475569', borderRadius: 999,
              padding: '3px 9px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              flexShrink: 0, whiteSpace: 'nowrap' }}>
            ✎ ajustar plano
          </button>
        )}
        <div title={percLabel} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end',
          whiteSpace: 'nowrap', minWidth: 150, fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: cor }}>{destaque.principal}</span>
        </div>
        <div style={{ width: 200, flexShrink: 0, height: 16, borderRadius: 8, background: TRILHO, overflow: 'hidden',
          boxSizing: 'border-box', border: `2px solid ${semDados ? '#cbd5e1' : '#64748b'}` }}>
          {!semDados && (
            <div style={{ height: '100%', borderRadius: 8, width: `${Math.max(0, percClamp) * 100}%`,
              background: cor, transition: 'width .3s ease' }} />
          )}
        </div>
        {/* O espaço do chevron existe sempre, com ou sem lançamentos: é ele
            que mantém a barra alinhada com a do grupo. */}
        <span aria-hidden="true" style={{ width: 12, textAlign: 'center', fontSize: 12, flexShrink: 0,
          color: '#64748b', transition: 'transform .15s',
          transform: aberto ? 'rotate(180deg)' : 'none' }}>
          {temLancamentos ? '▾' : ''}
        </span>
      </div>

      {/* Acordeão — lançamentos */}
      {aberto && (
        <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '10px 14px 14px' }}>
          {porVariante.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: .5, marginRight: 2 }}>
                Por variante
              </span>
              {/* #1e3a8a sobre #e0e7ff: 9,1 */}
              {porVariante.map(([v, total]) => (
                <span key={v || '-'} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 999,
                  background: v ? '#e0e7ff' : '#f1f5f9', color: v ? '#1e3a8a' : '#475569', fontVariantNumeric: 'tabular-nums' }}>
                  {v || 'sem variante'} <b>{fmt(total)}</b>
                </span>
              ))}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colunas.length}, 1fr)`, gap: 12 }}>
            {colunas.map(col => (
              <div key={col.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b',
                    textTransform: 'uppercase', letterSpacing: .5 }}>{col.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: isEntrada ? '#16a34a' : '#0f172a' }}>
                    {fmt(col.total)}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {col.itens.map((l, i) => (
                    <div key={i} style={{ padding: '6px 8px', borderRadius: 8,
                      background: '#fff', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
                        <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>
                          {String(l.dia).padStart(2, '0')}/{String(mes + 1).padStart(2, '0')}
                          {/* #475569 no branco: 7,6 — a data em volta é só apoio. */}
                          {l.parcela && (
                            <b style={{ color: '#475569', fontWeight: 700, marginLeft: 6 }}>{l.parcela.atual} de {l.parcela.total}</b>
                          )}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, flexShrink: 0,
                          color: isEntrada ? '#16a34a' : '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(l.valor)}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: '#334155', marginTop: 2,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.variante && (
                          <b style={{ fontSize: 10, color: '#1e3a8a', background: '#e0e7ff', borderRadius: 4,
                            padding: '0 5px', marginRight: 5 }}>{l.variante}</b>
                        )}
                        {l.descricao || nome}
                      </div>
                      {l.sub && (
                        <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 1 }}>{l.sub}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
