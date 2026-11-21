import { useState, useMemo, useEffect, Fragment } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { DadosMes } from '../context/AppContext'
import AppHeader from '../components/AppHeader'
import PageHeader from '../components/PageHeader'
import { M, ROTULO_TOPO, FONTE_SITE, FONTE_TITULO } from '../components/mobile/estilo'
import SeletorMesAno from '../components/SeletorMesAno'
import { construirRealizadoMes } from '../utils/realizadoMes'
import { saldoBancosEDinheiro, detalharMes, memoriaDoRadar } from '../utils/saldoConta'
import { MemoriaSaldo, ChipCenario } from '../components/novoLancamentoExtrato/NleExtrato'
import EmptyState from '../components/EmptyState'
import { fmt, MESES_FULL, diasNoMes } from '../components/acompanhamento/AcShared'
import { NUMERO_NO_AZUL, totaisJulgados } from '../components/acompanhamento/radarCores'
import { nomesDeCartao, gruposDoRadar, totaisDoMes, buildAllCats } from '../components/acompanhamento/evolucaoCalcs'
import AcMobileView from '../components/acompanhamento/AcMobileView'
import EvolucaoGrupo, { CategoriasDoGrupo } from '../components/acompanhamento/EvolucaoGrupo'
import RadarDetalheContas from '../components/acompanhamento/RadarDetalheContas'
import TotalDasDespesas from '../components/acompanhamento/TotalDasDespesas'
import RevisaoPlanoFaixa from '../components/acompanhamento/RevisaoPlanoFaixa'
import RevisaoPlanoDialog from '../components/acompanhamento/RevisaoPlanoDialog'
import { lancadoAcimaDoPlano } from '../utils/lancadoAcimaDoPlano'
import { resumoDoMes } from '../utils/resumoRadar'
import { ritmoDoMes } from '../utils/ritmoDoMes'
import { AjustePlanoContexto } from '../components/acompanhamento/ajustePlanoContexto'
import { ForaDoMesContexto } from '../components/acompanhamento/foraDoMesContexto'
import { dadosBancariosDoMes, fixaNaoOcorre } from '../utils/fixasDoMes'
import AjustePlanoRadar, { type AjusteAberto } from '../components/acompanhamento/AjustePlanoRadar'
import { useLarguraMenorQue } from '../utils/larguraTela'
import { balancoDoPlano } from '../utils/balancoDoPlano'
import { previstoDoAno } from '../components/planejamento/previstoDoAno'

function useIsMobile() {
  return useLarguraMenorQue(640)
}

