import { COR } from '../../utils/cores'
import type { LinhaComparativo } from '../../utils/comparativoCompra'

const MESES_ABR = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * Tudo aqui vive DENTRO do card azul, então vale a paleta de fundo escuro do
 * CLAUDE.md — não a do app. Medido sobre `#1e40af`, o extremo mais claro do
 * gradiente: branco 8,72:1, verde 6,21:1, vermelho 6,03:1, amarelo 6,62:1.
 * Os tons padrão (`#16a34a`, `#dc2626`, `#b45309`) reprovariam aqui.
 */
const TEXTO  = '#fff'
const SUAVE  = 'rgba(255,255,255,.85)'
const BOM    = '#86efac'
const RUIM   = '#fecaca'
const ALERTA = '#fde047'
const LINHA  = 'rgba(255,255,255,.16)'

/**
 * A tabela de formas de pagamento.
 *
 * A coluna que responde a pergunta original é **Cabe** — as outras são custo.
 * Uma tabela só de custo mandaria a pessoa para a opção mais barata, que
 * costuma ser justamente a que aperta o mês.
 *
 * A tabela nasceu sobre card branco e migrou para o azul. O corpo dela ficou
 * para trás em `#475569`, que sobre o azul do card dá **1,15:1** — invisível.
 * A troca de fundo não avisa: cor não tem tipo, e o `tsc` não tem como saber
 * que um literal escuro passou a viver sobre azul.
 */
