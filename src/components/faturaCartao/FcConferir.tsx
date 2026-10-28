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

/** "Conferidas com o banco · 12 de 15", no topo da lista. */
export function ResumoConferidos({ conferidas, total, onDesmarcar, fonte = 13 }: {
  conferidas: number
  total: number
  onDesmarcar: () => void
  fonte?: number
}) {
  if (total === 0) return null
  const todas = conferidas === total
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      background: todas ? COR.sucessoFundo : '#eef2f8', borderRadius: 12, padding: '10px 14px',
      fontSize: fonte, color: COR.texto,
    }}>
      <span style={{ flex: 1, minWidth: 180 }}>
        {conferidas === 0
          ? <>Conferindo com o banco? Marque o <b>○</b> de cada compra que você achar lá.</>
          : <><b style={{ color: todas ? COR.sucessoTexto : COR.texto }}>
              {todas ? '✓ ' : ''}{conferidas} de {total}
            </b> conferidas com o banco</>}
      </span>
      {conferidas > 0 && (
        <button type="button" onClick={onDesmarcar} style={{
          border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 0',
          fontFamily: 'inherit', fontSize: fonte, fontWeight: 600, color: COR.azul,
        }}>Desmarcar todas</button>
      )}
    </div>
  )
}
