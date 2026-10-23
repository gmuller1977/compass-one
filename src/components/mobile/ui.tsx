import { type CSSProperties, type ReactNode } from 'react'
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

/** Uma coluna do Resumo do mês. `null` deixa a célula vazia. */
export interface ColunaResumo {
  inicial: number | null
  receitas: number | null
  despesas: number | null
  final: number | null
}

/**
 * "Resumo do mês" da Início (pedido do Guilherme, 23/10/2026): saldo inicial,
 * receitas, despesas e saldo final, previsto × realizado, e a meta de
 * economia com o atingimento. O atingimento é quanto o saldo subiu no mês
 * (final − inicial) contra a meta, a régua do "guardou de verdade" do
 * Planejamento. Os números chegam prontos; aqui só se divide pela meta.
 * Sem uma das colunas (mês futuro não tem realizado), ela some.
 */
export function ResumoDoMes({ mesNome, previsto, realizado, meta, oculto, onDefinirMeta }: {
  mesNome: string
  previsto: ColunaResumo | null
  realizado: ColunaResumo | null
  /** Meta de economia do mês (`objetivos`). 0 = sem meta. */
  meta: number
  oculto: boolean
  /** Sem meta, mostra "Definir meta". Sem a função, a linha da meta some. */
  onDefinirMeta?: () => void
}) {
  const v = (n: number | null) => (n === null ? '' : mostrar(n, oculto))
  const cols = [previsto && { rot: 'Previsto', c: previsto }, realizado && { rot: 'Realizado', c: realizado }]
    .filter((x): x is { rot: string; c: ColunaResumo } => !!x)
  const cab: CSSProperties = { fontSize: 13, fontWeight: 600, color: COR.textoSuave, textAlign: 'right' }
  const cel: CSSProperties = { fontSize: M.corpo, fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }
  // Traço de largura inteira entre os blocos (o columnGap cortaria um borderTop por célula).
  const traco = <span aria-hidden style={{ gridColumn: '1 / -1', height: 1, background: COR.borda, margin: '2px 0' }} />
  const rotulo = (t: string, extra?: CSSProperties) => <span style={{ fontSize: M.corpo, color: COR.texto, ...extra }}>{t}</span>
  const corSaldo = (n: number | null) => (n !== null && n < 0 ? COR.erroTexto : COR.texto)
  const atingimento = (c: ColunaResumo) =>
    meta > 0 && c.inicial !== null && c.final !== null ? (c.final - c.inicial) / meta : null
  const mostraMeta = meta > 0 || !!onDefinirMeta
  return (
    <div role="table" aria-label={`Resumo de ${mesNome}`} style={{
      display: 'grid', gridTemplateColumns: `1fr${' auto'.repeat(cols.length)}`, columnGap: 14, rowGap: 10, alignItems: 'baseline',
    }}>
      <span role="columnheader" />
      {cols.map(({ rot }) => <span key={rot} role="columnheader" style={cab}>{rot}</span>)}

      {rotulo('Saldo inicial')}
      {cols.map(({ rot, c }) => <span key={rot} style={{ ...cel, color: corSaldo(c.inicial) }}>{v(c.inicial)}</span>)}
      {rotulo('Receitas')}
      {cols.map(({ rot, c }) => <span key={rot} style={{ ...cel, color: COR.sucessoTexto }}>{v(c.receitas)}</span>)}
      {rotulo('Despesas')}
      {cols.map(({ rot, c }) => <span key={rot} style={{ ...cel, color: COR.erroTexto }}>{v(c.despesas)}</span>)}
      {traco}
      {rotulo('Saldo final', { fontWeight: 700 })}
      {cols.map(({ rot, c }) => <span key={rot} style={{ ...cel, fontWeight: 800, color: corSaldo(c.final) }}>{v(c.final)}</span>)}

      {mostraMeta && (
        <>
          {traco}
          {rotulo('Meta')}
          {meta > 0 ? (
            <span style={{ ...cel, gridColumn: `span ${cols.length}` }}>{v(meta)}</span>
          ) : (
            <span style={{ gridColumn: `span ${cols.length}`, textAlign: 'right' }}>
              <button onClick={onDefinirMeta} style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit',
                fontSize: M.corpo, fontWeight: 700, color: COR.azul,
              }}>Definir meta ›</button>
            </span>
          )}
          {meta > 0 && (
            <>
              {rotulo('Atingimento')}
              {cols.map(({ rot, c }) => {
                const a = atingimento(c)
                const pct = a === null ? null : Math.max(0, Math.round(a * 100))
                const ok = pct !== null && pct >= 100
                return (
                  <span key={rot} style={{ ...cel, color: ok ? COR.sucessoTexto : COR.texto }}>
                    {pct === null ? '' : oculto ? '••' : `${ok ? '✓ ' : ''}${pct}%`}
                  </span>
                )
              })}
              <span style={{ gridColumn: '1 / -1', fontSize: M.legenda, color: COR.textoSuave, marginTop: -4 }}>
                Quanto o saldo subiu no mês, contra a meta.
              </span>
            </>
          )}
        </>
      )}
    </div>
  )
}
