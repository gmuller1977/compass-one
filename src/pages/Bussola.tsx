import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useMesDaInicio } from '../components/inicio/useMesDaInicio'
import { STATUS_HERO, statusDoMes } from '../components/inicio/statusHero'
import RevisaoPlanoDialog from '../components/acompanhamento/RevisaoPlanoDialog'
import { MemoriaSaldo } from '../components/novoLancamentoExtrato/NleExtrato'
import BottomNav from '../components/BottomNav'
import LembreteDiarioCard from '../components/LembreteDiario'
import { Atalho, Cartao, Linha, Pilula, TituloCartao } from '../components/mobile/ui'
import { M, fmt, mostrar, useValoresOcultos } from '../components/mobile/estilo'
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
 *   - Topo azul com UM número: quanto ainda dá para gastar (a folga do
 *     `ritmoDoMes`). Embaixo, menor: com quanto o mês termina e o que tem hoje
 *     no banco. O olho esconde os valores, como no app do banco.
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

  const { totalEntradas, totalSaidas, totalPrevS, linhasSaida, deps, temPlano, usaPlanoNoMes } = useMesDaInicio(ano, mes)
  const b = useMemo(
    () => bussolaDoMes({ deps, linhasSaida, categorias, usaPlanoNoMes }),
    [deps, linhasSaida, categorias, usaPlanoNoMes],
  )
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
                <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: status.cor, flexShrink: 0 }} />
                {status.frase(mesNome, false)}
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

          {r ? (
            <div style={{ marginTop: 26 }}>
              <div style={{ fontSize: 15, color: ROTULO }}>{passou ? 'Passou do plano em' : 'Ainda dá para gastar'}</div>
              <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-.02em', marginTop: 2, lineHeight: 1.1,
                color: passou ? '#fecaca' : '#fff', fontVariantNumeric: 'tabular-nums' }}>
                {v(passou ? r.gasto - r.planejado : r.sobra)}
              </div>
              <div style={{ fontSize: 15, color: ROTULO, marginTop: 6 }}>
                {passou ? 'cada gasto variável agora sai do saldo'
                  : r.diasRestantes === 1 ? 'hoje é o último dia do mês'
                    : <><b style={{ color: '#fff' }}>{v(r.porDia)}</b> por dia até o dia {r.totalDias}</>}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 26 }}>
              <div style={{ fontSize: 15, color: ROTULO }}>{mesNome} termina com</div>
              <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-.02em', marginTop: 2, lineHeight: 1.1,
                color: b.fechamento < 0 ? '#fecaca' : '#fff', fontVariantNumeric: 'tabular-nums' }}>{v(b.fechamento)}</div>
            </div>
          )}

          {/* Os dois números de apoio, em pílulas translúcidas. */}
          <div style={{ display: 'grid', gridTemplateColumns: r ? '1fr 1fr' : '1fr', gap: 10, marginTop: 20 }}>
            {r && (
              <button onClick={() => setMemoriaAberta(a => !a)} aria-expanded={memoriaAberta} style={pilulaTopo}>
                <span style={{ fontSize: 13, color: ROTULO }}>Mês termina com</span>
                <span style={{ fontSize: 17, fontWeight: 700, color: b.fechamento < 0 ? '#fecaca' : '#fff' }}>{v(b.fechamento)}</span>
                <span style={{ fontSize: 13, color: '#fff', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                  {memoriaAberta ? 'fechar' : 'como cheguei'}
                </span>
              </button>
            )}
            <div style={pilulaTopo}>
              <span style={{ fontSize: 13, color: ROTULO }}>Hoje no banco</span>
              <span style={{ fontSize: 17, fontWeight: 700, color: b.saldoHoje < 0 ? '#fecaca' : '#fff' }}>{v(b.saldoHoje)}</span>
              {!r && (
                <button onClick={() => setMemoriaAberta(a => !a)} aria-expanded={memoriaAberta} style={{
                  background: 'none', border: 'none', padding: 0, color: '#fff', fontSize: 13, fontFamily: 'inherit',
                  textAlign: 'left', textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer',
                }}>{memoriaAberta ? 'fechar' : 'como cheguei'}</button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div style={{ padding: '0 16px 110px', maxWidth: 560, margin: '-44px auto 0', display: 'grid', gap: 16 }}>
        {/* ── Atalhos: o que se faz todo dia ─────────────────────────── */}
        <Cartao style={{ display: 'flex', gap: 4, padding: '18px 8px 16px' }}>
          <Atalho icone={<span style={{ fontSize: 32, fontWeight: 300, lineHeight: 1 }}>+</span>} rotulo="Lançar" destaque onClick={() => navigate('/lancar')} />
          <Atalho icone="📅" rotulo="Pagar contas" onClick={irParaContas} />
          <Atalho icone="🛒" rotulo="Posso comprar?" onClick={() => navigate('/posso-comprar')} />
          <Atalho icone="📈" rotulo="Radar" onClick={() => navigate('/radar')} />
        </Cartao>

        {memoriaAberta && (
          <MemoriaSaldo m={b.memoria} positivo={b.fechamento >= 0}
            cenario={cenarioPrevisao} onCenario={setCenarioPrevisao} />
        )}

        {/* ── O que pede atenção, uma linha cada ─────────────────────── */}
        {b.avisos.length > 0 && (
          <Cartao>
            <TituloCartao>Pede sua atenção</TituloCartao>
            {b.avisos.map((a, i) => (
              <Linha key={a.id} primeira={i === 0} icone="⚠️" cor={a.tom === 'vermelho' ? COR.erroTexto : COR.amarelo}
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

      {revisando && (
        <RevisaoPlanoDialog acima={b.lancadoAcima} deps={deps} planos={planos} setPlanos={setPlanos}
          categorias={categorias} onFechar={() => setRevisando(false)} />
      )}
      <BottomNav />
    </div>
  )
}

const pilulaTopo: CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, textAlign: 'left',
  background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.16)', borderRadius: 16,
  padding: '12px 14px', color: '#fff', fontFamily: 'inherit', cursor: 'pointer', minWidth: 0,
}

const linkRodape: CSSProperties = {
  display: 'block', width: '100%', marginTop: 8, padding: '14px 0 0', border: 'none', borderTop: '1px solid #eef2f8',
  background: 'none', color: COR.azul, fontSize: 15, fontWeight: 700,
  fontFamily: 'inherit', cursor: 'pointer', textAlign: 'center',
}

function Etiqueta({ children, cor, fundo }: { children: ReactNode; cor: string; fundo: string }) {
  return (
    <span style={{ fontSize: 13, fontWeight: 700, color: cor, background: fundo, borderRadius: 999,
      padding: '4px 10px', whiteSpace: 'nowrap' }}>{children}</span>
  )
}

function Valor({ children, cor = COR.texto }: { children: ReactNode; cor?: string }) {
  return (
    <span style={{ fontSize: M.corpo, fontWeight: 700, color: cor, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
      {children}
    </span>
  )
}

/** Barra curta do quanto da categoria já foi: verde, e verde-escuro perto do fim (as cores do Radar no claro). */
function Barrinha({ p }: { p: number }) {
  const perc = Math.min(1, Math.max(0, p))
  return (
    <span role="img" aria-label={`${Math.round(p * 100)}% usado`} style={{
      display: 'block', width: 56, height: 8, borderRadius: 4, background: '#e2e8f0', overflow: 'hidden', flexShrink: 0,
    }}>
      <span style={{ display: 'block', height: '100%', width: `${perc * 100}%`, borderRadius: 4,
        background: p >= 0.9 ? '#18713a' : '#22c55e' }} />
    </span>
  )
}

function OlhoIcone({ fechado }: { fechado: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {fechado && <path d="M3 3l18 18" />}
    </svg>
  )
}
