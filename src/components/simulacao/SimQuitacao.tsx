import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import type { DadosMes, PlanoAnoData } from '../../context/AppContext'
import { COR } from '../../utils/cores'
import { parseValor } from '../../utils/moeda'
import { serieBaseDoPlano, type Mes } from '../../utils/simulacaoCompra'
import type { Deps } from '../../utils/saldoConta'
import { dadosBancariosDoMes, resolverFixaDoMes } from '../../utils/fixasDoMes'
import {
  dividasNoPlano, mesesParaQuitar, simularQuitacao, quitarNoPlano, type DividaNoPlano,
} from '../../utils/quitacaoDivida'
import { usePlanoDoMes } from './usePlanoDoMes'
import { GraficosDaSimulacao } from './SimCompra'
import ModalTopo from '../ModalTopo'

/**
 * "Quitar à vista": o financiamento já está no Planejamento, o banco deu o
 * valor para quitar, e a pergunta é QUANDO dá. Pedido do Guilherme em
 * 22/10/2026. Regras em utils/quitacaoDivida; aqui só formulário e leitura.
 *
 * O Simulador sugere o primeiro mês que cabe e mostra os meses seguintes sem
 * a parcela. A pessoa escolhe outro mês se quiser, e só "Atualizar o plano"
 * grava: a quitação no mês escolhido e as parcelas seguintes fora.
 */

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
  'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const mesEAno = (m: Mes) => `${MESES[m.mes]} de ${m.ano}`
const curto = (m: Mes) => `${MESES_CURTOS[m.mes]}/${String(m.ano).slice(2)}`
const igual = (a: Mes | null | undefined, b: Mes | null | undefined) => !!a && !!b && a.ano === b.ano && a.mes === b.mes
const seguinte = (m: Mes): Mes => (m.mes === 11 ? { ano: m.ano + 1, mes: 0 } : { ano: m.ano, mes: m.mes + 1 })
const rotuloDa = (d: DividaNoPlano) => (d.cat.descricao ? `${d.cat.nome} · ${d.cat.descricao}` : d.cat.nome)

const inputSt: React.CSSProperties = {
  width: '100%', padding: '11px 14px', border: `1px solid ${COR.borda}`,
  borderRadius: 10, fontSize: 15, fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box', background: COR.branco, color: COR.texto,
}
const labelSt: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 7,
}
/** O azul dos cards do Simulador (ver `cardAzul` em SimCompra): termina em #1e40af. */
const cardAzul: React.CSSProperties = {
  background: `linear-gradient(160deg, ${COR.azulEscuro} 0%, #1e40af 100%)`,
  border: '1px solid rgba(255,255,255,.12)', borderRadius: 12, padding: '20px 22px', minWidth: 0,
}
const apoio: React.CSSProperties = { fontSize: 12.5, color: 'rgba(255,255,255,.85)', lineHeight: 1.55 }
const VERDE = '#86efac'
const VERMELHO = '#fecaca'

