import { COR } from '../../utils/cores'
import type { ResumoRadar } from '../../utils/resumoRadar'

/**
 * A resposta do mês, antes dos números — ver resumoRadar. Fundo claro de
 * estado (infoFundo / erroFundo), com o par de texto já medido em cores.ts:
 * infoTexto 5,5:1 e erroTexto 5,9:1. O detalhe vai em textoSuave (4,76 no
 * branco; no #eff6ff, 4,42 — por isso fica em #475569, 7,0).
 */
export default function ResumoRadarFaixa({ resumo }: { resumo: ResumoRadar }) {
  const passou = resumo.tom === 'passou'
  return (
    <div role="status" style={{
      flexShrink: 0, borderRadius: 12, padding: '12px 16px',
      background: passou ? COR.erroFundo : COR.infoFundo,
      border: `1px solid ${passou ? '#fecdd3' : COR.infoBorda}`,
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: passou ? COR.erroTexto : COR.infoTexto }}>
        {resumo.titulo}
      </div>
      {resumo.detalhe && (
        <div style={{ fontSize: 13, color: '#475569' }}>{resumo.detalhe}</div>
      )}
    </div>
  )
}
