import { useState, useMemo } from 'react'
import { iconeCategoria } from '../../utils/categoriaIcone'
import PlanCelulaEditavel from './PlanCelulaEditavel'
import PlanBarraFerramentas from './PlanBarraFerramentas'
import { type BulkOp } from './PlanFerramentas'
import {
  fmt, MESES, nomeExibicao, MOTIVO_PLANO_LOCKADO,
  PREVISTO, tituloValor, type AnoData, type Cat, type Saldos,
} from './types'
import { COR } from '../../utils/cores'
import type { Categoria } from '../../context/AppContext'

interface Props {
  anoAtual: number
  mesAtual: number
  dadosAtivos: AnoData
  previsto: Saldos
  categorias: Categoria[]
  onSave: (tipo: 'e' | 's', ri: number, mi: number, valor: number) => void
  onBulkSave: (ops: BulkOp[]) => void
  objetivos: number[]
  sobraPrevista: number[]
  onMetaSave: (objetivos: number[]) => void
  dadosAnoAnterior: AnoData | null
}

const SEM_GRUPO = '__sem_grupo__'

const W_CATS = 210
const W_MES = 128

const H_CAB = 34   // cabeçalho de mês
const H_RES = 28   // linha de resumo
const H_META = 32  // faixa da meta
const H_GRP = 26   // cabeçalho de grupo
const H_CAT = 32   // categoria

/**
 * Empilhamento. A ordem importa e não é óbvia: uma FAIXA presa no topo ou no
 * rodapé tem de cobrir os RÓTULOS presos à esquerda, senão o nome de uma
 * categoria passa por cima do cabeçalho de meses ao rolar. E o canto onde as
 * duas se cruzam tem de cobrir as duas.
 */
const Z = { canto: 6, faixa: 5, rotulo: 3 }

const AZUL = 'linear-gradient(135deg,#0f2878,#1e40af)'

type LinhaCat =
  | { k: 'grupo'; tipo: 'e' | 's'; grupo: string; ris: number[] }
  | { k: 'cat'; tipo: 'e' | 's'; ri: number; cat: Cat }

/** `ri` é sempre o índice na lista ORIGINAL — é por ele que onSave grava. */
function agrupar(cats: Cat[], tipo: 'e' | 's'): LinhaCat[] {
  const porGrupo = new Map<string, { ri: number; cat: Cat }[]>()
  cats.forEach((cat, ri) => {
    const g = cat.grupo ?? SEM_GRUPO
    if (!porGrupo.has(g)) porGrupo.set(g, [])
    porGrupo.get(g)!.push({ ri, cat })
  })
  const ordenados = [...porGrupo.entries()].sort(([a], [b]) =>
    a === SEM_GRUPO ? 1 : b === SEM_GRUPO ? -1 : a.localeCompare(b, 'pt-BR'))
  const temGrupoReal = ordenados.some(([g]) => g !== SEM_GRUPO)

  const out: LinhaCat[] = []
  for (const [grupo, items] of ordenados) {
    if (temGrupoReal) out.push({ k: 'grupo', tipo, grupo, ris: items.map(i => i.ri) })
    for (const { ri, cat } of items) out.push({ k: 'cat', tipo, ri, cat })
  }
  return out
}

/**
 * O Planejamento em painel: resumo em cima, detalhe embaixo do acordeão.
 *
 * Difere da Planilha em três coisas, e é por elas que ela existe em separado —
 * a Planilha continua onde estava, para quem já se acostumou com ela.
 *
 * 1. Receitas e Despesas são LINHAS DO RESUMO que abrem. Não há duas regiões
 *    empilhadas: o detalhe nasce de dentro do total que ele explica.
 *
 * 2. Saldo final, Resultado e Meta ficam presos no rodapé. Ao rolar a lista de
 *    categorias, o fechamento do mês não sai da vista — que é o número contra o
 *    qual se está editando.
 *
 * 3. Mês passado sem nada planejado some. Quem quiser planejar o passado liga o
 *    interruptor e ele volta.
 *
 * O grude é `position: sticky` num único container com as duas rolagens, e não
 * três painéis sincronizados por JS como na Planilha. Uma barra de cada eixo,
 * na borda de fora, e o alinhamento sai de graça.
 */
