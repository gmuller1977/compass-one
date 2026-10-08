import { COR } from '../../utils/cores'
import type { LancadoAcima } from '../../utils/lancadoAcimaDoPlano'
import { textoDaRevisao } from '../../utils/revisaoDoPlano'

/**
 * "Algumas categorias precisam de revisão de planejamento · Revisar agora" —
 * no Radar (mês corrente) e no Planejamento. O botão abre a tabela da revisão
 * (RevisaoPlanoDialog). Pedido do Guilherme em 08/10/2026, no lugar das
 * pílulas "já lançado acima do plano dos próximos meses".
 *
 * Âmbar, e não vermelho: é aviso sobre o que vem, não fato do mês. Par de
 * estado medido em cores.ts (avisoTexto sobre avisoFundo, 6,8:1).
 */
export default function RevisaoPlanoFaixa({ acima, onRevisar }: {
  acima: LancadoAcima[]
  onRevisar: () => void
}) {
  const t = textoDaRevisao(acima)
  if (!t) return null
  return (
    <div role="status" style={{
      flexShrink: 0, borderRadius: 12, padding: '10px 14px', background: COR.avisoFundo,
      border: `1px solid ${COR.avisoBorda}`, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ flex: '1 1 260px', minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: COR.avisoTexto }}>{t.titulo}</div>
        <div style={{ fontSize: 12, color: COR.avisoTexto, marginTop: 2, lineHeight: 1.4 }}>{t.detalhe}</div>
      </div>
      <button type="button" onClick={onRevisar} style={{
        border: 'none', background: COR.avisoTexto, color: '#fff', borderRadius: 999,
        padding: '8px 16px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
      }}>
        Revisar agora
      </button>
    </div>
  )
}
