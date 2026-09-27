import {
  LineChart, Line, ReferenceLine, ReferenceDot, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { COR } from '../utils/cores'
import type { PontoEvolucao } from '../utils/evolucaoSaldo'

const MESES_CURTOS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
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
 */
export default function EvolucaoSaldoGrafico({ pontos, altura, destaque }: {
  pontos: PontoEvolucao[]; altura: number
  /** O mês escolhido na Início, quando é futuro: ganha um anel em volta. */
  destaque?: { ano: number; mes: number }
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

  return (
    <div style={{ height: altura }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={dados} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COR.borda} vertical={false} />
          <XAxis dataKey="rotulo" tick={{ fontSize: 11, fill: COR.textoSuave }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: COR.textoSuave }} width={56} tickFormatter={fmtEixo}
            axisLine={false} tickLine={false} />
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
          {idxDestaque >= 0 && (
            <ReferenceDot x={dados[idxDestaque].rotulo} y={dados[idxDestaque].valor} r={9}
              fill="none" stroke={dados[idxDestaque].valor < 0 ? COR.erroTexto : COR.azul} strokeWidth={2} />
          )}
          <Line type="monotone" dataKey="real" stroke={COR.azul} strokeWidth={2.5}
            dot={ponto(COR.azul, true)} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="previsto" stroke={COR.azul} strokeWidth={2.5} strokeDasharray="6 5"
            dot={ponto(COR.azul, false, ultimoReal)} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// Ponto cheio no real, vazado no previsto; vermelho quando o saldo é negativo.
// O último real está nas duas linhas: a tracejada não o redesenha por cima.
function ponto(cor: string, cheio: boolean, pular = -1) {
  return (props: { cx?: number; cy?: number; value?: number | null; index?: number }) => {
    const { cx, cy, value, index } = props
    if (cx == null || cy == null || value == null || index === pular) return <g key={`v${index}`} />
    const c = value < 0 ? COR.erroTexto : cor
    return <circle key={`p${index}`} cx={cx} cy={cy} r={3.5} stroke={c} strokeWidth={2} fill={cheio ? c : '#fff'} />
  }
}
