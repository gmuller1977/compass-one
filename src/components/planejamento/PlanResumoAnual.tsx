import { ROTULO_TOPO } from '../mobile/estilo'
import { RADAR_COR_AZUL } from '../acompanhamento/radarCores'
import { fmt, MESES, type Saldos } from './types'
import { mesesDoAno, resumoDoAno } from './anoDoPlano'

interface Props {
  previsto: Saldos
  anoAtual: number
  mesAtual: number
  /** Fechamento real e abertura real de cada mês (bancos e dinheiro). */
  fechamentoReal?: number[]
  inicioReal?: number[]
  objetivos: number[]
  /** Celular: número menor e as caixas embaixo dele. */
  compacto?: boolean
}

/**
 * O topo do Planejamento como bússola (pedido do Guilherme em 13/10/2026:
 * "se o Compass One é uma bússola e o plano é o caminho para alcançar suas
 * metas, o que vale mostrar?"). Três respostas, no azul do PageHeader:
 *
 * 1. Para onde vou — o saldo previsto em 31/12, em letra grande.
 * 2. Estou no rumo da meta — a meta de economia do ano (soma das metas dos
 *    meses) contra o rumo: o que os meses fechados guardaram de verdade mais
 *    o que o plano guarda nos que faltam (`resumoDoAno().rumo`).
 * 3. Quanto já percorri — o que os meses fechados guardaram de verdade.
 *
 * Os totais de receitas e despesas do ano saíram do topo (a janela "out–dez"
 * de antes). Texto da meta sem "resultado", "receitas" nem "despesas".
 */
export default function PlanResumoAnual({ previsto, anoAtual, mesAtual, fechamentoReal, inicioReal, objetivos, compacto }: Props) {
  const meses = mesesDoAno({ previsto, anoAtual, mesAtual, fechamentoReal, inicioReal, objetivos })
  const r = resumoDoAno(meses, previsto)
  const passado = anoAtual < new Date().getFullYear()
  const cor = (v: number) => (v >= 0 ? RADAR_COR_AZUL.bom : '#fecaca')

  const falta = r.metaAno - r.rumo
  const deve = passado ? 'Você guardou' : 'Até dezembro você deve guardar'
  const caixaMeta = r.metaAno > 0
    ? {
        rot: `Meta de economia ${anoAtual}`,
        v: fmt(r.metaAno, true), cor: '#fff',
        sub: r.rumo < 0
          ? `${passado ? 'Você gastou' : 'Até dezembro você deve gastar'} ${fmt(-r.rumo, true)} a mais do que ganha`
          : falta > 0.005
            ? `${deve} ${fmt(r.rumo, true)} · faltam ${fmt(falta, true)}`
            : `✓ ${deve} ${fmt(r.rumo, true)}`,
      }
    : {
        rot: `Meta de economia ${anoAtual}`, v: 'Sem meta', cor: '#fff',
        sub: 'Defina quanto guardar em cada mês',
      }
  const ate = passado || r.ultimoFechado === 11 ? `em ${anoAtual}` : `· jan–${MESES[r.ultimoFechado]?.toLowerCase()}`
  const caixaJa = r.jaGuardou !== null
    ? r.jaGuardou >= 0
      ? { rot: `${passado ? 'Guardou' : 'Já guardou'} ${ate}`, v: fmt(r.jaGuardou, true), cor: RADAR_COR_AZUL.bom,
          sub: 'de verdade, nos meses fechados' }
      : { rot: `Gastou a mais do que ganhou ${ate}`, v: fmt(-r.jaGuardou, true), cor: '#fecaca',
          sub: 'de verdade, nos meses fechados' }
    : null
  const caixas = caixaJa ? [caixaMeta, caixaJa] : [caixaMeta]

  return (
    <div style={{ marginTop: 18, display: 'flex', gap: compacto ? 14 : 24, alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div style={{ flex: compacto ? '1 1 100%' : '1 1 260px', minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: ROTULO_TOPO }}>
          {passado ? `O plano de ${anoAtual} previa terminar com` : `Se o plano se cumprir, ${anoAtual} termina com`}
        </div>
        <div style={{ fontSize: compacto ? 34 : 40, fontWeight: 800, letterSpacing: '-.8px', lineHeight: 1.15,
          color: cor(r.saldoFinal), fontVariantNumeric: 'tabular-nums' }}>{fmt(r.saldoFinal, true)}</div>
        <div style={{ fontSize: 14, color: ROTULO_TOPO, marginTop: 2 }}>na conta em 31 de dezembro</div>
      </div>
      <div style={{ flex: compacto ? '1 1 100%' : '1 1 520px', display: 'grid',
        gridTemplateColumns: `repeat(${caixas.length}, minmax(0,1fr))`, gap: 8 }}>
        {caixas.map(k => (
          <div key={k.rot} style={{ background: 'rgba(15,23,42,.22)', border: '1px solid rgba(255,255,255,.15)',
            borderRadius: 14, padding: '10px 14px', minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: ROTULO_TOPO }}>{k.rot}</div>
            <div style={{ fontSize: compacto ? 18 : 20, fontWeight: 800, color: k.cor, fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap' }}>{k.v}</div>
            <div style={{ fontSize: 13, color: ROTULO_TOPO, fontVariantNumeric: 'tabular-nums' }}>{k.sub}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