export default function PlanPainel({
  anoAtual, mesAtual, dadosAtivos, previsto, categorias,
  onSave, onBulkSave, objetivos, sobraPrevista, onMetaSave, dadosAnoAnterior,
}: Props) {
  const [abertoE, setAbertoE] = useState(false)
  const [abertoS, setAbertoS] = useState(true)
  const [mostrarPassado, setMostrarPassado] = useState(false)

  const anoCorrente = new Date().getFullYear()
  const temAlgumaMeta = objetivos.some(v => v > 0)

  const linhasE = useMemo(() => agrupar(dadosAtivos.entradas, 'e'), [dadosAtivos.entradas])
  const linhasS = useMemo(() => agrupar(dadosAtivos.saidas, 's'), [dadosAtivos.saidas])

  // Mês passado sem nada planejado não ajuda a planejar e come largura. Olha o
  // PLANO, não os totais: um mês fechado mostra realizado, e um gasto que
  // aconteceu sem ter sido planejado não é planejamento.
  const { meses, escondidos } = useMemo(() => {
    const temPlano = (mi: number) =>
      dadosAtivos.entradas.some(c => (c.v[mi] ?? 0) > 0) ||
      dadosAtivos.saidas.some(c => (c.v[mi] ?? 0) > 0)
    const passado = (mi: number) =>
      anoAtual < anoCorrente || (anoAtual === anoCorrente && mi < mesAtual)

    const todos = Array.from({ length: 12 }, (_, i) => i)
    const ocultos = todos.filter(mi => passado(mi) && !temPlano(mi))
    return {
      meses: mostrarPassado ? todos : todos.filter(mi => !ocultos.includes(mi)),
      escondidos: ocultos.length,
    }
  }, [dadosAtivos, anoAtual, anoCorrente, mesAtual, mostrarPassado])

  const colunas = `${W_CATS}px repeat(${meses.length}, ${W_MES}px)`

  // Rodapé preso: cada linha para na altura das que vêm depois dela.
  const baseMeta = 0
  const baseResultado = temAlgumaMeta ? H_META : 0
  const baseSaldoFinal = baseResultado + H_RES

  const rotulo = (conteudo: React.ReactNode, extra: React.CSSProperties = {}) => (
    <div style={{
      position: 'sticky', left: 0, zIndex: Z.rotulo, background: AZUL,
      display: 'flex', alignItems: 'center', padding: '0 14px',
      fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.75)',
      borderRight: '1px solid rgba(255,255,255,0.12)',
      ...extra,
    }}>{conteudo}</div>
  )

  return (
    <div style={{ padding: '8px 16px' }}>
      <PlanBarraFerramentas
        mesAtual={mesAtual}
        anoAtual={anoAtual}
        dadosAtivos={dadosAtivos}
        dadosAnoAnterior={dadosAnoAnterior}
        categorias={categorias}
        onBulkSave={onBulkSave}
        objetivos={objetivos}
        sobraPrevista={sobraPrevista}
        onMetaSave={onMetaSave}
        bloqueado={false}
        motivoBloqueio={MOTIVO_PLANO_LOCKADO}
      />

      {escondidos > 0 && (
        <label style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer',
          fontSize: 12, color: COR.textoSuave, marginBottom: 8,
        }}>
          <input type="checkbox" checked={mostrarPassado}
            onChange={e => setMostrarPassado(e.target.checked)} />
          Mostrar {escondidos === 1 ? 'o mês passado' : `os ${escondidos} meses passados`} sem planejamento
        </label>
      )}

      {meses.length === 0 ? (
        <div style={{
          background: COR.branco, border: `1px solid ${COR.borda}`, borderRadius: 10,
          padding: '28px 24px', textAlign: 'center', color: COR.textoSuave, fontSize: 13,
        }}>
          Nenhum mês para mostrar em {anoAtual}.
        </div>
      ) : (
        <div style={{
          overflow: 'auto', maxHeight: '68vh',
          border: `1px solid ${COR.borda}`, borderRadius: 10, background: '#0f2878',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: colunas, width: 'max-content' }}>

            {/* ── Cabeçalho: meses ─────────────────────────────────────── */}
            {rotulo('RESUMO', {
              position: 'sticky', top: 0, zIndex: Z.canto, height: H_CAB,
              fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '.5px',
              borderBottom: '1px solid rgba(255,255,255,0.12)',
            })}
            {meses.map(mi => {
              const isAtual = mi === mesAtual && anoAtual === anoCorrente
              return (
                <div key={`cab-${mi}`} style={{
                  position: 'sticky', top: 0, zIndex: Z.faixa, background: AZUL,
                  height: H_CAB, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 4, fontSize: 12, fontWeight: 700,
                  color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.12)',
                  boxShadow: isAtual ? 'inset 0 -2px 0 #86efac' : undefined,
                }}>
                  {MESES[mi]}
                  {isAtual && (
                    <span style={{
                      fontSize: 7, fontWeight: 700, background: 'rgba(255,255,255,0.25)',
                      padding: '1px 4px', borderRadius: 4,
                    }}>ATUAL</span>
                  )}
                </div>
              )
            })}

            {/* ── Saldo inicial ────────────────────────────────────────── */}
            {rotulo('Saldo inicial', {
              position: 'sticky', top: H_CAB, zIndex: Z.canto, height: H_RES,
            })}
            {meses.map(mi => (
              <div key={`si-${mi}`} title={tituloValor(previsto.inicialReal[mi])}
                style={{
                  position: 'sticky', top: H_CAB, zIndex: Z.faixa, background: AZUL,
                  height: H_RES, display: 'flex', alignItems: 'center',
                  justifyContent: 'flex-end', padding: '0 10px', fontSize: 12,
                  fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#fff',
                  ...(previsto.inicialReal[mi] ? {} : PREVISTO),
                }}>
                {fmt(previsto.saldoInicial[mi], true)}
              </div>
            ))}

            {/* ── Receitas e Despesas, cada uma abrindo o próprio detalhe ─ */}
            <Secao
              tipo="e" titulo="Receitas" aberto={abertoE} onToggle={() => setAbertoE(v => !v)}
              linhas={linhasE} cats={dadosAtivos.entradas} totais={previsto.totalEntradas}
              meses={meses} categorias={categorias} onSave={onSave}
              realizadoAte={previsto.realizadoAte} cor="#86efac"
            />
            <Secao
              tipo="s" titulo="Despesas" aberto={abertoS} onToggle={() => setAbertoS(v => !v)}
              linhas={linhasS} cats={dadosAtivos.saidas} totais={previsto.totalSaidas}
              meses={meses} categorias={categorias} onSave={onSave}
              realizadoAte={previsto.realizadoAte} cor="#fde047"
            />

            {/* ── Rodapé preso ─────────────────────────────────────────── */}
            {rotulo('Saldo final', {
              position: 'sticky', bottom: baseSaldoFinal, left: 0, zIndex: Z.canto,
              height: H_RES, borderTop: '1px solid rgba(255,255,255,0.14)',
            })}
            {meses.map(mi => (
              <div key={`sf-${mi}`} title={tituloValor(previsto.finalReal[mi])}
                style={{
                  position: 'sticky', bottom: baseSaldoFinal, zIndex: Z.faixa, background: AZUL,
                  height: H_RES, display: 'flex', alignItems: 'center',
                  justifyContent: 'flex-end', padding: '0 10px', fontSize: 12,
                  fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                  color: previsto.saldoFinal[mi] < 0 ? '#fde047' : '#fff',
                  borderTop: '1px solid rgba(255,255,255,0.14)',
                  ...(previsto.finalReal[mi] ? {} : PREVISTO),
                }}>
                {fmt(previsto.saldoFinal[mi], true)}
              </div>
            ))}

            {rotulo('Resultado', {
              position: 'sticky', bottom: baseResultado, left: 0, zIndex: Z.canto,
              height: H_RES, fontWeight: 700, color: '#fff',
            })}
            {meses.map(mi => {
              const res = previsto.totalEntradas[mi] - previsto.totalSaidas[mi]
              return (
                <div key={`res-${mi}`} style={{
                  position: 'sticky', bottom: baseResultado, zIndex: Z.faixa, background: AZUL,
                  height: H_RES, display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  padding: '0 10px', fontSize: 12, fontWeight: 800,
                  fontVariantNumeric: 'tabular-nums',
                  color: res >= 0 ? '#86efac' : '#fde047',
                  ...(mi <= previsto.realizadoAte ? {} : PREVISTO),
                }}>
                  {res === 0 ? '—' : `${res > 0 ? '+' : ''}${fmt(res, true)}`}
                </div>
              )
            })}

            {temAlgumaMeta && (
              <>
                {rotulo('🎯 Meta', {
                  position: 'sticky', bottom: baseMeta, left: 0, zIndex: Z.canto,
                  height: H_META,
                })}
                {meses.map(mi => {
                  const meta = objetivos[mi] ?? 0
                  const res = previsto.totalEntradas[mi] - previsto.totalSaidas[mi]
                  const perc = meta > 0 ? Math.max(0, Math.min(100, (res / meta) * 100)) : 0
                  const fill = perc >= 100 ? '#4ade80' : perc >= 70 ? '#fbbf24' : '#f87171'
                  return (
                    <div key={`meta-${mi}`} style={{
                      position: 'sticky', bottom: baseMeta, zIndex: Z.faixa, background: AZUL,
                      height: H_META, padding: '0 10px', display: 'flex',
                      flexDirection: 'column', justifyContent: 'center', gap: 3,
                    }}>
                      {meta > 0 ? (
                        <>
                          <div style={{ height: 4, background: 'rgba(255,255,255,0.18)',
                            borderRadius: 6, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${perc}%`, background: fill,
                              borderRadius: 6, transition: 'width .3s' }} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between',
                            fontSize: 8, color: 'rgba(255,255,255,0.75)',
                            fontVariantNumeric: 'tabular-nums' }}>
                            <span>{fmt(meta, true)}</span>
                            <span>{Math.round(perc)}%</span>
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)',
                          textAlign: 'right' }}>sem meta</div>
                      )}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, color: COR.textoSuave, marginTop: 8, lineHeight: 1.5 }}>
        Clique em <b>Receitas</b> ou <b>Despesas</b> para abrir as categorias.
        Número em <span style={PREVISTO}>itálico</span> é previsto.
      </div>
    </div>
  )
}

// ── Uma seção do resumo, com o detalhe que nasce dela ────────────────────

function Secao({
  tipo, titulo, aberto, onToggle, linhas, cats, totais, meses, categorias,
  onSave, realizadoAte, cor,
}: {
  tipo: 'e' | 's'
  titulo: string
  aberto: boolean
  onToggle: () => void
  linhas: LinhaCat[]
  cats: Cat[]
  totais: number[]
  meses: number[]
  categorias: Categoria[]
  onSave: (tipo: 'e' | 's', ri: number, mi: number, valor: number) => void
  realizadoAte: number
  cor: string
}) {
  return (
    <>
      {/* A linha do resumo é o próprio botão do acordeão */}
      <div onClick={onToggle} style={{
        position: 'sticky', left: 0, zIndex: Z.rotulo, background: AZUL, cursor: 'pointer',
        height: H_RES, display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px',
        fontSize: 11, fontWeight: 700, color: '#fff', userSelect: 'none',
        borderRight: '1px solid rgba(255,255,255,0.12)',
      }}>
        <span style={{
          fontSize: 9, display: 'inline-block', transition: 'transform .2s',
          transform: aberto ? 'rotate(90deg)' : 'none',
        }}>▶</span>
        {titulo}
      </div>
      {meses.map(mi => (
        <div key={`${tipo}-tot-${mi}`} onClick={onToggle} style={{
          height: H_RES, display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          padding: '0 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          fontVariantNumeric: 'tabular-nums', color: cor,
          ...(mi <= realizadoAte ? {} : PREVISTO),
        }}>
          {fmt(totais[mi], true)}
        </div>
      ))}

      {aberto && linhas.map((l, li) => {
        if (l.k === 'grupo') {
          const soma = (mi: number) => l.ris.reduce((s, ri) => s + (cats[ri]?.v[mi] ?? 0), 0)
          return (
            <div key={`${tipo}-g-${li}`} style={{ display: 'contents' }}>
              <div style={{
                position: 'sticky', left: 0, zIndex: Z.rotulo, background: '#132f6b',
                height: H_GRP, display: 'flex', alignItems: 'center',
                padding: '0 14px 0 30px', fontSize: 9, fontWeight: 800,
                letterSpacing: '.5px', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.65)',
                borderRight: '1px solid rgba(255,255,255,0.12)',
                overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
              }}>
                {l.grupo === SEM_GRUPO ? 'Outros' : l.grupo}
              </div>
              {meses.map(mi => (
                <div key={`${tipo}-g-${li}-${mi}`} style={{
                  height: H_GRP, background: '#132f6b', display: 'flex', alignItems: 'center',
                  justifyContent: 'flex-end', padding: '0 10px', fontSize: 10, fontWeight: 700,
                  color: 'rgba(255,255,255,0.65)', fontVariantNumeric: 'tabular-nums',
                }}>
                  {fmt(soma(mi), true)}
                </div>
              ))}
            </div>
          )
        }

        const { icone } = iconeCategoria(categorias, l.cat.nome)
        return (
          <div key={`${tipo}-c-${l.ri}`} style={{ display: 'contents' }}>
            <div style={{
              position: 'sticky', left: 0, zIndex: Z.rotulo, background: '#0f2878',
              height: H_CAT, display: 'flex', alignItems: 'center', gap: 5,
              padding: '0 14px 0 38px', fontSize: 11,
              color: 'rgba(255,255,255,0.85)',
              borderRight: '1px solid rgba(255,255,255,0.12)',
              overflow: 'hidden', whiteSpace: 'nowrap',
            }}>
              <span style={{ flexShrink: 0 }}>{icone}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {nomeExibicao(l.cat)}
              </span>
            </div>
            {meses.map(mi => (
              <div key={`${tipo}-c-${l.ri}-${mi}`} style={{
                height: H_CAT, display: 'flex', alignItems: 'center',
                justifyContent: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}>
                <PlanCelulaEditavel
                  valor={l.cat.v[mi] ?? 0}
                  onSave={nv => onSave(tipo, l.ri, mi, nv)}
                />
              </div>
            ))}
          </div>
        )
      })}
    </>
  )
}
