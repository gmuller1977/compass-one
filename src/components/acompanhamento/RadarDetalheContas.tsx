import { COR } from '../../utils/cores'
import { fmt } from './AcShared'
import { ehZero } from '../../utils/moeda'
import type { LinhaMes } from '../../utils/saldoConta'

/**
 * Como o saldo do mês se formou, conta por conta.
 *
 * Duas colunas aparecem só quando têm o que dizer.
 *
 * Conciliação é o saldo informado no extrato menos o que a movimentação
 * explicaria — sem ela a linha não fecharia, e o usuário ficaria procurando o
 * erro numa conta que está certa.
 *
 * "Abre <mês seguinte>" só existe no mês corrente, onde o saldo final é o
 * realizado (o que o banco mostra hoje) e a abertura já desconta o que ainda
 * falta acontecer até o dia 31. Sem as duas lado a lado, setembro fecha com
 * 621,04, outubro abre com 1,04 e parece erro. Não é: são perguntas
 * diferentes.
 */
export default function RadarDetalheContas(
  { linhas, proximoMes }: { linhas: LinhaMes[]; proximoMes: string },
) {
  const temAjuste = linhas.some(l => !ehZero(l.ajuste))
  // No mes corrente o saldo final e o realizado e a abertura ja desconta o que
  // falta acontecer. Nos outros meses os dois sao o mesmo numero e a coluna
  // seria ruido.
  const temAbertura = linhas.some(l => !ehZero(l.aberturaSeguinte - l.final))
  const total = linhas.reduce((t, l) => ({
    inicial:  t.inicial + l.inicial,
    entradas: t.entradas + l.entradas,
    saidas:   t.saidas + l.saidas,
    ajuste:   t.ajuste + l.ajuste,
    final:    t.final + l.final,
    abertura: t.abertura + l.aberturaSeguinte,
  }), { inicial: 0, entradas: 0, saidas: 0, ajuste: 0, final: 0, abertura: 0 })

  const previsto = linhas.some(l => l.previsto)
  const nCols = 4 + (temAjuste ? 1 : 0) + (temAbertura ? 1 : 0)
  const colunas = `minmax(130px,1.6fr) repeat(${nCols}, minmax(88px,1fr))`

  const celula: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, textAlign: 'right',
    fontVariantNumeric: 'tabular-nums', color: COR.texto,
  }
  const cabecalho: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, textAlign: 'right', color: COR.textoSuave,
    textTransform: 'uppercase', letterSpacing: '.3px',
  }

  return (
    <div style={{
      background: COR.branco, border: `1px solid ${COR.borda}`, borderRadius: 10,
      padding: '12px 14px', maxHeight: 260, overflowY: 'auto',
    }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: COR.texto,
          textTransform: 'uppercase', letterSpacing: '.4px' }}>
          Como o saldo se formou
        </span>
        <span style={{ fontSize: 11, color: COR.textoSuave }}>
          {previsto ? 'valores previstos' : 'valores realizados'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: colunas, gap: '6px 10px',
        alignItems: 'center' }}>
        <div style={{ ...cabecalho, textAlign: 'left' }}>Conta</div>
        <div style={cabecalho}>Saldo inicial</div>
        <div style={cabecalho}>Entradas</div>
        <div style={cabecalho}>Saídas</div>
        {temAjuste && <div style={cabecalho}>Conciliação</div>}
        <div style={cabecalho}>Saldo final</div>
        {temAbertura && <div style={cabecalho}>Abre {proximoMes}</div>}

        {linhas.map(l => (
          <Linha key={l.id} l={l} temAjuste={temAjuste} temAbertura={temAbertura} celula={celula} />
        ))}

        <div style={{ gridColumn: `1 / -1`, height: 1, background: COR.borda }} />

        <div style={{ fontSize: 12, fontWeight: 800, color: COR.texto }}>Total</div>
        <div style={{ ...celula, fontWeight: 800 }}>{fmt(total.inicial)}</div>
        <div style={{ ...celula, fontWeight: 800, color: COR.sucessoTexto }}>{fmt(total.entradas)}</div>
        <div style={{ ...celula, fontWeight: 800, color: COR.erroTexto }}>{fmt(total.saidas)}</div>
        {temAjuste && <div style={{ ...celula, fontWeight: 800 }}>{fmt(total.ajuste)}</div>}
        <div style={{ ...celula, fontWeight: 800 }}>{fmt(total.final)}</div>
        {temAbertura && <div style={{ ...celula, fontWeight: 800 }}>{fmt(total.abertura)}</div>}
      </div>

      <div style={{ fontSize: 10, color: COR.textoSuave, marginTop: 10, lineHeight: 1.5 }}>
        Entradas e saídas aqui são a movimentação de cada conta. Os cartões de
        Receitas e Despesas acima somam por categoria, e por isso respondem outra
        pergunta — os dois números não têm por que coincidir.
        {temAbertura && (
          <><br />
          O saldo final é o que o banco mostra hoje. <b>Abre {proximoMes}</b> é
          esse saldo menos o que ainda falta acontecer até o fim do mês — é ele
          que vira o saldo inicial de {proximoMes}.</>
        )}
      </div>
    </div>
  )
}

function Linha({ l, temAjuste, temAbertura, celula }: {
  l: LinhaMes; temAjuste: boolean; temAbertura: boolean; celula: React.CSSProperties
}) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <span style={{ fontSize: 14 }}>{l.icone}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: COR.texto,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {l.nome}
        </span>
      </div>
      <div style={celula}>{fmt(l.inicial)}</div>
      <div style={{ ...celula, color: ehZero(l.entradas) ? COR.textoSuave : COR.sucessoTexto }}>
        {fmt(l.entradas)}
      </div>
      <div style={{ ...celula, color: ehZero(l.saidas) ? COR.textoSuave : COR.erroTexto }}>
        {fmt(l.saidas)}
      </div>
      {temAjuste && (
        <div style={{ ...celula, color: ehZero(l.ajuste) ? COR.textoSuave : COR.avisoTexto }}>
          {ehZero(l.ajuste) ? '—' : fmt(l.ajuste)}
        </div>
      )}
      <div style={{ ...celula, color: l.final < 0 ? COR.erroTexto : COR.texto }}>
        {fmt(l.final)}
      </div>
      {temAbertura && (
        <div style={{ ...celula, color: l.aberturaSeguinte < 0 ? COR.erroTexto : COR.textoSuave }}>
          {fmt(l.aberturaSeguinte)}
        </div>
      )}
    </>
  )
}