export default function SimComparativo({
  linhas, selecionada, onSelecionar, onEditar, onAdicionar, onRemover,
  semAVista, fimDoPlano, onPlanejarMais, isMobile,
}: {
  linhas: LinhaComparativo[]
  selecionada: string | null
  onSelecionar: (id: string) => void
  onEditar: (id: string, campo: 'parcelas' | 'valorParcela', valor: string) => void
  onAdicionar: () => void
  onRemover: (id: string) => void
  /** Sem linha à vista não há âncora para o juro embutido. */
  semAVista: boolean
  fimDoPlano: { ano: number; mes: number } | null
  onPlanejarMais: () => void
  isMobile: boolean
}) {
  const th: React.CSSProperties = {
    fontSize: 10, fontWeight: 800, color: SUAVE, textTransform: 'uppercase',
    letterSpacing: '.4px', textAlign: 'right', padding: '0 0 6px', whiteSpace: 'nowrap',
  }
  const td: React.CSSProperties = {
    padding: '7px 0', fontSize: 13, color: SUAVE, textAlign: 'right',
    fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
  }
  const inputSt: React.CSSProperties = {
    width: 78, textAlign: 'right', border: `1px solid ${COR.borda}`, borderRadius: 7,
    padding: '5px 7px', fontSize: 13, color: '#0f172a', background: COR.branco,
    outline: 'none', fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums',
  }

  function Veredito({ l }: { l: LinhaComparativo }) {
    if (!l.veredito) {
      // Sem valor é travessão; "fora do plano" só para quem de fato excede.
      return l.tetoDoPlano === undefined
        ? <span style={{ color: SUAVE }}>—</span>
        : <span style={{ color: SUAVE, fontSize: 12 }}>fora do plano</span>
    }
    const { cabe, gravidade } = l.veredito
    if (!cabe) return <span style={{ color: RUIM, fontWeight: 700 }}>não cabe</span>
    if (gravidade === 'atencao' || l.veredito.pior.comCompra <= 0) {
      return <span style={{ color: ALERTA, fontWeight: 700 }}>aperta</span>
    }
    return <span style={{ color: BOM, fontWeight: 700 }}>cabe</span>
  }

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: TEXTO }}>
          Quais opções o vendedor ofereceu?
        </label>
        <button onClick={onAdicionar} style={{
          border: 'none', background: 'none', padding: 0, cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 12, color: TEXTO, fontWeight: 700,
        }}>+ Adicionar opção</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 460 : 0 }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'left' }}>Opção</th>
              <th style={th}>Parcela</th>
              <th style={th}>Total</th>
              <th style={th}>Juro</th>
              <th style={{ ...th, textAlign: 'center' }}>Cabe</th>
              <th style={th}>Pior mês</th>
              <th style={{ ...th, width: 24 }} aria-label="Remover"/>
            </tr>
          </thead>
          <tbody>
            {linhas.map(l => {
              const ativa = selecionada === l.opcao.id
              const fundo = l.recomendada ? 'rgba(255,255,255,.16)' : ativa ? 'rgba(255,255,255,.09)' : 'transparent'
              return (
                <tr key={l.opcao.id}
                  onClick={() => l.veredito && onSelecionar(l.opcao.id)}
                  style={{
                    background: fundo,
                    borderTop: `1px solid ${LINHA}`,
                    cursor: l.veredito ? 'pointer' : 'default',
                    opacity: l.veredito ? 1 : 0.6,
                  }}>
                  <td style={{ ...td, textAlign: 'left', paddingLeft: 8 }}>
                    <input
                      value={l.opcao.parcelas || ''}
                      onChange={e => onEditar(l.opcao.id, 'parcelas', e.target.value)}
                      onClick={e => e.stopPropagation()}
                      inputMode="numeric"
                      aria-label="Quantidade de parcelas"
                      style={{ ...inputSt, width: 46, textAlign: 'center' }}
                    />
                    <span style={{ marginLeft: 6, fontSize: 12, color: SUAVE }}>
                      {l.opcao.parcelas === 1 ? 'à vista' : '×'}
                    </span>
                    {l.recomendada && (
                      <span style={{
                        marginLeft: 8, fontSize: 9.5, fontWeight: 800, color: BOM,
                        border: `1px solid ${BOM}`, borderRadius: 5, padding: '1px 5px',
                        textTransform: 'uppercase', letterSpacing: '.3px',
                      }}>melhor</span>
                    )}
                  </td>
                  <td style={td}>
                    <input
                      value={l.opcao.valorParcela ? l.opcao.valorParcela.toFixed(2).replace('.', ',') : ''}
                      onChange={e => onEditar(l.opcao.id, 'valorParcela', e.target.value)}
                      onClick={e => e.stopPropagation()}
                      inputMode="decimal"
                      aria-label="Valor da parcela"
                      style={inputSt}
                    />
                  </td>
                  <td style={{ ...td, fontWeight: 700, color: TEXTO }}>{fmt(l.total)}</td>
                  <td style={td}>
                    {l.juroEmbutido === null
                      ? <span style={{ color: SUAVE }}>—</span>
                      : l.juroEmbutido <= 0
                        ? <span style={{ color: SUAVE }}>—</span>
                        : <span style={{ color: ALERTA, fontWeight: 700 }}>+{fmt(l.juroEmbutido)}</span>}
                  </td>
                  <td style={{ ...td, textAlign: 'center', fontSize: 12 }}><Veredito l={l}/></td>
                  <td style={td}>
                    {l.veredito
                      ? <>{fmt(l.veredito.pior.comCompra)}
                          <span style={{ color: SUAVE, marginLeft: 5, fontSize: 11 }}>
                            {MESES_ABR[l.veredito.pior.mes]}
                          </span></>
                      : <span style={{ color: SUAVE }}>—</span>}
                  </td>
                  <td style={{ ...td, paddingRight: 6 }}>
                    {linhas.length > 1 && (
                      <button onClick={e => { e.stopPropagation(); onRemover(l.opcao.id) }}
                        aria-label="Remover opção"
                        style={{ border: 'none', background: 'none', cursor: 'pointer',
                          color: SUAVE, fontSize: 13, padding: 2 }}>✕</button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {semAVista && (
        <div style={{ fontSize: 12, color: SUAVE, marginTop: 8, lineHeight: 1.5 }}>
          Coloque o <b style={{ color: TEXTO }}>preço à vista</b> numa linha de 1× para
          ver quanto cada parcelamento custa a mais.
        </div>
      )}

      {linhas.some(l => !l.veredito) && fimDoPlano && (
        <div style={{ fontSize: 12, color: SUAVE, marginTop: 8, lineHeight: 1.5 }}>
          As opções em cinza passam do fim do seu planejamento
          (<b>{MESES_ABR[fimDoPlano.mes]} de {fimDoPlano.ano}</b>).{' '}
          <button onClick={onPlanejarMais} style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 12, color: TEXTO, fontWeight: 700,
            textDecoration: 'underline',
          }}>Planejar mais meses</button> para simular essas também.
        </div>
      )}
    </div>
  )
}


