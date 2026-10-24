import { type CSSProperties, type ReactNode } from 'react'
import { COR } from '../../utils/cores'
import { BOLINHA_AZUL, M, mostrar, TOPO_AZUL } from './estilo'
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
 * economia com o atingimento. Receitas e despesas são um gráfico de barras
 * planejado × realizado na mesma escala (mesmo dia, pedido dele: a barra de
 * atingimento "não faz sentido"); o atingimento é a barra de progresso
 * da meta, com "Você já guardou R$ X da meta" quando o realizado subiu. O atingimento é quanto o saldo subiu no mês
 * (final − inicial) contra a meta, a régua do "guardou de verdade" do
 * Planejamento. Os números chegam prontos; aqui só se divide pela meta.
 * Sem uma das colunas (mês futuro não tem realizado), ela some.
 *
 * O cartão é o azul-escuro do topo (mesmo dia, pedido dele: "chamar mais
 * atenção, seguindo o modelo desta tela"), com a paleta de fundo escuro do
 * CLAUDE.md. Dentro das caixas translúcidas (mais claras que #1e40af) só vai
 * branco, rótulo a 85% e o #fdba74 do negativo: 6,9 / 5,5 / 3,8 (22px em negrito, texto grande).
 */
export function ResumoDoMes({ mesNome, previsto, realizado, meta, oculto, onDefinirMeta }: {
  mesNome: string
  previsto: ColunaResumo | null
  realizado: ColunaResumo | null
  /** Meta de economia do mês (`objetivos`). 0 = sem meta. */
  meta: number
  oculto: boolean
  /** Sem meta, mostra "Definir meta". Sem a função, a parte da meta some. */
  onDefinirMeta?: () => void
}) {
  const v = (n: number | null) => (n === null ? '' : mostrar(n, oculto))
  const cols = [previsto && { rot: 'Previsto', c: previsto }, realizado && { rot: 'Realizado', c: realizado }]
    .filter((x): x is { rot: string; c: ColunaResumo } => !!x)
  const ROT = 'rgba(255,255,255,.75)'
  const ROT_CAIXA = 'rgba(255,255,255,.85)'
  const NEG = '#c2410c'
  const caixa: CSSProperties = {
    background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.16)', borderRadius: 16,
    padding: '12px 14px', minWidth: 0,
  }
  const num: CSSProperties = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }
  const cel: CSSProperties = { ...num, fontSize: M.corpo, fontWeight: 700, textAlign: 'right' }
  const inicial = cols[0]?.c.inicial ?? null
  const atingimento = (c: ColunaResumo) =>
    meta > 0 && c.inicial !== null && c.final !== null ? Math.max(0, Math.round(((c.final - c.inicial) / meta) * 100)) : null
  const mostraMeta = meta > 0 || !!onDefinirMeta
  // Cada caractere em 800 ocupa ~0,56 em: o texto inteiro cabe na largura da caixa.
  const tamanhoSaldo = (t: string) => `min(22px, ${(100 / (Math.max(t.length, 8) * 0.56)).toFixed(2)}cqi)`
  const escala = Math.max(0, ...cols.flatMap(({ c }) => [c.receitas ?? 0, c.despesas ?? 0]))
  return (
    <section aria-label={`Resumo de ${mesNome}`} style={{
      background: TOPO_AZUL, borderRadius: M.raio, padding: '18px 18px 20px', boxShadow: M.sombra, color: '#fff',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <span aria-hidden style={{
          width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,.14)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><i className="ti ti-report-money" style={{ fontSize: 22, color: '#fff' }} /></span>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: M.titulo, fontWeight: 700 }}>Resumo do mês</h2>
          {inicial !== null && (
            <div style={{ fontSize: M.legenda, color: ROT, marginTop: 2 }}>
              {mesNome} começou com <b style={{ color: '#fff', ...num }}>{v(inicial)}</b>
            </div>
          )}
        </div>
      </div>

      {/* O saldo final em destaque: o que o mês deve deixar e o que deixou até agora. */}
      <div style={{ fontSize: 13, fontWeight: 600, color: ROT, marginBottom: 8 }}>Saldo final</div>
      {/* Até R$ 999.999,99 (pedido do Guilherme, 23/10/2026), sempre lado a lado: a letra
          encolhe com a largura da caixa (cqi) e o tamanho do texto, até no máximo 22px. */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))`, gap: 10 }}>
        {cols.map(({ rot, c }) => (
          <div key={rot} style={{ ...caixa, containerType: 'inline-size' }}>
            <div style={{ fontSize: M.legenda, color: ROT_CAIXA }}>{rot}</div>
            <div style={{ ...num, fontSize: tamanhoSaldo(v(c.final)), fontWeight: 800, marginTop: 4, color: '#fff' }}>
              {v(c.final)}
            </div>
          </div>
        ))}
      </div>

      {/* Receitas e despesas: gráfico de barras, planejado × realizado, na mesma escala. */}
      <div style={{ fontSize: 13, fontWeight: 600, color: ROT, marginTop: 18, marginBottom: 2 }}>Planejado × realizado</div>
      {([['Receitas', 'receitas', '#86efac'], ['Despesas', 'despesas', NEG]] as const).map(([nome, campo, cor]) => {
        const barras = cols.filter(({ c }) => c[campo] !== null)
        return (
          <div key={campo} role="group" aria-label={nome} style={{ marginTop: 12 }}>
            <div style={{ fontSize: M.corpo, fontWeight: 600, marginBottom: 6 }}>{nome}</div>
            {barras.length === 0 && <div style={{ fontSize: M.legenda, color: ROT }}>sem plano neste mês</div>}
            {barras.map(({ rot, c }) => {
              const valor = c[campo] ?? 0
              const pct = escala > 0 ? Math.max(0, Math.min(100, (valor / escala) * 100)) : 0
              const planejado = rot === 'Previsto'
              return (
                <div key={rot} style={{ display: 'grid', gridTemplateColumns: '72px minmax(0, 1fr) auto', alignItems: 'center', gap: 10, marginTop: 6 }}>
                  <span style={{ fontSize: M.legenda, color: ROT }}>{planejado ? 'Planejado' : 'Realizado'}</span>
                  {/* Planejado vazado (borda branca), realizado cheio na cor do tipo: 3:1 de elemento gráfico. */}
                  <div aria-hidden style={{ height: 14, borderRadius: 999, background: 'rgba(15,23,42,.4)', overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`, height: '100%', borderRadius: 999, boxSizing: 'border-box',
                      ...(planejado ? { border: '2px solid #fff', background: 'rgba(255,255,255,.18)' } : { background: cor }),
                    }} />
                  </div>
                  <span style={{ ...cel, fontSize: 14, color: '#fff' }}>{v(valor)}</span>
                </div>
              )
            })}
          </div>
        )
      })}

      {mostraMeta && (
        <div style={{ ...caixa, marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontSize: M.corpo, fontWeight: 600 }}>Meta de economia</span>
            {meta > 0 ? (
              <span style={{ ...num, fontSize: 18, fontWeight: 800 }}>{v(meta)}</span>
            ) : (
              <button onClick={onDefinirMeta} style={{
                background: '#fff', color: '#1e3a8a', border: 'none', borderRadius: 999, padding: '6px 14px',
                fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
              }}>Definir meta</button>
            )}
          </div>
          {meta > 0 && (() => {
            // O que já foi guardado: o realizado; sem ele (mês futuro), o previsto.
            const c = (realizado ?? previsto)
            const pct = c ? atingimento(c) : null
            if (!c || pct === null) return null
            const guardado = realizado && c.inicial !== null && c.final !== null ? c.final - c.inicial : 0
            const ok = pct >= 100
            return (
              <>
                {guardado > 0 && (
                  <div style={{ fontSize: 14, color: ROT_CAIXA, marginTop: 8 }}>
                    Você já guardou <b style={{ ...num, color: '#fff' }}>{v(guardado)}</b> da meta
                  </div>
                )}
                {/* Barra no desenho das do Radar: trilho escuro e borda branca nos 100%. */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                  <div role="progressbar" aria-valuenow={Math.min(100, pct)} aria-valuemin={0} aria-valuemax={100}
                    aria-label="Atingimento da meta" style={{
                      flex: 1, height: 12, borderRadius: 999, border: '2px solid #fff',
                      background: 'rgba(15,23,42,.4)', overflow: 'hidden',
                    }}>
                    <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: ok ? '#86efac' : '#fff' }} />
                  </div>
                  <b style={{ ...num, fontSize: 14 }}>{oculto ? '••' : `${ok ? '✓ ' : ''}${pct}%`}</b>
                </div>
              </>
            )
          })()}
        </div>
      )}
    </section>
  )
}
