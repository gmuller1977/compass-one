import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import BottomNav from '../BottomNav'
import AjudaTela from '../AjudaTela'
import { M } from '../mobile/estilo'
import PlanCelulaEditavel from './PlanCelulaEditavel'
import CampoMeta from './CampoMeta'
import PlanBarraFerramentas from './PlanBarraFerramentas'
import PlanResumoAnual from './PlanResumoAnual'
import GraficoAnoPlano from './GraficoAnoPlano'
import MetaNoCartao from './MetaNoCartao'
import { mesesDoAno, type MesDoAno } from './anoDoPlano'
import { type BulkOp } from './PlanFerramentas'
import { useAbrirItens, useLancadoNoMes } from './itensContexto'
import { useAbrirAjuste } from '../acompanhamento/ajustePlanoContexto'
import { itensDoMes } from '../../utils/itensPlano'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { corDoIcone } from '../../utils/iconeDesenhado'
import { IconeCat } from '../IconeCat'
import {
  COR, MESES_FULL, MOTIVO_PLANO_LOCKADO, agrupar, fmt, nomeExibicao,
  type AnoData, type Cat, type Saldos,
} from './types'
import type { Categoria } from '../../context/AppContext'
import type { Descoberta } from '../../utils/descoberta'

/**
 * O Planejamento no celular. Regra do Guilherme em 13/10/2026: "o que tem no
 * web precisa ter no mobile, nem mais nem menos". Muda só a arrumação:
 *
 *   computador                         celular
 *   PageHeader + PlanResumoAnual       topo azul + PlanResumoAnual compacto (2 × 2)
 *   PlanBarraFerramentas               a mesma barra
 *   gráfico, valor em cima da coluna   o mesmo gráfico, rolando para o lado
 *   doze cartões de mês                UM cartão, com setas dos lados (pedido dele)
 *   clique abre PlanModalMeses         toque abre o mesmo conteúdo embaixo do cartão:
 *                                      categorias por grupo, valor editável, o nome
 *                                      abre o ajuste, e Receitas/Despesas/Resultado
 *
 * Nenhum número novo: `previsto` e `dadosPrevisto`, os mesmos da Grade, e a
 * gravação é o mesmo `onSave`.
 */

const AZUL_TOPO = 'linear-gradient(160deg,#0f2878 0%,#1e40af 100%)'
// As cores do cartão e do gráfico do computador (PlanAnoVisao), no branco.
const COR_ATUAL = '#1e3a8a'
const COR_NEG = '#b91c1c'
const VERDE = '#14532d'
const SUAVE = '#475569'

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
  inicioReal?: number[]
  /** Faixas que vêm antes das categorias (descoberta, revisão, só administrador). */
  avisos?: ReactNode
}

