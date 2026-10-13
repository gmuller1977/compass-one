import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import BottomNav from '../BottomNav'
import { Cartao, TituloCartao, IconeRedondo } from '../mobile/ui'
import { M } from '../mobile/estilo'
import PlanCelulaEditavel from './PlanCelulaEditavel'
import PlanBarraFerramentas from './PlanBarraFerramentas'
import { type BulkOp } from './PlanFerramentas'
import { useAbrirItens, useLancadoNoMes } from './itensContexto'
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
            : `Quanto sobra em ${MESES_FULL[mes]}`}
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
            <LinhaValor rotulo="Meta de economia" valor={p.objetivos[mes]}
              legenda={sobra >= p.objetivos[mes] ? '✓ o plano alcança' : `faltam ${fmt(p.objetivos[mes] - sobra, true)} no plano`} />
          )}
        </Cartao>

        <Secao titulo="Receitas" cor={VERDE} total={receitas} tipo="e" cats={dadosPrevisto.entradas} mes={mes} categorias={p.categorias} onSave={p.onSave} />
        <Secao titulo="Despesas" cor={VERMELHO} total={despesas} tipo="s" cats={dadosPrevisto.saidas}
          visiveis={saidas ? new Set(saidas.map(x => x.ri)) : undefined} mes={mes} categorias={p.categorias} onSave={p.onSave} />

        <p style={{ margin: '0 4px', fontSize: 13, color: COR.textoSuave, lineHeight: 1.5 }}>
          Toque no grupo para abrir as categorias, e numa categoria com variantes para vê-las. O valor se
          planeja na categoria: toque nele para mudar (aceita conta, como <b>800+300</b>).
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
            <IconeRedondo icone={<i className="ti ti-tool" style={{ color: COR.azul }} />} />
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: M.titulo, fontWeight: 700, color: COR.texto }}>Ferramentas do plano</span>
              <span style={{ display: 'block', fontSize: M.legenda, color: COR.textoSuave, marginTop: 2 }}>
                Reajuste, copiar ano, meta
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

type Linha = { cat: Cat; ri: number }

/**
 * Uma família: a categoria MÃE e as variantes dela (utils/categoriaMae),
 * pedido do Guilherme em 11/10/2026: "precisa mostrar as categorias mãe, e ao
 * clicar as subcategorias. O planejamento inicial é na categoria".
 *
 *   - `mae`: a linha do plano sem variante (é nela que se planeja). Sem mãe
 *     cadastrada (Financiamento · Casa e · Civic), a família só agrupa.
 *   - `proprias`: variantes com linha própria no plano — as FIXAS de uma mãe,
 *     ou todas, quando não há mãe. Cada uma tem o seu valor.
 *   - `naMae`: variantes VARIÁVEIS que somam na mãe. Não têm linha: a parte
 *     delas é o item da mãe com o nome da variante, quando houver.
 */
type Familia = { nome: string; mae?: Linha; proprias: Linha[]; naMae: string[] }

const sem = (s?: string) => (s ?? '').trim()

function familias(linhas: Linha[], tipo: 'entrada' | 'saida', categorias: Categoria[]): Familia[] {
  const out: Familia[] = []
  for (const l of linhas) {
    const nome = sem(l.cat.nome)
    let f = out.find(x => x.nome === nome)
    if (!f) { f = { nome, proprias: [], naMae: [] }; out.push(f) }
    if (sem(l.cat.descricao)) f.proprias.push(l)
    else f.mae = l
  }
  for (const f of out) {
    if (!f.mae) continue
    f.naMae = categorias
      .filter(c => c.ativa && c.tipo === tipo && sem(c.nome) === f.nome && sem(c.descricao) && !c.fixa)
      .map(c => sem(c.descricao))
      .sort((x, y) => x.localeCompare(y, 'pt-BR'))
  }
  return out
}