export default function SimQuitacao({ isMobile }: { isMobile: boolean }) {
  const { contas, categorias, planos, setPlanos, extratoData, faturaData, saldoInicialDinheiro,
    cenarioPrevisao } = useApp()
  const navigate = useNavigate()
  const hoje = new Date()

  const deps: Deps = useMemo(() => ({
    extratoData: extratoData as Record<string, DadosMes>,
    faturaData: faturaData as Record<string, { lancamentos?: Record<number, { tipo: string; valor: number }[]> }>,
    contas, categorias,
    planos: planos as Record<number, PlanoAnoData | undefined>,
    saldoInicialDinheiro, cenarioPrevisao,
  }), [extratoData, faturaData, contas, categorias, planos, saldoInicialDinheiro, cenarioPrevisao])
  const serie = useMemo(
    () => serieBaseDoPlano(deps, hoje),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deps],
  )
  const planoDoMes = usePlanoDoMes(deps)

  const dividas = useMemo(
    () => dividasNoPlano(planos as Record<number, PlanoAnoData | undefined>, categorias,
      { ano: hoje.getFullYear(), mes: hoje.getMonth() }, serie?.fimDoPlano ?? null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [planos, categorias, serie],
  )

  const [dividaId, setDividaId] = useState('')
  const [valorStr, setValorStr] = useState('')
  const [escolhido, setEscolhido] = useState<Mes | null>(null)
  const [detalhes, setDetalhes] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  /** Depois de gravar: o que mudou e o plano de antes, para o Desfazer. */
  const [feito, setFeito] = useState<{ texto: string; antes: typeof planos } | null>(null)

  const divida = dividas.find(d => d.cat.id === dividaId) ?? dividas[0]
  const valor = parseValor(valorStr) ?? 0
  useEffect(() => { setEscolhido(null) }, [dividaId, valor])

  // A parcela deste mês já marcada paga não volta: a quitação tira as seguintes.
  const jaPaga = useMemo(() => {
    if (!divida) return false
    const dms = dadosBancariosDoMes(
      extratoData as Record<string, DadosMes>,
      `-${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`,
      k => contas.some(c => c.tipo === 'cartao' && k.startsWith(c.id)),
    )
    return resolverFixaDoMes(divida.cat.id, dms).consolidada
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [divida, extratoData, contas])

  const candidatos = useMemo(
    () => (serie && divida && valor > 0 ? mesesParaQuitar(serie, divida, valor, jaPaga) : null),
    [serie, divida, valor, jaPaga],
  )
  const quando = (escolhido && candidatos?.meses.some(m => igual(m.quando, escolhido)) ? escolhido : null)
    ?? candidatos?.sugerido ?? candidatos?.meses[0]?.quando ?? null
  const r = useMemo(
    () => (serie && divida && quando && valor > 0 ? simularQuitacao(serie, divida, valor, quando, jaPaga) : null),
    [serie, divida, quando, valor, jaPaga],
  )

  // O que o plano guarda em cada mês, quitando: a régua da meta do Planejamento.
  const guarda = useMemo(() => (r ? r.fluxo.map(pt => {
    const x = planoDoMes(pt.ano, pt.mes)
    return x ? { guarda: x.guarda - pt.parcela, sem: x.guarda, meta: x.meta } : null
  }) : []), [r, planoDoMes])

  const meta = useMemo(() => {
    if (!r) return null
    const depois = r.fluxo
      .map((pt, i) => ({ pt, g: guarda[i] }))
      .filter(({ pt, g }) => g && g.meta > 0 && pt.parcela < 0 && !igual(pt, r.quando))
    if (!depois.length) return null
    const dentro = (v: number, m: number) => v >= m - 0.005
    const noMes = guarda[r.fluxo.findIndex(pt => igual(pt, r.quando))]
    return {
      total: depois.length,
      antes: depois.filter(({ g }) => dentro(g!.sem, g!.meta)).length,
      agora: depois.filter(({ g }) => dentro(g!.guarda, g!.meta)).length,
      mesDaQuitacaoAbaixo: !!noMes && noMes.meta > 0 && !dentro(noMes.guarda, noMes.meta),
    }
  }, [r, guarda])

  function atualizarPlano() {
    if (!r || !divida) return
    const antes = planos
    setPlanos(quitarNoPlano(planos as Record<number, PlanoAnoData | undefined>, divida, r) as typeof planos)
    const depois = r.removidas.filter(p => !igual(p, r.quando))
    setFeito({
      antes,
      texto: `${rotuloDa(divida)}: ${mesEAno(r.quando)} ficou com a quitação de ${fmt(r.valor)}`
        + (depois.length ? `, e a parcela saiu de ${curto(depois[0])} a ${curto(depois[depois.length - 1])}.` : '.'),
    })
    setConfirmando(false)
    setValorStr('')
  }

  // ── Sem plano, ou sem dívida no plano ────────────────────────────────
  if (!serie) {
    return (
      <div style={cardAzul}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Quitar à vista</div>
        <div style={apoio}>Para sugerir quando dá para quitar, o Simulador lê o seu planejamento, e ele ainda está vazio.</div>
        <button onClick={() => navigate('/planejamento')} style={botaoBranco}>Ir para o Planejamento</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {feito && (
        <div style={{ background: COR.sucessoFundo, border: '1px solid #bbf7d0', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COR.sucessoTexto, marginBottom: 4 }}>✓ Planejamento atualizado</div>
          <div style={{ fontSize: 13, color: COR.texto, lineHeight: 1.5 }}>{feito.texto}</div>
          <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/planejamento')} style={link}>Ver no Planejamento</button>
            <button onClick={() => { setPlanos(feito.antes); setFeito(null) }} style={link}>Desfazer</button>
          </div>
        </div>
      )}

      <div style={cardAzul}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Quitar à vista</div>
        <div style={{ ...apoio, marginBottom: 16 }}>
          Para quem tem o valor de quitação de uma dívida que já está no planejamento.
        </div>
        {!divida ? (
          <div style={apoio}>
            Aqui aparecem as categorias cadastradas como Parcelada, com parcelas no planejamento. Se o
            financiamento está como Mensal, troque para Parcelada em Configurações › Categorias. Para
            simular uma dívida fora do plano, use "Pagar em parcelas".
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: isMobile ? undefined : '1 / -1' }}>
              <label style={labelSt} htmlFor="quitar-divida">Qual dívida?</label>
              <select id="quitar-divida" value={divida.cat.id} onChange={e => { setDividaId(e.target.value); setFeito(null) }} style={inputSt}>
                {dividas.map(d => (
                  <option key={d.cat.id} value={d.cat.id}>
                    {rotuloDa(d)} · {d.parcelas.length}× de {fmt(d.valorMensal)}{d.vaiAteOFim ? '' : ` · até ${curto(d.ultima)}`}
                  </option>
                ))}
              </select>
              <div style={{ ...apoio, marginTop: 6 }}>
                No plano: {divida.parcelas.length} {divida.parcelas.length === 1 ? 'parcela' : 'parcelas'} de {curto(divida.parcelas[0])} a {curto(divida.ultima)}, {fmt(divida.total)} no total.
                {jaPaga && <> A de {MESES[hoje.getMonth()]} já está paga.</>}
              </div>
            </div>
            <div style={{ gridColumn: isMobile ? undefined : '1 / -1' }}>
              <label style={labelSt} htmlFor="quitar-valor">Valor para quitar à vista</label>
              <input id="quitar-valor" inputMode="decimal" value={valorStr}
                onChange={e => { setValorStr(e.target.value); setFeito(null) }}
                placeholder="R$ 15.000,00" style={inputSt} />
              <div style={{ ...apoio, marginTop: 6 }}>
                O valor que o banco informou para quitar hoje. Ele baixa a cada parcela paga: para os
                outros meses, o Simulador estima pelo juro do contrato, e o banco confirma o valor exato.
              </div>
            </div>
          </div>
        )}
      </div>

      {r && divida && candidatos && (
        <Resposta
          divida={divida} r={r} candidatos={candidatos} isMobile={isMobile}
          onEscolher={setEscolhido} meta={meta} guarda={guarda}
          detalhes={detalhes} onDetalhes={() => setDetalhes(d => !d)}
          onAtualizar={() => setConfirmando(true)}
        />
      )}

      {confirmando && r && divida && (
        <ConfirmarQuitacao divida={divida} r={r} isMobile={isMobile}
          onConfirmar={atualizarPlano} onFechar={() => setConfirmando(false)} />
      )}
    </div>
  )
}

