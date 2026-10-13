import { ROTULO_TOPO } from '../mobile/estilo'
import { RADAR_COR_AZUL } from '../acompanhamento/radarCores'
import { fmt, MESES, MESES_FULL, janelaQueFecha, type Saldos } from './types'

interface Props {
  previsto: Saldos
  anoAtual: number
  /** Celular: número menor e as quatro miniaturas em 2 × 2. */
  compacto?: boolean
}

/**
 * A resposta do ano, dentro do azul do PageHeader — o mesmo topo do Radar
 * (pedido do Guilherme em 12/10/2026, "o mesmo modelo do radar"). Em letra
 * grande, com quanto dezembro termina se o plano se cumprir; ao lado, a faixa
 * anual de antes em quatro miniaturas.
 *
 * A faixa fecha: saldo inicial + receitas − despesas = saldo final. Ela cobre
 * a JANELA que se sustenta, e nao o ano inteiro — ver `janelaQueFecha`.
 * Somando de janeiro por cima de meses ancorados, os quatro numeros nao
 * batiam. Com ancora, os rotulos dizem de onde ela parte. A sobra da frase de
 * apoio é receitas − despesas DESSA janela, os dois números ao lado.
 */
export default function PlanResumoAnual({ previsto, anoAtual, compacto }: Props) {
  const j = janelaQueFecha(previsto)
  const doAno = j.inicio === 0
  const desde = doAno ? `${anoAtual}` : MESES[j.inicio].toLowerCase()
  // Janela de um mes so (ano todo fechado) nao vira "Dez–Dez".
  const periodo = doAno ? '' : j.inicio === 11 ? ' dez' : ` ${MESES[j.inicio].toLowerCase()}–dez`
  const deQuando = doAno ? 'no ano' : j.inicio === 11 ? 'em dezembro'
    : `de ${MESES_FULL[j.inicio].toLowerCase()} a dezembro`
  const sobra = j.receitas - j.despesas
  const passado = anoAtual < new Date().getFullYear()
  const cor = (v: number) => (v >= 0 ? RADAR_COR_AZUL.bom : '#fecaca')

  const minis = [
    { rot: `Saldo inicial ${desde}`, v: j.saldoInicial, cor: '#fff' },
    { rot: `↑ Receitas${periodo}`, v: j.receitas, cor: RADAR_COR_AZUL.bom },
    { rot: `↓ Despesas${periodo}`, v: j.despesas, cor: RADAR_COR_AZUL.ruim },
    { rot: `Saldo final dez/${anoAtual}`, v: j.saldoFinal, cor: cor(j.saldoFinal) },
  ]

  return (
    <div style={{ marginTop: 18, display: 'flex', gap: compacto ? 14 : 24, alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div style={{ flex: compacto ? '1 1 100%' : '1 1 320px', minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: ROTULO_TOPO }}>
          {passado ? `O plano de ${anoAtual} previa terminar com` : `Se o plano se cumprir, ${anoAtual} termina com`}
        </div>
        <div style={{ fontSize: compacto ? 34 : 40, fontWeight: 800, letterSpacing: '-.8px', lineHeight: 1.15,
          color: cor(j.saldoFinal), fontVariantNumeric: 'tabular-nums' }}>{fmt(j.saldoFinal, true)}</div>
        <div style={{ fontSize: 14, color: ROTULO_TOPO, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
          {sobra >= 0
            ? `O plano deixa ${fmt(sobra, true)} de sobra ${deQuando}`
            : `O plano gasta ${fmt(-sobra, true)} a mais do que recebe ${deQuando}`}
        </div>
      </div>
      <div style={{ flex: compacto ? '1 1 100%' : '1 1 460px', display: 'grid',
        gridTemplateColumns: `repeat(${compacto ? 2 : 4}, minmax(0,1fr))`, gap: 8 }}>
        {minis.map(k => (
          <div key={k.rot} style={{ background: 'rgba(15,23,42,.22)', border: '1px solid rgba(255,255,255,.15)',
            borderRadius: 14, padding: '10px 12px', minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: ROTULO_TOPO, whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.rot}</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: k.cor, fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fmt(k.v, true)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