/** A parte da variante no valor da mãe: os itens com o nome dela ("Martin", "Martin · ..."). */
function parteNaMae(mae: Cat, variante: string, mes: number): number | null {
  const itens = itensDoMes(mae, mes)
  if (!itens) return null
  const dela = itens.filter(i => sem(i.descricao) === variante || sem(i.descricao).startsWith(`${variante} · `))
  return dela.length ? dela.reduce((s, i) => s + i.valor, 0) : null
}

/** Receitas ou Despesas do mês: grupos, e em cada grupo as categorias mãe, que abrem as variantes. */
function Secao({ titulo, cor, total, tipo, cats, visiveis, mes, categorias, onSave }: {
  titulo: string; cor: string; total: number; tipo: 'e' | 's'; cats: Cat[]
  /** Com a fatura planejada como linha própria, as categorias de cartão não entram (o filtro dos totais). */
  visiveis?: Set<number>
  mes: number; categorias: Categoria[]
  onSave: (tipo: 'e' | 's', ri: number, mi: number, valor: number) => void
}) {
  const abrirItens = useAbrirItens()
  const abrirAjuste = useAbrirAjuste()
  const lancadoNoMes = useLancadoNoMes()
  const [abertas, setAbertas] = useState<Set<string>>(() => new Set())
  const tipoCad = tipo === 'e' ? 'entrada' : 'saida'

  // Os grupos, cada um com as suas linhas, na ordem do agrupar().
  const grupos: { grupo: string | null; linhas: Linha[] }[] = []
  for (const l of agrupar(cats, tipo)) {
    if (l.k === 'grupo') { grupos.push({ grupo: l.grupo, linhas: [] }); continue }
    if (visiveis && !visiveis.has(l.ri)) continue
    if (grupos.length === 0) grupos.push({ grupo: null, linhas: [] })
    grupos[grupos.length - 1].linhas.push({ cat: l.cat, ri: l.ri })
  }
  const comLinhas = grupos.filter(g => g.linhas.length > 0)
  if (comLinhas.length === 0) return null

  const celula = ({ cat, ri }: Linha) => (
    <div style={{ flexShrink: 0, maxWidth: '52%', fontSize: M.corpo, fontWeight: 600, textAlign: 'right' }}>
      <PlanCelulaEditavel grande
        valor={cat.v[mes] ?? 0}
        onSave={v => onSave(tipo, ri, mes, v)}
        itens={itensDoMes(cat, mes)}
        onItens={abrirItens ? pt => abrirItens(tipo, ri, mes, pt) : undefined}
        sempreItens={(lancadoNoMes?.(tipo, ri, mes) ?? 0) > 0.005}
      />
    </div>
  )
  const ajustar = (cat: Cat) => abrirAjuste?.({ tipo: tipoCad, nome: cat.nome,
    descricao: cat.descricao, prev: cat.v[mes] ?? 0, real: 0, mes })

  // Mês futuro com algo já lançado: o valor mínimo do plano, embaixo do nome.
  const lancado = (ri: number) => lancadoNoMes?.(tipo, ri, mes) ?? 0
  const legendaLancado = (ri: number) => {
    const v = lancado(ri)
    return v > 0.005 ? `já lançado ${fmt(v, true)}` : null
  }

  const linhaSimples = (l: Linha, primeira: boolean) => {
    const { icone, cor: corCat } = iconeCategoria(categorias, l.cat.nome)
    const jaLanc = legendaLancado(l.ri)
    return (
      <div key={`${tipo}-${l.ri}`} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 52,
        borderTop: primeira ? 'none' : '1px solid #eef2f8' }}>
        <IconeRedondo icone={icone} cor={corCat} tamanho={36} />
        <button type="button" onClick={() => ajustar(l.cat)} disabled={!abrirAjuste}
          style={{ all: 'unset', flex: 1, minWidth: 0, minHeight: 44, display: 'flex', flexDirection: 'column', justifyContent: 'center',
            cursor: abrirAjuste ? 'pointer' : 'default', fontSize: M.corpo, fontWeight: 600, color: COR.texto }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeExibicao(l.cat)}</span>
          {jaLanc && <span style={{ fontSize: 12, fontWeight: 500, color: COR.textoSuave, marginTop: 1 }}>{jaLanc}</span>}
        </button>
        {celula(l)}
      </div>
    )
  }

  const linhaFamilia = (f: Familia, primeira: boolean) => {
    const chave = `${tipo}-${f.nome}`
    const aberta = abertas.has(chave)
    const alternar = () => setAbertas(prev => {
      const novo = new Set(prev)
      if (novo.has(chave)) novo.delete(chave)
      else novo.add(chave)
      return novo
    })
    const { icone, cor: corCat } = iconeCategoria(categorias, f.nome)
    const nVariantes = f.naMae.length + f.proprias.length
    const somaProprias = f.proprias.reduce((s, l) => s + (l.cat.v[mes] ?? 0), 0)
    const jaLanc = f.mae ? legendaLancado(f.mae.ri) : null
    const legenda = `${nVariantes} ${nVariantes === 1 ? 'variante' : 'variantes'}${jaLanc ? ` · ${jaLanc}` : ''}`
    return (
      <div key={chave} style={{ borderTop: primeira ? 'none' : '1px solid #eef2f8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 56 }}>
          <IconeRedondo icone={icone} cor={corCat} tamanho={36} />
          <button type="button" onClick={alternar} aria-expanded={aberta}
            style={{ all: 'unset', flex: 1, minWidth: 0, minHeight: 44, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: M.corpo, fontWeight: 700, color: COR.texto,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.nome}</span>
              <span style={{ display: 'block', fontSize: 12, color: COR.textoSuave, marginTop: 1 }}>{legenda}</span>
            </span>
            <span aria-hidden style={{ fontSize: 16, color: COR.textoSuave, flexShrink: 0,
              transform: aberta ? 'rotate(90deg)' : undefined, transition: 'transform .15s' }}>›</span>
          </button>
          {f.mae ? celula(f.mae) : (
            <span style={{ fontSize: M.corpo, fontWeight: 700, color: COR.texto, fontVariantNumeric: 'tabular-nums', padding: '0 8px' }}>
              {fmt(somaProprias)}
            </span>
          )}
        </div>
        {aberta && (
          <div style={{ margin: '0 0 10px 46px', paddingLeft: 12, borderLeft: '2px solid #dbeafe' }}>
            {f.mae && f.naMae.map(v => {
              const parte = parteNaMae(f.mae!.cat, v, mes)
              return (
                <div key={`na-${v}`} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 48 }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: M.corpo, fontWeight: 600, color: COR.texto }}>{v}</span>
                    <span style={{ display: 'block', fontSize: 12, color: COR.textoSuave, marginTop: 1 }}>variável · dentro de {f.nome}</span>
                  </span>
                  <span style={{ fontSize: M.corpo, color: parte === null ? COR.textoSuave : COR.texto,
                    fontVariantNumeric: 'tabular-nums', padding: '0 8px' }}>{parte === null ? '—' : fmt(parte, true)}</span>
                </div>
              )
            })}
            {f.proprias.map(l => (
              <div key={`pr-${l.ri}`} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 48 }}>
                <button type="button" onClick={() => ajustar(l.cat)} disabled={!abrirAjuste}
                  style={{ all: 'unset', flex: 1, minWidth: 0, minHeight: 44, cursor: abrirAjuste ? 'pointer' : 'default' }}>
                  <span style={{ display: 'block', fontSize: M.corpo, fontWeight: 600, color: COR.texto,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sem(l.cat.descricao)}</span>
                  <span style={{ display: 'block', fontSize: 12, color: COR.textoSuave, marginTop: 1 }}>
                    {f.mae ? 'fixa · valor próprio' : 'valor próprio'}
                  </span>
                </button>
                {celula(l)}
              </div>
            ))}
            {f.mae && f.naMae.length > 0 && (
              <div style={{ fontSize: 12, color: COR.textoSuave, lineHeight: 1.5, padding: '4px 0 2px' }}>
                O plano é na categoria. Para ver a parte de cada variante, detalhe o valor de {f.nome} em itens com o nome dela.
              </div>
            )}
            {f.mae && abrirAjuste && (
              <button type="button" onClick={() => ajustar(f.mae!.cat)} style={{
                all: 'unset', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: COR.azul, minHeight: 40,
                display: 'inline-flex', alignItems: 'center',
              }}>✎ Ver o já lançado e ajustar {f.nome}</button>
            )}
          </div>
        )}
      </div>
    )
  }

  const alternarGrupo = (g: string) => setAbertas(prev => {
    const novo = new Set(prev)
    if (novo.has(g)) novo.delete(g)
    else novo.add(g)
    return novo
  })

  // Cada grupo é um cartão próprio, FECHADO por padrão, com o total do mês —
  // pedido do Guilherme no mesmo dia: "cada grupo deveria ter um cartão
  // separado para não ficar esta lista". Recolhido, a seção vira um resumo
  // por grupo, como o Radar do celular.
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '6px 4px -4px' }}>
        <h2 style={{ margin: 0, fontSize: M.titulo, fontWeight: 800, color: COR.texto }}>{titulo}</h2>
        <span style={{ fontSize: M.titulo, fontWeight: 800, color: cor, fontVariantNumeric: 'tabular-nums' }}>{fmt(total, true)}</span>
      </div>
      {comLinhas.map(g => {
        const nomeGrupo = g.grupo === null || g.grupo === '__sem_grupo__' ? 'Outros' : g.grupo
        const chave = `grupo:${tipo}:${nomeGrupo}`
        const aberto = abertas.has(chave)
        const soma = g.linhas.reduce((t, l) => t + (l.cat.v[mes] ?? 0), 0)
        const fams = familias(g.linhas, tipoCad, categorias)
        const { icone, cor: corG } = iconeCategoria(categorias, fams[0]?.nome ?? '')
        return (
          <Cartao key={chave} style={{ padding: aberto ? '14px 18px 8px' : '14px 18px' }}>
            <button type="button" onClick={() => alternarGrupo(chave)} aria-expanded={aberto} style={{
              all: 'unset', boxSizing: 'border-box', width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              minHeight: 48, cursor: 'pointer',
            }}>
              <IconeRedondo icone={icone} cor={corG} tamanho={40} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: M.titulo, fontWeight: 700, color: COR.texto,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeGrupo}</span>
                <span style={{ display: 'block', fontSize: 13, color: COR.textoSuave, marginTop: 1 }}>
                  {fams.length} {fams.length === 1 ? 'categoria' : 'categorias'}
                </span>
              </span>
              <span style={{ fontSize: M.corpo, fontWeight: 800, color: soma > 0.005 ? COR.texto : COR.textoSuave,
                fontVariantNumeric: 'tabular-nums' }}>{fmt(soma, true)}</span>
              <span aria-hidden style={{ fontSize: 18, color: COR.textoSuave, transform: aberto ? 'rotate(90deg)' : undefined,
                transition: 'transform .15s' }}>›</span>
            </button>
            {aberto && (
              <div style={{ marginTop: 6, borderTop: '1px solid #eef2f8' }}>
                {fams.map((f, i) => {
                  const simples = f.proprias.length === 0 && f.naMae.length === 0
                  if (simples && f.mae) return linhaSimples(f.mae, i === 0)
                  if (!f.mae && f.proprias.length === 1 && f.naMae.length === 0) return linhaSimples(f.proprias[0], i === 0)
                  return linhaFamilia(f, i === 0)
                })}
              </div>
            )}
          </Cartao>
        )
      })}
    </>
  )
}

const BTN_ANO: CSSProperties = {
  width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.15)',
  color: '#fff', fontSize: 22, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1,
}
