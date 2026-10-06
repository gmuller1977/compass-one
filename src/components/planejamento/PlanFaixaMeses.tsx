import { useEffect, useRef, useState, type ReactNode } from 'react'
import { COR } from '../../utils/cores'

const CURTOS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const GAP = 12

/**
 * Os doze meses da Grade numa linha só, navegada por setas. Pedido do
 * Guilherme em 06/10/2026: na grade de 4 × 3 "alguns meses ficam escondidos"
 * — os de baixo caíam fora da tela.
 *
 * Mostra 4 por vez (3 no tablet, 2 no celular) e anda UM mês por clique. Abre
 * com o mês corrente como o primeiro visível; os anteriores ficam a uma seta à
 * esquerda. A fileira Jan–Dez em cima pula direto para um mês e marca os que
 * estão na tela. O próprio scroll é nativo, com snap: no celular, arrastar
 * funciona; no teclado, ← e → com o foco na faixa.
 */
export default function PlanFaixaMeses({ itens, inicial, destaque }: {
  /** Os 12 cartões, de janeiro a dezembro. */
  itens: ReactNode[]
  /** O mês que abre como o primeiro visível. */
  inicial: number
  /** O mês marcado na fileira de atalhos (o corrente), ou null. */
  destaque: number | null
}) {
  const faixa = useRef<HTMLDivElement>(null)
  const [primeiro, setPrimeiro] = useState(0)
  const [porTela, setPorTela] = useState(4)

  const passo = () => {
    const el = faixa.current
    const card = el?.firstElementChild as HTMLElement | null
    return card ? card.offsetWidth + GAP : 0
  }
  const irPara = (mi: number, suave = true) => {
    const el = faixa.current
    if (!el) return
    el.scrollTo({ left: Math.max(0, mi) * passo(), behavior: suave ? 'smooth' : 'auto' })
  }

  // Abre no mês inicial, sem animação; e acompanha quantos cabem na tela.
  useEffect(() => {
    const medir = () => {
      const el = faixa.current
      const p = passo()
      if (el && p) setPorTela(Math.max(1, Math.round((el.clientWidth + GAP) / p)))
    }
    medir()
    irPara(inicial, false)
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inicial])

  const aoRolar = () => {
    const p = passo()
    if (p && faixa.current) setPrimeiro(Math.round(faixa.current.scrollLeft / p))
  }
  const ultimoInicio = 12 - porTela
  const noComeco = primeiro <= 0
  const noFim = primeiro >= ultimoInicio

  const seta = (dir: -1 | 1, desligada: boolean): ReactNode => (
    <button type="button" aria-label={dir < 0 ? 'Mês anterior' : 'Próximo mês'} disabled={desligada}
      onClick={() => irPara(Math.min(ultimoInicio, Math.max(0, primeiro + dir)))}
      style={{
        flexShrink: 0, width: 34, height: 34, borderRadius: '50%', border: `1px solid ${COR.borda}`,
        background: desligada ? '#f8fafc' : COR.branco, color: desligada ? '#cbd5e1' : '#1e3a8a',
        fontSize: 18, fontWeight: 700, cursor: desligada ? 'default' : 'pointer', alignSelf: 'center',
        boxShadow: desligada ? 'none' : '0 1px 3px rgba(15,23,42,.12)',
      }}>{dir < 0 ? '‹' : '›'}</button>
  )

  return (
    <div>
      {/* Atalhos: um clique leva o mês para a primeira posição visível. */}
      <div role="group" aria-label="Ir para o mês" style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
        {CURTOS.map((rot, mi) => {
          const visivel = mi >= primeiro && mi < primeiro + porTela
          return (
            <button key={rot} type="button" aria-pressed={visivel} onClick={() => irPara(Math.min(mi, ultimoInicio))}
              style={{
                border: 'none', borderRadius: 999, padding: '4px 10px', fontFamily: 'inherit', fontSize: 12, cursor: 'pointer',
                fontWeight: mi === destaque ? 800 : visivel ? 700 : 500,
                background: visivel ? '#dbeafe' : 'transparent',
                // #1e3a8a sobre #dbeafe: 8,6; #475569 no fundo do app: 7,4.
                color: visivel ? '#1e3a8a' : '#475569',
                textDecoration: mi === destaque ? 'underline' : 'none', textUnderlineOffset: 3,
              }}>{rot}</button>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
        {seta(-1, noComeco)}
        <div ref={faixa} onScroll={aoRolar} tabIndex={0} aria-label="Meses do plano — use as setas para navegar"
          onKeyDown={e => {
            if (e.target !== e.currentTarget) return
            if (e.key === 'ArrowRight') { e.preventDefault(); irPara(Math.min(ultimoInicio, primeiro + 1)) }
            if (e.key === 'ArrowLeft') { e.preventDefault(); irPara(Math.max(0, primeiro - 1)) }
          }}
          className="plan-faixa-meses"
          style={{
            flex: 1, minWidth: 0, display: 'flex', gap: GAP, overflowX: 'auto', scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none', padding: '2px 2px 6px', outlineOffset: 2,
          }}>
          {itens.map((it, mi) => (
            <div key={mi} style={{ scrollSnapAlign: 'start' }}>{it}</div>
          ))}
        </div>
        {seta(1, noFim)}
      </div>

      <style>{`
        .plan-faixa-meses::-webkit-scrollbar { display: none; }
        .plan-faixa-meses > div { flex: 0 0 calc((100% - ${GAP * 3}px) / 4); min-width: 0; }
        @media (max-width: 1023px) { .plan-faixa-meses > div { flex-basis: calc((100% - ${GAP * 2}px) / 3); } }
        @media (max-width: 639px)  { .plan-faixa-meses > div { flex-basis: calc((100% - ${GAP}px) / 2); } }
        @media (prefers-reduced-motion: reduce) { .plan-faixa-meses { scroll-behavior: auto; } }
      `}</style>
    </div>
  )
}
