import { useState, useMemo, useEffect, Fragment } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { DadosMes } from '../context/AppContext'
import AppHeader from '../components/AppHeader'
import PageHeader from '../components/PageHeader'
import { M, ROTULO_TOPO } from '../components/mobile/estilo'
import SeletorMesAno from '../components/SeletorMesAno'
import { construirRealizadoMes } from '../utils/realizadoMes'
import { saldoBancosEDinheiro, detalharMes, memoriaDoRadar } from '../utils/saldoConta'
import { MemoriaSaldo, ChipCenario } from '../components/novoLancamentoExtrato/NleExtrato'
import EmptyState from '../components/EmptyState'
import { fmt, MESES_FULL, diasNoMes } from '../components/acompanhamento/AcShared'
import { RADAR_AMARELO, NUMERO_NO_AZUL, totaisJulgados } from '../components/acompanhamento/radarCores'
import { nomesDeCartao, gruposDoRadar, totaisDoMes, buildAllCats } from '../components/acompanhamento/evolucaoCalcs'
import AcMobileView from '../components/acompanhamento/AcMobileView'
import EvolucaoGrupo, { CategoriasDoGrupo } from '../components/acompanhamento/EvolucaoGrupo'
import RadarDetalheContas from '../components/acompanhamento/RadarDetalheContas'
import RevisaoPlanoFaixa from '../components/acompanhamento/RevisaoPlanoFaixa'
import RevisaoPlanoDialog from '../components/acompanhamento/RevisaoPlanoDialog'
import { lancadoAcimaDoPlano } from '../utils/lancadoAcimaDoPlano'
import { resumoDoMes } from '../utils/resumoRadar'
import { ritmoDoMes } from '../utils/ritmoDoMes'
import { AjustePlanoContexto } from '../components/acompanhamento/ajustePlanoContexto'
import AjustePlanoRadar, { type AjusteAberto } from '../components/acompanhamento/AjustePlanoRadar'

