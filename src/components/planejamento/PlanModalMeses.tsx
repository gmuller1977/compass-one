import { useEffect, useRef, useState } from 'react'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { COR, MESES_FULL, fmt, nomeExibicao, type AnoData, type Cat, type Saldos } from './types'
import PlanCelulaEditavel from './PlanCelulaEditavel'
import CampoMeta from './CampoMeta'
import { metaContraPlano } from './anoDoPlano'
import { useAbrirItens, useLancadoNoMes } from './itensContexto'
import { useAbrirAjuste } from '../acompanhamento/ajustePlanoContexto'
import { itensDoMes } from '../../utils/itensPlano'
import type { Categoria } from '../../context/AppContext'
import { IconeCat } from '../IconeCat'
import { corDoIcone } from '../../utils/iconeDesenhado'
import { TOPO_AZUL, ROTULO_TOPO } from '../mobile/estilo'
import { PH_BTN_WHITE, PH_BTN_TAB_ATIVA } from '../PageHeader'

const W_NOME = 220
const W_MES = 118
const H_RODAPE = 30

type CatIdx = { cat: Cat; ri: number }

/**
 * ri é o índice na lista ORIGINAL de dadosAtivos — é por ele que onSave grava
 * (editarValor escreve em d.saidas[ri]). Por isso a indexação acontece antes
 * de qualquer filtro: indexar depois de filtrar deslocava tudo e o valor caía
 * na categoria errada.
 */
const comIndice = (cats: Cat[]): CatIdx[] => cats.map((cat, ri) => ({ cat, ri }))

function groupCats(items: CatIdx[]): [string, CatIdx[]][] {
  const map = new Map<string, CatIdx[]>()
  for (const item of items) {
    const g = item.cat.grupo ?? '__sem_grupo__'
    if (!map.has(g)) map.set(g, [])
    map.get(g)!.push(item)
  }
  return [...map.entries()].sort(([a], [b]) =>
    a === '__sem_grupo__' ? 1 : b === '__sem_grupo__' ? -1 : a.localeCompare(b, 'pt-BR'))
}

function porTela(): number {
  const w = window.innerWidth
  return w >= 1024 ? 3 : w >= 640 ? 2 : 1
}

/**
 * O modal que abre ao clicar num mês da Grade: as categorias do plano, com o
 * valor de cada uma em 3 meses a partir do clicado (2 no tablet, 1 no
 * celular), setas de um mês e "Ano inteiro" para os doze.
 *
 * O desenho é o do modal de um mês que existia antes — limpo: categorias
 * agrupadas, com o valor editável, e no pé a faixa azul com Receitas,
 * Despesas e Resultado de cada mês, presa ao rolar (é o que muda enquanto se
 * edita). Saldo inicial e final ficam só no CARTÃO. Pedido do Guilherme em
 * 06/10/2026, depois de ver a versão com a planilha inteira dentro do modal.
 *
 * A célula é a de sempre (conta, itens). O nome da categoria abre o ajuste do
 * Radar — já lançado nos próximos meses, média sem parcelas, "mês a mês" —
 * com o primeiro mês da janela como referência.
 */
