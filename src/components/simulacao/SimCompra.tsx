import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, ReferenceLine, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useApp } from '../../context/AppContext'
import type { DadosMes, PlanoAnoData } from '../../context/AppContext'
import { COR } from '../../utils/cores'
import { parseValor } from '../../utils/moeda'
import {
  simularCompra, fimDoPlanejamento, parcelasQueOPlanoCobre, diagnosticar,
  type PontoFluxo, type ResultadoCompra,
} from '../../utils/simulacaoCompra'
import type { Deps } from '../../utils/saldoConta'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho',
  'Agosto','Setembro','Outubro','Novembro','Dezembro']
const MESES_CURTOS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const PARCELAS_COMUNS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 18, 24]

const inputSt: React.CSSProperties = {
  width: '100%', padding: '11px 14px', border: `1px solid ${COR.borda}`,
  borderRadius: 10, fontSize: 15, fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box', background: COR.branco, color: COR.texto,
}
const labelSt: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: COR.texto, marginBottom: 7,
}
const card: React.CSSProperties = {
  background: COR.branco, border: `.5px solid ${COR.borda}`, borderRadius: 12, padding: '20px 22px',
}

/**
 * "Posso comprar isso?"
 *
 * Ao contrário das outras duas abas, esta lê o planejamento e os saldos reais e
 * responde sobre o dinheiro do usuário. Toda a matemática vive em
 * utils/simulacaoCompra — aqui só entra formulário e leitura.
 *
 * A tela é escrita para quem não entende de finanças. Por isso: uma pergunta
 * por vez, a resposta em uma frase e UM número grande, os meses como
 * semáforo, e a planilha só para quem pedir. A primeira versão empilhava
 * veredito, gráfico e tabela de quatro colunas — tudo correto e ilegível.
 */
