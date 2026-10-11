import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import BottomNav from '../BottomNav'
import { Cartao, TituloCartao, IconeRedondo } from '../mobile/ui'
import { M } from '../mobile/estilo'
import PlanCelulaEditavel from './PlanCelulaEditavel'
import PlanBarraFerramentas from './PlanBarraFerramentas'
import { type BulkOp } from './PlanFerramentas'
import { useAbrirItens } from './itensContexto'
import { useAbrirAjuste } from '../acompanhamento/ajustePlanoContexto'
import { itensDoMes } from '../../utils/itensPlano'
import { iconeCategoria } from '../../utils/categoriaIcone'
import {
  COR, MESES, MESES_FULL, MOTIVO_PLANO_LOCKADO, agrupar, fmt, nomeExibicao,
  type AnoData, type Cat, type Saldos,
} from './types'
import type { Categoria } from '../../context/AppContext'
import type { Descoberta } from '../../utils/descoberta'

/**
 * O Planejamento no celular. Pedido do Guilherme em 11/10/2026 ("tela de
 * planejamento no mobile precisa ser revisada"): era a Grade do computador
 * espremida — faixa anual cortada na lateral, cinco botões de ferramenta antes
 * de qualquer número, cartões de mês com 125 px onde os valores saíam
 * cortados ("R$ 5.8"), e o modal do mês com uma coluna só, o rodapé azul por
 * cima das últimas categorias e "Ano inteiro" mostrando só janeiro.
 *
 * Aqui é o padrão do kit (components/mobile): topo azul com UM número — a
 * sobra planejada do mês escolhido —, os meses em pílulas, e as categorias
 * do mês direto na página, editáveis, sem modal. Nenhum número novo: tudo
 * sai de `previsto` e `dadosPrevisto`, os mesmos da Grade, e a gravação é o
 * mesmo `onSave`.
 */

/** Sobre #1e40af (o extremo claro do topo): #86efac 4,8; #fecaca 4,6; branco a 75% 5,1. */
const AZUL_TOPO = 'linear-gradient(160deg,#0f2878 0%,#1e40af 100%)'
const VERDE = COR.sucessoTexto   // #15803d no branco, 5,0
const VERMELHO = '#b91c1c'       // 6,5 no branco

interface Props {
  anoAtual: number
  setAnoAtual: (f: (a: number) => number) => void
  mesAtual: number
  dadosPrevisto: AnoData
  dadosAnoAnterior: AnoData | null
  previsto: Saldos
  hasFaturaCat: boolean
  categorias: Categoria[]
  onSave: (tipo: 'e' | 's', ri: number, mi: number, valor: number) => void
  onBulkSave: (ops: BulkOp[]) => void
  objetivos: number[]
  sobraPrevista: number[]
  onMetaSave: (objetivos: number[]) => void
  descoberta?: Descoberta
  fechamentoReal?: number[]
  /** Faixas que vêm antes das categorias (descoberta, revisão, só administrador). */
  avisos?: ReactNode
}

