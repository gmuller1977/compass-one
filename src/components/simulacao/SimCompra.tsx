import { useState, useMemo } from 'react'
import {
  AreaChart, Area, ReferenceLine, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useApp } from '../../context/AppContext'
import type { DadosMes, PlanoAnoData } from '../../context/AppContext'
import { COR } from '../../utils/cores'
import { parseValor } from '../../utils/moeda'
import { simularCompra, type PontoFluxo } from '../../utils/simulacaoCompra'
import type { Deps } from '../../utils/saldoConta'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho',
  'Agosto','Setembro','Outubro','Novembro','Dezembro']
const MESES_CURTOS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const rotulo = (p: { ano: number; mes: number }) => `${MESES_CURTOS[p.mes]}/${String(p.ano).slice(2)}`

const inputSt: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: `1px solid ${COR.borda}`,
  borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box', background: COR.branco, color: COR.texto,
}
const labelSt: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, color: COR.textoSuave,
  textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5,
}
const card: React.CSSProperties = {
  background: COR.branco, border: `.5px solid ${COR.borda}`, borderRadius: 12, padding: '20px 22px',
}

/**
 * "Posso comprar isso agora?"
 *
 * Ao contrário das outras duas abas, esta não é uma calculadora fechada: ela lê
 * o planejamento e os saldos reais e responde sobre o SEU dinheiro. Toda a
 * matemática vive em utils/simulacaoCompra — aqui só entra formulário e leitura.
 */
export default function SimCompra({ isMobile }: { isMobile: boolean }) {
  const { contas, categorias, planos, extratoData, faturaData, saldoInicialDinheiro } = useApp()
  const hoje = new Date()

  const [nome, setNome]         = useState('')
  const [valorStr, setValorStr] = useState('')
  const [parcelas, setParcelas] = useState('6')
  const [ondeId, setOndeId]     = useState('')          // '' = débito/PIX
  const [inicio, setInicio]     = useState(0)           // meses a partir de hoje
  const [pisoStr, setPisoStr]   = useState('')
  const [erro, setErro]         = useState('')
  const [pedido, setPedido]     = useState<{
    valorTotal: number; parcelas: number; cartaoId?: string
    ano: number; mes: number; piso: number
  } | null>(null)

  const cartoes = contas.filter(c => c.tipo === 'cartao')

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
    if (valor <= 0) return setErro('Informe o valor da compra')
    const n = parseInt(parcelas) || 1
    if (n < 1 || n > 60) return setErro('Entre 1 e 60 parcelas')
    const piso = pisoStr.trim() ? parseValor(pisoStr) : 0
    if (piso === null) return setErro(`"${pisoStr.trim()}" não é um valor`)

    const alvo = new Date(hoje.getFullYear(), hoje.getMonth() + inicio, 1)
    setErro('')
    setPedido({
      valorTotal: valor, parcelas: n,
      cartaoId: ondeId || undefined,
      ano: alvo.getFullYear(), mes: alvo.getMonth(),
      piso,
    })
  }

  // O gráfico para dois meses depois da última parcela: além disso é só a
  // projeção normal subindo, e não diz nada sobre a compra.
  const grafico = useMemo(() => {
    if (!resultado) return []
    const ultima = resultado.fluxo.reduce((a, b) => (b.parcela > 0 ? b : a), resultado.fluxo[0])
    const corte = resultado.fluxo.findIndex(p => p.ano === ultima.ano && p.mes === ultima.mes)
    return resultado.fluxo.slice(0, corte + 3)
  }, [resultado])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 700, color: COR.texto, marginBottom: 4 }}>
          O que você quer comprar
        </div>
        <div style={{ fontSize: 12, color: COR.textoSuave, marginBottom: 16 }}>
          A simulação usa o seu planejamento e os saldos reais das contas.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelSt}>O que é</label>
            <input value={nome} onChange={e => setNome(e.target.value)}
              placeholder="Ex: bicicleta, geladeira, notebook..." style={inputSt} />
          </div>

          <div>
            <label style={labelSt}>Valor total</label>
            <input value={valorStr} onChange={e => setValorStr(e.target.value)}
              placeholder="R$ 1.800,00" style={inputSt}
              onKeyDown={e => e.key === 'Enter' && simular()} />
          </div>

          <div>
            <label style={labelSt}>Parcelas</label>
            <select value={parcelas} onChange={e => setParcelas(e.target.value)} style={inputSt}>
              {[1,2,3,4,5,6,7,8,9,10,12,15,18,24].map(n => (
                <option key={n} value={n}>{n}x{
                  parseValor(valorStr) ? ` de ${fmt((parseValor(valorStr) ?? 0) / n)}` : ''
                }</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelSt}>Como vai pagar</label>
            <select value={ondeId} onChange={e => setOndeId(e.target.value)} style={inputSt}>
              <option value="">Débito ou PIX — sai no mês</option>
              {cartoes.map(c => (
                <option key={c.id} value={c.id}>{c.icone} {c.apelido || c.banco}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelSt}>Comprar em</label>
            <select value={inicio} onChange={e => setInicio(Number(e.target.value))} style={inputSt}>
              {Array.from({ length: 12 }, (_, i) => {
                const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1)
                return (
                  <option key={i} value={i}>
                    {MESES[d.getMonth()]}{d.getFullYear() !== hoje.getFullYear() ? ` ${d.getFullYear()}` : ''}
                    {i === 0 ? ' (este mês)' : ''}
                  </option>
                )
              })}
            </select>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelSt}>Reserva mínima <span style={{ textTransform: 'none', fontWeight: 400 }}>(opcional)</span></label>
            <input value={pisoStr} onChange={e => setPisoStr(e.target.value)}
              placeholder="R$ 0,00 — quanto você quer manter em caixa"
              style={inputSt} onKeyDown={e => e.key === 'Enter' && simular()} />
            <div style={{ fontSize: 11, color: COR.textoSuave, marginTop: 4 }}>
              Sem isso, "cabe" significa apenas não ficar negativo.
            </div>
          </div>
        </div>

        {erro && (
          <div style={{ background: COR.erroFundo, color: COR.erroTexto, borderRadius: 8,
            padding: '8px 12px', fontSize: 12, marginTop: 14 }}>⚠ {erro}</div>
        )}

        <button onClick={simular} style={{
          marginTop: 16, width: '100%', padding: 13, border: 'none', borderRadius: 10,
          background: `linear-gradient(135deg,${COR.azul},${COR.azulMedio})`,
          color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer',
          fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(26,86,219,.3)',
        }}>Simular</button>
      </div>

      {resultado && <Veredito nome={nome} r={resultado} grafico={grafico} isMobile={isMobile} />}
    </div>
  )
}