export default function SimCompra({ isMobile }: { isMobile: boolean }) {
  const { contas, categorias, planos, extratoData, faturaData, saldoInicialDinheiro, cenarioPrevisao } = useApp()
  const navigate = useNavigate()
  const hoje = new Date()

  const [nome, setNome]         = useState('')
  const [valorStr, setValorStr] = useState('')
  const [parcelas, setParcelas] = useState(6)
  const [ondeId, setOndeId]     = useState('')          // '' = débito/PIX
  const [inicio, setInicio]     = useState(0)           // meses a partir de hoje
  const [guardarStr, setGuardar] = useState('')
  const [maisOpcoes, setMaisOpcoes] = useState(false)
  const [erro, setErro]         = useState('')
  const [pedido, setPedido]     = useState<{
    valorTotal: number; parcelas: number; cartaoId?: string
    ano: number; mes: number; piso: number
  } | null>(null)

  const cartoes = contas.filter(c => c.tipo === 'cartao')
  const valorNum = parseValor(valorStr) ?? 0

  // O planejamento e o horizonte: nada aqui extrapola. Comprar mais tarde ou
  // no cartao que vence antes de fechar come meses desse teto.
  const inicioCompra = new Date(hoje.getFullYear(), hoje.getMonth() + inicio, 1)
  const fimDoPlano = useMemo(
    () => fimDoPlanejamento(planos as Record<number, PlanoAnoData | undefined>),
    [planos],
  )
  const tetoParcelas = useMemo(
    () => parcelasQueOPlanoCobre(
      planos as Record<number, PlanoAnoData | undefined>,
      { ano: inicioCompra.getFullYear(), mes: inicioCompra.getMonth(), cartaoId: ondeId || undefined },
      contas,
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [planos, contas, ondeId, inicio],
  )

  const deps: Deps = useMemo(() => ({
    extratoData: extratoData as Record<string, DadosMes>,
    faturaData: faturaData as Record<string, { lancamentos?: Record<number, { tipo: string; valor: number }[]> }>,
    contas, categorias,
    planos: planos as Record<number, PlanoAnoData | undefined>,
    saldoInicialDinheiro, cenarioPrevisao,
  }), [extratoData, faturaData, contas, categorias, planos, saldoInicialDinheiro, cenarioPrevisao])

  const resultado = useMemo(
    () => (pedido ? simularCompra(pedido, deps, { piso: pedido.piso, hoje }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pedido, deps],
  )

  // Trocar de cartao ou adiar a compra pode derrubar o teto abaixo do que ja
  // estava escolhido. Sem isto o botao ficaria selecionado e desabilitado.
  useEffect(() => {
    if (tetoParcelas > 0 && parcelas > tetoParcelas) {
      setParcelas([...PARCELAS_COMUNS].reverse().find(n => n <= tetoParcelas) ?? 1)
    }
  }, [tetoParcelas, parcelas])

  function simular() {
    const valor = parseValor(valorStr)
    if (valor === null) return setErro(`"${valorStr.trim()}" não é um valor`)
    if (valor <= 0) return setErro('Quanto custa? Preencha o valor.')
    const guardar = guardarStr.trim() ? parseValor(guardarStr) : 0
    if (guardar === null) return setErro(`"${guardarStr.trim()}" não é um valor`)

    const alvo = new Date(hoje.getFullYear(), hoje.getMonth() + inicio, 1)
    setErro('')
    setPedido({
      valorTotal: valor, parcelas,
      cartaoId: ondeId || undefined,
      ano: alvo.getFullYear(), mes: alvo.getMonth(),
      piso: guardar,
    })
  }

  // Sem nada planejado nao ha o que simular, e inventar seria pior do que nao
  // responder. O convite e a unica coisa util aqui.
  if (!fimDoPlano) {
    return (
      <div style={{ ...card, textAlign: 'center', padding: '36px 24px' }}>
        <div style={{ fontSize: 34 }}>🗓</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: COR.texto, marginTop: 10 }}>
          Antes, monte o seu planejamento
        </div>
        <div style={{ fontSize: 14, color: COR.textoSuave, marginTop: 8,
          lineHeight: 1.6, maxWidth: 420, margin: '8px auto 0' }}>
          Para dizer se uma compra cabe, a conta precisa saber o que entra e o
          que sai nos seus próximos meses. Sem isso, qualquer resposta seria
          chute.
        </div>
        <button onClick={() => navigate('/planejamento')} style={{
          marginTop: 20, padding: '12px 22px', border: 'none', borderRadius: 10,
          background: `linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,
          color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer',
          fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(26,86,219,.3)',
        }}>Montar meu planejamento</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: 16 }}>
          <div>
            <label style={labelSt}>O que você quer comprar?</label>
            <input value={nome} onChange={e => setNome(e.target.value)}
              placeholder="Uma bicicleta" style={inputSt} />
          </div>
          <div>
            <label style={labelSt}>Quanto custa?</label>
            <input value={valorStr} onChange={e => setValorStr(e.target.value)}
              placeholder="R$ 1.800,00" style={inputSt}
              onKeyDown={e => e.key === 'Enter' && simular()} />
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <label style={labelSt}>Em quantas vezes?</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PARCELAS_COMUNS.map(n => {
              const ativo = parcelas === n
              const fora = n > tetoParcelas
              return (
                <button key={n} disabled={fora} onClick={() => setParcelas(n)}
                  title={fora ? 'Seu planejamento não alcança tantos meses' : undefined}
                  style={{
                    padding: '8px 14px', borderRadius: 8, fontFamily: 'inherit',
                    cursor: fora ? 'not-allowed' : 'pointer',
                    border: `1.5px solid ${ativo ? COR.azul : COR.borda}`,
                    background: ativo ? '#eff6ff' : COR.branco,
                    color: fora ? COR.borda : ativo ? COR.azul : COR.textoSuave,
                    fontSize: 13, fontWeight: ativo ? 700 : 500, transition: 'all .15s',
                  }}>{n}x</button>
              )
            })}
          </div>
          {fimDoPlano && (
            <div style={{ fontSize: 12, color: COR.textoSuave, marginTop: 8, lineHeight: 1.5 }}>
              Seu planejamento vai até <b>{MESES[fimDoPlano.mes].toLowerCase()} de {fimDoPlano.ano}</b>,
              então dá para simular até <b>{tetoParcelas}x</b>.{' '}
              <button onClick={() => navigate(`/planejamento?ano=${fimDoPlano.ano + 1}`)} style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 12, color: COR.azul, fontWeight: 600,
                textDecoration: 'underline',
              }}>Planejar mais meses</button> para ir além.
            </div>
          )}
          {valorNum > 0 && (
            <div style={{ fontSize: 20, fontWeight: 800, color: COR.azul, marginTop: 12,
              letterSpacing: '-.4px' }}>
              {parcelas}× de {fmt(valorNum / parcelas)}
              <span style={{ fontSize: 13, fontWeight: 500, color: COR.textoSuave, marginLeft: 8 }}>
                por mês
              </span>
            </div>
          )}
        </div>

        <div style={{ marginTop: 18 }}>
          <label style={labelSt}>Como você vai pagar?</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {[{ id: '', rotulo: '💰 Débito ou Pix' },
              ...cartoes.map(c => ({ id: c.id, rotulo: `${c.icone} ${c.apelido || c.banco}` }))
            ].map(op => {
              const ativo = ondeId === op.id
              return (
                <button key={op.id || 'debito'} onClick={() => setOndeId(op.id)} style={{
                  padding: '9px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                  border: `1.5px solid ${ativo ? COR.azul : COR.borda}`,
                  background: ativo ? '#eff6ff' : COR.branco,
                  color: ativo ? COR.azul : COR.textoSuave,
                  fontSize: 13, fontWeight: ativo ? 700 : 500, transition: 'all .15s',
                }}>{op.rotulo}</button>
              )
            })}
          </div>
        </div>

        <button onClick={() => setMaisOpcoes(v => !v)} style={{
          marginTop: 18, background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 13, color: COR.azul, fontWeight: 600,
        }}>
          {maisOpcoes ? '▾' : '▸'} Mais opções
        </button>

        {maisOpcoes && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: 16, marginTop: 14, paddingTop: 16, borderTop: `1px solid ${COR.bordaSuave}` }}>
            <div>
              <label style={labelSt}>Quando você vai comprar?</label>
              <select value={inicio} onChange={e => setInicio(Number(e.target.value))} style={inputSt}>
                {Array.from({ length: 12 }, (_, i) => {
                  const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1)
                  return (
                    <option key={i} value={i}>
                      {i === 0 ? 'Agora' : `Em ${MESES[d.getMonth()]}`}
                      {d.getFullYear() !== hoje.getFullYear() ? ` de ${d.getFullYear()}` : ''}
                    </option>
                  )
                })}
              </select>
            </div>
            <div>
              <label style={labelSt}>Quer deixar um dinheiro guardado?</label>
              <input value={guardarStr} onChange={e => setGuardar(e.target.value)}
                placeholder="R$ 0,00" style={inputSt}
                onKeyDown={e => e.key === 'Enter' && simular()} />
              <div style={{ fontSize: 12, color: COR.textoSuave, marginTop: 6, lineHeight: 1.5 }}>
                Um valor que você não quer encostar. Sem isso, a conta só evita
                ficar no vermelho.
              </div>
            </div>
          </div>
        )}

        {erro && (
          <div style={{ background: COR.erroFundo, color: COR.erroTexto, borderRadius: 8,
            padding: '9px 13px', fontSize: 13, marginTop: 16 }}>⚠ {erro}</div>
        )}

        <button onClick={simular} style={{
          marginTop: 18, width: '100%', padding: 14, border: 'none', borderRadius: 10,
          background: `linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,
          color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer',
          fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(26,86,219,.3)',
        }}>Ver se cabe no meu bolso</button>
      </div>

      {resultado && pedido && (
        <Resposta
          nome={nome} r={resultado} isMobile={isMobile}
          piso={pedido.piso}
          valorTotal={pedido.valorTotal} parcelas={pedido.parcelas}
        />
      )}
    </div>
  )
}

// ── Resposta ────────────────────────────────────────────────────────────

type Situacao = 'ok' | 'apertado' | 'falta'

/**
 * O semáforo de um mês.
 *
 * "Apertado" é estar a menos de uma parcela do limite: mais um mês como esse e
 * fura. É um corte explicável, que é o que importa para quem vai ler o
 * amarelo e decidir alguma coisa.
 */
function situacao(saldo: number, piso: number, parcela: number): Situacao {
  if (saldo < piso) return 'falta'
  if (saldo < piso + parcela) return 'apertado'
  return 'ok'
}

/** O tom do cartao de resposta. Fundo e texto medidos em par, ver CLAUDE.md. */
const TOM = {
  ok:      { fundo: COR.sucessoFundo, texto: COR.sucessoTexto },
  atencao: { fundo: COR.avisoFundo,   texto: COR.avisoTexto },
  nao:     { fundo: COR.erroFundo,    texto: COR.erroTexto },
} as const

const CORES: Record<Situacao, { ponto: string; texto: string }> = {
  ok:       { ponto: '#16a34a', texto: COR.sucessoTexto },
  apertado: { ponto: '#f59e0b', texto: COR.avisoTexto },
  falta:    { ponto: '#dc2626', texto: COR.erroTexto },
}

function Resposta({ nome, r, isMobile, piso, valorTotal, parcelas }: {
  nome: string
  r: ResultadoCompra
  isMobile: boolean
  piso: number
  valorTotal: number
  parcelas: number
}) {
  const valorParcela = valorTotal / parcelas
  const navigate = useNavigate()
  const [detalhes, setDetalhes] = useState(false)
  const oQue = nome.trim()

  // Só até dois meses depois da última parcela: daí em diante é a projeção
  // normal subindo, e não diz nada sobre a compra.
  // O fluxo inteiro, sem aparar. Ele ja vai do mes corrente ate o fim do
  // planejamento — a janela que faz sentido. Havia um corte em "ultima parcela
  // mais dois meses", herdado de quando o fluxo ia 38 meses adiante; com o
  // fluxo limitado pelo plano, ele so escondia meses reais. Numa compra a
  // vista em setembro, com plano ate dezembro, a tira parava em novembro e o
  // placar dizia novembro no lugar de dezembro.
  const meses = r.fluxo

  const d = diagnosticar(r, piso, valorParcela)
  const aperto = r.primeiroAperto ?? r.pior
  const nMeses = (n: number) => `${n} ${n === 1 ? 'mês' : 'meses'}`

  const titulo = {
    'folgado':             oQue ? `Sim, dá para comprar ${oQue}.` : 'Sim, dá para comprar.',
    'no-limite':           'Dá, mas fica no limite.',
    'mexe-na-reserva':     'Dá, mas mexe no seu dinheiro guardado.',
    'vermelho-passageiro': 'Aperta, mas você se recupera.',
    'vermelho-ate-o-fim':  'Assim não dá.',
  }[d.caso]

  // O numero grande responde a pergunta de cada caso: onde se chega, quando
  // cabe; quanto falta, quando nao cabe.
  const destaque = d.gravidade === 'nao'
    ? { rotulo: <>Já em <b>{MESES[aperto.mes].toLowerCase()}</b> ia faltar</>,
        valor: piso - aperto.comCompra }
    : { rotulo: <>No fim de <b>{MESES[d.fim.mes].toLowerCase()}</b> você fica com</>,
        valor: d.fim.comCompra }

  const explicacao = {
    'folgado': d.pior !== d.fim
      ? <>O mês mais apertado é <b>{MESES[d.pior.mes].toLowerCase()}</b>, com <b>{fmt(d.pior.comCompra)}</b>.</>
      : <>Todos os meses ficam tranquilos.</>,
    'no-limite':
      <>Em <b>{MESES[d.pior.mes].toLowerCase()}</b> sobra pouco: <b>{fmt(d.pior.comCompra)}</b>.
        Qualquer imprevisto nesse mês aperta.</>,
    'mexe-na-reserva':
      <>Em {nMeses(d.abaixo.length)} você fica abaixo dos <b>{fmt(piso)}</b> que
        queria manter guardados — o menor é <b>{fmt(d.pior.comCompra)}</b>. Dinheiro
        na conta não falta.</>,
    'vermelho-passageiro':
      <>{nMeses(d.negativos.length)} no vermelho, o pior em <b>{MESES[d.pior.mes].toLowerCase()}</b> com{' '}
        <b>{fmt(d.pior.comCompra)}</b>. Depois você volta ao azul.</>,
    'vermelho-ate-o-fim':
      <>A partir de <b>{MESES[aperto.mes].toLowerCase()}</b> o saldo não se
        recupera: em <b>{MESES[d.fim.mes].toLowerCase()}</b> você ainda estaria
        com <b>{fmt(d.fim.comCompra)}</b>.</>,
  }[d.caso]

  return (
    <>
      <div style={{
        ...card,
        background: TOM[d.gravidade].fundo,
        border: `1px solid ${TOM[d.gravidade].texto}33`,
      }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: TOM[d.gravidade].texto }}>
          {titulo}
        </div>

        <div style={{ fontSize: 14, color: COR.texto, marginTop: 10, lineHeight: 1.6 }}>
          {destaque.rotulo}
        </div>
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-1px', marginTop: 2,
          color: TOM[d.gravidade].texto }}>
          {fmt(destaque.valor)}
        </div>

        <div style={{ fontSize: 13, color: COR.texto, marginTop: 8, lineHeight: 1.6 }}>
          {explicacao}
        </div>

        {/* O mes ja seria ruim sem a compra. Muda a conversa: o problema nao e
            o que se quer comprar, e o mes. */}
        {d.apertoPreexistente && (
          <div style={{ fontSize: 13, color: COR.texto, marginTop: 8, lineHeight: 1.6 }}>
            Vale notar: <b>{MESES[d.abaixo[0].mes].toLowerCase()}</b> já ficaria
            apertado mesmo sem essa compra.
          </div>
        )}

        {d.gravidade !== 'ok' && (r.adiarPara || r.parcelasQueCabem) && (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: COR.texto, marginBottom: 8 }}>
              O que dá para fazer:
            </div>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 8 }}>
              {r.adiarPara && (
                <Saida
                  icone="🗓"
                  titulo={`Esperar até ${MESES[r.adiarPara.mes]}`}
                  detalhe={`${r.adiarPara.meses} ${r.adiarPara.meses === 1 ? 'mês a mais' : 'meses a mais'} — aí cabe do jeito que você quer`}
                />
              )}
              {r.parcelasQueCabem && (
                <Saida
                  icone="💳"
                  titulo={`Comprar agora em ${r.parcelasQueCabem}x`}
                  detalhe={`${fmt(valorTotal / r.parcelasQueCabem)} por mês em vez de ${fmt(valorParcela)}`}
                />
              )}
            </div>
          </div>
        )}

        {d.gravidade === 'nao' && !r.adiarPara && !r.parcelasQueCabem && (
          <div style={{ fontSize: 14, color: COR.texto, marginTop: 16, lineHeight: 1.6 }}>
            {r.limitadoPeloPlano
              ? 'Dentro do que você já planejou não há saída — nem esperando, nem dividindo em mais vezes.'
              : 'Nem esperando um ano, nem dividindo em mais vezes. Para esta compra caber, o caminho é sobrar mais dinheiro por mês.'}
          </div>
        )}
      </div>

      {r.limitadoPeloPlano && (
        <div style={{ ...card, background: COR.avisoFundo, border: `1px solid ${COR.avisoTexto}33` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COR.avisoTexto }}>
            Só dá para olhar até {MESES[r.fimDoPlano.mes].toLowerCase()} de {r.fimDoPlano.ano}
          </div>
          <div style={{ fontSize: 13, color: COR.avisoTexto, marginTop: 6, lineHeight: 1.6 }}>
            Seu planejamento termina aí. Pode haver uma saída depois disso — mais
            meses para pagar, ou comprar mais tarde —, mas a conta não tem como
            saber o que entra e o que sai nesses meses, e chutar seria pior do
            que não responder.
          </div>
          <button onClick={() => navigate(`/planejamento?ano=${r.fimDoPlano.ano + 1}`)} style={{
            marginTop: 12, padding: '9px 16px', borderRadius: 8, cursor: 'pointer',
            border: `1.5px solid ${COR.avisoTexto}55`, background: COR.branco,
            color: COR.avisoTexto, fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
          }}>
            Planejar mais meses →
          </button>
        </div>
      )}

      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 700, color: COR.texto, marginBottom: 3 }}>
          Mês a mês, antes e depois
        </div>
        <div style={{ fontSize: 12, color: COR.textoSuave, marginBottom: 16 }}>
          Em cima, o que sobraria sem a compra. Embaixo, já pagando as parcelas.
        </div>

        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
          {meses.map(p => {
            const s = situacao(p.comCompra, piso, valorParcela)
            return (
              <div key={`${p.ano}-${p.mes}`} style={{
                flex: '0 0 auto', minWidth: 88, textAlign: 'center',
                border: `1px solid ${COR.borda}`, borderRadius: 10, padding: '10px 8px',
                background: COR.branco,
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: COR.textoSuave }}>
                  {MESES_CURTOS[p.mes]}
                </div>
                <div style={{ fontSize: 11, color: COR.textoSuave, marginTop: 6,
                  fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(p.semCompra)}
                </div>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%', margin: '5px auto',
                  background: CORES[s].ponto,
                }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: CORES[s].texto,
                  fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(p.comCompra)}
                </div>
              </div>
            )
          })}
        </div>

        <Fechamento meses={meses} isMobile={isMobile} />

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 14,
          fontSize: 12, color: COR.textoSuave }}>
          {([['ok','tranquilo'],['apertado','apertado'],['falta','falta dinheiro']] as const).map(([s, txt]) => (
            <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: CORES[s].ponto }} />
              {txt}
            </span>
          ))}
          <span>o semáforo olha o número de baixo</span>
        </div>

        <button onClick={() => setDetalhes(v => !v)} style={{
          marginTop: 16, background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 13, color: COR.azul, fontWeight: 600,
        }}>
          {detalhes ? '▾ Esconder os números' : '▸ Ver os números em detalhe'}
        </button>

        {detalhes && <Detalhes meses={meses} isMobile={isMobile} />}
      </div>
    </>
  )
}