export default function PlanMobile(p: Props) {
  const { anoAtual, mesAtual, previsto, dadosPrevisto } = p
  const anoCorrente = new Date().getFullYear()
  const ehAnoCorrente = anoAtual === anoCorrente
  const [mes, setMes] = useState(ehAnoCorrente ? mesAtual : 0)
  const [aberto, setAberto] = useState(false)
  // Mês para onde as setas do cartão levam quando atravessam o ano.
  const mesDestino = useRef<number | null>(null)

  // Trocou de ano: volta ao mês corrente (ano corrente) ou a janeiro — salvo
  // quando foram as setas do cartão que atravessaram (dez → jan, jan → dez).
  useEffect(() => {
    const destino = mesDestino.current
    mesDestino.current = null
    setMes(destino ?? (anoAtual === anoCorrente ? mesAtual : 0))
  }, [anoAtual, anoCorrente, mesAtual])

  const andar = (d: number) => {
    const n = mes + d
    if (n >= 0 && n <= 11) { setMes(n); return }
    mesDestino.current = n < 0 ? 11 : 0
    p.setAnoAtual(a => a + (n < 0 ? -1 : 1))
  }

  // O mesmo texto do cartão sem plano da Grade (PlanGrade.textoSemPlano).
  const desc = p.descoberta
  const semPlanoTexto = (mi: number) => {
    if (desc?.ativa && anoAtual === desc.mesObservado.ano && mi === desc.mesObservado.mes) {
      const faltam = desc.diasAteFechar
      return `Descobrindo · ${faltam <= 0 ? `${MESES_FULL[mi]} fecha hoje` : `faltam ${faltam} ${faltam === 1 ? 'dia' : 'dias'}`}`
    }
    return 'Sem planejamento · toque para planejar'
  }

  const meses = mesesDoAno({ previsto, anoAtual, mesAtual, fechamentoReal: p.fechamentoReal,
    inicioReal: p.inicioReal, objetivos: p.objetivos })
  const m = meses[mes]
  const sem = m.semPlano && !m.fechado ? semPlanoTexto(mes) : null
  const dif = m.real !== undefined ? m.real - m.final : 0

  return (
    <div style={{ minHeight: '100vh', background: M.fundo, fontFamily: "-apple-system,'Inter',sans-serif", paddingBottom: 110 }}>
      {/* ── Topo: o do computador (título, ano, "?" e a resposta do ano) ── */}
      <div style={{ background: AZUL_TOPO, color: '#fff', borderRadius: '0 0 28px 28px', padding: '18px 16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.5px', color: 'rgba(255,255,255,.75)' }}>TODO ANO</div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Planejamento</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={() => p.setAnoAtual(a => a - 1)} aria-label="Ano anterior" style={BTN_ANO}>‹</button>
            <span style={{ fontSize: 17, fontWeight: 800, minWidth: 48, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{anoAtual}</span>
            <button onClick={() => p.setAnoAtual(a => a + 1)} aria-label="Próximo ano" style={BTN_ANO}>›</button>
            <AjudaTela tela="planejamento" />
          </div>
        </div>
        {/* Na descoberta a resposta do ano sai, como no computador. */}
        {!desc?.ativa && <PlanResumoAnual previsto={previsto} anoAtual={anoAtual} mesAtual={mesAtual} fechamentoReal={p.fechamentoReal}
          inicioReal={p.inicioReal} objetivos={p.objetivos} compacto />}
      </div>

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {p.avisos}

        {/* A barra de ferramentas, no mesmo lugar do computador. */}
        <PlanBarraFerramentas
          mesAtual={mesAtual} anoAtual={anoAtual} dadosAtivos={dadosPrevisto}
          dadosAnoAnterior={p.dadosAnoAnterior} categorias={p.categorias} onBulkSave={p.onBulkSave}
          motivoBloqueio={MOTIVO_PLANO_LOCKADO}
        />

        <GraficoAno meses={meses} mes={mes} onEscolher={mi => { setMes(mi); setAberto(true) }} />

        {/* ── O cartão do mês, o da Grade, com setas dos lados. Tocar abre as
            categorias do mês, como o clique abre o modal no computador. ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" onClick={() => andar(-1)} aria-label="Mês anterior" style={BTN_MES}>‹</button>
          <button type="button" onClick={() => setAberto(v => !v)} aria-expanded={aberto} style={{
            all: 'unset', boxSizing: 'border-box', flex: 1, minWidth: 0, cursor: 'pointer',
            background: m.fechado ? '#f8fafc' : '#fff', borderRadius: 18, padding: '12px 14px', boxShadow: M.sombra,
            border: m.atual ? '2px solid #3b82f6' : '1.5px solid #c3ccd8',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{MESES_FULL[mes]}</span>
              {m.atual && <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                background: '#dbeafe', color: COR_ATUAL }}>ATUAL</span>}
              {m.fechado && <span aria-label="Mês fechado" style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px',
                borderRadius: 999, background: '#e2e8f0', color: '#334155' }}>✓</span>}
            </span>
            <span style={{ fontSize: 13, color: SUAVE }}>{m.fechado ? 'fechou com' : 'termina com'}</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: m.valor < 0 ? COR_NEG : VERDE,
              fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {fmt(m.valor, true)}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
              color: sem ? SUAVE : m.real !== undefined ? (dif < 0 ? COR_NEG : VERDE) : (m.sobra < 0 ? COR_NEG : VERDE) }}>
              {sem ?? (m.real !== undefined
                ? (Math.abs(dif) < 0.005 ? 'igual ao previsto'
                  : `${dif > 0 ? '▲' : '▼'} ${fmt(Math.abs(dif), true)} ${dif > 0 ? 'acima' : 'abaixo'}`)
                : m.sobra >= 0 ? `+ ${fmt(m.sobra, true)} de sobra` : `− ${fmt(-m.sobra, true)} no mês`)}
            </span>
            {!sem && <MetaNoCartao m={m} grande />}
          </button>
          <button type="button" onClick={() => andar(1)} aria-label="Próximo mês" style={BTN_MES}>›</button>
        </div>

        {aberto && (
          <CategoriasDoMes mes={mes} anoAtual={anoAtual} dados={dadosPrevisto} previsto={previsto}
            hasFaturaCat={p.hasFaturaCat} categorias={p.categorias} onSave={p.onSave}
            mesAtual={mesAtual} objetivos={p.objetivos} onMetaSave={p.onMetaSave} />
        )}
      </div>

      <BottomNav />
    </div>
  )
}

/**
 * O conteúdo do PlanModalMeses, num mês só: categorias por grupo, o nome que
 * abre o ajuste do Radar, a célula de sempre, e no pé Receitas, Despesas e
 * Resultado do mês (de `previsto`, o mesmo do cartão).
 */
function CategoriasDoMes({ mes, anoAtual, dados, previsto, hasFaturaCat, categorias, onSave, mesAtual, objetivos, onMetaSave }: {
  mes: number; anoAtual: number; dados: AnoData; previsto: Saldos; hasFaturaCat: boolean; categorias: Categoria[]
  onSave: (tipo: 'e' | 's', ri: number, mi: number, valor: number) => void
  mesAtual: number; objetivos: number[]; onMetaSave: (objetivos: number[]) => void
}) {
  const abrirItens = useAbrirItens()
  const lancadoNoMes = useLancadoNoMes()
  const abrirAjuste = useAbrirAjuste()

  const linha = (cat: Cat, ri: number, tipo: 'e' | 's') => {
    const { icone, cor } = iconeCategoria(categorias, cat.nome)
    return (
      <div key={`${tipo}-${ri}`} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 48, borderBottom: `1px solid ${COR.borda}` }}>
        <span style={{ fontSize: 18, flexShrink: 0, width: 22, textAlign: 'center' }}><IconeCat icone={icone} cor={corDoIcone(cor)} /></span>
        {abrirAjuste ? (
          <button type="button" onClick={() => abrirAjuste({ tipo: tipo === 'e' ? 'entrada' : 'saida', nome: cat.nome,
            descricao: cat.descricao, prev: cat.v[mes] ?? 0, real: 0, mes })}
            style={{ all: 'unset', flex: 1, minWidth: 0, minHeight: 44, display: 'flex', alignItems: 'center', cursor: 'pointer',
              fontSize: M.corpo, color: COR.texto, textDecoration: 'underline', textDecorationColor: '#cbd5e1', textUnderlineOffset: 3 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeExibicao(cat)}</span>
          </button>
        ) : (
          <span style={{ flex: 1, minWidth: 0, fontSize: M.corpo, color: COR.texto, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {nomeExibicao(cat)}
          </span>
        )}
        <div style={{ flexShrink: 0, maxWidth: '50%', fontSize: M.corpo, textAlign: 'right' }}>
          <PlanCelulaEditavel grande
            valor={cat.v[mes] ?? 0}
            onSave={v => onSave(tipo, ri, mes, v)}
            itens={itensDoMes(cat, mes)}
            onItens={abrirItens ? pt => abrirItens(tipo, ri, mes, pt) : undefined}
            sempreItens={(lancadoNoMes?.(tipo, ri, mes) ?? 0) > 0.005}
          />
        </div>
      </div>
    )
  }

  // Com a fatura planejada como linha própria, as categorias de cartão não
  // entram — o mesmo filtro dos totais e do modal.
  const secao = (titulo: string, cor: string, cats: Cat[], tipo: 'e' | 's') => (
    <>
      <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.4px', color: cor, padding: '14px 0 6px' }}>{titulo}</div>
      {agrupar(cats, tipo).map(l => {
        if (l.k === 'grupo') {
          return (
            <div key={`${tipo}-g-${l.grupo}`} style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px',
              color: COR.textoSuave, padding: '10px 0 4px', borderBottom: `1px solid ${COR.borda}` }}>
              {l.grupo === '__sem_grupo__' ? 'Outros' : l.grupo}
            </div>
          )
        }
        if (tipo === 's' && hasFaturaCat && l.cat.t === 'cartao') return null
        return linha(l.cat, l.ri, tipo)
      })}
    </>
  )

  const receitas = previsto.totalEntradas[mes], despesas = previsto.totalSaidas[mes]
  const resultado = receitas - despesas
  return (
    <div style={{ background: '#fff', borderRadius: M.raio, boxShadow: M.sombra, padding: '14px 16px 16px' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: COR.texto }}>{MESES_FULL[mes]}</div>
      <div style={{ fontSize: 12, color: COR.textoSuave }}>Planejamento {anoAtual}</div>
      {/* A meta do mês, como no modal do computador. */}
      <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.4px', color: '#1e3a8a', padding: '14px 0 6px' }}>Meta de economia</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 48, borderBottom: `1px solid ${COR.borda}` }}>
        <i aria-hidden className="ti ti-target" style={{ fontSize: 18, width: 22, textAlign: 'center', color: '#15803d' }} />
        <span style={{ flex: 1, fontSize: M.corpo, color: COR.texto }}>Quanto quero guardar</span>
        <div style={{ flexShrink: 0, maxWidth: '50%', fontSize: M.corpo, textAlign: 'right' }}>
          <CampoMeta grande mi={mes} anoAtual={anoAtual} mesAtual={mesAtual} objetivos={objetivos} onMetaSave={onMetaSave} />
        </div>
      </div>
      {secao('Receitas', '#15803d', dados.entradas, 'e')}
      {secao('Despesas', '#b91c1c', dados.saidas, 's')}

      {/* O pé azul do modal. Sobre #1e3a8a: branco 10,4; rótulo a 75% 6,5; #86efac 8,1; #fecaca 9,6. */}
      <div style={{ marginTop: 14, background: '#1e3a8a', borderRadius: 12, padding: '6px 14px' }}>
        {([['Receitas', receitas], ['Despesas', despesas], ['Resultado', resultado]] as const).map(([rot, v]) => (
          <div key={rot} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 32 }}>
            <span style={{ fontSize: 12, fontWeight: rot === 'Resultado' ? 800 : 600, textTransform: 'uppercase', letterSpacing: '.4px',
              color: rot === 'Resultado' ? '#fff' : 'rgba(255,255,255,.75)' }}>{rot}</span>
            <span style={{ fontSize: rot === 'Resultado' ? 15 : 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
              color: rot === 'Resultado' ? (v >= 0 ? '#86efac' : '#fecaca') : '#fff' }}>
              {rot === 'Resultado' && v > 0 ? '+' : ''}{fmt(v, true)}
            </span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 13, color: COR.textoSuave, marginTop: 10, lineHeight: 1.5 }}>
        Toque num valor para editar (aceita conta, como <b>800+300</b>). Toque no <b>nome</b> para ver o que já
        está lançado nos próximos meses e ajustar o plano daqui para frente.
      </div>
    </div>
  )
}

/**
 * Os três gráficos do ano, os mesmos do computador (GraficoAnoPlano).
 * No celular as doze colunas não cabem com o valor legível, então ele rola
 * para o lado e abre no mês escolhido.
 */
function GraficoAno({ meses, mes, onEscolher }: { meses: MesDoAno[]; mes: number; onEscolher: (mi: number) => void }) {
  return (
    <div style={{ background: '#fff', borderRadius: M.raio, boxShadow: M.sombra, padding: '16px 0 12px' }}>
      <GraficoAnoPlano meses={meses} altura={150} coluna={64} escolhido={mes} onEscolher={onEscolher} />
    </div>
  )
}

/** Setas dos lados do cartão do mês, no fundo claro da página. */
const BTN_MES: CSSProperties = {
  width: 40, height: 40, borderRadius: '50%', border: 'none', background: '#fff', boxShadow: M.sombra, flexShrink: 0,
  color: '#1e3a8a', fontSize: 22, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1,
}

const BTN_ANO: CSSProperties = {
  width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.15)',
  color: '#fff', fontSize: 22, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1,
}