export default function PlanMobile(p: Props) {
  const { anoAtual, mesAtual, previsto, dadosPrevisto } = p
  const anoCorrente = new Date().getFullYear()
  const ehAnoCorrente = anoAtual === anoCorrente
  const [mes, setMes] = useState(ehAnoCorrente ? mesAtual : 0)
  const [ferramentas, setFerramentas] = useState(false)
  const pilulas = useRef<HTMLDivElement>(null)

  // Trocou de ano: volta ao mês corrente (ano corrente) ou a janeiro.
  useEffect(() => { setMes(anoAtual === anoCorrente ? mesAtual : 0) }, [anoAtual, anoCorrente, mesAtual])

  // A pílula do mês escolhido sempre visível na faixa.
  useEffect(() => {
    const el = pilulas.current?.querySelector<HTMLElement>(`[data-mes="${mes}"]`)
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [mes])

  const receitas = previsto.totalEntradas[mes]
  const despesas = previsto.totalSaidas[mes]
  const sobra = receitas - despesas
  const semPlano = receitas === 0 && despesas === 0
  const fechado = anoAtual < anoCorrente || (ehAnoCorrente && mes < mesAtual)
  const fechouEm = fechado ? p.fechamentoReal?.[mes] : undefined

  const desc = p.descoberta
  const observando = !!desc?.ativa && desc.mesObservado.ano === anoAtual && desc.mesObservado.mes === mes

  const saidas = p.hasFaturaCat
    ? dadosPrevisto.saidas.map((c, ri) => ({ c, ri })).filter(x => x.c.t !== 'cartao')
    : null

  return (
    <div style={{ minHeight: '100vh', background: M.fundo, fontFamily: "-apple-system,'Inter',sans-serif", paddingBottom: 110 }}>
      {/* ── Topo: o ano, a sobra do mês e os meses ── */}
      <div style={{ background: AZUL_TOPO, color: '#fff', borderRadius: '0 0 28px 28px', padding: '18px 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Planejamento</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={() => p.setAnoAtual(a => a - 1)} aria-label="Ano anterior" style={BTN_ANO}>‹</button>
            <span style={{ fontSize: 17, fontWeight: 800, minWidth: 48, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{anoAtual}</span>
            <button onClick={() => p.setAnoAtual(a => a + 1)} aria-label="Próximo ano" style={BTN_ANO}>›</button>
          </div>
        </div>

        <div style={{ marginTop: 18, fontSize: 14, color: 'rgba(255,255,255,.75)' }}>
          {semPlano
            ? (observando ? `${MESES_FULL[mes]}: descobrindo seus números` : `${MESES_FULL[mes]} ainda sem plano`)
            : `Sobra planejada em ${MESES_FULL[mes]}`}
        </div>
        {semPlano ? (
          <div style={{ fontSize: 17, fontWeight: 700, marginTop: 4, lineHeight: 1.35 }}>
            {observando
              ? (desc!.diasAteFechar <= 0 ? 'O mês fecha hoje' : `Faltam ${desc!.diasAteFechar} ${desc!.diasAteFechar === 1 ? 'dia' : 'dias'} para o mês fechar`)
              : 'Toque num valor abaixo para começar'}
          </div>
        ) : (
          <>
            <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-.5px', marginTop: 2, fontVariantNumeric: 'tabular-nums',
              color: sobra < 0 ? '#fecaca' : '#fff' }}>
              {sobra > 0 ? '+' : ''}{fmt(sobra, true)}
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 8, fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
              <span><span style={{ color: 'rgba(255,255,255,.75)' }}>↑ Receitas </span><b style={{ color: '#86efac' }}>{fmt(receitas, true)}</b></span>
              <span><span style={{ color: 'rgba(255,255,255,.75)' }}>↓ Despesas </span><b style={{ color: '#fecaca' }}>{fmt(despesas, true)}</b></span>
            </div>
          </>
        )}

        {/* Os doze meses numa faixa que rola com o dedo. */}
        <div ref={pilulas} role="tablist" aria-label="Mês" style={{
          display: 'flex', gap: 6, overflowX: 'auto', margin: '16px -16px 0', padding: '0 16px',
          scrollbarWidth: 'none',
        }}>
          {MESES.map((m, i) => {
            const ativo = i === mes
            const atual = ehAnoCorrente && i === mesAtual
            return (
              <button key={m} data-mes={i} role="tab" aria-selected={ativo} onClick={() => setMes(i)} style={{
                flexShrink: 0, minWidth: 52, minHeight: 44, borderRadius: 999, border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 15, fontWeight: ativo ? 800 : 600,
                background: ativo ? '#fff' : 'rgba(255,255,255,.12)', color: ativo ? '#1e3a8a' : '#fff',
                textDecoration: atual ? 'underline' : 'none', textUnderlineOffset: 4, textDecorationThickness: 2,
              }}>{m}</button>
            )
          })}
        </div>
      </div>

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {p.avisos}

        {/* ── De onde o mês parte e onde termina ── */}
        <Cartao>
          <TituloCartao>Saldo de {MESES_FULL[mes]}</TituloCartao>
          <LinhaValor rotulo="Começa com" legenda={previsto.inicialReal[mes] ? 'saldo real' : 'previsto'} valor={previsto.saldoInicial[mes]} />
          <LinhaValor rotulo="Termina com" legenda="se o plano se cumprir" valor={previsto.saldoFinal[mes]} forte />
          {fechouEm !== undefined && (
            <LinhaValor rotulo="Fechou em" valor={fechouEm}
              legenda={Math.abs(fechouEm - previsto.saldoFinal[mes]) < 0.005 ? 'igual ao previsto'
                : `${fmt(Math.abs(fechouEm - previsto.saldoFinal[mes]), true)} ${fechouEm > previsto.saldoFinal[mes] ? 'acima' : 'abaixo'} do previsto`} />
          )}
          {p.objetivos[mes] > 0 && (
            <LinhaValor rotulo="Meta de sobra" valor={p.objetivos[mes]}
              legenda={sobra >= p.objetivos[mes] ? '✓ o plano alcança' : `faltam ${fmt(p.objetivos[mes] - sobra, true)} no plano`} />
          )}
        </Cartao>

        <Secao titulo="Receitas" cor={VERDE} total={receitas} tipo="e" cats={dadosPrevisto.entradas} mes={mes} categorias={p.categorias} onSave={p.onSave} />
        <Secao titulo="Despesas" cor={VERMELHO} total={despesas} tipo="s" cats={dadosPrevisto.saidas}
          visiveis={saidas ? new Set(saidas.map(x => x.ri)) : undefined} mes={mes} categorias={p.categorias} onSave={p.onSave} />

        <p style={{ margin: '0 4px', fontSize: 13, color: COR.textoSuave, lineHeight: 1.5 }}>
          Toque num valor para mudar (aceita conta, como <b>800+300</b>). Toque no nome para ver o que já está
          lançado nos próximos meses e ajustar o plano daqui para frente.
        </p>

        {/* ── O ano, mês a mês: a visão que a faixa e o "Ano inteiro" davam ── */}
        <Cartao>
          <TituloCartao>{anoAtual} mês a mês</TituloCartao>
          {MESES_FULL.map((nome, i) => {
            const r = previsto.totalEntradas[i], d = previsto.totalSaidas[i]
            const s = r - d
            const vazio = r === 0 && d === 0
            const ativo = i === mes
            return (
              <button key={nome} onClick={() => { setMes(i); window.scrollTo({ top: 0, behavior: 'smooth' }) }} style={{
                all: 'unset', boxSizing: 'border-box', width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                minHeight: 52, padding: '8px 10px', margin: '0 -10px', cursor: 'pointer', borderRadius: 12,
                borderTop: i === 0 ? 'none' : '1px solid #eef2f8', background: ativo ? '#eff6ff' : undefined,
              }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: M.corpo, fontWeight: ativo ? 800 : 600, color: COR.texto }}>
                    {nome}{ehAnoCorrente && i === mesAtual ? ' · hoje' : ''}
                  </span>
                  <span style={{ display: 'block', fontSize: M.legenda, marginTop: 2, fontVariantNumeric: 'tabular-nums',
                    color: vazio ? COR.textoSuave : s < 0 ? VERMELHO : VERDE }}>
                    {vazio ? 'sem plano' : `sobra ${s > 0 ? '+' : ''}${fmt(s, true)}`}
                  </span>
                </span>
                <span style={{ textAlign: 'right' }}>
                  <span style={{ display: 'block', fontSize: 12, color: COR.textoSuave }}>termina com</span>
                  <span style={{ display: 'block', fontSize: M.corpo, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                    color: previsto.saldoFinal[i] < 0 ? VERMELHO : COR.texto }}>{fmt(previsto.saldoFinal[i], true)}</span>
                </span>
              </button>
            )
          })}
        </Cartao>

        {/* ── Ferramentas de lote: fechadas, para não vir antes dos números ── */}
        <Cartao>
          <button onClick={() => setFerramentas(v => !v)} aria-expanded={ferramentas} style={{
            all: 'unset', boxSizing: 'border-box', width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            minHeight: 44, cursor: 'pointer',
          }}>
            <IconeRedondo icone="🧰" />
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: M.titulo, fontWeight: 700, color: COR.texto }}>Ferramentas do plano</span>
              <span style={{ display: 'block', fontSize: M.legenda, color: COR.textoSuave, marginTop: 2 }}>
                Copiar mês ou ano, aplicar valor, reajuste, meta
              </span>
            </span>
            <span aria-hidden style={{ fontSize: 20, color: COR.textoSuave, transform: ferramentas ? 'rotate(180deg)' : undefined }}>⌄</span>
          </button>
          {ferramentas && (
            <div style={{ marginTop: 14 }}>
              <PlanBarraFerramentas
                mesAtual={p.mesAtual} anoAtual={anoAtual} dadosAtivos={dadosPrevisto}
                dadosAnoAnterior={p.dadosAnoAnterior} categorias={p.categorias} onBulkSave={p.onBulkSave}
                objetivos={p.objetivos} sobraPrevista={p.sobraPrevista} onMetaSave={p.onMetaSave}
                motivoBloqueio={MOTIVO_PLANO_LOCKADO}
              />
            </div>
          )}
        </Cartao>
      </div>

      <BottomNav />
    </div>
  )
}