/**
 * O placar do fim do periodo: onde voce chega com e sem a compra.
 *
 * A diferenca e o quanto da compra ja foi pago ate ali — nao o preco dela,
 * quando o planejamento acaba antes da ultima parcela. Por isso o rotulo fala
 * do periodo, e nao da compra.
 */
function Fechamento({ meses, isMobile }: { meses: PontoFluxo[]; isMobile: boolean }) {
  const fim = meses[meses.length - 1]
  if (!fim) return null
  const diferenca = fim.semCompra - fim.comCompra

  const celula: React.CSSProperties = {
    flex: 1, textAlign: 'center', padding: '10px 8px',
  }
  const rotulo: React.CSSProperties = {
    fontSize: 11, color: COR.textoSuave, marginBottom: 4,
  }
  const valor: React.CSSProperties = {
    fontSize: isMobile ? 15 : 17, fontWeight: 800,
    fontVariantNumeric: 'tabular-nums', letterSpacing: '-.3px',
  }

  return (
    <div style={{ marginTop: 16, border: `1px solid ${COR.borda}`, borderRadius: 10,
      background: COR.fundo, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <div style={celula}>
          <div style={rotulo}>Sem a compra</div>
          <div style={{ ...valor, color: COR.textoSuave }}>{fmt(fim.semCompra)}</div>
        </div>
        <div style={{ width: 1, background: COR.borda }} />
        <div style={celula}>
          <div style={rotulo}>Comprando</div>
          <div style={{ ...valor, color: fim.comCompra < 0 ? COR.erroTexto : COR.texto }}>
            {fmt(fim.comCompra)}
          </div>
        </div>
        <div style={{ width: 1, background: COR.borda }} />
        <div style={celula}>
          <div style={rotulo}>Diferença</div>
          <div style={{ ...valor, color: COR.erroTexto }}>− {fmt(diferenca)}</div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: COR.textoSuave, textAlign: 'center',
        padding: '0 8px 10px' }}>
        onde você chega em {MESES[fim.mes].toLowerCase()} de {fim.ano}
      </div>
    </div>
  )
}

