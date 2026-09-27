import { COR } from '../utils/cores'
import type { RitmoDoMes } from '../utils/ritmoDoMes'
import { RADAR_COR_CLARO, RADAR_TRILHO_BRANCO } from './acompanhamento/radarCores'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pct = (v: number) => `${Math.round(v * 100)}%`
// Passou do plano por pouco (100,15%) não pode aparecer como "100%" ao lado de
// "Passou do plano": ali o percentual ganha uma casa.
const pctGasto = (r: RitmoDoMes) => r.estado === 'passou' && Math.round(r.percGasto * 100) <= 100
  ? `${(r.percGasto * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
  : pct(r.percGasto)

/**
 * "Ritmo do mês" da tela Início. O número vem pronto de utils/ritmoDoMes.
 *
 * Duas barras na MESMA escala — quanto do mês passou e quanto da variável foi
 * gasta —, uma embaixo da outra: a comparação é o desenho, não uma conta que a
 * pessoa precisa fazer. Cores da paleta clara do Radar, sobre o branco: verde
 * no ritmo (#14532d), verde-claro acelerado mas dentro do plano (#18713a),
 * vermelho passou (#7f1d1d) — "verde = dentro do plano, vermelho = problema".
 * A barra do mês é COR.textoSuave (#64748b, 4,76:1).
 */
export default function RitmoCard({ r }: { r: RitmoDoMes }) {
  const cor = r.estado === 'passou' ? RADAR_COR_CLARO.ruim
    : r.estado === 'acelerado' ? RADAR_COR_CLARO.atencao : RADAR_COR_CLARO.bom
  const quanto = r.diasRestantes === 1
    ? `${fmt(r.porDia)} hoje, o último dia`
    : `${fmt(r.porDia)} por dia nos ${r.diasRestantes} dias que faltam`
  const mensagem = r.estado === 'passou'
    ? <><b>Passou do plano em {fmt(r.gasto - r.planejado)}.</b> Cada gasto variável daqui até o fim do mês sai do saldo.</>
    : r.estado === 'acelerado'
      ? <><b>Acima do ritmo.</b> Para fechar no plano, o limite é {quanto}.</>
      : <><b>No ritmo.</b> Dá para gastar {quanto}.</>

  const barra = (rotulo: string, valor: number, corBarra: string, texto: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span style={{ width: 58, fontSize: 11, color: COR.textoSuave, fontWeight: 600 }}>{rotulo}</span>
      <div style={{ flex: 1, height: 10, borderRadius: 5, background: RADAR_TRILHO_BRANCO, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(valor, 1) * 100}%`, height: '100%', borderRadius: 5, background: corBarra }} />
      </div>
      <span style={{ width: 48, textAlign: 'right', fontSize: 12, fontWeight: 700, color: corBarra,
        fontVariantNumeric: 'tabular-nums' }}>{texto}</span>
    </div>
  )

  return (
    <div style={{ background: COR.branco, borderRadius: 12, padding: '18px 20px', border: `.5px solid ${COR.borda}` }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: COR.texto }}>Ritmo do mês</div>
      <div style={{ fontSize: 12, color: COR.textoSuave, marginTop: 2, marginBottom: 14 }}>
        Gastou {pctGasto(r)} da despesa variável com {pct(r.percMes)} do mês passado
      </div>
      {barra('Mês', r.percMes, COR.textoSuave, pct(r.percMes))}
      {barra('Gasto', r.percGasto, cor, pctGasto(r))}
      <div style={{ fontSize: 11, color: COR.textoSuave, margin: '2px 0 12px 68px', fontVariantNumeric: 'tabular-nums' }}>
        {fmt(r.gasto)} de {fmt(r.planejado)} planejados · dia {r.dia} de {r.totalDias}
      </div>
      <div style={{ fontSize: 13, color: cor, lineHeight: 1.5 }}>{mensagem}</div>
    </div>
  )
}