function LinhaValor({ rotulo, legenda, valor, forte }: { rotulo: string; legenda?: string; valor: number; forte?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 48, padding: '6px 0', borderTop: '1px solid #eef2f8' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: M.corpo, fontWeight: 600, color: COR.texto }}>{rotulo}</div>
        {legenda && <div style={{ fontSize: M.legenda, color: COR.textoSuave, marginTop: 2 }}>{legenda}</div>}
      </div>
      <div style={{ fontSize: forte ? 18 : M.corpo, fontWeight: forte ? 800 : 700, fontVariantNumeric: 'tabular-nums',
        color: valor < 0 ? VERMELHO : COR.texto }}>{fmt(valor, true)}</div>
    </div>
  )
}

/** Receitas ou Despesas do mês: grupos, e cada categoria com o valor editável. */
function Secao({ titulo, cor, total, tipo, cats, visiveis, mes, categorias, onSave }: {
  titulo: string; cor: string; total: number; tipo: 'e' | 's'; cats: Cat[]
  /** Com a fatura planejada como linha própria, as categorias de cartão não entram (o filtro dos totais). */
  visiveis?: Set<number>
  mes: number; categorias: Categoria[]
  onSave: (tipo: 'e' | 's', ri: number, mi: number, valor: number) => void
}) {
  const abrirItens = useAbrirItens()
  const abrirAjuste = useAbrirAjuste()
  const linhas = agrupar(cats, tipo).filter(l => l.k === 'grupo'
    ? !visiveis || l.ris.some(ri => visiveis.has(ri))
    : !visiveis || visiveis.has(l.ri))
  if (linhas.length === 0) return null

  return (
    <Cartao>
      <TituloCartao direita={
        <span style={{ fontSize: M.corpo, fontWeight: 800, color: cor, fontVariantNumeric: 'tabular-nums' }}>{fmt(total, true)}</span>
      }>{titulo}</TituloCartao>
      {linhas.map((l, i) => {
        if (l.k === 'grupo') return (
          <div key={`g-${l.grupo}`} style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase',
            color: COR.textoSuave, padding: i === 0 ? '0 0 4px' : '14px 0 4px' }}>
            {l.grupo === '__sem_grupo__' ? 'Outros' : l.grupo}
          </div>
        )
        const { cat, ri } = l
        const { icone, cor: corCat } = iconeCategoria(categorias, cat.nome)
        const nome = nomeExibicao(cat)
        return (
          <div key={`${tipo}-${ri}`} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 52,
            borderTop: '1px solid #eef2f8' }}>
            <IconeRedondo icone={icone} cor={corCat} tamanho={36} />
            {abrirAjuste ? (
              <button type="button" onClick={() => abrirAjuste({ tipo: tipo === 'e' ? 'entrada' : 'saida', nome: cat.nome,
                descricao: cat.descricao, prev: cat.v[mes] ?? 0, real: 0, mes })}
                style={{ all: 'unset', flex: 1, minWidth: 0, minHeight: 44, display: 'flex', alignItems: 'center',
                  cursor: 'pointer', fontSize: M.corpo, fontWeight: 600, color: COR.texto }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nome}</span>
              </button>
            ) : (
              <span style={{ flex: 1, minWidth: 0, fontSize: M.corpo, fontWeight: 600, color: COR.texto,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nome}</span>
            )}
            <div style={{ flexShrink: 0, maxWidth: '52%', fontSize: M.corpo, fontWeight: 600, textAlign: 'right' }}>
              <PlanCelulaEditavel grande
                valor={cat.v[mes] ?? 0}
                onSave={v => onSave(tipo, ri, mes, v)}
                itens={itensDoMes(cat, mes)}
                onItens={abrirItens ? pt => abrirItens(tipo, ri, mes, pt) : undefined}
              />
            </div>
          </div>
        )
      })}
    </Cartao>
  )
}

const BTN_ANO: CSSProperties = {
  width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.15)',
  color: '#fff', fontSize: 22, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1,
}
