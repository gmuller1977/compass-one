import { COR } from './CfgShared'
import type { CenarioPrevisao } from '../../utils/saldoConta'

/**
 * A escolha do cenário, com o exemplo que a explica.
 *
 * A pergunta é uma só: até onde o valor planejado é um bolo só? Sem exemplo a
 * resposta não significa nada — os três nomes soam como intensidade, e não
 * como uma regra de cálculo.
 *
 * O exemplo MOSTRA A CONTA. O estouro e a sobra saem de `plano − gasto` à
 * vista, e a reserva do cenário escolhido é somada parcela por parcela até
 * chegar no saldo. Dizer "sobra 350" sem a subtração não ensina ninguém.
 *
 * A agregação aqui espelha `nivelDoCenario` do saldoConta. É um segundo
 * caminho, e é exatamente o tipo de coisa que costuma divergir neste app — por
 * isso existe uma prova comparando os três números (750 / 450 / 270) contra o
 * `faltaVariavelDoMes` de verdade, com estas mesmas quatro categorias.
 */

const EXEMPLO = [
  { cat: 'Mercado',     grupo: 'Alimentação', plano: 1500, gasto: 1800 },
  { cat: 'Restaurante', grupo: 'Alimentação', plano:  600, gasto:  250 },
  { cat: 'Vestuário',   grupo: 'Vestuário',   plano:  250, gasto:  430 },
  { cat: 'Lazer',       grupo: 'Lazer',       plano:  400, gasto:    0 },
]

const SALDO_HOJE = 2520

const CENARIOS: {
  id: CenarioPrevisao; nome: string; resumo: string; comoSoma: string
  /** O que cada linha da soma representa — vira o cabeçalho da coluna. */
  unidade: string
}[] = [
  { id: 'pessimista', nome: 'Pessimista', unidade: 'Categoria',
    resumo: 'Cada categoria vai usar todo o valor planejado. Quem estourou não devolve, e quem ainda não gastou vai gastar.',
    comoSoma: 'soma a sobra de cada categoria, uma por uma. Quem estourou entra como zero — o estouro não vira crédito para as outras.' },
  { id: 'moderado', nome: 'Moderado', unidade: 'Grupo',
    resumo: 'Cada grupo vai usar todo o valor planejado. O que estourou no mercado sai do que sobrou no restaurante — mas não sai da farmácia.',
    comoSoma: 'junta as categorias de cada grupo primeiro, e só então soma o que sobrou de cada grupo.' },
  { id: 'otimista', nome: 'Otimista', unidade: 'Mês',
    resumo: 'O mês inteiro vai usar todo o valor planejado. Qualquer categoria cobre qualquer outra, como sua planilha faz na soma.',
    comoSoma: 'junta o mês inteiro numa conta só: todo o planejado menos todo o gasto.' },
]

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const num = (v: number) => v.toLocaleString('pt-BR')
const sinal = (v: number) => `${v >= 0 ? '+' : '−'}${num(Math.abs(v))}`

/** As parcelas que o cenário soma, cada uma com a conta que a produziu. */
function parcelasDo(cenario: CenarioPrevisao): { rotulo: string; conta: string; valor: number }[] {
  if (cenario === 'otimista') {
    const p = EXEMPLO.reduce((s, l) => s + l.plano, 0)
    const g = EXEMPLO.reduce((s, l) => s + l.gasto, 0)
    return [{ rotulo: 'Mês inteiro', conta: `${num(p)} − ${num(g)}`, valor: Math.max(0, p - g) }]
  }
  if (cenario === 'moderado') {
    const grupos = new Map<string, { p: number; g: number }>()
    for (const l of EXEMPLO) {
      const a = grupos.get(l.grupo) ?? { p: 0, g: 0 }
      grupos.set(l.grupo, { p: a.p + l.plano, g: a.g + l.gasto })
    }
    return [...grupos].map(([nome, { p, g }]) => ({
      rotulo: nome, conta: `${num(p)} − ${num(g)}`, valor: Math.max(0, p - g),
    }))
  }
  return EXEMPLO.map(l => ({
    rotulo: l.cat, conta: `${num(l.plano)} − ${num(l.gasto)}`, valor: Math.max(0, l.plano - l.gasto),
  }))
}

const reservaDe = (c: CenarioPrevisao) => parcelasDo(c).reduce((s, p) => s + p.valor, 0)

