import type { PontoEvolucao } from '../../utils/evolucaoSaldo'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * A resposta da tela Início: com quanto o mês fecha. Briefing "Hierarquia e
 * comparativo na tela Início", onda 1, de 27/09/2026. Substitui a faixa da
 * bússola e o quarto cartão "Saldo final previsto".
 *
 * Só desenho: todo número chega pronto. `valor` é o fechamento da memória de
 * cálculo; `apoio` são valores que já estavam na tela; o sparkline é a mesma
 * série do gráfico "Evolução do saldo" (evolucaoDoSaldo), como marca d'água.
 *
 * Contraste, medido no extremo mais claro do gradiente (#1e40af, o limite do
 * CLAUDE.md): branco 8,72; rótulos a 75% 5,1; número negativo em #fecaca 4,6.
 * O número não usa tabular-nums: dígitos de largura igual deixam o número
 * grande frouxo.
 */
export type StatusHero = { cor: string; frase: string }

export default function HeroSaldo({
  status, rotulo, valor, apoio, onComoCheguei, aberto, sparkline, isMobile,
}: {
  status: StatusHero | null
  rotulo: string
  valor: number
  apoio: { rotulo: string; valor: number }[]
  onComoCheguei?: () => void
  aberto?: boolean
  sparkline: PontoEvolucao[]
  isMobile: boolean
}) {
  return (
    <div style={{
      position: 'relative', overflow: 'hidden', color: '#fff',
      borderRadius: aberto ? '16px 16px 0 0' : 16,
      padding: isMobile ? '22px 20px 20px' : '26px 28px 24px',
      background: 'linear-gradient(135deg,#0f2878 0%,#1a3f9e 55%,#1e40af 100%)',
      boxShadow: aberto ? 'none' : '0 8px 28px rgba(15,40,120,.22)',
    }}>
      <Sparkline pontos={sparkline} isMobile={isMobile} />

      {status && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600,
          marginBottom: 18, position: 'relative' }}>
          <span aria-hidden style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: status.cor }} />
          {status.frase}
        </div>
      )}
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,.75)', marginBottom: 6, position: 'relative' }}>{rotulo}</div>
      <div style={{ fontSize: isMobile ? 40 : 54, fontWeight: 700, lineHeight: 1, letterSpacing: '-.025em',
        position: 'relative', marginBottom: 16, color: valor < 0 ? '#fecaca' : '#fff' }}>{fmt(valor)}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 16, flexWrap: 'wrap', fontSize: 13,
        color: 'rgba(255,255,255,.75)', position: 'relative' }}>
        {apoio.map((a, i) => (
          <span key={a.rotulo} style={{ display: 'inline-flex', gap: isMobile ? 10 : 16 }}>
            {i > 0 && <span aria-hidden style={{ color: 'rgba(255,255,255,.3)' }}>·</span>}
            <span>{a.rotulo} <b style={{ color: '#fff', fontWeight: 600 }}>{fmt(a.valor)}</b></span>
          </span>
        ))}
        {onComoCheguei && (
          <>
            {apoio.length > 0 && <span aria-hidden style={{ color: 'rgba(255,255,255,.3)' }}>·</span>}
            <button onClick={onComoCheguei} aria-expanded={!!aberto} style={{
              background: 'none', border: 'none', padding: '0 0 1px', cursor: 'pointer', fontFamily: 'inherit',
              color: '#fff', fontSize: 13, fontWeight: 600, borderBottom: '1.5px solid rgba(255,255,255,.45)',
            }}>{aberto ? 'fechar o cálculo' : 'como cheguei nesse número'}</button>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * A série do gráfico "Evolução do saldo" como marca d'água: cheia no passado,
 * tracejada do último fechamento em diante, com o mês corrente marcado. Sem
 * eixo e sem número — é textura; os números estão no gráfico lá embaixo.
 */
function Sparkline({ pontos, isMobile }: { pontos: PontoEvolucao[]; isMobile: boolean }) {
  if (pontos.length < 2) return null
  const W = 520, H = 190
  const vals = pontos.map(p => p.valor)
  const min = Math.min(...vals), max = Math.max(...vals)
  const faixa = max - min || 1
  const xy = pontos.map((p, i) => [(i / (pontos.length - 1)) * W, 170 - ((p.valor - min) / faixa) * 130] as const)
  const caminho = (pts: readonly (readonly [number, number])[]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const ultimoReal = pontos.map(p => p.real).lastIndexOf(true)
  const idxHoje = pontos.findIndex(p => !p.real)
  const cheio = ultimoReal >= 0 ? xy.slice(0, ultimoReal + 1) : []
  const tracejado = xy.slice(Math.max(0, ultimoReal))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden style={{
      position: 'absolute', right: 0, bottom: 0, width: isMobile ? '100%' : '56%', height: '100%',
      opacity: isMobile ? 0.28 : 0.5, pointerEvents: 'none',
    }}>
      <defs>
        <linearGradient id="hero-fd" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity=".22" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {cheio.length >= 2 && (
        <>
          <path d={`${caminho(cheio)} L${cheio[cheio.length - 1][0].toFixed(1)},${H} L${cheio[0][0].toFixed(1)},${H} Z`} fill="url(#hero-fd)" />
          <path d={caminho(cheio)} fill="none" stroke="#fff" strokeWidth={2.5} strokeOpacity={0.85}
            strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </>
      )}
      {tracejado.length >= 2 && (
        <path d={caminho(tracejado)} fill="none" stroke="#fff" strokeWidth={2.5} strokeOpacity={0.5}
          strokeDasharray="7 6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      )}
      {idxHoje >= 0 && (
        <circle cx={xy[idxHoje][0]} cy={xy[idxHoje][1]} r={5.5} fill="#1a3f9e" stroke="#fff" strokeWidth={2.5}
          vectorEffect="non-scaling-stroke" />
      )}
    </svg>
  )
}
