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
        background: BOLINHA_AZUL, boxShadow: 'var(--cx-bolinha)',
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
export function ResumoDoMes({ mesNome, previsto, realizado, meta, oculto, onDefinirMeta, investido = 0 }: {
  mesNome: string
  previsto: ColunaResumo | null
  realizado: ColunaResumo | null
  /** Meta de economia do mês (`objetivos`). 0 = sem meta. */
  meta: number
  oculto: boolean
  /** Sem meta, mostra "Definir meta". Sem a função, a parte da meta some. */
  onDefinirMeta?: () => void
  /** Aplicado nos investimentos no mês (líquido): conta como guardado no
   *  realizado (28/10/2026, "meta é o mesmo que investir"). */
  investido?: number
}) {
  const v = (n: number | null) => (n === null ? '' : mostrar(n, oculto))
  const cols = [previsto && { rot: 'Previsto', c: previsto }, realizado && { rot: 'Realizado', c: realizado }]
    .filter((x): x is { rot: string; c: ColunaResumo } => !!x)
  const ROT = 'rgba(255,255,255,.75)'
  const ROT_CAIXA = 'rgba(255,255,255,.85)'
  const caixa: CSSProperties = {
    background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.16)', borderRadius: 16,
    padding: '12px 14px', minWidth: 0,
  }
  const num: CSSProperties = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }
  const inicial = cols[0]?.c.inicial ?? null
  const guardouNa = (c: ColunaResumo) =>
    c.inicial !== null && c.final !== null ? c.final - c.inicial + (c === realizado ? investido : 0) : null
  const atingimento = (c: ColunaResumo) => {
    const g = guardouNa(c)
    return meta > 0 && g !== null ? Math.max(0, Math.round((g / meta) * 100)) : null
  }
  const mostraMeta = meta > 0 || !!onDefinirMeta
  // Cada caractere em 800 ocupa ~0,56 em: o texto inteiro cabe na largura da caixa.
  const tamanhoSaldo = (t: string) => `min(22px, ${(100 / (Math.max(t.length, 8) * 0.56)).toFixed(2)}cqi)`
  return (
    <section aria-label={`Resumo de ${mesNome}`} style={{
      background: TOPO_AZUL, borderRadius: M.raio, padding: '18px 18px 20px', boxShadow: 'var(--cx-brilho)', color: '#fff',
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

      {/* Receitas e despesas em ANÉIS (24/10/2026, Guilherme escolheu a opção A):
          quanto do planejado já entrou e já saiu, em %. Trilho branco e azul neon,
          o desenho dos gráficos em card azul. Sem plano ou sem realizado, o anel
          fica vazio e só o valor aparece. Logo abaixo do título, alinhados com os
          anéis do "Plano do mês" ao lado (mesmo dia, pedido dele). */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {([['Receitas', 'receitas', 'recebido', '#0891b2'], ['Despesas', 'despesas', 'gasto', '#2563eb']] as const).map(([nome, campo, verbo, cor]) => {
          const plan = previsto?.[campo] ?? null
          const real = realizado?.[campo] ?? null
          const pct = plan !== null && plan > 0 && real !== null ? Math.round((real / plan) * 100) : null
          return (
            <div key={campo} role="group" aria-label={nome} style={{ textAlign: 'center', minWidth: 0 }}>
              <Anel pct={pct} cor={cor} rotulo={pct === null ? '' : verbo} oculto={oculto} />
              <div style={{ fontSize: M.legenda, color: ROT, marginTop: 6 }}>{nome}</div>
              <div style={{ ...num, fontSize: M.corpo, fontWeight: 800 }}>{v(real ?? plan)}</div>
              {real !== null && plan !== null && plan > 0 && (
                <div style={{ ...num, fontSize: M.legenda, color: ROT }}>de {v(plan)}</div>
              )}
              {real === null && plan !== null && <div style={{ fontSize: M.legenda, color: ROT }}>planejado</div>}
              {plan === null && real !== null && <div style={{ fontSize: M.legenda, color: ROT }}>sem plano</div>}
            </div>
          )
        })}
      </div>

      {/* O saldo final em destaque: o que o mês deve deixar e o que deixou até agora. */}
      <div style={{ fontSize: 13, fontWeight: 600, color: ROT, marginTop: 18, marginBottom: 8 }}>Saldo final</div>
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

      {/* A meta no QUADRO NEON (mesmo dia, da opção C): moldura ciano e o
          velocímetro do atingimento. */}
      {mostraMeta && (() => {
        const c = realizado ?? previsto
        const pct = meta > 0 && c ? atingimento(c) : null
        const guardado = realizado && c ? guardouNa(c) ?? 0 : 0
        const ok = pct !== null && pct >= 100
        return (
          <div style={{
            marginTop: 18, padding: '14px 16px', borderRadius: 18, border: '1.5px solid #22d3ee',
            boxShadow: '0 0 18px rgba(34,211,238,.45), inset 0 0 18px rgba(34,211,238,.15)',
          }}>
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
            {pct !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
                <Velocimetro pct={pct} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: M.corpo }}>
                    {oculto ? '••' : ok ? `Meta batida: ${pct}%` : `${pct}% da meta`}
                  </div>
                  {guardado > 0 && (
                    <div style={{ fontSize: 14, color: ROT_CAIXA }}>
                      Você já guardou <b style={{ ...num, color: '#fff' }}>{v(guardado)}</b>
                      {investido > 0.005 && <> · {v(investido)} em investimentos</>}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })()}
    </section>
  )
}

/** Anel do Resumo do mês: trilho branco, arco azul neon até 100%; o texto diz o % real. */
export function Anel({ pct, cor, rotulo, oculto, centro }: {
  pct: number | null; cor: string; rotulo: string; oculto: boolean
  /** Texto no meio do anel; sem ele, o próprio %. */
  centro?: string
}) {
  const r = 46, c = 2 * Math.PI * r
  const arco = pct === null ? 0 : Math.max(0, Math.min(100, pct)) / 100 * c
  return (
    <svg width="116" height="116" viewBox="0 0 116 116" role="img"
      aria-label={pct === null ? 'sem comparação' : `${centro ?? `${pct}%`} ${rotulo}`} style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}>
      <circle cx="58" cy="58" r={r} stroke="#fff" strokeWidth="11" fill="none" />
      {arco > 0 && (
        <circle cx="58" cy="58" r={r} stroke={cor} strokeWidth="11" fill="none" strokeLinecap="round"
          strokeDasharray={`${arco} ${c}`} transform="rotate(-90 58 58)" style={{ filter: 'drop-shadow(0 0 5px #22d3ee)' }} />
      )}
      {pct !== null && (
        <>
          <text x="58" y="58" textAnchor="middle" fill="#fff" fontSize="21" fontWeight="800">{centro ?? (oculto ? '••' : `${pct}%`)}</text>
          <text x="58" y="77" textAnchor="middle" fill="rgba(255,255,255,.8)" fontSize="12">{rotulo}</text>
        </>
      )}
    </svg>
  )
}

/** Velocímetro da meta no quadro neon: meio anel, cheio a partir de 100%. */
function Velocimetro({ pct }: { pct: number }) {
  const r = 26, c = Math.PI * r
  const arco = Math.max(0, Math.min(100, pct)) / 100 * c
  return (
    <svg width="64" height="40" viewBox="0 0 64 40" aria-hidden style={{ flexShrink: 0, overflow: 'visible' }}>
      <path d="M6 36a26 26 0 0 1 52 0" stroke="#fff" strokeWidth="8" fill="none" strokeLinecap="round" />
      {arco > 0 && (
        <path d="M6 36a26 26 0 0 1 52 0" stroke="#0891b2" strokeWidth="8" fill="none" strokeLinecap="round"
          strokeDasharray={`${arco} ${c}`} style={{ filter: 'drop-shadow(0 0 4px #22d3ee)' }} />
      )}
    </svg>
  )
}
