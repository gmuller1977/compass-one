import { useState, useEffect, useMemo, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { saldoBancosEDinheiro, memoriaDoRadar } from '../utils/saldoConta'
import { serieBaseDoPlano, piorMesDaSerie, fimDoPlanejamento } from '../utils/simulacaoCompra'
import { evolucaoDoSaldo } from '../utils/evolucaoSaldo'
import { contasAVencer, contasDoMes } from '../utils/contasAVencer'
import { previsaoDoMes } from '../utils/previsaoDoMes'
import { ritmoDoMes } from '../utils/ritmoDoMes'
import { avisosDoMes, type Aviso } from '../utils/avisosDoMes'
import { categoriasEstouradas, maisPertoDoLimite } from '../utils/categoriasEstouradas'
import { iconeCategoria } from '../utils/categoriaIcone'
import { lancadoAcimaDoPlano } from '../utils/lancadoAcimaDoPlano'
import RevisaoPlanoDialog from '../components/acompanhamento/RevisaoPlanoDialog'
import { STATUS_HERO, statusDoMes, type CompassStatus } from '../components/inicio/statusHero'
import { estadoDoMes, mensagemDoMes, mensagemDaChegada, COR_MENSAGEM, COR_CHEGADA } from '../utils/mensagemDoMes'
import { useMesDaInicio } from '../components/inicio/useMesDaInicio'
import { useMesQueFechou } from '../components/inicio/useMesQueFechou'
import ContasAVencerCard from '../components/ContasAVencerCard'
import ConferirSaldosCard from '../components/inicio/ConferirSaldosCard'
import DebitosAutomaticosCard from '../components/inicio/DebitosAutomaticosCard'
import EvolucaoSaldoGrafico from '../components/EvolucaoSaldoGrafico'
import { MemoriaSaldo } from '../components/novoLancamentoExtrato/NleExtrato'
import AppHeader from '../components/AppHeader'
import AjudaTela from '../components/AjudaTela'
import { Barrinha, Cartao, Etiqueta, IconeRedondo, Linha, OlhoIcone, Pilula, PrevistoRealizado, SeletorCenario, TituloCartao, Valor } from '../components/mobile/ui'
import { M, ROTULO_TOPO, TOPO_AZUL, fmt, mostrar, pilulaTopo, useValoresOcultos } from '../components/mobile/estilo'
import SeletorMesAno from '../components/SeletorMesAno'
import { COR } from '../utils/cores'

function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
}


const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

/**
 * A Início enxuta (06/10/2026): a resposta, o que pede atenção e um gráfico.
 * "O início está uma tela cheia de número, e falando
 * de forma comercial isso não vende". O histórico (mês a mês, precisão do
 * plano) mora na Revisão mensal. Ver CLAUDE.md, "A Início enxuta".
 */
