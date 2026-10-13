import { useState, useMemo, useEffect } from 'react'
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
import { RADAR_COR_AZUL, faixaRadar } from '../components/acompanhamento/radarCores'
import { nomesDeCartao, gruposDoRadar, totaisDoMes } from '../components/acompanhamento/evolucaoCalcs'
import AcMobileView from '../components/acompanhamento/AcMobileView'
import EvolucaoGrupo from '../components/acompanhamento/EvolucaoGrupo'
import RadarDetalheContas from '../components/acompanhamento/RadarDetalheContas'
import RevisaoPlanoFaixa from '../components/acompanhamento/RevisaoPlanoFaixa'
import MotivoEstouroFaixa from '../components/motivo/MotivoEstouroFaixa'
import RevisaoPlanoDialog from '../components/acompanhamento/RevisaoPlanoDialog'
import { lancadoAcimaDoPlano } from '../utils/lancadoAcimaDoPlano'
import { resumoDoMes } from '../utils/resumoRadar'
import { ritmoDoMes } from '../utils/ritmoDoMes'
import { RADAR_TRILHO_AZUL } from '../components/acompanhamento/radarCores'
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
  const { totalPrevS, totalRealS, totalPrevE, totalRealE, linhasSaida } = useMemo(() => {
    const t = totaisDoMes({ mes, planoAno: dadosAno, categorias, cartaoNomes, entradasMap, saidasMap })
    return { totalPrevE: t.entrada.prev, totalRealE: t.entrada.real, totalPrevS: t.saida.prev, totalRealS: t.saida.real,
      linhasSaida: t.saida.linhas }
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
  const percE = perc(totalRealE, totalPrevE)
  const percS = perc(totalRealS, totalPrevS)
  const deQuanto = (prev: number) => (prev > 0 ? `de ${fmt(prev)}` : 'sem plano')
  // As barrinhas dos cartões seguem a MESMA regra e as MESMAS cores das barras
  // de grupo: o cartão tem o mesmo fundo azul, e três tons de vermelho na mesma
  // tela (cartão, grupo, categoria) foram o motivo desta troca. Categoria fica
  // com o tom escuro porque o fundo dela é branco — ver radarCores.
  // Saldo: verde positivo, vermelho negativo — os mesmos tons das receitas e
  // despesas (RADAR_COR_AZUL). Vale para os dois cartões de saldo e para o
  // número do rodapé; no rodapé negativo, sobre #991b1b, o vermelho dá 5,74.
  const corSaldo = (v: number) => (v >= 0 ? RADAR_COR_AZUL.bom : RADAR_COR_AZUL.ruim)
  const corBarra = (p: number, isEntrada: boolean) => RADAR_COR_AZUL[faixaRadar(Math.round(p * 100) / 100, isEntrada)]

  // O detalhe sai da mesma funcao dos dois cartoes de saldo, entao a linha
  // Total bate com eles por construcao.
  const linhasContas = useMemo(
    () => detalharMes(ano, mes, depsSaldo),
    [ano, mes, depsSaldo],
  )


  const alternarDetalhe = () => setDetalheContas(v => !v)

  function toggleAberto(uid: string) {
    setAbertos(prev => { const n = new Set(prev); n.has(uid)?n.delete(uid):n.add(uid); return n })
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
        faixaMotivo={ehMesCorrente && dadosAno
          ? <MotivoEstouroFaixa linhasSaida={linhasSaida} ano={ano} mes={mes} /> : null}
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
            <div style={{ flex: '1 1 320px', minWidth: 0 }}>
              {ritmo && resumo ? (<>
                <div style={{ fontSize: 14, fontWeight: 500, color: ROTULO_TOPO }}>
                  Ainda dá para gastar nas despesas variáveis até o dia {ritmo.totalDias}
                </div>
                <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-.8px', lineHeight: 1.15,
                  color: RADAR_COR_AZUL.bom, fontVariantNumeric: 'tabular-nums' }}>{fmt(ritmo.sobra)}</div>
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
            {/* 660px = quatro caixas de ~160px, onde "R$ 15.326,82" em 17px cabe.
                Sem esse espaço ao lado da frase, a fileira desce para baixo dela
                em vez de cortar o valor. */}
            <div style={{ flex: '1 1 660px', display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8 }}>
              {[
                { rot: 'Saldo inicial', v: fmt(saldoInicial), cor: corSaldo(saldoInicial), sub: `${MESES_FULL[mes]} ${ano}`, p: null as number | null, ent: false },
                { rot: '↑ Receitas', v: fmt(totalRealE), cor: RADAR_COR_AZUL.bom, sub: deQuanto(totalPrevE), p: percE, ent: true },
                { rot: '↓ Despesas', v: fmt(totalRealS), cor: RADAR_COR_AZUL.ruim, sub: deQuanto(totalPrevS), p: percS, ent: false },
                { rot: 'Saldo atual', v: fmt(saldoAtual), cor: corSaldo(saldoAtual), sub: 'bancos e dinheiro', p: null, ent: false },
              ].map(k => (
                <button key={k.rot} type="button" onClick={alternarDetalhe} aria-expanded={detalheContas}
                  style={{ background: 'rgba(15,23,42,.22)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 14,
                    padding: '10px 12px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: ROTULO_TOPO }}>{k.rot}</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: k.cor, fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap' }}>{k.v}</div>
                  <div style={{ fontSize: 12, color: ROTULO_TOPO, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.sub}</div>
                  {k.p !== null && (
                    <div style={{ marginTop: 6, height: 6, borderRadius: 3, overflow: 'hidden',
                      background: RADAR_TRILHO_AZUL, border: '1px solid #fff', boxSizing: 'border-box' }}>
                      <div style={{ width: `${Math.max(0, Math.min(k.p, 1)) * 100}%`, height: '100%', background: corBarra(k.p, k.ent) }} />
                    </div>
                  )}
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
            {ehMesCorrente && <MotivoEstouroFaixa linhasSaida={linhasSaida} ano={ano} mes={mes} />}
            {/* O cardápio: um cartão por grupo, receitas e depois despesas, numa
                grade. O cartão aberto ocupa a linha inteira (EvolucaoGrupo). */}
            {/* dense: com um cartão aberto ocupando a linha, os seguintes sobem
                para os buracos que ele deixaria. */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16,
              gridAutoFlow: 'row dense', alignItems: 'start', flexShrink: 0 }}>
            {(dadosAno.entradas ?? []).length > 0 && gruposEntrada.map(grupo => (
              <EvolucaoGrupo
                key={`entrada-${grupo}`}
                tipo="entrada"
                grupo={grupo}
                planCats={dadosAno.entradas ?? []}
                realMap={entradasMap}
                categorias={categorias}
                cartaoNomes={cartaoNomes}
                mes={mes}
              />
            ))}

            {(dadosAno.saidas ?? []).length > 0 && gruposSaida.map(grupo => (
              <EvolucaoGrupo
                key={`saida-${grupo}`}
                tipo="saida"
                grupo={grupo}
                planCats={dadosAno.saidas ?? []}
                realMap={saidasMap}
                categorias={categorias}
                cartaoNomes={cartaoNomes}
                mes={mes}
              />
            ))}
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
            <div style={{ borderRadius: 18, boxShadow: '0 2px 14px rgba(15,40,120,.12)',
              background: positivo ? 'linear-gradient(135deg,#0f2878,#1e40af)' : 'linear-gradient(135deg,#7f1d1d,#991b1b)' }}>
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
                  // Negativo, a barra do rodapé é VERMELHA: #f87171 ali dá 3,00 e
                  // some no fundo. Fica o vermelho-claro #fecaca (5,74) — o único
                  // ponto fora do azul, e o número que mais precisa ser lido.
                  color: positivo ? RADAR_COR_AZUL.bom : '#fecaca' }}>
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
