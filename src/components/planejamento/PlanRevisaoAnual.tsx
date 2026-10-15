import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../../context/AppContext'
import type { DadosMes } from '../../context/AppContext'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { corDoIcone } from '../../utils/iconeDesenhado'
import { itensDoMes, type ItemPlano } from '../../utils/itensPlano'
import { IconeCat } from '../IconeCat'
import { useToast } from '../Toast'
import PlanCelulaEditavel from './PlanCelulaEditavel'
import { COR, MESES_FULL, SEM_GRUPO, fmt, nomeExibicao, type AnoData, type Saldos } from './types'
import { linhasVazias, revisaoDoMes, type GrupoRevisao, type LinhaRevisao } from './revisaoAnual'
import type { AbrirItens } from './itensContexto'

export type OpCelula = { tipo: 'e' | 's'; ri: number; mi: number; valor: number; itens?: ItemPlano[] | null }

const CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
}

/**
 * Revisão do plano anual (pedido do Guilherme em 15/10/2026): o mesmo mês de
 * dois anos lado a lado, para montar o plano do ano que vem olhando o que
 * aconteceu — janeiro de 2026 realizado × janeiro de 2027 planejado, por grupo
 * e categoria, com o que já está lançado em 2027 (parcelas da fatura).
 *
 * A mesma janela no computador e no celular; só a arrumação muda: no
 * computador as colunas ficam numa linha, no celular os três números vão
 * embaixo do nome. O valor do ano novo é a célula de sempre (aceita conta,
 * abre os itens), e grava SÓ aquele mês — aqui se revisa mês a mês, sem a
 * repetição até dezembro do Planejamento.
 */
