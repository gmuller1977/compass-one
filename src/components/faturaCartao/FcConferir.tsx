import { COR } from './FcShared'

/**
 * A bolinha de "conferida com o banco" na linha da compra (utils/conferirFatura).
 * Vazia: borda #64748b (4,8 no branco, passa os 3:1 de gráfico). Marcada:
 * verde #15803d com ✓ branco, o verde do app no branco.
 */
export function BolinhaConferido({ marcado, onToggle, tamanho = 26, rotulo }: {
  marcado: boolean
  onToggle: () => void
  tamanho?: number
  /** Nome para leitor de tela e dica, quando a bolinha não é a da fatura. */
  rotulo?: string
}) {
  return (
    <button type="button"
      aria-pressed={marcado}
      aria-label={rotulo ?? (marcado ? 'Conferida com o banco. Tocar desmarca.' : 'Marcar como conferida com o banco')}
      title={rotulo ?? (marcado ? 'Conferida com o banco' : 'Marcar como conferida com o banco')}
      onClick={e => { e.stopPropagation(); onToggle() }}
      style={{
        // A área de toque é maior que o desenho.
        width: tamanho + 14, height: tamanho + 14, margin: -7, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', background: 'transparent', cursor: 'pointer', padding: 0,
      }}>
      <span aria-hidden style={{
        width: tamanho, height: tamanho, borderRadius: '50%', boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: marcado ? 'none' : '2px solid #64748b',
        background: marcado ? '#15803d' : COR.branco,
        color: '#fff', fontSize: Math.round(tamanho * 0.55), fontWeight: 800, lineHeight: 1,
      }}>{marcado ? '✓' : ''}</span>
    </button>
  )
}