function Veredito({ nome, r, grafico, isMobile }: {
  nome: string
  r: ReturnType<typeof simularCompra>
  grafico: PontoFluxo[]
  isMobile: boolean
}) {
  const oQue = nome.trim() || 'A compra'
  const cor = r.cabe ? COR.sucessoTexto : COR.erroTexto
  const fundo = r.cabe ? COR.sucessoFundo : COR.erroFundo

  return (
    <>
      <div style={{ ...card, background: fundo, border: `1px solid ${cor}33` }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: cor }}>
          {r.cabe ? `${oQue} cabe.` : `${oQue} aperta demais.`}
        </div>
        <div style={{ fontSize: 13, color: COR.texto, marginTop: 6, lineHeight: 1.6 }}>
          O mês mais apertado é <b>{MESES[r.pior.mes]} de {r.pior.ano}</b>, fechando
          com <b>{fmt(r.pior.comCompra)}</b>
          {' '}— seriam {fmt(r.pior.semCompra)} sem a compra.
        </div>

        {!r.cabe && (r.adiarPara || r.parcelasQueCabem) && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {r.adiarPara && (
              <div style={{ fontSize: 13, color: COR.texto }}>
                🗓 Esperando até <b>{MESES[r.adiarPara.mes]} de {r.adiarPara.ano}</b>
                {' '}({r.adiarPara.meses} {r.adiarPara.meses === 1 ? 'mês' : 'meses'}), passa a caber.
              </div>
            )}
            {r.parcelasQueCabem && (
              <div style={{ fontSize: 13, color: COR.texto }}>
                💳 Na mesma data, cabe em <b>{r.parcelasQueCabem}x</b>.
              </div>
            )}
          </div>
        )}

        {!r.cabe && !r.adiarPara && !r.parcelasQueCabem && (
          <div style={{ fontSize: 13, color: COR.texto, marginTop: 12 }}>
            Não cabe adiando até um ano nem esticando até 24x. O caminho aqui é
            liberar espaço no planejamento, não mudar a data.
          </div>
        )}
      </div>

      {r.anosSemPlano.length > 0 && (
        <div style={{ ...card, background: COR.avisoFundo, border: `1px solid ${COR.avisoTexto}33`,
          fontSize: 12, color: COR.avisoTexto, lineHeight: 1.6 }}>
          ⚠ Não há planejamento cadastrado para {r.anosSemPlano.join(' e ')}. Nesses
          meses a projeção só conta o que já existe, então o saldo aparece mais
          alto do que provavelmente será.
        </div>
      )}

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 700, color: COR.texto, marginBottom: 4 }}>
          Saldo previsto, mês a mês
        </div>
        <div style={{ fontSize: 11, color: COR.textoSuave, marginBottom: 14 }}>
          A área escura é com a compra; a linha clara, sem ela.
        </div>
        <div style={{ height: isMobile ? 200 : 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={grafico.map(p => ({
              mes: rotulo(p), com: Math.round(p.comCompra), sem: Math.round(p.semCompra),
            }))} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COR.borda} />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: COR.textoSuave }} />
              <YAxis tick={{ fontSize: 10, fill: COR.textoSuave }} width={56} />
              <Tooltip
                formatter={(v, n) => [fmt(Number(v ?? 0)), n === 'com' ? 'Com a compra' : 'Sem a compra']}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${COR.borda}` }} />
              <ReferenceLine y={0} stroke={COR.erroTexto} strokeDasharray="4 4" />
              <Area type="monotone" dataKey="sem" stroke={COR.borda} fill={COR.borda} fillOpacity={.35} />
              <Area type="monotone" dataKey="com" stroke={COR.azul} fill={COR.azul} fillOpacity={.25} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 700, color: COR.texto, marginBottom: 12 }}>
          Mês a mês
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(70px,1fr) repeat(3,minmax(80px,1fr))',
          gap: '6px 10px', alignItems: 'center' }}>
          {['Mês', 'Sem a compra', 'Parcela', 'Com a compra'].map((h, i) => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: COR.textoSuave,
              textTransform: 'uppercase', letterSpacing: '.3px',
              textAlign: i === 0 ? 'left' : 'right' }}>{h}</div>
          ))}
          {grafico.map(p => {
            const critico = p.comCompra < 0
            return (
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
                  color: critico ? COR.erroTexto : COR.texto }}>{fmt(p.comCompra)}</div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