export default function CfgCenarioPrevisao({
  cenarioPrevisao, setCenarioPrevisao,
}: {
  cenarioPrevisao: CenarioPrevisao
  setCenarioPrevisao: (v: CenarioPrevisao) => void
}) {
  const escolhido = CENARIOS.find(c => c.id === cenarioPrevisao) ?? CENARIOS[0]
  const parcelas = parcelasDo(cenarioPrevisao)
  const reserva = reservaDe(cenarioPrevisao)

  return (
    <div style={{ background: COR.branco, border: `1px solid ${COR.borda}`, borderRadius: 14, padding: 24 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: COR.texto, margin: '0 0 4px' }}>
        Cenário das previsões
      </h3>
      <p style={{ fontSize: 12, color: COR.textoSuave, margin: '0 0 16px', lineHeight: 1.5 }}>
        O saldo previsto reserva o que você ainda vai gastar do plano. A pergunta é
        <strong> até onde o valor planejado é um bolo só</strong>: se você estourou o mercado,
        isso tira do restaurante, de qualquer outra categoria, ou de nenhuma?
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

        {/* a conta de cada categoria, à vista */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {[
                  { t: 'Categoria', a: 'left' as const },
                  { t: 'Grupo', a: 'left' as const },
                  { t: 'Planejado − gasto', a: 'right' as const },
                  { t: '', a: 'right' as const },
                ].map(h => (
                  <th key={h.t} style={{ padding: '6px 10px', textAlign: h.a,
                    fontSize: 9.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase',
                    letterSpacing: .4, borderBottom: `1px solid ${COR.borda}`, whiteSpace: 'nowrap' }}>{h.t}</th>
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
                    <td style={{ padding: '6px 10px', textAlign: 'right', whiteSpace: 'nowrap',
                      fontVariantNumeric: 'tabular-nums', color: COR.textoSuave }}>
                      {num(l.plano)} − {num(l.gasto)} =
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', whiteSpace: 'nowrap',
                      fontVariantNumeric: 'tabular-nums', fontWeight: 700,
                      color: d >= 0 ? '#15803d' : '#b91c1c' }}>
                      {sinal(d)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* a soma do cenário escolhido, parcela por parcela */}
        <div style={{ borderTop: `1px solid ${COR.borda}`, background: '#f8faff', padding: '11px 13px' }}>
          <div style={{ fontSize: 11.5, color: COR.textoSuave, lineHeight: 1.5, marginBottom: 9 }}>
            O <strong style={{ color: '#1e40af' }}>{escolhido.nome.toLowerCase()}</strong> {escolhido.comoSoma}
          </div>

          {/* As mesmas três colunas do quadro de cima, e com cabeçalho: sem
              ele o "2.100 − 2.050" virava adivinhação. */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {[
                    { t: escolhido.unidade, a: 'left' as const },
                    { t: 'Planejado − gasto', a: 'right' as const },
                    { t: 'Sobra', a: 'right' as const },
                  ].map(h => (
                    <th key={h.t} style={{ padding: '0 0 5px', textAlign: h.a,
                      fontSize: 9.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase',
                      letterSpacing: .4, borderBottom: `1px solid ${COR.borda}`, whiteSpace: 'nowrap' }}>
                      {h.t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parcelas.map(p => (
                  <tr key={p.rotulo}>
                    <td style={{ padding: '5px 10px 5px 0', color: COR.texto,
                      maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.rotulo}
                    </td>
                    <td style={{ padding: '5px 10px', textAlign: 'right', whiteSpace: 'nowrap',
                      color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                      {p.conta} =
                    </td>
                    <td style={{ padding: '5px 0 5px 10px', textAlign: 'right', whiteSpace: 'nowrap',
                      fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                      color: p.valor > 0 ? '#15803d' : '#94a3b8' }}>
                      {p.valor > 0 ? `+${num(p.valor)}` : '0'}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={2} style={{ padding: '7px 10px 0 0', fontWeight: 700, color: COR.texto,
                    borderTop: `1px solid ${COR.borda}` }}>
                    Ainda vai gastar
                  </td>
                  <td style={{ padding: '7px 0 0 10px', textAlign: 'right', fontWeight: 700,
                    color: COR.texto, fontVariantNumeric: 'tabular-nums',
                    borderTop: `1px solid ${COR.borda}` }}>
                    {num(reserva)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* e o saldo */}
        <div style={{ borderTop: `1px solid ${COR.borda}`, padding: '11px 13px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12, marginBottom: 3 }}>
            <span style={{ flex: 1, color: COR.textoSuave }}>Saldo na conta hoje</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', color: COR.texto }}>{brl(SALDO_HOJE)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12 }}>
            <span style={{ flex: 1, color: COR.textoSuave }}>Menos o que ainda vai gastar</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', color: '#b91c1c' }}>− {brl(reserva)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 7, paddingTop: 8,
            borderTop: `2px solid ${COR.borda}` }}>
            <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: COR.texto }}>
              Saldo final previsto
            </span>
            <span style={{ fontSize: 16, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: '#1e40af' }}>
              {brl(SALDO_HOJE - reserva)}
            </span>
          </div>
        </div>

        {/* os outros dois, para comparar sem precisar trocar */}
        <div style={{ borderTop: `1px solid ${COR.borda}`, background: '#f8faff', padding: '9px 13px',
          fontSize: 11, color: '#94a3b8', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <span>Nos outros cenários esse saldo seria:</span>
          {CENARIOS.filter(c => c.id !== cenarioPrevisao).map(c => (
            <span key={c.id}>
              {c.nome}{' '}
              <strong style={{ color: COR.textoSuave, fontVariantNumeric: 'tabular-nums' }}>
                {brl(SALDO_HOJE - reservaDe(c.id))}
              </strong>
            </span>
          ))}
        </div>

        <div style={{ padding: '10px 13px', borderTop: `1px solid ${COR.borda}`,
          fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
          O Vestuário estourou 180 e não há sobra no grupo dele para cobrir — só o otimista
          deixa o Lazer pagar essa conta. A diferença entre o pessimista e o otimista é sempre
          igual ao total estourado no mês.
          <br /><br />
          Na <strong>receita</strong> a regra se inverte, para o nome não mentir: o pessimista
          conta com receber menos, o otimista com receber tudo que foi planejado.
        </div>
      </div>
    </div>
  )
}
