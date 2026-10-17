import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../../context/AppContext'
import type { DadosMes } from '../../context/AppContext'
import { iconeCategoria } from '../../utils/categoriaIcone'
import { corDoIcone } from '../../utils/iconeDesenhado'
import { itensDoMes, type ItemPlano } from '../../utils/itensPlano'
import { IconeCat } from '../IconeCat'
import { useToast } from '../Toast'
import PlanCelulaEditavel from './PlanCelulaEditavel'
import PageHeader, { PH_BTN_WHITE } from '../PageHeader'
import SeletorMesAno from '../SeletorMesAno'
import { COR, MESES_FULL, SEM_GRUPO, fmt, nomeExibicao, type AnoData, type Saldos } from './types'
import { linhasVazias, revisaoDoMes, type GrupoRevisao, type LinhaRevisao, type ModoBase } from './revisaoAnual'
import type { AbrirItens } from './itensContexto'

export type OpCelula = { tipo: 'e' | 's'; ri: number; mi: number; valor: number; itens?: ItemPlano[] | null }

const CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const CHAVE_MODO = 'compass:revisao-anual-base'
const MODOS: { id: ModoBase; rotulo: string }[] = [
  { id: 'mes', rotulo: 'Realizado do mês' },
  { id: 'media', rotulo: 'Média anual' },
  { id: 'anterior', rotulo: 'Mês anterior' },
]

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
 * Em 17/10/2026, pedido dele: o cabeçalho azul e o seletor de mês das outras
 * telas, a base escolhida entre o mesmo mês, a média do ano e o mês anterior,
 * e o já lançado embaixo do plano ("já gastou"), no lugar da coluna própria.
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
  // A base escolhida fica no aparelho, como o botão dos gráficos do ano.
  const [modo, setModo] = useState<ModoBase>(() => {
    try { const v = localStorage.getItem(CHAVE_MODO); if (v === 'mes' || v === 'media' || v === 'anterior') return v } catch { /* sem armazenamento */ }
    return 'mes'
  })
  const escolherModo = (m: ModoBase) => { setModo(m); try { localStorage.setItem(CHAVE_MODO, m) } catch { /* sem armazenamento */ } }
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
    alvo, mes, modo, dadosAlvo: dadosAtivos, hasFaturaCat,
    extratoData: extratoData as Record<string, DadosMes>, faturaData: faturaData as Record<string, unknown>,
    contas, categorias, planos,
  }), [alvo, mes, modo, dadosAtivos, hasFaturaCat, extratoData, faturaData, contas, categorias, planos])
  const vazias = useMemo(() => linhasVazias(r), [r])

  const nomeMes = MESES_FULL[mes]
  const mb = r.mesesBase
  const faixaMedia = mb.length === 0 ? '' : mb.length === 1 ? `${CURTOS[mb[0].mes]}/${base}`
    : `${CURTOS[mb[0].mes]}–${CURTOS[mb[mb.length - 1].mes]}/${base}`
  // Como a base se chama em cada lugar: rótulo curto (celular e pé), título
  // da coluna e a frase da sugestão.
  const rotBase = modo === 'media' ? `média ${base}`
    : `${CURTOS[mb[0]?.mes ?? mes]}/${mb[0]?.ano ?? base}`
  const tituloBase: [string, string] = modo === 'media' ? [`Média ${base}`, faixaMedia || 'sem mês fechado']
    : modo === 'anterior' ? [`${MESES_FULL[mb[0].mes]} ${mb[0].ano}`, 'mês anterior']
    : [`${nomeMes} ${base}`, 'realizado']
  const descrBase = modo === 'media' ? `a média de ${faixaMedia}` : `o realizado de ${rotBase}`
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
    ? `Sugestão: ${descrBase} sem as parcelas, mais as parcelas já lançadas em ${rotAlvo}.`
    : modo === 'media'
      ? `${base} ainda não tem mês fechado para fazer a média.`
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

  function celulaPlano(l: LinhaRevisao) {
    const abaixo = futuroAlvo && l.lancado - l.plano > 0.005
    const titulo = l.parcelas.map(p => `${p.descricao} · ${p.atual} de ${p.total}: ${fmt(p.valor)}`).join('\n')
    // O já lançado vai embaixo do valor, como no Planejamento ("já gastou" /
    // "já recebeu"): a coluna própria saiu a pedido do Guilherme (17/10/2026).
    return (
      <div title={titulo || undefined} style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <PlanCelulaEditavel
          valor={l.plano}
          onSave={v => gravar(l, v)}
          itens={itensDoMes(l.cat, mes)}
          onItens={p => abrirItens(l.tipo, l.ri, mes, p)}
          sempreItens={futuroAlvo && l.lancado > 0.005}
          lancado={l.lancado}
          entrada={l.tipo === 'e'}
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

  const colunas = 'minmax(200px, 1fr) 150px 150px 150px'

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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8, alignItems: 'start' }}>
            <div>{rot(modo === 'media' ? rotBase : `${rotBase} real`)}{celulaBase(l)}</div>
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
      </div>
    )
    return (
      <div key={`g-${tipo}-${g.grupo}`} style={{ display: 'grid', gridTemplateColumns: colunas, gap: 12, alignItems: 'center',
        padding: '8px 10px', background: '#eaf1fd', borderRadius: 10, marginTop: 10 }}>
        <span style={estilo}>{nome}</span>
        <span style={{ textAlign: 'right' }}>{num(g.real, true, '#1e3a8a')}</span>
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
            <span style={{ fontWeight: 600, color: COR.texto, fontVariantNumeric: 'tabular-nums' }}>{fmt(outras, true)} {modo === 'media' ? `na ${rotBase}` : `em ${rotBase}`}</span>
          </div>
        )}
      </div>
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
      <div role="dialog" aria-modal="true" aria-label={`Revisão do plano ${alvo}`} style={{
        background: COR.branco, borderRadius: isMobile ? 0 : 20, width: isMobile ? '100%' : 'min(960px, 96vw)',
        height: isMobile ? '100%' : undefined, maxHeight: isMobile ? '100%' : '92vh',
        overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: "-apple-system, 'Inter', sans-serif",
      }}>
        {/* Topo: o cabeçalho azul das telas (PageHeader) com o seletor de mês
            de sempre — preso no ano que se monta —, e embaixo a escolha da base. */}
        <div style={{ padding: isMobile ? '12px 12px 0' : '14px 14px 0' }}>
          <PageHeader
            icon="ti-arrows-left-right"
            breadcrumb="Planejamento"
            title={`Revisão do plano ${alvo}`}
            subtitle={`O que aconteceu × o que você planeja para ${alvo}`}
            mb={0}
            rightContent={<>
              {!isMobile && <SeletorMesAno mes={mes} ano={alvo} anoFixo habilitado={(_, a) => a === alvo}
                onSelect={m => setMes(m)} />}
              <button type="button" onClick={onFechar} aria-label="Fechar"
                style={{ ...PH_BTN_WHITE, width: 36, height: 36, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i aria-hidden className="ti ti-x" style={{ fontSize: 18 }} />
              </button>
            </>}
          >
            {isMobile && (
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
                <SeletorMesAno mes={mes} ano={alvo} anoFixo habilitado={(_, a) => a === alvo} onSelect={m => setMes(m)} />
              </div>
            )}
          </PageHeader>
        </div>
        <div style={{ padding: isMobile ? '12px 16px 10px' : '12px 20px 10px', borderBottom: `1px solid ${COR.borda}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: COR.texto }}>Comparar com</span>
            <div role="tablist" aria-label="Comparar com" style={{ display: 'inline-flex', background: '#eef2f8',
              borderRadius: 999, padding: 3, gap: 2, maxWidth: '100%', overflowX: 'auto' }}>
              {MODOS.map(o => {
                const ativo = o.id === modo
                return (
                  <button key={o.id} type="button" role="tab" aria-selected={ativo} onClick={() => escolherModo(o.id)}
                    style={{ border: 'none', borderRadius: 999, padding: isMobile ? '8px 11px' : '6px 14px', cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: 13, fontWeight: ativo ? 700 : 600, whiteSpace: 'nowrap',
                      background: ativo ? '#1e3a8a' : 'transparent', color: ativo ? '#fff' : '#334155' }}>
                    {o.rotulo}
                  </button>
                )
              })}
            </div>
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
              <span>{tituloBase[0]}<br /><span style={{ fontWeight: 500 }}>{tituloBase[1]}</span></span>
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
          gridTemplateColumns: isMobile ? '1fr auto auto' : 'minmax(200px, 1fr) 150px 150px 150px', columnGap: 12, rowGap: 4,
          alignItems: 'center', fontVariantNumeric: 'tabular-nums' }}>
          <span />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', textAlign: 'right' }}>{modo === 'media' ? rotBase : `${rotBase} real`}</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', textAlign: 'right' }}>{rotAlvo} plano</span>
          {!isMobile && <span />}
          {pe.map(([rot, vb, va]) => (
            <div key={rot} style={{ display: 'contents' }}>
              <span style={{ fontSize: 12, fontWeight: rot === 'Resultado' ? 800 : 600, textTransform: 'uppercase', letterSpacing: '.4px',
                color: rot === 'Resultado' ? '#fff' : 'rgba(255,255,255,.75)' }}>{rot}</span>
              <span style={{ fontSize: 13, fontWeight: 800, textAlign: 'right', color: corPe(rot, vb) }}>{fmt(vb, true)}</span>
              <span style={{ fontSize: 13, fontWeight: 800, textAlign: 'right', color: corPe(rot, va) }}>{fmt(va, true)}</span>
              {!isMobile && <span />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
