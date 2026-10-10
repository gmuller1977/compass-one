import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useMesDaInicio } from '../components/inicio/useMesDaInicio'
import { STATUS_HERO, statusDoMes } from '../components/inicio/statusHero'
import HeroSaldo from '../components/inicio/HeroSaldo'
import AvisosCard from '../components/inicio/AvisosCard'
import EstouradasCard from '../components/EstouradasCard'
import ContasAPagarRapido from '../components/quickLaunch/ContasAPagarRapido'
import RevisaoPlanoDialog from '../components/acompanhamento/RevisaoPlanoDialog'
import { MemoriaSaldo } from '../components/novoLancamentoExtrato/NleExtrato'
import BottomNav from '../components/BottomNav'
import { bussolaDoMes } from '../utils/bussolaDoMes'
import { COR } from '../utils/cores'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * A Início do celular (Fase 3 do plano mobile). Responde, de cima para baixo,
 * as quatro perguntas de quem controla o dinheiro todo dia:
 *
 *   1. Quanto ainda posso gastar?   — a folga do hero ("Ainda dá para gastar")
 *   2. Vou fechar o mês no azul?    — o número grande ("Outubro termina com")
 *   3. O que vence e tenho saldo?   — Contas a pagar, com "Pagar" ali mesmo
 *   4. Onde estou saindo do plano?  — o quadro das categorias estouradas
 *
 * E uma ação: lançar. O Quick Launch saiu da "/" e foi para "/lancar" — é o
 * "+" da barra de baixo e o botão grande daqui.
 *
 * Nenhum número é calculado aqui: tudo vem de utils/bussolaDoMes, que chama
 * as mesmas funções da Início do computador (prova60).
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

  const nome = perfil.apelido || perfil.nome.split(' ')[0] || user?.email?.split('@')[0] || ''
  const r = b.ritmo
  // A mesma folga do hero do computador: o "sobra" do ritmoDoMes.
  const folga = r ? (r.estado === 'passou' ? {
    rotulo: 'A variável passou do plano em', valor: r.gasto - r.planejado,
    detalhe: 'cada gasto variável agora sai do saldo', passou: true,
  } : {
    rotulo: 'Ainda dá para gastar', valor: r.sobra, passou: false,
    detalhe: r.diasRestantes === 1 ? 'hoje, o último dia' : `${fmt(r.porDia)} por dia até o dia ${r.totalDias}`,
  }) : null

  const secao = (t: string) => (
    <h2 style={{ fontSize: 12, fontWeight: 700, color: COR.textoSuave, letterSpacing: '.06em', textTransform: 'uppercase',
      margin: '18px 0 8px' }}>{t}</h2>
  )

  return (
    <div style={{ minHeight: '100vh', background: COR.fundo, fontFamily: "-apple-system,'Inter',sans-serif" }}>
      <div style={{ padding: '18px 16px 96px', maxWidth: 560, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: COR.texto }}>{nome ? `Olá, ${nome}` : 'Olá'}</div>
          <div style={{ fontSize: 13, color: COR.textoSuave }}>{mesNome} {ano}</div>
        </div>

        {/* 1 e 2 · Quanto posso gastar e com quanto o mês fecha */}
        <HeroSaldo
          status={{ cor: status.cor, frase: status.frase(mesNome, false) }}
          rotulo={`${mesNome} termina com`}
          valor={b.fechamento}
          folga={folga}
          apoio={[{ rotulo: 'Hoje no banco', valor: b.saldoHoje }]}
          sparkline={[]}
          isMobile
          aberto={memoriaAberta}
          onComoCheguei={() => setMemoriaAberta(v => !v)}
        />
        {memoriaAberta && (
          <MemoriaSaldo m={b.memoria} positivo={b.fechamento >= 0}
            cenario={cenarioPrevisao} onCenario={setCenarioPrevisao} />
        )}

        <button onClick={() => navigate('/lancar')} style={{
          width: '100%', marginTop: 14, padding: 15, border: 'none', borderRadius: 14, cursor: 'pointer',
          background: `linear-gradient(135deg,${COR.azul},${COR.azulMedio})`, color: '#fff',
          fontSize: 16, fontWeight: 700, fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(26,86,219,.3)',
        }}>+ Lançar um gasto</button>

        {b.avisos.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <AvisosCard avisos={b.avisos} isMobile emDia=""
              acoes={{
                parcelas: { rotulo: 'Revisar agora', onClick: () => setRevisando(true) },
                negativo: { rotulo: 'Ver o plano', onClick: () => navigate('/planejamento') },
                contas:   { rotulo: 'Ver contas', onClick: () => {} },
                passou:   { rotulo: 'Ver no Radar', onClick: () => navigate('/radar') },
                ritmo:    { rotulo: 'Ver no Radar', onClick: () => navigate('/radar') },
              }} />
          </div>
        )}

        {/* 3 · O que vence, e se o saldo de hoje cobre */}
        {secao('Próximos 7 dias')}
        <ContasAPagarRapido deps={deps} saldoHoje={b.saldoHoje}
          vazio="Nenhuma conta vencendo nos próximos 7 dias." />

        {/* 4 · Onde estou saindo do plano */}
        {secao('Plano do mês')}
        {usaPlanoNoMes ? (
          <EstouradasCard estouradas={b.estouradas} perto={b.perto} categorias={categorias}
            onVerRadar={() => navigate('/radar')} />
        ) : (
          <div style={{ background: COR.branco, borderRadius: 12, padding: '16px', border: `.5px solid ${COR.borda}` }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: COR.texto }}>Sem plano para {mesNome.toLowerCase()}</div>
            <div style={{ fontSize: 13, color: COR.textoSuave, marginTop: 4, lineHeight: 1.45 }}>
              Com um plano, a Bússola diz quanto ainda dá para gastar e onde você está passando.
            </div>
            <button onClick={() => navigate('/planejamento')} style={{
              marginTop: 10, border: 'none', background: 'transparent', color: COR.azul, padding: 0,
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>Montar o plano →</button>
          </div>
        )}

        {/* A pergunta da hora da compra */}
        <button onClick={() => navigate('/posso-comprar')} style={{
          width: '100%', marginTop: 18, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
          background: COR.branco, border: `1px solid ${COR.borda}`, borderRadius: 14, padding: '14px 16px',
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          <span aria-hidden style={{ fontSize: 24 }}>🛒</span>
          <span style={{ flex: 1 }}>
            <b style={{ display: 'block', fontSize: 15, color: COR.texto }}>Posso comprar?</b>
            <span style={{ fontSize: 13, color: COR.textoSuave }}>Veja se uma compra cabe no plano antes de pagar</span>
          </span>
          <span aria-hidden style={{ color: COR.azul, fontWeight: 700 }}>→</span>
        </button>
      </div>

      {revisando && (
        <RevisaoPlanoDialog acima={b.lancadoAcima} deps={deps} planos={planos} setPlanos={setPlanos}
          categorias={categorias} onFechar={() => setRevisando(false)} />
      )}
      <BottomNav />
    </div>
  )
}
