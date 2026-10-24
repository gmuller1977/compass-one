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
  dividasNoPlano, comParcelasRestantes, mesesParaQuitar, simularQuitacao, quitarNoPlano, type DividaNoPlano,
} from '../../utils/quitacaoDivida'
import { usePlanoDoMes } from './usePlanoDoMes'
import { GraficosDaSimulacao } from './SimCompra'
import ModalTopo from '../ModalTopo'
import { supabase } from '../../lib/supabase'

/**
 * "Quitar à vista": o financiamento já está no Planejamento, o banco deu o
 * valor para quitar, e a pergunta é QUANDO dá. Pedido do Guilherme em
 * 22/10/2026. Regras em utils/quitacaoDivida; aqui só formulário e leitura.
 *
 * O Simulador sugere o primeiro mês que cabe e mostra os meses seguintes sem
 * a parcela. A pessoa escolhe outro mês se quiser, e só "Atualizar o plano"
 * grava: a quitação no mês escolhido e as parcelas seguintes fora.
 *
 * "Salvar simulação" (mesmo dia, pedido dele) guarda uma FOTO em
 * `simulacoes`: `tipo: 'divida'` com `detalhes.modo = 'quitacao'`, sem
 * migração (a 019 já tem `detalhes`). Não se edita ("somente salva, sem
 * edição"): cada consulta ao banco vira uma linha. Marcando duas da MESMA
 * dívida, aparece o comparativo lado a lado. Só o "hoje cabe?" é julgado de
 * novo contra o plano atual.
 */