export default function Dashboard() {
  const navigate  = useNavigate()
  const isMobile  = useIsMobile()
  const {
    contas, categorias, planos, setPlanos, perfil, user, cenarioPrevisao, setCenarioPrevisao,
  } = useApp()

  const hoje = new Date()
  const [viewMes, setViewMes] = useState(hoje.getMonth())
  const [viewAno, setViewAno] = useState(hoje.getFullYear())

  const nome = perfil.apelido || perfil.nome.split(' ')[0] || user?.email?.split('@')[0] || 'Usuário'

  // ── Cálculos do mês ──────────────────────────────────────────────────
  // Nenhum número desta tela é calculado aqui: saem das MESMAS funções do
  // Radar, pela passagem que a Início divide com Análises (useMesDaInicio).
  const { totalEntradas, totalSaidas, totalPrevS, totalPrevE, linhasSaida, deps, temPlano, usaPlanoNoMes, chegada } =
    useMesDaInicio(viewAno, viewMes)

  // O saldo das contas de banco e do dinheiro ao fim do mês escolhido — no mês
  // corrente, o de hoje. É o "Saldo atual" do Radar.
  const saldoDisponivel = useMemo(
    () => saldoBancosEDinheiro(viewAno, viewMes, deps),
    [viewAno, viewMes, deps],
  )

  // Três modos. Mês fechado: só o que aconteceu, e o saldo final é o real.
  // Mês corrente: o que aconteceu e o previsto até o dia 31. Mês FUTURO: só
  // previsão — pedido do Guilherme em 27/09/2026, para se preparar para o
  // mês que vem. O seletor vai até o fim do plano; sem plano, até hoje.
  const ehMesCorrente = viewAno === hoje.getFullYear() && viewMes === hoje.getMonth()
  const ymHoje = hoje.getFullYear() * 12 + hoje.getMonth()
  const ehFuturo = viewAno * 12 + viewMes > ymHoje
  const olhaAFrente = ehMesCorrente || ehFuturo
  const fimPlano = useMemo(() => fimDoPlanejamento(planos), [planos])

  // Mês futuro: inicial, entradas, saídas e final previstos, e a memória só
  // daquele mês. Ver utils/previsaoDoMes.
  const previsao = useMemo(
    () => (ehFuturo ? previsaoDoMes(viewAno, viewMes, deps) : null),
    [ehFuturo, viewAno, viewMes, deps],
  )
  const contasFuturo = useMemo(
    () => (ehFuturo ? contasDoMes(viewAno, viewMes, deps) : []),
    [ehFuturo, viewAno, viewMes, deps],
  )

  // Com quanto o mês termina, e de onde isso vem: a memória de cálculo do
  // Radar, o mesmo objeto. `fechamento` é o saldo final previsto da barra do
  // rodapé de lá. Em mês FECHADO ela também existe: não projeta nada, e o
  // fechamento é o saldo real — é o que o hero mostra ali.
  const memoria = useMemo(
    () => (!ehFuturo ? memoriaDoRadar(viewAno, viewMes, deps) : null),
    [ehFuturo, viewAno, viewMes, deps],
  )
  const [memoriaAberta, setMemoriaAberta] = useState(false)

  // A série do Simulador, do mês corrente ao fim do plano — a parte cara,
  // calculada uma vez para o aviso e para o gráfico. Sem plano, não há série.
  const serie = useMemo(() => (olhaAFrente ? serieBaseDoPlano(deps) : null), [olhaAFrente, deps])

  // Pior mês à frente: o primeiro mês negativo e o pior, marcados como pontos
  // vermelhos no gráfico de evolução. O primeiro também vira aviso.
  const alertaFuturo = useMemo(() => {
    const a = serie ? piorMesDaSerie(serie) : null
    if (!a?.primeiroNegativo) return null
    const marco = (p: { ano: number; mes: number; semCompra: number }) => ({ ano: p.ano, mes: p.mes, valor: p.semCompra })
    return { primeiroNegativo: marco(a.primeiroNegativo), pior: marco(a.pior) }
  }, [serie])

  // Passado real + mês corrente previsto + futuro previsto, numa linha só. Vai
  // até o fim do plano — não para em 12 meses —, senão um mês negativo além
  // disso não teria onde ser marcado.
  const evolucao = useMemo(
    () => (olhaAFrente ? evolucaoDoSaldo(deps, serie, undefined, { futuros: serie?.base.length ?? 0 }) : []),
    [olhaAFrente, deps, serie],
  )

  // Contas dos próximos 7 dias: as linhas de fixa e fatura da memória de
  // cálculo, filtradas pelo vencimento. Ver utils/contasAVencer.
  const aVencer = useMemo(() => (ehMesCorrente ? contasAVencer(deps) : []), [ehMesCorrente, deps])

  // Ritmo do mês: só no mês corrente e com plano. Vira a folga do hero ("ainda
  // dá para gastar") e, acelerado, um aviso. Ver utils/ritmoDoMes.
  const ritmo = useMemo(
    () => (ehMesCorrente && usaPlanoNoMes ? ritmoDoMes(linhasSaida, categorias) : null),
    [ehMesCorrente, usaPlanoNoMes, linhasSaida, categorias],
  )

  // Já lançado acima do plano dos próximos meses (parcelas, quase sempre).
  // Só olhando o mês corrente: é um aviso sobre o que vem pela frente.
  const lancadoAcima = useMemo(() => (ehMesCorrente ? lancadoAcimaDoPlano(deps) : []), [ehMesCorrente, deps])
  // "Revisar agora" abre aqui mesmo a tabela da revisão do plano — a mesma
  // janela do Radar e do Planejamento.
  const [revisando, setRevisando] = useState(false)

  // No máximo três avisos — ver utils/avisosDoMes. Sem plano no mês não há
  // "passou do plano" a dizer.
  const avisos = useMemo(() => avisosDoMes({
    contas: aVencer,
    linhasSaida: usaPlanoNoMes ? linhasSaida : [],
    negativo: alertaFuturo?.primeiroNegativo ?? null,
    ritmo,
    lancadoAcima,
  }), [aVencer, usaPlanoNoMes, linhasSaida, alertaFuturo, ritmo, lancadoAcima])

  const temBanco      = contas.some(c => c.tipo === 'corrente' || c.tipo === 'poupanca')
  const temCategorias = categorias.some(c => c.ativa)

  // ── Bússola ──────────────────────────────────────────────────────────
  const compassStatus = useMemo<CompassStatus>(
    () => statusDoMes({ totalEntradas, totalSaidas, totalPrevS, temPlano }),
    [totalEntradas, totalSaidas, temPlano, totalPrevS],
  )

  // Onde o gasto passou do plano: as linhas do Radar, as mesmas da Bússola.
  const estouradas = useMemo(() => (ehMesCorrente && usaPlanoNoMes ? categoriasEstouradas(linhasSaida) : []),
    [ehMesCorrente, usaPlanoNoMes, linhasSaida])
  const perto = useMemo(() => (ehMesCorrente && usaPlanoNoMes && estouradas.length === 0 ? maisPertoDoLimite(linhasSaida, categorias) : []),
    [ehMesCorrente, usaPlanoNoMes, estouradas, linhasSaida, categorias])
  // Contas e "passou" têm cartão próprio aqui; o aviso deles não se repete.
  const outrosAvisos = avisos.filter(a => a.id !== 'contas' && a.id !== 'passou')
  // "Outubro fechou": o que vai se repetir entra no plano (utils/mesQueFechou).
  const fechou = useMesQueFechou(deps)
  const fechouTexto = ehMesCorrente ? fechou.texto : null

  const [oculto, alternarOculto] = useValoresOcultos()
  const v = (n: number) => mostrar(n, oculto)
  const mesNome = MESES_FULL[viewMes]
  // A frase do topo: uma mensagem curta, sem números, pelo saldo final
  // previsto (pedido do Guilherme em 13/10/2026). Ver utils/mensagemDoMes.
  const estadoMes = ehFuturo
    ? (previsao ? estadoDoMes(previsao.inicial, previsao.final) : null)
    : (memoria ? estadoDoMes(memoria.abertura, memoria.fechamento) : null)
  const quando = ehFuturo ? 'futuro' as const : ehMesCorrente ? 'corrente' as const : 'fechado' as const
  const linhaDaMeta = (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 15, marginTop: 10, lineHeight: 1.4 }}>
      {chegada ? (
        <>
          <span aria-hidden style={{ width: 9, height: 9, borderRadius: '50%', background: COR_CHEGADA, flexShrink: 0, marginTop: 7 }} />
          <span style={{ color: '#fff', fontWeight: 600, minWidth: 0 }}>
            {mensagemDaChegada(MESES_FULL[chegada.mes].toLowerCase(), ehMesCorrente ? 'corrente' : 'fechado')}
          </span>
        </>
      ) : !ehFuturo && compassStatus === 'sem-dados' ? (
        <span style={{ color: ROTULO_TOPO }}>{STATUS_HERO['sem-dados'].frase(mesNome, false)}</span>
      ) : estadoMes ? (
        <>
          <span aria-hidden style={{ width: 9, height: 9, borderRadius: '50%', background: COR_MENSAGEM[estadoMes], flexShrink: 0, marginTop: 7 }} />
          <span style={{ color: '#fff', fontWeight: 600, minWidth: 0 }}>{mensagemDoMes(estadoMes, quando)}</span>
        </>
      ) : null}
    </div>
  )
  const r = ritmo
  const passou = r?.estado === 'passou'

  const acaoDoAviso: Record<Aviso['id'], { rotulo: string; onClick: () => void }> = {
    parcelas: { rotulo: 'Revisar', onClick: () => setRevisando(true) },
    negativo: { rotulo: 'Ver plano', onClick: () => navigate('/planejamento') },
    contas:   { rotulo: 'Lançamentos', onClick: () => navigate('/novo-lancamento') },
    passou:   { rotulo: 'Radar', onClick: () => navigate('/radar') },
    ritmo:    { rotulo: 'Radar', onClick: () => navigate('/radar') },
  }

  // O número grande do topo e a caixa ao lado, nos três modos do mês.
  const grande = ehFuturo && previsao
    ? { rotulo: `${mesNome} deve terminar com`, valor: previsao.final }
    : ehMesCorrente
      ? { rotulo: 'Saldo atual · bancos e dinheiro', valor: saldoDisponivel }
      : memoria ? { rotulo: `${mesNome} terminou com`, valor: memoria.fechamento } : null

  const abrirMemoria = () => {
    const abrir = !memoriaAberta
    setMemoriaAberta(abrir)
    if (abrir) setTimeout(() => document.getElementById('memoria-do-saldo')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  // ── Render ────────────────────────────────────────────────────────────
  // A identidade do celular (Bússola) no computador — pedido do Guilherme em
  // 12/10/2026: topo azul com o número que importa, cartões brancos com
  // cantos de 20 e sombra azulada sobre o fundo azulado, ícone da categoria
  // em círculo. Duas colunas onde o celular tem uma.
  return (
    <div style={{ minHeight: '100vh', background: M.fundo, fontFamily: "-apple-system,'Inter',sans-serif" }}>
      <AppHeader currentPath="/dashboard" />

      {/* ── Topo azul: a resposta do mês ─────────────────────────────── */}
      {/* No computador, duas colunas (pedido do Guilherme em 13/10/2026): à
          esquerda a saudação com o saldo logo embaixo; à direita os controles
          e, embaixo deles, a caixa do saldo previsto na MESMA largura — a
          borda esquerda alinha com a seta do mês. */}
      <header style={{ background: TOPO_AZUL, color: '#fff', padding: isMobile ? '18px 16px 60px' : '28px 32px 76px', borderRadius: '0 0 28px 28px' }}>
        <div style={{ maxWidth: LARGURA - 64, margin: '0 auto' }}>
          {isMobile ? (<>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 26, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Olá, {nome} <span aria-hidden>👋</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <SeletorMesAno
                mes={viewMes} ano={viewAno}
                onSelect={(m, a) => { setViewMes(m); setViewAno(a); setMemoriaAberta(false) }}
                habilitado={(m, a) => a * 12 + m <= ymHoje
                  || (!!fimPlano && a * 12 + m <= fimPlano.ano * 12 + fimPlano.mes)}
                compacto={isMobile}
              />
              <button onClick={() => navigate('/novo-lancamento')} style={{ ...botaoTopo, background: '#fff', color: '#1e3a8a', padding: '0 18px' }}>
                + Lançar
              </button>
              <button onClick={alternarOculto} aria-label={oculto ? 'Mostrar valores' : 'Esconder valores'} aria-pressed={oculto}
                style={{ ...botaoTopo, width: 44, padding: 0 }}>
                <OlhoIcone fechado={oculto} />
              </button>
              <AjudaTela tela="inicio" />
            </div>
          </div>
          {grande && (
            <div style={{ display: 'grid', gap: 24, marginTop: 28 }}>
              <div>
                <div style={{ fontSize: 16, color: ROTULO_TOPO }}>{grande.rotulo}</div>
                <div style={{ fontSize: isMobile ? 38 : 48, fontWeight: 800, letterSpacing: '-.02em', marginTop: 4, lineHeight: 1.05,
                  color: grande.valor < 0 ? '#fecaca' : '#fff', fontVariantNumeric: 'tabular-nums' }}>{v(grande.valor)}</div>
                {linhaDaMeta}
              </div>

              <div style={{ ...pilulaTopo, alignItems: 'stretch', cursor: 'default', gap: 10 }}>
                {ehFuturo && previsao ? (
                  <>
                    {([['Abre com', previsao.inicial], ['Entram', previsao.entradas], ['Saem', previsao.saidas]] as const).map(([rot, n]) => (
                      <div key={rot} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 15 }}>
                        <span style={{ color: ROTULO_TOPO }}>{rot}</span><b style={{ fontVariantNumeric: 'tabular-nums' }}>{v(n)}</b>
                      </div>
                    ))}
                    <SeletorCenario valor={cenarioPrevisao} onEscolher={setCenarioPrevisao} />
                  </>
                ) : ehMesCorrente && memoria ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontSize: 15, color: ROTULO_TOPO }}>Saldo final previsto</span>
                      <span style={{ fontSize: 24, fontWeight: 800, color: memoria.fechamento < 0 ? '#fecaca' : '#fff', fontVariantNumeric: 'tabular-nums' }}>
                        {v(memoria.fechamento)}
                      </span>
                    </div>
                    <SeletorCenario valor={cenarioPrevisao} onEscolher={setCenarioPrevisao} />
                  </>
                ) : memoria ? (
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontSize: 15, color: ROTULO_TOPO }}>Abriu com</span>
                    <span style={{ fontSize: 22, fontWeight: 800, color: memoria.abertura < 0 ? '#fecaca' : '#fff', fontVariantNumeric: 'tabular-nums' }}>
                      {v(memoria.abertura)}
                    </span>
                  </div>
                ) : null}
                <button onClick={abrirMemoria} aria-expanded={memoriaAberta} style={linkTopo}>
                  {memoriaAberta ? 'fechar o cálculo' : 'como cheguei nesse número'}
                </button>
              </div>
            </div>
          )}
          </>) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', columnGap: 24, alignItems: 'start' }}>
            <div style={{ minWidth: 0 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 26, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Olá, {nome} <span aria-hidden>👋</span>
              </div>
            </div>
              {grande && (
                <div style={{ marginTop: 22 }}>
              <div>
                <div style={{ fontSize: 16, color: ROTULO_TOPO }}>{grande.rotulo}</div>
                <div style={{ fontSize: isMobile ? 38 : 48, fontWeight: 800, letterSpacing: '-.02em', marginTop: 4, lineHeight: 1.05,
                  color: grande.valor < 0 ? '#fecaca' : '#fff', fontVariantNumeric: 'tabular-nums' }}>{v(grande.valor)}</div>
                {linhaDaMeta}
              </div>

                </div>
              )}
            </div>
            <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <SeletorMesAno
                mes={viewMes} ano={viewAno}
                onSelect={(m, a) => { setViewMes(m); setViewAno(a); setMemoriaAberta(false) }}
                habilitado={(m, a) => a * 12 + m <= ymHoje
                  || (!!fimPlano && a * 12 + m <= fimPlano.ano * 12 + fimPlano.mes)}
                compacto={isMobile}
              />
              <button onClick={() => navigate('/novo-lancamento')} style={{ ...botaoTopo, background: '#fff', color: '#1e3a8a', padding: '0 18px' }}>
                + Lançar
              </button>
              <button onClick={alternarOculto} aria-label={oculto ? 'Mostrar valores' : 'Esconder valores'} aria-pressed={oculto}
                style={{ ...botaoTopo, width: 44, padding: 0 }}>
                <OlhoIcone fechado={oculto} />
              </button>
              <AjudaTela tela="inicio" />
            </div>
              {grande && (
              <div style={{ ...pilulaTopo, alignItems: 'stretch', cursor: 'default', gap: 10 }}>
                {ehFuturo && previsao ? (
                  <>
                    {([['Abre com', previsao.inicial], ['Entram', previsao.entradas], ['Saem', previsao.saidas]] as const).map(([rot, n]) => (
                      <div key={rot} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 15 }}>
                        <span style={{ color: ROTULO_TOPO }}>{rot}</span><b style={{ fontVariantNumeric: 'tabular-nums' }}>{v(n)}</b>
                      </div>
                    ))}
                    <SeletorCenario valor={cenarioPrevisao} onEscolher={setCenarioPrevisao} />
                  </>
                ) : ehMesCorrente && memoria ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontSize: 15, color: ROTULO_TOPO }}>Saldo final previsto</span>
                      <span style={{ fontSize: 24, fontWeight: 800, color: memoria.fechamento < 0 ? '#fecaca' : '#fff', fontVariantNumeric: 'tabular-nums' }}>
                        {v(memoria.fechamento)}
                      </span>
                    </div>
                    <SeletorCenario valor={cenarioPrevisao} onEscolher={setCenarioPrevisao} />
                  </>
                ) : memoria ? (
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontSize: 15, color: ROTULO_TOPO }}>Abriu com</span>
                    <span style={{ fontSize: 22, fontWeight: 800, color: memoria.abertura < 0 ? '#fecaca' : '#fff', fontVariantNumeric: 'tabular-nums' }}>
                      {v(memoria.abertura)}
                    </span>
                  </div>
                ) : null}
                <button onClick={abrirMemoria} aria-expanded={memoriaAberta} style={linkTopo}>
                  {memoriaAberta ? 'fechar o cálculo' : 'como cheguei nesse número'}
                </button>
              </div>
              )}
            </div>
          </div>
          )}
        </div>
      </header>

      <div style={{ maxWidth: LARGURA, margin: '-48px auto 0', padding: isMobile ? '0 14px 80px' : '0 32px 48px', display: 'grid', gap: 20 }}>
        {memoriaAberta && (
          <div id="memoria-do-saldo" style={{ scrollMarginTop: 12 }}>
            {ehFuturo && previsao ? (
              <MemoriaSaldo m={previsao.memoria} positivo={previsao.final >= 0}
                cenario={cenarioPrevisao} onCenario={setCenarioPrevisao}
                rotuloAbertura={['Saldo inicial previsto', 'Com quanto o mês deve abrir']} />
            ) : memoria && (
              <MemoriaSaldo m={memoria} positivo={memoria.fechamento >= 0}
                cenario={cenarioPrevisao} onCenario={setCenarioPrevisao} />
            )}
          </div>
        )}

        {/* Logo abaixo do saldo (pedido do Guilherme, 18/10/2026). */}
        {/* Ao lado, os débitos automáticos para conferir (pedido dele, mesmo dia). */}
        {/* Embaixo dos saldos, as contas da semana com o "Pagar" (pedido dele, mesmo dia). */}
        {ehMesCorrente && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, alignItems: 'start' }}>
            <div style={{ display: 'grid', gap: 16 }}>
              <ConferirSaldosCard deps={deps} oculto={oculto} />
              <ContasAVencerCard contas={aVencer} categorias={categorias} oculto={oculto} titulo="Contas da semana"
                saldoHoje={saldoDisponivel} podePagar={!isMobile} onAbrir={() => navigate('/novo-lancamento')} />
            </div>
            <DebitosAutomaticosCard deps={deps} oculto={oculto} />
          </div>
        )}

        {/* ── Primeiros passos: sem conta ou categoria, ou sem plano ── */}
        {(!temBanco || !temCategorias) && (
          <Cartao style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <IconeRedondo icone={<i className="ti ti-compass" style={{ color: COR.azul }} />} />
            <span style={{ flex: 1, fontSize: M.corpo, color: COR.texto }}>Configure suas contas e categorias para uma visão completa.</span>
            <Pilula forte onClick={() => navigate('/configuracoes')}>Configurar</Pilula>
          </Cartao>
        )}
        {temBanco && temCategorias && !temPlano && (
          <Cartao style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <IconeRedondo icone={<i className="ti ti-clipboard-list" style={{ color: COR.amarelo }} />} cor={COR.amarelo} />
            <span style={{ flex: 1, fontSize: M.corpo, color: COR.texto }}>Com um plano, a Início diz quanto ainda dá para gastar e com quanto o mês termina.</span>
            <Pilula forte onClick={() => navigate('/planejamento', { state: { openQuiz: true } })}>Montar meu plano</Pilula>
          </Cartao>
        )}

        {/* Mês futuro: nada aqui aconteceu ainda. */}
        {ehFuturo && (
          <Cartao style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <IconeRedondo icone={<i className="ti ti-telescope" style={{ color: COR.azul }} />} />
            <div style={{ flex: 1, minWidth: 240, fontSize: M.corpo, color: COR.texto, lineHeight: 1.5 }}>
              <b>Nada aqui aconteceu ainda.</b>{' '}
              <span style={{ color: COR.textoSuave }}>São as contas do plano, as faturas já lançadas e o que o plano espera
              gastar e receber, no cenário {cenarioPrevisao}.</span>
            </div>
            <Pilula onClick={() => { setViewMes(hoje.getMonth()); setViewAno(hoje.getFullYear()) }}>Voltar para hoje</Pilula>
          </Cartao>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20, alignItems: 'start' }}>
          {/* ── Coluna 1: o mês em números ── */}
          <div style={{ display: 'grid', gap: 20 }}>
            {!ehFuturo ? (
              <Cartao>
                <TituloCartao>{ehMesCorrente ? `${mesNome} até agora` : `${mesNome} fechou assim`}</TituloCartao>
                <PrevistoRealizado mesNome={mesNome} oculto={oculto} comPlano={usaPlanoNoMes}
                  linhas={[['Receitas', totalPrevE, totalEntradas], ['Despesas', totalPrevS, totalSaidas]]} />
                {r && (
                  <div style={{ fontSize: 14, color: COR.textoSuave, marginTop: 14, lineHeight: 1.45 }}>
                    {passou
                      ? <>Gastos variáveis: <b style={{ color: COR.erroTexto }}>{v(r.gasto - r.planejado)}</b> acima do planejado. Cada gasto variável agora sai do saldo.</>
                      : <>Gastos variáveis: ainda dá <b style={{ color: COR.texto }}>{v(r.sobra)}</b>
                          {r.diasRestantes > 1 ? <>, {v(r.porDia)} por dia até o dia {r.totalDias}.</> : ' até hoje, último dia do mês.'}</>}
                  </div>
                )}
              </Cartao>
            ) : previsao && (
              <Cartao>
                <TituloCartao>{mesNome} previsto</TituloCartao>
                <PrevistoRealizado mesNome={mesNome} oculto={oculto} comPlano={false} rotuloReal="Nas contas"
                  linhas={[['Receitas', 0, previsao.entradas], ['Despesas', 0, previsao.saidas]]} />
              </Cartao>
            )}

            {ehMesCorrente && (
              usaPlanoNoMes ? (
                <Cartao>
                  {estouradas.length > 0 ? (
                    <>
                      <TituloCartao direita={<Etiqueta cor={COR.erroTexto} fundo={COR.erroFundo}>{estouradas.length === 1 ? '1 categoria' : `${estouradas.length} categorias`}</Etiqueta>}>
                        Passou do plano
                      </TituloCartao>
                      {estouradas.map((l, i) => {
                        const ic = iconeCategoria(categorias, l.nome)
                        return (
                          <Linha key={`${l.nome}||${l.descricao}`} primeira={i === 0} icone={ic.icone} cor={ic.cor}
                            titulo={l.descricao ? `${l.nome} · ${l.descricao}` : l.nome}
                            legenda={`${v(l.real)} de ${v(l.prev)}`}
                            direita={<Valor cor={COR.erroTexto}>{oculto ? '••••' : `+${fmt(l.excesso)}`}</Valor>} />
                        )
                      })}
                    </>
                  ) : (
                    <>
                      <TituloCartao direita={<Etiqueta cor={COR.sucessoTexto} fundo={COR.sucessoFundo}>✓ tudo dentro</Etiqueta>}>
                        Plano do mês
                      </TituloCartao>
                      {perto.length === 0 && <div style={{ fontSize: M.corpo, color: COR.textoSuave }}>Ainda sem gasto nas categorias do plano.</div>}
                      {perto.map((l, i) => {
                        const ic = iconeCategoria(categorias, l.nome)
                        return (
                          <Linha key={`${l.nome}||${l.descricao}`} primeira={i === 0} icone={ic.icone} cor={ic.cor}
                            titulo={l.descricao ? `${l.nome} · ${l.descricao}` : l.nome}
                            legenda={`resta ${v(Math.max(0, l.prev - l.real))}`}
                            direita={<Barrinha p={l.prev > 0 ? l.real / l.prev : 0} />} />
                        )
                      })}
                    </>
                  )}
                  <button onClick={() => navigate('/radar')} style={linkRodape}>Ver todas no Radar ›</button>
                </Cartao>
              ) : null
            )}
          </div>

          {/* ── Coluna 2: o que fazer ── */}
          <div style={{ display: 'grid', gap: 20 }}>
            {ehMesCorrente && (outrosAvisos.length > 0 || fechouTexto) && (
              <Cartao>
                <TituloCartao>Pede sua atenção</TituloCartao>
                {fechouTexto && (
                  <Linha primeira icone={<i className="ti ti-calendar-check" style={{ color: COR.azul }} />} cor={COR.azul}
                    titulo={<span style={{ whiteSpace: 'normal' }}>{fechouTexto.titulo}</span>}
                    legenda={fechouTexto.detalhe}
                    direita={<Pilula onClick={fechou.abrir}>Revisar</Pilula>} />
                )}
                {outrosAvisos.map((a, i) => (
                  <Linha key={a.id} primeira={i === 0 && !fechouTexto} icone={<i className="ti ti-alert-triangle" style={{ color: a.tom === 'vermelho' ? COR.erroTexto : COR.amarelo }} />} cor={a.tom === 'vermelho' ? COR.erroTexto : COR.amarelo}
                    titulo={<span style={{ whiteSpace: 'normal' }}>{a.titulo}</span>}
                    legenda={a.detalhe}
                    direita={<Pilula onClick={acaoDoAviso[a.id].onClick}>{acaoDoAviso[a.id].rotulo}</Pilula>} />
                ))}
              </Cartao>
            )}

            {ehFuturo && contasFuturo.length > 0 && (
              <ContasAVencerCard contas={contasFuturo} categorias={categorias} oculto={oculto}
                titulo={`Contas de ${mesNome.toLowerCase()}`} onAbrir={() => navigate('/novo-lancamento')} />
            )}
          </div>
        </div>

        {/* ── Um gráfico só: para onde o saldo vai ── */}
        {evolucao.length >= 2 && (
          <Cartao style={{ padding: isMobile ? '16px 12px 10px' : '20px 22px 14px' }}>
            <TituloCartao>Para onde o seu saldo está indo</TituloCartao>
            <div style={{ fontSize: M.legenda, color: COR.textoSuave, marginTop: -6, marginBottom: 10 }}>
              Bancos e dinheiro · linha cheia é o que aconteceu, tracejada é a previsão
              {serie && fimPlano ? ` até ${MESES_FULL[fimPlano.mes].toLowerCase()} de ${fimPlano.ano}` : ''}
            </div>
            <EvolucaoSaldoGrafico pontos={evolucao} altura={isMobile ? 190 : 240}
              destaque={ehFuturo ? { ano: viewAno, mes: viewMes } : undefined}
              alerta={alertaFuturo} />
            {!serie && (
              <div style={{ fontSize: M.legenda, color: COR.textoSuave, marginTop: 6 }}>
                Com um planejamento, a previsão segue pelos próximos meses.
              </div>
            )}
          </Cartao>
        )}
      </div>

      {fechou.dialog}
      {revisando && (
        <RevisaoPlanoDialog acima={lancadoAcima} deps={deps} planos={planos} setPlanos={setPlanos}
          categorias={categorias} onFechar={() => setRevisando(false)} />
      )}
    </div>
  )
}

const LARGURA = 1120

const botaoTopo: CSSProperties = {
  height: 44, borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
  background: 'rgba(255,255,255,.14)', color: '#fff', fontSize: 15, fontWeight: 700,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap',
}

const linkTopo: CSSProperties = {
  background: 'none', border: 'none', padding: 0, color: '#fff', fontSize: 14, fontFamily: 'inherit',
  textAlign: 'left', textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer',
}

const linkRodape: CSSProperties = {
  display: 'block', width: '100%', marginTop: 8, padding: '14px 0 0', border: 'none', borderTop: '1px solid #eef2f8',
  background: 'none', color: COR.azul, fontSize: 15, fontWeight: 700,
  fontFamily: 'inherit', cursor: 'pointer', textAlign: 'center',
}
