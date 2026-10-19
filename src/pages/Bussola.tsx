import { useMemo, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useMesDaInicio } from '../components/inicio/useMesDaInicio'
import { useMesQueFechou } from '../components/inicio/useMesQueFechou'
import { STATUS_HERO, statusDoMes } from '../components/inicio/statusHero'
import { mensagemDaChegada, COR_CHEGADA } from '../utils/mensagemDoMes'
import RevisaoPlanoDialog from '../components/acompanhamento/RevisaoPlanoDialog'
import { useLembreteMotivo } from '../components/motivo/useLembreteMotivo'
import { MemoriaSaldo } from '../components/novoLancamentoExtrato/NleExtrato'
import BottomNav from '../components/BottomNav'
import LembreteDiarioCard from '../components/LembreteDiario'
import ConferirSaldosCard from '../components/inicio/ConferirSaldosCard'
import DebitosAutomaticosCard from '../components/inicio/DebitosAutomaticosCard'
import { Atalho, Barrinha, Cartao, Etiqueta, Linha, OlhoIcone, Pilula, PrevistoRealizado, SeletorCenario, TituloCartao, Valor } from '../components/mobile/ui'
import { M, fmt, mostrar, pilulaTopo, useValoresOcultos } from '../components/mobile/estilo'
import { bussolaDoMes } from '../utils/bussolaDoMes'
import { iconeCategoria } from '../utils/categoriaIcone'
import type { Aviso } from '../utils/avisosDoMes'
import { COR } from '../utils/cores'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

// Sobre o azul do topo (#0f2878 → #1e40af, medido no extremo claro): branco
// 8,7; rótulo a 75% 5,1; #fecaca 4,6; #86efac 4,8.
const ROTULO = 'rgba(255,255,255,.75)'

