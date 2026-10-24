import { fmt, MESES_FULL } from './types'
import { atencaoDoMes, guardaDoMes, situacaoDaMeta, type MesDoAno } from './anoDoPlano'
import { AnelGrupo } from '../acompanhamento/EvolucaoGrupo'

/**
 * O cartão do mês no Planejamento, no padrão dos grupos do Radar (pedido do
 * Guilherme em 24/10/2026): cartão branco com borda `#93c5fd`, números em
 * azul `#1d4ed8` (6,7) e um anel azul neon. O anel é o quanto da META DE
 * ECONOMIA o mês guarda (`guardaDoMes` ÷ meta, ✓ cheio ao chegar nela; o plano nos meses abertos, o
 * real nos fechados, a régua de `situacaoDaMeta`); sem meta, anel vazio. O
 * marcador amarelo "!" e a borda vermelha `#b91c1c` (6,47) aparecem quando o mês fica abaixo
 * da meta ou termina com saldo negativo. Computador (PlanAnoVisao) e celular
 * (PlanMobile) usam este mesmo conteúdo.
 */
const AZUL = '#1d4ed8'
const SUAVE = '#475569'

export default function ConteudoCartaoMes({ m, grande }: { m: MesDoAno; grande?: boolean }) {
  const sem = m.semPlano && !m.fechado
  const dif = m.real !== undefined ? m.real - m.final : 0
  const s = situacaoDaMeta(m)
  const pct = m.meta > 0 ? guardaDoMes(m) / m.meta : null
  const alerta = atencaoDoMes(m)
  return (
    <>
      <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: grande ? 16 : 15, fontWeight: 700, color: '#0f172a' }}>{MESES_FULL[m.mi]}</span>
        {m.atual && <span style={{ fontSize: grande ? 12 : 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
          background: '#dbeafe', color: '#1e3a8a' }}>ATUAL</span>}
        {m.fechado && <span aria-label="Mês fechado" style={{ fontSize: grande ? 12 : 11, fontWeight: 700, padding: '2px 8px',
          borderRadius: 999, background: '#e2e8f0', color: '#334155' }}>✓</span>}
      </span>
      <span style={{ fontSize: grande ? 13 : 12, color: SUAVE }}>{m.fechado ? 'fechou com' : 'termina com'}</span>
      <span style={{ fontSize: grande ? 22 : 19, fontWeight: 800, color: AZUL,
        fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {fmt(m.valor, true)}
      </span>
      <span style={{ fontSize: grande ? 14 : 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: sem ? SUAVE : AZUL }}>
        {sem ? `Sem planejamento · ${grande ? 'toque' : 'clique'} para planejar`
          : m.real !== undefined
            ? (Math.abs(dif) < 0.005 ? 'igual ao previsto'
              : `${dif > 0 ? '▲' : '▼'} ${fmt(Math.abs(dif), true)} ${dif > 0 ? 'acima' : 'abaixo'}`)
            : m.sobra >= 0 ? `+ ${fmt(m.sobra, true)} de sobra` : `− ${fmt(-m.sobra, true)} no mês`}
      </span>
      {!sem && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <AnelGrupo pct={pct} pago={!!s?.ok} cor="#2563eb" trilho="#e2e8f0" corTexto={AZUL}
            alerta={alerta} tamanho={grande ? 64 : 56}
            rotuloAlerta={m.valor < 0 ? 'Atenção: termina negativo' : 'Atenção: abaixo da meta'} />
          <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: grande ? 13 : 12, color: SUAVE }}>Meta</span>
            <span style={{ fontSize: grande ? 14 : 13, fontWeight: 700, color: s ? AZUL : SUAVE, fontVariantNumeric: 'tabular-nums' }}>
              {s ? fmt(m.meta, true) : 'sem meta'}
            </span>
            {s && <span style={{ fontSize: grande ? 13 : 12, fontWeight: 600, color: s.ok ? AZUL : '#b91c1c' }}>{s.aviso}</span>}
          </span>
        </span>
      )}
    </>
  )
}
