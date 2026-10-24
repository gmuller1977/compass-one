import { useMemo, useState, type CSSProperties } from 'react'
import type { Categoria } from '../../context/AppContext'
import { IconeCat } from '../IconeCat'
import { M, TOPO_AZUL, mostrar } from '../mobile/estilo'
import { Anel } from '../mobile/ui'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { balancoDoPlano, type GrupoNoBalanco } from '../../utils/balancoDoPlano'
import type { LinhaDoMes } from '../acompanhamento/evolucaoCalcs'

/**
 * "Plano do mês" na Início (23/10/2026, pedido do Guilherme; era a lista
 * "Passou do plano" com as três categorias mais estouradas). Um resumo:
 * quanto os grupos passaram do plano, quanto ainda falta para os outros
 * chegarem nele, e a diferença; embaixo, um acordeão com os grupos de cada
 * lado. O detalhe por categoria fica no Radar. Contas em utils/balancoDoPlano.
 *
 * O mesmo azul-escuro do "Resumo do mês", logo acima: só branco, rótulo a
 * 85%, `#fdba74` e `#86efac` (a paleta de fundo escuro do CLAUDE.md).
 */
const ROT = 'rgba(255,255,255,.85)'
// Número no azul é BRANCO (24/10/2026, Guilherme); verde e laranja ficam no branco e nas barras.
const NEG = '#fff'
const POS = '#fff'

export default function PlanoDoMesCard({ linhas, categorias, oculto, onRadar }: {
  linhas: LinhaDoMes[]; categorias: Categoria[]; oculto: boolean; onRadar: () => void
}) {
  const b = useMemo(() => balancoDoPlano(linhas, categorias), [linhas, categorias])
  const [aberto, setAberto] = useState<'passaram' | 'abaixo' | null>(null)
  const v = (n: number) => mostrar(n, oculto)
  const num: CSSProperties = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }

  const lista = (chave: 'passaram' | 'abaixo', titulo: string, grupos: GrupoNoBalanco[], cor: string, sinal: string) => {
    if (!grupos.length) return null
    const estaAberto = aberto === chave
    return (
      <div style={{ borderTop: '1px solid rgba(255,255,255,.16)' }}>
        <button onClick={() => setAberto(estaAberto ? null : chave)} aria-expanded={estaAberto} style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 48, padding: '6px 0',
          background: 'none', border: 'none', color: '#fff', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
        }}>
          <span style={{ flex: 1, fontSize: M.corpo, fontWeight: 600 }}>{titulo} · {grupos.length}</span>
          <span aria-hidden style={{ color: ROT, fontSize: 16, transform: estaAberto ? 'rotate(90deg)' : undefined,
            transition: 'transform .15s', width: 16, textAlign: 'center' }}>›</span>
        </button>
        {estaAberto && (
          <div style={{ display: 'grid', gap: 2, paddingBottom: 10 }}>
            {grupos.map(g => (
              <div key={g.grupo} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 44 }}>
                <span aria-hidden style={{
                  width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,.14)', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                }}><IconeCat icone={iconeCategoria(categorias, g.primeiraCategoria).icone} cor="#fff" /></span>
                <span style={{ flex: 1, minWidth: 0, fontSize: M.corpo, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.nome}</span>
                <span style={{ ...num, fontSize: M.corpo, fontWeight: 700, color: cor }}>{oculto ? 'R$ ••••' : `${sinal}${v(g.valor)}`}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const frase = !b ? null
    : b.diferenca > 0.005 ? <>No total, você está economizando <b style={{ ...num, color: POS }}>{v(b.diferenca)}</b></>
    : b.diferenca < -0.005 ? <>No total, gastou <b style={{ ...num, color: NEG }}>{v(-b.diferenca)}</b> a mais do que o plano</>
    : <>No total, está exatamente no plano</>

  return (
    <section aria-label="Plano do mês" style={{
      background: TOPO_AZUL, borderRadius: M.raio, padding: '18px 18px 12px', boxShadow: 'var(--cx-brilho)', color: '#fff',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <span aria-hidden style={{
          width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,.14)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><i className="ti ti-target-arrow" style={{ fontSize: 22, color: '#fff' }} /></span>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: M.titulo, fontWeight: 700 }}>Plano do mês</h2>
          <div style={{ fontSize: M.legenda, color: ROT, marginTop: 2 }}>Despesas, por grupo, até hoje</div>
        </div>
      </div>

      {!b ? (
        <div style={{ fontSize: M.corpo, color: ROT, paddingBottom: 8 }}>Ainda sem despesas planejadas neste mês.</div>
      ) : (
        <>
          {/* Anéis e quadro neon, a mesma ideia do "Resumo do mês" (24/10/2026,
              pedido do Guilherme). O anel é a parte dos grupos com plano que
              está de cada lado; o valor vai embaixo. */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {([['Passaram do plano', b.passaram.length, b.passou, '#2563eb'],
               ['Abaixo do plano', b.abaixo.length, b.falta, '#0891b2']] as const).map(([rot, n, valor, cor]) => {
              const total = b.passaram.length + b.abaixo.length
              return (
                <div key={rot} style={{ textAlign: 'center', minWidth: 0 }}>
                  <Anel pct={total > 0 ? Math.round((n / total) * 100) : 0} cor={cor} oculto={oculto}
                    centro={`${n} de ${total}`} rotulo={n === 1 ? 'grupo' : 'grupos'} />
                  <div style={{ fontSize: M.legenda, color: ROT, marginTop: 6 }}>{rot}</div>
                  <div style={{ ...num, fontSize: M.corpo, fontWeight: 800 }}>{v(valor)}</div>
                </div>
              )
            })}
          </div>
          <div style={{
            margin: '16px 0 12px', padding: '14px 16px', borderRadius: 18, border: '1.5px solid #22d3ee',
            boxShadow: '0 0 18px rgba(34,211,238,.45), inset 0 0 18px rgba(34,211,238,.15)',
            fontSize: M.corpo, lineHeight: 1.45, fontWeight: 600,
          }}>{frase}</div>
          {lista('passaram', 'Grupos que passaram', b.passaram, NEG, '+')}
          {lista('abaixo', 'Grupos abaixo do plano', b.abaixo, POS, '')}
        </>
      )}

      <button onClick={onRadar} style={{
        display: 'block', width: '100%', minHeight: 44, marginTop: 2, padding: '8px 0 4px',
        borderTop: '1px solid rgba(255,255,255,.16)', borderLeft: 'none', borderRight: 'none', borderBottom: 'none',
        background: 'none', color: '#fff', fontFamily: 'inherit', fontSize: M.corpo, fontWeight: 700,
        cursor: 'pointer', textAlign: 'center',
      }}>Ver o detalhe no Radar ›</button>
    </section>
  )
}