/** O que foi simulado, como estava ao salvar. */
interface DetalhesQuitacao {
  modo: 'quitacao'
  catId: string
  /** O valor que o banco informou, como digitado. */
  valor: string
  faltam: string | null
  quando: Mes
  valorMensal: number
}
interface QuitacaoSalva {
  id: string
  nome: string
  /** O valor para quitar no mês escolhido. */
  valor_total: number
  /** Parcelas que deixam de sair. */
  resultado_meses: number
  /** A economia. */
  juros_pagos: number | null
  created_at: string
  detalhes: DetalhesQuitacao | null
}

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
const VERMELHO = '#fdba74'
/** "22/10/2026 às 14:05": duas consultas no mesmo dia se distinguem pela hora. */
const quandoSalvou = (iso: string) => {
  const d = new Date(iso)
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

export default function SimQuitacao({ isMobile }: { isMobile: boolean }) {
  const { user, contas, categorias, planos, setPlanos, extratoData, faturaData, saldoInicialDinheiro,
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

  // As fixas do mês corrente, para saber se a parcela de hoje já foi paga.
  const dmsHoje = useMemo(() => dadosBancariosDoMes(
    extratoData as Record<string, DadosMes>,
    `-${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`,
    k => contas.some(c => c.tipo === 'cartao' && k.startsWith(c.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [extratoData, contas])

  const dividas = useMemo(
    () => dividasNoPlano(planos as Record<number, PlanoAnoData | undefined>, categorias,
      { ano: hoje.getFullYear(), mes: hoje.getMonth() }, serie?.fimDoPlano ?? null,
      cat => resolverFixaDoMes(cat.id, dmsHoje).consolidada),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [planos, categorias, serie, dmsHoje],
  )

  const [dividaId, setDividaId] = useState('')
  const [valorStr, setValorStr] = useState('')
  const [escolhido, setEscolhido] = useState<Mes | null>(null)
  const [detalhes, setDetalhes] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  /** Depois de gravar: o que mudou e o plano de antes, para o Desfazer. */
  const [feito, setFeito] = useState<{ texto: string; antes: typeof planos } | null>(null)

  const [faltamStr, setFaltamStr] = useState<string | null>(null)
  const base = dividas.find(d => d.cat.id === dividaId) ?? dividas[0]
  // Quantas faltam pelo contrato: o plano pode ter o valor repetido além do fim.
  const faltam = Math.floor(Number(faltamStr ?? ''))
  const divida = useMemo(
    () => (base && faltamStr && faltam >= 1 ? comParcelasRestantes(base, faltam, serie?.fimDoPlano ?? null) : base),
    [base, faltamStr, faltam, serie],
  )
  const valor = parseValor(valorStr) ?? 0

  // A parcela deste mês já marcada paga não volta: a quitação tira as seguintes.
  const jaPaga = useMemo(() => {
    if (!divida) return false
    return resolverFixaDoMes(divida.cat.id, dmsHoje).consolidada
  }, [divida, dmsHoje])

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
    setFaltamStr(null)
    setEscolhido(null)
  }

  // ── Simulações salvas ────────────────────────────────────────────────
  const [salvas, setSalvas] = useState<QuitacaoSalva[]>([])
  const [avisoSalvar, setAvisoSalvar] = useState<{ ok: boolean; texto: string } | null>(null)
  useEffect(() => {
    if (!user) return
    supabase.from('simulacoes').select('*').eq('tipo', 'divida').order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('simulacoes (quitações):', error.message)
        if (data) setSalvas((data as QuitacaoSalva[]).filter(x => x.detalhes?.modo === 'quitacao'))
      })
  }, [user])

  /** Mudou o formulário: a escolha do mês e o aviso de salvo não valem mais. */
  function mexeu() { setEscolhido(null); setFeito(null); setAvisoSalvar(null) }

  async function salvar() {
    if (!user || !divida || !r) return
    const row = {
      nome: rotuloDa(divida), valor_total: r.valor, parcela: divida.valorMensal, juros: 0,
      resultado_meses: r.removidas.length, data_conclusao: curto(r.quando),
      total_pago: valor, juros_pagos: Math.max(0, r.economia),
      detalhes: { modo: 'quitacao', catId: divida.cat.id, valor: valorStr, faltam: faltamStr,
        quando: r.quando, valorMensal: divida.valorMensal } as DetalhesQuitacao,
    }
    const { data, error } = await supabase.from('simulacoes')
      .insert([{ ...row, user_id: user.id, tipo: 'divida' }]).select().single()
    if (error || !data) {
      console.error('simulacoes (salvar quitação):', error?.message)
      setAvisoSalvar({ ok: false, texto: 'Não foi possível salvar a simulação. Tente de novo.' })
      return
    }
    setSalvas(prev => [data as QuitacaoSalva, ...prev])
    setAvisoSalvar({ ok: true, texto: 'Simulação salva. Ela está na lista embaixo.' })
  }

  async function excluir(sv: QuitacaoSalva) {
    if (!window.confirm(`Excluir a simulação "${sv.nome}" de ${new Date(sv.created_at).toLocaleDateString('pt-BR')}?`)) return
    const { error } = await supabase.from('simulacoes').delete().eq('id', sv.id)
    if (error) { console.error('simulacoes (excluir quitação):', error.message); return }
    setSalvas(prev => prev.filter(x => x.id !== sv.id))
  }

  // Só o "cabe" é julgado de novo, no mês que foi salvo: o de semanas atrás
  // mentiria depois de qualquer lançamento. Os valores ficam os da foto.
  const avaliadas = useMemo(() => salvas.map(sv => {
    const d = sv.detalhes
    const b = d && dividas.find(x => x.cat.id === d.catId)
    const v = d ? parseValor(d.valor) ?? 0 : 0
    if (!d || !b || v <= 0) return { sv, r: null }
    const n = Math.floor(Number(d.faltam ?? ''))
    const dv = d.faltam && n >= 1 ? comParcelasRestantes(b, n, serie?.fimDoPlano ?? null) : b
    const paga = resolverFixaDoMes(dv.cat.id, dmsHoje).consolidada
    const c = serie ? mesesParaQuitar(serie, dv, v, paga) : null
    // O mês salvo já passou ou saiu do plano: não há o que julgar.
    const q = c?.meses.some(m => igual(m.quando, d.quando)) ? d.quando : null
    return { sv, r: serie && q ? simularQuitacao(serie, dv, v, q, paga) : null }
  }), [salvas, dividas, serie, dmsHoje])

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
            Aqui aparecem as contas fixas cadastradas como Parcelada e pagas no banco por débito
            automático ou boleto, com parcelas no planejamento. Se o financiamento não aparece,
            confira esses três pontos em Configurações › Categorias. Para
            simular uma dívida fora do plano, use "Pagar em parcelas".
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: isMobile ? undefined : '1 / -1' }}>
              <div style={labelSt} id="quitar-divida">Qual dívida?</div>
              <div role="radiogroup" aria-labelledby="quitar-divida" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
                {dividas.map(d => {
                  const on = d.cat.id === divida.cat.id
                  return (
                    <button key={d.cat.id} type="button" role="radio" aria-checked={on}
                      onClick={() => { if (on) return; setDividaId(d.cat.id); setFaltamStr(null); mexeu() }}
                      style={{ font: 'inherit', display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 56, padding: '10px 14px',
                        textAlign: 'left', cursor: 'pointer', borderRadius: 14, background: on ? '#eff6ff' : '#fff',
                        border: `2px solid ${on ? '#93c5fd' : 'transparent'}`, boxShadow: on ? '0 6px 18px rgba(15,23,42,.25)' : 'none' }}>
                      <span aria-hidden style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', border: `2px solid ${on ? '#1a56db' : '#94a3b8'}`, background: on ? '#1a56db' : 'transparent', color: '#fff' }}>
                        {on && <i className="ti ti-check" style={{ fontSize: 13 }} />}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontWeight: 700, fontSize: 15, color: on ? '#1e3a8a' : COR.texto }}>{rotuloDa(d)}</span>
                        <span style={{ display: 'block', fontSize: 13, color: '#475569' }}>{fmt(d.valorMensal)} por mês</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label style={labelSt} htmlFor="quitar-faltam">Quantas parcelas faltam?</label>
              <input id="quitar-faltam" inputMode="numeric" value={faltamStr ?? String(divida.parcelas.length)}
                onChange={e => { setFaltamStr(e.target.value.replace(/\D/g, '')); mexeu() }}
                style={inputSt} />
              <div style={{ ...apoio, marginTop: 6 }}>
                Em aberto: de {curto(divida.parcelas[0])} a {curto(divida.ultima)}, {fmt(divida.total)} no total.
                {jaPaga && <> A de {MESES[hoje.getMonth()]} já está paga e não entra.</>}
                {divida.noPlano.length > divida.parcelas.length && <> O plano tem a parcela até {curto(divida.noPlano[divida.noPlano.length - 1])}; ao quitar, os meses depois da última saem do plano também.</>}
              </div>
            </div>
            <div>
              <label style={labelSt} htmlFor="quitar-valor">Valor para quitar à vista</label>
              <input id="quitar-valor" inputMode="decimal" value={valorStr}
                onChange={e => { setValorStr(e.target.value); mexeu() }}
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
          onEscolher={m => { setEscolhido(m); setAvisoSalvar(null) }} meta={meta} guarda={guarda}
          detalhes={detalhes} onDetalhes={() => setDetalhes(d => !d)}
          onAtualizar={() => setConfirmando(true)}
          onSalvar={salvar} aviso={avisoSalvar}
        />
      )}

      {avaliadas.length > 0 && (
        <QuitacoesSalvas itens={avaliadas} isMobile={isMobile} onExcluir={excluir} />
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

function Resposta({ divida, r, candidatos, isMobile, onEscolher, meta, guarda, detalhes, onDetalhes, onAtualizar, onSalvar, aviso }: {
  divida: DividaNoPlano
  r: ReturnType<typeof simularQuitacao>
  candidatos: ReturnType<typeof mesesParaQuitar>
  isMobile: boolean
  onEscolher: (m: Mes) => void
  meta: Meta
  guarda: ({ guarda: number; sem: number; meta: number } | null)[]
  detalhes: boolean; onDetalhes: () => void
  onAtualizar: () => void
  onSalvar: () => void
  aviso: { ok: boolean; texto: string } | null
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

      <div style={{ display: 'flex', gap: 10, marginTop: 18, flexDirection: isMobile ? 'column' : 'row' }}>
        <button onClick={onSalvar} style={{ ...botaoContorno, flex: isMobile ? undefined : '0 0 auto' }}>
          <i aria-hidden className="ti ti-bookmark" style={{ fontSize: 16, verticalAlign: '-2px', marginRight: 6 }} />
          Salvar simulação
        </button>
        <button onClick={onAtualizar} style={{ ...botaoBranco, marginTop: 0, flex: 1 }}>
          <i aria-hidden className="ti ti-calendar-check" style={{ fontSize: 16, verticalAlign: '-2px', marginRight: 6 }} />
          Vou quitar em {MESES[r.quando.mes]}: atualizar o plano
        </button>
      </div>
      {aviso && (
        <div role="status" style={{ ...apoio, marginTop: 8, color: aviso.ok ? VERDE : VERMELHO, fontWeight: 600 }}>
          {aviso.ok ? '✓ ' : ''}{aviso.texto}
        </div>
      )}
    </div>
  )
}

const botaoContorno: React.CSSProperties = {
  padding: '11px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,.6)', background: 'transparent',
  color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
}

/**
 * As quitações salvas, a mais recente primeiro. Cada uma é a foto do dia em
 * que foi salva; marcar duas da MESMA dívida abre o comparativo. Página
 * clara, cartão branco: verde `#15803d` (5,02) e vermelho `#b91c1c` (6,47).
 */
function QuitacoesSalvas({ itens, isMobile, onExcluir }: {
  itens: { sv: QuitacaoSalva; r: ReturnType<typeof simularQuitacao> | null }[]
  isMobile: boolean
  onExcluir: (s: QuitacaoSalva) => void
}) {
  const [marcadas, setMarcadas] = useState<string[]>([])
  const existentes = marcadas.filter(id => itens.some(x => x.sv.id === id))
  const catMarcada = itens.find(x => x.sv.id === existentes[0])?.sv.detalhes?.catId
  const alternar = (id: string) => setMarcadas(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev.filter(x => existentes.includes(x)), id].slice(-2))
  const par = existentes.length === 2
    ? existentes.map(id => itens.find(x => x.sv.id === id)!)
        .sort((a, b) => a.sv.created_at.localeCompare(b.sv.created_at))
    : null
  const botao: React.CSSProperties = {
    padding: '6px 9px', borderRadius: 8, border: `1px solid ${COR.borda}`, background: COR.branco,
    color: COR.texto, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  }
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 17, fontWeight: 800, color: COR.texto, marginBottom: 4 }}>
        <i aria-hidden className="ti ti-bookmark" style={{ fontSize: 18, verticalAlign: '-2px', marginRight: 6, color: COR.azul }} />
        Simulações salvas
      </div>
      <div style={{ fontSize: 13, color: COR.textoSuave, marginBottom: 12, lineHeight: 1.5 }}>
        Cada uma guarda o que o banco informou naquele dia. Marque duas da mesma dívida para comparar.
      </div>
      <div style={{ background: COR.branco, border: `1px solid ${COR.borda}`, borderRadius: 14, padding: isMobile ? '4px 14px' : '4px 18px' }}>
        {itens.map(({ sv, r }, i) => {
          const d = sv.detalhes
          const em = quandoSalvou(sv.created_at)
          const marcada = existentes.includes(sv.id)
          const bloqueada = !marcada && !!catMarcada && d?.catId !== catMarcada
          return (
            <div key={sv.id} style={{
              display: 'flex', gap: 12, alignItems: 'center',
              padding: '12px 0', borderTop: i ? `1px solid ${COR.bordaSuave}` : 'none', fontSize: 13.5, color: COR.texto,
              opacity: bloqueada ? 0.55 : 1,
            }}>
              <input type="checkbox" checked={marcada} disabled={bloqueada} onChange={() => alternar(sv.id)}
                aria-label={`Comparar ${sv.nome} de ${em}`} title={bloqueada ? 'Só compara simulações da mesma dívida' : undefined}
                style={{ width: 18, height: 18, flexShrink: 0, cursor: bloqueada ? 'not-allowed' : 'pointer' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{sv.nome} <span style={{ fontWeight: 500, color: COR.textoSuave }}>· {em}</span></div>
                <div style={{ color: COR.textoSuave, marginTop: 3, fontSize: 13 }}>
                  {d && <>Quitar em {mesEAno(d.quando)} por {fmt(sv.valor_total)} · economiza {fmt(sv.juros_pagos ?? 0)}</>}
                </div>
                {isMobile && <div style={{ marginTop: 4 }}><Hoje r={r} /></div>}
              </div>
              {!isMobile && <Hoje r={r} />}
              <button onClick={() => onExcluir(sv)} aria-label={`Excluir ${sv.nome} de ${em}`} style={botao}>
                <i aria-hidden className="ti ti-trash" style={{ fontSize: 14, verticalAlign: '-2px' }} />
              </button>
            </div>
          )
        })}
      </div>
      {par && <Comparativo par={par} isMobile={isMobile} />}
    </div>
  )
}

function Hoje({ r }: { r: ReturnType<typeof simularQuitacao> | null }) {
  if (!r) return <span style={{ color: COR.textoSuave, fontSize: 13 }}>Mês fora do plano</span>
  return <span style={{ color: r.cabe ? '#15803d' : '#b91c1c', fontWeight: 700, fontSize: 13 }}>{r.cabe ? '✓ Cabe hoje' : '✕ Aperta hoje'}</span>
}

/** As duas fotos lado a lado, a mais antiga primeiro, e a diferença. */
function Comparativo({ par, isMobile }: {
  par: { sv: QuitacaoSalva; r: ReturnType<typeof simularQuitacao> | null }[]
  isMobile: boolean
}) {
  const [a, b] = par
  const data = (x: QuitacaoSalva) => quandoSalvou(x.created_at)
  const informado = (x: QuitacaoSalva) => parseValor(x.detalhes?.valor ?? '') ?? 0
  const dif = (va: number, vb: number, menorMelhor: boolean) => {
    const d = vb - va
    if (Math.abs(d) < 0.005) return <span style={{ color: COR.textoSuave }}>igual</span>
    const melhor = menorMelhor ? d < 0 : d > 0
    return <span style={{ color: melhor ? '#15803d' : '#b91c1c', fontWeight: 700 }}>{d > 0 ? '+ ' : '− '}{fmt(Math.abs(d))}</span>
  }
  const linhas: { rot: string; va: React.ReactNode; vb: React.ReactNode; d: React.ReactNode }[] = [
    { rot: 'Valor informado pelo banco', va: fmt(informado(a.sv)), vb: fmt(informado(b.sv)), d: dif(informado(a.sv), informado(b.sv), true) },
    { rot: 'Quitar em', va: a.sv.detalhes ? curto(a.sv.detalhes.quando) : '—', vb: b.sv.detalhes ? curto(b.sv.detalhes.quando) : '—', d: '' },
    { rot: 'Valor para quitar nesse mês', va: fmt(a.sv.valor_total), vb: fmt(b.sv.valor_total), d: dif(a.sv.valor_total, b.sv.valor_total, true) },
    { rot: 'Parcelas que deixam de sair', va: a.sv.resultado_meses, vb: b.sv.resultado_meses, d: '' },
    { rot: 'Você economiza', va: fmt(a.sv.juros_pagos ?? 0), vb: fmt(b.sv.juros_pagos ?? 0), d: dif(a.sv.juros_pagos ?? 0, b.sv.juros_pagos ?? 0, false) },
    { rot: 'Com o plano de hoje', va: <Hoje r={a.r} />, vb: <Hoje r={b.r} />, d: '' },
  ]
  const cel: React.CSSProperties = { padding: '9px 8px', borderBottom: `1px solid ${COR.bordaSuave}`, fontSize: 13.5,
    color: COR.texto, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }
  const cab: React.CSSProperties = { ...cel, fontSize: 12, fontWeight: 700, color: COR.textoSuave }
  return (
    <div style={{ marginTop: 12, background: COR.branco, border: `1px solid ${COR.borda}`, borderRadius: 14,
      padding: isMobile ? '12px 12px' : '14px 18px', overflowX: 'auto' }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: COR.texto, marginBottom: 6 }}>Comparativo · {a.sv.nome}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
        <thead><tr>
          <th style={{ ...cab, textAlign: 'left' }} />
          <th style={cab}>{data(a.sv)}</th>
          <th style={cab}>{data(b.sv)}</th>
          <th style={cab}>Diferença</th>
        </tr></thead>
        <tbody>
          {linhas.map(l => (
            <tr key={l.rot}>
              <td style={{ ...cel, textAlign: 'left', color: '#475569' }}>{l.rot}</td>
              <td style={cel}>{l.va}</td>
              <td style={{ ...cel, fontWeight: 700 }}>{l.vb}</td>
              <td style={cel}>{l.d}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