export default function RadarFinanceiro() {
  const hoje    = new Date()
  const mesHoje = hoje.getMonth()
  const anoHoje = hoje.getFullYear()

  const isMobile = useIsMobile()
  const [mes, setMes]               = useState(mesHoje)
  const [ano, setAno]               = useState(anoHoje)
  const [abertos, setAbertos] = useState<Set<string>>(new Set())
  // Computador: UM grupo aberto por vez, e o cartão fica no lugar (pedido do
  // Guilherme em 21/10/2026). As categorias entram numa faixa de largura
  // inteira depois da LINHA do cartão, então é preciso saber quantas colunas
  // a grade tem: a mesma conta do repeat(auto-fill, minmax(260px, 1fr)).
  const [grupoAberto, setGrupoAberto] = useState<string | null>(null)
  const [grade, setGrade] = useState<HTMLDivElement | null>(null)
  const [colunas, setColunas] = useState(1)
  useEffect(() => {
    if (!grade) return
    const medir = () => setColunas(Math.max(1, Math.floor((grade.clientWidth + 16) / (260 + 16))))
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(grade)
    return () => ro.disconnect()
  }, [grade])
  const [detalhes, setDetalhes] = useState(false)
  const [memoriaAberta, setMemoriaAberta] = useState(false)

  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { contas, categorias, planos, setPlanos, extratoData, faturaData, user, saldoInicialDinheiro, cenarioPrevisao, setCenarioPrevisao } = useApp()

  // Ajustar o plano de uma categoria sem sair do Radar (pedido do Guilherme,
  // 06/10/2026). Só GRAVA no plano, pelas funções do Planejamento; o Radar
  // relê o plano e a linha se redesenha. Ver AjustePlanoDialog.
  const [ajuste, setAjuste] = useState<AjusteAberto | null>(null)


  const totalDias = diasNoMes(mes, ano)
  const dadosAno  = planos[ano]

  // ── Realizados ────────────────────────────────────────────────────────
  const { saidasMap, entradasMap } = useMemo(
    () => construirRealizadoMes({ ano, mes, extratoData: extratoData as Record<string, DadosMes>,
      faturaData, contas, categorias, planoAno: dadosAno }),
    [ano, mes, extratoData, faturaData, contas, categorias, dadosAno],
  )

  // ── Grupos ────────────────────────────────────────────────────────────
  const cartaoNomes = useMemo(() => nomesDeCartao(contas), [contas])

  const gruposSaida   = useMemo(() => gruposDoRadar('saida',   categorias, cartaoNomes), [categorias, cartaoNomes])
  const gruposEntrada = useMemo(() => gruposDoRadar('entrada', categorias, cartaoNomes), [categorias, cartaoNomes])

  // Os totais saem de totaisDoMes, a mesma função que a tela Início usa.
  // As barrinhas dos cartões julgam só as linhas COM plano (totaisJulgados):
  // o gasto sem plano conta no número, não no julgamento (C2, 19/10/2026).
  const { totalPrevS, totalRealS, totalPrevE, totalRealE, linhasSaida, julgE, julgS } = useMemo(() => {
    const t = totaisDoMes({ mes, planoAno: dadosAno, categorias, cartaoNomes, entradasMap, saidasMap })
    return { totalPrevE: t.entrada.prev, totalRealE: t.entrada.real, totalPrevS: t.saida.prev, totalRealS: t.saida.real,
      linhasSaida: t.saida.linhas, julgE: totaisJulgados(t.entrada.linhas), julgS: totaisJulgados(t.saida.linhas) }
  }, [dadosAno, mes, entradasMap, saidasMap, categorias, cartaoNomes])

  // A resposta prática do mês, antes dos números: quanto ainda dá para gastar
  // na variável, por dia, e quais grupos passaram. Mesmo número do "Ritmo do
  // mês" da Início — ver resumoRadar.
  const resumo = useMemo(
    () => (dadosAno ? resumoDoMes(linhasSaida, categorias, ano, mes) : null),
    [dadosAno, linhasSaida, categorias, ano, mes],
  )

  // O número grande do topo: a MESMA sobra da frase (resumoDoMes chama
  // ritmoDoMes com as mesmas linhas). Só no mês corrente e dentro do plano —
  // quando passou, o resumo é null e o topo mostra o saldo de hoje.
  const ritmo = useMemo(
    () => (dadosAno && ano === anoHoje && mes === mesHoje && resumo ? ritmoDoMes(linhasSaida, categorias) : null),
    [dadosAno, ano, anoHoje, mes, mesHoje, resumo, linhasSaida, categorias],
  )

  // O Radar nao calcula saldo proprio: soma os saldos das contas de banco e
  // do dinheiro, os mesmos que Lancamentos mostra. Assim o saldo inicial de
  // um mes e, por construcao, o saldo final do anterior.
  //
  // Cartao fica de fora: nao tem saldo, tem fatura.
  const depsSaldo = useMemo(() => ({
    extratoData: extratoData as Record<string, DadosMes>,
    faturaData: faturaData as Record<string, { lancamentos?: Record<number, { tipo: string; valor: number }[]> }>,
    contas, categorias, planos, saldoInicialDinheiro, cenarioPrevisao,
  }), [extratoData, faturaData, contas, categorias, planos, saldoInicialDinheiro, cenarioPrevisao])

  // So realizado, em qualquer mes. O Radar e acompanhamento em tempo real: o
  // saldo atual e o que esta no banco hoje, e o mes seguinte abre com ele.
  // Projecao existe, mas e assunto do Planejamento — ver saldoContaNoFim.
  const saldoInicial = useMemo(() => {
    const mAnt = mes === 0 ? 11 : mes - 1
    const aAnt = mes === 0 ? ano - 1 : ano
    return saldoBancosEDinheiro(aAnt, mAnt, depsSaldo)
  }, [ano, mes, depsSaldo])

  const saldoAtual = useMemo(
    () => saldoBancosEDinheiro(ano, mes, depsSaldo),
    [ano, mes, depsSaldo],
  )

  // Com quanto o mes FECHA, e de onde isso vem: a memoria de calculo de
  // Lancamentos, consolidada em todas as contas. `fechamento` e o mesmo numero
  // que saldoTotalNoFim devolve, e as linhas fecham nele por construcao.
  //
  // Isto nao reabre a regra de que o Radar so mostra realizado: os cartoes do
  // topo seguem sendo o que aconteceu. O previsto mora na barra do pe, como em
  // Lancamentos, e so se abre quando pedido.
  // Já lançado acima do plano dos próximos meses — só olhando o mês corrente,
  // como o aviso da Início. Ver utils/lancadoAcimaDoPlano.
  const ehMesCorrente = ano === anoHoje && mes === mesHoje
  const mesFechado = ano < anoHoje || (ano === anoHoje && mes < mesHoje)
  // "Revisar agora": a tabela da revisão do plano (RevisaoPlanoDialog).
  const [revisando, setRevisando] = useState(false)
  const lancadoAcima = useMemo(
    () => (ehMesCorrente && dadosAno ? lancadoAcimaDoPlano(depsSaldo) : []),
    [ehMesCorrente, dadosAno, depsSaldo],
  )

  const memoria = useMemo(
    () => memoriaDoRadar(ano, mes, depsSaldo),
    [ano, mes, depsSaldo],
  )
  const saldoPrevisto = memoria.fechamento

  // O saldo do fim do mês PELO PLANO (21/11/2026, pedido do Guilherme: "falta
  // o saldo previsto com base no planejado e o saldo atual com base no
  // realizado"). É o MESMO número do cartão do mês no Planejamento ("termina
  // com"): a passagem dele, previstoDoAno — saldo com que o mês abriu +
  // receitas planejadas − despesas planejadas. Sem plano no ano, null: o Radar
  // não julga mês sem plano.
  const saldoPlanejado = useMemo(() => {
    if (!planos[ano]) return null
    const hoje = new Date()
    const p = previstoDoAno(ano, {
      anoCorrente: hoje.getFullYear(), mesAtual: hoje.getMonth(), categorias, contas, faturaData,
      planos: planos as Record<number, unknown>,
      saldoInicialFixo: contas.filter(c => c.tipo === 'corrente' && c.incluirNoSaldoInicial !== false)
        .reduce((t, c) => t + c.saldoInicial, 0),
      depsSaldo,
    })
    if (p.totalEntradas[mes] === 0 && p.totalSaidas[mes] === 0) return null
    return p.saldoFinal[mes]
  }, [ano, mes, planos, categorias, contas, faturaData, depsSaldo])

  // Embaixo do realizado: no mês fechado, a distância até o planejado; nos
  // outros, a frase do resumo (a "Ainda dá para gastar" saiu em 24/10/2026).
  const subRealizado = saldoPlanejado !== null && mesFechado ? diferencaDoPlano(saldoAtual, saldoPlanejado)
    : !ritmo && resumo ? `${resumo.titulo}${resumo.detalhe ? ` · ${resumo.detalhe}` : ''}` : 'o que já aconteceu'

  // A frase do "Plano do mês" da Início, sobre as mesmas linhas
  // (balancoDoPlano): quanto os grupos ainda estão abaixo do plano menos o
  // quanto passaram. Sem plano de despesa no mês, nada (o Radar não julga).
  const balanco = useMemo(() => (dadosAno ? balancoDoPlano(linhasSaida, categorias) : null), [dadosAno, linhasSaida, categorias])
  const fraseEconomia = !balanco ? null
    : balanco.diferenca > 0.005 ? <span>No total, você {mesFechado ? 'economizou' : 'está economizando'} <b>{fmt(balanco.diferenca)}</b> no plano</span>
    : balanco.diferenca < -0.005 ? <span>No total, você {mesFechado ? 'gastou' : 'está gastando'} <b>{fmt(-balanco.diferenca)}</b> a mais do que o plano</span>
    : <span>No total, está exatamente no plano</span>

  const perc = (real: number, prev: number) => (prev > 0 ? real / prev : null)
  const percE = perc(julgE.real, julgE.prev)
  const percS = perc(julgS.real, julgS.prev)
  const deQuanto = (prev: number) => (prev > 0 ? `de ${fmt(prev)}` : 'sem plano')
  // As barrinhas dos cartões seguem a MESMA regra e as MESMAS cores das barras
  // de grupo: o cartão tem o mesmo fundo azul, e três tons de vermelho na mesma
  // tela (cartão, grupo, categoria) foram o motivo desta troca. Categoria fica
  // com o tom escuro porque o fundo dela é branco — ver radarCores.
  // Desde 24/10/2026 (Guilherme: "número branco nos card azul, e onde for
  // branco usamos o verde e laranja") todo número no azul é BRANCO, saldos
  // e rodapé inclusive. Receitas e Despesas levam verde e laranja pelo TIPO
  // só na BARRA. Quem diz se passou do plano são os grupos.

  // O detalhe sai da mesma funcao dos dois cartoes de saldo, entao a linha
  // Total bate com eles por construcao.
  const linhasContas = useMemo(
    () => detalharMes(ano, mes, depsSaldo),
    [ano, mes, depsSaldo],
  )



  // Grupo é um por vez (21/10/2026, pedido do Guilherme): abrir um fecha o
  // anterior, como no computador. Categoria segue abrindo à vontade.
  function toggleAberto(uid: string) {
    const ehGrupo = uid.startsWith('g-')
    const abrindo = !abertos.has(uid)
    setAbertos(prev => {
      const n = new Set(prev)
      if (n.has(uid)) { n.delete(uid); return n }
      if (ehGrupo) for (const k of [...n]) if (k.startsWith('g-')) n.delete(k)
      n.add(uid)
      return n
    })
    // Fechar o grupo de cima puxa o clicado para cima: leva a tela até ele.
    if (ehGrupo && abrindo) requestAnimationFrame(() => {
      document.querySelector(`[data-grupo="${CSS.escape(uid)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
  }

  // ── Mobile: early return ───────────────────────────────────────────────
  // Fixas marcadas "Não vai ocorrer neste mês" em Lançamentos: a linha diz
  // "não gastou" com o plano à vista (05/11/2026, foraDoMesContexto).
  const foraDoMes = (() => {
    const dms = dadosBancariosDoMes(extratoData as Record<string, DadosMes>, `-${ano}-${String(mes + 1).padStart(2, '0')}`,
      k => contas.some(c => c.tipo === 'cartao' && k.startsWith(c.id)))
    return new Set(categorias.filter(c => c.fixa && fixaNaoOcorre(c.id, dms)).map(c => c.id))
  })()

  if (isMobile) {
    // O mesmo ajuste do plano e a mesma revisão do computador: a linha da
    // categoria pede o ajuste pelo contexto, como em EvolucaoLinha.
    return (
      <ForaDoMesContexto.Provider value={foraDoMes}>
      <AjustePlanoContexto.Provider value={dadosAno ? setAjuste : null}>
      <AcMobileView
        mes={mes}
        ano={ano}
        setMes={setMes}
        setAno={setAno}
        totalDias={totalDias}
        dadosAno={dadosAno}
        gruposEntrada={gruposEntrada}
        gruposSaida={gruposSaida}
        entradasMap={entradasMap}
        saidasMap={saidasMap}
        totalPrevE={totalPrevE}
        totalPrevS={totalPrevS}
        totalRealE={totalRealE}
        totalRealS={totalRealS}
        percJulgadoE={percE}
        percJulgadoS={percS}
        categorias={categorias}
        cartaoNomes={cartaoNomes}
        user={user}
        abertos={abertos}
        toggleAberto={toggleAberto}
        navigate={navigate}
        saldoAtual={saldoAtual}
        saldoPrevisto={saldoPrevisto}
        saldoPlanejado={saldoPlanejado}
        subRealizado={subRealizado}
        saldoInicial={saldoInicial}
        fraseEconomia={fraseEconomia}
        balanco={balanco}
        resumo={resumo}
        memoria={memoria}
        cenario={cenarioPrevisao}
        onCenario={setCenarioPrevisao}
        lancadoAcima={lancadoAcima}
        onRevisar={() => setRevisando(true)}
      />
      {revisando && (
        <RevisaoPlanoDialog acima={lancadoAcima} deps={depsSaldo} planos={planos} setPlanos={setPlanos}
          categorias={categorias} onFechar={() => setRevisando(false)} />
      )}
      {ajuste && (
        <AjustePlanoRadar ajuste={ajuste} setAjuste={setAjuste} planos={planos} setPlanos={setPlanos}
          ano={ano} mes={mes} categorias={categorias} deps={depsSaldo} />
      )}
      </AjustePlanoContexto.Provider>
      </ForaDoMesContexto.Provider>
    )
  }

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',overflow:'hidden',background:M.fundo,
      fontFamily:FONTE_SITE}}>
      <AppHeader currentPath={pathname} />

      {/* CONTEÚDO */}
      {/* A página inteira rola, o topo junto: com a resposta no azul ele
          ficou alto, e preso em cima deixava pouco espaço para os cartões. */}
      <div style={{flex:1,overflowY:'auto',padding:'16px 24px 40px',
        display:'flex',flexDirection:'column',gap:16}}>
      {/* O topo é o do cardápio (12/10/2026): o mesmo azul do título traz a
          RESPOSTA do mês em letra grande e, ao lado, os quatro números de
          antes em miniatura. Clicar em qualquer um abre o detalhe por conta. */}
      <div style={{ flexShrink: 0, margin: '-16px -24px 0' }}>
        <PageHeader
          site
          icon="ti-radar-2"
          rotulo="Acompanhamento do mês"
          ajuda="radar"
          title="Radar financeiro"
          mb={0}
          rightContent={
            <SeletorMesAno
              mes={mes} ano={ano}
              onSelect={(m, a) => { setMes(m); setAno(a) }}
            />
          }
        >
          {/* Topo enxuto (21/11/2026, Guilherme: "o que ele realmente precisa
              saber?"): três saldos — inicial, final planejado e realizado — e
              a frase do quanto está economizando no plano (a do "Plano do mês"
              da Início). Receitas, despesas, o "Mês termina com" com o
              cálculo e o saldo por conta ficam em "Ver detalhes". Cada número
              cabe −R$ 999.999,99 (a letra encolhe pela largura, cqi). */}
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
            {([
              { ic: 'ti-flag', rot: 'Saldo inicial', sub: `${MESES_FULL[mes]} começou com`, v: saldoInicial as number | null, pe: 'em bancos e dinheiro' },
              { ic: 'ti-calendar-stats', rot: 'Saldo final planejado', sub: `${MESES_FULL[mes]} termina com`, v: saldoPlanejado, pe: 'se o plano se cumprir' },
              { ic: 'ti-wallet', rot: 'Saldo realizado', sub: ehMesCorrente ? 'Hoje no banco e no dinheiro' : `No fim de ${MESES_FULL[mes].toLowerCase()}`, v: saldoAtual as number | null, pe: subRealizado },
            ]).map(k => (
              <button key={k.rot} type="button" onClick={() => setDetalhes(v => !v)} aria-expanded={detalhes}
                style={{ background: 'rgba(255,255,255,.12)', borderRadius: 14, border: '1px solid rgba(255,255,255,.16)',
                  padding: '14px 18px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', minWidth: 0,
                  color: '#fff', containerType: 'inline-size' }}>
                <div style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className={`ti ${k.ic}`} aria-hidden style={{ fontSize: 17 }} />{k.rot}
                </div>
                <div style={{ fontSize: 13, color: ROTULO_TOPO }}>{k.sub}</div>
                {k.v === null ? (
                  <div style={{ fontSize: 18, fontWeight: 600, margin: '8px 0 4px' }}>Sem plano neste mês</div>
                ) : (
                  <div style={{ fontFamily: FONTE_TITULO, fontSize: 'min(40px, calc(100cqi / 7.2))', fontWeight: 700, lineHeight: 1.15,
                    color: NUMERO_NO_AZUL, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmt(k.v)}</div>
                )}
                <div style={{ fontSize: 13, color: ROTULO_TOPO, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.pe}</div>
              </button>
            ))}
          </div>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 16, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
              {fraseEconomia && <><i className="ti ti-pig-money" aria-hidden style={{ fontSize: 20 }} />{fraseEconomia}</>}
            </div>
            <button type="button" onClick={() => setDetalhes(v => !v)} aria-expanded={detalhes}
              style={{ background: 'none', border: '1px solid rgba(255,255,255,.4)', borderRadius: 999, color: '#fff', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 14, fontWeight: 600, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
              {detalhes ? 'Ocultar detalhes' : 'Ver detalhes'}
              <i className={`ti ${detalhes ? 'ti-chevron-up' : 'ti-chevron-down'}`} aria-hidden />
            </button>
          </div>
          {detalhes && (
            <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                {[
                  { rot: '↑ Receitas', v: totalRealE, prev: totalPrevE, p: percE, cor: '#0891b2', verbo: 'recebeu' },
                  { rot: '↓ Despesas', v: totalRealS, prev: totalPrevS, p: percS, cor: '#2563eb', verbo: 'gastou' },
                ].map(k => (
                  <div key={k.rot} style={{ background: 'rgba(255,255,255,.12)', borderRadius: 14, border: '1px solid rgba(255,255,255,.16)',
                    padding: '12px 16px', minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, color: '#fff' }}>
                    {k.p !== null && <AnelTopo pct={k.p} cor={k.cor} />}
                    <div style={{ minWidth: 0, flex: 1, containerType: 'inline-size' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: ROTULO_TOPO }}>{k.rot}</div>
                      <div style={{ fontFamily: FONTE_TITULO, fontSize: 'min(26px, calc(100cqi / 7))', fontWeight: 700, color: NUMERO_NO_AZUL,
                        fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmt(k.v)}</div>
                      <div style={{ fontSize: 13, color: ROTULO_TOPO, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {k.verbo} · {deQuanto(k.prev)}</div>
                    </div>
                  </div>
                ))}
              </div>
              {/* "Mês termina com": o que já aconteceu + o que falta do plano,
                  com a memória de cálculo. A barra do pé da tela saiu. */}
              <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,.16)',
                background: saldoPrevisto >= 0 ? 'rgba(255,255,255,.12)' : 'linear-gradient(135deg,#7f1d1d,#991b1b)' }}>
                <button type="button" aria-expanded={memoriaAberta} onClick={() => setMemoriaAberta(v => !v)}
                  style={{ width: '100%', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    gap: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', color: '#fff', background: 'none', border: 'none' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>Mês termina com</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,.85)', display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                      <span>o que já aconteceu + o que ainda falta do plano</span>
                      <span style={{ textDecoration: 'underline', textUnderlineOffset: 3, fontWeight: 600 }}>{memoriaAberta ? 'ocultar cálculo' : 'ver cálculo'}</span>
                      <ChipCenario cenario={cenarioPrevisao} />
                    </div>
                  </div>
                  <span style={{ fontFamily: FONTE_TITULO, fontSize: 30, fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                    color: NUMERO_NO_AZUL }}>{fmt(saldoPrevisto)}</span>
                </button>
                {memoriaAberta && (
                  <MemoriaSaldo m={memoria} positivo={saldoPrevisto >= 0}
                    cenario={cenarioPrevisao} onCenario={setCenarioPrevisao} />
                )}
              </div>
            </div>
          )}
        </PageHeader>
      </div>

      {detalhes && (
        <div style={{ flexShrink: 0 }}>
          <RadarDetalheContas linhas={linhasContas} />
        </div>
      )}

        {!dadosAno ? (
          <EmptyState
            icon="ti-radar-2"
            title="Veja se está no caminho certo"
            description={`Aqui você compara o que planejou com o que gastou em ${ano}. Para começar, monte seu plano.`}
            actionLabel="Criar plano →"
            onAction={() => navigate(`/planejamento?ano=${ano}`)}
          />
        ) : (
          <ForaDoMesContexto.Provider value={foraDoMes}>
          <AjustePlanoContexto.Provider value={setAjuste}>
            <RevisaoPlanoFaixa acima={lancadoAcima} onRevisar={() => setRevisando(true)} />
            {/* O cardápio: um cartão por grupo, receitas e depois despesas, numa
                grade, na ordem de sempre: abrir não move cartão nenhum. */}
            {/* stretch: na mesma linha os cartões têm a mesma altura, mesmo o
                grupo sem lançamentos, que não tem Fixas/Variáveis (05/11/2026,
                pedido do Guilherme). */}
            <div ref={setGrade} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16,
              alignItems: 'stretch', flexShrink: 0 }}>
            {(() => {
              const cartoes = [
                ...((dadosAno.entradas ?? []).length > 0
                  ? gruposEntrada.map(grupo => ({ tipo: 'entrada' as const, grupo, planCats: dadosAno.entradas ?? [], realMap: entradasMap }))
                  : []),
                ...((dadosAno.saidas ?? []).length > 0
                  ? gruposSaida.map(grupo => ({ tipo: 'saida' as const, grupo, planCats: dadosAno.saidas ?? [], realMap: saidasMap }))
                  : []),
              ].filter(c => buildAllCats(c.tipo, c.grupo, c.planCats, c.realMap, categorias, cartaoNomes).length > 0)
              const idxAberto = cartoes.findIndex(c => `${c.tipo}-${c.grupo}` === grupoAberto)
              // Último cartão da linha do aberto: a faixa entra logo depois dele.
              const fimDaLinha = idxAberto < 0 ? -1
                : Math.min(cartoes.length, Math.floor(idxAberto / colunas) * colunas + colunas) - 1
              const aberto = idxAberto >= 0 ? cartoes[idxAberto] : null
              return cartoes.map((c, i) => {
                const id = `${c.tipo}-${c.grupo}`
                return (
                  <Fragment key={id}>
                    <EvolucaoGrupo
                      tipo={c.tipo}
                      grupo={c.grupo}
                      planCats={c.planCats}
                      realMap={c.realMap}
                      categorias={categorias}
                      cartaoNomes={cartaoNomes}
                      mes={mes}
                      aberto={id === grupoAberto}
                      onAlternar={() => setGrupoAberto(v => v === id ? null : id)}
                    />
                    {i === fimDaLinha && aberto && (
                      <CategoriasDoGrupo
                        key={`cats-${id}`}
                        tipo={aberto.tipo}
                        grupo={aberto.grupo}
                        planCats={aberto.planCats}
                        realMap={aberto.realMap}
                        categorias={categorias}
                        cartaoNomes={cartaoNomes}
                        mes={mes}
                      />
                    )}
                  </Fragment>
                )
              })
            })()}
            </div>
            {balanco && (dadosAno.saidas ?? []).length > 0 && (
              <div style={{ marginTop: 16, maxWidth: 640 }}>
                <TotalDasDespesas balanco={balanco} mesFechado={mesFechado} />
              </div>
            )}
          </AjustePlanoContexto.Provider>
      </ForaDoMesContexto.Provider>
        )}
      </div>

      {revisando && (
        <RevisaoPlanoDialog acima={lancadoAcima} deps={depsSaldo} planos={planos} setPlanos={setPlanos}
          categorias={categorias} onFechar={() => setRevisando(false)} />
      )}
      {ajuste && (
        <AjustePlanoRadar ajuste={ajuste} setAjuste={setAjuste} planos={planos} setPlanos={setPlanos}
          ano={ano} mes={mes} categorias={categorias} deps={depsSaldo} />
      )}

    </div>
  )
}

/** Mês fechado: a distância do fechamento real até o saldo planejado, em palavras. */
function diferencaDoPlano(real: number, plano: number) {
  const d = Math.round((real - plano) * 100) / 100
  if (d === 0) return 'igual ao planejado'
  return d > 0 ? `${fmt(d)} acima do planejado` : `${fmt(-d)} abaixo do planejado`
}

/** Anel pequeno dos cards do topo: trilho branco, azul neon até 100%; o texto é o % real. */
function AnelTopo({ pct, cor }: { pct: number; cor: string }) {
  const r = 18, c = 2 * Math.PI * r
  const cheio = Math.max(0, Math.min(1, pct))
  const t = `${Math.round(pct * 100)}%`
  return (
    <svg width="54" height="54" viewBox="0 0 46 46" aria-hidden style={{ flexShrink: 0, overflow: 'visible' }}>
      <circle cx="23" cy="23" r={r} stroke="#fff" strokeWidth="6" fill="none" />
      {cheio > 0 && (
        <circle cx="23" cy="23" r={r} stroke={cor} strokeWidth="6" fill="none" strokeLinecap="round"
          strokeDasharray={`${cheio * c} ${c}`} transform="rotate(-90 23 23)" />
      )}
      <text x="23" y="27" textAnchor="middle" fill="#fff" fontSize={t.length > 4 ? 10 : 11} fontWeight="800">{t}</text>
    </svg>
  )
}