const botaoBranco: React.CSSProperties = {
  marginTop: 14, padding: '11px 16px', border: 'none', borderRadius: 10, background: COR.branco,
  color: COR.azulEscuro, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
}
const link: React.CSSProperties = {
  background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit',
  fontSize: 13, color: COR.azul, fontWeight: 700, textDecoration: 'underline',
}

type Meta = { total: number; antes: number; agora: number; mesDaQuitacaoAbaixo: boolean } | null

function Resposta({ divida, r, candidatos, isMobile, onEscolher, meta, guarda, detalhes, onDetalhes, onAtualizar }: {
  divida: DividaNoPlano
  r: ReturnType<typeof simularQuitacao>
  candidatos: ReturnType<typeof mesesParaQuitar>
  isMobile: boolean
  onEscolher: (m: Mes) => void
  meta: Meta
  guarda: ({ guarda: number; sem: number; meta: number } | null)[]
  detalhes: boolean; onDetalhes: () => void
  onAtualizar: () => void
}) {
  const { sugerido } = candidatos
  const agora = new Date()
  const hoje = { ano: agora.getFullYear(), mes: agora.getMonth() }
  const depois = r.removidas.filter(p => !igual(p, r.quando))
  const aperto = r.primeiroAperto

  let frase: React.ReactNode
  if (r.cabe && igual(r.quando, sugerido)) {
    frase = <>Dá para quitar em <span style={{ color: VERDE }}>{mesEAno(r.quando)}</span></>
  } else if (r.cabe) {
    frase = <>Quitando em <span style={{ color: VERDE }}>{mesEAno(r.quando)}</span>, o saldo não fica negativo</>
  } else {
    frase = <>Quitando em {mesEAno(r.quando)}, o saldo fica negativo {aperto && !igual(aperto, r.quando) ? `em ${mesEAno(aperto)}` : 'nesse mês'}</>
  }

  const tile: React.CSSProperties = {
    flex: 1, minWidth: isMobile ? 'calc(50% - 6px)' : 0, background: 'rgba(15,23,42,.25)',
    borderRadius: 10, padding: '10px 12px',
  }
  const tRot: React.CSSProperties = { fontSize: 12, color: 'rgba(255,255,255,.85)', marginBottom: 3 }
  const tVal: React.CSSProperties = { fontSize: isMobile ? 16 : 18, fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }

  return (
    <div style={cardAzul}>
      <div style={{ fontSize: isMobile ? 19 : 22, fontWeight: 800, color: '#fff', lineHeight: 1.35 }}>{frase}</div>
      <div style={{ ...apoio, marginTop: 6 }}>
        {r.cabe
          ? <>Pagando {fmt(r.valor)} nesse mês, nenhum mês do seu planejamento fica no vermelho.</>
          : <>{aperto && !igual(aperto, r.quando) ? `Em ${MESES[aperto.mes]}` : 'Nesse mês'} o saldo ficaria em <b style={{ color: VERMELHO }}>{fmt(aperto?.comCompra ?? 0)}</b>.{' '}
            {sugerido
              ? <>O primeiro mês que comporta é {mesEAno(sugerido)}.{' '}
                  <button onClick={() => onEscolher(sugerido)} style={{ ...link, color: '#fff', fontSize: 12.5 }}>Ver {MESES[sugerido.mes]}</button></>
              : <>Até {mesEAno(divida.ultima)}, a última parcela, nenhum mês do plano comporta esse valor à vista.</>}
          </>}
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: '18px 0 8px' }}>Quando quitar?</div>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
        {candidatos.meses.map(m => {
          const ativo = igual(m.quando, r.quando)
          return (
            <button key={`${m.quando.ano}-${m.quando.mes}`} onClick={() => onEscolher(m.quando)} aria-pressed={ativo} style={{
              flexShrink: 0, minWidth: 64, padding: '7px 10px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
              border: `1px solid ${ativo ? '#fff' : 'rgba(255,255,255,.25)'}`,
              background: ativo ? COR.branco : 'rgba(255,255,255,.08)', textAlign: 'center',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: ativo ? COR.azulEscuro : '#fff' }}>{curto(m.quando)}</div>
              <div style={{ fontSize: 11, fontWeight: 600, marginTop: 1,
                color: ativo ? (m.cabe ? COR.sucessoTexto : COR.erroTexto) : (m.cabe ? VERDE : VERMELHO) }}>
                {igual(m.quando, sugerido) ? 'sugerido' : m.cabe ? 'cabe' : 'aperta'}
              </div>
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
        <div style={tile}>
          <div style={tRot}>Para quitar em {curto(r.quando)}</div>
          <div style={tVal}>{fmt(r.valor)}</div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.85)', marginTop: 2 }}>
            {r.quando.ano === hoje.ano && r.quando.mes === hoje.mes ? 'o valor informado' : 'estimado; o banco confirma'}
          </div>
        </div>
        <div style={tile}>
          <div style={tRot}>Deixa de pagar por mês</div>
          <div style={tVal}>{fmt(divida.valorMensal)}</div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.85)', marginTop: 2 }}>
            {depois.length ? `a partir de ${curto(seguinte(r.quando))}` : 'era a última parcela'}
          </div>
        </div>
        <div style={tile}>
          <div style={tRot}>Você economiza</div>
          <div style={{ ...tVal, color: VERDE }}>{fmt(Math.max(0, r.economia))}</div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.85)', marginTop: 2 }}>
            {r.removidas.length} {r.removidas.length === 1 ? 'parcela soma' : 'parcelas somam'} {fmt(r.removidas.reduce((t, p) => t + p.valor, 0))}
          </div>
        </div>
      </div>

      {meta && (
        <div style={{ ...apoio, marginTop: 14, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,.08)' }}>
          <b style={{ color: '#fff' }}>Meta de economia:</b>{' '}
          {meta.agora > meta.antes
            ? <>sem a parcela, {meta.agora} de {meta.total} {meta.total === 1 ? 'mês' : 'meses'} com meta ficam dentro dela (sem quitar, {meta.antes}).</>
            : meta.agora === meta.total
              ? <>os {meta.total} {meta.total === 1 ? 'mês' : 'meses'} com meta depois da quitação seguem dentro dela, agora com {fmt(divida.valorMensal)} a mais por mês.</>
              : <>sem a parcela, cada mês guarda {fmt(divida.valorMensal)} a mais; {meta.agora} de {meta.total} {meta.total === 1 ? 'mês' : 'meses'} com meta ficam dentro dela.</>}
          {meta.mesDaQuitacaoAbaixo && <> Em {MESES[r.quando.mes]} o plano guarda menos, por causa do pagamento.</>}
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <GraficosDaSimulacao meses={r.fluxo} guarda={guarda} isMobile={isMobile} mensal={false} textos={{
          sem: 'sem quitar', com: 'quitando',
          saldo: `Com quanto cada mês termina sem quitar e quitando em ${MESES[r.quando.mes]}.`,
          guarda: 'O que o seu planejamento guarda no mês, quitando, contra a meta de cada mês.',
        }} />
      </div>

      <button onClick={onDetalhes} style={{
        marginTop: 16, background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 13, color: '#fff', fontWeight: 600,
      }}>{detalhes ? '▾ Esconder os números' : '▸ Ver os números em detalhe'}</button>
      {detalhes && <Detalhes r={r} />}

      <button onClick={onAtualizar} style={{ ...botaoBranco, width: '100%', marginTop: 18 }}>
        <i aria-hidden className="ti ti-calendar-check" style={{ fontSize: 16, verticalAlign: '-2px', marginRight: 6 }} />
        Vou quitar em {MESES[r.quando.mes]}: atualizar o plano
      </button>
    </div>
  )
}

function Detalhes({ r }: { r: ReturnType<typeof simularQuitacao> }) {
  const th: React.CSSProperties = { textAlign: 'right', padding: '6px 8px', fontSize: 11.5, fontWeight: 600,
    color: 'rgba(255,255,255,.85)', borderBottom: '1px solid rgba(255,255,255,.2)' }
  const td: React.CSSProperties = { textAlign: 'right', padding: '6px 8px', fontSize: 12.5, color: '#fff',
    fontVariantNumeric: 'tabular-nums', borderBottom: '1px solid rgba(255,255,255,.08)' }
  return (
    <div style={{ overflowX: 'auto', marginTop: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 360 }}>
        <thead><tr>
          <th style={{ ...th, textAlign: 'left' }}>Mês</th>
          <th style={th}>No mês</th>
          <th style={th}>Saldo sem quitar</th>
          <th style={th}>Saldo quitando</th>
        </tr></thead>
        <tbody>
          {r.fluxo.map(pt => (
            <tr key={`${pt.ano}-${pt.mes}`}>
              <td style={{ ...td, textAlign: 'left' }}>{curto(pt)}</td>
              <td style={{ ...td, color: pt.parcela > 0 ? VERMELHO : pt.parcela < 0 ? VERDE : 'rgba(255,255,255,.6)' }}>
                {pt.parcela > 0 ? `− ${fmt(pt.parcela)}` : pt.parcela < 0 ? `+ ${fmt(-pt.parcela)}` : '—'}
              </td>
              <td style={{ ...td, color: pt.semCompra < 0 ? VERMELHO : '#fff' }}>{fmt(pt.semCompra)}</td>
              <td style={{ ...td, fontWeight: 700, color: pt.comCompra < 0 ? VERMELHO : '#fff' }}>{fmt(pt.comCompra)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ConfirmarQuitacao({ divida, r, isMobile, onConfirmar, onFechar }: {
  divida: DividaNoPlano; r: ReturnType<typeof simularQuitacao>; isMobile: boolean
  onConfirmar: () => void; onFechar: () => void
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onFechar])
  const depois = r.removidas.filter(p => !igual(p, r.quando))
  const parcelaDoMes = r.removidas.find(p => igual(p, r.quando))
  const linha: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0',
    borderBottom: `1px solid ${COR.borda}`, fontSize: 13.5, color: COR.texto, lineHeight: 1.45 }
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onFechar() }} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 1100,
      display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 16,
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby="quitar-titulo" style={{
        background: COR.branco, borderRadius: isMobile ? '20px 20px 0 0' : 16, width: '100%', maxWidth: 460, overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(15,23,42,.25)', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        <ModalTopo icone="ti-credit-card-pay" rotulo="Simulador" titulo="Atualizar o planejamento" id="quitar-titulo"
          subtitulo={rotuloDa(divida)} onFechar={onFechar} raio={isMobile ? 20 : undefined} />
        <div style={{ overflowY: 'auto', padding: '14px 22px 20px' }}>
          <div style={{ fontSize: 13, color: '#475569', marginBottom: 4 }}>O que muda no seu plano:</div>
          <div style={linha}>
            <span style={{ fontWeight: 600 }}>{curto(r.quando)}</span>
            <span style={{ textAlign: 'right' }}>
              Quitação à vista <b>{fmt(r.valor)}</b>
              <div style={{ fontSize: 12, color: '#475569' }}>
                {parcelaDoMes ? `no lugar da parcela de ${fmt(parcelaDoMes.valor)}` : 'além da parcela já paga'}
              </div>
            </span>
          </div>
          {depois.length > 0 && (
            <div style={linha}>
              <span style={{ fontWeight: 600 }}>{curto(depois[0])}{depois.length > 1 ? ` a ${curto(depois[depois.length - 1])}` : ''}</span>
              <span style={{ textAlign: 'right' }}>
                A parcela de <b>{fmt(divida.valorMensal)}</b> sai
                <div style={{ fontSize: 12, color: '#475569' }}>{depois.length} {depois.length === 1 ? 'mês' : 'meses'}</div>
              </span>
            </div>
          )}
          <div style={{ fontSize: 12.5, color: '#475569', marginTop: 12, lineHeight: 1.5 }}>
            Nada é lançado agora. Quando pagar, marque como pago, como as outras contas.
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={onFechar} style={{
              flex: 1, padding: '11px 14px', borderRadius: 10, border: `1px solid ${COR.borda}`, background: COR.branco,
              color: COR.texto, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>Agora não</button>
            <button onClick={onConfirmar} style={{
              flex: 1, padding: '11px 14px', borderRadius: 10, border: 'none',
              background: `linear-gradient(135deg, ${COR.azulEscuro}, #1e40af)`,
              color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>Atualizar o plano</button>
          </div>
        </div>
      </div>
    </div>
  )
}