export default function PlanModalMeses({
  mesInicial, anoAtual, mesAtual, dadosAtivos, previsto, hasFaturaCat, categorias, onSave, onClose,
  objetivos, onMetaSave,
}: {
  mesInicial: number
  anoAtual: number
  mesAtual: number
  dadosAtivos: AnoData
  /** Os totais do mês — o MESMO objeto que os cartões leem. */
  previsto: Saldos
  hasFaturaCat: boolean
  categorias: Categoria[]
  onSave: (tipo: 'e' | 's', ri: number, mi: number, valor: number) => void
  onClose: () => void
  /** Meta de economia de cada mês (`objetivos`): o campo fica no próprio mês. */
  objetivos: number[]
  onMetaSave: (objetivos: number[]) => void
}) {
  const abrirItens = useAbrirItens()
  const lancadoNoMes = useLancadoNoMes()
  const abrirAjuste = useAbrirAjuste()
  const [n, setN] = useState(porTela)
  const [anoInteiro, setAnoInteiro] = useState(false)
  const [inicio, setInicio] = useState(() => Math.min(mesInicial, 12 - porTela()))
  const fecharRef = useRef(onClose)
  fecharRef.current = onClose

  useEffect(() => {
    const medir = () => setN(porTela())
    // Esc fecha só quando este é o único diálogo: com o editor de itens ou o
    // ajuste por cima, o Esc é deles.
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.querySelectorAll('[aria-modal="true"]').length <= 1) fecharRef.current()
    }
    window.addEventListener('resize', medir)
    window.addEventListener('keydown', esc)
    return () => { window.removeEventListener('resize', medir); window.removeEventListener('keydown', esc) }
  }, [])

  const ini = Math.max(0, Math.min(inicio, 12 - n))
  const meses = anoInteiro
    ? Array.from({ length: 12 }, (_, i) => i)
    : Array.from({ length: Math.min(n, 12) }, (_, i) => ini + i)
  const titulo = anoInteiro ? `${anoAtual}`
    : meses.length === 1 ? MESES_FULL[meses[0]]
    : `${MESES_FULL[meses[0]]} – ${MESES_FULL[meses[meses.length - 1]]}`
  const anoCorrente = new Date().getFullYear()
  const colunas = `${W_NOME}px repeat(${meses.length}, ${W_MES}px)`

  const entradas = groupCats(comIndice(dadosAtivos.entradas))
  // Com a fatura planejada como linha própria, as categorias de cartão não
  // entram — é o mesmo filtro dos totais (hasFaturaCat), senão contariam duas vezes.
  const saidas = groupCats(hasFaturaCat
    ? comIndice(dadosAtivos.saidas).filter(x => x.cat.t !== 'cartao')
    : comIndice(dadosAtivos.saidas))

  function linhaCat({ cat, ri }: CatIdx, tipo: 'e' | 's') {
    const { icone, cor: corCat } = iconeCategoria(categorias, cat.nome)
    return (
      <div key={`${tipo}-${ri}`} style={{ display: 'contents' }}>
        <div style={{ position: 'sticky', left: 0, background: COR.branco, zIndex: 1, display: 'flex', alignItems: 'center',
          gap: 8, padding: '6px 8px 6px 0', borderBottom: `1px solid ${COR.borda}`, minWidth: 0 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}><IconeCat icone={icone} cor={corDoIcone(corCat)} /></span>
          {abrirAjuste ? (
            <button type="button" title="Ver o já lançado nos próximos meses e ajustar o plano"
              onClick={() => abrirAjuste({ tipo: tipo === 'e' ? 'entrada' : 'saida', nome: cat.nome,
                descricao: cat.descricao, prev: cat.v[meses[0]] ?? 0, real: 0, mes: meses[0] })}
              style={{ all: 'unset', cursor: 'pointer', fontSize: 13, color: COR.texto, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'underline',
                textDecorationColor: '#cbd5e1', textUnderlineOffset: 3 }}>
              {nomeExibicao(cat)}
            </button>
          ) : (
            <span style={{ fontSize: 13, color: COR.texto, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {nomeExibicao(cat)}
            </span>
          )}
        </div>
        {meses.map(mi => (
          <div key={mi} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            borderBottom: `1px solid ${COR.borda}`, fontSize: 13 }}>
            <PlanCelulaEditavel
              valor={cat.v[mi] ?? 0}
              onSave={v => onSave(tipo, ri, mi, v)}
              itens={itensDoMes(cat, mi)}
              onItens={abrirItens ? p => abrirItens(tipo, ri, mi, p) : undefined}
              lancado={lancadoNoMes?.(tipo, ri, mi) ?? 0}
              entrada={tipo === 'e'}
              sempreItens={(lancadoNoMes?.(tipo, ri, mi) ?? 0) > 0.005}
            />
          </div>
        ))}
      </div>
    )
  }

  // Rótulos de seção e de grupo: #15803d e #b91c1c, sem a opacidade de antes
  // (a 70%, o verde padrão caía para 2,4:1 no branco).
  function secao(titulo: string, cor: string, grupos: [string, CatIdx[]][], tipo: 'e' | 's') {
    const temGrupos = grupos.some(([g]) => g !== '__sem_grupo__')
    return (
      <>
        <div style={{ gridColumn: '1 / -1', fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
          letterSpacing: '.4px', color: cor, padding: '14px 0 6px', position: 'sticky', left: 0 }}>{titulo}</div>
        {grupos.map(([grupo, itens]) => (
          <div key={`${tipo}-${grupo}`} style={{ display: 'contents' }}>
            {(temGrupos || grupo !== '__sem_grupo__') && (
              <div style={{ gridColumn: '1 / -1', fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '.5px', color: COR.textoSuave, padding: '8px 0 4px', borderBottom: `1px solid ${COR.borda}` }}>
                <span style={{ position: 'sticky', left: 0 }}>{grupo === '__sem_grupo__' ? 'Outros' : grupo}</span>
              </div>
            )}
            {itens.map(it => linhaCat(it, tipo))}
          </div>
        ))}
      </>
    )
  }

  // Setas no azul, como as do mês ao lado do título em Lançamentos e no
  // Radar: branco translúcido. Desligada, branco a 35% (só desenho).
  const seta = (dir: -1 | 1) => {
    const desligada = dir < 0 ? ini <= 0 : ini >= 12 - n
    return (
      <button type="button" aria-label={dir < 0 ? 'Mês anterior' : 'Próximo mês'} disabled={desligada}
        onClick={() => setInicio(Math.max(0, Math.min(12 - n, ini + dir)))}
        style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', flexShrink: 0,
          background: desligada ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.15)',
          color: desligada ? 'rgba(255,255,255,.35)' : '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, cursor: desligada ? 'default' : 'pointer' }}>
        <i aria-hidden className={`ti ti-chevron-${dir < 0 ? 'left' : 'right'}`} />
      </button>
    )
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby="meses-titulo" style={{
        background: COR.branco, borderRadius: 20, maxWidth: '96vw', maxHeight: '90vh',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        {/* O cabeçalho das outras telas (PageHeader): o azul #0f2878 → #1e40af,
            ícone em círculo, "PLANEJAMENTO 2026" em cima e o título branco,
            com as setas do mês AO LADO do título. Pedido do Guilherme em
            17/10/2026, junto com a Revisão anual. Branco no #1e40af: 8,7;
            rótulo a 75%: 5,1. */}
        <div style={{ background: TOPO_AZUL, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,.14)', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i aria-hidden className="ti ti-calendar-stats" style={{ color: '#fff', fontSize: 20 }} />
          </div>
          <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, color: ROTULO_TOPO, letterSpacing: '.3px', textTransform: 'uppercase', fontWeight: 500, marginBottom: 2 }}>
                Planejamento {anoAtual}
              </div>
              <div id="meses-titulo" style={{ fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1.2, whiteSpace: 'nowrap' }}>{titulo}</div>
            </div>
            {!anoInteiro && <span style={{ display: 'flex', gap: 6 }}>{seta(-1)}{seta(1)}</span>}
          </div>
          <button type="button" aria-pressed={anoInteiro} onClick={() => setAnoInteiro(v => !v)}
            style={anoInteiro ? PH_BTN_TAB_ATIVA : PH_BTN_WHITE}>
            {anoInteiro ? (n === 1 ? '1 mês' : `${n} meses`) : 'Ano inteiro'}
          </button>
          <button type="button" onClick={onClose} aria-label="Fechar" title="Fechar"
            style={{ ...PH_BTN_WHITE, width: 34, height: 34, padding: 0, borderRadius: '50%', display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
            <i aria-hidden className="ti ti-x" />
          </button>
        </div>

        <div style={{ overflow: 'auto', flex: 1, padding: '0 20px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: colunas, width: 'max-content' }}>
            {/* Cabeçalho dos meses, preso no topo ao rolar. */}
            <div style={{ position: 'sticky', top: 0, left: 0, zIndex: 3, background: COR.branco }} />
            {/* O mês por extenso numa caixa, como o cartão do mês da Grade:
                o atual no azul-escuro (branco 10,4; "mês atual" a 75%: 6,5),
                os outros no cinza dos grupos com o texto marinho (#1e3a8a no
                #eef2f8: 9,6; a situação em #475569: 6,9). Embaixo, a situação: fechado, atual ou
                previsto — a mesma divisão dos cartões ("fechou com" ×
                "termina com"). Pedido do Guilherme em 17/10/2026. */}
            {meses.map(mi => {
              const atual = mi === mesAtual && anoAtual === anoCorrente
              const fechado = anoAtual < anoCorrente || (anoAtual === anoCorrente && mi < mesAtual)
              return (
                <div key={mi} style={{ position: 'sticky', top: 0, zIndex: 2, background: COR.branco, padding: '12px 0 8px 6px' }}>
                  <div style={{ borderRadius: 12, padding: '7px 9px', textAlign: 'right',
                    background: atual ? '#1e3a8a' : '#eef2f8', border: atual ? 'none' : '1px solid #dbe2ec' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: atual ? '#fff' : '#1e3a8a', lineHeight: 1.2 }}>{MESES_FULL[mi]}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, marginTop: 1, color: atual ? 'rgba(255,255,255,.75)' : '#475569' }}>
                      {atual ? 'mês atual' : fechado ? 'fechado' : 'previsto'}
                    </div>
                  </div>
                </div>
              )
            })}
            {/* A meta de economia, no próprio mês (pedido do Guilherme em
                13/10/2026, no lugar do botão "Meta de economia" da barra). */}
            <div style={{ gridColumn: '1 / -1', fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
              letterSpacing: '.4px', color: '#1e3a8a', padding: '14px 0 6px', position: 'sticky', left: 0 }}>Meta de economia</div>
            <div style={{ position: 'sticky', left: 0, background: COR.branco, zIndex: 1, display: 'flex', alignItems: 'center',
              gap: 8, padding: '6px 8px 6px 0', borderBottom: `1px solid ${COR.borda}`, fontSize: 13, color: COR.texto }}>
              <i aria-hidden className="ti ti-target" style={{ fontSize: 16, color: '#15803d' }} />Quanto quero guardar
            </div>
            {meses.map(mi => (
              <div key={mi} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                borderBottom: `1px solid ${COR.borda}`, fontSize: 13 }}>
                <CampoMeta mi={mi} anoAtual={anoAtual} mesAtual={mesAtual} objetivos={objetivos} onMetaSave={onMetaSave} />
              </div>
            ))}
            {secao('Receitas', '#15803d', entradas, 'e')}
            {secao('Despesas', '#b91c1c', saidas, 's')}

            {/* O pé: Receitas, Despesas e Resultado de cada mês, presos embaixo
                ao rolar. Os totais saem de `previsto`, o mesmo dos cartões.
                Sobre #1e3a8a: branco 10,4; rótulo a 75% 6,5; #86efac 8,1;
                #fecaca 9,6. */}
            {([
              ['Receitas', (mi: number) => previsto.totalEntradas[mi], 3],
              ['Despesas', (mi: number) => previsto.totalSaidas[mi], 2],
              ['Resultado', (mi: number) => previsto.totalEntradas[mi] - previsto.totalSaidas[mi], 1],
            ] as const).map(([rotulo, valor, nivel], i) => (
              <div key={rotulo} style={{ display: 'contents' }}>
                <div style={{ position: 'sticky', left: 0, bottom: nivel * H_RODAPE, zIndex: 3, height: H_RODAPE,
                  background: '#1e3a8a', display: 'flex', alignItems: 'center', padding: '0 12px',
                  fontSize: 11, fontWeight: rotulo === 'Resultado' ? 800 : 600, textTransform: 'uppercase', letterSpacing: '.4px',
                  color: rotulo === 'Resultado' ? '#fff' : 'rgba(255,255,255,.75)',
                  marginTop: i === 0 ? 12 : 0, borderTopLeftRadius: i === 0 ? 10 : 0, borderBottomLeftRadius: 0 }}>
                  {rotulo}
                </div>
                {meses.map((mi, j) => {
                  const v = valor(mi)
                  const ultimo = j === meses.length - 1
                  return (
                    <div key={mi} style={{ position: 'sticky', bottom: nivel * H_RODAPE, zIndex: 2, height: H_RODAPE,
                      background: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 9px',
                      fontSize: rotulo === 'Resultado' ? 13 : 12, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
                      color: rotulo === 'Resultado' ? (v >= 0 ? '#86efac' : '#fecaca') : '#fff',
                      marginTop: i === 0 ? 12 : 0,
                      borderTopRightRadius: i === 0 && ultimo ? 10 : 0 }}>
                      {rotulo === 'Resultado' && v > 0 ? '+' : ''}{fmt(v, true)}
                    </div>
                  )
                })}
              </div>
            ))}
            {/* Falta para a meta, logo abaixo do Resultado (pedido do Guilherme
                em 13/10/2026): muda enquanto se edita o plano. Meta − o que o
                plano guarda; mês fechado ou sem meta, "—". Sobre #1e3a8a:
                #fecaca 9,6; #86efac 8,1. */}
            <div style={{ position: 'sticky', left: 0, bottom: 0, zIndex: 3, height: H_RODAPE,
              background: '#1e3a8a', display: 'flex', alignItems: 'center', padding: '0 12px',
              fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px',
              color: 'rgba(255,255,255,.75)', borderBottomLeftRadius: 10, borderTop: '1px solid rgba(255,255,255,.2)' }}>
              Falta para a meta
            </div>
            {meses.map((mi, j) => {
              const fechado = anoAtual < anoCorrente || (anoAtual === anoCorrente && mi < mesAtual)
              const c = metaContraPlano(objetivos[mi] ?? 0, previsto.totalEntradas[mi] - previsto.totalSaidas[mi])
              return (
                <div key={mi} style={{ position: 'sticky', bottom: 0, zIndex: 2, height: H_RODAPE,
                  background: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 9px',
                  fontSize: 12, fontWeight: 800, fontVariantNumeric: 'tabular-nums', borderTop: '1px solid rgba(255,255,255,.2)',
                  color: !c || fechado ? 'rgba(255,255,255,.75)' : c.ok ? '#86efac' : '#fecaca',
                  borderBottomRightRadius: j === meses.length - 1 ? 10 : 0 }}>
                  {!c || fechado ? '—' : c.ok ? '✓ dentro' : fmt(c.falta, true)}
                </div>
              )
            })}
          </div>
          <div style={{ fontSize: 11, color: COR.textoSuave, marginTop: 10, lineHeight: 1.5, maxWidth: 520 }}>
            Clique num valor para editar (aceita conta, como <b>800+300</b>). Clique no <b>nome</b> para ver o que já
            está lançado nos próximos meses e ajustar o plano daqui para frente.
          </div>
        </div>
      </div>
    </div>
  )
}
