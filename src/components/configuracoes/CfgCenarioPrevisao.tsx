import { COR } from './CfgShared'
import type { CenarioPrevisao } from '../../utils/saldoConta'

/**
 * A escolha do cenário, com o exemplo que a explica.
 *
 * A pergunta é uma só: quando uma categoria estoura o planejado, o app assume
 * que você compensa em outra? Sem exemplo a resposta não significa nada — os
 * três nomes soam como intensidade, e não como uma regra de cálculo.
 *
 * Os números do exemplo não são inventados: saem da mesma função que calcula o
 * saldo, com as quatro categorias abaixo. Se a regra mudar, o exemplo mente —
 * por isso ele vive junto da escolha, e não numa página de ajuda.
 */

export const CENARIOS: { id: CenarioPrevisao; nome: string; resumo: string; reserva: number }[] = [
  { id: 'pessimista', nome: 'Pessimista',
    resumo: 'Assume que você gasta todo o resto do planejado, mesmo tendo estourado em outra categoria.',
    reserva: 750 },
  { id: 'moderado', nome: 'Moderado',
    resumo: 'Assume que você compensa dentro do grupo — estourou no mercado, come menos fora.',
    reserva: 450 },
  { id: 'otimista', nome: 'Otimista',
    resumo: 'Assume que você compensa em qualquer categoria, como uma planilha faz na soma.',
    reserva: 270 },
]

const EXEMPLO = [
  { cat: 'Mercado',     grupo: 'Alimentação', plano: 1500, gasto: 1800 },
  { cat: 'Restaurante', grupo: 'Alimentação', plano:  600, gasto:  250 },
  { cat: 'Vestuário',   grupo: 'Vestuário',   plano:  250, gasto:  430 },
  { cat: 'Lazer',       grupo: 'Lazer',       plano:  400, gasto:    0 },
]

const SALDO_HOJE = 2520

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function CfgCenarioPrevisao({
  cenarioPrevisao, setCenarioPrevisao,
}: {
  cenarioPrevisao: CenarioPrevisao
  setCenarioPrevisao: (v: CenarioPrevisao) => void
}) {
  return (
    <div style={{ background: COR.branco, border: `1px solid ${COR.borda}`, borderRadius: 14, padding: 24 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: COR.texto, margin: '0 0 4px' }}>
        Cenário das previsões
      </h3>
      <p style={{ fontSize: 12, color: COR.textoSuave, margin: '0 0 16px', lineHeight: 1.5 }}>
        Quando uma categoria estoura o planejado, o app assume que você compensa em outra?
        A resposta muda o <strong>saldo final previsto</strong> em Lançamentos, no Radar e no Simulador.
      </p>

      {/* ── as três opções ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
        {CENARIOS.map(c => {
          const ativo = cenarioPrevisao === c.id
          return (
            <button key={c.id} onClick={() => setCenarioPrevisao(c.id)}
              aria-pressed={ativo}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left',
                padding: '11px 13px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                border: `1.5px solid ${ativo ? '#2563eb' : COR.borda}`,
                background: ativo ? '#eff6ff' : COR.branco,
              }}>
              <span aria-hidden style={{
                width: 15, height: 15, borderRadius: '50%', marginTop: 2, flexShrink: 0,
                border: `4px solid ${ativo ? '#2563eb' : COR.borda}`,
                background: COR.branco, boxSizing: 'border-box',
              }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 2,
                  color: ativo ? '#1e40af' : COR.texto }}>
                  {c.nome}
                </span>
                <span style={{ display: 'block', fontSize: 11.5, color: COR.textoSuave, lineHeight: 1.45 }}>
                  {c.resumo}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {/* ── o exemplo ─────────────────────────────────────────────────── */}
      <div style={{ border: `1px solid ${COR.borda}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '7px 13px', background: '#f8faff', borderBottom: `1px solid ${COR.borda}`,
          fontSize: 10, fontWeight: 700, color: COR.textoSuave, textTransform: 'uppercase', letterSpacing: .6 }}>
          Um mês de exemplo
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Categoria', 'Grupo', 'Planejado', 'Gasto', ''].map((h, i) => (
                  <th key={h + i} style={{ padding: '6px 10px', textAlign: i >= 2 && i <= 3 ? 'right' : 'left',
                    fontSize: 9.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase',
                    letterSpacing: .4, borderBottom: `1px solid ${COR.borda}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EXEMPLO.map(l => {
                const d = l.plano - l.gasto
                return (
                  <tr key={l.cat}>
                    <td style={{ padding: '6px 10px', color: COR.texto, whiteSpace: 'nowrap' }}>{l.cat}</td>
                    <td style={{ padding: '6px 10px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{l.grupo}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: COR.textoSuave }}>{l.plano}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: COR.textoSuave }}>{l.gasto}</td>
                    <td style={{ padding: '6px 10px', fontSize: 11, whiteSpace: 'nowrap',
                      color: d >= 0 ? '#15803d' : '#b91c1c', fontWeight: d >= 0 ? 400 : 600 }}>
                      {d >= 0 ? `sobra ${d}` : `estourou ${-d}`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '10px 13px', borderTop: `1px solid ${COR.borda}`, background: '#f8faff',
          fontSize: 11.5, color: COR.textoSuave, lineHeight: 1.5 }}>
          Com <strong style={{ color: COR.texto }}>{brl(SALDO_HOJE)}</strong> na conta hoje, o saldo
          final do mês fica assim em cada cenário:
        </div>

        <div>
          {CENARIOS.map((c, i) => {
            const ativo = cenarioPrevisao === c.id
            return (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'baseline', gap: 10, padding: '9px 13px',
                borderTop: i === 0 ? `1px solid ${COR.borda}` : '1px solid #f1f5f9',
                background: ativo ? '#eff6ff' : COR.branco,
              }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: ativo ? 700 : 500,
                  color: ativo ? '#1e40af' : COR.texto }}>
                  {c.nome}{ativo && <span style={{ fontSize: 10, fontWeight: 600, marginLeft: 6, color: '#2563eb' }}>em uso</span>}
                </span>
                <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                  reserva {brl(c.reserva)}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, minWidth: 92, textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums', color: ativo ? '#1e40af' : COR.texto }}>
                  {brl(SALDO_HOJE - c.reserva)}
                </span>
              </div>
            )
          })}
        </div>

        <div style={{ padding: '10px 13px', borderTop: `1px solid ${COR.borda}`,
          fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
          O Vestuário estourou 180 e não há sobra no grupo dele para cobrir — só o cenário
          otimista deixa o Lazer pagar essa conta. A diferença entre o pessimista e o otimista
          é sempre igual ao total estourado no mês.
        </div>
      </div>
    </div>
  )
}