function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
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
  const [detalheContas, setDetalheContas] = useState(false)
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
  const corSaldo = (_v: number) => NUMERO_NO_AZUL
  const COR_RECEITAS = '#86efac'
  const COR_DESPESAS = RADAR_AMARELO

  // O detalhe sai da mesma funcao dos dois cartoes de saldo, entao a linha
  // Total bate com eles por construcao.
  const linhasContas = useMemo(
    () => detalharMes(ano, mes, depsSaldo),
    [ano, mes, depsSaldo],
  )


  const alternarDetalhe = () => setDetalheContas(v => !v)

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
  if (isMobile) {
    // O mesmo ajuste do plano e a mesma revisão do computador: a linha da
    // categoria pede o ajuste pelo contexto, como em EvolucaoLinha.
    return (
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
    )
  }

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',overflow:'hidden',background:M.fundo,
      fontFamily:"-apple-system,'Inter',sans-serif"}}>
      <AppHeader currentPath={pathname} />

      {/* CONTEÚDO */}
      {/* A página inteira rola, o topo junto: com a resposta no azul ele
          ficou alto, e preso em cima deixava pouco espaço para os cartões. */}
      <div style={{flex:1,overflowY:'auto',padding:'16px 24px 40px',
        display:'flex',flexDirection:'column',gap:16}}>
      {/* O topo é o do cardápio (12/10/2026): o mesmo azul do título traz a
          RESPOSTA do mês em letra grande e, ao lado, os quatro números de
          antes em miniatura. Clicar em qualquer um abre o detalhe por conta. */}
      <div style={{ flexShrink: 0 }}>
        <PageHeader
          icon="ti-chart-bar"
          breadcrumb="TODO DIA"
          ajuda="radar"
          title="Radar financeiro"
          subtitle="Previsto × Realizado"
          mb={0}
          rightContent={
            <SeletorMesAno
              mes={mes} ano={ano}
              onSelect={(m, a) => { setMes(m); setAno(a) }}
            />
          }
        >
          <div style={{ marginTop: 18, display: 'flex', gap: 24, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px', minWidth: 0 }}>
              {ritmo && resumo ? (<>
                <div style={{ fontSize: 14, fontWeight: 500, color: ROTULO_TOPO }}>
                  Ainda dá para gastar nas despesas variáveis até o dia {ritmo.totalDias}
                </div>
                <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-.8px', lineHeight: 1.15,
                  color: NUMERO_NO_AZUL, fontVariantNumeric: 'tabular-nums' }}>{fmt(ritmo.sobra)}</div>
                {resumo.detalhe && <div style={{ fontSize: 14, color: ROTULO_TOPO, marginTop: 2 }}>{resumo.detalhe}</div>}
              </>) : (<>
                <div style={{ fontSize: 14, fontWeight: 500, color: ROTULO_TOPO }}>
                  {ehMesCorrente ? 'Hoje no banco e no dinheiro' : `Saldo no fim de ${MESES_FULL[mes].toLowerCase()}`}
                </div>
                <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-.8px', lineHeight: 1.15,
                  color: corSaldo(saldoAtual), fontVariantNumeric: 'tabular-nums' }}>{fmt(saldoAtual)}</div>
                {resumo && <div style={{ fontSize: 14, color: ROTULO_TOPO, marginTop: 2 }}>{resumo.titulo}{resumo.detalhe ? ` · ${resumo.detalhe}` : ''}</div>}
              </>)}
            </div>
            {/* As caixas ficam AO LADO da frase (pedido do Guilherme, 13/10/2026:
                embaixo perde espaço). Só descem abaixo de ~1180px de janela. */}
            <div style={{ flex: '1 1 560px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.3fr) minmax(0,1.3fr) minmax(0,1fr)', gap: 8 }}>
              {[
                { rot: 'Saldo inicial', v: fmt(saldoInicial), cor: corSaldo(saldoInicial), sub: `${MESES_FULL[mes]} ${ano}`, p: null as number | null },
                { rot: '↑ Receitas', v: fmt(totalRealE), cor: COR_RECEITAS, sub: deQuanto(totalPrevE), p: percE },
                { rot: '↓ Despesas', v: fmt(totalRealS), cor: COR_DESPESAS, sub: deQuanto(totalPrevS), p: percS },
                { rot: 'Saldo atual', v: fmt(saldoAtual), cor: corSaldo(saldoAtual), sub: 'bancos e dinheiro', p: null },
              ].map(k => (
                <button key={k.rot} type="button" onClick={alternarDetalhe} aria-expanded={detalheContas}
                  style={{ background: 'rgba(255,255,255,.12)', borderRadius: 14,
                    // Opção A (24/10/2026, Guilherme): anel em Receitas e Despesas e o
                    // Saldo atual no quadro neon, o padrão da Início.
                    border: k.rot === 'Saldo atual' ? '1.5px solid #22d3ee' : '1px solid rgba(255,255,255,.16)',
                    boxShadow: k.rot === 'Saldo atual' ? '0 0 16px rgba(34,211,238,.45)' : 'none',
                    padding: '10px 12px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', minWidth: 0,
                    display: 'flex', alignItems: 'center', gap: 10, color: '#fff' }}>
                  {k.p !== null && <AnelTopo pct={k.p} cor={k.rot.includes('Receitas') ? '#0891b2' : '#2563eb'} />}
                  <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: ROTULO_TOPO }}>{k.rot}</div>
                  {/* Acima de R$ 99.999,99 a letra cai para 15px e o valor segue inteiro na caixa. */}
                  <div style={{ fontSize: k.p !== null || k.v.length > 12 ? 15 : 17, fontWeight: 800, color: NUMERO_NO_AZUL, fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap' }}>{k.v}</div>
                  <div style={{ fontSize: 12, color: ROTULO_TOPO, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </PageHeader>
      </div>

      {detalheContas && (
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
          <AjustePlanoContexto.Provider value={setAjuste}>
            <RevisaoPlanoFaixa acima={lancadoAcima} onRevisar={() => setRevisando(true)} />
            {/* O cardápio: um cartão por grupo, receitas e depois despesas, numa
                grade, na ordem de sempre: abrir não move cartão nenhum. */}
            <div ref={setGrade} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16,
              alignItems: 'start', flexShrink: 0 }}>
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
          </AjustePlanoContexto.Provider>
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

      {/* Saldo final previsto — a mesma barra de Lancamentos, no pe da tela.
          Saiu do cartao do saldo atual: la ele era um numero sem explicacao;
          aqui ele abre a memoria de calculo. */}
      {(() => {
        const positivo = saldoPrevisto >= 0
        return (
          <div style={{ padding: '10px 24px 14px', flexShrink: 0, background: M.fundo }}>
            <div style={{ borderRadius: 18, boxShadow: positivo ? 'var(--cx-brilho)' : '0 2px 14px rgba(15,40,120,.12)',
              background: positivo ? 'var(--cx-azul)' : 'linear-gradient(135deg,#7f1d1d,#991b1b)' }}>
              <div role="button" tabIndex={0} aria-expanded={memoriaAberta}
                onClick={() => setMemoriaAberta(v => !v)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMemoriaAberta(v => !v) } }}
                style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', cursor: 'pointer' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                    Saldo final previsto
                    <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                      background: 'rgba(255,255,255,.15)', color: 'rgba(255,255,255,.9)' }}>
                      {memoriaAberta ? 'ocultar cálculo' : 'ver cálculo'}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.75)', marginTop: 3,
                    display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span>{MESES_FULL[mes]} {ano} · todas as contas</span>
                    <ChipCenario cenario={cenarioPrevisao} />
                  </div>
                </div>
                <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.6px', fontVariantNumeric: 'tabular-nums',
                  // Negativo, a barra do rodapé é VERMELHA e o número fica
                  // BRANCO (8,9): o laranja #c2410c some no #991b1b (24/10/2026).
                  color: NUMERO_NO_AZUL }}>
                  {fmt(saldoPrevisto)}
                </span>
              </div>
              {/* A barra é fixa no pé da tela (flexShrink 0). Aberta, a memória passava da
                  altura livre: espremia o conteúdo até zero e o fim dela sumia abaixo da
                  borda. Limitada a 35% da tela, rola por dentro. Corrigido em 05/10/2026. */}
              {memoriaAberta && (
                <div style={{ maxHeight: '35vh', overflowY: 'auto', borderRadius: '0 0 18px 18px' }}>
                  <MemoriaSaldo m={memoria} positivo={positivo}
                    cenario={cenarioPrevisao} onCenario={setCenarioPrevisao} />
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

/** Anel pequeno dos cards do topo: trilho branco, azul neon até 100%; o texto é o % real. */
function AnelTopo({ pct, cor }: { pct: number; cor: string }) {
  const r = 18, c = 2 * Math.PI * r
  const cheio = Math.max(0, Math.min(1, pct))
  const t = `${Math.round(pct * 100)}%`
  return (
    <svg width="42" height="42" viewBox="0 0 46 46" aria-hidden style={{ flexShrink: 0, overflow: 'visible' }}>
      <circle cx="23" cy="23" r={r} stroke="#fff" strokeWidth="6" fill="none" />
      {cheio > 0 && (
        <circle cx="23" cy="23" r={r} stroke={cor} strokeWidth="6" fill="none" strokeLinecap="round"
          strokeDasharray={`${cheio * c} ${c}`} transform="rotate(-90 23 23)" style={{ filter: 'drop-shadow(0 0 4px #22d3ee)' }} />
      )}
      <text x="23" y="27" textAnchor="middle" fill="#fff" fontSize={t.length > 4 ? 10 : 11} fontWeight="800">{t}</text>
    </svg>
  )
}
