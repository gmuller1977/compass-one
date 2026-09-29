import {
  LineChart, Line, ReferenceLine, ReferenceDot, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { COR } from '../utils/cores'
import type { PontoEvolucao } from '../utils/evolucaoSaldo'

const MESES_CURTOS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
const rotulo = (p: { ano: number; mes: number }) => `${MESES_CURTOS[p.mes]}/${String(p.ano).slice(2)}`
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtEixo = (v: number) => Math.abs(v) >= 1000
  ? `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  : v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })

/**
 * O saldo mês a mês: linha CHEIA no passado (o que fechou de verdade) e
 * TRACEJADA do mês corrente em diante (o que se prevê). Os números saem de
 * evolucaoDoSaldo, que só emenda funções que já existem — ver lá.
 *
 * A tracejada começa no último ponto real, para as duas se tocarem: sem isso
 * haveria um vão entre o último fechamento e o previsto do mês corrente.
 *
 * Cores sobre o branco: linha COR.azul (#1a56db, 5,5:1), zero e pontos
 * negativos em COR.erroTexto (#b91c1c, 6,5:1), eixos COR.textoSuave (4,76:1).
 *
 * `alerta` é o aviso de pior mês que antes era uma faixa vermelha em cima do
 * gráfico (briefing da Início, onda 2): o PRIMEIRO mês negativo — onde agir —
 * e o PIOR, quando é outro, viram pontos vermelhos rotulados com o valor, e o
 * mês fica vermelho no eixo. Os dois vêm de piorMesDaSerie; nada é calculado
 * aqui. A informação não fica só na cor: o aria-label diz o mês e o valor.
 */
export type MarcoNegativo = { ano: number; mes: number; valor: number }

export default function EvolucaoSaldoGrafico({ pontos, altura, destaque, alerta }: {
  pontos: PontoEvolucao[]; altura: number
  /** O mês escolhido na Início, quando é futuro: ganha um anel em volta. */
  destaque?: { ano: number; mes: number }
  /** Primeiro mês negativo e pior mês da série — ver piorMesDaSerie. */
  alerta?: { primeiroNegativo: MarcoNegativo; pior: MarcoNegativo } | null
}) {
  const ultimoReal = pontos.map(p => p.real).lastIndexOf(true)
  const idxHoje = pontos.findIndex(p => !p.real)
  const idxDestaque = destaque ? pontos.findIndex(p => p.ano === destaque.ano && p.mes === destaque.mes) : -1
  const dados = pontos.map((p, i) => ({
    rotulo: rotulo(p),
    valor: p.valor,
    tipo: p.real ? 'Fechamento real' : i === idxHoje ? 'Previsto para o fim deste mês' : 'Previsto',
    real: p.real ? p.valor : null,
    previsto: !p.real || i === ultimoReal ? p.valor : null,
  }))

  // Os marcos: o primeiro negativo sempre; o pior só quando é outro mês.
  const mesmoMes = (a: { ano: number; mes: number }, b: { ano: number; mes: number }) => a.ano === b.ano && a.mes === b.mes
  const marcos = alerta
    ? [alerta.primeiroNegativo, ...(mesmoMes(alerta.pior, alerta.primeiroNegativo) ? [] : [alerta.pior])]
        .filter(m => pontos.some(p => mesmoMes(p, m)))
    : []
  const rotulosMarcados = new Set(marcos.map(m => rotulo(m)))
  // Onde vai o valor de cada marco. Embaixo do ponto, por padrão. Se os dois
  // marcos são meses vizinhos, os rótulos se atropelam — o primeiro vai para a
  // esquerda do ponto. O valor é sem centavos, como no mockup: é um aviso, e o
  // valor exato está no tooltip.
  const idxDe = (m: { ano: number; mes: number }) => pontos.findIndex(p => mesmoMes(p, m))
  const vizinhos = marcos.length === 2 && Math.abs(idxDe(marcos[0]) - idxDe(marcos[1])) === 1
  const noUltimo = marcos.some(m => idxDe(m) === pontos.length - 1)
  const idxMarcados = new Set(marcos.map(idxDe))
  const fmtMarco = (v: number) => `${v < 0 ? '−' : ''}R$ ${Math.abs(Math.round(v)).toLocaleString('pt-BR')}`

  // Folga embaixo quando há marco: o valor escrito sob o ponto mais baixo não
  // pode cair em cima dos meses do eixo.
  const vals = pontos.map(p => p.valor)
  const minV = Math.min(0, ...vals), maxV = Math.max(0, ...vals)
  const folga = marcos.length ? (maxV - minV || 1) * 0.18 : 0

  const nomeMes = (m: { ano: number; mes: number }) => `${MESES[m.mes]} de ${m.ano}`
  const aria = pontos.length
    ? `Saldo de ${nomeMes(pontos[0])} a ${nomeMes(pontos[pontos.length - 1])}.`
      + (alerta && marcos.length ? ` ${nomeMes(alerta.primeiroNegativo).replace(/^./, c => c.toUpperCase())} fica negativo em ${fmt(Math.abs(alerta.primeiroNegativo.valor))}.`
        + (mesmoMes(alerta.pior, alerta.primeiroNegativo) ? '' : ` O pior mês é ${nomeMes(alerta.pior)}, negativo em ${fmt(Math.abs(alerta.pior.valor))}.`) : '')
    : 'Saldo mês a mês.'

  return (
    <div style={{ height: altura }} role="img" aria-label={aria}>
      <ResponsiveContainer width="100%" height="100%">
        {/* Com marco no último mês, a margem direita abre espaço para o valor. */}
        <LineChart data={dados} margin={{ top: 8, right: noUltimo ? 36 : 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COR.borda} vertical={false} />
          <XAxis dataKey="rotulo" tickLine={false} interval="preserveStartEnd"
            tick={(t: { x?: number | string; y?: number | string; payload?: { value?: unknown } }) => {
              const texto = String(t.payload?.value ?? '')
              const marcado = rotulosMarcados.has(texto)
              return (
                <text x={Number(t.x ?? 0)} y={Number(t.y ?? 0) + 4} dy={8} textAnchor="middle" fontSize={11}
                  fill={marcado ? COR.erroTexto : COR.textoSuave} fontWeight={marcado ? 600 : 400}>
                  {texto}
                </text>
              )
            }} />
          <YAxis tick={{ fontSize: 11, fill: COR.textoSuave }} width={56} tickFormatter={fmtEixo}
            axisLine={false} tickLine={false}
            domain={folga ? [minV - folga, 'auto'] : ['auto', 'auto']} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload as (typeof dados)[number]
              return (
                <div style={{ background: '#fff', border: `1px solid ${COR.borda}`, borderRadius: 8,
                  padding: '8px 12px', fontSize: 12, boxShadow: '0 4px 14px rgba(15,23,42,.08)' }}>
                  <div style={{ fontWeight: 700, color: COR.texto }}>{d.rotulo}</div>
                  <div style={{ color: d.valor < 0 ? COR.erroTexto : COR.texto, fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{fmt(d.valor)}</div>
                  <div style={{ color: COR.textoSuave, marginTop: 2 }}>{d.tipo}</div>
                </div>
              )
            }} />
          <ReferenceLine y={0} stroke={COR.erroTexto} strokeDasharray="4 4" />
          {idxHoje >= 0 && (
            <ReferenceLine x={dados[idxHoje].rotulo} stroke={COR.textoSuave} strokeDasharray="2 3"
              label={{ value: 'hoje', position: 'insideTopRight', fontSize: 11, fill: COR.textoSuave }} />
          )}
          <Line type="monotone" dataKey="real" stroke={COR.azul} strokeWidth={2.5}
            dot={ponto(COR.azul, true, idxMarcados)} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="previsto" stroke={COR.azul} strokeWidth={2.5} strokeDasharray="6 5"
            dot={ponto(COR.azul, false, new Set([ultimoReal, ...idxMarcados]))} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />
          {idxDestaque >= 0 && (
            <ReferenceDot x={dados[idxDestaque].rotulo} y={dados[idxDestaque].valor} r={9}
              fill="none" stroke={dados[idxDestaque].valor < 0 ? COR.erroTexto : COR.azul} strokeWidth={2} />
          )}
          {/* Depois das linhas, para ficarem por cima. Anel branco: o ponto se
              separa da linha azul e do tracejado que passam por ele. */}
          {marcos.map((m, i) => (
            <ReferenceDot key={`m${m.ano}-${m.mes}`} x={rotulo(m)} y={m.valor} r={5.5}
              fill={COR.erroTexto} stroke="#fff" strokeWidth={2.5}
              label={{ value: fmtMarco(m.valor), position: vizinhos && i === 0 && idxDe(m) < idxDe(marcos[1]) ? 'left' : 'bottom',
                offset: 9, fill: COR.erroTexto, fontSize: 11.5, fontWeight: 700 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// Ponto cheio no real, vazado no previsto; vermelho quando o saldo é negativo.
// O último real está nas duas linhas: a tracejada não o redesenha por cima. E
// nos meses marcados não há ponto comum: no recharts 3 os pontos da linha
// ficam numa camada ACIMA dos ReferenceDot, e o vazado cobria o marco.
function ponto(cor: string, cheio: boolean, pular: Set<number>) {
  return (props: { cx?: number; cy?: number; value?: number | null; index?: number }) => {
    const { cx, cy, value, index } = props
    if (cx == null || cy == null || value == null || (index != null && pular.has(index))) return <g key={`v${index}`} />
    const c = value < 0 ? COR.erroTexto : cor
    return <circle key={`p${index}`} cx={cx} cy={cy} r={3.5} stroke={c} strokeWidth={2} fill={cheio ? c : '#fff'} />
  }
}