export default function PlanRevisaoAnual({
  alvo, mesInicial, dadosAtivos, previsto, hasFaturaCat, onEditar, abrirItens, onFechar,
}: {
  /** O ano que se monta; a base é o anterior. */
  alvo: number
  mesInicial: number
  dadosAtivos: AnoData
  /** Os totais do ano novo — o MESMO objeto dos cartões do Planejamento. */
  previsto: Saldos
  hasFaturaCat: boolean
  onEditar: (ops: OpCelula[]) => void
  abrirItens: AbrirItens
  onFechar: () => void
}) {
  const { extratoData, faturaData, contas, categorias, planos } = useApp()
  const isMobile = useIsMobile()
  const { toast } = useToast()
  const [mes, setMes] = useState(mesInicial)
  const base = alvo - 1
  const fecharRef = useRef(onFechar)
  fecharRef.current = onFechar

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.querySelectorAll('[aria-modal="true"]').length <= 1) fecharRef.current()
    }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [])

  const r = useMemo(() => revisaoDoMes({
    alvo, mes, dadosAlvo: dadosAtivos, hasFaturaCat,
    extratoData: extratoData as Record<string, DadosMes>, faturaData: faturaData as Record<string, unknown>,
    contas, categorias, planos,
  }), [alvo, mes, dadosAtivos, hasFaturaCat, extratoData, faturaData, contas, categorias, planos])
  const vazias = useMemo(() => linhasVazias(r), [r])

  const nomeMes = MESES_FULL[mes]
  const rotBase = `${CURTOS[mes]}/${base}`
  const rotAlvo = `${CURTOS[mes]}/${alvo}`
  const hojeIdx = new Date().getFullYear() * 12 + new Date().getMonth()
  const futuroAlvo = alvo * 12 + mes > hojeIdx

  const gravar = (l: LinhaRevisao, valor: number, itens?: ItemPlano[] | null) =>
    onEditar([{ tipo: l.tipo, ri: l.ri, mi: mes, valor, itens }])

  function preencher() {
    onEditar(vazias.map(l => ({ tipo: l.tipo, ri: l.ri, mi: mes, valor: l.sugerido!, itens: l.itensSugeridos })))
    toast(`${vazias.length} ${vazias.length === 1 ? 'categoria preenchida' : 'categorias preenchidas'} em ${nomeMes.toLowerCase()} de ${alvo}.`, 'success')
  }

  const aviso = r.estadoBase === 'fechado'
    ? `Sugestão: o realizado de ${rotBase} sem as parcelas, mais as parcelas já lançadas em ${rotAlvo}.`
    : r.estadoBase === 'corrente'
      ? `${nomeMes} de ${base} ainda está em andamento: o realizado é até hoje, e a sugestão só cobre o já lançado.`
      : `${nomeMes} de ${base} ainda não aconteceu: embaixo do realizado aparece o que o plano de ${base} prevê.`

  // ── Peças ───────────────────────────────────────────────────────────
  const num = (v: number, forte = false, cor: string = COR.texto) => (
    <span style={{ fontSize: isMobile ? 14 : 13, fontWeight: forte ? 800 : 600, color: Math.abs(v) < 0.005 ? COR.textoVazio : cor,
      fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmt(v)}</span>
  )
  const legenda = (t: string, cor: string = COR.textoSuave) => (
    <div style={{ fontSize: 12, color: cor, marginTop: 2, whiteSpace: 'nowrap' }}>{t}</div>
  )

  function celulaBase(l: LinhaRevisao) {
    return (
      <div style={{ textAlign: 'right' }}>
        {num(l.real)}
        {l.planoBase > 0.005 && legenda(`plano ${fmt(l.planoBase)}`)}
      </div>
    )
  }

  function celulaLancado(l: LinhaRevisao) {
    const titulo = l.parcelas.map(p => `${p.descricao} · ${p.atual} de ${p.total}: ${fmt(p.valor)}`).join('\n')
    return (
      <div style={{ textAlign: 'right' }} title={titulo || undefined}>
        {num(l.lancado)}
        {l.parcelas.length > 0 && legenda(l.parcelas.length === 1 ? '1 parcela' : `${l.parcelas.length} parcelas`)}
      </div>
    )
  }

  function celulaPlano(l: LinhaRevisao) {
    const abaixo = futuroAlvo && l.lancado - l.plano > 0.005
    return (
      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <PlanCelulaEditavel
          valor={l.plano}
          onSave={v => gravar(l, v)}
          itens={itensDoMes(l.cat, mes)}
          onItens={p => abrirItens(l.tipo, l.ri, mes, p)}
          sempreItens={futuroAlvo && l.lancado > 0.005}
          grande={isMobile}
        />
        {abaixo && legenda('abaixo do já lançado', COR.erroTexto)}
      </div>
    )
  }

  function botaoSugestao(l: LinhaRevisao) {
    if (l.sugerido === null) return isMobile ? null : <span />
    return (
      <button type="button" onClick={() => gravar(l, l.sugerido!, l.itensSugeridos)}
        title={`Usar ${fmt(l.sugerido)} no plano de ${rotAlvo}`}
        style={{ border: `1px solid ${COR.infoBorda}`, background: COR.infoFundo, color: '#1e3a8a', borderRadius: 999,
          padding: isMobile ? '8px 12px' : '4px 10px', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', justifySelf: 'end' }}>
        <i aria-hidden className="ti ti-arrow-back-up" style={{ fontSize: 14 }} />
        Usar {fmt(l.sugerido, true)}
      </button>
    )
  }

  const colunas = 'minmax(180px, 1fr) 130px 120px 140px 140px'

  function nomeLinha(l: LinhaRevisao) {
    const { icone, cor } = iconeCategoria(categorias, l.cat.nome)
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}><IconeCat icone={icone} cor={corDoIcone(cor)} /></span>
        <span style={{ fontSize: isMobile ? 15 : 13, fontWeight: isMobile ? 600 : 500, color: COR.texto,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeExibicao(l.cat)}</span>
      </div>
    )
  }

  function linha(l: LinhaRevisao) {
    if (isMobile) {
      const rot = (t: string) => <div style={{ fontSize: 12, color: COR.textoSuave, marginBottom: 2, textAlign: 'right' }}>{t}</div>
      return (
        <div key={`${l.tipo}-${l.ri}`} style={{ padding: '12px 0', borderBottom: `1px solid ${COR.borda}` }}>
          {nomeLinha(l)}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8, alignItems: 'start' }}>
            <div>{rot(`${rotBase} real`)}{celulaBase(l)}</div>
            <div>{rot('já lançado')}{celulaLancado(l)}</div>
            <div>{rot(`${rotAlvo} plano`)}{celulaPlano(l)}</div>
          </div>
          {l.sugerido !== null && <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>{botaoSugestao(l)}</div>}
        </div>
      )
    }
    return (
      <div key={`${l.tipo}-${l.ri}`} style={{ display: 'grid', gridTemplateColumns: colunas, gap: 12, alignItems: 'center',
        padding: '7px 0', borderBottom: `1px solid ${COR.borda}` }}>
        {nomeLinha(l)}
        {celulaBase(l)}
        {celulaLancado(l)}
        {celulaPlano(l)}
        {botaoSugestao(l)}
      </div>
    )
  }

  function cabecalhoGrupo(g: GrupoRevisao, tipo: 'e' | 's') {
    const nome = g.grupo === SEM_GRUPO ? 'Outros' : g.grupo
    const estilo = { fontSize: 12, fontWeight: 700, color: '#1e3a8a', textTransform: 'uppercase' as const, letterSpacing: '.4px' }
    if (isMobile) return (
      <div key={`g-${tipo}-${g.grupo}`} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, padding: '12px 10px 6px',
        background: '#eaf1fd', borderRadius: 10, marginTop: 10 }}>
        <span style={estilo}>{nome}</span>
        <span style={{ ...estilo, textTransform: 'none', letterSpacing: 0, fontVariantNumeric: 'tabular-nums' }}>
          {fmt(g.real, true)} → {fmt(g.plano, true)}
        </span>
        {g.lancado > 0.005 && (
          <span style={{ flexBasis: '100%', textAlign: 'right', fontSize: 12, color: '#1e3a8a', marginTop: -2 }}>
            já lançado em {rotAlvo}: {fmt(g.lancado, true)}
          </span>
        )}
      </div>
    )
    return (
      <div key={`g-${tipo}-${g.grupo}`} style={{ display: 'grid', gridTemplateColumns: colunas, gap: 12, alignItems: 'center',
        padding: '8px 10px', background: '#eaf1fd', borderRadius: 10, marginTop: 10 }}>
        <span style={estilo}>{nome}</span>
        <span style={{ textAlign: 'right' }}>{num(g.real, true, '#1e3a8a')}</span>
        <span style={{ textAlign: 'right' }}>{num(g.lancado, true, '#1e3a8a')}</span>
        <span style={{ textAlign: 'right', paddingRight: 6 }}>{num(g.plano, true, '#1e3a8a')}</span>
        <span />
      </div>
    )
  }

  function secao(titulo: string, cor: string, grupos: GrupoRevisao[], outras: number, tipo: 'e' | 's') {
    if (grupos.length === 0 && Math.abs(outras) < 0.005) return null
    const temGrupos = grupos.some(g => g.grupo !== SEM_GRUPO)
    return (
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.4px', color: cor }}>{titulo}</div>
        {grupos.map(g => (
          <div key={g.grupo}>
            {(temGrupos || g.grupo !== SEM_GRUPO) && cabecalhoGrupo(g, tipo)}
            <div style={{ padding: '0 10px' }}>{g.linhas.map(linha)}</div>
          </div>
        ))}
        {/* O realizado sem linha no plano (categoria desativada ou excluída) —
            o "Outras" do Radar. Sem ele o total de baixo não fecharia com as linhas. */}
        {Math.abs(outras) > 0.005 && (
          <div style={{ padding: '10px 10px 0', fontSize: 13, color: COR.textoSuave, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span>Outras · categoria desativada ou excluída</span>
            <span style={{ fontWeight: 600, color: COR.texto, fontVariantNumeric: 'tabular-nums' }}>{fmt(outras, true)} em {rotBase}</span>
          </div>
        )}
      </div>
    )
  }

  const seta = (dir: -1 | 1) => {
    const desligada = dir < 0 ? mes <= 0 : mes >= 11
    return (
      <button type="button" aria-label={dir < 0 ? 'Mês anterior' : 'Próximo mês'} disabled={desligada}
        onClick={() => setMes(m => Math.max(0, Math.min(11, m + dir)))}
        style={{ width: 40, height: 40, borderRadius: '50%', border: `1px solid ${COR.borda}`, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: desligada ? COR.superficie : COR.branco, color: desligada ? COR.textoVazio : '#1e3a8a',
          cursor: desligada ? 'default' : 'pointer' }}>
        <i aria-hidden className={`ti ti-chevron-${dir < 0 ? 'left' : 'right'}`} style={{ fontSize: 18 }} />
      </button>
    )
  }

  // Pé: o mês nos dois anos. Realizado = os cartões do Radar daquele mês;
  // plano = os totais do Planejamento (`previsto`). Sobre #1e3a8a: branco
  // 10,4; rótulo a 75% 6,5; #86efac 8,1; #fecaca 9,6.
  const pe = ([
    ['Receitas', r.realTotal.e, previsto.totalEntradas[mes]],
    ['Despesas', r.realTotal.s, previsto.totalSaidas[mes]],
    ['Resultado', r.realTotal.e - r.realTotal.s, previsto.totalEntradas[mes] - previsto.totalSaidas[mes]],
  ] as const)
  const corPe = (rot: string, v: number) => rot !== 'Resultado' ? '#fff' : v >= 0 ? '#86efac' : '#fecaca'

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onFechar() }} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 0 : 16,
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby="revisao-anual-titulo" style={{
        background: COR.branco, borderRadius: isMobile ? 0 : 20, width: isMobile ? '100%' : 'min(960px, 96vw)',
        height: isMobile ? '100%' : undefined, maxHeight: isMobile ? '100%' : '92vh',
        overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: "-apple-system, 'Inter', sans-serif",
      }}>
        {/* Topo: título, o mês com setas, e o que a tela compara. */}
        <div style={{ padding: isMobile ? '14px 16px 12px' : '16px 20px 12px', borderBottom: `1px solid ${COR.borda}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ marginRight: 'auto', minWidth: 0 }}>
              <div id="revisao-anual-titulo" style={{ fontSize: isMobile ? 17 : 18, fontWeight: 800, color: COR.texto }}>
                Revisão do plano {alvo}
              </div>
              <div style={{ fontSize: 13, color: COR.textoSuave }}>O que aconteceu em {base} × o que você planeja para {alvo}</div>
            </div>
            <button type="button" onClick={onFechar} aria-label="Fechar" style={{ border: 'none', background: '#f1f5f9',
              borderRadius: 10, width: 40, height: 40, cursor: 'pointer', color: '#475569', flexShrink: 0 }}>
              <i aria-hidden className="ti ti-x" style={{ fontSize: 18 }} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {seta(-1)}
              <span style={{ minWidth: 110, textAlign: 'center', fontSize: 16, fontWeight: 800, color: '#1e3a8a' }}>{nomeMes}</span>
              {seta(1)}
            </span>
            {vazias.length > 0 && (
              <button type="button" onClick={preencher} style={{ marginLeft: isMobile ? 0 : 'auto', border: 'none',
                background: 'linear-gradient(135deg, #0f2878, #1e40af)', color: '#fff', borderRadius: 10, padding: '10px 14px',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i aria-hidden className="ti ti-wand" style={{ fontSize: 16 }} />
                Preencher {vazias.length === 1 ? '1 vazia' : `${vazias.length} vazias`} com a sugestão
              </button>
            )}
          </div>
          <div style={{ fontSize: 12, color: COR.textoSuave, marginTop: 8, lineHeight: 1.45 }}>{aviso}</div>
        </div>

        <div style={{ overflow: 'auto', flex: 1, padding: isMobile ? '0 16px 16px' : '0 20px 16px' }}>
          {!isMobile && (
            <div style={{ display: 'grid', gridTemplateColumns: colunas, gap: 12, position: 'sticky', top: 0, zIndex: 2,
              background: COR.branco, padding: '12px 10px 8px', borderBottom: `2px solid ${COR.borda}`,
              fontSize: 12, fontWeight: 700, color: COR.textoSuave, textAlign: 'right' }}>
              <span style={{ textAlign: 'left' }}>Categoria</span>
              <span>{nomeMes} {base}<br /><span style={{ fontWeight: 500 }}>realizado</span></span>
              <span>Já lançado<br /><span style={{ fontWeight: 500 }}>em {rotAlvo}</span></span>
              <span style={{ color: '#1e3a8a' }}>{nomeMes} {alvo}<br /><span style={{ fontWeight: 500 }}>plano</span></span>
              <span>Sugestão</span>
            </div>
          )}
          {secao('Receitas', COR.sucessoTexto, r.entradas, r.outras.e, 'e')}
          {secao('Despesas', COR.erroTexto, r.saidas, r.outras.s, 's')}
          <div style={{ fontSize: 12, color: COR.textoSuave, marginTop: 12, lineHeight: 1.5 }}>
            Toque no valor de {alvo} para editar (aceita conta, como <b>800+300</b>). Muda só {nomeMes.toLowerCase()};
            os outros meses ficam como estão.
          </div>
        </div>

        <div style={{ background: '#1e3a8a', padding: isMobile ? '10px 16px' : '10px 30px', display: 'grid',
          gridTemplateColumns: isMobile ? '1fr auto auto' : `minmax(180px, 1fr) 130px 120px 140px 140px`, columnGap: 12, rowGap: 4,
          alignItems: 'center', fontVariantNumeric: 'tabular-nums' }}>
          <span />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', textAlign: 'right' }}>{rotBase} real</span>
          {!isMobile && <span />}
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', textAlign: 'right' }}>{rotAlvo} plano</span>
          {!isMobile && <span />}
          {pe.map(([rot, vb, va]) => (
            <div key={rot} style={{ display: 'contents' }}>
              <span style={{ fontSize: 12, fontWeight: rot === 'Resultado' ? 800 : 600, textTransform: 'uppercase', letterSpacing: '.4px',
                color: rot === 'Resultado' ? '#fff' : 'rgba(255,255,255,.75)' }}>{rot}</span>
              <span style={{ fontSize: 13, fontWeight: 800, textAlign: 'right', color: corPe(rot, vb) }}>{fmt(vb, true)}</span>
              {!isMobile && <span />}
              <span style={{ fontSize: 13, fontWeight: 800, textAlign: 'right', color: corPe(rot, va) }}>{fmt(va, true)}</span>
              {!isMobile && <span />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
