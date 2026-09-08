import { useState, useMemo, useRef } from 'react'
import { iconeCategoria } from '../../utils/categoriaIcone'
import PlanCelulaEditavel from './PlanCelulaEditavel'
import PlanBarraFerramentas from './PlanBarraFerramentas'
import { type BulkOp } from './PlanFerramentas'
import {
  fmt, MESES, nomeExibicao, MOTIVO_PLANO_LOCKADO,
  PREVISTO, tituloValor, SEM_GRUPO, agrupar, somaDoGrupo,
  type AnoData, type Cat, type Saldos, type LinhaCat,
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

/**
 * O bloco do que já aconteceu.
 *
 * A direção óbvia seria CLAREAR os meses previstos, mas o CLAUDE.md proíbe:
 * nenhum fundo azul que carregue valor colorido pode passar de #1e40af, e as
 * linhas de Receitas e Despesas carregam verde e amarelo. Então o realizado
 * escurece em vez de o previsto clarear — o que de quebra melhora todos os
 * textos por cima dele.
 *
 * #081642 separa 2,00:1 do extremo claro do gradiente e 1,33:1 do escuro.
 */
const AZUL_REAL = '#081642'

/** A fronteira entre o que aconteceu e o que ainda vai acontecer. */
const DIVISOR_ESCURO = 'rgba(255,255,255,0.45)'
const DIVISOR_CLARO = '#94a3b8'

/**
 * O detalhe é claro; só o resumo é azul. Além de separar as duas leituras, isso
 * conserta a legibilidade: PlanCelulaEditavel pinta o número em #0f172a, que
 * sobre o azul escuro sumia.
 *
 * O grupo é uma FAIXA, não um realce. Era #f1f5f9 com texto #475569, e o
 * problema não estava no texto — ele passava com folga — e sim na faixa, que
 * separava só 1,10:1 das linhas brancas em volta.
 *
 * Este azul dá 14,87:1 com preto, o melhor de todos os tons medidos. A faixa em
 * si separa 1,41:1 do branco, número baixo, mas a razão de contraste só mede
 * luminância: o TOM azul distingue a faixa de um jeito que ela não captura.
 *
 * Fica uma hierarquia de três degraus: azul escuro no resumo, azul claro no
 * grupo, branco na categoria.
 */
const GRUPO_FUNDO = '#c9daf8'
const GRUPO_TEXTO = '#000'
/** Sobre o azul claro, uma linha escura de leve — a clara sumiria. */
const GRUPO_BORDA = 'rgba(15,23,42,0.15)'

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
  // Uma por vez, de proposito. As duas linhas ficam presas no topo, e com as
  // duas abertas o detalhe de Receitas rolaria POR BAIXO do rotulo de Despesas
  // — a tela diria que aluguel e receita.
  const [aberto, setAberto] = useState<'e' | 's' | null>('s')
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

  const grade = useRef<HTMLDivElement>(null)

  /**
   * Deixa a célula no centro da caixa.
   *
   * scrollIntoView não serve aqui, por dois motivos. Com `nearest` ele não faz
   * nada quando a célula já está tecnicamente visível — e ela pode estar
   * DEBAIXO do rodapé preso, que ele não conhece: era isso que fazia a seta
   * parecer não rolar. E qualquer opção dele rola também os ancestrais, o que
   * arrastaria a página inteira junto.
   *
   * Centralizar na mão resolve os dois: só a caixa se move, e o centro está
   * sempre longe das faixas presas em cima e embaixo.
   */
  function centralizar(el: HTMLElement) {
    const caixa = grade.current?.parentElement
    if (!caixa) return
    const c = el.getBoundingClientRect()
    const b = caixa.getBoundingClientRect()
    caixa.scrollTop += (c.top + c.height / 2) - (b.top + b.height / 2)
    caixa.scrollLeft += (c.left + c.width / 2) - (b.left + b.width / 2)
  }

  /**
   * Setas, Home, End e Tab sobre as células editáveis.
   *
   * A posição sai do DOM, não de um índice guardado em estado: basta listar os
   * elementos com `data-celula` na ordem em que estão na página. Isso resolve
   * de graça as duas coisas que complicariam a conta — os meses são filtrados,
   * e só uma seção está aberta —, porque só existe no DOM o que está visível.
   *
   * Cada linha de categoria rende exatamente um elemento por mês, então subir e
   * descer é somar ou subtrair a quantidade de meses.
   *
   * O Tab entra aqui em vez de ficar nativo para passar pela mesma
   * centralização — senão ele levaria o foco para debaixo do rodapé.
   */
  function navegar(e: React.KeyboardEvent) {
    const chaves = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End', 'Tab']
    if (!chaves.includes(e.key)) return
    const celulas = Array.from(
      grade.current?.querySelectorAll<HTMLElement>('[data-celula]') ?? [])
    const i = celulas.indexOf(document.activeElement as HTMLElement)
    if (i < 0) return

    const n = meses.length
    const inicioDaLinha = i - (i % n)
    const alvo =
      e.key === 'ArrowRight' ? i + 1
      : e.key === 'ArrowLeft' ? i - 1
      : e.key === 'ArrowDown' ? i + n
      : e.key === 'ArrowUp' ? i - n
      : e.key === 'Home' ? inicioDaLinha
      : e.key === 'End' ? inicioDaLinha + n - 1
      : e.shiftKey ? i - 1 : i + 1

    const destino = celulas[alvo]
    // Sem destino, o Tab segue o caminho natural e sai da grade — que é o que
    // se espera dele na primeira e na última célula.
    if (!destino) return
    e.preventDefault()
    destino.focus({ preventScroll: true })
    centralizar(destino)
  }

  // Os meses estão lado a lado, em ordem: a fronteira entre realizado e
  // previsto é uma LINHA, não uma propriedade de cada célula. O itálico fica
  // para o que a coluna não sabe dizer — o mês corrente abre com saldo real e
  // fecha com previsto, e só ele marca essa diferença.
  //
  // A fronteira é o primeiro mês que ABRE sem saber de quanto parte, e não o
  // primeiro mês ainda não fechado. Com agosto fechado, setembro parte de um
  // número real: ele pertence ao bloco da esquerda, e a linha cai entre
  // setembro e outubro. Ancorar em realizadoAte punha a linha um mês cedo.
  const ehPrevisto = (mi: number) => !previsto.inicialReal[mi]
  const primeiroPrevisto = meses.find(ehPrevisto)
  const fundoMes = (mi: number) => (ehPrevisto(mi) ? AZUL : AZUL_REAL)
  const divisor = (mi: number, claro = false): React.CSSProperties =>
    mi === primeiroPrevisto && mi !== meses[0]
      ? { borderLeft: `2px solid ${claro ? DIVISOR_CLARO : DIVISOR_ESCURO}` }
      : {}

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
          // fit-content encolhe a caixa ate onde o conteudo termina; sem isso
          // ela ocupava a largura toda e sobrava azul depois de dezembro. O
          // maxWidth devolve a rolagem horizontal quando os meses nao cabem.
          width: 'fit-content', maxWidth: '100%',
          border: `1px solid ${COR.borda}`, borderRadius: 10, background: '#0f2878',
        }}>
          <div ref={grade} onKeyDown={navegar}
            style={{ display: 'grid', gridTemplateColumns: colunas, width: 'max-content' }}>

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
                  ...divisor(mi),
                  position: 'sticky', top: 0, zIndex: Z.faixa, background: fundoMes(mi),
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
                  ...divisor(mi),
                  position: 'sticky', top: H_CAB, zIndex: Z.faixa, background: fundoMes(mi),
                  height: H_RES, display: 'flex', alignItems: 'center',
                  justifyContent: 'flex-end', padding: '0 10px', fontSize: 12,
                  fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#fff',
                  ...(previsto.inicialReal[mi] ? {} : PREVISTO),
                }}>
                {fmt(previsto.saldoInicial[mi], true)}
              </div>
            ))}

            {/* ── Receitas e Despesas, cada uma abrindo o próprio detalhe ─ */}
            <LinhaSecao
              tipo="e" titulo="Receitas" aberto={aberto === 'e'}
              onToggle={() => setAberto(a => (a === 'e' ? null : 'e'))}
              topo={H_CAB + H_RES} totais={previsto.totalEntradas}
              meses={meses} realizadoAte={previsto.realizadoAte} cor="#fff"
              fundoMes={fundoMes} divisor={divisor}
            />
            <LinhaSecao
              tipo="s" titulo="Despesas" aberto={aberto === 's'}
              onToggle={() => setAberto(a => (a === 's' ? null : 's'))}
              topo={H_CAB + H_RES * 2} totais={previsto.totalSaidas}
              meses={meses} realizadoAte={previsto.realizadoAte} cor="#fff"
              fundoMes={fundoMes} divisor={divisor}
            />

            {aberto && (
              <Detalhe
                tipo={aberto}
                linhas={aberto === 'e' ? linhasE : linhasS}
                cats={aberto === 'e' ? dadosAtivos.entradas : dadosAtivos.saidas}
                meses={meses} categorias={categorias} onSave={onSave}
                divisor={divisor}
              />
            )}

            {/* ── Rodapé preso ─────────────────────────────────────────── */}
            {rotulo('Saldo final', {
              position: 'sticky', bottom: baseSaldoFinal, left: 0, zIndex: Z.canto,
              height: H_RES, borderTop: '1px solid rgba(255,255,255,0.14)',
            })}
            {meses.map(mi => (
              <div key={`sf-${mi}`} title={tituloValor(previsto.finalReal[mi])}
                style={{
                  ...divisor(mi),
                  position: 'sticky', bottom: baseSaldoFinal, zIndex: Z.faixa, background: fundoMes(mi),
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
                  ...divisor(mi),
                  position: 'sticky', bottom: baseResultado, zIndex: Z.faixa, background: fundoMes(mi),
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
                      ...divisor(mi),
                      position: 'sticky', bottom: baseMeta, zIndex: Z.faixa, background: fundoMes(mi),
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
        Clique em <b>Receitas</b> ou <b>Despesas</b> para trocar de detalhe — uma
        de cada vez, para as duas continuarem visíveis ao rolar.
        À esquerda da linha, o que já aconteceu; à direita, o previsto. Um número
        em <span style={PREVISTO}>itálico</span> dentro do bloco escuro ainda não
        aconteceu — é o caso do saldo final do mês corrente.
        <br />
        Sem mouse: <b>Tab</b> e <b>setas</b> andam pela grade mantendo a célula no
        centro, <b>Home</b> e <b>End</b> vão ao primeiro e ao último mês,
        <b>Enter</b> ou um número abre a edição, <b>Esc</b> cancela.
      </div>
    </div>
  )
}

// ── A linha presa, e o detalhe que ela abre ──────────────────────────────

/** Linha do resumo que também é o botão do acordeão. Fica presa no topo. */
function LinhaSecao({
  tipo, titulo, aberto, onToggle, topo, totais, meses, realizadoAte, cor,
  fundoMes, divisor,
}: {
  tipo: 'e' | 's'
  titulo: string
  aberto: boolean
  onToggle: () => void
  /** Onde ela para ao rolar, contando as faixas que ficam acima dela. */
  topo: number
  totais: number[]
  meses: number[]
  realizadoAte: number
  /**
   * Hoje branco nas duas seções. A cor saiu daqui porque era redundante: o
   * rótulo da linha já diz se é receita ou despesa. Ela fica onde carrega algo
   * que o rótulo não carrega — o sinal do Resultado e a distância da Meta.
   */
  cor: string
  fundoMes: (mi: number) => string
  divisor: (mi: number, claro?: boolean) => React.CSSProperties
}) {
  return (
    <>
      <div onClick={onToggle} style={{
        position: 'sticky', left: 0, top: topo, zIndex: Z.canto, background: AZUL,
        cursor: 'pointer', height: H_RES, display: 'flex', alignItems: 'center',
        gap: 6, padding: '0 14px', fontSize: 11, fontWeight: 700, color: '#fff',
        userSelect: 'none', borderRight: '1px solid rgba(255,255,255,0.12)',
      }}>
        <span style={{
          fontSize: 9, display: 'inline-block', transition: 'transform .2s',
          transform: aberto ? 'rotate(90deg)' : 'none',
        }}>▶</span>
        {titulo}
      </div>
      {meses.map(mi => (
        <div key={`${tipo}-tot-${mi}`} onClick={onToggle} style={{
          ...divisor(mi),
          position: 'sticky', top: topo, zIndex: Z.faixa, background: fundoMes(mi),
          height: H_RES, display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          padding: '0 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          fontVariantNumeric: 'tabular-nums', color: cor,
          ...(mi <= realizadoAte ? {} : PREVISTO),
        }}>
          {fmt(totais[mi], true)}
        </div>
      ))}
    </>
  )
}

/** Grupos e categorias da seção aberta. É a única parte que rola. */
function Detalhe({
  tipo, linhas, cats, meses, categorias, onSave, divisor,
}: {
  tipo: 'e' | 's'
  linhas: LinhaCat[]
  cats: Cat[]
  meses: number[]
  categorias: Categoria[]
  onSave: (tipo: 'e' | 's', ri: number, mi: number, valor: number) => void
  divisor: (mi: number, claro?: boolean) => React.CSSProperties
}) {
  return (
    <>
      {linhas.map((l, li) => {
        if (l.k === 'grupo') {
          const soma = (mi: number) => somaDoGrupo(l, cats, mi)
          return (
            <div key={`${tipo}-g-${li}`} style={{ display: 'contents' }}>
              <div style={{
                position: 'sticky', left: 0, zIndex: Z.rotulo, background: GRUPO_FUNDO,
                height: H_GRP, display: 'flex', alignItems: 'center',
                padding: '0 14px 0 30px', fontSize: 10, fontWeight: 800,
                letterSpacing: '.5px', textTransform: 'uppercase',
                color: GRUPO_TEXTO,
                borderRight: `1px solid ${GRUPO_BORDA}`,
                overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
              }}>
                {l.grupo === SEM_GRUPO ? 'Outros' : l.grupo}
              </div>
              {meses.map(mi => (
                <div key={`${tipo}-g-${li}-${mi}`} style={{
                  ...divisor(mi, true),
                  height: H_GRP, background: GRUPO_FUNDO, display: 'flex', alignItems: 'center',
                  justifyContent: 'flex-end', padding: '0 10px', fontSize: 12, fontWeight: 700,
                  color: GRUPO_TEXTO, fontVariantNumeric: 'tabular-nums',
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
              position: 'sticky', left: 0, zIndex: Z.rotulo, background: COR.branco,
              height: H_CAT, display: 'flex', alignItems: 'center', gap: 5,
              padding: '0 14px 0 38px', fontSize: 11, fontWeight: 500,
              color: COR.texto,
              borderRight: `1px solid ${COR.borda}`,
              borderBottom: `1px solid ${COR.bordaSuave}`,
              overflow: 'hidden', whiteSpace: 'nowrap',
            }}>
              <span style={{ flexShrink: 0 }}>{icone}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {nomeExibicao(l.cat)}
              </span>
            </div>
            {meses.map(mi => (
              <div key={`${tipo}-c-${l.ri}-${mi}`} style={{
                ...divisor(mi, true),
                height: H_CAT, background: COR.branco, display: 'flex', alignItems: 'center',
                justifyContent: 'flex-end', borderBottom: `1px solid ${COR.bordaSuave}`,
                // PlanCelulaEditavel nao define corpo no estado de leitura: ele
                // herda daqui. Sem isto o numero caia no tamanho padrao da
                // pagina e destoava de tudo em volta.
                //
                // Peso normal de proposito: o negrito fica so no subtotal do
                // grupo, que e o numero que resume a lista abaixo dele.
                fontSize: 12, fontWeight: 400,
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
