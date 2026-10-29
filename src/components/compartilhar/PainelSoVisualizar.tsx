import { useApp } from '../../context/AppContext'
import { COR } from '../../utils/cores'

/**
 * No lugar do formulário de lançar (Lançamentos e fatura, no computador)
 * para o Educador Financeiro, que só visualiza (migração 023).
 */
export default function PainelSoVisualizar() {
  const { compartilhamento } = useApp()
  const dono = compartilhamento.donoNome || compartilhamento.donoEmail || 'a pessoa'
  return (
    <div style={{ width: 340, flexShrink: 0, background: COR.branco, borderLeft: '1px solid #e2e8f0', padding: 20 }}>
      <div role="note" style={{ background: COR.infoFundo, color: COR.infoTexto, border: '1px solid #bfdbfe', borderRadius: 12,
        padding: '14px 16px', fontSize: 14, lineHeight: 1.5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 4 }}>
          <i aria-hidden className="ti ti-eye" style={{ fontSize: 18 }} /> Só visualizar
        </div>
        Você está nas finanças de <strong>{dono}</strong> como Educador Financeiro. Os lançamentos são feitos por {dono}.
      </div>
    </div>
  )
}
