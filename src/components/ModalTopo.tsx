import type { ReactNode } from 'react'
import { PH_BTN_WHITE } from './PageHeader'
import { TOPO_AZUL, ROTULO_TOPO } from './mobile/estilo'

/**
 * O cabeçalho das janelas: o mesmo do modal do mês no Planejamento
 * (PlanModalMeses), pedido do Guilherme em 17/10/2026 para todas as outras.
 * Azul #0f2878 → #1e40af de ponta a ponta, ícone desenhado num círculo,
 * rótulo em maiúsculas em cima, título branco e o ✕ redondo à direita.
 * Branco no #1e40af: 8,7; rótulo e subtítulo a 75%: 5,1.
 *
 * Com `setas`, o mês anda pelas setas AO LADO do título, e o título tem
 * largura fixa (`larguraTitulo`): as setas não mudam de lugar com o tamanho
 * do nome do mês (pedido dele no mesmo dia).
 *
 * Vai como primeiro filho da caixa da janela, que não tem padding no topo e
 * corta os cantos (`overflow: hidden` ou o radius do próprio topo).
 */
type Props = {
  /** Nome Tabler ("ti-…") ou um desenho próprio (a bússola da marca). */
  icone: string | ReactNode
  rotulo?: string
  titulo: ReactNode
  /** id do título, para o aria-labelledby da janela. */
  id?: string
  subtitulo?: ReactNode
  onFechar?: () => void
  /** Seta de voltar, antes do ícone (passos de uma folha). */
  voltar?: () => void
  /** Botões à direita, antes do ✕. */
  direita?: ReactNode
  setas?: { anterior?: () => void; proximo?: () => void }
  /** Largura do título quando há setas, em px. */
  larguraTitulo?: number
  /** Cantos de cima, para folha de baixo (o resto da janela não corta). */
  raio?: number
  /** Conteúdo embaixo, dentro do mesmo azul. */
  children?: ReactNode
}

export const BTN_REDONDO_TOPO = {
  ...PH_BTN_WHITE, width: 34, height: 34, padding: 0, borderRadius: '50%', display: 'inline-flex',
  alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
} as const

export default function ModalTopo({ icone, rotulo, titulo, id, subtitulo, onFechar, voltar, direita, setas, larguraTitulo, raio, children }: Props) {
  const seta = (dir: -1 | 1) => {
    const acao = dir < 0 ? setas?.anterior : setas?.proximo
    return (
      <button type="button" onClick={acao} disabled={!acao} aria-label={dir < 0 ? 'Mês anterior' : 'Próximo mês'}
        style={{ ...BTN_REDONDO_TOPO, opacity: acao ? 1 : 0.35, cursor: acao ? 'pointer' : 'default' }}>
        <i aria-hidden className={`ti ti-chevron-${dir < 0 ? 'left' : 'right'}`} />
      </button>
    )
  }

  return (
    <div style={{ background: TOPO_AZUL, padding: '16px 20px', flexShrink: 0,
      borderRadius: raio ? `${raio}px ${raio}px 0 0` : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {voltar && (
          <button type="button" onClick={voltar} aria-label="Voltar" title="Voltar" style={BTN_REDONDO_TOPO}>
            <i aria-hidden className="ti ti-chevron-left" />
          </button>
        )}
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,.14)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {typeof icone === 'string' ? <i aria-hidden className={`ti ${icone}`} style={{ color: '#fff', fontSize: 20 }} /> : icone}
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{ minWidth: 0, flex: setas ? undefined : 1, width: setas ? larguraTitulo : undefined, flexShrink: setas ? 0 : 1 }}>
            {rotulo && (
              <div style={{ fontSize: 11, color: ROTULO_TOPO, letterSpacing: '.3px', textTransform: 'uppercase',
                fontWeight: 500, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {rotulo}
              </div>
            )}
            <div id={id} role="heading" aria-level={2} style={{ fontSize: 18, fontWeight: 700, color: '#fff', lineHeight: 1.25,
              overflowWrap: 'anywhere' }}>{titulo}</div>
          </div>
          {setas && <span style={{ display: 'flex', gap: 6, flexShrink: 0 }}>{seta(-1)}{seta(1)}</span>}
        </div>
        {direita}
        {onFechar && (
          <button type="button" onClick={onFechar} aria-label="Fechar" title="Fechar" style={BTN_REDONDO_TOPO}>
            <i aria-hidden className="ti ti-x" />
          </button>
        )}
      </div>
      {subtitulo && (
        <div style={{ fontSize: 13, color: ROTULO_TOPO, lineHeight: 1.45, marginTop: 8 }}>{subtitulo}</div>
      )}
      {children}
    </div>
  )
}
