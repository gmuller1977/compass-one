import { useApp } from '../../context/AppContext'
import { COR } from '../../utils/cores'

/**
 * Faixa para quem entrou por convite: o cadastro (contas, categorias, plano)
 * é do administrador. Aparece em Configurações e no Planejamento, onde ele
 * seria editado; fora da conta compartilhada não desenha nada.
 */
export default function AvisoSoAdministrador({ style }: { style?: React.CSSProperties }) {
  const { compartilhamento } = useApp()
  if (compartilhamento.papel !== 'membro') return null
  const dono = compartilhamento.donoNome || compartilhamento.donoEmail || 'o administrador'
  return (
    <div role="note" style={{
      background: COR.infoFundo, color: COR.infoTexto, border: '1px solid #bfdbfe', borderRadius: 12,
      padding: '10px 14px', fontSize: 14, lineHeight: 1.45, ...style,
    }}>
      🔒 Você está nas finanças de <strong>{dono}</strong>. Contas, categorias e planejamento só o
      administrador altera; aqui você consulta. Lançamentos você faz normalmente.
    </div>
  )
}
