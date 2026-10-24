import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useMesDaInicio } from '../components/inicio/useMesDaInicio'
import { useMesQueFechou } from '../components/inicio/useMesQueFechou'
import { STATUS_HERO, statusDoMes } from '../components/inicio/statusHero'
import { mensagemDaChegada, COR_CHEGADA, COR_MENSAGEM, estadoDoMes, mensagemDoMes, mensagemComComprasDeAntes } from '../utils/mensagemDoMes'
import { comprasDeAntesNoMes } from '../utils/primeiroPlano'
import RevisaoPlanoDialog from '../components/acompanhamento/RevisaoPlanoDialog'
import { MemoriaSaldo } from '../components/novoLancamentoExtrato/NleExtrato'
import BottomNav from '../components/BottomNav'
import LembreteDiarioCard from '../components/LembreteDiario'
import ConviteInstalar from '../components/ConviteInstalar'
import ConferirSaldosCard from '../components/inicio/ConferirSaldosCard'
import DebitosAutomaticosCard from '../components/inicio/DebitosAutomaticosCard'
import PlanoDoMesCard from '../components/inicio/PlanoDoMesCard'
import { Cartao, Linha, OlhoIcone, Pilula, ResumoDoMes, SeletorCenario, TituloCartao } from '../components/mobile/ui'
import { M, mostrar, pilulaTopo, useValoresOcultos } from '../components/mobile/estilo'
import { bussolaDoMes } from '../utils/bussolaDoMes'
import type { Aviso } from '../utils/avisosDoMes'
import { COR } from '../utils/cores'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

// Sobre o azul do topo (#0f2878 → #1e40af, medido no extremo claro): branco
// 8,7; rótulo a 75% 5,1; #fdba74 5,2; #86efac 4,8.
const ROTULO = 'rgba(255,255,255,.75)'

/**
 * A Início do celular, no desenho dos apps de banco (redesenho de 10/10/2026,
 * pedido do Guilherme: "frio, letras pequenas, muito texto").
 *
 *   - Topo azul com o resumo do mês (pedido do Guilherme, 10/10/2026): o
 *     saldo atual de bancos e dinheiro, e o saldo final previsto com os três
 *     cenários ali mesmo. Logo abaixo, previsto × realizado com o resultado
 *     e a folga da variável (`ritmoDoMes`). O olho esconde os valores.
 *   - Sem atalhos redondos (19/10/2026, pedido do Guilherme, como no
 *     computador): Lançar, Radar e Plano estão na barra de baixo.
 *   - Cartões curtos: uma lista com ícone colorido da categoria e o valor à
 *     direita. Explicação só quando tocada ("como cheguei").
 *
 * As quatro perguntas e os números são os mesmos da Fase 3: tudo vem de
 * utils/bussolaDoMes, que chama as funções da Início do computador (prova60).
 * Só o desenho mudou.
 */
