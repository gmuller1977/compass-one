import type { CSSProperties, ReactNode } from 'react'
import { COR } from '../../utils/cores'
import { M } from './estilo'

/**
 * Peças do celular, no padrão dos apps de banco (Nubank, Inter, Itaú): pedido
 * do Guilherme em 10/10/2026 — "frio, letras pequenas, muito texto".
 *
 *   - Letra: corpo 15, título de cartão 17, número de destaque 32+. Nada
 *     abaixo de 12 (só legenda).
 *   - Um cartão = um título curto + um número. Explicação só se for tocada.
 *   - Cantos de 20 e sombra suave azulada (o "descontraído" do design system),
 *     sobre um fundo levemente azulado, não cinza.
 *   - Ícone em círculo com o tom da categoria — a cor que aquece a tela.
 *   - Toque de pelo menos 44 px.
 *
 * Cores de texto da paleta (cores.ts), já medidas no branco. Medidas e o
 * "olho" em ./estilo.ts (constante e hook fora do arquivo de componentes).
 */

export function Cartao({ children, style, onClick }: { children: ReactNode; style?: CSSProperties; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{
      background: COR.branco, borderRadius: M.raio, padding: '18px 18px', boxShadow: M.sombra,
      cursor: onClick ? 'pointer' : undefined, ...style,
    }}>{children}</div>
  )
}

/** Título do cartão e, à direita, um valor ou uma ação. */
export function TituloCartao({ children, direita }: { children: ReactNode; direita?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
      <h2 style={{ margin: 0, fontSize: M.titulo, fontWeight: 700, color: COR.texto }}>{children}</h2>
      {direita}
    </div>
  )
}

/** Ícone num círculo com o tom da cor (a 12% de opacidade). */
export function IconeRedondo({ icone, cor = COR.azul, tamanho = 44 }: { icone: ReactNode; cor?: string; tamanho?: number }) {
  return (
    <span aria-hidden style={{
      width: tamanho, height: tamanho, borderRadius: '50%', flexShrink: 0,
      background: `${cor.length === 7 ? cor : COR.azul}1f`,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(tamanho * 0.48),
    }}>{icone}</span>
  )
}

/** Uma linha de lista: ícone, nome, uma legenda curta, e o valor à direita. */
export function Linha({ icone, cor, titulo, legenda, direita, primeira, onClick }: {
  icone: ReactNode; cor?: string; titulo: ReactNode; legenda?: ReactNode; direita?: ReactNode
  primeira?: boolean; onClick?: () => void
}) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', minHeight: 48,
      borderTop: primeira ? 'none' : '1px solid #eef2f8', cursor: onClick ? 'pointer' : undefined,
    }}>
      <IconeRedondo icone={icone} cor={cor} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: M.corpo, fontWeight: 600, color: COR.texto, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titulo}</div>
        {legenda && <div style={{ fontSize: M.legenda, color: COR.textoSuave, marginTop: 2 }}>{legenda}</div>}
      </div>
      {direita}
    </div>
  )
}

/** Atalho redondo com rótulo embaixo — a fileira "Pix · Pagar · Transferir" dos bancos. */
export function Atalho({ icone, rotulo, onClick, destaque }: { icone: ReactNode; rotulo: string; onClick: () => void; destaque?: boolean }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0,
    }}>
      <span aria-hidden style={{
        width: 58, height: 58, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, background: destaque ? `linear-gradient(135deg,${COR.azul},#2563eb)` : COR.branco,
        color: destaque ? '#fff' : COR.texto, boxShadow: M.sombra,
      }}>{icone}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: COR.texto, textAlign: 'center', lineHeight: 1.2 }}>{rotulo}</span>
    </button>
  )
}

/** Botão em pílula. `forte` = azul cheio; senão, contorno. */
export function Pilula({ children, onClick, forte, disabled }: { children: ReactNode; onClick?: () => void; forte?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      border: forte ? 'none' : `1.5px solid ${COR.azul}`, background: forte ? COR.azul : '#eff6ff',
      color: forte ? '#fff' : COR.azul, borderRadius: 999, padding: '9px 16px', minHeight: 40,
      fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
    }}>{children}</button>
  )
}
