import { useState, useMemo } from 'react'
import {
  AreaChart, Area, ReferenceLine, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useApp } from '../../context/AppContext'
import type { DadosMes, PlanoAnoData } from '../../context/AppContext'
import { COR } from '../../utils/cores'
import { parseValor } from '../../utils/moeda'
import { simularCompra, type PontoFluxo, type ResultadoCompra } from '../../utils/simulacaoCompra'
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
  const { contas, categorias, planos, extratoData, faturaData, saldoInicialDinheiro } = useApp()
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

  const deps: Deps = useMemo(() => ({
    extratoData: extratoData as Record<string, DadosMes>,
    faturaData: faturaData as Record<string, { lancamentos?: Record<number, { tipo: string; valor: number }[]> }>,
    contas, categorias,
    planos: planos as Record<number, PlanoAnoData | undefined>,
    saldoInicialDinheiro,
  }), [extratoData, faturaData, contas, categorias, planos, saldoInicialDinheiro])

  const resultado = useMemo(
    () => (pedido ? simularCompra(pedido, deps, { piso: pedido.piso, hoje }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pedido, deps],
  )

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
              return (
                <button key={n} onClick={() => setParcelas(n)} style={{
                  padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                  border: `1.5px solid ${ativo ? COR.azul : COR.borda}`,
                  background: ativo ? '#eff6ff' : COR.branco,
                  color: ativo ? COR.azul : COR.textoSuave,
                  fontSize: 13, fontWeight: ativo ? 700 : 500, transition: 'all .15s',
                }}>{n}x</button>
              )
            })}
          </div>
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
  const [detalhes, setDetalhes] = useState(false)
  const oQue = nome.trim() || 'a compra'

  // Só até dois meses depois da última parcela: daí em diante é a projeção
  // normal subindo, e não diz nada sobre a compra.
  const meses = useMemo(() => {
    const ultima = r.fluxo.reduce((a, b) => (b.parcela > 0 ? b : a), r.fluxo[0])
    const corte = r.fluxo.findIndex(p => p.ano === ultima.ano && p.mes === ultima.mes)
    return r.fluxo.slice(0, corte + 3)
  }, [r])

  const falta = piso - r.pior.comCompra

  return (
    <>
      <div style={{
        ...card,
        background: r.cabe ? COR.sucessoFundo : COR.erroFundo,
        border: `1px solid ${(r.cabe ? COR.sucessoTexto : COR.erroTexto)}33`,
      }}>
        <div style={{ fontSize: 17, fontWeight: 800,
          color: r.cabe ? COR.sucessoTexto : COR.erroTexto }}>
          {r.cabe ? `Sim, dá para comprar ${oQue}.` : `Assim não cabe.`}
        </div>

        <div style={{ fontSize: 14, color: COR.texto, marginTop: 10, lineHeight: 1.6 }}>
          {r.cabe ? (
            <>No mês mais apertado, <b>{MESES[r.pior.mes]}</b>, você ainda fica com</>
          ) : (
            <>Em <b>{MESES[r.pior.mes]}</b> ia faltar</>
          )}
        </div>
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-1px', marginTop: 2,
          color: r.cabe ? COR.sucessoTexto : COR.erroTexto }}>
          {fmt(r.cabe ? r.pior.comCompra : falta)}
        </div>

        {!r.cabe && (r.adiarPara || r.parcelasQueCabem) && (
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

        {!r.cabe && !r.adiarPara && !r.parcelasQueCabem && (
          <div style={{ fontSize: 14, color: COR.texto, marginTop: 16, lineHeight: 1.6 }}>
            Nem esperando um ano, nem dividindo em mais vezes. Para esta compra
            caber, o caminho é sobrar mais dinheiro por mês.
          </div>
        )}
      </div>

      {r.anosSemPlano.length > 0 && (
        <div style={{ ...card, background: COR.avisoFundo, border: `1px solid ${COR.avisoTexto}33`,
          fontSize: 13, color: COR.avisoTexto, lineHeight: 1.6 }}>
          ⚠ Você ainda não montou o planejamento de {r.anosSemPlano.join(' e ')}.
          Nesses meses a conta fica otimista demais, porque não sabe o que você
          vai gastar.
        </div>
      )}

      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 700, color: COR.texto, marginBottom: 3 }}>
          Como fica cada mês
        </div>
        <div style={{ fontSize: 12, color: COR.textoSuave, marginBottom: 16 }}>
          Quanto sobra na conta no fim do mês, já pagando as parcelas.
        </div>

        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
          {meses.map(p => {
            const s = situacao(p.comCompra, piso, valorParcela)
            return (
              <div key={`${p.ano}-${p.mes}`} style={{
                flex: '0 0 auto', minWidth: 78, textAlign: 'center',
                border: `1px solid ${COR.borda}`, borderRadius: 10, padding: '10px 8px',
                background: COR.branco,
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: COR.textoSuave }}>
                  {MESES_CURTOS[p.mes]}
                </div>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%', margin: '7px auto',
                  background: CORES[s].ponto,
                }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: CORES[s].texto,
                  fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(p.comCompra)}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 14,
          fontSize: 12, color: COR.textoSuave }}>
          {([['ok','tranquilo'],['apertado','apertado'],['falta','falta dinheiro']] as const).map(([s, txt]) => (
            <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: CORES[s].ponto }} />
              {txt}
            </span>
          ))}
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
