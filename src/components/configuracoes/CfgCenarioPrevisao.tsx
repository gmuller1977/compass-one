import { COR } from './CfgShared'
import type { CenarioPrevisao } from '../../utils/saldoConta'

/**
 * A escolha do cenário, com o exemplo que a explica.
 *
 * A pergunta é uma só: até onde o valor planejado é um bolo só? Sem exemplo a
 * resposta não significa nada — os três nomes soam como intensidade, e não
 * como uma regra de cálculo.
 *
 * O exemplo MOSTRA A CONTA, e numa TABELA SÓ: as categorias, a soma do cenário
 * escolhido e o saldo dividem as mesmas colunas, então os números caem todos na
 * mesma vertical. Em tabelas separadas cada uma dimensionava suas colunas
 * sozinha e nada alinhava. Dizer "sobra 350" sem a subtração ao lado, ou pôr a
 * subtração sem cabeçalho, também não ensina.
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

/**
 * Cinza secundário, medido.
 *
 * Estava #94a3b8, que dá 2,56:1 sobre branco e 2,46:1 sobre #f8faff — reprova
 * até o limite de 3:1 de elemento gráfico, e aqui é texto. #64748b é o token
 * `textoSuave` e dá 4,76:1 e 4,56:1.
 */
const CINZA = COR.textoSuave
/** Para o rodapé, que é o texto mais longo e o menor: 7,58:1 e 7,26:1. */
const CINZA_FORTE = '#475569'

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