export default function Bussola() {
  const navigate = useNavigate()
  const { categorias, perfil, user, planos, setPlanos, cenarioPrevisao, setCenarioPrevisao } = useApp()
  const hoje = new Date()
  const ano = hoje.getFullYear(), mes = hoje.getMonth()
  const mesNome = MESES[mes]

  const { totalEntradas, totalSaidas, totalPrevS, totalPrevE, linhasSaida, deps, temPlano, usaPlanoNoMes, chegada } = useMesDaInicio(ano, mes)
  const b = useMemo(
    () => bussolaDoMes({ deps, linhasSaida, categorias, usaPlanoNoMes }),
    [deps, linhasSaida, categorias, usaPlanoNoMes],
  )
  const fechou = useMesQueFechou(deps)
  const status = STATUS_HERO[statusDoMes({ totalEntradas, totalSaidas, totalPrevS, temPlano })]
  // Primeiro mês do plano apertado pelas faturas de antes de chegar: a mesma
  // explicação da Início do computador (análise da chegada v3, C7).
  const estadoMes = estadoDoMes(b.memoria.abertura, b.memoria.fechamento)
  const fraseDeAntes = mensagemComComprasDeAntes(estadoMes, 'corrente', b.memoria.abertura, b.memoria.fechamento,
    comprasDeAntesNoMes(planos, ano, mes))
  const deAntes = fraseDeAntes !== mensagemDoMes(estadoMes, 'corrente') ? fraseDeAntes : null

  const [memoriaAberta, setMemoriaAberta] = useState(false)
  const [revisando, setRevisando] = useState(false)
  const [oculto, alternarOculto] = useValoresOcultos()
  const v = (n: number) => mostrar(n, oculto)

  const nome = perfil.apelido || perfil.nome.split(' ')[0] || user?.email?.split('@')[0] || ''
  const metaDoMes = planos[ano]?.objetivos?.[mes] ?? 0

  // As contas da semana moram no Lançar, embaixo das categorias (pedido do
  // Guilherme em 10/10/2026): pagar e lançar são o mesmo gesto do dia.
  const irParaContas = () => navigate('/lancar#contas')

  const acaoDoAviso: Record<Aviso['id'], { rotulo: string; onClick: () => void }> = {
    parcelas: { rotulo: 'Revisar', onClick: () => setRevisando(true) },
    negativo: { rotulo: 'Ver plano', onClick: () => navigate('/planejamento') },
    contas:   { rotulo: 'Pagar', onClick: irParaContas },
    passou:   { rotulo: 'Radar', onClick: () => navigate('/radar') },
    ritmo:    { rotulo: 'Radar', onClick: () => navigate('/radar') },
  }

  return (
    <div style={{ minHeight: '100vh', background: M.fundo, fontFamily: "-apple-system,'Inter',sans-serif" }}>
      {/* ── Topo azul: a resposta do dia ─────────────────────────────── */}
      <header style={{
        background: 'linear-gradient(160deg,#0f2878 0%,#1e40af 100%)', color: '#fff',
        padding: 'calc(18px + env(safe-area-inset-top)) 20px 64px', borderRadius: '0 0 28px 28px',
      }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {nome ? `Olá, ${nome}` : 'Olá'} <span aria-hidden>👋</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: ROTULO, marginTop: 4 }}>
                <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: chegada ? COR_CHEGADA : deAntes ? COR_MENSAGEM[estadoMes] : status.cor, flexShrink: 0 }} />
                {chegada ? mensagemDaChegada(MESES[chegada.mes].toLowerCase(), 'corrente') : deAntes ?? status.frase(mesNome, false)}
              </div>
            </div>
            <button onClick={alternarOculto} aria-label={oculto ? 'Mostrar valores' : 'Esconder valores'} aria-pressed={oculto}
              style={{
                width: 44, height: 44, borderRadius: '50%', border: 'none', flexShrink: 0, cursor: 'pointer',
                background: 'rgba(255,255,255,.14)', color: '#fff', fontSize: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <OlhoIcone fechado={oculto} />
            </button>
          </div>

          {/* ── O resumo do mês (pedido do Guilherme em 10/10/2026): primeiro
              o que tenho hoje, depois com quanto o mês termina, com o
              cenário ali mesmo. O "passou do plano em" do topo saiu. ── */}
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 15, color: ROTULO }}>Saldo atual · bancos e dinheiro</div>
            <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-.02em', marginTop: 2, lineHeight: 1.1,
              color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{v(b.saldoHoje)}</div>
          </div>

          <div style={{ ...pilulaTopo, alignItems: 'stretch', cursor: 'default', marginTop: 18, gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontSize: 14, color: ROTULO }}>Saldo final previsto</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                {v(b.fechamento)}
              </span>
            </div>
            <SeletorCenario valor={cenarioPrevisao} onEscolher={setCenarioPrevisao} />
            <button onClick={() => {
              const abrir = !memoriaAberta
              setMemoriaAberta(abrir)
              if (abrir) setTimeout(() => document.getElementById('memoria-do-saldo')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
            }} aria-expanded={memoriaAberta} style={{
              background: 'none', border: 'none', padding: 0, color: '#fff', fontSize: 14, fontFamily: 'inherit',
              textAlign: 'left', textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer',
            }}>{memoriaAberta ? 'fechar o cálculo' : 'como cheguei nesse número'}</button>
          </div>
        </div>
      </header>

      <div style={{ padding: '0 16px 110px', maxWidth: 560, margin: '-44px auto 0', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16 }}>
        {/* O cálculo abre logo abaixo do número, e a tela rola até ele: lá
            embaixo dos atalhos ele abria fora da vista e parecia que o link
            não fazia nada (relatado pelo Guilherme em 10/10/2026). */}
        {memoriaAberta && (
          <div id="memoria-do-saldo" style={{ scrollMarginTop: 12 }}>
            <MemoriaSaldo m={b.memoria} positivo={b.fechamento >= 0}
              cenario={cenarioPrevisao} onCenario={setCenarioPrevisao} />
          </div>
        )}

        {/* Logo abaixo do saldo (pedido do Guilherme, 18/10/2026). */}
        <ConferirSaldosCard deps={deps} oculto={oculto} />
        <DebitosAutomaticosCard deps={deps} oculto={oculto} />

        {/* ── Resumo do mês: saldos, receitas, despesas e a meta ────── */}
        {/* O mesmo do computador (pedido do Guilherme, 23/10/2026). */}
        <ResumoDoMes mesNome={mesNome} oculto={oculto} meta={metaDoMes}
          onDefinirMeta={usaPlanoNoMes ? () => navigate('/planejamento') : undefined}
          previsto={{ inicial: b.memoria.abertura, receitas: usaPlanoNoMes ? totalPrevE : null,
            despesas: usaPlanoNoMes ? totalPrevS : null, final: b.fechamento }}
          realizado={{ inicial: b.memoria.abertura, receitas: totalEntradas, despesas: totalSaidas, final: b.saldoHoje }} />

        {/* ── O que pede atenção, uma linha cada ─────────────────────── */}
        {(b.avisos.length > 0 || fechou.texto) && (
          <Cartao>
            <TituloCartao>Pede sua atenção</TituloCartao>
            {fechou.texto && (
              <Linha primeira icone={<i className="ti ti-calendar-check" style={{ color: COR.azul }} />} cor={COR.azul}
                titulo={<span style={{ whiteSpace: 'normal' }}>{fechou.texto.titulo}</span>}
                legenda={fechou.texto.detalhe}
                direita={<Pilula onClick={fechou.abrir}>Revisar</Pilula>} />
            )}
            {b.avisos.map((a, i) => (
              <Linha key={a.id} primeira={i === 0 && !fechou.texto} icone={<i className="ti ti-alert-triangle" style={{ color: a.tom === 'vermelho' ? COR.erroTexto : COR.amarelo }} />} cor={a.tom === 'vermelho' ? COR.erroTexto : COR.amarelo}
                titulo={<span style={{ whiteSpace: 'normal' }}>{a.titulo}</span>}
                direita={<Pilula onClick={acaoDoAviso[a.id].onClick}>{acaoDoAviso[a.id].rotulo}</Pilula>} />
            ))}
          </Cartao>
        )}

        {/* ── Onde o gasto passou do plano ───────────────────────────── */}
        {/* "Plano do mês": passou × abaixo do plano, por grupo (23/10/2026). */}
        {usaPlanoNoMes ? (
          <PlanoDoMesCard linhas={linhasSaida} categorias={categorias} oculto={oculto} onRadar={() => navigate('/radar')} />
        ) : (
          <Cartao>
            <TituloCartao>Plano do mês</TituloCartao>
            <div style={{ fontSize: M.corpo, color: COR.textoSuave, lineHeight: 1.45 }}>
              Com um plano, a Bússola diz quanto ainda dá para gastar.
            </div>
            <div style={{ marginTop: 14 }}><Pilula forte onClick={() => navigate('/planejamento')}>Montar meu plano</Pilula></div>
          </Cartao>
        )}

        <ConviteInstalar />
        <LembreteDiarioCard />
      </div>

      {fechou.dialog}
      {revisando && (
        <RevisaoPlanoDialog acima={b.lancadoAcima} deps={deps} planos={planos} setPlanos={setPlanos}
          categorias={categorias} onFechar={() => setRevisando(false)} />
      )}
      <BottomNav />
    </div>
  )
}