/**
 * A Início do celular, no desenho dos apps de banco (redesenho de 10/10/2026,
 * pedido do Guilherme: "frio, letras pequenas, muito texto").
 *
 *   - Topo azul com o resumo do mês (pedido do Guilherme, 10/10/2026): o
 *     saldo atual de bancos e dinheiro, e o saldo final previsto com os três
 *     cenários ali mesmo. Logo abaixo, previsto × realizado com o resultado
 *     e a folga da variável (`ritmoDoMes`). O olho esconde os valores.
 *   - Uma fileira de atalhos redondos: Lançar, Pagar, Posso comprar?, Radar.
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
  // O motivo de ter passado, anotado na hora (Revisão mensal abre com ele).
  const motivo = useLembreteMotivo(usaPlanoNoMes ? linhasSaida : [], ano, mes)
  const fechou = useMesQueFechou(deps)
  const status = STATUS_HERO[statusDoMes({ totalEntradas, totalSaidas, totalPrevS, temPlano })]

  const [memoriaAberta, setMemoriaAberta] = useState(false)
  const [revisando, setRevisando] = useState(false)
  const [oculto, alternarOculto] = useValoresOcultos()
  const v = (n: number) => mostrar(n, oculto)

  const nome = perfil.apelido || perfil.nome.split(' ')[0] || user?.email?.split('@')[0] || ''
  const r = b.ritmo
  const passou = r?.estado === 'passou'

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
                <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: chegada ? COR_CHEGADA : status.cor, flexShrink: 0 }} />
                {chegada ? mensagemDaChegada(MESES[chegada.mes].toLowerCase(), 'corrente') : status.frase(mesNome, false)}
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
              color: b.saldoHoje < 0 ? '#fecaca' : '#fff', fontVariantNumeric: 'tabular-nums' }}>{v(b.saldoHoje)}</div>
          </div>

          <div style={{ ...pilulaTopo, alignItems: 'stretch', cursor: 'default', marginTop: 18, gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontSize: 14, color: ROTULO }}>Saldo final previsto</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: b.fechamento < 0 ? '#fecaca' : '#fff', fontVariantNumeric: 'tabular-nums' }}>
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

        {/* ── Previsto × realizado do mês, com o resultado ────────────── */}
        <Cartao>
          <TituloCartao>{mesNome.charAt(0).toUpperCase() + mesNome.slice(1)} até agora</TituloCartao>
          <PrevistoRealizado mesNome={mesNome} oculto={oculto} comPlano={usaPlanoNoMes}
            linhas={[['Receitas', totalPrevE, totalEntradas], ['Despesas', totalPrevS, totalSaidas]]} />
          {r && (
            <div style={{ fontSize: 14, color: COR.textoSuave, marginTop: 14, lineHeight: 1.45 }}>
              {passou
                ? <>Gastos variáveis: <b style={{ color: COR.erroTexto }}>{v(r.gasto - r.planejado)}</b> acima do planejado.</>
                : <>Gastos variáveis: ainda dá <b style={{ color: COR.texto }}>{v(r.sobra)}</b>
                    {r.diasRestantes > 1 ? <>, {v(r.porDia)} por dia até o dia {r.totalDias}.</> : ' até hoje, último dia do mês.'}</>}
            </div>
          )}
        </Cartao>

        {/* ── Atalhos: o que se faz todo dia ─────────────────────────── */}
        <Cartao style={{ display: 'flex', gap: 4, padding: '18px 8px 16px' }}>
          <Atalho icone="ti-plus" rotulo="Lançar" onClick={() => navigate('/lancar')} />
          <Atalho icone="ti-receipt" rotulo="Pagar contas" onClick={irParaContas} />
          <Atalho icone="ti-shopping-cart" rotulo="Posso comprar?" onClick={() => navigate('/simulacao')} />
          <Atalho icone="ti-radar-2" rotulo="Radar" onClick={() => navigate('/radar')} />
        </Cartao>

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
        {usaPlanoNoMes ? (
          <Cartao>
            {b.estouradas.length > 0 ? (
              <>
                <TituloCartao direita={<Etiqueta cor={COR.erroTexto} fundo={COR.erroFundo}>{b.estouradas.length === 1 ? '1 categoria' : `${b.estouradas.length} categorias`}</Etiqueta>}>
                  Passou do plano
                </TituloCartao>
                {b.estouradas.map((l, i) => {
                  const ic = iconeCategoria(categorias, l.nome)
                  return (
                    <Linha key={`${l.nome}||${l.descricao}`} primeira={i === 0} icone={ic.icone} cor={ic.cor}
                      titulo={l.descricao ? `${l.nome} · ${l.descricao}` : l.nome}
                      legenda={l.semPlano ? 'fora do plano' : `${v(l.real)} de ${v(l.prev)}`}
                      direita={<Valor cor={COR.erroTexto}>{oculto ? '••••' : `+${fmt(l.excesso)}`}</Valor>} />
                  )
                })}
                {motivo.texto && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, paddingTop: 12,
                    borderTop: `1px solid ${COR.borda}` }}>
                    <span style={{ flex: 1, fontSize: M.legenda, color: COR.textoSuave, lineHeight: 1.4 }}>
                      Por que passou? Anote agora, enquanto lembra.
                    </span>
                    <Pilula onClick={motivo.abrir}>Anotar motivo</Pilula>
                  </div>
                )}
                {motivo.texto && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 4 }}>
                    <button type="button" onClick={motivo.lembrarDepois} style={linkMotivo}>Lembrar depois</button>
                    <button type="button" onClick={motivo.fechar} style={linkMotivo}>Fechar</button>
                  </div>
                )}
              </>
            ) : (
              <>
                <TituloCartao direita={<Etiqueta cor={COR.sucessoTexto} fundo={COR.sucessoFundo}>✓ tudo dentro</Etiqueta>}>
                  Plano do mês
                </TituloCartao>
                {b.perto.length === 0 && (
                  <div style={{ fontSize: M.corpo, color: COR.textoSuave }}>Ainda sem gasto nas categorias do plano.</div>
                )}
                {b.perto.map((l, i) => {
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
        ) : (
          <Cartao>
            <TituloCartao>Plano do mês</TituloCartao>
            <div style={{ fontSize: M.corpo, color: COR.textoSuave, lineHeight: 1.45 }}>
              Com um plano, a Bússola diz quanto ainda dá para gastar.
            </div>
            <div style={{ marginTop: 14 }}><Pilula forte onClick={() => navigate('/planejamento')}>Montar meu plano</Pilula></div>
          </Cartao>
        )}

        <LembreteDiarioCard />
      </div>

      {motivo.dialog}
      {fechou.dialog}
      {revisando && (
        <RevisaoPlanoDialog acima={b.lancadoAcima} deps={deps} planos={planos} setPlanos={setPlanos}
          categorias={categorias} onFechar={() => setRevisando(false)} />
      )}
      <BottomNav />
    </div>
  )
}



// Toque de 44 px (o kit do celular); textoSuave no branco dá 4,76.
const linkMotivo: CSSProperties = {
  border: 'none', background: 'none', color: COR.textoSuave, minHeight: 44, padding: '0 4px',
  fontFamily: 'inherit', fontSize: M.legenda, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline',
}

const linkRodape: CSSProperties = {
  display: 'block', width: '100%', marginTop: 8, padding: '14px 0 0', border: 'none', borderTop: '1px solid #eef2f8',
  background: 'none', color: COR.azul, fontSize: 15, fontWeight: 700,
  fontFamily: 'inherit', cursor: 'pointer', textAlign: 'center',
}