// ── estilos de célula, para as três seções não divergirem ───────────────
const CEL: React.CSSProperties = { padding: '6px 12px', whiteSpace: 'nowrap' }
const CEL_N: React.CSSProperties = { ...CEL, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }
const CAB: React.CSSProperties = {
  ...CEL, fontSize: 9.5, fontWeight: 700, color: CINZA,
  textTransform: 'uppercase', letterSpacing: .4, borderBottom: `1px solid ${COR.borda}`,
}
const FAIXA: React.CSSProperties = {
  padding: '9px 12px', background: '#f8faff', fontSize: 11.5,
  color: COR.textoSuave, lineHeight: 1.5, borderTop: `1px solid ${COR.borda}`,
  whiteSpace: 'normal',
}

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

      {/* ── o exemplo: uma tabela só, das categorias até o saldo ──────── */}
      <div style={{ border: `1px solid ${COR.borda}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '7px 12px', background: '#f8faff', borderBottom: `1px solid ${COR.borda}`,
          fontSize: 10, fontWeight: 700, color: COR.textoSuave, textTransform: 'uppercase', letterSpacing: .6 }}>
          Um mês de exemplo
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            {/* Uma coluna elástica e três justas: os números ficam presos à
                direita e alinham entre as três seções. */}
            <colgroup>
              <col />
              <col style={{ width: '1%' }} />
              <col style={{ width: '1%' }} />
              <col style={{ width: '1%' }} />
            </colgroup>

            {/* 1 ── o mês, categoria por categoria ─────────────────────── */}
            <thead>
              <tr>
                <th style={{ ...CAB, textAlign: 'left' }}>Categoria</th>
                <th style={{ ...CAB, textAlign: 'left' }}>Grupo</th>
                <th style={{ ...CAB, textAlign: 'right' }}>Planejado − gasto</th>
                <th style={{ ...CAB, textAlign: 'right' }}>Sobra</th>
              </tr>
            </thead>
            <tbody>
              {EXEMPLO.map(l => {
                const d = l.plano - l.gasto
                return (
                  <tr key={l.cat}>
                    <td style={{ ...CEL, color: COR.texto }}>{l.cat}</td>
                    <td style={{ ...CEL, color: CINZA }}>{l.grupo}</td>
                    <td style={{ ...CEL_N, color: COR.textoSuave }}>{num(l.plano)} − {num(l.gasto)} =</td>
                    <td style={{ ...CEL_N, fontWeight: 700, color: d >= 0 ? '#15803d' : '#b91c1c' }}>
                      {sinal(d)}
                    </td>
                  </tr>
                )
              })}
            </tbody>

            {/* 2 ── a soma do cenário escolhido ────────────────────────── */}
            <tbody>
              <tr>
                <td colSpan={4} style={FAIXA}>
                  O <strong style={{ color: '#1e40af' }}>{escolhido.nome.toLowerCase()}</strong> {escolhido.comoSoma}
                </td>
              </tr>
              <tr>
                <th colSpan={2} style={{ ...CAB, textAlign: 'left', borderTop: `1px solid ${COR.borda}` }}>
                  {escolhido.unidade}
                </th>
                <th style={{ ...CAB, textAlign: 'right', borderTop: `1px solid ${COR.borda}` }}>
                  Planejado − gasto
                </th>
                <th style={{ ...CAB, textAlign: 'right', borderTop: `1px solid ${COR.borda}` }}>
                  Sobra
                </th>
              </tr>
              {parcelas.map(p => (
                <tr key={p.rotulo}>
                  <td colSpan={2} style={{ ...CEL, color: COR.texto }}>{p.rotulo}</td>
                  <td style={{ ...CEL_N, color: COR.textoSuave }}>{p.conta} =</td>
                  <td style={{ ...CEL_N, fontWeight: 700, color: p.valor > 0 ? '#15803d' : CINZA }}>
                    {p.valor > 0 ? `+${num(p.valor)}` : '0'}
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={3} style={{ ...CEL, fontWeight: 700, color: COR.texto,
                  borderTop: `1px solid ${COR.borda}` }}>
                  Ainda vai gastar
                </td>
                <td style={{ ...CEL_N, fontWeight: 700, color: COR.texto,
                  borderTop: `1px solid ${COR.borda}` }}>
                  {num(reserva)}
                </td>
              </tr>
            </tbody>

            {/* 3 ── e o saldo ──────────────────────────────────────────── */}
            <tbody>
              <tr>
                <td colSpan={3} style={{ ...CEL, color: COR.textoSuave,
                  borderTop: `1px solid ${COR.borda}`, paddingTop: 10 }}>
                  Saldo na conta hoje
                </td>
                <td style={{ ...CEL_N, color: COR.texto,
                  borderTop: `1px solid ${COR.borda}`, paddingTop: 10 }}>
                  {num(SALDO_HOJE)}
                </td>
              </tr>
              <tr>
                <td colSpan={3} style={{ ...CEL, color: COR.textoSuave }}>Menos o que ainda vai gastar</td>
                <td style={{ ...CEL_N, color: '#b91c1c' }}>− {num(reserva)}</td>
              </tr>
              <tr>
                <td colSpan={3} style={{ ...CEL, fontSize: 12.5, fontWeight: 700, color: COR.texto,
                  borderTop: `2px solid ${COR.borda}`, paddingTop: 9, paddingBottom: 10 }}>
                  Saldo final previsto
                </td>
                <td style={{ ...CEL_N, fontSize: 15, fontWeight: 800, color: '#1e40af',
                  borderTop: `2px solid ${COR.borda}`, paddingTop: 9, paddingBottom: 10 }}>
                  {num(SALDO_HOJE - reserva)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* os outros dois, para comparar sem precisar trocar */}
        <div style={{ borderTop: `1px solid ${COR.borda}`, background: '#f8faff', padding: '10px 12px',
          fontSize: 11.5, color: CINZA }}>
          <div style={{ marginBottom: 5 }}>Nos outros cenários esse saldo seria:</div>
          {CENARIOS.filter(c => c.id !== cenarioPrevisao).map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '2px 0' }}>
              <span style={{ flex: 1, minWidth: 0 }}>{c.nome}</span>
              <span style={{ fontWeight: 700, color: COR.texto, fontVariantNumeric: 'tabular-nums' }}>
                {brl(SALDO_HOJE - reservaDe(c.id))}
              </span>
            </div>
          ))}
        </div>

        <div style={{ padding: '10px 12px', borderTop: `1px solid ${COR.borda}`,
          fontSize: 11.5, color: CINZA_FORTE, lineHeight: 1.55 }}>
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