function Saida({ icone, titulo, detalhe }: { icone: string; titulo: string; detalhe: string }) {
  return (
    <div style={{
      flex: 1, background: COR.branco, border: `1px solid ${COR.borda}`,
      borderRadius: 10, padding: '12px 14px',
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: COR.texto }}>
        {icone} {titulo}
      </div>
      {detalhe && (
        <div style={{ fontSize: 12, color: COR.textoSuave, marginTop: 4, lineHeight: 1.5 }}>
          {detalhe}
        </div>
      )}
    </div>
  )
}

function Detalhes({ meses, isMobile }: { meses: PontoFluxo[]; isMobile: boolean }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ height: isMobile ? 190 : 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={meses.map(p => ({
            mes: MESES_CURTOS[p.mes], com: Math.round(p.comCompra), sem: Math.round(p.semCompra),
          }))} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={COR.borda} />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: COR.textoSuave }} />
            <YAxis tick={{ fontSize: 11, fill: COR.textoSuave }} width={60} />
            <Tooltip
              formatter={(v, n) => [fmt(Number(v ?? 0)), n === 'com' ? 'Comprando' : 'Sem comprar']}
              contentStyle={{ fontSize: 13, borderRadius: 8, border: `1px solid ${COR.borda}` }} />
            <ReferenceLine y={0} stroke={COR.erroTexto} strokeDasharray="4 4" />
            <Area type="monotone" dataKey="sem" stroke="#94a3b8" fill="#94a3b8" fillOpacity={.18} />
            <Area type="monotone" dataKey="com" stroke={COR.azul} fill={COR.azul} fillOpacity={.28} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 6, marginBottom: 16,
        fontSize: 12, color: COR.textoSuave }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: COR.azul, opacity: .6 }} />
          comprando
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#94a3b8', opacity: .5 }} />
          sem comprar
        </span>
      </div>

      <div style={{ display: 'grid',
        gridTemplateColumns: 'minmax(60px,1fr) repeat(3,minmax(78px,1fr))',
        gap: '6px 10px', alignItems: 'center' }}>
        {['Mês', 'Sem comprar', 'Parcela', 'Sobra'].map((h, i) => (
          <div key={h} style={{ fontSize: 10, fontWeight: 700, color: COR.textoSuave,
            textTransform: 'uppercase', letterSpacing: '.3px',
            textAlign: i === 0 ? 'left' : 'right' }}>{h}</div>
        ))}
        {meses.map(p => (
          <div key={`${p.ano}-${p.mes}`} style={{ display: 'contents' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: COR.texto }}>
              {MESES_CURTOS[p.mes]}/{String(p.ano).slice(2)}
            </div>
            <div style={{ fontSize: 12, textAlign: 'right', color: COR.textoSuave,
              fontVariantNumeric: 'tabular-nums' }}>{fmt(p.semCompra)}</div>
            <div style={{ fontSize: 12, textAlign: 'right', fontVariantNumeric: 'tabular-nums',
              color: p.parcela > 0 ? COR.erroTexto : COR.textoSuave }}>
              {p.parcela > 0 ? `− ${fmt(p.parcela)}` : '—'}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
              color: p.comCompra < 0 ? COR.erroTexto : COR.texto }}>{fmt(p.comCompra)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
