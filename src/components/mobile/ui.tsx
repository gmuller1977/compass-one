import { Fragment, type CSSProperties, type ReactNode } from 'react'
import { COR } from '../../utils/cores'
import { BOLINHA_AZUL, M, mostrar } from './estilo'
import { IconeCat } from '../IconeCat'
import { corDoIcone } from '../../utils/iconeDesenhado'

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
  // Texto gravado (emoji do cadastro) vira o ícone desenhado, na cor da categoria.
  const conteudo = typeof icone === 'string' ? <IconeCat icone={icone} cor={corDoIcone(cor)} /> : icone
  return (
    <span aria-hidden style={{
      width: tamanho, height: tamanho, borderRadius: '50%', flexShrink: 0,
      background: `${cor.length === 7 ? cor : COR.azul}1f`,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(tamanho * 0.48),
    }}>{conteudo}</span>
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

/**
 * Atalho redondo com rótulo embaixo — a fileira "Pix · Pagar · Transferir" dos
 * bancos. Bolinha no azul-escuro das caixas de Configurações (#0f2878 →
 * #1e40af) com ícone Tabler branco (`icone` = nome, ex. "ti-plus"), pedido do
 * Guilherme em 13/10/2026: o mesmo desenho em todo atalho do app.
 */
export function Atalho({ icone, rotulo, onClick }: { icone: string; rotulo: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0,
    }}>
      <span aria-hidden style={{
        width: 58, height: 58, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: BOLINHA_AZUL, boxShadow: '0 6px 16px rgba(15,40,120,.25)',
      }}><i className={`ti ${icone}`} style={{ color: '#fff', fontSize: 27 }} /></span>
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

export function Etiqueta({ children, cor, fundo }: { children: ReactNode; cor: string; fundo: string }) {
  return (
    <span style={{ fontSize: 13, fontWeight: 700, color: cor, background: fundo, borderRadius: 999,
      padding: '4px 10px', whiteSpace: 'nowrap' }}>{children}</span>
  )
}

export function Valor({ children, cor = COR.texto }: { children: ReactNode; cor?: string }) {
  return (
    <span style={{ fontSize: M.corpo, fontWeight: 700, color: cor, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
      {children}
    </span>
  )
}

/** Barra curta do quanto da categoria já foi: verde, e verde-escuro perto do fim (as cores do Radar no claro). */
export function Barrinha({ p }: { p: number }) {
  const perc = Math.min(1, Math.max(0, p))
  return (
    <span role="img" aria-label={`${Math.round(p * 100)}% usado`} style={{
      display: 'block', width: 56, height: 8, borderRadius: 4, background: '#e2e8f0', overflow: 'hidden', flexShrink: 0,
    }}>
      <span style={{ display: 'block', height: '100%', width: `${perc * 100}%`, borderRadius: 4,
        background: p >= 0.9 ? '#18713a' : '#22c55e' }} />
    </span>
  )
}

export function OlhoIcone({ fechado }: { fechado: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {fechado && <path d="M3 3l18 18" />}
    </svg>
  )
}

/** Os três cenários da previsão, em pílulas sobre o topo azul. */
export function SeletorCenario({ valor, onEscolher }: {
  valor: 'pessimista' | 'moderado' | 'otimista'; onEscolher: (c: 'pessimista' | 'moderado' | 'otimista') => void
}) {
  return (
    <div role="radiogroup" aria-label="Cenário da previsão" style={{ display: 'flex', gap: 6, width: '100%' }}>
      {(['pessimista', 'moderado', 'otimista'] as const).map(c => {
        const ativo = valor === c
        return (
          <button key={c} role="radio" aria-checked={ativo} onClick={() => onEscolher(c)} style={{
            flex: 1, minHeight: 36, borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 14, fontWeight: 700, background: ativo ? '#fff' : 'rgba(255,255,255,.14)',
            color: ativo ? '#1e3a8a' : '#fff',
          }}>{c.charAt(0).toUpperCase() + c.slice(1)}</button>
        )
      })}
    </div>
  )
}

/**
 * Previsto × realizado de receitas e despesas, com o resultado. Sem plano, a
 * coluna Previsto fica vazia. Os números chegam prontos (useMesDaInicio).
 */
export function PrevistoRealizado({ mesNome, linhas, comPlano, oculto, rotuloReal = 'Realizado' }: {
  mesNome: string
  /** [rótulo, previsto, realizado]: receitas primeiro, despesas depois. */
  linhas: [[string, number, number], [string, number, number]]
  comPlano: boolean
  oculto: boolean
  rotuloReal?: string
}) {
  const v = (n: number) => mostrar(n, oculto)
  const [[, prevE, realE], [, prevS, realS]] = linhas
  const cab: CSSProperties = { fontSize: 13, fontWeight: 600, color: COR.textoSuave, textAlign: 'right' }
  const cel: CSSProperties = { fontSize: M.corpo, fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }
  const linhaTotal: CSSProperties = { borderTop: `1px solid ${COR.borda}`, paddingTop: 10 }
  return (
    <div role="table" aria-label={`Previsto e realizado de ${mesNome}`} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', columnGap: 14, rowGap: 10, alignItems: 'baseline' }}>
      <span role="columnheader" />
      <span role="columnheader" style={cab}>{comPlano ? 'Previsto' : ''}</span>
      <span role="columnheader" style={cab}>{rotuloReal}</span>
      {linhas.map(([rot, prev, real], i) => (
        <Fragment key={rot}>
          <span style={{ fontSize: M.corpo, color: COR.texto }}>{rot}</span>
          <span style={{ ...cel, color: COR.textoSuave }}>{comPlano ? v(prev) : ''}</span>
          <span style={{ ...cel, color: i === 0 ? COR.sucessoTexto : COR.erroTexto }}>{v(real)}</span>
        </Fragment>
      ))}
      <span style={{ fontSize: M.corpo, fontWeight: 700, color: COR.texto, ...linhaTotal }}>Resultado</span>
      <span style={{ ...cel, color: COR.textoSuave, ...linhaTotal }}>{comPlano ? v(prevE - prevS) : ''}</span>
      <span style={{ ...cel, fontWeight: 800, ...linhaTotal, color: realE - realS < 0 ? COR.erroTexto : COR.sucessoTexto }}>{v(realE - realS)}</span>
    </div>
  )
}
